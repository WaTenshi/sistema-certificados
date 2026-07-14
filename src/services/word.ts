import { renderAsync } from 'docx-preview'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import type { Student } from '../types'
import { copyDefaultWordDataStyles, type WordDataFieldKey, type WordDataFieldStyle, type WordDataStyles } from '../utils/wordStyles'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function createDataRun(value: string, leadingSpace = false, style: WordDataFieldStyle = { fontFamily: 'Calibri', bold: false }): string {
  const content = `${leadingSpace ? ' ' : ''}${escapeXml(value)}`
  const fontFamily = escapeXml(style.fontFamily)
  const bold = style.bold ? '1' : '0'
  return `<w:r><w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}"/><w:b w:val="${bold}"/><w:bCs w:val="${bold}"/><w:i w:val="0"/><w:iCs w:val="0"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${content}</w:t></w:r>`
}

function textFromXml(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function replaceRunContainingText(paragraph: string, textPosition: number, run: string): string {
  const runStarts = Array.from(
    paragraph.slice(0, textPosition).matchAll(/<w:r(?:\s[^>]*)?>/g),
  )
  const runStart = runStarts.at(-1)?.index ?? -1
  const runEnd = paragraph.indexOf('</w:r>', textPosition)
  if (runStart < 0 || runEnd < 0) return paragraph

  return paragraph.slice(0, runStart) + run + paragraph.slice(runEnd + 6)
}

function injectAfterParagraphLabel(xml: string, labels: string[], value: string, style: WordDataFieldStyle): string {
  if (!value) return xml

  const normalizedLabels = labels.map(normalizeText)
  return xml.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragraph) => {
    const paragraphText = normalizeText(textFromXml(paragraph))
    if (!normalizedLabels.some((label) => paragraphText.startsWith(label))) return paragraph

    const insertAt = paragraph.lastIndexOf('</w:p>')
    if (insertAt < 0) return paragraph
    return paragraph.slice(0, insertAt) + createDataRun(value, true, style) + paragraph.slice(insertAt)
  })
}

function injectInParagraphId(xml: string, paragraphId: string, value: string, style: WordDataFieldStyle): string {
  if (!value) return xml
  const position = xml.indexOf(`w14:paraId="${paragraphId}"`)
  if (position < 0) return xml

  const start = xml.lastIndexOf('<w:p ', position)
  const end = xml.indexOf('</w:p>', position) + 6
  if (start < 0 || end < 6) return xml

  let paragraph = xml.slice(start, end)
  const existingRun = /<w:t([^>]*)>([ \u00a0]*)<\/w:t>/.exec(paragraph)

  if (existingRun) {
    paragraph = replaceRunContainingText(paragraph, existingRun.index, createDataRun(value, false, style))
  } else {
    const insertAt = paragraph.lastIndexOf('</w:p>')
    paragraph = paragraph.slice(0, insertAt) + createDataRun(value, false, style) + paragraph.slice(insertAt)
  }

  return xml.slice(0, start) + paragraph + xml.slice(end)
}

function replaceCellText(cell: string, value: string, style: WordDataFieldStyle): string {
  const match = /<w:p[\s\S]*?<\/w:p>/.exec(cell)
  if (!match) return cell

  const paragraph = match[0]
  const withoutRuns = paragraph.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, '')
  const insertAt = withoutRuns.lastIndexOf('</w:p>')
  if (insertAt < 0) return cell

  const updatedParagraph = `${withoutRuns.slice(0, insertAt)}${createDataRun(value, false, style)}${withoutRuns.slice(insertAt)}`
  return cell.slice(0, match.index) + updatedParagraph + cell.slice(match.index + paragraph.length)
}

function tableRows(table: string): string[] {
  return Array.from(table.matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)).map((match) => match[0])
}

function rowCells(row: string): string[] {
  return Array.from(row.matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)).map((match) => match[0])
}

