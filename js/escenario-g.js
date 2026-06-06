document.getElementById('hamBtn').addEventListener('click', () =>
  document.getElementById('navMenu').classList.toggle('open'));
function mostrarTab(btn, id) {
  btn.closest('.card').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.closest('.card').querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active'); document.getElementById(id).classList.add('active');
}

let chartNMD = null;

const ESCENARIOS_G = {
  estable: { N0:900, M0:100, D0:20, a:0.001, b:0.05, c:0.003, k:0.02, r:0.1, h:0.5, T:60 },
  critica: { N0:900, M0:100, D0:5,  a:0.002, b:0.01, c:0.001, k:0.005,r:0.15,h:0.5, T:60 },
  osci:    { N0:800, M0:150, D0:50, a:0.001, b:0.08, c:0.002, k:0.03, r:0.05,h:0.5, T:120 }
};

function cargarEscenarioG() {
  const key = document.getElementById('escenarioG').value;
  if (!key) return;
  const e = ESCENARIOS_G[key];
  document.getElementById('N0').value = e.N0;
  document.getElementById('M0').value = e.M0;
  document.getElementById('D0').value = e.D0;
  document.getElementById('pa').value = e.a;
  document.getElementById('pb').value = e.b;
  document.getElementById('pc').value = e.c;
  document.getElementById('pk').value = e.k;
  document.getElementById('pr').value = e.r;
  document.getElementById('ph').value = e.h;
  document.getElementById('pT').value = e.T;
  actualizarInfoNTotal();
}

function actualizarInfoNTotal() {
  const N0=parseFloat(document.getElementById('N0').value)||0;
  const M0=parseFloat(document.getElementById('M0').value)||0;
  const D0=parseFloat(document.getElementById('D0').value)||0;
  document.getElementById('infoNTotal').innerHTML = `
    <p style="font-size:.82rem;color:#93c5fd;margin-bottom:.2rem">Población total inicial (conservación aproximada)</p>
    <p style="font-size:.875rem;color:var(--text-secondary)">N₀ + M₀ + D₀ = <strong style="color:#fff">${N0+M0+D0}</strong> personas</p>`;
}
['N0','M0','D0'].forEach(id => document.getElementById(id).addEventListener('input', actualizarInfoNTotal));

// ─── SISTEMA NMD ───────────────────────────────
function fNMD(N, M, D, a, b, c, k, r) {
  return {
    dN: -a*N*M + b*D,
    dM:  a*N*M - c*M*D,
    dD:  k*M   - r*D
  };
}

function heunNMD(N0, M0, D0, a, b, c, k, r, h, T) {
  const pasos = [];
  let N=N0, M=M0, D=D0, t=0;
  const nSteps = Math.round(T/h);
  for (let i=0; i<=nSteps; i++) {
    const k1 = fNMD(N,M,D,a,b,c,k,r);
    const Np = Math.max(0,N+h*k1.dN), Mp=Math.max(0,M+h*k1.dM), Dp=Math.max(0,D+h*k1.dD);
    const k2 = fNMD(Np,Mp,Dp,a,b,c,k,r);
    const Nn = Math.max(0,N+h/2*(k1.dN+k2.dN));
    const Mn = Math.max(0,M+h/2*(k1.dM+k2.dM));
    const Dn = Math.max(0,D+h/2*(k1.dD+k2.dD));
    pasos.push({ t:parseFloat(t.toFixed(6)), N, M, D, k1N:k1.dN,k1M:k1.dM,k1D:k1.dD, k2N:k2.dN,k2M:k2.dM,k2D:k2.dD, Nn, Mn, Dn });
    N=Nn; M=Mn; D=Dn;
    t = parseFloat((t+h).toFixed(10));
  }
  return pasos;
}

