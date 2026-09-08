import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'CV Builder - Professional Resume Maker',
  description: 'Create stunning, ATS-optimized CVs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Script
          data-goatcounter="https://stats.187.55.230.139.sslip.io/count"
          src="https://stats.187.55.230.139.sslip.io/count.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
