import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = formData.get("token");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store';
    const url = new URL("/flow/return", appUrl);

    if (token) {
      url.searchParams.set("token", String(token));
    }

    return NextResponse.redirect(url, { status: 303 });
  } catch (error) {
    console.error('Flow Return Route Error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store';
    return NextResponse.redirect(new URL("/flow/return", appUrl), { status: 303 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store';
  const url = new URL("/flow/return", appUrl);

  if (token) {
    url.searchParams.set("token", String(token));
  }

  return NextResponse.redirect(url, { status: 303 });
}
