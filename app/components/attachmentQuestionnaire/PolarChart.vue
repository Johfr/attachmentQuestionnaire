<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  PolarAreaController,
  RadialLinearScale,
  Title,
  Tooltip,
} from 'chart.js'

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
      const startAngle = arc.startAngle
      const endAngle = arc.endAngle
      const midAngle = (startAngle + endAngle) / 2
      const x = centerX + Math.cos(midAngle) * maxRadius
      const y = centerY + Math.sin(midAngle) * maxRadius
      const textColor = chart.config.options?.plugins?.insideLabels?.textColor || '#000'

      ctx.save()
      ctx.fillStyle = textColor
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

ChartJS.register(
  PolarAreaController,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  insideLabelPlugin,
)

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

const { themeMode } = useThemeMode()
const isDarkMode = computed(() => themeMode.value === 'dark')

const canvasRef = ref(null)
const chartInstance = ref(null)

const chartData = computed(() => ({
  labels: props.tags.map((t) => t.label),
  datasets: [
    {
      data: props.tags.map((t) => t.value),
      backgroundColor: props.tags.map((t) => t.color || '#888'),
      borderWidth: isDarkMode.value ? 0 : 1,
      borderColor: isDarkMode.value ? 'transparent' : '#ffffff'
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  color: isDarkMode.value ? '#fff' : '#000',
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
    insideLabels: {
      enabled: true,
      textColor: isDarkMode.value ? '#fff' : '#000'
    }
  },
  scales: {
    r: {
      ticks: { display: false },
      pointLabels: { color: isDarkMode.value ? '#fff' : '#000' },
      grid: { display: false },
      angleLines: { display: false }
    }
  }
}))

const canvasStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
}))

const destroyChart = () => {
  chartInstance.value?.destroy()
  chartInstance.value = null
}

const renderChart = () => {
  if (!import.meta.client || !canvasRef.value) return

  destroyChart()

  chartInstance.value = new ChartJS(canvasRef.value, {
    type: 'polarArea',
    data: chartData.value,
    options: chartOptions.value,
  })
}

watch([chartData, chartOptions], async () => {
  await nextTick()
  renderChart()
}, { deep: true })

onMounted(() => {
  renderChart()
})

onBeforeUnmount(() => {
  destroyChart()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    :style="canvasStyle"
    :width="typeof props.width === 'number' ? props.width : undefined"
    :height="typeof props.height === 'number' ? props.height : undefined"
  />
</template>
