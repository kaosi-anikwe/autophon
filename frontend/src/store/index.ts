import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import themeReducer from './themeSlice'
import siteStatusReducer from './siteStatusSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    siteStatus: siteStatusReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch