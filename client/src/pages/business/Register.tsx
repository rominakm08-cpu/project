import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BusinessTabs } from '../../components/Tabs'
import { businessApi } from '../../api'
import { useStore } from '../../store'

const NICHES = ['Лайфстайл','Бьюти и уход','Фитнес','Еда и рецепты','Мама и дети','Путешествия','Дом и интерьер','Мода и стиль','Животные','Образование','Технологии','Финансы']
const FORMATS = ['Видео','Фото','Reels','Stories','Пост в Threads']
const PLATFORMS = ['instagram','tiktok','threads']

export function BusinessRegister() {
  const nav = useNavigate()
  const { init } = useStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ brand_name:'',contact:'',website:'',category:'',target_audience:'',geo:'',content_format:'',extra:'' })
  const s = (k:string,v:any)=>setForm(f=>({...f,[k]:v}))

  const submit = async()=>{
    setLoading(true);setErr('')
    try{ await businessApi.register(form);await init();nav('/') }
    catch(e:any){setErr(e.response?.data?.error||'Ошибка')}
    finally{setLoading(false)}
  }

  return (
    <div className="page">
      <div className="ph">
        <button onClick={()=>step>1?setStep(s=>s-1):nav('/')} style={{background:'none',border:'none',color:'var(--blue)',fontSize:15,fontWeight:700,marginBottom:14,cursor:'pointer',padding:0}}>← Назад</button>
        <h1 className="pt">Регистрация бренда</h1>
        <p className="ps">Шаг {step} из 2</p>
        <div className="prog">{[1,2].map(i=><div key={i} className={`prog-item ${i<=step?'done':''}`}/>)}</div>
      </div>
      <div className="sec fu">
        {step===1&&<>
          <div className="fg"><label className="label">Название бренда *</label><input className="input" placeholder="Nike Kazakhstan" value={form.brand_name} onChange={e=>s('brand_name',e.target.value)}/></div>
          <div className="fg"><label className="label">Контакт (TG или телефон) *</label><input className="input" placeholder="@manager или +7 777..." value={form.contact} onChange={e=>s('contact',e.target.value)}/></div>
          <div className="fg"><label className="label">Сайт / соцсеть *</label><input className="input" placeholder="https://..." value={form.website} onChange={e=>s('website',e.target.value)}/></div>
          <div className="fg"><label className="label">Категория продукта *</label>
            <select className="input" value={form.category} onChange={e=>s('category',e.target.value)}>
              <option value="">Выберите...</option>{NICHES.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="fg"><label className="label">Гео кампании *</label><input className="input" placeholder="Алматы, Астана..." value={form.geo} onChange={e=>s('geo',e.target.value)}/></div>
          {err&&<p className="err-text" style={{marginBottom:10}}>{err}</p>}
          <button className="btn btn-blue btn-full" onClick={()=>{
            if(!form.brand_name||!form.contact||!form.website||!form.category||!form.geo)return setErr('Заполните все поля')
            setErr('');setStep(2)
          }}>Далее →</button>
        </>}
        {step===2&&<>
          <div className="fg"><label className="label">Целевая аудитория *</label><textarea className="input" placeholder="Женщины 25-40, интересующиеся бьюти..." value={form.target_audience} onChange={e=>s('target_audience',e.target.value)}/></div>
          <div className="fg"><label className="label">Формат контента *</label>
            <div className="chips">{FORMATS.map(f=><button key={f} className={`chip ${form.content_format===f?'on':''}`} onClick={()=>s('content_format',f)}>{f}</button>)}</div>
          </div>
          <div className="fg"><label className="label">Дополнительно</label><textarea className="input" placeholder="Любые уточнения по задаче..." value={form.extra} onChange={e=>s('extra',e.target.value)}/></div>
          <div className="info-block" style={{marginBottom:16}}>ℹ️ Команда CONCEPT подберёт подходящих креаторов под вашу задачу. Бизнес не видит каталог авторов напрямую.</div>
          {err&&<p className="err-text" style={{marginBottom:10,textAlign:'center'}}>{err}</p>}
          <button className="btn btn-blue btn-full" disabled={loading} onClick={submit}>{loading?'⏳ Отправляем...':'✅ Подать заявку'}</button>
          <p style={{textAlign:'center',color:'var(--t3)',fontSize:12,marginTop:12}}>Заявка рассматривается командой CONCEPT в течение 24 часов</p>
        </>}
      </div>
    </div>
  )
}

