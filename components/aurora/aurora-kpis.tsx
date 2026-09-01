'use client'

import { motion } from "framer-motion";
import { Route } from "lucide-react";
import { GlassCard, TrendPill } from "./aurora-ui";
import { cn } from "@/lib/utils";
import { KpiItem } from "@/lib/aurora/types";
import { AuroraConfig } from "@/lib/aurora/config";
import { useTranslation } from "../context/language-provider";

export function AuroraKpis({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item, i) => (
        <KpiCard key={item.id} item={item} index={i} />
      ))}
    </div>
  )
}

function KpiCard({ item, index }: { item: KpiItem; index: number }) {
  const Icon = AuroraConfig.ICONS[item.icon] ?? Route
  const accent = AuroraConfig.accentClasses[item.accent]
  const {t} = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <GlassCard interactive className={cn('group h-full p-4', accent.glow)}>
        {/* accent wash */}
        <div
          className={cn(
            'pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-linear-to-br opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70',
            accent.from,
            'to-transparent',
          )}
        />
        <div className="relative flex items-start justify-between">
          <span
            className={cn(
              'flex size-9 items-center justify-center rounded-xl bg-muted/30 ring-1 ring-border/10',
              accent.text,
              accent.ring,
            )}
          >
            <Icon className="size-4" />
          </span>
          <TrendPill up={item.trendUp} value={item.trend} sublabel={item.trendSublabel}/>
        </div>

        <div className="relative mt-3">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{item.value}</p>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{t(item.label)}</p>
        </div>
      </GlassCard>
    </motion.div>
  )
}
