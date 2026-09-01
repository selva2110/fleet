'use client'

import { useEffect, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/context/theme-provider'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/components/context/language-provider'

export function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme()
  const {t} = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by only rendering the interactive menu after mount.
  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled aria-label={t('common.themepicker')}>
        <Palette className="size-4" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            // variant="outline"
            size="icon"
            aria-label={t('common.choosetheme')}
            title={t('common.choosetheme')}
            className="bg-transparent text-sidebar-ring border-sidebar-ring border"
          >
            <Palette className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('common.appearance')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {themes.map((item) => {
            const active = item.id === theme
            return (
              <DropdownMenuItem
                key={item.id}
                onClick={() => setTheme(item.id)}
                className={cn('gap-3 py-2', active && 'bg-accent/60 text-accent-foreground')}
              >
                <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
                  {item.swatch.map((c, i) => (
                    <span
                      key={i}
                      className="size-3.5 rounded-full ring-1 ring-black/25"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-medium">{t(item.label)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t(item.hint)}</span>
                </span>
                <Check className={cn('size-4 shrink-0', active ? 'opacity-100 text-primary' : 'opacity-0')} />
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
