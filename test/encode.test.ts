/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { describe, expect, it } from 'vitest'
import { encode } from './setup'

/**
 * Example tests from TOON GitHub README
 * These are the key examples users see in documentation
 */

describe('Quick Reference Examples', () => {
  it('encodes simple object with primitives', () => {
    const input = { id: 1, name: 'Ada' }
    expect(encode(input)).toBe('id: 1\nname: Ada')
  })

  it('encodes nested object', () => {
    const input = { user: { id: 1 } }
    expect(encode(input)).toBe('user:\n  id: 1')
  })

  it('encodes primitive array (inline)', () => {
    const input = { tags: ['foo', 'bar'] }
    expect(encode(input)).toBe('tags[2]: foo,bar')
  })

  it('encodes tabular array (uniform objects)', () => {
    const input = {
      items: [
        { id: 1, qty: 5 },
        { id: 2, qty: 3 },
      ],
    }
    expect(encode(input)).toBe('items[2]{id,qty}:\n  1,5\n  2,3')
  })

  it('encodes mixed/non-uniform array (list format)', () => {
    const input = { items: [1, { a: 1 }, 'x'] }
    expect(encode(input)).toBe('items[3]:\n  - 1\n  - a: 1\n  - x')
  })

  it('encodes array of arrays', () => {
    const input = { pairs: [[1, 2], [3, 4]] }
    expect(encode(input)).toBe('pairs[2]:\n  - [2]: 1,2\n  - [2]: 3,4')
  })

  it('encodes root array', () => {
    const input = ['x', 'y']
    expect(encode(input)).toBe('[2]: x,y')
  })

  it('encodes empty object', () => {
    expect(encode({})).toBe('')
  })

  it('encodes empty array in object', () => {
    const input = { items: [] }
    expect(encode(input)).toBe('items[0]:')
  })

  it('quotes strings with comma', () => {
    const input = { note: 'hello, world' }
    expect(encode(input)).toBe('note: "hello, world"')
  })

  it('distinguishes string "true" from boolean true', () => {
    const input = { items: ['true', true] }
    expect(encode(input)).toBe('items[2]: "true",true')
  })
})

describe('Token Savings Examples', () => {
  it('encodes invoice example efficiently', () => {
    const input = {
      items: [
        { sku: 'A1', qty: 2, price: 9.99 },
        { sku: 'B2', qty: 1, price: 14.5 },
      ],
    }
    expect(encode(input)).toBe('items[2]{sku,qty,price}:\n  A1,2,9.99\n  B2,1,14.5')
  })
})

describe('Delimiter Options', () => {
  it('encodes with tab delimiter', () => {
    const input = {
      items: [
        { sku: 'A1', name: 'Widget', qty: 2, price: 9.99 },
        { sku: 'B2', name: 'Gadget', qty: 1, price: 14.5 },
      ],
    }
    expect(encode(input, { delimiter: '\t' }))
      .toBe('items[2\t]{sku\tname\tqty\tprice}:\n  A1\tWidget\t2\t9.99\n  B2\tGadget\t1\t14.5')
  })

  it('encodes with pipe delimiter', () => {
    const input = {
      items: [
        { sku: 'A1', name: 'Widget', qty: 2, price: 9.99 },
        { sku: 'B2', name: 'Gadget', qty: 1, price: 14.5 },
      ],
    }
    expect(encode(input, { delimiter: '|' }))
      .toBe('items[2|]{sku|name|qty|price}:\n  A1|Widget|2|9.99\n  B2|Gadget|1|14.5')
  })
})

describe('Length Marker Options', () => {
  it('adds length marker to primitive array', () => {
    const input = { tags: ['reading', 'gaming', 'coding'] }
    expect(encode(input, { lengthMarker: '#' }))
      .toBe('tags[#3]: reading,gaming,coding')
  })

  it('adds length marker to tabular array', () => {
    const input = {
      items: [
        { sku: 'A1', qty: 2, price: 9.99 },
        { sku: 'B2', qty: 1, price: 14.5 },
      ],
    }
    expect(encode(input, { lengthMarker: '#' }))
      .toBe('items[#2]{sku,qty,price}:\n  A1,2,9.99\n  B2,1,14.5')
  })

  it('combines length marker with pipe delimiter', () => {
    const input = {
      tags: ['reading', 'gaming', 'coding'],
      items: [
        { sku: 'A1', qty: 2, price: 9.99 },
        { sku: 'B2', qty: 1, price: 14.5 },
      ],
    }
    expect(encode(input, { lengthMarker: '#', delimiter: '|' }))
      .toBe('tags[#3|]: reading|gaming|coding\nitems[#2|]{sku|qty|price}:\n  A1|2|9.99\n  B2|1|14.5')
  })
})

describe('LLM Prompt Examples', () => {
  it('encodes user data with ISO timestamps', () => {
    const input = {
      users: [
        { id: 1, name: 'Alice', role: 'admin', lastLogin: '2025-01-15T10:30:00Z' },
        { id: 2, name: 'Bob', role: 'user', lastLogin: '2025-01-14T15:22:00Z' },
        { id: 3, name: 'Charlie', role: 'user', lastLogin: '2025-01-13T09:45:00Z' },
      ],
    }
    expect(encode(input))
      .toBe('users[3]{id,name,role,lastLogin}:\n  1,Alice,admin,2025-01-15T10:30:00Z\n  2,Bob,user,2025-01-14T15:22:00Z\n  3,Charlie,user,2025-01-13T09:45:00Z')
  })
})

describe('Edge Cases', () => {
  it('encodes null values', () => {
    const input = { name: 'Alice', middleName: null, age: 30 }
    expect(encode(input)).toBe('name: Alice\nmiddleName: null\nage: 30')
  })

  it('encodes boolean values', () => {
    const input = { active: true, deleted: false }
    expect(encode(input)).toBe('active: true\ndeleted: false')
  })

  it('encodes deeply nested objects', () => {
    const input = {
      user: {
        profile: {
          name: 'Alice',
          email: 'alice@example.com',
        },
        settings: {
          theme: 'dark',
        },
      },
    }
    expect(encode(input))
      .toBe('user:\n  profile:\n    name: Alice\n    email: alice@example.com\n  settings:\n    theme: dark')
  })

  it('quotes strings with colon-space separator', () => {
    const input = { message: 'Hello: World' }
    expect(encode(input)).toBe('message: "Hello: World"')
  })

  it('encodes various number formats', () => {
    const input = { count: 42, price: 9.99, balance: -5.5 }
    expect(encode(input)).toBe('count: 42\nprice: 9.99\nbalance: -5.5')
  })
})

describe('Formatting Options', () => {
  it('encodes with compact mode (indent 0)', () => {
    const input = {
      user: {
        name: 'Alice',
        age: 30,
      },
    }
    expect(encode(input, { indent: 0 }))
      .toBe('user:\nname: Alice\nage: 30')
  })
})

