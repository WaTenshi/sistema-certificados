import { useRef, useState } from 'react'
import { Icon } from './Icon'

export function FileDropField({
  accept,
  fileName,
  icon,
  label,
  hint,
  onFile,
}: {
  accept: string
  fileName: string
  icon: 'image' | 'word' | 'spreadsheet'
  label: string
  hint: string
  onFile: (file?: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      className={`drop-field ${fileName ? 'has-file' : ''} ${dragging ? 'dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        onFile(event.dataTransfer.files[0])
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <span className="drop-icon"><Icon name={fileName ? 'check' : icon} /></span>
      <span className="drop-copy">
        <strong>{fileName || label}</strong>
        <small>{fileName ? 'Archivo cargado correctamente' : hint}</small>
      </span>
      <button type="button" onClick={() => inputRef.current?.click()}>
        <Icon name="upload" />
        {fileName ? 'Cambiar' : 'Seleccionar'}
      </button>
    </div>
  )
}
