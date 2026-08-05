#!/bin/bash
# Complete VPS Setup Script - Handles all edge cases

set -e

echo "🔧 Complete VPS Deployment Fix"
echo "=============================="

# Check what's already configured in Nginx
echo "📋 Checking existing Nginx configuration..."
sudo nginx -T 2>/dev/null | grep -A 10 "server_name.*187.55.230.139" || echo "No existing config found"

# Remove ALL existing configs that might conflict
echo "🧹 Cleaning up conflicting Nginx configs..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/cv-builder
sudo find /etc/nginx/sites-enabled/ -type l -delete
sudo find /etc/nginx/conf.d/ -name "*.conf" -delete 2>/dev/null || true

# Create fresh Nginx config
echo "📝 Creating fresh Nginx configuration..."
sudo tee /etc/nginx/sites-available/cv-builder > /dev/null << 'EOFNGINX'
server {
	listen 80 default_server;
	listen [::]:80 default_server;
	server_name 187.55.230.139 _;

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

		# Timeouts
		proxy_connect_timeout 60s;
		proxy_send_timeout 60s;
		proxy_read_timeout 60s;
	}
}
EOFNGINX

# Enable the site
echo "✅ Enabling site..."
sudo ln -sf /etc/nginx/sites-available/cv-builder /etc/nginx/sites-enabled/cv-builder

# Test configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

# Stop nginx first
echo "🛑 Stopping Nginx..."
sudo systemctl stop nginx || true
sleep 2

# Start nginx fresh
echo "🚀 Starting Nginx..."
sudo systemctl start nginx

# Check status
echo "📊 Checking Nginx status..."
sudo systemctl status nginx --no-pager -l || true

# Enable on boot
sudo systemctl enable nginx

# Check if app is actually running
echo ""
echo "🔍 Checking if Next.js app is running..."
if curl -s http://localhost:3000 > /dev/null; then
	echo "✅ Next.js app is running on port 3000"
else
	echo "❌ Next.js app NOT running on port 3000"
	echo "Checking PM2 status..."
	pm2 status
	echo ""
	echo "Restarting app..."
	cd ~/resume-developer/web
	pm2 restart cv-builder || pm2 start npm --name "cv-builder" -- start
fi

# Test external access
echo ""
echo "🌐 Testing external access..."
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://187.55.230.139 | grep -q "200"; then
	echo "✅ External access working!"
else
	echo "⚠️  External access test returned non-200 status"
fi

# Final status
echo ""
echo "================================================"
echo "✅ DEPLOYMENT COMPLETED!"
echo "================================================"
echo ""
echo "🌐 Your app should be accessible at:"
echo "   http://187.55.230.139"
echo ""
echo "📊 Quick checks:"
echo "   - PM2 status: pm2 status"
echo "   - PM2 logs: pm2 logs cv-builder"
echo "   - Nginx status: sudo systemctl status nginx"
echo "   - Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "🔧 If still not working:"
echo "   1. Check firewall: sudo ufw status"
echo "   2. Check if port 3000 is listening: sudo netstat -tulpn | grep 3000"
echo "   3. Check if port 80 is listening: sudo netstat -tulpn | grep :80"
echo ""
