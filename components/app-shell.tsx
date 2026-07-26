'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Bus,
  CalendarDays,
  Check,
  Database,
  LayoutDashboard,
  Menu,
  Radio,
  Route,
  Truck,
  UserRound,
  Users,
  Waypoints,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { ROLES } from '@/lib/labels'
import { useFleet } from '@/lib/store'
import { ThemeToggle } from '@/components/theme-toggle'

type NavItem = { href: string; label: string; icon: React.ElementType }
type NavSection = { title: string; items: NavItem[] }

const NAV: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/command-center', label: 'Dispatch Command Center', icon: Radio },
      { href: '/planner', label: 'AI Route Planner', icon: Waypoints },
    ],
  },
  {
    title: 'Fleet & People',
    items: [
      { href: '/events', label: 'Events', icon: CalendarDays },
      { href: '/participants', label: 'Participants', icon: Users },
      { href: '/vehicles', label: 'Vehicles', icon: Truck },
      { href: '/drivers', label: 'Drivers', icon: UserRound },
      { href: '/trips', label: 'Trips', icon: Route },
    ],
  },
  {
    title: 'Insight',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/event-log', label: 'Event Log', icon: Database },
    ],
  },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {NAV.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
            {section.title}
          </p>
          {section.items.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Bus className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-sidebar-foreground">FleetCare</p>
        <p className="text-[11px] text-sidebar-foreground/50">Event Transport Ops</p>
      </div>
    </div>
  )
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!now) return null
  return (
    <span className="hidden font-mono text-sm tabular-nums text-muted-foreground sm:inline">
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

function RoleSwitcher() {
  const { role, setRole } = useFleet()
  const current = ROLES.find((r) => r.id === role)!
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <UserRound className="size-4" />
            <span className="hidden sm:inline">{current.label}</span>
            <span className="sm:hidden">{current.short}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>View as role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((r) => (
          <DropdownMenuItem key={r.id} onClick={() => setRole(r.id)} className="gap-2">
            <Check className={cn('size-4', r.id === role ? 'opacity-100' : 'opacity-0')} />
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SimToggle() {
  const { simRunning, toggleSim } = useFleet()
  return (
    <Button
      variant={simRunning ? 'secondary' : 'outline'}
      size="sm"
      onClick={toggleSim}
      className="gap-2"
    >
      <Activity className={cn('size-4', simRunning && 'text-success')} />
      <span className="hidden md:inline">{simRunning ? 'Live' : 'Paused'}</span>
    </Button>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <NavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <span className="flex size-2 items-center justify-center">
              <span className="size-2 animate-ping rounded-full bg-success/60" />
              <span className="absolute size-2 rounded-full bg-success" />
            </span>
            <span className="text-sm font-medium">Live Operations</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <LiveClock />
            <SimToggle />
            <ThemeToggle />
            <RoleSwitcher />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
