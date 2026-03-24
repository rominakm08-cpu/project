import { useEffect, useState } from 'react'
import { AdminTabs } from '../../components/Tabs'
import { adminApi } from '../../api'

// ── DASHBOARD ─────────────────────────────────────────────────────────
export function AdminDashboard() {
  const [stats, setStats] = useState<any>({})
  useEffect(()=>{ adminApi.stats().then(r=>setStats(r.data)).catch(()=>{}) },[])
  const cards=[
    {l:'Авторов',v:stats.creators||0,s:`+${stats.pending_creators||0} ожидают`,e:'🎬',c:'var(--accent)'},
    {l:'Брендов',v:stats.businesses||0,s:`+${stats.pending_businesses||0} ожидают`,e:'🏢',c:'var(--blue)'},
    {l:'Проектов',v:stats.active_projects||0,s:'активных',e:'📋',c:'var(--green)'},
    {l:'Комиссий',v:`${(stats.total_commission||0).toLocaleString()} ₸`,s:'получено',e:'💰',c:'var(--yellow)'},
  ]
  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Панель</h1><p className="ps">CONCEPT ADS Admin</p></div>
      <div className="sec">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {cards.map(c=>(
            <div key={c.l} className="glass card" style={{textAlign:'center',padding:20}}>
              <div style={{fontSize:28,marginBottom:8}}>{c.e}</div>
              <div style={{fontSize:24,fontWeight:900,color:c.c}}>{c.v}</div>
              <div style={{fontWeight:700,fontSize:13,marginTop:2}}>{c.l}</div>
              <div style={{color:'var(--t3)',fontSize:11,marginTop:2}}>{c.s}</div>
            </div>
          ))}
        </div>
      </div>
      {(stats.pending_creators>0||stats.pending_businesses>0)&&<div className="sec">
        <div className="sec-title">⚠️ Ожидают модерации</div>
        <div style={{display:'flex',gap:12}}>
          {stats.pending_creators>0&&<div className="glass card" style={{flex:1,textAlign:'center',padding:16}}><div style={{fontSize:28,fontWeight:900,color:'var(--accent)'}}>{stats.pending_creators}</div><div style={{fontSize:13,color:'var(--t2)'}}>Авторов</div></div>}
          {stats.pending_businesses>0&&<div className="glass card" style={{flex:1,textAlign:'center',padding:16}}><div style={{fontSize:28,fontWeight:900,color:'var(--blue)'}}>{stats.pending_businesses}</div><div style={{fontSize:13,color:'var(--t2)'}}>Брендов</div></div>}
        </div>
      </div>}
      <AdminTabs/>
    </div>
  )
}

