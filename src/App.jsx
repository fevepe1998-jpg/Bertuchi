import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_TRANSACCIONES = [];

const SEED_PRESUPUESTOS = [];
const SEED_METAS = [];
const SEED_DEUDAS = [];
const SEED_INVERSIONES = [];
const SEED_HABITOS = [];

// ── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-CO", { style:"currency", currency:"COP", maximumFractionDigits:0 }).format(n);
const fmtShort = (n) => {
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(0) + "k";
  return n.toString();
};
const mesLabel = { "2026-05":"Mayo 2026","2026-04":"Abril 2026","2026-03":"Marzo 2026","2026-02":"Febrero 2026" };

const CAT_COLORS = {
  Alimentación:"#e8614e", Transporte:"#f0a030", Vivienda:"#5b8dee",
  Entretenimiento:"#a855f7", Salud:"#10b981", Educación:"#06b6d4",
  Compras:"#f43f5e", Servicios:"#64748b", Negocio:"#8b5cf6", Otros:"#94a3b8",
};

// ── COMPONENTS ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "#5b8dee", icon, delta }) {
  return (
    <div style={{
      background:"#1a1f2e", border:"1px solid #2a3042",
      borderRadius:12, padding:"16px 18px", display:"flex",
      flexDirection:"column", gap:4
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#8892a4", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
        {icon && <span style={{ fontSize:18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1.2 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"#8892a4" }}>{sub}</div>}
      {delta !== undefined && (
        <div style={{ fontSize:12, color: delta >= 0 ? "#10b981" : "#e8614e", fontWeight:500 }}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs mes anterior
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, max, color = "#5b8dee", height = 8 }) {
  const pct = Math.min((value / max) * 100, 100);
  const over = value > max;
  return (
    <div style={{ background:"#2a3042", borderRadius:99, height, overflow:"hidden" }}>
      <div style={{
        width: pct + "%", height:"100%", borderRadius:99,
        background: over ? "#e8614e" : color,
        transition:"width 0.4s ease"
      }} />
    </div>
  );
}

function Alert({ type, msg }) {
  const colors = { warning:["#f0a030","#2d2310"], danger:["#e8614e","#2d1515"], info:["#5b8dee","#111a2d"] };
  const [c, bg] = colors[type] || colors.info;
  return (
    <div style={{ background:bg, border:`1px solid ${c}40`, borderRadius:8, padding:"10px 14px", fontSize:13, color:c, display:"flex", gap:8, alignItems:"center" }}>
      <span>{type==="danger"?"🔴":type==="warning"?"🟡":"🔵"}</span> {msg}
    </div>
  );
}

// ── VIEWS ────────────────────────────────────────────────────────────────────

function Dashboard({ transacciones, presupuestos, metas, deudas, inversiones }) {
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
  const mesPasado = hoy.getMonth()===0
    ? `${hoy.getFullYear()-1}-12`
    : `${hoy.getFullYear()}-${String(hoy.getMonth()).padStart(2,"0")}`;

  const txMes = transacciones.filter(t => t.fecha.startsWith(mesActual));
  const txAnt = transacciones.filter(t => t.fecha.startsWith(mesPasado));

  const ingresos = txMes.filter(t=>t.tipo==="ingreso").reduce((s,t)=>s+t.monto,0);
  const gastos   = txMes.filter(t=>t.tipo==="gasto").reduce((s,t)=>s+t.monto,0);
  const ahorro   = txMes.filter(t=>t.tipo==="ahorro").reduce((s,t)=>s+t.monto,0);
  const balance  = ingresos - gastos;
  const tasaAhorro = ingresos>0 ? (ahorro/ingresos)*100 : 0;
  const cuotasDeuda = deudas.reduce((s,d)=>s+d.cuotaMensual,0);
  const nivelDeuda  = ingresos>0 ? (cuotasDeuda/ingresos)*100 : 0;
  const totalDeudas = deudas.reduce((s,d)=>s+d.saldoActual,0);
  const totalInversiones = inversiones.reduce((s,i)=>s+i.valorActual,0);
  const patrimonio = totalInversiones - totalDeudas;
  const hormiga = txMes.filter(t=>t.esHormiga).reduce((s,t)=>s+t.monto,0);

  const ingAnt = txAnt.filter(t=>t.tipo==="ingreso").reduce((s,t)=>s+t.monto,0);
  const gastAnt= txAnt.filter(t=>t.tipo==="gasto").reduce((s,t)=>s+t.monto,0);
  const deltaIng = ingAnt>0 ? ((ingresos-ingAnt)/ingAnt)*100 : 0;
  const deltaGast= gastAnt>0 ? ((gastos-gastAnt)/gastAnt)*100 : 0;

  // Gráfico barras mes a mes
  const mesesData = ["2026-03","2026-04","2026-05"].map(m => ({
    mes: mesLabel[m]?.split(" ")[0] || m,
    Ingresos: transacciones.filter(t=>t.fecha.startsWith(m)&&t.tipo==="ingreso").reduce((s,t)=>s+t.monto,0),
    Gastos: transacciones.filter(t=>t.fecha.startsWith(m)&&t.tipo==="gasto").reduce((s,t)=>s+t.monto,0),
  }));

  // Donut gastos por categoría
  const catMap = {};
  txMes.filter(t=>t.tipo==="gasto").forEach(t => { catMap[t.categoria]=(catMap[t.categoria]||0)+t.monto; });
  const donutData = Object.entries(catMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);

  // Alertas
  const alertas = [];
  if (nivelDeuda > 30) alertas.push({ type:"warning", msg:`Nivel de endeudamiento en ${nivelDeuda.toFixed(1)}% — supera el límite recomendado del 30%` });
  if (tasaAhorro < 10) alertas.push({ type:"info", msg:`Tasa de ahorro de ${tasaAhorro.toFixed(1)}% — se recomienda al menos el 10%` });
  presupuestos.filter(p=>p.mes===mesActual).forEach(p => {
    const gastado = txMes.filter(t=>t.tipo==="gasto"&&t.categoria===p.categoria).reduce((s,t)=>s+t.monto,0);
    if (gastado > p.limite) alertas.push({ type:"danger", msg:`Presupuesto de ${p.categoria} excedido en ${fmt(gastado-p.limite)}` });
  });

  const catMayor = donutData[0];

  const customTooltip = ({ active, payload }) => {
    if (active && payload?.length) return (
      <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
        {payload.map((p,i)=>(
          <div key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</div>
        ))}
      </div>
    );
    return null;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {alertas.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {alertas.map((a,i) => <Alert key={i} {...a} />)}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
        <KpiCard label="Ingresos del mes" value={fmt(ingresos)} icon="💰" color="#10b981" delta={deltaIng} />
        <KpiCard label="Gastos del mes" value={fmt(gastos)} icon="💸" color="#e8614e" delta={deltaGast} />
        <KpiCard label="Balance mensual" value={fmt(balance)} icon="⚖️" color={balance>=0?"#10b981":"#e8614e"} />
        <KpiCard label="Tasa de ahorro" value={tasaAhorro.toFixed(1)+"%"} icon="🐖" color={tasaAhorro>=10?"#10b981":"#f0a030"} sub={`${fmt(ahorro)} ahorrados`} />
        <KpiCard label="Endeudamiento" value={nivelDeuda.toFixed(1)+"%"} icon="🔗" color={nivelDeuda<=30?"#10b981":"#e8614e"} sub={`Cuotas: ${fmt(cuotasDeuda)}/mes`} />
        <KpiCard label="Gastos hormiga" value={fmt(hormiga)} icon="🐜" color="#f0a030" sub="Pequeños gastos diarios" />
        <KpiCard label="Mayor categoría" value={catMayor?.name||"—"} icon="📊" color="#a855f7" sub={catMayor?fmt(catMayor.value):"sin datos"} />
        <KpiCard label="Patrimonio neto" value={fmt(patrimonio)} icon="🏦" color={patrimonio>=0?"#10b981":"#e8614e"} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:13, color:"#8892a4", fontWeight:500, marginBottom:12 }}>INGRESOS VS GASTOS</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mesesData} barGap={4}>
              <XAxis dataKey="mes" tick={{ fontSize:11, fill:"#8892a4" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:"#8892a4" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="Gastos" fill="#e8614e" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:13, color:"#8892a4", fontWeight:500, marginBottom:12 }}>GASTOS POR CATEGORÍA</div>
          {donutData.length === 0 ? <div style={{ color:"#8892a4", fontSize:13, textAlign:"center", paddingTop:40 }}>Sin datos este mes</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {donutData.map((entry,i) => (
                    <Cell key={i} fill={CAT_COLORS[entry.name]||"#64748b"} />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:13, color:"#8892a4", fontWeight:500, marginBottom:12 }}>PRESUPUESTOS — MAYO</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {presupuestos.filter(p=>p.mes===mesActual).map(p => {
              const gastado = txMes.filter(t=>t.tipo==="gasto"&&t.categoria===p.categoria).reduce((s,t)=>s+t.monto,0);
              const over = gastado > p.limite;
              return (
                <div key={p.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13, color:"#e2e8f0" }}>{p.categoria}</span>
                    <span style={{ fontSize:12, color: over?"#e8614e":"#8892a4" }}>
                      {fmt(gastado)} / {fmt(p.limite)}
                    </span>
                  </div>
                  <ProgressBar value={gastado} max={p.limite} color={over?"#e8614e":"#5b8dee"} />
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:13, color:"#8892a4", fontWeight:500, marginBottom:12 }}>METAS DE AHORRO</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {metas.filter(m=>m.activa).map(m => {
              const pct = Math.min((m.montoActual/m.montoMeta)*100,100);
              const faltante = m.montoMeta - m.montoActual;
              return (
                <div key={m.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13, color:"#e2e8f0" }}>{m.nombre}</span>
                    <span style={{ fontSize:12, color:"#10b981" }}>{pct.toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={m.montoActual} max={m.montoMeta} color="#10b981" />
                  <div style={{ fontSize:11, color:"#8892a4", marginTop:3 }}>
                    {fmt(m.montoActual)} de {fmt(m.montoMeta)} · Falta {fmt(faltante)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Registro({ onAdd }) {
  const [form, setForm] = useState({ tipo:"gasto", categoria:"Alimentación", monto:"", descripcion:"", fecha:new Date().toISOString().split("T")[0], esHormiga:false, esRecurrente:false });
  const [saved, setSaved] = useState(false);

  const cats = {
    ingreso:["Salario","Negocio","Ventas","Comisiones","Freelance","Rendimientos","Otros"],
    gasto:["Alimentación","Transporte","Vivienda","Servicios","Entretenimiento","Salud","Educación","Deudas","Compras","Negocio","Otros"],
    ahorro:["Ahorro"], inversión:["Inversión"], transferencia:["Transferencia"],
  };

  const handle = (k,v) => setForm(f => ({ ...f, [k]:v, ...(k==="tipo"?{categoria:(cats[v]||["Otros"])[0]}:{}) }));

  const submit = () => {
    if (!form.monto || !form.descripcion) return;
    onAdd({ ...form, id:"t"+Date.now(), monto:parseInt(form.monto.replace(/\D/g,""),10) });
    setForm(f=>({...f, monto:"", descripcion:"", esHormiga:false, esRecurrente:false}));
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const inputStyle = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
  const labelStyle = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  const tipoColors = { gasto:"#e8614e", ingreso:"#10b981", ahorro:"#5b8dee", inversión:"#a855f7", transferencia:"#f0a030" };

  return (
    <div style={{ maxWidth:520, display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
        {["gasto","ingreso","ahorro","inversión","transferencia"].map(t => (
          <button key={t} onClick={()=>handle("tipo",t)} style={{
            padding:"8px 4px", borderRadius:8, border:`1px solid ${form.tipo===t?tipoColors[t]:"#2a3042"}`,
            background: form.tipo===t?tipoColors[t]+"22":"#1a1f2e", color: form.tipo===t?tipoColors[t]:"#8892a4",
            cursor:"pointer", fontSize:12, fontWeight:500, textTransform:"capitalize"
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div>
          <label style={labelStyle}>Fecha</label>
          <input type="date" style={inputStyle} value={form.fecha} onChange={e=>handle("fecha",e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Categoría</label>
          <select style={inputStyle} value={form.categoria} onChange={e=>handle("categoria",e.target.value)}>
            {(cats[form.tipo]||["Otros"]).map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Monto (COP)</label>
        <input type="text" style={inputStyle} placeholder="Ej: 85000" value={form.monto} onChange={e=>handle("monto",e.target.value)} />
      </div>

      <div>
        <label style={labelStyle}>Descripción</label>
        <input type="text" style={inputStyle} placeholder="¿En qué fue?" value={form.descripcion} onChange={e=>handle("descripcion",e.target.value)} />
      </div>

      {form.tipo==="gasto" && (
        <div style={{ display:"flex", gap:16 }}>
          {[["esHormiga","🐜 Gasto hormiga"],["esRecurrente","🔁 Recurrente"]].map(([k,lbl])=>(
            <label key={k} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color: form[k]?"#e2e8f0":"#8892a4" }}>
              <input type="checkbox" checked={form[k]} onChange={e=>handle(k,e.target.checked)} style={{ accentColor:"#5b8dee" }} />
              {lbl}
            </label>
          ))}
        </div>
      )}

      <button onClick={submit} style={{
        padding:"12px 24px", borderRadius:8, border:"none",
        background: saved?"#10b981":"#5b8dee", color:"#fff",
        cursor:"pointer", fontSize:15, fontWeight:600, transition:"background 0.3s"
      }}>
        {saved ? "✓ Guardado" : "Registrar"}
      </button>
    </div>
  );
}

function Gastos({ transacciones }) {
  const [mes, setMes] = useState("2026-05");
  const [catFilter, setCatFilter] = useState("Todas");

  const txMes = transacciones.filter(t=>t.tipo==="gasto"&&t.fecha.startsWith(mes));
  const cats = ["Todas",...new Set(txMes.map(t=>t.categoria))];
  const txFilt = catFilter==="Todas" ? txMes : txMes.filter(t=>t.categoria===catFilter);

  const total = txMes.reduce((s,t)=>s+t.monto,0);
  const hormiga = txMes.filter(t=>t.esHormiga).reduce((s,t)=>s+t.monto,0);
  const dias = [...new Set(txMes.map(t=>t.fecha))].length || 1;
  const promDiario = total / dias;

  const catMap = {};
  txMes.forEach(t => { catMap[t.categoria]=(catMap[t.categoria]||0)+t.monto; });
  const catMayor = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];

  const inputStyle = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"8px 12px", fontSize:13 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KpiCard label="Total gastado" value={fmt(total)} color="#e8614e" icon="💸" />
        <KpiCard label="Promedio diario" value={fmt(Math.round(promDiario))} color="#f0a030" icon="📅" />
        <KpiCard label="Mayor categoría" value={catMayor?catMayor[0]:"—"} color="#a855f7" icon="📊" sub={catMayor?fmt(catMayor[1]):""} />
        <KpiCard label="Gastos hormiga" value={fmt(hormiga)} color="#f0a030" icon="🐜" />
      </div>

      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <select style={inputStyle} value={mes} onChange={e=>setMes(e.target.value)}>
          {["2026-05","2026-04","2026-03"].map(m=><option key={m} value={m}>{mesLabel[m]}</option>)}
        </select>
        <select style={inputStyle} value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#111827" }}>
              {["Fecha","Categoría","Descripción","Monto","Tipo"].map(h=>(
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:12, color:"#8892a4", fontWeight:600, letterSpacing:"0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txFilt.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(t=>(
              <tr key={t.id} style={{ borderTop:"1px solid #2a3042" }}>
                <td style={{ padding:"10px 14px", fontSize:13, color:"#8892a4" }}>{t.fecha.slice(5)}</td>
                <td style={{ padding:"10px 14px" }}>
                  <span style={{ fontSize:12, padding:"3px 8px", borderRadius:20, background:(CAT_COLORS[t.categoria]||"#64748b")+"22", color:CAT_COLORS[t.categoria]||"#94a3b8" }}>{t.categoria}</span>
                </td>
                <td style={{ padding:"10px 14px", fontSize:13, color:"#e2e8f0" }}>{t.descripcion}</td>
                <td style={{ padding:"10px 14px", fontSize:13, color:"#e8614e", fontWeight:600 }}>{fmt(t.monto)}</td>
                <td style={{ padding:"10px 14px", fontSize:12, color:"#8892a4" }}>
                  {t.esHormiga?"🐜":""}{t.esRecurrente?"🔁":""}
                  {!t.esHormiga&&!t.esRecurrente?"—":""}
                </td>
              </tr>
            ))}
            {txFilt.length===0&&<tr><td colSpan={5} style={{ padding:24, textAlign:"center", color:"#8892a4", fontSize:13 }}>Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Ingresos({ transacciones }) {
  const [mes, setMes] = useState("2026-05");
  const txMes = transacciones.filter(t=>t.tipo==="ingreso"&&t.fecha.startsWith(mes));
  const txAnt = transacciones.filter(t=>t.tipo==="ingreso"&&t.fecha.startsWith(
    mes==="2026-05"?"2026-04":mes==="2026-04"?"2026-03":"2026-02"
  ));
  const total = txMes.reduce((s,t)=>s+t.monto,0);
  const totalAnt = txAnt.reduce((s,t)=>s+t.monto,0);
  const delta = totalAnt>0 ? ((total-totalAnt)/totalAnt)*100 : 0;
  const recurrente = txMes.filter(t=>t.esRecurrente).reduce((s,t)=>s+t.monto,0);
  const variable = total - recurrente;

  const inputStyle = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"8px 12px", fontSize:13 };

  const lineData = ["2026-03","2026-04","2026-05"].map(m => ({
    mes: mesLabel[m]?.split(" ")[0]||m,
    Ingresos: transacciones.filter(t=>t.tipo==="ingreso"&&t.fecha.startsWith(m)).reduce((s,t)=>s+t.monto,0)
  }));

  const customTooltip = ({ active, payload }) => {
    if (active && payload?.length) return (
      <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
        <div style={{ color:"#10b981" }}>{fmt(payload[0].value)}</div>
      </div>
    );
    return null;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KpiCard label="Ingreso total" value={fmt(total)} color="#10b981" icon="💰" delta={delta} />
        <KpiCard label="Recurrente" value={fmt(recurrente)} color="#5b8dee" icon="🔁" />
        <KpiCard label="Variable" value={fmt(variable)} color="#a855f7" icon="⚡" />
        <KpiCard label="Promedio diario" value={fmt(Math.round(total/30))} color="#f0a030" icon="📅" />
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <select style={inputStyle} value={mes} onChange={e=>setMes(e.target.value)}>
          {["2026-05","2026-04","2026-03"].map(m=><option key={m} value={m}>{mesLabel[m]}</option>)}
        </select>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:13, color:"#8892a4", fontWeight:500, marginBottom:12 }}>EVOLUCIÓN DE INGRESOS</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={lineData}>
              <XAxis dataKey="mes" tick={{ fontSize:11, fill:"#8892a4" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:"#8892a4" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <Tooltip content={customTooltip} />
              <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2} dot={{ fill:"#10b981", r:4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#111827" }}>
                {["Fecha","Categoría","Descripción","Monto"].map(h=>(
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:12, color:"#8892a4", fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txMes.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(t=>(
                <tr key={t.id} style={{ borderTop:"1px solid #2a3042" }}>
                  <td style={{ padding:"10px 14px", fontSize:13, color:"#8892a4" }}>{t.fecha.slice(5)}</td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:"#10b981" }}>{t.categoria}</td>
                  <td style={{ padding:"10px 14px", fontSize:13, color:"#e2e8f0" }}>{t.descripcion}</td>
                  <td style={{ padding:"10px 14px", fontSize:13, color:"#10b981", fontWeight:600 }}>{fmt(t.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Presupuestos({ transacciones, presupuestos, onAddPresupuesto }) {
  const mes = "2026-05";
  const [form, setForm] = useState({ categoria:"Alimentación", limite:"" });
  const [saved, setSaved] = useState(false);
  const txMes = transacciones.filter(t=>t.tipo==="gasto"&&t.fecha.startsWith(mes));
  const cats = ["Alimentación","Transporte","Vivienda","Servicios","Entretenimiento","Salud","Educación","Deudas","Compras","Negocio","Otros"];

  const submit = () => {
    if (!form.limite) return;
    onAddPresupuesto({ id:"pp"+Date.now(), categoria:form.categoria, mes, limite:parseInt(form.limite,10) });
    setForm({categoria:"Alimentación", limite:""});
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const inputStyle = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box" };
  const labelStyle = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {presupuestos.filter(p=>p.mes===mes).map(p => {
            const gastado = txMes.filter(t=>t.categoria===p.categoria).reduce((s,t)=>s+t.monto,0);
            const over = gastado > p.limite;
            const pct = Math.min((gastado/p.limite)*100,100);
            return (
              <div key={p.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, color:"#e2e8f0", fontWeight:500 }}>{p.categoria}</div>
                    <div style={{ fontSize:12, color:"#8892a4" }}>Límite: {fmt(p.limite)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:16, fontWeight:700, color: over?"#e8614e":"#10b981" }}>{fmt(gastado)}</div>
                    <div style={{ fontSize:11, color: over?"#e8614e":"#8892a4" }}>{over?"Excedido en "+fmt(gastado-p.limite):"Disponible: "+fmt(p.limite-gastado)}</div>
                  </div>
                </div>
                <ProgressBar value={gastado} max={p.limite} color={over?"#e8614e":pct>75?"#f0a030":"#10b981"} height={10} />
                <div style={{ textAlign:"right", fontSize:11, color:"#8892a4", marginTop:4 }}>{pct.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, height:"fit-content" }}>
          <div style={{ fontSize:14, color:"#e2e8f0", fontWeight:600, marginBottom:16 }}>Nuevo presupuesto — {mesLabel[mes]}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <label style={labelStyle}>Categoría</label>
              <select style={inputStyle} value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                {cats.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Límite mensual (COP)</label>
              <input type="number" style={inputStyle} placeholder="500000" value={form.limite} onChange={e=>setForm(f=>({...f,limite:e.target.value}))} />
            </div>
            <button onClick={submit} style={{ padding:"10px", borderRadius:8, border:"none", background:saved?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14 }}>
              {saved?"✓ Guardado":"Guardar presupuesto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ahorro({ transacciones, metas, onAddMeta }) {
  const [form, setForm] = useState({ nombre:"", montoMeta:"", fechaObjetivo:"" });
  const [saved, setSaved] = useState(false);
  const ahorro3m = ["2026-03","2026-04","2026-05"].map(m => ({
    mes: mesLabel[m]?.split(" ")[0]||m,
    Ahorro: transacciones.filter(t=>t.tipo==="ahorro"&&t.fecha.startsWith(m)).reduce((s,t)=>s+t.monto,0)
  }));
  const totalAhorrado = metas.reduce((s,m)=>s+m.montoActual,0);
  const ingresosMayo = transacciones.filter(t=>t.tipo==="ingreso"&&t.fecha.startsWith("2026-05")).reduce((s,t)=>s+t.monto,0);
  const ahorroMayo = transacciones.filter(t=>t.tipo==="ahorro"&&t.fecha.startsWith("2026-05")).reduce((s,t)=>s+t.monto,0);
  const tasa = ingresosMayo>0 ? (ahorroMayo/ingresosMayo)*100 : 0;

  const inputStyle = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box" };
  const labelStyle = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  const submit = () => {
    if (!form.nombre||!form.montoMeta) return;
    onAddMeta({ id:"m"+Date.now(), nombre:form.nombre, montoMeta:parseInt(form.montoMeta,10), montoActual:0, fechaObjetivo:form.fechaObjetivo, activa:true });
    setForm({nombre:"",montoMeta:"",fechaObjetivo:""});
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const customTooltip = ({ active, payload }) => active&&payload?.length ? (
    <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#10b981" }}>{fmt(payload[0].value)}</div>
  ) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <KpiCard label="Ahorrado en mayo" value={fmt(ahorroMayo)} color="#10b981" icon="🐖" />
        <KpiCard label="Tasa de ahorro" value={tasa.toFixed(1)+"%"} color={tasa>=10?"#10b981":"#f0a030"} icon="📈" />
        <KpiCard label="Total en metas" value={fmt(totalAhorrado)} color="#5b8dee" icon="🎯" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, color:"#8892a4", fontWeight:500, marginBottom:12 }}>AHORRO MENSUAL</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={ahorro3m}>
                <XAxis dataKey="mes" tick={{ fontSize:11, fill:"#8892a4" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:"#8892a4" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="Ahorro" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {metas.filter(m=>m.activa).map(m => {
            const pct = (m.montoActual/m.montoMeta)*100;
            const faltante = m.montoMeta - m.montoActual;
            const mesesNec = ahorroMayo>0 ? Math.ceil(faltante/ahorroMayo) : "∞";
            return (
              <div key={m.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16, marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontSize:14, color:"#e2e8f0", fontWeight:500 }}>🎯 {m.nombre}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#10b981" }}>{pct.toFixed(0)}%</div>
                </div>
                <ProgressBar value={m.montoActual} max={m.montoMeta} color="#10b981" height={10} />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:12, color:"#8892a4" }}>
                  <span>{fmt(m.montoActual)} / {fmt(m.montoMeta)}</span>
                  <span>{mesesNec} meses al ritmo actual</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, height:"fit-content" }}>
          <div style={{ fontSize:14, color:"#e2e8f0", fontWeight:600, marginBottom:16 }}>Nueva meta de ahorro</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div><label style={labelStyle}>Nombre de la meta</label><input style={inputStyle} placeholder="Viaje, fondo, etc." value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
            <div><label style={labelStyle}>Monto objetivo (COP)</label><input type="number" style={inputStyle} placeholder="5000000" value={form.montoMeta} onChange={e=>setForm(f=>({...f,montoMeta:e.target.value}))} /></div>
            <div><label style={labelStyle}>Fecha objetivo</label><input type="date" style={inputStyle} value={form.fechaObjetivo} onChange={e=>setForm(f=>({...f,fechaObjetivo:e.target.value}))} /></div>
            <button onClick={submit} style={{ padding:"10px", borderRadius:8, border:"none", background:saved?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14 }}>
              {saved?"✓ Creada":"Crear meta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Deudas({ deudas, transacciones }) {
  const ingresosMayo = transacciones.filter(t=>t.tipo==="ingreso"&&t.fecha.startsWith("2026-05")).reduce((s,t)=>s+t.monto,0);
  const totalDeuda = deudas.reduce((s,d)=>s+d.saldoActual,0);
  const cuotasTotal = deudas.reduce((s,d)=>s+d.cuotaMensual,0);
  const comprometido = ingresosMayo>0 ? (cuotasTotal/ingresosMayo)*100 : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <KpiCard label="Deuda total" value={fmt(totalDeuda)} color="#e8614e" icon="🔗" />
        <KpiCard label="Cuota mensual" value={fmt(cuotasTotal)} color="#f0a030" icon="📆" />
        <KpiCard label="% ingreso comprometido" value={comprometido.toFixed(1)+"%"} color={comprometido<=30?"#10b981":"#e8614e"} icon="⚠️" />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {deudas.map(d => {
          const avance = ((d.saldoInicial-d.saldoActual)/d.saldoInicial)*100;
          return (
            <div key={d.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>{d.nombre}</div>
                  <div style={{ fontSize:12, color:"#8892a4" }}>{d.entidad} · Pago día {d.fechaPago} · {d.tasaInteres}% mensual</div>
                </div>
                <span style={{ fontSize:11, padding:"4px 10px", borderRadius:20, background: d.estado==="activa"?"#f0a03022":"#10b98122", color:d.estado==="activa"?"#f0a030":"#10b981", fontWeight:500 }}>{d.estado}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
                <div><div style={{ fontSize:11, color:"#8892a4" }}>SALDO INICIAL</div><div style={{ fontSize:14, color:"#e2e8f0", fontWeight:500 }}>{fmt(d.saldoInicial)}</div></div>
                <div><div style={{ fontSize:11, color:"#8892a4" }}>SALDO ACTUAL</div><div style={{ fontSize:14, color:"#e8614e", fontWeight:600 }}>{fmt(d.saldoActual)}</div></div>
                <div><div style={{ fontSize:11, color:"#8892a4" }}>CUOTA MENSUAL</div><div style={{ fontSize:14, color:"#f0a030", fontWeight:500 }}>{fmt(d.cuotaMensual)}</div></div>
              </div>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, color:"#8892a4" }}>Avance de pago</span>
                  <span style={{ fontSize:12, color:"#10b981" }}>{avance.toFixed(0)}%</span>
                </div>
                <ProgressBar value={d.saldoInicial-d.saldoActual} max={d.saldoInicial} color="#10b981" height={8} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Inversiones({ inversiones }) {
  const totalInvertido = inversiones.reduce((s,i)=>s+i.montoInvertido,0);
  const totalActual = inversiones.reduce((s,i)=>s+i.valorActual,0);
  const ganancia = totalActual - totalInvertido;
  const rendimiento = totalInvertido>0 ? (ganancia/totalInvertido)*100 : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KpiCard label="Total invertido" value={fmt(totalInvertido)} color="#a855f7" icon="📊" />
        <KpiCard label="Valor actual" value={fmt(totalActual)} color="#5b8dee" icon="💹" />
        <KpiCard label="Ganancia/Pérdida" value={fmt(ganancia)} color={ganancia>=0?"#10b981":"#e8614e"} icon="📈" />
        <KpiCard label="Rendimiento" value={rendimiento.toFixed(1)+"%"} color={rendimiento>=0?"#10b981":"#e8614e"} icon="🎯" />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {inversiones.map(inv => {
          const gananciaPct = ((inv.valorActual-inv.montoInvertido)/inv.montoInvertido)*100;
          return (
            <div key={inv.id} style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:16, display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", alignItems:"center", gap:12 }}>
              <div>
                <div style={{ fontSize:14, color:"#e2e8f0", fontWeight:500 }}>{inv.tipo}</div>
                <div style={{ fontSize:12, color:"#8892a4" }}>Desde {inv.fecha}</div>
              </div>
              <div><div style={{ fontSize:11, color:"#8892a4" }}>INVERTIDO</div><div style={{ fontSize:13, color:"#e2e8f0" }}>{fmt(inv.montoInvertido)}</div></div>
              <div><div style={{ fontSize:11, color:"#8892a4" }}>VALOR HOY</div><div style={{ fontSize:13, color:"#5b8dee" }}>{fmt(inv.valorActual)}</div></div>
              <div><div style={{ fontSize:11, color:"#8892a4" }}>GANANCIA</div><div style={{ fontSize:13, color: inv.valorActual>=inv.montoInvertido?"#10b981":"#e8614e" }}>{fmt(inv.valorActual-inv.montoInvertido)}</div></div>
              <div><div style={{ fontSize:11, color:"#8892a4" }}>REND.</div><div style={{ fontSize:14, fontWeight:700, color: gananciaPct>=0?"#10b981":"#e8614e" }}>{gananciaPct.toFixed(1)}%</div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Habitos({ habitos, onAddHabito }) {
  const hoy = new Date().toISOString().split("T")[0];
  const habitoHoy = habitos.find(h=>h.fecha===hoy);
  const [form, setForm] = useState(habitoHoy || { fecha:hoy, registroGastos:false, fueraDePpsto:false, ahorroHoy:false, compraImpulso:false, revisionFinanzas:false });
  const [saved, setSaved] = useState(false);

  const score = (h) => {
    let s = 0;
    if (h.registroGastos) s+=25;
    if (!h.fueraDePpsto) s+=25;
    if (h.ahorroHoy) s+=20;
    if (!h.compraImpulso) s+=20;
    if (h.revisionFinanzas) s+=10;
    return s;
  };

  const promedioScore = habitos.length > 0 ? Math.round(habitos.reduce((s,h)=>s+score(h),0)/habitos.length) : 0;

  const submit = () => {
    onAddHabito({...form});
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const preguntas = [
    { key:"registroGastos", label:"¿Registré mis gastos hoy?", positivo:true, icon:"📝" },
    { key:"revisionFinanzas", label:"¿Revisé mis finanzas hoy?", positivo:true, icon:"👁️" },
    { key:"ahorroHoy", label:"¿Ahorré algo hoy?", positivo:true, icon:"🐖" },
    { key:"fueraDePpsto", label:"¿Gasté fuera del presupuesto?", positivo:false, icon:"⚠️" },
    { key:"compraImpulso", label:"¿Compré por impulso?", positivo:false, icon:"🛒" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <KpiCard label="Score hoy" value={score(form)+"/100"} color="#a855f7" icon="⭐" />
        <KpiCard label="Promedio 7 días" value={promedioScore+"/100"} color="#5b8dee" icon="📊" />
        <KpiCard label="Días registrados" value={habitos.length} color="#10b981" icon="📅" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:14, color:"#e2e8f0", fontWeight:600, marginBottom:16 }}>Check de hábitos — {hoy}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {preguntas.map(p => (
              <label key={p.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", padding:"10px 12px", borderRadius:8, background:"#111827", border:"1px solid #2a3042" }}>
                <span style={{ fontSize:13, color:"#e2e8f0" }}>{p.icon} {p.label}</span>
                <input type="checkbox" checked={form[p.key]} onChange={e=>setForm(f=>({...f,[p.key]:e.target.checked}))} style={{ width:18, height:18, accentColor:"#5b8dee", cursor:"pointer" }} />
              </label>
            ))}
          </div>
          <button onClick={submit} style={{ marginTop:16, padding:"10px", borderRadius:8, border:"none", background:saved?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, width:"100%" }}>
            {saved?"✓ Guardado":"Guardar check"}
          </button>
        </div>

        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:14, color:"#e2e8f0", fontWeight:600, marginBottom:16 }}>Historial reciente</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {habitos.slice(0,7).map(h => {
              const s = score(h);
              return (
                <div key={h.fecha} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #2a3042" }}>
                  <span style={{ fontSize:13, color:"#8892a4" }}>{h.fecha.slice(5)}</span>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {preguntas.map(p => (
                      <span key={p.key} style={{ fontSize:14, opacity: h[p.key] ? 1 : 0.2, filter: h[p.key] ? "none" : "grayscale(1)" }}>{p.icon}</span>
                    ))}
                    <span style={{ fontSize:13, fontWeight:700, color: s>=70?"#10b981":s>=40?"#f0a030":"#e8614e", marginLeft:4 }}>{s}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ESTILISTAS ────────────────────────────────────────────────────────────────
const COLORES_ESTILISTA = ["#5b8dee","#10b981","#a855f7","#f0a030","#e8614e","#06b6d4","#f43f5e","#84cc16"];

function Estilistas({ estilistas, onAdd, onDelete, onUpdate }) {
  const emptyForm = { nombre:"", telefono:"", especialidad:"", porcentajeBase:50, activo:true };
  const [form, setForm]   = useState(emptyForm);
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const inputStyle = { background:"#111827", border:"1px solid #2a3042", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
  const labelStyle = { fontSize:12, color:"#8892a4", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 };

  const submit = () => {
    if (!form.nombre.trim()) return;
    if (editId) {
      onUpdate({ ...form, id: editId });
      setEditId(null);
    } else {
      onAdd({ ...form, id:"e"+Date.now(), nombre:form.nombre.trim(), color: COLORES_ESTILISTA[estilistas.length % COLORES_ESTILISTA.length] });
    }
    setForm(emptyForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const startEdit = (e) => {
    setEditId(e.id);
    setForm({ nombre:e.nombre, telefono:e.telefono||"", especialidad:e.especialidad||"", porcentajeBase:e.porcentajeBase, activo:e.activo });
  };

  const cancelEdit = () => { setEditId(null); setForm(emptyForm); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <KpiCard label="Estilistas activos" value={estilistas.filter(e=>e.activo).length} color="#5b8dee" icon="💇" />
        <KpiCard label="Porcentaje promedio" value={estilistas.length ? Math.round(estilistas.reduce((s,e)=>s+e.porcentajeBase,0)/estilistas.length)+"%" : "—"} color="#a855f7" icon="%" />
        <KpiCard label="Total en nómina" value={estilistas.length} color="#10b981" icon="👥" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Formulario */}
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:14, height:"fit-content" }}>
          <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>
            {editId ? "✏️ Editar estilista" : "Nuevo estilista"}
          </div>

          <div>
            <label style={labelStyle}>Nombre completo *</label>
            <input style={inputStyle} placeholder="Ej: Valentina Ríos" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} />
          </div>

          <div>
            <label style={labelStyle}>Teléfono / WhatsApp</label>
            <input style={inputStyle} placeholder="Ej: 3001234567" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} />
          </div>

          <div>
            <label style={labelStyle}>Especialidad</label>
            <input style={inputStyle} placeholder="Ej: Colorista, estilista, manicurista..." value={form.especialidad} onChange={e=>setForm(f=>({...f,especialidad:e.target.value}))} />
          </div>

          <div>
            <label style={labelStyle}>Porcentaje base que recibe: <span style={{ color:"#5b8dee", fontWeight:700 }}>{form.porcentajeBase}%</span></label>
            <input type="range" min="10" max="90" step="5" value={form.porcentajeBase}
              onChange={e=>setForm(f=>({...f,porcentajeBase:parseInt(e.target.value,10)}))}
              style={{ width:"100%", accentColor:"#5b8dee", cursor:"pointer" }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#8892a4", marginTop:4 }}>
              <span>Estilista: <strong style={{ color:"#5b8dee" }}>{form.porcentajeBase}%</strong></span>
              <span>Salón: <strong style={{ color:"#10b981" }}>{100-form.porcentajeBase}%</strong></span>
            </div>
            {/* Barra visual */}
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
            <button onClick={submit} style={{ flex:1, padding:"11px", borderRadius:8, border:"none", background:saved?"#10b981":"#5b8dee", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, transition:"background 0.3s" }}>
              {saved ? "✓ Guardado" : editId ? "Guardar cambios" : "Agregar estilista"}
            </button>
            {editId && (
              <button onClick={cancelEdit} style={{ padding:"11px 16px", borderRadius:8, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:14 }}>
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {estilistas.length === 0 && (
            <div style={{ textAlign:"center", padding:40, color:"#8892a4", fontSize:14, background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12 }}>
              Aún no tienes estilistas registrados.<br />Agrega el primero.
            </div>
          )}
          {estilistas.map(e => (
            <div key={e.id} style={{ background:"#1a1f2e", border:`1px solid ${editId===e.id?"#5b8dee":"#2a3042"}`, borderRadius:12, padding:16 }}>
              {confirm === e.id ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:13, color:"#e8614e" }}>¿Eliminar a <strong>{e.nombre}</strong>? Esta acción no se puede deshacer.</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>{ onDelete(e.id); setConfirm(null); }} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:"#e8614e", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:13 }}>Sí, eliminar</button>
                    <button onClick={()=>setConfirm(null)} style={{ flex:1, padding:"8px", borderRadius:8, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:13 }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <div style={{ width:40, height:40, borderRadius:"50%", background:e.color+"22", border:`2px solid ${e.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:e.color, flexShrink:0 }}>
                        {e.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:15, fontWeight:600, color: e.activo?"#e2e8f0":"#8892a4" }}>{e.nombre}</div>
                        {e.especialidad && <div style={{ fontSize:12, color:"#8892a4" }}>{e.especialidad}</div>}
                        {e.telefono && <div style={{ fontSize:12, color:"#8892a4" }}>📱 {e.telefono}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>startEdit(e)} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #2a3042", background:"transparent", color:"#8892a4", cursor:"pointer", fontSize:12 }}>✏️</button>
                      <button onClick={()=>setConfirm(e.id)} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #e8614e22", background:"transparent", color:"#e8614e", cursor:"pointer", fontSize:12 }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ marginTop:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#8892a4", marginBottom:4 }}>
                      <span>Recibe {e.porcentajeBase}%</span>
                      <span>Salón {100-e.porcentajeBase}%</span>
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
const SERVICIOS_DEFAULT = [
  "Corte de cabello","Tinte / coloración","Mechas / balayage","Peinado",
  "Alisado / keratina","Tratamiento capilar","Manicure","Pedicure",
  "Depilación","Cejas / pestañas","Maquillaje","Masaje","Facial","Otro"
];
const METODOS_PAGO = ["Efectivo","Transferencia","Tarjeta débito","Tarjeta crédito","Nequi","Daviplata"];

function Atenciones({ atenciones, onAdd, estilistas }) {
  const hoy = new Date().toISOString().split("T")[0];
  const emptyForm = {
    fecha: hoy, cliente: "", estilistaId: "",
    servicios: [], otroServicio: "",
    subtotal: "", descuento: "0", metodoPago: "Efectivo", nota: ""
  };
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);
  const [vistaDetalle, setVistaDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  const total = Math.max(0, parseInt(form.subtotal||0,10) - parseInt(form.descuento||0,10));
  const estilistaSeleccionado = estilistas.find(e => e.id === form.estilistaId);
  const comisionEstilista = estilistaSeleccionado ? Math.round(total * estilistaSeleccionado.porcentajeBase / 100) : 0;
  const gananciaSalon = total - comisionEstilista;

  const toggleServicio = (s) => setForm(f => ({
    ...f,
    servicios: f.servicios.includes(s) ? f.servicios.filter(x=>x!==s) : [...f.servicios, s]
  }));

  const submit = () => {
    if (!form.cliente || !form.subtotal || form.servicios.length === 0) return;
    const serviciosFinales = form.otroServicio
      ? [...form.servicios, form.otroServicio]
      : form.servicios;
    const est = estilistas.find(e => e.id === form.estilistaId);
    const tot = Math.max(0, parseInt(form.subtotal,10) - parseInt(form.descuento||0,10));
    onAdd({
      id: "a" + Date.now(),
      fecha: form.fecha,
      cliente: form.cliente.trim(),
      estilistaId: form.estilistaId,
      estilista: est ? est.nombre : "",
      estilistaColor: est ? est.color : "#8892a4",
      porcentajeEstilista: est ? est.porcentajeBase : 0,
      servicios: serviciosFinales,
      subtotal: parseInt(form.subtotal, 10),
      descuento: parseInt(form.descuento||0, 10),
      total: tot,
      comisionEstilista: est ? Math.round(tot * est.porcentajeBase / 100) : 0,
      gananciaSalon: est ? tot - Math.round(tot * est.porcentajeBase / 100) : tot,
      metodoPago: form.metodoPago,
      nota: form.nota.trim(),
      numero: atenciones.length + 1,
    });
    setForm(emptyForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const atenFiltradas = atenciones.filter(a => {
    const matchBusq = busqueda === "" ||
      a.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.estilista.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.servicios.some(s => s.toLowerCase().includes(busqueda.toLowerCase()));
    const matchFecha = filtroFecha === "" || a.fecha === filtroFecha;
    return matchBusq && matchFecha;
  });

  const totalDelDia = atenciones.filter(a => a.fecha === hoy).reduce((s,a) => s + a.total, 0);
  const totalMes = atenciones.filter(a => a.fecha.startsWith(hoy.slice(0,7))).reduce((s,a) => s + a.total, 0);
  const gananciaSalonMes = atenciones.filter(a => a.fecha.startsWith(hoy.slice(0,7))).reduce((s,a) => s + (a.gananciaSalon||a.total), 0);
  const clientesUnicos = new Set(atenciones.map(a => a.cliente.toLowerCase())).size;

  const inputStyle = {
    background:"#111827", border:"1px solid #2a3042", borderRadius:8,
    color:"#e2e8f0", padding:"10px 12px", fontSize:14,
    width:"100%", boxSizing:"border-box", outline:"none"
  };
  const labelStyle = {
    fontSize:12, color:"#8892a4", fontWeight:500,
    letterSpacing:"0.05em", textTransform:"uppercase",
    display:"block", marginBottom:6
  };

  // Vista detalle / remisión
  if (vistaDetalle) {
    const a = vistaDetalle;
    return (
      <div style={{ maxWidth:480 }}>
        <button onClick={() => setVistaDetalle(null)} style={{
          background:"transparent", border:"1px solid #2a3042", borderRadius:8,
          color:"#8892a4", padding:"6px 14px", cursor:"pointer", fontSize:13, marginBottom:20
        }}>← Volver</button>

        <div style={{
          background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:16,
          padding:28, display:"flex", flexDirection:"column", gap:16
        }}>
          {/* Cabecera */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:"1px solid #2a3042", paddingBottom:16 }}>
            <div>
              <div style={{ fontSize:11, color:"#8892a4", letterSpacing:"0.08em", textTransform:"uppercase" }}>Remisión de atención</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#e2e8f0", marginTop:4 }}>✂️ Salón de Belleza</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, color:"#8892a4" }}>N° {String(a.numero).padStart(4,"0")}</div>
              <div style={{ fontSize:13, color:"#8892a4" }}>{a.fecha}</div>
            </div>
          </div>

          {/* Cliente y estilista */}
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

          {/* Servicios */}
          <div>
            <div style={{ fontSize:12, color:"#8892a4", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>Servicios realizados</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {a.servicios.map((s,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"#111827", borderRadius:8 }}>
                  <span style={{ fontSize:14, color:"#e2e8f0" }}>✂ {s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cobro */}
          <div style={{ background:"#111827", borderRadius:10, padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:13, color:"#8892a4" }}>Subtotal</span>
              <span style={{ fontSize:13, color:"#e2e8f0" }}>{fmt(a.subtotal)}</span>
            </div>
            {a.descuento > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, color:"#10b981" }}>Descuento</span>
                <span style={{ fontSize:13, color:"#10b981" }}>− {fmt(a.descuento)}</span>
              </div>
            )}
            <div style={{ borderTop:"1px solid #2a3042", paddingTop:8, marginTop:4, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:15, fontWeight:700, color:"#e2e8f0" }}>TOTAL</span>
              <span style={{ fontSize:18, fontWeight:700, color:"#10b981" }}>{fmt(a.total)}</span>
            </div>
            <div style={{ marginTop:8, fontSize:12, color:"#8892a4" }}>Método de pago: <span style={{ color:"#5b8dee" }}>{a.metodoPago}</span></div>
          </div>

          {a.estilista && a.porcentajeEstilista > 0 && (
            <div style={{ background:"#111827", borderRadius:10, padding:14 }}>
              <div style={{ fontSize:12, color:"#8892a4", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>Distribución de pago</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, color:"#e2e8f0" }}>💇 {a.estilista} ({a.porcentajeEstilista}%)</span>
                <span style={{ fontSize:13, fontWeight:600, color: a.estilistaColor||"#5b8dee" }}>{fmt(a.comisionEstilista)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, color:"#e2e8f0" }}>✂️ Salón ({100-a.porcentajeEstilista}%)</span>
                <span style={{ fontSize:13, fontWeight:600, color:"#10b981" }}>{fmt(a.gananciaSalon)}</span>
              </div>
              <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:8 }}>
                <div style={{ width:a.porcentajeEstilista+"%", background: a.estilistaColor||"#5b8dee" }} />
                <div style={{ flex:1, background:"#10b981" }} />
              </div>
            </div>
          )}

          {a.nota && (
            <div style={{ fontSize:13, color:"#8892a4", fontStyle:"italic", borderTop:"1px solid #2a3042", paddingTop:12 }}>
              Nota: {a.nota}
            </div>
          )}

          <div style={{ fontSize:11, color:"#8892a4", textAlign:"center", borderTop:"1px solid #2a3042", paddingTop:12 }}>
            ¡Gracias por tu visita! · Generado {new Date().toLocaleDateString("es-CO")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KpiCard label="Recaudado hoy" value={fmt(totalDelDia)} color="#10b981" icon="💅" />
        <KpiCard label="Recaudado este mes" value={fmt(totalMes)} color="#5b8dee" icon="📅" />
        <KpiCard label="Para el salón (mes)" value={fmt(gananciaSalonMes)} color="#a855f7" icon="✂️" />
        <KpiCard label="Clientes registrados" value={clientesUnicos} color="#f0a030" icon="👤" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Formulario nueva atención */}
        <div style={{ background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600 }}>Nueva atención</div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" style={inputStyle} value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} />
            </div>
            <div>
              <label style={labelStyle}>Método de pago</label>
              <select style={inputStyle} value={form.metodoPago} onChange={e=>setForm(f=>({...f,metodoPago:e.target.value}))}>
                {METODOS_PAGO.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nombre del cliente *</label>
            <input style={inputStyle} placeholder="Ej: María García" value={form.cliente} onChange={e=>setForm(f=>({...f,cliente:e.target.value}))} />
          </div>

          <div>
            <label style={labelStyle}>Estilista que atendió</label>
            {estilistas.filter(e=>e.activo).length === 0 ? (
              <div style={{ fontSize:13, color:"#f0a030", padding:"10px 12px", background:"#111827", borderRadius:8, border:"1px solid #2a3042" }}>
                ⚠️ No hay estilistas activos. Ve a <strong>Estilistas</strong> para agregar.
              </div>
            ) : (
              <select style={inputStyle} value={form.estilistaId} onChange={e=>setForm(f=>({...f,estilistaId:e.target.value}))}>
                <option value="">— Sin asignar —</option>
                {estilistas.filter(e=>e.activo).map(e => (
                  <option key={e.id} value={e.id}>{e.nombre} · {e.porcentajeBase}%</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={labelStyle}>Servicios realizados *</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {SERVICIOS_DEFAULT.filter(s=>s!=="Otro").map(s => (
                <button key={s} onClick={()=>toggleServicio(s)} style={{
                  fontSize:12, padding:"5px 10px", borderRadius:20, cursor:"pointer",
                  border: form.servicios.includes(s) ? "1px solid #5b8dee" : "1px solid #2a3042",
                  background: form.servicios.includes(s) ? "#1a2840" : "#111827",
                  color: form.servicios.includes(s) ? "#5b8dee" : "#8892a4",
                  transition:"all 0.15s"
                }}>{s}</button>
              ))}
            </div>
            <input style={{...inputStyle, marginTop:8}} placeholder="Otro servicio (escríbelo)" value={form.otroServicio} onChange={e=>setForm(f=>({...f,otroServicio:e.target.value}))} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={labelStyle}>Valor cobrado (COP) *</label>
              <input type="number" style={inputStyle} placeholder="80000" value={form.subtotal} onChange={e=>setForm(f=>({...f,subtotal:e.target.value}))} />
            </div>
            <div>
              <label style={labelStyle}>Descuento (COP)</label>
              <input type="number" style={inputStyle} placeholder="0" value={form.descuento} onChange={e=>setForm(f=>({...f,descuento:e.target.value}))} />
            </div>
          </div>

          {form.subtotal && (
            <div style={{ background:"#0d1117", borderRadius:8, padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, color:"#8892a4" }}>Total a cobrar</span>
                <span style={{ fontSize:16, fontWeight:700, color:"#10b981" }}>{fmt(total)}</span>
              </div>
              {estilistaSeleccionado && (
                <>
                  <div style={{ borderTop:"1px solid #1a1f2e", paddingTop:6, display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:"#8892a4" }}>💇 {estilistaSeleccionado.nombre} ({estilistaSeleccionado.porcentajeBase}%)</span>
                    <span style={{ fontSize:12, fontWeight:600, color: estilistaSeleccionado.color }}>{fmt(comisionEstilista)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:"#8892a4" }}>✂️ Salón ({100-estilistaSeleccionado.porcentajeBase}%)</span>
                    <span style={{ fontSize:12, fontWeight:600, color:"#10b981" }}>{fmt(gananciaSalon)}</span>
                  </div>
                  <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:6, marginTop:2 }}>
                    <div style={{ width:estilistaSeleccionado.porcentajeBase+"%", background:estilistaSeleccionado.color, transition:"width 0.2s" }} />
                    <div style={{ flex:1, background:"#10b981" }} />
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>Nota (opcional)</label>
            <input style={inputStyle} placeholder="Ej: cliente frecuente, próxima cita en 3 semanas" value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))} />
          </div>

          <button onClick={submit} style={{
            padding:"12px", borderRadius:8, border:"none",
            background: saved ? "#10b981" : "#5b8dee",
            color:"#fff", cursor:"pointer", fontSize:15, fontWeight:600, transition:"background 0.3s"
          }}>
            {saved ? "✓ Atención guardada" : "Registrar atención"}
          </button>
        </div>

        {/* Lista de atenciones */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", gap:8 }}>
            <input style={{...inputStyle, flex:1}} placeholder="🔍 Buscar cliente, estilista o servicio..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
            <input type="date" style={{...inputStyle, width:140}} value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)} title="Filtrar por fecha" />
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:520, overflowY:"auto" }}>
            {atenFiltradas.length === 0 && (
              <div style={{ textAlign:"center", padding:40, color:"#8892a4", fontSize:14 }}>
                {atenciones.length === 0 ? "Aún no hay atenciones registradas.\nEmpieza con la primera." : "Sin resultados para tu búsqueda."}
              </div>
            )}
            {atenFiltradas.sort((a,b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)).map(a => (
              <div key={a.id} onClick={() => setVistaDetalle(a)} style={{
                background:"#1a1f2e", border:"1px solid #2a3042", borderRadius:10,
                padding:"12px 16px", cursor:"pointer", transition:"border-color 0.15s"
              }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#5b8dee"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#2a3042"}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{a.cliente}</div>
                    <div style={{ fontSize:12, color:"#8892a4", marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
                      {a.fecha}
                      {a.estilista && (
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                          · <span style={{ width:8, height:8, borderRadius:"50%", background:a.estilistaColor||"#8892a4", display:"inline-block" }} />
                          <span style={{ color: a.estilistaColor||"#8892a4" }}>{a.estilista}</span>
                        </span>
                      )}
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:6 }}>
                      {a.servicios.slice(0,3).map((s,i) => (
                        <span key={i} style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#5b8dee22", color:"#5b8dee" }}>{s}</span>
                      ))}
                      {a.servicios.length > 3 && <span style={{ fontSize:11, color:"#8892a4" }}>+{a.servicios.length-3} más</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:16, fontWeight:700, color:"#10b981" }}>{fmt(a.total)}</div>
                    {a.estilista && a.porcentajeEstilista > 0 && (
                      <div style={{ fontSize:11, color:"#8892a4", marginTop:2 }}>
                        Salón: <span style={{ color:"#10b981" }}>{fmt(a.gananciaSalon)}</span>
                      </div>
                    )}
                    <div style={{ fontSize:11, color:"#8892a4", marginTop:2 }}>{a.metodoPago}</div>
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
  { id:"dashboard", label:"Dashboard", icon:"⬡" },
  { id:"atenciones", label:"Atenciones", icon:"✂" },
  { id:"estilistas", label:"Estilistas", icon:"💇" },
  { id:"registro", label:"Registrar", icon:"+" },
  { id:"ingresos", label:"Ingresos", icon:"↑" },
  { id:"gastos", label:"Gastos", icon:"↓" },
  { id:"presupuestos", label:"Presupuestos", icon:"◎" },
  { id:"ahorro", label:"Ahorro", icon:"◷" },
  { id:"deudas", label:"Deudas", icon:"⊗" },
  { id:"inversiones", label:"Inversiones", icon:"△" },
  { id:"habitos", label:"Hábitos", icon:"✓" },
];

export default function App() {
  const [view, setView] = useState("atenciones");
  const [transacciones, setTransacciones] = useState(SEED_TRANSACCIONES);
  const [presupuestos, setPresupuestos] = useState(SEED_PRESUPUESTOS);
  const [metas, setMetas] = useState(SEED_METAS);
  const [deudas] = useState(SEED_DEUDAS);
  const [inversiones] = useState(SEED_INVERSIONES);
  const [habitos, setHabitos] = useState(SEED_HABITOS);
  const [atenciones, setAtenciones] = useState([]);
  const [estilistas, setEstilistas] = useState([]);

  const addTransaccion = (t) => setTransacciones(p => [t, ...p]);
  const addPresupuesto = (p) => setPresupuestos(prev => [...prev.filter(x=>x.categoria!==p.categoria||x.mes!==p.mes), p]);
  const addMeta = (m) => setMetas(p => [...p, m]);
  const addHabito = (h) => setHabitos(p => [h, ...p.filter(x=>x.fecha!==h.fecha)]);
  const addAtencion = (a) => setAtenciones(p => [a, ...p]);
  const addEstilista = (e) => setEstilistas(p => [...p, e]);
  const deleteEstilista = (id) => setEstilistas(p => p.filter(e => e.id !== id));
  const updateEstilista = (updated) => setEstilistas(p => p.map(e => e.id === updated.id ? { ...e, ...updated } : e));

  const viewTitles = {
    dashboard:"Dashboard", atenciones:"Atenciones del salón",
    estilistas:"Estilistas", registro:"Registro diario",
    ingresos:"Ingresos", gastos:"Gastos",
    presupuestos:"Presupuestos", ahorro:"Ahorro", deudas:"Deudas",
    inversiones:"Inversiones", habitos:"Hábitos financieros"
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0d1117", fontFamily:"'DM Sans', 'Segoe UI', sans-serif", color:"#e2e8f0" }}>
      {/* Sidebar */}
      <div style={{ width:200, background:"#111827", borderRight:"1px solid #1e2a3a", padding:"24px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"0 20px 24px", borderBottom:"1px solid #1e2a3a" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", letterSpacing:"-0.02em" }}>✂️ Salón Pro</div>
          <div style={{ fontSize:11, color:"#8892a4", marginTop:2 }}>Control financiero</div>
        </div>
        <nav style={{ padding:"12px 0", flex:1 }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={()=>setView(v.id)} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%",
              padding:"10px 20px", background: view===v.id ? "#1a2840" : "transparent",
              border:"none", borderLeft: view===v.id?"3px solid #5b8dee":"3px solid transparent",
              color: view===v.id?"#5b8dee":"#8892a4",
              cursor:"pointer", fontSize:14, fontWeight: view===v.id?600:400,
              textAlign:"left", transition:"all 0.15s"
            }}>
              <span style={{ fontSize:16, width:20, textAlign:"center" }}>{v.icon}</span>
              {v.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflow:"auto" }}>
        <div style={{ padding:"24px 28px", borderBottom:"1px solid #1e2a3a", background:"#111827" }}>
          <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:"#e2e8f0" }}>{viewTitles[view]}</h1>
        </div>
        <div style={{ padding:24 }}>
          {view==="dashboard" && <Dashboard transacciones={transacciones} presupuestos={presupuestos} metas={metas} deudas={deudas} inversiones={inversiones} />}
          {view==="atenciones" && <Atenciones atenciones={atenciones} onAdd={addAtencion} estilistas={estilistas} />}
          {view==="estilistas" && <Estilistas estilistas={estilistas} onAdd={addEstilista} onDelete={deleteEstilista} onUpdate={updateEstilista} />}
          {view==="registro" && <Registro onAdd={addTransaccion} />}
          {view==="ingresos" && <Ingresos transacciones={transacciones} />}
          {view==="gastos" && <Gastos transacciones={transacciones} />}
          {view==="presupuestos" && <Presupuestos transacciones={transacciones} presupuestos={presupuestos} onAddPresupuesto={addPresupuesto} />}
          {view==="ahorro" && <Ahorro transacciones={transacciones} metas={metas} onAddMeta={addMeta} />}
          {view==="deudas" && <Deudas deudas={deudas} transacciones={transacciones} />}
          {view==="inversiones" && <Inversiones inversiones={inversiones} />}
          {view==="habitos" && <Habitos habitos={habitos} onAddHabito={addHabito} />}
        </div>
      </div>
    </div>
  );
}
