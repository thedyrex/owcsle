'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { UserCircle, LogOut, Camera, Pencil, Check, X, KeyRound, TrendingUp, Palette, User as UserIcon, Lock, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import type { User } from '@supabase/supabase-js'
import { xpProgress, xpForLevel } from '@/lib/xp'
import { useStats } from '@/hooks/useStats'

const TITLE_PRESETS: { title: string; req: number }[] = [
  { title: "Tenis",                req: 10 },
  { title: "Sugarbron's Desciple", req: 20 },
  { title: "Blueberrycat",         req: 35 },
  { title: "Gaming4Despair",       req: 50 },
  { title: "Pin Avoided",          req: 65 },
  { title: "NA's Last Hope",       req: 80 },
  { title: "ChrisTheory Denier",   req: 100 },
]

interface UserMenuProps {
  user: User | null
  onLoginClick: () => void
}

type SaveState = 'idle' | 'loading' | 'success' | 'error'
type Tab = 'progression' | 'customize' | 'editinfo' | 'admin' | 'logout'

type AdminUser = { id: string; email: string; username: string; arcade_xp: number; verified: boolean; banned: boolean; custom_titles: string[] }
type AdminAction = 'xp' | 'level' | 'reduce-xp' | 'title' | null

function AdminPanel({ supabase, dark, subtext, divider, inputBg, inputBorder, selfId, onRefreshXp }: {
  supabase: ReturnType<typeof createClient>
  dark: boolean; subtext: string; divider: string; inputBg: string; inputBorder: string
  selfId: string; onRefreshXp: () => void
}) {
  const [search, setSearch] = useState('')
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<AdminAction>(null)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirmBan, setConfirmBan] = useState<string | null>(null)

  const text = dark ? '#f0f0f0' : '#111'
  const iStyle = {
    background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: '3px',
    padding: '7px 10px', color: text, fontFamily: "var(--font-ow-esports), sans-serif",
    fontSize: '12px', outline: 'none', flex: 1,
  }

  const q = search.trim().toLowerCase()
  const results = q
    ? allUsers.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : allUsers

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  useEffect(() => {
    getToken().then(token => {
      if (!token) { setLoading(false); return }
      fetch('/api/admin/users?q=', { headers: { authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setAllUsers(d.users || []); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [])

  async function doAction(userId: string, action: string, payload: Record<string, unknown>) {
    setSaving(true); setMsg('')
    try {
      const token = await getToken()
      if (!token) { setMsg('NOT LOGGED IN'); setSaving(false); return }
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ userId, action, ...payload }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg(d.error?.toUpperCase() || 'ERROR'); setSaving(false); return }
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...d.updated } : u))
      setMsg(d.msg || 'DONE')
      setActiveAction(null); setInputVal(''); setConfirmBan(null)
      if (userId === selfId) onRefreshXp()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message.toUpperCase() : 'FAILED')
    } finally {
      setSaving(false)
    }
  }

  function openAction(userId: string, action: AdminAction) {
    if (activeUser === userId && activeAction === action) {
      setActiveUser(null); setActiveAction(null); setInputVal('')
    } else {
      setActiveUser(userId); setActiveAction(action); setInputVal('')
    }
  }

  const btnBase = (color: string, outline = false): React.CSSProperties => ({
    padding: '4px 10px', border: `1px solid ${outline ? inputBorder : color}`,
    borderRadius: '3px', cursor: 'pointer', fontFamily: "var(--font-ow-esports), sans-serif",
    fontSize: '9px', background: outline ? 'none' : color, color: outline ? color : '#fff',
    transition: 'opacity 0.15s',
  })

  const selfUser = allUsers.find(u => u.id === selfId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'profileTabIn 0.18s ease-out both' }}>

      {/* My Account */}
      {selfUser && (() => {
        const selfLvl = xpProgress(selfUser.arcade_xp).level
        const isSelfExpanded = activeUser === selfUser.id
        return (
          <div>
            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext }}>MY ACCOUNT</span>
            <div style={{ marginTop: '8px', border: `1px solid ${isSelfExpanded ? '#f97316' : 'rgba(249,115,22,0.3)'}`, borderRadius: '4px', overflow: 'hidden', transition: 'border-color 0.15s' }}>
              <div style={{ background: inputBg, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text }}>{selfUser.username}</span>
                  <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext, marginLeft: '8px' }}>LVL {selfLvl} · {selfUser.arcade_xp} XP</span>
                </div>
                <button onClick={() => { setActiveUser(isSelfExpanded ? null : selfUser.id); setActiveAction(null); setInputVal('') }}
                  style={{ ...btnBase('#f97316', true) }}>{isSelfExpanded ? 'CLOSE' : 'EDIT'}</button>
              </div>
              {isSelfExpanded && (
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: `1px solid ${divider}` }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => openAction(selfUser.id, 'xp')} style={btnBase('#f97316', activeAction !== 'xp')}>SET XP</button>
                    <button onClick={() => openAction(selfUser.id, 'level')} style={btnBase('#f97316', activeAction !== 'level')}>SET LEVEL</button>
                    <button onClick={() => openAction(selfUser.id, 'reduce-xp')} style={btnBase('#f97316', activeAction !== 'reduce-xp')}>REDUCE XP</button>
                  </div>
                  {activeAction === 'xp' && (() => {
                    const xp = Number(inputVal); const valid = inputVal !== '' && !isNaN(xp) && xp >= 0
                    return <div style={{ display: 'flex', gap: '6px' }}>
                      <input value={inputVal} onChange={e => setInputVal(e.target.value)} type="number" min="0"
                        onKeyDown={e => e.key === 'Enter' && valid && doAction(selfUser.id, 'xp', { xp })}
                        placeholder={`Current: ${selfUser.arcade_xp} XP`} style={iStyle} />
                      <button onClick={() => doAction(selfUser.id, 'xp', { xp })} disabled={saving || !valid}
                        style={{ ...btnBase('#f97316'), flexShrink: 0, opacity: (saving || !valid) ? 0.5 : 1 }}>{saving ? '...' : 'SET'}</button>
                    </div>
                  })()}
                  {activeAction === 'level' && (() => {
                    const lvlInput = parseInt(inputVal); const valid = inputVal !== '' && !isNaN(lvlInput) && lvlInput >= 1 && lvlInput <= 500
                    const previewXp = valid ? (() => { let t = 0; for (let i = 1; i < lvlInput; i++) t += Math.round(120 * Math.pow(i, 1.65)); return t })() : null
                    return <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input value={inputVal} onChange={e => setInputVal(e.target.value)} type="number" min="1" max="500"
                          onKeyDown={e => e.key === 'Enter' && valid && doAction(selfUser.id, 'xp', { xp: previewXp })}
                          placeholder={`Current: LVL ${selfLvl}`} style={iStyle} />
                        <button onClick={() => doAction(selfUser.id, 'xp', { xp: previewXp })} disabled={saving || !valid}
                          style={{ ...btnBase('#f97316'), flexShrink: 0, opacity: (saving || !valid) ? 0.5 : 1 }}>{saving ? '...' : 'SET'}</button>
                      </div>
                      {previewXp !== null && <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext }}>= {previewXp.toLocaleString()} XP</span>}
                    </div>
                  })()}
                  {activeAction === 'reduce-xp' && (() => {
                    const amount = Number(inputVal); const valid = inputVal !== '' && !isNaN(amount) && amount > 0
                    const resultXp = valid ? Math.max(0, selfUser.arcade_xp - amount) : null
                    return <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input value={inputVal} onChange={e => setInputVal(e.target.value)} type="number" min="1"
                          onKeyDown={e => e.key === 'Enter' && valid && doAction(selfUser.id, 'xp', { xp: resultXp })}
                          placeholder="Amount to subtract" style={iStyle} />
                        <button onClick={() => doAction(selfUser.id, 'xp', { xp: resultXp })} disabled={saving || !valid}
                          style={{ ...btnBase('#f97316'), flexShrink: 0, opacity: (saving || !valid) ? 0.5 : 1 }}>{saving ? '...' : 'APPLY'}</button>
                      </div>
                      {resultXp !== null && <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext }}>{selfUser.arcade_xp} → {resultXp.toLocaleString()} XP</span>}
                    </div>
                  })()}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <div style={{ height: '1px', background: divider }} />
      <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext }}>USER MANAGEMENT</span>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder={loading ? 'Loading users...' : `Search ${allUsers.length} users`}
        style={{ ...iStyle, flex: 1 }} disabled={loading} />

      {/* Results */}
      {results.map(u => {
        const lvl = xpProgress(u.arcade_xp).level
        const isExpanded = activeUser === u.id
        return (
          <div key={u.id} style={{ border: `1px solid ${isExpanded ? '#f97316' : divider}`, borderRadius: '4px', overflow: 'hidden', transition: 'border-color 0.15s' }}>
            {/* User row */}
            <div style={{ background: inputBg, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text }}>{u.username}</span>
                  {u.verified && <span style={{ fontSize: '10px' }}>✓</span>}
                  {u.banned && <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '8px', color: '#e53e3e' }}>BANNED</span>}
                </div>
                <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext }}>LVL {lvl} · {u.arcade_xp} XP</span>
              </div>
              <button onClick={() => { setActiveUser(isExpanded ? null : u.id); setActiveAction(null); setInputVal('') }}
                style={{ ...btnBase('#f97316', true) }}>{isExpanded ? 'CLOSE' : 'MANAGE'}</button>
            </div>

            {/* Actions drawer */}
            {isExpanded && (
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: `1px solid ${divider}` }}>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button onClick={() => openAction(u.id, 'xp')} style={btnBase('#f97316', activeAction !== 'xp')}>SET XP</button>
                  <button onClick={() => openAction(u.id, 'level')} style={btnBase('#f97316', activeAction !== 'level')}>SET LEVEL</button>
                  <button onClick={() => openAction(u.id, 'reduce-xp')} style={btnBase('#f97316', activeAction !== 'reduce-xp')}>REDUCE XP</button>
                  <button onClick={() => openAction(u.id, 'title')} style={btnBase('#a855f7', activeAction !== 'title')}>ADD TITLE</button>
                  <button onClick={() => doAction(u.id, 'verify', { verified: !u.verified })} disabled={saving}
                    style={btnBase(u.verified ? '#94a3b8' : '#22c55e')}>
                    {u.verified ? 'UNVERIFY' : 'VERIFY'}
                  </button>
                  <button onClick={() => setConfirmBan(confirmBan === u.id ? null : u.id)}
                    style={btnBase(u.banned ? '#22c55e' : '#e53e3e')}>
                    {u.banned ? 'UNBAN' : 'BAN'}
                  </button>
                </div>

                {/* SET XP input */}
                {activeAction === 'xp' && (() => {
                  const xp = Number(inputVal)
                  const valid = inputVal !== '' && !isNaN(xp) && xp >= 0
                  return (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input value={inputVal} onChange={e => setInputVal(e.target.value)} type="number" min="0"
                        onKeyDown={e => e.key === 'Enter' && valid && doAction(u.id, 'xp', { xp })}
                        placeholder={`Current: ${u.arcade_xp} XP`} style={iStyle} />
                      <button onClick={() => doAction(u.id, 'xp', { xp })} disabled={saving || !valid}
                        style={{ ...btnBase('#f97316'), flexShrink: 0, opacity: (saving || !valid) ? 0.5 : 1 }}>
                        {saving ? '...' : 'SET'}
                      </button>
                    </div>
                  )
                })()}

                {/* SET LEVEL input */}
                {activeAction === 'level' && (() => {
                  const lvlInput = parseInt(inputVal)
                  const valid = inputVal !== '' && !isNaN(lvlInput) && lvlInput >= 1 && lvlInput <= 500
                  const previewXp = valid ? (() => { let t = 0; for (let i = 1; i < lvlInput; i++) t += Math.round(120 * Math.pow(i, 1.65)); return t; })() : null
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input value={inputVal} onChange={e => setInputVal(e.target.value)} type="number" min="1" max="500"
                          onKeyDown={e => e.key === 'Enter' && valid && doAction(u.id, 'xp', { xp: previewXp })}
                          placeholder={`Current: LVL ${lvl}`} style={iStyle} />
                        <button onClick={() => doAction(u.id, 'xp', { xp: previewXp })} disabled={saving || !valid}
                          style={{ ...btnBase('#f97316'), flexShrink: 0, opacity: (saving || !valid) ? 0.5 : 1 }}>
                          {saving ? '...' : 'SET'}
                        </button>
                      </div>
                      {previewXp !== null && (
                        <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext }}>
                          = {previewXp.toLocaleString()} XP
                        </span>
                      )}
                    </div>
                  )
                })()}

                {/* REDUCE XP input */}
                {activeAction === 'reduce-xp' && (() => {
                  const amount = Number(inputVal)
                  const valid = inputVal !== '' && !isNaN(amount) && amount > 0
                  const resultXp = valid ? Math.max(0, u.arcade_xp - amount) : null
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input value={inputVal} onChange={e => setInputVal(e.target.value)} type="number" min="1"
                          onKeyDown={e => e.key === 'Enter' && valid && doAction(u.id, 'xp', { xp: resultXp })}
                          placeholder="Amount to subtract" style={iStyle} />
                        <button onClick={() => doAction(u.id, 'xp', { xp: resultXp })} disabled={saving || !valid}
                          style={{ ...btnBase('#f97316'), flexShrink: 0, opacity: (saving || !valid) ? 0.5 : 1 }}>
                          {saving ? '...' : 'APPLY'}
                        </button>
                      </div>
                      {resultXp !== null && (
                        <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext }}>
                          {u.arcade_xp} → {resultXp.toLocaleString()} XP
                        </span>
                      )}
                    </div>
                  )
                })()}

                {/* Custom title input */}
                {activeAction === 'title' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input value={inputVal} onChange={e => setInputVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doAction(u.id, 'add-title', { title: inputVal.trim() })}
                        placeholder="Custom title text" style={iStyle} maxLength={32} />
                      <button onClick={() => doAction(u.id, 'add-title', { title: inputVal.trim() })} disabled={saving || !inputVal.trim()}
                        style={{ ...btnBase('#a855f7'), flexShrink: 0, opacity: (saving || !inputVal.trim()) ? 0.6 : 1 }}>
                        {saving ? '...' : 'ADD'}
                      </button>
                    </div>
                    {u.custom_titles.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {u.custom_titles.map(t => (
                          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '3px', padding: '2px 6px' }}>
                            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: '#a855f7' }}>{t}</span>
                            <button onClick={() => doAction(u.id, 'remove-title', { title: t })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: '10px', padding: 0, lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Ban confirm */}
                {confirmBan === u.id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: '#e53e3e' }}>
                      {u.banned ? 'UNBAN' : 'BAN'} {u.username.toUpperCase()}?
                    </span>
                    <button onClick={() => doAction(u.id, u.banned ? 'unban' : 'ban', {})} disabled={saving}
                      style={{ ...btnBase('#e53e3e'), opacity: saving ? 0.6 : 1 }}>CONFIRM</button>
                    <button onClick={() => setConfirmBan(null)} style={btnBase('#94a3b8')}>CANCEL</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {msg && (
        <div style={{ padding: '8px 12px', borderRadius: '3px', background: (msg.includes('ERROR') || msg.includes('FAIL') || msg.includes('FORBIDDEN') || msg.includes('NOT LOGGED')) ? 'rgba(229,62,62,0.12)' : 'rgba(34,197,94,0.12)', border: `1px solid ${(msg.includes('ERROR') || msg.includes('FAIL') || msg.includes('FORBIDDEN') || msg.includes('NOT LOGGED')) ? 'rgba(229,62,62,0.4)' : 'rgba(34,197,94,0.4)'}` }}>
          <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: (msg.includes('ERROR') || msg.includes('FAIL') || msg.includes('FORBIDDEN') || msg.includes('NOT LOGGED')) ? '#e53e3e' : '#22c55e' }}>{msg}</span>
        </div>
      )}
    </div>
  )
}

