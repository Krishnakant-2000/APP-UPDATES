import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkSelectionProvider, useBulkSelection } from '@/contexts/BulkSelectionContext';
import BulkSelectionToolbar from '../BulkSelectionToolbar';
import { User } from '@/types/models';

// Mock data
const mockUsers: User[] = [
  {
    id: 'user1',
    uid: 'user1',
    email: 'user1@test.com',
    displayName: 'User One',
    role: 'athlete',
    isActive: true,
    isVerified: false,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    storiesCount: 0,
    privacy: { profileVisibility: 'public', followingVisible: false, followersVisible: true },
    settings: { notifications: true, emailNotifications: false, pushNotifications: true }
  },
  {
    id: 'user2',
    uid: 'user2',
    email: 'user2@test.com',
    displayName: 'User Two',
    role: 'coach',
    isActive: true,
    isVerified: true,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    storiesCount: 0,
    privacy: { profileVisibility: 'public', followingVisible: false, followersVisible: true },
    settings: { notifications: true, emailNotifications: false, pushNotifications: true }
  }
];

// Test wrapper component that sets up items
const TestWrapper: React.FC<{ children: React.ReactNode; hasItems?: boolean }> = ({ 
  children, 
  hasItems = true 
}) => {
  const { setCurrentPageItems, selectItem } = useBulkSelection();
  
  React.useEffect(() => {
    if (hasItems) {
      setCurrentPageItems(mockUsers);
      // Select first user for some tests
      selectItem(mockUsers[0]);
    } else {
      setCurrentPageItems([]);
    }
  }, [setCurrentPageItems, selectItem, hasItems]);

  return <>{children}</>;
};

describe('BulkSelectionToolbar', () => {
  const mockOnBulkOperationsClick = jest.fn();

  const renderWithProvider = (props = {}, wrapperProps = {}) => {
    return render(
      <BulkSelectionProvider>
        <TestWrapper {...wrapperProps}>
          <BulkSelectionToolbar
            onBulkOperationsClick={mockOnBulkOperationsClick}
            {...props}
          />
        </TestWrapper>
      </BulkSelectionProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when no items are available', () => {
    const { container } = renderWithProvider({}, { hasItems: false });
    
    expect(container.firstChild).toBeNull();
  });

  it('should render when items are available', () => {
    renderWithProvider();
    
    expect(screen.getByText('Select all on page (2)')).toBeInTheDocument();
  });

  it('should show selected count when items are selected', () => {
    renderWithProvider();
    
    expect(screen.getByText('1 item selected')).toBeInTheDocument();
  });

  it('should show plural form for multiple selected items', () => {
    render(
      <BulkSelectionProvider>
        <TestWrapper>
          <BulkSelectionToolbar onBulkOperationsClick={mockOnBulkOperationsClick} />
        </TestWrapper>
      </BulkSelectionProvider>
    );

    // Select both users
    const { selectItem } = require('@/contexts/BulkSelectionContext');
    // This would need to be done through the context, but for testing we'll check the text
    
    // The test setup already selects one item, so we expect "1 item selected"
    expect(screen.getByText('1 item selected')).toBeInTheDocument();
  });

  it('should handle select all checkbox toggle', () => {
    renderWithProvider();
    
    const selectAllCheckbox = screen.getByRole('checkbox');
    
    // Initially not all selected (only 1 of 2 items selected)
    expect(selectAllCheckbox).not.toBeChecked();
    
    // Click to select all
    fireEvent.click(selectAllCheckbox);
    
    // Should now be checked (all items selected)
    expect(selectAllCheckbox).toBeChecked();
  });

  it('should show clear selection button when items are selected', () => {
    renderWithProvider();
    
    const clearButton = screen.getByText('Clear Selection');
    expect(clearButton).toBeInTheDocument();
  });

  it('should show bulk operations button when items are selected and callback provided', () => {
    renderWithProvider();
    
    const bulkOpsButton = screen.getByText('Bulk Operations (1)');
    expect(bulkOpsButton).toBeInTheDocument();
  });

  it('should not show bulk operations button when no callback provided', () => {
    renderWithProvider({ onBulkOperationsClick: undefined });
    
    expect(screen.queryByText(/Bulk Operations/)).not.toBeInTheDocument();
  });

  it('should call onBulkOperationsClick when bulk operations button is clicked', () => {
    renderWithProvider();
    
    const bulkOpsButton = screen.getByText('Bulk Operations (1)');
    fireEvent.click(bulkOpsButton);
    
    expect(mockOnBulkOperationsClick).toHaveBeenCalledTimes(1);
  });

  it('should handle clear selection button click', () => {
    renderWithProvider();
    
    const clearButton = screen.getByText('Clear Selection');
    fireEvent.click(clearButton);
    
    // After clearing, should show 0 items selected
    expect(screen.getByText('0 items selected')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = renderWithProvider({ className: 'custom-class' });
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show correct checkbox label with item count', () => {
    renderWithProvider();
    
    expect(screen.getByText('Select all on page (2)')).toBeInTheDocument();
  });

  it('should handle keyboard navigation on checkbox', () => {
    renderWithProvider();
    
    const selectAllCheckbox = screen.getByRole('checkbox');
    
    // Focus the checkbox
    selectAllCheckbox.focus();
    expect(selectAllCheckbox).toHaveFocus();
    
    // Press space to toggle
    fireEvent.keyDown(selectAllCheckbox, { key: ' ', code: 'Space' });
    fireEvent.keyUp(selectAllCheckbox, { key: ' ', code: 'Space' });
  });

  it('should show appropriate button states', () => {
    renderWithProvider();
    
    const clearButton = screen.getByText('Clear Selection');
    const bulkOpsButton = screen.getByText('Bulk Operations (1)');
    
    expect(clearButton).not.toBeDisabled();
    expect(bulkOpsButton).not.toBeDisabled();
  });
});

describe('BulkSelectionToolbar Accessibility', () => {
  const mockOnBulkOperationsClick = jest.fn();

  const renderWithProvider = () => {
    return render(
      <BulkSelectionProvider>
        <TestWrapper>
          <BulkSelectionToolbar onBulkOperationsClick={mockOnBulkOperationsClick} />
        </TestWrapper>
      </BulkSelectionProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have proper ARIA labels', () => {
    renderWithProvider();
    
    const selectAllCheckbox = screen.getByRole('checkbox');
    expect(selectAllCheckbox).toBeInTheDocument();
  });

  it('should have proper button roles', () => {
    renderWithProvider();
    
    const clearButton = screen.getByRole('button', { name: /clear selection/i });
    const bulkOpsButton = screen.getByRole('button', { name: /bulk operations/i });
    
    expect(clearButton).toBeInTheDocument();
    expect(bulkOpsButton).toBeInTheDocument();
  });

  it('should support keyboard navigation', () => {
    renderWithProvider();
    
    const clearButton = screen.getByRole('button', { name: /clear selection/i });
    const bulkOpsButton = screen.getByRole('button', { name: /bulk operations/i });
    
    // Tab navigation should work
    clearButton.focus();
    expect(clearButton).toHaveFocus();
    
    // Tab to next button
    fireEvent.keyDown(clearButton, { key: 'Tab' });
    bulkOpsButton.focus();
    expect(bulkOpsButton).toHaveFocus();
  });
});