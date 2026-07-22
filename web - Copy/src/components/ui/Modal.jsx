import { useEffect } from 'react'
import ReactDOM from 'react-dom'

export default function Modal({ open, onClose, title, children, footer, size = 'md', zIndex = 100 }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20,
      }}
      onClick={(e) => { 
        if (e.target === e.currentTarget) onClose?.() 
      }}
    >
      <div
        className={`bg-white rounded-2xl w-full ${widths[size]} flex flex-col`}
        style={{ maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="font-semibold text-slate-800 text-base">{title}</div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}
