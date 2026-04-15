import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const [, , envFileArg, ...commandArgs] = process.argv

if (!envFileArg || commandArgs.length === 0) {
  console.error('Usage: node scripts/with-env.mjs <env-file> <command> [...args]')
  process.exit(1)
}

const envFilePath = resolve(process.cwd(), envFileArg)

if (!existsSync(envFilePath)) {
  console.error(`Environment file not found: ${envFileArg}`)
  process.exit(1)
}

const parseEnvFile = (fileContent) => {
  const parsed = {}

  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1)

    if (!key) continue
    parsed[key] = value
  }

  return parsed
}

const envOverrides = parseEnvFile(readFileSync(envFilePath, 'utf8'))
const [command, ...args] = commandArgs

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    ...envOverrides,
  },
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

