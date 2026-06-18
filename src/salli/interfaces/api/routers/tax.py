from __future__ import annotations

from fastapi import APIRouter

from salli.interfaces.api.deps import AppServices, CurrentUser

router = APIRouter(prefix="/tax", tags=["tax"])


@router.get("/packs")
async def list_packs(svc: AppServices):
    packs = svc.tax.list_packs()
    return [
        {
            "country": p.country,
            "year": p.year,
            "version": p.version,
            "period_start": p.period_start,
            "period_end": p.period_end,
            "personal_relief": str(p.personal_relief),
            "return_due": p.filing.return_due,
        }
        for p in packs
    ]


@router.post("/compute")
async def compute_tax(user_id: CurrentUser, svc: AppServices, year: str = "2025/26"):
    result = await svc.tax.compute_tax(user_id, year)
    return {
        "pack_year": result.pack_year,
        "pack_version": result.pack_version,
        "gross_income": str(result.gross_income),
        "personal_relief_applied": str(result.personal_relief_applied),
        "taxable_income": str(result.taxable_income),
        "tax_before_credits": str(result.tax_before_credits),
        "apit_credit": str(result.apit_credit),
        "ait_credit": str(result.ait_credit),
        "foreign_tax_credit": str(result.foreign_tax_credit),
        "total_credits": str(result.total_credits),
        "tax_payable": str(result.tax_payable),
        "band_workings": [
            {
                "from": str(bw.from_amount),
                "to": str(bw.to_amount) if bw.to_amount else None,
                "rate": str(bw.rate),
                "taxable_in_band": str(bw.taxable_in_band),
                "tax": str(bw.tax),
            }
            for bw in result.band_workings
        ],
    }


@router.get("/latest")
async def get_latest(user_id: CurrentUser, svc: AppServices, year: str = "2025/26"):
    result = await svc.tax.get_latest_computation(user_id, year)
    if result is None:
        return {"result": None}
    return {"result": result}
