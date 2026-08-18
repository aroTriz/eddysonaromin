/**
 * Shared TypeScript types for the Eddyson Aromin portfolio.
 * Mirrors the Laravel API contract (backend/routes/api.php + models).
 */

export interface Project {
  id: number
  title: string
  slug: string
  category: 'personal' | 'academic' | 'professional'
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
  /** Device-screenshot config: laptop & phone screen URLs for the showcase. */
  showcase: ProjectShowcase | null
  archived_at: string | null
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

/** DeviceShowcase config — which laptop / phone media a project renders. */
export interface ProjectShowcase {
  laptops: ShowcaseMedia[]
  phones: ShowcaseMedia[]
}

/**
 * One device-showcase media entry: either a legacy URL string (an image) or
 * an uploaded media object tagged with its kind ("image" | "video").
 */
export type ShowcaseMedia = string | { src: string; kind: 'image' | 'video' }

export interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  images: string[] | null
  tags: string[] | null
  published_at: string | null
  archived_at: string | null
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

/** Tech-stack category (mirrors the Laravel StackGroup model). */
export interface StackGroup {
  id: number
  label: string
  items: string[]
  sort_order: number
  archived_at: string | null
  created_at: string | null
  updated_at: string | null
}

/** Testimonial card (mirrors the Laravel Recommendation model). */
export interface Recommendation {
  id: number
  initials: string
  quote: string
  author: string
  role: string
  email: string | null
  sort_order: number
  archived_at: string | null
  created_at: string | null
  updated_at: string | null
}

/** Experience / Education entry — stored in D1, managed via /aromin/experience. */
export interface ExperienceEntry {
  id: number
  type: 'experience' | 'education'
  period: string
  year: string
  tag: string
  title: string
  company: string
  logo_url: string | null
  website_url: string | null
  tooltip_desc: string | null
  albums: string[]
  certificates: string[]
  description: string
  highlights: string[]
  sort_order: number
  archived_at: string | null
  created_at: string | null
  updated_at: string | null
}

/** Profile — personal details shown across the site (static by design). */
export interface Profile {
  name: string
  fullName: string
  tagline: string
  role: string
  degree: string
  university: string
  /** Year professional work began — drives the "Years of Experience" stat. */
  graduationYear: number
  location: string
  hometown: string
  email: string
  phone: string
  github: string
  linkedin: string
  instagram: string
  portfolio: string
  languages: string[]
  bio: string[]
  available: string
}
