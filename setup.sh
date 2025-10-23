#!/bin/bash

echo "========================================"
echo "WebRTC Genesys Integration Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please download and install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js version:"
node --version
echo ""

echo "NPM version:"
npm --version
echo ""

echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo ""

echo "Dependencies installed successfully!"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo ".env file created. Please edit it with your configuration."
    else
        echo "Creating default .env file..."
        cat > .env << EOF
PORT=3000
NODE_ENV=development

# Genesys Configuration
GENESYS_SIP_SERVER=sip.your-genesys-domain.com
GENESYS_SIP_PORT=5060
GENESYS_WEBSOCKET_SERVER=wss://your-genesys-domain.com:8443
GENESYS_REALM=your-realm
GENESYS_TENANT=your-tenant

# STUN/TURN Server
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=
TURN_USERNAME=
TURN_CREDENTIAL=

# Security
ALLOWED_ORIGINS=http://localhost:3000
EOF
        echo ".env file created with defaults."
    fi
    echo ""
    echo "IMPORTANT: Please edit .env file with your Genesys configuration!"
    echo ""
fi

# Make the script executable
chmod +x setup.sh

echo "========================================"
echo "Setup completed successfully!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'npm start' to start the server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "For detailed documentation, see README.md"
echo "For quick start guide, see QUICK_START.md"
echo "For Genesys setup, see GENESYS_SETUP.md"
echo ""



