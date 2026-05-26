'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useStore } from '@/store/useStore';
import { io, Socket } from 'socket.io-client';
import {
  Sparkles,
  Download,
  Save,
  Trash2,
  Plus,
  Check,
  AlertTriangle,
  Loader2,
  Clock,
  Printer,
  ChevronDown,
  Edit2,
  RefreshCw,
  HelpCircle,
  Menu,
  Users,
  X,
} from 'lucide-react';
import styles from './AssignmentDetailView.module.css';
import { IAssignment, ISection, IQuestion } from '@/lib/api';

interface AssignmentDetailViewProps {
  assignmentId: string;
}

export default function AssignmentDetailView({ assignmentId }: AssignmentDetailViewProps) {
  const {
    activeAssignment,
    fetchAssignmentDetails,
    updateAssignmentInStore,
    updateAssignmentOnServer,
    regeneratePdfOnServer,
    isDetailLoading,
    detailError,
    groups,
    fetchGroups,
    assignPaperToGroup,
  } = useStore();

  // Socket state
  const [socketStatusMsg, setSocketStatusMsg] = useState('Initializing AI Connection...');
  const [socketProgress, setSocketProgress] = useState(10);
  const [socketLogs, setSocketLogs] = useState<string[]>(['Connecting to generation pipeline...']);

  // Editable sections
  const [localSections, setLocalSections] = useState<ISection[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Load details on mount
  useEffect(() => {
    fetchAssignmentDetails(assignmentId);
  }, [assignmentId, fetchAssignmentDetails]);

  // Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Set local editable sections when assignment finishes loading or updates
  useEffect(() => {
    if (activeAssignment?.sections) {
      setLocalSections(JSON.parse(JSON.stringify(activeAssignment.sections)));
    }
  }, [activeAssignment]);

  // Socket.IO hook for real-time progress updates
  useEffect(() => {
    if (!activeAssignment) return;
    
    // Only connect if the assignment is still compiling or generating
    if (activeAssignment.status === 'pending' || activeAssignment.status === 'generating') {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
      const socket: Socket = io(socketUrl, {
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        setSocketLogs((prev) => [...prev, 'Connected to pipeline. Subscribing to updates...']);
        socket.emit('join-assignment', assignmentId);
      });

      socket.on('status-update', (data: {
        status: IAssignment['status'];
        message: string;
        progress: number;
        sections?: ISection[];
        pdfPath?: string;
        pdfAnswerPath?: string;
        error?: string;
      }) => {
        if (data.message) {
          setSocketStatusMsg(data.message);
          setSocketLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${data.message}`]);
        }
        if (data.progress !== undefined) {
          setSocketProgress(data.progress);
        }

        // Update local status in Zustand store
        updateAssignmentInStore(assignmentId, {
          status: data.status,
          sections: data.sections || activeAssignment.sections,
          pdfPath: data.pdfPath || activeAssignment.pdfPath,
          pdfAnswerPath: data.pdfAnswerPath || activeAssignment.pdfAnswerPath,
          error: data.error || activeAssignment.error,
        });
      });

      socket.on('disconnect', () => {
        setSocketLogs((prev) => [...prev, 'AI generation pipeline disconnected.']);
      });

      return () => {
        socket.emit('leave-assignment', assignmentId);
        socket.disconnect();
      };
    }
  }, [activeAssignment, assignmentId, updateAssignmentInStore]);

  // --- Inline Editors ---

  const handleQuestionTextChange = (sectionIdx: number, questionIdx: number, value: string) => {
    const updated = [...localSections];
    updated[sectionIdx].questions[questionIdx].text = value;
    setLocalSections(updated);
  };

  const handleQuestionMarksChange = (sectionIdx: number, questionIdx: number, value: number) => {
    const updated = [...localSections];
    updated[sectionIdx].questions[questionIdx].marks = Math.max(1, value);
    setLocalSections(updated);
  };

  const handleDifficultyChange = (sectionIdx: number, questionIdx: number, value: IQuestion['difficulty']) => {
    const updated = [...localSections];
    updated[sectionIdx].questions[questionIdx].difficulty = value;
    setLocalSections(updated);
  };

  const handleMcqOptionChange = (sectionIdx: number, questionIdx: number, optionIdx: number, value: string) => {
    const updated = [...localSections];
    const question = updated[sectionIdx].questions[questionIdx];
    if (question.options) {
      question.options[optionIdx] = value;
      setLocalSections(updated);
    }
  };

  const addMcqOption = (sectionIdx: number, questionIdx: number) => {
    const updated = [...localSections];
    const question = updated[sectionIdx].questions[questionIdx];
    if (!question.options) question.options = [];
    question.options.push(`New Option ${question.options.length + 1}`);
    setLocalSections(updated);
  };

  const removeMcqOption = (sectionIdx: number, questionIdx: number, optionIdx: number) => {
    const updated = [...localSections];
    const question = updated[sectionIdx].questions[questionIdx];
    if (question.options && question.options.length > 2) {
      question.options.splice(optionIdx, 1);
      setLocalSections(updated);
    }
  };

  const deleteQuestion = (sectionIdx: number, questionIdx: number) => {
    const updated = [...localSections];
    updated[sectionIdx].questions.splice(questionIdx, 1);
    setLocalSections(updated);
  };

  const addQuestion = (sectionIdx: number, type: IQuestion['type']) => {
    const updated = [...localSections];
    const newQ: IQuestion = {
      text: 'New question text. Edit me...',
      difficulty: 'Easy',
      marks: 5,
      type: type,
      options: type === 'MCQ' ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
      correctAnswer: type === 'TrueFalse' ? 'True' : '',
    };
    updated[sectionIdx].questions.push(newQ);
    setLocalSections(updated);
  };

  // --- API Handlers ---

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateAssignmentOnServer(assignmentId, { sections: localSections });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompilePDF = async () => {
    setIsCompiling(true);
    try {
      // Save changes first
      await updateAssignmentOnServer(assignmentId, { sections: localSections });
      // Then trigger PDF regeneration
      await regeneratePdfOnServer(assignmentId);
    } catch (err) {
      alert('Error initiating PDF compilation.');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleAssignSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !activeAssignment) return;
    setIsAssigning(true);
    try {
      await assignPaperToGroup(selectedGroupId, activeAssignment._id, dueDate || undefined);
      alert('Assessment successfully assigned to the class group!');
      setShowAssignModal(false);
      setSelectedGroupId('');
      setDueDate('');
    } catch (err: any) {
      alert(err.message || 'Failed to assign paper.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isDetailLoading && !activeAssignment) {
    return (
      <div className={styles.loadingScreen}>
        <Loader2 className={styles.spinningIcon} size={32} />
        <p>Loading assignment information...</p>
      </div>
    );
  }

  if (detailError || !activeAssignment) {
    return (
      <div className={styles.errorScreen}>
        <AlertTriangle size={48} className={styles.redIcon} />
        <h3>Failed to Load Assignment</h3>
        <p>{detailError || 'Assignment was not found.'}</p>
      </div>
    );
  }

  const { status, title, subject, grade, pdfPath, pdfAnswerPath } = activeAssignment;

  // --- RENDERING 1: Generating Status Trackers ---
  if (status === 'pending' || status === 'generating') {
    return (
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <div className={styles.generatingHeader}>
            <Sparkles size={24} className={styles.sparkleIcon} />
            <h2>Generating Paper: {title}</h2>
          </div>
          <span className={styles.progressStatus}>{status}</span>
        </div>

        <p className={styles.progressIntro}>
          Please wait while Questra gathers references, drafts sections, and structures questions.
        </p>

        {/* Circular Progress & Percentage */}
        <div className={styles.progressBody}>
          <div className={styles.progressBarWrapper}>
            <div className={styles.progressBarBg}>
              <div className={styles.progressBarFill} style={{ width: `${socketProgress}%` }} />
            </div>
            <div className={styles.progressPercentage}>{socketProgress}%</div>
          </div>
          <div className={styles.progressStatusMessage}>{socketStatusMsg}</div>
        </div>

        {/* Real-time Logs Screen */}
        <div className={styles.logsConsole}>
          <div className={styles.consoleHeader}>
            <span className={styles.consoleDot} />
            <span className={styles.consoleTitle}>Generation Pipeline Logs</span>
          </div>
          <div className={styles.consoleBody}>
            {socketLogs.map((log, idx) => (
              <div key={idx} className={styles.logLine}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING 2: Failed Status ---
  if (status === 'failed') {
    return (
      <div className={styles.failedCard}>
        <AlertTriangle size={48} className={styles.redIcon} />
        <h2>Generation Failed</h2>
        <p className={styles.failedMessage}>
          {activeAssignment.error || 'An unexpected error occurred during AI drafting.'}
        </p>
        <button
          className={styles.retryBtn}
          onClick={handleCompilePDF}
        >
          <RefreshCw size={16} />
          <span>Retry Generation</span>
        </button>
      </div>
    );
  }

  // --- RENDERING 3: Interactive Editor (Completed Status) ---
  return (
    <div className={styles.editorContainer}>
      {/* Action Toolbar */}
      <div className={styles.editorToolbar}>
        <div className={styles.editorHeaderInfo}>
          <h2 className={styles.editorTitle}>{title}</h2>
          <p className={styles.editorSubtitle}>
            {subject} • {grade} • {activeAssignment.totalQuestions} Questions • {activeAssignment.totalMarks} Marks
          </p>
        </div>

        <div className={styles.editorActions}>
          {pdfPath && (
            <button
              className={`${styles.actionBtn} ${styles.saveBtn}`}
              onClick={() => setShowAssignModal(true)}
              title="Assign this assessment to a class group"
            >
              <Users size={16} />
              <span>Assign to Class</span>
            </button>
          )}

          <button
            className={`${styles.actionBtn} ${styles.saveBtn}`}
            onClick={handleSaveChanges}
            disabled={isSaving}
            title="Save changes to database"
          >
            {isSaving ? <Loader2 size={16} className={styles.spinningIcon} /> : <Save size={16} />}
            <span>{saveSuccess ? 'Saved!' : 'Save Edits'}</span>
          </button>

          <button
            className={`${styles.actionBtn} ${styles.compileBtn}`}
            onClick={handleCompilePDF}
            disabled={isCompiling}
            title="Compile updated questions to PDF"
          >
            {isCompiling ? (
              <Loader2 size={16} className={styles.spinningIcon} />
            ) : (
              <Printer size={16} />
            )}
            <span>Compile PDF</span>
          </button>

          {pdfPath && (
            <a
              href={`http://localhost:5000${pdfPath}`}
              target="_blank"
              rel="noreferrer"
              className={`${styles.actionBtn} ${styles.downloadBtn}`}
              title="Download Student Questions PDF"
            >
              <Download size={16} />
              <span>Questions PDF</span>
            </a>
          )}

          {pdfAnswerPath && (
            <a
              href={`http://localhost:5000${pdfAnswerPath}`}
              target="_blank"
              rel="noreferrer"
              className={`${styles.actionBtn} ${styles.downloadBtn}`}
              title="Download Answer Key & Rubric PDF"
            >
              <Download size={16} />
              <span>Answer Key PDF</span>
            </a>
          )}
        </div>
      </div>

      {/* Editor Workspace */}
      <div className={styles.editorWorkspace}>
        {localSections.map((section, sIdx) => (
          <div key={sIdx} className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderMeta}>
                <span className={styles.sectionBadge}>Section {sIdx + 1}</span>
                <input
                  type="text"
                  className={styles.sectionTitleInput}
                  value={section.title}
                  onChange={(e) => {
                    const updated = [...localSections];
                    updated[sIdx].title = e.target.value;
                    setLocalSections(updated);
                  }}
                />
              </div>
              <input
                type="text"
                className={styles.sectionInstructionInput}
                value={section.instruction}
                placeholder="Instructions (e.g. Answer all questions)"
                onChange={(e) => {
                  const updated = [...localSections];
                  updated[sIdx].instruction = e.target.value;
                  setLocalSections(updated);
                }}
              />
            </div>

            {/* Questions list */}
            <div className={styles.questionsList}>
              {section.questions.map((question, qIdx) => (
                <div key={qIdx} className={styles.questionItem}>
                  <div className={styles.questionMetaRow}>
                    <span className={styles.questionNumber}>Q{qIdx + 1}</span>
                    <span className={styles.typeBadge}>{question.type}</span>
                    
                    <select
                      className={styles.difficultySelect}
                      value={question.difficulty}
                      onChange={(e) => handleDifficultyChange(sIdx, qIdx, e.target.value as IQuestion['difficulty'])}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Hard">Hard</option>
                    </select>

                    <div className={styles.marksStepper}>
                      <button
                        type="button"
                        onClick={() => handleQuestionMarksChange(sIdx, qIdx, question.marks - 1)}
                      >
                        -
                      </button>
                      <span className={styles.marksValue}>{question.marks} Marks</span>
                      <button
                        type="button"
                        onClick={() => handleQuestionMarksChange(sIdx, qIdx, question.marks + 1)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className={styles.deleteQBtn}
                      onClick={() => deleteQuestion(sIdx, qIdx)}
                      title="Delete question"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <textarea
                    className={styles.questionTextInput}
                    value={question.text}
                    onChange={(e) => handleQuestionTextChange(sIdx, qIdx, e.target.value)}
                    rows={2}
                  />

                  {/* MCQ Options Editor */}
                  {question.type === 'MCQ' && question.options && (
                    <div className={styles.optionsWrapper}>
                      <div className={styles.optionsTitle}>Options</div>
                      <div className={styles.optionsGrid}>
                        {question.options.map((opt, oIdx) => (
                          <div key={oIdx} className={styles.optionInputRow}>
                            <span className={styles.optionLabel}>{String.fromCharCode(65 + oIdx)}</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleMcqOptionChange(sIdx, qIdx, oIdx, e.target.value)}
                            />
                            {question.options!.length > 2 && (
                              <button
                                type="button"
                                className={styles.removeOptBtn}
                                onClick={() => removeMcqOption(sIdx, qIdx, oIdx)}
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={styles.addOptBtn}
                        onClick={() => addMcqOption(sIdx, qIdx)}
                      >
                        + Add Option
                      </button>
                    </div>
                  )}

                  {/* Correct Answer Editor */}
                  <div className={styles.correctAnswerRow}>
                    <span className={styles.correctAnswerLabel}>Correct Answer/Grading Key:</span>
                    {question.type === 'TrueFalse' ? (
                      <select
                        className={styles.correctAnswerSelect}
                        value={question.correctAnswer || 'True'}
                        onChange={(e) => {
                          const updated = [...localSections];
                          updated[sIdx].questions[qIdx].correctAnswer = e.target.value;
                          setLocalSections(updated);
                        }}
                      >
                        <option value="True">True</option>
                        <option value="False">False</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        className={styles.correctAnswerInput}
                        value={question.correctAnswer || ''}
                        placeholder="Expected answer guide..."
                        onChange={(e) => {
                          const updated = [...localSections];
                          updated[sIdx].questions[qIdx].correctAnswer = e.target.value;
                          setLocalSections(updated);
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add question actions */}
            <div className={styles.sectionActions}>
              <button
                type="button"
                className={styles.addQuestionBtn}
                onClick={() => addQuestion(sIdx, 'MCQ')}
              >
                <Plus size={14} /> Add MCQ
              </button>
              <button
                type="button"
                className={styles.addQuestionBtn}
                onClick={() => addQuestion(sIdx, 'TrueFalse')}
              >
                <Plus size={14} /> Add True/False
              </button>
              <button
                type="button"
                className={styles.addQuestionBtn}
                onClick={() => addQuestion(sIdx, 'Descriptive')}
              >
                <Plus size={14} /> Add Descriptive
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Assign to Class Modal */}
      {showAssignModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Assign Assessment to Class Group</h3>
              <button onClick={() => setShowAssignModal(false)} className={styles.closeModalBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="assignToGroupSelect">Select Class Group</label>
                <select
                  id="assignToGroupSelect"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  required
                >
                  <option value="">-- Select Class --</option>
                  {groups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name} ({group.subject} • {group.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="dueDateSelect">Due Date (Optional)</label>
                <input
                  id="dueDateSelect"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className={styles.cancelBtn}
                  disabled={isAssigning}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isAssigning}>
                  {isAssigning ? 'Assigning...' : 'Assign Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
