'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <button 
        className="menu-toggle" 
        onClick={toggleMenu}
        aria-label="Toggle menu"
        aria-expanded={isMenuOpen}
      >
        {isMenuOpen ? '✕' : '☰'}
      </button>
      
      <nav className={`sidebar ${isMenuOpen ? 'active' : ''}`}>
        <div className="logo">
          <i className="fas fa-rocket text-indigo-600"></i>
          <span>Student Success</span>
        </div>
        <ul className="nav-links">
          <li>
            <Link href="#home" className="active">
              <i className="fas fa-home"></i> Home
            </Link>
          </li>
          <li>
            <Link href="#features">
              <i className="fas fa-star"></i> Features
            </Link>
          </li>
          <li>
            <Link href="#how-it-works">
              <i className="fas fa-cogs"></i> How It Works
            </Link>
          </li>
          <li>
            <Link href="#contact">
              <i className="fas fa-envelope"></i> Contact
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
