'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function StudentRequests() {
  const requests = useMemo(
    () => [
      { id: 'req_1', name: 'Aarav Mehta', topic: 'DSA Interview Prep', date: 'Today' },
      { id: 'req_2', name: 'Sara Khan', topic: 'Career Strategy', date: 'Yesterday' },
      { id: 'req_3', name: 'Rohan Patel', topic: 'System Design Basics', date: '2 days ago' },
      { id: 'req_4', name: 'Priya Nair', topic: 'Portfolio Review', date: '3 days ago' },
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
          <i className="fas fa-user-plus"></i>
          <span>Connections</span>
        </div>
        <h1 className="page-title-modern">Student Requests</h1>
        <p className="page-subtitle-modern">Review and respond to incoming mentorship requests</p>
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
                <i className="fas fa-inbox"></i>
                Recent Requests
              </h2>
            </div>

            <div className="activities-list">
              {requests.map((req) => (
                <div key={req.id} className="activity-item">
                  <div className="activity-icon welcome">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">
                      <strong>{req.name}</strong> · {req.topic}
                    </div>
                    <div className="activity-time">Requested {req.date}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
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
        </div>

        <div className="dashboard-section-modern">
          <motion.div
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <div className="card-header-modern" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 className="card-title-modern">
                  <i className="fas fa-filter"></i>
                  Triage
                </h2>
                <div className="card-header-subtle">Keep your queue healthy and respond quickly</div>
              </div>
            </div>
            <div className="insights-list">
              <div className="insight-item">
                <div className="insight-content">
                  <div className="insight-text">
                    <strong>Tip</strong>
                  </div>
                  <div className="insight-time">Accept requests that match your strongest topics to maximize impact.</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
