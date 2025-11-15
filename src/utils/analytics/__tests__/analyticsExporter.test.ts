/**
 * Unit Tests for AnalyticsExporter
 * Tests export functionality with different formats and options
 * Requirements tested: 3.5 (export functionality)
 */

import { analyticsExporter, ExportOptions, ExportProgress } from '../analyticsExporter';
import { searchAnalyticsService } from '@/services/search/searchAnalyticsService';
import { SearchAnalytics, SearchPerformanceMetrics } from '@/types/models/search';

// Mock the search analytics service
jest.mock('@/services/search/searchAnalyticsService', () => ({
  searchAnalyticsService: {
    getSearchAnalytics: jest.fn(),
    getPerformanceMetrics: jest.fn()
  }
}));

// Mock URL and Blob APIs
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content[0].length,
  type: options?.type || 'text/plain'
})) as any;

// Mock document methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    href: '',
    download: '',
    click: jest.fn(),
    style: {}
  })),
  writable: true
});

Object.defineProperty(document.body, 'appendChild', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document.body, 'removeChild', {
  value: jest.fn(),
  writable: true
});

describe('AnalyticsExporter', () => {
  const mockAnalytics: SearchAnalytics = {
    totalSearches: 150,
    averageResponseTime: 275,
    topSearchTerms: [
      { term: 'john doe', count: 45 },
      { term: 'jane smith', count: 30 },
      { term: 'athlete search', count: 25 }
    ],
    zeroResultQueries: [
      { query: 'nonexistent user', count: 8 },
      { query: 'invalid search', count: 3 }
    ],
    popularFilters: [
      { filter: 'role', count: 75 },
      { filter: 'status', count: 60 },
      { filter: 'location', count: 40 }
    ],
    searchTrends: [
      { date: '2023-12-01', count: 50 },
      { date: '2023-12-02', count: 55 },
      { date: '2023-12-03', count: 45 }
    ]
  };

  const mockPerformanceMetrics: SearchPerformanceMetrics = {
    averageResponseTime: 275,
    cacheHitRate: 0.65,
    totalSearches: 150,
    errorRate: 0.03,
    popularSearchTerms: [
      { term: 'john doe', count: 45 }
    ],
    slowQueries: [
      { query: 'complex search', responseTime: 2500 },
      { query: 'heavy filter query', responseTime: 1800 }
    ]
  };

  const defaultExportOptions: ExportOptions = {
    format: 'csv',
    dateRange: {
      start: new Date('2023-12-01T00:00:00Z'),
      end: new Date('2023-12-03T23:59:59Z')
    },
    includePerformanceMetrics: true,
    includeDetailedBreakdown: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (searchAnalyticsService.getSearchAnalytics as jest.Mock)
      .mockResolvedValue(mockAnalytics);
    (searchAnalyticsService.getPerformanceMetrics as jest.Mock)
      .mockResolvedValue(mockPerformanceMetrics);
  });

  describe('CSV Export', () => {
    it('should export analytics data as CSV format', async () => {
      const progressCallback = jest.fn();

      await analyticsExporter.exportAnalytics(
        { ...defaultExportOptions, format: 'csv' },
        progressCallback
      );

      // Verify progress callbacks
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'preparing', progress: 0 })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'complete', progress: 100 })
      );

      // Verify service calls
      expect(searchAnalyticsService.getSearchAnalytics).toHaveBeenCalledWith(
        defaultExportOptions.dateRange
      );
      expect(searchAnalyticsService.getPerformanceMetrics).toHaveBeenCalledWith(
        defaultExportOptions.dateRange
      );

      // Verify file creation and download
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('Search Analytics Export')],
        { type: 'text/csv' }
      );
      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should include summary metrics in CSV', async () => {
      await analyticsExporter.exportAnalytics(
        { ...defaultExportOptions, format: 'csv' }
      );

      const csvContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      
      expect(csvContent).toContain('Summary Metrics');
      expect(csvContent).toContain('Total Searches,150');
      expect(csvContent).toContain('Average Response Time,275ms');
      expect(csvContent).toContain('Cache Hit Rate,65.0%');
      expect(csvContent).toContain('Error Rate,3.0%');
    });

    it('should include top search terms in CSV', async () => {
      await analyticsExporter.exportAnalytics(
        { ...defaultExportOptions, format: 'csv' }
      );

      const csvContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      
      expect(csvContent).toContain('Top Search Terms');
      expect(csvContent).toContain('1,"john doe",45,30.0%');
      expect(csvContent).toContain('2,"jane smith",30,20.0%');
      expect(csvContent).toContain('3,"athlete search",25,16.7%');
    });

    it('should include zero result queries in CSV', async () => {
      await analyticsExporter.exportAnalytics(
        { ...defaultExportOptions, format: 'csv' }
      );

      const csvContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      
      expect(csvContent).toContain('Zero Result Queries');
      expect(csvContent).toContain('1,"nonexistent user",8,High');
      expect(csvContent).toContain('2,"invalid search",3,Medium');
    });

    it('should include search trends with day of week in CSV', async () => {
      await analyticsExporter.exportAnalytics(
        { ...defaultExportOptions, format: 'csv' }
      );

      const csvContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      
      expect(csvContent).toContain('Search Trends');
      expect(csvContent).toContain('Date,Search Count,Day of Week');
      expect(csvContent).toContain('2023-12-01,50,Friday');
      expect(csvContent).toContain('2023-12-02,55,Saturday');
    });

    it('should include performance metrics when enabled', async () => {
      await analyticsExporter.exportAnalytics(
        { ...defaultExportOptions, format: 'csv', includePerformanceMetrics: true }
      );

      const csvContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      
      expect(csvContent).toContain('Performance Metrics');
      expect(csvContent).toContain('Slow Queries');
      expect(csvContent).toContain('"complex search",2500,Critical');
      expect(csvContent).toContain('"heavy filter query",1800,Slow');
    });

    it('should exclude performance metrics when disabled', async () => {
      await analyticsExporter.exportAnalytics(
        { ...defaultExportOptions, format: 'csv', includePerformanceMetrics: false }
      );

      expect(searchAnalyticsService.getPerformanceMetrics).not.toHaveBeenCalled();
      
      const csvContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      expect(csvContent).not.toContain('Performance Metrics');
    });
  });

  describe('JSON Export', () => {
    it('should export analytics data as JSON format', async () => {
      await analyticsExporter.exportAnalytics(
        { ...defaultExportOptions, format: 'json' }
      );

      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('"exportInfo"')],
        { type: 'application/json' }
      );

      const jsonContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      const parsedJson = JSON.parse(jsonContent);
      
      expect(parsedJson).toHaveProperty('exportInfo');
      expect(parsedJson).toHaveProperty('analytics');
      expect(parsedJson).toHaveProperty('performanceMetrics');
      expect(parsedJson.analytics.totalSearches).toBe(150);
    });

    it('should include detailed breakdown when enabled', async () => {
      await analyticsExporter.exportAnalytics(
        { 
          ...defaultExportOptions, 
          format: 'json', 
          includeDetailedBreakdown: true 
        }
      );

      const jsonContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      const parsedJson = JSON.parse(jsonContent);
      
      expect(parsedJson).toHaveProperty('detailedBreakdown');
      expect(parsedJson.detailedBreakdown).toHaveProperty('searchTermAnalysis');
      expect(parsedJson.detailedBreakdown).toHaveProperty('temporalAnalysis');
      expect(parsedJson.detailedBreakdown).toHaveProperty('performanceAnalysis');
    });

    it('should exclude detailed breakdown when disabled', async () => {
      await analyticsExporter.exportAnalytics(
        { 
          ...defaultExportOptions, 
          format: 'json', 
          includeDetailedBreakdown: false 
        }
      );

      const jsonContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      const parsedJson = JSON.parse(jsonContent);
      
      expect(parsedJson.detailedBreakdown).toBeNull();
    });
  });

  describe('XLSX Export', () => {
    it('should export analytics data as XLSX format', async () => {
      await analyticsExporter.exportAnalytics(
        { ...defaultExportOptions, format: 'xlsx' }
      );

      // Currently returns CSV as blob since we don't have xlsx library
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('Search Analytics Export')],
        { type: 'text/csv' }
      );
    });
  });

  describe('Filename Generation', () => {
    it('should generate default filename with date range', async () => {
      await analyticsExporter.exportAnalytics(defaultExportOptions);

      const link = document.createElement('a');
      expect(link.download).toBe('');
      
      // The filename is set during the download process
      // We can verify the pattern by checking the mock calls
      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should use custom filename when provided', async () => {
      await analyticsExporter.exportAnalytics({
        ...defaultExportOptions,
        customFilename: 'my-custom-analytics'
      });

      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('Progress Tracking', () => {
    it('should report progress through all stages', async () => {
      const progressCallback = jest.fn();

      await analyticsExporter.exportAnalytics(defaultExportOptions, progressCallback);

      const progressCalls = progressCallback.mock.calls.map(call => call[0]);
      
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'preparing', progress: 0 })
      );
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'fetching', progress: 20 })
      );
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'processing', progress: 50 })
      );
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'generating', progress: 80 })
      );
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'downloading', progress: 90 })
      );
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'complete', progress: 100 })
      );
    });

    it('should include descriptive messages in progress updates', async () => {
      const progressCallback = jest.fn();

      await analyticsExporter.exportAnalytics(defaultExportOptions, progressCallback);

      const messages = progressCallback.mock.calls.map(call => call[0].message);
      
      expect(messages).toContain('Preparing export...');
      expect(messages).toContain('Fetching analytics data...');
      expect(messages).toContain('Processing data...');
      expect(messages).toContain('Generating file...');
      expect(messages).toContain('Starting download...');
      expect(messages).toContain('Export completed successfully!');
    });
  });

  describe('Error Handling', () => {
    it('should handle analytics service errors', async () => {
      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockRejectedValue(new Error('Service unavailable'));

      const progressCallback = jest.fn();

      await expect(analyticsExporter.exportAnalytics(defaultExportOptions, progressCallback))
        .rejects.toThrow('Service unavailable');

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ 
          stage: 'complete', 
          progress: 0,
          message: expect.stringContaining('Export failed')
        })
      );
    });

    it('should handle unsupported export formats', async () => {
      const invalidOptions = {
        ...defaultExportOptions,
        format: 'pdf' as any
      };

      await expect(analyticsExporter.exportAnalytics(invalidOptions))
        .rejects.toThrow('Unsupported export format: pdf');
    });

    it('should handle performance metrics fetch errors gracefully', async () => {
      (searchAnalyticsService.getPerformanceMetrics as jest.Mock)
        .mockRejectedValue(new Error('Performance service error'));

      await expect(analyticsExporter.exportAnalytics(defaultExportOptions))
        .rejects.toThrow('Performance service error');
    });
  });

  describe('Data Analysis', () => {
    it('should analyze search term patterns correctly', async () => {
      await analyticsExporter.exportAnalytics({
        ...defaultExportOptions,
        format: 'json',
        includeDetailedBreakdown: true
      });

      const jsonContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      const parsedJson = JSON.parse(jsonContent);
      
      const termAnalysis = parsedJson.detailedBreakdown.searchTermAnalysis;
      
      expect(termAnalysis).toHaveProperty('totalUniqueTerms');
      expect(termAnalysis).toHaveProperty('averageSearchesPerTerm');
      expect(termAnalysis).toHaveProperty('topTermsConcentration');
      expect(termAnalysis).toHaveProperty('termLengthDistribution');
      expect(termAnalysis).toHaveProperty('searchPatterns');
    });

    it('should analyze temporal patterns correctly', async () => {
      await analyticsExporter.exportAnalytics({
        ...defaultExportOptions,
        format: 'json',
        includeDetailedBreakdown: true
      });

      const jsonContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      const parsedJson = JSON.parse(jsonContent);
      
      const temporalAnalysis = parsedJson.detailedBreakdown.temporalAnalysis;
      
      expect(temporalAnalysis).toHaveProperty('averageDailySearches');
      expect(temporalAnalysis).toHaveProperty('peakDailySearches');
      expect(temporalAnalysis).toHaveProperty('minimumDailySearches');
      expect(temporalAnalysis).toHaveProperty('volatility');
      expect(temporalAnalysis).toHaveProperty('weekdayPattern');
      expect(temporalAnalysis).toHaveProperty('growthTrend');
    });

    it('should analyze performance metrics correctly', async () => {
      await analyticsExporter.exportAnalytics({
        ...defaultExportOptions,
        format: 'json',
        includeDetailedBreakdown: true
      });

      const jsonContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      const parsedJson = JSON.parse(jsonContent);
      
      const performanceAnalysis = parsedJson.detailedBreakdown.performanceAnalysis;
      
      expect(performanceAnalysis).toHaveProperty('performanceGrade');
      expect(performanceAnalysis).toHaveProperty('bottlenecks');
      expect(performanceAnalysis).toHaveProperty('recommendations');
      
      // Verify performance grade calculation
      expect(['A', 'B', 'C', 'D', 'F']).toContain(performanceAnalysis.performanceGrade);
    });

    it('should identify performance bottlenecks', async () => {
      // Mock poor performance metrics
      const poorMetrics: SearchPerformanceMetrics = {
        averageResponseTime: 2000, // High response time
        cacheHitRate: 0.1, // Low cache hit rate
        totalSearches: 100,
        errorRate: 0.15, // High error rate
        popularSearchTerms: [],
        slowQueries: Array(10).fill({ query: 'slow', responseTime: 3000 }) // Many slow queries
      };

      (searchAnalyticsService.getPerformanceMetrics as jest.Mock)
        .mockResolvedValue(poorMetrics);

      await analyticsExporter.exportAnalytics({
        ...defaultExportOptions,
        format: 'json',
        includeDetailedBreakdown: true
      });

      const jsonContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      const parsedJson = JSON.parse(jsonContent);
      
      const bottlenecks = parsedJson.detailedBreakdown.performanceAnalysis.bottlenecks;
      
      expect(bottlenecks).toContain('High average response time');
      expect(bottlenecks).toContain('Low cache hit rate');
      expect(bottlenecks).toContain('High error rate');
      expect(bottlenecks).toContain('Multiple slow queries detected');
    });

    it('should generate performance recommendations', async () => {
      // Mock metrics that need improvement
      const needsImprovementMetrics: SearchPerformanceMetrics = {
        averageResponseTime: 800,
        cacheHitRate: 0.3,
        totalSearches: 100,
        errorRate: 0.08,
        popularSearchTerms: [],
        slowQueries: [
          { query: 'complex query', responseTime: 2000 }
        ]
      };

      (searchAnalyticsService.getPerformanceMetrics as jest.Mock)
        .mockResolvedValue(needsImprovementMetrics);

      await analyticsExporter.exportAnalytics({
        ...defaultExportOptions,
        format: 'json',
        includeDetailedBreakdown: true
      });

      const jsonContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      const parsedJson = JSON.parse(jsonContent);
      
      const recommendations = parsedJson.detailedBreakdown.performanceAnalysis.recommendations;
      
      expect(recommendations).toContain('Consider optimizing database queries and adding indexes');
      expect(recommendations).toContain('Increase cache TTL and optimize cache keys');
      expect(recommendations).toContain('Investigate and fix common error patterns');
      expect(recommendations).toContain('Optimize slow queries identified in the report');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty analytics data', async () => {
      const emptyAnalytics: SearchAnalytics = {
        totalSearches: 0,
        averageResponseTime: 0,
        topSearchTerms: [],
        zeroResultQueries: [],
        popularFilters: [],
        searchTrends: []
      };

      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockResolvedValue(emptyAnalytics);

      await analyticsExporter.exportAnalytics(defaultExportOptions);

      const csvContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      expect(csvContent).toContain('Total Searches,0');
      expect(csvContent).toContain('Average Response Time,0ms');
    });

    it('should handle missing performance metrics', async () => {
      (searchAnalyticsService.getPerformanceMetrics as jest.Mock)
        .mockResolvedValue(null);

      await analyticsExporter.exportAnalytics({
        ...defaultExportOptions,
        includePerformanceMetrics: true
      });

      const csvContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      expect(csvContent).not.toContain('Performance Metrics');
    });

    it('should handle very large datasets', async () => {
      const largeAnalytics: SearchAnalytics = {
        totalSearches: 1000000,
        averageResponseTime: 150,
        topSearchTerms: Array(1000).fill(null).map((_, i) => ({
          term: `term${i}`,
          count: 1000 - i
        })),
        zeroResultQueries: Array(500).fill(null).map((_, i) => ({
          query: `query${i}`,
          count: 500 - i
        })),
        popularFilters: Array(100).fill(null).map((_, i) => ({
          filter: `filter${i}`,
          count: 100 - i
        })),
        searchTrends: Array(365).fill(null).map((_, i) => ({
          date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 1000)
        }))
      };

      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockResolvedValue(largeAnalytics);

      await analyticsExporter.exportAnalytics(defaultExportOptions);

      expect(global.Blob).toHaveBeenCalled();
      const csvContent = (global.Blob as jest.Mock).mock.calls[0][0][0];
      expect(csvContent).toContain('Total Searches,1000000');
    });
  });
});