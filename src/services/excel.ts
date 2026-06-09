import * as XLSX from 'xlsx'
import type { IncompleteRecord, PngWorkbook, Student } from '../types'

type RawRow = unknown[]

function text(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  return file.arrayBuffer().then((buffer) => XLSX.read(buffer, { type: 'array' }))
}

export async function parsePngWorkbook(file: File): Promise<PngWorkbook> {
  const workbook = await readWorkbook(file)
  const studentsBySheet: Record<string, Student[]> = {}
  const sheetNames: string[] = []
  const incompleteRecords: IncompleteRecord[] = []

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { header: 1, defval: '' })
    let firstStudentRow = 0

    for (let index = 0; index < Math.min(30, rows.length); index += 1) {
      const row = rows[index]
      const rut = text(row?.[3])
      if (row?.[1] && row?.[2] && rut && (rut.includes('.') || rut.includes('-'))) {
        firstStudentRow = index
        break
      }
    }

    rows.slice(firstStudentRow).forEach((row, relativeIndex) => {
      if (!row?.[1] && !row?.[2] && !row?.[3]) return

      const missing: string[] = []
      if (!row[1]) missing.push('Nombres')
      if (!row[2]) missing.push('Apellidos')
      if (!row[3]) missing.push('RUT')

      if (missing.length) {
        incompleteRecords.push({
          hoja: sheetName,
          filaExcel: firstStudentRow + relativeIndex + 1,
          nombres: text(row[1]) || '—',
          apellidos: text(row[2]) || '—',
          rut: text(row[3]) || '—',
          faltantes: missing,
        })
      }
    })

    const students = rows
      .slice(firstStudentRow)
      .filter((row) => row?.[1] && row?.[2] && row?.[3])
      .map<Student>((row) => ({
        registro: text(row[0]),
        nombres: text(row[1]),
        apellidos: text(row[2]),
        rut: text(row[3]),
        empresa: text(row[4]),
        cargo: text(row[5]),
        escolaridad: text(row[6]),
        telefono: text(row[7]),
        correo: text(row[8]),
        curso: text(rows[2]?.[2]),
        duracion: text(rows[3]?.[2]),
        fechaInicio: text(rows[5]?.[2]),
        fechaTermino: text(rows[6]?.[2]),
        modalidad: text(rows[7]?.[2]),
      }))

    if (students.length) {
      studentsBySheet[sheetName] = students
      sheetNames.push(sheetName)
    }
  })

  return { studentsBySheet, sheetNames, incompleteRecords }
}

export async function parseWordWorkbook(file: File): Promise<Student[]> {
  const workbook = await readWorkbook(file)
  const students: Student[] = []
  const processed = new Set<string>()

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { header: 1, defval: '' })
    let curso = ''
    let duracion = ''
    let fechaInicio = ''
    let fechaTermino = ''
    let modalidad = ''

    for (let index = 0; index < Math.min(20, rows.length); index += 1) {
      const label = text(rows[index]?.[1]).toLowerCase()
      const value = text(rows[index]?.[2])
      if (label.includes('curso')) curso = value
      else if (label.includes('duraci')) duracion = value
      else if (label.includes('inicio')) fechaInicio = value
      else if (label.includes('termino') || label.includes('término')) fechaTermino = value
      else if (label.includes('modalidad')) modalidad = value
    }

    let firstStudentRow = rows.findIndex((row) => {
      const rowText = row.map((cell) => text(cell).toLowerCase()).join('|')
      return rowText.includes('nombres') && rowText.includes('apellidos') && rowText.includes('rut')
    })
    firstStudentRow = firstStudentRow >= 0 ? firstStudentRow + 1 : -1

    if (firstStudentRow < 0) {
      firstStudentRow = rows.findIndex((row) => {
        const rut = text(row?.[3])
        return Boolean(row?.[1] && row?.[2] && (rut.includes('.') || rut.includes('-')))
      })
    }
    if (firstStudentRow < 0) return

    rows.slice(firstStudentRow).forEach((row) => {
      const nombres = text(row[1])
      const apellidos = text(row[2])
      const rut = text(row[3])
      if (!nombres || !apellidos || !rut) return

      const key = `${nombres}${apellidos}${rut}`.toLowerCase()
      if (processed.has(key)) return
      processed.add(key)

      students.push({
        nombres,
        apellidos,
        rut,
        nota: text(row[4]),
        correo: text(row[5]),
        curso,
        duracion,
        fechaInicio,
        fechaTermino,
        modalidad,
      })
    })
  })

  return students
}
