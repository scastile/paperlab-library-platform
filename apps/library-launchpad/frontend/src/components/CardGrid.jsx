import PromotionCard from './PromotionCard'
import { RefreshCw } from 'lucide-react'

export default function CardGrid({ cards, rerolling, onPin, onReroll, onRerollAll, onReadMore }) {
  if (!cards?.length) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-label">Promotion Ideas ({cards.length})</h3>
        <button
          onClick={onRerollAll}
          disabled={rerolling.size > 0}
          className="flex items-center gap-1.5 text-xs font-medium accent-solid hover:text-[var(--accent-hover-from)] disabled:opacity-50 transition-all duration-250"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${rerolling.size > 0 ? 'animate-spin' : ''}`} />
          Reroll All Unpinned
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((card) => (
          <PromotionCard
            key={card.id}
            card={card}
            isRerolling={rerolling.has(card.id)}
            onPin={() => onPin(card.id)}
            onReroll={() => onReroll(card.id)}
            onReadMore={onReadMore}
          />
        ))}
      </div>
    </div>
  )
}
