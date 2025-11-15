import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { organizationConnectionService } from '../../services/api';
import { OrganizationConnectionRequest } from '../../types/models/organizationConnection';
import './ConnectionRequestsSection.css';

interface ConnectionRequestsSectionProps {
  athleteId: string;
}

export const ConnectionRequestsSection: React.FC<ConnectionRequestsSectionProps> = ({
  athleteId
}) => {
  const [pendingRequests, setPendingRequests] = useState<OrganizationConnectionRequest[]>([]);
  const [approvedConnections, setApprovedConnections] = useState<OrganizationConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(true);

  useEffect(() => {
    loadConnectionRequests();
  }, [athleteId]);

  const loadConnectionRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load pending requests
      const pending = await organizationConnectionService.getAthleteConnectionRequests(
        athleteId,
        'pending'
      );

      // Load approved connections
      const approved = await organizationConnectionService.getApprovedConnectionsForAthlete(
        athleteId
      );

      setPendingRequests(pending);
      setApprovedConnections(
        approved.map(conn => ({
          id: conn.id,
          organizationId: conn.organizationId,
          organizationName: conn.organizationName,
          athleteId: athleteId,
          athleteName: conn.athleteName || '',
          status: 'approved' as const,
          requestDate: conn.approvalDate || new Date(),
          approvalDate: conn.approvalDate,
          approvedByAdminId: conn.approvedByAdminId,
          approvedByAdminName: conn.approvedByAdminName,
          notes: conn.notes
        } as unknown as OrganizationConnectionRequest))
      );
    } catch (err: any) {
      console.error('❌ Error loading connection requests:', err);
      setError(err.message || 'Failed to load connection requests');
    } finally {
      setLoading(false);
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

  if (loading) {
    return <div className="connection-section loading">Loading organization requests...</div>;
  }

  const hasRequests = pendingRequests.length > 0 || approvedConnections.length > 0;

  return (
    <div className="connection-section">
      <div className="connection-section-header">
        <h3>📊 Organization Connections</h3>
        <p className="subtitle">Track organization and coaching requests and approved connections</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!hasRequests ? (
        <div className="no-connections">
          <p>No organization connection requests or approved connections yet.</p>
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="connection-subsection">
              <div className="subsection-header" onClick={() => setShowPending(!showPending)}>
                <h4>
                  <span className="icon">⏳</span>
                  Pending Approvals ({pendingRequests.length})
                </h4>
                <span className={`toggle ${showPending ? 'open' : ''}`}>▼</span>
              </div>

              {showPending && (
                <div className="connection-list">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="connection-card pending">
                      <div className="card-header">
                        <div className="org-info">
                          <h5>{request.organizationName}</h5>
                          <p className="request-date">
                            Requested on {formatDate(request.requestDate)}
                          </p>
                        </div>
                        <div className="status-badge pending">
                          <span>⏳</span> Waiting for Admin Approval
                        </div>
                      </div>
                      <div className="card-body">
                        <p className="info-text">
                          This organization has requested to connect with you. An admin must
                          approve this request before you can start messaging.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Approved Connections */}
          {approvedConnections.length > 0 && (
            <div className="connection-subsection">
              <div className="subsection-header">
                <h4>
                  <span className="icon">✅</span>
                  Approved Connections ({approvedConnections.length})
                </h4>
              </div>

              <div className="connection-list">
                {approvedConnections.map(connection => (
                  <div key={connection.id} className="connection-card approved">
                    <div className="card-header">
                      <div className="org-info">
                        <h5>{connection.organizationName}</h5>
                        <p className="approval-date">
                          Approved on {formatDate(connection.approvalDate)}
                        </p>
                      </div>
                      <div className="status-badge approved">
                        <span>✓</span> Connected
                      </div>
                    </div>
                    <div className="card-body">
                      <p className="info-text">
                        You are now connected with {connection.organizationName}. You can message
                        and communicate directly.
                      </p>
                      {connection.notes && (
                        <div className="admin-notes">
                          <p className="label">📝 Admin Notes:</p>
                          <p className="notes-text">{connection.notes}</p>
                        </div>
                      )}
                      <button className="btn-message">
                        💬 Open Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConnectionRequestsSection;
