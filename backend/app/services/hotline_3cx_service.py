from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import subprocess
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.hotline_call_log import HotlineCallLog
from app.models.restaurant import Restaurant

logger = logging.getLogger(__name__)

# Quản lý SSE subscribers (Web clients đang trực hotline)
_subscribers: Set[asyncio.Queue] = set()
_subscribers_lock = threading.Lock()

# Trạng thái Background Scanner
_scanner_running = False
_scanner_thread: Optional[threading.Thread] = None
_ps_listener_thread: Optional[threading.Thread] = None
_ps_listener_process: Optional[subprocess.Popen] = None
_last_detected_key: Optional[str] = None
_last_detected_time: float = 0.0

# Lưu trạng thái cuộc gọi hiện tại đang đàm thoại / mở kết nối
_current_active_call: Optional[Dict[str, Any]] = None


def get_ip_prefix(ip: Optional[str]) -> str:
    """Tách 3 octet đầu của IP để tạo prefix cho VNC/KDS (vd '10.8.46.1' -> '10.8.46.')"""
    if not ip:
        return ""
    clean = re.sub(r"[^0-9.]", ".", ip).rstrip(".")
    parts = clean.split(".")
    if len(parts) >= 3:
        return ".".join(parts[:3]) + "."
    return ""


def is_internal_caller(caller_raw_text: str, ext: str) -> bool:
    """Kiểm tra xem đây có phải là cuộc gọi nội bộ (IT Dept, đồng nghiệp, văn phòng) không"""
    raw_lower = (caller_raw_text or "").lower()
    internal_keywords = [
        "it dept", "its", "it support", "helpdesk", "hcm its", "hn its",
        "it mien nam", "it mien bac", "hr dept", "acc dept", "audit dept",
        "finance dept", "marketing dept", "bql", "hoi so", "van phong",
        "nguyen vi tram", "dung nguyen anh", "hoang le pham bao", "anh dung"
    ]
    for kw in internal_keywords:
        if kw in raw_lower:
            return True
    return False


def lookup_restaurant(db: Session, ext_str: str, caller_raw_text: str = "") -> Optional[Restaurant]:
    """
    Tra cứu nhà hàng theo số máy lẻ EXT, mã SAP, RK7, số điện thoại, hoặc tên nhà hàng.
    Nếu là đồng nghiệp / nhân viên IT nội bộ thì không gắn nhầm vào nhà hàng.
    """
    cleaned_ext = (ext_str or "").strip()

    # Nếu là cuộc gọi nội bộ IT / đồng nghiệp văn phòng -> Không tra cứu nhà hàng
    if is_internal_caller(caller_raw_text, cleaned_ext):
        return None

    # 1. Tra cứu trực tiếp theo cleaned_ext nếu là số hợp lệ
    if cleaned_ext and cleaned_ext.upper() != "EXT_3CX":
        # 1.1 Tìm chính xác theo cột ext (ví dụ: '9130')
        r = db.query(Restaurant).filter(Restaurant.ext == cleaned_ext).first()
        if r:
            return r
        # 1.2 Tìm chính xác theo mã SAP (ví dụ: '4391')
        r = db.query(Restaurant).filter(Restaurant.sap == cleaned_ext).first()
        if r:
            return r
        # 1.3 Tìm chính xác theo mã RK7 (ví dụ: '255')
        r = db.query(Restaurant).filter(Restaurant.rk7 == cleaned_ext).first()
        if r:
            return r
        # 1.4 Tìm chính xác theo mã Oracle (oracale)
        r = db.query(Restaurant).filter(Restaurant.oracale == cleaned_ext).first()
        if r:
            return r
        # 1.5 Tìm chính xác theo số điện thoại sdt_nh
        r = db.query(Restaurant).filter(Restaurant.sdt_nh == cleaned_ext).first()
        if r:
            return r
        # 1.6 Chỉ tìm LIKE số điện thoại nếu là số đầy đủ (từ 7 chữ số trở lên), tránh số 4 chữ số nội bộ bị match nhầm
        if len(cleaned_ext) >= 7:
            r = db.query(Restaurant).filter(Restaurant.sdt_nh.like(f"%{cleaned_ext}%")).first()
            if r:
                return r

    # 2. Trích xuất các số từ caller_raw_text nếu có (chỉ áp dụng khi không phải nhân viên nội bộ)
    if caller_raw_text:
        numbers = re.findall(r"\b\d{2,12}\b", caller_raw_text)
        for num in numbers:
            if num in ("5001", cleaned_ext):
                continue
            r = db.query(Restaurant).filter(Restaurant.ext == num).first()
            if r:
                return r
            r = db.query(Restaurant).filter(Restaurant.sap == num).first()
            if r:
                return r
            r = db.query(Restaurant).filter(Restaurant.rk7 == num).first()
            if r:
                return r
            r = db.query(Restaurant).filter(Restaurant.oracale == num).first()
            if r:
                return r
            if len(num) >= 7:
                r = db.query(Restaurant).filter(Restaurant.sdt_nh.like(f"%{num}%")).first()
                if r:
                    return r

        # 3. Tìm theo tên nhà hàng trong caller_raw_text
        clean_text = caller_raw_text
        for ign in ["3cx", "pwa", "incoming call", "cuộc gọi", "ringbot", "answer", "decline", "dept", "it dept", "hcm", "hn", "its"]:
            clean_text = re.sub(re.escape(ign), "", clean_text, flags=re.IGNORECASE)
        clean_text = clean_text.strip()
        if len(clean_text) >= 4:
            r = db.query(Restaurant).filter(Restaurant.res.ilike(f"%{clean_text}%")).first()
            if r:
                return r
            words = clean_text.split()
            if len(words) >= 2:
                phrase = " ".join([w for w in words if not w.isdigit()])
                if len(phrase) >= 4:
                    r = db.query(Restaurant).filter(Restaurant.res.ilike(f"%{phrase}%")).first()
                    if r:
                        return r
                return r
            words = clean_text.split()
            if len(words) >= 2:
                phrase = " ".join([w for w in words if not w.isdigit()])
                if len(phrase) >= 4:
                    r = db.query(Restaurant).filter(Restaurant.res.ilike(f"%{phrase}%")).first()
                    if r:
                        return r

    return None


