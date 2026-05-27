'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { authApi } from '@/lib/api';
import { 
  Users as UserIcon, 
  Settings as SlidersIcon, 
  Eye as LockIcon, 
  Trash2, 
  Download, 
  Save, 
  Check, 
  AlertTriangle
} from 'lucide-react';
import styles from './SettingsDashboard.module.css';

type TabType = 'profile' | 'preferences' | 'security' | 'danger';

export default function SettingsDashboard() {
  const { user, updateProfile, updatePassword, deleteAccount } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile fields state
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Preference fields state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [defaultGrade, setDefaultGrade] = useState('');
  const [defaultSubject, setDefaultSubject] = useState('');
  const [defaultDifficulty, setDefaultDifficulty] = useState<'Easy' | 'Moderate' | 'Hard'>('Moderate');
  const [defaultQuestionTypes, setDefaultQuestionTypes] = useState<('MCQ' | 'TrueFalse' | 'Descriptive')[]>(['MCQ']);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Danger zone modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');


  // Hydrate fields from user store
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setFullName(user.fullName || '');
      setEmail(user.email || '');

      const prefs = user.preferences;
      if (prefs) {
        setTheme(prefs.theme || 'light');
        setDefaultGrade(prefs.defaultGrade || '');
        setDefaultSubject(prefs.defaultSubject || '');
        setDefaultDifficulty(prefs.defaultDifficulty || 'Moderate');
        setDefaultQuestionTypes(prefs.defaultQuestionTypes || ['MCQ']);
      }
    }
  }, [user]);

  // Reset status after a few seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setStatus({ type: 'error', text: 'Username is required.' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    try {
      await updateProfile({
        username: username.toLowerCase().trim(),
        fullName: fullName.trim(),
        email: email.trim(),
      });
      setStatus({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (defaultQuestionTypes.length === 0) {
      setStatus({ type: 'error', text: 'Select at least one default question type.' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    try {
      await updateProfile({
        preferences: {
          theme,
          defaultGrade,
          defaultSubject,
          defaultDifficulty,
          defaultQuestionTypes,
        },
      });
      setStatus({ type: 'success', text: 'Default preferences saved successfully.' });
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Failed to save preferences.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus({ type: 'error', text: 'All password fields are required.' });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    try {
      await updatePassword({ currentPassword, newPassword });
      setStatus({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleQuestionType = (type: 'MCQ' | 'TrueFalse' | 'Descriptive') => {
    if (defaultQuestionTypes.includes(type)) {
      setDefaultQuestionTypes(defaultQuestionTypes.filter((t) => t !== type));
    } else {
      setDefaultQuestionTypes([...defaultQuestionTypes, type]);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await authApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `questra-data-${user?.username || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Failed to export data.' });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      setStatus({ type: 'error', text: 'Confirmation text is incorrect.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAccount();
      // Zustand state resets, triggering auth routing automatically.
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Failed to delete account.' });
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.headerTitle}>System Settings</h1>
        <p className={styles.headerSub}>Manage user accounts, templates, teaching layouts, and security preferences.</p>
      </div>

      {status && (
        <div className={`${styles.statusMessage} ${status.type === 'success' ? styles.success : styles.error}`}>
          {status.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{status.text}</span>
        </div>
      )}

      <div className={styles.layout}>
        {/* Settings Tab Navigation */}
        <aside className={styles.sidebar}>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTabBtn : ''}`}
            onClick={() => { setActiveTab('profile'); setStatus(null); }}
          >
            <UserIcon size={18} />
            <span>Profile Info</span>
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.activeTabBtn : ''}`}
            onClick={() => { setActiveTab('preferences'); setStatus(null); }}
          >
            <SlidersIcon size={18} />
            <span>Teaching Defaults</span>
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'security' ? styles.activeTabBtn : ''}`}
            onClick={() => { setActiveTab('security'); setStatus(null); }}
          >
            <LockIcon size={18} />
            <span>Security</span>
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'danger' ? styles.activeTabBtn : ''}`}
            onClick={() => { setActiveTab('danger'); setStatus(null); }}
          >
            <Trash2 size={18} />
            <span>Danger Zone</span>
          </button>
        </aside>

        {/* Tab Panels */}
        <main className={styles.panel}>
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className={styles.formGrid}>
              <h2 className={`${styles.panelTitle} ${styles.fullWidth}`}>
                <UserIcon size={22} className={styles.orangeIcon} />
                <span>Profile Settings</span>
              </h2>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Username</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Account Role</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={user?.role ? user.role.toUpperCase() : 'TEACHER'} 
                  disabled
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Full Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. John Doe"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Email Address</label>
                <input 
                  type="email" 
                  className={styles.input} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john.doe@questra.ai"
                />
              </div>

              <div className={`${styles.actions} ${styles.fullWidth}`}>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  <Save size={16} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSubmit} className={styles.formGrid}>
              <h2 className={`${styles.panelTitle} ${styles.fullWidth}`}>
                <SlidersIcon size={22} className={styles.orangeIcon} />
                <span>Default Assessment Preferences</span>
              </h2>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Default Grade Level</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={defaultGrade} 
                  onChange={(e) => setDefaultGrade(e.target.value)}
                  placeholder="e.g. Grade 10"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Default Subject</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={defaultSubject} 
                  onChange={(e) => setDefaultSubject(e.target.value)}
                  placeholder="e.g. Chemistry"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Default Difficulty</label>
                <select 
                  className={styles.select}
                  value={defaultDifficulty}
                  onChange={(e) => setDefaultDifficulty(e.target.value as any)}
                >
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Preferred Interface Theme</label>
                <select 
                  className={styles.select}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                >
                  <option value="light">Questra Light</option>
                  <option value="dark">Questra Dark (Coming Soon)</option>
                  <option value="system">System Default</option>
                </select>
              </div>

              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>Default Question Formats</label>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      className={styles.checkbox}
                      checked={defaultQuestionTypes.includes('MCQ')}
                      onChange={() => toggleQuestionType('MCQ')}
                    />
                    <span>Multiple Choice Questions (MCQ)</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      className={styles.checkbox}
                      checked={defaultQuestionTypes.includes('TrueFalse')}
                      onChange={() => toggleQuestionType('TrueFalse')}
                    />
                    <span>True / False Checkboxes</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      className={styles.checkbox}
                      checked={defaultQuestionTypes.includes('Descriptive')}
                      onChange={() => toggleQuestionType('Descriptive')}
                    />
                    <span>Descriptive & Short Answers</span>
                  </label>
                </div>
              </div>

              <div className={`${styles.actions} ${styles.fullWidth}`}>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  <Save size={16} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Defaults'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className={styles.formGrid}>
              <h2 className={`${styles.panelTitle} ${styles.fullWidth}`}>
                <LockIcon size={22} className={styles.orangeIcon} />
                <span>Security Settings</span>
              </h2>

              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>Current Password</label>
                <input 
                  type="password" 
                  className={styles.input} 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>New Password</label>
                <input 
                  type="password" 
                  className={styles.input} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirm New Password</label>
                <input 
                  type="password" 
                  className={styles.input} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className={`${styles.actions} ${styles.fullWidth}`}>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  <LockIcon size={16} />
                  <span>{isSubmitting ? 'Updating...' : 'Change Password'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'danger' && (
            <div className={styles.cardList}>
              <h2 className={styles.panelTitle}>
                <AlertTriangle size={22} style={{ color: '#D62828' }} />
                <span>Data & Privacy (Danger Zone)</span>
              </h2>

              <div className={styles.dangerCard}>
                <div className={styles.cardText}>
                  <h3>Export All Assessment Data</h3>
                  <p>Download a copy of your assignments, groups, and library documents in a JSON schema.</p>
                </div>
                <button 
                  type="button" 
                  className={styles.exportBtn}
                  onClick={handleExportData}
                >
                  <Download size={16} />
                  <span>Download Export</span>
                </button>
              </div>

              <div className={styles.dangerCard}>
                <div className={styles.cardText}>
                  <h3>Delete User Account</h3>
                  <p>Permanently remove your profile details, assignments, student groups, and uploaded documents from disk. This cannot be undone.</p>
                </div>
                <button 
                  type="button" 
                  className={styles.dangerBtn}
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 size={16} />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete Account Safety Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={24} />
              <h3 className={styles.modalTitle}>Are you absolutely sure?</h3>
            </div>
            
            <p className={styles.modalText}>
              This action is <strong>irreversible</strong>. Deleting your account will destroy your profile and remove all associated assignments (including question sheets and answers PDFs), classrooms, and library items from the server database and disk storage.
            </p>

            <p className={styles.modalText}>
              Please type <strong>DELETE MY ACCOUNT</strong> in the field below to confirm.
            </p>

            <input 
              type="text"
              className={styles.confirmationInput}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
            />

            <div className={styles.modalActions}>
              <button 
                type="button" 
                className={styles.cancelBtn}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={styles.confirmDeleteBtn}
                disabled={deleteConfirmText !== 'DELETE MY ACCOUNT' || isSubmitting}
                onClick={handleDeleteAccount}
              >
                {isSubmitting ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
