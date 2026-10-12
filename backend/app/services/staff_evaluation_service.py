import io
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models.staff_evaluation import StaffEvaluationConfig
from app.models.user import User
from app.models.memo import Memo
from app.models.pim import PIMRequest
from app.models.setup_restaurant import ListSetupNhNew
from app.models.violation import Violation
from app.models.project import Project, ProjectMember, MemberTask
from app.schemas.staff_evaluation import (
    StaffConfigItem,
    EvaluationCriteriaDetail,
    StaffEvaluationSummary,
    MonthTeamEvaluation,
    EvaluationReportResponse,
)


def get_evaluated_staff_configs(db: Session) -> List[StaffConfigItem]:
    configs = db.scalars(
        select(StaffEvaluationConfig)
        .where(StaffEvaluationConfig.CONFIG_KEY == "EVALUATED_STAFF")
        .order_by(StaffEvaluationConfig.SORT_ORDER, StaffEvaluationConfig.id)
    ).all()
    return [
        StaffConfigItem(
            id=c.id,
            username=c.USERNAME,
            full_name=c.FULL_NAME,
            is_active=c.IS_ACTIVE or False,
            sort_order=c.SORT_ORDER or 0,
        )
        for c in configs
    ]


def get_staff_candidates(db: Session) -> List[StaffConfigItem]:
    """Lấy danh sách tất cả nhân viên ứng viên Team App từ dbo.LIST_USER để chọn vào nhóm đánh giá."""
    configs = db.scalars(
        select(StaffEvaluationConfig)
        .where(StaffEvaluationConfig.CONFIG_KEY == "EVALUATED_STAFF")
    ).all()
    configured_users = {c.USERNAME: c for c in configs}

    users = db.scalars(
        select(User)
        .where(
            or_(
                func.lower(func.trim(User.phanquyen)).in_(["2", "app"]),
                User.phanquyen.like("%2%"),
                User.phanquyen.like("%app%"),
                User.user_name1.in_(configured_users.keys()) if configured_users else False,
            ),
            User.user_name1 != "test",
            or_(User.active == True, User.active == None),
        )
        .order_by(User.id)
    ).all()

    seen = set()
    result = []
    for u in users:
        u_name = (u.user_name1 or "").strip()
        if not u_name or u_name in seen:
            continue
        seen.add(u_name)
        cfg = configured_users.get(u_name)
        result.append(
            StaffConfigItem(
                id=cfg.id if cfg else u.id,
                username=u_name,
                full_name=(u.full_name or u_name).strip(),
                is_active=True if cfg else False,
                sort_order=cfg.SORT_ORDER if cfg else 99,
            )
        )
    return result


def save_evaluated_staff_configs(db: Session, usernames: List[str], current_username: str) -> List[StaffConfigItem]:
    # Clear old configs
    db.query(StaffEvaluationConfig).filter(StaffEvaluationConfig.CONFIG_KEY == "EVALUATED_STAFF").delete()
    
    users = db.scalars(select(User).where(User.user_name1.in_(usernames))).all()
    user_map = {u.user_name1: u.full_name for u in users}

    new_items = []
    for idx, u_name in enumerate(usernames, 1):
        item = StaffEvaluationConfig(
            CONFIG_KEY="EVALUATED_STAFF",
            USERNAME=u_name,
            FULL_NAME=user_map.get(u_name, u_name),
            IS_ACTIVE=True,
            SORT_ORDER=idx,
            UPDATED_BY=current_username,
            UPDATED_AT=datetime.now(),
        )
        db.add(item)
        new_items.append(item)
    db.commit()
    return get_evaluated_staff_configs(db)


def _get_month_date_range(year: int, month: int) -> Tuple[datetime, datetime]:
    start_date = datetime(year, month, 1, 0, 0, 0)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, 0, 0, 0) - timedelta(microseconds=1)
    else:
        end_date = datetime(year, month + 1, 1, 0, 0, 0) - timedelta(microseconds=1)
    return start_date, end_date


