import { afterEach, describe, expect, it } from 'vitest';
import {
  MoodleConfigurationError,
  selectBackend,
} from './moodle-adapter.js';

const oldUrl = process.env.MOODLE_API_URL;
const oldToken = process.env.MOODLE_API_TOKEN;

afterEach(() => {
  process.env.MOODLE_API_URL = oldUrl;
  process.env.MOODLE_API_TOKEN = oldToken;
});

describe('Moodle backend selection', () => {
  it('uses simulator only when both live credentials are absent', () => {
    delete process.env.MOODLE_API_URL;
    delete process.env.MOODLE_API_TOKEN;
    expect(selectBackend()).toBe('simulator');
  });

  it('uses live only when URL and token are both present', () => {
    process.env.MOODLE_API_URL = 'https://moodle.example.test';
    process.env.MOODLE_API_TOKEN = 'test-token';
    expect(selectBackend()).toBe('live');
  });

  it('refuses a half-configured live connection instead of silently falling back', () => {
    process.env.MOODLE_API_URL = 'https://moodle.example.test';
    delete process.env.MOODLE_API_TOKEN;
    expect(() => selectBackend()).toThrow(MoodleConfigurationError);

    delete process.env.MOODLE_API_URL;
    process.env.MOODLE_API_TOKEN = 'test-token';
    expect(() => selectBackend()).toThrow(MoodleConfigurationError);
  });
});
