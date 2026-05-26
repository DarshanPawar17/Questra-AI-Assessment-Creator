'use client';

import { useStore } from '@/store/useStore';
import Sidebar from './Sidebar';
import AssignmentsDashboard from './AssignmentsDashboard';
import GroupsDashboard from './GroupsDashboard';
import { Sparkles, BookOpen, Users, Settings as SettingsIcon, FileText, Home as HomeIcon, LogOut, CheckCircle, Clock } from 'lucide-react';
import styles from './DashboardShell.module.css';

export default function DashboardShell() {
  const { activeTab, user, logout, totalAssignments } = useStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'assignments':
        return <AssignmentsDashboard />;

      case 'home':
        return (
          <div className={styles.container}>
            <div className={styles.welcomeBanner}>
              <h1 className={styles.welcomeTitle}>Welcome back, {user?.username}!</h1>
              <p className={styles.welcomeSub}>
                Manage your classes, generate outstanding assignments, and organize study libraries with Questra.
              </p>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <FileText className={styles.statIcon} size={24} />
                <div className={styles.statDetails}>
                  <span className={styles.statVal}>{totalAssignments}</span>
                  <span className={styles.statLbl}>Created Papers</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <Users className={styles.statIcon} size={24} />
                <div className={styles.statDetails}>
                  <span className={styles.statVal}>3</span>
                  <span className={styles.statLbl}>Active Groups</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <BookOpen className={styles.statIcon} size={24} />
                <div className={styles.statDetails}>
                  <span className={styles.statVal}>12</span>
                  <span className={styles.statLbl}>Library Resources</span>
                </div>
              </div>
            </div>

            <div className={styles.dashboardSection}>
              <h2 className={styles.sectionTitle}>Quick Start</h2>
              <div className={styles.quickStartGrid}>
                <div className={styles.quickStartCard}>
                  <Sparkles size={28} className={styles.orangeIcon} />
                  <h3>AI Assessment Draft</h3>
                  <p>Upload files or syllabus and let Gemini draft standard questions instantly.</p>
                </div>
                <div className={styles.quickStartCard}>
                  <Users size={28} className={styles.orangeIcon} />
                  <h3>Assign to Class Group</h3>
                  <p>Group students, assign papers, and review average scores seamlessly.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'groups':
        return <GroupsDashboard />;

      case 'toolkit':
        return (
          <div className={styles.placeholderContainer}>
            <Sparkles size={48} className={styles.placeholderIcon} />
            <h2>AI Teacher's Toolkit</h2>
            <p>Access Quiz Generators, Rubric Makers, and Lesson Planners. (Feature coming soon)</p>
          </div>
        );

      case 'library':
        return (
          <div className={styles.placeholderContainer}>
            <BookOpen size={48} className={styles.placeholderIcon} />
            <h2>My Library</h2>
            <p>Access uploaded study guides, syllabi files, and template papers. (Feature coming soon)</p>
          </div>
        );

      case 'settings':
        return (
          <div className={styles.placeholderContainer}>
            <SettingsIcon size={48} className={styles.placeholderIcon} />
            <h2>System Settings</h2>
            <p>Manage account notifications, API endpoints, and template default layouts. (Feature coming soon)</p>
          </div>
        );

      default:
        return <AssignmentsDashboard />;
    }
  };

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.contentInner}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
