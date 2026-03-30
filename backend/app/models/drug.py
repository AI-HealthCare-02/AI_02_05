from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Drug(Base):
    __tablename__ = "drugs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name_ko: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    generic_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    drug_class: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_otc: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    interactions_as_a: Mapped[list["DrugInteraction"]] = relationship("DrugInteraction", foreign_keys="DrugInteraction.drug_a_id", back_populates="drug_a")
    interactions_as_b: Mapped[list["DrugInteraction"]] = relationship("DrugInteraction", foreign_keys="DrugInteraction.drug_b_id", back_populates="drug_b")


class DrugInteraction(Base):
    __tablename__ = "drug_interactions"
    __table_args__ = (UniqueConstraint("drug_a_id", "drug_b_id", name="uq_drug_interaction_pair"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    drug_a_id: Mapped[int] = mapped_column(Integer, ForeignKey("drugs.id", ondelete="CASCADE"))
    drug_b_id: Mapped[int] = mapped_column(Integer, ForeignKey("drugs.id", ondelete="CASCADE"))
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    drug_a: Mapped["Drug"] = relationship("Drug", foreign_keys=[drug_a_id], back_populates="interactions_as_a")
    drug_b: Mapped["Drug"] = relationship("Drug", foreign_keys=[drug_b_id], back_populates="interactions_as_b")
