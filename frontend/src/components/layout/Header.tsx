import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch'
import { logout } from '../../store/authSlice'
import { ThemeToggle } from '../features/ThemeToggle'

export function Header() {
  const dispatch = useAppDispatch()
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
  }

  return (
    <header className="border-b bg-background shadow-sm fixed top-0 w-full z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-josefin font-bold text-primary flex items-center">
            <img 
              src="/favicon.png" 
              alt="Autophon" 
              className="w-6 h-6 mr-2"
            />
            Autophon
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6 font-josefin text-lg font-semibold">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" className="text-foreground hover:text-primary transition-colors">
                Aligner
              </Link>
            )}
            <Link to="/about" className="text-foreground hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/team" className="text-foreground hover:text-primary transition-colors">
              Team
            </Link>
            <Link to="/support" className="text-foreground hover:text-primary transition-colors">
              Support
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.first_name}
                </span>
                <Button variant="ghost" asChild>
                  <Link to="/profile">Profile</Link>
                </Button>
                <Button variant="ghost" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link to="/register">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}