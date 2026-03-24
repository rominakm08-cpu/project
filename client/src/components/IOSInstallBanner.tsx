import { useState, useEffect } from 'react'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isInStandaloneMode = () =>
  ('standalone' in window.navigator && (window.navigator as any).standalone) ||
  window.matchMedia('(display-mode: standalone)').matches

export default function IOSInstallBanner() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isIOS()) return
    if (isInStandaloneMode()) return
    const key = 'pwa-install-dismissed'
    const ts = localStorage.getItem(key)
    if (ts && Date.now() - Number(ts) < 7 * 24 * 3600 * 1000) return
    const timer = setTimeout(() => setShow(true), 3500)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
    setShow(false)
    setDismissed(true)
  }

  if (!show || dismissed) return null

  const steps = [
    {
      icon: '⎙',
      title: 'Нажмите «Поделиться»',
      desc: 'Найдите иконку "Поделиться" внизу браузера Safari',
      visual: (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'rgba(26,107,255,.15)', border: '1px solid rgba(26,107,255,.3)' }}>
            <span style={{ fontSize: 22 }}>⎙</span>
            <span style={{ fontSize: 13, color: '#5B9BFF' }}>Поделиться</span>
          </div>
        </div>
      ),
    },
    {
      icon: '➕',
      title: 'На экран «Домой»',
      desc: 'Прокрутите вниз и нажмите «На экран "Домой"»',
      visual: (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)' }}>
            <span style={{ fontSize: 22 }}>➕</span>
            <span style={{ fontSize: 13, color: 'var(--accent2)' }}>На экран «Домой»</span>
          </div>
        </div>
      ),
    },
    {
      icon: '✅',
      title: 'Нажмите «Добавить»',
      desc: 'Приложение появится на главном экране вашего iPhone',
      visual: (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'rgba(0,200,151,.15)', border: '1px solid rgba(0,200,151,.3)' }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <span style={{ fontSize: 13, color: 'var(--green)' }}>Добавить</span>
          </div>
        </div>
      ),
    },
  ]

  const current = steps[step]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end',
    }}
      onClick={dismiss}>
      <div style={{
        width: '100%',
        background: 'linear-gradient(180deg, rgba(20,12,40,.98) 0%, rgba(8,8,15,.98) 100%)',
        border: '1px solid rgba(124,58,237,.3)',
        borderBottom: 'none',
        borderRadius: '28px 28px 0 0',
        padding: '24px 24px 44px',
      }} onClick={e => e.stopPropagation()}>

        {/* Handle bar */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.2)', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #7C3AED, #1A6BFF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, flexShrink: 0,
          }}>✦</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-.3px' }}>Установить ConceptAds</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>Добавьте на главный экран</div>
          </div>
          <button style={{
            marginLeft: 'auto', background: 'rgba(255,255,255,.1)', border: 'none',
            borderRadius: 50, width: 30, height: 30, fontSize: 16, color: 'rgba(255,255,255,.5)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }} onClick={dismiss}>✕</button>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? 'var(--accent)' : 'rgba(255,255,255,.12)',
              transition: 'background .3s',
            }} />
          ))}
        </div>

        {/* Step content */}
        <div style={{
          background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 18, padding: '20px', marginBottom: 20, minHeight: 130,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, color: 'var(--accent2)',
              textTransform: 'uppercase', letterSpacing: 1,
            }}>Шаг {step + 1} из {steps.length}</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{current.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>{current.desc}</div>
          {current.visual}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1, padding: '14px', borderRadius: 16,
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
                color: 'rgba(255,255,255,.7)', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>← Назад</button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                flex: 1, padding: '14px', borderRadius: 16,
                background: 'linear-gradient(135deg, #7C3AED, #9D5CF5)',
                border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(124,58,237,.4)',
              }}>Далее →</button>
          ) : (
            <button
              onClick={dismiss}
              style={{
                flex: 1, padding: '14px', borderRadius: 16,
                background: 'linear-gradient(135deg, #00C897, #00A87E)',
                border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(0,200,151,.35)',
              }}>✅ Понятно!</button>
          )}
        </div>
      </div>
    </div>
  )
}
