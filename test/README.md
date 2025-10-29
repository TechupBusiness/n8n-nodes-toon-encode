# Testing TOON Encoder

This project uses [Vitest](https://vitest.dev) to run comprehensive tests from the [official TOON repository](https://github.com/johannschopplich/toon) plus custom example tests.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build the node
npm run build

# 3. Run all tests
npm test

# Run specific test files
npm run test:official      # Official encode tests only
npm test examples          # Custom example tests only

# Watch mode (auto-rerun on changes)
npm run test:watch
```

---

## Test Files

- **`official-encode.test.ts`** - ~88 encode tests from official TOON repo (769 lines)
- **`official-decode.test.ts`** - ~70 decode tests from official TOON repo (687 lines)
- **`examples.test.ts`** - 24 curated examples from TOON documentation  
- **`setup.ts`** - Test adapter that loads our encode/decode functions from `dist/`

---

## Test Coverage

### Total: ~182 tests

#### Official Tests (~158 tests)

**Encode Tests (~88 tests)**
- ✅ **Primitives** - Strings, numbers, booleans, null
- ✅ **Objects** - Simple, nested, special keys
- ✅ **Arrays** - Primitives, objects, tabular, mixed
- ✅ **Delimiter options** - Comma, tab, pipe
- ✅ **Length markers** - Optional `#` prefix
- ✅ **Quoting rules** - Context-aware, delimiter-specific
- ✅ **Formatting invariants** - No trailing spaces/newlines
- ✅ **Edge cases** - Empty containers, Unicode, emoji

**Decode Tests (~70 tests)**
- ✅ Reverse of all encode operations
- ✅ Strict mode validation
- ✅ Error handling
- ✅ Malformed input detection

#### Example Tests (24 tests)

Key examples from TOON GitHub README, organized by category:
- ✅ Quick Reference (11 tests)
- ✅ Token Savings (1 test)
- ✅ Delimiter Options (2 tests)
- ✅ Length Markers (3 tests)
- ✅ LLM Prompts (1 test)
- ✅ Edge Cases (5 tests)
- ✅ Formatting Options (1 test)

---

## How It Works

1. **`setup.ts`** extracts the `encode` function from `dist/nodes/ToonEncode/ToonEncode.node.js`
2. **Test files** import from `setup.ts` to test our implementation
3. **Vitest** runs all tests and reports results
4. Ensures 100% spec compliance with official TOON

**Why this approach?**

✅ **Always up-to-date** - Official tests just need re-downloading when TOON updates  
✅ **Zero maintenance** - No manual test writing for official tests  
✅ **100% accurate** - Tests exactly what TOON tests  
✅ **Spec compliant** - Guarantees our implementation matches reference  
✅ **Unified tooling** - All tests use Vitest (watch mode, TypeScript, etc.)

---

## Examples

### Basic Usage Test

**Input:**
```json
{
  "users": [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 25}
  ]
}
```

**Expected Output:**
```
users[2]{name,age}:
  Alice,30
  Bob,25
```

### Tab Delimiter Test

**Input:** Same as above  
**Options:** `{ delimiter: '\t' }`

**Expected Output:**
```
users[2	]{name	age}:
  Alice	30
  Bob	25
```

### Length Markers Test

**Input:** `{ tags: ['reading', 'gaming', 'coding'] }`  
**Options:** `{ lengthMarker: '#' }`

**Expected Output:**
```
tags[#3]: reading,gaming,coding
```

---

## Updating Official Tests

To get the latest tests from TOON:

```bash
# Download latest encode tests
curl -sL "https://raw.githubusercontent.com/johannschopplich/toon/refs/heads/main/test/encode.test.ts" -o test/official-encode.test.ts

# Download latest decode tests  
curl -sL "https://raw.githubusercontent.com/johannschopplich/toon/refs/heads/main/test/decode.test.ts" -o test/official-decode.test.ts

# Update imports to use our setup
sed -i '' "s|from '../src/index'|from './setup'|g" test/official-encode.test.ts
sed -i '' "s|from '../src/index'|from './setup'|g" test/official-decode.test.ts

# Run tests
npm test
```

---

## Adding Custom Tests

### To Manual Tests (test-encoder.js)

Add to the `testCases` array:

```javascript
{
  name: 'Your test name',
  input: { /* your test data */ },
  options: { /* encoder options */ },
  expected: 'expected TOON output',
  source: 'Your Source',
}
```

Then run: `node run-tests.js`

### To Vitest Suite

Create a new file in `test/` directory:

```typescript
import { describe, expect, it } from 'vitest'
import { encode } from './setup'

describe('my custom tests', () => {
  it('does something', () => {
    expect(encode({ foo: 'bar' })).toBe('foo: bar')
  })
})
```

Then run: `npm test`

---

## Troubleshooting

### "Built JavaScript not found"

**Problem:** Tests can't find compiled code  
**Solution:** Run `npm run build` first

### "Cannot find module 'vitest'"

**Problem:** Vitest not installed  
**Solution:** Run `npm install`

### Tests fail after code changes

1. Rebuild: `npm run build`
2. Re-run tests: `npm test` or `node run-tests.js`

### Want to see expected outputs only

Run: `node test-encoder.js` (doesn't require build)

### Tests pass locally but fail in CI

Ensure CI runs:
```bash
npm install
npm run build
npm test
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build node
        run: npm run build
      
      - name: Run official tests
        run: npm test
      
      - name: Run manual tests (no deps)
        run: node run-tests.js
```

This ensures every commit is validated against the official TOON specification! ✨

---

## Resources

- [TOON Official Repository](https://github.com/johannschopplich/toon)
- [TOON Specification](https://github.com/johannschopplich/toon/blob/main/SPEC.md)
- [Vitest Documentation](https://vitest.dev)
- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)
