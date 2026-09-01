'use client'

import { useEffect, useState } from 'react'
import { AuroraKpis } from '@/components/aurora/aurora-kpis'
import { AuroraMain } from '@/components/aurora/aurora-main'
import { AuroraWidgets, TodaysOverview } from '@/components/aurora/aurora-widgets'
import { FadeIn } from '@/components/aurora/aurora-ui'
import { useAuroraData } from '@/components/aurora/use-aurora-data'
import { useTranslation } from '@/components/context/language-provider'
import { AuroraCalendars } from '@/components/aurora/aurora-calendars';

function useGreeting() {
  const [state, setState] = useState<{ greeting: string; time: string; date: string } | null>(null)
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = now.getHours()
      const greeting = h < 12 ? 'dash.goodmorning' : h < 17 ? 'dash.goodafternoon' : 'dash.goodevening';
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
  const {t} = useTranslation()
  const greeting = useGreeting()
  const data = useAuroraData()

  return (
    <div className="relative min-h-full bg-background text-foreground">

      <div className="relative mx-auto w-full max-w-[1600px] px-3 pb-10 pt-5 sm:px-5">
        {/* Greeting header */}
        <FadeIn className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground text-balance sm:text-3xl">
              {greeting ? t(greeting.greeting) : t("dash.welcomeback")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('dash.subtitle')}
            </p>
          </div>
        </FadeIn>

        {/* KPI cards */}
        <div className="mt-6">
          <AuroraKpis items={data.kpis} />
        </div>

        {/* Today's Overview — moved to the top for greater visibility */}
        <FadeIn delay={0.06} className="mt-4">
          <TodaysOverview />
        </FadeIn>

        {/* Schedule calendars: events, drivers, vehicles */}
        <FadeIn delay={0.08} className="mt-4">
          <AuroraCalendars />
        </FadeIn>

        {/* 70 / 30 main layout */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-stretch">
          <FadeIn delay={0.1} className="h-full">
            <AuroraMain />
          </FadeIn>
          <FadeIn delay={0.18} className="h-full">
            <AuroraWidgets />
          </FadeIn>
        </div>

        {/* Operations map removed — dashboard focuses on KPIs and schedule */}
      </div>
    </div>
  )
}
