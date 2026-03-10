import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/settings?vercel_error=${error}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?vercel_error=missing_params', req.url));
  }
  return NextResponse.redirect(
    new URL(`/settings/connected-apps?vercel_code=${code}&vercel_state=${state}`, req.url)
  );
}
