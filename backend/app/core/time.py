from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return naive UTC for the existing database DateTime columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
