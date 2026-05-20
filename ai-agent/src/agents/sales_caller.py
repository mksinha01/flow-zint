from __future__ import annotations

import asyncio
import logging
import json
import os
import httpx
from typing import Any

from livekit import rtc, api
from livekit.agents import (
    AgentSession,
    Agent,
    JobContext,
    function_tool,
    RunContext,
    get_job_context,
    cli,
    WorkerOptions,
    RoomInputOptions,
)
from livekit.plugins import openai, silero

from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")

logger = logging.getLogger("flowzint-sales-agent")
logger.setLevel(logging.INFO)

outbound_trunk_id = os.getenv("SIP_OUTBOUND_TRUNK_ID")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")
BACKEND_INTERNAL_KEY = os.getenv("BACKEND_INTERNAL_KEY", "")


async def fetch_agent_config(agent_config_id: str) -> dict:
    """Fetch the AgentConfig from the FlowZint backend."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BACKEND_URL}/internal/agent-config/{agent_config_id}",
            headers={"x-internal-key": BACKEND_INTERNAL_KEY},
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


async def update_call_transcript(call_id: str, transcript: str, status: str = "COMPLETED"):
    """Send transcript back to backend after call ends."""
    async with httpx.AsyncClient() as client:
        try:
            await client.patch(
                f"{BACKEND_URL}/internal/calls/{call_id}",
                json={"transcript": transcript, "status": status},
                headers={"x-internal-key": BACKEND_INTERNAL_KEY},
                timeout=10.0,
            )
        except Exception as e:
            logger.error(f"Failed to update call transcript: {e}")


class FlowZintSalesCaller(Agent):
    """
    Dynamic AI sales agent whose persona is loaded from the FlowZint
    AgentConfig at call time — customized per business workspace.
    """

    def __init__(
        self,
        *,
        dial_info: dict[str, Any],
        agent_config: dict,
        call_id: str,
    ):
        # Build system prompt from workspace-specific AgentConfig
        system_prompt = agent_config.get("systemPrompt", "You are a professional sales agent.")

        # Append function guidance
        system_prompt += """

