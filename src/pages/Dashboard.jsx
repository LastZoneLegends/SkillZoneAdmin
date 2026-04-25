import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Users, 
  Trophy, 
  Gamepad2, 
  Image, 
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  Gift
} from 'lucide-react';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Total Users
      const usersSnap = await getCountFromServer(collection(db, 'users'));
      
      // Tournaments
      const tournamentsRef = collection(db, 'tournaments');
      const upcomingTournaments = await getCountFromServer(
        query(tournamentsRef, where('status', '==', 'upcoming'))
      );
      const liveTournaments = await getCountFromServer(
        query(tournamentsRef, where('status', '==', 'live'))
      );
      const finishedTournaments = await getCountFromServer(
        query(tournamentsRef, where('status', '==', 'finished'))
      );

      // Deposits
      const depositsRef = collection(db, 'deposit_requests');
      const pendingDeposits = await getCountFromServer(
        query(depositsRef, where('status', '==', 'pending'))
      );

      // Withdrawals
      const withdrawalsRef = collection(db, 'withdrawals');
      const pendingWithdrawals = await getCountFromServer(
        query(withdrawalsRef, where('status', '==', 'pending'))
      );
      const completedWithdrawals = await getCountFromServer(
        query(withdrawalsRef, where('status', '==', 'completed'))
      );

      // Games
      const gamesSnap = await getCountFromServer(collection(db, 'games'));

      // Promotions
      const promotionsSnap = await getCountFromServer(collection(db, 'promotions'));

      // Lotteries
      const lotteriesRef = collection(db, 'lotteries');
      const activeLotteries = await getCountFromServer(
        query(lotteriesRef, where('status', 'in', ['upcoming', 'ongoing']))
      );

      setStats({
        totalUsers: usersSnap.data().count,
        upcomingTournaments: upcomingTournaments.data().count,
        liveTournaments: liveTournaments.data().count,
        finishedTournaments: finishedTournaments.data().count,
        pendingDeposits: pendingDeposits.data().count,
        pendingWithdrawals: pendingWithdrawals.data().count,
        completedWithdrawals: completedWithdrawals.data().count,
        totalGames: gamesSnap.data().count,
        totalPromotions: promotionsSnap.data().count,
        activeLotteries: activeLotteries.data().count
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Upcoming Tournaments', value: stats?.upcomingTournaments || 0, icon: Trophy, color: 'from-purple-500 to-purple-600' },
    { label: 'Live Tournaments', value: stats?.liveTournaments || 0, icon: Trophy, color: 'from-green-500 to-green-600' },
    { label: 'Finished Tournaments', value: stats?.finishedTournaments || 0, icon: Trophy, color: 'from-gray-500 to-gray-600' },
    { label: 'Pending Deposits', value: stats?.pendingDeposits || 0, icon: ArrowDownCircle, color: 'from-yellow-500 to-yellow-600' },
    { label: 'Pending Withdrawals', value: stats?.pendingWithdrawals || 0, icon: ArrowUpCircle, color: 'from-orange-500 to-orange-600' },
    { label: 'Completed Withdrawals', value: stats?.completedWithdrawals || 0, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Total Games', value: stats?.totalGames || 0, icon: Gamepad2, color: 'from-pink-500 to-pink-600' },
    { label: 'Total Promotions', value: stats?.totalPromotions || 0, icon: Image, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Active Lotteries', value: stats?.activeLotteries || 0, icon: Gift, color: 'from-red-500 to-red-600' },
  ];

  if (loading) {
    return <Loader text="Loading dashboard..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome to Last Zone Legends Admin Panel</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full`} />
            <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
