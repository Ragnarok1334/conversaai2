import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/assistant/behavior.ts', import.meta.url), 'utf8')
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
const behavior = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`)

const valid = behavior.validateBehavior({
  initialChannel: 'whatsapp',
  tone: 'cercano',
  goal: 'captar leads',
  salesLevel: 'Alto',
  responseStyle: 'Breves',
  rules: { askName: true, askContact: true },
})
assert.equal(valid.success, true)
assert.equal(valid.data.initialChannel, 'whatsapp')
assert.equal(valid.data.responseStyle, 'Breves')
assert.equal(valid.data.rules.doNotInvent, true)

assert.equal(behavior.validateBehavior({ tone: 'robotico' }).success, false)
assert.equal(behavior.validateBehavior({ rules: { askName: 'sí' } }).success, false)
assert.equal(behavior.validateBehavior({ unknownOption: true }).success, false)
assert.equal(behavior.validateBehavior('invalid').success, false)

const legacy = behavior.normalizeBehavior({ tone: 'cercano', rules: { askName: false } })
assert.equal(legacy.tone, 'cercano')
assert.equal(legacy.goal, 'dar soporte')
assert.equal(legacy.rules.askName, false)
assert.equal(legacy.rules.doNotInvent, true)

console.log('Assistant behavior smoke tests passed.')
