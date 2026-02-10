'use client';

export default function ProgressTracker() {
  const progressData = {
    dsa: { completed: 45, total: 100, percentage: 45 },
    skills: { completed: 8, total: 15, percentage: 53 },
    projects: { completed: 3, total: 5, percentage: 60 },
    certifications: { completed: 2, total: 4, percentage: 50 }
  };

  const recentProgress = [
    { type: 'DSA', action: 'Solved Two Sum problem', date: '2 hours ago' },
    { type: 'Skill', action: 'Completed React.js course', date: '1 day ago' },
    { type: 'Project', action: 'Deployed portfolio website', date: '3 days ago' },
    { type: 'Certification', action: 'Earned AWS Cloud Practitioner', date: '1 week ago' }
  ];

  return (
    <div className="progress-tracker">
      <div className="page-header">
        <h1>Progress Tracker</h1>
        <p className="text-gray-600">Track your learning journey and skill development</p>
      </div>

      {/* Progress Overview */}
      <div className="progress-overview">
        <div className="progress-card">
          <div className="progress-header">
            <h3>DSA Problems</h3>
            <span className="progress-count">{progressData.dsa.completed}/{progressData.dsa.total}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressData.dsa.percentage}%` }}></div>
          </div>
          <span className="progress-percentage">{progressData.dsa.percentage}%</span>
        </div>

        <div className="progress-card">
          <div className="progress-header">
            <h3>Skills Mastered</h3>
            <span className="progress-count">{progressData.skills.completed}/{progressData.skills.total}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressData.skills.percentage}%` }}></div>
          </div>
          <span className="progress-percentage">{progressData.skills.percentage}%</span>
        </div>

        <div className="progress-card">
          <div className="progress-header">
            <h3>Projects Completed</h3>
            <span className="progress-count">{progressData.projects.completed}/{progressData.projects.total}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressData.projects.percentage}%` }}></div>
          </div>
          <span className="progress-percentage">{progressData.projects.percentage}%</span>
        </div>

        <div className="progress-card">
          <div className="progress-header">
            <h3>Certifications</h3>
            <span className="progress-count">{progressData.certifications.completed}/{progressData.certifications.total}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressData.certifications.percentage}%` }}></div>
          </div>
          <span className="progress-percentage">{progressData.certifications.percentage}%</span>
        </div>
      </div>

      {/* Recent Progress */}
      <div className="recent-progress">
        <h2>Recent Activity</h2>
        <div className="progress-timeline">
          {recentProgress.map((item, index) => (
            <div key={index} className="timeline-item">
              <div className="timeline-icon">
                <i className={`fas fa-${item.type === 'DSA' ? 'code' : 
                                   item.type === 'Skill' ? 'star' : 
                                   item.type === 'Project' ? 'folder' : 'certificate'}`}></i>
              </div>
              <div className="timeline-content">
                <h4>{item.action}</h4>
                <span className="timeline-date">{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 