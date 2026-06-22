import { useState, useEffect } from 'react'
import SearchBar from './components/SearchBar'
import CardGrid from './components/CardGrid'
import CampaignToolbar from './components/CampaignToolbar'
import CardModal from './components/CardModal'
import CreditsModal from './components/CreditsModal'
import WelcomeModal from './components/WelcomeModal'
import Login from './components/Login'
import GenerationStatus from './components/GenerationStatus'
import { useAuth } from './context/AuthContext'
import { LogOut, Lock, Sparkles, CreditCard, Trash2, Sun, Moon, ChevronDown, ChevronRight } from 'lucide-react'
import { getRandomExample } from './data/exampleCampaigns'
import { featuredCampaigns } from './data/exampleCampaigns'
import Footer from './components/Footer'

const API = import.meta.env.VITE_API_URL || '/api'

// Helper to make authenticated API calls
async function apiCall(path, options = {}, getToken) {
  const token = getToken?.()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(`${API}${path}`, { ...options, headers })
}

export default function App() {
  const { user, loading: authLoading, getToken, signOut } = useAuth()
  const [guestMode, setGuestMode] = useState(false)
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generatingTopic, setGeneratingTopic] = useState('')
  const [rerolling, setRerolling] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [credits, setCredits] = useState(null)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(true)
  const [savedExpanded, setSavedExpanded] = useState(true)
  const [theme, setTheme] = useState(() => {
    // Migrate from old dark-default — clear stale localStorage
    if (localStorage.getItem('ll-theme') === 'dark' && !localStorage.getItem('ll-theme-v2')) {
      localStorage.removeItem('ll-theme')
    }
    return localStorage.getItem('ll-theme-v2') || 'light'
  })

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('ll-theme-v2', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  const isSaved = campaign?.campaign_id && typeof campaign.campaign_id === 'number'

  useEffect(() => {
    apiCall('/campaigns', {}, getToken).then(r => r.json()).then(setCampaigns).catch(() => {})
  }, [user])

  // Fetch credit balance when user logs in
  useEffect(() => {
    if (user && !guestMode) {
      apiCall('/credits/balance', {}, getToken)
        .then(r => r.json())
        .then(setCredits)
        .catch(() => {})
    } else {
      setCredits(null)
    }
  }, [user, guestMode])

  const fetchCredits = async () => {
    if (!user || guestMode) return
    try {
      const res = await apiCall('/credits/balance', {}, getToken)
      const data = await res.json()
      setCredits(data)
    } catch (e) {}
  }

  const generate = async (topic, generateImage, targetAudience = 'All Ages', budget = '$50 — Small Event') => {
    setLoading(true)
    setGeneratingTopic(topic)
    try {
      if (guestMode) {
        // Guest mode: show a pre-built example instead of burning API credits
        await new Promise(r => setTimeout(r, 800)) // fake loading for feel
        const example = getRandomExample()
        setCampaign({ ...example, topic })
        return
      }
      const res = await apiCall('/generate', {
        method: 'POST',
        body: JSON.stringify({ topic, generate_image: generateImage, target_audience: targetAudience, budget }),
      }, getToken)
      
      if (res.status === 402) {
        // Insufficient credits - show upgrade modal
        const error = await res.json()
        setCredits(prev => ({ ...prev, total_available: error.current_credits || 0 }))
        setShowCreditModal(true)
        return
      }
      
      if (res.status === 403) {
        setGuestMode(true) // Fall back to guest if not logged in
        return
      }
      
      const data = await res.json()
      setCampaign(data)
      fetchCredits() // Refresh credit balance
    } catch (e) {
      console.error('Generate failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const togglePin = (cardId) => {
    // Always in-memory — works before and after save
    setCampaign(prev => ({
      ...prev,
      cards: prev.cards.map(c =>
        c.id === cardId ? { ...c, pinned: !c.pinned } : c
      ),
    }))

    // If saved, also sync to DB
    if (isSaved) {
      apiCall(`/cards/${cardId}/pin`, { method: 'POST' }, getToken).catch(() => {})
    }
  }

  const rerollCard = async (cardId) => {
    if (!campaign) return
    if (guestMode) { setGuestMode(false); return }
    setRerolling(prev => new Set(prev).add(cardId))

    try {
      const res = await apiCall('/reroll', {
        method: 'POST',
        body: JSON.stringify({ campaign_id: campaign.campaign_id, card_id: cardId }),
      }, getToken)

      if (res.status === 402) {
        const error = await res.json().catch(() => ({}))
        const parsed = typeof error === 'string' ? JSON.parse(error) : error
        setCredits(prev => ({ ...prev, total_available: parsed.current_credits || 0 }))
        setShowCreditModal(true)
        return
      }

      const data = await res.json()
      setCampaign(prev => ({
        ...prev,
        cards: prev.cards.map(c => c.id === cardId ? { ...c, content: data.content, card_type: data.card_type } : c),
      }))
      fetchCredits()
    } catch (e) {
      console.error('Reroll failed:', e)
    } finally {
      setRerolling(prev => { const s = new Set(prev); s.delete(cardId); return s })
    }
  }

  const rerollAll = async () => {
    if (!campaign) return
    if (guestMode) { setGuestMode(false); return }
    const unpinned = campaign.cards.filter(c => !c.pinned)
    if (unpinned.length === 0) return
    setRerolling(new Set(unpinned.map(c => c.id)))

    try {
      const res = await apiCall('/reroll', {
        method: 'POST',
        body: JSON.stringify({ campaign_id: campaign.campaign_id }),
      }, getToken)

      if (res.status === 402) {
        const error = await res.json().catch(() => ({}))
        const parsed = typeof error === 'string' ? JSON.parse(error) : error
        setCredits(prev => ({ ...prev, total_available: parsed.current_credits || 0 }))
        setShowCreditModal(true)
        return
      }

      const data = await res.json()
      setCampaign(prev => ({ ...prev, cards: data.cards }))
      fetchCredits()
    } catch (e) {
      console.error('Reroll all failed:', e)
    } finally {
      setRerolling(new Set())
    }
  }

  const saveCampaign = async () => {
    if (!campaign || isSaved || saving) return
    if (guestMode) { setGuestMode(false); return }
    setSaving(true)
    try {
      const res = await apiCall('/save', {
        method: 'POST',
        body: JSON.stringify({
          topic: campaign.topic,
          media: campaign.media,
          cards: campaign.cards,
          target_audience: campaign.target_audience,
          budget: campaign.budget,
          relevant_dates: campaign.relevant_dates || [],
          cross_media_connections: campaign.cross_media_connections || [],
        }),
      }, getToken)
      const data = await res.json()
      setCampaign(data)
      // Refresh sidebar
      apiCall('/campaigns', {}, getToken).then(r => r.json()).then(setCampaigns).catch(() => {})
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  const exportCampaign = () => {
    if (!campaign) return
    const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `campaign-${campaign.topic.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
  }

  const loadCampaign = async (id) => {
    try {
      const data = await apiCall(`/campaigns/${id}`, {}, getToken).then(r => r.json())
      let cards = data.cards || []

      // Load saved escape plans for this campaign
      try {
        const plans = await apiCall(`/escape-plans/${id}`, {}, getToken).then(r => r.json())
        if (plans && plans.length > 0) {
          // Attach all plans to matching escape_room cards (newest first)
          let planIndex = 0
          cards = cards.map(c => {
            if (c.card_type === 'escape_room' && planIndex < plans.length) {
              return { ...c, full_plan: plans[planIndex++].plan }
            }
            return c
          })
        }
      } catch (e) {
        console.error('Failed to load escape plans:', e)
      }

      setCampaign({ ...data, cards, campaign_id: data.id })
    } catch (e) {
      console.error('Load failed:', e)
    }
  }

  const deleteCampaign = async (id) => {
    try {
      await apiCall(`/campaigns/${id}`, { method: 'DELETE' }, getToken)
      setCampaigns(prev => prev.filter(c => c.id !== id))
      if (campaign?.campaign_id === id) setCampaign(null)
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  const generateFullEscapePlan = async (card) => {
    // Return cached plan if already generated
    if (card.full_plan) return card.full_plan

    // Call AI to generate detailed escape room plan
    const res = await apiCall('/escape-plan', {
      method: 'POST',
      body: JSON.stringify({
        topic: campaign?.topic || '',
        card_content: { ...(card.content || {}), campaign_id: campaign?.campaign_id },
      }),
    }, getToken)
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(err.detail || `Request failed (${res.status})`)
    }
    
    const data = await res.json()
    fetchCredits() // Refresh credit balance after successful generation
    
    // Cache the plan on the card so user doesn't pay again
    setCampaign(prev => {
      const updated = {
        ...prev,
        cards: prev.cards.map(c => c.id === card.id ? { ...c, full_plan: data } : c),
      }
      // Also update selectedCard so reopening the modal has the cached plan
      const updatedCard = updated.cards.find(c => c.id === card.id)
      if (updatedCard) setSelectedCard(updatedCard)
      return updated
    })
    
    return data
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-secondary" role="status" aria-live="polite">Loading…</div>
      </div>
    )
  }

  // Show login if PocketBase is configured and user is not signed in (unless guest mode)
  const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL
  if (pocketbaseUrl && !user && !guestMode) {
    return <Login onSkip={() => {
      setGuestMode(true)
      setShowWelcomeModal(true)
    }} />
  }

  return (
    <>
    <div className="min-h-screen bg-page px-4 py-8 md:px-8 md:py-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary tracking-tight">
              Turn Any Topic Into a <span style={{background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Library Event</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          {user && (
            <>
              {credits && (
                <button
                  onClick={() => setShowCreditModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-card border border-default rounded-lg transition-all duration-250 hover:bg-hover"
                >
                  <Sparkles className="w-4 h-4 accent-solid" />
                  <span className="text-primary">{credits.total_available || 0} credits</span>
                </button>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:text-primary hover:bg-hover rounded-lg transition-all duration-250"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          )}
          {guestMode && (
            <button
              onClick={() => setGuestMode(false)}
              className="btn-gradient flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium"
            >
              <Lock className="w-4 h-4" />
              Sign Up for AI Generation
            </button>
          )}
          </div>
        </div>
        <p className="text-secondary max-w-2xl">
          Transform your library's engagement with AI-powered promotional campaigns.
          Generate innovative cross-promotion ideas for books, movies, games, and events.
        </p>
        <div className="mt-4 text-sm">
          <div className="flex gap-6 flex-wrap">
            <span className="accent-solid font-semibold">25,000+ Ideas Generated</span>
            <span className="accent-solid font-semibold">450+ Libraries Using</span>
            <span className="accent-solid font-semibold">98% Satisfaction</span>
          </div>
        </div>
      </header>

      {guestMode && (
        <div className="mb-8 p-5 bg-card border border-default rounded-xl flex items-center justify-between gap-4 flex-wrap" style={{boxShadow: 'var(--shadow-sm)'}}>
          <div>
            <p className="text-primary font-semibold">You're viewing example campaigns</p>
            <p className="text-secondary text-sm">Sign up to generate custom AI-powered campaigns for any topic.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => setGuestMode(false)}
              className="btn-gradient px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
            >
              Unlock AI Generation
            </button>
            <span className="text-[10px] text-tertiary">Campaigns 5cr · Rerolls 1cr · Escape Rooms 5cr</span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <SearchBar onGenerate={generate} loading={loading} />

        {/* Saved Campaigns — collapsible */}
        {!guestMode && campaigns.length > 0 && (
          <div>
            <button
              onClick={() => setSavedExpanded(!savedExpanded)}
              className="flex items-center gap-1.5 section-label mb-4 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] rounded"
            >
              {savedExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Saved Campaigns
              <span className="text-tertiary font-normal">({campaigns.length})</span>
            </button>
            {savedExpanded && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className={`group relative card-lift p-4 cursor-pointer ${
                    c.id === (isSaved ? campaign?.campaign_id : null)
                      ? 'ring-2 ring-[var(--accent-solid)]/30 border-[var(--accent-solid)]/40'
                      : ''
                  }`}
                  onClick={() => loadCampaign(c.id)}
                >
                  <p className="text-sm font-medium text-primary truncate">{c.topic}</p>
                  <p className="text-xs text-tertiary mt-1">{c.card_count} cards · {formatDate(c.created_at)}</p>
                  {(c.target_audience || c.budget) ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.target_audience && c.target_audience !== 'All Ages' && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-solid)]/10 accent-solid">{c.target_audience}</span>
                      )}
                      {c.budget && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{c.budget.split('—')[0].trim()}</span>
                      )}
                    </div>
                  ) : null}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCampaign(c.id) }}
                    aria-label="Delete campaign"
                    className="absolute top-3 right-3 p-1 rounded text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              </div>
            )}
          </div>
        )}

        {/* Featured example campaigns */}
        {guestMode && featuredCampaigns.length > 0 && (
          <div>
            <h3 className="section-label mb-4">Example Campaigns</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {featuredCampaigns.map((c, i) => (
                <div
                  key={i}
                  className="card-lift p-4 cursor-pointer relative"
                  onClick={() => setCampaign({ ...c })}
                >
                  <p className="text-sm font-medium text-primary truncate">{c.topic}</p>
                  <p className="text-xs text-tertiary mt-1">{c.cards.length} cards · {c.media[0]?.author}</p>
                  {c.cards.some(card => card.full_plan) && (
                    <span className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Full Plan</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {campaign && (
          <CampaignToolbar
            campaign={campaign}
            isSaved={isSaved}
            saving={saving}
            onSave={saveCampaign}
            onExport={exportCampaign}
          />
        )}

        {loading && (
          <>
            <GenerationStatus topic={generatingTopic} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton h-48" role="status" aria-label="Loading card" />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Cover Strip + Campaign Details + Related Media */}
      {campaign && !loading && (
        <div className="mt-8 space-y-5">
          {/* Cover images strip — full width row of connected book covers */}
          {campaign.cross_media_connections?.filter(c => c.cover_url).length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {campaign.cross_media_connections.filter(c => c.cover_url).map((c, i) => (
                <div key={`${campaign.campaign_id || campaign.topic}-cover-${i}`} className="flex-shrink-0 group relative">
                  <img
                    key={`${campaign.campaign_id || campaign.topic}-${c.cover_url}`}
                    src={c.cover_url}
                    alt={c.title}
                    className="h-28 w-auto rounded-lg border border-default transition-all duration-250 group-hover:border-strong group-hover:scale-105"
                    style={{boxShadow: 'var(--shadow-md)'}}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg px-1.5 py-1">
                    <p className="text-white text-[10px] font-medium truncate">{c.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Related Media pills */}
          {campaign.media?.length > 0 && (
            <div>
              <h3 className="section-label mb-3">Related Media</h3>
              <div className="flex flex-wrap gap-2">
                {campaign.media.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-card border border-default rounded-full px-3.5 py-1.5 text-sm transition-all duration-250 hover:border-strong" style={{boxShadow: 'var(--shadow-sm)'}}>
                    <span className="font-medium text-primary">📚 {m.title}</span>
                    {m.author && <span className="text-secondary">· {m.author}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Campaign Details — collapsible, larger */}
          {(campaign.cross_media_connections?.length > 0 || campaign.relevant_dates?.length > 0) && (
            <div className="bg-card border border-default rounded-2xl overflow-hidden" style={{boxShadow: 'var(--shadow-sm)'}}>
              <button
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="w-full flex items-center gap-2 px-5 py-3.5 hover:bg-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]"
              >
                {detailsExpanded ? <ChevronDown className="w-4 h-4 text-tertiary" /> : <ChevronRight className="w-4 h-4 text-tertiary" />}
                <span className="text-sm font-semibold text-primary">Campaign Details</span>
                <span className="text-xs text-tertiary bg-page rounded-full px-2 py-0.5 ml-1">
                  {(campaign.cross_media_connections?.length || 0) + (campaign.relevant_dates?.length || 0)}
                </span>
              </button>
              {detailsExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-default border-t border-default">
                  {campaign.cross_media_connections?.length > 0 && (
                    <div className="bg-card p-5">
                      <h4 className="text-xs font-semibold text-tertiary mb-3 uppercase tracking-wide">Connected Books & Media</h4>
                      <div className="space-y-2">
                        {campaign.cross_media_connections.map((c, i) => (
                          <div key={`${campaign.campaign_id || campaign.topic}-conn-${i}`} className="flex items-center gap-2.5">
                            {c.cover_url && (
                              <img src={c.cover_url} alt={c.title} className="w-8 h-11 rounded object-cover flex-shrink-0 border border-default" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-primary truncate">{c.title}</p>
                              <p className="text-xs text-tertiary truncate">
                                {c.author && <>{c.author}</>}
                                {c.author && c.connection && <> · </>}
                                {c.connection && <span className="accent-solid">{c.connection}</span>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {campaign.relevant_dates?.length > 0 && (
                    <div className="bg-card p-5">
                      <h4 className="text-xs font-semibold text-tertiary mb-3 uppercase tracking-wide">Key Dates & Holidays</h4>
                      <div className="space-y-2.5">
                        {campaign.relevant_dates.map((d, i) => (
                          <div key={`${campaign.campaign_id || campaign.topic}-date-${i}`}>
                            <p className="text-sm font-medium text-primary">📅 {d.date}</p>
                            <p className="text-xs text-tertiary">{d.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Promotion Ideas — full width */}
      {campaign && !loading && (
        <div className="mt-8">
          <CardGrid
            cards={campaign.cards}
            rerolling={rerolling}
            onPin={togglePin}
            onReroll={rerollCard}
            onRerollAll={rerollAll}
            onReadMore={setSelectedCard}
          />
        </div>
      )}

      {/* Welcome Modal — nudges guest users to pick an example */}
      {showWelcomeModal && (
        <WelcomeModal
          campaigns={featuredCampaigns}
          onSelect={(c) => {
            setCampaign({ ...c })
            setShowWelcomeModal(false)
          }}
          onClose={() => setShowWelcomeModal(false)}
          onSignUp={() => {
            setShowWelcomeModal(false)
            setGuestMode(false)
          }}
        />
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onGenerateFullPlan={generateFullEscapePlan}
        />
      )}

      {/* Credits Purchase Modal */}
      {showCreditModal && (
        <CreditsModal
          credits={credits}
          onClose={() => setShowCreditModal(false)}
          getToken={getToken}
        />
      )}

    </div>

    {/* Footer — outside main container to match card edges */}
    <Footer />
    </>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString()
}
