import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Plus, Edit2, Trash2, Users as UsersIcon, Search, Eye, Wallet, ArrowDownCircle, ArrowUpCircle, DollarSign } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import SearchInput from '../components/common/SearchInput';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Badge from '../components/common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [referredUsersCount, setReferredUsersCount] = useState(0);
  const [referredUsersList, setReferredUsersList] = useState([]);
  const [referredUsersModalOpen, setReferredUsersModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    phone: '',
    walletBalance: '',
    status: 'active'
  });
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [fundData, setFundData] = useState({
    operation: 'deposit',
    walletType: 'deposited',
    amount: '',
    note: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(user =>
        user.displayName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.includes(query)
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        password: '',
        phone: user.phone || '',
        walletBalance: user.walletBalance?.toString() || '0',
        status: user.status || 'active'
      });
    } else {
      setSelectedUser(null);
      setFormData({
        displayName: '', email: '', password: '', phone: '', walletBalance: '0', status: 'active'
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (selectedUser) {
        // Update existing user
        const userData = {
          displayName: formData.displayName,
          phone: formData.phone,
          status: formData.status,
          updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, 'users', selectedUser.id), userData);
      } else {
        // Create new user - Note: In production, this should be done via Cloud Functions
        const userData = {
          displayName: formData.displayName,
          email: formData.email,
          phone: formData.phone,
          walletBalance: parseFloat(formData.walletBalance) || 0,
          depositedBalance: 0,
          winningBalance: 0,
          bonusBalance: parseFloat(formData.walletBalance) || 0,
          status: formData.status,
          role: 'user',
          referralCode: generateReferralCode(),
          matchesPlayed: 0,
          totalKills: 0,
          totalWinnings: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // In a real app, user creation should be handled by Cloud Functions
        // This is a simplified version for demo purposes
        await addDoc(collection(db, 'users'), userData);
      }

      await fetchUsers();
      closeModal();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateReferralCode = () => {
    return 'LZL' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSaving(true);

    try {
      await deleteDoc(doc(db, 'users', selectedUser.id));
      await fetchUsers();
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setSaving(false);
    }
  };

  const viewUser = (user) => {
  setSelectedUser(user);

  if (user?.referralCode) {
    const referredQuery = query(
      collection(db, "users"),
      where("referredBy", "==", user.referralCode)
    );

    getDocs(referredQuery).then((snapshot) => {
  setReferredUsersCount(snapshot.size);

  const referredList = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  setReferredUsersList(referredList);
});
    
  } else {
    setReferredUsersCount(0);
  }

  setViewModalOpen(true);
};

  const openFundModal = (user) => {
    setSelectedUser(user);
    setFundData({
      operation: 'deposit',
      walletType: 'deposited',
      amount: '',
      note: ''
    });
    setFundModalOpen(true);
  };

  const closeFundModal = () => {
    setFundModalOpen(false);
    setSelectedUser(null);
  };

  const handleFundSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !fundData.amount) return;
    setSaving(true);

    try {
      const amount = parseFloat(fundData.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        setSaving(false);
        return;
      }

      // Calculate new balances
      const currentBalance = selectedUser.walletBalance || 0;
      const currentDeposited = selectedUser.depositedBalance || 0;
      const currentWinning = selectedUser.winningBalance || 0;
      const currentBonus = selectedUser.bonusBalance || 0;

      let newBalance = currentBalance;
      let newDeposited = currentDeposited;
      let newWinning = currentWinning;
      let newBonus = currentBonus;

      const isDeposit = fundData.operation === 'deposit';

      // Update the specific wallet type
      if (fundData.walletType === 'deposited') {
        newDeposited = isDeposit ? currentDeposited + amount : Math.max(0, currentDeposited - amount);
      } else if (fundData.walletType === 'winning') {
        newWinning = isDeposit ? currentWinning + amount : Math.max(0, currentWinning - amount);
      } else if (fundData.walletType === 'bonus') {
        newBonus = isDeposit ? currentBonus + amount : Math.max(0, currentBonus - amount);
      }

      // Update total wallet balance
      newBalance = isDeposit ? currentBalance + amount : Math.max(0, currentBalance - amount);

      // Update user document
      await updateDoc(doc(db, 'users', selectedUser.id), {
        walletBalance: newBalance,
        depositedBalance: newDeposited,
        winningBalance: newWinning,
        bonusBalance: newBonus,
        updatedAt: serverTimestamp()
      });

      // Create transaction record
      const transactionType = isDeposit ? 'manual_credit' : 'manual_debit';
      const walletTypeLabel = fundData.walletType === 'deposited' ? 'Deposit' :
        fundData.walletType === 'winning' ? 'Winning' : 'Bonus';

      await addDoc(collection(db, 'transactions'), {
        userId: selectedUser.id,
        userName: selectedUser.displayName || 'Unknown',
        userEmail: selectedUser.email || '',
        type: transactionType,
        amount: amount,
        walletType: fundData.walletType,
        description: `Admin ${isDeposit ? 'added' : 'removed'} ${walletTypeLabel} balance${fundData.note ? ': ' + fundData.note : ''}`,
        balanceAfter: newBalance,
        createdAt: serverTimestamp()
      });

      await fetchUsers();
      closeFundModal();
    } catch (error) {
      console.error('Error processing fund operation:', error);
      alert('Failed to process the operation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading users..." />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 mt-1">Manage registered users</p>
        </div>
        <Button icon={Plus} onClick={() => openModal()}>Add User</Button>
      </div>

      <div className="mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, email or phone..."
          className="max-w-md"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={searchQuery ? "No users found" : "No users yet"}
          description={searchQuery ? "Try a different search term" : "Users will appear here when they register"}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 hidden sm:table-cell">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Wallet</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 hidden md:table-cell">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-dark-200 hover:bg-dark-400/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.displayName || 'Unknown'}</p>
                        <p className="text-sm text-gray-500 sm:hidden">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300 hidden sm:table-cell">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="text-green-400 font-medium">{formatCurrency(user.walletBalance || 0)}</span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <Badge status={user.status || 'active'} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => viewUser(user)}
                        className="p-2 hover:bg-dark-200 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => openFundModal(user)}
                        className="p-2 hover:bg-green-600/20 rounded-lg transition-colors"
                        title="Manage Funds"
                      >
                        <DollarSign className="w-4 h-4 text-green-400" />
                      </button>
                      <button
                        onClick={() => openModal(user)}
                        className="p-2 hover:bg-dark-200 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }}
                        className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={selectedUser ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit}>
          <Input
            label="Display Name"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!!selectedUser}
            required={!selectedUser}
          />
          {!selectedUser && (
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          )}
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          {!selectedUser && (
            <Input
              label="Initial Balance (₹)"
              type="number"
              value={formData.walletBalance}
              onChange={(e) => setFormData({ ...formData, walletBalance: e.target.value })}
            />
          )}
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'banned', label: 'Banned' }
            ]}
          />

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">
              {selectedUser ? 'Update' : 'Add'} User
            </Button>
          </div>
        </form>
      </Modal>

      {/* View User Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="User Details" size="lg">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-dark-200">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-2xl text-white font-bold">
                  {selectedUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedUser.displayName}</h3>
                <p className="text-gray-400">{selectedUser.email}</p>
                <Badge status={selectedUser.status || 'active'} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-dark-400">
                <p className="text-sm text-gray-400">Total Balance</p>
                <p className="text-xl font-bold text-green-400">{formatCurrency(selectedUser.walletBalance || 0)}</p>
              </Card>
              <Card className="bg-dark-400">
                <p className="text-sm text-gray-400">Deposited</p>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(selectedUser.depositedBalance || 0)}</p>
              </Card>
              <Card className="bg-dark-400">
                <p className="text-sm text-gray-400">Winnings</p>
                <p className="text-xl font-bold text-yellow-400">{formatCurrency(selectedUser.winningBalance || 0)}</p>
              </Card>
              <Card className="bg-dark-400">
                <p className="text-sm text-gray-400">Bonus</p>
                <p className="text-xl font-bold text-purple-400">{formatCurrency(selectedUser.bonusBalance || 0)}</p>
              </Card>
            </div>

            <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex justify-between items-center">
             <span className="text-sm text-gray-300">Total Deposit</span>
             <span className="text-lg font-semibold text-green-400">₹{selectedUser?.totalDeposited || 0}
             </span>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dark-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{selectedUser.matchesPlayed || 0}</p>
                <p className="text-sm text-gray-400">Matches</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{selectedUser.totalKills || 0}</p>
                <p className="text-sm text-gray-400">Kills</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{formatCurrency(selectedUser.totalWinnings || 0)}</p>
                <p className="text-sm text-gray-400">Total Won</p>
              </div>
            </div>

            <div className="pt-4 border-t border-dark-200 space-y-2">
              <p className="text-sm"><span className="text-gray-400">Phone:</span> <span className="text-white">{selectedUser.phone || 'N/A'}</span></p>
              <p className="text-sm"><span className="text-gray-400">Referral Code:</span> <span className="text-white">{selectedUser.referralCode || 'N/A'}</span></p>
              <p className="text-sm"><span className="text-gray-400">Referred By:</span> <span className="text-white">{selectedUser.referredBy || "N/A"}</span></p>
              <p className="text-sm"><span className="text-gray-400">Users Referred:</span>
              <span className="text-primary-400 cursor-pointer hover:underline"onClick={() => setReferredUsersModalOpen(true)}>{referredUsersCount}</span> </p>
              <p className="text-sm"><span className="text-gray-400">Joined:</span> <span className="text-white">{formatDate(selectedUser.createdAt)}</span></p>
            </div>
          </div>
        )}
      </Modal>

   {/* Referred User Modal */}   

      <Modal
  isOpen={referredUsersModalOpen}
  onClose={() => setReferredUsersModalOpen(false)}
  title="Referred Users"
