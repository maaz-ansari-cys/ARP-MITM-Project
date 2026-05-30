from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging

from services.network_service import NetworkService
from services.mitm_service import MitmService
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
network_service = NetworkService(interface=settings.network_interface, network_range=settings.network_range)
mitm_service = MitmService()

class ScanResponse(BaseModel):
    status: str
    devices_found: int
    devices: List[Dict[str, Any]]
    network_range: str
    gateway_ip: Optional[str] = None

class MitmStartRequest(BaseModel):
    target_ip: str
    gateway_ip: str

class MitmStartResponse(BaseModel):
    session_id: str
    status: str
    start_time: str

class MitmStopRequest(BaseModel):
    session_id: str

class MitmStopResponse(BaseModel):
    session_id: str
    status: str
    duration_seconds: float
    total_bandwidth: int
    packets_captured: int
    end_time: str

@router.get("/info")
async def get_network_info():
    """
    Return auto-detected network information.
    Refreshes detection on every call for accurate, live data.
    
    Returns interface, host IP, gateway IP, subnet, SSID, 
    and whether the gateway is reachable.
    """
    try:
        info = network_service.refresh_network_info()
        return info
    except Exception as e:
        logger.error(f"Failed to detect network info: {e}")
        raise HTTPException(status_code=500, detail="Failed to detect network configuration")

@router.post("/scan", response_model=ScanResponse)
async def trigger_scan():
    """
    Trigger a network ARP scan.
    Auto-detects the current network before scanning.
    """
    try:
        devices = await network_service.arp_scan()
        return {
            "status": "success",
            "devices_found": len(devices),
            "devices": devices,
            "network_range": network_service.network_range,
            "gateway_ip": network_service.gateway_ip,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"Network scan failed: {str(e)}")

@router.post("/mitm/start", response_model=MitmStartResponse)
async def start_mitm(request: MitmStartRequest):
    """
    Start a MITM attack.
    """
    try:
        session_id = await mitm_service.start_mitm(
            target_ip=request.target_ip,
            gateway_ip=request.gateway_ip
        )
        # Get start time from active sessions
        session_data = mitm_service.active_sessions[session_id]
        return {
            "session_id": session_id,
            "status": "active",
            "start_time": session_data["start_time"].isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"MITM start failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start MITM attack: {str(e)}")

@router.post("/mitm/stop", response_model=MitmStopResponse)
async def stop_mitm(request: MitmStopRequest):
    """
    Stop a MITM attack.
    """
    try:
        result = await mitm_service.stop_mitm(session_id=request.session_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"MITM stop failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop MITM attack")

@router.get("/mitm/status")
async def get_mitm_status():
    """
    Get all active MITM sessions.
    """
    try:
        sessions = []
        for session_id in mitm_service.active_sessions:
            stats = await mitm_service.get_session_stats(session_id)
            sessions.append(stats)
        return {"active_sessions": sessions}
    except Exception as e:
        logger.error(f"Failed to get MITM status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve MITM status")

@router.get("/interfaces")
async def list_interfaces():
    """
    List all available network interfaces that Scapy can use.
    Useful for Windows where interface names differ from Linux.
    """
    try:
        from scapy.all import get_if_list, conf
        interfaces = get_if_list()
        current = str(conf.iface)
        return {
            "interfaces": interfaces,
            "current": current,
            "configured": network_service.interface
        }
    except Exception as e:
        logger.error(f"Failed to list interfaces: {e}")
        raise HTTPException(status_code=500, detail="Failed to list interfaces")
