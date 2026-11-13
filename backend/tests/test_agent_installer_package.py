"""
Unit tests for Client Agent installer scripts and package packaging.
Ensures:
1. 100% Windows CRLF line endings on all .bat and .cmd files (Zero bare LF).
2. Pure ASCII (0-127) compliance without corrupting accented characters.
3. Flat batch structure (No multiline parenthesized blocks with echo that crash cmd.exe).
4. Download package endpoint automatically normalizes all text/batch files to CRLF.
"""
import os
import sys
import re
import glob
import zipfile
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

AGENT_TOOLS_DIR = os.path.join(PROJECT_ROOT, "tools", "restaurant_support_agent")
PACKAGES_DIR = os.path.join(PROJECT_ROOT, "tools", "packages")


class TestAgentInstallerPackage(unittest.TestCase):
    def test_agent_batch_scripts_crlf_line_endings(self):
        """All batch scripts in tools/restaurant_support_agent must use CRLF exclusively."""
        bat_files = glob.glob(os.path.join(AGENT_TOOLS_DIR, "*.bat"))
        self.assertGreaterEqual(len(bat_files), 4, f"Expected at least 4 batch scripts in {AGENT_TOOLS_DIR}")

        for bat_path in bat_files:
            with open(bat_path, "rb") as f:
                content = f.read()

            crlf_count = content.count(b"\r\n")
            bare_lf_count = content.count(b"\n") - crlf_count
            rel_name = os.path.basename(bat_path)

            self.assertEqual(
                bare_lf_count,
                0,
                f"File {rel_name} contains {bare_lf_count} bare LF bytes! "
                f"Batch scripts on Windows require CRLF exclusively to prevent cmd.exe parser seek crashes."
            )
            self.assertGreater(crlf_count, 0, f"File {rel_name} has no CRLF line breaks!")

    def test_agent_batch_scripts_pure_ascii(self):
        """All batch scripts must use Pure ASCII (0-127) to avoid OEM/mojibake corruption on Windows CMD."""
        bat_files = glob.glob(os.path.join(AGENT_TOOLS_DIR, "*.bat"))

        for bat_path in bat_files:
            with open(bat_path, "rb") as f:
                content = f.read()

            rel_name = os.path.basename(bat_path)
            non_ascii = [b for b in content if b > 127]
            self.assertEqual(
                len(non_ascii),
                0,
                f"File {rel_name} contains {len(non_ascii)} non-ASCII bytes! "
                f"All batch scripts must be 100% unaccented Vietnamese / ASCII."
            )

    def test_install_edge_framework_flat_structure(self):
        """
        Install_Edge_Framework.bat must NOT use multiline parenthesized blocks with echo
        (e.g., 'if ... ( echo ... )' or 'for ... ( ... goto :Label )') which crash cmd.exe.
        """
        installer_path = os.path.join(AGENT_TOOLS_DIR, "Install_Edge_Framework.bat")
        with open(installer_path, "r", encoding="ascii", errors="replace") as f:
            text = f.read()

        multiline_if_paren = re.findall(r"if\s+[^\r\n]*?\(\s*[\r\n]+[^\)]*?echo", text, re.IGNORECASE)
        self.assertEqual(
            len(multiline_if_paren),
            0,
            f"Install_Edge_Framework.bat contains multiline if-block with echo: {multiline_if_paren}"
        )

        multiline_for_paren = re.findall(r"for\s+[^\r\n]*?do\s*\(\s*[\r\n]+[^\)]*?goto", text, re.IGNORECASE)
        self.assertEqual(
            len(multiline_for_paren),
            0,
            f"Install_Edge_Framework.bat contains for-loop with goto inside parentheses: {multiline_for_paren}"
        )

        self.assertIn(":DaCoQuyenAdmin", text)
        self.assertIn(":LoiChuaCoQuyenAdmin", text)
        self.assertIn(":CaiDatThanhCong", text)

    def test_static_packages_contain_crlf_batch_scripts(self):
        """Batch files inside static ZIP packages in tools/packages/ must also be 100% CRLF."""
        if not os.path.exists(PACKAGES_DIR):
            return

        for zip_name in ["Restaurant_Support_GPOS.zip", "Restaurant_Support_Agent_Full.zip"]:
            zip_path = os.path.join(PACKAGES_DIR, zip_name)
            if not os.path.exists(zip_path):
                continue

            with zipfile.ZipFile(zip_path, "r") as z:
                for info in z.infolist():
                    if info.filename.lower().endswith(".bat") or info.filename.lower().endswith(".cmd"):
                        data = z.read(info)
                        crlf = data.count(b"\r\n")
                        bare_lf = data.count(b"\n") - crlf
                        self.assertEqual(
                            bare_lf,
                            0,
                            f"Zip {zip_name} contains {info.filename} with {bare_lf} bare LF bytes!"
                        )

    def test_download_package_endpoint_crlf_normalization(self):
        """Dynamic download_package API must stream a ZIP with all batch/json files 100% CRLF."""
        import asyncio
        import io
        from app.api.v1.agent_multitask import download_package
        from app.schemas.auth import UserInfo

        dummy_user = UserInfo(id=1, username="test_admin", full_name="Admin", is_super_admin=True, roles=["admin"])
        resp = download_package(
            server_url="http://172.16.8.25:8000",
            restaurant_code="TEST_NH",
            current_user=dummy_user
        )

        async def _collect_bytes():
            chunks = []
            async for chunk in resp.body_iterator:
                chunks.append(chunk)
            return b"".join(chunks)

        zip_bytes = asyncio.run(_collect_bytes())
        self.assertGreater(len(zip_bytes), 1000)

        with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as z:
            names = z.namelist()
            self.assertIn("Install_Edge_Framework.bat", names)
            self.assertIn("msedge_settings.json", names)

            for name in names:
                if name.lower().endswith((".bat", ".cmd", ".json")):
                    data = z.read(name)
                    crlf = data.count(b"\r\n")
                    bare_lf = data.count(b"\n") - crlf
                    self.assertEqual(
                        bare_lf,
                        0,
                        f"Dynamic package contains {name} with {bare_lf} bare LF bytes!"
                    )
                    self.assertGreater(
                        crlf,
                        0,
                        f"Dynamic package contains {name} without any CRLF!"
                    )


if __name__ == "__main__":
    unittest.main()
