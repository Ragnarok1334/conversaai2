import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'El webhook de PayPal está en preparación. Próximamente disponible.',
      code: 'NOT_IMPLEMENTED',
    },
    { status: 501 }
  )
}
