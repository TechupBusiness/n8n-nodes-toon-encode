import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { encode, type EncodeOptions } from '../../src/toon-lib';

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