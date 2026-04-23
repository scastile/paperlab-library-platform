import { useState, useEffect } from 'react'
import { X, Sparkles, Zap } from 'lucide-react'

const CREDIT_PACKS = [
  { id: 'small', credits: 20, price: 7, name: 'Small Pack', desc: 'For occasional use' },
  { id: 'medium', credits: 50, price: 15, name: 'Medium Pack', desc: 'Expires in 90 days' },
  { id: 'large', credits: 120, price: 30, name: 'Large Pack', desc: 'Expires in 90 days' },
]

const SUBSCRIPTIONS = [
  { id: 'creator', credits: 60, price: 12.99, name: 'Creator', desc: '60 credits/month', perCredit: 0.22 },
  { id: 'pro', credits: 150, price: 24.99, name: 'Pro', desc: '150 credits/month + rollover', perCredit: 0.17 },
  { id: 'institution', credits: 400, price: 49.99, name: 'Institution', desc: '400 credits/month + rollover', perCredit: 0.12 },
]

export default function CreditsModal({ credits, onClose, getToken }) {
  const [purchasing, setPurchasing] = useState(null)

  // Hooks must be called unconditionally — Rules of Hooks
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Early return AFTER all hooks
  if (!credits) return null

  const handlePurchase = async (packId, type = 'pack') => {
    if (purchasing) return // Prevent double-click
    setPurchasing(packId)
    try {
      const token = getToken?.()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/credits/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pack_id: packId, type, return_url: window.location.href }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (e) {
      console.error('Purchase failed:', e)
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'}}>
      <div role="dialog" aria-modal="true" aria-label="Get more credits" className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overscroll-contain border border-default" style={{boxShadow: 'var(--shadow-modal)'}}>
        <div className="sticky top-0 bg-card px-6 py-4 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 accent-solid" />
            <h2 className="text-xl font-bold text-primary">Get More Credits</h2>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-hover rounded-lg transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]">
            <X className="w-5 h-5 text-tertiary" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* Current Balance */}
          <div className="bg-page rounded-xl p-5">
            <p className="text-secondary text-sm">Your Current Balance</p>
            <p className="text-3xl font-bold text-primary mt-1">{credits.total_available || 0} <span className="text-lg font-normal text-tertiary">credits</span></p>
            {credits.tier && credits.tier !== 'free' && (
              <p className="accent-solid text-sm mt-1">{credits.tier} plan: {credits.monthly_remaining}/{credits.monthly_allocation} monthly credits remaining</p>
            )}
          </div>

          {/* Subscriptions */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 accent-solid" /> Monthly Plans
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {SUBSCRIPTIONS.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => handlePurchase(sub.id, 'subscription')}
                  disabled={purchasing === sub.id}
                  className={`card-lift p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] disabled:opacity-50 ${sub.id === 'pro' ? 'ring-2 ring-[var(--accent-solid)]' : ''}`}
                >
                  {sub.id === 'pro' && (
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2" style={{background: 'var(--accent-solid)', color: 'white'}}>Best Value</span>
                  )}
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-primary">{sub.name}</span>
                    <span className="accent-solid font-bold">${sub.price}<span className="text-tertiary text-sm font-normal">/mo</span></span>
                  </div>
                  <p className="text-secondary text-sm mt-1">{sub.desc}</p>
                  <p className="text-tertiary text-xs mt-1">${sub.perCredit.toFixed(2)}/credit</p>
                </button>
              ))}
            </div>
          </div>

          {/* Credit Packs */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Credit Packs</h3>
            <div className="grid grid-cols-2 gap-4">
              {CREDIT_PACKS.map(pack => (
                <button
                  key={pack.id}
                  onClick={() => handlePurchase(pack.id, 'pack')}
                  disabled={purchasing === pack.id}
                  className="card-lift p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] disabled:opacity-50"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-primary">{pack.name}</span>
                    <span className="accent-solid font-bold">${pack.price}</span>
                  </div>
                  <p className="text-secondary text-sm mt-1">{pack.credits} credits</p>
                  <p className="text-tertiary text-xs mt-1">${(pack.price / pack.credits).toFixed(2)}/credit</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
