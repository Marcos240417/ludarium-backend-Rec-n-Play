from sqlalchemy import Column, Integer, String, DateTime
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class PrivateMessage(Base):
    __tablename__ = "private_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_username = Column(String, index=True)
    recipient_username = Column(String, index=True)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)