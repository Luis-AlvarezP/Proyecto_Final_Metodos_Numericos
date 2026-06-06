document.getElementById('hamBtn').addEventListener('click', () =>
  document.getElementById('navMenu').classList.toggle('open'));
function mostrarTab(btn, id) {
  btn.closest('.card').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.closest('.card').querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(id).classList.add('active');
}

// ─── DATOS ────────────────────────────────────
const PRODS = {
  papa:     { nombre:'Papa',         unidad:'Bs/kg',  datos:[[1,8],[5,10],[10,13],[15,16],[20,19],[30,22]], q0:0.714 },
  arroz:    { nombre:'Arroz',        unidad:'Bs/kg',  datos:[[1,6],[7,7],[14,9],[21,12],[30,15]],          q0:0.5 },
  carne:    { nombre:'Carne de res', unidad:'Bs/kg',  datos:[[1,55],[5,58],[12,65],[20,72],[28,80]],       q0:0.3 },
  gasolina: { nombre:'Gasolina',     unidad:'Bs/lt',  datos:[[1,3.74],[5,3.74],[10,4.20],[18,5.50],[25,6.80]], q0:0.5 }
};

let chartGasto = null, chartComp = null;

function cambiarProductoD() {
  const p = PRODS[document.getElementById('producto').value];
  document.getElementById('q').value = p.q0;
  const xs = p.datos.map(d=>d[0]);
  document.getElementById('rangoA').value = xs[0];
  document.getElementById('rangoB').value = xs[xs.length-1];
  mostrarInfoProducto(p);
}

