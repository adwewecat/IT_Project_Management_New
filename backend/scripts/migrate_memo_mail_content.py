import re
from app.core.database import SessionLocal
from app.models.memo import Memo

def migrate():
    db = SessionLocal()
    try:
        memos = db.query(Memo).filter(Memo.huong_dan != None).all()
        updated = 0
        for m in memos:
            hd = (m.huong_dan or "").strip()
            if "Yêu cầu tạo nút RK từ Salesforce Loyalty:" in hd:
                # Tách phần email và phần hình ảnh / hướng dẫn thực tế của IT
                parts = re.split(r"(\n\s*<img\b|\n\s*!\[)", hd, maxsplit=1)
                mail_part = parts[0].strip()
                it_part = ("\n" + "".join(parts[1:])).strip() if len(parts) > 1 else None

                # Đưa mail_part vào noidung_mail
                if not m.noidung_mail:
                    m.noidung_mail = mail_part
                elif mail_part not in m.noidung_mail:
                    m.noidung_mail = mail_part + "\n\n" + m.noidung_mail

                # huong_dan chỉ giữ lại phần hình ảnh / ghi chú của IT, nếu không có thì set None
                m.huong_dan = it_part if it_part else None
                updated += 1
                print(f"Migrated memo ID {m.id} ({m.ma_memo}):")
                print(f"  noidung_mail: {len(m.noidung_mail or '')} chars")
                print(f"  huong_dan: {len(m.huong_dan or '') if m.huong_dan else 'None'}")

        db.commit()
        print(f"DONE: Successfully migrated {updated} memos.")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
