const tableFieldKeys = new Set(['rut', 'nombre', 'nota', 'asistencia', 'evaluacion'])

export function updateActiveTableGrid(
  table: string,
  headers: string[],
  columnWidths: Partial<Record<string, number>>,
): { table: string, totalWidth: number } {
  const gridStart = /<w:tblGrid(?:\s[^>]*)?>/.exec(table)
  if (!gridStart || gridStart.index == null) return { table, totalWidth: 0 }

  const contentStart = gridStart.index + gridStart[0].length
  const gridClose = table.indexOf('</w:tblGrid>', contentStart)
  if (gridClose < 0) return { table, totalWidth: 0 }

  // Word puede guardar una cuadrícula histórica anidada en tblGridChange.
  // Solo las columnas anteriores a ese bloque representan la tabla activa.
  const gridChangeStart = table.indexOf('<w:tblGridChange', contentStart)
  const activeGridEnd = gridChangeStart >= 0 && gridChangeStart < gridClose
    ? gridChangeStart
    : gridClose
  let activeGrid = table.slice(gridStart.index, activeGridEnd)
  const gridColumns = Array.from(activeGrid.matchAll(/<w:gridCol\b[^>]*\/?\s*>/g)).map((match) => match[0])

  headers.forEach((header, index) => {
    if (!tableFieldKeys.has(header) || !gridColumns[index]) return
    const width = columnWidths[header]
    if (width == null) return
    activeGrid = activeGrid.replace(
      gridColumns[index],
      `<w:gridCol w:w="${Math.round(width * 15)}"/>`,
    )
  })

  const totalWidth = Array.from(activeGrid.matchAll(/<w:gridCol\b[^>]*w:w="(\d+)"[^>]*\/?\s*>/g))
    .reduce((sum, match) => sum + Number(match[1]), 0)
  const updatedTable = table.slice(0, gridStart.index) + activeGrid + table.slice(activeGridEnd)
  return { table: updatedTable, totalWidth }
}
