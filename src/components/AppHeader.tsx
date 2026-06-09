import type { Feedback } from '../types'
import { Icon } from './Icon'

export function AppHeader({
  feedback,
  onReset,
  onDismissFeedback,
}: {
  feedback: Feedback | null
  onReset: () => void
  onDismissFeedback: () => void
}) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark"><Icon name="certificate" /></span>
        <h1>Generador de certificados</h1>
      </div>
      <div className="header-actions">
        <button className="ghost-button" onClick={onReset}>
          <Icon name="refresh" />
          <span>Limpiar datos</span>
        </button>
      </div>
      {feedback && (
        <div className={`feedback-toast ${feedback.tone}`} role="status">
          <span className="feedback-icon">
            <Icon name={feedback.tone === 'success' ? 'check' : 'sparkles'} />
          </span>
          <span>{feedback.text}</span>
          <button aria-label="Cerrar mensaje" onClick={onDismissFeedback}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </header>
  )
}
