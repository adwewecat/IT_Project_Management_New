import io
import re
import httpx
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, and_, desc, text

from app.models.pim import PIMRequest, PIMUserThucHien, PIMLog, PIMConfig, PIMSchedule
from app.models.user import User
from app.schemas.pim import (
    PIMStatusUpdate,
    PIMAssignUpdate,
    PIMUserCreate,
    PIMUserUpdate,
    PIMConfigUpdate,
    PIMScheduleUpdate
)

sched_logger = logging.getLogger("pim_schedule")


def is_northern_request(title: Optional[str], description: Optional[str]) -> bool:
    """
    Kiểm tra nếu tiêu đề hoặc nội dung/mô tả có chứa thông tin Miền Bắc (MB_...)
    để lọc bỏ, chỉ quan tâm và lưu trữ thông tin Miền Nam.
    """
    check_str = (str(title or '') + ' ' + str(description or '')).lower()
    return bool('mb_' in check_str or re.search(r'\bmb[_\s]', check_str))


def sync_all_pim_data(db: Session) -> Dict[str, Any]:
    """
    Quét tự động cả 4 màn hình PIM theo đúng thứ tự ưu tiên và phân công xoay vòng Round-Robin.
    """
    cfg = get_pim_config(db)
    sso_user = cfg.sso_username
    sso_pwd = cfg.sso_password

    client = httpx.Client(verify=False, follow_redirects=True, timeout=35)
    try:
        # 1. SSO Login
        try:
            r = client.get('https://sso.ggg.com.vn/Account/Login')
        except httpx.ConnectTimeout:
            raise RuntimeError("[SSO_TIMEOUT] Quá thời gian kết nối tới máy chủ SSO (https://sso.ggg.com.vn). Vui lòng thử lại sau.")
        except httpx.ConnectError as e:
            raise RuntimeError(f"[SSO_CONNECT_ERROR] Không thể kết nối tới máy chủ SSO (https://sso.ggg.com.vn): {e}")
        except Exception as e:
            raise RuntimeError(f"[SSO_REQUEST_ERROR] Lỗi khi tải trang đăng nhập SSO: {e}")

        token_match = re.search(r'name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"', r.text)
        if not token_match:
            token_match = re.search(r'value="([^"]+)"\s+name="__RequestVerificationToken"', r.text)
        token = token_match.group(1) if token_match else None
        if not token:
            raise RuntimeError("[SSO_TOKEN_NOT_FOUND] Không trích xuất được mã xác thực __RequestVerificationToken từ SSO. Có thể trang SSO đang bảo trì hoặc giao diện đăng nhập thay đổi.")

        try:
            r_login = client.post('https://sso.ggg.com.vn/Account/Login', data={
                'Username': sso_user,
                'Password': sso_pwd,
                'RememberLogin': 'true',
                '__RequestVerificationToken': token,
                'button': 'login'
            })
        except Exception as e:
            raise RuntimeError(f"[SSO_LOGIN_FAILED] Lỗi gửi thông tin đăng nhập tới SSO: {e}")

        if "Tên đăng nhập hoặc mật khẩu không hợp lệ" in r_login.text or "Invalid username or password" in r_login.text:
            raise RuntimeError(f"[SSO_INVALID_CREDENTIALS] Tài khoản hoặc mật khẩu SSO không chính xác (Tài khoản đang cấu hình: '{sso_user}'). Vui lòng bấm vào nút 'Tài Khoản PIM' để cập nhật lại.")

        # 2. PIM SSO Login
        try:
            r_pim_sso = client.get('https://adminpim.ggg.com.vn/auth/auth/ssologin')
        except Exception as e:
            raise RuntimeError(f"[PIM_SSO_CONNECT_ERROR] Lỗi kết nối cổng chuyển tiếp SSO của PIM (https://adminpim.ggg.com.vn/auth/auth/ssologin): {e}")

        token_search = re.search(r'token=([a-zA-Z0-9_\-]+)', str(r_pim_sso.url))
        if not token_search:
            raise RuntimeError(f"[PIM_AUTH_TOKEN_MISSING] Đăng nhập SSO thành công nhưng không lấy được token ủy quyền sang PIM. Tài khoản '{sso_user}' có thể chưa được phân quyền truy cập hệ thống PIM. URL phản hồi: {r_pim_sso.url}")
        pim_token = token_search.group(1)
        headers = {'Authorization': f'Bearer {pim_token}', 'Content-Type': 'application/json'}

        def dispatch(action_type: str, payload: Optional[dict] = None):
            try:
                res = client.post(
                    'https://adminpim.ggg.com.vn/rest/V1/izapi/dispatch',
                    headers=headers,
                    json={"action": {"type": action_type, "payload": payload or {}}}
                )
            except httpx.TimeoutException:
                raise RuntimeError(f"[PIM_API_TIMEOUT] Hết thời gian chờ (timeout) khi gọi API PIM '{action_type}'.")
            except Exception as e:
                raise RuntimeError(f"[PIM_API_CONNECT_ERROR] Lỗi kết nối API PIM '{action_type}': {e}")

            if res.status_code != 200:
                raise RuntimeError(f"[PIM_API_HTTP_{res.status_code}] Máy chủ PIM trả về mã lỗi HTTP {res.status_code} khi gọi '{action_type}': {res.text[:150]}")
            
            try:
                data = res.json()
            except Exception as e:
                raise RuntimeError(f"[PIM_API_PARSE_ERROR] Dữ liệu phản hồi từ PIM '{action_type}' không phải định dạng JSON: {e}")

            if isinstance(data, dict) and data.get("code") and data.get("code") != 200:
                msg = data.get("message") or data.get("detail") or str(data)
                raise RuntimeError(f"[PIM_API_ERROR_{data.get('code')}] Máy chủ PIM báo lỗi với '{action_type}': {msg}")

            return data

        # Load brand mapping từ dbo.BRAND
        brand_map = {}
        try:
            res_b = db.execute(text("SELECT mabrand, tenbrand FROM dbo.BRAND")).fetchall()
            for b in res_b:
                if b[0]:
                    brand_map[b[0].strip().lower()] = b[1].strip()
        except Exception:
            pass

        collected = []
        source_errors = {}

        # -----------------------------------------------------------------
        # ƯU TIÊN 1: Quản lý menu -> Danh sách yêu cầu menu
        # -----------------------------------------------------------------
        try:
            res_menu = dispatch("get-list-request-menu-v2", {
                "page_size": 50, "current_page": 1,
                "sort_orders": [{"field": "updated_at", "direction": "DESC"}],
                "filterGroups": [
                    [{"field": "approval_state", "value": "draft,processing", "condition_type": "in"}],
                    [{"field": "type_change", "value": "create,update", "condition_type": "in"}]
                ]
            })
            for it in res_menu.get("data", {}).get("items", []):
                st = (it.get("status") or "").strip()
                if st.lower() == "chờ it xử lý":
                    m_id = str(it.get("menustaging_id"))
                    brand = it.get("brand_name")
                    name = it.get("name")
                    version = it.get("version_name")
                    menu_title = f"{name} ({version})" if version else name
                    desc_text = (it.get("description") or "").strip()

                    # Bỏ qua yêu cầu Miền Bắc (MB_...)
                    if is_northern_request(menu_title, desc_text):
                        continue

                    link = f"https://pim.ggg.com.vn/menu-detail-update-lto/{m_id}/"

                    h_res = dispatch("list-history-approval-menu", {"menustaging_id": m_id})
                    rows = h_res.get("data", {}).get("rows", [])
                    last_row = sorted(rows, key=lambda x: int(x.get("step", 0)) if str(x.get("step", "0")).isdigit() else 0)[-1] if rows else None
                    time_str = last_row.get("time") if last_row else None
                    t_exec = datetime.strptime(time_str.strip(), "%Y-%m-%d %H:%M:%S") if time_str else None

                    collected.append({
                        "source": "Quản lý yêu cầu menu",
                        "priority": 1,
                        "id_yeu_cau": m_id,
                        "chuoi": brand,
                        "ten_menu": menu_title,
                        "mo_ta": desc_text,
                        "thoi_gian_thuc_hien": t_exec,
                        "link_yeu_cau": link
                    })
        except Exception as e:
            source_errors["Quản lý yêu cầu menu"] = str(e)
            sched_logger.error(f"[SOURCE_1_ERROR] Lỗi quét Quản lý yêu cầu menu: {e}")

        # -----------------------------------------------------------------
        # ƯU TIÊN 2: Quản lý yêu cầu món bán
        # -----------------------------------------------------------------
        try:
            res_dish = dispatch("list-sell-dish", {
                "page_size": 50, "current_page": 1, "filter_fields": True,
                "filterGroups": [[{"field": "approval_state", "value": "processing", "condition_type": "in"}]]
            })
            for r_dish in res_dish.get("data", {}).get("rows", []):
                st = (r_dish.get("status") or "").strip()
                if "chờ it" in st.lower():
                    d_id = str(r_dish.get("id"))
                    unit_code = (r_dish.get("unit_used") or "").strip().lower()
                    brand_label = brand_map.get(unit_code, unit_code.upper() if unit_code else None)
                    if unit_code and brand_label and not brand_label.startswith(unit_code.upper()):
                        brand_display = f"{unit_code.upper()} - {brand_label}"
                    else:
                        brand_display = brand_label or (unit_code.upper() if unit_code else "Khác")

                    title = (r_dish.get("title") or r_dish.get("description") or "").strip()
                    # Bỏ qua yêu cầu Miền Bắc (MB_...)
                    if is_northern_request(title, title):
                        continue

                    link = f"https://pim.ggg.com.vn/sell-dish-set-action/{d_id}"

                    h_res = dispatch("list-history-approval-sell-dish", {"id": d_id})
                    rows = h_res.get("data", {}).get("rows", [])
                    last_row = None
                    if rows:
                        def get_sort_key(x):
                            s = int(x.get("step", 0)) if str(x.get("step", "0")).isdigit() else 0
                            e = int(x.get("entity_id", 0)) if str(x.get("entity_id", "0")).isdigit() else 0
                            u = x.get("updated_at") or ""
                            return (s, e, u)
                        sorted_rows = sorted(rows, key=get_sort_key)
                        last_row = sorted_rows[-1]

                    t_exec = None
                    if last_row and last_row.get("updated_at"):
                        try:
                            dt_utc = datetime.strptime(last_row.get("updated_at").strip(), "%Y-%m-%d %H:%M:%S")
                            t_exec = dt_utc + timedelta(hours=7)
                        except Exception:
                            t_exec = None

                    collected.append({
                        "source": "Quản lý yêu cầu món bán",
                        "priority": 2,
                        "id_yeu_cau": d_id,
                        "chuoi": brand_display,
                        "ten_menu": title,
                        "mo_ta": title,
                        "thoi_gian_thuc_hien": t_exec,
                        "link_yeu_cau": link
                    })
        except Exception as e:
            source_errors["Quản lý yêu cầu món bán"] = str(e)
            sched_logger.error(f"[SOURCE_2_ERROR] Lỗi quét Quản lý yêu cầu món bán: {e}")

        # -----------------------------------------------------------------
        # ƯU TIÊN 3: Quản lý phê duyệt -> Phê duyệt menu
        # -----------------------------------------------------------------
        try:
            res_appr_menu = dispatch("get-list-request-menu-v2", {
                "page_size": 50, "current_page": 1,
                "sort_orders": [{"field": "updated_at", "direction": "DESC"}],
                "filterGroups": [
                    [{"field": "approval_state", "value": "processing", "condition_type": "in"}],
                    [{"field": "type_change", "value": "create,update", "condition_type": "in"}]
                ]
            })
            for it in res_appr_menu.get("data", {}).get("items", []):
                st = (it.get("status") or "").strip()
                if st.lower() == "chờ it xử lý":
                    m_id = str(it.get("menustaging_id"))
                    brand = it.get("brand_name")
                    name = it.get("name")
                    version = it.get("version_name")
                    menu_title = f"{name} ({version})" if version else name
                    desc_text = (it.get("description") or "").strip()

                    # Bỏ qua yêu cầu Miền Bắc (MB_...)
                    if is_northern_request(menu_title, desc_text):
                        continue

                    link = f"https://pim.ggg.com.vn/menu-detail-update-lto/{m_id}/"

                    h_res = dispatch("list-history-approval-menu", {"menustaging_id": m_id})
                    rows = h_res.get("data", {}).get("rows", [])
                    last_row = sorted(rows, key=lambda x: int(x.get("step", 0)) if str(x.get("step", "0")).isdigit() else 0)[-1] if rows else None
                    time_str = last_row.get("time") if last_row else None
                    t_exec = datetime.strptime(time_str.strip(), "%Y-%m-%d %H:%M:%S") if time_str else None

                    collected.append({
                        "source": "Phê duyệt menu",
                        "priority": 3,
                        "id_yeu_cau": m_id,
                        "chuoi": brand,
                        "ten_menu": menu_title,
                        "mo_ta": desc_text,
                        "thoi_gian_thuc_hien": t_exec,
                        "link_yeu_cau": link
                    })
        except Exception as e:
            source_errors["Phê duyệt menu"] = str(e)
            sched_logger.error(f"[SOURCE_3_ERROR] Lỗi quét Phê duyệt menu: {e}")

        # -----------------------------------------------------------------
        # ƯU TIÊN 4: Quản lý phê duyệt -> Phê duyệt giá menu (Ưu tiên thấp nhất)
        # -----------------------------------------------------------------
        try:
            res_appr_price = dispatch("get-list-request-menu-v2", {
                "page_size": 50, "current_page": 1,
                "sort_orders": [{"field": "updated_at", "direction": "DESC"}],
                "filterGroups": [
                    [{"field": "approval_state", "value": "processing", "condition_type": "in"}],
                    [{"field": "type_change", "value": "create_price,update_price", "condition_type": "in"}]
                ]
            })
            for it in res_appr_price.get("data", {}).get("items", []):
                st = (it.get("status") or "").strip()
                if st.lower() == "chờ it xử lý":
                    m_id = str(it.get("menustaging_id"))
                    brand = it.get("brand_name")
                    name = it.get("name")
                    version = it.get("version_name")
                    menu_title = f"{name} ({version})" if version else name
                    desc_text = (it.get("description") or "").strip()

                    # Bỏ qua yêu cầu Miền Bắc (MB_...)
                    if is_northern_request(menu_title, desc_text):
                        continue

                    link = f"https://pim.ggg.com.vn/menu-request-approve-master-price/{m_id}/"

                    h_res = dispatch("list-history-approval-menu", {"menustaging_id": m_id})
                    rows = h_res.get("data", {}).get("rows", [])
                    last_row = sorted(rows, key=lambda x: int(x.get("step", 0)) if str(x.get("step", "0")).isdigit() else 0)[-1] if rows else None
                    time_str = last_row.get("time") if last_row else None
                    t_exec = datetime.strptime(time_str.strip(), "%Y-%m-%d %H:%M:%S") if time_str else None

                    collected.append({
                        "source": "Phê duyệt giá menu",
                        "priority": 4,
                        "id_yeu_cau": m_id,
                        "chuoi": brand,
                        "ten_menu": menu_title,
                        "mo_ta": desc_text,
                        "thoi_gian_thuc_hien": t_exec,
                        "link_yeu_cau": link
                    })
        except Exception as e:
            source_errors["Phê duyệt giá menu"] = str(e)
            sched_logger.error(f"[SOURCE_4_ERROR] Lỗi quét Phê duyệt giá menu: {e}")

        # Kiểm tra nếu tất cả các nguồn đều bị lỗi
        if len(source_errors) == 4 and len(collected) == 0:
            err_details = "\n".join([f"- {src}: {err}" for src, err in source_errors.items()])
            raise RuntimeError(f"[PIM_ALL_SOURCES_FAILED] Quét toàn bộ 4 màn hình PIM đều thất bại. Chi tiết lỗi từng nguồn:\n{err_details}")

        # Khử trùng lặp theo ID yêu cầu (Ưu tiên nguồn có priority nhỏ hơn)
        unique_candidates = {}
        for c in collected:
            req_id = c["id_yeu_cau"]
            if req_id not in unique_candidates:
                unique_candidates[req_id] = c
            elif c["priority"] < unique_candidates[req_id]["priority"]:
                unique_candidates[req_id] = c

        sorted_final = sorted(unique_candidates.values(), key=lambda x: (x["priority"], x["id_yeu_cau"]))

        # Tự động dọn dẹp các bản ghi Miền Bắc (MB_...) đã tồn tại từ trước trong DB
        existing_all = db.execute(select(PIMRequest)).scalars().all()
        for rec in existing_all:
            if is_northern_request(rec.ten_menu, rec.mo_ta):
                db.delete(rec)

        # 3. Phân công xoay vòng Round-Robin & Lưu DB
        stmt_u = select(PIMUserThucHien).where(PIMUserThucHien.active == True).order_by(PIMUserThucHien.thu_tu)
        users = db.execute(stmt_u).scalars().all()
        user_names = [u.ten_user for u in users]
        if not user_names:
            user_names = ["Quyên", "Hùng", "Duy", "Thức", "Trầm"]

        stmt_last = select(PIMRequest).where(PIMRequest.user_thuc_hien.isnot(None)).order_by(PIMRequest.id.desc())
        last_pim = db.execute(stmt_last).scalars().first()
        current_user_idx = -1
        if last_pim and last_pim.user_thuc_hien in user_names:
            current_user_idx = user_names.index(last_pim.user_thuc_hien)

        inserted_count = 0
        updated_count = 0
        assigned_items = []

        for item in sorted_final:
            m_id = item["id_yeu_cau"]
            stmt_check = select(PIMRequest).where(PIMRequest.id_yeu_cau == m_id)
            existing = db.execute(stmt_check).scalar_one_or_none()

            if not existing:
                current_user_idx = (current_user_idx + 1) % len(user_names)
                assigned_user = user_names[current_user_idx]

                new_req = PIMRequest(
                    id_yeu_cau=m_id,
                    chuoi=item["chuoi"],
                    ten_menu=item["ten_menu"],
                    mo_ta=item["mo_ta"],
                    thoi_gian_thuc_hien=item["thoi_gian_thuc_hien"],
                    link_yeu_cau=item["link_yeu_cau"],
                    user_thuc_hien=assigned_user,
                    trang_thai_thuc_hien="chưa hoàn thành",
                    so="chưa hoàn thành",
                    gui_mail="chưa hoàn thành"
                )
                db.add(new_req)
                db.flush()

                # Ghi Log
                log_entry = PIMLog(
                    id_yeu_cau=m_id,
                    hanh_dong="Tự động phân công",
                    noi_dung=f"Nguồn: {item['source']} | Phân công xoay vòng cho {assigned_user}",
                    user_thuc_hien="Hệ thống"
                )
                db.add(log_entry)
                inserted_count += 1
                assigned_items.append({
                    "id_yeu_cau": m_id,
                    "chuoi": item["chuoi"] or "—",
                    "ten_menu": item["ten_menu"] or "—",
                    "source": item["source"],
                    "user_thuc_hien": assigned_user,
                    "is_new": True,
                    "link_yeu_cau": item["link_yeu_cau"],
                    "trang_thai": "Mới ghi nhận"
                })
            else:
                # Cập nhật thông tin cơ bản, giữ nguyên user và tiến độ làm việc
                if not existing.user_thuc_hien:
                    current_user_idx = (current_user_idx + 1) % len(user_names)
                    existing.user_thuc_hien = user_names[current_user_idx]
                    db.add(PIMLog(
                        id_yeu_cau=m_id,
                        hanh_dong="Tự động phân công",
                        noi_dung=f"Bổ sung phân công cho {existing.user_thuc_hien}",
                        user_thuc_hien="Hệ thống"
                    ))
                existing.chuoi = item["chuoi"]
                existing.ten_menu = item["ten_menu"]
                existing.mo_ta = item["mo_ta"]
                existing.thoi_gian_thuc_hien = item["thoi_gian_thuc_hien"]
                existing.link_yeu_cau = item["link_yeu_cau"]
                updated_count += 1
                assigned_items.append({
                    "id_yeu_cau": m_id,
                    "chuoi": item["chuoi"] or "—",
                    "ten_menu": item["ten_menu"] or "—",
                    "source": item["source"],
                    "user_thuc_hien": existing.user_thuc_hien or "Chưa gán",
                    "is_new": False,
                    "link_yeu_cau": item["link_yeu_cau"],
                    "trang_thai": "Đã cập nhật"
                })

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise RuntimeError(f"[DATABASE_ERROR] Lỗi khi lưu dữ liệu PIM vào cơ sở dữ liệu: {e}")

        # Nếu không có item mới/cập nhật từ cổng PIM (ví dụ staging tạm không có đơn mới),
        # lấy các yêu cầu PIM chưa hoàn thành trong DB để báo cáo rõ ràng ai đang phụ trách
        fallback_items = []
        if not assigned_items:
            recent_pending = db.execute(
                select(PIMRequest)
                .where(or_(
                    PIMRequest.trang_thai_thuc_hien != "đã hoàn thành",
                    PIMRequest.so != "đã hoàn thành",
                    PIMRequest.gui_mail != "đã hoàn thành"
                ))
                .order_by(desc(PIMRequest.id))
                .limit(20)
            ).scalars().all()
            for r in recent_pending:
                fallback_items.append({
                    "id_yeu_cau": r.id_yeu_cau,
                    "chuoi": r.chuoi or "—",
                    "ten_menu": r.ten_menu or "—",
                    "source": "Yêu cầu trong hệ thống",
                    "user_thuc_hien": r.user_thuc_hien or "Chưa phân công",
                    "is_new": False,
                    "link_yeu_cau": r.link_yeu_cau or f"https://pim.ggg.com.vn/menu-detail-update-lto/{r.id_yeu_cau}/",
                    "trang_thai": r.trang_thai_thuc_hien or "Chưa hoàn thành"
                })

        return {
            "total_scanned": len(sorted_final),
            "inserted": inserted_count,
            "updated": updated_count,
            "items": assigned_items if assigned_items else fallback_items,
            "is_from_pending_db": len(assigned_items) == 0,
            "message": f"Đồng bộ thành công! Thêm mới {inserted_count} yêu cầu, cập nhật {updated_count} yêu cầu."
        }
    finally:
        client.close()


