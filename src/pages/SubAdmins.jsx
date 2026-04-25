import React, { useState, useEffect } from 'react';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { auth, db } from '../firebase/config';
import { Plus, Edit2, Trash2, UserCog, Shield, Eye, EyeOff, Check, X } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatDateTime } from '../utils/formatters';

// Firebase config for secondary app (to create users without logging out current admin)
const firebaseConfig = {
    apiKey: "AIzaSyCdrH2241iaDDuo33lS7gEswhmwwiEDXWw",
    authDomain: "last-zone-91af9.firebaseapp.com",
    projectId: "last-zone-91af9",
    storageBucket: "last-zone-91af9.firebasestorage.app",
    messagingSenderId: "58463070590",
    appId: "1:58463070590:web:4b67aab1defe19cb176b2f"
};

// Create a secondary Firebase app for user creation (won't log out current admin)
const secondaryAppName = 'SecondarySubAdmin';
const secondaryApp = getApps().find(app => app.name === secondaryAppName)
    || initializeApp(firebaseConfig, secondaryAppName);
const secondaryAuth = getAuth(secondaryApp);

// Available permissions for subadmins
const availablePermissions = [
    { key: 'games', label: 'Games', description: 'Manage games (add, edit, delete)' },
    { key: 'tournaments', label: 'Tournaments', description: 'Manage tournaments (create, edit, results)' },
];

