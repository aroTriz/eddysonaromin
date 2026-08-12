import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

import '@/assets/styles/main.css'

// NOTE: the app no longer registers the Ionic Vue plugin. The site's layout
// is a plain Vue SPA (custom sidebar + routed content), and dropping Ionic
// removes ~450 KB of framework runtime from the main bundle. `IonApp` in
// App.vue was the only Ionic component in use — replaced by a plain <div>.
const app = createApp(App).use(router)

app.mount('#app')
