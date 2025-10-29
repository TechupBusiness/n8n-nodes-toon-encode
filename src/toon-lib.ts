/**
 * Inlined TOON library (https://github.com/johannschopplich/toon)
 * Version: v0.4.1
 * License: MIT
 * Copyright (c) Johann Schopplich <hello@johannschopplich.com>
 * https://github.com/johannschopplich/toon/blob/main/LICENSE
 */

// Type definitions for JSON values
type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type Depth = number;

export interface EncodeOptions {
	indent?: number;
	delimiter?: ',' | '\t' | '|';
	lengthMarker?: '#' | false;
}

type ResolvedOptions = {
	indent: number;
	delimiter: string;
	lengthMarker: '#' | false;
};

const LIST_ITEM_MARKER = '-';
const LIST_ITEM_PREFIX = '- ';
const COMMA = ',';
const DEFAULT_DELIMITER = ',';
const NULL_LITERAL = 'null';
const TRUE_LITERAL = 'true';
const FALSE_LITERAL = 'false';
const BACKSLASH = '\\';
const DOUBLE_QUOTE = '"';

function normalizeValue(value: unknown): JsonValue {
	if (value === null) return null;
	if (typeof value === 'string' || typeof value === 'boolean') return value;
	if (typeof value === 'number') {
		if (Object.is(value, -0)) return 0;
		if (!Number.isFinite(value)) return null;
		return value;
	}
	if (typeof value === 'bigint') {
		if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) return Number(value);
		return value.toString();
	}
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(normalizeValue);
	if (value instanceof Set) return Array.from(value).map(normalizeValue);
	if (value instanceof Map)
		return Object.fromEntries(Array.from(value, ([k, v]) => [String(k), normalizeValue(v)]));
	if (isPlainObject(value)) {
		const result: JsonObject = {};
		for (const key in value)
			if (Object.prototype.hasOwnProperty.call(value, key)) result[key] = normalizeValue((value as Record<string, unknown>)[key]);
		return result;
	}
	return null;
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

function isJsonArray(value: unknown): value is JsonArray {
	return Array.isArray(value);
}

function isJsonObject(value: unknown): value is JsonObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPlainObject(value: unknown): boolean {
	if (value === null || typeof value !== 'object') return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}

function isArrayOfPrimitives(value: JsonArray): boolean {
	return value.every((item) => isJsonPrimitive(item));
}

function isArrayOfArrays(value: JsonArray): boolean {
	return value.every((item) => isJsonArray(item));
}

function isArrayOfObjects(value: JsonArray): boolean {
	return value.every((item) => isJsonObject(item));
}

function encodePrimitive(value: JsonPrimitive, delimiter: string): string {
	if (value === null) return NULL_LITERAL;
	if (typeof value === 'boolean') return String(value);
	if (typeof value === 'number') return String(value);
	return encodeStringLiteral(value, delimiter);
}

function encodeStringLiteral(value: string, delimiter = COMMA): string {
	if (isSafeUnquoted(value, delimiter)) return value;
	return `${DOUBLE_QUOTE}${escapeString(value)}${DOUBLE_QUOTE}`;
}

function escapeString(value: string): string {
	return value
		.replace(/\\/g, `${BACKSLASH}${BACKSLASH}`)
		.replace(/"/g, `${BACKSLASH}${DOUBLE_QUOTE}`)
		.replace(/\n/g, `${BACKSLASH}n`)
		.replace(/\r/g, `${BACKSLASH}r`)
		.replace(/\t/g, `${BACKSLASH}t`);
}

function isBooleanOrNullLiteral(token: string): boolean {
	return token === TRUE_LITERAL || token === FALSE_LITERAL || token === NULL_LITERAL;
}

function isNumericLike(value: string): boolean {
	return /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value) || /^0\d+$/.test(value);
}

function isISOTimestamp(value: string): boolean {
	// Match ISO 8601 timestamps like: 2025-01-15T10:30:00Z or 2025-01-15T10:30:00.000Z
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value);
}

function isSafeUnquoted(value: string, delimiter = COMMA): boolean {
	if (!value) return false;
	if (value !== value.trim()) return false;
	if (isBooleanOrNullLiteral(value) || isNumericLike(value)) return false;
	// Check for colons - they need quoting unless it's an ISO timestamp
	if (value.includes(':')) {
		if (!isISOTimestamp(value)) return false;
	}
	if (value.includes('"') || value.includes('\\')) return false;
	if (/[[\]{}]/.test(value)) return false;
	if (/[\n\r\t]/.test(value)) return false;
	if (value.includes(delimiter)) return false;
	if (value.startsWith(LIST_ITEM_MARKER)) return false;
	return true;
}

function encodeKey(key: string): string {
	if (isValidUnquotedKey(key)) return key;
	return `${DOUBLE_QUOTE}${escapeString(key)}${DOUBLE_QUOTE}`;
}

function isValidUnquotedKey(key: string): boolean {
	return /^[A-Z_][\w.]*$/i.test(key);
}

function encodeAndJoinPrimitives(values: JsonPrimitive[], delimiter = COMMA): string {
	return values.map((v) => encodePrimitive(v, delimiter)).join(delimiter);
}

function formatHeader(
	length: number,
	options?: {
		key?: string;
		fields?: string[];
		delimiter?: string;
		lengthMarker?: '#' | false;
	},
): string {
	const key = options?.key;
	const fields = options?.fields;
	const delimiter = options?.delimiter ?? COMMA;
	const lengthMarker = options?.lengthMarker ?? false;

	let header = '';

	if (key) {
		header += encodeKey(key);
	}

	// v0.4.1: Include delimiter in header if it's not the default (comma)
	header += `[${lengthMarker || ''}${length}${delimiter !== DEFAULT_DELIMITER ? delimiter : ''}]`;

	if (fields) {
		const quotedFields = fields.map((f) => encodeKey(f));
		header += `{${quotedFields.join(delimiter)}}`;
	}

	header += ':';

	return header;
}

