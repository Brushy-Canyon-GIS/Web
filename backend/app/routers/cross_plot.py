"""
API routes for measured-section cross plot endpoints.

These routes expose a PNG image of the cross plot for a given measured
section name. Data is read from the Supabase table (measured_section_stats).
"""

import logging

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from functools import lru_cache

from app.database import database
from app.services.cross_plot_service import CrossPlotService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crossplots", tags=["Cross Plots"])


@lru_cache
def get_service() -> CrossPlotService:
    """Dependency to get a shared CrossPlotService instance (uses DB table)."""
    return CrossPlotService(database)


@router.get(
    "/{section_name}",
    summary="Get cross plot for a measured section",
    description=(
        "Returns a PNG image of the cross plot for the specified measured "
        "section name, from the measured_section_stats table in Supabase."
    ),
    response_description="PNG cross plot image",
)
async def get_cross_plot(
    section_name: str,
    service: CrossPlotService = Depends(get_service),
):
    """
    Generate and return a cross plot for the requested measured section.
    section_name can match the name column in the table or a map display name (fuzzy-matched).
    """
    try:
        png_bytes = await service.generate_section_plot_png(section_name)
        return Response(content=png_bytes, media_type="image/png")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Cross plot failed for section_name=%r", section_name)
        raise HTTPException(status_code=500, detail=f"Error generating cross plot: {str(e)}")


__all__ = ["router"]