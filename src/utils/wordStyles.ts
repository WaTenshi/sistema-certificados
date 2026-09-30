export type WordDataFieldKey =
  | 'curso'
  | 'codigoSence'
  | 'duracion'
  | 'modalidad'
  | 'fechaInicio'
  | 'fechaTermino'
  | 'rut'
  | 'nombre'
  | 'nota'
  | 'asistencia'
  | 'evaluacion'

export interface WordDataFieldStyle {
  fontFamily: string
  bold: boolean
  fontSize: number
}

export type WordDataStyles = Record<WordDataFieldKey, WordDataFieldStyle>

export type WordTableFieldKey = 'rut' | 'nombre' | 'nota' | 'asistencia' | 'evaluacion'

export interface WordTableLayout {
  columnWidths: Partial<Record<WordTableFieldKey, number>>
  dataRowHeight?: number
}

export const wordDataFieldLabels: Record<WordDataFieldKey, string> = {
  curso: 'Curso',
  codigoSence: 'Código SENCE',
  duracion: 'Duración',
  modalidad: 'Modalidad',
  fechaInicio: 'Fecha inicio',
  fechaTermino: 'Fecha término',
  rut: 'RUT',
  nombre: 'Participante',
  nota: 'Nota',
  asistencia: 'Asistencia',
  evaluacion: 'Evaluación',
}

export const wordFontFamilies = [
  'Calibri',
  'Arial',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Courier New',
] as const

export function copyDefaultWordDataStyles(): WordDataStyles {
  return Object.fromEntries(
    Object.keys(wordDataFieldLabels).map((field) => [
      field,
      {
        fontFamily: 'Calibri',
        bold: false,
        fontSize: 10,
      },
    ]),
  ) as WordDataStyles
}

export function copyDefaultWordTableLayout(): WordTableLayout {
  return { columnWidths: {} }
}

