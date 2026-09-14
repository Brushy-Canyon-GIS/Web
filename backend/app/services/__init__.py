"""
Service layer for business logic.

Services are imported by their own module path -- `from app.services.photos_service
import PhotosService` -- rather than re-exported here. Re-exporting made importing
any single service pull in all of them, so loading the tile renderer also loaded
matplotlib, pandas and rapidfuzz by way of cross_plot_service.
"""
