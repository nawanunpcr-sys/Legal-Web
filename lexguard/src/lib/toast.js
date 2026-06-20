// Tiny toast pub/sub — call toast('msg') / toast('msg','error'|'success')
let subs = []
let id = 0
export function toast(message, type = 'info', ms = 3200) {
  const t = { id: ++id, message: String(message), type }
  subs.forEach(fn => fn({ type: 'add', t }))
  setTimeout(() => subs.forEach(fn => fn({ type: 'remove', id: t.id })), ms)
}
export function subscribeToasts(fn) { subs.push(fn); return () => { subs = subs.filter(s => s !== fn) } }
