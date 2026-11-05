from typing import Optional
from datetime import datetime
from sqlalchemy import Unicode, UnicodeText, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ManagedAPI(Base):
    __tablename__ = "MANAGED_APIS"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_code: Mapped[str] = mapped_column(Unicode(100), unique=True, nullable=False, index=True)
    api_name: Mapped[str] = mapped_column(Unicode(250), nullable=False)
    endpoint_path: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    alias_path: Mapped[Optional[str]] = mapped_column(Unicode(255), nullable=True)
    method: Mapped[str] = mapped_column(Unicode(20), default="GET", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    require_api_key: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    api_key: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
