'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'fleetcare-theme'

// Inline script (stringified) that runs before hydration to set the initial
// theme class and avoid a flash of the wrong theme.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t);}catch(e){}})();`

function readInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('dark')) return 'dark'
    if (document.documentElement.classList.contains('light')) return 'light'
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  const apply = useCallback((t: Theme) => {
    const d = document.documentElement
    d.classList.remove('light', 'dark')
    d.classList.add(t)
    d.style.colorScheme = t
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
      const next = prev === 'dark' ? 'light' : 'dark'
      apply(next)
      return next
    })
  }, [apply])

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