export function BusinessHome() {
  const { tgUser } = useStore()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  useEffect(()=>{ businessApi.me().then(r=>setData(r.data)).catch(()=>{});businessApi.getOffers().then(r=>setOffers(r.data)).catch(()=>{}) },[])
  const b = data?.business

  return (
    <div className="page">
      <div className="ph">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div><p style={{color:'var(--t3)',fontSize:13,fontWeight:600}}>Привет 👋</p><h1 className="pt">{b?.brand_name||tgUser?.first_name||'Бренд'}</h1></div>
          <div className="avatar" style={{background:'linear-gradient(135deg,var(--blue),#5B9BFF)'}}>{(b?.brand_name||'B')[0]}</div>
        </div>
        {b&&<div style={{marginTop:10}}><span className={`badge ${b.status==='approved'?'b-approved':b.status==='rejected'?'b-rejected':'b-pending'}`}>{b.status==='approved'?'✅ Одобрен':b.status==='rejected'?'❌ Отклонён':'⏳ На модерации'}</span></div>}
      </div>
      {b?.status==='pending'&&<div className="sec"><div className="glass-blue card"><div style={{fontSize:28,marginBottom:8}}>⏳</div><h3 style={{fontSize:17,fontWeight:800,marginBottom:6}}>Заявка на рассмотрении</h3><p style={{color:'var(--t2)',fontSize:14,lineHeight:1.5}}>Команда CONCEPT рассмотрит вашу заявку в течение 24 часов.</p></div></div>}
      {b?.status==='approved'&&<>
        <div className="sec"><button className="btn btn-blue btn-full" style={{padding:20,fontSize:16}} onClick={()=>nav('/create-offer')}><span style={{fontSize:26}}>✨</span><div style={{textAlign:'left'}}><div style={{fontWeight:800}}>Создать новый проект</div><div style={{fontSize:12,opacity:.7,fontWeight:400,marginTop:2}}>Найдём авторов за 24 часа</div></div></button></div>
        <div className="sec"><div className="sec-title">Как работает платформа</div>
          <div className="glass card">{[{n:'01',t:'Создаёте проект',d:'Описываете задачу, платформу и требования'},{n:'02',t:'Мы подбираем авторов',d:'Команда CONCEPT выбирает подходящих креаторов'},{n:'03',t:'Контент на проверку',d:'Вы принимаете или запрашиваете правки (до 3)'},{n:'04',t:'Закрытие',d:'20% комиссии платформы при оплате'}].map((s,i)=>(
            <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:i<3?'1px solid var(--glass-b)':'none'}}>
              <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:'rgba(26,107,255,.15)',border:'1px solid rgba(26,107,255,.22)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'var(--blue)'}}>{s.n}</div>
              <div><div style={{fontWeight:700,fontSize:14}}>{s.t}</div><div style={{color:'var(--t3)',fontSize:12,marginTop:2}}>{s.d}</div></div>
            </div>
          ))}</div>
        </div>
        {offers.slice(0,3).length>0&&<div className="sec"><div className="sec-title">Последние проекты</div>
          {offers.slice(0,3).map(o=>(
            <div key={o.id} className="glass card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div><div style={{fontWeight:700,fontSize:14}}>{o.title}</div><div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>{o.platform?.toUpperCase()}</div></div>
              <span className={`badge ${o.status==='active'?'b-active':o.status==='in_progress'?'b-review':'b-pending'}`}>{o.status}</span>
            </div>
          ))}
        </div>}
      </>}
      <BusinessTabs/>
    </div>
  )
}

