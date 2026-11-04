def test_refresh_tokens_are_unique(monkeypatch):
    for name, value in {
        "SECRET_KEY": "test-secret-key-with-at-least-32-characters",
        "POSTGRES_SERVER": "localhost",
        "POSTGRES_USER": "test",
        "POSTGRES_PASSWORD": "test",
        "POSTGRES_DB": "test",
        "DATABASE_URL": "sqlite+aiosqlite:///:memory:",
    }.items():
        monkeypatch.setenv(name, value)
    from app.core.security import create_refresh_token, decode_token, hash_refresh_token

    first = create_refresh_token("1")
    second = create_refresh_token("1")
    assert first != second
    assert decode_token(first)["sub"] == "1"
    assert hash_refresh_token(first) != first
    assert hash_refresh_token(first) == hash_refresh_token(first)


def test_refresh_token_subject_must_be_an_integer():
    from fastapi import HTTPException
    from app.api.api_v1.endpoints.auth import _refresh_user_id

    assert _refresh_user_id({"sub": "42"}) == 42
    for payload in ({}, {"sub": "not-an-id"}, {"sub": None}):
        try:
            _refresh_user_id(payload)
            assert False, "invalid refresh subject should be rejected"
        except HTTPException as exc:
            assert exc.status_code == 401


def test_transfer_effect_and_reversal():
    from decimal import Decimal
    import app.db.base
    from app.api.api_v1.endpoints.transactions import _apply_transaction_effect
    from app.models.account import Account

    source = Account(balance=100.0)
    destination = Account(balance=20.0)
    _apply_transaction_effect(source, destination, "transfer", 10.0)
    assert (source.balance, destination.balance) == (90.0, 30.0)
    _apply_transaction_effect(source, destination, "transfer", 10.0, reverse=True)
    assert (source.balance, destination.balance) == (100.0, 20.0)

    source.balance = Decimal("0")
    _apply_transaction_effect(source, None, "income", 0.1)
    _apply_transaction_effect(source, None, "income", 0.2)
    assert source.balance == Decimal("0.3")
