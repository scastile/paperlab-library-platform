import { useState, useEffect } from 'react'
import { Terminal } from 'lucide-react'

const STEPS = [
  (topic) => `Consulting the 20-year library veteran...`,
  (topic) => `Researching "${topic}" across media formats...`,
  (topic) => `Checking the budget against the inventory...`,
  (topic) => `Building the dependency map for the escape room...`,
  (topic) => `Sourcing cross-media connections for "${topic}"...`,
  (topic) => `Writing shelf talkers that actually work...`,
  (topic) => `Generating social media hooks your teens won't scroll past...`,
  (topic) => `Assembling the full campaign package...`,
]

export default function GenerationStatus({ topic }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [isDone, setIsDone] = useState(false)

  // Build the messages for this topic
  const messages = STEPS.map(fn => fn(topic))

  useEffect(() => {
    const currentMessage = messages[stepIndex]
    if (!currentMessage) return

    if (isTyping) {
      if (displayedText.length < currentMessage.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentMessage.slice(0, displayedText.length + 1))
        }, 22) // typing speed
        return () => clearTimeout(timeout)
      } else {
        // Done typing this line — pause, then move to next
        const timeout = setTimeout(() => {
          setIsDone(true)
          const nextTimeout = setTimeout(() => {
            setIsDone(false)
            setDisplayedText('')
            setIsTyping(true)
            setStepIndex((prev) => (prev + 1) % messages.length)
          }, 600) // pause between lines
          return () => clearTimeout(nextTimeout)
        }, 1200) // hold time after typing finishes
        return () => clearTimeout(timeout)
      }
    }
  }, [displayedText, isTyping, stepIndex, messages])

  return (
    <div className="flex justify-center my-6">
      <div
        className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-[var(--bg-primary)] border border-default font-mono text-sm max-w-2xl"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <Terminal className="w-4 h-4 flex-shrink-0 accent-solid" />
        <span className="text-secondary">
          <span className="accent-solid">{'>'}</span>{' '}
          {displayedText}
          <span className="inline-block w-2 h-4 ml-0.5 accent-solid animate-pulse" style={{ verticalAlign: 'text-bottom' }}>▌</span>
        </span>
      </div>
    </div>
  )
}
