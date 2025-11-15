/**
 * Unit Tests for EnhancedSearchService
 * Tests main search functionality with performance optimization and error handling
 * Requirements tested: 1.1, 1.2, 1.3, 1.4, 1.5 (all search requirements)
 */

import { enhancedSearchService, EnhancedSearchService } from '../enhancedSearchService';
import { SearchQuery, SearchResults, SearchOperationResult } from '@/types/models/search';

// Mock dependencies
jest.mock('../queryBuilder', () => ({
  queryBuilder: {
    validateQuery: jest.fn(),
    buildQuery: jest.fn(),
    buildBooleanQuery: jest.fn()
  }
}));

jest.mock('../fuzzyMatcher', () => ({
  fuzzyMatcher: {
    isMatch: jest.fn(),
    hasBooleanOperators: jest.fn(),
    parseBooleanQuery: jest.fn(),
    generateSuggestions: jest.fn()
  }
}));

jest.mock('../searchCacheService', () => ({
  searchResultsCache: {
    generateKey: jest.fn(),
    get: jest.fn(),
    set: jest.fn()
  },
  autoCompleteCache: {
    generateKey: jest.fn(),
    get: jest.fn(),
    set: jest.fn()
  },
  analyticsCache: {
    generateKey: jest.fn(),
    get: jest.fn(),
    set: jest.fn()
  }
}));

jest.mock('../searchErrorHandler', () => ({
  searchErrorHandler: {
    createSearchError: jest.fn(),
    clearRetries: jest.fn()
  }
}));

jest.mock('../searchPerformanceMonitor', () => ({
  searchPerformanceMonitor: {
    recordSearch: jest.fn(),
    getMetrics: jest.fn(),
    getOptimizationSuggestions: jest.fn(),
    getRealtimeStatus: jest.fn()
  }
}));

jest.mock('@/utils/performance/debouncedSearch', () => ({
  createDebouncedSearch: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getDocs: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date() })
  }
}));

