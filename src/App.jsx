import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { createClient } from "@supabase/supabase-js";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://azmcgfgnwstfickdltsy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6bWNnZmdud3N0Zmlja2RsdHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjU2MDksImV4cCI6MjA5NDEwMTYwOX0.BQPstAf9Vbzw14XyiX4iR-2r5WTiJBZ4lczvzq5fgbE";
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-CO", { style:"currency", currency:"COP", maximumFractionDigits:0 }).format(n||0);
const fmtShort = (n) => {
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(0) + "k";
  return String(n);
};
const hoyStr = () => new Date().toISOString().split("T")[0];
const mesStr = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,"0")}`; };
const COLORES_ESTILISTA = ["#5b8dee","#10b981","#a855f7","#f0a030","#e8614e","#06b6d4","#f43f5e","#84cc16"];
const SERVICIOS_DEFAULT = ["Corte de cabello","Tinte / coloración","Mechas / balayage","Peinado","Alisado / keratina","Tratamiento capilar","Manicure","Pedicure","Depilación","Cejas / pestañas","Maquillaje","Masaje","Facial"];
const METODOS_PAGO = ["Efectivo","Transferencia","Tarjeta débito","Tarjeta crédito","Nequi","Daviplata"];

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color="#5b8dee", icon }) {
  return (
    <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:"16px 18px", display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#8892a4", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
        {icon && <span style={{ fontSize:18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1.2 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"#8892a4" }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, max, color="#5b8dee", height=8 }) {
  const pct = Math.min((value/max)*100, 100);
  return (
    <div style={{ background:"#2a3042", borderRadius:99, height, overflow:"hidden" }}>
      <div style={{ width:pct+"%", height:"100%", borderRadius:99, background:value>max?"#e8614e":color, transition:"width 0.4s ease" }} />
    </div>
  );
}

function Spinner() {
  return <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:60, color:"#8892a4", fontSize:14 }}>Cargando desde la nube...</div>;
}


// ── ATENCIONES ────────────────────────────────────────────────────────────────
function Atenciones({ atenciones, loading, onAdd, onDelete, estilistas }) {
  const hoy = hoyStr();
  const empty = { fecha:hoy, cliente:"", estilistaId:"", servicios:[], otroServicio:"", subtotal:"", descuento:"0", metodoPago:"Efectivo", nota:"" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  const total = Math.max(0, parseInt(form.subtotal||0,10) - parseInt(form.descuento||0,10));
  const estSel = estilistas.find(e=>e.id===form.estilistaId);
  const comision = estSel ? Math.round(total*estSel.porcentajeBase/100) : 0;
  const salon = total - comision;

  const toggle = (s) => setForm(f=>({ ...f, servicios:f.servicios.includes(s)?f.servicios.filter(x=>x!==s):[...f.servicios,s] }));

  const submit = async () => {
    if (!form.cliente||!form.subtotal||form.servicios.length===0||saving) return;
    setSaving(true);
    const svcs = form.otroServicio ? [...form.servicios, form.otroServicio] : form.servicios;
    const est = estilistas.find(e=>e.id===form.estilistaId);
    const tot = Math.max(0, parseInt(form.subtotal,10)-parseInt(form.descuento||0,10));
    await onAdd({
      id:"a"+Date.now(), fecha:form.fecha, cliente:form.cliente.trim(),
      estilista_id:form.estilistaId, estilista:est?est.nombre:"", estilista_color:est?est.color:"#8892a4",
      porcentaje_estilista:est?est.porcentajeBase:0, servicios:svcs,
      subtotal:parseInt(form.subtotal,10), descuento:parseInt(form.descuento||0,10), total:tot,
      comision_estilista:est?Math.round(tot*est.porcentajeBase/100):0,
      ganancia_salon:est?tot-Math.round(tot*est.porcentajeBase/100):tot,
      metodo_pago:form.metodoPago, nota:form.nota.trim(),
      numero:atenciones.length+1,
    });
    setForm(empty); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const filtradas = atenciones.filter(a=>{
    const b=busqueda.toLowerCase();
    const m = b===""||a.cliente.toLowerCase().includes(b)||(a.estilista||"").toLowerCase().includes(b)||(a.servicios||[]).some(s=>s.toLowerCase().includes(b));
    return m && (filtroFecha===""||a.fecha===filtroFecha);
  });

  const totalHoy = atenciones.filter(a=>a.fecha===hoy).reduce((s,a)=>s+(a.total||0),0);
  const totalMes = atenciones.filter(a=>a.fecha.startsWith(mesStr())).reduce((s,a)=>s+(a.total||0),0);
  const salonMes = atenciones.filter(a=>a.fecha.startsWith(mesStr())).reduce((s,a)=>s+(a.ganancia_salon||a.total||0),0);
  const clientes = new Set(atenciones.map(a=>a.cliente.toLowerCase())).size;

  const IS = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
  const LS = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  if (detalle) {
    const a = detalle;
    return (
      <div style={{ maxWidth:480 }}>
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          <button onClick={()=>setDetalle(null)} style={{ background:"transparent", border:"1px solid #2a3042", borderRadius:8, color:"#8892a4", padding:"6px 14px", cursor:"pointer", fontSize:13 }}>← Volver</button>
          <button onClick={()=>{ if(window.confirm("¿Eliminar esta atención? No se puede deshacer.")){ onDelete(a.id); setDetalle(null); } }} style={{ background:"transparent", border:"1px solid #e8614e44", borderRadius:8, color:"#e8614e", padding:"6px 14px", cursor:"pointer", fontSize:13 }}>🗑 Eliminar</button>
        </div>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:16, padding:28, display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px solid #2a3042", paddingBottom:16 }}>
            <div>
              <div style={{ fontSize:11, color:"#8892a4", textTransform:"uppercase", letterSpacing:"0.08em" }}>Remisión de atención</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#e2e8f0", marginTop:4 }}>✂️ Salón de Belleza</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, color:"#8892a4" }}>N° {String(a.numero).padStart(4,"0")}</div>
              <div style={{ fontSize:13, color:"#8892a4" }}>{a.fecha}</div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ background:"#111827", borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontSize:11, color:"#8892a4", textTransform:"uppercase", marginBottom:4 }}>Cliente</div>
              <div style={{ fontSize:15, fontWeight:600, color:"#e2e8f0" }}>{a.cliente}</div>
            </div>
            {a.estilista && (
              <div style={{ background:"#111827", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:11, color:"#8892a4", textTransform:"uppercase", marginBottom:4 }}>Atendido por</div>
                <div style={{ fontSize:15, fontWeight:600, color:"#e2e8f0" }}>{a.estilista}</div>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize:12, color:"#8892a4", textTransform:"uppercase", marginBottom:10 }}>Servicios</div>
            {(a.servicios||[]).map((s,i)=>(
              <div key={i} style={{ padding:"8px 12px", background:"#111827", borderRadius:8, marginBottom:6, fontSize:14, color:"#e2e8f0" }}>✂ {s}</div>
            ))}
          </div>
          <div style={{ background:"#111827", borderRadius:10, padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:13, color:"#8892a4" }}>Subtotal</span>
              <span style={{ fontSize:13, color:"#e2e8f0" }}>{fmt(a.subtotal)}</span>
            </div>
            {(a.descuento||0)>0 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, color:"#10b981" }}>Descuento</span>
                <span style={{ fontSize:13, color:"#10b981" }}>− {fmt(a.descuento)}</span>
              </div>
            )}
            <div style={{ borderTop:"1px solid #2a3042", paddingTop:8, marginTop:4, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:15, fontWeight:700, color:"#e2e8f0" }}>TOTAL</span>
              <span style={{ fontSize:18, fontWeight:700, color:"#10b981" }}>{fmt(a.total)}</span>
            </div>
            <div style={{ marginTop:8, fontSize:12, color:"#8892a4" }}>Pago: <span style={{ color:"#5b8dee" }}>{a.metodo_pago}</span></div>
          </div>
          {a.estilista && (a.porcentaje_estilista||0)>0 && (
            <div style={{ background:"#111827", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:12, color:"#8892a4", textTransform:"uppercase", marginBottom:10 }}>Distribución</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, color:"#e2e8f0" }}>💇 {a.estilista} ({a.porcentaje_estilista}%)</span>
                <span style={{ fontSize:13, fontWeight:600, color:a.estilista_color||"#5b8dee" }}>{fmt(a.comision_estilista)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, color:"#e2e8f0" }}>✂️ Salón ({100-a.porcentaje_estilista}%)</span>
                <span style={{ fontSize:13, fontWeight:600, color:"#10b981" }}>{fmt(a.ganancia_salon)}</span>
              </div>
              <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:8 }}>
                <div style={{ width:a.porcentaje_estilista+"%", background:a.estilista_color||"#5b8dee" }} />
                <div style={{ flex:1, background:"#10b981" }} />
              </div>
            </div>
          )}
          {a.nota && <div style={{ fontSize:13, color:"#8892a4", fontStyle:"italic", borderTop:"1px solid #2a3042", paddingTop:12 }}>Nota: {a.nota}</div>}
          <div style={{ fontSize:11, color:"#8892a4", textAlign:"center", borderTop:"1px solid #2a3042", paddingTop:12 }}>¡Gracias por tu visita! · {new Date().toLocaleDateString("es-CO")}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KpiCard label="Recaudado hoy" value={fmt(totalHoy)} color="#10b981" icon="💅" />
        <KpiCard label="Recaudado este mes" value={fmt(totalMes)} color="#5b8dee" icon="📅" />
        <KpiCard label="Para el salón (mes)" value={fmt(salonMes)} color="#a855f7" icon="✂️" />
        <KpiCard label="Clientes" value={clientes} color="#f0a030" icon="👤" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>Nueva atención</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Fecha</label><input type="date" style={IS} value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} /></div>
            <div><label style={LS}>Método de pago</label>
              <select style={IS} value={form.metodoPago} onChange={e=>setForm(f=>({...f,metodoPago:e.target.value}))}>
                {METODOS_PAGO.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div><label style={LS}>Cliente *</label><input style={IS} placeholder="Nombre del cliente" value={form.cliente} onChange={e=>setForm(f=>({...f,cliente:e.target.value}))} /></div>
          <div>
            <label style={LS}>Estilista</label>
            {estilistas.filter(e=>e.activo).length===0 ? (
              <div style={{ fontSize:13, color:"#f0a030", padding:"10px 12px", background:"#111827", borderRadius:8, border:"1px solid #2a3042" }}>⚠️ Agrega estilistas primero en el módulo Estilistas.</div>
            ) : (
              <select style={IS} value={form.estilistaId} onChange={e=>setForm(f=>({...f,estilistaId:e.target.value}))}>
                <option value="">— Sin asignar —</option>
                {estilistas.filter(e=>e.activo).map(e=><option key={e.id} value={e.id}>{e.nombre} · {e.porcentajeBase}%</option>)}
              </select>
            )}
          </div>
          <div>
            <label style={LS}>Servicios *</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {SERVICIOS_DEFAULT.map(s=>(
                <button key={s} onClick={()=>toggle(s)} style={{ fontSize:12, padding:"5px 10px", borderRadius:20, cursor:"pointer", border:form.servicios.includes(s)?"1px solid #5b8dee":"1px solid #2a3042", background:form.servicios.includes(s)?"#1a2840":"#111827", color:form.servicios.includes(s)?"#5b8dee":"#8892a4" }}>{s}</button>
              ))}
            </div>
            <input style={{...IS, marginTop:8}} placeholder="Otro servicio" value={form.otroServicio} onChange={e=>setForm(f=>({...f,otroServicio:e.target.value}))} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Valor (COP) *</label><input type="number" style={IS} placeholder="80000" value={form.subtotal} onChange={e=>setForm(f=>({...f,subtotal:e.target.value}))} /></div>
            <div><label style={LS}>Descuento</label><input type="number" style={IS} placeholder="0" value={form.descuento} onChange={e=>setForm(f=>({...f,descuento:e.target.value}))} /></div>
          </div>
          {form.subtotal && (
            <div style={{ background:"#0d1117", borderRadius:8, padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, color:"#8892a4" }}>Total a cobrar</span>
                <span style={{ fontSize:16, fontWeight:700, color:"#10b981" }}>{fmt(total)}</span>
              </div>
              {estSel && (
                <>
                  <div style={{ borderTop:"1px solid #1a1f2e", paddingTop:6, display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:"#8892a4" }}>💇 {estSel.nombre} ({estSel.porcentajeBase}%)</span>
                    <span style={{ fontSize:12, fontWeight:600, color:estSel.color }}>{fmt(comision)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:"#8892a4" }}>✂️ Salón ({100-estSel.porcentajeBase}%)</span>
                    <span style={{ fontSize:12, fontWeight:600, color:"#10b981" }}>{fmt(salon)}</span>
                  </div>
                  <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:6, marginTop:2 }}>
                    <div style={{ width:estSel.porcentajeBase+"%", background:estSel.color }} />
                    <div style={{ flex:1, background:"#10b981" }} />
                  </div>
                </>
              )}
            </div>
          )}
          <div><label style={LS}>Nota</label><input style={IS} placeholder="Próxima cita, observaciones..." value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))} /></div>
          <button onClick={submit} disabled={saving} style={{ padding:"12px", borderRadius:8, border:"none", background:saved?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontSize:15, fontWeight:600, opacity:saving?0.7:1 }}>
            {saving?"Guardando...":saved?"✓ Guardada":"Registrar atención"}
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", gap:8 }}>
            <input style={{...IS, flex:1}} placeholder="🔍 Buscar cliente, estilista o servicio..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
            <input type="date" style={{...IS, width:140}} value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)} />
          </div>
          {loading && <Spinner />}
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:520, overflowY:"auto" }}>
            {!loading && filtradas.length===0 && (
              <div style={{ textAlign:"center", padding:40, color:"#8892a4", fontSize:14 }}>
                {atenciones.length===0?"Sin atenciones registradas aún.":"Sin resultados."}
              </div>
            )}
            {filtradas.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(a=>(
              <div key={a.id} onClick={()=>setDetalle(a)} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:10, padding:"12px 16px", cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor="#5b8dee"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="#2a3042"}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{a.cliente}</div>
                    <div style={{ fontSize:12, color:"#8892a4", marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
                      {a.fecha}
                      {a.estilista && <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>· <span style={{ width:8, height:8, borderRadius:"50%", background:a.estilista_color||"#8892a4", display:"inline-block" }} /><span style={{ color:a.estilista_color||"#8892a4" }}>{a.estilista}</span></span>}
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:6 }}>
                      {(a.servicios||[]).slice(0,3).map((s,i)=><span key={i} style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#5b8dee22", color:"#5b8dee" }}>{s}</span>)}
                      {(a.servicios||[]).length>3 && <span style={{ fontSize:11, color:"#8892a4" }}>+{a.servicios.length-3} más</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:16, fontWeight:700, color:"#10b981" }}>{fmt(a.total)}</div>
                    {a.estilista && (a.porcentaje_estilista||0)>0 && <div style={{ fontSize:11, color:"#8892a4" }}>Salón: <span style={{ color:"#10b981" }}>{fmt(a.ganancia_salon)}</span></div>}
                    <div style={{ fontSize:11, color:"#8892a4" }}>{a.metodo_pago}</div>
                    <div style={{ fontSize:11, color:"#5b8dee", marginTop:4 }}>Ver remisión →</div>
                    <button onClick={e=>{ e.stopPropagation(); if(window.confirm("¿Eliminar esta atención?")){ onDelete(a.id); } }} style={{ marginTop:4, fontSize:11, padding:"3px 8px", borderRadius:6, border:"1px solid #e8614e44", background:"transparent", color:"#e8614e", cursor:"pointer" }}>🗑 Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ── GASTOS SALON ──────────────────────────────────────────────────────────────
const CATS_GASTO_SALON = ["Arriendo","Productos / insumos","Servicios públicos","Nómina","Publicidad","Mantenimiento","Equipos","Otros"];

function GastosSalon({ gastosSalon, loading, onAdd, onDelete }) {
  const hoy = hoyStr();
  const mes = mesStr();
  const empty = { fecha:hoy, categoria:"Arriendo", descripcion:"", monto:"", es_recurrente:false };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const IS = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
  const LS = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  const submit = async () => {
    if (!form.descripcion || !form.monto || saving) return;
    setSaving(true);
    await onAdd({ id:"gs"+Date.now(), ...form, monto:parseInt(form.monto,10) });
    setForm(empty); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const delMes = gastosSalon.filter(g=>g.fecha.startsWith(mes));
  const totalMes = delMes.reduce((s,g)=>s+g.monto,0);
  const fijos = delMes.filter(g=>g.es_recurrente).reduce((s,g)=>s+g.monto,0);
  const variables = totalMes - fijos;

  const catMap = {};
  delMes.forEach(g=>{ catMap[g.categoria]=(catMap[g.categoria]||0)+g.monto; });
  const catMayor = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KpiCard label="Gastos del mes" value={fmt(totalMes)} color="#e8614e" icon="💸" />
        <KpiCard label="Gastos fijos" value={fmt(fijos)} color="#f0a030" icon="🔁" />
        <KpiCard label="Gastos variables" value={fmt(variables)} color="#a855f7" icon="⚡" />
        <KpiCard label="Mayor categoría" value={catMayor?catMayor[0]:"—"} color="#5b8dee" icon="📊" sub={catMayor?fmt(catMayor[1]):""} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:14, height:"fit-content" }}>
          <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>Nuevo gasto del salón</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Fecha</label><input type="date" style={IS} value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} /></div>
            <div><label style={LS}>Categoría</label>
              <select style={IS} value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                {CATS_GASTO_SALON.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label style={LS}>Descripción *</label><input style={IS} placeholder="Ej: Arriendo mayo" value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} /></div>
          <div><label style={LS}>Monto (COP) *</label><input type="number" style={IS} placeholder="500000" value={form.monto} onChange={e=>setForm(f=>({...f,monto:e.target.value}))} /></div>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"#e2e8f0" }}>
            <input type="checkbox" checked={form.es_recurrente} onChange={e=>setForm(f=>({...f,es_recurrente:e.target.checked}))} style={{ accentColor:"#5b8dee", width:16, height:16 }} />
            🔁 Gasto fijo / recurrente
          </label>
          <button onClick={submit} disabled={saving} style={{ padding:"11px", borderRadius:8, border:"none", background:saved?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, opacity:saving?0.7:1 }}>
            {saving?"Guardando...":saved?"✓ Guardado":"Registrar gasto"}
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:480, overflowY:"auto" }}>
          {loading && <Spinner />}
          {!loading && delMes.length===0 && (
            <div style={{ textAlign:"center", padding:40, color:"#8892a4", fontSize:14, background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12 }}>Sin gastos registrados este mes.</div>
          )}
          {delMes.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(g=>(
            <div key={g.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:10, padding:"12px 16px" }}>
              {confirm===g.id ? (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{onDelete(g.id);setConfirm(null);}} style={{ flex:1, padding:"7px", borderRadius:7, border:"none", background:"#e8614e", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>Eliminar</button>
                  <button onClick={()=>setConfirm(null)} style={{ flex:1, padding:"7px", borderRadius:7, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:13 }}>Cancelar</button>
                </div>
              ) : (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{g.descripcion}</div>
                    <div style={{ fontSize:11, color:"#8892a4", marginTop:2 }}>{g.fecha} · {g.categoria} {g.es_recurrente?"· 🔁":""}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:15, fontWeight:700, color:"#e8614e" }}>{fmt(g.monto)}</span>
                    <button onClick={()=>setConfirm(g.id)} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #e8614e22", background:"transparent", color:"#e8614e", cursor:"pointer", fontSize:12 }}>🗑</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DEUDAS SALON ──────────────────────────────────────────────────────────────
function DeudasSalon({ deudasSalon, loading, onAdd, onDelete, onUpdate }) {
  const empty = { nombre:"", entidad:"", saldo_inicial:"", saldo_actual:"", cuota_mensual:"", tasa_interes:"", fecha_pago:"", estado:"activa" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [editId, setEditId] = useState(null);

  const IS = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
  const LS = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  const submit = async () => {
    if (!form.nombre || !form.saldo_actual || saving) return;
    setSaving(true);
    const data = { ...form, saldo_inicial:parseInt(form.saldo_inicial||form.saldo_actual,10), saldo_actual:parseInt(form.saldo_actual,10), cuota_mensual:parseInt(form.cuota_mensual||0,10), tasa_interes:parseFloat(form.tasa_interes||0) };
    if (editId) { await onUpdate({...data, id:editId}); setEditId(null); }
    else await onAdd({ id:"ds"+Date.now(), ...data });
    setForm(empty); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const totalDeuda = deudasSalon.filter(d=>d.estado==="activa").reduce((s,d)=>s+d.saldo_actual,0);
  const cuotasTotal = deudasSalon.filter(d=>d.estado==="activa").reduce((s,d)=>s+d.cuota_mensual,0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <KpiCard label="Deuda total salón" value={fmt(totalDeuda)} color="#e8614e" icon="🔗" />
        <KpiCard label="Cuota mensual total" value={fmt(cuotasTotal)} color="#f0a030" icon="📆" />
        <KpiCard label="Deudas activas" value={deudasSalon.filter(d=>d.estado==="activa").length} color="#a855f7" icon="⚠️" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:12, height:"fit-content" }}>
          <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>{editId?"✏️ Editar deuda":"Nueva deuda del salón"}</div>
          <div><label style={LS}>Nombre / descripción *</label><input style={IS} placeholder="Ej: Préstamo banco, proveedor" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
          <div><label style={LS}>Entidad / acreedor</label><input style={IS} placeholder="Ej: Bancolombia, Proveedor X" value={form.entidad} onChange={e=>setForm(f=>({...f,entidad:e.target.value}))} /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Saldo inicial</label><input type="number" style={IS} placeholder="5000000" value={form.saldo_inicial} onChange={e=>setForm(f=>({...f,saldo_inicial:e.target.value}))} /></div>
            <div><label style={LS}>Saldo actual *</label><input type="number" style={IS} placeholder="3500000" value={form.saldo_actual} onChange={e=>setForm(f=>({...f,saldo_actual:e.target.value}))} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Cuota mensual</label><input type="number" style={IS} placeholder="350000" value={form.cuota_mensual} onChange={e=>setForm(f=>({...f,cuota_mensual:e.target.value}))} /></div>
            <div><label style={LS}>Tasa interés %</label><input type="number" style={IS} placeholder="1.5" value={form.tasa_interes} onChange={e=>setForm(f=>({...f,tasa_interes:e.target.value}))} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Día de pago</label><input type="number" style={IS} placeholder="15" min="1" max="31" value={form.fecha_pago} onChange={e=>setForm(f=>({...f,fecha_pago:e.target.value}))} /></div>
            <div><label style={LS}>Estado</label>
              <select style={IS} value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))}>
                <option value="activa">Activa</option>
                <option value="pagada">Pagada</option>
                <option value="en mora">En mora</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={submit} disabled={saving} style={{ flex:1, padding:"11px", borderRadius:8, border:"none", background:saved?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, opacity:saving?0.7:1 }}>
              {saving?"Guardando...":saved?"✓ Guardado":editId?"Guardar cambios":"Agregar deuda"}
            </button>
            {editId && <button onClick={()=>{setEditId(null);setForm(empty);}} style={{ padding:"11px 16px", borderRadius:8, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:14 }}>Cancelar</button>}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:500, overflowY:"auto" }}>
          {loading && <Spinner />}
          {!loading && deudasSalon.length===0 && (
            <div style={{ textAlign:"center", padding:40, color:"#8892a4", fontSize:14, background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12 }}>Sin deudas registradas.</div>
          )}
          {deudasSalon.map(d=>{
            const avance = d.saldo_inicial>0 ? ((d.saldo_inicial-d.saldo_actual)/d.saldo_inicial)*100 : 0;
            return (
              <div key={d.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
                {confirm===d.id ? (
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>{onDelete(d.id);setConfirm(null);}} style={{ flex:1, padding:"7px", borderRadius:7, border:"none", background:"#e8614e", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>Eliminar</button>
                    <button onClick={()=>setConfirm(null)} style={{ flex:1, padding:"7px", borderRadius:7, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:13 }}>Cancelar</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{d.nombre}</div>
                        <div style={{ fontSize:12, color:"#8892a4" }}>{d.entidad} {d.fecha_pago?`· Pago día ${d.fecha_pago}`:""} {d.tasa_interes?`· ${d.tasa_interes}%`:""}</div>
                      </div>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <span style={{ fontSize:11, padding:"3px 8px", borderRadius:20, background:d.estado==="pagada"?"#10b98122":d.estado==="en mora"?"#e8614e22":"#f0a03022", color:d.estado==="pagada"?"#10b981":d.estado==="en mora"?"#e8614e":"#f0a030" }}>{d.estado}</span>
                        <button onClick={()=>{setEditId(d.id);setForm({nombre:d.nombre,entidad:d.entidad||"",saldo_inicial:d.saldo_inicial,saldo_actual:d.saldo_actual,cuota_mensual:d.cuota_mensual,tasa_interes:d.tasa_interes,fecha_pago:d.fecha_pago,estado:d.estado});}} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:12 }}>✏️</button>
                        <button onClick={()=>setConfirm(d.id)} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #e8614e22", background:"transparent", color:"#e8614e", cursor:"pointer", fontSize:12 }}>🗑</button>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
                      <div><div style={{ fontSize:11, color:"#8892a4" }}>SALDO ACTUAL</div><div style={{ fontSize:13, fontWeight:600, color:"#e8614e" }}>{fmt(d.saldo_actual)}</div></div>
                      <div><div style={{ fontSize:11, color:"#8892a4" }}>CUOTA</div><div style={{ fontSize:13, color:"#f0a030" }}>{fmt(d.cuota_mensual)}</div></div>
                      <div><div style={{ fontSize:11, color:"#8892a4" }}>AVANCE</div><div style={{ fontSize:13, color:"#10b981" }}>{avance.toFixed(0)}%</div></div>
                    </div>
                    <ProgressBar value={d.saldo_inicial-d.saldo_actual} max={d.saldo_inicial||d.saldo_actual} color="#10b981" height={6} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── NOMINA ────────────────────────────────────────────────────────────────────
function Nomina({ nomina, loading, onAdd, onDelete, onUpdate }) {
  const mes = mesStr();
  const empty = { nombre:"", cargo:"", sueldo_fijo:"", fecha_pago:"", estado:"pendiente", es_dueno:false, mes };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const IS = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
  const LS = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  const submit = async () => {
    if (!form.nombre || !form.sueldo_fijo || saving) return;
    setSaving(true);
    await onAdd({ id:"nm"+Date.now(), ...form, sueldo_fijo:parseInt(form.sueldo_fijo,10) });
    setForm(empty); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const delMes = nomina.filter(n=>n.mes===mes);
  const totalNomina = delMes.reduce((s,n)=>s+n.sueldo_fijo,0);
  const pagados = delMes.filter(n=>n.estado==="pagado").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <KpiCard label="Nómina del mes" value={fmt(totalNomina)} color="#5b8dee" icon="💼" />
        <KpiCard label="Empleados" value={delMes.length} color="#10b981" icon="👥" />
        <KpiCard label="Pagos pendientes" value={delMes.length-pagados} color={delMes.length-pagados>0?"#f0a030":"#10b981"} icon="⏳" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:12, height:"fit-content" }}>
          <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>Agregar a nómina</div>
          <div><label style={LS}>Nombre *</label><input style={IS} placeholder="Ej: Carlos Pérez" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
          <div><label style={LS}>Cargo</label><input style={IS} placeholder="Ej: Estilista, recepcionista, dueño" value={form.cargo} onChange={e=>setForm(f=>({...f,cargo:e.target.value}))} /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Sueldo fijo (COP) *</label><input type="number" style={IS} placeholder="1500000" value={form.sueldo_fijo} onChange={e=>setForm(f=>({...f,sueldo_fijo:e.target.value}))} /></div>
            <div><label style={LS}>Día de pago</label><input type="number" style={IS} placeholder="30" min="1" max="31" value={form.fecha_pago} onChange={e=>setForm(f=>({...f,fecha_pago:e.target.value}))} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Estado</label>
              <select style={IS} value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))}>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
              </select>
            </div>
            <div><label style={LS}>Mes</label><input style={IS} value={form.mes} onChange={e=>setForm(f=>({...f,mes:e.target.value}))} /></div>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"#e2e8f0" }}>
            <input type="checkbox" checked={form.es_dueno} onChange={e=>setForm(f=>({...f,es_dueno:e.target.checked}))} style={{ accentColor:"#5b8dee", width:16, height:16 }} />
            👑 Es el dueño (se paga sueldo como empleado)
          </label>
          <button onClick={submit} disabled={saving} style={{ padding:"11px", borderRadius:8, border:"none", background:saved?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, opacity:saving?0.7:1 }}>
            {saving?"Guardando...":saved?"✓ Guardado":"Agregar a nómina"}
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:480, overflowY:"auto" }}>
          {loading && <Spinner />}
          {!loading && delMes.length===0 && (
            <div style={{ textAlign:"center", padding:40, color:"#8892a4", fontSize:14, background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12 }}>Sin nómina registrada este mes.</div>
          )}
          {delMes.map(n=>(
            <div key={n.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
              {confirm===n.id ? (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{onDelete(n.id);setConfirm(null);}} style={{ flex:1, padding:"7px", borderRadius:7, border:"none", background:"#e8614e", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>Eliminar</button>
                  <button onClick={()=>setConfirm(null)} style={{ flex:1, padding:"7px", borderRadius:7, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:13 }}>Cancelar</button>
                </div>
              ) : (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{n.nombre}</div>
                      {n.es_dueno && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#f0a03022", color:"#f0a030" }}>👑 Dueño</span>}
                    </div>
                    <div style={{ fontSize:12, color:"#8892a4", marginTop:2 }}>{n.cargo} {n.fecha_pago?`· Pago día ${n.fecha_pago}`:""}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#5b8dee" }}>{fmt(n.sueldo_fijo)}</div>
                      <button onClick={()=>onUpdate({...n, estado:n.estado==="pagado"?"pendiente":"pagado"})} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, border:"none", cursor:"pointer", background:n.estado==="pagado"?"#10b98122":"#f0a03022", color:n.estado==="pagado"?"#10b981":"#f0a030", marginTop:4 }}>
                        {n.estado==="pagado"?"✓ Pagado":"⏳ Pendiente"}
                      </button>
                    </div>
                    <button onClick={()=>setConfirm(n.id)} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #e8614e22", background:"transparent", color:"#e8614e", cursor:"pointer", fontSize:12 }}>🗑</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── FINANZAS PERSONALES ───────────────────────────────────────────────────────
const CATS_INGRESO_PERSONAL = ["Sueldo del salón","Otro negocio","Freelance","Arriendo","Inversiones","Otros"];
const CATS_GASTO_PERSONAL = ["Vivienda","Alimentación","Transporte","Salud","Educación","Entretenimiento","Ropa","Servicios","Otros"];

function FinanzasPersonales({ fpIngresos, fpGastos, fpDeudas, loading, onAddIngreso, onAddGasto, onAddDeuda, onDeleteIngreso, onDeleteGasto, onDeleteDeuda, onUpdateDeuda }) {
  const mes = mesStr();
  const hoy = hoyStr();
  const [tab, setTab] = useState("resumen");

  const emptyIng = { fecha:hoy, categoria:"Sueldo del salón", descripcion:"", monto:"" };
  const emptyGas = { fecha:hoy, categoria:"Vivienda", descripcion:"", monto:"" };
  const emptyDeu = { nombre:"", entidad:"", saldo_inicial:"", saldo_actual:"", cuota_mensual:"", fecha_pago:"", estado:"activa" };
  const [formIng, setFormIng] = useState(emptyIng);
  const [formGas, setFormGas] = useState(emptyGas);
  const [formDeu, setFormDeu] = useState(emptyDeu);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDeu, setConfirmDeu] = useState(null);

  const IS = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
  const LS = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  const ingMes = fpIngresos.filter(i=>i.fecha.startsWith(mes)).reduce((s,i)=>s+(i.monto||0),0);
  const gasMes = fpGastos.filter(g=>g.fecha.startsWith(mes)).reduce((s,g)=>s+(g.monto||0),0);
  const balMes = ingMes - gasMes;
  const totalDeudas = fpDeudas.filter(d=>d.estado==="activa").reduce((s,d)=>s+(d.saldo_actual||0),0);
  const cuotasDeudas = fpDeudas.filter(d=>d.estado==="activa").reduce((s,d)=>s+(d.cuota_mensual||0),0);
  const nivelEnd = ingMes>0 ? (cuotasDeudas/ingMes)*100 : 0;

  const submitIng = async () => {
    if (!formIng.descripcion||!formIng.monto||saving) return;
    setSaving(true);
    await onAddIngreso({ id:"fpi"+Date.now(), ...formIng, monto:parseInt(formIng.monto,10) });
    setFormIng(emptyIng); setSaving(false); setSaved("ing"); setTimeout(()=>setSaved(false),2000);
  };
  const submitGas = async () => {
    if (!formGas.descripcion||!formGas.monto||saving) return;
    setSaving(true);
    await onAddGasto({ id:"fpg"+Date.now(), ...formGas, monto:parseInt(formGas.monto,10) });
    setFormGas(emptyGas); setSaving(false); setSaved("gas"); setTimeout(()=>setSaved(false),2000);
  };
  const submitDeu = async () => {
    if (!formDeu.nombre||!formDeu.saldo_actual||saving) return;
    setSaving(true);
    await onAddDeuda({ id:"fpd"+Date.now(), ...formDeu, saldo_inicial:parseInt(formDeu.saldo_inicial||formDeu.saldo_actual,10), saldo_actual:parseInt(formDeu.saldo_actual,10), cuota_mensual:parseInt(formDeu.cuota_mensual||0,10) });
    setFormDeu(emptyDeu); setSaving(false); setSaved("deu"); setTimeout(()=>setSaved(false),2000);
  };

  const tabs = [
    { id:"resumen", label:"Resumen" },
    { id:"ingresos", label:"Ingresos" },
    { id:"gastos", label:"Gastos" },
    { id:"deudas", label:"Deudas" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        <KpiCard label="Ingresos personales" value={fmt(ingMes)} color="#10b981" icon="💰" />
        <KpiCard label="Gastos personales" value={fmt(gasMes)} color="#e8614e" icon="💸" />
        <KpiCard label="Balance personal" value={fmt(balMes)} color={balMes>=0?"#10b981":"#e8614e"} icon="⚖️" />
        <KpiCard label="Deuda personal" value={fmt(totalDeudas)} color="#f0a030" icon="🔗" />
        <KpiCard label="Nivel endeudamiento" value={nivelEnd.toFixed(1)+"%"} color={nivelEnd<=30?"#10b981":"#e8614e"} icon="⚠️" />
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ fontSize:13, padding:"7px 18px", borderRadius:20, cursor:"pointer", border:tab===t.id?"1px solid #5b8dee":"1px solid #2a3042", background:tab===t.id?"#1a2840":"#111827", color:tab===t.id?"#5b8dee":"#8892a4", fontWeight:tab===t.id?600:400 }}>{t.label}</button>
        ))}
      </div>

      {tab==="resumen" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
            <div style={{ fontSize:13, color:"#8892a4", fontWeight:500, marginBottom:12, textTransform:"uppercase" }}>Ingresos del mes</div>
            {fpIngresos.filter(i=>i.fecha.startsWith(mes)).length===0 ? <div style={{ color:"#8892a4", fontSize:13 }}>Sin ingresos registrados.</div> :
              fpIngresos.filter(i=>i.fecha.startsWith(mes)).map(i=>(
                <div key={i.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #2a3042" }}>
                  <span style={{ fontSize:13, color:"#e2e8f0" }}>{i.descripcion}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"#10b981" }}>{fmt(i.monto)}</span>
                </div>
              ))
            }
          </div>
          <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
            <div style={{ fontSize:13, color:"#8892a4", fontWeight:500, marginBottom:12, textTransform:"uppercase" }}>Gastos del mes</div>
            {fpGastos.filter(g=>g.fecha.startsWith(mes)).length===0 ? <div style={{ color:"#8892a4", fontSize:13 }}>Sin gastos registrados.</div> :
              fpGastos.filter(g=>g.fecha.startsWith(mes)).map(g=>(
                <div key={g.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #2a3042" }}>
                  <span style={{ fontSize:13, color:"#e2e8f0" }}>{g.descripcion}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"#e8614e" }}>{fmt(g.monto)}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {tab==="ingresos" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>Nuevo ingreso personal</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div><label style={LS}>Fecha</label><input type="date" style={IS} value={formIng.fecha} onChange={e=>setFormIng(f=>({...f,fecha:e.target.value}))} /></div>
              <div><label style={LS}>Categoría</label>
                <select style={IS} value={formIng.categoria} onChange={e=>setFormIng(f=>({...f,categoria:e.target.value}))}>
                  {CATS_INGRESO_PERSONAL.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div><label style={LS}>Descripción *</label><input style={IS} placeholder="Ej: Sueldo mayo" value={formIng.descripcion} onChange={e=>setFormIng(f=>({...f,descripcion:e.target.value}))} /></div>
            <div><label style={LS}>Monto (COP) *</label><input type="number" style={IS} placeholder="2000000" value={formIng.monto} onChange={e=>setFormIng(f=>({...f,monto:e.target.value}))} /></div>
            <button onClick={submitIng} disabled={saving} style={{ padding:"11px", borderRadius:8, border:"none", background:saved==="ing"?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, opacity:saving?0.7:1 }}>
              {saved==="ing"?"✓ Guardado":"Registrar ingreso"}
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:400, overflowY:"auto" }}>
            {fpIngresos.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(i=>(
              <div key={i.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div><div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{i.descripcion}</div><div style={{ fontSize:11, color:"#8892a4" }}>{i.fecha} · {i.categoria}</div></div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:"#10b981" }}>{fmt(i.monto)}</span>
                  <button onClick={()=>onDeleteIngreso(i.id)} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #e8614e22", background:"transparent", color:"#e8614e", cursor:"pointer", fontSize:12 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="gastos" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>Nuevo gasto personal</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div><label style={LS}>Fecha</label><input type="date" style={IS} value={formGas.fecha} onChange={e=>setFormGas(f=>({...f,fecha:e.target.value}))} /></div>
              <div><label style={LS}>Categoría</label>
                <select style={IS} value={formGas.categoria} onChange={e=>setFormGas(f=>({...f,categoria:e.target.value}))}>
                  {CATS_GASTO_PERSONAL.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div><label style={LS}>Descripción *</label><input style={IS} placeholder="Ej: Arriendo apartamento" value={formGas.descripcion} onChange={e=>setFormGas(f=>({...f,descripcion:e.target.value}))} /></div>
            <div><label style={LS}>Monto (COP) *</label><input type="number" style={IS} placeholder="800000" value={formGas.monto} onChange={e=>setFormGas(f=>({...f,monto:e.target.value}))} /></div>
            <button onClick={submitGas} disabled={saving} style={{ padding:"11px", borderRadius:8, border:"none", background:saved==="gas"?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, opacity:saving?0.7:1 }}>
              {saved==="gas"?"✓ Guardado":"Registrar gasto"}
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:400, overflowY:"auto" }}>
            {fpGastos.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(g=>(
              <div key={g.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div><div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{g.descripcion}</div><div style={{ fontSize:11, color:"#8892a4" }}>{g.fecha} · {g.categoria}</div></div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:"#e8614e" }}>{fmt(g.monto)}</span>
                  <button onClick={()=>onDeleteGasto(g.id)} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #e8614e22", background:"transparent", color:"#e8614e", cursor:"pointer", fontSize:12 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="deudas" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:12, height:"fit-content" }}>
            <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>Nueva deuda personal</div>
            <div><label style={LS}>Nombre *</label><input style={IS} placeholder="Ej: Tarjeta, préstamo" value={formDeu.nombre} onChange={e=>setFormDeu(f=>({...f,nombre:e.target.value}))} /></div>
            <div><label style={LS}>Entidad</label><input style={IS} placeholder="Ej: Bancolombia" value={formDeu.entidad} onChange={e=>setFormDeu(f=>({...f,entidad:e.target.value}))} /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div><label style={LS}>Saldo inicial</label><input type="number" style={IS} placeholder="5000000" value={formDeu.saldo_inicial} onChange={e=>setFormDeu(f=>({...f,saldo_inicial:e.target.value}))} /></div>
              <div><label style={LS}>Saldo actual *</label><input type="number" style={IS} placeholder="3000000" value={formDeu.saldo_actual} onChange={e=>setFormDeu(f=>({...f,saldo_actual:e.target.value}))} /></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div><label style={LS}>Cuota mensual</label><input type="number" style={IS} placeholder="300000" value={formDeu.cuota_mensual} onChange={e=>setFormDeu(f=>({...f,cuota_mensual:e.target.value}))} /></div>
              <div><label style={LS}>Día de pago</label><input type="number" style={IS} placeholder="15" value={formDeu.fecha_pago} onChange={e=>setFormDeu(f=>({...f,fecha_pago:e.target.value}))} /></div>
            </div>
            <div><label style={LS}>Estado</label>
              <select style={IS} value={formDeu.estado} onChange={e=>setFormDeu(f=>({...f,estado:e.target.value}))}>
                <option value="activa">Activa</option><option value="pagada">Pagada</option><option value="en mora">En mora</option>
              </select>
            </div>
            <button onClick={submitDeu} disabled={saving} style={{ padding:"11px", borderRadius:8, border:"none", background:saved==="deu"?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, opacity:saving?0.7:1 }}>
              {saved==="deu"?"✓ Guardado":"Agregar deuda"}
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:480, overflowY:"auto" }}>
            {fpDeudas.map(d=>{
              const avance = d.saldo_inicial>0?((d.saldo_inicial-d.saldo_actual)/d.saldo_inicial)*100:0;
              return (
                <div key={d.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
                  {confirmDeu===d.id ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>{onDeleteDeuda(d.id);setConfirmDeu(null);}} style={{ flex:1, padding:"7px", borderRadius:7, border:"none", background:"#e8614e", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>Eliminar</button>
                      <button onClick={()=>setConfirmDeu(null)} style={{ flex:1, padding:"7px", borderRadius:7, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:13 }}>Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <div><div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{d.nombre}</div><div style={{ fontSize:12, color:"#8892a4" }}>{d.entidad} {d.fecha_pago?`· Día ${d.fecha_pago}`:""}</div></div>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <span style={{ fontSize:11, padding:"3px 8px", borderRadius:20, background:d.estado==="pagada"?"#10b98122":"#e8614e22", color:d.estado==="pagada"?"#10b981":"#e8614e" }}>{d.estado}</span>
                          <button onClick={()=>setConfirmDeu(d.id)} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #e8614e22", background:"transparent", color:"#e8614e", cursor:"pointer", fontSize:12 }}>🗑</button>
                        </div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                        <div><div style={{ fontSize:11, color:"#8892a4" }}>SALDO</div><div style={{ fontSize:13, fontWeight:600, color:"#e8614e" }}>{fmt(d.saldo_actual)}</div></div>
                        <div><div style={{ fontSize:11, color:"#8892a4" }}>CUOTA</div><div style={{ fontSize:13, color:"#f0a030" }}>{fmt(d.cuota_mensual)}</div></div>
                      </div>
                      <ProgressBar value={d.saldo_inicial-d.saldo_actual} max={d.saldo_inicial||d.saldo_actual} color="#10b981" height={6} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── RESUMEN GENERAL ───────────────────────────────────────────────────────────
function ResumenGeneral({ atenciones, gastosSalon, nomina, deudasSalon, fpIngresos, fpGastos, fpDeudas }) {
  const mes = mesStr();
  const ingresosSalon = atenciones.filter(a=>a.fecha.startsWith(mes)).reduce((s,a)=>s+(a.total||0),0);
  const gastosSalonMes = gastosSalon.filter(g=>g.fecha.startsWith(mes)).reduce((s,g)=>s+(g.monto||0),0);
  const nominaMes = nomina.filter(n=>n.mes===mes).reduce((s,n)=>s+(n.sueldo_fijo||0),0);
  const utilidadSalon = ingresosSalon - gastosSalonMes - nominaMes;
  const deudaSalonTotal = deudasSalon.filter(d=>d.estado==="activa").reduce((s,d)=>s+(d.saldo_actual||0),0);

  const ingPersonal = fpIngresos.filter(i=>i.fecha.startsWith(mes)).reduce((s,i)=>s+(i.monto||0),0);
  const gasPersonal = fpGastos.filter(g=>g.fecha.startsWith(mes)).reduce((s,g)=>s+(g.monto||0),0);
  const balPersonal = ingPersonal - gasPersonal;
  const deudaPersonalTotal = fpDeudas.filter(d=>d.estado==="activa").reduce((s,d)=>s+(d.saldo_actual||0),0);

  const items = [
    { label:"Ingresos del salón", value:fmt(ingresosSalon), color:"#10b981", side:"salon" },
    { label:"Gastos operativos", value:fmt(gastosSalonMes), color:"#e8614e", side:"salon" },
    { label:"Nómina", value:fmt(nominaMes), color:"#f0a030", side:"salon" },
    { label:"Utilidad del salón", value:fmt(utilidadSalon), color:utilidadSalon>=0?"#10b981":"#e8614e", side:"salon", bold:true },
    { label:"Deuda total salón", value:fmt(deudaSalonTotal), color:"#e8614e", side:"salon" },
    { label:"Ingresos personales", value:fmt(ingPersonal), color:"#10b981", side:"personal" },
    { label:"Gastos personales", value:fmt(gasPersonal), color:"#e8614e", side:"personal" },
    { label:"Balance personal", value:fmt(balPersonal), color:balPersonal>=0?"#10b981":"#e8614e", side:"personal", bold:true },
    { label:"Deuda personal", value:fmt(deudaPersonalTotal), color:"#e8614e", side:"personal" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16, fontSize:13, color:"#8892a4" }}>
        💡 <strong style={{ color:"#e2e8f0" }}>Regla de oro:</strong> La utilidad del salón no es dinero del dueño. El dueño solo toca su sueldo registrado en nómina. Lo que queda es de la empresa.
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:15, color:"#5b8dee", fontWeight:600, marginBottom:16 }}>✂️ Salón Bertuchi</div>
          {items.filter(i=>i.side==="salon").map((item,idx)=>(
            <div key={idx} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #2a3042" }}>
              <span style={{ fontSize:13, color:"#8892a4" }}>{item.label}</span>
              <span style={{ fontSize:item.bold?16:14, fontWeight:item.bold?700:500, color:item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:15, color:"#a855f7", fontWeight:600, marginBottom:16 }}>👤 Finanzas personales</div>
          {items.filter(i=>i.side==="personal").map((item,idx)=>(
            <div key={idx} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #2a3042" }}>
              <span style={{ fontSize:13, color:"#8892a4" }}>{item.label}</span>
              <span style={{ fontSize:item.bold?16:14, fontWeight:item.bold?700:500, color:item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
// ── THEMES ────────────────────────────────────────────────────────────────────
const DARK_THEME = {
  bg:       "#080808",
  bgCard:   "#111111",
  bgInput:  "#1a1a1a",
  border:   "#2a2a2a",
  borderGold: "#C9A84C44",
  gold:     "#C9A84C",
  goldLight:"#E8C96A",
  goldDim:  "#C9A84C88",
  white:    "#F5F0E8",
  gray:     "#666660",
  grayMid:  "#999890",
  red:      "#E05C4B",
  green:    "#4CAF7D",
  radius:   14,
  radiusSm: 8,
};

const LIGHT_THEME = {
  bg:       "#F5F0E8",
  bgCard:   "#FFFFFF",
  bgInput:  "#EDE8DF",
  border:   "#D4C9B0",
  borderGold: "#C9A84C66",
  gold:     "#A67C35",
  goldLight:"#C9A84C",
  goldDim:  "#A67C3588",
  white:    "#1a1a1a",
  gray:     "#666055",
  grayMid:  "#888070",
  red:      "#C0392B",
  green:    "#27AE60",
  radius:   14,
  radiusSm: 8,
};

let G = DARK_THEME;

const IS = { background:G.bgInput, border:`1px solid ${G.border}`, borderRadius:G.radiusSm, color:G.white, padding:"12px 14px", fontSize:15, width:"100%", boxSizing:"border-box", outline:"none", fontFamily:"inherit" };
const LS = { fontSize:11, color:G.goldDim, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:8 };

// ── GOLD COMPONENTS ───────────────────────────────────────────────────────────
function GoldCard({ label, value, sub, icon, positive }) {
  return (
    <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:"16px 18px", display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, color:G.goldDim, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</span>
        {icon && <span style={{ fontSize:20 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:22, fontWeight:700, color: positive===false ? G.red : positive===true ? G.green : G.gold, letterSpacing:"-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:G.gray }}>{sub}</div>}
    </div>
  );
}

function GoldBtn({ children, onClick, disabled, variant="primary", full }) {
  const styles = {
    primary: { background:`linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, color:"#080808", border:"none" },
    ghost:   { background:"transparent", color:G.gold, border:`1px solid ${G.borderGold}` },
    danger:  { background:"transparent", color:G.red, border:`1px solid ${G.red}44` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...styles[variant], padding:"12px 20px", borderRadius:G.radiusSm, cursor:disabled?"not-allowed":"pointer", fontWeight:700, fontSize:14, width:full?"100%":"auto", opacity:disabled?0.5:1, fontFamily:"inherit", transition:"opacity 0.2s", letterSpacing:"0.02em" }}>
      {children}
    </button>
  );
}

