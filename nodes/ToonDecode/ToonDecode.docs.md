# TOON Decode Node Documentation

## Overview

The TOON Decode node converts **TOON (Token-Oriented Object Notation)** format back into standard JSON data structures. This is the reverse operation of the TOON Encode node.

### Key Benefits
- 🔄 **Perfect reversal** - Decode TOON back to original JSON
- 🤖 **LLM-friendly** - Process AI-generated TOON responses
- 📊 **Type preservation** - Maintains strings, numbers, booleans, null
- ⚡ **Fast parsing** - Efficient scanner and parser implementation

## Parameters

### TOON Data
The TOON-formatted string you want to convert back to JSON.

**Default:** `={{ $json.toon }}`

**Examples:**
- From previous TOON Encode node: `={{ $json.toon }}`
- From LLM response: `={{ $json.response }}`
- From API field: `={{ $json.data.toonFormat }}`

### Output Field
The field name where the decoded JSON data will be stored in the output.

**Default:** `data`

The decoded result will be added to your output data as `{ ...originalData, [outputField]: decodedJsonValue }`

## Options

### Strict Mode
Enable strict parsing mode for better error detection.

- **Default:** `false`
- **When enabled:** Parser will fail immediately on malformed TOON
- **When disabled:** Parser attempts to be lenient with minor formatting issues

## Examples

### Basic Decoding

**Input TOON (in `toon` field):**
```
users[2]{name,age,city}:
  Alice,30,NYC
  Bob,25,LA
```

**Decoded JSON Output (in `data` field):**
```json
{
  "users": [
    {"name": "Alice", "age": 30, "city": "NYC"},
    {"name": "Bob", "age": 25, "city": "LA"}
  ]
}
```

### Use Case: Processing LLM Responses

**Workflow:**
1. **OpenAI** node → Ask LLM to generate data in TOON format
2. **TOON Decode** node → Convert TOON response to JSON
3. **Process** → Use decoded JSON data in your workflow

**Example Prompt:**
```
"Generate a list of products in TOON format with fields: id, name, price"
```

**LLM Response (TOON):**
```
products[3]{id,name,price}:
  1,Laptop,999
  2,Mouse,25
  3,Keyboard,75
```

**After TOON Decode:**
```json
{
  "products": [
    {"id": 1, "name": "Laptop", "price": 999},
    {"id": 2, "name": "Mouse", "price": 25},
    {"id": 3, "name": "Keyboard", "price": 75}
  ]
}
```

### Complex Data Example

**Input TOON:**
```
order:
  id: 12345
  items[2]{product,qty,price}:
    Book,2,15.99
    Pen,5,2.5
  total: 44.48
```

**Decoded JSON:**
```json
{
  "order": {
    "id": 12345,
    "items": [
      {"product": "Book", "qty": 2, "price": 15.99},
      {"product": "Pen", "qty": 5, "price": 2.5}
    ],
    "total": 44.48
  }
}
```

## TOON Format Support

The decoder supports all TOON format features:

### Primitives
```
name: Alice
age: 30
active: true
score: null
```
↓
```json
{
  "name": "Alice",
  "age": 30,
  "active": true,
  "score": null
}
```

### Arrays of Primitives
```
tags[3]: javascript,nodejs,api
```
↓
```json
{
  "tags": ["javascript", "nodejs", "api"]
}
```

### Tabular Arrays
```
users[2]{name,age}:
  Alice,30
  Bob,25
```
↓
```json
{
  "users": [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 25}
  ]
}
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
↓
```json
{
  "user": {
    "profile": {
      "name": "Alice",
      "email": "alice@example.com"
    },
    "settings": {
      "theme": "dark"
    }
  }
}
```

### Mixed Arrays (List Format)
```
items[3]:
  - phone
  - 999
  - tags[2]: electronics,sale
```
↓
```json
{
  "items": [
    "phone",
    999,
    {"tags": ["electronics", "sale"]}
  ]
}
```

### Alternative Delimiters

The decoder automatically detects and handles different delimiters:

**Tab delimiter:**
```
users[2	]{name	age	city}:
  Alice	30	NYC
  Bob	25	LA
```

**Pipe delimiter:**
```
users[2|]{name|age|city}:
  Alice|30|NYC
  Bob|25|LA
```

### Length Markers

Length markers (with `#`) are automatically handled:
```
items[#3]: apple,banana,orange
```

## Best Practices

### 1. Validate TOON Input

When receiving TOON from external sources (like LLMs), consider enabling strict mode:
```
Options → Add Option → Strict Mode = true
```

### 2. Handle Decode Errors

Wrap the TOON Decode node in an error workflow to catch malformed TOON:
```
TOON Decode → [On Error] → Log & Notify
```

### 3. Combine with Encode for Round-trip

**Test your encoding/decoding:**
```
Original Data → TOON Encode → TOON Decode → Compare
```

