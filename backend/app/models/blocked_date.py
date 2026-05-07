from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class BlockedDate(Base):
    """Whole calendar days with no bookings (holidays by owner, day blocks by worker)."""

    __tablename__ = "blocked_dates"

    id = Column(Integer, primary_key=True, index=True)

    # Calendar day (no time zone; compare with booking.start_time.date() locally)
    block_date = Column(Date, nullable=False, unique=True, index=True)

    note = Column(String, nullable=True, default="")

    # holiday = owner (Feiertag); worker_block = Mitarbeiter hat Tag gesperrt
    kind = Column(String, nullable=False, default="holiday")

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    creator = relationship("User", foreign_keys=[created_by])
