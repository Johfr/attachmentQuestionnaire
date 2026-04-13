<script setup lang="ts">

const props = defineProps<{
  entries: {
    term: string;
    definition: string;
  }[]
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-for="(entry, index) in entries" :key="index" class="glossary-entry">
      <h2 class="text-lg font-semibold">
        {{ entry.term }}
      </h2>
      <p class="text-sm text-theme-muted">
        {{ entry.definition }}
      </p>
    </div>
  </div>
</template>