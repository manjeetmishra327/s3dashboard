'use client';

import { useState, useEffect } from 'react';

export default function ResumeScorecard({ user }) {
  const [improvements, setImprovements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resumeId, setResumeId] = useState(null);

  // Get resumeId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('resumeId');
    if (id) {
      setResumeId(id);
    }
  }, []);

  const fetchImprovements = async () => {
    if (!resumeId) return;
    
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get improvements');
      }

      const data = await response.json();
      setImprovements(data.improvements);
    } catch (error) {
      console.error('Error fetching improvements:', error);
      setError(error.message || 'Failed to load improvements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resumeId) {
      fetchImprovements();
    }
  }, [resumeId]);

  if (loading) {
    return (
      <div className="resume-scorecard">
        <div className="page-header">
          <h1>AI Resume Scorecard</h1>
          <p className="text-gray-600">Getting AI-powered improvement suggestions...</p>
        </div>
        <div className="loading-container">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Analyzing your resume with AI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="resume-scorecard">
        <div className="page-header">
          <h1>AI Resume Scorecard</h1>
          <p className="text-gray-600">AI-powered improvement suggestions</p>
        </div>
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {error}
        </div>
        <button 
          onClick={fetchImprovements}
          className="btn-primary mt-4"
        >
          <i className="fas fa-refresh mr-2"></i>
          Try Again
        </button>
      </div>
    );
  }

  if (!improvements) {
    return (
      <div className="resume-scorecard">
        <div className="page-header">
          <h1>AI Resume Scorecard</h1>
          <p className="text-gray-600">AI-powered improvement suggestions</p>
        </div>
        <div className="no-data">
          <i className="fas fa-robot text-gray-400 text-4xl mb-4"></i>
          <p className="text-gray-500">No improvement data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-scorecard">
      <div className="page-header">
        <h1>AI Resume Scorecard</h1>
        <p className="text-gray-600">AI-powered improvement suggestions powered by Gemini</p>
      </div>

      {/* Overall Score */}
      <div className="score-overview">
        <div className="score-card">
          <div className="score-circle">
            <div className="score-value">{improvements.overallScore}%</div>
            <div className="score-label">Predicted Score</div>
          </div>
          <div className="score-description">
            <h3>AI Analysis Summary</h3>
            <p>{improvements.summary}</p>
          </div>
        </div>
      </div>

      {/* Improvement Categories */}
      <div className="improvements-grid">
        {/* Missing Skills */}
        <div className="improvement-card">
          <div className="card-header">
            <h3><i className="fas fa-plus-circle text-blue-500 mr-2"></i>Missing Skills</h3>
            <span className="badge">{improvements.missingSkills?.length || 0} suggestions</span>
          </div>
          <div className="suggestions-list">
            {improvements.missingSkills?.map((skill, index) => (
              <div key={index} className="suggestion-item">
                <i className="fas fa-arrow-right text-blue-500"></i>
                <span>{skill}</span>
              </div>
            )) || <p className="text-gray-500">No missing skills identified</p>}
          </div>
        </div>

        {/* Better Phrasing */}
        <div className="improvement-card">
          <div className="card-header">
            <h3><i className="fas fa-edit text-green-500 mr-2"></i>Better Phrasing</h3>
            <span className="badge">{improvements.betterPhrasing?.length || 0} suggestions</span>
          </div>
          <div className="suggestions-list">
            {improvements.betterPhrasing?.map((suggestion, index) => (
              <div key={index} className="suggestion-item">
                <i className="fas fa-lightbulb text-green-500"></i>
                <span>{suggestion}</span>
              </div>
            )) || <p className="text-gray-500">No phrasing suggestions</p>}
          </div>
        </div>

        {/* ATS Tips */}
        <div className="improvement-card">
          <div className="card-header">
            <h3><i className="fas fa-search text-purple-500 mr-2"></i>ATS Optimization</h3>
            <span className="badge">{improvements.atsTips?.length || 0} tips</span>
          </div>
          <div className="suggestions-list">
            {improvements.atsTips?.map((tip, index) => (
              <div key={index} className="suggestion-item">
                <i className="fas fa-check-circle text-purple-500"></i>
                <span>{tip}</span>
              </div>
            )) || <p className="text-gray-500">No ATS tips available</p>}
          </div>
        </div>

        {/* Industry Tips */}
        <div className="improvement-card">
          <div className="card-header">
            <h3><i className="fas fa-industry text-orange-500 mr-2"></i>Industry Tips</h3>
            <span className="badge">{improvements.industryTips?.length || 0} suggestions</span>
          </div>
          <div className="suggestions-list">
            {improvements.industryTips?.map((tip, index) => (
              <div key={index} className="suggestion-item">
                <i className="fas fa-star text-orange-500"></i>
                <span>{tip}</span>
              </div>
            )) || <p className="text-gray-500">No industry tips available</p>}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="btn-primary"
          onClick={() => window.print()}
        >
          <i className="fas fa-print"></i>
          Print Scorecard
        </button>
        <button 
          className="btn-secondary"
          onClick={fetchImprovements}
        >
          <i className="fas fa-refresh"></i>
          Refresh Analysis
        </button>
        <button 
          className="btn-outline"
          onClick={() => window.location.href = '#resume-analysis'}
        >
          <i className="fas fa-arrow-left"></i>
          Back to Analysis
        </button>
      </div>
    </div>
  );
}
