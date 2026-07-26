'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  LayoutGrid,
  List as ListIcon,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type ViewMode = 'grid' | 'list'
export type SortDir = 'asc' | 'desc'
export interface SortOption {
  key: string
  label: string
}

// -------------------------------------------------------------------------
// State hook: shared query / sort / view state used by every list page.
// -------------------------------------------------------------------------
export function useDataView(defaultSortKey: string, defaultView: ViewMode = 'grid') {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [view, setView] = useState<ViewMode>(defaultView)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const toggleSortDir = useCallback(
    () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')),
    [],
  )

  return {
    query,
    setQuery,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    toggleSortDir,
    view,
    setView,
    filtersOpen,
    setFiltersOpen,
  }
}

/** Generic string comparator that handles numbers, strings, and booleans. */
export function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  let cmp = 0
  if (typeof a === 'number' && typeof b === 'number') cmp = a - b
  else if (typeof a === 'boolean' && typeof b === 'boolean') cmp = Number(a) - Number(b)
  else cmp = String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true })
  return dir === 'asc' ? cmp : -cmp
}

// -------------------------------------------------------------------------
// View toggle (grid / list segmented control)
// -------------------------------------------------------------------------
export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode
  onChange: (v: ViewMode) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
        className={cn(
          'flex size-7 items-center justify-center rounded-[5px] transition-colors',
          view === 'grid'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted',
        )}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-label="List view"
        aria-pressed={view === 'list'}
        className={cn(
          'flex size-7 items-center justify-center rounded-[5px] transition-colors',
          view === 'list'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted',
        )}
      >
        <ListIcon className="size-4" />
      </button>
    </div>
  )
}

// -------------------------------------------------------------------------
// Toolbar: search + sort + direction + view toggle + filter button
// -------------------------------------------------------------------------
export function DataToolbar({
  query,
  onQueryChange,
  searchPlaceholder = 'Search…',
  sortOptions,
  sortKey,
  onSortKeyChange,
  sortDir,
  onToggleSortDir,
  view,
  onViewChange,
  activeFilterCount,
  onOpenFilters,
  resultCount,
}: {
  query: string
  onQueryChange: (v: string) => void
  searchPlaceholder?: string
  sortOptions: SortOption[]
  sortKey: string
  onSortKeyChange: (v: string) => void
  sortDir: SortDir
  onToggleSortDir: () => void
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  activeFilterCount: number
  onOpenFilters: () => void
  resultCount?: number
}) {
  const activeSort = sortOptions.find((s) => s.key === sortKey)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>

      {typeof resultCount === 'number' ? (
        <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
          {resultCount} result{resultCount === 1 ? '' : 's'}
        </span>
      ) : null}

      <div className="flex items-center gap-1">
        <Select value={sortKey} onValueChange={(v) => onSortKeyChange(v ?? sortKey)}>
          <SelectTrigger className="w-40">
            <SelectValue>{() => `Sort: ${activeSort?.label ?? ''}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSortDir}
          aria-label={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortDir === 'asc' ? (
            <ArrowUpAZ className="size-4" />
          ) : (
            <ArrowDownAZ className="size-4" />
          )}
        </Button>
      </div>

      <ViewToggle view={view} onChange={onViewChange} />

      <Button variant="outline" size="sm" onClick={onOpenFilters} className="gap-2">
        <SlidersHorizontal className="size-4" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 ? (
          <Badge className="ml-0.5 size-5 justify-center rounded-full bg-primary p-0 text-[10px] text-primary-foreground">
            {activeFilterCount}
          </Badge>
        ) : null}
      </Button>
    </div>
  )
}

// -------------------------------------------------------------------------
// Filter sheet: right side panel with reset + close
// -------------------------------------------------------------------------
export function FilterSheet({
  open,
  onOpenChange,
  activeCount,
  onReset,
  children,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  activeCount: number
  onReset: () => void
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="flex-row items-center justify-between border-b border-border pr-14">
          <div>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              {activeCount > 0
                ? `${activeCount} active filter${activeCount === 1 ? '' : 's'}`
                : 'Refine the results'}
            </SheetDescription>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col divide-y divide-border">{children}</div>
        </ScrollArea>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={onReset}
            disabled={activeCount === 0}
          >
            <RotateCcw className="size-4" /> Reset
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            Show results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function FilterSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

/** Multi-select checkbox group backed by a string[] value. */
export function CheckboxGroupFilter({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (value: string, checked: boolean) => {
    if (checked) onChange([...selected, value])
    else onChange(selected.filter((v) => v !== value))
  }
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const checked = selected.includes(opt.value)
        return (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2.5 text-sm"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => toggle(opt.value, v === true)}
            />
            <span className="text-foreground">{opt.label}</span>
          </label>
        )
      })}
    </div>
  )
}

/** Empty-state placeholder shown when filters return nothing. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <Search className="size-6 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/** Convenience: count how many filter values are non-default. */
export function useActiveFilterCount(groups: string[][]): number {
  return useMemo(() => groups.filter((g) => g.length > 0).length, [groups])
}
