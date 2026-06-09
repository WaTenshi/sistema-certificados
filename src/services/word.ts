import { renderAsync } from 'docx-preview'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import type { Student } from '../types'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function createDataRun(value: string, leadingSpace = false): string {
  const content = `${leadingSpace ? ' ' : ''}${escapeXml(value)}`
  return `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:b w:val="0"/><w:bCs w:val="0"/><w:i w:val="0"/><w:iCs w:val="0"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${content}</w:t></w:r>`
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

function injectInParagraph(xml: string, label: string, value: string): string {
  if (!value) return xml
  const needle = `>${label}<`
  const position = xml.indexOf(needle)
  if (position < 0) return xml

  const start = xml.lastIndexOf('<w:p ', position)
  const end = xml.indexOf('</w:p>', position) + 6
  if (start < 0 || end < 6) return xml

  let paragraph = xml.slice(start, end)
  const labelPosition = paragraph.indexOf(needle.slice(1))
  const spaces = /<w:t([^>]*)>([ \u00a0]+)<\/w:t>/g
  let match: RegExpExecArray | null
  let lastMatch: RegExpExecArray | null = null

  while ((match = spaces.exec(paragraph)) !== null) {
    if (match.index > labelPosition) lastMatch = match
  }

  if (lastMatch) {
    paragraph = replaceRunContainingText(paragraph, lastMatch.index, createDataRun(value, true))
  } else {
    const insertAt = paragraph.lastIndexOf('</w:p>')
    paragraph = paragraph.slice(0, insertAt) + createDataRun(value, true) + paragraph.slice(insertAt)
  }

  return xml.slice(0, start) + paragraph + xml.slice(end)
}

function injectInParagraphId(xml: string, paragraphId: string, value: string): string {
  if (!value) return xml
  const position = xml.indexOf(`w14:paraId="${paragraphId}"`)
  if (position < 0) return xml

  const start = xml.lastIndexOf('<w:p ', position)
  const end = xml.indexOf('</w:p>', position) + 6
  if (start < 0 || end < 6) return xml

  let paragraph = xml.slice(start, end)
  const existingRun = /<w:t([^>]*)>([ \u00a0]*)<\/w:t>/.exec(paragraph)

  if (existingRun) {
    paragraph = replaceRunContainingText(paragraph, existingRun.index, createDataRun(value))
  } else {
    const insertAt = paragraph.lastIndexOf('</w:p>')
    paragraph = paragraph.slice(0, insertAt) + createDataRun(value) + paragraph.slice(insertAt)
  }

  return xml.slice(0, start) + paragraph + xml.slice(end)
}

export async function fillWordTemplate(template: ArrayBuffer, student: Student): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(template)
  const documentFile = zip.file('word/document.xml')
  if (!documentFile) throw new Error('La plantilla no contiene word/document.xml')

  let xml = await documentFile.async('string')
  xml = injectInParagraph(xml, 'Nombre del curso', student.curso)
  xml = injectInParagraph(xml, 'Duración', student.duracion)
  xml = injectInParagraph(xml, 'Modalidad:', student.modalidad)
  xml = injectInParagraph(xml, 'Fecha de Inicio', student.fechaInicio)
  xml = injectInParagraph(xml, 'Fecha de término', student.fechaTermino)
  xml = injectInParagraphId(xml, '572397BE', student.rut)
  xml = injectInParagraphId(xml, '0B813C2D', `${student.nombres} ${student.apellidos}`)
  xml = injectInParagraphId(xml, '77EE5041', student.nota ?? '')
  xml = injectInParagraphId(xml, '0C89B983', student.asistencia ?? '')
  xml = injectInParagraphId(xml, '1A9E9FA6', student.evaluacion ?? '')

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
): Promise<void> {
  container.replaceChildren()
  const documentBuffer = await fillWordTemplate(template, student)
  await renderAsync(documentBuffer, container, container, renderOptions)
  await waitForImages(container)
  await document.fonts?.ready
}

export async function wordTemplateToPdfBlob(template: ArrayBuffer, student: Student): Promise<Blob> {
  const renderHost = document.createElement('div')
  renderHost.className = 'word-pdf-render-host'
  renderHost.style.cssText =
    'position:fixed;left:-100000px;top:0;background:#fff;z-index:-1;pointer-events:none;'
  document.body.appendChild(renderHost)

  try {
    await renderFilledWordTemplate(renderHost, template, student)
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