// ── CREATORS ──────────────────────────────────────────────────────────
export function AdminCreators() {
  const [creators, setCreators] = useState<any[]>([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState<any>(null)
  const [reason, setReason] = useState('')

  const load=(s:string)=>{ setLoading(true);adminApi.getCreators(s).then(r=>setCreators(r.data)).catch(()=>{}).finally(()=>setLoading(false)) }
  useEffect(()=>load(tab),[tab])

  const approve=async(id:number)=>{ await adminApi.approveCreator(id);setCreators(c=>c.filter(x=>x.id!==id)) }
  const reject=async()=>{ await adminApi.rejectCreator(rejectModal.id,reason);setCreators(c=>c.filter(x=>x.id!==rejectModal.id));setRejectModal(null);setReason('') }

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Авторы</h1>
        <div style={{display:'flex',gap:8,marginTop:12,overflowX:'auto'}}>
          {['pending','approved','rejected'].map(s=><button key={s} className={`btn ${tab===s?'btn-primary':'btn-glass'}`} style={{padding:'8px 14px',fontSize:12,flexShrink:0}} onClick={()=>setTab(s)}>{s==='pending'?'Ожидают':s==='approved'?'Одобренные':'Отклонённые'}</button>)}
        </div>
      </div>
      <div className="sec">
        {loading&&<div className="center"><div className="spin"/></div>}
        {!loading&&creators.length===0&&<div className="glass card" style={{textAlign:'center',padding:40}}><p style={{color:'var(--t2)'}}>Нет заявок</p></div>}
        {creators.map(c=>(
          <div key={c.id} className="glass card" style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div className="avatar" style={{width:40,height:40,fontSize:18,borderRadius:12}}>{c.name[0]}</div>
                <div><div style={{fontWeight:800,fontSize:15}}>{c.name}</div><div style={{fontSize:12,color:'var(--t3)'}}>📍 {c.city}, {c.country}</div></div>
              </div>
              <span className={`badge ${c.status==='approved'?'b-approved':c.status==='rejected'?'b-rejected':'b-pending'}`}>{c.status}</span>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
              {c.instagram&&<span className="chip" style={{fontSize:12}}>📸 {Number(c.instagram_followers).toLocaleString()}</span>}
              {c.tiktok&&<span className="chip" style={{fontSize:12}}>🎵 {Number(c.tiktok_followers).toLocaleString()}</span>}
              {c.threads&&<span className="chip" style={{fontSize:12}}>🧵 Threads</span>}
            </div>
            <p style={{fontSize:13,color:'var(--t2)',marginBottom:4}}>Ниши: {c.niches||'—'}</p>
            <p style={{fontSize:13,color:'var(--t2)',marginBottom:4}}>Формат: {c.collab_format==='both'?'Бартер + Оплата':c.collab_format==='barter'?'Бартер':'Оплата'}</p>
            <p style={{fontSize:12,color:'var(--t3)',marginBottom:tab==='pending'?12:0}}>TG: {c.telegram_id}</p>
            {tab==='pending'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button className="btn btn-success" onClick={()=>approve(c.id)}>✅ Одобрить</button>
              <button className="btn btn-danger" onClick={()=>setRejectModal(c)}>❌ Отклонить</button>
            </div>}
          </div>
        ))}
      </div>
      {rejectModal&&<div className="overlay" onClick={()=>setRejectModal(null)}>
        <div className="glass modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-handle"/>
          <h3 style={{fontSize:18,fontWeight:800,marginBottom:14}}>Причина отклонения</h3>
          <textarea className="input" placeholder="Укажите причину..." value={reason} onChange={e=>setReason(e.target.value)} rows={3} style={{marginBottom:12}}/>
          <button className="btn btn-danger btn-full" onClick={reject}>❌ Отклонить</button>
        </div>
      </div>}
      <AdminTabs/>
    </div>
  )
}

// ── BUSINESSES ────────────────────────────────────────────────────────
export function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<any[]>([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const load=(s:string)=>{ setLoading(true);adminApi.getBusinesses(s).then(r=>setBusinesses(r.data)).catch(()=>{}).finally(()=>setLoading(false)) }
  useEffect(()=>load(tab),[tab])
  const approve=async(id:number)=>{ await adminApi.approveBusiness(id);setBusinesses(b=>b.filter(x=>x.id!==id)) }
  const reject=async(id:number)=>{ await adminApi.rejectBusiness(id);setBusinesses(b=>b.filter(x=>x.id!==id)) }

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Бизнесы</h1>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          {['pending','approved','rejected'].map(s=><button key={s} className={`btn ${tab===s?'btn-blue':'btn-glass'}`} style={{padding:'8px 14px',fontSize:12}} onClick={()=>setTab(s)}>{s==='pending'?'Ожидают':s==='approved'?'Одобренные':'Отклонённые'}</button>)}
        </div>
      </div>
      <div className="sec">
        {loading&&<div className="center"><div className="spin"/></div>}
        {!loading&&businesses.length===0&&<div className="glass card" style={{textAlign:'center',padding:40}}><p style={{color:'var(--t2)'}}>Нет заявок</p></div>}
        {businesses.map(b=>(
          <div key={b.id} className="glass card" style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div className="avatar" style={{width:40,height:40,fontSize:18,borderRadius:12,background:'linear-gradient(135deg,var(--blue),#5B9BFF)'}}>{b.brand_name[0]}</div>
                <div><div style={{fontWeight:800,fontSize:15}}>{b.brand_name}</div><div style={{fontSize:12,color:'var(--t3)'}}>{b.category} · {b.geo}</div></div>
              </div>
              <span className={`badge ${b.status==='approved'?'b-approved':b.status==='rejected'?'b-rejected':'b-pending'}`}>{b.status}</span>
            </div>
            {[{l:'Контакт',v:b.contact},{l:'Сайт',v:b.website},{l:'ЦА',v:b.target_audience},{l:'Формат',v:b.content_format}].map(r=><p key={r.l} style={{fontSize:13,color:'var(--t2)',marginBottom:4}}><strong style={{color:'var(--t3)'}}>{r.l}:</strong> {r.v}</p>)}
            {b.extra&&<div style={{marginTop:8,padding:'8px 10px',background:'var(--glass)',borderRadius:8,fontSize:13,color:'var(--t2)'}}>{b.extra}</div>}
            {tab==='pending'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}>
              <button className="btn btn-success" onClick={()=>approve(b.id)}>✅ Одобрить</button>
              <button className="btn btn-danger" onClick={()=>reject(b.id)}>❌ Отклонить</button>
            </div>}
          </div>
        ))}
      </div>
      <AdminTabs/>
    </div>
  )
}

