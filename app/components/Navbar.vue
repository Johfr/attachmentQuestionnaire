<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const isLoggedIn = computed(() => authStore.isLoggedIn)
const { isDarkMode, initThemeMode, toggleThemeMode } = useThemeMode()

onMounted(() => {
  initThemeMode()
})

const checkUserAuthentication = async () => {
  if (!authStore.user) {
    authStore.openLoginModal()
  } else {
    await navigateTo('/user/profil')
  }
}

const handleDesktopPowerAction = async () => {
  if (!isLoggedIn.value) {
    authStore.openLoginModal()
    return
  }

  const result = await authStore.logout()
  if (result.success) {
    await navigateTo('/')
  }
}

</script>

<template>
  <nav class="flex justify-between items-center px-5 py-2 gap-5 font-serif text-theme-navText border-t md:border-t-0 border-b border-solid border-theme-navDivider bg-theme-nav fixed bottom-0 left-0 right-0 z-10 md:py-5 md:static">
    <routerLink to="/" class="flex flex-wrap justify-center flex-col md:flex-row" title="Accueil">
      <LucideHeartPulse :size="20" class="fill-rust stroke-white md:w-[30px] md:h-[30px]" />
      <span class="text-[9px] md:hidden text-theme-text">
        Home
      </span>
    </routerLink>
    
    <div class="flex justify-between w-[55%] gap-10 md:w-auto md:gap-5">
      <RouterLink to="/questionnaires" class="flex flex-wrap justify-center flex-col md:flex-row">
        <LucideList :size="15" class="mb-1 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-[9px] md:hidden text-theme-text">
          Tests
        </span>
        <span class="text-xs hidden md:block md:text-xs text-theme-text">
          Questionnaires
        </span>
      </RouterLink>
      <routerLink to="/blog" class="flex flex-wrap justify-center flex-col md:flex-row">
        <LucideBookText :size="15" class="mb-1 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-[9px] md:text-xs text-theme-text">
          Blog
        </span>
      </routerLink>
      <RouterLink to="/ebook" class="flex flex-wrap justify-center flex-col md:flex-row">
        <LucideBarChart2 :size="15" class="mb-1 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-[9px] md:text-xs text-theme-text">
          Ebook
        </span>
      </RouterLink> 
      
      <!-- <RouterLink to="/attachment-questionnaire/results" class="flex flex-wrap justify-center flex-col md:flex-row">
        <LucideBarChart2 :size="15" class="mb-1 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-[9px] md:text-xs">
          Formation
        </span>
      </RouterLink> -->
    </div>

    <!-- User -->
    <div class="flex items-center gap-1" title="Dashboard">
      <!-- user -->
      <div class="flex flex-wrap justify-center items-center flex-col md:flex-row cursor-pointer" @click="checkUserAuthentication">
        <LucideUser :size="15" class="mb-1 md:mr-1 md:mb-0 fill-rust stroke-rust md:w-[20px] md:h-[20px]" />
        <span class="text-[9px] text-theme-text md:hidden">
          Profil
        </span>
      </div>

      <!-- dark mode toggle -->
      <button
        type="button"
        class="hidden md:flex items-center justify-center rounded-full px-3 py-2 transition-colors"
        :class="isDarkMode ? 'bg-theme-buttonText text-theme-button' : 'bg-theme-button text-theme-buttonText'"
        title="Changer le mode"
        @click="toggleThemeMode"
      >
        <LucideSun v-if="isDarkMode" :size="18" />
        <LucideMoon v-else :size="18" />
      </button>

      <!-- logout/login -->
      <button
        type="button"
        class="hidden md:flex items-center text-rust"
        :title="isLoggedIn ? 'Se deconnecter' : 'Se connecter'"
        @click="handleDesktopPowerAction"
      >
        <LucidePowerOff v-if="isLoggedIn" :size="18" />
        <LucidePower v-else :size="18" />
      </button>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.router-link-active {
  font-weight: bold;
  color: var(--nav-active);
  position: relative;

  &:after {
    content: '';
    display: block;
    width: 100%;
    height: 2px;
    margin-top: 3px;
    position: absolute;
    top: 100%;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--nav-active);
    margin-top: 4px;
  }
}
</style>
