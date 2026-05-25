from datetime import datetime, date
from typing import Optional, List
from sqlmodel import SQLModel, Field
from pydantic import BaseModel


class Entity(SQLModel, table=True):
    __tablename__ = "entity"
    id: int = Field(primary_key=True)
    acronym: str
    name: str
    city: str
    country: str
    cluster: str
    parent_id: Optional[int] = None
    top_hacs_field: Optional[int] = None
    relationship_signal: str = "none"
    notes: Optional[str] = None
    is_ec_dg: bool = False


class ProviderService(SQLModel, table=True):
    __tablename__ = "provider_service"
    id: int = Field(primary_key=True)
    provider: str
    name: str
    description: str
    hacs_fields: str  # JSON list e.g. "[1,4]"
    delivery_strength: int


class CombinedPackage(SQLModel, table=True):
    __tablename__ = "combined_package"
    id: int = Field(primary_key=True)
    name: str
    provider_lead: str
    dst_service_ids: str   # JSON
    bcg_service_ids: str   # JSON
    target_fields: str     # JSON
    description: str


class Scenario(SQLModel, table=True):
    __tablename__ = "scenario"
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: int
    hacs_field: int
    provider_mix: str
    dst_service_ids: str   # JSON
    bcg_service_ids: str   # JSON
    price_posture: str
    team_mix_json: str     # JSON
    technical_score: float
    financial_score: float
    total_score: float
    bid_recommendation: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Request / Response bodies ──────────────────────────────────────────

class TeamMix(BaseModel):
    senior_dst: int = 0
    senior_bcg: int = 0
    expert_dst: int = 0
    expert_bcg: int = 0
    junior_dst: int = 0
    junior_bcg: int = 0


class ComputeRequest(BaseModel):
    entity_id: int
    hacs_field: int
    provider_mix: str           # "dst" | "bcg" | "combined"
    dst_service_ids: List[int] = []
    bcg_service_ids: List[int] = []
    price_posture: str          # "competitive" | "balanced" | "premium"
    team_mix: TeamMix = Field(default_factory=TeamMix)


class Explanation(BaseModel):
    top_factor: str
    components: List[str]
    risks: List[str]
    missing_proof_points: List[str]


class ComputeResult(BaseModel):
    dst_fit: float
    bcg_fit: float
    combined_fit: float
    technical_score: float
    financial_score: float
    total_score: float
    bid_recommendation: str
    lead_provider: str
    explanation: Explanation


class SaveScenarioRequest(ComputeRequest):
    pass


class ServiceOut(BaseModel):
    id: int
    provider: str
    name: str
    description: str
    hacs_fields: List[int]
    delivery_strength: int


class PackageOut(BaseModel):
    id: int
    name: str
    provider_lead: str
    dst_service_ids: List[int]
    bcg_service_ids: List[int]
    target_fields: List[int]
    description: str


class ScenarioOut(BaseModel):
    id: int
    entity_id: int
    hacs_field: int
    provider_mix: str
    dst_service_ids: List[int]
    bcg_service_ids: List[int]
    price_posture: str
    technical_score: float
    financial_score: float
    total_score: float
    bid_recommendation: str
    created_at: datetime


# ── Import / Allocation tables ──────────────────────────────────────────

class PastAllocation(SQLModel, table=True):
    __tablename__ = "past_allocation"
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: Optional[int] = None
    entity_name_raw: str
    client_name: str
    contract_title: str
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    contract_value_eur: Optional[float] = None
    invoiced_by_entity_eur: Optional[float] = None
    role: Optional[str] = None
    hacs_field: Optional[int] = None
    field_of_expertise: Optional[str] = None
    source: str = "annex71"


class ImportLog(SQLModel, table=True):
    __tablename__ = "import_log"
    id: Optional[int] = Field(default=None, primary_key=True)
    source: str
    status: str
    message: str
    records_imported: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ImportRawCache(SQLModel, table=True):
    __tablename__ = "import_raw_cache"
    id: Optional[int] = Field(default=None, primary_key=True)
    cache_key: str = Field(index=True)
    response_json: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Import response bodies ──────────────────────────────────────────────

class PastAllocationOut(BaseModel):
    id: int
    entity_id: Optional[int]
    entity_name_raw: str
    entity_acronym: Optional[str]
    client_name: str
    contract_title: str
    contract_start: Optional[date]
    contract_end: Optional[date]
    contract_value_eur: Optional[float]
    invoiced_by_entity_eur: Optional[float]
    role: Optional[str]
    hacs_field: Optional[int]
    field_of_expertise: Optional[str]
    source: str


class ImportLogOut(BaseModel):
    id: int
    source: str
    status: str
    message: str
    records_imported: int
    created_at: datetime


class Annex71StatusOut(BaseModel):
    file_found: bool
    file_path: str
    records: int
    last_imported: Optional[datetime]


class TedSearchRequest(BaseModel):
    query: str
    max_results: int = 20


class TedNotice(BaseModel):
    notice_id: str
    title: str
    entity_name: str
    client_name: str
    contract_value_eur: Optional[float]
    publication_date: Optional[str]
    field_guess: Optional[int]


class TedConfirmRequest(BaseModel):
    notice_ids: List[str]


class OutreachRequest(BaseModel):
    entity_id: int
    purpose: str
    tone: str
    context: str = ""


class OutreachResult(BaseModel):
    subject: str
    body: str
    ai_generated: bool
    model_used: Optional[str] = None


class AIStatusOut(BaseModel):
    available: bool
    provider: Optional[str] = None
    model: Optional[str] = None
