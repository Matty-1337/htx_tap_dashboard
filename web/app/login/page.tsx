'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

  // Redirect to melrose by default, or show landing page with links
  useEffect(() => {
    // Option: Auto-redirect to /melrose
    // router.push('/melrose')
  }, [router])

  // Handle client selection with host-aware navigation
  const handleClientClick = (e: React.MouseEvent<HTMLAnchorElement>, clientId: string) => {
    const hostname = window.location.hostname
    
    // If on admin host, navigate to client subdomain
    if (hostname.startsWith('admin.')) {
      e.preventDefault()
      window.location.href = `https://${clientId}.htxtap.com`
      return
    }
    
    // Otherwise, let the Link component handle navigation normally
    // (it will use relative path /melrose, /bestregard, /fancy)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            HTX TAP Analytics
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Select your client to continue
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            href="/melrose"
            onClick={(e) => handleClientClick(e, 'melrose')}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Melrose
          </Link>
          <Link
            href="/bestregard"
            onClick={(e) => handleClientClick(e, 'bestregard')}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Bestregard
          </Link>
          <Link
            href="/fancy"
            onClick={(e) => handleClientClick(e, 'fancy')}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Fancy
          </Link>
        </div>
      </div>
    </div>
  )
}