function GoldProgressBar({ value, max, height=6 }) {
  const pct = Math.min((value/max)*100, 100);
  const over = value > max;
  return (
    <div style={{ background:"#1a1a1a", borderRadius:99, height, overflow:"hidden" }}>
      <div style={{ width:pct+"%", height:"100%", borderRadius:99, background: over ? G.red : `linear-gradient(90deg, ${G.gold}, ${G.goldLight})`, transition:"width 0.4s ease" }} />
    </div>
  );
}

function GoldSpinner() {
  return <div style={{ textAlign:"center", padding:60, color:G.goldDim, fontSize:14, letterSpacing:"0.1em" }}>CARGANDO...</div>;
}

function GoldDivider() {
  return <div style={{ height:1, background:`linear-gradient(90deg, transparent, ${G.borderGold}, transparent)`, margin:"4px 0" }} />;
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────────
function HomeScreen({ onNav, atenciones, gastosSalon, nomina, deudasSalon, isDark, onToggleTheme, modulosVisibles, usuarioNombre, usuarioRol, onLogout, onPortalCliente }) {
  const mes = mesStr();
  const hoy = hoyStr();
  const ingresosMes = atenciones.filter(a=>a.fecha.startsWith(mes)).reduce((s,a)=>s+(a.total||0),0);
  const gastosMes = gastosSalon.filter(g=>g.fecha.startsWith(mes)).reduce((s,g)=>s+(g.monto||0),0);
  const nominaMes = nomina.filter(n=>n.mes===mes).reduce((s,n)=>s+(n.sueldo_fijo||0),0);
  const utilidad = ingresosMes - gastosMes - nominaMes;
  const atenHoy = atenciones.filter(a=>a.fecha===hoy).length;
  const recaudadoHoy = atenciones.filter(a=>a.fecha===hoy).reduce((s,a)=>s+(a.total||0),0);

  const ROL_LABELS = { admin:"Administrador", recepcionista:"Recepcionista", estilista:"Estilista" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, paddingBottom:24 }}>
      {/* Header */}
      <div style={{ textAlign:"center", padding:"32px 20px 8px", position:"relative" }}>
        <button onClick={onToggleTheme} style={{ position:"absolute", top:32, right:20, background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:20, padding:"6px 14px", cursor:"pointer", fontSize:13, color:G.gold, fontFamily:"inherit", fontWeight:600 }}>
          {isDark ? "☀️ Claro" : "🌙 Oscuro"}
        </button>
        <div style={{ fontSize:11, color:G.goldDim, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:8 }}>Salón de Belleza</div>
        <div style={{ fontSize:32, fontWeight:800, color:G.gold, letterSpacing:"-0.02em", lineHeight:1 }}>BERTUCHI</div>
        <div style={{ fontSize:12, color:G.gray, marginTop:8, letterSpacing:"0.05em" }}>Sistema de gestión exclusivo</div>
      </div>

      {/* Usuario actual */}
      <div style={{ margin:"0 16px", background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:G.white }}>{usuarioNombre}</div>
          <div style={{ fontSize:12, color:G.goldDim }}>{ROL_LABELS[usuarioRol] || usuarioRol}</div>
        </div>
        <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${G.red}44`, borderRadius:G.radiusSm, padding:"6px 14px", cursor:"pointer", fontSize:12, color:G.red, fontFamily:"inherit" }}>
          Cerrar sesión
        </button>
      </div>

      <GoldDivider />

      {/* KPIs del día */}
      <div style={{ padding:"0 16px" }}>
        <div style={{ fontSize:11, color:G.goldDim, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>Resumen de hoy</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <GoldCard label="Atenciones hoy" value={atenHoy} icon="✂️" />
          <GoldCard label="Recaudado hoy" value={fmt(recaudadoHoy)} icon="💰" positive={true} />
        </div>
      </div>

      {/* KPIs del mes — solo admin */}
      {usuarioRol === "admin" && (
        <div style={{ padding:"0 16px" }}>
          <div style={{ fontSize:11, color:G.goldDim, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>Este mes</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <GoldCard label="Ingresos" value={fmt(ingresosMes)} icon="📈" positive={true} />
            <GoldCard label="Gastos" value={fmt(gastosMes + nominaMes)} icon="📉" positive={false} />
          </div>
          <div style={{ marginTop:10 }}>
            <GoldCard label="Utilidad del salón" value={fmt(utilidad)} icon="⭐" positive={utilidad >= 0} />
          </div>
        </div>
      )}

      <GoldDivider />

      {/* Portal cliente */}
      <div style={{ padding:"0 16px" }}>
        <div style={{ fontSize:11, color:G.goldDim, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>Portal cliente</div>
        <button onClick={onPortalCliente} style={{ display:"flex", alignItems:"center", gap:16, background:"#C9A84C22", border:`1px solid ${G.gold}`, borderRadius:G.radius, padding:"16px 18px", cursor:"pointer", textAlign:"left", width:"100%" }}>
          <span style={{ fontSize:26, width:36, textAlign:"center", flexShrink:0 }}>📅</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600, color:G.gold }}>Reservar cita</div>
            <div style={{ fontSize:12, color:G.gray, marginTop:2 }}>Portal para clientes del salón</div>
          </div>
          <span style={{ color:G.gold, fontSize:18 }}>›</span>
        </button>
      </div>

      <GoldDivider />

      {/* Módulos */}
      <div style={{ padding:"0 16px" }}>
        <div style={{ fontSize:11, color:G.goldDim, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>Módulos</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(modulosVisibles||[]).map(m=>(
            <button key={m.id} onClick={()=>onNav(m.id)} style={{ display:"flex", alignItems:"center", gap:16, background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:"16px 18px", cursor:"pointer", textAlign:"left", transition:"all 0.2s", width:"100%" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=G.gold; e.currentTarget.style.background=G.bgInput; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=G.borderGold; e.currentTarget.style.background=G.bgCard; }}>
              <span style={{ fontSize:26, width:36, textAlign:"center", flexShrink:0 }}>{m.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600, color:G.white, letterSpacing:"0.01em" }}>{m.label}</div>
                <div style={{ fontSize:12, color:G.gray, marginTop:2 }}>{m.sub}</div>
              </div>
              <span style={{ color:G.goldDim, fontSize:18 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── HEADER BAR ────────────────────────────────────────────────────────────────
function HeaderBar({ title, onBack, isDark, onToggleTheme }) {
  return (
    <div style={{ position:"sticky", top:0, zIndex:100, background:G.bg, borderBottom:`1px solid ${G.borderGold}`, padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
      {onBack && (
        <button onClick={onBack} style={{ background:"transparent", border:`1px solid ${G.borderGold}`, borderRadius:G.radiusSm, color:G.gold, padding:"6px 12px", cursor:"pointer", fontSize:18, lineHeight:1, fontFamily:"inherit" }}>‹</button>
      )}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11, color:G.goldDim, letterSpacing:"0.15em", textTransform:"uppercase" }}>Bertuchi</div>
        <div style={{ fontSize:18, fontWeight:700, color:G.white, lineHeight:1.2 }}>{title}</div>
      </div>
      <button onClick={onToggleTheme} style={{ background:"transparent", border:`1px solid ${G.borderGold}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontSize:12, color:G.gold, fontFamily:"inherit", fontWeight:600, flexShrink:0 }}>
        {isDark ? "☀️" : "🌙"}
      </button>
    </div>
  );
}

