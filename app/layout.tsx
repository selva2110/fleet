import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/app-shell'
import { ThemeProvider, themeInitScript } from '@/components/theme-provider'
import { FleetProvider } from '@/lib/store'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'FleetCare | Event Transportation Management',
  description:
    'Smart Fleet Event Transportation Management Platform for coordinating participant transport to healthcare and community events.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <FleetProvider>
            <TooltipProvider delay={200}>
              <AppShell>{children}</AppShell>
            </TooltipProvider>
          </FleetProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
