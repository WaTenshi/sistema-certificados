export type WordDataFieldKey =
  | 'curso'
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
}

export type WordDataStyles = Record<WordDataFieldKey, WordDataFieldStyle>

export const wordDataFieldLabels: Record<WordDataFieldKey, string> = {
  curso: 'Curso',
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
      },
    ]),
  ) as WordDataStyles
}
