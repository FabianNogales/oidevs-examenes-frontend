// Live QA gate (DS5-F1). Browser scripts that reach the real app (Vite 5173), the real backend
// (127.0.0.1:8000), real credentials or data never run by default, not even in a general battery:
// each one needs its own explicit token, EIDA_LIVE_QA=<name>, set by someone authorised to use that
// environment. Without it the script prints SKIP and must stop before any network, profile or file work.
export const LIVE_QA_ENV = 'EIDA_LIVE_QA'

export function liveQaEnabled(name, env = process.env) {
  return (env[LIVE_QA_ENV] ?? '')
    .split(',')
    .map((token) => token.trim())
    .includes(name)
}

export function requireLiveQa(name, reason, env = process.env) {
  if (liveQaEnabled(name, env)) return true
  console.log(
    `SKIP ${name}: prueba en vivo (${reason}). Solo con autorización explícita: ${LIVE_QA_ENV}=${name}`,
  )
  return false
}
