'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLogout } from '../../../hooks/useLogout'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export default function SignOutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { logout, isLoading } = useLogout()
  const [isSignedOut, setIsSignedOut] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      setIsSignedOut(true)
      // Redirect to home after a brief delay
      const timer = setTimeout(() => {
        router.push('/')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status, router])

  const handleSignOut = async () => {
    await logout(false)
    setIsSignedOut(true)
  }

  const handleCancel = () => {
    router.back()
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (isSignedOut || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You've been signed out</h2>
          <p className="text-gray-600 mb-4">Thank you for using Resume Web App!</p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign out of your account?</h2>
          <p className="text-gray-600 mb-6">
            You will be signed out of Resume Web App and redirected to the home page.
          </p>
          
          {session?.user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                Signed in as: <span className="font-medium">{session.user.email}</span>
              </p>
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
            
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                'Sign Out'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
