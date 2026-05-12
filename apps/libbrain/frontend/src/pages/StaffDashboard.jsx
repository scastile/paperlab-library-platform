import { useState, useEffect, useMemo } from 'react'
import { BarChart3, Download, Sparkles, Copy, Check, Loader2, Calendar, PieChart, Image, Key, Eye, EyeOff, ChevronDown, ChevronRight, Settings, Save, MapPin, Phone, Clock, Globe, FileText, Cpu, Zap } from 'lucide-react'
import { getStats, exportStats, generateCampaign, getSettings, updateSettings } from '../lib/api'

const PERIODS = ['daily', 'weekly', 'monthly']
const AUDIENCES = ['children', 'teens', 'adults', 'seniors', 'all']
const STYLES = [
  { value: 'formal', label: 'Formal', icon: '📋' },
  { value: 'playful', label: 'Playful', icon: '🎉' },
  { value: 'educational', label: 'Educational', icon: '📚' },
  { value: 'seasonal', label: 'Seasonal', icon: '🍂' },
  { value: 'social_media', label: 'Social Media', icon: '📱' },
  { value: 'newsletter', label: 'Newsletter', icon: '📰' },
  { value: 'event_announcement', label: 'Event Announcement', icon: '📢' },
  { value: 'shelf_talker', label: 'Shelf Talker', icon: '🏷️' },
  { value: 'email_blast', label: 'Email Blast', icon: '✉️' },
  { value: 'bulletin_board', label: 'Bulletin Board', icon: '📌' },
  { value: 'flyer', label: 'Flyer', icon: '📄' },
  { value: 'infographic', label: 'Infographic', icon: '📊' },
  { value: 'blog_post', label: 'Blog Post', icon: '✍️' },
]

const SOCIAL_TABS = [
  { key: 'twitter', label: 'Twitter / X', icon: '𝕏' },
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'facebook', label: 'Facebook', icon: '👤' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
]

const CATEGORY_COLORS = {
  reference: '#3b82f6',
  readers_advisory: '#8b5cf6',
  tech_help: '#f97316',
  directional: '#10b981',
  general: '#6b7280',
}

