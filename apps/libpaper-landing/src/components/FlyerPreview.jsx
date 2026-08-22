import React, { useRef, useState, useEffect } from 'react'
import { toPng } from 'html-to-image'

const LAYOUT_SIZES = {
  poster:  { width: 660, height: 858, aspect: '8.5×11' },
  modern:  { width: 660, height: 858, aspect: '8.5×11' },
  social:  { width: 660, height: 660, aspect: '1:1' },
  split:   { width: 660, height: 858, aspect: '8.5×11' },
  classic: { width: 660, height: 858, aspect: '8.5×11' },
  minimal: { width: 660, height: 858, aspect: '8.5×11' },
}

/* ---------- formatting ---------- */
function fmtDate(d) {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }
  catch { return d }
}
function fmtDay(d) {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) }
  catch { return d }
}
function fmtMonthDay(d) {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }
  catch { return d }
}
function fmtTime(t) {
  if (!t) return ''
  try {
    const [hh, mm] = t.split(':').map(Number)
    return new Date(2000, 0, 1, hh, mm).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch { return t }
}

/* ---------- color utilities ---------- */
function hexToRgb(hex) {
  hex = String(hex || '#6366f1').replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const n = parseInt(hex, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
function lum(hex) {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
function inkOn(hex) { return lum(hex) > 0.55 ? '#15151b' : '#f7f5f1' }
function darken(hex, amt = 0.2) {
  const [r, g, b] = hexToRgb(hex)
  const f = v => Math.max(0, Math.round(v * (1 - amt)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

/* ============================================================
   POSTER — editorial, dark, dramatic. A showcase layout.
   ============================================================ */
function PosterLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo }) {
  const dark = !!bgImage || lum(bg) < 0.5
  const ink = inkOn(bg)
  const muted = dark ? 'rgba(247,245,241,0.78)' : 'rgba(21,21,27,0.68)'
  const shadow = dark ? '0 2px 16px rgba(0,0,0,0.6)' : 'none'
  const info = [
    date && { k: 'DATE', v: fmtDate(date) },
    time && { k: 'TIME', v: fmtTime(time) },
    location && { k: 'LOCATION', v: location },
  ].filter(Boolean)

  return (
    <div className="flyer-surface flyer-poster" style={{ background: dark ? '#0e0e12' : bg }}>
      {bgImage && <img className="flyer-bg-img" src={bgImage} alt="" />}
      <div className="flyer-poster-shade" style={{ background: dark
        ? 'linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.74) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.86) 100%)' }} />
      <div className="flyer-poster-accent" style={{ background: rgba(accent, 0.92) }} />
      <div className="flyer-poster-ring" style={{ borderColor: rgba(accent, 0.4) }} />
      <div className="flyer-poster-ring flyer-poster-ring2" style={{ borderColor: rgba(accent, 0.18) }} />

      <div className="flyer-poster-mast">
        <span className="flyer-kicker" style={{ color: muted, textShadow: shadow }}>Presented by</span>
        {logo
          ? <img className="flyer-mast-logo" src={logo} alt="logo" />
          : <span className="flyer-mast-name" style={{ color: ink, textShadow: shadow }}>PaperLab</span>}
      </div>

      <div className="flyer-poster-content">
        <span className="flyer-tag" style={{ color: accent, textShadow: shadow }}>✦ Special Event</span>
        <h2 className="flyer-poster-title" style={{ color: ink, textShadow: shadow }}>{headline}</h2>
        <div className="flyer-poster-rule" style={{ background: rgba(accent, 0.85) }} />
        {body && <p className="flyer-poster-desc" style={{ color: muted, textShadow: shadow }}>{body}</p>}
      </div>

      <div className="flyer-poster-foot">
        {info.length > 0 && (
          <div className="flyer-info-card" style={{ borderColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)', '--fd': dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' }}>
            {info.map(it => (
              <div className="flyer-info-block" key={it.k}>
                <span className="flyer-info-k" style={{ color: accent }}>{it.k}</span>
                <span className="flyer-info-v" style={{ color: ink }}>{it.v}</span>
              </div>
            ))}
          </div>
        )}
        {cta && <div className="flyer-cta-btn" style={{ background: accent, color: inkOn(accent) }}>{cta} →</div>}
      </div>
    </div>
  )
}

/* ============================================================
   MODERN — Swiss grid, grotesque, confident.
   ============================================================ */
function ModernLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo }) {
  const ink = inkOn(bg)
  const muted = lum(bg) > 0.55 ? 'rgba(21,21,27,0.62)' : 'rgba(247,245,241,0.72)'
  const hasBody = !!body
  const info = [
    date && { k: 'Date', v: fmtMonthDay(date) },
    time && { k: 'Time', v: fmtTime(time) },
    location && { k: 'Where', v: location },
  ].filter(Boolean)

  return (
    <div className="flyer-surface flyer-modern" style={{ background: bgImage ? undefined : bg }}>
      {bgImage && <img className="flyer-bg-img" src={bgImage} alt="" />}
      {!bgImage && <div className="flyer-modern-halo" style={{ background: `radial-gradient(circle at 100% 0%, ${rgba(accent,0.32)}, transparent 62%)` }} />}
      <div className="flyer-modern-disc" style={{ background: accent, borderColor: rgba(accent, 0.4) }} />

      <div className="flyer-modern-head">
        <span className="flyer-kicker" style={{ color: accent }}>Special event</span>
        {logo && <img className="flyer-mast-logo flyer-mast-logo-right" src={logo} alt="logo" />}
      </div>

      <div className="flyer-modern-body" style={{ color: ink }}>
        <h2 className="flyer-modern-title" style={{ color: ink }}>{headline}</h2>
        {hasBody && <p className="flyer-modern-desc" style={{ color: muted }}>{body}</p>}
      </div>

      <div className="flyer-modern-foot" style={{ '--fd': muted }}>
        {info.length > 0 && (
          <div className="flyer-modern-info">
            {info.map(it => (
              <div className="flyer-modern-info-item" key={it.k}>
                <span className="flyer-modern-info-k" style={{ color: accent }}>{it.k}</span>
                <span className="flyer-modern-info-v" style={{ color: ink }}>{it.v}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flyer-modern-cta-row">
          <div className="flyer-cta-btn flyer-cta-btn-modern" style={{ background: accent, color: inkOn(accent) }}>{cta || 'Register now'}</div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   SOCIAL — 1:1, image-first, Instagram quality.
   ============================================================ */
function SocialLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo }) {
  const hasImage = !!bgImage
  const dark = !hasImage && lum(bg) < 0.55
  const ink = inkOn(bg)
  const kickColor = hasImage ? '#ffffff' : accent
  const titleColor = hasImage ? '#ffffff' : ink
  const muted = hasImage ? 'rgba(255,255,255,0.82)' : (dark ? 'rgba(247,245,241,0.76)' : 'rgba(21,21,27,0.68)')
  const line = [fmtMonthDay(date), time && fmtTime(time)].filter(Boolean).join(' · ')
  return (
    <div className="flyer-surface flyer-social" style={{ background: hasImage ? '#000' : bg }}>
      {bgImage ? (
        <>
          <img className="flyer-bg-img" src={bgImage} alt="" />
          <div className="flyer-social-shade" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.72) 100%)' }} />
        </>
      ) : (
        <div className="flyer-social-shade" style={{ background: `radial-gradient(circle at 50% 26%, ${rgba(accent,0.5)}, ${rgba(bg,1)} 72%)` }} />
      )}
      {logo && <img className="flyer-social-logo" src={logo} alt="logo" />}
      <div className="flyer-social-content">
        <span className="flyer-social-kicker" style={{ color: kickColor }}>Coming soon</span>
        <h2 className="flyer-social-title" style={{ color: titleColor }}>{headline}</h2>
        {body && <p className="flyer-social-desc" style={{ color: muted }}>{body}</p>}
        {line && <div className="flyer-social-line" style={{ color: muted }}>{line}{location ? ` · ${location}` : ''}</div>}
        {cta && <div className="flyer-cta-btn flyer-cta-btn-social" style={{ background: hasImage ? '#ffffff' : accent, color: hasImage ? '#0c0c0e' : inkOn(accent) }}>{cta}</div>}
      </div>
    </div>
  )
}

/* ============================================================
   SPLIT — half image / half solid, bold two-tone.
   ============================================================ */
function SplitLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo }) {
  const ink = inkOn(bg)
  const muted = lum(bg) > 0.55 ? 'rgba(21,21,27,0.62)' : 'rgba(247,245,241,0.72)'
  const info = [
    date && { k: 'Date', v: fmtDate(date) },
    time && { k: 'Time', v: fmtTime(time) },
    location && { k: 'Where', v: location },
  ].filter(Boolean)
  const overline = lum(bg) > 0.55 ? inkOn(accent) : ink
  const olineColor = lum(bg) > 0.55 ? accent : ink

  return (
    <div className="flyer-surface flyer-split">
      <div className="flyer-split-visual" style={{ background: bgImage ? undefined : `linear-gradient(150deg, ${accent}, ${rgba(accent, 0.55)})` }}>
        {bgImage && <img className="flyer-bg-img" src={bgImage} alt="" />}
        <div className="flyer-split-ring" style={{ borderColor: 'rgba(255,255,255,0.28)' }} />
        {!bgImage && <div className="flyer-split-disc" style={{ background: rgba(255, 255, 255, 0.12) }} />}
      </div>
      <div className="flyer-split-text" style={{ background: bg, '--fd': lum(bg) > 0.55 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)' }}>
        <span className="flyer-kicker" style={{ color: olineColor }}>Special event</span>
        <h2 className="flyer-split-title" style={{ color: ink }}>{headline}</h2>
        {body && <p className="flyer-split-desc" style={{ color: muted }}>{body}</p>}
        {info.length > 0 && (
          <div className="flyer-split-info">
            {info.map(it => (
              <div className="flyer-split-info-row" key={it.k}>
                <span className="flyer-split-info-k" style={{ color: olineColor }}>{it.k}</span>
                <span className="flyer-split-info-v" style={{ color: ink }}>{it.v}</span>
              </div>
            ))}
          </div>
        )}
        {cta && <div className="flyer-cta-btn" style={{ background: accent, color: inkOn(accent) }}>{cta} →</div>}
        {logo && <img className="flyer-split-foot-logo" src={logo} alt="logo" />}
      </div>
    </div>
  )
}

/* ============================================================
   CLASSIC — invitation, cream paper, refined serif.
   ============================================================ */
function ClassicLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo }) {
  const ink = '#241f1a'
  const muted = 'rgba(36,31,26,0.66)'
  const info = [
    date && { k: 'Date', v: fmtDate(date) },
    time && { k: 'Time', v: fmtTime(time) },
    location && { k: 'Location', v: location },
  ].filter(Boolean)
  return (
    <div className="flyer-surface flyer-classic" style={{ background: bg || '#f6f1e7' }}>
      {bgImage && <img className="flyer-bg-img" src={bgImage} alt="" />}
      <div className="flyer-classic-frame" style={{ borderColor: rgba(accent, 0.55) }} />
      <div className="flyer-classic-frame flyer-classic-frame-inner" style={{ borderColor: rgba(accent, 0.3) }} />
      <div className="flyer-classic-mono" style={{ color: rgba(accent, 0.85) }}>✦</div>
      <div className="flyer-classic-mono flyer-classic-mono-br" style={{ color: rgba(accent, 0.85) }}>✦</div>

      <div className="flyer-classic-content">
        <span className="flyer-classic-kicker" style={{ color: darken(accent, 0.3) }}>You're invited</span>
        <h2 className="flyer-classic-title" style={{ color: ink }}>{headline}</h2>
        <div className="flyer-classic-divider">
          <span className="flyer-classic-rule" style={{ background: rgba(accent, 0.5) }} />
          <span className="flyer-classic-diamond" style={{ background: accent }} />
          <span className="flyer-classic-rule" style={{ background: rgba(accent, 0.5) }} />
        </div>
        {body && <p className="flyer-classic-desc" style={{ color: muted }}>{body}</p>}
        {info.length > 0 && (
          <div className="flyer-classic-info">
            {info.map(it => (
              <div className="flyer-classic-info-row" key={it.k}>
                <span className="flyer-classic-info-k" style={{ color: darken(accent, 0.28) }}>{it.k}</span>
                <span className="flyer-classic-info-v" style={{ color: ink }}>{it.v}</span>
              </div>
            ))}
          </div>
        )}
        {cta && <div className="flyer-cta-btn flyer-cta-btn-classic" style={{ borderColor: darken(accent, 0.15), color: darken(accent, 0.2) }}>{cta}</div>}
        {logo && <img className="flyer-classic-logo" src={logo} alt="logo" />}
      </div>
    </div>
  )
}

/* ============================================================
   MINIMAL — Swiss restraint, hairline grid, one statement.
   ============================================================ */
function MinimalLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo }) {
  const ink = inkOn(bg)
  const muted = lum(bg) > 0.55 ? 'rgba(21,21,27,0.58)' : 'rgba(247,245,241,0.66)'
  const infoLine = [date && fmtMonthDay(date), time && fmtTime(time), location].filter(Boolean).join('  ·  ')
  const infoColor = lum(bg) > 0.55 ? 'rgba(21,21,27,0.72)' : 'rgba(247,245,241,0.8)'
  return (
    <div className="flyer-surface flyer-minimal" style={{ background: bgImage ? undefined : bg }}>
      {bgImage && <img className="flyer-bg-img" src={bgImage} alt="" />}
      {!bgImage && <div className="flyer-minimal-glow" style={{ background: `radial-gradient(circle at 0% 0%, ${rgba(accent, 0.18)}, transparent 55%)` }} />}
      <div className="flyer-minimal-rule" style={{ background: rgba(accent, 0.5) }} />
      <div className="flyer-minimal-corner" style={{ background: accent }} />

      <div className="flyer-minimal-head">
        <span className="flyer-kicker" style={{ color: accent }}>Special event</span>
        {logo && <img className="flyer-mast-logo flyer-mast-logo-right" src={logo} alt="logo" />}
      </div>

      <div className="flyer-minimal-mid">
        <h2 className="flyer-minimal-title" style={{ color: ink }}>{headline}</h2>
        {body && <p className="flyer-minimal-desc" style={{ color: muted }}>{body}</p>}
      </div>

      <div className="flyer-minimal-foot">
        {infoLine && <div className="flyer-minimal-info" style={{ color: infoColor }}>{infoLine}</div>}
        {cta && <div className="flyer-minimal-cta" style={{ color: accent }}>{cta} <span className="flyer-minimal-arrow" style={{ color: accent }}>→</span></div>}
      </div>
    </div>
  )
}

