'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileData } from '../../lib/validations'
import { generateId } from '../../lib/utils'
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function Profile() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
    clearErrors,
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      personalInfo: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
        summary: '',
      },
      skills: {
        technical: [],
        soft: [],
        languages: [],
      },
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      customTags: [],
    },
  })

  const watchedValues = watch()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const profile = await response.json()
        
        // Convert date strings back to Date objects for form inputs
        const processDateFields = (data: any) => {
          const processed = { ...data }
          
          // Helper function to format date for HTML date input (YYYY-MM-DD)
          const formatDateForInput = (dateValue: any) => {
            if (!dateValue) return null
            try {
              const date = new Date(dateValue)
              if (isNaN(date.getTime())) return null
              return date.toISOString().split('T')[0] // Convert to YYYY-MM-DD format
            } catch {
              return null
            }
          }
          
          // Process experience dates
          if (processed.experience) {
            processed.experience = processed.experience.map((exp: any) => ({
              ...exp,
              startDate: formatDateForInput(exp.startDate),
              endDate: formatDateForInput(exp.endDate),
            }))
          }
          
          // Process education dates
          if (processed.education) {
            processed.education = processed.education.map((edu: any) => ({
              ...edu,
              startDate: formatDateForInput(edu.startDate),
              endDate: formatDateForInput(edu.endDate),
            }))
          }
          
          // Process project dates
          if (processed.projects) {
            processed.projects = processed.projects.map((project: any) => ({
              ...project,
              startDate: formatDateForInput(project.startDate),
              endDate: formatDateForInput(project.endDate),
            }))
          }
          
          // Process certification dates
          if (processed.certifications) {
            processed.certifications = processed.certifications.map((cert: any) => ({
              ...cert,
              issueDate: formatDateForInput(cert.issueDate),
              expirationDate: formatDateForInput(cert.expirationDate),
            }))
          }
          
          return processed
        }
        
        const processedProfile = processDateFields(profile)
        
        // Set form values
        Object.keys(processedProfile).forEach((key) => {
          if (key !== '_id' && key !== 'userId' && key !== 'createdAt' && key !== 'updatedAt') {
            setValue(key as any, processedProfile[key])
          }
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ProfileData) => {
    console.log('Form submitted with data:', data)
    console.log('Form errors:', errors)
    setSaving(true)
    setMessage('')

    try {
      // Helper function to convert date strings to Date objects
      const convertDatesToObjects = (item: any) => {
        const converted = { ...item }
        
        // Convert startDate
        if (converted.startDate && typeof converted.startDate === 'string') {
          converted.startDate = new Date(converted.startDate)
        }
        
        // Convert endDate (but keep null for current jobs)
        if (converted.endDate && typeof converted.endDate === 'string') {
          converted.endDate = new Date(converted.endDate)
        }
        
        // Convert issueDate (for certifications)
        if (converted.issueDate && typeof converted.issueDate === 'string') {
          converted.issueDate = new Date(converted.issueDate)
        }
        
        // Convert expirationDate (for certifications)
        if (converted.expirationDate && typeof converted.expirationDate === 'string') {
          converted.expirationDate = new Date(converted.expirationDate)
        }
        
        return converted
      }

      // Clean and validate experience entries
      const validExperiences = data.experience
        .filter(exp => exp.title.trim() !== '' && exp.company.trim() !== '')
        .map(exp => {
          const cleanExp = convertDatesToObjects(exp);
          
          // If current job, always remove end date
          if (exp.isCurrent) {
            cleanExp.endDate = null;
          }
          
          return cleanExp;
        })
        // Only include experiences that are either current OR have an end date
        .filter(exp => exp.isCurrent || exp.endDate);

      const cleanedData = {
        ...data,
        experience: validExperiences,
        education: data.education
          .filter(edu => edu.degree.trim() !== '' && edu.institution.trim() !== '')
          .map(convertDatesToObjects),
        projects: data.projects
          .filter(proj => proj.name.trim() !== '')
          .map(convertDatesToObjects),
        certifications: data.certifications
          .filter(cert => cert.name.trim() !== '' && cert.issuer.trim() !== '')
          .map(convertDatesToObjects),
      }

      console.log('Cleaned data for submission:', cleanedData)

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      })

      console.log('API response status:', response.status)
      const responseData = await response.text()
      console.log('API response data:', responseData)

      if (response.ok) {
        setMessage('Profile saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(`Error saving profile: ${responseData}`)
      }
    } catch (error) {
      console.error('Save profile error:', error)
      setMessage('Error saving profile')
    } finally {
      setSaving(false)
    }
  }

  const addExperience = () => {
    const currentExperience = getValues('experience') || []
    const today = new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
    setValue('experience', [
      ...currentExperience,
      {
        id: generateId(),
        title: '',
        company: '',
        location: '',
        startDate: today as any, // Will be transformed by Zod
        endDate: null,
        isCurrent: false,
        description: '',
        achievements: [],
      },
    ])
  }

  const removeExperience = (index: number) => {
    const currentExperience = getValues('experience') || []
    setValue('experience', currentExperience.filter((_, i) => i !== index))
  }

  const addEducation = () => {
    const currentEducation = getValues('education') || []
    const today = new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
    setValue('education', [
      ...currentEducation,
      {
        id: generateId(),
        degree: '',
        institution: '',
        location: '',
        startDate: today as any, // Will be transformed by Zod
        endDate: null,
        gpa: '',
        description: '',
      },
    ])
  }

  const removeEducation = (index: number) => {
    const currentEducation = getValues('education') || []
    setValue('education', currentEducation.filter((_, i) => i !== index))
  }

  const addProject = () => {
    const currentProjects = getValues('projects') || []
    const today = new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
    setValue('projects', [
      ...currentProjects,
      {
        id: generateId(),
        name: '',
        description: '',
        technologies: [],
        url: '',
        repository: '',
        startDate: today as any, // Will be transformed by Zod
        endDate: null,
      },
    ])
  }

  const removeProject = (index: number) => {
    const currentProjects = getValues('projects') || []
    setValue('projects', currentProjects.filter((_, i) => i !== index))
  }

  const addProjectTechnology = (projectIndex: number) => {
    const techInput = document.getElementById(`project-${projectIndex}-tech-input`) as HTMLInputElement
    if (techInput && techInput.value.trim()) {
      const currentProjects = getValues('projects') || []
      const project = currentProjects[projectIndex]
      if (project) {
        project.technologies = [...(project.technologies || []), techInput.value.trim()]
        setValue('projects', currentProjects)
        techInput.value = ''
      }
    }
  }

  const removeProjectTechnology = (projectIndex: number, techIndex: number) => {
    const currentProjects = getValues('projects') || []
    const project = currentProjects[projectIndex]
    if (project) {
      project.technologies = project.technologies.filter((_, i) => i !== techIndex)
      setValue('projects', currentProjects)
    }
  }

  const addSkill = (type: 'technical' | 'soft') => {
    const skillInput = document.getElementById(`${type}-skill-input`) as HTMLInputElement
    if (skillInput && skillInput.value.trim()) {
      const currentSkills = getValues(`skills.${type}`) || []
      setValue(`skills.${type}`, [...currentSkills, skillInput.value.trim()])
      skillInput.value = ''
    }
  }

  const removeSkill = (type: 'technical' | 'soft', index: number) => {
    const currentSkills = getValues(`skills.${type}`) || []
    setValue(`skills.${type}`, currentSkills.filter((_, i) => i !== index))
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
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Profile Management</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  {...register('personalInfo.fullName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.personalInfo?.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.personalInfo.fullName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  {...register('personalInfo.email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.personalInfo?.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.personalInfo.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  {...register('personalInfo.phone')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  {...register('personalInfo.location')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn
                </label>
                <input
                  {...register('personalInfo.linkedin')}
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  {...register('personalInfo.website')}
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional Summary
              </label>
              <textarea
                {...register('personalInfo.summary')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Brief professional summary..."
              />
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Skills</h2>
            
            <div className="space-y-6">
              {/* Technical Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technical Skills
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="technical-skill-input"
                    type="text"
                    placeholder="Add a technical skill"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill('technical')
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addSkill('technical')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {watchedValues.skills?.technical?.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill('technical', index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Soft Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Soft Skills
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="soft-skill-input"
                    type="text"
                    placeholder="Add a soft skill"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill('soft')
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addSkill('soft')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {watchedValues.skills?.soft?.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill('soft', index)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Work Experience</h2>
              <button
                type="button"
                onClick={addExperience}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Experience
              </button>
            </div>
            
            <div className="space-y-6">
              {watchedValues.experience?.map((exp, index) => (
                <div key={exp.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-medium text-gray-900">Experience {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title *
                      </label>
                      <input
                        {...register(`experience.${index}.title`)}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company *
                      </label>
                      <input
                        {...register(`experience.${index}.company`)}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        {...register(`experience.${index}.location`)}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        {...register(`experience.${index}.startDate`, {
                          required: "Start date is required",
                        })}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="flex items-center">
                      <input
                        {...register(`experience.${index}.isCurrent`)}
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        onChange={(e) => {
                          // Clear end date when "This is my current job" is checked
                          if (e.target.checked) {
                            setValue(`experience.${index}.endDate`, null as any);
                            clearErrors(`experience.${index}.endDate`);
                          }
                        }}
                      />
                      <span className="ml-2 text-sm text-gray-700">This is my current job</span>
                    </label>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date {!watchedValues.experience?.[index]?.isCurrent && '*'}
                    </label>
                    <input
                      {...register(`experience.${index}.endDate`, {
                        required: !watchedValues.experience?.[index]?.isCurrent ? "End date is required for non-current positions" : false,
                      })}
                      type="date"
                      disabled={watchedValues.experience?.[index]?.isCurrent}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        watchedValues.experience?.[index]?.isCurrent 
                          ? 'bg-gray-100 cursor-not-allowed text-gray-500' 
                          : ''
                      }`}
                      placeholder={watchedValues.experience?.[index]?.isCurrent ? 'Current position - no end date' : ''}
                    />
                    {errors.experience?.[index]?.endDate && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.experience[index]?.endDate?.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      {...register(`experience.${index}.description`)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Describe your responsibilities and accomplishments..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Education</h2>
              <button
                type="button"
                onClick={addEducation}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Education
              </button>
            </div>
            
            <div className="space-y-6">
              {watchedValues.education?.map((edu, index) => (
                <div key={edu.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-medium text-gray-900">Education {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Degree *
                      </label>
                      <input
                        {...register(`education.${index}.degree`)}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Institution *
                      </label>
                      <input
                        {...register(`education.${index}.institution`)}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        {...register(`education.${index}.startDate`, {
                          required: "Start date is required",
                        })}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        {...register(`education.${index}.endDate`, {
                          required: "End date is required",
                        })}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Projects</h2>
              <button
                type="button"
                onClick={addProject}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </button>
            </div>
            
            <div className="space-y-6">
              {watchedValues.projects?.map((project, index) => (
                <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-medium text-gray-900">Project {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeProject(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Name *
                      </label>
                      <input
                        {...register(`projects.${index}.name`)}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {errors.projects?.[index]?.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.projects[index]?.name?.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project URL
                      </label>
                      <input
                        {...register(`projects.${index}.url`)}
                        type="url"
                        placeholder="https://project-demo.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repository URL
                      </label>
                      <input
                        {...register(`projects.${index}.repository`)}
                        type="url"
                        placeholder="https://github.com/username/repo"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        {...register(`projects.${index}.startDate`)}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date (Optional)
                      </label>
                      <input
                        {...register(`projects.${index}.endDate`)}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Description
                    </label>
                    <textarea
                      {...register(`projects.${index}.description`)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Describe the project, its purpose, and key features..."
                    />
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Technologies Used
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {project.technologies?.map((tech, techIndex) => (
                        <span
                          key={techIndex}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => removeProjectTechnology(index, techIndex)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        id={`project-${index}-tech-input`}
                        type="text"
                        placeholder="Enter technology (e.g., React, Node.js, MongoDB)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addProjectTechnology(index)
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addProjectTechnology(index)}
                        className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                console.log('Current form values:', getValues())
                console.log('Current form errors:', errors)
                console.log('Form is valid:', Object.keys(errors).length === 0)
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Debug Form
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
