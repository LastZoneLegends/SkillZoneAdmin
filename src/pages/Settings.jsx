import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Save, Globe, Wallet, FileText, Share2, ExternalLink, Youtube, Instagram, Twitter, Facebook, MessageCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import ImageUpload from '../components/common/ImageUpload';
import Loader from '../components/common/Loader';
import Tabs from '../components/common/Tabs';

// Custom SVG Icons for social platforms
const DiscordIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967c-.273-.099-.471-.148-.67.15c-.197.297-.767.966-.94 1.164c-.173.199-.347.223-.644.075c-.297-.15-1.255-.463-2.39-1.475c-.883-.788-1.48-1.761-1.653-2.059c-.173-.297-.018-.458.13-.606c.134-.133.298-.347.446-.52c.149-.174.198-.298.298-.497c.099-.198.05-.371-.025-.52c-.075-.149-.669-1.612-.916-2.207c-.242-.579-.487-.5-.669-.51c-.173-.008-.371-.01-.57-.01c-.198 0-.52.074-.792.372c-.272.297-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074c.149.198 2.096 3.2 5.077 4.487c.709.306 1.262.489 1.694.625c.712.227 1.36.195 1.871.118c.571-.085 1.758-.719 2.006-1.413c.248-.694.248-1.289.173-1.413c-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

const YouTubeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C8.74 0 8.333.015 7.053.072C5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053C.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913c.306.788.717 1.459 1.384 2.126c.667.666 1.336 1.079 2.126 1.384c.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558c.788-.306 1.459-.718 2.126-1.384c.666-.667 1.079-1.335 1.384-2.126c.296-.765.499-1.636.558-2.913c.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913c-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071c1.17.055 1.805.249 2.227.415c.562.217.96.477 1.382.896c.419.42.679.819.896 1.381c.164.422.36 1.057.413 2.227c.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227c-.224.562-.479.96-.899 1.382c-.419.419-.824.679-1.38.896c-.42.164-1.065.36-2.235.413c-1.274.057-1.649.07-4.859.07c-3.211 0-3.586-.015-4.859-.074c-1.171-.061-1.816-.256-2.236-.421c-.569-.224-.96-.479-1.379-.899c-.421-.419-.69-.824-.9-1.38c-.165-.42-.359-1.065-.42-2.235c-.045-1.26-.061-1.649-.061-4.844c0-3.196.016-3.586.061-4.861c.061-1.17.255-1.814.42-2.234c.21-.57.479-.96.9-1.381c.419-.419.81-.689 1.379-.898c.42-.166 1.051-.361 2.221-.421c1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162c0 3.405 2.76 6.162 6.162 6.162c3.405 0 6.162-2.76 6.162-6.162c0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4s4 1.79 4 4s-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44c-.795 0-1.44-.646-1.44-1.44c0-.794.646-1.439 1.44-1.439c.793-.001 1.44.645 1.44 1.439z" />
  </svg>
);

const TwitterIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669c1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// Social platform configurations
const socialPlatforms = [
  { key: 'discord', name: 'Discord', Icon: DiscordIcon, color: 'bg-indigo-500', placeholder: 'https://discord.gg/your-server' },
  { key: 'telegram', name: 'Telegram', Icon: TelegramIcon, color: 'bg-blue-500', placeholder: 'https://t.me/your-channel' },
  { key: 'whatsapp', name: 'WhatsApp', Icon: WhatsAppIcon, color: 'bg-green-500', placeholder: 'https://wa.me/919876543210' },
  { key: 'instagram', name: 'Instagram', Icon: InstagramIcon, color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400', placeholder: 'https://instagram.com/your-handle' },
  { key: 'youtube', name: 'YouTube', Icon: YouTubeIcon, color: 'bg-red-600', placeholder: 'https://youtube.com/@your-channel' },
  { key: 'twitter', name: 'Twitter/X', Icon: TwitterIcon, color: 'bg-black', placeholder: 'https://twitter.com/your-handle' },
  { key: 'facebook', name: 'Facebook', Icon: FacebookIcon, color: 'bg-blue-600', placeholder: 'https://facebook.com/your-page' },
];

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [apiKey, setApiKey] = useState("");
  const [settings, setSettings] = useState({
    appName: '',
    logoUrl: '',
    logoImage: '',
    minDeposit: '',
    minWithdrawal: '',
    referralBonus: '',
    supportEmail: '',
    supportPhone: '',
    upiId: '',
    upiQrImage: '',
    privacyPolicy: '',
    termsConditions: '',
    refundPolicy: '',
    fairPlayPolicy: '',
    aboutUs: '',
    contactInfo: '',
    socialLinks: {
      discord: '',
      telegram: '',
      whatsapp: '',
      instagram: '',
      youtube: '',
      twitter: '',
      facebook: ''
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'app_settings', 'main');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          ...settings,
          ...data,
          socialLinks: {
            discord: '',
            telegram: '',
            whatsapp: '',
            instagram: '',
            youtube: '',
            twitter: '',
            facebook: '',
            ...(data.socialLinks || {})
          }
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'app_settings', 'main');
      await setDoc(docRef, {
        ...settings,
        minDeposit: parseFloat(settings.minDeposit) || 0,
        minWithdrawal: parseFloat(settings.minWithdrawal) || 0,
        referralBonus: parseFloat(settings.referralBonus) || 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSocialLink = (key, value) => {
    setSettings({
      ...settings,
      socialLinks: {
        ...settings.socialLinks,
        [key]: value
      }
    });
  };

  const tabs = [
    { value: 'general', label: 'General' },
    { value: 'payment', label: 'Payment' },
    { value: 'social', label: 'Social Links' },
    { value: 'policies', label: 'Policies' }
  ];

  if (loading) return <Loader text="Loading settings..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Configure app settings</p>
        </div>
        <Button icon={Save} onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'general' && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-400" />
            General Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="App Name"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              placeholder="Last Zone Legends"
            />
            <Input
              label="Support Email"
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              placeholder="support@example.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              label="Support Phone"
              value={settings.supportPhone}
              onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
              placeholder="+91 9876543210"
            />
            <div>
              <ImageUpload
                label="App Logo (Upload)"
                value={settings.logoImage}
                onChange={(value) => setSettings({ ...settings, logoImage: value })}
              />
            </div>
          </div>

          <Input
            label="Or Logo URL"
            value={settings.logoUrl}
            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
            className="mt-4"
          />

          <Textarea
            label="About Us"
            value={settings.aboutUs}
            onChange={(e) => setSettings({ ...settings, aboutUs: e.target.value })}
            placeholder="About your platform..."
            rows={4}
            className="mt-4"
          />

          <Textarea
            label="Contact Information"
            value={settings.contactInfo}
            onChange={(e) => setSettings({ ...settings, contactInfo: e.target.value })}
            placeholder="Contact details, address, etc."
            rows={3}
            className="mt-4"
          />
        </Card>
      )}

      {activeTab === 'payment' && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary-400" />
            Payment Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Minimum Deposit (₹)"
              type="number"
              value={settings.minDeposit}
              onChange={(e) => setSettings({ ...settings, minDeposit: e.target.value })}
              placeholder="100"
            />
            <Input
              label="Minimum Withdrawal (₹)"
              type="number"
              value={settings.minWithdrawal}
              onChange={(e) => setSettings({ ...settings, minWithdrawal: e.target.value })}
              placeholder="200"
            />
            <Input
              label="Referral Bonus (₹)"
              type="number"
              value={settings.referralBonus}
              onChange={(e) => setSettings({ ...settings, referralBonus: e.target.value })}
              placeholder="50"
            />
           <Input
              label="TranzUPI API Key"
              type="text"
              value={settings.tranzupiApiKey || ""}
              onChange={(e) =>setSettings({...settings,tranzupiApiKey: e.target.value})}
              placeholder="Enter TranzUPI API key"
           />
           </div>

          <div className="mt-6 p-4 bg-dark-400 rounded-lg">
            <h3 className="font-medium text-white mb-4">UPI Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="UPI ID"
                value={settings.upiId}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                placeholder="yourname@upi"
              />
              <div>
                <ImageUpload
                  label="UPI QR Code"
                  value={settings.upiQrImage}
                  onChange={(value) => setSettings({ ...settings, upiQrImage: value })}
                  maxWidth={400}
                  quality={0.9}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'social' && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary-400" />
            Social Media Links
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Add your social media links. These will be displayed on the Contact Us page. Leave empty to hide.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {socialPlatforms.map((platform) => (
              <div key={platform.key} className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  <span className="inline-flex items-center gap-2">
                    <span className={`w-6 h-6 ${platform.color} rounded flex items-center justify-center`}>
                      <platform.Icon className="w-4 h-4 text-white" />
                    </span>
                    {platform.name}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={settings.socialLinks[platform.key] || ''}
                    onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                    placeholder={platform.placeholder}
                    className="w-full px-4 py-3 pr-10 bg-dark-300 border border-dark-200 rounded-xl text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
                  />
                  {settings.socialLinks[platform.key] && (
                    <a
                      href={settings.socialLinks[platform.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-400"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-8 p-4 bg-dark-400 rounded-lg">
            <h3 className="font-medium text-white mb-4">Preview - Contact Us Page Buttons</h3>
            <div className="flex flex-wrap gap-3">
              {socialPlatforms.filter(p => settings.socialLinks[p.key]).map((platform) => (
                <a
                  key={platform.key}
                  href={settings.socialLinks[platform.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 ${platform.color} text-white rounded-full font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2`}
                >
                  <platform.Icon className="w-4 h-4" />
                  {platform.name}
                </a>
              ))}
              {!socialPlatforms.some(p => settings.socialLinks[p.key]) && (
                <p className="text-gray-500 text-sm">No social links added yet. Add links above to see preview.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Legal Policies
            </h2>

            <Textarea
              label="Privacy Policy"
              value={settings.privacyPolicy}
              onChange={(e) => setSettings({ ...settings, privacyPolicy: e.target.value })}
              placeholder="Enter your privacy policy..."
              rows={8}
            />

            <Textarea
              label="Terms & Conditions"
              value={settings.termsConditions}
              onChange={(e) => setSettings({ ...settings, termsConditions: e.target.value })}
              placeholder="Enter your terms and conditions..."
              rows={8}
              className="mt-4"
            />

            <Textarea
              label="Refund Policy"
              value={settings.refundPolicy}
              onChange={(e) => setSettings({ ...settings, refundPolicy: e.target.value })}
              placeholder="Enter your refund policy..."
              rows={6}
              className="mt-4"
            />

            <Textarea
              label="Fair Play Policy"
              value={settings.fairPlayPolicy}
              onChange={(e) => setSettings({ ...settings, fairPlayPolicy: e.target.value })}
              placeholder="Enter your fair play policy..."
              rows={6}
              className="mt-4"
            />
          </Card>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button icon={Save} onClick={handleSave} loading={saving}>
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
