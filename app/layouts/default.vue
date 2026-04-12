<script setup lang="ts">
import Navbar from "~/components/Navbar.vue"
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const { isLoginModalOpen } = storeToRefs(authStore)
</script>

<template>
  <div class="default-layout bg-theme-bg text-theme-text">
    <div class="default-container pb-24">
      <header>
        <Navbar />
      </header>

      <!-- <main> -->
        <NuxtPage />
      <!-- </main> -->

      <LoginModal
        v-if="isLoginModalOpen"
        @close="authStore.closeLoginModal()"
      />

    </div>
    <Footer />
  </div>
</template>

<style lang="scss">
.default-container {
  max-width: 1260px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 1rem 1rem 10rem;
}
</style>
