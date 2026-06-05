/* =============================================
   ESCENARIO A — Sistemas de Ecuaciones Lineales
   Ejecuta los 5 métodos simultáneamente con
   tabla de iteraciones completa para cada uno
   ============================================= */

let chartDistrib = null;
let chartConv    = null;

// ─── SUBÍNDICES UNICODE ───────────────────────
function sub(n) {
  return ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'][n] ?? n;
}

// ─── GENERAR INPUTS DE MATRIZ ─────────────────
function generarMatriz(n) {
  const divA = document.getElementById('matrizA');
  const divB = document.getElementById('vectorB');
  divA.style.gridTemplateColumns = `auto repeat(${n}, 76px)`;
  divA.innerHTML = '';

  // esquina
  divA.appendChild(Object.assign(document.createElement('div'), { className:'mlabel', textContent:'' }));
  for (let j = 0; j < n; j++) {
    divA.appendChild(Object.assign(document.createElement('div'), { className:'mlabel', textContent:`x${sub(j+1)}` }));
  }
  for (let i = 0; i < n; i++) {
    divA.appendChild(Object.assign(document.createElement('div'), { className:'mlabel', textContent:`F${i+1}` }));
    for (let j = 0; j < n; j++) {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.step = 'any'; inp.id = `a_${i}_${j}`;
      inp.value = i===j ? 1 : 0;
      divA.appendChild(inp);
    }
  }

  divB.style.gridTemplateColumns = 'auto 90px';
  divB.innerHTML = '';
  divB.appendChild(Object.assign(document.createElement('div'), { className:'mlabel', textContent:'' }));
  divB.appendChild(Object.assign(document.createElement('div'), { className:'mlabel', textContent:'bᵢ' }));
  for (let i = 0; i < n; i++) {
    divB.appendChild(Object.assign(document.createElement('div'), { className:'mlabel', textContent:`b${sub(i+1)}` }));
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = 'any'; inp.id = `b_${i}`; inp.value = 0;
    divB.appendChild(inp);
  }
}

function leerSistema() {
  const n = parseInt(document.getElementById('matSize').value);
  const A = [], b = [];
  for (let i = 0; i < n; i++) {
    A.push([]);
    for (let j = 0; j < n; j++) {
      const v = parseFloat(document.getElementById(`a_${i}_${j}`).value);
      if (isNaN(v)) throw new Error(`a[${i+1}][${j+1}] no es válido`);
      A[i].push(v);
    }
    const bv = parseFloat(document.getElementById(`b_${i}`).value);
    if (isNaN(bv)) throw new Error(`b[${i+1}] no es válido`);
    b.push(bv);
  }
  return { A, b, n };
}

// ─── CARGAR EJEMPLOS ─────────────────────────
function cargarEjemploBolivia() {
  const n = parseInt(document.getElementById('matSize').value);
  if (n === 3) cargarValores([[10,2,1],[3,9,2],[1,2,8]], [5000,4200,3600], 3);
  else if (n === 2) cargarValores([[5,1],[1,4]], [2500,2000], 2);
  else cargarValores([[10,2,1,0],[2,9,1,1],[1,1,8,2],[0,1,2,7]], [5000,4200,3600,2800], 4);
}

function cargarEjemploBloqueo() {
  const n = parseInt(document.getElementById('matSize').value);
  if (n === 3) {
    cargarValores([[10,2,0],[3,9,2],[0,2,8]], [5000,4200,3600], 3);
    mostrarAlertaGlobal('warning','⚠','Bloqueo simulado: ruta directa Planta→Zona Sur cortada (a₁₃ = 0).');
  }
}

function cargarValores(A, b, n) {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) { const el=document.getElementById(`a_${i}_${j}`); if(el) el.value=A[i][j]; }
    const el = document.getElementById(`b_${i}`); if(el) el.value=b[i];
  }
}
function limpiarMatriz() {
  const n = parseInt(document.getElementById('matSize').value);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) { const el=document.getElementById(`a_${i}_${j}`); if(el) el.value=i===j?1:0; }
    const el=document.getElementById(`b_${i}`); if(el) el.value=0;
  }
  limpiarResultados();
}

// ─── ALGORITMOS ──────────────────────────────

