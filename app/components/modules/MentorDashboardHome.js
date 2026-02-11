'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export default function MentorDashboardHome({ user }) {
  const firstName = user?.name ? user.name.split(' ')[0] : 'Mentor';

  const [isAvailable, setIsAvailable] = useState(true);

  const studentRequests = useMemo(
    () => [
      { id: 'req_1', name: 'Aarav Mehta', topic: 'DSA Interview Prep', date: 'Today' },
      { id: 'req_2', name: 'Sara Khan', topic: 'Resume Review (Career Strategy)', date: 'Yesterday' },
      { id: 'req_3', name: 'Rohan Patel', topic: 'System Design Basics', date: '2 days ago' },
    ],
    []
  );

  const upcomingSessions = useMemo(
    () => [
      { id: 'sess_1', name: 'Neha Sharma', topic: 'Mock Interview', when: 'Tomorrow · 6:00 PM' },
      { id: 'sess_2', name: 'Kabir Singh', topic: 'Career Roadmap', when: 'Fri · 5:30 PM' },
      { id: 'sess_3', name: 'Isha Verma', topic: 'Project Feedback', when: 'Sun · 11:00 AM' },
    ],
    []
  );

  const stats = useMemo(
    () => [
      { title: 'Total Students Connected', value: '12', icon: 'fas fa-users' },
      { title: 'Pending Requests', value: '3', icon: 'fas fa-inbox' },
      { title: 'Upcoming Sessions', value: '2', icon: 'fas fa-calendar-alt' },
      { title: 'Total Sessions Completed', value: '28', icon: 'fas fa-check-circle' },
    ],
    []
  );

  return (
    <div className="dashboard-home-modern">
      <div className="dashboard-modern-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <motion.div
        className="hero-section-modern"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="welcome-badge">
          <i className="fas fa-compass"></i>
          <span>Mentor Workspace</span>
        </div>
        <h1 className="page-title-modern">Mentor Dashboard</h1>
        <p className="page-subtitle-modern">Manage your sessions and student connections</p>
        <p className="page-tagline-modern">Welcome back, {firstName}. Stay on top of requests, schedule, and availability.</p>
      </motion.div>

      <div className="stats-overview-modern">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            className="stat-card-modern glass-card secondary"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <div className="stat-card-top">
              <div className="stat-icon-modern from-purple-500 to-purple-600">
                <i className={stat.icon}></i>
              </div>
              <div className="stat-trend-modern" style={{ opacity: 0.85 }}>
                <i className="fas fa-sparkles"></i>
                <span>Active</span>
              </div>
            </div>
            <div className="stat-value-modern">{stat.value}</div>
            <div className="stat-label-modern">{stat.title}</div>
            <div className="stat-meta-modern">Updated just now</div>
          </motion.div>
        ))}
      </div>

      <div className="dashboard-content-modern">
        <div className="dashboard-section-modern">
          <motion.div
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-user-plus"></i>
                Student Requests
              </h2>
            </div>

            <div className="activities-list">
              {studentRequests.slice(0, 3).map((req) => (
                <div key={req.id} className="activity-item">
                  <div className="activity-icon welcome">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">
                      <strong>{req.name}</strong> · {req.topic}
                    </div>
                    <div className="activity-time">Requested {req.date}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button className="btn-primary" style={{ padding: '10px 12px', transition: 'all 200ms ease' }}>
                        Accept
                      </button>
                      <button className="btn-secondary" style={{ padding: '10px 12px', transition: 'all 200ms ease' }}>
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-calendar-check"></i>
                Upcoming Sessions
              </h2>
            </div>

            <div className="insights-list">
              {upcomingSessions.slice(0, 3).map((s) => (
                <div key={s.id} className="insight-item">
                  <div className="insight-icon">
                    <i className="fas fa-video" style={{ color: '#a5b4fc' }}></i>
                  </div>
                  <div className="insight-content">
                    <div className="insight-text">
                      <strong>{s.name}</strong> · {s.topic}
                    </div>
                    <div className="insight-time">{s.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="dashboard-section-modern">
          <motion.div
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="card-header-modern" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 className="card-title-modern">
                  <i className="fas fa-toggle-on"></i>
                  Availability
                </h2>
                <div className="card-header-subtle">Control whether students can request new sessions</div>
              </div>
            </div>

            <div className="insights-list">
              <div className="insight-item">
                <div className="insight-content">
                  <div className="insight-text">
                    <strong>Status</strong>
                  </div>
                  <div className="insight-time">{isAvailable ? 'Available' : 'Unavailable'}</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="insight-item">
                <div className="insight-content">
                  <div className="insight-text">
                    <strong>Next available slot</strong>
                  </div>
                  <div className="insight-time">Sat · 10:00 AM</div>
                </div>
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', marginTop: 14, transition: 'all 200ms ease' }}>
              <i className="fas fa-calendar-plus"></i>
              Update Slots
            </button>
          </motion.div>

          <motion.div
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.26 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-shield-alt"></i>
                Mentor Notes
              </h2>
            </div>
            <div className="insights-list">
              <div className="insight-item">
                <div className="insight-content">
                  <div className="insight-text">
                    <strong>Keep sessions crisp</strong>
                  </div>
                  <div className="insight-time">Confirm agenda in the first 2 minutes and end with next steps.</div>
                </div>
              </div>
              <div className="insight-item">
                <div className="insight-content">
                  <div className="insight-text">
                    <strong>Reduce no-shows</strong>
                  </div>
                  <div className="insight-time">Send a short reminder 30 minutes before each session.</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
