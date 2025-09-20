export interface User {
  _id?: string
  email: string
  password?: string
  name: string
  createdAt: Date
  updatedAt: Date
  emailVerified?: Date
  image?: string
}

export interface Profile {
  _id?: string
  userId: string
  personalInfo: {
    fullName: string
    email: string
    phone?: string
    location?: string
    linkedin?: string
    website?: string
    summary?: string
  }
  skills: {
    technical: string[]
    soft: string[]
    languages: { name: string; level: string }[]
  }
  experience: {
    id: string
    title: string
    company: string
    location?: string
    startDate: Date
    endDate?: Date
    isCurrent: boolean
    description: string
    achievements: string[]
  }[]
  education: {
    id: string
    degree: string
    institution: string
    location?: string
    startDate: Date
    endDate?: Date
    gpa?: string
    description?: string
  }[]
  projects: {
    id: string
    name: string
    description: string
    technologies: string[]
    url?: string
    repository?: string
    startDate: Date
    endDate?: Date
  }[]
  certifications: {
    id: string
    name: string
    issuer: string
    issueDate: Date
    expirationDate?: Date
    credentialId?: string
    url?: string
  }[]
  customTags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface JobMatch {
  _id?: string
  userId: string
  jobTitle: string
  company: string
  jobDescription: string
  requirements: string[]
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  suggestions: string[]
  generatedCV?: string
  appliedAt?: Date
  status: 'pending' | 'applied' | 'rejected' | 'interview' | 'offer'
  createdAt: Date
  updatedAt: Date
}

export interface AIAnalysis {
  _id?: string
  userId: string
  profileId: string
  analysisType: 'profile_gaps' | 'skill_recommendations' | 'cv_optimization'
  input: any
  suggestions: string[]
  confidence: number
  createdAt: Date
}
