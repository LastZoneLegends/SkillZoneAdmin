import React, { useState } from 'react';
import { collection, addDoc, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Database, Gamepad2, Trophy, Settings, Users, CheckCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

export default function DemoData() {
  const [loading, setLoading] = useState({
    games: false,
    tournaments: false,
    settings: false,
    users: false
  });
  const [completed, setCompleted] = useState({
    games: false,
    tournaments: false,
    settings: false,
    users: false
  });

  const demoGames = [
    { name: 'BGMI', image: 'https://play-lh.googleusercontent.com/JgLzWkBrWMlvqhGrMpGG0xqJxqPqmPjzqjGJWgPj0Tuk-qnMdy4Nrwp-MqjpjRCWQIE=w240-h480-rw' },
    { name: 'Free Fire MAX', image: 'https://play-lh.googleusercontent.com/WWcssdzTZvx0OsKvPqbUCLOBqmGBpCPJqbTfaI0LBzLlpKLCmzpHgDnDYBb0JMhbpg=w240-h480-rw' },
    { name: 'Call of Duty Mobile', image: 'https://play-lh.googleusercontent.com/PWvwDLJFl_2HKZF4KYCjBXmO7pPjiCz5MZXGAD0KYv7IbaFKsrD6HPdnMJBVGXNhEg=w240-h480-rw' },
    { name: 'PUBG New State', image: 'https://play-lh.googleusercontent.com/xB3nhb-vcPsHdNfhMvMeXl_hP5-zMg-tCx7EMN-J8DkjUwBXtasxUw2-aHLOR44v4cc=w240-h480-rw' },
    { name: 'Clash Royale', image: 'https://play-lh.googleusercontent.com/rIvZQ_H3hfmexC8vurmLczLtMNBFtxCEdmb2NwkSPz2ZuJJ5nRPD0HbSJ9i4YPnFBg=w240-h480-rw' },
    { name: 'Valorant Mobile', image: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt3f072336e3f3ade4/63096d7be4a8c30e088e7720/Valorant_2022_E5A2_PlayVALORANT_ContentStackThumbnail_1200x625_MB01.png' }
  ];

  const addDemoGames = async () => {
    setLoading({ ...loading, games: true });
    try {
      const gamesRef = collection(db, 'games');
      const existing = await getDocs(gamesRef);
      
      if (existing.size > 0) {
        alert('Games already exist in database');
        setLoading({ ...loading, games: false });
        return;
      }

      for (const game of demoGames) {
        await addDoc(gamesRef, {
          ...game,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setCompleted({ ...completed, games: true });
    } catch (error) {
      console.error('Error adding demo games:', error);
      alert('Failed to add demo games');
    } finally {
      setLoading({ ...loading, games: false });
    }
  };

  const addDemoTournaments = async () => {
    setLoading({ ...loading, tournaments: true });
    try {
      const tournamentsRef = collection(db, 'tournaments');
      const existing = await getDocs(tournamentsRef);
      
      if (existing.size > 0) {
        alert('Tournaments already exist in database');
        setLoading({ ...loading, tournaments: false });
        return;
      }

      const gamesSnap = await getDocs(collection(db, 'games'));
      const games = gamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (games.length === 0) {
        alert('Please add games first');
        setLoading({ ...loading, tournaments: false });
        return;
      }

      const demoTournaments = [
        {
          name: 'BGMI Solo Championship',
          entryFee: 50,
          prizePool: 5000,
          perKillPrize: 10,
          maxPlayers: 100,
          status: 'upcoming',
          tags: ['solo', 'ranked'],
          description: 'Solo battle royale championship',
          rules: '1. No teaming\n2. No hacks\n3. Fair play only'
        },
        {
          name: 'Free Fire Squad Wars',
          entryFee: 100,
          prizePool: 10000,
          perKillPrize: 15,
          maxPlayers: 50,
          status: 'upcoming',
          tags: ['squad', 'premium'],
          description: 'Squad tournament with massive prizes',
          rules: '1. 4 players per squad\n2. No emulators\n3. Stream sniping banned'
        },
        {
          name: 'COD Mobile TDM',
          entryFee: 25,
          prizePool: 2500,
          perKillPrize: 5,
          maxPlayers: 0,
          status: 'live',
          tags: ['tdm', 'beginner'],
          description: 'Team deathmatch tournament',
          rules: '1. Standard TDM rules\n2. No glitches'
        }
      ];

      for (let i = 0; i < demoTournaments.length; i++) {
        const game = games[i % games.length];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + i + 1);
        startDate.setHours(20, 0, 0, 0);

        await addDoc(tournamentsRef, {
          ...demoTournaments[i],
          gameId: game.id,
          gameName: game.name,
          gameImage: game.image,
          startDateTime: startDate,
          roomId: '',
          roomPassword: '',
          showRoomDetails: false,
          participants: [],
          participantCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setCompleted({ ...completed, tournaments: true });
    } catch (error) {
      console.error('Error adding demo tournaments:', error);
      alert('Failed to add demo tournaments');
    } finally {
      setLoading({ ...loading, tournaments: false });
    }
  };

  const addDemoSettings = async () => {
    setLoading({ ...loading, settings: true });
    try {
      const settingsRef = doc(db, 'app_settings', 'main');
      
      await setDoc(settingsRef, {
        appName: 'Last Zone Legends',
        logoUrl: '',
        minDeposit: 100,
        minWithdrawal: 200,
        referralBonus: 50,
        supportEmail: 'support@lastzonelegends.com',
        upiId: 'lastzonelegends@upi',
        upiQrImage: '',
        privacyPolicy: 'Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information...',
        termsConditions: 'By using Last Zone Legends, you agree to these terms and conditions...',
        refundPolicy: 'Refunds are processed within 7 working days for eligible requests...',
        fairPlayPolicy: 'We are committed to fair play. Any form of cheating, hacking, or exploitation will result in permanent ban...',
        aboutUs: 'Last Zone Legends is the ultimate gaming tournament platform for mobile gamers.',
        contactInfo: 'Email: support@lastzonelegends.com\nPhone: +91 9876543210',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setCompleted({ ...completed, settings: true });
    } catch (error) {
      console.error('Error adding demo settings:', error);
      alert('Failed to add demo settings');
    } finally {
      setLoading({ ...loading, settings: false });
    }
  };

  const addDemoUsers = async () => {
    setLoading({ ...loading, users: true });
    try {
      const usersRef = collection(db, 'users');
      const existing = await getDocs(usersRef);
      
      if (existing.size > 0) {
        alert('Users already exist in database');
        setLoading({ ...loading, users: false });
        return;
      }

      const demoUsers = [
        { displayName: 'Pro Gamer', email: 'progamer@demo.com', walletBalance: 500 },
        { displayName: 'Noob Player', email: 'noob@demo.com', walletBalance: 100 },
        { displayName: 'Champion', email: 'champion@demo.com', walletBalance: 2000 }
      ];

      for (const user of demoUsers) {
        await addDoc(usersRef, {
          ...user,
          depositedBalance: user.walletBalance,
          winningBalance: 0,
          bonusBalance: 0,
          status: 'active',
          role: 'user',
          referralCode: 'LZL' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          matchesPlayed: Math.floor(Math.random() * 50),
          totalKills: Math.floor(Math.random() * 200),
          totalWinnings: Math.floor(Math.random() * 5000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setCompleted({ ...completed, users: true });
    } catch (error) {
      console.error('Error adding demo users:', error);
      alert('Failed to add demo users');
    } finally {
      setLoading({ ...loading, users: false });
    }
  };

  const dataItems = [
    {
      title: 'Demo Games',
      description: 'Add 6 popular mobile games',
      icon: Gamepad2,
      color: 'from-pink-500 to-rose-600',
      action: addDemoGames,
      loading: loading.games,
      completed: completed.games
    },
    {
      title: 'Demo Tournaments',
      description: 'Add 3 sample tournaments',
      icon: Trophy,
      color: 'from-yellow-500 to-orange-600',
      action: addDemoTournaments,
      loading: loading.tournaments,
      completed: completed.tournaments
    },
    {
      title: 'App Settings',
      description: 'Initialize default settings',
      icon: Settings,
      color: 'from-blue-500 to-cyan-600',
      action: addDemoSettings,
      loading: loading.settings,
      completed: completed.settings
    },
    {
      title: 'Demo Users',
      description: 'Add 3 sample users',
      icon: Users,
      color: 'from-green-500 to-emerald-600',
      action: addDemoUsers,
      loading: loading.users,
      completed: completed.users
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Add Demo Data</h1>
        <p className="text-gray-400 mt-1">Populate database with sample data for testing</p>
      </div>

      <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
        <p className="text-yellow-400 text-sm">
          <strong>Warning:</strong> This will add demo data to your database. 
          Only use this for testing purposes. Data will only be added if the collection is empty.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataItems.map((item, index) => (
          <Card key={index} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} opacity-10 rounded-bl-full`} />
            
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                
                <Button
                  onClick={item.action}
                  loading={item.loading}
                  disabled={item.completed}
                  variant={item.completed ? 'success' : 'primary'}
                  size="sm"
                  className="mt-3"
                  icon={item.completed ? CheckCircle : Database}
                >
                  {item.completed ? 'Added' : 'Add Data'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
