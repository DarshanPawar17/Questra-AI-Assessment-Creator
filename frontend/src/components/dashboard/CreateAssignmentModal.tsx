'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { X, Upload, FileText, Loader2, ArrowLeft, Calendar, Clock, BookOpen, Check } from 'lucide-react';
import styles from './CreateAssignmentModal.module.css';

interface CreateAssignmentModalProps {
  onClose: () => void;
}

export default function CreateAssignmentModal({ onClose }: CreateAssignmentModalProps) {
  const { createAssignment, libraryDocs, fetchLibraryDocs } = useStore();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1 states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [materialSource, setMaterialSource] = useState<'upload' | 'library'>('upload');
  const [selectedLibraryDocId, setSelectedLibraryDocId] = useState('');

  // Fetch library documents on load
  useEffect(() => {
    fetchLibraryDocs();
  }, [fetchLibraryDocs]);

  // Step 2 states
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [totalMarks, setTotalMarks] = useState(100);
  const [questionTypes, setQuestionTypes] = useState<string[]>(['MCQ']);
  const [timeLimit, setTimeLimit] = useState(60);
  const [dueDate, setDueDate] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleQuestionTypeToggle = (type: string) => {
    if (questionTypes.includes(type)) {
      if (questionTypes.length > 1) {
        setQuestionTypes(questionTypes.filter((t) => t !== type));
      }
    } else {
      setQuestionTypes([...questionTypes, type]);
    }
  };

  const handleNextStep = () => {
    if (!title.trim() || !subject.trim() || !grade.trim()) {
      setErrorMsg('Please fill in title, subject, and grade to continue.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('subject', subject.trim());
      formData.append('grade', grade.trim());
      formData.append('totalQuestions', String(totalQuestions));
      formData.append('totalMarks', String(totalMarks));
      formData.append('questionTypes', JSON.stringify(questionTypes));
      if (timeLimit) formData.append('timeLimit', String(timeLimit));
      if (dueDate) formData.append('dueDate', dueDate);
      if (additionalInstructions.trim()) {
        formData.append('additionalInstructions', additionalInstructions.trim());
      }
      
      if (materialSource === 'upload' && file) {
        formData.append('file', file);
      } else if (materialSource === 'library' && selectedLibraryDocId) {
        formData.append('libraryDocId', selectedLibraryDocId);
      }

      await createAssignment(formData);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error starting assignment generation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h2 className={styles.title}>Create New Assignment</h2>
            <p className={styles.subtitle}>Let AI write and structure your question paper</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={`${styles.progressHalf} ${step >= 1 ? styles.progressActive : ''}`}>
            <span className={styles.stepNum}>1</span> Upload & Basics
          </div>
          <div className={`${styles.progressHalf} ${step >= 2 ? styles.progressActive : ''}`}>
            <span className={styles.stepNum}>2</span> Parameters & Rules
          </div>
        </div>

        {/* Errors */}
        {errorMsg && (
          <div className={styles.errorBox}>
            <X size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Basics & Material */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Assignment Title</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Midterm Physics Exam"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRowDouble}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Subject</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Physics, Chemistry..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Grade/Class</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Grade 10, Class A..."
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Reference Material (Optional)</label>
              
              <div className={styles.tabToggleRow}>
                <button
                  type="button"
                  className={`${styles.toggleTabBtn} ${materialSource === 'upload' ? styles.toggleTabBtnActive : ''}`}
                  onClick={() => setMaterialSource('upload')}
                >
                  Upload New File
                </button>
                <button
                  type="button"
                  className={`${styles.toggleTabBtn} ${materialSource === 'library' ? styles.toggleTabBtnActive : ''}`}
                  onClick={() => setMaterialSource('library')}
                >
                  Choose from My Library
                </button>
              </div>

              {materialSource === 'upload' ? (
                <>
                  <div className={styles.uploadZone}>
                    <input
                      type="file"
                      id="file-upload"
                      className={styles.fileInput}
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className={styles.uploadLabel}>
                      <Upload size={32} className={styles.uploadIcon} />
                      <span className={styles.uploadTitle}>
                        {file ? file.name : 'Upload syllabus, notes, or sample text'}
                      </span>
                      <span className={styles.uploadMeta}>Supports PDF, DOCX, TXT up to 10MB</span>
                    </label>
                  </div>
                  {file && (
                    <div className={styles.fileDetails}>
                      <FileText size={16} />
                      <span className={styles.fileName}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button className={styles.removeFileBtn} type="button" onClick={() => setFile(null)}>Remove</button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.formGroup}>
                  <select
                    className={styles.selectInput}
                    value={selectedLibraryDocId}
                    onChange={(e) => {
                      setSelectedLibraryDocId(e.target.value);
                      const doc = libraryDocs.find((d) => d._id === e.target.value);
                      if (doc) {
                        if (!title) setTitle(doc.title);
                        if (!subject && doc.subject) setSubject(doc.subject);
                        if (!grade && doc.grade) setGrade(doc.grade);
                      }
                    }}
                  >
                    <option value="">-- Choose a Library Document --</option>
                    {libraryDocs.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.title} ({doc.subject || 'No Subject'} • {doc.grade || 'No Grade'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button className={styles.nextBtn} onClick={handleNextStep}>
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Settings & Parameters */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.formRowDouble}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Number of Questions</label>
                <div className={styles.stepperWrapper}>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => setTotalQuestions(Math.max(1, totalQuestions - 1))}
                  >
                    -
                  </button>
                  <span className={styles.stepperValue}>{totalQuestions}</span>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => setTotalQuestions(totalQuestions + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Total Marks</label>
                <div className={styles.stepperWrapper}>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => setTotalMarks(Math.max(1, totalMarks - 5))}
                  >
                    -
                  </button>
                  <span className={styles.stepperValue}>{totalMarks}</span>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => setTotalMarks(totalMarks + 5)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Include Question Types</label>
              <div className={styles.typeCheckboxGrid}>
                {['MCQ', 'TrueFalse', 'Descriptive'].map((type) => {
                  const isChecked = questionTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      className={`${styles.typeSelector} ${isChecked ? styles.typeSelected : ''}`}
                      onClick={() => handleQuestionTypeToggle(type)}
                    >
                      <div className={styles.checkboxCircle}>
                        {isChecked && <Check size={12} />}
                      </div>
                      <span>
                        {type === 'TrueFalse' ? 'True / False' : type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formRowDouble}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Time Limit (Minutes)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 60"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Due Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Additional Instructions / Special Rules</label>
              <textarea
                className={styles.textarea}
                placeholder="e.g. Focus on Newtonian Mechanics. Do not include calculus equations..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.footer}>
              <button className={styles.backStepBtn} onClick={handlePrevStep}>
                <ArrowLeft size={16} />
                <span>Go Back</span>
              </button>
              <button
                className={styles.generateBtn}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className={styles.spinningIcon} />
                    <span>Launching AI...</span>
                  </>
                ) : (
                  <span>Create & Generate</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
