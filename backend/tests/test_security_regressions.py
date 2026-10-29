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
    from app.core.security import create_refresh_token, decode_token

    first = create_refresh_token("1")
    second = create_refresh_token("1")
    assert first != second
    assert decode_token(first)["sub"] == "1"


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
