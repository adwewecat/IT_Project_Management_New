import io
import re
from typing import List, Dict, Any, Tuple
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from sqlalchemy import text
from app.core.database import get_rk7_engine
from app.schemas.check_mon_rk7 import (
    SapCheckResponse,
    SapCheckItem,
    SelectorCheckResponse,
    SelectorCheckItem,
    BrandItem,
    BrandMenuResponse,
)

BRAND_NAME_MAP = {
    "ASHCM": "Ashima",
    "CDHCM": "Crystal Dragon",
    "CJHCM": "Crystal Jade",
    "DNGHCM": "Đào Hoa",
    "FCHCM": "Food Court",
    "GGHCM": "Gogi House",
    "GGHCM_LPS": "Gogi House (LPS)",
    "GGHCM_NEW_VERSION": "Gogi House (New Version)",
    "HBHCM": "Hutong Buffet",
    "HCHCM": "Hutong Cơm",
    "HTHCM": "Hutong",
    "HTHCM_BUFFET_MOI": "Hutong (Buffet Mới)",
    "ICHCM": "IC",
    "ISHCM": "Isushi",
    "KKHCM": "Kichi Kichi",
    "KPHCM": "K-Pub",
    "LCHCM": "Lẩu Cua",
    "MTHCM": "Meat",
    "MWHCM": "Manwah",
    "PIZZA360": "Pizza 360",
    "SGHCM": "Shabu G",
    "SMHCM": "Sumo BBQ",
    "SXHCM": "SX",
    "UPHCM": "UP",
    "VXHCM": "Vuvuzela",
    "WMHCM": "Western Meat",
    "WYHCM": "WY",
    "YTHCM": "Yutang",
    "AFHCM": "AF",
}


def clean_sap_codes(raw_codes: List[str]) -> List[str]:
    """Tách và chuẩn hóa danh sách mã SAP từ chuỗi hoặc mảng"""
    cleaned: List[str] = []
    seen = set()
    for item in raw_codes:
        if not item:
            continue
        # Tách theo dòng hoặc dấu phẩy hoặc khoảng trắng
        parts = re.split(r"[\r\n,;\s]+", str(item).strip())
        for p in parts:
            c = p.strip()
            if c and c not in seen:
                seen.add(c)
                cleaned.append(c)
    return cleaned


def get_brands() -> List[BrandItem]:
    """Lấy danh sách các Brand có thực đơn trên hệ thống RK7"""
    engine = get_rk7_engine()
    sql = """
        SELECT SG.GUIDSTRING, SG.NAME, COUNT(DISTINCT SLD.OBJECTSIFR) AS TOTAL_ITEMS
        FROM SELECTORGROUPS SG
        JOIN SELECTORS SL ON SL.SELECTORGROUP = SG.SIFR
        JOIN SELECTORDETAILS SLD ON SLD.SELECTOR = SL.SIFR
        WHERE SG.STATUS = 3 AND SL.STATUS = 3
        GROUP BY SG.GUIDSTRING, SG.NAME
        HAVING COUNT(DISTINCT SLD.OBJECTSIFR) >= 20
        ORDER BY SG.NAME
    """
    brands: List[BrandItem] = []
    with engine.connect() as conn:
        rows = conn.execute(text(sql)).fetchall()
        for row in rows:
            guid = str(row[0])
            name = str(row[1])
            total = int(row[2])
            friendly = BRAND_NAME_MAP.get(name, name)
            display = f"{friendly} ({name})" if friendly != name else name
            brands.append(BrandItem(
                guid=guid,
                name=name,
                display_name=display,
                total_items=total
            ))
    # Sắp xếp theo tên thân thiện
    brands.sort(key=lambda b: b.display_name.lower())
    return brands


