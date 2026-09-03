'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Rule } from '@/lib/rules/types'
import { toRuleJSONString } from '@/lib/rules/utils'

/**
 * Live, read-only preview of the serialized Rule JSON the planner consumes.
 * Re-renders on every edit so the drawer always mirrors the current draft.
 */
export function RuleJsonPreview({ rule }: { rule: Rule }) {
  const [copied, setCopied] = useState(false)
  const json = toRuleJSONString(rule)

  async function copy() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable in the preview sandbox — ignore.
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-sidebar-foreground/60">
          rule.json
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="h-6 gap-1.5 px-2 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="thin-scrollbar min-h-0 flex-1 overflow-auto p-3 font-mono text-[11.5px] leading-relaxed text-sidebar-foreground/90">
        {json}
      </pre>
    </div>
  )
}
