import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Plus, Edit2, Trash2, Gamepad2, ArrowUpDown } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import ImageUpload from '../components/common/ImageUpload';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    imageUrl: '',
    displayOrder: 0
  });

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'games'), orderBy('displayOrder', 'asc'))
      );
      const gamesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGames(gamesData);
    } catch (error) {
      console.error('Error fetching games:', error);
      // Fallback: fetch without ordering if index not available
      try {
        const fallbackSnapshot = await getDocs(collection(db, 'games'));
        const gamesData = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort client-side
        gamesData.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        setGames(gamesData);
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const openModal = (game = null) => {
    if (game) {
      setSelectedGame(game);
      setFormData({
        name: game.name || '',
        image: game.image || '',
        imageUrl: game.imageUrl || '',
        displayOrder: game.displayOrder || 0
      });
    } else {
      setSelectedGame(null);
      // Set default display order to be at the end
      const maxOrder = games.length > 0
        ? Math.max(...games.map(g => g.displayOrder || 0)) + 1
        : 1;
      setFormData({ name: '', image: '', imageUrl: '', displayOrder: maxOrder });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedGame(null);
    setFormData({ name: '', image: '', imageUrl: '', displayOrder: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const gameData = {
        name: formData.name,
        image: formData.image || formData.imageUrl,
        imageUrl: formData.imageUrl,
        displayOrder: parseInt(formData.displayOrder) || 0,
        updatedAt: serverTimestamp()
      };

      if (selectedGame) {
        await updateDoc(doc(db, 'games', selectedGame.id), gameData);
      } else {
        gameData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'games'), gameData);
      }

      await fetchGames();
      closeModal();
    } catch (error) {
      console.error('Error saving game:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGame) return;
    setSaving(true);

    try {
      await deleteDoc(doc(db, 'games', selectedGame.id));
      await fetchGames();
      setDeleteDialogOpen(false);
      setSelectedGame(null);
    } catch (error) {
      console.error('Error deleting game:', error);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (game) => {
    setSelectedGame(game);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return <Loader text="Loading games..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Games</h1>
          <p className="text-gray-400 mt-1">Manage game titles</p>
        </div>
        <Button icon={Plus} onClick={() => openModal()}>
          Add Game
        </Button>
      </div>

      {games.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="No games found"
          description="Add your first game to get started"
          action={<Button icon={Plus} onClick={() => openModal()}>Add Game</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {games.map((game) => (
            <Card key={game.id} className="group relative">
              <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-dark-200">
                {game.image ? (
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>
              <h3 className="font-medium text-white text-center truncate">{game.name}</h3>

              {/* Display Order Badge */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-dark-400/90 rounded-lg flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-primary-400" />
                <span className="text-xs text-white font-medium">{game.displayOrder || 0}</span>
              </div>

              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openModal(game)}
                  className="p-1.5 bg-dark-400/90 hover:bg-primary-600 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => openDeleteDialog(game)}
                  className="p-1.5 bg-dark-400/90 hover:bg-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={selectedGame ? 'Edit Game' : 'Add Game'}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Game Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter game name"
            required
          />

          <Input
            label="Display Order"
            type="number"
            value={formData.displayOrder}
            onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
            placeholder="Enter display order (lower = first)"
            min="0"
          />

          <ImageUpload
            label="Game Image (Upload)"
            value={formData.image}
            onChange={(value) => setFormData({ ...formData, image: value })}
          />

          <Input
            label="Or Image URL"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {selectedGame ? 'Update' : 'Add'} Game
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Game"
        message={`Are you sure you want to delete "${selectedGame?.name}"? This action cannot be undone.`}
        loading={saving}
      />
    </div>
  );
}
