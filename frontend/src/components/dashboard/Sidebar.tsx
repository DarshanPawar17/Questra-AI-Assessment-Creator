'use client';

import { useStore } from '@/store/useStore';
import {
  Home,
  Users,
  FileText,
  Sparkles,
  BookOpen,
  Settings,
  LogOut,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'groups' as const, label: 'My Groups', icon: Users },
  { id: 'assignments' as const, label: 'Assignments', icon: FileText },
  { id: 'toolkit' as const, label: "AI Teacher's Toolkit", icon: Sparkles },
  { id: 'library' as const, label: 'My Library', icon: BookOpen },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, activeTab, setActiveTab, logout } = useStore();

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>Q</div>
        <span className={styles.logoText}>Questra</span>
      </div>

      {/* Create New Button */}
      <button
        className={styles.createBtn}
        onClick={() => setActiveTab('assignments')}
        id="sidebar-create-new"
      >
        <span className={styles.createIcon}>+</span>
        Create New
      </button>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab(item.id)}
              id={`sidebar-nav-${item.id}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
              {item.id === 'assignments' && (
                <span className={styles.activeDot} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile */}
      <div className={styles.profile}>
        <div className={styles.profileInfo}>
          <div className={styles.profileAvatar}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className={styles.profileDetails}>
            <span className={styles.profileName}>{user?.username || 'User'}</span>
            <span className={styles.profileRole}>{user?.role || 'teacher'}</span>
          </div>
        </div>
        <button
          className={styles.logoutBtn}
          onClick={logout}
          id="sidebar-logout"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