function jacobi(A, b, tol, maxIter) {
  const n = A.length;
  let x = new Array(n).fill(0);
  const iters = [];
  for (let k = 0; k < maxIter; k++) {
    const xN = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let j = 0; j < n; j++) if (j!==i) s -= A[i][j]*x[j];
      xN[i] = s / A[i][i];
    }
    const err = Math.max(...xN.map((v,i) => Math.abs(v-x[i])));
    iters.push({ k:k+1, x:[...xN], error:err, converge: err<tol });
    x = xN;
    if (err < tol) break;
  }
  return { x, iters, tipo:'iterativo' };
}

function gaussSeidel(A, b, tol, maxIter) {
  const n = A.length;
  let x = new Array(n).fill(0);
  const iters = [];
  for (let k = 0; k < maxIter; k++) {
    const xV = [...x];
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let j = 0; j < n; j++) if (j!==i) s -= A[i][j]*x[j];
      x[i] = s / A[i][i];
    }
    const err = Math.max(...x.map((v,i) => Math.abs(v-xV[i])));
    iters.push({ k:k+1, x:[...x], error:err, converge: err<tol });
    if (err < tol) break;
  }
  return { x, iters, tipo:'iterativo' };
}

function sor(A, b, omega, tol, maxIter) {
  const n = A.length;
  let x = new Array(n).fill(0);
  const iters = [];
  for (let k = 0; k < maxIter; k++) {
    const xV = [...x];
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let j = 0; j < n; j++) if (j!==i) s -= A[i][j]*x[j];
      const gs = s / A[i][i];
      x[i] = (1-omega)*x[i] + omega*gs;
    }
    const err = Math.max(...x.map((v,i) => Math.abs(v-xV[i])));
    iters.push({ k:k+1, x:[...x], error:err, converge: err<tol });
    if (err < tol) break;
  }
  return { x, iters, tipo:'iterativo' };
}

function descomposicionLU(A, b) {
  const n = A.length;
  const L = Array.from({length:n}, (_,i) => {
    const row = new Array(n).fill(0); row[i]=1; return row;
  });
  const U = A.map(row => [...row]);
  const perm = Array.from({length:n}, (_,i) => i);

  for (let k = 0; k < n; k++) {
    let maxV = Math.abs(U[k][k]), maxR = k;
    for (let i = k+1; i < n; i++) if (Math.abs(U[i][k]) > maxV) { maxV=Math.abs(U[i][k]); maxR=i; }
    if (maxR !== k) {
      [U[k], U[maxR]] = [U[maxR], U[k]];
      [perm[k], perm[maxR]] = [perm[maxR], perm[k]];
      for (let j = 0; j < k; j++) [L[k][j], L[maxR][j]] = [L[maxR][j], L[k][j]];
    }
    for (let i = k+1; i < n; i++) {
      if (Math.abs(U[k][k]) < 1e-14) throw new Error('Matriz singular o casi singular');
      L[i][k] = U[i][k] / U[k][k];
      for (let j = k; j < n; j++) U[i][j] -= L[i][k] * U[k][j];
    }
  }
  const bp = perm.map(i => b[i]);
  // Ly = b
  const y = new Array(n).fill(0);
  const sustFwd = [];
  for (let i = 0; i < n; i++) {
    let s = bp[i];
    let op = `b${sub(i+1)}` + (i>0 ? ' - (' + Array.from({length:i},(_,j)=>`L${sub(i+1)}${sub(j+1)}·y${sub(j+1)}`).join(' + ') + ')' : '');
    for (let j = 0; j < i; j++) s -= L[i][j]*y[j];
    y[i] = s / L[i][i];
    sustFwd.push({ i:i+1, op, y:y[i] });
  }
  // Ux = y
  const x = new Array(n).fill(0);
  const sustBwd = [];
  for (let i = n-1; i >= 0; i--) {
    let s = y[i];
    let op = `y${sub(i+1)}` + (i<n-1 ? ' - (' + Array.from({length:n-1-i},(_,k)=>`U${sub(i+1)}${sub(i+2+k)}·x${sub(i+2+k)}`).join(' + ') + ')' : '');
    for (let j = i+1; j < n; j++) s -= U[i][j]*x[j];
    x[i] = s / U[i][i];
    sustBwd.unshift({ i:i+1, op, x:x[i] });
  }
  const residuo = calcResiduo(A, x, b);
  return { x, L, U, perm, y, sustFwd, sustBwd, iters:[{k:1, x:[...x], error:residuo, converge:true}], tipo:'directo' };
}

