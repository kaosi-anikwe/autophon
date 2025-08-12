import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../store'
import { setTheme, toggleTheme, updateSystemTheme, type ThemeMode } from '../store/themeSlice'

export const useTheme = () => {
  const dispatch = useDispatch()
  const { mode, resolvedTheme } = useSelector((state: RootState) => state.theme)

  // Initialize theme on mount
  useEffect(() => {
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [resolvedTheme])

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      dispatch(updateSystemTheme())
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [dispatch])

  return {
    theme: mode,
    resolvedTheme,
    setTheme: (newTheme: ThemeMode) => dispatch(setTheme(newTheme)),
    toggleTheme: () => dispatch(toggleTheme()),
  }
}