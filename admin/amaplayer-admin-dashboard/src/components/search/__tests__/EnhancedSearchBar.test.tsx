import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnhancedSearchBar from '../EnhancedSearchBar';
import { SearchQuery, SearchType } from '@/types/models/search';
import { enhancedSearchService } from '@/services/search/enhancedSearchService';

// Mock the enhanced search service
jest.mock('@/services/search/enhancedSearchService', () => ({
  enhancedSearchService: {
    getAutoCompleteSuggestions: jest.fn(),
    getSavedSearches: jest.fn()
  }
}));

const mockEnhancedSearchService = enhancedSearchService as jest.Mocked<typeof enhancedSearchService>;

describe('EnhancedSearchBar', () => {
  const mockOnSearch = jest.fn();
  
  const defaultProps = {
    onSearch: mockOnSearch,
    searchTypes: ['all', 'users', 'videos'] as SearchType[],
    enableAutoComplete: true,
    enableSavedSearches: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnhancedSearchService.getSavedSearches.mockReturnValue([]);
    mockEnhancedSearchService.getAutoCompleteSuggestions.mockResolvedValue({
      success: true,
      data: [],
      responseTime: 100
    });
  });

  it('renders search input with placeholder', () => {
    render(<EnhancedSearchBar {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Search users, videos, events...')).toBeInTheDocument();
  });

  it('renders search type selector when multiple types provided', () => {
    render(<EnhancedSearchBar {...defaultProps} />);
    
    expect(screen.getByLabelText('Search type')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All')).toBeInTheDocument();
  });

  it('does not render search type selector for single type', () => {
    render(<EnhancedSearchBar {...defaultProps} searchTypes={['users']} />);
    
    expect(screen.queryByLabelText('Search type')).not.toBeInTheDocument();
  });

  it('calls onSearch when form is submitted', async () => {
    const user = userEvent.setup();
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search input');
    const searchButton = screen.getByLabelText('Execute search');
    
    await user.type(searchInput, 'test query');
    await user.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith({
      term: 'test query',
      searchType: 'all',
      filters: {},
      limit: 20,
      fuzzyMatching: true
    });
  });

  it('prevents submission with empty search term', async () => {
    const user = userEvent.setup();
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchButton = screen.getByLabelText('Execute search');
    
    await user.click(searchButton);
    
    expect(mockOnSearch).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter a search term')).toBeInTheDocument();
  });

  it('changes search type when selector is changed', async () => {
    const user = userEvent.setup();
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchTypeSelector = screen.getByLabelText('Search type');
    const searchInput = screen.getByLabelText('Search input');
    const searchButton = screen.getByLabelText('Execute search');
    
    await user.selectOptions(searchTypeSelector, 'users');
    await user.type(searchInput, 'test');
    await user.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        searchType: 'users'
      })
    );
  });

  it('shows auto-complete suggestions when typing', async () => {
    const user = userEvent.setup();
    mockEnhancedSearchService.getAutoCompleteSuggestions.mockResolvedValue({
      success: true,
      data: ['suggestion 1', 'suggestion 2'],
      responseTime: 100
    });
    
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search input');
    await user.type(searchInput, 'test');
    
    await waitFor(() => {
      expect(screen.getByText('suggestion 1')).toBeInTheDocument();
      expect(screen.getByText('suggestion 2')).toBeInTheDocument();
    });
  });

  it('executes search when suggestion is clicked', async () => {
    const user = userEvent.setup();
    mockEnhancedSearchService.getAutoCompleteSuggestions.mockResolvedValue({
      success: true,
      data: ['test suggestion'],
      responseTime: 100
    });
    
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search input');
    await user.type(searchInput, 'test');
    
    await waitFor(() => {
      expect(screen.getByText('test suggestion')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('test suggestion'));
    
    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        term: 'test suggestion'
      })
    );
  });

  it('shows saved searches when button is clicked', async () => {
    const user = userEvent.setup();
    const savedSearches = [
      {
        id: '1',
        name: 'My Search',
        query: { term: 'athletes', searchType: 'users' as SearchType, filters: {} },
        createdAt: new Date(),
        useCount: 5
      }
    ];
    
    mockEnhancedSearchService.getSavedSearches.mockReturnValue(savedSearches);
    
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const savedSearchButton = screen.getByLabelText('Show saved searches');
    await user.click(savedSearchButton);
    
    expect(screen.getByText('Saved Searches')).toBeInTheDocument();
    expect(screen.getByText('My Search')).toBeInTheDocument();
    expect(screen.getByText('athletes')).toBeInTheDocument();
  });

  it('executes saved search when clicked', async () => {
    const user = userEvent.setup();
    const savedSearches = [
      {
        id: '1',
        name: 'My Search',
        query: { 
          term: 'athletes', 
          searchType: 'users' as SearchType, 
          filters: { role: ['athlete'] }
        },
        createdAt: new Date(),
        useCount: 5
      }
    ];
    
    mockEnhancedSearchService.getSavedSearches.mockReturnValue(savedSearches);
    
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const savedSearchButton = screen.getByLabelText('Show saved searches');
    await user.click(savedSearchButton);
    
    const savedSearchItem = screen.getByText('My Search');
    await user.click(savedSearchItem);
    
    expect(mockOnSearch).toHaveBeenCalledWith({
      term: 'athletes',
      searchType: 'users',
      filters: { role: ['athlete'] }
    });
  });

  it('closes dropdowns when clicking outside', async () => {
    const user = userEvent.setup();
    mockEnhancedSearchService.getAutoCompleteSuggestions.mockResolvedValue({
      success: true,
      data: ['suggestion'],
      responseTime: 100
    });
    
    render(
      <div>
        <EnhancedSearchBar {...defaultProps} />
        <div data-testid="outside">Outside element</div>
      </div>
    );
    
    const searchInput = screen.getByLabelText('Search input');
    await user.type(searchInput, 'test');
    
    await waitFor(() => {
      expect(screen.getByText('suggestion')).toBeInTheDocument();
    });
    
    await user.click(screen.getByTestId('outside'));
    
    expect(screen.queryByText('suggestion')).not.toBeInTheDocument();
  });

  it('closes dropdowns when Escape key is pressed', async () => {
    const user = userEvent.setup();
    mockEnhancedSearchService.getAutoCompleteSuggestions.mockResolvedValue({
      success: true,
      data: ['suggestion'],
      responseTime: 100
    });
    
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search input');
    await user.type(searchInput, 'test');
    
    await waitFor(() => {
      expect(screen.getByText('suggestion')).toBeInTheDocument();
    });
    
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    
    expect(screen.queryByText('suggestion')).not.toBeInTheDocument();
  });

  it('shows loading spinner when search is in progress', async () => {
    const user = userEvent.setup();
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search input');
    const searchButton = screen.getByLabelText('Execute search');
    
    await user.type(searchInput, 'test');
    
    // Mock a slow search to test loading state
    mockOnSearch.mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    await user.click(searchButton);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('disables search button when input is empty', () => {
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchButton = screen.getByLabelText('Execute search');
    
    expect(searchButton).toBeDisabled();
  });

  it('enables search button when input has text', async () => {
    const user = userEvent.setup();
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search input');
    const searchButton = screen.getByLabelText('Execute search');
    
    await user.type(searchInput, 'test');
    
    expect(searchButton).not.toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EnhancedSearchBar {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('uses custom placeholder', () => {
    render(
      <EnhancedSearchBar 
        {...defaultProps} 
        placeholder="Custom placeholder" 
      />
    );
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('handles auto-complete service errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockEnhancedSearchService.getAutoCompleteSuggestions.mockRejectedValue(
      new Error('Service error')
    );
    
    render(<EnhancedSearchBar {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search input');
    await user.type(searchInput, 'test');
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Auto-complete error:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });
});