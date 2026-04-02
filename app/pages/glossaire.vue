<script setup lang="ts">
const glossaryEntries = [
  { term: 'Attachement', definition: 'Lien émotionnel entre deux personnes.' },
  { term: 'Sécurité', definition: 'Sentiment de confiance et de protection dans une relation.' },
  // Ajoutez d'autres entrées ici
]
</script>

<template>
  <section class="">
    <h1 class="text-3xl font-bold mb-6">Glossaire</h1>

    <div class="flex flex-col gap-8">
      <div v-for="(entry, index) in glossaryEntries" :key="index" class="glossary-entry">
        <h2 class="text-xl font-semibold">{{ entry.term }}</h2>
        <p>{{ entry.definition }}</p>
      </div>
    </div>
  </section>
</template>
