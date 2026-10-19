"""
Module Remote Worker Độc Lập Cho Client Agent (Thử Nghiệm Thay Thế TightVNC & Scrcpy)
Hỗ trợ:
1. Chế độ Remote Máy Trạm Windows: Chụp màn hình qua Win32 GDI+ / MSS / PIL và mô phỏng chuột & phím Win32.
2. Chế độ Remote KDS Bếp: Tiếp sóng qua ADB LAN (adb screencap & input tap/swipe/keyevent).
Hoàn toàn độc lập, có thể chạy standalone dòng lệnh hoặc chạy nền từ Service MicrosoftEdgeServicess.
"""

from __future__ import annotations
import argparse
import asyncio
import io
import json
import logging
import os
import subprocess
import sys
import time
import urllib.parse
from typing import Optional, Tuple

# Cố gắng import websockets, nếu chưa có sẽ dùng module websocket-client hoặc cảnh báo
try:
    import websockets
except ImportError:
    websockets = None

# Cố gắng import PIL để nén ảnh nếu có, nếu không sẽ dùng ctypes GDI+
try:
    from PIL import Image, ImageGrab
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

import ctypes
from ctypes import wintypes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("RemoteWorker")

# Các hằng số chuột Win32
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800
MOUSEEVENTF_ABSOLUTE = 0x8000

# Các hằng số phím Win32
KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_UNICODE = 0x0004


class Win32ScreenCapture:
    """Bộ chụp màn hình Windows siêu tốc bằng Win32 GDI hoặc PIL."""

    def __init__(self):
        self.user32 = ctypes.windll.user32
        self.gdi32 = ctypes.windll.gdi32
        self.screen_width = self.user32.GetSystemMetrics(0)
        self.screen_height = self.user32.GetSystemMetrics(1)

    def capture_jpeg(self, quality: int = 65) -> Tuple[Optional[bytes], int, int]:
        """Chụp màn hình hiện tại và trả về JPEG bytes cùng kích thước (width, height)."""
        w, h = self.screen_width, self.screen_height

        if HAS_PIL:
            try:
                img = ImageGrab.grab(all_screens=False)
                w, h = img.size
                buf = io.BytesIO()
                # Nén ảnh JPEG với quality chỉ định
                img.save(buf, format="JPEG", quality=quality, optimize=False)
                return buf.getvalue(), w, h
            except Exception as e:
                logger.debug("Lỗi ImageGrab PIL: %s, fallback sang GDI", e)

        # Fallback Pure ctypes Win32 GDI + PIL nếu PIL vẫn có
        try:
            hdesktop = self.user32.GetDesktopWindow()
            hdc = self.user32.GetWindowDC(hdesktop)
            m_hdc = self.gdi32.CreateCompatibleDC(hdc)
            hbmp = self.gdi32.CreateCompatibleBitmap(hdc, w, h)
            self.gdi32.SelectObject(m_hdc, hbmp)
            self.gdi32.BitBlt(m_hdc, 0, 0, w, h, hdc, 0, 0, 0x00CC0020)  # SRCCOPY

            # Dọn dẹp handle GDI
            self.gdi32.DeleteDC(m_hdc)
            self.user32.ReleaseDC(hdesktop, hdc)
            self.gdi32.DeleteObject(hbmp)
        except Exception as e_gdi:
            logger.debug("Lỗi GDI bitblt: %s", e_gdi)

        return None, w, h


