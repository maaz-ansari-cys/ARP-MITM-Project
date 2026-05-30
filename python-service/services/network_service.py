"""
NetworkService class for ARP scanning and device discovery.
Implements network device discovery using Scapy and stores results in MongoDB.

Auto-detects interface, gateway, and network range at runtime.
"""

from scapy.all import ARP, Ether, srp, conf
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import logging
import re
import asyncio

from database import get_database
from utils.network_info import detect_network_info, ping_host

logger = logging.getLogger(__name__)


class NetworkService:
    """
    Service for network device discovery and management.
    
    Responsibilities:
    - Auto-detect active network (interface, IP, gateway, subnet)
    - Execute ARP scans using Scapy
    - Parse ARP responses
    - Lookup MAC vendors
    - Detect gateway device
    - Store results in MongoDB with subnet tagging
    - Mark stale devices from other networks as inactive
    """
    
    def __init__(self, interface: str = "auto", network_range: str = "auto"):
        """
        Initialize network service.
        
        If interface/network_range are "auto" (default), auto-detect them.
        Otherwise use the explicitly provided values.
        
        Args:
            interface: Network interface or "auto" for auto-detect
            network_range: CIDR range or "auto" for auto-detect
        """
        # Run auto-detection
        self._detected = detect_network_info()
        
        # Resolve interface
        if interface == "auto" or not interface:
            self.interface = self._detected["interface"]
        else:
            self.interface = interface
        
        # Resolve network range
        if network_range == "auto" or not network_range:
            self.network_range = self._detected["network_range"]
        else:
            self.network_range = network_range
        
        # Store detected info for the /info endpoint
        self.host_ip = self._detected["ip_address"]
        self.gateway_ip = self._detected["gateway_ip"]
        self.ssid = self._detected["ssid"]
        self.gateway_reachable = self._detected["gateway_reachable"]
        
        # Configure Scapy interface (best-effort; fallback to default)
        try:
            if self.interface:
                conf.iface = self.interface
                logger.info(f"Configured Scapy to use interface: {self.interface}")
        except Exception as e:
            logger.warning(f"Could not set interface {self.interface}: {e}. Using Scapy default.")
            self.interface = str(conf.iface)
        
        # MAC vendor lookup dictionary (OUI prefix -> vendor name)
        # This is a simplified version. In production, use a full OUI database
        self.mac_vendors = {
            "00:50:56": "VMware",
            "00:0C:29": "VMware",
            "00:05:69": "VMware",
            "08:00:27": "VirtualBox",
            "52:54:00": "QEMU/KVM",
            "00:16:3E": "Xen",
            "00:1C:42": "Parallels",
            "00:15:5D": "Microsoft Hyper-V",
            "00:03:FF": "Microsoft",
            "00:50:F2": "Microsoft",
            "00:0D:3A": "Microsoft Azure",
            "F0:18:98": "Apple",
            "3C:22:FB": "Apple",
            "A4:83:E7": "Apple",
            "B8:27:EB": "Raspberry Pi",
            "DC:A6:32": "Raspberry Pi",
            "E4:5F:01": "Raspberry Pi",
            "00:1A:7D": "Cisco",
            "00:1B:D5": "Cisco",
            "00:1C:0E": "Cisco",
            "00:50:73": "Cisco",
            "D8:B3:70": "Dell",
            "18:03:73": "Dell",
            "B0:83:FE": "Dell",
            "00:14:22": "Dell",
            "00:1E:C9": "HP",
            "00:23:7D": "HP",
            "00:25:B3": "HP",
            "00:30:6E": "HP",
            "00:1B:21": "Intel",
            "00:1E:67": "Intel",
            "00:24:D7": "Intel",
            "00:50:BA": "D-Link",
            "00:17:9A": "D-Link",
            "00:1C:F0": "D-Link",
            "00:18:E7": "Netgear",
            "00:1E:2A": "Netgear",
            "00:26:F2": "Netgear",
            "00:1D:7E": "TP-Link",
            "00:27:19": "TP-Link",
            "F4:F2:6D": "TP-Link",
        }
        
        logger.info(
            f"NetworkService initialized: interface={self.interface}, "
            f"range={self.network_range}, gateway={self.gateway_ip}, "
            f"host_ip={self.host_ip}, ssid={self.ssid}"
        )
    
    def refresh_network_info(self) -> Dict[str, Any]:
        """
        Re-run auto-detection and update internal state.
        Called by the /network/info endpoint or before a scan.
        
        Returns:
            Dict with all detected network information
        """
        self._detected = detect_network_info()
        self.interface = self._detected["interface"]
        self.network_range = self._detected["network_range"]
        self.host_ip = self._detected["ip_address"]
        self.gateway_ip = self._detected["gateway_ip"]
        self.ssid = self._detected["ssid"]
        self.gateway_reachable = self._detected["gateway_reachable"]
        
        # Update Scapy interface
        try:
            if self.interface:
                conf.iface = self.interface
        except Exception:
            self.interface = str(conf.iface)
        
        logger.info(
            f"Network info refreshed: range={self.network_range}, "
            f"gateway={self.gateway_ip}, ssid={self.ssid}"
        )
        
        return self.get_network_info()
    
    def get_network_info(self) -> Dict[str, Any]:
        """
        Return current detected network info as a dict (for API response).
        """
        return {
            "interface": self.interface,
            "ip_address": self.host_ip,
            "gateway_ip": self.gateway_ip,
            "network_range": self.network_range,
            "ssid": self.ssid,
            "gateway_reachable": self.gateway_reachable,
        }
    
    async def arp_scan(self) -> List[Dict[str, Any]]:
        """
        Perform ARP scan to discover devices on network.
        Like `netdiscover -i eth0 -r 192.168.1.0/24` — returns IP, MAC, vendor for all responding hosts.

        Before scanning:
        1. Refreshes network info (auto-detect current network)
        2. Pings gateway to verify connectivity
        3. Marks old devices from different subnets as inactive

        Returns:
            List of discovered devices with IP, MAC, vendor

        Raises:
            PermissionError: If script doesn't have root/admin privileges
        """
        try:
            # Refresh network detection before every scan
            self.refresh_network_info()
            
            if not self.network_range:
                raise RuntimeError(
                    "Could not auto-detect network range. "
                    "Please set NETWORK_RANGE in .env or check your network connection."
                )
            
            # Verify gateway is reachable
            if self.gateway_ip:
                if not ping_host(self.gateway_ip):
                    logger.warning(
                        f"Gateway {self.gateway_ip} is not responding to ping. "
                        "Scan may find no devices."
                    )
                    self.gateway_reachable = False
                else:
                    self.gateway_reachable = True
            
            # Fast UDP/ARP trigger sweep to populate the OS ARP cache
            # On Windows, raw ARP replies over wireless cards are frequently dropped by drivers.
            # Forcing the OS to resolve target IPs natively via standard sockets guarantees success.
            try:
                import ipaddress
                import socket
                network = ipaddress.IPv4Network(self.network_range, strict=False)
                
                async def ping_ip(ip_str):
                    try:
                        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                        s.setblocking(False)
                        s.sendto(b'', (ip_str, 53535))
                        s.close()
                    except Exception:
                        pass

                tasks = [ping_ip(str(ip)) for ip in network.hosts()]
                logger.info(f"Triggering fast UDP sweep across {len(tasks)} hosts to populate OS ARP table...")
                await asyncio.gather(*tasks)
                # Give the OS a brief moment to process the incoming ARP responses
                await asyncio.sleep(1.0)
            except Exception as sweep_err:
                logger.warning(f"Fast UDP sweep failed: {sweep_err}")

            logger.info(f"Starting ARP scan on {self.network_range} via interface '{self.interface}'")

            # Step 1: Create ARP broadcast packet
            arp_request = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=self.network_range)

            # Step 2: Send at layer 2 and collect replies
            # Direct call instead of run_in_executor, as Scapy on Windows
            # often fails to capture packets if run in a background thread.
            answered, unanswered = self._send_arp(arp_request)

            logger.info(f"ARP scan complete: {len(answered)} responded, {len(unanswered)} no reply")
            
            # Extract IPs found by Scapy
            found_ips = {received.psrc: received.hwsrc for sent, received in answered}
            
            # Step 2.5: Augment with OS ARP table (Windows often blocks raw ARP replies)
            try:
                import ipaddress
                network = ipaddress.IPv4Network(self.network_range, strict=False)
                
                os_arp_devices = await self._get_os_arp_table()
                for ip, mac in os_arp_devices.items():
                    if ip not in found_ips:
                        try:
                            # Only include devices in the current subnet
                            if ipaddress.IPv4Address(ip) in network:
                                found_ips[ip] = mac
                                logger.info(f"Augmented from OS ARP table: {ip} ({mac})")
                        except Exception:
                            pass
            except Exception as e:
                logger.warning(f"OS ARP table augmentation failed: {e}")

            # Step 3: Build device list from responses
            devices = []
            for ip_address, mac_address in found_ips.items():
                vendor = await self.get_mac_vendor(mac_address)
                is_gateway = (ip_address == self.gateway_ip)

                device = {
                    "ip_address": ip_address,
                    "mac_address": mac_address,
                    "vendor": vendor,
                    "last_seen": datetime.now(timezone.utc),
                    "status": "active",
                    "is_gateway": is_gateway,
                    "network_subnet": self.network_range,
                }
                devices.append(device)
                logger.info(f"  Found: {ip_address}  {mac_address}  [{vendor}]{'  <-- Gateway' if is_gateway else ''}")

            logger.info(f"Total devices found: {len(devices)}")

            # Step 4: Mark devices from OTHER subnets as inactive
            await self._deactivate_foreign_devices()

            # Step 5: Persist to MongoDB
            await self.store_devices(devices)

            return devices

        except PermissionError as e:
            logger.error("ARP scan requires root/administrator privileges. On Windows, run as Administrator.")
            raise PermissionError("Administrator privileges required for ARP scanning") from e
        except Exception as e:
            logger.error(f"ARP scan failed: {e}", exc_info=True)
            raise
    
    def _send_arp(self, arp_request):
        """
        Synchronous ARP send — called directly to avoid thread-binding issues.
        """
        from scapy.all import conf
        try:
            answered, unanswered = srp(
                arp_request,
                iface=conf.iface,
                timeout=3,
                verbose=True,
                retry=1
            )
        except Exception as srp_err:
            logger.warning(f"srp with iface object failed: {srp_err}. Retrying without iface.")
            answered, unanswered = srp(
                arp_request,
                timeout=3,
                verbose=True,
                retry=1
            )
        return answered, unanswered
        
    async def _get_os_arp_table(self) -> Dict[str, str]:
        """
        Reads the OS ARP table to find devices Scapy might have missed.
        Returns a dict of IP -> MAC.
        """
        import platform
        import subprocess
        devices = {}
        try:
            if platform.system() == "Windows":
                output = subprocess.check_output(["arp", "-a"], text=True, timeout=5)
                # Parse Windows ARP table
                # Format:   192.168.1.1           e8-43-68-0b-9f-44     dynamic
                for line in output.splitlines():
                    parts = line.split()
                    if len(parts) == 3 and parts[2] in ["dynamic", "static"]:
                        ip = parts[0]
                        mac = parts[1].replace("-", ":").lower()
                        # Exclude multicast/broadcast
                        if not ip.startswith("224.") and not ip.startswith("239.") and not ip.endswith(".255"):
                            devices[ip] = mac
            else:
                output = subprocess.check_output(["arp", "-an"], text=True, timeout=5)
                # Parse Linux/Mac ARP table
                # Format: ? (192.168.1.1) at e8:43:68:0b:9f:44 [ether] on wlan0
                import re
                for line in output.splitlines():
                    match = re.search(r'\((.*?)\) at (([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2})', line)
                    if match:
                        ip = match.group(1)
                        mac = match.group(2).replace("-", ":").lower()
                        if not ip.startswith("224.") and not ip.startswith("239.") and not ip.endswith(".255"):
                            devices[ip] = mac
        except Exception as e:
            logger.warning(f"Failed to read OS ARP table: {e}")
        return devices
    
    async def get_mac_vendor(self, mac_address: str) -> str:
        """
        Lookup MAC address vendor using OUI (Organizationally Unique Identifier).
        
        Args:
            mac_address: MAC address in format "aa:bb:cc:dd:ee:ff"
            
        Returns:
            Vendor name or "Unknown"
        """
        try:
            # Normalize MAC address to uppercase
            mac_upper = mac_address.upper()
            
            # Extract OUI (first 3 octets)
            oui = ":".join(mac_upper.split(":")[:3])
            
            # Lookup vendor in dictionary
            vendor = self.mac_vendors.get(oui, "Unknown")
            
            return vendor
            
        except Exception as e:
            logger.warning(f"Failed to lookup vendor for MAC {mac_address}: {e}")
            return "Unknown"
    
    async def store_devices(self, devices: List[Dict[str, Any]]) -> None:
        """
        Store discovered devices in MongoDB with upsert logic.
        
        Algorithm:
        1. For each device, check if IP exists in database
        2. If exists: update last_seen, status, network_subnet
        3. If new: insert with first_seen = last_seen
        
        Args:
            devices: List of device dictionaries
            
        Raises:
            Exception: If database operation fails
        """
        try:
            db = get_database()
            devices_collection = db.devices
            
            for device in devices:
                # Validate device data before storing
                if not self._validate_device(device):
                    logger.warning(f"Skipping invalid device: {device}")
                    continue
                
                # Upsert operation: update if exists, insert if new
                result = await devices_collection.update_one(
                    {"ip_address": device["ip_address"]},  # Filter
                    {
                        "$set": {
                            "mac_address": device["mac_address"],
                            "vendor": device["vendor"],
                            "last_seen": device["last_seen"],
                            "status": "active",
                            "is_gateway": device["is_gateway"],
                            "network_subnet": device.get("network_subnet"),
                        },
                        "$setOnInsert": {
                            "first_seen": device["last_seen"]
                        }
                    },
                    upsert=True  # Insert if not exists
                )
                
                if result.upserted_id:
                    logger.debug(f"Inserted new device: {device['ip_address']}")
                else:
                    logger.debug(f"Updated existing device: {device['ip_address']}")
            
            logger.info(f"Stored {len(devices)} devices in database")
            
        except Exception as e:
            logger.error(f"Failed to store devices in database: {e}")
            raise
    
    async def _deactivate_foreign_devices(self) -> int:
        """
        Mark devices from OTHER subnets (not the current network) as inactive.
        This prevents stale devices from previous networks from cluttering the dashboard.
        
        Returns:
            Number of devices marked as inactive
        """
        try:
            db = get_database()
            devices_collection = db.devices
            
            if not self.network_range:
                return 0
            
            result = await devices_collection.update_many(
                {
                    "network_subnet": {"$ne": self.network_range},
                    "status": "active",
                },
                {
                    "$set": {"status": "inactive"}
                }
            )
            
            count = result.modified_count
            if count > 0:
                logger.info(f"Marked {count} devices from other subnets as inactive")
            
            return count
            
        except Exception as e:
            logger.error(f"Failed to deactivate foreign devices: {e}")
            return 0
    
    def _validate_device(self, device: Dict[str, Any]) -> bool:
        """
        Validate device data before storing in database.
        
        Args:
            device: Device dictionary to validate
            
        Returns:
            True if valid, False otherwise
        """
        try:
            # Validate IP address format
            ip_pattern = r"^(\d{1,3}\.){3}\d{1,3}$"
            if not re.match(ip_pattern, device.get("ip_address", "")):
                logger.warning(f"Invalid IP address format: {device.get('ip_address')}")
                return False
            
            # Validate IP octets are in range 0-255
            octets = device["ip_address"].split(".")
            for octet in octets:
                if not (0 <= int(octet) <= 255):
                    logger.warning(f"IP octet out of range: {device['ip_address']}")
                    return False
            
            # Validate MAC address format
            mac_pattern = r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$"
            if not re.match(mac_pattern, device.get("mac_address", "")):
                logger.warning(f"Invalid MAC address format: {device.get('mac_address')}")
                return False
            
            # Validate status field
            if device.get("status") not in ["active", "inactive"]:
                logger.warning(f"Invalid status: {device.get('status')}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False
    
    async def update_device_status(self) -> int:
        """
        Update device status based on last_seen timestamp.
        Mark devices as inactive if not seen for more than 5 minutes.
        
        Returns:
            Number of devices marked as inactive
            
        Raises:
            Exception: If database operation fails
        """
        try:
            db = get_database()
            devices_collection = db.devices
            
            # Calculate threshold time (5 minutes ago)
            from datetime import timedelta
            threshold_time = datetime.now(timezone.utc) - timedelta(minutes=5)
            
            # Update devices not seen for more than 5 minutes
            result = await devices_collection.update_many(
                {
                    "last_seen": {"$lt": threshold_time},
                    "status": "active"
                },
                {
                    "$set": {"status": "inactive"}
                }
            )
            
            count = result.modified_count
            if count > 0:
                logger.info(f"Marked {count} devices as inactive")
            
            return count
            
        except Exception as e:
            logger.error(f"Failed to update device status: {e}")
            raise
