/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { describe, expect, it } from 'vitest';
import { decode, encode } from './setup';

/**
 * TOON Decode Tests
 * These tests verify that TOON can be correctly decoded back to JSON
 */

describe('Basic Decoding', () => {
	it('decodes simple object with primitives', () => {
		const toon = 'id: 1\nname: Ada';
		const expected = { id: 1, name: 'Ada' };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes nested object', () => {
		const toon = 'user:\n  id: 1';
		const expected = { user: { id: 1 } };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes primitive array (inline)', () => {
		const toon = 'tags[2]: foo,bar';
		const expected = { tags: ['foo', 'bar'] };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes tabular array (uniform objects)', () => {
		const toon = 'items[2]{id,qty}:\n  1,5\n  2,3';
		const expected = {
			items: [
				{ id: 1, qty: 5 },
				{ id: 2, qty: 3 },
			],
		};
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes mixed/non-uniform array (list format)', () => {
		const toon = 'items[3]:\n  - 1\n  - a: 1\n  - x';
		const expected = { items: [1, { a: 1 }, 'x'] };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes array of arrays', () => {
		const toon = 'pairs[2]:\n  - [2]: 1,2\n  - [2]: 3,4';
		const expected = { pairs: [[1, 2], [3, 4]] };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes root array', () => {
		const toon = '[2]: x,y';
		const expected = ['x', 'y'];
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes empty object', () => {
		const toon = '';
		expect(decode(toon)).toBeNull();
	});

	it('decodes empty array in object', () => {
		const toon = 'items[0]:';
		const expected = { items: [] };
		expect(decode(toon)).toEqual(expected);
	});
});

describe('String Handling', () => {
	it('decodes quoted strings with comma', () => {
		const toon = 'note: "hello, world"';
		const expected = { note: 'hello, world' };
		expect(decode(toon)).toEqual(expected);
	});

	it('distinguishes string "true" from boolean true', () => {
		const toon = 'items[2]: "true",true';
		const expected = { items: ['true', true] };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes strings with colon', () => {
		const toon = 'message: "Hello: World"';
		const expected = { message: 'Hello: World' };
		expect(decode(toon)).toEqual(expected);
	});

	it('handles escape sequences', () => {
		const toon = 'text: "Line 1\\nLine 2"';
		const expected = { text: 'Line 1\nLine 2' };
		expect(decode(toon)).toEqual(expected);
	});
});

describe('Primitive Types', () => {
	it('decodes null values', () => {
		const toon = 'name: Alice\nmiddleName: null\nage: 30';
		const expected = { name: 'Alice', middleName: null, age: 30 };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes boolean values', () => {
		const toon = 'active: true\ndeleted: false';
		const expected = { active: true, deleted: false };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes various number formats', () => {
		const toon = 'count: 42\nprice: 9.99\nbalance: -5.5';
		const expected = { count: 42, price: 9.99, balance: -5.5 };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes scientific notation', () => {
		const toon = 'big: 1.23e10\nsmall: 1.5e-3';
		const expected = { big: 1.23e10, small: 1.5e-3 };
		expect(decode(toon)).toEqual(expected);
	});
});

describe('Delimiter Support', () => {
	it('decodes with tab delimiter', () => {
		const toon = 'items[2\t]{sku\tname\tqty\tprice}:\n  A1\tWidget\t2\t9.99\n  B2\tGadget\t1\t14.5';
		const expected = {
			items: [
				{ sku: 'A1', name: 'Widget', qty: 2, price: 9.99 },
				{ sku: 'B2', name: 'Gadget', qty: 1, price: 14.5 },
			],
		};
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes with pipe delimiter', () => {
		const toon = 'items[2|]{sku|name|qty|price}:\n  A1|Widget|2|9.99\n  B2|Gadget|1|14.5';
		const expected = {
			items: [
				{ sku: 'A1', name: 'Widget', qty: 2, price: 9.99 },
				{ sku: 'B2', name: 'Gadget', qty: 1, price: 14.5 },
			],
		};
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes primitive arrays with different delimiters', () => {
		const toonPipe = 'tags[3|]: reading|gaming|coding';
		const expectedPipe = { tags: ['reading', 'gaming', 'coding'] };
		expect(decode(toonPipe)).toEqual(expectedPipe);

		const toonTab = 'tags[3\t]: reading\tgaming\tcoding';
		const expectedTab = { tags: ['reading', 'gaming', 'coding'] };
		expect(decode(toonTab)).toEqual(expectedTab);
	});
});

