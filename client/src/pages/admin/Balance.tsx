import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { AdminTabs } from '../../components/Tabs'

export default function AdminBalance() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [adjustModal, setAdjustModal] = useState<{ userId: number; name: string } | null>(null)
  const [adjustAmt, setAdjustAmt] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [acting, setActing] = useState<number | null>(null)
  const [adjUserId, setAdjUserId] = useState('')
  const [adjName, setAdjName] = useState('')

  const load = () => {
    setLoading(true)
    adminApi.getBalanceRequests(filterStatus).then(r => setRequests(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterStatus])

  const approve = async (id: number) => {
    setActing(id)
    try {
      await adminApi.approveBalance(id)
      load()
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setActing(null) }
  }

  const reject = async (id: number) => {
    setActing(id)
    try {
      await adminApi.rejectBalance(id)
      load()
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setActing(null) }
  }

  const doAdjust = async () => {
    if (!adjustModal || !adjustAmt) return
    const amt = parseInt(adjustAmt)
    if (!amt) { alert('Укажите сумму'); return }
    setActing(adjustModal.userId)
    try {
      await adminApi.adjustBalance(adjustModal.userId, amt, adjustNote)
      setAdjustModal(null); setAdjustAmt(''); setAdjustNote(''); setAdjUserId(''); setAdjName('')
      alert('✅ Баланс скорректирован')
    } catch (e: any) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setActing(null) }
  }

  const FILTERS = [
    { v: 'pending', l: '⏳ Ожидают' },
    { v: 'approved', l: '✅ Одобрены' },
    { v: 'rejected', l: '❌ Отклонены' },
  ]

  const TYPE_COLOR: any = { topup: 'var(--green)', withdraw: 'var(--yellow)' }

  return (
    <div className="page">
      <div className="ph">
        <h1 className="pt">Баланс</h1>
        <p className="ps">Управление заявками на пополнение и вывод</p>
      </div>

      <div className="sec">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.v} className={`btn ${filterStatus === f.v ? 'btn-primary' : 'btn-glass'}`}
              style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={() => setFilterStatus(f.v)}>
              {f.l}
            </button>
          ))}
        </div>

        {loading && <div className="center"><div className="spin" /></div>}

        {!loading && requests.length === 0 && (
          <div className="glass card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
            <p style={{ color: 'var(--t2)' }}>Нет заявок</p>
          </div>
        )}

        {requests.map((r: any) => (
          <div key={r.id} className="glass card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{r.user_name || r.telegram_id || 'Пользователь'}</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                  ID {r.user_id} {r.details ? `· ${r.details}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: TYPE_COLOR[r.type] || 'var(--t1)' }}>
                  {r.type === 'topup' ? '+' : '-'}{Number(r.amount).toLocaleString()} ₸
                </div>
                <div style={{ fontSize: 12, color: 'var(--t2)' }}>{r.type === 'topup' ? '⬆️ Пополнение' : '⬇️ Вывод'}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10 }}>
              📅 {new Date(r.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>

            {r.admin_comment && <div style={{ fontSize: 12, color: 'var(--yellow)', marginBottom: 10 }}>💬 {r.admin_comment}</div>}

            {filterStatus === 'pending' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success" style={{ flex: 1 }} disabled={acting === r.id} onClick={() => approve(r.id)}>
                  {acting === r.id ? '⏳' : '✅ Одобрить'}
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} disabled={acting === r.id} onClick={() => reject(r.id)}>
                  {acting === r.id ? '⏳' : '❌ Отклонить'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sec">
        <div className="sec-title">Ручная корректировка</div>
        <div className="glass card">
          <p style={{ color: 'var(--t2)', fontSize: 13, marginBottom: 12 }}>Изменить баланс пользователя вручную</p>
          <div className="fg">
            <label className="label">User ID (Telegram)</label>
            <input className="input" type="number" placeholder="123456789" value={adjUserId} onChange={e => setAdjUserId(e.target.value)} />
          </div>
          <div className="fg">
            <label className="label">Имя</label>
            <input className="input" placeholder="Имя пользователя" value={adjName} onChange={e => setAdjName(e.target.value)} />
          </div>
          <button className="btn btn-glass btn-full" onClick={() => {
            const uid = parseInt(adjUserId)
            if (uid) setAdjustModal({ userId: uid, name: adjName || 'Пользователь' })
            else alert('Введите корректный User ID')
          }}>
            ✏️ Корректировать баланс
          </button>
        </div>
      </div>

      {adjustModal && (
        <div className="overlay" onClick={() => setAdjustModal(null)}>
          <div className="glass modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Корректировка баланса</h3>
            <p style={{ color: 'var(--t2)', fontSize: 14, marginBottom: 14 }}>{adjustModal.name} (ID: {adjustModal.userId})</p>

            <div className="fg">
              <label className="label">Сумма (+пополнение, −списание)</label>
              <input className="input" type="number" placeholder="+5000 или -1000" value={adjustAmt} onChange={e => setAdjustAmt(e.target.value)} />
            </div>

            <div className="fg">
              <label className="label">Причина / Комментарий</label>
              <input className="input" placeholder="Бонус за активность..." value={adjustNote} onChange={e => setAdjustNote(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setAdjustModal(null)}>Отмена</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!adjustAmt || acting !== null} onClick={doAdjust}>
                {acting !== null ? '⏳' : '✅ Применить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminTabs />
    </div>
  )
}
