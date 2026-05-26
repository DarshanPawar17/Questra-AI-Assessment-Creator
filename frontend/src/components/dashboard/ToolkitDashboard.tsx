'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useStore } from '@/store/useStore';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  ArrowLeft,
  X,
  FileText,
  Download,
  Check,
  Loader2,
  CheckCircle
} from 'lucide-react';
import styles from './ToolkitDashboard.module.css';

type ToolkitMode = 'select' | 'rubric' | 'lesson';

export default function ToolkitDashboard() {
  const {
    activeRubric,
    activeLessonPlan,
    isToolkitLoading,
    toolkitError,
    generateRubric,
    generateLessonPlan,
    exportToolkitPdf,
    clearToolkit
  } = useStore();

  const [mode, setMode] = useState<ToolkitMode>('select');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadPath, setDownloadPath] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [duration, setDuration] = useState('45 minutes');

  useEffect(() => {
    clearToolkit();
    setDownloadPath(null);
  }, [mode, clearToolkit]);

  const handleBackToSelect = () => {
    setMode('select');
    clearToolkit();
    setDownloadPath(null);
  };

  const handleRubricSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !grade.trim()) {
      alert('Please fill out all fields.');
      return;
    }
    setDownloadPath(null);
    try {
      await generateRubric(title.trim(), grade.trim());
    } catch (err) {
      // Handled in store
    }
  };

  const handleLessonSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !grade.trim() || !duration.trim()) {
      alert('Please fill out all fields.');
      return;
    }
    setDownloadPath(null);
    try {
      await generateLessonPlan(topic.trim(), grade.trim(), duration.trim());
    } catch (err) {
      // Handled in store
    }
  };

  const handleCopyToClipboard = () => {
    let text = '';
    if (activeRubric) {
      text += `GRADING RUBRIC MATRIX: ${activeRubric.title}\nGrade Level: ${activeRubric.grade}\n\n`;
      activeRubric.criteria.forEach((crit, idx) => {
        text += `${idx + 1}. ${crit.name} (Max: ${crit.maxPoints} pts)\n`;
        crit.levels.forEach((lvl) => {
          text += `  - [${lvl.points} pts] ${lvl.name}: ${lvl.description}\n`;
        });
        text += '\n';
      });
    } else if (activeLessonPlan) {
      text += `CLASSROOM LESSON PLAN: ${activeLessonPlan.topic}\nGrade Level: ${activeLessonPlan.grade} | Duration: ${activeLessonPlan.duration}\n\n`;
      text += `LEARNING OBJECTIVES:\n`;
      activeLessonPlan.objectives.forEach((obj) => {
        text += `  • ${obj}\n`;
      });
      text += `\nREQUIRED MATERIALS:\n`;
      activeLessonPlan.materials.forEach((mat) => {
        text += `  • ${mat}\n`;
      });
      text += `\nLESSON SCHEDULE:\n`;
      activeLessonPlan.activities.forEach((act) => {
        text += `  - [${act.duration}] ${act.name}: ${act.description}\n`;
      });
      text += `\nHOMEWORK ASSIGNMENT:\n${activeLessonPlan.homework}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const type = activeRubric ? 'rubric' : 'lesson';
      const data = activeRubric || activeLessonPlan;
      const path = await exportToolkitPdf(type, data);
      setDownloadPath(path);
    } catch (err) {
      alert('Failed to compile PDF.');
    } finally {
      setExporting(false);
    }
  };

  // --- RENDERING VIEWS ---

  // 1. Selector Dashboard
  if (mode === 'select') {
    return (
      <div className={styles.container}>
        <div className={styles.selectorHeader}>
          <Sparkles className={styles.sparkleHeading} size={32} />
          <h2 className={styles.title}>AI Teacher's Toolkit</h2>
          <p className={styles.subtitle}>
            Empower your teaching with instant lesson planners and grading rubric matrix generators.
          </p>
        </div>

        <div className={styles.toolGrid}>
          {/* Tool Card 1: Lesson Planner */}
          <div className={styles.toolCard} onClick={() => setMode('lesson')}>
            <div className={styles.cardIconWrapper}>
              <Calendar size={28} />
            </div>
            <div className={styles.cardBody}>
              <h3>AI Lesson Planner</h3>
              <p>Draft fully time-blocked lesson plans with custom objectives, materials checklist, and homework templates.</p>
              <span className={styles.arrowLabel}>Open Lesson Planner &rarr;</span>
            </div>
          </div>

          {/* Tool Card 2: Rubric Maker */}
          <div className={styles.toolCard} onClick={() => setMode('rubric')}>
            <div className={styles.cardIconWrapper}>
              <BookOpen size={28} />
            </div>
            <div className={styles.cardBody}>
              <h3>AI Rubric Maker</h3>
              <p>Generate clean, detailed grading matrices mapping criteria points and detailed expectation paragraphs.</p>
              <span className={styles.arrowLabel}>Open Rubric Maker &rarr;</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State Overlay
  if (isToolkitLoading) {
    return (
      <div className={styles.loaderOverlay}>
        <Loader2 className={styles.spinningLoader} size={48} />
        <h2>Questra AI Drafting Material...</h2>
        <p>Gemini is structuring objectives, time blocks, and performance descriptors.</p>
      </div>
    );
  }

  // 3. Rubric Creator View
  if (mode === 'rubric') {
    return (
      <div className={styles.container}>
        <div className={styles.detailHeader}>
          <button className={styles.backBtn} onClick={handleBackToSelect}>
            <ArrowLeft size={16} />
            <span>Toolkit Home</span>
          </button>
          <h2>AI Rubric Maker</h2>
        </div>

        {!activeRubric ? (
          /* Rubric Form */
          <div className={styles.formCard}>
            <form onSubmit={handleRubricSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="rubricTitle">Assignment Title / Prompt *</label>
                <input
                  id="rubricTitle"
                  type="text"
                  placeholder="e.g. Persuasive Essay on Climate Change"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="rubricGrade">Target Grade Level *</label>
                <input
                  id="rubricGrade"
                  type="text"
                  placeholder="e.g. Grade 9"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className={styles.generateBtn}>
                <Sparkles size={16} />
                <span>Generate Grading Rubric</span>
              </button>
            </form>
          </div>
        ) : (
          /* Rubric Output Display */
          <div className={styles.outputContainer}>
            <div className={styles.outputActionBar}>
              <h3>Generated Rubric Matrix</h3>
              <div className={styles.actionCluster}>
                <button className={styles.actionBtn} onClick={handleCopyToClipboard}>
                  {copied ? <Check size={16} /> : <FileText size={16} />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>

                {!downloadPath ? (
                  <button className={styles.actionBtn} onClick={handleExportPdf} disabled={exporting}>
                    {exporting ? <Loader2 size={16} className={styles.spinningIcon} /> : <Download size={16} />}
                    <span>Compile PDF</span>
                  </button>
                ) : (
                  <a href={`http://localhost:5000${downloadPath}`} target="_blank" rel="noreferrer" className={styles.downloadLinkBtn}>
                    <CheckCircle size={16} />
                    <span>Download PDF</span>
                  </a>
                )}
              </div>
            </div>

            <div className={styles.rubricDoc}>
              <h1 className={styles.docTitle}>{activeRubric.title}</h1>
              <p className={styles.docSubtitle}>Grade Level: {activeRubric.grade}</p>

              <div className={styles.rubricGrid}>
                {activeRubric.criteria.map((crit, cIdx) => (
                  <div key={cIdx} className={styles.criteriaCard}>
                    <div className={styles.criteriaHeader}>
                      <h4>{crit.name}</h4>
                      <span className={styles.pointsBadge}>{crit.maxPoints} Max Points</span>
                    </div>

                    <div className={styles.levelsList}>
                      {crit.levels.map((lvl, lIdx) => (
                        <div key={lIdx} className={styles.levelRow}>
                          <div className={styles.levelNameCol}>
                            <span className={styles.levelPoints}>{lvl.points} pts</span>
                            <span className={styles.levelName}>{lvl.name}</span>
                          </div>
                          <div className={styles.levelDescCol}>
                            <p>{lvl.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. Lesson Planner View
  if (mode === 'lesson') {
    return (
      <div className={styles.container}>
        <div className={styles.detailHeader}>
          <button className={styles.backBtn} onClick={handleBackToSelect}>
            <ArrowLeft size={16} />
            <span>Toolkit Home</span>
          </button>
          <h2>AI Lesson Planner</h2>
        </div>

        {!activeLessonPlan ? (
          /* Lesson Planner Form */
          <div className={styles.formCard}>
            <form onSubmit={handleLessonSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="lessonTopic">Lesson Topic / Focus *</label>
                <input
                  id="lessonTopic"
                  type="text"
                  placeholder="e.g. Introduction to Photosynthesis"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="lessonGrade">Target Grade Level *</label>
                  <input
                    id="lessonGrade"
                    type="text"
                    placeholder="e.g. Grade 7"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lessonDuration">Lesson Duration *</label>
                  <input
                    id="lessonDuration"
                    type="text"
                    placeholder="e.g. 45 minutes"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.generateBtn}>
                <Sparkles size={16} />
                <span>Generate Lesson Plan</span>
              </button>
            </form>
          </div>
        ) : (
          /* Lesson Planner Output Display */
          <div className={styles.outputContainer}>
            <div className={styles.outputActionBar}>
              <h3>Generated Lesson Plan</h3>
              <div className={styles.actionCluster}>
                <button className={styles.actionBtn} onClick={handleCopyToClipboard}>
                  {copied ? <Check size={16} /> : <FileText size={16} />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>

                {!downloadPath ? (
                  <button className={styles.actionBtn} onClick={handleExportPdf} disabled={exporting}>
                    {exporting ? <Loader2 size={16} className={styles.spinningIcon} /> : <Download size={16} />}
                    <span>Compile PDF</span>
                  </button>
                ) : (
                  <a href={`http://localhost:5000${downloadPath}`} target="_blank" rel="noreferrer" className={styles.downloadLinkBtn}>
                    <CheckCircle size={16} />
                    <span>Download PDF</span>
                  </a>
                )}
              </div>
            </div>

            <div className={styles.lessonDoc}>
              <h1 className={styles.docTitle}>{activeLessonPlan.topic}</h1>
              <div className={styles.docMetaRow}>
                <span>Grade: {activeLessonPlan.grade}</span>
                <span>•</span>
                <span>Duration: {activeLessonPlan.duration}</span>
              </div>

              {/* Objectives */}
              <div className={styles.lessonSection}>
                <h3 className={styles.sectionHeading}>Learning Objectives</h3>
                <ul className={styles.bulletList}>
                  {activeLessonPlan.objectives.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>
              </div>

              {/* Materials */}
              <div className={styles.lessonSection}>
                <h3 className={styles.sectionHeading}>Required Materials</h3>
                <ul className={styles.bulletList}>
                  {activeLessonPlan.materials.map((mat, idx) => (
                    <li key={idx}>{mat}</li>
                  ))}
                </ul>
              </div>

              {/* Schedule Timeline */}
              <div className={styles.lessonSection}>
                <h3 className={styles.sectionHeading}>Lesson Schedule & Activities</h3>
                <div className={styles.timeline}>
                  {activeLessonPlan.activities.map((act, idx) => (
                    <div key={idx} className={styles.timelineItem}>
                      <div className={styles.timelineDuration}>
                        <Clock size={12} />
                        <span>{act.duration}</span>
                      </div>
                      <div className={styles.timelineContent}>
                        <h4>{act.name}</h4>
                        <p>{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Homework */}
              {activeLessonPlan.homework && (
                <div className={styles.lessonSection}>
                  <h3 className={styles.sectionHeading}>Homework Assignment</h3>
                  <p className={styles.homeworkText}>{activeLessonPlan.homework}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