class LineWriter {
	private readonly lines: string[] = [];
	private readonly indentationString: string;

	constructor(indentSize: number) {
		this.indentationString = ' '.repeat(indentSize);
	}

	push(depth: Depth, content: string): void {
		const indent = this.indentationString.repeat(depth);
		this.lines.push(indent + content);
	}

	pushListItem(depth: Depth, content: string): void {
		this.push(depth, `${LIST_ITEM_PREFIX}${content}`);
	}

	toString(): string {
		return this.lines.join('\n');
	}
}

function encodeValue(value: JsonValue, options: ResolvedOptions): string {
	if (isJsonPrimitive(value)) return encodePrimitive(value, options.delimiter);
	const writer = new LineWriter(options.indent);
	if (isJsonArray(value)) encodeArray(undefined, value, writer, 0, options);
	else if (isJsonObject(value)) encodeObject(value, writer, 0, options);
	return writer.toString();
}

function encodeObject(value: JsonObject, writer: LineWriter, depth: number, options: ResolvedOptions): void {
	const keys = Object.keys(value);
	for (const key of keys) encodeKeyValuePair(key, value[key], writer, depth, options);
}

function encodeKeyValuePair(
	key: string,
	value: JsonValue,
	writer: LineWriter,
	depth: number,
	options: ResolvedOptions,
): void {
	const encodedKey = encodeKey(key);
	if (isJsonPrimitive(value))
		writer.push(depth, `${encodedKey}: ${encodePrimitive(value, options.delimiter)}`);
	else if (isJsonArray(value)) encodeArray(key, value, writer, depth, options);
	else if (isJsonObject(value))
		if (Object.keys(value).length === 0) writer.push(depth, `${encodedKey}:`);
		else {
			writer.push(depth, `${encodedKey}:`);
			encodeObject(value, writer, depth + 1, options);
		}
}

function encodeArray(
	key: string | undefined,
	value: JsonArray,
	writer: LineWriter,
	depth: Depth,
	options: ResolvedOptions,
): void {
	if (value.length === 0) {
		const header = formatHeader(0, { key, delimiter: options.delimiter, lengthMarker: options.lengthMarker });
		writer.push(depth, header);
		return;
	}

	// Primitive array
	if (isArrayOfPrimitives(value)) {
		const formatted = encodeInlineArrayLine(value as JsonPrimitive[], options.delimiter, key, options.lengthMarker);
		writer.push(depth, formatted);
		return;
	}

	// Array of arrays (all primitives)
	if (isArrayOfArrays(value)) {
		const allPrimitiveArrays = value.every((arr) => isJsonArray(arr) && isArrayOfPrimitives(arr));
		if (allPrimitiveArrays) {
			encodeArrayOfArraysAsListItems(key, value as JsonArray[], writer, depth, options);
			return;
		}
	}

	// Array of objects
	if (isArrayOfObjects(value)) {
		const header = extractTabularHeader(value as JsonObject[]);
		if (header) {
			encodeArrayOfObjectsAsTabular(key, value as JsonObject[], header, writer, depth, options);
		}
		else {
			encodeMixedArrayAsListItems(key, value, writer, depth, options);
		}
		return;
	}

	// Mixed array: fallback to expanded format
	encodeMixedArrayAsListItems(key, value, writer, depth, options);
}

function encodeArrayOfArraysAsListItems(
	prefix: string | undefined,
	values: JsonArray[],
	writer: LineWriter,
	depth: Depth,
	options: ResolvedOptions,
): void {
	const header = formatHeader(values.length, {
		key: prefix,
		delimiter: options.delimiter,
		lengthMarker: options.lengthMarker,
	});
	writer.push(depth, header);

	for (const arr of values) {
		if (isArrayOfPrimitives(arr)) {
			const inline = encodeInlineArrayLine(arr as JsonPrimitive[], options.delimiter, undefined, options.lengthMarker);
			writer.pushListItem(depth + 1, inline);
		}
	}
}

function encodeInlineArrayLine(
	values: JsonPrimitive[],
	delimiter: string,
	prefix?: string,
	lengthMarker?: '#' | false,
): string {
	const header = formatHeader(values.length, { key: prefix, delimiter, lengthMarker });
	const joinedValue = encodeAndJoinPrimitives(values, delimiter);
	// Only add space if there are values
	if (values.length === 0) {
		return header;
	}
	return `${header} ${joinedValue}`;
}

function encodeArrayOfObjectsAsTabular(
	prefix: string | undefined,
	rows: JsonObject[],
	header: string[],
	writer: LineWriter,
	depth: Depth,
	options: ResolvedOptions,
): void {
	const headerStr = formatHeader(rows.length, {
		key: prefix,
		fields: header,
		delimiter: options.delimiter,
		lengthMarker: options.lengthMarker,
	});
	writer.push(depth, `${headerStr}`);
	writeTabularRows(rows, header, writer, depth + 1, options);
}

function extractTabularHeader(rows: JsonObject[]): string[] | undefined {
	if (rows.length === 0) return undefined;

	const firstRow = rows[0];
	if (!isJsonObject(firstRow)) return undefined;

	const firstKeys = Object.keys(firstRow);
	if (firstKeys.length === 0) return undefined;

	if (isTabularArray(rows, firstKeys)) {
		return firstKeys;
	}
	return undefined;
}

