# Network Visibility Dashboard with MITM Simulation

> **⚠️ EDUCATIONAL PURPOSE ONLY**  
> This project is designed for controlled lab environments and cybersecurity education. Unauthorized network monitoring or MITM attacks are illegal. Use only in private, isolated lab networks with proper authorization.

## 📋 Project Overview

A web-based educational cybersecurity tool that demonstrates network visibility and Man-in-the-Middle (MITM) simulation concepts in a controlled environment. This project showcases practical knowledge of network monitoring, ethical hacking techniques, and full-stack development.

### Key Features

- **Real-time Network Discovery**: ARP scanning to detect devices on local network
- **Device Monitoring Dashboard**: Clean, responsive interface showing connected devices
- **MITM Simulation**: Educational ARP spoofing demonstration for traffic observation
- **Bandwidth Monitoring**: Track data usage of selected devices during MITM
- **Historical Data**: MongoDB storage for device history and traffic logs

## 🎯 Learning Objectives

This project demonstrates:
- Network scanning techniques (ARP protocol)
- MITM attack vectors and detection
- Full-stack web development (Next.js + Python)
- RESTful API design
- Database integration (MongoDB)
- Security vulnerability awareness (XSS, SQL injection prevention)

## 🏗️ System Architecture (Hybrid Approach)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Application (Port 3000)              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Frontend (React Components)                   │ │
│  │  Dashboard • Device Table • MITM Panel • Traffic Logs     │ │
│  └───────────────────────────┬───────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │         Next.js API Routes (app/api/*)                     │ │
│  │  • /api/auth/*  • /api/devices/*  • /api/scan/*           │ │
│  │  • /api/mitm/*  (Proxy to Python service)                 │ │
│  └───────────────────────────┬───────────────────────────────┘ │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
        ┌───────────▼──────────┐   ┌─────────▼──────────┐
        │  Python Service      │   │   MongoDB          │
        │  (Port 8000)         │   │   Database         │
        │  ┌────────────────┐  │   │                    │
        │  │ Scapy Engine   │  │   │  • Devices         │
        │  │ • ARP Scan     │  │   │  • Traffic Logs    │
        │  │ • ARP Spoof    │  │   │  • Sessions        │
        │  │ • Sniffing     │  │   └────────────────────┘
        │  └────────────────┘  │
        └──────────────────────┘
```

**Architecture Type**: Hybrid Next.js + Python Microservice

- **Frontend & API Gateway**: Next.js (JavaScript/Node.js)
- **Network Operations**: Python service with Scapy
- **Database**: MongoDB (accessed from both layers)

## 🛠️ Technology Stack

### Frontend & API Layer
- **Next.js 14+** (JavaScript, App Router)
  - Frontend: React 18+ components
  - Backend: Next.js API Routes (app/api/*)
- **Tailwind CSS** (Responsive styling)
- **Node.js** (Runtime for Next.js)

### Python Microservice (Network Operations)
- **Python 3.8+**
- **FastAPI** (Lightweight REST API)
- **Scapy** (Network packet manipulation - requires Python)
- **APScheduler** (Background ARP scanning)

### Database
- **MongoDB** (NoSQL document store)
- **Mongoose** (Node.js ODM for Next.js API routes)
- **Motor** (Python async driver for Python service)

### Additional Libraries
- `mac-vendor-lookup` (Device manufacturer identification)
- `python-dotenv` (Python environment configuration)
- `child_process` (Node.js - spawn Python scripts)

### MongoDB Refresh Strategy

- **Background Scanning**: ARP scan runs every 30 seconds via APScheduler
- **Device Status Update**: Devices not seen for 5 minutes marked as "inactive"
- **Traffic Aggregation**: Real-time updates during MITM, aggregated every 5 seconds
- **Historical Data**: Logs retained for 30 days (configurable)
- **Indexing**: Indexes on `ip_address`, `mac_address`, `timestamp` for fast queries

### Running the Application

#### Terminal 1 - Python Service (requires root)
```bash
cd python-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
sudo python main.py
# Python service runs on http://localhost:8000
```

#### Terminal 2 - Next.js Application
```bash
npm run dev
# Next.js runs on http://localhost:3000
# Includes both frontend and API routes
```

#### Terminal 3 - MongoDB
```bash
mongod --dbpath /path/to/data
# MongoDB runs on localhost:27017
```

### Access Dashboard
Open browser: `http://localhost:3000/dashboard`

## 📊 How It Works

### 1. **Network Scanning**
- Python service runs background ARP scan every 30 seconds
- Scapy sends ARP requests and captures responses
- Extracts IP, MAC, and vendor information
- Stores results in MongoDB

### 2. **Device Discovery Flow**
```
User opens dashboard (Next.js page)
  → Frontend calls GET /api/devices (Next.js API route)
  → Next.js API queries MongoDB directly
  → Returns device list with status
  → React renders DeviceTable component
  → Auto-refresh every 10 seconds
```

## 📄 License

Some sensative MITM Files are not included in thi repository but can be provided on demand on acknowledgments 
do Contact: https://maazansari.vercel.app
##  Acknowledgments

- Built for cybersecurity education and research
- Inspired by tools like Wireshark, Ettercap, and netdiscover
- Thanks to the Scapy and FastAPI communities

---

**Remember**: With great power comes great responsibility. Use this knowledge ethically and legally.
