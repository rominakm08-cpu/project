import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminTabs } from '../../components/Tabs'
import { adminApi } from '../../api'

// ── Helpers ───────────────────────────────────────────────────────────────────
const tg = (window as any).Telegram?.WebApp
const openTg = (id: string) => tg?.openTelegramLink ? tg.openTelegramLink(`https://t.me/${id.replace('@', '')}`) : window.open(`https://t.me/${id.replace('@', '')}`, '_blank')
const copy = (v: string) => { navigator.clipboard?.writeText(v); }
const fmt = (d: string) => new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function InfoRow({ label, value, onCopy, onLink }: { label: string; value?: string; onCopy?: () => void; onLink?: () => void }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--glass-b)' }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{value}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {onCopy && <button className="btn btn-glass" style={{ padding: '5px 10px', fontSize: 12, minWidth: 'auto' }} onClick={onCopy}>📋</button>}
        {onLink && <button className="btn btn-glass" style={{ padding: '5px 10px', fontSize: 12, minWidth: 'auto' }} onClick={onLink}>↗️</button>}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const nav = useNavigate()
  const [stats, setStats] = useState<any>({})
  useEffect(() => { adminApi.stats().then(r => setStats(r.data)).catch(() => {}) }, [])
  const cards = [
    { l: 'Авторов', v: stats.creators || 0, s: `+${stats.pending_creators || 0} ожидают`, e: '🎬', c: 'var(--accent)', path: '/creators' },
    { l: 'Брендов', v: stats.businesses || 0, s: `+${stats.pending_businesses || 0} ожидают`, e: '🏢', c: 'var(--blue)', path: '/businesses' },
    { l: 'Проектов', v: stats.active_projects || 0, s: 'активных', e: '📋', c: 'var(--green)', path: '/projects' },
    { l: 'Комиссий', v: `${(stats.total_commission || 0).toLocaleString()} ₸`, s: 'получено', e: '💰', c: 'var(--yellow)', path: null },
  ]
  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Панель</h1><p className="ps">CONCEPT ADS Admin</p></div>
      <div className="sec">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {cards.map(c => (
            <div key={c.l} className="glass card"
              style={{ textAlign: 'center', padding: 20, cursor: c.path ? 'pointer' : 'default', transition: 'opacity .15s' }}
              onClick={() => c.path && nav(c.path)}
              onMouseOver={e => { if (c.path) e.currentTarget.style.opacity = '.8' }}
              onMouseOut={e => { e.currentTarget.style.opacity = '1' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.e}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: c.c }}>{c.v}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{c.l}</div>
              <div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 2 }}>{c.s}</div>
              {c.path && <div style={{ fontSize: 10, color: c.c, marginTop: 6, opacity: .7 }}>смотреть →</div>}
            </div>
          ))}
        </div>
      </div>
      {(stats.pending_creators > 0 || stats.pending_businesses > 0 || stats.pending_balance_requests > 0) && <div className="sec">
        <div className="sec-title">⚠️ Ожидают действия</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {stats.pending_creators > 0 && <div className="glass card" style={{ flex: 1, textAlign: 'center', padding: 16, minWidth: 80, cursor: 'pointer' }} onClick={() => nav('/creators')}><div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)' }}>{stats.pending_creators}</div><div style={{ fontSize: 13, color: 'var(--t2)' }}>Авторов</div></div>}
          {stats.pending_businesses > 0 && <div className="glass card" style={{ flex: 1, textAlign: 'center', padding: 16, minWidth: 80, cursor: 'pointer' }} onClick={() => nav('/businesses')}><div style={{ fontSize: 28, fontWeight: 900, color: 'var(--blue)' }}>{stats.pending_businesses}</div><div style={{ fontSize: 13, color: 'var(--t2)' }}>Брендов</div></div>}
          {stats.pending_balance_requests > 0 && <div className="glass card" style={{ flex: 1, textAlign: 'center', padding: 16, minWidth: 80, cursor: 'pointer' }} onClick={() => nav('/balance')}><div style={{ fontSize: 28, fontWeight: 900, color: 'var(--yellow)' }}>{stats.pending_balance_requests}</div><div style={{ fontSize: 13, color: 'var(--t2)' }}>Платежей</div></div>}
        </div>
      </div>}
      <div className="sec">
        <div className="sec-title">Коммуникации</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="glass card" style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 12px', margin: 0, background: 'rgba(124,58,237,.1)', borderColor: 'rgba(124,58,237,.3)' }} onClick={() => nav('/community')}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>💬</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Чат</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>Общий чат платформы</div>
          </div>
          <div className="glass card" style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 12px', margin: 0, background: 'rgba(26,107,255,.08)', borderColor: 'rgba(26,107,255,.2)' }} onClick={() => nav('/news')}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📰</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Новости</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>Управление лентой</div>
          </div>
        </div>
        <div className="glass card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, background: 'rgba(239,68,68,.08)', borderColor: 'rgba(239,68,68,.2)' }} onClick={() => nav('/admin-support')}>
          <div style={{ fontSize: 32 }}>📥</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Входящие обращения</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Техподдержка и сотрудничество</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--t3)' }}>›</div>
        </div>
      </div>
      <AdminTabs />
    </div>
  )
}

