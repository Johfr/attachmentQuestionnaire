<script setup>
import { computed } from 'vue'
import { PolarArea } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, PolarAreaController, RadialLinearScale, ArcElement } from 'chart.js'

const insideLabelPlugin = {
  id: 'insideLabels',
  afterDatasetsDraw(chart) {
    const enabled = chart.config.options?.plugins?.insideLabels?.enabled
    if (!enabled) return

    const { ctx } = chart
    const meta = chart.getDatasetMeta(0)
    const dataset = chart.data.datasets[0]
    const chartArea = chart.chartArea
    const centerX = (chartArea.left + chartArea.right) / 2
    const centerY = (chartArea.top + chartArea.bottom) / 2
    const maxRadius = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2 * 0.75

    meta.data.forEach((arc, index) => {
      const label = chart.data.labels[index] || ''
      const value = dataset.data[index]
      const text = `${label}\n${value}%`

      // Calculer l'angle moyen du secteur
      const startAngle = arc.startAngle
      const endAngle = arc.endAngle
      const midAngle = (startAngle + endAngle) / 2

      // Positionner à l'extrémité du secteur
      const x = centerX + Math.cos(midAngle) * maxRadius
      const y = centerY + Math.sin(midAngle) * maxRadius

      ctx.save()
      ctx.fillStyle = '#000'
      ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const lines = text.split('\n')
      const lineHeight = 14
      const startY = y - ((lines.length - 1) * lineHeight) / 2
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, x, startY + lineIndex * lineHeight)
      })

      ctx.restore()
    })
  }
}

ChartJS.register(PolarAreaController, RadialLinearScale, ArcElement, Title, Tooltip, Legend, insideLabelPlugin)

const props = defineProps({
  tags: {
    type: Array,
    default: () => [
      { label: 'Autonomy', value: 75, color: '#3b82f6' },
      { label: 'Distance', value: 45, color: '#10b981' },
      { label: 'Support', value: 60, color: '#f97316' },
      { label: 'Connection', value: 50, color: '#ef4444' }
    ]
  },
  width: {
    type: [String, Number],
    default: '400px'
  },
  height: {
    type: [String, Number],
    default: '400px'
  }
})

const chartData = computed(() => ({
  labels: props.tags.map((t) => t.label),
  datasets: [
    {
      data: props.tags.map((t) => t.value),
      backgroundColor: props.tags.map((t) => t.color || '#888'),
      borderWidth: 1
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
    insideLabels: { enabled: true }
  },
  scales: {
    r: {
      ticks: { display: false },
      grid: { color: 'rgba(255,255,255,0.3)' },
      angleLines: { color: 'rgba(255,255,255,0.2)' }
    }
  }
}))
</script>

<template>
  <!-- <div class="chart-container" :style="{ '--chart-width': props.width, '--chart-height': props.height }"> -->
    <PolarArea :data="chartData" :options="chartOptions" />
  <!-- </div> -->
</template>

<style lang="scss" scoped>
// .chart-container {
//   width: var(--chart-width);
//   height: var(--chart-height);
//   margin: 0 auto;
  
//   @media screen and (min-width: 768px) {
//     width: 600px !important;
//     height: 600px !important;
//   }
// }
</style>