def lookup_restaurant_by_ext(db: Session, ext_str: str) -> Optional[Restaurant]:
    """Hàm tương thích ngược với code cũ"""
    return lookup_restaurant(db, ext_str)


def broadcast_event(event_type: str, data: Dict[str, Any]):
    """Gửi sự kiện SSE tới tất cả các client web đang trực hotline"""
    payload = json.dumps({"event": event_type, "data": data}, ensure_ascii=False)
    message = f"event: {event_type}\ndata: {payload}\n\n"

    with _subscribers_lock:
        stale_queues = []
        for q in _subscribers:
            try:
                q.put_nowait(message)
            except Exception:
                stale_queues.append(q)
        for q in stale_queues:
            _subscribers.discard(q)


async def subscribe_events():
    """Tạo generator SSE stream cho client FastAPI"""
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    with _subscribers_lock:
        _subscribers.add(q)
    try:
        # Gửi ping ban đầu để thiết lập kết nối
        initial_ping = f": ping {datetime.now().isoformat()}\n\n"
        yield initial_ping

        while True:
            try:
                # Đợi sự kiện hoặc gửi heartbeat mỗi 15 giây
                msg = await asyncio.wait_for(q.get(), timeout=15.0)
                yield msg
            except asyncio.TimeoutError:
                yield f": heartbeat {datetime.now().isoformat()}\n\n"
    except (asyncio.CancelledError, GeneratorExit):
        pass
    finally:
        with _subscribers_lock:
            _subscribers.discard(q)


def process_incoming_call(
    ext: str,
    caller_raw_text: str = "",
    duty_user: Optional[str] = None,
    is_busy: bool = False,
    is_missed: bool = False,
) -> Dict[str, Any]:
    """
    Xử lý khi có sự kiện cuộc gọi 3CX đến hoặc cuộc gọi nhỡ:
    - Tra cứu thông tin nhà hàng trong database theo EXT, SAP, RK7, SĐT, hoặc Tên.
    - Nếu tìm thấy: Trả về thông tin nhà hàng để tự động popup modal Kết Nối Từ Xa VNC/KDS.
    - Nếu KHÔNG tìm thấy (Line ngoài danh mục/nội bộ): Vẫn hiển thị thông báo cuộc gọi đến rõ ràng và lưu vào lịch sử / cuộc gọi nhỡ.
    """
    global _current_active_call

    db = SessionLocal()
    try:
        restaurant = lookup_restaurant(db, ext, caller_raw_text)
        res_info = None
        if restaurant:
            res_info = {
                "id": restaurant.id,
                "res": restaurant.res or "Chưa rõ tên",
                "sap": restaurant.sap or "",
                "rk7": restaurant.rk7 or "",
                "ip": restaurant.ip or "",
                "ip_prefix": get_ip_prefix(restaurant.ip),
                "ext": restaurant.ext or ext,
                "brand": restaurant.brand or "",
                "region": restaurant.region or "",
                "trangthai": restaurant.trangthai or "ON",
                # Tiêu đề hiển thị chuẩn: ví dụ "4391 Ashima Nguyễn Trãi (RK7: 255) 10.8.130.1"
                "modal_title": (
                    f"{restaurant.sap + ' ' if restaurant.sap else ''}"
                    f"{restaurant.res or ''} "
                    f"(RK7: {restaurant.rk7 or '—'}) "
                    f"{restaurant.ip or ''}"
                ).strip(),
            }

        is_unlisted = (restaurant is None)

        if is_missed:
            call_status = "MISSED"
            is_resolved = False
            resolved_by = None
        elif is_busy:
            call_status = "BUSY"
            is_resolved = False
            resolved_by = None
        else:
            # Cuộc gọi đến đang đổ chuông: Trạng thái ban đầu là INCOMING (chưa nhỡ, đang reo)
            call_status = "INCOMING"
            is_resolved = False
            resolved_by = None

        # Tự động dọn dẹp các bản ghi cũ hơn 3 ngày để đảm bảo DB chỉ lưu 3 ngày gần nhất
        try:
            cleanup_old_call_logs(db)
        except Exception:
            pass

        log_entry = None
        # Nếu là cuộc gọi nhỡ, kiểm tra xem vừa có log cuộc gọi đến cùng EXT trong vòng 2 phút qua chưa
        if is_missed:
            cutoff = datetime.now() - timedelta(minutes=2)
            recent_call = db.query(HotlineCallLog).filter(
                HotlineCallLog.ext == ext,
                HotlineCallLog.created_at >= cutoff,
                HotlineCallLog.is_resolved == False
            ).order_by(desc(HotlineCallLog.id)).first()
            if recent_call:
                recent_call.call_status = "MISSED"
                recent_call.is_resolved = False
                if caller_raw_text and not recent_call.caller_raw_text:
                    recent_call.caller_raw_text = caller_raw_text[:250]
                db.commit()
                db.refresh(recent_call)
                log_entry = recent_call

        if not log_entry:
            log_entry = HotlineCallLog(
                ext=ext,
                caller_raw_text=caller_raw_text[:250] if caller_raw_text else None,
                restaurant_id=res_info["id"] if res_info else None,
                restaurant_name=(res_info["res"] if res_info else (caller_raw_text or f"Máy nhánh {ext}"))[:250],
                restaurant_sap=(res_info["sap"] if res_info else None),
                restaurant_rk7=(res_info["rk7"] if res_info else None),
                restaurant_ip=(res_info["ip"] if res_info else None),
                call_status=call_status,
                is_resolved=is_resolved,
                resolved_at=datetime.now() if is_resolved else None,
                resolved_by=resolved_by,
                duty_user=duty_user,
                created_at=datetime.now(),
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)

        call_data = {
            "call_id": log_entry.id,
            "ext": ext,
            "caller_raw_text": caller_raw_text,
            "restaurant": res_info if not is_unlisted else None,
            "restaurant_name": log_entry.restaurant_name,
            "call_status": call_status,
            "is_busy": is_busy,
            "is_missed": is_missed,
            "is_unlisted": is_unlisted,
            "is_resolved": is_resolved,
            "duty_user": duty_user,
            "created_at": log_entry.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }

        if is_missed or is_busy:
            # Cuộc gọi nhỡ / bận -> Bắn event missed_call để hiển thị và nhảy badge
            broadcast_event("missed_call", call_data)
        else:
            # Cuộc gọi đang đến -> Kích hoạt cuộc gọi active & bắn event incoming_call (cả nhà hàng lẫn line ngoài)
            _current_active_call = call_data
            broadcast_event("incoming_call", call_data)

        return call_data
    except Exception as e:
        db.rollback()
        logger.error("Lỗi khi xử lý incoming/missed call 3CX: %s", e)
        raise e
    finally:
        db.close()


