import { useState } from 'react'
import { Rocket, Sparkles } from 'lucide-react'

const AUDIENCES = [
  { id: 'all', label: 'All Ages' },
  { id: 'toddlers', label: 'Toddlers (0-5)' },
  { id: 'kids', label: 'Kids (6-12)' },
  { id: 'teens', label: 'Teens (13-17)' },
  { id: 'adults', label: 'Adults' },
  { id: 'seniors', label: 'Seniors' },
  { id: 'families', label: 'Families' },
]

const BUDGETS = [
  { id: 'none', label: 'No Budget' },
  { id: '20', label: '$20 — Display Only' },
  { id: '50', label: '$50 — Small Event' },
  { id: '100', label: '$100 — Medium Event' },
  { id: '200', label: '$200+ — Full Program' },
]

export default function SearchBar({ onGenerate, loading }) {
  const [topic, setTopic] = useState('')
  const [generateImage, setGenerateImage] = useState(false)
  const [audience, setAudience] = useState('all')
  const [budget, setBudget] = useState('50')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (topic.trim() && !loading) {
      const audienceLabel = AUDIENCES.find(a => a.id === audience)?.label || 'All Ages'
      const budgetLabel = BUDGETS.find(b => b.id === budget)?.label || '$50 — Small Event'
      onGenerate(topic.trim(), generateImage, audienceLabel, budgetLabel)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl p-5 sm:p-8 border border-default" style={{boxShadow: 'var(--shadow-card)'}}>
      <h2 className="text-lg font-semibold text-primary mb-4">What would you like to promote?</h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. 'The Great Gatsby', 'Minecraft', 'Summer Reading Program'…"
          className="flex-1 bg-input border border-default rounded-xl px-4 py-3.5 text-primary placeholder:text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] focus-visible:border-transparent transition-all duration-250"
          disabled={loading}
        />
        <div className="relative group">
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="btn-gradient flex items-center justify-center sm:justify-start gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-on-accent font-semibold px-6 py-3.5 rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]"
          >
            {loading ? (
              <Sparkles className="w-5 h-5 animate-spin" />
            ) : (
              <Rocket className="w-5 h-5" />
            )}
            {loading ? 'Generating…' : 'Generate'}
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-primary text-inverted text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10" style={{boxShadow: 'var(--shadow-md)'}}>
            5 credits
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-[var(--bg-primary)]" />
          </div>
        </div>
      </div>

      {/* Target Audience */}
      <div className="mb-5">
        <label className="text-sm text-secondary font-medium mb-2 block">Target Audience</label>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAudience(a.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                audience === a.id
                  ? 'bg-[var(--accent-solid)] text-white shadow-sm'
                  : 'bg-hover text-secondary hover:text-primary border border-default'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="mb-5">
        <label className="text-sm text-secondary font-medium mb-2 block">Budget Level</label>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBudget(b.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                budget === b.id
                  ? 'bg-[var(--accent-solid)] text-white shadow-sm'
                  : 'bg-hover text-secondary hover:text-primary border border-default'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}
