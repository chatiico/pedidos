import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

/* ═══════════════════════════════ CONFIG ════════════════════════════════════ */
const API_BASE  = "https://app.chatico.io/api";
const API_TOKEN = "5888091.kSgCP8WA50mtRiUBlw3ukHrvMzl4UK6";
const HEADERS   = { "accept": "application/json", "X-ACCESS-TOKEN": API_TOKEN };

/* ═══════════════════════════════ HELPERS ═══════════════════════════════════ */
const cop = (cents) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })
    .format((cents || 0) / 100);
const copRaw = (price) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })
    .format(parseFloat(price) || 0);
const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }); }
  catch { return "--:--"; }
};

/* ═══════════════════════════════ STATUS MAP ════════════════════════════════ */
const STATUS = {
  "Not processed": { label: "Nuevo Pedido",   col: "#3b82f6", bg: "#0f2748", icon: "📥" },
  "Processing":    { label: "En Preparación", col: "#f59e0b", bg: "#3d1f00", icon: "🔥" },
  "Shipped":       { label: "Enviado",        col: "#a78bfa", bg: "#2c1654", icon: "🛵" },
  "Delivered":     { label: "Entregado",      col: "#22c55e", bg: "#052612", icon: "✅" },
  "Cancelled":     { label: "Cancelado",      col: "#ef4444", bg: "#3c0a0a", icon: "❌" },
};
const STATUS_KEYS = ["Not processed","Processing","Shipped","Delivered","Cancelled"];

/* ═══════════════════════════════ API LAYER ═════════════════════════════════ */
const api = {
  async getOrder(cid, oid) {
    try { const r = await fetch(`${API_BASE}/contacts/${cid}/order/${oid}`,{ headers: HEADERS }); return await r.json(); }
    catch { return null; }
  },
  async updateOrder(cid, oid, body) {
    try {
      const r = await fetch(`${API_BASE}/contacts/${cid}/order/${oid}`,{
        method:"POST", headers:{...HEADERS,"Content-Type":"application/json"}, body:JSON.stringify(body)
      }); return await r.json();
    } catch { return null; }
  },
  async markPaid(cid, oid, amount) {
    try {
      const r = await fetch(`${API_BASE}/contacts/${cid}/pay/${oid}`,{
        method:"POST", headers:{...HEADERS,"Content-Type":"application/x-www-form-urlencoded"},
        body: new URLSearchParams({ amount_received: amount })
      }); return await r.json();
    } catch { return null; }
  },
  async sendProducts(cid, ids) {
    try {
      const r = await fetch(`${API_BASE}/contacts/${cid}/send/products`,{
        method:"POST", headers:{...HEADERS,"Content-Type":"application/json"},
        body: JSON.stringify({ product_id: ids })
      }); return await r.json();
    } catch { return null; }
  },
};

