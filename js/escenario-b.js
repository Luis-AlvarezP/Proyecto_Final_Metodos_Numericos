/* =============================================
   ESCENARIO B — EDO: Vaciado de Reservas
   Euler, Heun (Euler modificado), RK4
   Todos los métodos se ejecutan simultáneamente
   ============================================= */

let chartReserva = null;
let chartError   = null;

// ─── MODELO: dR/dt = E - C₀·(1 + α·t) ───────
function f(t, R, E, C0, alpha) {
  return E - C0 * (1 + alpha * t);
}
function analitica(t, R0, E, C0, alpha) {
  return R0 + E*t - C0*(t + alpha*t*t/2);
}

// ─── MÉTODO DE EULER ──────────────────────────
function euler(R0, E, C0, alpha, h, T) {
  const pasos = [];
  let t = 0, R = R0;
  while (t <= T + 1e-9) {
    const ft  = f(t, R, E, C0, alpha);
    const Ran = analitica(t, R0, E, C0, alpha);
    pasos.push({ t, R, k1: ft, Rnuevo: R + h*ft, Ra: Ran, err: Math.abs(R - Ran) });
    R = Math.max(0, R + h * ft);
    t = parseFloat((t + h).toFixed(10));
  }
  return pasos;
}

// ─── MÉTODO DE HEUN (Euler mejorado) ─────────
function heun(R0, E, C0, alpha, h, T) {
  const pasos = [];
  let t = 0, R = R0;
  while (t <= T + 1e-9) {
    const k1    = f(t, R, E, C0, alpha);
    const Rpred = R + h * k1;
    const k2    = f(t + h, Rpred, E, C0, alpha);
    const prom  = (k1 + k2) / 2;
    const Rnuevo = R + h * prom;
    const Ran = analitica(t, R0, E, C0, alpha);
    pasos.push({ t, R, k1, Rpred, k2, prom, Rnuevo, Ra: Ran, err: Math.abs(R - Ran) });
    R = Math.max(0, Rnuevo);
    t = parseFloat((t + h).toFixed(10));
  }
  return pasos;
}

// ─── MÉTODO RK4 ───────────────────────────────
function rk4(R0, E, C0, alpha, h, T) {
  const pasos = [];
  let t = 0, R = R0;
  while (t <= T + 1e-9) {
    const k1 = f(t,       R,            E, C0, alpha);
    const k2 = f(t + h/2, R + h*k1/2,  E, C0, alpha);
    const k3 = f(t + h/2, R + h*k2/2,  E, C0, alpha);
    const k4 = f(t + h,   R + h*k3,    E, C0, alpha);
    const pond = (k1 + 2*k2 + 2*k3 + k4) / 6;
    const Rnuevo = R + h * pond;
    const Ran = analitica(t, R0, E, C0, alpha);
    pasos.push({ t, R, k1, k2, k3, k4, pond, Rnuevo, Ra: Ran, err: Math.abs(R - Ran) });
    R = Math.max(0, Rnuevo);
    t = parseFloat((t + h).toFixed(10));
  }
  return pasos;
}

// ─── TIEMPO CRÍTICO ───────────────────────────
function tiempoCritico(pasos, Rcrit) {
  for (let i = 1; i < pasos.length; i++) {
    if (pasos[i].R <= Rcrit && pasos[i-1].R > Rcrit) {
      const t0 = pasos[i-1].t, t1 = pasos[i].t;
      const R0s = pasos[i-1].R, R1 = pasos[i].R;
      return t0 + (Rcrit - R0s) * (t1 - t0) / (R1 - R0s);
    }
  }
  return null;
}

