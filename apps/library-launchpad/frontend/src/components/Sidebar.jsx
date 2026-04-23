import { Bookmark, Trash2, Sparkles } from 'lucide-react'

export default function Sidebar({ campaigns, onLoad, onDelete, currentId, featuredCampaigns, onFeaturedLoad }) {
  const isGuest = featuredCampaigns && featuredCampaigns.length > 0

  return (
    <div className="h-full">
      <div className="bg-card rounded-xl p-5 border border-default h-full flex flex-col" style={{boxShadow: 'var(--shadow-card)'}}>
        <h3 className="font-semibold text-primary flex items-center gap-2 mb-4">
          {isGuest ? (
            <Sparkles className="w-4 h-4 accent-solid" />
          ) : (
            <Bookmark className="w-4 h-4 accent-solid" />
          )}
          {isGuest ? 'Example Campaigns' : `Saved Campaigns (${campaigns.length})`}
        </h3>

        {isGuest ? (
          <div className="space-y-2">
            {featuredCampaigns.map((c, i) => (
              <div
                key={i}
                className="group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-250 bg-page hover:bg-hover border border-subtle"
                onClick={() => onFeaturedLoad(c)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{c.topic}</p>
                  <p className="text-xs text-tertiary">{c.cards.length} cards · {c.media[0]?.author}</p>
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-secondary">No saved campaigns yet. Generate one!</p>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-250 ${
                  c.id === currentId ? 'bg-[var(--tint-indigo)] border border-[var(--accent-solid)]/20' : 'bg-page hover:bg-hover border border-subtle'
                }`}
                onClick={() => onLoad(c.id)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{c.topic}</p>
                  <p className="text-xs text-tertiary">{c.card_count} cards · {formatDate(c.created_at)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(c.id) }}
                  aria-label="Delete campaign"
                  className="p-1 rounded text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString()
}
