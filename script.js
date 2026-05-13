let alumnosPorPagina = {}; // { nombreHoja: [alumnos] }
let paginasNombres = []; // Nombres de las hojas/páginas
let paginaActual = 0; // Índice de la página actual
let alumnos = []; // Alumnos de la página actual
let alumnoActual = null;
let templateBase64 = null; // Almacena la imagen como base64
let alumnosFiltrados = []; // Almacena los alumnos filtrados por búsqueda
let panelInfoExpanded = true; // Estado del panel de información
let _pendingContinuarCarga = null; // Callback pendiente tras modal

// ─── CARGA DEL TEMPLATE ───────────────────────────────────────────────────────
function cargarTemplate(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    templateBase64 = e.target.result; // data:image/png;base64,...

    // Actualizar la imagen de preview en el certificado oculto
    document.getElementById('templateBg').src = templateBase64;

    // Marcar como cargado
    const status = document.getElementById('templateStatus');
    status.textContent = 'Cargado';
    status.classList.add('ok');

    // Si ya hay un alumno seleccionado, refrescar el preview
    if (alumnoActual) mostrarPreview();
  };
  reader.readAsDataURL(file);
}

// ─── PROCESAMIENTO DEL EXCEL ──────────────────────────────────────────────────
function procesarExcel() {
  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];

  if (!file) {
    alert('Selecciona un archivo Excel');
    return;
  }

  if (!templateBase64) {
    alert('Primero carga el archivo template.png con el selector de imagen');
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Limpiar datos previos
      alumnosPorPagina = {};
      paginasNombres = [];

      // ── Registros con datos faltantes (para el modal) ──────────────────────
      const registrosIncompletos = [];
      
      // Procesar todas las hojas
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Detectar automáticamente dónde comienzan los datos de alumnos
        let inicioAlumnos = 0;
        for (let i = 0; i < Math.min(30, rawData.length); i++) {
          const row = rawData[i];
          if (row && row.length > 3 && row[1] && row[2] && row[3]) {
            if (typeof row[3] === 'string' && (row[3].includes('.') || row[3].includes('-'))) {
              inicioAlumnos = i;
              break;
            }
          }
        }

        // ── Detectar filas con datos faltantes ANTES de filtrar ───────────────
        rawData.slice(inicioAlumnos).forEach((row, relIndex) => {
          const filaExcel = inicioAlumnos + relIndex + 1; // 1-based para el usuario
          const tieneAlgo = row[1] || row[2] || row[3];
          if (!tieneAlgo) return; // fila completamente vacía, ignorar

          const faltantes = [];
          if (!row[1]) faltantes.push('Nombres');
          if (!row[2]) faltantes.push('Apellidos');
          if (!row[3]) faltantes.push('RUT');

          if (faltantes.length > 0) {
            registrosIncompletos.push({
              hoja: sheetName,
              filaExcel,
              nombres:   row[1] || '—',
              apellidos: row[2] || '—',
              rut:       row[3] || '—',
              faltantes
            });
          }
        });

        // ── Solo incluir filas completas en la lista de alumnos ───────────────
        const alumnosHoja = rawData
          .slice(inicioAlumnos)
          .filter(row => row[1] && row[2] && row[3])
          .map((row) => ({
            registro:    row[0],
            nombres:     row[1],
            apellidos:   row[2],
            rut:         row[3],
            empresa:     row[4],
            cargo:       row[5],
            escolaridad: row[6],
            telefono:    row[7],
            correo:      row[8],
            curso:       rawData[2] && rawData[2][2],
            duracion:    rawData[3] && rawData[3][2],
            fechaInicio: rawData[5] && rawData[5][2],
            fechaTermino:rawData[6] && rawData[6][2],
            modalidad:   rawData[7] && rawData[7][2]
          }));

        if (alumnosHoja.length > 0) {
          alumnosPorPagina[sheetName] = alumnosHoja;
          paginasNombres.push(sheetName);
        }
      });

      if (paginasNombres.length === 0) {
        alert('No se encontraron alumnos en el archivo');
        return;
      }

      // ── Si hay registros incompletos, mostrar modal antes de continuar ──────
      const continuarCarga = () => {
        paginaActual = 0;
        cambiarPagina(0);
      };

      if (registrosIncompletos.length > 0) {
        mostrarModalAdvertencia(registrosIncompletos, continuarCarga);
      } else {
        continuarCarga();
      }

    } catch (error) {
      alert('Error al procesar el archivo: ' + error.message);
    }
  };

  reader.readAsArrayBuffer(file);
}