/* ════════════════════════════ SEED DATA ════════════════════════════════════ */
const SEED = [
  { id:"5610709923077827042", user_id:"573046097929", created_at:"2026-05-15T10:43:55+00:00", created_timestamp:"1778841835",
    total:4630000, subtotal:4630000, shipping_cost:0, total_taxes:0, total_discounts:0, total_items:3,
    status:"Not processed", payment_method:"", email:"fabian@fabian.com",
    line_items:[
      {id:"1",name:"Salchipapas",    sku:"PC003",price:"17900.00",amount:"1",long_description:"Papas fritas con salchicha y queso fundido"},
      {id:"2",name:"Alitas BBQ",     sku:"AL001",price:"22900.00",amount:"1",long_description:"Alitas bañadas en salsa BBQ dulce"},
      {id:"3",name:"Gaseosa Naranja",sku:"GS002",price:"5500.00", amount:"1",long_description:"Bebida refrescante sabor naranja 400ml"},
    ],
    shipping_address:{name:"Fabian",phone:"+573046097929",city:"Bogotá",address1:"Calle 50 #20-30"},
    user:{id:"573046097929",full_name:"Fabian",phone:"+573046097929",country:"CO"}, _real:true },

  { id:"demo-002", user_id:"573111222333", created_at:"2026-05-15T11:30:00+00:00", created_timestamp:"1778844600",
    total:3490000, subtotal:3490000, shipping_cost:0, total_taxes:0, total_discounts:0, total_items:2,
    status:"Processing", payment_method:"Nequi", email:"maria@mail.co",
    line_items:[
      {id:"4",name:"Hamburguesa BBQ",sku:"HB003",price:"26500.00",amount:"1",long_description:"Carne Angus con salsa BBQ"},
      {id:"5",name:"Jugo Natural",   sku:"JS001",price:"7900.00", amount:"1",long_description:"Jugo de frutas tropicales"},
    ],
    shipping_address:{name:"María García",phone:"+573111222333",city:"Bogotá",address1:"Carrera 15 #45-22"},
    user:{id:"573111222333",full_name:"María García",phone:"+573111222333",country:"CO"}, _real:false },

  { id:"demo-003", user_id:"573444555666", created_at:"2026-05-15T09:15:00+00:00", created_timestamp:"1778836500",
    total:5830000, subtotal:5830000, shipping_cost:0, total_taxes:0, total_discounts:0, total_items:4,
    status:"Shipped", payment_method:"Efectivo", email:"",
    line_items:[
      {id:"6",name:"Alitas BBQ",     sku:"AL001",price:"22900.00",amount:"2",long_description:"Alitas BBQ"},
      {id:"7",name:"Gaseosa Naranja",sku:"GS002",price:"5500.00", amount:"2",long_description:"400ml"},
    ],
    shipping_address:{name:"Carlos Ruiz",phone:"+573444555666",city:"Bogotá",address1:"Av. El Dorado #68-11"},
    user:{id:"573444555666",full_name:"Carlos Ruiz",phone:"+573444555666",country:"CO"}, _real:false },

  { id:"demo-004", user_id:"573777888999", created_at:"2026-05-15T08:00:00+00:00", created_timestamp:"1778832000",
    total:10330000, subtotal:10330000, shipping_cost:0, total_taxes:0, total_discounts:0, total_items:6,
    status:"Delivered", payment_method:"Daviplata", email:"sofia@mail.co",
    line_items:[
      {id:"8", name:"Hamburguesa BBQ",sku:"HB003",price:"26500.00",amount:"2",long_description:"Carne Angus"},
      {id:"9", name:"Salchipapas",    sku:"PC003",price:"17900.00",amount:"2",long_description:"Con queso"},
      {id:"10",name:"Jugo Natural",   sku:"JS001",price:"7900.00", amount:"2",long_description:"Tropical"},
    ],
    shipping_address:{name:"Sofía Torres",phone:"+573777888999",city:"Bogotá",address1:"Calle 100 #15-30"},
    user:{id:"573777888999",full_name:"Sofía Torres",phone:"+573777888999",country:"CO"}, _real:false },

  { id:"demo-005", user_id:"573000111222", created_at:"2026-05-15T12:10:00+00:00", created_timestamp:"1778847000",
    total:2290000, subtotal:2290000, shipping_cost:0, total_taxes:0, total_discounts:0, total_items:1,
    status:"Not processed", payment_method:"Nequi", email:"",
    line_items:[{id:"11",name:"Alitas BBQ",sku:"AL001",price:"22900.00",amount:"1",long_description:"BBQ dulce"}],
    shipping_address:{name:"Diego Moreno",phone:"+573000111222",city:"Bogotá",address1:"Carrera 7 #32-15"},
    user:{id:"573000111222",full_name:"Diego Moreno",phone:"+573000111222",country:"CO"}, _real:false },

  { id:"demo-006", user_id:"573555666777", created_at:"2026-05-15T07:30:00+00:00", created_timestamp:"1778830200",
    total:1790000, subtotal:1790000, shipping_cost:0, total_taxes:0, total_discounts:0, total_items:1,
    status:"Cancelled", payment_method:"", email:"",
    line_items:[{id:"12",name:"Salchipapas",sku:"PC003",price:"17900.00",amount:"1",long_description:"Papas fritas"}],
    shipping_address:{name:"Luis Medina",phone:"+573555666777",city:"Bogotá",address1:"Transversal 28 #80-10"},
    user:{id:"573555666777",full_name:"Luis Medina",phone:"+573555666777",country:"CO"}, _real:false },
];

/* ══════════════════════════ ANALYTICS DATA ═════════════════════════════════ */
const WEEKLY=[
  {d:"Lun",v:145000,p:8},{d:"Mar",v:220000,p:12},{d:"Mié",v:189000,p:10},
  {d:"Jue",v:310000,p:17},{d:"Vie",v:278000,p:15},{d:"Sáb",v:390000,p:21},{d:"Hoy",v:246300,p:13}
];
const TOP_PRODS=[
  {name:"Hamburguesa BBQ",qty:34},{name:"Alitas BBQ",qty:28},
  {name:"Salchipapas",qty:22},{name:"Jugo Natural",qty:19},{name:"Gaseosa Naranja",qty:15}
];
const PAYMENTS=[
  {name:"Nequi",pct:38,color:"#7c3aed"},{name:"Efectivo",pct:28,color:"#f59e0b"},
  {name:"Daviplata",pct:22,color:"#f97316"},{name:"Tarjeta",pct:12,color:"#3b82f6"}
];
const WA_CONVOS=[
  { id:"573046097929", name:"Fabian", phone:"+573046097929", unread:0, lastMsg:"Gracias 🙌", lastTime:"22:21",
    messages:[
      {from:"client",text:"Hola, quiero hacer un pedido",time:"22:18"},
      {from:"bot",text:"¡Hola Fabian! 👋 Soy el asistente. ¿Qué deseas ordenar hoy?",time:"22:18"},
      {from:"client",text:"Una Hamburguesa BBQ y un Jugo Natural",time:"22:19"},
      {from:"bot",text:"Perfecto ✅ Carrito:\n- Hamburguesa BBQ $26.500\n- Jugo Natural $7.900\n\nTotal: $34.400 ¿Confirmas?",time:"22:19"},
      {from:"client",text:"Sí, confirmo",time:"22:20"},
      {from:"bot",text:"🎉 ¡Pedido confirmado! Tu pedido está siendo procesado.",time:"22:21"},
      {from:"client",text:"Gracias 🙌",time:"22:21"},
    ]},
  { id:"573111222333", name:"María García", phone:"+573111222333", unread:2, lastMsg:"¿Cuánto tardan?", lastTime:"11:35",
    messages:[
      {from:"client",text:"Quiero pedir algo para el almuerzo",time:"11:28"},
      {from:"bot",text:"¡Hola María! 😊 Aquí nuestro menú disponible.",time:"11:28"},
      {from:"client",text:"Una Hamburguesa BBQ grande por favor",time:"11:30"},
      {from:"bot",text:"¡Listo! Hamburguesa BBQ $26.500 ¿Algo más?",time:"11:30"},
      {from:"client",text:"Un Jugo Natural también",time:"11:31"},
      {from:"bot",text:"Total: $34.400. ¿Confirmas con Nequi?",time:"11:31"},
      {from:"client",text:"Sí 👍",time:"11:32"},
      {from:"bot",text:"🔥 Tu pedido está en preparación. Te avisamos cuando salga.",time:"11:32"},
      {from:"client",text:"¿Cuánto tardan?",time:"11:35"},
    ]},
  { id:"573000111222", name:"Diego Moreno", phone:"+573000111222", unread:1, lastMsg:"Ok espero", lastTime:"12:12",
    messages:[
      {from:"client",text:"Buenas, ¿tienen alitas?",time:"12:08"},
      {from:"bot",text:"¡Sí! Alitas BBQ $22.900 🔥 ¿Las agrego?",time:"12:08"},
      {from:"client",text:"Sí, solo una orden",time:"12:09"},
      {from:"bot",text:"Total: $22.900. Carrera 7 #32-15. ¿Correcto?",time:"12:10"},
      {from:"client",text:"Sí, con Nequi",time:"12:11"},
      {from:"bot",text:"✅ ¡Pedido tomado! En cuanto lo confirmemos te avisamos.",time:"12:11"},
      {from:"client",text:"Ok espero",time:"12:12"},
    ]},
];