describe('Length Markers', () => {
	it('decodes with length marker on primitive array', () => {
		const toon = 'tags[#3]: reading,gaming,coding';
		const expected = { tags: ['reading', 'gaming', 'coding'] };
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes with length marker on tabular array', () => {
		const toon = 'items[#2]{sku,qty,price}:\n  A1,2,9.99\n  B2,1,14.5';
		const expected = {
			items: [
				{ sku: 'A1', qty: 2, price: 9.99 },
				{ sku: 'B2', qty: 1, price: 14.5 },
			],
		};
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes with length marker and pipe delimiter', () => {
		const toon = 'tags[#3|]: reading|gaming|coding\nitems[#2|]{sku|qty|price}:\n  A1|2|9.99\n  B2|1|14.5';
		const expected = {
			tags: ['reading', 'gaming', 'coding'],
			items: [
				{ sku: 'A1', qty: 2, price: 9.99 },
				{ sku: 'B2', qty: 1, price: 14.5 },
			],
		};
		expect(decode(toon)).toEqual(expected);
	});
});

describe('Complex Structures', () => {
	it('decodes deeply nested objects', () => {
		const toon = 'user:\n  profile:\n    name: Alice\n    email: alice@example.com\n  settings:\n    theme: dark';
		const expected = {
			user: {
				profile: {
					name: 'Alice',
					email: 'alice@example.com',
				},
				settings: {
					theme: 'dark',
				},
			},
		};
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes invoice example', () => {
		const toon = 'items[2]{sku,qty,price}:\n  A1,2,9.99\n  B2,1,14.5';
		const expected = {
			items: [
				{ sku: 'A1', qty: 2, price: 9.99 },
				{ sku: 'B2', qty: 1, price: 14.5 },
			],
		};
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes user data with ISO timestamps', () => {
		const toon = 'users[3]{id,name,role,lastLogin}:\n  1,Alice,admin,2025-01-15T10:30:00Z\n  2,Bob,user,2025-01-14T15:22:00Z\n  3,Charlie,user,2025-01-13T09:45:00Z';
		const expected = {
			users: [
				{ id: 1, name: 'Alice', role: 'admin', lastLogin: '2025-01-15T10:30:00Z' },
				{ id: 2, name: 'Bob', role: 'user', lastLogin: '2025-01-14T15:22:00Z' },
				{ id: 3, name: 'Charlie', role: 'user', lastLogin: '2025-01-13T09:45:00Z' },
			],
		};
		expect(decode(toon)).toEqual(expected);
	});
});

