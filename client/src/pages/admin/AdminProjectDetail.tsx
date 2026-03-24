import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api'
import { AdminTabs } from '../../components/Tabs'

const tgApp = (window as any).Telegram?.WebApp
const openTg = (id: string) => tgApp?.openTelegramLink
  ? tgApp.openTelegramLink(`https://t.me/${id.replace('@', '')}`)
  : window.open(`https://t.me/${id.replace('@', '')}`, '_blank')
const fmt = (d: string) => new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ Ожидает',
  in_progress: '🔄 В работе',
  content_uploaded: '📤 Контент загружен',
  completed: '✅ Завершён',
  paid: '💰 Оплачен',
  revision: '🔁 На доработке',
  closed: '🔒 Закрыт',
}
const STATUS_CLASS: Record<string, string> = {
  pending: 'b-pending', in_progress: 'b-review', content_uploaded: 'b-review',
  completed: 'b-approved', paid: 'b-active', revision: 'b-pending', closed: 'b-rejected',
}

const NEXT: Record<string, string[]> = {
  pending: ['in_progress', 'closed'],
  in_progress: ['content_uploaded', 'closed'],
  content_uploaded: ['completed', 'revision', 'closed'],
  completed: ['paid', 'closed'],
  revision: ['content_uploaded', 'closed'],
  paid: [],
  closed: [],
}

export default function AdminProjectDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    setLoading(true)
    adminApi.getProjectDetail(Number(id))
      .then(r => setProject(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (status: string) => {
    if (!project) return
    if (!confirm(`Изменить статус на "${STATUS_LABEL[status] || status}"?`)) return
    setUpdating(true)
    try {
      await adminApi.updateProjectStatus(project.id, status)
      setProject((p: any) => ({ ...p, status }))
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setUpdating(false) }
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

  if (!project) return (
    <div className="page">
      <div style={{ padding: '20px 16px' }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 18 }} onClick={() => nav(-1)}>←</button>
      </div>
      <div className="center" style={{ paddingTop: 60 }}><p style={{ color: 'var(--t2)' }}>Не найдено</p></div>
      <AdminTabs />
    </div>
  )

  const commissionPct = project.commission_pct || 20
  const commission = Math.floor((project.amount || 0) * commissionPct / 100)
  const payout = (project.amount || 0) - commission
  const nextStatuses = NEXT[project.status] || []

  return (
    <div className="page">
      <div className="ph" style={{ paddingBottom: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 18, flexShrink: 0 }} onClick={() => nav(-1)}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 17 }}>Проект #{project.id}</div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.offer_title}</div>
          </div>
          <span className={`badge ${STATUS_CLASS[project.status] || 'b-pending'}`} style={{ flexShrink: 0 }}>
            {STATUS_LABEL[project.status] || project.status}
          </span>
        </div>

        {/* Budget breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { l: 'Бюджет', v: `${Number(project.amount || 0).toLocaleString()} ₸`, c: 'var(--green)' },
            { l: 'Выплата', v: `${payout.toLocaleString()} ₸`, c: 'var(--blue)' },
            { l: `Комиссия ${commissionPct}%`, v: `${commission.toLocaleString()} ₸`, c: 'var(--yellow)' },
          ].map(s => (
            <div key={s.l} className="glass" style={{ padding: '10px 6px', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sec">
        {/* Participants — clickable cards to their profiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div className="glass card" style={{ cursor: 'pointer' }} onClick={() => nav(`/creators/${project.creator_id}`)}>
            <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Автор</div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>👤 {project.creator_name}</div>
            {project.creator_phone && (
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>📞 {project.creator_phone}</div>
            )}
            {project.creator_telegram && (
              <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}
                onClick={e => { e.stopPropagation(); openTg(project.creator_telegram) }}>
                ✈️ {project.creator_telegram}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 6 }}>открыть профиль →</div>
          </div>
          <div className="glass card" style={{ cursor: 'pointer' }} onClick={() => nav(`/businesses/${project.business_id}`)}>
            <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Бренд</div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>🏢 {project.brand_name}</div>
            {project.business_contact && (
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>📞 {project.business_contact}</div>
            )}
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 6 }}>открыть профиль →</div>
          </div>
        </div>

        {/* Offer details */}
        <div className="glass card" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>📋 Детали оффера</div>
          {[
            { l: 'Платформа', v: project.platform?.toUpperCase() },
            { l: 'Бюджет оффера', v: project.offer_budget > 0 ? `${Number(project.offer_budget).toLocaleString()} ₸` : 'Бартер' },
            { l: 'Дедлайн', v: project.deadline },
            { l: 'Язык', v: project.language },
            { l: 'Ниши', v: project.niches },
            { l: 'Создан', v: project.created_at ? fmt(project.created_at) : null },
            { l: 'Обновлён', v: project.updated_at ? fmt(project.updated_at) : null },
          ].filter(r => r.v).map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--glass-b)' }}>
              <span style={{ fontSize: 13, color: 'var(--t2)' }}>{r.l}</span>
              <span style={{ fontSize: 13, fontWeight: 600, maxWidth: '55%', textAlign: 'right' }}>{r.v}</span>
            </div>
          ))}
          {project.offer_description && (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Описание задачи</div>
              {project.offer_description}
            </div>
          )}
        </div>

        {/* Uploaded content */}
        {project.content_url && (
          <div className="glass card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📎 Загруженный контент</div>
            <a href={project.content_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: 'var(--accent)', wordBreak: 'break-all' }}>
              {project.content_url}
            </a>
          </div>
        )}

        {/* Status management */}
        {nextStatuses.length > 0 && (
          <div className="glass card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🔄 Изменить статус</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {nextStatuses.map(s => (
                <button key={s}
                  className={`btn ${s === 'paid' ? 'btn-success' : s === 'closed' ? 'btn-danger' : 'btn-glass'}`}
                  style={{ flex: 1, minWidth: '45%', fontSize: 13 }}
                  disabled={updating} onClick={() => updateStatus(s)}>
                  {updating ? '⏳' : STATUS_LABEL[s] || s}
                </button>
              ))}
            </div>
            {project.status === 'completed' && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,200,151,.08)', border: '1px solid rgba(0,200,151,.2)', fontSize: 12, color: 'var(--t2)' }}>
                💡 При переводе в «Оплачен» автору автоматически начисляется {payout.toLocaleString()} ₸
              </div>
            )}
          </div>
        )}

        {/* Completed / closed status info */}
        {(project.status === 'paid' || project.status === 'closed') && (
          <div className="glass card" style={{ textAlign: 'center', padding: 24, color: 'var(--t2)' }}>
            {project.status === 'paid' ? '✅ Проект завершён и оплачен' : '🔒 Проект закрыт'}
          </div>
        )}
      </div>

      <AdminTabs />
    </div>
  )
}
