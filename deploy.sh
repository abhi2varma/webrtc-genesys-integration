#!/bin/bash

# ================================================
# WebRTC Genesys Deployment Script
# For deploying to internet server
# ================================================

set -e  # Exit on error

echo "================================================"
echo "WebRTC Genesys - Deployment Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/webrtc"
APP_NAME="webrtc-app"
DOMAIN=""
EMAIL=""

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Ask for configuration
read -p "Enter your domain name (e.g., webrtc.yourcompany.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    print_error "Domain and email are required"
    exit 1
fi

echo ""
print_info "Deployment Configuration:"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo "  App Directory: $APP_DIR"
echo ""
read -p "Continue with deployment? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    print_warning "Deployment cancelled"
    exit 0
fi

echo ""
echo "================================================"
echo "Step 1: Installing Dependencies"
echo "================================================"

# Update system
print_info "Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

# Install Node.js
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt install -y nginx
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi

# Install Certbot
if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_success "Certbot already installed"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

echo ""
echo "================================================"
echo "Step 2: Setting Up Application"
echo "================================================"

# Create app directory
if [ ! -d "$APP_DIR" ]; then
    print_info "Creating application directory..."
    mkdir -p $APP_DIR
    print_success "Directory created"
fi

# Copy files
print_info "Copying application files..."
cp -r ./* $APP_DIR/
cd $APP_DIR

# Install npm dependencies
print_info "Installing npm dependencies..."
npm install --production
print_success "Dependencies installed"

# Create .env file
print_info "Creating .env configuration..."
if [ ! -f "$APP_DIR/.env" ]; then
    cat > $APP_DIR/.env << EOF
PORT=3000
NODE_ENV=production
APP_DOMAIN=$DOMAIN

GENESYS_WEBSOCKET_SERVER=wss://192.168.1.100:8443/ws
GENESYS_SIP_SERVER=192.168.1.100
GENESYS_SIP_PORT=5060
GENESYS_REALM=yourcompany.local
GENESYS_TENANT=your-tenant

STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=
TURN_USERNAME=
TURN_CREDENTIAL=

ALLOWED_ORIGINS=https://$DOMAIN
SESSION_SECRET=$(openssl rand -base64 32)

SSL_KEY=/etc/letsencrypt/live/$DOMAIN/privkey.pem
SSL_CERT=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
EOF
    print_success ".env file created"
    print_warning "IMPORTANT: Edit $APP_DIR/.env with your Genesys and TURN server configuration!"
else
    print_warning ".env file already exists, skipping creation"
fi

echo ""
echo "================================================"
echo "Step 3: Configuring Nginx"
echo "================================================"

# Create Nginx configuration
print_info "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/webrtc << 'NGINX_EOF'
upstream webrtc_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 50M;

    location / {
        proxy_pass http://webrtc_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://webrtc_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    access_log /var/log/nginx/webrtc_access.log;
    error_log /var/log/nginx/webrtc_error.log;
}
NGINX_EOF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/webrtc

# Enable site
ln -sf /etc/nginx/sites-available/webrtc /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
print_success "Nginx configured"

echo ""
echo "================================================"
echo "Step 4: Obtaining SSL Certificate"
echo "================================================"

# Restart Nginx
systemctl restart nginx

# Get SSL certificate
print_info "Obtaining SSL certificate from Let's Encrypt..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained"
else
    print_error "Failed to obtain SSL certificate"
    print_warning "You may need to configure DNS and try again: certbot --nginx -d $DOMAIN"
fi

echo ""
echo "================================================"
echo "Step 5: Starting Application"
echo "================================================"

# Stop existing PM2 process if running
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start application with PM2
print_info "Starting application with PM2..."
cd $APP_DIR
pm2 start server.js --name $APP_NAME --log /var/log/webrtc-app.log

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup systemd -u root --hp /root
print_success "Application started"

echo ""
echo "================================================"
echo "Step 6: Configuring Firewall"
echo "================================================"

# Configure UFW firewall
if command -v ufw &> /dev/null; then
    print_info "Configuring firewall..."
    ufw --force enable
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw allow 3478/tcp comment 'TURN TCP'
    ufw allow 3478/udp comment 'TURN UDP'
    ufw allow 49152:65535/udp comment 'WebRTC/TURN ports'
    print_success "Firewall configured"
else
    print_warning "UFW not installed, skipping firewall configuration"
fi

echo ""
echo "================================================"
echo "Step 7: Setup Complete!"
echo "================================================"
echo ""
print_success "Deployment completed successfully!"
echo ""
print_info "Your WebRTC application is now running at:"
echo "  🌐 https://$DOMAIN"
echo ""
print_info "API Endpoints:"
echo "  📡 https://$DOMAIN/api/health"
echo "  ⚙️  https://$DOMAIN/api/config"
echo "  📊 https://$DOMAIN/api/stats"
echo ""
print_warning "IMPORTANT: Next Steps"
echo ""
echo "1. Edit configuration file:"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. Update these settings:"
echo "   - GENESYS_WEBSOCKET_SERVER (your Genesys WebSocket URL)"
echo "   - GENESYS_SIP_SERVER (your Genesys SIP server)"
echo "   - GENESYS_REALM (your Genesys realm)"
echo "   - TURN_SERVER, TURN_USERNAME, TURN_CREDENTIAL"
echo ""
echo "3. Restart the application:"
echo "   pm2 restart $APP_NAME"
echo ""
echo "4. View logs:"
echo "   pm2 logs $APP_NAME"
echo "   tail -f /var/log/nginx/webrtc_access.log"
echo ""
echo "5. Check status:"
echo "   pm2 status"
echo "   systemctl status nginx"
echo ""
print_info "For VPN setup, see DEPLOYMENT_INTERNET.md"
print_info "For TURN server setup, see DEPLOYMENT_INTERNET.md"
echo ""
echo "================================================"


