import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { aiApi } from '../../api'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export default function AISupport() {
  const nav = useNavigate()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    aiApi.history().then(r => {
      setMsgs(r.data || [])
    }).catch(() => {
      setMsgs([{ role: 'assistant', content: 'Привет! Я Jarvis — AI-ассистент CONCEPT. Помогу с вопросами о платформе, офферах и работе с брендами. Чем могу помочь? 😊' }])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, sending])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const userMsg: Msg = { role: 'user', content: text }
    setMsgs(prev => [...prev, userMsg])
    try {
      const r = await aiApi.message(text)
      setMsgs(prev => [...prev, { role: 'assistant', content: r.data.message }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: '⚠️ Произошла ошибка. Попробуйте позже или напишите Jarvis' }])
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="glass" style={{ padding: '52px 20px 14px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 20 }} onClick={() => nav(-1)}>←</button>
        <div className="avatar" style={{ width: 40, height: 40, fontSize: 18, borderRadius: 12 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>AI Поддержка</div>
          <div style={{ fontSize: 12, color: 'var(--green)' }}>● Онлайн</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div className="center"><div className="spin" /></div>}

        {!loading && msgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t2)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Jarvis</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Задайте любой вопрос о платформе</p>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div className="avatar" style={{ width: 28, height: 28, fontSize: 14, borderRadius: 8, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>🤖</div>
            )}
            <div style={{
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'rgba(255,255,255,0.07)',
              border: m.role === 'assistant' ? '1px solid var(--glass-b)' : 'none',
              fontSize: 14,
              lineHeight: 1.5,
              color: 'var(--t1)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="avatar" style={{ width: 28, height: 28, fontSize: 14, borderRadius: 8 }}>🤖</div>
            <div style={{ padding: '10px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.07)', border: '1px solid var(--glass-b)' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)', animation: `pulse 1s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px 28px', background: 'rgba(8,8,15,.9)', borderTop: '1px solid var(--glass-b)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            className="input"
            placeholder="Напишите вопрос..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            style={{ flex: 1, resize: 'none', minHeight: 44, maxHeight: 120 }}
          />
          <button
            className="btn btn-primary"
            style={{ padding: '12px 18px', flexShrink: 0 }}
            disabled={!input.trim() || sending}
            onClick={send}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8, textAlign: 'center' }}>Jarvis · Powered by Claude AI</p>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  )
}
