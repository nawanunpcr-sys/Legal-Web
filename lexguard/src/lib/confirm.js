// Promise-based confirm dialog. Falls back to native confirm if no host mounted.
let handler = null
export function registerConfirm(fn) { handler = fn }
export function confirmDialog(message, opts = {}) {
  return new Promise(resolve => {
    if (!handler) { resolve(window.confirm(message)); return }
    handler({ message, danger: opts.danger || false, okLabel: opts.okLabel || 'ยืนยัน', resolve })
  })
}