const PROVIDERS = [
  { key: 'mimo', label: 'MiMo (Xiaomi)', icon: '🧠', hasKey: 'mimo_api_key', modelKey: 'mimo_model', defaultModel: 'mimo-v2.5-pro' },
  { key: 'openrouter', label: 'OpenRouter', icon: '🔀', hasKey: 'openrouter_api_key', modelKey: 'openrouter_model', defaultModel: 'google/gemini-2.5-flash' },
  { key: 'claude', label: 'Claude (Anthropic)', icon: '🎭', hasKey: 'anthropic_api_key', modelKey: 'claude_model', defaultModel: 'claude-sonnet-4-20250514' },
  { key: 'chatgpt', label: 'ChatGPT (OpenAI)', icon: '💬', hasKey: 'openai_api_key', modelKey: 'chatgpt_model', defaultModel: 'gpt-4o-mini' },
  { key: 'nous', label: 'Nous Research', icon: '🔬', hasKey: 'nous_api_key', modelKey: 'nous_model', defaultModel: 'deepseek/deepseek-v4-flash' },
  { key: 'nvidia', label: 'NVIDIA', icon: '💚', hasKey: 'nvidia_api_key', modelKey: 'nvidia_model', defaultModel: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  { key: 'gemini', label: 'Gemini (Google)', icon: '✦', hasKey: 'gemini_api_key', modelKey: 'gemini_model', defaultModel: 'gemini-2.5-flash' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return ''
  let html = md
    .replace(/^---+$/gm, '<hr class="my-3 border-default" />')
    .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-bold text-primary mt-4 mb-1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-primary mt-4 mb-1.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-primary mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-primary mt-5 mb-2">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-primary">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-page text-xs font-mono">$1</code>')
    .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>')
    .replace(/\n\n+/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>')

  html = '<p class="mb-3">' + html + '</p>'
  html = html.replace(/<p class="mb-3"><\/p>/g, '')
  html = html.replace(/<p class="mb-3"><(h[1-4]|hr|li)/g, '<$1')
  html = html.replace(/<\/(h[1-4]|hr|li)><\/p>/g, '</$1>')
  return html
}

function stripMarkdown(md) {
  if (!md || typeof md !== 'string') return ''
  return md
    .replace(/^---+$/gm, '')
    .replace(/^#{1,4} /gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[\-\*] /gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

// ---------------------------------------------------------------------------
// DonutChart (conic-gradient)
// ---------------------------------------------------------------------------

function DonutChart({ segments, size = 140, thickness = 28 }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-xs text-tertiary">No data</div>
      </div>
    )
  }

  let accumulated = 0
  const stops = segments.map(s => {
    const start = (accumulated / total) * 360
    accumulated += s.value
    const end = (accumulated / total) * 360
    return `${s.color} ${start}deg ${end}deg`
  })

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `conic-gradient(${stops.join(', ')})`,
          mask: `radial-gradient(circle at center, transparent ${size / 2 - thickness}px, black ${size / 2 - thickness + 1}px)`,
          WebkitMask: `radial-gradient(circle at center, transparent ${size / 2 - thickness}px, black ${size / 2 - thickness + 1}px)`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-primary">{total}</div>
        <div className="text-[10px] text-tertiary">total</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Layout
// ---------------------------------------------------------------------------

export default function StaffDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-primary mb-6">Staff Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <ReferenceStats />
          <LibrarySettings />
          <ProviderSettings />
          <ChangePassword />
        </div>
        <CampaignGenerator />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChangePassword (collapsible, left column)
// ---------------------------------------------------------------------------

function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const handleChange = async () => {
    setMessage(null)
    if (!currentPw || !newPw) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' })
      return
    }
    if (newPw !== confirmPw) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    if (newPw.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('libbrain_token')
      const res = await fetch('/api/staff/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to change password')
      }
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card-lift overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-hover transition-colors"
      >
        <Key size={16} className="text-[#6366f1]" />
        <span className="font-semibold text-primary text-sm flex-1">Change Password</span>
        {open ? <ChevronDown size={16} className="text-tertiary" /> : <ChevronRight size={16} className="text-tertiary" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-default pt-3">
          <div>
            <label className="section-label mb-1 block">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="section-label mb-1 block">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="section-label mb-1 block">Confirm New Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
            />
          </div>

          {message && (
            <div className={`text-xs rounded-lg p-2 text-center ${
              message.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-500 bg-red-50'
            }`}>
              {message.text}
            </div>
          )}

          <button onClick={handleChange} disabled={saving} className="btn-outline w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LibrarySettings (collapsible, left column)
// ---------------------------------------------------------------------------

function LibrarySettings() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (open && !settings) {
      setLoading(true)
      getSettings()
        .then(setSettings)
        .catch(() => setSettings({}))
        .finally(() => setLoading(false))
    }
  }, [open])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await updateSettings(settings)
      setMessage({ type: 'success', text: 'Settings saved!' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setMessage(null)
  }

  return (
    <div className="card-lift overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-hover transition-colors"
      >
        <Settings size={16} className="text-[#6366f1]" />
        <span className="font-semibold text-primary text-sm flex-1">Library Information</span>
        {open ? <ChevronDown size={16} className="text-tertiary" /> : <ChevronRight size={16} className="text-tertiary" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-default pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#6366f1]" />
            </div>
          ) : (
            <>
              <div>
                <label className="section-label mb-1 flex items-center gap-1.5"><MapPin size={12} /> Library Name</label>
                <input
                  type="text"
                  value={settings?.library_name || ''}
                  onChange={(e) => update('library_name', e.target.value)}
                  placeholder="e.g. Springfield Public Library"
                  className="w-full px-3 py-2 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                />
              </div>

              <div>
                <label className="section-label mb-1 flex items-center gap-1.5"><MapPin size={12} /> Address</label>
                <input
                  type="text"
                  value={settings?.address || ''}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="123 Main St, Springfield, IL 62701"
                  className="w-full px-3 py-2 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label mb-1 flex items-center gap-1.5"><Phone size={12} /> Phone</label>
                  <input
                    type="text"
                    value={settings?.phone || ''}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                  />
                </div>
                <div>
                  <label className="section-label mb-1 flex items-center gap-1.5"><Globe size={12} /> Website</label>
                  <input
                    type="text"
                    value={settings?.website || ''}
                    onChange={(e) => update('website', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                  />
                </div>
              </div>

              <div>
                <label className="section-label mb-1 flex items-center gap-1.5"><Clock size={12} /> Hours</label>
                <textarea
                  value={settings?.hours || ''}
                  onChange={(e) => update('hours', e.target.value)}
                  placeholder={"Mon-Fri: 9am-8pm\nSat: 10am-5pm\nSun: Closed"}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] resize-none"
                />
              </div>

              <div>
                <label className="section-label mb-1 flex items-center gap-1.5"><FileText size={12} /> Policies</label>
                <textarea
                  value={settings?.policies || ''}
                  onChange={(e) => update('policies', e.target.value)}
                  placeholder="Checkout limits, fines, card requirements, etc."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] resize-none"
                />
              </div>

              <div>
                <label className="section-label mb-1 flex items-center gap-1.5"><FileText size={12} /> Custom FAQ / Additional Info</label>
                <textarea
                  value={settings?.custom_faq || ''}
                  onChange={(e) => update('custom_faq', e.target.value)}
                  placeholder="Any other info patrons commonly ask about..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] resize-none"
                />
              </div>

              {message && (
                <div className={`text-xs rounded-lg p-2 text-center ${
                  message.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-500 bg-red-50'
                }`}>
                  {message.text}
                </div>
              )}

              <button onClick={handleSave} disabled={saving} className="btn-gradient w-full">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>

              <p className="text-[10px] text-tertiary text-center">
                This information is used by LibBrain to answer patron questions accurately.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProviderSettings (collapsible, left column)
// ---------------------------------------------------------------------------

function ProviderSettings() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showKeys, setShowKeys] = useState({})

  useEffect(() => {
    if (open && !settings) {
      setLoading(true)
      getSettings()
        .then(setSettings)
        .catch(() => setSettings({}))
        .finally(() => setLoading(false))
    }
  }, [open])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await updateSettings(settings)
      setMessage({ type: 'success', text: 'Provider settings saved!' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setMessage(null)
  }

  const toggleShowKey = (key) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const activeProvider = settings?.primary_provider || 'mimo'

  return (
    <div className="card-lift overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-hover transition-colors"
      >
        <Cpu size={16} className="text-[#6366f1]" />
        <span className="font-semibold text-primary text-sm flex-1">AI Providers</span>
        <span className="text-[10px] text-tertiary mr-2">
          {activeProvider === 'mimo' ? 'MiMo' : activeProvider === 'openrouter' ? 'OpenRouter' : activeProvider === 'claude' ? 'Claude' : activeProvider === 'chatgpt' ? 'ChatGPT' : activeProvider === 'nous' ? 'Nous' : activeProvider === 'nvidia' ? 'NVIDIA' : 'Gemini'}
        </span>
        {open ? <ChevronDown size={16} className="text-tertiary" /> : <ChevronRight size={16} className="text-tertiary" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-default pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#6366f1]" />
            </div>
          ) : (
            <>
              <div>
                <label className="section-label mb-2 block">Primary Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => update('primary_provider', p.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        activeProvider === p.key
                          ? 'border-[#6366f1] bg-[#6366f1]/5 text-[#6366f1]'
                          : 'border-default bg-page text-secondary hover:border-[#6366f1]/30'
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                      {activeProvider === p.key && <Zap size={12} className="ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {PROVIDERS.map(p => (
                <div key={p.key} className={`rounded-lg p-3 border transition-colors ${
                  activeProvider === p.key ? 'border-[#6366f1]/30 bg-[#6366f1]/5' : 'border-default'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{p.icon}</span>
                    <span className="text-xs font-semibold text-primary">{p.label}</span>
                    {activeProvider === p.key && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#6366f1] text-white">Active</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="section-label mb-1 block">API Key</label>
                      <div className="relative">
                        <input
                          type={showKeys[p.hasKey] ? 'text' : 'password'}
                          value={settings?.[p.hasKey] || ''}
                          onChange={(e) => update(p.hasKey, e.target.value)}
                          placeholder={settings?.[p.hasKey] ? '••••••••' : 'Enter API key...'}
                          className="w-full px-3 py-1.5 pr-10 rounded-lg border border-default bg-page text-primary text-xs focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(p.hasKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
                        >
                          {showKeys[p.hasKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="section-label mb-1 block">Model (optional)</label>
                      <input
                        type="text"
                        value={settings?.[p.modelKey] || ''}
                        onChange={(e) => update(p.modelKey, e.target.value)}
                        placeholder={p.defaultModel}
                        className="w-full px-3 py-1.5 rounded-lg border border-default bg-page text-primary text-xs focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-tertiary text-center">
                Bring your own API keys. Settings keys override environment variables.
                The active provider is tried first, then fallbacks in order.
              </p>

              {message && (
                <div className={`text-xs rounded-lg p-2 text-center ${
                  message.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-500 bg-red-50'
                }`}>
                  {message.text}
                </div>
              )}

              <button onClick={handleSave} disabled={saving} className="btn-gradient w-full">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Provider Settings'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReferenceStats (donut chart + stats card + bar chart + CSV export)
// ---------------------------------------------------------------------------

function ReferenceStats() {
  const [period, setPeriod] = useState('daily')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    getStats(period)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [period])

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportStats(period)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `libbrain-stats-${period}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const categories = stats?.by_category || {}
  const total = Object.values(categories).reduce((a, b) => a + b, 0)
  const maxVal = Math.max(...Object.values(categories), 1)

  const REFERENCE_CATS = new Set(['reference', 'readers_advisory', 'tech_help'])
  const refCount = Object.entries(categories)
    .filter(([cat]) => REFERENCE_CATS.has(cat))
    .reduce((sum, [, c]) => sum + c, 0)
  const otherCount = total - refCount

  const donutSegments = [
    { label: 'Reference Types', value: refCount, color: '#6366f1' },
    { label: 'Other', value: otherCount || 0, color: '#e2e8f0' },
  ]

  const categorySegments = Object.entries(categories)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => ({
      label: cat.replace(/_/g, ' '),
      value: count,
      color: CATEGORY_COLORS[cat] || '#6b7280',
    }))

  return (
    <>
      {/* Donut chart card */}
      <div className="card-lift p-5">
        <div className="flex items-center gap-2 mb-3">
          <PieChart size={18} className="text-[#6366f1]" />
          <h2 className="font-semibold text-primary">Question Types</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[#6366f1]" />
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* Donut */}
            <DonutChart segments={categorySegments} size={140} thickness={28} />

            {/* Legend */}
            <div className="flex-1 space-y-1.5">
              {categorySegments.map(seg => (
                <div key={seg.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs text-secondary capitalize flex-1">{seg.label}</span>
                  <span className="text-xs font-semibold text-primary">{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats card with period toggle, total, bar chart, CSV export */}
      <div className="card-lift p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#6366f1]" />
            <h2 className="font-semibold text-primary">Reference Statistics</h2>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={14} className="text-tertiary" />
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-[#6366f1] text-white'
                    : 'text-tertiary hover:text-secondary hover:bg-hover'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[#6366f1]" />
          </div>
        ) : (
          <>
            {/* Total count - purple gradient */}
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white text-center">
              <div className="text-3xl font-bold">{total}</div>
              <div className="text-xs opacity-80 mt-0.5">Total Questions ({period})</div>
            </div>

            {/* Bar chart by category */}
            <div className="space-y-2 mb-4">
              {Object.entries(categories)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-xs text-secondary capitalize w-28 truncate">{cat.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-5 bg-page rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(count / maxVal) * 100}%`,
                          backgroundColor: CATEGORY_COLORS[cat] || '#6b7280',
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-primary w-8 text-right">{count}</span>
                  </div>
                ))}
            </div>

            {/* CSV Export */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-outline w-full"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// CampaignGenerator (right column)
// ---------------------------------------------------------------------------

function CampaignGenerator() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('all')
  const [style, setStyle] = useState('formal')
  const [generating, setGenerating] = useState(false)
  const [campaign, setCampaign] = useState(null)
  const [copied, setCopied] = useState(false)
  const [socialTab, setSocialTab] = useState('twitter')
  const [platformCopied, setPlatformCopied] = useState({})

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setCampaign(null)
    setCopied(false)
    setPlatformCopied({})
    try {
      const result = await generateCampaign(topic, audience, style)
      setCampaign(result)
    } catch (err) {
      setCampaign({ error: err.message || 'Failed to generate campaign.' })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!campaign?.content) return
    await copyToClipboard(stripMarkdown(campaign.content))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePlatformCopy = async (platformKey, text) => {
    if (!text) return
    await copyToClipboard(stripMarkdown(text))
    setPlatformCopied(prev => ({ ...prev, [platformKey]: true }))
    setTimeout(() => setPlatformCopied(prev => ({ ...prev, [platformKey]: false })), 2000)
  }

  const isSocialMedia = style === 'social_media'
  const platforms = campaign?.platforms || {}
  const activePlatformContent = platforms[socialTab] || ''

  return (
    <div className="card-lift p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-[#6366f1]" />
        <h2 className="font-semibold text-primary">Campaign Generator</h2>
      </div>

      <div className="space-y-3">
        {/* Topic */}
        <div>
          <label className="section-label mb-1 block">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Summer Reading Program, Book Sale, New Databases"
            className="w-full px-3 py-2 rounded-lg border border-default bg-page text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
        </div>

        {/* Audience */}
        <div>
          <label className="section-label mb-1 block">Audience</label>
          <div className="flex flex-wrap gap-1.5">
            {AUDIENCES.map(a => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  audience === a
                    ? 'bg-[#6366f1] text-white'
                    : 'border border-default bg-page text-secondary hover:border-[#6366f1]/30'
                }`}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div>
          <label className="section-label mb-1 block">Style</label>
          <div className="grid grid-cols-3 gap-1.5">
            {STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  style === s.value
                    ? 'bg-[#6366f1]/10 border border-[#6366f1] text-[#6366f1]'
                    : 'border border-default bg-page text-secondary hover:border-[#6366f1]/30'
                }`}
              >
                <span>{s.icon}</span>
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !topic.trim()}
          className="btn-gradient w-full"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? 'Generating...' : 'Generate Campaign'}
        </button>
      </div>

      {/* Campaign output */}
      {campaign && (
        <div className="mt-4">
          {campaign.error ? (
            <div className="text-xs text-red-500 bg-red-50 rounded-lg p-3 text-center">
              {campaign.error}
            </div>
          ) : (
            <>
              {isSocialMedia && Object.keys(platforms).length > 0 ? (
                <>
                  {/* Platform tabs */}
                  <div className="flex items-center gap-1 mb-3 border-b border-default">
                    {SOCIAL_TABS.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setSocialTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                          socialTab === tab.key
                            ? 'border-[#6366f1] text-[#6366f1]'
                            : 'border-transparent text-tertiary hover:text-secondary'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Per-platform content */}
                  <div className="mb-3">
                    <div
                      className="campaign-output text-sm text-secondary leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(activePlatformContent) }}
                    />
                  </div>

                  {/* Per-platform copy button */}
                  <button
                    onClick={() => handlePlatformCopy(socialTab, activePlatformContent)}
                    className="btn-outline w-full"
                  >
                    {platformCopied[socialTab] ? <Check size={16} /> : <Copy size={16} />}
                    {platformCopied[socialTab] ? 'Copied!' : `Copy ${SOCIAL_TABS.find(t => t.key === socialTab)?.label || ''} Content`}
                  </button>
                </>
              ) : (
                <>
                  {/* Standard campaign content */}
                  <div
                    className="campaign-output text-sm text-secondary leading-relaxed mb-3"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(campaign.content) }}
                  />

                  {/* Copy button */}
                  <button
                    onClick={handleCopy}
                    className="btn-outline w-full"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                </>
              )}

              {/* Image prompt if present */}
              {campaign.image_prompt && (
                <div className="mt-3 p-3 rounded-lg border border-default bg-page">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Image size={14} className="text-[#6366f1]" />
                    <span className="section-label">Image Prompt</span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">{campaign.image_prompt}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
