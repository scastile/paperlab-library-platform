import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import Crossword from './pages/Crossword'
import EventPlanner from './pages/EventPlanner'
import EscapeRoom from './pages/EscapeRoom'
import FlyerStudio from './pages/FlyerStudio'

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-2 border-[var(--accent-solid)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/crossword" element={<Crossword />} />
      <Route path="/event-planner" element={<EventPlanner />} />
      <Route path="/escape-room" element={<EscapeRoom />} />
      <Route path="/flyer-studio" element={<FlyerStudio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
