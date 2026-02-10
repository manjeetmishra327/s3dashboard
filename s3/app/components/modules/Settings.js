'use client';

import { useState } from 'react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    role: 'Student',
    bio: 'Passionate software engineer looking for opportunities to grow and contribute to innovative projects.'
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'fas fa-user' },
    { id: 'preferences', label: 'Preferences', icon: 'fas fa-cog' },
    { id: 'notifications', label: 'Notifications', icon: 'fas fa-bell' },
    { id: 'security', label: 'Security', icon: 'fas fa-shield-alt' }
  ];

  return (
    <div className="settings">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="settings-container">
        {/* Settings Tabs */}
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-panel">
              <h2>Profile Information</h2>
              <form className="profile-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={userProfile.location}
                    onChange={(e) => setUserProfile({...userProfile, location: e.target.value})}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={userProfile.role}
                    onChange={(e) => setUserProfile({...userProfile, role: e.target.value})}
                    className="form-select"
                  >
                    <option value="Student">Student</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={userProfile.bio}
                    onChange={(e) => setUserProfile({...userProfile, bio: e.target.value})}
                    className="form-textarea"
                    rows="4"
                  ></textarea>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Save Changes</button>
                  <button type="button" className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="settings-panel">
              <h2>Preferences</h2>
              <div className="preferences-section">
                <h3>Job Search Preferences</h3>
                <div className="preference-item">
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked />
                    <span>Receive job recommendations</span>
                  </label>
                </div>
                <div className="preference-item">
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked />
                    <span>Email notifications for new jobs</span>
                  </label>
                </div>
                <div className="preference-item">
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Remote work only</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-panel">
              <h2>Notification Settings</h2>
              <div className="notification-settings">
                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Email Notifications</h4>
                    <p>Receive updates via email</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                
                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Push Notifications</h4>
                    <p>Receive updates in your browser</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                
                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Mentor Messages</h4>
                    <p>Get notified when mentors respond</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-panel">
              <h2>Security Settings</h2>
              <div className="security-settings">
                <div className="security-item">
                  <h4>Change Password</h4>
                  <p>Update your account password</p>
                  <button className="btn-secondary">Change Password</button>
                </div>
                
                <div className="security-item">
                  <h4>Two-Factor Authentication</h4>
                  <p>Add an extra layer of security to your account</p>
                  <button className="btn-secondary">Enable 2FA</button>
                </div>
                
                <div className="security-item">
                  <h4>Login History</h4>
                  <p>View recent login activity</p>
                  <button className="btn-secondary">View History</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 