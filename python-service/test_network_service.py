"""
Test script for NetworkService class.
Tests basic functionality without requiring actual network scanning.
"""

import asyncio
import sys
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, '.')

from services.network_service import NetworkService


async def test_mac_vendor_lookup():
    """Test MAC vendor lookup functionality."""
    print("\n=== Testing MAC Vendor Lookup ===")
    
    service = NetworkService()
    
    test_cases = [
        ("00:50:56:12:34:56", "VMware"),
        ("08:00:27:ab:cd:ef", "VirtualBox"),
        ("B8:27:EB:11:22:33", "Raspberry Pi"),
        ("00:1A:7D:44:55:66", "Cisco"),
        ("FF:FF:FF:FF:FF:FF", "Unknown"),
    ]
    
    for mac, expected_vendor in test_cases:
        vendor = await service.get_mac_vendor(mac)
        status = "✓" if vendor == expected_vendor else "✗"
        print(f"{status} MAC: {mac} -> Vendor: {vendor} (expected: {expected_vendor})")


async def test_gateway_detection():
    """Test gateway IP detection."""
    print("\n=== Testing Gateway Detection ===")
    
    service = NetworkService()
    
    try:
        gateway_ip = await service.get_gateway_ip()
        print(f"✓ Detected gateway IP: {gateway_ip}")
    except Exception as e:
        print(f"✗ Failed to detect gateway: {e}")


async def test_device_validation():
    """Test device data validation."""
    print("\n=== Testing Device Validation ===")
    
    service = NetworkService()
    
    test_devices = [
        # Valid device
        {
            "ip_address": "192.168.1.100",
            "mac_address": "00:50:56:12:34:56",
            "vendor": "VMware",
            "status": "active",
            "last_seen": datetime.now(timezone.utc),
            "is_gateway": False
        },
        # Invalid IP format
        {
            "ip_address": "192.168.1",
            "mac_address": "00:50:56:12:34:56",
            "vendor": "VMware",
            "status": "active",
            "last_seen": datetime.now(timezone.utc),
            "is_gateway": False
        },
        # Invalid IP octet (256)
        {
            "ip_address": "192.168.1.256",
            "mac_address": "00:50:56:12:34:56",
            "vendor": "VMware",
            "status": "active",
            "last_seen": datetime.now(timezone.utc),
            "is_gateway": False
        },
        # Invalid MAC format
        {
            "ip_address": "192.168.1.100",
            "mac_address": "00:50:56:12:34",
            "vendor": "VMware",
            "status": "active",
            "last_seen": datetime.now(timezone.utc),
            "is_gateway": False
        },
        # Invalid status
        {
            "ip_address": "192.168.1.100",
            "mac_address": "00:50:56:12:34:56",
            "vendor": "VMware",
            "status": "unknown",
            "last_seen": datetime.now(timezone.utc),
            "is_gateway": False
        },
    ]
    
    expected_results = [True, False, False, False, False]
    
    for i, device in enumerate(test_devices):
        is_valid = service._validate_device(device)
        expected = expected_results[i]
        status = "✓" if is_valid == expected else "✗"
        print(f"{status} Device {i+1}: Valid={is_valid} (expected: {expected})")
        if is_valid != expected:
            print(f"   Device: {device}")


async def main():
    """Run all tests."""
    print("=" * 60)
    print("NetworkService Test Suite")
    print("=" * 60)
    
    try:
        await test_mac_vendor_lookup()
        await test_gateway_detection()
        await test_device_validation()
        
        print("\n" + "=" * 60)
        print("Test suite completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
