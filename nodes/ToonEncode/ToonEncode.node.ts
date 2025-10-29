import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

/**
 * Inlined TOON library (https://github.com/johannschopplich/toon)
 * License: MIT
 * Copyright (c) Johann Schopplich <hello@johannschopplich.com>
 * https://github.com/johannschopplich/toon/blob/main/LICENSE
 */

// Type definitions for JSON values
type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

interface EncodeOptions {
	indent?: number;
	delimiter?: ',' | '\t' | '|';
	lengthMarker?: '#' | false;
}

const LIST_ITEM_MARKER = '-';
const LIST_ITEM_PREFIX = '- ';
const COMMA = ',';
const NULL_LITERAL = 'null';
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

function isSafeUnquoted(value: string, delimiter = COMMA): boolean {
	if (!value) return false;
	if (isPaddedWithWhitespace(value)) return false;
	if (value === 'true' || value === 'false' || value === NULL_LITERAL) return false;
	if (isNumericLike(value)) return false;
	if (value.includes(':')) return false;
	if (value.includes('"') || value.includes('\\')) return false;
	if (/[[\]{}]/.test(value)) return false;
	if (/[\n\r\t]/.test(value)) return false;
	if (value.includes(delimiter)) return false;
	if (value.startsWith(LIST_ITEM_MARKER)) return false;
	return true;
}

function isNumericLike(value: string): boolean {
	return /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value) || /^0\d+$/.test(value);
}

function isPaddedWithWhitespace(value: string): boolean {
	return value !== value.trim();
}

function encodeKey(key: string): string {
	if (isValidUnquotedKey(key)) return key;
	return `${DOUBLE_QUOTE}${escapeString(key)}${DOUBLE_QUOTE}`;
}

function isValidUnquotedKey(key: string): boolean {
	return /^[A-Z_][\w.]*$/i.test(key);
}

function joinEncodedValues(values: JsonPrimitive[], delimiter = COMMA): string {
	return values.map((v) => encodePrimitive(v, delimiter)).join(delimiter);
}

function formatHeader(
	length: number,
	options?: { key?: string; fields?: string[] },
	lengthMarker?: '#' | false,
): string {
	const key = options?.key;
	const fields = options?.fields;
	let header = '';
	if (key) header += encodeKey(key);
	header += `[${lengthMarker ? lengthMarker : ''}${length}]`;
	if (fields) {
		const quotedFields = fields.map((f) => encodeKey(f));
		header += `{${quotedFields.join(',')}}`;
	}
	header += ':';
	return header;
}

class LineWriter {
	lines: string[] = [];
	indentationString: string;

	constructor(indentSize: number) {
		this.indentationString = ' '.repeat(indentSize);
	}

	push(depth: number, content: string) {
		const indent = this.indentationString.repeat(depth);
		this.lines.push(indent + content);
	}

	toString(): string {
		return this.lines.join('\n');
	}
}

type ResolvedOptions = {
	indent: number;
	delimiter: string;
	lengthMarker: '#' | false;
};

function encodeValue(value: JsonValue, options: ResolvedOptions): string {
	if (isJsonPrimitive(value)) return encodePrimitive(value, options.delimiter);
	const writer = new LineWriter(options.indent);
	if (isJsonArray(value)) encodeArray(undefined, value, writer, 0, options);
	else if (isJsonObject(value)) encodeObject(value, writer, 0, options);
	return writer.toString();
}

function encodeObject(value: JsonObject, writer: LineWriter, depth: number, options: ResolvedOptions) {
	const keys = Object.keys(value);
	for (const key of keys) encodeKeyValuePair(key, value[key], writer, depth, options);
}

function encodeKeyValuePair(
	key: string,
	value: JsonValue,
	writer: LineWriter,
	depth: number,
	options: ResolvedOptions,
) {
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
	depth: number,
	options: ResolvedOptions,
) {
	if (value.length === 0) {
		if (key === undefined) writer.push(depth, '[0]:');
		else {
			const encodedKey = encodeKey(key);
			writer.push(depth, `${encodedKey}[0]:`);
		}
		return;
	}
	if (isArrayOfPrimitives(value)) {
		encodeInlinePrimitiveArray(key, value, writer, depth, options);
		return;
	}
	if (isArrayOfArrays(value)) {
		if (value.every((arr) => isJsonArray(arr) && isArrayOfPrimitives(arr))) {
			encodeArrayOfArraysAsListItems(key, value, writer, depth, options);
			return;
		}
	}
	if (isArrayOfObjects(value)) {
		const header = detectTabularHeader(value);
		if (header) encodeArrayOfObjectsAsTabular(key, value, header, writer, depth, options);
		else encodeMixedArrayAsListItems(key, value, writer, depth, options);
		return;
	}
	encodeMixedArrayAsListItems(key, value, writer, depth, options);
}

function encodeInlinePrimitiveArray(
	prefix: string | undefined,
	values: JsonArray,
	writer: LineWriter,
	depth: number,
	options: ResolvedOptions,
) {
	const formatted = formatInlineArray(values, options.delimiter, prefix, options.lengthMarker);
	writer.push(depth, formatted);
}

