/**
 * Video Verification Service for Admin Dashboard
 * Handles video verification operations with real Firebase data
 */

import { doc, updateDoc, getDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TalentVideo } from '../types/models/search';

export interface BulkVideoOperationResult {
  processedCount: number;
  failedCount: number;
  errors: Array<{ videoId: string; error: string }>;
}

/**
 * Video Verification Service
 */
export class VideoVerificationService {
  private readonly COLLECTION_NAME = 'videos';

  async approveVideo(videoId: string, reason?: string): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        throw new Error('Video not found');
      }

      const updateData = {
        verificationStatus: 'approved',
        approvedAt: new Date().toISOString(),
        approvalReason: reason || 'Administrative approval',
        isActive: true,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(videoRef, updateData);
      console.log(`Video ${videoId} approved successfully`);
    } catch (error) {
      throw new Error(`Failed to approve video: ${error}`);
    }
  }

  async bulkApproveVideos(videoIds: string[], reason?: string): Promise<BulkVideoOperationResult> {
    const result: BulkVideoOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const videoId of videoIds) {
      try {
        await this.approveVideo(videoId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          videoId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async rejectVideo(videoId: string, reason?: string): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        throw new Error('Video not found');
      }

      const updateData = {
        verificationStatus: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'Administrative rejection',
        isActive: false,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(videoRef, updateData);
      console.log(`Video ${videoId} rejected successfully`);
    } catch (error) {
      throw new Error(`Failed to reject video: ${error}`);
    }
  }

  async bulkRejectVideos(videoIds: string[], reason?: string): Promise<BulkVideoOperationResult> {
    const result: BulkVideoOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const videoId of videoIds) {
      try {
        await this.rejectVideo(videoId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          videoId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async flagVideo(videoId: string, reason?: string): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        throw new Error('Video not found');
      }

      const updateData = {
        isFlagged: true,
        flaggedAt: new Date().toISOString(),
        flagReason: reason || 'Administrative flag',
        verificationStatus: 'pending',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(videoRef, updateData);
      console.log(`Video ${videoId} flagged successfully`);
    } catch (error) {
      throw new Error(`Failed to flag video: ${error}`);
    }
  }

  async bulkFlagVideos(videoIds: string[], reason?: string): Promise<BulkVideoOperationResult> {
    const result: BulkVideoOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const videoId of videoIds) {
      try {
        await this.flagVideo(videoId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          videoId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async getVideoById(videoId: string): Promise<TalentVideo | null> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        return null;
      }

      return { id: videoDoc.id, ...videoDoc.data() } as TalentVideo;
    } catch (error) {
      throw new Error(`Failed to fetch video: ${error}`);
    }
  }

  async updateVideo(videoId: string, updates: Partial<TalentVideo>): Promise<TalentVideo> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      await updateDoc(videoRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      const updated = await this.getVideoById(videoId);
      if (!updated) throw new Error('Video not found after update');
      return updated;
    } catch (error) {
      throw new Error(`Failed to update video: ${error}`);
    }
  }

  async getVerificationStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const videosRef = collection(db, this.COLLECTION_NAME);

      const [allVideos, pendingVideos, approvedVideos, rejectedVideos] = await Promise.all([
        getDocs(videosRef),
        getDocs(query(videosRef, where('verificationStatus', '==', 'pending'))),
        getDocs(query(videosRef, where('verificationStatus', '==', 'approved'))),
        getDocs(query(videosRef, where('verificationStatus', '==', 'rejected')))
      ]);

      return {
        total: allVideos.size,
        pending: pendingVideos.size,
        approved: approvedVideos.size,
        rejected: rejectedVideos.size
      };
    } catch (error) {
      console.error('Error getting video verification stats:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      };
    }
  }

  /**
   * Get all videos from Firebase for verification
   */
  async getAllVideos(): Promise<TalentVideo[]> {
    try {
      const videosRef = collection(db, this.COLLECTION_NAME);
      const querySnapshot = await getDocs(videosRef);

      const videos: TalentVideo[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        videos.push({
          id: doc.id,
          title: data.title || 'Untitled Video',
          description: data.description || '',
          videoUrl: data.videoUrl || '',
          thumbnail: data.thumbnail || '',
          category: data.category || '',
          userName: data.userName || 'Unknown User',
          userId: data.userId || '',
          userEmail: data.userEmail || '',
          verificationStatus: data.verificationStatus || 'pending',
          isFlagged: data.isFlagged || false,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          isVerified: data.isVerified || false,
          isActive: data.isActive !== false
        } as TalentVideo);
      });

      return videos;
    } catch (error) {
      console.error('Error getting all videos from Firebase:', error);
      return [];
    }
  }
}

// Create singleton instance
export const videoVerificationService = new VideoVerificationService();
export default videoVerificationService;