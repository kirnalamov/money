from sqlalchemy import Column, ForeignKey, Integer, JSON, String
from app.db.base_class import Base


class UserItem(Base):
    __tablename__ = "user_items"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    kind = Column(String(20), primary_key=True)
    key = Column(String(200), primary_key=True)
    value = Column(JSON, nullable=False)
