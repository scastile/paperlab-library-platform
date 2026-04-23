import React, { useState, useEffect } from 'react'
import {
  Loader2, Wand2, Download, Save, Trash2, FolderOpen, LogOut, User,
  Sparkles, Palette, Calendar, Clock, MapPin, Globe, QrCode, Image as ImageIcon,
  ChevronLeft, ChevronRight, LayoutTemplate, Type, AlignLeft, MousePointerClick,
  Home, Printer, FileImage
} from 'lucide-react'
import { useAuth, AuthProvider } from './context/AuthContext'
import Header from './components/Header'

const API_BASE = '/api'

const VIBES = [
  "Modern & Sleek",
  "Whimsical",
  "Vintage Scholastic",
  "High-Energy",
  "Calm & Relaxing",
  "Festive",
]

const AUDIENCES = [
  "All Ages",
  "Toddlers (0-5)",
  "Kids (6-11)",
  "Teens (12-17)",
  "Adults",
  "Seniors",
]

const LAYOUTS = [
  { id: "poster", label: "Poster (8.5×11)", icon: LayoutTemplate },
  { id: "modern", label: "Modern Portrait", icon: Type },
  { id: "social", label: "Social Square", icon: ImageIcon },
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

function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') await signIn(email, password)
      else await signUp(email, password)
    } catch (e) {
      setError(e.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-lift w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl tint-indigo mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Event Flyer Studio</h1>
          <p className="text-secondary text-sm mt-1">Sign in to generate professional event flyers.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gradient w-full justify-center disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-secondary mt-4">
          {mode === 'signin' ? (
            <>Don't have an account? <button onClick={() => setMode('signup')} className="text-accent-solid font-medium hover:underline">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode('signin')} className="text-accent-solid font-medium hover:underline">Sign in</button></>
          )}
        </p>
      </div>
    </div>
  )
}

