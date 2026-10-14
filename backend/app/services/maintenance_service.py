import os
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("app.maintenance")

class MaintenanceService:
    DEFAULT_BACKUP_FOLDER = "C:/DUNGIT/Backup_Data_SQL"
    DEFAULT_RETENTION_DAYS = 30

    @property
    def default_zip_password(self) -> str:
        return getattr(settings, "DB_BACKUP_ZIP_PASSWORD", "Abc0102009@")


    def compress_local_bak_files(self, folder_path: str, password: Optional[str] = None) -> Dict[str, Any]:
        """
        Nén trực tiếp các file .bak trong thư mục local thành file .zip mã hóa AES.
        """
        actual_password = password if password is not None else self.default_zip_password

        if not os.path.exists(folder_path):
            return {"success": False, "count": 0, "message": f"Thư mục '{folder_path}' không tồn tại trên máy này.", "details": []}

        try:
            files = os.listdir(folder_path)
        except Exception as e:
            return {"success": False, "count": 0, "message": f"Không thể đọc thư mục '{folder_path}': {e}", "details": []}

        compressed_count = 0
        details = []

        try:
            import pyzipper
        except ImportError:
            pyzipper = None

        for file in files:
            file_path = os.path.join(folder_path, file)
            if os.path.isfile(file_path) and file.lower().endswith(".bak"):
                out_zip_file = file_path + ".zip"
                try:
                    if pyzipper:
                        with pyzipper.AESZipFile(
                            out_zip_file,
                            "w",
                            compression=pyzipper.ZIP_LZMA,
                            encryption=pyzipper.WZ_AES
                        ) as zf:
                            zf.setpassword(actual_password.encode("utf-8"))
                            zf.write(file_path, arcname=file)
                    else:
                        import zipfile
                        with zipfile.ZipFile(out_zip_file, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                            zf.write(file_path, arcname=file)

                    os.remove(file_path)
                    compressed_count += 1
                    details.append(f"Đã nén & xóa file gốc: {file}")
                    logger.info(f"Đã nén file .bak sang .zip: {file}")
                except Exception as ex:
                    details.append(f"Lỗi nén file {file}: {ex}")
                    logger.error(f"Lỗi nén file {file_path}: {ex}")

        return {
            "success": True,
            "count": compressed_count,
            "message": f"Đã nén thành công {compressed_count} tệp .bak sang .zip (mã hóa AES LZMA) và xóa file gốc.",
            "details": details
        }

    def compress_and_cleanup_db_backup(
        self,
        folder_path: Optional[str] = None,
        retention_days: int = DEFAULT_RETENTION_DAYS,
        timeout: int = 180,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        start_time = datetime.now()
        backup_dir = folder_path or self.DEFAULT_BACKUP_FOLDER
        actual_password = password if password is not None else self.default_zip_password

        compress_status = "success"
        compress_message = ""

        # Chạy trực tiếp trên Server (không gọi qua HTTP 5001)
        if os.path.exists(backup_dir):
            logger.info(f"Phat hien thu muc local '{backup_dir}', tien hanh nen truc tiep.")
            local_res = self.compress_local_bak_files(backup_dir, password=actual_password)
            compress_status = "success" if local_res["success"] else "warning"
            compress_message = local_res["message"]
        else:
            compress_status = "warning"
            compress_message = f"Thư mục sao lưu '{backup_dir}' không tồn tại trên server này. Vui lòng kiểm tra đường dẫn cấu hình."
            logger.warning(compress_message)

        cleanup_stats = self._cleanup_old_backup_files(backup_dir, retention_days)

        duration = round((datetime.now() - start_time).total_seconds(), 2)
        total_deleted = cleanup_stats.get("deleted_count", 0)
        freed_mb = cleanup_stats.get("freed_mb", 0.0)

        overall_status = "success" if compress_status == "success" else ("warning" if total_deleted > 0 else "failed")
        main_message = (
            f"Tác vụ nén DB & dọn dẹp file cũ hoàn tất trong {duration}s. "
            f"Nén ZIP: {compress_status.upper()}. "
            f"Đã xóa {total_deleted} tệp cũ quá {retention_days} ngày (Giải phóng {freed_mb:.1f} MB)."
        )

        detail_lines = [
            f"- Thư mục sao lưu: {backup_dir}",
            f"- Trạng thái nén: {compress_message}",
            f"- Mật khẩu nén chuẩn: {actual_password} (Mã hóa AES WZ_AES, thuật toán LZMA)",
            f"- Chính sách lưu trữ (Retention): {retention_days} ngày",
            f"- Số tệp cũ quá {retention_days} ngày đã xóa: {total_deleted}",
            f"- Dung lượng ổ cứng đã giải phóng: {freed_mb:.2f} MB ({freed_mb/1024:.2f} GB)",
        ]

        deleted_files = cleanup_stats.get("deleted_files", [])
        if deleted_files:
            detail_lines.append(f"- Danh sách file đã xóa ({len(deleted_files)} file):")
            for f in deleted_files[:10]:
                detail_lines.append(f"  + {f['name']} ({f['size_mb']:.1f} MB, sửa lần cuối: {f['mtime']})")
            if len(deleted_files) > 10:
                detail_lines.append(f"  ...và {len(deleted_files) - 10} file khác.")
        elif cleanup_stats.get("dir_exists"):
            detail_lines.append(f"- Không có file nào cũ hơn {retention_days} ngày trong thư mục sao lưu.")

        return {
            "status": overall_status,
            "message": main_message,
            "details": "\n".join(detail_lines),
            "compress_status": compress_status,
            "compress_message": compress_message,
            "cleanup_stats": cleanup_stats,
            "duration_seconds": duration
        }

    def _cleanup_old_backup_files(self, folder_path: str, retention_days: int) -> Dict[str, Any]:
        result = {
            "dir_exists": False,
            "scanned_count": 0,
            "deleted_count": 0,
            "freed_bytes": 0,
            "freed_mb": 0.0,
            "deleted_files": []
        }

        if not os.path.exists(folder_path):
            return result

        result["dir_exists"] = True
        cutoff_timestamp = time.time() - (retention_days * 86400)

        try:
            for item in os.listdir(folder_path):
                item_path = os.path.join(folder_path, item)
                if not os.path.isfile(item_path):
                    continue

                lower_name = item.lower()
                if not (lower_name.endswith(".bak") or lower_name.endswith(".zip") or lower_name.endswith(".rar") or lower_name.endswith(".7z")):
                    continue

                result["scanned_count"] += 1
                try:
                    stat = os.stat(item_path)
                    mtime = stat.st_mtime
                    size = stat.st_size

                    if mtime < cutoff_timestamp:
                        os.remove(item_path)
                        mtime_str = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
                        size_mb = size / (1024 * 1024)
                        result["deleted_count"] += 1
                        result["freed_bytes"] += size
                        result["deleted_files"].append({
                            "name": item,
                            "size_mb": round(size_mb, 2),
                            "mtime": mtime_str
                        })
                        logger.info(f"Đã xóa file sao lưu cũ ({retention_days} ngày): {item} ({size_mb:.2f} MB)")
                except Exception as ex:
                    logger.warning(f"Không thể xóa file sao lưu {item_path}: {ex}")

            result["freed_mb"] = round(result["freed_bytes"] / (1024 * 1024), 2)
        except Exception as e:
            logger.error(f"Lỗi khi quét dọn dẹp thư mục {folder_path}: {e}")

        return result

maintenance_service = MaintenanceService()