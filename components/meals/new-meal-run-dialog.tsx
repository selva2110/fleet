'use client'

import { useMemo, useState } from 'react'
import { Search, UtensilsCrossed, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SelectField, TextField } from '@/components/crud/form-fields'
import { useFleet } from '@/lib/store'
import type { MealType, Participant } from '@/lib/types'

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'Breakfast', label: 'Breakfast' },
  { value: 'Lunch', label: 'Lunch' },
  { value: 'Dinner', label: 'Dinner' },
]

export function NewMealRunDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const fleet = useFleet()
  const [centerId, setCenterId] = useState(fleet.centers[0]?.id ?? '')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [mealType, setMealType] = useState<MealType>('Lunch')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [departTime, setDepartTime] = useState('11:30')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const centerOptions = [
    { value: '', label: 'Select a kitchen / center' },
    ...fleet.centers.map((c) => ({ value: c.id, label: c.name })),
  ]
  const vehicleOptions = [
    { value: '', label: 'Unassigned' },
    ...fleet.vehicles.map((v) => ({ value: v.id, label: `${v.name} · ${v.type}` })),
  ]
  const driverOptions = [
    { value: '', label: 'Unassigned' },
    ...fleet.drivers.map((d) => ({ value: d.id, label: d.name })),
  ]

  const addable = useMemo(() => {
    const q = query.trim().toLowerCase()
    return fleet.participants
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [fleet.participants, query])

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => fleet.participantById(id))
        .filter((p): p is Participant => Boolean(p)),
    [selectedIds, fleet],
  )

  function toggle(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  function reset() {
    setSelectedIds([])
    setQuery('')
    setVehicleId('')
    setDriverId('')
    setMealType('Lunch')
    setDepartTime('11:30')
  }

  async function submit() {
    if (!centerId || selectedIds.length === 0) return
    setSaving(true)
    try {
      await fleet.createMealDelivery({
        centerId,
        vehicleId: vehicleId || null,
        driverId: driverId || null,
        date,
        departTime,
        mealType,
        participantIds: selectedIds,
      })
      reset()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="size-4 text-primary" /> New meal-delivery run
          </DialogTitle>
          <DialogDescription>
            The fleet picks up prepared meals at the selected center and delivers them to each
            participant&apos;s home.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Pickup kitchen / center"
            value={centerId}
            options={centerOptions}
            onChange={setCenterId}
          />
          <SelectField label="Meal type" value={mealType} options={MEAL_TYPES} onChange={setMealType} />
          <TextField label="Date" type="date" value={date} onChange={setDate} />
          <TextField label="Departure time" type="time" value={departTime} onChange={setDepartTime} />
          <SelectField label="Vehicle" value={vehicleId} options={vehicleOptions} onChange={setVehicleId} />
          <SelectField label="Driver" value={driverId} options={driverOptions} onChange={setDriverId} />
        </div>

        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Delivery stops ({selected.length})
            </span>
          </div>
          <div className="p-3">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search participants by name or address"
                className="pl-8"
              />
            </div>
            {selected.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selected.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {p.name}
                    <button type="button" onClick={() => toggle(p.id)} aria-label={`Remove ${p.name}`}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <ScrollArea className="h-44 rounded-md border border-border">
              <div className="divide-y divide-border">
                {addable.map((p) => {
                  const on = selectedIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 data-[on=true]:bg-accent/50"
                      data-on={on}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.address}
                        </span>
                      </span>
                      <span
                        className={
                          on
                            ? 'text-[11px] font-medium text-primary'
                            : 'text-[11px] text-muted-foreground'
                        }
                      >
                        {on ? 'Added' : 'Add'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !centerId || selectedIds.length === 0}>
            {saving ? 'Creating…' : `Create run (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
