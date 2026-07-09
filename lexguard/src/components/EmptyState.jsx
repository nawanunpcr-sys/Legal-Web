import { I } from './icons.jsx'

// Reusable empty-state block: faint icon + short message + optional action.
// `size="sm"` for tight spots like an empty Kanban column.
export default function EmptyState({ icon = 'inbox', title, hint, action, onAction, size }) {
  return (
    <div className={'empty-state' + (size === 'sm' ? ' empty-state--sm' : '')}>
      <div className="empty-state-ic"><I n={icon} /></div>
      {title && <div className="empty-state-title">{title}</div>}
      {hint && <div className="empty-state-hint">{hint}</div>}
      {action && onAction && (
        <button className="btn btn-ghost empty-state-btn" onClick={onAction}>{action}</button>
      )}
    </div>
  )
}
