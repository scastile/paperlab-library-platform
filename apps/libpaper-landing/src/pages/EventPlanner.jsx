import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CalendarDays, Plus, Trash2, MapPin, Users, Sparkles, CheckCircle2, CalendarClock, LogIn, Coins, X } from 'lucide-react'

const STORAGE_KEY = 'paperlab_event_plans'
const API_BASE = import.meta.env.VITE_API_URL || '/api'
const PLAN_COST = 1

const EVENT_TYPES = ['Program', 'Workshop', 'Display', 'Book Club', 'Reading', 'Film Screening', 'Outreach', 'Other']
const AUDIENCES = ['All Ages', 'Children', 'Teens', 'Adults', 'Seniors', 'Educators']

const TYPE_CHECKLISTS = {
  Program: [
    'Book the room and confirm availability',
    'Post the event to the library calendar + social channels',
    'Create and print signage for the venue',
    'Order refreshments if budgeted',
    'Run a tech check on AV (mic, projector)',
    'Arrive 30 minutes early to set up',
  ],
  Workshop: [
    'Reserve a room with enough seating / desks',
    'Prepare handouts and materials per attendee',
    'Confirm the facilitator is available',
    'Cap registration and send reminder emails',
    'Test any tools or equipment beforehand',
    'Collect feedback forms at the end',
  ],
  Display: [
    'Secure display case or shelf space',
    'Curate and pull materials from the collection',
    'Draft signage, captions, and a title',
    'Arrange the display with clear sight lines',
    'Photograph it for social promotion',
    'Schedule a date to refresh / take it down',
  ],
  'Book Club': [
    'Choose the title and set discussion date',
    'Order extra copies through interlibrary loan',
    'Create a discussion guide / questions',
    'Promote to existing members + new signups',
    'Confirm a meeting room',
    'Prepare a short intro on the author',
  ],
  Reading: [
    'Confirm the reader / author appearance',
    'Set up seating and a podium or chair',
    'Prepare a short introduction',
    'Promote through the newsletter and socials',
    'Arrange books for sale or checkout on-site',
    'Have water and thank-you gift ready',
  ],
  'Film Screening': [
    'Clear screening rights or use public-domain title',
    'Test projector, speakers, and captions',
    'Reserve room and dim-lighting plan',
    'Create an intro and post-film discussion question',
    'Print a simple program / ticket',
    'Collect attendance + feedback',
  ],
  Outreach: [
    'Confirm the off-site location and contact',
    'Pack a portable kit (flyers, signup sheet, materials)',
    'Coordinate transportation',
    'Collect contact info for follow-up',
    'Document with photos for the report',
    'Log stats and outcomes afterward',
  ],
  Other: [
    'Define the goals and expected attendance',
    'Reserve the space and any needed equipment',
    'Promote through library channels',
    'Assign a staff lead and a backup',
    'Prepare materials / signage',
    'Debrief and log outcomes after',
  ],
}

const BASE_COSTS = { Program: 25, Workshop: 45, Display: 15, 'Book Club': 10, Reading: 20, 'Film Screening': 60, Outreach: 50, Other: 25 }

function emptyForm() {
  return {
    name: '',
    type: 'Program',
    date: '',
    time: '',
    duration: '60',
    room: '',
    capacity: '',
    audience: 'All Ages',
    description: '',
  }
}

