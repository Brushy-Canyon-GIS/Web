"""
API routes for measured-section cross plot endpoints.

These routes expose a PNG image that reproduces the cross plot example
from the `cross_plotting` notebook, for a given measured section name.
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from functools import lru_cache

from app.services.cross_plot_service import CrossPlotService


router = APIRouter(prefix="/crossplots", tags=["Cross Plots"])


@lru_cache
def get_service() -> CrossPlotService:
    """
    Dependency to get a shared CrossPlotService instance.
    """
    return CrossPlotService()


@router.get(
    "/{section_name}",
    summary="Get cross plot for a measured section",
    description=(
        "Returns a PNG image of the cross plot for the specified measured "
        "section name, based on the MeasuredSectionStats.csv file."
    ),
    response_description="PNG cross plot image",
)
async def get_cross_plot(
    section_name: str,
    service: CrossPlotService = Depends(get_service),
):
    """
    Generate and return a cross plot for the requested measured section.

    The `section_name` should match the `name` column in
    `MeasuredSectionStats.csv` (e.g., `ArrowCanyon`).
    """
    try:
        png_bytes = service.generate_section_plot_png(section_name)
        return Response(content=png_bytes, media_type="image/png")
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        # Section not found in CSV
        raise HTTPException(status_code=404, detail=str(e))


__all__ = ["router"]

