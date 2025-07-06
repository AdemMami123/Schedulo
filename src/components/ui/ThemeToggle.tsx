'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef } from 'react';

interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'dropdown';
  className?: string;
}

export function ThemeToggle({ variant = 'default', className = '' }: ThemeToggleProps) {
  const { theme, effectiveTheme, toggleTheme, setTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="h-5 w-5 group-hover:rotate-12 transition-transform duration-200" />;
      case 'dark':
        return <MoonIcon className="h-5 w-5 group-hover:rotate-12 transition-transform duration-200" />;
      case 'system':
        return <ComputerDesktopIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />;
      default:
        return <SunIcon className="h-5 w-5 group-hover:rotate-12 transition-transform duration-200" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light mode';
      case 'dark':
        return 'Dark mode';
      case 'system':
        return `System (${effectiveTheme})`;
      default:
        return 'Light mode';
    }
  };

  if (variant === 'dropdown') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${className}`}
          aria-label={`Current theme: ${getThemeLabel()}`}
          title={getThemeLabel()}
        >
          {getThemeIcon()}
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="py-1">
              <button
                onClick={() => {
                  setTheme('light');
                  setShowDropdown(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                  theme === 'light' ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                <SunIcon className="h-4 w-4" />
                <span>Light</span>
              </button>
              <button
                onClick={() => {
                  setTheme('dark');
                  setShowDropdown(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                  theme === 'dark' ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                <MoonIcon className="h-4 w-4" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => {
                  setTheme('system');
                  setShowDropdown(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                  theme === 'system' ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                <ComputerDesktopIcon className="h-4 w-4" />
                <span>System</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group ${className}`}
        aria-label={`Switch theme (current: ${getThemeLabel()})`}
        title={getThemeLabel()}
      >
        {getThemeIcon()}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${className}`}
      aria-label={`Switch theme (current: ${getThemeLabel()})`}
      title={getThemeLabel()}
    >
      <div className="relative">
        {getThemeIcon()}
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-current opacity-0 group-hover:opacity-10 transition-opacity duration-200 scale-150" />
      </div>
    </button>
  );
}
