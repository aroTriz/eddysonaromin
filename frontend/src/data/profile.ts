import type { Profile } from '@/types'

/**
 * Static profile data for Eddyson Tristan Aromin.
 * Kept here as the single source of truth for personal details.
 */
export const profile: Profile = {
  name: 'Eddyson Tristan Aromin',
  fullName: 'Eddyson Tristan Aromin',
  tagline: 'BS Information Technology graduate from Saint Louis University Baguio. Skilled in Software Development, Web Development, Database Management, System Administration, Data Analytics, and Quality Assurance. Eager to launch my professional career, continuously learn, and contribute to impactful projects.',
  role: 'Junior Front-End Developer',
  degree: 'BS Information Technology',
  university: 'Saint Louis University',
  location: 'Quezon City, Metro Manila, Philippines 1103',
  email: 'aromintristan@gmail.com',
  phone: '+63 945 261 6251',
  github: 'https://github.com/EddysonA15',
  linkedin: 'https://linkedin.com/in/eddyson-tristan-aromin-2956992a1',
  portfolio: 'eddysona15.github.io',
  languages: ['English (Fluent)', 'Filipino (Fluent)'],
  bio: [
    "I'm a Full-Stack Engineer with experience building modern web applications in Agile teams. I've worked with multiple clients and have a background in software development, databases, system administration, data analytics, and QA.",
    "These days, I'm focused on expanding my expertise in AI automation and AI engineering while building solutions that make an impact.",
    'I am a BS Information Technology graduate from Saint Louis University Baguio — open to onsite, hybrid, or remote roles and willing to work overseas with or without visa sponsorship. Let\'s build something great together.',
  ],
  available: 'Available for freelance, Contract, Full time, Remote',
}

/** Experience timeline — rendered on Home + Experience views. */
export interface ExperienceEntry {
  period: string
  /** Short year label for compact rows (e.g. "2025" or "2025 — 2026"). */
  year: string
  tag: 'Professional' | 'Internship'
  title: string
  company: string
  /** Company logo path (from the Resume project) — shown on /experience. */
  logo?: string
  description: string
  highlights: string[]
}

export const experiences: ExperienceEntry[] = [
  {
    period: 'Nov 2025 — Jun 2026',
    year: '2025 — 2026',
    tag: 'Professional',
    title: 'Junior Front-End Developer',
    company: 'PRAXXYS SOLUTIONS',
    logo: '/images/logos/praxxys-logo.png',
    description:
      'Working in an Agile/Fast Phased development environment. Developing user interfaces that match designs exactly using modern frameworks. Collaborating on mobile and web development with AI research and innovation.',
    highlights: [
      'Developed UIs matching designs exactly using Vue, Nuxt, Ionic, Flutter, TypeScript, Tailwind, and Laravel',
      'Backend API integration and client demonstrations',
      'Bug finding, QA, and maintaining coding standards',
      'AI Research and Innovation initiatives',
      'Maintained consistency and efficiency across all outputs',
    ],
  },
  {
    period: 'Jan — Apr 2025',
    year: '2025',
    tag: 'Internship',
    title: 'Quality Assurance Analyst & Business Application Developer',
    company: 'NOAH BUSINESS APPLICATION',
    logo: '/images/logos/noah-logo.png',
    description:
      'University Internship at Makati City, Metro Manila. Ensured system features and elements met company standards through rigorous testing and documentation.',
    highlights: [
      'Careful testing of system features and functionality',
      'Bug finding and issue identification',
      'Documenting issues and maintaining consistency across outputs',
      'Ensured all features met company quality standards',
    ],
  },
]

export interface EducationEntry {
  period: string
  tag: string
  title: string
  school: string
  /** School logo path (from the Resume project) — shown on /experience. */
  logo?: string
  detail: string
}

export const education: EducationEntry[] = [
  {
    period: '2021 — 2025',
    tag: 'Graduated',
    title: 'BS Information Technology',
    school: 'Saint Louis University',
    logo: '/images/logos/slu-logo.svg',
    detail: 'SAMCIS | Bachelor of Science in Information Technology. Baguio City, Benguet, Philippines.',
  },
]

/** Stack — technologies, grouped. */
export interface StackGroup {
  label: string
  items: string[]
}

export const stackGroups: StackGroup[] = [
  {
    label: 'Frontend',
    items: [
      'Vue',
      'Nuxt',
      'Ionic',
      'TypeScript',
      'JavaScript',
      'Bootstrap',
      'HTML',
      'CSS',
    ],
  },
  {
    label: 'Backend',
    items: ['Laravel', 'PHP', 'Node.js', 'MySQL', 'SQLite', 'WordPress', 'Joomla'],
  },
  {
    label: 'Mobile & Desktop',
    items: ['Flutter', 'Kotlin', 'Android Studio', 'C#', 'Unity', 'C++', 'C', 'Java'],
  },
  {
    label: 'AI & Data',
    items: ['Python', 'Machine Learning', 'Data Analytics', 'SQL'],
  },
  {
    label: 'Design & Tools',
    items: ['Figma', 'Canva', 'Git'],
  },
]

/** All technologies, flat — used for the marquee. */
export const allTechnologies: string[] = [
  'Vue',
  'Nuxt',
  'Laravel',
  'Ionic',
  'Flutter',
  'WordPress',
  'Joomla',
  'PHP',
  'Node.js',
  'Java',
  'Python',
  'Kotlin',
  'C#',
  'Unity',
  'TypeScript',
  'Bootstrap',
  'Figma',
  'C++',
  'C',
  'Canva',
  'MySQL',
  'SQLite',
  'Android Studio',
  'Git',
  'HTML',
  'CSS',
  'JavaScript',
]

