<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'

const props = defineProps({
  labels: {
    type: Array,
    required: true
  },
  datasets: {
    type: Array,
    required: true
  },
  responsive: {
    type: Boolean,
    default: true
  },
  legend: {
    type: Object,
    default: () => ({ display: true, position: 'top' })
  },
  cutout: {
    type: [String, Number],
    default: '80%'
  },
  width: {
    type: [String, Number],
    default: '400px'
  },
  height: {
    type: [String, Number],
    default: '400px'
  },
  centerText: {
    type: String,
    default: ''
  },
  centerTextFontSize: {
    type: Number,
    default: 16
  },
  centerTextFontColor: {
    type: String,
    default: '#000'
  },
  segmentBorderColor: {
    type: String,
    default: 'var(--results-donut-track)'
  },
  showSecondaryTooltip: {
    type: Boolean,
    default: false
  }
})

const { themeMode } = useThemeMode()

const resolveCanvasColor = (value, fallback) => {
  if (!import.meta.client || typeof value !== 'string') return value || fallback

  const trimmedValue = value.trim()
  const cssVariableMatch = trimmedValue.match(/^var\((--[^)]+)\)$/)
  if (!cssVariableMatch) return trimmedValue || fallback

  const resolvedValue = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVariableMatch[1])
    .trim()

  return resolvedValue || fallback
}

const textCenterPlugin = {
  id: 'textCenter',
  beforeDatasetsDraw(chart) {
    const { width, height, ctx } = chart
    ctx.restore()

    const text = chart.config.options.plugins.textCenter?.text || ''
    const fontSize = chart.config.options.plugins.textCenter?.fontSize || 16
    const fontColor = chart.config.options.plugins.textCenter?.fontColor || '#000'

    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
    ctx.textBaseline = 'middle'
    ctx.fillStyle = fontColor

    const lines = text.split('\n')
    const lineHeight = fontSize + 8
    const totalHeight = lineHeight * lines.length
    let startY = height / 2 - totalHeight / 2 + fontSize / 2

    lines.forEach((line) => {
      const textWidth = ctx.measureText(line).width
      ctx.fillText(line, width / 2 - textWidth / 2, startY)
      startY += lineHeight
    })

    ctx.save()
  }
}

ChartJS.register(
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  textCenterPlugin,
)

const canvasRef = ref(null)
const chartInstance = ref(null)

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets
}))

const chartOptions = computed(() => {
  const activeTheme = themeMode.value

  return {
    responsive: props.responsive,
    cutout: props.cutout,
    borderColor: resolveCanvasColor(props.segmentBorderColor, activeTheme === 'dark' ? '#d1d5db' : '#ccc'),
    plugins: {
      legend: props.legend,
      textCenter: {
        text: props.centerText,
        fontSize: props.centerTextFontSize,
        fontColor: resolveCanvasColor(props.centerTextFontColor, activeTheme === 'dark' ? '#f1ece7' : '#000')
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (!props.showSecondaryTooltip && context.dataIndex > 0) {
              return ''
            }
            return `${context.parsed}%`
          }
        }
      }
    }
  }
})

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
    type: 'doughnut',
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
