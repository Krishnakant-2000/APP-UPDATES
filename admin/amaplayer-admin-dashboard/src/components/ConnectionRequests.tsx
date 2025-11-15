import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  writeBatch,
  getDoc,
  orderBy,
  limit,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import './ConnectionRequests.css';

interface OrganizationConnectionRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  athleteId: string;
  athleteName: string;
  athletePhotoURL: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Timestamp | Date | string;
  approvalDate?: Timestamp | Date | string;
  rejectionDate?: Timestamp | Date | string;
  approvedByAdminId?: string;
  approvedByAdminName?: string;
  rejectedByAdminId?: string;
  rejectedByAdminName?: string;
  rejectionReason?: string;
  notes?: string;
}

interface ConnectionRequestStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
}

interface TabType {
  pending: 'pending';
  approved: 'approved';
  rejected: 'rejected';
}

export const ConnectionRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<keyof TabType>('pending');
  const [requests, setRequests] = useState<OrganizationConnectionRequest[]>([]);
  const [stats, setStats] = useState<ConnectionRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<OrganizationConnectionRequest | null>(null);
  const [approvalModal, setApprovalModal] = useState(false);
  const [rejectionModal, setRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Load data on component mount and tab change
  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const constraints: QueryConstraint[] = [];

      if (activeTab === 'pending') {
        constraints.push(where('status', '==', 'pending'));
      } else if (activeTab === 'approved') {
        constraints.push(where('status', '==', 'approved'));
      } else {
        constraints.push(where('status', '==', 'rejected'));
      }

      constraints.push(orderBy('requestDate', 'desc'));
      constraints.push(limit(50));

      const q = query(collection(db, 'organizationConnectionRequests'), ...constraints);
      const querySnapshot = await getDocs(q);

      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrganizationConnectionRequest));

      setRequests(data);
    } catch (err: any) {
      console.error('❌ Error loading connection requests:', err);
      setError(err.message || 'Failed to load connection requests');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [pendingDocs, approvedDocs, rejectedDocs] = await Promise.all([
        getDocs(
          query(collection(db, 'organizationConnectionRequests'), where('status', '==', 'pending'))
        ),
        getDocs(
          query(collection(db, 'organizationConnectionRequests'), where('status', '==', 'approved'))
        ),
        getDocs(
          query(collection(db, 'organizationConnectionRequests'), where('status', '==', 'rejected'))
        )
      ]);

      const totalPending = pendingDocs.size;
      const totalApproved = approvedDocs.size;
      const totalRejected = rejectedDocs.size;
      const total = totalPending + totalApproved + totalRejected;
      const approvalRate = total > 0 ? (totalApproved / total) * 100 : 0;

      setStats({
        totalPending,
        totalApproved,
        totalRejected,
        approvalRate: Math.round(approvalRate * 100) / 100
      });
    } catch (err: any) {
      console.error('❌ Error loading statistics:', err);
    }
  };

  const handleApproveClick = (request: OrganizationConnectionRequest) => {
    setSelectedRequest(request);
    setApprovalModal(true);
  };

  const handleRejectClick = (request: OrganizationConnectionRequest) => {
    setSelectedRequest(request);
    setRejectionModal(true);
  };

  const confirmApproval = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      const currentUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

      // Update the request status to approved
      const requestRef = doc(db, 'organizationConnectionRequests', selectedRequest.id);
      await updateDoc(requestRef, {
        status: 'approved',
        approvalDate: Timestamp.now(),
        approvedByAdminId: currentUser.uid || 'unknown',
        approvedByAdminName: currentUser.displayName || 'Admin',
        notes: approvalNotes
      });

      // Create friendship document
      const friendshipData = {
        requesterId: selectedRequest.organizationId,
        requesterName: selectedRequest.organizationName,
        requesterPhotoURL: '',
        recipientId: selectedRequest.athleteId,
        recipientName: selectedRequest.athleteName,
        recipientPhotoURL: selectedRequest.athletePhotoURL,
        status: 'accepted',
        createdAt: Timestamp.now(),
        connectionRequestId: selectedRequest.id,
        createdViaOrgConnection: true
      };

      await addDoc(collection(db, 'friendships'), friendshipData);

      // Create notifications
      const notifications = [
        {
          userId: selectedRequest.athleteId,
          type: 'org_connection_approved',
          title: `${selectedRequest.organizationName} connection approved`,
          message: `Your connection request from ${selectedRequest.organizationName} has been approved. You can now message them!`,
          relatedUserId: selectedRequest.organizationId,
          relatedUserName: selectedRequest.organizationName,
          createdAt: Timestamp.now(),
          read: false
        },
        {
          userId: selectedRequest.organizationId,
          type: 'org_connection_approved',
          title: `Connection with ${selectedRequest.athleteName} approved`,
          message: `Your connection request with ${selectedRequest.athleteName} has been approved! You can now message them.`,
          relatedUserId: selectedRequest.athleteId,
          relatedUserName: selectedRequest.athleteName,
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

      setApprovalModal(false);
      setApprovalNotes('');
      setSelectedRequest(null);
      await loadData();
      await loadStats();
    } catch (err: any) {
      console.error('❌ Error approving request:', err);
      setError(err.message || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const confirmRejection = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      const currentUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

      // Update the request status to rejected
      const requestRef = doc(db, 'organizationConnectionRequests', selectedRequest.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionDate: Timestamp.now(),
        rejectedByAdminId: currentUser.uid || 'unknown',
        rejectedByAdminName: currentUser.displayName || 'Admin',
        rejectionReason: rejectionReason
      });

      // Create rejection notification
      await addDoc(collection(db, 'notifications'), {
        userId: selectedRequest.athleteId,
        type: 'org_connection_rejected',
        title: `${selectedRequest.organizationName} connection request rejected`,
        message: `Connection request from ${selectedRequest.organizationName} was not approved. Reason: ${rejectionReason}`,
        relatedUserId: selectedRequest.organizationId,
        relatedUserName: selectedRequest.organizationName,
        createdAt: Timestamp.now(),
        read: false
      });

      setRejectionModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      await loadData();
      await loadStats();
    } catch (err: any) {
      console.error('❌ Error rejecting request:', err);
      setError(err.message || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="connection-requests-container">
      <h2>Organization-Athlete Connection Management</h2>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number pending">{stats.totalPending}</div>
            <div className="stat-label">Pending Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-number approved">{stats.totalApproved}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-number rejected">{stats.totalRejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.approvalRate}%</div>
            <div className="stat-label">Approval Rate</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          📋 Pending Requests ({stats?.totalPending || 0})
        </button>
        <button
          className={`tab ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          ✅ Approved ({stats?.totalApproved || 0})
        </button>
        <button
          className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          ❌ Rejected ({stats?.totalRejected || 0})
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading State */}
      {loading && <div className="loading">Loading connection requests...</div>}

      {/* Requests Table */}
      {!loading && (
        <div className="table-container">
          {requests.length === 0 ? (
            <div className="empty-state">
              No {activeTab} connection requests found
            </div>
          ) : (
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Athlete</th>
                  <th>Request Date</th>
                  {activeTab === 'pending' && <th>Actions</th>}
                  {activeTab === 'approved' && (
                    <>
                      <th>Approved Date</th>
                      <th>Approved By</th>
                    </>
                  )}
                  {activeTab === 'rejected' && (
                    <>
                      <th>Rejected Date</th>
                      <th>Reason</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request.id}>
                    <td>{request.organizationName}</td>
                    <td>{request.athleteName}</td>
                    <td>{formatDate(request.requestDate)}</td>
                    {activeTab === 'pending' && (
                      <td className="actions">
                        <button
                          className="btn btn-approve"
                          onClick={() => handleApproveClick(request)}
                          disabled={processing}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn btn-reject"
                          onClick={() => handleRejectClick(request)}
                          disabled={processing}
                        >
                          ✗ Reject
                        </button>
                      </td>
                    )}
                    {activeTab === 'approved' && (
                      <>
                        <td>{formatDate(request.approvalDate)}</td>
                        <td>{request.approvedByAdminName || 'N/A'}</td>
                      </>
                    )}
                    {activeTab === 'rejected' && (
                      <>
                        <td>{formatDate(request.rejectionDate)}</td>
                        <td>{request.rejectionReason || 'No reason provided'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Approval Modal */}
      {approvalModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Approve Connection Request</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setApprovalModal(false);
                  setApprovalNotes('');
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Organization:</strong> {selectedRequest.organizationName}
              </p>
              <p>
                <strong>Athlete:</strong> {selectedRequest.athleteName}
              </p>
              <p>
                <strong>Request Date:</strong> {formatDate(selectedRequest.requestDate)}
              </p>
              <div className="form-group">
                <label>Admin Notes (optional):</label>
                <textarea
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setApprovalModal(false);
                  setApprovalNotes('');
                }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn btn-approve"
                onClick={confirmApproval}
                disabled={processing}
              >
                {processing ? 'Approving...' : 'Approve Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Reject Connection Request</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setRejectionModal(false);
                  setRejectionReason('');
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Organization:</strong> {selectedRequest.organizationName}
              </p>
              <p>
                <strong>Athlete:</strong> {selectedRequest.athleteName}
              </p>
              <p>
                <strong>Request Date:</strong> {formatDate(selectedRequest.requestDate)}
              </p>
              <div className="form-group">
                <label>Rejection Reason:</label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Explain why this connection is being rejected..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setRejectionModal(false);
                  setRejectionReason('');
                }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn btn-reject"
                onClick={confirmRejection}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? 'Rejecting...' : 'Reject Connection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionRequests;
