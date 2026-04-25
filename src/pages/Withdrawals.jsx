import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, where, addDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ArrowUpCircle, Check, X, Eye } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Textarea from '../components/common/Textarea';
import Tabs from '../components/common/Tabs';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc')));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawals(data);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => w.status === activeTab);

  const tabs = [
    { value: 'pending', label: 'Pending', count: withdrawals.filter(w => w.status === 'pending').length },
    { value: 'completed', label: 'Completed', count: withdrawals.filter(w => w.status === 'completed').length },
    { value: 'rejected', label: 'Rejected', count: withdrawals.filter(w => w.status === 'rejected').length }
  ];

  const viewWithdrawal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setViewModalOpen(true);
  };

  const approveWithdrawal = async (withdrawal) => {
    setProcessing(true);
    try {
      // Update withdrawal status
      await updateDoc(doc(db, 'withdrawals', withdrawal.id), {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update the existing pending transaction to completed
      const transactionsSnap = await getDocs(
        query(collection(db, 'transactions'),
          where('referenceId', '==', withdrawal.id),
          where('status', '==', 'pending')
        )
      );

      transactionsSnap.docs.forEach(async (transDoc) => {
        await updateDoc(doc(db, 'transactions', transDoc.id), {
          status: 'completed',
          description: `Withdrawal Completed - ${withdrawal.paymentMethod}`,
          updatedAt: serverTimestamp()
        });
      });

      await fetchWithdrawals();
      setViewModalOpen(false);
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      alert('Failed to approve withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const rejectWithdrawal = async () => {
    if (!selectedWithdrawal || !rejectReason) return;
    setProcessing(true);

    try {
      // Update withdrawal status
      await updateDoc(doc(db, 'withdrawals', selectedWithdrawal.id), {
        status: 'rejected',
        rejectReason: rejectReason,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Return money to user's wallet (money was deducted when request was created)
      const userRef = doc(db, 'users', selectedWithdrawal.userId);
      await updateDoc(userRef, {
        walletBalance: increment(selectedWithdrawal.amount),
        winningBalance: increment(selectedWithdrawal.amount),
        updatedAt: serverTimestamp()
      });

      // Update the existing pending transaction to rejected
      const transactionsSnap = await getDocs(
        query(collection(db, 'transactions'),
          where('referenceId', '==', selectedWithdrawal.id),
          where('status', '==', 'pending')
        )
      );

      transactionsSnap.docs.forEach(async (transDoc) => {
        await updateDoc(doc(db, 'transactions', transDoc.id), {
          status: 'rejected',
          description: `Withdrawal Rejected - ${rejectReason}`,
          updatedAt: serverTimestamp()
        });
      });

      // Create a new refund transaction to show in history
      await addDoc(collection(db, 'transactions'), {
        userId: selectedWithdrawal.userId,
        userName: selectedWithdrawal.userName,
        userEmail: selectedWithdrawal.userEmail,
        type: 'refund',
        amount: selectedWithdrawal.amount,
        description: `Withdrawal Refund - ${rejectReason}`,
        status: 'completed',
        referenceId: selectedWithdrawal.id,
        createdAt: serverTimestamp()
      });

      await fetchWithdrawals();
      setRejectModalOpen(false);
      setViewModalOpen(false);
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loader text="Loading withdrawals..." />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Withdrawals</h1>
        <p className="text-gray-400 mt-1">Manage withdrawal requests</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {filteredWithdrawals.length === 0 ? (
        <EmptyState
          icon={ArrowUpCircle}
          title={`No ${activeTab} withdrawals`}
          description={`There are no ${activeTab} withdrawal requests`}
        />
      ) : (
        <div className="space-y-4">
          {filteredWithdrawals.map((withdrawal) => (
            <Card key={withdrawal.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-white">{withdrawal.userName || 'Unknown User'}</h3>
                  <Badge status={withdrawal.status} />
                </div>
                <p className="text-sm text-gray-400">{withdrawal.userEmail}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="text-red-400 font-semibold">{formatCurrency(withdrawal.amount)}</span>
                  <span className="text-gray-500">{withdrawal.paymentMethod}</span>
                  <span className="text-gray-500">{formatDateTime(withdrawal.createdAt)}</span>
                </div>
                {withdrawal.status === 'rejected' && withdrawal.rejectReason && (
                  <p className="text-sm text-red-400 mt-2">Reason: {withdrawal.rejectReason}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={Eye} onClick={() => viewWithdrawal(withdrawal)}>
                  View
                </Button>
                {withdrawal.status === 'pending' && (
                  <>
                    <Button variant="success" size="sm" icon={Check} onClick={() => approveWithdrawal(withdrawal)} loading={processing}>
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" icon={X} onClick={() => openRejectModal(withdrawal)}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Withdrawal Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Withdrawal Details" size="md">
        {selectedWithdrawal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">User</p>
                <p className="text-white font-medium">{selectedWithdrawal.userName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{selectedWithdrawal.userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Amount</p>
                <p className="text-red-400 font-bold text-xl">{formatCurrency(selectedWithdrawal.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <Badge status={selectedWithdrawal.status} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Payment Method</p>
                <p className="text-white">{selectedWithdrawal.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Requested At</p>
                <p className="text-white">{formatDateTime(selectedWithdrawal.createdAt)}</p>
              </div>
            </div>

            {selectedWithdrawal.upiId && (
              <div className="p-3 bg-dark-400 rounded-lg">
                <p className="text-sm text-gray-400">UPI ID</p>
                <p className="text-white font-mono">{selectedWithdrawal.upiId}</p>
              </div>
            )}

            {selectedWithdrawal.bankDetails && (
              <div className="p-3 bg-dark-400 rounded-lg space-y-2">
                <p className="text-sm text-gray-400">Bank Details</p>
                {selectedWithdrawal.bankDetails.bankName && (
                  <p className="text-white"><span className="text-gray-500">Bank:</span> {selectedWithdrawal.bankDetails.bankName}</p>
                )}
                <p className="text-white"><span className="text-gray-500">Account:</span> {selectedWithdrawal.bankDetails.accountNumber}</p>
                <p className="text-white"><span className="text-gray-500">IFSC:</span> {selectedWithdrawal.bankDetails.ifsc}</p>
                <p className="text-white"><span className="text-gray-500">Name:</span> {selectedWithdrawal.bankDetails.accountName}</p>
              </div>
            )}

            {selectedWithdrawal.status === 'rejected' && selectedWithdrawal.rejectReason && (
              <div className="p-3 bg-red-500/20 rounded-lg">
                <p className="text-sm text-gray-400">Rejection Reason</p>
                <p className="text-red-400">{selectedWithdrawal.rejectReason}</p>
              </div>
            )}

            {selectedWithdrawal.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-dark-200">
                <Button variant="success" icon={Check} onClick={() => approveWithdrawal(selectedWithdrawal)} loading={processing} className="flex-1">
                  Approve & Mark Paid
                </Button>
                <Button variant="danger" icon={X} onClick={() => openRejectModal(selectedWithdrawal)} className="flex-1">
                  Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Withdrawal" size="sm">
        <div>
          <p className="text-gray-400 mb-4">
            Please provide a reason for rejecting this withdrawal request of {formatCurrency(selectedWithdrawal?.amount || 0)}.
          </p>
          <Textarea
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            required
          />
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={rejectWithdrawal} loading={processing} disabled={!rejectReason} className="flex-1">
              Reject Withdrawal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
