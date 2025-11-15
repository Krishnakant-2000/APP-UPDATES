/**
 * Admin Connection Service
 * Manages approval and rejection of organization-athlete connection requests
 */

import { db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  Timestamp,
  orderBy,
  limit,
  QueryConstraint,
  startAfter,
  writeBatch
} from 'firebase/firestore';
import {
  OrganizationConnectionRequest,
  ApproveConnectionRequestData,
  RejectConnectionRequestData,
  ConnectionRequestStats,
  OrgConnectionStatus
} from '../../types/models/organizationConnection';
import { organizationConnectionService } from './organizationConnectionService';

const COLLECTION_NAME = 'organizationConnectionRequests';
const INTERACTIONS_COLLECTION = 'connectionInteractions';

class AdminConnectionService {
  /**
   * Get all pending connection requests for admin review
   */
  async getAllPendingRequests(
    pageSize: number = 20,
    lastDoc?: any
  ): Promise<{
    requests: OrganizationConnectionRequest[];
    lastDoc: any;
  }> {
    try {
      const constraints: QueryConstraint[] = [
        where('status', '==', 'pending'),
        orderBy('requestDate', 'desc'),
        limit(pageSize + 1)
      ];

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      const docs = querySnapshot.docs;
      const hasMore = docs.length > pageSize;
      const requests = docs.slice(0, pageSize).map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrganizationConnectionRequest));

