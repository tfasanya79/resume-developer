import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle, Sparkles, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">CV Builder</span>
          </Link>

          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="#templates" className="text-sm font-medium hover:text-primary transition-colors">
              Templates
            </Link>
            <Link href="/docs" className="text-sm font-medium hover:text-primary transition-colors">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center rounded-full border px-4 py-1.5 text-sm">
              <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
              <span>Trusted by 50,000+ job seekers worldwide</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              Create Professional CVs <br />
              <span className="text-primary">Get Hired Faster</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Build ATS-optimized resumes with AI-powered suggestions. 
              Choose from 30+ professional templates. Export to PDF, DOCX, and more.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Building for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required • 3 free CV profiles forever
            </p>
          </div>
        </div>

        {/* Decorative blur effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-3xl -z-10" />
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Land Your Dream Job</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make your job search easier and more successful
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="rounded-lg border bg-card p-6 hover:shadow-lg transition-shadow">
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">200K+</div>
              <div className="text-muted-foreground">CVs Created</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">30+</div>
              <div className="text-muted-foreground">Templates</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">95%</div>
              <div className="text-muted-foreground">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground">Start free, upgrade when you're ready</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <div 
                key={i} 
                className={`rounded-lg border bg-card p-8 ${plan.popular ? 'ring-2 ring-primary shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="text-primary text-sm font-semibold mb-4">MOST POPULAR</div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-2xl mb-2">{plan.name}</h3>
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    {plan.period && <span className="text-muted-foreground ml-2">/{plan.period}</span>}
                  </div>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>

                <Button 
                  className="w-full mb-6" 
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-2xl bg-primary text-primary-foreground p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Build Your Perfect CV?</h2>
            <p className="text-xl mb-8 opacity-90">Join thousands of successful job seekers today</p>
            <Link href="/signup">
              <Button size="lg" variant="secondary">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features">Features</Link></li>
                <li><Link href="/templates">Templates</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/changelog">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/careers">Careers</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs">Documentation</Link></li>
                <li><Link href="/guides">CV Writing Guide</Link></li>
                <li><Link href="/api">API</Link></li>
                <li><Link href="/support">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
                <li><Link href="/security">Security</Link></li>
                <li><Link href="/gdpr">GDPR</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2024 CV Builder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Suggestions',
    description: 'Get intelligent recommendations to improve your CV content with GPT-4 powered analysis.',
  },
  {
    icon: CheckCircle,
    title: 'ATS-Optimized Templates',
    description: '30+ professional templates designed to pass Applicant Tracking Systems.',
  },
  {
    icon: Shield,
    title: 'Privacy-First',
    description: 'Your data stays secure with end-to-end encryption. No tracking, ever.',
  },
  {
    icon: Zap,
    title: 'Real-Time Collaboration',
    description: 'Work with career coaches or get feedback from friends in real-time.',
  },
  {
    icon: CheckCircle,
    title: 'Multi-Format Export',
    description: 'Export to PDF, DOCX, HTML, LaTeX, and more with one click.',
  },
  {
    icon: Sparkles,
    title: 'Job Application Tracker',
    description: 'Manage applications, track interviews, and never miss a follow-up.',
  },
]

const pricingPlans = [
  {
    name: 'Free',
    price: 0,
    period: '',
    description: 'Perfect for getting started',
    cta: 'Start Free',
    features: [
      '3 CV profiles',
      '5 template options',
      'PDF & DOCX export (3/month)',
      'Basic ATS checker',
      'Job application tracker (10 apps)',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: 12,
    period: 'month',
    description: 'Best for active job seekers',
    cta: 'Start Free Trial',
    popular: true,
    features: [
      'Unlimited CV profiles',
      'All 30+ premium templates',
      'Unlimited exports (all formats)',
      'Advanced AI features (GPT-4)',
      'Cloud sync across devices',
      'Version history (30 days)',
      'Priority support',
      'No branding on exports',
    ],
  },
  {
    name: 'Team',
    price: 29,
    period: 'user/month',
    description: 'For career coaches',
    cta: 'Contact Sales',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Client management',
      'Shared template library',
      'Usage analytics',
      'SSO (SAML)',
      'Admin dashboard',
    ],
  },
]