>
  {referredUsersList.length === 0 ? (
    <p className="text-gray-400">No referred users found</p>
  ) : (
    <div className="space-y-2">
      {referredUsersList.map(user => (
        <div
          key={user.id}
          className="p-2 rounded-lg bg-dark-400 flex justify-between"
        >
          <span className="text-white">
            {user.displayName || "No Name"}
          </span>

          <span className="text-gray-400 text-sm">
            {user.email || ""}
          </span>
        </div>
      ))}
    </div>
  )}
</Modal>

      {/* Fund Management Modal */}
      <Modal isOpen={fundModalOpen} onClose={closeFundModal} title="Manage User Funds">
        {selectedUser && (
          <form onSubmit={handleFundSubmit}>
            <div className="mb-4 p-4 bg-dark-400 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {selectedUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-white">{selectedUser.displayName}</p>
                  <p className="text-sm text-gray-400">Current Balance: {formatCurrency(selectedUser.walletBalance || 0)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                <div className="bg-dark-300 p-2 rounded">
                  <p className="text-blue-400 font-medium">{formatCurrency(selectedUser.depositedBalance || 0)}</p>
                  <p className="text-gray-500">Deposited</p>
                </div>
                <div className="bg-dark-300 p-2 rounded">
                  <p className="text-yellow-400 font-medium">{formatCurrency(selectedUser.winningBalance || 0)}</p>
                  <p className="text-gray-500">Winning</p>
                </div>
                <div className="bg-dark-300 p-2 rounded">
                  <p className="text-purple-400 font-medium">{formatCurrency(selectedUser.bonusBalance || 0)}</p>
                  <p className="text-gray-500">Bonus</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Operation Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFundData({ ...fundData, operation: 'deposit' })}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${fundData.operation === 'deposit'
                      ? 'border-green-500 bg-green-500/20 text-green-400'
                      : 'border-dark-200 bg-dark-300 text-gray-400 hover:border-dark-100'
                    }`}
                >
                  <ArrowDownCircle className="w-5 h-5" />
                  <span className="font-medium">Deposit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFundData({ ...fundData, operation: 'withdraw' })}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${fundData.operation === 'withdraw'
                      ? 'border-red-500 bg-red-500/20 text-red-400'
                      : 'border-dark-200 bg-dark-300 text-gray-400 hover:border-dark-100'
                    }`}
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  <span className="font-medium">Withdraw</span>
                </button>
              </div>
            </div>

            <Select
              label="Wallet Type"
              value={fundData.walletType}
              onChange={(e) => setFundData({ ...fundData, walletType: e.target.value })}
              options={[
                { value: 'deposited', label: 'Deposited Balance' },
                { value: 'winning', label: 'Winning Balance' },
                { value: 'bonus', label: 'Bonus Balance' }
              ]}
            />

            <Input
              label="Amount (₹)"
              type="number"
              value={fundData.amount}
              onChange={(e) => setFundData({ ...fundData, amount: e.target.value })}
              placeholder="Enter amount"
              required
              min="1"
              step="0.01"
            />

            <Input
              label="Note (Optional)"
              value={fundData.note}
              onChange={(e) => setFundData({ ...fundData, note: e.target.value })}
              placeholder="Reason for this transaction"
            />

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={closeFundModal} className="flex-1">Cancel</Button>
              <Button
                type="submit"
                loading={saving}
                className={`flex-1 ${fundData.operation === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {fundData.operation === 'deposit' ? 'Add Funds' : 'Remove Funds'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.displayName}"? This action cannot be undone.`}
        loading={saving}
      />
    </div>
  );
}
