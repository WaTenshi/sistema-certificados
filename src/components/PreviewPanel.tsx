import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Student, TemplateMode } from '../types'
import { studentName } from '../utils/students'
import { ImageCertificatePreview, WordCertificatePreview } from './CertificatePreview'
import { Icon } from './Icon'

function FittedPreview({
  width,
  height,
  zoom,
  children,
}: {
  width: number
  height: number
  zoom: number
  children: ReactNode
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const resize = () => {
      const availableWidth = Math.max(host.clientWidth - 48, 1)
      const availableHeight = Math.max(host.clientHeight - 48, 1)
      setFitScale(Math.min(availableWidth / width, availableHeight / height, 1))
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    return () => observer.disconnect()
  }, [height, width])

  const scale = fitScale * zoom

  return (
    <div className="preview-fit-host" ref={hostRef}>
      <div
        className="preview-fit-frame"
        style={{ width: width * scale, height: height * scale }}
      >
        <div
          className="preview-fit-content"
          style={{ width, height, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function PreviewPanel({
  mode,
  student,
  selectedIndex,
  total,
  templateUrl,
  wordTemplate,
  certificateCode,
  busy,
  onDownloadCurrent,
  onDownloadAll,
}: {
  mode: TemplateMode
  student: Student | null
  selectedIndex: number
  total: number
  templateUrl: string
  wordTemplate: ArrayBuffer | null
  certificateCode: string
  busy: boolean
  onDownloadCurrent: () => void
  onDownloadAll: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const zoomPercentage = Math.round(zoom * 100)

  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <div>
          <span className="eyebrow">Vista previa</span>
          <h2>{student ? studentName(student) : 'Certificado'}</h2>
          <p>{student ? `${student.rut} · ${student.curso || 'Curso sin nombre'}` : 'Selecciona un participante para revisar su certificado.'}</p>
        </div>
        <div className="preview-actions">
          <div className="zoom-controls" aria-label="Zoom de previsualización">
            <button
              aria-label="Alejar"
              disabled={!student || zoom <= 0.6}
              onClick={() => setZoom((current) => Math.max(0.6, current - 0.2))}
            >
              <Icon name="zoomOut" />
            </button>
            <button
              className="zoom-value"
              disabled={!student}
              onClick={() => setZoom(1)}
              title="Restablecer zoom"
            >
              {zoomPercentage}%
            </button>
            <button
              aria-label="Acercar"
              disabled={!student || zoom >= 2.4}
              onClick={() => setZoom((current) => Math.min(2.4, current + 0.2))}
            >
              <Icon name="zoomIn" />
            </button>
          </div>
          <button className="secondary-action" disabled={!student || busy} onClick={onDownloadCurrent}>
            <Icon name="download" />
            PDF actual
          </button>
          <button className="primary-action compact" disabled={!total || busy} onClick={onDownloadAll}>
            <Icon name="download" />
            Descargar todos
          </button>
        </div>
      </div>

      <div className={`preview-canvas ${mode}`}>
        {!student && (
          <div className="preview-placeholder">
            <span><Icon name="certificate" /></span>
            <strong>Tu vista previa aparecerá aquí</strong>
            <p>Completa la plantilla y el Excel para comenzar a revisar los certificados.</p>
          </div>
        )}
        {student && mode === 'png' && templateUrl && (
          <FittedPreview width={900} height={630} zoom={zoom}>
            <ImageCertificatePreview
              student={student}
              templateUrl={templateUrl}
              code={certificateCode}
            />
          </FittedPreview>
        )}
        {student && mode === 'word' && wordTemplate && (
          <FittedPreview width={816} height={1056} zoom={zoom}>
            <WordCertificatePreview
              student={student}
              template={wordTemplate}
              current={selectedIndex + 1}
              total={total}
            />
          </FittedPreview>
        )}
      </div>

      {student && (
        <div className="student-summary">
          <div><span>Participante</span><strong>{studentName(student)}</strong></div>
          <div><span>RUT</span><strong>{student.rut || 'Sin información'}</strong></div>
          <div><span>Duración</span><strong>{student.duracion || 'Sin información'}</strong></div>
          <div><span>Modalidad</span><strong>{student.modalidad || 'Sin información'}</strong></div>
        </div>
      )}
    </section>
  )
}
