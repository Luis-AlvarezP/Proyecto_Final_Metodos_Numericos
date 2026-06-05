/* =============================================
   ESCENARIO C — Interpolación Numérica
   Métodos: Lagrange · Newton DD · Splines Cúbicos
   ============================================= */

let chartPrecios = null;

// ─── DATOS DE PRODUCTOS ──────────────────────
const PRODUCTOS = {
  papa:     { nombre:'Papa',        unidad:'Bs/kg',  datos: [[1,8],[5,10],[10,13],[15,16],[20,19],[30,22]] },
  arroz:    { nombre:'Arroz',       unidad:'Bs/kg',  datos: [[1,6],[7,7],[14,9],[21,12],[30,15]] },
  carne:    { nombre:'Carne de res',unidad:'Bs/kg',  datos: [[1,55],[5,58],[12,65],[20,72],[28,80]] },
  gasolina: { nombre:'Gasolina',    unidad:'Bs/lt',  datos: [[1,3.74],[5,3.74],[10,4.20],[18,5.50],[25,6.80]] },
  personalizado: { nombre:'Personalizado', unidad:'Bs', datos: [[1,10],[10,15],[20,25],[30,30]] }
};

let filaCount = 0;

// ─── TABLA DE DATOS EDITABLE ─────────────────
function cambiarProducto() {
  const prod = document.getElementById('producto').value;
  const datos = PRODUCTOS[prod].datos;
  const tbody = document.getElementById('datosBody');
  tbody.innerHTML = '';
  filaCount = 0;
  datos.forEach(([x, y]) => insertarFila(x, y));
}

function insertarFila(x = '', y = '') {
  filaCount++;
  const id = filaCount;
  const tbody = document.getElementById('datosBody');
  const tr = document.createElement('tr');
  tr.id = `fila_${id}`;
  tr.innerHTML = `
    <td class="tnorm">${id}</td>
    <td><input type="number" id="x_${id}" value="${x}" min="0" max="365" step="1"
         style="width:80px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--r-sm);
                padding:.4rem;color:var(--text-primary);font-family:var(--mono);font-size:.82rem;text-align:center"></td>
    <td><input type="number" id="y_${id}" value="${y}" step="any"
         style="width:90px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--r-sm);
                padding:.4rem;color:var(--text-primary);font-family:var(--mono);font-size:.82rem;text-align:center"></td>
    <td><button class="btn btn-danger" style="padding:.25rem .6rem;font-size:.72rem" onclick="eliminarFila(${id})">✕</button></td>`;
  tbody.appendChild(tr);
}

function agregarFila() {
  const filas = document.getElementById('datosBody').querySelectorAll('tr');
  if (filas.length >= 10) {
    alert('Máximo 10 puntos de datos.'); return;
  }
  insertarFila();
}

function eliminarFila(id) {
  const filas = document.getElementById('datosBody').querySelectorAll('tr');
  if (filas.length <= 3) { alert('Se necesitan al menos 3 puntos.'); return; }
  const tr = document.getElementById(`fila_${id}`);
  if (tr) tr.remove();
}

function leerDatos() {
  const tbody = document.getElementById('datosBody');
  const filas = tbody.querySelectorAll('tr');
  const puntos = [];
  filas.forEach(tr => {
    const idParts = tr.id.split('_');
    const id = idParts[1];
    const x = parseFloat(document.getElementById(`x_${id}`)?.value);
    const y = parseFloat(document.getElementById(`y_${id}`)?.value);
    if (!isNaN(x) && !isNaN(y)) puntos.push({ x, y });
  });
  // Ordenar por x
  puntos.sort((a,b) => a.x - b.x);
  // Verificar no hay x duplicados
  for (let i = 1; i < puntos.length; i++) {
    if (puntos[i].x === puntos[i-1].x) throw new Error(`El día ${puntos[i].x} aparece duplicado.`);
  }
  return puntos;
}

// ─── LAGRANGE ────────────────────────────────
function evaluarLagrange(xs, ys, x) {
  const n = xs.length;
  let resultado = 0;
  for (let i = 0; i < n; i++) {
    let Li = 1;
    for (let j = 0; j < n; j++) {
      if (j !== i) Li *= (x - xs[j]) / (xs[i] - xs[j]);
    }
    resultado += ys[i] * Li;
  }
  return resultado;
}