// ── RESTYLED ESTILISTAS ───────────────────────────────────────────────────────
function EstilistasView({ estilistas, loading, onAdd, onDelete, onUpdate, soloLectura }) {
  const empty = { nombre:"", telefono:"", especialidad:"", porcentajeBase:50, activo:true };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const submit = async () => {
    if (!form.nombre.trim() || saving) return;
    setSaving(true);
    if (editId) { await onUpdate({ ...form, id: editId }); setEditId(null); }
    else await onAdd({ ...form, id:"e"+Date.now(), nombre:form.nombre.trim(), color: COLORES_ESTILISTA[estilistas.length % COLORES_ESTILISTA.length] });
    setForm(empty); setSaving(false); setSaved(true); setShowForm(false);
    setTimeout(()=>setSaved(false), 2000);
  };

  return (
    <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:16, paddingBottom:40 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        <GoldCard label="Activos" value={estilistas.filter(e=>e.activo).length} icon="💇" />
        <GoldCard label="% Promedio" value={estilistas.length ? Math.round(estilistas.reduce((s,e)=>s+e.porcentajeBase,0)/estilistas.length)+"%" : "—"} icon="%" />
        <GoldCard label="Total" value={estilistas.length} icon="👥" />
      </div>

      {!soloLectura && <GoldBtn onClick={()=>setShowForm(!showForm)} full>{showForm?"Cerrar formulario":"+ Nuevo estilista"}</GoldBtn>}

      {showForm && (
        <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:14, color:G.gold, fontWeight:600, letterSpacing:"0.05em" }}>{editId?"EDITAR ESTILISTA":"NUEVO ESTILISTA"}</div>
          <div><label style={LS}>Nombre *</label><input style={IS} placeholder="Nombre completo" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
          <div><label style={LS}>Teléfono</label><input style={IS} placeholder="3001234567" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} /></div>
          <div><label style={LS}>Especialidad</label><input style={IS} placeholder="Colorista, manicurista..." value={form.especialidad} onChange={e=>setForm(f=>({...f,especialidad:e.target.value}))} /></div>
          <div>
            <label style={LS}>Porcentaje: <span style={{ color:G.gold, fontWeight:700 }}>{form.porcentajeBase}%</span></label>
            <input type="range" min="10" max="90" step="5" value={form.porcentajeBase} onChange={e=>setForm(f=>({...f,porcentajeBase:parseInt(e.target.value,10)}))} style={{ width:"100%", accentColor:G.gold, cursor:"pointer", marginBottom:8 }} />
            <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:8 }}>
              <div style={{ width:form.porcentajeBase+"%", background:G.gold, transition:"width 0.2s" }} />
              <div style={{ flex:1, background:G.green }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:G.gray, marginTop:4 }}>
              <span style={{ color:G.gold }}>Estilista {form.porcentajeBase}%</span>
              <span style={{ color:G.green }}>Salón {100-form.porcentajeBase}%</span>
            </div>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:G.white }}>
            <input type="checkbox" checked={form.activo} onChange={e=>setForm(f=>({...f,activo:e.target.checked}))} style={{ accentColor:G.gold, width:18, height:18 }} />
            Estilista activo
          </label>
          <div style={{ display:"flex", gap:10 }}>
            <GoldBtn onClick={submit} disabled={saving} full>{saving?"Guardando...":saved?"✓ Guardado":editId?"Guardar cambios":"Agregar"}</GoldBtn>
            {editId && <GoldBtn variant="ghost" onClick={()=>{setEditId(null);setForm(empty);setShowForm(false);}}>Cancelar</GoldBtn>}
          </div>
        </div>
      )}

      {loading && <GoldSpinner />}
      {!loading && estilistas.length===0 && (
        <div style={{ textAlign:"center", padding:40, color:G.gray, fontSize:14 }}>Sin estilistas registrados.</div>
      )}
      {estilistas.map(e=>(
        <div key={e.id} style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:16 }}>
          {confirm===e.id ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:13, color:G.red }}>¿Eliminar a <strong>{e.nombre}</strong>?</div>
              <div style={{ display:"flex", gap:8 }}>
                <GoldBtn variant="danger" onClick={()=>{onDelete(e.id);setConfirm(null);}} full>Sí, eliminar</GoldBtn>
                <GoldBtn variant="ghost" onClick={()=>setConfirm(null)} full>Cancelar</GoldBtn>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:e.color+"22", border:`2px solid ${e.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:e.color }}>{e.nombre.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:e.activo?G.white:G.gray }}>{e.nombre}</div>
                    {e.especialidad && <div style={{ fontSize:12, color:G.gray }}>{e.especialidad}</div>}
                    {e.telefono && <div style={{ fontSize:12, color:G.gray }}>📱 {e.telefono}</div>}
                    {!e.activo && <div style={{ fontSize:11, color:"#f0a030", marginTop:4 }}>Inactivo</div>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {!soloLectura && <GoldBtn variant="ghost" onClick={()=>{setEditId(e.id);setForm({nombre:e.nombre,telefono:e.telefono||"",especialidad:e.especialidad||"",porcentajeBase:e.porcentajeBase,activo:e.activo});setShowForm(true);}}>✏️</GoldBtn>}
                  {!soloLectura && <GoldBtn variant="danger" onClick={()=>setConfirm(e.id)}>🗑</GoldBtn>}
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:G.gray, marginBottom:6 }}>
                <span style={{ color:G.gold }}>Estilista {e.porcentajeBase}%</span>
                <span style={{ color:G.green }}>Salón {100-e.porcentajeBase}%</span>
              </div>
              <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:6 }}>
                <div style={{ width:e.porcentajeBase+"%", background:G.gold }} />
                <div style={{ flex:1, background:G.green }} />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── RESTYLED ATENCIONES ───────────────────────────────────────────────────────
function AtencionesView({ atenciones, loading, onAdd, onDelete, estilistas }) {
  const hoy = hoyStr();
  const empty = { fecha:hoy, cliente:"", estilistaId:"", servicios:[], otroServicio:"", subtotal:"", descuento:"0", metodoPago:"Efectivo", nota:"" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [tab, setTab] = useState("registrar");

  const total = Math.max(0, parseInt(form.subtotal||0,10) - parseInt(form.descuento||0,10));
  const estSel = estilistas.find(e=>e.id===form.estilistaId);
  const comision = estSel ? Math.round(total*estSel.porcentajeBase/100) : 0;
  const salon = total - comision;

  const toggle = (s) => setForm(f=>({ ...f, servicios:f.servicios.includes(s)?f.servicios.filter(x=>x!==s):[...f.servicios,s] }));

  const submit = async () => {
    if (!form.cliente||!form.subtotal||form.servicios.length===0||saving) return;
    setSaving(true);
    const svcs = form.otroServicio ? [...form.servicios, form.otroServicio] : form.servicios;
    const est = estilistas.find(e=>e.id===form.estilistaId);
    const tot = Math.max(0, parseInt(form.subtotal,10)-parseInt(form.descuento||0,10));
    await onAdd({
      id:"a"+Date.now(), fecha:form.fecha, cliente:form.cliente.trim(),
      estilista_id:form.estilistaId, estilista:est?est.nombre:"", estilista_color:est?est.color:G.gray,
      porcentaje_estilista:est?est.porcentajeBase:0, servicios:svcs,
      subtotal:parseInt(form.subtotal,10), descuento:parseInt(form.descuento||0,10), total:tot,
      comision_estilista:est?Math.round(tot*est.porcentajeBase/100):0,
      ganancia_salon:est?tot-Math.round(tot*est.porcentajeBase/100):tot,
      metodo_pago:form.metodoPago, nota:form.nota.trim(), numero:atenciones.length+1,
    });
    setForm(empty); setSaving(false); setSaved(true); setTab("historial");
    setTimeout(()=>setSaved(false),2000);
  };

  const filtradas = atenciones.filter(a=>{
    const b=busqueda.toLowerCase();
    return (b===""||a.cliente.toLowerCase().includes(b)||(a.estilista||"").toLowerCase().includes(b)||(a.servicios||[]).some(s=>s.toLowerCase().includes(b))) && (filtroFecha===""||a.fecha===filtroFecha);
  });

  const totalHoy = atenciones.filter(a=>a.fecha===hoy).reduce((s,a)=>s+(a.total||0),0);
  const totalMes = atenciones.filter(a=>a.fecha.startsWith(mesStr())).reduce((s,a)=>s+(a.total||0),0);
  const salonMes = atenciones.filter(a=>a.fecha.startsWith(mesStr())).reduce((s,a)=>s+(a.ganancia_salon||a.total||0),0);

  if (detalle) {
    const a = detalle;
    return (
      <div style={{ padding:16, paddingBottom:40 }}>
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          <GoldBtn variant="ghost" onClick={()=>setDetalle(null)}>‹ Volver</GoldBtn>
          <GoldBtn variant="danger" onClick={()=>{ if(window.confirm("¿Eliminar esta atención?")){ onDelete(a.id); setDetalle(null); } }}>🗑 Eliminar</GoldBtn>
        </div>
        <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:24, display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", borderBottom:`1px solid ${G.border}`, paddingBottom:16 }}>
            <div>
              <div style={{ fontSize:10, color:G.goldDim, letterSpacing:"0.15em", textTransform:"uppercase" }}>Remisión de atención</div>
              <div style={{ fontSize:24, fontWeight:800, color:G.gold, marginTop:4 }}>BERTUCHI</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, color:G.gray }}>N° {String(a.numero).padStart(4,"0")}</div>
              <div style={{ fontSize:12, color:G.gray }}>{a.fecha}</div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ background:G.bgInput, borderRadius:G.radiusSm, padding:"12px 14px" }}>
              <div style={{ fontSize:10, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Cliente</div>
              <div style={{ fontSize:15, fontWeight:600, color:G.white }}>{a.cliente}</div>
            </div>
            {a.estilista && (
              <div style={{ background:G.bgInput, borderRadius:G.radiusSm, padding:"12px 14px" }}>
                <div style={{ fontSize:10, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Estilista</div>
                <div style={{ fontSize:15, fontWeight:600, color:G.white }}>{a.estilista}</div>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize:10, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Servicios</div>
            {(a.servicios||[]).map((s,i)=>(
              <div key={i} style={{ padding:"10px 14px", background:G.bgInput, borderRadius:G.radiusSm, marginBottom:6, fontSize:14, color:G.white, borderLeft:`3px solid ${G.gold}` }}>✂ {s}</div>
            ))}
          </div>
          <div style={{ background:G.bgInput, borderRadius:G.radiusSm, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:13, color:G.gray }}>Subtotal</span>
              <span style={{ fontSize:13, color:G.white }}>{fmt(a.subtotal)}</span>
            </div>
            {(a.descuento||0)>0 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, color:G.green }}>Descuento</span>
                <span style={{ fontSize:13, color:G.green }}>− {fmt(a.descuento)}</span>
              </div>
            )}
            <GoldDivider />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
              <span style={{ fontSize:16, fontWeight:700, color:G.white }}>TOTAL</span>
              <span style={{ fontSize:20, fontWeight:800, color:G.gold }}>{fmt(a.total)}</span>
            </div>
            <div style={{ marginTop:8, fontSize:12, color:G.gray }}>Pago: <span style={{ color:G.goldLight }}>{a.metodo_pago}</span></div>
          </div>
          {a.estilista && (a.porcentaje_estilista||0)>0 && (
            <div style={{ background:G.bgInput, borderRadius:G.radiusSm, padding:16 }}>
              <div style={{ fontSize:10, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Distribución</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, color:G.white }}>💇 {a.estilista} ({a.porcentaje_estilista}%)</span>
                <span style={{ fontSize:13, fontWeight:600, color:G.gold }}>{fmt(a.comision_estilista)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:13, color:G.white }}>✂️ Salón ({100-a.porcentaje_estilista}%)</span>
                <span style={{ fontSize:13, fontWeight:600, color:G.green }}>{fmt(a.ganancia_salon)}</span>
              </div>
              <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:6 }}>
                <div style={{ width:a.porcentaje_estilista+"%", background:G.gold }} />
                <div style={{ flex:1, background:G.green }} />
              </div>
            </div>
          )}
          {a.nota && <div style={{ fontSize:13, color:G.gray, fontStyle:"italic", borderTop:`1px solid ${G.border}`, paddingTop:12 }}>Nota: {a.nota}</div>}
          <div style={{ fontSize:11, color:G.gray, textAlign:"center", borderTop:`1px solid ${G.border}`, paddingTop:12, letterSpacing:"0.05em" }}>GRACIAS POR TU VISITA · {new Date().toLocaleDateString("es-CO")}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", paddingBottom:40 }}>
      {/* KPIs */}
      <div style={{ padding:"16px 16px 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <GoldCard label="Hoy" value={fmt(totalHoy)} icon="💅" positive={true} />
          <GoldCard label="Este mes" value={fmt(totalMes)} icon="📅" positive={true} />
        </div>
        <GoldCard label="Para el salón este mes" value={fmt(salonMes)} icon="✂️" positive={true} />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, padding:"16px 16px 0", borderBottom:`1px solid ${G.border}` }}>
        {["registrar","historial"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"12px", background:"transparent", border:"none", borderBottom: tab===t?`2px solid ${G.gold}`:"2px solid transparent", color: tab===t?G.gold:G.gray, cursor:"pointer", fontSize:13, fontWeight:tab===t?700:400, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"inherit", transition:"all 0.2s" }}>
            {t==="registrar"?"Registrar":"Historial"}
          </button>
        ))}
      </div>

      {tab==="registrar" && (
        <div style={{ padding:16, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Fecha</label><input type="date" style={IS} value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} /></div>
            <div><label style={LS}>Método de pago</label>
              <select style={IS} value={form.metodoPago} onChange={e=>setForm(f=>({...f,metodoPago:e.target.value}))}>
                {METODOS_PAGO.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div><label style={LS}>Cliente *</label><input style={IS} placeholder="Nombre del cliente" value={form.cliente} onChange={e=>setForm(f=>({...f,cliente:e.target.value}))} /></div>
          <div>
            <label style={LS}>Estilista</label>
            {estilistas.filter(e=>e.activo).length===0 ? (
              <div style={{ fontSize:13, color:"#f0a030", padding:"12px 14px", background:G.bgInput, borderRadius:G.radiusSm, border:`1px solid #f0a03044` }}>⚠️ Agrega estilistas primero.</div>
            ) : (
              <select style={IS} value={form.estilistaId} onChange={e=>setForm(f=>({...f,estilistaId:e.target.value}))}>
                <option value="">— Sin asignar —</option>
                {estilistas.filter(e=>e.activo).map(e=><option key={e.id} value={e.id}>{e.nombre} · {e.porcentajeBase}%</option>)}
              </select>
            )}
          </div>
          <div>
            <label style={LS}>Servicios *</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {SERVICIOS_DEFAULT.map(s=>(
                <button key={s} onClick={()=>toggle(s)} style={{ fontSize:12, padding:"7px 12px", borderRadius:20, cursor:"pointer", border: form.servicios.includes(s)?`1px solid ${G.gold}`:`1px solid ${G.border}`, background: form.servicios.includes(s)?"#C9A84C22":G.bgInput, color: form.servicios.includes(s)?G.gold:G.gray, fontFamily:"inherit" }}>{s}</button>
              ))}
            </div>
            <input style={{...IS, marginTop:10}} placeholder="Otro servicio" value={form.otroServicio} onChange={e=>setForm(f=>({...f,otroServicio:e.target.value}))} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Valor (COP) *</label><input type="number" style={IS} placeholder="80000" value={form.subtotal} onChange={e=>setForm(f=>({...f,subtotal:e.target.value}))} /></div>
            <div><label style={LS}>Descuento</label><input type="number" style={IS} placeholder="0" value={form.descuento} onChange={e=>setForm(f=>({...f,descuento:e.target.value}))} /></div>
          </div>
          {form.subtotal && (
            <div style={{ background:G.bgInput, borderRadius:G.radiusSm, padding:"14px 16px", border:`1px solid ${G.borderGold}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom: estSel?8:0 }}>
                <span style={{ fontSize:14, color:G.gray }}>Total</span>
                <span style={{ fontSize:20, fontWeight:800, color:G.gold }}>{fmt(total)}</span>
              </div>
              {estSel && (
                <>
                  <GoldDivider />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, marginBottom:4 }}>
                    <span style={{ fontSize:12, color:G.gray }}>💇 {estSel.nombre}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:G.gold }}>{fmt(comision)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:12, color:G.gray }}>✂️ Salón</span>
                    <span style={{ fontSize:12, fontWeight:600, color:G.green }}>{fmt(salon)}</span>
                  </div>
                  <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:5 }}>
                    <div style={{ width:estSel.porcentajeBase+"%", background:G.gold }} />
                    <div style={{ flex:1, background:G.green }} />
                  </div>
                </>
              )}
            </div>
          )}
          <div><label style={LS}>Nota</label><input style={IS} placeholder="Próxima cita, observaciones..." value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))} /></div>
          <GoldBtn onClick={submit} disabled={saving} full>{saving?"Guardando...":saved?"✓ Guardada":"Registrar atención"}</GoldBtn>
        </div>
      )}

      {tab==="historial" && (
        <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
          <input style={IS} placeholder="🔍 Buscar cliente, estilista o servicio..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          <input type="date" style={IS} value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)} />
          {loading && <GoldSpinner />}
          {!loading && filtradas.length===0 && <div style={{ textAlign:"center", padding:40, color:G.gray, fontSize:14 }}>{atenciones.length===0?"Sin atenciones registradas.":"Sin resultados."}</div>}
          {filtradas.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(a=>(
            <div key={a.id} onClick={()=>setDetalle(a)} style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:"14px 16px", cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:G.white }}>{a.cliente}</div>
                  <div style={{ fontSize:12, color:G.gray, marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
                    {a.fecha}
                    {a.estilista && <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>· <span style={{ width:8, height:8, borderRadius:"50%", background:a.estilista_color||G.gray, display:"inline-block" }} /><span style={{ color:a.estilista_color||G.gray }}>{a.estilista}</span></span>}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
                    {(a.servicios||[]).slice(0,3).map((s,i)=><span key={i} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"#C9A84C22", color:G.gold, border:`1px solid ${G.borderGold}` }}>{s}</span>)}
                    {(a.servicios||[]).length>3 && <span style={{ fontSize:11, color:G.gray }}>+{a.servicios.length-3} más</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right", marginLeft:12 }}>
                  <div style={{ fontSize:18, fontWeight:800, color:G.gold }}>{fmt(a.total)}</div>
                  {a.estilista && (a.porcentaje_estilista||0)>0 && <div style={{ fontSize:11, color:G.gray, marginTop:2 }}>Salón: <span style={{ color:G.green }}>{fmt(a.ganancia_salon)}</span></div>}
                  <div style={{ fontSize:11, color:G.gray }}>{a.metodo_pago}</div>
                  <div style={{ fontSize:11, color:G.gold, marginTop:4 }}>Ver remisión ›</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RESTYLED GASTOS SALON ─────────────────────────────────────────────────────
function GastosSalonView({ gastosSalon, loading, onAdd, onDelete }) {
  const hoy = hoyStr(); const mes = mesStr();
  const empty = { fecha:hoy, categoria:"Arriendo", descripcion:"", monto:"", es_recurrente:false };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const submit = async () => {
    if (!form.descripcion||!form.monto||saving) return;
    setSaving(true);
    await onAdd({ id:"gs"+Date.now(), ...form, monto:parseInt(form.monto,10) });
    setForm(empty); setSaving(false); setSaved(true); setShowForm(false);
    setTimeout(()=>setSaved(false),2000);
  };
  const delMes = gastosSalon.filter(g=>g.fecha.startsWith(mes));
  const totalMes = delMes.reduce((s,g)=>s+g.monto,0);
  const fijos = delMes.filter(g=>g.es_recurrente).reduce((s,g)=>s+g.monto,0);
  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16, paddingBottom:40 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <GoldCard label="Total mes" value={fmt(totalMes)} icon="💸" positive={false} />
        <GoldCard label="Gastos fijos" value={fmt(fijos)} icon="🔁" />
      </div>
      <GoldBtn onClick={()=>setShowForm(!showForm)} full>{showForm?"Cerrar":"+ Registrar gasto"}</GoldBtn>
      {showForm && (
        <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Fecha</label><input type="date" style={IS} value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} /></div>
            <div><label style={LS}>Categoría</label><select style={IS} value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>{CATS_GASTO_SALON.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div><label style={LS}>Descripción *</label><input style={IS} placeholder="Ej: Arriendo mayo" value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} /></div>
          <div><label style={LS}>Monto (COP) *</label><input type="number" style={IS} placeholder="500000" value={form.monto} onChange={e=>setForm(f=>({...f,monto:e.target.value}))} /></div>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:G.white }}>
            <input type="checkbox" checked={form.es_recurrente} onChange={e=>setForm(f=>({...f,es_recurrente:e.target.checked}))} style={{ accentColor:G.gold, width:18, height:18 }} />
            🔁 Gasto fijo / recurrente
          </label>
          <GoldBtn onClick={submit} disabled={saving} full>{saving?"Guardando...":saved?"✓ Guardado":"Registrar gasto"}</GoldBtn>
        </div>
      )}
      {loading && <GoldSpinner />}
      {delMes.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(g=>(
        <div key={g.id} style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:"14px 16px" }}>
          {confirm===g.id ? (
            <div style={{ display:"flex", gap:8 }}>
              <GoldBtn variant="danger" onClick={()=>{onDelete(g.id);setConfirm(null);}} full>Eliminar</GoldBtn>
              <GoldBtn variant="ghost" onClick={()=>setConfirm(null)} full>Cancelar</GoldBtn>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div><div style={{ fontSize:14, fontWeight:600, color:G.white }}>{g.descripcion}</div><div style={{ fontSize:12, color:G.gray, marginTop:2 }}>{g.fecha} · {g.categoria}{g.es_recurrente?" · 🔁":""}</div></div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:16, fontWeight:700, color:G.red }}>{fmt(g.monto)}</span>
                <GoldBtn variant="danger" onClick={()=>setConfirm(g.id)}>🗑</GoldBtn>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── RESTYLED DEUDAS SALON ─────────────────────────────────────────────────────
function DeudasSalonView({ deudasSalon, loading, onAdd, onDelete, onUpdate }) {
  const empty = { nombre:"", entidad:"", saldo_inicial:"", saldo_actual:"", cuota_mensual:"", tasa_interes:"", fecha_pago:"", estado:"activa" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const submit = async () => {
    if (!form.nombre||!form.saldo_actual||saving) return;
    setSaving(true);
    const data = { ...form, saldo_inicial:parseInt(form.saldo_inicial||form.saldo_actual,10), saldo_actual:parseInt(form.saldo_actual,10), cuota_mensual:parseInt(form.cuota_mensual||0,10), tasa_interes:parseFloat(form.tasa_interes||0) };
    if (editId) { await onUpdate({...data,id:editId}); setEditId(null); } else await onAdd({ id:"ds"+Date.now(), ...data });
    setForm(empty); setSaving(false); setSaved(true); setShowForm(false);
    setTimeout(()=>setSaved(false),2000);
  };
  const totalDeuda = deudasSalon.filter(d=>d.estado==="activa").reduce((s,d)=>s+d.saldo_actual,0);
  const cuotasTotal = deudasSalon.filter(d=>d.estado==="activa").reduce((s,d)=>s+d.cuota_mensual,0);
  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16, paddingBottom:40 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <GoldCard label="Deuda total" value={fmt(totalDeuda)} icon="🔗" positive={false} />
        <GoldCard label="Cuota mensual" value={fmt(cuotasTotal)} icon="📆" />
      </div>
      <GoldBtn onClick={()=>setShowForm(!showForm)} full>{showForm?"Cerrar":"+ Agregar deuda"}</GoldBtn>
      {showForm && (
        <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
          <div><label style={LS}>Nombre *</label><input style={IS} placeholder="Préstamo, proveedor..." value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
          <div><label style={LS}>Entidad</label><input style={IS} placeholder="Bancolombia, proveedor X" value={form.entidad} onChange={e=>setForm(f=>({...f,entidad:e.target.value}))} /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Saldo inicial</label><input type="number" style={IS} placeholder="5000000" value={form.saldo_inicial} onChange={e=>setForm(f=>({...f,saldo_inicial:e.target.value}))} /></div>
            <div><label style={LS}>Saldo actual *</label><input type="number" style={IS} placeholder="3500000" value={form.saldo_actual} onChange={e=>setForm(f=>({...f,saldo_actual:e.target.value}))} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Cuota mensual</label><input type="number" style={IS} placeholder="350000" value={form.cuota_mensual} onChange={e=>setForm(f=>({...f,cuota_mensual:e.target.value}))} /></div>
            <div><label style={LS}>Tasa interés %</label><input type="number" style={IS} placeholder="1.5" value={form.tasa_interes} onChange={e=>setForm(f=>({...f,tasa_interes:e.target.value}))} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Día de pago</label><input type="number" style={IS} placeholder="15" value={form.fecha_pago} onChange={e=>setForm(f=>({...f,fecha_pago:e.target.value}))} /></div>
            <div><label style={LS}>Estado</label><select style={IS} value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))}><option value="activa">Activa</option><option value="pagada">Pagada</option><option value="en mora">En mora</option></select></div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <GoldBtn onClick={submit} disabled={saving} full>{saving?"Guardando...":saved?"✓ Guardado":editId?"Guardar":"Agregar deuda"}</GoldBtn>
            {editId && <GoldBtn variant="ghost" onClick={()=>{setEditId(null);setForm(empty);setShowForm(false);}}>Cancelar</GoldBtn>}
          </div>
        </div>
      )}
      {loading && <GoldSpinner />}
      {deudasSalon.map(d=>{
        const avance = d.saldo_inicial>0?((d.saldo_inicial-d.saldo_actual)/d.saldo_inicial)*100:0;
        return (
          <div key={d.id} style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:16 }}>
            {confirm===d.id ? (
              <div style={{ display:"flex", gap:8 }}>
                <GoldBtn variant="danger" onClick={()=>{onDelete(d.id);setConfirm(null);}} full>Eliminar</GoldBtn>
                <GoldBtn variant="ghost" onClick={()=>setConfirm(null)} full>Cancelar</GoldBtn>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:G.white }}>{d.nombre}</div>
                    <div style={{ fontSize:12, color:G.gray }}>{d.entidad}{d.fecha_pago?` · Día ${d.fecha_pago}`:""}</div>
                    <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:d.estado==="pagada"?G.green+"22":d.estado==="en mora"?G.red+"22":"#f0a03022", color:d.estado==="pagada"?G.green:d.estado==="en mora"?G.red:"#f0a030", marginTop:6, display:"inline-block" }}>{d.estado}</span>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                    <GoldBtn variant="ghost" onClick={()=>{setEditId(d.id);setForm({nombre:d.nombre,entidad:d.entidad||"",saldo_inicial:d.saldo_inicial,saldo_actual:d.saldo_actual,cuota_mensual:d.cuota_mensual,tasa_interes:d.tasa_interes,fecha_pago:d.fecha_pago,estado:d.estado});setShowForm(true);}}>✏️</GoldBtn>
                    <GoldBtn variant="danger" onClick={()=>setConfirm(d.id)}>🗑</GoldBtn>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
                  <div><div style={{ fontSize:10, color:G.goldDim, textTransform:"uppercase" }}>Saldo</div><div style={{ fontSize:14, fontWeight:700, color:G.red }}>{fmt(d.saldo_actual)}</div></div>
                  <div><div style={{ fontSize:10, color:G.goldDim, textTransform:"uppercase" }}>Cuota</div><div style={{ fontSize:14, color:G.white }}>{fmt(d.cuota_mensual)}</div></div>
                  <div><div style={{ fontSize:10, color:G.goldDim, textTransform:"uppercase" }}>Avance</div><div style={{ fontSize:14, color:G.green }}>{avance.toFixed(0)}%</div></div>
                </div>
                <GoldProgressBar value={d.saldo_inicial-d.saldo_actual} max={d.saldo_inicial||d.saldo_actual} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── RESTYLED NOMINA ───────────────────────────────────────────────────────────
function NominaView({ nomina, loading, onAdd, onDelete, onUpdate }) {
  const mes = mesStr();
  const empty = { nombre:"", cargo:"", sueldo_fijo:"", fecha_pago:"", estado:"pendiente", es_dueno:false, mes };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const submit = async () => {
    if (!form.nombre||!form.sueldo_fijo||saving) return;
    setSaving(true);
    await onAdd({ id:"nm"+Date.now(), ...form, sueldo_fijo:parseInt(form.sueldo_fijo,10) });
    setForm(empty); setSaving(false); setSaved(true); setShowForm(false);
    setTimeout(()=>setSaved(false),2000);
  };
  const delMes = nomina.filter(n=>n.mes===mes);
  const totalNomina = delMes.reduce((s,n)=>s+(n.sueldo_fijo||0),0);
  const pendientes = delMes.filter(n=>n.estado==="pendiente").length;
  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16, paddingBottom:40 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <GoldCard label="Nómina del mes" value={fmt(totalNomina)} icon="💼" positive={false} />
        <GoldCard label="Pagos pendientes" value={pendientes} icon="⏳" positive={pendientes===0} />
      </div>
      <GoldBtn onClick={()=>setShowForm(!showForm)} full>{showForm?"Cerrar":"+ Agregar a nómina"}</GoldBtn>
      {showForm && (
        <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
          <div><label style={LS}>Nombre *</label><input style={IS} placeholder="Nombre del empleado" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
          <div><label style={LS}>Cargo</label><input style={IS} placeholder="Estilista, recepcionista, dueño..." value={form.cargo} onChange={e=>setForm(f=>({...f,cargo:e.target.value}))} /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Sueldo fijo *</label><input type="number" style={IS} placeholder="1500000" value={form.sueldo_fijo} onChange={e=>setForm(f=>({...f,sueldo_fijo:e.target.value}))} /></div>
            <div><label style={LS}>Día de pago</label><input type="number" style={IS} placeholder="30" value={form.fecha_pago} onChange={e=>setForm(f=>({...f,fecha_pago:e.target.value}))} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={LS}>Estado</label><select style={IS} value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))}><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option></select></div>
            <div><label style={LS}>Mes</label><input style={IS} value={form.mes} onChange={e=>setForm(f=>({...f,mes:e.target.value}))} /></div>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:G.white }}>
            <input type="checkbox" checked={form.es_dueno} onChange={e=>setForm(f=>({...f,es_dueno:e.target.checked}))} style={{ accentColor:G.gold, width:18, height:18 }} />
            👑 Es el dueño
          </label>
          <GoldBtn onClick={submit} disabled={saving} full>{saving?"Guardando...":saved?"✓ Guardado":"Agregar"}</GoldBtn>
        </div>
      )}
      {loading && <GoldSpinner />}
      {delMes.map(n=>(
        <div key={n.id} style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:16 }}>
          {confirm===n.id ? (
            <div style={{ display:"flex", gap:8 }}>
              <GoldBtn variant="danger" onClick={()=>{onDelete(n.id);setConfirm(null);}} full>Eliminar</GoldBtn>
              <GoldBtn variant="ghost" onClick={()=>setConfirm(null)} full>Cancelar</GoldBtn>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:G.white }}>{n.nombre}</div>
                  {n.es_dueno && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#C9A84C22", color:G.gold }}>👑 Dueño</span>}
                </div>
                <div style={{ fontSize:12, color:G.gray, marginTop:2 }}>{n.cargo}{n.fecha_pago?` · Día ${n.fecha_pago}`:""}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:16, fontWeight:700, color:G.gold }}>{fmt(n.sueldo_fijo)}</div>
                  <button onClick={()=>onUpdate({...n,estado:n.estado==="pagado"?"pendiente":"pagado"})} style={{ fontSize:11, padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer", background:n.estado==="pagado"?G.green+"22":"#f0a03022", color:n.estado==="pagado"?G.green:"#f0a030", marginTop:4, fontFamily:"inherit" }}>
                    {n.estado==="pagado"?"✓ Pagado":"⏳ Pendiente"}
                  </button>
                </div>
                <GoldBtn variant="danger" onClick={()=>setConfirm(n.id)}>🗑</GoldBtn>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── RESTYLED FINANZAS PERSONALES ──────────────────────────────────────────────
function FinanzasPersonalesView({ fpIngresos, fpGastos, fpDeudas, loading, onAddIngreso, onAddGasto, onAddDeuda, onDeleteIngreso, onDeleteGasto, onDeleteDeuda, onUpdateDeuda }) {
  const mes = mesStr(); const hoy = hoyStr();
  const [tab, setTab] = useState("resumen");
  const emptyIng = { fecha:hoy, categoria:"Sueldo del salón", descripcion:"", monto:"" };
  const emptyGas = { fecha:hoy, categoria:"Vivienda", descripcion:"", monto:"" };
  const emptyDeu = { nombre:"", entidad:"", saldo_inicial:"", saldo_actual:"", cuota_mensual:"", fecha_pago:"", estado:"activa" };
  const [formIng, setFormIng] = useState(emptyIng);
  const [formGas, setFormGas] = useState(emptyGas);
  const [formDeu, setFormDeu] = useState(emptyDeu);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeu, setConfirmDeu] = useState(null);

  const ingMes = fpIngresos.filter(i=>i.fecha.startsWith(mes)).reduce((s,i)=>s+(i.monto||0),0);
  const gasMes = fpGastos.filter(g=>g.fecha.startsWith(mes)).reduce((s,g)=>s+(g.monto||0),0);
  const balMes = ingMes - gasMes;
  const totalDeudas = fpDeudas.filter(d=>d.estado==="activa").reduce((s,d)=>s+(d.saldo_actual||0),0);
  const cuotasDeudas = fpDeudas.filter(d=>d.estado==="activa").reduce((s,d)=>s+(d.cuota_mensual||0),0);
  const nivelEnd = ingMes>0?(cuotasDeudas/ingMes)*100:0;

  const submitIng = async () => { if(!formIng.descripcion||!formIng.monto||saving) return; setSaving(true); await onAddIngreso({id:"fpi"+Date.now(),...formIng,monto:parseInt(formIng.monto,10)}); setFormIng(emptyIng); setSaving(false); setSaved("ing"); setShowForm(false); setTimeout(()=>setSaved(false),2000); };
  const submitGas = async () => { if(!formGas.descripcion||!formGas.monto||saving) return; setSaving(true); await onAddGasto({id:"fpg"+Date.now(),...formGas,monto:parseInt(formGas.monto,10)}); setFormGas(emptyGas); setSaving(false); setSaved("gas"); setShowForm(false); setTimeout(()=>setSaved(false),2000); };
  const submitDeu = async () => { if(!formDeu.nombre||!formDeu.saldo_actual||saving) return; setSaving(true); await onAddDeuda({id:"fpd"+Date.now(),...formDeu,saldo_inicial:parseInt(formDeu.saldo_inicial||formDeu.saldo_actual,10),saldo_actual:parseInt(formDeu.saldo_actual,10),cuota_mensual:parseInt(formDeu.cuota_mensual||0,10)}); setFormDeu(emptyDeu); setSaving(false); setSaved("deu"); setShowForm(false); setTimeout(()=>setSaved(false),2000); };

  const tabs = [{id:"resumen",label:"Resumen"},{id:"ingresos",label:"Ingresos"},{id:"gastos",label:"Gastos"},{id:"deudas",label:"Deudas"}];

  return (
    <div style={{ display:"flex", flexDirection:"column", paddingBottom:40 }}>
      <div style={{ padding:"16px 16px 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <GoldCard label="Ingresos" value={fmt(ingMes)} icon="💰" positive={true} />
          <GoldCard label="Gastos" value={fmt(gasMes)} icon="💸" positive={false} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <GoldCard label="Balance" value={fmt(balMes)} icon="⚖️" positive={balMes>=0} />
          <GoldCard label="Endeudamiento" value={nivelEnd.toFixed(1)+"%"} icon="⚠️" positive={nivelEnd<=30} />
        </div>
      </div>

      <div style={{ display:"flex", gap:0, padding:"16px 16px 0", borderBottom:`1px solid ${G.border}`, overflowX:"auto" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setShowForm(false);}} style={{ flex:1, padding:"12px 8px", background:"transparent", border:"none", borderBottom:tab===t.id?`2px solid ${G.gold}`:"2px solid transparent", color:tab===t.id?G.gold:G.gray, cursor:"pointer", fontSize:12, fontWeight:tab===t.id?700:400, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"inherit", whiteSpace:"nowrap" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
        {tab==="resumen" && (
          <>
            <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:16 }}>
              <div style={{ fontSize:11, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Ingresos del mes</div>
              {fpIngresos.filter(i=>i.fecha.startsWith(mes)).length===0 ? <div style={{ color:G.gray, fontSize:13 }}>Sin registros.</div> :
                fpIngresos.filter(i=>i.fecha.startsWith(mes)).map(i=>(
                  <div key={i.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${G.border}` }}>
                    <span style={{ fontSize:13, color:G.white }}>{i.descripcion}</span>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <span style={{ fontSize:13, fontWeight:600, color:G.green }}>{fmt(i.monto)}</span>
                      <button onClick={()=>onDeleteIngreso(i.id)} style={{ background:"transparent", border:"none", color:G.red, cursor:"pointer", fontSize:14 }}>🗑</button>
                    </div>
                  </div>
                ))
              }
            </div>
            <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:16 }}>
              <div style={{ fontSize:11, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Gastos del mes</div>
              {fpGastos.filter(g=>g.fecha.startsWith(mes)).length===0 ? <div style={{ color:G.gray, fontSize:13 }}>Sin registros.</div> :
                fpGastos.filter(g=>g.fecha.startsWith(mes)).map(g=>(
                  <div key={g.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${G.border}` }}>
                    <span style={{ fontSize:13, color:G.white }}>{g.descripcion}</span>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <span style={{ fontSize:13, fontWeight:600, color:G.red }}>{fmt(g.monto)}</span>
                      <button onClick={()=>onDeleteGasto(g.id)} style={{ background:"transparent", border:"none", color:G.red, cursor:"pointer", fontSize:14 }}>🗑</button>
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {tab==="ingresos" && (
          <>
            <GoldBtn onClick={()=>setShowForm(!showForm)} full>{showForm?"Cerrar":"+ Registrar ingreso"}</GoldBtn>
            {showForm && (
              <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={LS}>Fecha</label><input type="date" style={IS} value={formIng.fecha} onChange={e=>setFormIng(f=>({...f,fecha:e.target.value}))} /></div>
                  <div><label style={LS}>Categoría</label><select style={IS} value={formIng.categoria} onChange={e=>setFormIng(f=>({...f,categoria:e.target.value}))}>{CATS_INGRESO_PERSONAL.map(c=><option key={c}>{c}</option>)}</select></div>
                </div>
                <div><label style={LS}>Descripción *</label><input style={IS} placeholder="Ej: Sueldo mayo" value={formIng.descripcion} onChange={e=>setFormIng(f=>({...f,descripcion:e.target.value}))} /></div>
                <div><label style={LS}>Monto *</label><input type="number" style={IS} placeholder="2000000" value={formIng.monto} onChange={e=>setFormIng(f=>({...f,monto:e.target.value}))} /></div>
                <GoldBtn onClick={submitIng} disabled={saving} full>{saved==="ing"?"✓ Guardado":"Registrar"}</GoldBtn>
              </div>
            )}
            {fpIngresos.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(i=>(
              <div key={i.id} style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div><div style={{ fontSize:14, fontWeight:600, color:G.white }}>{i.descripcion}</div><div style={{ fontSize:12, color:G.gray }}>{i.fecha} · {i.categoria}</div></div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16, fontWeight:700, color:G.green }}>{fmt(i.monto)}</span>
                  <GoldBtn variant="danger" onClick={()=>onDeleteIngreso(i.id)}>🗑</GoldBtn>
                </div>
              </div>
            ))}
          </>
        )}

        {tab==="gastos" && (
          <>
            <GoldBtn onClick={()=>setShowForm(!showForm)} full>{showForm?"Cerrar":"+ Registrar gasto"}</GoldBtn>
            {showForm && (
              <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={LS}>Fecha</label><input type="date" style={IS} value={formGas.fecha} onChange={e=>setFormGas(f=>({...f,fecha:e.target.value}))} /></div>
                  <div><label style={LS}>Categoría</label><select style={IS} value={formGas.categoria} onChange={e=>setFormGas(f=>({...f,categoria:e.target.value}))}>{CATS_GASTO_PERSONAL.map(c=><option key={c}>{c}</option>)}</select></div>
                </div>
                <div><label style={LS}>Descripción *</label><input style={IS} placeholder="Ej: Arriendo" value={formGas.descripcion} onChange={e=>setFormGas(f=>({...f,descripcion:e.target.value}))} /></div>
                <div><label style={LS}>Monto *</label><input type="number" style={IS} placeholder="800000" value={formGas.monto} onChange={e=>setFormGas(f=>({...f,monto:e.target.value}))} /></div>
                <GoldBtn onClick={submitGas} disabled={saving} full>{saved==="gas"?"✓ Guardado":"Registrar"}</GoldBtn>
              </div>
            )}
            {fpGastos.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(g=>(
              <div key={g.id} style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div><div style={{ fontSize:14, fontWeight:600, color:G.white }}>{g.descripcion}</div><div style={{ fontSize:12, color:G.gray }}>{g.fecha} · {g.categoria}</div></div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16, fontWeight:700, color:G.red }}>{fmt(g.monto)}</span>
                  <GoldBtn variant="danger" onClick={()=>onDeleteGasto(g.id)}>🗑</GoldBtn>
                </div>
              </div>
            ))}
          </>
        )}

        {tab==="deudas" && (
          <>
            <GoldBtn onClick={()=>setShowForm(!showForm)} full>{showForm?"Cerrar":"+ Agregar deuda"}</GoldBtn>
            {showForm && (
              <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
                <div><label style={LS}>Nombre *</label><input style={IS} placeholder="Tarjeta, préstamo..." value={formDeu.nombre} onChange={e=>setFormDeu(f=>({...f,nombre:e.target.value}))} /></div>
                <div><label style={LS}>Entidad</label><input style={IS} placeholder="Bancolombia..." value={formDeu.entidad} onChange={e=>setFormDeu(f=>({...f,entidad:e.target.value}))} /></div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={LS}>Saldo inicial</label><input type="number" style={IS} placeholder="5000000" value={formDeu.saldo_inicial} onChange={e=>setFormDeu(f=>({...f,saldo_inicial:e.target.value}))} /></div>
                  <div><label style={LS}>Saldo actual *</label><input type="number" style={IS} placeholder="3000000" value={formDeu.saldo_actual} onChange={e=>setFormDeu(f=>({...f,saldo_actual:e.target.value}))} /></div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={LS}>Cuota</label><input type="number" style={IS} placeholder="300000" value={formDeu.cuota_mensual} onChange={e=>setFormDeu(f=>({...f,cuota_mensual:e.target.value}))} /></div>
                  <div><label style={LS}>Día de pago</label><input type="number" style={IS} placeholder="15" value={formDeu.fecha_pago} onChange={e=>setFormDeu(f=>({...f,fecha_pago:e.target.value}))} /></div>
                </div>
                <div><label style={LS}>Estado</label><select style={IS} value={formDeu.estado} onChange={e=>setFormDeu(f=>({...f,estado:e.target.value}))}><option value="activa">Activa</option><option value="pagada">Pagada</option><option value="en mora">En mora</option></select></div>
                <GoldBtn onClick={submitDeu} disabled={saving} full>{saved==="deu"?"✓ Guardado":"Agregar deuda"}</GoldBtn>
              </div>
            )}
            {fpDeudas.map(d=>{
              const avance = d.saldo_inicial>0?((d.saldo_inicial-d.saldo_actual)/d.saldo_inicial)*100:0;
              return (
                <div key={d.id} style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:16 }}>
                  {confirmDeu===d.id ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <GoldBtn variant="danger" onClick={()=>{onDeleteDeuda(d.id);setConfirmDeu(null);}} full>Eliminar</GoldBtn>
                      <GoldBtn variant="ghost" onClick={()=>setConfirmDeu(null)} full>Cancelar</GoldBtn>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:G.white }}>{d.nombre}</div>
                          <div style={{ fontSize:12, color:G.gray }}>{d.entidad}{d.fecha_pago?` · Día ${d.fecha_pago}`:""}</div>
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                          <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:d.estado==="pagada"?G.green+"22":G.red+"22", color:d.estado==="pagada"?G.green:G.red }}>{d.estado}</span>
                          <GoldBtn variant="danger" onClick={()=>setConfirmDeu(d.id)}>🗑</GoldBtn>
                        </div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                        <div><div style={{ fontSize:10, color:G.goldDim, textTransform:"uppercase" }}>Saldo</div><div style={{ fontSize:14, fontWeight:700, color:G.red }}>{fmt(d.saldo_actual)}</div></div>
                        <div><div style={{ fontSize:10, color:G.goldDim, textTransform:"uppercase" }}>Cuota</div><div style={{ fontSize:14, color:G.white }}>{fmt(d.cuota_mensual)}</div></div>
                      </div>
                      <GoldProgressBar value={d.saldo_inicial-d.saldo_actual} max={d.saldo_inicial||d.saldo_actual} />
                    </>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ── RESTYLED RESUMEN ──────────────────────────────────────────────────────────
function ResumenView({ atenciones, gastosSalon, nomina, deudasSalon, fpIngresos, fpGastos, fpDeudas }) {
  const mes = mesStr();
  const ingresosSalon = atenciones.filter(a=>a.fecha.startsWith(mes)).reduce((s,a)=>s+(a.total||0),0);
  const gastosSalonMes = gastosSalon.filter(g=>g.fecha.startsWith(mes)).reduce((s,g)=>s+(g.monto||0),0);
  const nominaMes = nomina.filter(n=>n.mes===mes).reduce((s,n)=>s+(n.sueldo_fijo||0),0);
  const utilidadSalon = ingresosSalon - gastosSalonMes - nominaMes;
  const deudaSalonTotal = deudasSalon.filter(d=>d.estado==="activa").reduce((s,d)=>s+(d.saldo_actual||0),0);
  const ingPersonal = fpIngresos.filter(i=>i.fecha.startsWith(mes)).reduce((s,i)=>s+(i.monto||0),0);
  const gasPersonal = fpGastos.filter(g=>g.fecha.startsWith(mes)).reduce((s,g)=>s+(g.monto||0),0);
  const balPersonal = ingPersonal - gasPersonal;
  const deudaPersonalTotal = fpDeudas.filter(d=>d.estado==="activa").reduce((s,d)=>s+(d.saldo_actual||0),0);

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16, paddingBottom:40 }}>
      <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:16, fontSize:13, color:G.gray, borderLeft:`4px solid ${G.gold}` }}>
        💡 <strong style={{ color:G.white }}>Regla de oro:</strong> La utilidad del salón no es dinero del dueño. El dueño solo toca su sueldo. Lo que queda es de la empresa.
      </div>

      <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20 }}>
        <div style={{ fontSize:13, color:G.gold, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:16 }}>✂️ Salón Bertuchi</div>
        {[
          { label:"Ingresos", value:fmt(ingresosSalon), color:G.green },
          { label:"Gastos operativos", value:fmt(gastosSalonMes), color:G.red },
          { label:"Nómina", value:fmt(nominaMes), color:"#f0a030" },
          { label:"Utilidad neta", value:fmt(utilidadSalon), color:utilidadSalon>=0?G.green:G.red, bold:true },
          { label:"Deuda total", value:fmt(deudaSalonTotal), color:G.red },
        ].map((item,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${G.border}` }}>
            <span style={{ fontSize:13, color:G.gray }}>{item.label}</span>
            <span style={{ fontSize:item.bold?17:14, fontWeight:item.bold?800:500, color:item.color }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20 }}>
        <div style={{ fontSize:13, color:G.goldDim, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:16 }}>👤 Finanzas personales</div>
        {[
          { label:"Ingresos personales", value:fmt(ingPersonal), color:G.green },
          { label:"Gastos personales", value:fmt(gasPersonal), color:G.red },
          { label:"Balance personal", value:fmt(balPersonal), color:balPersonal>=0?G.green:G.red, bold:true },
          { label:"Deuda personal", value:fmt(deudaPersonalTotal), color:G.red },
        ].map((item,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${G.border}` }}>
            <span style={{ fontSize:13, color:G.gray }}>{item.label}</span>
            <span style={{ fontSize:item.bold?17:14, fontWeight:item.bold?800:500, color:item.color }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, isDark, onToggleTheme, onPortalCliente, estilistas }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true); setError("");
    const { error: err } = await db.auth.signInWithPassword({ email, password });
    if (err) { setError("Correo o contraseña incorrectos"); setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"-apple-system,'SF Pro Display','Segoe UI',sans-serif" }}>
      <button onClick={onToggleTheme} style={{ position:"fixed", top:20, right:20, background:"transparent", border:`1px solid ${G.borderGold}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", fontSize:12, color:G.gold, fontFamily:"inherit" }}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:28, alignItems:"center" }}>
        <img src="/logo.jpg" alt="Logo" style={{ width:120, height:120, borderRadius:"50%", objectFit:"cover", border:`2px solid ${G.gold}` }} />

        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:11, color:G.goldDim, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:8 }}>Sistema de gestión</div>
          <div style={{ fontSize:28, fontWeight:800, color:G.gold, letterSpacing:"-0.02em" }}>BERTUCHI</div>
          <div style={{ fontSize:12, color:G.gray, marginTop:6 }}>Josué Gómez Peluquería</div>
        </div>

        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={LS}>Correo electrónico</label>
            <input type="email" style={IS} placeholder="correo@bertuchi.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          <div>
            <label style={LS}>Contraseña</label>
            <input type="password" style={IS} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          {error && <div style={{ fontSize:13, color:G.red, textAlign:"center", padding:"10px", background:G.red+"11", borderRadius:G.radiusSm }}>{error}</div>}
          <GoldBtn onClick={submit} disabled={loading} full>{loading?"Ingresando...":"Ingresar"}</GoldBtn>
        </div>

        <div style={{ fontSize:11, color:G.gray, letterSpacing:"0.05em" }}>Acceso restringido · Solo personal autorizado</div>
        <div style={{ width:"100%", borderTop:`1px solid ${G.border}`, paddingTop:20, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:12, color:G.gray }}>¿Eres cliente?</div>
          <GoldBtn variant="ghost" onClick={onPortalCliente} full>✂️ Reservar una cita</GoldBtn>
        </div>
      </div>
    </div>
  );
}

// ── PANEL USUARIOS (solo admin) ───────────────────────────────────────────────
function PanelUsuarios({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [editId, setEditId] = useState(null);
  const emptyForm = { email:"", password:"", nombre:"", rol:"recepcionista", activo:true };
  const [form, setForm] = useState(emptyForm);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setLoading(true);
    const { data } = await db.from("usuarios").select("*").order("created_at");
    setUsuarios(data || []);
    setLoading(false);
  };

  const crearUsuario = async () => {
    if (!form.email || !form.password || !form.nombre) return;
    setSaving(true); setErrorMsg("");
    const { data, error } = await db.auth.admin ? 
      { data: null, error: { message: "Use service role" } } :
      { data: null, error: { message: "Use service role" } };
    
    // Crear via signup temporal
    const { data: signData, error: signError } = await db.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { nombre: form.nombre } }
    });
    
    if (signError) { setErrorMsg(signError.message); setSaving(false); return; }
    
    if (signData?.user) {
      await db.from("usuarios").insert([{
        id: signData.user.id,
        nombre: form.nombre,
        rol: form.rol,
        activo: form.activo
      }]);
    }
    setForm(emptyForm); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
    setShowForm(false);
    cargarUsuarios();
  };

  const actualizarRol = async (id, nuevoRol, activo) => {
    await db.from("usuarios").update({ rol: nuevoRol, activo }).eq("id", id);
    setUsuarios(p => p.map(u => u.id === id ? {...u, rol: nuevoRol, activo} : u));
  };

  const ROLES = ["admin", "recepcionista", "estilista"];
  const ROL_LABELS = { admin:"Administrador", recepcionista:"Recepcionista", estilista:"Estilista" };
  const ROL_COLORS = { admin: G.gold, recepcionista: G.green, estilista: "#a78bfa" };

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16, paddingBottom:40 }}>
      <GoldCard label="Usuarios registrados" value={usuarios.length} icon="👥" />

      <GoldBtn onClick={()=>setShowForm(!showForm)} full>{showForm?"Cerrar":"+ Crear nuevo usuario"}</GoldBtn>

      {showForm && (
        <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:13, color:G.gold, fontWeight:700, letterSpacing:"0.05em" }}>NUEVO USUARIO</div>
          <div><label style={LS}>Nombre *</label><input style={IS} placeholder="Nombre completo" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
          <div><label style={LS}>Correo electrónico *</label><input type="email" style={IS} placeholder="correo@bertuchi.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
          <div><label style={LS}>Contraseña *</label><input type="password" style={IS} placeholder="Mínimo 6 caracteres" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></div>
          <div><label style={LS}>Rol</label>
            <select style={IS} value={form.rol} onChange={e=>setForm(f=>({...f,rol:e.target.value}))}>
              {ROLES.map(r=><option key={r} value={r}>{ROL_LABELS[r]}</option>)}
            </select>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:G.white }}>
            <input type="checkbox" checked={form.activo} onChange={e=>setForm(f=>({...f,activo:e.target.checked}))} style={{ accentColor:G.gold, width:18, height:18 }} />
            Usuario activo
          </label>
          {errorMsg && <div style={{ fontSize:13, color:G.red, padding:"8px 12px", background:G.red+"11", borderRadius:G.radiusSm }}>{errorMsg}</div>}
          <GoldBtn onClick={crearUsuario} disabled={saving} full>{saving?"Creando...":saved?"✓ Creado":"Crear usuario"}</GoldBtn>
        </div>
      )}

      {loading && <GoldSpinner />}
      {usuarios.map(u => (
        <div key={u.id} style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color: u.activo ? G.white : G.gray }}>{u.nombre}</div>
              <div style={{ fontSize:12, color:G.gray, marginTop:2 }}>ID: {u.id.slice(0,8)}...</div>
              {u.id === usuarioActual && <div style={{ fontSize:11, color:G.gold, marginTop:4 }}>← Tú</div>}
            </div>
            <span style={{ fontSize:12, padding:"4px 12px", borderRadius:20, background:(ROL_COLORS[u.rol]||G.gold)+"22", color:ROL_COLORS[u.rol]||G.gold, fontWeight:600 }}>
              {ROL_LABELS[u.rol]}
            </span>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={{...LS, marginBottom:4}}>Cambiar rol</label>
              <select style={{...IS, padding:"8px 12px", fontSize:13}} value={u.rol}
                onChange={e=>actualizarRol(u.id, e.target.value, u.activo)}
                disabled={u.id === usuarioActual}>
                {ROLES.map(r=><option key={r} value={r}>{ROL_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label style={{...LS, marginBottom:4}}>Estado</label>
              <button onClick={()=>actualizarRol(u.id, u.rol, !u.activo)}
                disabled={u.id === usuarioActual}
                style={{ width:"100%", padding:"8px 12px", borderRadius:G.radiusSm, border:"none", cursor: u.id===usuarioActual?"not-allowed":"pointer", background: u.activo ? G.green+"22" : G.red+"22", color: u.activo ? G.green : G.red, fontSize:13, fontWeight:600, fontFamily:"inherit", opacity: u.id===usuarioActual?0.5:1 }}>
                {u.activo ? "✓ Activo" : "✗ Inactivo"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


// ── PORTAL CLIENTE (sin login) ────────────────────────────────────────────────
const DIAS_SEMANA = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const HORAS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const WHATSAPP_SALON = "573195795755";

function PortalCliente({ estilistas, onVolver }) {
  const [paso, setPaso] = useState(1);
  const [estilistaId, setEstilistaId] = useState("");
  const [servicios, setServicios] = useState([]);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [horasOcupadas, setHorasOcupadas] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [enviado, setEnviado] = useState(false);

  const estilistaSeleccionado = estilistas.find(e => e.id === estilistaId);

  const getDiaSemana = (fechaStr) => {
    if (!fechaStr) return "";
    const d = new Date(fechaStr + "T12:00:00");
    const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    return dias[d.getDay()];
  };

  const esDomingo = (fechaStr) => getDiaSemana(fechaStr) === "Domingo";

  useEffect(() => {
    if (estilistaId && fecha) {
      cargarHorasOcupadas();
      cargarDisponibilidad();
    }
  }, [estilistaId, fecha]);

  const cargarHorasOcupadas = async () => {
    const { data } = await db.from("citas")
      .select("hora")
      .eq("estilista_id", estilistaId)
      .eq("fecha", fecha)
      .eq("estado", "pendiente");
    setHorasOcupadas((data||[]).map(c => c.hora));
  };

  const cargarDisponibilidad = async () => {
    const dia = getDiaSemana(fecha);
    const { data } = await db.from("disponibilidad")
      .select("*")
      .eq("estilista_id", estilistaId)
      .eq("dia", dia);
    setDisponibilidad(data||[]);
  };

  const getHorasDisponibles = () => {
    if (!fecha || !estilistaId) return [];
    if (esDomingo(fecha)) return [];
    const dia = getDiaSemana(fecha);
    const dispDia = disponibilidad.find(d => d.dia === dia);
    if (dispDia && !dispDia.disponible) return [];
    const inicio = dispDia?.hora_inicio || "08:00";
    const fin = dispDia?.hora_fin || "18:00";
    return HORAS.filter(h => h >= inicio && h < fin && !horasOcupadas.includes(h));
  };

  const confirmarCita = async () => {
    if (!nombre || !telefono) return;
    const id = "c" + Date.now();
    await db.from("citas").insert([{
      id, estilista_id: estilistaId,
      estilista_nombre: estilistaSeleccionado?.nombre || "",
      cliente_nombre: nombre.trim(),
      cliente_telefono: telefono.trim(),
      servicios, fecha, hora, estado: "pendiente"
    }]);

    const msg = `Hola, acabo de agendar una cita 💇\n\n*Fecha:* ${fecha}\n*Hora:* ${hora}\n*Estilista:* ${estilistaSeleccionado?.nombre}\n*Servicios:* ${servicios.join(", ")}\n*Nombre:* ${nombre}\n*Teléfono:* ${telefono}\n\n¡Hasta pronto! ✂️`;
    window.open(`https://wa.me/${WHATSAPP_SALON}?text=${encodeURIComponent(msg)}`, "_blank");
    setEnviado(true);
  };

  const toggleServicio = (s) => setServicios(p => p.includes(s) ? p.filter(x=>x!==s) : [...p, s]);

  const hoy = new Date().toISOString().split("T")[0];
  const horasDisp = getHorasDisponibles();

  if (enviado) return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"-apple-system,sans-serif", textAlign:"center" }}>
      <div style={{ fontSize:60, marginBottom:20 }}>✅</div>
      <div style={{ fontSize:24, fontWeight:800, color:G.gold, marginBottom:12 }}>¡Cita confirmada!</div>
      <div style={{ fontSize:14, color:G.gray, marginBottom:8 }}>Tu mensaje fue enviado por WhatsApp al salón.</div>
      <div style={{ background:G.bgCard, border:`1px solid ${G.borderGold}`, borderRadius:G.radius, padding:20, marginBottom:24, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:13, color:G.gray, marginBottom:6 }}>📅 {fecha} · ⏰ {hora}</div>
        <div style={{ fontSize:15, fontWeight:600, color:G.white }}>{estilistaSeleccionado?.nombre}</div>
        <div style={{ fontSize:13, color:G.gold, marginTop:4 }}>{servicios.join(", ")}</div>
      </div>
      <GoldBtn onClick={onVolver} full>Volver al inicio</GoldBtn>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"-apple-system,sans-serif", maxWidth:480, margin:"0 auto" }}>
      <div style={{ position:"sticky", top:0, zIndex:100, background:G.bg, borderBottom:`1px solid ${G.borderGold}`, padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
        <button onClick={onVolver} style={{ background:"transparent", border:`1px solid ${G.borderGold}`, borderRadius:G.radiusSm, color:G.gold, padding:"6px 12px", cursor:"pointer", fontSize:18, fontFamily:"inherit" }}>‹</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:G.goldDim, letterSpacing:"0.15em", textTransform:"uppercase" }}>Bertuchi</div>
          <div style={{ fontSize:18, fontWeight:700, color:G.white }}>Reservar cita</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display:"flex", padding:"16px 16px 0", gap:6 }}>
        {[1,2,3,4].map(p => (
          <div key={p} style={{ flex:1, height:4, borderRadius:99, background: p <= paso ? G.gold : G.border, transition:"background 0.3s" }} />
        ))}
      </div>

      <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16, paddingBottom:40 }}>

        {/* Paso 1: Estilista */}
        {paso >= 1 && (
          <div style={{ background:G.bgCard, border:`1px solid ${paso===1?G.gold:G.borderGold}`, borderRadius:G.radius, padding:16 }}>
            <div style={{ fontSize:12, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>1. Elige tu estilista</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {estilistas.filter(e=>e.activo).map(e => (
                <button key={e.id} onClick={()=>{ setEstilistaId(e.id); if(paso===1) setPaso(2); }} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", borderRadius:G.radiusSm, border:`1px solid ${estilistaId===e.id?G.gold:G.border}`, background:estilistaId===e.id?"#C9A84C22":G.bgInput, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:e.color+"22", border:`2px solid ${e.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:e.color, flexShrink:0 }}>{e.nombre.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:G.white }}>{e.nombre}</div>
                    {e.especialidad && <div style={{ fontSize:12, color:G.gray }}>{e.especialidad}</div>}
                  </div>
                  {estilistaId===e.id && <span style={{ marginLeft:"auto", color:G.gold, fontSize:18 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paso 2: Servicios */}
        {paso >= 2 && (
          <div style={{ background:G.bgCard, border:`1px solid ${paso===2?G.gold:G.borderGold}`, borderRadius:G.radius, padding:16 }}>
            <div style={{ fontSize:12, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>2. Elige los servicios</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {SERVICIOS_DEFAULT.map(s => (
                <button key={s} onClick={()=>toggleServicio(s)} style={{ fontSize:13, padding:"8px 14px", borderRadius:20, cursor:"pointer", border:servicios.includes(s)?`1px solid ${G.gold}`:`1px solid ${G.border}`, background:servicios.includes(s)?"#C9A84C22":G.bgInput, color:servicios.includes(s)?G.gold:G.gray, fontFamily:"inherit" }}>{s}</button>
              ))}
            </div>
            {servicios.length > 0 && paso === 2 && (
              <GoldBtn onClick={()=>setPaso(3)} full style={{ marginTop:12 }}>Continuar →</GoldBtn>
            )}
          </div>
        )}

        {/* Paso 3: Fecha y hora */}
        {paso >= 3 && (
          <div style={{ background:G.bgCard, border:`1px solid ${paso===3?G.gold:G.borderGold}`, borderRadius:G.radius, padding:16 }}>
            <div style={{ fontSize:12, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>3. Elige fecha y hora</div>
            <div style={{ marginBottom:12 }}>
              <label style={LS}>Fecha</label>
              <input type="date" style={IS} min={hoy} value={fecha} onChange={e=>{ setFecha(e.target.value); setHora(""); }} />
            </div>
            {fecha && esDomingo(fecha) && (
              <div style={{ background:"#f0a03022", border:"1px solid #f0a03044", borderRadius:G.radiusSm, padding:"12px 14px", fontSize:13, color:"#f0a030", marginBottom:12 }}>
                📅 Los domingos el salón no tiene agenda disponible. Por favor comunícate directamente con el salón al <strong>319 579 5755</strong> para conciliar una cita.
              </div>
            )}
            {fecha && !esDomingo(fecha) && (
              <>
                <label style={LS}>Hora disponible</label>
                {horasDisp.length === 0 ? (
                  <div style={{ fontSize:13, color:G.gray, padding:"12px 0" }}>No hay horas disponibles para este día. Elige otra fecha.</div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {horasDisp.map(h => (
                      <button key={h} onClick={()=>{ setHora(h); setPaso(4); }} style={{ padding:"10px", borderRadius:G.radiusSm, border:`1px solid ${hora===h?G.gold:G.border}`, background:hora===h?"#C9A84C22":G.bgInput, color:hora===h?G.gold:G.white, cursor:"pointer", fontSize:14, fontWeight:hora===h?700:400, fontFamily:"inherit" }}>{h}</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Paso 4: Datos personales */}
        {paso >= 4 && (
          <div style={{ background:G.bgCard, border:`1px solid ${G.gold}`, borderRadius:G.radius, padding:16 }}>
            <div style={{ fontSize:12, color:G.goldDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>4. Tus datos</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label style={LS}>Nombre *</label><input style={IS} placeholder="Tu nombre completo" value={nombre} onChange={e=>setNombre(e.target.value)} /></div>
              <div><label style={LS}>Teléfono / WhatsApp *</label><input type="tel" style={IS} placeholder="3001234567" value={telefono} onChange={e=>setTelefono(e.target.value)} /></div>
              <div style={{ background:G.bgInput, borderRadius:G.radiusSm, padding:14, fontSize:13, color:G.gray }}>
                <div style={{ color:G.white, fontWeight:600, marginBottom:8 }}>Resumen de tu cita</div>
                <div>✂️ {estilistaSeleccionado?.nombre}</div>
                <div>📅 {fecha} · ⏰ {hora}</div>
                <div>💇 {servicios.join(", ")}</div>
              </div>
              <GoldBtn onClick={confirmarCita} disabled={!nombre||!telefono} full>Confirmar y enviar por WhatsApp ✉️</GoldBtn>
              <div style={{ fontSize:11, color:G.gray, textAlign:"center" }}>Al confirmar se abrirá WhatsApp para enviar tu reserva al salón</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DISPONIBILIDAD ESTILISTA ───────────────────────────────────────────────────
function DisponibilidadEstilista({ estilistaId }) {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    cargar();
  }, [estilistaId]);

  const cargar = async () => {
    const { data } = await db.from("disponibilidad").select("*").eq("estilista_id", estilistaId);
    const map = {};
    (data||[]).forEach(d => { map[d.dia] = d; });
    // Defaults
    DIAS_SEMANA.forEach(dia => {
      if (!map[dia]) map[dia] = { dia, disponible: dia !== "Domingo", hora_inicio:"08:00", hora_fin:"18:00" };
    });
    setConfig(map);
    setLoading(false);
  };

  const guardar = async () => {
    setSaving(true);
    for (const dia of DIAS_SEMANA) {
      const d = config[dia];
      const { data: existing } = await db.from("disponibilidad").select("id").eq("estilista_id", estilistaId).eq("dia", dia);
      if (existing && existing.length > 0) {
        await db.from("disponibilidad").update({ disponible:d.disponible, hora_inicio:d.hora_inicio, hora_fin:d.hora_fin }).eq("estilista_id", estilistaId).eq("dia", dia);
      } else {
        await db.from("disponibilidad").insert([{ id:"disp"+Date.now()+dia, estilista_id:estilistaId, dia, disponible:d.disponible, hora_inicio:d.hora_inicio, hora_fin:d.hora_fin }]);
      }
    }
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const update = (dia, key, value) => setConfig(p => ({ ...p, [dia]: { ...p[dia], [key]: value } }));

  if (loading) return <GoldSpinner />;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, paddingBottom:40 }}>
      <div style={{ fontSize:13, color:G.gray, padding:"10px 0" }}>Configura los días y horarios en que estás disponible para atender citas.</div>
      {DIAS_SEMANA.map(dia => {
        const d = config[dia] || {};
        const esDom = dia === "Domingo";
        return (
          <div key={dia} style={{ background:G.bgCard, border:`1px solid ${d.disponible?G.borderGold:G.border}`, borderRadius:G.radius, padding:16, opacity:esDom?0.6:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: d.disponible&&!esDom?12:0 }}>
              <div style={{ fontSize:15, fontWeight:600, color:d.disponible?G.white:G.gray }}>{dia}</div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {esDom && <span style={{ fontSize:11, color:"#f0a030" }}>Comunicarse con el salón</span>}
                {!esDom && (
                  <button onClick={()=>update(dia,"disponible",!d.disponible)} style={{ fontSize:12, padding:"5px 14px", borderRadius:20, border:"none", cursor:"pointer", background:d.disponible?G.green+"22":G.red+"22", color:d.disponible?G.green:G.red, fontFamily:"inherit", fontWeight:600 }}>
                    {d.disponible ? "✓ Disponible" : "✗ No disponible"}
                  </button>
                )}
              </div>
            </div>
            {d.disponible && !esDom && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={LS}>Desde</label>
                  <select style={IS} value={d.hora_inicio||"08:00"} onChange={e=>update(dia,"hora_inicio",e.target.value)}>
                    {HORAS.map(h=><option key={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LS}>Hasta</label>
                  <select style={IS} value={d.hora_fin||"18:00"} onChange={e=>update(dia,"hora_fin",e.target.value)}>
                    {[...HORAS,"18:00"].map(h=><option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <GoldBtn onClick={guardar} disabled={saving} full>{saving?"Guardando...":saved?"✓ Guardado":"Guardar disponibilidad"}</GoldBtn>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
const VIEW_TITLES = {
  home:"Inicio", atenciones:"Atenciones", estilistas:"Estilistas",
  gastos_salon:"Gastos del salón", deudas_salon:"Deudas del salón",
  nomina:"Nómina", personal:"Finanzas personales", resumen:"Resumen general",
  usuarios:"Gestión de usuarios", disponibilidad:"Mi disponibilidad"
};

export default function App() {
  const [view, setView] = useState("home");
  const [portalCliente, setPortalCliente] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("theme") !== "light"; } catch { return true; }
  });
  const [session, setSession] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    try { localStorage.setItem("theme", newDark ? "dark" : "light"); } catch {}
    G = newDark ? DARK_THEME : LIGHT_THEME;
  };
  G = isDark ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarRol(session.user.id);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) cargarRol(session.user.id);
      else { setUsuarioRol(null); setAuthLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const cargarRol = async (uid) => {
    const { data } = await db.from("usuarios").select("rol,activo,nombre,id").eq("id", uid).single();
    if (data && data.activo) setUsuarioRol(data);
    else setUsuarioRol(null);
    setAuthLoading(false);
  };

  const logout = async () => { await db.auth.signOut(); setView("home"); };

  const [estilistas, setEstilistas] = useState([]);
  const [atenciones, setAtenciones] = useState([]);
  const [gastosSalon, setGastosSalon] = useState([]);
  const [deudasSalon, setDeudasSalon] = useState([]);
  const [nomina, setNomina] = useState([]);
  const [fpIngresos, setFpIngresos] = useState([]);
  const [fpGastos, setFpGastos] = useState([]);
  const [fpDeudas, setFpDeudas] = useState([]);
  const [loadingEst, setLoadingEst] = useState(true);
  const [loadingAten, setLoadingAten] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;
    const cargar = async () => {
      try {
        const [r1,r2,r3,r4,r5,r6,r7,r8] = await Promise.all([
          db.from("estilistas").select("*").order("created_at"),
          db.from("atenciones").select("*").order("created_at",{ascending:false}),
          db.from("gastos_salon").select("*").order("fecha",{ascending:false}),
          db.from("deudas_salon").select("*").order("created_at"),
          db.from("nomina").select("*").order("created_at"),
          db.from("fp_ingresos").select("*").order("fecha",{ascending:false}),
          db.from("fp_gastos").select("*").order("fecha",{ascending:false}),
          db.from("fp_deudas").select("*").order("created_at"),
        ]);
        if(r1.error) throw r1.error;
        setEstilistas(r1.data.map(e=>({id:e.id,nombre:e.nombre,telefono:e.telefono,especialidad:e.especialidad,porcentajeBase:e.porcentaje_base,color:e.color,activo:e.activo})));
        setAtenciones(r2.data||[]);
        setGastosSalon(r3.data||[]);
        setDeudasSalon(r4.data||[]);
        setNomina(r5.data||[]);
        setFpIngresos(r6.data||[]);
        setFpGastos(r7.data||[]);
        setFpDeudas(r8.data||[]);
        setLoadingEst(false); setLoadingAten(false); setLoading(false);
      } catch(err) {
        setError("Error: "+err.message);
        setLoadingEst(false); setLoadingAten(false); setLoading(false);
      }
    };
    cargar();
  }, [session]);

  const addEstilista = async (e) => { const {error} = await db.from("estilistas").insert([{id:e.id,nombre:e.nombre,telefono:e.telefono||null,especialidad:e.especialidad||null,porcentaje_base:e.porcentajeBase,color:e.color,activo:e.activo}]); if(!error) setEstilistas(p=>[...p,e]); };
  const deleteEstilista = async (id) => { await db.from("estilistas").delete().eq("id",id); setEstilistas(p=>p.filter(e=>e.id!==id)); };
  const updateEstilista = async (upd) => { await db.from("estilistas").update({nombre:upd.nombre,telefono:upd.telefono||null,especialidad:upd.especialidad||null,porcentaje_base:upd.porcentajeBase,activo:upd.activo}).eq("id",upd.id); setEstilistas(p=>p.map(e=>e.id===upd.id?{...e,...upd}:e)); };
  const addAtencion = async (a) => { const {error} = await db.from("atenciones").insert([a]); if(!error) setAtenciones(p=>[a,...p]); };
  const deleteAtencion = async (id) => { await db.from("atenciones").delete().eq("id",id); setAtenciones(p=>p.filter(a=>a.id!==id)); };
  const addGastoSalon = async (g) => { const {error} = await db.from("gastos_salon").insert([g]); if(!error) setGastosSalon(p=>[g,...p]); };
  const deleteGastoSalon = async (id) => { await db.from("gastos_salon").delete().eq("id",id); setGastosSalon(p=>p.filter(g=>g.id!==id)); };
  const addDeudaSalon = async (d) => { const {error} = await db.from("deudas_salon").insert([d]); if(!error) setDeudasSalon(p=>[...p,d]); };
  const deleteDeudaSalon = async (id) => { await db.from("deudas_salon").delete().eq("id",id); setDeudasSalon(p=>p.filter(d=>d.id!==id)); };
  const updateDeudaSalon = async (upd) => { await db.from("deudas_salon").update(upd).eq("id",upd.id); setDeudasSalon(p=>p.map(d=>d.id===upd.id?{...d,...upd}:d)); };
  const addNomina = async (n) => { const {error} = await db.from("nomina").insert([n]); if(!error) setNomina(p=>[...p,n]); };
  const deleteNomina = async (id) => { await db.from("nomina").delete().eq("id",id); setNomina(p=>p.filter(n=>n.id!==id)); };
  const updateNomina = async (upd) => { await db.from("nomina").update(upd).eq("id",upd.id); setNomina(p=>p.map(n=>n.id===upd.id?{...n,...upd}:n)); };
  const addFpIngreso = async (i) => { const {error} = await db.from("fp_ingresos").insert([i]); if(!error) setFpIngresos(p=>[i,...p]); };
  const deleteFpIngreso = async (id) => { await db.from("fp_ingresos").delete().eq("id",id); setFpIngresos(p=>p.filter(i=>i.id!==id)); };
  const addFpGasto = async (g) => { const {error} = await db.from("fp_gastos").insert([g]); if(!error) setFpGastos(p=>[g,...p]); };
  const deleteFpGasto = async (id) => { await db.from("fp_gastos").delete().eq("id",id); setFpGastos(p=>p.filter(g=>g.id!==id)); };
  const addFpDeuda = async (d) => { const {error} = await db.from("fp_deudas").insert([d]); if(!error) setFpDeudas(p=>[...p,d]); };
  const deleteFpDeuda = async (id) => { await db.from("fp_deudas").delete().eq("id",id); setFpDeudas(p=>p.filter(d=>d.id!==id)); };
  const updateFpDeuda = async (upd) => { await db.from("fp_deudas").update(upd).eq("id",upd.id); setFpDeudas(p=>p.map(d=>d.id===upd.id?{...d,...upd}:d)); };

  const isAdmin = usuarioRol?.rol === "admin";
  const isRecepcionista = usuarioRol?.rol === "recepcionista";
  const isEstilista = usuarioRol?.rol === "estilista";
  const isHome = view === "home";

  const modulosVisibles = () => {
    const todos = [
      { id:"atenciones",   icon:"✂️",  label:"Atenciones",         sub:"Registrar servicios" },
      { id:"estilistas",   icon:"💇",  label:"Estilistas",          sub:"Equipo y porcentajes" },
      { id:"gastos_salon", icon:"💸",  label:"Gastos del salón",    sub:"Control de egresos" },
      { id:"deudas_salon", icon:"🔗",  label:"Deudas del salón",    sub:"Seguimiento de deudas" },
      { id:"nomina",       icon:"💼",  label:"Nómina",              sub:"Sueldos y pagos" },
      { id:"personal",     icon:"👤",  label:"Finanzas personales", sub:"Separación personal" },
      { id:"resumen",      icon:"📊",  label:"Resumen general",     sub:"Vista completa" },
      { id:"usuarios",     icon:"🔐",  label:"Usuarios",            sub:"Gestión de accesos" },
      { id:"disponibilidad", icon:"📅", label:"Mi disponibilidad",  sub:"Configura tus horarios" },
    ];
    if (isAdmin) return todos.filter(m => m.id !== "disponibilidad");
    if (isRecepcionista) return todos.filter(m => ["atenciones","estilistas"].includes(m.id));
    if (isEstilista) return todos.filter(m => ["atenciones","disponibilidad"].includes(m.id));
    return [];
  };

  // Portal cliente — sin login
  if (portalCliente) return <PortalCliente estilistas={estilistas} onVolver={()=>setPortalCliente(false)} />;

  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"-apple-system,sans-serif" }}>
      <div style={{ color:G.goldDim, fontSize:14, letterSpacing:"0.1em" }}>CARGANDO...</div>
    </div>
  );

  if (!session || !usuarioRol) {
    return (
      <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"-apple-system,sans-serif", maxWidth:480, margin:"0 auto" }}>
        <LoginScreen onLogin={()=>{}} isDark={isDark} onToggleTheme={toggleTheme} onPortalCliente={()=>setPortalCliente(true)} estilistas={estilistas} />
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"-apple-system,'SF Pro Display','Segoe UI',sans-serif", color:G.white, maxWidth:480, margin:"0 auto" }}>
      {error && <div style={{ background:"#2d1515", borderBottom:`1px solid ${G.red}`, padding:"12px 16px", color:G.red, fontSize:13 }}>⚠️ {error}</div>}
      {!isHome && <HeaderBar title={VIEW_TITLES[view]} onBack={()=>setView("home")} isDark={isDark} onToggleTheme={toggleTheme} />}
      {view==="home" && (
        <HomeScreen onNav={setView} atenciones={atenciones} gastosSalon={gastosSalon} nomina={nomina} deudasSalon={deudasSalon} isDark={isDark} onToggleTheme={toggleTheme} modulosVisibles={modulosVisibles()} usuarioNombre={usuarioRol.nombre} usuarioRol={usuarioRol.rol} onLogout={logout} onPortalCliente={()=>setPortalCliente(true)} />
      )}
      {view==="atenciones" && <AtencionesView atenciones={atenciones} loading={loadingAten} onAdd={addAtencion} onDelete={deleteAtencion} estilistas={estilistas} />}
      {view==="estilistas" && <EstilistasView estilistas={estilistas} loading={loadingEst} onAdd={isAdmin?addEstilista:null} onDelete={isAdmin?deleteEstilista:null} onUpdate={isAdmin?updateEstilista:null} soloLectura={!isAdmin} />}
      {view==="gastos_salon" && isAdmin && <GastosSalonView gastosSalon={gastosSalon} loading={loading} onAdd={addGastoSalon} onDelete={deleteGastoSalon} />}
      {view==="deudas_salon" && isAdmin && <DeudasSalonView deudasSalon={deudasSalon} loading={loading} onAdd={addDeudaSalon} onDelete={deleteDeudaSalon} onUpdate={updateDeudaSalon} />}
      {view==="nomina" && isAdmin && <NominaView nomina={nomina} loading={loading} onAdd={addNomina} onDelete={deleteNomina} onUpdate={updateNomina} />}
      {view==="personal" && isAdmin && <FinanzasPersonalesView fpIngresos={fpIngresos} fpGastos={fpGastos} fpDeudas={fpDeudas} loading={loading} onAddIngreso={addFpIngreso} onAddGasto={addFpGasto} onAddDeuda={addFpDeuda} onDeleteIngreso={deleteFpIngreso} onDeleteGasto={deleteFpGasto} onDeleteDeuda={deleteFpDeuda} onUpdateDeuda={updateFpDeuda} />}
      {view==="resumen" && isAdmin && <ResumenView atenciones={atenciones} gastosSalon={gastosSalon} nomina={nomina} deudasSalon={deudasSalon} fpIngresos={fpIngresos} fpGastos={fpGastos} fpDeudas={fpDeudas} />}
      {view==="usuarios" && isAdmin && <PanelUsuarios usuarioActual={session.user.id} />}
      {view==="disponibilidad" && isEstilista && <DisponibilidadEstilista estilistaId={session.user.id} />}
    </div>
  );
}
