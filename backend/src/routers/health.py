from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    status_code=200,
    summary="Health check endpoint",
)
async def health_check() -> dict:
    return {"status": "ok", "version": "1.0.0"}
