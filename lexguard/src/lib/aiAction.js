// ── helper กลางของปุ่มที่เรียก AI ทุกปุ่ม ────────────────────────────────────
//
// ปุ่ม AI ทุกปุ่มที่เพิ่มตั้งแต่ขั้นที่ 1 เป็นต้นไป ต้องเรียกผ่านไฟล์นี้เท่านั้น
// เพื่อให้ทั้งระบบมีพฤติกรรมเดียวกัน 4 อย่าง:
//   1. สถานะกำลังทำงาน — ปุ่มบอกได้ว่ากำลังทำอยู่ ไม่ใช่ค้างเงียบๆ
//   2. กันกดซ้ำ — กดระหว่างที่ยังไม่เสร็จ ไม่ยิงคำขอใหม่ (เดิมกดรัวได้ แล้วโดน 429 เอง)
//   3. จับ timeout ฝั่งหน้าจอ — Vercel ตัดที่ 300 วิ แต่ตอบกลับเป็นหน้า HTML ไม่ใช่ JSON
//      ถ้าไม่ดักไว้ ผู้ใช้จะเห็น "Unexpected token '<'" ซึ่งไม่ได้บอกอะไรเลย
//   4. แปล error เป็นภาษาไทยที่บอก "สาเหตุจริง" ไม่ใช่แค่เลขสถานะ

import { useCallback, useRef, useState } from 'react'
import { toast } from './toast.js'

const DEFAULT_TIMEOUT_MS = 300_000   // ให้ตรงกับ maxDuration ใน vercel.json

export class AiError extends Error {
  constructor(message, { code = 'unknown', status = 0, retryAfter = 0, raw = '' } = {}) {
    super(message)
    this.name = 'AiError'
    this.code = code            // timeout | rate_limited | not_a_law | too_big | bad_source |
    this.status = status        // forbidden | network | server | upstream | unknown
    this.retryAfter = retryAfter
    this.raw = raw
  }
}

// แปลงคำตอบที่ผิดพลาดให้เป็นข้อความไทยที่บอกสาเหตุจริง
// ข้อความจาก server ที่เขียนไว้ดีอยู่แล้ว (422 ไม่ใช่ตัวบท / 413 ไฟล์ใหญ่) ให้ใช้ต่อ ไม่เขียนทับ
function toAiError(status, data, rawText, retryAfter) {
  const msg = (data && data.error) ? String(data.error) : ''
  switch (status) {
    case 429:
      return new AiError(msg || `เรียกใช้งานถี่เกินไป — ขอเวลาอีก ${retryAfter || 60} วินาทีแล้วลองใหม่`,
        { code: 'rate_limited', status, retryAfter: retryAfter || Number(data?.retry_after) || 60 })
    case 403:
      return new AiError('คำขอไม่ได้มาจากโดเมนของแอป — กรุณาเปิดระบบผ่านที่อยู่เว็บของหน่วยงาน',
        { code: 'forbidden', status })
    case 413:
      return new AiError(msg || 'ไฟล์ใหญ่เกินไป — กรุณาแยกไฟล์ หรือคัดลอกตัวบทมาวางแทน',
        { code: 'too_big', status })
    case 422:
      // 422 ของระบบนี้มี 2 กรณี: เอกสารไม่ใช่ตัวบทกฎหมาย · ดึงเนื้อหาจากหน้าเว็บได้น้อยเกินไป
      return new AiError(msg || 'เอกสารที่ให้มาไม่ใช่ตัวบทกฎหมาย — กรุณาตรวจลิงก์หรือไฟล์อีกครั้ง',
        { code: 'not_a_law', status })
    case 400:
      return new AiError(msg || 'ข้อมูลที่ส่งไปไม่ครบหรือไม่ถูกต้อง', { code: 'bad_source', status })
    case 404:
      return new AiError(msg || 'ไม่พบข้อมูลที่อ้างถึงในระบบ', { code: 'bad_source', status })
    case 502:
    case 503:
      return new AiError(msg || 'บริการ AI หรือเว็บต้นทางขัดข้องชั่วคราว — กรุณาลองใหม่อีกครั้ง',
        { code: 'upstream', status })
    case 504:
      return new AiError('เซิร์ฟเวอร์ใช้เวลาเกินกำหนด (300 วินาที) จึงหยุดรอ — ลองแบ่งเอกสารให้สั้นลงแล้วทำใหม่',
        { code: 'timeout', status })
    default:
      if (!data && rawText && /^\s*</.test(rawText)) {
        // ตอบกลับเป็น HTML ไม่ใช่ JSON = โดนตัดที่ชั้น gateway (หมดเวลา หรือฟังก์ชันล้ม)
        return new AiError('เซิร์ฟเวอร์ตอบกลับไม่สมบูรณ์ (มักเกิดจากใช้เวลาเกินกำหนด) — กรุณาลองใหม่อีกครั้ง',
          { code: 'timeout', status, raw: rawText.slice(0, 200) })
      }
      return new AiError(msg || `เรียกใช้งานไม่สำเร็จ (สถานะ ${status})`, { code: 'server', status })
  }
}

