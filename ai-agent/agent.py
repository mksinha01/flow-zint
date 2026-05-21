from __future__ import annotations

import asyncio
import logging
from dotenv import load_dotenv
import json
import os
from typing import Any
import aiohttp

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
from livekit.plugins import openai

# load environment variables
load_dotenv(dotenv_path=".env.local")
logger = logging.getLogger("outbound-caller")
logger.setLevel(logging.INFO)

outbound_trunk_id = os.getenv("SIP_OUTBOUND_TRUNK_ID")

class OutboundCaller(Agent):
    def __init__(
        self,
        *,
        name: str,
        instructions: str,
        opening_script: str,
        dial_info: dict[str, Any],
    ):
        super().__init__(instructions=instructions)
        self.participant: rtc.RemoteParticipant | None = None
        self.dial_info = dial_info
        self.opening_script = opening_script
        self.name = name

    async def on_enter(self):
        """Called by LiveKit when this agent is assigned to a session — speak first."""
        logger.info("Agent entered session, sending initial greeting...")
        await self.session.generate_reply(
            instructions=(
                "The person just answered the phone. Greet them using exactly this script or close to it:\n"
                f'"{self.opening_script}"'
            )
        )

    def set_participant(self, participant: rtc.RemoteParticipant):
        self.participant = participant

    async def hangup(self):
        job_ctx = get_job_context()
        await job_ctx.api.room.delete_room(
            api.DeleteRoomRequest(room=job_ctx.room.name)
        )

    @function_tool()
    async def transfer_call(self, ctx: RunContext):
        """Transfer the call to a human agent, called after confirming with the user"""
        transfer_to = self.dial_info.get("transfer_to")
        if not transfer_to:
            return "cannot transfer call"

        logger.info(f"transferring call to {transfer_to}")
        await ctx.session.generate_reply(instructions="let the user know you'll be transferring them")

        job_ctx = get_job_context()
        try:
            await job_ctx.api.sip.transfer_sip_participant(
                api.TransferSIPParticipantRequest(
                    room_name=job_ctx.room.name,
                    participant_identity=self.participant.identity,
                    transfer_to=f"tel:{transfer_to}",
                )
            )
            logger.info(f"transferred call to {transfer_to}")
        except Exception as e:
            logger.error(f"error transferring call: {e}")
            await ctx.session.generate_reply(instructions="there was an error transferring the call.")
            await self.hangup()

    @function_tool()
    async def end_call(self, ctx: RunContext):
        """Called when the user wants to end the call"""
        logger.info(f"ending the call for {self.participant.identity}")
        current_speech = ctx.session.current_speech
        if current_speech:
            await current_speech.wait_for_playout()
        await self.hangup()

    @function_tool()
    async def book_demo(
        self,
        ctx: RunContext,
        preferred_date: str,
        preferred_time: str,
    ):
        """Called when the user agrees to book a product demo or meeting.
        
        Args:
            preferred_date: The date requested (e.g., 'YYYY-MM-DD' or 'next Tuesday')
            preferred_time: The time requested (e.g., '14:00' or '3pm')
        """
        logger.info(f"booking demo for {self.participant.identity} on {preferred_date} at {preferred_time}")
        
        call_id = self.dial_info.get("call_id")
        backend_url = os.getenv("BACKEND_URL", "http://localhost:4000")
        internal_key = os.getenv("BACKEND_INTERNAL_KEY", "super-secret-key")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{backend_url}/api/internal/calls/{call_id}/book",
                    json={"preferredDate": preferred_date, "preferredTime": preferred_time},
                    headers={"x-internal-key": internal_key}
                ) as resp:
                    if resp.status == 200:
                        return "Demo booked successfully. Let the user know they will receive a confirmation email."
                    else:
                        return "Failed to book the demo. Let the user know."
        except Exception as e:
            logger.error(f"Error booking demo: {e}")
            return "Failed to book the demo due to a system error."

    @function_tool()
    async def qualify_lead(
        self,
        ctx: RunContext,
        interest_level: int,
        budget_confirmed: bool,
        timeline: str,
        notes: str
    ):
        """Called to save qualification information about the lead during the call.
        
        Args:
            interest_level: Integer from 1-10 indicating interest
            budget_confirmed: Boolean whether they have the budget
            timeline: The timeline for purchasing (e.g. '1 month', 'Next quarter')
            notes: Brief notes about their specific needs
        """
        logger.info(f"qualifying lead {self.participant.identity}: interest={interest_level}")
        call_id = self.dial_info.get("call_id")
        backend_url = os.getenv("BACKEND_URL", "http://localhost:4000")
        internal_key = os.getenv("BACKEND_INTERNAL_KEY", "super-secret-key")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{backend_url}/api/internal/calls/{call_id}/qualify",
                    json={
                        "interestLevel": interest_level,
                        "budgetConfirmed": budget_confirmed,
                        "timeline": timeline,
                        "notes": notes
                    },
                    headers={"x-internal-key": internal_key}
                ) as resp:
                    return "Qualification data saved successfully."
        except Exception as e:
            logger.error(f"Error saving qualification: {e}")
            return "Failed to save qualification data."

    @function_tool()
    async def detected_answering_machine(self, ctx: RunContext):
        """Called when the call reaches voicemail. Use this tool AFTER you hear the voicemail greeting"""
        logger.info(f"detected answering machine for {self.participant.identity}")
        await ctx.session.generate_reply(
            instructions="Leave a brief 10-second voicemail letting them know who called and why, then say you will try again later."
        )
        await asyncio.sleep(15)
        await self.hangup()


