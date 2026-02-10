'use client';

import { useState } from 'react';

export default function Sidebar({ activeModule, onModuleChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard (Home)', icon: 'fas fa-home' },
    { id: 'resume-analysis', label: 'Resume Analysis', icon: 'fas fa-file-alt' },
    { id: 'resume-scorecard', label: 'AI Scorecard', icon: 'fas fa-robot' },
    { id: 'job-recommendations', label: 'Job Recommendations', icon: 'fas fa-briefcase' },
    { id: 'progress-tracker', label: 'Progress Tracker', icon: 'fas fa-chart-line' },
    { id: 'mentor-connect', label: 'Mentor Connect', icon: 'fas fa-users' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: 'fas fa-comments' },
    { id: 'settings', label: 'Settings / Profile', icon: 'fas fa-cog' },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <i className="fas fa-rocket"></i>
          {!isCollapsed && <span>Student Success</span>}
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-menu">
          {menuItems.map((item) => (
            <li key={item.id} className={activeModule === item.id ? 'active' : ''}>
              <button
                className="nav-item"
                onClick={() => onModuleChange(item.id)}
                title={isCollapsed ? item.label : ''}
              >
                <i className={item.icon}></i>
                {!isCollapsed && <span>{item.label}</span>}
                {isCollapsed && activeModule === item.id && (
                  <div className="active-indicator"></div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Toggle Button - Always visible */}
      <div className="sidebar-toggle">
        <button 
          className="toggle-btn"
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`fas fa-chevron-${isCollapsed ? 'right' : 'left'}`}></i>
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );
} 