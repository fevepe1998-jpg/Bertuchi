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

// ── ESTILISTAS ────────────────────────────────────────────────────────────────
function Estilistas({ estilistas, loading, onAdd, onDelete, onUpdate }) {
  const empty = { nombre:"", telefono:"", especialidad:"", porcentajeBase:50, activo:true };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const IS = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
  const LS = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  const submit = async () => {
    if (!form.nombre.trim() || saving) return;
    setSaving(true);
    if (editId) {
      await onUpdate({ ...form, id: editId });
      setEditId(null);
    } else {
      await onAdd({ ...form, id:"e"+Date.now(), nombre:form.nombre.trim(), color: COLORES_ESTILISTA[estilistas.length % COLORES_ESTILISTA.length] });
    }
    setForm(empty); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <KpiCard label="Estilistas activos" value={estilistas.filter(e=>e.activo).length} color="#5b8dee" icon="💇" />
        <KpiCard label="Porcentaje promedio" value={estilistas.length ? Math.round(estilistas.reduce((s,e)=>s+e.porcentajeBase,0)/estilistas.length)+"%" : "—"} color="#a855f7" icon="%" />
        <KpiCard label="Total equipo" value={estilistas.length} color="#10b981" icon="👥" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:14, height:"fit-content" }}>
          <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>{editId ? "✏️ Editar estilista" : "Nuevo estilista"}</div>
          <div><label style={LS}>Nombre *</label><input style={IS} placeholder="Ej: Valentina Ríos" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
          <div><label style={LS}>Teléfono / WhatsApp</label><input style={IS} placeholder="3001234567" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} /></div>
          <div><label style={LS}>Especialidad</label><input style={IS} placeholder="Colorista, manicurista..." value={form.especialidad} onChange={e=>setForm(f=>({...f,especialidad:e.target.value}))} /></div>
          <div>
            <label style={LS}>Porcentaje que recibe: <span style={{ color:"#5b8dee", fontWeight:700 }}>{form.porcentajeBase}%</span></label>
            <input type="range" min="10" max="90" step="5" value={form.porcentajeBase} onChange={e=>setForm(f=>({...f,porcentajeBase:parseInt(e.target.value,10)}))} style={{ width:"100%", accentColor:"#5b8dee", cursor:"pointer" }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#8892a4", marginTop:4 }}>
              <span>Estilista: <strong style={{ color:"#5b8dee" }}>{form.porcentajeBase}%</strong></span>
              <span>Salón: <strong style={{ color:"#10b981" }}>{100-form.porcentajeBase}%</strong></span>
            </div>
            <div style={{ display:"flex", borderRadius:6, overflow:"hidden", height:10, marginTop:8 }}>
              <div style={{ width:form.porcentajeBase+"%", background:"#5b8dee", transition:"width 0.2s" }} />
              <div style={{ flex:1, background:"#10b981" }} />
            </div>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"#e2e8f0" }}>
            <input type="checkbox" checked={form.activo} onChange={e=>setForm(f=>({...f,activo:e.target.checked}))} style={{ accentColor:"#5b8dee", width:16, height:16 }} />
            Estilista activo
          </label>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={submit} disabled={saving} style={{ flex:1, padding:"11px", borderRadius:8, border:"none", background:saved?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, opacity:saving?0.7:1 }}>
              {saving?"Guardando...":saved?"✓ Guardado":editId?"Guardar cambios":"Agregar estilista"}
            </button>
            {editId && <button onClick={()=>{setEditId(null);setForm(empty);}} style={{ padding:"11px 16px", borderRadius:8, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:14 }}>Cancelar</button>}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {loading && <Spinner />}
          {!loading && estilistas.length === 0 && (
            <div style={{ textAlign:"center", padding:40, color:"#8892a4", fontSize:14, background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12 }}>
              Aún no tienes estilistas.<br/>Agrega el primero.
            </div>
          )}
          {estilistas.map(e => (
            <div key={e.id} style={{ background:"#1a1f2e", border:`1px solid ${editId===e.id?"#5b8dee":"#2a3042"}`, borderRadius:12, padding:16 }}>
              {confirm===e.id ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:13, color:"#e8614e" }}>¿Eliminar a <strong>{e.nombre}</strong>?</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>{onDelete(e.id);setConfirm(null);}} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:"#e8614e", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:13 }}>Sí, eliminar</button>
                    <button onClick={()=>setConfirm(null)} style={{ flex:1, padding:"8px", borderRadius:8, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:13 }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <div style={{ width:40, height:40, borderRadius:"50%", background:e.color+"22", border:`2px solid ${e.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:e.color, flexShrink:0 }}>{e.nombre.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize:15, fontWeight:600, color:e.activo?"#e2e8f0":"#8892a4" }}>{e.nombre}</div>
                        {e.especialidad && <div style={{ fontSize:12, color:"#8892a4" }}>{e.especialidad}</div>}
                        {e.telefono && <div style={{ fontSize:12, color:"#8892a4" }}>📱 {e.telefono}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{setEditId(e.id);setForm({nombre:e.nombre,telefono:e.telefono||"",especialidad:e.especialidad||"",porcentajeBase:e.porcentajeBase,activo:e.activo});}} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:12 }}>✏️</button>
                      <button onClick={()=>setConfirm(e.id)} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #e8614e22", background:"transparent", color:"#e8614e", cursor:"pointer", fontSize:12 }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ marginTop:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#8892a4", marginBottom:4 }}>
                      <span>Recibe {e.porcentajeBase}%</span><span>Salón {100-e.porcentajeBase}%</span>
                    </div>
                    <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:8 }}>
                      <div style={{ width:e.porcentajeBase+"%", background:e.color }} />
                      <div style={{ flex:1, background:"#10b981" }} />
                    </div>
                  </div>
                  {!e.activo && <div style={{ marginTop:8, fontSize:11, color:"#f0a030", background:"#f0a03022", borderRadius:6, padding:"3px 8px", display:"inline-block" }}>Inactivo</div>}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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

// ── APP ───────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id:"resumen", label:"Resumen", icon:"⬡" },
  { id:"atenciones", label:"Atenciones", icon:"✂" },
  { id:"estilistas", label:"Estilistas", icon:"💇" },
  { id:"gastos_salon", label:"Gastos salón", icon:"💸" },
  { id:"deudas_salon", label:"Deudas salón", icon:"🔗" },
  { id:"nomina", label:"Nómina", icon:"💼" },
  { id:"personal", label:"Finanzas personales", icon:"👤" },
];

export default function App() {
  const [view, setView] = useState("resumen");
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
  }, []);

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

  const viewTitles = { resumen:"Resumen general", atenciones:"Atenciones del salón", estilistas:"Estilistas", gastos_salon:"Gastos del salón", deudas_salon:"Deudas del salón", nomina:"Nómina", personal:"Finanzas personales" };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0d1117", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"#e2e8f0" }}>
      <div style={{ width:210, background:"#111827", borderRight:"1px solid #1e2a3a", padding:"24px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"0 20px 24px", borderBottom:"1px solid #1e2a3a" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0" }}>✂️ Bertuchi</div>
          <div style={{ fontSize:11, color:"#10b981", marginTop:4, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", display:"inline-block" }} />
            Conectado a Supabase
          </div>
        </div>
        <div style={{ padding:"10px 20px 6px", fontSize:10, color:"#8892a4", textTransform:"uppercase", letterSpacing:"0.08em" }}>Salón</div>
        {VIEWS.filter(v=>["resumen","atenciones","estilistas","gastos_salon","deudas_salon","nomina"].includes(v.id)).map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 20px", background:view===v.id?"#1a2840":"transparent", border:"none", borderLeft:view===v.id?"3px solid #5b8dee":"3px solid transparent", color:view===v.id?"#5b8dee":"#8892a4", cursor:"pointer", fontSize:13, fontWeight:view===v.id?600:400, textAlign:"left" }}>
            <span style={{ fontSize:15, width:20, textAlign:"center" }}>{v.icon}</span>{v.label}
          </button>
        ))}
        <div style={{ padding:"10px 20px 6px", marginTop:8, fontSize:10, color:"#8892a4", textTransform:"uppercase", letterSpacing:"0.08em", borderTop:"1px solid #1e2a3a" }}>Personal</div>
        {VIEWS.filter(v=>v.id==="personal").map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 20px", background:view===v.id?"#1a2840":"transparent", border:"none", borderLeft:view===v.id?"3px solid #a855f7":"3px solid transparent", color:view===v.id?"#a855f7":"#8892a4", cursor:"pointer", fontSize:13, fontWeight:view===v.id?600:400, textAlign:"left" }}>
            <span style={{ fontSize:15, width:20, textAlign:"center" }}>{v.icon}</span>{v.label}
          </button>
        ))}
        <div style={{ padding:"16px 20px", borderTop:"1px solid #1e2a3a", marginTop:"auto", fontSize:11, color:"#8892a4" }}>
          {atenciones.length} atenciones · {estilistas.length} estilistas
        </div>
      </div>

      <div style={{ flex:1, overflow:"auto" }}>
        <div style={{ padding:"24px 28px", borderBottom:"1px solid #1e2a3a", background:"#111827" }}>
          <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:"#e2e8f0" }}>{viewTitles[view]}</h1>
        </div>
        <div style={{ padding:24 }}>
          {error && <div style={{ background:"#2d1515", border:"1px solid #e8614e", borderRadius:8, padding:16, color:"#e8614e", marginBottom:20, fontSize:14 }}>⚠️ {error}</div>}
          {view==="resumen" && <ResumenGeneral atenciones={atenciones} gastosSalon={gastosSalon} nomina={nomina} deudasSalon={deudasSalon} fpIngresos={fpIngresos} fpGastos={fpGastos} fpDeudas={fpDeudas} />}
          {view==="atenciones" && <Atenciones atenciones={atenciones} loading={loadingAten} onAdd={addAtencion} onDelete={deleteAtencion} estilistas={estilistas} />}
          {view==="estilistas" && <Estilistas estilistas={estilistas} loading={loadingEst} onAdd={addEstilista} onDelete={deleteEstilista} onUpdate={updateEstilista} />}
          {view==="gastos_salon" && <GastosSalon gastosSalon={gastosSalon} loading={loading} onAdd={addGastoSalon} onDelete={deleteGastoSalon} />}
          {view==="deudas_salon" && <DeudasSalon deudasSalon={deudasSalon} loading={loading} onAdd={addDeudaSalon} onDelete={deleteDeudaSalon} onUpdate={updateDeudaSalon} />}
          {view==="nomina" && <Nomina nomina={nomina} loading={loading} onAdd={addNomina} onDelete={deleteNomina} onUpdate={updateNomina} />}
          {view==="personal" && <FinanzasPersonales fpIngresos={fpIngresos} fpGastos={fpGastos} fpDeudas={fpDeudas} loading={loading} onAddIngreso={addFpIngreso} onAddGasto={addFpGasto} onAddDeuda={addFpDeuda} onDeleteIngreso={deleteFpIngreso} onDeleteGasto={deleteFpGasto} onDeleteDeuda={deleteFpDeuda} onUpdateDeuda={updateFpDeuda} />}
        </div>
      </div>
    </div>
  );
}