// ── OFFERS (admin enrich + activate) ─────────────────────────────────
export function AdminOffers() {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any>(null)
  const [apps, setApps] = useState<any[]>([])
  const [tab2, setTab2] = useState<'edit'|'apps'>('edit')

  useEffect(()=>{ adminApi.getOffers().then(r=>setOffers(r.data)).catch(()=>{}).finally(()=>setLoading(false)) },[])

  const openModal=async(o:any)=>{ setModal({...o});setTab2('edit');adminApi.getApplications(o.id).then(r=>setApps(r.data)).catch(()=>{}) }

  const save=async()=>{
    await adminApi.updateOffer(modal.id,modal)
    setOffers(prev=>prev.map(x=>x.id===modal.id?{...modal}:x))
    setModal(null)
  }

  const activate=async()=>{
    await adminApi.updateOffer(modal.id,{...modal,status:'active'})
    setOffers(prev=>prev.map(x=>x.id===modal.id?{...modal,status:'active'}:x))
    setModal(null)
  }

  const selectCreator=async(appId:number)=>{
    await adminApi.selectCreator(appId)
    setApps(prev=>prev.map(x=>x.id===appId?{...x,status:'selected'}:x))
    alert('Креатор выбран! Проект создан.')
  }

  const s=(k:string,v:any)=>setModal((m:any)=>({...m,[k]:v}))

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Офферы</h1><p className="ps">Управление и активация</p></div>
      <div className="sec">
        {loading&&<div className="center"><div className="spin"/></div>}
        {offers.map(o=>(
          <div key={o.id} className="glass card" style={{marginBottom:12,cursor:'pointer'}} onClick={()=>openModal(o)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
              <div style={{flex:1,paddingRight:10}}>
                <div style={{fontWeight:800,fontSize:15}}>{o.title}</div>
                <div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>{o.brand_name} · {o.platform?.toUpperCase()}</div>
              </div>
              <span className={`badge ${o.status==='active'?'b-active':o.status==='draft'?'b-pending':'b-review'}`}>{o.status}</span>
            </div>
            <p style={{color:'var(--t2)',fontSize:13}}>{o.description?.slice(0,100)}...</p>
          </div>
        ))}
      </div>
      {modal&&<div className="overlay" onClick={()=>setModal(null)}>
        <div className="glass" style={{width:'100%',height:'85vh',borderRadius:'24px 24px 0 0',padding:'20px 20px 40px',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
          <div className="modal-handle"/>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <button className={`btn ${tab2==='edit'?'btn-primary':'btn-glass'}`} style={{padding:'8px 16px',fontSize:13}} onClick={()=>setTab2('edit')}>✏️ Редактировать</button>
            <button className={`btn ${tab2==='apps'?'btn-primary':'btn-glass'}`} style={{padding:'8px 16px',fontSize:13}} onClick={()=>setTab2('apps')}>👥 Отклики ({apps.length})</button>
          </div>
          {tab2==='edit'&&<>
            {[
              {k:'title',l:'Название',p:'Название оффера'},
              {k:'description',l:'Описание',p:'Описание задачи',area:true},
              {k:'product',l:'Продукт',p:'Описание продукта',area:true},
              {k:'what_to_show',l:'Что показать',p:'Что нужно показать в видео',area:true},
              {k:'video_length',l:'Длина ролика',p:'30-60 сек'},
              {k:'style',l:'Стиль',p:'Нативный, живой...'},
              {k:'main_idea',l:'Главная мысль',p:'Основная идея ролика',area:true},
              {k:'start_from',l:'С чего начать',p:'Как начать видео',area:true},
              {k:'language',l:'Язык',p:'Казахский / Русский'},
              {k:'post_topics',l:'Темы для поста',p:'На какие темы можно писать',area:true},
              {k:'post_examples',l:'Примеры постов',p:'Примеры текстов',area:true},
            ].map(f=>(
              <div key={f.k} className="fg">
                <label className="label">{f.l}</label>
                {f.area
                  ? <textarea className="input" placeholder={f.p} value={modal[f.k]||''} onChange={e=>s(f.k,e.target.value)} rows={3}/>
                  : <input className="input" placeholder={f.p} value={modal[f.k]||''} onChange={e=>s(f.k,e.target.value)}/>
                }
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8}}>
              <button className="btn btn-glass" onClick={save}>💾 Сохранить</button>
              <button className="btn btn-primary" onClick={activate}>🚀 Активировать</button>
            </div>
          </>}
          {tab2==='apps'&&<>
            {apps.length===0&&<p style={{color:'var(--t2)',textAlign:'center',padding:30}}>Откликов пока нет</p>}
            {apps.map(a=>(
              <div key={a.id} className="glass card" style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:15}}>{a.name}</div>
                  <span className={`badge ${a.status==='selected'?'b-approved':'b-pending'}`}>{a.status}</span>
                </div>
                <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                  {a.instagram&&<span className="chip" style={{fontSize:11}}>📸 {Number(a.instagram_followers).toLocaleString()}</span>}
                  {a.tiktok&&<span className="chip" style={{fontSize:11}}>🎵 {Number(a.tiktok_followers).toLocaleString()}</span>}
                  {a.threads&&<span className="chip" style={{fontSize:11}}>🧵 Threads</span>}
                </div>
                {a.message&&<p style={{fontSize:13,color:'var(--t2)',marginBottom:8}}>💬 {a.message}</p>}
                {a.status==='pending'&&<button className="btn btn-success btn-full" onClick={()=>selectCreator(a.id)}>✅ Выбрать этого автора</button>}
              </div>
            ))}
          </>}
        </div>
      </div>}
      <AdminTabs/>
    </div>
  )
}

// ── REFERRALS ─────────────────────────────────────────────────────────
export function AdminReferrals() {
  const [refs, setRefs] = useState<any[]>([])
  useEffect(()=>{ adminApi.getReferrals().then(r=>setRefs(r.data)).catch(()=>{}) },[])

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Рефералы</h1><p className="ps">Промокоды и выплаты</p></div>
      <div className="sec">
        {refs.length===0&&<div className="glass card" style={{textAlign:'center',padding:40}}><p style={{color:'var(--t2)'}}>Нет данных</p></div>}
        {refs.map((r,i)=>(
          <div key={i} className="glass card" style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{fontWeight:700,fontSize:15}}>{r.name}</div><div style={{fontSize:13,color:'var(--t3)',fontFamily:'monospace'}}>{r.promo_code}</div></div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:20,fontWeight:900,color:r.approved_count>=5?'var(--green)':'var(--t1)'}}>{r.approved_count||0}<span style={{fontSize:14,color:'var(--t3)'}}>/5</span></div>
                {r.approved_count>=5&&<div style={{fontSize:11,color:'var(--green)',marginTop:2}}>💰 К выплате!</div>}
              </div>
            </div>
            <div style={{marginTop:10,background:'var(--glass-b)',height:5,borderRadius:3}}>
              <div style={{width:`${Math.min((r.approved_count/5)*100,100)}%`,height:'100%',background:'linear-gradient(90deg,var(--accent),var(--green))',borderRadius:3}}/>
            </div>
          </div>
        ))}
      </div>
      <AdminTabs/>
    </div>
  )
}

export default AdminDashboard
