import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Eye, Eraser, Loader2, Newspaper, RefreshCw } from 'lucide-react'

const API = '/crossword-api'

function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])
  return (
    <button
      onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      className="w-9 h-9 rounded-full bg-card border border-default flex items-center justify-center text-base shadow-sm hover:shadow-card transition-all"
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

export default function Crossword() {
  const [puzzle, setPuzzle] = useState(null)
  const [cells, setCells] = useState([])
  const [sel, setSel] = useState(null) // {r, c, dir}
  const [wrong, setWrong] = useState(null) // Set of "r,c" marked wrong
  const [solved, setSolved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [showBriefing, setShowBriefing] = useState(false)
  const gridRef = useRef(null)

  useEffect(() => {
    let alive = true
    fetch(`${API}/today`)
      .then(r => {
        if (!r.ok) throw new Error(`Server ${r.status}`)
        return r.json()
      })
      .then(p => {
        if (!alive) return
        setPuzzle(p)
        setCells(Array.from({ length: p.size }, () => Array(p.size).fill('')))
        setLoading(false)
      })
      .catch(e => {
        if (!alive) return
        setError(e.message)
        setLoading(false)
      })
    return () => { alive = false }
  }, [])

  const wordCells = useCallback((r, c, dir) => {
    if (!puzzle) return []
    const size = puzzle.size
    const out = []
    if (dir === 'across') {
      let c1 = c
      while (c1 > 0 && !puzzle.grid[r][c1 - 1].black) c1--
      let c2 = c
      while (c2 < size - 1 && !puzzle.grid[r][c2 + 1].black) c2++
      for (let cc = c1; cc <= c2; cc++) out.push([r, cc])
    } else {
      let r1 = r
      while (r1 > 0 && !puzzle.grid[r1 - 1][c].black) r1--
      let r2 = r
      while (r2 < size - 1 && !puzzle.grid[r2 + 1][c].black) r2++
      for (let rr = r1; rr <= r2; rr++) out.push([rr, c])
    }
    return out
  }, [puzzle])

  const select = (r, c, dir) => {
    if (puzzle?.grid[r][c].black) return
    setSel(prev => {
      if (prev && prev.r === r && prev.c === c) {
        return { r, c, dir: prev.dir === 'across' ? 'down' : 'across' }
      }
      return { r, c, dir: dir || prev?.dir || 'across' }
    })
  }

  const nextInDir = (r, c, dir, step) => {
    const size = puzzle.size
    const dr = dir === 'down' ? step : 0
    const dc = dir === 'across' ? step : 0
    let rr = r + dr, cc = c + dc
    while (rr >= 0 && rr < size && cc >= 0 && cc < size && !puzzle.grid[rr][cc].black) {
      return [rr, cc]
    }
    return null
  }

  const handleKey = useCallback((e) => {
    if (!puzzle || !sel) return
    const size = puzzle.size
    const { r, c, dir } = sel
    const key = e.key
    if (/^[a-zA-Z]$/.test(key)) {
      e.preventDefault()
      const letter = key.toUpperCase()
      setCells(prev => {
        const next = prev.map(row => [...row])
        next[r][c] = letter
        return next
      })
      setWrong(null)
      const nxt = nextInDir(r, c, dir, 1)
      if (nxt) setSel({ r: nxt[0], c: nxt[1], dir })
    } else if (key === 'Backspace') {
      e.preventDefault()
      const cur = cells[r][c]
      setCells(prev => {
        const next = prev.map(row => [...row])
        if (cur) {
          next[r][c] = ''
        } else {
          const bk = nextInDir(r, c, dir, -1)
          if (bk) next[bk[0]][bk[1]] = ''
        }
        return next
      })
      setWrong(null)
      if (!cur) {
        const bk = nextInDir(r, c, dir, -1)
        if (bk) setSel({ r: bk[0], c: bk[1], dir })
      }
    } else if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault()
      const moves = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      }
      const [dc, dr] = moves[key]
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !puzzle.grid[nr][nc].black) {
        setSel({ r: nr, c: nc, dir })
      }
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault()
      setSel(prev => prev ? { ...prev, dir: prev.dir === 'across' ? 'down' : 'across' } : prev)
    } else if (key === 'Tab') {
      e.preventDefault()
      setSel(prev => prev ? { ...prev, dir: prev.dir === 'across' ? 'down' : 'across' } : prev)
    }
  }, [puzzle, sel, cells, nextInDir])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const isInWord = (r, c) => {
    if (!sel || !puzzle || puzzle.grid[r][c].black) return false
    return wordCells(sel.r, sel.c, sel.dir).some(([rr, cc]) => rr === r && cc === c)
  }

  const handleCheck = async () => {
    setChecking(true)
    try {
      const resp = await fetch(`${API}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid: cells }),
      })
      const data = await resp.json()
      const bad = new Set()
      data.correct.forEach((row, r) => row.forEach((ok, c) => { if (!ok && puzzle.grid[r][c].black === false && cells[r][c]) bad.add(`${r},${c}`) }))
      setWrong(bad)
      if (data.solved) setSolved(true)
    } finally {
      setChecking(false)
    }
  }

  const handleReveal = async () => {
    const resp = await fetch(`${API}/reveal`)
    const data = await resp.json()
    setCells(data.answers.map(row => [...row]))
    setWrong(null)
    setSolved(true)
  }

  const handleClear = () => {
    setCells(Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill('')))
    setWrong(null)
    setSolved(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <div className="page-gradient-bg"><div className="gradient-mesh" /></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-solid)]" />
            <p className="text-secondary text-sm">Generating today's crossword from the news…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-page">
        <div className="page-gradient-bg"><div className="gradient-mesh" /></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="glass-card p-8 text-center max-w-md">
            <p className="text-lg font-semibold text-primary mb-2">Puzzle unavailable</p>
            <p className="text-secondary text-sm mb-6">The crossword engine couldn't build today's puzzle: {error}</p>
            <button className="btn-gradient" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const size = puzzle.size

  return (
    <div className="min-h-screen bg-page">
      <div className="page-gradient-bg"><div className="gradient-mesh" /></div>

      {/* Top bar */}
      <header className="relative z-10 border-b border-default bg-card/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors no-underline">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">PaperLab</span>
            </Link>
            <span className="text-tertiary text-sm">/</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Newspaper className="w-4 h-4 text-[var(--accent-solid)]" />
              Daily Crossword
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="hero-headline leading-tight">
            Today's Crossword,{' '}
            <span className="bg-gradient-to-r from-[var(--accent-from)] to-[var(--accent-to)] bg-clip-text text-transparent">
              Built From the News
            </span>
          </h1>
          <p className="text-secondary mt-3 max-w-xl mx-auto text-sm leading-relaxed">
            A fresh puzzle every day — answers pulled from today's headlines, clues written by AI.
            {puzzle.date && <span className="text-tertiary"> · {puzzle.date}</span>}
          </p>
          <button
            onClick={() => setShowBriefing(v => !v)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full tint-sky hover:opacity-80 transition-opacity"
          >
            <Newspaper className="w-3.5 h-3.5" />
            {showBriefing ? 'Hide' : 'Read'} today's news briefing
          </button>
        </div>

        {showBriefing && puzzle.briefing && (
          <div className="max-w-2xl mx-auto mb-8 glass-card p-5">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">What's happening today</p>
            <div className="space-y-1.5 text-sm text-primary leading-relaxed whitespace-pre-line">{puzzle.briefing}</div>
            <p className="text-xs text-tertiary mt-3">
              Sources: {puzzle.sources.join(', ')}
            </p>
          </div>
        )}

        {/* Grid + Clues */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 items-start">
          {/* Grid */}
          <div className="glass-card p-5 sm:p-6 mx-auto lg:mx-0 w-full max-w-[560px]">
            <div
              ref={gridRef}
              className="grid gap-px bg-[var(--border-strong)] rounded overflow-hidden select-none"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
              {puzzle.grid.map((row, r) =>
                row.map((cell, c) => {
                  if (cell.black) {
                    return <div key={`${r}-${c}`} className="aspect-square bg-[var(--bg-page)]" />
                  }
                  const active = sel && sel.r === r && sel.c === c
                  const inWord = isInWord(r, c)
                  const isWrong = wrong && wrong.has(`${r},${c}`)
                  const val = cells[r][c] || ''
                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => select(r, c)}
                      className={`relative aspect-square flex items-center justify-center cursor-pointer transition-colors duration-100
                        ${active
                          ? 'bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent-to)] text-white'
                          : inWord
                            ? 'bg-[var(--accent-solid)]/15 text-primary'
                            : isWrong
                              ? 'bg-red-500/15 text-red-500'
                              : 'bg-card text-primary'}`}
                    >
                      {cell.num > 0 && (
                        <span className="absolute top-0.5 left-1 text-[10px] font-semibold leading-none text-inherit opacity-70">
                          {cell.num}
                        </span>
                      )}
                      <span className={`font-bold uppercase ${active ? 'text-white' : ''} ${val ? '' : 'opacity-0'}`}>
                        {val || '·'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <button onClick={handleCheck} disabled={checking} className="btn-gradient !py-2 !px-4 text-sm">
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Check
              </button>
              <button onClick={handleReveal} className="inline-flex items-center gap-1.5 py-2 px-4 text-sm font-semibold rounded-lg bg-card border border-default text-secondary hover:text-primary hover:border-strong transition-all">
                <Eye className="w-4 h-4" /> Reveal
              </button>
              <button onClick={handleClear} className="inline-flex items-center gap-1.5 py-2 px-4 text-sm font-semibold rounded-lg bg-card border border-default text-secondary hover:text-primary hover:border-strong transition-all">
                <Eraser className="w-4 h-4" /> Clear
              </button>
              {solved && (
                <span className="inline-flex items-center gap-1.5 py-2 px-4 text-sm font-bold rounded-lg bg-emerald-500/10 text-emerald-500">
                  ✓ Solved!
                </span>
              )}
            </div>
            <p className="text-center text-xs text-tertiary mt-3">
              Type to fill · Arrow keys to move · Backspace to erase · Enter to flip direction
            </p>
          </div>

          {/* Clues */}
          <div className="space-y-5 w-full">
            <div className="glass-card p-5">
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Across</h2>
              <ol className="space-y-2">
                {puzzle.across.map(e => (
                  <li key={`a${e.num}`}>
                    <button
                      onClick={() => select(e.row, e.col, 'across')}
                      className="w-full text-left text-sm leading-snug text-primary hover:text-[var(--accent-solid)] transition-colors group"
                    >
                      <span className="font-bold text-[var(--accent-solid)] mr-2">{e.num}.</span>
                      <span className="text-secondary group-hover:text-[var(--accent-solid)]">{e.clue}</span>
                      <span className="text-tertiary text-xs ml-1">({e.len})</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <div className="glass-card p-5">
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Down</h2>
              <ol className="space-y-2">
                {puzzle.down.map(e => (
                  <li key={`d${e.num}`}>
                    <button
                      onClick={() => select(e.row, e.col, 'down')}
                      className="w-full text-left text-sm leading-snug text-primary hover:text-[var(--accent-solid)] transition-colors group"
                    >
                      <span className="font-bold text-[var(--accent-solid)] mr-2">{e.num}.</span>
                      <span className="text-secondary group-hover:text-[var(--accent-solid)]">{e.clue}</span>
                      <span className="text-tertiary text-xs ml-1">({e.len})</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-center gap-2 text-sm text-secondary">
          <span>Powered by <span className="text-primary font-medium">PaperLab</span> · a new puzzle from today's headlines every day</span>
        </div>
      </footer>
    </div>
  )
}
