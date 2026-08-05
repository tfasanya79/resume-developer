# 🚀 Quick VPS Deployment - Step by Step

## Your VPS Details
- **IP**: 187.55.230.139
- **User**: dev-1
- **Password**: @Cremo9039
- **Project**: /resume-developer

---

## 🎯 Quick Start (5 Minutes)

### Option 1: Automated Deployment (Recommended)

**From your local machine:**
```bash
ssh dev-1@187.55.230.139
# Enter password: @Cremo9039

# Navigate to project
cd /resume-developer

# Pull latest changes (including deployment script)
git pull

# Make script executable
chmod +x deploy-vps.sh

# Run automated deployment
./deploy-vps.sh
```

The script will automatically:
✅ Install Node.js, PM2, Nginx
✅ Install dependencies
✅ Build the application
✅ Configure Nginx reverse proxy
✅ Start the app with PM2
✅ Set up firewall rules

**After script completes:**
1. Edit `.env.local` with real API keys
2. Restart: `pm2 restart cv-builder`
3. Visit: http://187.55.230.139

---

### Option 2: Manual Deployment (If you want control)

**Step 1: Connect & Update**
```bash
ssh dev-1@187.55.230.139
sudo apt update && sudo apt upgrade -y
```

**Step 2: Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verify
```

**Step 3: Install PM2 & Nginx**
```bash
sudo npm install -g pm2
sudo apt install -y nginx
```

**Step 4: Setup Project**
```bash
cd /resume-developer
git pull  # Get latest code
cd web
npm install
```

**Step 5: Configure Environment**
```bash
nano .env.local
```

**Add minimum config:**
```env
NEXT_PUBLIC_APP_URL=http://187.55.230.139
NODE_ENV=production

# Add these when you have them:
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# OPENAI_API_KEY=
```

**Step 6: Build & Start**
```bash
npm run build
pm2 start npm --name "cv-builder" -- start
pm2 save
pm2 startup  # Run the command it outputs
```

**Step 7: Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/cv-builder
```

**Paste this:**
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
	}
}
```

**Enable and restart:**
```bash
sudo ln -s /etc/nginx/sites-available/cv-builder /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

**Step 8: Configure Firewall**
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

**Step 9: Test**
```bash
# Open browser: http://187.55.230.139
```

---

## 🔑 Getting API Keys (For Full Functionality)

The app will run without these, but features will be limited.

### 1. Supabase (Required for Auth & Database)
```bash
# Visit: https://supabase.com
# 1. Sign up / Log in
# 2. Click "New Project"
# 3. Choose organization
# 4. Project name: cv-builder-test
# 5. Database password: [save this]
# 6. Region: Choose closest to you
# 7. Click "Create Project" (takes ~2 min)

# After project is ready:
# 8. Go to Settings → API
# 9. Copy:
#    - Project URL (NEXT_PUBLIC_SUPABASE_URL)
#    - anon public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
#    - service_role key (SUPABASE_SERVICE_ROLE_KEY)

# 10. Go to SQL Editor
# 11. Copy content from: /resume-developer/web/supabase/migrations/001_initial_schema.sql
# 12. Paste and run it
```

### 2. OpenAI (Required for AI Features)
```bash
# Visit: https://openai.com
# 1. Sign up / Log in
# 2. Go to: https://platform.openai.com/api-keys
# 3. Click "Create new secret key"
# 4. Name: cv-builder-test
# 5. Copy key (starts with sk-...)
# 6. Add $10 credits: Settings → Billing → Add payment method
```

### 3. Stripe (Optional - for payments)
```bash
# Visit: https://stripe.com
# 1. Sign up / Log in
# 2. Toggle "Test mode" ON (top right)
# 3. Go to: Developers → API Keys
# 4. Copy:
#    - Publishable key (pk_test_...)
#    - Secret key (sk_test_...)
```

---

## 📝 Update Environment & Restart

After getting API keys:

```bash
ssh dev-1@187.55.230.139
cd /resume-developer/web
nano .env.local
```

**Update with real keys:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# App
NEXT_PUBLIC_APP_URL=http://187.55.230.139
NODE_ENV=production
```

**Save and restart:**
```bash
pm2 restart cv-builder
pm2 logs cv-builder  # Check for errors
```

---

## 🛠️ Useful Commands

```bash
# View app logs
pm2 logs cv-builder

# Check app status
pm2 status

# Restart app
pm2 restart cv-builder

# Stop app
pm2 stop cv-builder

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check if app is running on port 3000
curl http://localhost:3000

# Check from outside
# Browser: http://187.55.230.139
```

---

## 🔍 Troubleshooting

### App not accessible from browser?
```bash
# Check if app is running
pm2 status

# Check logs
pm2 logs cv-builder --lines 50

# Check if port 3000 is listening
sudo netstat -tulpn | grep 3000

# Check Nginx
sudo systemctl status nginx
sudo nginx -t
```

### "Cannot find module" error?
```bash
cd /resume-developer/web
npm install
pm2 restart cv-builder
```

### Build fails?
```bash
# Check Node version (needs 18+)
node --version

# Clear cache and rebuild
rm -rf .next
npm run build
```

### Out of memory?
```bash
# Check memory
free -h

# Restart with more memory
pm2 delete cv-builder
pm2 start npm --name "cv-builder" --node-args="--max-old-space-size=2048" -- start
pm2 save
```

---

## 🎉 Success Checklist

- [ ] SSH into VPS successfully
- [ ] Git pull latest code
- [ ] Run deployment script OR complete manual steps
- [ ] App builds without errors
- [ ] PM2 shows "cv-builder" as "online"
- [ ] Can access http://187.55.230.139 in browser
- [ ] Landing page loads
- [ ] (Optional) Set up Supabase
- [ ] (Optional) Add OpenAI key
- [ ] (Optional) Configure Stripe

---

## 🚀 What's Next?

### For Testing
1. ✅ App is now live on http://187.55.230.139
2. Test the landing page
3. Add API keys for full functionality
4. Test CV builder features

### For Production (Later)
1. Get a domain name (e.g., cvbuilder.com)
2. Point domain to VPS
3. Install SSL certificate (Let's Encrypt)
4. Set up backups
5. Configure monitoring

---

## 📞 Need Help?

**Common issues:**
- **Port 3000 in use**: `sudo lsof -i :3000` then kill process
- **Nginx not working**: Check `/var/log/nginx/error.log`
- **App crashes**: Check `pm2 logs cv-builder`
- **Can't access from outside**: Check firewall `sudo ufw status`

**Check the full guide**: `VPS_DEPLOYMENT_GUIDE.md`

---

Good luck! 🎉 Your app should be live in minutes!