def cleanup_old_call_logs(db: Session) -> int:
    """
    Xóa các bản ghi lịch sử cuộc gọi cũ hơn 3 ngày khỏi database để đảm bảo
    chỉ lưu trữ tối đa 3 ngày gần nhất theo yêu cầu.
    """
    try:
        three_days_ago = datetime.now() - timedelta(days=3)
        deleted = db.query(HotlineCallLog).filter(
            HotlineCallLog.created_at < three_days_ago
        ).delete(synchronize_session=False)
        if deleted > 0:
            db.commit()
            logger.info("Đã dọn dẹp %d bản ghi cuộc gọi cũ hơn 3 ngày khỏi database", deleted)
        return deleted
    except Exception as e:
        db.rollback()
        logger.warning("Lỗi dọn dẹp log cuộc gọi cũ: %s", e)
        return 0


def handle_call_ended(ext: str, caller_raw_text: str = "") -> Optional[HotlineCallLog]:
    """
    Xử lý khi 3CX báo cuộc gọi kết thúc (Call ended).
    Khi 3CX báo Call ended (mà không có sự kiện Missed call trước đó),
    nghĩa là cuộc gọi đã được nhấc máy/bắt máy đàm thoại thành công!
    Tự động cập nhật cuộc gọi này sang trạng thái ĐÃ NGHE (ANSWERED, is_resolved=True),
    tránh bị ghi nhận nhầm thành cuộc gọi nhỡ.
    """
    global _current_active_call
    db = SessionLocal()
    try:
        # Tìm cuộc gọi gần nhất trong vòng 15 phút qua của EXT này đang ở trạng thái chưa giải quyết
        cutoff = datetime.now() - timedelta(minutes=15)
        recent_call = db.query(HotlineCallLog).filter(
            HotlineCallLog.ext == ext,
            HotlineCallLog.created_at >= cutoff,
            HotlineCallLog.is_resolved == False
        ).order_by(desc(HotlineCallLog.id)).first()

        # Nếu không tìm theo ext, thử tìm theo _current_active_call nếu có
        if not recent_call and _current_active_call and _current_active_call.get("call_id"):
            recent_call = db.query(HotlineCallLog).filter(
                HotlineCallLog.id == _current_active_call["call_id"],
                HotlineCallLog.is_resolved == False
            ).first()

        if recent_call:
            recent_call.call_status = "ANSWERED"
            recent_call.is_resolved = True
            recent_call.resolved_at = datetime.now()
            recent_call.resolved_by = "3CX Phone (Đã bắt máy)"
            if caller_raw_text and not recent_call.caller_raw_text:
                recent_call.caller_raw_text = caller_raw_text[:250]
            db.commit()
            db.refresh(recent_call)

            logger.info(
                "3CX Call Ended -> Đã tự động cập nhật cuộc gọi ID=%s (EXT=%s) sang ĐÃ NGHE (ANSWERED)",
                recent_call.id,
                ext,
            )
            broadcast_event("call_answered", {
                "call_id": recent_call.id,
                "ext": ext,
                "resolved_by": recent_call.resolved_by,
            })
            return recent_call
        return None
    except Exception as e:
        db.rollback()
        logger.error("Lỗi khi xử lý 3CX call ended: %s", e)
        return None
    finally:
        db.close()


def end_current_call(call_id: Optional[int] = None) -> bool:
    """Đánh dấu cuộc gọi hiện tại đã kết thúc (kỹ thuật viên đóng modal VNC/KDS)"""
    global _current_active_call
    _current_active_call = None
    broadcast_event("call_ended", {"call_id": call_id, "timestamp": datetime.now().isoformat()})
    return True


def mark_call_answered(db: Session, call_id: int, duty_user: Optional[str] = None) -> bool:
    """Đánh dấu cuộc gọi là đã nghe (ANSWERED) và lưu vào danh sách đã nghe (Tab 2)"""
    call = db.query(HotlineCallLog).filter(HotlineCallLog.id == call_id).first()
    if not call:
        return False
    call.call_status = "ANSWERED"
    call.is_resolved = True
    call.resolved_at = datetime.now()
    if duty_user:
        call.resolved_by = duty_user
    db.commit()
    broadcast_event("call_answered", {"call_id": call_id})
    return True


