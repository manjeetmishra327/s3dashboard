import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function normalizeRole(role) {
  const v = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (v === 'mentor') return 'mentor';
  return 'student';
}

export function requireAuth(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { user: null, response: NextResponse.json({ message: 'Authorization header required' }, { status: 401 }) };
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { user: null, response: NextResponse.json({ message: 'Token required' }, { status: 401 }) };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = {
      ...decoded,
      role: normalizeRole(decoded?.role),
    };
    return { user, response: null };
  } catch (error) {
    return { user: null, response: NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 }) };
  }
}

export function requireRole(role) {
  const required = normalizeRole(role);
  return (authUser) => {
    if (!authUser || normalizeRole(authUser.role) !== required) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }
    return null;
  };
}
