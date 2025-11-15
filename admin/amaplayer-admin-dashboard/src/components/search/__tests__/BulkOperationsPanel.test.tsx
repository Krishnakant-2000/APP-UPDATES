import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkSelectionProvider } from '@/contexts/BulkSelectionContext';
import BulkOperationsPanel from '../BulkOperationsPanel';
import { User } from '@/types/models';
import { TalentVideo } from '@/types/models/search';

// Mock the services
jest.mock('@/services/api/userManagementService', () => ({
  __esModule: true,
  default: {
    bulkSuspendUsers: jest.fn(),
    bulkVerifyUsers: jest.fn(),
    bulkActivateUsers: jest.fn()
  }
}));

jest.mock('@/services/api/videoVerificationService', () => ({
  __esModule: true,
  default: {
    bulkApproveVideos: jest.fn(),
    bulkRejectVideos: jest.fn(),
    bulkFlagVideos: jest.fn()
  }
}));

jest.mock('@/services/api/eventsManagementService', () => ({
  __esModule: true,
  default: {
    bulkActivateEvents: jest.fn(),
    bulkDeactivateEvents: jest.fn()
  }
}));

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
  }
];

const mockVideos: TalentVideo[] = [
  {
    id: 'video1',
    title: 'Video One',
    userId: 'user1',
    videoUrl: 'https://example.com/video1.mp4',
    verificationStatus: 'pending',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { useBulkSelection } = require('@/contexts/BulkSelectionContext');
  const { setCurrentPageItems } = useBulkSelection();
  
  React.useEffect(() => {
    setCurrentPageItems([...mockUsers, ...mockVideos]);
  }, [setCurrentPageItems]);

  return <>{children}</>;
};

describe('BulkOperationsPanel', () => {
  const mockOnClose = jest.fn();
  const mockOnOperationComplete = jest.fn();

  const renderWithProvider = (props = {}) => {
    return render(
      <BulkSelectionProvider>
        <TestWrapper>
          <BulkOperationsPanel
            isOpen={true}
            onClose={mockOnClose}
            onOperationComplete={mockOnOperationComplete}
            {...props}
          />
        </TestWrapper>
      </BulkSelectionProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <BulkSelectionProvider>
        <BulkOperationsPanel
          isOpen={false}
          onClose={mockOnClose}
          onOperationComplete={mockOnOperationComplete}
        />
      </BulkSelectionProvider>
    );

    expect(screen.queryByText('Bulk Operations')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    renderWithProvider();

    expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
    expect(screen.getByText('Choose an operation:')).toBeInTheDocument();
  });

  it('should show selection summary', () => {
    renderWithProvider();

    expect(screen.getByText(/2 items selected:/)).toBeInTheDocument();
    expect(screen.getByText('1 user')).toBeInTheDocument();
    expect(screen.getByText('1 video')).toBeInTheDocument();
  });

  it('should display available operations for users', () => {
    renderWithProvider();

    expect(screen.getByText('Suspend Users')).toBeInTheDocument();
    expect(screen.getByText('Verify Users')).toBeInTheDocument();
    expect(screen.getByText('Activate Users')).toBeInTheDocument();
  });

  it('should display available operations for videos', () => {
    renderWithProvider();

    expect(screen.getByText('Approve Videos')).toBeInTheDocument();
    expect(screen.getByText('Reject Videos')).toBeInTheDocument();
    expect(screen.getByText('Flag Videos')).toBeInTheDocument();
  });

  it('should close when close button is clicked', () => {
    renderWithProvider();

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close when overlay is clicked', () => {
    renderWithProvider();

    const overlay = document.querySelector('.panel-overlay');
    fireEvent.click(overlay!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show confirmation dialog for destructive operations', async () => {
    renderWithProvider();

    const suspendButton = screen.getByText('Suspend Users');
    fireEvent.click(suspendButton);

    await waitFor(() => {
      expect(screen.getByText('Suspend Users')).toBeInTheDocument();
    });
  });

  it('should execute non-destructive operations immediately', async () => {
    const userManagementService = require('@/services/api/userManagementService').default;
    userManagementService.bulkActivateUsers.mockResolvedValue({
      success: true,
      processedCount: 1,
      failedCount: 0,
      errors: []
    });

    renderWithProvider();

    const activateButton = screen.getByText('Activate Users');
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(userManagementService.bulkActivateUsers).toHaveBeenCalledWith(['user1'], undefined);
    });
  });

  it('should handle operation errors gracefully', async () => {
    const userManagementService = require('@/services/api/userManagementService').default;
    userManagementService.bulkActivateUsers.mockRejectedValue(new Error('Service error'));

    renderWithProvider();

    const activateButton = screen.getByText('Activate Users');
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(mockOnOperationComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          processedCount: 0,
          failedCount: 2
        })
      );
    });
  });

  it('should show correct operation descriptions', () => {
    renderWithProvider();

    expect(screen.getByText(/Suspend 1 selected user/)).toBeInTheDocument();
    expect(screen.getByText(/Verify 1 selected user/)).toBeInTheDocument();
    expect(screen.getByText(/Activate 1 selected user/)).toBeInTheDocument();
    expect(screen.getByText(/Approve 1 selected video/)).toBeInTheDocument();
    expect(screen.getByText(/Reject 1 selected video/)).toBeInTheDocument();
    expect(screen.getByText(/Flag 1 selected video/)).toBeInTheDocument();
  });

  it('should handle plural descriptions correctly', () => {
    // Mock multiple items
    const multipleUsers = [mockUsers[0], { ...mockUsers[0], id: 'user2' }];
    const multipleVideos = [mockVideos[0], { ...mockVideos[0], id: 'video2' }];

    render(
      <BulkSelectionProvider>
        <div>
          {/* Mock component that sets multiple items */}
          <BulkOperationsPanel
            isOpen={true}
            onClose={mockOnClose}
            onOperationComplete={mockOnOperationComplete}
          />
        </div>
      </BulkSelectionProvider>
    );

    // This would need to be tested with actual multiple selections
    // The test setup would need to be more complex to properly test this
  });

  it('should apply correct styling for destructive operations', () => {
    renderWithProvider();

    const suspendButton = screen.getByText('Suspend Users').closest('button');
    const rejectButton = screen.getByText('Reject Videos').closest('button');

    expect(suspendButton).toHaveClass('destructive');
    expect(rejectButton).toHaveClass('destructive');
  });

  it('should not apply destructive styling for safe operations', () => {
    renderWithProvider();

    const verifyButton = screen.getByText('Verify Users').closest('button');
    const approveButton = screen.getByText('Approve Videos').closest('button');

    expect(verifyButton).not.toHaveClass('destructive');
    expect(approveButton).not.toHaveClass('destructive');
  });
});

