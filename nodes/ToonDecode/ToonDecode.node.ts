import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { decode, type DecodeOptions } from '../../src/toon-lib';

export class ToonDecode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TOON Decode',
		name: 'toonDecode',
		icon: { light: 'file:toon.svg', dark: 'file:toon.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["outputField"]}}',
		description: '**Decode TOON → JSON**<br/>' +
			'• Converts **TOON format back to JSON**.<br/>' +
			'• Preserves data structure & types.<br/>' +
			'• Perfect for processing LLM outputs.<br/>' +
			'<a href="https://github.com/johannschopplich/toon" target="_blank">TOON Format Spec</a>',
		defaults: {
			name: 'TOON Decode',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		documentationUrl: 'https://github.com/TechupBusiness/n8n-nodes-toon-encode/blob/main/nodes/ToonDecode/ToonDecode.docs.md',
		properties: [
			// TOON Data to Decode
			{
				displayName: 'TOON Data',
				name: 'toonData',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '={{ $json.toon }}',
				description: '**TOON-formatted string** to decode.<br/>' +
					'• From prior node: `={{ $json.toon }}`<br/>' +
					'• Specific field: `={{ $json.response }}`<br/>' +
					'• Converts TOON back to JSON',
				required: true,
				placeholder: '={{ $json.toon }}',
			},
			// Output Field
			{
				displayName: 'Output Field',
				name: 'outputField',
				type: 'string',
				default: 'data',
				description: '**Field name** for decoded JSON data.<br/>' +
					'• Adds/overwrites in output.<br/>' +
					'• e.g., `decoded`, `jsonData`',
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
						displayName: 'Strict Mode',
						name: 'strict',
						type: 'boolean',
						default: false,
						description: 'Whether to enable strict parsing (will fail on malformed TOON)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// Get params
				const toonData = this.getNodeParameter('toonData', i) as string;
				const outputField = this.getNodeParameter('outputField', i) as string;

				const optionsData = this.getNodeParameter('options', i, {}) as {
					strict?: boolean;
				};

				// Build DecodeOptions
				const options: DecodeOptions = {
					strict: optionsData.strict ?? false,
				};

				// Decode
				const decoded = decode(toonData, options);

				// Output: original + new field
				const newItem: INodeExecutionData = {
					json: {
						...items[i].json,
						[outputField]: decoded,
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

