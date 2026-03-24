import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { communityApi } from '../../api'
import { useStore } from '../../store'
import { prepareAndUpload, uploadBlob } from '../../utils/media'

const ROLE_LABEL: any = { creator: 'Автор', business: 'Бренд', admin: '⭐ Admin' }
const ROLE_COLOR: any = { creator: 'var(--accent2)', business: 'var(--blue)', admin: 'var(--yellow)' }

function timeStr(d: string) {
  const dt = new Date(d)
  const now = new Date()
  const diff = now.getTime() - dt.getTime()
  if (diff < 60000) return 'только что'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`
  if (diff < 86400000) return dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Upload progress bar ───────────────────────────────────────────────────────
function UploadProgress({ percent, label }: { percent: number; label: string }) {
  return (
    <div style={{ padding: '12px 16px', background: 'var(--glass)', border: '1px solid var(--glass-b)', borderRadius: 14, margin: '8px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
        <span>{label}</span>
        <span style={{ color: 'var(--accent)' }}>{percent}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))', borderRadius: 4, transition: 'width .2s' }} />
      </div>
    </div>
  )
}

// ── Voice message player ──────────────────────────────────────────────────────
function VoicePlayer({ url, isMe }: { url: string; isMe: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const a = new Audio(url)
    audioRef.current = a
    a.onloadedmetadata = () => setDuration(isFinite(a.duration) ? a.duration : 0)
    a.ontimeupdate = () => setProgress(a.currentTime / (a.duration || 1))
    a.onended = () => { setPlaying(false); setProgress(0) }
    return () => { a.pause(); a.src = '' }
  }, [url])

  const toggle = () => {
    const a = audioRef.current!
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play(); setPlaying(true) }
  }

  const bars = Array.from({ length: 28 }, (_, i) =>
    Math.max(3, Math.abs(4 + Math.sin(i * 0.7 + i * 0.3) * 8 + Math.cos(i * 1.2) * 5))
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 190 }}>
      <button onClick={toggle} style={{
        width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
        background: isMe ? 'rgba(255,255,255,.25)' : 'linear-gradient(135deg,var(--accent),var(--accent2))',
        color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>{playing ? '⏸' : '▶'}</button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, height: 28 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 2.5, height: h, borderRadius: 2, flexShrink: 0,
            background: i / bars.length <= progress
              ? (isMe ? 'rgba(255,255,255,.9)' : 'var(--accent)')
              : (isMe ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.2)'),
            transition: 'background .1s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,.7)' : 'var(--t3)', flexShrink: 0 }}>
        {duration > 0 ? `${Math.floor(duration)}с` : '🎤'}
      </span>
    </div>
  )
}

// ── Video note (circle) ───────────────────────────────────────────────────────
function VideoNote({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)
  const toggle = () => {
    if (!ref.current) return
    if (playing) { ref.current.pause(); setPlaying(false) }
    else { ref.current.play(); setPlaying(true) }
  }
  return (
    <div onClick={toggle} style={{ width: 140, height: 140, borderRadius: '50%', overflow: 'hidden', position: 'relative', cursor: 'pointer', border: '2px solid var(--accent)', flexShrink: 0 }}>
      <video ref={ref} src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onEnded={() => setPlaying(false)} playsInline />
      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.35)' }}>
          <span style={{ fontSize: 32 }}>▶</span>
        </div>
      )}
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ m, isMe, prevSameSender }: { m: any; isMe: boolean; prevSameSender: boolean }) {
  const isVoice = m.is_voice
  const isVideoNote = m.is_video_note
  const isImage = !isVoice && !isVideoNote && m.file_type?.startsWith('image/')
  const isVideo = !isVoice && !isVideoNote && m.file_type?.startsWith('video/')
  const hasFile = !!m.file_url

  if (isVideoNote) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginTop: 10 }}>
        {!prevSameSender && !isMe && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: `linear-gradient(135deg,${ROLE_COLOR[m.role] || 'var(--accent)'},rgba(0,0,0,.3))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{m.name?.[0]}</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLOR[m.role] || 'var(--accent2)' }}>{m.name}</span>
            <span style={{ fontSize: 10, color: 'var(--t3)', padding: '2px 6px', borderRadius: 4, background: 'var(--glass)', border: '1px solid var(--glass-b)' }}>{ROLE_LABEL[m.role] || m.role}</span>
          </div>
        )}
        <VideoNote url={m.file_url} />
        <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>{timeStr(m.created_at)}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginTop: prevSameSender ? 2 : 10 }}>
      {!prevSameSender && !isMe && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: `linear-gradient(135deg,${ROLE_COLOR[m.role] || 'var(--accent)'},rgba(0,0,0,.3))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{m.name?.[0]}</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLOR[m.role] || 'var(--accent2)' }}>{m.name}</span>
          <span style={{ fontSize: 10, color: 'var(--t3)', padding: '2px 6px', borderRadius: 4, background: 'var(--glass)', border: '1px solid var(--glass-b)' }}>{ROLE_LABEL[m.role] || m.role}</span>
        </div>
      )}
      <div style={{
        maxWidth: '80%',
        padding: isVoice ? '10px 12px' : hasFile && !m.text ? '4px' : '10px 14px',
        borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        background: isMe ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--glass)',
        border: isMe ? 'none' : '1px solid var(--glass-b)',
        fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
        opacity: m._optimistic ? 0.7 : 1,
      }}>
        {isVoice && <VoicePlayer url={m.file_url} isMe={isMe} />}
        {isImage && (
          <img src={m.file_url} alt="фото" style={{ maxWidth: 240, maxHeight: 300, borderRadius: 12, display: 'block', cursor: 'pointer' }}
            onClick={() => window.open(m.file_url, '_blank')} />
        )}
        {isVideo && (
          <video src={m.file_url} controls playsInline style={{ maxWidth: 240, maxHeight: 300, borderRadius: 12, display: 'block' }} />
        )}
        {!isVoice && !isImage && !isVideo && hasFile && (
          <a href={m.file_url} download={m.file_name || 'file'} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', textDecoration: 'none', color: 'var(--t1)' }}>
            <span style={{ fontSize: 22 }}>📄</span>
            <span style={{ fontSize: 13 }}>{m.file_name || 'Файл'}</span>
          </a>
        )}
        {m.text && <div style={{ marginTop: hasFile ? 6 : 0, padding: hasFile ? '0 8px 8px' : 0 }}>{m.text}</div>}
      </div>
      <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>{timeStr(m.created_at)}</div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Community() {
  const nav = useNavigate()
  const { user } = useStore()
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<{ label: string; percent: number } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef<number>(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Voice
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Video note
  const [videoNoteMode, setVideoNoteMode] = useState(false)
  const [recordingVideo, setRecordingVideo] = useState(false)
  const [videoSeconds, setVideoSeconds] = useState(0)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const videoRecRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)

  const initialLoadedRef = useRef(false)

  const scrollToBottom = (smooth = false) =>
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })

  const loadInitial = async () => {
    try {
      const r = await communityApi.getMessages()
      const msgs = r.data
      setMessages(msgs)
      if (msgs.length > 0) lastIdRef.current = msgs[msgs.length - 1].id
      initialLoadedRef.current = true
      setTimeout(() => scrollToBottom(), 100)
    } catch { } finally { setLoading(false) }
  }

  const pollNew = async () => {
    if (!initialLoadedRef.current) return
    try {
      const r = await communityApi.getNew(lastIdRef.current)
      const newMsgs: any[] = r.data
      if (newMsgs.length > 0) {
        lastIdRef.current = newMsgs[newMsgs.length - 1].id
        setMessages(prev => {
          const ids = new Set(prev.map((m: any) => m.id))
          const fresh = newMsgs.filter(m => !ids.has(m.id))
          if (fresh.length === 0) return prev
          setTimeout(() => scrollToBottom(true), 50)
          return [...prev, ...fresh]
        })
      }
    } catch { }
  }

  useEffect(() => {
    loadInitial()
    pollRef.current = setInterval(pollNew, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      stopVideoStream()
    }
  }, [])

  const sendMessage = useCallback(async (data: any) => {
    setSending(true)
    const optimistic = {
      id: Date.now(), name: 'Вы', role: user?.role || 'creator',
      text: data.text || null, file_url: data.file_url || null,
      file_type: data.file_type || null, file_name: data.file_name || null,
      is_voice: data.is_voice || false, is_video_note: data.is_video_note || false,
      created_at: new Date().toISOString(), _optimistic: true,
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => scrollToBottom(true), 50)
    try {
      const r = await communityApi.send(data)
      const saved = r.data
      setMessages(prev => {
        const updated = prev.filter((m: any) => m.id !== optimistic.id)
        if (!updated.find(m => m.id === saved.id)) updated.push(saved)
        lastIdRef.current = Math.max(lastIdRef.current, saved.id)
        return updated
      })
    } catch {
      setMessages(prev => prev.filter((m: any) => m.id !== optimistic.id))
    }
    setSending(false)
  }, [user])

  const sendText = async () => {
    const t = text.trim()
    if (!t || sending) return
    setText('')
    await sendMessage({ text: t })
  }

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadProgress({ label: file.type.startsWith('image/') ? '🖼 Сжатие и загрузка...' : '📤 Загрузка...', percent: 0 })
    try {
      const { url, mimeType, fileName } = await prepareAndUpload(file, (p) => {
        setUploadProgress({ label: file.type.startsWith('image/') ? '🖼 Загрузка фото...' : '📤 Загрузка...', percent: p })
      })
      setUploadProgress(null)
      await sendMessage({ file_url: url, file_type: mimeType, file_name: fileName })
    } catch (err: any) {
      setUploadProgress(null)
      alert(err.message || 'Ошибка загрузки')
    }
  }

  // ── Voice recording ─────────────────────────────────────────────────────────
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const rec = new MediaRecorder(stream, { mimeType })
      mediaRecRef.current = rec
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size < 100) return
        setUploadProgress({ label: '🎤 Отправка голосового...', percent: 0 })
        try {
          const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
          const url = await uploadBlob(blob, `voice_${Date.now()}.${ext}`, p =>
            setUploadProgress({ label: '🎤 Отправка голосового...', percent: p })
          )
          setUploadProgress(null)
          await sendMessage({ file_url: url, file_type: mimeType, is_voice: true })
        } catch (err: any) {
          setUploadProgress(null)
          alert(err.message || 'Ошибка отправки')
        }
      }
      rec.start(100)
      setRecording(true)
      setRecSeconds(0)
      recTimerRef.current = setInterval(() => {
        setRecSeconds(s => { if (s >= 59) { stopVoice(); return s } return s + 1 })
      }, 1000)
    } catch { alert('Нет доступа к микрофону') }
  }

  const stopVoice = () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current)
    mediaRecRef.current?.stop()
    setRecording(false); setRecSeconds(0)
  }

  const cancelVoice = () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current)
    mediaRecRef.current?.stream?.getTracks().forEach((t: any) => t.stop())
    mediaRecRef.current = null; chunksRef.current = []
    setRecording(false); setRecSeconds(0)
  }

  // ── Video note ──────────────────────────────────────────────────────────────
  const stopVideoStream = () => {
    videoStreamRef.current?.getTracks().forEach(t => t.stop())
    videoStreamRef.current = null
  }

  const openVideoNote = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 }, audio: true })
      videoStreamRef.current = stream
      setVideoNoteMode(true); setVideoSeconds(0)
      setTimeout(() => {
        if (videoPreviewRef.current) { videoPreviewRef.current.srcObject = stream; videoPreviewRef.current.play() }
      }, 100)
    } catch { alert('Нет доступа к камере') }
  }

  const startVideoRec = () => {
    if (!videoStreamRef.current) return
    videoChunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const rec = new MediaRecorder(videoStreamRef.current, { mimeType, videoBitsPerSecond: 500_000 })
    videoRecRef.current = rec
    rec.ondataavailable = e => { if (e.data.size > 0) videoChunksRef.current.push(e.data) }
    rec.onstop = async () => {
      const blob = new Blob(videoChunksRef.current, { type: 'video/webm' })
      if (blob.size < 100) return
      stopVideoStream(); setVideoNoteMode(false); setRecordingVideo(false)
      setUploadProgress({ label: '🎥 Загрузка кружка...', percent: 0 })
      try {
        const url = await uploadBlob(blob, `videonote_${Date.now()}.webm`, p =>
          setUploadProgress({ label: '🎥 Загрузка кружка...', percent: p })
        )
        setUploadProgress(null)
        await sendMessage({ file_url: url, file_type: 'video/webm', is_video_note: true })
      } catch (err: any) {
        setUploadProgress(null)
        alert(err.message || 'Ошибка загрузки')
      }
    }
    rec.start(100); setRecordingVideo(true)
    videoTimerRef.current = setInterval(() => {
      setVideoSeconds(s => { if (s >= 14) { stopVideoRec(); return s } return s + 1 })
    }, 1000)
  }

  const stopVideoRec = () => {
    if (videoTimerRef.current) clearInterval(videoTimerRef.current)
    videoRecRef.current?.stop()
  }

  const closeVideoNote = () => {
    if (videoTimerRef.current) clearInterval(videoTimerRef.current)
    videoRecRef.current?.stop(); stopVideoStream()
    setVideoNoteMode(false); setRecordingVideo(false); setVideoSeconds(0)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', paddingTop: 'max(16px, env(safe-area-inset-top))', background: 'var(--glass)', borderBottom: '1px solid var(--glass-b)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button className="btn btn-glass" style={{ padding: '8px 12px', minWidth: 'auto', fontSize: 18, flexShrink: 0 }} onClick={() => nav(-1)}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 17 }}>💬 CONCEPT Community</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 1 }}>Чат для авторов и брендов</div>
        </div>
        <button className="btn btn-glass" style={{ padding: '8px 12px', minWidth: 'auto', fontSize: 16 }} onClick={() => nav('/news')}>📰</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        {loading && <div className="center" style={{ paddingTop: 60 }}><div className="spin" /></div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--t3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <p style={{ fontSize: 15, fontWeight: 700 }}>Станьте первым!</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Напишите что-нибудь в общий чат</p>
          </div>
        )}
        {messages.map((m: any, i: number) => {
          const isMe = !!m._optimistic || m.user_id === user?.id
          const prev = messages[i - 1]
          const prevSameSender = i > 0 && prev?.name === m.name && !prev?._optimistic && !m._optimistic
          return <MessageBubble key={m.id} m={m} isMe={isMe} prevSameSender={prevSameSender} />
        })}
        <div ref={bottomRef} />
      </div>

      {/* Upload progress */}
      {uploadProgress && <UploadProgress percent={uploadProgress.percent} label={uploadProgress.label} />}

      {/* Video note recorder */}
      {videoNoteMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div style={{ width: 240, height: 240, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${recordingVideo ? '#ef4444' : 'var(--accent)'}`, position: 'relative' }}>
            <video ref={videoPreviewRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            {recordingVideo && (
              <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                ⏺ {videoSeconds}с / 15с
              </div>
            )}
          </div>
          {/* Progress ring */}
          {recordingVideo && (
            <svg width="260" height="260" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
              <circle cx="130" cy="130" r="122" fill="none" stroke="rgba(239,68,68,.3)" strokeWidth="4" />
              <circle cx="130" cy="130" r="122" fill="none" stroke="#ef4444" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 122}`}
                strokeDashoffset={`${2 * Math.PI * 122 * (1 - videoSeconds / 15)}`}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
          )}
          <div style={{ display: 'flex', gap: 16 }}>
            {!recordingVideo ? (
              <>
                <button className="btn btn-glass" style={{ padding: '12px 24px' }} onClick={closeVideoNote}>✕ Отмена</button>
                <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }} onClick={startVideoRec}>⏺ Записать</button>
              </>
            ) : (
              <button style={{ padding: '13px 32px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer' }} onClick={stopVideoRec}>
                ⏹ Отправить
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: '8px 12px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))', background: 'var(--glass)', borderTop: '1px solid var(--glass-b)', flexShrink: 0 }}>
        {recording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px' }}>
            <button onClick={cancelVoice} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 22, cursor: 'pointer', padding: 8 }}>✕</button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 15 }}>Запись {recSeconds}с</span>
            </div>
            <button onClick={stopVoice} style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏹</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
            <button className="btn btn-glass" style={{ padding: '10px 12px', minWidth: 'auto', fontSize: 18, flexShrink: 0 }}
              onClick={() => fileInputRef.current?.click()} disabled={!!uploadProgress} title="Прикрепить">📎</button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip" style={{ display: 'none' }} onChange={handleFile} />
            <textarea className="input" value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
              placeholder="Сообщение..." rows={1} maxLength={1000}
              style={{ flex: 1, resize: 'none', overflowY: 'hidden', lineHeight: 1.5, padding: '10px 14px', fontSize: 14, margin: 0 }}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }}
            />
            <button className="btn btn-glass" style={{ padding: '10px 12px', minWidth: 'auto', fontSize: 18, flexShrink: 0 }}
              onClick={openVideoNote} disabled={!!uploadProgress} title="Кружок">🎥</button>
            {text.trim() ? (
              <button className="btn btn-primary" style={{ padding: '10px 14px', minWidth: 'auto', flexShrink: 0, fontSize: 18 }}
                disabled={sending || !!uploadProgress} onClick={sendText}>↑</button>
            ) : (
              <button className="btn btn-glass" style={{ padding: '10px 12px', minWidth: 'auto', flexShrink: 0, fontSize: 18 }}
                onClick={startVoice} disabled={!!uploadProgress} title="Голосовое">🎤</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
