'use client'

import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { NotificationsConfig } from '@/lib/notification/config';
import { AppNotification } from '@/lib/notification/types';

export function Toast({ notification, onDismiss }: { notification: AppNotification; onDismiss: () => void }) {
  return (
    <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur ${NotificationsConfig.kindStyles[notification.kind]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{notification.title}</p>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onDismiss}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