def check_sap_exists(raw_codes: List[str]) -> SapCheckResponse:
    """Kiểm tra danh sách mã SAP đã được đẩy xuống RK7 chưa"""
    codes = clean_sap_codes(raw_codes)
    if not codes:
        return SapCheckResponse(
            items=[],
            total_input=0,
            found_count=0,
            missing_count=0,
            missing_codes=[]
        )

    engine = get_rk7_engine()
    # Build parameterized IN clause
    param_dict = {f"c_{i}": code for i, code in enumerate(codes)}
    in_clause = ", ".join([f":c_{i}" for i in range(len(codes))])

    sql = f"""
        SELECT 
            BANG_CHUA_SAP_CODE.PROPERTYVAL AS SAPCODE,
            MENU.NAME AS TEN_MON,
            MENU.SIFR AS RK7_IDENT,
            MENU.CODE AS RK7_CODE,
            MENU.PORTIONNAME AS DON_VI_TINH,
            SELECTOR.NAME AS NHOM_MENU,
            CASE MENU.Status
                WHEN '1' THEN N'CHƯA KÍCH HOẠT'
                WHEN '2' THEN N'TẮT KÍCH HOẠT'
                WHEN '3' THEN N'ĐÃ KÍCH HOẠT'
                ELSE NULL
            END AS STATUS_CODE,
            CASE MENU.SALEOBJECTTYPE 
                WHEN '0' THEN N'Item Thường' 
                WHEN '2' THEN N'Item Combo' 
                ELSE NULL 
            END AS ITEM_TYPE
        FROM dbo.MENUITEMS AS MENU
        LEFT JOIN GENERATEDPROPDATAS AS BANG_CHUA_SAP_CODE ON BANG_CHUA_SAP_CODE.OBJECTIDENT = MENU.SIFR
        LEFT JOIN CATEGLIST AS SELECTOR ON SELECTOR.SIFR = MENU.PARENT
        WHERE BANG_CHUA_SAP_CODE.PROPERTYVAL IN ({in_clause})
          AND MENU.Status NOT IN ('0')
        ORDER BY BANG_CHUA_SAP_CODE.PROPERTYVAL, MENU.NAME
    """

    items: List[SapCheckItem] = []
    found_sap = set()

    with engine.connect() as conn:
        rows = conn.execute(text(sql), param_dict).fetchall()
        for r in rows:
            sap = str(r[0]) if r[0] is not None else ""
            found_sap.add(sap)
            items.append(SapCheckItem(
                sap_code=sap,
                ten_mon=r[1],
                rk7_ident=r[2],
                rk7_code=r[3],
                don_vi_tinh=r[4],
                nhom_menu=r[5],
                status_code=r[6],
                item_type=r[7]
            ))

    missing_codes = [c for c in codes if c not in found_sap]

    return SapCheckResponse(
        items=items,
        total_input=len(codes),
        found_count=len(found_sap),
        missing_count=len(missing_codes),
        missing_codes=missing_codes
    )