async def entrypoint(ctx: JobContext):
    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect()

    try:
        dial_info = json.loads(ctx.job.metadata)
    except json.JSONDecodeError:
        # Fallback manual parsing if needed
        metadata = ctx.job.metadata.strip('{} ')
        dial_info = {}
        for item in metadata.split(','):
            if ':' in item:
                k, v = item.split(':', 1)
                dial_info[k.strip()] = v.strip().strip('"').strip("'")
        logger.warning(f"Failed to parse JSON, fell back to manual parsing: {dial_info}")
    except Exception as e:
        logger.error(f"Failed to parse job metadata: {e}")
        dial_info = {}
    
    agent_config_id = dial_info.get("agent_config_id")
    lead_name = dial_info.get("lead_name", "there")
    lead_notes = dial_info.get("lead_notes", "")
    phone_number = dial_info.get("phone_number")
    
    backend_url = os.getenv("BACKEND_URL", "http://localhost:4000")
    internal_key = os.getenv("BACKEND_INTERNAL_KEY", "super-secret-key")
    
    system_prompt = "You are a helpful AI sales agent."
    opening_script = f"Hello {lead_name}, how are you today?"
    
    # Fetch personalized config
    if agent_config_id:
        try:
            async with aiohttp.ClientSession() as http_session:
                async with http_session.get(
                    f"{backend_url}/api/internal/agent-config/{agent_config_id}",
                    headers={"x-internal-key": internal_key}
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        config = data.get("config", {})
                        if config:
                            system_prompt = config.get("systemPrompt", system_prompt)
                            opening_script = config.get("openingScript", opening_script)
        except Exception as e:
            logger.error(f"Error fetching agent config: {e}")

    # Inject personalized details into the prompt
    personalized_prompt = f"{system_prompt}\n\nCURRENT CALL CONTEXT:\nLead Name: {lead_name}\nLead Notes: {lead_notes}"

    agent = OutboundCaller(
        name=lead_name,
        instructions=personalized_prompt,
        opening_script=opening_script,
        dial_info=dial_info,
    )

    # OpenAI Realtime API for ultra low latency
    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            model="gpt-realtime-2025-08-28",
            voice="alloy",
        ),
    )

    # Dial the participant using the SIP trunk
    participant_identity = phone_number
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
        logger.info(f"call answered by {participant_identity}")
    except api.TwirpError as e:
        logger.error(
            f"error creating SIP participant: {e.message}, "
            f"SIP status: {e.metadata.get('sip_status_code')} "
            f"{e.metadata.get('sip_status')}"
        )
        ctx.shutdown()
        return
    except Exception as e:
        logger.error(f"unexpected error creating SIP participant: {e}")
        ctx.shutdown()
        return

    # Start session AFTER call is answered
    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=RoomInputOptions(
            participant_identity=participant_identity,
        ),
    )

    participant = await ctx.wait_for_participant(identity=participant_identity)
    logger.info(f"participant joined: {participant.identity}")
    agent.set_participant(participant)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="outbound-caller",
        )
    )
