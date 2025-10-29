# n8n-nodes-toon-encode

This is an n8n community node that lets you encode JSON data into **TOON (Token-Oriented Object Notation)** format in your n8n workflows.

TOON is a token-efficient alternative to JSON designed specifically for Large Language Model (LLM) prompts. It reduces token usage by **40-60%** while remaining human-readable and LLM-friendly.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

**Table of Contents**
- [n8n-nodes-toon-encode](#n8n-nodes-toon-encode)
  - [Installation](#installation)
  - [Features](#features)
  - [Operations](#operations)
    - [TOON Encode](#toon-encode)
  - [Compatibility](#compatibility)
  - [Usage](#usage)
    - [Basic Example](#basic-example)
    - [Use Cases](#use-cases)
    - [Tips](#tips)
  - [Development \& Testing](#development--testing)
  - [Resources](#resources)
  - [License](#license)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

**Community Node Name:** `n8n-nodes-toon-encode`

Or install via npm in your n8n installation:
```bash
npm install n8n-nodes-toon-encode
```

## Features

✅ **Token Savings**: Reduce LLM token usage by 40-60%  
✅ **Human-Readable**: Easy to read and understand  
✅ **LLM-Optimized**: Designed for AI/LLM consumption  
✅ **No Dependencies**: Works on n8n Cloud and self-hosted  
✅ **Flexible Output**: Configurable indentation, delimiters, and length markers  
✅ **Perfect for APIs**: Efficiently encode API responses for LLM processing

## Operations

### TOON Encode

Encodes JSON data (objects, arrays, or any JSON-serializable data) into TOON format.

**Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| Data to Encode | JSON | The JSON data to encode. Can be `={{ $json }}` or any expression | `={{ $json }}` |
| Output Field | String | Field name where the encoded TOON string will be stored | `toon` |

**Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| Indent | Number (0-10) | Spaces per indentation level. Use 0 for compact output | `2` |
| Array Delimiter | Choice | Delimiter for tabular arrays: Comma (`,`), Tab, or Pipe (`\|`) | `,` |
| Length Markers | Boolean | Whether to prefix array lengths with `#` for LLM safety | `false` |

## Compatibility

- **Minimum n8n version:** 1.0.0
- **Tested with:** n8n 1.x
- **Works on:** n8n Cloud and self-hosted installations

This node has **no external dependencies** and is fully compatible with n8n Cloud.

## Usage

### Basic Example

1. Add the **TOON Encode** node to your workflow
2. Connect it after a node that outputs JSON data
3. The encoded TOON data will be available in the specified output field

**Example Input:**
```json
{
  "users": [
    {"name": "Alice", "age": 30, "city": "NYC"},
    {"name": "Bob", "age": 25, "city": "LA"}
  ]
}
```

**Example Output (in `toon` field):**
```
users[2]{name,age,city}:
  Alice,30,NYC
  Bob,25,LA
```

### Use Cases

1. **LLM Prompts**: Reduce costs by encoding API responses before sending to OpenAI/Anthropic
2. **Data Transformation**: Convert verbose JSON to compact, readable format
3. **Logging**: Create human-friendly logs from complex data structures
4. **API Integration**: Prepare data efficiently for LLM-based processing

### Tips

- Use `={{ $json }}` to encode the entire output from the previous node
- Use `={{ $json.results }}` to encode a specific field
- Set **Indent** to `0` for maximum token savings (compact format)
- Enable **Length Markers** when passing arrays to LLMs for better reliability

## Development & Testing

This node is tested against the [official TOON test suite](https://github.com/johannschopplich/toon/tree/main/test) to ensure 100% spec compliance.

**Run Tests:**
```bash
npm install
npm run build
npm test
```

See [test/README.md](test/README.md) for comprehensive testing documentation.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [TOON Format Documentation](https://github.com/johannschopplich/toon)
- [TOON Specification & Examples](https://github.com/johannschopplich/toon#readme)

## License

This node includes inlined code from the [TOON library](https://github.com/johannschopplich/toon) by Johann Schopplich, licensed under MIT.

MIT License - See LICENSE file for details.
