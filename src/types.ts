export type TemplateMode = 'png' | 'word'

export interface Student {
  registro?: string
  nombres: string
  apellidos: string
  rut: string
  empresa?: string
  cargo?: string
  escolaridad?: string
  telefono?: string
  correo?: string
  nota?: string
  asistencia?: string
  evaluacion?: string
  curso: string
  duracion: string
  fechaInicio: string
  fechaTermino: string
  modalidad: string
}

export interface IncompleteRecord {
  hoja: string
  filaExcel: number
  nombres: string
  apellidos: string
  rut: string
  faltantes: string[]
}

export interface PngWorkbook {
  studentsBySheet: Record<string, Student[]>
  sheetNames: string[]
  incompleteRecords: IncompleteRecord[]
}

export interface ProgressState {
  open: boolean
  title: string
  processed: number
  total: number
  currentName: string
}

export type FeedbackTone = 'info' | 'success' | 'error'

export interface Feedback {
  tone: FeedbackTone
  text: string
}

export interface IndexedStudent {
  student: Student
  index: number
}
