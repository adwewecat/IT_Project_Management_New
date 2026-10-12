from typing import Generator
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
from app.core.config import settings

logger = logging.getLogger(__name__)

# Patch MSSQLCompiler to output FETCH NEXT instead of FETCH FIRST for SQL Server 2012/2014/2016 compatibility
try:
    from sqlalchemy.dialects.mssql.base import MSSQLCompiler
    _orig_fetch_clause = MSSQLCompiler.fetch_clause

    def _compat_mssql_fetch_clause(self, select, fetch_clause=None, require_offset=False, use_literal_execute_for_simple_int=False, **kw):
        res = _orig_fetch_clause(
            self, select,
            fetch_clause=fetch_clause,
            require_offset=require_offset,
            use_literal_execute_for_simple_int=use_literal_execute_for_simple_int,
            **kw
        )
        if "FETCH FIRST" in res:
            res = res.replace("FETCH FIRST", "FETCH NEXT")
        return res

    MSSQLCompiler.fetch_clause = _compat_mssql_fetch_clause

    _orig_visit_function = MSSQLCompiler.visit_function

    def _compat_mssql_visit_function(self, func_elem, **kw):
        if func_elem.name.lower() == "trim":
            clauses = list(func_elem.clauses)
            if len(clauses) == 1:
                arg_str = self.process(clauses[0], **kw)
                return f"LTRIM(RTRIM({arg_str}))"
        return _orig_visit_function(self, func_elem, **kw)

    MSSQLCompiler.visit_function = _compat_mssql_visit_function
except Exception as e:
    logger.warning("Could not patch MSSQLCompiler: %s", e)

# SQLAlchemy 2.0 Base
class Base(DeclarativeBase):
    pass


# Engine creation with pool settings
def create_app_engine(uri: str):
    return create_engine(
        uri,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        echo=False
    )


engine = create_app_engine(settings.sqlalchemy_database_uri)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def reload_db_engine() -> bool:
    """
    Dispose old engine and recreate engine + SessionLocal with updated settings.
    """
    global engine, SessionLocal
    try:
        engine.dispose()
    except Exception as e:
        logger.warning("Lỗi khi dispose engine cũ: %s", str(e))
    
    engine = create_app_engine(settings.sqlalchemy_database_uri)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("Đã nạp lại Database engine tới %s:%s (DB: %s)", settings.DB_SERVER, settings.DB_PORT, settings.DB_NAME)
    return test_db_connection()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a SQLAlchemy Session per request.
    Ensures rollback on error and proper closing.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_db_connection() -> bool:
    """Check database health"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successfully established to %s:%s", settings.DB_SERVER, settings.DB_PORT)
        return True
    except Exception as e:
        logger.error("Failed to connect to database %s: %s", settings.DB_SERVER, str(e))
        return False


def test_custom_connection(
    server: str,
    port: int,
    db_name: str,
    trusted_connection: bool = True,
    db_user: str = "",
    db_password: str = "",
    odbc_driver: str = "ODBC Driver 17 for SQL Server",
    trust_server_certificate: str = "yes"
) -> tuple[bool, str]:
    """
    Test a candidate database connection without altering the running system.
    Returns (success: bool, message/error: str).
    """
    from sqlalchemy.pool import NullPool

    uri = settings.build_database_uri(
        server=server,
        port=port,
        db_name=db_name,
        trusted_connection=trusted_connection,
        db_user=db_user,
        db_password=db_password,
        odbc_driver=odbc_driver,
        trust_server_certificate=trust_server_certificate
    )

    test_engine = None
    try:
        test_engine = create_engine(
            uri,
            poolclass=NullPool,
            connect_args={"timeout": 5}
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, f"Kết nối thành công tới SQL Server {server}:{port} (Database: {db_name})!"
    except Exception as e:
        err_msg = str(e)
        logger.warning("Test connection failed for %s:%s: %s", server, port, err_msg)
        return False, f"Không thể kết nối: {err_msg}"
    finally:
        if test_engine:
            try:
                test_engine.dispose()
            except Exception:
                pass


# RK7 Database Engine (Lazy / Singleton)
_rk7_engine = None


def get_rk7_engine():
    global _rk7_engine
    if _rk7_engine is None:
        _rk7_engine = create_app_engine(settings.rk7_sqlalchemy_database_uri)
    return _rk7_engine


