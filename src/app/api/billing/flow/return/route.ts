import { NextResponse } from 'next/server';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_TOKEN_LENGTH = 512;
const APP_URL = 'https://conversaai.store';

function getConfiguredAppUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.origin !== APP_URL) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function buildReturnUrl(token: string | null) {
  const appUrl = getConfiguredAppUrl();
  if (!appUrl) throw new Error('Invalid application URL configuration.');

  const url = new URL('/flow/return', appUrl);
  if (token && token.length <= MAX_TOKEN_LENGTH) {
    url.searchParams.set('token', token);
  }
  return url;
}

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const parsedLength = Number(contentLength);
      if (!Number.isFinite(parsedLength) || parsedLength > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
      }
    }

    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('application/x-www-form-urlencoded')) {
      return NextResponse.json({ error: 'Content-Type no soportado.' }, { status: 415 });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    }

    const formData = new URLSearchParams(rawBody);
    const tokenValue = formData.get('token');
    const token = typeof tokenValue === 'string' ? tokenValue : null;

    if (token && token.length > MAX_TOKEN_LENGTH) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    return NextResponse.redirect(buildReturnUrl(token), { status: 303 });
  } catch (error: unknown) {
    console.error('[Flow return] Error:', error instanceof Error ? error.message : 'Unknown error');
    const appUrl = getConfiguredAppUrl();
    if (!appUrl) {
      return NextResponse.json({ error: 'Configuración de URL de aplicación inválida.' }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/flow/return', appUrl), { status: 303 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (token && token.length > MAX_TOKEN_LENGTH) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    return NextResponse.redirect(buildReturnUrl(token), { status: 303 });
  } catch (error: unknown) {
    console.error('[Flow return] Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Configuración de URL de aplicación inválida.' }, { status: 500 });
  }
}