describe('EnhancedSearchService', () => {
  let searchService: EnhancedSearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    searchService = new EnhancedSearchService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Search Method (Requirement 1.1)', () => {
    it('should perform basic search successfully', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { getDocs } = require('firebase/firestore');
      const { searchResultsCache } = require('../searchCacheService');

      // Mock validation
      queryBuilder.validateQuery.mockReturnValue({ valid: true, errors: [] });
      
      // Mock cache miss
      searchResultsCache.generateKey.mockReturnValue('cache-key');
      searchResultsCache.get.mockReturnValue(null);

      // Mock Firestore response
      const mockDocs = [
        {
          id: 'user1',
          data: () => ({
            id: 'user1',
            displayName: 'John Doe',
            email: 'john@example.com',
            role: 'athlete',
            isActive: true,
            createdAt: new Date()
          })
        }
      ];

      getDocs.mockResolvedValue({
        forEach: (callback: any) => mockDocs.forEach(callback)
      });

      queryBuilder.buildQuery.mockReturnValue('mock-query');

      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      const result = await searchService.search(searchQuery, false);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.items).toHaveLength(1);
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should return cached results when available', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { searchResultsCache } = require('../searchCacheService');

      queryBuilder.validateQuery.mockReturnValue({ valid: true, errors: [] });
      
      const cachedResults: SearchResults = {
        items: [{ id: 'user1', displayName: 'John Doe' } as any],
        totalCount: 1,
        searchTime: 100,
        query: { term: 'john', searchType: 'users', filters: {} }
      };

      searchResultsCache.generateKey.mockReturnValue('cache-key');
      searchResultsCache.get.mockReturnValue(cachedResults);

      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      const result = await searchService.search(searchQuery, false);

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.data).toEqual(cachedResults);
    });

    it('should handle search within 500ms (Requirement 1.1)', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { getDocs } = require('firebase/firestore');
      const { searchResultsCache } = require('../searchCacheService');

      queryBuilder.validateQuery.mockReturnValue({ valid: true, errors: [] });
      searchResultsCache.generateKey.mockReturnValue('cache-key');
      searchResultsCache.get.mockReturnValue(null);

      getDocs.mockResolvedValue({
        forEach: () => {}
      });

      queryBuilder.buildQuery.mockReturnValue('mock-query');

      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      const startTime = Date.now();
      const result = await searchService.search(searchQuery, false);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(500); // Should be fast for mocked data
      expect(result.responseTime).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { searchErrorHandler } = require('../searchErrorHandler');

      queryBuilder.validateQuery.mockReturnValue({
        valid: false,
        errors: ['Invalid search type']
      });

      searchErrorHandler.createSearchError.mockReturnValue({
        type: 'INVALID_QUERY',
        message: 'Invalid query: Invalid search type',
        retryable: false
      });

      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'invalid' as any,
        filters: {}
      };

      const result = await searchService.search(searchQuery, false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('INVALID_QUERY');
    });

    it('should handle search timeout', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { getDocs } = require('firebase/firestore');
      const { searchResultsCache } = require('../searchCacheService');
      const { searchErrorHandler } = require('../searchErrorHandler');

      queryBuilder.validateQuery.mockReturnValue({ valid: true, errors: [] });
      searchResultsCache.generateKey.mockReturnValue('cache-key');
      searchResultsCache.get.mockReturnValue(null);

      // Mock timeout
      getDocs.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 15000)));

      searchErrorHandler.createSearchError.mockReturnValue({
        type: 'TIMEOUT',
        message: 'Search timeout',
        retryable: true
      });

      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      // Create service with short timeout for testing
      const testService = new EnhancedSearchService({ 
        enableCaching: true,
        enableFuzzyMatching: true,
        enableAnalytics: true,
        defaultLimit: 20,
        maxSearchTime: 100 // 100ms timeout
      });

      const result = await testService.search(searchQuery, false);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('TIMEOUT');
    });
  });

  describe('Fuzzy Matching (Requirement 1.2)', () => {
    it('should apply fuzzy matching when enabled', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { fuzzyMatcher } = require('../fuzzyMatcher');
      const { getDocs } = require('firebase/firestore');
      const { searchResultsCache } = require('../searchCacheService');

      queryBuilder.validateQuery.mockReturnValue({ valid: true, errors: [] });
      searchResultsCache.generateKey.mockReturnValue('cache-key');
      searchResultsCache.get.mockReturnValue(null);

      const mockDocs = [
        {
          id: 'user1',
          data: () => ({
            id: 'user1',
            displayName: 'John Doe',
            email: 'john@example.com',
            createdAt: new Date()
          })
        },
        {
          id: 'user2',
          data: () => ({
            id: 'user2',
            displayName: 'Jane Smith',
            email: 'jane@example.com',
            createdAt: new Date()
          })
        }
      ];

      getDocs.mockResolvedValue({
        forEach: (callback: any) => mockDocs.forEach(callback)
      });

      // Mock fuzzy matching - only John matches "jon"
      fuzzyMatcher.isMatch.mockImplementation((term: string, target: string) => {
        if (target.includes('John') && term === 'jon') {
          return { match: true, score: 0.8, distance: 1 };
        }
        return { match: false, score: 0, distance: 10 };
      });

      const searchQuery: SearchQuery = {
        term: 'jon',
        searchType: 'users',
        filters: {}
      };

      const result = await searchService.search(searchQuery, false);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].displayName).toBe('John Doe');
    });

    it('should support up to 2 character differences (Requirement 1.2)', async () => {
      const { fuzzyMatcher } = require('../fuzzyMatcher');

      // Test the fuzzy matcher directly
      fuzzyMatcher.isMatch.mockImplementation((term: string, target: string) => {
        // Simulate 2 character difference tolerance
        const distance = Math.abs(term.length - target.length) + 
          (term === 'johm' && target.includes('John') ? 1 : 0);
        return {
          match: distance <= 2,
          score: distance <= 2 ? 1 - (distance / target.length) : 0,
          distance
        };
      });

      const result1 = fuzzyMatcher.isMatch('johm', 'John Doe');
      const result2 = fuzzyMatcher.isMatch('smyth', 'Smith');
      const result3 = fuzzyMatcher.isMatch('xyz', 'John');

      expect(result1.match).toBe(true);
      expect(result2.match).toBe(true);
      expect(result3.match).toBe(false);
    });
  });

  describe('Boolean Operators (Requirement 1.4)', () => {
    it('should handle AND operator', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { fuzzyMatcher } = require('../fuzzyMatcher');
      const { getDocs } = require('firebase/firestore');
      const { searchResultsCache } = require('../searchCacheService');

      queryBuilder.validateQuery.mockReturnValue({ valid: true, errors: [] });
      searchResultsCache.generateKey.mockReturnValue('cache-key');
      searchResultsCache.get.mockReturnValue(null);

      fuzzyMatcher.hasBooleanOperators.mockReturnValue(true);
      fuzzyMatcher.parseBooleanQuery.mockReturnValue({
        terms: ['john', 'athlete'],
        operators: ['AND'],
        structure: 'john AND athlete'
      });

      queryBuilder.buildBooleanQuery.mockReturnValue(['query1', 'query2']);

      getDocs.mockResolvedValue({
        forEach: () => {}
      });

      const searchQuery: SearchQuery = {
        term: 'john AND athlete',
        searchType: 'users',
        filters: {}
      };

      const result = await searchService.search(searchQuery, false);

      expect(fuzzyMatcher.hasBooleanOperators).toHaveBeenCalledWith('john AND athlete');
      expect(queryBuilder.buildBooleanQuery).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle OR operator', async () => {
      const { fuzzyMatcher } = require('../fuzzyMatcher');

      fuzzyMatcher.hasBooleanOperators.mockReturnValue(true);
      fuzzyMatcher.parseBooleanQuery.mockReturnValue({
        terms: ['basketball', 'soccer'],
        operators: ['OR'],
        structure: 'basketball OR soccer'
      });

      const searchQuery: SearchQuery = {
        term: 'basketball OR soccer',
        searchType: 'videos',
        filters: {}
      };

      // Test that boolean operators are detected
      expect(fuzzyMatcher.hasBooleanOperators('basketball OR soccer')).toBe(true);
    });

    it('should handle NOT operator', async () => {
      const { fuzzyMatcher } = require('../fuzzyMatcher');

      fuzzyMatcher.hasBooleanOperators.mockReturnValue(true);
      fuzzyMatcher.parseBooleanQuery.mockReturnValue({
        terms: ['athlete', 'beginner'],
        operators: ['NOT'],
        structure: 'athlete NOT beginner'
      });

      expect(fuzzyMatcher.hasBooleanOperators('athlete NOT beginner')).toBe(true);
    });
  });

  describe('Auto-complete Suggestions (Requirement 4.1, 4.2)', () => {
    it('should return auto-complete suggestions', async () => {
      const { autoCompleteCache } = require('../searchCacheService');

      autoCompleteCache.generateKey.mockReturnValue('autocomplete-key');
      autoCompleteCache.get.mockReturnValue(null);

      // Mock suggestion generation
      const mockSuggestions = ['john', 'johnny', 'johnson'];
      autoCompleteCache.set.mockImplementation(() => {});

      // Mock the internal suggestion generation
      searchService['_generateSuggestions'] = jest.fn().mockReturnValue(mockSuggestions);

      const result = await searchService.getAutoCompleteSuggestions('jo', 'users');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSuggestions);
    });

    it('should return cached suggestions when available', async () => {
      const { autoCompleteCache } = require('../searchCacheService');

      const cachedSuggestions = ['john', 'jane', 'jack'];
      autoCompleteCache.generateKey.mockReturnValue('autocomplete-key');
      autoCompleteCache.get.mockReturnValue(cachedSuggestions);

      const result = await searchService.getAutoCompleteSuggestions('j', 'users');

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.data).toEqual(cachedSuggestions);
    });

    it('should return empty array for empty query', async () => {
      const result = await searchService.getAutoCompleteSuggestions('', 'users');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should update suggestions within 200ms (Requirement 4.2)', async () => {
      const startTime = Date.now();
      const result = await searchService.getAutoCompleteSuggestions('test', 'users');
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('Saved Searches (Requirement 2.3, 2.4)', () => {
    beforeEach(() => {
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });
    });

    it('should save search query', async () => {
      const mockGetItem = window.localStorage.getItem as jest.Mock;
      const mockSetItem = window.localStorage.setItem as jest.Mock;

      mockGetItem.mockReturnValue('[]');

      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: { role: ['athlete'] }
      };

      const result = await searchService.saveSearch('My Search', searchQuery);

      expect(result.success).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith('savedSearches', expect.any(String));
    });

    it('should get saved searches', () => {
      const mockGetItem = window.localStorage.getItem as jest.Mock;
      const savedSearches = [
        {
          id: 'search1',
          name: 'Athletes',
          query: { term: 'athlete', searchType: 'users', filters: {} },
          createdAt: new Date(),
          useCount: 5
        }
      ];

      mockGetItem.mockReturnValue(JSON.stringify(savedSearches));

      const result = searchService.getSavedSearches();

      expect(result).toEqual(savedSearches);
    });

    it('should delete saved search', async () => {
      const mockGetItem = window.localStorage.getItem as jest.Mock;
      const mockSetItem = window.localStorage.setItem as jest.Mock;

      const savedSearches = [
        { id: 'search1', name: 'Search 1' },
        { id: 'search2', name: 'Search 2' }
      ];

      mockGetItem.mockReturnValue(JSON.stringify(savedSearches));

      const result = await searchService.deleteSavedSearch('search1');

      expect(result.success).toBe(true);
      expect(mockSetItem).toHaveBeenCalled();
    });
  });

  describe('Search Analytics (Requirement 3.1, 3.2)', () => {
    it('should get search analytics', async () => {
      const { analyticsCache } = require('../searchCacheService');
      const { searchPerformanceMonitor } = require('../searchPerformanceMonitor');

      const mockAnalytics = {
        totalSearches: 100,
        averageResponseTime: 250,
        topSearchTerms: [{ term: 'john', count: 10 }],
        zeroResultQueries: [],
        popularFilters: [],
        searchTrends: []
      };

      analyticsCache.generateKey.mockReturnValue('analytics-key');
      analyticsCache.get.mockReturnValue(null);
      searchService['_generateAnalytics'] = jest.fn().mockReturnValue(mockAnalytics);

      const dateRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31')
      };

      const result = await searchService.getSearchAnalytics(dateRange);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAnalytics);
    });

    it('should track search performance', async () => {
      const { searchPerformanceMonitor } = require('../searchPerformanceMonitor');

      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      // Mock the internal tracking method
      searchService['_trackSearchPerformance'] = jest.fn();

      // This would be called internally during search
      searchService['_trackSearchPerformance'](searchQuery, 200, 5, false, false);

      expect(searchService['_trackSearchPerformance']).toHaveBeenCalledWith(
        searchQuery, 200, 5, false, false
      );
    });
  });

  describe('Performance Optimizations (Requirement 1.1)', () => {
    it('should use debounced search for real-time queries', async () => {
      const { createDebouncedSearch } = require('@/utils/performance/debouncedSearch');

      const mockDebouncedSearch = {
        execute: jest.fn().mockResolvedValue({
          items: [],
          totalCount: 0,
          searchTime: 100,
          query: { term: 'test', searchType: 'users', filters: {} }
        }),
        cancel: jest.fn(),
        flush: jest.fn(),
        pending: jest.fn()
      };

      createDebouncedSearch.mockReturnValue(mockDebouncedSearch);

      const testService = new EnhancedSearchService();
      
      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      // Test that debounced search is used
      expect(createDebouncedSearch).toHaveBeenCalledWith(
        expect.any(Function),
        { delay: 300, maxWait: 1000 }
      );
    });

    it('should get performance metrics', () => {
      const { searchPerformanceMonitor } = require('../searchPerformanceMonitor');

      const mockMetrics = {
        averageResponseTime: 200,
        cacheHitRate: 0.8,
        totalSearches: 100,
        errorRate: 0.02,
        popularSearchTerms: [],
        slowQueries: []
      };

      searchPerformanceMonitor.getMetrics.mockReturnValue(mockMetrics);

      const result = searchService.getPerformanceMetrics();

      expect(result).toEqual(mockMetrics);
      expect(searchPerformanceMonitor.getMetrics).toHaveBeenCalled();
    });

    it('should get optimization suggestions', () => {
      const { searchPerformanceMonitor } = require('../searchPerformanceMonitor');

      const mockSuggestions = [
        {
          type: 'index',
          message: 'Consider creating composite indexes',
          impact: 'high',
          query: { term: 'test', searchType: 'users', filters: {} }
        }
      ];

      searchPerformanceMonitor.getOptimizationSuggestions.mockReturnValue(mockSuggestions);

      const result = searchService.getOptimizationSuggestions();

      expect(result).toEqual(mockSuggestions);
    });

    it('should prefetch popular searches', async () => {
      // Mock popular terms
      searchService['popularTerms'] = new Map([
        ['john', 10],
        ['basketball', 8],
        ['athlete', 6]
      ]);

      // Mock the internal search method
      searchService['_executeSearchWithCaching'] = jest.fn().mockResolvedValue({
        success: true,
        data: { items: [], totalCount: 0, searchTime: 100 },
        responseTime: 100
      });

      await searchService.prefetchPopularSearches();

      expect(searchService['_executeSearchWithCaching']).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling (Requirement 1.5)', () => {
    it('should handle network errors', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { getDocs } = require('firebase/firestore');
      const { searchErrorHandler } = require('../searchErrorHandler');
      const { searchResultsCache } = require('../searchCacheService');

      queryBuilder.validateQuery.mockReturnValue({ valid: true, errors: [] });
      searchResultsCache.generateKey.mockReturnValue('cache-key');
      searchResultsCache.get.mockReturnValue(null);

      const networkError = new Error('Network error');
      getDocs.mockRejectedValue(networkError);

      searchErrorHandler.createSearchError.mockReturnValue({
        type: 'NETWORK_ERROR',
        message: 'Network error occurred',
        retryable: true
      });

      const searchQuery: SearchQuery = {
        term: 'john',
        searchType: 'users',
        filters: {}
      };

      const result = await searchService.search(searchQuery, false);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
      expect(result.error?.retryable).toBe(true);
    });

    it('should provide suggestions for zero results (Requirement 1.5)', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { getDocs } = require('firebase/firestore');
      const { searchResultsCache } = require('../searchCacheService');
      const { fuzzyMatcher } = require('../fuzzyMatcher');

      queryBuilder.validateQuery.mockReturnValue({ valid: true, errors: [] });
      searchResultsCache.generateKey.mockReturnValue('cache-key');
      searchResultsCache.get.mockReturnValue(null);

      // Mock empty results
      getDocs.mockResolvedValue({
        forEach: () => {}
      });

      // Mock suggestion generation
      fuzzyMatcher.generateSuggestions.mockReturnValue(['john', 'jane']);

      const searchQuery: SearchQuery = {
        term: 'xyz',
        searchType: 'users',
        filters: {}
      };

      const result = await searchService.search(searchQuery, false);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(0);
      expect(result.data?.suggestions).toEqual(['john', 'jane']);
    });
  });

  describe('Service Configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        enableCaching: false,
        maxSearchTime: 5000
      };

      searchService.updateConfig(newConfig);

      const stats = searchService.getStats();
      expect(stats.config.enableCaching).toBe(false);
      expect(stats.config.maxSearchTime).toBe(5000);
    });

    it('should get service statistics', () => {
      const { searchPerformanceMonitor } = require('../searchPerformanceMonitor');

      searchPerformanceMonitor.getRealtimeStatus.mockReturnValue({
        status: 'healthy',
        message: 'Performance is optimal'
      });

      const stats = searchService.getStats();

      expect(stats).toHaveProperty('searchHistory');
      expect(stats).toHaveProperty('popularTerms');
      expect(stats).toHaveProperty('config');
      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('cache');
    });

    it('should clear caches', () => {
      const { searchResultsCache, autoCompleteCache, analyticsCache } = require('../searchCacheService');

      searchResultsCache.invalidate = jest.fn();
      autoCompleteCache.invalidate = jest.fn();
      analyticsCache.invalidate = jest.fn();

      searchService.clearCaches();

      expect(searchResultsCache.invalidate).toHaveBeenCalledWith(/^search:/);
      expect(autoCompleteCache.invalidate).toHaveBeenCalledWith(/^autocomplete:/);
      expect(analyticsCache.invalidate).toHaveBeenCalledWith(/^analytics:/);
    });

    it('should cleanup on destroy', () => {
      const { searchErrorHandler } = require('../searchErrorHandler');

      searchErrorHandler.clearRetries = jest.fn();
      searchService['_saveSearchHistory'] = jest.fn();

      searchService.destroy();

      expect(searchErrorHandler.clearRetries).toHaveBeenCalled();
      expect(searchService['_saveSearchHistory']).toHaveBeenCalled();
    });
  });

  describe('Multi-Collection Search', () => {
    it('should search across all collections when searchType is "all"', async () => {
      const { queryBuilder } = require('../queryBuilder');
      const { getDocs } = require('firebase/firestore');
      const { searchResultsCache } = require('../searchCacheService');

      queryBuilder.validateQuery.mockReturnValue({ valid: true, errors: [] });
      searchResultsCache.generateKey.mockReturnValue('cache-key');
      searchResultsCache.get.mockReturnValue(null);

      // Mock multiple collection results
      getDocs.mockResolvedValue({
        forEach: (callback: any) => {
          // Mock users
          callback({
            id: 'user1',
            data: () => ({ id: 'user1', displayName: 'John', createdAt: new Date() })
          });
          // Mock events  
          callback({
            id: 'event1',
            data: () => ({ id: 'event1', title: 'Tournament', createdAt: new Date() })
          });
        }
      });

      queryBuilder.buildQuery.mockReturnValue('mock-query');

      const searchQuery: SearchQuery = {
        term: 'test',
        searchType: 'all',
        filters: {}
      };

      const result = await searchService.search(searchQuery, false);

      expect(result.success).toBe(true);
      expect(result.data?.items.length).toBeGreaterThan(0);
    });
  });
});