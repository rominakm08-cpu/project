export default function Splash() {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',gap:20,background:'#08080f'}}>
      <div style={{width:88,height:88,borderRadius:26,background:'linear-gradient(135deg,#7C3AED,#1A6BFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:42,boxShadow:'0 0 50px rgba(124,58,237,.55)'}}>✦</div>
      <div style={{fontSize:22,fontWeight:800,letterSpacing:-.5,color:'#fff'}}>CONCEPT ADS</div>
      <div className="spin"/>
    </div>
  )
}
