import os
import shutil
from typing import Optional, List
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, select, and_, or_, asc

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.schemas.auth import UserInfo
from app.models.user import User
from app.models.project import Project, ProjectMember, MemberTask, ProjectActivityLog
from app.schemas.project import (
    ProjectOut,
    ProjectCreate,
    ProjectUpdate,
    ProjectDescriptionUpdate,
    MemberOut,
    MemberCreate,
    TaskOut,
    TaskCreate,
    TaskToggleRequest,
    BulkTaskToggleRequest,
    ToggleAllRequest,
    TaskReviewRequest,
    ActivityLogOut,
    ProjectImportResult,
    AppPmItem,
    AppPmCreate,
    AppPmUpdate,
    QuickAssignTaskRequest,
    TeamMemberItem,
)


from app.services.project_service import (
    get_project_db,
    toggle_task,
    bulk_toggle_tasks,
    toggle_all_member_tasks,
    toggle_all_project_tasks,
    review_task,
    get_activity_logs,
    generate_project_code,
    generate_member_code,
    import_projects_from_excel_file,
    export_projects_to_excel,
    generate_sample_excel_template,
    remove_accents,
)

from app.services.log_service import LogService

UPLOAD_TASKS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads/tasks"))
os.makedirs(UPLOAD_TASKS_DIR, exist_ok=True)

router = APIRouter(prefix="/projects", tags=["App - Quản Lý Dự Án"])


