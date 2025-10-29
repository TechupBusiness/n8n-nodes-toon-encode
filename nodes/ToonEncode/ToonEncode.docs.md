# TOON Encode Node Documentation

## Overview

The TOON Encode node converts JSON data into **TOON (Token-Oriented Object Notation)** format - a compact, human-readable format designed for Large Language Models (LLMs).

### Key Benefits
- 🎯 **40-60% token savings** for LLM prompts
- 📖 **Human-readable** output format
- 🤖 **LLM-optimized** for AI consumption
- ⚡ **Perfect for API responses** and data pipelines

## Parameters

### Data to Encode
The JSON data you want to convert to TOON format.

**Default:** `={{ $json }}`

**Examples:**
- Entire previous node output: `={{ $json }}`
- Specific field: `={{ $json.results }}`
- Multiple fields: `={{ { users: $json.users, count: $json.total } }}`

### Output Field
The field name where the TOON-encoded string will be stored in the output.

**Default:** `toon`

The encoded result will be added to your output data as `{ ...originalData, [outputField]: "encoded toon string" }`

## Options

### Indent
Number of spaces per indentation level.

- **Range:** 0-10
- **Default:** 2
- **Use 0 for compact output** (maximum token savings)
- **Use 2-4 for readable output**

**Example:**
```
Indent = 2:
users[2]{name,age}:
  Alice,30
  Bob,25

Indent = 0:
users[2]{name,age}:
Alice,30
Bob,25
```

### Array Delimiter
The delimiter used for tabular arrays and inline primitive arrays.

**Options:**
- **Comma (`,`)** - Default, most compact
- **Tab** - Better for spreadsheet-like data
- **Pipe (`|`)** - Good for visual separation

**Example:**
```
Comma: Alice,30,NYC
Tab:   Alice	30	NYC
Pipe:  Alice|30|NYC
```

### Length Markers
Whether to prefix array lengths with `#` for LLM safety.

- **Default:** `false`
- **Enable when:** Sending to LLMs for better array parsing

**Example:**
```
Without markers: users[2]{name,age}:
With markers:    users[#2]{name,age}:
```

## Examples

### Basic Usage

**Input Data:**
```json
{
  "users": [
    {"name": "Alice", "age": 30, "city": "NYC"},
    {"name": "Bob", "age": 25, "city": "LA"}
  ]
}
```

**TOON Output (in `toon` field):**
```
users[2]{name,age,city}:
  Alice,30,NYC
  Bob,25,LA
```

**Token Savings:** ~45% compared to JSON

### Use Case: API Response for LLM

1. **HTTP Request** node → Fetch data from API
2. **TOON Encode** node → Convert to TOON
3. **OpenAI** node → Send to ChatGPT with TOON data

**Before (JSON - 250 tokens):**
```json
{"products":[{"id":1,"name":"Laptop","price":999},{"id":2,"name":"Mouse","price":25}]}
```

**After (TOON - 140 tokens):**
```
products[2]{id,name,price}:
  1,Laptop,999
  2,Mouse,25
```

### Complex Data Example

**Input:**
```json
{
  "order": {
    "id": 12345,
    "items": [
      {"product": "Book", "qty": 2, "price": 15.99},
      {"product": "Pen", "qty": 5, "price": 2.50}
    ],
    "total": 44.48
  }
}
```

**TOON Output:**
```
order:
  id: 12345
  items[2]{product,qty,price}:
    Book,2,15.99
    Pen,5,2.5
  total: 44.48
```

## Best Practices

### 1. Choose the Right Indent
- Use `indent: 0` for maximum token savings in LLM prompts
- Use `indent: 2` for human-readable logs and debugging

### 2. Enable Length Markers for LLMs
When sending data to AI models, enable length markers:
```
Options → Add Option → Length Markers = true
```
This helps LLMs better understand array boundaries.

### 3. Select Appropriate Delimiter
- **Comma** (default): Best for most use cases
- **Tab**: When importing to spreadsheets
- **Pipe**: When data contains commas

### 4. Combine with Other Nodes

**Typical Workflow:**
```
HTTP Request → TOON Encode → OpenAI → Process Response
```

**Cost Savings Example:**
- Original API response: 5,000 tokens
- After TOON encoding: ~2,500 tokens
- **Savings:** ~$0.005 per request (with GPT-4)

## TOON Format Quick Reference

### Primitives
```
name: Alice
age: 30
active: true
```

### Arrays of Primitives
```
tags[3]: javascript,nodejs,api
```

### Tabular Arrays (Objects with same keys)
```
users[2]{name,age}:
  Alice,30
  Bob,25
```

### Nested Objects
```
user:
  profile:
    name: Alice
    email: alice@example.com
  settings:
    theme: dark
```

### Mixed Arrays
```
items[3]:
  - phone
  - 999
  - tags[2]: electronics,sale
```

## Troubleshooting

### Options Not Showing
Make sure to click **"Add Option"** to reveal available options.

### Output is Empty
Check that your input data is valid JSON. Use the expression editor to verify: `={{ $json }}`

### Data Looks Wrong
Verify the input data type. TOON works with:
- Objects: `{}`
- Arrays: `[]`
- Primitives: strings, numbers, booleans

## Resources

- [TOON Format Specification](https://github.com/johannschopplich/toon)
- [n8n Expression Documentation](https://docs.n8n.io/code-examples/expressions/)
- [Token Counting Tool](https://platform.openai.com/tokenizer)

## Version

Current version: 0.1.0

For updates and changelog, see the [GitHub repository](https://github.com/TechupBusiness/n8n-nodes-toon-encode).

