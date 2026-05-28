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


class EntityIntelligenceSnapshot(SQLModel, table=True):
    __tablename__ = "entity_intelligence_snapshot"
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: int = Field(index=True)
    need_statement: str
    primary_field: Optional[int] = None
    secondary_field: Optional[int] = None
    confidence: str
    provider_match: str
    recommended_action: str
    signals_json: str
    summary_json: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IntelligenceRefreshRun(SQLModel, table=True):
    __tablename__ = "intelligence_refresh_run"
    id: Optional[int] = Field(default=None, primary_key=True)
    status: str = Field(index=True)
    scope: str = "all_entities"
    total_entities: int = 0
    processed_entities: int = 0
    succeeded_entities: int = 0
    failed_entities: int = 0
    max_results_per_entity: int = 6
    error_message: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class EntityHacsAssignment(SQLModel, table=True):
    __tablename__ = "entity_hacs_assignment"
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: int = Field(index=True)
    primary_field: Optional[int] = None
    secondary_field: Optional[int] = None
    confidence: str
    status: str = Field(default="suggested", index=True)
    rationale: str
    field_scores_json: str
    evidence_json: str
    model_version: str
    locked_by_user: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


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
    supplier_name: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    contract_value_eur: Optional[float] = None
    invoiced_by_entity_eur: Optional[float] = None
    role: Optional[str] = None
    hacs_field: Optional[int] = None
    field_of_expertise: Optional[str] = None
    framework_reference: Optional[str] = None
    lot_reference: Optional[str] = None
    source_url: Optional[str] = None
    confidence_of_match: Optional[float] = None
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
    supplier_name: Optional[str]
    contract_start: Optional[date]
    contract_end: Optional[date]
    contract_value_eur: Optional[float]
    invoiced_by_entity_eur: Optional[float]
    role: Optional[str]
    hacs_field: Optional[int]
    field_of_expertise: Optional[str]
    framework_reference: Optional[str]
    lot_reference: Optional[str]
    source_url: Optional[str]
    confidence_of_match: Optional[float]
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
    estimated_value_eur: Optional[float] = None
    award_value_eur: Optional[float] = None
    cpv_codes: List[str] = []
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


class IntelligenceSignalOut(BaseModel):
    source: str
    title: str
    summary: str
    date: Optional[str] = None
    url: Optional[str] = None
    field_guess: Optional[int] = None
    contract_value_eur: Optional[float] = None
    estimated_value_eur: Optional[float] = None
    award_value_eur: Optional[float] = None
    cpv_codes: List[str] = []
    relevance_score: float
    client_name: Optional[str] = None


class EntityIntelligenceOut(BaseModel):
    id: int
    entity_id: int
    need_statement: str
    primary_field: Optional[int]
    secondary_field: Optional[int]
    confidence: str
    provider_match: str
    recommended_action: str
    signals: List[IntelligenceSignalOut]
    summary: dict
    created_at: datetime


class IntelligenceRefreshRequest(BaseModel):
    entity_ids: List[int]
    max_results_per_entity: int = 8


class IntelligenceRefreshRunOut(BaseModel):
    id: int
    status: str
    scope: str
    total_entities: int
    processed_entities: int
    succeeded_entities: int
    failed_entities: int
    max_results_per_entity: int
    error_message: Optional[str]
    started_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


class HacsAssignmentOut(BaseModel):
    id: int
    entity_id: int
    primary_field: Optional[int]
    secondary_field: Optional[int]
    confidence: str
    status: str
    rationale: str
    field_scores: dict
    evidence: dict
    model_version: str
    locked_by_user: bool
    created_at: datetime
    updated_at: datetime


class HacsAssignmentGenerateRequest(BaseModel):
    entity_ids: Optional[List[int]] = None
    apply_to_entities: bool = False
