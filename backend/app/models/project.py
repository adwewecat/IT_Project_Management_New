from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import Unicode, Integer, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Project(Base):
    __tablename__ = 'Projects'

    ProjectID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ProjectName: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    Status: Mapped[str] = mapped_column(Unicode(20), default='in-progress', nullable=False)
    Deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    ProjectCode: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    Description: Mapped[Optional[str]] = mapped_column(Unicode, nullable=True)
    Images: Mapped[Optional[str]] = mapped_column(Unicode, nullable=True)
    Files: Mapped[Optional[str]] = mapped_column(Unicode, nullable=True)
    DescriptionUpdatedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    DescriptionUpdatedBy: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)

    # Relationships
    members: Mapped[List['ProjectMember']] = relationship(
        'ProjectMember', back_populates='project', cascade='all, delete-orphan', order_by='ProjectMember.MemberID'
    )


class ProjectMember(Base):
    __tablename__ = 'ProjectMembers'

    MemberID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ProjectID: Mapped[int] = mapped_column(Integer, ForeignKey('Projects.ProjectID', ondelete='CASCADE'), nullable=False)
    MemberName: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    CompletedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    MemberCode: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)

    # Relationships
    project: Mapped['Project'] = relationship('Project', back_populates='members')
    tasks: Mapped[List['MemberTask']] = relationship(
        'MemberTask', back_populates='member', cascade='all, delete-orphan', order_by='(MemberTask.Done, MemberTask.TaskID)'
    )


class MemberTask(Base):
    __tablename__ = 'MemberTasks'

    TaskID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MemberID: Mapped[int] = mapped_column(Integer, ForeignKey('ProjectMembers.MemberID', ondelete='CASCADE'), nullable=False)
    TaskName: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    Done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    CompletedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    LastChangedBy: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    LastChangedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    Attachment: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    ReviewStatus: Mapped[Optional[str]] = mapped_column(Unicode(20), nullable=True)
    ReviewNote: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    ReviewedBy: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ReviewedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    member: Mapped['ProjectMember'] = relationship('ProjectMember', back_populates='tasks')


class ProjectActivityLog(Base):
    __tablename__ = 'ProjectActivityLog'

    LogID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ProjectID: Mapped[int] = mapped_column(Integer, nullable=False)
    MemberID: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    TaskID: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ActionTime: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    ActionBy: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    ActionType: Mapped[str] = mapped_column(Unicode(50), nullable=False)
    Message: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