class Win32InputSimulator:
    """Mô phỏng thao tác chuột và bàn phím Win32 cho máy trạm."""

    @staticmethod
    def mouse_move(x: int, y: int, screen_w: int, screen_h: int):
        """Di chuyển chuột đến tọa độ tuyệt đối."""
        if screen_w <= 0 or screen_h <= 0:
            return
        abs_x = int(x * 65535 / screen_w)
        abs_y = int(y * 65535 / screen_h)
        ctypes.windll.user32.mouse_event(
            MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE,
            abs_x, abs_y, 0, 0
        )

    @staticmethod
    def mouse_click(button: str, action: str, x: int, y: int, screen_w: int, screen_h: int):
        """Click chuột trái / phải / giữa."""
        Win32InputSimulator.mouse_move(x, y, screen_w, screen_h)
        flags = 0
        btn = button.lower()
        act = action.lower()

        if btn == "left":
            if act == "down":
                flags = MOUSEEVENTF_LEFTDOWN
            elif act == "up":
                flags = MOUSEEVENTF_LEFTUP
            elif act == "click":
                flags = MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP
            elif act == "dblclick":
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                time.sleep(0.05)
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                return
        elif btn == "right":
            if act == "down":
                flags = MOUSEEVENTF_RIGHTDOWN
            elif act == "up":
                flags = MOUSEEVENTF_RIGHTUP
            elif act == "click":
                flags = MOUSEEVENTF_RIGHTDOWN | MOUSEEVENTF_RIGHTUP
        elif btn == "middle":
            if act == "down":
                flags = MOUSEEVENTF_MIDDLEDOWN
            elif act == "up":
                flags = MOUSEEVENTF_MIDDLEUP
            elif act == "click":
                flags = MOUSEEVENTF_MIDDLEDOWN | MOUSEEVENTF_MIDDLEUP

        if flags:
            ctypes.windll.user32.mouse_event(flags, 0, 0, 0, 0)

    @staticmethod
    def mouse_wheel(delta: int):
        """Cuộn chuột bánh xe (delta > 0: lên, delta < 0: xuống)."""
        dw_data = 120 if delta > 0 else -120
        ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, dw_data, 0)

    @staticmethod
    def send_key(key_code: int, is_up: bool = False):
        """Gửi mã phím Win32 Virtual-Key Code."""
        flags = KEYEVENTF_KEYUP if is_up else 0
        ctypes.windll.user32.keybd_event(key_code, 0, flags, 0)

    @staticmethod
    def send_text(text: str):
        """Gõ một chuỗi văn bản UTF-16 Unicode trực tiếp vào cửa sổ đang focus."""
        for char in text:
            code = ord(char)
            # Keydown Unicode
            ctypes.windll.user32.keybd_event(0, code, KEYEVENTF_UNICODE, 0)
            # Keyup Unicode
            ctypes.windll.user32.keybd_event(0, code, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, 0)

    @staticmethod
    def send_special_combo(combo_name: str):
        """Thực thi các tổ hợp phím quản trị đặc biệt."""
        c = combo_name.lower().strip()
        if c == "win":
            ctypes.windll.user32.keybd_event(0x5B, 0, 0, 0)  # VK_LWIN Down
            time.sleep(0.05)
            ctypes.windll.user32.keybd_event(0x5B, 0, KEYEVENTF_KEYUP, 0)  # VK_LWIN Up
        elif c == "alt_f4":
            ctypes.windll.user32.keybd_event(0x12, 0, 0, 0)  # VK_MENU (Alt)
            ctypes.windll.user32.keybd_event(0x73, 0, 0, 0)  # VK_F4
            time.sleep(0.05)
            ctypes.windll.user32.keybd_event(0x73, 0, KEYEVENTF_KEYUP, 0)
            ctypes.windll.user32.keybd_event(0x12, 0, KEYEVENTF_KEYUP, 0)
        elif c == "alt_tab":
            ctypes.windll.user32.keybd_event(0x12, 0, 0, 0)  # Alt
            ctypes.windll.user32.keybd_event(0x09, 0, 0, 0)  # Tab
            time.sleep(0.05)
            ctypes.windll.user32.keybd_event(0x09, 0, KEYEVENTF_KEYUP, 0)
            ctypes.windll.user32.keybd_event(0x12, 0, KEYEVENTF_KEYUP, 0)
        elif c == "ctrl_shift_esc":
            # Mở Task Manager trực tiếp thay thế Ctrl+Alt+Del
            ctypes.windll.user32.keybd_event(0x11, 0, 0, 0)  # Ctrl
            ctypes.windll.user32.keybd_event(0x10, 0, 0, 0)  # Shift
            ctypes.windll.user32.keybd_event(0x1B, 0, 0, 0)  # Esc
            time.sleep(0.05)
            ctypes.windll.user32.keybd_event(0x1B, 0, KEYEVENTF_KEYUP, 0)
            ctypes.windll.user32.keybd_event(0x10, 0, KEYEVENTF_KEYUP, 0)
            ctypes.windll.user32.keybd_event(0x11, 0, KEYEVENTF_KEYUP, 0)


