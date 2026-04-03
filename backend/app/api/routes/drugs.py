from fastapi import APIRouter, Depends, Query
from app.api.deps import get_drug_service
from app.services.drug_service import DrugService

router = APIRouter(prefix="/drugs", tags=["drugs"])


@router.get("/search")
async def search_drugs(
    q: str = Query(..., min_length=1),
    service: DrugService = Depends(get_drug_service),
):
    return await service.search(q)


@router.post("/check-interactions-by-name")
async def check_interactions_by_name(
    drug_names: list[str],
    service: DrugService = Depends(get_drug_service),
):
    return await service.check_interactions_by_name(drug_names)


@router.post("/check-interactions")
async def check_interactions(
    drug_ids: list[int],
    service: DrugService = Depends(get_drug_service),
):
    return await service.check_interactions(drug_ids)
