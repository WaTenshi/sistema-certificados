import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { Student, TemplateMode } from '../types'
import {
  certificateFieldLabels,
  certificateFontFamilies,
  clampLayout,
  copyDefaultCertificateLayout,
  type CertificateFieldKey,
  type CertificateFieldLayout,
  type CertificateLayout,
  type CertificateTextContent,
  type CertificateTextFieldKey,
} from '../utils/certificateLayout'
import { studentName } from '../utils/students'
import {
  copyDefaultWordDataStyles,
  wordDataFieldLabels,
  wordFontFamilies,
  type WordDataFieldKey,
  type WordDataStyles,
} from '../utils/wordStyles'
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
      const availableWidth = Math.max(host.clientWidth - 24, 1)
      const availableHeight = Math.max(host.clientHeight - 24, 1)
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

const editableFields = Object.keys(certificateFieldLabels) as CertificateFieldKey[]
const textEditableFields = new Set<CertificateFieldKey>(['introText', 'senceLegend'])

function isTextField(field: CertificateFieldKey): field is CertificateTextFieldKey {
  return textEditableFields.has(field)
}

function LayoutNumberInput({
  label,
  value,
  min,
  max,
  disabled = false,
  onChange,
}: {
  label: string
  value: number | ''
  min: number
  max: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className="layout-number-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step="1"
        value={typeof value === 'number' ? Math.round(value) : ''}
        placeholder={typeof value === 'number' ? undefined : 'Varios'}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value === '') return
          onChange(Number(event.target.value))
        }}
      />
    </label>
  )
}

