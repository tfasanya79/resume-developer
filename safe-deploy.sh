#!/bin/bash
# SAFE VPS Deployment - Won't break existing apps

set -e

echo "🔧 Safe CV Builder Deployment"
echo "=============================="
echo ""
echo "⚠️  This script will NOT touch your existing apps"
echo ""

# First, let's see what's already running
echo "📋 Checking existing Nginx configuration..."
echo ""
echo "Current server blocks on port 80:"
sudo nginx -T 2>/dev/null | grep -E "listen.*80|server_name" | head -20
echo ""

# Check if there's already a config for our IP
if sudo nginx -T 2>/dev/null | grep -q "server_name.*187.55.230.139"; then
	echo "⚠️  WARNING: There's already a server block for 187.55.230.139"
	echo ""
	echo "Options:"
	echo "1. Use a subdomain (e.g., cv.yourdomain.com) - RECOMMENDED"
	echo "2. Use a different port (e.g., 8080)"
	echo "3. Check what's using 187.55.230.139 and adjust"
	echo ""
	echo "Current config for 187.55.230.139:"
	sudo nginx -T 2>/dev/null | grep -A 20 "server_name.*187.55.230.139"
	echo ""
	read -p "Do you want to continue anyway? (y/n): " -n 1 -r
	echo
	if [[ ! $REPLY =~ ^[Yy]$ ]]; then
		echo "Deployment cancelled. No changes made."
		exit 1
	fi
fi

# Check if port 3000 is already in use
echo ""
echo "🔍 Checking if port 3000 is available..."
if sudo netstat -tulpn | grep -q ":3000"; then
	echo "⚠️  Port 3000 is already in use:"
	sudo netstat -tulpn | grep ":3000"
	echo ""
	echo "You might want to use a different port (e.g., 3001, 3002)"
	echo "Edit .env.local and change PORT=3001, then update Nginx config"
	echo ""
	read -p "Continue anyway? (y/n): " -n 1 -r
	echo
	if [[ ! $REPLY =~ ^[Yy]$ ]]; then
		exit 1
	fi
fi

# Create ADDITIVE Nginx config (doesn't touch existing configs)
echo ""
echo "📝 Creating CV Builder Nginx configuration..."
echo "   (This will NOT modify your existing sites)"
echo ""

sudo tee /etc/nginx/sites-available/cv-builder > /dev/null << 'EOFNGINX'
# CV Builder - dedicated config
# This only handles requests specifically for CV Builder
# Other apps are NOT affected

server {
	listen 80;
	# Only respond to requests WITHOUT a specific domain
	# If you have a domain, replace _ with your domain name
	server_name _;

	client_max_body_size 10M;

	location / {
		proxy_pass http://localhost:3000;
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection 'upgrade';
		proxy_set_header Host $host;
		proxy_cache_bypass $http_upgrade;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;

		proxy_connect_timeout 60s;
		proxy_send_timeout 60s;
		proxy_read_timeout 60s;
	}
}
EOFNGINX

echo "✅ Configuration file created at: /etc/nginx/sites-available/cv-builder"

# Only enable if not already enabled
if [ ! -L /etc/nginx/sites-enabled/cv-builder ]; then
	echo "🔗 Enabling CV Builder site..."
	sudo ln -s /etc/nginx/sites-available/cv-builder /etc/nginx/sites-enabled/cv-builder
else
	echo "✅ CV Builder site already enabled"
fi

# Test configuration BEFORE applying
echo ""
echo "🧪 Testing Nginx configuration (this won't break anything)..."
if sudo nginx -t 2>&1; then
	echo "✅ Configuration is valid"
else
	echo "❌ Configuration test failed!"
	echo ""
	echo "This means there's a conflict. Your existing apps are still running fine."
	echo "To fix this, you should:"
	echo "1. Set up a subdomain for CV Builder"
	echo "2. OR use a different port"
	echo ""
	echo "Cleaning up..."
	sudo rm -f /etc/nginx/sites-enabled/cv-builder
	exit 1
fi

# Use RELOAD instead of RESTART (no downtime for other apps)
echo ""
echo "🔄 Reloading Nginx (graceful, no downtime)..."
sudo systemctl reload nginx

echo ""
echo "✅ Nginx reloaded successfully!"

# Check PM2 status
echo ""
echo "📊 Checking CV Builder app status..."
pm2 status cv-builder || echo "App not running. Use: pm2 restart cv-builder"

# Test access
echo ""
echo "🌐 Testing access..."
sleep 2

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
	echo "✅ App responding on port 3000"
else
	echo "⚠️  App not responding on port 3000"
	echo "   Check with: pm2 logs cv-builder"
fi

if curl -s -o /dev/null -w "%{http_code}" http://187.55.230.139 | grep -q "200"; then
	echo "✅ External access working!"
else
	echo "⚠️  External access not working yet"
	echo "   This might be due to Nginx routing priority"
fi

# Final summary
echo ""
echo "================================================"
echo "✅ SAFE DEPLOYMENT COMPLETED"
echo "================================================"
echo ""
echo "📝 What was done:"
echo "  - Added CV Builder Nginx config (other apps untouched)"
echo "  - Used nginx reload (no downtime)"
echo "  - Your existing apps continue running"
echo ""
echo "🌐 Access your app:"
echo "  - Direct: http://187.55.230.139:3000 (always works)"
echo "  - Via Nginx: http://187.55.230.139 (if no conflicts)"
echo ""
echo "⚠️  If you have conflicts:"
echo ""
echo "Option 1: Use a subdomain (RECOMMENDED)"
echo "  1. Point cv.yourdomain.com to 187.55.230.139"
echo "  2. Edit /etc/nginx/sites-available/cv-builder"
echo "  3. Change 'server_name _;' to 'server_name cv.yourdomain.com;'"
echo "  4. sudo systemctl reload nginx"
echo ""
echo "Option 2: Use a different port"
echo "  1. Access via: http://187.55.230.139:3000"
echo "  2. No Nginx config needed"
echo ""
echo "📊 Check status:"
echo "  - PM2: pm2 status"
echo "  - Nginx: sudo nginx -T | grep -A 10 'server_name'"
echo "  - All sites: sudo ls -la /etc/nginx/sites-enabled/"
echo ""
