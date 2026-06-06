document.getElementById('hamBtn').addEventListener('click', () =>
  document.getElementById('navMenu').classList.toggle('open'));

function mostrarTab(btn, id) {
  btn.closest('.card').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.closest('.card').querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(id).classList.add('active');
}

let chartFx = null;

const DEFAULTS_MODELO = {
  '1': { ba:0, bb:7,  x0:3,  x1:5  },
  '2': { ba:0, bb:15, x0:7,  x1:10 },
  '3': { ba:0, bb:30, x0:5,  x1:15 }
};

function cambiarModeloE() {
  const m = document.getElementById('modeloE').value;
  document.getElementById('paramM1').classList.toggle('hidden', m!=='1');
  document.getElementById('paramM2').classList.toggle('hidden', m!=='2');
  document.getElementById('paramM3').classList.toggle('hidden', m!=='3');
  const d = DEFAULTS_MODELO[m];
  document.getElementById('bis_a').value = d.ba;
  document.getElementById('bis_b').value = d.bb;
  document.getElementById('x0').value    = d.x0;
  document.getElementById('x1').value    = d.x1;
}

// ─── MODELOS ──────────────────────────────────
function getModelo() {
  const m = document.getElementById('modeloE').value;
  if (m === '1') {
    const p0 = parseFloat(document.getElementById('m1_p0').value);
    const pF = parseFloat(document.getElementById('m1_pF').value);
    const q  = parseFloat(document.getElementById('m1_q').value);
    const P  = parseFloat(document.getElementById('m1_P').value);
    const T  = parseFloat(document.getElementById('m1_T').value);
    return {
      nombre:'Umbral Presupuestal Familiar', varNombre:'t (días)', unidad:'días',
      f:  t => q*(p0*t + (pF-p0)*t*t/(2*T)) - P,
      df: t => q*(p0 + (pF-p0)*t/T),
      interp: r => `Con p₀=${p0}, pF=${pF} Bs/ud, q=${q} ud/día y presupuesto P=${P} Bs en ${T} días:
        la familia agota su presupuesto en el día <strong style='color:var(--danger)'>t* = ${r.toFixed(4)} días</strong>.
        El consumo acumulado supera ${P} Bs en solo ${Math.ceil(r)} días del período.`
    };
  } else if (m === '2') {
    const R0 = parseFloat(document.getElementById('m2_R0').value);
    const Rc = parseFloat(document.getElementById('m2_Rc').value);
    const C0 = parseFloat(document.getElementById('m2_C0').value);
    const al = parseFloat(document.getElementById('m2_al').value);
    const T  = parseFloat(document.getElementById('m2_T').value);
    return {
      nombre:'Tasa Mínima de Reabastecimiento', varNombre:'E (miles lt/día)', unidad:'miles lt/día',
      f:  E => R0 + E*T - C0*(T + al*T*T/2) - Rc,
      df: E => T,
      interp: r => `Para R₀=${R0}, Rcrit=${Rc}, C₀=${C0} miles lt/día con α=${al}:
        la tasa mínima de reabastecimiento es <strong style='color:var(--warning)'>E* = ${r.toFixed(4)} miles lt/día</strong>.
        Con una tasa menor, las reservas caerán por debajo de ${Rc} antes de los ${T} días.`
    };
  } else {
    const N0 = parseFloat(document.getElementById('m3_N0').value);
    const M0 = parseFloat(document.getElementById('m3_M0').value);
    const D0 = parseFloat(document.getElementById('m3_D0').value);
    const a  = parseFloat(document.getElementById('m3_a').value);
    const c  = parseFloat(document.getElementById('m3_c').value);
    const Mt = parseFloat(document.getElementById('m3_Mt').value);
    const gamma = a*N0 - c*D0;
    return {
      nombre:'Masa Crítica Social (NMD)', varNombre:'t (días)', unidad:'días',
      f:  t => { const v = gamma*t - a*M0*t*t/2; return Math.abs(v)<700 ? M0*Math.exp(v) - Mt : (v>0?1e15:-Mt); },
      df: t => { const v = gamma*t - a*M0*t*t/2; return Math.abs(v)<700 ? M0*Math.exp(v)*(gamma - a*M0*t) : 0; },
      interp: r => `Con N₀=${N0}, M₀=${M0}, D₀=${D0}, a=${a}, c=${c}, γ=aN₀−cD₀=${gamma.toFixed(4)}:
        los manifestantes alcanzan la masa crítica de ${Mt} personas en el día
        <strong style='color:var(--danger)'>t* = ${r.toFixed(4)} días</strong>.
        ${gamma>0?'γ > 0: el movimiento crece exponencialmente.':'γ ≤ 0: la mediación está neutralizando el contagio.'}`
    };
  }
}

