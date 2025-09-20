import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Handle logout redirect
    if (req.nextUrl.pathname === '/auth/signout' && !req.nextauth.token) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to signout page even when not authenticated
        if (req.nextUrl.pathname === '/auth/signout') {
          return true
        }
        
        // Protect other authenticated routes
        if (
          req.nextUrl.pathname.startsWith('/dashboard') ||
          req.nextUrl.pathname.startsWith('/profile') ||
          req.nextUrl.pathname.startsWith('/settings') ||
          req.nextUrl.pathname.startsWith('/job-matching')
        ) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/job-matching/:path*',
    '/auth/signout'
  ]
}
