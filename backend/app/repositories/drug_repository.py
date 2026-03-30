from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.drug import Drug, DrugInteraction


class DrugRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, query: str, limit: int = 10) -> list[Drug]:
        result = await self.db.execute(
            select(Drug)
            .where(
                or_(
                    Drug.name_ko.ilike(f"%{query}%"),
                    Drug.generic_name.ilike(f"%{query}%"),
                )
            )
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_interactions(self, drug_ids: list[int]) -> list[DrugInteraction]:
        pairs = [
            (min(a, b), max(a, b))
            for i, a in enumerate(drug_ids)
            for b in drug_ids[i + 1:]
        ]
        if not pairs:
            return []
        result = await self.db.execute(
            select(DrugInteraction).where(
                or_(
                    *[
                        and_(
                            DrugInteraction.drug_a_id == a,
                            DrugInteraction.drug_b_id == b,
                        )
                        for a, b in pairs
                    ]
                )
            )
        )
        return list(result.scalars().all())

    async def bulk_get_by_names(self, names: list[str]) -> list[Drug]:
        result = await self.db.execute(
            select(Drug).where(Drug.name_ko.in_(names))
        )
        return list(result.scalars().all())
