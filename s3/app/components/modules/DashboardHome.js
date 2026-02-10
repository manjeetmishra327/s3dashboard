'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
// Lightweight chart rendering using Chart.js via react-chartjs-2
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function DashboardHome({ user, onNavigate }) {
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { title: 'Resume Score', value: 'N/A', icon: 'fas fa-file-alt', color: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-50 to-blue-100' },
    { title: 'Resumes Uploaded', value: '0', icon: 'fas fa-upload', color: 'from-green-500 to-green-600', bgGradient: 'from-green-50 to-green-100' },
    { title: 'Skills Identified', value: '0', icon: 'fas fa-star', color: 'from-purple-500 to-purple-600', bgGradient: 'from-purple-50 to-purple-100' },
    { title: 'Last Analysis', value: 'Never', icon: 'fas fa-clock', color: 'from-orange-500 to-orange-600', bgGradient: 'from-orange-50 to-orange-100' },
  ]);

  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [progressSeries, setProgressSeries] = useState([]);
  const [aiTips, setAiTips] = useState([]);

  useEffect(() => {
    if (user) {
      fetchResumeData();
    }
  }, [user]);

  // Listen for localStorage changes to auto-refresh dashboard
  useEffect(() => {
    const handleStorageChange = () => {
      if (user && (user.id || user._id)) {
        console.log('Storage changed, refreshing dashboard data...');
        loadUserSpecificData(user.id || user._id);
      }
    };

    // Listen for custom event when resume is analyzed
    window.addEventListener('resumeAnalyzed', handleStorageChange);
    
    // Also check localStorage periodically for updates
    const interval = setInterval(() => {
      if (user && (user.id || user._id)) {
        loadUserSpecificData(user.id || user._id);
      }
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('resumeAnalyzed', handleStorageChange);
      clearInterval(interval);
    };
  }, [user]);

  // Load user-specific analysis data from localStorage
  const loadUserSpecificData = (userId) => {
    const userKey = `resumeAnalysis_${userId}`;
    const userScoreKey = `resumeScore_${userId}`;
    const userAIKey = `aiAnalysis_${userId}`;
    const userTimestampKey = `analysisTimestamp_${userId}`;
    
    const savedAnalysis = localStorage.getItem(userKey);
    const savedScore = localStorage.getItem(userScoreKey);
    const aiAnalysis = localStorage.getItem(userAIKey);
    const timestamp = localStorage.getItem(userTimestampKey);
    
    if (savedAnalysis && savedScore) {
      try {
        const analysisData = JSON.parse(savedAnalysis);
        const score = parseInt(savedScore);
        const aiData = aiAnalysis ? JSON.parse(aiAnalysis) : null;
        
        setLastAnalysis({
          data: analysisData,
          score: score,
          aiAnalysis: aiData,
          timestamp: timestamp || new Date().toISOString()
        });
        
        // Update stats with localStorage data
        const skillsCount = analysisData.skills?.length || 0;
        const lastAnalysisDate = timestamp ? new Date(timestamp).toLocaleDateString() : 'Today';
        
        setStats([
          { title: 'Resume Score', value: `${score}%`, icon: 'fas fa-file-alt', color: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-50 to-blue-100' },
          { title: 'Resumes Uploaded', value: '1', icon: 'fas fa-upload', color: 'from-green-500 to-green-600', bgGradient: 'from-green-50 to-green-100' },
          { title: 'Skills Identified', value: skillsCount.toString(), icon: 'fas fa-star', color: 'from-purple-500 to-purple-600', bgGradient: 'from-purple-50 to-purple-100' },
          { title: 'Last Analysis', value: lastAnalysisDate, icon: 'fas fa-clock', color: 'from-orange-500 to-orange-600', bgGradient: 'from-orange-50 to-orange-100' },
        ]);
        
        // Update recent activities
        setRecentActivities([
          { 
            action: 'Resume analyzed successfully', 
            time: getTimeAgo(new Date(timestamp || new Date())), 
            type: 'resume',
            score: score 
          },
          { 
            action: `${skillsCount} skills identified`, 
            time: 'Latest analysis', 
            type: 'skills' 
          },
          { 
            action: 'Ready for AI suggestions', 
            time: 'Click to enhance', 
            type: 'suggestion' 
          }
        ]);
        
        // Prepare chart data
        prepareChartData(analysisData, aiData);
        
        return true;
      } catch (error) {
        console.error('Error loading user-specific data:', error);
      }
    }
    return false;
  };

  const prepareChartData = (data, aiData) => {
    const charts = {
      skills: data.skills?.slice(0, 8) || [],
      sections: {
        contact: data.contact ? 100 : 0,
        experience: data.experience?.length > 0 ? 85 : 0,
        education: data.education?.length > 0 ? 90 : 0,
        skills: data.skills?.length > 0 ? 95 : 0
      },
      aiScores: aiData ? {
        overall: aiData.overall_score || 0,
        ats: aiData.ats_compatibility || 0,
        content: aiData.content_quality || 0,
        formatting: aiData.formatting_score || 0
      } : null
    };
    setChartData(charts);

    // Extract up to 3 AI tips if present
    if (aiData) {
      const tips = [];
      if (Array.isArray(aiData.improvement_tips)) {
        tips.push(...aiData.improvement_tips);
      } else {
        if (aiData.top_improvements) tips.push(...aiData.top_improvements);
        if (aiData.suggestions) tips.push(...aiData.suggestions);
      }
      setAiTips(tips.filter(Boolean).slice(0, 3));
    } else {
      setAiTips([]);
    }
  };

  const fetchResumeData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token || !user) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/resume/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userResumes = data.resumes || [];
        
        setResumeData(userResumes);
        updateStats(userResumes);
        updateActivities(userResumes);
        updateProgressSeries(userResumes);
        
        // Also try to load any user-specific localStorage data
        if (user.id || user._id) {
          loadUserSpecificData(user.id || user._id);
        }
      } else {
        // If API fails, try to load from user-specific localStorage
        if (user.id || user._id) {
          const hasLocalData = loadUserSpecificData(user.id || user._id);
          if (!hasLocalData) {
            // Show welcome message if no data at all
            setRecentActivities([
              { action: 'Welcome to your dashboard!', time: 'Just now', type: 'welcome' },
              { action: 'Upload your first resume to get started', time: 'Get started', type: 'upload' }
            ]);
          }
          // Build a minimal series from localStorage if available
          try {
            const ts = localStorage.getItem(`analysisTimestamp_${user.id || user._id}`);
            const sc = localStorage.getItem(`resumeScore_${user.id || user._id}`);
            if (ts && sc) {
              setProgressSeries([{ x: new Date(ts), y: parseInt(sc) }]);
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('Error fetching resume data:', error);
      // Fallback to localStorage if available
      if (user && (user.id || user._id)) {
        loadUserSpecificData(user.id || user._id);
      }
    } finally {
      setLoading(false);
    }
  };

  const scoreOf = (resume) => {
    if (typeof resume?.score === 'number') return resume.score;
    if (typeof resume?.analysis?.atsScore === 'number') return resume.analysis.atsScore;
    if (typeof resume?.aiOverallScore === 'number') return resume.aiOverallScore;
    return null;
  };

  const updateProgressSeries = (resumes) => {
    const points = (resumes || [])
      .map(r => ({ t: new Date(r.uploadedAt || r.createdAt || r.created_at || Date.now()), s: scoreOf(r) }))
      .filter(p => typeof p.s === 'number')
      .sort((a, b) => a.t - b.t)
      .map(p => ({ x: p.t, y: p.s }));
    setProgressSeries(points);
  };

  const updateStats = (resumes) => {
    if (resumes && resumes.length > 0) {
      const latestResume = resumes[0];
      const skillsCount = latestResume.analysis?.skills?.length || 0;
      const lastAnalysis = new Date(latestResume.uploadedAt).toLocaleDateString();
      
      setStats([
        { title: 'Resume Score', value: `${scoreOf(latestResume) || 0}%`, icon: 'fas fa-file-alt', color: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-50 to-blue-100' },
        { title: 'Resumes Uploaded', value: resumes.length.toString(), icon: 'fas fa-upload', color: 'from-green-500 to-green-600', bgGradient: 'from-green-50 to-green-100' },
        { title: 'Skills Identified', value: skillsCount.toString(), icon: 'fas fa-star', color: 'from-purple-500 to-purple-600', bgGradient: 'from-purple-50 to-purple-100' },
        { title: 'Last Analysis', value: lastAnalysis, icon: 'fas fa-clock', color: 'from-orange-500 to-orange-600', bgGradient: 'from-orange-50 to-orange-100' },
      ]);
      
      // If we have resume data, also update lastAnalysis for chart display
      if (latestResume.analysis) {
        setLastAnalysis({
          data: latestResume.analysis,
          score: scoreOf(latestResume) || 0,
          aiAnalysis: latestResume.aiAnalysis || null,
          timestamp: latestResume.uploadedAt || new Date().toISOString()
        });
        
        prepareChartData(latestResume.analysis, latestResume.aiAnalysis);
      }
    }
  };

  const updateActivities = (resumes) => {
    const activities = [];
    
    if (resumes && resumes.length > 0) {
      resumes.slice(0, 3).forEach((resume, index) => {
        const timeAgo = getTimeAgo(new Date(resume.uploadedAt));
        activities.push({
          action: `Resume "${resume.fileName}" analyzed`,
          time: timeAgo,
          type: 'resume',
          score: resume.analysis?.atsScore
        });
      });
    }

    // Add some default activities if no resumes
    if (activities.length === 0) {
      activities.push(
        { action: 'Welcome to your dashboard!', time: 'Just now', type: 'welcome' },
        { action: 'Upload your first resume to get started', time: 'Get started', type: 'upload' }
      );
    }

    setRecentActivities(activities);
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  // Build Chart.js inputs from series
  const progressChart = useMemo(() => {
    if (!progressSeries || progressSeries.length === 0) return null;
    const labels = progressSeries.map(p => new Date(p.x).toLocaleDateString());
    const data = progressSeries.map(p => p.y);
    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Resume Score',
            data,
            fill: true,
            tension: 0.35,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96,165,250,0.15)',
            pointBackgroundColor: '#93c5fd',
            pointBorderColor: '#1d4ed8',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { grid: { display: false } },
          y: { min: 0, max: 100, ticks: { stepSize: 20 } }
        }
      }
    };
  }, [progressSeries]);

  // Get user's first name for personalized greeting
  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';

  return (
    <div className="dashboard-home-modern">
      {/* Modern Dark Gradient Background */}
      <div className="dashboard-modern-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <motion.div 
        className="hero-section-modern"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="welcome-badge">
          <i className="fas fa-calendar-day"></i>
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        <h1 className="page-title-modern">Welcome back, {firstName}! 👋</h1>
        <p className="page-subtitle-modern">Here's what's happening with your career journey today.</p>
      </motion.div>

      {/* Stats Overview - Modern Cards */}
      <div className="stats-overview-modern">
        {stats.map((stat, index) => (
          <motion.div 
            key={index} 
            className="stat-card-modern glass-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
          >
            <div className="stat-card-top">
              <div className={`stat-icon-modern ${stat.color}`}>
                <i className={stat.icon}></i>
              </div>
              <div className="stat-trend-modern">
                <i className="fas fa-arrow-up"></i>
                <span>+12%</span>
              </div>
            </div>
            <div className="stat-value-modern">{stat.value}</div>
            <div className="stat-label-modern">{stat.title}</div>
            <div className="stat-meta-modern">
              {stat.title === 'Resume Score' && 'From last month'}
              {stat.title === 'Resumes Uploaded' && 'Total submissions'}
              {stat.title === 'Skills Identified' && 'Unique skills'}
              {stat.title === 'Last Analysis' && 'Latest update'}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="dashboard-content-modern">
        {/* Left Column */}
        <div className="dashboard-section-modern">
        {/* Recent Activities */}
        <motion.div 
          className="content-card-modern glass-card-dark"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="card-header-modern">
            <h2 className="card-title-modern">
              <i className="fas fa-clock"></i>
              Recent Activities
            </h2>
              <button className="view-all-btn-modern">
                View All
                <i className="fas fa-arrow-right"></i>
              </button>
          </div>
          <div className="activities-list">
              {loading ? (
                <div className="loading-placeholder">
                  <div style={{ height: '60px', borderRadius: '12px' }}></div>
                  <div style={{ height: '60px', borderRadius: '12px' }}></div>
                  <div style={{ height: '60px', borderRadius: '12px' }}></div>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className={`activity-icon ${activity.type}`}>
                  <i className={`fas fa-${activity.type === 'resume' ? 'file-alt' : 
                                          activity.type === 'welcome' ? 'hand-wave' :
                                          activity.type === 'upload' ? 'upload' : 'chart-line'}`}></i>
                </div>
                <div className="activity-content">
                      <div className="activity-text">{activity.action}</div>
                      <div className="activity-time">{activity.time}</div>
                      {activity.score && (
                        <div className="activity-score">Score: {activity.score}%</div>
                      )}
                </div>
              </div>
                ))
              )}
          </div>
        </motion.div>

          {/* ATS Result Card */}
        <motion.div 
          className="content-card-modern glass-card-dark"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-bullseye"></i>
                ATS Result
              </h2>
              <button className="view-all-btn-modern" onClick={() => onNavigate && onNavigate('resume-analysis')}>
                Analyze
                <i className="fas fa-arrow-right"></i>
              </button>
          </div>
          <div className="insights-list">
            {lastAnalysis ? (
              <>
                <div className="insight-item" onClick={() => onNavigate && onNavigate('resume-analysis')}>
                  <div className="insight-icon"><i className="fas fa-trophy" style={{color: '#fbbf24'}}></i></div>
                  <div className="insight-content">
                    <div className="insight-text"><strong>Total Score</strong></div>
                    <div className="insight-time">{lastAnalysis.score}% - {lastAnalysis.score >= 70 ? 'Good' : lastAnalysis.score >= 50 ? 'Average' : 'Needs Improvement'}</div>
                  </div>
                </div>
                <div className="insight-item" onClick={() => onNavigate && onNavigate('resume-analysis')}>
                  <div className="insight-icon"><i className="fas fa-thumbs-up" style={{color: '#34d399'}}></i></div>
                  <div className="insight-content">
                    <div className="insight-text"><strong>Strengths</strong></div>
                    <div className="insight-time">{`Skills coverage ${chartData?.sections?.skills ?? 0}% • Education ${chartData?.sections?.education ?? 0}%`}</div>
                  </div>
                </div>
                <div className="insight-item" onClick={() => onNavigate && onNavigate('resume-analysis')}>
                  <div className="insight-icon"><i className="fas fa-exclamation-triangle" style={{color: '#f59e0b'}}></i></div>
                  <div className="insight-content">
                    <div className="insight-text"><strong>Weak Areas</strong></div>
                    <div className="insight-time">{`Contact ${chartData?.sections?.contact ?? 0}% • Experience ${chartData?.sections?.experience ?? 0}%`}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-resumes">
                <i className="fas fa-file-upload"></i>
                <p>No resumes uploaded yet</p>
                <p className="text-sm">Upload your first resume to get started with analysis</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Progress Over Time - Line Chart */}
        {progressChart && (
          <motion.div 
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.62 }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-chart-line"></i>
                Your Resume Progress Over Time
              </h2>
            </div>
            <div style={{ height: 260 }}>
              <Line data={progressChart.data} options={progressChart.options} />
            </div>
          </motion.div>
        )}

          {/* Last Analysis Details - NEW SECTION */}
          {lastAnalysis && chartData && (
            <motion.div 
              className="content-card-modern glass-card-dark"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="card-header-modern">
                <h2 className="card-title-modern">
                  <i className="fas fa-chart-bar"></i>
                  Analysis Overview
                </h2>
                <button 
                  className="view-all-btn-modern" 
                  onClick={() => onNavigate && onNavigate('resume-analysis')}
                >
                  New Analysis
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
              
              <div className="analysis-overview">
                {/* Score Circle */}
                <div className="analysis-score-circle">
                  <svg className="score-svg" viewBox="0 0 120 120">
                    <circle
                      className="score-bg"
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                    />
                    <circle
                      className="score-progress"
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="url(#scoreGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(lastAnalysis.score / 100) * 326.73} 326.73`}
                      transform="rotate(-90 60 60)"
                    />
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="score-text">
                    <div className="score-number">{lastAnalysis.score}%</div>
                    <div className="score-label">Overall</div>
                  </div>
                </div>

                {/* Skills Tags */}
                {chartData.skills.length > 0 && (
                  <div className="skills-tags-section">
                    <h4 className="skills-tags-title">
                      <i className="fas fa-tags mr-2"></i>
                      Identified Skills
                    </h4>
                    <div className="skills-tags-grid">
                      {chartData.skills.map((skill, index) => (
                        <motion.div
                          key={index}
                          className="skill-tag"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <i className="fas fa-check-circle mr-1"></i>
                          {skill}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Scores if available */}
                {chartData.aiScores && (
                  <div className="ai-scores-section">
                    <h4 className="ai-scores-title">
                      <i className="fas fa-robot mr-2"></i>
                      AI Analysis Breakdown
                    </h4>
                    <div className="ai-scores-grid">
                      <div className="ai-score-item">
                        <div className="ai-score-label">ATS Compatibility</div>
                        <div className="ai-score-bar">
                          <div 
                            className="ai-score-fill ats"
                            style={{ width: `${chartData.aiScores.ats}%` }}
                          ></div>
                        </div>
                        <div className="ai-score-value">{chartData.aiScores.ats}%</div>
                      </div>
                      <div className="ai-score-item">
                        <div className="ai-score-label">Content Quality</div>
                        <div className="ai-score-bar">
                          <div 
                            className="ai-score-fill content"
                            style={{ width: `${chartData.aiScores.content}%` }}
                          ></div>
                        </div>
                        <div className="ai-score-value">{chartData.aiScores.content}%</div>
                      </div>
                      <div className="ai-score-item">
                        <div className="ai-score-label">Formatting</div>
                        <div className="ai-score-bar">
                          <div 
                            className="ai-score-fill formatting"
                            style={{ width: `${chartData.aiScores.formatting}%` }}
                          ></div>
                        </div>
                        <div className="ai-score-value">{chartData.aiScores.formatting}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="analysis-timestamp">
                  <i className="fas fa-clock mr-2"></i>
                  Analyzed {new Date(lastAnalysis.timestamp).toLocaleString()}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column */}
        <div className="dashboard-section-modern">
          {/* Upload New Resume */}
          <motion.div 
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-upload"></i>
                Upload New Resume
              </h2>
            </div>
            <div className="no-resumes" style={{padding: '1.5rem'}}>
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 2.2 }}
                style={{ display: 'inline-flex' }}
              >
                <i className="fas fa-cloud-upload-alt" style={{ color: '#a5b4fc' }}></i>
              </motion.div>
              <p>Drop or select a resume to analyze</p>
              <button className="btn-primary" onClick={() => onNavigate && onNavigate('resume-analysis')}>
                <i className="fas fa-file-import"></i>
                Choose File
              </button>
            </div>
          </motion.div>

          {/* Resume Strength Analyzer */}
          <motion.div 
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-chart-pie"></i>
                Skill Graph
              </h2>
            </div>
            <div className="resume-strength-section">
              {lastAnalysis && chartData ? (
                <>
                  <motion.div 
                    className="strength-chart"
                    onClick={() => onNavigate && onNavigate('resume-analysis')}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="strength-circle">
                      <div className="strength-value">{lastAnalysis.score}%</div>
                      <div className="strength-label">Resume Strength</div>
                    </div>
                  </motion.div>
                  <div className="strength-breakdown">
                    <motion.div 
                      className="strength-item"
                      whileHover={{ x: 4 }}
                      onClick={() => onNavigate && onNavigate('resume-analysis')}
                    >
                      <span>Contact Info</span>
                      <div className="strength-bar">
                        <div className="strength-fill" style={{ width: `${chartData.sections.contact}%` }}></div>
                      </div>
                      <span>{chartData.sections.contact}%</span>
                    </motion.div>
                    <motion.div 
                      className="strength-item"
                      whileHover={{ x: 4 }}
                      onClick={() => onNavigate && onNavigate('resume-analysis')}
                    >
                      <span>Work Experience</span>
                      <div className="strength-bar">
                        <div className="strength-fill" style={{ width: `${chartData.sections.experience}%` }}></div>
                      </div>
                      <span>{chartData.sections.experience}%</span>
                    </motion.div>
                    <motion.div 
                      className="strength-item"
                      whileHover={{ x: 4 }}
                      onClick={() => onNavigate && onNavigate('resume-analysis')}
                    >
                      <span>Skills Section</span>
                      <div className="strength-bar">
                        <div className="strength-fill" style={{ width: `${chartData.sections.skills}%` }}></div>
                      </div>
                      <span>{chartData.sections.skills}%</span>
                    </motion.div>
                    <motion.div 
                      className="strength-item"
                      whileHover={{ x: 4 }}
                      onClick={() => onNavigate && onNavigate('resume-analysis')}
                    >
                      <span>Education</span>
                      <div className="strength-bar">
                        <div className="strength-fill" style={{ width: `${chartData.sections.education}%` }}></div>
                      </div>
                      <span>{chartData.sections.education}%</span>
                    </motion.div>
                  </div>
                  <motion.button 
                    className="btn-primary" 
                    onClick={() => onNavigate && onNavigate('resume-analysis')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <i className="fas fa-edit"></i>
                    Improve Resume
                  </motion.button>
                </>
              ) : (
                <div className="no-resumes">
                  <i className="fas fa-chart-pie"></i>
                  <p>Upload a resume to see skill graph</p>
                  <button className="btn-primary" onClick={() => onNavigate && onNavigate('resume-analysis')}>
                    <i className="fas fa-upload"></i>
                    Upload Resume
                  </button>
                </div>
              )}
        </div>
      </motion.div>

      {/* AI Suggestions */}
          <motion.div 
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-lightbulb"></i>
                AI Suggestions
              </h2>
            </div>
            <div className="insights-list">
              {aiTips && aiTips.length > 0 ? (
                aiTips.map((tip, idx) => (
                  <div key={idx} className="insight-item">
                    <div className="insight-icon"><i className="fas fa-magic" style={{color: '#a78bfa'}}></i></div>
                    <div className="insight-content">
                      <div className="insight-text"><strong>{tip.title || `Tip ${idx+1}`}</strong></div>
                      <div className="insight-time">{tip.detail || tip.text || tip}</div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="insight-item">
                    <div className="insight-icon"><i className="fas fa-magic" style={{color: '#a78bfa'}}></i></div>
                    <div className="insight-content">
                      <div className="insight-text"><strong>Quantify achievements</strong></div>
                      <div className="insight-time">Add metrics (%, $, #) to experience bullets</div>
                    </div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon"><i className="fas fa-magic" style={{color: '#a78bfa'}}></i></div>
                    <div className="insight-content">
                      <div className="insight-text"><strong>Match keywords</strong></div>
                      <div className="insight-time">Align skills to target job description terms</div>
                    </div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon"><i className="fas fa-magic" style={{color: '#a78bfa'}}></i></div>
                    <div className="insight-content">
                      <div className="insight-text"><strong>Improve formatting</strong></div>
                      <div className="insight-time">Use consistent headings and bullet indentation</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

      {/* Recent Uploads */}
          <motion.div 
            className="content-card-modern glass-card-dark"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            <div className="card-header-modern">
              <h2 className="card-title-modern">
                <i className="fas fa-history"></i>
                Recent Uploads
              </h2>
            </div>
        <div className="activities-list">
          {Array.isArray(resumeData) && resumeData.length > 0 ? (
            resumeData.slice(0, 5).map((resume, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-icon resume">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="activity-content">
                  <div className="activity-text">{resume.fileName || 'Resume.pdf'}</div>
                  <div className="activity-time">{new Date(resume.uploadedAt).toLocaleString()}</div>
                </div>
                {typeof resume?.analysis?.atsScore === 'number' && (
                  <div className="activity-score">{resume.analysis.atsScore}%</div>
                )}
              </div>
            ))
          ) : (
            <div className="no-resumes" style={{padding: '1.5rem'}}>
              <i className="fas fa-inbox"></i>
              <p>No uploads yet</p>
            </div>
          )}
        </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 