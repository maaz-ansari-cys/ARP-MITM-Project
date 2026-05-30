"""
Network auto-detection utilities.
Detects active interface, IP address, subnet, gateway, SSID,
and verifies connectivity by pinging the gateway.

This replaces ALL hardcoded network values throughout the project.
"""

import platform
import subprocess
import socket
import re
import logging
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger(__name__)


def detect_network_info() -> Dict[str, Any]:
    """
    Auto-detect current network configuration.

    Returns dict with:
    - interface: Active network interface name (Scapy-compatible)
    - ip_address: Host's IP address on the active interface
    - gateway_ip: Default gateway IP
    - network_range: CIDR notation subnet (e.g. '192.168.1.0/24')
    - subnet_mask: Subnet mask string
    - ssid: Current Wi-Fi SSID (or None if wired)
    - gateway_reachable: bool — whether gateway responds to ping
    """
    info = {
        "interface": None,
        "ip_address": None,
        "gateway_ip": None,
        "network_range": None,
        "subnet_mask": "255.255.255.0",
        "ssid": None,
        "gateway_reachable": False,
    }

    system = platform.system()

    if system == "Windows":
        # Full Windows specific parsing for IP, Subnet, and Gateway
        win_info = _detect_windows_network()
        if win_info.get("ip"):
            info["ip_address"] = win_info["ip"]
            info["gateway_ip"] = win_info.get("gateway")
            info["subnet_mask"] = win_info.get("subnet", "255.255.255.0")
            
        # Also grab Scapy interface
        _, info["interface"] = _detect_ip_and_interface(system)
    else:
        # 1. Detect gateway IP (Linux/Mac)
        info["gateway_ip"] = _detect_gateway(system)

        # 2. Detect host IP and Scapy interface
        ip, iface = _detect_ip_and_interface(system)
        info["ip_address"] = ip
        info["interface"] = iface

    logger.info(f"[AutoDetect] Host IP: {info['ip_address']}, Gateway: {info['gateway_ip']}, Subnet: {info['subnet_mask']}, Interface: {info['interface']}")

    # 3. Calculate network range from host IP and Subnet
    if info["ip_address"]:
        info["network_range"] = _calculate_network_range(info["ip_address"], info["subnet_mask"])
        logger.info(f"[AutoDetect] Network range: {info['network_range']}")

    # 4. Detect Wi-Fi SSID
    info["ssid"] = _detect_ssid(system)
    logger.info(f"[AutoDetect] SSID: {info['ssid']}")

    # 5. Ping gateway to verify connectivity
    if info["gateway_ip"]:
        info["gateway_reachable"] = ping_host(info["gateway_ip"])
        logger.info(f"[AutoDetect] Gateway reachable: {info['gateway_reachable']}")

    return info


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _detect_windows_network() -> Dict[str, str]:
    """Parse Windows ipconfig to reliably get the active IP, Subnet, and Gateway."""
    result = {}
    try:
        output = subprocess.check_output(
            ["ipconfig"], text=True, timeout=10, stderr=subprocess.DEVNULL
        )
        current_adapter = None
        adapter_info = {}
        active_adapters = []

        for line in output.splitlines():
            line = line.strip('\r')
            if line.startswith('Windows IP') or not line.strip():
                continue
            
            if not line.startswith(' ') and ':' in line:
                if current_adapter and adapter_info.get('ip') and adapter_info.get('gateway'):
                    active_adapters.append(adapter_info)
                current_adapter = line.split(':')[0].strip()
                adapter_info = {'name': current_adapter}
            elif line.startswith(' '):
                if 'IPv4 Address' in line:
                    m = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                    if m: adapter_info['ip'] = m.group(1)
                elif 'Subnet Mask' in line:
                    m = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                    if m: adapter_info['subnet'] = m.group(1)
                elif 'Default Gateway' in line:
                    m = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                    if m: 
                        adapter_info['gateway'] = m.group(1)
                    else:
                        adapter_info['expect_gateway_next_line'] = True
                elif adapter_info.get('expect_gateway_next_line'):
                    if ':' not in line:
                        m = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                        if m: adapter_info['gateway'] = m.group(1)
                    adapter_info['expect_gateway_next_line'] = False

        if current_adapter and adapter_info.get('ip') and adapter_info.get('gateway'):
            active_adapters.append(adapter_info)
            
        if active_adapters:
            # Prefer an adapter with a valid 192/10/172 private IP if possible, else the first one
            for adapter in active_adapters:
                ip = adapter.get("ip", "")
                if ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172."):
                    return adapter
            return active_adapters[0]

    except Exception as e:
        logger.warning(f"[AutoDetect] Windows ipconfig parsing failed: {e}")
        
    return result

