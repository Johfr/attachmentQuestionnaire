<script setup lang="ts">

const props = defineProps<{
  sectionSpacing?: string,
  asTag?: boolean,
  tagText?: string,
  isHeading?: boolean,
  title: string,
  titleSize?: string,
  highlight?: string,
  highlightSize?: string,
}>()
</script>

<template>
  <section
    :class="[
      'md:max-w-[60%]', 
      sectionSpacing ?? 'mt-16 mb-8'
  ]">
    <p v-if="asTag" class="mb-4 text-sm uppercase text-rust">{{ tagText ?? 'Daily resonance' }}</p>

    <h2 v-if="isHeading" class="flex flex-wrap text-left mb-5 font-serif leading-tight">
      <span class="mr-3" :class="titleSize ?? 'text-5xl'">
        {{ title }}
      </span>
      
      <em v-if="highlight" :class="highlightSize ?? 'text-5xl'" class="text-rust">
        {{ highlight }}
      </em>
    </h2>

    <h2 v-else class="text-2xl font-bold text-theme-text">
      {{ title }}
    </h2>
    
    <div class="flex mt-1 flex-row-reverse justify-end">
      <span class="inline-block h-[4px] w-14 mr-2 bg-rust rounded-4xl" />
      <span class="inline-block h-[4px] w-4 mr-2 bg-rust rounded-4xl" />
      <span class="inline-block h-[4px] w-2 mr-2 bg-rust rounded-4xl" />
    </div>

    <slot />
  </section>
</template>

<style lang="scss" scoped>
</style>
