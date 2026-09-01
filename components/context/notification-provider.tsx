'use client'

import { AppNotification, NotificationContextValue } from '@/lib/notification/types';
import { NotificationUtils } from '@/lib/notification/utils';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
 
const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<AppNotification[]>([])
  const timeoutIdsRef = useRef<Record<string, number>>({})

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((notification) => notification.id !== id))
    if (timeoutIdsRef.current[id]) {
      window.clearTimeout(timeoutIdsRef.current[id])
      delete timeoutIdsRef.current[id]
    }
  }, [])

  const addNotification = useCallback((input: Omit<AppNotification, 'id' | 'createdAt'>) => {
    const nextNotification: AppNotification = {
      ...input,
      id: NotificationUtils.createNotificationId(),
      createdAt: new Date().toISOString(),
    }

    setNotifications((current) => [nextNotification, ...current].slice(0, 20))

    if (timeoutIdsRef.current[nextNotification.id]) {
      window.clearTimeout(timeoutIdsRef.current[nextNotification.id])
    }

    timeoutIdsRef.current[nextNotification.id] = window.setTimeout(() => {
      dismissToast(nextNotification.id)
    }, 4000)
  }, [dismissToast])

  const addToast = useCallback((input: Omit<AppNotification, 'id' | 'createdAt'>) => {
    const nextToast: AppNotification = {
      ...input,
      id: NotificationUtils.createNotificationId(),
      createdAt: new Date().toISOString(),
    }

    setToasts((current) => [nextToast, ...current].slice(0, 3))

    if (timeoutIdsRef.current[nextToast.id]) {
      window.clearTimeout(timeoutIdsRef.current[nextToast.id])
    }

    timeoutIdsRef.current[nextToast.id] = window.setTimeout(() => {
      dismissToast(nextToast.id)
    }, 3000)
  }, [dismissToast])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id))
    dismissToast(id)
  }, [dismissToast])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    setToasts([])
    Object.values(timeoutIdsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId))
    timeoutIdsRef.current = {}
  }, [])

  useEffect(() => {
    return () => {
      Object.values(timeoutIdsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      toasts,
      addNotification,
      addToast,
      dismissNotification,
      dismissToast,
      clearNotifications,
    }),
    [addNotification, addToast, clearNotifications, dismissNotification, dismissToast, notifications, toasts],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}
