# CV Builder - Web Platform

> Professional CV Builder - Migrated from Tauri desktop to Next.js web application

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+
- Supabase account
- Stripe account (for payments)

### Installation

```bash
# Clone the repository
git clone git@github.com:tfasanya79/resume-developer.git
cd resume-developer/web

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
web/
├── app/                    # Next.js 15 App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── cv/               # CV-specific components
│   └── shared/           # Shared components
├── lib/                   # Utilities
│   ├── supabase/         # Supabase clients
│   ├── ai/               # AI integration (OpenAI, Claude)
│   ├── export/           # PDF/DOCX export
│   └── utils.ts          # Helper functions
├── hooks/                 # Custom React hooks
├── store/                 # Zustand state management
├── types/                 # TypeScript types
├── config/                # Configuration files
├── supabase/             # Database migrations
│   └── migrations/
└── public/               # Static assets
```

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic Claude (optional)
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Database Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Generate TypeScript types
npm run db:generate
```

---

## 🎨 Tech Stack

### Core
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - Component library

### Backend
- **Supabase** - Database, Auth, Storage, Realtime
- **PostgreSQL** - Relational database
- **Row Level Security** - Data protection

### AI/ML
- **OpenAI GPT-4o** - AI content enhancement
- **Anthropic Claude 3.5** - Fallback AI
- **LangChain** - AI orchestration

### State Management
- **Zustand** - Global state
- **React Query** - Server state & caching

### Export
- **@react-pdf/renderer** - PDF generation
- **docx** - DOCX generation

### Payments
- **Stripe** - Subscriptions & billing

### Analytics
- **PostHog** - Product analytics
- **Vercel Analytics** - Performance monitoring
- **Sentry** - Error tracking

---

## 📝 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Quality
npm run lint             # Lint code
npm run type-check       # TypeScript check
npm run format           # Format with Prettier

# Testing
npm run test             # Run tests
npm run test:ui          # Run tests with UI

# Database
npm run db:generate      # Generate TS types from DB
npm run db:push          # Push migrations
npm run db:reset         # Reset local database

# Stripe
npm run stripe:listen    # Listen to webhooks locally
```

### Code Style

- Use functional components with hooks
- Prefer server components (default in App Router)
- Use client components only when needed
- Follow file naming: `kebab-case.tsx`
- Component naming: `PascalCase`

### Commit Convention

```
feat: Add new feature
fix: Bug fix
docs: Documentation
style: Code style
refactor: Code refactoring
test: Tests
chore: Maintenance
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Environment Variables**
- Go to Vercel Dashboard → Settings → Environment Variables
- Add all variables from `.env.local`

4. **Domain Setup**
- Add custom domain in Vercel Dashboard
- Configure DNS records

### Environment-Specific Config

**Production:**
- Enable Vercel Analytics
- Set up Sentry error tracking
- Configure PostHog analytics
- Enable Stripe production mode

**Staging:**
- Use Stripe test mode
- Separate Supabase project
- Mock AI responses (optional)

---

## 🔐 Security

### Authentication
- Magic link email authentication
- OAuth (Google, GitHub, LinkedIn)
- SSO/SAML for Enterprise tier
- 2FA with TOTP

### Data Protection
- Row Level Security (RLS) in Supabase
- End-to-end encryption for sensitive data
- HTTPS only (enforced by Vercel)
- CSP headers

### API Security
- Rate limiting with Upstash
- API key rotation
- Webhook signature verification (Stripe)
- Input validation with Zod

---

## 📊 Monitoring

### Performance
- Lighthouse score > 90
- Core Web Vitals passing
- Load time < 2s
- Time to Interactive < 3s

### Error Tracking
- Sentry for backend errors
- Client-side error boundaries
- API error logging

### Analytics
- PostHog event tracking
- Conversion funnel analysis
- User session recordings
- Feature flag management

---

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Sign up flow
- [ ] CV creation
- [ ] PDF export
- [ ] Payment flow
- [ ] Collaboration features
- [ ] Mobile responsiveness

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - see LICENSE file

---

## 🆘 Support

- **Documentation**: [docs.cvbuilder.com](https://docs.cvbuilder.com)
- **Email**: support@cvbuilder.com
- **Discord**: [Join our community](https://discord.gg/cvbuilder)
- **Twitter**: [@cvbuilder](https://twitter.com/cvbuilder)

---

## 🗺️ Roadmap

### Q1 2024
- [x] Web platform launch
- [x] Payment integration
- [ ] Mobile apps (React Native)

### Q2 2024
- [ ] Team collaboration features
- [ ] White-label option
- [ ] API launch

### Q3 2024
- [ ] AI interview simulator
- [ ] Advanced analytics dashboard
- [ ] Chrome extension

### Q4 2024
- [ ] Integration marketplace
- [ ] Multi-language support (10+ languages)
- [ ] Enterprise SSO

---

**Built with ❤️ for job seekers worldwide**
