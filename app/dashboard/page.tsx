'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, FileText, TrendingUp, Settings } from 'lucide-react'
import LogoutButton from '../../components/LogoutButton'

interface JobMatch {
  _id: string
  jobTitle: string
  company: string
  matchScore: number
  status: string
  createdAt: string
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchJobMatches()
    }
  }, [status, router])

  const fetchJobMatches = async () => {
    try {
      const response = await fetch('/api/jobs/match')
      if (response.ok) {
        const matches = await response.json()
        setJobMatches(matches)
      }
    } catch (error) {
      console.error('Error fetching job matches:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Resume Web App</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session.user?.name}</span>
              <Link
                href="/settings"
                className="text-gray-500 hover:text-gray-700"
              >
                Settings
              </Link>
              <LogoutButton 
                variant="link" 
                showConfirm={true}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link
              href="/profile"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Profile Management
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Update your profile
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/job-matching"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Job Matching
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Find matching jobs
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Recent Matches
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {jobMatches.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Job Matches
              </h3>
              {jobMatches.length === 0 ? (
                <p className="text-gray-500">
                  No job matches yet. Create a profile and start matching with jobs!
                </p>
              ) : (
                <div className="space-y-4">
                  {jobMatches.slice(0, 5).map((match) => (
                    <div
                      key={match._id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-md font-medium text-gray-900">
                            {match.jobTitle}
                          </h4>
                          <p className="text-sm text-gray-500">{match.company}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(match.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              match.matchScore >= 80
                                ? 'bg-green-100 text-green-800'
                                : match.matchScore >= 60
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {match.matchScore}% match
                          </span>
                          <p className="text-xs text-gray-500 mt-1 capitalize">
                            {match.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