// ─── MODAL: MOSTRAR ADVERTENCIA DE DATOS FALTANTES ───────────────────────────
function mostrarModalAdvertencia(registros, callbackContinuar) {
  _pendingContinuarCarga = callbackContinuar;

  // Resumen
  const totalHojas = [...new Set(registros.map(r => r.hoja))].length;
  document.getElementById('modalResumenTexto').innerHTML =
    `Se encontraron <strong>${registros.length} registro(s)</strong> con datos críticos faltantes ` +
    `en <strong>${totalHojas} hoja(s)</strong>. ` +
    `Estos alumnos <strong>no aparecerán</strong> en la lista de cargados. ` +
    `Revisa la tabla a continuación para identificar y corregir cada caso en tu archivo Excel.`;

  // Tabla
  const tbody = document.getElementById('modalTablaBody');
  tbody.innerHTML = '';
  registros.forEach((r, i) => {
    const tr = document.createElement('tr');
    const datosDisponibles = [
      r.nombres !== '—' ? `Nombres: <em>${r.nombres}</em>` : null,
      r.apellidos !== '—' ? `Apellidos: <em>${r.apellidos}</em>` : null,
      r.rut !== '—' ? `RUT: <em>${r.rut}</em>` : null
    ].filter(Boolean).join('<br>') || '<span style="color:#aaa">Sin datos identificables</span>';

    const badgesFaltantes = r.faltantes
      .map(f => `<span class="badge-faltante">✗ ${f}</span>`)
      .join('');

    tr.innerHTML = `
      <td style="color:#aaa;font-size:12px">${i + 1}</td>
      <td class="hoja-cell">📄 ${r.hoja}</td>
      <td class="fila-cell">Fila ${r.filaExcel}</td>
      <td style="font-size:12px;line-height:1.6">${datosDisponibles}</td>
      <td>${badgesFaltantes}</td>
    `;
    tbody.appendChild(tr);
  });

  // Mostrar modal
  document.getElementById('modalAdvertencia').classList.add('visible');
}

function cerrarModalIgnorar() {
  document.getElementById('modalAdvertencia').classList.remove('visible');
  if (_pendingContinuarCarga) {
    _pendingContinuarCarga();
    _pendingContinuarCarga = null;
  }
}

function cerrarModalCorregir() {
  document.getElementById('modalAdvertencia').classList.remove('visible');
  _pendingContinuarCarga = null;
  // No continúa la carga; el usuario va a corregir el archivo
}


// ─── LISTA DE ALUMNOS ─────────────────────────────────────────────────────────
function mostrarListaAlumnos(datos) {
  const alumnosList = document.getElementById('alumnosList');
  alumnosList.innerHTML = '';

  datos.forEach((alumno, index) => {
    const div = document.createElement('div');
    div.className = 'alumno-item';
    div.innerHTML = `
      <div class="alumno-numero">${index + 1}</div>
      <div class="alumno-info">
        <div class="alumno-nombre">${alumno.nombres} ${alumno.apellidos}</div>
        <div class="alumno-rut">${alumno.rut}</div>
      </div>
    `;
    div.onclick = () => cargarCertificado(alumno, index);
    alumnosList.appendChild(div);
  });
}

