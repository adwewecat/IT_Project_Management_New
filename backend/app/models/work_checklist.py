from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, Unicode, UnicodeText, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ChecklistTemplate(Base):
    __tablename__ = "CHECKLIST_TEMPLATE"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ten_suon = Column(Unicode(255), nullable=False, index=True)
    ma_suon = Column(Unicode(100), nullable=True, index=True)
    danh_muc = Column(Unicode(100), nullable=True, default="Vận hành")
    mo_ta = Column(UnicodeText, nullable=True)
    nguoi_tao = Column(Unicode(100), nullable=True)
    sla_days = Column(Integer, default=5)
    ngay_tao = Column(DateTime, default=datetime.now)
    ngay_update = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    active = Column(Boolean, default=True)

    # Relationships
    items = relationship(
        "ChecklistTemplateItem",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="ChecklistTemplateItem.stt"
    )
    runs = relationship("ChecklistRun", back_populates="template")


class ChecklistTemplateItem(Base):
    __tablename__ = "CHECKLIST_TEMPLATE_ITEM"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("CHECKLIST_TEMPLATE.id", ondelete="CASCADE"), nullable=False, index=True)
    nhom = Column(Unicode(150), nullable=True)
    tieu_de = Column(UnicodeText, nullable=False)
    huong_dan = Column(UnicodeText, nullable=True)
    stt = Column(Integer, default=0)
    active = Column(Boolean, default=True)

    template = relationship("ChecklistTemplate", back_populates="items")


class ChecklistRun(Base):
    __tablename__ = "CHECKLIST_RUN"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("CHECKLIST_TEMPLATE.id"), nullable=False, index=True)
    ten_dot = Column(Unicode(255), nullable=False)
    ten_suon = Column(Unicode(255), nullable=True)
    version_note = Column(Unicode(255), nullable=True)
    ghi_chu = Column(UnicodeText, nullable=True)
    nguoi_thuc_hien = Column(Unicode(250), nullable=True)
    nguoi_tao = Column(Unicode(100), nullable=True)
    trang_thai = Column(Unicode(50), default="Đang thực hiện")
    sla_days = Column(Integer, default=5)
    han_chot_sla = Column(DateTime, nullable=True)
    ngay_bat_dau = Column(DateTime, default=datetime.now)
    ngay_hoan_thanh = Column(DateTime, nullable=True)
    ngay_tao = Column(DateTime, default=datetime.now)
    ngay_update = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    active = Column(Boolean, default=True)

    template = relationship("ChecklistTemplate", back_populates="runs")
    items = relationship(
        "ChecklistRunItem",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="ChecklistRunItem.stt"
    )


class ChecklistRunItem(Base):
    __tablename__ = "CHECKLIST_RUN_ITEM"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(Integer, ForeignKey("CHECKLIST_RUN.id", ondelete="CASCADE"), nullable=False, index=True)
    stt = Column(Integer, default=0)
    nhom = Column(Unicode(150), nullable=True)
    tieu_de = Column(UnicodeText, nullable=False)
    huong_dan = Column(UnicodeText, nullable=True)
    trang_thai = Column(Unicode(20), default="PENDING")  # 'PENDING', 'PASSED', 'FAILED', 'NA'
    ghi_chu_ket_qua = Column(UnicodeText, nullable=True)
    images = Column(UnicodeText, nullable=True)  # JSON list of image URLs
    nguoi_hoan_thanh = Column(Unicode(100), nullable=True)
    ngay_hoan_thanh = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True)

    run = relationship("ChecklistRun", back_populates="items")
