'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function MySessions() {
  const sessions = useMemo(
    () => [
      { id: 's_1', student: 'Neha Sharma', topic: 'Mock Interview', when: 'Tomorrow · 6:00 PM', status: 'Scheduled' },
      { id: 's_2', student: 'Kabir Singh', topic: 'Career Roadmap', when: 'Fri · 5:30 PM', status: 'Scheduled' },
      { id: 's_3', student: 'Isha Verma', topic: 'Project Feedback', when: 'Sun · 11:00 AM', status: 'Scheduled' },
      { id: 's_4', student: 'Aarav Mehta', topic: 'DSA Follow-up', when: 'Last week · 45 min', status: 'Completed' },
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
          <i className="fas fa-calendar-check"></i>
          <span>Schedule</span>
        </div>
        <h1 className="page-title-modern">My Sessions</h1>
        <p className="page-subtitle-modern">Track upcoming sessions and review recent outcomes</p>
      </motion.div>

      <div className="dashboard-content-modern">
        <div className="dashboard-section-modern">
          <motion.div
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-video"></i>
                Upcoming
              </h2>
            </div>

            <div className="insights-list">
              {sessions
                .filter((s) => s.status === 'Scheduled')
                .slice(0, 3)
                .map((s) => (
                  <div key={s.id} className="insight-item">
                    <div className="insight-icon">
                      <i className="fas fa-user" style={{ color: '#a5b4fc' }}></i>
                    </div>
                    <div className="insight-content">
                      <div className="insight-text">
                        <strong>{s.student}</strong> · {s.topic}
                      </div>
                      <div className="insight-time">{s.when}</div>
                    </div>
                    <span className="impact-pill">Scheduled</span>
                  </div>
                ))}
            </div>

            <button className="btn-primary" style={{ width: '100%', marginTop: 14 }}>
              <i className="fas fa-calendar-plus"></i>
              Create Session
            </button>
          </motion.div>

          <motion.div
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-check-circle"></i>
                Completed
              </h2>
            </div>

            <div className="activities-list">
              {sessions
                .filter((s) => s.status === 'Completed')
                .slice(0, 2)
                .map((s) => (
                  <div key={s.id} className="activity-item">
                    <div className="activity-icon resume">
                      <i className="fas fa-award"></i>
                    </div>
                    <div className="activity-content">
                      <div className="activity-text">
                        <strong>{s.student}</strong> · {s.topic}
                      </div>
                      <div className="activity-time">{s.when}</div>
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
            transition={{ duration: 0.45, delay: 0.14 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="card-header-modern" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 className="card-title-modern">
                  <i className="fas fa-chart-line"></i>
                  Session Health
                </h2>
                <div className="card-header-subtle">Keep momentum with consistent follow-ups</div>
              </div>
            </div>
            <div className="insights-list">
              <div className="insight-item">
                <div className="insight-content">
                  <div className="insight-text">
                    <strong>Reminder</strong>
                  </div>
                  <div className="insight-time">Send a short recap after every session to increase student retention.</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
