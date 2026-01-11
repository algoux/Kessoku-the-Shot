import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from './modules/home/home.view.vue'
import LoginView from './modules/login/login.view.vue'

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: HomeView, name: 'HomeView' },
    { path: '/login', component: LoginView, name: 'LoginView' },
  ],
});