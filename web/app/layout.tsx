import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'CV Builder - Professional Resume Maker | ATS-Optimized',
  description: 'Create stunning, ATS-optimized CVs with AI-powered suggestions. Export to PDF, DOCX, and more. Trusted by thousands of job seekers worldwide.',
  keywords: ['CV builder', 'resume maker', 'ATS optimization', 'job application', 'career tools'],
  authors: [{ name: 'CV Builder Team' }],
  creator: 'CV Builder',
  publisher: 'CV Builder',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cvbuilder.com',
    title: 'CV Builder - Professional Resume Maker',
    description: 'Create stunning, ATS-optimized CVs with AI-powered suggestions.',
    siteName: 'CV Builder',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CV Builder Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CV Builder - Professional Resume Maker',
    description: 'Create stunning, ATS-optimized CVs with AI-powered suggestions.',
    images: ['/og-image.png'],
    creator: '@cvbuilder',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
