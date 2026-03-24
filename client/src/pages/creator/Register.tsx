import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { creatorApi } from '../../api'
import { useStore } from '../../store'

const NICHES = [
  {id:'lifestyle',l:'Лайфстайл',e:'🌟'},{id:'beauty',l:'Бьюти и уход',e:'💄'},
  {id:'fitness',l:'Фитнес',e:'🏋️'},{id:'food',l:'Еда и рецепты',e:'🍕'},
  {id:'mom_kids',l:'Мама и дети',e:'👶'},{id:'travel',l:'Путешествия',e:'✈️'},
  {id:'home',l:'Дом и интерьер',e:'🏠'},{id:'fashion',l:'Мода и стиль',e:'👗'},
  {id:'animals',l:'Животные',e:'🐾'},{id:'education',l:'Образование',e:'📚'},
  {id:'tech',l:'Технологии',e:'📱'},{id:'finance',l:'Финансы и бизнес',e:'💰'},
]

export default function CreatorRegister() {
  const nav = useNavigate()
  const { init } = useStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({
    name:'', telegram:'', phone:'', city:'', country:'Казахстан',
    instagram:'', tiktok:'', threads:'',
    instagram_followers: '', tiktok_followers: '',
    niches: [] as string[], collab_format: 'both', referrer_code: ''
  })
  const s = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const igF = Number(form.instagram_followers) || 0
  const ttF = Number(form.tiktok_followers) || 0
  const maxF = Math.max(igF, ttF)
  const hasIgOrTt = !!(form.instagram || form.tiktok)
  const followersOk = !hasIgOrTt || maxF >= 1000

  const next = () => { setErr(''); setStep(s => s + 1) }

  const submit = async () => {
    setLoading(true); setErr('')
    try {
      await creatorApi.register(form)
      await init()
      nav('/')
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Ошибка. Попробуйте снова.')
    } finally { setLoading(false) }
  }

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <div className="ph">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : nav('/')}
          style={{ background: 'none', border: 'none', color: 'var(--accent2)', fontSize: 15, fontWeight: 700, marginBottom: 14, cursor: 'pointer', padding: 0 }}>
          ← Назад
        </button>
        <h1 className="pt">Регистрация креатора</h1>
        <p className="ps">Шаг {step} из 3 — {['Личные данные', 'Соцсети', 'Ниши и формат'][step - 1]}</p>
        <div className="prog">
          {[1,2,3].map(i => <div key={i} className={`prog-item ${i <= step ? 'done' : ''}`} />)}
        </div>
      </div>

      <div className="sec fu">
        {step === 1 && <>
          <div className="fg"><label className="label">Имя *</label>
            <input className="input" placeholder="Ваше имя" value={form.name} onChange={e => s('name', e.target.value)} /></div>
          <div className="fg"><label className="label">Telegram или телефон *</label>
            <input className="input" placeholder="@username или +7 777..." value={form.telegram} onChange={e => s('telegram', e.target.value)} /></div>
          <div className="fg"><label className="label">Телефон</label>
            <input className="input" placeholder="+7 777 123 45 67" value={form.phone} onChange={e => s('phone', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="fg"><label className="label">Город *</label>
              <input className="input" placeholder="Алматы" value={form.city} onChange={e => s('city', e.target.value)} /></div>
            <div className="fg"><label className="label">Страна *</label>
              <input className="input" value={form.country} onChange={e => s('country', e.target.value)} /></div>
          </div>
          {err && <p className="err-text" style={{ marginBottom: 10 }}>{err}</p>}
          <button className="btn btn-primary btn-full" onClick={() => {
            if (!form.name || !form.telegram || !form.city) return setErr('Заполните все обязательные поля')
            next()
          }}>Далее →</button>
        </>}

        {step === 2 && <>
          <p style={{ color: 'var(--t2)', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
            Укажите хотя бы одну соцсеть. Для Instagram и TikTok нужно минимум <strong>1 000 подписчиков</strong>. Threads — без ограничений.
          </p>
          {[
            { key: 'instagram', fkey: 'instagram_followers', icon: '📸', label: 'Instagram', needFollowers: true },
            { key: 'tiktok', fkey: 'tiktok_followers', icon: '🎵', label: 'TikTok', needFollowers: true },
            { key: 'threads', fkey: null, icon: '🧵', label: 'Threads', needFollowers: false },
          ].map(p => (
            <div key={p.key} className="glass card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <span style={{ fontWeight: 700 }}>{p.label}</span>
                {!p.needFollowers && <span style={{ fontSize: 11, color: 'var(--green)', background: 'rgba(0,200,151,.12)', padding: '2px 8px', borderRadius: 100 }}>Без требований</span>}
              </div>
              <input className="input" placeholder={`Ссылка на ${p.label}`}
                value={(form as any)[p.key]} onChange={e => s(p.key, e.target.value)} style={{ marginBottom: p.needFollowers ? 8 : 0 }} />
              {p.needFollowers && p.fkey && (
                <input className="input" type="number" placeholder="Количество подписчиков"
                  value={(form as any)[p.fkey]} onChange={e => s(p.fkey!, e.target.value)} />
              )}
            </div>
          ))}
          {hasIgOrTt && !followersOk && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,59,59,.1)', border: '1px solid rgba(255,59,59,.2)', color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>
              ⚠️ Минимум 1 000 подписчиков в Instagram или TikTok — обязательное условие
            </div>
          )}
          {err && <p className="err-text" style={{ marginBottom: 10 }}>{err}</p>}
          <button className="btn btn-primary btn-full" onClick={() => {
            if (!form.instagram && !form.tiktok && !form.threads) return setErr('Укажите хотя бы одну соцсеть')
            if (hasIgOrTt && !followersOk) return setErr('Нужно минимум 1 000 подписчиков в Instagram или TikTok')
            next()
          }}>Далее →</button>
        </>}

        {step === 3 && <>
          <div className="fg">
            <label className="label">Ниши (выберите до 3) *</label>
            <div className="chips">
              {NICHES.map(n => (
                <button key={n.id} className={`chip ${form.niches.includes(n.id) ? 'on' : ''}`}
                  onClick={() => {
                    if (form.niches.includes(n.id)) s('niches', form.niches.filter(x => x !== n.id))
                    else if (form.niches.length < 3) s('niches', [...form.niches, n.id])
                  }}>
                  {n.e} {n.l}
                </button>
              ))}
            </div>
          </div>
          <div className="fg" style={{ marginTop: 16 }}>
            <label className="label">Формат сотрудничества *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[{ v: 'barter', l: 'Бартер', e: '🎁' }, { v: 'payment', l: 'Оплата', e: '💰' }, { v: 'both', l: 'Гибрид', e: '✨' }].map(o => (
                <button key={o.v} className={`btn ${form.collab_format === o.v ? 'btn-primary' : 'btn-glass'}`}
                  style={{ flexDirection: 'column', gap: 4, padding: '12px 8px' }}
                  onClick={() => s('collab_format', o.v)}>
                  <span>{o.e}</span><span style={{ fontSize: 12 }}>{o.l}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="fg">
            <label className="label">Промокод реферера (если есть)</label>
            <input className="input" placeholder="Введите промокод" value={form.referrer_code}
              onChange={e => s('referrer_code', e.target.value.toUpperCase())} />
          </div>
          {err && <p className="err-text" style={{ marginBottom: 10, textAlign: 'center' }}>{err}</p>}
          <button className="btn btn-primary btn-full" disabled={loading || form.niches.length === 0}
            onClick={submit} style={{ opacity: loading ? .7 : 1 }}>
            {loading ? '⏳ Отправляем...' : '✅ Подать заявку'}
          </button>
          <p style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 12, marginTop: 12 }}>
            Заявка рассматривается командой CONCEPT в течение 24 часов
          </p>
        </>}
      </div>
    </div>
  )
}
