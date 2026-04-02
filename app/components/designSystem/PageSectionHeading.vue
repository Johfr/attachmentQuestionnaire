<script setup lang="ts">

const props = defineProps<{
  userName?: string,
  sectionSpacing?: string,
  asTag?: boolean,
  isTitleH1?: boolean,
  isTitleH2?: boolean,
  title: string,
}>()
</script>

<template>
  <section
    :class="[
      'mb-8 md:max-w-[60%]', 
      sectionSpacing ?? 'mt-16'
    ]">
    <p v-if="asTag" class="mb-4 text-sm uppercase text-rust">Daily resonance</p>
    <h1 v-if="isTitleH1" class="text-left mb-5 text-5xl font-serif leading-tight md:text-center">
      {{ title }}
      <em v-if="userName" class="text-rust">{{ userName }}.</em>
    </h1>

    <h2 v-if="isTitleH2" class="text-2xl font-bold">
      {{ title }}
    </h2>
    
    <div class="flex mt-1 flex-row-reverse justify-end">
      <span class="inline-block h-[4px] w-14 mr-2 bg-rust rounded-4xl" />
      <span class="inline-block h-[4px] w-4 mr-2 bg-rust rounded-4xl" />
      <span class="inline-block h-[4px] w-2 mr-2 bg-rust rounded-4xl" />
    </div>
  </section>
</template>

<style lang="scss" scoped>
</style>