export default function EventPlanner() {
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [events, setEvents] = useState([])
  const [credits, setCredits] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setEvents(raw ? JSON.parse(raw) : [])
    } catch {
      setEvents([])
    }
  }, [])

  // Load credit balance when signed in
  useEffect(() => {
    if (!user || !session?.access_token) {
      setCredits(null)
      return
    }
    let cancelled = false
    fetch(`${API_BASE}/credits/balance`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setCredits(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user, session?.access_token])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const addEvent = async () => {
    if (!form.name.trim()) return
    setError('')
    setSavedFlash(false)

    if (!user || !session?.access_token) {
      setError('Please sign in to save event plans. Plans cost 1 credit each.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/credits/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'event_plan', app: 'event-planner', product: 'event-planner' }),
      })

      if (!res.ok) {
        if (res.status === 402) {
          setError('Not enough credits. Event plans cost 1 credit — top up from your dashboard.')
        } else if (res.status === 401) {
          setError('Your session expired. Please sign in again.')
        } else {
          setError(`Could not use credits (${res.status}). Please try again.`)
        }
        return
      }

      const balance = await res.json()
      setCredits(balance)

      const checklist = TYPE_CHECKLISTS[form.type] || TYPE_CHECKLISTS.Other
      const baseCost = BASE_COSTS[form.type] || 25
      const cap = parseInt(form.capacity, 10)
      const capacityCost = cap > 0 ? Math.min(60, Math.round(cap / 20) * 10) : 0
      const newEvent = {
        id: Date.now(),
        ...form,
        checklist,
        estimated_cost: baseCost + capacityCost,
        created_at: new Date().toISOString(),
      }
      const next = [newEvent, ...events]
      setEvents(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setForm(emptyForm())
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (e) {
      setError('Network error while deducting credits. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = (id) => {
    const next = events.filter((e) => e.id !== id)
    setEvents(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const inputCls =
    'w-full px-3.5 py-2.5 text-[15px] text-primary placeholder:text-tertiary focus:outline-none rounded-lg border border-default bg-input/60 backdrop-blur-sm focus:border-[var(--accent-solid)] focus:ring-2 focus:ring-[var(--accent-solid)]/20 transition-all'

  return (
    <div className="min-h-screen bg-page design-stripe">
      <div className="page-gradient-bg">
        <div className="gradient-mesh" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate('/')}
          className="mb-8 text-secondary hover:text-primary transition-all flex items-center gap-1.5 text-sm font-medium"
        >
          ← Back to Home
        </button>

        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl tint-amber mb-4">
            <CalendarDays className="w-7 h-7 text-[var(--accent-solid)]" />
          </div>
          <h1 className="hero-headline leading-tight">
            Event{' '}
            <span className="bg-gradient-to-r from-[var(--accent-from)] to-[var(--accent-to)] bg-clip-text text-transparent">
              Planner
            </span>
          </h1>
          <p className="text-lg text-secondary mt-4 max-w-2xl mx-auto hero-sub">
            Plan a library program end to end — name it, pick a type, and get an auto-generated task
            checklist and budget estimate. Saves cost 1 credit.
          </p>
        </header>

        {/* Sign-in / balance strip */}
        <div className="max-w-3xl mx-auto mb-10">
          {user ? (
            <div className="glass-card px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Coins className="w-4 h-4 accent-solid" />
                <span>
                  Balance:{' '}
                  <span className="font-semibold text-primary">{credits?.total_available ?? '…'} credits</span>
                </span>
                <span className="text-tertiary">· saving a plan costs {PLAN_COST} credit</span>
              </div>
              <a href="/dashboard" className="text-sm font-medium accent-solid hover:underline">Buy more credits</a>
            </div>
          ) : (
            <div className="glass-card px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-secondary flex items-center gap-2">
                <LogIn className="w-4 h-4 accent-solid" />
                Sign in to save plans and use credits. Preview the generator free — saving costs 1 credit.
              </p>
              <a href="/" className="btn-gradient px-4 py-2 rounded-lg text-sm font-medium">Sign in</a>
            </div>
          )}
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-2">
            <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
          {/* Builder */}
          <section className="lg:col-span-3 glass-card p-7">
            <h2 className="text-xl font-bold text-primary tracking-tight mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 accent-solid" /> New Event
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Event Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="Summer Reading Kickoff" className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Type</label>
                <select value={form.type} onChange={set('type')} className={inputCls}>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Audience</label>
                <select value={form.audience} onChange={set('audience')} className={inputCls}>
                  {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Date</label>
                <input type="date" value={form.date} onChange={set('date')} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Time</label>
                <input type="time" value={form.time} onChange={set('time')} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Duration (min)</label>
                <select value={form.duration} onChange={set('duration')} className={inputCls}>
                  {['30', '45', '60', '90', '120'].map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Room / Venue</label>
                <input value={form.room} onChange={set('room')} placeholder="Community Room B" className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Capacity</label>
                <input type="number" min="0" value={form.capacity} onChange={set('capacity')} placeholder="40" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={set('description')} rows="3" placeholder="What happens at this event?" className={inputCls} />
              </div>
            </div>

            <button
              onClick={addEvent}
              disabled={!form.name.trim() || saving}
              className="btn-gradient w-full mt-5 py-3 px-6 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> {saving ? 'Saving…' : 'Create Event Plan (1 credit)'}
            </button>

            {savedFlash && (
              <p className="mt-3 text-sm text-emerald-600 font-medium flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-4 h-4" /> Event plan saved
              </p>
            )}
          </section>

          {/* Live preview */}
          <aside className="lg:col-span-2 flex flex-col gap-5">
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 accent-solid" /> Generated Checklist
              </h3>
              <ul className="space-y-2.5">
                {(TYPE_CHECKLISTS[form.type] || TYPE_CHECKLISTS.Other).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-secondary">
                    <CheckCircle2 className="w-4 h-4 accent-solid flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 accent-solid" /> Budget Estimate
              </h3>
              <p className="text-3xl font-bold text-primary">
                ${((BASE_COSTS[form.type] || 25) + Math.min(60, Math.round((parseInt(form.capacity, 10) || 0) / 20) * 10)).toFixed(2)}
                <span className="text-base font-normal text-tertiary"> / event</span>
              </p>
              <p className="text-secondary text-sm mt-2">
                Base supplies + scaled seating. Adjust as your real costs come in.
              </p>
            </div>
          </aside>
        </div>

        {/* Saved events */}
        <section>
          <h2 className="text-xl font-bold text-primary tracking-tight mb-5 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 accent-solid" /> Saved Plans
            <span className="text-sm font-normal text-tertiary">({events.length})</span>
          </h2>

          {events.length === 0 ? (
            <div className="glass-card p-10 text-center text-secondary">
              No plans yet. Build your first event above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((e) => (
                <div key={e.id} className="glass-card p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full tint-indigo text-primary">
                      {e.type}
                    </span>
                    <button onClick={() => deleteEvent(e.id)} aria-label="Delete plan" className="p-1 text-tertiary hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-primary leading-tight mb-3">{e.name}</h3>
                  <div className="space-y-1.5 text-sm text-secondary mb-4">
                    {e.date && <p className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 accent-solid" /> {new Date(e.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} {e.time && `· ${e.time}`}</p>}
                    {e.room && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 accent-solid" /> {e.room}</p>}
                    <p className="flex items-center gap-2"><Users className="w-3.5 h-3.5 accent-solid" /> {e.audience}{e.capacity ? ` · up to ${e.capacity}` : ''}</p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-subtle flex items-center justify-between">
                    <span className="text-sm text-secondary">Est. <span className="font-semibold text-primary">${e.estimated_cost}</span></span>
                    <span className="text-xs text-tertiary">{e.checklist?.length || 0} tasks</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