@router.get("", response_model=List[ProjectOut])
def get_projects(
    status_filter: Optional[str] = Query(None, alias="status", description="in-progress hoặc completed"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm dự án, thành viên hoặc task"),
    db: Session = Depends(get_project_db),
    current_user: UserInfo = Depends(get_current_user)
):
    query = (
        db.query(Project)
        .options(joinedload(Project.members).joinedload(ProjectMember.tasks))
        .order_by(Project.ProjectID.desc())
    )

    projects = query.all()

    # In-memory calculate stats and search filtering
    search_clean = remove_accents(search).lower().strip() if search else None

    result = []
    for p in projects:
        total_tasks = 0
        done_tasks = 0
        matches_search = False

        if search_clean:
            if search_clean in remove_accents(p.ProjectName).lower():
                matches_search = True
            if p.ProjectCode and search_clean in remove_accents(p.ProjectCode).lower():
                matches_search = True

        for m in p.members:
            if search_clean and search_clean in remove_accents(m.MemberName).lower():
                matches_search = True
            for t in m.tasks:
                total_tasks += 1
                if t.Done:
                    done_tasks += 1
                if search_clean and search_clean in remove_accents(t.TaskName).lower():
                    matches_search = True

        if search_clean and not matches_search:
            continue

        # Auto-heal / sync project status if actual task completion contradicts DB Status
        derived_status = p.Status
        if total_tasks > 0 and done_tasks == total_tasks:
            derived_status = "completed"
            if p.Status != "completed":
                p.Status = "completed"
                db.add(p)
                db.commit()
        elif total_tasks > 0 and done_tasks < total_tasks:
            derived_status = "in-progress"
            if p.Status != "in-progress":
                p.Status = "in-progress"
                db.add(p)
                db.commit()

        if status_filter and status_filter in ("in-progress", "completed") and derived_status != status_filter:
            continue

        pct = round((done_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

        p_out = ProjectOut(
            ProjectID=p.ProjectID,
            ProjectName=p.ProjectName,
            Status=derived_status,
            Deadline=p.Deadline,
            ProjectCode=p.ProjectCode,
            Description=p.Description,
            Images=p.Images,
            Files=p.Files,
            DescriptionUpdatedAt=p.DescriptionUpdatedAt,
            DescriptionUpdatedBy=p.DescriptionUpdatedBy,
            members=[MemberOut.model_validate(m) for m in p.members],
            total_tasks=total_tasks,
            done_tasks=done_tasks,
            progress_percent=pct
        )
        result.append(p_out)

    return result


@router.get("/activity-logs", response_model=List[ActivityLogOut])
def get_recent_activity_logs(
    limit: int = Query(200, ge=1, le=500),
    project_id: Optional[int] = Query(None, description="Lọc theo dự án"),
    action_by: Optional[str] = Query(None, description="Lọc theo cá nhân thực hiện"),
    start_date: Optional[date] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    db: Session = Depends(get_project_db),
    current_user: UserInfo = Depends(get_current_user)
):
    return get_activity_logs(
        db,
        limit=limit,
        project_id=project_id,
        action_by=action_by,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/export")
def export_projects_excel(
    project_id: Optional[int] = Query(None, description="Lọc xuất theo ID dự án"),
    project_ids: Optional[str] = Query(None, description="Danh sách ID dự án cách nhau bằng dấu phẩy (VD: 4,23)"),
    db: Session = Depends(get_project_db),
    current_user: UserInfo = Depends(get_current_user)
):
    parsed_ids: Optional[List[int]] = None
    if project_ids:
        try:
            parsed_ids = [int(x.strip()) for x in project_ids.split(",") if x.strip().isdigit()]
        except Exception:
            parsed_ids = None

    excel_stream = export_projects_to_excel(db, project_id=project_id, project_ids=parsed_ids)
    
    if parsed_ids and len(parsed_ids) == 1:
        project_suffix = f"_prj_{parsed_ids[0]}"
    elif parsed_ids and len(parsed_ids) > 1:
        project_suffix = f"_{len(parsed_ids)}_du_an"
    elif project_id:
        project_suffix = f"_prj_{project_id}"
    else:
        project_suffix = ""

    filename = f"danh_sach_du_an{project_suffix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/sample-template")
def download_sample_template(
    current_user: UserInfo = Depends(get_current_user)
):
    template_stream = generate_sample_excel_template()
    return StreamingResponse(
        template_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Mau_Import_Du_An.xlsx"}
    )


@router.post("/import", response_model=ProjectImportResult)
async def import_projects(
    file: UploadFile = File(...),
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File không hợp lệ! Vui lòng tải lên file Excel định dạng .xlsx hoặc .xls"
        )

    contents = await file.read()
    try:
        res = import_projects_from_excel_file(db, contents)
        LogService.record_log(
            db=main_db,
            nhom_quyen="APP",
            man_hinh="QUAN_LY_DU_AN",
            hanh_dong="IMPORT",
            mo_ta=f"Import danh sách dự án từ Excel ({file.filename}): tạo {res.get('created_projects', 0)} dự án, {res.get('created_tasks', 0)} tasks",
            current_user=current_user
        )
        return ProjectImportResult(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi đọc file Excel: {str(e)}"
        )


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    code = payload.ProjectCode if payload.ProjectCode else generate_project_code(payload.ProjectName)
    project = Project(
        ProjectName=payload.ProjectName.strip(),
        Status="in-progress",
        Deadline=payload.Deadline,
        ProjectCode=code,
        Description=payload.Description,
        Images=payload.Images,
        Files=payload.Files,
        DescriptionUpdatedAt=datetime.now() if payload.Description else None,
        DescriptionUpdatedBy=current_user.username if payload.Description else None
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Log creation
    db.add(ProjectActivityLog(
        ProjectID=project.ProjectID,
        MemberID=None,
        TaskID=None,
        ActionTime=datetime.now(),
        ActionBy=current_user.username,
        ActionType="PROJECT_CREATED",
        Message=f'{current_user.username} đã tạo dự án mới: "{project.ProjectName}".'
    ))
    db.commit()

    LogService.record_log(
        db=main_db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="INSERT",
        mo_ta=f'Tạo dự án mới: "{project.ProjectName}" (Mã: {project.ProjectCode})',
        current_user=current_user
    )

    return ProjectOut(
        ProjectID=project.ProjectID,
        ProjectName=project.ProjectName,
        Status=project.Status,
        Deadline=project.Deadline,
        ProjectCode=project.ProjectCode,
        Description=project.Description,
        Images=project.Images,
        Files=project.Files,
        DescriptionUpdatedAt=project.DescriptionUpdatedAt,
        DescriptionUpdatedBy=project.DescriptionUpdatedBy,
        members=[],
        total_tasks=0,
        done_tasks=0,
        progress_percent=0.0
    )


@router.get("/team-members", response_model=List[TeamMemberItem])
def get_team_members(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Lấy danh sách nhân sự hệ thống cho quản lý dự án, ưu tiên Team IT App & Ban Quản trị.
    """
    stmt = (
        select(User.id, User.user_name1, User.full_name, User.phanquyen)
        .where(or_(User.active == True, User.active == None))
        .order_by(asc(User.id))
    )
    rows = db.execute(stmt).all()

    def get_role_info(pq: str):
        p = (pq or "").strip().lower()
        if p == "2" or "app" in p:
            return 1, "Team IT App"
        if p == "1" or "admin" in p:
            return 2, "Ban Quản trị"
        if p == "3" or "helpdesk" in p:
            return 3, "IT Helpdesk"
        if p == "4" or "inventory" in p or "kho" in p:
            return 4, "Kho / Quản lý TS"
        return 5, "Nhân sự khác"

    items = []
    for r in rows:
        uname = (r[1] or "").strip()
        fname = (r[2] or "").strip()
        pq = str(r[3] or "").strip()
        rank, role_name = get_role_info(pq)
        label = f"{fname} ({uname})" if fname and uname else (fname or uname)
        items.append({
            "id": r[0],
            "username": uname,
            "full_name": fname,
            "label": label,
            "role_name": role_name,
            "rank": rank,
        })

    # Sắp xếp ưu tiên: Team IT App (1) -> Ban Quản trị (2) -> Helpdesk / Khác (3..5), sau đó theo tên
    items.sort(key=lambda x: (x["rank"], x["full_name"]))

    return [
        TeamMemberItem(
            id=x["id"],
            username=x["username"],
            full_name=x["full_name"],
            label=x["label"],
            role_name=x["role_name"]
        )
        for x in items
    ]



@router.post("/upload-attachment")
async def upload_task_attachment(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Tải lên file đính kèm cho công việc (Task).
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_name = file.filename or "attachment"
    safe_name = f"{timestamp}_{original_name.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_TASKS_DIR, safe_name)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_url = f"/uploads/tasks/{safe_name}"
    return {
        "file_url": file_url,
        "file_name": original_name,
        "saved_name": safe_name
    }


@router.post("/quick-assign")
def quick_assign_task(
    payload: QuickAssignTaskRequest,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    # 1. Resolve Project
    project = None
    if payload.project_id:
        project = db.get(Project, payload.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án đã chọn")
    elif payload.project_name and payload.project_name.strip():
        p_name = payload.project_name.strip()
        project = db.query(Project).filter(Project.ProjectName == p_name).first()
        if not project:
            code = generate_project_code(p_name)
            project = Project(
                ProjectName=p_name,
                Status="in-progress",
                Deadline=payload.deadline,
                ProjectCode=code
            )
            db.add(project)
            db.commit()
            db.refresh(project)
    else:
        raise HTTPException(status_code=400, detail="Vui lòng chọn hoặc nhập tên dự án")

    # If payload deadline is given and project has no deadline, update project deadline
    if payload.deadline and not project.Deadline:
        project.Deadline = payload.deadline

    # 2. Resolve Member
    member = None
    if payload.member_id:
        m_candidate = db.get(ProjectMember, payload.member_id)
        if m_candidate and m_candidate.ProjectID == project.ProjectID:
            member = m_candidate
        elif m_candidate and not payload.member_name:
            payload.member_name = m_candidate.MemberName

    if not member and payload.member_name and payload.member_name.strip():
        m_name = payload.member_name.strip()
        member = db.query(ProjectMember).filter(
            ProjectMember.ProjectID == project.ProjectID,
            ProjectMember.MemberName == m_name
        ).first()
        if not member:
            m_code = generate_member_code(m_name, project.ProjectID)
            member = ProjectMember(
                ProjectID=project.ProjectID,
                MemberName=m_name,
                MemberCode=m_code
            )
            db.add(member)
            db.commit()
            db.refresh(member)
    elif not member:
        raise HTTPException(status_code=400, detail="Vui lòng chọn hoặc nhập tên người phụ trách")

    # 3. Create Task
    task_name = payload.task_name.strip()
    if not task_name:
        raise HTTPException(status_code=400, detail="Vui lòng nhập nội dung công việc")

    task = MemberTask(
        MemberID=member.MemberID,
        TaskName=task_name,
        Done=False,
        Attachment=payload.attachment
    )
    db.add(task)

    if project.Status == "completed":
        project.Status = "in-progress"

    log_msg = f'{current_user.username} đã giao việc "{task_name}" cho {member.MemberName} trong dự án "{project.ProjectName}".'
    if payload.attachment:
        log_msg += " (Có đính kèm tệp tin)"

    db.add(ProjectActivityLog(
        ProjectID=project.ProjectID,
        MemberID=member.MemberID,
        TaskID=None,
        ActionTime=datetime.now(),
        ActionBy=current_user.username,
        ActionType="TASK_ASSIGNED",
        Message=log_msg
    ))
    db.commit()
    db.refresh(task)

    LogService.record_log(
        db=main_db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="INSERT",
        mo_ta=f'Giao việc nhanh "{task_name}" cho {member.MemberName} trong dự án "{project.ProjectName}"',
        current_user=current_user
    )

    return {
        "success": True,
        "message": f'Đã giao việc "{task_name}" cho {member.MemberName} thành công!',
        "task_id": task.TaskID,
        "member_id": member.MemberID,
        "member_name": member.MemberName,
        "project_id": project.ProjectID,
        "project_name": project.ProjectName,
        "attachment": task.Attachment
    }


# ==========================================
# ALLAPP_PM - Quản Lý Ứng Dụng & PM Phụ Trách
# ==========================================

@router.get("/app-pm", response_model=List[AppPmItem])
def get_app_pm_list(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    sql = text("SELECT id, project_name, pm_project, ngay_trienkhai, ngay_update, note_them, active FROM ALLAPP_PM WHERE active = 1 ORDER BY id ASC")
    rows = db.execute(sql).fetchall()
    result = []
    for r in rows:
        result.append(AppPmItem(
            id=r[0],
            project_name=r[1],
            pm_project=r[2],
            ngay_trienkhai=r[3],
            ngay_update=r[4],
            note_them=r[5],
            active=bool(r[6])
        ))
    return result


@router.post("/app-pm", response_model=AppPmItem, status_code=status.HTTP_201_CREATED)
def create_app_pm(
    payload: AppPmCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    sql = text("""
        INSERT INTO ALLAPP_PM (project_name, pm_project, note_them, ngay_trienkhai, ngay_update, active)
        OUTPUT INSERTED.id, INSERTED.project_name, INSERTED.pm_project, INSERTED.ngay_trienkhai, INSERTED.ngay_update, INSERTED.note_them, INSERTED.active
        VALUES (:project_name, :pm_project, :note_them, GETDATE(), GETDATE(), 1)
    """)
    row = db.execute(sql, {
        "project_name": payload.project_name,
        "pm_project": payload.pm_project or "",
        "note_them": payload.note_them or ""
    }).fetchone()
    db.commit()

    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="INSERT",
        mo_ta=f"Thêm danh mục ứng dụng/PM: {payload.project_name} (PM: {payload.pm_project})",
        current_user=current_user
    )

    return AppPmItem(
        id=row[0],
        project_name=row[1],
        pm_project=row[2],
        ngay_trienkhai=row[3],
        ngay_update=row[4],
        note_them=row[5],
        active=bool(row[6])
    )


@router.put("/app-pm/{item_id}", response_model=AppPmItem)
def update_app_pm(
    item_id: int,
    payload: AppPmUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    sql_check = text("SELECT id, project_name, pm_project, note_them, active FROM ALLAPP_PM WHERE id = :id")
    row = db.execute(sql_check, {"id": item_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng dụng")

    new_name = payload.project_name if payload.project_name is not None else row[1]
    new_pm = payload.pm_project if payload.pm_project is not None else row[2]
    new_note = payload.note_them if payload.note_them is not None else row[3]
    new_active = 1 if (payload.active if payload.active is not None else bool(row[4])) else 0

    sql_update = text("""
        UPDATE ALLAPP_PM
        SET project_name = :project_name, pm_project = :pm_project, note_them = :note_them, active = :active, ngay_update = GETDATE()
        OUTPUT INSERTED.id, INSERTED.project_name, INSERTED.pm_project, INSERTED.ngay_trienkhai, INSERTED.ngay_update, INSERTED.note_them, INSERTED.active
        WHERE id = :id
    """)
    updated = db.execute(sql_update, {
        "id": item_id,
        "project_name": new_name,
        "pm_project": new_pm,
        "note_them": new_note,
        "active": new_active
    }).fetchone()
    db.commit()

    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="UPDATE",
        mo_ta=f"Cập nhật danh mục ứng dụng/PM ID {item_id}: {new_name}",
        current_user=current_user
    )

    return AppPmItem(
        id=updated[0],
        project_name=updated[1],
        pm_project=updated[2],
        ngay_trienkhai=updated[3],
        ngay_update=updated[4],
        note_them=updated[5],
        active=bool(updated[6])
    )


@router.delete("/app-pm/{item_id}")
def delete_app_pm(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    sql = text("UPDATE ALLAPP_PM SET active = 0, ngay_update = GETDATE() WHERE id = :id")
    db.execute(sql, {"id": item_id})
    db.commit()

    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="DELETE",
        mo_ta=f"Ngừng hoạt động danh mục ứng dụng/PM ID {item_id}",
        current_user=current_user
    )

    return {"success": True, "message": "Đã ngừng hoạt động ứng dụng"}


@router.get("/{project_id}", response_model=ProjectOut)

def get_project_detail(
    project_id: int,
    db: Session = Depends(get_project_db),
    current_user: UserInfo = Depends(get_current_user)
):
    project = (
        db.query(Project)
        .options(joinedload(Project.members).joinedload(ProjectMember.tasks))
        .filter(Project.ProjectID == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

    total_tasks = sum(len(m.tasks) for m in project.members)
    done_tasks = sum(sum(1 for t in m.tasks if t.Done) for m in project.members)
    pct = round((done_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    return ProjectOut(
        ProjectID=project.ProjectID,
        ProjectName=project.ProjectName,
        Status=project.Status,
        Deadline=project.Deadline,
        ProjectCode=project.ProjectCode,
        Description=project.Description,
        Images=project.Images,
        Files=project.Files,
        DescriptionUpdatedAt=project.DescriptionUpdatedAt,
        DescriptionUpdatedBy=project.DescriptionUpdatedBy,
        members=[MemberOut.model_validate(m) for m in project.members],
        total_tasks=total_tasks,
        done_tasks=done_tasks,
        progress_percent=pct
    )


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

    if payload.ProjectName is not None:
        project.ProjectName = payload.ProjectName.strip()
    if payload.Deadline is not None:
        project.Deadline = payload.Deadline
    if payload.Status is not None and payload.Status in ("in-progress", "completed"):
        project.Status = payload.Status
    if payload.ProjectCode is not None:
        project.ProjectCode = payload.ProjectCode
    if payload.Description is not None:
        project.Description = payload.Description
        project.DescriptionUpdatedAt = datetime.now()
        project.DescriptionUpdatedBy = current_user.username
    if payload.Images is not None:
        project.Images = payload.Images
    if payload.Files is not None:
        project.Files = payload.Files

    db.commit()

    LogService.record_log(
        db=main_db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="UPDATE",
        mo_ta=f'Cập nhật thông tin dự án ID {project_id}: "{project.ProjectName}"',
        current_user=current_user
    )

    return get_project_detail(project_id, db, current_user)


@router.put("/{project_id}/description", response_model=ProjectOut)
def update_project_description(
    project_id: int,
    payload: ProjectDescriptionUpdate,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

    project.Description = payload.Description
    project.Images = payload.Images
    project.Files = payload.Files
    project.DescriptionUpdatedAt = datetime.now()
    project.DescriptionUpdatedBy = current_user.username

    db.add(ProjectActivityLog(
        ProjectID=project.ProjectID,
        MemberID=None,
        TaskID=None,
        ActionTime=datetime.now(),
        ActionBy=current_user.username,
        ActionType="PROJECT_DESCRIPTION_UPDATED",
        Message=f'{current_user.username} đã cập nhật mô tả & tài liệu đính kèm cho dự án "{project.ProjectName}".'
    ))
    db.commit()

    LogService.record_log(
        db=main_db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="UPDATE",
        mo_ta=f'Cập nhật mô tả & tài liệu dự án ID {project_id}: "{project.ProjectName}"',
        current_user=current_user
    )

    return get_project_detail(project_id, db, current_user)


@router.post("/upload-files")
async def upload_project_files(
    files: List[UploadFile] = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    urls = []
    for file in files:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_name = file.filename or "file"
        safe_name = f"{timestamp}_{original_name.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_TASKS_DIR, safe_name)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        urls.append(f"/uploads/tasks/{safe_name}")
    return {"urls": urls}


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

    p_name = project.ProjectName

    # Delete related logs
    db.query(ProjectActivityLog).filter(ProjectActivityLog.ProjectID == project_id).delete()

    # Cascade delete project members and tasks
    members = db.query(ProjectMember).filter(ProjectMember.ProjectID == project_id).all()
    for m in members:
        db.query(MemberTask).filter(MemberTask.MemberID == m.MemberID).delete()
        db.delete(m)

    db.delete(project)
    db.commit()

    LogService.record_log(
        db=main_db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="DELETE",
        mo_ta=f'Xóa dự án ID {project_id}: "{p_name}"',
        current_user=current_user
    )

    return {"success": True, "message": f'Đã xóa dự án "{p_name}" thành công!'}


@router.post("/{project_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def add_member(
    project_id: int,
    payload: MemberCreate,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

    code = payload.MemberCode if payload.MemberCode else generate_member_code(payload.MemberName, project_id)
    member = ProjectMember(
        ProjectID=project_id,
        MemberName=payload.MemberName.strip(),
        MemberCode=code,
        CompletedAt=None
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    # Log member added
    db.add(ProjectActivityLog(
        ProjectID=project_id,
        MemberID=member.MemberID,
        TaskID=None,
        ActionTime=datetime.now(),
        ActionBy=current_user.username,
        ActionType="MEMBER_ADDED",
        Message=f'{current_user.username} đã thêm thành viên "{member.MemberName}" vào dự án "{project.ProjectName}".'
    ))
    db.commit()

    LogService.record_log(
        db=main_db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="INSERT",
        mo_ta=f'Thêm thành viên "{member.MemberName}" vào dự án "{project.ProjectName}"',
        current_user=current_user
    )

    return MemberOut.model_validate(member)


@router.delete("/members/{member_id}")
def delete_member(
    member_id: int,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    member = db.get(ProjectMember, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên")

    m_name = member.MemberName
    db.query(MemberTask).filter(MemberTask.MemberID == member_id).delete()
    db.delete(member)
    db.commit()

    LogService.record_log(
        db=main_db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="DELETE",
        mo_ta=f'Xóa thành viên ID {member_id}: "{m_name}" khỏi dự án',
        current_user=current_user
    )

    return {"success": True, "message": "Đã xóa thành viên khỏi dự án"}


@router.post("/members/{member_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def add_task(
    member_id: int,
    payload: TaskCreate,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    member = db.get(ProjectMember, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên")

    project = db.get(Project, member.ProjectID)

    task = MemberTask(
        MemberID=member_id,
        TaskName=payload.TaskName.strip(),
        Done=False,
        CompletedAt=None,
        LastChangedBy=None,
        LastChangedAt=None
    )
    db.add(task)

    # If member was marked completed, reset since new undone task is added
    if member.CompletedAt:
        member.CompletedAt = None

    # If project was completed, reset to in-progress
    if project and project.Status == "completed":
        project.Status = "in-progress"

    db.commit()
    db.refresh(task)

    # Log task added
    if project:
        db.add(ProjectActivityLog(
            ProjectID=project.ProjectID,
            MemberID=member.MemberID,
            TaskID=task.TaskID,
            ActionTime=datetime.now(),
            ActionBy=current_user.username,
            ActionType="TASK_ADDED",
            Message=f'{current_user.username} đã thêm công việc mới "{task.TaskName}" cho {member.MemberName}.'
        ))
        db.commit()

    LogService.record_log(
        db=main_db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="INSERT",
        mo_ta=f'Thêm công việc mới "{task.TaskName}" cho thành viên {member.MemberName}',
        current_user=current_user
    )

    return TaskOut.model_validate(task)


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    task = db.get(MemberTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")

    t_name = task.TaskName
    db.delete(task)
    db.commit()

    LogService.record_log(
        db=main_db,
        nhom_quyen="APP",
        man_hinh="QUAN_LY_DU_AN",
        hanh_dong="DELETE",
        mo_ta=f'Xóa công việc ID {task_id}: "{t_name}"',
        current_user=current_user
    )

    return {"success": True, "message": "Đã xóa công việc"}


@router.post("/tasks/{task_id}/toggle")
def toggle_task_endpoint(
    task_id: int,
    payload: TaskToggleRequest,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        task, member, project = toggle_task(db, task_id, payload.done, current_user.username)
        LogService.record_log(
            db=main_db,
            nhom_quyen="APP",
            man_hinh="QUAN_LY_DU_AN",
            hanh_dong="UPDATE",
            mo_ta=f'Cập nhật trạng thái task ID {task_id} -> {"Hoàn thành" if payload.done else "Chưa hoàn thành"}',
            current_user=current_user
        )
        return {
            "success": True,
            "task": TaskOut.model_validate(task),
            "member_completed_at": member.CompletedAt,
            "project_status": project.Status
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật task: {str(e)}")


@router.post("/tasks/bulk-toggle")
def bulk_toggle_tasks_endpoint(
    payload: BulkTaskToggleRequest,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        res = bulk_toggle_tasks(db, payload.task_ids, payload.done, current_user.username)
        LogService.record_log(
            db=main_db,
            nhom_quyen="APP",
            man_hinh="QUAN_LY_DU_AN",
            hanh_dong="UPDATE",
            mo_ta=f'Cập nhật hàng loạt {len(payload.task_ids)} tasks -> {"Hoàn thành" if payload.done else "Chưa hoàn thành"}',
            current_user=current_user
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật hàng loạt: {str(e)}")


@router.post("/{project_id}/toggle-all")
def toggle_all_project_tasks_endpoint(
    project_id: int,
    payload: ToggleAllRequest,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        res = toggle_all_project_tasks(db, project_id, payload.done, current_user.username)
        LogService.record_log(
            db=main_db,
            nhom_quyen="APP",
            man_hinh="QUAN_LY_DU_AN",
            hanh_dong="UPDATE",
            mo_ta=f'Đánh dấu toàn bộ tasks trong dự án ID {project_id} -> {"Hoàn thành" if payload.done else "Chưa hoàn thành"}',
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật dự án: {str(e)}")


@router.post("/members/{member_id}/toggle-all")
def toggle_all_member_tasks_endpoint(
    member_id: int,
    payload: ToggleAllRequest,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        res = toggle_all_member_tasks(db, member_id, payload.done, current_user.username)
        LogService.record_log(
            db=main_db,
            nhom_quyen="APP",
            man_hinh="QUAN_LY_DU_AN",
            hanh_dong="UPDATE",
            mo_ta=f'Đánh dấu toàn bộ tasks của thành viên ID {member_id} -> {"Hoàn thành" if payload.done else "Chưa hoàn thành"}',
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật thành viên: {str(e)}")


@router.put("/tasks/{task_id}/review", response_model=TaskOut)
def review_task_endpoint(
    task_id: int,
    payload: TaskReviewRequest,
    db: Session = Depends(get_project_db),
    main_db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """
    Đánh giá task (OK / Fail / Reset) - Dành riêng cho Quản trị viên & Super Admin
    """
    try:
        reviewer_name = current_user.full_name or current_user.username
        task = review_task(
            db,
            task_id=task_id,
            review_status=payload.review_status,
            review_note=payload.review_note,
            username=reviewer_name
        )
        LogService.record_log(
            db=main_db,
            nhom_quyen="APP",
            man_hinh="QUAN_LY_DU_AN",
            hanh_dong="UPDATE",
            mo_ta=f'Đánh giá task ID {task_id}: {payload.review_status} (Ghi chú: {payload.review_note or "Không"})',
            current_user=current_user
        )
        return TaskOut.model_validate(task)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đánh giá task: {str(e)}")

