/**
 * Unit Tests for SearchAnalyticsService
 * Tests analytics data collection, aggregation, and export functionality
 * Requirements tested: 3.1, 3.2, 3.3, 3.4, 3.5 (analytics requirements)
 */

// Mock Firebase Firestore first
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({ 
      seconds: date.getTime() / 1000, 
      nanoseconds: 0,
      toDate: () => date 
    })),
    now: jest.fn(() => ({ 
      seconds: Date.now() / 1000, 
      nanoseconds: 0,
      toDate: () => new Date() 
    }))
  },
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn((value: number) => ({ increment: value }))
}));

// Mock Firebase app
jest.mock('../../../lib/firebase', () => ({
  db: {}
}));

import { searchAnalyticsService } from '../searchAnalyticsService';
import { SearchQuery, SearchAnalytics, SearchPerformanceMetrics } from '../../../types/models/search';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp 
} from 'firebase/firestore';

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  writable: true
});

describe('SearchAnalyticsService', () => {
  const mockSearchQuery: SearchQuery = {
    term: 'test search',
    searchType: 'users',
    filters: {
      role: ['athlete'],
      status: ['active']
    },
    limit: 20,
    fuzzyMatching: true
  };

  const mockAnalyticsEvents = [
    {
      id: 'event1',
      eventType: 'search_executed',
      searchTerm: 'john doe',
      searchType: 'users',
      filterCount: 1,
      resultCount: 5,
      responseTime: 250,
      cached: false,
      errorOccurred: false,
      sessionId: 'session1',
      timestamp: { 
        toDate: () => new Date('2023-12-01T10:00:00Z'),
        seconds: new Date('2023-12-01T10:00:00Z').getTime() / 1000
      },
      metadata: {
        platform: 'desktop',
        filters: { role: ['athlete'] }
      }
    },
    {
      id: 'event2',
      eventType: 'zero_results',
      searchTerm: 'nonexistent user',
      searchType: 'users',
      filterCount: 0,
      resultCount: 0,
      responseTime: 180,
      cached: false,
      errorOccurred: false,
      sessionId: 'session2',
      timestamp: { 
        toDate: () => new Date('2023-12-01T11:00:00Z'),
        seconds: new Date('2023-12-01T11:00:00Z').getTime() / 1000
      },
      metadata: {
        platform: 'mobile',
        filters: {}
      }
    },
    {
      id: 'event3',
      eventType: 'search_failed',
      searchTerm: 'error search',
      searchType: 'videos',
      filterCount: 2,
      resultCount: 0,
      responseTime: 5000,
      cached: false,
      errorOccurred: true,
      errorType: 'TIMEOUT',
      errorMessage: 'Search timeout',
      sessionId: 'session3',
      timestamp: { 
        toDate: () => new Date('2023-12-01T12:00:00Z'),
        seconds: new Date('2023-12-01T12:00:00Z').getTime() / 1000
      },
      metadata: {
        platform: 'desktop',
        filters: { category: ['sports'], verificationStatus: ['approved'] }
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackSearch', () => {
    it('should track successful search execution', async () => {
      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'event-id' } as any);

      const eventId = await searchAnalyticsService.trackSearch(
        mockSearchQuery,
        250,
        5,
        false,
        false
      );

      expect(eventId).toBe('event-id');
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'search_executed',
          searchTerm: 'test search',
          searchType: 'users',
          filterCount: 2,
          resultCount: 5,
          responseTime: 250,
          cached: false,
          errorOccurred: false
        })
      );
    });

    it('should track zero result searches', async () => {
      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'zero-event-id' } as any);

      const eventId = await searchAnalyticsService.trackSearch(
        mockSearchQuery,
        180,
        0, // Zero results
        false,
        false
      );

      expect(eventId).toBe('zero-event-id');
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'zero_results',
          resultCount: 0
        })
      );
    });

    it('should include metadata in tracked events', async () => {
      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'meta-event-id' } as any);

      await searchAnalyticsService.trackSearch(
        mockSearchQuery,
        300,
        10,
        true, // Cached
        false
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          cached: true,
          metadata: expect.objectContaining({
            platform: 'desktop',
            filters: mockSearchQuery.filters
          })
        })
      );
    });

    it('should handle tracking errors gracefully', async () => {
      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockRejectedValue(new Error('Firestore error'));

      const eventId = await searchAnalyticsService.trackSearch(
        mockSearchQuery,
        250,
        5,
        false,
        false
      );

      expect(eventId).toBeNull();
    });
  });

  describe('trackSearchFailure', () => {
    it('should track search failures with error details', async () => {
      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'failure-event-id' } as any);

      const eventId = await searchAnalyticsService.trackSearchFailure(
        mockSearchQuery,
        5000,
        { type: 'TIMEOUT', message: 'Search timeout' }
      );

      expect(eventId).toBe('failure-event-id');
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'search_failed',
          errorOccurred: true,
          errorType: 'TIMEOUT',
          errorMessage: 'Search timeout',
          responseTime: 5000
        })
      );
    });
  });

  describe('trackSuggestionClick', () => {
    it('should track suggestion clicks', async () => {
      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'suggestion-event-id' } as any);

      const eventId = await searchAnalyticsService.trackSuggestionClick(
        'john',
        'john doe',
        ['john doe', 'john smith', 'johnny']
      );

      expect(eventId).toBe('suggestion-event-id');
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'suggestion_clicked',
          searchTerm: 'john',
          metadata: expect.objectContaining({
            selectedSuggestion: 'john doe',
            suggestions: ['john doe', 'john smith', 'johnny']
          })
        })
      );
    });
  });

  describe('getSearchAnalytics', () => {
    it('should generate analytics from events data', async () => {
      const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
      mockGetDocs.mockResolvedValue({
        docs: mockAnalyticsEvents.map(event => ({
          id: event.id,
          data: () => event
        }))
      } as any);

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-01T23:59:59Z')
      };

      const analytics = await searchAnalyticsService.getSearchAnalytics(dateRange);

      expect(analytics.totalSearches).toBe(2); // 2 search events (excluding failure)
      expect(analytics.averageResponseTime).toBe(215); // (250 + 180) / 2
      expect(analytics.topSearchTerms).toHaveLength(2);
      expect(analytics.topSearchTerms[0].term).toBe('john doe');
      expect(analytics.zeroResultQueries).toHaveLength(1);
      expect(analytics.zeroResultQueries[0].query).toBe('nonexistent user');
    });

    it('should handle empty analytics data', async () => {
      const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
      mockGetDocs.mockResolvedValue({ docs: [] } as any);

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-01T23:59:59Z')
      };

      const analytics = await searchAnalyticsService.getSearchAnalytics(dateRange);

      expect(analytics.totalSearches).toBe(0);
      expect(analytics.averageResponseTime).toBe(0);
      expect(analytics.topSearchTerms).toHaveLength(0);
      expect(analytics.zeroResultQueries).toHaveLength(0);
    });

    it('should analyze popular filters correctly', async () => {
      const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
      mockGetDocs.mockResolvedValue({
        docs: mockAnalyticsEvents.map(event => ({
          id: event.id,
          data: () => event
        }))
      } as any);

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-01T23:59:59Z')
      };

      const analytics = await searchAnalyticsService.getSearchAnalytics(dateRange);

      expect(analytics.popularFilters).toBeDefined();
      expect(analytics.popularFilters.length).toBeGreaterThan(0);
      
      // Should include 'role' filter from first event and 'category', 'verificationStatus' from third event
      const filterNames = analytics.popularFilters.map(f => f.filter);
      expect(filterNames).toContain('role');
    });

    it('should generate search trends correctly', async () => {
      const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
      mockGetDocs.mockResolvedValue({
        docs: mockAnalyticsEvents.map(event => ({
          id: event.id,
          data: () => event
        }))
      } as any);

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-01T23:59:59Z')
      };

      const analytics = await searchAnalyticsService.getSearchAnalytics(dateRange);

      expect(analytics.searchTrends).toBeDefined();
      expect(analytics.searchTrends.length).toBeGreaterThan(0);
      expect(analytics.searchTrends[0]).toHaveProperty('date');
      expect(analytics.searchTrends[0]).toHaveProperty('count');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should calculate performance metrics correctly', async () => {
      const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
      mockGetDocs.mockResolvedValue({
        docs: mockAnalyticsEvents.map(event => ({
          id: event.id,
          data: () => event
        }))
      } as any);

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-01T23:59:59Z')
      };

      const metrics = await searchAnalyticsService.getPerformanceMetrics(dateRange);

      expect(metrics.totalSearches).toBe(3); // All events
      expect(metrics.errorRate).toBe(1/3); // 1 error out of 3 total
      expect(metrics.cacheHitRate).toBe(0); // No cached events
      expect(metrics.averageResponseTime).toBe((250 + 180 + 5000) / 3);
    });

    it('should identify slow queries', async () => {
      const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
      mockGetDocs.mockResolvedValue({
        docs: mockAnalyticsEvents.map(event => ({
          id: event.id,
          data: () => event
        }))
      } as any);

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-01T23:59:59Z')
      };

      const metrics = await searchAnalyticsService.getPerformanceMetrics(dateRange);

      expect(metrics.slowQueries).toBeDefined();
      expect(metrics.slowQueries.length).toBe(1); // Only the 5000ms query
      expect(metrics.slowQueries[0].query).toBe('error search');
      expect(metrics.slowQueries[0].responseTime).toBe(5000);
    });

    it('should calculate popular search terms', async () => {
      const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
      mockGetDocs.mockResolvedValue({
        docs: mockAnalyticsEvents.map(event => ({
          id: event.id,
          data: () => event
        }))
      } as any);

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-01T23:59:59Z')
      };

      const metrics = await searchAnalyticsService.getPerformanceMetrics(dateRange);

      expect(metrics.popularSearchTerms).toBeDefined();
      expect(metrics.popularSearchTerms.length).toBeGreaterThan(0);
      expect(metrics.popularSearchTerms[0]).toHaveProperty('term');
      expect(metrics.popularSearchTerms[0]).toHaveProperty('count');
    });
  });

  describe('exportAnalyticsData', () => {
    it('should export analytics data as CSV', async () => {
      // Mock the getSearchAnalytics and getPerformanceMetrics methods
      const mockAnalytics: SearchAnalytics = {
        totalSearches: 100,
        averageResponseTime: 250,
        topSearchTerms: [
          { term: 'john doe', count: 25 },
          { term: 'jane smith', count: 15 }
        ],
        zeroResultQueries: [
          { query: 'nonexistent', count: 5 }
        ],
        popularFilters: [
          { filter: 'role', count: 50 }
        ],
        searchTrends: [
          { date: '2023-12-01', count: 50 },
          { date: '2023-12-02', count: 50 }
        ]
      };

      const mockPerformanceMetrics: SearchPerformanceMetrics = {
        averageResponseTime: 250,
        cacheHitRate: 0.7,
        totalSearches: 100,
        errorRate: 0.05,
        popularSearchTerms: [
          { term: 'john doe', count: 25 }
        ],
        slowQueries: [
          { query: 'slow query', responseTime: 2000 }
        ]
      };

      // Spy on the service methods
      jest.spyOn(searchAnalyticsService, 'getSearchAnalytics')
        .mockResolvedValue(mockAnalytics);
      jest.spyOn(searchAnalyticsService, 'getPerformanceMetrics')
        .mockResolvedValue(mockPerformanceMetrics);

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-02T23:59:59Z')
      };

      const csvData = await searchAnalyticsService.exportAnalyticsData(dateRange);

      expect(csvData).toContain('Search Analytics Export');
      expect(csvData).toContain('Total Searches,100');
      expect(csvData).toContain('Average Response Time,250ms');
      expect(csvData).toContain('Cache Hit Rate,70.0%');
      expect(csvData).toContain('john doe,25');
      expect(csvData).toContain('nonexistent,5');
      expect(csvData).toContain('2023-12-01,50');
    });

    it('should handle export errors gracefully', async () => {
      // Mock methods to throw errors
      jest.spyOn(searchAnalyticsService, 'getSearchAnalytics')
        .mockRejectedValue(new Error('Database error'));

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-02T23:59:59Z')
      };

      await expect(searchAnalyticsService.exportAnalyticsData(dateRange))
        .rejects.toThrow('Database error');
    });
  });

  describe('platform detection', () => {
    it('should detect mobile platform', async () => {
      // Mock mobile user agent
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
        },
        writable: true
      });

      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'mobile-event-id' } as any);

      await searchAnalyticsService.trackSearch(
        mockSearchQuery,
        250,
        5,
        false,
        false
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadata: expect.objectContaining({
            platform: 'mobile'
          })
        })
      );
    });

    it('should detect tablet platform', async () => {
      // Mock tablet user agent
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'
        },
        writable: true
      });

      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'tablet-event-id' } as any);

      await searchAnalyticsService.trackSearch(
        mockSearchQuery,
        250,
        5,
        false,
        false
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadata: expect.objectContaining({
            platform: 'tablet'
          })
        })
      );
    });

    it('should handle server-side rendering', async () => {
      // Mock undefined navigator
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true
      });

      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'server-event-id' } as any);

      await searchAnalyticsService.trackSearch(
        mockSearchQuery,
        250,
        5,
        false,
        false
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadata: expect.objectContaining({
            platform: 'server'
          })
        })
      );
    });
  });

  describe('session management', () => {
    it('should generate unique session IDs', async () => {
      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'session-event-id' } as any);

      await searchAnalyticsService.trackSearch(mockSearchQuery, 250, 5, false, false);
      await searchAnalyticsService.trackSearch(mockSearchQuery, 300, 3, false, false);

      expect(mockAddDoc).toHaveBeenCalledTimes(2);
      
      const firstCall = mockAddDoc.mock.calls[0][1];
      const secondCall = mockAddDoc.mock.calls[1][1];
      
      expect(firstCall.sessionId).toBeDefined();
      expect(secondCall.sessionId).toBeDefined();
      expect(firstCall.sessionId).toBe(secondCall.sessionId); // Same session for same service instance
    });
  });

  describe('data validation', () => {
    it('should normalize search terms', async () => {
      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'normalized-event-id' } as any);

      const queryWithSpaces = {
        ...mockSearchQuery,
        term: '  JOHN DOE  ' // Spaces and uppercase
      };

      await searchAnalyticsService.trackSearch(queryWithSpaces, 250, 5, false, false);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          searchTerm: 'john doe' // Should be trimmed and lowercase
        })
      );
    });

    it('should handle empty search terms', async () => {
      const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
      mockAddDoc.mockResolvedValue({ id: 'empty-event-id' } as any);

      const queryWithEmptyTerm = {
        ...mockSearchQuery,
        term: '   ' // Only spaces
      };

      await searchAnalyticsService.trackSearch(queryWithEmptyTerm, 250, 5, false, false);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          searchTerm: '' // Should be empty string
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle Firestore connection errors', async () => {
      const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
      mockGetDocs.mockRejectedValue(new Error('Connection failed'));

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-01T23:59:59Z')
      };

      const analytics = await searchAnalyticsService.getSearchAnalytics(dateRange);

      // Should return default analytics on error
      expect(analytics.totalSearches).toBe(0);
      expect(analytics.averageResponseTime).toBe(0);
      expect(analytics.topSearchTerms).toHaveLength(0);
    });

    it('should handle malformed event data', async () => {
      const malformedEvents = [
        {
          id: 'malformed1',
          data: () => ({
            eventType: 'search_executed',
            // Missing required fields
          })
        },
        {
          id: 'malformed2',
          data: () => ({
            eventType: 'search_executed',
            searchTerm: 'valid search',
            responseTime: 'invalid', // Should be number
            resultCount: 5
          })
        }
      ];

      const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
      mockGetDocs.mockResolvedValue({ docs: malformedEvents } as any);

      const dateRange = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-01T23:59:59Z')
      };

      // Should not throw error and handle gracefully
      const analytics = await searchAnalyticsService.getSearchAnalytics(dateRange);
      expect(analytics).toBeDefined();
    });
  });
});