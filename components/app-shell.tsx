'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Bus,
  CalendarDays,
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
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { DISPATCHER_NAME } from '@/lib/labels'
import { DeadlinePrompt } from '@/components/planner/deadline-prompt'
import { useFleet } from '@/lib/store'
import { getPlanStatus, isEventDispatchable } from '@/lib/planning-status'
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
      {
        href: '/participants',
        label: 'Members',
        icon: Users,
        children: [{ href: '/responses', label: 'Member Responses', icon: MessageSquare }],
      },
      { href: '/events', label: 'Events', icon: CalendarDays },
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

/** Vertical, grouped navigation used inside the left sidebar. */
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

function Brand({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex size-9 items-center justify-center rounded-lg',
          onDark ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'bg-primary text-primary-foreground',
        )}
      >
        <Bus className="size-5" />
      </div>
      <div className="leading-tight">
        <p className={cn('text-sm font-semibold', onDark ? 'text-sidebar-foreground' : 'text-foreground')}>
          Tranzio
        </p>
        <p
          className={cn(
            'text-[11px] uppercase tracking-wider',
            onDark ? 'text-sidebar-foreground/60' : 'text-muted-foreground',
          )}
        >
          NEMT Operations
        </p>
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
    <span className="hidden font-mono text-sm tabular-nums text-sidebar-foreground/70 sm:inline">
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
    <div className="hidden items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-2 py-1 sm:flex">
      <span className="flex size-7 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-semibold uppercase text-sidebar-primary-foreground">
        {initials}
      </span>
      <div className="leading-tight">
        <p className="text-[13px] font-medium text-sidebar-foreground">{DISPATCHER_NAME}</p>
        <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/60">Dispatcher</p>
      </div>
    </div>
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

/**
 * Automatic route planning. Once an event's response deadline passes, the plan
 * is generated and committed automatically with no manual intervention — the
 * dispatcher only manually triggers a *replan*. Events whose start time has
 * already passed are skipped (they are no longer dispatchable). Guarded so each
 * event is auto-planned at most once per session.
 */
function AutoPlanner() {
  const { events, trips, generatePlan, commitPlan } = useFleet()
  const { addNotification } = useNotifications()
  const plannedRef = useRef(new Set<string>())
  const runningRef = useRef(false)

  useEffect(() => {
    if (!events.length) return

    const autoPlan = async () => {
      if (runningRef.current) return
      const now = new Date()
      const candidates = events.filter((event) => {
        if (plannedRef.current.has(event.id)) return false
        if (event.status === 'completed') return false
        if (!isEventDispatchable(event, now)) return false
        const status = getPlanStatus(event, trips, now)
        // Auto-plan only after the response deadline, and only when no plan yet
        // exists and nothing has been dispatched for the event.
        return status.canGenerate && !status.hasPlan && !status.dispatched
      })
      if (!candidates.length) return

      runningRef.current = true
      try {
        for (const event of candidates) {
          plannedRef.current.add(event.id)
          try {
            const result = await generatePlan(event.id)
            if (result.recommendations.length > 0) {
              await commitPlan(event.id, result.recommendations)
              addNotification({
                title: 'Routes auto-planned',
                message: `${result.recommendations.length} route${
                  result.recommendations.length === 1 ? '' : 's'
                } generated automatically for ${event.name} after its response deadline.`,
                kind: 'success',
              })
            }
          } catch (error) {
            // Allow a later retry if this run failed.
            plannedRef.current.delete(event.id)
            console.log('[v0] auto-plan failed', (error as Error).message)
          }
        }
      } finally {
        runningRef.current = false
      }
    }

    void autoPlan()
    const id = window.setInterval(() => void autoPlan(), 10000)
    return () => window.clearInterval(id)
  }, [events, trips, generatePlan, commitPlan, addNotification])

  return null
}

function ReminderMonitorRoot() {
  return (
    <>
      <ReminderMonitor />
      <AutoPlanner />
    </>
  )
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Open the sidebar by default on large screens; keep it hidden on mobile.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarOpen(true)
    }
  }, [])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <ReminderMonitorRoot />

      {/* Top bar */}
      <header className="z-50 shrink-0 border-b border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* Hamburger — shows/hides the left sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Hide menu' : 'Show menu'}
            aria-expanded={sidebarOpen}
          >
            <Menu className="size-5" />
          </Button>

          <Brand className="shrink-0" onDark />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <LiveClock />
            <NotificationCenter />
            <ThemeToggle />
            <ProfileChip />
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Mobile backdrop */}
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-14 z-30 bg-black/50 lg:hidden"
          />
        ) : null}

        {/* Collapsible left sidebar */}
        <aside
          className={cn(
            'overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200',
            'fixed bottom-0 left-0 top-14 z-40 w-72 lg:static lg:top-0 lg:z-0 lg:w-64',
            sidebarOpen
              ? 'translate-x-0 lg:w-64'
              : '-translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden lg:border-r-0',
          )}
        >
          <MobileNavLinks
            onNavigate={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                setSidebarOpen(false)
              }
            }}
          />
        </aside>

        {/* <DeadlinePrompt /> */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
