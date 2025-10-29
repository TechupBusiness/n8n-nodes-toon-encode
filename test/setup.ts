/**
 * Test Setup: Export encode and decode functions from shared library
 * This allows tests to run directly with vitest without building first
 */

export { encode, decode } from '../src/toon-lib';