def get_missed_calls(
    db: Session,
    unresolved_only: bool = True,
    limit: int = 100,
    current_username: Optional[str] = None,
    all_agents: bool = False,
) -> List[Dict[str, Any]]:
    """
    Lấy danh sách các cuộc gọi nhỡ / bận cần gọi lại (Tab 1), chỉ lưu và lấy trong 3 ngày gần nhất.
    Lọc nghiêm ngặt theo Agent đang xem để tránh hiển thị lẫn lộn các user khác.
    """
    from sqlalchemy import or_, and_, func
    three_days_ago = datetime.now() - timedelta(days=3)
    cutoff_incoming = datetime.now() - timedelta(minutes=3)

    query = db.query(HotlineCallLog).filter(
        HotlineCallLog.created_at >= three_days_ago,
        (
            HotlineCallLog.call_status.in_(["MISSED", "BUSY"])
            | ((HotlineCallLog.call_status == "INCOMING") & (HotlineCallLog.created_at < cutoff_incoming))
        )
    )
    if unresolved_only:
        query = query.filter(HotlineCallLog.is_resolved == False)

    clean_user = (current_username or "").strip().lower()
    if clean_user and not all_agents:
        # 1. Cuộc gọi nhà hàng chung (không gán riêng ai, hoặc gán group/server)
        # 2. Hoặc cuộc gọi gán đích danh cho Agent này (cả nhà hàng lẫn nội bộ)
        # Tuyệt đối không hiển thị cuộc gọi riêng của Agent khác!
        query = query.filter(
            or_(
                func.lower(HotlineCallLog.duty_user) == clean_user,
                and_(
                    HotlineCallLog.restaurant_id != None,
                    or_(
                        HotlineCallLog.duty_user == None,
                        HotlineCallLog.duty_user == "",
                        func.lower(HotlineCallLog.duty_user).in_(["3cx pwa client", "pbx server", "ring group"])
                    )
                )
            )
        )
    elif not clean_user and not all_agents:
        # Nếu không có user: Chỉ lấy cuộc gọi nhà hàng chung
        query = query.filter(
            and_(
                HotlineCallLog.restaurant_id != None,
                or_(
                    HotlineCallLog.duty_user == None,
                    HotlineCallLog.duty_user == "",
                    func.lower(HotlineCallLog.duty_user).in_(["3cx pwa client", "pbx server", "ring group"])
                )
            )
        )

    items = query.order_by(desc(HotlineCallLog.created_at)).limit(limit).all()
    results = []
    for it in items:
        display_status = "MISSED" if it.call_status == "INCOMING" else it.call_status
        results.append({
            "id": it.id,
            "ext": it.ext,
            "caller_raw_text": it.caller_raw_text,
            "restaurant_id": it.restaurant_id,
            "restaurant_name": it.restaurant_name or (it.caller_raw_text or f"Line {it.ext}"),
            "restaurant_sap": it.restaurant_sap or "",
            "restaurant_rk7": it.restaurant_rk7 or "",
            "restaurant_ip": it.restaurant_ip or "",
            "ip_prefix": get_ip_prefix(it.restaurant_ip),
            "call_status": display_status,
            "is_resolved": it.is_resolved,
            "resolved_at": it.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if it.resolved_at else None,
            "resolved_by": it.resolved_by,
            "duty_user": it.duty_user,
            "created_at": it.created_at.strftime("%Y-%m-%d %H:%M:%S") if it.created_at else "",
        })
    return results


def get_answered_calls(
    db: Session,
    limit: int = 100,
    current_username: Optional[str] = None,
    all_agents: bool = False,
) -> List[Dict[str, Any]]:
    """
    Lấy danh sách lịch sử các cuộc gọi tới đã nghe hoặc tiếp nhận (Tab 2) trong 3 ngày gần nhất.
    Mỗi Agent chỉ hiển thị lịch sử cuộc gọi của chính Agent đó để tránh dùng chung lẫn lộn.
    """
    from sqlalchemy import or_, func
    three_days_ago = datetime.now() - timedelta(days=3)
    query = db.query(HotlineCallLog).filter(
        HotlineCallLog.created_at >= three_days_ago,
        (
            (HotlineCallLog.call_status == "ANSWERED")
            | (HotlineCallLog.is_resolved == True)
        )
    )

    clean_user = (current_username or "").strip().lower()
    if clean_user and not all_agents:
        # CHỈ LẤY các cuộc gọi mà Agent này tiếp nhận hoặc bấm xử lý Done
        query = query.filter(
            or_(
                func.lower(HotlineCallLog.duty_user) == clean_user,
                func.lower(HotlineCallLog.resolved_by) == clean_user
            )
        )
    elif not clean_user and not all_agents:
        # Nếu không có user: Chỉ lấy các cuộc gọi nhà hàng
        query = query.filter(HotlineCallLog.restaurant_id != None)

    items = query.order_by(desc(HotlineCallLog.created_at)).limit(limit).all()
    results = []
    for it in items:
        results.append({
            "id": it.id,
            "ext": it.ext,
            "caller_raw_text": it.caller_raw_text,
            "restaurant_id": it.restaurant_id,
            "restaurant_name": it.restaurant_name or "Line ngoài danh mục",
            "restaurant_sap": it.restaurant_sap or "",
            "restaurant_rk7": it.restaurant_rk7 or "",
            "restaurant_ip": it.restaurant_ip or "",
            "ip_prefix": get_ip_prefix(it.restaurant_ip),
            "call_status": it.call_status or "ANSWERED",
            "is_resolved": it.is_resolved,
            "resolved_at": it.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if it.resolved_at else None,
            "resolved_by": it.resolved_by,
            "duty_user": it.duty_user,
            "created_at": it.created_at.strftime("%Y-%m-%d %H:%M:%S") if it.created_at else "",
        })
    return results


def resolve_single_missed_call(db: Session, call_id: int, resolved_by: Optional[str] = None) -> bool:
    """Đánh dấu 1 cuộc gọi nhỡ là Done (Đã gọi lại)"""
    call = db.query(HotlineCallLog).filter(HotlineCallLog.id == call_id).first()
    if not call:
        return False
    call.is_resolved = True
    call.resolved_at = datetime.now()
    call.resolved_by = resolved_by or "IT Hotline"
    db.commit()

    # Bắn event cập nhật danh sách cuộc gọi nhỡ
    broadcast_event("missed_call_resolved", {"call_id": call_id, "resolved_by": call.resolved_by})
    return True


def resolve_all_missed_calls(
    db: Session,
    resolved_by: Optional[str] = None,
    current_username: Optional[str] = None,
) -> int:
    """Đánh dấu các cuộc gọi nhỡ của Agent hiện tại là Done (Check All đóng hàng loạt)"""
    from sqlalchemy import or_, and_, func
    three_days_ago = datetime.now() - timedelta(days=3)
    query = db.query(HotlineCallLog).filter(
        HotlineCallLog.created_at >= three_days_ago,
        HotlineCallLog.call_status.in_(["MISSED", "BUSY", "INCOMING"]),
        HotlineCallLog.is_resolved == False
    )

    clean_user = (current_username or "").strip().lower()
    if clean_user:
        # Chỉ đóng các cuộc gọi nhỡ mà Agent này có quyền xem (cuộc gọi của chính mình hoặc cuộc gọi nhà hàng chung)
        query = query.filter(
            or_(
                func.lower(HotlineCallLog.duty_user) == clean_user,
                and_(
                    HotlineCallLog.restaurant_id != None,
                    or_(
                        HotlineCallLog.duty_user == None,
                        HotlineCallLog.duty_user == "",
                        func.lower(HotlineCallLog.duty_user).in_(["3cx pwa client", "pbx server", "ring group"])
                    )
                )
            )
        )

    calls = query.all()
    count = len(calls)
    now = datetime.now()
    user = resolved_by or current_username or "IT Hotline"
    for c in calls:
        c.is_resolved = True
        c.resolved_at = now
        c.resolved_by = user
    db.commit()

    broadcast_event("all_missed_calls_resolved", {"resolved_count": count, "resolved_by": user})
    return count


