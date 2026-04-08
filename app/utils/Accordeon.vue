<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

const props = defineProps<{
  title: string,
  colorType?: 'anxiety' | 'avoidance'
}>()

const colorTypeClass = computed(() => props.colorType)

</script>

<template>
  <div :class="['mt-5 p-5 rounded-lg', colorTypeClass]">
    <h3 @click="toggle" class="flex mb-4 font-bold cursor-pointer text-md">
      {{ props.title }}
      <LucideChevronRight :class="['transition-transform', { 'rotate-90': isOpen }]" />
    </h3>

    <transition name="accordion-transition">
      <div v-if="isOpen">
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
.accordion-transition-enter-active, .accordion-transition-leave-active {
  transition: all 0.3s ease;
}
.accordion-transition-enter-from, .accordion-transition-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}
.accordion-transition-enter-to, .accordion-transition-leave-from {
  max-height: 1000px; /* une valeur suffisamment grande pour contenir le contenu */
  opacity: 1;
}

</style>