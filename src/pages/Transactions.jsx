import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Receipt, ArrowDownCircle, ArrowUpCircle, Trophy, Gift, Wallet } from 'lucide-react';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import SearchInput from '../components/common/SearchInput';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    let filtered = transactions;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.userName?.toLowerCase().includes(query) ||
        t.userEmail?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    setFilteredTransactions(filtered);
  }, [searchQuery, typeFilter, transactions]);

  const fetchTransactions = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setFilteredTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      deposit: ArrowDownCircle,
      withdrawal: ArrowUpCircle,
      entry_fee: Trophy,
      winning: Gift,
      bonus: Gift,
      manual_credit: Wallet,
      manual_debit: Wallet
    };
    return icons[type] || Receipt;
  };

  const getTypeColor = (type) => {
    const colors = {
      deposit: 'text-green-400 bg-green-500/20',
      withdrawal: 'text-red-400 bg-red-500/20',
      entry_fee: 'text-orange-400 bg-orange-500/20',
      winning: 'text-yellow-400 bg-yellow-500/20',
      bonus: 'text-purple-400 bg-purple-500/20',
      manual_credit: 'text-blue-400 bg-blue-500/20',
      manual_debit: 'text-orange-400 bg-orange-500/20'
    };
    return colors[type] || 'text-gray-400 bg-gray-500/20';
  };

  const isCredit = (type) => ['deposit', 'winning', 'bonus', 'manual_credit'].includes(type);

  const transactionTypes = [
    { value: 'all', label: 'All' },
    { value: 'deposit', label: 'Deposit' },
    { value: 'withdrawal', label: 'Withdrawal' },
    { value: 'entry_fee', label: 'Entry Fee' },
    { value: 'winning', label: 'Winning' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'manual_credit', label: 'Manual Credit' },
    { value: 'manual_debit', label: 'Manual Debit' }
  ];

  if (loading) return <Loader text="Loading transactions..." />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="text-gray-400 mt-1">View all transaction history</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by user or description..."
          className="flex-1"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-dark-200 border border-dark-100 text-white focus:border-primary-500"
        >
          {transactionTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions found"
          description={searchQuery || typeFilter !== 'all' ? "Try different filters" : "Transactions will appear here"}
        />
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => {
            const Icon = getTypeIcon(transaction.type);
            const colorClass = getTypeColor(transaction.type);
            const credit = isCredit(transaction.type);

            return (
              <Card key={transaction.id} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white capitalize">{transaction.type.replace('_', ' ')}</h3>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{transaction.description || transaction.userName}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(transaction.createdAt)}</p>
                </div>

                <div className="text-right">
                  <p className={`font-bold ${credit ? 'text-green-400' : 'text-red-400'}`}>
                    {credit ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-gray-500">{transaction.userEmail}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
