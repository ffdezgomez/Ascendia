import { execSync } from 'node:child_process'

try {
  execSync('husky install', { stdio: 'inherit' })
} catch (error) {
  const reason = error && error.message ? error.message : 'unknown reason'
  console.log(`[husky] skipped: ${reason}`)
}