# ════════════════════════════════════════════════════════════════════════════════
# BACKGROUND SCANNER: Quét cửa sổ 3CX (PWA) trên Windows
# ════════════════════════════════════════════════════════════════════════════════

def parse_3cx_window_texts(texts: List[str]) -> Optional[Dict[str, Any]]:
    """
    Phân tích các đoạn văn bản đọc được từ cửa sổ 3CX PWA trên Windows:
    - Nhận biết cuộc gọi đến (Incoming call / Answer / Decline / Ringing)
    - Nhận biết cuộc gọi nhỡ (Missed call toast / Cuộc gọi nhỡ)
    - Trích xuất EXT và Caller info
    """
    joined_lower = " ".join(texts).lower()
    lower_texts = [t.lower() for t in texts]

    # Kiểm tra xem đây có phải là cửa sổ trình duyệt / PWA chính đang mở xem bình thường không
    # (chứ không phải hộp thoại pop-up / toast thông báo cuộc gọi)
    is_main_browser_window = any(
        k in joined_lower for k in [
            "address and search bar",
            "chrome legacy window",
            "side panel resize",
            "split view resize",
            "view site information",
            "customize and control 3cx",
        ]
    )

    has_3cx_context = any(
        any(k in lt for k in ["3cx", "ringbot", ":5001", "cuộc gọi", "call"])
        for lt in lower_texts
    )

    # 1. Phát hiện cuộc gọi đến
    # - Nếu là popup/toast: có từ incoming call / cuộc gọi đến hoặc (3cx và answer/decline)
    # - Nếu là cửa sổ chính: PHẢI có cả 'answer' và 'decline' (hoặc 'incoming call' / 'cuộc gọi đến')
    has_incoming = False
    if "incoming call" in joined_lower or "cuộc gọi đến" in joined_lower:
        has_incoming = True
    elif is_main_browser_window:
        if ("answer" in joined_lower or "trả lời" in joined_lower) and ("decline" in joined_lower or "từ chối" in joined_lower):
            has_incoming = True
    elif has_3cx_context and any(k in joined_lower for k in ["incoming", "answer", "decline", "trả lời", "từ chối"]):
        has_incoming = True

    # 2. Phát hiện cuộc gọi nhỡ
    # Chú ý: Cửa sổ chính 3CX có tab navigation tên là 'Missed - 3CX', đây KHÔNG PHẢI là sự kiện cuộc gọi nhỡ real-time!
    # Sự kiện cuộc gọi nhỡ chỉ xuất hiện qua Toast thông báo (không phải main browser) hoặc chuỗi thông báo cụ thể
    has_missed = False
    if not has_incoming and not is_main_browser_window:
        if "missed call" in joined_lower or "cuộc gọi nhỡ" in joined_lower:
            has_missed = True
        elif has_3cx_context and any(k in joined_lower for k in ["missed", "nhỡ"]):
            has_missed = True

    if has_incoming:
        call_type = "INCOMING"
    elif has_missed:
        call_type = "MISSED"
    else:
        return None

    ignore_keywords = [
        "incoming call", "cuộc gọi đến", "missed call", "cuộc gọi nhỡ",
        "incoming", "missed", "ringbot", "ringing", "answer", "decline",
        "trả lời", "từ chối", "clear", "3cx", "pwa", "close", "minimize",
        "restore", "maximize", "system", "notification", "http", ".co:",
        "site information", "view site", "chrome", "address and search bar",
        "split view", "side panel", "customize and control", "legacy window"
    ]

    extracted_ext = None
    caller_text = ""

    for t in texts:
        t_clean = t.strip()
        lt = t_clean.lower()
        if any(ign in lt for ign in ignore_keywords) or lt.startswith("ggg.ringbot") or ":5001" in lt:
            continue
        # Tìm số EXT từ 2 đến 12 chữ số
        m = re.search(r"\b(\d{2,12})\b", t_clean)
        if m and not extracted_ext:
            if m.group(1) == "5001":
                continue
            extracted_ext = m.group(1)
            caller_text = t_clean
            break
        if not caller_text and len(t_clean) >= 2:
            caller_text = t_clean

    # Cuộc gọi hợp lệ BẮT BUỘC phải trích xuất được số máy nhánh / số điện thoại dạng số
    if not extracted_ext:
        return None

    return {
        "call_type": call_type,
        "ext": extracted_ext,
        "caller_text": caller_text or f"Máy nhánh {extracted_ext}",
    }


