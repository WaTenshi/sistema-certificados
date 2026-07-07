import { jsPDF } from 'jspdf'
import type { Student } from '../types'
import {
  certificateFieldText,
  copyDefaultCertificateTexts,
  formatCertificateFieldText,
  copyDefaultCertificateLayout,
  type CertificateFieldKey,
  type CertificateFieldLayout,
  type CertificateLayout,
  type CertificateTextContent,
} from '../utils/certificateLayout'
import { certificateDetail } from '../utils/certificateFields'

const WIDTH = 1448
const HEIGHT = 1024
const PREVIEW_WIDTH = 900
const PREVIEW_HEIGHT = 630
const PDF_IMAGE_QUALITY = 0.85

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo cargar la imagen de la plantilla'))
    image.src = source
  })
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ')
  let line = ''

  words.forEach((word, index) => {
    const candidate = `${line}${word} `
    if (context.measureText(candidate).width > maxWidth && index > 0) {
      context.fillText(line.trim(), x, y)
      line = `${word} `
      y += lineHeight
    } else {
      line = candidate
    }
  })
  context.fillText(line.trim(), x, y)
}

function drawDetail(
  context: CanvasRenderingContext2D,
  field: Parameters<typeof certificateDetail>[1],
  student: Student,
  layout: CertificateFieldLayout,
  scaleX: number,
  scaleY: number,
) {
  const detail = certificateDetail(student, field)
  const fontSize = Math.round(layout.fontSize * scaleX)
  const x = Math.round(layout.x * scaleX)
  const y = Math.round((layout.y * scaleY) + fontSize)

  context.fillStyle = layout.color
  context.textAlign = layout.align
  context.font = `${layout.fontStyle === 'italic' ? 'italic ' : ''}bold ${fontSize}px Arial`
  context.fillText(`${detail.label.toUpperCase()}:`, x, y)

  if (!detail.value) return

  const labelWidth = context.measureText(`${detail.label.toUpperCase()}: `).width
  context.font = `${layout.fontStyle === 'italic' ? 'italic ' : ''}${fontSize}px Arial`
  context.fillText(detail.value.toUpperCase(), x + labelWidth, y)
}

function drawField(
  context: CanvasRenderingContext2D,
  field: CertificateFieldKey,
  student: Student,
  code: string,
  layout: CertificateFieldLayout,
  texts: CertificateTextContent,
  scaleX: number,
  scaleY: number,
) {
  if (field === 'fechaInicio' || field === 'fechaTermino' || field === 'duracion' || field === 'modalidad') {
    drawDetail(context, field, student, layout, scaleX, scaleY)
    return
  }

  const fontSize = Math.round(layout.fontSize * scaleX)
  context.fillStyle = layout.color
  context.font = `${layout.fontStyle === 'italic' ? 'italic ' : ''}${layout.weight === 'bold' ? 'bold ' : ''}${fontSize}px Arial`
  context.textAlign = layout.align
  wrapText(
    context,
    formatCertificateFieldText(certificateFieldText(field, student, code, texts), layout),
    Math.round(layout.x * scaleX),
    Math.round((layout.y * scaleY) + fontSize),
    Math.round(layout.width * scaleX),
    Math.round(layout.fontSize * layout.lineHeight * scaleY),
  )
}

export async function createCertificateCanvas(
  student: Student,
  templateUrl: string,
  code: string,
  layout: CertificateLayout = copyDefaultCertificateLayout(),
  texts: CertificateTextContent = copyDefaultCertificateTexts(),
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('El navegador no permite crear el certificado')

  context.drawImage(await loadImage(templateUrl), 0, 0, WIDTH, HEIGHT)
  const scaleX = WIDTH / PREVIEW_WIDTH
  const scaleY = HEIGHT / PREVIEW_HEIGHT
  Object.entries(layout).filter(([, fieldLayout]) => fieldLayout.visible !== false).forEach(([field, fieldLayout]) => {
    drawField(context, field as CertificateFieldKey, student, code, fieldLayout, texts, scaleX, scaleY)
  })

  return canvas
}

export async function createPngCertificatePdf(
  student: Student,
  templateUrl: string,
  code: string,
  layout?: CertificateLayout,
  texts?: CertificateTextContent,
): Promise<jsPDF> {
  const canvas = await createCertificateCanvas(student, templateUrl, code, layout, texts)
  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('No se pudo comprimir el certificado')),
      'image/jpeg',
      PDF_IMAGE_QUALITY,
    )
  })
  const imageData = new Uint8Array(await imageBlob.arrayBuffer())
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [WIDTH, HEIGHT],
    compress: true,
  })
  pdf.addImage(imageData, 'JPEG', 0, 0, WIDTH, HEIGHT, undefined, 'FAST')
  return pdf
}

export function safeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
