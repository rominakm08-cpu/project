import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api'
import { AdminTabs } from '../../components/Tabs'

const tgApp = (window as any).Telegram?.WebApp
const openTg = (id: string) => tgApp?.openTelegramLink
  ? tgApp.openTelegramLink(`https://t.me/${id.replace('@', '')}`)
  : window.open(`https://t.me/${id.replace('@', '')}`, '_blank')
const copy = (v: string) => navigator.clipboard?.writeText(v)
const fmt = (d: string) => new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_CLASS: Record<string, string> = {
  pending: 'b-pending', in_progress: 'b-review', content_uploaded: 'b-review',
  completed: 'b-approved', paid: 'b-active', revision: 'b-pending', closed: 'b-rejected',
}
const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ Ожидает', in_progress: '🔄 В работе', content_uploaded: '📤 Загружен',
  completed: '✅ Завершён', paid: '💰 Оплачен', revision: '🔁 Ревизия', closed: '🔒 Закрыт',
}

export default function AdminCreatorDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'transactions' | 'referrals'>('info')

  useEffect(() => {
    setLoading(true)
    adminApi.getCreatorDetail(Number(id))
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const approve = async () => {
    if (!data?.creator) return
    setActing(true)
    try {
      await adminApi.approveCreator(data.creator.id)
      setData((d: any) => ({ ...d, creator: { ...d.creator, status: 'approved' } }))
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setActing(false) }
  }

  const reject = async () => {
    if (!data?.creator) return
    setActing(true)
    try {
      await adminApi.rejectCreator(data.creator.id, rejectReason)
      setData((d: any) => ({ ...d, creator: { ...d.creator, status: 'rejected', reject_reason: rejectReason } }))
      setShowReject(false)
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setActing(false) }
  }

  if (loading) return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px' }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 18 }} onClick={() => nav(-1)}>←</button>
      </div>
      <div className="center" style={{ paddingTop: 60 }}><div className="spin" /></div>
      <AdminTabs />
    </div>
  )

  if (!data) return (
    <div className="page">
      <div style={{ padding: '20px 16px' }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 18 }} onClick={() => nav(-1)}>←</button>
      </div>
      <div className="center" style={{ paddingTop: 60 }}><p style={{ color: 'var(--t2)' }}>Не найдено</p></div>
      <AdminTabs />
    </div>
  )

  const { creator, projects, transactions, referrals } = data

  return (
    <div className="page">
      <div className="ph" style={{ paddingBottom: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 18, flexShrink: 0 }} onClick={() => nav(-1)}>←</button>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20, borderRadius: 16, flexShrink: 0 }}>{creator.name?.[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{creator.name}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 1 }}>📍 {creator.city}, {creator.country}</div>
            <span className={`badge ${creator.status === 'approved' ? 'b-approved' : creator.status === 'rejected' ? 'b-rejected' : 'b-pending'}`} style={{ marginTop: 4, display: 'inline-block' }}>
              {creator.status === 'approved' ? '✅ Одобрен' : creator.status === 'rejected' ? '❌ Отклонён' : '⏳ Ожидает'}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { l: 'Проекты', v: projects.length, c: 'var(--accent)' },
            { l: 'Баланс', v: `${(creator.balance || 0).toLocaleString()} ₸`, c: 'var(--green)' },
            { l: 'Баллы', v: creator.points || 0, c: 'var(--yellow)' },
            { l: 'Рефералы', v: referrals.length, c: 'var(--blue)' },
          ].map(s => (
            <div key={s.l} className="glass" style={{ padding: '9px 6px', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {creator.telegram && (
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => openTg(creator.telegram)}>✈️ Telegram</button>
          )}
          {creator.status === 'pending' && <>
            <button className="btn btn-success" style={{ flex: 1 }} disabled={acting} onClick={approve}>{acting ? '⏳' : '✅ Одобрить'}</button>
            <button className="btn btn-danger" style={{ flex: 1 }} disabled={acting} onClick={() => setShowReject(true)}>❌</button>
          </>}
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { k: 'info', l: '📋 Профиль' },
            { k: 'projects', l: `📁 Проекты (${projects.length})` },
            { k: 'transactions', l: '💳 Финансы' },
            { k: 'referrals', l: `👥 Рефералы (${referrals.length})` },
          ].map(t => (
            <button key={t.k} className={`btn ${activeTab === t.k ? 'btn-primary' : 'btn-glass'}`}
              style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}
              onClick={() => setActiveTab(t.k as any)}>{t.l}</button>
          ))}
        </div>
      </div>

      <div className="sec">
        {/* Profile info */}
        {activeTab === 'info' && (
          <div className="glass card">
            {creator.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,200,151,.08)', border: '1px solid rgba(0,200,151,.2)', marginBottom: 12, cursor: 'pointer' }}
                onClick={() => copy(creator.phone)}>
                <span>📞</span>
                <span style={{ fontWeight: 700, color: 'var(--green)', flex: 1 }}>{creator.phone}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>скопировать</span>
              </div>
            )}
            {[
              { l: 'Telegram', v: creator.telegram, icon: '✈️', action: () => openTg(creator.telegram) },
              { l: 'Telegram ID', v: creator.telegram_id, icon: '🆔', action: () => copy(String(creator.telegram_id)) },
              { l: 'Instagram', v: creator.instagram ? `@${creator.instagram} · ${Number(creator.instagram_followers || 0).toLocaleString()} подп.` : null, icon: '📸', action: null },
              { l: 'TikTok', v: creator.tiktok ? `@${creator.tiktok} · ${Number(creator.tiktok_followers || 0).toLocaleString()} подп.` : null, icon: '🎵', action: null },
              { l: 'Threads', v: creator.threads ? `@${creator.threads}` : null, icon: '🧵', action: null },
              { l: 'YouTube', v: creator.youtube || null, icon: '▶️', action: null },
              { l: 'Ниши', v: creator.niches || null, icon: '🎯', action: null },
              { l: 'Формат', v: creator.collab_format === 'both' ? 'Бартер + Оплата' : creator.collab_format === 'barter' ? 'Бартер' : creator.collab_format ? 'Оплата' : null, icon: '🤝', action: null },
              { l: 'Промокод', v: creator.promo_code || null, icon: '🏷', action: () => copy(creator.promo_code) },
              { l: 'Зарегистрирован', v: creator.created_at ? fmt(creator.created_at) : null, icon: '📅', action: null },
            ].filter(r => r.v).map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--glass-b)', cursor: r.action ? 'pointer' : 'default' }}
                onClick={r.action || undefined}>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>{r.icon} {r.l}</span>
                <span style={{ fontSize: 13, fontWeight: 600, maxWidth: '58%', textAlign: 'right', color: r.action ? 'var(--accent)' : 'inherit' }}>{r.v}</span>
              </div>
            ))}
            {creator.bio && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--glass-bg)', fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>О себе</div>
                {creator.bio}
              </div>
            )}
            {creator.reject_reason && (
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,59,59,.08)', border: '1px solid rgba(255,59,59,.2)', fontSize: 13, color: 'var(--red)' }}>
                ❌ Причина отклонения: {creator.reject_reason}
              </div>
            )}
          </div>
        )}

        {/* Projects */}
        {activeTab === 'projects' && (
          projects.length === 0
            ? <div className="glass card" style={{ textAlign: 'center', padding: 36, color: 'var(--t2)' }}>Нет проектов</div>
            : projects.map((p: any) => (
              <div key={p.id} className="glass card" style={{ marginBottom: 10, cursor: 'pointer' }}
                onClick={() => nav(`/projects/${p.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, flex: 1, paddingRight: 8 }}>#{p.id} {p.title}</div>
                  <span className={`badge ${STATUS_CLASS[p.status] || 'b-pending'}`}>{STATUS_LABEL[p.status] || p.status}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>🏢 {p.brand_name} · {p.platform?.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700, marginTop: 6 }}>💰 {Number(p.amount || 0).toLocaleString()} ₸</div>
              </div>
            ))
        )}

        {/* Transactions */}
        {activeTab === 'transactions' && (
          transactions.length === 0
            ? <div className="glass card" style={{ textAlign: 'center', padding: 36, color: 'var(--t2)' }}>Нет транзакций</div>
            : transactions.map((t: any) => (
              <div key={t.id} className="glass card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.description || t.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{t.created_at ? fmt(t.created_at) : ''}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: t.amount > 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0, marginLeft: 8 }}>
                  {t.amount > 0 ? '+' : ''}{Number(t.amount).toLocaleString()} ₸
                </div>
              </div>
            ))
        )}

        {/* Referrals */}
        {activeTab === 'referrals' && (
          referrals.length === 0
            ? <div className="glass card" style={{ textAlign: 'center', padding: 36, color: 'var(--t2)' }}>Нет рефералов</div>
            : referrals.map((r: any, i: number) => (
              <div key={i} className="glass card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                  {r.created_at && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Зарегистрирован {fmt(r.created_at)}</div>}
                </div>
                <span className={`badge ${r.status === 'approved' ? 'b-approved' : 'b-pending'}`}>
                  {r.status === 'approved' ? '✅' : '⏳'}
                </span>
              </div>
            ))
        )}
      </div>

      {/* Reject modal */}
      {showReject && (
        <div className="overlay" onClick={() => setShowReject(false)}>
          <div className="glass modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Причина отклонения</h3>
            <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 14 }}>{creator.name}</p>
            <textarea className="input" placeholder="Укажите причину..." value={rejectReason}
              onChange={e => setRejectReason(e.target.value)} rows={3} style={{ marginBottom: 12 }} />
            <button className="btn btn-danger btn-full" disabled={acting} onClick={reject}>
              {acting ? '⏳ Отклоняем...' : '❌ Отклонить'}
            </button>
          </div>
        </div>
      )}

      <AdminTabs />
    </div>
  )
}
