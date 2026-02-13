'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import DashboardHome from './modules/DashboardHome';
import MentorDashboardHome from './modules/MentorDashboardHome';
import ResumeAnalysis from './modules/ResumeAnalysis';
import ResumeScorecard from './modules/ResumeScorecard';
import JobRecommendations from './modules/JobRecommendations';
import ProgressTracker from './modules/ProgressTracker';
import MentorConnect from './modules/MentorConnect';
import AIAssistant from './modules/AIAssistant';
import Settings from './modules/Settings';
import StudentRequests from './modules/StudentRequests';
import MySessions from './modules/MySessions';
import Availability from './modules/Availability';

export default function Dashboard({ onLogout }) {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();

    const handleResumeAnalyzed = () => {
      console.log('Resume analysis finished, refreshing profile...');
      fetchUserProfile();
    };

    window.addEventListener('resumeAnalyzed', handleResumeAnalyzed);

    return () => {
      window.removeEventListener('resumeAnalyzed', handleResumeAnalyzed);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        onLogout();
        return;
      }

      console.log('Token found:', token.substring(0, 20) + '...'); // Debug log

      const response = await fetch('/api/protected/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Profile response status:', response.status); // Debug log
      console.log('Profile response headers:', response.headers); // Debug log

      if (response.ok) {
        const data = await response.json();
        const userId = data.user?.id || data.user?._id;
        const savedScore = localStorage.getItem(`resumeScore_${userId}`);
        const resumeScore = savedScore ? parseInt(savedScore) : null;
        setUser({ ...data.user, resumeScore });
      } else {
        // Token might be invalid, clear it and logout user
        console.log('Profile fetch failed, clearing token and logging out'); // Debug log
        localStorage.removeItem('authToken'); // Clear the invalid token
        onLogout();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('authToken'); // Clear the invalid token
      onLogout();
    } finally {
      setLoading(false);
    }
  };

  const renderModule = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const role = typeof user?.role === 'string' ? user.role.toLowerCase() : 'student';
    const isMentor = role === 'mentor';

    switch (activeModule) {
      case 'dashboard':
        return isMentor ? (
          <MentorDashboardHome user={user} onNavigate={setActiveModule} />
        ) : (
          <DashboardHome user={user} onNavigate={setActiveModule} />
        );
      case 'student-requests':
        return isMentor ? <StudentRequests user={user} /> : <DashboardHome user={user} onNavigate={setActiveModule} />;
      case 'my-sessions':
        return isMentor ? <MySessions user={user} /> : <DashboardHome user={user} onNavigate={setActiveModule} />;
      case 'availability':
        return isMentor ? <Availability user={user} /> : <DashboardHome user={user} onNavigate={setActiveModule} />;
      case 'resume-analysis':
        return isMentor ? <MentorDashboardHome user={user} onNavigate={setActiveModule} /> : <ResumeAnalysis user={user} onAnalysisComplete={fetchUserProfile} />;
      case 'resume-scorecard':
        return isMentor ? <MentorDashboardHome user={user} onNavigate={setActiveModule} /> : <ResumeScorecard user={user} />;
      case 'job-recommendations':
        return isMentor ? <MentorDashboardHome user={user} onNavigate={setActiveModule} /> : <JobRecommendations user={user} />;
      case 'progress-tracker':
        return isMentor ? <MentorDashboardHome user={user} onNavigate={setActiveModule} /> : <ProgressTracker user={user} />;
      case 'mentor-connect':
        return isMentor ? <MentorDashboardHome user={user} onNavigate={setActiveModule} /> : <MentorConnect user={user} />;
      case 'ai-assistant':
        return isMentor ? <MentorDashboardHome user={user} onNavigate={setActiveModule} /> : <AIAssistant user={user} />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return isMentor ? (
          <MentorDashboardHome user={user} onNavigate={setActiveModule} />
        ) : (
          <DashboardHome user={user} onNavigate={setActiveModule} />
        );
    }
  };

  const homeModules = new Set(['dashboard', 'student-requests', 'my-sessions', 'availability']);
  const contentAreaClassName = 'content-area';

  return (
    <div className="app-layout">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} user={user} />
      <div className="main-area">
        <TopNavbar onLogout={onLogout} user={user} />
        <main className="page-content">
          <div className={contentAreaClassName}>{renderModule()}</div>
        </main>
      </div>
    </div>
  );
}