export function UserMenu({ user, onLoginClick }: UserMenuProps) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('progression')
  const fileRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { stats: dailyStats, winRate: dailyWinRate } = useStats()

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || ''
  const avatarUrl = user?.user_metadata?.avatar_url || null

  const [editingUsername, setEditingUsername] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [usernameVal, setUsernameVal] = useState(username)
  const [emailVal, setEmailVal] = useState(user?.email || '')
  const [pwVal, setPwVal] = useState('')
  const [pwConfirmVal, setPwConfirmVal] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl)
  const [usernameState, setUsernameState] = useState<SaveState>('idle')
  const [usernameMsg, setUsernameMsg] = useState('')
  const [emailState, setEmailState] = useState<SaveState>('idle')
  const [emailMsg, setEmailMsg] = useState('')
  const [pwState, setPwState] = useState<SaveState>('idle')
  const [pwMsg, setPwMsg] = useState('')
  const [avatarState, setAvatarState] = useState<SaveState>('idle')
  const [bannerPreview, setBannerPreview] = useState<string | null>(user?.user_metadata?.banner_url || null)
  const [bannerState, setBannerState] = useState<SaveState>('idle')
  const [titleVal, setTitleVal] = useState(user?.user_metadata?.player_title || '')
  const [titleState, setTitleState] = useState<SaveState>('idle')
  const [teamTag, setTeamTag] = useState<string>(user?.user_metadata?.team_tag || '')
  const [teamTagState, setTeamTagState] = useState<SaveState>('idle')
  const [teams, setTeams] = useState<{ id: number; team_name: string; team_logo: string | null; region: string; team_color: string | null }[]>([])
  const [emailRevealed, setEmailRevealed] = useState(false)
  const [showUgcNotice, setShowUgcNotice] = useState(false)
  const [liveXp, setLiveXp] = useState<number | null>(null)

  useEffect(() => {
    setUsernameVal(user?.user_metadata?.username || user?.email?.split('@')[0] || '')
    setEmailVal(user?.email || '')
    setAvatarPreview(user?.user_metadata?.avatar_url || null)
    setBannerPreview(user?.user_metadata?.banner_url || null)
    setLiveXp(null)
  }, [user?.id])

  useEffect(() => { setMounted(true) }, [])

  function handleButtonClick() {
    if (!user) { onLoginClick(); return }
    setOpen(true)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return
      fetch('/api/arcade/sync-xp', {
        headers: { authorization: `Bearer ${data.session.access_token}` },
      }).then(r => r.ok ? r.json() : null).then(d => {
        if (d?.totalXp != null) setLiveXp(d.totalXp)
      }).catch(() => {})
    })
  }

  function handleClose() {
    setClosing(true)
    setTimeout(() => {
      setClosing(false); setOpen(false)
      setEditingUsername(false); setEditingEmail(false); setShowPassword(false)
      setPwVal(''); setPwConfirmVal(''); setEmailRevealed(false)
      setActiveTab('progression')
    }, 220)
  }

  async function handleLogout() {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<void>(resolve => setTimeout(resolve, 2000)),
      ])
    } catch {}
    // Force-clear session from localStorage in case signOut timed out
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      })
    } catch {}
    window.location.reload()
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarState('loading')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAvatarState('error'); return }
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload/pfp', {
      method: 'POST',
      headers: { authorization: `Bearer ${session.access_token}` },
      body: form,
    })
    if (!res.ok) { setAvatarState('error'); return }
    const { url } = await res.json()
    const { error: metaErr } = await supabase.auth.updateUser({ data: { avatar_url: url } })
    if (metaErr) { setAvatarState('error'); return }
    setAvatarPreview(url)
    setAvatarState('success')
    setTimeout(() => setAvatarState('idle'), 2000)
  }

  useEffect(() => {
    if (activeTab === 'customize' && teams.length === 0) {
      fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.teams || []))
    }
  }, [activeTab])

  async function saveTeamTag(name: string) {
    setTeamTag(name)
    setTeamTagState('loading')
    const { error } = await supabase.auth.updateUser({ data: { team_tag: name } })
    if (error) { setTeamTagState('error') }
    else { setTeamTagState('success'); setTimeout(() => setTeamTagState('idle'), 2000) }
  }

  async function saveTitle(val: string) {
    setTitleVal(val)
    setTitleState('loading')
    const { error } = await supabase.auth.updateUser({ data: { player_title: val } })
    if (error) { setTitleState('error') }
    else { setTitleState('success'); setTimeout(() => setTitleState('idle'), 2000) }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setBannerState('loading')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBannerState('error'); return }
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload/banner', {
      method: 'POST',
      headers: { authorization: `Bearer ${session.access_token}` },
      body: form,
    })
    if (!res.ok) { setBannerState('error'); return }
    const { url } = await res.json()
    const { error: metaErr } = await supabase.auth.updateUser({ data: { banner_url: url } })
    if (metaErr) { setBannerState('error'); return }
    setBannerPreview(url)
    setBannerState('success')
    setTimeout(() => setBannerState('idle'), 2000)
  }

  async function saveUsername() {
    if (!usernameVal.trim()) return
    setUsernameState('loading'); setUsernameMsg('')
    const { error } = await supabase.auth.updateUser({ data: { username: usernameVal.trim() } })
    if (error) { setUsernameState('error'); setUsernameMsg(error.message) }
    else { setUsernameState('success'); setEditingUsername(false); setTimeout(() => setUsernameState('idle'), 2000) }
  }

  async function saveEmail() {
    if (!emailVal.trim()) return
    setEmailState('loading'); setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email: emailVal.trim() })
    if (error) { setEmailState('error'); setEmailMsg(error.message) }
    else { setEmailState('success'); setEmailMsg('Confirmation email sent.'); setEditingEmail(false); setTimeout(() => { setEmailState('idle'); setEmailMsg('') }, 4000) }
  }

  async function savePassword() {
    if (!pwVal) return
    if (pwVal !== pwConfirmVal) { setPwState('error'); setPwMsg('Passwords do not match.'); return }
    setPwState('loading'); setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwVal })
    if (error) { setPwState('error'); setPwMsg(error.message) }
    else { setPwState('success'); setPwMsg('Password updated!'); setPwVal(''); setPwConfirmVal(''); setShowPassword(false); setTimeout(() => { setPwState('idle'); setPwMsg('') }, 2000) }
  }

  const bg = dark ? '#1a1a1a' : '#f4f4f4'
  const sidebar = dark ? '#141414' : '#e8e8e8'
  const text = dark ? '#f0f0f0' : '#111'
  const subtext = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'
  const divider = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const inputBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '8px 11px',
    fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '13px',
    background: inputBg, border: `1px solid ${inputBorder}`,
    borderRadius: '3px', color: text, outline: 'none', minWidth: 0,
  }

  const iconBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: subtext, transition: 'color 0.15s', borderRadius: '3px',
  }

  const isAdmin = user?.email === 'curdtanner@gmail.com'

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'progression', label: 'STATS', icon: <TrendingUp style={{ width: '13px', height: '13px' }} /> },
    { key: 'customize',   label: 'CUSTOMIZE',   icon: <Palette    style={{ width: '13px', height: '13px' }} /> },
    { key: 'editinfo',    label: 'EDIT INFO',    icon: <UserIcon   style={{ width: '13px', height: '13px' }} /> },
    ...(isAdmin ? [{ key: 'admin' as Tab, label: 'ADMIN', icon: <ShieldAlert style={{ width: '13px', height: '13px' }} /> }] : []),
  ]

  return (
    <>
      <button
        onClick={handleButtonClick}
        title={user ? username : 'Profile'}
        suppressHydrationWarning
        className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        style={{ border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: user ? '#f97316' : undefined }}
      >
        {user ? (
          avatarPreview ? (
            <img src={avatarPreview} alt="avatar" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '22px', height: '22px', borderRadius: '4px', background: '#f97316',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: '#fff', flexShrink: 0,
            }}>
              {username.slice(0, 2).toUpperCase()}
            </div>
          )
        ) : (
          <UserCircle className="text-neutral-800 dark:text-white" style={{ width: '22px', height: '22px', strokeWidth: 1.5 }} />
        )}
      </button>

      {open && mounted && user && createPortal(
        <>
          <style>{`
            @keyframes profileBackdropIn  { from { opacity: 0; } to { opacity: 1; } }
            @keyframes profileBackdropOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes profilePanelIn  { from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); } to { opacity: 1; transform: translate(-50%, -50%); } }
            @keyframes profilePanelOut { from { opacity: 1; transform: translate(-50%, -50%); } to { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); } }
            @keyframes profileTabIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            .profile-input::placeholder { color: ${dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}; }
            .profile-input:focus { border-color: #f97316 !important; }
            .profile-edit-icon:hover { color: #f97316 !important; }
            .profile-tab-btn:hover { background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} !important; }
          `}</style>

          <div onClick={handleClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 200,
            animation: closing ? 'profileBackdropOut 0.22s ease-out forwards' : 'profileBackdropIn 0.2s ease-out both',
          }} />

          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 201,
            width: 'min(720px, calc(100vw - 24px))',
            height: 'min(520px, calc(100vh - 48px))',
            background: bg,
            boxShadow: dark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 24px 64px rgba(0,0,0,0.25)',
            borderRadius: '4px', display: 'flex', flexDirection: 'column',
            animation: closing ? 'profilePanelOut 0.22s ease-out forwards' : 'profilePanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
          }}>

            {/* Header */}
            <div style={{
              padding: '18px 24px 14px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '2px solid #f97316',
            }}>
              <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '13px', color: '#f97316' }}>PROFILE</span>
              <button onClick={handleClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: text, opacity: 0.35, fontSize: '18px', lineHeight: 1,
                padding: '2px 4px', fontFamily: 'sans-serif', transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
              >✕</button>
            </div>

            {/* Body: sidebar + content */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* Sidebar */}
              <div style={{
                width: '180px', flexShrink: 0, background: sidebar,
                display: 'flex', flexDirection: 'column',
                padding: '16px 12px', gap: '4px',
                borderRight: `1px solid ${divider}`,
              }}>
                {/* Avatar + name */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingBottom: '16px', marginBottom: '8px', borderBottom: `1px solid ${divider}` }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '6px',
                    background: '#f97316', overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '18px', color: '#fff' }}>{username.slice(0, 2).toUpperCase()}</span>
                    }
                  </div>
                  <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: text, textAlign: 'center', wordBreak: 'break-all' }}>{username}</span>
                </div>

                {/* Nav tabs */}
                {tabs.map(tab => (
                  <button key={tab.key} className="profile-tab-btn" onClick={() => setActiveTab(tab.key)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer',
                    fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
                    background: activeTab === tab.key ? (dark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.12)') : 'none',
                    color: activeTab === tab.key ? '#f97316' : subtext,
                    transition: 'background 0.15s, color 0.15s',
                    textAlign: 'left',
                  }}>
                    {tab.icon}{tab.label}
                  </button>
                ))}

                {/* Logout at bottom */}
                <div style={{ flex: 1 }} />
                <button className="profile-tab-btn" onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer',
                  fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
                  background: 'none', color: subtext, transition: 'background 0.15s, color 0.15s',
                  textAlign: 'left',
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#e53e3e'; (e.currentTarget.style as any).background = dark ? 'rgba(229,62,62,0.1)' : 'rgba(229,62,62,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = subtext; e.currentTarget.style.background = 'none' }}
                >
                  <LogOut style={{ width: '13px', height: '13px' }} />
                  LOGOUT
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

                {/* PROGRESSION */}
                {activeTab === 'progression' && (() => {
                  const localXp = typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('owcsle_arcade_xp') || '0', 10) : 0;
                  const arcadeXp = liveXp ?? user?.user_metadata?.arcade_xp ?? localXp;
                  const xp = xpProgress(arcadeXp);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'profileTabIn 0.18s ease-out both' }}>

                      {/* Unlimited Level / XP */}
                      <div>
                        <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext }}>OWCSLE UNLIMITED LEVEL</span>
                        <div style={{ marginTop: '12px', background: inputBg, border: `1px solid ${divider}`, borderRadius: '4px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '22px', color: '#f97316' }}>LVL {xp.level}</span>
                            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext }}>{xp.current} / {xp.required} XP</span>
                          </div>
                          <div style={{ height: '6px', borderRadius: '3px', background: divider, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '3px', background: '#f97316', width: `${xp.percent * 100}%`, transition: 'width 0.6s ease' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext }}>TOTAL XP: {arcadeXp}</span>
                            <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: subtext }}>NEXT: {xpForLevel(xp.level) - xp.current} XP</span>
                          </div>
                        </div>
                      </div>

                      {/* Unlimited stats */}
                      <div>
                        <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext }}>UNLIMITED STATS</span>
                        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {(() => {
                            const arcadeStats = (() => { try { return JSON.parse(localStorage.getItem('owcsle_arcade_stats') || '{}') } catch { return {} } })();
                            const avgMs = user?.user_metadata?.avg_time_ms ?? null;
                            const formatAvg = (ms: number) => { const s = Math.floor(ms / 1000); const cs = Math.floor((ms % 1000) / 10); return `${s}.${cs.toString().padStart(2, '0')}s`; };
                            return [
                              { label: 'GAMES WON', value: user?.user_metadata?.games_won ?? 0 },
                              { label: 'STREAK', value: arcadeStats.streak ?? 0 },
                              { label: 'BEST STREAK', value: arcadeStats.bestStreak ?? 0 },
                              { label: 'AVG TIME', value: avgMs != null ? formatAvg(avgMs) : '\u2014' },
                            ].map(({ label, value }) => (
                              <div key={label} style={{ background: inputBg, border: `1px solid ${divider}`, borderRadius: '4px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '8px', color: subtext }}>{label}</span>
                                <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '18px', color: text }}>{value}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Daily stats */}
                      <div>
                        <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext }}>DAILY STATS</span>
                        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[
                            { label: 'PLAYED', value: dailyStats.gamesPlayed },
                            { label: 'WIN RATE', value: `${dailyWinRate}%` },
                            { label: 'STREAK', value: dailyStats.currentStreak },
                            { label: 'BEST STREAK', value: dailyStats.bestStreak },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ background: inputBg, border: `1px solid ${divider}`, borderRadius: '4px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '8px', color: subtext }}>{label}</span>
                              <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '18px', color: text }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  );
                })()}

                {/* CUSTOMIZE */}
                {activeTab === 'customize' && (() => {
                  const localXp = typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('owcsle_arcade_xp') || '0', 10) : 0;
                  const userLevel = xpProgress(liveXp ?? user?.user_metadata?.arcade_xp ?? localXp).level;
                  const locked = (req: number) => userLevel < req;
                  const LockOverlay = ({ req }: { req: number }) => (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', zIndex: 2, borderRadius: '4px' }}>
                      <Lock style={{ width: '18px', height: '18px', color: '#f97316' }} />
                      <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: '#f97316' }}>UNLOCKS AT LVL {req}</span>
                    </div>
                  );
                  return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'profileTabIn 0.18s ease-out both' }}>

                    {/* Profile Photo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext, alignSelf: 'flex-start' }}>PROFILE PHOTO</span>
                    <label
                      htmlFor={localStorage.getItem('owcsle_ugc_ack') ? 'avatar-upload' : undefined}
                      onClick={(e) => {
                        if (!localStorage.getItem('owcsle_ugc_ack')) {
                          e.preventDefault();
                          setShowUgcNotice(true);
                        }
                      }}
                      style={{
                        width: '100px', height: '100px', borderRadius: '8px',
                        background: '#f97316', cursor: 'pointer', position: 'relative',
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { const ov = e.currentTarget.querySelector('.avatar-overlay') as HTMLElement; if (ov) ov.style.opacity = '1' }}
                      onMouseLeave={e => { const ov = e.currentTarget.querySelector('.avatar-overlay') as HTMLElement; if (ov) ov.style.opacity = '0' }}
                    >
                      {avatarPreview
                        ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '30px', color: '#fff' }}>{username.slice(0, 2).toUpperCase()}</span>
                      }
                      <div className="avatar-overlay" style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                      }}>
                        {avatarState === 'loading'
                          ? <span style={{ color: '#fff', fontSize: '11px', fontFamily: "var(--font-ow-esports), sans-serif" }}>...</span>
                          : <Camera style={{ width: '20px', height: '20px', color: '#fff' }} />
                        }
                      </div>
                    </label>
                    <input ref={fileRef} id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                    <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: avatarState === 'success' ? '#22c55e' : avatarState === 'error' ? '#e53e3e' : subtext }}>
                      {avatarState === 'success' ? 'PHOTO UPDATED!' : avatarState === 'error' ? 'UPLOAD FAILED' : 'CLICK TO CHANGE PHOTO'}
                    </span>

                    {/* UGC notice */}
                    {showUgcNotice && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10, borderRadius: '4px', padding: '24px',
                      }}>
                        <div style={{
                          background: bg, borderRadius: '4px', padding: '24px',
                          maxWidth: '340px', width: '100%',
                          border: `1px solid ${divider}`,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                          display: 'flex', flexDirection: 'column', gap: '14px',
                        }}>
                          <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: '#f97316', margin: 0 }}>
                            CONTENT POLICY
                          </p>
                          <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: text, margin: 0, lineHeight: 1.7 }}>
                            ALL USER GENERATED CONTENT IS MONITORED AND IS ALWAYS SUBJECT TO REMOVAL. BY UPLOADING A PROFILE PHOTO YOU AGREE TO THESE TERMS.
                          </p>
                          <button
                            onClick={() => {
                              localStorage.setItem('owcsle_ugc_ack', '1')
                              setShowUgcNotice(false)
                              document.getElementById('avatar-upload')?.click()
                            }}
                            style={{
                              padding: '10px', background: '#f97316', color: '#fff',
                              border: 'none', borderRadius: '3px', cursor: 'pointer',
                              fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
                            }}
                          >
                            I ACKNOWLEDGE
                          </button>
                          <button
                            onClick={() => setShowUgcNotice(false)}
                            style={{
                              padding: '8px', background: 'none', color: subtext,
                              border: `1px solid ${inputBorder}`, borderRadius: '3px', cursor: 'pointer',
                              fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
                            }}
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    )}
                    </div>

                    <div style={{ height: '1px', background: divider }} />

                    {/* Team Tag */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext }}>TEAM TAG</span>
                        {teamTag && (
                          <button onClick={() => saveTeamTag('')} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: subtext,
                            transition: 'color 0.15s',
                          }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#e53e3e')}
                            onMouseLeave={e => (e.currentTarget.style.color = subtext)}
                          >CLEAR</button>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        {locked(5) && <LockOverlay req={5} />}
                        {teams.length === 0
                          ? <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext }}>...</span>
                          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {teams.map(team => {
                                const selected = teamTag === team.team_name;
                                return (
                                  <button key={team.id} onClick={() => !locked(5) && saveTeamTag(selected ? '' : team.team_name)} title={team.team_name} style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    padding: '5px 8px', borderRadius: '4px', cursor: locked(5) ? 'default' : 'pointer',
                                    background: selected ? (dark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.1)') : inputBg,
                                    border: `1px solid ${selected ? '#f97316' : inputBorder}`,
                                    transition: 'border-color 0.15s, background 0.15s',
                                  }}
                                    onMouseEnter={e => { if (!selected && !locked(5)) e.currentTarget.style.borderColor = '#f97316' }}
                                    onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = inputBorder }}
                                  >
                                    {team.team_logo
                                      ? <img src={team.team_logo} alt={team.team_name} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                      : <div style={{ width: '16px', height: '16px', borderRadius: '2px', background: team.team_color || '#f97316' }} />
                                    }
                                    <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '9px', color: selected ? '#f97316' : subtext, whiteSpace: 'nowrap' }}>{team.team_name}</span>
                                  </button>
                                );
                              })}
                            </div>
                        }
                      </div>
                      {teamTagState === 'success' && (
                        <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: '#22c55e' }}>
                          {teamTag ? `TEAM SET TO ${teamTag.toUpperCase()}` : 'TEAM TAG CLEARED'}
                        </span>
                      )}
                    </div>

                    <div style={{ height: '1px', background: divider }} />

                    {/* Player Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext }}>PLAYER TITLE</span>
                        {titleVal && (
                          <button onClick={() => saveTitle('')} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: subtext,
                            transition: 'color 0.15s',
                          }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#e53e3e')}
                            onMouseLeave={e => (e.currentTarget.style.color = subtext)}
                          >CLEAR</button>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        {locked(10) && <LockOverlay req={10} />}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {/* Admin-granted custom titles */}
                          {(user?.user_metadata?.custom_titles ?? []).map((t: string) => {
                            const isSelected = titleVal === t;
                            return (
                              <button key={`custom-${t}`} onClick={() => saveTitle(isSelected ? '' : t)} disabled={titleState === 'loading'}
                                style={{
                                  padding: '5px 10px',
                                  border: `1px solid ${isSelected ? '#a855f7' : 'rgba(168,85,247,0.4)'}`,
                                  borderRadius: '3px', background: isSelected ? '#a855f7' : 'rgba(168,85,247,0.1)',
                                  color: isSelected ? '#fff' : '#a855f7',
                                  fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px',
                                  cursor: 'pointer', transition: 'all 0.15s',
                                }}
                              >{t}</button>
                            );
                          })}
                          {/* Earnable presets */}
                          {TITLE_PRESETS.map(({ title: t, req }) => {
                            const isUnlocked = userLevel >= req;
                            const isSelected = titleVal === t;
                            return (
                              <button
                                key={t}
                                disabled={!isUnlocked || titleState === 'loading'}
                                onClick={() => saveTitle(isSelected ? '' : t)}
                                title={isUnlocked ? undefined : `Unlocks at LVL ${req}`}
                                style={{
                                  padding: '5px 10px',
                                  border: `1px solid ${isSelected ? '#f97316' : isUnlocked ? (dark ? '#404040' : '#d4d4d4') : (dark ? '#2a2a2a' : '#e5e5e5')}`,
                                  borderRadius: '3px',
                                  background: isSelected ? '#f97316' : 'none',
                                  color: isSelected ? '#fff' : isUnlocked ? (dark ? '#e5e5e5' : '#171717') : (dark ? '#404040' : '#c4c4c4'),
                                  fontFamily: "var(--font-ow-esports), sans-serif",
                                  fontSize: '10px',
                                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.15s',
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  opacity: isUnlocked ? 1 : 0.45,
                                }}
                              >
                                {!isUnlocked && <Lock style={{ width: '8px', height: '8px' }} />}
                                {t}
                                {!isUnlocked && <span style={{ fontSize: '8px', opacity: 0.8 }}>·{req}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: divider }} />

                    {/* Banner */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: subtext }}>PROFILE BANNER</span>
                      <div style={{ position: 'relative' }}>
                      {locked(20) && <LockOverlay req={20} />}
                      <label
                        htmlFor={(!locked(20) && localStorage.getItem('owcsle_ugc_ack')) ? 'banner-upload' : undefined}
                        onClick={(e) => {
                          if (locked(20)) { e.preventDefault(); return; }
                          if (!localStorage.getItem('owcsle_ugc_ack')) { e.preventDefault(); setShowUgcNotice(true); }
                        }}
                        style={{
                          width: '100%', height: '100px', borderRadius: '4px',
                          background: bannerPreview ? 'transparent' : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'),
                          border: `1px dashed ${inputBorder}`, cursor: locked(20) ? 'default' : 'pointer',
                          position: 'relative', overflow: 'hidden',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#f97316'
                          const ov = e.currentTarget.querySelector('.banner-overlay') as HTMLElement
                          if (ov) ov.style.opacity = '1'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = inputBorder
                          const ov = e.currentTarget.querySelector('.banner-overlay') as HTMLElement
                          if (ov) ov.style.opacity = '0'
                        }}
                      >
                        {bannerPreview
                          ? <img src={bannerPreview} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: subtext }}>CLICK TO UPLOAD BANNER</span>
                        }
                        <div className="banner-overlay" style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: 0, transition: 'opacity 0.15s',
                        }}>
                          {bannerState === 'loading'
                            ? <span style={{ color: '#fff', fontSize: '11px', fontFamily: "var(--font-ow-esports), sans-serif" }}>...</span>
                            : <Camera style={{ width: '18px', height: '18px', color: '#fff' }} />
                          }
                        </div>
                      </label>
                      </div>
                      <input ref={bannerRef} id="banner-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerChange} />
                      <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: bannerState === 'success' ? '#22c55e' : bannerState === 'error' ? '#e53e3e' : subtext }}>
                        {bannerState === 'success' ? 'BANNER UPDATED!' : bannerState === 'error' ? 'UPLOAD FAILED' : 'RECOMMENDED: 1500 × 500'}
                      </span>
                    </div>

                  </div>
                  );
                })()}

                {/* EDIT INFO */}
                {activeTab === 'editinfo' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'profileTabIn 0.18s ease-out both' }}>

                    {/* Username */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: subtext }}>USERNAME</span>
                      {editingUsername ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input className="profile-input" autoFocus autoComplete="username" value={usernameVal}
                              onChange={e => setUsernameVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') { setEditingUsername(false); setUsernameVal(username) } }}
                              style={inputStyle} />
                            <button onClick={saveUsername} disabled={usernameState === 'loading'} style={{
                              padding: '8px 12px', background: '#f97316', color: '#fff', border: 'none',
                              borderRadius: '3px', cursor: 'pointer', fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
                            }}>{usernameState === 'loading' ? '...' : 'SAVE'}</button>
                            <button onClick={() => { setEditingUsername(false); setUsernameVal(username); setUsernameMsg('') }} style={iconBtnStyle}>
                              <X style={{ width: '15px', height: '15px' }} />
                            </button>
                          </div>
                          {usernameMsg && <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: usernameState === 'error' ? '#e53e3e' : '#22c55e', margin: 0 }}>{usernameMsg.toUpperCase()}</p>}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '15px', color: text }}>{usernameVal || username}</span>
                          {usernameState === 'success' && <Check style={{ width: '13px', height: '13px', color: '#22c55e' }} />}
                          <button className="profile-edit-icon" onClick={() => setEditingUsername(true)} style={iconBtnStyle}>
                            <Pencil style={{ width: '13px', height: '13px' }} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ height: '1px', background: divider }} />

                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: subtext }}>EMAIL</span>
                      {editingEmail ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input className="profile-input" autoFocus type="email" autoComplete="email" value={emailVal}
                              onChange={e => setEmailVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveEmail(); if (e.key === 'Escape') { setEditingEmail(false); setEmailVal(user.email || '') } }}
                              style={inputStyle} />
                            <button onClick={saveEmail} disabled={emailState === 'loading'} style={{
                              padding: '8px 12px', background: '#f97316', color: '#fff', border: 'none',
                              borderRadius: '3px', cursor: 'pointer', fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
                            }}>{emailState === 'loading' ? '...' : 'SAVE'}</button>
                            <button onClick={() => { setEditingEmail(false); setEmailVal(user.email || ''); setEmailMsg('') }} style={iconBtnStyle}>
                              <X style={{ width: '15px', height: '15px' }} />
                            </button>
                          </div>
                          {emailMsg && <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: emailState === 'error' ? '#e53e3e' : '#22c55e', margin: 0 }}>{emailMsg.toUpperCase()}</p>}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setEmailRevealed(r => !r)}>
                            <span style={{
                              fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '15px', color: text,
                              filter: emailRevealed ? 'none' : 'blur(6px)',
                              transition: 'filter 0.2s', userSelect: emailRevealed ? 'text' : 'none', display: 'block',
                            }}>{emailVal || user.email}</span>
                            {!emailRevealed && (
                              <span style={{
                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: '#f97316',
                              }}>CLICK TO REVEAL</span>
                            )}
                          </div>
                          {emailState === 'success' && <Check style={{ width: '13px', height: '13px', color: '#22c55e' }} />}
                          <button className="profile-edit-icon" onClick={() => setEditingEmail(true)} style={iconBtnStyle}>
                            <Pencil style={{ width: '13px', height: '13px' }} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ height: '1px', background: divider }} />

                    {/* Password */}
                    {!showPassword ? (
                      <button onClick={() => setShowPassword(true)} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'none', border: `1px solid ${inputBorder}`, borderRadius: '3px',
                        padding: '10px 14px', cursor: 'pointer', color: text,
                        fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
                        transition: 'border-color 0.15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#f97316')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = inputBorder)}
                      >
                        <KeyRound style={{ width: '13px', height: '13px' }} />
                        CHANGE PASSWORD
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: subtext }}>CHANGE PASSWORD</span>
                        <input className="profile-input" type="password" autoComplete="new-password" value={pwVal}
                          onChange={e => setPwVal(e.target.value)} placeholder="New password" style={inputStyle} autoFocus />
                        <input className="profile-input" type="password" autoComplete="new-password" value={pwConfirmVal}
                          onChange={e => setPwConfirmVal(e.target.value)} placeholder="Confirm new password"
                          style={{ ...inputStyle, borderColor: pwConfirmVal.length > 0 ? (pwVal === pwConfirmVal ? 'rgba(249,115,22,0.5)' : 'rgba(229,62,62,0.6)') : inputBorder }} />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => { setShowPassword(false); setPwVal(''); setPwConfirmVal(''); setPwMsg(''); setPwState('idle') }} style={{
                            padding: '8px 12px', background: 'none', color: subtext,
                            border: `1px solid ${inputBorder}`, borderRadius: '3px', cursor: 'pointer',
                            fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
                          }}>CANCEL</button>
                          <button onClick={savePassword} disabled={pwState === 'loading'} style={{
                            padding: '8px 14px', background: '#f97316', color: '#fff',
                            border: 'none', borderRadius: '3px', cursor: 'pointer',
                            fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px',
                            opacity: pwState === 'loading' ? 0.6 : 1,
                          }}>{pwState === 'loading' ? '...' : 'SAVE'}</button>
                        </div>
                        {pwMsg && <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: pwState === 'error' ? '#e53e3e' : '#22c55e', margin: 0 }}>{pwMsg.toUpperCase()}</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* ADMIN */}
                {activeTab === 'admin' && isAdmin && (() => {
                  const refreshXp = () => supabase.auth.getSession().then(({ data }) => {
                    if (!data.session) return
                    fetch('/api/arcade/sync-xp', { headers: { authorization: `Bearer ${data.session.access_token}` } })
                      .then(r => r.ok ? r.json() : null).then(d => { if (d?.totalXp != null) setLiveXp(d.totalXp) }).catch(() => {})
                  })
                  return <AdminPanel supabase={supabase} dark={dark} subtext={subtext} divider={divider} inputBg={inputStyle.background as string} inputBorder={inputBorder} selfId={user!.id} onRefreshXp={refreshXp} />
                })()}

              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