def _scan_3cx_windows_worker():
    """
    Worker thread chạy ngầm trên Windows.
    Sử dụng UIAutomation để tìm cửa sổ 3CX (PWA) khi có cuộc gọi đến hoặc cuộc gọi nhỡ.
    """
    global _scanner_running, _last_detected_key, _last_detected_time

    # 1. Desktop binding PHẢI thực hiện trước bất kỳ COM hoặc UI hook nào trên thread này
    try:
        import win32service
        import win32con
        winsta0 = win32service.OpenWindowStation("WinSta0", False, win32con.MAXIMUM_ALLOWED)
        winsta0.SetProcessWindowStation()
        desk = win32service.OpenDesktop("default", 0, False, win32con.MAXIMUM_ALLOWED)
        desk.SetThreadDesktop()
        logger.info("3CX Scanner: Gán thread vào WinSta0\\default thành công!")
    except Exception as e_bind:
        logger.warning("3CX Scanner: Desktop binding warning: %s", e_bind)

    # 2. Bây giờ mới import uiautomation trên thread này
    try:
        import uiautomation as auto
        import pythoncom
    except ImportError as e:
        logger.warning("Không thể khởi động 3CX scanner do thiếu thư viện Windows UI: %s", e)
        return

    # Tắt log spam từ comtypes và uiautomation
    logging.getLogger("comtypes").setLevel(logging.WARNING)
    logging.getLogger("uiautomation").setLevel(logging.WARNING)

    logger.info("Bắt đầu tiến trình quét cửa sổ 3CX PWA trên Windows Desktop...")

    try:
        with auto.UIAutomationInitializerInThread():
            while _scanner_running:
                active_call_found = False
                try:
                    root = auto.GetRootControl()
                    if not root:
                        time.sleep(0.5)
                        continue

                    for w in root.GetChildren():
                        name = (w.Name or "").strip()
                        cls = (w.ClassName or "").strip()

                        is_candidate = (
                            "3cx" in name.lower()
                            or "ringbot" in name.lower()
                            or "incoming" in name.lower()
                            or "cuộc gọi" in name.lower()
                            or "missed" in name.lower()
                            or "toast" in cls.lower()
                            or "notification" in cls.lower()
                            or (cls == "Chrome_WidgetWin_1" and ("3cx" in name.lower() or "ringbot" in name.lower() or not name))
                        )
                        if not is_candidate:
                            continue

                        texts: List[str] = [name] if name else []
                        try:
                            for desc_ctrl, _ in auto.WalkControl(w, maxDepth=8):
                                t = (desc_ctrl.Name or "").strip()
                                if t and t not in texts:
                                    texts.append(t)
                        except Exception:
                            pass

                        parsed = parse_3cx_window_texts(texts)
                        if not parsed:
                            continue

                        active_call_found = True
                        call_type = parsed["call_type"]
                        ext = parsed["ext"]
                        caller_text = parsed["caller_text"]

                        now = time.time()
                        call_key = f"{call_type}_{ext}_{caller_text}"

                        # Debounce chống lặp lại
                        if call_key != _last_detected_key or (now - _last_detected_time > 20.0):
                            _last_detected_key = call_key
                            _last_detected_time = now

                            if call_type == "INCOMING":
                                is_currently_busy = (_current_active_call is not None)
                                logger.info(
                                    "Phát hiện cuộc gọi 3CX đến! EXT=%s, Caller='%s', Busy=%s",
                                    ext,
                                    caller_text,
                                    is_currently_busy,
                                )
                                process_incoming_call(
                                    ext=ext,
                                    caller_raw_text=caller_text,
                                    is_busy=is_currently_busy,
                                    is_missed=False,
                                )
                            elif call_type == "MISSED":
                                logger.info(
                                    "Phát hiện cuộc gọi 3CX nhỡ! EXT=%s, Caller='%s'",
                                    ext,
                                    caller_text,
                                )
                                process_incoming_call(
                                    ext=ext,
                                    caller_raw_text=caller_text,
                                    is_busy=False,
                                    is_missed=True,
                                )
                        break

                    if not active_call_found:
                        if _last_detected_key and (time.time() - _last_detected_time > 3.0):
                            _last_detected_key = None

                except Exception as ex:
                    logger.debug("Lỗi trong vòng lặp quét 3CX: %s", ex)

                time.sleep(0.4)
    except Exception as e_init:
        logger.error("Lỗi khởi tạo UIAutomation cho 3CX scanner: %s", e_init)

    logger.info("Đã dừng tiến trình quét cửa sổ 3CX PWA.")


def _run_ps_notification_listener():
    """
    Tiến trình lắng nghe thông báo Windows Toast từ 3CX PWA thông qua UserNotificationListener.
    Bắt 100% chính xác sự kiện cuộc gọi đến (Incoming), cuộc gọi nhỡ (Missed) và kết thúc cuộc gọi (Call ended).
    """
    global _scanner_running, _ps_listener_process, _current_active_call
    ps_script_path = os.path.join(os.path.dirname(__file__), "3cx_listener.ps1")
    if not os.path.exists(ps_script_path):
        logger.warning("Không tìm thấy file %s, bỏ qua PowerShell Toast listener", ps_script_path)
        return

    logger.info("Khởi động PowerShell 3CX Windows Toast Listener (%s)...", ps_script_path)
    while _scanner_running:
        try:
            _ps_listener_process = subprocess.Popen(
                ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", ps_script_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                bufsize=1,
            )

            for line in _ps_listener_process.stdout:
                if not _scanner_running:
                    break
                line = line.strip()
                if not line or line == "READY":
                    continue
                try:
                    data = json.loads(line)
                    raw_texts = data.get("texts", "")
                    if not raw_texts:
                        continue

                    # Chuỗi dạng: "Missed call // 8345 Hoang Le Pham Bao HCM IT Dept" hoặc "Incoming call // 8345..."
                    parts = [p.strip() for p in raw_texts.split(" // ")]
                    header = parts[0] if len(parts) > 0 else ""
                    caller_text = parts[1] if len(parts) > 1 else header

                    h_lower = header.lower()
                    c_lower = caller_text.lower()

                    # Chỉ xử lý các thông báo liên quan đến cuộc gọi
                    if not any(k in h_lower or k in c_lower for k in ["call", "cuộc gọi", "incoming", "missed", "ended", "ringing"]):
                        continue

                    is_incoming = any(k in h_lower for k in ["incoming call", "cuộc gọi đến", "incoming", "ringing"])
                    is_missed = any(k in h_lower for k in ["missed call", "cuộc gọi nhỡ", "missed", "nhỡ"])
                    is_ended = any(k in h_lower for k in ["call ended", "kết thúc", "ended"])

                    m = re.search(r"\b(\d{2,12})\b", caller_text)
                    ext = m.group(1) if m else "EXT_3CX"

                    logger.info(
                        "3CX Toast Event: Header='%s', Caller='%s', EXT=%s, Incoming=%s, Missed=%s, Ended=%s",
                        header, caller_text, ext, is_incoming, is_missed, is_ended
                    )

                    if is_incoming:
                        is_busy = (_current_active_call is not None)
                        process_incoming_call(
                            ext=ext,
                            caller_raw_text=caller_text,
                            is_busy=is_busy,
                            is_missed=False,
                        )
                    elif is_missed:
                        process_incoming_call(
                            ext=ext,
                            caller_raw_text=caller_text,
                            is_busy=False,
                            is_missed=True,
                        )
                    elif is_ended:
                        handle_call_ended(ext=ext, caller_raw_text=caller_text)
                        end_current_call()
                except Exception as ex_json:
                    logger.debug("Lỗi parse notification JSON: %s (line: %s)", ex_json, line)
        except Exception as ex_proc:
            logger.warning("PowerShell listener gặp lỗi: %s, thử lại sau 2 giây...", ex_proc)
            time.sleep(2.0)