// ─── ALGORITMOS ───────────────────────────────
function biseccion(f, a, b, tol, maxIter) {
  if (f(a)*f(b) >= 0) return { error:`f(${a.toFixed(3)})·f(${b.toFixed(3)}) ≥ 0: no hay garantía de raíz en [a,b]` };
  const iters = [];
  let fa = f(a);
  for (let k = 1; k <= maxIter; k++) {
    const c = (a+b)/2, fc = f(c), err = Math.abs(b-a)/2;
    iters.push({ k, a, b, c, fa, fb:f(b), fc, err });
    if (err < tol || Math.abs(fc) < 1e-14) break;
    if (fa*fc < 0) { b = c; } else { a = c; fa = fc; }
  }
  return { raiz:(a+b)/2, iters };
}

function newtonRaphson(f, df, x0, tol, maxIter) {
  const iters = [];
  let x = x0;
  for (let k = 1; k <= maxIter; k++) {
    const fx = f(x), dfx = df(x);
    if (Math.abs(dfx) < 1e-14) return { error:`f'(${x.toFixed(4)}) ≈ 0 en iteración ${k}` };
    const xnuevo = x - fx/dfx, err = Math.abs(xnuevo-x);
    iters.push({ k, x, fx, dfx, xnuevo, err });
    x = xnuevo;
    if (err < tol) break;
  }
  return { raiz:x, iters };
}

function secante(f, x0, x1, tol, maxIter) {
  const iters = [];
  let xp = x0, xc = x1;
  for (let k = 1; k <= maxIter; k++) {
    const fxp = f(xp), fxc = f(xc), df = fxc-fxp;
    if (Math.abs(df) < 1e-14) return { error:`Denominador ≈ 0 en iteración ${k}` };
    const xnuevo = xc - fxc*(xc-xp)/df, err = Math.abs(xnuevo-xc);
    iters.push({ k, xp, xc, fxp, fxc, xnuevo, err });
    xp = xc; xc = xnuevo;
    if (err < tol) break;
  }
  return { raiz:xc, iters };
}

// ─── EJECUCIÓN PRINCIPAL ──────────────────────
function calcularRaices() {
  limpiarResultadosE();
  try {
    const modelo = getModelo();
    const ba  = parseFloat(document.getElementById('bis_a').value);
    const bb  = parseFloat(document.getElementById('bis_b').value);
    const x0v = parseFloat(document.getElementById('x0').value);
    const x1v = parseFloat(document.getElementById('x1').value);
    const tol = parseFloat(document.getElementById('tol').value);
    const mi  = parseInt(document.getElementById('maxIter').value);
    if ([ba,bb,x0v,x1v,tol,mi].some(isNaN) || tol<=0) throw new Error('Parámetros inválidos');

    const rBis = biseccion(modelo.f, ba, bb, tol, mi);
    const rNR  = newtonRaphson(modelo.f, modelo.df, x0v, tol, mi);
    const rSec = secante(modelo.f, x0v, x1v, tol, mi);

    document.getElementById('resultadosSection').classList.remove('hidden');
    mostrarResultadosE({ modelo, rBis, rNR, rSec, ba, bb, x0v, x1v, tol });
  } catch(e) {
    document.getElementById('alertGlobal').innerHTML =
      `<div class="alert danger"><span class="aicon">❌</span><span>${e.message}</span></div>`;
    document.getElementById('resultadosSection').classList.remove('hidden');
  }
}

function fn(v, d=6) { return typeof v==='number' && isFinite(v) ? v.toFixed(d) : '—'; }