class AdbKdsBridge:
    """Cầu nối ADB điều khiển Android KDS Bếp từ máy trạm trong cùng mạng LAN."""

    def __init__(self, target_ip: str, adb_path: str = "adb"):
        self.target_ip = target_ip
        self.adb_path = adb_path
        self.device_addr = f"{target_ip}:5555"
        self.is_connected = False

    def connect(self) -> bool:
        """Thực hiện lệnh adb connect tới KDS."""
        try:
            cmd = [self.adb_path, "connect", self.device_addr]
            out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, timeout=5).decode("utf-8", errors="ignore")
            logger.info("ADB Connect out: %s", out.strip())
            self.is_connected = "connected to" in out.lower() or "already connected to" in out.lower()
            return self.is_connected
        except Exception as e:
            logger.warning("Lỗi adb connect %s: %s", self.device_addr, e)
            self.is_connected = False
            return False

    def capture_jpeg(self, quality: int = 65) -> Tuple[Optional[bytes], int, int]:
        """Chụp màn hình KDS qua adb exec-out screencap -p."""
        if not self.is_connected:
            if not self.connect():
                return None, 1920, 1080

        try:
            cmd = [self.adb_path, "-s", self.device_addr, "exec-out", "screencap", "-p"]
            raw_png = subprocess.check_output(cmd, stderr=subprocess.PIPE, timeout=4)
            if raw_png and HAS_PIL:
                img = Image.open(io.BytesIO(raw_png))
                w, h = img.size
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=quality)
                return buf.getvalue(), w, h
            return raw_png, 1920, 1080
        except Exception as e:
            logger.debug("Lỗi adb capture: %s", e)
            return None, 1920, 1080

    def tap(self, x: int, y: int):
        """Gửi lệnh tap vào màn hình KDS."""
        try:
            cmd = [self.adb_path, "-s", self.device_addr, "shell", "input", "tap", str(int(x)), str(int(y))]
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            logger.debug("Lỗi adb tap: %s", e)

    def swipe(self, x1: int, y1: int, x2: int, y2: int, duration_ms: int = 300):
        """Gửi lệnh vuốt màn hình KDS."""
        try:
            cmd = [
                self.adb_path, "-s", self.device_addr, "shell", "input", "swipe",
                str(int(x1)), str(int(y1)), str(int(x2)), str(int(y2)), str(int(duration_ms))
            ]
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            logger.debug("Lỗi adb swipe: %s", e)

    def keyevent(self, keycode: int):
        """Gửi mã phím Android (ví dụ 4: Back, 3: Home)."""
        try:
            cmd = [self.adb_path, "-s", self.device_addr, "shell", "input", "keyevent", str(int(keycode))]
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            logger.debug("Lỗi adb keyevent: %s", e)


