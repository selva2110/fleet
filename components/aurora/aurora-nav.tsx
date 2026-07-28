'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Bus,
  CalendarDays,
  Check,
  Database,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Menu,
  MessageSquare,
  Radio,
  Route,
  Search,
  Settings,
  Truck,
  UserRound,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { NotificationCenter } from '@/components/app-shell'
import { ThemeToggle } from '@/components/theme-toggle'
import { useFleet } from '@/lib/store'
import { ROLES } from '@/lib/labels'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: LucideIcon }

const MENU: NavItem[] = [
  { href: '/aurora', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/responses', label: 'SMS Responses', icon: MessageSquare },
  { href: '/participants', label: 'Participants', icon: Users },
  { href: '/vehicles', label: 'Vehicles', icon: Truck },
  { href: '/drivers', label: 'Drivers', icon: UserRound },
  { href: '/trips', label: 'Trips', icon: Route },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/event-log', label: 'Event Logs', icon: Database },
]

export function AuroraNav() {
  const pathname = usePathname()
  const fleet = useFleet()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentRole = ROLES.find((r) => r.id === fleet.role) ?? ROLES[0]

  return (
    <>
      <div className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-2.5',
            'bg-slate-950/60 backdrop-blur-2xl',
            'shadow-[0_8px_40px_rgba(2,6,23,0.55)]',
          )}
        >
          {/* Brand */}
          <Link href="/aurora" className="flex items-center gap-2.5 pl-1">
            <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_0_24px_-4px_rgba(34,211,238,0.7)]">
              <Bus className="size-5" />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold text-white">CareMove</span>
              <span className="block text-[10px] font-medium uppercase tracking-widest text-cyan-300/70">
                NEMT Operations
              </span>
            </span>
          </Link>

          {/* Center menu */}
          <div className="mx-auto hidden items-center gap-1 rounded-xl border border-white/5 bg-white/[0.03] p-1 xl:flex">
            {MENU.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                    active ? 'text-white' : 'text-slate-300/70 hover:text-white',
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="aurora-nav-active"
                      className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/15 to-white/5 ring-1 ring-white/15 shadow-[0_0_18px_-4px_rgba(96,165,250,0.6)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  ) : null}
                  <Icon className="relative size-3.5" />
                  <span className="relative">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-1.5 xl:ml-0">
            <LiveStatus running={fleet.simRunning} onToggle={fleet.toggleSim} />

            <Link
              href="/command-center"
              className="hidden items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1.5 text-[13px] font-medium text-cyan-200 transition-colors hover:bg-cyan-400/20 sm:flex"
            >
              <Radio className="size-3.5" />
              <span className="hidden lg:inline">Command Center</span>
            </Link>

            <NavIconButton label="Search" onClick={() => setSearchOpen(true)}>
              <Search className="size-4" />
            </NavIconButton>

            <div className="text-slate-200">
              <NotificationCenter />
            </div>

            <SettingsMenu />

            <div className="text-slate-200">
              <ThemeToggle />
            </div>

            <ProfileMenu roleLabel={currentRole.label} />

            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="text-slate-200 xl:hidden">
                    <Menu className="size-5" />
                  </Button>
                }
              />
              <SheetContent side="right" className="w-72 border-white/10 bg-slate-950 p-0 text-white">
                <SheetTitle className="border-b border-white/10 px-5 py-4 text-sm">
                  Navigation
                </SheetTitle>
                <nav className="flex flex-col gap-1 p-3">
                  {MENU.map((item) => {
                    const active = pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-white/10 text-white ring-1 ring-white/15'
                            : 'text-slate-300/80 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    )
                  })}
                  <Link
                    href="/command-center"
                    onClick={() => setMobileOpen(false)}
                    className="mt-1 flex items-center gap-3 rounded-lg bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 ring-1 ring-cyan-400/20"
                  >
                    <Radio className="size-4" />
                    Dispatch Command Center
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </motion.nav>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}

function NavIconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-lg text-slate-200 transition-colors hover:bg-white/10"
    >
      {children}
    </button>
  )
}

function LiveStatus({ running, onToggle }: { running: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors',
        running
          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20'
          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
      )}
      title={running ? 'Live tracking on — click to pause' : 'Paused — click to resume'}
    >
      <span className="relative flex size-2">
        {running ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
        ) : null}
        <span className={cn('relative inline-flex size-2 rounded-full', running ? 'bg-emerald-400' : 'bg-slate-400')} />
      </span>
      <span className="hidden sm:inline">{running ? 'Live' : 'Paused'}</span>
    </button>
  )
}

function SettingsMenu() {
  const fleet = useFleet()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="text-slate-200 hover:bg-white/10" aria-label="Settings">
            <Settings className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>View as role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {ROLES.map((r) => (
            <DropdownMenuItem key={r.id} onClick={() => fleet.setRole(r.id)} className="gap-2">
              <Check className={cn('size-4', r.id === fleet.role ? 'opacity-100' : 'opacity-0')} />
              {r.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/" />} className="gap-2">
          <LayoutDashboard className="size-4" />
          Exit to classic layout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProfileMenu({ roleLabel }: { roleLabel: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="User profile"
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1 transition-colors hover:bg-white/10"
          >
            <Avatar className="size-8 ring-1 ring-white/15">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-semibold text-white">
                CM
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">Casey Morgan</p>
          <p className="text-xs font-normal text-muted-foreground">{roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/analytics" />} className="gap-2">
          <BarChart3 className="size-4" /> My analytics
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/" />} className="gap-2">
          <MapPin className="size-4" /> Classic dashboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Command-palette style search across participants, drivers and vehicles. */
function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const fleet = useFleet()
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return { participants: [], drivers: [], vehicles: [] }
    const match = (s: string) => s.toLowerCase().includes(term)
    return {
      participants: fleet.participants.filter((p) => match(p.name)).slice(0, 5),
      drivers: fleet.drivers.filter((d) => match(d.name)).slice(0, 5),
      vehicles: fleet.vehicles.filter((v) => match(v.name)).slice(0, 5),
    }
  }, [q, fleet.participants, fleet.drivers, fleet.vehicles])

  const empty = !results.participants.length && !results.drivers.length && !results.vehicles.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search operations</DialogTitle>
        <DialogDescription className="sr-only">
          Search participants, drivers and vehicles across CareMove.
        </DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search participants, drivers, vehicles…"
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {!q.trim() ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Start typing to search across your operations.
            </p>
          ) : empty ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for “{q}”.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <ResultGroup title="Participants" href="/participants" items={results.participants.map((p) => p.name)} onNavigate={() => onOpenChange(false)} icon={Users} />
              <ResultGroup title="Drivers" href="/drivers" items={results.drivers.map((d) => d.name)} onNavigate={() => onOpenChange(false)} icon={UserRound} />
              <ResultGroup title="Vehicles" href="/vehicles" items={results.vehicles.map((v) => v.name)} onNavigate={() => onOpenChange(false)} icon={Truck} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ResultGroup({
  title,
  href,
  items,
  onNavigate,
  icon: Icon,
}: {
  title: string
  href: string
  items: string[]
  onNavigate: () => void
  icon: LucideIcon
}) {
  if (!items.length) return null
  return (
    <div>
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {items.map((name) => (
        <Link
          key={name}
          href={href}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          <Icon className="size-4 text-muted-foreground" />
          {name}
        </Link>
      ))}
    </div>
  )
}
