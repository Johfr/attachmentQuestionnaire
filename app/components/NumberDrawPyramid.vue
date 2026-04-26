<script setup lang="ts">
type ScriptKey = 'primary' | 'secondary'
type ScriptStatus = 'idle' | 'running' | 'success' | 'failed'
type AttemptStatus = 'running' | 'success' | 'failed'

interface PassEntry {
  index: number
  survivors: number[]
}

interface ScriptState {
  key: ScriptKey
  label: string
  rangeLabel: string
  startCount: number
  targetCount: number
  accentClass: string
  status: ScriptStatus
  passes: PassEntry[]
  finalNumbers: number[]
}

interface AttemptState {
  attemptNumber: number
  launchMode: 'simultaneous' | 'staggered'
  status: AttemptStatus
  totalWinners: number
  scripts: Record<ScriptKey, ScriptState>
}

const PASS_DELAY_MS = 280
const STAGGER_DELAY_MS = 420
const RETRY_DELAY_MS = 650

const autoRunOptions = Array.from({ length: 20 }, (_, index) => index + 1)

const maxAutoRuns = ref(5)
const runSimultaneously = ref(false)
const isRunning = ref(false)
const errorMessage = ref('')
const attempts = ref<AttemptState[]>([])

const successfulAttempt = computed(() => {
  return attempts.value.find(attempt => attempt.status === 'success') ?? null
})

const summaryMessage = computed(() => {
  if (isRunning.value) {
    return 'Tirage en cours... les deux scripts avancent tour apres tour.'
  }

  if (successfulAttempt.value) {
    return `Tour parfait trouve a l'essai ${successfulAttempt.value.attemptNumber}.`
  }

  if (attempts.value.length > 0) {
    return `Aucun tour parfait apres ${attempts.value.length} essai(s). Tu peux relancer manuellement.`
  }

  return 'Le composant attend ton lancement.'
})

const winningNumbersSummary = computed(() => {
  if (!successfulAttempt.value) {
    return ''
  }

  const primary = successfulAttempt.value.scripts.primary.finalNumbers.map(formatNumber).join(' ')
  const secondary = successfulAttempt.value.scripts.secondary.finalNumbers.map(formatNumber).join(' ')

  return `Script 1 : ${primary} | Script 2 : ${secondary}`
})

function formatNumber(value: number) {
  return value.toString().padStart(2, '0')
}

function buildRange(total: number) {
  return Array.from({ length: total }, (_, index) => index + 1)
}

function sleep(duration: number) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

function secureCoinFlip() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Le navigateur ne permet pas d utiliser crypto.getRandomValues().')
  }

  const buffer = new Uint8Array(1)
  globalThis.crypto.getRandomValues(buffer)
  return (buffer[0] & 1) === 1
}

function createScriptState(
  key: ScriptKey,
  label: string,
  rangeLabel: string,
  startCount: number,
  targetCount: number,
  accentClass: string,
): ScriptState {
  return {
    key,
    label,
    rangeLabel,
    startCount,
    targetCount,
    accentClass,
    status: 'idle',
    passes: [],
    finalNumbers: [],
  }
}

function createAttemptState(attemptNumber: number): AttemptState {
  return {
    attemptNumber,
    launchMode: runSimultaneously.value ? 'simultaneous' : 'staggered',
    status: 'running',
    totalWinners: 0,
    scripts: {
      primary: createScriptState('primary', 'Script 1', '1 a 50', 50, 5, 'from-amber-500/20 to-orange-500/10'),
      secondary: createScriptState('secondary', 'Script 2', '1 a 12', 12, 2, 'from-sky-500/20 to-cyan-500/10'),
    },
  }
}

async function runScript(script: ScriptState, initialDelay = 0) {
  if (initialDelay > 0) {
    await sleep(initialDelay)
  }

  let currentPool = buildRange(script.startCount)
  script.status = 'running'

  while (currentPool.length > script.targetCount) {
    const survivors = currentPool.filter(() => secureCoinFlip())

    script.passes.push({
      index: script.passes.length + 1,
      survivors: [...survivors],
    })
    script.finalNumbers = [...survivors]

    await nextTick()

    if (survivors.length === script.targetCount) {
      script.status = 'success'
      return {
        success: true,
        numbers: survivors,
      }
    }

    if (survivors.length < script.targetCount) {
      script.status = 'failed'
      return {
        success: false,
        numbers: survivors,
      }
    }

    currentPool = survivors
    await sleep(PASS_DELAY_MS)
  }

  script.status = currentPool.length === script.targetCount ? 'success' : 'failed'
  script.finalNumbers = [...currentPool]

  return {
    success: script.status === 'success',
    numbers: [...currentPool],
  }
}