function LayoutEditor({
  selectedFields,
  layout,
  texts,
  busy,
  onSelectField,
  onToggleField,
  onUpdateField,
  onUpdateSelected,
  onTextChange,
  onMoveSelected,
  onResetSelected,
  onResetAll,
  onToggleSenceLegend,
}: {
  selectedFields: CertificateFieldKey[]
  layout: CertificateLayout
  texts: CertificateTextContent
  busy: boolean
  onSelectField: (field: CertificateFieldKey) => void
  onToggleField: (field: CertificateFieldKey) => void
  onUpdateField: (field: CertificateFieldKey, patch: Partial<CertificateFieldLayout>) => void
  onUpdateSelected: (patch: Partial<CertificateFieldLayout>) => void
  onTextChange: (field: CertificateTextFieldKey, value: string) => void
  onMoveSelected: (deltaX: number, deltaY: number) => void
  onResetSelected: () => void
  onResetAll: () => void
  onToggleSenceLegend: () => void
}) {
  const activeField = selectedFields.at(-1) ?? 'curso'
  const selectedCount = selectedFields.length
  const multipleSelected = selectedCount > 1
  const fieldLayout = layout[activeField]
  const availableFields = editableFields.filter((field) => layout[field].visible !== false)
  const senceLegendVisible = layout.senceLegend.visible !== false

  function sharedValue<K extends 'fontSize' | 'width' | 'fontFamily' | 'weight'>(key: K): CertificateFieldLayout[K] | '' {
    const firstValue = layout[selectedFields[0] ?? activeField][key]
    return selectedFields.every((field) => layout[field][key] === firstValue) ? firstValue : ''
  }

  function updateSinglePosition(patch: Partial<CertificateFieldLayout>) {
    onUpdateField(activeField, patch)
  }

  function updateSelectedMetric(patch: Partial<CertificateFieldLayout>) {
    onUpdateSelected(patch)
  }

  const fontSizeValue = sharedValue('fontSize')
  const widthValue = sharedValue('width')
  const fontFamilyValue = sharedValue('fontFamily')
  const weightValue = sharedValue('weight')
  const allSelectedBold = weightValue === 'bold'

  function move(deltaX: number, deltaY: number) {
    onMoveSelected(deltaX, deltaY)
  }

  function toggleBold() {
    updateSelectedMetric({ weight: allSelectedBold ? 'normal' : 'bold' })
  }

  return (
    <div className="layout-editor">
      <label className="layout-select-field">
        <span>Campo activo</span>
        <select
          value={activeField}
          disabled={busy}
          onChange={(event) => onSelectField(event.target.value as CertificateFieldKey)}
        >
          {availableFields.map((field) => (
            <option key={field} value={field}>{certificateFieldLabels[field]}</option>
          ))}
        </select>
      </label>

      <div className="layout-multi-select" aria-label="Campos seleccionados">
        {availableFields.map((field) => (
          <label key={field} className={selectedFields.includes(field) ? 'checked' : ''}>
            <input
              type="checkbox"
              checked={selectedFields.includes(field)}
              disabled={busy}
              onChange={() => onToggleField(field)}
            />
            <span>{certificateFieldLabels[field]}</span>
          </label>
        ))}
      </div>

      {isTextField(activeField) && (
        <label className="layout-text-field">
          <span>Texto</span>
          <textarea
            value={texts[activeField]}
            disabled={busy}
            rows={activeField === 'senceLegend' ? 3 : 2}
            onChange={(event) => onTextChange(activeField, event.target.value)}
          />
        </label>
      )}

      <div className="layout-tool-row">
        <div className="layout-tool-group compact">
          <span className="layout-group-label">Mover</span>
          <div className="layout-nudge" aria-label="Mover campo">
            <button type="button" disabled={busy} title="Mover arriba" onClick={() => move(0, -1)}>
              <Icon name="chevronUp" />
            </button>
            <button type="button" disabled={busy} title="Mover izquierda" onClick={() => move(-1, 0)}>
              <Icon name="chevronLeft" />
            </button>
            <button type="button" disabled={busy} title="Mover derecha" onClick={() => move(1, 0)}>
              <Icon name="chevronRight" />
            </button>
            <button type="button" disabled={busy} title="Mover abajo" onClick={() => move(0, 1)}>
              <Icon name="chevronDown" />
            </button>
          </div>
        </div>

        <div className="layout-tool-group">
          <span className="layout-group-label">Medidas</span>
          <div className="layout-metrics">
            <LayoutNumberInput
              label="X"
              min={0}
              max={900}
              value={fieldLayout.x}
              disabled={multipleSelected}
              onChange={(value) => updateSinglePosition({ x: value })}
            />
            <LayoutNumberInput
              label="Y"
              min={0}
              max={630}
              value={fieldLayout.y}
              disabled={multipleSelected}
              onChange={(value) => updateSinglePosition({ y: value })}
            />
            <LayoutNumberInput
              label="Tamaño"
              min={6}
              max={72}
              value={fontSizeValue}
              onChange={(value) => updateSelectedMetric({ fontSize: value })}
            />
            <LayoutNumberInput
              label="Ancho"
              min={40}
              max={900}
              value={widthValue}
              onChange={(value) => updateSelectedMetric({ width: value })}
            />
          </div>
        </div>

        <div className="layout-tool-group">
          <span className="layout-group-label">Texto</span>
          <div className="layout-typography">
            <label className="layout-font-field">
              <span>Fuente</span>
              <select
                value={fontFamilyValue || ''}
                disabled={busy}
                onChange={(event) => updateSelectedMetric({ fontFamily: event.target.value })}
              >
                {fontFamilyValue === '' && <option value="">Varias</option>}
                {certificateFontFamilies.map((fontFamily) => (
                  <option key={fontFamily} value={fontFamily}>{fontFamily}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`layout-format-button ${allSelectedBold ? 'active' : ''}`}
              disabled={busy}
              title={allSelectedBold ? 'Quitar negrita' : 'Aplicar negrita'}
              aria-pressed={allSelectedBold}
              onClick={toggleBold}
            >
              B
            </button>
          </div>
        </div>

        <div className="layout-tool-group actions">
          <span className="layout-group-label">{selectedCount} seleccionado{selectedCount === 1 ? '' : 's'}</span>
          <div className="layout-reset-actions">
            <button type="button" disabled={busy} onClick={onToggleSenceLegend}>
              {senceLegendVisible ? 'Quitar leyenda SENCE' : 'Añadir leyenda SENCE'}
            </button>
            <button type="button" disabled={busy} onClick={onResetSelected}>
              Restablecer selección
            </button>
            <button type="button" disabled={busy} onClick={onResetAll}>
              Restablecer todo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const wordDataFields = Object.keys(wordDataFieldLabels) as WordDataFieldKey[]

function WordStyleEditor({
  selectedField,
  styles,
  senceCodeEnabled,
  senceCodeManual,
  evaluationLabel,
  busy,
  onSelectField,
  onChange,
  onSenceCodeChange,
  onSenceCodeManualChange,
  onEvaluationLabelChange,
  onReset,
}: {
  selectedField: WordDataFieldKey
  styles: WordDataStyles
  senceCodeEnabled: boolean
  senceCodeManual: string
  evaluationLabel: string
  busy: boolean
  onSelectField: (field: WordDataFieldKey) => void
  onChange: Dispatch<SetStateAction<WordDataStyles>>
  onSenceCodeChange: (enabled: boolean) => void
  onSenceCodeManualChange: (value: string) => void
  onEvaluationLabelChange: (value: string) => void
  onReset: () => void
}) {
  const activeStyle = styles[selectedField]

  function patchActiveStyle(patch: Partial<WordDataStyles[WordDataFieldKey]>) {
    onChange((current) => ({
      ...current,
      [selectedField]: {
        ...current[selectedField],
        ...patch,
      },
    }))
  }

  return (
    <div className="word-style-editor">
      <label className="layout-select-field">
        <span>Dato</span>
        <select
          value={selectedField}
          disabled={busy}
          onChange={(event) => onSelectField(event.target.value as WordDataFieldKey)}
        >
          {wordDataFields.map((field) => (
            <option key={field} value={field}>{wordDataFieldLabels[field]}</option>
          ))}
        </select>
      </label>
      <label className="layout-font-field">
        <span>Fuente</span>
        <select
          value={activeStyle.fontFamily}
          disabled={busy}
          onChange={(event) => patchActiveStyle({ fontFamily: event.target.value })}
        >
          {wordFontFamilies.map((fontFamily) => (
            <option key={fontFamily} value={fontFamily}>{fontFamily}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={`layout-format-button ${activeStyle.bold ? 'active' : ''}`}
        disabled={busy}
        title={activeStyle.bold ? 'Quitar negrita' : 'Aplicar negrita'}
        aria-pressed={activeStyle.bold}
        onClick={() => patchActiveStyle({ bold: !activeStyle.bold })}
      >
        B
      </button>
      <label className={`word-sence-toggle ${senceCodeEnabled ? 'checked' : ''}`}>
        <input
          type="checkbox"
          checked={senceCodeEnabled}
          disabled={busy}
          onChange={(event) => onSenceCodeChange(event.target.checked)}
        />
        <span>
          <strong>Código SENCE</strong>
          <small>Mostrar debajo del nombre del curso</small>
        </span>
      </label>
      <button type="button" className="word-style-reset" disabled={busy} onClick={onReset}>
        Restablecer estilos
      </button>
      <label className="word-evaluation-label-field">
        <span>Título de evaluación</span>
        <input
          type="text"
          value={evaluationLabel}
          disabled={busy}
          placeholder="Evaluación"
          onChange={(event) => onEvaluationLabelChange(event.target.value)}
        />
        <small>Solo cambia el encabezado; el resultado seguirá viniendo desde el Excel.</small>
      </label>
      <label className="word-sence-manual-field">
        <span>Código SENCE para todos</span>
        <input
          type="text"
          value={senceCodeManual}
          disabled={busy || !senceCodeEnabled}
          placeholder="Ej: 1234567890"
          onChange={(event) => onSenceCodeManualChange(event.target.value)}
        />
        <small>Si queda vacío, se usará el valor encontrado en el Excel.</small>
      </label>
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
  certificateLayout,
  certificateTexts,
  wordDataStyles,
  wordSenceCodeEnabled,
  wordSenceCodeManual,
  wordEvaluationLabel,
  busy,
  onLayoutChange,
  onTextChange,
  onWordDataStylesChange,
  onWordSenceCodeChange,
  onWordSenceCodeManualChange,
  onWordEvaluationLabelChange,
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
  certificateLayout: CertificateLayout
  certificateTexts: CertificateTextContent
  wordDataStyles: WordDataStyles
  wordSenceCodeEnabled: boolean
  wordSenceCodeManual: string
  wordEvaluationLabel: string
  busy: boolean
  onLayoutChange: Dispatch<SetStateAction<CertificateLayout>>
  onTextChange: Dispatch<SetStateAction<CertificateTextContent>>
  onWordDataStylesChange: Dispatch<SetStateAction<WordDataStyles>>
  onWordSenceCodeChange: (enabled: boolean) => void
  onWordSenceCodeManualChange: (value: string) => void
  onWordEvaluationLabelChange: (value: string) => void
  onDownloadCurrent: () => void
  onDownloadAll: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const [selectedFields, setSelectedFields] = useState<CertificateFieldKey[]>(['curso'])
  const [selectedWordField, setSelectedWordField] = useState<WordDataFieldKey>('nombre')
  const zoomPercentage = Math.round(zoom * 100)

  function selectField(field: CertificateFieldKey, additive = false) {
    setSelectedFields((current) => {
      if (!additive) return [field]
      if (current.includes(field)) {
        const next = current.filter((item) => item !== field)
        return next.length ? next : [field]
      }
      return [...current, field]
    })
  }

  function toggleField(field: CertificateFieldKey) {
    selectField(field, true)
  }

  function updateCertificateText(field: CertificateTextFieldKey, value: string) {
    onTextChange((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function patchField(field: CertificateFieldKey, patch: Partial<CertificateFieldLayout>) {
    onLayoutChange((current) => ({
      ...current,
      [field]: clampLayout({ ...current[field], ...patch }),
    }))
  }

  function patchSelectedFields(patch: Partial<CertificateFieldLayout>) {
    onLayoutChange((current) => {
      const next = { ...current }
      selectedFields.forEach((field) => {
        next[field] = clampLayout({ ...current[field], ...patch })
      })
      return next
    })
  }

  function moveSelectedFields(deltaX: number, deltaY: number, draggedField?: CertificateFieldKey) {
    onLayoutChange((current) => {
      const fields = draggedField && !selectedFields.includes(draggedField) ? [draggedField] : selectedFields
      const next = { ...current }
      fields.forEach((field) => {
        next[field] = clampLayout({
          ...current[field],
          x: current[field].x + deltaX,
          y: current[field].y + deltaY,
        })
      })
      return next
    })
  }

  function resetSelectedFields() {
    const defaults = copyDefaultCertificateLayout()
    onLayoutChange((current) => {
      const next = { ...current }
      selectedFields.forEach((field) => {
        next[field] = { ...defaults[field] }
      })
      return next
    })
  }

  function toggleSenceLegend() {
    onLayoutChange((current) => {
      const nextVisible = current.senceLegend.visible === false
      return {
        ...current,
        senceLegend: {
          ...current.senceLegend,
          visible: nextVisible,
        },
      }
    })

    if (certificateLayout.senceLegend.visible === false) {
      setSelectedFields(['senceLegend'])
    } else {
      setSelectedFields((current) => {
        const next = current.filter((field) => field !== 'senceLegend')
        return next.length ? next : ['curso']
      })
    }
  }

  function resetAllLayout() {
    onLayoutChange(copyDefaultCertificateLayout())
    setSelectedFields(['curso'])
  }

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
              layout={certificateLayout}
              texts={certificateTexts}
              selectedField={selectedFields}
              onSelectField={selectField}
              onFieldMove={(field, deltaX, deltaY) => moveSelectedFields(deltaX, deltaY, field)}
            />
          </FittedPreview>
        )}
        {student && mode === 'word' && wordTemplate && (
          <FittedPreview width={816} height={1056} zoom={zoom}>
            <WordCertificatePreview
              student={student}
              template={wordTemplate}
              dataStyles={wordDataStyles}
              includeSenceCode={wordSenceCodeEnabled}
              senceCodeOverride={wordSenceCodeManual}
              evaluationLabel={wordEvaluationLabel}
              current={selectedIndex + 1}
              total={total}
            />
          </FittedPreview>
        )}
      </div>

      {student && mode === 'png' && (
        <LayoutEditor
          selectedFields={selectedFields}
          layout={certificateLayout}
          texts={certificateTexts}
          busy={busy}
          onSelectField={(field) => selectField(field)}
          onToggleField={toggleField}
          onUpdateField={patchField}
          onUpdateSelected={patchSelectedFields}
          onTextChange={updateCertificateText}
          onMoveSelected={(deltaX, deltaY) => moveSelectedFields(deltaX, deltaY)}
          onResetSelected={resetSelectedFields}
          onResetAll={resetAllLayout}
          onToggleSenceLegend={toggleSenceLegend}
        />
      )}

      {student && mode === 'word' && (
        <WordStyleEditor
          selectedField={selectedWordField}
          styles={wordDataStyles}
          senceCodeEnabled={wordSenceCodeEnabled}
          senceCodeManual={wordSenceCodeManual}
          evaluationLabel={wordEvaluationLabel}
          busy={busy}
          onSelectField={setSelectedWordField}
          onChange={onWordDataStylesChange}
          onSenceCodeChange={onWordSenceCodeChange}
          onSenceCodeManualChange={onWordSenceCodeManualChange}
          onEvaluationLabelChange={onWordEvaluationLabelChange}
          onReset={() => onWordDataStylesChange(copyDefaultWordDataStyles())}
        />
      )}

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
