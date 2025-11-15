/**
 * Unit Tests for QueryBuilder
 * Tests Firestore query building with complex filters and boolean operators
 * Requirements tested: 1.1, 1.4 (boolean operators), 2.1, 2.2 (advanced filters)
 */

import { queryBuilder, QueryBuilder } from '../queryBuilder';
import { SearchQuery, SearchFilters } from '@/types/models/search';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  query: jest.fn((...args) => ({ type: 'query', args })),
  collection: jest.fn((db, path) => ({ type: 'collection', path })),
  where: jest.fn((field, op, value) => ({ type: 'where', field, op, value })),
  orderBy: jest.fn((field, direction) => ({ type: 'orderBy', field, direction })),
  limit: jest.fn((count) => ({ type: 'limit', count })),
  startAfter: jest.fn((doc) => ({ type: 'startAfter', doc })),
  Timestamp: {
    fromDate: jest.fn((date) => ({ type: 'timestamp', date }))
  }
}));

jest.mock('@/lib/firebase', () => ({
  db: { type: 'firestore-db' }
}));

describe('QueryBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Query Building', () => {
    it('should build simple user search query', () => {
      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      const result = queryBuilder.buildQuery(searchQuery);
      expect(result).toBeDefined();
      expect(result.type).toBe('query');
    });

    it('should build query for different search types', () => {
      const searchTypes = ['users', 'videos', 'events'] as const;
      
      searchTypes.forEach(searchType => {
        const searchQuery: SearchQuery = {
          term: 'test',
          searchType,
          filters: {}
        };

        const result = queryBuilder.buildQuery(searchQuery);
        expect(result).toBeDefined();
      });
    });

    it('should handle empty search term', () => {
      const searchQuery: SearchQuery = {
        term: '',
        searchType: 'users',
        filters: {}
      };

      const result = queryBuilder.buildQuery(searchQuery);
      expect(result).toBeDefined();
    });

    it('should throw error for unsupported search type', () => {
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'invalid' as any,
        filters: {}
      };

      expect(() => queryBuilder.buildQuery(searchQuery)).toThrow('Unsupported search type');
    });
  });

  describe('Text Search Constraints', () => {
    it('should add text search constraints for users', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('displayName', '>=', 'john');
      expect(where).toHaveBeenCalledWith('displayName', '<=', 'john\uf8ff');
    });

    it('should add text search constraints for events', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'tournament',
        searchType: 'events',
        filters: {}
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('title', '>=', 'tournament');
      expect(where).toHaveBeenCalledWith('title', '<=', 'tournament\uf8ff');
    });

    it('should add text search constraints for videos', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'basketball',
        searchType: 'videos',
        filters: {}
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('title', '>=', 'basketball');
      expect(where).toHaveBeenCalledWith('title', '<=', 'basketball\uf8ff');
    });

    it('should handle case insensitive search', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'JOHN',
        searchType: 'users',
        filters: {}
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('displayName', '>=', 'john');
      expect(where).toHaveBeenCalledWith('displayName', '<=', 'john\uf8ff');
    });
  });

  describe('Filter Constraints (Requirement 2.1, 2.2)', () => {
    it('should add date range filter', () => {
      const { where, Timestamp } = require('firebase/firestore');
      
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          dateRange: {
            start: startDate,
            end: endDate,
            field: 'createdAt'
          }
        }
      };

      queryBuilder.buildQuery(searchQuery);

      expect(Timestamp.fromDate).toHaveBeenCalledWith(startDate);
      expect(Timestamp.fromDate).toHaveBeenCalledWith(endDate);
      expect(where).toHaveBeenCalledWith('createdAt', '>=', expect.any(Object));
      expect(where).toHaveBeenCalledWith('createdAt', '<=', expect.any(Object));
    });

    it('should add role filter for users', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['athlete', 'coach']
        }
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('role', 'in', ['athlete', 'coach']);
    });

    it('should add status filter', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          status: ['active']
        }
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('isActive', '==', true);
    });

    it('should add location filter', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          location: 'New York'
        }
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('location', '>=', 'new york');
      expect(where).toHaveBeenCalledWith('location', '<=', 'new york\uf8ff');
    });

    it('should add sport filter', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          sport: 'basketball'
        }
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('sports', 'array-contains', 'basketball');
    });

    it('should add verification status filter for videos', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'videos',
        filters: {
          verificationStatus: ['approved', 'pending']
        }
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('verificationStatus', 'in', ['approved', 'pending']);
    });

    it('should add event status filter', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'events',
        filters: {
          eventStatus: ['active']
        }
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('status', 'in', ['active']);
    });

    it('should add category filter', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'videos',
        filters: {
          category: ['sports', 'training']
        }
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('category', 'in', ['sports', 'training']);
    });

    it('should combine multiple filters', () => {
      const { where } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['athlete'],
          status: ['active'],
          location: 'California',
          sport: 'soccer'
        }
      };

      queryBuilder.buildQuery(searchQuery);

      expect(where).toHaveBeenCalledWith('role', 'in', ['athlete']);
      expect(where).toHaveBeenCalledWith('isActive', '==', true);
      expect(where).toHaveBeenCalledWith('location', '>=', 'california');
      expect(where).toHaveBeenCalledWith('sports', 'array-contains', 'soccer');
    });
  });

  describe('Sorting Constraints', () => {
    it('should add default sorting by creation date', () => {
      const { orderBy } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {}
      };

      queryBuilder.buildQuery(searchQuery);

      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should add custom sorting by name', () => {
      const { orderBy } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {},
        sortBy: 'name',
        sortOrder: 'asc'
      };

      queryBuilder.buildQuery(searchQuery);

      expect(orderBy).toHaveBeenCalledWith('displayName', 'asc');
    });

    it('should add sorting by date', () => {
      const { orderBy } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {},
        sortBy: 'date',
        sortOrder: 'desc'
      };

      queryBuilder.buildQuery(searchQuery);

      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should add sorting by status', () => {
      const { orderBy } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {},
        sortBy: 'status'
      };

      queryBuilder.buildQuery(searchQuery);

      expect(orderBy).toHaveBeenCalledWith('isActive', 'asc');
    });
  });

  describe('Pagination', () => {
    it('should add limit constraint', () => {
      const { limit } = require('firebase/firestore');
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {},
        limit: 50
      };

      queryBuilder.buildQuery(searchQuery);

      expect(limit).toHaveBeenCalledWith(50);
    });

    it('should add startAfter constraint for pagination', () => {
      const { startAfter } = require('firebase/firestore');
      
      const lastDoc = { id: 'last-doc' };
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {}
      };

      queryBuilder.buildQuery(searchQuery, lastDoc);

      expect(startAfter).toHaveBeenCalledWith(lastDoc);
    });

    it('should combine limit and startAfter', () => {
      const { limit, startAfter } = require('firebase/firestore');
      
      const lastDoc = { id: 'last-doc' };
      
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {},
        limit: 25
      };

      queryBuilder.buildQuery(searchQuery, lastDoc);

      expect(limit).toHaveBeenCalledWith(25);
      expect(startAfter).toHaveBeenCalledWith(lastDoc);
    });
  });

  describe('Auto-complete Query Building', () => {
    it('should build auto-complete query for users', () => {
      const { where, orderBy, limit } = require('firebase/firestore');
      
      const result = queryBuilder.buildAutoCompleteQuery('john', 'users');

      expect(where).toHaveBeenCalledWith('displayName', '>=', 'john');
      expect(where).toHaveBeenCalledWith('displayName', '<=', 'john\uf8ff');
      expect(orderBy).toHaveBeenCalledWith('displayName');
      expect(limit).toHaveBeenCalledWith(10);
    });

    it('should build auto-complete query for events', () => {
      const { where, orderBy } = require('firebase/firestore');
      
      queryBuilder.buildAutoCompleteQuery('tournament', 'events');

      expect(where).toHaveBeenCalledWith('title', '>=', 'tournament');
      expect(where).toHaveBeenCalledWith('title', '<=', 'tournament\uf8ff');
      expect(orderBy).toHaveBeenCalledWith('title');
    });

    it('should build auto-complete query for videos', () => {
      const { where, orderBy } = require('firebase/firestore');
      
      queryBuilder.buildAutoCompleteQuery('basketball', 'videos');

      expect(where).toHaveBeenCalledWith('title', '>=', 'basketball');
      expect(where).toHaveBeenCalledWith('title', '<=', 'basketball\uf8ff');
      expect(orderBy).toHaveBeenCalledWith('title');
    });
  });

  describe('Boolean Query Building (Requirement 1.4)', () => {
    it('should build multiple queries for boolean operators', () => {
      const searchQuery: SearchQuery = {
        term: 'john AND basketball',
        searchType: 'users',
        filters: {}
      };

      const queries = queryBuilder.buildBooleanQuery(searchQuery);

      expect(Array.isArray(queries)).toBe(true);
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should handle OR operator', () => {
      const searchQuery: SearchQuery = {
        term: 'basketball OR soccer',
        searchType: 'videos',
        filters: {}
      };

      const queries = queryBuilder.buildBooleanQuery(searchQuery);

      expect(queries.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle NOT operator', () => {
      const searchQuery: SearchQuery = {
        term: 'athlete NOT beginner',
        searchType: 'users',
        filters: {}
      };

      const queries = queryBuilder.buildBooleanQuery(searchQuery);

      expect(queries.length).toBeGreaterThanOrEqual(1);
    });

    it('should return single query for non-boolean terms', () => {
      const searchQuery: SearchQuery = {
        term: 'simple search',
        searchType: 'users',
        filters: {}
      };

      const queries = queryBuilder.buildBooleanQuery(searchQuery);

      expect(queries.length).toBe(1);
    });

    it('should handle complex boolean expressions', () => {
      const searchQuery: SearchQuery = {
        term: 'athlete AND (basketball OR soccer) NOT beginner',
        searchType: 'users',
        filters: {}
      };

      const queries = queryBuilder.buildBooleanQuery(searchQuery);

      expect(queries.length).toBeGreaterThan(0);
    });
  });

  describe('Analytics Query Building', () => {
    it('should build analytics query with date range', () => {
      const { where, orderBy, Timestamp } = require('firebase/firestore');
      
      const dateRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31')
      };

      const result = queryBuilder.buildAnalyticsQuery(dateRange);

      expect(where).toHaveBeenCalledWith('timestamp', '>=', expect.any(Object));
      expect(where).toHaveBeenCalledWith('timestamp', '<=', expect.any(Object));
      expect(orderBy).toHaveBeenCalledWith('timestamp', 'desc');
      expect(Timestamp.fromDate).toHaveBeenCalledWith(dateRange.start);
      expect(Timestamp.fromDate).toHaveBeenCalledWith(dateRange.end);
    });
  });

  describe('Query Validation', () => {
    it('should validate valid query', () => {
      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      const validation = queryBuilder.validateQuery(searchQuery);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject query without term or filters', () => {
      const searchQuery: SearchQuery = {
        term: '',
        searchType: 'users',
        filters: {}
      };

      const validation = queryBuilder.validateQuery(searchQuery);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Search term or filters are required');
    });

    it('should reject invalid search type', () => {
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'invalid' as any,
        filters: {}
      };

      const validation = queryBuilder.validateQuery(searchQuery);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid search type');
    });

    it('should reject invalid limit', () => {
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {},
        limit: 0
      };

      const validation = queryBuilder.validateQuery(searchQuery);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Limit must be between 1 and 100');
    });

    it('should reject invalid date range', () => {
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          dateRange: {
            start: new Date('2023-12-31'),
            end: new Date('2023-01-01'),
            field: 'createdAt'
          }
        }
      };

      const validation = queryBuilder.validateQuery(searchQuery);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Start date must be before end date');
    });

    it('should reject invalid age range', () => {
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          ageRange: { min: 30, max: 20 }
        }
      };

      const validation = queryBuilder.validateQuery(searchQuery);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid age range');
    });

    it('should accept query with only filters', () => {
      const searchQuery: SearchQuery = {
        term: '',
        searchType: 'users',
        filters: {
          role: ['athlete']
        }
      };

      const validation = queryBuilder.validateQuery(searchQuery);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Query Cost Estimation', () => {
    it('should calculate base cost for simple query', () => {
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {}
      };

      const cost = queryBuilder.getQueryCost(searchQuery);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should increase cost for text search', () => {
      const simpleQuery: SearchQuery = {
        term: '',
        searchType: 'users',
        filters: {}
      };

      const textQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      const simpleCost = queryBuilder.getQueryCost(simpleQuery);
      const textCost = queryBuilder.getQueryCost(textQuery);

      expect(textCost).toBeGreaterThan(simpleCost);
    });

    it('should increase cost for filters', () => {
      const noFiltersQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {}
      };

      const withFiltersQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: ['athlete'],
          status: ['active']
        }
      };

      const noFiltersCost = queryBuilder.getQueryCost(noFiltersQuery);
      const withFiltersCost = queryBuilder.getQueryCost(withFiltersQuery);

      expect(withFiltersCost).toBeGreaterThan(noFiltersCost);
    });

    it('should increase cost for boolean operators', () => {
      const simpleQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {}
      };

      const booleanQuery: SearchQuery = {
        term: 'john AND basketball',
        searchType: 'users',
        filters: {}
      };

      const simpleCost = queryBuilder.getQueryCost(simpleQuery);
      const booleanCost = queryBuilder.getQueryCost(booleanQuery);

      expect(booleanCost).toBeGreaterThan(simpleCost);
    });

    it('should increase cost for large limits', () => {
      const smallLimitQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {},
        limit: 10
      };

      const largeLimitQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {},
        limit: 100
      };

      const smallCost = queryBuilder.getQueryCost(smallLimitQuery);
      const largeCost = queryBuilder.getQueryCost(largeLimitQuery);

      expect(largeCost).toBeGreaterThan(smallCost);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined values in filters', () => {
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          location: undefined,
          sport: null as any
        }
      };

      expect(() => queryBuilder.buildQuery(searchQuery)).not.toThrow();
    });

    it('should handle empty arrays in filters', () => {
      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'users',
        filters: {
          role: [],
          status: []
        }
      };

      expect(() => queryBuilder.buildQuery(searchQuery)).not.toThrow();
    });

    it('should handle special characters in search term', () => {
      const searchQuery: SearchQuery = {
        term: 'user@domain.com',
        searchType: 'users',
        filters: {}
      };

      expect(() => queryBuilder.buildQuery(searchQuery)).not.toThrow();
    });

    it('should handle very long search terms', () => {
      const searchQuery: SearchQuery = {
        term: 'a'.repeat(1000),
        searchType: 'users',
        filters: {}
      };

      expect(() => queryBuilder.buildQuery(searchQuery)).not.toThrow();
    });
  });
});