/**
 * Shared TypeScript types for the Eddyson Aromin portfolio.
 * Mirrors the Laravel API contract (backend/routes/api.php + models).
 */

export interface Project {
  id: number
  title: string
  slug: string
  category: 'personal' | 'academic'
  type:
    | 'documentation'
    | 'ai-tools'
    | 'game'
    | 'web-app'
    | 'ml-data'
    | 'ar-mobile'
    | 'networking'
  summary: string
  tagline: string | null
  description: string | null
  role: string | null
  year: string | null
  featured: boolean
  technologies: string[]
  url: string | null
  source_url: string | null
  image_url: string | null
  favicon_url: string | null
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

export interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  tags: string[] | null
  published_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ContactPayload {
  name: string
  email: string
  subject?: string
  message: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

/** Profile — personal details shown across the site (static by design). */
export interface Profile {
  name: string
  fullName: string
  tagline: string
  role: string
  degree: string
  university: string
  location: string
  email: string
  phone: string
  github: string
  linkedin: string
  portfolio: string
  languages: string[]
  bio: string[]
  available: string
}
