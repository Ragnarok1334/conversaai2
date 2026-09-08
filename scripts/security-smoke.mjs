const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

const tests = []

async function check(name, request, validate) {
  try {
    const response = await fetch(`${baseUrl}${request.path}`, request.options)
    const body = await response.text()
    const ok = validate(response, body)
    tests.push({ name, ok, detail: `HTTP ${response.status}` })
  } catch (error) {
    tests.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) })
  }
}

await check('Cabeceras de seguridad', { path: '/', options: { redirect: 'manual' } }, (res) =>
  Boolean(res.headers.get('content-security-policy')) &&
  res.headers.get('x-content-type-options') === 'nosniff' &&
  Boolean(res.headers.get('strict-transport-security'))
)

await check('API privada rechaza anónimos', { path: '/api/assistants', options: { redirect: 'manual' } }, (res) =>
  res.status === 401 || res.status === 403
)

await check('JSON malformado rechazado', {
  path: '/api/widget/message',
  options: { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' },
}, (res) => res.status === 400)

await check('Cuerpo excesivo rechazado', {
  path: '/api/widget/message',
  options: {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ assistantId: '00000000-0000-4000-8000-000000000000', message: 'x'.repeat(10_000) }),
  },
}, (res) => res.status === 413)

await check('Tipo de contenido rechazado', {
  path: '/api/widget/message',
  options: { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hola' },
}, (res) => res.status === 415)

await check('UUID inválido rechazado', {
  path: '/api/widget/config?assistantId=../../etc/passwd',
  options: { headers: { origin: 'https://attacker.invalid' } },
}, (res) => res.status === 400 && !res.headers.get('access-control-allow-origin'))

await check('Setup Telegram no acepta GET', {
  path: '/api/telegram/set-webhook?secret=filtrado-en-url',
  options: { redirect: 'manual' },
}, (res) => res.status === 405)

await check('Setup Telegram rechaza secreto incorrecto', {
  path: '/api/telegram/set-webhook',
  options: { method: 'POST', headers: { 'x-setup-secret': 'incorrecto' } },
}, (res) => res.status === 401 || res.status === 403)

for (const test of tests) {
  console.log(`${test.ok ? 'PASS' : 'FAIL'}  ${test.name} (${test.detail})`)
}

const failed = tests.filter((test) => !test.ok)
console.log(`\n${tests.length - failed.length}/${tests.length} controles superados`)
if (failed.length) process.exitCode = 1