function isTabularArray(rows: JsonObject[], header: string[]): boolean {
	for (const row of rows) {
		const keys = Object.keys(row);

		// All objects must have the same keys (but order can differ)
		if (keys.length !== header.length) {
			return false;
		}

		// Check that all header keys exist in the row and all values are primitives
		for (const key of header) {
			if (!(key in row)) {
				return false;
			}
			if (!isJsonPrimitive(row[key])) {
				return false;
			}
		}
	}

	return true;
}

function writeTabularRows(
	rows: JsonObject[],
	header: string[],
	writer: LineWriter,
	depth: Depth,
	options: ResolvedOptions,
): void {
	for (const row of rows) {
		const values = header.map((key) => row[key] as JsonPrimitive);
		const joinedValue = encodeAndJoinPrimitives(values, options.delimiter);
		writer.push(depth, joinedValue);
	}
}

function encodeMixedArrayAsListItems(
	prefix: string | undefined,
	items: JsonValue[],
	writer: LineWriter,
	depth: Depth,
	options: ResolvedOptions,
): void {
	const header = formatHeader(items.length, {
		key: prefix,
		delimiter: options.delimiter,
		lengthMarker: options.lengthMarker,
	});
	writer.push(depth, header);

	for (const item of items) {
		encodeListItemValue(item, writer, depth + 1, options);
	}
}

function encodeListItemValue(
	value: JsonValue,
	writer: LineWriter,
	depth: Depth,
	options: ResolvedOptions,
): void {
	if (isJsonPrimitive(value)) {
		writer.pushListItem(depth, encodePrimitive(value, options.delimiter));
	}
	else if (isJsonArray(value) && isArrayOfPrimitives(value)) {
		const inline = encodeInlineArrayLine(value as JsonPrimitive[], options.delimiter, undefined, options.lengthMarker);
		writer.pushListItem(depth, inline);
	}
	else if (isJsonObject(value)) {
		encodeObjectAsListItem(value as JsonObject, writer, depth, options);
	}
}

function encodeObjectAsListItem(
	obj: JsonObject,
	writer: LineWriter,
	depth: Depth,
	options: ResolvedOptions,
): void {
	const keys = Object.keys(obj);
	if (keys.length === 0) {
		writer.push(depth, LIST_ITEM_MARKER);
		return;
	}

	// First key-value on the same line as "- "
	const firstKey = keys[0];
	const encodedKey = encodeKey(firstKey);
	const firstValue = obj[firstKey];

	if (isJsonPrimitive(firstValue)) {
		writer.pushListItem(depth, `${encodedKey}: ${encodePrimitive(firstValue, options.delimiter)}`);
	}
	else if (isJsonArray(firstValue)) {
		if (isArrayOfPrimitives(firstValue)) {
			// Inline format for primitive arrays
			const formatted = encodeInlineArrayLine(firstValue as JsonPrimitive[], options.delimiter, firstKey, options.lengthMarker);
			writer.pushListItem(depth, formatted);
		}
		else if (isArrayOfObjects(firstValue)) {
			// Check if array of objects can use tabular format
			const header = extractTabularHeader(firstValue as JsonObject[]);
			if (header) {
				// Tabular format for uniform arrays of objects
				const headerStr = formatHeader(firstValue.length, {
					key: firstKey,
					fields: header,
					delimiter: options.delimiter,
					lengthMarker: options.lengthMarker,
				});
				writer.pushListItem(depth, headerStr);
				writeTabularRows(firstValue as JsonObject[], header, writer, depth + 1, options);
			}
			else {
				// Fall back to list format for non-uniform arrays of objects
				writer.pushListItem(depth, `${encodedKey}[${firstValue.length}]:`);
				for (const item of firstValue) {
					if (isJsonObject(item)) {
						encodeObjectAsListItem(item as JsonObject, writer, depth + 1, options);
					}
				}
			}
		}
		else {
			// Complex arrays on separate lines (array of arrays, etc.)
			writer.pushListItem(depth, `${encodedKey}[${firstValue.length}]:`);

			// Encode array contents at depth + 1
			for (const item of firstValue) {
				encodeListItemValue(item, writer, depth + 1, options);
			}
		}
	}
	else if (isJsonObject(firstValue)) {
		const nestedKeys = Object.keys(firstValue);
		if (nestedKeys.length === 0) {
			writer.pushListItem(depth, `${encodedKey}:`);
		}
		else {
			writer.pushListItem(depth, `${encodedKey}:`);
			encodeObject(firstValue, writer, depth + 2, options);
		}
	}

	// Remaining keys on indented lines
	for (let i = 1; i < keys.length; i++) {
		const key = keys[i];
		encodeKeyValuePair(key, obj[key], writer, depth + 1, options);
	}
}

export function encode(input: unknown, options?: EncodeOptions): string {
	return encodeValue(normalizeValue(input), {
		indent: options?.indent ?? 2,
		delimiter: options?.delimiter ?? ',',
		lengthMarker: options?.lengthMarker ?? false,
	});
}

// ============================
// DECODE IMPLEMENTATION
// ============================

export interface DecodeOptions {
	strict?: boolean;
	indent?: number;
}

type Token = {
	type: 'KEY' | 'VALUE' | 'COLON' | 'ARRAY_HEADER' | 'LIST_ITEM' | 'NEWLINE' | 'EOF';
	value: string;
	indent: number;
	line: number;
	arrayInfo?: {
		key?: string;
		length: number;
		fields?: string[];
		delimiter: string;
		inlineValues?: string;
	};
	hadTabIndent: boolean;
};

type IndentInfo = {
	count: number;
	hadTabIndent: boolean;
};

class Scanner {
	private lines: string[];
	private tokens: Token[] = [];
	private options: Required<DecodeOptions>;

