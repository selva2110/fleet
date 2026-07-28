'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Bell,
  Bus,
  CalendarDays,
  Check,
  Database,
  LayoutDashboard,
  Menu,
  Radio,
  Route,
  Trash2,
  Truck,
  UserRound,
  Users,
  Waypoints,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { ROLES } from '@/lib/labels'
import { useFleet } from '@/lib/store'
import { ThemeToggle } from '@/components/theme-toggle'
import { markEventReminderSent } from '@/app/actions/crud'
import { useNotifications } from '@/components/notifications/notification-center'

type NavItem = { href: string; label: string; icon: React.ElementType }
type NavSection = { title: string; items: NavItem[] }

const NAV: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/command-center', label: 'Dispatch Command Center', icon: Radio },
      { href: '/planner', label: 'Route Planner', icon: Waypoints },
    ],
  },
  {
    title: 'Vehicles & People',
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
        <p className="text-sm font-semibold text-sidebar-foreground">CareMove</p>
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

function ReminderMonitor() {
  const { events, trips, refresh } = useFleet()
  const { addNotification } = useNotifications()
  const firedReminderKeysRef = useRef(new Set<string>())

  useEffect(() => {
    if (!events.length) return

    const checkReminders = async () => {
      const now = Date.now()
      const dueReminders = events.flatMap((event) => {
        const eventTrips = trips.filter((trip) => trip.eventId === event.id)
        const hasAssignedVehicle = eventTrips.some((trip) => Boolean(trip.vehicleId))
        const hasAssignedDriver = eventTrips.some((trip) => Boolean(trip.driverId))

        if (hasAssignedVehicle || hasAssignedDriver) return []

        return (event.reminders ?? []).flatMap((reminder) => {
          const key = `${event.id}:${reminder.id}`
          if (reminder.sent || firedReminderKeysRef.current.has(key)) return []

          const dueAt = new Date(reminder.scheduledAt).getTime()
          if (Number.isNaN(dueAt) || dueAt > now) return []

          firedReminderKeysRef.current.add(key)
          addNotification({
            title: 'Reminder triggered',
            message: `${event.name} is scheduled to start at ${event.startTime} on ${event.date} and no vehicle or driver has been assigned.`,
            kind: 'warning',
          })

          return [{
            eventId: event.id,
            reminderId: reminder.id,
            reminders: (event.reminders ?? []).map((entry) =>
              entry.id === reminder.id ? { ...entry, sent: true } : entry,
            ),
          }]
        })
      })

      if (!dueReminders.length) return

      try {
        await Promise.all(
          dueReminders.map(({ eventId, reminders }) => markEventReminderSent(eventId, reminders)),
        )
        await refresh()
      } catch (error) {
        console.error('Reminder dispatch failed', error)
      }
    }

    void checkReminders()
    const id = window.setInterval(() => {
      void checkReminders()
    }, 15000)

    return () => window.clearInterval(id)
  }, [addNotification, events, refresh, trips])

  return null
}

function ReminderMonitorRoot() {
  return <ReminderMonitor />
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const { notifications, toasts, clearNotifications, dismissNotification, dismissToast } = useNotifications()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label="Open notifications"
      >
        <Bell className="size-4" />
        {notifications.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-[10px] font-medium text-foreground">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <div className="border-b border-border p-4">
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription className="mt-1">
              {notifications.length > 0
                ? `${notifications.length} active notification${notifications.length === 1 ? '' : 's'}`
                : 'No new alerts'}
            </SheetDescription>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {notifications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background/70 p-6 text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="rounded-xl border border-border bg-background/80 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => dismissNotification(notification.id)} className="shrink-0">
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 ? (
            <div className="border-t border-border p-4">
              <Button variant="outline" className="w-full gap-2" onClick={clearNotifications}>
                <Trash2 className="size-4" />
                Clear all
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 md:items-end md:px-6">
        {toasts.map((notification) => (
          <div
            key={notification.id}
            className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-popover/95 p-4 shadow-lg backdrop-blur"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => dismissToast(notification.id)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <ReminderMonitorRoot />
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
            <NotificationCenter />
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
