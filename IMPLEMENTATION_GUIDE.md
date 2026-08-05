# 🚀 Implementation Guide - CV Builder Web Migration

## Overview
This guide covers the step-by-step migration from Tauri desktop app to Next.js web platform.

---

## Phase 1: Setup & Infrastructure (Week 1)

### 1.1 Create Supab<br/>ase Project
```bash
# Navigate to web directory
cd web

# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize Supabase project
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### 1.2 Environment Setup
Create `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Anthropic (backup AI)
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 1.3 Install Dependencies
```bash
cd web
npm install
```

---

## Phase 2: Core Migration (Week 1-2)

### 2.1 Data Model Migration

**Tauri SQLite → Supabase PostgreSQL**

| Old (Tauri) | New (Supabase) | Migration Notes |
|-------------|----------------|-----------------|
| `cv_profiles` table | `public.cv_profiles` | Add `user_id`, convert to JSONB |
| Local file storage | Supabase Storage | Upload to `cv-exports` bucket |
| Ollama integration | OpenAI API + local fallback | Keep Ollama optional |

### 2.2 API Migration

**Rust Commands → Next.js API Routes**

```
src-tauri/src/commands/save_cv()  →  app/api/cv/route.ts POST
src-tauri/src/commands/load_cv()  →  app/api/cv/[id]/route.ts GET
src-tauri/src/commands/delete_cv() →  app/api/cv/[id]/route.ts DELETE
```

### 2.3 Component Migration

**React Components** (mostly reusable!)

```
✅ src/components/PersonalInfoForm.tsx → Keep as-is
✅ src/components/ExperienceEditor.tsx → Keep as-is
✅ src/components/SkillsEditor.tsx → Keep as-is
✅ src/components/CvPreview.tsx → Migrate to @react-pdf/renderer
✅ src/templates/cv/* → Keep, adapt for server-side rendering
```

**State Management**

```
src/state/useCvStore.ts → Migrate to Zustand + React Query
```

---

## Phase 3: Authentication (Week 2)

### 3.1 Supabase Auth Setup

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 3.2 Auth Pages
- `/login` - Email + Social OAuth (Google, GitHub, LinkedIn)
- `/signup` - Registration with email verification
- `/auth/callback` - OAuth callback handler
- `/onboarding` - Initial setup wizard

### 3.3 Protected Routes
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: Request) {
  // Check auth status
  // Redirect to /login if unauthenticated
}
```

---

## Phase 4: Payment Integration (Week 3)

### 4.1 Stripe Setup

**Products to Create in Stripe:**
1. Pro Monthly ($12/month)
2. Pro Yearly ($99/year) - Save 31%
3. Team (per seat)
4. Enterprise (custom)

### 4.2 Subscription Flow
```
User → Pricing Page → Stripe Checkout → Webhook → Update Supabase
```

### 4.3 Webhook Handler
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  const event = stripe.webhooks.constructEvent(body, sig, secret)

  switch (event.type) {
	case 'checkout.session.completed':
	  // Activate subscription
	case 'customer.subscription.deleted':
	  // Cancel subscription
  }
}
```

---

## Phase 5: AI Integration (Week 3-4)

### 5.1 OpenAI Integration
```typescript
// lib/ai/openai.ts
import OpenAI from 'openai'

export async function enhanceBullet(text: string, jobContext: string) {
  const completion = await openai.chat.completions.create({
	model: 'gpt-4o',
	messages: [
	  { role: 'system', content: 'You are a professional CV writer...' },
	  { role: 'user', content: `Enhance this bullet point: ${text}` }
	]
  })
  return completion.choices[0].message.content
}
```

### 5.2 Rate Limiting
```typescript
// Use Upstash Redis for rate limiting
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
})
```

---

## Phase 6: Export System (Week 4)

### 6.1 PDF Export (Client-Side)
```typescript
// lib/export/pdf-renderer.tsx
import { Document, Page, pdf } from '@react-pdf/renderer'

export async function generatePDF(cv: CvProfile) {
  const blob = await pdf(<CVDocument cv={cv} />).toBlob()
  return blob
}
```

### 6.2 DOCX Export (Server-Side)
```typescript
// lib/export/docx-generator.ts
import { Document, Packer, Paragraph } from 'docx'

export async function generateDOCX(cv: CvProfile) {
  const doc = new Document({
	sections: [/* ... */]
  })
  return await Packer.toBlob(doc)
}
```

### 6.3 Export Limits Enforcement
```typescript
// Free: 3 exports/month
// Pro: Unlimited
async function checkExportLimit(userId: string, tier: string) {
  if (tier === 'free') {
	const count = await getExportCount(userId, 'month')
	if (count >= 3) throw new Error('Export limit reached')
  }
}
```