// ─── NEWTON (Diferencias Divididas) ──────────
function tablaDiferenciasDivididas(xs, ys) {
  const n = xs.length;
  // tabla[i][j] = diferencia dividida de orden j que empieza en i
  const tabla = Array.from({length:n}, (_,i) => new Array(n).fill(0));
  for (let i = 0; i < n; i++) tabla[i][0] = ys[i];

  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      tabla[i][j] = (tabla[i+1][j-1] - tabla[i][j-1]) / (xs[i+j] - xs[i]);
    }
  }
  return tabla;
}

function evaluarNewton(xs, tabla, x) {
  const n = xs.length;
  // Coeficientes son tabla[0][0], tabla[0][1], ..., tabla[0][n-1]
  let resultado = tabla[0][n-1];
  for (let i = n-2; i >= 0; i--) {
    resultado = tabla[0][i] + (x - xs[i]) * resultado;
  }
  return resultado;
}

// ─── SPLINES CÚBICOS NATURALES ───────────────
function calcularSplines(xs, ys) {
  const n = xs.length;
  const h = Array.from({length: n-1}, (_,i) => xs[i+1] - xs[i]);

  if (n === 2) {
    // Caso degenera: una recta
    return {
      M: [0, 0],
      evaluar: (x) => {
        const t = (x - xs[0]) / h[0];
        return ys[0] + t * (ys[1] - ys[0]);
      }
    };
  }

  // Sistema tridiagonal para M[1..n-2] (M[0] = M[n-1] = 0, natural)
  const size = n - 2;
  if (size <= 0) return null;

  const diag   = new Array(size);
  const superD = new Array(size-1);
  const subD   = new Array(size-1);
  const rhs    = new Array(size);

  for (let i = 0; i < size; i++) {
    diag[i] = 2 * (h[i] + h[i+1]);
    rhs[i]  = 6 * ((ys[i+2] - ys[i+1]) / h[i+1] - (ys[i+1] - ys[i]) / h[i]);
    if (i < size-1) superD[i] = h[i+1];
    if (i > 0)      subD[i-1] = h[i];
  }

  // Algoritmo de Thomas para sistema tridiagonal
  const Mint = thomas(subD, diag, superD, rhs);
  const M = [0, ...Mint, 0];

  const evaluar = (x) => {
    // Buscar intervalo
    let k = n-2;
    for (let i = 0; i < n-1; i++) {
      if (x <= xs[i+1]) { k = i; break; }
    }
    k = Math.max(0, Math.min(k, n-2));

    const hk  = h[k];
    const dx  = x - xs[k];
    const a   = ys[k];
    const b   = (ys[k+1] - ys[k]) / hk - hk / 6 * (2 * M[k] + M[k+1]);
    const c   = M[k] / 2;
    const d   = (M[k+1] - M[k]) / (6 * hk);
    return a + b*dx + c*dx*dx + d*dx*dx*dx;
  };

  return { M, evaluar };
}

function thomas(lower, diag, upper, rhs) {
  const n = diag.length;
  if (n === 0) return [];
  const c = [...diag], r = [...rhs], x = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const m = lower[i-1] / c[i-1];
    c[i] -= m * upper[i-1];
    r[i] -= m * r[i-1];
  }
  x[n-1] = r[n-1] / c[n-1];
  for (let i = n-2; i >= 0; i--) {
    x[i] = (r[i] - upper[i] * x[i+1]) / c[i];
  }
  return x;
}

// ─── LAGRANGE: tabla de base polinomial ──────
function tablasLagrange(xs, ys, xc) {
  const n = xs.length;
  const rows = xs.map((xi, i) => {
    let Li = 1;
    let numStr = '', denStr = '';
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        Li  *= (xc - xs[j]) / (xi - xs[j]);
        numStr += `(${xc}-${xs[j]})`;
        denStr += `(${xi}-${xs[j]})`;
      }
    }
    return { i, xi, yi: ys[i], Li, aporte: ys[i] * Li, numStr, denStr };
  });
  const total = rows.reduce((s, r) => s + r.aporte, 0);
  return { rows, total };
}

