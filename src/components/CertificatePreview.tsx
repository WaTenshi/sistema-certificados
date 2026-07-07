import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { renderFilledWordTemplate } from '../services/word'
import type { Student } from '../types'
import {
  certificateFieldText,
  formatCertificateFieldText,
  type CertificateFieldKey,
  type CertificateFieldLayout,
  type CertificateLayout,
  type CertificateTextContent,
  fieldLeft,
} from '../utils/certificateLayout'
import { certificateDetail } from '../utils/certificateFields'

const detailFields = new Set<CertificateFieldKey>(['fechaInicio', 'fechaTermino', 'duracion', 'modalidad'])

function CertificateField({
  field,
  student,
  code,
  layout,
  texts,
  selected,
  onSelect,
  onMove,
}: {
  field: CertificateFieldKey
  student: Student
  code: string
  layout: CertificateFieldLayout
  texts: CertificateTextContent
  selected: boolean
  onSelect: (field: CertificateFieldKey, additive: boolean) => void
  onMove: (field: CertificateFieldKey, deltaX: number, deltaY: number) => void
}) {
  const dragRef = useRef<{
    clientX: number
    clientY: number
  } | null>(null)
  const detail = detailFields.has(field) ? certificateDetail(student, field as Parameters<typeof certificateDetail>[1]) : null
  const text = formatCertificateFieldText(certificateFieldText(field, student, code, texts), layout)

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
    }
    const additive = event.ctrlKey || event.shiftKey || event.metaKey
    if (additive || !selected) onSelect(field, additive)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return

    const certificate = event.currentTarget.closest('.certificate')
    const bounds = certificate?.getBoundingClientRect()
    const scale = bounds ? bounds.width / 900 : 1
    const deltaX = (event.clientX - dragRef.current.clientX) / scale
    const deltaY = (event.clientY - dragRef.current.clientY) / scale
    dragRef.current.clientX = event.clientX
    dragRef.current.clientY = event.clientY

    onMove(field, deltaX, deltaY)
  }

  function handlePointerEnd() {
    dragRef.current = null
  }

  return (
    <div
      className={`certificate-field ${selected ? 'selected' : ''}`}
      style={{
        top: layout.y,
        left: fieldLeft(layout),
        width: layout.width,
        color: layout.color,
        fontSize: layout.fontSize,
        fontWeight: layout.weight,
        fontStyle: layout.fontStyle,
        lineHeight: layout.lineHeight,
        textAlign: layout.align,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {detail ? (
        <>
          <strong>{detail.label.toUpperCase()}:</strong>
          {detail.value && ` ${detail.value.toUpperCase()}`}
        </>
      ) : text}
    </div>
  )
}

export function ImageCertificatePreview({
  student,
  templateUrl,
  code,
  layout,
  texts,
  selectedField,
  onSelectField,
  onFieldMove,
}: {
  student: Student
  templateUrl: string
  code: string
  layout: CertificateLayout
  texts: CertificateTextContent
  selectedField: CertificateFieldKey[]
  onSelectField: (field: CertificateFieldKey, additive: boolean) => void
  onFieldMove: (field: CertificateFieldKey, deltaX: number, deltaY: number) => void
}) {
  return (
    <div className="certificate">
      <img className="template-bg" src={templateUrl} alt="" />
      {Object.entries(layout).filter(([, fieldLayout]) => fieldLayout.visible !== false).map(([field, fieldLayout]) => (
        <CertificateField
          key={field}
          field={field as CertificateFieldKey}
          student={student}
          code={code}
          layout={fieldLayout}
          texts={texts}
          selected={selectedField.includes(field as CertificateFieldKey)}
          onSelect={onSelectField}
          onMove={onFieldMove}
        />
      ))}
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
