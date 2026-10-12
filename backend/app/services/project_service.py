import io
import re
import unicodedata
from datetime import datetime, date, timedelta
from typing import Generator, List, Optional, Tuple, Dict, Any

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import create_engine, select, desc
from sqlalchemy.orm import sessionmaker, Session, joinedload

from app.core.config import settings
from app.models.project import Project, ProjectMember, MemberTask, ProjectActivityLog


# Engine & Session for Project Management DB
_project_engine = None
_ProjectSessionLocal = None


def get_project_engine():
    global _project_engine
    if _project_engine is None:
        _project_engine = create_engine(
            settings.project_sqlalchemy_database_uri,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_recycle=1800,
            echo=False
        )
    return _project_engine


def get_project_session_maker():
    global _ProjectSessionLocal
    if _ProjectSessionLocal is None:
        _ProjectSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=get_project_engine()
        )
    return _ProjectSessionLocal


def get_project_db() -> Generator[Session, None, None]:
    session_maker = get_project_session_maker()
    db = session_maker()
    try:
        yield db
    finally:
        db.close()


# Helpers for code generation
def remove_accents(input_str: str) -> str:
    if not input_str:
        return ""
    nfkd = unicodedata.normalize("NFKD", input_str)
    no_accent = "".join([c for c in nfkd if not unicodedata.combining(c)])
    no_accent = no_accent.replace("đ", "d").replace("Đ", "D")
    return no_accent


def generate_project_code(name: str) -> str:
    cleaned = remove_accents(name).upper()
    slug = re.sub(r"[^A-Z0-9]+", "_", cleaned).strip("_")[:20]
    date_str = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"PRJ_{slug}_{date_str[-6:]}" if slug else f"PRJ_{date_str}"


def generate_member_code(name: str, project_id: int) -> str:
    cleaned = remove_accents(name).upper()
    parts = cleaned.split()
    short_name = parts[-1] if parts else "MEM"
    slug = re.sub(r"[^A-Z0-9]+", "", short_name)[:10]
    ts = datetime.now().strftime("%m%d%H%M")
    return f"{slug}_{project_id}_{ts[-4:]}"


def parse_date_flexibly(value: Any) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)):
        try:
            return (datetime(1899, 12, 30) + timedelta(days=float(value))).date()
        except Exception:
            return None

    s = str(value).strip()
    if not s or s.lower() in ("none", "null", "-", ""):
        return None

    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


