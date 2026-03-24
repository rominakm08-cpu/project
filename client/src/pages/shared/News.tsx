import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { newsApi } from '../../api'
import { useStore } from '../../store'

function timeStr(d: string) {
  return new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function News() {
  const nav = useNavigate()
  const { user } = useStore()
  const isAdmin = user?.role === 'admin'
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', emoji: '📢', pinned: false })
  const [saving, setSaving] = useState(false)

  const load = () => { setLoading(true); newsApi.list().then(r => setPosts(r.data)).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(load, [])

  const create = async () => {
    if (!form.title.trim() || !form.body.trim()) { alert('Заполните заголовок и текст'); return }
    setSaving(true)
    try {
      const r = await newsApi.create(form)
      setPosts(prev => [r.data, ...prev])
      setForm({ title: '', body: '', emoji: '📢', pinned: false })
      setCreating(false)
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Удалить новость?')) return
    try { await newsApi.delete(id); setPosts(p => p.filter(x => x.id !== id)) }
    catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
  }

  const pin = async (id: number) => {
    try {
      await newsApi.pin(id)
      setPosts(p => {
        const updated = p.map(x => x.id === id ? { ...x, pinned: x.pinned ? 0 : 1 } : x)
        return updated.sort((a, b) => (b.pinned - a.pinned) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      })
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
  }

  const EMOJIS = ['📢', '🎉', '🚀', '⭐', '🔥', '💡', '🎯', '📌', '🏆', '💬', '✅', '⚡']

  return (
    <div className="page">
      <div className="ph" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-glass" style={{ padding: '8px 12px', minWidth: 'auto', fontSize: 18 }} onClick={() => nav(-1)}>←</button>
          <div style={{ flex: 1 }}>
            <h1 className="pt" style={{ marginBottom: 0 }}>📰 Новости</h1>
            <p className="ps" style={{ marginTop: 2 }}>События и обновления платформы</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13, minWidth: 'auto' }}
              onClick={() => setCreating(true)}>+ Добавить</button>
          )}
        </div>
      </div>

      <div className="sec">
        {loading && <div className="center"><div className="spin" /></div>}
        {!loading && posts.length === 0 && (
          <div className="glass card" style={{ textAlign: 'center', padding: 50 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
            <p style={{ color: 'var(--t2)', fontWeight: 700 }}>Новостей пока нет</p>
            <p style={{ color: 'var(--t3)', fontSize: 13, marginTop: 6 }}>Здесь будут появляться события и обновления платформы</p>
          </div>
        )}

        {posts.map((p, i) => (
          <div key={p.id} className="glass card" style={{
            marginBottom: 14,
            borderColor: p.pinned ? 'rgba(255,184,0,.3)' : undefined,
            background: p.pinned ? 'rgba(255,184,0,.04)' : undefined,
            position: 'relative',
          }}>
            {p.pinned === 1 && (
              <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, color: 'var(--yellow)', fontWeight: 700, background: 'rgba(255,184,0,.12)', border: '1px solid rgba(255,184,0,.25)', padding: '3px 8px', borderRadius: 6 }}>
                📌 Закреплено
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: p.pinned ? 'rgba(255,184,0,.15)' : 'var(--glass)', border: '1px solid var(--glass-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {p.emoji || '📢'}
              </div>
              <div style={{ flex: 1, paddingRight: p.pinned ? 80 : 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.3 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{timeStr(p.created_at)}</div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{p.body}</div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-glass" style={{ flex: 1, padding: '8px 0', fontSize: 12 }} onClick={() => pin(p.id)}>
                  {p.pinned ? '📌 Открепить' : '📌 Закрепить'}
                </button>
                <button className="btn btn-danger" style={{ flex: 1, padding: '8px 0', fontSize: 12 }} onClick={() => del(p.id)}>
                  🗑 Удалить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create post modal (admin) */}
      {creating && (
        <div className="overlay" onClick={() => setCreating(false)}>
          <div className="glass modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Новая публикация</h3>

            <div className="fg">
              <label className="label">Иконка</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    style={{ width: 40, height: 40, borderRadius: 10, fontSize: 20, border: `2px solid ${form.emoji === e ? 'var(--accent)' : 'var(--glass-b)'}`, background: form.emoji === e ? 'rgba(124,58,237,.15)' : 'var(--glass)', cursor: 'pointer' }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="fg">
              <label className="label">Заголовок</label>
              <input className="input" placeholder="Название новости..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="fg">
              <label className="label">Текст</label>
              <textarea className="input" placeholder="Подробности..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} />
            </div>

            <div className="fg" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" id="pin-cb" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <label htmlFor="pin-cb" style={{ fontSize: 14, cursor: 'pointer', color: 'var(--t2)' }}>📌 Закрепить вверху</label>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setCreating(false)}>Отмена</button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={saving} onClick={create}>
                {saving ? '⏳ Публикуем...' : '🚀 Опубликовать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
