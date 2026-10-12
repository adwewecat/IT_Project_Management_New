import os
import io
import logging
import smtplib
import ssl
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from email.message import EmailMessage
from email.utils import make_msgid
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt
import matplotlib.patches as patches

from sqlalchemy import text
from app.core.database import engine

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
CHART_PATH = os.path.join(DATA_DIR, "doanh_so_daily.png")


class SalesReportService:
    SMTP_HOST = "smtp.office365.com"
    SMTP_PORT = 587
    SMTP_USER = "ss.it@ggg.com.vn"
    SMTP_PASSWORD = "Agg$123iT%%"

    @classmethod
    def generate_sales_dashboard_image(cls, target_date: Optional[date] = None) -> str:
        """
        Generate exact sales dashboard image matching the approved design:
        - Top 3 Metric Cards (Doanh thu hôm nay, Lượng khách, Tham chiếu so sánh)
        - 7-Day Grouped Bar Chart (Sales Tỷ & Nghìn TC)
        - Top 5 Nhà Hàng Doanh Thu Cao Nhất (with numbered badges)
        - Doanh Thu Theo Brand (Horizontal progress bars)
        Saves to CHART_PATH and returns filepath.
        """
        if target_date is None:
            target_date = date.today() - timedelta(days=1)

        target_date_str = target_date.strftime("%Y-%m-%d")
        date_display = target_date.strftime("%d/%m/%Y")

        # 1. Fetch metrics from DB ITDEPT
        with engine.connect() as conn:
            # Today metrics
            today_row = conn.execute(
                text("SELECT TOTAL_SALE, TOTAL_TC FROM dbo.TOTAL_SALES_DAILY WHERE CAST(NGAY AS DATE) = :dt"),
                {"dt": target_date_str}
            ).fetchone()

            sales_today = float(today_row[0]) if today_row and today_row[0] else 0.0
            guests_today = int(today_row[1]) if today_row and today_row[1] else 0
            avg_spend = (sales_today / guests_today) if guests_today > 0 else 0.0

            # Yesterday metrics
            yesterday_dt = target_date - timedelta(days=1)
            y_row = conn.execute(
                text("SELECT TOTAL_SALE FROM dbo.TOTAL_SALES_DAILY WHERE CAST(NGAY AS DATE) = :dt"),
                {"dt": yesterday_dt.strftime("%Y-%m-%d")}
            ).fetchone()
            sales_yesterday = float(y_row[0]) if y_row and y_row[0] else 0.0

            # Same day last week (7 days ago)
            last_week_dt = target_date - timedelta(days=7)
            lw_row = conn.execute(
                text("SELECT TOTAL_SALE FROM dbo.TOTAL_SALES_DAILY WHERE CAST(NGAY AS DATE) = :dt"),
                {"dt": last_week_dt.strftime("%Y-%m-%d")}
            ).fetchone()
            sales_last_week = float(lw_row[0]) if lw_row and lw_row[0] else 0.0

            # 7 Days history for bar chart (ending at target_date)
            start_7_days = target_date - timedelta(days=6)
            hist_rows = conn.execute(
                text("""
                    SELECT CAST(NGAY AS DATE) as D, TOTAL_SALE, TOTAL_TC 
                    FROM dbo.TOTAL_SALES_DAILY 
                    WHERE CAST(NGAY AS DATE) BETWEEN :s AND :e
                    ORDER BY CAST(NGAY AS DATE) ASC
                """),
                {"s": start_7_days.strftime("%Y-%m-%d"), "e": target_date_str}
            ).fetchall()

            # Top 5 restaurants
            top5_rows = conn.execute(
                text("""
                    SELECT TOP 5 TEN_NHAHANG, CAST(TONGTIEN_SV AS FLOAT) as SALES
                    FROM dbo.SO_LIEU_CHECK_SALES_DAILY
                    WHERE NGAY_SALE = :dt AND TONGTIEN_SV IS NOT NULL
                    ORDER BY CAST(TONGTIEN_SV AS FLOAT) DESC
                """),
                {"dt": target_date_str}
            ).fetchall()

            # Brand breakdown
            all_res = conn.execute(
                text("""
                    SELECT TEN_NHAHANG, CAST(TONGTIEN_SV AS FLOAT) as SALES
                    FROM dbo.SO_LIEU_CHECK_SALES_DAILY
                    WHERE NGAY_SALE = :dt AND TONGTIEN_SV IS NOT NULL
                """),
                {"dt": target_date_str}
            ).fetchall()

        # Comparison helper
        def format_diff(curr, prev):
            if prev <= 0:
                return "+0.0% ↑"
            diff = ((curr - prev) / prev) * 100
            sign = "+" if diff >= 0 else ""
            arrow = "↑" if diff >= 0 else "↓"
            return f"{sign}{diff:.1f}% {arrow}"

        y_diff_str = format_diff(sales_today, sales_yesterday)
        lw_diff_str = format_diff(sales_today, sales_last_week)

        # 7-day chart data
        day_abbrs = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
        chart_dates = []
        chart_sales_bil = []
        chart_guests_k = []

        hist_dict = {r[0]: (float(r[1] or 0), int(r[2] or 0)) for r in hist_rows}
        for i in range(7):
            cur_d = start_7_days + timedelta(days=i)
            w_name = day_abbrs[cur_d.weekday()]
            label = f"{w_name} ({cur_d.strftime('%d/%m')})"
            chart_dates.append(label)
            s, g = hist_dict.get(cur_d, (0.0, 0))
            chart_sales_bil.append(s / 1e9)
            chart_guests_k.append(g / 1e3)

        # Brand breakdown
        known_brands = ["Gogi", "Kichi", "Manwah", "Isushi", "Ashima", "Sumo", "Cowboy", "Hutong"]
        brand_map = {"Gogi": "Gogi House", "Kichi": "Kichi", "Manwah": "Manwah", "Isushi": "iSushi", "Ashima": "Ashima", "Sumo": "Sumo BBQ"}
        b_totals = {}
        for r in all_res:
            name = r[0] or ""
            sale = r[1] or 0.0
            m = "Khác"
            for kb in known_brands:
                if kb.lower() in name.lower():
                    m = brand_map.get(kb, kb)
                    break
            b_totals[m] = b_totals.get(m, 0.0) + sale

        sorted_b = sorted([(k, v) for k, v in b_totals.items() if k != "Khác"], key=lambda x: x[1], reverse=True)
        top_brands = sorted_b[:4]
        other_val = sum([v for k, v in sorted_b[4:]]) + b_totals.get("Khác", 0.0)
        top_brands.append(("Khác", other_val))

        # Clean restaurant names
        def clean_nh_name(raw_name):
            name = raw_name.split("(")[0].strip()
            name = name.replace("Gogi House", "Gogi").replace("Kichi-Kichi", "Kichi")
            return name

        top5_clean = [(clean_nh_name(r[0]), float(r[1])/1e6) for r in top5_rows]

        # --- DRAW DASHBOARD FIGURE ---
        fig = plt.figure(figsize=(12.0, 6.6), dpi=150)
        fig.patch.set_facecolor("#ffffff")

        # Title
        fig.text(0.04, 0.935, f"BÁO CÁO DOANH THU SALES RK7 - NGÀY {date_display}",
                 fontsize=19, fontweight="bold", color="#0b192c", family="sans-serif")

        c_gold_border = "#f59e0b"
        c_gray_border = "#e2e8f0"
        c_gold_bar = "#f59e0b"
        c_green_bar = "#1e7e34"

        # 1. Top Cards
        ax_top = fig.add_axes([0.04, 0.69, 0.92, 0.21])
        ax_top.set_xlim(0, 1)
        ax_top.set_ylim(0, 1)
        ax_top.axis("off")

        # Card 1: Doanh thu ngày D-1
        rect1 = patches.FancyBboxPatch((0.005, 0.04), 0.31, 0.92, boxstyle="round,pad=0.015,rounding_size=0.04",
                                      edgecolor=c_gold_border, facecolor="#ffffff", linewidth=2.0)
        ax_top.add_patch(rect1)
        ax_top.text(0.16, 0.77, f"DOANH THU ({target_date.strftime('%d/%m/%Y')})",
                    ha="center", va="center", fontsize=9.5, fontweight="bold", color="#1e293b")
        ax_top.text(0.16, 0.38, f"{sales_today/1e9:.2f} TỶ VNĐ",
                    ha="center", va="center", fontsize=21, fontweight="bold", color="#0f172a")

        # Card 2: Lượng khách
        rect2 = patches.FancyBboxPatch((0.345, 0.04), 0.31, 0.92, boxstyle="round,pad=0.015,rounding_size=0.04",
                                      edgecolor=c_gray_border, facecolor="#ffffff", linewidth=1.5)
        ax_top.add_patch(rect2)
        ax_top.text(0.50, 0.77, "TỔNG LƯỢNG KHÁCH",
                    ha="center", va="center", fontsize=9.5, fontweight="bold", color="#1e293b")
        ax_top.text(0.50, 0.43, f"{guests_today:,} KHÁCH",
                    ha="center", va="center", fontsize=20, fontweight="bold", color="#0f172a")
        ax_top.text(0.50, 0.18, f"(TB {avg_spend:,.0f} đ/khách)",
                    ha="center", va="center", fontsize=9.0, color="#64748b")

        # Card 3: Tham chiếu so sánh
        rect3 = patches.FancyBboxPatch((0.685, 0.04), 0.31, 0.92, boxstyle="round,pad=0.015,rounding_size=0.04",
                                      edgecolor=c_gray_border, facecolor="#ffffff", linewidth=1.5)
        ax_top.add_patch(rect3)
        ax_top.text(0.705, 0.81, "THAM CHIẾU SO SÁNH",
                    ha="left", va="center", fontsize=9.5, fontweight="bold", color="#1e293b")

        y_line = f"Hôm trước ({yesterday_dt.strftime('%d/%m')}):\n{sales_yesterday/1e9:.2f} Tỷ ({y_diff_str})"
        ax_top.text(0.705, 0.55, y_line, ha="left", va="center", fontsize=8.5, color="#334155")

        lw_line = f"Cùng ngày tuần trước ({last_week_dt.strftime('%d/%m')}):\n{sales_last_week/1e9:.2f} Tỷ ({lw_diff_str})"
        ax_top.text(0.705, 0.22, lw_line, ha="left", va="center", fontsize=8.5, color="#334155")

        # 2. Middle Chart: 7 Days Bar Chart
        ax_chart = fig.add_axes([0.04, 0.405, 0.92, 0.22])

        ax_chart.plot([], [], color=c_gold_bar, marker='s', linestyle='', markersize=8, label='Sales (Tỷ)')
        ax_chart.plot([], [], color=c_green_bar, marker='s', linestyle='', markersize=8, label='Nghìn TC')
        ax_chart.legend(loc="upper center", bbox_to_anchor=(0.5, 1.25), ncol=2, frameon=False, fontsize=9.5)

        x_idx = range(7)
        width = 0.22

        bars_s = ax_chart.bar([p - width/2 - 0.015 for p in x_idx], chart_sales_bil, width=width,
                              color=c_gold_bar, edgecolor="none", zorder=3)
        bars_g = ax_chart.bar([p + width/2 + 0.015 for p in x_idx], chart_guests_k, width=width,
                              color=c_green_bar, edgecolor="none", zorder=3)

        # Add data labels on top of each bar
        for rect in bars_s:
            h = rect.get_height()
            if h > 0:
                ax_chart.text(rect.get_x() + rect.get_width() / 2, h + 0.8,
                              f"{h:.1f}", ha='center', va='bottom',
                              fontsize=8, fontweight='bold', color='#b45309', zorder=4)

        for rect in bars_g:
            h = rect.get_height()
            if h > 0:
                ax_chart.text(rect.get_x() + rect.get_width() / 2, h + 0.8,
                              f"{h:.1f}", ha='center', va='bottom',
                              fontsize=8, fontweight='bold', color='#166534', zorder=4)

        ax_chart.set_xticks(x_idx)
        ax_chart.set_xticklabels(chart_dates, fontsize=9, color="#334155")

        ax_chart.spines['top'].set_visible(False)
        ax_chart.spines['right'].set_visible(False)
        ax_chart.spines['left'].set_visible(False)
        ax_chart.spines['bottom'].set_color("#cbd5e1")
        ax_chart.set_yticks([])
        ax_chart.grid(axis='y', linestyle='--', alpha=0.35, color="#cbd5e1", zorder=1)
        ax_chart.set_facecolor("#ffffff")

        max_c = max(max(chart_sales_bil or [0]), max(chart_guests_k or [0]))
        ax_chart.set_ylim(0, max_c * 1.22 if max_c > 0 else 10)

        # 3. Bottom Cards
        # Bottom Left: Top 5
        ax_bleft = fig.add_axes([0.04, 0.04, 0.445, 0.32])
        ax_bleft.set_xlim(0, 1)
        ax_bleft.set_ylim(0, 1)
        ax_bleft.axis("off")
        rect_bl = patches.FancyBboxPatch((0.005, 0.01), 0.99, 0.98, boxstyle="round,pad=0.015,rounding_size=0.03",
                                        edgecolor=c_gray_border, facecolor="#ffffff", linewidth=1.5)
        ax_bleft.add_patch(rect_bl)
        ax_bleft.text(0.04, 0.88, "TOP 5 NHÀ HÀNG DOANH THU CAO NHẤT", fontsize=10.5, fontweight="bold", color="#0f172a")

        y_pos_list = [0.70, 0.54, 0.38, 0.22, 0.06]
        for idx, (nh_name, val_tr) in enumerate(top5_clean[:5]):
            y_p = y_pos_list[idx]
            badge = patches.FancyBboxPatch((0.04, y_p - 0.03), 0.055, 0.10, boxstyle="round,pad=0.005,rounding_size=0.02",
                                          edgecolor="none", facecolor="#f59e0b")
            ax_bleft.add_patch(badge)
            ax_bleft.text(0.067, y_p + 0.02, str(idx + 1) + ".", ha="center", va="center",
                         fontsize=8.5, fontweight="bold", color="#ffffff")

            display_name = nh_name[:32] + ("..." if len(nh_name) > 32 else "")
            ax_bleft.text(0.12, y_p + 0.02, display_name, va="center", fontsize=9, color="#1e293b")
            ax_bleft.text(0.95, y_p + 0.02, f"{val_tr:,.0f} Tr", ha="right", va="center",
                         fontsize=9.5, fontweight="bold", color="#0f172a")

        # Bottom Right: Brand Breakdown
        ax_bright = fig.add_axes([0.515, 0.04, 0.445, 0.32])
        ax_bright.set_xlim(0, 1)
        ax_bright.set_ylim(0, 1)
        ax_bright.axis("off")
        rect_br = patches.FancyBboxPatch((0.005, 0.01), 0.99, 0.98, boxstyle="round,pad=0.015,rounding_size=0.03",
                                         edgecolor=c_gray_border, facecolor="#ffffff", linewidth=1.5)
        ax_bright.add_patch(rect_br)
        ax_bright.text(0.04, 0.88, "DOANH THU THEO BRAND", fontsize=10.5, fontweight="bold", color="#0f172a")

        max_b_val = max([b[1] for b in top_brands]) if top_brands else 1.0
        for idx, (b_name, b_val) in enumerate(top_brands[:5]):
            y_p = y_pos_list[idx]
            ax_bright.text(0.04, y_p + 0.02, b_name, va="center", fontsize=9, color="#1e293b")

            bar_len = 0.52 * (b_val / max_b_val if max_b_val > 0 else 0)
            bar_patch = patches.FancyBboxPatch((0.28, y_p - 0.015), max(bar_len, 0.015), 0.07,
                                              boxstyle="round,pad=0.005,rounding_size=0.03",
                                              edgecolor="none", facecolor="#f59e0b")
            ax_bright.add_patch(bar_patch)

            ax_bright.text(0.95, y_p + 0.02, f"{b_val/1e9:.1f} Tỷ", ha="right", va="center",
                          fontsize=9.5, fontweight="bold", color="#0f172a")

        plt.savefig(CHART_PATH, dpi=160, bbox_inches='tight', pad_inches=0.15)
        plt.close(fig)
        logger.info("Đã tạo ảnh dashboard báo cáo doanh số tại: %s", CHART_PATH)
        return CHART_PATH

    @classmethod
    def send_sales_daily_report(
        cls,
        recipients: List[str],
        target_date: Optional[date] = None,
        cc_emails: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Send sales report email with ONLY the dashboard image directly embedded (CID).
        No text, greeting, or tables as requested by user.
        """
        if target_date is None:
            target_date = date.today() - timedelta(days=1)
        date_str = target_date.strftime("%Y-%m-%d")
        date_display = target_date.strftime("%d/%m/%Y")

        # 0. Kiểm tra số liệu doanh số trước khi gửi email, tránh gửi mail 0đ
        current_sales = 0.0
        with engine.connect() as conn:
            check_row = conn.execute(
                text("SELECT TOTAL_SALE FROM dbo.TOTAL_SALES_DAILY WHERE CAST(NGAY AS DATE) = :dt"),
                {"dt": date_str}
            ).fetchone()
            if check_row and check_row[0]:
                try:
                    current_sales = float(check_row[0])
                except Exception:
                    current_sales = 0.0

        # Nếu chưa có số liệu hoặc sales <= 0, tự động chạy tác vụ sync từ RK7 về trước
        if current_sales <= 0:
            logger.info("Chưa có số liệu doanh số ngày %s (> 0đ). Tiến hành kích hoạt đồng bộ từ Server RK7 Dcorp trước...", date_str)
            try:
                from app.services.sales_sync_service import sales_sync_service
                sync_res = sales_sync_service.sync_sales_from_rk7(target_date=target_date)
                current_sales = float(sync_res.get("total_sales", 0.0))
                logger.info("Đồng bộ RK7 hoàn thành: %s", sync_res.get("message"))
            except Exception as ex:
                logger.error("Đồng bộ RK7 tự động thất bại: %s", ex)
                return {
                    "status": "error",
                    "message": f"Chưa có số liệu doanh số ngày {date_display} (> 0đ) và tác vụ đồng bộ từ SERVER Dcorp thất bại ({str(ex)}). Đã hủy gửi email để tránh gửi báo cáo 0đ.",
                    "recipients": recipients,
                    "target_date": date_str
                }

        # Nếu sau khi đồng bộ vẫn là 0đ (ví dụ ngày lễ không bán hoặc lỗi dữ liệu nguồn), tuyệt đối không gửi mail 0đ
        if current_sales <= 0:
            logger.warning("Số liệu doanh số ngày %s là 0đ sau khi quét RK7. Hủy gửi email báo cáo.", date_str)
            return {
                "status": "warning",
                "message": f"Số liệu doanh số ngày {date_display} là 0đ sau khi quét SERVER Dcorp. Đã hủy gửi email để tránh gửi thông báo 0đ.",
                "recipients": recipients,
                "target_date": date_str
            }

        # 1. Generate Dashboard Image
        chart_file = cls.generate_sales_dashboard_image(target_date=target_date)

        # 2. Build Minimal Email (Image Only)
        msg = EmailMessage()
        msg['Subject'] = f"Báo Cáo Doanh Thu Sales RK7 - Ngày {date_display}"
        msg['From'] = cls.SMTP_USER
        msg['To'] = ", ".join(recipients)
        if cc_emails:
            msg['Cc'] = ", ".join(cc_emails)

        image_cid = make_msgid(domain="ggg.com.vn")[1:-1]

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 20px; background-color: #f8fafc; text-align: center;">
    <div style="max-width: 1100px; margin: 0 auto; background: #ffffff; padding: 12px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); display: inline-block;">
        <img src="cid:{image_cid}" alt="Báo cáo doanh thu sales RK7 - Ngày {date_display}" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 6px;">
    </div>
</body>
</html>
"""

        msg.set_content("Báo cáo doanh thu sales RK7 (vui lòng mở bằng ứng dụng mail hỗ trợ HTML để xem ảnh báo cáo).")
        msg.add_alternative(html_content, subtype='html')

        # Attach image via CID
        with open(chart_file, 'rb') as img:
            msg.get_payload()[1].add_related(
                img.read(),
                maintype='image',
                subtype='png',
                cid=f"<{image_cid}>"
            )

        # 3. Send email via SMTP with TLS 1.2
        logger.info("Đang gửi email báo cáo doanh số (chỉ hình ảnh) tới %s...", recipients)
        try:
            context = ssl.create_default_context()
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            context.maximum_version = ssl.TLSVersion.TLSv1_2

            with smtplib.SMTP(cls.SMTP_HOST, cls.SMTP_PORT, timeout=20) as server:
                server.ehlo()
                server.starttls(context=context)
                server.login(cls.SMTP_USER, cls.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info("Gửi email báo cáo thành công tới: %s", ", ".join(recipients))
            return {
                "status": "success",
                "message": f"Email báo cáo doanh số ngày {date_display} (hình ảnh dashboard) đã được gửi thành công tới: {', '.join(recipients)}",
                "recipients": recipients,
                "target_date": date_str
            }
        except Exception as e:
            err_msg = str(e)
            logger.error("Lỗi khi gửi email báo cáo doanh số: %s", err_msg)
            return {
                "status": "error",
                "message": f"Lỗi gửi email: {err_msg}",
                "recipients": recipients,
                "target_date": date_str
            }


sales_report_service = SalesReportService()
