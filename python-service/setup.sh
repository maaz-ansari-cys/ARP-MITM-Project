#!/bin/bash
# Setup script for Linux/Mac

echo "Creating Python virtual environment..."
python3 -m venv venv

echo ""
echo "Activating virtual environment..."
source venv/bin/activate

echo ""
echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "Setup complete!"
echo ""
echo "To activate the virtual environment in the future, run:"
echo "  source venv/bin/activate"
echo ""
echo "To start the service (requires root privileges):"
echo "  sudo venv/bin/python main.py"
echo ""
