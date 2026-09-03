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