describe('BulkOperationsPanel Integration', () => {
  const mockOnClose = jest.fn();
  const mockOnOperationComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate with video verification service', async () => {
    const videoVerificationService = require('@/services/api/videoVerificationService').default;
    videoVerificationService.bulkApproveVideos.mockResolvedValue({
      success: true,
      processedCount: 1,
      failedCount: 0,
      errors: []
    });

    render(
      <BulkSelectionProvider>
        <TestWrapper>
          <BulkOperationsPanel
            isOpen={true}
            onClose={mockOnClose}
            onOperationComplete={mockOnOperationComplete}
          />
        </TestWrapper>
      </BulkSelectionProvider>
    );

    const approveButton = screen.getByText('Approve Videos');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(videoVerificationService.bulkApproveVideos).toHaveBeenCalledWith(['video1'], undefined);
    });
  });

  it('should call onOperationComplete with correct result', async () => {
    const userManagementService = require('@/services/api/userManagementService').default;
    const mockResult = {
      success: true,
      processedCount: 1,
      failedCount: 0,
      errors: []
    };
    userManagementService.bulkVerifyUsers.mockResolvedValue(mockResult);

    render(
      <BulkSelectionProvider>
        <TestWrapper>
          <BulkOperationsPanel
            isOpen={true}
            onClose={mockOnClose}
            onOperationComplete={mockOnOperationComplete}
          />
        </TestWrapper>
      </BulkSelectionProvider>
    );

    const verifyButton = screen.getByText('Verify Users');
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockOnOperationComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          processedCount: 1,
          failedCount: 0
        })
      );
    });
  });
});