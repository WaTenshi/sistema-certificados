import type { Student } from '../types'

export function studentName(student: Student): string {
  return `${student.nombres} ${student.apellidos}`.trim()
}

export function matchesStudent(student: Student, query: string): boolean {
  const normalizedQuery = query.toLocaleLowerCase('es').trim()
  if (!normalizedQuery) return true

  return (
    studentName(student).toLocaleLowerCase('es').includes(normalizedQuery) ||
    student.rut.toLocaleLowerCase('es').includes(normalizedQuery)
  )
}
