import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { creatorApi } from '../../api'

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'threads', 'telegram']
const CATEGORIES = ['Еда и рестораны', 'Мода и стиль', 'Красота и уход', 'Спорт и фитнес', 'Путешествия', 'Технологии', 'Образование', 'Развлечения', 'Бизнес', 'Лайфстайл', 'Авто', 'Недвижимость', 'Здоровье', 'Семья и дети', 'Финансы']

export default function EditProfile() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    city: '',
    country: 'Казахстан',
    platforms: [] as string[],
    instagram: '',
    tiktok: '',
    youtube: '',
    threads: '',
    telegram: '',
    subscribers: '',
    categories: [] as string[],
    bio: '',
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    creatorApi.me().then(r => {
      const c = r.data?.creator
      if (c) {
        setForm({
          name: c.name || '',
          city: c.city || '',
          country: c.country || 'Казахстан',
          platforms: c.platforms || [],
          instagram: c.instagram || '',
          tiktok: c.tiktok || '',
          youtube: c.youtube || '',
          threads: c.threads || '',
          telegram: c.telegram || '',
          subscribers: c.subscribers ? String(c.subscribers) : '',
          categories: c.categories || [],
          bio: c.bio || '',
        })
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]

  const save = async () => {
    if (!form.name.trim()) { setErr('Укажите имя'); return }
    if (!form.city.trim()) { setErr('Укажите город'); return }
    if (form.platforms.length === 0) { setErr('Выберите хотя бы одну платформу'); return }
    setErr('')
    setSaving(true)
    try {
      await creatorApi.update({
        ...form,
        subscribers: form.subscribers ? parseInt(form.subscribers) : 0,
      })
      nav(-1)
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="center"><div className="spin" /></div>

  return (
    <div className="page">
      <div className="ph" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 20 }} onClick={() => nav(-1)}>←</button>
        <div>
          <h1 className="pt">Редактировать</h1>
          <p className="ps">Обновите ваш профиль</p>
        </div>
      </div>

      <div className="sec">
        <div className="fg">
          <label className="label">Имя / Ник</label>
          <input className="input" placeholder="Ваше имя" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="fg">
            <label className="label">Город</label>
            <input className="input" placeholder="Алматы" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="fg">
            <label className="label">Страна</label>
            <input className="input" placeholder="Казахстан" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
          </div>
        </div>

        <div className="fg">
          <label className="label">Платформы</label>
          <div className="chips">
            {PLATFORMS.map(p => (
              <button key={p} className={`chip ${form.platforms.includes(p) ? 'on' : ''}`}
                onClick={() => setForm({ ...form, platforms: toggle(form.platforms, p) })}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {form.platforms.includes('instagram') && (
          <div className="fg">
            <label className="label">Instagram</label>
            <input className="input" placeholder="@username" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} />
          </div>
        )}
        {form.platforms.includes('tiktok') && (
          <div className="fg">
            <label className="label">TikTok</label>
            <input className="input" placeholder="@username" value={form.tiktok} onChange={e => setForm({ ...form, tiktok: e.target.value })} />
          </div>
        )}
        {form.platforms.includes('youtube') && (
          <div className="fg">
            <label className="label">YouTube</label>
            <input className="input" placeholder="Канал" value={form.youtube} onChange={e => setForm({ ...form, youtube: e.target.value })} />
          </div>
        )}
        {form.platforms.includes('threads') && (
          <div className="fg">
            <label className="label">Threads</label>
            <input className="input" placeholder="@username" value={form.threads} onChange={e => setForm({ ...form, threads: e.target.value })} />
          </div>
        )}
        {form.platforms.includes('telegram') && (
          <div className="fg">
            <label className="label">Telegram</label>
            <input className="input" placeholder="@username" value={form.telegram} onChange={e => setForm({ ...form, telegram: e.target.value })} />
          </div>
        )}

        <div className="fg">
          <label className="label">Подписчиков (примерно)</label>
          <input className="input" type="number" placeholder="10000" value={form.subscribers} onChange={e => setForm({ ...form, subscribers: e.target.value })} />
        </div>

        <div className="fg">
          <label className="label">Категории контента</label>
          <div className="chips">
            {CATEGORIES.map(c => (
              <button key={c} className={`chip ${form.categories.includes(c) ? 'on' : ''}`}
                onClick={() => setForm({ ...form, categories: toggle(form.categories, c) })}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="fg">
          <label className="label">О себе</label>
          <textarea className="input" placeholder="Расскажите о себе и своём контенте..." value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={4} />
        </div>

        {err && <p className="err-text" style={{ marginBottom: 12 }}>{err}</p>}

        <button className="btn btn-primary btn-full" disabled={saving} onClick={save}>
          {saving ? '⏳ Сохраняем...' : '✅ Сохранить изменения'}
        </button>
      </div>
    </div>
  )
}