// ─── CARGAR CERTIFICADO EN PREVIEW ───────────────────────────────────────────
function cargarCertificado(alumno, index = 0) {
  if (!alumno) return;

  alumnoActual = alumno;
  const nombreCompleto = `${alumno.nombres || ''} ${alumno.apellidos || ''}`.toUpperCase();

  document.getElementById('certNombre').innerText = nombreCompleto;
  document.getElementById('certRut').innerText = alumno.rut || '';
  document.getElementById('certCurso').innerText = (alumno.curso || '').toUpperCase();
  document.getElementById('certInicio').innerText = (alumno.fechaInicio || '').toUpperCase();
  document.getElementById('certTermino').innerText = (alumno.fechaTermino || '').toUpperCase();
  document.getElementById('certDuracion').innerText = (alumno.duracion || '').toUpperCase();
  document.getElementById('certModalidad').innerText = (alumno.modalidad || '').toUpperCase();
  // Registro con prefijo del usuario
  const prefijo = document.getElementById('prefijoRegistro').value.trim().toUpperCase();
  const numRegistro = index + 1;
  const codigoRegistro = prefijo ? `${prefijo}${numRegistro}` : `${numRegistro}`;
  document.getElementById('certRegistro').innerText = codigoRegistro;

  mostrarPreview();

  document.getElementById('infNombre').innerText = nombreCompleto;
  document.getElementById('infRut').innerText = alumno.rut || '-';
  document.getElementById('infCurso').innerText = alumno.curso || '-';
  document.getElementById('infDuracion').innerText = alumno.duracion || '-';
  document.getElementById('infModalidad').innerText = alumno.modalidad || '-';
  document.getElementById('infoPanel').classList.add('visible');
  document.getElementById('btnDescargar').style.display = 'block';
  document.getElementById('btnDescargarTodos').style.display = 'block';

  const items = document.querySelectorAll('.alumno-item');
  items.forEach(item => item.classList.remove('active'));
  if (items[index]) items[index].classList.add('active');
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
function mostrarPreview() {
  const certificado = document.getElementById('certificado');
  const previewContainer = document.getElementById('previewContainer');

  const clone = certificado.cloneNode(true);
  clone.classList.remove('hidden');
  clone.style.position = 'relative';

  // Poner la imagen base64 en el clon
  if (templateBase64) {
    const imgEl = clone.querySelector('.template-bg');
    if (imgEl) imgEl.src = templateBase64;
  }

  previewContainer.innerHTML = '';
  previewContainer.appendChild(clone);
}

// ─── GENERACIÓN DE PDF ────────────────────────────────────────────────────────
async function generarPDFActual() {
  if (!alumnoActual) {
    alert('Por favor selecciona un alumno primero');
    return;
  }

  if (!templateBase64) {
    alert('No hay imagen template cargada. Carga el archivo template.png primero.');
    return;
  }

  const btnDescargar = document.getElementById('btnDescargar');
  btnDescargar.disabled = true;
  btnDescargar.innerText = 'Generando...';

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('jsPDF no está disponible. Recarga la página.');
    }

    // Crear canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1448;
    canvas.height = 1024;
    
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No se pudo crear el contexto del canvas');

    // Cargar imagen desde base64 (sin CORS)
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('No se pudo cargar el template'));
      img.src = templateBase64;
    });

    ctx.drawImage(img, 0, 0, 1448, 1024);

    // ── Textos sobre el canvas ──────────────────────────────────────────────
    // Factor de escala: Canvas (1448x1024) vs Preview (900x630)
    const scaleX = 1448 / 900;
    const scaleY = 1024 / 630;

    // REGISTRO (top: 59px, left: 180px)
    const registro = document.getElementById('certRegistro').innerText;
    ctx.fillStyle = '#1d2430';
    ctx.font = `${Math.round(13 * scaleX)}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(registro, Math.round(180 * scaleX), Math.round(67.5 * scaleY + 13));

    // NOMBRE (top: 265px, center, font-size: 30px, color: #1f252e)
    const nombre = document.getElementById('certNombre').innerText;
    ctx.fillStyle = '#1f252e';
    ctx.font = `${Math.round(30 * scaleX)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(nombre || 'NOMBRE', 724, Math.round(280 * scaleY + 30));

    // RUT (top: 305px, center, font-size: 32px, color: #123d73)
    const rut = document.getElementById('certRut').innerText;
    ctx.fillStyle = '#123d73';
    ctx.font = `${Math.round(32 * scaleX)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(rut || 'RUT', 724, Math.round(320 * scaleY + 32));

    // CURSO (top: 390px, center, font-size: 18px, color: #1d2430)
    const curso = document.getElementById('certCurso').innerText;
    ctx.fillStyle = '#1d2430';
    ctx.font = `bold ${Math.round(18 * scaleX)}px Arial`;
    ctx.textAlign = 'center';
    wrapText(ctx, curso || 'CURSO', 724, Math.round(410 * scaleY), Math.round(780 * scaleX), Math.round(38 * scaleY));

    // FECHAS Y DATOS
    const inicio    = document.getElementById('certInicio').innerText;
    const termino   = document.getElementById('certTermino').innerText;
    const duracion  = document.getElementById('certDuracion').innerText;
    const modalidad = document.getElementById('certModalidad').innerText;

    ctx.fillStyle = '#1d2430';
    ctx.font = `${Math.round(10 * scaleX)}px Arial`;

    // FECHA INICIO (bottom: 182px, left: 272px)
    ctx.textAlign = 'left';
    const yInicio = 1024 - Math.round(185 * scaleY);
    ctx.fillText(inicio   || 'INICIO',    Math.round(272 * scaleX), yInicio);

    // FECHA TÉRMINO (bottom: 161px, left: 290px)
    const yTermino = 1024 - Math.round(165 * scaleY);
    ctx.fillText(termino  || 'TÉRMINO',   Math.round(290 * scaleX), yTermino);

    // DURACIÓN (bottom: 182px, right: 295px)
    ctx.textAlign = 'right';
    const xDuracion = 1448 - Math.round(295 * scaleX);
    ctx.fillText(duracion  || 'DURACIÓN',  xDuracion, yInicio);

    // MODALIDAD (bottom: 158px, right: 280px)
    const yModalidad = 1024 - Math.round(161 * scaleY);
    const xModalidad = 1448 - Math.round(280 * scaleX);
    ctx.fillText(modalidad || 'MODALIDAD', xModalidad, yModalidad);

    // ── Exportar a PDF ──────────────────────────────────────────────────────
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1448, 1024]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 1448, 1024);

    const nombreArchivo = alumnoActual.nombres && alumnoActual.apellidos
      ? `${alumnoActual.nombres}-${alumnoActual.apellidos}`
      : 'certificado';

    pdf.save(`certificado-${nombreArchivo.replace(/\s+/g, '-')}.pdf`);

    btnDescargar.disabled = false;
    btnDescargar.innerText = 'Descargar PDF';

  } catch (error) {
    console.error('Error completo:', error);
    alert('Error al generar PDF: ' + (error.message || 'Error desconocido'));
    btnDescargar.disabled = false;
    btnDescargar.innerText = 'Descargar PDF';
  }
}

// ─── UTILIDAD: texto multilínea en canvas ─────────────────────────────────────
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
}

// ─── ACTUALIZAR REGISTROS AL CAMBIAR PREFIJO ──────────────────────────────────
function actualizarRegistros() {
  if (!alumnoActual) return;
  // Encontrar index del alumno actual
  const index = alumnos.findIndex(a => a.rut === alumnoActual.rut);
  cargarCertificado(alumnoActual, index >= 0 ? index : 0);
}

// ─── MODAL PROGRESO: ACTUALIZAR UI ────────────────────────────────────────────
function actualizarModalProgreso(procesados, total, nombreAlumno) {
  const porcentaje = total > 0 ? Math.round((procesados / total) * 100) : 0;
  document.getElementById('progresoActual').innerText  = procesados;
  document.getElementById('progresoTotal').innerText   = total;
  document.getElementById('progresoFill').style.width  = porcentaje + '%';
  document.getElementById('statCompletados').innerText = procesados;
  document.getElementById('statRestantes').innerText   = total - procesados;
  document.getElementById('statPorcentaje').innerText  = porcentaje + '%';
  if (nombreAlumno) {
    document.getElementById('progresoAlumnoActual').innerHTML =
      `<span class="progreso-spinner"></span> Procesando: ${nombreAlumno}`;
  }
}

function abrirModalProgreso(nombrePagina, total) {
  document.getElementById('progresoNombrePagina').innerText = 'Hoja: ' + nombrePagina;
  document.getElementById('progresoActual').innerText  = '0';
  document.getElementById('progresoTotal').innerText   = total;
  document.getElementById('progresoFill').style.width  = '0%';
  document.getElementById('statCompletados').innerText = '0';
  document.getElementById('statRestantes').innerText   = total;
  document.getElementById('statPorcentaje').innerText  = '0%';
  document.getElementById('progresoAlumnoActual').innerHTML =
    '<span class="progreso-spinner"></span> Iniciando proceso...';
  document.getElementById('modalProgreso').classList.add('visible');
}

function cerrarModalProgreso() {
  document.getElementById('modalProgreso').classList.remove('visible');
}

// ─── DESCARGAR TODOS LOS CERTIFICADOS EN ZIP ──────────────────────────────────
async function descargarTodosCertificados() {
  if (!alumnos || alumnos.length === 0) {
    alert('No hay alumnos cargados');
    return;
  }

  if (!templateBase64) {
    alert('No hay imagen template cargada. Carga el archivo template.png primero.');
    return;
  }

  const btnDescargarTodos = document.getElementById('btnDescargarTodos');
  btnDescargarTodos.disabled = true;
  btnDescargarTodos.innerText = 'Generando...';

  const nombrePagina = paginasNombres[paginaActual] || 'pagina';
  abrirModalProgreso(nombrePagina, alumnos.length);

  // Dar un frame para que el modal se pinte antes de iniciar el procesamiento
  await new Promise(r => setTimeout(r, 80));

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('jsPDF no esta disponible. Recarga la pagina.');
    }

    const JSZip = window.JSZip;
    const zip = new JSZip();
    const prefijo = document.getElementById('prefijoRegistro').value.trim().toUpperCase();

    // Generar PDF para cada alumno
    for (let index = 0; index < alumnos.length; index++) {
      const alumno = alumnos[index];
      const nombreCompleto = `${alumno.nombres || ''} ${alumno.apellidos || ''}`.trim();

      // Actualizar modal antes de procesar este alumno
      actualizarModalProgreso(index, alumnos.length, nombreCompleto || `Alumno ${index + 1}`);
      // Ceder control al navegador para que se actualice la UI
      await new Promise(r => setTimeout(r, 0));

      // Crear canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1448;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('No se pudo crear el contexto del canvas');

      // Cargar imagen
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('No se pudo cargar el template'));
        img.src = templateBase64;
      });

      ctx.drawImage(img, 0, 0, 1448, 1024);

      // Preparar datos del alumno
      const nombreMayus = nombreCompleto.toUpperCase();
      const numRegistro = index + 1;
      const codigoRegistro = prefijo ? `${prefijo}${numRegistro}` : `${numRegistro}`;

      const scaleX = 1448 / 900;
      const scaleY = 1024 / 630;

      // REGISTRO
      ctx.fillStyle = '#1d2430';
      ctx.font = `${Math.round(13 * scaleX)}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText(codigoRegistro, Math.round(180 * scaleX), Math.round(67.5 * scaleY + 13));

      // NOMBRE
      ctx.fillStyle = '#1f252e';
      ctx.font = `${Math.round(30 * scaleX)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(nombreMayus, 724, Math.round(280 * scaleY + 30));

      // RUT
      ctx.fillStyle = '#123d73';
      ctx.font = `${Math.round(32 * scaleX)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(alumno.rut || '', 724, Math.round(320 * scaleY + 32));

      // CURSO
      ctx.fillStyle = '#1d2430';
      ctx.font = `bold ${Math.round(18 * scaleX)}px Arial`;
      ctx.textAlign = 'center';
      wrapText(ctx, (alumno.curso || '').toUpperCase(), 724, Math.round(410 * scaleY), Math.round(780 * scaleX), Math.round(38 * scaleY));

      // FECHAS Y DATOS
      const inicio   = (alumno.fechaInicio  || '').toUpperCase();
      const termino  = (alumno.fechaTermino || '').toUpperCase();
      const duracion = (alumno.duracion     || '').toUpperCase();
      const modalidad= (alumno.modalidad    || '').toUpperCase();

      ctx.fillStyle = '#1d2430';
      ctx.font = `${Math.round(10 * scaleX)}px Arial`;

      ctx.textAlign = 'left';
      const yInicio  = 1024 - Math.round(185 * scaleY);
      ctx.fillText(inicio,  Math.round(272 * scaleX), yInicio);

      const yTermino = 1024 - Math.round(165 * scaleY);
      ctx.fillText(termino, Math.round(290 * scaleX), yTermino);

      ctx.textAlign = 'right';
      const xDuracion = 1448 - Math.round(295 * scaleX);
      ctx.fillText(duracion, xDuracion, yInicio);

      const yModalidad = 1024 - Math.round(161 * scaleY);
      const xModalidad = 1448 - Math.round(280 * scaleX);
      ctx.fillText(modalidad, xModalidad, yModalidad);

      // Convertir a PDF
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1448, 1024]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 1448, 1024);

      const nombreArchivo = alumno.nombres && alumno.apellidos
        ? `${alumno.nombres}-${alumno.apellidos}`
        : `alumno-${numRegistro}`;

      const pdfData = pdf.output('arraybuffer');
      zip.file(`${nombreArchivo.replace(/\s+/g, '-')}.pdf`, pdfData);
    }

    // Mostrar estado de compresion en el modal
    actualizarModalProgreso(alumnos.length, alumnos.length, null);
    document.getElementById('progresoAlumnoActual').innerHTML =
      '<span class="progreso-spinner"></span> Comprimiendo archivos ZIP...';
    await new Promise(r => setTimeout(r, 0));

    const zipData = await zip.generateAsync({ type: 'blob' });

    const nombreArchivo = `certificados-${nombrePagina.replace(/\s+/g, '-')}.zip`;
    saveAs(zipData, nombreArchivo);

    cerrarModalProgreso();
    btnDescargarTodos.disabled = false;
    btnDescargarTodos.innerText = 'Descargar Todos';

  } catch (error) {
    console.error('Error completo:', error);
    cerrarModalProgreso();
    alert('Error al generar certificados: ' + (error.message || 'Error desconocido'));
    btnDescargarTodos.disabled = false;
    btnDescargarTodos.innerText = 'Descargar Todos';
  }
}

