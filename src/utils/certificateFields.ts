import type { Student } from '../types'

type CertificateDetailKey = 'fechaInicio' | 'fechaTermino' | 'duracion' | 'modalidad'

const detailLabels: Record<CertificateDetailKey, string> = {
  fechaInicio: 'Fecha inicio',
  fechaTermino: 'Fecha término',
  duracion: 'Duración',
  modalidad: 'Modalidad',
}

function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function stripExistingLabel(label: string, value: string): string {
  const trimmed = value.trim()
  const normalizedValue = normalizeForCompare(trimmed)
  const normalizedLabel = normalizeForCompare(label)
  const prefix = `${normalizedLabel}:`

  if (!normalizedValue.startsWith(prefix)) return trimmed

  return trimmed.slice(trimmed.indexOf(':') + 1).trim()
}

export function certificateDetail(
  student: Student,
  key: CertificateDetailKey,
): { label: string; value: string; text: string } {
  const label = detailLabels[key]
  const value = stripExistingLabel(label, student[key])

  return {
    label,
    value,
    text: value ? `${label}: ${value}` : `${label}:`,
  }
}
