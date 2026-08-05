# VPS Deployment Guide - Hostinger Cloud

## Server Details
- **IP**: 187.55.230.139
- **User**: dev-1
- **Project Path**: /resume-developer
- **Purpose**: Testing/Staging environment

---

## Quick Deployment Steps

### 1. Connect to VPS & Verify Setup
```bash
ssh dev-1@187.55.230.139
cd /resume-developer
pwd  # Should show: /home/dev-1/resume-developer or similar
ls -la  # Verify files are there
```

### 2. Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be v9.x.x

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx (Reverse Proxy)
sudo apt install -y nginx

# Install certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Navigate to Web Directory & Install Dependencies
```bash
cd /resume-developer/web
npm install
```

### 4. Set Up Environment Variables
```bash
# Create .env.local file
nano .env.local
```

**Add this content** (you'll need to get actual keys):
```env
# Supabase (you need to create a project at supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (get from openai.com)
OPENAI_API_KEY=sk-your-openai-key

# Stripe (get from stripe.com - use test keys for now)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://187.55.230.139
NODE_ENV=production
```

**Save**: `Ctrl+X`, then `Y`, then `Enter`

### 5. Build the Application
```bash
cd /resume-developer/web
npm run build
```

### 6. Set Up PM2 to Run the App
```bash
# Start the application with PM2
cd /resume-developer/web
pm2 start npm --name "cv-builder" -- start

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
# Follow the command it outputs (copy-paste and run)

# Check status
pm2 status
pm2 logs cv-builder  # View logs
```

### 7. Configure Nginx Reverse Proxy
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/cv-builder
```

**Add this configuration**:
```nginx
server {
	listen 80;
	server_name 187.55.230.139;

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
	}
}
```

**Save**: `Ctrl+X`, then `Y`, then `Enter`

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/cv-builder /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### 8. Configure Firewall
```bash
# Allow Nginx through firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

### 9. Test the Deployment
```bash
# Check if app is running
curl http://localhost:3000

# Check from outside
# Open browser: http://187.55.230.139
```

---

## Optional: Set Up Domain & SSL

If you have a domain (e.g., cvbuilder.yourdomain.com):

### 1. Point Domain to VPS
In your domain registrar's DNS settings:
```
A Record: cvbuilder.yourdomain.com → 187.55.230.139
```

### 2. Update Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/cv-builder
```

Change `server_name`:
```nginx
server_name cvbuilder.yourdomain.com;
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Install SSL Certificate
```bash
sudo certbot --nginx -d cvbuilder.yourdomain.com
```

Follow the prompts. Certbot will:
- Obtain SSL certificate
- Auto-configure Nginx
- Set up auto-renewal

---

## Useful PM2 Commands

```bash
# View logs
pm2 logs cv-builder

# Restart app
pm2 restart cv-builder

# Stop app
pm2 stop cv-builder

# Delete app from PM2
pm2 delete cv-builder

# Monitor resources
pm2 monit

# List all apps
pm2 list
```

---

## Troubleshooting

### App Won't Start
```bash
# Check PM2 logs
pm2 logs cv-builder --lines 100

# Check if dependencies are installed
cd /resume-developer/web
npm install

# Try running manually to see errors
npm run dev
```

### Nginx Issues
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if Nginx is running
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx
```

### Port Already in Use
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Restart your app
pm2 restart cv-builder
```

### Out of Memory
```bash
# Check memory usage
free -h

# Increase Node.js memory limit
pm2 delete cv-builder
pm2 start npm --name "cv-builder" --node-args="--max-old-space-size=2048" -- start
pm2 save
```

---

## Environment Setup Checklist

Before deployment works fully, you need:

- [ ] Supabase project created
  - Go to https://supabase.com
  - Create new project
  - Run migrations from `web/supabase/migrations/`
  - Get API keys

- [ ] OpenAI API key
  - Go to https://openai.com
  - Create account
  - Generate API key
  - Add credits ($5-10 for testing)

- [ ] Stripe account (optional for testing)
  - Go to https://stripe.com
  - Get test API keys
  - Can skip for initial testing

---

## Quick Test Without External Services

For immediate testing without Supabase/OpenAI:

```bash
# Create minimal .env.local
cd /resume-developer/web
cat > .env.local << EOF
NEXT_PUBLIC_APP_URL=http://187.55.230.139
NODE_ENV=production
EOF

# Build and start
npm run build
pm2 start npm --name "cv-builder" -- start
```

The app will work but some features (auth, AI) won't function until you add real keys.

---

## Monitoring & Maintenance

```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU/Load
top

# Check app status
pm2 status

# View app metrics
pm2 monit

# Restart app on file changes (development)
pm2 restart cv-builder --watch
```

---

## Security Best Practices

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Set up automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Change SSH port (optional)
sudo nano /etc/ssh/sshd_config
# Change: Port 22 → Port 2222
sudo systemctl restart sshd

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd

# Set up fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

---

## Access Your Deployment

After setup:
- **HTTP**: http://187.55.230.139
- **With Domain**: http://cvbuilder.yourdomain.com
- **With SSL**: https://cvbuilder.yourdomain.com

---

## Next Steps After Testing

1. **Get actual API keys** (Supabase, OpenAI, Stripe)
2. **Set up domain** for professional URL
3. **Install SSL certificate** (Let's Encrypt)
4. **Configure backups** for database/uploads
5. **Set up monitoring** (UptimeRobot, etc.)
6. **Optimize performance** (caching, CDN)
7. **Scale resources** if needed

---

Ready to start? Let's do it step by step!
