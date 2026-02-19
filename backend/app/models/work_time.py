"""Модель учёта рабочего времени сотрудника."""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, Numeric, Date
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.session import Base


class WorkTime(Base):
    __tablename__ = "work_times"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    pause_minutes = Column(Integer, default=0, nullable=False)
    total_hours = Column(Numeric(5, 2), nullable=True)  # вычисляется при end
    date = Column(Date, nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    worker = relationship("User")
