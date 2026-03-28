<script setup lang="ts">

const props = defineProps<{
  user: {
    id: number
    name: string
  }
}>()
</script>

<template>
  <section class="mt-16 mb-8 md:max-w-[60%]">
    <p class="mb-4 text-sm uppercase text-rust">Daily resonance</p>
    <h1 class="text-left mb-3 text-5xl font-serif md:text-center">
      Bienvenue, 
      <em class="text-rust">{{ props.user.name }}.</em>
    </h1>
    <div>
      <span class="inline-block h-1 w-14 mr-2 bg-rust"></span>
      <span class="inline-block h-1 w-4 mr-2 bg-rust"></span>
      <span class="inline-block h-1 w-2 bg-rust"></span>
    </div>
  </section>
</template>

<style lang="scss" scoped>
</style>