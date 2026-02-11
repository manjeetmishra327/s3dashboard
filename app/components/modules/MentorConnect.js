'use client';

import { useMemo } from 'react';

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

  const sortedMentors = useMemo(() => {
    return [...mentors].sort((a, b) => (b?.match ?? b?.rating ?? 0) - (a?.match ?? a?.rating ?? 0));
  }, [mentors]);

  const bestMatch = sortedMentors?.[0];
  const bestMatchLabel = useMemo(() => {
    const score = Number.isFinite(bestMatch?.match) ? bestMatch.match : null;
    if (score == null) {
      const r = Number.isFinite(bestMatch?.rating) ? bestMatch.rating : 0;
      if (r >= 4.85) return 'Best Match';
      return null;
    }
    if (score >= 85) return 'Best Match';
    return null;
  }, [bestMatch]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-[linear-gradient(180deg,var(--bg-primary)_0%,var(--bg-secondary)_100%)]">
      <div className="max-w-screen-xl mx-auto">
        <header className="p-6 mb-8 bg-[var(--elevated-bg)] border border-[var(--elevated-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-soft)] ring-1 ring-white/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold text-white/95">Mentor Connect</h1>
              <p className="mt-1 text-sm md:text-base text-white/60">AI-guided mentor recommendations based on your profile and career goals</p>
            </div>
            <div className="flex items-center gap-3 sm:justify-end">
              {bestMatchLabel ? (
                <div className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--accent-primary)]/25 bg-[var(--accent-primary-light)]">
                  <div className="text-[11px] uppercase tracking-wide text-white/55">{bestMatchLabel}</div>
                  <div className="mt-0.5 text-sm font-semibold text-[var(--accent-primary)]">{bestMatch?.name}</div>
                </div>
              ) : null}
              <div className="px-3 py-2 rounded-[var(--radius-md)] border border-white/12 bg-white/8">
                <div className="text-[11px] uppercase tracking-wide text-white/45">Mentors</div>
                <div className="mt-0.5 text-sm font-semibold text-white/85">{sortedMentors.length}</div>
              </div>
            </div>
          </div>
        </header>

        <main>
          {sortedMentors.length === 0 ? (
            <div className="py-16 text-center bg-[var(--card-bg)] border border-dashed border-[var(--card-border)] rounded-[var(--radius-lg)]">
              <h3 className="text-xl font-semibold text-white/90">No mentors match your current profile</h3>
              <p className="mt-2 text-white/55">Try updating your resume to improve matching accuracy.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sortedMentors.map((mentor, idx) => (
                <div
                  key={mentor.id}
                  className={`group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-subtle)] transition-all duration-200 ease-out hover:bg-[var(--elevated-bg)] hover:border-[var(--elevated-border)] hover:shadow-[var(--shadow-soft)] hover:-translate-y-0.5 ${idx === 0 ? 'ring-1 ring-[var(--accent-primary)]/15' : ''}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 md:flex-[1.2]">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-white/5 border border-white/10 text-white/70">
                          <i className="fas fa-user"></i>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base md:text-lg font-semibold text-white/90 truncate">{mentor.name}</h3>
                            {Number.isFinite(mentor.match) ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--accent-primary)]/25 bg-[var(--accent-primary-light)] text-[var(--accent-primary)] text-xs font-semibold">
                                {mentor.match}%
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-sm text-white/70">{mentor.title}</div>
                          <div className="mt-0.5 text-sm text-white/55">{mentor.company}</div>
                        </div>
                      </div>
                    </div>

                    <div className="md:flex-[1.1] flex flex-col gap-2 md:items-center md:justify-center">
                      <div className="flex flex-wrap gap-2">
                        {mentor.expertise?.slice(0, 4)?.map((skill, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-1 rounded-[var(--radius-sm)] border border-white/10 bg-white/5 text-white/70 text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span><span className="text-white/85 font-semibold">{mentor.sessions}</span> sessions</span>
                        <span><span className="text-white/85 font-semibold">${mentor.hourlyRate}</span>/hr</span>
                        <span className="hidden sm:inline">{mentor.availability}</span>
                      </div>
                    </div>

                    <div className="md:flex-[0.65] flex items-center justify-between md:justify-end gap-3">
                      <div className="flex items-center gap-2">
                        <button className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}>
                          Connect
                        </button>
                        <button className="btn-secondary" style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}>
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}