function rk4NMD(N0, M0, D0, a, b, c, k, r, h, T) {
  const pasos = [];
  let N=N0, M=M0, D=D0, t=0;
  const nSteps = Math.round(T/h);
  for (let i=0; i<=nSteps; i++) {
    const k1=fNMD(N,M,D,a,b,c,k,r);
    const N2=N+h/2*k1.dN, M2=M+h/2*k1.dM, D2=D+h/2*k1.dD;
    const k2=fNMD(N2,M2,D2,a,b,c,k,r);
    const N3=N+h/2*k2.dN, M3=M+h/2*k2.dM, D3=D+h/2*k2.dD;
    const k3=fNMD(N3,M3,D3,a,b,c,k,r);
    const N4=N+h*k3.dN, M4=M+h*k3.dM, D4=D+h*k3.dD;
    const k4=fNMD(N4,M4,D4,a,b,c,k,r);
    const Nn=Math.max(0,N+h/6*(k1.dN+2*k2.dN+2*k3.dN+k4.dN));
    const Mn=Math.max(0,M+h/6*(k1.dM+2*k2.dM+2*k3.dM+k4.dM));
    const Dn=Math.max(0,D+h/6*(k1.dD+2*k2.dD+2*k3.dD+k4.dD));
    pasos.push({ t:parseFloat(t.toFixed(6)), N, M, D,
      k1N:k1.dN,k1M:k1.dM,k1D:k1.dD,
      k2N:k2.dN,k2M:k2.dM,k2D:k2.dD,
      k3N:k3.dN,k3M:k3.dM,k3D:k3.dD,
      k4N:k4.dN,k4M:k4.dM,k4D:k4.dD, Nn, Mn, Dn });
    N=Nn; M=Mn; D=Dn;
    t = parseFloat((t+h).toFixed(10));
  }
  return pasos;
}

// ─── EJECUCIÓN PRINCIPAL ──────────────────────
function calcularNMD() {
  limpiarResultadosG();
  try {
    const N0v = parseFloat(document.getElementById('N0').value);
    const M0v = parseFloat(document.getElementById('M0').value);
    const D0v = parseFloat(document.getElementById('D0').value);
    const av  = parseFloat(document.getElementById('pa').value);
    const bv  = parseFloat(document.getElementById('pb').value);
    const cv  = parseFloat(document.getElementById('pc').value);
    const kv  = parseFloat(document.getElementById('pk').value);
    const rv  = parseFloat(document.getElementById('pr').value);
    const hv  = parseFloat(document.getElementById('ph').value);
    const Tv  = parseFloat(document.getElementById('pT').value);

    if ([N0v,M0v,D0v,av,bv,cv,kv,rv,hv,Tv].some(isNaN) || hv<=0 || Tv<=0)
      throw new Error('Parámetros inválidos. Verifica que todos los campos sean positivos.');

    const nSteps = Math.round(Tv/hv);
    if (nSteps > 2000) throw new Error(`Demasiados pasos (${nSteps}). Aumenta h o reduce T.`);

    const pHeun = heunNMD(N0v,M0v,D0v,av,bv,cv,kv,rv,hv,Tv);
    const pRK4  = rk4NMD(N0v,M0v,D0v,av,bv,cv,kv,rv,hv,Tv);

    document.getElementById('resultadosSection').classList.remove('hidden');
    mostrarResultadosG({ pHeun, pRK4, N0v, M0v, D0v, av, bv, cv, kv, rv, hv, Tv });
  } catch(e) {
    document.getElementById('alertGlobal').innerHTML =
      `<div class="alert danger"><span class="aicon">❌</span><span>${e.message}</span></div>`;
    document.getElementById('resultadosSection').classList.remove('hidden');
  }
}

function fn(v, d=2) { return typeof v==='number'&&isFinite(v)?v.toFixed(d):'—'; }