const LAYOUT_MAP = {
  poster: PosterLayout,
  modern: ModernLayout,
  social: SocialLayout,
  split: SplitLayout,
  classic: ClassicLayout,
  minimal: MinimalLayout,
}

export async function exportToPng(ref, filename = 'flyer.png') {
  if (!ref?.current) return
  const url = await toPng(ref.current, { pixelRatio: 2, cacheBust: true })
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

export async function exportToPdf(ref, filename = 'flyer.pdf') {
  if (!ref?.current) return
  const url = await toPng(ref.current, { pixelRatio: 3, cacheBust: true })
  const w = window.open('about:blank')
  w.document.write('<html><head><title>Flyer</title></head><body style="margin:0;display:flex;justify-content:center;"><img src="' + url + '" style="max-width:100%;max-height:100vh;"/></body></html>')
  w.document.close()
  w.print()
}

export default function FlyerPreview({ headline, body, cta, date, time, location, accent, bg, bgImage, logo, layout }) {
  const ref = useRef()
  const wrapRef = useRef()
  const [scale, setScale] = useState(1)
  const size = LAYOUT_SIZES[layout] || LAYOUT_SIZES.poster
  const Renderer = LAYOUT_MAP[layout] || PosterLayout

  // Scale the fixed-pixel flyer down to fit the preview panel (so a
  // full 8.5×11 poster isn't clipped in the editor). Export captures the
  // unscaled .flyer-root, so PNG/PDF stay full resolution.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const compute = () => {
      const avail = el.clientWidth || size.width
      const s = Math.min(1, avail / size.width)
      setScale(s < 0.45 ? 0.45 : s)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [size.width])

  return (
    <div ref={wrapRef} className="flyer-container" style={{ width: '100%' }}>
      <div className="flyer-scaler-wrap" style={{ width: size.width * scale, height: size.height * scale }}>
        <div className="flyer-scaler" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <div ref={ref} className="flyer-root" style={{ width: size.width, height: size.height }}>
            <Renderer
              headline={headline || 'Event Title'}
              body={body || ''}
              cta={cta || ''}
              date={date}
              time={time}
              location={location}
              accent={accent || '#6366f1'}
              bg={bg || '#f5f5f7'}
              bgImage={bgImage}
              logo={logo}
              size={size}
            />
          </div>
        </div>
      </div>
      <div className="flyer-actions">
        <button className="btn-pdf" onClick={() => exportToPdf(ref)}>📄 PDF</button>
        <button className="btn-png" onClick={() => exportToPng(ref)}>🖼 PNG</button>
        <span className="flyer-size-label">{size.aspect} · {size.width}×{size.height}px</span>
      </div>
    </div>
  )
}