// ── Admin Creators ────────────────────────────────────────────────────────────
export function AdminCreators() {
  const nav = useNavigate()
  const [creators, setCreators] = useState<any[]>([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = (s: string) => { setLoading(true); adminApi.getCreators(s).then(r => setCreators(r.data)).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => load(tab), [tab])

  const filtered = creators.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.telegram?.toLowerCase().includes(search.toLowerCase()) ||
    String(c.telegram_id || '').includes(search)
  )

  return (
    <div className="page">
      <div className="ph">
        <h1 className="pt">Авторы</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto' }}>
          {['pending', 'approved', 'rejected'].map(s => (
            <button key={s} className={`btn ${tab === s ? 'btn-primary' : 'btn-glass'}`}
              style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
              onClick={() => { setTab(s); setSearch('') }}>
              {s === 'pending' ? '⏳ Ожидают' : s === 'approved' ? '✅ Одобренные' : '❌ Отклонённые'}
            </button>
          ))}
        </div>
        <input className="input" placeholder="🔍 Поиск по имени, телефону, TG..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ marginTop: 10 }} />
      </div>
      <div className="sec">
        {loading && <div className="center"><div className="spin" /></div>}
        {!loading && filtered.length === 0 && <div className="glass card" style={{ textAlign: 'center', padding: 40 }}><p style={{ color: 'var(--t2)' }}>Нет записей</p></div>}
        {filtered.map(c => (
          <div key={c.id} className="glass card" style={{ marginBottom: 12, cursor: 'pointer' }}
            onClick={() => nav(`/creators/${c.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: 18, borderRadius: 14 }}>{c.name?.[0]}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>📍 {c.city}, {c.country}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className={`badge ${c.status === 'approved' ? 'b-approved' : c.status === 'rejected' ? 'b-rejected' : 'b-pending'}`}>
                  {c.status === 'approved' ? '✅' : c.status === 'rejected' ? '❌' : '⏳'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>детали →</span>
              </div>
            </div>
            {c.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, background: 'rgba(0,200,151,.08)', border: '1px solid rgba(0,200,151,.2)', marginBottom: 8 }}
                onClick={e => { e.stopPropagation(); copy(c.phone) }}>
                <span>📞</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)', flex: 1 }}>{c.phone}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>📋</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {c.instagram && <span className="chip" style={{ fontSize: 11 }}>📸 {Number(c.instagram_followers || 0).toLocaleString()}</span>}
              {c.tiktok && <span className="chip" style={{ fontSize: 11 }}>🎵 {Number(c.tiktok_followers || 0).toLocaleString()}</span>}
              {c.balance > 0 && <span className="chip" style={{ fontSize: 11, color: 'var(--green)' }}>💰 {Number(c.balance).toLocaleString()} ₸</span>}
              {c.telegram && <span style={{ fontSize: 11, color: 'var(--t3)' }}>@{c.telegram}</span>}
            </div>
          </div>
        ))}
      </div>
      <AdminTabs />
    </div>
  )
}

// ── Admin Businesses ──────────────────────────────────────────────────────────
export function AdminBusinesses() {
  const nav = useNavigate()
  const [businesses, setBusinesses] = useState<any[]>([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = (s: string) => { setLoading(true); adminApi.getBusinesses(s).then(r => setBusinesses(r.data)).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => load(tab), [tab])

  const filtered = businesses.filter(b =>
    !search || b.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.contact?.includes(search) || b.website?.toLowerCase().includes(search.toLowerCase()) ||
    String(b.telegram_id || '').includes(search)
  )

  return (
    <div className="page">
      <div className="ph">
        <h1 className="pt">Бизнесы</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto' }}>
          {['pending', 'approved', 'rejected'].map(s => (
            <button key={s} className={`btn ${tab === s ? 'btn-blue' : 'btn-glass'}`}
              style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
              onClick={() => { setTab(s); setSearch('') }}>
              {s === 'pending' ? '⏳ Ожидают' : s === 'approved' ? '✅ Одобренные' : '❌ Отклонённые'}
            </button>
          ))}
        </div>
        <input className="input" placeholder="🔍 Поиск по бренду, контакту, сайту..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ marginTop: 10 }} />
      </div>
      <div className="sec">
        {loading && <div className="center"><div className="spin" /></div>}
        {!loading && filtered.length === 0 && <div className="glass card" style={{ textAlign: 'center', padding: 40 }}><p style={{ color: 'var(--t2)' }}>Нет записей</p></div>}
        {filtered.map(b => (
          <div key={b.id} className="glass card" style={{ marginBottom: 12, cursor: 'pointer' }}
            onClick={() => nav(`/businesses/${b.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: 18, borderRadius: 14, background: 'linear-gradient(135deg,var(--blue),#5B9BFF)' }}>{b.brand_name?.[0]}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{b.brand_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>{b.category} · {b.geo}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className={`badge ${b.status === 'approved' ? 'b-approved' : b.status === 'rejected' ? 'b-rejected' : 'b-pending'}`}>
                  {b.status === 'approved' ? '✅' : b.status === 'rejected' ? '❌' : '⏳'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>детали →</span>
              </div>
            </div>
            {b.contact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, background: 'rgba(26,107,255,.08)', border: '1px solid rgba(26,107,255,.2)', marginBottom: 8 }}
                onClick={e => { e.stopPropagation(); copy(b.contact) }}>
                <span>📞</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)', flex: 1 }}>{b.contact}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>📋</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {b.website && <span style={{ fontSize: 12, color: 'var(--t3)' }}>🌐 {b.website}</span>}
              {b.balance > 0 && <span className="chip" style={{ fontSize: 11, color: 'var(--green)' }}>💰 {Number(b.balance).toLocaleString()} ₸</span>}
            </div>
          </div>
        ))}
      </div>
      <AdminTabs />
    </div>
  )
}

// ── Admin Offers ──────────────────────────────────────────────────────────────
export function AdminOffers() {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any>(null)
  const [apps, setApps] = useState<any[]>([])
  const [tab2, setTab2] = useState<'edit' | 'apps'>('edit')

  useEffect(() => { adminApi.getOffers().then(r => setOffers(r.data)).catch(() => {}).finally(() => setLoading(false)) }, [])

  const openModal = async (o: any) => { setModal({ ...o }); setTab2('edit'); adminApi.getApplications(o.id).then(r => setApps(r.data)).catch(() => {}) }

  const save = async () => {
    await adminApi.updateOffer(modal.id, modal)
    setOffers(prev => prev.map(x => x.id === modal.id ? { ...modal } : x))
    setModal(null)
  }

  const activate = async () => {
    await adminApi.updateOffer(modal.id, { ...modal, status: 'active' })
    setOffers(prev => prev.map(x => x.id === modal.id ? { ...modal, status: 'active' } : x))
    setModal(null)
  }

  const selectCreator = async (appId: number) => {
    await adminApi.selectCreator(appId)
    setApps(prev => prev.map(x => x.id === appId ? { ...x, status: 'selected' } : x))
    alert('✅ Креатор выбран! Проект создан.')
  }

  const s = (k: string, v: any) => setModal((m: any) => ({ ...m, [k]: v }))

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Офферы</h1><p className="ps">Управление и активация</p></div>
      <div className="sec">
        {loading && <div className="center"><div className="spin" /></div>}
        {offers.map(o => (
          <div key={o.id} className="glass card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => openModal(o)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1, paddingRight: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{o.title}</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{o.brand_name} · {o.platform?.toUpperCase()}</div>
              </div>
              <span className={`badge ${o.status === 'active' ? 'b-active' : o.status === 'draft' ? 'b-pending' : 'b-review'}`}>{o.status}</span>
            </div>
            {o.budget > 0 && <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>💰 {Number(o.budget).toLocaleString()} ₸</span>}
            <p style={{ color: 'var(--t2)', fontSize: 13, marginTop: 6 }}>{o.description?.slice(0, 100)}...</p>
          </div>
        ))}
      </div>
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="glass" style={{ width: '100%', height: '88vh', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button className={`btn ${tab2 === 'edit' ? 'btn-primary' : 'btn-glass'}`} style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setTab2('edit')}>✏️ Редактировать</button>
              <button className={`btn ${tab2 === 'apps' ? 'btn-primary' : 'btn-glass'}`} style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setTab2('apps')}>👥 Отклики ({apps.length})</button>
            </div>
            {tab2 === 'edit' && <>
              {[
                { k: 'title', l: 'Название', p: 'Название оффера' },
                { k: 'description', l: 'Описание', p: 'Описание задачи', area: true },
                { k: 'product', l: 'Продукт', p: 'Описание продукта', area: true },
                { k: 'what_to_show', l: 'Что показать', p: 'Что нужно показать', area: true },
                { k: 'video_length', l: 'Длина ролика', p: '30-60 сек' },
                { k: 'style', l: 'Стиль', p: 'Нативный, живой...' },
                { k: 'main_idea', l: 'Главная мысль', p: 'Основная идея', area: true },
                { k: 'start_from', l: 'С чего начать', p: 'Как начать видео', area: true },
                { k: 'language', l: 'Язык', p: 'Казахский / Русский' },
                { k: 'post_topics', l: 'Темы для поста', p: 'На какие темы', area: true },
                { k: 'post_examples', l: 'Примеры постов', p: 'Примеры текстов', area: true },
              ].map(f => (
                <div key={f.k} className="fg">
                  <label className="label">{f.l}</label>
                  {f.area
                    ? <textarea className="input" placeholder={f.p} value={modal[f.k] || ''} onChange={e => s(f.k, e.target.value)} rows={3} />
                    : <input className="input" placeholder={f.p} value={modal[f.k] || ''} onChange={e => s(f.k, e.target.value)} />
                  }
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <button className="btn btn-glass" onClick={save}>💾 Сохранить</button>
                <button className="btn btn-primary" onClick={activate}>🚀 Активировать</button>
              </div>
            </>}
            {tab2 === 'apps' && <>
              {apps.length === 0 && <p style={{ color: 'var(--t2)', textAlign: 'center', padding: 30 }}>Откликов пока нет</p>}
              {apps.map(a => (
                <div key={a.id} className="glass card" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                    <span className={`badge ${a.status === 'selected' ? 'b-approved' : 'b-pending'}`}>{a.status}</span>
                  </div>
                  {a.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(0,200,151,.08)', border: '1px solid rgba(0,200,151,.2)', marginBottom: 8 }}
                      onClick={() => copy(a.phone)}>
                      <span style={{ fontSize: 14 }}>📞</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>{a.phone}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {a.instagram && <span className="chip" style={{ fontSize: 11 }}>📸 {Number(a.instagram_followers).toLocaleString()}</span>}
                    {a.tiktok && <span className="chip" style={{ fontSize: 11 }}>🎵 {Number(a.tiktok_followers).toLocaleString()}</span>}
                    {a.threads && <span className="chip" style={{ fontSize: 11 }}>🧵 Threads</span>}
                  </div>
                  {a.message && <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8 }}>💬 {a.message}</p>}
                  {a.status === 'pending' && <button className="btn btn-success btn-full" onClick={() => selectCreator(a.id)}>✅ Выбрать этого автора</button>}
                </div>
              ))}
            </>}
          </div>
        </div>
      )}
      <AdminTabs />
    </div>
  )
}

// ── Admin Referrals ───────────────────────────────────────────────────────────
export function AdminReferrals() {
  const [refs, setRefs] = useState<any[]>([])
  useEffect(() => { adminApi.getReferrals().then(r => setRefs(r.data)).catch(() => {}) }, [])

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Рефералы</h1><p className="ps">Промокоды и выплаты</p></div>
      <div className="sec">
        {refs.length === 0 && <div className="glass card" style={{ textAlign: 'center', padding: 40 }}><p style={{ color: 'var(--t2)' }}>Нет данных</p></div>}
        {refs.map((r, i) => (
          <div key={i} className="glass card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
                <div style={{ fontSize: 13, color: 'var(--t3)', fontFamily: 'monospace' }}>{r.promo_code}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: r.approved_count >= 5 ? 'var(--green)' : 'var(--t1)' }}>
                  {r.approved_count || 0}<span style={{ fontSize: 14, color: 'var(--t3)' }}>/5</span>
                </div>
                {r.approved_count >= 5 && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>💰 К выплате!</div>}
              </div>
            </div>
            {r.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(0,200,151,.08)', border: '1px solid rgba(0,200,151,.2)', marginBottom: 8, cursor: 'pointer' }}
                onClick={() => copy(r.phone)}>
                <span>📞</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>{r.phone}</span>
              </div>
            )}
            <div style={{ background: 'var(--glass-b)', height: 5, borderRadius: 3 }}>
              <div style={{ width: `${Math.min((r.approved_count / 5) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg,var(--accent),var(--green))', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
      <AdminTabs />
    </div>
  )
}

export default AdminDashboard