FUNCTION TOOLS USAGE RULES:
- Use `qualify_lead` when you have gathered enough info to rate their interest level (1-10)
- Use `book_demo` ONLY when the lead explicitly agrees to a meeting/demo — confirm date/time preference first
- Use `transfer_to_human` if the lead requests to speak to a human — always confirm before transferring
- Use `detected_answering_machine` immediately if you hear a voicemail greeting BEFORE speaking
- Use `end_call` when: conversation naturally ends, lead is not interested, or they hang up
- NEVER use multiple function tools simultaneously
"""

        super().__init__(instructions=system_prompt)

        self.participant: rtc.RemoteParticipant | None = None
        self.dial_info = dial_info
        self.agent_config = agent_config
        self.call_id = call_id
        self.transcript_lines: list[str] = []

    async def on_enter(self):
        """Speak the workspace-specific opening script when call connects."""
        opening_script = self.agent_config.get(
            "openingScript",
            "Hello! I'm calling to have a quick conversation. Is now a good time?"
        )

        logger.info(f"Call connected — playing opening script for call {self.call_id}")
        await self.session.generate_reply(
            instructions=f"Speak exactly this opening to the person who just picked up: '{opening_script}'"
        )

    def set_participant(self, participant: rtc.RemoteParticipant):
        self.participant = participant

    async def hangup(self):
        """Hang up by deleting the LiveKit room."""
        job_ctx = get_job_context()
        # Save transcript before hanging up
        if self.transcript_lines:
            transcript = "\n".join(self.transcript_lines)
            await update_call_transcript(self.call_id, transcript, "COMPLETED")

        await job_ctx.api.room.delete_room(
            api.DeleteRoomRequest(room=job_ctx.room.name)
        )

    @function_tool()
    async def qualify_lead(
        self,
        ctx: RunContext,
        interest_level: int,
        budget_confirmed: bool,
        timeline: str,
        notes: str,
    ):
        """
        Record lead qualification data after gathering sufficient information.

        Args:
            interest_level: Interest level from 1 (no interest) to 10 (very interested)
            budget_confirmed: Whether the lead has confirmed they have budget
            timeline: When they might be ready (e.g., "immediately", "next quarter", "not sure")
            notes: Key observations from the conversation
        """
        logger.info(
            f"Qualifying lead: interest={interest_level}/10, budget={budget_confirmed}, "
            f"timeline={timeline}"
        )

        async with httpx.AsyncClient() as client:
            try:
                await client.post(
                    f"{BACKEND_URL}/internal/calls/{self.call_id}/qualify",
                    json={
                        "interestLevel": interest_level,
                        "budgetConfirmed": budget_confirmed,
                        "timeline": timeline,
                        "notes": notes,
                    },
                    headers={"x-internal-key": BACKEND_INTERNAL_KEY},
                    timeout=5.0,
                )
            except Exception as e:
                logger.warning(f"Could not save qualification: {e}")

        return f"Qualification recorded: interest {interest_level}/10"

    @function_tool()
    async def book_demo(
        self,
        ctx: RunContext,
        preferred_date: str,
        preferred_time: str,
    ):
        """
        Book a demo/meeting when the lead explicitly agrees to one.
        Only call this after the lead has clearly said YES to a meeting.

        Args:
            preferred_date: Preferred date (e.g., "tomorrow", "next Monday", "May 25")
            preferred_time: Preferred time (e.g., "2pm", "morning", "afternoon")
        """
        logger.info(f"Booking demo for call {self.call_id}: {preferred_date} at {preferred_time}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{BACKEND_URL}/internal/calls/{self.call_id}/book",
                    json={
                        "preferredDate": preferred_date,
                        "preferredTime": preferred_time,
                    },
                    headers={"x-internal-key": BACKEND_INTERNAL_KEY},
                    timeout=10.0,
                )
                data = response.json()
                scheduling_url = data.get("schedulingUrl", "")

                await ctx.session.generate_reply(
                    instructions=(
                        f"Tell the lead their demo is being booked for {preferred_date} at {preferred_time}. "
                        f"Let them know they'll receive a confirmation email shortly. "
                        f"Thank them warmly and wrap up the call."
                    )
                )

                return f"Demo booked for {preferred_date} at {preferred_time}"
            except Exception as e:
                logger.error(f"Booking failed: {e}")
                await ctx.session.generate_reply(
                    instructions="Apologize that you had a technical issue with booking. Offer to have a colleague follow up with a calendar invite."
                )
                return "Booking failed — manual follow-up needed"

    @function_tool()
    async def transfer_to_human(self, ctx: RunContext):
        """
        Transfer the call to a human sales rep.
        Only use after confirming with the lead that they want to speak to someone.
        """
        transfer_to = self.dial_info.get("transfer_to")
        if not transfer_to:
            await ctx.session.generate_reply(
                instructions="Tell the lead that no human agents are available right now, but someone will call them back within the hour."
            )
            return "No transfer number configured"

        await ctx.session.generate_reply(
            instructions="Let the lead know you're transferring them to a sales specialist right now."
        )

        job_ctx = get_job_context()
        try:
            await job_ctx.api.sip.transfer_sip_participant(
                api.TransferSIPParticipantRequest(
                    room_name=job_ctx.room.name,
                    participant_identity=self.participant.identity,
                    transfer_to=f"tel:{transfer_to}",
                )
            )
            logger.info(f"Call {self.call_id} transferred to {transfer_to}")
        except Exception as e:
            logger.error(f"Transfer failed: {e}")
            await ctx.session.generate_reply(
                instructions="Tell the lead the transfer failed. Apologize and say a team member will call them back shortly."
            )
            await self.hangup()

    @function_tool()
    async def end_call(self, ctx: RunContext):
        """
        End the call gracefully. Use when:
        - The conversation has reached a natural conclusion
        - The lead is not interested and wants to end
        - The call objective has been achieved
        """
        logger.info(f"Ending call {self.call_id}")

        current_speech = ctx.session.current_speech
        if current_speech:
            await current_speech.wait_for_playout()

        await self.hangup()

    @function_tool()
    async def detected_answering_machine(self, ctx: RunContext):
        """
        Called immediately when you hear a voicemail/answering machine greeting.
        Do NOT leave a voicemail — just hang up silently.
        """
        logger.info(f"Voicemail detected for call {self.call_id} — hanging up")
        await update_call_transcript(self.call_id, "[VOICEMAIL DETECTED]", "VOICEMAIL")
        await self.hangup()


async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect()

    # Parse job metadata from backend dispatch
    try:
        dial_info = json.loads(ctx.job.metadata)
    except json.JSONDecodeError:
        metadata = ctx.job.metadata.strip("{} ")
        dial_info = {}
        for item in metadata.split(","):
            if ":" in item:
                k, v = item.split(":", 1)
                dial_info[k.strip()] = v.strip()
        logger.warning(f"JSON parse fallback: {dial_info}")

    phone_number = dial_info.get("phone_number", "")
    call_id = dial_info.get("call_id", "")
    lead_name = dial_info.get("lead_name", "there")
    agent_config_id = dial_info.get("agent_config_id", "")
    participant_identity = phone_number

    logger.info(
        f"Dispatching call: phone={phone_number}, call_id={call_id}, "
        f"agent_config_id={agent_config_id}"
    )

    # Load the workspace-specific agent config
    try:
        agent_config_data = await fetch_agent_config(agent_config_id)
        agent_config = agent_config_data.get("config", {})
    except Exception as e:
        logger.error(f"Failed to fetch agent config {agent_config_id}: {e}")
        ctx.shutdown()
        return

    # Create the dynamic sales agent
    agent = FlowZintSalesCaller(
        dial_info=dial_info,
        agent_config=agent_config,
        call_id=call_id,
    )

    # Use OpenAI Realtime API for ultra-low latency voice
    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            model="gpt-realtime-2025-08-28",
            voice="alloy",
        ),
    )

    # Dial the lead via SIP
    try:
        await ctx.api.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                room_name=ctx.room.name,
                sip_trunk_id=outbound_trunk_id,
                sip_call_to=phone_number,
                participant_identity=participant_identity,
                wait_until_answered=True,
            )
        )
        logger.info(f"Call answered by {participant_identity}")
    except api.TwirpError as e:
        logger.error(
            f"SIP error: {e.message}, SIP status: "
            f"{e.metadata.get('sip_status_code')} {e.metadata.get('sip_status')}"
        )
        await update_call_transcript(call_id, "[CALL FAILED - SIP ERROR]", "FAILED")
        ctx.shutdown()
        return

    # Start session after call is answered
    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=RoomInputOptions(
            participant_identity=participant_identity,
        ),
    )

    participant = await ctx.wait_for_participant(identity=participant_identity)
    logger.info(f"Participant joined: {participant.identity}")
    agent.set_participant(participant)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="flowzint-sales-agent",
        )
    )