---

## Phase 7: Real-Time Collaboration (Week 5-6)

### 7.1 Supabase Realtime for Live Editing
```typescript
// lib/realtime/cv-sync.ts
import { createClient } from '@/lib/supabase/client'

export function subscribeToCvChanges(cvId: string, callback: Function) {
  const supabase = createClient()

  return supabase
	.channel(`cv:${cvId}`)
	.on('postgres_changes', 
	  { event: 'UPDATE', schema: 'public', table: 'cv_profiles', filter: `id=eq.${cvId}` },
	  callback
	)
	.subscribe()
}
```

### 7.2 Conflict Resolution
```typescript
// Use Last-Write-Wins (LWW) strategy
// Track `updated_at` timestamp
// Show conflict UI if simultaneous edits detected
```

---

## Phase 8: Testing & QA (Week 6-7)

### 8.1 Unit Tests
```bash
npm run test
```

### 8.2 E2E Tests
```typescript
// tests/e2e/cv-builder.spec.ts
import { test, expect } from '@playwright/test'

test('user can create and export CV', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('button:has-text("New CV")')
  // ... test flow
})
```

### 8.3 Performance Audits
- Lighthouse score > 90
- Core Web Vitals passing
- Load time < 2s

---

## Phase 9: Deployment (Week 7)

### 9.1 Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 9.2 Domain Setup
1. Purchase domain (e.g., cvcraft.io)
2. Configure DNS in Vercel
3. Set up SSL certificate (automatic)

### 9.3 Environment Variables
- Set all `.env.local` variables in Vercel dashboard
- Enable Preview Deployments
- Set up production webhooks

---

## Phase 10: Launch Preparation (Week 8)

### 10.1 Landing Page
- Hero section with demo
- Pricing table
- Features showcase
- Testimonials (early adopters)
- FAQ section
- CTA buttons

### 10.2 SEO Setup
```typescript
// app/layout.tsx
export const metadata = {
  title: 'CV Builder - Professional Resume Maker',
  description: 'Create ATS-optimized CVs with AI-powered suggestions...',
  openGraph: {
	images: ['/og-image.png']
  }
}
```

### 10.3 Analytics Setup
- PostHog for product analytics
- Google Analytics for traffic
- Hotjar for session recordings
- Sentry for error tracking

---

## Migration Checklist

### Infrastructure ✅
- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Storage buckets configured
- [ ] Stripe account + products created
- [ ] Domain purchased

### Development ✅
- [ ] Next.js project setup
- [ ] Authentication working
- [ ] CV builder functional
- [ ] Template system migrated
- [ ] PDF/DOCX export working
- [ ] AI features integrated
- [ ] Payment flow complete
- [ ] Collaboration features live

### Testing ✅
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Accessibility audit (WCAG AA)

### Launch ✅
- [ ] Landing page live
- [ ] Documentation complete
- [ ] Support system ready (Intercom/Crisp)
- [ ] Marketing materials prepared
- [ ] Product Hunt submission ready
- [ ] Beta users recruited

---

## Post-Launch Tasks

### Week 1-2 Post-Launch
- Monitor error rates (Sentry)
- Track conversion funnels (PostHog)
- Collect user feedback
- Fix critical bugs
- Respond to support tickets < 24h

### Month 1 Post-Launch
- Analyze pricing performance
- A/B test landing page
- Launch content marketing (blog)
- Reach out to press/influencers
- Optimize onboarding flow

### Month 2-3
- Add mobile apps (React Native)
- Launch affiliate program
- Partner with universities
- Build integration marketplace
- Expand template library

---

## Key Success Metrics

### Growth Metrics
- **Sign-ups**: 1,000 in first month
- **Activation**: 40% create first CV
- **Retention**: 30% monthly return
- **Conversion**: 5% free → paid

### Revenue Metrics
- **MRR Target**: $10,000 by month 3
- **ARPU**: $12-15
- **Churn**: < 5% monthly
- **LTV:CAC**: > 3:1

---

## Support & Resources

### Documentation
- Developer docs: `/docs`
- API reference: `/docs/api`
- User guide: `/help`

### Community
- Discord server for users
- GitHub Discussions for developers
- Twitter for updates

### Support Channels
- In-app chat (Intercom)
- Email: support@yourapp.com
- Status page: status.yourapp.com

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up Supabase** project
3. **Configure Stripe** products
4. **Start Phase 1** migration
5. **Recruit beta testers** (aim for 100-200)
6. **Launch MVP in 8 weeks**

**Let's ship it! 🚀**
