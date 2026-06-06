document.getElementById('hamBtn').addEventListener('click', () =>
  document.getElementById('navMenu').classList.toggle('open'));
function mostrarTab(btn, id) {
  btn.closest('.card').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.closest('.card').querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active'); document.getElementById(id).classList.add('active');
}

let chartPert = null;

const ESCENARIOS_F = {
  bien: {
    nombre:'Red bien condicionada',
    A:[[10,1,0],[1,8,1],[0,1,6]],
    b:[100,80,60]
  },
  medio: {
    nombre:'Crisis leve (asimétrica)',
    A:[[5,3,1],[2,7,4],[1,3,9]],
    b:[90,70,50]
  },
  mal: {
    nombre:'Bloqueo parcial',
    A:[[10,9,8],[9,8,7],[8,7,6.01]],
    b:[100,90,80]
  }
};

// ─── GENERACIÓN DE ENTRADAS ────────────────────
function generarMatrizF() {
  const n = parseInt(document.getElementById('dimN').value);
  document.getElementById('escenarioF').value = '';
  let html = `<p class="form-label" style="margin-bottom:.3rem">Matriz A (${n}×${n}) — coeficientes de flujo</p>
    <div class="table-wrap"><table><tbody>`;
  for (let i = 0; i < n; i++) {
    html += '<tr>';
    for (let j = 0; j < n; j++) {
      const def = i===j ? 5+Math.floor(Math.random()*5) : Math.floor(Math.random()*3);
      html += `<td><input id="a${i}${j}" type="number" class="form-control" value="${def}" style="width:70px;padding:.3rem .4rem;text-align:center"></td>`;
    }
    html += '</tr>';
  }
  html += `</tbody></table></div>`;
  document.getElementById('matrizInputs').innerHTML = html;

  let bHtml = `<p class="form-label" style="margin-bottom:.3rem">Vector b (demanda de cada zona)</p>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">`;
  for (let i = 0; i < n; i++) {
    const def = 50 + Math.floor(Math.random()*60);
    bHtml += `<div class="form-group" style="flex:1;min-width:70px">
      <label class="form-label">b[${i+1}]</label>
      <input id="b${i}" type="number" class="form-control" value="${def}" style="text-align:center">
    </div>`;
  }
  bHtml += '</div>';
  document.getElementById('vectorBInputs').innerHTML = bHtml;
}

function cargarEscenarioF() {
  const key = document.getElementById('escenarioF').value;
  if (!key) return;
  const esc = ESCENARIOS_F[key];
  const n = esc.A.length;
  document.getElementById('dimN').value = n;
  generarMatrizF();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    document.getElementById(`a${i}${j}`).value = esc.A[i][j];
  for (let i = 0; i < n; i++)
    document.getElementById(`b${i}`).value = esc.b[i];
}

// ─── ÁLGEBRA LINEAL ───────────────────────────
function normaInf(M) {
  return Math.max(...M.map(row => row.reduce((s,v)=>s+Math.abs(v),0)));
}

function normaVecInf(v) {
  return Math.max(...v.map(Math.abs));
}

function normaVec1(v) {
  return v.reduce((s,x)=>s+Math.abs(x),0);
}

function inversaGJ(A) {
  const n = A.length;
  const M = A.map(row=>[...row]);
  const I = Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0));
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col+1; row < n; row++) if (Math.abs(M[row][col])>Math.abs(M[maxRow][col])) maxRow=row;
    [M[col],M[maxRow]] = [M[maxRow],M[col]]; [I[col],I[maxRow]]=[I[maxRow],I[col]];
    const piv = M[col][col];
    if (Math.abs(piv)<1e-14) throw new Error('La matriz es singular (no tiene inversa). El sistema no tiene solución única.');
    for (let j=0;j<n;j++){M[col][j]/=piv;I[col][j]/=piv;}
    for (let row=0;row<n;row++){
      if (row===col) continue;
      const f=M[row][col];
      for (let j=0;j<n;j++){M[row][j]-=f*M[col][j];I[row][j]-=f*I[col][j];}
    }
  }
  return I;
}

