<script setup>
import { computed, ref } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale } from 'chart.js'

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
  showSecondaryTooltip: {
    type: Boolean,
    default: false
  }
})

const textCenterPlugin = {
  id: 'textCenter',
  beforeDatasetsDraw(chart) {
    const { width, height, ctx } = chart
    ctx.restore()

    const text = chart.config._config.options.plugins.textCenter?.text || ''
    const fontSize = chart.config._config.options.plugins.textCenter?.fontSize || 16
    const fontColor = chart.config._config.options.plugins.textCenter?.fontColor || '#000'

    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
    ctx.textBaseline = 'middle'
    ctx.fillStyle = fontColor

    const lines = text.split('\n')
    const lineHeight = fontSize + 8
    const totalHeight = lineHeight * lines.length
    let startY = height / 2 - (totalHeight / 2) + fontSize / 2

    lines.forEach((line) => {
      const textWidth = ctx.measureText(line).width
      ctx.fillText(line, width / 2 - textWidth / 2, startY)
      startY += lineHeight
    })

    ctx.save()
  }
}

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, textCenterPlugin)

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets
}))

const chartOptions = computed(() => ({
  responsive: props.responsive,
  cutout: props.cutout,
  borderColor: '#ccc',
  plugins: {
    legend: props.legend,
    textCenter: {
      text: props.centerText,
      fontSize: props.centerTextFontSize,
      fontColor: props.centerTextFontColor
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          if (!props.showSecondaryTooltip && context.dataIndex > 0) {
            return ''
          }
          return context.parsed + '%'
        }
      }
    }
  }
}))
</script>

<template>
  <!-- <div :style="{ width: props.width, height: props.height }" class="chart-container"> -->
    <Doughnut
      id="my-chart-id"
      :options="chartOptions"
      :data="chartData"
    />
  <!-- </div> -->
</template>

<style lang="scss" scoped>
/*  */
/* .chart-container {
  width: var(--chart-width);
  height: var(--chart-height);

  canvas {
    width: 100% !important;
    height: 100% !important;
  }
  
  @media screen and (min-width: 768px) {
    width: 200px !important;
    height: 200px !important;
  }
} */
</style>