def calculate_staff_metrics_for_month(
    db: Session,
    year: int,
    month: int,
    staff_list: List[Dict[str, str]]
) -> MonthTeamEvaluation:
    start_dt, end_dt = _get_month_date_range(year, month)
    label = f"Tháng {month:02d}/{year}"

    staff_summaries: List[StaffEvaluationSummary] = []
    team_total = 0
    team_correct = 0
    team_wrong = 0
    team_late = 0

    now = datetime.now()

    for s in staff_list:
        uname = s["username"].strip().lower()
        fname = s.get("full_name") or uname

        detail = EvaluationCriteriaDetail()

        # -------------------------------------------------------------
        # 1. MEMO: Quá 5 ngày tính từ ngày insert chưa đóng HOẶC bị đánh giá fail -> 1 lỗi
        # -------------------------------------------------------------
        memos = db.scalars(
            select(Memo).where(
                Memo.active == True,
                or_(
                    func.lower(Memo.it_setup) == uname,
                    func.lower(Memo.it_setup) == fname.lower()
                ),
                or_(
                    and_(Memo.ngay_tiepnhan >= start_dt, Memo.ngay_tiepnhan <= end_dt),
                    and_(Memo.ngay_insert >= start_dt, Memo.ngay_insert <= end_dt)
                )
            )
        ).all()

        for m in memos:
            rev = (m.ReviewStatus or "").strip().lower()
            ins_dt = m.ngay_insert or m.ngay_tiepnhan or start_dt
            
            is_closed = (str(m.trangthai) == "2")
            comp_dt = None
            if m.hoanthanh and not str(m.hoanthanh).startswith("9999"):
                try:
                    comp_dt = datetime.strptime(str(m.hoanthanh).strip()[:19], "%Y-%m-%d %H:%M:%S")
                except Exception:
                    comp_dt = None

            is_fail = (rev == "fail")
            if not is_fail:
                # Tiêu chuẩn: hoàn thành trong 5 ngày tính từ ngày insert; ngoài 4 ngày chưa đóng tính 1 lỗi
                if is_closed and comp_dt:
                    if (comp_dt - ins_dt).days > 4:
                        is_fail = True
                else:
                    # Chưa đóng
                    ref_dt = min(now, end_dt)
                    if (ref_dt - ins_dt).days > 4:
                        is_fail = True

            if is_fail:
                detail.memo_fail += 1
            else:
                detail.memo_ok += 1

        # -------------------------------------------------------------
        # 2. PIM: Quá hạn ngoài 4 ngày tính từ ngày insert chưa đóng -> 1 lỗi
        # -------------------------------------------------------------
        pims = db.scalars(
            select(PIMRequest).where(
                or_(
                    func.lower(PIMRequest.user_thuc_hien) == uname,
                    func.lower(PIMRequest.user_thuc_hien) == fname.lower()
                ),
                PIMRequest.ngay_insert >= start_dt,
                PIMRequest.ngay_insert <= end_dt
            )
        ).all()

        for p in pims:
            ins_dt = p.ngay_insert or start_dt
            is_closed = (
                (p.trang_thai_thuc_hien or "").strip().lower() == "hoàn thành" and
                (p.so or "").strip().lower() == "hoàn thành"
            )
            comp_dt = p.thoi_gian_hoan_thanh

            is_late = False
            # Tiêu chuẩn: hoàn thành 3 ngày; ngoài 4 ngày chưa đóng tính 1 lỗi
            if is_closed and comp_dt:
                if (comp_dt - ins_dt).days > 4:
                    is_late = True
            else:
                ref_dt = min(now, end_dt)
                if (ref_dt - ins_dt).days > 4:
                    is_late = True

            if is_late:
                detail.pim_fail += 1
            else:
                detail.pim_ok += 1

        # -------------------------------------------------------------
        # 3. Setup nhà hàng mới: Checklist bị đánh giá fail -> 1 lỗi
        # -------------------------------------------------------------
        setups = db.scalars(
            select(ListSetupNhNew).where(
                ListSetupNhNew.ACTIVE == True,
                or_(
                    func.lower(ListSetupNhNew.IT_PHUTRACH) == uname,
                    func.lower(ListSetupNhNew.IT_PHUTRACH) == fname.lower()
                ),
                or_(
                    and_(ListSetupNhNew.NGAY_INSERT >= start_dt, ListSetupNhNew.NGAY_INSERT <= end_dt),
                    and_(ListSetupNhNew.NGAY_DUKIEN_KHAITRUONG >= start_dt, ListSetupNhNew.NGAY_DUKIEN_KHAITRUONG <= end_dt)
                )
            )
        ).all()

        for st in setups:
            rev = (st.ReviewStatus or "").strip().lower()
            if rev == "fail":
                detail.setup_fail += 1
            else:
                detail.setup_ok += 1

        # -------------------------------------------------------------
        # 4. Lỗi liên quan: Miss mail, xử lý trễ, làm sai việc -> 1 lỗi/lần
        # -------------------------------------------------------------
        viols = db.scalars(
            select(Violation).where(
                Violation.ACTIVE == True,
                or_(
                    func.lower(Violation.NGUOI_SAIPHAMM) == uname,
                    func.lower(Violation.HO_TEN) == fname.lower()
                ),
                Violation.DATE_SAIPHAM >= start_dt,
                Violation.DATE_SAIPHAM <= end_dt
            )
        ).all()
        detail.violation_count = len(viols)

        # -------------------------------------------------------------
        # 5. Dự án: Hoàn thành trễ deadline -> 1 lỗi
        # -------------------------------------------------------------
        try:
            from app.services.project_service import get_project_session_maker
            ProjSession = get_project_session_maker()
            with ProjSession() as proj_db:
                members = proj_db.scalars(
                    select(ProjectMember).join(Project).where(
                        or_(
                            func.lower(ProjectMember.MemberCode) == uname,
                            func.lower(ProjectMember.MemberName) == uname,
                            func.lower(ProjectMember.MemberName) == fname.lower()
                        ),
                        Project.Deadline.isnot(None),
                        Project.Deadline >= start_dt.date(),
                        Project.Deadline <= end_dt.date()
                    )
                ).all()

                for m in members:
                    proj = m.project
                    if not proj or not proj.Deadline:
                        continue
                    dline = proj.Deadline
                    m_comp = m.CompletedAt.date() if m.CompletedAt else None
                    
                    is_proj_late = False
                    if m_comp:
                        if m_comp > dline:
                            is_proj_late = True
                    else:
                        ref_date = min(now.date(), end_dt.date())
                        if ref_date > dline:
                            is_proj_late = True

                    if is_proj_late:
                        detail.project_late += 1
                    else:
                        detail.project_ok += 1
        except Exception:
            pass


        # Tổng hợp
        # Đúng = Memo Đạt + PIM Đạt + Setup Đạt + Dự án Đạt
        correct = detail.memo_ok + detail.pim_ok + detail.setup_ok + detail.project_ok
        # Sai = Memo Không đạt + Setup Không đạt + Sai phạm ghi nhận
        wrong = detail.memo_fail + detail.setup_fail + detail.violation_count
        # Trễ = PIM Quá hạn + Dự án Trễ hạn
        late = detail.pim_fail + detail.project_late
        total = correct + wrong + late

        c_rate = round((correct / total * 100), 1) if total > 0 else 100.0
        w_rate = round((wrong / total * 100), 1) if total > 0 else 0.0
        l_rate = round((late / total * 100), 1) if total > 0 else 0.0

        staff_summaries.append(
            StaffEvaluationSummary(
                username=uname,
                full_name=fname,
                total_tasks=total,
                correct_tasks=correct,
                wrong_tasks=wrong,
                late_tasks=late,
                correct_rate=c_rate,
                wrong_rate=w_rate,
                late_rate=l_rate,
                details=detail
            )
        )

        team_total += total
        team_correct += correct
        team_wrong += wrong
        team_late += late

    team_c_rate = round((team_correct / team_total * 100), 1) if team_total > 0 else 100.0
    team_w_rate = round((team_wrong / team_total * 100), 1) if team_total > 0 else 0.0
    team_l_rate = round((team_late / team_total * 100), 1) if team_total > 0 else 0.0

    return MonthTeamEvaluation(
        month=month,
        year=year,
        label=label,
        total_tasks=team_total,
        correct_tasks=team_correct,
        wrong_tasks=team_wrong,
        late_tasks=team_late,
        correct_rate=team_c_rate,
        wrong_rate=team_w_rate,
        late_rate=team_l_rate,
        staff_summaries=staff_summaries,
    )