function resolverSistema(A, b) {
  const n = A.length;
  const M = A.map(row=>[...row]);
  const bp = [...b];
  for (let col=0;col<n;col++) {
    let maxRow=col;
    for (let row=col+1;row<n;row++) if (Math.abs(M[row][col])>Math.abs(M[maxRow][col])) maxRow=row;
    [M[col],M[maxRow]]=[M[maxRow],M[col]]; [bp[col],bp[maxRow]]=[bp[maxRow],bp[col]];
    if (Math.abs(M[col][col])<1e-14) throw new Error('Sistema singular');
    for (let row=col+1;row<n;row++){
      const f=M[row][col]/M[col][col];
      for (let j=col;j<n;j++) M[row][j]-=f*M[col][j];
      bp[row]-=f*bp[col];
    }
  }
  const x = new Array(n).fill(0);
  for (let i=n-1;i>=0;i--){
    x[i]=bp[i];
    for (let j=i+1;j<n;j++) x[i]-=M[i][j]*x[j];
    x[i]/=M[i][i];
  }
  return x;
}

function multiplyMV(A, v) { return A.map(row=>row.reduce((s,aij,j)=>s+aij*v[j],0)); }

// ─── LEER ENTRADAS ────────────────────────────
function leerMatriz() {
  const n = parseInt(document.getElementById('dimN').value);
  return Array.from({length:n}, (_,i)=>Array.from({length:n},(_,j)=>parseFloat(document.getElementById(`a${i}${j}`).value)));
}

function leerVector() {
  const n = parseInt(document.getElementById('dimN').value);
  return Array.from({length:n}, (_,i)=>parseFloat(document.getElementById(`b${i}`).value));
}

// ─── EJECUCIÓN PRINCIPAL ──────────────────────
function calcularCondicion() {
  limpiarResultadosF();
  try {
    const A     = leerMatriz();
    const b     = leerVector();
    const delta = parseFloat(document.getElementById('delta').value);
    const n     = A.length;

    if (A.some(row=>row.some(isNaN)) || b.some(isNaN) || isNaN(delta) || delta<=0)
      throw new Error('Datos inválidos. Verifica que todos los campos tengan valores numéricos.');

    const Ainv  = inversaGJ(A);
    const nA    = normaInf(A);
    const nAinv = normaInf(Ainv);
    const kappa = nA * nAinv;

    const x     = resolverSistema(A, b);
    const normX = normaVecInf(x);
    const normB = normaVecInf(b);

    const deltaPct = delta / 100;
    const db  = b.map((bi,i) => bi * deltaPct * (i%2===0?1:-1));
    const bPert = b.map((bi,i) => bi + db[i]);
    const xPert = resolverSistema(A, bPert);
    const dx    = x.map((xi,i) => xPert[i]-xi);

    const normDB  = normaVecInf(db);
    const normDX  = normaVecInf(dx);
    const errRelB = normDB / normB;
    const errRelX = normX > 1e-14 ? normDX / normX : 0;
    const cotaTeo = kappa * errRelB;

    const Ax     = multiplyMV(A, x);
    const resid  = Ax.map((v,i)=>Math.abs(v-b[i]));

    document.getElementById('resultadosSection').classList.remove('hidden');
    mostrarResultadosF({ A, Ainv, b, x, xPert, dx, db, bPert, n, nA, nAinv, kappa, normX, normB,
                         normDB, normDX, errRelB, errRelX, cotaTeo, resid, delta, deltaPct });
  } catch(e) {
    document.getElementById('alertGlobal').innerHTML =
      `<div class="alert danger"><span class="aicon">❌</span><span>${e.message}</span></div>`;
    document.getElementById('resultadosSection').classList.remove('hidden');
  }
}

function fmtF(v, d=4) { return typeof v==='number'&&isFinite(v) ? v.toFixed(d) : '—'; }

