'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useStore } from '@/store/useStore';
import {
  Plus,
  Users,
  FileText,
  Trash2,
  Edit2,
  ArrowLeft,
  Calendar,
  ChevronRight,
  X,
  BookOpen,
  Info,
  Loader2,
  Download
} from 'lucide-react';
import styles from './GroupsDashboard.module.css';
import { IAssignment, IGroup } from '@/lib/api';

export default function GroupsDashboard() {
  const {
    groups,
    assignments,
    isGroupsLoading,
    groupsError,
    activeGroup,
    fetchGroups,
    fetchGroupDetails,
    createGroup,
    updateGroup,
    deleteGroup,
    assignPaperToGroup,
    setActiveAssignment,
    setActiveTab
  } = useStore();

  // Modal / Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Group Form Inputs
  const [groupName, setGroupName] = useState('');
  const [groupGrade, setGroupGrade] = useState('');
  const [groupSubject, setGroupSubject] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [studentsInput, setStudentsInput] = useState('');

  // Assign Form Inputs
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');

  // Roster quick-add input
  const [newStudentName, setNewStudentName] = useState('');

  // Tab state inside group details
  const [detailTab, setDetailTab] = useState<'roster' | 'assignments'>('roster');

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Load active group details when selected
  const handleSelectGroup = async (groupId: string) => {
    await fetchGroupDetails(groupId);
    setDetailTab('roster');
  };

  const handleCloseDetail = () => {
    useStore.setState({ activeGroup: null });
  };

  // --- Handlers ---

  const handleCreateGroupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !groupGrade.trim() || !groupSubject.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    // Split students by newline or comma
    const students = studentsInput
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      await createGroup({
        name: groupName.trim(),
        grade: groupGrade.trim(),
        subject: groupSubject.trim(),
        description: groupDesc.trim(),
        students
      });
      setShowCreateModal(false);
      resetGroupFormFields();
    } catch (err) {
      alert('Error creating class group.');
    }
  };

  const handleOpenEditModal = () => {
    if (!activeGroup) return;
    setGroupName(activeGroup.name);
    setGroupGrade(activeGroup.grade);
    setGroupSubject(activeGroup.subject);
    setGroupDesc(activeGroup.description || '');
    setStudentsInput(activeGroup.students.join('\n'));
    setShowEditModal(true);
  };

  const handleEditGroupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    if (!groupName.trim() || !groupGrade.trim() || !groupSubject.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const students = studentsInput
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      await updateGroup(activeGroup._id, {
        name: groupName.trim(),
        grade: groupGrade.trim(),
        subject: groupSubject.trim(),
        description: groupDesc.trim(),
        students
      });
      setShowEditModal(false);
    } catch (err) {
      alert('Error updating class group.');
    }
  };

  const handleDeleteGroupClick = async () => {
    if (!activeGroup) return;
    if (confirm(`Are you sure you want to delete "${activeGroup.name}"? This cannot be undone.`)) {
      try {
        await deleteGroup(activeGroup._id);
        handleCloseDetail();
      } catch (err) {
        alert('Error deleting group.');
      }
    }
  };

  const handleAddStudentQuick = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !newStudentName.trim()) return;

    const updatedStudents = [...activeGroup.students, newStudentName.trim()];
    try {
      await updateGroup(activeGroup._id, {
        name: activeGroup.name,
        grade: activeGroup.grade,
        subject: activeGroup.subject,
        students: updatedStudents
      });
      setNewStudentName('');
    } catch (err) {
      alert('Error adding student to roster.');
    }
  };

  const handleRemoveStudentClick = async (studentName: string) => {
    if (!activeGroup) return;
    if (confirm(`Remove "${studentName}" from the class roster?`)) {
      const updatedStudents = activeGroup.students.filter((s) => s !== studentName);
      try {
        await updateGroup(activeGroup._id, {
          name: activeGroup.name,
          grade: activeGroup.grade,
          subject: activeGroup.subject,
          students: updatedStudents
        });
      } catch (err) {
        alert('Error removing student from roster.');
      }
    }
  };

  const handleAssignPaperSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !selectedAssignmentId) {
      alert('Please select an assessment to assign.');
      return;
    }

    try {
      await assignPaperToGroup(activeGroup._id, selectedAssignmentId, dueDateInput || undefined);
      setShowAssignModal(false);
      setSelectedAssignmentId('');
      setDueDateInput('');
    } catch (err: any) {
      alert(err.message || 'Error distributing paper.');
    }
  };

  const resetGroupFormFields = () => {
    setGroupName('');
    setGroupGrade('');
    setGroupSubject('');
    setGroupDesc('');
    setStudentsInput('');
  };

  // Helper formatting for dates
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // --- RENDERING VIEWS ---

  // 1. Loading View
  if (isGroupsLoading && !activeGroup && groups.length === 0) {
    return (
      <div className={styles.loadingScreen}>
        <Loader2 className={styles.spinningIcon} size={32} />
        <p>Loading groups & rosters...</p>
      </div>
    );
  }

  // 2. Class Detail View
  if (activeGroup) {
    return (
      <div className={styles.detailContainer}>
        {/* Detail Header */}
        <div className={styles.detailHeader}>
          <button className={styles.backBtn} onClick={handleCloseDetail}>
            <ArrowLeft size={16} />
            <span>All Groups</span>
          </button>
          
          <div className={styles.headerActionContainer}>
            <button className={styles.editBtn} onClick={handleOpenEditModal}>
              <Edit2 size={14} />
              <span>Edit Class</span>
            </button>
            <button className={styles.deleteBtn} onClick={handleDeleteGroupClick}>
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Group Meta Info Banner */}
        <div className={styles.groupMetaBanner}>
          <div className={styles.bannerInfo}>
            <h2 className={styles.bannerTitle}>{activeGroup.name}</h2>
            {activeGroup.description && (
              <p className={styles.bannerDesc}>{activeGroup.description}</p>
            )}
            <div className={styles.bannerMetaGrid}>
              <span className={styles.bannerMetaItem}>
                <BookOpen size={15} />
                <span>{activeGroup.grade}</span>
              </span>
              <span className={styles.bannerMetaItem}>
                <BookOpen size={15} />
                <span>{activeGroup.subject}</span>
              </span>
              <span className={styles.bannerMetaItem}>
                <Users size={15} />
                <span>{activeGroup.students.length} Students</span>
              </span>
              <span className={styles.bannerMetaItem}>
                <FileText size={15} />
                <span>{activeGroup.assignments.length} Papers Assigned</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tabs Control */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${detailTab === 'roster' ? styles.tabBtnActive : ''}`}
            onClick={() => setDetailTab('roster')}
          >
            <Users size={16} />
            <span>Class Roster ({activeGroup.students.length})</span>
          </button>
          <button
            className={`${styles.tabBtn} ${detailTab === 'assignments' ? styles.tabBtnActive : ''}`}
            onClick={() => setDetailTab('assignments')}
          >
            <FileText size={16} />
            <span>Assigned Papers ({activeGroup.assignments.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className={styles.tabBody}>
          {/* Tab 1: Class Roster */}
          {detailTab === 'roster' && (
            <div className={styles.rosterSection}>
              <form className={styles.quickAddForm} onSubmit={handleAddStudentQuick}>
                <input
                  type="text"
                  placeholder="Enter student name or email to add..."
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className={styles.quickInput}
                />
                <button type="submit" className={styles.quickBtn}>
                  <Plus size={16} />
                  <span>Add Student</span>
                </button>
              </form>

              {activeGroup.students.length === 0 ? (
                <div className={styles.emptyRoster}>
                  <Users size={32} />
                  <p>No students enrolled in this group yet. Add students using the input above.</p>
                </div>
              ) : (
                <div className={styles.rosterList}>
                  {activeGroup.students.map((student, idx) => (
                    <div key={idx} className={styles.studentRow}>
                      <span className={styles.studentIndex}>{idx + 1}</span>
                      <span className={styles.studentName}>{student}</span>
                      <button
                        className={styles.removeStudentBtn}
                        onClick={() => handleRemoveStudentClick(student)}
                        title="Remove student"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Assigned Papers */}
          {detailTab === 'assignments' && (
            <div className={styles.assignmentsSection}>
              <div className={styles.sectionActionBar}>
                <h3>Distributed Assessment Papers</h3>
                <button className={styles.assignBtn} onClick={() => setShowAssignModal(true)}>
                  <Plus size={16} />
                  <span>Assign New Paper</span>
                </button>
              </div>

              {activeGroup.assignments.length === 0 ? (
                <div className={styles.emptyAssignments}>
                  <FileText size={32} />
                  <p>No papers have been assigned to this group yet. Click "Assign New Paper" to distribute one.</p>
                </div>
              ) : (
                <div className={styles.assignedGrid}>
                  {activeGroup.assignments.map((item, idx) => {
                    const asm = item.assignmentId as unknown as IAssignment;
                    if (!asm) return null;
                    return (
                      <div key={idx} className={styles.assignedCard}>
                        <div className={styles.assignedCardHeader}>
                          <h4>{asm.title}</h4>
                          <span className={styles.dateLabel}>
                            Assigned: {formatDate(item.assignedAt)}
                          </span>
                        </div>
                        <div className={styles.assignedCardStats}>
                          <span>Questions: {asm.totalQuestions}</span>
                          <span>•</span>
                          <span>Marks: {asm.totalMarks}</span>
                        </div>
                        {item.dueDate && (
                          <div className={styles.dueDateBadge}>
                            <Calendar size={13} />
                            <span>Due: {formatDate(item.dueDate)}</span>
                          </div>
                        )}
                        <div className={styles.assignedCardActions}>
                          <button
                            onClick={() => {
                              setActiveAssignment(asm);
                              setActiveTab('assignments');
                            }}
                            className={styles.viewPaperLink}
                          >
                            Edit / View Details
                          </button>
                          
                          <div className={styles.downloadCluster}>
                            {asm.pdfPath && (
                              <a
                                href={`http://localhost:5000${asm.pdfPath}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Download student questions PDF"
                                className={styles.downloadMiniBtn}
                              >
                                <Download size={13} />
                                <span>Q-PDF</span>
                              </a>
                            )}
                            {asm.pdfAnswerPath && (
                              <a
                                href={`http://localhost:5000${asm.pdfAnswerPath}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Download teacher answers PDF"
                                className={styles.downloadMiniBtn}
                              >
                                <Download size={13} />
                                <span>A-PDF</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assign Paper Modal */}
        {showAssignModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Assign Paper to {activeGroup.name}</h3>
                <button onClick={() => setShowAssignModal(false)} className={styles.closeModalBtn}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAssignPaperSubmit} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="selectAssignment">Select Assessment Paper</label>
                  <select
                    id="selectAssignment"
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose an Assignment --</option>
                    {assignments
                      .filter((a) => a.status === 'completed')
                      .map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.title} ({a.subject} • {a.grade})
                        </option>
                      ))}
                  </select>
                  <span className={styles.helperText}>
                    Only completed assessment papers are listed.
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="dueDate">Due Date (Optional)</label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                  />
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    Confirm Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Group Modal */}
        {showEditModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Edit Class: {activeGroup.name}</h3>
                <button onClick={() => setShowEditModal(false)} className={styles.closeModalBtn}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditGroupSubmit} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="editGroupName">Class / Group Name *</label>
                  <input
                    id="editGroupName"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="editGroupGrade">Grade Level *</label>
                    <input
                      id="editGroupGrade"
                      type="text"
                      placeholder="e.g. Grade 10"
                      value={groupGrade}
                      onChange={(e) => setGroupGrade(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="editGroupSubject">Subject *</label>
                    <input
                      id="editGroupSubject"
                      type="text"
                      placeholder="e.g. Mathematics"
                      value={groupSubject}
                      onChange={(e) => setGroupSubject(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="editGroupDesc">Description</label>
                  <textarea
                    id="editGroupDesc"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="editGroupRoster">Students List (One student name/email per line)</label>
                  <textarea
                    id="editGroupRoster"
                    placeholder="John Doe&#10;Jane Smith"
                    value={studentsInput}
                    onChange={(e) => setStudentsInput(e.target.value)}
                    rows={5}
                  />
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Primary Class Dashboard List View
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <div>
          <h2 className={styles.headerTitle}>Class Groups & Rosters</h2>
          <p className={styles.headerSubtitle}>
            Organize students, review class distribution lists, and distribute compiled assessment sheets.
          </p>
        </div>
        <button className={styles.createGroupBtn} onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          <span>Create New Class</span>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className={styles.emptyContainer}>
          <Users size={64} className={styles.emptyIcon} />
          <h3>No Class Groups Found</h3>
          <p>Create a class group to manage student rosters, assign generated assessment papers, and track due dates.</p>
          <button className={styles.emptyCreateBtn} onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>Create Your First Class</span>
          </button>
        </div>
      ) : (
        <div className={styles.groupsGrid}>
          {groups.map((group) => (
            <div
              key={group._id}
              className={styles.groupCard}
              onClick={() => handleSelectGroup(group._id)}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{group.name}</h3>
                <ChevronRight className={styles.arrowIcon} size={18} />
              </div>
              
              {group.description && (
                <p className={styles.cardDesc}>{group.description}</p>
              )}

              <div className={styles.cardSpecs}>
                <div className={styles.specBadge}>
                  <BookOpen size={13} />
                  <span>{group.grade}</span>
                </div>
                <div className={styles.specBadge}>
                  <BookOpen size={13} />
                  <span>{group.subject}</span>
                </div>
              </div>

              <div className={styles.cardFooterStats}>
                <span className={styles.footerStat}>
                  <Users size={14} />
                  <strong>{group.students.length}</strong> Students
                </span>
                <span className={styles.footerStat}>
                  <FileText size={14} />
                  <strong>{group.assignments.length}</strong> Assigned Papers
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Create Class Group</h3>
              <button onClick={() => setShowCreateModal(false)} className={styles.closeModalBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="createGroupName">Class / Group Name *</label>
                <input
                  id="createGroupName"
                  type="text"
                  placeholder="e.g. Grade 10 - Algebra"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="createGroupGrade">Grade Level *</label>
                  <input
                    id="createGroupGrade"
                    type="text"
                    placeholder="e.g. Grade 10"
                    value={groupGrade}
                    onChange={(e) => setGroupGrade(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="createGroupSubject">Subject *</label>
                  <input
                    id="createGroupSubject"
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={groupSubject}
                    onChange={(e) => setGroupSubject(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="createGroupDesc">Description (Optional)</label>
                <textarea
                  id="createGroupDesc"
                  placeholder="Provide a brief class syllabus description or details..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  rows={2}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="createGroupRoster">Initial Students List (One student name or email per line)</label>
                <textarea
                  id="createGroupRoster"
                  placeholder="John Doe&#10;Jane Smith"
                  value={studentsInput}
                  onChange={(e) => setStudentsInput(e.target.value)}
                  rows={5}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Create Class Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
