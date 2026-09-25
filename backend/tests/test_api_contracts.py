import pytest
from pydantic import ValidationError

from app.schemas.core import (
    CategoryUpdate,
    Currency,
    TagUpdate,
    TransactionCreate,
    TransactionType,
    TransactionUpdate,
)
from app.schemas.various import GoalUpdate, SavingsUpdate


def test_transfer_payload_is_supported():
    payload = TransactionCreate(
        accountId=1,
        toAccountId=2,
        amount=125.50,
        type=TransactionType.TRANSFER,
    )

    assert payload.type is TransactionType.TRANSFER
    assert payload.to_account_id == 2


def test_transaction_amount_must_be_positive():
    with pytest.raises(ValidationError):
        TransactionCreate(accountId=1, amount=0)


def test_transaction_update_is_partial():
    payload = TransactionUpdate(description="Updated description")

    assert payload.description == "Updated description"
    assert payload.amount is None
    assert payload.account_id is None


def test_transaction_currency_is_explicit_and_supported():
    assert TransactionCreate(accountId=1, amount=10).currency is None
    assert TransactionCreate(accountId=1, amount=10, currency="EUR").currency is Currency.EUR


def test_goal_amount_cannot_be_negative():
    with pytest.raises(ValidationError):
        GoalUpdate(current_amount=-1)


def test_goal_and_savings_updates_are_partial():
    assert GoalUpdate(current_amount=50).current_amount == 50
    assert SavingsUpdate(balance=50).balance == 50


def test_category_and_tag_updates_are_partial():
    assert CategoryUpdate(color="#ffffff").name is None
    assert TagUpdate(color="#ffffff").name is None
