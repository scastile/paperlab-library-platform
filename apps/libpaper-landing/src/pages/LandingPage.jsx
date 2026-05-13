import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2, BookOpen, Palette } from 'lucide-react'
import ServiceCard from '../components/ServiceCard'
import { Rocket, Puzzle } from 'lucide-react'
import { buildProductUrl } from '../lib/auth-bridge'

const SERVICES = [
  {
    icon: Rocket,
    title: 'Library Launchpad',
    description: 'AI-powered promotional campaigns. Display themes, shelf talkers, social posts, and signage — generated in seconds from any topic.',
    href: 'https://launchpad.paperlab.xyz',
    tint: 'tint-indigo',
    tag: 'Live',
    tagClass: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    icon: Puzzle,
    title: 'Escape Room Designer',
    description: 'Complete escape room concepts with puzzle paths, prop inventories, clue sequences, and game master cheat sheets.',
    href: 'https://escape.paperlab.xyz',
    tint: 'tint-violet',
    tag: 'Live',
    tagClass: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    icon: Palette,
    title: 'Event Flyer Studio',
    description: 'AI-powered campaign generation, escape room design, and event flyers — built for how libraries actually work.',
    href: 'https://flyer.paperlab.xyz',
    tint: 'tint-rose',
    tag: 'Live',
    tagClass: 'bg-emerald-500/10 text-emerald-500',
  },
]

