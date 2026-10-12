from sqlalchemy import Column, Integer, Unicode, UnicodeText, DateTime, Boolean
from app.core.database import Base


class CodePhoto(Base):
    __tablename__ = "CODE_PHOTO"

    id = Column(Integer, primary_key=True, index=True)
    hientrang = Column(Unicode(50), nullable=True, default="ON")
    manv = Column(Unicode(50), nullable=True)
    name = Column(Unicode(255), nullable=True)
    email = Column(Unicode(255), nullable=True)
    pass_code = Column(Unicode(50), nullable=True)
    cmnd_sdt = Column(Unicode(50), nullable=True)
    cty = Column(Unicode(255), nullable=True)
    donvi = Column(Unicode(255), nullable=True)
    bophan = Column(Unicode(255), nullable=True)
    chucdanh = Column(Unicode(255), nullable=True)
    code_dept = Column(Unicode(50), nullable=True)
    note = Column(UnicodeText, nullable=True)
    ngay_insert = Column(DateTime, nullable=True)
    ngay_update = Column(DateTime, nullable=True)
    user_insert = Column(Unicode(50), nullable=True)
    user_update = Column(Unicode(50), nullable=True)
    timkiem = Column(UnicodeText, nullable=True)
    active = Column(Boolean, default=True)
