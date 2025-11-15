/**
 * Unit Tests for SavedSearchService
 * Tests saved search creation, loading, deletion, and local storage integration
 * Requirements tested: 2.3, 2.4, 2.5 (saved search requirements)
 */

import { SavedSearchService } from '../savedSearchService';
import { SearchQuery, SavedSearch, SearchErrorType } from '@/types/models/search';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SavedSearchService', () => {
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

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('getSavedSearches', () => {
    it('should return empty array when no saved searches exist', async () => {
      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toEqual([]);
    });

    it('should return saved searches from localStorage', async () => {
      const mockSavedSearch: SavedSearch = {
        id: 'test-id',
        name: 'Test Search',
        query: mockSearchQuery,
        createdAt: new Date('2023-01-01'),
        useCount: 1
      };

      localStorageMock.setItem('admin_saved_searches', JSON.stringify([mockSavedSearch]));

      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toHaveLength(1);
      expect(searches[0].name).toBe('Test Search');
      expect(searches[0].query.term).toBe('test search');
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      localStorageMock.setItem('admin_saved_searches', 'invalid json');

      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toEqual([]);
    });

    it('should convert date strings back to Date objects', async () => {
      const mockData = [{
        id: 'test-id',
        name: 'Test Search',
        query: {
          ...mockSearchQuery,
          filters: {
            ...mockSearchQuery.filters,
            dateRange: {
              start: '2023-01-01T00:00:00.000Z',
              end: '2023-12-31T23:59:59.999Z',
              field: 'createdAt'
            }
          }
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        lastUsed: '2023-01-02T00:00:00.000Z',
        useCount: 1
      }];

      localStorageMock.setItem('admin_saved_searches', JSON.stringify(mockData));

      const searches = await SavedSearchService.getSavedSearches();
      expect(searches[0].createdAt).toBeInstanceOf(Date);
      expect(searches[0].lastUsed).toBeInstanceOf(Date);
      expect(searches[0].query.filters.dateRange?.start).toBeInstanceOf(Date);
      expect(searches[0].query.filters.dateRange?.end).toBeInstanceOf(Date);
    });
  });

  describe('saveSearch', () => {
    it('should save a new search successfully', async () => {
      const savedSearch = await SavedSearchService.saveSearch('My Search', mockSearchQuery);

      expect(savedSearch.name).toBe('My Search');
      expect(savedSearch.query).toEqual(expect.objectContaining({
        term: 'test search',
        searchType: 'users'
      }));
      expect(savedSearch.id).toBeDefined();
      expect(savedSearch.createdAt).toBeInstanceOf(Date);
      expect(savedSearch.useCount).toBe(1);
    });

    it('should update existing search with same name', async () => {
      // Save initial search
      const firstSave = await SavedSearchService.saveSearch('My Search', mockSearchQuery);
      
      // Save again with same name but different query
      const updatedQuery = { ...mockSearchQuery, term: 'updated search' };
      const secondSave = await SavedSearchService.saveSearch('My Search', updatedQuery);

      expect(secondSave.id).toBe(firstSave.id);
      expect(secondSave.query.term).toBe('updated search');
      expect(secondSave.useCount).toBe(2);
      expect(secondSave.createdAt).toEqual(firstSave.createdAt);
    });

    it('should validate search name', async () => {
      await expect(SavedSearchService.saveSearch('', mockSearchQuery))
        .rejects.toThrow('Search name is required');

      await expect(SavedSearchService.saveSearch('   ', mockSearchQuery))
        .rejects.toThrow('Search name cannot be empty');

      const longName = 'a'.repeat(101);
      await expect(SavedSearchService.saveSearch(longName, mockSearchQuery))
        .rejects.toThrow('Search name cannot exceed 100 characters');

      await expect(SavedSearchService.saveSearch('Invalid@Name!', mockSearchQuery))
        .rejects.toThrow('Search name contains invalid characters');
    });

    it('should validate search query', async () => {
      const invalidQuery = { ...mockSearchQuery, searchType: 'invalid' as any };
      await expect(SavedSearchService.saveSearch('Test', invalidQuery))
        .rejects.toThrow('Invalid search type');
    });

    it('should enforce maximum saved searches limit', async () => {
      // Create 51 saved searches (exceeding the limit of 50)
      const promises = [];
      for (let i = 0; i < 51; i++) {
        promises.push(SavedSearchService.saveSearch(`Search ${i}`, {
          ...mockSearchQuery,
          term: `search ${i}`
        }));
      }

      await Promise.all(promises);

      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toHaveLength(50);
    });

    it('should sanitize query data', async () => {
      const messyQuery: SearchQuery = {
        term: '  test search  ',
        searchType: 'users',
        filters: {},
        limit: 200, // Should be capped at 100
        offset: -5 // Should be set to 0
      };

      const savedSearch = await SavedSearchService.saveSearch('Test', messyQuery);
      
      expect(savedSearch.query.term).toBe('test search');
      expect(savedSearch.query.limit).toBe(100);
      expect(savedSearch.query.offset).toBe(0);
    });
  });

  describe('deleteSavedSearch', () => {
    it('should delete existing saved search', async () => {
      const savedSearch = await SavedSearchService.saveSearch('Test Search', mockSearchQuery);
      
      await SavedSearchService.deleteSavedSearch(savedSearch.id);
      
      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toHaveLength(0);
    });

    it('should throw error when deleting non-existent search', async () => {
      await expect(SavedSearchService.deleteSavedSearch('non-existent-id'))
        .rejects.toThrow('Saved search not found');
    });
  });

  describe('updateSavedSearch', () => {
    it('should update search name', async () => {
      const savedSearch = await SavedSearchService.saveSearch('Original Name', mockSearchQuery);
      
      const updated = await SavedSearchService.updateSavedSearch(savedSearch.id, {
        name: 'Updated Name'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.query).toEqual(savedSearch.query);
    });

    it('should update search query', async () => {
      const savedSearch = await SavedSearchService.saveSearch('Test Search', mockSearchQuery);
      const newQuery = { ...mockSearchQuery, term: 'new search term' };
      
      const updated = await SavedSearchService.updateSavedSearch(savedSearch.id, {
        query: newQuery
      });

      expect(updated.query.term).toBe('new search term');
      expect(updated.name).toBe('Test Search');
    });

    it('should prevent name conflicts during update', async () => {
      await SavedSearchService.saveSearch('Search 1', mockSearchQuery);
      const search2 = await SavedSearchService.saveSearch('Search 2', mockSearchQuery);

      await expect(SavedSearchService.updateSavedSearch(search2.id, {
        name: 'Search 1'
      })).rejects.toThrow('A saved search with this name already exists');
    });

    it('should throw error when updating non-existent search', async () => {
      await expect(SavedSearchService.updateSavedSearch('non-existent-id', {
        name: 'New Name'
      })).rejects.toThrow('Saved search not found');
    });
  });

  describe('getSavedSearchById', () => {
    it('should return saved search by ID', async () => {
      const savedSearch = await SavedSearchService.saveSearch('Test Search', mockSearchQuery);
      
      const found = await SavedSearchService.getSavedSearchById(savedSearch.id);
      
      expect(found).toBeTruthy();
      expect(found?.name).toBe('Test Search');
    });

    it('should return null for non-existent ID', async () => {
      const found = await SavedSearchService.getSavedSearchById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('markSearchAsUsed', () => {
    it('should update lastUsed and useCount', async () => {
      const savedSearch = await SavedSearchService.saveSearch('Test Search', mockSearchQuery);
      const originalUseCount = savedSearch.useCount;
      
      await SavedSearchService.markSearchAsUsed(savedSearch.id);
      
      const updated = await SavedSearchService.getSavedSearchById(savedSearch.id);
      expect(updated?.useCount).toBe(originalUseCount + 1);
      expect(updated?.lastUsed).toBeInstanceOf(Date);
    });

    it('should handle non-existent search gracefully', async () => {
      // Should not throw error
      await expect(SavedSearchService.markSearchAsUsed('non-existent-id'))
        .resolves.toBeUndefined();
    });
  });

  describe('getFrequentlyUsedSearches', () => {
    it('should return searches sorted by use count', async () => {
      const search1 = await SavedSearchService.saveSearch('Search 1', mockSearchQuery);
      const search2 = await SavedSearchService.saveSearch('Search 2', mockSearchQuery);
      const search3 = await SavedSearchService.saveSearch('Search 3', mockSearchQuery);

      // Use searches different amounts
      await SavedSearchService.markSearchAsUsed(search2.id);
      await SavedSearchService.markSearchAsUsed(search2.id);
      await SavedSearchService.markSearchAsUsed(search3.id);

      const frequent = await SavedSearchService.getFrequentlyUsedSearches(3);
      
      expect(frequent).toHaveLength(3);
      expect(frequent[0].id).toBe(search2.id); // Most used (3 total)
      expect(frequent[1].id).toBe(search3.id); // Second most used (2 total)
      expect(frequent[2].id).toBe(search1.id); // Least used (1 total)
    });

    it('should respect limit parameter', async () => {
      await SavedSearchService.saveSearch('Search 1', mockSearchQuery);
      await SavedSearchService.saveSearch('Search 2', mockSearchQuery);
      await SavedSearchService.saveSearch('Search 3', mockSearchQuery);

      const frequent = await SavedSearchService.getFrequentlyUsedSearches(2);
      expect(frequent).toHaveLength(2);
    });
  });

  describe('clearAllSavedSearches', () => {
    it('should remove all saved searches', async () => {
      await SavedSearchService.saveSearch('Search 1', mockSearchQuery);
      await SavedSearchService.saveSearch('Search 2', mockSearchQuery);

      await SavedSearchService.clearAllSavedSearches();

      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toHaveLength(0);
    });
  });

  describe('exportSavedSearches', () => {
    it('should export searches as JSON string', async () => {
      await SavedSearchService.saveSearch('Test Search', mockSearchQuery);

      const exported = await SavedSearchService.exportSavedSearches();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Test Search');
    });
  });

  describe('importSavedSearches', () => {
    it('should import valid searches', async () => {
      const importData = [{
        id: 'import-id',
        name: 'Imported Search',
        query: mockSearchQuery,
        createdAt: new Date().toISOString(),
        useCount: 1
      }];

      const importedCount = await SavedSearchService.importSavedSearches(
        JSON.stringify(importData),
        false
      );

      expect(importedCount).toBe(1);
      
      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toHaveLength(1);
      expect(searches[0].name).toBe('Imported Search');
    });

    it('should handle name conflicts during import', async () => {
      // Create existing search
      await SavedSearchService.saveSearch('Existing Search', mockSearchQuery);

      const importData = [{
        id: 'import-id',
        name: 'Existing Search',
        query: mockSearchQuery,
        createdAt: new Date().toISOString(),
        useCount: 1
      }];

      // Import without overwrite
      const importedCount = await SavedSearchService.importSavedSearches(
        JSON.stringify(importData),
        false
      );

      expect(importedCount).toBe(0); // Should not import due to name conflict
      
      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toHaveLength(1); // Only original search
    });

    it('should overwrite existing searches when specified', async () => {
      // Create existing search
      const existing = await SavedSearchService.saveSearch('Test Search', mockSearchQuery);

      const importData = [{
        id: 'import-id',
        name: 'Test Search',
        query: { ...mockSearchQuery, term: 'imported term' },
        createdAt: new Date().toISOString(),
        useCount: 5
      }];

      const importedCount = await SavedSearchService.importSavedSearches(
        JSON.stringify(importData),
        true
      );

      expect(importedCount).toBe(1);
      
      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toHaveLength(1);
      expect(searches[0].query.term).toBe('imported term');
      expect(searches[0].useCount).toBe(5);
    });

    it('should validate import data format', async () => {
      await expect(SavedSearchService.importSavedSearches('invalid json', false))
        .rejects.toThrow();

      await expect(SavedSearchService.importSavedSearches('{"not": "array"}', false))
        .rejects.toThrow('Invalid import data format');
    });

    it('should filter out invalid searches during import', async () => {
      const importData = [
        {
          id: 'valid-id',
          name: 'Valid Search',
          query: mockSearchQuery,
          createdAt: new Date().toISOString(),
          useCount: 1
        },
        {
          id: 'invalid-id',
          name: '', // Invalid name
          query: mockSearchQuery,
          createdAt: new Date().toISOString(),
          useCount: 1
        }
      ];

      const importedCount = await SavedSearchService.importSavedSearches(
        JSON.stringify(importData),
        false
      );

      expect(importedCount).toBe(1); // Only valid search imported
      
      const searches = await SavedSearchService.getSavedSearches();
      expect(searches).toHaveLength(1);
      expect(searches[0].name).toBe('Valid Search');
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(SavedSearchService.saveSearch('Test', mockSearchQuery))
        .rejects.toThrow('Failed to save search');
    });

    it('should return appropriate error types', async () => {
      try {
        await SavedSearchService.saveSearch('', mockSearchQuery);
      } catch (error: any) {
        expect(error.message).toContain('Search name is required');
      }

      try {
        await SavedSearchService.deleteSavedSearch('non-existent');
      } catch (error: any) {
        expect(error.message).toContain('Saved search not found');
      }
    });
  });
});