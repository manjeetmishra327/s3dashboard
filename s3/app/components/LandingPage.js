'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Rocket, 
  FileText, 
  Briefcase, 
  TrendingUp, 
  Users, 
  CheckCircle,
  ArrowRight,
  Star,
  Lock,
  Sparkles,
  Zap,
  Target,
  Award,
  Github,
  Twitter,
  Linkedin,
  Mail
} from 'lucide-react';
import AuthModal from './AuthModal';

export default function LandingPage({ onLogin }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Resume Analysis",
      description: "AI-based resume feedback and optimization",
      emoji: "📄"
    },
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: "Job Recommendations",
      description: "Personalized job listings based on your profile",
      emoji: "💼"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Progress Tracking",
      description: "Track your learning journey with detailed insights",
      emoji: "📊"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Mentor Connect",
      description: "Find experienced mentors and senior students",
      emoji: "🤝"
    }
  ];

  const benefits = [
    "Save time in job preparation with AI-powered tools",
    "Get personalized guidance from experienced mentors",
    "Track your growth with detailed analytics and insights",
    "Be placement-ready with comprehensive skill development"
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Computer Science Student",
      content: "S3 Dashboard helped me improve my resume and land interviews at top tech companies!",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Engineering Graduate",
      content: "The mentor connect feature was game-changing. I found my dream job within 3 months!",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Business Student",
      content: "The progress tracking helped me stay motivated and focused on my career goals.",
      rating: 5
    }
  ];

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="landing-page-modern">
      {/* Animated Background */}
      <div className="landing-bg-modern">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Navigation */}
      <nav className="landing-nav-modern">
        <div className="nav-content-modern">
          <div className="nav-logo-modern">
            <Rocket className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold text-white">S3 Dashboard</span>
          </div>
          <div className="nav-buttons-modern">
            <button
              onClick={() => handleAuthClick('login')}
              className="btn-nav-login"
            >
              Login
            </button>
            <button
              onClick={() => handleAuthClick('signup')}
              className="btn-nav-signup"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section-landing">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="hero-content-landing"
        >
          <motion.div 
            className="hero-badge-landing"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Career Platform</span>
          </motion.div>
          
          <h1 className="hero-title-landing">
            Your Smart Path to
            <span className="hero-gradient-text"> Career Success</span>
            <span className="hero-emoji">🚀</span>
          </h1>
          
          <p className="hero-subtitle-landing">
            Transform your career journey with AI-powered resume analysis, personalized job recommendations, 
            and expert mentorship guidance - all in one intelligent platform.
          </p>
          
          <div className="hero-buttons-landing">
            <motion.button
              onClick={() => handleAuthClick('signup')}
              className="btn-hero-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Start Your Journey</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={() => handleAuthClick('login')}
              className="btn-hero-secondary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Login to Dashboard</span>
            </motion.button>
          </div>
          
          <motion.div 
            className="hero-stats-landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="stat-item-landing">
              <Zap className="w-5 h-5" />
              <span>AI-Powered</span>
            </div>
            <div className="stat-item-landing">
              <Target className="w-5 h-5" />
              <span>Career Focused</span>
            </div>
            <div className="stat-item-landing">
              <Award className="w-5 h-5" />
              <span>Proven Results</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Preview */}
      <section className="features-section-landing">
        <div className="features-container-landing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="features-header-landing"
          >
            <h2 className="features-title-landing">
              Powerful Features to Accelerate Your Career
            </h2>
            <p className="features-subtitle-landing">
              Discover what makes S3 Dashboard the ultimate career development platform
            </p>
          </motion.div>

          <div className="features-grid-landing">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="feature-card-landing"
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <div className="feature-card-content">
                  <div className="feature-icon-container">
                    <div className="feature-icon-landing">
                      {feature.icon}
                    </div>
                    <span className="feature-emoji">{feature.emoji}</span>
                  </div>
                  <h3 className="feature-title-landing">
                    {feature.title}
                  </h3>
                  <p className="feature-description-landing">
                    {feature.description}
                  </p>
                  <div className="feature-lock-badge">
                    <Lock className="w-4 h-4" />
                    <span>Login to Access</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why S3 Dashboard */}
      <section className="why-section-landing">
        <div className="why-container-landing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="why-title-landing">
              Why Choose S3 Dashboard?
            </h2>
            <div className="benefits-grid-landing">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="benefit-item-landing"
                  whileHover={{ x: 4 }}
                >
                  <CheckCircle className="benefit-icon-landing" />
                  <p className="benefit-text-landing">{benefit}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section-landing">
        <div className="cta-container-landing">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="cta-content-landing"
          >
            <Sparkles className="cta-sparkle-icon" />
            <h2 className="cta-title-landing">
              Ready to Transform Your Career?
            </h2>
            <p className="cta-subtitle-landing">
              Join thousands of students who have already accelerated their career journey
            </p>
            <motion.button
              onClick={() => handleAuthClick('signup')}
              className="btn-cta-landing"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Start Your Journey</span>
              <ArrowRight className="w-6 h-6" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="footer-modern-landing">
        <div className="footer-container-landing">
          {/* Footer Top */}
          <div className="footer-top-landing">
            <div className="footer-brand-landing">
              <div className="footer-logo-landing">
                <Rocket className="w-10 h-10" />
                <span className="footer-brand-name">S3 Dashboard</span>
              </div>
              <p className="footer-tagline-landing">
                Your smart path to career success. Transform your future with AI-powered tools and expert guidance.
              </p>
              <div className="footer-social-landing">
                <motion.a href="#" className="social-link-landing" whileHover={{ scale: 1.1, y: -2 }}>
                  <Github className="w-5 h-5" />
                </motion.a>
                <motion.a href="#" className="social-link-landing" whileHover={{ scale: 1.1, y: -2 }}>
                  <Twitter className="w-5 h-5" />
                </motion.a>
                <motion.a href="#" className="social-link-landing" whileHover={{ scale: 1.1, y: -2 }}>
                  <Linkedin className="w-5 h-5" />
                </motion.a>
                <motion.a href="#" className="social-link-landing" whileHover={{ scale: 1.1, y: -2 }}>
                  <Mail className="w-5 h-5" />
                </motion.a>
              </div>
            </div>
            
            <div className="footer-links-landing">
              <div className="footer-column-landing">
                <h4 className="footer-heading-landing">Product</h4>
                <ul className="footer-list-landing">
                  <li><a href="#features">Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#security">Security</a></li>
                  <li><a href="#updates">Updates</a></li>
                </ul>
              </div>
              
              <div className="footer-column-landing">
                <h4 className="footer-heading-landing">Company</h4>
                <ul className="footer-list-landing">
                  <li><a href="#about">About Us</a></li>
                  <li><a href="#careers">Careers</a></li>
                  <li><a href="#blog">Blog</a></li>
                  <li><a href="#press">Press Kit</a></li>
                </ul>
              </div>
              
              <div className="footer-column-landing">
                <h4 className="footer-heading-landing">Resources</h4>
                <ul className="footer-list-landing">
                  <li><a href="#docs">Documentation</a></li>
                  <li><a href="#help">Help Center</a></li>
                  <li><a href="#api">API</a></li>
                  <li><a href="#status">Status</a></li>
                </ul>
              </div>
              
              <div className="footer-column-landing">
                <h4 className="footer-heading-landing">Legal</h4>
                <ul className="footer-list-landing">
                  <li><a href="#privacy">Privacy Policy</a></li>
                  <li><a href="#terms">Terms of Service</a></li>
                  <li><a href="#cookies">Cookie Policy</a></li>
                  <li><a href="#licenses">Licenses</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Footer Bottom */}
          <div className="footer-bottom-landing">
            <p className="footer-copyright-landing">
              © 2024 S3 Dashboard. All rights reserved. Made with ❤️ for students worldwide.
            </p>
            <div className="footer-badges-landing">
              <span className="footer-badge-landing">🔒 Secure</span>
              <span className="footer-badge-landing">⚡ Fast</span>
              <span className="footer-badge-landing">🚀 Reliable</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onLogin={onLogin}
          onModeChange={setAuthMode}
        />
      )}
    </div>
  );
}
