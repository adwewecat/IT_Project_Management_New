from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, UnicodeText, Boolean, DateTime, event, text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "LOGS"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    manhinh: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    chucnang: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    user_thuchien: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)
    noidung: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    ngay_insert: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)


SUPER_ADMIN_SET = {"admin", "administrator", "dung.nguyenanh"}


def determine_nhom_quyen(manhinh: Optional[str]) -> str:
    mh = (manhinh or "").upper()
    if any(k in mh for k in ["MEMO", "PIM", "SETUP", "RESTAURANT", "GPOS", "KDS", "SSO", "APP", "MON", "MENU", "CATEGORY", "CHECKLIST", "PROJECT", "THONG_BAO", "NOTIFICATION"]):
        return "APP"
    if any(k in mh for k in ["PR_PO", "PO", "PR", "DO", "KHO", "INVENTORY", "VATTU", "NCC", "SUPPLIER"]):
        return "INVENTORY"
    if any(k in mh for k in ["TRANSFER", "UNLOCK", "CLEAR_LOCK", "CPU", "HOTLINE", "HELPDESK", "NETWORK", "VPN", "TABLET", "DEVICE", "3CX", "INCIDENT", "SU_VU", "VIOLATION", "NGHI_PHEP"]):
        return "HELPDESK"
    if any(k in mh for k in ["USER", "ROLE", "JOB", "SYSTEM", "ADMIN", "QUAN_TRI"]):
        return "QUAN_TRI"
    return "APP"


@event.listens_for(AuditLog, "after_insert")
def sync_audit_log_to_logs_new(mapper, connection, target):
    """
    Tự động đồng bộ sang bảng LOGS__New khi có bất kỳ module nào ghi nhận AuditLog.
    QUY TẮC CỦA USER: "nếu user là supper admin thao tác thì không lưu logs lại"
    """
    user_raw = (target.user_thuchien or "").strip().lower()
    user_clean = user_raw.split("@")[0].strip()
    if user_clean in SUPER_ADMIN_SET or "dung.nguyenanh" in user_clean or "dung.nguyenanh" in user_raw or "super" in user_clean or "supper" in user_clean:
        return

    nhom = determine_nhom_quyen(target.manhinh)
    try:
        connection.execute(
            text("""
                INSERT INTO dbo.LOGS__New (nhom_quyen, man_hinh, hanh_dong, noi_dung, user_thuchien, status, created_at)
                VALUES (:nhom, :manhinh, :chucnang, :noidung, :user_thuchien, 'SUCCESS', :created_at)
            """),
            {
                "nhom": nhom,
                "manhinh": target.manhinh or "SYSTEM",
                "chucnang": target.chucnang or "ACTION",
                "noidung": target.noidung or "",
                "user_thuchien": target.user_thuchien or "SYSTEM",
                "created_at": target.ngay_insert or datetime.now()
            }
        )
    except Exception:
        pass

