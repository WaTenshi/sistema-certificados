import { useEffect, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { ProgressDialog, WarningDialog } from './components/Dialogs'
import { PreviewPanel } from './components/PreviewPanel'
import { StudentPanel } from './components/StudentPanel'
import { WorkflowPanel } from './components/WorkflowPanel'
import { useCertificateWorkspace } from './hooks/useCertificateWorkspace'

export default function App() {
  const workspace = useCertificateWorkspace()
  const [workflowCollapsed, setWorkflowCollapsed] = useState(false)
  const previouslyHadStudents = useRef(false)

  useEffect(() => {
    if (workspace.hasStudents && !previouslyHadStudents.current) {
      setWorkflowCollapsed(true)
    }
    previouslyHadStudents.current = workspace.hasStudents
  }, [workspace.hasStudents])

  return (
    <div className="app-shell">
      <AppHeader
        feedback={workspace.feedback}
        onReset={() => {
          workspace.resetSystem()
          setWorkflowCollapsed(false)
        }}
        onDismissFeedback={workspace.dismissFeedback}
      />

      <main className="app-main">
        <WorkflowPanel
          collapsed={workflowCollapsed}
          mode={workspace.mode}
          templateFileName={workspace.templateFileName}
          wordTemplateName={workspace.wordTemplateName}
          excelFile={workspace.excelFile}
          prefix={workspace.prefix}
          hasTemplate={workspace.hasTemplate}
          hasStudents={workspace.hasStudents}
          readyToProcess={workspace.readyToProcess}
          busy={workspace.busy}
          onModeChange={(mode) => {
            workspace.changeMode(mode)
            setWorkflowCollapsed(false)
          }}
          onPngTemplate={workspace.loadPngTemplate}
          onWordTemplate={(file) => void workspace.loadWordTemplate(file)}
          onExcel={workspace.selectExcel}
          onPrefixChange={workspace.setPrefix}
          onProcess={() => void workspace.processExcel()}
          onToggle={() => setWorkflowCollapsed((current) => !current)}
        />

        <section className="review-workspace" aria-label="Revisión de certificados">
          <StudentPanel
            mode={workspace.mode}
            students={workspace.filteredStudents}
            total={workspace.activeStudents.length}
            selectedIndex={workspace.selectedIndex}
            query={workspace.query}
            currentSheet={workspace.currentSheet}
            sheetIndex={workspace.sheetIndex}
            sheetCount={workspace.sheetNames.length}
            onQueryChange={workspace.setQuery}
            onSelect={workspace.setSelectedIndex}
            onMoveSheet={workspace.moveSheet}
          />
          <PreviewPanel
            mode={workspace.mode}
            student={workspace.selectedStudent}
            selectedIndex={workspace.selectedIndex}
            total={workspace.activeStudents.length}
            templateUrl={workspace.templateUrl}
            wordTemplate={workspace.wordTemplate}
            certificateCode={workspace.certificateCode}
            certificateLayout={workspace.certificateLayout}
            certificateTexts={workspace.certificateTexts}
            busy={workspace.busy}
            onLayoutChange={workspace.setCertificateLayout}
            onTextChange={workspace.setCertificateTexts}
            onDownloadCurrent={() => void workspace.downloadCurrent()}
            onDownloadAll={() => void workspace.downloadAll()}
          />
        </section>
      </main>

      {!!workspace.warningRecords.length && workspace.pendingWorkbook && (
        <WarningDialog
          records={workspace.warningRecords}
          onContinue={workspace.continueWithIncompleteRecords}
          onClose={workspace.closeWarning}
        />
      )}
      {workspace.progress.open && <ProgressDialog progress={workspace.progress} />}
    </div>
  )
}
