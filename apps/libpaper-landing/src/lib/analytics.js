import { pb } from './pocketbase'

/**
 * Lightweight first-party analytics. Fire-and-forget POST to /api/events
 * (nginx proxies to the launchpad backend). Never blocks or fails the caller.
 * Events: signup | login | first_generate | purchase | subscription |
 *         tool_use | out_of_credits
 */
export function track(event, props = {}) {
  try {
    const token = pb.authStore.token
    fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ event, props: { ...props, t: Date.now() } }),
    }).catch(() => {})
  } catch {
    // telemetry must never break the app
  }
}
