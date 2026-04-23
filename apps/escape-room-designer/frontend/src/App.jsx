import React, { useState, useEffect } from 'react'
import { Loader2, Wand2, Printer, Clock, Puzzle, Box, BookOpen, ListChecks, Map, Sparkles, ChevronDown, ChevronUp, Home, LogOut, Save, Trash2, FolderOpen, User } from 'lucide-react'
import { useAuth, AuthProvider } from './context/AuthContext'
import Header from './components/Header'

const API_BASE = '/api'

const INVENTORY_ITEMS = [
  "3-digit padlock", "4-digit padlock", "UV flashlight", "Blacklight pen",
  "Manila envelopes", "Combination lockbox", "Cipher wheel",
  "Dry-erase markers", "String / yarn", "Tape (masking, clear)",
  "Old books", "Tablet / phone", "Playing cards", "Magnets"
]

const AGE_GROUPS = ["Kids 5-8", "Kids 9-11", "Teens 12-15", "Teens 16-18", "Adults", "All Ages"]
const DIFFICULTIES = ["easy", "medium", "hard"]
const DURATIONS = ["15 minutes", "30 minutes", "45 minutes", "60 minutes", "90 minutes"]

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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl tint-violet mb-4">
            <Puzzle className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Escape Room Designer</h1>
          <p className="text-secondary text-sm mt-1">Sign in to generate and save escape room plans.</p>
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

