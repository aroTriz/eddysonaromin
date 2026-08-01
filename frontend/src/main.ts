import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'

import App from './App.vue'
import router from './router'

import '@/assets/styles/main.css'

const app = createApp(App).use(IonicVue).use(router)

app.mount('#app')
