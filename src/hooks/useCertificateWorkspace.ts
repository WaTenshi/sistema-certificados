import { useEffect, useState } from 'react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { parsePngWorkbook, parseWordWorkbook } from '../services/excel'
import { createPngCertificatePdf, safeFileName } from '../services/pngPdf'
import { wordTemplateToPdfBlob } from '../services/word'
import type {
  Feedback,
  IncompleteRecord,
  IndexedStudent,
  PngWorkbook,
  ProgressState,
  Student,
  TemplateMode,
} from '../types'
import {
  copyDefaultCertificateLayout,
  copyDefaultCertificateTexts,
  type CertificateLayout,
  type CertificateTextContent,
} from '../utils/certificateLayout'
import { matchesStudent, studentName } from '../utils/students'
import { copyDefaultWordDataStyles, type WordDataStyles } from '../utils/wordStyles'

const initialProgress: ProgressState = {
  open: false,
  title: '',
  processed: 0,
  total: 0,
  currentName: '',
}

export function useCertificateWorkspace() {
  const [mode, setMode] = useState<TemplateMode>('png')
  const [templateUrl, setTemplateUrl] = useState('')
  const [templateFileName, setTemplateFileName] = useState('')
  const [wordTemplate, setWordTemplate] = useState<ArrayBuffer | null>(null)
  const [wordTemplateName, setWordTemplateName] = useState('')
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [studentsBySheet, setStudentsBySheet] = useState<Record<string, Student[]>>({})
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [wordStudents, setWordStudents] = useState<Student[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [prefix, setPrefix] = useState('')
  const [pendingWorkbook, setPendingWorkbook] = useState<PngWorkbook | null>(null)
  const [warningRecords, setWarningRecords] = useState<IncompleteRecord[]>([])
  const [progress, setProgress] = useState<ProgressState>(initialProgress)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [certificateLayout, setCertificateLayout] = useState<CertificateLayout>(copyDefaultCertificateLayout)
  const [certificateTexts, setCertificateTexts] = useState<CertificateTextContent>(copyDefaultCertificateTexts)
  const [wordDataStyles, setWordDataStyles] = useState<WordDataStyles>(copyDefaultWordDataStyles)
  const [wordSenceCodeEnabled, setWordSenceCodeEnabled] = useState(false)
  const [wordSenceCodeManual, setWordSenceCodeManual] = useState('')
  const [wordEvaluationLabel, setWordEvaluationLabel] = useState('Evaluación')

  const currentSheet = sheetNames[sheetIndex]
  const activeStudents = mode === 'word'
    ? wordStudents
    : studentsBySheet[currentSheet] ?? []
  const selectedStudent = activeStudents[selectedIndex] ?? null
  const filteredStudents: IndexedStudent[] = activeStudents
    .map((student, index) => ({ student, index }))
    .filter(({ student }) => matchesStudent(student, query))
  const certificateCode = selectedStudent
    ? `${prefix.trim().toUpperCase()}${selectedIndex + 1}`
    : ''
  const hasTemplate = mode === 'png' ? Boolean(templateUrl) : Boolean(wordTemplate)
  const hasStudents = activeStudents.length > 0
  const readyToProcess = hasTemplate && Boolean(excelFile)

  useEffect(() => {
    return () => {
      if (templateUrl) URL.revokeObjectURL(templateUrl)
    }
  }, [templateUrl])

  function notify(text: string, tone: Feedback['tone'] = 'info') {
    setFeedback({ text, tone })
  }

  function clearLoadedData() {
    setStudentsBySheet({})
    setSheetNames([])
    setSheetIndex(0)
    setWordStudents([])
    setSelectedIndex(0)
    setQuery('')
    setExcelFile(null)
  }

  function changeMode(nextMode: TemplateMode) {
    setMode(nextMode)
    clearLoadedData()
    setFeedback(null)
  }

  function loadPngTemplate(file?: File) {
    if (!file) return
    setTemplateUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      return URL.createObjectURL(file)
    })
    setTemplateFileName(file.name)
    notify('Plantilla de imagen lista para usar.', 'success')
  }

  async function loadWordTemplate(file?: File) {
    if (!file) return
    setWordTemplate(await file.arrayBuffer())
    setWordTemplateName(file.name)
    notify('Plantilla Word lista para usar.', 'success')
  }

  function selectExcel(file: File | null) {
    setExcelFile(file)
    if (file) notify('Excel seleccionado. Ya puedes procesar los datos.')
  }

  function applyPngWorkbook(workbook: PngWorkbook) {
    setStudentsBySheet(workbook.studentsBySheet)
    setSheetNames(workbook.sheetNames)
    setSheetIndex(0)
    setSelectedIndex(0)
    setPendingWorkbook(null)
    setWarningRecords([])
    notify(`${workbook.sheetNames.length} hoja(s) cargada(s) correctamente.`, 'success')
  }

  async function processExcel() {
    if (!excelFile) {
      notify('Selecciona un archivo Excel antes de continuar.', 'error')
      return
    }
    if (!hasTemplate) {
      notify(`Primero carga una plantilla ${mode === 'png' ? 'PNG o JPG' : 'Word'}.`, 'error')
      return
    }

    setBusy(true)
    notify('Procesando y validando el Excel...')
    try {
      if (mode === 'png') {
        const workbook = await parsePngWorkbook(excelFile)
        if (!workbook.sheetNames.length) throw new Error('No se encontraron alumnos válidos.')
        if (workbook.incompleteRecords.length) {
          setPendingWorkbook(workbook)
          setWarningRecords(workbook.incompleteRecords)
        } else {
          applyPngWorkbook(workbook)
        }
      } else {
        const students = await parseWordWorkbook(excelFile)
        if (!students.length) throw new Error('No se encontraron alumnos válidos.')
        setWordStudents(students)
        setSelectedIndex(0)
        notify(`${students.length} alumno(s) cargado(s) correctamente.`, 'success')
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo procesar el Excel.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function downloadCurrent() {
    if (!selectedStudent) return
    setBusy(true)
    notify('Generando certificado...')
    try {
      const baseName = safeFileName(studentName(selectedStudent)) || 'certificado'
      if (mode === 'png') {
        const pdf = await createPngCertificatePdf(
          selectedStudent,
          templateUrl,
          certificateCode,
          certificateLayout,
          certificateTexts,
        )
        pdf.save(`certificado-${baseName}.pdf`)
      } else if (wordTemplate) {
        const blob = await wordTemplateToPdfBlob(
          wordTemplate,
          selectedStudent,
          wordDataStyles,
          wordSenceCodeEnabled,
          wordSenceCodeManual,
          wordEvaluationLabel,
        )
        saveAs(blob, `certificado-${baseName}.pdf`)
      }
      notify('Certificado generado correctamente.', 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo generar el certificado.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function downloadAll() {
    if (!activeStudents.length) return
    setBusy(true)
    setProgress({
      open: true,
      title: mode === 'word' ? 'Certificados Word' : `Hoja: ${currentSheet}`,
      processed: 0,
      total: activeStudents.length,
      currentName: '',
    })

    try {
      const zip = new JSZip()
      for (let index = 0; index < activeStudents.length; index += 1) {
        const student = activeStudents[index]
        const name = studentName(student)
        setProgress((current) => ({ ...current, processed: index, currentName: name }))
        await new Promise((resolve) => window.setTimeout(resolve, 0))

        const fileName = safeFileName(name) || `alumno-${index + 1}`
        if (mode === 'png') {
          const code = `${prefix.trim().toUpperCase()}${index + 1}`
          const pdf = await createPngCertificatePdf(student, templateUrl, code, certificateLayout, certificateTexts)
          zip.file(`${fileName}.pdf`, pdf.output('arraybuffer'))
        } else if (wordTemplate) {
          zip.file(
            `${fileName}.pdf`,
            await wordTemplateToPdfBlob(
              wordTemplate,
              student,
              wordDataStyles,
              wordSenceCodeEnabled,
              wordSenceCodeManual,
              wordEvaluationLabel,
            ),
          )
        }
        setProgress((current) => ({ ...current, processed: index + 1 }))
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipName = mode === 'word'
        ? 'certificados-word-pdf.zip'
        : `certificados-${safeFileName(currentSheet || 'hoja')}.zip`
      saveAs(zipBlob, zipName)
      notify('Archivo ZIP generado correctamente.', 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudieron generar los certificados.', 'error')
    } finally {
      setProgress(initialProgress)
      setBusy(false)
    }
  }

  function resetSystem() {
    if (!window.confirm('¿Limpiar los alumnos cargados? Las plantillas se mantendrán.')) return
    clearLoadedData()
    setPrefix('')
    setWordSenceCodeManual('')
    notify('Datos limpiados. La plantilla se mantuvo.', 'success')
  }

  function moveSheet(direction: number) {
    const nextIndex = sheetIndex + direction
    if (nextIndex < 0 || nextIndex >= sheetNames.length) return
    setSheetIndex(nextIndex)
    setSelectedIndex(0)
    setQuery('')
  }

  function continueWithIncompleteRecords() {
    if (pendingWorkbook) applyPngWorkbook(pendingWorkbook)
  }

  function closeWarning() {
    setWarningRecords([])
    setPendingWorkbook(null)
    notify('Corrige el Excel y vuelve a cargarlo.', 'info')
  }

  return {
    mode,
    templateUrl,
    templateFileName,
    wordTemplate,
    wordTemplateName,
    excelFile,
    sheetNames,
    sheetIndex,
    currentSheet,
    activeStudents,
    filteredStudents,
    selectedStudent,
    selectedIndex,
    certificateCode,
    certificateLayout,
    certificateTexts,
    wordDataStyles,
    wordSenceCodeEnabled,
    wordSenceCodeManual,
    wordEvaluationLabel,
    query,
    prefix,
    warningRecords,
    pendingWorkbook,
    progress,
    busy,
    feedback,
    hasTemplate,
    hasStudents,
    readyToProcess,
    changeMode,
    loadPngTemplate,
    loadWordTemplate,
    selectExcel,
    processExcel,
    downloadCurrent,
    downloadAll,
    resetSystem,
    moveSheet,
    setSelectedIndex,
    setQuery,
    setPrefix,
    setCertificateLayout,
    setCertificateTexts,
    setWordDataStyles,
    setWordSenceCodeEnabled,
    setWordSenceCodeManual,
    setWordEvaluationLabel,
    continueWithIncompleteRecords,
    closeWarning,
    dismissFeedback: () => setFeedback(null),
  }
}