def _detect_gateway(system: str) -> Optional[str]:
    """Detect default gateway IP using OS commands, then Scapy as fallback."""

    # --- Method 1: OS-specific commands ---
    try:
        if system != "Windows":
            # Linux / macOS
            try:
                output = subprocess.check_output(
                    ["ip", "route", "show", "default"],
                    text=True, timeout=5, stderr=subprocess.DEVNULL,
                )
                m = re.search(r"default via (\d+\.\d+\.\d+\.\d+)", output)
                if m:
                    return m.group(1)
            except FileNotFoundError:
                # macOS may not have `ip`, try `route`
                output = subprocess.check_output(
                    ["route", "-n", "get", "default"],
                    text=True, timeout=5, stderr=subprocess.DEVNULL,
                )
                m = re.search(r"gateway:\s*(\d+\.\d+\.\d+\.\d+)", output)
                if m:
                    return m.group(1)
    except Exception as e:
        logger.warning(f"[AutoDetect] OS gateway detection failed: {e}")

    # --- Method 2: Scapy routing table ---
    try:
        from scapy.all import conf
        gw = conf.route.route("0.0.0.0")[2]
        if gw and gw != "0.0.0.0":
            logger.info(f"[AutoDetect] Gateway from Scapy: {gw}")
            return gw
    except Exception as e:
        logger.warning(f"[AutoDetect] Scapy gateway detection failed: {e}")

    return None


def _detect_ip_and_interface(system: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Detect the host IP and active Scapy interface.
    Uses socket trick (connect to external IP) to find the right local IP.
    """
    ip: Optional[str] = None
    iface: Optional[str] = None

    # Reliable cross-platform method: open a UDP socket to 8.8.8.8
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
    except Exception as e:
        logger.warning(f"[AutoDetect] Socket-based IP detection failed: {e}")

    # Get the Scapy default interface (the one Scapy will use for srp/send)
    try:
        from scapy.all import conf
        iface = str(conf.iface)
    except Exception as e:
        logger.warning(f"[AutoDetect] Scapy interface detection failed: {e}")

    return ip, iface


def _calculate_network_range(ip: str, subnet_mask: str = "255.255.255.0") -> str:
    """Calculate network range using the explicit subnet mask if available."""
    try:
        import ipaddress
        net = ipaddress.IPv4Network(f"{ip}/{subnet_mask}", strict=False)
        return str(net)
    except Exception as e:
        logger.warning(f"[AutoDetect] IP address module failed: {e}, falling back to /24")
        parts = ip.split(".")
        return f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"


def _detect_ssid(system: str) -> Optional[str]:
    """Detect the current Wi-Fi SSID, or None for wired / unknown."""
    try:
        if system == "Windows":
            output = subprocess.check_output(
                ["netsh", "wlan", "show", "interfaces"],
                text=True, timeout=5, stderr=subprocess.DEVNULL,
            )
            for line in output.splitlines():
                stripped = line.strip()
                if stripped.startswith("SSID") and not stripped.startswith("BSSID"):
                    parts = stripped.split(":", 1)
                    if len(parts) == 2:
                        ssid = parts[1].strip()
                        if ssid:
                            return ssid

        elif system == "Linux":
            output = subprocess.check_output(
                ["iwgetid", "-r"],
                text=True, timeout=5, stderr=subprocess.DEVNULL,
            )
            return output.strip() or None

        elif system == "Darwin":
            output = subprocess.check_output(
                [
                    "/System/Library/PrivateFrameworks/"
                    "Apple80211.framework/Versions/Current/"
                    "Resources/airport",
                    "-I",
                ],
                text=True, timeout=5, stderr=subprocess.DEVNULL,
            )
            for line in output.splitlines():
                stripped = line.strip()
                if stripped.startswith("SSID"):
                    return stripped.split(":")[1].strip()

    except Exception as e:
        logger.debug(f"[AutoDetect] SSID detection failed (probably wired): {e}")

    return None


def ping_host(ip: str, count: int = 2, timeout: int = 3) -> bool:
    """
    Ping a host to verify reachability.

    Args:
        ip: IP address to ping
        count: Number of ping packets
        timeout: Per-packet timeout in seconds

    Returns:
        True if host responds, False otherwise
    """
    try:
        system = platform.system()
        if system == "Windows":
            cmd = ["ping", "-n", str(count), "-w", str(timeout * 1000), ip]
        else:
            cmd = ["ping", "-c", str(count), "-W", str(timeout), ip]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout * count + 5,
        )
        return result.returncode == 0
    except Exception as e:
        logger.warning(f"[AutoDetect] Ping to {ip} failed: {e}")
        return False