/** Core competencies — key areas of expertise. */
export interface Competency {
  title: string
  description: string
}

export const competencies: Competency[] = [
  {
    title: 'Full-Stack Web Development',
    description:
      'HTML, CSS, JavaScript, TypeScript, PHP, Node.js, WordPress, Joomla. Building responsive and dynamic web applications.',
  },
  {
    title: 'Software & Mobile Dev',
    description:
      'C, C++, C#, Java, Python, Kotlin, Luau. Mobile development with Android Studio and Unity for cross-platform solutions.',
  },
  {
    title: 'Data Management',
    description:
      'MySQL, CSV/XLSX data processing. Database design, query optimization, and data management for applications.',
  },
  {
    title: 'Web Design & UX',
    description:
      'Figma, Canva, Bootstrap, Wireframing, Prototyping, UI/UX principles. Creating intuitive and accessible interfaces.',
  },
  {
    title: 'Quality Assurance',
    description:
      'Software testing, test case creation, bug tracking, regression testing, performance testing, documentation review.',
  },
  {
    title: 'Emerging Technology',
    description:
      'Augmented Reality, Unity 3D, AR Foundation, Vuforia, 3D modeling, IoT. Exploring cutting-edge tech solutions.',
  },
]

/** Certifications & affiliations. */
export interface Certification {
  title: string
  issuer: string
  year: string
}

export const certifications: Certification[] = [
  {
    title: 'Bachelor of Science in Information Technology',
    issuer: 'Saint Louis University (SAMCIS)',
    year: '2025',
  },
  {
    title: 'Agile & Fast-Phased Development',
    issuer: 'PRAXXYS SOLUTIONS',
    year: '2026',
  },
  {
    title: 'Quality Assurance & Testing',
    issuer: 'NOAH Business Application',
    year: '2025',
  },
]

export interface Affiliation {
  org: string
  role: string
  detail: string
}

export const affiliations: Affiliation[] = [
  {
    org: 'MyVirtual Learning',
    role: 'Developer Connection',
    detail: 'Connected with the founder via the ISakay / capstone mentorship community.',
  },
  {
    org: 'PRAXXYS Solutions',
    role: 'Junior Front-End Developer',
    detail: 'Agile development team — web & mobile engineering with AI research.',
  },
  {
    org: 'SLU — SAMCIS',
    role: 'BSIT Alumni',
    detail: 'School of Accountancy, Management, Computing and Information Studies.',
  },
]

/** References. */
export interface Reference {
  initials: string
  name: string
  title: string
  email: string | null
}

export const references: Reference[] = [
  {
    initials: 'BB',
    name: 'Britannyy Baldovino',
    title: 'University Instructor — Saint Louis University',
    email: 'bmbaldovino@slu.edu.ph',
  },
  {
    initials: 'LF',
    name: 'Lambert Famorca',
    title: 'University Instructor — Saint Louis University',
    email: 'support@myvirtuallearning.org',
  },
]

/** Recommendations shown on home — bryllim-style equal-size cards. */
export interface Recommendation {
  initials: string
  quote: string
  author: string
  role: string
  email?: string | null
}

export const recommendations: Recommendation[] = [
  {
    initials: 'LF',
    quote:
      '"Eddyson is a dedicated and talented developer. His capstone project demonstrated exceptional technical skill and problem-solving ability. He consistently delivers quality work."',
    author: 'Lambert Famorca',
    role: 'Instructor, SLU · Founder, MyVirtual Learning',
  },
  {
    initials: 'BB',
    quote:
      '"Eddyson consistently delivered polished, responsive interfaces that matched the designs exactly. His attention to detail and reliable output made him a pleasure to work with."',
    author: 'Britannyy Baldovino',
    role: 'University Instructor — Saint Louis University',
  },
  {
    initials: 'PS',
    quote:
      '"A dependable developer who integrated APIs cleanly and kept quality high in a fast-paced environment. Always proactive, always on time."',
    author: 'PRAXXYS Solutions Team',
    role: 'Agile Development — Junior Front-End Developer',
  },
  {
    initials: 'NO',
    quote:
      '"His QA discipline was exceptional — thorough test cases, clear documentation, and a sharp eye for bugs that others missed. Features shipped better because of him."',
    author: 'NOAH Business Application',
    role: 'QA Internship — Makati City',
  },
  {
    initials: 'IS',
    quote:
      '"As project lead on ISakay, Eddyson owned the full stack — from database design to the booking flow. He kept the team on schedule and the codebase clean."',
    author: 'ISakay Capstone Team',
    role: 'Transportation Ticketing Web App',
  },
  {
    initials: 'AR',
    quote:
      '"Bringing ARventure to life took real grit — offline AR navigation is hard. Eddyson pushed through every tracking issue and shipped a working demo."',
    author: 'ARventure Team',
    role: 'Augmented Reality Project — Unity',
  },
]

/** Legacy single-recommendation export kept for compatibility. */
export const recommendation = recommendations[0]

/** Home stats. */
export const stats = [
  { value: '2025', label: 'Year Graduated' },
  { value: '10', label: 'Projects Built' },
  { value: '1', label: 'Internship Completed' },
  { value: '1+', label: 'Years of Experience' },
  { value: '27', label: 'Technologies' },
]

/** Interests — beyond the code. */
export const interests = [
  'Open Source',
  'Photography',
  'Gaming',
  'Music',
  'Travel',
  'Reading',
  'AI / ML',
  'Cycling',
]