def check_selector(raw_codes: List[str]) -> SelectorCheckResponse:
    """Kiểm tra mã SAP nằm trong nhóm Selector nào của Brand nào và đơn giá tương ứng"""
    codes = clean_sap_codes(raw_codes)
    if not codes:
        return SelectorCheckResponse(
            items=[],
            total_input=0,
            found_count=0,
            missing_count=0,
            missing_codes=[]
        )

    engine = get_rk7_engine()
    param_dict = {f"c_{i}": code for i, code in enumerate(codes)}
    in_clause = ", ".join([f":c_{i}" for i in range(len(codes))])

    sql = f"""
        SELECT DISTINCT 
            GPD.PROPERTYVAL AS SAPCODE,
            SG.NAME AS Brand, 
            SL.NAME AS Nhom, 
            MI.SIFR AS ITEMIDENT,
            MI.CODE AS RK7_CODE,
            MI.NAME AS ITEMNAME,
            MI.PORTIONNAME AS UNIT,
            PRT.ALTNAME AS PRICETYPE,
            PR.VALUE AS PRICE
        FROM SELECTORGROUPS SG 
        JOIN SELECTORS SL ON SL.SELECTORGROUP = SG.SIFR
        JOIN SELECTORDETAILS SLD ON SLD.SELECTOR = SL.SIFR
        JOIN MENUITEMS MI ON MI.SIFR = SLD.OBJECTSIFR
        LEFT JOIN PRICES PR ON PR.OBJECTID = MI.SIFR
        LEFT JOIN PRICETYPES PRT ON PRT.SIFR = PR.PRICETYPE
        LEFT JOIN GENERATEDPROPDATAS GPD ON GPD.RKTYPEIDENT = 1000008 AND GPD.OBJECTREFNO = 10 AND GPD.OBJECTIDENT = MI.SIFR
        WHERE 1=1
            AND IIF(CHARINDEX('_', PRT.ALTNAME) > 0, SUBSTRING(PRT.ALTNAME, 0, CHARINDEX('_', PRT.ALTNAME)), PRT.ALTNAME) = IIF(CHARINDEX('-', SG.NAME) > 0, SUBSTRING(SG.NAME, 0, CHARINDEX('-', SG.NAME)), SG.NAME)
            AND MI.STATUS = 3
            AND PR.SPECIES = 1
            AND SL.STATUS = 3
            AND PR.VALUE IS NOT NULL
            AND GPD.PROPERTYVAL IN ({in_clause})
        ORDER BY SG.NAME, SL.NAME, MI.NAME
    """

    items: List[SelectorCheckItem] = []
    found_sap = set()

    with engine.connect() as conn:
        rows = conn.execute(text(sql), param_dict).fetchall()
        for r in rows:
            sap = str(r[0]) if r[0] is not None else ""
            found_sap.add(sap)
            brand_raw = r[1]
            friendly_brand = BRAND_NAME_MAP.get(brand_raw, brand_raw)
            items.append(SelectorCheckItem(
                sap_code=sap,
                brand=friendly_brand,
                nhom_pos=r[2],
                item_ident=r[3],
                rk7_code=r[4],
                ten_mon=r[5],
                don_vi=r[6],
                ten_don_gia=r[7],
                gia=float(r[8]) if r[8] is not None else None
            ))

    missing_codes = [c for c in codes if c not in found_sap]

    return SelectorCheckResponse(
        items=items,
        total_input=len(codes),
        found_count=len(found_sap),
        missing_count=len(missing_codes),
        missing_codes=missing_codes
    )


def get_brand_menu(brand_guid: str) -> BrandMenuResponse:
    """Lấy danh mục thực đơn và bảng giá POS đầy đủ của 1 Brand"""
    engine = get_rk7_engine()
    sql = """
        SELECT DISTINCT 
            GPD.PROPERTYVAL AS SAPCODE,
            SG.NAME AS Brand, 
            SL.NAME AS Nhom, 
            MI.SIFR AS ITEMIDENT,
            MI.CODE AS RK7_CODE,
            MI.NAME AS ITEMNAME,
            MI.PORTIONNAME AS UNIT,
            PRT.ALTNAME AS PRICETYPE,
            PR.VALUE AS PRICE
        FROM SELECTORGROUPS SG 
        JOIN SELECTORS SL ON SL.SELECTORGROUP = SG.SIFR
        JOIN SELECTORDETAILS SLD ON SLD.SELECTOR = SL.SIFR
        JOIN MENUITEMS MI ON MI.SIFR = SLD.OBJECTSIFR
        LEFT JOIN PRICES PR ON PR.OBJECTID = MI.SIFR
        LEFT JOIN PRICETYPES PRT ON PRT.SIFR = PR.PRICETYPE
        LEFT JOIN GENERATEDPROPDATAS GPD ON GPD.RKTYPEIDENT = 1000008 AND GPD.OBJECTREFNO = 10 AND GPD.OBJECTIDENT = MI.SIFR
        WHERE SG.GUIDSTRING = :brand_guid
            AND IIF(CHARINDEX('_', PRT.ALTNAME) > 0, SUBSTRING(PRT.ALTNAME, 0, CHARINDEX('_', PRT.ALTNAME)), PRT.ALTNAME) = IIF(CHARINDEX('-', SG.NAME) > 0, SUBSTRING(SG.NAME, 0, CHARINDEX('-', SG.NAME)), SG.NAME)
            AND MI.STATUS = 3
            AND PR.SPECIES = 1
            AND SL.STATUS = 3
            AND PR.VALUE IS NOT NULL
        ORDER BY SL.NAME, MI.NAME
    """

    items: List[SelectorCheckItem] = []
    brand_name = "Menu"

    with engine.connect() as conn:
        rows = conn.execute(text(sql), {"brand_guid": brand_guid}).fetchall()
        for r in rows:
            brand_raw = r[1]
            brand_name = BRAND_NAME_MAP.get(brand_raw, brand_raw)
            items.append(SelectorCheckItem(
                sap_code=r[0],
                brand=brand_name,
                nhom_pos=r[2],
                item_ident=r[3],
                rk7_code=r[4],
                ten_mon=r[5],
                don_vi=r[6],
                ten_don_gia=r[7],
                gia=float(r[8]) if r[8] is not None else None
            ))

    return BrandMenuResponse(
        brand_guid=brand_guid,
        brand_name=brand_name,
        total_items=len(items),
        items=items
    )


