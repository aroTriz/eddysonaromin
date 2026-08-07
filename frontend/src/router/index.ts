import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: 'Eddyson Aromin — IT Portfolio' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
      meta: { title: 'About — Eddyson Aromin' },
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('@/views/ProjectsView.vue'),
      meta: { title: 'Projects — Eddyson Aromin' },
    },
    {
      path: '/projects/:slug',
      name: 'project-detail',
      component: () => import('@/views/ProjectDetailView.vue'),
      meta: { title: 'Project — Eddyson Aromin' },
    },
    {
      path: '/experience',
      name: 'experience',
      component: () => import('@/views/ExperienceView.vue'),
      meta: { title: 'Experience — Eddyson Aromin' },
    },
    {
      path: '/services',
      name: 'services',
      component: () => import('@/views/ServicesView.vue'),
      meta: { title: 'Services — Eddyson Aromin' },
    },
    {
      path: '/shop',
      name: 'shop',
      component: () => import('@/views/ShopView.vue'),
      meta: { title: 'Shop — Eddyson Aromin' },
    },
    {
      path: '/stack',
      name: 'stack',
      component: () => import('@/views/StackView.vue'),
      meta: { title: 'Stack — Eddyson Aromin' },
    },
    {
      path: '/certifications',
      name: 'certifications',
      component: () => import('@/views/CertificationsView.vue'),
      meta: { title: 'Certifications — Eddyson Aromin' },
    },
    {
      path: '/certifications/:slug',
      name: 'certification-detail',
      component: () => import('@/views/CertificationDetailView.vue'),
      meta: { title: 'Credential — Eddyson Aromin' },
    },
    {
      path: '/references/:slug',
      name: 'reference-detail',
      component: () => import('@/views/ReferenceDetailView.vue'),
      meta: { title: 'Reference — Eddyson Aromin' },
    },
    {
      path: '/recommendations',
      name: 'recommendations',
      component: () => import('@/views/RecommendationsView.vue'),
      meta: { title: 'Recommendations — Eddyson Aromin' },
    },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('@/views/BlogView.vue'),
      meta: { title: 'Blog — Eddyson Aromin' },
    },
    {
      path: '/blog/:slug',
      name: 'blog-post',
      component: () => import('@/views/BlogPostView.vue'),
      meta: { title: 'Blog — Eddyson Aromin' },
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('@/views/ContactView.vue'),
      meta: { title: 'Contact — Eddyson Aromin' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Not Found — Eddyson Aromin' },
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : null
  document.title = title ?? 'Eddyson Aromin — IT Portfolio'
})

export default router