function fillParticipantTable(xml: string, student: Student, styles: WordDataStyles): string {
  return xml.replace(/<w:tbl[\s\S]*?<\/w:tbl>/g, (table) => {
    const rows = tableRows(table)
    const headerRowIndex = rows.findIndex((row) => {
      const headers = rowCells(row).map((cell) => normalizeText(textFromXml(cell)))
      return (
        headers.includes('rut') &&
        headers.includes('nombre') &&
        headers.includes('nota') &&
        headers.includes('asistencia') &&
        headers.includes('evaluacion')
      )
    })

    if (headerRowIndex < 0 || !rows[headerRowIndex + 1]) return table

    const headerCells = rowCells(rows[headerRowIndex]).map((cell) => normalizeText(textFromXml(cell)))
    const valueByHeader: Record<string, { field: WordDataFieldKey, value: string }> = {
      rut: { field: 'rut', value: student.rut },
      nombre: { field: 'nombre', value: `${student.nombres} ${student.apellidos}` },
      nota: { field: 'nota', value: student.nota ?? '' },
      asistencia: { field: 'asistencia', value: student.asistencia ?? '' },
      evaluacion: { field: 'evaluacion', value: student.evaluacion ?? '' },
    }
    const dataCells = rowCells(rows[headerRowIndex + 1])
    if (!dataCells.length) return table

    let dataRow = rows[headerRowIndex + 1]
    dataCells.forEach((cell, index) => {
      const data = valueByHeader[headerCells[index]]
      if (data == null) return
      dataRow = dataRow.replace(cell, replaceCellText(cell, data.value, styles[data.field]))
    })

    return table.replace(rows[headerRowIndex + 1], dataRow)
  })
}

export async function fillWordTemplate(
  template: ArrayBuffer,
  student: Student,
  dataStyles: WordDataStyles = copyDefaultWordDataStyles(),
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(template)
  const documentFile = zip.file('word/document.xml')
  if (!documentFile) throw new Error('La plantilla no contiene word/document.xml')

  let xml = await documentFile.async('string')
  xml = injectAfterParagraphLabel(xml, ['Nombre del curso'], student.curso, dataStyles.curso)
  xml = injectAfterParagraphLabel(xml, ['Duración'], student.duracion, dataStyles.duracion)
  xml = injectAfterParagraphLabel(xml, ['Modalidad'], student.modalidad, dataStyles.modalidad)
  xml = injectAfterParagraphLabel(xml, ['Fecha de Inicio'], student.fechaInicio, dataStyles.fechaInicio)
  xml = injectAfterParagraphLabel(xml, ['Fecha de término', 'Fecha de termino'], student.fechaTermino, dataStyles.fechaTermino)
  xml = injectInParagraphId(xml, '572397BE', student.rut, dataStyles.rut)
  xml = injectInParagraphId(xml, '0B813C2D', `${student.nombres} ${student.apellidos}`, dataStyles.nombre)
  xml = injectInParagraphId(xml, '77EE5041', student.nota ?? '', dataStyles.nota)
  xml = injectInParagraphId(xml, '0C89B983', student.asistencia ?? '', dataStyles.asistencia)
  xml = injectInParagraphId(xml, '1A9E9FA6', student.evaluacion ?? '', dataStyles.evaluacion)
  xml = fillParticipantTable(xml, student, dataStyles)

  zip.file('word/document.xml', xml)
  return zip.generateAsync({ type: 'arraybuffer' })
}

const renderOptions = {
  breakPages: true,
  experimental: true,
  ignoreHeight: false,
  ignoreLastRenderedPageBreak: false,
  ignoreWidth: false,
  renderFooters: true,
  renderHeaders: true,
  useBase64URL: true,
}

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'))
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })
    }),
  )
}

export async function renderFilledWordTemplate(
  container: HTMLElement,
  template: ArrayBuffer,
  student: Student,
  dataStyles?: WordDataStyles,
): Promise<void> {
  container.replaceChildren()
  const documentBuffer = await fillWordTemplate(template, student, dataStyles)
  await renderAsync(documentBuffer, container, container, renderOptions)
  await waitForImages(container)
  await document.fonts?.ready
}

export async function wordTemplateToPdfBlob(
  template: ArrayBuffer,
  student: Student,
  dataStyles?: WordDataStyles,
): Promise<Blob> {
  const renderHost = document.createElement('div')
  renderHost.className = 'word-pdf-render-host'
  renderHost.style.cssText =
    'position:fixed;left:-100000px;top:0;background:#fff;z-index:-1;pointer-events:none;'
  document.body.appendChild(renderHost)

  try {
    await renderFilledWordTemplate(renderHost, template, student, dataStyles)
    const pages = Array.from(renderHost.querySelectorAll<HTMLElement>('section.docx'))
    if (!pages.length) throw new Error('No se pudieron detectar las páginas de la plantilla Word.')

    let pdf: jsPDF | null = null

    for (const page of pages) {
      const canvas = await html2canvas(page, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait'
      const format: [number, number] = [canvas.width, canvas.height]

      if (!pdf) {
        pdf = new jsPDF({ orientation, unit: 'px', format, hotfixes: ['px_scaling'] })
      } else {
        pdf.addPage(format, orientation)
      }

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, canvas.width, canvas.height)
    }

    if (!pdf) throw new Error('No se pudo generar el PDF.')
    return pdf.output('blob')
  } finally {
    renderHost.remove()
  }
}