function SmartCanvasForm({ onGenerate, loading }) {
  const [eventName, setEventName] = useState("")
  const [description, setDescription] = useState("")
  const [theme, setTheme] = useState("")
  const [audience, setAudience] = useState("All Ages")
  const [vibe, setVibe] = useState("Modern & Sleek")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")
  const [layout, setLayout] = useState("poster")
  const [includeImage, setIncludeImage] = useState(true)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!eventName.trim()) return
    onGenerate({
      event_name: eventName.trim(),
      event_description: description.trim(),
      theme: theme.trim(),
      audience,
      vibe,
      date,
      time,
      location: location.trim(),
      website: website.trim(),
      layout,
      include_image: includeImage,
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
            className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30"
            required />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What's happening? Who should come?"
            rows={3}
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  vibe === v ? 'btn-gradient' : 'bg-page border border-default text-secondary hover:bg-hover'
                }`}>
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
            <label className="block text-sm font-medium text-primary mb-1.5">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Main Branch Community Room"
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Website / Registration Link</label>
          <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30" />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Layout</label>
          <div className="grid grid-cols-3 gap-3">
            {LAYOUTS.map(l => {
              const Icon = l.icon
              return (
                <button key={l.id} type="button" onClick={() => setLayout(l.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                    layout === l.id
                      ? 'border-accent-solid bg-accent-solid/10 text-primary'
                      : 'border-default text-secondary hover:bg-hover'
                  }`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{l.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-lg bg-page border border-default cursor-pointer">
          <input type="checkbox" checked={includeImage} onChange={e => setIncludeImage(e.target.checked)} className="accent-accent-solid w-4 h-4" />
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

function FlyerEditor({ flyer, onUpdate, onSave, saving, onDownloadPng, onDownloadPdf }) {
  const [headline, setHeadline] = useState(flyer.headline || "")
  const [bodyText, setBodyText] = useState(flyer.body_text || "")
  const [ctaText, setCtaText] = useState(flyer.cta_text || "")
  const [date, setDate] = useState(flyer.date || "")
  const [time, setTime] = useState(flyer.time || "")
  const [location, setLocation] = useState(flyer.location || "")
  const [website, setWebsite] = useState(flyer.website || "")
  const [preview, setPreview] = useState(flyer.png_base64 || "")
  const [regenerating, setRegenerating] = useState(false)

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await apiCall('/regenerate', {
        method: 'POST',
        body: JSON.stringify({ headline, body_text: bodyText, cta_text: ctaText, date, time, location, website })
      }, () => null) // no auth needed for regenerate
      const data = await res.json()
      setPreview(data.png_base64)
    } catch (e) {
      console.error(e)
    } finally {
      setRegenerating(false)
    }
  }

  const handleSave = () => {
    onSave({ ...flyer, headline, body_text: bodyText, cta_text: ctaText, date, time, location, website, png_base64: preview })
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Preview */}
      <div className="space-y-4">
        <div className="card-lift p-4">
          <p className="section-label mb-3">Preview</p>
          <div className="rounded-lg overflow-hidden bg-black/5 flex items-center justify-center min-h-[400px]">
            {preview ? (
              <img src={`data:image/png;base64,${preview}`} alt="Flyer preview" className="max-w-full h-auto shadow-lg" />
            ) : (
              <p className="text-secondary">No preview</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 no-print">
          <button onClick={handleSave} disabled={saving} className="btn-gradient disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Flyer'}
          </button>
          <button onClick={onDownloadPng} className="btn-outline">
            <FileImage className="w-4 h-4" />
            Download PNG
          </button>
          <button onClick={onDownloadPdf} className="btn-outline">
            <Printer className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Editor */}
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
        <div className="grid grid-cols-2 gap-4">
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
        </div>
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
        <button onClick={handleRegenerate} disabled={regenerating} className="btn-outline w-full justify-center disabled:opacity-60">
          {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {regenerating ? 'Updating preview...' : 'Update Preview'}
        </button>
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
        <div key={f.id} className="card-lift p-4 cursor-pointer hover:bg-hover transition-colors group"
          onClick={() => onLoad(f.id)}>
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-primary truncate">{f.headline || f.event_name}</h3>
              <p className="text-xs text-secondary truncate">{f.event_name}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(f.id) }}
              className="p-1.5 rounded-lg hover:bg-rose-100 text-secondary hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
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

function AppContent() {
  const { user, loading: authLoading, getToken } = useAuth()
  const [flyer, setFlyer] = useState(null)
  const [inputs, setInputs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlyers, setSavedFlyers] = useState([])
  const [showSaved, setShowSaved] = useState(false)
  const [savedFlyerId, setSavedFlyerId] = useState(null)

  useEffect(() => {
    if (!user) return
    apiCall('/flyers', {}, getToken)
      .then(r => r.json())
      .then(data => setSavedFlyers(data.flyers || []))
      .catch(() => {})
  }, [user])

  const generate = async (payload) => {
    setLoading(true)
    setError('')
    setFlyer(null)
    setInputs(payload)
    setSavedFlyerId(null)
    try {
      const res = await apiCall('/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, getToken)
      const data = await res.json()
      setFlyer(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      if (e.message?.includes('402') || e.message?.includes('Insufficient credits')) {
        setError('You need more credits to generate a flyer. Visit lib.paperlab.xyz to get credits.')
      } else {
        setError(e.message || 'Failed to generate flyer')
      }
    } finally {
      setLoading(false)
    }
  }

  const saveFlyer = async (flyerData) => {
    setSaving(true)
    try {
      const res = await apiCall('/save', {
        method: 'POST',
        body: JSON.stringify({ ...inputs, ...flyerData }),
      }, getToken)
      const data = await res.json()
      setSavedFlyerId(data.id)
      // Refresh list
      const listRes = await apiCall('/flyers', {}, getToken)
      const listData = await listRes.json()
      setSavedFlyers(listData.flyers || [])
    } catch (e) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const loadFlyer = async (id) => {
    try {
      const res = await apiCall(`/flyers/${id}`, {}, getToken)
      const data = await res.json()
      const f = data.flyer
      setInputs({
        event_name: f.event_name,
        event_description: f.event_description || '',
        theme: f.theme || '',
        audience: f.audience || 'All Ages',
        vibe: f.vibe || 'Modern & Sleek',
        date: f.date || '',
        time: f.time || '',
        location: f.location || '',
        website: f.website || '',
        layout: f.layout || 'poster',
        include_image: !!f.include_image,
      })
      setFlyer({
        headline: f.headline,
        body_text: f.body_text,
        cta_text: f.cta_text,
        png_base64: f.png_base64,
        image_prompt: '',
        accent_color: '#6366f1',
        layout: f.layout || 'poster',
      })
      setSavedFlyerId(f.id)
      setShowSaved(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e.message || 'Failed to load flyer')
    }
  }

  const deleteFlyer = async (id) => {
    if (!confirm('Delete this saved flyer?')) return
    try {
      await apiCall(`/flyers/${id}`, { method: 'DELETE' }, getToken)
      setSavedFlyers(prev => prev.filter(f => f.id !== id))
      if (savedFlyerId === id) setSavedFlyerId(null)
    } catch (e) {
      setError(e.message || 'Failed to delete')
    }
  }

  const downloadPng = () => {
    if (!savedFlyerId) {
      setError('Save the flyer first to download')
      return
    }
    window.open(`${API_BASE}/flyers/${savedFlyerId}/download/png`, '_blank')
  }

  const downloadPdf = () => {
    if (!savedFlyerId) {
      setError('Save the flyer first to download')
      return
    }
    window.open(`${API_BASE}/flyers/${savedFlyerId}/download/pdf`, '_blank')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-solid" />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="min-h-screen bg-page">
      <Header actions={
        <button onClick={() => setShowSaved(!showSaved)} className="btn-outline text-sm py-2 px-3">
          <FolderOpen className="w-4 h-4" />
          Saved
        </button>
      } />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
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
            {/* Generator Form */}
            {!flyer && <SmartCanvasForm onGenerate={generate} loading={loading} />}

            {/* Error */}
            {error && (
              <div className="max-w-3xl mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="max-w-3xl mx-auto card-lift p-12 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-accent-solid mx-auto mb-4" />
                <p className="text-secondary">Designing your flyer...</p>
                <p className="text-xs text-tertiary mt-1">This may take 15-30 seconds</p>
              </div>
            )}

            {/* Flyer Editor */}
            {flyer && !loading && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button onClick={() => { setFlyer(null); setError('') }} className="btn-outline text-sm">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Form
                  </button>
                  {savedFlyerId && (
                    <span className="text-sm text-emerald-600 font-medium">Saved!</span>
                  )}
                </div>
                <FlyerEditor
                  flyer={flyer}
                  onUpdate={setFlyer}
                  onSave={saveFlyer}
                  saving={saving}
                  onDownloadPng={downloadPng}
                  onDownloadPdf={downloadPdf}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="border-t border-default pt-6 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            <span className="text-sm text-secondary">Powered by <span className="text-primary font-medium">PaperLab</span></span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
