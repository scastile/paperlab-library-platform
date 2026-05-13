import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import ServiceCard from '../components/ServiceCard'
import { Rocket, Puzzle, Palette } from 'lucide-react'
import { buildProductUrl } from '../lib/auth-bridge'

const SERVICES = [
  {
    icon: Rocket,
    title: 'Library Launchpad',
    description: 'AI-powered promotional campaigns. Generate display themes, shelf talkers, social posts, and signage from any topic.',
    href: 'https://launchpad.paperlab.xyz',
    tint: 'tint-indigo',
    tag: 'Live',
    tagClass: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    icon: Puzzle,
    title: 'Escape Room Designer',
    description: 'Build complete escape room concepts with puzzle paths, prop inventories, clue sequences, and game master cheat sheets.',
    href: 'https://escape.paperlab.xyz',
    tint: 'tint-violet',
    tag: 'Live',
    tagClass: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    icon: Palette,
    title: 'Event Flyer Studio',
    description: 'Describe your event, pick a vibe, get a print-ready flyer with AI-generated imagery and your library info baked in.',
    href: 'https://flyer.paperlab.xyz',
    tint: 'tint-rose',
    tag: 'Live',
    tagClass: 'bg-emerald-500/10 text-emerald-500',
  },
]

export default function Dashboard() {
  const { user, loading, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/')
    }
  }, [user, loading, navigate])

  const goToProduct = (url) => (e) => {
    e.preventDefault()
    window.location.href = buildProductUrl(url, session)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-2 border-[var(--accent-solid)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <div className="page-gradient-bg"><div className="gradient-mesh" /></div>

      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary">Your Library Tools</h1>
          <p className="text-secondary mt-1">Choose a product to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((s) => (
            <ServiceCard key={s.title} {...s} onClick={s.tag === 'Live' ? goToProduct(s.href) : undefined} />
          ))}
        </div>

        <div className="mt-12 card-lift p-8 text-center">
          <h2 className="text-xl font-bold text-primary mb-2">Need Help Getting Started?</h2>
          <p className="text-secondary mb-5 max-w-lg mx-auto">
            Check out example campaigns and demo content — no credits required.
          </p>
          <a href="https://launchpad.paperlab.xyz?demo=1" className="btn-gradient">
            Browse Example Campaigns →
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-center gap-2 text-sm text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <span>Powered by <span className="text-primary font-medium">PaperLab</span></span>
        </div>
      </footer>
    </div>
  )
}
