import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { balanceApi, creatorApi, businessApi } from '../../api'
import { useStore } from '../../store'

export default function Balance() {
  const nav = useNavigate()
  const { user } = useStore()
  const [balance, setBalance] = useState(0)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'topup' | 'withdraw'>('topup')
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [sub, setSub] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    try {
      const role = user?.role
      const [meRes, reqRes] = await Promise.all([
        role === 'business'
          ? businessApi.me().catch(() => null)
          : creatorApi.me().catch(() => null),
        balanceApi.getInfo().catch(() => ({ data: [] })),
      ])
      if (role === 'business') {
        setBalance(meRes?.data?.business?.balance || 0)
      } else {
        setBalance(meRes?.data?.creator?.balance || 0)
      }
      setRequests(Array.isArray(reqRes.data) ? reqRes.data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    const amt = parseInt(amount)
    if (!amt || amt < 1000) { setErr('Минимальная сумма: 1 000 ₸'); return }
    if (!phone.trim()) { setErr('Укажите номер Kaspi'); return }
    setErr('')
    setSub(true)
    try {
      await balanceApi.request({ type: tab, amount: amt, details: phone.trim() })
      await load()
      setAmount('')
      setPhone('')
      alert(tab === 'topup'
        ? '✅ Заявка на пополнение отправлена!\n\nПереведите сумму на Kaspi: +7 705 391 4080 (Ерсаин А.) и укажите в комментарии ваш Telegram username.'
        : '✅ Заявка на вывод принята! Ожидайте перевода в течение 24 часов.')
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Ошибка')
    } finally {
      setSub(false)
    }
  }

  const STATUS: any = {
    pending: { l: 'Ожидает', c: 'b-pending' },
    approved: { l: 'Одобрено', c: 'b-approved' },
    rejected: { l: 'Отклонено', c: 'b-rejected' },
  }

  return (
    <div className="page">
      <div className="ph" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 20 }} onClick={() => nav(-1)}>←</button>
        <div>
          <h1 className="pt">Баланс</h1>
          <p className="ps">Пополнение и вывод средств</p>
        </div>
      </div>

      {loading ? <div className="center"><div className="spin" /></div> : <>
        <div className="sec">
          <div className="glass-purple card" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <p style={{ color: 'var(--t2)', fontSize: 13, marginBottom: 6 }}>Текущий баланс</p>
            <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2 }}>
              {balance.toLocaleString()} <span style={{ fontSize: 24, color: 'var(--t2)' }}>₸</span>
            </div>
          </div>
        </div>

        <div className="sec">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['topup', 'withdraw'] as const).map(t => (
              <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-glass'}`}
                style={{ flex: 1, padding: '10px 0' }}
                onClick={() => { setTab(t); setErr('') }}>
                {t === 'topup' ? '⬆️ Пополнить' : '⬇️ Вывести'}
              </button>
            ))}
          </div>

          <div className="glass card">
            {tab === 'topup' && (
              <div className="info-block" style={{ marginBottom: 14 }}>
                💳 Переведите нужную сумму на Kaspi: <strong>+7 705 391 4080</strong> (Ерсаин А.), затем оставьте заявку ниже.
              </div>
            )}
            {tab === 'withdraw' && (
              <div className="info-block" style={{ marginBottom: 14 }}>
                💸 Укажите сумму вывода и ваш номер Kaspi. Обработка до 24 часов.
              </div>
            )}

            <div className="fg">
              <label className="label">Сумма (₸)</label>
              <input className={`input ${err && !amount ? 'err' : ''}`} type="number"
                placeholder="1000" value={amount}
                onChange={e => setAmount(e.target.value)} min={1000} />
            </div>

            <div className="fg">
              <label className="label">Ваш номер Kaspi</label>
              <input className={`input ${err && !phone.trim() ? 'err' : ''}`} type="tel"
                placeholder="+7 7XX XXX XXXX" value={phone}
                onChange={e => setPhone(e.target.value)} />
            </div>

            {err && <p className="err-text" style={{ marginBottom: 12 }}>{err}</p>}

            <button className="btn btn-primary btn-full" disabled={sub} onClick={submit}>
              {sub ? '⏳ Отправляем...' : tab === 'topup' ? '✅ Отправить заявку на пополнение' : '✅ Отправить заявку на вывод'}
            </button>
          </div>
        </div>

        {requests.length > 0 && (
          <div className="sec">
            <div className="sec-title">История заявок</div>
            {requests.map((r: any) => (
              <div key={r.id} className="glass card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.type === 'topup' ? '⬆️ Пополнение' : '⬇️ Вывод'}</div>
                  {r.details && <div style={{ fontSize: 12, color: 'var(--t3)' }}>{r.details}</div>}
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{new Date(r.created_at).toLocaleDateString('ru-RU')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: r.type === 'topup' ? 'var(--green)' : 'var(--yellow)', fontSize: 15 }}>
                    {r.type === 'topup' ? '+' : '-'}{Number(r.amount).toLocaleString()} ₸
                  </div>
                  <span className={`badge ${(STATUS[r.status] || STATUS.pending).c}`} style={{ fontSize: 10 }}>
                    {(STATUS[r.status] || STATUS.pending).l}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </>}
    </div>
  )
}
