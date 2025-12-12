"""
API route handlers.
"""
from .geologic import router as geologic_router
from .photos import router as photos_router

__all__ = ["geologic_router", "photos_router"]