// ─── FILTRAR ALUMNOS POR BÚSQUEDA ─────────────────────────────────────────────
function filtrarAlumnos() {
  const busqueda = document.getElementById('buscarAlumnos').value.toLowerCase().trim();
  
  if (busqueda === '') {
    // Si el campo está vacío, mostrar todos los alumnos
    alumnosFiltrados = [...alumnos];
  } else {
    // Filtrar por nombre o RUT
    alumnosFiltrados = alumnos.filter(alumno => {
      const nombre = `${alumno.nombres} ${alumno.apellidos}`.toLowerCase();
      const rut = (alumno.rut || '').toLowerCase();
      return nombre.includes(busqueda) || rut.includes(busqueda);
    });
  }
  
  // Re-renderizar la lista de alumnos
  mostrarListaAlumnos(alumnosFiltrados);
}

// ─── RESETEAR SISTEMA ─────────────────────────────────────────────────────────
function resetearSistema() {
  const confirmacion = confirm('¿Estás seguro de que deseas limpiar todo? Se eliminarán todos los alumnos cargados y los certificados (se mantendrá el template).');
  
  if (!confirmacion) return;

  // Limpiar datos
  alumnos = [];
  alumnosFiltrados = [];
  alumnoActual = null;
  alumnosPorPagina = {};
  paginasNombres = [];
  paginaActual = 0;
  panelInfoExpanded = true; // Resetear estado del panel

  // Limpiar inputs
  document.getElementById('excelFile').value = '';
  document.getElementById('buscarAlumnos').value = '';
  document.getElementById('prefijoRegistro').value = '';

  // Limpiar lista de alumnos
  document.getElementById('alumnosList').innerHTML = '';

  // Ocultar botones de descarga
  document.getElementById('btnDescargar').style.display = 'none';
  document.getElementById('btnDescargarTodos').style.display = 'none';

  // Ocultar barra de navegación
  document.getElementById('pagesNavigation').style.display = 'none';
  document.getElementById('paginasHeader').innerText = 'ALUMNOS CARGADOS';

  // Limpiar preview
  const previewContainer = document.getElementById('previewContainer');
  previewContainer.innerHTML = '<div class="preview-empty">Carga el template y un archivo Excel para ver los certificados aquí</div>';

  // Ocultar panel de información
  document.getElementById('infoPanel').classList.remove('visible');

  // Expandir el panel de información
  const infoContent = document.getElementById('infoContent');
  const toggleBtn = document.getElementById('toggleBtn');
  infoContent.classList.remove('collapsed');
  toggleBtn.classList.remove('collapsed');

  // Limpiar campos de información
  document.getElementById('infNombre').innerText = '-';
  document.getElementById('infRut').innerText = '-';
  document.getElementById('infCurso').innerText = '-';
  document.getElementById('infDuracion').innerText = '-';
  document.getElementById('infModalidad').innerText = '-';

  alert('Sistema limpiado. El template se ha mantenido. Listo para un nuevo proceso.');
}