/* ════════════════════════════ GLOBAL CSS ═══════════════════════════════════ */
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
.os{font-family:'Syne',sans-serif;background:#060a12;color:#dde6f0;height:100vh;display:flex;overflow:hidden;position:relative;}
.os *{box-sizing:border-box;margin:0;padding:0;}
.os ::-webkit-scrollbar{width:3px;height:3px;}
.os ::-webkit-scrollbar-thumb{background:#25D36640;border-radius:4px;}
.sidebar{width:62px;background:#0a0f1c;border-right:1px solid #1a2236;display:flex;flex-direction:column;align-items:center;padding:14px 0;gap:4px;flex-shrink:0;}
.navbtn{width:42px;height:42px;border-radius:12px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;position:relative;color:#4b5563;}
.navbtn:hover{background:#ffffff10;color:#94a3b8;}
.navbtn.on{background:#25D36618;color:#25D366;}
.navbtn.on::before{content:'';position:absolute;left:-14px;top:50%;transform:translateY(-50%);width:3px;height:20px;background:#25D366;border-radius:0 3px 3px 0;}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.hdr{background:#0a0f1c;border-bottom:1px solid #1a2236;padding:0 22px;height:56px;display:flex;align-items:center;gap:14px;flex-shrink:0;}
.body{flex:1;overflow-y:auto;padding:20px;}
.body.kanban{overflow-y:hidden;overflow-x:auto;}
.card{background:#0d1526;border:1px solid #1a2742;border-radius:14px;}
.kanban-row{display:flex;gap:14px;height:100%;padding-bottom:8px;}
.kcol{background:#0a0f1c;border:1px solid #1a2236;border-radius:14px;padding:13px;width:265px;min-width:265px;display:flex;flex-direction:column;gap:8px;max-height:100%;}
.kcol.ov{border-color:#25D36650;background:#25D36606;}
.kcol-body{display:flex;flex-direction:column;gap:9px;overflow-y:auto;flex:1;}
.kcard{background:#111827;border:1px solid #1e2d3d;border-radius:10px;padding:12px;cursor:grab;transition:transform .15s,box-shadow .15s,border-color .15s;}
.kcard:hover{border-color:#25D36635;transform:translateY(-2px);box-shadow:0 6px 20px #00000050;}
.kcard.drag{opacity:.35;cursor:grabbing;}
.btn{border:none;border-radius:8px;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;transition:all .18s;font-size:12px;display:inline-flex;align-items:center;gap:5px;letter-spacing:.2px;}
.btn-g{background:#25D366;color:#000;padding:7px 14px;}
.btn-g:hover{background:#1dba58;}
.btn-h{background:transparent;color:#64748b;border:1px solid #1e2d3d;padding:7px 14px;}
.btn-h:hover{border-color:#25D366;color:#25D366;}
.btn-sm{padding:5px 10px;font-size:11px;}
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
.wa-cli{background:#1e2d3d;border-radius:14px 14px 14px 4px;padding:9px 13px;max-width:78%;align-self:flex-start;font-size:13px;white-space:pre-wrap;line-height:1.5;}
.wa-bot{background:#1a3a28;border:1px solid #25D36620;border-radius:14px 14px 4px 14px;padding:9px 13px;max-width:78%;align-self:flex-end;font-size:13px;white-space:pre-wrap;line-height:1.5;}
.fade{animation:fade .3s ease;}
@keyframes fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.stat{background:#0d1526;border:1px solid #1a2742;border-radius:14px;padding:18px;}

@media(max-width:768px){
  .os{flex-direction:column;}
  .sidebar{width:100%;height:56px;flex-direction:row;justify-content:space-around;border-right:none;border-top:1px solid #1a2236;order:2;padding:0 8px;gap:0;}
  .navbtn{width:48px;height:48px;border-radius:10px;}
  .navbtn.on::before{display:none;}
  .main{order:1;height:calc(100vh - 56px);}
  .hdr{padding:0 14px;height:50px;}
  .body{padding:12px;}
  .body.kanban{padding:10px;}
  .kanban-row{gap:10px;}
  .kcol{min-width:240px;width:240px;}
  .modal{width:95vw;padding:18px;border-radius:14px;}
  .toast-wrap{top:8px;right:8px;left:8px;}
  .toast{min-width:unset;width:100%;}
}
`;

/* ════════════════════════ MICRO COMPONENTS ═════════════════════════════════ */
const Av = ({name="",size=34}) => {
  const i=(name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase());
  const C=["#3b82f6","#8b5cf6","#f59e0b","#25D366","#f97316","#06b6d4"];
  const bg=C[name.charCodeAt(0)%C.length];
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg+"28",border:`1.5px solid ${bg}45`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.34,fontWeight:700,color:bg,flexShrink:0}}>{i}</div>;
};

const SBadge=({s,small})=>{
  const st=STATUS[s]||STATUS["Not processed"];
  return <span className="badge" style={{background:st.bg,color:st.col,border:`1px solid ${st.col}25`,fontSize:small?9:10}}>{st.icon} {st.label}</span>;
};

const CTooltip=({active,payload,label})=>{
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:"#0d1526",border:"1px solid #1a2742",borderRadius:8,padding:"9px 13px"}}>
      <div style={{fontSize:10,color:"#64748b",marginBottom:3,fontFamily:"DM Mono"}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{fontSize:12,color:p.color||"#25D366",fontFamily:"DM Mono"}}>
          {typeof p.value==="number"&&p.value>9999?cop(p.value*100):p.value}
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════ SVG ICONS (inline) ═══════════════════════════════ */
const Ic=({d,size=17,color="currentColor",...r})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...r}><path d={d}/></svg>
);
const Icons={
  pipe:  (c)=><Ic color={c} d="M3 5h4v14H3V5zm7 0h4v14h-4V5zm7 4h4v10h-4V9z"/>,
  chart: (c)=><Ic color={c} d="M3 3v18h18M9 17V9m4 8v-5m4 5V5"/>,
  wa:    (c)=><Ic color={c} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>,
  users: (c)=><Ic color={c} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>,
  cog:   (c)=><Ic color={c} d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>,
  x:     ()=><Ic d="M18 6L6 18M6 6l12 12"/>,
  send:  ()=><Ic d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>,
  pkg:   ()=><Ic d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>,
  spin:  ()=><Ic d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>,
};

/* ════════════════════════ ORDER MODAL ══════════════════════════════════════ */
const OrderModal=({order,onClose,onStatus,onPaid,loading})=>{
  if(!order) return null;
  const addr=order.shipping_address||{};
  return(
    <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal fade">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span className="mono" style={{fontSize:12,color:"#25D366"}}>#{order.id.slice(-8)}</span>
              {order._real&&<span className="badge" style={{background:"#0d2e1c",color:"#25D366",border:"1px solid #25D36618",fontSize:9}}>🔗 LIVE API</span>}
              <SBadge s={order.status}/>
            </div>
            <div style={{fontSize:17,fontWeight:700}}>{addr.name||order.user?.full_name||"Cliente"}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:3}}>📱 {order.user?.phone||"—"} · ⏱ {fmtTime(order.created_at)}</div>
          </div>
          <button onClick={onClose} className="btn btn-h btn-sm"><Icons.x/></button>
        </div>

        {/* Items */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:"#4b5563",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Productos</div>
          {(order.line_items||[]).map(item=>(
            <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 13px",background:"#111827",borderRadius:9,border:"1px solid #1e2d3d",marginBottom:6}}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{item.name}</div>
                <div style={{fontSize:10,color:"#4b5563"}}>{item.sku} · ×{item.amount}</div>
              </div>
              <span className="mono" style={{fontSize:13}}>{copRaw(parseFloat(item.price)*parseInt(item.amount||1))}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{background:"#111827",border:"1px solid #1e2d3d",borderRadius:10,padding:"13px 15px",marginBottom:16}}>
          {[["Subtotal",cop(order.subtotal)],["Envío",cop(order.shipping_cost)],["Impuestos",cop(order.total_taxes)]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:12,color:"#4b5563"}}>{l}</span>
              <span className="mono" style={{fontSize:12}}>{v}</span>
            </div>
          ))}
          <div style={{borderTop:"1px solid #1e2d3d",marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700}}>Total</span>
            <span className="mono" style={{fontSize:17,fontWeight:700,color:"#25D366"}}>{cop(order.total)}</span>
          </div>
          {order.payment_method&&<div style={{marginTop:6,fontSize:11,color:"#4b5563"}}>💳 {order.payment_method}</div>}
        </div>

        {/* Address */}
        {addr.address1&&<div style={{padding:"10px 13px",background:"#111827",border:"1px solid #1e2d3d",borderRadius:9,marginBottom:16,fontSize:12,color:"#94a3b8"}}>
          📍 {addr.address1}{addr.city?`, ${addr.city}`:""}
        </div>}

        {/* Actions */}
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {order._real&&order.status!=="Delivered"&&order.status!=="Cancelled"&&(
            <button className="btn btn-g btn-sm" onClick={()=>onPaid(order)} disabled={loading}>💰 Marcar Pagado</button>
          )}
          {STATUS_KEYS.filter(s=>s!==order.status).map(s=>(
            <button key={s} className="btn btn-h btn-sm" onClick={()=>onStatus(order,s)} disabled={loading}>
              {STATUS[s].icon} {STATUS[s].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════ KANBAN VIEW ══════════════════════════════════════ */
const KanbanView=({orders,setOrders,openOrder,addToast,setLoading})=>{
  const [dragId,setDragId]=useState(null);
  const [overCol,setOverCol]=useState(null);
  const byStatus=STATUS_KEYS.reduce((a,k)=>({...a,[k]:orders.filter(o=>o.status===k)}),{});

  const drop=async(e,ts)=>{
    e.preventDefault(); setOverCol(null);
    if(!dragId) return;
    const order=orders.find(o=>o.id===dragId);
    if(!order||order.status===ts){setDragId(null);return;}
    setOrders(p=>p.map(o=>o.id===dragId?{...o,status:ts}:o)); setDragId(null);
    if(order._real){
      setLoading(true);
      const r=await api.updateOrder(order.user_id,order.id,{status:ts});
      setLoading(false);
      if(r?.error){setOrders(p=>p.map(o=>o.id===order.id?{...o,status:order.status}:o));addToast({icon:"❌",title:"Error API",msg:r.error.message});return;}
    }
    addToast({icon:STATUS[ts].icon,title:"Estado actualizado",msg:`${order.shipping_address?.name||"Pedido"} → ${STATUS[ts].label}`});
  };

  return(
    <div className="kanban-row">
      {STATUS_KEYS.map(sk=>(
        <div key={sk} className={`kcol${overCol===sk?" ov":""}`}
          onDragOver={e=>{e.preventDefault();setOverCol(sk);}}
          onDragLeave={()=>setOverCol(null)}
          onDrop={e=>drop(e,sk)}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:15}}>{STATUS[sk].icon}</span>
              <span style={{fontSize:11,fontWeight:700,color:STATUS[sk].col}}>{STATUS[sk].label}</span>
            </div>
            <span className="mono badge" style={{background:"#111827",border:"1px solid #1e2d3d",fontSize:10,color:"#4b5563"}}>
              {byStatus[sk].length}
            </span>
          </div>
          <div style={{height:2,background:STATUS[sk].col+"28",borderRadius:2,flexShrink:0,marginTop:-2}}/>
          {/* Cards */}
          <div className="kcol-body">
            {byStatus[sk].length===0&&(
              <div style={{textAlign:"center",color:"#1e2d3d",fontSize:11,padding:"18px 0",border:"2px dashed #1a2236",borderRadius:8,marginTop:2}}>
                Sin pedidos
              </div>
            )}
            {byStatus[sk].map(order=>(
              <div key={order.id} className={`kcard${dragId===order.id?" drag":""}`}
                draggable onDragStart={e=>{setDragId(order.id);e.dataTransfer.effectAllowed="move";}}
                onDragEnd={()=>setDragId(null)} onClick={()=>openOrder(order)}>

                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <span className="mono" style={{fontSize:10,color:"#25D366"}}>#{order.id.slice(-6)}</span>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    {order._real&&<span style={{fontSize:9,background:"#0d2e1c",color:"#25D366",padding:"1px 5px",borderRadius:4}}>LIVE</span>}
                    <span className="mono" style={{fontSize:10,color:"#374151"}}>{fmtTime(order.created_at)}</span>
                  </div>
                </div>

                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                  <Av name={order.shipping_address?.name||order.user?.full_name||"?"} size={27}/>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,lineHeight:1.2}}>{order.shipping_address?.name||order.user?.full_name}</div>
                    <div style={{fontSize:10,color:"#4b5563"}}>{order.shipping_address?.city||"Bogotá"}</div>
                  </div>
                </div>

                <div style={{marginBottom:9}}>
                  {(order.line_items||[]).slice(0,3).map((item,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:1}}>
                      <span>×{item.amount} {item.name}</span>
                      <span className="mono">{copRaw(parseFloat(item.price)*parseInt(item.amount||1))}</span>
                    </div>
                  ))}
                  {(order.line_items||[]).length>3&&<div style={{fontSize:10,color:"#374151"}}>+{order.line_items.length-3} más</div>}
                </div>

                <div style={{borderTop:"1px solid #1e2d3d",paddingTop:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span className="mono" style={{fontSize:13,fontWeight:700}}>{cop(order.total)}</span>
                  {order.payment_method&&<span className="badge" style={{background:"#1e2d3d",color:"#64748b",fontSize:9}}>{order.payment_method}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════ ANALYTICS VIEW ═══════════════════════════════════ */
const AnalyticsView=({orders})=>{
  const delivered=orders.filter(o=>o.status==="Delivered");
  const cancelled=orders.filter(o=>o.status==="Cancelled");
  const totalRev=orders.reduce((s,o)=>s+(o.total||0),0);
  const avgTicket=orders.length?Math.floor(totalRev/orders.length):0;
  return(
    <div className="fade">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
        {[
          {label:"Ventas hoy",    val:cop(totalRev),    sub:`${orders.length} pedidos`,                                      icon:"💰",col:"#25D366"},
          {label:"Ticket prom.", val:cop(avgTicket),   sub:"por pedido",                                                     icon:"🎯",col:"#3b82f6"},
          {label:"Entregados",   val:delivered.length, sub:`de ${orders.length} totales`,                                    icon:"✅",col:"#22c55e"},
          {label:"Cancelados",   val:cancelled.length, sub:`${((cancelled.length/Math.max(orders.length,1))*100).toFixed(0)}% tasa`,icon:"❌",col:"#ef4444"},
        ].map((k,i)=>(
          <div key={i} className="stat">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <span style={{fontSize:10,color:"#4b5563",fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{k.label}</span>
              <span style={{fontSize:18}}>{k.icon}</span>
            </div>
            <div className="mono" style={{fontSize:20,fontWeight:700,color:k.col,marginBottom:3}}>{k.val}</div>
            <div style={{fontSize:11,color:"#374151"}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,marginBottom:14}}>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#4b5563",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Ventas semanales</div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={WEEKLY}>
              <defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#25D366" stopOpacity={.25}/><stop offset="95%" stopColor="#25D366" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="d" tick={{fontSize:10,fill:"#374151",fontFamily:"DM Mono"}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<CTooltip/>}/>
              <Area type="monotone" dataKey="v" stroke="#25D366" strokeWidth={2} fill="url(#gv)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#4b5563",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Métodos de pago</div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
            <PieChart width={130} height={130}>
              <Pie data={PAYMENTS} dataKey="pct" cx="50%" cy="50%" outerRadius={62} innerRadius={38} strokeWidth={0}>
                {PAYMENTS.map((p,i)=><Cell key={i} fill={p.color}/>)}
              </Pie>
            </PieChart>
          </div>
          {PAYMENTS.map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:8,height:8,borderRadius:2,background:p.color,flexShrink:0}}/>
                <span style={{fontSize:12,color:"#94a3b8"}}>{p.name}</span>
              </div>
              <span className="mono" style={{fontSize:12}}>{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#4b5563",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Pedidos por día</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={WEEKLY} barSize={16}>
              <XAxis dataKey="d" tick={{fontSize:10,fill:"#374151",fontFamily:"DM Mono"}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<CTooltip/>}/>
              <Bar dataKey="p" fill="#3b82f6" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#4b5563",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Top productos</div>
          {TOP_PRODS.map((p,i)=>(
            <div key={i} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,color:"#94a3b8"}}>{p.name}</span>
                <span className="mono" style={{fontSize:11,color:"#4b5563"}}>{p.qty}</span>
              </div>
              <div style={{height:4,background:"#1a2742",borderRadius:2}}>
                <div style={{height:"100%",width:`${(p.qty/34)*100}%`,background:"#25D366",borderRadius:2,transition:"width .5s ease"}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════ WHATSAPP VIEW ════════════════════════════════════ */
const WAView=()=>{
  const [active,setActive]=useState(WA_CONVOS[0].id);
  const [input,setInput]=useState("");
  const [convos,setConvos]=useState(WA_CONVOS);
  const end=useRef(null);
  const convo=convos.find(c=>c.id===active);
  useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth"});},[active,convo?.messages.length]);
  const send=()=>{
    if(!input.trim()) return;
    setConvos(p=>p.map(c=>c.id===active?{...c,messages:[...c.messages,{from:"client",text:input.trim(),time:new Date().toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})}],lastMsg:input.trim(),unread:0}:c));
    setInput("");
  };
  return(
    <div className="fade" style={{display:"flex",gap:14,height:"100%"}}>
      <div className="card" style={{width:250,flexShrink:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"13px 15px",borderBottom:"1px solid #1a2742",fontSize:13,fontWeight:700}}>💬 Conversaciones</div>
        <div style={{overflow:"auto",flex:1}}>
          {convos.map(c=>(
            <div key={c.id} onClick={()=>{setActive(c.id);setConvos(p=>p.map(x=>x.id===c.id?{...x,unread:0}:x));}}
              style={{padding:"11px 15px",cursor:"pointer",borderBottom:"1px solid #080c18",background:active===c.id?"#111827":"transparent",transition:"background .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <Av name={c.name} size={34}/>
                <div style={{flex:1,overflow:"hidden"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:13,fontWeight:600}}>{c.name}</span>
                    {c.unread>0&&<span style={{background:"#25D366",color:"#000",fontSize:10,fontWeight:800,padding:"1px 6px",borderRadius:10}}>{c.unread}</span>}
                  </div>
                  <div style={{fontSize:11,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.lastMsg}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {convo&&(
        <div className="card" style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"13px 18px",borderBottom:"1px solid #1a2742",display:"flex",alignItems:"center",gap:11}}>
            <Av name={convo.name}/>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>{convo.name}</div>
              <div style={{fontSize:11,color:"#4b5563"}}>📱 {convo.phone} · <span style={{color:"#25D366"}}>● En línea</span></div>
            </div>
            <div style={{marginLeft:"auto",display:"flex",gap:7}}>
              <button className="btn btn-h btn-sm">📞 Llamar</button>
              <button className="btn btn-g btn-sm">🤖 Bot activo</button>
            </div>
          </div>
          <div style={{flex:1,padding:"18px",overflow:"auto",display:"flex",flexDirection:"column",gap:9}}>
            {convo.messages.map((m,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.from==="client"?"flex-start":"flex-end"}}>
                {m.from==="bot"&&<div style={{fontSize:10,color:"#25D36660",marginBottom:2,paddingRight:4}}>🤖 Bot IA</div>}
                <div className={m.from==="client"?"wa-cli":"wa-bot"}>{m.text}</div>
                <div style={{fontSize:10,color:"#1e2d3d",marginTop:2,padding:"0 4px"}}>{m.time}</div>
              </div>
            ))}
            <div ref={end}/>
          </div>
          <div style={{padding:"13px 18px",borderTop:"1px solid #1a2742",display:"flex",gap:9}}>
            <input className="inp" style={{flex:1}} placeholder="Escribe un mensaje..." value={input}
              onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
            <button className="btn btn-g" onClick={send}><Icons.send/></button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════ CLIENTS VIEW ═════════════════════════════════════ */
const ClientsView=({orders})=>{
  const clients=Object.values(orders.reduce((acc,o)=>{
    const id=o.user_id;
    if(!acc[id]) acc[id]={...(o.user||{}),orders:[],total_spent:0,addr:o.shipping_address};
    acc[id].orders.push(o); acc[id].total_spent+=o.total;
    return acc;
  },{}));
  return(
    <div className="fade" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:13}}>
      {clients.map((c,i)=>(
        <div key={i} className="card" style={{padding:17}}>
          <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:13}}>
            <Av name={c.full_name||c.first_name||"?"} size={40}/>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>{c.full_name||c.first_name}</div>
              <div style={{fontSize:11,color:"#4b5563"}}>📱 {c.phone}</div>
            </div>
          </div>
          <div style={{borderTop:"1px solid #1a2742",paddingTop:11,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:11}}>
            <div style={{textAlign:"center"}}>
              <div className="mono" style={{fontSize:20,fontWeight:700,color:"#25D366"}}>{c.orders.length}</div>
              <div style={{fontSize:10,color:"#374151"}}>pedidos</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div className="mono" style={{fontSize:14,fontWeight:700,color:"#3b82f6"}}>{cop(c.total_spent)}</div>
              <div style={{fontSize:10,color:"#374151"}}>gastado</div>
            </div>
          </div>
          {c.addr?.address1&&<div style={{fontSize:11,color:"#374151",marginBottom:9}}>📍 {c.addr.address1}</div>}
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {c.orders.map(o=><SBadge key={o.id} s={o.status} small/>)}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════ SETTINGS VIEW ════════════════════════════════════ */
const SettingsView=()=>(
  <div className="fade" style={{maxWidth:680,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>
    <div className="card" style={{padding:20}}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:15,color:"#25D366"}}>🔗 Configuración API — Chatico.io</div>
      {[["Base URL",API_BASE,true,false],["Token",API_TOKEN,true,true],["Account ID","5888091",true,false],["Canal","WhatsApp (5)",false,false]].map(([l,v,mono,mask])=>(
        <div key={l} style={{display:"grid",gridTemplateColumns:"130px 1fr",alignItems:"center",gap:11,marginBottom:10}}>
          <span style={{fontSize:12,color:"#4b5563"}}>{l}</span>
          <input readOnly className="inp" style={{fontSize:12,fontFamily:mono?"DM Mono":"Syne"}}
            value={mask?v.slice(0,12)+"••••••••":v}/>
        </div>
      ))}
      <div style={{marginTop:14,display:"flex",gap:8}}>
        <button className="btn btn-g btn-sm">💾 Guardar</button>
        <button className="btn btn-h btn-sm">🔍 Test Conexión</button>
      </div>
    </div>
    <div className="card" style={{padding:20}}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:15}}>📱 Templates de Notificación WhatsApp</div>
      {[
        ["Pedido confirmado","✅ Tu pedido #{id} fue confirmado. ¡Pronto lo preparamos!"],
        ["En preparación","🔥 Tu pedido #{id} está siendo preparado. Tiempo est.: 20-30 min."],
        ["Enviado","🛵 ¡Tu pedido #{id} salió a entrega! El domiciliario está en camino."],
        ["Entregado","🎉 Pedido #{id} entregado. ¡Gracias por tu compra! ¿Cómo fue tu experiencia?"],
      ].map(([ev,msg])=>(
        <div key={ev} style={{background:"#111827",border:"1px solid #1e2d3d",borderRadius:10,padding:13,marginBottom:9}}>
          <div style={{fontSize:10,fontWeight:700,color:"#25D366",textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>{ev}</div>
          <textarea readOnly className="inp" style={{resize:"none",fontSize:12,minHeight:50,lineHeight:1.5}} value={msg}/>
        </div>
      ))}
    </div>
    <div className="card" style={{padding:20}}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:15}}>🖥️ Infraestructura VPS — Hostinger</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["CPU","4 vCPU","#3b82f6"],["RAM","8 GB","#8b5cf6"],["Disco","100 GB NVMe","#f59e0b"],["OS","Ubuntu 24.04","#25D366"],["Node.js","v20 LTS","#84cc16"],["PostgreSQL","v16","#06b6d4"],["Nginx","Proxy inverso","#f97316"],["Docker","Contenedores","#0ea5e9"]].map(([k,v,c])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 11px",background:"#111827",borderRadius:8,border:"1px solid #1e2d3d"}}>
            <span style={{fontSize:12,color:"#4b5563"}}>{k}</span>
            <span className="mono" style={{fontSize:12,color:c}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ════════════════════════ ROOT APP ═════════════════════════════════════════ */
export default function App(){
  const [view,setView]=useState("pipeline");
  const [orders,setOrders]=useState(SEED);
  const [selOrder,setSelOrder]=useState(null);
  const [toasts,setToasts]=useState([]);
  const [loading,setLoading]=useState(false);
  const [time,setTime]=useState(new Date());
  const tid=useRef(0);

  useEffect(()=>{
    let el=document.getElementById("__os");
    if(!el){el=document.createElement("style");el.id="__os";document.head.appendChild(el);}
    el.textContent=CSS;
  },[]);

  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[]);

  useEffect(()=>{
    (async()=>{
      const d=await api.getOrder("573046097929","5610709923077827042");
      if(d?.id) setOrders(p=>p.map(o=>o.id===d.id?{...d,_real:true}:o));
    })();
  },[]);

  const addToast=useCallback(({icon,title,msg})=>{
    const id=++tid.current;
    setToasts(p=>[...p,{id,icon,title,msg}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500);
  },[]);

  const onStatus=async(order,ns)=>{
    setOrders(p=>p.map(o=>o.id===order.id?{...o,status:ns}:o));
    setSelOrder(null);
    if(order._real){
      setLoading(true);
      const r=await api.updateOrder(order.user_id,order.id,{status:ns});
      setLoading(false);
      if(r?.error){setOrders(p=>p.map(o=>o.id===order.id?{...o,status:order.status}:o));addToast({icon:"❌",title:"Error API",msg:r.error.message});return;}
    }
    addToast({icon:STATUS[ns].icon,title:"Estado actualizado",msg:`${STATUS[ns].label} — WhatsApp enviado ✓`});
  };

  const onPaid=async(order)=>{
    setSelOrder(null); setLoading(true);
    const r=await api.markPaid(order.user_id,order.id,order.total);
    setLoading(false);
    addToast(r?.success
      ?{icon:"💰",title:"Pago registrado",msg:`${cop(order.total)} confirmado`}
      :{icon:"⚠️",title:"Error pago",msg:r?.error?.message||"No se pudo registrar"});
  };

  const NAVS=[
    {id:"pipeline", label:"Pedidos",    I:Icons.pipe},
    {id:"analytics",label:"Analíticas", I:Icons.chart},
    {id:"whatsapp", label:"WhatsApp",   I:Icons.wa},
    {id:"clients",  label:"Clientes",   I:Icons.users},
    {id:"settings", label:"Config",     I:Icons.cog},
  ];

  const pending=orders.filter(o=>o.status==="Not processed").length;
  const todayRev=orders.reduce((s,o)=>s+(o.total||0),0);
  const unread=WA_CONVOS.reduce((a,c)=>a+c.unread,0);

  return(
    <div className="os">
      {/* Sidebar */}
      <nav className="sidebar">
        <div style={{width:42,height:42,borderRadius:10,background:"#0a0f1c",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,overflow:"hidden"}}>
          <img src="https://chatiico.com/wp-content/uploads/2024/06/cropped-cropped-logo-col-completo-IA-blanco24-.png" style={{width:38,height:"auto",objectFit:"contain"}} alt="Chatico"/>
        </div>
        {NAVS.map(({id,label,I})=>(
          <button key={id} className={`navbtn${view===id?" on":""}`} onClick={()=>setView(id)} title={label}>
            {I(view===id?"#25D366":"#4b5563")}
            {id==="whatsapp"&&unread>0&&<span style={{position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:"#25D366"}}/>}
          </button>
        ))}
        <div style={{flex:1}}/>
        {loading&&<div style={{width:32,height:32,borderRadius:8,background:"#0d2e1c",display:"flex",alignItems:"center",justifyContent:"center"}} title="Sincronizando...">
          <Icons.spin/>
        </div>}
      </nav>

      {/* Main */}
      <div className="main">
        {/* Header */}
        <header className="hdr">
          <div className="dot"/>
          <span style={{fontSize:13,fontWeight:700}}>{NAVS.find(n=>n.id===view)?.label}</span>
          <span style={{fontSize:11,color:"#374151"}}>
            {view==="pipeline"?`· ${orders.length} pedidos total`:
             view==="analytics"?`· ${time.toLocaleDateString("es-CO")}`:
             view==="whatsapp"?`· ${unread} sin leer`:""}
          </span>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
            <span className="mono" style={{fontSize:11,color:"#374151"}}>{time.toLocaleTimeString("es-CO")}</span>
            <span className="mono" style={{fontSize:12,color:"#25D366",background:"#0d2e1c",padding:"4px 10px",borderRadius:8,border:"1px solid #25D36618"}}>{cop(todayRev)}</span>
            {pending>0&&<span style={{background:"#f59e0b",color:"#000",fontSize:11,fontWeight:800,padding:"3px 9px",borderRadius:8}}>{pending} nuevo{pending>1?"s":""}</span>}
            <div style={{width:32,height:32,borderRadius:"50%",background:"#25D36618",border:"1.5px solid #25D36628",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>👤</div>
          </div>
        </header>

        {/* Content */}
        <div className={`body${view==="pipeline"?" kanban":""}`}
          style={{height:view==="pipeline"?"calc(100vh - 56px)":undefined}}>
          {view==="pipeline"  && <KanbanView orders={orders} setOrders={setOrders} openOrder={setSelOrder} addToast={addToast} setLoading={setLoading}/>}
          {view==="analytics" && <AnalyticsView orders={orders}/>}
          {view==="whatsapp"  && <WAView/>}
          {view==="clients"   && <ClientsView orders={orders}/>}
          {view==="settings"  && <SettingsView/>}
        </div>
      </div>

      {/* Modal */}
      {selOrder&&<OrderModal order={selOrder} onClose={()=>setSelOrder(null)} onStatus={onStatus} onPaid={onPaid} loading={loading}/>}

      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map(t=>(
          <div key={t.id} className="toast">
            <span style={{fontSize:18,flexShrink:0}}>{t.icon||"🔔"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#dde6f0",marginBottom:2}}>{t.title}</div>
              <div style={{fontSize:12,color:"#4b5563"}}>{t.msg}</div>
            </div>
            <button onClick={()=>setToasts(p=>p.filter(x=>x.id!==t.id))} className="btn" style={{background:"transparent",border:"none",color:"#4b5563",padding:0}}>
              <Icons.x/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
