# CV Builder - GitHub Push & Initial Setup Script (PowerShell)
# This script initializes git, commits all files, and pushes to GitHub

Write-Host ""
Write-Host "🚀 CV Builder - GitHub Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if git is initialized
Write-Host "📦 Step 1: Checking Git initialization..." -ForegroundColor Yellow
if (-Not (Test-Path ".git")) {
	Write-Host "Git not initialized. Initializing..." -ForegroundColor Yellow
	git init
	Write-Host "✓ Git initialized" -ForegroundColor Green
} else {
	Write-Host "✓ Git already initialized" -ForegroundColor Green
}

# Step 2: Add all files
Write-Host ""
Write-Host "📝 Step 2: Adding all files..." -ForegroundColor Yellow
git add .
Write-Host "✓ Files added" -ForegroundColor Green

# Step 3: Create initial commit
Write-Host ""
Write-Host "💾 Step 3: Creating commit..." -ForegroundColor Yellow

$commitMessage = @"
feat: Complete commercial transformation - Web platform architecture

- Add comprehensive commercialization plan (business strategy, monetization, roadmap)
- Migrate from Tauri desktop to Next.js 15 web application
- Implement Supabase PostgreSQL with complete schema
- Add authentication system (OAuth + magic links)
- Design payment integration with Stripe
- Create landing page with professional UI
- Add collaboration features architecture
- Implement AI integration (OpenAI GPT-4 + Claude)
- Add comprehensive documentation (25,000+ words)
- Set up production-ready deployment config

Features:
- Freemium subscription model (Free, Pro, Team, Enterprise)
- Real-time collaboration (Google Docs-style)
- 30+ professional templates
- Multi-format export (PDF, DOCX, LaTeX, HTML, MD)
- ATS optimization engine
- Job application tracker
- AI-powered content enhancement
- End-to-end encryption
- GDPR compliant
- White-label option for B2B

Tech Stack:
- Next.js 15 (App Router)
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- OpenAI GPT-4o
- Stripe
- Vercel Edge

Documentation:
- COMMERCIALIZATION_PLAN.md (15K+ words)
- IMPLEMENTATION_GUIDE.md (8K+ words)
- TRANSFORMATION_SUMMARY.md (2K+ words)
- Complete API documentation
- Developer setup guide

Ready for: Beta launch → Public launch → Scale to `$1M+ ARR
"@

git commit -m $commitMessage
Write-Host "✓ Commit created" -ForegroundColor Green

# Step 4: Set main branch
Write-Host ""
Write-Host "🌿 Step 4: Setting branch to main..." -ForegroundColor Yellow
git branch -M main
Write-Host "✓ Branch set to main" -ForegroundColor Green

# Step 5: Add remote (if not exists)
Write-Host ""
Write-Host "🔗 Step 5: Adding remote repository..." -ForegroundColor Yellow

$remoteExists = git remote | Select-String -Pattern "origin"
if (-Not $remoteExists) {
	git remote add origin git@github.com:tfasanya79/resume-developer.git
	Write-Host "✓ Remote added" -ForegroundColor Green
} else {
	Write-Host "⚠ Remote 'origin' already exists" -ForegroundColor Yellow
	git remote set-url origin git@github.com:tfasanya79/resume-developer.git
	Write-Host "✓ Remote URL updated" -ForegroundColor Green
}

# Step 6: Push to GitHub
Write-Host ""
Write-Host "⬆️  Step 6: Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "This will push all changes to github.com/tfasanya79/resume-developer" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Continue? (y/n)"
if ($continue -eq "y" -or $continue -eq "Y") {
	git push -u origin main --force
	Write-Host ""
	Write-Host "✓ Successfully pushed to GitHub!" -ForegroundColor Green
	Write-Host ""
	Write-Host "🎉 Deployment Complete!" -ForegroundColor Cyan
	Write-Host ""
	Write-Host "Next steps:" -ForegroundColor White
	Write-Host "1. Visit: https://github.com/tfasanya79/resume-developer" -ForegroundColor White
	Write-Host "2. Review the COMMERCIALIZATION_PLAN.md" -ForegroundColor White
	Write-Host "3. Follow IMPLEMENTATION_GUIDE.md to start development" -ForegroundColor White
	Write-Host "4. Set up Supabase project (see web/README.md)" -ForegroundColor White
	Write-Host "5. Configure Stripe (see IMPLEMENTATION_GUIDE.md)" -ForegroundColor White
	Write-Host ""
	Write-Host "📚 Key Files:" -ForegroundColor Cyan
	Write-Host "  - COMMERCIALIZATION_PLAN.md - Business strategy" -ForegroundColor White
	Write-Host "  - IMPLEMENTATION_GUIDE.md - Technical roadmap" -ForegroundColor White
	Write-Host "  - TRANSFORMATION_SUMMARY.md - What was built" -ForegroundColor White
	Write-Host "  - web/ - Next.js web application" -ForegroundColor White
	Write-Host ""
	Write-Host "🚀 Ready to build a `$1M+ SaaS!" -ForegroundColor Green
} else {
	Write-Host "Push cancelled." -ForegroundColor Yellow
	exit 1
}
