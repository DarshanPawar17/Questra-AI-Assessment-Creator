'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Search, Calendar, Clock, Sparkles, MoreVertical, Download, Eye, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import styles from './AssignmentsDashboard.module.css';
import CreateAssignmentModal from './CreateAssignmentModal';
import AssignmentDetailView from './AssignmentDetailView';
import { IAssignment } from '@/lib/api';

export default function AssignmentsDashboard() {
  const {
    assignments,
    totalAssignments,
    assignmentsPage,
    assignmentsTotalPages,
    isAssignmentsLoading,
    filters,
    setFilters,
    fetchAssignments,
    activeAssignment,
    setActiveAssignment,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Sync search query state with debounced filter setting
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ subject: searchQuery });
    }, 4000); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery, setFilters]);

  // Load assignments on mount
  useEffect(() => {
    fetchAssignments(1);
  }, [fetchAssignments]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= assignmentsTotalPages) {
      fetchAssignments(newPage);
    }
  };

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const closeAll = () => setActiveDropdown(null);
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusClass = (status: IAssignment['status']) => {
    switch (status) {
      case 'completed': return styles.statusCompleted;
      case 'generating': return styles.statusGenerating;
      case 'failed': return styles.statusFailed;
      default: return styles.statusPending;
    }
  };

  const getStatusIcon = (status: IAssignment['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle size={14} className={styles.greenIcon} />;
      case 'generating': return <Loader2 size={14} className={styles.spinningIcon} />;
      case 'failed': return <AlertCircle size={14} className={styles.redIcon} />;
      default: return <Clock size={14} className={styles.grayIcon} />;
    }
  };

  // If viewing details or active generation tracking screen
  if (activeAssignment) {
    return (
      <div className={styles.detailsContainer}>
        <button
          className={styles.backBtn}
          onClick={() => {
            setActiveAssignment(null);
            fetchAssignments(assignmentsPage);
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Assignments</span>
        </button>
        <AssignmentDetailView assignmentId={activeAssignment._id} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header section */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Assignments</h1>
          <p className={styles.subtitle}>
            Create, view, and print generated question papers ({totalAssignments} papers total)
          </p>
        </div>
        <button
          className={styles.createBtn}
          onClick={() => setShowCreateModal(true)}
          id="btn-create-assignment"
        >
          <span className={styles.plusIcon}>+</span>
          Create Assignment
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={18} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by subject name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.filtersWrapper}>
          <select
            className={styles.filterSelect}
            value={filters.grade || ''}
            onChange={(e) => setFilters({ grade: e.target.value })}
          >
            <option value="">All Grades</option>
            <option value="Grade 5">Grade 5</option>
            <option value="Grade 6">Grade 6</option>
            <option value="Grade 7">Grade 7</option>
            <option value="Grade 8">Grade 8</option>
            <option value="Grade 9">Grade 9</option>
            <option value="Grade 10">Grade 10</option>
            <option value="Grade 11">Grade 11</option>
            <option value="Grade 12">Grade 12</option>
          </select>

          <select
            className={styles.filterSelect}
            value={filters.status || ''}
            onChange={(e) => setFilters({ status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="generating">Generating</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Grid view */}
      {isAssignmentsLoading ? (
        <div className={styles.loader}>
          <Loader2 size={36} className={styles.spinningIcon} />
          <p>Fetching assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={48} className={styles.emptyIcon} />
          <h3>No assignments found</h3>
          <p>Modify your search criteria or create a new question paper powered by AI.</p>
          <button className={styles.createBtnSecondary} onClick={() => setShowCreateModal(true)}>
            + Create Your First Paper
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {assignments.map((asm) => (
            <div
              key={asm._id}
              className={styles.card}
              onClick={() => setActiveAssignment(asm)}
            >
              <div className={styles.cardHeader}>
                <div className={`${styles.statusLabel} ${getStatusClass(asm.status)}`}>
                  {getStatusIcon(asm.status)}
                  <span className={styles.statusText}>{asm.status}</span>
                </div>
                <div className={styles.actionMenu}>
                  <button
                    className={styles.menuBtn}
                    onClick={(e) => toggleDropdown(asm._id, e)}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {activeDropdown === asm._id && (
                    <div className={styles.dropdown}>
                      <button onClick={() => setActiveAssignment(asm)}>
                        <Eye size={14} /> View Details
                      </button>
                      {asm.pdfPath && (
                        <a
                          href={`http://localhost:5000${asm.pdfPath}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={14} /> Questions PDF
                        </a>
                      )}
                      {asm.pdfAnswerPath && (
                        <a
                          href={`http://localhost:5000${asm.pdfAnswerPath}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={14} /> Answer Key PDF
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <h3 className={styles.cardTitle}>{asm.title}</h3>
              <div className={styles.cardMeta}>
                <span>{asm.subject}</span>
                <span className={styles.bullet}>•</span>
                <span>{asm.grade}</span>
              </div>

              <div className={styles.cardStats}>
                <div className={styles.statBox}>
                  <span className={styles.statValue}>{asm.totalQuestions}</span>
                  <span className={styles.statLabel}>Questions</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statValue}>{asm.totalMarks}</span>
                  <span className={styles.statLabel}>Marks</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statValue}>{asm.timeLimit ? `${asm.timeLimit}m` : '--'}</span>
                  <span className={styles.statLabel}>Duration</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.footerItem}>
                  <Calendar size={14} />
                  <span>Due {formatDate(asm.dueDate)}</span>
                </div>
                {asm.status === 'generating' && (
                  <div className={styles.generatingBadge}>
                    <Sparkles size={12} className={styles.sparkleIcon} />
                    <span>AI generating</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {assignmentsTotalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={assignmentsPage === 1}
            onClick={() => handlePageChange(assignmentsPage - 1)}
          >
            Prev
          </button>
          <span className={styles.pageInfo}>
            Page {assignmentsPage} of {assignmentsTotalPages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={assignmentsPage === assignmentsTotalPages}
            onClick={() => handlePageChange(assignmentsPage + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateAssignmentModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
