import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifApi } from '../../api'

export default function Notifications() {
  const nav = useNavigate()
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notifApi.list().then(r => setNotifs(r.data || [])).catch(() => {}).finally(() => setLoading(false))
    notifApi.readAll().catch(() => {})
  }, [])

  const getIcon = (msg: string) => {
    if (msg.includes('✅')) return '✅'
    if (msg.includes('❌')) return '❌'
    if (msg.includes('🎉')) return '🎉'
    if (msg.includes('💰')) return '💰'
    if (msg.includes('👥')) return '👥'
    return '📣'
  }

  return (
    <div className="page">
      <div className="ph" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 20 }} onClick={() => nav(-1)}>←</button>
        <div>
          <h1 className="pt">Уведомления</h1>
          <p className="ps">{notifs.length} уведомлени{notifs.length === 1 ? 'е' : 'й'}</p>
        </div>
      </div>

      <div className="sec">
        {loading && <div className="center"><div className="spin" /></div>}

        {!loading && notifs.length === 0 && (
          <div className="glass card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <p style={{ color: 'var(--t2)' }}>Уведомлений нет</p>
            <p style={{ color: 'var(--t3)', fontSize: 13, marginTop: 6 }}>Здесь будут появляться важные события</p>
          </div>
        )}

        {notifs.map((n: any) => (
          <div key={n.id} className={`glass card fu`} style={{
            marginBottom: 10,
            borderLeft: n.is_read ? 'none' : '3px solid var(--accent)',
            opacity: n.is_read ? 0.8 : 1,
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 26, flexShrink: 0 }}>{getIcon(n.message)}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--t1)' }}>{n.message}</p>
                <p style={{ color: 'var(--t3)', fontSize: 11, marginTop: 6 }}>
                  {new Date(n.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
