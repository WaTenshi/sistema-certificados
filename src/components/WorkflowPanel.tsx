import type { TemplateMode } from '../types'
import { FileDropField } from './FileDropField'
import { Icon } from './Icon'

function Step({
  number,
  title,
  description,
  complete,
  active,
}: {
  number: number
  title: string
  description: string
  complete: boolean
  active: boolean
}) {
  return (
    <div className={`workflow-step ${complete ? 'complete' : ''} ${active ? 'active' : ''}`}>
      <span className="step-number">{complete ? <Icon name="check" /> : number}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </div>
  )
}

export function WorkflowPanel({
  collapsed,
  mode,
  templateFileName,
  wordTemplateName,
  excelFile,
  prefix,
  hasTemplate,
  hasStudents,
  readyToProcess,
  busy,
  onModeChange,
  onPngTemplate,
  onWordTemplate,
  onExcel,
  onPrefixChange,
  onProcess,
  onToggle,
}: {
  collapsed: boolean
  mode: TemplateMode
  templateFileName: string
  wordTemplateName: string
  excelFile: File | null
  prefix: string
  hasTemplate: boolean
  hasStudents: boolean
  readyToProcess: boolean
  busy: boolean
  onModeChange: (mode: TemplateMode) => void
  onPngTemplate: (file?: File) => void
  onWordTemplate: (file?: File) => void
  onExcel: (file: File | null) => void
  onPrefixChange: (value: string) => void
  onProcess: () => void
  onToggle: () => void
}) {
  const currentTemplateName = mode === 'png' ? templateFileName : wordTemplateName

  return (
    <section
      className={`workflow-panel ${collapsed ? 'collapsed' : ''}`}
      aria-labelledby="workflow-title"
    >
      {collapsed ? (
        <div className="workflow-summary">
          <div className="workflow-summary-title">
            <span className="summary-icon"><Icon name="upload" /></span>
            <div>
              <strong>Archivos y configuración</strong>
              <small>Todo listo para generar certificados</small>
            </div>
          </div>
          <div className="workflow-summary-files">
            <span><Icon name={mode === 'png' ? 'image' : 'word'} /> {currentTemplateName}</span>
            <span><Icon name="spreadsheet" /> {excelFile?.name}</span>
          </div>
          <button className="secondary-action workflow-toggle" onClick={onToggle}>
            Editar archivos
            <Icon name="chevronDown" />
          </button>
        </div>
      ) : (
        <>
      <div className="workflow-heading">
        <div>
          <span className="eyebrow">Preparación</span>
          <h2 id="workflow-title">Configura tu generación</h2>
          <p>Completa los archivos en orden. Tus documentos se procesan localmente en este navegador.</p>
        </div>
        <div className="mode-switch" aria-label="Tipo de plantilla">
          <button className={mode === 'png' ? 'active' : ''} onClick={() => onModeChange('png')}>
            <Icon name="image" /> Imagen
          </button>
          <button className={mode === 'word' ? 'active' : ''} onClick={() => onModeChange('word')}>
            <Icon name="word" /> Word
          </button>
        </div>
        <button
          className="collapse-workflow-button"
          onClick={onToggle}
          aria-label="Contraer configuración de archivos"
          title="Contraer configuración"
        >
          <Icon name="chevronDown" />
        </button>
      </div>

      <div className="workflow-steps">
        <Step
          number={1}
          title="Plantilla"
          description={hasTemplate ? 'Lista' : 'Carga el diseño'}
          complete={hasTemplate}
          active={!hasTemplate}
        />
        <span className="step-line" />
        <Step
          number={2}
          title="Datos"
          description={excelFile ? 'Excel seleccionado' : 'Selecciona el Excel'}
          complete={Boolean(excelFile)}
          active={hasTemplate && !excelFile}
        />
        <span className="step-line" />
        <Step
          number={3}
          title="Revisión"
          description={hasStudents ? 'Certificados listos' : 'Procesa y revisa'}
          complete={hasStudents}
          active={readyToProcess && !hasStudents}
        />
      </div>

      <div className="configuration-grid">
        <div className="configuration-block">
          <div className="block-label">
            <span>1</span>
            <div><strong>Plantilla del certificado</strong><small>Define el formato visual de salida</small></div>
          </div>
          {mode === 'png' ? (
            <>
              <FileDropField
                accept=".png,.jpg,.jpeg"
                fileName={templateFileName}
                hint="PNG o JPG, preferentemente en alta resolución"
                icon="image"
                label="Arrastra tu plantilla de imagen"
                onFile={onPngTemplate}
              />
              <label className="text-field">
                <span>Prefijo de registro <small>Opcional</small></span>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Ejemplo: CBA"
                  value={prefix}
                  onChange={(event) => onPrefixChange(event.target.value)}
                />
              </label>
            </>
          ) : (
            <FileDropField
              accept=".docx"
              fileName={wordTemplateName}
              hint="Documento DOCX con la estructura del certificado"
              icon="word"
              label="Arrastra tu plantilla Word"
              onFile={onWordTemplate}
            />
          )}
        </div>

        <div className="configuration-block">
          <div className="block-label">
            <span>2</span>
            <div><strong>Base de participantes</strong><small>Importa nombres, RUT y datos del curso</small></div>
          </div>
          <FileDropField
            accept=".xlsx,.xls,.csv"
            fileName={excelFile?.name || ''}
            hint="Archivos XLSX, XLS o CSV"
            icon="spreadsheet"
            label="Arrastra el archivo Excel"
            onFile={(file) => onExcel(file ?? null)}
          />
          <button
            className="primary-action"
            disabled={!readyToProcess || busy}
            onClick={onProcess}
          >
            <Icon name={busy ? 'refresh' : 'sparkles'} className={busy ? 'spinning' : ''} />
            {busy ? 'Procesando datos...' : hasStudents ? 'Volver a procesar Excel' : 'Procesar participantes'}
          </button>
        </div>
      </div>
        </>
      )}
    </section>
  )
}