function mostrarResultadosG({ pHeun, pRK4, N0v, M0v, D0v, av, bv, cv, kv, rv, hv, Tv }) {
  const lastH = pHeun[pHeun.length-1];
  const lastR = pRK4[pRK4.length-1];
  const Ntot0 = N0v+M0v+D0v;

  const maxMH = Math.max(...pHeun.map(p=>p.M)), tMaxMH = pHeun.find(p=>p.M>=maxMH-0.01)?.t;
  const maxMR = Math.max(...pRK4.map(p=>p.M)),  tMaxMR = pRK4.find(p=>p.M>=maxMR-0.01)?.t;

  const diffN = Math.abs(lastH.N-lastR.N), diffM = Math.abs(lastH.M-lastR.M), diffD = Math.abs(lastH.D-lastR.D);

  document.getElementById('kpis').innerHTML = `
    <div class="stat-box"><span class="stat-val ok">${fn(lastR.N,1)}</span><span class="stat-lbl">N(T) Neutrales — RK4</span></div>
    <div class="stat-box"><span class="stat-val warn">${fn(lastR.M,1)}</span><span class="stat-lbl">M(T) Manifestantes — RK4</span></div>
    <div class="stat-box"><span class="stat-val" style="color:#34d399">${fn(lastR.D,1)}</span><span class="stat-lbl">D(T) Mediadores — RK4</span></div>
    <div class="stat-box"><span class="stat-val warn">${fn(maxMR,1)}</span><span class="stat-lbl">Pico M_max (RK4) en t=${fn(tMaxMR,1)} días</span></div>
    <div class="stat-box"><span class="stat-val ${diffM<1?'ok':diffM<10?'warn':'err'}">${fn(diffM,4)}</span><span class="stat-lbl">|M_Heun−M_RK4| en t=T</span></div>
    <div class="stat-box"><span class="stat-val">${pRK4.length-1}</span><span class="stat-lbl">Pasos (h=${hv}, T=${Tv})</span></div>`;

  if (chartNMD) chartNMD.destroy();
  const tArr = pRK4.map(p=>p.t);
  chartNMD = new Chart(document.getElementById('chartNMD').getContext('2d'), {
    type:'line',
    data:{
      labels: tArr,
      datasets:[
        { label:'N — Heun', data:pHeun.map(p=>p.N), borderColor:'#93c5fd', borderWidth:1.5, pointRadius:0, borderDash:[4,2], tension:.2 },
        { label:'N — RK4',  data:pRK4.map(p=>p.N),  borderColor:'#3b82f6', borderWidth:2.5, pointRadius:0, tension:.2 },
        { label:'M — Heun', data:pHeun.map(p=>p.M), borderColor:'#fde68a', borderWidth:1.5, pointRadius:0, borderDash:[4,2], tension:.2 },
        { label:'M — RK4',  data:pRK4.map(p=>p.M),  borderColor:'#f59e0b', borderWidth:2.5, pointRadius:0, tension:.2 },
        { label:'D — Heun', data:pHeun.map(p=>p.D), borderColor:'#6ee7b7', borderWidth:1.5, pointRadius:0, borderDash:[4,2], tension:.2 },
        { label:'D — RK4',  data:pRK4.map(p=>p.D),  borderColor:'#10b981', borderWidth:2.5, pointRadius:0, tension:.2 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{color:'#94a3b8',boxWidth:14}},
        title:{display:true,text:`N₀=${N0v}, M₀=${M0v}, D₀=${D0v} · a=${av}, b=${bv}, c=${cv}, k=${kv}, r=${rv}`,color:'#94a3b8',font:{size:11}} },
      scales:{
        x:{ ticks:{color:'#94a3b8',maxTicksLimit:15}, grid:{color:'#2d4060'},
            title:{display:true,text:'Tiempo t (días)',color:'#94a3b8'} },
        y:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true,text:'Población (personas)',color:'#94a3b8'} }
      }
    }
  });

  const tabNav = document.getElementById('methodTabsNav');
  const tabCnt = document.getElementById('methodTabsContent');
  tabNav.innerHTML = ''; tabCnt.innerHTML = '';

  const metodos = [
    { key:'heun', nombre:'Heun (2° orden)', color:'#60a5fa', pasos:pHeun, tipo:'heun', last:lastH },
    { key:'rk4',  nombre:'RK4 (4° orden)',  color:'#fbbf24', pasos:pRK4,  tipo:'rk4',  last:lastR }
  ];

  metodos.forEach((m, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn'+(idx===0?' active':'');
    btn.style.borderBottomColor = idx===0?m.color:'transparent';
    btn.style.color = idx===0?m.color:'';
    btn.textContent = m.nombre;
    btn.onclick = ()=>{
      tabNav.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('active');b.style.borderBottomColor='transparent';b.style.color='';});
      tabCnt.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active'); btn.style.borderBottomColor=m.color; btn.style.color=m.color;
      document.getElementById(`tg_${m.key}`).classList.add('active');
    };
    tabNav.appendChild(btn);

    const limPasos = m.pasos.length > 65 ?
      [...m.pasos.slice(0,55), {sep:true}, ...m.pasos.slice(-5)] : m.pasos;

    const pane = document.createElement('div');
    pane.className = 'tab-pane'+(idx===0?' active':'');
    pane.id = `tg_${m.key}`;

    let theadHtml, tbodyHtml;
    if (m.tipo==='heun') {
      theadHtml = '<tr><th>t</th><th>N</th><th>M</th><th>D</th><th>k₁N</th><th>k₁M</th><th>k₁D</th><th>k₂N</th><th>k₂M</th><th>k₂D</th><th>N_nuevo</th><th>M_nuevo</th><th>D_nuevo</th></tr>';
      tbodyHtml = limPasos.map(p=>p.sep ? `<tr><td colspan="13" style="text-align:center;color:var(--text-muted)">… pasos omitidos …</td></tr>` : `<tr>
        <td class="hl">${p.t.toFixed(2)}</td>
        <td>${fn(p.N,2)}</td><td class="warn">${fn(p.M,2)}</td><td style="color:#34d399">${fn(p.D,2)}</td>
        <td>${fn(p.k1N,4)}</td><td>${fn(p.k1M,4)}</td><td>${fn(p.k1D,4)}</td>
        <td>${fn(p.k2N,4)}</td><td>${fn(p.k2M,4)}</td><td>${fn(p.k2D,4)}</td>
        <td class="ok">${fn(p.Nn,2)}</td><td class="ok">${fn(p.Mn,2)}</td><td class="ok">${fn(p.Dn,2)}</td>
      </tr>`).join('');
    } else {
      theadHtml = '<tr><th>t</th><th>N</th><th>M</th><th>D</th><th>k₁M</th><th>k₂M</th><th>k₃M</th><th>k₄M</th><th>N_nuevo</th><th>M_nuevo</th><th>D_nuevo</th></tr>';
      tbodyHtml = limPasos.map(p=>p.sep ? `<tr><td colspan="11" style="text-align:center;color:var(--text-muted)">… pasos omitidos …</td></tr>` : `<tr>
        <td class="hl">${p.t.toFixed(2)}</td>
        <td>${fn(p.N,2)}</td><td class="warn">${fn(p.M,2)}</td><td style="color:#34d399">${fn(p.D,2)}</td>
        <td>${fn(p.k1M,5)}</td><td>${fn(p.k2M,5)}</td><td>${fn(p.k3M,5)}</td><td>${fn(p.k4M,5)}</td>
        <td class="ok">${fn(p.Nn,2)}</td><td class="ok">${fn(p.Mn,2)}</td><td class="ok">${fn(p.Dn,2)}</td>
      </tr>`).join('');
    }

    pane.innerHTML = `
      <div class="stats-grid" style="margin-bottom:.8rem">
        <div class="stat-box"><span class="stat-val ok">${fn(m.last.N,2)}</span><span class="stat-lbl">N(T) final</span></div>
        <div class="stat-box"><span class="stat-val warn">${fn(m.last.M,2)}</span><span class="stat-lbl">M(T) final</span></div>
        <div class="stat-box"><span class="stat-val" style="color:#34d399">${fn(m.last.D,2)}</span><span class="stat-lbl">D(T) final</span></div>
        <div class="stat-box"><span class="stat-val">${m.pasos.length-1}</span><span class="stat-lbl">Pasos calculados</span></div>
      </div>
      <div class="table-wrap">
        <table><thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody></table>
      </div>`;
    tabCnt.appendChild(pane);
  });

  const elInterp = document.getElementById('interpDinamica');
  if (elInterp) {
    const tendencia = lastR.M < M0v ? 'Desescalada' : lastR.M < maxMR*0.5 ? 'Estabilizándose' : 'Escalada';
    const tendColor = lastR.M<M0v?'var(--success)':lastR.M<maxMR*0.5?'var(--warning)':'var(--danger)';
    const pctM_T = ((lastR.M/(N0v+M0v+D0v))*100).toFixed(1);
    const ntotFin = lastR.N+lastR.M+lastR.D;
    elInterp.innerHTML = `
      <p style='font-weight:700;color:var(--accent);font-size:.95rem;margin-bottom:.8rem'>📊 Interpretación de los Resultados</p>
      <p style='font-size:.875rem;color:var(--text-secondary);margin-bottom:.8rem'>
        N₀=${N0v} · M₀=${M0v} · D₀=${D0v} · a=${av}, b=${bv}, c=${cv}, k=${kv}, r=${rv} · h=${hv} · T=${Tv} días
      </p>
      <div class='grid g-2' style='margin-bottom:.8rem'>
        <div>
          <p style='font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:.4rem'>Valores en t = ${Tv} días:</p>
          <div class='table-wrap'><table>
            <thead><tr><th>Variable</th><th>Heun</th><th>RK4</th><th>|Diferencia|</th></tr></thead>
            <tbody>
              <tr><td style='color:#3b82f6'>N (Neutrales)</td><td>${fn(lastH.N,3)}</td><td class='hl'>${fn(lastR.N,3)}</td><td class='${diffN<0.1?'ok':'warn'}'>${fn(diffN,4)}</td></tr>
              <tr><td style='color:#f59e0b'>M (Manifestantes)</td><td>${fn(lastH.M,3)}</td><td class='hl'>${fn(lastR.M,3)}</td><td class='${diffM<0.1?'ok':'warn'}'>${fn(diffM,4)}</td></tr>
              <tr><td style='color:#10b981'>D (Mediadores)</td><td>${fn(lastH.D,3)}</td><td class='hl'>${fn(lastR.D,3)}</td><td class='${diffD<0.1?'ok':'warn'}'>${fn(diffD,4)}</td></tr>
              <tr><td>N+M+D (total)</td><td>${fn(lastH.N+lastH.M+lastH.D,2)}</td><td>${fn(ntotFin,2)}</td><td>${fn(Math.abs(ntotFin-Ntot0),3)}</td></tr>
            </tbody>
          </table></div>
        </div>
        <div>
          <p style='font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:.4rem'>Análisis de la dinámica:</p>
          <div class='table-wrap'><table>
            <thead><tr><th>Indicador</th><th>Valor (RK4)</th></tr></thead>
            <tbody>
              <tr><td>Pico máximo M</td><td class='err'>${fn(maxMR,1)} personas (día ${fn(tMaxMR,1)})</td></tr>
              <tr><td>M(T) / M_max</td><td>${((lastR.M/maxMR)*100).toFixed(1)}% del pico</td></tr>
              <tr><td>% M de la población</td><td class='${parseFloat(pctM_T)>30?'err':'warn'}'>${pctM_T}%</td></tr>
              <tr><td>Tendencia en t=T</td><td style='color:${tendColor}'>${tendencia}</td></tr>
              <tr><td>γ = aN₀−cD₀ (inicio)</td><td class='${av*N0v>cv*D0v?'err':'ok'}'>${(av*N0v-cv*D0v).toFixed(4)}</td></tr>
            </tbody>
          </table></div>
        </div>
      </div>
      <p style='font-size:.875rem;color:var(--text-secondary)'>
        <strong style='color:#fff'>Resumen:</strong> Con los parámetros configurados, los manifestantes alcanzan un pico de
        <strong style='color:var(--danger)'>${fn(maxMR,1)} personas en el día ${fn(tMaxMR,1)}</strong>,
        representando el ${((maxMR/Ntot0)*100).toFixed(1)}% de la población total.
        Al día T=${Tv}, la proporción de manifestantes es del <strong style='color:${tendColor}'>${pctM_T}%</strong>
        — tendencia: <strong style='color:${tendColor}'>${tendencia}</strong>.
        La diferencia entre Heun y RK4 en M(T) es de ${fn(diffM,4)} personas
        (${fn(diffM/Math.max(lastR.M,0.001)*100,4)}% relativo),
        ${diffM<1?'confirmando la convergencia de ambos métodos.':'sugiriendo que se debe reducir h para mayor precisión.'}
      </p>`;
  }
}

function limpiarResultadosG() {
  document.getElementById('resultadosSection').classList.add('hidden');
  document.getElementById('alertGlobal').innerHTML = '';
  if (chartNMD) { chartNMD.destroy(); chartNMD = null; }
  const el = document.getElementById('interpDinamica');
  if (el) el.innerHTML = '<p style="font-size:.875rem;color:var(--text-muted);text-align:center;padding:.8rem 0">▶ Configura los parámetros y ejecuta la simulación para ver la interpretación con los valores reales.</p>';
}

// Inicializar
actualizarInfoNTotal();
