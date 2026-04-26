<script setup lang="ts">
type DurationPresetId = 'real' | 'reduced' | 'reduced50' | 'reduced100'
type WorldKey = 'primary' | 'secondary'
type LogKind = 'mix' | 'trap' | 'draw'

interface DurationPreset {
  id: DurationPresetId
  label: string
  timeScale: number
  description: string
}

interface WorldConfig {
  key: WorldKey
  label: string
  totalNumbers: number
  targetWinners: number
  sizeFactor: number
  firstTrapOpenAt: number
  reopenDelay: number
  mixInterval: number
  gradientClass: string
}

interface BallState {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  active: boolean
  selectedAt: number | null
}

interface DrawEvent {
  drawIndex: number
  ballId: number
  atSimulatedSecond: number
}

interface LogEntry {
  id: string
  kind: LogKind
  atSimulatedSecond: number
  text: string
}

interface WorldState {
  config: WorldConfig
  balls: BallState[]
  winners: DrawEvent[]
  logs: LogEntry[]
  started: boolean
  elapsedSeconds: number
  trapOpen: boolean
  nextTrapOpenAt: number
  nextMixAt: number
  finished: boolean
  mixFlash: number
}

const MODEL_UPDATES_PER_SECOND = 26
const MODEL_STEP_SECONDS = 1 / MODEL_UPDATES_PER_SECOND
const ARENA_LIMIT = 0.94
const TRAP_Y = 0.9
const durationPresets: DurationPreset[] = [
  {
    id: 'reduced100',
    label: 'Duree reduite x100',
    timeScale: 0.01,
    description: 'Meme ratio que le modele reel, mais 100 fois plus rapide a l ecran.',
  },
  {
    id: 'reduced50',
    label: 'Duree reduite x50',
    timeScale: 0.02,
    description: 'Meme ratio que le modele reel, mais 50 fois plus rapide a l ecran.',
  },
  {
    id: 'reduced',
    label: 'Duree reduite x10',
    timeScale: 0.1,
    description: 'Meme ratio que le modele reel, mais 10 fois plus rapide a l ecran.',
  },
  {
    id: 'real',
    label: 'Duree reelle',
    timeScale: 1,
    description: 'Respect strict des 350s, 140s, 12s et 200s.',
  },
]

const worldConfigs: WorldConfig[] = [
  {
    key: 'primary',
    label: 'Sphere 1 a 50',
    totalNumbers: 50,
    targetWinners: 5,
    sizeFactor: 1.5,
    firstTrapOpenAt: 350,
    reopenDelay: 200,
    mixInterval: 12,
    gradientClass: 'from-amber-500/20 via-orange-500/10 to-white/70',
  },
  {
    key: 'secondary',
    label: 'Sphere 1 a 12',
    totalNumbers: 12,
    targetWinners: 2,
    sizeFactor: 1,
    firstTrapOpenAt: 140,
    reopenDelay: 200,
    mixInterval: 12,
    gradientClass: 'from-sky-500/20 via-cyan-500/10 to-white/70',
  },
]

const selectedPresetId = ref<DurationPresetId>('reduced')
const isRunning = ref(false)
const errorMessage = ref('')
const globalSimulatedSeconds = ref(0)
const worlds = ref<WorldState[]>([])

let rafHandle: number | null = null
let lastFrameAt = 0
let accumulatedSimulatedSeconds = 0
let logSequence = 0

const rngBuffer = new Uint32Array(1024)
let rngIndex = rngBuffer.length

const selectedPreset = computed(() => {
  return durationPresets.find(preset => preset.id === selectedPresetId.value) ?? durationPresets[0]
})

const screenElapsedSeconds = computed(() => {
  return globalSimulatedSeconds.value * selectedPreset.value.timeScale
})

const totalWinners = computed(() => {
  return worlds.value.reduce((count, world) => count + world.winners.length, 0)
})

const allWorldsFinished = computed(() => {
  return worlds.value.length > 0 && worlds.value.every(world => world.finished)
})

