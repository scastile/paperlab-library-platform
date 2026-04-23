import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Rocket, Puzzle, Palette, FileText, LogOut, Sun, Moon } from 'lucide-react'
import CreditBadge from './CreditBadge'

const SERVICES = [
  { icon: Rocket, label: 'Launchpad', href: 'https://launchpad.paperlab.xyz', tint: 'tint-indigo', color: '#6366f1' },
  { icon: Puzzle, label: 'Escape Room', href: 'https://escape.paperlab.xyz', tint: 'tint-violet', color: '#8b5cf6', active: true },
  { icon: Palette, label: 'Flyer Studio', href: 'https://flyer.paperlab.xyz', tint: 'tint-rose', color: '#f43f5e' },
  { icon: FileText, label: 'LibPDF', href: '#', tint: 'tint-emerald', color: '#10b981', soon: true },
]

export default function Header({ actions }) {
  const { user, signOut, session } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('erd-theme') || 'light')

  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
    else document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('erd-theme', theme)
  }, [theme])

  const productUrl = (url) => {
    if (!session?.access_token) return url
    return `${url}/#access_token=${session.access_token}&refresh_token=${session.refresh_token}`
  }

  return (
    <header className="border-b border-default bg-card">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <a href={productUrl('https://lib.paperlab.xyz')} className="flex items-center gap-2.5 text-primary font-bold text-lg no-underline">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--accent-solid)'}}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <span>PaperLab</span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {SERVICES.map((s) => {
            const Icon = s.icon
            return (
              <a key={s.label} href={s.soon ? undefined : productUrl(s.href)}
                onClick={s.soon ? (e) => e.preventDefault() : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${s.soon ? 'opacity-40 cursor-not-allowed text-secondary' : s.active ? 'bg-hover text-primary' : 'text-secondary hover:text-primary hover:bg-hover'}`}
                title={s.soon ? `${s.label} — Coming Soon` : s.label}>
                <span className={`w-7 h-7 rounded-md flex items-center justify-center ${s.tint}`}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </span>
                <span className="hidden lg:inline">{s.label}</span>
                {s.soon && <span className="text-[10px] text-tertiary ml-0.5">soon</span>}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {actions}
          {user && <CreditBadge />}
          {user && (
            <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-hover transition-all duration-200">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
