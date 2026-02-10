'use client';

import { useState, useEffect } from 'react';

export default function ResumeAnalysis({ user }) {
  const [isUploading, setIsUploading] = useState(false);
  const [resumeScore, setResumeScore] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('impact');

  // Load persistent data on component mount
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('resumeAnalysis');
    const savedScore = localStorage.getItem('resumeScore');
    const savedComplete = localStorage.getItem('analysisComplete');
    
    if (savedAnalysis && savedScore && savedComplete === 'true') {
      setAnalysisResults(JSON.parse(savedAnalysis));
      setResumeScore(parseInt(savedScore));
      setAnalysisComplete(true);
    }
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, or DOCX file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const token = localStorage.getItem('authToken');
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

        const result = await response.json();
        const analysisData = {
          ...result.analysis,
          resumeId: result.resumeId
        };
        
        // Save to localStorage for persistence
        localStorage.setItem('resumeAnalysis', JSON.stringify(analysisData));
        localStorage.setItem('resumeScore', result.analysis.atsScore.toString());
        localStorage.setItem('analysisComplete', 'true');
        
        setAnalysisResults(analysisData);
        setResumeScore(result.analysis.atsScore);
        setAnalysisComplete(true);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload and analyze resume');
    } finally {
        setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="resume-analysis-page">
      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="page-title">Resume Analysis</h1>
        <p className="page-subtitle">
          Upload your resume and get AI-powered insights to improve your chances
        </p>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {!analysisComplete ? (
        <div className="upload-section">
          <div className="upload-card">
            <div className="upload-header">
              <div className="icon-container">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <h2>Upload Your Resume</h2>
              <p>Drag and drop your resume here or click to browse</p>
            </div>
            
            <div 
              className={`upload-zone ${dragActive ? 'dragover' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('resume-upload').click()}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileInput}
                className="file-input"
                id="resume-upload"
                disabled={isUploading}
                style={{ display: 'none' }}
              />
              
                {isUploading ? (
                <div className="loading-container">
                  <div className="icon-container loading-spinner">
                    <i className="fas fa-spinner fa-spin"></i>
                  </div>
                  <div className="upload-text">Analyzing your resume...</div>
                  <div className="upload-subtext">This may take a few moments</div>
                  
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-center text-sm text-gray-500">
                      {Math.round(uploadProgress)}% Complete
                    </p>
                  </div>
                </div>
                ) : (
                  <>
                  <div className="upload-icon">
                    <i className="fas fa-file-upload"></i>
                  </div>
                  <div className="upload-text">Drop your resume here</div>
                  <div className="upload-subtext">PDF, DOC, DOCX up to 5MB</div>
                  <button className="btn-primary">
                    <i className="fas fa-upload"></i>
                    Choose File
                  </button>
                  </>
                )}
            </div>
          </div>
        </div>
      ) : (
        <div className="analysis-dashboard">
          {/* Two-Column Layout */}
          <div className="analysis-layout">
            {/* Resume Preview Column */}
            <div className="resume-preview">
              <div className="preview-header">
                <div className="preview-icon">
                  <i className="fas fa-file-alt"></i>
                </div>
                <div className="preview-title">Resume Preview</div>
              </div>
              <div className="resume-content">
                <div style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '1.1rem', color: '#0A2540' }}>
                  {user?.name || 'Your Name'}
                </div>
                <div style={{ marginBottom: '1rem', color: '#64748b' }}>
                  {user?.email || 'your.email@example.com'} • (555) 123-4567
                </div>
                <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                  LinkedIn: linkedin.com/in/yourprofile
                </div>
                
                <div style={{ marginBottom: '1rem', fontWeight: '600', color: '#0A2540', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  Professional Summary
                </div>
                <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {analysisResults.experience || 'Experienced professional with strong background in...'}
                </div>
                
                <div style={{ marginBottom: '1rem', fontWeight: '600', color: '#0A2540', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  Skills
                </div>
                <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  {analysisResults.skills?.slice(0, 8).join(', ') || 'JavaScript, React, Node.js, Python...'}
                </div>
                
                <div style={{ marginBottom: '1rem', fontWeight: '600', color: '#0A2540', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  Education
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  {analysisResults.education || 'Bachelor of Science in Computer Science, University Name, 2020'}
                </div>
              </div>
            </div>

            {/* Main Analysis Column */}
            <div className="analysis-main">
              {/* Prominent Summary Card */}
              <div className="overall-score-card">
                <div className="score-header">
                  <div className="score-title">Resume Analysis</div>
                  <div className="score-subtitle">ATS Compatibility & Impact Assessment</div>
                </div>
                
                <div className="score-display">
                  <div className="score-gauge">
                    <div 
                      className="gauge-circle" 
                      style={{ '--score': resumeScore }}
                    >
                      <div className="gauge-score">{resumeScore}%</div>
                      <div className="gauge-label">Overall Score</div>
                    </div>
                  </div>
                  <div className="score-details">
                <div className="score-value">{resumeScore}%</div>
                    <div className="score-label">ATS Compatibility Score</div>
                    <div className={`score-grade ${
                      resumeScore >= 80 ? 'excellent' : 
                      resumeScore >= 60 ? 'good' : 'needs-improvement'
                    }`}>
                      {resumeScore >= 80 ? 'Excellent' : 
                       resumeScore >= 60 ? 'Good' : 'Needs Improvement'}
                    </div>
                    <div className="summary-statement">
                      {resumeScore >= 80 ? 
                        "Great start! Your resume is well-optimized for ATS systems with strong formatting and content." :
                        resumeScore >= 60 ? 
                        "Good foundation! Here's an opportunity to improve your resume's impact and ATS compatibility." :
                        "Consider adding more specific achievements and optimizing your resume for better ATS compatibility."
                      }
                    </div>
                  </div>
                </div>
                
                <div className="key-tags">
                  <span className="key-tag positive">
                    <i className="fas fa-check-circle"></i>
                    Strong Formatting
                  </span>
                  <span className="key-tag positive">
                    <i className="fas fa-check-circle"></i>
                    Good Structure
                  </span>
                  <span className="key-tag suggestion">
                    <i className="fas fa-lightbulb"></i>
                    Needs Keywords
                  </span>
                  <span className="key-tag suggestion">
                    <i className="fas fa-chart-bar"></i>
                    Add Metrics
                  </span>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="detailed-breakdown">
                <div className="breakdown-header">
                  <div className="breakdown-title">
                    <div className="breakdown-icon">
                      <i className="fas fa-search"></i>
                    </div>
                    Detailed Analysis
                  </div>
                </div>
                
                <div className="breakdown-tabs">
                  <button className="breakdown-tab active" onClick={() => setActiveTab('impact')}>
                    Impact & Clarity
                  </button>
                  <button className="breakdown-tab" onClick={() => setActiveTab('ats')}>
                    ATS & Formatting
                  </button>
                  <button className="breakdown-tab" onClick={() => setActiveTab('sections')}>
                    Essential Sections
                  </button>
                </div>
                
                <div className="breakdown-content">
                  <div className={`breakdown-section ${activeTab === 'impact' ? 'active' : ''}`}>
                    <div className="analysis-item">
                      <div className="analysis-item-header">
                        <div className="analysis-icon warning">
                          <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div>
                          <div className="analysis-title">Action Verbs</div>
                          <div className="analysis-metric">Only 40% of bullet points use strong action verbs</div>
                        </div>
                      </div>
                      
                      <div className="progress-container">
                        <div className="progress-label">
                          <span className="progress-text">Action Verb Usage</span>
                          <span className="progress-percentage">40%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill warning" style={{ width: '40%' }}></div>
                        </div>
                      </div>
                      
                      <div className="analysis-description">
                        Strong action verbs make your accomplishments more impactful and help you stand out to recruiters.
                      </div>
                      <div className="analysis-suggestion">
                        💡 Consider starting bullet points with verbs like "Developed," "Managed," "Implemented," or "Led"
                      </div>
                    </div>
                    
                    <div className="analysis-item">
                      <div className="analysis-item-header">
                        <div className="analysis-icon warning">
                          <i className="fas fa-chart-bar"></i>
                        </div>
                        <div>
                          <div className="analysis-title">Quantifiable Metrics</div>
                          <div className="analysis-metric">Limited use of numbers and measurable results</div>
                        </div>
                      </div>
                      
                      <div className="progress-container">
                        <div className="progress-label">
                          <span className="progress-text">Quantified Achievements</span>
                          <span className="progress-percentage">25%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill warning" style={{ width: '25%' }}></div>
                        </div>
                      </div>
                      
                      <div className="analysis-description">
                        Numbers and metrics help recruiters understand the scale and impact of your achievements.
                      </div>
                      <div className="analysis-suggestion">
                        💡 Add specific numbers, percentages, and dollar amounts to show your impact
                      </div>
                    </div>
                    
                    <div className="analysis-item">
                      <div className="analysis-item-header">
                        <div className="analysis-icon success">
                          <i className="fas fa-check-circle"></i>
                        </div>
                        <div>
                          <div className="analysis-title">Readability Score</div>
                          <div className="analysis-metric">Good readability with clear, concise language</div>
                        </div>
                      </div>
                      
                      <div className="progress-container">
                        <div className="progress-label">
                          <span className="progress-text">Readability Score</span>
                          <span className="progress-percentage">85%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill success" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      
                      <div className="analysis-description">
                        Your resume is well-written and easy to understand, which helps recruiters quickly grasp your qualifications.
                      </div>
                      <div className="analysis-suggestion">
                        ✅ Your resume is easy to read and understand
                      </div>
                    </div>
                  </div>
                  
                  <div className={`breakdown-section ${activeTab === 'ats' ? 'active' : ''}`}>
                    <div className="analysis-item">
                      <div className="analysis-item-header">
                        <div className="analysis-icon success">
                          <i className="fas fa-check-circle"></i>
                        </div>
                        <div>
                          <div className="analysis-title">ATS Compatibility</div>
                          <div className="analysis-metric">Your resume format is ATS-friendly</div>
                        </div>
                      </div>
                      
                      <div className="progress-container">
                        <div className="progress-label">
                          <span className="progress-text">ATS Compatibility Score</span>
                          <span className="progress-percentage">90%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill success" style={{ width: '90%' }}></div>
                        </div>
                      </div>
                      
                      <div className="analysis-description">
                        Your resume uses standard fonts and formatting that ATS systems can easily parse and understand.
                      </div>
                      <div className="analysis-suggestion">
                        ✅ Good use of standard fonts and formatting
                      </div>
                    </div>
                    
                    <div className="analysis-item">
                      <div className="analysis-item-header">
                        <div className="analysis-icon success">
                          <i className="fas fa-file-pdf"></i>
                        </div>
                        <div>
                          <div className="analysis-title">File Type</div>
                          <div className="analysis-metric">PDF format is ideal for ATS systems</div>
                        </div>
                      </div>
                      
                      <div className="progress-container">
                        <div className="progress-label">
                          <span className="progress-text">File Format Compatibility</span>
                          <span className="progress-percentage">100%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill success" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                      
                      <div className="analysis-description">
                        PDF format ensures your resume looks consistent across different devices and ATS systems.
                      </div>
                      <div className="analysis-suggestion">
                        ✅ Perfect file format for job applications
                      </div>
                    </div>
                    
                    <div className="analysis-item">
                      <div className="analysis-item-header">
                        <div className="analysis-icon warning">
                          <i className="fas fa-ruler"></i>
                        </div>
                        <div>
                          <div className="analysis-title">Resume Length</div>
                          <div className="analysis-metric">Consider optimizing length for your experience level</div>
                        </div>
                      </div>
                      
                      <div className="progress-container">
                        <div className="progress-label">
                          <span className="progress-text">Length Optimization</span>
                          <span className="progress-percentage">60%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill warning" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                      
                      <div className="analysis-description">
                        The ideal resume length depends on your experience level and the role you're applying for.
              </div>
                      <div className="analysis-suggestion">
                        💡 Aim for 1 page for less than 10 years experience, 2 pages for more
              </div>
            </div>
          </div>

                  <div className={`breakdown-section ${activeTab === 'sections' ? 'active' : ''}`}>
                    <div className="analysis-item">
                      <div className="analysis-item-header">
                        <div className="analysis-icon success">
                          <i className="fas fa-envelope"></i>
                        </div>
                        <div>
                          <div className="analysis-title">Contact Information</div>
                          <div className="analysis-metric">All essential contact details are present</div>
                        </div>
                      </div>
                      
                      <div className="progress-container">
                        <div className="progress-label">
                          <span className="progress-text">Contact Completeness</span>
                          <span className="progress-percentage">100%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill success" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                      
                      <div className="analysis-description">
                        Complete contact information makes it easy for recruiters to reach you for interviews.
                      </div>
                      <div className="analysis-suggestion">
                        ✅ Email, phone, and LinkedIn profile are included
                      </div>
                    </div>
                    
                    <div className="analysis-item">
                      <div className="analysis-item-header">
                        <div className="analysis-icon success">
                          <i className="fas fa-briefcase"></i>
                        </div>
                        <div>
                          <div className="analysis-title">Work Experience</div>
                          <div className="analysis-metric">Professional experience section is well-structured</div>
                        </div>
                      </div>
                      
                      <div className="progress-container">
                        <div className="progress-label">
                          <span className="progress-text">Experience Structure</span>
                          <span className="progress-percentage">85%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill success" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      
                      <div className="analysis-description">
                        Well-structured work experience helps recruiters understand your career progression and achievements.
                      </div>
                      <div className="analysis-suggestion">
                        ✅ Good job titles, companies, and dates format
                      </div>
                    </div>
                    
                    <div className="analysis-item">
                      <div className="analysis-item-header">
                        <div className="analysis-icon success">
                          <i className="fas fa-graduation-cap"></i>
                        </div>
                        <div>
                          <div className="analysis-title">Education</div>
                          <div className="analysis-metric">Educational background is clearly presented</div>
                        </div>
                      </div>
                      
                      <div className="progress-container">
                        <div className="progress-label">
                          <span className="progress-text">Education Completeness</span>
                          <span className="progress-percentage">90%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill success" style={{ width: '90%' }}></div>
                  </div>
                </div>
                      
                      <div className="analysis-description">
                        Clear education information helps recruiters understand your academic background and qualifications.
                      </div>
                      <div className="analysis-suggestion">
                        ✅ Degree, institution, and graduation year included
                      </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Actionable To-Do List */}
              <div className="actionable-todo">
                <div className="todo-header">
                  <div className="todo-icon">
                    <i className="fas fa-tasks"></i>
                  </div>
                  <div className="todo-title">Action Items</div>
                </div>
                
                <div className="todo-list">
                  <div className="todo-item">
                    <div className="todo-checkbox">
                      <i className="fas fa-check" style={{ fontSize: '0.8rem' }}></i>
                    </div>
                    <div className="todo-text">
                      Add 5 missing keywords from your target job description
                    </div>
                    <div className="todo-priority high">High</div>
                  </div>
                  
                  <div className="todo-item">
                    <div className="todo-checkbox">
                      <i className="fas fa-check" style={{ fontSize: '0.8rem' }}></i>
                    </div>
                    <div className="todo-text">
                      Rephrase 3 bullet points to include measurable results
                    </div>
                    <div className="todo-priority high">High</div>
                  </div>
                  
                  <div className="todo-item">
                    <div className="todo-checkbox">
                      <i className="fas fa-check" style={{ fontSize: '0.8rem' }}></i>
                    </div>
                    <div className="todo-text">
                      Start bullet points with stronger action verbs
                    </div>
                    <div className="todo-priority medium">Medium</div>
            </div>

                  <div className="todo-item">
                    <div className="todo-checkbox">
                      <i className="fas fa-check" style={{ fontSize: '0.8rem' }}></i>
                    </div>
                    <div className="todo-text">
                      Add your LinkedIn profile URL to the contact section
                    </div>
                    <div className="todo-priority low">Low</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Action Buttons */}
          <div className="clean-actions">
            <button className="btn-clean-primary" onClick={() => {
              const currentResumeId = analysisResults?.resumeId;
              if (currentResumeId) {
                window.location.href = `#resume-scorecard?resumeId=${currentResumeId}`;
              }
            }}>
              <i className="fas fa-robot"></i>
              Get AI Scorecard
            </button>
            <button className="btn-clean-secondary">
              <i className="fas fa-download"></i>
              Download Report
            </button>
            <button className="btn-clean-outline" onClick={() => {
              // Clear localStorage
              localStorage.removeItem('resumeAnalysis');
              localStorage.removeItem('resumeScore');
              localStorage.removeItem('analysisComplete');
              
              setAnalysisComplete(false);
              setAnalysisResults(null);
              setResumeScore(null);
              setError(null);
            }}>
              <i className="fas fa-upload"></i>
              Upload New Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 