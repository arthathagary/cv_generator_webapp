'use client'

import { useLogout } from '../hooks/useLogout'
import { LogOut } from 'lucide-react'

interface LogoutButtonProps {
  variant?: 'button' | 'link' | 'dropdown'
  showConfirm?: boolean
  className?: string
  children?: React.ReactNode
}

export default function LogoutButton({ 
  variant = 'button', 
  showConfirm = false,
  className = '',
  children 
}: LogoutButtonProps) {
  const { logout, isLoading } = useLogout()

  const handleLogout = () => {
    logout(showConfirm)
  }

  const baseClasses = 'flex items-center gap-2 transition-colors'
  
  const variantClasses = {
    button: 'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50',
    link: 'text-gray-500 hover:text-gray-700',
    dropdown: 'w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
  }

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`

  if (variant === 'button') {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={combinedClasses}
      >
        {isLoading ? (
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {children || (isLoading ? 'Signing out...' : 'Sign Out')}
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={combinedClasses}
    >
      {isLoading ? (
        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {children || (isLoading ? 'Signing out...' : 'Sign Out')}
    </button>
  )
}