// ─── EJECUCIÓN PRINCIPAL ──────────────────────
function ejecutarSimulacion() {
  limpiarResultados();
  try {
    const R0    = parseFloat(document.getElementById('R0').value);
    const Rcrit = parseFloat(document.getElementById('Rcrit').value);
    const E     = parseFloat(document.getElementById('E').value);
    const C0    = parseFloat(document.getElementById('C0').value);
    const alpha = parseFloat(document.getElementById('alpha').value);
    const h     = parseFloat(document.getElementById('h').value);
    const T     = parseFloat(document.getElementById('T').value);

    if ([R0,Rcrit,E,C0,alpha,h,T].some(isNaN)) throw new Error('Todos los parámetros deben ser numéricos.');
    if (h <= 0) throw new Error('El paso h debe ser positivo.');
    if (T <= 0) throw new Error('El horizonte T debe ser positivo.');
    if (Rcrit >= R0) throw new Error('R_crit debe ser menor que R₀.');

    document.getElementById('resultadosSection').classList.remove('hidden');

    const pasosE = euler(R0, E, C0, alpha, h, T);
    const pasosH = heun(R0, E, C0, alpha, h, T);
    const pasosR = rk4(R0, E, C0, alpha, h, T);

    mostrarResultados({ euler: pasosE, heun: pasosH, rk4: pasosR }, R0, Rcrit, E, C0, alpha, h, T);
  } catch(e) {
    document.getElementById('alertGlobal').innerHTML =
      `<div class="alert danger"><span class="aicon">❌</span><span>${e.message}</span></div>`;
    document.getElementById('resultadosSection').classList.remove('hidden');
  }
}

