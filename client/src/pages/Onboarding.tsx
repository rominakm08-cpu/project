import { useNavigate } from 'react-router-dom'

export default function Onboarding() {
  const nav = useNavigate()
  return (
    <div className="page" style={{display:'flex',flexDirection:'column',minHeight:'100vh'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px',textAlign:'center'}}>
        <div style={{width:100,height:100,borderRadius:30,background:'linear-gradient(135deg,#7C3AED,#1A6BFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:50,marginBottom:28,boxShadow:'0 0 70px rgba(124,58,237,.45),0 0 130px rgba(26,107,255,.2)'}}>✦</div>
        <h1 style={{fontSize:38,fontWeight:900,letterSpacing:-1.2,marginBottom:10,lineHeight:1.05,color:'#fff'}}>CONCEPT<br/>ADS</h1>
        <p style={{fontSize:15,color:'rgba(255,255,255,.55)',lineHeight:1.6,maxWidth:280}}>UGC-маркетплейс для брендов и креаторов Казахстана</p>
        <div style={{display:'flex',gap:8,marginTop:20,flexWrap:'wrap',justifyContent:'center'}}>
          {['300+ креаторов','Безопасные сделки','Комиссия 20%'].map(t=>(
            <span key={t} className="glass" style={{padding:'5px 12px',borderRadius:100,fontSize:12,color:'rgba(255,255,255,.5)'}}>✓ {t}</span>
          ))}
        </div>
      </div>
      <div style={{padding:'0 20px 44px'}}>
        <p style={{textAlign:'center',fontSize:12,color:'rgba(255,255,255,.3)',marginBottom:18,letterSpacing:.6,textTransform:'uppercase',fontWeight:700}}>Выберите роль</p>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <button className="btn btn-primary btn-full" style={{padding:20,fontSize:16}} onClick={()=>nav('/creator/register')}>
            <span style={{fontSize:26}}>🎬</span>
            <div style={{textAlign:'left'}}>
              <div style={{fontWeight:800}}>Я — Креатор</div>
              <div style={{fontSize:12,opacity:.7,fontWeight:400,marginTop:2}}>Снимаю UGC-контент для брендов</div>
            </div>
          </button>
          <button className="btn btn-blue btn-full" style={{padding:20,fontSize:16}} onClick={()=>nav('/business/register')}>
            <span style={{fontSize:26}}>🏢</span>
            <div style={{textAlign:'left'}}>
              <div style={{fontWeight:800}}>Я — Бренд / Бизнес</div>
              <div style={{fontSize:12,opacity:.7,fontWeight:400,marginTop:2}}>Ищу авторов для нативной рекламы</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