export default function LandingPage() {
  const { user, signIn, signUp, session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    const redirect = searchParams.get('redirect')
    if (redirect && redirect.includes('paperlab.xyz')) {
      window.location.href = buildProductUrl(redirect, session)
      return null
    }
    if (!searchParams.get('signed_out')) {
      navigate('/dashboard')
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let data
      if (mode === 'signin') {
        data = await signIn(email, password)
      } else {
        data = await signUp(email, password)
      }
      const redirect = searchParams.get('redirect')
      if (redirect && redirect.includes('paperlab.xyz')) {
        window.location.href = buildProductUrl(redirect, data.session)
        return
      }
      navigate('/dashboard')
      window.location.href = 'https://lib.paperlab.xyz/dashboard'
      return
    } catch (e) {
      setError(e.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page design-stripe">
      {/* Full-page gradient background */}
      <div className="page-gradient-bg">
        <div className="gradient-mesh" />
      </div>

      {/* Theme Toggle */}
      <div className="fixed top-5 right-5 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Hero */}
        <section className="text-center pt-20 pb-12 relative">
          <h1 className="hero-headline leading-tight">
            Turn Any Topic Into a{' '}
            <span className="bg-gradient-to-r from-[var(--accent-from)] to-[var(--accent-to)] bg-clip-text text-transparent">
              Library Event
            </span>
          </h1>
          <p className="text-lg text-secondary mt-4 max-w-2xl mx-auto leading-relaxed hero-sub">
            AI-powered promotional campaigns, escape rooms, event flyers, and document tools — built for how libraries actually work.
          </p>
        </section>

        {/* Product Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-20 relative">
          {SERVICES.map((s) => (
            <ServiceCard key={s.title} {...s} href={user ? s.href : undefined} />
          ))}
        </section>

        {/* Auth + Demo + Pricing Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-20 relative">
          {/* Auth Card */}
          <div className="lg:col-span-3 glass-card p-8 flex flex-col">
            <h2 className="text-2xl font-bold text-primary tracking-tight mb-1">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-base text-secondary mb-8">
              {mode === 'signin' ? 'Sign in to your campaigns' : 'Get 10 free credits to try it out'}
            </p>

            {/* Product Icon Graphic */}
            <div className="flex items-center justify-start gap-2 mb-6">
              {[
                { Icon: Rocket, color: 'var(--accent-solid)', bg: 'var(--tint-indigo)' },
                { Icon: Puzzle, color: '#8b5cf6', bg: 'var(--tint-violet)' },
                { Icon: Palette, color: '#f43f5e', bg: 'var(--tint-rose)' },
              ].map(({ Icon, color, bg }, i) => (
                <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@library.org"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 text-primary placeholder:text-tertiary focus:outline-none text-[15px] rounded-lg border border-default bg-input/60 backdrop-blur-sm focus:border-[var(--accent-solid)] focus:ring-2 focus:ring-[var(--accent-solid)]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="w-full px-4 py-3 text-primary placeholder:text-tertiary focus:outline-none text-[15px] rounded-lg border border-default bg-input/60 backdrop-blur-sm focus:border-[var(--accent-solid)] focus:ring-2 focus:ring-[var(--accent-solid)]/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full justify-center disabled:opacity-50 bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent-to)] text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-[var(--accent-solid)]/25 hover:-translate-y-0.5 transition-all disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'signin' ? (
                  'Sign In'
                ) : (
                  'Create Account & Get 10 Free Credits'
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-tertiary mt-2">
                <span>No credit card required</span>
                <span>·</span>
                <span>Instant access</span>
                <span>·</span>
                <span>Cancel anytime</span>
              </div>

              <p className="text-center text-sm text-secondary mt-1">
                {mode === 'signin' ? (
                  <>Don't have an account? <button type="button" onClick={() => setMode('signup')} className="text-[var(--accent-solid)] font-medium hover:underline bg-transparent border-none p-0 cursor-pointer">Sign up free</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => setMode('signin')} className="text-[var(--accent-solid)] font-medium hover:underline bg-transparent border-none p-0 cursor-pointer">Sign in</button></>
                )}
              </p>

            </form>

            <div className="mt-auto pt-6">
              <div className="rounded-lg border border-[var(--accent-solid)]/10 bg-[var(--accent-solid)]/[0.03] backdrop-blur-sm p-5 text-center">
                <p className="font-semibold text-[var(--accent-solid)] text-base">Get 10 free credits on signup</p>
                <p className="text-secondary text-sm mt-1.5">Enough for a full campaign + rerolls, or try any product</p>
              </div>
            </div>
          </div>

          {/* Right Stack: Demo + Pricing */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Demo Card */}
            <div className="glass-card p-7 text-center flex flex-col items-center justify-center flex-1">
              <div className="w-12 h-12 rounded-xl tint-indigo flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-[var(--accent-solid)]" />
              </div>
              <h3 className="text-base font-bold text-primary mb-1">Try the Demo</h3>
              <p className="text-sm text-secondary leading-relaxed mb-5">
                See Alice in Wonderland escape rooms, promotional displays, and social media campaigns — no signup required.
              </p>
              <a href="https://launchpad.paperlab.xyz?demo=1" className="btn-gradient">
                Browse Example Campaigns →
              </a>
            </div>

            {/* Pricing Card */}
            <div className="glass-card p-6">
              <div className="rounded-lg border border-[var(--accent-solid)]/10 bg-[var(--accent-solid)]/[0.03] backdrop-blur-sm p-5 text-center mb-4">
                <p className="font-semibold text-[var(--accent-solid)] text-base">10 free credits on signup</p>
                <p className="text-secondary text-sm mt-1.5">No card required · Enough for a full campaign</p>
              </div>

              <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                Monthly Plans <span className="text-[var(--accent-solid)] normal-case font-medium ml-1">Best Value</span>
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-baseline">
                  <span className="text-secondary">Creator <span className="text-tertiary">· 60 credits</span></span>
                  <span className="font-semibold text-primary">$12.99<span className="text-tertiary font-normal text-xs">/mo</span></span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-secondary">Pro <span className="text-tertiary">· 150 credits</span></span>
                  <span className="font-semibold text-primary">$24.99<span className="text-tertiary font-normal text-xs">/mo</span></span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-secondary">Institution <span className="text-tertiary">· 400 credits</span></span>
                  <span className="font-semibold text-primary">$49.99<span className="text-tertiary font-normal text-xs">/mo</span></span>
                </div>
              </div>

              <div className="border-t border-subtle mt-3 pt-3">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                  Credit Packs <span className="text-tertiary normal-case font-normal ml-1">· 90-day expiry</span>
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="text-secondary">Small Pack <span className="text-tertiary">· 20 credits</span></span>
                    <span className="font-semibold text-primary">$7</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-secondary">Medium Pack <span className="text-tertiary">· 50 credits</span></span>
                    <span className="font-semibold text-primary">$15</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-secondary">Large Pack <span className="text-tertiary">· 120 credits</span></span>
                    <span className="font-semibold text-primary">$30</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-center gap-2 text-sm text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <span>Powered by <span className="text-primary font-medium">PaperLab</span></span>
        </div>
      </footer>
    </div>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <button
      onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 rounded-full bg-card border border-default flex items-center justify-center text-base shadow-sm hover:shadow-card transition-all"
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
