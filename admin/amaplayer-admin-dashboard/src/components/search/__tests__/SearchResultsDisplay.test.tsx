import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchResultsDisplay from '../SearchResultsDisplay';
import { SearchResults, TalentVideo } from '@/types/models/search';
import { User, Event } from '@/types/models';

describe('SearchResultsDisplay', () => {
  const mockOnItemClick = jest.fn();
  const mockOnFacetClick = jest.fn();

  const mockUser: User = {
    id: 'user1',
    displayName: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe',
    bio: 'Professional athlete',
    role: 'athlete',
    isVerified: true,
    isActive: true,
    location: 'New York',
    photoURL: 'https://example.com/photo.jpg',
    createdAt: new Date('2023-01-01')
  };

  const mockVideo: TalentVideo = {
    id: 'video1',
    title: 'Amazing Basketball Skills',
    description: 'Check out these incredible moves',
    userId: 'user1',
    userName: 'John Doe',
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    verificationStatus: 'approved',
    category: 'skills',
    isActive: true,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02')
  };

  const mockEvent: Event = {
    id: 'event1',
    title: 'Basketball Tournament',
    description: 'Annual championship game',
    location: 'Madison Square Garden',
    status: 'active',
    isActive: true,
    createdAt: new Date('2023-01-03')
  };

  const defaultProps = {
    searchTerm: 'basketball',
    onItemClick: mockOnItemClick,
    onFacetClick: mockOnFacetClick
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders no results state when items array is empty', () => {
    const emptyResults: SearchResults = {
      items: [],
      totalCount: 0,
      searchTime: 100,
      query: { term: 'test', searchType: 'all', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={emptyResults} />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('We couldn\'t find anything matching "basketball"')).toBeInTheDocument();
  });

  it('renders search suggestions in no results state', () => {
    const emptyResults: SearchResults = {
      items: [],
      totalCount: 0,
      searchTime: 100,
      suggestions: ['basketball', 'football', 'soccer'],
      query: { term: 'test', searchType: 'all', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={emptyResults} />);

    expect(screen.getByText('Did you mean:')).toBeInTheDocument();
    expect(screen.getByText('basketball')).toBeInTheDocument();
    expect(screen.getByText('football')).toBeInTheDocument();
    expect(screen.getByText('soccer')).toBeInTheDocument();
  });

  it('renders results count and search time', () => {
    const results: SearchResults = {
      items: [mockUser, mockVideo],
      totalCount: 2,
      searchTime: 150,
      query: { term: 'test', searchType: 'all', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    expect(screen.getByText('2 results found in 150ms')).toBeInTheDocument();
  });

  it('renders user card with highlighted search terms', () => {
    const results: SearchResults = {
      items: [mockUser],
      totalCount: 1,
      searchTime: 100,
      relevanceScores: { user1: 0.85 },
      query: { term: 'john', searchType: 'users', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} searchTerm="john" results={results} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    expect(screen.getByText('Professional athlete')).toBeInTheDocument();
    expect(screen.getByText('athlete')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // Relevance score
  });

  it('renders video card with highlighted search terms', () => {
    const results: SearchResults = {
      items: [mockVideo],
      totalCount: 1,
      searchTime: 100,
      relevanceScores: { video1: 0.92 },
      query: { term: 'basketball', searchType: 'videos', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    expect(screen.getByText('Amazing Basketball Skills')).toBeInTheDocument();
    expect(screen.getByText('by John Doe')).toBeInTheDocument();
    expect(screen.getByText('Check out these incredible moves')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('skills')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument(); // Relevance score
  });

  it('renders event card with highlighted search terms', () => {
    const results: SearchResults = {
      items: [mockEvent],
      totalCount: 1,
      searchTime: 100,
      relevanceScores: { event1: 0.78 },
      query: { term: 'tournament', searchType: 'events', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    expect(screen.getByText('Basketball Tournament')).toBeInTheDocument();
    expect(screen.getByText('Madison Square Garden')).toBeInTheDocument();
    expect(screen.getByText('Annual championship game')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument(); // Relevance score
  });

  it('calls onItemClick when user card is clicked', async () => {
    const user = userEvent.setup();
    const results: SearchResults = {
      items: [mockUser],
      totalCount: 1,
      searchTime: 100,
      query: { term: 'test', searchType: 'users', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    const userCard = screen.getByText('John Doe').closest('.result-card');
    await user.click(userCard!);

    expect(mockOnItemClick).toHaveBeenCalledWith(mockUser);
  });

  it('calls onItemClick when video card is clicked', async () => {
    const user = userEvent.setup();
    const results: SearchResults = {
      items: [mockVideo],
      totalCount: 1,
      searchTime: 100,
      query: { term: 'test', searchType: 'videos', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    const videoCard = screen.getByText('Amazing Basketball Skills').closest('.result-card');
    await user.click(videoCard!);

    expect(mockOnItemClick).toHaveBeenCalledWith(mockVideo);
  });

  it('renders facets sidebar when facets are provided', () => {
    const results: SearchResults = {
      items: [mockUser, mockVideo],
      totalCount: 2,
      searchTime: 100,
      facets: {
        roles: { athlete: 1, coach: 0 },
        verificationStatuses: { approved: 1, pending: 0 }
      },
      query: { term: 'test', searchType: 'all', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    expect(screen.getByText('Filter Results')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Verification Statuses')).toBeInTheDocument();
    expect(screen.getByText('athlete')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('calls onFacetClick when facet is clicked', async () => {
    const user = userEvent.setup();
    const results: SearchResults = {
      items: [mockUser],
      totalCount: 1,
      searchTime: 100,
      facets: {
        roles: { athlete: 1 }
      },
      query: { term: 'test', searchType: 'users', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    const facetButton = screen.getByText('athlete').closest('button');
    await user.click(facetButton!);

    expect(mockOnFacetClick).toHaveBeenCalledWith('roles', 'athlete');
  });

  it('renders Load More button when hasMore is true', () => {
    const results: SearchResults = {
      items: [mockUser],
      totalCount: 1,
      searchTime: 100,
      hasMore: true,
      nextOffset: 20,
      query: { term: 'test', searchType: 'users', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    expect(screen.getByText('Load More Results')).toBeInTheDocument();
  });

  it('does not render Load More button when hasMore is false', () => {
    const results: SearchResults = {
      items: [mockUser],
      totalCount: 1,
      searchTime: 100,
      hasMore: false,
      query: { term: 'test', searchType: 'users', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    expect(screen.queryByText('Load More Results')).not.toBeInTheDocument();
  });

  it('highlights search terms in text content', () => {
    const results: SearchResults = {
      items: [mockUser],
      totalCount: 1,
      searchTime: 100,
      query: { term: 'john', searchType: 'users', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} searchTerm="john" results={results} />);

    const highlightedElements = screen.getAllByText('john');
    expect(highlightedElements.length).toBeGreaterThan(0);
    
    // Check that at least one element has the highlight class
    const hasHighlight = highlightedElements.some(el => 
      el.tagName === 'MARK' || el.classList.contains('search-highlight')
    );
    expect(hasHighlight).toBe(true);
  });

  it('renders user avatar placeholder when no photo URL', () => {
    const userWithoutPhoto = { ...mockUser, photoURL: undefined };
    const results: SearchResults = {
      items: [userWithoutPhoto],
      totalCount: 1,
      searchTime: 100,
      query: { term: 'test', searchType: 'users', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    expect(screen.getByText('J')).toBeInTheDocument(); // First letter of name
  });

  it('renders video thumbnail placeholder when no thumbnail URL', () => {
    const videoWithoutThumbnail = { ...mockVideo, thumbnailUrl: undefined };
    const results: SearchResults = {
      items: [videoWithoutThumbnail],
      totalCount: 1,
      searchTime: 100,
      query: { term: 'test', searchType: 'videos', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    // Should render video icon placeholder
    expect(screen.getByText('Amazing Basketball Skills')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const results: SearchResults = {
      items: [],
      totalCount: 0,
      searchTime: 100,
      query: { term: 'test', searchType: 'all', filters: {} }
    };

    const { container } = render(
      <SearchResultsDisplay 
        {...defaultProps} 
        results={results} 
        className="custom-class" 
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles mixed result types correctly', () => {
    const results: SearchResults = {
      items: [mockUser, mockVideo, mockEvent],
      totalCount: 3,
      searchTime: 200,
      query: { term: 'test', searchType: 'all', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument(); // User
    expect(screen.getByText('Amazing Basketball Skills')).toBeInTheDocument(); // Video
    expect(screen.getByText('Basketball Tournament')).toBeInTheDocument(); // Event
    expect(screen.getByText('3 results found')).toBeInTheDocument();
  });

  it('handles zero relevance scores gracefully', () => {
    const results: SearchResults = {
      items: [mockUser],
      totalCount: 1,
      searchTime: 100,
      // No relevanceScores provided
      query: { term: 'test', searchType: 'users', filters: {} }
    };

    render(<SearchResultsDisplay {...defaultProps} results={results} />);

    expect(screen.getByText('0%')).toBeInTheDocument(); // Default relevance score
  });
});