export function BusinessCreateOffer() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({title:'',description:'',product:'',what_to_show:'',video_length:'',style:'',platform:'',niches:[] as string[],budget:'',deadline:''})
  const s=(k:string,v:any)=>setForm(f=>({...f,[k]:v}))
  const toggleNiche=(n:string)=>{ if(form.niches.includes(n))s('niches',form.niches.filter(x=>x!==n));else if(form.niches.length<3)s('niches',[...form.niches,n]) }

  const submit=async()=>{
    if(!form.title||!form.description||!form.platform)return setErr('Заполните обязательные поля')
    setLoading(true);setErr('')
    try{await businessApi.createOffer({...form,budget:Number(form.budget)||0});nav('/')}
    catch(e:any){setErr(e.response?.data?.error||'Ошибка')}
    finally{setLoading(false)}
  }

  return (
    <div className="page">
      <div className="ph"><button onClick={()=>nav('/')} style={{background:'none',border:'none',color:'var(--blue)',fontSize:15,fontWeight:700,marginBottom:14,cursor:'pointer',padding:0}}>← Назад</button><h1 className="pt">Новый проект</h1><p className="ps">Опишите задачу — подберём авторов</p></div>
      <div className="sec fu">
        <div className="fg"><label className="label">Название проекта *</label><input className="input" placeholder="Обзор продукта для TikTok" value={form.title} onChange={e=>s('title',e.target.value)}/></div>
        <div className="fg"><label className="label">Описание задачи *</label><textarea className="input" placeholder="Подробно опишите что нужно снять..." value={form.description} onChange={e=>s('description',e.target.value)} rows={4}/></div>
        <div className="fg"><label className="label">Продукт</label><input className="input" placeholder="Название и описание продукта" value={form.product} onChange={e=>s('product',e.target.value)}/></div>
        <div className="fg"><label className="label">Что показать</label><input className="input" placeholder="Как используется, реакция, лайфхак..." value={form.what_to_show} onChange={e=>s('what_to_show',e.target.value)}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div className="fg"><label className="label">Длина ролика</label><input className="input" placeholder="30-60 сек" value={form.video_length} onChange={e=>s('video_length',e.target.value)}/></div>
          <div className="fg"><label className="label">Стиль</label><input className="input" placeholder="Нативный, живой..." value={form.style} onChange={e=>s('style',e.target.value)}/></div>
        </div>
        <div className="fg"><label className="label">Платформа *</label>
          <div className="chips">{PLATFORMS.map(p=><button key={p} className={`chip ${form.platform===p?'on':''}`} onClick={()=>s('platform',p)}>{p==='instagram'?'📸 Instagram':p==='tiktok'?'🎵 TikTok':'🧵 Threads'}</button>)}</div>
        </div>
        <div className="fg"><label className="label">Ниши (до 3)</label><div className="chips">{NICHES.map(n=><button key={n} className={`chip ${form.niches.includes(n)?'on':''}`} onClick={()=>toggleNiche(n)}>{n}</button>)}</div></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div className="fg"><label className="label">Бюджет (₸)</label><input className="input" type="number" placeholder="50000" value={form.budget} onChange={e=>s('budget',e.target.value)}/></div>
          <div className="fg"><label className="label">Дедлайн</label><input className="input" type="date" value={form.deadline} onChange={e=>s('deadline',e.target.value)}/></div>
        </div>
        <div className="info-block" style={{marginBottom:16}}>ℹ️ После создания оффер уйдёт на проверку. Команда CONCEPT дополнит его и опубликует для авторов.</div>
        {err&&<p className="err-text" style={{marginBottom:12,textAlign:'center'}}>{err}</p>}
        <button className="btn btn-blue btn-full" disabled={loading} onClick={submit}>{loading?'⏳ Создаём...':'🚀 Создать проект'}</button>
      </div>
      <BusinessTabs/>
    </div>
  )
}

export function BusinessProjects() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any>(null)
  const [feedback, setFeedback] = useState('')
  const [sub, setSub] = useState(false)

  useEffect(()=>{ businessApi.getProjects().then(r=>setProjects(r.data)).catch(()=>{}).finally(()=>setLoading(false)) },[])

  const STATUS:any={new:{l:'Новый',c:'b-pending'},in_progress:{l:'В работе',c:'b-active'},review:{l:'На проверке',c:'b-review'},revision:{l:'Правки',c:'b-revision'},done:{l:'Принят',c:'b-done'},paid:{l:'Оплачен',c:'b-paid'},closed:{l:'Закрыт',c:'b-pending'}}

  const review=async(action:string)=>{
    setSub(true)
    try{
      await businessApi.reviewProject(modal.id,action,feedback)
      setProjects(p=>p.map(x=>x.id===modal.id?{...x,status:action==='approve'?'done':'revision',feedback}:x))
      setModal(null);setFeedback('')
    }catch(e:any){alert(e.response?.data?.error||'Ошибка')}
    finally{setSub(false)}
  }

  return (
    <div className="page">
      <div className="ph"><h1 className="pt">Проекты</h1><p className="ps">{projects.length} проект{projects.length===1?'':'а'}</p></div>
      <div className="sec">
        {loading&&<div className="center"><div className="spin"/></div>}
        {!loading&&projects.length===0&&<div className="glass card" style={{textAlign:'center',padding:40}}><div style={{fontSize:40,marginBottom:12}}>📋</div><p style={{color:'var(--t2)'}}>Нет активных проектов</p></div>}
        {projects.map(p=>{
          const st=STATUS[p.status]||{l:p.status,c:'b-pending'}
          return(
            <div key={p.id} className="glass card" style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <h3 style={{fontSize:15,fontWeight:800,flex:1,paddingRight:10}}>{p.title}</h3>
                <span className={`badge ${st.c}`}>{st.l}</span>
              </div>
              {p.creator_name&&<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'8px 10px',background:'var(--glass)',borderRadius:10}}>
                <div className="avatar" style={{width:28,height:28,fontSize:12,borderRadius:8}}>{p.creator_name[0]}</div>
                <span style={{fontSize:13,fontWeight:600}}>{p.creator_name}</span>
                <span style={{fontSize:12,color:'var(--t3)'}}>{p.instagram?'📸':p.tiktok?'🎵':'🧵'}</span>
              </div>}
              {p.content_url&&<a href={p.content_url} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:6,color:'var(--blue)',fontSize:14,marginBottom:10,padding:'10px 12px',background:'rgba(26,107,255,.08)',borderRadius:10,textDecoration:'none'}}>🔗 Просмотреть контент</a>}
              {p.feedback&&<div style={{padding:'10px 12px',borderRadius:10,marginBottom:10,background:'rgba(255,184,0,.07)',border:'1px solid rgba(255,184,0,.18)',fontSize:13,color:'var(--yellow)'}}>{p.feedback}</div>}
              {p.status==='review'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <button className="btn btn-success" onClick={()=>setModal({...p,_act:'approve'})}>✅ Принять</button>
                <button className="btn btn-danger" onClick={()=>setModal({...p,_act:'revision'})}>✏️ Правки</button>
              </div>}
            </div>
          )
        })}
      </div>
      {modal&&<div className="overlay" onClick={()=>setModal(null)}>
        <div className="glass modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-handle"/>
          <h3 style={{fontSize:18,fontWeight:800,marginBottom:14}}>{modal._act==='revision'?'Запросить правки':'Принять контент'}</h3>
          <textarea className="input" placeholder={modal._act==='revision'?'Что нужно исправить?':'Комментарий (необязательно)'} value={feedback} onChange={e=>setFeedback(e.target.value)} rows={3} style={{marginBottom:12}}/>
          <button className={`btn ${modal._act==='revision'?'btn-danger':'btn-success'} btn-full`} disabled={sub} onClick={()=>review(modal._act)}>
            {sub?'⏳...':(modal._act==='revision'?'✏️ Отправить на правки':'✅ Принять работу')}
          </button>
        </div>
      </div>}
      <BusinessTabs/>
    </div>
  )
}

