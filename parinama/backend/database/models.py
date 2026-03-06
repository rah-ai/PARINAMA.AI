# ════════════════════════════════════════════════
# PARINAMA — Database Models
# SQLAlchemy ORM models for evolution tracking
# ════════════════════════════════════════════════

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Text,
    DateTime,
    ForeignKey,
    Index,
    create_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    relationship,
    sessionmaker,
    Mapped,
    mapped_column,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)


# ── Base Class ────────────────────────────────

class Base(DeclarativeBase):
    """Base class for all PARINAMA models."""
    pass


# ── Helper ────────────────────────────────────

def generate_session_id() -> str:
    """Generate a unique session identifier."""
    return uuid.uuid4().hex[:16]


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


# ══════════════════════════════════════════════
# TABLE: evolution_sessions
# Stores each complete evolution run
# ══════════════════════════════════════════════

class EvolutionSession(Base):
    __tablename__ = "evolution_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    session_id: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        nullable=False,
        default=generate_session_id,
        index=True,
    )

    # ── Prompt Data ───────────────────────────
    original_prompt: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    best_prompt: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    # ── Scores ────────────────────────────────
    best_score: Mapped[float | None] = mapped_column(
        Float, nullable=True, default=0.0
    )
    initial_score: Mapped[float | None] = mapped_column(
        Float, nullable=True, default=0.0
    )
    score_improvement: Mapped[float | None] = mapped_column(
        Float, nullable=True, default=0.0
    )

    # ── Evolution Metadata ────────────────────
    total_generations: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    max_generations_requested: Mapped[int] = mapped_column(
        Integer, nullable=False, default=7
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",  # pending | evolving | completed | failed
    )

    # ── LLM Tracking ─────────────────────────
    primary_llm_used: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    llm_switches: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    # ── Timestamps ────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ── Relationships ─────────────────────────
    generations: Mapped[list["Generation"]] = relationship(
        "Generation",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Generation.generation_num",
        lazy="selectin",
    )

    # ── Indexes ───────────────────────────────
    __table_args__ = (
        Index("idx_session_status", "status"),
        Index("idx_session_created", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<EvolutionSession("
            f"session_id='{self.session_id}', "
            f"status='{self.status}', "
            f"best_score={self.best_score}"
            f")>"
        )

    def to_dict(self) -> dict:
        """Serialize session to dictionary for API responses."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "original_prompt": self.original_prompt,
            "best_prompt": self.best_prompt,
            "best_score": self.best_score,
            "initial_score": self.initial_score,
            "score_improvement": self.score_improvement,
            "total_generations": self.total_generations,
            "max_generations_requested": self.max_generations_requested,
            "status": self.status,
            "primary_llm_used": self.primary_llm_used,
            "llm_switches": self.llm_switches,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "generations": [g.to_dict() for g in self.generations] if self.generations else [],
        }


# ══════════════════════════════════════════════
# TABLE: generations
# Stores each individual generation in an evolution
# ══════════════════════════════════════════════

class Generation(Base):
    __tablename__ = "generations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ── Foreign Key ───────────────────────────
    session_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("evolution_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Generation Identity ───────────────────
    generation_num: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    prompt_text: Mapped[str] = mapped_column(
        Text, nullable=False
    )

    # ── 5-Dimension Scores ────────────────────
    clarity_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    specificity_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    actionability_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    conciseness_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    creativity_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    total_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )

    # ── Mutation Data ─────────────────────────
    mutation_type: Mapped[str | None] = mapped_column(
        String(32), nullable=True  # None for Generation 0 (original)
    )
    weaknesses_found: Mapped[str | None] = mapped_column(
        Text, nullable=True  # JSON string of weakness list
    )
    improvement_delta: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )

    # ── LLM Tracking ─────────────────────────
    llm_used: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    llm_badge_color: Mapped[str | None] = mapped_column(
        String(16), nullable=True
    )

    # ── Timestamps ────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    processing_time_ms: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    # ── Relationships ─────────────────────────
    session: Mapped["EvolutionSession"] = relationship(
        "EvolutionSession",
        back_populates="generations",
    )

    # ── Indexes ───────────────────────────────
    __table_args__ = (
        Index("idx_gen_session_num", "session_id", "generation_num"),
    )

    def __repr__(self) -> str:
        return (
            f"<Generation("
            f"session='{self.session_id}', "
            f"gen={self.generation_num}, "
            f"score={self.total_score}, "
            f"mutation='{self.mutation_type}'"
            f")>"
        )

    @property
    def scores_dict(self) -> dict:
        """Return the 5-dimension scores as a dictionary."""
        return {
            "clarity": self.clarity_score,
            "specificity": self.specificity_score,
            "actionability": self.actionability_score,
            "conciseness": self.conciseness_score,
            "creativity": self.creativity_score,
        }

    def to_dict(self) -> dict:
        """Serialize generation to dictionary for API responses."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "generation_num": self.generation_num,
            "prompt_text": self.prompt_text,
            "scores": {
                "clarity": self.clarity_score,
                "specificity": self.specificity_score,
                "actionability": self.actionability_score,
                "conciseness": self.conciseness_score,
                "creativity": self.creativity_score,
                "total": self.total_score,
            },
            "mutation_type": self.mutation_type,
            "weaknesses_found": self.weaknesses_found,
            "improvement_delta": self.improvement_delta,
            "llm_used": self.llm_used,
            "llm_badge_color": self.llm_badge_color,
            "processing_time_ms": self.processing_time_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ══════════════════════════════════════════════
# TABLE: llm_logs
# Tracks all LLM switches and errors
# ══════════════════════════════════════════════

class LLMLog(Base):
    __tablename__ = "llm_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    session_id: Mapped[str | None] = mapped_column(
        String(32), nullable=True, index=True
    )
    generation_num: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    # ── Switch Details ────────────────────────
    event_type: Mapped[str] = mapped_column(
        String(32), nullable=False  # "switch" | "error" | "success"
    )
    from_llm: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    to_llm: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    # ── Timestamps ────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )


# ══════════════════════════════════════════════
# DATABASE ENGINE & SESSION FACTORY
# ══════════════════════════════════════════════

DATABASE_URL = "sqlite+aiosqlite:///./parinama.db"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """Dependency injection for FastAPI — yields an async session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
