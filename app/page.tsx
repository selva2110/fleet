'use client'

import { useEffect, useState } from 'react'
import { AuroraKpis } from '@/components/aurora/aurora-kpis'
import { AuroraMain } from '@/components/aurora/aurora-main'
import { AuroraWidgets } from '@/components/aurora/aurora-widgets'
import { AuroraAnalytics } from '@/components/aurora/aurora-analytics'
import { AuroraCalendars } from '@/components/aurora/aurora-calendars'
import { FadeIn } from '@/components/aurora/aurora-ui'
import { useAuroraData } from '@/components/aurora/use-aurora-data'

function useGreeting() {
  const [state, setState] = useState<{ greeting: string; time: string; date: string } | null>(null)
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = now.getHours()
      const greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'
      setState({
        greeting,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
      })
    }
    update()
    const id = setInterval(update, 1000 * 30)
    return () => clearInterval(id)
  }, [])
  return state
}

export default function DashboardPage() {
  const greeting = useGreeting()
  const data = useAuroraData()

  return (
    <div className="relative min-h-full bg-slate-950 text-slate-100">
      {/* Ambient neon backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 15% 0%, rgba(34,211,238,0.14), transparent 60%),' +
            'radial-gradient(55% 40% at 85% 5%, rgba(167,139,250,0.14), transparent 60%),' +
            'radial-gradient(70% 60% at 50% 110%, rgba(52,211,153,0.10), transparent 60%),' +
            'linear-gradient(180deg, #060a17 0%, #0b1120 55%, #060a17 100%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[1600px] px-3 pb-10 pt-5 sm:px-5">
        {/* Greeting header */}
        <FadeIn className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white text-balance sm:text-3xl">
              {greeting ? `${greeting.greeting}` : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Here&apos;s what&apos;s happening across your operations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {greeting ? (
              <div className="hidden text-right sm:block">
                <p className="font-mono text-2xl font-semibold tabular-nums text-white">{greeting.time}</p>
                <p className="text-xs text-slate-400">{greeting.date}</p>
              </div>
            ) : null}
          </div>
        </FadeIn>

        {/* KPI cards */}
        <div className="mt-6">
          <AuroraKpis items={data.kpis} />
        </div>

        {/* Schedule calendars: events, drivers, vehicles */}
        <FadeIn delay={0.08} className="mt-4">
          <AuroraCalendars />
        </FadeIn>

        {/* 70 / 30 main layout */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <FadeIn delay={0.1}>
            <AuroraMain />
          </FadeIn>
          <FadeIn delay={0.18}>
            <AuroraWidgets />
          </FadeIn>
        </div>

        {/* Analytics — real-data charts with axes (merged from Analytics page) */}
        <FadeIn delay={0.12} className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white">Analytics</h2>
            <span className="text-xs text-slate-400">Operational trends from live data</span>
          </div>
          <AuroraAnalytics />
        </FadeIn>
      </div>
    </div>
  )
}