      console.log(`📋 Found ${requests.length} pending connection requests`);
      return {
        requests,
        lastDoc: hasMore ? docs[pageSize - 1] : null
      };
    } catch (error) {
      console.error('❌ Error getting pending requests:', error);
      throw error;
    }
  }

  /**
   * Get approved connections for admin review
   */
  async getAllApprovedConnections(
    pageSize: number = 20,
    lastDoc?: any
  ): Promise<{
    requests: OrganizationConnectionRequest[];
    lastDoc: any;
  }> {
    try {
      const constraints: QueryConstraint[] = [
        where('status', '==', 'approved'),
        orderBy('approvalDate', 'desc'),
        limit(pageSize + 1)
      ];

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      const docs = querySnapshot.docs;
      const hasMore = docs.length > pageSize;
      const requests = docs.slice(0, pageSize).map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrganizationConnectionRequest));

      return {
        requests,
        lastDoc: hasMore ? docs[pageSize - 1] : null
      };
    } catch (error) {
      console.error('❌ Error getting approved connections:', error);
      throw error;
    }
  }

  /**
   * Get rejected connections for admin review
   */
  async getAllRejectedConnections(
    pageSize: number = 20,
    lastDoc?: any
  ): Promise<{
    requests: OrganizationConnectionRequest[];
    lastDoc: any;
  }> {
    try {
      const constraints: QueryConstraint[] = [
        where('status', '==', 'rejected'),
        orderBy('rejectionDate', 'desc'),
        limit(pageSize + 1)
      ];

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      const docs = querySnapshot.docs;
      const hasMore = docs.length > pageSize;
      const requests = docs.slice(0, pageSize).map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrganizationConnectionRequest));

      return {
        requests,
        lastDoc: hasMore ? docs[pageSize - 1] : null
      };
    } catch (error) {
      console.error('❌ Error getting rejected connections:', error);
      throw error;
    }
  }

  /**
   * Approve a connection request
   * Creates friendship between organization and athlete
   * Sends notifications to both parties
   */
  async approveConnectionRequest(
    data: ApproveConnectionRequestData
  ): Promise<OrganizationConnectionRequest> {
    try {
      const request = await organizationConnectionService.getConnectionRequest(data.requestId);

      if (!request) {
        throw new Error('Connection request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Cannot approve a ${request.status} connection request`);
      }

      // Get user details for friendship creation
      const organizationRef = doc(db, 'users', request.organizationId);
      const athleteRef = doc(db, 'users', request.athleteId);

      const [orgDoc, athleteDoc] = await Promise.all([
        getDoc(organizationRef),
        getDoc(athleteRef)
      ]);

      if (!orgDoc.exists() || !athleteDoc.exists()) {
        throw new Error('Organization or athlete not found');
      }

      const orgData = orgDoc.data();
      const athleteData = athleteDoc.data();

      // Create friendship document
      const friendshipData = {
        requesterId: request.organizationId,
        requesterName: request.organizationName,
        requesterPhotoURL: orgData.photoURL || '',
        recipientId: request.athleteId,
        recipientName: request.athleteName,
        recipientPhotoURL: request.athletePhotoURL,
        status: 'accepted',
        createdAt: Timestamp.now(),
        connectionRequestId: data.requestId, // Link back to original request
        createdViaOrgConnection: true // Flag to indicate this was org connection
      };

      const friendshipRef = await addDoc(collection(db, 'friendships'), friendshipData);

      // Update connection request with approval info
      await organizationConnectionService.updateConnectionStatus(data.requestId, 'approved', {
        approvalDate: Timestamp.now(),
        approvedByAdminId: data.adminId,
        approvedByAdminName: data.adminName,
        notes: data.notes,
        friendshipId: friendshipRef.id
      });

      // Log interaction
      await organizationConnectionService.logInteraction({
        connectionRequestId: data.requestId,
        organizationId: request.organizationId,
        athleteId: request.athleteId,
        action: 'request_approved',
        performedByUserId: data.adminId,
        metadata: {
          adminName: data.adminName,
          notes: data.notes
        }
      });

      // Create notifications for both parties
      await this.createApprovalNotifications(request, data.adminName);

      console.log('✅ Connection request approved:', data.requestId);

      const updatedRequest = await organizationConnectionService.getConnectionRequest(
        data.requestId
      );
      return updatedRequest!;
    } catch (error) {
      console.error('❌ Error approving connection request:', error);
      throw error;
    }
  }

  /**
   * Reject a connection request
   */
  async rejectConnectionRequest(
    data: RejectConnectionRequestData
  ): Promise<OrganizationConnectionRequest> {
    try {
      const request = await organizationConnectionService.getConnectionRequest(data.requestId);

      if (!request) {
        throw new Error('Connection request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Cannot reject a ${request.status} connection request`);
      }

      // Update connection request with rejection info
      await organizationConnectionService.updateConnectionStatus(data.requestId, 'rejected', {
        rejectionDate: Timestamp.now(),
        rejectedByAdminId: data.adminId,
        rejectedByAdminName: data.adminName,
        rejectionReason: data.reason
      });

      // Log interaction
      await organizationConnectionService.logInteraction({
        connectionRequestId: data.requestId,
        organizationId: request.organizationId,
        athleteId: request.athleteId,
        action: 'request_approved', // Reuse same action type but will be differentiated in UI
        performedByUserId: data.adminId,
        metadata: {
          action: 'rejected',
          adminName: data.adminName,
          reason: data.reason
        }
      });

      // Create rejection notification for athlete
      await this.createRejectionNotifications(request, data.reason, data.adminName);

      console.log('✅ Connection request rejected:', data.requestId);

      const updatedRequest = await organizationConnectionService.getConnectionRequest(
        data.requestId
      );
      return updatedRequest!;
    } catch (error) {
      console.error('❌ Error rejecting connection request:', error);
      throw error;
    }
  }

  /**
   * Get connection request statistics
   */
  async getConnectionStats(): Promise<ConnectionRequestStats> {
    try {
      const [pendingDocs, approvedDocs, rejectedDocs] = await Promise.all([
        getDocs(
          query(collection(db, COLLECTION_NAME), where('status', '==', 'pending'))
        ),
        getDocs(
          query(collection(db, COLLECTION_NAME), where('status', '==', 'approved'))
        ),
        getDocs(
          query(collection(db, COLLECTION_NAME), where('status', '==', 'rejected'))
        )
      ]);

      const totalPending = pendingDocs.size;
      const totalApproved = approvedDocs.size;
      const totalRejected = rejectedDocs.size;
      const total = totalPending + totalApproved + totalRejected;

      // Calculate approval rate
      const approvalRate = total > 0 ? (totalApproved / total) * 100 : 0;

      // Get top organizations
      const orgStats: Record<string, { name: string; total: number; approved: number }> = {};
      const allRequests = [
        ...pendingDocs.docs,
        ...approvedDocs.docs,
        ...rejectedDocs.docs
      ];

      allRequests.forEach(doc => {
        const data = doc.data();
        if (!orgStats[data.organizationId]) {
          orgStats[data.organizationId] = {
            name: data.organizationName,
            total: 0,
            approved: 0
          };
        }
        orgStats[data.organizationId].total++;
        if (data.status === 'approved') {
          orgStats[data.organizationId].approved++;
        }
      });

      const topOrganizations = Object.entries(orgStats)
        .map(([id, stats]) => ({
          organizationId: id,
          organizationName: stats.name,
          requestCount: stats.total,
          approvedCount: stats.approved
        }))
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10);

      // Get top athletes
      const athleteStats: Record<string, { name: string; total: number; approved: number }> = {};

      allRequests.forEach(doc => {
        const data = doc.data();
        if (!athleteStats[data.athleteId]) {
          athleteStats[data.athleteId] = {
            name: data.athleteName,
            total: 0,
            approved: 0
          };
        }
        athleteStats[data.athleteId].total++;
        if (data.status === 'approved') {
          athleteStats[data.athleteId].approved++;
        }
      });

      const topAthletes = Object.entries(athleteStats)
        .map(([id, stats]) => ({
          athleteId: id,
          athleteName: stats.name,
          requestCount: stats.total,
          approvedCount: stats.approved
        }))
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10);

      const stats: ConnectionRequestStats = {
        totalPending,
        totalApproved,
        totalRejected,
        approvalRate: Math.round(approvalRate * 100) / 100,
        topOrganizations,
        topAthletes
      };

      console.log('📊 Connection statistics:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error getting connection statistics:', error);
      throw error;
    }
  }

  /**
   * Get all connections by organization
   */
  async getConnectionsByOrganization(
    organizationId: string
  ): Promise<OrganizationConnectionRequest[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organizationId', '==', organizationId),
        orderBy('requestDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrganizationConnectionRequest));

      return requests;
    } catch (error) {
      console.error('❌ Error getting connections by organization:', error);
      throw error;
    }
  }

  /**
   * Get all connections by athlete
   */
  async getConnectionsByAthlete(
    athleteId: string
  ): Promise<OrganizationConnectionRequest[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('athleteId', '==', athleteId),
        orderBy('requestDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrganizationConnectionRequest));

      return requests;
    } catch (error) {
      console.error('❌ Error getting connections by athlete:', error);
      throw error;
    }
  }

  /**
   * Create approval notifications
   */
  private async createApprovalNotifications(
    request: OrganizationConnectionRequest,
    adminName: string
  ): Promise<void> {
    try {
      const notifications = [
        {
          userId: request.athleteId,
          type: 'org_connection_approved',
          title: `${request.organizationName} connection approved`,
          message: `Your connection request from ${request.organizationName} has been approved by admin ${adminName}. You can now message them!`,
          relatedUserId: request.organizationId,
          relatedUserName: request.organizationName,
          createdAt: Timestamp.now(),
          read: false
        },
        {
          userId: request.organizationId,
          type: 'org_connection_approved',
          title: `Connection with ${request.athleteName} approved`,
          message: `Your connection request with ${request.athleteName} has been approved! You can now message them.`,
          relatedUserId: request.athleteId,
          relatedUserName: request.athleteName,
          createdAt: Timestamp.now(),
          read: false
        }
      ];

      const batch = writeBatch(db);
      notifications.forEach(notification => {
        const docRef = doc(collection(db, 'notifications'));
        batch.set(docRef, notification);
      });

      await batch.commit();
      console.log('✅ Approval notifications created');
    } catch (error) {
      console.error('⚠️ Error creating approval notifications:', error);
      // Don't throw - notifications are nice to have but not critical
    }
  }

  /**
   * Create rejection notifications
   */
  private async createRejectionNotifications(
    request: OrganizationConnectionRequest,
    reason: string,
    adminName: string
  ): Promise<void> {
    try {
      const notification = {
        userId: request.athleteId,
        type: 'org_connection_rejected',
        title: `${request.organizationName} connection request rejected`,
        message: `Connection request from ${request.organizationName} was not approved. Reason: ${reason}`,
        relatedUserId: request.organizationId,
        relatedUserName: request.organizationName,
        createdAt: Timestamp.now(),
        read: false
      };

      await addDoc(collection(db, 'notifications'), notification);
      console.log('✅ Rejection notification created');
    } catch (error) {
      console.error('⚠️ Error creating rejection notification:', error);
      // Don't throw - notifications are nice to have but not critical
    }
  }
}

export const adminConnectionService = new AdminConnectionService();
