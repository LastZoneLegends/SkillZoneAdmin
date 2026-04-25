import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, where, addDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ArrowDownCircle, Check, X, Eye, Image as ImageIcon } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Tabs from '../components/common/Tabs';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Deposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'deposit_requests'), orderBy('createdAt', 'desc')));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDeposits(data);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeposits = deposits.filter(d => d.status === activeTab);

  const tabs = [
    { value: 'pending', label: 'Pending', count: deposits.filter(d => d.status === 'pending').length },
    { value: 'approved', label: 'Approved', count: deposits.filter(d => d.status === 'approved').length },
    { value: 'rejected', label: 'Rejected', count: deposits.filter(d => d.status === 'rejected').length }
  ];

  const viewDeposit = (deposit) => {
    setSelectedDeposit(deposit);
    setViewModalOpen(true);
  };

  const approveDeposit = async (deposit) => {
    setProcessing(true);
    try {
      // Update deposit status
      await updateDoc(doc(db, 'deposit_requests', deposit.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update user wallet balance using increment
      const userRef = doc(db, 'users', deposit.userId);
      await updateDoc(userRef, {
        walletBalance: increment(deposit.amount),
        depositedBalance: increment(deposit.amount),
        updatedAt: serverTimestamp()
      });

      // Update the existing pending transaction to completed
      const transactionsSnap = await getDocs(
        query(collection(db, 'transactions'),
          where('referenceId', '==', deposit.id),
          where('status', '==', 'pending')
        )
      );

      transactionsSnap.docs.forEach(async (transDoc) => {
        await updateDoc(doc(db, 'transactions', transDoc.id), {
          status: 'completed',
          description: `Deposit Approved - UTR: ${deposit.utr}`,
          updatedAt: serverTimestamp()
        });
      });

      await fetchDeposits();
      setViewModalOpen(false);
    } catch (error) {
      console.error('Error approving deposit:', error);
      alert('Failed to approve deposit');
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (deposit) => {
    setSelectedDeposit(deposit);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const rejectDeposit = async () => {
    if (!selectedDeposit || !rejectReason) return;
    setProcessing(true);

    try {
      // Update deposit status
      await updateDoc(doc(db, 'deposit_requests', selectedDeposit.id), {
        status: 'rejected',
        rejectReason: rejectReason,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update the existing pending transaction to rejected
      const transactionsSnap = await getDocs(
        query(collection(db, 'transactions'),
          where('referenceId', '==', selectedDeposit.id),
          where('status', '==', 'pending')
        )
      );

      transactionsSnap.docs.forEach(async (transDoc) => {
        await updateDoc(doc(db, 'transactions', transDoc.id), {
          status: 'rejected',
          description: `Deposit Rejected - ${rejectReason}`,
          updatedAt: serverTimestamp()
        });
      });

      await fetchDeposits();
      setRejectModalOpen(false);
      setViewModalOpen(false);
    } catch (error) {
      console.error('Error rejecting deposit:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loader text="Loading deposits..." />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Deposits</h1>
        <p className="text-gray-400 mt-1">Manage deposit requests</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {filteredDeposits.length === 0 ? (
        <EmptyState
          icon={ArrowDownCircle}
          title={`No ${activeTab} deposits`}
          description={`There are no ${activeTab} deposit requests`}
        />
      ) : (
        <div className="space-y-4">
          {filteredDeposits.map((deposit) => (
            <Card key={deposit.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-white">{deposit.userName || 'Unknown User'}</h3>
                  <Badge status={deposit.status} />
                </div>
                <p className="text-sm text-gray-400">{deposit.userEmail}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="text-green-400 font-semibold">{formatCurrency(deposit.amount)}</span>
                  <span className="text-gray-500">UTR: {deposit.utr}</span>
                  <span className="text-gray-500">{formatDateTime(deposit.createdAt)}</span>
                </div>
                {deposit.status === 'rejected' && deposit.rejectReason && (
                  <p className="text-sm text-red-400 mt-2">Reason: {deposit.rejectReason}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={Eye} onClick={() => viewDeposit(deposit)}>
                  View
                </Button>
                {deposit.status === 'pending' && (
                  <>
                    <Button variant="success" size="sm" icon={Check} onClick={() => approveDeposit(deposit)} loading={processing}>
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" icon={X} onClick={() => openRejectModal(deposit)}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Deposit Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Deposit Details" size="lg">
        {selectedDeposit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">User</p>
                <p className="text-white font-medium">{selectedDeposit.userName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{selectedDeposit.userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Amount</p>
                <p className="text-green-400 font-bold text-xl">{formatCurrency(selectedDeposit.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">UTR / Transaction ID</p>
                <p className="text-white font-mono">{selectedDeposit.utr}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <Badge status={selectedDeposit.status} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Requested At</p>
                <p className="text-white">{formatDateTime(selectedDeposit.createdAt)}</p>
              </div>
            </div>

            {selectedDeposit.screenshot && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Payment Screenshot</p>
                <div className="bg-dark-400 rounded-lg p-2">
                  <img
                    src={selectedDeposit.screenshot}
                    alt="Payment Screenshot"
                    className="max-w-full max-h-96 mx-auto rounded-lg"
                  />
                </div>
              </div>
            )}

            {selectedDeposit.status === 'rejected' && selectedDeposit.rejectReason && (
              <div className="p-3 bg-red-500/20 rounded-lg">
                <p className="text-sm text-gray-400">Rejection Reason</p>
                <p className="text-red-400">{selectedDeposit.rejectReason}</p>
              </div>
            )}

            {selectedDeposit.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-dark-200">
                <Button variant="success" icon={Check} onClick={() => approveDeposit(selectedDeposit)} loading={processing} className="flex-1">
                  Approve Deposit
                </Button>
                <Button variant="danger" icon={X} onClick={() => openRejectModal(selectedDeposit)} className="flex-1">
                  Reject Deposit
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Deposit" size="sm">
        <div>
          <p className="text-gray-400 mb-4">
            Please provide a reason for rejecting this deposit request of {formatCurrency(selectedDeposit?.amount || 0)}.
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
            <Button variant="danger" onClick={rejectDeposit} loading={processing} disabled={!rejectReason} className="flex-1">
              Reject Deposit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
