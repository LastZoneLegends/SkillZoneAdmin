import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Bell, Send, Users, Trophy, Smartphone, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Select from '../components/common/Select';
import Toggle from '../components/common/Toggle';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import { formatDateTime } from '../utils/formatters';
import { sendPushToMultipleTokens, isFcmConfigured } from '../services/fcmService';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target: 'all',
    tournamentId: '',
    redirectUrl: '',
    sendPush: true
  });

  const fcmConfigured = isFcmConfigured();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notificationsSnap, tournamentsSnap] = await Promise.all([
        getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'tournaments'))
      ]);
      setNotifications(notificationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTournaments(tournamentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to send push notifications via FCM HTTP v1 API
  const sendPushNotification = async (notificationData) => {
    if (!fcmConfigured) {
      console.warn('FCM not configured, skipping push notification');
      return { success: 0, failed: 0 };
    }

    try {
      // Get all users with FCM tokens
      const usersSnap = await getDocs(query(collection(db, 'users')));

      let tokens = [];
      usersSnap.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          tokens = [...tokens, ...userData.fcmTokens];
        }
      });

      // Remove duplicates
      tokens = [...new Set(tokens)];

      if (tokens.length === 0) {
        console.log('No FCM tokens found to send push.');
        return { success: 0, failed: 0 };
      }

      console.log(`Sending push to ${tokens.length} devices...`);

      // Send using FCM HTTP v1 API
      const results = await sendPushToMultipleTokens(
        tokens,
        notificationData.title,
        notificationData.message,
        {
          id: notificationData.id,
          url: notificationData.redirectUrl || "/"
        }
      );

      console.log('FCM Results:', results);
      return results;

    } catch (error) {
      console.error('Error sending push:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      // Save notification to Firestore
      const notificationData = {
        title: formData.title,
        message: formData.message,
        target: formData.target,
        tournamentId: formData.target === 'tournament' ? formData.tournamentId : null,
        sendPush: formData.sendPush,
        redirectUrl: formData.redirectUrl || "",
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);

      let pushResults = null;
      // Trigger Background Push if enabled
      if (formData.sendPush && fcmConfigured) {
        pushResults = await sendPushNotification({ ...notificationData, id: docRef.id });
      }

      // Reset form
      setFormData({ title: '', message: '', target: 'all', tournamentId: '', sendPush: true });
      await fetchData();

      // Show result
      if (pushResults) {
        alert(`✅ Notification saved!\n\nPush Results:\n• Sent: ${pushResults.success}\n• Failed: ${pushResults.failed}`);
      } else {
        alert('✅ Notification saved!' + (!fcmConfigured ? '\n\n⚠️ Push notifications not sent (FCM not configured)' : ''));
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to save notification: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const getTargetLabel = (notification) => {
    if (notification.target === 'all') return 'All Users';
    if (notification.target === 'tournament') {
      const tournament = tournaments.find(t => t.id === notification.tournamentId);
      return tournament ? `Tournament: ${tournament.name}` : 'Tournament Users';
    }
    return notification.target;
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    }
  };

  if (loading) return <Loader text="Loading notifications..." />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-gray-400 mt-1">Send in-app and browser push notifications to users</p>
      </div>

      {/* FCM Status Banner */}
      {!fcmConfigured && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-400 font-medium">FCM Not Configured</p>
            <p className="text-xs text-yellow-400/70 mt-1">
              Add your service account credentials to admin/.env to enable push notifications.
              Required: VITE_FCM_PROJECT_ID, VITE_FCM_CLIENT_EMAIL, VITE_FCM_PRIVATE_KEY
            </p>
          </div>
        </div>
      )}

      {fcmConfigured && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-green-400 font-medium">FCM Configured</p>
            <p className="text-xs text-green-400/70 mt-1">
              Push notifications are ready to send via FCM HTTP v1 API.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary-400" />
            Send Notification
          </h2>

          <form onSubmit={handleSubmit}>
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Notification title"
              required
            />

            <Textarea
             label="Message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Notification message"
              rows={4}
              required
            />

            <Input
             label="Redirect URL (optional)"
             value={formData.redirectUrl}
             onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
             placeholder="/wallet or /profile or https://youtube.com"
            />

            <Select
              label="Target Audience"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              options={[
                { value: 'all', label: 'All Users' },
                { value: 'tournament', label: 'Tournament Participants' }
              ]}
            />

            {formData.target === 'tournament' && (
              <Select
                label="Select Tournament"
                value={formData.tournamentId}
                onChange={(e) => setFormData({ ...formData, tournamentId: e.target.value })}
                options={tournaments.map(t => ({ value: t.id, label: t.name }))}
                required
              />
            )}

            <div className="mt-4 p-4 bg-dark-400 rounded-lg">
              <Toggle
                label="Send as Browser Push Notification"
                checked={formData.sendPush}
                onChange={(checked) => setFormData({ ...formData, sendPush: checked })}
                disabled={!fcmConfigured}
              />
              <p className="text-xs text-gray-500 mt-2">
                {fcmConfigured
                  ? 'Users who have allowed notifications will receive a browser push notification.'
                  : 'Configure FCM credentials to enable push notifications.'}
              </p>
            </div>

            <Button type="submit" loading={sending} icon={Send} className="w-full mt-4">
              Send Notification
            </Button>
          </form>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-400">
              <strong>ℹ️ How push notifications work:</strong> Users need to enable notifications in their browser.
              They'll see a permission prompt when they visit the website. Once allowed, they'll receive
              browser notifications even when the site tab is in background.
            </p>
          </div>
        </Card>

        {/* Notification History */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-400" />
            Recent Notifications
          </h2>

          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications sent"
              description="Sent notifications will appear here"
            />
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {notifications.map((notification) => (
                <Card key={notification.id} className="bg-dark-400">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-white">{notification.title}</h3>
                    <div className="flex items-center gap-2">
                      {notification.sendPush && (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                          <Smartphone className="w-3 h-3" />
                          Push
                        </span>
                      )}
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{notification.message}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {notification.target === 'all' ? (
                        <Users className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Trophy className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-xs text-gray-500">{getTargetLabel(notification)}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
