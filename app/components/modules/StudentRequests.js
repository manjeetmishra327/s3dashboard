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
    <>
      <motion.section
        className="hero-section text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="welcome-badge">
          <i className="fas fa-user-plus"></i>
          <span>Connections</span>
        </div>
        <h1 className="page-title-modern">Student Requests</h1>
        <p className="page-subtitle-modern">Review and respond to incoming mentorship requests</p>
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
                <i className="fas fa-inbox"></i>
                Recent Requests
              </h2>
            </div>

            <div className="activities-list">
              {requests.length === 0 ? (
                <div className="empty-state-modern">
                  <i className="fas fa-inbox"></i>
                  <p>No student requests yet</p>
                  <p className="text-sm text-gray-400">Requests will appear here when students reach out</p>
                </div>
              ) : (
                requests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    className="activity-item-modern"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                  >
                    <div className="activity-avatar-modern">
                      {request.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="activity-details-modern">
                      <div className="activity-name-modern">{request.name}</div>
                      <div className="activity-desc-modern">{request.topic}</div>
                      <div className="activity-time-modern">{request.date}</div>
                    </div>
                    <div className="activity-actions-modern">
                      <button className="btn-primary btn-sm">Accept</button>
                      <button className="btn-secondary btn-sm">View</button>
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
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-lightbulb"></i>
                Quick Tips
              </h2>
            </div>
            <div className="card-content-modern">
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
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
