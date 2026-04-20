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
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalOverlay px-4 py-10"
      @click.self="toggle"
    >
      <div class="relative max-h-144 w-11/12 max-w-full overflow-auto rounded-[2rem] bg-theme-modalBg px-6 pb-8 pt-11 text-theme-modalText md:w-2/3 md:p-10 lg:w-1/2">
        <!-- close button -->
        <button
          class="absolute right-4 top-4 rounded-full text-theme-modalClose transition-colors duration-300 hover:text-theme-modalCloseHover"
          @click="toggle"
          title="fermer la popin"
        >
          <LucideCircleX :size="44" :stroke-width="1.5" />
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

:deep(.text-gray-800),
:deep(.text-gray-700) {
  color: var(--modal-text);
}

:deep(.text-gray-600),
:deep(.text-gray-500),
:deep(.text-gray-400) {
  color: var(--modal-muted);
}

:deep(.border) {
  border-color: var(--modal-close-ring);
}

</style>
