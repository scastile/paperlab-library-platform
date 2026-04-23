import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogIn, Sparkles, Rocket, BookOpen, Wand2, ArrowRight, Loader2, Puzzle, Share2, Calendar } from 'lucide-react'

export default function Login({ onSkip }) {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Wand2, tint: 'tint-indigo', title: 'Instant Campaigns', desc: 'Enter any topic and get 8+ ready-to-use promotional cards in seconds — display themes, shelf talkers, signage, and more.' },
    { icon: Puzzle, tint: 'tint-rose', title: 'Escape Room Designer', desc: 'AI-generated escape room concepts with full puzzle paths, prop inventories, and game master cheat sheets.' },
    { icon: Share2, tint: 'tint-violet', title: 'Social Media Posts', desc: 'Platform-ready posts for Instagram, Facebook, and TikTok — tailored to your library\'s topic and audience.' },
    { icon: Calendar, tint: 'tint-amber', title: 'Key Dates & Connections', desc: 'Automatically surfaces relevant holidays, events, and cross-media connections for every campaign.' },
  ]

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
            Turn Any Topic Into a <span style={{background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Library Event</span>
          </h1>
          <p className="text-secondary text-lg mt-3 max-w-2xl mx-auto leading-relaxed">
            AI-powered promotional campaigns built for libraries. Display themes, escape rooms, social media, signage, and programs — generated in seconds.
          </p>

          {/* Social proof */}
          <div className="flex justify-center gap-8 mt-6 text-sm">
            <div className="text-center">
              <p className="text-xl font-bold text-primary">25,000+</p>
              <p className="text-tertiary">Ideas Generated</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">450+</p>
              <p className="text-tertiary">Libraries</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">98%</p>
              <p className="text-tertiary">Satisfaction</p>
            </div>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {features.map((f, i) => (
            <div key={i} className="card-lift p-5">
              <div className={`w-10 h-10 rounded-xl ${f.tint} flex items-center justify-center mb-3`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-primary text-sm">{f.title}</h3>
              <p className="text-secondary text-xs mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Auth + Demo row */}
        <div className="grid md:grid-cols-5 gap-6 items-stretch">
          {/* Auth form — 3 cols */}
          <div className="md:col-span-3 bg-card rounded-xl border border-default p-8 flex flex-col" style={{boxShadow: 'var(--shadow-card)'}}>
            {/* Mobile header */}
            <div className="md:hidden text-center mb-6">
              <span className="text-4xl">🚀</span>
              <h1 className="text-2xl font-bold text-primary mt-2">Library Launchpad</h1>
              <p className="text-secondary text-sm mt-1">AI-powered promotional campaigns</p>
            </div>

            <h2 className="text-xl font-bold text-primary mb-1 pt-1">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-secondary text-sm mb-6">
              {isSignUp ? 'Get 10 free credits to try it out' : 'Sign in to your campaigns'}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="section-label">Email</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full mt-1.5 px-4 py-3 bg-input border border-default rounded-xl text-primary placeholder:text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] focus-visible:border-transparent transition-all duration-250"
                  placeholder="you@library.org"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="section-label">Password</label>
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full mt-1.5 px-4 py-3 bg-input border border-default rounded-xl text-primary placeholder:text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] focus-visible:border-transparent transition-all duration-250"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-gradient w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {isSignUp ? 'Creating account…' : 'Signing in…'}</>
                ) : isSignUp
                  ? <><Sparkles className="w-4 h-4" /> Create Account & Get 10 Free Credits</>
                  : <><LogIn className="w-4 h-4" /> Sign In</>}
              </button>
            </form>

            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-tertiary">
              <span>No credit card required</span>
              <span>·</span>
              <span>Instant access</span>
              <span>·</span>
              <span>Cancel anytime</span>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError('') }}
                className="text-sm text-secondary hover:text-primary transition-colors duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] rounded"
              >
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <span className="accent-solid font-medium">
                  {isSignUp ? 'Sign in' : 'Sign up free'}
                </span>
              </button>
            </div>

            <div className="mt-3 text-center text-xs text-tertiary">
              <p>Campaigns <span className="font-medium text-secondary">5 credits</span> · Rerolls <span className="font-medium text-secondary">1 credit</span></p>
              <p className="mt-0.5">Escape Rooms <span className="font-medium text-secondary">5 credits</span></p>
            </div>

            <div className="mt-auto bg-page rounded-lg p-3 text-center text-xs">
              <p className="font-medium text-primary">With your 10 free credits you can:</p>
              <p className="text-secondary mt-1">Generate a campaign (5 cr) + 5 rerolls, or try an escape room (5 cr)</p>
            </div>
          </div>

          {/* Demo CTA — 2 cols */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="card-lift p-6 text-center flex-1 flex flex-col justify-center">
              <div className="w-12 h-12 rounded-xl tint-indigo flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-primary mb-1">Try the Demo</h3>
              <p className="text-secondary text-sm mb-4 leading-relaxed">
                See Alice in Wonderland escape rooms, promotional displays, and social media campaigns — no signup required.
              </p>
              <button
                onClick={onSkip}
                className="btn-gradient w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]"
              >
                Browse Example Campaigns <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-card rounded-xl p-5 border border-default" style={{boxShadow: 'var(--shadow-sm)'}}>
              <p className="section-label mb-3">Simple Pricing</p>
              <div className="space-y-3 text-sm">
                <div className="bg-page rounded-lg p-3 text-center">
                  <p className="font-semibold text-primary">10 free credits on signup</p>
                  <p className="text-tertiary text-xs mt-0.5">No card required · Enough for a full campaign</p>
                </div>
                <div>
                  <p className="text-tertiary text-xs font-medium mb-1.5">Monthly Plans <span className="accent-solid text-xs font-medium">Best Value</span></p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-secondary">Basic <span className="text-tertiary">· 50 credits</span></span>
                      <span className="text-primary font-semibold">$12.99<span className="text-tertiary font-normal">/mo</span> <span className="text-tertiary text-xs">$0.26/cr</span></span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-secondary">Pro <span className="text-tertiary">· 100 credits + rollover</span></span>
                      <span className="text-primary font-semibold">$19.99<span className="text-tertiary font-normal">/mo</span> <span className="text-tertiary text-xs">$0.20/cr</span></span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-secondary">Premium <span className="text-tertiary">· 200 credits + rollover</span></span>
                      <span className="text-primary font-semibold">$39.99<span className="text-tertiary font-normal">/mo</span> <span className="text-tertiary text-xs">$0.20/cr</span></span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-subtle pt-3">
                  <p className="text-tertiary text-xs font-medium mb-1.5">Credit Packs <span className="text-tertiary text-xs">· 90-day expiry</span></p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-secondary">Small Pack <span className="text-tertiary">· 15 credits</span></span>
                      <span className="text-primary font-semibold">$7 <span className="text-tertiary text-xs">$0.47/cr</span></span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-secondary">Large Pack <span className="text-tertiary">· 75 credits</span></span>
                      <span className="text-primary font-semibold">$25 <span className="text-tertiary text-xs">$0.33/cr</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-tertiary text-xs mt-10">
          Built for libraries. Powered by AI.
        </p>
      </div>
    </div>
  )
}
