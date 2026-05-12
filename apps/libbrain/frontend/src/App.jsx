import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import PatronChat from './pages/PatronChat'
import StaffDashboard from './pages/StaffDashboard'
import Login from './pages/Login'
import { Brain, BarChart3, MessageSquare, Menu, X } from 'lucide-react'
import { useState } from 'react'

function Navbar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-card border-default border-b sticky top-0 z-40 backdrop-blur-xl bg-white/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <span className="font-semibold text-primary text-base">LibBrain</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                isActive('/') ? 'bg-[rgba(99,102,241,0.12)] text-[#6366f1]' : 'text-secondary hover:bg-hover'
              }`}
            >
              <MessageSquare size={16} />
              Ask LibBrain
            </Link>
            {user ? (
              <>
                <Link
                  to="/staff"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                    isActive('/staff') ? 'bg-[rgba(99,102,241,0.12)] text-[#6366f1]' : 'text-secondary hover:bg-hover'
                  }`}
                >
                  <BarChart3 size={16} />
                  Staff Dashboard
                </Link>
                <button
                  onClick={signOut}
                  className="btn-outline text-xs py-1.5 px-3 ml-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/staff/login"
                className="btn-outline text-xs py-1.5 px-3 no-underline"
              >
                Staff Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-secondary hover:text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden pb-3 border-t border-default animate-fade-in">
            <div className="flex flex-col gap-1 pt-2">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium no-underline ${
                  isActive('/') ? 'bg-[rgba(99,102,241,0.12)] text-[#6366f1]' : 'text-secondary'
                }`}
              >
                <MessageSquare size={16} />
                Ask LibBrain
              </Link>
              {user ? (
                <>
                  <Link
                    to="/staff"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium no-underline ${
                      isActive('/staff') ? 'bg-[rgba(99,102,241,0.12)] text-[#6366f1]' : 'text-secondary'
                    }`}
                  >
                    <BarChart3 size={16} />
                    Staff Dashboard
                  </Link>
                  <button onClick={() => { signOut(); setMobileOpen(false) }} className="text-left px-3 py-2 text-sm text-secondary">
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/staff/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm text-secondary no-underline"
                >
                  Staff Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function StaffRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-page">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<PatronChat />} />
              <Route path="/staff" element={<StaffRoute><StaffDashboard /></StaffRoute>} />
              <Route path="/staff/login" element={<Login />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}
