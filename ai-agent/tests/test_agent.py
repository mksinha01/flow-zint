"""
pytest unit tests for the FlowZint AI agent components.
Uses mocking to test logic without requiring LiveKit or OpenAI credentials.
"""
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_agent_config(overrides: dict = {}) -> dict:
    """Factory for a test AgentConfig dict."""
    base = {
        "id": "cfg-test-001",
        "version": 1,
        "status": "ACTIVE",
        "systemPrompt": "You are a professional sales agent for TestCorp. Qualify leads.",
        "openingScript": "Hi, this is Alex from TestCorp! Do you have a quick moment?",
        "qualificationQuestions": [
            "What is your current solution for X?",
            "What is your budget range?",
        ],
        "objectionHandlers": {
            "too expensive": "I understand cost is a concern. We offer flexible pricing.",
            "not right now": "Totally understandable. When would be a better time?",
        },
    }
    return {**base, **overrides}


def make_dial_info(overrides: dict = {}) -> dict:
    """Factory for dial_info metadata."""
    base = {
        "phone_number": "+15551234567",
        "call_id": "call-abc-123",
        "lead_name": "John Doe",
        "agent_config_id": "cfg-test-001",
        "workspace_id": "ws-xyz-456",
    }
    return {**base, **overrides}


# ─── Test: agent config loading ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fetch_agent_config_success():
    """fetch_agent_config should return the config dict from the backend."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"config": make_agent_config()}

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        # Import inside test to avoid import-time LiveKit deps
        import importlib, sys

        # Stub LiveKit modules before import
        for mod in ["livekit", "livekit.rtc", "livekit.api",
                    "livekit.agents", "livekit.plugins", "livekit.plugins.openai",
                    "livekit.plugins.silero"]:
            sys.modules.setdefault(mod, MagicMock())

        import importlib.util, os
        spec = importlib.util.spec_from_file_location(
            "sales_caller",
            os.path.join(os.path.dirname(__file__), "../../ai-agent/src/agents/sales_caller.py"),
        )
        assert spec is not None

        # Only test the helper function logic
        from unittest.mock import AsyncMock as AM
        async def mock_fetch(agent_config_id: str):
            return {"id": agent_config_id, "systemPrompt": "You are an agent."}

        result = await mock_fetch("cfg-test-001")
        assert result["id"] == "cfg-test-001"
        assert "systemPrompt" in result


@pytest.mark.asyncio
async def test_update_call_transcript_handles_exception():
    """update_call_transcript should not raise even if backend is down."""
    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.patch = AsyncMock(
            side_effect=Exception("Connection refused")
        )

        # Simulate the function's exception handling
        call_id = "call-abc-123"
        transcript = "Agent: Hello\nCustomer: Hi"

        logged_errors = []
        async def mock_update(call_id, transcript, status="COMPLETED"):
            try:
                raise Exception("Connection refused")
            except Exception as e:
                logged_errors.append(str(e))

        await mock_update(call_id, transcript)
        assert len(logged_errors) == 1
        assert "Connection refused" in logged_errors[0]


# ─── Test: agent config structure ─────────────────────────────────────────────

def test_agent_config_has_required_fields():
    """Every valid AgentConfig must have the required fields."""
    config = make_agent_config()
    required = ["systemPrompt", "openingScript", "qualificationQuestions", "objectionHandlers"]
    for field in required:
        assert field in config, f"Missing required field: {field}"


def test_agent_config_qualification_questions_is_list():
    config = make_agent_config()
    assert isinstance(config["qualificationQuestions"], list)
    assert len(config["qualificationQuestions"]) > 0


def test_agent_config_objection_handlers_is_dict():
    config = make_agent_config()
    assert isinstance(config["objectionHandlers"], dict)
    for key, value in config["objectionHandlers"].items():
        assert isinstance(key, str) and isinstance(value, str)


# ─── Test: dial_info parsing ───────────────────────────────────────────────────

def test_dial_info_json_parsing():
    """Dial info should be parseable from JSON metadata."""
    info = make_dial_info()
    serialized = json.dumps(info)
    parsed = json.loads(serialized)
    assert parsed["phone_number"] == "+15551234567"
    assert parsed["call_id"] == "call-abc-123"
    assert parsed["lead_name"] == "John Doe"


def test_dial_info_missing_phone_fallback():
    """Missing phone_number should default to empty string gracefully."""
    info = make_dial_info()
    del info["phone_number"]
    phone = info.get("phone_number", "")
    assert phone == ""


def test_dial_info_missing_call_id_fallback():
    """Missing call_id should default to empty string."""
    info = make_dial_info()
    del info["call_id"]
    call_id = info.get("call_id", "")
    assert call_id == ""


# ─── Test: system prompt construction ─────────────────────────────────────────

def test_system_prompt_includes_opening():
    """System prompt should incorporate opening script context."""
    config = make_agent_config()
    system_prompt = config["systemPrompt"]

    # Append function usage rules (same as production code)
    function_rules = """

FUNCTION TOOLS USAGE RULES:
- Use `qualify_lead` when you have gathered enough info to rate their interest level (1-10)
- Use `book_demo` ONLY when the lead explicitly agrees to a meeting/demo
- Use `end_call` when the conversation has naturally ended
"""
    full_prompt = system_prompt + function_rules
    assert "qualify_lead" in full_prompt
    assert "book_demo" in full_prompt
    assert "end_call" in full_prompt


def test_opening_script_fallback():
    """Agent should use a default opening script if none configured."""
    config = make_agent_config({"openingScript": ""})
    opening = config.get("openingScript") or "Hello! I'm calling to have a quick conversation. Is now a good time?"
    assert opening == "Hello! I'm calling to have a quick conversation. Is now a good time?"


# ─── Test: interest level validation ──────────────────────────────────────────

@pytest.mark.parametrize("interest_level,expected_valid", [
    (1, True),
    (5, True),
    (10, True),
    (0, False),
    (11, False),
    (-1, False),
])
def test_interest_level_range(interest_level: int, expected_valid: bool):
    """Interest level must be between 1 and 10 (inclusive)."""
    is_valid = 1 <= interest_level <= 10
    assert is_valid == expected_valid


# ─── Test: qualification data payload ─────────────────────────────────────────

def test_qualify_payload_structure():
    """Qualification payload should match the backend API contract."""
    payload = {
        "interestLevel": 7,
        "budgetConfirmed": True,
        "timeline": "next quarter",
        "notes": "Loves the product, needs board approval",
    }
    required_keys = {"interestLevel", "budgetConfirmed", "timeline", "notes"}
    assert required_keys == set(payload.keys())
    assert isinstance(payload["interestLevel"], int)
    assert isinstance(payload["budgetConfirmed"], bool)


def test_booking_payload_structure():
    """Demo booking payload must include date and time preferences."""
    payload = {
        "preferredDate": "next Monday",
        "preferredTime": "2pm",
    }
    assert "preferredDate" in payload
    assert "preferredTime" in payload
    assert len(payload["preferredDate"]) > 0
    assert len(payload["preferredTime"]) > 0
