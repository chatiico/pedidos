import { useState, useEffect, useCallback, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API_BASE    = "https://api.chatico.net";
const CHATICO_API = "https://app.chatico.io/api";
const LOGO = "https://chatiico.com/wp-content/uploads/2024/06/cropped-cropped-logo-col-completo-IA-blanco24-.png";

const cop = (c) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format((c||0)/100);
const copRaw = (p) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(parseFloat(p)||0);
const fmtTime = (iso) => { try{return new Date(iso).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"});}catch{return "--:--";} };
const getToken = () => localStorage.getItem("cht_token");
const getUser  = () => { try{return JSON.parse(localStorage.getItem("cht_user"));}catch{return null;} };

const STATUS = {
  "Not processed":{label:"Nuevo Pedido",  col:"#3b82f6",bg:"#0f2748",icon:"📥"},
  "Processing":   {label:"En Preparación",col:"#f59e0b",bg:"#3d1f00",icon:"🔥"},
  "Shipped":      {label:"Enviado",       col:"#a78bfa",bg:"#2c1654",icon:"🛵"},
  "Delivered":    {label:"Entregado",     col:"#22c55e",bg:"#052612",icon:"✅"},
  "Cancelled":    {label:"Cancelado",     col:"#ef4444",bg:"#3c0a0a",icon:"❌"},
};
const SK = ["Not processed","Processing","Shipped","Delivered","Cancelled"];

const authH = () => ({"Content-Type":"application/json","Authorization":`Bearer ${getToken()}`});
const apiFetch = async(path,opts={}) => { try{const r=await fetch(`${API_BASE}${path}`,{headers:authH(),...opts});return await r.json();}catch{return null;} };
const chFetch  = async(path,token,opts={}) => { try{const r=await fetch(`${CHATICO_API}${path}`,{headers:{"accept":"application/json","X-ACCESS-TOKEN":token},...opts});return await r.json();}catch{return null;} };

const WEEKLY=[{d:"Lun",v:145000,p:8},{d:"Mar",v:220000,p:12},{d:"Mié",v:189000,p:10},{d:"Jue",v:310000,p:17},{d:"Vie",v:278000,p:15},{d:"Sáb",v:390000,p:21},{d:"Hoy",v:246300,p:13}];
const TOPROD=[{name:"Hamburguesa BBQ",qty:34},{name:"Alitas BBQ",qty:28},{name:"Salchipapas",qty:22},{name:"Jugo Natural",qty:19},{name:"Gaseosa Naranja",qty:15}];
const PAYS=[{name:"Nequi",pct:38,color:"#7c3aed"},{name:"Efectivo",pct:28,color:"#f59e0b"},{name:"Daviplata",pct:22,color:"#f97316"},{name:"Tarjeta",pct:12,color:"#3b82f6"}];

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
.os{font-family:Arial,Helvetica,sans-serif;background:#060a12;color:#dde6f0;min-height:100vh;display:flex;overflow:hidden;position:relative;}
.os *{box-sizing:border-box;margin:0;padding:0;}
.os ::-webkit-scrollbar{width:3px;height:3px;}.os ::-webkit-scrollbar-thumb{background:#25D36640;border-radius:4px;}

/* LIGHT MODE */
.os.light{background:#f8fafc;color:#1e293b;}
.os.light .sidebar{background:#fff;border-right:1px solid #e2e8f0;}
.os.light .navbtn{color:#94a3b8;}.os.light .navbtn:hover{background:#f1f5f9;}
.os.light .navbtn.on{background:#dcfce7;color:#16a34a;}
.os.light .navbtn.on::before{background:#25D366;}
.os.light .hdr{background:#fff;border-bottom:1px solid #e2e8f0;color:#1e293b;}
.os.light .body{background:#f8fafc;}
.os.light .card{background:#fff;border:1px solid #e2e8f0;}
.os.light .stat{background:#fff;border:1px solid #e2e8f0;}
.os.light .inp{background:#f1f5f9;border:1px solid #e2e8f0;color:#1e293b;}
.os.light .modal{background:#fff;border:1px solid #e2e8f0;}
.os.light .toast{background:#fff;border:1px solid #e2e8f0;}
.os.light .kcol{background:#f1f5f9;border:1px solid #e2e8f0;}
.os.light .kcard{background:#fff;border:1px solid #e2e8f0;color:#1e293b;}
.os.light .auth-bg{background:#f8fafc;}
.os.light .auth-card{background:#fff;border:1px solid #e2e8f0;}
.os.light .auth-lbl{color:#475569;}
.os.light .auth-title{color:#1e293b;}
.os.light .auth-sub{color:#64748b;}
.auth-bg{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#060a12;overflow-y:auto;}
.auth-card{background:#0d1526;border:1px solid #1a2742;border-radius:20px;padding:40px;width:420px;max-width:calc(100vw - 40px);margin:auto;}
.auth-logo{width:150px;margin:0 auto 28px;display:block;}
.auth-title{font-size:22px;font-weight:800;text-align:center;margin-bottom:6px;}
.auth-sub{font-size:13px;color:#64748b;text-align:center;margin-bottom:28px;}
.auth-lbl{font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:6px;display:block;}
.auth-field{margin-bottom:16px;}
.auth-link{color:#25D366;font-size:13px;cursor:pointer;background:none;border:none;font-family:'Syne',sans-serif;font-weight:600;padding:0;}
.auth-link:hover{text-decoration:underline;}
.auth-err{background:#3c0a0a;border:1px solid #ef444430;border-radius:8px;padding:10px 14px;font-size:13px;color:#fca5a5;margin-bottom:14px;}
.auth-ok{background:#052612;border:1px solid #22c55e30;border-radius:8px;padding:10px 14px;font-size:13px;color:#86efac;margin-bottom:14px;}
.auth-div{display:flex;align-items:center;gap:12px;margin:20px 0;color:#1e2d3d;font-size:12px;}
.auth-div::before,.auth-div::after{content:'';flex:1;height:1px;background:#1e2d3d;}
.sidebar{width:62px;background:#0a0f1c;border-right:1px solid #1a2236;display:flex;flex-direction:column;align-items:center;padding:14px 0;gap:4px;flex-shrink:0;}
.navbtn{width:42px;height:42px;border-radius:12px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;position:relative;color:#4b5563;}
.navbtn:hover{background:#ffffff10;color:#94a3b8;}.navbtn.on{background:#25D36618;color:#25D366;}
.navbtn.on::before{content:'';position:absolute;left:-14px;top:50%;transform:translateY(-50%);width:3px;height:20px;background:#25D366;border-radius:0 3px 3px 0;}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.hdr{background:#0a0f1c;border-bottom:1px solid #1a2236;padding:0 22px;height:56px;display:flex;align-items:center;gap:14px;flex-shrink:0;}
.body{flex:1;overflow-y:auto;padding:20px;}.body.kb{overflow-y:hidden;overflow-x:auto;background:#f8fafc;}
.card{background:#0d1526;border:1px solid #1a2742;border-radius:14px;}
.krow{display:flex;gap:12px;height:100%;padding-bottom:8px;}
.kcol{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:14px;padding:12px;width:275px;min-width:275px;display:flex;flex-direction:column;gap:8px;max-height:100%;}
.kcol.ov{border-color:#25D36650;background:#f0fdf4;}
.kbody{display:flex;flex-direction:column;gap:8px;overflow-y:auto;flex:1;}
.kbody::-webkit-scrollbar{width:2px;}.kbody::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px;}
.kcard{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;cursor:grab;transition:transform .15s,box-shadow .15s,border-color .15s;position:relative;overflow:hidden;}
.kcard::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;}
.kcard[data-status="Not processed"]::before{background:#3b82f6;}
.kcard[data-status="Processing"]::before{background:#f59e0b;}
.kcard[data-status="Shipped"]::before{background:#8b5cf6;}
.kcard[data-status="Delivered"]::before{background:#22c55e;}
.kcard[data-status="Cancelled"]::before{background:#ef4444;}
.kcard:hover{border-color:#cbd5e1;transform:translateY(-2px);box-shadow:0 4px 16px #00000015;}
.kcard.drag{opacity:.35;cursor:grabbing;}
.btn{border:none;border-radius:8px;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;transition:all .18s;font-size:12px;display:inline-flex;align-items:center;gap:5px;}
.btn-g{background:#25D366;color:#000;padding:7px 14px;}.btn-g:hover{background:#1dba58;}.btn-g:disabled{background:#1a4d33;color:#4b5563;cursor:not-allowed;}
.btn-h{background:transparent;color:#64748b;border:1px solid #1e2d3d;padding:7px 14px;}.btn-h:hover{border-color:#25D366;color:#25D366;}
.btn-sm{padding:5px 10px;font-size:11px;}.btn-full{width:100%;justify-content:center;padding:12px;font-size:14px;}
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:6px;font-size:10px;font-family:'DM Mono',monospace;font-weight:500;}
.inp{background:#111827;border:1px solid #1e2d3d;border-radius:8px;padding:9px 13px;color:#dde6f0;font-family:'Syne',sans-serif;font-size:13px;outline:none;transition:border .2s;width:100%;}
.inp:focus{border-color:#25D366;}
.modal-bg{position:absolute;inset:0;background:#00000088;display:flex;align-items:center;justify-content:center;z-index:50;backdrop-filter:blur(4px);}
.modal{background:#0d1526;border:1px solid #1a2742;border-radius:18px;padding:26px;width:530px;max-height:86vh;overflow-y:auto;}
.toast-wrap{position:absolute;top:14px;right:14px;z-index:100;display:flex;flex-direction:column;gap:8px;}
.toast{background:#0d1526;border:1px solid #1a2742;border-radius:12px;padding:13px 16px;min-width:270px;display:flex;align-items:flex-start;gap:10px;box-shadow:0 8px 30px #00000060;animation:tIn .3s ease;}
@keyframes tIn{from{opacity:0;transform:translateX(36px);}to{opacity:1;transform:translateX(0);}}
.dot{width:7px;height:7px;border-radius:50%;background:#25D366;animation:pulse 1.5s infinite;}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 #25D36650;}50%{box-shadow:0 0 0 5px #25D36600;}}
.mono{font-family:'DM Mono',monospace;}
.fade{animation:fade .3s ease;}@keyframes fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.stat{background:#0d1526;border:1px solid #1a2742;border-radius:14px;padding:18px;}
.spin{width:18px;height:18px;border:2px solid #1e2d3d;border-top-color:#25D366;border-radius:50%;animation:sp .7s linear infinite;display:inline-block;}
@keyframes sp{to{transform:rotate(360deg);}}
@media(max-width:768px){
  .os{flex-direction:column;}
  .sidebar{width:100%;height:58px;flex-direction:row;justify-content:space-around;align-items:center;border-right:none;border-top:1px solid #1a2236;order:2;padding:0 4px;gap:0;flex-shrink:0;}
  .navbtn.on::before{display:none;}.main{order:1;height:calc(100vh - 58px);overflow:hidden;}
  .hdr{padding:0 12px;height:48px;gap:8px;}.body{padding:10px;}
  .body.kb{padding:10px;overflow-x:auto;overflow-y:hidden;}
  .krow{gap:10px;height:100%;}.kcol{min-width:255px;width:255px;max-height:calc(100vh - 106px);}
  .modal-bg{position:fixed;}.modal{width:96vw;max-width:96vw;padding:18px;border-radius:16px;max-height:90vh;}
  .toast-wrap{position:fixed;bottom:70px;top:auto;right:8px;left:8px;}.toast{min-width:unset;width:100%;}
  .auth-card{padding:24px 18px;margin:12px;}
}
`;

const Ic=({d,size=17,color="currentColor",...r})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...r}><path d={d}/></svg>;
const I={
  pipe: (c)=><Ic color={c} d="M3 5h4v14H3V5zm7 0h4v14h-4V5zm7 4h4v10h-4V9z"/>,
  chart:(c)=><Ic color={c} d="M3 3v18h18M9 17V9m4 8v-5m4 5V5"/>,
  users:(c)=><Ic color={c} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>,
  cog:  (c)=><Ic color={c} d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>,
  x:    ()=><Ic d="M18 6L6 18M6 6l12 12"/>,
  eye:  ()=><Ic d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>,
  eyeo: ()=><Ic d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>,
  out:  ()=><Ic d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>,
};

const Av=({name="",size=34})=>{
  const ini=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const C=["#3b82f6","#8b5cf6","#f59e0b","#25D366","#f97316","#06b6d4"];
  const bg=C[name.charCodeAt(0)%C.length];
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg+"28",border:`1.5px solid ${bg}45`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.34,fontWeight:700,color:bg,flexShrink:0}}>{ini}</div>;
};
const SBadge=({s,small})=>{const st=STATUS[s]||STATUS["Not processed"];return <span className="badge" style={{background:st.bg,color:st.col,border:`1px solid ${st.col}25`,fontSize:small?9:10}}>{st.icon} {st.label}</span>;};
const CTip=({active,payload,label})=>{if(!active||!payload?.length)return null;return<div style={{background:"#0d1526",border:"1px solid #1a2742",borderRadius:8,padding:"9px 13px"}}><div style={{fontSize:10,color:"#64748b",marginBottom:3,fontFamily:"DM Mono"}}>{label}</div>{payload.map((p,i)=><div key={i} style={{fontSize:12,color:p.color||"#25D366",fontFamily:"DM Mono"}}>{typeof p.value==="number"&&p.value>9999?cop(p.value*100):p.value}</div>)}</div>;};

/* ── AUTH ── */
const AuthScreen=({onLogin})=>{
  const [scr,setScr]=useState("login");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [ok,setOk]=useState("");
  const [showP,setShowP]=useState(false);
  const [f,setF]=useState({name:"",email:"",password:"",business_name:""});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    if(p.get("confirmed")){setOk("✅ Email confirmado. Ya puedes iniciar sesión.");setScr("login");}
    if(p.get("error")){setErr("❌ Link inválido o expirado.");}
  },[]);

  const login=async()=>{
    setErr("");setLoading(true);
    const r=await fetch(`${API_BASE}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:f.email,password:f.password})}).then(r=>r.json()).catch(()=>null);
    setLoading(false);
    if(r?.token){localStorage.setItem("cht_token",r.token);localStorage.setItem("cht_user",JSON.stringify(r.user));onLogin(r.user);}
    else setErr(r?.error||"Error al iniciar sesión");
  };

  const register=async()=>{
    setErr("");setLoading(true);
    const r=await fetch(`${API_BASE}/auth/register`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)}).then(r=>r.json()).catch(()=>null);
    setLoading(false);
    if(r?.success){setOk("📧 Revisa tu email para confirmar tu cuenta.");setScr("confirm");}
    else setErr(r?.error||"Error al registrarse");
  };

  const forgot=async()=>{
    setErr("");setLoading(true);
    await fetch(`${API_BASE}/auth/forgot`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:f.email})}).then(r=>r.json()).catch(()=>null);
    setLoading(false);
    setOk("📧 Si el email existe, recibirás el enlace en unos minutos.");
  };

  return(
    <div className="auth-bg">
      <div className="auth-card fade">
        <img src={LOGO} className="auth-logo" alt="Chatiico"/>

        {scr==="login"&&<>
          <h2 className="auth-title">Bienvenido</h2>
          <p className="auth-sub">Ingresa a tu cuenta de pedidos</p>
          {err&&<div className="auth-err">{err}</div>}
          {ok&&<div className="auth-ok">{ok}</div>}
          <div className="auth-field"><label className="auth-lbl">Email</label><input className="inp" type="email" placeholder="tu@email.com" value={f.email} onChange={e=>s("email",e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/></div>
          <div className="auth-field">
            <label className="auth-lbl">Contraseña</label>
            <div style={{position:"relative"}}>
              <input className="inp" type={showP?"text":"password"} placeholder="••••••••" value={f.password} onChange={e=>s("password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} style={{paddingRight:40}}/>
              <button onClick={()=>setShowP(!showP)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#64748b"}}>{showP?<I.eyeo/>:<I.eye/>}</button>
            </div>
          </div>
          <div style={{textAlign:"right",marginBottom:16}}><button className="auth-link" onClick={()=>{setScr("forgot");setErr("");setOk("");}}>¿Olvidaste tu contraseña?</button></div>
          <button className="btn btn-g btn-full" onClick={login} disabled={loading}>{loading?<span className="spin"/>:"Iniciar sesión"}</button>
          <div className="auth-div">o</div>
          <div style={{textAlign:"center",fontSize:13,color:"#64748b"}}>¿No tienes cuenta? <button className="auth-link" onClick={()=>{setScr("register");setErr("");setOk("");}}>Regístrate gratis</button></div>
        </>}

        {scr==="register"&&<>
          <h2 className="auth-title">Crear cuenta</h2>
          <p className="auth-sub">Empieza a gestionar tus pedidos</p>
          {err&&<div className="auth-err">{err}</div>}
          <div className="auth-field"><label className="auth-lbl">Nombre completo</label><input className="inp" placeholder="Tu nombre" value={f.name} onChange={e=>s("name",e.target.value)}/></div>
          <div className="auth-field"><label className="auth-lbl">Nombre del negocio</label><input className="inp" placeholder="Mi Restaurante" value={f.business_name} onChange={e=>s("business_name",e.target.value)}/></div>
          <div className="auth-field"><label className="auth-lbl">Email</label><input className="inp" type="email" placeholder="tu@email.com" value={f.email} onChange={e=>s("email",e.target.value)}/></div>
          <div className="auth-field">
            <label className="auth-lbl">Contraseña</label>
            <div style={{position:"relative"}}>
              <input className="inp" type={showP?"text":"password"} placeholder="Mínimo 8 caracteres" value={f.password} onChange={e=>s("password",e.target.value)} style={{paddingRight:40}}/>
              <button onClick={()=>setShowP(!showP)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#64748b"}}>{showP?<I.eyeo/>:<I.eye/>}</button>
            </div>
          </div>
          <button className="btn btn-g btn-full" onClick={register} disabled={loading}>{loading?<span className="spin"/>:"Crear cuenta"}</button>
          <div className="auth-div">o</div>
          <div style={{textAlign:"center",fontSize:13,color:"#64748b"}}>¿Ya tienes cuenta? <button className="auth-link" onClick={()=>{setScr("login");setErr("");setOk("");}}>Iniciar sesión</button></div>
        </>}

        {scr==="forgot"&&<>
          <h2 className="auth-title">Recuperar contraseña</h2>
          <p className="auth-sub">Te enviaremos un enlace a tu email</p>
          {err&&<div className="auth-err">{err}</div>}
          {ok&&<div className="auth-ok">{ok}</div>}
          <div className="auth-field"><label className="auth-lbl">Email</label><input className="inp" type="email" placeholder="tu@email.com" value={f.email} onChange={e=>s("email",e.target.value)}/></div>
          <button className="btn btn-g btn-full" onClick={forgot} disabled={loading}>{loading?<span className="spin"/>:"Enviar enlace"}</button>
          <div style={{textAlign:"center",marginTop:16}}><button className="auth-link" onClick={()=>{setScr("login");setErr("");setOk("");}}>← Volver al login</button></div>
        </>}

        {scr==="confirm"&&<>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>📧</div>
            <h2 className="auth-title">Revisa tu email</h2>
            <p className="auth-sub">Haz clic en el enlace que te enviamos para activar tu cuenta.</p>
            {ok&&<div className="auth-ok" style={{marginTop:16}}>{ok}</div>}
            <div style={{marginTop:20}}><button className="auth-link" onClick={()=>{setScr("login");setErr("");setOk("");}}>← Volver al login</button></div>
          </div>
        </>}

        <div style={{textAlign:"center",marginTop:24,fontSize:11,color:"#1e2d3d"}}>Powered by Chatiico © 2026</div>
      </div>
    </div>
  );
};

/* ── ORDER MODAL ── */
const OrderModal=({order,onClose,onStatus,onPaid,loading})=>{
  if(!order)return null;
  const addr=order.shipping_address||{};
  return(
    <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal fade">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span className="mono" style={{fontSize:12,color:"#25D366"}}>#{order.id.slice(-8)}</span>
              {order._real&&<span className="badge" style={{background:"#0d2e1c",color:"#25D366",border:"1px solid #25D36618",fontSize:9}}>🔗 LIVE</span>}
              <SBadge s={order.status}/>
            </div>
            <div style={{fontSize:17,fontWeight:700}}>{addr.name||order.user?.full_name||"Cliente"}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:3}}>📱 {order.user?.phone||"—"} · ⏱ {fmtTime(order.created_at)}</div>
          </div>
          <button onClick={onClose} className="btn btn-h btn-sm"><I.x/></button>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:"#4b5563",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Productos</div>
          {(order.line_items||[]).map(item=>(
            <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 13px",background:"#111827",borderRadius:9,border:"1px solid #1e2d3d",marginBottom:6}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{item.name}</div><div style={{fontSize:10,color:"#4b5563"}}>{item.sku} · ×{item.amount}</div></div>
              <span className="mono" style={{fontSize:13}}>{copRaw(parseFloat(item.price)*parseInt(item.amount||1))}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#111827",border:"1px solid #1e2d3d",borderRadius:10,padding:"13px 15px",marginBottom:16}}>
          {[["Subtotal",cop(order.subtotal)],["Envío",cop(order.shipping_cost)],["Impuestos",cop(order.total_taxes)]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:"#4b5563"}}>{l}</span><span className="mono" style={{fontSize:12}}>{v}</span></div>
          ))}
          <div style={{borderTop:"1px solid #1e2d3d",marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700}}>Total</span>
            <span className="mono" style={{fontSize:17,fontWeight:700,color:"#25D366"}}>{cop(order.total)}</span>
          </div>
          {order.payment_method&&<div style={{marginTop:6,fontSize:11,color:"#4b5563"}}>💳 {order.payment_method}</div>}
        </div>
        {addr.address1&&<div style={{padding:"10px 13px",background:"#111827",border:"1px solid #1e2d3d",borderRadius:9,marginBottom:16,fontSize:12,color:"#94a3b8"}}>📍 {addr.address1}{addr.city?`, ${addr.city}`:""}</div>}
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {order._real&&order.status!=="Delivered"&&order.status!=="Cancelled"&&<button className="btn btn-g btn-sm" onClick={()=>onPaid(order)} disabled={loading}>💰 Marcar Pagado</button>}
          {SK.filter(s=>s!==order.status).map(s=>(
            <button key={s} className="btn btn-h btn-sm" onClick={()=>onStatus(order,s)} disabled={loading}>{STATUS[s].icon} {STATUS[s].label}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── KANBAN ── */
const KanbanView=({orders,setOrders,openOrder,addToast,user})=>{
  const [dragId,setDragId]=useState(null);
  const [overCol,setOverCol]=useState(null);
  const [search,setSearch]=useState("");

  const timeAgo=(iso)=>{
    if(!iso) return "—";
    const diff=Math.floor((Date.now()-new Date(iso))/60000);
    if(diff<60) return `${diff}min`;
    if(diff<1440) return `${Math.floor(diff/60)}h`;
    return `${Math.floor(diff/1440)}d`;
  };

  const filtered=(sk)=>orders.filter(o=>o.status===sk&&(
    !search||(o.contact_name||o.shipping_address?.name||"").toLowerCase().includes(search.toLowerCase())
  ));
  const colTotal=(sk)=>orders.filter(o=>o.status===sk).reduce((s,o)=>s+(o.total||0),0);

  const drop=async(e,ts)=>{
    e.preventDefault();setOverCol(null);
    if(!dragId)return;
    const order=orders.find(o=>o.id===dragId);
    if(!order||order.status===ts){setDragId(null);return;}
    setOrders(p=>p.map(o=>o.id===dragId?{...o,status:ts}:o));setDragId(null);
    await apiFetch(`/orders/${order.id}/status`,{method:"PUT",body:JSON.stringify({status:ts})});
    if(order._real&&user?.chatico_token&&user?.flows){
      const fm={"Processing":user.flows.processing,"Shipped":user.flows.shipped,"Delivered":user.flows.delivered,"Cancelled":user.flows.cancelled,"Not processed":user.flows.confirmed};
      const fid=fm[ts];
      if(fid)await chFetch(`/contacts/${order.user_id}/send/${fid}`,user.chatico_token,{method:"POST"});
    }
    addToast({icon:STATUS[ts].icon,title:"Estado actualizado",msg:`${order.contact_name||"Pedido"} → ${STATUS[ts].label}`});
  };

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Search bar */}
      <div style={{padding:"10px 20px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
        <div style={{position:"relative",flex:1,maxWidth:300}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}>🔍</span>
          <input className="inp" style={{paddingLeft:32,background:"#fff",border:"1px solid #e2e8f0",color:"#1e293b",fontSize:13,height:36}} placeholder="Buscar cliente..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <span style={{fontSize:12,color:"#64748b"}}>{orders.length} pedidos · {cop(orders.reduce((s,o)=>s+(o.total||0),0))} total</span>
      </div>

      <div className="krow" style={{padding:"14px 20px",flex:1,overflow:"hidden"}}>
        {SK.map(sk=>(
          <div key={sk} className={`kcol${overCol===sk?" ov":""}`}
            onDragOver={e=>{e.preventDefault();setOverCol(sk);}} onDragLeave={()=>setOverCol(null)} onDrop={e=>drop(e,sk)}>

            {/* Column header */}
            <div style={{flexShrink:0,paddingBottom:4}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#1e293b"}}>{STATUS[sk].label}</span>
                  <span style={{background:STATUS[sk].col+"18",color:STATUS[sk].col,fontSize:11,fontWeight:700,padding:"1px 7px",borderRadius:10,border:`1px solid ${STATUS[sk].col}30`}}>{filtered(sk).length}</span>
                </div>
              </div>
              <div style={{fontSize:12,color:"#64748b",fontFamily:"DM Mono",marginBottom:8}}>{cop(colTotal(sk))}</div>
              <div style={{height:3,background:STATUS[sk].col,borderRadius:2}}/>
            </div>

            <div className="kbody">
              {filtered(sk).length===0&&(
                <div style={{textAlign:"center",color:"#cbd5e1",fontSize:12,padding:"24px 0",border:"2px dashed #e2e8f0",borderRadius:8,marginTop:2}}>Sin pedidos</div>
              )}
              {filtered(sk).map(order=>{
                const name=order.contact_name||order.shipping_address?.name||"Cliente";
                const phone=order.contact_phone||order.user?.phone||"";
                const items=typeof order.items==="string"?JSON.parse(order.items||"[]"):(order.line_items||order.items||[]);
                const ago=timeAgo(order.created_at);
                const isLate=order.status==="Not processed"&&(Date.now()-new Date(order.created_at))>30*60000;
                return(
                  <div key={order.id} className={`kcard${dragId===order.id?" drag":""}`}
                    data-status={order.status}
                    draggable onDragStart={e=>{setDragId(order.id);e.dataTransfer.effectAllowed="move";}}
                    onDragEnd={()=>setDragId(null)} onClick={()=>openOrder({...order,line_items:items})}>

                    {/* Header: avatar + name + phone */}
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <Av name={name} size={36}/>
                      <div style={{flex:1,overflow:"hidden"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#1e293b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                        <div style={{fontSize:11,color:"#94a3b8"}}>{phone||"Sin teléfono"}</div>
                      </div>
                      {order._real&&<span style={{fontSize:9,background:"#dcfce7",color:"#16a34a",padding:"2px 5px",borderRadius:4,fontWeight:700,border:"1px solid #bbf7d0",flexShrink:0}}>LIVE</span>}
                    </div>

                    {/* Order # + Total */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:8,padding:"7px 10px",marginBottom:10}}>
                      <span style={{fontSize:11,color:"#94a3b8",fontFamily:"DM Mono"}}>#{order.id?.toString().slice(-6)}</span>
                      <span style={{fontSize:13,fontWeight:700,color:"#1e293b",fontFamily:"DM Mono"}}>{cop(order.total)}</span>
                    </div>

                    {/* Products */}
                    <div style={{marginBottom:10}}>
                      {items.slice(0,2).map((item,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#475569",marginBottom:2}}>
                          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>×{item.amount} {item.name}</span>
                          <span style={{color:"#94a3b8",fontFamily:"DM Mono"}}>{copRaw(parseFloat(item.price)*parseInt(item.amount||1))}</span>
                        </div>
                      ))}
                      {items.length>2&&<div style={{fontSize:10,color:"#cbd5e1"}}>+{items.length-2} productos más</div>}
                    </div>

                    {/* Footer */}
                    <div style={{borderTop:"1px solid #f1f5f9",paddingTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      {isLate
                        ?<span style={{fontSize:10,color:"#ef4444",fontWeight:600,display:"flex",alignItems:"center",gap:3}}>🕐 {ago} de atraso</span>
                        :<span style={{fontSize:10,color:"#94a3b8",display:"flex",alignItems:"center",gap:3}}>🕐 hace {ago}</span>
                      }
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        {order.payment_method&&<span style={{fontSize:9,background:"#f1f5f9",color:"#64748b",padding:"2px 6px",borderRadius:4,border:"1px solid #e2e8f0"}}>{order.payment_method}</span>}
                        <span style={{width:20,height:20,borderRadius:"50%",background:`${STATUS[sk].col}15`,border:`1.5px solid ${STATUS[sk].col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>{STATUS[sk].icon}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── ANALYTICS ── */
const AnalyticsView=({orders})=>{
  const [month,setMonth]=useState("");
  const delivered=orders.filter(o=>o.status==="Delivered");
  const cancelled=orders.filter(o=>o.status==="Cancelled");
  const totalRev=orders.reduce((s,o)=>s+(o.total||0),0);
  const avg=orders.length?Math.floor(totalRev/orders.length):0;

  const exportCSV=async(type)=>{
    const q=month?`?month=${month.split("-")[1]}&year=${month.split("-")[0]}`:"";
    const r=await fetch(`${API_BASE}/${type}/export${q}`,{headers:authH()});
    const blob=await r.blob();
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${type}.csv`;a.click();
  };

  return(
    <div className="fade">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <div><label style={{fontSize:11,color:"#64748b",marginRight:8}}>Mes:</label><input type="month" className="inp" style={{width:"auto",padding:"6px 12px"}} value={month} onChange={e=>setMonth(e.target.value)}/></div>
        <button className="btn btn-h btn-sm" onClick={()=>exportCSV("orders")}>📥 Pedidos CSV</button>
        <button className="btn btn-h btn-sm" onClick={()=>exportCSV("analytics")}>📊 Analíticas CSV</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
        {[{label:"Ventas",val:cop(totalRev),sub:`${orders.length} pedidos`,icon:"💰",col:"#25D366"},{label:"Ticket prom.",val:cop(avg),sub:"por pedido",icon:"🎯",col:"#3b82f6"},{label:"Entregados",val:delivered.length,sub:`de ${orders.length}`,icon:"✅",col:"#22c55e"},{label:"Cancelados",val:cancelled.length,sub:`${((cancelled.length/Math.max(orders.length,1))*100).toFixed(0)}%`,icon:"❌",col:"#ef4444"}].map((k,i)=>(
          <div key={i} className="stat">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><span style={{fontSize:10,color:"#4b5563",fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{k.label}</span><span style={{fontSize:18}}>{k.icon}</span></div>
            <div className="mono" style={{fontSize:20,fontWeight:700,color:k.col,marginBottom:3}}>{k.val}</div>
            <div style={{fontSize:11,color:"#374151"}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,marginBottom:14}}>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#4b5563",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Ventas semanales</div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={WEEKLY}><defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#25D366" stopOpacity={.25}/><stop offset="95%" stopColor="#25D366" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="d" tick={{fontSize:10,fill:"#374151",fontFamily:"DM Mono"}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip content={<CTip/>}/>
              <Area type="monotone" dataKey="v" stroke="#25D366" strokeWidth={2} fill="url(#gv)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#4b5563",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Métodos de pago</div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><PieChart width={130} height={130}><Pie data={PAYS} dataKey="pct" cx="50%" cy="50%" outerRadius={62} innerRadius={38} strokeWidth={0}>{PAYS.map((p,i)=><Cell key={i} fill={p.color}/>)}</Pie></PieChart></div>
          {PAYS.map((p,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:8,height:8,borderRadius:2,background:p.color}}/><span style={{fontSize:12,color:"#94a3b8"}}>{p.name}</span></div><span className="mono" style={{fontSize:12}}>{p.pct}%</span></div>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#4b5563",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Pedidos por día</div>
          <ResponsiveContainer width="100%" height={170}><BarChart data={WEEKLY} barSize={16}><XAxis dataKey="d" tick={{fontSize:10,fill:"#374151",fontFamily:"DM Mono"}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip content={<CTip/>}/><Bar dataKey="p" fill="#3b82f6" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#4b5563",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Top productos</div>
          {TOPROD.map((p,i)=>(
            <div key={i} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#94a3b8"}}>{p.name}</span><span className="mono" style={{fontSize:11,color:"#4b5563"}}>{p.qty}</span></div>
              <div style={{height:4,background:"#1a2742",borderRadius:2}}><div style={{height:"100%",width:`${(p.qty/34)*100}%`,background:"#25D366",borderRadius:2}}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── USERS ── */
const UsersView=({user,addToast})=>{
  const [users,setUsers]=useState([]);
  const [showInv,setShowInv]=useState(false);
  const [f,setF]=useState({name:"",email:""});
  const [loading,setLoading]=useState(false);

  useEffect(()=>{if(user.role==="admin")apiFetch("/users").then(r=>r&&setUsers(r));},[]);

  const invite=async()=>{
    setLoading(true);
    const r=await apiFetch("/users/invite",{method:"POST",body:JSON.stringify(f)});
    setLoading(false);
    if(r?.success){addToast({icon:"📧",title:"Invitación enviada",msg:f.email});setShowInv(false);setF({name:"",email:""});apiFetch("/users").then(r=>r&&setUsers(r));}
    else addToast({icon:"❌",title:"Error",msg:r?.error||"No se pudo invitar"});
  };

  if(user.role!=="admin")return<div className="fade" style={{textAlign:"center",padding:"60px 20px",color:"#4b5563"}}><div style={{fontSize:40,marginBottom:12}}>🔒</div><div>Solo administradores pueden gestionar usuarios</div></div>;

  return(
    <div className="fade" style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700}}>Equipo — {users.length} usuarios</div>
        <button className="btn btn-g btn-sm" onClick={()=>setShowInv(!showInv)}>+ Invitar Agente</button>
      </div>
      {showInv&&<div className="card" style={{padding:18,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Invitar agente</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div><label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:5}}>Nombre</label><input className="inp" placeholder="Nombre" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></div>
          <div><label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:5}}>Email</label><input className="inp" type="email" placeholder="agente@email.com" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))}/></div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-g btn-sm" onClick={invite} disabled={loading}>{loading?<span className="spin"/>:"Enviar invitación"}</button>
          <button className="btn btn-h btn-sm" onClick={()=>setShowInv(false)}>Cancelar</button>
        </div>
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {users.map((u,i)=>(
          <div key={i} className="card" style={{padding:16,display:"flex",alignItems:"center",gap:14}}>
            <Av name={u.name} size={40}/>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{u.name}</div><div style={{fontSize:12,color:"#4b5563"}}>{u.email}</div></div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span className="badge" style={{background:u.role==="admin"?"#0f2748":"#1a2236",color:u.role==="admin"?"#3b82f6":"#64748b",border:"none"}}>{u.role==="admin"?"👑 Admin":"👤 Agente"}</span>
              <span className="badge" style={{background:u.confirmed?"#052612":"#3c0a0a",color:u.confirmed?"#22c55e":"#ef4444",border:"none"}}>{u.confirmed?"✅ Activo":"⏳ Pendiente"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── SETTINGS ── */
const SettingsView=({user,setUser,addToast})=>{
  const [cfg,setCfg]=useState({chatico_token:user.chatico_token||"",flow_confirmed:user.flows?.confirmed||"",flow_processing:user.flows?.processing||"",flow_shipped:user.flows?.shipped||"",flow_delivered:user.flows?.delivered||"",flow_cancelled:user.flows?.cancelled||""});
  const [loading,setLoading]=useState(false);

  const save=async()=>{
    setLoading(true);
    const r=await apiFetch("/config",{method:"PUT",body:JSON.stringify(cfg)});
    setLoading(false);
    if(r?.success){
      const nu={...user,chatico_token:cfg.chatico_token,flows:{confirmed:cfg.flow_confirmed,processing:cfg.flow_processing,shipped:cfg.flow_shipped,delivered:cfg.flow_delivered,cancelled:cfg.flow_cancelled}};
      localStorage.setItem("cht_user",JSON.stringify(nu));setUser(nu);
      addToast({icon:"💾",title:"Guardado",msg:"Configuración actualizada"});
    }else addToast({icon:"❌",title:"Error",msg:r?.error||"No se pudo guardar"});
  };

  return(
    <div className="fade" style={{maxWidth:680,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>
      <div className="card" style={{padding:20}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:15,color:"#25D366"}}>🔗 Token de Chatico</div>
        <div style={{marginBottom:12}}><label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:5}}>X-ACCESS-TOKEN</label><input className="inp" style={{fontFamily:"DM Mono",fontSize:12}} placeholder="5888091.xxxxxxxxxx" value={cfg.chatico_token} onChange={e=>setCfg(p=>({...p,chatico_token:e.target.value}))}/></div>
        <div style={{fontSize:11,color:"#4b5563",background:"#111827",border:"1px solid #1e2d3d",borderRadius:8,padding:"10px 13px"}}>💡 Encuéntralo en <strong style={{color:"#25D366"}}>app.chatico.io → Configuración → API</strong></div>
      </div>
      <div className="card" style={{padding:20}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>📱 Flow IDs de WhatsApp</div>
        <div style={{fontSize:12,color:"#4b5563",marginBottom:16}}>ID del flujo que se envía al cliente cuando cambia el estado del pedido.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[["flow_confirmed","✅ Confirmado"],["flow_processing","🔥 En Preparación"],["flow_shipped","🛵 Enviado"],["flow_delivered","🎉 Entregado"],["flow_cancelled","❌ Cancelado"]].map(([key,label])=>(
            <div key={key}><label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:5}}>{label}</label><input className="inp" style={{fontFamily:"DM Mono",fontSize:12}} placeholder="Flow ID" value={cfg[key]} onChange={e=>setCfg(p=>({...p,[key]:e.target.value}))}/></div>
          ))}
        </div>
        <div style={{marginTop:16}}><button className="btn btn-g" onClick={save} disabled={loading}>{loading?<span className="spin"/>:"💾 Guardar"}</button></div>
      </div>
      <div className="card" style={{padding:20}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:15}}>👤 Mi cuenta</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Nombre",user.name],["Email",user.email],["Negocio",user.business],["Rol",user.role==="admin"?"Administrador":"Agente"]].map(([k,v])=>(
            <div key={k} style={{padding:"10px 13px",background:"#111827",borderRadius:8,border:"1px solid #1e2d3d"}}><div style={{fontSize:10,color:"#4b5563",marginBottom:3}}>{k}</div><div style={{fontSize:13,fontWeight:600}}>{v}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── ROOT ── */
export default function App(){
  const [user,setUser]=useState(null);
  const [ready,setReady]=useState(false);
  const [view,setView]=useState("pipeline");
  const [orders,setOrders]=useState([]);
  const [selOrder,setSelOrder]=useState(null);
  const [toasts,setToasts]=useState([]);
  const [loading,setLoading]=useState(false);
  const [time,setTime]=useState(new Date());
  const [dark,setDark]=useState(()=>localStorage.getItem("cht_theme")!=="light");
  const tid=useRef(0);

  useEffect(()=>{let el=document.getElementById("__os");if(!el){el=document.createElement("style");el.id="__os";document.head.appendChild(el);}el.textContent=CSS;},[]);
  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[]);

  useEffect(()=>{
    if(!user) return;
    const t=setInterval(()=>loadOrders(user),30000);
    return()=>clearInterval(t);
  },[user]);

  useEffect(()=>{
    const token=getToken();const u=getUser();
    if(token&&u){setUser(u);loadOrders(u);}
    setReady(true);
  },[]);

  const loadOrders=async(u)=>{
    const db=await apiFetch("/orders");
    if(db?.length)setOrders(db.map(o=>({...o,
      line_items:typeof o.items==="string"?JSON.parse(o.items):o.items||[],
      shipping_address:{name:o.contact_name,phone:o.contact_phone,address1:o.contact_address,city:o.contact_city},
      user:{full_name:o.contact_name,phone:o.contact_phone},
      _real:true
    })));
  };

  const handleLogin=(u)=>{setUser(u);loadOrders(u);};
  const handleLogout=()=>{localStorage.removeItem("cht_token");localStorage.removeItem("cht_user");setUser(null);setOrders([]);};

  const addToast=useCallback(({icon,title,msg})=>{const id=++tid.current;setToasts(p=>[...p,{id,icon,title,msg}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500);},[]);

  const onStatus=async(order,ns)=>{
    setOrders(p=>p.map(o=>o.id===order.id?{...o,status:ns}:o));setSelOrder(null);
    await apiFetch(`/orders/${order.id}/status`,{method:"PUT",body:JSON.stringify({status:ns})});
    if(order._real&&user?.chatico_token&&user?.flows){
      const fm={"Processing":user.flows.processing,"Shipped":user.flows.shipped,"Delivered":user.flows.delivered,"Cancelled":user.flows.cancelled,"Not processed":user.flows.confirmed};
      const fid=fm[ns];if(fid)await chFetch(`/contacts/${order.user_id}/send/${fid}`,user.chatico_token,{method:"POST"});
    }
    addToast({icon:STATUS[ns].icon,title:"Estado actualizado",msg:`${STATUS[ns].label} — WhatsApp enviado ✓`});
  };

  const onPaid=async(order)=>{
    setSelOrder(null);setLoading(true);
    const r=await chFetch(`/contacts/${order.user_id}/pay/${order.id}`,user.chatico_token,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({amount_received:order.total})});
    setLoading(false);
    addToast(r?.success?{icon:"💰",title:"Pago registrado",msg:cop(order.total)}:{icon:"⚠️",title:"Error",msg:r?.error?.message||"No se pudo registrar"});
  };

  if(!ready)return<div style={{background:"#060a12",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><span className="spin" style={{width:32,height:32,borderWidth:3}}/></div>;
  if(!user)return<AuthScreen onLogin={handleLogin}/>;

  const NAVS=[{id:"pipeline",label:"Pedidos",I:I.pipe},{id:"analytics",label:"Analíticas",I:I.chart},{id:"users",label:"Equipo",I:I.users},{id:"settings",label:"Config",I:I.cog}];
  const pending=orders.filter(o=>o.status==="Not processed").length;
  const todayRev=orders.reduce((s,o)=>s+(o.total||0),0);

  return(
    <div className={`os${dark?"":" light"}`} style={{position:"relative"}}>
      <nav className="sidebar">
        <div style={{width:40,height:40,borderRadius:10,background:"#060a12",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8,overflow:"hidden",flexShrink:0}}>
          <img src={LOGO} style={{width:38,height:"auto",objectFit:"contain"}} alt="Chatiico"/>
        </div>
        {NAVS.map(({id,label,I:Ic})=>(
          <button key={id} className={`navbtn${view===id?" on":""}`} onClick={()=>setView(id)} title={label}>{Ic(view===id?"#25D366":"#4b5563")}</button>
        ))}
        <div style={{flex:1}}/>
        <button className="navbtn" onClick={handleLogout} title="Cerrar sesión"><I.out/></button>
      </nav>
      <div className="main">
        <header className="hdr">
          <div className="dot"/>
          <span style={{fontSize:13,fontWeight:700}}>{NAVS.find(n=>n.id===view)?.label}</span>
          <span style={{fontSize:11,color:"#374151"}}>{view==="pipeline"?`· ${orders.length} pedidos`:view==="analytics"?`· ${time.toLocaleDateString("es-CO")}`:""}</span>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
            <span className="mono" style={{fontSize:11,color:"#374151"}}>{time.toLocaleTimeString("es-CO")}</span>
            <button onClick={()=>{const nd=!dark;setDark(nd);localStorage.setItem("cht_theme",nd?"dark":"light");}} style={{background:"transparent",border:"1px solid #1e2d3d",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}} title={dark?"Modo claro":"Modo oscuro"}>
              {dark?"🌙":"☀️"}
            </button>
            <span className="mono" style={{fontSize:12,color:"#25D366",background:"#0d2e1c",padding:"4px 10px",borderRadius:8,border:"1px solid #25D36618"}}>{cop(todayRev)}</span>
            {pending>0&&<span style={{background:"#f59e0b",color:"#000",fontSize:11,fontWeight:800,padding:"3px 9px",borderRadius:8}}>{pending} nuevo{pending>1?"s":""}</span>}
            <Av name={user.name} size={30}/>
          </div>
        </header>
        <div className={`body${view==="pipeline"?" kb":""}`} style={{height:view==="pipeline"?"calc(100vh - 56px)":undefined}}>
          {view==="pipeline"  &&<KanbanView orders={orders} setOrders={setOrders} openOrder={setSelOrder} addToast={addToast} user={user}/>}
          {view==="analytics" &&<AnalyticsView orders={orders}/>}
          {view==="users"     &&<UsersView user={user} addToast={addToast}/>}
          {view==="settings"  &&<SettingsView user={user} setUser={setUser} addToast={addToast}/>}
        </div>
      </div>
      {selOrder&&<OrderModal order={selOrder} onClose={()=>setSelOrder(null)} onStatus={onStatus} onPaid={onPaid} loading={loading}/>}
      <div className="toast-wrap">
        {toasts.map(t=>(
          <div key={t.id} className="toast">
            <span style={{fontSize:18,flexShrink:0}}>{t.icon||"🔔"}</span>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#dde6f0",marginBottom:2}}>{t.title}</div><div style={{fontSize:12,color:"#4b5563"}}>{t.msg}</div></div>
            <button onClick={()=>setToasts(p=>p.filter(x=>x.id!==t.id))} className="btn" style={{background:"transparent",border:"none",color:"#4b5563",padding:0}}><I.x/></button>
          </div>
        ))}
      </div>
    </div>
  );
}