def get_full_evaluation_report(
    db: Session,
    target_year: int,
    target_month: int
) -> EvaluationReportResponse:
    # Lấy danh sách nhân viên cấu hình đánh giá
    configs = db.scalars(
        select(StaffEvaluationConfig)
        .where(StaffEvaluationConfig.CONFIG_KEY == "EVALUATED_STAFF", StaffEvaluationConfig.IS_ACTIVE == True)
        .order_by(StaffEvaluationConfig.SORT_ORDER)
    ).all()

    evaluated_staff = [
        {"username": c.USERNAME, "full_name": c.FULL_NAME or c.USERNAME}
        for c in configs
    ]

    # Tính toán tháng đích (M)
    curr_eval = calculate_staff_metrics_for_month(db, target_year, target_month, evaluated_staff)

    # Tính toán tháng M-1
    m1_month = target_month - 1
    m1_year = target_year
    if m1_month < 1:
        m1_month = 12
        m1_year -= 1
    prev1_eval = calculate_staff_metrics_for_month(db, m1_year, m1_month, evaluated_staff)

    # Tính toán tháng M-2
    m2_month = m1_month - 1
    m2_year = m1_year
    if m2_month < 1:
        m2_month = 12
        m2_year -= 1
    prev2_eval = calculate_staff_metrics_for_month(db, m2_year, m2_month, evaluated_staff)

    return EvaluationReportResponse(
        current_month=curr_eval,
        prev_month_1=prev1_eval,
        prev_month_2=prev2_eval,
        evaluated_staff_list=evaluated_staff,
    )


