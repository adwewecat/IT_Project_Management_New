from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, Integer, Unicode, UnicodeText, DateTime
from app.core.database import Base

class ScheduledParamPushJob(Base):
    __tablename__ = "SCHEDULED_PARAM_PUSH_JOBS"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_title = Column(Unicode(255), nullable=False)
    run_date = Column(Unicode(20), nullable=False)          # YYYY-MM-DD
    run_time = Column(Unicode(10), nullable=False)          # HH:mm
    mode = Column(Unicode(50), nullable=False, default="upsert")  # upsert | overwrite | skip_existing
    target_restaurants_json = Column(UnicodeText, nullable=False) # JSON: [{name, sap_code, rk7_code, ip, port}]
    params_payload_json = Column(UnicodeText, nullable=False)     # JSON: [{paramCode, paramName, paramType, status, value, note}]
    status = Column(Unicode(50), nullable=False, default="PENDING") # PENDING | RUNNING | COMPLETED | FAILED | CANCELLED
    result_summary_json = Column(UnicodeText, nullable=True)      # JSON: results of each restaurant
    total_restaurants = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    created_by = Column(Unicode(100), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    executed_at = Column(DateTime, nullable=True)