export default function SubAdmins() {
    const [subadmins, setSubadmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSubadmin, setSelectedSubadmin] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        permissions: [],
        status: 'active'
    });

    useEffect(() => {
        fetchSubadmins();
    }, []);

    const fetchSubadmins = async () => {
        try {
            const snapshot = await getDocs(query(collection(db, 'subadmins'), orderBy('createdAt', 'desc')));
            setSubadmins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching subadmins:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (subadmin = null) => {
        setError('');
        if (subadmin) {
            setSelectedSubadmin(subadmin);
            setFormData({
                name: subadmin.name || '',
                email: subadmin.email || '',
                password: '', // Don't show password when editing
                permissions: subadmin.permissions || [],
                status: subadmin.status || 'active'
            });
        } else {
            setSelectedSubadmin(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                permissions: [],
                status: 'active'
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedSubadmin(null);
        setError('');
    };

    const togglePermission = (permissionKey) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permissionKey)
                ? prev.permissions.filter(p => p !== permissionKey)
                : [...prev.permissions, permissionKey]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            if (selectedSubadmin) {
                // Update existing subadmin
                const updateData = {
                    name: formData.name,
                    permissions: formData.permissions,
                    status: formData.status,
                    updatedAt: serverTimestamp()
                };

                await updateDoc(doc(db, 'subadmins', selectedSubadmin.id), updateData);
            } else {
                // Create new subadmin
                if (!formData.email || !formData.password) {
                    setError('Email and password are required');
                    setSaving(false);
                    return;
                }

                if (formData.password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setSaving(false);
                    return;
                }

                if (formData.permissions.length === 0) {
                    setError('Please select at least one permission');
                    setSaving(false);
                    return;
                }

                // Create Firebase Auth user using secondary app (won't log out current admin)
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
                const uid = userCredential.user.uid;

                // Sign out from secondary auth immediately
                await secondaryAuth.signOut();

                // Save subadmin data to Firestore with uid as document ID
                await setDoc(doc(db, 'subadmins', uid), {
                    uid: uid,
                    name: formData.name,
                    email: formData.email,
                    permissions: formData.permissions,
                    status: 'active',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            await fetchSubadmins();
            closeModal();
        } catch (error) {
            console.error('Error saving subadmin:', error);
            if (error.code === 'auth/email-already-in-use') {
                setError('This email is already registered');
            } else if (error.code === 'auth/invalid-email') {
                setError('Invalid email address');
            } else if (error.code === 'auth/weak-password') {
                setError('Password is too weak');
            } else {
                setError(error.message || 'Failed to save subadmin');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedSubadmin) return;
        setSaving(true);

        try {
            await deleteDoc(doc(db, 'subadmins', selectedSubadmin.id));
            await fetchSubadmins();
            setDeleteDialogOpen(false);
            setSelectedSubadmin(null);
        } catch (error) {
            console.error('Error deleting subadmin:', error);
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (subadmin) => {
        try {
            const newStatus = subadmin.status === 'active' ? 'inactive' : 'active';
            await updateDoc(doc(db, 'subadmins', subadmin.id), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            await fetchSubadmins();
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    if (loading) return <Loader text="Loading sub-admins..." />;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Sub-Admins</h1>
                    <p className="text-gray-400 mt-1">Manage sub-admin accounts with limited permissions</p>
                </div>
                <Button icon={Plus} onClick={() => openModal()}>Add Sub-Admin</Button>
            </div>

            {/* Info Banner */}
            <Card className="mb-6 bg-gradient-to-r from-primary-600/20 to-purple-600/20 border-primary-500/30">
                <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-primary-400 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-white">Sub-Admin Permissions</h3>
                        <p className="text-sm text-gray-300 mt-1">
                            Sub-admins can only access Games and Tournaments pages. They cannot view user data, financials, or settings.
                        </p>
                    </div>
                </div>
            </Card>

            {subadmins.length === 0 ? (
                <EmptyState
                    icon={UserCog}
                    title="No sub-admins found"
                    description="Create sub-admin accounts to delegate tournament management"
                    action={<Button icon={Plus} onClick={() => openModal()}>Add Sub-Admin</Button>}
                />
            ) : (
                <div className="grid gap-4">
                    {subadmins.map((subadmin) => (
                        <Card key={subadmin.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-lg font-bold text-white">
                                        {subadmin.name?.charAt(0)?.toUpperCase() || 'S'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{subadmin.name || 'Unnamed'}</h3>
                                    <p className="text-sm text-gray-400">{subadmin.email}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {subadmin.permissions?.map(perm => (
                                            <span key={perm} className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs capitalize">
                                                {perm}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${subadmin.status === 'active'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {subadmin.status === 'active' ? 'Active' : 'Inactive'}
                                </span>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={subadmin.status === 'active' ? X : Check}
                                    onClick={() => toggleStatus(subadmin)}
                                >
                                    {subadmin.status === 'active' ? 'Disable' : 'Enable'}
                                </Button>
                                <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openModal(subadmin)}>
                                    Edit
                                </Button>
                                <Button variant="danger" size="sm" icon={Trash2} onClick={() => { setSelectedSubadmin(subadmin); setDeleteDialogOpen(true); }}>
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={closeModal} title={selectedSubadmin ? 'Edit Sub-Admin' : 'Add Sub-Admin'}>
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Sub-admin name"
                        required
                    />

                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="subadmin@example.com"
                        disabled={!!selectedSubadmin}
                        required={!selectedSubadmin}
                        className="mt-4"
                    />

                    {!selectedSubadmin && (
                        <div className="mt-4 relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Minimum 6 characters"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 text-gray-400 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    )}

                    {/* Permissions */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Permissions <span className="text-red-400">*</span>
                        </label>
                        <div className="space-y-3">
                            {availablePermissions.map((perm) => (
                                <label
                                    key={perm.key}
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${formData.permissions.includes(perm.key)
                                        ? 'bg-primary-500/20 border border-primary-500/50'
                                        : 'bg-dark-400 border border-dark-200 hover:border-dark-100'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(perm.key)}
                                        onChange={() => togglePermission(perm.key)}
                                        className="w-5 h-5 rounded border-dark-200 bg-dark-300 text-primary-500 focus:ring-primary-500"
                                    />
                                    <div>
                                        <p className="font-medium text-white">{perm.label}</p>
                                        <p className="text-xs text-gray-400">{perm.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {selectedSubadmin && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-3 bg-dark-300 border border-dark-200 rounded-xl text-white focus:border-primary-500 focus:outline-none"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
                        <Button type="submit" loading={saving} className="flex-1">
                            {selectedSubadmin ? 'Update' : 'Create'} Sub-Admin
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Sub-Admin"
                message={`Are you sure you want to delete "${selectedSubadmin?.name}"? This action cannot be undone.`}
                loading={saving}
            />
        </div>
    );
}
