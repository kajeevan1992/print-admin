import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/accept-invite/customer-account';
  return NextResponse.redirect(url);
}
