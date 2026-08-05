#!/bin/bash

# CV Builder - VPS Deployment Script for Hostinger
# Run this on your VPS after cloning the repository

set -e  # Exit on any error

echo "🚀 CV Builder - VPS Deployment Starting..."
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
	echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
	echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
	echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
	print_error "Please do not run as root. Use a regular user with sudo privileges."
	exit 1
fi

# Step 1: Check prerequisites
echo "Step 1: Checking system..."
print_status "Updating package lists..."
sudo apt update

# Step 2: Install Node.js if not present
if ! command -v node &> /dev/null; then
	print_warning "Node.js not found. Installing Node.js 18.x..."
	curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
	sudo apt install -y nodejs
	print_status "Node.js installed: $(node --version)"
else
	print_status "Node.js already installed: $(node --version)"
fi

# Step 3: Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
	print_warning "PM2 not found. Installing PM2..."
	sudo npm install -g pm2
	print_status "PM2 installed"
else
	print_status "PM2 already installed"
fi

# Step 4: Install Nginx if not present
if ! command -v nginx &> /dev/null; then
	print_warning "Nginx not found. Installing Nginx..."
	sudo apt install -y nginx
	print_status "Nginx installed"
else
	print_status "Nginx already installed"
fi

# Step 5: Navigate to project
echo ""
echo "Step 2: Setting up project..."
cd /resume-developer/web || { print_error "Project directory not found!"; exit 1; }
print_status "In directory: $(pwd)"

# Step 6: Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Step 7: Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
	print_warning "Creating .env.local file..."
	cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://187.55.230.139
NODE_ENV=production
EOF
	print_status ".env.local created. Please edit with real credentials!"
	print_warning "Run: nano /resume-developer/web/.env.local"
else
	print_status ".env.local already exists"
fi

# Step 8: Build the application
echo ""
echo "Step 3: Building application..."
print_status "Running production build..."
npm run build

# Step 9: Stop existing PM2 process if running
echo ""
echo "Step 4: Setting up PM2..."
if pm2 list | grep -q "cv-builder"; then
	print_warning "Stopping existing cv-builder process..."
	pm2 delete cv-builder
fi

# Step 10: Start with PM2
print_status "Starting application with PM2..."
pm2 start npm --name "cv-builder" -- start
pm2 save

# Step 11: Setup PM2 startup
print_status "Configuring PM2 to start on boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# Step 12: Configure Nginx
echo ""
echo "Step 5: Configuring Nginx..."

NGINX_CONFIG="/etc/nginx/sites-available/cv-builder"
if [ ! -f "$NGINX_CONFIG" ]; then
	print_status "Creating Nginx configuration..."
	sudo tee $NGINX_CONFIG > /dev/null << 'EOF'
server {
	listen 80;
	server_name 187.55.230.139;

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
EOF
	print_status "Nginx configuration created"
else
	print_status "Nginx configuration already exists"
fi

# Enable site
if [ ! -L /etc/nginx/sites-enabled/cv-builder ]; then
	print_status "Enabling site..."
	sudo ln -s /etc/nginx/sites-available/cv-builder /etc/nginx/sites-enabled/
fi

# Remove default site if it exists
if [ -L /etc/nginx/sites-enabled/default ]; then
	print_warning "Removing default Nginx site..."
	sudo rm /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Restart Nginx
print_status "Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Step 13: Configure firewall
echo ""
echo "Step 6: Configuring firewall..."
if command -v ufw &> /dev/null; then
	print_status "Configuring UFW firewall..."
	sudo ufw allow 'Nginx Full'
	sudo ufw allow OpenSSH
	sudo ufw --force enable
else
	print_warning "UFW not installed. Skipping firewall configuration."
fi

# Step 14: Final checks
echo ""
echo "Step 7: Running final checks..."
print_status "Checking if app is responding..."
sleep 3  # Give app time to start

if curl -f http://localhost:3000 > /dev/null 2>&1; then
	print_status "Application is responding on port 3000"
else
	print_error "Application not responding on port 3000"
	print_warning "Check logs with: pm2 logs cv-builder"
fi

# Show status
echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Access your application:"
echo "   - Local: http://localhost:3000"
echo "   - External: http://187.55.230.139"
echo ""
echo "📝 Important Next Steps:"
echo "   1. Edit environment variables: nano /resume-developer/web/.env.local"
echo "   2. Set up Supabase project: https://supabase.com"
echo "   3. Get OpenAI API key: https://openai.com"
echo "   4. Restart app after config: pm2 restart cv-builder"
echo ""
echo "📚 Useful Commands:"
echo "   - View logs: pm2 logs cv-builder"
echo "   - Restart app: pm2 restart cv-builder"
echo "   - Stop app: pm2 stop cv-builder"
echo "   - App status: pm2 status"
echo "   - Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "🔒 Security Reminder:"
echo "   - Change default SSH port"
echo "   - Set up SSL certificate (certbot)"
echo "   - Configure regular backups"
echo ""
print_status "Deployment script completed successfully!"
