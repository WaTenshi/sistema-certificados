import type { Student } from '../types'

type CertificateDetailKey = 'fechaInicio' | 'fechaTermino' | 'fechaEjecucion' | 'duracion' | 'modalidad'

const detailLabels: Record<CertificateDetailKey, string> = {
  fechaInicio: 'Fecha de inicio',
  fechaTermino: 'Fecha término',
  fechaEjecucion: 'Fecha de ejecución',
  duracion: 'Duración',
  modalidad: 'Modalidad',
}

const detailLabelAliases: Record<CertificateDetailKey, string[]> = {
  fechaInicio: ['Fecha inicio', 'Fecha de inicio'],
  fechaTermino: ['Fecha término', 'Fecha de término', 'Fecha termino', 'Fecha de termino'],
  fechaEjecucion: ['Fecha ejecución', 'Fecha de ejecución', 'Fecha ejecucion', 'Fecha de ejecucion'],
  duracion: ['Duración', 'Duracion'],
  modalidad: ['Modalidad'],
}

function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function stripExistingLabels(labels: string[], value: string): string {
  const trimmed = value.trim()
  const normalizedValue = normalizeForCompare(trimmed)
  const hasKnownPrefix = labels.some((label) => {
    const normalizedLabel = normalizeForCompare(label)
    return normalizedValue.startsWith(`${normalizedLabel}:`)
  })

  if (!hasKnownPrefix) return trimmed

  return trimmed.slice(trimmed.indexOf(':') + 1).trim()
}

export function certificateDetail(
  student: Student,
  key: CertificateDetailKey,
  customLabel?: string,
): { label: string; value: string; text: string } {
  const label = customLabel?.trim() || detailLabels[key]
  const value = stripExistingLabels([label, ...detailLabelAliases[key]], student[key])

  return {
    label,
    value,
    text: value ? `${label}: ${value}` : `${label}:`,
  }
}