# Business logic
def toggle_task(db: Session, task_id: int, done: bool, username: str) -> Tuple[MemberTask, ProjectMember, Project]:
    task = db.get(MemberTask, task_id)
    if not task:
        raise ValueError("Không tìm thấy công việc (Task ID: " + str(task_id) + ")")

    member = db.get(ProjectMember, task.MemberID)
    if not member:
        raise ValueError("Không tìm thấy thành viên phụ trách")

    project = db.get(Project, member.ProjectID)
    if not project:
        raise ValueError("Không tìm thấy dự án tương ứng")

    now = datetime.now()

    # 1. Update task
    task.Done = done
    task.CompletedAt = now if done else None
    task.LastChangedBy = username
    task.LastChangedAt = now

    # Log task action
    if done:
        msg = f'{username} đánh dấu HOÀN THÀNH công việc "{task.TaskName}" (thành viên {member.MemberName}, dự án {project.ProjectName}).'
        action_type = "TASK_CHECKED"
    else:
        msg = f'{username} BỎ CHECK công việc "{task.TaskName}" (thành viên {member.MemberName}, dự án {project.ProjectName}).'
        action_type = "TASK_UNCHECKED"

    log_entry = ProjectActivityLog(
        ProjectID=project.ProjectID,
        MemberID=member.MemberID,
        TaskID=task.TaskID,
        ActionTime=now,
        ActionBy=username,
        ActionType=action_type,
        Message=msg
    )
    db.add(log_entry)

    # 2. Check all tasks for member
    all_member_tasks = db.query(MemberTask).filter(MemberTask.MemberID == member.MemberID).all()
    all_member_done = len(all_member_tasks) > 0 and all(t.Done for t in all_member_tasks)

    if all_member_done and not member.CompletedAt:
        member.CompletedAt = now
        db.add(ProjectActivityLog(
            ProjectID=project.ProjectID,
            MemberID=member.MemberID,
            TaskID=None,
            ActionTime=now,
            ActionBy=username,
            ActionType="MEMBER_DONE",
            Message=f'Thành viên "{member.MemberName}" đã hoàn thành TẤT CẢ công việc.'
        ))
    elif not all_member_done and member.CompletedAt:
        member.CompletedAt = None
        db.add(ProjectActivityLog(
            ProjectID=project.ProjectID,
            MemberID=member.MemberID,
            TaskID=None,
            ActionTime=now,
            ActionBy=username,
            ActionType="MEMBER_UNDONE",
            Message=f'Thành viên "{member.MemberName}" KHÔNG còn ở trạng thái hoàn thành tất cả công việc.'
        ))

    # 3. Check all tasks for project
    all_project_tasks = db.query(MemberTask).join(ProjectMember).filter(ProjectMember.ProjectID == project.ProjectID).all()
    all_proj_done = len(all_project_tasks) > 0 and all(t.Done for t in all_project_tasks)

    new_status = "completed" if all_proj_done else "in-progress"
    if new_status != project.Status:
        project.Status = new_status
        if new_status == "completed":
            db.add(ProjectActivityLog(
                ProjectID=project.ProjectID,
                MemberID=None,
                TaskID=None,
                ActionTime=now,
                ActionBy=username,
                ActionType="PROJECT_DONE",
                Message=f'Dự án "{project.ProjectName}" đã HOÀN THÀNH (tất cả công việc của các thành viên đã xong).'
            ))
        else:
            db.add(ProjectActivityLog(
                ProjectID=project.ProjectID,
                MemberID=None,
                TaskID=None,
                ActionTime=now,
                ActionBy=username,
                ActionType="PROJECT_UNDONE",
                Message=f'Dự án "{project.ProjectName}" chuyển về trạng thái ĐANG TRIỂN KHAI (còn công việc chưa hoàn thành).'
            ))

    db.commit()
    db.refresh(task)
    db.refresh(member)
    db.refresh(project)
    return task, member, project


def bulk_toggle_tasks(
    db: Session,
    task_ids: List[int],
    done: bool,
    username: str
) -> Dict[str, Any]:
    if not task_ids:
        return {"success": True, "count": 0, "message": "Không có công việc nào được chọn"}

    now = datetime.now()
    affected_member_ids = set()
    affected_project_ids = set()
    updated_count = 0

    tasks = db.query(MemberTask).filter(MemberTask.TaskID.in_(task_ids)).all()
    for task in tasks:
        if task.Done != done:
            task.Done = done
            task.CompletedAt = now if done else None
            task.LastChangedBy = username
            task.LastChangedAt = now
            affected_member_ids.add(task.MemberID)
            updated_count += 1

    # Cập nhật trạng thái hoàn thành thành viên
    for member_id in affected_member_ids:
        member = db.get(ProjectMember, member_id)
        if not member:
            continue
        affected_project_ids.add(member.ProjectID)
        m_tasks = db.query(MemberTask).filter(MemberTask.MemberID == member_id).all()
        all_done = len(m_tasks) > 0 and all(t.Done for t in m_tasks)
        if all_done and not member.CompletedAt:
            member.CompletedAt = now
        elif not all_done and member.CompletedAt:
            member.CompletedAt = None

    # Cập nhật trạng thái dự án
    for project_id in affected_project_ids:
        project = db.get(Project, project_id)
        if not project:
            continue
        p_tasks = db.query(MemberTask).join(ProjectMember).filter(ProjectMember.ProjectID == project_id).all()
        all_proj_done = len(p_tasks) > 0 and all(t.Done for t in p_tasks)
        new_status = "completed" if all_proj_done else "in-progress"
        if new_status != project.Status:
            project.Status = new_status
            log_type = "PROJECT_DONE" if new_status == "completed" else "PROJECT_UNDONE"
            msg = f'Dự án "{project.ProjectName}" đã HOÀN THÀNH (tất cả công việc đã xong).' if new_status == "completed" else f'Dự án "{project.ProjectName}" chuyển về ĐANG TRIỂN KHAI.'
            db.add(ProjectActivityLog(
                ProjectID=project.ProjectID,
                ActionTime=now,
                ActionBy=username,
                ActionType=log_type,
                Message=msg
            ))

    action_label = "HOÀN THÀNH" if done else "BỎ HOÀN THÀNH"
    if updated_count > 0:
        db.add(ProjectActivityLog(
            ProjectID=list(affected_project_ids)[0] if affected_project_ids else None,
            ActionTime=now,
            ActionBy=username,
            ActionType="BULK_TASK_TOGGLED",
            Message=f'{username} đã đánh dấu {action_label} hàng loạt {updated_count} công việc.'
        ))

    db.commit()
    return {
        "success": True,
        "count": updated_count,
        "message": f"Đã đánh dấu {action_label.lower()} thành công {updated_count} công việc!"
    }


