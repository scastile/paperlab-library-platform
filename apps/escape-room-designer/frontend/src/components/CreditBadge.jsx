import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, X, Sparkles, Zap } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const PACKS = [
  { id: 'small', name: 'Small Pack', credits: 20, price: 7, desc: 'For occasional use' },
  { id: 'medium', name: 'Medium Pack', credits: 50, price: 15, desc: 'Expires in 90 days' },
  { id: 'large', name: 'Large Pack', credits: 120, price: 30, desc: 'Expires in 90 days' },
]

const SUBS = [
  { id: 'creator', name: 'Creator', credits: 60, price: 12.99, desc: '60 credits/month', perCredit: 0.22 },
  { id: 'pro', name: 'Pro', credits: 150, price: 24.99, desc: '150 credits/month + rollover', perCredit: 0.17 },
  { id: 'institution', name: 'Institution', credits: 400, price: 49.99, desc: '400 credits/month + rollover', perCredit: 0.12 },
]

export default function CreditBadge() {
  const { user, session } = useAuth()
  const [credits, setCredits] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [purchasing, setPurchasing] = useState(null)

  useEffect(() => {
    if (!user || !session?.access_token) return
    let cancelled = false
    const fetchCredits = async () => {
      try {
        const res = await fetch(`${API_BASE}/credits/balance`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) { console.error('[CreditBadge]', res.status); return }
        const data = await res.json()
        if (!cancelled) setCredits(data)
      } catch (e) { console.error('[CreditBadge]', e) }
    }
    fetchCredits()
    const id = setInterval(fetchCredits, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [user, session?.access_token])

  const handlePurchase = async (packId, type = 'pack') => {
    if (!session?.access_token) return
    setPurchasing(packId)
    try {
      const res = await fetch(`${API_BASE}/credits/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ pack_id: packId, type, return_url: window.location.href }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) { console.error('Checkout failed:', e) }
    finally { setPurchasing(null) }
  }

  return (
    <>
      <button onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-page border border-default text-sm font-medium text-primary hover:bg-hover transition-all duration-200">
        <span>{credits?.total_available ?? '—'} credits</span>
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-solid)] text-white">
          <Plus className="w-3 h-3" />
        </span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overscroll-contain border border-default" style={{ boxShadow: 'var(--shadow-modal)' }}>
            <div className="sticky top-0 bg-card px-6 py-4 border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 accent-solid" />
                <h2 className="text-xl font-bold text-primary">Get More Credits</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-hover rounded-lg">
                <X className="w-5 h-5 text-tertiary" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-8">
              <div className="bg-page rounded-xl p-5">
                <p className="text-secondary text-sm">Your Current Balance</p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {credits?.total_available ?? 0} <span className="text-lg font-normal text-tertiary">credits</span>
                </p>
                {credits?.tier && credits.tier !== 'free' && (
                  <p className="accent-solid text-sm mt-1">{credits.tier} plan: {credits.monthly_remaining}/{credits.monthly_allocation} monthly credits remaining</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 accent-solid" /> Monthly Plans
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {SUBS.map(sub => (
                    <button key={sub.id} onClick={() => handlePurchase(sub.id, 'subscription')} disabled={purchasing === sub.id}
                      className={`card-lift p-5 text-left disabled:opacity-50 ${sub.id === 'pro' ? 'ring-2 ring-[var(--accent-solid)]' : ''}`}>
                      {sub.id === 'pro' && <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2" style={{ background: 'var(--accent-solid)', color: 'white' }}>Best Value</span>}
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

              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Credit Packs</h3>
                <div className="grid grid-cols-3 gap-4">
                  {PACKS.map(pack => (
                    <button key={pack.id} onClick={() => handlePurchase(pack.id, 'pack')} disabled={purchasing === pack.id}
                      className="card-lift p-5 text-left disabled:opacity-50">
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
      )}
    </>
  )
}
