<script setup lang="ts">
import { computed, ref } from 'vue'
import DoughnutChart from "~/components/attachmentQuestionnaire/DoughnutChart.vue"
import PolarChart from "~/components/attachmentQuestionnaire/PolarChart.vue"

const DoughnutChartData = ref([75, 38])

const anxietyLabel = ['Anxiety']
const avoidanceLabel = ['Avoidance']

const anxietyDatasets = computed(() => [
  { 
    data: [DoughnutChartData.value[0] ?? 0, (100 - (DoughnutChartData.value[0] ?? 0))],
    backgroundColor: ['#bae6fd', '#fefefe1c'],
    borderRadius: 100,
    spacing: 5,
    // circumference: ((DoughnutChartData.value[0] ?? 0) * 360) / 100
  }
])

const avoidanceDatasets = computed(() => [
  { 
    data: [DoughnutChartData.value[1] ?? 0, (100 - (DoughnutChartData.value[1] ?? 0))],
    backgroundColor: ['#fecdd3', '#fefefe1c'],
    borderRadius: 100,
    spacing: 5,
    // circumference: ((DoughnutChartData.value[1] ?? 0) * 360) / 100
  }
])

const tagTranslations = {
  distanceSilence: 'Distance/Silence',
  validationRequired: 'Validation requise',
  quickRepair: 'Réparation rapide',
  intimityProximity: 'Proximité/Intimité',
  conflict: 'Conflit',
  autonomy: 'Autonomie',
  fearOfLoss: 'Peur de la perte',
  overthinking: 'Rumination',
  emotionalContainment: 'Retenue émotionnelle',
  controlNeed: 'Besoin de contrôle',
  withdrawalResponse: 'Retrait/Repli'
}

const tagData = ref([
  { label: tagTranslations.distanceSilence, value: 10, color: '#fecdd3' },
  { label: tagTranslations.validationRequired, value: 62, color: '#bae6fd' },
  { label: tagTranslations.quickRepair, value: 10, color: '#fecdd3' },
  { label: tagTranslations.intimityProximity, value: 70, color: '#bae6fd' },
  { label: tagTranslations.conflict, value: 55, color: '#f97316' },
  { label: tagTranslations.autonomy, value: 75, color: '#bae6fd' },
  { label: tagTranslations.fearOfLoss, value: 10, color: '#fecdd3' },
  { label: tagTranslations.overthinking, value: 68, color: '#bae6fd' },
  { label: tagTranslations.emotionalContainment, value: 10, color: '#fecdd3' },
  { label: tagTranslations.controlNeed, value: 60, color: '#bae6fd' },
  { label: tagTranslations.withdrawalResponse, value: 10, color: '#fecdd3' },
])
</script>

<template>
  <div>
    <h1>Home</h1>
    <!-- <div class="donuts-container">
      <DoughnutChart
        :labels="anxietyLabel"
        :datasets="anxietyDatasets"
        :legend="{ display: false }"
        :cutout="'80%'"
        :width="'150px'"
        :height="'150px'"
        :center-text="`Anxiety\n${DoughnutChartData[0] ?? 0}%`"
        :center-text-font-size="14"
        :center-text-font-color="'#0369a1'" 
      />
      <DoughnutChart
        :labels="avoidanceLabel"
        :datasets="avoidanceDatasets"
        :legend="{ display: false }"
        :cutout="'80%'"
        :width="'150px'"
        :height="'150px'"
        :center-text="`Avoidance\n${DoughnutChartData[1] ?? 0}%`"
        :center-text-font-size="14"
        :center-text-font-color="'#be123c'" 
      />
    </div>

    <section style="margin-top: 2rem">
      <h2>Tags (polar area)</h2>
      <PolarChart :tags="tagData" :width="'600px'" :height="'600px'" />
    </section> -->
  </div>  
</template>

<style lang="scss" scoped>
.donuts-container {
  display: flex;
}
</style>