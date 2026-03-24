import { useEffect, useState } from 'react'
import { CreatorTabs } from '../../components/Tabs'
import { creatorApi } from '../../api'
import { useStore } from '../../store'

// ── HOME ──────────────────────────────────────────────────────────────
export function CreatorHome() {
  const { tgUser } = useStore()
  const [data, setData] = useState<any>(null)
  useEffect(() => { creatorApi.me().then(r => setData(r.data)).catch(() => {}) }, [])
  const c = data?.creator
  const refs = data?.referrals || { approved: 0 }

  return (
    <div className="page">
      <div className="ph">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: 'var(--t3)', fontSize: 13, fontWeight: 600 }}>Привет 👋</p>
            <h1 className="pt">{c?.name || tgUser?.first_name || 'Креатор'}</h1>
          </div>
          <div className="avatar">{(c?.name || 'C')[0]}</div>
        </div>
        {c && <div style={{ marginTop: 10 }}>
          <span className={`badge ${c.status === 'approved' ? 'b-approved' : c.status === 'rejected' ? 'b-rejected' : 'b-pending'}`}>
            {c.status === 'approved' ? '✅ Одобрен' : c.status === 'rejected' ? '❌ Отклонён' : '⏳ На модерации'}
          </span>
        </div>}
      </div>

      {c?.status === 'pending' && <div className="sec">
        <div className="glass-purple card">
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Заявка на рассмотрении</h3>
          <p style={{ color: 'var(--t2)', fontSize: 14, lineHeight: 1.5 }}>Команда CONCEPT рассмотрит вашу заявку в течение 24 часов и уведомит в Telegram.</p>
        </div>
      </div>}

      {c?.status === 'rejected' && <div className="sec">
        <div className="glass card" style={{ borderColor: 'rgba(255,59,59,.25)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>❌</div>
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Заявка отклонена</h3>
          <p style={{ color: 'var(--t2)', fontSize: 14 }}>{c.reject_reason || 'Не соответствует требованиям'}</p>
        </div>
      </div>}

      {c?.status === 'approved' && <>
        <div className="sec">
          <div className="stats">
            {[{ l: 'Баланс', v: `${c.balance || 0} ₸`, e: '💰' }, { l: 'Баллы', v: c.points || 0, e: '⭐' }, { l: 'Рефералов', v: `${refs.approved}/5`, e: '👥' }].map(x => (
              <div key={x.l} className="glass stat"><div style={{ fontSize: 18 }}>{x.e}</div><div className="stat-v">{x.v}</div><div className="stat-l">{x.l}</div></div>
            ))}
          </div>
        </div>
        <div className="sec">
          <div className="sec-title">Реферальная программа</div>
          <div className="glass card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ color: 'var(--t2)', fontSize: 14 }}>Ваш промокод</span>
              <div onClick={() => navigator.clipboard?.writeText(c.promo_code)}
                style={{ padding: '4px 14px', borderRadius: 8, background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)', fontFamily: 'monospace', fontWeight: 800, fontSize: 17, color: 'var(--accent2)', letterSpacing: 1, cursor: 'pointer' }}>
                {c.promo_code}
              </div>
            </div>
            <div style={{ background: 'var(--glass-b)', height: 5, borderRadius: 3 }}>
              <div style={{ width: `${Math.min((refs.approved / 5) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg,var(--accent),var(--accent2))', borderRadius: 3, transition: 'width .5s' }} />
            </div>
            <p style={{ color: 'var(--t2)', fontSize: 12, marginTop: 7 }}>{refs.approved} из 5 одобренных → <strong style={{ color: 'var(--green)' }}>5 000 ₸</strong></p>
          </div>
        </div>
        <div className="sec">
          <div className="sec-title">Мои баллы</div>
          <div className="glass card">
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--yellow)' }}>⭐ {c.points || 0}</div>
            <p style={{ color: 'var(--t2)', fontSize: 13, marginTop: 6 }}>1 000 баллов = 500 ₸ · 2 000 баллов = 1 000 ₸</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span className="chip" style={{ fontSize: 11 }}>👍 Лайк = 20 баллов</span>
              <span className="chip" style={{ fontSize: 11 }}>💬 Комментарий = 30 баллов</span>
            </div>
          </div>
        </div>
      </>}
      <CreatorTabs />
    </div>
  )
}

// ── OFFERS ────────────────────────────────────────────────────────────
export function CreatorOffers() {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [applying, setApplying] = useState<number | null>(null)

  useEffect(() => { creatorApi.getOffers().then(r => setOffers(r.data)).catch(() => {}).finally(() => setLoading(false)) }, [])

  const apply = async (o: any) => {
    setApplying(o.id)
    try {
      await creatorApi.applyOffer(o.id, msg)
      setOffers(prev => prev.map(x => x.id === o.id ? { ...x, applied: true } : x))
      setModal(null); setMsg('')
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setApplying(null) }
  }

  const RULES = `• Запрещено использовать ИИ при написании поста\n• Публикуйте только с личного аккаунта\n• Запрещено упоминать другие бренды\n• Нельзя удалять опубликованные посты — бан\n• Делайте паузу минимум 2 часа между проектами`

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Офферы</h1><p className="ps">Актуальные задания от брендов</p></div>
      <div className="sec">
        {loading && <div className="center"><div className="spin" /></div>}
        {!loading && offers.length === 0 && (
          <div className="glass card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: 'var(--t2)' }}>Пока нет офферов</p>
            <p style={{ color: 'var(--t3)', fontSize: 13, marginTop: 6 }}>Мы уведомим вас когда появятся новые задания</p>
          </div>
        )}
        {offers.map(o => (
          <div key={o.id} className="glass card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 16, borderRadius: 10 }}>{o.brand_name?.[0] || 'B'}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{o.brand_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>{o.platform?.toUpperCase()}</div>
                </div>
              </div>
              {o.budget > 0 && <div style={{ padding: '4px 12px', borderRadius: 100, background: 'rgba(0,200,151,.1)', border: '1px solid rgba(0,200,151,.2)', color: 'var(--green)', fontWeight: 800, fontSize: 14 }}>{Number(o.budget).toLocaleString()} ₸</div>}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{o.title}</h3>
            <p style={{ color: 'var(--t2)', fontSize: 14, lineHeight: 1.5, marginBottom: 10 }}>{o.description}</p>
            {o.what_to_show && <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 6 }}>📌 <strong>Что показать:</strong> {o.what_to_show}</p>}
            {o.video_length && <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 6 }}>⏱ <strong>Длина:</strong> {o.video_length}</p>}
            {o.deadline && <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 10 }}>📅 Дедлайн: {new Date(o.deadline).toLocaleDateString('ru-RU')}</p>}
            {!o.can_apply && !o.applied && (
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,184,0,.08)', border: '1px solid rgba(255,184,0,.2)', color: 'var(--yellow)', fontSize: 12, marginBottom: 10 }}>
                ⚠️ Ваша платформа не совпадает. Вы не можете откликнуться на этот оффер.
              </div>
            )}
            <button className={`btn ${o.applied ? 'btn-glass' : o.can_apply ? 'btn-primary' : 'btn-glass'} btn-full`}
              disabled={o.applied || !o.can_apply}
              onClick={() => { if (!o.applied && o.can_apply) setModal(o) }}>
              {o.applied ? '✓ Отклик отправлен' : o.can_apply ? '📩 Откликнуться' : '🔒 Не доступно'}
            </button>
          </div>
        ))}
      </div>
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="glass modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{modal.title}</h3>
            <div className="rules" style={{ marginBottom: 14 }}>
              <h4>Правила участия</h4>
              {RULES.split('\n').map((r, i) => <div key={i}>{r}</div>)}
            </div>
            <textarea className="input" placeholder="Добавьте сообщение (необязательно)..." value={msg} onChange={e => setMsg(e.target.value)} rows={3} style={{ marginBottom: 12 }} />
            <button className="btn btn-primary btn-full" disabled={applying === modal.id} onClick={() => apply(modal)}>
              {applying === modal.id ? '⏳ Отправляем...' : '✅ Откликнуться'}
            </button>
          </div>
        </div>
      )}
      <CreatorTabs />
    </div>
  )
}

// ── PROJECTS ──────────────────────────────────────────────────────────
export function CreatorProjects() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadId, setUploadId] = useState<number | null>(null)
  const [url, setUrl] = useState('')
  const [sub, setSub] = useState(false)

  useEffect(() => { creatorApi.getProjects().then(r => setProjects(r.data)).catch(() => {}).finally(() => setLoading(false)) }, [])

  const STATUS: any = {
    new: { l: 'Новый', c: 'b-pending', e: '🆕' },
    in_progress: { l: 'В работе', c: 'b-active', e: '▶️' },
    review: { l: 'На проверке', c: 'b-review', e: '👀' },
    revision: { l: 'Правки', c: 'b-revision', e: '✏️' },
    done: { l: 'Принят', c: 'b-done', e: '✅' },
    paid: { l: 'Оплачен', c: 'b-paid', e: '💰' },
    closed: { l: 'Закрыт', c: 'b-pending', e: '🏁' },
  }

  const upload = async () => {
    if (!url.trim() || !uploadId) return
    setSub(true)
    try {
      await creatorApi.uploadContent(uploadId, url)
      setProjects(p => p.map(x => x.id === uploadId ? { ...x, status: 'review', content_url: url } : x))
      setUploadId(null); setUrl('')
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setSub(false) }
  }

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Мои проекты</h1><p className="ps">{projects.length} проект{projects.length === 1 ? '' : 'а'}</p></div>
      <div className="sec">
        {loading && <div className="center"><div className="spin" /></div>}
        {!loading && projects.length === 0 && (
          <div className="glass card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <p style={{ color: 'var(--t2)' }}>Пока нет проектов</p>
          </div>
        )}
        {projects.map(p => {
          const st = STATUS[p.status] || { l: p.status, c: 'b-pending', e: '📋' }
          return (
            <div key={p.id} className="glass card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, flex: 1, paddingRight: 10 }}>{p.title}</h3>
                <span className={`badge ${st.c}`}>{st.e} {st.l}</span>
              </div>
              <p style={{ color: 'var(--t3)', fontSize: 13, marginBottom: 8 }}>{p.brand_name} · {p.platform?.toUpperCase()}</p>
              {p.amount > 0 && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'rgba(0,200,151,.1)', border: '1px solid rgba(0,200,151,.2)', color: 'var(--green)', fontWeight: 800, fontSize: 14, marginBottom: 10 }}>💰 {Number(p.amount).toLocaleString()} ₸</div>}
              {p.feedback && <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,184,0,.07)', border: '1px solid rgba(255,184,0,.18)', fontSize: 13, color: 'var(--yellow)', marginBottom: 10 }}>💬 {p.feedback}</div>}
              {p.content_url && <a href={p.content_url} target="_blank" rel="noreferrer" style={{ display: 'block', color: 'var(--accent2)', fontSize: 13, marginBottom: 10 }}>🔗 Просмотреть загруженный контент</a>}
              {(p.status === 'in_progress' || p.status === 'revision') && (
                <button className="btn btn-primary btn-full" onClick={() => setUploadId(p.id)}>📤 Загрузить контент</button>
              )}
            </div>
          )
        })}
      </div>
      {uploadId && (
        <div className="overlay" onClick={() => setUploadId(null)}>
          <div className="glass modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Загрузить контент</h3>
            <div className="fg"><label className="label">Ссылка на публикацию</label>
              <input className="input" placeholder="https://www.instagram.com/p/..." value={url} onChange={e => setUrl(e.target.value)} />
              <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>Вставьте ссылку на готовую публикацию в Instagram, TikTok или Threads</p>
            </div>
            <button className="btn btn-primary btn-full" disabled={sub || !url.trim()} onClick={upload}>
              {sub ? '⏳ Отправляем...' : '✅ Отправить на проверку'}
            </button>
          </div>
        </div>
      )}
      <CreatorTabs />
    </div>
  )
}

// ── PROFILE ───────────────────────────────────────────────────────────
export function CreatorProfile() {
  const { tgUser } = useStore()
  const [data, setData] = useState<any>(null)
  useEffect(() => { creatorApi.me().then(r => setData(r.data)).catch(() => {}) }, [])
  const c = data?.creator
  const txns = data?.transactions || []
  const refs = data?.referrals || { approved: 0 }
  if (!c) return <div className="center"><div className="spin" /></div>

  return (
    <div className="page">
      <div className="ph">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 20 }}>
          <div className="avatar" style={{ width: 80, height: 80, fontSize: 36, borderRadius: 24, marginBottom: 12, boxShadow: '0 0 40px rgba(124,58,237,.4)' }}>{c.name[0]}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{c.name}</h1>
          <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 4 }}>📍 {c.city}, {c.country}</p>
          <div style={{ marginTop: 8 }}>
            <span className={`badge ${c.status === 'approved' ? 'b-approved' : c.status === 'rejected' ? 'b-rejected' : 'b-pending'}`}>
              {c.status === 'approved' ? '✅ Одобрен' : c.status === 'rejected' ? '❌ Отклонён' : '⏳ На модерации'}
            </span>
          </div>
        </div>
      </div>
      <div className="sec">
        <div className="stats">
          {[{ l: 'Баланс', v: `${c.balance || 0} ₸`, e: '💰' }, { l: 'Баллы', v: c.points || 0, e: '⭐' }, { l: 'Рефералов', v: `${refs.approved}/5`, e: '👥' }].map(x => (
            <div key={x.l} className="glass stat"><div style={{ fontSize: 16 }}>{x.e}</div><div className="stat-v" style={{ fontSize: 18 }}>{x.v}</div><div className="stat-l">{x.l}</div></div>
          ))}
        </div>
      </div>
      <div className="sec">
        <div className="sec-title">Промокод</div>
        <div className="glass card" onClick={() => navigator.clipboard?.writeText(c.promo_code)} style={{ cursor: 'pointer', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Нажмите чтобы скопировать</p>
          <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 900, color: 'var(--accent2)', letterSpacing: 2 }}>{c.promo_code}</div>
          <div style={{ marginTop: 10, background: 'var(--glass-b)', height: 4, borderRadius: 2 }}>
            <div style={{ width: `${Math.min((refs.approved / 5) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg,var(--accent),var(--accent2))', borderRadius: 2 }} />
          </div>
          <p style={{ color: 'var(--t2)', fontSize: 12, marginTop: 6 }}>{refs.approved} из 5 → <strong style={{ color: 'var(--green)' }}>5 000 ₸</strong></p>
        </div>
      </div>
      {txns.length > 0 && <div className="sec">
        <div className="sec-title">История транзакций</div>
        {txns.map((t: any) => (
          <div key={t.id} className="glass card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div><div style={{ fontSize: 14, fontWeight: 500 }}>{t.description}</div><div style={{ fontSize: 12, color: 'var(--t3)' }}>{new Date(t.created_at).toLocaleDateString('ru-RU')}</div></div>
            <div style={{ fontWeight: 800, color: t.amount > 0 ? 'var(--green)' : 'var(--red)', fontSize: 15 }}>{t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()} ₸</div>
          </div>
        ))}
      </div>}
      <div className="sec">
        <button className="btn btn-glass btn-full" onClick={() => (window as any).Telegram?.WebApp?.openTelegramLink('https://t.me/Jamaal_concept')}>💬 Написать в поддержку</button>
      </div>
      <CreatorTabs />
    </div>
  )
}

export default CreatorHome