async function startDraw() {
  if (isRunning.value) {
    return
  }

  errorMessage.value = ''
  attempts.value = []

  if (!globalThis.crypto?.getRandomValues) {
    errorMessage.value = 'Le vrai hasard via Web Crypto n est pas disponible dans ce navigateur.'
    return
  }

  isRunning.value = true

  try {
    for (let attemptNumber = 1; attemptNumber <= maxAutoRuns.value; attemptNumber += 1) {
      const attempt = createAttemptState(attemptNumber)
      attempts.value.push(attempt)

      const [primaryResult, secondaryResult] = await Promise.all([
        runScript(attempt.scripts.primary),
        runScript(
          attempt.scripts.secondary,
          runSimultaneously.value ? 0 : STAGGER_DELAY_MS,
        ),
      ])

      attempt.totalWinners = primaryResult.numbers.length + secondaryResult.numbers.length
      attempt.status = primaryResult.success && secondaryResult.success ? 'success' : 'failed'

      if (attempt.status === 'success') {
        break
      }

      if (attemptNumber < maxAutoRuns.value) {
        await sleep(RETRY_DELAY_MS)
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Une erreur est survenue pendant le tirage.'
  } finally {
    isRunning.value = false
  }
}

function statusBadgeClass(status: ScriptStatus | AttemptStatus) {
  if (status === 'success') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'failed') {
    return 'bg-rose-100 text-rose-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function statusLabel(status: ScriptStatus | AttemptStatus) {
  if (status === 'success') {
    return 'Exact'
  }

  if (status === 'failed') {
    return 'A relancer'
  }

  if (status === 'running') {
    return 'En cours'
  }

  return 'En attente'
}

function orderedScripts(attempt: AttemptState) {
  return [attempt.scripts.primary, attempt.scripts.secondary]
}
</script>

<template>
  <section class="rounded-[2rem] border border-theme-navDivider bg-theme-surfaceStaticCard p-6 md:p-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.28em] text-theme-muted">
          Tirage double
        </p>
        <h2 class="mt-2 text-2xl font-semibold text-theme-text md:text-3xl">
          Selection pyramidale
        </h2>
        <p class="mt-3 max-w-3xl text-sm text-theme-muted">
          Le 50/50 utilise <code>crypto.getRandomValues()</code> cote navigateur. Script 1 cherche exactement 5 chiffres sur 50. Script 2 cherche exactement 2 chiffres sur 12.
        </p>
      </div>

      <div class="rounded-3xl border border-theme-navDivider bg-theme-bg p-4 text-sm text-theme-muted lg:max-w-md">
        <p class="font-medium text-theme-text">
          {{ summaryMessage }}
        </p>
        <p v-if="winningNumbersSummary" class="mt-2 text-xs uppercase tracking-[0.18em] text-theme-muted">
          {{ winningNumbersSummary }}
        </p>
      </div>
    </div>

    <div class="mb-8 grid gap-4 rounded-[1.75rem] border border-theme-navDivider bg-theme-bg p-4 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto] md:items-end">
      <label class="flex flex-col gap-2 text-sm text-theme-text">
        <span class="font-medium">Relances automatiques max</span>
        <select
          v-model="maxAutoRuns"
          class="rounded-2xl border border-theme-navDivider bg-theme-surfaceFormInput px-4 py-3 text-sm text-theme-text"
          :disabled="isRunning"
        >
          <option v-for="option in autoRunOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>

      <label class="flex items-start gap-3 rounded-3xl border border-theme-navDivider bg-theme-surfaceStaticCard px-4 py-3 text-sm text-theme-text">
        <input
          v-model="runSimultaneously"
          type="checkbox"
          class="mt-1 h-4 w-4 rounded border-theme-navDivider"
          :disabled="isRunning"
        >
        <span>
          <span class="block font-medium">Lancer les deux en meme temps</span>
          <span class="mt-1 block text-theme-muted">
            Si l option est decochee, le script 1 demarre d abord puis le script 2 le rejoint juste apres.
          </span>
        </span>
      </label>

      <button
        type="button"
        class="rounded-3xl bg-theme-button px-6 py-4 text-sm font-semibold text-theme-buttonText shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isRunning"
        @click="startDraw"
      >
        {{ isRunning ? 'Tirage en cours...' : 'Lancer le tirage' }}
      </button>
    </div>

    <p v-if="errorMessage" class="mb-6 rounded-3xl bg-rose-100 px-4 py-3 text-sm text-rose-700">
      {{ errorMessage }}
    </p>

    <div v-if="attempts.length === 0" class="rounded-[1.75rem] border border-dashed border-theme-navDivider px-6 py-10 text-center text-sm text-theme-muted">
      Lance le bouton pour afficher les tours du script 1 et du script 2 ligne par ligne.
    </div>

    <div v-else class="space-y-5">
      <article
        v-for="attempt in attempts"
        :key="attempt.attemptNumber"
        class="rounded-[1.75rem] border border-theme-navDivider bg-theme-bg p-5"
      >
        <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-theme-muted">
              Essai {{ attempt.attemptNumber }}
            </p>
            <h3 class="mt-1 text-lg font-semibold text-theme-text">
              {{ attempt.launchMode === 'simultaneous' ? 'Les deux scripts en meme temps' : 'Script 1 puis script 2' }}
            </h3>
          </div>

          <div class="flex flex-wrap items-center gap-3 text-sm">
            <span class="rounded-full px-3 py-1 font-medium" :class="statusBadgeClass(attempt.status)">
              {{ statusLabel(attempt.status) }}
            </span>
            <span class="text-theme-muted">
              Total final : {{ attempt.totalWinners }} chiffre(s)
            </span>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <section
            v-for="script in orderedScripts(attempt)"
            :key="script.key"
            class="rounded-[1.5rem] border border-theme-navDivider bg-gradient-to-br p-4"
            :class="script.accentClass"
          >
            <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 class="text-base font-semibold text-theme-text">
                  {{ script.label }}
                </h4>
                <p class="text-xs uppercase tracking-[0.18em] text-theme-muted">
                  {{ script.rangeLabel }} -> cible {{ script.targetCount }}
                </p>
              </div>

              <span class="rounded-full px-3 py-1 text-xs font-medium" :class="statusBadgeClass(script.status)">
                {{ statusLabel(script.status) }}
              </span>
            </div>

            <div class="space-y-3">
              <div v-if="script.passes.length === 0" class="rounded-3xl bg-white/70 px-4 py-5 text-sm text-theme-muted">
                En attente du premier passage...
              </div>

              <div
                v-for="pass in script.passes"
                :key="`${script.key}-${attempt.attemptNumber}-${pass.index}`"
                class="rounded-3xl border border-white/50 bg-white/75 p-4 shadow-sm backdrop-blur-sm"
              >
                <div class="mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-theme-muted">
                  <span>Tour {{ pass.index }}</span>
                  <span>{{ pass.survivors.length }} retenu(s)</span>
                </div>

                <div class="flex flex-wrap justify-center gap-2">
                  <span
                    v-if="pass.survivors.length === 0"
                    class="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700"
                  >
                    Aucun chiffre
                  </span>
                  <span
                    v-for="value in pass.survivors"
                    :key="`${script.key}-${attempt.attemptNumber}-${pass.index}-${value}`"
                    class="rounded-full border border-theme-navDivider bg-white px-3 py-1 text-sm font-medium text-theme-text shadow-sm"
                  >
                    {{ formatNumber(value) }}
                  </span>
                </div>
              </div>
            </div>

            <div
              class="mt-4 rounded-3xl px-4 py-3 text-sm"
              :class="script.status === 'success' ? 'bg-emerald-100 text-emerald-800' : script.status === 'failed' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'"
            >
              <span v-if="script.status === 'success'">
                Gagnants finaux : {{ script.finalNumbers.map(formatNumber).join(' ') }}
              </span>
              <span v-else-if="script.status === 'failed'">
                Fin de course a {{ script.finalNumbers.length }} chiffre(s). Il faut relancer.
              </span>
              <span v-else>
                Le script continue tant qu il reste plus de {{ script.targetCount }} chiffres.
              </span>
            </div>
          </section>
        </div>
      </article>
    </div>
  </section>
</template>