const activeWorld = computed(() => {
  return worlds.value.find(world => world.started && !world.finished) ?? null
})

const summaryMessage = computed(() => {
  if (isRunning.value) {
    if (activeWorld.value) {
      return `Simulation en cours. ${activeWorld.value.config.label} active, ${totalWinners.value} chiffre(s) deja sortis.`
    }

    return `Simulation en cours. ${totalWinners.value} chiffre(s) deja sortis.`
  }

  if (allWorldsFinished.value) {
    return 'Simulation terminee avec 7 chiffres sortis, selon la logique de trappe.'
  }

  return 'Pret a lancer la sphere 1 a 50, puis la sphere 1 a 12 une fois la premiere terminee.'
})

function refillRandomBuffer() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Le navigateur ne permet pas d utiliser crypto.getRandomValues().')
  }

  globalThis.crypto.getRandomValues(rngBuffer)
  rngIndex = 0
}

function randomUnit() {
  if (rngIndex >= rngBuffer.length) {
    refillRandomBuffer()
  }

  const value = rngBuffer[rngIndex] ?? 0
  rngIndex += 1
  return value / 4294967296
}

function randomBetween(min: number, max: number) {
  return min + (max - min) * randomUnit()
}

function formatNumber(value: number) {
  return value.toString().padStart(2, '0')
}

function formatSeconds(value: number) {
  if (value >= 100) {
    return `${value.toFixed(0)}s`
  }

  if (value >= 10) {
    return `${value.toFixed(1)}s`
  }

  return `${value.toFixed(2)}s`
}

function presetSeconds(realSeconds: number) {
  return formatSeconds(realSeconds * selectedPreset.value.timeScale)
}

function createBallState(id: number, totalNumbers: number, sizeFactor: number): BallState {
  const arenaRadius = Math.sqrt(sizeFactor)
  const packedRadius = Math.sqrt((0.1 * arenaRadius * arenaRadius) / totalNumbers)
  const ballSize = Math.max(0.07, Math.min(0.135, packedRadius * 1.7))

  const y = 0.25 + Math.pow(randomUnit(), 0.38) * 0.58
  const availableX = Math.sqrt(Math.max(0, (ARENA_LIMIT - ballSize) ** 2 - y ** 2)) * 0.85

  return {
    id,
    x: randomBetween(-availableX, availableX),
    y,
    vx: randomBetween(-0.18, 0.18),
    vy: randomBetween(-0.08, 0.04),
    size: ballSize,
    active: true,
    selectedAt: null,
  }
}

function createWorldState(config: WorldConfig): WorldState {
  return {
    config,
    balls: Array.from({ length: config.totalNumbers }, (_, index) => {
      return createBallState(index + 1, config.totalNumbers, config.sizeFactor)
    }),
    winners: [],
    logs: [],
    started: false,
    elapsedSeconds: 0,
    trapOpen: false,
    nextTrapOpenAt: config.firstTrapOpenAt,
    nextMixAt: config.mixInterval,
    finished: false,
    mixFlash: 0,
  }
}

function pushLog(world: WorldState, kind: LogKind, atSimulatedSecond: number, text: string) {
  logSequence += 1
  world.logs.unshift({
    id: `${world.config.key}-${logSequence}`,
    kind,
    atSimulatedSecond,
    text,
  })
}

function clampBallInsideArena(ball: BallState) {
  const maxDistance = ARENA_LIMIT - ball.size / 2
  const distance = Math.sqrt(ball.x * ball.x + ball.y * ball.y)

  if (distance <= maxDistance || distance === 0) {
    return
  }

  const normalX = ball.x / distance
  const normalY = ball.y / distance
  const projectedVelocity = ball.vx * normalX + ball.vy * normalY

  ball.x = normalX * maxDistance
  ball.y = normalY * maxDistance

  if (projectedVelocity > 0) {
    ball.vx -= projectedVelocity * 1.55 * normalX
    ball.vy -= projectedVelocity * 1.55 * normalY
  }
}

