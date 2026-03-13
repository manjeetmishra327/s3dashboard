'use client';

import { EmptyState } from '@/components/ui/EmptyState';

export default function MentorDashboardHome({ user }) {
  return (
    <EmptyState
      icon="users"
      title="Mentor Dashboard"
      description="Your mentor workspace will appear here once your AI profile is complete"
    />
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
            className="content-card-modern card-premium p-6"
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
    </div>
  );
}
