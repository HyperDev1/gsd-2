import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'

export function showReleaseNotes(): void {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
    const version: string = pkg.version || '0.0.0'

    // Find last release commit
    let lastRelease = ''
    try {
      execSync(`git rev-parse "v${version}" 2>/dev/null`, { cwd: root })
      lastRelease = `v${version}`
    } catch {
      try {
        lastRelease = execSync(
          `git log --all --format=%H --grep="release: v${version}" -1`,
          { cwd: root, encoding: 'utf8' },
        ).trim()
      } catch { /* ignore */ }
    }

    const range = lastRelease ? `${lastRelease}..HEAD` : '-20'
    let log = ''
    try {
      log = execSync(`git log ${range} --oneline --no-merges`, {
        cwd: root,
        encoding: 'utf8',
      }).trim()
    } catch {
      return // not a git repo or git not available
    }

    const line = '─'.repeat(50)

    process.stderr.write('\n')
    process.stderr.write(`${CYAN}${line}${RESET}\n`)
    process.stderr.write(`${BOLD}${GREEN} GSD${RESET} ${DIM}v${version}${RESET}\n`)
    process.stderr.write(`${CYAN}${line}${RESET}\n`)

    if (!log) {
      process.stderr.write(`${DIM}  No changes since last release.${RESET}\n`)
    } else {
      const commits = log.split('\n')
      process.stderr.write(`${BOLD} Changes since v${version}:${RESET}\n`)
      process.stderr.write('\n')
      for (const c of commits) {
        const match = c.match(/^([a-f0-9]+)\s+(.*)$/)
        if (!match) continue
        const [, hash, msg] = match

        let icon = '•'
        let color = RESET
        if (msg.startsWith('feat')) { icon = '✦'; color = GREEN }
        else if (msg.startsWith('fix')) { icon = '✧'; color = YELLOW }
        else if (msg.startsWith('refactor')) { icon = '↻'; color = CYAN }
        else if (msg.startsWith('test')) { icon = '⊘'; color = DIM }
        else if (msg.startsWith('docs')) { icon = '◈'; color = DIM }

        process.stderr.write(`  ${color}${icon} ${DIM}${hash}${RESET} ${msg}\n`)
      }
      process.stderr.write('\n')
      process.stderr.write(`${DIM}  ${commits.length} commit(s) since last release${RESET}\n`)
    }
    process.stderr.write(`${CYAN}${line}${RESET}\n`)
    process.stderr.write('\n')
  } catch {
    // Non-fatal — never block startup
  }
}
