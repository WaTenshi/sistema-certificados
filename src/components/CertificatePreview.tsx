import { useEffect, useRef, useState } from 'react'
import { renderFilledWordTemplate } from '../services/word'
import type { Student } from '../types'
import { studentName } from '../utils/students'

export function ImageCertificatePreview({
  student,
  templateUrl,
  code,
}: {
  student: Student
  templateUrl: string
  code: string
}) {
  return (
    <div className="certificate">
      <img className="template-bg" src={templateUrl} alt="" />
      <div className="registro">{code}</div>
      <div className="nombre">{studentName(student).toUpperCase()}</div>
      <div className="rut">{student.rut}</div>
      <div className="curso">{student.curso.toUpperCase()}</div>
      <div className="fecha-inicio">{student.fechaInicio.toUpperCase()}</div>
      <div className="fecha-termino">{student.fechaTermino.toUpperCase()}</div>
      <div className="duracion">{student.duracion.toUpperCase()}</div>
      <div className="modalidad">{student.modalidad.toUpperCase()}</div>
    </div>
  )
}

export function WordCertificatePreview({
  student,
  template,
  current,
  total,
}: {
  student: Student
  template: ArrayBuffer
  current: number
  total: number
}) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [renderError, setRenderError] = useState('')

  useEffect(() => {
    const container = previewRef.current
    if (!container) return
    let cancelled = false

    setRenderError('')
    void renderFilledWordTemplate(container, template, student).catch((error: unknown) => {
      if (!cancelled) {
        setRenderError(error instanceof Error ? error.message : 'No se pudo mostrar la plantilla Word.')
      }
    })

    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [student, template])

  return (
    <div className="word-preview-shell">
      {renderError && <div className="word-render-error">{renderError}</div>}
      <div className="word-document-preview" ref={previewRef} />
      <span className="preview-count">Certificado {current} / {total}</span>
    </div>
  )
}
