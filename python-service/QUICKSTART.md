# Quick Start Guide - Python Service

## Prerequisites

- Python 3.9+ installed
- MongoDB running on localhost:27017
- Administrator/root privileges (required for network operations)

## Installation Steps

### Option 1: Automated Setup (Recommended)

**Windows:**
```bash
# Run as Administrator
setup.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

1. **Create virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your settings
   ```

4. **Start the service:**
   ```bash
   # Windows (as Administrator)
   python main.py
   
   # Linux/Mac (with sudo)
   sudo venv/bin/python main.py
   ```

## Verify Installation

Once the service is running, open your browser to:
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

You should see:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

## Common Issues

### 1. Permission Denied
**Problem:** Cannot create raw sockets
**Solution:** Run with administrator/root privileges

### 2. MongoDB Connection Failed
**Problem:** Cannot connect to MongoDB
**Solution:** 
- Ensure MongoDB is running: `mongod --version`
- Check MONGODB_URL in .env file
- Start MongoDB: `mongod` or `sudo systemctl start mongod`

### 3. Module Not Found
**Problem:** Python modules not found
**Solution:** 
- Activate virtual environment first
- Reinstall dependencies: `pip install -r requirements.txt`

