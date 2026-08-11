import React, { useRef } from 'react'
import { toPng } from 'html-to-image'

const LAYOUT_SIZES = {
  poster: { width: 660, height: 858, aspect: '8.5x11' },
  modern: { width: 660, height: 858, aspect: '8.5x11' },
  social: { width: 660, height: 660, aspect: '1:1' },
  split: { width: 660, height: 858, aspect: '8.5x11' },
  classic: { width: 660, height: 858, aspect: '8.5x11' },
  minimal: { width: 660, height: 858, aspect: '8.5x11' },
}

function formatDate(d) {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }
  catch { return d }
}
function formatTime(t) {
  if (!t) return ''
  try {
    const [h, m] = t.split(':').map(Number)
    return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch { return t }
}

/* ---------- Layout-specific renderers ---------- */

function PosterLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo, size }) {
  return (
    <div className="flyer-surface" style={{ background: bg }}>
      {bgImage && <img className="flyer-bg-img" src={bgImage} alt="" />}
      {/* Top accent bar */}
      <div className="flyer-accent-bar" style={{ background: accent }} />

      <div className="flyer-panel">
        <h2 className="flyer-headline">{headline}</h2>
        {body && <p className="flyer-body">{body}</p>}
        {(date || time || location) && (
          <div className="flyer-info">
            {date && <span className="flyer-info-item">📅 {formatDate(date)}</span>}
            {time && <span className="flyer-info-item">🕐 {formatTime(time)}</span>}
            {location && <span className="flyer-info-item">📍 {location}</span>}
          </div>
        )}
        {cta && (
          <div className="flyer-cta" style={{ background: accent }}>{cta}</div>
        )}
        {logo && <img className="flyer-logo" src={logo} alt="logo" />}
      </div>
    </div>
  )
}

function ModernLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo, size }) {
  return (
    <div className="flyer-surface" style={{ background: bg }}>
      {bgImage && <img className="flyer-bg-img" src={bgImage} alt="" />}
      {/* Left vertical accent bar */}
      <div className="flyer-side-bar" style={{ background: accent }} />

      <div className="flyer-panel flyer-panel-left">
        <span className="flyer-label" style={{ color: accent }}>UPCOMING EVENT</span>
        <h2 className="flyer-headline flyer-headline-lg">{headline}</h2>
        {body && <p className="flyer-body">{body}</p>}
        <div className="flyer-info-stack">
          {date && <div className="flyer-info-row"><span className="flyer-info-label">DATE</span><span>{formatDate(date)}</span></div>}
          {time && <div className="flyer-info-row"><span className="flyer-info-label">TIME</span><span>{formatTime(time)}</span></div>}
          {location && <div className="flyer-info-row"><span className="flyer-info-label">LOCATION</span><span>{location}</span></div>}
        </div>
        {cta && (
          <div className="flyer-cta flyer-cta-sm" style={{ background: accent }}>{cta}</div>
        )}
        {logo && <img className="flyer-logo" src={logo} alt="logo" />}
      </div>
    </div>
  )
}

function SocialLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo }) {
  return (
    <div className="flyer-surface" style={{ background: bg }}>
      {bgImage && <img className="flyer-bg-img" src={bgImage} alt="" />}
      <div className="flyer-panel flyer-panel-center">
        <h2 className="flyer-headline flyer-headline-sm">{headline}</h2>
        {body && <p className="flyer-body">{body}</p>}
        {(date || time || location) && (
          <div className="flyer-info">
            {date && <span>{formatDate(date)}</span>}
            {time && <span>{formatTime(time)}</span>}
            {location && <span>{location}</span>}
          </div>
        )}
        {cta && (
          <div className="flyer-cta flyer-cta-outline" style={{ borderColor: accent, color: accent }}>{cta}</div>
        )}
        {logo && <img className="flyer-logo" src={logo} alt="logo" />}
      </div>
    </div>
  )
}

function SplitLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo }) {
  const infoItems = [date && formatDate(date), time && formatTime(time), location].filter(Boolean)
  return (
    <div className="flyer-surface flyer-split" style={{ background: bg }}>
      {/* Left half: image only */}
      <div className="flyer-split-image">
        {bgImage ? (
          <img src={bgImage} alt="" className="flyer-split-img" />
        ) : (
          <div className="flyer-split-fallback" style={{ background: `linear-gradient(135deg, ${accent}, ${bg})` }} />
        )}
      </div>
      {/* Right half: text */}
      <div className="flyer-split-text">
        <h2 className="flyer-headline flyer-headline-sm">{headline}</h2>
        {body && <p className="flyer-body">{body}</p>}
        {infoItems.length > 0 && (
          <div className="flyer-info">
            {infoItems.map((t, i) => <span key={i}>{t}</span>)}
          </div>
        )}
        {cta && (
          <div className="flyer-cta" style={{ background: accent }}>{cta}</div>
        )}
        {logo && <img className="flyer-logo" src={logo} alt="logo" />}
      </div>
    </div>
  )
}

function ClassicLayout({ headline, body, cta, date, time, location, accent, bg, bgImage, logo }) {
  const infoItems = [date && formatDate(date), time && formatTime(time), location].filter(Boolean)
  return (
    <div className="flyer-surface" style={{ background: bg }}>
      {bgImage && <img className="flyer-bg-img" src={bgImage} alt="" />}
      {/* Ornamental lines */}
      <div className="flyer-line" style={{ borderTop: `2px solid ${accent}` }} />
      <div className="flyer-line fly-line-bottom" style={{ borderTop: `2px solid ${accent}` }} />

      <div className="flyer-panel flyer-panel-cream">
        <h2 className="flyer-headline flyer-classic">{headline}</h2>
        {body && <p className="flyer-body">{body}</p>}
        {infoItems.length > 0 && (
          <div className="flyer-info">
            {infoItems.map((t, i) => <span key={i}>{t}</span>)}
          </div>
        )}
        {cta && <div className="flyer-cta" style={{ background: accent }}>{cta}</div>}
        {logo && <img className="flyer-logo" src={logo} alt="logo" />}
      </div>
    </div>
  )
}

function MinimalLayout({ headline, body, cta, date, time, location, accent, bg }) {
  const infoItems = [date && formatDate(date), time && formatTime(time), location].filter(Boolean)
  return (
    <div className="flyer-surface" style={{ background: bg }}>
      <div className="flyer-accent-bar flyer-accent-bar-thin" style={{ background: accent }} />
      <div className="flyer-panel flyer-panel-nobg">
        <h2 className="flyer-headline flyer-headline-xl" style={{ color: accent }}>{headline}</h2>
        {body && <p className="flyer-body">{body}</p>}
        {infoItems.length > 0 && (
          <div className="flyer-info">
            {infoItems.map((t, i) => <span key={i}>{t}</span>)}
          </div>
        )}
        {cta && <div className="flyer-cta" style={{ background: accent }}>{cta}</div>}
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

/* ---------- Export helpers ---------- */

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
  // Open in new tab for print-as-PDF
  const w = window.open('about:blank')
  w.document.write('<html><head><title>Flyer</title></head><body style="margin:0;display:flex;justify-content:center;"><img src="' + url + '" style="max-width:100%;max-height:100vh;"/></body></html>')
  w.document.close()
  w.print()
}

/* ---------- Main component ---------- */

export default function FlyerPreview({ headline, body, cta, date, time, location, accent, bg, bgImage, logo, layout }) {
  const ref = useRef()
  const size = LAYOUT_SIZES[layout] || LAYOUT_SIZES.poster
  const Renderer = LAYOUT_MAP[layout] || PosterLayout

  return (
    <div className="flyer-container" style={{ width: size.width }}>
      <div
        ref={ref}
        className="flyer-root"
        style={{ width: size.width, height: size.height }}
      >
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
      <div className="flyer-actions">
        <button className="btn-pdf" onClick={() => exportToPdf(ref)}>
          📄 PDF
        </button>
        <button className="btn-png" onClick={() => exportToPng(ref)}>
          🖼 PNG
        </button>
        <span className="flyer-size-label">{size.aspect} · {size.width}×{size.height}px</span>
      </div>
    </div>
  )
}