def format_pim_email_report(
    res: Dict[str, Any],
    scan_date: str,
    triggered_by: str = "Hệ thống (Auto)",
    error: Optional[str] = None
) -> tuple[str, str, str]:
    """
    Tạo nội dung HTML và tiêu đề Email cho tác vụ Đồng bộ PIM & Phân công tự động theo chuẩn bảng GPMS.
    Trả về: (subject, html_content, plain_text)
    """
    total_scanned = res.get("total_scanned", 0)
    inserted = res.get("inserted", 0)
    updated = res.get("updated", 0)
    items = res.get("items", [])
    is_from_pending_db = res.get("is_from_pending_db", False)

    # Nếu không có lỗi và không có PIM mới phát sinh (0 mới): Gửi mail rút gọn theo yêu cầu
    if not error and inserted == 0:
        subject = f"[PIM THÀNH CÔNG] Đồng bộ Yêu cầu PIM: 0 mới ({scan_date})"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Calibri, Tahoma, sans-serif; font-size: 13px; color: #1F2937; line-height: 1.5; margin: 0; padding: 0; }}
                .container {{ max-width: 650px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }}
                .header {{ background-color: #111827; color: #F5B800; padding: 16px 20px; font-size: 16px; font-weight: bold; }}
                .body {{ padding: 24px; background-color: #FFFFFF; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    HỆ THỐNG ĐỒNG BỘ YÊU CẦU PIM & PHÂN CÔNG TỰ ĐỘNG
                </div>
                <div class="body">
                    <div style="font-size: 15px; font-weight: bold; color: #111827; margin-bottom: 6px;">
                        Đồng bộ Yêu cầu PIM & Phân công tự động thành công
                    </div>
                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 14px;">
                        Thời gian thực hiện: <b>{scan_date}</b> &nbsp;|&nbsp; Kích hoạt bởi: <b>{triggered_by}</b>
                    </div>
                    <div style="display: inline-block; padding: 6px 14px; border-radius: 6px; background-color: #EFF6FF; color: #1D4ED8; font-weight: bold; font-size: 13px; border: 1px solid #BFDBFE;">
                        0 mới
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        plain_text = (
            f"Đồng bộ Yêu cầu PIM & Phân công tự động thành công\n"
            f"Thời gian thực hiện: {scan_date}  |  Kích hoạt bởi: {triggered_by}\n"
            f"0 mới\n"
        )
        return subject, html_content, plain_text

    # 1. Tiêu đề email (Subject) khi có phát sinh mới hoặc có lỗi
    if error:
        subject = f"[CẢNH BÁO PIM] Đồng bộ Yêu cầu PIM gặp sự cố kết nối ({scan_date})"
    elif inserted > 0:
        subject = f"[PIM THÀNH CÔNG] Đã ghi nhận thêm {inserted} PIM mới & phân công cho IT ({scan_date})"
    else:
        subject = f"[PIM THÀNH CÔNG] Đồng bộ {total_scanned} PIM: 0 mới, {updated} cập nhật ({scan_date})"

    # 2. Badge trạng thái
    if error:
        status_badge = '<span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background-color: #FEF2F2; color: #DC2626; border: 1px solid #FCA5A5; font-weight: bold; font-size: 13px;">GẶP SỰ CỐ KẾT NỐI</span>'
    elif inserted > 0:
        status_badge = f'<span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background-color: #DEF7EC; color: #03543F; border: 1px solid #86EFAC; font-weight: bold; font-size: 13px;">Ghi nhận +{inserted} PIM mới</span>'
    else:
        status_badge = f'<span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background-color: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; font-weight: bold; font-size: 13px;">0 mới, {updated} cập nhật</span>'

    # 3. Message banner
    if error:
        msg_banner = f"""
        <div style="margin: 12px 0; color: #991B1B; background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 10px 14px; border-radius: 4px; font-size: 12px;">
            <b>⚠️ Cảnh báo lỗi kết nối:</b> {error}<br/>
            <i>Dưới đây là danh sách các yêu cầu PIM đang chờ xử lý gần nhất trong cơ sở dữ liệu để IT tiếp tục theo dõi.</i>
        </div>
        """
    elif inserted > 0:
        msg_banner = f"""
        <div style="margin: 12px 0; color: #065F46; background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 10px 14px; border-radius: 4px; font-size: 12px;">
            ✓ <b>Đồng bộ thành công:</b> Đã ghi nhận thêm <b>{inserted}</b> yêu cầu PIM mới từ cổng PIM và tự động phân quyền/phân công phụ trách cho nhân sự theo cơ chế Round-Robin.
        </div>
        """
    elif is_from_pending_db:
        msg_banner = f"""
        <div style="margin: 12px 0; color: #1E40AF; background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 10px 14px; border-radius: 4px; font-size: 12px;">
            ℹ️ <b>Thông tin đồng bộ:</b> Cổng PIM không phát sinh yêu cầu mới tại thời điểm quét. Dưới đây là danh sách các yêu cầu PIM đang chờ xử lý trong hệ thống và nhân sự được phân công phụ trách.
        </div>
        """
    else:
        msg_banner = f"""
        <div style="margin: 12px 0; color: #1E40AF; background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 10px 14px; border-radius: 4px; font-size: 12px;">
            ℹ️ <b>Đồng bộ hoàn tất:</b> Đã rà soát {total_scanned} yêu cầu, cập nhật {updated} yêu cầu.
        </div>
        """

    # 4. Bảng các dòng PIM
    table_rows_html = ""
    plain_rows = []
    if items:
        for idx, it in enumerate(items, 1):
            m_id = it.get("id_yeu_cau") or "—"
            ten_menu = it.get("ten_menu") or "—"
            chuoi = it.get("chuoi") or "—"
            source = it.get("source") or "PIM"
            user_assigned = it.get("user_thuc_hien") or "Chưa phân công"
            link = it.get("link_yeu_cau") or ""
            is_new = it.get("is_new", False)
            trang_thai = it.get("trang_thai") or ("+ Mới thêm" if is_new else "Đang xử lý")

            # Source badge
            src_bg = "#EEF2FF"
            src_color = "#4338CA"
            if "món bán" in source.lower():
                src_bg = "#FEF3C7"
                src_color = "#B45309"
            elif "giá" in source.lower():
                src_bg = "#FCE7F3"
                src_color = "#9D174D"
            elif "phê duyệt" in source.lower():
                src_bg = "#E0E7FF"
                src_color = "#3730A3"

            # Status badge
            if is_new:
                st_html = '<span style="display: inline-block; padding: 2px 8px; border-radius: 10px; background-color: #DEF7EC; color: #03543F; font-size: 11px; font-weight: 600;">+ Mới thêm</span>'
            else:
                st_html = f'<span style="display: inline-block; padding: 2px 8px; border-radius: 10px; background-color: #FEF3C7; color: #92400E; font-size: 11px; font-weight: 600;">{trang_thai}</span>'

            # User badge (Phân quyền/phân công cho ai)
            user_badge = f'<span style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: #DBEAFE; color: #1E40AF; font-weight: 700; font-size: 12px; letter-spacing: 0.3px;">👤 {user_assigned}</span>'

            # Code link
            if link:
                code_html = f'<a href="{link}" target="_blank" style="color: #2563EB; font-weight: 700; text-decoration: none;">#{m_id}</a>'
            else:
                code_html = f'<span style="font-weight: 700; color: #374151;">#{m_id}</span>'

            row_bg = "#FFFFFF" if idx % 2 != 0 else "#F9FAFB"
            table_rows_html += f"""
            <tr style="background-color: {row_bg}; border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 10px 8px; text-align: center; font-weight: 600; color: #6B7280;">{idx}</td>
                <td style="padding: 10px 10px; text-align: center;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: {src_bg}; color: {src_color}; font-size: 11px; font-weight: 600;">
                        {source}
                    </span>
                </td>
                <td style="padding: 10px 10px; font-family: monospace;">{code_html}</td>
                <td style="padding: 10px 12px; font-weight: 600; color: #111827;">{ten_menu}</td>
                <td style="padding: 10px 10px; font-weight: 600; color: #4B5563;">{chuoi}</td>
                <td style="padding: 10px 10px; text-align: center;">{user_badge}</td>
                <td style="padding: 10px 10px; text-align: center;">{st_html}</td>
            </tr>
            """
            plain_rows.append(f"{idx}. #{m_id} - {ten_menu} ({chuoi}) | Nguồn: {source} | Phân công: {user_assigned} | Trạng thái: {trang_thai}")
    else:
        table_rows_html = """
        <tr>
            <td colspan="7" style="padding: 30px; text-align: center; color: #6B7280; font-style: italic;">
                Không có yêu cầu PIM nào phát sinh hoặc đang chờ xử lý.
            </td>
        </tr>
        """

    html_content = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Calibri, Tahoma, sans-serif; font-size: 13px; color: #1F2937; line-height: 1.5; margin: 0; padding: 0; }}
            .container {{ max-width: 960px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }}
            .header {{ background-color: #111827; color: #F5B800; padding: 18px 24px; font-size: 16px; font-weight: bold; }}
            .body {{ padding: 24px; background-color: #FFFFFF; }}
            .summary-cards {{ display: flex; gap: 12px; margin-top: 14px; margin-bottom: 14px; flex-wrap: wrap; }}
            .card {{ flex: 1; min-width: 130px; padding: 10px 14px; border-radius: 6px; background-color: #F9FAFB; border: 1px solid #E5E7EB; }}
            .card-title {{ font-size: 11px; color: #6B7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }}
            .card-value {{ font-size: 18px; font-weight: bold; color: #111827; }}
            .table-box {{ width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }}
            .table-box th {{ background-color: #F3F4F6; color: #374151; padding: 10px 10px; text-align: left; text-transform: uppercase; font-size: 11px; border-bottom: 2px solid #E5E7EB; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                HỆ THỐNG ĐỒNG BỘ YÊU CẦU PIM & PHÂN CÔNG TỰ ĐỘNG
            </div>
            <div class="body">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="font-size: 15px; font-weight: bold; color: #111827;">Đồng bộ Yêu cầu PIM & Phân công tự động</div>
                        <div style="font-size: 12px; color: #6B7280; margin-top: 3px;">
                            Thời gian thực hiện: <b>{scan_date}</b> &nbsp;|&nbsp; Kích hoạt bởi: <b>{triggered_by}</b>
                        </div>
                    </div>
                    <div>
                        {status_badge}
                    </div>
                </div>

                <div class="summary-cards">
                    <div class="card">
                        <div class="card-title">📥 Tổng Quét PIM</div>
                        <div class="card-value">{total_scanned}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">🆕 Ghi Nhận Mới</div>
                        <div class="card-value" style="color: #059669;">+{inserted}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">🔄 Cập Nhật</div>
                        <div class="card-value" style="color: #2563EB;">{updated}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">👥 Phân Công Nhiệm Vụ</div>
                        <div class="card-value" style="color: #4F46E5;">{len(items)}</div>
                    </div>
                </div>

                {msg_banner}

                <table class="table-box">
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">STT</th>
                            <th style="width: 140px; text-align: center;">Phân Loại / Nguồn</th>
                            <th style="width: 90px;">Mã PIM</th>
                            <th>Tên Nhiệm Vụ / Yêu Cầu Menu / Món</th>
                            <th style="width: 120px;">Chuỗi</th>
                            <th style="width: 150px; text-align: center;">Phân Công Cho</th>
                            <th style="width: 110px; text-align: center;">Trạng Thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {table_rows_html}
                    </tbody>
                </table>
            </div>
        </div>
    </body>
    </html>
    """

    plain_text = (
        f"Báo cáo Đồng bộ Yêu cầu PIM & Phân công tự động ({scan_date})\n"
        f"Kích hoạt: {triggered_by}\n"
        f"Tổng quét: {total_scanned} | Ghi nhận mới: {inserted} | Cập nhật: {updated}\n\n"
        + "\n".join(plain_rows)
    )

    return subject, html_content, plain_text


def get_pending_requests(
    db: Session,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_thuc_hien: Optional[str] = None,
    search: Optional[str] = None
) -> List[PIMRequest]:
    """
    Lấy danh sách PIM chưa hoàn thành (chỉ cần 1 trong 3 mục: Trạng thái thực hiện, SO hoặc Gửi mail chưa hoàn thành).
    Sắp xếp theo thời gian thực hiện DESC, ngày insert DESC.
    """
    query = select(PIMRequest).where(
        or_(
            PIMRequest.trang_thai_thuc_hien != "hoàn thành",
            PIMRequest.trang_thai_thuc_hien.is_(None),
            PIMRequest.so != "hoàn thành",
            PIMRequest.so.is_(None),
            PIMRequest.gui_mail != "hoàn thành",
            PIMRequest.gui_mail.is_(None)
        )
    )

    if user_thuc_hien and user_thuc_hien.strip():
        query = query.where(PIMRequest.user_thuc_hien == user_thuc_hien.strip())

    if from_date:
        try:
            dt_from = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.where(PIMRequest.thoi_gian_thuc_hien >= dt_from)
        except Exception:
            pass

    if to_date:
        try:
            dt_to = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.where(PIMRequest.thoi_gian_thuc_hien < dt_to)
        except Exception:
            pass

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(
            PIMRequest.id_yeu_cau.like(term),
            PIMRequest.chuoi.like(term),
            PIMRequest.ten_menu.like(term),
            PIMRequest.mo_ta.like(term)
        ))

    query = query.order_by(desc(PIMRequest.thoi_gian_thuc_hien), desc(PIMRequest.ngay_insert))
    items = db.execute(query).scalars().all()
    return [it for it in items if not is_northern_request(it.ten_menu, it.mo_ta)]


def get_completed_requests(
    db: Session,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_thuc_hien: Optional[str] = None,
    user_update: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100
) -> List[PIMRequest]:
    """
    Lấy danh sách PIM đã hoàn thành (phải hoàn thành cả 3: Trạng thái thực hiện, SO VÀ Gửi mail đều là 'hoàn thành').
    Mặc định 100 dòng mới hoàn thành nhất.
    """
    query = select(PIMRequest).where(
        PIMRequest.trang_thai_thuc_hien == "hoàn thành",
        PIMRequest.so == "hoàn thành",
        PIMRequest.gui_mail == "hoàn thành"
    )

    if user_thuc_hien and user_thuc_hien.strip():
        query = query.where(PIMRequest.user_thuc_hien == user_thuc_hien.strip())

    if user_update and user_update.strip():
        query = query.where(PIMRequest.user_update == user_update.strip())

    if from_date:
        try:
            dt_from = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.where(PIMRequest.thoi_gian_thuc_hien >= dt_from)
        except Exception:
            pass

    if to_date:
        try:
            dt_to = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.where(PIMRequest.thoi_gian_thuc_hien < dt_to)
        except Exception:
            pass

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(
            PIMRequest.id_yeu_cau.like(term),
            PIMRequest.chuoi.like(term),
            PIMRequest.ten_menu.like(term),
            PIMRequest.mo_ta.like(term)
        ))

    query = query.order_by(desc(PIMRequest.thoi_gian_hoan_thanh), desc(PIMRequest.thoi_gian_update)).limit(limit)
    items = db.execute(query).scalars().all()
    return [it for it in items if not is_northern_request(it.ten_menu, it.mo_ta)]


def export_pim_excel(
    db: Session,
    tab: Optional[str] = "all",
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_thuc_hien: Optional[str] = None,
    user_update: Optional[str] = None,
    search: Optional[str] = None,
    trang_thai_thuc_hien: Optional[str] = None,
    so: Optional[str] = None,
    gui_mail: Optional[str] = None,
) -> io.BytesIO:
    """
    Xuất danh sách yêu cầu PIM ra file Excel theo bộ lọc hiện tại.
    """
    query = select(PIMRequest)

    if tab == "pending":
        query = query.where(
            or_(
                PIMRequest.trang_thai_thuc_hien != "hoàn thành",
                PIMRequest.trang_thai_thuc_hien.is_(None),
                PIMRequest.so != "hoàn thành",
                PIMRequest.so.is_(None),
                PIMRequest.gui_mail != "hoàn thành",
                PIMRequest.gui_mail.is_(None)
            )
        )
    elif tab == "completed":
        query = query.where(
            PIMRequest.trang_thai_thuc_hien == "hoàn thành",
            PIMRequest.so == "hoàn thành",
            PIMRequest.gui_mail == "hoàn thành"
        )

    if user_thuc_hien and user_thuc_hien.strip():
        query = query.where(PIMRequest.user_thuc_hien == user_thuc_hien.strip())

    if user_update and user_update.strip():
        query = query.where(PIMRequest.user_update == user_update.strip())

    if trang_thai_thuc_hien and trang_thai_thuc_hien.strip():
        query = query.where(PIMRequest.trang_thai_thuc_hien == trang_thai_thuc_hien.strip())

    if so and so.strip():
        query = query.where(PIMRequest.so == so.strip())

    if gui_mail and gui_mail.strip():
        query = query.where(PIMRequest.gui_mail == gui_mail.strip())

    if from_date:
        try:
            dt_from = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.where(PIMRequest.thoi_gian_thuc_hien >= dt_from)
        except Exception:
            pass

    if to_date:
        try:
            dt_to = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.where(PIMRequest.thoi_gian_thuc_hien < dt_to)
        except Exception:
            pass

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(
            PIMRequest.id_yeu_cau.like(term),
            PIMRequest.chuoi.like(term),
            PIMRequest.ten_menu.like(term),
            PIMRequest.mo_ta.like(term)
        ))

    if tab == "completed":
        query = query.order_by(desc(PIMRequest.thoi_gian_hoan_thanh), desc(PIMRequest.thoi_gian_update))
    else:
        query = query.order_by(desc(PIMRequest.thoi_gian_thuc_hien), desc(PIMRequest.ngay_insert))

    records = db.execute(query).scalars().all()
    records = [r for r in records if not is_northern_request(r.ten_menu, r.mo_ta)]

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Danh Sách PIM"

    # Header style
    header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    border_thin = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)

    headers = [
        "STT",
        "ID Yêu Cầu",
        "Chuỗi / Thương Hiệu",
        "Tên Menu / Tiêu Đề",
        "Mô Tả",
        "Thời Gian Yêu Cầu",
        "Người Phụ Trách",
        "Trạng Thái Thực Hiện",
        "Trạng Thái SO",
        "Gửi Mail Thông Báo Nhà Hàng",
        "Ngày Thêm Hệ Thống",
        "Người Cập Nhật",
        "Thời Gian Cập Nhật",
        "Người Hoàn Thành",
        "Thời Gian Hoàn Thành",
        "Link Yêu Cầu"
    ]

    ws.row_dimensions[1].height = 28
    for col_idx, title in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=title)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = align_center
        cell.border = border_thin

    def fmt_dt(val: Optional[datetime]) -> str:
        if not val:
            return ""
        return val.strftime("%Y-%m-%d %H:%M:%S")

    for row_idx, r in enumerate(records, start=2):
        ws.row_dimensions[row_idx].height = 22
        row_data = [
            row_idx - 1,
            r.id_yeu_cau or "",
            r.chuoi or "",
            r.ten_menu or "",
            r.mo_ta or "",
            fmt_dt(r.thoi_gian_thuc_hien),
            r.user_thuc_hien or "",
            r.trang_thai_thuc_hien or "",
            r.so or "",
            r.gui_mail or "",
            fmt_dt(r.ngay_insert),
            r.user_update or "",
            fmt_dt(r.thoi_gian_update),
            r.user_hoan_thanh or "",
            fmt_dt(r.thoi_gian_hoan_thanh),
            r.link_yeu_cau or ""
        ]

        for col_idx, val in enumerate(row_data, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.border = border_thin
            if col_idx in [1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = 0
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 4, 12), 50)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def get_pim_logs(
    db: Session,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_thuc_hien: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50
) -> List[PIMLog]:
    """
    Lấy danh sách log thao tác PIM, mặc định 50 dòng mới nhất.
    """
    query = select(PIMLog)

    if user_thuc_hien and user_thuc_hien.strip():
        query = query.where(PIMLog.user_thuc_hien == user_thuc_hien.strip())

    if from_date:
        try:
            dt_from = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.where(PIMLog.thoi_gian >= dt_from)
        except Exception:
            pass

    if to_date:
        try:
            dt_to = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.where(PIMLog.thoi_gian < dt_to)
        except Exception:
            pass

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(
            PIMLog.id_yeu_cau.like(term),
            PIMLog.hanh_dong.like(term),
            PIMLog.noi_dung.like(term)
        ))

    query = query.order_by(desc(PIMLog.thoi_gian)).limit(limit)
    return db.execute(query).scalars().all()


def update_request_status(
    db: Session,
    pim_id: int,
    status_update: PIMStatusUpdate,
    current_username: str
) -> PIMRequest:
    """
    Cập nhật trạng thái hoàn thành hoặc trạng thái SO và ghi log.
    """
    req = db.get(PIMRequest, pim_id)
    if not req:
        raise ValueError(f"Không tìm thấy yêu cầu PIM có ID = {pim_id}")

    now = datetime.now()
    log_actions = []

    if status_update.trang_thai_thuc_hien is not None:
        old_status = req.trang_thai_thuc_hien
        new_status = status_update.trang_thai_thuc_hien.strip()
        if old_status != new_status:
            req.trang_thai_thuc_hien = new_status
            log_actions.append(f"Đổi trạng thái thực hiện từ '{old_status}' sang '{new_status}'")

    if status_update.so is not None:
        old_so = req.so
        new_so = status_update.so.strip()
        if old_so != new_so:
            req.so = new_so
            log_actions.append(f"Đổi trạng thái SO từ '{old_so}' sang '{new_so}'")

    if status_update.gui_mail is not None:
        old_gm = req.gui_mail
        new_gm = status_update.gui_mail.strip()
        if old_gm != new_gm:
            req.gui_mail = new_gm
            log_actions.append(f"Đổi gửi mail thông báo NH từ '{old_gm}' sang '{new_gm}'")

    if log_actions:
        req.user_update = current_username
        req.thoi_gian_update = now

        # Chỉ khi CẢ 3 (Trạng thái thực hiện, SO VÀ Gửi mail) đều là 'hoàn thành' mới ghi nhận hoàn thành toàn bộ
        is_all_completed = (
            (req.trang_thai_thuc_hien or "").strip() == "hoàn thành" and
            (req.so or "").strip() == "hoàn thành" and
            (req.gui_mail or "").strip() == "hoàn thành"
        )
        if is_all_completed:
            if not req.thoi_gian_hoan_thanh:
                req.thoi_gian_hoan_thanh = now
            if not req.user_hoan_thanh:
                req.user_hoan_thanh = current_username
        else:
            req.thoi_gian_hoan_thanh = None
            req.user_hoan_thanh = None

        db.add(PIMLog(
            id_yeu_cau=req.id_yeu_cau,
            hanh_dong="Cập nhật trạng thái / SO / Gửi mail",
            noi_dung=f"User '{current_username}' cập nhật: " + "; ".join(log_actions),
            user_thuc_hien=current_username,
            thoi_gian=now
        ))

    db.commit()
    db.refresh(req)
    return req


def assign_request_user(
    db: Session,
    pim_id: int,
    assign_update: PIMAssignUpdate,
    current_username: str
) -> PIMRequest:
    """
    Admin điều chuyển / phân công người thực hiện và ghi log.
    """
    req = db.get(PIMRequest, pim_id)
    if not req:
        raise ValueError(f"Không tìm thấy yêu cầu PIM có ID = {pim_id}")

    old_user = req.user_thuc_hien
    new_user = assign_update.user_thuc_hien.strip()

    if old_user != new_user:
        now = datetime.now()
        req.user_thuc_hien = new_user
        req.user_update = current_username
        req.thoi_gian_update = now

        db.add(PIMLog(
            id_yeu_cau=req.id_yeu_cau,
            hanh_dong="Điều chuyển người thực hiện",
            noi_dung=f"Điều chuyển từ '{old_user}' sang '{new_user}'",
            user_thuc_hien=current_username,
            thoi_gian=now
        ))
        db.commit()
        db.refresh(req)

    return req


def get_round_robin_users(db: Session) -> List[PIMUserThucHien]:
    """
    Lấy danh sách người thực hiện xoay vòng.
    """
    return db.execute(select(PIMUserThucHien).order_by(PIMUserThucHien.thu_tu)).scalars().all()


def create_round_robin_user(db: Session, user_in: PIMUserCreate, current_username: str) -> PIMUserThucHien:
    """
    Thêm nhân sự vào danh sách xoay vòng (chỉ Admin).
    """
    existing = db.execute(select(PIMUserThucHien).where(PIMUserThucHien.ten_user == user_in.ten_user.strip())).scalar_one_or_none()
    if existing:
        raise ValueError(f"Tên user '{user_in.ten_user}' đã tồn tại trong danh sách xoay vòng!")

    new_user = PIMUserThucHien(
        ten_user=user_in.ten_user.strip(),
        ho_ten=user_in.ho_ten.strip() if user_in.ho_ten else None,
        email=user_in.email.strip() if user_in.email else None,
        thu_tu=user_in.thu_tu,
        active=user_in.active if user_in.active is not None else True
    )
    db.add(new_user)

    db.add(PIMLog(
        id_yeu_cau="SYSTEM",
        hanh_dong="Thêm user xoay vòng",
        noi_dung=f"Thêm user '{new_user.ten_user}' (Thứ tự: {new_user.thu_tu})",
        user_thuc_hien=current_username
    ))

    db.commit()
    db.refresh(new_user)
    return new_user


def update_round_robin_user(db: Session, user_id: int, user_update: PIMUserUpdate, current_username: str) -> PIMUserThucHien:
    """
    Cập nhật thứ tự hoặc bật/tắt active của user xoay vòng (chỉ Admin).
    """
    u = db.get(PIMUserThucHien, user_id)
    if not u:
        raise ValueError("Không tìm thấy user trong danh sách xoay vòng!")

    changes = []
    if user_update.ten_user is not None and user_update.ten_user.strip() != u.ten_user:
        changes.append(f"Đổi tên từ '{u.ten_user}' sang '{user_update.ten_user.strip()}'")
        u.ten_user = user_update.ten_user.strip()
    if user_update.ho_ten is not None:
        u.ho_ten = user_update.ho_ten.strip()
    if user_update.email is not None:
        u.email = user_update.email.strip()
    if user_update.thu_tu is not None and user_update.thu_tu != u.thu_tu:
        changes.append(f"Đổi thứ tự từ {u.thu_tu} sang {user_update.thu_tu}")
        u.thu_tu = user_update.thu_tu
    if user_update.active is not None and user_update.active != u.active:
        status_text = "Hoạt động" if user_update.active else "Tạm nghỉ"
        changes.append(f"Đổi trạng thái thành '{status_text}'")
        u.active = user_update.active

    if changes:
        db.add(PIMLog(
            id_yeu_cau="SYSTEM",
            hanh_dong="Cập nhật user xoay vòng",
            noi_dung=f"User '{u.ten_user}': " + "; ".join(changes),
            user_thuc_hien=current_username
        ))

    db.commit()
    db.refresh(u)
    return u


def delete_round_robin_user(db: Session, user_id: int, current_username: str) -> bool:
    """
    Xóa user khỏi danh sách xoay vòng (chỉ Admin).
    """
    u = db.get(PIMUserThucHien, user_id)
    if not u:
        raise ValueError("Không tìm thấy user cần xóa!")

    user_name = u.ten_user
    db.delete(u)

    db.add(PIMLog(
        id_yeu_cau="SYSTEM",
        hanh_dong="Xóa user xoay vòng",
        noi_dung=f"Xóa user '{user_name}' khỏi danh sách xoay vòng",
        user_thuc_hien=current_username
    ))

    db.commit()
    return True


def get_pim_config(db: Session) -> PIMConfig:
    """
    Lấy thông tin cấu hình tài khoản SSO / PIM.
    Nếu chưa có bản ghi nào thì tự động tạo bản ghi mặc định.
    """
    cfg = db.execute(select(PIMConfig)).scalars().first()
    if not cfg:
        cfg = PIMConfig(
            sso_username="dung.nguyenanh@ggg.com.vn",
            sso_password="Nguyetthu28071995@@",
            user_cap_nhat="system"
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def update_pim_config(db: Session, config_in: PIMConfigUpdate, current_username: str) -> PIMConfig:
    """
    Super Admin cập nhật thông tin tài khoản đăng nhập SSO / PIM.
    """
    cfg = get_pim_config(db)
    old_user = cfg.sso_username
    cfg.sso_username = config_in.sso_username.strip()
    cfg.sso_password = config_in.sso_password.strip()
    cfg.ngay_cap_nhat = datetime.now()
    cfg.user_cap_nhat = current_username

    db.add(PIMLog(
        id_yeu_cau="PIM_CONFIG",
        hanh_dong="Cấu hình tài khoản SSO / PIM",
        noi_dung=f"Quản trị viên '{current_username}' cập nhật tài khoản: '{old_user}' -> '{cfg.sso_username}'",
        user_thuc_hien=current_username
    ))
    db.commit()
    db.refresh(cfg)
    return cfg


def test_pim_login(sso_username: str, sso_password: str) -> Dict[str, Any]:
    """
    Kiểm tra đăng nhập thử nghiệm SSO và PIM với username / password được chỉ định.
    """
    client = httpx.Client(verify=False, follow_redirects=True, timeout=25)
    try:
        r = client.get('https://sso.ggg.com.vn/Account/Login')
        token_match = re.search(r'name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"', r.text)
        if not token_match:
            token_match = re.search(r'value="([^"]+)"\s+name="__RequestVerificationToken"', r.text)
        token = token_match.group(1) if token_match else None

        login_res = client.post('https://sso.ggg.com.vn/Account/Login', data={
            'Username': sso_username.strip(),
            'Password': sso_password.strip(),
            'RememberLogin': 'true',
            '__RequestVerificationToken': token,
            'button': 'login'
        })

        if "Tên đăng nhập hoặc mật khẩu không hợp lệ" in login_res.text or "Invalid username or password" in login_res.text:
            return {"success": False, "message": "Đăng nhập thất bại: Tên đăng nhập hoặc mật khẩu SSO không chính xác!"}

        r_pim_sso = client.get('https://adminpim.ggg.com.vn/auth/auth/ssologin')
        token_search = re.search(r'token=([a-zA-Z0-9_\-]+)', str(r_pim_sso.url))
        if not token_search:
            if "error" in str(r_pim_sso.url).lower() or "login" in str(r_pim_sso.url).lower():
                return {"success": False, "message": "Đăng nhập SSO không thành công hoặc tài khoản chưa có quyền truy cập PIM!"}
            return {"success": False, "message": "Không thể lấy token xác thực PIM từ cổng SSO!"}

        return {"success": True, "message": f"Kiểm tra thành công! Tài khoản '{sso_username.strip()}' đăng nhập SSO & PIM hợp lệ."}
    except Exception as e:
        return {"success": False, "message": f"Lỗi kết nối khi thử đăng nhập: {str(e)}"}
    finally:
        client.close()


def get_pim_schedule(db: Session) -> PIMSchedule:
    """
    Lấy cấu hình 3 khung giờ quét PIM tự động trong ngày.
    Nếu chưa có bản ghi thì tạo mặc định: 03:00, 12:00, 16:30.
    """
    sched = db.execute(select(PIMSchedule)).scalars().first()
    if not sched:
        sched = PIMSchedule(
            time_1="03:00",
            time_2="12:00",
            time_3="16:30",
            is_active=True,
            user_cap_nhat="system"
        )
        db.add(sched)
        db.commit()
        db.refresh(sched)
    return sched


def update_pim_schedule(db: Session, sched_in: PIMScheduleUpdate, current_username: str) -> PIMSchedule:
    """
    Quản trị viên điều chỉnh 3 khung giờ quét PIM tự động trong ngày.
    """
    time_pattern = r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
    times = [
        ("Lần 1", sched_in.time_1.strip()),
        ("Lần 2", sched_in.time_2.strip()),
        ("Lần 3", sched_in.time_3.strip())
    ]
    for label, val in times:
        if not re.match(time_pattern, val):
            raise ValueError(f"[INVALID_TIME_FORMAT] Mốc thời gian {label} '{val}' không hợp lệ. Định dạng chuẩn là HH:MM từ 00:00 đến 23:59 (Ví dụ: 03:00, 12:00, 16:30).")

    sched = get_pim_schedule(db)
    old_info = f"Lần 1: {sched.time_1}, Lần 2: {sched.time_2}, Lần 3: {sched.time_3}"
    
    def _norm_time(val: Optional[str], default_val: str) -> str:
        if not val:
            return default_val
        val_str = str(val).strip()
        parts = val_str.split(":")
        if len(parts) >= 2:
            try:
                h, m = int(parts[0]), int(parts[1])
                return f"{h:02d}:{m:02d}"
            except Exception:
                pass
        return default_val

    sched.time_1 = _norm_time(sched_in.time_1, "03:00")
    sched.time_2 = _norm_time(sched_in.time_2, "12:00")
    sched.time_3 = _norm_time(sched_in.time_3, "16:30")
    if sched_in.is_active is not None:
        sched.is_active = sched_in.is_active
    sched.ngay_cap_nhat = datetime.now()
    sched.user_cap_nhat = current_username

    new_info = f"Lần 1: {sched.time_1}, Lần 2: {sched.time_2}, Lần 3: {sched.time_3} (Bật: {sched.is_active})"
    db.add(PIMLog(
        id_yeu_cau="PIM_SCHEDULE",
        hanh_dong="Cài đặt lịch quét PIM",
        noi_dung=f"User '{current_username}' cập nhật lịch quét tự động: '{old_info}' -> '{new_info}'",
        user_thuc_hien=current_username,
        thoi_gian=datetime.now()
    ))
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise RuntimeError(f"[DATABASE_ERROR] Lỗi khi lưu cấu hình lịch quét PIM vào cơ sở dữ liệu: {e}")

    db.refresh(sched)

    # Đồng bộ sang Job Scheduler
    try:
        from app.services.job_scheduler_service import job_scheduler_service
        if "job_sync_pim_requests" in job_scheduler_service._jobs:
            j = job_scheduler_service._jobs["job_sync_pim_requests"]
            j_sched = j.setdefault("schedule", {})
            j_sched["schedule_type"] = "daily"
            j_sched["time"] = sched.time_1
            j_sched["time_2"] = sched.time_2
            j_sched["time_3"] = sched.time_3
            j_sched["human_readable"] = job_scheduler_service._format_human_readable("daily", sched.time_1, 30, [1, 2, 3, 4, 5, 6, 7], time_2=sched.time_2, time_3=sched.time_3)
            j_sched["cron_expression"] = job_scheduler_service._build_cron("daily", sched.time_1, 30, [1, 2, 3, 4, 5, 6, 7], time_2=sched.time_2, time_3=sched.time_3)
            j["is_enabled"] = bool(sched.is_active)
            job_scheduler_service._save_config()
    except Exception as e:
        sched_logger.error(f"Lỗi đồng bộ cấu hình PIM sang Job Scheduler: {e}")

    return sched


async def pim_schedule_worker(stop_event: asyncio.Event):
    """
    Background worker kiểm tra và tự động kích hoạt đồng bộ PIM theo 3 khung giờ cài đặt trong ngày.
    """
    from app.core.database import SessionLocal
    sched_logger.info("Khởi động tiến trình chạy nền quét PIM tự động (PIM Schedule Worker)...")

    def _norm_time(val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        parts = str(val).strip().split(":")
        if len(parts) >= 2:
            try:
                h, m = int(parts[0]), int(parts[1])
                return f"{h:02d}:{m:02d}"
            except Exception:
                pass
        return None

    while not stop_event.is_set():
        try:
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            db = SessionLocal()
            try:
                sched = get_pim_schedule(db)
                if sched and sched.is_active:
                    raw_times = [sched.time_1, sched.time_2, sched.time_3]
                    target_times = [_norm_time(t) for t in raw_times if _norm_time(t)]
                    if not target_times:
                        target_times = ["03:00", "12:00", "16:30"]

                    if current_time in target_times:
                        # Kiểm tra xem đã chạy trong vòng 65 giây qua chưa để tránh lặp lại cùng 1 phút
                        should_run = True
                        if sched.last_run:
                            elapsed = (now - sched.last_run).total_seconds()
                            if elapsed < 65:
                                should_run = False

                        if should_run:
                            sched_logger.info(f"Đến khung giờ tự động quét PIM: {current_time}. Đang kích hoạt đồng bộ...")
                            sched.last_run = now
                            sched.last_status = "Đang chạy quét dữ liệu..."
                            db.commit()

                            try:
                                res = await asyncio.to_thread(sync_all_pim_data, db)
                                total = res.get("total_scanned", 0)
                                inserted = res.get("inserted", 0)
                                updated = res.get("updated", 0)
                                dur = round((datetime.now() - now).total_seconds(), 2)
                                status_msg = f"Thành công lúc {current_time} (Quét: {total} | Mới: {inserted} | Cập nhật: {updated})"
                                sched.last_status = status_msg
                                db.add(PIMLog(
                                    id_yeu_cau="SYSTEM_AUTO",
                                    hanh_dong="Tự động đồng bộ PIM theo lịch",
                                    noi_dung=f"Khung giờ {current_time}: {status_msg}",
                                    user_thuc_hien="Hệ thống (Auto)",
                                    thoi_gian=datetime.now()
                                ))
                                db.commit()
                                sched_logger.info(f"Tự động quét PIM hoàn tất: {status_msg}")

                                # Đồng bộ bản ghi log và kết quả chạy sang Job Scheduler
                                try:
                                    from app.services.job_scheduler_service import job_scheduler_service
                                    job_scheduler_service.record_external_job_run(
                                        job_id="job_sync_pim_requests",
                                        status="success",
                                        message=status_msg,
                                        details=f"Tự động quét PIM theo lịch 3 khung giờ lúc {current_time}:\n- Tổng quét: {total}\n- Mới: {inserted}\n- Cập nhật: {updated}",
                                        triggered_by="Hệ thống (Auto)",
                                        duration=dur,
                                        run_dt=now
                                    )
                                except Exception as e_log:
                                    sched_logger.error(f"Lỗi ghi nhận lịch sử PIM sang Job Scheduler: {e_log}")

                            except Exception as e:
                                dur = round((datetime.now() - now).total_seconds(), 2)
                                err_msg = f"Lỗi lúc {current_time}: {str(e)[:200]}"
                                sched.last_status = err_msg
                                db.add(PIMLog(
                                    id_yeu_cau="SYSTEM_AUTO",
                                    hanh_dong="Lỗi tự động đồng bộ PIM",
                                    noi_dung=err_msg,
                                    user_thuc_hien="Hệ thống (Auto)",
                                    thoi_gian=datetime.now()
                                ))
                                db.commit()
                                sched_logger.error(f"Lỗi khi tự động quét PIM: {str(e)}")

                                # Đồng bộ lỗi sang Job Scheduler
                                try:
                                    from app.services.job_scheduler_service import job_scheduler_service
                                    job_scheduler_service.record_external_job_run(
                                        job_id="job_sync_pim_requests",
                                        status="failed",
                                        message=err_msg,
                                        details=f"Lỗi khi tự động quét PIM lúc {current_time}: {str(e)}",
                                        triggered_by="Hệ thống (Auto)",
                                        duration=dur,
                                        run_dt=now
                                    )
                                except Exception as e_log:
                                    sched_logger.error(f"Lỗi ghi nhận lỗi PIM sang Job Scheduler: {e_log}")
            finally:
                db.close()
        except Exception as e:
            sched_logger.error(f"Lỗi vòng lặp PIM Schedule Worker: {str(e)}")

        # Chờ 20 giây trước lần kiểm tra tiếp theo
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=20.0)
        except asyncio.TimeoutError:
            pass

    sched_logger.info("Tiến trình chạy nền quét PIM tự động đã dừng.")


