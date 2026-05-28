from pathlib import Path
from sqlalchemy import text
from sqlmodel import SQLModel, create_engine, Session

DB_PATH = Path(__file__).parent / "hacs.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_sqlite_columns()


def get_session():
    with Session(engine) as session:
        yield session


def _ensure_sqlite_columns() -> None:
    with engine.begin() as conn:
        result = conn.execute(text("PRAGMA table_info(past_allocation)"))
        existing = {row[1] for row in result}
        required: dict[str, str] = {
            "supplier_name": "TEXT",
            "framework_reference": "TEXT",
            "lot_reference": "TEXT",
            "source_url": "TEXT",
            "confidence_of_match": "REAL",
        }
        for column, sql_type in required.items():
            if column not in existing:
                conn.execute(text(f"ALTER TABLE past_allocation ADD COLUMN {column} {sql_type}"))

        result = conn.execute(text("PRAGMA table_info(intelligence_refresh_run)"))
        existing_refresh_columns = {row[1] for row in result}
        refresh_required: dict[str, str] = {
            "scope": "TEXT DEFAULT 'all_entities'",
            "updated_at": "DATETIME",
        }
        for column, sql_type in refresh_required.items():
            if column not in existing_refresh_columns:
                conn.execute(text(f"ALTER TABLE intelligence_refresh_run ADD COLUMN {column} {sql_type}"))
