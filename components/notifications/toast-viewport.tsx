'use client'

import { Toast } from '@/components/notifications/toast'
import { useNotifications } from '@/components/context/notification-provider'

export function ToastViewport() {
  const { toasts, dismissToast } = useNotifications()

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-60 flex flex-col items-center gap-2 px-4 md:items-end md:px-6">
      {toasts.map((notification) => (
        <Toast key={notification.id} notification={notification} onDismiss={() => dismissToast(notification.id)} />
      ))}
    </div>
  )
}
