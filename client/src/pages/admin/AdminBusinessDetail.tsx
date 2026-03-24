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

export default function AdminBusinessDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'offers' | 'transactions'>('info')

  useEffect(() => {
    setLoading(true)
    adminApi.getBusinessDetail(Number(id))
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const approve = async () => {
    if (!data?.business) return
    setActing(true)
    try {
      await adminApi.approveBusiness(data.business.id)
      setData((d: any) => ({ ...d, business: { ...d.business, status: 'approved' } }))
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setActing(false) }
  }

  const reject = async () => {
    if (!data?.business) return
    if (!confirm('Отклонить этот бизнес?')) return
    setActing(true)
    try {
      await adminApi.rejectBusiness(data.business.id)
      setData((d: any) => ({ ...d, business: { ...d.business, status: 'rejected' } }))
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setActing(false) }
  }

  if (loading) return (
    <div className="page">
      <div style={{ padding: '20px 16px' }}>
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

  const { business, projects, offers, transactions } = data

  return (
    <div className="page">
      <div className="ph" style={{ paddingBottom: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 18, flexShrink: 0 }} onClick={() => nav(-1)}>←</button>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20, borderRadius: 16, flexShrink: 0, background: 'linear-gradient(135deg,var(--blue),#5B9BFF)' }}>{business.brand_name?.[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{business.brand_name}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 1 }}>{business.category} · {business.geo}</div>
            <span className={`badge ${business.status === 'approved' ? 'b-approved' : business.status === 'rejected' ? 'b-rejected' : 'b-pending'}`} style={{ marginTop: 4, display: 'inline-block' }}>
              {business.status === 'approved' ? '✅ Одобрен' : business.status === 'rejected' ? '❌ Отклонён' : '⏳ Ожидает'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { l: 'Проекты', v: projects.length, c: 'var(--accent)' },
            { l: 'Офферы', v: offers.length, c: 'var(--blue)' },
            { l: 'Баланс', v: `${(business.balance || 0).toLocaleString()} ₸`, c: 'var(--green)' },
          ].map(s => (
            <div key={s.l} className="glass" style={{ padding: '10px 8px', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {business.telegram_id && (
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => openTg(String(business.telegram_id))}>✈️ Telegram</button>
          )}
          {business.status === 'pending' && <>
            <button className="btn btn-success" style={{ flex: 1 }} disabled={acting} onClick={approve}>{acting ? '⏳' : '✅ Одобрить'}</button>
            <button className="btn btn-danger" style={{ flex: 1 }} disabled={acting} onClick={reject}>{acting ? '⏳' : '❌ Отклонить'}</button>
          </>}
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { k: 'info', l: '📋 О бренде' },
            { k: 'projects', l: `📁 Проекты (${projects.length})` },
            { k: 'offers', l: `📢 Офферы (${offers.length})` },
            { k: 'transactions', l: '💳 Финансы' },
          ].map(t => (
            <button key={t.k} className={`btn ${activeTab === t.k ? 'btn-blue' : 'btn-glass'}`}
              style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}
              onClick={() => setActiveTab(t.k as any)}>{t.l}</button>
          ))}
        </div>
      </div>

      <div className="sec">
        {/* Info tab */}
        {activeTab === 'info' && (
          <div className="glass card">
            {business.contact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(26,107,255,.08)', border: '1px solid rgba(26,107,255,.2)', marginBottom: 12, cursor: 'pointer' }}
                onClick={() => copy(business.contact)}>
                <span>📞</span>
                <span style={{ fontWeight: 700, color: 'var(--blue)', flex: 1 }}>{business.contact}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>скопировать</span>
              </div>
            )}
            {[
              { l: 'Telegram ID', v: business.telegram_id ? String(business.telegram_id) : null, icon: '🆔', action: () => copy(String(business.telegram_id)) },
              { l: 'Сайт', v: business.website || null, icon: '🌐', action: null },
              { l: 'Целевая аудитория', v: business.target_audience || null, icon: '🎯', action: null },
              { l: 'Гео', v: business.geo || null, icon: '📍', action: null },
              { l: 'Формат контента', v: business.content_format || null, icon: '🎬', action: null },
              { l: 'Зарегистрирован', v: business.created_at ? fmt(business.created_at) : null, icon: '📅', action: null },
            ].filter(r => r.v).map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--glass-b)', cursor: r.action ? 'pointer' : 'default' }}
                onClick={r.action || undefined}>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>{r.icon} {r.l}</span>
                <span style={{ fontSize: 13, fontWeight: 600, maxWidth: '58%', textAlign: 'right', color: r.action ? 'var(--blue)' : 'inherit' }}>{r.v}</span>
              </div>
            ))}
            {business.extra && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--glass-bg)', fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Доп. информация</div>
                {business.extra}
              </div>
            )}
          </div>
        )}

        {/* Projects tab */}
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
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>👤 {p.creator_name} · {p.platform?.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700, marginTop: 6 }}>💰 {Number(p.amount || 0).toLocaleString()} ₸</div>
              </div>
            ))
        )}

        {/* Offers tab */}
        {activeTab === 'offers' && (
          offers.length === 0
            ? <div className="glass card" style={{ textAlign: 'center', padding: 36, color: 'var(--t2)' }}>Нет офферов</div>
            : offers.map((o: any) => (
              <div key={o.id} className="glass card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ flex: 1, paddingRight: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{o.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{o.platform?.toUpperCase()}</div>
                  </div>
                  <span className={`badge ${o.status === 'active' ? 'b-active' : o.status === 'in_progress' ? 'b-review' : 'b-pending'}`}>{o.status}</span>
                </div>
                {o.budget > 0 && <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>💰 {Number(o.budget).toLocaleString()} ₸</div>}
                {o.deadline && <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>⏰ {o.deadline}</div>}
              </div>
            ))
        )}

        {/* Transactions tab */}
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
      </div>

      <AdminTabs />
    </div>
  )
}
