import type { Profile } from '@/types'

/**
 * Static profile data for Eddyson Tristan Aromin.
 * Kept here as the single source of truth for personal details.
 */
export const profile: Profile = {
  name: 'Eddyson Tristan B. Aromin',
  fullName: 'Eddyson Tristan B. Aromin',
  tagline: 'BS Information Technology graduate from Saint Louis University Baguio. Skilled in Software Development, Web Development, Database Management, System Administration, Data Analytics, and Quality Assurance. Eager to launch my professional career, continuously learn, and contribute to impactful projects.',
  role: 'Junior Front-End Developer',
  degree: 'BS Information Technology',
  university: 'Saint Louis University',
  location: 'Quezon City, Metro Manila, Philippines, 1103',
  hometown: 'Loakan Proper, Baguio City, Benguet, Philippines, 2600',
  email: 'aromintristan@gmail.com',
  phone: '+63 945 261 6251',
  github: 'https://github.com/EddysonA15',
  linkedin: 'https://linkedin.com/in/eddyson-tristan-aromin-2956992a1',
  instagram: 'https://www.instagram.com/eiii_dye/',
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
  /** Company website — opens in a new tab when the logo is clicked. */
  url?: string
  /** Short description shown in the hover tooltip. */
  tooltipDesc?: string
  /** Image shown at the top of the hover tooltip. */
  image?: string
  /** Photo album shown in the album modal (swiper). */
  albums?: string[]
  /** Certificate images shown in the certificate modal (swiper). */
  certificates?: string[]
  description: string
  highlights: string[]
}

export const experiences: ExperienceEntry[] = [
  {
    period: 'Nov 2025 — Jun 2026',
    year: '2025 — 2026',
    tag: 'Professional',
    title: 'Junior Front-End Developer',
    company: 'PRAXXYS Solutions Inc.',
    logo: '/images/logos/praxxys-logo.png',
    url: 'https://www.praxxys.ph/',
    tooltipDesc:
      'An AI, e-commerce, web, and mobile app design & development company.',
    albums: [],
    certificates: [],
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
    company: 'NOAH Business Application',
    logo: '/images/logos/noah-logo.png',
    url: 'https://noahapplication.com/',
    tooltipDesc:
      'A business applications company providing document management and workflow automation solutions.',
    albums: [],
    certificates: [],
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
  /** School website — opens in a new tab when the logo is clicked. */
  url?: string
  /** Short description shown in the hover tooltip. */
  tooltipDesc?: string
  /** Image shown at the top of the hover tooltip. */
  image?: string
  /** Photo album shown in the album modal (swiper). */
  albums?: string[]
  /** Certificate images shown in the certificate modal (swiper). */
  certificates?: string[]
  detail: string
}

export const education: EducationEntry[] = [
  {
    period: '2021 — 2025',
    tag: 'Graduated',
    title: 'BS Information Technology',
    school: 'Saint Louis University',
    logo: '/images/logos/slu-logo.svg',
    url: 'https://www.slu.edu.ph/',
    tooltipDesc:
      'A premier Catholic university in Baguio City known for engineering, IT, and health sciences programs.',
    albums: [],
    certificates: [],
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
    label: 'Developer Tools',
    items: ['Git', 'GitHub', 'VS Code'],
  },
  {
    label: 'Design',
    items: ['Figma', 'Canva'],
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

/** Certifications & credentials. */
export interface Certification {
  slug: string
  title: string
  issuer: string
  year: string
  category: 'degree' | 'certification'
  summary: string
}

export const certifications: Certification[] = [
  {
    slug: 'bachelor-of-science-in-information-technology',
    title: 'Bachelor of Science in Information Technology',
    issuer: 'Saint Louis University (SAMCIS)',
    year: '2025',
    category: 'degree',
    summary:
      'Four-year undergraduate degree in Information Technology at Saint Louis University — covering software development, web technologies, databases, networking, and information systems, capped by a full-stack capstone project (ISakay).',
  },
  {
    slug: 'agile-fast-phased-development',
    title: 'Agile & Fast-Phased Development',
    issuer: 'PRAXXYS Solutions Inc.',
    year: '2026',
    category: 'certification',
    summary:
      'Company credential from PRAXXYS Solutions Inc. on agile methodology and fast-phased delivery — the working practices used on real client web and mobile work in an agile development team.',
  },
  {
    slug: 'quality-assurance-testing',
    title: 'Quality Assurance & Testing',
    issuer: 'NOAH Business Application',
    year: '2025',
    category: 'certification',
    summary:
      'QA credential from NOAH Business Application covering the full quality assurance discipline — test case authoring, bug and regression tracking, and documentation review for release readiness.',
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
    org: 'PRAXXYS Solutions Inc.',
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
  slug: string
  initials: string
  name: string
  title: string
  email: string | null
  summary: string
}

export const references: Reference[] = [
  {
    slug: 'britannyy-baldovino',
    initials: 'BB',
    name: 'Britannyy Baldovino',
    title: 'University Instructor — Saint Louis University',
    email: 'bmbaldovino@slu.edu.ph',
    summary:
      'University instructor at Saint Louis University who supervised and mentored academic work — can speak to technical skill, attention to detail, and consistent delivery.',
  },
  {
    slug: 'lambert-famorca',
    initials: 'LF',
    name: 'Lambert Famorca',
    title: 'University Instructor — Saint Louis University',
    email: 'support@myvirtuallearning.org',
    summary:
      'University instructor at Saint Louis University and founder of MyVirtual Learning — connected through the ISakay capstone mentorship community.',
  },
  {
    slug: 'praxxys-solutions',
    initials: 'PS',
    name: 'PRAXXYS Solutions Inc.',
    title: 'Junior Front-End Developer — Agile Development Team',
    email: null,
    summary:
      'PRAXXYS Solutions Inc. — agile web & mobile engineering team where I served as Junior Front-End Developer. Can speak to clean API integration, consistent quality under fast-paced deadlines, and proactive ownership of shipped features.',
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
    author: 'PRAXXYS Solutions Inc. Team',
    role: 'Agile Development — Junior Front-End Developer',
  },
  {
    initials: 'NO',
    quote:
      '"His QA discipline was exceptional — thorough test cases, clear documentation, and a sharp eye for bugs that others missed. Features shipped better because of him."',
    author: 'NOAH Business Application Team',
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
