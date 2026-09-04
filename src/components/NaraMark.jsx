import { MessageCircleMore, Sparkles } from 'lucide-react'

export default function NaraMark({ compact = false }) {
  return (
    <span className={`nara-mark${compact ? ' nara-mark--compact' : ''}`} aria-hidden="true">
      <MessageCircleMore />
      <Sparkles className="nara-mark__spark" />
    </span>
  )
}
