import type { Student } from '../types'
import { certificateDetail } from './certificateFields'
import { studentName } from './students'

export const CERTIFICATE_PREVIEW_WIDTH = 900
export const CERTIFICATE_PREVIEW_HEIGHT = 630

export type CertificateFieldKey =
  | 'registro'
  | 'nombre'
  | 'rut'
  | 'introText'
  | 'curso'
  | 'fechaInicio'
  | 'fechaTermino'
  | 'duracion'
  | 'modalidad'
  | 'senceLegend'

export type CertificateTextFieldKey = 'introText' | 'senceLegend'

export interface CertificateFieldLayout {
  x: number
  y: number
  width: number
  fontSize: number
  lineHeight: number
  align: CanvasTextAlign
  color: string
  weight: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textTransform?: 'uppercase' | 'none'
  visible?: boolean
}

export type CertificateLayout = Record<CertificateFieldKey, CertificateFieldLayout>
export type CertificateTextContent = Record<CertificateTextFieldKey, string>

export const certificateFieldLabels: Record<CertificateFieldKey, string> = {
  registro: 'N° registro',
  nombre: 'Participante',
  rut: 'RUT',
  introText: 'Leyenda curso',
  curso: 'Curso',
  fechaInicio: 'Fecha inicio',
  fechaTermino: 'Fecha término',
  duracion: 'Duración',
  modalidad: 'Modalidad',
  senceLegend: 'Leyenda SENCE',
}

export const defaultCertificateTexts: CertificateTextContent = {
  introText: 'Por haber participado en la capacitación sobre :',
  senceLegend: 'ACTIVIDAD DE CAPACITACIÓN FINANCIADA, TOTAL O PARCIALMENTE, A TRAVÉS DE LA FRANQUICIA TRIBUTARIA DE CAPACITACIÓN, ADMINISTRADA POR EL SERVICIO NACIONAL DE CAPACITACIÓN Y EMPLEO, GOBIERNO DE CHILE. ACTIVIDAD NO CONDUCENTE AL OTORGAMIENTO DE UN TÍTULO O GRADO ACADÉMICO',
}

export const defaultCertificateLayout: CertificateLayout = {
  registro: {
    x: 180,
    y: 59,
    width: 190,
    fontSize: 13,
    lineHeight: 1.2,
    align: 'left',
    color: '#1d2430',
    weight: 'bold',
  },
  nombre: {
    x: 450,
    y: 265,
    width: 750,
    fontSize: 30,
    lineHeight: 1.1,
    align: 'center',
    color: '#1f252e',
    weight: 'normal',
  },
  rut: {
    x: 450,
    y: 305,
    width: 750,
    fontSize: 32,
    lineHeight: 1.1,
    align: 'center',
    color: '#123d73',
    weight: 'normal',
  },
  introText: {
    x: 450,
    y: 344,
    width: 620,
    fontSize: 15,
    lineHeight: 1.15,
    align: 'center',
    color: '#0b3b67',
    weight: 'normal',
    fontStyle: 'italic',
    textTransform: 'none',
  },
  curso: {
    x: 450,
    y: 390,
    width: 680,
    fontSize: 18,
    lineHeight: 1.2,
    align: 'center',
    color: '#1d2430',
    weight: 'bold',
  },
  fechaInicio: {
    x: 197,
    y: 438,
    width: 245,
    fontSize: 10,
    lineHeight: 1.2,
    align: 'left',
    color: '#1d2430',
    weight: 'normal',
  },
  fechaTermino: {
    x: 197,
    y: 459,
    width: 245,
    fontSize: 10,
    lineHeight: 1.2,
    align: 'left',
    color: '#1d2430',
    weight: 'normal',
  },
  duracion: {
    x: 478,
    y: 438,
    width: 260,
    fontSize: 10,
    lineHeight: 1.2,
    align: 'left',
    color: '#1d2430',
    weight: 'normal',
  },
  modalidad: {
    x: 478,
    y: 462,
    width: 260,
    fontSize: 10,
    lineHeight: 1.2,
    align: 'left',
    color: '#1d2430',
    weight: 'normal',
  },
  senceLegend: {
    x: 450,
    y: 545,
    width: 480,
    fontSize: 4.2,
    lineHeight: 1.15,
    align: 'center',
    color: '#123d73',
    weight: 'normal',
    textTransform: 'none',
    visible: false,
  },
}

export function copyDefaultCertificateLayout(): CertificateLayout {
  return Object.fromEntries(
    Object.entries(defaultCertificateLayout).map(([key, value]) => [key, { ...value }]),
  ) as CertificateLayout
}

export function copyDefaultCertificateTexts(): CertificateTextContent {
  return { ...defaultCertificateTexts }
}

export function certificateFieldText(
  field: CertificateFieldKey,
  student: Student,
  code: string,
  texts: CertificateTextContent = defaultCertificateTexts,
): string {
  if (field === 'registro') return code
  if (field === 'nombre') return studentName(student)
  if (field === 'rut') return student.rut
  if (field === 'introText') return texts.introText
  if (field === 'curso') return student.curso
  if (field === 'senceLegend') return texts.senceLegend
  return certificateDetail(student, field).text
}

export function formatCertificateFieldText(text: string, layout: CertificateFieldLayout): string {
  return layout.textTransform === 'none' ? text : text.toUpperCase()
}

export function fieldLeft(layout: CertificateFieldLayout): number {
  if (layout.align === 'center') return layout.x - layout.width / 2
  if (layout.align === 'right') return layout.x - layout.width
  return layout.x
}

export function clampLayout(fieldLayout: CertificateFieldLayout): CertificateFieldLayout {
  const width = Math.max(40, Math.min(CERTIFICATE_PREVIEW_WIDTH, fieldLayout.width))
  const left = Math.max(0, Math.min(CERTIFICATE_PREVIEW_WIDTH - width, fieldLeft({ ...fieldLayout, width })))
  const x = fieldLayout.align === 'center'
    ? left + width / 2
    : fieldLayout.align === 'right'
      ? left + width
      : left

  return {
    ...fieldLayout,
    x: Math.round(x * 10) / 10,
    y: Math.round(Math.max(0, Math.min(CERTIFICATE_PREVIEW_HEIGHT - 8, fieldLayout.y)) * 10) / 10,
    width: Math.round(width * 10) / 10,
    fontSize: Math.round(Math.max(6, Math.min(72, fieldLayout.fontSize)) * 10) / 10,
  }
}
