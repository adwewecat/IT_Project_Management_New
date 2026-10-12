import re
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.models.lich_truc_hotline import LichTrucHotline


def extract_images_info(content: Optional[str]) -> tuple[List[str], bool]:
    """
    Trích xuất danh sách tất cả các đường dẫn hoặc base64 ảnh từ nội dung lưu trữ.
    Trả về (image_urls, is_image).
    """
    if not content:
        return [], False

    clean_content = content.strip()

    # Tìm tất cả src trong thẻ <img ... src="..." />
    src_matches = re.findall(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', clean_content, flags=re.IGNORECASE)
    if src_matches:
        valid_srcs = [s.strip() for s in src_matches if s.strip()]
        if valid_srcs:
            return valid_srcs, True

    # Fallback nếu trực tiếp là data:image/... hoặc URL ảnh
    if clean_content.startswith("data:image/") or clean_content.startswith("http://") or clean_content.startswith("https://"):
        return [clean_content], True

    # Fallback cho src= mà không có thẻ img đầy đủ
    fallback_matches = re.findall(r'src=[\"\']([^\"\']+)[\"\']', clean_content)
    if fallback_matches:
        valid_srcs = [s.strip() for s in fallback_matches if s.strip()]
        if valid_srcs:
            return valid_srcs, True

    # Nếu là bảng HTML (từ các bản ghi cũ)
    if "<table" in clean_content.lower():
        return [], False

    return [], False


def extract_image_info(content: Optional[str]) -> tuple[Optional[str], bool]:
    """
    Trích xuất đường dẫn hoặc base64 ảnh đầu tiên (tương thích ngược).
    """
    urls, is_img = extract_images_info(content)
    return (urls[0] if urls else None), is_img


def get_available_months(db: Session, team: Optional[str] = None) -> List[str]:
    """
    Lấy danh sách các tháng có dữ liệu lịch trực active (sắp xếp 1 đến 12).
    Nếu chỉ định team, lọc theo team đó.
    """
    stmt = select(LichTrucHotline.THANG, LichTrucHotline.NOIDUNG).where(LichTrucHotline.ACTIVE == True)
    if team:
        team_clean = team.strip().upper()
        if "HELP" in team_clean:
            stmt = stmt.where(LichTrucHotline.TEAM.ilike("%HELP%"))
        else:
            stmt = stmt.where(LichTrucHotline.TEAM.ilike("%APP%"))

    rows = db.execute(stmt).all()
    
    valid_months = []
    for m, content in rows:
        # Chỉ coi là có dữ liệu nếu có nội dung
        if m and str(m).strip().isdigit() and content and str(content).strip():
            valid_months.append(int(str(m).strip()))

    valid_months = sorted(list(set(valid_months)))
    return [str(m) for m in valid_months]


def get_hotline_schedule(db: Session, thang: str) -> Dict[str, Any]:
    """
    Lấy hình ảnh lịch trực hotline của Helpdesk và App theo tháng được chọn.
    """
    month_str = str(thang).strip()

    # Lấy các bản ghi active của tháng
    stmt = select(LichTrucHotline).where(
        LichTrucHotline.THANG == month_str,
        LichTrucHotline.ACTIVE == True
    ).order_by(desc(LichTrucHotline.id))

    records = db.execute(stmt).scalars().all()

    help_row = None
    app_row = None

    for r in records:
        team_clean = (r.TEAM or "").strip().upper()
        if team_clean in ("HELP", "HELPDESK") and not help_row:
            help_row = r
        elif team_clean == "APP" and not app_row:
            app_row = r

    def format_item(row: Optional[LichTrucHotline], team_name: str) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        img_urls, is_img = extract_images_info(row.NOIDUNG)
        return {
            "id": row.id,
            "thang": row.THANG or month_str,
            "team": team_name,
            "noidung": row.NOIDUNG,
            "image_url": img_urls[0] if img_urls else None,
            "image_urls": img_urls,
            "is_image": is_img,
            "user_insert": row.USER_INSERT,
            "ngay_insert": row.NGAY_INSERT
        }

    return {
        "thang": month_str,
        "helpdesk": format_item(help_row, "HELP"),
        "app": format_item(app_row, "APP"),
        "available_months": get_available_months(db),
        "helpdesk_months": get_available_months(db, "HELP"),
        "app_months": get_available_months(db, "APP"),
    }


def save_hotline_image(
    db: Session,
    thang: str,
    team: str,
    current_username: str,
    image_data: Optional[str] = None,
    images_data: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Admin thêm hoặc cập nhật hình ảnh lịch trực hotline theo tháng và nhóm (hỗ trợ lưu 1 hoặc nhiều ảnh).
    """
    month_str = str(thang).strip()
    team_upper = "HELP" if "help" in team.strip().lower() else "APP"

    raw_images: List[str] = []
    if images_data and len(images_data) > 0:
        raw_images = [img.strip() for img in images_data if img and img.strip()]
    elif image_data and image_data.strip():
        raw_images = [image_data.strip()]

    if not raw_images:
        raise ValueError("Danh sách hình ảnh không được để trống.")

    # Bao bọc chuẩn HTML các thẻ <img>
    paragraphs = []
    for img in raw_images:
        if img.startswith("data:image/") or img.startswith("http://") or img.startswith("https://"):
            paragraphs.append(f'<p><img src="{img}" /></p>')
        elif "<img" in img:
            paragraphs.append(img)
        else:
            paragraphs.append(f'<p><img src="{img}" /></p>')

    noidung = "".join(paragraphs)
    now = datetime.now()

    # Tìm bản ghi active hiện có
    stmt = select(LichTrucHotline).where(
        LichTrucHotline.THANG == month_str,
        LichTrucHotline.TEAM == team_upper,
        LichTrucHotline.ACTIVE == True
    )
    existing = db.execute(stmt).scalars().first()

    if existing:
        existing.NOIDUNG = noidung
        existing.USER_INSERT = current_username
        existing.NGAY_INSERT = now
    else:
        new_entry = LichTrucHotline(
            THANG=month_str,
            TEAM=team_upper,
            NOIDUNG=noidung,
            USER_INSERT=current_username,
            NGAY_INSERT=now,
            ACTIVE=True
        )
        db.add(new_entry)

    db.commit()
    return get_hotline_schedule(db, month_str)


def delete_hotline_schedule(db: Session, thang: str, team: str, current_username: str) -> bool:
    """
    Admin xóa hình ảnh lịch trực của tháng và nhóm được chọn.
    """
    month_str = str(thang).strip()
    team_upper = "HELP" if "help" in team.strip().lower() else "APP"

    stmt = select(LichTrucHotline).where(
        LichTrucHotline.THANG == month_str,
        LichTrucHotline.TEAM == team_upper,
        LichTrucHotline.ACTIVE == True
    )
    records = db.execute(stmt).scalars().all()
    if not records:
        return False

    for r in records:
        r.ACTIVE = False

    db.commit()
    return True