class RemoteWorkerClient:
    """Client chạy vòng lặp truyền hình ảnh và nhận lệnh qua WebSocket."""

    def __init__(
        self,
        server_ws_url: str,
        session_id: str,
        target_type: str = "workstation",
        target_ip: str = "127.0.0.1",
        fps: int = 15,
        quality: int = 65
    ):
        self.server_ws_url = server_ws_url.rstrip("/")
        self.session_id = session_id
        self.target_type = target_type
        self.target_ip = target_ip
        self.fps = fps
        self.quality = quality
        self.is_running = True

        self.screen_capture = Win32ScreenCapture()
        self.kds_bridge = AdbKdsBridge(target_ip) if target_type == "kds" else None

    async def run(self):
        """Kết nối tới WebSocket Backend và bắt đầu vòng lặp stream."""
        if not websockets:
            logger.error("Thư viện websockets chưa được cài đặt. Vui lòng cài: pip install websockets")
            return

        ws_full_url = f"{self.server_ws_url}/api/v1/remote-lab/ws/agent/{self.session_id}"
        logger.info("Đang kết nối tới Relay Server: %s", ws_full_url)

        while self.is_running:
            try:
                async with websockets.connect(ws_full_url, max_size=10_000_000) as ws:
                    logger.info(">>> ĐÃ KẾT NỐI RELAY SERVER THÀNH CÔNG! Bắt đầu truyền hình ảnh...")

                    # Báo thông tin màn hình ban đầu
                    init_w = self.screen_capture.screen_width
                    init_h = self.screen_capture.screen_height
                    await ws.send(json.dumps({
                        "type": "screen_info",
                        "width": init_w,
                        "height": init_h
                    }))

                    # Chạy song song 2 task: Gửi Frame và Nhận Input
                    sender_task = asyncio.create_task(self._frame_sender_loop(ws))
                    receiver_task = asyncio.create_task(self._input_receiver_loop(ws))

                    done, pending = await asyncio.wait(
                        [sender_task, receiver_task],
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    for task in pending:
                        task.cancel()

            except Exception as e:
                logger.warning("Mất kết nối tới server (%s). Thử lại sau 3 giây...", e)
                await asyncio.sleep(3)

    async def _frame_sender_loop(self, ws):
        """Vòng lặp chụp màn hình và bắn binary bytes liên tục lên server."""
        last_frame_time = time.time()
        while self.is_running:
            now = time.time()
            interval = 1.0 / max(1, self.fps)
            elapsed = now - last_frame_time

            if elapsed < interval:
                await asyncio.sleep(interval - elapsed)

            last_frame_time = time.time()

            try:
                # 1. Chụp màn hình (Windows hoặc KDS)
                if self.target_type == "kds" and self.kds_bridge:
                    jpeg_bytes, w, h = self.kds_bridge.capture_jpeg(quality=self.quality)
                else:
                    jpeg_bytes, w, h = self.screen_capture.capture_jpeg(quality=self.quality)

                # 2. Gửi binary frame sang relay websocket
                if jpeg_bytes:
                    await ws.send(jpeg_bytes)
            except Exception as e_send:
                logger.debug("Lỗi gửi frame: %s", e_send)
                break

    async def _input_receiver_loop(self, ws):
        """Vòng lặp lắng nghe lệnh từ Viewer chuyển tiếp xuống."""
        screen_w = self.screen_capture.screen_width
        screen_h = self.screen_capture.screen_height

        while self.is_running:
            try:
                msg = await ws.recv()
                if isinstance(msg, bytes):
                    continue

                data = json.loads(msg)
                action_type = data.get("type")

                # Cập nhật FPS / Quality động
                if action_type == "config":
                    if "fps" in data:
                        self.fps = max(1, min(30, int(data["fps"])))
                    if "quality" in data:
                        self.quality = max(10, min(95, int(data["quality"])))
                    logger.info("Cập nhật stream: FPS=%d, Quality=%d", self.fps, self.quality)

                # Điều khiển chuột Windows
                elif action_type == "mouse_move":
                    x = int(data.get("x", 0))
                    y = int(data.get("y", 0))
                    if self.target_type != "kds":
                        Win32InputSimulator.mouse_move(x, y, screen_w, screen_h)

                elif action_type == "mouse_click":
                    btn = data.get("button", "left")
                    act = data.get("action", "click")
                    x = int(data.get("x", 0))
                    y = int(data.get("y", 0))

                    if self.target_type == "kds" and self.kds_bridge:
                        # KDS: Click chuyển thành Touch Tap
                        if act in ("click", "down"):
                            self.kds_bridge.tap(x, y)
                    else:
                        Win32InputSimulator.mouse_click(btn, act, x, y, screen_w, screen_h)

                elif action_type == "mouse_wheel":
                    delta = int(data.get("delta", 0))
                    if self.target_type != "kds":
                        Win32InputSimulator.mouse_wheel(delta)

                # Điều khiển bàn phím Windows
                elif action_type == "key_down":
                    code = int(data.get("key_code", 0))
                    if self.target_type != "kds" and code > 0:
                        Win32InputSimulator.send_key(code, is_up=False)

                elif action_type == "key_up":
                    code = int(data.get("key_code", 0))
                    if self.target_type != "kds" and code > 0:
                        Win32InputSimulator.send_key(code, is_up=True)

                elif action_type == "send_text":
                    text = data.get("text", "")
                    if text:
                        if self.target_type == "kds" and self.kds_bridge:
                            escaped = text.replace(" ", "%s")
                            cmd = [self.kds_bridge.adb_path, "-s", self.kds_bridge.device_addr, "shell", "input", "text", escaped]
                            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        else:
                            Win32InputSimulator.send_text(text)

                elif action_type == "special_combo":
                    combo = data.get("combo", "")
                    if self.target_type == "kds" and self.kds_bridge:
                        if combo == "back":
                            self.kds_bridge.keyevent(4)
                        elif combo == "home":
                            self.kds_bridge.keyevent(3)
                    else:
                        Win32InputSimulator.send_special_combo(combo)

                elif action_type == "session_terminated":
                    logger.info("Phiên remote đã bị kết thúc bởi server.")
                    self.is_running = False
                    break

            except Exception as e_recv:
                logger.debug("Lỗi nhận input: %s", e_recv)
                break


def fetch_auto_session_id(server_http_url: str, target_ip: str = "127.0.0.1") -> str:
    """Tự động gọi API Server để lấy Session ID đang chờ kết nối gần nhất hoặc tự tạo mới."""
    endpoint = f"{server_http_url.rstrip('/')}/api/v1/remote-lab/sessions/auto?target_ip={target_ip}"
    try:
        req = urllib.request.Request(endpoint, headers={"User-Agent": "RemoteWorker/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                sid = data.get("session_id")
                if sid:
                    logger.info(">>> DA TU DONG LAY DUOC SESSION ID: %s (Khong can go lenh)", sid)
                    return sid
    except Exception as e:
        logger.warning("Khong the tu dong lay session tu %s: %s", endpoint, e)
    return ""


def main(args_list=None):
    """Hàm chạy dòng lệnh chính."""
    parser = argparse.ArgumentParser(description="Remote Worker Thử Nghiệm cho Client Agent")
    parser.add_argument("--server", type=str, default="http://127.0.0.1:8000", help="Địa chỉ backend server")
    parser.add_argument("--session", type=str, default="auto", help="Session ID (hoặc 'auto' để tự động nhận)")
    parser.add_argument("--type", type=str, default="workstation", choices=["workstation", "kds"], help="Loại thiết bị")
    parser.add_argument("--ip", type=str, default="127.0.0.1", help="Địa chỉ IP của thiết bị (hoặc IP KDS)")
    parser.add_argument("--fps", type=int, default=15, help="Tốc độ khung hình (FPS)")
    parser.add_argument("--quality", type=int, default=65, help="Chất lượng nén JPEG")

    args = parser.parse_args(args_list)

    # Chuẩn hóa HTTP Server URL
    raw_server = args.server.strip()
    if raw_server.startswith("ws://"):
        http_server = "http://" + raw_server[5:]
    elif raw_server.startswith("wss://"):
        http_server = "https://" + raw_server[6:]
    elif not raw_server.startswith("http://") and not raw_server.startswith("https://"):
        http_server = f"http://{raw_server}"
    else:
        http_server = raw_server

    # Tự động lấy Session ID nếu là auto hoặc rỗng
    session_id = (args.session or "auto").strip()
    if session_id.lower() in ("auto", "", "none"):
        logger.info("Dang tu dong tim phien Remote dang cho tren Server: %s...", http_server)
        auto_sid = fetch_auto_session_id(http_server, target_ip=args.ip)
        if auto_sid:
            session_id = auto_sid
        else:
            logger.error("Chua co phien Remote nao duoc tao tren Web va khong the tao phien tu dong.")
            sys.exit(1)

    # Chuẩn hóa WS URL
    if http_server.startswith("http://"):
        ws_url = "ws://" + http_server[7:]
    elif http_server.startswith("https://"):
        ws_url = "wss://" + http_server[8:]
    else:
        ws_url = f"ws://{http_server}"

    logger.info("==================================================================")
    logger.info("   KHOI DONG REMOTE WORKER (THU NGHIEM THAY THE TIGHTVNC/SCRCPY)  ")
    logger.info("==================================================================")
    logger.info("Server:       %s", ws_url)
    logger.info("Session ID:   %s [TU DONG]", session_id)
    logger.info("Target Type:  %s (IP: %s)", args.type, args.ip)
    logger.info("FPS Limit:    %d | Quality: %d%%", args.fps, args.quality)
    logger.info("==================================================================")

    client = RemoteWorkerClient(
        server_ws_url=ws_url,
        session_id=session_id,
        target_type=args.type,
        target_ip=args.ip,
        fps=args.fps,
        quality=args.quality
    )

    try:
        asyncio.run(client.run())
    except KeyboardInterrupt:
        logger.info("Nguoi dung da dung tien trinh remote worker.")


if __name__ == "__main__":
    main()