	constructor(input: string, options: DecodeOptions = {}) {
		this.lines = input.split('\n');
		this.options = {
			strict: options.strict ?? true,
			indent: options.indent ?? 2,
		};
	}

	scan(): Token[] {
		let insideArray = false;
		let arrayIndent = -1;
		
		for (let i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			
			// Check for blank lines inside arrays (strict mode only)
			if (line.trim() === '') {
				if (this.options.strict && insideArray) {
					// Peek ahead to see if we're still in the array
					let nextLineIndex = i + 1;
					while (nextLineIndex < this.lines.length && this.lines[nextLineIndex].trim() === '') {
						nextLineIndex++;
					}
					if (nextLineIndex < this.lines.length) {
						const nextLine = this.lines[nextLineIndex];
						const nextIndent = this.getIndent(nextLine, nextLineIndex + 1);
						if (nextIndent.count > arrayIndent) {
							// We're still inside the array
							const arrayType = this.tokens.length > 0 && this.tokens[this.tokens.length - 1].type === 'LIST_ITEM' ? 'list array' : 'tabular array';
							throw new Error(`Blank line found inside ${arrayType} (strict mode)`);
						}
					}
				}
				continue;
			}

			const indentInfo = this.getIndent(line, i + 1);
			const indent = indentInfo.count;
			const hadTabIndent = indentInfo.hadTabIndent;
			const trimmed = line.trim();
			
			// Track if we're inside an array
			const arrayCheck = this.parseArrayHeader(trimmed);
			if (arrayCheck) {
				insideArray = true;
				arrayIndent = indent;
			} else if (insideArray && indent <= arrayIndent) {
				insideArray = false;
				arrayIndent = -1;
			}

			// List item
			if (trimmed.startsWith('- ')) {
				this.tokens.push({
					type: 'LIST_ITEM',
					value: trimmed.substring(2),
					indent,
					line: i,
					hadTabIndent,
				});
				continue;
			}

			// Try to parse as array header
			const arrayHeaderMatch = this.parseArrayHeader(trimmed);
			if (arrayHeaderMatch) {
				this.tokens.push({
					type: 'ARRAY_HEADER',
					value: trimmed,
					indent,
					line: i,
					arrayInfo: arrayHeaderMatch,
					hadTabIndent,
				});
				continue;
			}

			// Key-value pair or standalone key with colon
			if (trimmed.includes(':')) {
				const colonIndex = this.findMainColon(trimmed);
				if (colonIndex !== -1) {
					const key = trimmed.substring(0, colonIndex).trim();
					const value = trimmed.substring(colonIndex + 1).trim();

					// Validate if this looks like a key-value pair
					// Quoted keys can contain anything
					// Unquoted keys shouldn't contain commas (that would be data values)
					// Keys should be reasonable length (< 100 chars)
					// Keys should not be purely numeric or contain only numbers and commas
					const isQuotedKey = key.startsWith('"') && key.endsWith('"');
					const looksLikeKeyValue = isQuotedKey || (!key.includes(',') && key.length < 100 && !/^[\d,\s]+$/.test(key));

					if (looksLikeKeyValue) {
						this.tokens.push({
							type: 'KEY',
							value: this.unescapeKey(key),
							indent,
							line: i,
							hadTabIndent,
						});

						this.tokens.push({
							type: 'COLON',
							value: ':',
							indent,
							line: i,
							hadTabIndent,
						});

						if (value) {
							this.tokens.push({
								type: 'VALUE',
								value,
								indent,
								line: i,
								hadTabIndent,
							});
						}
						continue;
					}
				}
			}

			// Plain value (continuation of previous)
			this.tokens.push({
				type: 'VALUE',
				value: trimmed,
				indent,
				line: i,
				hadTabIndent,
			});
		}

		this.tokens.push({
			type: 'EOF',
			value: '',
			indent: 0,
			line: this.lines.length,
			hadTabIndent: false,
		});

		return this.tokens;
	}

	private getIndent(line: string, lineNum: number): IndentInfo {
		let count = 0;
		let hadTabIndent = false;
		
		for (const char of line) {
			if (char === ' ') {
				count++;
			}
			else if (char === '\t') {
				if (this.options.strict) {
					throw new Error(`Indentation error at line ${lineNum}: Tab character found in indentation. Use spaces only.`);
				}
				hadTabIndent = true;
			}
			else break;
		}
		
		// In strict mode, check indentation is a multiple of indent size
		if (this.options.strict && count > 0 && count % this.options.indent !== 0) {
			throw new Error(`Indentation error at line ${lineNum}: Expected indentation to be an exact multiple of ${this.options.indent}, but found ${count} spaces.`);
		}
		
		return { count, hadTabIndent };
	}

	private findMainColon(str: string): number {
		let inQuotes = false;
		let escapeNext = false;

		for (let i = 0; i < str.length; i++) {
			const char = str[i];

			if (escapeNext) {
				escapeNext = false;
				continue;
			}

			if (char === '\\') {
				escapeNext = true;
				continue;
			}

			if (char === '"') {
				inQuotes = !inQuotes;
				continue;
			}

			if (!inQuotes && char === ':') {
				return i;
			}
		}

		return -1;
	}

