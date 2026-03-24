import { useNavigate } from 'react-router-dom'
import { CreatorTabs } from '../../components/Tabs'

export default function Bonuses() {
  const nav = useNavigate()

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">За бонусы</h1><p className="ps">Выполняй задания и получай баллы</p></div>

      <div className="sec">
        <div className="info-block" style={{ marginBottom: 16 }}>
          ⭐ За каждое задание начисляются баллы · 1 000 баллов = 500 ₸
        </div>

        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🎯</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Заданий пока нет</div>
          <div style={{ color: 'var(--t2)', fontSize: 14, lineHeight: 1.6 }}>
            Здесь появятся задания от брендов.<br />Следи за обновлениями!
          </div>
        </div>
      </div>

      <CreatorTabs active="bonuses" />
    </div>
  )
}
