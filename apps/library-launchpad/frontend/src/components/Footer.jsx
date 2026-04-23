import { Paperclip } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-subtle mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="px-6 py-5 flex items-center justify-center gap-2">
          <Paperclip className="w-4 h-4 text-secondary" />
          <span className="text-sm text-secondary">Powered by <span className="text-primary font-medium">PaperLab</span></span>
        </div>
      </div>
    </footer>
  )
}
