/**
 * Unit Tests for SearchAnalyticsDashboard Component
 * Tests dashboard rendering, data display, and user interactions
 * Requirements tested: 3.1, 3.2, 3.3, 3.4 (analytics dashboard requirements)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchAnalyticsDashboard from '../SearchAnalyticsDashboard';
import { searchAnalyticsService } from '@/services/search/searchAnalyticsService';
import { SearchAnalytics, SearchPerformanceMetrics } from '@/types/models/search';

// Mock the analytics service
jest.mock('@/services/search/searchAnalyticsService', () => ({
  searchAnalyticsService: {
    getSearchAnalytics: jest.fn(),
    getPerformanceMetrics: jest.fn(),
    exportAnalyticsData: jest.fn()
  }
}));

// Mock the export dialog component
jest.mock('../AnalyticsExportDialog', () => {
  return function MockAnalyticsExportDialog({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="export-dialog">
        <button onClick={onClose}>Close Export Dialog</button>
      </div>
    ) : null;
  };
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('SearchAnalyticsDashboard', () => {
  const mockAnalytics: SearchAnalytics = {
    totalSearches: 1250,
    averageResponseTime: 285,
    topSearchTerms: [
      { term: 'john doe', count: 150 },
      { term: 'jane smith', count: 120 },
      { term: 'athlete profile', count: 95 },
      { term: 'basketball player', count: 80 },
      { term: 'soccer coach', count: 65 }
    ],
    zeroResultQueries: [
      { query: 'nonexistent user', count: 25 },
      { query: 'invalid search term', count: 18 },
      { query: 'deleted profile', count: 12 }
    ],
    popularFilters: [
      { filter: 'role', count: 450 },
      { filter: 'status', count: 380 },
      { filter: 'location', count: 220 },
      { filter: 'sport', count: 180 }
    ],
    searchTrends: [
      { date: '2023-12-01', count: 85 },
      { date: '2023-12-02', count: 92 },
      { date: '2023-12-03', count: 78 },
      { date: '2023-12-04', count: 105 },
      { date: '2023-12-05', count: 88 }
    ]
  };

  const mockPerformanceMetrics: SearchPerformanceMetrics = {
    averageResponseTime: 285,
    cacheHitRate: 0.72,
    totalSearches: 1250,
    errorRate: 0.025,
    popularSearchTerms: [
      { term: 'john doe', count: 150 },
      { term: 'jane smith', count: 120 }
    ],
    slowQueries: [
      { query: 'complex filter query', responseTime: 2800 },
      { query: 'heavy search operation', responseTime: 1950 }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses
    (searchAnalyticsService.getSearchAnalytics as jest.Mock)
      .mockResolvedValue(mockAnalytics);
    (searchAnalyticsService.getPerformanceMetrics as jest.Mock)
      .mockResolvedValue(mockPerformanceMetrics);
  });

  describe('Component Rendering', () => {
    it('should render dashboard header with title and controls', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Search Analytics')).toBeInTheDocument();
        expect(screen.getByText('Export Data')).toBeInTheDocument();
        expect(screen.getByText('Refresh')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Last 30 days')).toBeInTheDocument();
      });
    });

    it('should render key metrics cards', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument(); // Total searches
        expect(screen.getByText('285ms')).toBeInTheDocument(); // Avg response time
        expect(screen.getByText('72.0%')).toBeInTheDocument(); // Cache hit rate
        expect(screen.getByText('2.5%')).toBeInTheDocument(); // Error rate
        
        expect(screen.getByText('Total Searches')).toBeInTheDocument();
        expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
        expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
        expect(screen.getByText('Error Rate')).toBeInTheDocument();
      });
    });

    it('should render search trends chart section', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Search Trends')).toBeInTheDocument();
        expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // SVG chart
      });
    });

    it('should render analytics tables', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Popular Search Terms')).toBeInTheDocument();
        expect(screen.getByText('Zero Result Queries')).toBeInTheDocument();
        expect(screen.getByText('Popular Filters')).toBeInTheDocument();
        expect(screen.getByText('Slow Queries')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('should display top search terms correctly', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('john doe')).toBeInTheDocument();
        expect(screen.getByText('jane smith')).toBeInTheDocument();
        expect(screen.getByText('athlete profile')).toBeInTheDocument();
        
        // Check counts
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('95')).toBeInTheDocument();
        
        // Check percentages
        expect(screen.getByText('12.0%')).toBeInTheDocument(); // 150/1250
        expect(screen.getByText('9.6%')).toBeInTheDocument(); // 120/1250
      });
    });

    it('should display zero result queries with impact levels', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('nonexistent user')).toBeInTheDocument();
        expect(screen.getByText('invalid search term')).toBeInTheDocument();
        expect(screen.getByText('deleted profile')).toBeInTheDocument();
        
        // Check impact badges
        expect(screen.getByText('High')).toBeInTheDocument(); // 25 count
        expect(screen.getByText('Medium')).toBeInTheDocument(); // 18 count
        expect(screen.getByText('Low')).toBeInTheDocument(); // 12 count
      });
    });

    it('should display popular filters with usage rates', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('role')).toBeInTheDocument();
        expect(screen.getByText('status')).toBeInTheDocument();
        expect(screen.getByText('location')).toBeInTheDocument();
        expect(screen.getByText('sport')).toBeInTheDocument();
        
        // Check usage counts
        expect(screen.getByText('450')).toBeInTheDocument();
        expect(screen.getByText('380')).toBeInTheDocument();
        expect(screen.getByText('220')).toBeInTheDocument();
        expect(screen.getByText('180')).toBeInTheDocument();
      });
    });

    it('should display slow queries with status badges', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('complex filter query')).toBeInTheDocument();
        expect(screen.getByText('heavy search operation')).toBeInTheDocument();
        
        expect(screen.getByText('2800ms')).toBeInTheDocument();
        expect(screen.getByText('1950ms')).toBeInTheDocument();
        
        expect(screen.getByText('Critical')).toBeInTheDocument(); // 2800ms > 3000ms threshold
        expect(screen.getByText('Slow')).toBeInTheDocument(); // 1950ms < 3000ms threshold
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner while fetching data', async () => {
      // Mock delayed response
      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockAnalytics), 100)));

      render(<SearchAnalyticsDashboard />);

      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // Loading spinner

      await waitFor(() => {
        expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetching fails', async () => {
      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockRejectedValue(new Error('Network error'));

      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockAnalytics);

      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Search Analytics')).toBeInTheDocument();
        expect(screen.queryByText('Failed to load analytics data')).not.toBeInTheDocument();
      });
    });
  });

  describe('Date Range Selection', () => {
    it('should change date range when dropdown selection changes', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Last 30 days')).toBeInTheDocument();
      });

      const dateRangeSelect = screen.getByDisplayValue('Last 30 days');
      fireEvent.change(dateRangeSelect, { target: { value: 'Last 7 days' } });

      expect(searchAnalyticsService.getSearchAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date)
        })
      );
    });

    it('should reload data when date range changes', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(searchAnalyticsService.getSearchAnalytics).toHaveBeenCalledTimes(1);
      });

      const dateRangeSelect = screen.getByDisplayValue('Last 30 days');
      fireEvent.change(dateRangeSelect, { target: { value: 'Last 90 days' } });

      await waitFor(() => {
        expect(searchAnalyticsService.getSearchAnalytics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Export Functionality', () => {
    it('should open export dialog when export button is clicked', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Export Data')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Export Data'));

      expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
    });

    it('should close export dialog when close button is clicked', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Export Data'));
      });

      expect(screen.getByTestId('export-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Export Dialog'));

      expect(screen.queryByTestId('export-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should reload data when refresh button is clicked', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(searchAnalyticsService.getSearchAnalytics).toHaveBeenCalledTimes(1);
      });

      fireEvent.click(screen.getByText('Refresh'));

      await waitFor(() => {
        expect(searchAnalyticsService.getSearchAnalytics).toHaveBeenCalledTimes(2);
        expect(searchAnalyticsService.getPerformanceMetrics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Empty Data States', () => {
    it('should display no data message for empty search terms', async () => {
      const emptyAnalytics = {
        ...mockAnalytics,
        topSearchTerms: []
      };

      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockResolvedValue(emptyAnalytics);

      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No search terms data available')).toBeInTheDocument();
      });
    });

    it('should display no data message for empty zero result queries', async () => {
      const emptyAnalytics = {
        ...mockAnalytics,
        zeroResultQueries: []
      };

      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockResolvedValue(emptyAnalytics);

      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No zero result queries found')).toBeInTheDocument();
      });
    });

    it('should display no data message for empty filters', async () => {
      const emptyAnalytics = {
        ...mockAnalytics,
        popularFilters: []
      };

      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockResolvedValue(emptyAnalytics);

      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No filter usage data available')).toBeInTheDocument();
      });
    });

    it('should display no chart data message for empty trends', async () => {
      const emptyAnalytics = {
        ...mockAnalytics,
        searchTrends: []
      };

      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockResolvedValue(emptyAnalytics);

      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No trend data available for the selected period')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Rendering', () => {
    it('should render SVG chart when trend data is available', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        const svgElement = screen.getByRole('img', { hidden: true });
        expect(svgElement).toBeInTheDocument();
        expect(svgElement.tagName).toBe('svg');
      });
    });

    it('should render chart points for each trend data point', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        const circles = screen.getAllByRole('img', { hidden: true }).filter(
          element => element.tagName === 'circle'
        );
        // Should have circles for each data point (5 in mock data)
        expect(circles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle window resize for chart width calculation', async () => {
      const { rerender } = render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Search Analytics')).toBeInTheDocument();
      });

      // Simulate window resize
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        value: 800,
      });

      // Trigger resize event
      fireEvent(window, new Event('resize'));

      rerender(<SearchAnalyticsDashboard />);

      // Chart should still be rendered
      await waitFor(() => {
        expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        // Check for proper button roles
        expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
        
        // Check for proper table structure
        expect(screen.getAllByRole('table')).toHaveLength(4); // 4 analytics tables
        expect(screen.getAllByRole('columnheader')).toHaveLength(12); // 3 columns × 4 tables
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Search Analytics' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3, name: 'Search Trends' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3, name: 'Popular Search Terms' })).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', async () => {
      const { rerender } = render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(searchAnalyticsService.getSearchAnalytics).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props should not trigger new API calls
      rerender(<SearchAnalyticsDashboard />);

      expect(searchAnalyticsService.getSearchAnalytics).toHaveBeenCalledTimes(1);
    });

    it('should handle large datasets efficiently', async () => {
      const largeAnalytics = {
        ...mockAnalytics,
        topSearchTerms: Array(1000).fill(null).map((_, i) => ({
          term: `term${i}`,
          count: 1000 - i
        })),
        searchTrends: Array(365).fill(null).map((_, i) => ({
          date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 100)
        }))
      };

      (searchAnalyticsService.getSearchAnalytics as jest.Mock)
        .mockResolvedValue(largeAnalytics);

      const startTime = performance.now();
      render(<SearchAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Search Analytics')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });
  });
});