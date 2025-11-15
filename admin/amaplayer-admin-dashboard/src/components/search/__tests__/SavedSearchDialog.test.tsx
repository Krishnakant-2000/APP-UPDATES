/**
 * Unit Tests for SavedSearchDialog Component
 * Tests save current search dialog with custom naming and validation
 * Requirements tested: 2.3, 2.4, 2.5 (saved search UI requirements)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavedSearchDialog from '../SavedSearchDialog';
import { SavedSearchService } from '@/services/search/savedSearchService';
import { SearchQuery, SavedSearch } from '@/types/models/search';

// Mock the SavedSearchService
jest.mock('@/services/search/savedSearchService');
const mockSavedSearchService = SavedSearchService as jest.Mocked<typeof SavedSearchService>;

// Mock SearchQueryUtils
jest.mock('@/utils/search/searchQueryUtils', () => ({
  __esModule: true,
  default: {
    generateSuggestedName: jest.fn(() => 'Suggested Search Name'),
    getQueryDescription: jest.fn(() => '"test search" in users • 2 filters'),
    hasActiveFilters: jest.fn(() => true),
    getActiveFilterCount: jest.fn(() => 2)
  }
}));

// Mock LoadingSpinner
jest.mock('@/components/common/ui/LoadingSpinner', () => {
  return function MockLoadingSpinner({ size, color }: { size?: string; color?: string }) {
    return <div data-testid="loading-spinner" data-size={size} data-color={color}>Loading...</div>;
  };
});

describe('SavedSearchDialog', () => {
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

  const mockSavedSearch: SavedSearch = {
    id: 'test-id',
    name: 'Test Search',
    query: mockSearchQuery,
    createdAt: new Date('2023-01-01'),
    useCount: 1
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    searchQuery: mockSearchQuery,
    onSave: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSavedSearchService.getSavedSearches.mockResolvedValue([]);
    mockSavedSearchService.saveSearch.mockResolvedValue(mockSavedSearch);
  });

  describe('rendering', () => {
    it('should render when open', () => {
      render(<SavedSearchDialog {...defaultProps} />);
      
      expect(screen.getByText('Save Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Search input')).toBeInTheDocument();
      expect(screen.getByText('Save Search')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<SavedSearchDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Save Search')).not.toBeInTheDocument();
    });

    it('should show update mode for existing search', () => {
      render(
        <SavedSearchDialog 
          {...defaultProps} 
          existingSavedSearch={mockSavedSearch}
        />
      );
      
      expect(screen.getByText('Update Saved Search')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Search')).toBeInTheDocument();
      expect(screen.getByText('Update Search')).toBeInTheDocument();
    });

    it('should display search preview', () => {
      render(<SavedSearchDialog {...defaultProps} />);
      
      expect(screen.getByText('Search Preview:')).toBeInTheDocument();
      expect(screen.getByText('"test search" in users • 2 filters')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should allow typing in name input', async () => {
      const user = userEvent.setup();
      render(<SavedSearchDialog {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'My Custom Search');
      
      expect(nameInput).toHaveValue('My Custom Search');
    });

    it('should suggest name when suggest button is clicked', async () => {
      const user = userEvent.setup();
      render(<SavedSearchDialog {...defaultProps} />);
      
      const suggestButton = screen.getByText('Suggest');
      await user.click(suggestButton);
      
      const nameInput = screen.getByLabelText('Search input');
      expect(nameInput).toHaveValue('Suggested Search Name');
    });

    it('should show character count', () => {
      render(<SavedSearchDialog {...defaultProps} />);
      
      expect(screen.getByText('0/100 characters')).toBeInTheDocument();
    });

    it('should update character count when typing', async () => {
      const user = userEvent.setup();
      render(<SavedSearchDialog {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'Test');
      
      expect(screen.getByText('4/100 characters')).toBeInTheDocument();
    });

    it('should close dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<SavedSearchDialog {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByLabelText('Close dialog');
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should close dialog when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<SavedSearchDialog {...defaultProps} onClose={onClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('save functionality', () => {
    it('should save search with valid name', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      render(<SavedSearchDialog {...defaultProps} onSave={onSave} />);
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'My Search');
      
      const saveButton = screen.getByText('Save Search');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockSavedSearchService.saveSearch).toHaveBeenCalledWith('My Search', mockSearchQuery);
        expect(onSave).toHaveBeenCalledWith(mockSavedSearch);
      });
    });

    it('should show error for empty name', async () => {
      const user = userEvent.setup();
      render(<SavedSearchDialog {...defaultProps} />);
      
      const saveButton = screen.getByText('Save Search');
      await user.click(saveButton);
      
      expect(screen.getByText('Please enter a name for this search')).toBeInTheDocument();
      expect(mockSavedSearchService.saveSearch).not.toHaveBeenCalled();
    });

    it('should show loading state during save', async () => {
      const user = userEvent.setup();
      mockSavedSearchService.saveSearch.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSavedSearch), 100))
      );
      
      render(<SavedSearchDialog {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'My Search');
      
      const saveButton = screen.getByText('Save Search');
      await user.click(saveButton);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      mockSavedSearchService.saveSearch.mockRejectedValue(new Error('Save failed'));
      
      render(<SavedSearchDialog {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'My Search');
      
      const saveButton = screen.getByText('Save Search');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
    });
  });

  describe('name conflict handling', () => {
    beforeEach(() => {
      mockSavedSearchService.getSavedSearches.mockResolvedValue([
        {
          id: 'existing-id',
          name: 'Existing Search',
          query: mockSearchQuery,
          createdAt: new Date(),
          useCount: 1
        }
      ]);
    });

    it('should show overwrite confirmation for conflicting name', async () => {
      const user = userEvent.setup();
      render(<SavedSearchDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockSavedSearchService.getSavedSearches).toHaveBeenCalled();
      });
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'Existing Search');
      
      const saveButton = screen.getByText('Save Search');
      await user.click(saveButton);
      
      expect(screen.getByText('A search with this name already exists')).toBeInTheDocument();
      expect(screen.getByText('Overwrite')).toBeInTheDocument();
    });

    it('should allow overwriting existing search', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      render(<SavedSearchDialog {...defaultProps} onSave={onSave} />);
      
      await waitFor(() => {
        expect(mockSavedSearchService.getSavedSearches).toHaveBeenCalled();
      });
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'Existing Search');
      
      const saveButton = screen.getByText('Save Search');
      await user.click(saveButton);
      
      const overwriteButton = screen.getByText('Overwrite');
      await user.click(overwriteButton);
      
      await waitFor(() => {
        expect(mockSavedSearchService.saveSearch).toHaveBeenCalledWith('Existing Search', mockSearchQuery);
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('should cancel overwrite confirmation', async () => {
      const user = userEvent.setup();
      render(<SavedSearchDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockSavedSearchService.getSavedSearches).toHaveBeenCalled();
      });
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'Existing Search');
      
      const saveButton = screen.getByText('Save Search');
      await user.click(saveButton);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(screen.queryByText('A search with this name already exists')).not.toBeInTheDocument();
      expect(mockSavedSearchService.saveSearch).not.toHaveBeenCalled();
    });

    it('should not show conflict for same search being updated', async () => {
      const user = userEvent.setup();
      render(
        <SavedSearchDialog 
          {...defaultProps} 
          existingSavedSearch={{
            id: 'existing-id',
            name: 'Existing Search',
            query: mockSearchQuery,
            createdAt: new Date(),
            useCount: 1
          }}
        />
      );
      
      await waitFor(() => {
        expect(mockSavedSearchService.getSavedSearches).toHaveBeenCalled();
      });
      
      const saveButton = screen.getByText('Update Search');
      await user.click(saveButton);
      
      expect(screen.queryByText('A search with this name already exists')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SavedSearchDialog {...defaultProps} />);
      
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Search input')).toBeInTheDocument();
    });

    it('should focus name input when dialog opens', async () => {
      render(<SavedSearchDialog {...defaultProps} />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Search input');
        expect(nameInput).toHaveFocus();
      });
    });

    it('should disable buttons during loading', async () => {
      const user = userEvent.setup();
      mockSavedSearchService.saveSearch.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSavedSearch), 100))
      );
      
      render(<SavedSearchDialog {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'My Search');
      
      const saveButton = screen.getByText('Save Search');
      await user.click(saveButton);
      
      expect(saveButton).toBeDisabled();
      expect(screen.getByText('Suggest')).toBeDisabled();
    });
  });

  describe('validation', () => {
    it('should validate name length', async () => {
      const user = userEvent.setup();
      render(<SavedSearchDialog {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('Search input');
      const longName = 'a'.repeat(101);
      
      // Should be limited by maxLength attribute
      await user.type(nameInput, longName);
      expect(nameInput).toHaveValue('a'.repeat(100));
    });

    it('should show character count approaching limit', async () => {
      const user = userEvent.setup();
      render(<SavedSearchDialog {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'a'.repeat(95));
      
      expect(screen.getByText('95/100 characters')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('should close dialog on Escape key', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<SavedSearchDialog {...defaultProps} onClose={onClose} />);
      
      await user.keyboard('{Escape}');
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should submit form on Enter key', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      render(<SavedSearchDialog {...defaultProps} onSave={onSave} />);
      
      const nameInput = screen.getByLabelText('Search input');
      await user.type(nameInput, 'My Search');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockSavedSearchService.saveSearch).toHaveBeenCalled();
      });
    });
  });
});