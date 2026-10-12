from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='MEMO'")).fetchall()
    cols = [r[0] for r in res]
    print('Existing cols in MEMO:', cols)
    if 'noidung_mail' not in cols:
        conn.execute(text("ALTER TABLE MEMO ADD noidung_mail NVARCHAR(MAX) NULL"))
        conn.commit()
        print('Added noidung_mail column successfully!')
    else:
        print('noidung_mail column already exists.')