function GeneratorForm({ onGenerate, loading }) {
  const [theme, setTheme] = useState("")
  const [ageGroup, setAgeGroup] = useState("Teens 12-15")
  const [difficulty, setDifficulty] = useState("medium")
  const [duration, setDuration] = useState("45 minutes")
  const [inventory, setInventory] = useState([])

  const toggleItem = (item) => {
    setInventory(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!theme.trim()) return
    onGenerate({ theme: theme.trim(), age_group: ageGroup, difficulty, duration, inventory })
  }

  return (
    <form onSubmit={handleSubmit} className="card-lift p-6 md:p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl tint-violet mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-1">Design Your Escape Room</h2>
        <p className="text-secondary text-sm">Enter a theme and get a complete printable plan.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Theme</label>
          <input type="text" value={theme} onChange={e => setTheme(e.target.value)}
            placeholder="e.g., Ancient Egypt, Space Station Lockdown"
            className="w-full px-4 py-2.5 rounded-lg bg-page border border-default text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-solid/30"
            required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Age Group</label>
            <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30">
              {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30">
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Duration</label>
            <select value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-page border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent-solid/30">
              {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Inventory — check what you already have</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INVENTORY_ITEMS.map(item => (
              <label key={item} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-page border border-default cursor-pointer hover:bg-hover transition-colors">
                <input type="checkbox" checked={inventory.includes(item)} onChange={() => toggleItem(item)} className="accent-accent-solid" />
                <span className="text-sm text-secondary">{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-gradient w-full justify-center mt-6 disabled:opacity-60">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {loading ? 'Generating...' : 'Generate Escape Room'}
      </button>
    </form>
  )
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card-lift mb-6 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-hover transition-colors">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-secondary" />}
          <h3 className="text-lg font-semibold text-primary">{title}</h3>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  )
}

function PlanDisplay({ plan, inputs, onSave, saving, onDelete, isSavedView }) {
  const { narrative, logicFlow, roomBlueprint, puzzles, itemInventory, gameMasterCheatSheet } = plan

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card-lift p-6 md:p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-label mb-2">Generated Plan</p>
            <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">{inputs.theme}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium tint-violet">{inputs.age_group}</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium tint-amber">{inputs.difficulty}</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium tint-sky">{inputs.duration}</span>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            {!isSavedView && (
              <button onClick={onSave} disabled={saving} className="btn-gradient">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            )}
            <button onClick={() => window.print()} className="btn-outline">
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      <Section title="Narrative" icon={BookOpen}>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-1">Hook</h4>
            <p className="text-primary whitespace-pre-line leading-relaxed">{narrative?.hook || '—'}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-1">Mission</h4>
            <p className="text-primary">{narrative?.mission || '—'}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-1">Atmospheric Cues</h4>
            <p className="text-primary">{narrative?.atmosphericCues || '—'}</p>
          </div>
        </div>
      </Section>

      <Section title="Room Blueprint" icon={Map}>
        <p className="text-primary mb-4">{roomBlueprint?.layout || '—'}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(roomBlueprint?.stations || []).map((station, i) => (
            <div key={i} className="p-4 rounded-xl bg-page border border-default">
              <h4 className="font-semibold text-primary mb-1">{station.name}</h4>
              <p className="text-sm text-secondary mb-2">{station.description}</p>
              {station.staticEnvironment?.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium text-tertiary uppercase">Static</span>
                  <ul className="text-sm text-secondary mt-0.5 space-y-0.5">
                    {station.staticEnvironment.map((item, j) => <li key={j}>• {item}</li>)}
                  </ul>
                </div>
              )}
              {station.interactableEnvironment?.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-tertiary uppercase">Interactable</span>
                  <ul className="text-sm text-secondary mt-0.5 space-y-0.5">
                    {station.interactableEnvironment.map((item, j) => <li key={j}>• {item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Puzzles" icon={Puzzle}>
        <div className="space-y-4">
          {(puzzles || []).map((puzzle, i) => (
            <div key={i} className="p-4 rounded-xl bg-page border border-default">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 flex items-center justify-center rounded-lg tint-violet text-sm font-bold">{puzzle.number}</span>
                <h4 className="font-semibold text-primary">{puzzle.title}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-xs font-medium text-tertiary uppercase">Prompt</span><p className="text-secondary mt-0.5">{puzzle.prompt}</p></div>
                <div><span className="text-xs font-medium text-tertiary uppercase">Mechanic</span><p className="text-secondary mt-0.5">{puzzle.mechanic}</p></div>
                <div><span className="text-xs font-medium text-tertiary uppercase">Solution Logic</span><p className="text-secondary mt-0.5">{puzzle.solutionLogic}</p></div>
                <div><span className="text-xs font-medium text-tertiary uppercase">Aha Moment</span><p className="text-secondary mt-0.5">{puzzle.ahaMoment}</p></div>
              </div>
              <div className="mt-3 pt-3 border-t border-default">
                <span className="text-xs font-medium text-tertiary uppercase">Reward</span>
                <p className="text-primary font-medium mt-0.5">{puzzle.reward}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Logic Flow" icon={ListChecks}>
        <p className="text-primary mb-3"><span className="font-medium">Structure:</span> {logicFlow?.structure || '—'}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default">
                <th className="text-left py-2 pr-4 text-tertiary font-medium uppercase text-xs">Step</th>
                <th className="text-left py-2 pr-4 text-tertiary font-medium uppercase text-xs">Puzzle</th>
                <th className="text-left py-2 pr-4 text-tertiary font-medium uppercase text-xs">Grants</th>
                <th className="text-left py-2 text-tertiary font-medium uppercase text-xs">Unlocks</th>
              </tr>
            </thead>
            <tbody>
              {(logicFlow?.dependencyMap || []).map((dep, i) => (
                <tr key={i} className="border-b border-default/50">
                  <td className="py-2.5 pr-4 text-primary font-medium">{dep.step}</td>
                  <td className="py-2.5 pr-4 text-secondary">{dep.puzzle}</td>
                  <td className="py-2.5 pr-4 text-secondary">{dep.grants}</td>
                  <td className="py-2.5 text-secondary">{dep.unlocks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Item Inventory" icon={Box}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default">
                <th className="text-left py-2 pr-4 text-tertiary font-medium uppercase text-xs">Item</th>
                <th className="text-left py-2 pr-4 text-tertiary font-medium uppercase text-xs">Specs</th>
                <th className="text-left py-2 pr-4 text-tertiary font-medium uppercase text-xs">Qty</th>
                <th className="text-left py-2 text-tertiary font-medium uppercase text-xs">Category</th>
              </tr>
            </thead>
            <tbody>
              {(itemInventory || []).map((item, i) => (
                <tr key={i} className="border-b border-default/50">
                  <td className="py-2.5 pr-4 text-primary font-medium">{item.item}</td>
                  <td className="py-2.5 pr-4 text-secondary">{item.specs}</td>
                  <td className="py-2.5 pr-4 text-secondary">{item.quantity}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.category === 'Consumable' ? 'tint-amber' : item.category === 'Tech' ? 'tint-sky' : 'tint-emerald'
                    }`}>{item.category}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Game Master Cheat Sheet" icon={Clock}>
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-2">Setup Instructions</h4>
            <ul className="space-y-1.5">
              {(gameMasterCheatSheet?.setupInstructions || []).map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-secondary text-sm">
                  <span className="text-accent-solid font-bold mt-0.5">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-2">Tiered Hints</h4>
            <div className="space-y-3">
              {(gameMasterCheatSheet?.tieredHints || []).map((hint, i) => (
                <div key={i} className="p-4 rounded-xl bg-page border border-default">
                  <p className="font-medium text-primary mb-2">{hint.puzzle}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-xs font-medium text-tertiary uppercase">Nudge</span><p className="text-secondary mt-0.5">{hint.hint1_nudge}</p></div>
                    <div><span className="text-xs font-medium text-tertiary uppercase">Insight</span><p className="text-secondary mt-0.5">{hint.hint2_insight}</p></div>
                    <div><span className="text-xs font-medium text-tertiary uppercase">Direct</span><p className="text-secondary mt-0.5">{hint.hint3_direct}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-2">Reset Checklist</h4>
            <ul className="space-y-1.5">
              {(gameMasterCheatSheet?.resetChecklist || []).map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-secondary text-sm">
                  <input type="checkbox" className="mt-1 accent-accent-solid" readOnly />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <footer className="mt-12 pb-8 no-print">
        <div className="border-t border-default pt-6 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <span className="text-sm text-secondary">Powered by <span className="text-primary font-medium">PaperLab</span></span>
        </div>
      </footer>
    </div>
  )
}

function AppContent() {
  const { user, loading: authLoading, getToken } = useAuth()
  const [plan, setPlan] = useState(null)
  const [inputs, setInputs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedPlans, setSavedPlans] = useState([])
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    apiCall('/plans', {}, getToken)
      .then(r => r.json())
      .then(data => setSavedPlans(data.plans || []))
      .catch(() => {})
  }, [user])

  const generate = async (payload) => {
    setLoading(true)
    setError('')
    setPlan(null)
    setInputs(payload)
    try {
      const res = await apiCall('/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, getToken)
      const data = await res.json()
      setPlan(data.plan)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      if (e.message?.includes('402') || e.message?.includes('Insufficient credits')) {
        setError('You need more credits to generate an escape room. Visit lib.paperlab.xyz to get credits.')
      } else {
        setError(e.message || 'Failed to generate escape room')
      }
    } finally {
      setLoading(false)
    }
  }

  const savePlan = async () => {
    if (!plan || !inputs) return
    setSaving(true)
    try {
      await apiCall('/save', {
        method: 'POST',
        body: JSON.stringify({ ...inputs, plan_json: plan }),
      }, getToken)
      // Refresh saved list
      const res = await apiCall('/plans', {}, getToken)
      const data = await res.json()
      setSavedPlans(data.plans || [])
    } catch (e) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const loadPlan = async (id) => {
    try {
      const res = await apiCall(`/plans/${id}`, {}, getToken)
      const data = await res.json()
      const row = data.plan
      setInputs({
        theme: row.theme,
        age_group: row.age_group,
        difficulty: row.difficulty,
        duration: row.duration,
      })
      setPlan(JSON.parse(row.plan_json))
      setShowSaved(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e.message || 'Failed to load plan')
    }
  }

  const deletePlan = async (id) => {
    if (!confirm('Delete this saved plan?')) return
    try {
      await apiCall(`/plans/${id}`, { method: 'DELETE' }, getToken)
      setSavedPlans(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      setError(e.message || 'Failed to delete')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-solid" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-page">
      <Header actions={
        <button onClick={() => setShowSaved(!showSaved)} className="btn-outline py-2 px-3 text-sm">
          <FolderOpen className="w-4 h-4" />
          My Rooms
        </button>
      } />

      {/* Saved Plans Panel */}
      {showSaved && (
        <div className="container py-4 no-print">
          <div className="card-lift p-4">
            <h3 className="text-sm font-semibold text-primary mb-3">Saved Escape Rooms</h3>
            {savedPlans.length === 0 ? (
              <p className="text-secondary text-sm">No saved plans yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {savedPlans.map(p => (
                  <div key={p.id} className="p-3 rounded-lg bg-page border border-default flex items-start justify-between gap-2">
                    <button onClick={() => loadPlan(p.id)} className="text-left flex-1">
                      <p className="font-medium text-primary text-sm">{p.theme}</p>
                      <p className="text-xs text-secondary">{p.difficulty} · {p.duration}</p>
                    </button>
                    <button onClick={() => deletePlan(p.id)} className="text-secondary hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container py-10 md:py-16">
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm no-print">
            {error}
          </div>
        )}

        {!plan && (
          <>
            <div className="text-center mb-10 no-print">
              <h2 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">Turn Any Topic Into an <span className="bg-clip-text text-transparent" style={{backgroundImage: 'var(--accent-gradient)'}}>Escape Room</span></h2>
              <p className="text-secondary mt-2 max-w-lg mx-auto">AI-powered escape room plans for libraries. Complete with puzzles, props, clues, and printable cheat sheets.</p>
            </div>
            <GeneratorForm onGenerate={generate} loading={loading} />
          </>
        )}

        {plan && (
          <>
            <div className="text-center mb-6 no-print">
              <button onClick={() => { setPlan(null); setInputs(null); setError(''); }} className="btn-outline">
                <Wand2 className="w-4 h-4" />
                Design Another Room
              </button>
            </div>
            <PlanDisplay plan={plan} inputs={inputs} onSave={savePlan} saving={saving} />
          </>
        )}
      </div>
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