def toggle_all_member_tasks(
    db: Session,
    member_id: int,
    done: bool,
    username: str
) -> Dict[str, Any]:
    member = db.get(ProjectMember, member_id)
    if not member:
        raise ValueError("Không tìm thấy thành viên phụ trách")
    task_ids = [t.TaskID for t in db.query(MemberTask.TaskID).filter(MemberTask.MemberID == member_id).all()]
    return bulk_toggle_tasks(db, task_ids, done, username)


def toggle_all_project_tasks(
    db: Session,
    project_id: int,
    done: bool,
    username: str
) -> Dict[str, Any]:
    project = db.get(Project, project_id)
    if not project:
        raise ValueError("Không tìm thấy dự án")
    task_ids = [
        t.TaskID for t in db.query(MemberTask.TaskID)
        .join(ProjectMember)
        .filter(ProjectMember.ProjectID == project_id)
        .all()
    ]
    return bulk_toggle_tasks(db, task_ids, done, username)


def review_task(
    db: Session,
    task_id: int,
    review_status: Optional[str],
    review_note: Optional[str],
    username: str
) -> MemberTask:
    task = db.get(MemberTask, task_id)
    if not task:
        raise ValueError("Không tìm thấy công việc")

    member = db.get(ProjectMember, task.MemberID)
    project = db.get(Project, member.ProjectID) if member else None
    proj_id = project.ProjectID if project else (member.ProjectID if member else 0)
    proj_name = project.ProjectName if project else ""

    norm_status = review_status.lower().strip() if review_status else None
    if norm_status and norm_status not in ["ok", "fail"]:
        norm_status = None

    if norm_status == "fail" and not (review_note and review_note.strip()):
        raise ValueError("Vui lòng nhập lý do đánh giá không đạt (Fail)!")

    now = datetime.now()
    task.ReviewStatus = norm_status
    task.ReviewNote = review_note.strip() if (review_note and norm_status) else None
    task.ReviewedBy = username if norm_status else None
    task.ReviewedAt = now if norm_status else None

    # Activity log
    if norm_status == "ok":
        msg = f'{username} đánh giá ĐẠT (OK) công việc "{task.TaskName}" (dự án: {proj_name}).'
        action_type = "TASK_REVIEW_OK"
    elif norm_status == "fail":
        note_text = f" - Ghi chú: {task.ReviewNote}" if task.ReviewNote else ""
        msg = f'{username} đánh giá KHÔNG ĐẠT (FAIL) công việc "{task.TaskName}" (dự án: {proj_name}){note_text}.'
        action_type = "TASK_REVIEW_FAIL"
    else:
        msg = f'{username} HỦY ĐÁNH GIÁ công việc "{task.TaskName}" (dự án: {proj_name}).'
        action_type = "TASK_REVIEW_RESET"

    db.add(ProjectActivityLog(
        ProjectID=proj_id,
        MemberID=member.MemberID if member else None,
        TaskID=task.TaskID,
        ActionTime=now,
        ActionBy=username,
        ActionType=action_type,
        Message=msg
    ))

    db.commit()
    db.refresh(task)
    return task


