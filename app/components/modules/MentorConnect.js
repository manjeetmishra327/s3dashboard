'use client';

import { useEffect, useMemo, useState } from 'react';

export default function MentorConnect() {
  const [mentors, setMentors] = useState([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [mentorsError, setMentorsError] = useState('');

  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');

  const [connectStateByMentorId, setConnectStateByMentorId] = useState({});
  const [connectFormByMentorId, setConnectFormByMentorId] = useState({});

  const authHeaders = () => {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const mentorIdOf = (m) => m?._id || m?.id;

  const normalizeExpertise = (m) => {
    const list = m?.expertise || m?.expertiseTags || m?.tags || m?.skills || [];
    if (!Array.isArray(list)) return [];
    return list.filter(Boolean).map(String);
  };

  const normalizeCompany = (m) => m?.company || m?.profile?.company || m?.work?.company || '—';

  useEffect(() => {
    let isMounted = true;

    const loadMentors = async () => {
      setMentorsLoading(true);
      setMentorsError('');
      try {
        const res = await fetch('/api/users?role=mentor', { headers: authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Failed to fetch mentors');
        const list = Array.isArray(data) ? data : data?.users || data?.data || [];
        if (isMounted) setMentors(Array.isArray(list) ? list : []);
      } catch (e) {
        if (isMounted) {
          setMentors([]);
          setMentorsError(e?.message || 'Failed to fetch mentors');
        }
      } finally {
        if (isMounted) setMentorsLoading(false);
      }
    };

    const loadMyRequests = async () => {
      setRequestsLoading(true);
      setRequestsError('');
      try {
        const res = await fetch('/api/mentor-requests/student', { headers: authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Failed to fetch mentor requests');
        const list = Array.isArray(data) ? data : data?.requests || data?.data || [];
        if (isMounted) setMyRequests(Array.isArray(list) ? list : []);
      } catch (e) {
        if (isMounted) {
          setMyRequests([]);
          setRequestsError(e?.message || 'Failed to fetch mentor requests');
        }
      } finally {
        if (isMounted) setRequestsLoading(false);
      }
    };

    loadMentors();
    loadMyRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedMentors = useMemo(() => {
    return [...(Array.isArray(mentors) ? mentors : [])].sort(
      (a, b) => (b?.match ?? b?.rating ?? 0) - (a?.match ?? a?.rating ?? 0)
    );
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
                <div className="mt-0.5 text-sm font-semibold text-white/85">{mentorsLoading ? '—' : sortedMentors.length}</div>
              </div>
            </div>
          </div>
        </header>

        <main>
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-subtle)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base md:text-lg font-semibold text-white/90">My Mentor Requests</h2>
                  <p className="mt-1 text-sm text-white/55">Track the status of requests you’ve sent</p>
                </div>
              </div>

              {requestsLoading ? (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-[72px] rounded-[var(--radius-lg)] border border-white/10 bg-white/5"></div>
                  ))}
                </div>
              ) : requestsError ? (
                <div className="mt-4 text-sm text-red-300">{requestsError}</div>
              ) : myRequests.length === 0 ? (
                <div className="mt-4 text-sm text-white/60">You haven't connected with any mentors yet.</div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {myRequests.map((r) => {
                    const mentorName = r?.mentor?.name || r?.mentorName || r?.mentor?.fullName || 'Mentor';
                    const topic = r?.topic || '—';
                    const status = (r?.status || 'pending').toString().toLowerCase();
                    const createdAt = r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—';
                    const statusStyles =
                      status === 'accepted'
                        ? 'border-green-400/20 bg-green-400/10 text-green-200'
                        : status === 'declined'
                          ? 'border-red-400/20 bg-red-400/10 text-red-200'
                          : 'border-white/15 bg-white/5 text-white/75';

                    return (
                      <div
                        key={r?._id || `${mentorName}-${topic}-${createdAt}`}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white/90 truncate">{mentorName}</div>
                          <div className="mt-0.5 text-sm text-white/60">{topic}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-[var(--radius-sm)] border text-xs font-semibold ${statusStyles}`}>
                            {status}
                          </span>
                          <span className="text-xs text-white/45">{createdAt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {mentorsLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[118px] rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)]"></div>
              ))}
            </div>
          ) : mentorsError ? (
            <div className="py-10 text-center bg-[var(--card-bg)] border border-dashed border-[var(--card-border)] rounded-[var(--radius-lg)]">
              <h3 className="text-xl font-semibold text-white/90">Unable to load mentors</h3>
              <p className="mt-2 text-white/55">{mentorsError}</p>
            </div>
          ) : sortedMentors.length === 0 ? (
            <div className="py-16 text-center bg-[var(--card-bg)] border border-dashed border-[var(--card-border)] rounded-[var(--radius-lg)]">
              <h3 className="text-xl font-semibold text-white/90">No mentors available right now</h3>
              <p className="mt-2 text-white/55">Try again later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sortedMentors.map((mentor, idx) => {
                const mentorId = mentorIdOf(mentor);
                const connectState = connectStateByMentorId?.[mentorId] || { status: 'idle', error: '' };
                const form = connectFormByMentorId?.[mentorId] || { topic: '', message: '' };
                const expertise = normalizeExpertise(mentor);
                const company = normalizeCompany(mentor);
                const role = (mentor?.role || 'mentor').toString();
                const isSending = connectState.status === 'loading';
                const isSent = connectState.status === 'sent' || connectState.status === 'duplicate';

                const onUpdateForm = (patch) => {
                  setConnectFormByMentorId((prev) => ({
                    ...(prev || {}),
                    [mentorId]: { ...(prev?.[mentorId] || { topic: '', message: '' }), ...patch },
                  }));
                };

                const sendRequest = async () => {
                  if (!mentorId) return;
                  setConnectStateByMentorId((prev) => ({
                    ...(prev || {}),
                    [mentorId]: { status: 'loading', error: '' },
                  }));
                  try {
                    const res = await fetch('/api/mentor-requests', {
                      method: 'POST',
                      headers: authHeaders(),
                      body: JSON.stringify({
                        mentorId,
                        topic: form.topic,
                        message: form.message,
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      const msg = data?.message || 'Failed to send request';
                      if (msg.toLowerCase().includes('already')) {
                        setConnectStateByMentorId((prev) => ({
                          ...(prev || {}),
                          [mentorId]: { status: 'duplicate', error: msg },
                        }));
                        return;
                      }
                      throw new Error(msg);
                    }

                    setConnectStateByMentorId((prev) => ({
                      ...(prev || {}),
                      [mentorId]: { status: 'sent', error: '' },
                    }));

                    try {
                      setRequestsLoading(true);
                      setRequestsError('');
                      const rr = await fetch('/api/mentor-requests/student', { headers: authHeaders() });
                      const rd = await rr.json().catch(() => ({}));
                      if (rr.ok) {
                        const list = Array.isArray(rd) ? rd : rd?.requests || rd?.data || [];
                        setMyRequests(Array.isArray(list) ? list : []);
                      }
                    } catch {}
                    finally {
                      setRequestsLoading(false);
                    }
                  } catch (e) {
                    setConnectStateByMentorId((prev) => ({
                      ...(prev || {}),
                      [mentorId]: { status: 'error', error: e?.message || 'Failed to send request' },
                    }));
                  }
                };

                return (
                  <div
                    key={mentorId}
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
                              <h3 className="text-base md:text-lg font-semibold text-white/90 truncate">{mentor?.name || mentor?.fullName || 'Mentor'}</h3>
                              <span className="inline-flex items-center px-2 py-1 rounded-[var(--radius-sm)] border border-white/10 bg-white/5 text-white/70 text-xs font-semibold">
                                {role}
                              </span>
                            </div>
                            <div className="mt-0.5 text-sm text-white/70">{mentor?.title || mentor?.headline || 'Mentor'}</div>
                            <div className="mt-0.5 text-sm text-white/55">{company}</div>
                          </div>
                        </div>
                      </div>

                      <div className="md:flex-[1.1] flex flex-col gap-2 md:items-center md:justify-center">
                        <div className="flex flex-wrap gap-2">
                          {expertise.slice(0, 4).map((skill, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-1 rounded-[var(--radius-sm)] border border-white/10 bg-white/5 text-white/70 text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="md:flex-[0.65] flex items-center justify-between md:justify-end gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-primary"
                            style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}
                            disabled={isSending || isSent}
                            onClick={sendRequest}
                          >
                            {connectState.status === 'loading'
                              ? 'Sending...'
                              : connectState.status === 'duplicate'
                                ? 'Request Sent'
                                : connectState.status === 'sent'
                                  ? 'Request Sent'
                                  : 'Connect'}
                          </button>
                          <button className="btn-secondary" style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}>
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-white/50 mb-1">Topic</div>
                          <input
                            value={form.topic}
                            onChange={(e) => onUpdateForm({ topic: e.target.value })}
                            className="w-full rounded-[var(--radius-md)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 outline-none"
                            placeholder="e.g., Interview prep"
                            disabled={isSending || isSent}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-white/50 mb-1">Message</div>
                          <input
                            value={form.message}
                            onChange={(e) => onUpdateForm({ message: e.target.value })}
                            className="w-full rounded-[var(--radius-md)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 outline-none"
                            placeholder="Short note to the mentor"
                            disabled={isSending || isSent}
                          />
                        </div>
                      </div>
                      {connectState.status === 'error' ? (
                        <div className="text-sm text-red-300">{connectState.error}</div>
                      ) : connectState.status === 'duplicate' && connectState.error ? (
                        <div className="text-sm text-white/60">{connectState.error}</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}