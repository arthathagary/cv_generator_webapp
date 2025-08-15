import { z } from 'zod'

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const profileSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().url().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
    summary: z.string().optional()
  }),
  skills: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
    languages: z.array(z.object({
      name: z.string(),
      level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Native'])
    }))
  }),
  experience: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company is required'),
    location: z.string().optional(),
    startDate: z.string().or(z.date()).transform((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    endDate: z.string().or(z.date()).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') {
        return null;
      }
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    isCurrent: z.boolean(),
    description: z.string(),
    achievements: z.array(z.string())
  })),
  education: z.array(z.object({
    id: z.string(),
    degree: z.string().min(1, 'Degree is required'),
    institution: z.string().min(1, 'Institution is required'),
    location: z.string().optional(),
    startDate: z.string().or(z.date()).transform((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    endDate: z.string().or(z.date()).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') {
        return null;
      }
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    gpa: z.string().optional(),
    description: z.string().optional()
  })),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Project name is required'),
    description: z.string(),
    technologies: z.array(z.string()),
    url: z.string().url().optional().or(z.literal('')),
    repository: z.string().url().optional().or(z.literal('')),
    startDate: z.string().or(z.date()).transform((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    endDate: z.string().or(z.date()).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') {
        return null;
      }
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    })
  })),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Certification name is required'),
    issuer: z.string().min(1, 'Issuer is required'),
    issueDate: z.string().or(z.date()).transform((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    expirationDate: z.string().or(z.date()).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') {
        return null;
      }
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    credentialId: z.string().optional(),
    url: z.string().url().optional().or(z.literal(''))
  })),
  customTags: z.array(z.string())
})

export type SignUpData = z.infer<typeof signUpSchema>
export type SignInData = z.infer<typeof signInSchema>
export type ProfileData = z.infer<typeof profileSchema>
