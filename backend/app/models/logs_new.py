from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Unicode, UnicodeText, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class LogsNew(Base):
    __tablename__ = "LOGS__New"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nhom_quyen: Mapped[str] = mapped_column(Unicode(50), nullable=False, index=True)  # APP, INVENTORY, HELPDESK, QUAN_TRI
    man_hinh: Mapped[str] = mapped_column(Unicode(150), nullable=False)
    hanh_dong: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    noi_dung: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    du_lieu_cu: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    du_lieu_moi: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    user_thuchien: Mapped[str] = mapped_column(Unicode(100), nullable=False, index=True)
    user_role: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    ip_client: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(30), default="SUCCESS")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