// ─── NEWTON: evaluación paso a paso ──────────
function evaluarNewtonPasos(xs, tabla, xc) {
  const n = xs.length;
  const coefs = Array.from({length:n}, (_,i) => tabla[0][i]);
  const pasos = [];
  // Horner: acumulador de afuera hacia adentro
  let acum = coefs[n-1];
  pasos.push({ k: n-1, coef: coefs[n-1], factor: '—', acum, desc: `Iniciar con coef[${n-1}] = f[x₀,...,x${n-1}]` });
  for (let i = n-2; i >= 0; i--) {
    const factor = xc - xs[i];
    acum = coefs[i] + factor * acum;
    pasos.push({ k: i, coef: coefs[i], factor, acum,
      desc: `coef[${i}] + (x*−x${i})·prev = ${coefs[i].toFixed(4)} + (${xc}−${xs[i]})·prev` });
  }
  return { coefs, pasos, total: acum };
}

// ─── SPLINES: coeficientes por segmento ──────
function calcularCoefSplines(xs, ys, M) {
  const n = xs.length;
  const h = Array.from({length: n-1}, (_,i) => xs[i+1] - xs[i]);
  return Array.from({length: n-1}, (_, k) => {
    const a = ys[k];
    const b = (ys[k+1] - ys[k]) / h[k] - h[k] / 6 * (2 * M[k] + M[k+1]);
    const c = M[k] / 2;
    const d = (M[k+1] - M[k]) / (6 * h[k]);
    return { k, x0: xs[k], x1: xs[k+1], h: h[k], a, b, c, d };
  });
}

// ─── EJECUCIÓN PRINCIPAL ─────────────────────
function ejecutarInterpolacion() {
  limpiarResultados();
  try {
    const puntos    = leerDatos();
    if (puntos.length < 3) throw new Error('Se necesitan al menos 3 puntos de datos.');

    const xs        = puntos.map(p => p.x);
    const ys        = puntos.map(p => p.y);
    const xConsulta = parseFloat(document.getElementById('xConsulta').value);
    const xMin      = parseFloat(document.getElementById('xMin').value)  || 1;
    const xMax      = parseFloat(document.getElementById('xMax').value)  || 30;
    const prodKey   = document.getElementById('producto').value;
    const prod      = PRODUCTOS[prodKey];

    if (isNaN(xConsulta)) throw new Error('Ingresa un día de consulta válido.');

    document.getElementById('resultadosSection').classList.remove('hidden');

    const tablaDD   = tablaDiferenciasDivididas(xs, ys);
    const splineRes = calcularSplines(xs, ys);
    const coefsSpl  = splineRes ? calcularCoefSplines(xs, ys, splineRes.M) : null;

    const valLag    = evaluarLagrange(xs, ys, xConsulta);
    const valNewt   = evaluarNewton(xs, tablaDD, xConsulta);
    const valSpl    = splineRes ? splineRes.evaluar(xConsulta) : null;

    const lagData   = tablasLagrange(xs, ys, xConsulta);
    const newtData  = evaluarNewtonPasos(xs, tablaDD, xConsulta);

    const puntosCurva = 120;
    const paso = (xMax - xMin) / puntosCurva;
    const curvaX = Array.from({length: puntosCurva+1}, (_,i) => xMin + i * paso);

    const curvaLag  = curvaX.map(x => evaluarLagrange(xs, ys, x));
    const curvaNewt = curvaX.map(x => evaluarNewton(xs, tablaDD, x));
    const curvaSpl  = splineRes ? curvaX.map(x => splineRes.evaluar(x)) : null;

    mostrarResultados({
      puntos, xs, ys, xConsulta, xMin, xMax, prod,
      tablaDD, splineRes, coefsSpl,
      valLag, valNewt, valSpl,
      lagData, newtData,
      curvaX, curvaLag, curvaNewt, curvaSpl
    });

  } catch(e) {
    document.getElementById('alertInterp').innerHTML =
      `<div class="alert danger"><span class="aicon">❌</span><span>${e.message}</span></div>`;
    document.getElementById('resultadosSection').classList.remove('hidden');
  }
}

