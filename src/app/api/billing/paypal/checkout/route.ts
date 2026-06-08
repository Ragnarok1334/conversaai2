import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'PayPal checkout está en preparación. Próximamente disponible para clientes internacionales.',
      code: 'NOT_IMPLEMENTED',
    },
    { status: 501 }
  )
}
