const API_BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add auth token if available
  const token = localStorage.getItem('libbrain_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || 'Request failed')
  }

  return res
}

export async function askQuestion(question, branchId = 'main') {
  const res = await request('/api/patron/ask', {
    method: 'POST',
    body: JSON.stringify({ question, branch_id: branchId }),
  })
  return res.json()
}

export async function getTtsAudio(question) {
  const res = await request('/api/patron/tts', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
  return res.blob()
}

export async function getStats(period = 'daily') {
  const res = await request(`/api/stats?period=${period}`)
  return res.json()
}

export async function exportStats(period = 'monthly') {
  const res = await request(`/api/stats/export?period=${period}`)
  return res.blob()
}

export async function generateCampaign(topic, audience, style, includeImagePrompt = false) {
  const res = await request('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify({ topic, audience, style, include_image_prompt: includeImagePrompt }),
  })
  return res.json()
}

export async function getSettings() {
  const res = await request('/api/settings')
  return res.json()
}

export async function updateSettings(settings) {
  const res = await request('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
  return res.json()
}

export async function getProfile() {
  const res = await request('/api/profile')
  return res.json()
}
