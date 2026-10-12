import json
import re
import unicodedata
from datetime import datetime
from typing import Optional, List, Dict, Any
import httpx
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import Session

from app.models.personal_task import PersonalTask
from app.schemas.personal_task import (
    PersonalTaskItem,
    PersonalTaskCreate,
    PersonalTaskUpdate,
    PersonalTaskListResponse,
    AITaskExtractRequest,
)


def remove_accents(input_str: Optional[str]) -> str:
    if not input_str:
        return ""
    s = unicodedata.normalize("NFD", input_str)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s.replace("đ", "d").replace("Đ", "D").lower()


def to_task_item(task: PersonalTask) -> PersonalTaskItem:
    return PersonalTaskItem(
        id=task.id,
        username=task.username,
        noi_dung=task.noi_dung,
        images=task.images,
        files=task.files,
        trang_thai=task.trang_thai or "PENDING",
        ngay_tao=task.ngay_tao.strftime("%Y-%m-%d %H:%M:%S") if task.ngay_tao else None,
        ngay_hoan_thanh=task.ngay_hoan_thanh.strftime("%Y-%m-%d %H:%M:%S") if task.ngay_hoan_thanh else None,
        sort_order=task.sort_order or 0,
        active=bool(task.active),
    )


def get_personal_tasks(
    db: Session,
    username: str,
    tab: str = "pending",  # 'pending' | 'completed'
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 500,
) -> PersonalTaskListResponse:
    # 1. Total counts
    total_pending = db.scalar(
        select(func.count(PersonalTask.id))
        .where(
            PersonalTask.username == username,
            PersonalTask.active == True,
            PersonalTask.trang_thai == "PENDING",
        )
    ) or 0

    total_completed = db.scalar(
        select(func.count(PersonalTask.id))
        .where(
            PersonalTask.username == username,
            PersonalTask.active == True,
            PersonalTask.trang_thai == "COMPLETED",
        )
    ) or 0

    # 2. Main query
    stmt = select(PersonalTask).where(
        PersonalTask.username == username,
        PersonalTask.active == True,
    )

    if tab == "completed":
        stmt = stmt.where(PersonalTask.trang_thai == "COMPLETED")
        if from_date:
            try:
                dt_from = datetime.strptime(f"{from_date} 00:00:00", "%Y-%m-%d %H:%M:%S")
                stmt = stmt.where(PersonalTask.ngay_hoan_thanh >= dt_from)
            except Exception:
                pass
        if to_date:
            try:
                dt_to = datetime.strptime(f"{to_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
                stmt = stmt.where(PersonalTask.ngay_hoan_thanh <= dt_to)
            except Exception:
                pass
        stmt = stmt.order_by(PersonalTask.ngay_hoan_thanh.desc(), PersonalTask.id.desc())
    else:
        stmt = stmt.where(PersonalTask.trang_thai == "PENDING")
        stmt = stmt.order_by(PersonalTask.id.desc())

    if limit > 0:
        stmt = stmt.limit(limit)

    tasks = db.scalars(stmt).all()

    # Search in memory for accents
    if search:
        s_clean = remove_accents(search).strip()
        tasks = [t for t in tasks if s_clean in remove_accents(t.noi_dung or "")]

    items = [to_task_item(t) for t in tasks]
    return PersonalTaskListResponse(
        items=items,
        total_pending=total_pending,
        total_completed=total_completed,
    )


def create_personal_task(
    db: Session,
    username: str,
    payload: PersonalTaskCreate,
) -> PersonalTaskItem:
    task = PersonalTask(
        username=username,
        noi_dung=payload.noi_dung.strip(),
        images=payload.images,
        files=payload.files,
        trang_thai="PENDING",
        ngay_tao=datetime.now(),
        sort_order=0,
        active=True,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return to_task_item(task)


def batch_create_personal_tasks(
    db: Session,
    username: str,
    task_lines: List[str],
) -> List[PersonalTaskItem]:
    created_items = []
    now = datetime.now()
    for line in task_lines:
        clean = line.strip()
        # Bỏ các ký tự đầu dòng như - , * , 1. , 2) nếu có
        clean = re.sub(r"^(\s*[-*•+]\s*|\s*\d+[\.\)]\s*)", "", clean).strip()
        if clean:
            task = PersonalTask(
                username=username,
                noi_dung=clean,
                trang_thai="PENDING",
                ngay_tao=now,
                sort_order=0,
                active=True,
            )
            db.add(task)
            created_items.append(task)
    if created_items:
        db.commit()
        for t in created_items:
            db.refresh(t)
    return [to_task_item(t) for t in created_items]


def update_personal_task(
    db: Session,
    username: str,
    task_id: int,
    payload: PersonalTaskUpdate,
) -> PersonalTaskItem:
    task = db.scalar(
        select(PersonalTask).where(
            PersonalTask.id == task_id,
            PersonalTask.username == username,
            PersonalTask.active == True,
        )
    )
    if not task:
        raise ValueError("Không tìm thấy công việc cá nhân.")

    if payload.noi_dung is not None:
        task.noi_dung = payload.noi_dung.strip()
    if payload.trang_thai is not None:
        new_status = payload.trang_thai.upper()
        if new_status == "COMPLETED" and task.trang_thai != "COMPLETED":
            task.ngay_hoan_thanh = datetime.now()
        elif new_status == "PENDING":
            task.ngay_hoan_thanh = None
        task.trang_thai = new_status
    if payload.images is not None:
        task.images = payload.images
    if payload.files is not None:
        task.files = payload.files

    db.commit()
    db.refresh(task)
    return to_task_item(task)


def toggle_task_status(
    db: Session,
    username: str,
    task_id: int,
) -> PersonalTaskItem:
    task = db.scalar(
        select(PersonalTask).where(
            PersonalTask.id == task_id,
            PersonalTask.username == username,
            PersonalTask.active == True,
        )
    )
    if not task:
        raise ValueError("Không tìm thấy công việc cá nhân.")

    if task.trang_thai == "PENDING":
        task.trang_thai = "COMPLETED"
        task.ngay_hoan_thanh = datetime.now()
    else:
        task.trang_thai = "PENDING"
        task.ngay_hoan_thanh = None

    db.commit()
    db.refresh(task)
    return to_task_item(task)


def delete_personal_task(
    db: Session,
    username: str,
    task_id: int,
) -> bool:
    task = db.scalar(
        select(PersonalTask).where(
            PersonalTask.id == task_id,
            PersonalTask.username == username,
            PersonalTask.active == True,
        )
    )
    if not task:
        return False
    task.active = False
    db.commit()
    return True


def extract_tasks_from_text_or_ai(payload: AITaskExtractRequest) -> List[str]:
    """
    Trích xuất danh sách công việc từ text hoặc hình ảnh (sử dụng Gemini AI nếu có AI Key).
    """
    ai_key = (payload.ai_key or "").strip()

    # 1. Trường hợp có ảnh (Base64 hoặc URL) và có AI Key -> Gọi Gemini Vision
    if payload.image_base64 and ai_key:
        try:
            # Clean base64 prefix if exists
            img_data = payload.image_base64
            mime_type = "image/jpeg"
            if "," in img_data:
                header, img_data = img_data.split(",", 1)
                if "image/png" in header:
                    mime_type = "image/png"
                elif "image/webp" in header:
                    mime_type = "image/webp"

            prompt = (
                "Hãy đọc toàn bộ hình ảnh này (có thể là văn bản, danh sách viết tay, ảnh chụp màn hình ghi chú...) "
                "và trích xuất danh sách tất cả các đầu việc / công việc cần làm thành danh sách từng dòng riêng biệt. "
                "Yêu cầu: Chỉ trả về danh sách công việc, mỗi dòng một việc, không thêm lời chào hay giải thích gì thêm."
            )

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={ai_key}"
            body = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": img_data,
                                }
                            }
                        ]
                    }
                ]
            }

            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json=body)
                if res.status_code == 200:
                    resp_json = res.json()
                    candidates = resp_json.get("candidates", [])
                    if candidates:
                        content_parts = candidates[0].get("content", {}).get("parts", [])
                        if content_parts:
                            text_out = content_parts[0].get("text", "")
                            lines = [l.strip() for l in text_out.split("\n") if l.strip()]
                            cleaned = []
                            for l in lines:
                                c = re.sub(r"^(\s*[-*•+]\s*|\s*\d+[\.\)]\s*)", "", l).strip()
                                if c:
                                    cleaned.append(c)
                            return cleaned
        except Exception as e:
            print("Gemini Vision AI error:", e)

    # 2. Trường hợp văn bản thuần (Text Content)
    raw_text = payload.text_content or ""
    if not raw_text.strip():
        return []

    # Nếu có AI Key và text dài phức tạp, có thể dùng AI để tách task
    if ai_key and len(raw_text) > 100:
        try:
            prompt = (
                f"Hãy phân tích đoạn văn bản ghi chú sau đây và trích xuất thành danh sách các công việc cụ thể cần thực hiện:\n"
                f"---\n{raw_text}\n---\n"
                f"Yêu cầu: Chỉ trả về từng dòng công việc, mỗi việc 1 dòng ngắn gọn, không đánh số thứ tự thừa."
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={ai_key}"
            body = {"contents": [{"parts": [{"text": prompt}]}]}
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, json=body)
                if res.status_code == 200:
                    resp_json = res.json()
                    candidates = resp_json.get("candidates", [])
                    if candidates:
                        text_out = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        lines = [l.strip() for l in text_out.split("\n") if l.strip()]
                        cleaned = []
                        for l in lines:
                            c = re.sub(r"^(\s*[-*•+]\s*|\s*\d+[\.\)]\s*)", "", l).strip()
                            if c:
                                cleaned.append(c)
                        if cleaned:
                            return cleaned
        except Exception as e:
            print("Gemini Text AI error:", e)

    # 3. Fallback: Local Smart Line Splitter (Cực nhanh và chuẩn xác)
    lines = raw_text.split("\n")
    cleaned_lines = []
    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
        # Bỏ bullet points, số thứ tự (1., 2), -, *, +, •)
        cleaned = re.sub(r"^(\s*[-*•+]\s*|\s*\d+[\.\)]\s*)", "", line_str).strip()
        if cleaned:
            cleaned_lines.append(cleaned)

    return cleaned_lines
