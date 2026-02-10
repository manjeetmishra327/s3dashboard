'use client';

import { useState } from 'react';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. I can help you with resume tips, interview preparation, career advice, and more. What would you like to know?',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage = {
        id: messages.length + 1,
        type: 'user',
        content: inputMessage,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages([...messages, newMessage]);
      setInputMessage('');

      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          id: messages.length + 2,
          type: 'ai',
          content: 'I understand your question. Let me provide you with some helpful insights and recommendations based on your query.',
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const quickQuestions = [
    'How can I improve my resume?',
    'What are common interview questions?',
    'How to prepare for technical interviews?',
    'Career advice for software engineers'
  ];

  return (
    <div className="ai-assistant">
      <div className="page-header">
        <h1>AI Assistant</h1>
        <p className="text-gray-600">Get instant help with your career questions and job search</p>
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <div className="ai-avatar">
            <i className="fas fa-robot"></i>
          </div>
          <div className="ai-info">
            <h3>AI Career Assistant</h3>
            <span className="status">Online</span>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                <p>{message.content}</p>
                <span className="message-time">{message.timestamp}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="quick-questions">
          <h4>Quick Questions</h4>
          <div className="question-chips">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="question-chip"
                onClick={() => setInputMessage(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-input">
          <input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="message-input"
          />
          <button onClick={handleSendMessage} className="send-btn">
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>

      <div className="ai-features">
        <h2>What I can help you with</h2>
        <div className="features-grid">
          <div className="feature-card">
            <i className="fas fa-file-alt"></i>
            <h3>Resume Review</h3>
            <p>Get feedback on your resume structure, content, and ATS optimization</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-comments"></i>
            <h3>Interview Prep</h3>
            <p>Practice common interview questions and get personalized tips</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-code"></i>
            <h3>Technical Help</h3>
            <p>Get help with coding problems, system design, and technical concepts</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-chart-line"></i>
            <h3>Career Guidance</h3>
            <p>Receive advice on career paths, skill development, and job search strategies</p>
          </div>
        </div>
      </div>
    </div>
  );
} 