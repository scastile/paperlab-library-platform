import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import FlyerPreview from '../components/FlyerPreview'
import {
  Loader2, Wand2, Save, Trash2, FolderOpen, Palette, ChevronLeft, Sparkles,
  LayoutTemplate, Type, AlignLeft, Printer, FileImage, Image as ImageIcon, LogIn, X
} from 'lucide-react'

const API_BASE = '/flyer-api'

const VIBES = ["Modern & Sleek", "Whimsical", "Vintage Scholastic", "High-Energy", "Calm & Relaxing", "Festive"]
const AUDIENCES = ["All Ages", "Toddlers (0-5)", "Kids (6-11)", "Teens (12-17)", "Adults", "Seniors"]
const LAYOUTS = [
  { id: "poster", label: "Poster (8.5×11)", icon: LayoutTemplate },
  { id: "modern", label: "Modern", icon: Type },
  { id: "social", label: "Social Square", icon: ImageIcon },
  { id: "split", label: "Split", icon: AlignLeft },
  { id: "classic", label: "Classic", icon: Printer },
  { id: "minimal", label: "Minimal", icon: FileImage },
]

async function apiCall(path, options = {}, getToken) {
  const token = getToken?.()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Request failed (${res.status})` }))
    throw new Error(err.detail || `Request failed (${res.status})`)
  }
  return res
}

function SmartCanvasForm({ onGenerate, loading }) {
  const [eventName, setEventName] = useState("")
  const [description, setDescription] = useState("")
  const [theme, setTheme] = useState("")
  const [audience, setAudience] = useState("All Ages")
  const [vibe, setVibe] = useState("Modern & Sleek")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [timezone, setTimezone] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")
  const [layout, setLayout] = useState("poster")
  const [includeImage, setIncludeImage] = useState(true)
  const [backgroundDescription, setBackgroundDescription] = useState("")
  const [logoBase64, setLogoBase64] = useState("")

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setLogoBase64(reader.result.split(',')[1])
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!eventName.trim()) return
    onGenerate({
      event_name: eventName.trim(), event_description: description.trim(), theme: theme.trim(),
      audience, vibe, date, time, timezone, location: location.trim(), website: website.trim(),
      layout, include_image: includeImage, background_description: backgroundDescription.trim(), logo_base64: logoBase64,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="card-lift p-6 md:p-8 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl tint-indigo mb-4">
          <Palette className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-1">Design Your Flyer</h2>
        <p className="text-secondary text-sm">Describe your event and let AI handle the rest.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Event Name *</label>
          <input type="text" value={eventName} onChange={e => setEventName(e.target.value)}
            placeholder="e.g., Summer Reading Kickoff Party"
            className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What's happening? Who should come?" rows={3}
            className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30 resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Theme / Genre</label>
            <input type="text" value={theme} onChange={e => setTheme(e.target.value)}
              placeholder="e.g., Space Adventure, Mystery"
              className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Target Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30">
              {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-2">Vibe / Mood</label>
          <div className="flex flex-wrap gap-2">
            {VIBES.map(v => (
              <button key={v} type="button" onClick={() => setVibe(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${vibe === v ? 'btn-gradient' : 'bg-page border border-default text-secondary hover:bg-hover'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30">
              <option value="">None</option>
              <option value="ET">Eastern (ET)</option>
              <option value="CT">Central (CT)</option>
              <option value="MT">Mountain (MT)</option>
              <option value="PT">Pacific (PT)</option>
              <option value="AKT">Alaska (AKT)</option>
              <option value="HT">Hawaii (HT)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Main Branch Community Room"
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Website / Registration Link</label>
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-2">Layout</label>
          <div className="grid grid-cols-3 gap-3">
            {LAYOUTS.map(l => {
              const Icon = l.icon
              return (
                <button key={l.id} type="button" onClick={() => setLayout(l.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${layout === l.id ? 'border-accent-solid bg-accent-solid/10 text-primary' : 'border-default text-secondary hover:bg-hover'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{l.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Background Description</label>
          <textarea value={backgroundDescription} onChange={e => setBackgroundDescription(e.target.value)}
            placeholder="Describe what you want in the background image (e.g., 'a sunny park with children playing')" rows={2}
            className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30 resize-none" />
          <p className="text-xs text-tertiary mt-1">Leave blank to let AI decide based on your event.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Library Logo</label>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoChange}
            className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-accent-solid file:text-white" />
          {logoBase64 && <p className="text-xs text-green-600 mt-1">Logo uploaded</p>}
        </div>
        <label className="flex items-center gap-3 p-3 rounded-lg bg-page border border-default cursor-pointer">
          <input type="checkbox" checked={includeImage} onChange={e => setIncludeImage(e.target.checked)} className="accent-[var(--accent-solid)] w-4 h-4" />
          <div>
            <p className="text-sm font-medium text-primary">Generate AI background image</p>
            <p className="text-xs text-secondary">Costs 10 credits (6 without image)</p>
          </div>
        </label>
      </div>

      <button type="submit" disabled={loading} className="btn-gradient w-full justify-center mt-6 disabled:opacity-60">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {loading ? 'Generating...' : `Generate Flyer (${includeImage ? 10 : 6} credits)`}
      </button>
    </form>
  )
}

function FlyerEditor({ flyer, onSave, saving }) {
  const [headline, setHeadline] = useState(flyer.headline || "")
  const [bodyText, setBodyText] = useState(flyer.body_text || "")
  const [ctaText, setCtaText] = useState(flyer.cta_text || "")
  const [date, setDate] = useState(flyer.date || "")
  const [time, setTime] = useState(flyer.time || "")
  const [timezone, setTimezone] = useState(flyer.timezone || "")
  const [location, setLocation] = useState(flyer.location || "")
  const [website, setWebsite] = useState(flyer.website || "")

  const bgImage = flyer.background_base64 ? `data:image/png;base64,${flyer.background_base64}` : null
  const logo = flyer.logo_base64 ? `data:image/png;base64,${flyer.logo_base64}` : null

  const bgFromVibe = {
    "Modern & Sleek": "#1a1a2e", "Whimsical": "#FFF0F5", "Vintage Scholastic": "#F5F5DC",
    "High-Energy": "#FFF8DC", "Calm & Relaxing": "#F0F8FF", "Festive": "#FFF8DC",
  }
  const fallbackBg = bgFromVibe[flyer.vibe] || '#f5f5f7'

  const handleSave = () => {
    onSave({ headline, body_text: bodyText, cta_text: ctaText, date, time, timezone, location, website, png_base64: flyer.png_base64 })
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="card-lift p-4">
          <p className="section-label mb-3">Preview</p>
          <div className="rounded-lg overflow-hidden bg-card flex items-center justify-center min-h-[400px] p-4 overflow-x-auto">
            <FlyerPreview
              headline={headline} body={bodyText} cta={ctaText}
              date={date} time={time} location={location}
              accent={flyer.accent_color || '#6366f1'}
              bg={bgImage ? '#f5f5f7' : fallbackBg} bgImage={bgImage} logo={logo}
              layout={flyer.layout || 'poster'} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 no-print">
          <button onClick={handleSave} disabled={saving} className="btn-gradient disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Flyer'}
          </button>
        </div>
      </div>

      <div className="card-lift p-6 space-y-4">
        <p className="section-label">Edit Text</p>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Headline</label>
          <input type="text" value={headline} onChange={e => setHeadline(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Body Text</label>
          <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Call to Action</label>
          <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30">
              <option value="">None</option>
              <option value="ET">Eastern (ET)</option>
              <option value="CT">Central (CT)</option>
              <option value="MT">Mountain (MT)</option>
              <option value="PT">Pacific (PT)</option>
              <option value="AKT">Alaska (AKT)</option>
              <option value="HT">Hawaii (HT)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Website</label>
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SavedFlyers({ flyers, onLoad, onDelete }) {
  if (!flyers.length) return (
    <div className="text-center py-12">
      <FolderOpen className="w-10 h-10 text-secondary mx-auto mb-3" />
      <p className="text-secondary">No saved flyers yet.</p>
    </div>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {flyers.map(f => (
        <div key={f.id} className="card-lift p-4 cursor-pointer hover:bg-hover transition-colors group" onClick={() => onLoad(f.id)}>
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-primary truncate">{f.headline || f.event_name}</h3>
              <p className="text-xs text-secondary truncate">{f.event_name}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(f.id) }}
              className="p-1.5 rounded-lg hover:bg-hover text-secondary hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium tint-indigo">{f.vibe}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium tint-sky">{f.layout}</span>
          </div>
          <p className="text-xs text-tertiary mt-2">{new Date(f.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  )
}

export default function FlyerStudio() {
  const navigate = useNavigate()
  const { user, loading: authLoading, getToken } = useAuth()
  const [flyer, setFlyer] = useState(null)
  const [inputs, setInputs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlyers, setSavedFlyers] = useState([])
  const [showSaved, setShowSaved] = useState(false)
  const [savedFlyerId, setSavedFlyerId] = useState(null)
  const [needCredits, setNeedCredits] = useState(false)

  useEffect(() => {
    if (!user) return
    apiCall('/flyers', {}, getToken).then(r => r.json()).then(d => setSavedFlyers(d.flyers || [])).catch(() => {})
  }, [user, getToken])

  const generate = async (payload) => {
    setLoading(true); setError(''); setFlyer(null); setInputs(payload); setSavedFlyerId(null); setNeedCredits(false)
    try {
      const res = await apiCall('/generate', { method: 'POST', body: JSON.stringify(payload) }, getToken)
      const data = await res.json()
      setFlyer(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      if (e.message?.includes('402') || e.message?.includes('Insufficient credits')) {
        setNeedCredits(true)
        setError('You\'re out of credits. Flyers cost 6–10 credits — grab more to keep going.')
      } else {
        setError(e.message || 'Failed to generate flyer')
      }
    } finally { setLoading(false) }
  }

  const saveFlyer = async (flyerData) => {
    setSaving(true)
    try {
      const res = await apiCall('/save', { method: 'POST', body: JSON.stringify({ ...inputs, ...flyerData }) }, getToken)
      const data = await res.json()
      setSavedFlyerId(data.id)
      const listRes = await apiCall('/flyers', {}, getToken)
      setSavedFlyers((await listRes.json()).flyers || [])
    } catch (e) { setError(e.message || 'Failed to save') } finally { setSaving(false) }
  }

  const loadFlyer = async (id) => {
    try {
      const res = await apiCall(`/flyers/${id}`, {}, getToken)
      const f = (await res.json()).flyer
      setInputs({
        event_name: f.event_name, event_description: f.event_description || '', theme: f.theme || '',
        audience: f.audience || 'All Ages', vibe: f.vibe || 'Modern & Sleek', date: f.date || '',
        time: f.time || '', timezone: f.timezone || '', location: f.location || '', website: f.website || '',
        layout: f.layout || 'poster', include_image: !!f.include_image,
      })
      setFlyer({
        headline: f.headline, body_text: f.body_text, cta_text: f.cta_text, png_base64: f.png_base64,
        image_prompt: '', accent_color: '#6366f1', layout: f.layout || 'poster', vibe: f.vibe || 'Modern & Sleek',
        timezone: f.timezone || '', logo_base64: f.logo_base64, background_base64: f.background_base64,
      })
      setSavedFlyerId(f.id); setShowSaved(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) { setError(e.message || 'Failed to load flyer') }
  }

  const deleteFlyer = async (id) => {
    if (!window.confirm('Delete this saved flyer?')) return
    try {
      await apiCall(`/flyers/${id}`, { method: 'DELETE' }, getToken)
      setSavedFlyers(prev => prev.filter(f => f.id !== id))
      if (savedFlyerId === id) setSavedFlyerId(null)
    } catch (e) { setError(e.message || 'Failed to delete') }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="page-gradient-bg"><div className="gradient-mesh" /></div>
        <Loader2 className="w-8 h-8 animate-spin accent-solid" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-page design-stripe">
        <div className="page-gradient-bg"><div className="gradient-mesh" /></div>
        <div className="relative z-10">
          <Header />
          <div className="max-w-md mx-auto px-6 py-20">
            <div className="glass-card p-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl tint-rose mb-4">
                <Palette className="w-7 h-7 text-[var(--accent-solid)]" />
              </div>
              <h1 className="text-2xl font-bold text-primary mb-2">Event Flyer Studio</h1>
              <p className="text-secondary mb-6 flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4 accent-solid" /> Sign in to generate professional event flyers.
              </p>
              <a href="/" className="btn-gradient w-full">Sign in</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page design-stripe">
      <div className="page-gradient-bg"><div className="gradient-mesh" /></div>
      <div className="relative z-10">
        <Header />
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <button onClick={() => navigate('/')} className="text-secondary hover:text-primary transition-all flex items-center gap-1.5 text-sm font-medium">
              ← Back to Home
            </button>
            <button onClick={() => setShowSaved(!showSaved)} className="btn-outline text-sm py-2 px-3">
              <FolderOpen className="w-4 h-4" />
              Saved{showSaved ? ' — hide' : ''}
            </button>
          </div>

          {showSaved ? (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setShowSaved(false)} className="p-2 rounded-lg hover:bg-hover">
                  <ChevronLeft className="w-5 h-5 text-secondary" />
                </button>
                <h2 className="text-xl font-bold text-primary">Saved Flyers</h2>
              </div>
              <SavedFlyers flyers={savedFlyers} onLoad={loadFlyer} onDelete={deleteFlyer} />
            </div>
          ) : (
            <div className="space-y-8">
              {!flyer && <SmartCanvasForm onGenerate={generate} loading={loading} />}

              {error && (
                <div className="max-w-3xl mx-auto p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-start gap-2">
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {error}
                    {needCredits && (
                      <button
                        onClick={() => window.dispatchEvent(new Event('paperlab:open-credits'))}
                        className="btn-gradient inline-flex mt-3 px-4 py-2 text-sm"
                      >
                        <Sparkles className="w-4 h-4" /> Get more credits
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loading && (
                <div className="max-w-3xl mx-auto card-lift p-12 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-accent-solid mx-auto mb-4" />
                  <p className="text-secondary">Designing your flyer...</p>
                  <p className="text-xs text-tertiary mt-1">This may take 15-30 seconds</p>
                </div>
              )}

              {flyer && !loading && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <button onClick={() => { setFlyer(null); setError('') }} className="btn-outline text-sm">
                      <ChevronLeft className="w-4 h-4" />
                      Back to Form
                    </button>
                    {savedFlyerId && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
                  </div>
                  <FlyerEditor flyer={flyer} onSave={saveFlyer} saving={saving} />
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="mt-16 pb-8">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="border-t border-default pt-6 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              <span className="text-sm text-secondary">Powered by <span className="text-primary font-medium">PaperLab</span></span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
