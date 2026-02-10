'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion';
import { Upload, FileText, BarChart, CheckCircle, AlertCircle, Loader2, X, Download, Eye, HelpCircle, Sparkles, Lightbulb, TrendingUp, Target, Zap, Award } from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1],
      opacity: { duration: 0.4 }
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
      when: "beforeChildren"
    }
  }
};

const itemFadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

const ResumeAnalysis = ({ user, onAnalysisComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [resumeScore, setResumeScore] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showParsedPreview, setShowParsedPreview] = useState(false);

  const calculateScore = (data) => {
    let score = 0;
    let details = [];
    let penalties = [];
    
    // Contact Information (0-10 points) - Basic requirement
    if (data.contact?.emails?.length > 0 && data.contact?.phones?.length > 0) {
      score += 10;
      details.push('✓ Complete contact info');
    } else if (data.contact?.emails?.length > 0 || data.contact?.phones?.length > 0) {
      score += 5;
      details.push('⚠ Partial contact info');
      penalties.push('Missing email or phone');
    } else {
      penalties.push('Missing contact information');
    }
    
    // Skills Section (0-25 points) - STRICT, REALISTIC evaluation
    const skillCount = data.skills?.length || 0;
    if (skillCount === 0) {
      penalties.push('No skills section found or no valid skills extracted');
      details.push('✗ No skills detected');
    } else {
      const { points: skillPoints, note: skillNote } = computeWeightedSkillPoints(data.skills || []);
      score += skillPoints;
      details.push(`✓ ${skillNote} (${skillCount} skills)`);
      if (skillPoints < 10) {
        penalties.push('Consider adding more relevant technical skills');
      }
    }
    
    // Work Experience (0-35 points) - Most important section
    const expCount = data.experience?.length || 0;
    const hasRealExp = data.experience?.some(exp => 
      !exp.includes('No work experience') && 
      !exp.includes('couldn\'t be parsed') &&
      exp.length > 30  // Stricter requirement
    );
    
    if (!hasRealExp || expCount === 0) {
      penalties.push('No work experience found');
      details.push('✗ No work experience');
    } else if (expCount >= 4) {
      score += 35;
      details.push(`✓ Extensive experience (${expCount} roles)`);
    } else if (expCount >= 3) {
      score += 28;
      details.push(`✓ Solid experience (${expCount} roles)`);
    } else if (expCount >= 2) {
      score += 18;
      details.push(`⚠ Moderate experience (${expCount} roles)`);
      penalties.push('Experience section could be more detailed');
    } else {
      score += 8;
      details.push(`⚠ Minimal experience (${expCount} role)`);
      penalties.push('Limited work history');
    }
    
    // Education (0-15 points)
    const eduCount = data.education?.length || 0;
    const hasRealEdu = data.education?.some(edu => 
      !edu.includes('No education') && 
      !edu.includes('couldn\'t be parsed') &&
      edu.length > 20  // Stricter
    );
    
    if (!hasRealEdu || eduCount === 0) {
      penalties.push('No education section found');
      details.push('✗ No education listed');
    } else if (eduCount >= 2) {
      score += 15;
      details.push(`✓ Complete education (${eduCount} entries)`);
    } else {
      score += 10;
      details.push(`✓ Education listed (${eduCount} entry)`);
    }
    
    // Content Quality (0-15 points) - Comprehensive check
    const totalWords = data.word_count || 0;
    if (totalWords >= 400) {
      score += 15;
      details.push('✓ Well-detailed content');
    } else if (totalWords >= 250) {
      score += 10;
      details.push('⚠ Adequate detail');
      penalties.push('Could provide more detail about experience');
    } else if (totalWords >= 150) {
      score += 5;
      details.push('⚠ Brief content');
      penalties.push('Resume lacks sufficient detail');
    } else {
      score += 2;
      details.push('✗ Too brief');
      penalties.push('Resume is critically short');
    }
    
    // Apply reality check - prevent inflated scores
    const finalScore = Math.min(score, 100);
    
    // Additional penalties for weak resumes
    if (skillCount < 5 && expCount < 2) {
      const weakPenalty = 10;
      score = Math.max(0, finalScore - weakPenalty);
      penalties.push(`Overall resume needs significant improvement (-${weakPenalty} points)`);
    }
    
    return {
      score: Math.max(0, Math.min(score, 100)),
      details: details,
      penalties: penalties,
      breakdown: {
        contact: data.contact?.emails?.length > 0 && data.contact?.phones?.length > 0 ? 10 : 5,
        skills: skillCount,
        experience: expCount,
        education: eduCount,
        wordCount: totalWords
      }
    };
  };

  // Skill categories and weights for weighted scoring
  const SKILL_CATEGORY_MAP = {
    // Backend
    'Node.js': 'backend', 'Express': 'backend', 'Django': 'backend', 'Flask': 'backend', 'FastAPI': 'backend', 'Spring Boot': 'backend', 'NestJS': 'backend', 'GraphQL': 'backend', 'REST': 'backend',
    // Databases
    'PostgreSQL': 'db', 'MySQL': 'db', 'MongoDB': 'db', 'Redis': 'db', 'SQLite': 'db',
    // Cloud/DevOps
    'AWS': 'cloud', 'Azure': 'cloud', 'GCP': 'cloud', 'Docker': 'cloud', 'Kubernetes': 'cloud', 'Terraform': 'cloud',
    // Frontend
    'React': 'frontend', 'Next.js': 'frontend', 'Redux': 'frontend', 'HTML': 'frontend', 'CSS': 'frontend', 'Sass': 'frontend', 'Tailwind CSS': 'frontend', 'Webpack': 'frontend', 'Vite': 'frontend',
    // Testing
    'Jest': 'test', 'Mocha': 'test', 'Chai': 'test', 'Cypress': 'test', 'Selenium': 'test',
    // General/Tools
    'Git': 'general', 'GitHub': 'general', 'GitLab': 'general', 'Bitbucket': 'general', 'Jira': 'general', 'Confluence': 'general',
    // Languages
    'JavaScript': 'lang', 'TypeScript': 'lang', 'Java': 'lang', 'Python': 'lang'
  };

  const SKILL_WEIGHTS = {
    backend: 2.0,
    db: 1.6,
    cloud: 1.8,
    frontend: 1.2,
    test: 1.1,
    general: 0.6,
    lang: 1.4
  };

  // Compute weighted skill points normalized to 0-25
  const computeWeightedSkillPoints = (skills) => {
    if (!Array.isArray(skills) || skills.length === 0) return { points: 0, note: 'No skills detected' };

    const seen = new Set();
    let weighted = 0;

    for (const s of skills) {
      if (!s || typeof s !== 'string') continue;
      const canon = s.trim();
      if (!canon) continue;
      const key = canon.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const cat = SKILL_CATEGORY_MAP[canon] || 'general';
      const w = SKILL_WEIGHTS[cat] ?? 1.0;
      weighted += Math.min(w, 2.2);
    }

    const normalized = Math.min(25, Math.round((weighted / 18) * 25));
    const note = `Weighted skills: ${normalized}/25 (raw=${weighted.toFixed(1)})`;
    return { points: normalized, note };
  };

  // Canonical skill mapping with lightweight fuzzy matching
  const CANONICAL_SKILLS = [
    'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Redux', 'Node.js', 'Express',
    'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'GraphQL', 'REST', 'HTML', 'CSS', 'Sass',
    'Tailwind CSS', 'Bootstrap', 'Webpack', 'Vite', 'Jest', 'Mocha', 'Chai', 'Cypress', 'Selenium',
    'Docker', 'Kubernetes', 'Terraform', 'AWS', 'Azure', 'GCP', 'Git', 'GitHub', 'GitLab', 'Bitbucket',
    'Jira', 'Confluence', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel', 'NestJS', 'Socket.IO'
  ];

  const SKILL_ALIASES = {
    'Node.js': ['Node', 'NodeJS', 'Node Js', 'node-js'],
    'Next.js': ['Next', 'NextJS', 'Next js', 'Nextjs'],
    'Tailwind CSS': ['Tailwind', 'TailwindCSS', 'tailwindcss', 'tailwind css'],
    'PostgreSQL': ['Postgres'],
    'Kubernetes': ['K8s', 'k8s'],
    'JavaScript': ['JS', 'Javascript'],
    'TypeScript': ['TS', 'Typescript'],
    'REST': ['RESTful', 'REST API'],
    'React': ['ReactJS', 'React.js', 'React js'],
    'Express': ['ExpressJS', 'Express.js', 'Express js'],
    'GitHub': ['Github'],
    'GitLab': ['Gitlab'],
    'Spring Boot': ['SpringBoot', 'Spring boot', 'Spring']
  };

  const ALIAS_TO_CANON = (() => {
    const map = {};
    Object.keys(SKILL_ALIASES).forEach((canon) => {
      SKILL_ALIASES[canon].forEach((alias) => {
        map[alias.toLowerCase()] = canon;
      });
    });
    CANONICAL_SKILLS.forEach((canon) => {
      map[canon.toLowerCase()] = canon;
    });
    return map;
  })();

  const normalizeSkillString = (s) => {
    if (!s || typeof s !== 'string') return '';
    let out = s.trim();
    out = out.replace(/[_\.]/g, ' ');
    out = out.replace(/\s+/g, ' ');
    out = out.replace(/\b(v|ver|version)\s*\d+(?:\.\d+)*\b/gi, '');
    out = out.replace(/\b\d+(?:\.\d+)*\b/g, '');
    return out.trim().toLowerCase();
  };

  const tokenize = (s) => normalizeSkillString(s)
    .split(' ')
    .filter(Boolean);

  // Lightweight token-set similarity (0..100)
  const tokenSetSimilarity = (a, b) => {
    const ta = new Set(tokenize(a));
    const tb = new Set(tokenize(b));
    if (ta.size === 0 || tb.size === 0) return 0;
    let intersect = 0;
    ta.forEach((t) => { if (tb.has(t)) intersect += 1; });
    const score = (2 * intersect) / (ta.size + tb.size); // Sørensen–Dice
    return Math.round(score * 100);
  };

  const partialSimilarity = (a, b) => {
    const na = normalizeSkillString(a);
    const nb = normalizeSkillString(b);
    if (!na || !nb) return 0;
    if (na === nb) return 100;
    if (na.includes(nb) || nb.includes(na)) return Math.round((Math.min(na.length, nb.length) / Math.max(na.length, nb.length)) * 100);
    return 0;
  };

  const bestSimilarityScore = (a, b) => {
    return Math.max(tokenSetSimilarity(a, b), partialSimilarity(a, b));
  };

  const mapToCanonicalSkills = (candidates) => {
    if (!Array.isArray(candidates)) return [];
    const detected = new Set();

    for (const raw of candidates) {
      if (!raw || typeof raw !== 'string') continue;
      const norm = normalizeSkillString(raw);
      if (!norm) continue;

      // Exact/alias mapping
      const aliased = ALIAS_TO_CANON[norm];
      if (aliased) {
        detected.add(aliased);
        continue;
      }

      // Fuzzy mapping
      let best = null;
      let bestScore = 0;
      for (const canon of CANONICAL_SKILLS) {
        const score = bestSimilarityScore(norm, canon);
        if (score > bestScore) {
          bestScore = score;
          best = canon;
        }
      }
      // Use stricter threshold by default; loosen if looks like a skills list token
      const threshold = /[,;•\-]/.test(raw) ? 78 : 85;
      if (best && bestScore >= threshold) {
        detected.add(best);
      }
    }

    return Array.from(detected);
  };

  // Finalize skills by removing obvious junk only (length and negative patterns)
  const finalizeSkills = (skills) => {
    const excludePatterns = [
      /\d{1,2}\/\d{1,4}/,
      /^\d{4}$/,
      /^\d{1,2}$/,
      /^[a-z]\s+/i,
      /gurugram|delhi|mumbai|bangalore|india|noida|gurgaon/i,
      /automated|tracking|spending|expenses|patterns/i,
      /soft\s+skills|hard\s+skills/i,
      /integration|styling|design|concepts|effort|times|section/i,
      /particular|generative|consistent|logical|minimal|fast|load/i,
      /google\s+fonts|github\s+copilot|chatgpt/i,
      /link|website|portfolio|email|phone|address/i,
      /^(the|and|or|of|in|to|for|with|on|at|from|by|a|an)$/i,
      /qna|desi|websjyoti|copilot/i,
      /january|february|march|april|may|june|july|august|september|october|november|december/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
    ];

    const out = [];
    const seen = new Set();
    for (const s of skills) {
      if (!s || typeof s !== 'string') continue;
      const trimmed = s.trim();
      const lower = trimmed.toLowerCase();
      if (lower.length < 2 || lower.length > 40) continue;
      if (excludePatterns.some((p) => p.test(lower))) continue;
      const display = (ALIAS_TO_CANON[lower] || trimmed).replace(/\s+/g, ' ').trim();
      if (!seen.has(display.toLowerCase())) {
        seen.add(display.toLowerCase());
        out.push(display);
      }
    }
    return out;
  };

  const cleanSkills = (skills) => {
    if (!skills || !Array.isArray(skills)) return [];
    
    // STRICT filtering - only keep real technical skills
    const validSkills = [
      // Programming Languages
      'javascript', 'java', 'python', 'typescript', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust', 'scala', 'perl', 'r',
      // Frontend
      'react', 'angular', 'vue', 'vuejs', 'nextjs', 'next', 'nuxt', 'svelte', 'ember', 'jquery', 'redux', 'webpack', 'vite',
      'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui',
      // Backend
      'node', 'nodejs', 'express', 'expressjs', 'django', 'flask', 'spring', 'springboot', 'laravel', 'fastapi', 'nestjs',
      // Databases
      'mongodb', 'mysql', 'postgresql', 'postgres', 'redis', 'firebase', 'firestore', 'dynamodb', 'cassandra', 'oracle', 'sql', 'nosql',
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'jenkins', 'ci/cd', 'terraform', 'ansible',
      // Tools
      'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'postman', 'vscode', 'intellij',
      // APIs & Protocols
      'rest', 'restful', 'api', 'graphql', 'websocket', 'grpc', 'soap', 'json', 'xml',
      // Testing
      'jest', 'mocha', 'chai', 'cypress', 'selenium', 'junit', 'pytest', 'testing',
      // Mobile
      'react native', 'flutter', 'ios', 'android', 'swift', 'kotlin',
      // Other Technical
      'agile', 'scrum', 'machine learning', 'ml', 'ai', 'data science', 'analytics', 'linux', 'windows', 'macos'
    ];
    
    // Known skill patterns
    const skillPatterns = [
      /^(java|python|javascript|typescript|c\+\+|c#|ruby|php|swift|kotlin|go|rust)$/i,
      /^(react|angular|vue|next|nuxt|svelte|ember)(\s*(js|\.js))?$/i,
      /^node(\.?js)?$/i,
      /^express(\.?js)?$/i,
      /^(mongodb|mysql|postgresql|postgres|redis|firebase)$/i,
      /^(aws|azure|gcp|docker|kubernetes|k8s)$/i,
      /^(html5?|css3?|sass|scss|tailwind(css)?)$/i,
      /^(git|github|gitlab|bitbucket)$/i,
      /^(rest|restful|api|graphql)$/i,
      /stack\s+developer$/i,
      /^full\s+stack$/i,
      /^web\s+development$/i
    ];
    
    // Aggressive exclusion patterns
    const excludePatterns = [
      /\d{1,2}\/\d{1,4}/,                       // Any date pattern
      /^\d{4}$/,                                 // Just year
      /^\d{1,2}$/,                              // Just numbers
      /^[a-z]\s+/i,                             // Starts with single letter + space
      /gurugram|delhi|mumbai|bangalore|india|noida|gurgaon/i, // Cities
      /automated|tracking|spending|expenses|patterns/i,
      /soft\s+skills|hard\s+skills/i,
      /integration|styling|design|concepts|effort|times|section/i,
      /particular|generative|consistent|logical|minimal|fast|load/i,
      /google\s+fonts|github\s+copilot|chatgpt/i,
      /link|website|portfolio|email|phone|address/i,
      /^(the|and|or|of|in|to|for|with|on|at|from|by|a|an)$/i,
      /qna|desi|websjyoti|copilot/i,
      /january|february|march|april|may|june|july|august|september|october|november|december/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
    ];
    
    return skills.filter(skill => {
      if (!skill || typeof skill !== 'string') return false;
      
      const trimmed = skill.trim().toLowerCase();
      
      // Must be 2-40 characters
      if (trimmed.length < 2 || trimmed.length > 40) return false;
      
      // Exclude bad patterns first
      if (excludePatterns.some(pattern => pattern.test(trimmed))) {
        return false;
      }
      
      // Check if it's in valid skills list
      if (validSkills.includes(trimmed)) return true;
      
      // Check if it matches skill patterns
      if (skillPatterns.some(pattern => pattern.test(trimmed))) return true;
      
      // Additional checks for compound skills
      if (trimmed.includes('developer') || trimmed.includes('programming') || trimmed.includes('framework')) {
        return true;
      }
      
      // Reject everything else to be safe
      return false;
    });
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    setFileName(file.name);
    setUploadProgress(20);

    // Prepare original PDF preview (non-blocking)
    if (file.type === 'application/pdf') {
      try { if (pdfUrl) URL.revokeObjectURL(pdfUrl); } catch {}
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    } else {
      // Clear any previous PDF preview for non-PDF uploads
      try { if (pdfUrl) URL.revokeObjectURL(pdfUrl); } catch {}
      setPdfUrl(null);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const parseStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      setUploadProgress(40);
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process resume');
      }

      const result = await response.json();
      setUploadProgress(90);

      if (result.error) {
        throw new Error(result.error);
      }

      // Log original skills from parser
      console.log('Skills from Python parser:', result.skills);
      
      // Canonicalize to a controlled skill list, then remove obvious junk
      const canonicalSkills = mapToCanonicalSkills(result.skills || []);
      const cleanedSkills = finalizeSkills(canonicalSkills);
      console.log('Skills after canonical mapping:', canonicalSkills);
      console.log('Skills after final cleanup:', cleanedSkills);
      
      const cleanedResult = {
        ...result,
        skills: cleanedSkills
      };
      
      // Store extracted data
      setAnalysisResults({
        extractedData: cleanedResult
      });
      
      // Calculate realistic score
      const scoreResult = calculateScore(cleanedResult);
      setResumeScore(scoreResult.score);
      
      console.log('Resume Score Breakdown:', scoreResult.details);
      
      setUploadProgress(100);
      setAnalysisComplete(true);
      
      // Save to localStorage for dashboard
      const userId = user?.id || user?._id || 'default';
      localStorage.setItem(`resumeAnalysis_${userId}`, JSON.stringify(cleanedResult));
      localStorage.setItem(`resumeScore_${userId}`, scoreResult.score.toString());
      localStorage.setItem(`analysisTimestamp_${userId}`, new Date().toISOString());
      
      // Dispatch event to notify dashboard of update
      window.dispatchEvent(new Event('resumeAnalyzed'));
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }

      // Non-blocking: persist analysis and timing to backend
      const parseEnd = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const parseDurationMs = Math.round(parseEnd - parseStart);
      (async () => {
        try {
          const token = localStorage.getItem('token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          await fetch('/api/resume/store', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              userId,
              analysis: cleanedResult,
              score: scoreResult.score,
              scoreBreakdown: scoreResult.details,
              penalties: scoreResult.penalties,
              breakdownCounts: scoreResult.breakdown,
              parseDurationMs,
              createdAt: new Date().toISOString()
            })
          });
        } catch (e) {
          console.warn('Failed to persist resume analysis:', e);
        }
      })();

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to process resume. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleGetSuggestions = async () => {
    if (!analysisResults?.extractedData) return;
    
    setIsGeneratingSuggestions(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/resume/suggestions', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          resumeData: analysisResults.extractedData,
          currentScore: resumeScore, // Pass current analysis score
          currentAnalysis: aiAnalysis,
          requestType: 'comprehensive'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const result = await response.json();
      
      if (result.success && result.suggestions) {
        setAiSuggestions(result.suggestions);
        setShowSuggestions(true);
      } else {
        throw new Error('Invalid response format');
      }

    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const renderUploadArea = () => (
    <motion.div 
      className={`relative p-12 border-2 border-dashed rounded-2xl transition-all duration-300 ${
        dragActive 
          ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]' 
          : 'border-white/20 hover:border-indigo-400/50 bg-white/5'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={!dragActive ? {
        borderColor: 'rgba(129, 140, 248, 0.5)',
        scale: 1.01,
        transition: { duration: 0.2 }
      } : {}}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl"></div>
      </div>
      
      <div className="relative text-center">
        <motion.div 
          className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mb-6"
          animate={{
            scale: dragActive ? [1, 1.1, 1] : 1,
            rotate: dragActive ? [0, 5, -5, 0] : 0
          }}
          transition={{
            duration: 0.5,
            repeat: dragActive ? Infinity : 0
          }}
        >
          <Upload className="h-10 w-10 text-indigo-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {dragActive ? '✨ Drop your resume here' : 'Drag and drop your resume'}
        </h3>
        <p className="text-sm text-gray-400 mb-6">or</p>
        <label className="cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-indigo-500/50 transform hover:scale-105">
          <Upload className="h-4 w-4 mr-2" />
          Select a file
          <input 
            type="file" 
            className="hidden" 
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
          />
        </label>
        <p className="mt-4 text-xs text-gray-400 flex items-center justify-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          PDF, DOC, or DOCX (max. 5MB)
        </p>
      </div>

      {isUploading && (
        <motion.div 
          className="relative mt-8 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between text-sm text-gray-300 mb-3">
            <span className="truncate max-w-[70%] font-medium">{fileName}</span>
            <span className="font-bold text-indigo-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-2.5 rounded-full relative"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div 
          className="relative mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center text-red-300">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  const renderParsedResumePreview = () => {
    if (!analysisResults?.extractedData) return null;

    const data = analysisResults.extractedData;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-8"
      >
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8"
          style={{
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 20px rgba(129, 140, 248, 0.15)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">
                <Eye className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Parsed Resume Preview</h2>
                <p className="text-sm text-gray-400 mt-1">What we extracted from your resume</p>
              </div>
            </div>
            <button
              onClick={() => setShowParsedPreview(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Resume Content */}
          <div className="space-y-6 bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-6 border border-white/10">
            
            {/* Contact Section */}
            {(data.contact?.emails?.length > 0 || data.contact?.phones?.length > 0) && (
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                  Contact Information
                </h3>
                <div className="bg-white/5 rounded-lg p-4 space-y-2">
                  {data.contact.emails?.map((email, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-indigo-400 text-sm">📧</span>
                      <span className="text-gray-200">{email}</span>
                    </div>
                  ))}
                  {data.contact.phones?.map((phone, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-indigo-400 text-sm">📱</span>
                      <span className="text-gray-200">{phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills Section */}
            {data.skills?.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                  Technical Skills
                </h3>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 rounded-lg text-sm font-medium border border-emerald-500/30"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    {data.skills.length} {data.skills.length === 1 ? 'skill' : 'skills'} extracted
                  </p>
                </div>
              </div>
            )}

            {/* Experience Section */}
            {data.experience && data.experience.length > 0 && !data.experience[0].includes('No work experience') && (
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                  Work Experience
                </h3>
                <div className="space-y-3">
                  {data.experience.map((exp, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border-l-2 border-blue-500">
                      <p className="text-gray-200 text-sm leading-relaxed">{exp}</p>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 mt-2">
                    {data.experience.length} {data.experience.length === 1 ? 'entry' : 'entries'} found
                  </p>
                </div>
              </div>
            )}

            {/* Projects Section */}
            {data.projects && data.projects.length > 0 && !data.projects[0].includes('No projects') && (
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                  Projects
                </h3>
                <div className="space-y-3">
                  {data.projects.map((project, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border-l-2 border-amber-500">
                      <p className="text-gray-200 text-sm leading-relaxed">{project}</p>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 mt-2">
                    {data.projects.length} {data.projects.length === 1 ? 'project' : 'projects'} found
                  </p>
                </div>
              </div>
            )}

            {/* Education Section */}
            {data.education && data.education.length > 0 && !data.education[0].includes('No education') && (
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  Education
                </h3>
                <div className="space-y-3">
                  {data.education.map((edu, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border-l-2 border-purple-500">
                      <p className="text-gray-200 text-sm leading-relaxed">{edu}</p>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 mt-2">
                    {data.education.length} {data.education.length === 1 ? 'entry' : 'entries'} found
                  </p>
                </div>
              </div>
            )}

            {/* Stats Footer */}
            <div className="border-t border-white/10 pt-4 mt-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-400">{data.skills?.length || 0}</div>
                  <div className="text-xs text-gray-400">Skills</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{data.experience?.length || 0}</div>
                  <div className="text-xs text-gray-400">Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{data.projects?.length || 0}</div>
                  <div className="text-xs text-gray-400">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{data.education?.length || 0}</div>
                  <div className="text-xs text-gray-400">Education</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{data.word_count || 0}</div>
                  <div className="text-xs text-gray-400">Words</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderAnalysisResults = () => {
    if (!analysisComplete || !analysisResults) return null;

    return (
      <motion.div 
        className="space-y-6 w-full"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        key="analysis-results"
      >
        <motion.div 
          className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/10 overflow-hidden w-full"
          variants={fadeIn}
          layoutId="analysisCard"
          style={{
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 20px rgba(102, 126, 234, 0.15)'
          }}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <motion.h2 
                className="text-2xl font-bold text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                Resume Analysis
              </motion.h2>
              <motion.span
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 10,
                  delay: 0.2
                }}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Analysis Complete
              </motion.span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                className="col-span-1"
                variants={itemFadeIn}
              >
                {/* Score Card */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 h-full backdrop-blur-sm">
                  <div className="relative w-40 h-40 mx-auto mb-4">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-white/10"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <motion.circle
                        className="text-indigo-400"
                        strokeWidth="8"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 * (1 - (resumeScore || 0) / 100)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                        initial={{ strokeDashoffset: 251.2 }}
                        animate={{
                          strokeDashoffset: 251.2 * (1 - (resumeScore || 0) / 100),
                          transition: { duration: 1.5, ease: [0.16, 1, 0.3, 1] }
                        }}
                      />
                      <text
                        x="50%"
                        y="50%"
                        className="text-3xl font-bold text-white"
                        textAnchor="middle"
                        dy=".3em"
                      >
                        {resumeScore}%
                      </text>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-center text-white">Overall Score</h3>
                  <p className="text-sm text-center text-gray-300 mt-2">
                    {resumeScore >= 80 
                      ? 'Excellent! Your resume is well-optimized.' 
                      : resumeScore >= 60 
                        ? 'Good, but there\'s room for improvement.'
                        : 'Needs work. Consider the suggestions below.'}
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="md:col-span-2"
                variants={staggerContainer}
              >
                <motion.div 
                  className="space-y-4"
                  variants={staggerContainer}
                >
                  <motion.div variants={itemFadeIn}>
                    <h3 className="text-lg font-semibold text-white mb-3">Resume Summary</h3>
                    <div className="space-y-3">
                      <div className="flex items-start bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-300">
                          Resume parsed successfully! {analysisResults.extractedData?.skills?.length || 0} skills detected.
                        </p>
                      </div>
                      <div className="flex items-start bg-emerald-500/10 backdrop-blur-sm p-3 rounded-lg border border-emerald-500/30">
                        <Lightbulb className="h-5 w-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-emerald-200">
                          Click "Get AI Suggestions" below to receive personalized improvement recommendations!
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            {/* Remove automatic AI analysis - only show through button */}
            {false && aiAnalysis && !isAnalyzing && (
              <motion.div variants={itemFadeIn} className="mt-6 space-y-6">
                {/* Score Breakdown */}
                {aiAnalysis.score_breakdown && (
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                    <div className="flex items-center mb-4">
                      <Sparkles className="h-5 w-5 text-purple-400 mr-2" />
                      <h3 className="text-lg font-semibold text-white">AI Score Breakdown</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(aiAnalysis.score_breakdown).map(([key, value]) => (
                        <div key={key} className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-300 capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm font-bold text-indigo-400">{value}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-indigo-400 to-purple-400 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {aiAnalysis.strengths?.length > 0 && (
                  <div className="bg-green-500/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/30">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {aiAnalysis.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-400 mr-2 text-lg">✓</span>
                          <span className="text-sm text-gray-300">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {aiAnalysis.weaknesses?.length > 0 && (
                  <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                      Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                      {aiAnalysis.weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-400 mr-2 font-bold">!</span>
                          <span className="text-sm text-gray-300">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Suggestions */}
                {aiAnalysis.suggestions?.length > 0 && (
                  <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Sparkles className="h-5 w-5 text-blue-400 mr-2" />
                      AI-Powered Suggestions
                    </h3>
                    <div className="space-y-4">
                      {aiAnalysis.suggestions.map((suggestion, index) => (
                        <div key={index} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border-l-4 border-blue-400">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-400 uppercase">{suggestion.category}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              suggestion.priority === 'high' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                              suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              'bg-green-500/20 text-green-300 border border-green-500/30'
                            }`}>
                              {suggestion.priority} priority
                            </span>
                          </div>
                          <p className="text-sm font-medium text-white mb-1">{suggestion.suggestion}</p>
                          <p className="text-xs text-gray-400">{suggestion.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Skills */}
                {aiAnalysis.missing_skills?.length > 0 && (
                  <div className="bg-orange-500/10 backdrop-blur-sm rounded-xl p-6 border border-orange-500/30">
                    <h3 className="text-lg font-semibold text-white mb-3">Missing Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {aiAnalysis.missing_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30"
                        >
                          + {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {aiAnalysis.action_items?.length > 0 && (
                  <div className="bg-indigo-500/10 backdrop-blur-sm rounded-xl p-6 border border-indigo-500/30">
                    <h3 className="text-lg font-semibold text-white mb-3">Action Items</h3>
                    <ol className="space-y-3">
                      {aiAnalysis.action_items.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 shadow-lg">
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-300 mt-0.5">{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </motion.div>
            )}

            {/* Skills Section */}
            {analysisResults.extractedData?.skills?.length > 0 && (
              <motion.div variants={itemFadeIn} className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Extracted Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResults.extractedData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Experience Section */}
            {analysisResults.extractedData?.experience && (
              <motion.div variants={itemFadeIn} className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Work Experience</h3>
                <div className="space-y-2">
                  {analysisResults.extractedData.experience.map((exp, index) => (
                    <div key={index} className="flex items-start bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                      <FileText className="h-4 w-4 text-indigo-400 mt-1 mr-3 flex-shrink-0" />
                      <p className="text-sm text-gray-300 break-words whitespace-normal flex-1">{exp}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Projects Section */}
            {analysisResults.extractedData?.projects && (
              <motion.div variants={itemFadeIn} className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Projects</h3>
                <div className="space-y-2">
                  {analysisResults.extractedData.projects.map((project, index) => (
                    <div key={index} className="flex items-start bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                      <Zap className="h-4 w-4 text-amber-400 mt-1 mr-3 flex-shrink-0" />
                      <p className="text-sm text-gray-300 break-words whitespace-normal flex-1">{project}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Education Section */}
            {analysisResults.extractedData?.education && (
              <motion.div variants={itemFadeIn} className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Education</h3>
                <div className="space-y-2">
                  {analysisResults.extractedData.education.map((edu, index) => (
                    <div key={index} className="flex items-start bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                      <BarChart className="h-4 w-4 text-purple-400 mt-1 mr-3 flex-shrink-0" />
                      <p className="text-sm text-gray-300 break-words whitespace-normal flex-1">{edu}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Contact Information */}
            {analysisResults.extractedData?.contact && (
              <motion.div variants={itemFadeIn} className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                <div className="space-y-2">
                  {analysisResults.extractedData.contact.emails?.map((email, index) => (
                    <div key={`email-${index}`} className="flex items-start text-sm bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                      <span className="font-semibold text-indigo-400 mr-2 flex-shrink-0">Email:</span>
                      <span className="text-gray-300 break-all flex-1">{email}</span>
                    </div>
                  ))}
                  {analysisResults.extractedData.contact.phones?.map((phone, index) => (
                    <div key={`phone-${index}`} className="flex items-start text-sm bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                      <span className="font-semibold text-indigo-400 mr-2 flex-shrink-0">Phone:</span>
                      <span className="text-gray-300 break-all flex-1">{phone}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
      <div className="text-center mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mb-4"
        >
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-medium text-indigo-300">AI-Powered Analysis</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-extrabold text-white sm:text-5xl bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent"
        >
          Resume Analysis
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 max-w-2xl mx-auto text-lg text-gray-300 sm:mt-5"
        >
          Upload your resume and get instant feedback to improve your job prospects
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10"
        style={{
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 20px rgba(102, 126, 234, 0.15)'
        }}
      >
        <div className="px-6 py-8 sm:p-10">
          {!analysisComplete ? renderUploadArea() : renderAnalysisResults()}
        </div>
      </motion.div>

      {analysisComplete && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row justify-center gap-4"
        >
          <motion.button
            onClick={() => setShowParsedPreview(!showParsedPreview)}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Eye className="-ml-1 mr-2 h-5 w-5" />
            {showParsedPreview ? 'Hide' : 'View'} Parsed Resume
          </motion.button>
          <motion.button
            onClick={handleGetSuggestions}
            disabled={isGeneratingSuggestions}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!isGeneratingSuggestions ? { scale: 1.05 } : {}}
            whileTap={!isGeneratingSuggestions ? { scale: 0.98 } : {}}
          >
            {isGeneratingSuggestions ? (
              <>
                <Loader2 className="-ml-1 mr-2 h-5 w-5 animate-spin" />
                Generating AI Suggestions...
              </>
            ) : (
              <>
                <Lightbulb className="-ml-1 mr-2 h-5 w-5" />
                Get AI Suggestions
              </>
            )}
          </motion.button>
          <motion.button
            onClick={() => {
              setAnalysisComplete(false);
              setResumeScore(0);
              setAnalysisResults(null);
              setAiSuggestions(null);
              setShowSuggestions(false);
              setShowParsedPreview(false);
              setFileName('');
              setError(null);
            }}
            className="inline-flex items-center justify-center px-6 py-3 border border-indigo-500/30 text-base font-semibold rounded-xl text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 hover:scale-105"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload className="-ml-1 mr-2 h-5 w-5" />
            Analyze Another Resume
          </motion.button>
        </motion.div>
      )}

      {/* Original Resume Preview */}
      {analysisComplete && pdfUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-8"
        >
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 p-6"
            style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 20px rgba(129, 140, 248, 0.15)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Original Resume Preview</h3>
                  <p className="text-xs text-gray-400">Exact PDF rendering (layout preserved)</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden border border-white/10 bg-black/20">
              <embed src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`} type="application/pdf" width="100%" height="800px" />
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Suggestions Panel */}
      {showSuggestions && aiSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 p-6 sm:p-10"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 20px rgba(16, 185, 129, 0.15)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/30">
                  <Lightbulb className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">AI-Powered Suggestions</h2>
                  <p className="text-sm text-gray-400 mt-1">Personalized recommendations to boost your resume</p>
                </div>
              </div>
              {aiSuggestions.overall_score && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400">{aiSuggestions.overall_score}%</div>
                  <div className="text-xs text-gray-400 mt-1">Potential Score</div>
                </div>
              )}
            </div>

            {/* Critical Improvements */}
            {aiSuggestions.critical_improvements?.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-red-400" />
                  <h3 className="text-xl font-semibold text-white">Critical Improvements</h3>
                </div>
                <div className="space-y-4">
                  {aiSuggestions.critical_improvements.map((improvement, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-5 rounded-xl border backdrop-blur-sm ${
                        improvement.priority === 'high' 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : improvement.priority === 'medium'
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-blue-500/10 border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-semibold text-white">{improvement.title}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          improvement.priority === 'high' 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                            : improvement.priority === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {improvement.priority} priority
                        </span>
                      </div>
                      <p className="text-gray-300 mb-3">{improvement.description}</p>
                      <div className="flex items-center gap-2 text-sm text-emerald-400 mb-3">
                        <Zap className="h-4 w-4" />
                        <span>{improvement.impact}</span>
                      </div>
                      {improvement.examples?.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-white/20">
                          <p className="text-xs font-semibold text-gray-400 mb-2">Examples:</p>
                          <ul className="space-y-1">
                            {improvement.examples.map((example, i) => (
                              <li key={i} className="text-sm text-gray-300 flex items-start">
                                <span className="text-emerald-400 mr-2">•</span>
                                {example}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills Recommendations */}
            {aiSuggestions.skills_recommendations && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-xl font-semibold text-white">Skills Recommendations</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiSuggestions.skills_recommendations.trending_skills?.length > 0 && (
                    <div className="p-4 bg-indigo-500/10 backdrop-blur-sm rounded-xl border border-indigo-500/30">
                      <h4 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Trending Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestions.skills_recommendations.trending_skills.map((skill, i) => (
                          <span key={i} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-200 rounded-full text-sm border border-indigo-500/30">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiSuggestions.skills_recommendations.missing_keywords?.length > 0 && (
                    <div className="p-4 bg-purple-500/10 backdrop-blur-sm rounded-xl border border-purple-500/30">
                      <h4 className="text-sm font-semibold text-purple-300 mb-3">Missing Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestions.skills_recommendations.missing_keywords.map((keyword, i) => (
                          <span key={i} className="px-3 py-1.5 bg-purple-500/20 text-purple-200 rounded-full text-sm border border-purple-500/30">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ATS Optimization Tips */}
            {aiSuggestions.ats_optimization_tips?.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">ATS Optimization Tips</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiSuggestions.ats_optimization_tips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-green-500/10 backdrop-blur-sm rounded-lg border border-green-500/30">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {aiSuggestions.next_steps?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  <h3 className="text-xl font-semibold text-white">Next Steps</h3>
                </div>
                <div className="space-y-3">
                  {aiSuggestions.next_steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-yellow-500/10 backdrop-blur-sm rounded-lg border border-yellow-500/30">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-200 font-medium">{step.action}</p>
                        <p className="text-xs text-gray-400 mt-1">⏱️ {step.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Parsed Resume Preview */}
      {showParsedPreview && analysisComplete && renderParsedResumePreview()}
    </div>
  );
};

export default ResumeAnalysis;
