import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, RefreshCw, Check, Eye, Eraser } from 'lucide-react'

const API = '/crossword-api'

// ─── PaperLab static-site aesthetic: silver-on-black, shimmer, grain ───
const SILVER = {
  bg: '#09090b',
  text: '#d4d4d8',
  dim: '#71717a',
  faint: '#3f3f46',
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
    document.title = 'PaperLab — Daily Crossword'
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
    } else if (key === 'Enter' || key === ' ' || key === 'Tab') {
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
      <div className="cw-page">
        <div className="cw-stage">
          <div className="cw-loading">
            <Loader2 className="cw-spin" size={18} />
            <span>Folding today's headlines into a grid…</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="cw-page">
        <div className="cw-stage">
          <div className="cw-card cw-error-card">
            <p className="cw-eyebrow">Signal lost</p>
            <p className="cw-error-text">The crossword engine couldn't build today's puzzle: {error}</p>
            <button className="cw-btn" onClick={() => window.location.reload()}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const size = puzzle.size

  return (
    <div className="cw-page">
      {/* ambient layers */}
      <div className="cw-grain" />
      <div className="cw-orb cw-orb-1" />
      <div className="cw-orb cw-orb-2" />
      <div className="cw-orb cw-orb-3" />

      {/* Nav — matches paperlab.xyz */}
      <nav className="cw-nav">
        <a href="https://paperlab.xyz/" className="cw-logo">Paper<span>Lab</span></a>
        <ul className="cw-nav-links">
          <li><a href="https://paperlab.xyz/archive.html">Archive</a></li>
          <li><a href="https://paperlab.xyz/research.html">Research</a></li>
          <li><a href="https://paperlab.xyz/signal.html">Signal</a></li>
          <li><a href="https://paperlab.xyz/contact.html">Contact</a></li>
        </ul>
      </nav>

      <main className="cw-main">
        {/* Hero */}
        <header className="cw-hero">
          <p className="cw-eyebrow">Established in the quiet between signals</p>
          <h1 className="cw-title">
            <span className="cw-line"><span className="cw-line-inner cw-shimmer">Daily</span></span>
            <span className="cw-line"><span className="cw-line-inner cw-shimmer">Crossword</span></span>
          </h1>
          <p className="cw-sub">
            Answers pulled from today's headlines, clues written by AI.
            {puzzle.date && <span className="cw-date"> · {puzzle.date}</span>}
          </p>
          <button className="cw-briefing-toggle" onClick={() => setShowBriefing(v => !v)}>
            {showBriefing ? 'Hide' : 'Read'} today's transmission
          </button>
        </header>

        {showBriefing && puzzle.briefing && (
          <div className="cw-card cw-briefing">
            <p className="cw-eyebrow">Transmission Log</p>
            <div className="cw-briefing-text">{puzzle.briefing}</div>
            <p className="cw-sources">Sources: {puzzle.sources.join(', ')}</p>
          </div>
        )}

        {/* Grid + Clues */}
        <div className="cw-layout">
          {/* Grid */}
          <div className="cw-card cw-grid-card">
            <div
              ref={gridRef}
              className="cw-grid"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
              {puzzle.grid.map((row, r) =>
                row.map((cell, c) => {
                  if (cell.black) {
                    return <div key={`${r}-${c}`} className="cw-cell cw-cell-black" />
                  }
                  const active = sel && sel.r === r && sel.c === c
                  const inWord = isInWord(r, c)
                  const isWrong = wrong && wrong.has(`${r},${c}`)
                  const val = cells[r][c] || ''
                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => select(r, c)}
                      className={`cw-cell ${active ? 'cw-cell-active' : inWord ? 'cw-cell-word' : isWrong ? 'cw-cell-wrong' : ''}`}
                    >
                      {cell.num > 0 && <span className="cw-cell-num">{cell.num}</span>}
                      <span className={`cw-cell-letter ${val ? '' : 'cw-cell-empty'}`}>{val || '·'}</span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Controls */}
            <div className="cw-controls">
              <button onClick={handleCheck} disabled={checking} className="cw-btn cw-btn-primary">
                {checking ? <Loader2 className="cw-spin" size={14} /> : <Check size={14} />}
                Check
              </button>
              <button onClick={handleReveal} className="cw-btn"><Eye size={14} /> Reveal</button>
              <button onClick={handleClear} className="cw-btn"><Eraser size={14} /> Clear</button>
              {solved && <span className="cw-solved">✓ Solved</span>}
            </div>
            <p className="cw-hint">Type to fill · Arrows to move · Backspace to erase · Enter to flip direction</p>
          </div>

          {/* Clues */}
          <div className="cw-clues">
            <div className="cw-card">
              <h2 className="cw-eyebrow">Across</h2>
              <ol className="cw-clue-list">
                {puzzle.across.map(e => (
                  <li key={`a${e.num}`}>
                    <button onClick={() => select(e.row, e.col, 'across')} className="cw-clue">
                      <span className="cw-clue-num">{e.num}.</span>
                      <span className="cw-clue-text">{e.clue} <span className="cw-clue-len">({e.len})</span></span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <div className="cw-card">
              <h2 className="cw-eyebrow">Down</h2>
              <ol className="cw-clue-list">
                {puzzle.down.map(e => (
                  <li key={`d${e.num}`}>
                    <button onClick={() => select(e.row, e.col, 'down')} className="cw-clue">
                      <span className="cw-clue-num">{e.num}.</span>
                      <span className="cw-clue-text">{e.clue} <span className="cw-clue-len">({e.len})</span></span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* Footer — matches paperlab.xyz */}
      <footer className="cw-footer">
        <span>© PaperLab — All signals reserved</span>
        <div className="cw-footer-mark">PL</div>
        <span>Something is always folding</span>
      </footer>

      <style>{`
        .cw-page {
          --silver-50:#fafafa; --silver-100:#f4f4f5; --silver-200:#e4e4e7;
          --silver-300:#d4d4d8; --silver-400:#a1a1aa; --silver-500:#71717a;
          --silver-600:#52525b; --silver-700:#3f3f46; --silver-800:#27272a;
          --silver-900:#18181b; --silver-950:#09090b; --accent:#8b8fa3;
          min-height: 100vh;
          background: var(--silver-950);
          color: var(--silver-300);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          position: relative;
          overflow-x: hidden;
        }
        /* grain */
        .cw-grain {
          position: fixed; top:-50%; left:-50%; width:200%; height:200%;
          z-index:0; pointer-events:none; opacity:0.025;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          animation: cwGrain 0.5s steps(1) infinite;
        }
        @keyframes cwGrain {
          0%{transform:translate(0,0)} 25%{transform:translate(-5%,-5%)}
          50%{transform:translate(5%,0)} 75%{transform:translate(0,5%)}
          100%{transform:translate(-5%,5%)}
        }
        /* orbs */
        .cw-orb { position:fixed; border-radius:50%; filter:blur(80px); pointer-events:none; z-index:0; animation:cwOrb 20s ease-in-out infinite; }
        .cw-orb-1 { width:400px;height:400px;background:radial-gradient(circle,rgba(180,185,200,0.07) 0%,transparent 70%);top:10%;left:20%; }
        .cw-orb-2 { width:300px;height:300px;background:radial-gradient(circle,rgba(160,165,180,0.05) 0%,transparent 70%);top:60%;right:15%;animation-delay:-7s; }
        .cw-orb-3 { width:500px;height:500px;background:radial-gradient(circle,rgba(200,205,215,0.04) 0%,transparent 70%);bottom:-10%;left:-5%;animation-delay:-14s; }
        @keyframes cwOrb {
          0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(30px,-40px) scale(1.05)}
          50%{transform:translate(-20px,20px) scale(0.95)} 75%{transform:translate(40px,30px) scale(1.02)}
        }
        /* layout */
        .cw-stage { position:relative; z-index:2; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:48px; }
        .cw-main { position:relative; z-index:2; max-width:1120px; margin:0 auto; padding:140px 48px 80px; }
        /* nav */
        .cw-nav {
          position:fixed; top:0; left:0; right:0; z-index:100;
          padding:24px 48px; display:flex; justify-content:space-between; align-items:center;
          backdrop-filter:blur(20px); background:rgba(9,9,11,0.3); border-bottom:1px solid rgba(255,255,255,0.03);
        }
        .cw-logo { font-size:14px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:var(--silver-200); text-decoration:none; }
        .cw-logo span { color:var(--silver-500); }
        .cw-nav-links { display:flex; gap:40px; list-style:none; margin:0; padding:0; }
        .cw-nav-links a {
          font-size:11px; font-weight:500; letter-spacing:0.15em; text-transform:uppercase;
          color:var(--silver-500); text-decoration:none; transition:color 0.3s ease; position:relative;
        }
        .cw-nav-links a::after {
          content:''; position:absolute; bottom:-4px; left:0; width:0; height:1px;
          background:linear-gradient(90deg,transparent,var(--silver-300),transparent); transition:width 0.4s ease;
        }
        .cw-nav-links a:hover { color:var(--silver-200); }
        .cw-nav-links a:hover::after { width:100%; }
        /* hero */
        .cw-hero { text-align:center; margin-bottom:64px; }
        .cw-eyebrow {
          font-size:10px; font-weight:600; letter-spacing:0.3em; text-transform:uppercase;
          color:var(--silver-500); margin:0 0 8px;
        }
        .cw-title { font-size:clamp(36px,7vw,72px); font-weight:300; line-height:1.0; letter-spacing:-0.03em; color:var(--silver-100); margin:32px 0 24px; }
        .cw-line { display:block; overflow:hidden; }
        .cw-line-inner { display:block; transform:translateY(110%); animation:cwReveal 1s cubic-bezier(0.22,1,0.36,1) forwards; }
        .cw-line:nth-child(2) .cw-line-inner { animation-delay:0.15s; }
        @keyframes cwReveal { to { transform:translateY(0); } }
        .cw-shimmer {
          background:linear-gradient(105deg,var(--silver-300) 0%,var(--silver-100) 20%,#ffffff 40%,var(--silver-200) 60%,var(--silver-400) 80%,var(--silver-300) 100%);
          background-size:200% 100%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          animation:cwShimmer 6s ease-in-out infinite;
        }
        @keyframes cwShimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .cw-sub { font-size:14px; color:var(--silver-500); max-width:520px; margin:0 auto; line-height:1.8; }
        .cw-date { color:var(--silver-600); }
        .cw-briefing-toggle {
          margin-top:28px; background:none; border:1px solid rgba(255,255,255,0.08); color:var(--silver-400);
          font-family:inherit; font-size:10px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase;
          padding:10px 20px; border-radius:999px; cursor:pointer; transition:all 0.3s ease;
        }
        .cw-briefing-toggle:hover { color:var(--silver-200); border-color:rgba(255,255,255,0.2); }
        /* cards */
        .cw-card {
          background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06);
          border-radius:16px; padding:32px; position:relative; overflow:hidden;
        }
        .cw-card::before {
          content:''; position:absolute; inset:0; opacity:0;
          background:radial-gradient(600px circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,0.04),transparent 40%);
          transition:opacity 0.4s ease; pointer-events:none;
        }
        .cw-card:hover::before { opacity:1; }
        .cw-briefing { max-width:720px; margin:0 auto 48px; }
        .cw-briefing-text { font-size:14px; line-height:1.9; color:var(--silver-400); white-space:pre-line; }
        .cw-sources { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:var(--silver-700); margin:20px 0 0; }
        /* layout */
        .cw-layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:40px; align-items:start; }
        @media (max-width: 900px) { .cw-layout { grid-template-columns:1fr; } .cw-main { padding:120px 20px 60px; } .cw-nav { padding:20px 24px; } .cw-nav-links { gap:20px; } }
        /* grid */
        .cw-grid-card { padding:24px; }
        .cw-grid { display:grid; gap:2px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden; user-select:none; }
        .cw-cell {
          position:relative; aspect-ratio:1; display:flex; align-items:center; justify-content:center;
          background:var(--silver-100); cursor:pointer; transition:background 0.15s ease;
        }
        .cw-cell-black { background:var(--silver-950); cursor:default; }
        .cw-cell-word { background:rgba(212,212,216,0.55); }
        .cw-cell-active { background:var(--silver-300); }
        .cw-cell-wrong { background:#7f2a2a; }
        .cw-cell-num {
          position:absolute; top:2px; left:4px; font-size:9px; font-weight:600;
          color:var(--silver-600); line-height:1;
        }
        .cw-cell-letter { font-size:clamp(14px, 2.2vw, 22px); font-weight:700; color:var(--silver-950); line-height:1; }
        .cw-cell-empty { opacity:0; }
        /* controls */
        .cw-controls { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:12px; margin-top:24px; }
        .cw-btn {
          display:inline-flex; align-items:center; gap:7px;
          background:none; border:1px solid rgba(255,255,255,0.1); color:var(--silver-400);
          font-family:inherit; font-size:11px; font-weight:600; letter-spacing:0.15em; text-transform:uppercase;
          padding:9px 18px; border-radius:8px; cursor:pointer; transition:all 0.25s ease;
        }
        .cw-btn:hover { color:var(--silver-100); border-color:rgba(255,255,255,0.25); }
        .cw-btn-primary { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.14); color:var(--silver-200); }
        .cw-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .cw-solved { font-size:11px; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:#7fd1a0; }
        .cw-hint { text-align:center; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--silver-700); margin:16px 0 0; }
        /* clues */
        .cw-clues { display:flex; flex-direction:column; gap:24px; }
        .cw-clue-list { list-style:none; margin:16px 0 0; padding:0; display:flex; flex-direction:column; gap:10px; max-height:340px; overflow-y:auto; }
        .cw-clue {
          display:flex; gap:10px; width:100%; text-align:left; background:none; border:none; padding:0;
          cursor:pointer; font-family:inherit;
        }
        .cw-clue-num { font-size:13px; font-weight:600; color:var(--silver-300); min-width:24px; }
        .cw-clue-text { font-size:13px; line-height:1.6; color:var(--silver-300); transition:color 0.2s ease; }
        .cw-clue:hover .cw-clue-text { color:var(--silver-100); }
        .cw-clue-len { color:var(--silver-600); font-size:11px; }
        /* footer */
        .cw-footer {
          position:relative; z-index:2; padding:48px; border-top:1px solid rgba(255,255,255,0.03);
          display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;
        }
        .cw-footer span { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:var(--silver-700); }
        .cw-footer-mark {
          width:24px; height:24px; border:1px solid rgba(255,255,255,0.06); border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:8px; color:var(--silver-600); font-weight:600;
        }
        /* loading / error */
        .cw-loading { display:flex; flex-direction:column; align-items:center; gap:16px; color:var(--silver-500); font-size:11px; letter-spacing:0.2em; text-transform:uppercase; }
        .cw-spin { animation:cwSpin 1s linear infinite; }
        @keyframes cwSpin { to { transform:rotate(360deg); } }
        .cw-error-card { max-width:480px; text-align:center; }
        .cw-error-text { font-size:13px; line-height:1.8; color:var(--silver-500); margin:16px 0 24px; }
      `}</style>
    </div>
  )
}
