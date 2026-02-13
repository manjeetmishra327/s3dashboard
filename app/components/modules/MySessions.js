'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function MySessions() {
  const sessions = useMemo(
    () => [
      { id: 's_1', student: 'Neha Sharma', topic: 'Mock Interview', when: 'Tomorrow · 6:00 PM', status: 'Scheduled' },
      { id: 's_2', student: 'Kabir Singh', topic: 'Career Roadmap', when: 'Fri · 5:30 PM', status: 'Scheduled' },
      { id: 's_3', student: 'Isha Verma', topic: 'Project Feedback', when: 'Sun · 11:00 AM', status: 'Scheduled' },
    ],
    []
  );

  return (
    <>
      <motion.section
        className="hero-section text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="welcome-badge">
          <i className="fas fa-video"></i>
          <span>Meetings</span>
        </div>
        <h1 className="page-title-modern">My Sessions</h1>
        <p className="page-subtitle-modern">View and manage your upcoming mentorship sessions</p>
      </motion.section>

      <div className="dashboard-content-modern">
        <div className="dashboard-section-modern">
          <motion.div
            className="content-card-modern card-premium p-6"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-calendar-check"></i>
                Upcoming Sessions
              </h2>
            </div>

            <div className="activities-list">
              {sessions.length === 0 ? (
                <div className="empty-state-modern">
                  <i className="fas fa-calendar"></i>
                  <p>No sessions scheduled</p>
                  <p className="text-sm text-gray-400">Your upcoming mentorship sessions will appear here</p>
                </div>
              ) : (
                sessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    className="activity-item-modern"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                  >
                    <div className="activity-avatar-modern">
                      {session.student.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="activity-details-modern">
                      <div className="activity-name-modern">{session.student}</div>
                      <div className="activity-desc-modern">{session.topic}</div>
                      <div className="activity-time-modern">{session.when}</div>
                    </div>
                    <div className="activity-actions-modern">
                      <button className="btn-primary btn-sm">Join</button>
                      <button className="btn-secondary btn-sm">Details</button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <div className="dashboard-section-modern">
          <motion.div
            className="content-card-modern card-premium p-6"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
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
    </>
  );
}
