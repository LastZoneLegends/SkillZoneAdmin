import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Plus, Edit2, Trash2, Image as ImageIcon, ExternalLink } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import ImageUpload from '../components/common/ImageUpload';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Toggle from '../components/common/Toggle';

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    image: '',
    imageUrl: '',
    link: '',
    isActive: true,
    order: 0
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const q = query(collection(db, 'promotions'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPromotions(data);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (promotion = null) => {
    if (promotion) {
      setSelectedPromotion(promotion);
      setFormData({
        image: promotion.image || '',
        imageUrl: promotion.imageUrl || '',
        link: promotion.link || '',
        isActive: promotion.isActive !== false,
        order: promotion.order || 0
      });
    } else {
      setSelectedPromotion(null);
      setFormData({ image: '', imageUrl: '', link: '', isActive: true, order: promotions.length });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPromotion(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const promoData = {
        image: formData.image || formData.imageUrl,
        imageUrl: formData.imageUrl,
        link: formData.link,
        isActive: formData.isActive,
        order: parseInt(formData.order) || 0,
        updatedAt: serverTimestamp()
      };

      if (selectedPromotion) {
        await updateDoc(doc(db, 'promotions', selectedPromotion.id), promoData);
      } else {
        promoData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'promotions'), promoData);
      }

      await fetchPromotions();
      closeModal();
    } catch (error) {
      console.error('Error saving promotion:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPromotion) return;
    setSaving(true);

    try {
      await deleteDoc(doc(db, 'promotions', selectedPromotion.id));
      await fetchPromotions();
      setDeleteDialogOpen(false);
      setSelectedPromotion(null);
    } catch (error) {
      console.error('Error deleting promotion:', error);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (promotion) => {
    setSelectedPromotion(promotion);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return <Loader text="Loading promotions..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotions</h1>
          <p className="text-gray-400 mt-1">Manage promotional banners</p>
        </div>
        <Button icon={Plus} onClick={() => openModal()}>
          Add Promotion
        </Button>
      </div>

      {promotions.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No promotions found"
          description="Add promotional banners to display on the website"
          action={<Button icon={Plus} onClick={() => openModal()}>Add Promotion</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <Card key={promo.id} className="group relative">
              <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-dark-200">
                {promo.image ? (
                  <img
                    src={promo.image}
                    alt="Promotion"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${promo.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-sm text-gray-400">
                    {promo.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {promo.link && (
                  <a
                    href={promo.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openModal(promo)}
                  className="p-1.5 bg-dark-400/90 hover:bg-primary-600 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => openDeleteDialog(promo)}
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
        title={selectedPromotion ? 'Edit Promotion' : 'Add Promotion'}
      >
        <form onSubmit={handleSubmit}>
          <ImageUpload
            label="Banner Image (Upload)"
            value={formData.image}
            onChange={(value) => setFormData({ ...formData, image: value })}
            maxWidth={1200}
            quality={0.8}
          />

          <Input
            label="Or Image URL"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://example.com/banner.jpg"
          />

          <Input
            label="Redirect Link (Optional)"
            value={formData.link}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            placeholder="https://example.com"
          />

          <Input
            label="Display Order"
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: e.target.value })}
            placeholder="0"
          />

          <Toggle
            label="Active"
            checked={formData.isActive}
            onChange={(checked) => setFormData({ ...formData, isActive: checked })}
            className="mb-4"
          />

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {selectedPromotion ? 'Update' : 'Add'} Promotion
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotion? This action cannot be undone."
        loading={saving}
      />
    </div>
  );
}
