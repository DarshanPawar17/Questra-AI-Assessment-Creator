'use client';

import { useState, useEffect, useRef, FormEvent, DragEvent, ChangeEvent } from 'react';
import { useStore } from '@/store/useStore';
import {
  Plus,
  BookOpen,
  FileText,
  Trash2,
  X,
  Loader2,
  Download,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import styles from './LibraryDashboard.module.css';

export default function LibraryDashboard() {
  const {
    libraryDocs,
    isLibraryLoading,
    libraryError,
    fetchLibraryDocs,
    uploadLibraryDoc,
    deleteLibraryDoc
  } = useStore();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterFileType, setFilterFileType] = useState('');

  // Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docSubject, setDocSubject] = useState('');
  const [docGrade, setDocGrade] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch library documents on mount
  useEffect(() => {
    fetchLibraryDocs();
  }, [fetchLibraryDocs]);

  // Handle document deletion
  const handleDeleteDoc = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}" from your library? This physical file will be removed from disk.`)) {
      try {
        await deleteLibraryDoc(id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete document.');
      }
    }
  };

  // Drag & Drop Handlers
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf' || ext === 'docx' || ext === 'txt') {
        setSelectedFile(file);
        // Pre-fill title if empty
        if (!docTitle) {
          setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      } else {
        alert('Unsupported file format. Please upload PDF, Word (.docx), or Text (.txt) files.');
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit new document upload
  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    setUploading(true);
    try {
      await uploadLibraryDoc(
        selectedFile,
        docTitle.trim() || selectedFile.name,
        docSubject.trim(),
        docGrade.trim(),
        docDesc.trim()
      );
      // Close modal and reset fields
      setShowUploadModal(false);
      resetFormFields();
    } catch (err: any) {
      alert(err.message || 'Error uploading document.');
    } finally {
      setUploading(false);
    }
  };

  const resetFormFields = () => {
    setSelectedFile(null);
    setDocTitle('');
    setDocSubject('');
    setDocGrade('');
    setDocDesc('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format Helper: date string
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Format Helper: file size in human readable format
  const formatBytes = (bytes: number = 0) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Filtered lists logic
  const filteredDocs = libraryDocs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.subject && doc.subject.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSubject = filterSubject ? doc.subject === filterSubject : true;
    const matchesGrade = filterGrade ? doc.grade === filterGrade : true;
    const matchesFileType = filterFileType ? doc.fileType === filterFileType : true;

    return matchesSearch && matchesSubject && matchesGrade && matchesFileType;
  });

  // Extract unique subjects and grades for filters list
  const uniqueSubjects = Array.from(new Set(libraryDocs.map((d) => d.subject).filter(Boolean)));
  const uniqueGrades = Array.from(new Set(libraryDocs.map((d) => d.grade).filter(Boolean)));

  // Calculate statistics counts
  const totalCount = libraryDocs.length;
  const pdfCount = libraryDocs.filter((d) => d.fileType === 'pdf').length;
  const docxCount = libraryDocs.filter((d) => d.fileType === 'docx').length;
  const txtCount = libraryDocs.filter((d) => d.fileType === 'txt').length;

  return (
    <div className={styles.dashboardContainer}>
      {/* Header Banner */}
      <div className={styles.dashboardHeader}>
        <div>
          <h2 className={styles.headerTitle}>My Study Material Library</h2>
          <p className={styles.headerSubtitle}>
            Store and organize syllabus templates, textbooks, and reading modules. Use them directly to generate future exam papers.
          </p>
        </div>
        <button className={styles.uploadDocBtn} onClick={() => setShowUploadModal(true)}>
          <Plus size={16} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Stats Indicator Cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <BookOpen size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{totalCount}</span>
            <span className={styles.statLbl}>Total Materials</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.pdfIcon}`}>
            <FileText size={20} style={{ color: '#e74c3c' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{pdfCount}</span>
            <span className={styles.statLbl}>PDF Documents</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.docxIcon}`}>
            <FileText size={20} style={{ color: '#3498db' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{docxCount}</span>
            <span className={styles.statLbl}>Word Files</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.txtIcon}`}>
            <FileText size={20} style={{ color: '#7f8c8d' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{txtCount}</span>
            <span className={styles.statLbl}>Text Files</span>
          </div>
        </div>
      </div>

      {/* Filters and Searching */}
      <div className={styles.filterRow}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search documents in library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Subjects</option>
          {uniqueSubjects.map((sub, idx) => (
            <option key={idx} value={sub}>{sub}</option>
          ))}
        </select>

        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Grades</option>
          {uniqueGrades.map((g, idx) => (
            <option key={idx} value={g}>{g}</option>
          ))}
        </select>

        <select
          value={filterFileType}
          onChange={(e) => setFilterFileType(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Formats</option>
          <option value="pdf">PDF (.pdf)</option>
          <option value="docx">Word (.docx)</option>
          <option value="txt">Text (.txt)</option>
        </select>
      </div>

      {/* Documents Grid Display */}
      {isLibraryLoading && libraryDocs.length === 0 ? (
        <div className={styles.loadingScreen}>
          <Loader2 className={styles.spinningIcon} size={32} />
          <p>Restoring study guide library...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className={styles.emptyContainer}>
          <BookOpen size={64} className={styles.emptyIcon} />
          <h3>No Library Documents Found</h3>
          <p>
            {libraryDocs.length === 0
              ? 'Save reference sheets, reading passages, or course guidelines to generate assessments from them.'
              : 'Try matching other keywords or clearing the category filter parameters.'}
          </p>
          {libraryDocs.length === 0 && (
            <button className={styles.emptyUploadBtn} onClick={() => setShowUploadModal(true)}>
              <Plus size={16} />
              <span>Upload Reference Document</span>
            </button>
          )}
        </div>
      ) : (
        <div className={styles.docsGrid}>
          {filteredDocs.map((doc) => {
            const ext = doc.fileType || 'other';
            return (
              <div key={doc._id} className={styles.docCard}>
                <div className={styles.cardTop}>
                  <div className={`${styles.fileIconBox} ${styles[ext]}`}>
                    <FileText size={20} />
                  </div>
                  <div className={styles.cardHeadInfo}>
                    <h4 className={styles.docTitle} title={doc.title}>
                      {doc.title}
                    </h4>
                    <span className={styles.docDate}>
                      Uploaded: {formatDate(doc.createdAt)}
                    </span>
                  </div>
                </div>

                {doc.description && (
                  <p className={styles.docDesc} title={doc.description}>
                    {doc.description}
                  </p>
                )}

                <div className={styles.cardBadges}>
                  <span className={`${styles.badge} ${styles.fileExt}`}>{doc.fileType}</span>
                  {doc.subject && <span className={styles.badge}>{doc.subject}</span>}
                  {doc.grade && <span className={styles.badge}>{doc.grade}</span>}
                </div>

                <div className={styles.cardActions}>
                  <a
                    href={`http://localhost:5000${doc.filePath}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Download Source Document"
                    className={styles.actionBtn}
                    download
                  >
                    <Download size={14} />
                  </a>
                  <button
                    className={`${styles.actionBtn} ${styles.delete}`}
                    onClick={() => handleDeleteDoc(doc._id, doc.title)}
                    title="Delete Document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Upload Study Material</h3>
              <button onClick={() => setShowUploadModal(false)} className={styles.closeModalBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className={styles.modalForm}>
              {/* File Upload Drag Drop Box */}
              {!selectedFile ? (
                <div
                  className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                  />
                  <FileText className={styles.dropzoneIcon} size={36} />
                  <h4>Drag and drop study sheet here</h4>
                  <p>Supports PDF, Word (.docx), or Text (.txt) up to 50MB</p>
                </div>
              ) : (
                <div className={styles.selectedFileBar}>
                  <FileText size={20} className={styles.dropzoneIcon} />
                  <div className={styles.selectedFileInfo}>
                    <span className={styles.selectedFileName}>{selectedFile.name}</span>
                    <span className={styles.selectedFileSize}>{formatBytes(selectedFile.size)}</span>
                  </div>
                  <button type="button" onClick={handleRemoveFile} className={styles.removeFileBtn}>
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="uploadDocTitle">Material Title *</label>
                <input
                  id="uploadDocTitle"
                  type="text"
                  placeholder="e.g. Chapter 4 Photosynthesis Guide"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="uploadDocSubject">Subject Tag</label>
                  <input
                    id="uploadDocSubject"
                    type="text"
                    placeholder="e.g. Biology"
                    value={docSubject}
                    onChange={(e) => setDocSubject(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="uploadDocGrade">Grade Level</label>
                  <input
                    id="uploadDocGrade"
                    type="text"
                    placeholder="e.g. Grade 7"
                    value={docGrade}
                    onChange={(e) => setDocGrade(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="uploadDocDesc">Brief Description</label>
                <textarea
                  id="uploadDocDesc"
                  placeholder="Describe what study syllabus, notes or reference material is in this document..."
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className={styles.cancelBtn}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className={styles.spinningIcon} size={16} />
                      <span>Parsing Text...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Add to Library</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
