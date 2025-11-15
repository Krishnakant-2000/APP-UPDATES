/**
 * Organization Connection Service
 * Manages connection requests between organizations and athletes
 */

import { db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp,
  QueryConstraint,
  orderBy,
  limit,
  startAfter,
  Query,
  writeBatch,
  Transaction,
  runTransaction
} from 'firebase/firestore';
import {
  OrganizationConnectionRequest,
  SendOrgConnectionRequestData,
  ApprovedOrgConnection,
  ConnectionInteraction,
  ConnectionRequestFilter,
  OrgConnectionStatus
} from '../../types/models/organizationConnection';

const COLLECTION_NAME = 'organizationConnectionRequests';
const INTERACTIONS_COLLECTION = 'connectionInteractions';

class OrganizationConnectionService {
  /**
   * Send a connection request from organization to athlete
   */
  async sendConnectionRequest(
    data: SendOrgConnectionRequestData
  ): Promise<OrganizationConnectionRequest> {
    try {
      // Check if request already exists
      const existingRequest = await this.checkRequestExists(
        data.organizationId,
        data.athleteId
      );

      if (existingRequest) {
        throw new Error('Connection request already exists for this organization and athlete');
      }

      // Create new connection request
      const requestData = {
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        athleteId: data.athleteId,
        athleteName: data.athleteName,
        athletePhotoURL: data.athletePhotoURL,
        status: 'pending' as OrgConnectionStatus,
        requestDate: Timestamp.now(),
        createdByUserId: data.requestedByUserId
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), requestData);

      // Log interaction
      await this.logInteraction({
        connectionRequestId: docRef.id,
        organizationId: data.organizationId,
        athleteId: data.athleteId,
        action: 'request_sent',
        performedByUserId: data.requestedByUserId
      });

      console.log('✅ Connection request sent:', docRef.id);

      return {
        id: docRef.id,
        ...requestData,
        requestDate: Timestamp.now()
      } as OrganizationConnectionRequest;
    } catch (error) {
      console.error('❌ Error sending connection request:', error);
      throw error;
    }
  }

  /**
   * Check if a connection request already exists between organization and athlete
   */
  async checkRequestExists(
    organizationId: string,
    athleteId: string
  ): Promise<OrganizationConnectionRequest | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organizationId', '==', organizationId),
        where('athleteId', '==', athleteId),
        where('status', '!=', 'rejected')
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as OrganizationConnectionRequest;
    } catch (error) {
      console.error('❌ Error checking request existence:', error);
      throw error;
    }
  }

  /**
   * Get all pending connection requests for an athlete
   */
  async getAthleteConnectionRequests(
    athleteId: string,
    statusFilter?: OrgConnectionStatus
  ): Promise<OrganizationConnectionRequest[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('athleteId', '==', athleteId)
      ];

      if (statusFilter) {
        constraints.push(where('status', '==', statusFilter));
      }

      const q = query(
        collection(db, COLLECTION_NAME),
        ...constraints,
        orderBy('requestDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrganizationConnectionRequest));

      console.log(`📋 Found ${requests.length} connection requests for athlete:`, athleteId);
      return requests;
    } catch (error) {
      console.error('❌ Error getting athlete connection requests:', error);
      throw error;
    }
  }

  /**
   * Get all connection requests sent by an organization
   */
  async getOrganizationRequests(
    organizationId: string,
    statusFilter?: OrgConnectionStatus
  ): Promise<OrganizationConnectionRequest[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('organizationId', '==', organizationId)
      ];

      if (statusFilter) {
        constraints.push(where('status', '==', statusFilter));
      }

      const q = query(
        collection(db, COLLECTION_NAME),
        ...constraints,
        orderBy('requestDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrganizationConnectionRequest));

      console.log(
        `📋 Found ${requests.length} connection requests for organization:`,
        organizationId
      );
      return requests;
    } catch (error) {
      console.error('❌ Error getting organization requests:', error);
      throw error;
    }
  }

  /**
   * Get connection request by ID
   */
  async getConnectionRequest(requestId: string): Promise<OrganizationConnectionRequest | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, requestId);
      const docSnapshot = await getDoc(docRef);

      if (!docSnapshot.exists()) {
        console.warn('⚠️ Connection request not found:', requestId);
        return null;
      }

      return {
        id: docSnapshot.id,
        ...docSnapshot.data()
      } as OrganizationConnectionRequest;
    } catch (error) {
      console.error('❌ Error getting connection request:', error);
      throw error;
    }
  }

  /**
   * Get approved connections for an athlete
   */
  async getApprovedConnectionsForAthlete(
    athleteId: string
  ): Promise<ApprovedOrgConnection[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('athleteId', '==', athleteId),
        where('status', '==', 'approved'),
        orderBy('approvalDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const connections = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          organizationId: data.organizationId,
          organizationName: data.organizationName,
          athleteId: data.athleteId,
          athleteName: data.athleteName,
          approvalDate: data.approvalDate,
          approvedByAdminId: data.approvedByAdminId,
          approvedByAdminName: data.approvedByAdminName,
          friendshipId: data.friendshipId || '',
          notes: data.notes
        } as ApprovedOrgConnection;
      });

      return connections;
    } catch (error) {
      console.error('❌ Error getting approved connections:', error);
      throw error;
    }
  }

  /**
   * Get approved connections for an organization
   */
  async getApprovedConnectionsForOrganization(
    organizationId: string
  ): Promise<ApprovedOrgConnection[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organizationId', '==', organizationId),
        where('status', '==', 'approved'),
        orderBy('approvalDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const connections = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          organizationId: data.organizationId,
          organizationName: data.organizationName,
          athleteId: data.athleteId,
          athleteName: data.athleteName,
          approvalDate: data.approvalDate,
          approvedByAdminId: data.approvedByAdminId,
          approvedByAdminName: data.approvedByAdminName,
          friendshipId: data.friendshipId || '',
          notes: data.notes
        } as ApprovedOrgConnection;
      });

      return connections;
    } catch (error) {
      console.error('❌ Error getting approved connections for organization:', error);
      throw error;
    }
  }

  /**
   * Get connection history (all interactions) for an athlete
   */
  async getConnectionHistory(athleteId: string): Promise<ConnectionInteraction[]> {
    try {
      const q = query(
        collection(db, INTERACTIONS_COLLECTION),
        where('athleteId', '==', athleteId),
        orderBy('actionDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const interactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ConnectionInteraction));

      return interactions;
    } catch (error) {
      console.error('❌ Error getting connection history:', error);
      throw error;
    }
  }

  /**
   * Log a connection interaction
   */
  async logInteraction(interaction: Omit<ConnectionInteraction, 'id' | 'actionDate'>): Promise<void> {
    try {
      await addDoc(collection(db, INTERACTIONS_COLLECTION), {
        ...interaction,
        actionDate: Timestamp.now()
      });

      console.log('📝 Interaction logged:', interaction.action);
    } catch (error) {
      console.error('❌ Error logging interaction:', error);
      throw error;
    }
  }

  /**
   * Update connection request status
   * When approved, automatically creates a friendship between organization and athlete
   */
  async updateConnectionStatus(
    requestId: string,
    status: OrgConnectionStatus,
    updates?: Record<string, any>
  ): Promise<void> {
    try {
      // Get the connection request to fetch org/athlete details
      const connectionRequest = await this.getConnectionRequest(requestId);
      if (!connectionRequest) {
        throw new Error('Connection request not found');
      }

      const docRef = doc(db, COLLECTION_NAME, requestId);
      const updateData: Record<string, any> = { status };

      if (status === 'approved') {
        updateData.approvalDate = Timestamp.now();

        // Auto-create friendship when connection is approved
        try {
          await addDoc(collection(db, 'friendships'), {
            requesterId: connectionRequest.organizationId,
            requesterName: connectionRequest.organizationName,
            requesterPhotoURL: '',
            recipientId: connectionRequest.athleteId,
            recipientName: connectionRequest.athleteName,
            recipientPhotoURL: connectionRequest.athletePhotoURL,
            status: 'accepted',
            createdAt: Timestamp.now(),
            connectionRequestId: requestId,
            createdViaOrgConnection: true
          });

          console.log('✅ Friendship auto-created for approved connection');
        } catch (friendshipError) {
          console.error('⚠️ Error creating friendship (but connection approved):', friendshipError);
          // Don't throw - connection is already approved, friendship creation is secondary
        }
      } else if (status === 'rejected') {
        updateData.rejectionDate = Timestamp.now();
      }

      if (updates) {
        Object.assign(updateData, updates);
      }

      await updateDoc(docRef, updateData);
      console.log('✅ Connection status updated:', requestId, status);
    } catch (error) {
      console.error('❌ Error updating connection status:', error);
      throw error;
    }
  }

  /**
   * Get connection requests with filters
   */
  async getConnectionRequests(
    filter: ConnectionRequestFilter,
    pageSize: number = 20,
    lastDoc?: any
  ): Promise<{
    requests: OrganizationConnectionRequest[];
    lastDoc: any;
  }> {
    try {
      const constraints: QueryConstraint[] = [];

      if (filter.status) {
        constraints.push(where('status', '==', filter.status));
      }

      if (filter.organizationId) {
        constraints.push(where('organizationId', '==', filter.organizationId));
      }

      if (filter.athleteId) {
        constraints.push(where('athleteId', '==', filter.athleteId));
      }

      constraints.push(orderBy('requestDate', 'desc'));
      constraints.push(limit(pageSize + 1));

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
      console.error('❌ Error getting connection requests:', error);
      throw error;
    }
  }

  /**
   * Delete a connection request (only pending/rejected)
   */
  async deleteConnectionRequest(requestId: string): Promise<void> {
    try {
      const request = await this.getConnectionRequest(requestId);

      if (!request) {
        throw new Error('Connection request not found');
      }

      if (request.status === 'approved') {
        throw new Error('Cannot delete an approved connection request');
      }

      const docRef = doc(db, COLLECTION_NAME, requestId);
      await updateDoc(docRef, {
        deletedAt: Timestamp.now(),
        isDeleted: true
      });

      console.log('✅ Connection request deleted:', requestId);
    } catch (error) {
      console.error('❌ Error deleting connection request:', error);
      throw error;
    }
  }

  /**
   * Track a connection interaction (message sent, call initiated, etc.)
   */
  async trackConnectionInteraction(
    connectionId: string,
    action: 'request_sent' | 'request_approved' | 'request_rejected' | 'message_sent' | 'call_initiated',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const request = await this.getConnectionRequest(connectionId);

      if (!request) {
        throw new Error('Connection request not found');
      }

      await this.logInteraction({
        connectionRequestId: connectionId,
        organizationId: request.organizationId,
        athleteId: request.athleteId,
        action: action as any,
        performedByUserId: '', // Will be set by caller
        metadata
      });

      console.log('✅ Interaction tracked:', action);
    } catch (error) {
      console.error('❌ Error tracking interaction:', error);
      throw error;
    }
  }
}

export const organizationConnectionService = new OrganizationConnectionService();
