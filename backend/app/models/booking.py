from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.db.session import Base


class BookingStatus(str, enum.Enum):
    booked = "booked"
    completed = "completed"
    cancelled = "cancelled"


class BookingSource(str, enum.Enum):
    website = "website"
    worker = "worker"
    phone = "phone"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)

    client_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)

    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    service_price = Column(Integer, nullable=False)

    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)

    status = Column(Enum(BookingStatus), default=BookingStatus.booked, nullable=False)
    source = Column(Enum(BookingSource), default=BookingSource.website, nullable=False)

    cancel_token = Column(String, unique=True, index=True, nullable=True)

    marketing_consent = Column(Boolean, default=False, nullable=False)
    marketing_consent_at = Column(DateTime, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    service = relationship("Service")
    creator = relationship("User")