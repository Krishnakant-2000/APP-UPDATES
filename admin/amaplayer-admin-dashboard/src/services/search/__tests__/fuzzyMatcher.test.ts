/**
 * Unit Tests for FuzzyMatcher
 * Tests fuzzy matching algorithm with Levenshtein distance
 * Requirements tested: 1.2 (fuzzy matching with up to 2 character differences)
 */

import { fuzzyMatcher, strictMatcher, relaxedMatcher, exactMatcher, FuzzyMatcher } from '../fuzzyMatcher';

describe('FuzzyMatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Levenshtein Distance Calculation', () => {
    it('should calculate correct distance for identical strings', () => {
      const distance = fuzzyMatcher.calculateDistance('hello', 'hello');
      expect(distance).toBe(0);
    });

    it('should calculate correct distance for single character difference', () => {
      const distance = fuzzyMatcher.calculateDistance('hello', 'hallo');
      expect(distance).toBe(1);
    });

    it('should calculate correct distance for two character differences', () => {
      const distance = fuzzyMatcher.calculateDistance('hello', 'hallo');
      expect(distance).toBe(1);
      
      const distance2 = fuzzyMatcher.calculateDistance('hello', 'hxllo');
      expect(distance2).toBe(1);
      
      const distance3 = fuzzyMatcher.calculateDistance('hello', 'hxlly');
      expect(distance3).toBe(2);
    });

    it('should handle empty strings', () => {
      expect(fuzzyMatcher.calculateDistance('', '')).toBe(0);
      expect(fuzzyMatcher.calculateDistance('hello', '')).toBe(5);
      expect(fuzzyMatcher.calculateDistance('', 'hello')).toBe(5);
    });

    it('should be case insensitive by default', () => {
      const distance = fuzzyMatcher.calculateDistance('Hello', 'hello');
      expect(distance).toBe(0);
    });

    it('should respect case sensitivity when configured', () => {
      const caseSensitiveMatcher = new FuzzyMatcher({ caseSensitive: true, maxDistance: 2, threshold: 0.6 });
      const distance = caseSensitiveMatcher.calculateDistance('Hello', 'hello');
      expect(distance).toBe(1);
    });
  });

  describe('Similarity Score Calculation', () => {
    it('should return 1.0 for identical strings', () => {
      const score = fuzzyMatcher.calculateSimilarity('hello', 'hello');
      expect(score).toBe(1.0);
    });

    it('should return score between 0 and 1 for similar strings', () => {
      const score = fuzzyMatcher.calculateSimilarity('hello', 'hallo');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
      expect(score).toBe(0.8); // 1 - (1/5)
    });

    it('should return lower scores for more different strings', () => {
      const score1 = fuzzyMatcher.calculateSimilarity('hello', 'hallo');
      const score2 = fuzzyMatcher.calculateSimilarity('hello', 'world');
      expect(score1).toBeGreaterThan(score2);
    });

    it('should handle empty strings', () => {
      expect(fuzzyMatcher.calculateSimilarity('', '')).toBe(1.0);
      expect(fuzzyMatcher.calculateSimilarity('hello', '')).toBe(0);
    });
  });

  describe('Fuzzy Matching', () => {
    it('should match strings within distance threshold', () => {
      const result = fuzzyMatcher.isMatch('john', 'johm');
      expect(result.match).toBe(true);
      expect(result.distance).toBe(1);
      expect(result.score).toBeGreaterThan(0.6);
    });

    it('should not match strings exceeding distance threshold', () => {
      const result = fuzzyMatcher.isMatch('john', 'mary');
      expect(result.match).toBe(false);
    });

    it('should match exact strings', () => {
      const result = fuzzyMatcher.isMatch('athlete', 'athlete');
      expect(result.match).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.distance).toBe(0);
    });

    it('should handle user names with typos (requirement 1.2)', () => {
      // Test cases for user name fuzzy matching
      const testCases = [
        { query: 'john', target: 'johm', shouldMatch: true },
        { query: 'smith', target: 'smyth', shouldMatch: true },
        { query: 'alice', target: 'alise', shouldMatch: true },
        { query: 'bob', target: 'robert', shouldMatch: false }, // Too different
      ];

      testCases.forEach(({ query, target, shouldMatch }) => {
        const result = fuzzyMatcher.isMatch(query, target);
        expect(result.match).toBe(shouldMatch);
      });
    });

    it('should handle video titles with typos (requirement 1.2)', () => {
      const testCases = [
        { query: 'soccer', target: 'socer', shouldMatch: true },
        { query: 'basketball', target: 'basketbal', shouldMatch: true },
        { query: 'training', target: 'trainig', shouldMatch: true },
      ];

      testCases.forEach(({ query, target, shouldMatch }) => {
        const result = fuzzyMatcher.isMatch(query, target);
        expect(result.match).toBe(shouldMatch);
      });
    });
  });

  describe('Specialized Matchers', () => {
    it('should have strict matcher with tighter constraints', () => {
      const result1 = strictMatcher.isMatch('hello', 'hallo');
      const result2 = fuzzyMatcher.isMatch('hello', 'hallo');
      
      expect(strictMatcher.getOptions().maxDistance).toBe(1);
      expect(strictMatcher.getOptions().threshold).toBe(0.8);
      expect(result1.match).toBe(true); // Should still match with 1 character diff
    });

    it('should have relaxed matcher with looser constraints', () => {
      const result = relaxedMatcher.isMatch('hello', 'hxlxy');
      expect(relaxedMatcher.getOptions().maxDistance).toBe(3);
      expect(relaxedMatcher.getOptions().threshold).toBe(0.4);
      expect(result.match).toBe(true); // Should match with more differences
    });

    it('should have exact matcher for precise matching', () => {
      const result1 = exactMatcher.isMatch('hello', 'hello');
      const result2 = exactMatcher.isMatch('hello', 'hallo');
      
      expect(exactMatcher.getOptions().maxDistance).toBe(0);
      expect(exactMatcher.getOptions().threshold).toBe(1.0);
      expect(result1.match).toBe(true);
      expect(result2.match).toBe(false);
    });
  });

  describe('Array Matching', () => {
    it('should find matches in array of strings', () => {
      const targets = ['john', 'jane', 'bob', 'alice'];
      const matches = fuzzyMatcher.findMatches('jon', targets);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].target).toBe('john');
      expect(matches[0].result.match).toBe(true);
    });

    it('should sort matches by score', () => {
      const targets = ['john', 'johny', 'jon'];
      const matches = fuzzyMatcher.findMatches('john', targets);
      
      expect(matches[0].target).toBe('john'); // Exact match first
      expect(matches[0].result.score).toBe(1.0);
      expect(matches[1].result.score).toBeLessThan(1.0);
    });

    it('should return empty array when no matches found', () => {
      const targets = ['alice', 'bob', 'charlie'];
      const matches = fuzzyMatcher.findMatches('xyz', targets);
      expect(matches).toHaveLength(0);
    });
  });

  describe('Object Search', () => {
    interface TestUser {
      id: string;
      name: string;
      email: string;
      bio?: string;
    }

    const testUsers: TestUser[] = [
      { id: '1', name: 'John Doe', email: 'john@example.com', bio: 'Athlete' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', bio: 'Coach' },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
    ];

    it('should search objects by specified fields', () => {
      const results = fuzzyMatcher.searchObjects('jon', testUsers, ['name', 'email']);
      
      expect(results).toHaveLength(2); // John Doe and Bob Johnson
      expect(results[0].object.name).toBe('John Doe');
      expect(results[1].object.name).toBe('Bob Johnson');
    });

    it('should return matches with field information', () => {
      const results = fuzzyMatcher.searchObjects('john', testUsers, ['name', 'email']);
      
      expect(results[0].matches).toHaveLength(2); // name and email matches
      expect(results[0].matches[0].field).toBe('name');
      expect(results[0].matches[1].field).toBe('email');
    });

    it('should sort results by best match score', () => {
      const results = fuzzyMatcher.searchObjects('john', testUsers, ['name', 'email']);
      
      // John Doe should be first (exact name match)
      expect(results[0].object.name).toBe('John Doe');
      // Bob Johnson should be second (partial email match)
      expect(results[1].object.name).toBe('Bob Johnson');
    });

    it('should handle missing fields gracefully', () => {
      const results = fuzzyMatcher.searchObjects('athlete', testUsers, ['bio']);
      
      expect(results).toHaveLength(1);
      expect(results[0].object.name).toBe('John Doe');
    });
  });

  describe('Boolean Query Support', () => {
    it('should detect boolean operators', () => {
      expect(fuzzyMatcher.hasBooleanOperators('john AND jane')).toBe(true);
      expect(fuzzyMatcher.hasBooleanOperators('john OR jane')).toBe(true);
      expect(fuzzyMatcher.hasBooleanOperators('NOT john')).toBe(true);
      expect(fuzzyMatcher.hasBooleanOperators('john && jane')).toBe(true);
      expect(fuzzyMatcher.hasBooleanOperators('john || jane')).toBe(true);
      expect(fuzzyMatcher.hasBooleanOperators('!john')).toBe(true);
      expect(fuzzyMatcher.hasBooleanOperators('simple query')).toBe(false);
    });

    it('should parse boolean queries', () => {
      const parsed = fuzzyMatcher.parseBooleanQuery('john AND jane OR bob');
      
      expect(parsed.terms).toEqual(['john', 'jane', 'bob']);
      expect(parsed.operators).toEqual(['AND', 'OR']);
      expect(parsed.structure).toBe('john AND jane OR bob');
    });

    it('should handle complex boolean queries', () => {
      const parsed = fuzzyMatcher.parseBooleanQuery('athlete AND (basketball OR soccer) NOT beginner');
      
      expect(parsed.terms).toContain('athlete');
      expect(parsed.operators).toContain('AND');
      expect(parsed.operators).toContain('NOT');
    });
  });

  describe('Suggestion Generation', () => {
    it('should generate suggestions from dictionary', () => {
      const dictionary = ['john', 'jane', 'bob', 'alice', 'charlie'];
      const suggestions = fuzzyMatcher.generateSuggestions('jo', dictionary, 3);
      
      expect(suggestions).toContain('john');
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for empty query', () => {
      const dictionary = ['john', 'jane', 'bob'];
      const suggestions = fuzzyMatcher.generateSuggestions('', dictionary);
      expect(suggestions).toEqual([]);
    });

    it('should limit suggestions to maxSuggestions', () => {
      const dictionary = ['john', 'johnny', 'jonathan', 'jones', 'johnson'];
      const suggestions = fuzzyMatcher.generateSuggestions('jo', dictionary, 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Text Highlighting', () => {
    it('should highlight exact matches', () => {
      const highlighted = fuzzyMatcher.highlightMatches('john', 'john doe athlete');
      expect(highlighted).toContain('<mark>');
      expect(highlighted).toContain('</mark>');
    });

    it('should use custom highlight tag', () => {
      const highlighted = fuzzyMatcher.highlightMatches('john', 'john doe', 'strong');
      expect(highlighted).toContain('<strong>');
      expect(highlighted).toContain('</strong>');
    });

    it('should return original text for non-matches', () => {
      const text = 'alice smith';
      const highlighted = fuzzyMatcher.highlightMatches('john', text);
      expect(highlighted).toBe(text);
    });

    it('should handle case insensitive highlighting', () => {
      const highlighted = fuzzyMatcher.highlightMatches('JOHN', 'john doe');
      expect(highlighted).toContain('<mark>');
    });
  });

  describe('Configuration Updates', () => {
    it('should update options correctly', () => {
      const matcher = new FuzzyMatcher();
      const originalOptions = matcher.getOptions();
      
      matcher.updateOptions({ maxDistance: 5, threshold: 0.3 });
      const updatedOptions = matcher.getOptions();
      
      expect(updatedOptions.maxDistance).toBe(5);
      expect(updatedOptions.threshold).toBe(0.3);
      expect(updatedOptions.caseSensitive).toBe(originalOptions.caseSensitive);
    });

    it('should preserve unchanged options', () => {
      const matcher = new FuzzyMatcher({ caseSensitive: true, maxDistance: 2, threshold: 0.8 });
      
      matcher.updateOptions({ threshold: 0.5 });
      const options = matcher.getOptions();
      
      expect(options.caseSensitive).toBe(true);
      expect(options.maxDistance).toBe(2);
      expect(options.threshold).toBe(0.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const longString1 = 'a'.repeat(1000);
      const longString2 = 'a'.repeat(999) + 'b';
      
      const result = fuzzyMatcher.isMatch(longString1, longString2);
      expect(result.distance).toBe(1);
    });

    it('should handle special characters', () => {
      const result = fuzzyMatcher.isMatch('user@domain.com', 'user@domain.co');
      expect(result.match).toBe(true);
    });

    it('should handle unicode characters', () => {
      const result = fuzzyMatcher.isMatch('café', 'cafe');
      expect(result.distance).toBeGreaterThan(0);
    });

    it('should handle numbers in strings', () => {
      const result = fuzzyMatcher.isMatch('user123', 'user124');
      expect(result.match).toBe(true);
      expect(result.distance).toBe(1);
    });
  });
});