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

    def __init__(self, **kwargs):
        # Hỗ trợ cả 2 chuẩn tham số lịch sử trong toàn bộ codebase:
        # Chuẩn 1: manhinh, chucnang, user_thuchien, noidung
        # Chuẩn 2: TARGET_OBJECT, ACTION_TYPE, USER_ACTION, DESCRIPTION
        manhinh = kwargs.pop("manhinh", None) or kwargs.pop("TARGET_OBJECT", None) or kwargs.pop("screen", None)
        chucnang = kwargs.pop("chucnang", None) or kwargs.pop("ACTION_TYPE", None) or kwargs.pop("action", None)
        user_thuchien = kwargs.pop("user_thuchien", None) or kwargs.pop("USER_ACTION", None) or kwargs.pop("actor", None)
        noidung = kwargs.pop("noidung", None) or kwargs.pop("DESCRIPTION", None) or kwargs.pop("content", None)
        ngay_insert = kwargs.pop("ngay_insert", None) or datetime.now()
        active = kwargs.pop("active", True)
        super().__init__(
            manhinh=manhinh,
            chucnang=chucnang,
            user_thuchien=user_thuchien,
            noidung=noidung,
            ngay_insert=ngay_insert,
            active=active,
            **kwargs
        )


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
