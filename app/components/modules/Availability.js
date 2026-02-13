'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function Availability() {
  const availability = useMemo(
    () => [
      { day: 'Monday', available: true, slots: ['10:00 AM', '2:00 PM', '4:00 PM'] },
      { day: 'Tuesday', available: true, slots: ['11:00 AM', '3:00 PM'] },
      { day: 'Wednesday', available: false, slots: [] },
      { day: 'Thursday', available: true, slots: ['10:00 AM', '2:00 PM', '5:00 PM'] },
      { day: 'Friday', available: true, slots: ['1:00 PM', '4:00 PM'] },
      { day: 'Saturday', available: false, slots: [] },
      { day: 'Sunday', available: true, slots: ['11:00 AM', '2:00 PM'] },
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
          <i className="fas fa-calendar-alt"></i>
          <span>Schedule</span>
        </div>
        <h1 className="page-title-modern">Availability</h1>
        <p className="page-subtitle-modern">Manage your mentorship availability and booking preferences</p>
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
                <i className="fas fa-clock"></i>
                Weekly Availability
              </h2>
            </div>

            <div className="availability-grid">
              {availability.map((day, index) => (
                <motion.div
                  key={day.day}
                  className="availability-day-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                >
                  <div className="day-header">
                    <span className="day-name">{day.day}</span>
                    <div className={`day-status ${day.available ? 'available' : 'unavailable'}`}>
                      {day.available ? 'Available' : 'Unavailable'}
                    </div>
                  </div>
                  <div className="time-slots">
                    {day.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="time-slot">
                        {slot}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
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
                <i className="fas fa-cog"></i>
                Booking Settings
              </h2>
            </div>
            <div className="card-content-modern">
              <div className="insights-list">
                <div className="insight-item">
                  <div className="insight-content">
                    <div className="insight-text">
                      <strong>Session Duration</strong>
                    </div>
                    <div className="insight-time">60 minutes</div>
                  </div>
                </div>
                <div className="insight-item">
                  <div className="insight-content">
                    <div className="insight-text">
                      <strong>Booking Window</strong>
                    </div>
                    <div className="insight-time">Up to 2 weeks in advance</div>
                  </div>
                </div>
                <div className="insight-item">
                  <div className="insight-content">
                    <div className="insight-text">
                      <strong>Buffer Time</strong>
                    </div>
                    <div className="insight-time">15 minutes between sessions</div>
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
