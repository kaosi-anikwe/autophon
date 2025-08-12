import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch'
import { verifyToken } from '../../store/authSlice'

interface AppInitializerProps {
  children: React.ReactNode
}

export function AppInitializer({ children }: AppInitializerProps) {
  const dispatch = useAppDispatch()
  const { isLoading } = useAppSelector((state) => state.auth)

  useEffect(() => {
    // Try to verify existing session on app startup
    dispatch(verifyToken())
  }, [dispatch])

  // Show loading on initial app load while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}