'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Calendar,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Pill,
  Radio,
  Route,
  Scale,
  Trash2,
  Truck,
  UserCog,
  UserRound,
  Users,
  Utensils,
  Waypoints,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn, initials } from '@/lib/utils'
import { DISPATCHER_NAME } from '@/lib/labels'
import { useEvents } from '@/lib/events/hooks'
import { useTrips, useDispatchActions } from '@/lib/trips/hooks'
import { ThemeToggle } from '@/components/theme-toggle'
import { markEventReminderSent } from '@/app/actions/crud'
import { useNotifications } from '@/components/context/notification-provider'
import { ToastViewport } from '@/components/notifications/toast-viewport'
import { TripsUtils } from '@/lib/trips/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useTranslation } from './context/language-provider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { logout } from "@/app/actions/common";
import { useSession } from "./context/session-provider-client";
type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: NavItem[];
};
type NavSection = { title: string; items: NavItem[] };

/** Vertical, grouped navigation used inside the left sidebar. */
function MobileNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { isAdmin } = useSession();
  const { t } = useTranslation();

  const NAV: NavSection[] = [
    { title: "nav.operations", items: [
      { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
      { href: "/command-center", label: "nav.commandcenter", icon: Radio },
      { href: "/planner", label: "nav.routeplanner", icon: Waypoints },
    ]},
    { title: "nav.clientmanagement", items:[
      {href: "/participants", label: "common.participants", icon: Users}
    ]},
    { title: "nav.scheduling", items: [
      { href: "/events", label: "e.events", icon: CalendarDays,
        children:[
          { href: "/responses", label: "Event Responses", icon: MessageSquare } ]
       },
      { href: "/meal-delivery", label: "e.mealdelivery", icon: Utensils },
      { href: "/catalog", label: "e.catalogtitle", icon: Pill },
      { href: "/trips", label: "common.trips", icon: Route },
    ]},
    { title: "nav.fleet", items: [
      { href: "/vehicles", label: "common.vehicles", icon: Truck },
      { href: "/drivers", label: "common.drivers", icon: UserRound, children: [
        { href: "/drivers/availability", label: "driver.availability", icon: Calendar },
        { href: "/drivers/pto", label: "driver.ptotitle", icon: ClipboardList },
      ]},
    ]},
    { title: "Configuration", items: [
      { href: "/rules", label: "Rule Engine", icon: Scale },
    ]},
    ...(isAdmin ? [{ title: "nav.administration", items: [
      { href: "/users", label: "nav.usermanagement", icon: UserCog },
    ]}] : []),
  ];

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV.map((section) => [section.title, true])),
  );

  const [openItems, setOpenItems] = useState<Record<string, boolean>>(
    () => Object.fromEntries(
      NAV.flatMap((section) => section.items)
        .filter((item) => item.children?.length)
        .map((item) => [item.href, true]),
    ),
  );

  return (
    <nav className="flex flex-col gap-3 px-3 py-4 w-full">
      {NAV.map((section) => {
        const isOpen = openSections[section.title] ?? true;

        return (
          <Collapsible
            key={section.title}
            open={isOpen}
            onOpenChange={(open) => {
              setOpenSections((prev) => ({
                ...prev,
                [section.title]: open,
              }));
            }}
            className="flex flex-col"
          >
            <CollapsibleTrigger
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2",
                "text-left text-[10px] font-semibold uppercase tracking-[0.12em]",
                "text-sidebar-foreground/55",
                "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              )}
            >
              <span>{t(section.title)}</span>

              <ChevronDown className="size-3 shrink-0 text-sidebar-foreground/55 transition-transform duration-200 data-panel-open:rotate-180" />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="flex flex-col gap-1 pt-1">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  const hasChildren = Boolean(item.children?.length);
                  const itemOpen = openItems[item.href] ?? true;

                  return (
                    <div key={item.href} className="flex flex-col gap-1">
                      <div
                        className={cn(
                          "flex items-center rounded-md text-sm font-medium transition-colors",
                          active
                            ? "border-l-5 border-sidebar-ring bg-sidebar-ring/15 text-sidebar-ring ring-1 ring-sidebar-ring/20"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        )}
                      >
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className="flex flex-1 items-center gap-3 px-3 py-2"
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{t(item.label)}</span>
                        </Link>

                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() =>
                              setOpenItems((prev) => ({
                                ...prev,
                                [item.href]: !itemOpen,
                              }))
                            }
                            aria-label={itemOpen ? t('common.collapse') : t('common.expand')}
                            aria-expanded={itemOpen}
                            className="flex shrink-0 items-center justify-center rounded-md px-2 py-2 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                          >
                            <ChevronDown
                              className={cn(
                                "size-3.5 shrink-0 transition-transform duration-200",
                                itemOpen ? "rotate-180" : "rotate-0",
                              )}
                            />
                          </button>
                        ) : null}
                      </div>

                      {hasChildren && itemOpen ? (
                        <div className="ml-4 flex flex-col gap-1 border-none border-border pl-3">
                          {item.children!.map((child) => {
                            const childActive = pathname === child.href;
                            const ChildIcon = child.icon;

                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={onNavigate}
                                className={cn(
                                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                  childActive
                                    ? "border-l-5 border-sidebar-ring bg-sidebar-ring/15 text-sidebar-ring ring-1 ring-sidebar-ring/20"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                                )}
                              >
                                <ChildIcon className="size-4 shrink-0" />

                                <span className="truncate">{t(child.label)}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );
}

function Brand({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <Link href="/dashboard" className={cn('flex items-center', className)}>
      <Image
        src="/tranzio-brand.png"
        alt="CareVoy"
        width={170}
        height={40}
        loading="eager"
        className="w-auto object-contain"
        style={{ height: 100 }}
      />
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
    <span className="hidden font-mono text-sm tabular-nums whitespace-nowrap text-sidebar-foreground/70 sm:inline">
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

function ProfileChip() {
  const { t } = useTranslation();
  const initial = initials(DISPATCHER_NAME);
  const { userRole } = useSession();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setConfirmOpen(false);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="hidden items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-2 py-1 text-left sm:flex"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-sidebar-ring text-[11px] font-semibold uppercase text-sidebar-primary-foreground">
                {initial}
              </span>
              <div className="leading-tight">
                <p className="whitespace-nowrap text-[13px] font-medium text-sidebar-foreground">
                  {DISPATCHER_NAME}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/60">
                  {userRole}
                </p>
              </div>
            </button>
          }
        />

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
            <LogOut className="size-3.5" />
            {t("common.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("common.logoutconfirmtitle")}</DialogTitle>
            <DialogDescription>{t("common.logoutconfirmmessage")}</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={handleLogout} disabled={loggingOut}>
              <LogOut className="size-3.5" />
              {t("common.logout")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReminderMonitor() {
  const { events, mutate: mutateEvents } = useEvents()
  const { trips } = useTrips()
  const { addNotification } = useNotifications()
  const {t} = useTranslation()
  const firedReminderKeysRef = useRef(new Set<string>())
  const stateRef = useRef({ events, trips })
  stateRef.current = { events, trips }

  useEffect(() => {
    const checkReminders = async () => {
      const { events, trips } = stateRef.current
      if (!events.length) return
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
            title: t('notif.remindertriggered'),
            message: t('notif.reminderbody')
              .replace('{{name}}', event.name)
              .replace('{{time}}', event.startTime)
              .replace('{{date}}', event.date),
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
        await mutateEvents()
      } catch (error) {
        console.error('Reminder dispatch failed', error)
      }
    }

    void checkReminders()
    const id = window.setInterval(() => {
      void checkReminders()
    }, 15000)

    return () => window.clearInterval(id)
  }, [addNotification, mutateEvents])

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
  const { events } = useEvents()
  const { trips } = useTrips()
  const { generatePlan, commitPlan } = useDispatchActions()
  const { addNotification } = useNotifications()
  const {t} = useTranslation()
  const plannedRef = useRef(new Set<string>())
  const runningRef = useRef(false)
  // See the identical comment in ReminderMonitor: `events`/`trips` are new
  // array references on every snapshot refresh, so they must not be effect
  // dependencies here — committing a plan itself triggers a refresh, which
  // would otherwise immediately re-fire this effect in a tight loop. Track
  // the latest values via a ref and depend only on stable callbacks.
  const stateRef = useRef({ events, trips })
  stateRef.current = { events, trips }

  useEffect(() => {
    const autoPlan = async () => {
      if (runningRef.current) return
      const { events, trips } = stateRef.current
      if (!events.length) return
      const now = new Date()
      const candidates = events.filter((event) => {
        if (plannedRef.current.has(event.id)) return false
        if (event.status === 'completed') return false
        if (!TripsUtils.isEventDispatchable(event, now)) return false
        const status = TripsUtils.getPlanStatus(event, trips, now)
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
                title: t('notif.autoplanned'),
                message: t('notif.autoplannedbody')
                  .replace('{{count}}', String(result.recommendations.length))
                  .replace('{{suffix}}', result.recommendations.length === 1 ? '' : 's')
                  .replace('{{name}}', event.name),
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
  }, [generatePlan, commitPlan, addNotification])

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
  const { notifications, clearNotifications, dismissNotification } = useNotifications()
  const {t} = useTranslation()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label={t('notif.opennotifications')}
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
            <SheetTitle>{t('notif.notifications')}</SheetTitle>
            <SheetDescription className="mt-1">
              {notifications.length > 0
                ? t('notif.activenotifications')
                    .replace('{{count}}', String(notifications.length))
                    .replace('{{suffix}}', notifications.length === 1 ? '' : 's')
                : t('notif.noalerts')}
            </SheetDescription>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {notifications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background/70 p-6 text-sm text-muted-foreground">
                {t('notif.nonotifications')}
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
                {t('notif.clearall')}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <ToastViewport />
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { LanguageSelector, t } = useTranslation();

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
            size="icon"
            className={`${sidebarOpen ? 'bg-sidebar-ring text-sidebar': 'bg-transparent text-sidebar-ring'}`}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? t('common.hidemenu') : t('common.showmenu')}
            aria-expanded={sidebarOpen}
          >
            <Menu className="size-5 bg-transparent" />
          </Button>

          <Brand className="shrink-0" onDark />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <NotificationCenter />
            <LanguageSelector className="w-44"/>
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
            aria-label={t('common.closemenu')}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-14 z-30 bg-black/50 lg:hidden"
          />
        ) : null}

        {/* Collapsible left sidebar */}
        <aside
          className={cn(
            'overflow-y-auto thin-scrollbar border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200',
            'fixed bottom-0 left-0 top-14 z-40 w-72 lg:static lg:top-0 lg:z-0 lg:w-64',
            sidebarOpen
              ? 'translate-x-0 lg:w-68'
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