def get_activity_logs(
    db: Session,
    limit: int = 200,
    project_id: Optional[int] = None,
    action_by: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    query = (
        db.query(ProjectActivityLog, Project.ProjectName, ProjectMember.MemberName)
        .join(Project, ProjectActivityLog.ProjectID == Project.ProjectID)
        .outerjoin(ProjectMember, ProjectActivityLog.MemberID == ProjectMember.MemberID)
    )

    if project_id:
        query = query.filter(ProjectActivityLog.ProjectID == project_id)
    if start_date:
        query = query.filter(ProjectActivityLog.ActionTime >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(ProjectActivityLog.ActionTime <= datetime.combine(end_date, datetime.max.time()))

    query = query.order_by(desc(ProjectActivityLog.ActionTime), desc(ProjectActivityLog.LogID))

    # If action_by is specified, we fetch up to 1000 candidates and filter in Python
    # with accent-insensitivity across ActionBy, MemberName, and Message
    clean_actor = remove_accents(action_by).lower().strip() if action_by else None

    if clean_actor:
        fetch_limit = min(limit * 5, 2000)
        raw_results = query.limit(fetch_limit).all()
        matched = []
        for log, p_name, m_name in raw_results:
            text_to_check = f"{log.ActionBy or ''} {m_name or ''} {log.Message or ''}"
            if clean_actor in remove_accents(text_to_check).lower():
                matched.append((log, p_name))
                if len(matched) >= limit:
                    break
        results = matched
    else:
        results = [(log, p_name) for log, p_name, _ in query.limit(limit).all()]

    logs = []
    for log, p_name in results:
        logs.append({
            "LogID": log.LogID,
            "ProjectID": log.ProjectID,
            "ProjectName": p_name,
            "MemberID": log.MemberID,
            "TaskID": log.TaskID,
            "ActionTime": log.ActionTime,
            "ActionBy": log.ActionBy,
            "ActionType": log.ActionType,
            "Message": log.Message,
        })
    return logs


# Smart & Easy Excel Import
def import_projects_from_excel_file(db: Session, file_contents: bytes) -> Dict[str, Any]:
    wb = openpyxl.load_workbook(filename=io.BytesIO(file_contents), data_only=True)
    ws = wb.active

    header_row_idx = None
    col_mapping = {}

    for r_idx, row in enumerate(ws.iter_rows(values_only=True)):
        if r_idx > 10:
            break
        row_str_cells = [str(c).strip().lower() if c is not None else "" for c in row]
        row_norm_cells = [remove_accents(c) for c in row_str_cells]

        found_keys = {}
        for c_idx, cell in enumerate(row_norm_cells):
            if any(k in cell for k in ("ten du an", "du an", "project name", "project")) and "code" not in cell and "ma" not in cell:
                found_keys["project_name"] = c_idx
            elif any(k in cell for k in ("deadline", "han chot", "ngay ket thuc", "han hoan thanh")):
                found_keys["deadline"] = c_idx
            elif any(k in cell for k in ("thanh vien", "member name", "member", "nguoi phu trach", "nhan su")) and "code" not in cell and "ma" not in cell:
                found_keys["member_name"] = c_idx
            elif any(k in cell for k in ("cong viec", "task name", "task", "noi dung")):
                found_keys["task_name"] = c_idx
            elif any(k in cell for k in ("ma du an", "project code", "projectcode")):
                found_keys["project_code"] = c_idx
            elif any(k in cell for k in ("ma thanh vien", "member code", "membercode")):
                found_keys["member_code"] = c_idx

        if "project_name" in found_keys or "task_name" in found_keys:
            header_row_idx = r_idx + 1
            col_mapping = found_keys
            break

    if not header_row_idx:
        header_row_idx = 1
        col_mapping = {
            "project_name": 0,
            "deadline": 1,
            "member_name": 2,
            "task_name": 3
        }

    inserted_projects = 0
    inserted_members = 0
    inserted_tasks = 0
    errors = []

    project_cache: Dict[str, Project] = {}
    member_cache: Dict[Tuple[int, str], ProjectMember] = {}

    prev_project_name = None
    prev_deadline = None
    prev_member_name = None

    rows = list(ws.iter_rows(min_row=header_row_idx + 1, values_only=True))

    for row_num, row in enumerate(rows, start=header_row_idx + 1):
        if not row or all(c is None or str(c).strip() == "" for c in row):
            continue

        def get_val(key):
            idx = col_mapping.get(key)
            if idx is not None and idx < len(row):
                v = row[idx]
                return str(v).strip() if v is not None else ""
            return ""

        raw_p_name = get_val("project_name")
        raw_deadline = get_val("deadline")
        raw_m_name = get_val("member_name")
        raw_task_name = get_val("task_name")
        raw_p_code = get_val("project_code")
        raw_m_code = get_val("member_code")

        # Auto forward-fill for merged/blank cells
        if raw_p_name:
            current_project_name = raw_p_name
            prev_project_name = raw_p_name
        else:
            current_project_name = prev_project_name

        if raw_deadline:
            current_deadline = parse_date_flexibly(raw_deadline)
            prev_deadline = current_deadline
        else:
            current_deadline = prev_deadline

        if raw_m_name:
            current_member_name = raw_m_name
            prev_member_name = raw_m_name
        else:
            current_member_name = prev_member_name

        current_task_name = raw_task_name

        if not current_project_name:
            continue

        # 1. Match or Create Project
        p_norm_key = remove_accents(current_project_name).lower()
        project = project_cache.get(p_norm_key)

        if not project:
            db_proj = db.query(Project).filter(Project.ProjectName == current_project_name).first()
            if not db_proj and raw_p_code:
                db_proj = db.query(Project).filter(Project.ProjectCode == raw_p_code).first()

            if db_proj:
                project = db_proj
                if current_deadline and not project.Deadline:
                    project.Deadline = current_deadline
            else:
                project_code = raw_p_code if raw_p_code else generate_project_code(current_project_name)
                project = Project(
                    ProjectName=current_project_name,
                    Status="in-progress",
                    Deadline=current_deadline,
                    ProjectCode=project_code
                )
                db.add(project)
                db.flush()
                inserted_projects += 1

            project_cache[p_norm_key] = project

        # 2. Match or Create Member
        if not current_member_name:
            current_member_name = "Thành viên chung"

        m_norm_key = (project.ProjectID, remove_accents(current_member_name).lower())
        member = member_cache.get(m_norm_key)

        if not member:
            db_mem = db.query(ProjectMember).filter(
                ProjectMember.ProjectID == project.ProjectID,
                ProjectMember.MemberName == current_member_name
            ).first()

            if db_mem:
                member = db_mem
            else:
                member_code = raw_m_code if raw_m_code else generate_member_code(current_member_name, project.ProjectID)
                member = ProjectMember(
                    ProjectID=project.ProjectID,
                    MemberName=current_member_name,
                    MemberCode=member_code,
                    CompletedAt=None
                )
                db.add(member)
                db.flush()
                inserted_members += 1

            member_cache[m_norm_key] = member

        # 3. Create Task
        if current_task_name:
            dup_task = db.query(MemberTask).filter(
                MemberTask.MemberID == member.MemberID,
                MemberTask.TaskName == current_task_name
            ).first()

            if not dup_task:
                task = MemberTask(
                    MemberID=member.MemberID,
                    TaskName=current_task_name,
                    Done=False,
                    CompletedAt=None,
                    LastChangedBy=None,
                    LastChangedAt=None
                )
                db.add(task)
                inserted_tasks += 1

    db.commit()

    return {
        "success": True,
        "projects_count": inserted_projects,
        "members_count": inserted_members,
        "tasks_count": inserted_tasks,
        "message": f"Import thành công: {inserted_projects} dự án mới, {inserted_members} thành viên mới, {inserted_tasks} công việc mới!",
        "errors": errors
    }


# Export Excel
def export_projects_to_excel(
    db: Session,
    project_id: Optional[int] = None,
    project_ids: Optional[List[int]] = None
) -> io.BytesIO:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Danh Sách Dự Án"

    headers = [
        "Tên dự án",
        "Trạng thái dự án",
        "Hạn chót (Deadline)",
        "Thành viên đảm nhiệm",
        "Thời gian hoàn thành (Thành viên)",
        "Nội dung công việc (Task)",
        "Trạng thái công việc",
        "Thời gian hoàn thành (Task)",
        "Người thực hiện cuối",
        "Đánh giá (Admin)",
        "Ghi chú đánh giá",
        "Người đánh giá",
        "Thời gian đánh giá"
    ]

    header_font = Font(name="Calibri", size=11, bold=True, color="000000")
    header_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    border_thin = Border(
        left=Side(style="thin", color="CCCCCC"),
        right=Side(style="thin", color="CCCCCC"),
        top=Side(style="thin", color="CCCCCC"),
        bottom=Side(style="thin", color="CCCCCC")
    )

    ws.append(headers)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border_thin

    ws.row_dimensions[1].height = 28

    query = (
        db.query(Project)
        .options(joinedload(Project.members).joinedload(ProjectMember.tasks))
    )
    if project_ids and len(project_ids) > 0:
        query = query.filter(Project.ProjectID.in_(project_ids))
    elif project_id:
        query = query.filter(Project.ProjectID == project_id)

    projects = query.order_by(Project.ProjectID.desc()).all()

    current_row = 2
    for p in projects:
        p_status = "Đã hoàn thành" if p.Status == "completed" else "Đang thực hiện"
        p_deadline = p.Deadline.strftime("%d/%m/%Y") if p.Deadline else ""

        if not p.members:
            ws.append([p.ProjectName, p_status, p_deadline, "", "", "", "", "", "", "", "", "", ""])
            current_row += 1
            continue

        for m in p.members:
            m_comp = m.CompletedAt.strftime("%d/%m/%Y %H:%M") if m.CompletedAt else ""
            if not m.tasks:
                ws.append([p.ProjectName, p_status, p_deadline, m.MemberName, m_comp, "", "", "", "", "", "", "", ""])
                current_row += 1
                continue

            for t in m.tasks:
                t_status = "Hoàn thành" if t.Done else "Chưa hoàn thành"
                t_comp = t.CompletedAt.strftime("%d/%m/%Y %H:%M") if t.CompletedAt else ""
                if t.ReviewStatus == "fail":
                    t_review = "Không đạt (Fail)"
                elif t.ReviewStatus == "ok":
                    t_review = "Đạt (OK)"
                elif t.Done:
                    t_review = "Hoàn thành thành công"
                else:
                    t_review = "Chưa hoàn thành"
                t_reviewed_at = t.ReviewedAt.strftime("%d/%m/%Y %H:%M") if t.ReviewedAt else ""
                ws.append([
                    p.ProjectName,
                    p_status,
                    p_deadline,
                    m.MemberName,
                    m_comp,
                    t.TaskName,
                    t_status,
                    t_comp,
                    t.LastChangedBy or "",
                    t_review,
                    t.ReviewNote or "",
                    t.ReviewedBy or "",
                    t_reviewed_at
                ])
                current_row += 1

    for row in ws.iter_rows(min_row=2, max_row=max(current_row - 1, 2), min_col=1, max_col=len(headers)):
        for cell in row:
            cell.border = border_thin
            cell.alignment = Alignment(vertical="center")

    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col_letter].width = min(max(max_len + 4, 14), 45)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


# Sample Excel Template
def generate_sample_excel_template() -> io.BytesIO:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Mau_Import_Du_An"

    headers = ["Tên dự án", "Deadline", "Thành viên", "Tên công việc"]
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2F5597", end_color="2F5597", fill_type="solid")
    border_thin = Border(
        left=Side(style="thin", color="CCCCCC"),
        right=Side(style="thin", color="CCCCCC"),
        top=Side(style="thin", color="CCCCCC"),
        bottom=Side(style="thin", color="CCCCCC")
    )

    ws.append(headers)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_thin
    ws.row_dimensions[1].height = 25

    sample_rows = [
        ["Triển khai KDS Đợt 4", "30/10/2026", "Nguyễn Văn A", "Cấu hình KDS tại Nhà hàng Manwah Gò Vấp"],
        ["Triển khai KDS Đợt 4", "30/10/2026", "Nguyễn Văn A", "Kiểm tra in bill và test order trên tablet"],
        ["Triển khai KDS Đợt 4", "30/10/2026", "Trần Thị B", "Cài đặt màn hình bếp Kichi Vincom Thủ Đức"],
        ["Triển khai KDS Đợt 4", "30/10/2026", "Trần Thị B", "Bàn giao cho Quản lý nhà hàng và hướng dẫn sử dụng"],
        ["Nâng cấp POS 2026", "15/11/2026", "Lê Hoàng C", "Backup database cũ và update bản vá mới"],
        ["Nâng cấp POS 2026", "15/11/2026", "Lê Hoàng C", "Chạy thử nghiệm giao dịch thanh toán MoMo, VNPay"]
    ]

    for r_data in sample_rows:
        ws.append(r_data)

    for row in ws.iter_rows(min_row=2, max_row=len(sample_rows) + 1, min_col=1, max_col=len(headers)):
        for cell in row:
            cell.border = border_thin
            cell.alignment = Alignment(vertical="center")

    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col_letter].width = min(max(max_len + 4, 15), 50)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
