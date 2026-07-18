// ───────────────────────────────────────────────────────────────────────────
// Central auth layer for LexGuard.
// Phase "demo": logs in against a small in-code list of mock accounts and keeps
// the session in localStorage. No real Supabase Auth yet. Flip VITE_AUTH_MODE to
// 'supabase' when going live to delegate to the real signIn/signOut/getSession.
//
// TODO(production): permissions here are UI-only. When AUTH_MODE==='supabase',
// enforce the same role rules on the server with Supabase Row Level Security —
// the client `can()` checks below must NOT be the only gate.
// ───────────────────────────────────────────────────────────────────────────
import { createContext, useContext } from 'react'
import { signIn as sbSignIn, signOut as sbSignOut, getSession as sbGetSession,
         onAuthChange as sbOnAuthChange, hasSupabase } from './supabase.js'

export const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'demo'   // 'demo' | 'supabase'

// ── โหมดทดลองใช้: ข้ามระบบล็อกอินชั่วคราว ──
// true = เข้าแอปได้เลยไม่ต้องล็อกอิน (เข้าเป็นผู้ใช้ guest สิทธิ์ admin เพื่อทดสอบได้ครบ)
// ตั้งเป็น false เพื่อเปิดหน้าล็อกอิน/Landing กลับมาเหมือนเดิม
// (override ได้ด้วย env: VITE_SKIP_LOGIN=0)
export const SKIP_LOGIN = import.meta.env.VITE_SKIP_LOGIN === '1'
export const GUEST_SESSION = { name: 'ผู้ทดลองใช้', role: 'admin', username: 'guest', mode: 'guest', ts: 0 }

// Role assigned to anyone who signs in via Microsoft (real org staff = จป).
// Change to 'viewer' if Microsoft sign-ins should be read-only by default.
export const MICROSOFT_ROLE = 'admin'

// รหัสผ่านโหมด demo อ่านจาก environment เท่านั้น — ห้ามฝังรหัสในโค้ด
// ถ้าไม่ได้ตั้ง VITE_DEMO_PASSWORD จะล็อกอินโหมด demo ไม่ได้เลย
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || ''

// ข้อความเตือนเมื่อยังไม่ได้ตั้งค่ารหัสผ่าน demo
const NO_DEMO_PASSWORD = 'ยังไม่ได้ตั้งค่า VITE_DEMO_PASSWORD — ไม่สามารถล็อกอินโหมด demo ได้ กรุณาตั้งค่า environment variable ก่อน'

// Built-in internal accounts. Only two now:
//   admin  — จป.วิชาชีพ: แก้ไขได้ทุกอย่าง (รวมลบ)
//   viewer — ผู้เยี่ยมชม: ดูอย่างเดียว
// รหัสผ่านของทุกบัญชีมาจาก DEMO_PASSWORD (env) ไม่ฝังในโค้ดอีกต่อไป
export const DEMO_USERS = [
  { username: 'jorpor', name: 'จป.วิชาชีพ',  role: 'admin'  },
  { username: 'viewer', name: 'ผู้เยี่ยมชม',  role: 'viewer' },
]

export const ROLE_LABELS = { admin: 'ผู้ดูแลระบบ', editor: 'ผู้แก้ไข', viewer: 'ผู้เยี่ยมชม' }

export const NO_PERM = 'สิทธิ์ไม่เพียงพอ'

const SESSION_KEY = 'lg_session'

// ── บัญชีหลักของทีม QA&SHE — ล็อกอินด้วย username/password ──
// ใช้งานได้โดยไม่ต้องพึ่ง VITE_DEMO_PASSWORD (คนละชุดกับบัญชี demo ด้านล่าง)
const APP_ACCOUNTS = [
  { username: 'QA&SHEjastel', password: 'qa&shejastel26', name: 'QA & SHE', role: 'admin' },
]

// ล็อกอินด้วยชื่อผู้ใช้/รหัสผ่าน (ตรวจสอบแบบไม่สนตัวพิมพ์เล็ก-ใหญ่ที่ชื่อผู้ใช้)
export function appSignIn(username, password) {
  const u = APP_ACCOUNTS.find(x => x.username.toLowerCase() === String(username || '').trim().toLowerCase())
  if (!u || password !== u.password) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  const session = { name: u.name, role: u.role, username: u.username, mode: 'app', ts: Date.now() }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* ignore */ }
  return session
}