function applyMix(world: WorldState, atSimulatedSecond: number) {
  for (const ball of world.balls) {
    if (!ball.active) {
      continue
    }

    const launchToTop = randomUnit() < 0.25

    if (launchToTop) {
      const summitBandY = randomBetween(-0.88, -0.68)
      const summitBandX = randomBetween(-0.28, 0.28)

      ball.x = summitBandX
      ball.y = summitBandY
      ball.vx = randomBetween(-0.32, 0.32)
      ball.vy = randomBetween(1.15, 1.85)
    } else {
      ball.vx += randomBetween(-1.35, 1.35)
      ball.vy -= randomBetween(0.95, 2.2)
      ball.x += randomBetween(-0.22, 0.22)
      ball.y -= randomBetween(0.12, 0.48)
    }

    clampBallInsideArena(ball)
  }

  world.mixFlash = 1
  pushLog(world, 'mix', atSimulatedSecond, 'Brassage de la sphere.')
}

function updateBall(world: WorldState, ball: BallState, stepSeconds: number) {
  const gravity = 0.725
  const bottomPull = 0.59
  const centerPull = 0.42
  const jitter = 0.22

  ball.vx += (-ball.x * centerPull + randomBetween(-jitter, jitter)) * stepSeconds
  ball.vy += ((TRAP_Y - ball.y) * bottomPull + gravity + randomBetween(-jitter, jitter * 0.8)) * stepSeconds

  ball.vx *= 0.985
  ball.vy *= 0.988

  ball.x += ball.vx * stepSeconds
  ball.y += ball.vy * stepSeconds

  clampBallInsideArena(ball)

  if (ball.y < -0.78 && randomUnit() < 0.08) {
    ball.vy += 0.5
  }

  if (world.trapOpen && ball.y > 0.62) {
    ball.vy += 0.18 * stepSeconds
  }
}

function findTrapCandidate(world: WorldState) {
  let candidate: BallState | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const ball of world.balls) {
    if (!ball.active) {
      continue
    }

    const distanceX = Math.abs(ball.x)
    const distanceY = Math.abs(TRAP_Y - ball.y)
    const trapHalfWidth = Math.max(0.016, ball.size * 0.18)
    const canReachTrap = distanceX <= trapHalfWidth && ball.y >= 0.76 && ball.vy > 0

    if (!canReachTrap) {
      continue
    }

    const score = distanceX * 3.4 + distanceY - Math.max(ball.vy, 0) * 0.06

    if (score < bestScore) {
      bestScore = score
      candidate = ball
    }
  }

  return candidate
}

function captureBall(world: WorldState, ball: BallState, atSimulatedSecond: number) {
  ball.active = false
  ball.selectedAt = atSimulatedSecond

  const drawIndex = world.winners.length + 1
  world.winners.push({
    drawIndex,
    ballId: ball.id,
    atSimulatedSecond,
  })

  world.trapOpen = false
  pushLog(
    world,
    'draw',
    atSimulatedSecond,
    `Sortie ${drawIndex} : ${formatNumber(ball.id)}.`,
  )

  if (world.winners.length >= world.config.targetWinners) {
    world.finished = true
    return
  }

  world.nextTrapOpenAt = atSimulatedSecond + world.config.reopenDelay
}

function advanceWorld(world: WorldState) {
  if (!world.started || world.finished) {
    return
  }

  world.elapsedSeconds += MODEL_STEP_SECONDS

  while (world.elapsedSeconds >= world.nextMixAt) {
    applyMix(world, world.nextMixAt)
    world.nextMixAt += world.config.mixInterval
  }

  if (!world.trapOpen && world.elapsedSeconds >= world.nextTrapOpenAt) {
    world.trapOpen = true
    pushLog(world, 'trap', world.elapsedSeconds, 'Trappe ouverte.')
  }

  for (const ball of world.balls) {
    if (!ball.active) {
      continue
    }

    updateBall(world, ball, MODEL_STEP_SECONDS)
  }

  if (!world.trapOpen) {
    return
  }

  const candidate = findTrapCandidate(world)

  if (candidate) {
    captureBall(world, candidate, world.elapsedSeconds)
  }
}