function mostrarResultadosF({ A, Ainv, b, x, xPert, dx, db, bPert, n, nA, nAinv, kappa, normX, normB,
                               normDB, normDX, errRelB, errRelX, cotaTeo, resid, delta, deltaPct }) {
  const kondClass = kappa<30?'ok':kappa<500?'warn':'err';
  const errClass  = errRelX<0.01?'ok':errRelX<0.1?'warn':'err';

  document.getElementById('kpis').innerHTML = `
    <div class="stat-box">
      <span class="stat-val ${kondClass}">${kappa.toFixed(2)}</span>
      <span class="stat-lbl">κ(A) = ‖A‖∞·‖A⁻¹‖∞</span>
    </div>
    <div class="stat-box">
      <span class="stat-val">${nA.toFixed(4)}</span>
      <span class="stat-lbl">‖A‖∞ (norma inf. de A)</span>
    </div>
    <div class="stat-box">
      <span class="stat-val">${nAinv.toFixed(4)}</span>
      <span class="stat-lbl">‖A⁻¹‖∞</span>
    </div>
    <div class="stat-box">
      <span class="stat-val warn">${(cotaTeo*100).toFixed(2)}%</span>
      <span class="stat-lbl">Cota teórica error en x (δb=${delta}%)</span>
    </div>
    <div class="stat-box">
      <span class="stat-val ${errClass}">${(errRelX*100).toFixed(4)}%</span>
      <span class="stat-lbl">Error real ‖δx‖/‖x‖ · δb=${delta}%</span>
    </div>
    <div class="stat-box">
      <span class="stat-val ${kappa<cotaTeo/errRelX*0.1?'ok':'warn'}">${errRelX>0?(cotaTeo/errRelX).toFixed(1):'∞'}×</span>
      <span class="stat-lbl">Factor cota/error real</span>
    </div>`;

  const tabNav = document.getElementById('detalleTabs');
  const tabCnt = document.getElementById('detalleContent');
  tabNav.innerHTML = ''; tabCnt.innerHTML = '';

  const seccionesF = [
    { id:'fSol', titulo:'Solución' },
    { id:'fInv', titulo:'A⁻¹ (Gauss-Jordan)' },
    { id:'fPert', titulo:'Perturbación' }
  ];

  seccionesF.forEach(({id,titulo},idx)=>{
    const btn = document.createElement('button');
    btn.className = 'tab-btn'+(idx===0?' active':'');
    btn.textContent = titulo;
    btn.onclick = ()=>{
      tabNav.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      tabCnt.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(id).classList.add('active');
    };
    tabNav.appendChild(btn);
    const pane = document.createElement('div');
    pane.className = 'tab-pane'+(idx===0?' active':'');
    pane.id = id;
    tabCnt.appendChild(pane);
  });

  document.getElementById('fSol').innerHTML = `
    <p class="form-label" style="margin-bottom:.5rem">Sistema Ax = b — Solución sin perturbación</p>
    <div class="grid g-2">
      <div>
        <div class="table-wrap"><table>
          <caption>Matriz A</caption>
          <tbody>${A.map((row,i)=>`<tr>${row.map(v=>`<td>${fmtF(v,3)}</td>`).join('')}<td style="color:#94a3b8">→ b[${i}]=${fmtF(b[i],2)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      <div>
        <div class="table-wrap"><table>
          <caption>Solución x = A⁻¹b</caption>
          <thead><tr><th>Zona i</th><th>xᵢ (flujo)</th><th>‖Ax−b‖ᵢ (residuo)</th></tr></thead>
          <tbody>${x.map((xi,i)=>`<tr>
            <td>Zona ${i+1}</td>
            <td class="hl">${fmtF(xi,6)}</td>
            <td class="${resid[i]<1e-8?'ok':'warn'}">${resid[i].toExponential(3)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <div class="alert info" style="margin-top:.5rem">
          <span class="aicon">📐</span>
          <span>‖A‖∞ = ${fmtF(nA,4)} · ‖x‖∞ = ${fmtF(normX,4)} · ‖b‖∞ = ${fmtF(normB,4)}</span>
        </div>
      </div>
    </div>`;

  document.getElementById('fInv').innerHTML = `
    <p class="form-label" style="margin-bottom:.5rem">A⁻¹ calculada por Gauss-Jordan</p>
    <div class="table-wrap"><table>
      <caption>Matriz A⁻¹ (‖A⁻¹‖∞ = ${fmtF(nAinv,4)})</caption>
      <tbody>${Ainv.map(row=>`<tr>${row.map(v=>`<td>${fmtF(v,6)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <div class="alert info" style="margin-top:.5rem">
      <span class="aicon">ℹ</span>
      <span>κ(A) = ‖A‖∞ × ‖A⁻¹‖∞ = ${fmtF(nA,4)} × ${fmtF(nAinv,4)} = <strong>${kappa.toFixed(4)}</strong></span>
    </div>`;

  document.getElementById('fPert').innerHTML = `
    <p class="form-label" style="margin-bottom:.5rem">Análisis de Perturbación (δb = ±${delta}%)</p>
    <div class="grid g-2">
      <div class="table-wrap"><table>
        <thead><tr><th>Zona</th><th>b original</th><th>δbᵢ</th><th>b perturbado</th><th>x original</th><th>x perturbado</th><th>δxᵢ</th></tr></thead>
        <tbody>${b.map((bi,i)=>`<tr>
          <td>Zona ${i+1}</td>
          <td>${fmtF(bi,3)}</td>
          <td class="warn">${fmtF(db[i],4)} (${(db[i]/bi*100).toFixed(2)}%)</td>
          <td>${fmtF(bPert[i],3)}</td>
          <td>${fmtF(x[i],5)}</td>
          <td>${fmtF(xPert[i],5)}</td>
          <td class="${Math.abs(dx[i])>0.01*normX?'err':'ok'}">${fmtF(dx[i],5)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div>
        <div class="table-wrap"><table>
          <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
          <tbody>
            <tr><td>‖δb‖∞</td><td>${fmtF(normDB,4)}</td></tr>
            <tr><td>‖b‖∞</td><td>${fmtF(normB,4)}</td></tr>
            <tr><td>‖δb‖∞/‖b‖∞ (error rel. b)</td><td class="warn">${(errRelB*100).toFixed(4)}%</td></tr>
            <tr><td>‖δx‖∞</td><td>${fmtF(normDX,4)}</td></tr>
            <tr><td>‖x‖∞</td><td>${fmtF(normX,4)}</td></tr>
            <tr><td>‖δx‖∞/‖x‖∞ (error rel. x)</td><td class="err">${(errRelX*100).toFixed(4)}%</td></tr>
            <tr><td>Cota teórica: κ · (‖δb‖/‖b‖)</td><td class="warn">${(cotaTeo*100).toFixed(4)}%</td></tr>
            <tr><td>Factor amplificación real</td><td class="${errRelB>0?(errRelX/errRelB).toFixed(1):'—'}">${errRelB>0?(errRelX/errRelB).toFixed(2)+'×':'—'}</td></tr>
          </tbody>
        </table></div>
      </div>
    </div>`;

  if (chartPert) chartPert.destroy();
  const zonas = Array.from({length:n},(_,i)=>`Zona ${i+1}`);
  chartPert = new Chart(document.getElementById('chartPert').getContext('2d'), {
    type:'bar',
    data:{
      labels:zonas,
      datasets:[
        { label:'x (sin perturbación)', data:x, backgroundColor:'#60a5fa88', borderColor:'#60a5fa', borderWidth:2, borderRadius:4 },
        { label:`x_pert (δb=±${delta}%)`, data:xPert, backgroundColor:'#f8717188', borderColor:'#f87171', borderWidth:2, borderRadius:4 },
        { label:'|δx| amplificación', data:dx.map(Math.abs), backgroundColor:'#fbbf2488', borderColor:'#fbbf24', borderWidth:2, borderRadius:4, type:'line', fill:false }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{color:'#94a3b8'}},
        title:{display:true,text:`κ(A)=${kappa.toFixed(1)} · Error real ${(errRelX*100).toFixed(3)}% · Cota ${(cotaTeo*100).toFixed(3)}%`,color:'#94a3b8'} },
      scales:{
        x:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'} },
        y:{ ticks:{color:'#94a3b8'}, grid:{color:'#2d4060'},
            title:{display:true,text:'Flujo (unidades)',color:'#94a3b8'} }
      }
    }
  });

  const elInterp = document.getElementById('interpDinamica');
  if (elInterp) {
    const kondInterpret = kappa<30?'bien condicionado (red equilibrada, confiable)':
                          kappa<500?'moderadamente sensible (revisar mediciones)':
                          'MUY MAL CONDICIONADO (resultados poco confiables)';
    elInterp.innerHTML = `
      <p style='font-weight:700;color:var(--accent);font-size:.95rem;margin-bottom:.8rem'>📊 Interpretación de los Resultados</p>
      <p style='font-size:.875rem;color:var(--text-secondary);margin-bottom:.8rem'>
        Matriz <strong style='color:#fff'>${n}×${n}</strong> · Perturbación δb = ±${delta}%
      </p>
      <div class='grid g-2' style='margin-bottom:.8rem'>
        <div class='table-wrap'><table>
          <thead><tr><th>Indicador</th><th>Valor</th><th>Clasificación</th></tr></thead>
          <tbody>
            <tr><td>κ(A)</td><td class='hl ${kondClass}'>${kappa.toFixed(4)}</td><td class='${kondClass}'>${kondInterpret}</td></tr>
            <tr><td>‖A‖∞</td><td>${fmtF(nA,4)}</td><td>Norma infinito de A</td></tr>
            <tr><td>‖A⁻¹‖∞</td><td>${fmtF(nAinv,4)}</td><td>Norma de la inversa</td></tr>
            <tr><td>Error rel. en b (δb/b)</td><td class='warn'>${(errRelB*100).toFixed(4)}%</td><td>Entrada (${delta}%)</td></tr>
            <tr><td>Error real en x (δx/x)</td><td class='${errClass}'>${(errRelX*100).toFixed(4)}%</td><td>${errRelX<errRelB?'Menor al input':'MAYOR al input'}</td></tr>
            <tr><td>Cota teórica (κ·errB)</td><td class='warn'>${(cotaTeo*100).toFixed(4)}%</td><td>Peor caso posible</td></tr>
          </tbody>
        </table></div>
        <div style='font-size:.875rem;color:var(--text-secondary)'>
          <p style='margin-bottom:.5rem'>
            <strong style='color:#fff'>Interpretación práctica:</strong><br>
            Un error de medición del <strong>${delta}%</strong> en la demanda b genera un error real del
            <strong style='color:${errRelX>0.05?'var(--danger)':'var(--success)'}'>${(errRelX*100).toFixed(4)}%</strong>
            en los flujos calculados x.
          </p>
          <p style='margin-bottom:.5rem'>
            La cota teórica garantiza que el error nunca superará el
            <strong style='color:var(--warning)'>${(cotaTeo*100).toFixed(2)}%</strong>
            con este nivel de perturbación y esta estructura de red.
          </p>
          <p>
            ${kappa<30?'✅ La red es <strong style=\'color:var(--success)\'>robusta</strong>: los errores de medición del '+delta+'% tienen impacto mínimo en la distribución.':
              kappa<500?'⚠️ La red tiene <strong style=\'color:var(--warning)\'>sensibilidad moderada</strong>: se recomienda verificar sensores críticos.':
              '❌ La red está <strong style=\'color:var(--danger)\'>mal condicionada</strong>: cualquier error de medición puede invalidar la distribución calculada.'}
          </p>
        </div>
      </div>`;
  }
}

function limpiarResultadosF() {
  document.getElementById('resultadosSection').classList.add('hidden');
  document.getElementById('alertGlobal').innerHTML = '';
  if (chartPert) { chartPert.destroy(); chartPert = null; }
  const el = document.getElementById('interpDinamica');
  if (el) el.innerHTML = '<p style="font-size:.875rem;color:var(--text-muted);text-align:center;padding:.8rem 0">▶ Ingresa la matriz, el vector b y ejecuta el cálculo para ver la interpretación con los valores reales.</p>';
}

// Inicializar
generarMatrizF();