// ---- Demo session helpers ----
export function demoSignIn(username, password) {
  if (!DEMO_PASSWORD) throw new Error(NO_DEMO_PASSWORD)
  const u = DEMO_USERS.find(x => x.username === String(username || '').trim())
  if (!u || password !== DEMO_PASSWORD) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  const session = { name: u.name, role: u.role, username: u.username, mode: 'demo', ts: Date.now() }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* ignore */ }
  return session
}

// Sign in as a built-in account using only the username (password is fixed for
// the internal accounts, so the on-screen role buttons don't need to expose it).
export function demoLoginAs(username) {
  if (!DEMO_PASSWORD) throw new Error(NO_DEMO_PASSWORD)
  const u = DEMO_USERS.find(x => x.username === username)
  if (!u) throw new Error('ไม่พบบัญชีผู้ใช้')
  const session = { name: u.name, role: u.role, username: u.username, mode: 'demo', ts: Date.now() }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* ignore */ }
  return session
}

export function getStoredSession() {
  try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null } catch { return null }
}

// Normalise a raw Supabase (Microsoft SSO) session into the app's {name, role} shape.
// The display name comes straight from the Microsoft profile.
export function sessionFromSupabase(sb) {
  if (!sb) return null
  const u = sb.user || {}
  const md = u.user_metadata || {}
  const name = md.full_name || md.name || md.preferred_username || u.email || 'ผู้ใช้ Microsoft'
  return { name, role: MICROSOFT_ROLE, username: u.email || '', mode: 'microsoft', ts: Date.now() }
}

export function demoSignOut() {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
}

// Current display name — used as evaluated_by / uploaded_by in other modules.
export function currentUserName() {
  return getStoredSession()?.name || 'ผู้ใช้งาน'
}

// ---- Simple role permissions ----
// actions: 'view' (ทุกคน) · 'edit' (admin+editor) · 'delete' (admin เท่านั้น)
const PERMS = {
  view:    ['admin', 'editor', 'viewer'],
  edit:    ['admin', 'editor'],
  delete:  ['admin'],
  approve: ['admin'],   // P8: อนุมัติเข้าทะเบียนได้เฉพาะ ADMIN (ห้ามเข้าทะเบียนอัตโนมัติ)
}
export function can(role, action) {
  return (PERMS[action] || []).includes(role)
}

// ---- Hybrid facade ----
// A real Microsoft (Supabase) session always wins; otherwise fall back to the
// built-in account stored in localStorage. This lets the internal role buttons
// and Microsoft SSO coexist regardless of AUTH_MODE.
export async function signIn(username, password) {
  if (AUTH_MODE === 'supabase') return sbSignIn(username, password)
  return demoSignIn(username, password)
}
export async function signOut() {
  demoSignOut()
  if (hasSupabase) { try { await sbSignOut() } catch { /* ignore */ } }
}
export async function getSession() {
  if (hasSupabase) {
    try { const sb = await sbGetSession(); if (sb) return sessionFromSupabase(sb) } catch { /* ignore */ }
  }
  const stored = getStoredSession()
  if (stored) return stored
  // โหมดทดลอง: ไม่มี session → เข้าเป็น guest แทนการบังคับล็อกอิน
  return SKIP_LOGIN ? GUEST_SESSION : null
}
// Subscribe to Microsoft sign-in/out events, normalised to the app's session shape.
export function onAuthChange(cb) {
  if (!hasSupabase) return () => {}
  // โหมดทดลอง: เมื่อไม่มี session จาก Microsoft/สโตร์ ให้ตกไปที่ guest (กันเด้งกลับหน้าล็อกอิน)
  return sbOnAuthChange(sb => cb(sb ? sessionFromSupabase(sb) : (getStoredSession() || (SKIP_LOGIN ? GUEST_SESSION : null))))
}

// ---- React context so components can gate UI on the current role ----
export const AuthContext = createContext({ session: null, role: 'viewer', can: () => false })
export function useAuth() { return useContext(AuthContext) }
