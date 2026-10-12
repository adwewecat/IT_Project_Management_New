from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class UserSSOConfig(Base):
    __tablename__ = "USER_SSO_CONFIG"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    system_username: Mapped[str] = mapped_column(Unicode(100), nullable=False, unique=True, index=True)
    sso_username: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    sso_password: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    last_status: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    last_tested_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ngay_cap_nhat: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
