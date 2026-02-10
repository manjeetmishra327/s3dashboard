'use client';

export default function MentorConnect() {
  const mentors = [
    {
      id: 1,
      name: 'Sarah Johnson',
      title: 'Senior Software Engineer',
      company: 'Google',
      expertise: ['System Design', 'Interview Prep', 'Career Growth'],
      rating: 4.9,
      sessions: 150,
      hourlyRate: 120,
      availability: 'Available this week',
      image: '/api/placeholder/60/60'
    },
    {
      id: 2,
      name: 'Michael Chen',
      title: 'Engineering Manager',
      company: 'Microsoft',
      expertise: ['Leadership', 'Technical Interviews', 'Architecture'],
      rating: 4.8,
      sessions: 89,
      hourlyRate: 150,
      availability: 'Available next week',
      image: '/api/placeholder/60/60'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      title: 'Product Manager',
      company: 'Amazon',
      expertise: ['Product Strategy', 'Behavioral Interviews', 'Career Transition'],
      rating: 4.7,
      sessions: 67,
      hourlyRate: 100,
      availability: 'Available today',
      image: '/api/placeholder/60/60'
    }
  ];

  return (
    <div className="mentor-connect">
      <div className="page-header">
        <h1>Mentor Connect</h1>
        <p className="text-gray-600">Connect with industry experts and get personalized guidance</p>
      </div>

      {/* Featured Mentors */}
      <div className="mentors-grid">
        {mentors.map((mentor) => (
          <div key={mentor.id} className="mentor-card">
            <div className="mentor-header">
              <div className="mentor-avatar">
                <i className="fas fa-user"></i>
              </div>
              <div className="mentor-info">
                <h3 className="mentor-name">{mentor.name}</h3>
                <p className="mentor-title">{mentor.title}</p>
                <p className="mentor-company">{mentor.company}</p>
              </div>
              <div className="mentor-rating">
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className={`fas fa-star ${i < Math.floor(mentor.rating) ? 'filled' : ''}`}></i>
                  ))}
                </div>
                <span className="rating-text">{mentor.rating}</span>
              </div>
            </div>

            <div className="mentor-expertise">
              <h4>Expertise</h4>
              <div className="expertise-tags">
                {mentor.expertise.map((skill, index) => (
                  <span key={index} className="expertise-tag">{skill}</span>
                ))}
              </div>
            </div>

            <div className="mentor-stats">
              <div className="stat">
                <span className="stat-value">{mentor.sessions}</span>
                <span className="stat-label">Sessions</span>
              </div>
              <div className="stat">
                <span className="stat-value">${mentor.hourlyRate}</span>
                <span className="stat-label">/hour</span>
              </div>
              <div className="stat">
                <span className="stat-value">{mentor.availability}</span>
                <span className="stat-label">Available</span>
              </div>
            </div>

            <div className="mentor-actions">
              <button className="btn-book">Book Session</button>
              <button className="btn-view">View Profile</button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn">
            <i className="fas fa-search"></i>
            <span>Find Mentors</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-calendar"></i>
            <span>My Sessions</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-comments"></i>
            <span>Messages</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-star"></i>
            <span>Reviews</span>
          </button>
        </div>
      </div>
    </div>
  );
} 