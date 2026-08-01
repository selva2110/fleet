'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Activity,
  Bell,
  Bus,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  Menu,
  MessageSquare,
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { DISPATCHER_NAME } from '@/lib/labels'
import { DeadlinePrompt } from '@/components/planner/deadline-prompt'
import { useFleet } from '@/lib/store'
import { ThemeToggle } from '@/components/theme-toggle'
import { markEventReminderSent } from '@/app/actions/crud'
import { useNotifications } from '@/components/notifications/notification-center'

type NavItem = { href: string; label: string; icon: React.ElementType; children?: NavItem[] }
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
    title: 'Scheduling',
    items: [
      { href: '/participants', label: 'Members', icon: Users },
      { href: '/events', label: 'Events', icon: CalendarDays },
      { href: '/responses', label: 'Member Responses', icon: MessageSquare },
      { href: '/trips', label: 'Trips', icon: Route },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { href: '/vehicles', label: 'Vehicles', icon: Truck },
      { href: '/drivers', label: 'Drivers', icon: UserRound },
    ],
  },
]

const TOP_NAV: NavItem[] = NAV.flatMap((s) => s.items)

/** Horizontal, scrollable navigation used in the top bar on desktop. */
function TopNavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {TOP_NAV.map((item) => (
        <TopNavItem key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  )
}

/**
 * A single top-bar entry. Items with children (e.g. Events → Trips) render a
 * dropdown trigger whose menu lists the parent page plus its sub-pages. The
 * menu is portalled, so it is never clipped by the nav's horizontal scroll
 * container.
 */
function TopNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const childActive = item.children?.some((c) => pathname === c.href) ?? false
  const active = pathname === item.href || childActive

  const linkCls = cn(
    'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
    active
      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

  if (!item.children?.length) {
    return (
      <Link href={item.href} className={linkCls}>
        <Icon className="size-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    )
  }

  const subItems = [{ ...item, label: `All ${item.label.toLowerCase()}` }, ...item.children]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(linkCls, 'cursor-pointer')}
        aria-label={`${item.label} menu`}
      >
        <Icon className="size-4 shrink-0" />
        <span>{item.label}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-60 transition-transform data-[popup-open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-52 min-w-52">
        {subItems.map((sub) => {
          const SubIcon = sub.icon
          const subActive = pathname === sub.href
          return (
            <DropdownMenuItem
              key={sub.href}
              render={<Link href={sub.href} />}
              className={cn(
                'gap-2 px-2.5 py-2 text-[13px]',
                subActive && 'bg-primary/10 text-primary',
              )}
            >
              <SubIcon className="size-4 shrink-0" />
              <span>{sub.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Vertical, grouped navigation used inside the mobile sheet. */
function MobileNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {NAV.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {section.title}
          </p>
          {section.items.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <div key={item.href} className="flex flex-col gap-1">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
                {item.children?.length ? (
                  <div className="ml-4 flex flex-col gap-1 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href
                      const ChildIcon = child.icon
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            childActive
                              ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <ChildIcon className="size-4 shrink-0" />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5', className)}>
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Bus className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">Tranzio</p>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">NEMT Operations</p>
      </div>
    </Link>
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

function ProfileChip() {
  const initials = DISPATCHER_NAME.split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
  return (
    <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1 sm:flex">
      <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase text-primary">
        {initials}
      </span>
      <div className="leading-tight">
        <p className="text-[13px] font-medium text-foreground">{DISPATCHER_NAME}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dispatcher</p>
      </div>
    </div>
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
        <SheetContent
          side="right"
          className="top-14 h-[calc(100dvh-3.5rem)] w-full max-w-full gap-0 border-l border-border p-0 sm:max-w-full"
        >
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

      <div className="pointer-events-none fixed inset-x-0 top-4 z-60 flex flex-col items-center gap-2 px-4 md:items-end md:px-6">
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
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <ReminderMonitorRoot />

      {/* Top navigation */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="xl:hidden">
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="border-b border-border px-5 py-4">
                <Brand />
              </div>
              <MobileNavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <Brand className="shrink-0" />

          {/* Desktop horizontal nav */}
          <div className="ml-4 hidden min-w-0 flex-1 overflow-x-auto xl:block scrollbar-none">
            <TopNavLinks />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
            <LiveClock />
            <NotificationCenter />
            <SimToggle />
            <ThemeToggle />
            <ProfileChip />
          </div>
        </div>
      </header>

      {/* <DeadlinePrompt /> */}
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