function gradienteConjugado(A, b, tol, maxIter) {
  const n = A.length;
  const matVec = (M,v) => M.map(row => row.reduce((s,a,j) => s+a*v[j], 0));
  const dot = (u,v) => u.reduce((s,ui,i) => s+ui*v[i], 0);
  let x = new Array(n).fill(0);
  let r = b.map((bi,i) => bi - matVec(A,x)[i]);
  let p = [...r];
  const iters = [];
  for (let k = 0; k < maxIter; k++) {
    const Ap = matVec(A, p);
    const rr = dot(r,r);
    const pAp = dot(p,Ap);
    if (Math.abs(pAp) < 1e-14) break;
    const alpha = rr/pAp;
    x = x.map((xi,i) => xi + alpha*p[i]);
    const rN = r.map((ri,i) => ri - alpha*Ap[i]);
    const normR = Math.sqrt(dot(rN,rN));
    const beta = dot(rN,rN)/rr;
    iters.push({ k:k+1, x:[...x], error:normR, alpha, beta, converge: normR<tol });
    if (normR < tol) break;
    p = rN.map((ri,i) => ri + beta*p[i]);
    r = rN;
  }
  return { x, iters, tipo:'iterativo' };
}

function calcResiduo(A, x, b) {
  return Math.sqrt(A.reduce((s,row,i) => {
    const Ax = row.reduce((t,a,j) => t+a*x[j], 0);
    return s+(b[i]-Ax)**2;
  }, 0));
}
function esDiagDominante(A) {
  return A.every((row,i) => {
    const s = row.reduce((t,a,j) => j===i?t:t+Math.abs(a), 0);
    return Math.abs(row[i]) > s;
  });
}

// ─── EJECUCIÓN PRINCIPAL ─────────────────────
function ejecutarCalculo() {
  limpiarResultados();
  try {
    const { A, b, n } = leerSistema();
    const tol     = parseFloat(document.getElementById('tol').value)     || 1e-4;
    const maxIter = parseInt(document.getElementById('maxIter').value)   || 100;
    const omega   = parseFloat(document.getElementById('omega').value)   || 1.25;

    if (omega<=0||omega>=2) throw new Error('ω debe estar en (0, 2)');

    document.getElementById('resultadosSection').classList.remove('hidden');

    if (!esDiagDominante(A))
      mostrarAlertaGlobal('warning','⚠',
        'La matriz NO es diagonalmente dominante. Los métodos iterativos pueden no converger. Revisa la configuración.');

    // ── Ejecutar los 5 métodos ──
    const res = {
      jacobi:   jacobi(A, b, tol, maxIter),
      gs:       gaussSeidel(A, b, tol, maxIter),
      sor:      sor(A, b, omega, tol, maxIter),
      lu:       descomposicionLU(A, b),
      gc:       gradienteConjugado(A, b, tol, maxIter)
    };

    mostrarTodosResultados(res, A, b, n, tol, omega);

  } catch(e) {
    mostrarAlertaGlobal('danger','❌', e.message);
    document.getElementById('resultadosSection').classList.remove('hidden');
  }
}

