import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Plus, Edit2, Trash2, Gift, Trophy, Users } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import ImageUpload from '../components/common/ImageUpload';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Lottery() {
  const [lotteries, setLotteries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLottery, setSelectedLottery] = useState(null);
  const [saving, setSaving] = useState(false);
  const [winnerSearch, setWinnerSearch] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    prizeAmount: '',
    entryFee: '',
    status: 'upcoming'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [lotteriesSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'lotteries'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'users'))
      ]);
      setLotteries(lotteriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (lottery = null) => {
    if (lottery) {
      setSelectedLottery(lottery);
      setFormData({
        title: lottery.title || '',
        description: lottery.description || '',
        image: lottery.image || '',
        prizeAmount: lottery.prizeAmount?.toString() || '',
        entryFee: lottery.entryFee?.toString() || '',
        status: lottery.status || 'upcoming'
      });
    } else {
      setSelectedLottery(null);
      setFormData({ title: '', description: '', image: '', prizeAmount: '', entryFee: '', status: 'upcoming' });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedLottery(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const lotteryData = {
        title: formData.title,
        description: formData.description,
        image: formData.image,
        prizeAmount: parseFloat(formData.prizeAmount) || 0,
        entryFee: parseFloat(formData.entryFee) || 0,
        status: formData.status,
        updatedAt: serverTimestamp()
      };

      if (selectedLottery) {
        await updateDoc(doc(db, 'lotteries', selectedLottery.id), lotteryData);
      } else {
        lotteryData.createdAt = serverTimestamp();
        lotteryData.winnerId = null;
        lotteryData.winnerName = null;
        lotteryData.participants = [];
        lotteryData.participantCount = 0;
        await addDoc(collection(db, 'lotteries'), lotteryData);
      }

      await fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving lottery:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLottery) return;
    setSaving(true);

    try {
      await deleteDoc(doc(db, 'lotteries', selectedLottery.id));
      await fetchData();
      setDeleteDialogOpen(false);
      setSelectedLottery(null);
    } catch (error) {
      console.error('Error deleting lottery:', error);
    } finally {
      setSaving(false);
    }
  };

  const openWinnerModal = (lottery) => {
    setSelectedLottery(lottery);
    setWinnerSearch('');
    setWinnerModalOpen(true);
  };

  const selectWinner = async (user) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'lotteries', selectedLottery.id), {
        winnerId: user.id,
        winnerName: user.displayName,
        winnerEmail: user.email,
        status: 'finished',
        finishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Credit winner's wallet using increment
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        walletBalance: increment(selectedLottery.prizeAmount),
        winningBalance: increment(selectedLottery.prizeAmount),
        totalWinnings: increment(selectedLottery.prizeAmount),
        updatedAt: serverTimestamp()
      });

      // Create transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        userName: user.displayName,
        userEmail: user.email,
        type: 'winning',
        amount: selectedLottery.prizeAmount,
        description: `Lottery Winner - ${selectedLottery.title}`,
        status: 'completed',
        createdAt: serverTimestamp()
      });

      await fetchData();
      setWinnerModalOpen(false);
    } catch (error) {
      console.error('Error selecting winner:', error);
      alert('Failed to select winner');
    } finally {
      setSaving(false);
    }
  };

  // Get participated users for the selected lottery
  const getParticipatedUsers = () => {
    if (!selectedLottery?.participants) return [];
    return users.filter(user =>
      selectedLottery.participants.some(p => p.odeuUserId === user.id) &&
      (user.displayName?.toLowerCase().includes(winnerSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(winnerSearch.toLowerCase()))
    );
  };

  if (loading) return <Loader text="Loading lotteries..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Lottery</h1>
          <p className="text-gray-400 mt-1">Manage lucky draws</p>
        </div>
        <Button icon={Plus} onClick={() => openModal()}>Create Lottery</Button>
      </div>

      {lotteries.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No lotteries found"
          description="Create your first lottery"
          action={<Button icon={Plus} onClick={() => openModal()}>Create Lottery</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotteries.map((lottery) => (
            <Card key={lottery.id} className="relative">
              {lottery.image && (
                <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-dark-200">
                  <img src={lottery.image} alt={lottery.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white">{lottery.title}</h3>
                <Badge status={lottery.status} />
              </div>

              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{lottery.description}</p>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500">Prize</p>
                  <p className="text-lg font-bold text-yellow-400">{formatCurrency(lottery.prizeAmount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Entry Fee</p>
                  <p className="text-sm font-medium text-white">{formatCurrency(lottery.entryFee || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Participants</p>
                  <p className="text-sm font-medium text-blue-400">{lottery.participantCount || 0}</p>
                </div>
              </div>
              {lottery.winnerName && (
                <div className="mb-3 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-xs text-gray-500">Winner</p>
                  <p className="text-sm text-green-400 font-medium">{lottery.winnerName}</p>
                </div>
              )}

              <div className="flex gap-2">
                {lottery.status !== 'finished' && (
                  <Button variant="success" size="sm" icon={Trophy} onClick={() => openWinnerModal(lottery)} className="flex-1">
                    Select Winner
                  </Button>
                )}
                <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openModal(lottery)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => { setSelectedLottery(lottery); setDeleteDialogOpen(true); }}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={selectedLottery ? 'Edit Lottery' : 'Create Lottery'}>
        <form onSubmit={handleSubmit}>
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <ImageUpload
            label="Image"
            value={formData.image}
            onChange={(value) => setFormData({ ...formData, image: value })}
          />
          <Input
            label="Prize Amount (₹)"
            type="number"
            value={formData.prizeAmount}
            onChange={(e) => setFormData({ ...formData, prizeAmount: e.target.value })}
            required
          />
          <Input
            label="Entry Fee (₹)"
            type="number"
            value={formData.entryFee}
            onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
            placeholder="0 for free entry"
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'ongoing', label: 'Ongoing' },
              { value: 'finished', label: 'Finished' }
            ]}
          />

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">
              {selectedLottery ? 'Update' : 'Create'} Lottery
            </Button>
          </div>
        </form>
      </Modal>

      {/* Select Winner Modal */}
      <Modal isOpen={winnerModalOpen} onClose={() => setWinnerModalOpen(false)} title="Select Winner" size="lg">
        <div>
          <div className="mb-4 p-3 bg-dark-400 rounded-lg">
            <p className="text-sm text-gray-400">Lottery: <span className="text-white">{selectedLottery?.title}</span></p>
            <p className="text-sm text-gray-400">Prize: <span className="text-yellow-400 font-bold">{formatCurrency(selectedLottery?.prizeAmount || 0)}</span></p>
            <p className="text-sm text-gray-400">Participants: <span className="text-blue-400 font-bold">{selectedLottery?.participantCount || 0}</span></p>
          </div>

          <SearchInput
            value={winnerSearch}
            onChange={setWinnerSearch}
            placeholder="Search participant by name or email..."
            className="mb-4"
          />

          {getParticipatedUsers().length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No participants yet</p>
              <p className="text-sm text-gray-500">Users need to join the lottery first</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {getParticipatedUsers().map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-dark-400 rounded-lg hover:bg-dark-300 cursor-pointer"
                  onClick={() => selectWinner(user)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">{user.displayName?.charAt(0)?.toUpperCase() || 'U'}</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.displayName}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <Button variant="success" size="sm" loading={saving}>
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Lottery"
        message={`Are you sure you want to delete "${selectedLottery?.title}"?`}
        loading={saving}
      />
    </div>
  );
}
