import { jsPDF } from 'jspdf'
import type { Student } from '../types'

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

export async function createCertificateCanvas(
  student: Student,
  templateUrl: string,
  code: string,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('El navegador no permite crear el certificado')

  context.drawImage(await loadImage(templateUrl), 0, 0, WIDTH, HEIGHT)
  const scaleX = WIDTH / PREVIEW_WIDTH
  const scaleY = HEIGHT / PREVIEW_HEIGHT
  const fullName = `${student.nombres} ${student.apellidos}`.trim().toUpperCase()

  context.fillStyle = '#1d2430'
  context.font = `${Math.round(13 * scaleX)}px Arial`
  context.textAlign = 'left'
  context.fillText(code, Math.round(180 * scaleX), Math.round(67.5 * scaleY + 13))

  context.fillStyle = '#1f252e'
  context.font = `${Math.round(30 * scaleX)}px Arial`
  context.textAlign = 'center'
  context.fillText(fullName, WIDTH / 2, Math.round(280 * scaleY + 30))

  context.fillStyle = '#123d73'
  context.font = `${Math.round(32 * scaleX)}px Arial`
  context.fillText(student.rut, WIDTH / 2, Math.round(320 * scaleY + 32))

  context.fillStyle = '#1d2430'
  context.font = `bold ${Math.round(18 * scaleX)}px Arial`
  wrapText(
    context,
    student.curso.toUpperCase(),
    WIDTH / 2,
    Math.round(410 * scaleY),
    Math.round(780 * scaleX),
    Math.round(38 * scaleY),
  )

  context.font = `${Math.round(10 * scaleX)}px Arial`
  const startY = HEIGHT - Math.round(185 * scaleY)
  const endY = HEIGHT - Math.round(165 * scaleY)
  context.textAlign = 'left'
  context.fillText(student.fechaInicio.toUpperCase(), Math.round(272 * scaleX), startY)
  context.fillText(student.fechaTermino.toUpperCase(), Math.round(290 * scaleX), endY)
  context.textAlign = 'right'
  context.fillText(student.duracion.toUpperCase(), WIDTH - Math.round(295 * scaleX), startY)
  context.textAlign = 'left'
  context.fillText(student.modalidad.toUpperCase(), Math.round(555 * scaleX), HEIGHT - Math.round(161 * scaleY))

  return canvas
}

export async function createPngCertificatePdf(
  student: Student,
  templateUrl: string,
  code: string,
): Promise<jsPDF> {
  const canvas = await createCertificateCanvas(student, templateUrl, code)
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
