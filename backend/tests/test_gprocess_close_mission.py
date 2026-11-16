# -*- coding: utf-8 -*-
"""
Unit tests (TDD) cho quy trình đóng nhiệm vụ G-Process trong ticket_batch_service.py:
- Chống false-positive "Thành công" khi mới chỉ lưu Timesheet 0h (Pn() thoát sớm ở lần bấm Xác nhận đầu).
- Kiểm tra chính xác radio 'Không đạt' trong hàng checklist (styles_checkbox) và điền + blur comment.
- Bấm đúng input/span radio 'Kết thúc quy trình' tránh bẫy nested <label for="">.
- Kiểm tra hoàn tất thực tế (URL rời chi tiết / API process-gpms / ProcessStatus_stepContainer chuyển Không duyệt|Hoàn thành).
"""

import ast
import asyncio
from pathlib import Path


def test_is_gprocess_step_completed_helper():
    from app.services.ticket_batch_service import _is_gprocess_step_completed

    assert _is_gprocess_step_completed(
        "02.\nIT xác nhận lỗi kỹ thuật\nNgười thực hiện : dung.nguyenanh\nĐang thực hiện"
    ) is False
    assert _is_gprocess_step_completed(
        "02.\nIT xác nhận lỗi kỹ thuật\nNgười thực hiện : dung.nguyenanh\nKhông duyệt"
    ) is True
    assert _is_gprocess_step_completed(
        "02.\nIT xác nhận lỗi kỹ thuật\nNgười thực hiện : dung.nguyenanh\nHoàn thành"
    ) is True
    assert _is_gprocess_step_completed(
        "01.\nHoàn thành\n02.\nIT xác nhận lỗi kỹ thuật\nĐang thực hiện"
    ) is False


def test_gprocess_close_mission_selectors_and_guards():
    src = (
        Path(__file__).resolve().parent.parent / "app" / "services" / "ticket_batch_service.py"
    ).read_text(encoding="utf-8")

    # 1. Không dùng bare div:has-text("02. IT xác nhận lỗi kỹ thuật") vì dính #root chứa bước 01 Hoàn thành
    assert 'ProcessStatus_stepContainer' in src
    # 2. Phải click đúng ant-radio-wrapper thứ 2 bên trong checkListItem (Không đạt) & blur textarea
    assert 'checkListItem' in src
    assert 'styles_checkListComment' in src
    # 3. Phải click span.ant-radio / input.ant-radio-input bên trong Kết thúc quy trình
    assert 'span.ant-radio, input.ant-radio-input' in src
    # 4. Phải xử lý bấm Xác nhận lần 2 sau khi đóng modal Khai báo Timesheet
    assert '_handle_gprocess_popups_and_resubmit' in src or 'timesheet_saved' in src
    # 5. Phải kiểm tra toast yêu cầu/cảnh báo tiếng Việt ngoài từ khóa lỗi
    assert 'yêu cầu' in src.lower()


def test_ticket_batch_service_is_python310_compatible():
    target = Path(__file__).resolve().parent.parent / "app" / "services" / "ticket_batch_service.py"
    src = target.read_text(encoding="utf-8")
    assert not src.startswith("\ufeff")
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            for val in node.values:
                if isinstance(val, ast.FormattedValue):
                    seg = ast.get_source_segment(src, val) or ""
                    assert "\\" not in seg, f"f-string Python 3.10 invalid backslash at line {node.lineno}: {seg}"


def test_verify_gprocess_submission_rejects_timesheet_only_success():
    """
    Giả lập tình huống lỗi thực tế:
    - GPMS chỉ hiện toast 'Lưu timesheet thành công', KHÔNG chuyển URL và bước 02 vẫn 'Đang thực hiện'.
    - Hàm xác nhận phải coi đây là CHƯA HOÀN TẤT (raises RuntimeError / False), tuyệt đối không báo Thành công giả!
    """
    from app.services.ticket_batch_service import _verify_gprocess_mission_completed

    assert _verify_gprocess_mission_completed(
        mission_id="688278",
        curr_url="https://gpms.ggg.com.vn/g-process/my-mission/688278",
        step2_text="02.\nIT xác nhận lỗi kỹ thuật\nĐang thực hiện",
        confirm_disabled=False,
        mission_api_succeeded=False,
    ) is False

    # Chỉ chấp nhận Thành công khi:
    # Case 1: URL rời chi tiết my-mission/688278
    assert _verify_gprocess_mission_completed(
        mission_id="688278",
        curr_url="https://gpms.ggg.com.vn/g-process/my-mission",
        step2_text="",
        confirm_disabled=False,
        mission_api_succeeded=False,
    ) is True

    # Case 2: Bước 02 chuyển sang 'Không duyệt' / 'Hoàn thành' và hết 'Đang thực hiện' + nút Xác nhận disabled
    assert _verify_gprocess_mission_completed(
        mission_id="688278",
        curr_url="https://gpms.ggg.com.vn/g-process/my-mission/688278",
        step2_text="02.\nIT xác nhận lỗi kỹ thuật\nKhông duyệt",
        confirm_disabled=True,
        mission_api_succeeded=False,
    ) is True

    # Case 3: API cập nhật task process-gpms trả HTTP 200/201
    assert _verify_gprocess_mission_completed(
        mission_id="688278",
        curr_url="https://gpms.ggg.com.vn/g-process/my-mission/688278",
        step2_text="02.\nIT xác nhận lỗi kỹ thuật\nĐang thực hiện",
        confirm_disabled=False,
        mission_api_succeeded=True,
    ) is True