function mostrarInfoProducto(p) {
  const xs = p.datos.map(d=>d[0]), ys = p.datos.map(d=>d[1]);
  document.getElementById('infoProd').innerHTML = `
    <p style="font-weight:700;color:#93c5fd;margin-bottom:.5rem">Datos del producto: ${p.nombre}</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Día t</th><th>p(t) (${p.unidad})</th></tr></thead>
        <tbody>${p.datos.map(([t,v]) => `<tr><td>${t}</td><td>${v.toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <p style="font-size:.78rem;color:var(--text-muted);margin-top:.5rem">
      Precio mín: ${Math.min(...ys).toFixed(2)} · Precio máx: ${Math.max(...ys).toFixed(2)} ${p.unidad}
      · Incremento: +${((Math.max(...ys)/Math.min(...ys)-1)*100).toFixed(1)}%
    </p>`;
}

function cargarEscenarioCrisis() {
  document.getElementById('producto').value = 'papa';
  cambiarProductoD();
  document.getElementById('q').value = 0.714;
  document.getElementById('ingreso').value = 3500;
  document.getElementById('nSub').value = 30;
}

// ─── LAGRANGE ─────────────────────────────────
function evalLag(xs, ys, x) {
  return ys.reduce((sum, yi, i) => {
    let Li = 1;
    for (let j = 0; j < xs.length; j++) if (j !== i) Li *= (x - xs[j]) / (xs[i] - xs[j]);
    return sum + yi * Li;
  }, 0);
}

// ─── ALGORITMOS ───────────────────────────────
function trapecio(f, a, b, n) {
  const h = (b - a) / n;
  const pasos = [];
  let suma = 0;
  for (let i = 0; i <= n; i++) {
    const xi = a + i * h;
    const fi = f(xi);
    const peso = (i === 0 || i === n) ? 1 : 2;
    suma += peso * fi;
    pasos.push({ i, xi, fi, peso, contrib: peso * fi, acum: (h / 2) * suma });
  }
  return { valor: (h / 2) * suma, h, n, pasos };
}

function simpson13(f, a, b, n0) {
  const n = n0 % 2 === 0 ? n0 : n0 + 1;
  const h = (b - a) / n;
  const pasos = [];
  let suma = 0;
  for (let i = 0; i <= n; i++) {
    const xi = a + i * h;
    const fi = f(xi);
    const peso = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
    suma += peso * fi;
    pasos.push({ i, xi, fi, peso, contrib: peso * fi, acum: (h / 3) * suma });
  }
  return { valor: (h / 3) * suma, h, n, pasos };
}

function simpson38(f, a, b, n0) {
  let n = n0;
  while (n % 3 !== 0) n++;
  const h = (b - a) / n;
  const pasos = [];
  let suma = 0;
  for (let i = 0; i <= n; i++) {
    const xi = a + i * h;
    const fi = f(xi);
    const peso = (i === 0 || i === n) ? 1 : (i % 3 === 0 ? 2 : 3);
    suma += peso * fi;
    pasos.push({ i, xi, fi, peso, contrib: peso * fi, acum: (3 * h / 8) * suma });
  }
  return { valor: (3 * h / 8) * suma, h, n, pasos };
}

// ─── EJECUCIÓN PRINCIPAL ──────────────────────
function calcularIntegracion() {
  limpiarResultadosD();
  try {
    const prodKey = document.getElementById('producto').value;
    const prod    = PRODS[prodKey];
    const q       = parseFloat(document.getElementById('q').value);
    const ingreso = parseFloat(document.getElementById('ingreso').value);
    const n0      = parseInt(document.getElementById('nSub').value);
    const a       = parseFloat(document.getElementById('rangoA').value);
    const b       = parseFloat(document.getElementById('rangoB').value);

    if ([q, ingreso, n0, a, b].some(isNaN) || q <= 0 || ingreso <= 0 || n0 < 3 || b <= a)
      throw new Error('Parámetros inválidos. Verifica que a < b y n ≥ 6.');

    const xs = prod.datos.map(d => d[0]);
    const ys = prod.datos.map(d => d[1]);
    const C  = t => Math.max(0, evalLag(xs, ys, t)) * q;
    const p0 = Math.max(0, evalLag(xs, ys, a));
    const G0 = p0 * q * (b - a);

    const resTrap = trapecio(C, a, b, n0);
    const resS13  = simpson13(C, a, b, n0);
    const resS38  = simpson38(C, a, b, n0);

    document.getElementById('resultadosSection').classList.remove('hidden');
    mostrarResultadosD({ resTrap, resS13, resS38, q, ingreso, a, b, prod, G0, p0 });
  } catch(e) {
    document.getElementById('alertGlobal').innerHTML =
      `<div class="alert danger"><span class="aicon">❌</span><span>${e.message}</span></div>`;
    document.getElementById('resultadosSection').classList.remove('hidden');
  }
}

function mostrarResultadosD({ resTrap, resS13, resS38, q, ingreso, a, b, prod, G0, p0 }) {
  const ref   = resS13.valor;
  const PA13  = resS13.valor - G0;
  const pct   = ((resS13.valor / ingreso) * 100).toFixed(1);
  const metodos = [
    { key:'trap', nombre:'Trapecio',    color:'#60a5fa', res:resTrap, pesos:'1,2,…,2,1',    factor:'h/2' },
    { key:'s13',  nombre:'Simpson 1/3', color:'#34d399', res:resS13,  pesos:'1,4,2,4,…,1',  factor:'h/3' },
    { key:'s38',  nombre:'Simpson 3/8', color:'#fbbf24', res:resS38,  pesos:'1,3,3,2,…,1',  factor:'3h/8' }
  ];

  // KPIs
  document.getElementById('kpis').innerHTML = metodos.map(m => `
    <div class="stat-box">
      <span class="stat-val" style="color:${m.color}">${m.res.valor.toFixed(2)} Bs</span>
      <span class="stat-lbl">${m.nombre} (n=${m.res.n})</span>
    </div>`).join('') + `
    <div class="stat-box">
      <span class="stat-val ${PA13>0?'err':'ok'}">${PA13>0?'+':''}${PA13.toFixed(2)} Bs</span>
      <span class="stat-lbl">Pérdida Poder Adq. (S1/3)</span>
    </div>
    <div class="stat-box">
      <span class="stat-val warn">${pct}%</span>
      <span class="stat-lbl">% del ingreso mensual</span>
    </div>
    <div class="stat-box">
      <span class="stat-val ok">${G0.toFixed(2)} Bs</span>
      <span class="stat-lbl">Gasto sin crisis (p₀·q·T)</span>
    </div>`;

  // Chart 1: curva C(t)
  if (chartGasto) chartGasto.destroy();
  const nPts = 100;
  const paso = (b - a) / nPts;
  const tArr = Array.from({length:nPts+1}, (_,i) => a + i * paso);
  const xs = prod.datos.map(d=>d[0]), ys = prod.datos.map(d=>d[1]);
  const cArr = tArr.map(t => Math.max(0, evalLag(xs, ys, t)) * q);
  chartGasto = new Chart(document.getElementById('chartGasto').getContext('2d'), {
    type:'line',
    data:{
      labels: tArr.map(t => t.toFixed(1)),
      datasets:[{
        label:`C(t) = p(t)·${q.toFixed(3)} ${prod.unidad}/día`,
        data: cArr,
        borderColor:'#a78bfa', backgroundColor:'#a78bfa22',
        borderWidth:2, fill:true, pointRadius:0, tension:.3
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{color:'#94a3b8'}} },
      scales:{
        x:{ ticks:{color:'#94a3b8',maxTicksLimit:10}, grid:{color:'#2d4060'},
            title:{display:true,text:'Día t',color:'#94a3b8'} },
        y:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true,text:`C(t) (Bs/día)`,color:'#94a3b8'} }
      }
    }
  });

  // Chart 2: comparación de resultados
  if (chartComp) chartComp.destroy();
  chartComp = new Chart(document.getElementById('chartComp').getContext('2d'), {
    type:'bar',
    data:{
      labels:['Trapecio','Simpson 1/3','Simpson 3/8','Sin crisis (G₀)'],
      datasets:[{
        label:'Gasto acumulado (Bs)',
        data:[resTrap.valor, resS13.valor, resS38.valor, G0],
        backgroundColor:['#60a5fa88','#34d39988','#fbbf2488','#6ee7b788'],
        borderColor:['#60a5fa','#34d399','#fbbf24','#6ee7b7'],
        borderWidth:2, borderRadius:4
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{color:'#94a3b8'}} },
      scales:{
        x:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'} },
        y:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true,text:'Gasto (Bs)',color:'#94a3b8'} }
      }
    }
  });

  // Tabla comparativa
  document.getElementById('tablaComp').innerHTML = `
    <table>
      <thead><tr><th>Método</th><th>n usado</th><th>h</th><th>G estimado (Bs)</th><th>Dif. vs S1/3</th><th>PA (Bs)</th><th>% ingreso</th></tr></thead>
      <tbody>
        ${metodos.map(m => `<tr>
          <td style="color:${m.color};font-weight:700">${m.nombre}</td>
          <td>${m.res.n}</td>
          <td>${m.res.h.toFixed(4)}</td>
          <td class="hl">${m.res.valor.toFixed(4)} Bs</td>
          <td class="${Math.abs(m.res.valor-ref)<0.01?'ok':'err'}">${(m.res.valor-ref).toExponential(3)}</td>
          <td class="${m.res.valor-G0>0?'err':'ok'}">${(m.res.valor-G0)>0?'+':''}${(m.res.valor-G0).toFixed(2)} Bs</td>
          <td class="${m.res.valor/ingreso>0.3?'err':'ok'}">${((m.res.valor/ingreso)*100).toFixed(1)}%</td>
        </tr>`).join('')}
        <tr style="background:var(--bg-surface)">
          <td><em>Sin crisis (G₀)</em></td><td>—</td><td>—</td>
          <td>${G0.toFixed(4)} Bs</td><td class="ok">Referencia</td>
          <td class="ok">0.00 Bs</td>
          <td>${((G0/ingreso)*100).toFixed(1)}%</td>
        </tr>
      </tbody>
    </table>`;

  // Tabs por método
  const tabNav = document.getElementById('methodTabsNav');
  const tabContent = document.getElementById('methodTabsContent');
  tabNav.innerHTML = ''; tabContent.innerHTML = '';
  metodos.forEach((m, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (idx===0?' active':'');
    btn.style.borderBottomColor = idx===0 ? m.color : 'transparent';
    btn.style.color = idx===0 ? m.color : '';
    btn.textContent = m.nombre;
    btn.onclick = () => {
      tabNav.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('active');b.style.borderBottomColor='transparent';b.style.color='';});
      tabContent.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active'); btn.style.borderBottomColor=m.color; btn.style.color=m.color;
      document.getElementById(`td_${m.key}`).classList.add('active');
    };
    tabNav.appendChild(btn);

    const limPasos = m.res.pasos.length > 65 ? [...m.res.pasos.slice(0,55), {sep:true}, ...m.res.pasos.slice(-5)] : m.res.pasos;
    const pane = document.createElement('div');
    pane.className = 'tab-pane' + (idx===0?' active':'');
    pane.id = `td_${m.key}`;
    pane.innerHTML = `
      <div class="stats-grid" style="margin-bottom:.8rem">
        <div class="stat-box"><span class="stat-val" style="color:${m.color}">${m.res.valor.toFixed(4)} Bs</span><span class="stat-lbl">G estimado</span></div>
        <div class="stat-box"><span class="stat-val">${m.res.n}</span><span class="stat-lbl">Subintervalos n</span></div>
        <div class="stat-box"><span class="stat-val">${m.res.h.toFixed(4)}</span><span class="stat-lbl">h = (b−a)/n</span></div>
        <div class="stat-box"><span class="stat-val ${m.res.valor-G0>0?'err':'ok'}">${(m.res.valor-G0)>0?'+':''}${(m.res.valor-G0).toFixed(2)} Bs</span><span class="stat-lbl">Pérdida PA</span></div>
      </div>
      <div class="alert info" style="margin-bottom:.8rem">
        <span class="aicon">📐</span>
        <span>Fórmula: G = (${m.factor})·Σ(peso·C(tᵢ)) donde C(tᵢ) = p(tᵢ)·${q.toFixed(3)} · Pesos: ${m.pesos}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>i</th><th>tᵢ (día)</th><th>p(tᵢ) (${prod.unidad})</th><th>C(tᵢ)=p·q</th><th>Peso</th><th>Contrib.</th><th>G acumulado</th></tr></thead>
          <tbody>
            ${limPasos.map(row => row.sep ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">… ${m.res.pasos.length-60} pasos omitidos …</td></tr>` : `
            <tr>
              <td class="hl">${row.i}</td>
              <td>${row.xi.toFixed(4)}</td>
              <td>${(row.fi/q).toFixed(4)}</td>
              <td>${row.fi.toFixed(4)}</td>
              <td class="${row.peso===4||row.peso===3?'warn':row.peso===1?'ok':'c-muted'}">${row.peso}</td>
              <td>${row.contrib.toFixed(4)}</td>
              <td class="ok">${row.acum.toFixed(4)} Bs</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    tabContent.appendChild(pane);
  });

  // Interpretación dinámica en conclusiones
  const elInterp = document.getElementById('interpDinamica');
  if (elInterp) {
    elInterp.innerHTML = `
      <p style='font-weight:700;color:var(--accent);font-size:.95rem;margin-bottom:.8rem'>📊 Interpretación de los Resultados</p>
      <p style='font-size:.875rem;color:var(--text-secondary);margin-bottom:.8rem'>
        Producto: <strong style='color:#fff'>${prod.nombre}</strong> · q = ${q.toFixed(3)} ${prod.unidad}/día ·
        Período: días ${a}–${b} · Ingreso mensual: ${ingreso.toFixed(0)} Bs
      </p>
      <div class='grid g-2' style='margin-bottom:.8rem'>
        <div>
          <p style='font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:.4rem'>Gasto acumulado G = ∫ C(t) dt calculado:</p>
          <div class='table-wrap'><table>
            <thead><tr><th>Método</th><th>G (Bs)</th><th>Diferencia vs S1/3</th></tr></thead>
            <tbody>
              ${metodos.map(m => `<tr>
                <td style='color:${m.color}'>${m.nombre}</td>
                <td class='hl'>${m.res.valor.toFixed(3)} Bs</td>
                <td class='${Math.abs(m.res.valor-ref)<0.1?'ok':'err'}'>${(m.res.valor-ref).toExponential(3)}</td>
              </tr>`).join('')}
              <tr><td><em>Sin crisis (G₀)</em></td><td>${G0.toFixed(3)} Bs</td><td class='ok'>Referencia</td></tr>
            </tbody>
          </table></div>
        </div>
        <div>
          <p style='font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:.4rem'>Impacto sobre el presupuesto familiar:</p>
          <div class='table-wrap'><table>
            <thead><tr><th>Situación</th><th>Gasto (Bs)</th><th>Diferencia</th></tr></thead>
            <tbody>
              <tr><td class='ok'>Sin crisis (p₀=${p0.toFixed(2)} ${prod.unidad})</td><td>${G0.toFixed(2)} Bs</td><td class='ok'>Base</td></tr>
              <tr><td class='err'>Con crisis (S1/3)</td><td class='err'>${resS13.valor.toFixed(2)} Bs</td><td class='err'>${PA13>=0?'+':''}${PA13.toFixed(2)} Bs (${((PA13/G0)*100).toFixed(1)}%)</td></tr>
              <tr><td>% del ingreso mensual</td><td class='${resS13.valor/ingreso>0.2?'err':'ok'}'>${((resS13.valor/ingreso)*100).toFixed(1)}%</td><td>del ingreso de ${ingreso} Bs</td></tr>
            </tbody>
          </table></div>
        </div>
      </div>
      <p style='font-size:.875rem;color:var(--text-secondary)'>
        <strong style='color:#fff'>Con los datos ingresados:</strong>
        Una familia que consume ${q.toFixed(3)} ${prod.unidad}/día de ${prod.nombre} gasta
        <strong style='color:${PA13>0?'var(--danger)':'var(--success)'}'>${resS13.valor.toFixed(2)} Bs</strong>
        en el período (${a}–${b} días) durante la crisis,
        vs. ${G0.toFixed(2)} Bs sin crisis — una diferencia de
        <strong style='color:var(--danger)'>${PA13>=0?'+':''}${PA13.toFixed(2)} Bs (${((PA13/G0)*100).toFixed(1)}%)</strong>.
        Esto representa el <strong>${((resS13.valor/ingreso)*100).toFixed(1)}%</strong> del ingreso mensual familiar.
        Simpson 1/3 (referencia de precisión) difiere del Trapecio en ${Math.abs(resTrap.valor-ref).toFixed(4)} Bs.
      </p>`;
  }
}

// ─── LIMPIAR ──────────────────────────────────
function limpiarResultadosD() {
  document.getElementById('resultadosSection').classList.add('hidden');
  document.getElementById('alertGlobal').innerHTML = '';
  if (chartGasto) { chartGasto.destroy(); chartGasto = null; }
  if (chartComp)  { chartComp.destroy();  chartComp  = null; }
  const el = document.getElementById('interpDinamica');
  if (el) el.innerHTML = '<p style="font-size:.875rem;color:var(--text-muted);text-align:center;padding:.8rem 0">▶ Selecciona un producto y ejecuta el cálculo para ver la interpretación con los valores reales.</p>';
}

// Inicializar
cambiarProductoD();
