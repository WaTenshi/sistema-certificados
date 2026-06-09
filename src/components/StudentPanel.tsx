import type { IndexedStudent, TemplateMode } from '../types'
import { studentName } from '../utils/students'
import { Icon } from './Icon'

export function StudentPanel({
  mode,
  students,
  total,
  selectedIndex,
  query,
  currentSheet,
  sheetIndex,
  sheetCount,
  onQueryChange,
  onSelect,
  onMoveSheet,
}: {
  mode: TemplateMode
  students: IndexedStudent[]
  total: number
  selectedIndex: number
  query: string
  currentSheet?: string
  sheetIndex: number
  sheetCount: number
  onQueryChange: (value: string) => void
  onSelect: (index: number) => void
  onMoveSheet: (direction: number) => void
}) {
  return (
    <aside className="student-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-icon"><Icon name="users" /></span>
          <span><strong>Participantes</strong><small>{total} cargados</small></span>
        </div>
        {currentSheet && <span className="sheet-chip">{currentSheet}</span>}
      </div>
      <label className="search-field">
        <Icon name="search" />
        <input
          type="search"
          placeholder="Buscar nombre o RUT"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <div className="student-list">
        {!total && (
          <div className="students-empty">
            <span><Icon name="users" /></span>
            <strong>Aún no hay participantes</strong>
            <p>Carga y procesa un Excel para verlos aquí.</p>
          </div>
        )}
        {total > 0 && !students.length && (
          <div className="students-empty compact">
            <strong>Sin coincidencias</strong>
            <p>Prueba con otro nombre o RUT.</p>
          </div>
        )}
        {students.map(({ student, index }) => (
          <button
            className={`student-row ${selectedIndex === index ? 'active' : ''}`}
            key={`${student.rut}-${index}`}
            onClick={() => onSelect(index)}
          >
            <span className="student-avatar">
              {student.nombres.charAt(0)}{student.apellidos.charAt(0)}
            </span>
            <span className="student-identity">
              <strong>{studentName(student)}</strong>
              <small>{student.rut}</small>
            </span>
            <Icon name="chevronRight" />
          </button>
        ))}
      </div>
      {mode === 'png' && sheetCount > 1 && (
        <div className="sheet-pagination">
          <button
            aria-label="Hoja anterior"
            disabled={sheetIndex === 0}
            onClick={() => onMoveSheet(-1)}
          >
            <Icon name="chevronLeft" />
          </button>
          <span>Hoja {sheetIndex + 1} de {sheetCount}</span>
          <button
            aria-label="Hoja siguiente"
            disabled={sheetIndex === sheetCount - 1}
            onClick={() => onMoveSheet(1)}
          >
            <Icon name="chevronRight" />
          </button>
        </div>
      )}
    </aside>
  )
}