This ensures data integrity through the encode/decode cycle.

### 4. Use with LLMs

**Instruct LLMs to use TOON format:**
```
Prompt: "Return the data in TOON format with these fields: [...]"
```

Then decode the response with this node.

## Typical Workflows

### Workflow 1: Encode → Store → Decode
```
HTTP Request → TOON Encode → Database Store
↓
Database Retrieve → TOON Decode → Process JSON
```

### Workflow 2: LLM Data Generation
```
OpenAI (generate TOON) → TOON Decode → Validate → Save
```

### Workflow 3: API with TOON Support
```
Webhook (TOON format) → TOON Decode → Business Logic → Response
```

## Supported Data Types

| TOON | JSON | Example |
|------|------|---------|
| `name: Alice` | `{"name": "Alice"}` | String |
| `age: 30` | `{"age": 30}` | Number |
| `active: true` | `{"active": true}` | Boolean |
| `value: null` | `{"value": null}` | Null |
| `"quoted": "with spaces"` | `{"quoted": "with spaces"}` | Quoted string |
| `items[2]: a,b` | `{"items": ["a","b"]}` | Array |
| `data:` | `{"data": {}}` | Empty object |

## Troubleshooting

### "Failed to decode TOON"

**Cause:** Malformed TOON input

**Solutions:**
1. Check the TOON format is valid
2. Verify there are no syntax errors
3. Enable strict mode to get more detailed error messages

### "Unexpected output structure"

**Cause:** TOON might be using different delimiters or formats

**Solutions:**
1. Check for tab or pipe delimiters in the TOON
2. Verify indentation is consistent
3. Look for length markers (`#`)

### "Empty or null result"

**Cause:** TOON input was empty or whitespace-only

**Solutions:**
1. Verify the input field contains TOON data
2. Check the expression `={{ $json.toon }}` points to correct field
3. Ensure previous node outputs TOON data

## Type Conversion Rules

The decoder automatically converts TOON values to appropriate JSON types:

1. **Numbers**: `123`, `45.67`, `-99`, `1.23e10`
2. **Booleans**: `true`, `false`
3. **Null**: `null`
4. **Strings**: Everything else, or quoted values like `"text"`

**Example:**
```
TOON: id: 123
→ JSON: {"id": 123} (number)

TOON: id: "123"
→ JSON: {"id": "123"} (string)
```

## String Escape Sequences

The decoder handles these escape sequences in quoted strings:

- `\"` → `"`
- `\\` → `\`
- `\n` → newline
- `\r` → carriage return
- `\t` → tab

**Example:**
```
TOON: message: "Line 1\nLine 2"
→ JSON: {"message": "Line 1\nLine 2"}
```

## Indentation Handling

The decoder is flexible with indentation:
- Accepts spaces or tabs
- Tabs are treated as 4 spaces
- Consistent indentation is recommended but not strictly required

## Resources

- [TOON Format Specification](https://github.com/johannschopplich/toon)
- [n8n Expression Documentation](https://docs.n8n.io/code-examples/expressions/)
- [Original TOON Library](https://github.com/johannschopplich/toon)

## Version

Current version: 0.1.0
TOON decoder: v0.4.1

### Decoder Features
- **Scanner**: Tokenizes TOON input line-by-line
- **Parser**: Builds JSON structure from tokens
- **Delimiter detection**: Automatic detection of `,`, tab, or `|`
- **Type inference**: Smart conversion to numbers, booleans, null
- **Escape handling**: Full support for string escape sequences

## Advanced Usage

### Detecting TOON Format

Before decoding, you can check if data is in TOON format:

```javascript
// In Code node
const input = $input.item.json.data;
const isTOON = typeof input === 'string' && 
               (input.includes('[') && input.includes(']:'));
```

### Partial TOON Parsing

If you have mixed content (some TOON, some JSON), process it conditionally:

```javascript
// In Code node
const data = $input.item.json.data;
if (data.startsWith('users[')) {
  // Route to TOON Decode node
} else {
  // Process as regular JSON
}
```

## Performance

- **Parsing speed**: Optimized for medium to large TOON documents
- **Memory usage**: Efficient token-based parsing
- **Recommended**: Works well with TOON strings up to several MB

## Comparison with JSON.parse()

| Feature | TOON Decode | JSON.parse() |
|---------|------------|--------------|
| **Compact format** | ✅ Yes | ❌ No |
| **Human-readable** | ✅ Yes | ⚠️ Somewhat |
| **LLM-friendly** | ✅ Yes | ⚠️ Verbose |
| **Standard** | ⚠️ TOON spec | ✅ RFC 8259 |
| **Token savings** | ✅ 40-60% | ❌ Baseline |

For updates and changelog, see the [GitHub repository](https://github.com/TechupBusiness/n8n-nodes-toon-encode).