	private parseArrayHeader(str: string): Token['arrayInfo'] | null {
		// Match pattern: [optional_key][#length,delimiter]{fields}:
		// Examples: 
		// - users[3]{name,age}:
		// - [#5,]: 
		// - items[10	]{id	name	price}:
		
		const arrayPattern = /^(?:([^[\]]+))?\[([#])?(\d+)([,\t|])?\](?:\{([^}]+)\})?:\s*(.*)$/;
		const match = str.match(arrayPattern);

		if (!match) return null;

		const [, key, , lengthStr, delimiterInHeader, fieldsStr, valueAfter] = match;

		// Determine delimiter
		let delimiter = ',';
		if (delimiterInHeader) {
			delimiter = delimiterInHeader;
		}

		const result: Token['arrayInfo'] = {
			key: key?.trim() || undefined,
			length: parseInt(lengthStr, 10),
			delimiter,
		};

		// Parse fields if present
		if (fieldsStr) {
			result.fields = this.splitByDelimiter(fieldsStr, delimiter).map((f) => this.unescapeKey(f.trim()));
		}

		// Capture inline values if present
		if (valueAfter && valueAfter.trim()) {
			result.inlineValues = valueAfter.trim();
		}

		return result;
	}

	private splitByDelimiter(str: string, delimiter: string): string[] {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;
		let escapeNext = false;

		for (let i = 0; i < str.length; i++) {
			const char = str[i];

			if (escapeNext) {
				current += char;
				escapeNext = false;
				continue;
			}

			if (char === '\\') {
				escapeNext = true;
				current += char;
				continue;
			}

			if (char === '"') {
				inQuotes = !inQuotes;
				current += char;
				continue;
			}

			if (!inQuotes && char === delimiter) {
				result.push(current);
				current = '';
				continue;
			}

			current += char;
		}

		if (current) result.push(current);
		return result;
	}

	private unescapeKey(key: string): string {
		// Remove quotes if present
		if (key.startsWith('"') && key.endsWith('"')) {
			return this.unescapeString(key.substring(1, key.length - 1));
		}
		return key;
	}

	private unescapeString(str: string): string {
		// Validate escape sequences
		let result = '';
		let i = 0;
		while (i < str.length) {
			if (str[i] === '\\') {
				if (i + 1 >= str.length) {
					throw new Error('Invalid escape sequence: string ends with backslash');
				}
				const nextChar = str[i + 1];
				if (nextChar === 'n') {
					result += '\n';
					i += 2;
				} else if (nextChar === 'r') {
					result += '\r';
					i += 2;
				} else if (nextChar === 't') {
					result += '\t';
					i += 2;
				} else if (nextChar === '"') {
					result += '"';
					i += 2;
				} else if (nextChar === '\\') {
					result += '\\';
					i += 2;
				} else {
					throw new Error(`Invalid escape sequence: \\${nextChar}`);
				}
			} else {
				result += str[i];
				i++;
			}
		}
		return result;
	}
}

class Parser {
	private tokens: Token[];
	private position = 0;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): JsonValue {
		// Check if we have multiple top-level items
		const firstToken = this.current();
		
		// Single primitive value or single array without key
		if (!firstToken || firstToken.type === 'EOF') {
			return null;
		}

		if (firstToken.type === 'VALUE') {
			return this.parsePrimitive(firstToken.value);
		}

		if (firstToken.type === 'ARRAY_HEADER' && !firstToken.arrayInfo?.key) {
			return this.parseArray();
		}

		// Multiple top-level keys or single object
		// Collect all tokens at root indent level (0)
		const result: JsonObject = {};
		
		while (this.position < this.tokens.length) {
			const token = this.current();
			
			if (!token || token.type === 'EOF') break;
			if (token.indent !== 0) break;

			if (token.type === 'ARRAY_HEADER' && token.arrayInfo?.key) {
				const key = token.arrayInfo.key;
				const array = this.parseArray();
				result[key] = array;
			}
			else if (token.type === 'KEY') {
				const key = token.value;
				this.advance(); // Move past KEY

				// Expect COLON
				if (this.current()?.type === 'COLON') {
					this.advance(); // Move past COLON

					const nextToken = this.current();

					// VALUE token at nested level without colon is an error
					if (nextToken && nextToken.type === 'VALUE' && nextToken.indent > token.indent) {
						throw new Error(`Missing colon after key "${nextToken.value}" (found nested value without colon)`);
					}

				// Empty value (nested object or array on next lines)
				// Special case for indent 0: treat same-level keys as nested (compact mode)
				// But tab-indented keys at same indent are siblings, not nested
				const isCompactNested = token.indent === 0 && nextToken?.indent === 0 && nextToken?.type === 'KEY' && nextToken?.hadTabIndent !== true;
				const isTabSibling = nextToken?.type === 'KEY' && nextToken?.hadTabIndent === true && nextToken?.indent === token.indent;
				
				if (isTabSibling) {
					// Tab-indented key at same level is a sibling, not nested
					result[key] = {};
				}
				else if (!nextToken || nextToken.type === 'EOF' || nextToken.indent > token.indent || isCompactNested) {
					const nextIndent = nextToken?.indent ?? token.indent + 1;

					// Check if next is array header
					if (nextToken?.type === 'ARRAY_HEADER') {
						result[key] = this.parseArray();
					}
					// Check if next is list item
					else if (nextToken?.type === 'LIST_ITEM') {
						result[key] = this.parseListItems(nextIndent);
					}
					// Nested object
					else if (nextToken?.type === 'KEY') {
						result[key] = this.parseObject(nextIndent);
					}
					else {
						result[key] = {};
					}
				}
				// Inline value
				else if (nextToken.type === 'VALUE') {
					result[key] = this.parsePrimitive(nextToken.value);
					this.advance();
				}
				// Array header on same line
				else if (nextToken.type === 'ARRAY_HEADER') {
					result[key] = this.parseArray();
				}
				}
			}
			else {
				// Unexpected token, skip
				this.advance();
			}
		}

		// If only one key, check if we should return the whole object or unwrap it
		const keys = Object.keys(result);
		if (keys.length === 0) {
			return null;
		}
		
		return result;
	}

	private current(): Token {
		return this.tokens[this.position];
	}

	private advance(): Token {
		return this.tokens[this.position++];
	}

	private parseObject(baseIndent: number): JsonObject {
		const result: JsonObject = {};

		while (this.position < this.tokens.length) {
			const token = this.current();

			if (!token || token.type === 'EOF') break;
			if (token.indent < baseIndent) break;
			if (token.indent > baseIndent && baseIndent > 0) break;

	if (token.type === 'KEY') {
		const key = token.value;
		this.advance(); // Move past KEY

		// Expect COLON
		const colonToken = this.current();
		if (!colonToken || colonToken.type !== 'COLON') {
			throw new Error(`Missing colon after key "${key}"`);
		}
		this.advance(); // Move past COLON

		const nextToken = this.current();

		// VALUE token at nested level without colon is an error
		if (nextToken && nextToken.type === 'VALUE' && nextToken.indent > token.indent) {
			throw new Error(`Missing colon after key "${nextToken.value}" (found nested value without colon)`);
		}

		// Empty value (nested object or array on next lines)
		// Special case for indent 0: treat same-level keys as nested (compact mode)
		// But tab-indented keys at same indent are siblings, not nested
		const isCompactNested = baseIndent === 0 && nextToken?.indent === 0 && nextToken?.type === 'KEY' && nextToken?.hadTabIndent !== true;
		const isTabSibling = nextToken?.type === 'KEY' && nextToken?.hadTabIndent === true && nextToken?.indent === token.indent;
		
		if (isTabSibling) {
			// Tab-indented key at same level is a sibling, not nested
			result[key] = {};
			// Don't break - let the loop continue to parse the sibling
		}
		else if (!nextToken || nextToken.type === 'EOF' || nextToken.indent > token.indent || isCompactNested) {
			const nextIndent = nextToken?.indent ?? token.indent + 1;

			// Check if next is array header
			if (nextToken?.type === 'ARRAY_HEADER') {
				result[key] = this.parseArray();
			}
			// Check if next is list item
			else if (nextToken?.type === 'LIST_ITEM') {
				result[key] = this.parseListItems(nextIndent);
			}
			// Nested object
			else if (nextToken?.type === 'KEY') {
				result[key] = this.parseObject(nextIndent);
			}
			else {
				result[key] = {};
			}
		}
		// Inline value
		else if (nextToken.type === 'VALUE') {
			result[key] = this.parsePrimitive(nextToken.value);
			this.advance();
		}
		// Array header on same line
		else if (nextToken.type === 'ARRAY_HEADER') {
			result[key] = this.parseArray();
		}
	}
		// Handle ARRAY_HEADER tokens that appear as object fields (e.g., data[0]:)
		else if (token.type === 'ARRAY_HEADER' && token.arrayInfo?.key) {
			const key = token.arrayInfo.key;
			result[key] = this.parseArray();
		}
		else {
			break;
		}
		}

		return result;
	}

	private parseArray(): JsonArray {
		const headerToken = this.current();

		if (!headerToken.arrayInfo) {
			this.advance();
			return [];
		}

		const { length, fields, delimiter, inlineValues } = headerToken.arrayInfo;
		const arrayIndent = headerToken.indent;

		this.advance(); // Move past array header

		if (length === 0) {
			return [];
		}

		const result: JsonArray = [];

		// Check for inline values first (e.g., tags[2]: foo,bar)
		if (inlineValues) {
			const values = this.splitByDelimiter(inlineValues, delimiter);
			// Validate length
			if (values.length !== length) {
				throw new Error(`Array length mismatch: expected ${length} elements, but found ${values.length}`);
			}
			result.push(...values.map((v) => this.parsePrimitive(v.trim())));
			return result;
		}

		// Tabular format (with fields)
		if (fields && fields.length > 0) {
			// Count how many rows we'll actually parse
			let rowCount = 0;
			let tempPos = this.position;
			while (tempPos < this.tokens.length) {
				const token = this.tokens[tempPos];
				if (!token || token.type === 'EOF') break;
				if (token.indent <= arrayIndent) break;
				if (token.type === 'VALUE') rowCount++;
				else break;
				tempPos++;
			}
			
			// Validate row count before parsing
			if (rowCount !== length) {
				throw new Error(`Tabular array row count mismatch: expected ${length} rows, but found ${rowCount}`);
			}
			
			for (let i = 0; i < length; i++) {
				const rowToken = this.current();

				if (!rowToken || rowToken.type === 'EOF') break;
				if (rowToken.indent <= arrayIndent) break;

				if (rowToken.type === 'VALUE') {
					// Parse values
					const values = this.splitByDelimiter(rowToken.value, delimiter);
					
					// Validate field count matches
					if (values.length !== fields.length) {
						throw new Error(`Tabular row value count mismatch: expected ${fields.length} fields, but found ${values.length}`);
					}
					
					const obj: JsonObject = {};

					for (let j = 0; j < fields.length; j++) {
						const value = values[j]?.trim() || '';
						obj[fields[j]] = this.parsePrimitive(value);
					}

					result.push(obj);
					this.advance();
				}
				else {
					break;
				}
			}
		}
		// List format
		else if (this.current()?.type === 'LIST_ITEM') {
			const items = this.parseListItems(arrayIndent + 1);
			result.push(...items);
			
			// For list format, we can't reliably validate length when objects contain nested arrays
			// since the structure is more complex. Only validate for simple cases.
			const hasComplexNesting = items.some(item => 
				isJsonObject(item) && Object.values(item).some(v => isJsonArray(v))
			);
			
			if (!hasComplexNesting && items.length !== length) {
				throw new Error(`List array length mismatch: expected ${length} items, but found ${items.length}`);
			}
		}
		// Primitive array (inline on next line)
		else if (this.current()?.type === 'VALUE') {
			const valueToken = this.current();
			if (valueToken.indent > arrayIndent) {
				const values = this.splitByDelimiter(valueToken.value, delimiter);
				
				// Validate length
				if (values.length !== length) {
					throw new Error(`Array length mismatch: expected ${length} elements, but found ${values.length}`);
				}
				
				result.push(...values.map((v) => this.parsePrimitive(v.trim())));
				this.advance();
			}
		}

		return result;
	}

	private parseListItems(baseIndent: number): JsonArray {
		const result: JsonArray = [];

		while (this.position < this.tokens.length) {
			const token = this.current();

			if (!token || token.type === 'EOF') break;
			if (token.type !== 'LIST_ITEM') break;
			if (token.indent < baseIndent) break;

			const content = token.value;
			const itemIndent = token.indent;
			this.advance();

			// First, check if the entire content is an array header pattern WITHOUT a key
			// (e.g., "[2]: 1,2" not "matrix[2]:")
			const fullArrayMatch = this.parseArrayHeaderString(content);
			if (fullArrayMatch && !fullArrayMatch.key) {
				// This is an inline array like "[2]: 1,2"
				const arrayResult = this.parseInlineArray(fullArrayMatch);
				result.push(arrayResult);
				continue;
			}

			// Check if content is a key-value pair
			const colonIndex = this.findMainColon(content);
			if (colonIndex !== -1) {
				const key = content.substring(0, colonIndex).trim();
				const value = content.substring(colonIndex + 1).trim();

				const obj: JsonObject = {};

				// Check if key itself is an array header (e.g., "users[2]{id,name}")
				const keyArrayMatch = this.parseArrayHeaderString(key + ':');
				if (keyArrayMatch && keyArrayMatch.key) {
					// Parse as a nested array
					const actualKey = keyArrayMatch.key;
					
					// Check next token for array data or inline values
					const nextToken = this.current();
					if (value) {
						// Inline values in the array header
						const inlineMatch = this.parseArrayHeaderString(key + ': ' + value);
						if (inlineMatch) {
							obj[actualKey] = this.parseInlineArray(inlineMatch);
						}
					} else if (nextToken && nextToken.indent > itemIndent) {
					// Array data on following lines
					// Create a fake ARRAY_HEADER token and parse it
					const arrayHeaderToken: Token = {
						type: 'ARRAY_HEADER',
						value: key + ':',
						indent: itemIndent,
						line: token.line,
						hadTabIndent: false,
						arrayInfo: {
							key: actualKey,
							length: keyArrayMatch.length,
							fields: keyArrayMatch.fields,
							delimiter: keyArrayMatch.delimiter,
						}
					};
						
						// Temporarily inject this token for parsing
						this.position--;
						this.tokens[this.position] = arrayHeaderToken;
						obj[actualKey] = this.parseArray();
					} else {
						// Empty array
						obj[actualKey] = [];
					}
					
				// Check for additional properties on following lines
				const nextToken2 = this.current();
				if (nextToken2 && nextToken2.indent > itemIndent && (nextToken2.type === 'KEY' || nextToken2.type === 'ARRAY_HEADER')) {
					const nestedObj = this.parseObject(nextToken2.indent);
					Object.assign(obj, nestedObj);
				}
					
					result.push(obj);
					continue;
				}

				// Check for array header in value
				const arrayMatch = this.parseArrayHeaderString(value);
				if (arrayMatch) {
					// Check if this is an empty array or has inline values
					if (arrayMatch.length === 0) {
						obj[this.unescapeKey(key)] = [];
					} else if (arrayMatch.valuesStr) {
						const arrayResult = this.parseInlineArray(arrayMatch);
						obj[this.unescapeKey(key)] = arrayResult;
					} else {
						// Array with data on following lines
						const nextToken = this.current();
						if (nextToken && nextToken.indent > itemIndent) {
						// Create a fake ARRAY_HEADER token and parse it
						const arrayHeaderToken: Token = {
							type: 'ARRAY_HEADER',
							value: key + ': ' + value,
							indent: itemIndent,
							line: token.line,
							hadTabIndent: false,
							arrayInfo: {
								length: arrayMatch.length,
								fields: arrayMatch.fields,
								delimiter: arrayMatch.delimiter,
							}
						};
							
							// Temporarily inject this token for parsing
							this.position--;
							this.tokens[this.position] = arrayHeaderToken;
							obj[this.unescapeKey(key)] = this.parseArray();
						} else {
							obj[this.unescapeKey(key)] = [];
						}
					}
					
				// Check for additional properties on following lines
				const nextToken = this.current();
				if (nextToken && nextToken.indent > itemIndent && (nextToken.type === 'KEY' || nextToken.type === 'ARRAY_HEADER')) {
					const nestedObj = this.parseObject(nextToken.indent);
					Object.assign(obj, nestedObj);
				}
			}
			else if (value) {
				obj[this.unescapeKey(key)] = this.parsePrimitive(value);
				
				// Check for additional properties on following lines
				const nextToken = this.current();
				if (nextToken && nextToken.indent > itemIndent && (nextToken.type === 'KEY' || nextToken.type === 'ARRAY_HEADER')) {
					const nestedObj = this.parseObject(nextToken.indent);
					Object.assign(obj, nestedObj);
				}
			}
				else {
					// Empty value, check for nested content
					const nextToken = this.current();
					if (nextToken && nextToken.indent > itemIndent) {
						if (nextToken.type === 'KEY') {
							obj[this.unescapeKey(key)] = this.parseObject(nextToken.indent);
						}
						else if (nextToken.type === 'ARRAY_HEADER') {
							obj[this.unescapeKey(key)] = this.parseArray();
						}
						else if (nextToken.type === 'LIST_ITEM') {
							obj[this.unescapeKey(key)] = this.parseListItems(nextToken.indent);
						}
						else {
							obj[this.unescapeKey(key)] = {};
						}
					}
					else {
						obj[this.unescapeKey(key)] = {};
					}
				}

				result.push(obj);
			}
			else {
				// Plain value or inline array
				const arrayMatch = this.parseArrayHeaderString(content);
				if (arrayMatch) {
					result.push(this.parseInlineArray(arrayMatch));
				}
				else {
					result.push(this.parsePrimitive(content));
				}
			}
		}

		return result;
	}

	private parseInlineArray(info: { length: number; fields?: string[]; delimiter: string; valuesStr: string }): JsonArray {
		const result: JsonArray = [];
		const values = this.splitByDelimiter(info.valuesStr, info.delimiter);

		if (info.fields && info.fields.length > 0) {
			// Tabular format - values should be read from following lines
			// This is handled by the main parseArray, so return empty for now
			return [];
		}
		else {
			result.push(...values.map((v) => this.parsePrimitive(v.trim())));
		}

		return result;
	}

	private parseArrayHeaderString(str: string): { key?: string; length: number; fields?: string[]; delimiter: string; valuesStr: string } | null {
		const arrayPattern = /^(?:([^[\]]+))?\[([#])?(\d+)([,\t|])?\](?:\{([^}]+)\})?:\s*(.*)$/;
		const match = str.match(arrayPattern);

		if (!match) return null;

		const [, key, , lengthStr, delimiterInHeader, fieldsStr, valuesStr] = match;

		let delimiter = ',';
		if (delimiterInHeader) {
			delimiter = delimiterInHeader;
		}

		const result: { key?: string; length: number; fields?: string[]; delimiter: string; valuesStr: string } = {
			key: key?.trim() || undefined,
			length: parseInt(lengthStr, 10),
			delimiter,
			valuesStr: valuesStr || '',
		};

		if (fieldsStr) {
			result.fields = this.splitByDelimiter(fieldsStr, delimiter).map((f) => this.unescapeKey(f.trim()));
		}

		return result;
	}

	private findMainColon(str: string): number {
		let inQuotes = false;
		let escapeNext = false;

		for (let i = 0; i < str.length; i++) {
			const char = str[i];

			if (escapeNext) {
				escapeNext = false;
				continue;
			}

			if (char === '\\') {
				escapeNext = true;
				continue;
			}

			if (char === '"') {
				inQuotes = !inQuotes;
				continue;
			}

			if (!inQuotes && char === ':') {
				return i;
			}
		}

		return -1;
	}

	private splitByDelimiter(str: string, delimiter: string): string[] {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;
		let escapeNext = false;

		for (let i = 0; i < str.length; i++) {
			const char = str[i];

			if (escapeNext) {
				current += char;
				escapeNext = false;
				continue;
			}

			if (char === '\\') {
				escapeNext = true;
				current += char;
				continue;
			}

			if (char === '"') {
				inQuotes = !inQuotes;
				current += char;
				continue;
			}

			if (!inQuotes && char === delimiter) {
				result.push(current);
				current = '';
				continue;
			}

			current += char;
		}

		if (current) result.push(current);
		return result;
	}

	private unescapeKey(key: string): string {
		if (key.startsWith('"') && key.endsWith('"')) {
			return this.unescapeString(key.substring(1, key.length - 1));
		}
		return key;
	}

	private unescapeString(str: string): string {
		// Validate escape sequences
		let result = '';
		let i = 0;
		while (i < str.length) {
			if (str[i] === '\\') {
				if (i + 1 >= str.length) {
					throw new Error('Invalid escape sequence: string ends with backslash');
				}
				const nextChar = str[i + 1];
				if (nextChar === 'n') {
					result += '\n';
					i += 2;
				} else if (nextChar === 'r') {
					result += '\r';
					i += 2;
				} else if (nextChar === 't') {
					result += '\t';
					i += 2;
				} else if (nextChar === '"') {
					result += '"';
					i += 2;
				} else if (nextChar === '\\') {
					result += '\\';
					i += 2;
				} else {
					throw new Error(`Invalid escape sequence: \\${nextChar}`);
				}
			} else {
				result += str[i];
				i++;
			}
		}
		return result;
	}

	private parsePrimitive(value: string): JsonPrimitive {
		const trimmed = value.trim();

		if (trimmed === 'null') return null;
		if (trimmed === 'true') return true;
		if (trimmed === 'false') return false;

		// Try to parse as number (reject leading zeros like 05, 007)
		// Valid: 0, -0, 123, -456, 3.14, 1e5, 1.5e-10
		// Invalid: 05, 007, 0123 (these should remain strings)
		if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
			const num = Number(trimmed);
			if (!Number.isNaN(num) && Number.isFinite(num)) return num;
		}

		// String - remove quotes if present
		if (trimmed.startsWith('"')) {
			if (!trimmed.endsWith('"') || trimmed.length < 2) {
				throw new Error('Unterminated quoted string');
			}
			return this.unescapeString(trimmed.substring(1, trimmed.length - 1));
		}

		return trimmed;
	}
}

export function decode(input: string, options?: DecodeOptions): JsonValue {
	if (!input || input.trim() === '') {
		return null;
	}

	const scanner = new Scanner(input, options);
	const tokens = scanner.scan();
	
	const parser = new Parser(tokens);
	return parser.parse();
}
