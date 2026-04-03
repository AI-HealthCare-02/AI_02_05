from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.drug_repository import DrugRepository


class DrugService:
    def __init__(self, db: AsyncSession):
        self.repo = DrugRepository(db)

    async def search(self, query: str) -> list[dict]:
        drugs = await self.repo.search(query)
        return [
            {
                "id": d.id,
                "name_ko": d.name_ko,
                "generic_name": d.generic_name,
                "drug_class": d.drug_class,
                "is_otc": d.is_otc,
            }
            for d in drugs
        ]

    async def check_interactions_by_name(self, drug_names: list[str]) -> dict:
        drugs = []
        for name in drug_names:
            found = await self.repo.search(name)
            if found:
                drugs.append(found[0])
        if len(drugs) < 2:
            return {"interactions": [], "safe": True}
        return await self.check_interactions([d.id for d in drugs])

    async def check_interactions(self, drug_ids: list[int]) -> dict:
        if len(drug_ids) < 2:
            return {"interactions": [], "safe": True}
        interactions = await self.repo.get_interactions(drug_ids)
        return {
            "interactions": [
                {
                    "drug_a_id": i.drug_a_id,
                    "drug_b_id": i.drug_b_id,
                    "severity": i.severity,
                    "description": i.description,
                }
                for i in interactions
            ],
            "safe": len(interactions) == 0,
        }
