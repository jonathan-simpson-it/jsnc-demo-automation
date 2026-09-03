import pytest
from src.utils.api_key import (
    ApiKeyMissingError,
    get_request_api_key,
    reset_request_api_key,
    resolve_api_key,
    set_request_api_key,
)


def test_resolve_prefers_request_key_over_settings(monkeypatch):
    from config.settings import settings
    monkeypatch.setattr(settings, "deepseek_api_key", "env-key")
    token = set_request_api_key("user-key")
    try:
        assert resolve_api_key() == "user-key"
    finally:
        reset_request_api_key(token)


def test_resolve_falls_back_to_settings_key(monkeypatch):
    from config.settings import settings
    monkeypatch.setattr(settings, "deepseek_api_key", "env-key")
    token = set_request_api_key(None)
    try:
        assert resolve_api_key() == "env-key"
    finally:
        reset_request_api_key(token)


def test_resolve_raises_when_no_key_anywhere(monkeypatch):
    from config.settings import settings
    monkeypatch.setattr(settings, "deepseek_api_key", "")
    token = set_request_api_key(None)
    try:
        with pytest.raises(ApiKeyMissingError):
            resolve_api_key()
    finally:
        reset_request_api_key(token)


def test_request_key_resets_cleanly():
    token = set_request_api_key("abc")
    reset_request_api_key(token)
    assert get_request_api_key() is None


def test_make_llm_uses_request_key(monkeypatch):
    captured = {}
    import src.agents.graph as graph

    class FakeChatDeepSeek:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(graph, "ChatDeepSeek", FakeChatDeepSeek)
    token = set_request_api_key("req-key-123")
    try:
        graph._make_llm(temperature=0.5)
    finally:
        reset_request_api_key(token)
    assert captured["api_key"] == "req-key-123"
    assert captured["temperature"] == 0.5


from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.api.key_middleware import ApiKeyContextMiddleware


def _capture_app():
    inner = FastAPI()
    seen = {}

    @inner.get("/probe")
    async def probe():
        seen["key"] = get_request_api_key()
        return {"ok": True}

    wrapped = ApiKeyContextMiddleware(inner)
    test_app = FastAPI()
    test_app.mount("/", wrapped)
    return TestClient(test_app), seen


def test_middleware_sets_request_key():
    client, seen = _capture_app()
    client.get("/probe", headers={"X-API-Key": "  user-key-1  "})
    assert seen["key"] == "user-key-1"


def test_middleware_leaves_context_clean_without_header():
    client, seen = _capture_app()
    client.get("/probe")
    assert seen["key"] is None
