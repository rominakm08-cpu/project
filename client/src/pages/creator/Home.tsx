import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreatorTabs } from '../../components/Tabs'
import { creatorApi } from '../../api'
import { useStore } from '../../store'

// ── Theme helper ─────────────────────────────────────────────────────────────
function getTheme() { return localStorage.getItem('theme') || 'dark' }
function applyTheme(t: string) {
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '')
  localStorage.setItem('theme', t)
}
// Apply on load
applyTheme(getTheme())

// ── Social network helper ────────────────────────────────────────────────────
function SocialRow({ icon, label, handle, followers, minForVerify }: {
  icon: string; label: string; handle?: string; followers?: number; minForVerify?: number
}) {
  const nav = useNavigate()
  const connected = !!handle
  const verified = connected && !!minForVerify && (followers || 0) >= minForVerify

  let statusEl
  if (!connected) {
    statusEl = <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>Не подключено</span>
  } else if (verified) {
    statusEl = <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>✅ Верифицировано</span>
  } else {
    statusEl = <span style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 700 }}>Подключено</span>
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'var(--glass)', border: '1px solid var(--glass-b)', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
          <div style={{ marginTop: 2 }}>
            {connected
              ? <span style={{ fontSize: 12, color: 'var(--t2)' }}>@{handle} {followers ? `· ${followers.toLocaleString()}` : ''}</span>
              : <span style={{ fontSize: 12, color: 'var(--t3)' }}>Не добавлено</span>
            }
          </div>
          <div style={{ marginTop: 3 }}>{statusEl}</div>
        </div>
      </div>
      <button className="btn btn-glass" style={{ padding: '6px 14px', fontSize: 12, minWidth: 'auto' }}
        onClick={() => nav('/edit-profile')}>
        {connected ? 'Обновить' : 'Подключить'}
      </button>
    </div>
  )
}

