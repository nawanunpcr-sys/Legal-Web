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

// Role assigned to anyone who signs in via Microsoft (real org staff = จป).
// Change to 'viewer' if Microsoft sign-ins should be read-only by default.
export const MICROSOFT_ROLE = 'admin'

// Built-in internal accounts. Only two now:
//   admin  — จป.วิชาชีพ: แก้ไขได้ทุกอย่าง (รวมลบ)
//   viewer — ผู้เยี่ยมชม: ดูอย่างเดียว
export const DEMO_USERS = [
  { username: 'jorpor', password: 'she2026', name: 'จป.วิชาชีพ',  role: 'admin'  },
  { username: 'viewer', password: 'she2026', name: 'ผู้เยี่ยมชม',  role: 'viewer' },
]

export const ROLE_LABELS = { admin: 'ผู้ดูแลระบบ', editor: 'ผู้แก้ไข', viewer: 'ผู้เยี่ยมชม' }

export const NO_PERM = 'สิทธิ์ไม่เพียงพอ'

const SESSION_KEY = 'lg_session'

// ---- Demo session helpers ----
export function demoSignIn(username, password) {
  const u = DEMO_USERS.find(x => x.username === String(username || '').trim() && x.password === password)
  if (!u) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  const session = { name: u.name, role: u.role, username: u.username, mode: 'demo', ts: Date.now() }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* ignore */ }
  return session
}

// Sign in as a built-in account using only the username (password is fixed for
// the internal accounts, so the on-screen role buttons don't need to expose it).
export function demoLoginAs(username) {
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
  view:   ['admin', 'editor', 'viewer'],
  edit:   ['admin', 'editor'],
  delete: ['admin'],
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
  return getStoredSession()
}
// Subscribe to Microsoft sign-in/out events, normalised to the app's session shape.
export function onAuthChange(cb) {
  if (!hasSupabase) return () => {}
  return sbOnAuthChange(sb => cb(sb ? sessionFromSupabase(sb) : getStoredSession()))
}

// ---- React context so components can gate UI on the current role ----
export const AuthContext = createContext({ session: null, role: 'viewer', can: () => false })
export function useAuth() { return useContext(AuthContext) }
