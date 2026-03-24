import { useNavigate, useLocation } from 'react-router-dom'

function Tabs({ tabs }: { tabs: { path: string; label: string; icon: (a: boolean) => JSX.Element }[] }) {
  const nav = useNavigate()
  const { pathname } = useLocation()
  return (
    <div className="tabbar">
      {tabs.map(t => {
        const a = pathname === t.path
        return (
          <button key={t.path} className={`tab ${a ? 'active' : ''}`} onClick={() => nav(t.path)}>
            {t.icon(a)}{t.label}{a && <div className="tab-dot" />}
          </button>
        )
      })}
    </div>
  )
}

const HomeIco = (a: boolean) => <svg viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const OfferIco = (a: boolean) => <svg viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
const ProjIco = (a: boolean) => <svg viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const ProfIco = (a: boolean) => <svg viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const PlusIco = (a: boolean) => <svg viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
const RefIco = (a: boolean) => <svg viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={2}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
const BizIco = (a: boolean) => <svg viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>

export function CreatorTabs() {
  return <Tabs tabs={[
    { path:'/', label:'Главная', icon: HomeIco },
    { path:'/offers', label:'Офферы', icon: OfferIco },
    { path:'/projects', label:'Проекты', icon: ProjIco },
    { path:'/profile', label:'Профиль', icon: ProfIco },
  ]} />
}

export function BusinessTabs() {
  return <Tabs tabs={[
    { path:'/', label:'Главная', icon: HomeIco },
    { path:'/create-offer', label:'Создать', icon: PlusIco },
    { path:'/projects', label:'Проекты', icon: ProjIco },
    { path:'/profile', label:'Профиль', icon: ProfIco },
  ]} />
}

export function AdminTabs() {
  return <Tabs tabs={[
    { path:'/', label:'Стат.', icon: HomeIco },
    { path:'/creators', label:'Авторы', icon: ProfIco },
    { path:'/businesses', label:'Бизнес', icon: BizIco },
    { path:'/offers', label:'Офферы', icon: OfferIco },
    { path:'/referrals', label:'Рефералы', icon: RefIco },
  ]} />
}
