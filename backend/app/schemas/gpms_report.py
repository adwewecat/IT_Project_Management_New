# -*- coding: utf-8 -*-
"""
Pydantic Schemas cho phân hệ Báo Cáo GPMS.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class GpmsBatchItem(BaseModel):
    id: int
    report_name: str
    file_name: str
    period_label: Optional[str] = None
    export_at: Optional[datetime] = None
    total_rows: int = 0
    unique_senders: int = 0
    unique_receivers: int = 0
    source_type: str = "UPLOAD"
    uploaded_by: Optional[str] = None
    uploaded_at: datetime


class GpmsBatchListResponse(BaseModel):
    items: List[GpmsBatchItem]
    available_report_files: List[str] = Field(default_factory=list)


class GpmsSlaSummary(BaseModel):
    total: int = 0
    ht_dung_han: int = 0
    ht_tre_han: int = 0
    chua_ht_chua_tre: int = 0
    chua_ht_tre_han: int = 0
    da_huy: int = 0
    # 3 nhóm gộp theo YCHT
    overdue_ycht: int = 0
    on_time_ycht: int = 0
    cancelled: int = 0
    # Tỷ lệ phần trăm (%)
    on_time_rate: float = 0.0
    overdue_rate: float = 0.0
    completion_rate: float = 0.0


class GpmsSenderStat(BaseModel):
    username: str
    full_name: str
    total: int
    percentage: float
    ht_dung_han: int = 0
    ht_tre_han: int = 0
    chua_ht_chua_tre: int = 0
    chua_ht_tre_han: int = 0
    da_huy: int = 0


class GpmsReceiverStat(BaseModel):
    username: str
    full_name: str
    region: str = "BAC"
    total: int
    percentage: float
    # 3 màu chung 1 cột theo yêu cầu
    overdue_ycht: int = 0
    on_time_ycht: int = 0
    cancelled: int = 0
    # Chi tiết 5 tiêu chí SLA
    ht_dung_han: int = 0
    ht_tre_han: int = 0
    chua_ht_chua_tre: int = 0
    chua_ht_tre_han: int = 0
    da_huy: int = 0
    on_time_rate: float = 0.0


class GpmsRegionStat(BaseModel):
    region: str  # "NAM" | "BAC"
    label: str   # "Miền Nam" | "Miền Bắc"
    total: int = 0
    percentage: float = 0.0
    user_count: int = 0
    overdue_ycht: int = 0
    on_time_ycht: int = 0
    cancelled: int = 0
    ht_dung_han: int = 0
    ht_tre_han: int = 0
    chua_ht_chua_tre: int = 0
    chua_ht_tre_han: int = 0
    da_huy: int = 0
    on_time_rate: float = 0.0
    users: List[GpmsReceiverStat] = Field(default_factory=list)


class GpmsRegionComparison(BaseModel):
    nam: GpmsRegionStat
    bac: GpmsRegionStat


class GpmsCategoryStat(BaseModel):
    name: str
    total: int
    percentage: float
    overdue_ycht: int = 0
    on_time_ycht: int = 0
    cancelled: int = 0
    ht_dung_han: int = 0
    ht_tre_han: int = 0
    chua_ht_chua_tre: int = 0
    chua_ht_tre_han: int = 0
    da_huy: int = 0


class GpmsDmcv2ChildStat(BaseModel):
    name: str
    total: int
    percentage: float
    overdue_ycht: int = 0
    on_time_ycht: int = 0
    cancelled: int = 0


class GpmsDmcv1Stat(BaseModel):
    name: str
    total: int
    percentage: float
    overdue_ycht: int = 0
    on_time_ycht: int = 0
    cancelled: int = 0
    ht_dung_han: int = 0
    ht_tre_han: int = 0
    chua_ht_chua_tre: int = 0
    chua_ht_tre_han: int = 0
    da_huy: int = 0
    top_children: List[GpmsDmcv2ChildStat] = Field(default_factory=list)


class GpmsDashboardResponse(BaseModel):
    batch: GpmsBatchItem
    ref_mode: str = "export"
    ref_datetime_iso: str
    anonymous_count: int = 0
    unassigned_dmcv_count: int = 0
    south_usernames: List[str] = Field(default_factory=list)
    sla_summary: GpmsSlaSummary
    senders: List[GpmsSenderStat]
    receivers: List[GpmsReceiverStat]
    regions: GpmsRegionComparison
    phan_loai_list: List[GpmsCategoryStat]
    dmcv1_list: List[GpmsDmcv1Stat]
    dmcv2_list: List[GpmsCategoryStat]


class GpmsTicketDetailItem(BaseModel):
    code: str
    title: str
    status: str
    sla_status: str
    loai: str
    phan_loai: str
    creator: str
    creator_name: str
    creator_dept: str
    assignee: str
    assignee_name: str
    region: str
    dmcv1: str
    dmcv2: str
    priority: str
    created_iso: str
    ycht_iso: str
    httt_iso: str


class GpmsTicketListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[GpmsTicketDetailItem]


class GpmsSouthUserItem(BaseModel):
    username: str
    full_name: str
    source: str = "GPMS"  # "GPMS" | "SYSTEM" | "CONFIG"
    ticket_count: int = 0
    is_south: bool = False


class GpmsRegionConfigResponse(BaseModel):
    south_usernames: List[str]
    candidates: List[GpmsSouthUserItem]
    updated_at: Optional[datetime] = None


class GpmsRegionConfigSavePayload(BaseModel):
    usernames: List[str] = Field(default_factory=list)
    full_names: dict = Field(default_factory=dict)
