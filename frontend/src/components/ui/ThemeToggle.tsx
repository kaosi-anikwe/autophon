import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`btn btn-ghost btn-circle ${className}`}
      title={`Switch to ${theme === 'autophon' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'autophon' ? 'dark' : 'light'} mode`}
    >
      {theme === 'autophon' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
      {showLabel && (
        <span className="ml-2">
          {theme === 'autophon' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

// Alternative toggle with switch style
export function ThemeSwitch({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <label className={`swap ${className}`}>
      <input
        type="checkbox"
        checked={theme === 'autophon-dark'}
        onChange={toggleTheme}
        className="sr-only"
      />
      
      {/* Sun icon */}
      <Sun className="swap-off w-5 h-5" />
      
      {/* Moon icon */}
      <Moon className="swap-on w-5 h-5" />
    </label>
  );
}

// Dropdown style theme selector
export function ThemeDropdown({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        {theme === 'autophon' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </div>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
        <li>
          <button
            onClick={() => setTheme('autophon')}
            className={theme === 'autophon' ? 'active' : ''}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
        </li>
        <li>
          <button
            onClick={() => setTheme('autophon-dark')}
            className={theme === 'autophon-dark' ? 'active' : ''}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
        </li>
      </ul>
    </div>
  );
}