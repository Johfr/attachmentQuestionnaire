<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const { isLoginModalOpen } = storeToRefs(authStore)
</script>

<template>
  <div class="questionnaire-layout">
    <div class="questionnaire-wrapper">
      <NuxtPage />

      <LoginModal
        v-if="isLoginModalOpen"
        @close="authStore.closeLoginModal()"
      />
      <AttachmentQuestionnaireFooter />
      </div>
  </div>
</template>

<style lang="scss" scoped>
.questionnaire-layout {
  background-color: #fff8f6;
}
.questionnaire-wrapper{
  // max-width: 1260px;
  max-width: 960px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 1rem 1rem 6rem 1rem;
  position: relative;
}
</style>