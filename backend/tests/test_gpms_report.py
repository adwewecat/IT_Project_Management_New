# -*- coding: utf-8 -*-
"""
Bộ kiểm thử đơn vị (TDD) cho phân hệ Báo Cáo GPMS.
Kiểm tra: parse file Excel ChiTietCongViec, tính SLA 5 trạng thái, Top người gửi/nhận,
biểu đồ 3 màu YCHT, phân vùng Nam/Bắc, Phân loại & Danh mục công việc (DMCV).
"""

import glob
import os
import sys
import unittest
from datetime import datetime

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


class TestGpmsReportService(unittest.TestCase):
    def test_extract_export_timestamp_and_period(self):
        from app.services.gpms_report_service import extract_export_datetime_from_filename

        dt = extract_export_datetime_from_filename(
            "ChiTietCongViec_Tháng_10_2026_NgayXuat_14112026_094720.xlsx"
        )
        self.assertEqual(dt, datetime(2026, 11, 14, 9, 47, 20))
        self.assertIsNone(extract_export_datetime_from_filename("bao_cao_khong_ngay.xlsx"))

    def test_classify_sla_status_all_five_cases(self):
        from app.services.gpms_report_service import classify_ticket_sla

        ref_dt = datetime(2026, 11, 14, 9, 47, 20)
        # 1. Đã hủy
        self.assertEqual(
            classify_ticket_sla("Đã hủy", "2026-10-30T23:59:59", "", ref_dt),
            "da_huy",
        )
        # 2. Hoàn thành đúng hạn (HTTT <= YCHT)
        self.assertEqual(
            classify_ticket_sla("Đã hoàn thành", "2026-10-30T23:59:59", "2026-10-29T11:18:44", ref_dt),
            "ht_dung_han",
        )
        self.assertEqual(
            classify_ticket_sla("Đã hoàn thành", "2026-10-30T23:59:59", "2026-10-30T23:59:59", ref_dt),
            "ht_dung_han",
        )
        # 3. Hoàn thành trễ hạn (HTTT > YCHT)
        self.assertEqual(
            classify_ticket_sla("Đã hoàn thành", "2026-10-30T23:59:59", "2026-10-31T00:00:01", ref_dt),
            "ht_tre_han",
        )
        # 4. Chưa hoàn thành chưa trễ hạn (ref_dt <= YCHT)
        self.assertEqual(
            classify_ticket_sla("Chưa hoàn thành", "2026-12-01T23:59:59", "", ref_dt),
            "chua_ht_chua_tre",
        )
        # 5. Chưa hoàn thành trễ hạn (ref_dt > YCHT)
        self.assertEqual(
            classify_ticket_sla("Chưa hoàn thành", "2026-10-30T23:59:59", "", ref_dt),
            "chua_ht_tre_han",
        )

    def test_parse_real_report_excel_and_compute_analytics(self):
        from app.services.gpms_report_service import (
            parse_gpms_excel_file,
            compress_tickets_payload,
            decompress_tickets_payload,
            compute_gpms_analytics,
        )

        files = glob.glob(os.path.join(ROOT_DIR, "REPORT", "*.xlsx"))
        self.assertTrue(len(files) >= 1, "Cần file mẫu trong thư mục REPORT/")
        sample_file = files[0]

        parsed = parse_gpms_excel_file(sample_file, original_filename=os.path.basename(sample_file))
        self.assertEqual(parsed["total_rows"], 18414)
        self.assertEqual(parsed["export_at"], datetime(2026, 11, 14, 9, 47, 20))
        self.assertEqual(parsed["period_label"], "Tháng 10-2026")

        # Nén và giải nén không mất dữ liệu
        blob = compress_tickets_payload(parsed["tickets"])
        restored = decompress_tickets_payload(blob)
        self.assertEqual(len(restored), 18414)
        self.assertEqual(restored[0]["code"], parsed["tickets"][0]["code"])

        # Tính toán thống kê tổng hợp với mốc thời gian xuất file
        south_users = ["huy.ld", "an.nguyenvan", "NHANVIEN_KHONG_TON_TAI"]
        analytics = compute_gpms_analytics(
            tickets=restored,
            export_at=parsed["export_at"],
            south_usernames=south_users,
            ref_mode="export",
            include_anonymous=True,
        )

        # Kiểm tra 5 trạng thái SLA chính xác tuyệt đối với dữ liệu thực tế
        sla = analytics["sla_summary"]
        self.assertEqual(sla["total"], 18414)
        self.assertEqual(sla["ht_dung_han"], 15827)
        self.assertEqual(sla["ht_tre_han"], 318)
        self.assertEqual(sla["chua_ht_chua_tre"], 273)
        self.assertEqual(sla["chua_ht_tre_han"], 1923)
        self.assertEqual(sla["da_huy"], 73)

        # Kiểm tra Top Senders có Anonymous đứng đầu (6,709)
        self.assertTrue(len(analytics["senders"]) > 5)
        self.assertEqual(analytics["senders"][0]["username"], "Anonymous")
        self.assertEqual(analytics["senders"][0]["total"], 6709)

        # Kiểm tra tắt Anonymous
        analytics_no_anon = compute_gpms_analytics(
            tickets=restored,
            export_at=parsed["export_at"],
            south_usernames=south_users,
            ref_mode="export",
            include_anonymous=False,
        )
        self.assertEqual(analytics_no_anon["sla_summary"]["total"], 18414 - 6709)
        self.assertNotEqual(analytics_no_anon["senders"][0]["username"], "Anonymous")

        # Kiểm tra Top Receivers 3 màu trên 1 cột khớp toán học
        receivers = analytics["receivers"]
        self.assertTrue(len(receivers) >= 40)
        for r in receivers:
            self.assertEqual(r["overdue_ycht"], r["ht_tre_han"] + r["chua_ht_tre_han"])
            self.assertEqual(r["on_time_ycht"], r["ht_dung_han"] + r["chua_ht_chua_tre"])
            self.assertEqual(r["cancelled"], r["da_huy"])
            self.assertEqual(r["total"], r["overdue_ycht"] + r["on_time_ycht"] + r["cancelled"])

        # Kiểm tra phân vùng Nam / Bắc
        nam = analytics["regions"]["nam"]
        bac = analytics["regions"]["bac"]
        self.assertEqual(nam["total"] + bac["total"], 18414)
        nam_usernames = {u["username"].lower() for u in nam["users"]}
        self.assertIn("huy.ld", nam_usernames)
        bac_usernames = {u["username"].lower() for u in bac["users"]}
        self.assertNotIn("huy.ld", bac_usernames)

        # Kiểm tra Phân loại công việc (7 nhóm, dẫn đầu Công việc 3CX = 11752)
        phan_loai = analytics["phan_loai_list"]
        self.assertEqual(len(phan_loai), 7)
        self.assertEqual(phan_loai[0]["name"], "Công việc 3CX")
        self.assertEqual(phan_loai[0]["total"], 11752)

        # Kiểm tra DMCV cấp 1 & lọc theo DMCV cấp 1 -> cấp 2
        dmcv1_list = analytics["dmcv1_list"]
        non_empty_dmcv1 = [d for d in dmcv1_list if d["name"] != "Chưa gắn DMCV"]
        self.assertEqual(len(non_empty_dmcv1), 70)
        top_named_dmcv1 = non_empty_dmcv1[0]["name"]
        drill = compute_gpms_analytics(
            tickets=restored,
            export_at=parsed["export_at"],
            south_usernames=south_users,
            dmcv1_filter=top_named_dmcv1,
        )
        self.assertEqual(drill["sla_summary"]["total"], non_empty_dmcv1[0]["total"])
        self.assertTrue(len(drill["dmcv2_list"]) >= 1)

    def test_api_endpoints_rbac_and_region_persistence(self):
        from fastapi.testclient import TestClient
        from app.main import app
        from app.api.deps import get_current_user
        from app.core.database import SessionLocal
        from app.schemas.auth import UserInfo
        from app.services import gpms_report_service

        # Snapshot cấu hình Miền Nam hiện tại để khôi phục sạch sau test
        db = SessionLocal()
        try:
            orig_south, _ = gpms_report_service.get_south_usernames(db)
        finally:
            db.close()

        regular_no_perm = UserInfo(
            id=991,
            username="viewer.noperm",
            full_name="No Perm",
            phanquyen="3",
            roles=["helpdesk"],
            is_super_admin=False,
            permissions={},
        )
        regular_view_only = UserInfo(
            id=992,
            username="viewer.only",
            full_name="View Only",
            phanquyen="3",
            roles=["helpdesk"],
            is_super_admin=False,
            permissions={"view_gpms_report": True},
        )
        admin_user = UserInfo(
            id=0,
            username="admin",
            full_name="Administrator",
            phanquyen="0",
            roles=["admin"],
            is_super_admin=True,
            permissions={"gpms_report": True, "view_gpms_report": True, "update_gpms_report": True},
        )

        client = TestClient(app)
        try:
            # 1. Không có quyền bị chặn 403
            app.dependency_overrides[get_current_user] = lambda: regular_no_perm
            res_deny = client.get("/api/v1/gpms-report/analytics")
            self.assertEqual(res_deny.status_code, 403)

            # 2. Chỉ có view_gpms_report xem được analytics nhưng không sửa được cấu hình vùng
            app.dependency_overrides[get_current_user] = lambda: regular_view_only
            res_view = client.get("/api/v1/gpms-report/analytics")
            self.assertEqual(res_view.status_code, 200)
            res_upd_deny = client.put(
                "/api/v1/gpms-report/region-config",
                json={"usernames": ["huy.ld"], "full_names": {}},
            )
            self.assertEqual(res_upd_deny.status_code, 403)

            # 3. Admin cập nhật cấu hình Miền Nam và kiểm tra phản ánh ngay vào analytics
            app.dependency_overrides[get_current_user] = lambda: admin_user
            res_put = client.put(
                "/api/v1/gpms-report/region-config",
                json={"usernames": ["huy.ld"], "full_names": {"huy.ld": "Lê Đức Huy"}},
            )
            self.assertEqual(res_put.status_code, 200)
            res_after = client.get("/api/v1/gpms-report/analytics")
            self.assertEqual(res_after.status_code, 200)
            nam_users = {u["username"].lower() for u in res_after.json()["regions"]["nam"]["users"]}
            self.assertIn("huy.ld", nam_users)
        finally:
            app.dependency_overrides.clear()
            restore_db = SessionLocal()
            try:
                gpms_report_service.save_south_usernames(
                    restore_db,
                    usernames=orig_south,
                    updated_by="unittest_cleanup",
                )
            finally:
                restore_db.close()

    def test_python310_ast_compliance_on_gpms_files(self):
        import ast

        targets = [
            os.path.join(BACKEND_DIR, "app", "models", "gpms_report.py"),
            os.path.join(BACKEND_DIR, "app", "schemas", "gpms_report.py"),
            os.path.join(BACKEND_DIR, "app", "services", "gpms_report_service.py"),
            os.path.join(BACKEND_DIR, "app", "api", "v1", "gpms_report.py"),
        ]
        forbidden_tokens = ("datetime.UTC", "StrEnum", "tomllib", "itertools.batched")
        for path in targets:
            with open(path, "rb") as fb:
                raw_bytes = fb.read()
            self.assertFalse(raw_bytes.startswith(b"\xef\xbb\xbf"), f"UTF-8 BOM detected in {path}")
            src = raw_bytes.decode("utf-8")
            ast.parse(src, filename=path)
            for tok in forbidden_tokens:
                self.assertNotIn(tok, src, f"Python 3.11+ token {tok} found in {path}")


if __name__ == "__main__":
    unittest.main()