function stopLoop() {
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle)
    rafHandle = null
  }
}

function finalizeIfComplete() {
  if (worlds.value.length === 0 || worlds.value.some(world => !world.finished)) {
    return
  }

  isRunning.value = false
  stopLoop()
}

function startNextWorldIfNeeded() {
  if (worlds.value.some(world => world.started && !world.finished)) {
    return
  }

  const nextWorld = worlds.value.find(world => !world.started && !world.finished)

  if (nextWorld) {
    nextWorld.started = true
  }
}

function animationFrame(frameAt: number) {
  if (!isRunning.value) {
    return
  }

  if (!lastFrameAt) {
    lastFrameAt = frameAt
  }

  const frameDeltaSeconds = Math.min((frameAt - lastFrameAt) / 1000, 0.12)
  lastFrameAt = frameAt
  accumulatedSimulatedSeconds += frameDeltaSeconds / selectedPreset.value.timeScale

  while (accumulatedSimulatedSeconds >= MODEL_STEP_SECONDS) {
    globalSimulatedSeconds.value += MODEL_STEP_SECONDS

    for (const world of worlds.value) {
      advanceWorld(world)
      world.mixFlash = Math.max(0, world.mixFlash - 0.08)
    }

    accumulatedSimulatedSeconds -= MODEL_STEP_SECONDS
    startNextWorldIfNeeded()
    finalizeIfComplete()

    if (!isRunning.value) {
      break
    }
  }

  if (isRunning.value) {
    rafHandle = requestAnimationFrame(animationFrame)
  }
}

function startSimulation() {
  try {
    stopLoop()
    errorMessage.value = ''

    if (!globalThis.crypto?.getRandomValues) {
      throw new Error('Le navigateur ne permet pas d utiliser crypto.getRandomValues().')
    }

    globalSimulatedSeconds.value = 0
    accumulatedSimulatedSeconds = 0
    lastFrameAt = 0
    logSequence = 0
    rngIndex = rngBuffer.length
    worlds.value = worldConfigs.map(createWorldState)
    if (worlds.value[0]) {
      worlds.value[0].started = true
    }
    isRunning.value = true
    rafHandle = requestAnimationFrame(animationFrame)
  } catch (error) {
    isRunning.value = false
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Une erreur est survenue pendant le lancement de la simulation.'
  }
}

function resetSimulation() {
  stopLoop()
  isRunning.value = false
  errorMessage.value = ''
  globalSimulatedSeconds.value = 0
  accumulatedSimulatedSeconds = 0
  lastFrameAt = 0
  worlds.value = []
}

function activeBalls(world: WorldState) {
  return world.balls.filter(ball => ball.active)
}

function ballStyle(ball: BallState) {
  return {
    left: `${(ball.x * 0.5 + 0.5) * 100}%`,
    top: `${(ball.y * 0.5 + 0.5) * 100}%`,
    width: `${ball.size * 50}%`,
    height: `${ball.size * 50}%`,
  }
}

function arenaStyle(world: WorldState) {
  const width = world.config.sizeFactor > 1 ? 'min(100%, 29rem)' : 'min(100%, 23.5rem)'
  const height = world.config.sizeFactor > 1 ? '29rem' : '23.5rem'

  return {
    width,
    height,
  }
}

function trapStyle(world: WorldState) {
  const active = activeBalls(world)
  const averageSize = active.length > 0
    ? active.reduce((sum, ball) => sum + ball.size, 0) / active.length
    : world.balls.reduce((sum, ball) => sum + ball.size, 0) / world.balls.length

  return {
    width: `${averageSize * 50}%`,
  }
}

