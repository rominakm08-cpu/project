import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminSupportApi } from '../../api'
import { prepareAndUpload } from '../../utils/media'

interface Ticket {
  id: number
  user_id: number
  user_name: string
  type: 'tech' | 'partnership'
  status: string
  unread_admin: number
  last_message: string | null
  last_message_at: string | null
  updated_at: string
}

interface Msg {
  id: number
  ticket_id: number
  sender_role: 'user' | 'admin'
  text: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
  created_at: string
}

function FilePreview({ url, name, type }: { url: string; name?: string | null; type?: string | null }) {
  const isImage = type?.startsWith('image/')
  if (isImage) return (
    <img src={url} alt={name || 'файл'} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, marginTop: 6, display: 'block', cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
  )
  return (
    <a href={url} download={name || 'file'} target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,.08)', textDecoration: 'none', color: 'var(--t1)' }}>
      <span style={{ fontSize: 20 }}>📄</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{name || 'Скачать файл'}</span>
    </a>
  )
}

export default function AdminSupportInbox() {
  const nav = useNavigate()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'tech' | 'partnership'>('all')
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const loadTickets = async () => {
    try {
      const res = await adminSupportApi.getTickets()
      setTickets(res.data)
    } catch { } finally { setLoading(false) }
  }

  const loadMessages = async (ticket: Ticket, showLoader = false) => {
    if (showLoader) setChatLoading(true)
    try {
      const res = await adminSupportApi.getMessages(ticket.id)
      setMessages(res.data.messages)
      setActiveTicket(res.data.ticket)
      setTickets(p => p.map(t => t.id === ticket.id ? { ...t, unread_admin: 0 } : t))
    } catch { } finally { if (showLoader) setChatLoading(false) }
  }

  useEffect(() => {
    loadTickets()
    pollRef.current = setInterval(loadTickets, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    if (!activeTicket) return
    const poll = setInterval(() => loadMessages(activeTicket), 4000)
    return () => clearInterval(poll)
  }, [activeTicket?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

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

  const sendReply = async () => {
    if (!activeTicket || replying || (!replyText.trim() && !pendingFile)) return
    setReplying(true)
    const t = replyText.trim()
    const pf = pendingFile
    setReplyText('')
    setPendingFile(null)
    try {
      await adminSupportApi.reply(activeTicket.id, {
        text: t || undefined,
        file_url: pf?.url || undefined,
        file_name: pf?.name || undefined,
        file_type: pf?.type || undefined,
      })
      await loadMessages(activeTicket)
    } catch { }
    setReplying(false)
  }

  const closeTicket = async () => {
    if (!activeTicket) return
    await adminSupportApi.close(activeTicket.id)
    setActiveTicket(p => p ? { ...p, status: 'closed' } : p)
    await loadTickets()
  }

  const filteredTickets = tickets.filter(t => filter === 'all' || t.type === filter)
  const totalUnread = tickets.reduce((acc, t) => acc + (t.unread_admin || 0), 0)

  const fmt = (d: string) => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  const typeLabel = (t: string) => t === 'tech' ? '🛠 Техподдержка' : '🤝 Сотрудничество'
  const typeColor = (t: string) => t === 'tech' ? 'rgba(26,107,255,.2)' : 'rgba(0,200,151,.2)'
  const typeBorder = (t: string) => t === 'tech' ? 'rgba(26,107,255,.4)' : 'rgba(0,200,151,.4)'

  let lastDate = ''

  // ── Chat view ──────────────────────────────────────────────────────────────
  if (activeTicket) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', padding: 0 }}>
        <div className="ph" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--glass)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-b)', padding: '12px 14px', flexShrink: 0 }}>
          <button className="btn btn-glass" style={{ padding: '8px 12px', fontSize: 18, minWidth: 'auto' }} onClick={() => { setActiveTicket(null); setMessages([]) }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{activeTicket.user_name}</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', display: 'flex', gap: 8 }}>
              <span style={{ background: typeColor(activeTicket.type), border: `1px solid ${typeBorder(activeTicket.type)}`, borderRadius: 8, padding: '1px 7px', fontSize: 11 }}>{typeLabel(activeTicket.type)}</span>
              <span style={{ color: activeTicket.status === 'closed' ? '#f87171' : activeTicket.status === 'answered' ? '#4ade80' : '#fbbf24' }}>
                {activeTicket.status === 'closed' ? '🔒 Закрыт' : activeTicket.status === 'answered' ? '✅ Отвечено' : '🟡 Открыт'}
              </span>
            </div>
          </div>
          {activeTicket.status !== 'closed' && (
            <button className="btn btn-glass" style={{ padding: '7px 12px', fontSize: 12, minWidth: 'auto', color: '#f87171' }} onClick={closeTicket}>🔒 Закрыть</button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 8px' }}>
          {chatLoading && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Загрузка...</div>
          )}
          {messages.map((m) => {
            const msgDate = fmtDate(m.created_at)
            const showDate = msgDate !== lastDate
            lastDate = msgDate
            const isAdmin = m.sender_role === 'admin'
            return (
              <div key={m.id}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '12px 0 8px', fontSize: 12, color: 'var(--t3)' }}>
                    <span style={{ background: 'rgba(255,255,255,.08)', padding: '3px 10px', borderRadius: 20 }}>{msgDate}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                  {!isAdmin && (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end', fontWeight: 700 }}>
                      {activeTicket.user_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: isAdmin ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isAdmin ? 'linear-gradient(135deg,#7C3AED,#9D5CF5)' : 'rgba(255,255,255,.08)',
                    border: isAdmin ? 'none' : '1px solid var(--glass-b)',
                  }}>
                    {!isAdmin && <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>{activeTicket.user_name}</div>}
                    {isAdmin && <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>Вы (Admin)</div>}
                    {m.text && <div style={{ fontSize: 15, lineHeight: 1.45 }}>{m.text}</div>}
                    {m.file_url && <FilePreview url={m.file_url} name={m.file_name} type={m.file_type} />}
                    <div style={{ fontSize: 11, color: isAdmin ? 'rgba(255,255,255,.55)' : 'var(--t3)', marginTop: 4, textAlign: 'right' }}>{fmt(m.created_at)}</div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {activeTicket.status !== 'closed' && (
          <>
            {uploadProgress !== null && (
              <div style={{ margin: '0 14px 6px', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4, fontWeight: 600 }}>📤 Загрузка... {uploadProgress}%</div>
                <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))', borderRadius: 4, transition: 'width .2s' }} />
                </div>
              </div>
            )}
            {pendingFile && (
              <div style={{ margin: '0 14px 6px', padding: '8px 12px', borderRadius: 10, background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>{pendingFile.type.startsWith('image/') ? '🖼' : '📄'}</span>
                <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</span>
                <button onClick={() => setPendingFile(null)} style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 18, cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
            )}
            <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--glass-b)', background: 'var(--glass)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <button className="btn btn-glass" style={{ padding: '10px 12px', minWidth: 'auto', fontSize: 18, flexShrink: 0 }} onClick={() => fileInputRef.current?.click()}>📎</button>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" style={{ display: 'none' }} onChange={handleFile} />
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                  placeholder="Ответить..."
                  rows={1}
                  style={{ flex: 1, background: 'rgba(255,255,255,.07)', border: '1px solid var(--glass-b)', borderRadius: 14, padding: '10px 14px', color: 'var(--t1)', fontSize: 15, resize: 'none', fontFamily: 'inherit', outline: 'none', maxHeight: 100 }}
                  onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }}
                />
                <button className="btn btn-primary" style={{ padding: '10px 16px', minWidth: 'auto', flexShrink: 0, opacity: replying || (!replyText.trim() && !pendingFile) ? .5 : 1 }}
                  onClick={sendReply} disabled={replying || (!replyText.trim() && !pendingFile)}>➤</button>
              </div>
            </div>
          </>
        )}
        {activeTicket.status === 'closed' && (
          <div style={{ padding: 14, textAlign: 'center', color: 'var(--t3)', fontSize: 14, borderTop: '1px solid var(--glass-b)' }}>🔒 Тикет закрыт</div>
        )}
      </div>
    )
  }

  // ── Ticket list ────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="ph" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 20, minWidth: 'auto' }} onClick={() => nav('/admin')}>←</button>
        <div style={{ flex: 1 }}>
          <h1 className="pt" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Поддержка
            {totalUnread > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 13, fontWeight: 700 }}>{totalUnread}</span>}
          </h1>
          <p className="ps">Входящие обращения</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="sec" style={{ paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', 'Все'], ['tech', '🛠 Тех.поддержка'], ['partnership', '🤝 Сотрудничество']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v as any)}
              className={filter === v ? 'btn btn-primary' : 'btn btn-glass'}
              style={{ padding: '7px 14px', fontSize: 13, flex: 1 }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="sec">
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Загрузка...</div>}

        {!loading && filteredTickets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Нет обращений</div>
            <div style={{ color: 'var(--t2)', fontSize: 14 }}>Все запросы пользователей появятся здесь</div>
          </div>
        )}

        {filteredTickets.map(t => (
          <div key={t.id} className="glass card" onClick={() => { setActiveTicket(t); loadMessages(t, true) }}
            style={{ marginBottom: 10, cursor: 'pointer', borderLeft: `4px solid ${t.type === 'tech' ? 'rgba(26,107,255,.6)' : 'rgba(0,200,151,.6)'}`, transition: 'opacity .15s' }}
            onMouseOver={e => (e.currentTarget.style.opacity = '.85')} onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: typeColor(t.type), border: `1px solid ${typeBorder(t.type)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {t.type === 'tech' ? '🛠' : '🤝'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.user_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {t.unread_admin > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{t.unread_admin}</span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--t3)' }}>{t.last_message_at ? fmtDate(t.last_message_at) : fmtDate(t.updated_at)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{typeLabel(t.type)}</div>
                {t.last_message && (
                  <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.last_message}</div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8,
                  background: t.status === 'closed' ? 'rgba(248,113,113,.15)' : t.status === 'answered' ? 'rgba(74,222,128,.15)' : 'rgba(251,191,36,.15)',
                  color: t.status === 'closed' ? '#f87171' : t.status === 'answered' ? '#4ade80' : '#fbbf24',
                }}>
                  {t.status === 'closed' ? '🔒' : t.status === 'answered' ? '✅' : '🟡'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
