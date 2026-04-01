import { describe, it, expect } from 'vitest';
import { matchDescription, DESCRIPTION_MATCH_THRESHOLD } from '../router/description-matcher.js';

describe('matchDescription', () => {
  it('returns 1.0 for identical descriptions', () => {
    const score = matchDescription('referral matching', 'referral matching');
    expect(score).toBe(1.0);
  });

  it('returns high score for significant overlap', () => {
    const score = matchDescription(
      'Referral matching algorithm and state machine',
      'Updating the referral matching algorithm'
    );
    expect(score).toBeGreaterThan(DESCRIPTION_MATCH_THRESHOLD);
  });

  it('returns 0 for no overlap', () => {
    const score = matchDescription('Database migration tools', 'UI component styling');
    expect(score).toBe(0);
  });

  it('is case insensitive', () => {
    const score = matchDescription('REFERRAL MATCHING', 'referral matching');
    expect(score).toBe(1.0);
  });

  it('handles punctuation in tokenization', () => {
    const score = matchDescription('state-machine (referral)', 'referral state machine');
    expect(score).toBeGreaterThan(0.5);
  });

  it('returns 0 for empty strings', () => {
    expect(matchDescription('', 'something')).toBe(0);
    expect(matchDescription('something', '')).toBe(0);
  });
});
