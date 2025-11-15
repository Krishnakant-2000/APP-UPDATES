import bulkOperationsService from '../bulkOperationsService';
import { BulkSelectableItem } from '@/contexts/BulkSelectionContext';
import { BulkOperationType } from '@/components/admin/search/BulkOperationsPanel';

// Mock Firebase
jest.mock('../../lib/firebase', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn()
  })),
  getDoc: jest.fn(() => ({
    exists: () => true,
    data: () => ({ id: 'test' })
  })),
  setDoc: jest.fn()
}));

// Mock constants
jest.mock('../../constants/firebase', () => ({
  COLLECTIONS: {
    USERS: 'users'
  }
}));

describe('BulkOperationsService', () => {
  const mockUsers: BulkSelectableItem[] = [
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
    } as any,
    {
      id: 'user2',
      uid: 'user2',
      email: 'user2@test.com',
      displayName: 'User Two',
      role: 'coach',
      isActive: true,
      isVerified: false,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      storiesCount: 0,
      privacy: { profileVisibility: 'public', followingVisible: false, followersVisible: true },
      settings: { notifications: true, emailNotifications: false, pushNotifications: true }
    } as any
  ];

  const mockVideos: BulkSelectableItem[] = [
    {
      id: 'video1',
      title: 'Video One',
      userId: 'user1',
      videoUrl: 'https://example.com/video1.mp4',
      verificationStatus: 'pending',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeBulkOperation', () => {
    it('should return success for empty items array', async () => {
      const result = await bulkOperationsService.executeBulkOperation(
        'user_suspend',
        [],
        'Test reason'
      );

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should process user suspension operation', async () => {
      const { writeBatch } = require('firebase/firestore');
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      };
      writeBatch.mockReturnValue(mockBatch);

      const result = await bulkOperationsService.executeBulkOperation(
        'user_suspend',
        mockUsers,
        'Test suspension'
      );

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should process video approval operation', async () => {
      const { writeBatch } = require('firebase/firestore');
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      };
      writeBatch.mockReturnValue(mockBatch);

      const result = await bulkOperationsService.executeBulkOperation(
        'video_approve',
        mockVideos,
        'Test approval'
      );

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should handle batch operation failures gracefully', async () => {
      const { writeBatch, getDoc, updateDoc } = require('firebase/firestore');
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockRejectedValue(new Error('Batch failed'))
      };
      writeBatch.mockReturnValue(mockBatch);
      
      // Mock individual operations to succeed
      updateDoc.mockResolvedValue(undefined);
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ id: 'test' })
      });

      const result = await bulkOperationsService.executeBulkOperation(
        'user_verify',
        mockUsers,
        'Test verification'
      );

      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should handle individual item failures', async () => {
      const { writeBatch, getDoc, updateDoc } = require('firebase/firestore');
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockRejectedValue(new Error('Batch failed'))
      };
      writeBatch.mockReturnValue(mockBatch);
      
      // Mock first item to succeed, second to fail
      updateDoc
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Item failed'));
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ id: 'test' })
      });

      const result = await bulkOperationsService.executeBulkOperation(
        'user_activate',
        mockUsers,
        'Test activation'
      );

      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].itemId).toBe('user2');
    });

    it('should call progress callback if provided', async () => {
      const { writeBatch } = require('firebase/firestore');
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      };
      writeBatch.mockReturnValue(mockBatch);

      const progressCallback = jest.fn();

      await bulkOperationsService.executeBulkOperation(
        'user_suspend',
        mockUsers,
        'Test reason',
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should throw error for unknown operation', async () => {
      await expect(
        bulkOperationsService.executeBulkOperation(
          'unknown_operation' as BulkOperationType,
          mockUsers,
          'Test reason'
        )
      ).rejects.toThrow('Unknown operation: unknown_operation');
    });
  });

  describe('validateBulkOperation', () => {
    it('should validate empty items array', () => {
      const result = bulkOperationsService.validateBulkOperation('user_suspend', []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No items selected for bulk operation');
    });

    it('should validate too many items', () => {
      const manyItems = Array(1001).fill(mockUsers[0]);
      const result = bulkOperationsService.validateBulkOperation('user_suspend', manyItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Too many items selected. Maximum 1000 items per operation');
    });

    it('should validate operation compatibility with item types', () => {
      // User operation on video items
      const result = bulkOperationsService.validateBulkOperation('user_suspend', mockVideos);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User operation user_suspend cannot be applied to non-user items');
    });

    it('should validate video operation on user items', () => {
      const result = bulkOperationsService.validateBulkOperation('video_approve', mockUsers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Video operation video_approve cannot be applied to non-video items');
    });

    it('should pass validation for correct operation and items', () => {
      const result = bulkOperationsService.validateBulkOperation('user_suspend', mockUsers);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('estimateOperationTime', () => {
    it('should estimate time for user operations', () => {
      const result = bulkOperationsService.estimateOperationTime('user_suspend', 10);
      
      expect(result.estimatedSeconds).toBe(5); // 10 * 0.5
      expect(result.estimatedMinutes).toBe(1);
    });

    it('should estimate time for video operations', () => {
      const result = bulkOperationsService.estimateOperationTime('video_approve', 20);
      
      expect(result.estimatedSeconds).toBe(8); // 20 * 0.4
      expect(result.estimatedMinutes).toBe(1);
    });

    it('should handle unknown operations with default time', () => {
      const result = bulkOperationsService.estimateOperationTime('unknown_operation' as BulkOperationType, 10);
      
      expect(result.estimatedSeconds).toBe(5); // 10 * 0.5 (default)
      expect(result.estimatedMinutes).toBe(1);
    });
  });

  describe('getBulkOperationHistory', () => {
    it('should return empty array on error', async () => {
      // Mock import to fail
      jest.doMock('firebase/firestore', () => {
        throw new Error('Import failed');
      });

      const result = await bulkOperationsService.getBulkOperationHistory();
      
      expect(result).toEqual([]);
    });
  });
});