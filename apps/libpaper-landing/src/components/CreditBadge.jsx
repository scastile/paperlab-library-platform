import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const PACKS = [
  { id: 'small', name: 'Small Pack', credits: 15, price: 7 },
  { id: 'large', name: 'Large Pack', credits: 75, price: 25 },
]

const SUBS = [
  { id: 'basic', name: 'Basic', credits: 50, price: 12.99 },
  { id: 'pro', name: 'Pro', credits: 100, price: 19.99 },
  { id: 'premium', name: 'Premium', credits: 200, price: 39.99 },
]

export default function CreditBadge() {
  const { user, getToken } = useAuth()
  const [credits, setCredits] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [purchasing, setPurchasing] = useState(null)

  const fetchCredits = async () => {
    const token = getToken?.()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/credits/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCredits(data)
      }
    } catch (e) {
      console.error('Credit fetch failed:', e)
    }
  }

  useEffect(() => {
    if (user) fetchCredits()
    const id = setInterval(fetchCredits, 30000)
    return () => clearInterval(id)
  }, [user, getToken])

  const handlePurchase = async (packId, type = 'pack') => {
    const token = getToken?.()
    if (!token) return
    setPurchasing(packId)
    try {
      const res = await fetch(`${API_BASE}/credits/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pack_id: packId, type }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (e) {
      console.error('Checkout failed:', e)
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-page border border-default text-sm font-medium text-primary hover:bg-hover transition-all duration-200"
      >
        <span>{credits?.total_available ?? '—'} credits</span>
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-solid)] text-white">
          <Plus className="w-3 h-3" />
        </span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-default rounded-xl shadow-card-hover z-50 p-4 space-y-4">
            {credits && (
              <div>
                <p className="text-secondary text-xs">Current Balance</p>
                <p className="text-2xl font-bold text-primary">
                  {credits.total_available} <span className="text-sm font-normal text-tertiary">credits</span>
                </p>
                {credits.tier && credits.tier !== 'free' && (
                  <p className="text-xs text-[var(--accent-solid)] mt-0.5">
                    {credits.tier} plan: {credits.monthly_remaining}/{credits.monthly_allocation} monthly
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Subscriptions</p>
              <div className="space-y-2">
                {SUBS.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handlePurchase(sub.id, 'subscription')}
                    disabled={purchasing === sub.id}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-page hover:bg-hover transition-colors text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-primary">{sub.name}</p>
                      <p className="text-xs text-tertiary">{sub.credits} credits/mo</p>
                    </div>
                    <span className="text-sm font-bold text-[var(--accent-solid)]">
                      ${sub.price}<span className="text-xs font-normal text-tertiary">/mo</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Credit Packs</p>
              <div className="space-y-2">
                {PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => handlePurchase(pack.id, 'pack')}
                    disabled={purchasing === pack.id}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-page hover:bg-hover transition-colors text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-primary">{pack.name}</p>
                      <p className="text-xs text-tertiary">{pack.credits} credits</p>
                    </div>
                    <span className="text-sm font-bold text-[var(--accent-solid)]">${pack.price}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
