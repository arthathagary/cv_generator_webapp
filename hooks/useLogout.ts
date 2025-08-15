import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export const useLogout = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const logout = async (showConfirm: boolean = false) => {
    if (showConfirm) {
      router.push('/auth/signout')
      return
    }

    try {
      setIsLoading(true)
      
      // Call our logout API to clean up any server-side sessions
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Clear any localStorage data
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }

      // Sign out using NextAuth
      await signOut({
        redirect: false,
        callbackUrl: '/'
      })

      // Redirect to home page
      router.push('/')
      
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, try to sign out
      await signOut({
        redirect: false,
        callbackUrl: '/'
      })
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  return { logout, isLoading }
}
