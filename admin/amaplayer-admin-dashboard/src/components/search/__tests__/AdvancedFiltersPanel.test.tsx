import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedFiltersPanel from '../AdvancedFiltersPanel';
import { SearchFilters, SearchType } from '@/types/models/search';

describe('AdvancedFiltersPanel', () => {
  const mockOnFiltersChange = jest.fn();
  const mockOnToggleCollapse = jest.fn();
  
  const defaultProps = {
    filters: {} as SearchFilters,
    onFiltersChange: mockOnFiltersChange,
    searchType: 'all' as SearchType,
    isCollapsed: false,
    onToggleCollapse: mockOnToggleCollapse
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders collapsed state correctly', () => {
    render(<AdvancedFiltersPanel {...defaultProps} isCollapsed={true} />);
    
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    expect(screen.queryByText('Date Range')).not.toBeInTheDocument();
  });

  it('renders expanded state correctly', () => {
    render(<AdvancedFiltersPanel {...defaultProps} />);
    
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByText('Apply Filters')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('calls onToggleCollapse when header is clicked', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} />);
    
    const toggleButton = screen.getByRole('button', { name: /advanced filters/i });
    await user.click(toggleButton);
    
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('shows user-specific filters for users search type', () => {
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Sport')).toBeInTheDocument();
    expect(screen.getByText(/Age Range/)).toBeInTheDocument();
  });

  it('shows video-specific filters for videos search type', () => {
    render(<AdvancedFiltersPanel {...defaultProps} searchType="videos" />);
    
    expect(screen.getByText('Verification Status')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('shows event-specific filters for events search type', () => {
    render(<AdvancedFiltersPanel {...defaultProps} searchType="events" />);
    
    expect(screen.getByText('Event Status')).toBeInTheDocument();
  });

  it('shows all filters for "all" search type', () => {
    render(<AdvancedFiltersPanel {...defaultProps} searchType="all" />);
    
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Verification Status')).toBeInTheDocument();
    expect(screen.getByText('Event Status')).toBeInTheDocument();
  });

  it('handles role checkbox selection', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    const athleteCheckbox = screen.getByLabelText('Athlete');
    await user.click(athleteCheckbox);
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      role: ['athlete']
    });
  });

  it('handles multiple role selections', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    const athleteCheckbox = screen.getByLabelText('Athlete');
    const coachCheckbox = screen.getByLabelText('Coach');
    
    await user.click(athleteCheckbox);
    await user.click(coachCheckbox);
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      role: ['athlete', 'coach']
    });
  });

  it('handles date range selection', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} />);
    
    const startDateInput = screen.getByDisplayValue('');
    const endDateInput = screen.getAllByDisplayValue('')[1]; // Second empty date input
    
    await user.type(startDateInput, '2023-01-01');
    await user.type(endDateInput, '2023-12-31');
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dateRange: {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31'),
        field: 'createdAt'
      }
    });
  });

  it('handles location input', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    const locationInput = screen.getByPlaceholderText('Enter location...');
    await user.type(locationInput, 'New York');
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      location: 'New York'
    });
  });

  it('handles sport input', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    const sportInput = screen.getByPlaceholderText('Enter sport...');
    await user.type(sportInput, 'Basketball');
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      sport: 'Basketball'
    });
  });

  it('handles age range slider changes', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    const ageSliders = screen.getAllByRole('slider');
    const minAgeSlider = ageSliders[0];
    const maxAgeSlider = ageSliders[1];
    
    fireEvent.change(minAgeSlider, { target: { value: '18' } });
    fireEvent.change(maxAgeSlider, { target: { value: '30' } });
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ageRange: { min: 18, max: 30 }
    });
  });

  it('handles age range number input changes', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    const ageInputs = screen.getAllByRole('spinbutton');
    const minAgeInput = ageInputs[0];
    const maxAgeInput = ageInputs[1];
    
    await user.clear(minAgeInput);
    await user.type(minAgeInput, '20');
    await user.clear(maxAgeInput);
    await user.type(maxAgeInput, '35');
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ageRange: { min: 20, max: 35 }
    });
  });

  it('clears all filters when Clear All is clicked', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    // Set some filters first
    const athleteCheckbox = screen.getByLabelText('Athlete');
    await user.click(athleteCheckbox);
    
    const clearButton = screen.getByText('Clear All');
    await user.click(clearButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    expect(athleteCheckbox).not.toBeChecked();
  });

  it('shows active filter count in header', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    const athleteCheckbox = screen.getByLabelText('Athlete');
    const locationInput = screen.getByPlaceholderText('Enter location...');
    
    await user.click(athleteCheckbox);
    await user.type(locationInput, 'Test Location');
    
    // Should show count of 2 active filters
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('disables Clear All button when no filters are active', () => {
    render(<AdvancedFiltersPanel {...defaultProps} />);
    
    const clearButton = screen.getByText('Clear All');
    expect(clearButton).toBeDisabled();
  });

  it('enables Clear All button when filters are active', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="users" />);
    
    const athleteCheckbox = screen.getByLabelText('Athlete');
    await user.click(athleteCheckbox);
    
    const clearButton = screen.getByText('Clear All');
    expect(clearButton).not.toBeDisabled();
  });

  it('initializes with provided filters', () => {
    const initialFilters: SearchFilters = {
      role: ['athlete'],
      location: 'Test City',
      ageRange: { min: 20, max: 30 }
    };
    
    render(
      <AdvancedFiltersPanel 
        {...defaultProps} 
        filters={initialFilters}
        searchType="users"
      />
    );
    
    expect(screen.getByLabelText('Athlete')).toBeChecked();
    expect(screen.getByDisplayValue('Test City')).toBeInTheDocument();
  });

  it('handles verification status filters for videos', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="videos" />);
    
    const pendingCheckbox = screen.getByLabelText('Pending');
    const approvedCheckbox = screen.getByLabelText('Approved');
    
    await user.click(pendingCheckbox);
    await user.click(approvedCheckbox);
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      verificationStatus: ['pending', 'approved']
    });
  });

  it('handles category filters for videos', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="videos" />);
    
    const skillsCheckbox = screen.getByLabelText('Skills');
    await user.click(skillsCheckbox);
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      category: ['skills']
    });
  });

  it('handles event status filters for events', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} searchType="events" />);
    
    const activeCheckbox = screen.getByLabelText('Active');
    await user.click(activeCheckbox);
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      eventStatus: ['active']
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <AdvancedFiltersPanel {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles date field selection', async () => {
    const user = userEvent.setup();
    render(<AdvancedFiltersPanel {...defaultProps} />);
    
    const dateFieldSelect = screen.getByDisplayValue('Created Date');
    await user.selectOptions(dateFieldSelect, 'updatedAt');
    
    const startDateInput = screen.getByDisplayValue('');
    const endDateInput = screen.getAllByDisplayValue('')[1];
    
    await user.type(startDateInput, '2023-01-01');
    await user.type(endDateInput, '2023-12-31');
    
    const applyButton = screen.getByText('Apply Filters');
    await user.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dateRange: {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31'),
        field: 'updatedAt'
      }
    });
  });
});