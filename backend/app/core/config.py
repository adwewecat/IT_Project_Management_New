from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import urllib.parse


class Settings(BaseSettings):
    # App
    APP_NAME: str = "IT Project Management API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str):
            import json
            return json.loads(v)
        return v

    # Database (Test Server 172.16.20.103)
    DB_SERVER: str = "172.16.20.103"
    DB_PORT: int = 1433
    DB_NAME: str = "ITDEPT"
    DB_USER: str = "itapp"
    DB_PASSWORD: str = "GGGroup@123!"
    ODBC_DRIVER: str = "ODBC Driver 18 for SQL Server"
    DB_TRUST_SERVER_CERTIFICATE: str = "yes"
    DB_TRUSTED_CONNECTION: bool = False

    # Project Management Database (172.16.8.25)
    PROJECT_DB_SERVER: str = "172.16.8.25"
    PROJECT_DB_PORT: int = 1433
    PROJECT_DB_NAME: str = "PROJECT_MANAGEMENT"
    PROJECT_DB_USER: str = "itapp"
    PROJECT_DB_PASSWORD: str = "GGGroup@123!"
    PROJECT_DB_TRUSTED_CONNECTION: bool = False
    PROJECT_DB_TRUST_SERVER_CERTIFICATE: str = "yes"

    # RK7 Dcorp Database (172.16.8.26)
    RK7_DB_SERVER: str = "172.16.8.26"
    RK7_DB_PORT: int = 1433
    RK7_DB_NAME: str = "GGGHCMREPH_PROD_2"
    RK7_DB_USER: str = "dung.nguyenanh"
    RK7_DB_PASSWORD: str = "RK7P@ssw0rd"
    RK7_DB_TRUSTED_CONNECTION: bool = False
    RK7_DB_TRUST_SERVER_CERTIFICATE: str = "yes"

    # Security & JWT
    JWT_SECRET_KEY: str = "default_secret_key_please_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    @staticmethod
    def build_database_uri(
        server: str,
        port: int,
        db_name: str,
        trusted_connection: bool = True,
        db_user: str = "",
        db_password: str = "",
        odbc_driver: str = "ODBC Driver 18 for SQL Server",
        trust_server_certificate: str = "yes"
    ) -> str:
        """
        Build SQLAlchemy 2.0 connection string with pyodbc and ODBC Driver 18.
        Supports both Trusted_Connection (Windows Auth) and SQL Server Auth.
        """
        if trusted_connection:
            params = (
                f"Driver={{{odbc_driver}}};"
                f"SERVER={server},{port};"
                f"DATABASE={db_name};"
                f"Trusted_Connection=yes;"
                f"TrustServerCertificate={trust_server_certificate};"
            )
        else:
            params = (
                f"Driver={{{odbc_driver}}};"
                f"SERVER={server},{port};"
                f"DATABASE={db_name};"
                f"UID={db_user};"
                f"PWD={db_password};"
                f"TrustServerCertificate={trust_server_certificate};"
            )
        encoded_params = urllib.parse.quote_plus(params)
        return f"mssql+pyodbc:///?odbc_connect={encoded_params}"

    @property
    def sqlalchemy_database_uri(self) -> str:
        return self.build_database_uri(
            server=self.DB_SERVER,
            port=self.DB_PORT,
            db_name=self.DB_NAME,
            trusted_connection=self.DB_TRUSTED_CONNECTION,
            db_user=self.DB_USER,
            db_password=self.DB_PASSWORD,
            odbc_driver=self.ODBC_DRIVER,
            trust_server_certificate=self.DB_TRUST_SERVER_CERTIFICATE
        )

    @property
    def project_sqlalchemy_database_uri(self) -> str:
        return self.build_database_uri(
            server=self.PROJECT_DB_SERVER,
            port=self.PROJECT_DB_PORT,
            db_name=self.PROJECT_DB_NAME,
            trusted_connection=self.PROJECT_DB_TRUSTED_CONNECTION,
            db_user=self.PROJECT_DB_USER,
            db_password=self.PROJECT_DB_PASSWORD,
            odbc_driver=self.ODBC_DRIVER,
            trust_server_certificate=self.PROJECT_DB_TRUST_SERVER_CERTIFICATE
        )

    @property
    def rk7_sqlalchemy_database_uri(self) -> str:
        return self.build_database_uri(
            server=self.RK7_DB_SERVER,
            port=self.RK7_DB_PORT,
            db_name=self.RK7_DB_NAME,
            trusted_connection=self.RK7_DB_TRUSTED_CONNECTION,
            db_user=self.RK7_DB_USER,
            db_password=self.RK7_DB_PASSWORD,
            odbc_driver=self.ODBC_DRIVER,
            trust_server_certificate=self.RK7_DB_TRUST_SERVER_CERTIFICATE
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()


def save_database_config_to_env(
    server: str,
    port: int,
    db_name: str,
    trusted_connection: bool,
    db_user: str = "",
    db_password: str = "",
    odbc_driver: str = "ODBC Driver 18 for SQL Server",
    trust_server_certificate: str = "yes"
) -> None:
    """
    Persist database config to backend/.env file and update settings in-memory.
    """
    import os
    from pathlib import Path

    # Determine .env path
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"

    env_lines = []
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            env_lines = f.readlines()

    # Map of keys to update
    updates = {
        "DB_SERVER": server,
        "DB_PORT": str(port),
        "DB_NAME": db_name,
        "DB_TRUSTED_CONNECTION": "true" if trusted_connection else "false",
        "DB_USER": db_user or "",
        "ODBC_DRIVER": odbc_driver,
        "DB_TRUST_SERVER_CERTIFICATE": trust_server_certificate,
    }
    if db_password:
        updates["DB_PASSWORD"] = db_password

    # Update or append
    new_lines = []
    seen_keys = set()
    for line in env_lines:
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("#"):
            new_lines.append(line)
            continue
        if "=" in line_clean:
            key, _ = line_clean.split("=", 1)
            key = key.strip()
            if key in updates:
                new_lines.append(f"{key}={updates[key]}\n")
                seen_keys.add(key)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)

    for k, v in updates.items():
        if k not in seen_keys:
            new_lines.append(f"{k}={v}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    # Update settings instance in-memory
    settings.DB_SERVER = server
    settings.DB_PORT = port
    settings.DB_NAME = db_name
    settings.DB_TRUSTED_CONNECTION = trusted_connection
    if db_user:
        settings.DB_USER = db_user
    if db_password:
        settings.DB_PASSWORD = db_password
    settings.ODBC_DRIVER = odbc_driver
    settings.DB_TRUST_SERVER_CERTIFICATE = trust_server_certificate

