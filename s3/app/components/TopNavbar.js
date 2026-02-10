'use client';

import { useState, useEffect } from 'react';

export default function TopNavbar({ onLogout, user }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New job recommendation available', time: '2 min ago', unread: true, type: 'job' },
    { id: 2, message: 'Resume analysis completed', time: '1 hour ago', unread: true, type: 'resume' },
    { id: 3, message: 'Mentor session scheduled', time: '3 hours ago', unread: false, type: 'mentor' },
  ]);

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new notifications
      const newNotification = {
        id: Date.now(),
        message: 'New message from mentor',
        time: 'Just now',
        unread: true,
        type: 'mentor'
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    }, 30000); // Add new notification every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job': return 'fas fa-briefcase';
      case 'resume': return 'fas fa-file-alt';
      case 'mentor': return 'fas fa-users';
      default: return 'fas fa-bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'job': return 'text-blue-600';
      case 'resume': return 'text-green-600';
      case 'mentor': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const resumeScore = user?.resumeScore;
  const userRole = user?.role || 'Student';

  return (
    <div className="top-navbar">
      <div className="navbar-left">
        <div className="search-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search jobs, mentors, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* Center status: AI glow + resume score */}
      <div className="navbar-center ai-status">
        <div className="ai-indicator">
          <i className="fas fa-robot"></i>
          <span className="ai-text">AI Active</span>
          <span className="ai-glow"></span>
        </div>
        <div className="score-pill" title={`${resumeScore}/100`}>
          <span className="score-label">Resume Score</span>
          <div className="score-bar">
            <div
              className="score-fill"
              style={{ width: `${Math.min(Math.max(resumeScore ?? 0, 0), 100)}%` }}
            />
          </div>
          <span className="score-value">{resumeScore != null ? `${resumeScore}/100` : '—'}</span>
        </div>
      </div>

      <div className="navbar-right">
        {/* Notifications */}
        <div className="notifications-dropdown">
          <button 
            className="notification-btn" 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            aria-label="Notifications"
          >
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          
          {isNotificationsOpen && (
            <div className="notifications-panel">
              <div className="notifications-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="mark-all-read" onClick={markAllAsRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notifications-list">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notification.unread ? 'unread' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className={`notification-icon ${getNotificationColor(notification.type)}`}>
                        <i className={getNotificationIcon(notification.type)}></i>
                      </div>
                      <div className="notification-content">
                        <p className="notification-message">{notification.message}</p>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                      {notification.unread && <div className="unread-dot"></div>}
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">
                    <i className="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="profile-dropdown">
          <button 
            className="profile-btn"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-label="Profile menu"
          >
            <div className="profile-avatar">
              {user?.profile?.avatar ? (
                <img src={user.profile.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>
            <div className="profile-info">
              <span className="profile-name">{user?.name || 'User'}</span>
              <span className="profile-role">{userRole}</span>
            </div>
            <i className={`fas fa-chevron-${isProfileOpen ? 'up' : 'down'}`}></i>
          </button>

          {isProfileOpen && (
            <div className="profile-panel">
              <div className="profile-header">
                <div className="profile-avatar-large">
                  {user?.profile?.avatar ? (
                    <img src={user.profile.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>
                <div className="profile-details">
                  <h3>{user?.name || 'User'}</h3>
                  <p className="profile-role-text">{userRole}</p>
                  <p className="email">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
              <div className="profile-menu">
                <button className="profile-menu-item">
                  <i className="fas fa-user-circle"></i>
                  <span>My Profile</span>
                </button>
                <button className="profile-menu-item">
                  <i className="fas fa-cog"></i>
                  <span>Settings</span>
                </button>
                <button className="profile-menu-item">
                  <i className="fas fa-question-circle"></i>
                  <span>Help & Support</span>
                </button>
                <hr className="profile-divider" />
                <button 
                  className="profile-menu-item text-red-600"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(isProfileOpen || isNotificationsOpen) && (
        <div 
          className="dropdown-overlay"
          onClick={() => {
            setIsProfileOpen(false);
            setIsNotificationsOpen(false);
          }}
        />
      )}
    </div>
  );
} 