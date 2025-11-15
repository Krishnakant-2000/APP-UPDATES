/**
 * Unit Tests for SearchQueryUtils
 * Tests search query manipulation and compatibility utilities
 * Requirements tested: 2.4, 2.5 (saved search compatibility and restoration)
 */

import SearchQueryUtils from '../searchQueryUtils';
import { SearchQuery, SearchFilters } from '@/types/models/search';

describe('SearchQueryUtils', () => {
  const mockSearchQuery: SearchQuery = {
    term: 'test search',
    searchType: 'users',
    filters: {
      role: ['athlete', 'coach'],
      status: ['active'],
      location: 'New York',
      sport: 'Basketball',
      ageRange: { min: 18, max: 30 },
      dateRange: {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31'),
        field: 'createdAt'
      }
    },
    limit: 20,
    fuzzyMatching: true
  };

  describe('areQueriesEquivalent', () => {
    it('should return true for identical queries', () => {
      const query1 = { ...mockSearchQuery };
      const query2 = { ...mockSearchQuery };
      
      expect(SearchQueryUtils.areQueriesEquivalent(query1, query2)).toBe(true);
    });

    it('should return false for different terms', () => {
      const query1 = { ...mockSearchQuery };
      const query2 = { ...mockSearchQuery, term: 'different term' };
      
      expect(SearchQueryUtils.areQueriesEquivalent(query1, query2)).toBe(false);
    });

    it('should return false for different search types', () => {
      const query1 = { ...mockSearchQuery };
      const query2 = { ...mockSearchQuery, searchType: 'videos' as const };
      
      expect(SearchQueryUtils.areQueriesEquivalent(query1, query2)).toBe(false);
    });

    it('should return false for different filters', () => {
      const query1 = { ...mockSearchQuery };
      const query2 = { 
        ...mockSearchQuery, 
        filters: { ...mockSearchQuery.filters, location: 'Los Angeles' }
      };
      
      expect(SearchQueryUtils.areQueriesEquivalent(query1, query2)).toBe(false);
    });
  });

  describe('areFiltersEquivalent', () => {
    it('should return true for identical filters', () => {
      const filters1 = { ...mockSearchQuery.filters };
      const filters2 = { ...mockSearchQuery.filters };
      
      expect(SearchQueryUtils.areFiltersEquivalent(filters1, filters2)).toBe(true);
    });

    it('should return false for different array filters', () => {
      const filters1: SearchFilters = { role: ['athlete', 'coach'] };
      const filters2: SearchFilters = { role: ['athlete'] };
      
      expect(SearchQueryUtils.areFiltersEquivalent(filters1, filters2)).toBe(false);
    });

    it('should return false for different date ranges', () => {
      const filters1: SearchFilters = {
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31'),
          field: 'createdAt'
        }
      };
      const filters2: SearchFilters = {
        dateRange: {
          start: new Date('2023-02-01'),
          end: new Date('2023-12-31'),
          field: 'createdAt'
        }
      };
      
      expect(SearchQueryUtils.areFiltersEquivalent(filters1, filters2)).toBe(false);
    });

    it('should return false for different age ranges', () => {
      const filters1: SearchFilters = { ageRange: { min: 18, max: 30 } };
      const filters2: SearchFilters = { ageRange: { min: 20, max: 30 } };
      
      expect(SearchQueryUtils.areFiltersEquivalent(filters1, filters2)).toBe(false);
    });

    it('should handle null and undefined values', () => {
      const filters1: SearchFilters = { location: undefined };
      const filters2: SearchFilters = { location: null as any };
      
      expect(SearchQueryUtils.areFiltersEquivalent(filters1, filters2)).toBe(false);
    });
  });

  describe('mergeQueries', () => {
    it('should merge queries with override taking precedence', () => {
      const baseQuery: SearchQuery = {
        term: 'base term',
        searchType: 'users',
        filters: { role: ['athlete'] },
        limit: 10
      };

      const overrideQuery: Partial<SearchQuery> = {
        term: 'override term',
        filters: { status: ['active'] },
        limit: 20
      };

      const merged = SearchQueryUtils.mergeQueries(baseQuery, overrideQuery);

      expect(merged.term).toBe('override term');
      expect(merged.searchType).toBe('users');
      expect(merged.limit).toBe(20);
      expect(merged.filters.role).toEqual(['athlete']);
      expect(merged.filters.status).toEqual(['active']);
    });

    it('should handle empty override', () => {
      const baseQuery = { ...mockSearchQuery };
      const merged = SearchQueryUtils.mergeQueries(baseQuery, {});

      expect(merged).toEqual(baseQuery);
    });
  });

  describe('sanitizeQuery', () => {
    it('should sanitize and set defaults for query', () => {
      const messyQuery: SearchQuery = {
        term: '  test search  ',
        searchType: 'users',
        filters: {},
        limit: 200, // Should be capped at 100
        offset: -5, // Should be set to 0
        fuzzyMatching: undefined as any
      };

      const sanitized = SearchQueryUtils.sanitizeQuery(messyQuery);

      expect(sanitized.term).toBe('test search');
      expect(sanitized.limit).toBe(100);
      expect(sanitized.offset).toBe(0);
      expect(sanitized.fuzzyMatching).toBe(true);
      expect(sanitized.sortBy).toBe('relevance');
      expect(sanitized.sortOrder).toBe('desc');
    });

    it('should sanitize filters', () => {
      const queryWithFilters: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['athlete', 'athlete', 'coach'], // Should remove duplicates
          location: '  New York  ', // Should trim
          ageRange: { min: -5, max: 200 }, // Should clamp values
          dateRange: {
            start: new Date('2023-01-01'),
            end: new Date('2023-12-31'),
            field: 'createdAt'
          }
        }
      };

      const sanitized = SearchQueryUtils.sanitizeQuery(queryWithFilters);

      expect(sanitized.filters.role).toEqual(['athlete', 'coach']);
      expect(sanitized.filters.location).toBe('New York');
      expect(sanitized.filters.ageRange?.min).toBe(0);
      expect(sanitized.filters.ageRange?.max).toBe(150);
    });

    it('should handle missing searchType', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: undefined as any,
        filters: {}
      };

      const sanitized = SearchQueryUtils.sanitizeQuery(query);
      expect(sanitized.searchType).toBe('all');
    });
  });

  describe('hasActiveFilters', () => {
    it('should return true when filters are present', () => {
      expect(SearchQueryUtils.hasActiveFilters(mockSearchQuery)).toBe(true);
    });

    it('should return false when no filters are present', () => {
      const queryWithoutFilters: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {}
      };

      expect(SearchQueryUtils.hasActiveFilters(queryWithoutFilters)).toBe(false);
    });

    it('should return false when filters are empty arrays or strings', () => {
      const queryWithEmptyFilters: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: [],
          location: '',
          sport: '   '
        }
      };

      expect(SearchQueryUtils.hasActiveFilters(queryWithEmptyFilters)).toBe(false);
    });
  });

  describe('getQueryDescription', () => {
    it('should generate description for query with term and filters', () => {
      const description = SearchQueryUtils.getQueryDescription(mockSearchQuery);
      expect(description).toContain('"test search"');
      expect(description).toContain('in users');
      expect(description).toContain('filter');
    });

    it('should handle query with only term', () => {
      const query: SearchQuery = {
        term: 'test search',
        searchType: 'all',
        filters: {}
      };

      const description = SearchQueryUtils.getQueryDescription(query);
      expect(description).toBe('"test search"');
    });

    it('should handle query with only filters', () => {
      const query: SearchQuery = {
        term: '',
        searchType: 'users',
        filters: { role: ['athlete'] }
      };

      const description = SearchQueryUtils.getQueryDescription(query);
      expect(description).toContain('in users');
      expect(description).toContain('1 filter');
    });

    it('should return "Empty search" for empty query', () => {
      const query: SearchQuery = {
        term: '',
        searchType: 'all',
        filters: {}
      };

      const description = SearchQueryUtils.getQueryDescription(query);
      expect(description).toBe('Empty search');
    });
  });

  describe('getActiveFilterCount', () => {
    it('should count all active filters', () => {
      const count = SearchQueryUtils.getActiveFilterCount(mockSearchQuery);
      expect(count).toBe(6); // role, status, location, sport, ageRange, dateRange
    });

    it('should return 0 for no filters', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {}
      };

      const count = SearchQueryUtils.getActiveFilterCount(query);
      expect(count).toBe(0);
    });

    it('should not count empty arrays or strings', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: [],
          location: '',
          sport: '   '
        }
      };

      const count = SearchQueryUtils.getActiveFilterCount(query);
      expect(count).toBe(0);
    });
  });

  describe('createBasicQuery', () => {
    it('should create basic query with term and type', () => {
      const query = SearchQueryUtils.createBasicQuery('test search', 'users');

      expect(query.term).toBe('test search');
      expect(query.searchType).toBe('users');
      expect(query.filters).toEqual({});
      expect(query.limit).toBe(20);
      expect(query.fuzzyMatching).toBe(true);
    });

    it('should default to "all" search type', () => {
      const query = SearchQueryUtils.createBasicQuery('test search');
      expect(query.searchType).toBe('all');
    });

    it('should trim search term', () => {
      const query = SearchQueryUtils.createBasicQuery('  test search  ');
      expect(query.term).toBe('test search');
    });
  });

  describe('isValidForSaving', () => {
    it('should return valid for query with term', () => {
      const result = SearchQueryUtils.isValidForSaving(mockSearchQuery);
      expect(result.valid).toBe(true);
    });

    it('should return valid for query with filters but no term', () => {
      const query: SearchQuery = {
        term: '',
        searchType: 'users',
        filters: { role: ['athlete'] }
      };

      const result = SearchQueryUtils.isValidForSaving(query);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty query', () => {
      const query: SearchQuery = {
        term: '',
        searchType: 'users',
        filters: {}
      };

      const result = SearchQueryUtils.isValidForSaving(query);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('must have either a search term or filters');
    });

    it('should return invalid for too long term', () => {
      const query: SearchQuery = {
        term: 'a'.repeat(501),
        searchType: 'users',
        filters: {}
      };

      const result = SearchQueryUtils.isValidForSaving(query);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too long');
    });
  });

  describe('generateSuggestedName', () => {
    it('should generate name from search term', () => {
      const name = SearchQueryUtils.generateSuggestedName(mockSearchQuery);
      expect(name).toContain('test search');
      expect(name).toContain('(users)');
    });

    it('should generate name from filters when no term', () => {
      const query: SearchQuery = {
        term: '',
        searchType: 'users',
        filters: {
          role: ['athlete'],
          location: 'New York'
        }
      };

      const name = SearchQueryUtils.generateSuggestedName(query);
      expect(name).toContain('athlete');
      expect(name).toContain('New York');
    });

    it('should truncate long names', () => {
      const query: SearchQuery = {
        term: 'this is a very long search term that should be truncated',
        searchType: 'users',
        filters: {}
      };

      const name = SearchQueryUtils.generateSuggestedName(query);
      expect(name.length).toBeLessThanOrEqual(50);
      expect(name).toContain('...');
    });

    it('should provide fallback for empty query', () => {
      const query: SearchQuery = {
        term: '',
        searchType: 'users',
        filters: {}
      };

      const name = SearchQueryUtils.generateSuggestedName(query);
      expect(name).toBe('users search');
    });
  });

  describe('checkCompatibility', () => {
    const availableOptions = {
      roles: ['athlete', 'coach'],
      statuses: ['active', 'inactive'],
      verificationStatuses: ['pending', 'approved'],
      categories: ['sports', 'fitness'],
      eventStatuses: ['active', 'completed']
    };

    it('should return compatible for valid query', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['athlete'],
          status: ['active']
        }
      };

      const result = SearchQueryUtils.checkCompatibility(query, availableOptions);
      expect(result.compatible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid roles', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['athlete', 'invalid_role']
        }
      };

      const result = SearchQueryUtils.checkCompatibility(query, availableOptions);
      expect(result.compatible).toBe(false);
      expect(result.issues[0]).toContain('Invalid roles: invalid_role');
    });

    it('should detect multiple compatibility issues', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['invalid_role'],
          status: ['invalid_status']
        }
      };

      const result = SearchQueryUtils.checkCompatibility(query, availableOptions);
      expect(result.compatible).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it('should handle query without filters', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {}
      };

      const result = SearchQueryUtils.checkCompatibility(query, availableOptions);
      expect(result.compatible).toBe(true);
    });
  });

  describe('fixCompatibilityIssues', () => {
    const availableOptions = {
      roles: ['athlete', 'coach'],
      statuses: ['active', 'inactive']
    };

    it('should remove invalid filter values', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['athlete', 'invalid_role', 'coach'],
          status: ['active', 'invalid_status']
        }
      };

      const fixed = SearchQueryUtils.fixCompatibilityIssues(query, availableOptions);

      expect(fixed.filters.role).toEqual(['athlete', 'coach']);
      expect(fixed.filters.status).toEqual(['active']);
    });

    it('should remove empty filter arrays', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['invalid_role'],
          status: ['active']
        }
      };

      const fixed = SearchQueryUtils.fixCompatibilityIssues(query, availableOptions);

      expect(fixed.filters.role).toBeUndefined();
      expect(fixed.filters.status).toEqual(['active']);
    });

    it('should preserve valid filters', () => {
      const query: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['athlete'],
          location: 'New York' // Not in available options, should be preserved
        }
      };

      const fixed = SearchQueryUtils.fixCompatibilityIssues(query, availableOptions);

      expect(fixed.filters.role).toEqual(['athlete']);
      expect(fixed.filters.location).toBe('New York');
    });
  });
});