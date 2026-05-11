import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
function Atenciones({ atenciones, loading, onAdd, estilistas }) {
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
        <button onClick={()=>setDetalle(null)} style={{ background:"transparent", border:"1px solid #2a3042", borderRadius:8, color:"#8892a4", padding:"6px 14px", cursor:"pointer", fontSize:13, marginBottom:20 }}>← Volver</button>
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

// ── APP ───────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id:"atenciones", label:"Atenciones", icon:"✂" },
  { id:"estilistas", label:"Estilistas", icon:"💇" },
];

export default function App() {
  const [view, setView] = useState("atenciones");
  const [estilistas, setEstilistas] = useState([]);
  const [atenciones, setAtenciones] = useState([]);
  const [loadingEst, setLoadingEst] = useState(true);
  const [loadingAten, setLoadingAten] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos al iniciar
  useEffect(() => {
    const cargar = async () => {
      try {
        const { data: ests, error: e1 } = await db.from("estilistas").select("*").order("created_at");
        if (e1) throw e1;
        setEstilistas(ests.map(e=>({ id:e.id, nombre:e.nombre, telefono:e.telefono, especialidad:e.especialidad, porcentajeBase:e.porcentaje_base, color:e.color, activo:e.activo })));
        setLoadingEst(false);

        const { data: atens, error: e2 } = await db.from("atenciones").select("*").order("created_at", { ascending:false });
        if (e2) throw e2;
        setAtenciones(atens);
        setLoadingAten(false);
      } catch(err) {
        setError("Error conectando con Supabase: " + err.message);
        setLoadingEst(false); setLoadingAten(false);
      }
    };
    cargar();
  }, []);

  const addEstilista = async (e) => {
    const { error } = await db.from("estilistas").insert([{ id:e.id, nombre:e.nombre, telefono:e.telefono||null, especialidad:e.especialidad||null, porcentaje_base:e.porcentajeBase, color:e.color, activo:e.activo }]);
    if (!error) setEstilistas(p=>[...p, e]);
  };

  const deleteEstilista = async (id) => {
    await db.from("estilistas").delete().eq("id", id);
    setEstilistas(p=>p.filter(e=>e.id!==id));
  };

  const updateEstilista = async (upd) => {
    await db.from("estilistas").update({ nombre:upd.nombre, telefono:upd.telefono||null, especialidad:upd.especialidad||null, porcentaje_base:upd.porcentajeBase, activo:upd.activo }).eq("id", upd.id);
    setEstilistas(p=>p.map(e=>e.id===upd.id?{...e,...upd}:e));
  };

  const addAtencion = async (a) => {
    const { error } = await db.from("atenciones").insert([a]);
    if (!error) setAtenciones(p=>[a,...p]);
  };

  const viewTitles = { atenciones:"Atenciones del salón", estilistas:"Estilistas" };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0d1117", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"#e2e8f0" }}>
      <div style={{ width:200, background:"#111827", borderRight:"1px solid #1e2a3a", padding:"24px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"0 20px 24px", borderBottom:"1px solid #1e2a3a" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0" }}>✂️ Salón Pro</div>
          <div style={{ fontSize:11, color:"#10b981", marginTop:4, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", display:"inline-block" }} />
            Conectado a Supabase
          </div>
        </div>
        <nav style={{ padding:"12px 0", flex:1 }}>
          {VIEWS.map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 20px", background:view===v.id?"#1a2840":"transparent", border:"none", borderLeft:view===v.id?"3px solid #5b8dee":"3px solid transparent", color:view===v.id?"#5b8dee":"#8892a4", cursor:"pointer", fontSize:14, fontWeight:view===v.id?600:400, textAlign:"left" }}>
              <span style={{ fontSize:16, width:20, textAlign:"center" }}>{v.icon}</span>{v.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"16px 20px", borderTop:"1px solid #1e2a3a", fontSize:11, color:"#8892a4" }}>
          {atenciones.length} atenciones<br/>{estilistas.length} estilistas
        </div>
      </div>

      <div style={{ flex:1, overflow:"auto" }}>
        <div style={{ padding:"24px 28px", borderBottom:"1px solid #1e2a3a", background:"#111827" }}>
          <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:"#e2e8f0" }}>{viewTitles[view]}</h1>
        </div>
        <div style={{ padding:24 }}>
          {error && <div style={{ background:"#2d1515", border:"1px solid #e8614e", borderRadius:8, padding:16, color:"#e8614e", marginBottom:20, fontSize:14 }}>⚠️ {error}</div>}
          {view==="atenciones" && <Atenciones atenciones={atenciones} loading={loadingAten} onAdd={addAtencion} estilistas={estilistas} />}
          {view==="estilistas" && <Estilistas estilistas={estilistas} loading={loadingEst} onAdd={addEstilista} onDelete={deleteEstilista} onUpdate={updateEstilista} />}
        </div>
      </div>
    </div>
  );
}
