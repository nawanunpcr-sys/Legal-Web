// Promise-based confirm dialog. Falls back to native confirm if no host mounted.
let handler = null
export function registerConfirm(fn) { handler = fn }
export function confirmDialog(message, opts = {}) {
  return new Promise(resolve => {
    if (!handler) { resolve(window.confirm(message)); return }
    handler({ message, danger: opts.danger || false, okLabel: opts.okLabel || 'ยืนยัน', resolve })
  })
}

// กล่องเดียวกันแต่มีช่องกรอกข้อความ — คืนข้อความที่พิมพ์ หรือ null เมื่อกดยกเลิก
// P21 · จำเป็นเพราะ "ไม่สอดคล้อง" ต้องมีเหตุผลกำกับเสมอ รวมถึงตอนกดเหมารวมหลายฉบับ
// required = true แล้วปุ่มยืนยันจะกดไม่ได้จนกว่าจะพิมพ์
export function promptDialog(message, opts = {}) {
  return new Promise(resolve => {
    if (!handler) { resolve(window.prompt(message) || null); return }
    handler({ message, danger: opts.danger || false, okLabel: opts.okLabel || 'ยืนยัน',
      input: { label: opts.label || '', placeholder: opts.placeholder || '', required: opts.required !== false },
      resolve })
  })
}