describe('Round-trip Encoding/Decoding', () => {
	it('round-trips simple objects', () => {
		const input = { id: 1, name: 'Ada' };
		const toon = encode(input);
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});

	it('round-trips nested objects', () => {
		const input = { user: { id: 1, name: 'Alice' } };
		const toon = encode(input);
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});

	it('round-trips arrays', () => {
		const input = { tags: ['foo', 'bar', 'baz'] };
		const toon = encode(input);
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});

	it('round-trips tabular arrays', () => {
		const input = {
			items: [
				{ id: 1, qty: 5 },
				{ id: 2, qty: 3 },
			],
		};
		const toon = encode(input);
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});

	it('round-trips mixed arrays', () => {
		const input = { items: [1, { a: 1 }, 'x'] };
		const toon = encode(input);
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});

	it('round-trips with different delimiters', () => {
		const input = {
			items: [
				{ sku: 'A1', name: 'Widget', qty: 2, price: 9.99 },
				{ sku: 'B2', name: 'Gadget', qty: 1, price: 14.5 },
			],
		};

		const toonPipe = encode(input, { delimiter: '|' });
		expect(decode(toonPipe)).toEqual(input);

		const toonTab = encode(input, { delimiter: '\t' });
		expect(decode(toonTab)).toEqual(input);
	});

	it('round-trips with length markers', () => {
		const input = {
			tags: ['reading', 'gaming', 'coding'],
			items: [
				{ sku: 'A1', qty: 2, price: 9.99 },
				{ sku: 'B2', qty: 1, price: 14.5 },
			],
		};
		const toon = encode(input, { lengthMarker: '#' });
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});

	it('round-trips complex nested structures', () => {
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
		};
		const toon = encode(input);
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});

	it('round-trips with null and boolean values', () => {
		const input = { name: 'Alice', middleName: null, active: true, deleted: false };
		const toon = encode(input);
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});

	it('round-trips array of arrays', () => {
		const input = { pairs: [[1, 2], [3, 4]] };
		const toon = encode(input);
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});

	it('round-trips empty arrays', () => {
		const input = { items: [] };
		const toon = encode(input);
		const decoded = decode(toon);
		expect(decoded).toEqual(input);
	});
});

describe('Indentation Handling', () => {
	it('decodes compact mode (indent 0)', () => {
		const toon = 'user:\nname: Alice\nage: 30';
		const expected = {
			user: {
				name: 'Alice',
				age: 30,
			},
		};
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes with 2-space indent', () => {
		const toon = 'user:\n  name: Alice\n  age: 30';
		const expected = {
			user: {
				name: 'Alice',
				age: 30,
			},
		};
		expect(decode(toon)).toEqual(expected);
	});

	it('decodes with 4-space indent', () => {
		const toon = 'user:\n    name: Alice\n    age: 30';
		const expected = {
			user: {
				name: 'Alice',
				age: 30,
			},
		};
		expect(decode(toon)).toEqual(expected);
	});
});

describe('Edge Cases', () => {
	it('handles empty input', () => {
		expect(decode('')).toBeNull();
		expect(decode('   ')).toBeNull();
		expect(decode('\n\n')).toBeNull();
	});

	it('handles whitespace-only lines', () => {
		const toon = 'name: Alice\n\nage: 30';
		const expected = { name: 'Alice', age: 30 };
		expect(decode(toon)).toEqual(expected);
	});

	it('handles trailing whitespace', () => {
		const toon = 'name: Alice  \nage: 30  ';
		const expected = { name: 'Alice', age: 30 };
		expect(decode(toon)).toEqual(expected);
	});

	it('handles quoted keys', () => {
		const toon = '"my key": value\n"another.key": 42';
		const expected = { 'my key': 'value', 'another.key': 42 };
		expect(decode(toon)).toEqual(expected);
	});

	it('handles numbers that look like strings', () => {
		const toon = 'id: "123"\ncount: 123';
		const expected = { id: '123', count: 123 };
		expect(decode(toon)).toEqual(expected);
	});
});

describe('Quoted String Edge Cases', () => {
	it('handles strings with escaped quotes', () => {
		const toon = 'message: "She said \\"hello\\""';
		const expected = { message: 'She said "hello"' };
		expect(decode(toon)).toEqual(expected);
	});

	it('handles strings with backslashes', () => {
		const toon = 'path: "C:\\\\Users\\\\Alice"';
		const expected = { path: 'C:\\Users\\Alice' };
		expect(decode(toon)).toEqual(expected);
	});

	it('handles strings with tabs', () => {
		const toon = 'text: "Column1\\tColumn2"';
		const expected = { text: 'Column1\tColumn2' };
		expect(decode(toon)).toEqual(expected);
	});
});

