import os
import re
import json
import time
import logging
import threading
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, desc

from app.core.database import SessionLocal, engine
from app.models.memo import Memo
from app.models.audit_log import AuditLog
from app.services.memo_service import check_memo_code_exists, get_next_it_setup, allocate_next_it_setup

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
MAIL_MEMO_CONFIG_FILE = os.path.join(DATA_DIR, "mail_memo_config.json")
MAIL_MEMO_HISTORY_FILE = os.path.join(DATA_DIR, "mail_memo_history.json")


class MailMemoService:
    def __init__(self):
        self._config = self._load_config()
        self._agent_state: Optional[Dict[str, Any]] = None
        self._scan_command_pending: bool = False
        self._scan_command_time: float = 0
        self._last_scan_result: Optional[Dict[str, Any]] = None
        self._scan_done_event = threading.Event()

    def _load_config(self) -> Dict[str, Any]:
        default_cfg = {
            "email_account": "dung.nguyenanh@ggg.com.vn",
            "folder_name": "5. MKT",
            "scan_keyword": "Yêu cầu tạo nút RK cho Memo mới",
            "is_authenticated": True,
            "last_scan_at": None,
            "total_imported": 0,
            "last_scanned_count": 0,
            "auth_method": "outlook_desktop",
        }
        if os.path.exists(MAIL_MEMO_CONFIG_FILE):
            try:
                with open(MAIL_MEMO_CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    default_cfg.update(data)
            except Exception as e:
                logger.warning(f"[MAIL_MEMO] Lỗi đọc config: {e}")
        return default_cfg

    def _save_config(self):
        try:
            with open(MAIL_MEMO_CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(self._config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"[MAIL_MEMO] Lỗi lưu config: {e}")

    def _load_history(self) -> List[Dict[str, Any]]:
        if os.path.exists(MAIL_MEMO_HISTORY_FILE):
            try:
                with open(MAIL_MEMO_HISTORY_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"[MAIL_MEMO] Lỗi đọc history: {e}")
        return []

    def _save_history(self, history: List[Dict[str, Any]]):
        try:
            trimmed = history[:500]
            with open(MAIL_MEMO_HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(trimmed, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"[MAIL_MEMO] Lỗi lưu history: {e}")

    def record_agent_poll(self, agent_data: Dict[str, Any], client_ip: str) -> Dict[str, Any]:
        """Agent gọi định kỳ mỗi 2s để báo online và nhận lệnh quét nếu có."""
        now = datetime.now()
        agent_data["last_seen"] = now
        agent_data["client_ip"] = client_ip
        self._agent_state = agent_data

        cmd = "idle"
        # Nếu có lệnh quét được kích hoạt từ Web trong vòng 25s qua
        if self._scan_command_pending and (time.time() - self._scan_command_time) < 25:
            cmd = "scan"
            self._scan_command_pending = False  # Reset lệnh sau khi đã giao cho agent

        return {
            "status": "ok",
            "command": cmd,
            "server_time": now.strftime("%Y-%m-%d %H:%M:%S")
        }

    def is_agent_online(self) -> bool:
        """Agent được tính là Online nếu gửi tín hiệu trong vòng 8 giây qua."""
        if not self._agent_state or "last_seen" not in self._agent_state:
            return False
        return (datetime.now() - self._agent_state["last_seen"]).total_seconds() < 8

    def get_agent_info(self) -> Dict[str, Any]:
        online = self.is_agent_online()
        if not online or not self._agent_state:
            return {"online": False}
        return {
            "online": True,
            "computer_name": self._agent_state.get("computer_name"),
            "account": self._agent_state.get("account"),
            "client_ip": self._agent_state.get("client_ip"),
            "last_seen": self._agent_state["last_seen"].strftime("%Y-%m-%d %H:%M:%S")
        }

    def request_agent_scan(self, timeout_sec: int = 25) -> Dict[str, Any]:
        """Web kích hoạt quét: Gửi tín hiệu cho Agent và chờ Agent thực hiện."""
        if not self.is_agent_online():
            return {
                "success": False,
                "message": "Local Agent chưa bật trên máy tính cá nhân. Vui lòng mở file Chay_Outlook_Agent.bat trước!"
            }
        self._scan_done_event.clear()
        self._last_scan_result = None
        self._scan_command_time = time.time()
        self._scan_command_pending = True

        # Đợi Agent quét và đẩy kết quả qua /import-from-agent
        finished = self._scan_done_event.wait(timeout=timeout_sec)
        if finished and self._last_scan_result:
            return self._last_scan_result
        return {
            "success": True,
            "message": "Đã gửi lệnh quét tới Agent trên máy bạn. Quá trình quét đang diễn ra ngầm.",
            "total_found": 0,
            "total_imported": 0,
        }

    def get_status(self) -> Dict[str, Any]:
        """Lấy trạng thái cấu hình và kết nối hòm thư."""
        cfg = self._load_config()
        agent_info = self.get_agent_info()
        history = self._load_history()
        return {
            "email_account": cfg.get("email_account", "dung.nguyenanh@ggg.com.vn"),
            "folder_name": cfg.get("folder_name", "5. MKT"),
            "scan_keyword": cfg.get("scan_keyword", "Yêu cầu tạo nút RK cho Memo mới"),
            "desktop_connected": False,
            "agent_online": agent_info.get("online", False),
            "agent_info": agent_info,
            "last_scan_at": cfg.get("last_scan_at"),
            "total_imported": cfg.get("total_imported", 0),
            "recent_items": history[:15],
            "total_history": len(history),
        }

    def _parse_memo_email_body(self, subject: str, body: str) -> Optional[Dict[str, Any]]:
        """
        Bóc tách các trường dữ liệu từ nội dung email Salesforce:
        - Memo Code: VD: 402600MW033 hoặc 402600SS022
        - Sub-Memo Code: VD: 402600MW033.04
        - Tên Memo: VD: MW_Giảm 12% cho HD 800K_GRO_Re1T10
        - Người yêu cầu: VD: Thúy Mai Thị (HN | GRO)
        - Ngày tạo / Ngày tạo yêu cầu: 9/25/2026
        - Link: URL Salesforce
        """
        if not body:
            return None

        # 1. Tìm Memo Code
        # Hỗ trợ các định dạng: Memo Code: 402600MW033 hoặc Memo Code: Memo Code: 402600MW033
        memo_code_match = re.search(r"Memo\s*Code\s*:\s*(?:Memo\s*Code\s*:\s*)?([A-Za-z0-9_-]+)", body, re.IGNORECASE)
        if not memo_code_match:
            # Thử tìm pattern mã memo GGG thông dụng (ví dụ 402600XX000)
            memo_code_match = re.search(r"\b([0-9]{6}[A-Za-z]{2,4}[0-9]{2,4})\b", body)

        if not memo_code_match:
            return None

        raw_memo_code = memo_code_match.group(1).strip().upper()
        # Chuẩn hóa mã memo: loại bỏ ghi chú hoặc hậu tố kèm theo (VD: - Bổ sung..., - NH mới...) để không bao giờ ghi chú vào mã memo
        memo_code = re.split(r"[\s_]*[-–][\s_]*", raw_memo_code)[0].strip()
        # Nếu có đuôi .xx (sub memo code bị lọt vào memo code), cắt bỏ để lấy mã memo gốc
        if re.search(r"\.[0-9]{2}$", memo_code):
            memo_code = re.sub(r"\.[0-9]{2}$", "", memo_code).strip()

        # 2. Tìm Sub-Memo Code
        sub_memo_match = re.search(r"Sub-Memo\s*Code\s*:\s*([A-Za-z0-9_.-]+)", body, re.IGNORECASE)
        sub_memo_code = sub_memo_match.group(1).strip() if sub_memo_match else None

        # 3. Tìm Tên Memo
        ten_memo_match = re.search(r"Tên\s*Memo\s*:\s*([^\r\n]+)", body, re.IGNORECASE)
        ten_memo = ten_memo_match.group(1).strip() if ten_memo_match else subject.replace("Yêu cầu tạo nút RK cho Memo mới", "").strip()
        if not ten_memo:
            ten_memo = f"Memo {memo_code}"

        # 4. Tìm Người yêu cầu
        nguoi_yc_match = re.search(r"Người\s*yêu\s*cầu\s*:\s*([^\r\n]+)", body, re.IGNORECASE)
        nguoi_yc = nguoi_yc_match.group(1).strip() if nguoi_yc_match else "Salesforce Loyalty"

        # 5. Tìm Ngày tạo / Ngày yêu cầu
        ngay_yc_match = re.search(r"Ngày\s*tạo\s*(?:yêu\s*cầu)?\s*:\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})", body, re.IGNORECASE)
        ngay_yc_str = ngay_yc_match.group(1).strip() if ngay_yc_match else None

        # 6. Tìm Link Salesforce
        link_match = re.search(r"Link\s*:\s*(https?://[^\s\r\n]+)", body, re.IGNORECASE)
        link_sf = link_match.group(1).strip() if link_match else None

        return {
            "memo_code": memo_code,
            "sub_memo_code": sub_memo_code,
            "ten_memo": ten_memo,
            "nguoi_yeu_cau": nguoi_yc,
            "ngay_yeu_cau": ngay_yc_str,
            "link_salesforce": link_sf,
            "raw_subject": subject,
        }

    def _read_emails_from_outlook_desktop(self, max_items: int = 400) -> List[Dict[str, Any]]:
        """
        Đọc các email mới nhất từ thư mục 5. MKT của Outlook Desktop thông qua COM.
        Không cần mật khẩu, không bị 2FA chặn vì ứng dụng Outlook đã đăng nhập sẵn.
        """
        import win32com.client
        outlook = win32com.client.Dispatch("Outlook.Application")
        namespace = outlook.GetNamespace("MAPI")

        target_folder = None
        # Tìm thư mục 5. MKT trong tài khoản của Dũng
        for store in namespace.Folders:
            if "dung.nguyenanh" in store.Name.lower():
                try:
                    target_folder = store.Folders["5. MKT"]
                    break
                except Exception:
                    pass

        # Fallback tìm trong tất cả các stores
        if not target_folder:
            for store in namespace.Folders:
                for sub in store.Folders:
                    if "5. mkt" in sub.Name.lower() or "mkt" == sub.Name.lower():
                        target_folder = sub
                        break
                if target_folder:
                    break

        if not target_folder:
            # Fallback dùng Inbox mặc định
            target_folder = namespace.GetDefaultFolder(6)

        target_mails = []
        seen_entry_ids = set()

        # Bước 1: Quét TOÀN BỘ thư chưa đọc trong thư mục (Restrict)
        try:
            unreads = target_folder.Items.Restrict("[UnRead] = True")
            unreads.Sort("[ReceivedTime]", True)
            for i in range(1, unreads.Count + 1):
                try:
                    mail = unreads.Item(i)
                    eid = getattr(mail, "EntryID", None)
                    if eid:
                        if eid not in seen_entry_ids:
                            seen_entry_ids.add(eid)
                            target_mails.append(mail)
                    else:
                        target_mails.append(mail)
                except Exception:
                    pass
        except Exception as ex:
            logger.warning(f"[MAIL_MEMO] Lỗi khi lọc thư chưa đọc: {ex}")

        # Bước 2: Quét thêm các thư mới nhất gần đây
        try:
            all_items = target_folder.Items
            all_items.Sort("[ReceivedTime]", True)
            recent_limit = min(all_items.Count, max_items)
            for i in range(1, recent_limit + 1):
                try:
                    mail = all_items.Item(i)
                    eid = getattr(mail, "EntryID", None)
                    if eid:
                        if eid not in seen_entry_ids:
                            seen_entry_ids.add(eid)
                            target_mails.append(mail)
                    else:
                        target_mails.append(mail)
                except Exception:
                    pass
        except Exception as ex:
            logger.warning(f"[MAIL_MEMO] Lỗi khi lấy thư gần đây: {ex}")

        results = []
        for mail in target_mails:
            try:
                subj = str(getattr(mail, "Subject", "") or "")
                subj_lower = subj.lower()

                # Tối ưu hóa: Lọc nhanh theo Subject trước khi đọc Body (tiết kiệm thời gian và tài nguyên)
                if not ("yêu cầu tạo nút rk" in subj_lower or "yeu cau tao nut rk" in subj_lower or "nút rk" in subj_lower or "memo" in subj_lower):
                    continue

                body = str(getattr(mail, "Body", "") or "")
                recv_time = getattr(mail, "ReceivedTime", None)
                recv_str = recv_time.strftime("%Y-%m-%d %H:%M:%S") if recv_time else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                parsed = self._parse_memo_email_body(subj, body)
                if parsed:
                    parsed["received_time"] = recv_str
                    results.append(parsed)
                    # Tự động đánh dấu email đã đọc trong Outlook
                    try:
                        if getattr(mail, "UnRead", False):
                            mail.UnRead = False
                            mail.Save()
                    except Exception:
                        pass
            except Exception as e:
                logger.debug(f"[MAIL_MEMO] Lỗi đọc mail: {e}")

        return results

    def scan_and_import_memos(self, max_items: int = 400) -> Dict[str, Any]:
        """
        Thực hiện quét hòm thư và tự động import các Memo mới vào cơ sở dữ liệu.
        - Tự động bỏ qua các Memo đã tồn tại (không tạo trùng mã).
        - Tự động gán IT Setup theo vòng xoay Round-Robin.
        """
        now = datetime.now()
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")

        # 1. Đọc email
        emails_parsed = []
        try:
            emails_parsed = self._read_emails_from_outlook_desktop(max_items=max_items)
            self._config["is_authenticated"] = True
            self._config["auth_method"] = "outlook_desktop"
        except Exception as e:
            logger.warning(f"[MAIL_MEMO] Lỗi đọc qua Outlook Desktop: {e}")
            return {
                "success": False,
                "message": f"Không thể kết nối Outlook Desktop: {str(e)}. Hãy đảm bảo ứng dụng Outlook đang mở trên máy.",
                "total_found": 0,
                "total_imported": 0,
                "new_items": [],
            }

        return self.process_and_import_parsed_items(emails_parsed)

    def process_and_import_parsed_items(self, emails_parsed: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Nhận danh sách email/memo đã parse (từ Outlook trực tiếp hoặc từ Local Agent máy cá nhân),
        kiểm tra trùng mã, gán round-robin IT và lưu vào DB.
        """
        now = datetime.now()
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")
        self.record_agent_heartbeat({"status": "sync_received", "source": "import_from_agent", "count": len(emails_parsed)})

        if not emails_parsed:
            self._config["last_scan_at"] = now_str
            self._config["last_scanned_count"] = 0
            self._save_config()
            return {
                "success": True,
                "message": "Không tìm thấy email yêu cầu tạo nút RK mới nào cần import.",
                "total_found": 0,
                "total_imported": 0,
                "total_skipped": 0,
                "new_items": [],
                "skipped_items": [],
            }

        # 2. Xử lý lưu vào Database (Nhóm theo mã Memo để gộp các Sub-Memo nếu có)
        db: Session = SessionLocal()
        new_imported_items = []
        skipped_items = []
        history = self._load_history()

        # Nhóm các email theo mã Memo duy nhất
        grouped_by_code: Dict[str, List[Dict[str, Any]]] = {}
        for item in emails_parsed:
            mc = item["memo_code"]
            grouped_by_code.setdefault(mc, []).append(item)

        try:
            for memo_code, raw_sub_list in grouped_by_code.items():
                # Deduplicate sub-memos by unique sub_memo_code
                deduped_subs_dict: Dict[str, Dict[str, Any]] = {}
                for s in raw_sub_list:
                    sub_code = (s.get("sub_memo_code") or "").strip()
                    key = sub_code.upper() if sub_code else f"RAW_{len(deduped_subs_dict)}"
                    if key not in deduped_subs_dict:
                        deduped_subs_dict[key] = s
                    else:
                        # Nếu item đã có chưa có link salesforce mà item này có, cập nhật thêm
                        if not deduped_subs_dict[key].get("link_salesforce") and s.get("link_salesforce"):
                            deduped_subs_dict[key]["link_salesforce"] = s.get("link_salesforce")

                # Sắp xếp danh sách sub-memo tăng dần theo sub_memo_code (VD: .01, .02, .03, .04)
                sub_list = sorted(
                    deduped_subs_dict.values(),
                    key=lambda x: (x.get("sub_memo_code") or "")
                )
                first_item = sub_list[0] if sub_list else raw_sub_list[0]

                # Kiểm tra xem mã Memo đã có trong hệ thống chưa
                existing = check_memo_code_exists(db, memo_code)
                if existing:
                    # Kiểm tra xem danh sách sub_list từ mail này có sub-memo mới nào chưa có trong existing không
                    existing_content = (existing.noidung_mail or "") + " " + (existing.huong_dan or "")
                    new_sub_items = []
                    for s in sub_list:
                        sub_code = (s.get("sub_memo_code") or "").strip()
                        if sub_code and sub_code not in existing_content:
                            new_sub_items.append(s)
                        elif not sub_code and s.get("ten_memo") and s.get("ten_memo") not in existing_content:
                            new_sub_items.append(s)

                    if new_sub_items:
                        # CÓ NỘI DUNG MỚI (BỔ SUNG SUB-MEMO / NÚT BẤM MỚI TỪ MAIL)
                        logger.info(f"[MAIL_MEMO] Phát hiện {len(new_sub_items)} sub-memo mới bổ sung cho Memo {memo_code}")

                        # 1. Tìm link salesforce bổ sung (nếu có)
                        supplement_link = None
                        for s in new_sub_items:
                            if s.get("link_salesforce"):
                                supplement_link = s.get("link_salesforce").strip()
                                break

                        # 2. Chuẩn bị nội dung đợt bổ sung
                        supplement_lines = []
                        for s in new_sub_items:
                            s_code = s.get("sub_memo_code") or ""
                            s_title = s.get("ten_memo") or ""
                            supplement_lines.append(f"  • Sub-Memo {s_code}: {s_title}")

                        supp_text = (
                            f"\n\n[BỔ SUNG NÚT BẤM TỪ MAIL - {now.strftime('%d/%m/%Y %H:%M:%S')}]:\n"
                            f"- Danh sách Sub-Memo bổ sung ({len(new_sub_items)} sub):\n"
                            + "\n".join(supplement_lines)
                        )

                        # 3. Cập nhật vào noidung_mail (tách riêng, tuyệt đối KHÔNG đè lên huong_dan của IT)
                        if not existing.noidung_mail:
                            existing.noidung_mail = (existing.huong_dan or "").strip() + supp_text
                        else:
                            existing.noidung_mail = existing.noidung_mail.strip() + supp_text

                        # 4. CHUYỂN TRẠNG THÁI THEO ĐÚNG QUY CHUẨN:
                        # - Nếu đã Public ('2') hoặc đã setup nháp ('1'): Chuyển sang '4' (Bổ sung nút bấm)
                        # - Nếu đang Chờ Setup ('0'): GIỮ NGUYÊN '0' (Chờ Setup, không đổi trạng thái vì IT chưa setup)
                        # - Nếu đã là '4' (Bổ sung nút bấm): Giữ nguyên '4'
                        current_tt = str(existing.trangthai or "").strip()
                        if current_tt in ["1", "2", "da_setup_nhap", "da_public"]:
                            existing.trangthai = "4"
                            existing.hoanthanh = None
                        elif current_tt in ["4", "bo_sung"]:
                            existing.trangthai = "4"
                        # Nếu là '0' (Chờ setup) -> Giữ nguyên '0'

                        existing.ngay_update = now

                        # Đảm bảo mã memo luôn sạch, không ghi chú vào mã memo
                        if existing.ma_memo and (" - " in existing.ma_memo or " – " in existing.ma_memo):
                            existing.ma_memo = memo_code

                        # 5. Ghi chú thêm vào note (chỉ ghi vào trường note, KHÔNG ghi vào ma_memo)
                        supp_note = f"[Bổ sung nút bấm từ Mail: thêm {len(new_sub_items)} sub-memo ({now_str})]"
                        if existing.note:
                            if supp_note not in existing.note:
                                existing.note = f"{existing.note.strip()}\n{supp_note}"
                        else:
                            existing.note = supp_note

                        # 6. Ghi Audit Log
                        sub_codes_str = ", ".join([s.get("sub_memo_code") or "" for s in new_sub_items])
                        audit = AuditLog(
                            manhinh="APP_MEMO",
                            chucnang="SUPPLEMENT_MEMO_MAIL",
                            user_thuchien="dung.nguyenanh (Auto Mail)",
                            noidung=f"Mail bổ sung nút bấm cho Memo {memo_code} (ID: {existing.id}, thêm {len(new_sub_items)} sub: {sub_codes_str})",
                            ngay_insert=now,
                            active=True,
                        )
                        db.add(audit)

                        saved_item = {
                            "memo_id": existing.id,
                            "memo_code": memo_code,
                            "total_sub": len(new_sub_items),
                            "ten_memo": first_item.get("ten_memo"),
                            "nguoi_yeu_cau": first_item.get("nguoi_yeu_cau"),
                            "it_setup": existing.it_setup,
                            "ma_tua": existing.ma_tua,
                            "imported_at": now_str,
                            "received_time": first_item.get("received_time"),
                            "link_salesforce": supplement_link or first_item.get("link_salesforce"),
                            "is_supplement": True,
                            "status": "bo_sung_nut_bam",
                        }
                        new_imported_items.append(saved_item)
                        history.insert(0, saved_item)
                        continue
                    else:
                        skipped_items.append({
                            "memo_code": memo_code,
                            "status": "already_exists",
                            "it_setup": existing.it_setup,
                            "existing_id": existing.id,
                            "total_sub_emails": len(sub_list),
                        })
                        continue

                # Lấy người phụ trách tiếp theo theo vòng xoay Round-Robin kèm Mã Tua
                slot = allocate_next_it_setup(db)
                auto_user = slot["next_user"] or "dung.nguyenanh"
                ma_tua = slot["ma_tua"]

                # Tìm link Salesforce đại diện từ sub đầu tiên (hoặc bất kỳ sub nào có link)
                representative_link = None
                for s in sub_list:
                    if s.get("link_salesforce"):
                        representative_link = s.get("link_salesforce").strip()
                        break

                # Chuẩn bị nội dung yêu cầu tạo nút từ mail (danh sách các sub-memo duy nhất đã lọc trùng)
                sub_lines = []
                for s in sub_list:
                    sub_code = s.get("sub_memo_code") or ""
                    sub_title = s.get("ten_memo") or ""
                    sub_lines.append(f"  • Sub-Memo {sub_code}: {sub_title}")

                mail_content_text = (
                    f"- Mã Memo: {memo_code}\n"
                    f"- Danh sách Sub-Memo cần tạo ({len(sub_list)} sub):\n"
                    + "\n".join(sub_lines)
                )

                # Tiêu đề link: Bỏ chữ, chỉ lưu link đại diện
                ten_memo = (first_item.get("ten_memo") or "").strip()
                if representative_link:
                    subject_val = representative_link
                else:
                    subject_val = ten_memo

                # Tạo mới Memo: noidung_mail lưu nội dung từ mail, huong_dan để trống cho IT
                new_memo = Memo(
                    ma_memo=memo_code,
                    subject_mail=subject_val,
                    ngay_batdau=None,   # Thời gian hiệu lực bỏ trống
                    ngay_ketthuc=None,  # Thời gian hiệu lực bỏ trống
                    it_setup=auto_user,
                    ma_tua=ma_tua,
                    giahan="0",
                    ngay_tiepnhan=now,
                    trangthai="0",  # Chờ setup
                    hoanthanh=None,
                    nguoi_gui=first_item.get("nguoi_yeu_cau"),
                    noidung_mail=mail_content_text,  # Tách riêng nội dung bot quét từ mail
                    huong_dan=None,                 # Để trống cho IT dán hình ảnh và ghi chú hướng dẫn
                    note=f"Tự động import từ Mail ({len(sub_list)} sub-memo)",
                    ngay_insert=now,
                    ngay_update=now,
                    active=True,
                )
                db.add(new_memo)
                db.flush()

                # Audit log
                audit = AuditLog(
                    manhinh="APP_MEMO",
                    chucnang="AUTO_IMPORT_MAIL",
                    user_thuchien="dung.nguyenanh (Auto Mail)",
                    noidung=f"Auto import Memo {memo_code} từ email (ID: {new_memo.id}, Mã Tua: {ma_tua}, Gán IT: {auto_user}, Sub-memos: {len(sub_list)})",
                    ngay_insert=now,
                    active=True,
                )
                db.add(audit)

                saved_item = {
                    "memo_id": new_memo.id,
                    "memo_code": memo_code,
                    "total_sub": len(sub_list),
                    "ten_memo": first_item.get("ten_memo"),
                    "nguoi_yeu_cau": first_item.get("nguoi_yeu_cau"),
                    "it_setup": auto_user,
                    "ma_tua": ma_tua,
                    "imported_at": now_str,
                    "received_time": first_item.get("received_time"),
                    "link_salesforce": representative_link or first_item.get("link_salesforce"),
                }
                new_imported_items.append(saved_item)
                history.insert(0, saved_item)

            db.commit()

        except Exception as e:
            db.rollback()
            logger.error(f"[MAIL_MEMO] Lỗi lưu DB Memo: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Lỗi khi lưu Memo vào cơ sở dữ liệu: {str(e)}",
                "total_found": len(emails_parsed),
                "total_imported": 0,
                "new_items": [],
            }
        finally:
            db.close()

        # Cập nhật config & history
        self._config["last_scan_at"] = now_str
        self._config["last_scanned_count"] = len(emails_parsed)
        self._config["total_imported"] = self._config.get("total_imported", 0) + len(new_imported_items)
        self._save_config()
        self._save_history(history)

        msg = (
            f"Quét hoàn tất: Tìm thấy {len(emails_parsed)} email yêu cầu tạo nút RK. "
            f"Đã import thành công {len(new_imported_items)} Memo mới vào hệ thống (Bỏ qua {len(skipped_items)} mã đã tồn tại sẵn)."
        )
        result = {
            "success": True,
            "message": msg,
            "total_found": len(emails_parsed),
            "total_imported": len(new_imported_items),
            "total_skipped": len(skipped_items),
            "new_items": new_imported_items,
            "skipped_items": skipped_items,
        }
        self._last_scan_result = result
        self._scan_done_event.set()
        return result


mail_memo_service = MailMemoService()
