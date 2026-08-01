'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type Theme = 'light' | 'dark' | 'onlok' | 'evergreen' | 'sunrise'

export const THEMES: { id: Theme; label: string; hint: string; swatch: string[] }[] = [
  { id: 'light', label: 'Clinical Light', hint: 'Cool medical blue', swatch: ['#f5f7fa', '#2f6fed', '#38bdf8'] },
  { id: 'dark', label: 'Clinical Dark', hint: 'Low-light dispatch', swatch: ['#1b2130', '#4d8bf5', '#37c4d6'] },
  { id: 'onlok', label: 'On Lok', hint: 'Teal & green care', swatch: ['#f2fcfa', '#135b55', '#f59e42'] },
  { id: 'evergreen', label: 'Evergreen', hint: 'Warm forest calm', swatch: ['#f6f8f1', '#2f6b46', '#e0a341'] },
  { id: 'sunrise', label: 'Sunrise', hint: 'Warm coral & teal', swatch: ['#fdf7f1', '#d5713f', '#128b86'] },
]

const THEME_IDS: Theme[] = THEMES.map((t) => t.id)
const THEME_CLASS_LIST = THEME_IDS.join("','")

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  themes: typeof THEMES
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'fleetcare-theme'

// Inline script (stringified) that runs before hydration to set the initial
// theme class and avoid a flash of the wrong theme.
export const themeInitScript = `(function(){try{var ids=['${THEME_CLASS_LIST}'];var t=localStorage.getItem('${STORAGE_KEY}');if(!t||ids.indexOf(t)===-1){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var d=document.documentElement;d.classList.remove.apply(d.classList,ids);d.classList.add(t);d.style.colorScheme=(t==='dark'?'dark':'light');}catch(e){}})();`

function readInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    for (const id of THEME_IDS) {
      if (document.documentElement.classList.contains(id)) return id
    }
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  const apply = useCallback((t: Theme) => {
    const d = document.documentElement
    d.classList.remove(...THEME_IDS)
    d.classList.add(t)
    d.style.colorScheme = 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      // ignore write failures (private mode, etc.)
    }
  }, [])

  useEffect(() => {
    // Sync state with whatever the pre-hydration script applied.
    setThemeState(readInitialTheme())
  }, [])

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t)
      apply(t)
    },
    [apply],
  )

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      // Cycle through all available themes in order.
      const idx = THEME_IDS.indexOf(prev)
      const next = THEME_IDS[(idx + 1) % THEME_IDS.length]
      apply(next)
      return next
    })
  }, [apply])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, themes: THEMES }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