// ── Creator Home ─────────────────────────────────────────────────────────────
export function CreatorHome() {
  const { tgUser } = useStore()
  const nav = useNavigate()
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-glass" style={{ padding: '8px 12px', fontSize: 18, minWidth: 'auto' }} onClick={() => nav('/notifications')} title="Уведомления">🔔</button>
            <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => nav('/support')} title="Поддержка">🤖</div>
          </div>
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
            {[{ l: 'Баланс', v: `${(c.balance || 0).toLocaleString()} ₸`, e: '💰' }, { l: 'Баллы', v: c.points || 0, e: '⭐' }, { l: 'Рефералов', v: `${refs.approved}/5`, e: '👥' }].map(x => (
              <div key={x.l} className="glass stat"><div style={{ fontSize: 18 }}>{x.e}</div><div className="stat-v">{x.v}</div><div className="stat-l">{x.l}</div></div>
            ))}
          </div>
        </div>

        <div className="sec">
          <div className="sec-title">Быстрый доступ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { e: '💬', t: 'Чат', d: 'Общий чат авторов', p: '/community', color: 'rgba(124,58,237,.12)', border: 'rgba(124,58,237,.3)' },
              { e: '📰', t: 'Новости', d: 'События платформы', p: '/news', color: 'rgba(26,107,255,.08)', border: 'rgba(26,107,255,.2)' },
              { e: '⭐', t: 'За бонусы', d: 'Задания за баллы', p: '/bonuses', color: 'rgba(255,184,0,.1)', border: 'rgba(255,184,0,.25)' },
              { e: '💼', t: 'Баланс', d: 'Пополнить / вывести', p: '/balance', color: 'rgba(0,200,151,.08)', border: 'rgba(0,200,151,.2)' },
              { e: '📂', t: 'Проекты', d: 'Мои задания', p: '/projects', color: 'rgba(26,107,255,.08)', border: 'rgba(26,107,255,.2)' },
              { e: '🛠', t: 'Поддержка', d: 'Помощь и Jarvis', p: '/support', color: 'rgba(157,92,245,.1)', border: 'rgba(157,92,245,.25)' },
            ].map(x => (
              <div key={x.p} onClick={() => nav(x.p)} className="glass card"
                style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 12px', margin: 0, background: x.color, borderColor: x.border }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{x.e}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{x.t}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>{x.d}</div>
              </div>
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

// ── Creator Offers ────────────────────────────────────────────────────────────
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

// ── Creator Projects ──────────────────────────────────────────────────────────
export function CreatorProjects() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadId, setUploadId] = useState<number | null>(null)
  const [detailProject, setDetailProject] = useState<any>(null)
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
      <div className="ph"><h1 className="pt">Мои проекты</h1><p className="ps">{projects.length} проект{projects.length === 1 ? '' : projects.length >= 5 ? 'ов' : 'а'}</p></div>
      <div className="sec">
        {loading && <div className="center"><div className="spin" /></div>}
        {!loading && projects.length === 0 && (
          <div className="glass card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <p style={{ color: 'var(--t2)' }}>Пока нет проектов</p>
            <p style={{ color: 'var(--t3)', fontSize: 13, marginTop: 6 }}>Откликнитесь на оффер, чтобы получить проект</p>
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
              {p.feedback && <div style={{ padding: '10px 12px', borderRadius: 10, background: p.status === 'revision' ? 'rgba(255,184,0,.07)' : 'rgba(255,255,255,.04)', border: `1px solid ${p.status === 'revision' ? 'rgba(255,184,0,.18)' : 'var(--glass-b)'}`, fontSize: 13, color: p.status === 'revision' ? 'var(--yellow)' : 'var(--t2)', marginBottom: 10 }}>
                {p.status === 'revision' ? '✏️ Правки: ' : '💬 '}{p.feedback}
              </div>}
              {p.content_url && <a href={p.content_url} target="_blank" rel="noreferrer" style={{ display: 'block', color: 'var(--accent2)', fontSize: 13, marginBottom: 10 }}>🔗 Просмотреть загруженный контент</a>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-glass" style={{ flex: 1, padding: '10px 0', fontSize: 13 }} onClick={() => setDetailProject(p)}>
                  📋 Детали
                </button>
                {(p.status === 'in_progress' || p.status === 'revision') && (
                  <button className="btn btn-primary" style={{ flex: 2, padding: '10px 0', fontSize: 13 }} onClick={() => setUploadId(p.id)}>📤 Загрузить контент</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Upload modal */}
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

      {/* Project detail modal */}
      {detailProject && (
        <div className="overlay" onClick={() => setDetailProject(null)}>
          <div className="glass modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{detailProject.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 16 }}>{detailProject.brand_name}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { l: 'Платформа', v: detailProject.platform?.toUpperCase() },
                { l: 'Заработок', v: detailProject.amount > 0 ? `${Number(detailProject.amount).toLocaleString()} ₸` : 'По договорённости' },
                { l: 'Локация', v: detailProject.location || 'Казахстан' },
                { l: 'Статус', v: (STATUS[detailProject.status] || {}).l || detailProject.status },
              ].map(x => (
                <div key={x.l} className="glass" style={{ padding: '12px 14px', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>{x.l}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{x.v}</div>
                </div>
              ))}
            </div>

            {detailProject.description && <>
              <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Описание проекта</div>
              <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 16 }}>{detailProject.description}</p>
            </>}

            {detailProject.what_to_show && <>
              <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Задание</div>
              <div className="info-block" style={{ marginBottom: 16 }}>📌 {detailProject.what_to_show}</div>
            </>}

            {detailProject.feedback && <div style={{ padding: '12px 14px', borderRadius: 12, background: detailProject.status === 'revision' ? 'rgba(255,184,0,.08)' : 'rgba(255,255,255,.04)', border: `1px solid ${detailProject.status === 'revision' ? 'rgba(255,184,0,.2)' : 'var(--glass-b)'}`, fontSize: 14, color: detailProject.status === 'revision' ? 'var(--yellow)' : 'var(--t2)', marginBottom: 16 }}>
              {detailProject.status === 'revision' ? '✏️ Что исправить: ' : '💬 '}{detailProject.feedback}
            </div>}

            {detailProject.content_url && <a href={detailProject.content_url} target="_blank" rel="noreferrer" className="btn btn-glass btn-full" style={{ marginBottom: 10 }}>🔗 Загруженный контент</a>}

            {(detailProject.status === 'in_progress' || detailProject.status === 'revision') && (
              <button className="btn btn-primary btn-full" onClick={() => { setDetailProject(null); setUploadId(detailProject.id) }}>📤 Загрузить контент</button>
            )}
          </div>
        </div>
      )}

      <CreatorTabs />
    </div>
  )
}

// ── Creator Profile ───────────────────────────────────────────────────────────
export function CreatorProfile() {
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [theme, setTheme] = useState(getTheme())
  const [claiming, setClaiming] = useState(false)
  const [claimMsg, setClaimMsg] = useState('')

  useEffect(() => { creatorApi.me().then(r => setData(r.data)).catch(() => {}) }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const claimReferral = async () => {
    setClaiming(true)
    setClaimMsg('')
    try {
      await creatorApi.claimReferralBonus()
      setClaimMsg('✅ 5 000 ₸ начислено на ваш баланс!')
      const r = await creatorApi.me()
      setData(r.data)
    } catch (e: any) {
      setClaimMsg(e.response?.data?.error || 'Ошибка')
    }
    setClaiming(false)
  }

  const c = data?.creator
  const txns = data?.transactions || []
  const refs = data?.referrals || { approved: 0 }

  if (!c) return <div className="center"><div className="spin" /></div>

  const igVerified = !!c.instagram && (c.instagram_followers || 0) >= 1000
  const ttVerified = !!c.tiktok && (c.tiktok_followers || 0) >= 1000
  const isVerified = igVerified || ttVerified

  return (
    <div className="page">
      <div className="ph">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 20 }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: -36 }}>
            <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 18, minWidth: 'auto' }} onClick={toggleTheme} title="Сменить тему">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
          <div className="avatar" style={{ width: 80, height: 80, fontSize: 36, borderRadius: 24, marginBottom: 12, boxShadow: '0 0 40px rgba(124,58,237,.4)' }}>{c.name[0]}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{c.name}</h1>
          <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 4 }}>📍 {c.city}, {c.country}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className={`badge ${c.status === 'approved' ? 'b-approved' : c.status === 'rejected' ? 'b-rejected' : 'b-pending'}`}>
              {c.status === 'approved' ? '✅ Одобрен' : c.status === 'rejected' ? '❌ Отклонён' : '⏳ На модерации'}
            </span>
            {isVerified && <span className="badge b-approved">🏅 Верифицирован</span>}
          </div>
          <button className="btn btn-glass" style={{ marginTop: 14, padding: '8px 20px', fontSize: 13 }} onClick={() => nav('/edit-profile')}>
            ✏️ Редактировать профиль
          </button>
        </div>
      </div>

      <div className="sec">
        <div className="stats">
          {[{ l: 'Баланс', v: `${(c.balance || 0).toLocaleString()} ₸`, e: '💰' }, { l: 'Баллы', v: c.points || 0, e: '⭐' }, { l: 'Рефералов', v: `${refs.approved}/5`, e: '👥' }].map(x => (
            <div key={x.l} className="glass stat"><div style={{ fontSize: 16 }}>{x.e}</div><div className="stat-v" style={{ fontSize: 18 }}>{x.v}</div><div className="stat-l">{x.l}</div></div>
          ))}
        </div>
      </div>

      {/* Social Networks */}
      <div className="sec">
        <div className="sec-title">Социальные сети</div>
        <SocialRow icon="📸" label="Instagram" handle={c.instagram} followers={c.instagram_followers} minForVerify={1000} />
        <SocialRow icon="🎵" label="TikTok" handle={c.tiktok} followers={c.tiktok_followers} minForVerify={1000} />
        <SocialRow icon="🧵" label="Threads" handle={c.threads} />
        {c.youtube && <SocialRow icon="▶️" label="YouTube" handle={c.youtube} followers={c.subscribers} />}
        {!c.instagram && !c.tiktok && !c.threads && (
          <p style={{ fontSize: 13, color: 'var(--t3)', textAlign: 'center', padding: '8px 0' }}>Добавьте соцсети в профиле чтобы получать верификацию</p>
        )}
      </div>

      {/* Referral */}
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
        {refs.approved >= 5 && !c.referral_task_done && (
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-primary btn-full" disabled={claiming} onClick={claimReferral}>
              {claiming ? '⏳ Начисляем...' : '🎁 Получить 5 000 ₸'}
            </button>
            {claimMsg && <p style={{ textAlign: 'center', fontSize: 13, marginTop: 8, color: claimMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{claimMsg}</p>}
          </div>
        )}
        {c.referral_task_done === 1 && (
          <p style={{ textAlign: 'center', fontSize: 13, marginTop: 8, color: 'var(--green)' }}>✅ Бонус 5 000 ₸ уже получен</p>
        )}
      </div>

      {/* Transaction history */}
      <div className="sec">
        <div className="sec-title">История операций</div>
        {txns.length === 0 ? (
          <div className="glass card" style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ color: 'var(--t3)', fontSize: 13 }}>Операций пока нет</p>
          </div>
        ) : txns.map((t: any) => (
          <div key={t.id} className="glass card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div><div style={{ fontSize: 14, fontWeight: 500 }}>{t.description}</div><div style={{ fontSize: 12, color: 'var(--t3)' }}>{new Date(t.created_at).toLocaleDateString('ru-RU')}</div></div>
            <div style={{ fontWeight: 800, color: t.amount > 0 ? 'var(--green)' : 'var(--red)', fontSize: 15 }}>{t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()} ₸</div>
          </div>
        ))}
      </div>

      <div className="sec">
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button className="btn btn-glass btn-full" onClick={() => nav('/support')}>🛠 Поддержка</button>
          <button className="btn btn-glass btn-full" onClick={() => nav('/ai-support')}>🤖 AI Jarvis</button>
          <button className="btn btn-glass btn-full" onClick={() => nav('/notifications')}>🔔 Уведомления</button>
          <button className="btn btn-glass btn-full" onClick={() => nav('/balance')}>💰 Баланс</button>
        </div>
      </div>
      <CreatorTabs />
    </div>
  )
}

export default CreatorHome
