let alumnos = [];
let alumnoActual = null;
let templateBase64 = null; // Almacena la imagen como base64

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
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      alumnos = rawData
        .slice(24)
        .filter(row => row[1] && row[2] && row[3])
        .map((row, index) => ({
          registro: row[0],
          nombres: row[1],
          apellidos: row[2],
          rut: row[3],
          empresa: row[4],
          cargo: row[5],
          escolaridad: row[6],
          telefono: row[7],
          correo: row[8],
          curso: rawData[2][2],
          duracion: rawData[3][2],
          fechaInicio: rawData[5][2],
          fechaTermino: rawData[6][2],
          modalidad: rawData[7][2]
        }));

      if (alumnos.length === 0) {
        alert('No se encontraron alumnos en el archivo');
        return;
      }

      mostrarListaAlumnos(alumnos);
      cargarCertificado(alumnos[0], 0);
    } catch (error) {
      alert('Error al procesar el archivo: ' + error.message);
    }
  };

  reader.readAsArrayBuffer(file);
}

// ─── LISTA DE ALUMNOS ─────────────────────────────────────────────────────────
function mostrarListaAlumnos(datos) {
  const alumnosList = document.getElementById('alumnosList');
  alumnosList.innerHTML = '';

  datos.forEach((alumno, index) => {
    const div = document.createElement('div');
    div.className = 'alumno-item';
    div.innerHTML = `
      <div class="alumno-nombre">${alumno.nombres} ${alumno.apellidos}</div>
      <div class="alumno-rut">${alumno.rut}</div>
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
