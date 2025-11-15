import { Timestamp } from 'firebase/firestore';

/**
 * Organization connection request status
 */
export type OrgConnectionStatus = 'pending' | 'approved' | 'rejected';

/**
 * Organization connection request
 */
export interface OrganizationConnectionRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  athleteId: string;
  athleteName: string;
  athletePhotoURL: string;
  status: OrgConnectionStatus;
  requestDate: Timestamp | Date | string;
  approvalDate?: Timestamp | Date | string;
  rejectionDate?: Timestamp | Date | string;
  approvedByAdminId?: string;
  approvedByAdminName?: string;
  rejectedByAdminId?: string;
  rejectedByAdminName?: string;
  notes?: string;
}

/**
 * Organization connection for tracking approved connections
 */
export interface ApprovedOrgConnection {
  id: string;
  organizationId: string;
  organizationName: string;
  athleteId: string;
  athleteName: string;
  athletePhotoURL?: string;
  approvalDate: Timestamp | Date | string;
  approvedByAdminId: string;
  approvedByAdminName: string;
  friendshipId: string;
  notes?: string;
}

/**
 * Organization connection interaction tracking
 */
export interface ConnectionInteraction {
  id: string;
  connectionRequestId: string;
  organizationId: string;
  athleteId: string;
  action: 'request_sent' | 'request_approved' | 'request_rejected' | 'message_sent' | 'call_initiated';
  actionDate: Timestamp | Date | string;
  performedByUserId: string;
  metadata?: Record<string, any>;
}

/**
 * Connection request statistics
 */
export interface ConnectionRequestStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
  averageApprovalTime?: number;
  topOrganizations?: Array<{
    organizationId: string;
    organizationName: string;
    requestCount: number;
    approvedCount: number;
  }>;
  topAthletes?: Array<{
    athleteId: string;
    athleteName: string;
    requestCount: number;
    approvedCount: number;
  }>;
}

/**
 * Connection request filter options
 */
export interface ConnectionRequestFilter {
  status?: OrgConnectionStatus;
  organizationId?: string;
  athleteId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sport?: string;
  approvedByAdminId?: string;
}

/**
 * Data for sending organization connection request
 */
export interface SendOrgConnectionRequestData {
  organizationId: string;
  organizationName: string;
  athleteId: string;
  athleteName: string;
  athletePhotoURL: string;
  requestedByUserId: string;
}

/**
 * Data for admin approval
 */
export interface ApproveConnectionRequestData {
  requestId: string;
  adminId: string;
  adminName: string;
  notes?: string;
}

/**
 * Data for admin rejection
 */
export interface RejectConnectionRequestData {
  requestId: string;
  adminId: string;
  adminName: string;
  reason: string;
}

/**
 * Connection history entry for audit trail
 */
export interface ConnectionHistoryEntry {
  id: string;
  connectionRequestId: string;
  organizationId: string;
  organizationName: string;
  athleteId: string;
  athleteName: string;
  requestDate: Timestamp | Date | string;
  status: OrgConnectionStatus;
  approvalDate?: Timestamp | Date | string;
  rejectionDate?: Timestamp | Date | string;
  approvedByAdminId?: string;
  approvedByAdminName?: string;
  rejectedByAdminId?: string;
  rejectedByAdminName?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  interactions: ConnectionInteraction[];
}