export function BusinessProfile() {
  const [data, setData] = useState<any>(null)
  useEffect(()=>{ businessApi.me().then(r=>setData(r.data)).catch(()=>{}) },[])
  const b = data?.business
  const txns = data?.transactions||[]
  if(!b)return <div className="center"><div className="spin"/></div>

  return (
    <div className="page">
      <div className="ph">
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',paddingTop:20}}>
          <div className="avatar" style={{width:80,height:80,fontSize:36,borderRadius:24,marginBottom:12,background:'linear-gradient(135deg,var(--blue),#5B9BFF)',boxShadow:'0 0 40px rgba(26,107,255,.4)'}}>{b.brand_name[0]}</div>
          <h1 style={{fontSize:24,fontWeight:800}}>{b.brand_name}</h1>
          <p style={{color:'var(--t2)',fontSize:14,marginTop:4}}>📍 {b.geo}</p>
          <div style={{marginTop:8}}><span className={`badge ${b.status==='approved'?'b-approved':b.status==='rejected'?'b-rejected':'b-pending'}`}>{b.status==='approved'?'✅ Одобрен':b.status==='rejected'?'❌ Отклонён':'⏳ На модерации'}</span></div>
        </div>
      </div>
      <div className="sec"><div className="sec-title">Информация</div>
        <div className="glass card">{[{l:'Контакт',v:b.contact},{l:'Сайт',v:b.website},{l:'Категория',v:b.category},{l:'ЦА',v:b.target_audience},{l:'Формат',v:b.content_format}].map((r,i)=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<4?'1px solid var(--glass-b)':'none'}}>
            <span style={{color:'var(--t2)',fontSize:13}}>{r.l}</span>
            <span style={{fontWeight:600,fontSize:13,maxWidth:'60%',textAlign:'right'}}>{r.v}</span>
          </div>
        ))}</div>
      </div>
      {txns.length>0&&<div className="sec"><div className="sec-title">Транзакции</div>
        {txns.map((t:any)=>(
          <div key={t.id} className="glass card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div><div style={{fontSize:14,fontWeight:500}}>{t.description}</div><div style={{fontSize:12,color:'var(--t3)'}}>{new Date(t.created_at).toLocaleDateString('ru-RU')}</div></div>
            <div style={{fontWeight:800,color:t.amount<0?'var(--red)':'var(--green)',fontSize:15}}>{t.amount.toLocaleString()} ₸</div>
          </div>
        ))}
      </div>}
      <div className="sec"><button className="btn btn-glass btn-full" onClick={()=>(window as any).Telegram?.WebApp?.openTelegramLink('https://t.me/Jamaal_concept')}>💬 Написать в поддержку</button></div>
      <BusinessTabs/>
    </div>
  )
}

export default BusinessRegister
