'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { ArrowLeft, Search, TrendingUp } from 'lucide-react'

interface JobMatchData {
  jobTitle: string
  company: string
  jobDescription: string
  requirements: string
}

interface MatchResult {
  matchId: string
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  suggestions: string[]
}

export default function JobMatching() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobMatchData>()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const onSubmit = async (data: JobMatchData) => {
    setLoading(true)
    setError('')
    setMatchResult(null)

    try {
      // Convert requirements string to array
      const requirements = data.requirements
        .split(',')
        .map(req => req.trim())
        .filter(req => req.length > 0)

      const response = await fetch('/api/jobs/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          requirements,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setMatchResult(result)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error analyzing job match')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
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
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Job Matching</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Analyze Job Compatibility
          </h2>
          <p className="text-gray-600 mb-6">
            Paste job details below to see how well your profile matches the requirements.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  {...register('jobTitle', { required: 'Job title is required' })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Senior Software Engineer"
                />
                {errors.jobTitle && (
                  <p className="mt-1 text-sm text-red-600">{errors.jobTitle.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company *
                </label>
                <input
                  {...register('company', { required: 'Company is required' })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Google"
                />
                {errors.company && (
                  <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Description *
              </label>
              <textarea
                {...register('jobDescription', { required: 'Job description is required' })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Paste the full job description here..."
              />
              {errors.jobDescription && (
                <p className="mt-1 text-sm text-red-600">{errors.jobDescription.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Requirements *
              </label>
              <textarea
                {...register('requirements', { required: 'Requirements are required' })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="List key skills and requirements separated by commas (e.g., React, TypeScript, Node.js, AWS, 5+ years experience)"
              />
              {errors.requirements && (
                <p className="mt-1 text-sm text-red-600">{errors.requirements.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Separate requirements with commas for better analysis
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Search className="h-5 w-5 mr-2" />
                {loading ? 'Analyzing...' : 'Analyze Match'}
              </button>
            </div>
          </form>
        </div>

        {matchResult && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-6 w-6 text-indigo-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Match Analysis</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-3xl font-bold mb-2 ${
                  matchResult.matchScore >= 80 ? 'text-green-600' :
                  matchResult.matchScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {matchResult.matchScore}%
                </div>
                <p className="text-sm text-gray-600">Overall Match</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {matchResult.matchedSkills.length}
                </div>
                <p className="text-sm text-gray-600">Matched Skills</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {matchResult.missingSkills.length}
                </div>
                <p className="text-sm text-gray-600">Skills to Develop</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">
                  ✅ Matched Skills
                </h3>
                <div className="space-y-2">
                  {matchResult.matchedSkills.length > 0 ? (
                    matchResult.matchedSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm mr-2 mb-2"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No direct skill matches found</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">
                  📚 Skills to Develop
                </h3>
                <div className="space-y-2">
                  {matchResult.missingSkills.length > 0 ? (
                    matchResult.missingSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm mr-2 mb-2"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-green-600">Great! You have all the required skills</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">
                💡 AI Suggestions
              </h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <ul className="space-y-2">
                  {matchResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-blue-800">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                This analysis is saved to your dashboard. You can view all your job matches 
                and track your application progress there.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