def start_scanner() -> bool:
    """Bật background scanner (Cả Windows Toast Notification Listener và UIAutomation Window Scanner)"""
    global _scanner_running, _scanner_thread, _ps_listener_thread
    if _scanner_running:
        return True
    _scanner_running = True

    # Dọn dẹp các cuộc gọi cũ hơn 3 ngày khỏi database khi khởi động scanner
    db = SessionLocal()
    try:
        cleanup_old_call_logs(db)
    except Exception:
        pass
    finally:
        db.close()

    # 1. Khởi động PowerShell Toast Listener (chính xác 100% cho 3CX PWA Toasts)
    _ps_listener_thread = threading.Thread(
        target=_run_ps_notification_listener,
        daemon=True,
        name="3CX_Toast_Listener_Thread"
    )
    _ps_listener_thread.start()

    # 2. Khởi động UIAutomation Scanner (dự phòng cho cửa sổ desktop)
    _scanner_thread = threading.Thread(
        target=_scan_3cx_windows_worker,
        daemon=True,
        name="3CX_Window_Scanner_Thread"
    )
    _scanner_thread.start()
    return True


def stop_scanner() -> bool:
    """Tắt background scanner"""
    global _scanner_running, _ps_listener_process
    _scanner_running = False
    if _ps_listener_process:
        try:
            _ps_listener_process.terminate()
        except Exception:
            pass
    return True


def get_status(current_username: Optional[str] = None) -> Dict[str, Any]:
    """Lấy trạng thái hệ thống trực hotline (chỉ tính cuộc gọi nhỡ chưa giải quyết trong 3 ngày gần nhất)"""
    db = SessionLocal()
    try:
        from sqlalchemy import func, or_, and_
        clean_user = (current_username or "").strip().lower()
        three_days_ago = datetime.now() - timedelta(days=3)
        cutoff_incoming = datetime.now() - timedelta(minutes=3)
        # Đếm cuộc gọi nhỡ chưa giải quyết lọc theo Agent đang xem
        count_query = db.query(HotlineCallLog).filter(
            HotlineCallLog.created_at >= three_days_ago,
            HotlineCallLog.is_resolved == False,
            (
                HotlineCallLog.call_status.in_(["MISSED", "BUSY"])
                | ((HotlineCallLog.call_status == "INCOMING") & (HotlineCallLog.created_at < cutoff_incoming))
            )
        )
        if clean_user:
            count_query = count_query.filter(
                or_(
                    func.lower(HotlineCallLog.duty_user) == clean_user,
                    and_(
                        HotlineCallLog.restaurant_id != None,
                        or_(
                            HotlineCallLog.duty_user == None,
                            HotlineCallLog.duty_user == "",
                            func.lower(HotlineCallLog.duty_user).in_(["3cx pwa client", "pbx server", "ring group"])
                        )
                    )
                )
            )
        else:
            count_query = count_query.filter(
                and_(
                    HotlineCallLog.restaurant_id != None,
                    or_(
                        HotlineCallLog.duty_user == None,
                        HotlineCallLog.duty_user == "",
                        func.lower(HotlineCallLog.duty_user).in_(["3cx pwa client", "pbx server", "ring group"])
                    )
                )
            )
        unresolved_count = count_query.count()

        # 1. Lọc cuộc gọi đang reo (current_call) phù hợp với người dùng hiện tại
        call_to_return = None
        if _current_active_call:
            call_duty = (_current_active_call.get("duty_user") or "").strip().lower()
            is_restaurant = bool(_current_active_call.get("restaurant"))
            has_specific_agent = bool(
                call_duty and call_duty not in ["3cx pwa client", "pbx server", "ring group"]
            )

            if is_restaurant:
                # Cuộc gọi nhà hàng:
                # Nếu có agent cụ thể -> chỉ hiển thị mở VNC cho chính agent đó
                # Nếu không có agent cụ thể (cuộc gọi chung) -> hiển thị cho tất cả kỹ thuật viên đang trực
                if not has_specific_agent or (clean_user and call_duty == clean_user):
                    call_to_return = _current_active_call
                elif not clean_user and not has_specific_agent:
                    call_to_return = _current_active_call
            else:
                # Cuộc gọi nội bộ (đồng nghiệp IT, không phải nhà hàng):
                # TUYỆT ĐỐI chỉ hiển thị cho chính agent nhận cuộc gọi!
                if clean_user and has_specific_agent and call_duty == clean_user:
                    call_to_return = _current_active_call
                else:
                    call_to_return = None

        # 2. Lấy thông tin cuộc gọi chưa xử lý mới nhất (latest_call_info):
        # TUYỆT ĐỐI KHÔNG trả về cuộc gọi nội bộ của người khác cho client này!
        latest_call_query = db.query(HotlineCallLog).filter(
            HotlineCallLog.created_at >= three_days_ago,
            HotlineCallLog.is_resolved == False
        )
        if clean_user:
            # Cuộc gọi nhà hàng HOẶC cuộc gọi nội bộ thuộc về chính user này
            latest_unresolved = latest_call_query.filter(
                or_(
                    HotlineCallLog.restaurant_id != None,
                    and_(
                        HotlineCallLog.restaurant_id == None,
                        func.lower(HotlineCallLog.duty_user) == clean_user
                    )
                )
            ).order_by(desc(HotlineCallLog.id)).first()
        else:
            # Nếu không truyền username: Chỉ lấy cuộc gọi nhà hàng
            latest_unresolved = latest_call_query.filter(
                HotlineCallLog.restaurant_id != None
            ).order_by(desc(HotlineCallLog.id)).first()

        latest_call_info = None
        if latest_unresolved:
            latest_call_info = {
                "id": latest_unresolved.id,
                "ext": latest_unresolved.ext,
                "caller_raw_text": latest_unresolved.caller_raw_text or f"Máy nhánh {latest_unresolved.ext}",
                "restaurant_id": latest_unresolved.restaurant_id,
                "restaurant_name": latest_unresolved.restaurant_name,
                "call_status": latest_unresolved.call_status,
                "is_resolved": latest_unresolved.is_resolved,
                "is_restaurant": bool(latest_unresolved.restaurant_id),
                "duty_user": latest_unresolved.duty_user,
                "created_at": latest_unresolved.created_at.strftime("%H:%M:%S %d/%m/%Y"),
            }

        return {
            "scanner_running": _scanner_running,
            "active_subscribers": len(_subscribers),
            "current_call": call_to_return,
            "unresolved_missed_calls_count": unresolved_count,
            "latest_call_info": latest_call_info,
        }
    finally:
        db.close()


