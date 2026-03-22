<script setup lang="ts">
import Navbar from "~/components/Navbar.vue"
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const { isLoginModalOpen } = storeToRefs(authStore)
</script>

<template>
  <div class="default-layout">
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
</template>

<style lang="scss">
.default-layout {
  max-width: 1260px;
  height: 100vh;
  margin: 0 auto;
  padding: 0 1rem 10rem;
}
// main {
//   height: 100%;
//   display: flex;
//   flex-direction: column;
//   justify-content: center;
// }
</style>