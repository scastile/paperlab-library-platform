import { Pin, PinOff, RefreshCw } from 'lucide-react'

const TYPE_LABELS = {
  display: { label: 'Display Theme', tintClass: 'tint-indigo' },
  shelf_talker: { label: 'Shelf Talker', tintClass: 'tint-emerald' },
  escape_room: { label: 'Escape Room', tintClass: 'tint-rose' },
  social_media: { label: 'Social Media', tintClass: 'tint-violet' },
  signage: { label: 'Signage / Flyer', tintClass: 'tint-amber' },
  program: { label: 'Program Idea', tintClass: 'tint-sky' },
}

export default function PromotionCard({ card, isRerolling, onPin, onReroll, onReadMore }) {
  const typeInfo = TYPE_LABELS[card.card_type] || { label: card.card_type, tintClass: 'tint-indigo' }
  const content = card.content || {}

  if (isRerolling) {
    return (
      <div className="skeleton h-52" />
    )
  }

  return (
    <div className={`card-lift overflow-hidden ${card.pinned ? 'ring-2 ring-[var(--accent-solid)]/30' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <span className={`text-[0.6875rem] font-semibold px-2.5 py-1 rounded-full ${typeInfo.tintClass}`}>
          {typeInfo.label}
        </span>
        <div className="flex gap-1">
          <button
            onClick={onPin}
            aria-label={card.pinned ? 'Unpin card' : 'Pin card'}
            className={`p-1.5 rounded-lg transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] ${card.pinned ? 'accent-solid bg-[var(--tint-indigo)]' : 'text-tertiary hover:text-primary hover:bg-hover'}`}
          >
            {card.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <div className="relative group">
            <button
              onClick={onReroll}
              disabled={card.pinned}
              aria-label={card.pinned ? 'Unpin to reroll' : 'Reroll this card'}
              className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="absolute top-full right-0 mt-1.5 px-2 py-0.5 bg-primary text-inverted text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              1 credit
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-3 pb-3">
        <h4 className="font-semibold text-primary text-[0.9375rem] leading-snug mb-2 line-clamp-2">{content.headline || content.name || content.concept || card.card_type}</h4>

        {/* Dynamic content based on type */}
        {card.card_type === 'display' && (
          <div className="space-y-2 text-sm text-secondary">
            {content.description && <p className="leading-relaxed">{content.description}</p>}
            {content.layout && <p className="text-tertiary text-xs">Layout: {content.layout}</p>}
            {content.materials?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {content.materials.map((m, i) => (
                  <span key={i} className="text-xs text-secondary bg-hover px-2 py-0.5 rounded-md border border-subtle">{m}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {card.card_type === 'shelf_talker' && (
          <p className="text-sm text-secondary italic leading-relaxed">"{content.body}"</p>
        )}

        {card.card_type === 'escape_room' && (
          <div className="space-y-2 text-sm text-secondary">
            <p className="leading-relaxed">{content.concept}</p>
            <div className="flex gap-3 text-xs text-tertiary">
              <span>⏱ {content.duration}</span>
              <span>📊 {content.difficulty}</span>
            </div>
            {content.puzzles?.length > 0 && (
              <ol className="list-decimal list-inside text-xs text-tertiary space-y-0.5">
                {content.puzzles.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            )}
          </div>
        )}

        {card.card_type === 'social_media' && (
          <div className="space-y-2 text-sm">
            {content.instagram && (
              <div><span className="text-xs font-medium accent-solid">Instagram</span><p className="text-secondary mt-0.5">{content.instagram}</p></div>
            )}
            {content.facebook && (
              <div><span className="text-xs font-medium text-[#1877f2]">Facebook</span><p className="text-secondary mt-0.5">{content.facebook}</p></div>
            )}
            {content.tiktok && (
              <div><span className="text-xs font-medium text-[#ee1d52]">TikTok</span><p className="text-secondary mt-0.5">{content.tiktok}</p></div>
            )}
          </div>
        )}

        {card.card_type === 'signage' && (
          <div className="space-y-2 text-sm text-secondary">
            {content.subtext && <p className="leading-relaxed">{content.subtext}</p>}
            {content.call_to_action && (
              <p className="accent-solid font-medium text-xs">→ {content.call_to_action}</p>
            )}
          </div>
        )}

        {card.card_type === 'program' && (
          <div className="space-y-2 text-sm text-secondary">
            <p className="leading-relaxed">{content.description}</p>
            <div className="flex gap-3 text-xs text-tertiary">
              <span>👥 {content.audience}</span>
              <span>⏱ {content.duration}</span>
            </div>
            {content.supplies?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {content.supplies.map((s, i) => (
                  <span key={i} className="text-xs text-secondary bg-hover px-2 py-0.5 rounded-md border border-subtle">{s}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Read More button */}
      <div className="px-5 pb-5">
        <button
          onClick={() => onReadMore(card)}
          aria-label="Read more about this card"
          className="w-full py-2.5 text-sm font-medium accent-solid hover:bg-[var(--tint-indigo)] border border-default hover:border-[var(--accent-solid)]/20 rounded-lg transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]"
        >
          Read More →
        </button>
      </div>
    </div>
  )
}