HOTLINE_PERMISSIONS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "hotline_permissions.json")

DEFAULT_HOTLINE_PERMISSIONS: Dict[str, Any] = {
    "enabled_roles": ["admin", "helpdesk", "app"],
    "allowed_users": ["dung.nguyenanh", "admin"],
    "allow_all": False,
    "agent_server_url": "",
}


def get_hotline_permissions() -> Dict[str, Any]:
    """Lấy cấu hình phân quyền trực hotline và server URL cho Client Agent"""
    if os.path.exists(HOTLINE_PERMISSIONS_FILE):
        try:
            with open(HOTLINE_PERMISSIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "enabled_roles": data.get("enabled_roles", ["admin", "helpdesk", "app"]),
                    "allowed_users": data.get("allowed_users", ["dung.nguyenanh", "admin"]),
                    "allow_all": bool(data.get("allow_all", False)),
                    "agent_server_url": str(data.get("agent_server_url", "")).strip(),
                }
        except Exception as e:
            logger.warning(f"Lỗi đọc file hotline_permissions.json: {e}")
    return dict(DEFAULT_HOTLINE_PERMISSIONS)


def save_hotline_permissions(config: Dict[str, Any]) -> Dict[str, Any]:
    """Lưu cấu hình phân quyền trực hotline và server URL cho Client Agent"""
    os.makedirs(os.path.dirname(HOTLINE_PERMISSIONS_FILE), exist_ok=True)
    clean_config = {
        "enabled_roles": list(config.get("enabled_roles", ["admin", "helpdesk", "app"])),
        "allowed_users": list(config.get("allowed_users", ["dung.nguyenanh", "admin"])),
        "allow_all": bool(config.get("allow_all", False)),
        "agent_server_url": str(config.get("agent_server_url", "")).strip(),
    }
    with open(HOTLINE_PERMISSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(clean_config, f, ensure_ascii=False, indent=2)
    return clean_config


def check_user_hotline_access(
    username: Optional[str],
    role_codes: Optional[List[str]] = None,
    is_super_admin: bool = False,
    db: Optional[Session] = None,
) -> bool:
    """Kiểm tra tài khoản người dùng có quyền thấy & trực hotline 3CX không (hỗ trợ cả JSON config và DB RBAC)"""
    clean_user = (username or "").strip().lower()
    # Super Admin hoặc user dung.nguyenanh luôn có toàn quyền
    if is_super_admin or clean_user in ["admin", "administrator", "dung.nguyenanh"]:
        return True

    cfg = get_hotline_permissions()
    if cfg.get("allow_all"):
        return True

    allowed_users = [u.strip().lower() for u in cfg.get("allowed_users", [])]
    if clean_user in allowed_users:
        return True

    enabled_roles = [r.strip().lower() for r in cfg.get("enabled_roles", [])]
    user_roles = [r.strip().lower() for r in (role_codes or [])]
    if any(r in enabled_roles for r in user_roles):
        return True

    # Kiểm tra trực tiếp phân quyền từ bảng DB (dbo.PHANQUYEN_DETAIL)
    check_session = db
    local_session = False
    if check_session is None:
        try:
            check_session = SessionLocal()
            local_session = True
        except Exception:
            check_session = None

    if check_session is not None:
        try:
            from app.models.user import User, PermissionDetail
            from sqlalchemy import select, func

            role_ids = set()
            for rc in user_roles:
                if rc in ["app", "it_application"]:
                    role_ids.add("2")
                elif rc in ["helpdesk", "it_helpdesk"]:
                    role_ids.add("3")
                elif rc in ["inventory", "inv"]:
                    role_ids.add("4")
                elif rc.isdigit():
                    role_ids.add(rc)

            if clean_user:
                db_user = check_session.scalar(select(User).where(func.lower(User.user_name1) == clean_user))
                if db_user:
                    if db_user.quyen_mo_rong and str(db_user.quyen_mo_rong).strip() not in ["0", ""]:
                        role_ids.add(str(db_user.quyen_mo_rong).strip())
                    if db_user.phanquyen:
                        parts = [p.strip().lower() for p in db_user.phanquyen.replace(";", ",").split(",") if p.strip()]
                        for p in parts:
                            if p in ["app", "2"]:
                                role_ids.add("2")
                            elif p in ["helpdesk", "3"]:
                                role_ids.add("3")
                            elif p.isdigit():
                                role_ids.add(p)

            if role_ids:
                duty_perm = check_session.scalar(
                    select(PermissionDetail).where(
                        PermissionDetail.id_quyen.in_(list(role_ids)),
                        PermissionDetail.chucnang.in_(["hotline_3cx_duty", "view_hotline_3cx_duty"]),
                        PermissionDetail.active == True
                    )
                )
                if duty_perm:
                    return True
        except Exception as db_err:
            logger.warning(f"Lỗi kiểm tra quyền hotline qua DB: {db_err}")
        finally:
            if local_session and check_session is not None:
                check_session.close()

    return False

