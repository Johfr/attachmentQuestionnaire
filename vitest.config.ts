import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

// Nuxt test-utils clones the generated test config before bootstrapping the
// app. In this project, some config objects coming from the Nuxt side can
// contain non-cloneable entries (typically functions), which raises a
// DataCloneError before any test file even starts.
//
// We keep the native structuredClone path first, and only fall back to a
// sanitized plain-object clone for that specific failure mode so the Nuxt
// runner remains usable without changing app runtime behavior.
const nativeStructuredClone = globalThis.structuredClone.bind(globalThis)

const sanitizeForClone = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (typeof value === 'function') return undefined

  if (!value || typeof value !== 'object') {
    return value
  }

  if (seen.has(value)) {
    return undefined
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeForClone(item, seen))
      .filter(item => item !== undefined)
  }

  const sanitized: Record<string, unknown> = {}

  for (const [key, entry] of Object.entries(value)) {
    const nextValue = sanitizeForClone(entry, seen)
    if (nextValue !== undefined) {
      sanitized[key] = nextValue
    }
  }

  return sanitized
}

globalThis.structuredClone = ((value: unknown, options?: StructuredSerializeOptions) => {
  try {
    return nativeStructuredClone(value, options)
  } catch {
    return sanitizeForClone(value)
  }
}) as typeof structuredClone

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
          // Mocks Firebase SDK before the Nuxt app initializes so protobufjs/long
          // never runs in happy-dom (which lacks the required native binding).
          setupFiles: ['./test/setup.nuxt.ts'],
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('.', import.meta.url)),
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
  },
})