// ─── CAMBIAR DE PÁGINA ───────────────────────────────────────────────────────
function cambiarPagina(direccion) {
  const nuevaPagina = paginaActual + direccion;
  
  if (nuevaPagina < 0 || nuevaPagina >= paginasNombres.length) {
    return;
  }

  paginaActual = nuevaPagina;
  const nombrePagina = paginasNombres[paginaActual];
  
  // Cargar alumnos de la página actual
  alumnos = alumnosPorPagina[nombrePagina] || [];
  alumnosFiltrados = [...alumnos];
  
  // Limpiar búsqueda
  document.getElementById('buscarAlumnos').value = '';
  
  // Actualizar header
  document.getElementById('paginasHeader').innerText = `ALUMNOS CARGADOS - ${nombrePagina}`;
  
  // Mostrar lista de alumnos
  mostrarListaAlumnos(alumnos);
  
  // Cargar el primer alumno
  if (alumnos.length > 0) {
    cargarCertificado(alumnos[0], 0);
  }
  
  // Mostrar barra de navegación si hay múltiples páginas
  const pagesNav = document.getElementById('pagesNavigation');
  if (paginasNombres.length > 1) {
    pagesNav.style.display = 'flex';
  } else {
    pagesNav.style.display = 'none';
  }
  
  // Actualizar botones de navegación
  actualizarBotonesNavegacion();
}

// ─── ACTUALIZAR BOTONES DE NAVEGACIÓN ────────────────────────────────────────
function actualizarBotonesNavegacion() {
  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');
  const pageInfo = document.getElementById('pageInfo');
  
  btnPrev.disabled = paginaActual === 0;
  btnNext.disabled = paginaActual === paginasNombres.length - 1;
  
  pageInfo.innerText = `Página ${paginaActual + 1} de ${paginasNombres.length}`;
}

// ─── TOGGLE PANEL DE INFORMACIÓN ──────────────────────────────────────────────
function togglePanelInfo() {
  const infoContent = document.getElementById('infoContent');
  const toggleBtn = document.getElementById('toggleBtn');
  
  panelInfoExpanded = !panelInfoExpanded;
  
  if (panelInfoExpanded) {
    infoContent.classList.remove('collapsed');
    toggleBtn.classList.remove('collapsed');
  } else {
    infoContent.classList.add('collapsed');
    toggleBtn.classList.add('collapsed');
  }
}