// ─── MOSTRAR RESULTADOS ───────────────────────
function mostrarResultados(p) {
  const extrapola = p.xConsulta < p.xs[0] || p.xConsulta > p.xs[p.xs.length-1];
  if (extrapola) {
    document.getElementById('alertInterp').innerHTML = `
      <div class="alert warning"><span class="aicon">⚠</span>
        <span>Día ${p.xConsulta} fuera del rango [${p.xs[0]}, ${p.xs[p.xs.length-1]}].
        Esto es <strong>extrapolación</strong> — resultados menos confiables.</span></div>`;
  }

  // ── KPIs ──
  const maxY = Math.max(...p.ys), minY = Math.min(...p.ys);
  const incr = ((maxY - minY) / minY * 100).toFixed(1);
  document.getElementById('kpis').innerHTML = `
    <div class="stat-box">
      <span class="stat-val" style="color:#f87171">${p.valLag.toFixed(3)}</span>
      <span class="stat-lbl">Lagrange día ${p.xConsulta} (Bs)</span>
    </div>
    <div class="stat-box">
      <span class="stat-val" style="color:#a78bfa">${p.valNewt.toFixed(3)}</span>
      <span class="stat-lbl">Newton DD día ${p.xConsulta} (Bs)</span>
    </div>
    <div class="stat-box">
      <span class="stat-val" style="color:#34d399">${p.valSpl !== null ? p.valSpl.toFixed(3) : '–'}</span>
      <span class="stat-lbl">Splines día ${p.xConsulta} (Bs)</span>
    </div>
    <div class="stat-box">
      <span class="stat-val warn">+${incr}%</span>
      <span class="stat-lbl">Incremento total período</span>
    </div>
    <div class="stat-box">
      <span class="stat-val">${p.puntos.length}</span>
      <span class="stat-lbl">Puntos de datos</span>
    </div>`;

  // ── Gráfico (siempre los 3 métodos) ──
  if (chartPrecios) chartPrecios.destroy();
  const ctx = document.getElementById('chartPrecios').getContext('2d');
  const datasets = [
    { label:'Lagrange', type:'line',
      data: p.curvaX.map((x,i) => ({x, y: p.curvaLag[i]})),
      borderColor:'#f87171', pointRadius:0, borderWidth:2, fill:false, tension:.3 },
    { label:'Newton DD', type:'line',
      data: p.curvaX.map((x,i) => ({x, y: p.curvaNewt[i]})),
      borderColor:'#a78bfa', pointRadius:0, borderWidth:2, borderDash:[6,3], fill:false, tension:.3 },
    ...(p.curvaSpl ? [{ label:'Splines Cúbicos', type:'line',
      data: p.curvaX.map((x,i) => ({x, y: p.curvaSpl[i]})),
      borderColor:'#34d399', pointRadius:0, borderWidth:2.5, fill:false, tension:.3 }] : []),
    { label:`Datos: ${p.prod.nombre}`, type:'scatter',
      data: p.puntos.map(pt => ({x:pt.x, y:pt.y})),
      backgroundColor:'#fbbf24', borderColor:'#fbbf24', pointRadius:7, pointHoverRadius:10 },
    { label:`Estimado día ${p.xConsulta}`, type:'scatter',
      data: [{ x: p.xConsulta, y: p.valSpl ?? p.valNewt }],
      backgroundColor:'#ef4444', borderColor:'#fff', pointRadius:9, pointStyle:'star' }
  ];
  chartPrecios = new Chart(ctx, {
    type:'line', data:{ datasets },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#94a3b8' } } },
      scales:{
        x:{ type:'linear', ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true, text:'Día del mes', color:'#94a3b8'} },
        y:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true, text:`Precio (${p.prod.unidad})`, color:'#94a3b8'} }
      }
    }
  });

  // ── Tabla comparación ──
  document.getElementById('tablaComp').innerHTML = `
    <table>
      <thead><tr><th>Método</th><th>P(día ${p.xConsulta})</th><th>vs. Newton</th><th>Observación</th></tr></thead>
      <tbody>
        <tr>
          <td style="color:#f87171;font-weight:700">Lagrange</td>
          <td class="hl">${p.valLag.toFixed(5)} ${p.prod.unidad}</td>
          <td>${(p.valLag-p.valNewt).toExponential(3)}</td>
          <td>Polinomio global grado ${p.xs.length-1}</td>
        </tr>
        <tr>
          <td style="color:#a78bfa;font-weight:700">Newton DD</td>
          <td class="hl">${p.valNewt.toFixed(5)} ${p.prod.unidad}</td>
          <td>—</td>
          <td>Mismo polinomio (Horner)</td>
        </tr>
        ${p.valSpl !== null ? `<tr>
          <td style="color:#34d399;font-weight:700">Splines Cúbicos</td>
          <td class="hl">${p.valSpl.toFixed(5)} ${p.prod.unidad}</td>
          <td>${(p.valSpl-p.valNewt).toExponential(3)}</td>
          <td>Cúbico por tramos, C²</td>
        </tr>` : ''}
      </tbody>
    </table>`;

  // ── Interpretación ──
  document.getElementById('interpretacion').innerHTML = `
    <h4>📝 Interpretación de los Resultados</h4>
    <ul>
      <li>El precio de <strong>${p.prod.nombre}</strong> en el día <strong>${p.xConsulta}</strong>:
          Lagrange = ${p.valLag.toFixed(2)} · Newton = ${p.valNewt.toFixed(2)}
          ${p.valSpl !== null ? `· Splines = ${p.valSpl.toFixed(2)} ${p.prod.unidad}` : ''}</li>
      <li>El precio aumentó <strong>+${incr}%</strong> durante el período, reflejo del impacto de la crisis.</li>
      <li>Lagrange y Newton producen el mismo polinomio (diferencia numérica ≈ ${Math.abs(p.valLag-p.valNewt).toExponential(2)}).
          Los splines difieren porque usan cúbicos por tramos, evitando oscilaciones de Runge.</li>
      ${extrapola ? '<li><strong style="color:var(--danger)">Extrapolación:</strong> día fuera del rango — usar con precaución.</li>' : ''}
      <li>Cada pestaña de "Proceso de Resolución" muestra el detalle completo de cada método.</li>
    </ul>`;

  // ── Interpretación dinámica en sección conclusiones ──
  const elInterp = document.getElementById('interpDinamica');
  if (elInterp) {
    const yMin = Math.min(...p.ys), yMax = Math.max(...p.ys);
    const incrPorc = ((yMax - yMin) / yMin * 100).toFixed(1);
    const diffLagNewt = Math.abs(p.valLag - p.valNewt);
    elInterp.innerHTML = `
      <p style='font-weight:700;color:var(--accent);font-size:.95rem;margin-bottom:.8rem'>📊 Interpretación de los Resultados</p>
      <p style='font-size:.875rem;color:var(--text-secondary);margin-bottom:.8rem'>
        Producto: <strong style='color:#fff'>${p.prod.nombre}</strong> ·
        ${p.puntos.length} puntos de datos · Consulta en día
        <strong>${p.xConsulta}</strong>
        ${extrapola ? '<span style=\'color:var(--danger)\'>(⚠ extrapolación — fuera del rango registrado)</span>' : '(interpolación)'}
      </p>
      <div class='grid g-2' style='margin-bottom:.8rem'>
        <div>
          <p style='font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:.4rem'>Estimación en día ${p.xConsulta}:</p>
          <div class='table-wrap'><table>
            <thead><tr><th>Método</th><th>Valor estimado</th><th>Dif. vs. Splines</th></tr></thead>
            <tbody>
              <tr>
                <td style='color:#f87171'>Lagrange</td>
                <td class='hl'>${p.valLag.toFixed(4)} ${p.prod.unidad}</td>
                <td>${p.valSpl !== null ? Math.abs(p.valLag-p.valSpl).toExponential(3) : '—'}</td>
              </tr>
              <tr>
                <td style='color:#a78bfa'>Newton DD</td>
                <td class='hl'>${p.valNewt.toFixed(4)} ${p.prod.unidad}</td>
                <td>${p.valSpl !== null ? Math.abs(p.valNewt-p.valSpl).toExponential(3) : '—'}</td>
              </tr>
              ${p.valSpl !== null ? `<tr>
                <td style='color:#34d399;font-weight:700'>Splines</td>
                <td class='hl ok'>${p.valSpl.toFixed(4)} ${p.prod.unidad}</td>
                <td class='ok'>Referencia suave</td>
              </tr>` : '<tr><td colspan=\'3\' style=\'color:var(--text-muted)\'>Splines: se necesitan ≥ 3 puntos bien espaciados</td></tr>'}
            </tbody>
          </table></div>
        </div>
        <div>
          <p style='font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:.4rem'>Evolución de precios registrada:</p>
          <div class='table-wrap'><table>
            <thead><tr><th>Día</th><th>Precio (${p.prod.unidad})</th><th>Variación acum.</th></tr></thead>
            <tbody>
              ${p.xs.map((x, i) => `<tr>
                <td>${x}</td>
                <td>${p.ys[i].toFixed(2)}</td>
                <td class='${i===0?'ok':'err'}'>${i===0?'Base':'+'+((p.ys[i]-yMin)/yMin*100).toFixed(1)+'%'}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>
      </div>
      <p style='font-size:.875rem;color:var(--text-secondary)'>
        <strong style='color:#fff'>Con los datos ingresados:</strong>
        El precio de <strong>${p.prod.nombre}</strong> aumentó
        <strong style='color:var(--danger)'>+${incrPorc}%</strong>
        en el período (de ${yMin.toFixed(2)} a ${yMax.toFixed(2)} ${p.prod.unidad}).
        En el día ${p.xConsulta}: Lagrange/Newton estiman
        <strong>${p.valLag.toFixed(3)} ${p.prod.unidad}</strong>
        ${p.valSpl !== null ? `vs. Splines: <strong>${p.valSpl.toFixed(3)} ${p.prod.unidad}</strong>
        (diferencia: ${Math.abs(p.valLag-p.valSpl).toFixed(4)} ${p.prod.unidad}).` : '.'}
        Diferencia numérica Lagrange−Newton: ${diffLagNewt.toExponential(3)} (errores de redondeo — son algebraicamente idénticos).
        ${extrapola ? '<strong style=\'color:var(--danger)\'>⚠ Extrapolación: resultado menos confiable fuera del rango de datos.</strong>' : ''}
      </p>`;
  }

  // ── Tabs por método ──
  const metodos = [
    { key:'lag', nombre:'Lagrange', color:'#f87171' },
    { key:'newtdd', nombre:'Newton DD', color:'#a78bfa' },
    { key:'spl', nombre:'Splines', color:'#34d399' }
  ];
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
      tabContent.querySelectorAll('.tab-pane').forEach(pn => pn.classList.remove('active'));
      btn.classList.add('active');
      btn.style.borderBottomColor = m.color;
      btn.style.color = m.color;
      document.getElementById(`tmc_${m.key}`).classList.add('active');
    };
    tabNav.appendChild(btn);
    const pane = document.createElement('div');
    pane.className = 'tab-pane' + (idx===0 ? ' active' : '');
    pane.id = `tmc_${m.key}`;
    pane.innerHTML = buildMethodContent(m, p);
    tabContent.appendChild(pane);
  });
}

// ─── CONTENIDO DE CADA TAB ────────────────────
function buildMethodContent(m, p) {
  if (m.key === 'lag') {
    const { rows, total } = p.lagData;
    let sum = 0;
    return `
      <p class="form-label">Polinomio de Lagrange — Tablas de Base Lᵢ(x*)</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
        P(x*) = Σ yᵢ·Lᵢ(x*)  donde  Lᵢ(x*) = Πⱼ≠ᵢ (x*−xⱼ)/(xᵢ−xⱼ)  · x* = ${p.xConsulta}
      </p>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>i</th><th>xᵢ</th><th>yᵢ</th>
            <th>Lᵢ(x*) = numerador/denominador</th>
            <th>Lᵢ(x*)</th>
            <th>yᵢ·Lᵢ(x*)</th>
            <th>Suma acumulada</th>
          </tr></thead>
          <tbody>
            ${rows.map(r => { sum += r.aporte; return `<tr>
              <td>${r.i}</td>
              <td class="hl">${r.xi}</td>
              <td>${r.yi.toFixed(4)}</td>
              <td style="font-size:.72rem;font-family:var(--mono)">${r.numStr} / ${r.denStr}</td>
              <td>${r.Li.toFixed(6)}</td>
              <td class="${Math.abs(r.aporte)>0.01?'':'c-muted'}">${r.aporte.toFixed(6)}</td>
              <td style="color:#f87171">${sum.toFixed(6)}</td>
            </tr>`; }).join('')}
            <tr style="background:rgba(248,113,113,.12);font-weight:700">
              <td colspan="5">Total P(${p.xConsulta})</td>
              <td style="color:#f87171" colspan="2">${total.toFixed(6)} ${p.prod.unidad}</td>
            </tr>
          </tbody>
        </table>
      </div>`;

  } else if (m.key === 'newtdd') {
    const { coefs, pasos, total } = p.newtData;
    const n = p.xs.length;
    // Full DD triangle
    const headers = ['Nodo xᵢ', 'f[...] ord.0'];
    for (let j = 1; j < n; j++) headers.push(`Ord.${j} f[...]`);
    let ddRows = '';
    for (let i = 0; i < n; i++) {
      ddRows += '<tr>';
      ddRows += `<td class="hl">${p.xs[i].toFixed(2)}</td>`;
      for (let j = 0; j < n - i; j++) ddRows += `<td>${p.tablaDD[i][j].toFixed(5)}</td>`;
      for (let j = n-i; j < n; j++) ddRows += '<td class="c-muted">–</td>';
      ddRows += '</tr>';
    }
    return `
      <p class="form-label">Tabla Completa de Diferencias Divididas</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
        Los coeficientes del polinomio son: f[x₀], f[x₀,x₁], ..., f[x₀,...,xₙ] (primera fila diagonal)
      </p>
      <div class="table-wrap" style="margin-bottom:1.5rem">
        <table>
          <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${ddRows}</tbody>
        </table>
      </div>
      <p class="form-label">Evaluación en x* = ${p.xConsulta} (Método de Horner)</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
        P(x*) = coef[n-1] acumulado de derecha a izquierda: P = coef[i] + (x*-xᵢ)·P_ant
      </p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>k</th><th>Coeficiente c[k] = f[x₀,...,xₖ]</th><th>Factor (x*-xₖ)</th><th>Acumulador P</th><th>Operación</th></tr></thead>
          <tbody>
            ${pasos.map(p2 => `<tr>
              <td class="hl">${p2.k}</td>
              <td>${p2.coef.toFixed(6)}</td>
              <td>${p2.factor === '—' ? '—' : parseFloat(p2.factor).toFixed(4)}</td>
              <td style="color:#a78bfa">${p2.acum.toFixed(6)}</td>
              <td style="font-size:.75rem;color:var(--text-muted)">${p2.desc}</td>
            </tr>`).join('')}
            <tr style="background:rgba(167,139,250,.12);font-weight:700">
              <td colspan="3">P(${p.xConsulta}) =</td>
              <td style="color:#a78bfa">${total.toFixed(6)} ${p.prod.unidad}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>`;

  } else { // splines
    if (!p.splineRes || !p.coefsSpl) {
      return '<div class="alert warning"><span>No hay datos suficientes para Splines.</span></div>';
    }
    const M = p.splineRes.M;
    // Find the segment for xConsulta
    let segK = p.xs.length - 2;
    for (let i = 0; i < p.xs.length - 1; i++) {
      if (p.xConsulta <= p.xs[i+1]) { segK = i; break; }
    }
    segK = Math.max(0, Math.min(segK, p.xs.length - 2));
    const seg = p.coefsSpl[segK];
    const dx = p.xConsulta - seg.x0;
    return `
      <p class="form-label">Momentos Mᵢ — Sistema Tridiagonal (Algoritmo de Thomas)</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
        M₀ = Mₙ = 0 (condición natural). Los Mᵢ internos se obtienen resolviendo el sistema tridiagonal.
      </p>
      <div class="table-wrap" style="margin-bottom:1.5rem">
        <table>
          <thead><tr><th>Nodo i</th><th>xᵢ</th><th>yᵢ</th><th>Mᵢ (2ª derivada)</th><th>Rol</th></tr></thead>
          <tbody>
            ${M.map((mi,i) => `<tr>
              <td>${i}</td>
              <td class="hl">${p.xs[i].toFixed(2)}</td>
              <td>${p.ys[i].toFixed(4)}</td>
              <td class="${i===0||i===M.length-1?'c-muted':Math.abs(mi)>1?'err':'ok'}">${mi.toFixed(6)}</td>
              <td class="tnorm">${i===0?'Extremo izq. (M=0)':i===M.length-1?'Extremo der. (M=0)':Math.abs(mi)>1?'Cambio brusco':'Zona suave'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="form-label">Coeficientes por Segmento — Sᵢ(x) = aᵢ + bᵢΔx + cᵢΔx² + dᵢΔx³</p>
      <div class="table-wrap" style="margin-bottom:1.5rem">
        <table>
          <thead><tr><th>Seg.</th><th>Intervalo [xᵢ, xᵢ₊₁]</th><th>aᵢ</th><th>bᵢ</th><th>cᵢ</th><th>dᵢ</th></tr></thead>
          <tbody>
            ${p.coefsSpl.map((s,k) => `<tr ${k===segK?'style="background:rgba(52,211,153,.12)"':''}>
              <td>${k===segK?'<strong>'+k+'★</strong>':k}</td>
              <td>[${s.x0.toFixed(2)}, ${s.x1.toFixed(2)}]</td>
              <td>${s.a.toFixed(5)}</td>
              <td>${s.b.toFixed(5)}</td>
              <td>${s.c.toFixed(5)}</td>
              <td>${s.d.toFixed(5)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="form-label">Evaluación en x* = ${p.xConsulta} — Segmento ${segK}: [${seg.x0}, ${seg.x1}]</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Término</th><th>Valor</th><th>Cálculo</th></tr></thead>
          <tbody>
            <tr><td>Δx = x*−x${segK}</td><td class="hl">${dx.toFixed(5)}</td><td>${p.xConsulta} − ${seg.x0} = ${dx.toFixed(5)}</td></tr>
            <tr><td>a${segK}</td><td>${seg.a.toFixed(5)}</td><td>= y${segK}</td></tr>
            <tr><td>b${segK}·Δx</td><td>${(seg.b*dx).toFixed(5)}</td><td>${seg.b.toFixed(5)} × ${dx.toFixed(5)}</td></tr>
            <tr><td>c${segK}·Δx²</td><td>${(seg.c*dx*dx).toFixed(5)}</td><td>${seg.c.toFixed(5)} × ${(dx*dx).toFixed(5)}</td></tr>
            <tr><td>d${segK}·Δx³</td><td>${(seg.d*dx*dx*dx).toFixed(5)}</td><td>${seg.d.toFixed(5)} × ${(dx*dx*dx).toFixed(5)}</td></tr>
            <tr style="background:rgba(52,211,153,.12);font-weight:700">
              <td>S${segK}(${p.xConsulta})</td>
              <td style="color:#34d399">${(p.valSpl??0).toFixed(6)} ${p.prod.unidad}</td>
              <td>Suma de los 4 términos</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }
}

// ─── UTILIDADES ──────────────────────────────
function limpiarResultados() {
  document.getElementById('resultadosSection').classList.add('hidden');
  document.getElementById('alertInterp').innerHTML = '';
  if (chartPrecios) { chartPrecios.destroy(); chartPrecios = null; }
  const elDyn = document.getElementById('interpDinamica');
  if (elDyn) elDyn.innerHTML = '<p style="font-size:.875rem;color:var(--text-muted);text-align:center;padding:.8rem 0">▶ Selecciona un producto e ingresa un día de consulta para ver la interpretación con los valores reales.</p>';
}