def export_evaluation_excel(
    db: Session,
    target_year: int,
    target_month: int,
    selected_username: Optional[str] = None
) -> io.BytesIO:
    report = get_full_evaluation_report(db, target_year, target_month)
    curr_data = report.current_month

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Tháng {target_month:02d}-{target_year}"

    # Styles
    title_font = Font(name="Segoe UI", size=16, bold=True, color="1E3A8A")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    bold_font = Font(name="Segoe UI", size=10, bold=True)
    normal_font = Font(name="Segoe UI", size=10)

    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    summary_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # Header title
    ws.merge_cells("A1:K1")
    title_cell = ws["A1"]
    title_cell.value = f"BÁO CÁO ĐÁNH GIÁ NĂNG LỰC NHÂN VIÊN TEAM APP - THÁNG {target_month:02d}/{target_year}"
    title_cell.font = title_font
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 40

    headers = [
        "STT", "Họ & Tên", "Tài khoản",
        "Memo (Đạt/Lỗi)", "PIM (Đạt/Trễ)", "Setup NH (Đạt/Lỗi)",
        "Lỗi Vi Phạm (Lần)", "Dự Án (Đạt/Trễ)",
        "Tổng Việc", "Tỷ Lệ Đúng (%)", "Tỷ Lệ Lỗi/Trễ (%)"
    ]

    ws.append([])
    ws.append(headers)
    ws.row_dimensions[3].height = 28

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    filtered_staff = curr_data.staff_summaries
    if selected_username and selected_username != "ALL":
        filtered_staff = [s for s in filtered_staff if s.username.lower() == selected_username.lower()]

    current_row = 4
    for idx, s in enumerate(filtered_staff, 1):
        d = s.details
        memo_str = f"{d.memo_ok} / {d.memo_fail}"
        pim_str = f"{d.pim_ok} / {d.pim_fail}"
        setup_str = f"{d.setup_ok} / {d.setup_fail}"
        proj_str = f"{d.project_ok} / {d.project_late}"
        err_rate = round(s.wrong_rate + s.late_rate, 1)

        row_vals = [
            idx, s.full_name, s.username,
            memo_str, pim_str, setup_str,
            d.violation_count, proj_str,
            s.total_tasks, f"{s.correct_rate}%", f"{err_rate}%"
        ]
        ws.append(row_vals)
        ws.row_dimensions[current_row].height = 22

        fill_to_use = alt_fill if idx % 2 == 0 else PatternFill(fill_type=None)
        for col_idx in range(1, len(row_vals) + 1):
            c = ws.cell(row=current_row, column=col_idx)
            c.font = normal_font
            c.fill = fill_to_use
            c.border = thin_border
            if col_idx in [1, 4, 5, 6, 7, 8, 9, 10, 11]:
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

        current_row += 1

    # Dòng tổng kết team
    ws.append([
        "TỔNG CỘNG", f"{len(filtered_staff)} Nhân viên", "-",
        f"{sum(s.details.memo_ok for s in filtered_staff)} / {sum(s.details.memo_fail for s in filtered_staff)}",
        f"{sum(s.details.pim_ok for s in filtered_staff)} / {sum(s.details.pim_fail for s in filtered_staff)}",
        f"{sum(s.details.setup_ok for s in filtered_staff)} / {sum(s.details.setup_fail for s in filtered_staff)}",
        sum(s.details.violation_count for s in filtered_staff),
        f"{sum(s.details.project_ok for s in filtered_staff)} / {sum(s.details.project_late for s in filtered_staff)}",
        sum(s.total_tasks for s in filtered_staff),
        f"{curr_data.correct_rate}%",
        f"{round(curr_data.wrong_rate + curr_data.late_rate, 1)}%"
    ])
    ws.row_dimensions[current_row].height = 26
    for col_idx in range(1, len(headers) + 1):
        c = ws.cell(row=current_row, column=col_idx)
        c.font = bold_font
        c.fill = summary_fill
        c.border = thin_border
        c.alignment = Alignment(horizontal="center", vertical="center")

    # Column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf
