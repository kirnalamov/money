"""Create a local demo account with representative financial data.

The script is intentionally opt-in. Set DEMO_DATA_ENABLED=true before running
it, or let docker-compose invoke it during local startup.
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

import app.db.base  # noqa: F401 - register all models
from app.core.config import settings
from app.core.security import get_password_hash, validate_password_strength
from app.db.session import AsyncSessionLocal
from app.models.account import Account
from app.models.category import Category
from app.models.tag import Tag
from app.models.transaction import Transaction
from app.models.user import User
from app.models.various import Goal, Savings


def demo_date(days_ago: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


async def seed_demo() -> None:
    if not settings.DEMO_DATA_ENABLED:
        print("Demo data is disabled. Set DEMO_DATA_ENABLED=true to enable it.")
        return

    is_valid, error_message = validate_password_strength(settings.DEMO_USER_PASSWORD)
    if not is_valid:
        raise ValueError(f"Invalid DEMO_USER_PASSWORD: {error_message}")

    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(User).where(User.username == settings.DEMO_USER_USERNAME)
        )
        if existing.scalar_one_or_none():
            print(f"Demo user already exists: {settings.DEMO_USER_USERNAME}")
            return

        user = User(
            email=settings.DEMO_USER_EMAIL,
            username=settings.DEMO_USER_USERNAME,
            hashed_password=get_password_hash(settings.DEMO_USER_PASSWORD),
            full_name=settings.DEMO_USER_FULL_NAME,
            financial_goal="Build a resilient investment portfolio",
            is_active=True,
            is_superuser=False,
            role="user",
        )
        db.add(user)
        await db.flush()

        categories_by_name: dict[str, Category] = {}
        category_values = {
            "Salary": ("#16a34a", "wallet"),
            "Housing": ("#f97316", "home"),
            "Food": ("#eab308", "utensils"),
            "Transport": ("#3b82f6", "car"),
            "Shopping": ("#a855f7", "shopping-bag"),
            "Savings": ("#06b6d4", "piggy-bank"),
            "Investments": ("#10b981", "trending-up"),
            "Leisure": ("#ec4899", "coffee"),
        }
        for name, (color, icon) in category_values.items():
            category = Category(
                name=name,
                color=color,
                icon=icon,
                user_id=user.id,
            )
            db.add(category)
            categories_by_name[name] = category

        tags_by_name: dict[str, Tag] = {}
        for name, color in {
            "recurring": "#64748b",
            "demo": "#0ea5e9",
            "long-term": "#22c55e",
        }.items():
            tag = Tag(name=name, color=color, user_id=user.id)
            db.add(tag)
            tags_by_name[name] = tag

        accounts = {
            "main": Account(
                name="Main Account",
                type="bank",
                balance=2500.0,
                currency="USD",
                user_id=user.id,
            ),
            "savings": Account(
                name="Emergency Fund",
                type="savings",
                balance=180000.0,
                currency="RUB",
                user_id=user.id,
            ),
            "brokerage": Account(
                name="Demo Brokerage",
                type="brokerage",
                balance=15000.0,
                currency="USD",
                user_id=user.id,
            ),
            "cash": Account(
                name="Travel Cash",
                type="cash",
                balance=420.0,
                currency="EUR",
                user_id=user.id,
            ),
        }
        db.add_all(accounts.values())
        await db.flush()

        transaction_values = [
            (5000.0, "Salary", "income", "Salary", "main", 30, ["recurring", "demo"]),
            (1200.0, "Rent", "expense", "Housing", "main", 25, ["recurring"]),
            (450.0, "Groceries", "expense", "Food", "main", 18, ["demo"]),
            (300.0, "Transport pass", "expense", "Transport", "main", 12, []),
            (550.0, "Weekend shopping", "expense", "Shopping", "main", 7, []),
            (200000.0, "Initial emergency fund", "income", "Savings", "savings", 90, ["long-term", "demo"]),
            (20000.0, "Holiday withdrawal", "expense", "Leisure", "savings", 38, []),
            (15000.0, "Investment deposit", "income", "Investments", "brokerage", 60, ["long-term", "demo"]),
            (500.0, "Travel cash top up", "income", "Salary", "cash", 20, ["demo"]),
            (80.0, "Coffee and snacks", "expense", "Leisure", "cash", 3, []),
        ]
        currency_by_account = {
            "main": "USD",
            "savings": "RUB",
            "brokerage": "USD",
            "cash": "EUR",
        }
        for amount, description, tx_type, category_name, account_key, days_ago, tag_names in transaction_values:
            transaction = Transaction(
                amount=amount,
                description=description,
                date=demo_date(days_ago),
                type=tx_type,
                currency=currency_by_account[account_key],
                account_id=accounts[account_key].id,
                category=categories_by_name[category_name],
                tags=[tags_by_name[tag] for tag in tag_names],
            )
            db.add(transaction)

        db.add_all([
            Goal(
                name="Emergency fund",
                target_amount=300000.0,
                current_amount=180000.0,
                deadline=demo_date(-365),
                currency="RUB",
                linked_account_id=accounts["savings"].id,
                user_id=user.id,
            ),
            Goal(
                name="Long-term portfolio",
                target_amount=50000.0,
                current_amount=15000.0,
                deadline=demo_date(-365 * 5),
                currency="USD",
                linked_account_id=accounts["brokerage"].id,
                user_id=user.id,
            ),
            Savings(
                name="Emergency reserve",
                balance=180000.0,
                interest_rate=7.5,
                user_id=user.id,
            ),
        ])

        await db.commit()
        print("Demo data created successfully.")
        print(f"  Username: {settings.DEMO_USER_USERNAME}")
        print(f"  Password: {settings.DEMO_USER_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed_demo())