// ─── MOSTRAR TODOS LOS RESULTADOS ─────────────
function mostrarTodosResultados(res, A, b, n, tol, omega) {
  const zonas = ['Zona Norte','Zona Centro','Zona Sur','Zona Este'].slice(0,n);
  const metodos = [
    { key:'jacobi', nombre:'Jacobi',             color:'#60a5fa' },
    { key:'gs',     nombre:'Gauss-Seidel',        color:'#34d399' },
    { key:'sor',    nombre:`SOR (ω=${omega})`,    color:'#fbbf24' },
    { key:'lu',     nombre:'Descomposición LU',   color:'#f87171' },
    { key:'gc',     nombre:'Grad. Conjugado',     color:'#a78bfa' }
  ];

  // ── Tabla resumen comparativa ──
  const tblResumen = document.getElementById('tablaResumen');
  const convInfo = m => res[m.key].tipo==='directo' ? 'Directo' :
    (res[m.key].iters.slice(-1)[0]?.converge ? `${res[m.key].iters.length} iter.` : `${res[m.key].iters.length} iter. (no conv.)`);
  const errInfo = m => calcResiduo(A, res[m.key].x, b);

  tblResumen.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Método</th>
          ${Array.from({length:n},(_,i)=>`<th>x${sub(i+1)} (${zonas[i]})</th>`).join('')}
          <th>Iteraciones</th>
          <th>‖Ax−b‖</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${metodos.map(m => {
          const x = res[m.key].x;
          const conv = res[m.key].tipo==='directo' || (res[m.key].iters.slice(-1)[0]?.converge ?? false);
          return `<tr>
            <td class="tnorm fw-bold" style="color:${m.color}">${m.nombre}</td>
            ${x.map(v=>`<td class="hl">${v.toFixed(4)}</td>`).join('')}
            <td>${convInfo(m)}</td>
            <td class="${errInfo(m)<0.01?'ok':'err'}">${errInfo(m).toExponential(3)}</td>
            <td>${conv ? '<span class="ok">✔ OK</span>' : '<span class="err">✘ No conv.</span>'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  // ── Gráfico distribución (usa LU como referencia exacta) ──
  if (chartDistrib) chartDistrib.destroy();
  const ctxD = document.getElementById('chartDistrib').getContext('2d');
  const colors = metodos.map(m=>m.color);
  const bestX  = res.lu.x;
  chartDistrib = new Chart(ctxD, {
    type:'bar',
    data:{
      labels: zonas,
      datasets: metodos.map(m => ({
        label: m.nombre,
        data: res[m.key].x.map(v => Math.max(0, parseFloat(v.toFixed(3)))),
        backgroundColor: m.color+'55',
        borderColor: m.color,
        borderWidth:2, borderRadius:4
      }))
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#94a3b8', boxWidth:12 } } },
      scales:{
        x:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'} },
        y:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true,text:'Miles de litros',color:'#94a3b8'} }
      }
    }
  });

  // ── Gráfico convergencia ──
  if (chartConv) chartConv.destroy();
  const ctxC = document.getElementById('chartConv').getContext('2d');
  const iterMetodos = metodos.filter(m => res[m.key].tipo==='iterativo' && res[m.key].iters.length>1);
  chartConv = new Chart(ctxC, {
    type:'line',
    data:{
      datasets: iterMetodos.map(m => ({
        label: m.nombre,
        data: res[m.key].iters.map(it => ({x:it.k, y:it.error})),
        borderColor: m.color,
        backgroundColor: m.color+'22',
        borderWidth:2, pointRadius:0, fill:false, tension:.3
      }))
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#94a3b8', boxWidth:12 } } },
      scales:{
        x:{ type:'linear', ticks:{color:'#94a3b8',maxTicksLimit:10}, grid:{color:'#2d4060'},
            title:{display:true,text:'Iteración',color:'#94a3b8'} },
        y:{ type:'logarithmic', ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true,text:'Error máx. (log)',color:'#94a3b8'} }
      }
    }
  });

  // ── Tabs por método ──
  const tabNav     = document.getElementById('methodTabsNav');
  const tabContent = document.getElementById('methodTabsContent');
  tabNav.innerHTML = '';
  tabContent.innerHTML = '';

  metodos.forEach((m, idx) => {
    // Botón tab
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (idx===0?' active':'');
    btn.style.borderBottomColor = idx===0 ? m.color : 'transparent';
    btn.style.color = idx===0 ? m.color : '';
    btn.textContent = m.nombre;
    btn.onclick = () => {
      tabNav.querySelectorAll('.tab-btn').forEach((b,bi) => {
        b.classList.remove('active');
        b.style.borderBottomColor = 'transparent';
        b.style.color = '';
      });
      tabContent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.style.borderBottomColor = m.color;
      btn.style.color = m.color;
      document.getElementById(`tab_${m.key}`).classList.add('active');
    };
    tabNav.appendChild(btn);

    // Contenido tab
    const pane = document.createElement('div');
    pane.className = 'tab-pane' + (idx===0?' active':'');
    pane.id = `tab_${m.key}`;
    pane.innerHTML = buildTabContent(m, res[m.key], A, b, n, zonas, tol);
    tabContent.appendChild(pane);
  });

  // ── Interpretación ──
  const luX    = res.lu.x;
  const maxZ   = luX.indexOf(Math.max(...luX));
  const minZ   = luX.indexOf(Math.min(...luX));
  const itersJ = res.jacobi.iters.length;
  const itersG = res.gs.iters.length;
  document.getElementById('interpretacion').innerHTML = `
    <h4>📝 Interpretación General</h4>
    <ul>
      <li>La solución exacta (LU) indica: la zona que recibe más es <strong>${zonas[maxZ]}</strong>
          (${luX[maxZ].toFixed(2)} miles lts), y la de menor asignación es <strong>${zonas[minZ]}</strong>
          (${luX[minZ].toFixed(2)} miles lts).</li>
      <li>Jacobi convergió en <strong>${itersJ}</strong> iteraciones vs.
          Gauss-Seidel en <strong>${itersG}</strong>.
          GS típicamente converge el doble de rápido.</li>
      <li>SOR con ω=${omega} ${res.sor.iters.length <= res.gs.iters.length ? 'aceleró' : 'no aceleró en este caso'} la convergencia respecto a GS.</li>
      <li>Todos los métodos producen la misma solución: el residuo máximo es
          ${Math.max(...Object.values(res).map(r => calcResiduo(A,r.x,b))).toExponential(3)}.</li>
    </ul>`;

  // ── Interpretación dinámica en sección conclusiones ──
  const elInterp = document.getElementById('interpDinamica');
  if (elInterp) {
    const iterativos = metodos.filter(m => res[m.key].tipo === 'iterativo');
    const mejorIter = iterativos.reduce((a,b) => res[a.key].iters.length <= res[b.key].iters.length ? a : b, iterativos[0]);
    const peorIter  = iterativos.reduce((a,b) => res[a.key].iters.length >= res[b.key].iters.length ? a : b, iterativos[0]);
    const maxResiduo = Math.max(...Object.values(res).map(r => calcResiduo(A,r.x,b)));
    elInterp.innerHTML = `
      <p style='font-weight:700;color:var(--accent);font-size:.95rem;margin-bottom:.8rem'>📊 Interpretación de los Resultados</p>
      <p style='font-size:.875rem;color:var(--text-secondary);margin-bottom:.8rem'>
        Sistema ${n}×${n} con b = [${b.map(v=>v.toFixed(0)).join(', ')}] — resultados calculados en tiempo real:
      </p>
      <div class='grid g-2' style='margin-bottom:.8rem'>
        <div>
          <p style='font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:.4rem'>Solución exacta (LU con pivoteo):</p>
          <div class='table-wrap'><table>
            <thead><tr><th>Variable</th><th>Valor</th><th>Zona</th></tr></thead>
            <tbody>
              ${luX.map((v,i) => `<tr>
                <td class='var-name'>x${sub(i+1)}</td>
                <td class='${i===maxZ?'ok':'hl'}'>${v.toFixed(3)} mlt/día</td>
                <td>${zonas[i]}${i===maxZ?' ← máx. demanda':i===minZ?' ← mín. demanda':''}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>
        <div>
          <p style='font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:.4rem'>Convergencia real de cada método:</p>
          <div class='table-wrap'><table>
            <thead><tr><th>Método</th><th>Iteraciones</th><th>‖Ax−b‖</th></tr></thead>
            <tbody>
              ${metodos.map(m => `<tr>
                <td style='color:${m.color}'>${m.nombre}</td>
                <td>${convInfo(m)}</td>
                <td class='${errInfo(m)<0.01?'ok':'err'}'>${errInfo(m).toExponential(3)}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>
      </div>
      <p style='font-size:.875rem;color:var(--text-secondary)'>
        <strong style='color:#fff'>Con los datos ingresados:</strong>
        Mayor demanda → <strong style='color:var(--success)'>${zonas[maxZ]}</strong> (${luX[maxZ].toFixed(2)} mlt/día).
        Menor demanda → <strong>${zonas[minZ]}</strong> (${luX[minZ].toFixed(2)} mlt/día).
        Diferencia entre zonas: <strong>${(luX[maxZ]-luX[minZ]).toFixed(2)} mlt/día</strong>.
        Método iterativo más rápido: <strong style='color:${mejorIter.color}'>${mejorIter.nombre}</strong>
        con <strong>${res[mejorIter.key].iters.length}</strong> iteraciones
        (más lento: ${peorIter.nombre} con ${res[peorIter.key].iters.length} iter.).
        Residuo máximo entre los 5 métodos: ${maxResiduo.toExponential(3)}.
        ${esDiagDominante(A)
          ? '<span style=\'color:var(--success)\'>✔ Matriz diagonalmente dominante: convergencia garantizada.</span>'
          : '<span style=\'color:var(--danger)\'>⚠ Matriz NO diagonalmente dominante: convergencia de métodos iterativos no garantizada.</span>'}
      </p>`;
  }
}

// ─── CONTENIDO DE CADA TAB ────────────────────
function buildTabContent(m, result, A, b, n, zonas, tol) {
  const { x, iters, tipo } = result;
  const residuo = calcResiduo(A, x, b);
  const convergido = tipo==='directo' || (iters.slice(-1)[0]?.converge ?? false);

  // Encabezado del método
  let html = `
    <div class="stats-grid" style="margin-bottom:1rem">
      ${x.map((v,i) => `
        <div class="stat-box">
          <span class="stat-val" style="color:${m.color}">${v.toFixed(4)}</span>
          <span class="stat-lbl">x${sub(i+1)} · ${zonas[i]}</span>
        </div>`).join('')}
      <div class="stat-box">
        <span class="stat-val ${residuo<0.01?'ok':'err'}">${residuo.toExponential(3)}</span>
        <span class="stat-lbl">Residuo ‖Ax−b‖</span>
      </div>
      <div class="stat-box">
        <span class="stat-val ${convergido?'ok':'err'}">${tipo==='directo'?'Exacto':iters.length+' iter.'}</span>
        <span class="stat-lbl">${convergido?'Convergió ✔':'No convergió ✘'}</span>
      </div>
    </div>
    <div class="${convergido?'alert success':'alert warning'}" style="margin-bottom:1rem">
      <span class="aicon">${convergido?'✅':'⚠'}</span>
      <span>${tipo==='directo'
        ? `Método directo: solución exacta obtenida sin iteraciones. Residuo = ${residuo.toExponential(4)}.`
        : (convergido
          ? `Convergió en <strong>${iters.length} iteraciones</strong>. Error final = ${iters.slice(-1)[0].error.toExponential(4)}.`
          : `No convergió en ${iters.length} iteraciones. Error final = ${iters.slice(-1)[0]?.error.toExponential(4)}.`)
      }</span>
    </div>`;

  // ── LU: mostrar L, U, sustituciones ──
  if (m.key === 'lu') {
    const { L, U, perm, sustFwd, sustBwd } = result;
    html += `
      <p class="form-label">Permutación de filas (pivoteo parcial)</p>
      <div class="rpanel info" style="margin-bottom:1rem">
        Orden de filas usado: ${perm.map(i=>`F${i+1}`).join(' → ')}
      </div>

      <div class="grid g-2">
        <div>
          <p class="form-label">Matriz L (triangular inferior)</p>
          ${matrizHTML(L, n, '#60a5fa')}
        </div>
        <div>
          <p class="form-label">Matriz U (triangular superior)</p>
          ${matrizHTML(U, n, '#fbbf24')}
        </div>
      </div>

      <p class="form-label mt-2">Sustitución hacia adelante — L·y = b</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
        Se resuelve para el vector auxiliar y = [${result.y.map(v=>v.toFixed(4)).join(', ')}]
      </p>
      <div class="table-wrap" style="margin-bottom:1rem">
        <table>
          <thead><tr><th>i</th><th>Operación y[i] =</th><th>Resultado y[i]</th></tr></thead>
          <tbody>
            ${sustFwd.map(r=>`<tr>
              <td>${r.i}</td>
              <td style="font-family:var(--mono);font-size:.75rem">${r.op}</td>
              <td class="hl">${r.y.toFixed(6)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <p class="form-label">Sustitución hacia atrás — U·x = y</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>i</th><th>Operación x[i] =</th><th>Resultado x[i]</th></tr></thead>
          <tbody>
            ${sustBwd.map(r=>`<tr>
              <td>${r.i}</td>
              <td style="font-family:var(--mono);font-size:.75rem">${r.op}</td>
              <td class="hl">${r.x.toFixed(6)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    return html;
  }

  // ── Gradiente Conjugado: tabla extendida ──
  if (m.key === 'gc') {
    html += `
      <p class="form-label">Tabla de Iteraciones — Gradiente Conjugado</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
        α = tamaño de paso · β = coeficiente de dirección conjugada · ‖r‖ = norma del residuo
      </p>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>k</th>
            ${x.map((_,i)=>`<th>x${sub(i+1)}</th>`).join('')}
            <th>‖rₖ‖</th>
            <th>αₖ</th>
            <th>βₖ</th>
            <th>Estado</th>
          </tr></thead>
          <tbody>
            ${iters.map(it=>`<tr>
              <td class="hl">${it.k}</td>
              ${it.x.map(v=>`<td>${v.toFixed(5)}</td>`).join('')}
              <td class="${it.converge?'ok':''}">${it.error.toExponential(4)}</td>
              <td>${(it.alpha??0).toExponential(4)}</td>
              <td>${(it.beta??0).toExponential(4)}</td>
              <td class="${it.converge?'ok':'c-muted'}">${it.converge?'✓ Conv.':'...'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    return html;
  }

  // ── Jacobi / Gauss-Seidel / SOR: tabla de iteraciones ──
  html += `
    <p class="form-label">Tabla de Iteraciones — ${m.nombre}</p>
    <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.5rem">
      Total: ${iters.length} iteraciones${iters.length>100?' (mostrando todas)':''}.
      Criterio de parada: error máx. &lt; ${tol}.
    </p>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>k</th>
          ${x.map((_,i)=>`<th>x${sub(i+1)} (${zonas[i]})</th>`).join('')}
          <th>Error máx.</th>
          <th>Estado</th>
        </tr></thead>
        <tbody>
          ${iters.map(it=>`<tr>
            <td class="hl">${it.k}</td>
            ${it.x.map(v=>`<td>${v.toFixed(5)}</td>`).join('')}
            <td class="${it.converge?'ok':''}">${it.error.toExponential(4)}</td>
            <td class="${it.converge?'ok':'c-muted'}">${it.converge?'✓ Convergió':'...'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  return html;
}

// ─── RENDERIZAR MATRIZ EN HTML ────────────────
function matrizHTML(M, n, color) {
  return `<div style="overflow-x:auto"><table style="font-family:var(--mono);font-size:.78rem;border-collapse:collapse">
    <tbody>
      ${M.map((row,i) => `<tr>${row.map((v,j) => `
        <td style="padding:.3rem .6rem;border:1px solid var(--border);
          background:${i===j?color+'22':'var(--bg-input)'};
          color:${Math.abs(v)>1e-10?'var(--text-primary)':'var(--text-muted)'}">${v.toFixed(4)}</td>
      `).join('')}</tr>`).join('')}
    </tbody>
  </table></div>`;
}

// ─── UTILIDADES ──────────────────────────────
function limpiarResultados() {
  document.getElementById('resultadosSection').classList.add('hidden');
  document.getElementById('alertGlobal').innerHTML = '';
  if (chartDistrib) { chartDistrib.destroy(); chartDistrib = null; }
  if (chartConv)    { chartConv.destroy();    chartConv    = null; }
  const elDyn = document.getElementById('interpDinamica');
  if (elDyn) elDyn.innerHTML = '<p style="font-size:.875rem;color:var(--text-muted);text-align:center;padding:.8rem 0">▶ Ingresa la matriz y ejecuta el cálculo para ver la interpretación con los valores reales.</p>';
}

function mostrarAlertaGlobal(tipo, icon, msg) {
  document.getElementById('alertGlobal').innerHTML +=
    `<div class="alert ${tipo}"><span class="aicon">${icon}</span><span>${msg}</span></div>`;
}
