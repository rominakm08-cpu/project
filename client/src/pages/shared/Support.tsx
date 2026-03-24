import { useNavigate } from 'react-router-dom'

export default function Support() {
  const nav = useNavigate()
  const tg = (window as any).Telegram?.WebApp
  const open = (url: string) => {
    if (tg?.openTelegramLink) tg.openTelegramLink(url)
    else window.open(url, '_blank')
  }

  const blocks = [
    {
      icon: '💬',
      title: 'Сообщество CONCEPT',
      desc: 'Общение, новости и обновления платформы',
      color: 'rgba(124,58,237,.15)',
      border: 'rgba(124,58,237,.3)',
      sub: [
        { label: '📢 Информация', desc: 'Новости и объявления', internal: '/news' },
        { label: '📂 Материалы', desc: 'Файлы и ресурсы для заданий', internal: '/news' },
        { label: '🤝 Комьюнити', desc: 'Общение участников', internal: '/community' },
        { label: '❓ Вопросы', desc: 'Задайте вопрос сообществу', internal: '/community' },
      ]
    },
    {
      icon: '🛠',
      title: 'Техподдержка',
      desc: 'Решение проблем и вопросов по платформе',
      color: 'rgba(26,107,255,.12)',
      border: 'rgba(26,107,255,.28)',
      action: { label: '💬 Написать в поддержку', internal: '/support/tech' }
    },
    {
      icon: '🤝',
      title: 'Сотрудничество',
      desc: 'Партнёрство, реклама и спецпроекты',
      color: 'rgba(0,200,151,.1)',
      border: 'rgba(0,200,151,.25)',
      action: { label: '📩 Написать по сотрудничеству', internal: '/support/partnership' }
    },
    {
      icon: '🤖',
      title: 'Jarvis — AI ассистент',
      desc: 'Мгновенные ответы на вопросы о платформе',
      color: 'rgba(157,92,245,.12)',
      border: 'rgba(157,92,245,.3)',
      action: { label: '🚀 Открыть Jarvis', internal: '/ai-support' }
    },
  ]

  return (
    <div className="page">
      <div className="ph" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-glass" style={{ padding: '8px 14px', fontSize: 20 }} onClick={() => nav(-1)}>←</button>
        <div>
          <h1 className="pt">Поддержка</h1>
          <p className="ps">Помощь и сообщество</p>
        </div>
      </div>

      <div className="sec">
        {blocks.map((b, i) => (
          <div key={i} className="glass card" style={{ marginBottom: 14, borderColor: b.border, background: b.color }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 28 }}>{b.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{b.title}</div>
                <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2 }}>{b.desc}</div>
              </div>
            </div>

            {b.sub && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {b.sub.map((s, j) => (
                  <div key={j} onClick={() => (s as any).internal ? nav((s as any).internal) : open((s as any).url)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.06)', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{s.desc}</div>
                    </div>
                    <span style={{ color: 'var(--t3)', fontSize: 18 }}>›</span>
                  </div>
                ))}
              </div>
            )}

            {b.action && (
              <button className="btn btn-glass btn-full"
                onClick={() => b.action!.internal ? nav(b.action!.internal) : open((b.action as any).url)}>
                {b.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
