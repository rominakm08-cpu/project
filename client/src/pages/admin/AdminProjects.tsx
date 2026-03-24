import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api'
import { AdminTabs } from '../../components/Tabs'

const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ Ожидает',
  in_progress: '🔄 В работе',
  content_uploaded: '📤 Загружен',
  completed: '✅ Завершён',
  paid: '💰 Оплачен',
  revision: '🔁 Ревизия',
  closed: '🔒 Закрыт',
}
const STATUS_CLASS: Record<string, string> = {
  pending: 'b-pending', in_progress: 'b-review', content_uploaded: 'b-review',
  completed: 'b-approved', paid: 'b-active', revision: 'b-pending', closed: 'b-rejected',
}

export default function AdminProjects() {
  const nav = useNavigate()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    adminApi.getProjects()
      .then(r => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = projects.filter(p => {
    const matchSearch = !search ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.creator_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id) === search.trim()
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const statusKeys = ['all', 'pending', 'in_progress', 'content_uploaded', 'completed', 'paid', 'closed']

  // Summary counts
  const counts = projects.reduce((acc: any, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {})
  const totalBudget = projects.reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="page">
      <div className="ph">
        <h1 className="pt">Проекты</h1>
        <p className="ps">{projects.length} всего · {Number(totalBudget).toLocaleString()} ₸</p>

        {/* Status summary pills */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
          <button className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-glass'}`}
            style={{ padding: '6px 12px', fontSize: 11, flexShrink: 0 }}
            onClick={() => setStatusFilter('all')}>🌐 Все ({projects.length})</button>
          {statusKeys.filter(s => s !== 'all' && counts[s] > 0).map(s => (
            <button key={s} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-glass'}`}
              style={{ padding: '6px 10px', fontSize: 11, flexShrink: 0 }}
              onClick={() => setStatusFilter(s)}>
              {STATUS_LABEL[s]} ({counts[s]})
            </button>
          ))}
        </div>

        <input className="input" placeholder="🔍 Поиск по офферу, автору, бренду, ID..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ marginTop: 10 }} />
      </div>

      <div className="sec">
        {loading && <div className="center"><div className="spin" /></div>}
        {!loading && filtered.length === 0 && (
          <div className="glass card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--t2)' }}>Нет проектов</p>
          </div>
        )}
        {filtered.map(p => (
          <div key={p.id} className="glass card" style={{ marginBottom: 12, cursor: 'pointer' }}
            onClick={() => nav(`/projects/${p.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ flex: 1, paddingRight: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>#{p.id} · {p.title}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{p.platform?.toUpperCase()}</div>
              </div>
              <span className={`badge ${STATUS_CLASS[p.status] || 'b-pending'}`}>{STATUS_LABEL[p.status] || p.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
              <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(124,58,237,.07)', border: '1px solid rgba(124,58,237,.15)' }}>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>АВТОР</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>👤 {p.creator_name}</div>
              </div>
              <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(26,107,255,.07)', border: '1px solid rgba(26,107,255,.15)' }}>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>БРЕНД</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>🏢 {p.brand_name}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>
                💰 {Number(p.amount || 0).toLocaleString()} ₸
              </div>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>детали →</span>
            </div>
          </div>
        ))}
      </div>
      <AdminTabs />
    </div>
  )
}
