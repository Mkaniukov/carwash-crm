from sqlalchemy import Column, Integer, Time, String, Text
from datetime import time
from app.db.session import Base


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True)

    work_start = Column(Time, nullable=False, default=time(7, 30))
    work_end = Column(Time, nullable=False, default=time(18, 0))

    # 0=Monday ... 6=Sunday
    # stored as string: "0,1,2,3,4" (weekday numbers)
    working_days = Column(String, nullable=False, default="0,1,2,3,4")

    # JSON array of emails that receive a copy of each new booking notification, e.g. '["a@b.com"]'
    notification_emails = Column(Text, nullable=False, default="[]")

    # Optional: per-weekday hours. JSON: {"0": {"start": "07:30", "end": "18:00"}, "1": {...}, ..., "6": null}.
    # 0=Monday ... 6=Sunday. Missing or null = closed that day. When set, overrides work_start/work_end/working_days.
    hours_per_day = Column(Text, nullable=True, default=None)