function encodeArrayOfArraysAsListItems(
	prefix: string | undefined,
	values: JsonArray,
	writer: LineWriter,
	depth: number,
	options: ResolvedOptions,
) {
	const header = formatHeader(
		values.length,
		prefix ? { key: prefix } : undefined,
		options.lengthMarker,
	);
	writer.push(depth, header);
	for (const arr of values)
		if (isJsonArray(arr) && isArrayOfPrimitives(arr)) {
			const inline = formatInlineArray(arr, options.delimiter, undefined, options.lengthMarker);
			writer.push(depth + 1, `${LIST_ITEM_PREFIX}${inline}`);
		}
}

function formatInlineArray(
	values: JsonArray,
	delimiter: string,
	prefix?: string,
	lengthMarker?: '#' | false,
): string {
	const header = formatHeader(values.length, prefix ? { key: prefix } : undefined, lengthMarker);
	const joinedValue = joinEncodedValues(values.filter(isJsonPrimitive), delimiter);
	if (values.length === 0) return header;
	return `${header} ${joinedValue}`;
}

function encodeArrayOfObjectsAsTabular(
	prefix: string | undefined,
	rows: JsonArray,
	header: string[],
	writer: LineWriter,
	depth: number,
	options: ResolvedOptions,
) {
	const headerStr = formatHeader(
		rows.length,
		{
			key: prefix,
			fields: header,
		},
		options.lengthMarker,
	);
	writer.push(depth, `${headerStr}`);
	writeTabularRows(rows, header, writer, depth + 1, options);
}

function detectTabularHeader(rows: JsonArray): string[] | undefined {
	if (rows.length === 0) return undefined;
	const firstRow = rows[0];
	if (!isJsonObject(firstRow)) return undefined;
	const firstKeys = Object.keys(firstRow);
	if (firstKeys.length === 0) return undefined;
	if (isTabularArray(rows, firstKeys)) return firstKeys;
	return undefined;
}

function isTabularArray(rows: JsonArray, header: string[]): boolean {
	for (const row of rows) {
		if (!isJsonObject(row)) return false;
		if (Object.keys(row).length !== header.length) return false;
		for (const key of header) {
			if (!(key in row)) return false;
			if (!isJsonPrimitive(row[key])) return false;
		}
	}
	return true;
}

function writeTabularRows(
	rows: JsonArray,
	header: string[],
	writer: LineWriter,
	depth: number,
	options: ResolvedOptions,
) {
	for (const row of rows) {
		if (isJsonObject(row)) {
			const joinedValue = joinEncodedValues(
				header.map((key) => row[key] as JsonPrimitive),
				options.delimiter,
			);
			writer.push(depth, joinedValue);
		}
	}
}

function encodeMixedArrayAsListItems(
	prefix: string | undefined,
	items: JsonArray,
	writer: LineWriter,
	depth: number,
	options: ResolvedOptions,
) {
	const header = formatHeader(
		items.length,
		prefix ? { key: prefix } : undefined,
		options.lengthMarker,
	);
	writer.push(depth, header);
	for (const item of items)
		if (isJsonPrimitive(item))
			writer.push(depth + 1, `${LIST_ITEM_PREFIX}${encodePrimitive(item, options.delimiter)}`);
		else if (isJsonArray(item)) {
			if (isArrayOfPrimitives(item)) {
				const inline = formatInlineArray(
					item,
					options.delimiter,
					undefined,
					options.lengthMarker,
				);
				writer.push(depth + 1, `${LIST_ITEM_PREFIX}${inline}`);
			}
		} else if (isJsonObject(item)) encodeObjectAsListItem(item, writer, depth + 1, options);
}

