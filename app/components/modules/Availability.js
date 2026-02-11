'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export default function Availability() {
  const [isAvailable, setIsAvailable] = useState(true);

  const slots = useMemo(
    () => [
      { id: 'slot_1', day: 'Sat', time: '10:00 AM', status: 'Next' },
      { id: 'slot_2', day: 'Sat', time: '12:30 PM', status: 'Open' },
      { id: 'slot_3', day: 'Sun', time: '11:00 AM', status: 'Open' },
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
          <i className="fas fa-toggle-on"></i>
          <span>Availability</span>
        </div>
        <h1 className="page-title-modern">Availability</h1>
        <p className="page-subtitle-modern">Control when students can book time with you</p>
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
            <div className="card-header-modern" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 className="card-title-modern">
                  <i className="fas fa-signal"></i>
                  Status
                </h2>
                <div className="card-header-subtle">Set yourself available for new requests</div>
              </div>
            </div>

            <div className="insights-list">
              <div className="insight-item">
                <div className="insight-content">
                  <div className="insight-text">
                    <strong>Availability</strong>
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

            <button className="btn-primary" style={{ width: '100%', marginTop: 14 }}>
              <i className="fas fa-calendar-plus"></i>
              Add Time Slot
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
                <i className="fas fa-calendar"></i>
                Your Slots
              </h2>
            </div>

            <div className="insights-list">
              {slots.map((s) => (
                <div key={s.id} className="insight-item">
                  <div className="insight-icon">
                    <i className="fas fa-clock" style={{ color: '#a5b4fc' }}></i>
                  </div>
                  <div className="insight-content">
                    <div className="insight-text">
                      <strong>{s.day}</strong> · {s.time}
                    </div>
                    <div className="insight-time">{s.status === 'Next' ? 'Next slot' : 'Open'}</div>
                  </div>
                  <span className="impact-pill">{s.status}</span>
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
                  <i className="fas fa-sliders-h"></i>
                  Guidelines
                </h2>
                <div className="card-header-subtle">A simple baseline that keeps scheduling smooth</div>
              </div>
            </div>
            <div className="insights-list">
              <div className="insight-item">
                <div className="insight-content">
                  <div className="insight-text">
                    <strong>Recommendation</strong>
                  </div>
                  <div className="insight-time">Offer 2–3 consistent slots weekly so students can plan ahead.</div>
                </div>
              </div>
              <div className="insight-item">
                <div className="insight-content">
                  <div className="insight-text">
                    <strong>Tip</strong>
                  </div>
                  <div className="insight-time">Keep sessions focused: agenda → deep dive → next steps.</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
