import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short'
  }).format(date)
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function sanitizeText(text: string): string {
  // Basic XSS protection
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function calculateMatchScore(userSkills: string[], jobRequirements: string[]): {
  score: number
  matchedSkills: string[]
  missingSkills: string[]
} {
  const normalizedUserSkills = userSkills.map(skill => skill.toLowerCase().trim())
  const normalizedJobRequirements = jobRequirements.map(req => req.toLowerCase().trim())
  
  const matchedSkills = normalizedJobRequirements.filter(req => 
    normalizedUserSkills.some(skill => 
      skill.includes(req) || req.includes(skill)
    )
  )
  
  const missingSkills = normalizedJobRequirements.filter(req => 
    !normalizedUserSkills.some(skill => 
      skill.includes(req) || req.includes(skill)
    )
  )
  
  const score = jobRequirements.length > 0 
    ? Math.round((matchedSkills.length / jobRequirements.length) * 100)
    : 0
  
  return {
    score,
    matchedSkills,
    missingSkills
  }
}
