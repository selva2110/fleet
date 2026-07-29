'use client'

import { Pause, Play } from 'lucide-react'
import { PageHeader } from '@/components/common'
import { MealDeliveryBoard } from '@/components/meals/meal-delivery-board'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useFleet } from '@/lib/store'

export default function MealDeliveryPage() {
  const fleet = useFleet()

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Meal Delivery"
        description="Collect prepared meals at a center and deliver them to participants' homes."
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium sm:flex">
              <span className="relative flex size-2">
                {fleet.simRunning ? (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                ) : null}
                <span
                  className={cn(
                    'relative inline-flex size-2 rounded-full',
                    fleet.simRunning ? 'bg-success' : 'bg-muted-foreground',
                  )}
                />
              </span>
              {fleet.simRunning ? 'Live · updating' : 'Paused'}
            </div>
            <Button variant="outline" size="sm" onClick={fleet.toggleSim}>
              {fleet.simRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
              {fleet.simRunning ? 'Pause' : 'Resume'}
            </Button>
          </div>
        }
      />
      <MealDeliveryBoard />
    </div>
  )
}
