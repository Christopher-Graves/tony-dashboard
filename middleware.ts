import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect ALL API routes with Bearer token authentication
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const validToken = process.env.DASHBOARD_API_KEY;
    
    if (!validToken) {
      console.error('[SECURITY] DASHBOARD_API_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    if (token !== validToken) {
      console.warn('[SECURITY] Unauthorized API access attempt:', {
        path: pathname,
        ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
