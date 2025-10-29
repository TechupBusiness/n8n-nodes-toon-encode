# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-29

### Added
- Initial release of n8n-nodes-toon-encode
- TOON Encode node for converting JSON to TOON format
- Support for encoding any JSON-serializable data (objects, arrays, primitives)
- Configurable indentation (0-10 spaces)
- Configurable array delimiters (comma, tab, pipe)
- Optional length markers for LLM safety
- Zero external dependencies for n8n Cloud compatibility
- Inlined TOON library code (v0.2.1) with proper MIT license attribution
- Full TypeScript type safety
- Comprehensive documentation and examples

### Features
- 40-60% token savings for LLM prompts
- Human-readable output format
- Compatible with n8n Cloud and self-hosted installations
- Expression support for dynamic data encoding
- Flexible output field naming

### Technical
- Built with TypeScript 5.9.2
- Follows n8n node development best practices
- Zero linter errors
- Fully typed with no `any` types
- Passes all build and lint checks

