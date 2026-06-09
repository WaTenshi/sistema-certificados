import type { IncompleteRecord, ProgressState } from '../types'
import { Icon } from './Icon'

export function WarningDialog({
  records,
  onContinue,
  onClose,
}: {
  records: IncompleteRecord[]
  onContinue: () => void
  onClose: () => void
}) {
  const sheetCount = new Set(records.map((record) => record.hoja)).size

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="warning-title">
      <div className="modal warning-modal">
        <header className="modal-header warning">
          <span className="modal-header-icon"><Icon name="spreadsheet" /></span>
          <div>
            <h2 id="warning-title">Hay datos que necesitan revisión</h2>
            <p>Los registros incompletos no pueden convertirse en certificados.</p>
          </div>
        </header>
        <div className="modal-body">
          <div className="warning-summary">
            <strong>{records.length} registros</strong> con campos críticos faltantes en {sheetCount} hoja(s).
          </div>
          <div className="table-scroll">
            <table className="records-table">
              <thead>
                <tr><th>#</th><th>Hoja</th><th>Fila</th><th>Datos disponibles</th><th>Faltantes</th></tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={`${record.hoja}-${record.filaExcel}-${index}`}>
                    <td>{index + 1}</td>
                    <td><strong>{record.hoja}</strong></td>
                    <td>Fila {record.filaExcel}</td>
                    <td>
                      {record.nombres !== '—' && <span>{record.nombres} </span>}
                      {record.apellidos !== '—' && <span>{record.apellidos}<br /></span>}
                      {record.rut !== '—' && <small>{record.rut}</small>}
                    </td>
                    <td>
                      {record.faltantes.map((field) => (
                        <span className="missing-badge" key={field}>{field}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="secondary-action" onClick={onClose}>Cerrar y corregir</button>
          <button className="primary-action compact" onClick={onContinue}>
            <Icon name="check" /> Continuar con válidos
          </button>
        </footer>
      </div>
    </div>
  )
}

export function ProgressDialog({ progress }: { progress: ProgressState }) {
  const percentage = progress.total
    ? Math.round((progress.processed / progress.total) * 100)
    : 0

  return (
    <div className="modal-backdrop progress-backdrop" role="dialog" aria-modal="true">
      <div className="modal progress-modal">
        <header className="modal-header">
          <span className="modal-header-icon"><Icon name="sparkles" /></span>
          <div>
            <h2>Generando certificados</h2>
            <p>No cierres esta ventana mientras se preparan los archivos.</p>
          </div>
        </header>
        <div className="modal-body">
          <span className="progress-title">{progress.title}</span>
          <div className="progress-counter">
            <span>Progreso general</span>
            <strong>{progress.processed} / {progress.total}</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percentage}%` }} />
          </div>
          <div className="progress-stats">
            <div><strong>{progress.processed}</strong><span>Completados</span></div>
            <div><strong>{progress.total - progress.processed}</strong><span>Restantes</span></div>
            <div><strong>{percentage}%</strong><span>Avance</span></div>
          </div>
          <p className="current-student">
            <span className="spinner" />
            {progress.currentName || 'Preparando archivos...'}
          </p>
        </div>
      </div>
    </div>
  )
}
