import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX, Loader2, Brain, Sparkles, RotateCcw } from 'lucide-react'
import { askQuestion, getTtsAudio } from '../lib/api'

const CATEGORY_LABELS = {
  reference: 'Reference',
  general: 'General',
  readers_advisory: "Reader's Advisory",
  tech_help: 'Tech Help',
  directional: 'Directional',
}

const CATEGORY_STYLES = {
  reference: 'badge-reference',
  general: 'badge-general',
  readers_advisory: 'badge-readers_advisory',
  tech_help: 'badge-tech_help',
  directional: 'badge-directional',
}

function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return ''
  let html = md
    .replace(/^---+$/gm, '<hr class="my-3 border-default" />')
    .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-bold mt-3 mb-1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h4 class="text-sm font-bold mt-3 mb-1">$1</h4>')
    .replace(/^# (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1.5">$1</h3>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-black/5 text-xs font-mono">$1</code>')
    .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 mb-0.5">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-0.5 list-decimal">$1</li>')
    .replace(/\n\n+/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>')

  html = '<p class="mb-2">' + html + '</p>'
  html = html.replace(/<p class="mb-2"><\/p>/g, '')
  html = html.replace(/<p class="mb-2"><(h[1-4]|hr|li)/g, '<$1')
  html = html.replace(/<\/(h[1-4]|hr|li)><\/p>/g, '</$1>')
  return html
}

export default function PatronChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [ttsPlaying, setTtsPlaying] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setError(null)
    setLoading(false)
    audioRef.current?.pause()
    setTtsPlaying(null)
    inputRef.current?.focus()
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    const userMsg = { role: 'user', text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const data = await askQuestion(text)
      const botMsg = {
        role: 'assistant',
        text: data.answer || data.response || 'I could not find an answer to that question.',
        category: data.category || 'general',
        counted: data.counted || data.category === 'reference',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      setError('Sorry, something went wrong. Please try again.')
      const errorMsg = {
        role: 'assistant',
        text: "I'm having trouble right now. Please try again in a moment or ask a librarian for help.",
        category: 'general',
        counted: false,
        timestamp: Date.now(),
        isError: true,
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.')
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('')
      setInput(transcript)
    }

    recognition.onend = () => setIsRecording(false)
    recognition.onerror = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const playTts = async (text, index) => {
    if (ttsPlaying === index) {
      audioRef.current?.pause()
      setTtsPlaying(null)
      return
    }

    try {
      setTtsPlaying(index)
      const blob = await getTtsAudio(text)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setTtsPlaying(null)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => setTtsPlaying(null)
      await audio.play()
    } catch {
      setTtsPlaying(null)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] max-w-3xl mx-auto">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide pb-48">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
              <Brain size={40} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">Hi! I'm LibBrain</h1>
            <p className="text-secondary text-base mb-6 max-w-sm">
              Your library assistant. Ask me anything about books, services, programs, or directions!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['What books do you recommend for teens?', 'When is story time?', 'How do I get a library card?'].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="btn-outline text-xs py-2 px-3 rounded-full hover:border-[#6366f1] hover:text-[#6366f1]"
                >
                  <Sparkles size={12} />
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* New chat button */}
            <div className="flex justify-center mb-2">
              <button
                onClick={handleNewChat}
                className="btn-outline text-xs py-1.5 px-3 rounded-full hover:border-[#6366f1] hover:text-[#6366f1]"
              >
                <RotateCcw size={12} />
                New Chat
              </button>
            </div>

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white rounded-2xl rounded-br-md px-4 py-3'
                      : `card-lift px-4 py-3 ${msg.isError ? 'border-red-200' : ''}`
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div
                      className="campaign-output text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                    />
                  )}

                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-default">
                      {msg.category && (
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_STYLES[msg.category] || 'badge-general'}`}>
                          {CATEGORY_LABELS[msg.category] || msg.category}
                        </span>
                      )}
                      {msg.counted && (
                        <span className="text-[10px] font-medium text-secondary flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          Counted
                        </span>
                      )}
                      <button
                        onClick={() => playTts(msg.text, i)}
                        className="ml-auto p-1 rounded-lg hover:bg-hover text-secondary transition-colors"
                        title={ttsPlaying === i ? 'Stop audio' : 'Listen'}
                      >
                        {ttsPlaying === i ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="card-lift px-4 py-3 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[#6366f1]" />
                  <span className="text-sm text-secondary">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area — raised up with bottom offset */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-default bg-card/95 backdrop-blur-xl px-4 py-4" style={{ marginBottom: '0px', paddingBottom: '24px' }}>
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <button
            onClick={toggleVoice}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse-soft shadow-lg shadow-red-200'
                : 'bg-hover text-secondary hover:text-primary'
            }`}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about the library..."
              className="w-full px-4 py-2.5 rounded-xl border border-default bg-page text-primary text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] transition-all"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-10 h-10 rounded-xl btn-gradient p-0 disabled:opacity-40"
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
