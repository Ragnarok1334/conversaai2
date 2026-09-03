import { NextResponse } from 'next/server';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_TOKEN_LENGTH = 512;

function buildReturnUrl(token: string | null) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store';
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

    const formData = await request.formData();
    const tokenValue = formData.get('token');
    const token = typeof tokenValue === 'string' ? tokenValue : null;

    if (token && token.length > MAX_TOKEN_LENGTH) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    return NextResponse.redirect(buildReturnUrl(token), { status: 303 });
  } catch (error: unknown) {
    console.error('[Flow return] Error:', error instanceof Error ? error.message : 'Unknown error');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store';
    return NextResponse.redirect(new URL('/flow/return', appUrl), { status: 303 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (token && token.length > MAX_TOKEN_LENGTH) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
  }

  return NextResponse.redirect(buildReturnUrl(token), { status: 303 });
}
