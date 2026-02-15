from sqlalchemy import Column, Integer, Time, String
from datetime import time
from app.db.session import Base


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True)

    work_start = Column(Time, nullable=False, default=time(7, 30))
    work_end = Column(Time, nullable=False, default=time(18, 0))

    # 0=Monday ... 6=Sunday
    # будем хранить как строку: "0,1,2,3,4"
    working_days = Column(String, nullable=False, default="0,1,2,3,4")