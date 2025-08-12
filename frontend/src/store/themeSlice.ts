import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  resolvedTheme: 'light' | 'dark'
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem('theme') as ThemeMode) || 'system'
}

const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme()
  }
  return mode
}

const initialState: ThemeState = {
  mode: getStoredTheme(),
  resolvedTheme: resolveTheme(getStoredTheme())
}

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload
      state.resolvedTheme = resolveTheme(action.payload)
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', action.payload)
        
        // Apply theme to document
        const root = document.documentElement
        if (state.resolvedTheme === 'dark') {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    },
    toggleTheme: (state) => {
      const newMode: ThemeMode = state.mode === 'light' ? 'dark' : state.mode === 'dark' ? 'system' : 'light'
      state.mode = newMode
      state.resolvedTheme = resolveTheme(newMode)
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', newMode)
        
        // Apply theme to document
        const root = document.documentElement
        if (state.resolvedTheme === 'dark') {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    },
    updateSystemTheme: (state) => {
      if (state.mode === 'system') {
        const systemTheme = getSystemTheme()
        if (state.resolvedTheme !== systemTheme) {
          state.resolvedTheme = systemTheme
          
          if (typeof window !== 'undefined') {
            const root = document.documentElement
            if (state.resolvedTheme === 'dark') {
              root.classList.add('dark')
            } else {
              root.classList.remove('dark')
            }
          }
        }
      }
    }
  }
})

export const { setTheme, toggleTheme, updateSystemTheme } = themeSlice.actions

export default themeSlice.reducer