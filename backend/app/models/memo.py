from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, Unicode, UnicodeText
from app.core.database import Base


class Memo(Base):
    __tablename__ = "MEMO"

    id = Column(Integer, primary_key=True, index=True)
    ma_memo = Column(Unicode(50), nullable=True, index=True)
    subject_mail = Column(UnicodeText, nullable=True)
    ngay_batdau = Column(Date, nullable=True)
    ngay_ketthuc = Column(Date, nullable=True)
    it_setup = Column(Unicode(50), nullable=True, index=True)
    giahan = Column(Unicode(50), nullable=True, default="0")
    ngay_tiepnhan = Column(DateTime, nullable=True)
    trangthai = Column(Unicode(100), nullable=True, default="0")
    hoanthanh = Column(Unicode(100), nullable=True)
    nguoi_gui = Column(Unicode(100), nullable=True)
    huong_dan = Column(UnicodeText, nullable=True)
    noidung_mail = Column(UnicodeText, nullable=True)
    ten_file_memo = Column(Unicode(250), nullable=True)
    note = Column(UnicodeText, nullable=True)
    ngay_insert = Column(DateTime, nullable=True)
    ngay_update = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True)
    ReviewStatus = Column(Unicode(20), nullable=True)
    ReviewNote = Column(Unicode(500), nullable=True)
    ReviewedBy = Column(Unicode(100), nullable=True)
    ReviewedAt = Column(DateTime, nullable=True)
    ma_tua = Column(Unicode(50), nullable=True, index=True)


class MemoTemplateConfig(Base):
    __tablename__ = "MEMO_TEMPLATE_CONFIG"

    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(Unicode(100), nullable=True, index=True)
    config_val = Column(UnicodeText, nullable=True)


class MemoTemplateBrand(Base):
    __tablename__ = "MEMO_TEMPLATE_BRANDS"

    id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(Unicode(100), nullable=True, index=True)
    cc_emails = Column(UnicodeText, nullable=True)
    active = Column(Boolean, default=True)

