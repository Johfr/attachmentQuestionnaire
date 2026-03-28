<script setup lang="ts">
import { ref } from 'vue'

const isOpen = defineModel({
  type: Boolean,
  default: false
})

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <transition name="slide-up">
    <div v-if="isOpen" class="overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="toggle">
      <div class="max-w-full max-h-128 p-6 bg-white rounded-2xl overflow-auto w-11/12 relative md:p-10 md:w-2/3 lg:w-1/2">
        <!-- close button -->
        <button class="absolute top-4 right-4 text-gray-500 hover:text-gray-700" @click="toggle" title="fermer la popin">
          <LucideCircleX :size="24" />
        </button>
        <slot></slot>
      </div>
    </div>
  </transition>
  </template>

<style lang="scss" scoped>
.popin-transition-enter-active, .popin-transition-leave-active {
  transition: all 0.3s ease;
}
.popin-transition-enter-from, .popin-transition-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}
.popin-transition-enter-to, .popin-transition-leave-from {
  max-height: 1000px; /* une valeur suffisamment grande pour contenir le contenu */
  opacity: 1;
}

</style>