function mostrarResultadosE({ modelo, rBis, rNR, rSec, ba, bb, x0v, x1v, tol }) {
  const metodos = [
    { key:'bis', nombre:'Bisección',      color:'#60a5fa', res:rBis, tipo:'bis' },
    { key:'nr',  nombre:'Newton-Raphson', color:'#34d399', res:rNR,  tipo:'nr'  },
    { key:'sec', nombre:'Secante',        color:'#fbbf24', res:rSec, tipo:'sec' }
  ];
  const validos = metodos.filter(m => !m.res.error);

  // KPIs
  document.getElementById('kpis').innerHTML = metodos.map(m => m.res.error
    ? `<div class="stat-box"><span class="stat-val err">Error</span><span class="stat-lbl">${m.nombre}</span></div>`
    : `<div class="stat-box">
        <span class="stat-val" style="color:${m.color}">${fn(m.res.raiz,6)}</span>
        <span class="stat-lbl">${m.nombre} (${m.res.iters.length} iter.)</span>
       </div>`).join('');

  // Tabla comparativa
  const raizRef = validos.length ? validos[0].res.raiz : null;
  document.getElementById('tablaComp').innerHTML = `<table>
    <thead><tr><th>Método</th><th>x*</th><th>f(x*)</th><th>Iteraciones</th><th>Orden conv.</th><th>Estado</th></tr></thead>
    <tbody>${metodos.map(m => m.res.error ? `<tr>
      <td style="color:${m.color};font-weight:700">${m.nombre}</td>
      <td colspan="4" class="err">${m.res.error}</td><td class="err">Error</td>
    </tr>` : `<tr>
      <td style="color:${m.color};font-weight:700">${m.nombre}</td>
      <td class="hl">${fn(m.res.raiz,8)} ${modelo.unidad}</td>
      <td class="${Math.abs(modelo.f(m.res.raiz))<1e-6?'ok':'warn'}">${modelo.f(m.res.raiz).toExponential(3)}</td>
      <td>${m.res.iters.length}</td>
      <td>${m.tipo==='bis'?'Lineal (1)':m.tipo==='nr'?'Cuadrática (2)':'Superlineal (φ≈1.618)'}</td>
      <td class="${m.res.iters[m.res.iters.length-1]?.err<tol?'ok':'warn'}">
        ${m.res.iters[m.res.iters.length-1]?.err<tol?'✓ Convergió':'⚠ Máx. iter.'}</td>
    </tr>`).join('')}
    ${raizRef!==null?`<tr style="background:var(--bg-surface)">
      <td><em>Método más rápido</em></td>
      <td colspan="3">${validos.reduce((a,b)=>a.res.iters.length<=b.res.iters.length?a:b).nombre}</td>
      <td colspan="2">—</td>
    </tr>`:''}
    </tbody></table>`;

  // Gráfico f(x)
  if (chartFx) chartFx.destroy();
  const xMin = ba - Math.abs(bb-ba)*0.3, xMax = bb + Math.abs(bb-ba)*0.3;
  const nPts = 200;
  const xArr = Array.from({length:nPts+1}, (_,i) => xMin + i*(xMax-xMin)/nPts);
  const yArr = xArr.map(x => { try { const v=modelo.f(x); return isFinite(v)&&Math.abs(v)<1e10?v:null; } catch{return null;} });
  const yAbsMax = Math.max(1, ...yArr.filter(v=>v!==null).map(Math.abs));
  const yLim = 2.5*yAbsMax;

  const datasets = [
    { label:'f(x)', data:xArr.map((x,i)=>({x,y:yArr[i]===null||Math.abs(yArr[i])>yLim?null:yArr[i]})),
      borderColor:'#a78bfa', borderWidth:2, pointRadius:0, tension:.2, fill:false, spanGaps:false },
    { label:'y=0', data:xArr.map(x=>({x,y:0})), borderColor:'#47556988',
      borderDash:[5,4], borderWidth:1, pointRadius:0, fill:false }
  ];
  const pColors = ['#60a5fa','#34d399','#fbbf24'];
  validos.forEach((m,i) => datasets.push({
    label:`${m.nombre}: x*=${fn(m.res.raiz,4)} ${modelo.unidad}`,
    data:[{x:m.res.raiz,y:0}],
    backgroundColor:pColors[i], borderColor:pColors[i],
    pointRadius:9, pointStyle:'crossRot', type:'scatter'
  }));
  chartFx = new Chart(document.getElementById('chartFx').getContext('2d'), {
    type:'line', data:{ datasets },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{color:'#94a3b8'}} },
      scales:{
        x:{ type:'linear', ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true,text:modelo.varNombre,color:'#94a3b8'} },
        y:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true,text:'f(x)',color:'#94a3b8'} }
      }
    }
  });

  // Tabs iteraciones
  const tabNav = document.getElementById('methodTabsNav');
  const tabCnt = document.getElementById('methodTabsContent');
  tabNav.innerHTML = ''; tabCnt.innerHTML = '';

  metodos.forEach((m, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn'+(idx===0?' active':'');
    btn.style.borderBottomColor = idx===0?m.color:'transparent';
    btn.style.color = idx===0?m.color:'';
    btn.textContent = m.nombre+(m.res.error?' ⚠':'');
    btn.onclick = () => {
      tabNav.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('active');b.style.borderBottomColor='transparent';b.style.color='';});
      tabCnt.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active'); btn.style.borderBottomColor=m.color; btn.style.color=m.color;
      document.getElementById(`te_${m.key}`).classList.add('active');
    };
    tabNav.appendChild(btn);

    const pane = document.createElement('div');
    pane.className = 'tab-pane'+(idx===0?' active':'');
    pane.id = `te_${m.key}`;
    if (m.res.error) {
      pane.innerHTML = `<div class="alert danger"><span class="aicon">❌</span><span>${m.res.error}</span></div>`;
    } else {
      const lastErr = m.res.iters[m.res.iters.length-1]?.err;
      let hdrsHtml = '', bodyHtml = '';
      if (m.tipo==='bis') {
        hdrsHtml = '<tr><th>k</th><th>a</th><th>b</th><th>c = (a+b)/2</th><th>f(a)</th><th>f(c)</th><th>Error |b−a|/2</th></tr>';
        bodyHtml = m.res.iters.map(it=>`<tr>
          <td class="hl">${it.k}</td><td>${it.a.toFixed(6)}</td><td>${it.b.toFixed(6)}</td>
          <td class="ok">${it.c.toFixed(8)}</td><td>${it.fa.toExponential(3)}</td><td>${it.fc.toExponential(3)}</td>
          <td class="${it.err<tol?'ok':'warn'}">${it.err.toExponential(3)}</td>
        </tr>`).join('');
      } else if (m.tipo==='nr') {
        hdrsHtml = '<tr><th>k</th><th>xₖ</th><th>f(xₖ)</th><th>f\'(xₖ)</th><th>xₖ₊₁</th><th>Error |xₖ₊₁−xₖ|</th></tr>';
        bodyHtml = m.res.iters.map(it=>`<tr>
          <td class="hl">${it.k}</td><td>${it.x.toFixed(8)}</td>
          <td>${it.fx.toExponential(3)}</td><td>${it.dfx.toExponential(3)}</td>
          <td class="ok">${it.xnuevo.toFixed(8)}</td>
          <td class="${it.err<tol?'ok':'warn'}">${it.err.toExponential(3)}</td>
        </tr>`).join('');
      } else {
        hdrsHtml = '<tr><th>k</th><th>xₖ₋₁</th><th>xₖ</th><th>f(xₖ₋₁)</th><th>f(xₖ)</th><th>xₖ₊₁</th><th>Error</th></tr>';
        bodyHtml = m.res.iters.map(it=>`<tr>
          <td class="hl">${it.k}</td><td>${it.xp.toFixed(6)}</td><td>${it.xc.toFixed(8)}</td>
          <td>${it.fxp.toExponential(3)}</td><td>${it.fxc.toExponential(3)}</td>
          <td class="ok">${it.xnuevo.toFixed(8)}</td>
          <td class="${it.err<tol?'ok':'warn'}">${it.err.toExponential(3)}</td>
        </tr>`).join('');
      }
      pane.innerHTML = `
        <div class="stats-grid" style="margin-bottom:.8rem">
          <div class="stat-box"><span class="stat-val" style="color:${m.color}">${fn(m.res.raiz,8)} ${modelo.unidad}</span><span class="stat-lbl">x* encontrado</span></div>
          <div class="stat-box"><span class="stat-val">${m.res.iters.length}</span><span class="stat-lbl">Iteraciones usadas</span></div>
          <div class="stat-box"><span class="stat-val ok">${modelo.f(m.res.raiz).toExponential(3)}</span><span class="stat-lbl">Residuo f(x*)</span></div>
          <div class="stat-box"><span class="stat-val ${lastErr<tol?'ok':'warn'}">${lastErr?.toExponential(3)}</span><span class="stat-lbl">Error final</span></div>
        </div>
        <div class="table-wrap"><table><thead>${hdrsHtml}</thead><tbody>${bodyHtml}</tbody></table></div>`;
    }
    tabCnt.appendChild(pane);
  });

  // Interpretación dinámica
  const elInterp = document.getElementById('interpDinamica');
  if (elInterp && validos.length > 0) {
    const raizR = validos[0].res.raiz;
    const masRapido = validos.reduce((a,b)=>a.res.iters.length<=b.res.iters.length?a:b);
    elInterp.innerHTML = `
      <p style='font-weight:700;color:var(--accent);font-size:.95rem;margin-bottom:.8rem'>📊 Interpretación de los Resultados</p>
      <p style='font-size:.875rem;color:var(--text-secondary);margin-bottom:.8rem'>
        Modelo: <strong style='color:#fff'>${modelo.nombre}</strong> · ε = ${tol.toExponential(0)}
      </p>
      <div class='grid g-2' style='margin-bottom:.8rem'>
        <div class='table-wrap'><table>
          <thead><tr><th>Método</th><th>x* (${modelo.unidad})</th><th>Iteraciones</th><th>f(x*)</th></tr></thead>
          <tbody>${metodos.map(m => m.res.error
            ? `<tr><td style='color:${m.color}'>${m.nombre}</td><td colspan='3' class='err'>No convergió</td></tr>`
            : `<tr><td style='color:${m.color}'>${m.nombre}</td>
               <td class='hl'>${fn(m.res.raiz,6)}</td>
               <td>${m.res.iters.length}</td>
               <td class='ok'>${modelo.f(m.res.raiz).toExponential(3)}</td></tr>`
          ).join('')}</tbody>
        </table></div>
        <div class='table-wrap'><table>
          <thead><tr><th>Análisis</th><th>Resultado</th></tr></thead>
          <tbody>
            <tr><td>Método más rápido</td><td class='ok'>${masRapido.nombre} (${masRapido.res.iters.length} iter.)</td></tr>
            <tr><td>Convergieron</td><td class='ok'>${validos.filter(m=>m.res.iters[m.res.iters.length-1]?.err<tol).length}/${metodos.length} métodos</td></tr>
            ${validos.length>1?`<tr><td>Diferencia máx. entre raíces</td>
              <td class='${Math.max(...validos.map(a=>validos.map(b=>Math.abs(a.res.raiz-b.res.raiz))).flat())<1e-4?'ok':'warn'}'>
                ${Math.max(...validos.map(a=>validos.map(b=>Math.abs(a.res.raiz-b.res.raiz))).flat()).toExponential(3)}</td></tr>`:''}
          </tbody>
        </table></div>
      </div>
      <p style='font-size:.875rem;color:var(--text-secondary)'>${modelo.interp(raizR)}</p>`;
  }
}

function limpiarResultadosE() {
  document.getElementById('resultadosSection').classList.add('hidden');
  document.getElementById('alertGlobal').innerHTML = '';
  if (chartFx) { chartFx.destroy(); chartFx = null; }
  const el = document.getElementById('interpDinamica');
  if (el) el.innerHTML = '<p style="font-size:.875rem;color:var(--text-muted);text-align:center;padding:.8rem 0">▶ Selecciona un modelo y ejecuta el cálculo para ver la interpretación con los valores reales.</p>';
}