// เรียก endpoint AI หนึ่งครั้ง — คืน data ที่ parse แล้ว หรือโยน AiError
export async function callAi(path, body = {}, { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  if (signal) signal.addEventListener('abort', () => ctl.abort(), { once: true })
  let r
  try {
    r = await fetch(path, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: ctl.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    if (e?.name === 'AbortError') {
      throw new AiError(`ใช้เวลาเกิน ${Math.round(timeoutMs / 60000)} นาที ระบบจึงหยุดรอ — กรุณาลองใหม่ หรือแบ่งเอกสารให้สั้นลง`,
        { code: 'timeout' })
    }
    throw new AiError('เครือข่ายขัดข้อง — ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่', { code: 'network', raw: String(e?.message || e) })
  }
  clearTimeout(timer)

  const text = await r.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!r.ok) throw toAiError(r.status, data, text, Number(r.headers.get('Retry-After')) || 0)
  if (!data) throw new AiError('เซิร์ฟเวอร์ตอบกลับไม่สมบูรณ์ — กรุณาลองใหม่อีกครั้ง',
    { code: 'server', status: r.status, raw: text.slice(0, 200) })
  return data
}

// ── ตัวคุมสถานะปุ่ม (ใช้ในคอมโพเนนต์) ───────────────────────────────────────
// ใช้คู่กับ useState ของหน้าจอเอง — ไม่ผูกกับ React hook เพื่อให้เรียกจากที่ไหนก็ได้
// ตัวอย่าง:
//   const ai = useAiAction()
//   <button disabled={ai.isBusy(l.id)} onClick={() => ai.run(l.id, async () => { … })}>
//     {ai.isBusy(l.id) ? 'กำลังสรุป…' : 'ให้ AI สรุป'}
//   </button>

export function useAiAction({ onError } = {}) {
  const [busyKey, setBusyKey] = useState(null)
  const lock = useRef(false)   // กันกดซ้ำในจังหวะเดียวกันก่อน state จะทัน re-render

  const run = useCallback(async (key, fn, { errorPrefix = '' } = {}) => {
    if (lock.current) return { ok: false, skipped: true }
    lock.current = true
    setBusyKey(key ?? true)
    try {
      const value = await fn()
      return { ok: true, value }
    } catch (e) {
      const err = e instanceof AiError ? e : new AiError(String(e?.message || e), { code: 'unknown' })
      if (onError) onError(err)
      else toast((errorPrefix ? errorPrefix + ': ' : '') + err.message)
      return { ok: false, error: err }
    } finally {
      lock.current = false
      setBusyKey(null)
    }
  }, [onError])

  return {
    busyKey,
    busy: busyKey !== null,
    isBusy: key => busyKey !== null && (key === undefined || busyKey === key),
    run,
  }
}