// ─── MOSTRAR RESULTADOS ───────────────────────
function mostrarResultados(data, R0, Rcrit, E, C0, alpha, h, T) {
  const metodos = [
    { key:'euler', nombre:'Euler (1er Orden)', color:'#60a5fa' },
    { key:'heun',  nombre:'Heun / Euler Mod.', color:'#34d399' },
    { key:'rk4',   nombre:'Runge-Kutta 4',     color:'#fbbf24' }
  ];

  // ── KPIs ──
  const tcE = tiempoCritico(data.euler, Rcrit);
  const tcH = tiempoCritico(data.heun,  Rcrit);
  const tcR = tiempoCritico(data.rk4,   Rcrit);

  document.getElementById('kpis').innerHTML = `
    <div class="stat-box">
      <span class="stat-val" style="color:#60a5fa">${tcE !== null ? tcE.toFixed(2)+' días' : '> T'}</span>
      <span class="stat-lbl">T crítico — Euler</span>
    </div>
    <div class="stat-box">
      <span class="stat-val" style="color:#34d399">${tcH !== null ? tcH.toFixed(2)+' días' : '> T'}</span>
      <span class="stat-lbl">T crítico — Heun</span>
    </div>
    <div class="stat-box">
      <span class="stat-val" style="color:#fbbf24">${tcR !== null ? tcR.toFixed(2)+' días' : '> T'}</span>
      <span class="stat-lbl">T crítico — RK4</span>
    </div>
    <div class="stat-box">
      <span class="stat-val ok">${data.rk4.slice(-1)[0].err.toExponential(3)}</span>
      <span class="stat-lbl">Error final RK4 vs. Analítica</span>
    </div>`;

  // ── Gráfico R(t) ──
  if (chartReserva) chartReserva.destroy();
  const ctxR = document.getElementById('chartReserva').getContext('2d');
  const labelsT = data.rk4.map(p => p.t.toFixed(2));
  chartReserva = new Chart(ctxR, {
    type: 'line',
    data: {
      labels: labelsT,
      datasets: [
        ...metodos.map(m => ({
          label: m.nombre,
          data: data[m.key].map(p => parseFloat(p.R.toFixed(4))),
          borderColor: m.color, backgroundColor: m.color+'22',
          borderWidth: 2, pointRadius: 0, fill: false, tension: .3
        })),
        { label: 'Analítica (exacta)',
          data: data.rk4.map(p => parseFloat(p.Ra.toFixed(4))),
          borderColor: '#f87171', backgroundColor: '#f8717122',
          borderWidth: 2, borderDash: [6,4], pointRadius: 0, fill: false, tension: .3 },
        { label: `R_crit = ${Rcrit}`,
          data: Array(labelsT.length).fill(Rcrit),
          borderColor: '#f87171', borderWidth: 1.5, borderDash: [3,3], pointRadius: 0, fill: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 12 } } },
      scales: {
        x: { ticks:{ color:'#94a3b8', maxTicksLimit:12 }, grid:{ color:'#2d4060' },
             title:{ display:true, text:'Tiempo (días)', color:'#94a3b8' } },
        y: { ticks:{ color:'#94a3b8' }, grid:{ color:'#2d4060' },
             title:{ display:true, text:'Reserva R(t) (miles lts)', color:'#94a3b8' } }
      }
    }
  });

  // ── Gráfico error ──
  if (chartError) chartError.destroy();
  const ctxE = document.getElementById('chartError').getContext('2d');
  chartError = new Chart(ctxE, {
    type: 'line',
    data: {
      labels: labelsT,
      datasets: metodos.map(m => ({
        label: m.nombre,
        data: data[m.key].map(p => parseFloat(Math.max(1e-12, p.err).toFixed(10))),
        borderColor: m.color, backgroundColor: m.color+'22',
        borderWidth: 2, pointRadius: 0, fill: false, tension: .3
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 12 } } },
      scales: {
        x: { ticks:{ color:'#94a3b8', maxTicksLimit:12 }, grid:{ color:'#2d4060' },
             title:{ display:true, text:'Tiempo (días)', color:'#94a3b8' } },
        y: { type: 'logarithmic', ticks:{ color:'#94a3b8' }, grid:{ color:'#2d4060' },
             title:{ display:true, text:'|Error| (log)', color:'#94a3b8' } }
      }
    }
  });

  // ── Tabla comparativa ──
  document.getElementById('tablaComparacion').innerHTML = `
    <table>
      <thead><tr><th>Método</th><th>R(0)</th><th>R(T/2)</th><th>R(T)</th><th>T Crítico</th><th>Error vs. Analítica (T)</th><th>Orden</th></tr></thead>
      <tbody>
        ${metodos.map(m => {
          const ps = data[m.key];
          const mid = ps[Math.floor(ps.length/2)];
          const last = ps[ps.length-1];
          const tc = tiempoCritico(ps, Rcrit);
          const orden = m.key==='euler'?'1°':m.key==='heun'?'2°':'4°';
          return `<tr>
            <td style="color:${m.color};font-weight:700">${m.nombre}</td>
            <td>${ps[0].R.toFixed(3)}</td>
            <td>${mid.R.toFixed(3)}</td>
            <td>${last.R.toFixed(3)}</td>
            <td class="${tc?'ok':'c-muted'}">${tc !== null ? tc.toFixed(2)+' días' : 'No alcanzado'}</td>
            <td class="${last.err<1?'ok':'err'}">${last.err.toExponential(4)}</td>
            <td><span class="tag ${m.key==='rk4'?'t-green':m.key==='heun'?'t-blue':'t-orange'}">${orden}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  // ── Tabs por método ──
  const tabNav     = document.getElementById('methodTabsNav');
  const tabContent = document.getElementById('methodTabsContent');
  tabNav.innerHTML = '';
  tabContent.innerHTML = '';
  metodos.forEach((m, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (idx===0 ? ' active' : '');
    btn.style.borderBottomColor = idx===0 ? m.color : 'transparent';
    btn.style.color = idx===0 ? m.color : '';
    btn.textContent = m.nombre;
    btn.onclick = () => {
      tabNav.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.style.borderBottomColor='transparent'; b.style.color=''; });
      tabContent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.style.borderBottomColor = m.color;
      btn.style.color = m.color;
      document.getElementById(`tbm_${m.key}`).classList.add('active');
    };
    tabNav.appendChild(btn);
    const pane = document.createElement('div');
    pane.className = 'tab-pane' + (idx===0 ? ' active' : '');
    pane.id = `tbm_${m.key}`;
    pane.innerHTML = buildStepTable(m, data[m.key], Rcrit, h);
    tabContent.appendChild(pane);
  });

  // ── Interpretación ──
  const consDiaT = C0 * (1 + alpha * T);
  document.getElementById('interpretacion').innerHTML = `
    <h4>📝 Interpretación de Resultados</h4>
    <ul>
      <li>Con E=${E}, C₀=${C0}, α=${alpha}: el consumo en día T=${T} es <strong>${consDiaT.toFixed(2)} miles lts/día</strong>.
          Balance final: <strong style="color:${E-consDiaT<0?'var(--danger)':'var(--success)'}">${(E-consDiaT).toFixed(2)}</strong>.</li>
      <li>${tcR !== null ? `El nivel crítico (${Rcrit} miles lts) se alcanza en el <strong>día ${tcR.toFixed(2)}</strong> (RK4).` : `La reserva no alcanza el nivel crítico antes de T=${T} días.`}</li>
      <li>RK4 es el método más preciso (orden 4): error final = ${data.rk4.slice(-1)[0].err.toExponential(3)}.
          Euler (orden 1) acumula ${data.euler.slice(-1)[0].err.toExponential(3)} de error al final.</li>
      <li>Cada pestaña de "Resolución Paso a Paso" muestra todas las operaciones de cada método.</li>
    </ul>`;

  // ── Interpretación dinámica en sección conclusiones ──
  const elInterp = document.getElementById('interpDinamica');
  if (elInterp) {
    const metInfo = [
      { nombre:'Euler',  key:'euler', color:'#60a5fa', orden:'1°', tc:tcE },
      { nombre:'Heun',   key:'heun',  color:'#34d399', orden:'2°', tc:tcH },
      { nombre:'RK4',    key:'rk4',   color:'#fbbf24', orden:'4°', tc:tcR }
    ];
    const consDiaT = C0 * (1 + alpha * T);
    const balanceFinal = E - consDiaT;
    elInterp.innerHTML = `
      <p style='font-weight:700;color:var(--accent);font-size:.95rem;margin-bottom:.8rem'>📊 Interpretación de los Resultados</p>
      <p style='font-size:.875rem;color:var(--text-secondary);margin-bottom:.8rem'>
        Parámetros actuales: R₀ = <strong>${R0}</strong> · E = <strong>${E}</strong> · C₀ = <strong>${C0}</strong> · α = <strong>${alpha}</strong> · h = <strong>${h} días</strong> · T = <strong>${T} días</strong> · R_crit = <strong>${Rcrit}</strong>
      </p>
      <div class='table-wrap' style='margin-bottom:.8rem'>
        <table>
          <thead><tr><th>Método</th><th>R(0)</th><th>R(T)</th><th>T crítico</th><th>Error final vs. Analítica</th><th>Orden</th></tr></thead>
          <tbody>
            ${metInfo.map(({nombre, key, color, orden, tc}) => {
              const ps   = data[key];
              const last = ps[ps.length-1];
              return `<tr>
                <td style='color:${color};font-weight:700'>${nombre}</td>
                <td>${ps[0].R.toFixed(2)}</td>
                <td class='${last.R<=Rcrit?'err':'ok'}'>${last.R.toFixed(2)}</td>
                <td class='${tc!==null?'ok':'c-muted'}'>${tc !== null ? tc.toFixed(2)+' días' : '> T (no alcanzado)'}</td>
                <td class='${last.err<1?'ok':'err'}'>${last.err.toExponential(4)}</td>
                <td><span class='tag'>${orden}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p style='font-size:.875rem;color:var(--text-secondary)'>
        <strong style='color:#fff'>Con los parámetros ingresados:</strong>
        Consumo en t = T: <strong>${consDiaT.toFixed(2)} mlt/día</strong>.
        Balance final (E − consumo): <strong style='color:${balanceFinal>=0?'var(--success)':'var(--danger)'}'>${balanceFinal>=0?'+':''}${balanceFinal.toFixed(2)} mlt/día</strong>.
        ${tcR !== null
          ? `Nivel crítico (R_crit = ${Rcrit} mlt) alcanzado en el <strong style='color:var(--danger)'>día ${tcR.toFixed(2)}</strong> según RK4
             (Euler estima día ${tcE!==null?tcE.toFixed(2):'—'} → desfase ${tcR!==null&&tcE!==null?Math.abs(tcR-tcE).toFixed(2):'—'} días).`
          : `La reserva <strong style='color:var(--success)'>no alcanza el nivel crítico</strong> antes de T = ${T} días con estos parámetros.`}
        Error final RK4: ${data.rk4[data.rk4.length-1].err.toExponential(3)} vs.
        Euler: ${data.euler[data.euler.length-1].err.toExponential(3)}.
      </p>`;
  }
}

// ─── TABLA PASO A PASO POR MÉTODO ─────────────
function buildStepTable(m, pasos, Rcrit, h) {
  const tc  = tiempoCritico(pasos, Rcrit);
  const last = pasos[pasos.length - 1];
  const max  = Math.min(pasos.length, 200);

  let html = `
    <div class="stats-grid" style="margin-bottom:1rem">
      <div class="stat-box">
        <span class="stat-val" style="color:${m.color}">${pasos.length}</span>
        <span class="stat-lbl">Pasos totales</span>
      </div>
      <div class="stat-box">
        <span class="stat-val ${tc?'ok':'c-muted'}">${tc !== null ? tc.toFixed(3)+' d' : '> T'}</span>
        <span class="stat-lbl">Tiempo crítico</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">${last.R.toFixed(4)}</span>
        <span class="stat-lbl">R(T) final</span>
      </div>
      <div class="stat-box">
        <span class="stat-val ${last.err<0.5?'ok':'err'}">${last.err.toExponential(3)}</span>
        <span class="stat-lbl">Error vs. Analítica</span>
      </div>
    </div>`;

  if (m.key === 'euler') {
    html += `
      <p class="form-label">Tabla de Pasos — Método de Euler</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
        R(t+h) = R(t) + h·f(t,R)  ·  f(t,R) = E − C₀·(1+α·t) = ${pasos[0].k1.toFixed(4)} en t=0
        ${pasos.length>max?' · Mostrando primeros '+max+' de '+pasos.length+' pasos':''}
      </p>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Paso</th><th>t</th><th>R(t)</th>
          <th>f(t,R)=dR/dt</th><th>h·f = ΔR</th>
          <th>R(t+h)</th><th>R_analítica</th><th>|Error|</th><th>Estado</th>
        </tr></thead>
        <tbody>
          ${pasos.slice(0,max).map((p,i) => `<tr ${p.R<=Rcrit?'style="color:var(--danger)"':''}>
            <td>${i+1}</td>
            <td class="hl">${p.t.toFixed(3)}</td>
            <td>${p.R.toFixed(4)}</td>
            <td>${p.k1.toFixed(5)}</td>
            <td>${(h*p.k1).toFixed(5)}</td>
            <td>${i<pasos.length-1 ? pasos[i+1].R.toFixed(4) : '—'}</td>
            <td style="color:var(--text-muted)">${p.Ra.toFixed(4)}</td>
            <td class="${p.err<0.1?'ok':p.err<1?'':'err'}">${p.err.toExponential(3)}</td>
            <td class="${p.R<=Rcrit?'err':''}">${p.R<=Rcrit?'⚠ CRÍTICO':p.R<Rcrit*1.2?'⚡ Bajo':'✓'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;

  } else if (m.key === 'heun') {
    html += `
      <p class="form-label">Tabla de Pasos — Método de Heun (Predictor-Corrector)</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
        k₁=f(t,R) · R*=R+h·k₁ · k₂=f(t+h,R*) · R(t+h)=R+h·(k₁+k₂)/2
        ${pasos.length>max?' · Mostrando primeros '+max+' pasos':''}
      </p>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Paso</th><th>t</th><th>R(t)</th>
          <th>k₁</th><th>R* (pred.)</th><th>k₂</th><th>(k₁+k₂)/2</th>
          <th>R(t+h)</th><th>|Error|</th>
        </tr></thead>
        <tbody>
          ${pasos.slice(0,max).map((p,i) => `<tr ${p.R<=Rcrit?'style="color:var(--danger)"':''}>
            <td>${i+1}</td>
            <td class="hl">${p.t.toFixed(3)}</td>
            <td>${p.R.toFixed(4)}</td>
            <td>${p.k1.toFixed(5)}</td>
            <td>${p.Rpred.toFixed(4)}</td>
            <td>${p.k2.toFixed(5)}</td>
            <td>${p.prom.toFixed(5)}</td>
            <td>${i<pasos.length-1 ? pasos[i+1].R.toFixed(4) : '—'}</td>
            <td class="${p.err<0.01?'ok':p.err<0.5?'':'err'}">${p.err.toExponential(3)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;

  } else {
    html += `
      <p class="form-label">Tabla de Pasos — Runge-Kutta 4° Orden (RK4)</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
        R(t+h) = R + h·(k₁ + 2k₂ + 2k₃ + k₄)/6
        ${pasos.length>max?' · Mostrando primeros '+max+' pasos':''}
      </p>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Paso</th><th>t</th><th>R(t)</th>
          <th>k₁</th><th>k₂</th><th>k₃</th><th>k₄</th>
          <th>Ponderado</th><th>R(t+h)</th><th>|Error|</th>
        </tr></thead>
        <tbody>
          ${pasos.slice(0,max).map((p,i) => `<tr ${p.R<=Rcrit?'style="color:var(--danger)"':''}>
            <td>${i+1}</td>
            <td class="hl">${p.t.toFixed(3)}</td>
            <td>${p.R.toFixed(4)}</td>
            <td>${p.k1.toFixed(5)}</td>
            <td>${p.k2.toFixed(5)}</td>
            <td>${p.k3.toFixed(5)}</td>
            <td>${p.k4.toFixed(5)}</td>
            <td>${p.pond.toFixed(5)}</td>
            <td>${i<pasos.length-1 ? pasos[i+1].R.toFixed(4) : '—'}</td>
            <td class="${p.err<0.001?'ok':p.err<0.1?'':'err'}">${p.err.toExponential(3)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }
  return html;
}

// ─── ESCENARIOS PREDEFINIDOS ──────────────────
function cargarEscenario(tipo) {
  const esc = {
    normal: { R0:100,  Rcrit:20, E:5,   C0:5.5, alpha:0.01, h:0.5, T:30 },
    crisis: { R0:80,   Rcrit:20, E:2,   C0:6,   alpha:0.04, h:0.5, T:20 },
    panico: { R0:100,  Rcrit:15, E:3,   C0:5,   alpha:0.08, h:0.5, T:15 }
  };
  const e = esc[tipo]; if(!e) return;
  Object.entries(e).forEach(([k,v]) => { const el=document.getElementById(k); if(el) el.value=v; });
}

// ─── UTILIDADES ──────────────────────────────
function limpiarResultados() {
  document.getElementById('resultadosSection').classList.add('hidden');
  if (chartReserva) { chartReserva.destroy(); chartReserva = null; }
  if (chartError)   { chartError.destroy();   chartError   = null; }
  const elDyn = document.getElementById('interpDinamica');
  if (elDyn) elDyn.innerHTML = '<p style="font-size:.875rem;color:var(--text-muted);text-align:center;padding:.8rem 0">▶ Configura los parámetros y ejecuta la simulación para ver la interpretación con los valores reales.</p>';
}
