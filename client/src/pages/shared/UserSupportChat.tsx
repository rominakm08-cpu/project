import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supportTicketApi } from '../../api'
import { prepareAndUpload } from '../../utils/media'

interface Msg {
  id: number
  ticket_id: number
  sender_role: 'user' | 'admin'
  text: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
  created_at: string
  _optimistic?: boolean
}

function FilePreview({ url, name, type }: { url: string; name?: string | null; type?: string | null }) {
  const isImage = type?.startsWith('image/')
  if (isImage) return (
    <img src={url} alt={name || 'файл'} style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10, marginTop: 6, display: 'block', cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
  )
  return (
    <a href={url} download={name || 'file'} target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,.08)', textDecoration: 'none', color: 'var(--t1)' }}>
      <span style={{ fontSize: 20 }}>📄</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{name || 'Скачать файл'}</span>
    </a>
  )
}

export default function UserSupportChat() {
  const nav = useNavigate()
  const { type } = useParams<{ type: string }>()
  const [messages, setMessages] = useState<Msg[]>([])
  const [ticketId, setTicketId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const prevMsgCountRef = useRef(0)

  const title = type === 'tech' ? '🛠 Техподдержка' : '🤝 Сотрудничество'
  const desc = type === 'tech' ? 'Ответим в течение нескольких часов' : 'Обсудим партнёрство и спецпроекты'

  const load = async () => {
    try {
      const res = await supportTicketApi.getTicket(type!)
      setTicketId(res.data.ticket.id)
      setMessages(res.data.messages)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [type])

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMsgCountRef.current = messages.length
  }, [messages])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadProgress(0)
    try {
      const { url, mimeType, fileName } = await prepareAndUpload(file, (p) => setUploadProgress(p))
      setUploadProgress(null)
      setPendingFile({ url, name: fileName, type: mimeType })
    } catch (err: any) {
      setUploadProgress(null)
      alert(err.message || 'Ошибка загрузки')
    }
  }

  const send = async () => {
    if (sending || (!text.trim() && !pendingFile)) return
    setSending(true)
    const optimistic: Msg = {
      id: Date.now(),
      ticket_id: ticketId || 0,
      sender_role: 'user',
      text: text.trim() || null,
      file_url: pendingFile?.url || null,
      file_name: pendingFile?.name || null,
      file_type: pendingFile?.type || null,
      created_at: new Date().toISOString(),
      _optimistic: true,
    }
    setMessages(p => [...p, optimistic])
    const t = text.trim()
    const pf = pendingFile
    setText('')
    setPendingFile(null)
    try {
      await supportTicketApi.sendMessage(type!, {
        text: t || undefined,
        file_url: pf?.url || undefined,
        file_name: pf?.name || undefined,
        file_type: pf?.type || undefined,
      })
      await load()
    } catch { setMessages(p => p.filter(m => m !== optimistic)) }
    setSending(false)
  }

  const fmt = (d: string) => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  let lastDate = ''

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', padding: 0 }}>
      {/* Header */}
      <div className="ph" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--glass)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-b)', padding: '12px 16px' }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 20, minWidth: 'auto' }} onClick={() => nav(-1)}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>{desc}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 8px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            Загрузка...
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{type === 'tech' ? '🛠' : '🤝'}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Начните диалог</div>
            <div style={{ color: 'var(--t2)', fontSize: 14 }}>{type === 'tech' ? 'Опишите вашу проблему, и мы поможем' : 'Расскажите о вашем предложении'}</div>
          </div>
        )}

        {messages.map((m) => {
          const msgDate = fmtDate(m.created_at)
          const showDate = msgDate !== lastDate
          lastDate = msgDate
          const isUser = m.sender_role === 'user'
          return (
            <div key={m.id}>
              {showDate && (
                <div style={{ textAlign: 'center', margin: '12px 0 8px', fontSize: 12, color: 'var(--t3)' }}>
                  <span style={{ background: 'rgba(255,255,255,.08)', padding: '3px 10px', borderRadius: 20 }}>{msgDate}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                {!isUser && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#9D5CF5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>🛡</div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isUser
                    ? 'linear-gradient(135deg,#7C3AED,#9D5CF5)'
                    : 'rgba(255,255,255,.08)',
                  border: isUser ? 'none' : '1px solid var(--glass-b)',
                  opacity: m._optimistic ? 0.7 : 1,
                }}>
                  {!isUser && <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>Команда CONCEPT</div>}
                  {m.text && <div style={{ fontSize: 15, lineHeight: 1.45 }}>{m.text}</div>}
                  {m.file_url && <FilePreview url={m.file_url} name={m.file_name} type={m.file_type} />}
                  <div style={{ fontSize: 11, color: isUser ? 'rgba(255,255,255,.6)' : 'var(--t3)', marginTop: 4, textAlign: 'right' }}>
                    {fmt(m.created_at)}{m._optimistic && ' ✓'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* File preview */}
      {pendingFile && (
        <div style={{ margin: '0 14px 8px', padding: '10px 14px', borderRadius: 12, background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>{pendingFile.type.startsWith('image/') ? '🖼' : '📄'}</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pendingFile.name}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>Готов к отправке</div>
          </div>
          <button onClick={() => setPendingFile(null)} style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div style={{ padding: '8px 14px', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4, fontWeight: 600 }}>📤 Загрузка... {uploadProgress}%</div>
          <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))', borderRadius: 4, transition: 'width .2s' }} />
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '8px 12px 12px', background: 'var(--glass)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--glass-b)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button className="btn btn-glass" style={{ padding: '10px 14px', minWidth: 'auto', fontSize: 18, flexShrink: 0, opacity: uploadProgress !== null ? .5 : 1 }}
            onClick={() => uploadProgress === null && fileInputRef.current?.click()} title="Прикрепить файл">📎</button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" style={{ display: 'none' }} onChange={handleFile} />
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Написать сообщение..."
            rows={1}
            style={{
              flex: 1, background: 'rgba(255,255,255,.07)', border: '1px solid var(--glass-b)', borderRadius: 14, padding: '10px 14px',
              color: 'var(--t1)', fontSize: 15, resize: 'none', fontFamily: 'inherit', outline: 'none',
              maxHeight: 120, overflowY: 'auto'
            }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button className="btn btn-primary" style={{ padding: '10px 16px', minWidth: 'auto', flexShrink: 0, opacity: sending || (!text.trim() && !pendingFile) ? .5 : 1 }}
            onClick={send} disabled={sending || (!text.trim() && !pendingFile)}>➤</button>
        </div>
      </div>
    </div>
  )
}
