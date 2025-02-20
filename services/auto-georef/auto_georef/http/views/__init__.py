from fastapi import APIRouter

from . import cmas, features, index, points_lines, sgmc

view_router = APIRouter()
view_router.include_router(index.router)
view_router.include_router(points_lines.router, prefix="/lines", tags=["Points & Lines"])
view_router.include_router(cmas.router, prefix="/cmas", tags=["CMA Management"])
view_router.include_router(features.router, prefix="/features", tags=["Projected Features Management"])
view_router.include_router(sgmc.router, prefix="/sgmc", tags=["SGMC Polygons"])
