import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { renderFilledWordTemplate } from '../services/word'
import type { Student } from '../types'
import type { WordDataStyles, WordTableFieldKey, WordTableLayout } from '../utils/wordStyles'
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
        fontFamily: layout.fontFamily,
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
  dataStyles,
  includeSenceCode,
  senceCodeOverride,
  evaluationLabel,
  tableLayout,
  onTableLayoutChange,
  current,
  total,
}: {
  student: Student
  template: ArrayBuffer
  dataStyles: WordDataStyles
  includeSenceCode: boolean
  senceCodeOverride: string
  evaluationLabel: string
  tableLayout: WordTableLayout
  onTableLayoutChange: (updater: (current: WordTableLayout) => WordTableLayout) => void
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
    const cleanups: Array<() => void> = []

    void renderFilledWordTemplate(
      container,
      template,
      student,
      dataStyles,
      includeSenceCode,
      senceCodeOverride,
      evaluationLabel,
      tableLayout,
    ).then(() => {
      if (cancelled) return

      const normalize = (value: string) => value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
      const fields = new Set<WordTableFieldKey>(['rut', 'nombre', 'nota', 'asistencia', 'evaluacion'])
      const table = Array.from(container.querySelectorAll<HTMLTableElement>('table')).find((candidate) => {
        const firstRows = Array.from(candidate.rows)
        return firstRows.some((row) => {
          const labels = Array.from(row.cells).map((cell) => normalize(cell.textContent ?? ''))
          return ['rut', 'nombre', 'nota', 'asistencia', 'evaluacion'].every((label) => labels.includes(label))
        })
      })
      if (!table) return

      const rows = Array.from(table.rows)
      const headerIndex = rows.findIndex((row) => {
        const labels = Array.from(row.cells).map((cell) => normalize(cell.textContent ?? ''))
        return ['rut', 'nombre', 'nota', 'asistencia', 'evaluacion'].every((label) => labels.includes(label))
      })
      const headerRow = rows[headerIndex]
      const dataRow = rows[headerIndex + 1]
      if (!headerRow || !dataRow) return

      table.classList.add('word-resizable-table')
      dataRow.classList.add('word-resizable-data-row')
      const headers = Array.from(headerRow.cells).map((cell) => normalize(cell.textContent ?? ''))
      const workingColumnWidths = Array.from(headerRow.cells).map((cell) => cell.offsetWidth)
      const page = table.closest<HTMLElement>('section.docx')
      const pageBounds = page?.getBoundingClientRect()
      const tableBounds = table.getBoundingClientRect()
      const previewScale = page && pageBounds
        ? pageBounds.width / Math.max(page.offsetWidth, 1)
        : tableBounds.width / Math.max(table.offsetWidth, 1)
      const minimumColumnWidth = 45
      const minimumTableWidth = minimumColumnWidth * workingColumnWidths.length
      const availablePageWidth = pageBounds
        ? (pageBounds.right - tableBounds.left) / Math.max(previewScale, 0.01) - 12
        : table.offsetWidth
      const maximumTableWidth = Math.max(minimumTableWidth, Math.floor(availablePageWidth))

      Array.from(dataRow.cells).forEach((cell, index) => {
        const field = headers[index] as WordTableFieldKey
        if (!fields.has(field)) return
        cell.classList.add('word-resizable-cell')

        const horizontalHandle = document.createElement('button')
        horizontalHandle.type = 'button'
        horizontalHandle.className = 'word-cell-resize-handle horizontal'
        horizontalHandle.title = `Cambiar ancho de ${field}`
        horizontalHandle.setAttribute('aria-label', `Cambiar ancho de ${field}`)
        cell.appendChild(horizontalHandle)

        const verticalHandle = document.createElement('button')
        verticalHandle.type = 'button'
        verticalHandle.className = 'word-cell-resize-handle vertical'
        verticalHandle.title = 'Cambiar alto de la fila'
        verticalHandle.setAttribute('aria-label', 'Cambiar alto de la fila')
        cell.appendChild(verticalHandle)

        const startResize = (axis: 'horizontal' | 'vertical', event: globalThis.PointerEvent) => {
          event.preventDefault()
          event.stopPropagation()
          const startX = event.clientX
          const startY = event.clientY
          const startWidth = cell.offsetWidth
          const startHeight = dataRow.offsetHeight
          const bounds = cell.getBoundingClientRect()
          const scale = bounds.width / Math.max(cell.offsetWidth, 1)
          let nextWidth = startWidth
          let nextHeight = startHeight

          const move = (moveEvent: globalThis.PointerEvent) => {
            if (axis === 'horizontal') {
              const otherColumnsWidth = workingColumnWidths.reduce(
                (sum, width, columnIndex) => sum + (columnIndex === index ? 0 : width),
                0,
              )
              const maximumColumnWidth = Math.max(
                minimumColumnWidth,
                maximumTableWidth - otherColumnsWidth,
              )
              nextWidth = Math.min(
                maximumColumnWidth,
                Math.max(minimumColumnWidth, startWidth + (moveEvent.clientX - startX) / scale),
              )
              workingColumnWidths[index] = nextWidth
              ;[headerRow, dataRow].forEach((row) => {
                const target = row.cells[index] as HTMLTableCellElement | undefined
                if (target) {
                  target.style.width = `${nextWidth}px`
                  target.style.minWidth = `${nextWidth}px`
                  target.style.maxWidth = `${nextWidth}px`
                }
              })
              const totalWidth = workingColumnWidths.reduce((sum, width) => sum + width, 0)
              table.style.width = `${totalWidth}px`
              table.style.minWidth = `${totalWidth}px`
            } else {
              nextHeight = Math.min(420, Math.max(28, startHeight + (moveEvent.clientY - startY) / scale))
              dataRow.style.height = `${nextHeight}px`
            }
          }
          const finish = () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', finish)
            window.removeEventListener('pointercancel', finish)
            if (axis === 'horizontal') {
              onTableLayoutChange((current) => ({
                ...current,
                columnWidths: { ...current.columnWidths, [field]: Math.round(nextWidth) },
              }))
            } else {
              onTableLayoutChange((current) => ({ ...current, dataRowHeight: Math.round(nextHeight) }))
            }
          }

          window.addEventListener('pointermove', move)
          window.addEventListener('pointerup', finish)
          window.addEventListener('pointercancel', finish)
          cleanups.push(() => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', finish)
            window.removeEventListener('pointercancel', finish)
          })
        }

        const horizontalListener = (event: globalThis.PointerEvent) => startResize('horizontal', event)
        const verticalListener = (event: globalThis.PointerEvent) => startResize('vertical', event)
        horizontalHandle.addEventListener('pointerdown', horizontalListener)
        verticalHandle.addEventListener('pointerdown', verticalListener)
        cleanups.push(() => {
          horizontalHandle.removeEventListener('pointerdown', horizontalListener)
          verticalHandle.removeEventListener('pointerdown', verticalListener)
        })
      })
    }).catch((error: unknown) => {
      if (!cancelled) {
        setRenderError(error instanceof Error ? error.message : 'No se pudo mostrar la plantilla Word.')
      }
    })

    return () => {
      cancelled = true
      cleanups.forEach((cleanup) => cleanup())
      container.replaceChildren()
    }
  }, [student, template, dataStyles, includeSenceCode, senceCodeOverride, evaluationLabel, tableLayout, onTableLayoutChange])

  return (
    <div className="word-preview-shell">
      {renderError && <div className="word-render-error">{renderError}</div>}
      <div className="word-document-preview" ref={previewRef} />
      <span className="word-resize-help">Arrastra los bordes azules · la tabla se mantiene dentro de la hoja</span>
      <span className="preview-count">Certificado {current} / {total}</span>
    </div>
  )
}