# --- EXCEL EXPORT HELPERS ---

def style_header_cell(cell):
    cell.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    cell.fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )
    cell.border = thin_border


def style_data_cell(cell, align="left", is_currency=False):
    cell.font = Font(name="Arial", size=9)
    cell.alignment = Alignment(horizontal=align, vertical="center")
    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )
    cell.border = thin_border
    if is_currency:
        cell.number_format = "#,##0"


def export_sap_check_excel(res: SapCheckResponse) -> Tuple[io.BytesIO, str]:
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "Đã Đẩy Xuống RK7"

    headers1 = ["STT", "Mã SAP", "Tên Món", "RK7 IDENT", "RK7 Code", "Đơn Vị Tính", "Nhóm Menu", "Trạng Thái", "Loại Item"]
    ws1.append(headers1)
    for col in range(1, len(headers1) + 1):
        style_header_cell(ws1.cell(row=1, column=col))

    for idx, item in enumerate(res.items, start=1):
        row = [
            idx,
            item.sap_code,
            item.ten_mon,
            item.rk7_ident,
            item.rk7_code,
            item.don_vi_tinh,
            item.nhom_menu,
            item.status_code,
            item.item_type
        ]
        ws1.append(row)
        curr_row = idx + 1
        style_data_cell(ws1.cell(row=curr_row, column=1), "center")
        style_data_cell(ws1.cell(row=curr_row, column=2), "center")
        style_data_cell(ws1.cell(row=curr_row, column=3), "left")
        style_data_cell(ws1.cell(row=curr_row, column=4), "center")
        style_data_cell(ws1.cell(row=curr_row, column=5), "center")
        style_data_cell(ws1.cell(row=curr_row, column=6), "center")
        style_data_cell(ws1.cell(row=curr_row, column=7), "left")
        style_data_cell(ws1.cell(row=curr_row, column=8), "center")
        style_data_cell(ws1.cell(row=curr_row, column=9), "center")

    # Sheet 2: Missing
    ws2 = wb.create_sheet(title="Chưa Có Trên RK7")
    headers2 = ["STT", "Mã SAP", "Tình Trạng"]
    ws2.append(headers2)
    for col in range(1, len(headers2) + 1):
        style_header_cell(ws2.cell(row=1, column=col))
        ws2.cell(row=1, column=col).fill = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")

    for idx, code in enumerate(res.missing_codes, start=1):
        row = [idx, code, "Chưa đẩy xuống RK7 hoặc mã không tồn tại"]
        ws2.append(row)
        curr_row = idx + 1
        style_data_cell(ws2.cell(row=curr_row, column=1), "center")
        style_data_cell(ws2.cell(row=curr_row, column=2), "center")
        style_data_cell(ws2.cell(row=curr_row, column=3), "left")

    for ws in [ws1, ws2]:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream, "Ket_Qua_Check_SAP_RK7.xlsx"


