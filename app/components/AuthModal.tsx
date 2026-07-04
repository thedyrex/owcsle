'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
type Mode = 'login' | 'signup'

function TosModal({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  const bg = dark ? '#111' : '#fff'
  const text = dark ? '#f0f0f0' : '#111'
  const subtext = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.6)'
  const divider = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 300,
      }} />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 301,
        width: '520px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '80vh',
        background: bg,
        borderRadius: '4px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `2px solid #f97316`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '14px', color: text }}>
            TERMS OF SERVICE
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: text, opacity: 0.35, fontSize: '18px',
            lineHeight: 1, padding: '2px 4px',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
          >✕</button>
        </div>
        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            {
              heading: '1. ACCEPTANCE',
              body: 'By creating an account or using OWCSLE, you agree to these Terms of Service. If you do not agree, do not use the site.',
            },
            {
              heading: '2. ELIGIBILITY',
              body: 'You must be at least 13 years old to use OWCSLE. By registering, you confirm that you meet this requirement.',
            },
            {
              heading: '3. ACCOUNTS',
              body: 'You are responsible for keeping your account credentials secure. You may not share, sell, or transfer your account. We reserve the right to suspend or terminate accounts that violate these terms.',
            },
            {
              heading: '4. USER CONTENT',
              body: 'Profile pictures and usernames you upload must not contain offensive, hateful, or infringing material. We reserve the right to remove content or ban accounts without notice.',
            },
            {
              heading: '5. GAME DATA & STATS',
              body: 'XP, streaks, win/loss records, and leaderboard rankings are stored for gameplay purposes only. We do not guarantee the accuracy or permanence of this data.',
            },
            {
              heading: '6. FAN PROJECT DISCLAIMER',
              body: 'OWCSLE is an unofficial fan project and is not affiliated with, endorsed by, or sponsored by Blizzard Entertainment or the Overwatch Champion Series. All Overwatch-related trademarks and intellectual property belong to their respective owners.',
            },
            {
              heading: '7. NO WARRANTIES',
              body: 'OWCSLE is provided "as is" without warranties of any kind. We are not liable for downtime, data loss, or any damages arising from use of the site.',
            },
            {
              heading: '8. CHANGES',
              body: 'We may update these terms at any time. Continued use of the site after changes constitutes acceptance of the new terms.',
            },
            {
              heading: '9. CONTACT',
              body: 'Questions about these terms? Reach out to @dyrexreal on Twitter or use the Feedback option in the settings menu.',
            },
          ].map(section => (
            <div key={section.heading}>
              <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: '#f97316', margin: '0 0 6px' }}>
                {section.heading}
              </p>
              <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: subtext, margin: 0, lineHeight: '1.7' }}>
                {section.body}
              </p>
            </div>
          ))}
          <div style={{ height: '1px', background: divider }} />
          <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)', margin: 0 }}>
            LAST UPDATED: APRIL 2026
          </p>
        </div>
      </div>
    </>,
    document.body
  )
}
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'WEAK', color: '#e53e3e' }
  if (score <= 3) return { score, label: 'FAIR', color: '#dd6b20' }
  if (score === 4) return { score, label: 'GOOD', color: '#d69e2e' }
  return { score, label: 'STRONG', color: '#22c55e' }
}
export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreedToTos, setAgreedToTos] = useState(false)
  const [showTos, setShowTos] = useState(false)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const supabase = createClient()
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setMounted(true) }, [])
  function handleClose() {
    setClosing(true)
    setTimeout(() => { setClosing(false); onClose() }, 220)
  }
  function switchMode(m: Mode) {
    const outer = outerRef.current
    const inner = innerRef.current
    if (outer && inner) {
      outer.style.transition = 'none'
      outer.style.height = inner.offsetHeight + 'px'
    }
    setMode(m)
    setError(null)
    setSuccess(null)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (outer && inner) {
          outer.style.transition = 'height 0.32s cubic-bezier(0.16,1,0.3,1)'
          outer.style.height = inner.offsetHeight + 'px'
        }
      })
    })
  }
  const strength = getStrength(password)
  const passwordsMatch = confirm === password
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'signup' && !passwordsMatch) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError(null)
    setSuccess(null)
    if (mode === 'login') {
      let loginEmail = email
      if (!email.includes('@')) {
        const res = await fetch(`/api/auth/lookup-email?username=${encodeURIComponent(email)}`)
        if (!res.ok) { setError('No account found with that username.'); setLoading(false); return }
        const data = await res.json()
        loginEmail = data.email
      }
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) { setError(error.message) } else { handleClose() }
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } })
      if (error) { setError(error.message) } else {
        const outer = outerRef.current
        const inner = innerRef.current
        if (outer && inner) {
          outer.style.transition = 'none'
          outer.style.height = inner.offsetHeight + 'px'
        }
        setSuccess('Check your email to confirm your account.')
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (outer && inner) {
              outer.style.transition = 'height 0.32s cubic-bezier(0.16,1,0.3,1)'
              outer.style.height = inner.offsetHeight + 'px'
            }
          })
        })
      }
    }
    setLoading(false)
  }
  if (!open || !mounted) return null
  const bg = dark ? '#1a1a1a' : '#f4f4f4'
  const text = dark ? '#f0f0f0' : '#111'
  const subtext = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'
  const inputBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const divider = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontFamily: "var(--font-ow-esports), sans-serif",
    fontSize: '14px',
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    borderRadius: '3px',
    color: text,
    outline: 'none',
    boxSizing: 'border-box',
  }
  return createPortal(
    <>
      <style>{`
        @keyframes authBackdropIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes authBackdropOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes authPanelIn  { from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes authPanelOut { from { opacity: 1; transform: translate(-50%, -50%); } to { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); } }
        .auth-input::placeholder { color: ${dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}; }
        .auth-input:focus { border-color: #f97316; }
      `}</style>
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 200,
        animation: closing ? 'authBackdropOut 0.22s ease-out forwards' : 'authBackdropIn 0.2s ease-out both',
      }} />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        width: '400px',
        maxWidth: 'calc(100vw - 48px)',
        background: bg,
        boxShadow: dark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 24px 64px rgba(0,0,0,0.25)',
        borderRadius: '4px',
        animation: closing ? 'authPanelOut 0.22s ease-out forwards' : 'authPanelIn 0.32s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        <div style={{
          padding: '22px 28px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #f97316',
        }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            {(['login', 'signup'] as Mode[]).map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                fontFamily: "var(--font-ow-esports), sans-serif",
                fontSize: '13px',
                color: mode === m ? '#f97316' : subtext,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                transition: 'color 0.15s',
              }}>
                {m === 'login' ? 'LOGIN' : 'SIGN UP'}
              </button>
            ))}
          </div>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: text, opacity: 0.35, fontSize: '18px',
            lineHeight: 1, padding: '2px 4px', fontFamily: 'sans-serif',
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
          >✕</button>
        </div>
        <div ref={outerRef} style={{ overflow: 'hidden' }}>
          <div ref={innerRef}>
            {success ? (
              <div style={{ padding: '40px 28px', textAlign: 'center' }}>
                <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '12px', color: '#f97316', margin: 0 }}>
                  CHECK YOUR EMAIL TO CONFIRM YOUR ACCOUNT.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mode === 'signup' && (
                  <input className="auth-input" type="text" placeholder="USERNAME" value={username}
                    onChange={e => setUsername(e.target.value)} required style={inputStyle} />
                )}
                <input className="auth-input" type="text" placeholder={mode === 'login' ? 'EMAIL OR USERNAME' : 'EMAIL'} value={email}
                  onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                <input className="auth-input" type="password" placeholder="PASSWORD" value={password}
                  onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                {mode === 'signup' && password.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '2px',
                          background: i <= strength.score ? strength.color : divider,
                          transition: 'background 0.2s',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                )}
                {mode === 'signup' && (
                  <>
                    <input className="auth-input" type="password" placeholder="CONFIRM PASSWORD" value={confirm}
                      onChange={e => setConfirm(e.target.value)} required style={{
                        ...inputStyle,
                        borderColor: confirm.length > 0 ? (passwordsMatch ? 'rgba(249,115,22,0.6)' : 'rgba(229,62,62,0.6)') : inputBorder,
                      }} />
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" required checked={agreedToTos}
                        onChange={e => setAgreedToTos(e.target.checked)}
                        style={{ marginTop: '2px', accentColor: '#f97316', flexShrink: 0, width: '14px', height: '14px', cursor: 'pointer' }} />
                      <span style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '11px', color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', lineHeight: '1.5' }}>
                        I HAVE READ AND AGREE TO THE{' '}
                        <button type="button" onClick={() => setShowTos(true)} style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontFamily: "var(--font-ow-esports), sans-serif",
                          fontSize: '11px', color: '#f97316', textDecoration: 'underline',
                        }}>TERMS OF SERVICE</button>
                      </span>
                    </label>
                  </>
                )}
                {error && (
                  <p style={{ fontFamily: "var(--font-ow-esports), sans-serif", fontSize: '10px', color: '#e53e3e', margin: 0 }}>
                    {error.toUpperCase()}
                  </p>
                )}
                <button type="submit" disabled={loading} style={{
                  marginTop: '4px', padding: '12px',
                  fontFamily: "var(--font-ow-esports), sans-serif",
                  fontSize: '12px',
                  background: loading ? (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)') : '#f97316',
                  color: loading ? (dark ? 'rgba(255,255,255,0.3)' : '#888') : '#fff',
                  border: 'none', borderRadius: '3px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  {loading ? '...' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      {showTos && <TosModal onClose={() => setShowTos(false)} dark={dark} />}
    </>,
    document.body
  )
}