function nextTrapLabel(world: WorldState) {
  if (!world.started) {
    return 'En attente de la fin du premier tirage'
  }

  if (world.finished) {
    return 'Sequence complete'
  }

  if (world.trapOpen) {
    return 'Trappe ouverte'
  }

  return `Prochaine ouverture : ${formatSeconds(Math.max(0, world.nextTrapOpenAt - world.elapsedSeconds))}`
}

function kindBadgeClass(kind: LogKind) {
  if (kind === 'draw') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (kind === 'trap') {
    return 'bg-sky-100 text-sky-700'
  }

  return 'bg-amber-100 text-amber-700'
}

onBeforeUnmount(() => {
  stopLoop()
})
</script>

<template>
  <section class="rounded-[2rem] border border-theme-navDivider bg-theme-surfaceStaticCard p-6 md:p-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs uppercase tracking-[0.28em] text-theme-muted">
          Roulette a trappe
        </p>
        <h2 class="mt-2 text-2xl font-semibold text-theme-text md:text-3xl">
          Double sphere physique simplifiee
        </h2>
        <p class="mt-3 text-sm text-theme-muted">
          La sphere 1 a 50 tourne d abord seule. Une fois terminee, la sphere 1 a 12 prend le relais avec les memes regles physiques. Le brassage continue meme lorsque la trappe est ouverte.
        </p>
      </div>

      <div class="rounded-3xl border border-theme-navDivider bg-theme-bg p-4 text-sm text-theme-muted lg:max-w-md">
        <p class="font-medium text-theme-text">
          {{ summaryMessage }}
        </p>
        <p class="mt-2">
          Horloge modele : {{ formatSeconds(globalSimulatedSeconds) }}
        </p>
        <p>
          Temps ecran : {{ formatSeconds(screenElapsedSeconds) }}
        </p>
      </div>
    </div>

    <div class="mb-8 grid gap-4 rounded-[1.75rem] border border-theme-navDivider bg-theme-bg p-4 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)_auto_auto] lg:items-end">
      <label class="flex flex-col gap-2 text-sm text-theme-text">
        <span class="font-medium">Cadence de la simulation</span>
        <select
          v-model="selectedPresetId"
          class="rounded-2xl border border-theme-navDivider bg-theme-surfaceFormInput px-4 py-3 text-sm text-theme-text"
          :disabled="isRunning"
        >
          <option v-for="preset in durationPresets" :key="preset.id" :value="preset.id">
            {{ preset.label }}
          </option>
        </select>
      </label>

      <div class="rounded-3xl border border-theme-navDivider bg-theme-surfaceStaticCard p-4 text-sm text-theme-muted">
        <p class="font-medium text-theme-text">
          {{ selectedPreset.description }}
        </p>
        <p class="mt-2">
          Sphere 1 a 50 : premiere trappe a {{ presetSeconds(350) }}, puis toutes les {{ presetSeconds(200) }}.
        </p>
        <p>
          Sphere 1 a 12 : premiere trappe a {{ presetSeconds(140) }}, puis toutes les {{ presetSeconds(200) }}.
        </p>
        <p>
          Brassage : toutes les {{ presetSeconds(12) }}.
        </p>
      </div>

      <button
        type="button"
        class="rounded-3xl bg-theme-button px-6 py-4 text-sm font-semibold text-theme-buttonText shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        @click="startSimulation"
        :disabled="isRunning"
      >
        {{ worlds.length > 0 ? 'Relancer' : 'Lancer' }}
      </button>

      <button
        type="button"
        class="rounded-3xl border border-theme-navDivider px-6 py-4 text-sm font-semibold text-theme-text transition hover:bg-theme-bg"
        @click="resetSimulation"
        :disabled="isRunning && worlds.length === 0"
      >
        Reinitialiser
      </button>
    </div>

    <p v-if="errorMessage" class="mb-6 rounded-3xl bg-rose-100 px-4 py-3 text-sm text-rose-700">
      {{ errorMessage }}
    </p>

    <div v-if="worlds.length === 0" class="rounded-[1.75rem] border border-dashed border-theme-navDivider px-6 py-12 text-center text-sm text-theme-muted">
      Lance la simulation pour voir la sphere 1 a 50 sortir ses chiffres, puis la sphere 1 a 12 prendre le relais.
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
      <section
        v-for="world in worlds"
        :key="world.config.key"
        class="rounded-[1.75rem] border border-theme-navDivider bg-gradient-to-br p-5"
        :class="world.config.gradientClass"
      >
        <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-theme-muted">
              {{ world.config.label }}
            </p>
            <h3 class="mt-1 text-lg font-semibold text-theme-text">
              {{ world.winners.length }} / {{ world.config.targetWinners }} chiffre(s) sortis
            </h3>
          </div>

          <div class="rounded-full bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-theme-text">
            {{ nextTrapLabel(world) }}
          </div>
        </div>

        <div class="mb-5 flex justify-center">
          <div
            class="relative overflow-hidden rounded-full border border-theme-navDivider bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.95),rgba(255,255,255,0.55),rgba(31,79,174,0.12))] shadow-inner"
            :style="arenaStyle(world)"
          >
            <div
              class="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300"
              :class="world.mixFlash > 0 ? 'opacity-100' : 'opacity-0'"
              :style="{ background: `radial-gradient(circle, rgba(255,255,255,0.1), rgba(31,79,174,${0.12 + world.mixFlash * 0.15}))` }"
            ></div>

            <div class="absolute inset-x-[12%] bottom-[6%] h-[22%] rounded-[100%] bg-[radial-gradient(circle_at_50%_20%,rgba(0,23,61,0.15),rgba(0,23,61,0.02),transparent)]"></div>

            <div
              class="absolute left-1/2 bottom-[4.2%] h-4 min-w-[18px] -translate-x-1/2 rounded-full border border-theme-navDivider bg-white/90 shadow-sm transition-all duration-200"
              :class="world.trapOpen ? 'scale-y-50 bg-emerald-100' : 'bg-white/90'"
              :style="trapStyle(world)"
            ></div>

            <div
              v-for="ball in activeBalls(world)"
              :key="`${world.config.key}-${ball.id}`"
              class="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-theme-button text-[10px] font-semibold text-theme-buttonText shadow"
              :style="ballStyle(ball)"
            >
              {{ formatNumber(ball.id) }}
            </div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div class="rounded-3xl border border-white/60 bg-white/75 p-4">
            <p class="mb-3 text-xs uppercase tracking-[0.18em] text-theme-muted">
              Chiffres sortis
            </p>

            <div v-if="world.winners.length === 0" class="rounded-3xl bg-theme-bg px-4 py-5 text-sm text-theme-muted">
              Aucun chiffre n est encore passe sous la trappe.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="winner in world.winners"
                :key="`${world.config.key}-winner-${winner.drawIndex}`"
                class="flex items-center justify-between rounded-3xl bg-theme-bg px-4 py-3 text-sm text-theme-text"
              >
                <span>Sortie {{ winner.drawIndex }}</span>
                <span class="rounded-full bg-theme-button px-3 py-1 font-semibold text-theme-buttonText">
                  {{ formatNumber(winner.ballId) }}
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-3xl border border-white/60 bg-white/75 p-4">
            <p class="mb-3 text-xs uppercase tracking-[0.18em] text-theme-muted">
              Chronologie
            </p>

            <div class="space-y-2">
              <div
                v-for="entry in world.logs"
                :key="entry.id"
                class="flex items-start justify-between gap-3 rounded-3xl bg-theme-bg px-4 py-3 text-sm text-theme-text"
              >
                <div>
                  <span class="rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em]" :class="kindBadgeClass(entry.kind)">
                    {{ entry.kind }}
                  </span>
                  <p class="mt-2">
                    {{ entry.text }}
                  </p>
                </div>
                <span class="whitespace-nowrap text-xs text-theme-muted">
                  {{ formatSeconds(entry.atSimulatedSecond * selectedPreset.timeScale) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