function encodeObjectAsListItem(
	obj: JsonObject,
	writer: LineWriter,
	depth: number,
	options: ResolvedOptions,
) {
	const keys = Object.keys(obj);
	if (keys.length === 0) {
		writer.push(depth, LIST_ITEM_MARKER);
		return;
	}
	const firstKey = keys[0];
	const encodedKey = encodeKey(firstKey);
	const firstValue = obj[firstKey];
	if (isJsonPrimitive(firstValue))
		writer.push(
			depth,
			`${LIST_ITEM_PREFIX}${encodedKey}: ${encodePrimitive(firstValue, options.delimiter)}`,
		);
	else if (isJsonArray(firstValue))
		if (isArrayOfPrimitives(firstValue)) {
			const formatted = formatInlineArray(
				firstValue,
				options.delimiter,
				firstKey,
				options.lengthMarker,
			);
			writer.push(depth, `${LIST_ITEM_PREFIX}${formatted}`);
		} else if (isJsonArray(firstValue) && isArrayOfObjects(firstValue)) {
			const header = detectTabularHeader(firstValue);
			if (header) {
				const headerStr = formatHeader(
					firstValue.length,
					{
						key: firstKey,
						fields: header,
					},
					options.lengthMarker,
				);
				writer.push(depth, `${LIST_ITEM_PREFIX}${headerStr}`);
				writeTabularRows(firstValue, header, writer, depth + 1, options);
			} else {
				writer.push(depth, `${LIST_ITEM_PREFIX}${encodedKey}[${firstValue.length}]:`);
				for (const item of firstValue) 
					if (isJsonObject(item)) encodeObjectAsListItem(item, writer, depth + 1, options);
			}
		} else {
			writer.push(depth, `${LIST_ITEM_PREFIX}${encodedKey}[${firstValue.length}]:`);
			for (const item of firstValue)
				if (isJsonPrimitive(item))
					writer.push(depth + 1, `${LIST_ITEM_PREFIX}${encodePrimitive(item, options.delimiter)}`);
				else if (isJsonArray(item) && isArrayOfPrimitives(item)) {
					const inline = formatInlineArray(
						item,
						options.delimiter,
						undefined,
						options.lengthMarker,
					);
					writer.push(depth + 1, `${LIST_ITEM_PREFIX}${inline}`);
				} else if (isJsonObject(item)) encodeObjectAsListItem(item, writer, depth + 1, options);
		}
	else if (isJsonObject(firstValue))
		if (Object.keys(firstValue).length === 0) writer.push(depth, `${LIST_ITEM_PREFIX}${encodedKey}:`);
		else {
			writer.push(depth, `${LIST_ITEM_PREFIX}${encodedKey}:`);
			encodeObject(firstValue, writer, depth + 2, options);
		}
	for (let i = 1; i < keys.length; i++) {
		const key = keys[i];
		encodeKeyValuePair(key, obj[key], writer, depth + 1, options);
	}
}

function encode(input: unknown, options?: EncodeOptions): string {
	return encodeValue(normalizeValue(input), {
		indent: options?.indent ?? 2,
		delimiter: options?.delimiter ?? ',',
		lengthMarker: options?.lengthMarker ?? false,
	});
}

export class ToonEncode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TOON Encode',
		name: 'toonEncode',
		icon: { light: 'file:toon.svg', dark: 'file:toon.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["outputField"]}}',
		description: '**Encode JSON → TOON**<br/>' +
			'• Saves **40–60% tokens** for LLMs.<br/>' +
			'• Human- & LLM-readable.<br/>' +
			'• Perfect for API arrays/objects.<br/>' +
			'<a href="https://github.com/johannschopplich/toon" target="_blank">TOON Format Spec</a>',
		defaults: {
			name: 'TOON Encode',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		documentationUrl: 'https://github.com/TechupBusiness/n8n-nodes-toon-encode/blob/main/nodes/ToonEncode/ToonEncode.docs.md',
		properties: [
			// Data to Encode
			{
				displayName: 'Data to Encode',
				name: 'data',
				type: 'json',
				default: '={{ $json }}',
				description: '**JSON object/array** to encode.<br/>' +
					'• Drag from prior node: `={{ $json }}`<br/>' +
					'• Specific field: `={{ $json.results }}`<br/>' +
					'• Works on **any** JSON-serializable data',
				required: true,
				placeholder: '={{ $json }}',
			},
			// Output Field
			{
				displayName: 'Output Field',
				name: 'outputField',
				type: 'string',
				default: 'toon',
				description: '**Field name** for encoded TOON string.<br/>' +
					'• Adds/overwrites in output.<br/>' +
					'• e.g., `myToonData`',
				required: true,
			},
			// Options
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Indent',
						name: 'indent',
						type: 'number',
						default: 2,
						typeOptions: {
							minValue: 0,
							maxValue: 10,
						},
						description: 'Spaces per indentation level (0 = compact)',
					},
					{
						displayName: 'Array Delimiter',
						name: 'delimiter',
						type: 'options',
						default: ',',
						options: [
							{
								name: 'Comma (`,`)',
								value: ',',
							},
							{
								name: 'Tab',
								value: '\t',
							},
							{
								name: 'Pipe (`|`)',
								value: '|',
							},
						],
						description: 'Delimiter for tabular arrays',
					},
					{
						displayName: 'Length Markers',
						name: 'lengthMarker',
						type: 'boolean',
						default: false,
						description: 'Whether to prefix lengths: `items[#3]` → **LLM safer**',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			// Get params
			const data = this.getNodeParameter('data', i) as unknown;
			const outputField = this.getNodeParameter('outputField', i) as string;

			const optionsData = this.getNodeParameter('options', i, {}) as {
				indent?: number;
				delimiter?: ',' | '\t' | '|';
				lengthMarker?: boolean;
			};

			// Build EncodeOptions
			const options: EncodeOptions = {
				indent: optionsData.indent ?? 2,
				delimiter: optionsData.delimiter ?? ',',
				lengthMarker: optionsData.lengthMarker ? '#' : false,
			};

			try {
				// Encode
				const toon = encode(data, options);

				// Output: original + new field
				const newItem: INodeExecutionData = {
					json: {
						...items[i].json,
						[outputField]: toon,
					},
				};

				returnData.push(newItem);
			} catch (error) {
				// LLM-safe error
				throw new NodeOperationError(this.getNode(), error, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}