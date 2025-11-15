/**
 * User Management Service for Admin Dashboard
 * Handles user-related operations with real Firebase data
 */

import { doc, updateDoc, getDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types/models';

export interface BulkOperationResult {
  processedCount: number;
  failedCount: number;
  errors: Array<{ userId: string; error: string }>;
}

export class UserManagementService {
  /**
   * Suspend a single user
   */
  async suspendUser(userId: string, reason?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const updateData = {
        isActive: false,
        status: 'suspended',
        suspendedAt: new Date().toISOString(),
        suspensionReason: reason || 'Administrative action',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);
      console.log(`User ${userId} suspended successfully`);
    } catch (error) {
      throw new Error(`Failed to suspend user: ${error}`);
    }
  }

  /**
   * Bulk suspend users
   */
  async bulkSuspendUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        await this.suspendUser(userId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Verify a single user
   */
  async verifyUser(userId: string, reason?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const updateData = {
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        verificationReason: reason || 'Administrative verification',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);
      console.log(`User ${userId} verified successfully`);
    } catch (error) {
      throw new Error(`Failed to verify user: ${error}`);
    }
  }

  /**
   * Bulk verify users
   */
  async bulkVerifyUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        await this.verifyUser(userId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Activate a single user
   */
  async activateUser(userId: string, reason?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const updateData = {
        isActive: true,
        status: 'active',
        activatedAt: new Date().toISOString(),
        activationReason: reason || 'Administrative activation',
        updatedAt: new Date().toISOString(),
        suspendedAt: null,
        suspensionReason: null
      };

      await updateDoc(userRef, updateData);
      console.log(`User ${userId} activated successfully`);
    } catch (error) {
      throw new Error(`Failed to activate user: ${error}`);
    }
  }

  /**
   * Bulk activate users
   */
  async bulkActivateUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        await this.activateUser(userId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      return {
        uid: userDoc.id,
        id: userDoc.id,
        displayName: data.displayName || '',
        email: data.email || '',
        username: data.username || '',
        role: data.role || 'athlete',
        isActive: data.isActive !== false,
        isVerified: data.isVerified || false,
        photoURL: data.photoURL || '',
        sports: data.sports || [],
        postsCount: data.postsCount || 0,
        storiesCount: data.storiesCount || 0,
        followersCount: data.followersCount || 0,
        followingCount: data.followingCount || 0,
        location: data.location || '',
        bio: data.bio || '',
        gender: data.gender || '',
        dateOfBirth: data.dateOfBirth || '',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
      } as User;
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error}`);
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      const updated = await this.getUserById(userId);
      if (!updated) throw new Error('User not found after update');
      return updated;
    } catch (error) {
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  /**
   * Get user statistics from Firebase
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    verified: number;
    athletes: number;
    coaches: number;
    organizations: number;
  }> {
    try {
      const usersRef = collection(db, 'users');

      const [allUsers, activeUsers, suspendedUsers, verifiedUsers, athleteUsers, coachUsers, orgUsers] = await Promise.all([
        getDocs(usersRef),
        getDocs(query(usersRef, where('isActive', '==', true))),
        getDocs(query(usersRef, where('isActive', '==', false))),
        getDocs(query(usersRef, where('isVerified', '==', true))),
        getDocs(query(usersRef, where('role', '==', 'athlete'))),
        getDocs(query(usersRef, where('role', '==', 'coach'))),
        getDocs(query(usersRef, where('role', '==', 'organization')))
      ]);

      return {
        total: allUsers.size,
        active: activeUsers.size,
        suspended: suspendedUsers.size,
        verified: verifiedUsers.size,
        athletes: athleteUsers.size,
        coaches: coachUsers.size,
        organizations: orgUsers.size
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        total: 0,
        active: 0,
        suspended: 0,
        verified: 0,
        athletes: 0,
        coaches: 0,
        organizations: 0
      };
    }
  }

  /**
   * Get all users from Firebase
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);

      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          id: doc.id,
          displayName: data.displayName || '',
          email: data.email || '',
          username: data.username || '',
          role: data.role || 'athlete',
          isActive: data.isActive !== false,
          isVerified: data.isVerified || false,
          photoURL: data.photoURL || '',
          sports: data.sports || [],
          postsCount: data.postsCount || 0,
          storiesCount: data.storiesCount || 0,
          followersCount: data.followersCount || 0,
          followingCount: data.followingCount || 0,
          location: data.location || '',
          bio: data.bio || '',
          gender: data.gender || '',
          dateOfBirth: data.dateOfBirth || '',
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
        } as User);
      });

      return users;
    } catch (error) {
      console.error('Error getting all users from Firebase:', error);
      return [];
    }
  }
}

// Create singleton instance
export const userManagementService = new UserManagementService();
export default userManagementService;