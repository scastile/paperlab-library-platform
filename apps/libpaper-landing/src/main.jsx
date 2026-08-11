import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

// Top-level error boundary: a silent crash currently unmounts the whole tree
// into a blank white screen. Catch it, show the message, and offer a reload.
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('RootErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f5f5f7', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              {String(this.state.error && this.state.error.message)}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  </React.StrictMode>
)
