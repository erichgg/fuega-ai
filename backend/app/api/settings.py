"""Settings management routes."""
from fastapi import APIRouter, Depends, HTTPException
from backend.app.config import load_yaml_config, save_yaml_config
from backend.app.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

VALID_SECTIONS = {"brand", "services", "agents", "workflows", "budget", "platforms"}


@router.get("/brand")
async def get_brand_config():
    return load_yaml_config("brand")


@router.get("/services")
async def get_services_config():
    return load_yaml_config("services")


@router.get("/agents")
async def get_agents_config():
    return load_yaml_config("agents")


@router.get("/workflows")
async def get_workflows_config():
    return load_yaml_config("workflows")


@router.get("/budget")
async def get_budget_config():
    return load_yaml_config("budget")


@router.get("/platforms")
async def get_platforms_config():
    return load_yaml_config("platforms")


@router.put("/{section}")
async def update_config(section: str, data: dict):
    if section not in VALID_SECTIONS:
        raise HTTPException(400, f"Invalid section. Must be one of: {', '.join(VALID_SECTIONS)}")
    save_yaml_config(section, data)
    return {"status": "saved", "section": section}