def export_selector_check_excel(res: SelectorCheckResponse) -> Tuple[io.BytesIO, str]:
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "Phân Nhóm POS"

    headers1 = ["STT", "Mã SAP", "Brand", "Nhóm POS", "RK7 IDENT", "RK7 Code", "Tên Món", "Đơn Vị", "Tên Đơn Giá", "Giá Bán (VNĐ)"]
    ws1.append(headers1)
    for col in range(1, len(headers1) + 1):
        style_header_cell(ws1.cell(row=1, column=col))

    for idx, item in enumerate(res.items, start=1):
        row = [
            idx,
            item.sap_code,
            item.brand,
            item.nhom_pos,
            item.item_ident,
            item.rk7_code,
            item.ten_mon,
            item.don_vi,
            item.ten_don_gia,
            item.gia
        ]
        ws1.append(row)
        curr_row = idx + 1
        style_data_cell(ws1.cell(row=curr_row, column=1), "center")
        style_data_cell(ws1.cell(row=curr_row, column=2), "center")
        style_data_cell(ws1.cell(row=curr_row, column=3), "left")
        style_data_cell(ws1.cell(row=curr_row, column=4), "left")
        style_data_cell(ws1.cell(row=curr_row, column=5), "center")
        style_data_cell(ws1.cell(row=curr_row, column=6), "center")
        style_data_cell(ws1.cell(row=curr_row, column=7), "left")
        style_data_cell(ws1.cell(row=curr_row, column=8), "center")
        style_data_cell(ws1.cell(row=curr_row, column=9), "left")
        style_data_cell(ws1.cell(row=curr_row, column=10), "right", is_currency=True)

    if res.missing_codes:
        ws2 = wb.create_sheet(title="Chưa Có Trên POS")
        headers2 = ["STT", "Mã SAP", "Tình Trạng"]
        ws2.append(headers2)
        for col in range(1, len(headers2) + 1):
            style_header_cell(ws2.cell(row=1, column=col))
            ws2.cell(row=1, column=col).fill = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")
        for idx, code in enumerate(res.missing_codes, start=1):
            ws2.append([idx, code, "Chưa được gắn vào Selector POS hoặc chưa cấu hình giá"])
            curr_row = idx + 1
            style_data_cell(ws2.cell(row=curr_row, column=1), "center")
            style_data_cell(ws2.cell(row=curr_row, column=2), "center")
            style_data_cell(ws2.cell(row=curr_row, column=3), "left")

    for ws in wb.worksheets:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream, "Ket_Qua_Check_Selector_POS.xlsx"


def export_brand_menu_excel(brand_name: str, res: BrandMenuResponse) -> Tuple[io.BytesIO, str]:
    wb = Workbook()
    ws = wb.active
    clean_name = re.sub(r"[\\/*?:\[\]]", "", brand_name)
    ws.title = clean_name[:30]

    headers = ["STT", "Mã SAP", "Nhóm POS", "Tên Món", "Đơn Vị", "RK7 IDENT", "RK7 Code", "Tên Đơn Giá", "Giá Bán (VNĐ)"]
    ws.append(headers)
    for col in range(1, len(headers) + 1):
        style_header_cell(ws.cell(row=1, column=col))

    for idx, item in enumerate(res.items, start=1):
        row = [
            idx,
            item.sap_code,
            item.nhom_pos,
            item.ten_mon,
            item.don_vi,
            item.item_ident,
            item.rk7_code,
            item.ten_don_gia,
            item.gia
        ]
        ws.append(row)
        curr_row = idx + 1
        style_data_cell(ws.cell(row=curr_row, column=1), "center")
        style_data_cell(ws.cell(row=curr_row, column=2), "center")
        style_data_cell(ws.cell(row=curr_row, column=3), "left")
        style_data_cell(ws.cell(row=curr_row, column=4), "left")
        style_data_cell(ws.cell(row=curr_row, column=5), "center")
        style_data_cell(ws.cell(row=curr_row, column=6), "center")
        style_data_cell(ws.cell(row=curr_row, column=7), "center")
        style_data_cell(ws.cell(row=curr_row, column=8), "left")
        style_data_cell(ws.cell(row=curr_row, column=9), "right", is_currency=True)

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    filename = f"Menu_POS_{clean_name.replace(' ', '_')}.xlsx"
    return stream, filename
