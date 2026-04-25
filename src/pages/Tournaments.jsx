import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Plus, Edit2, Trash2, Trophy, Users, Eye, EyeOff, UserCheck, Copy, Check, Award, Target, XCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import Toggle from '../components/common/Toggle';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Badge from '../components/common/Badge';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    gameId: '',
    name: '',
    startDateTime: '',
    status: 'upcoming',
    matchType: 'solo',
    entryFee: '',
    prizePool: '',
    perKillPrize: '',
    prize1: '',
    prize2: '',
    prize3: '',
    maxPlayers: '',
    tags: '',
    map: '',
    description: '',
    rules: '',
    roomId: '',
    roomPassword: '',
    showRoomDetails: false
  });
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [participantResults, setParticipantResults] = useState([]);
  const [excludedPlayers, setExcludedPlayers] = useState([]);
  const [prizeSplitMode, setPrizeSplitMode] = useState("fixed");
  const [winners, setWinners] = useState({ first: '', second: '', third: '' });
  const [isEditingResult, setIsEditingResult] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tournamentsSnap, gamesSnap] = await Promise.all([
        getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'games'))
      ]);

      setTournaments(tournamentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setGames(gamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (tournament = null) => {
    if (tournament) {
      setSelectedTournament(tournament);
      const startDate = tournament.startDateTime?.toDate?.() || new Date(tournament.startDateTime);
      setFormData({
        gameId: tournament.gameId || '',
        name: tournament.name || '',
        startDateTime: startDate ? new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
        status: tournament.status || 'upcoming',
        matchType: tournament.matchType || 'solo',
        entryFee: tournament.entryFee?.toString() || '',
        prizePool: tournament.prizePool?.toString() || '',
        perKillPrize: tournament.perKillPrize?.toString() || '',
        prize1: tournament.prize1?.toString() || '',
        prize2: tournament.prize2?.toString() || '',
        prize3: tournament.prize3?.toString() || '',
        maxPlayers: tournament.maxPlayers?.toString() || '',
        tags: tournament.tags?.join(', ') || '',
        map: tournament.map || '',
        description: tournament.description || '',
        rules: tournament.rules || '',
        roomId: tournament.roomId || '',
        roomPassword: tournament.roomPassword || '',
        showRoomDetails: tournament.showRoomDetails || false
      });
    } else {
      setSelectedTournament(null);
      setFormData({
        gameId: '', name: '', startDateTime: '', status: 'upcoming', matchType: 'solo',
        entryFee: '', prizePool: '', perKillPrize: '', prize1: '', prize2: '', prize3: '', maxPlayers: '',
        tags: '', map: '', description: '', rules: '', roomId: '', roomPassword: '', showRoomDetails: false
      });
    }
    setModalOpen(true);
  };

  // Duplicate tournament - opens modal with pre-filled data
  const duplicateTournament = (tournament) => {
    setSelectedTournament(null); // Important: set to null so it creates new
    setFormData({
      gameId: tournament.gameId || '',
      name: `${tournament.name} (Copy)`,
      startDateTime: '', // Clear date so admin sets new date
      status: 'upcoming', // Always start as upcoming
      matchType: tournament.matchType || 'solo',
      entryFee: tournament.entryFee?.toString() || '',
      prizePool: tournament.prizePool?.toString() || '',
      perKillPrize: tournament.perKillPrize?.toString() || '',
      prize1: tournament.prize1?.toString() || '',
      prize2: tournament.prize2?.toString() || '',
      prize3: tournament.prize3?.toString() || '',
      maxPlayers: tournament.maxPlayers?.toString() || '',
      tags: tournament.tags?.join(', ') || '',
      map: tournament.map || '',
      description: tournament.description || '',
      rules: tournament.rules || '',
      roomId: '', // Clear room details for new match
      roomPassword: '',
      showRoomDetails: false
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedTournament(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const game = games.find(g => g.id === formData.gameId);
      const tournamentData = {
        gameId: formData.gameId,
        gameName: game?.name || '',
        gameImage: game?.image || '',
        name: formData.name,
        startDateTime: new Date(formData.startDateTime),
        status: formData.status,
        matchType: formData.matchType,
        entryFee: parseFloat(formData.entryFee) || 0,
        prizePool: parseFloat(formData.prizePool) || 0,
        perKillPrize: parseFloat(formData.perKillPrize) || 0,
        prize1: parseFloat(formData.prize1) || 0,
        prize2: parseFloat(formData.prize2) || 0,
        prize3: parseFloat(formData.prize3) || 0,
        maxPlayers: parseInt(formData.maxPlayers) || 0,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        map: formData.map,
        description: formData.description,
        rules: formData.rules,
        roomId: formData.roomId,
        roomPassword: formData.roomPassword,
        showRoomDetails: formData.showRoomDetails,
        updatedAt: serverTimestamp()
      };

      if (selectedTournament) {
        await updateDoc(doc(db, 'tournaments', selectedTournament.id), tournamentData);
      } else {
        tournamentData.createdAt = serverTimestamp();
        tournamentData.participants = [];
        tournamentData.participantCount = 0;
        await addDoc(collection(db, 'tournaments'), tournamentData);
      }

      await fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving tournament:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTournament) return;
    setSaving(true);

    try {
      await deleteDoc(doc(db, 'tournaments', selectedTournament.id));
      await fetchData();
      setDeleteDialogOpen(false);
      setSelectedTournament(null);
    } catch (error) {
      console.error('Error deleting tournament:', error);
    } finally {
      setSaving(false);
    }
  };

  // Cancel match and refund all participants
  const handleCancelMatch = async () => {
    if (!selectedTournament) return;
    setSaving(true);

    try {
      const participants = selectedTournament.participantDetails || [];
      const entryFee = selectedTournament.entryFee || 0;

      // Refund each participant
      for (const participant of participants) {
        if (participant.odeuUserId && entryFee > 0) {
          // Refund to user's wallet
          await updateDoc(doc(db, 'users', participant.odeuUserId), {
            walletBalance: increment(entryFee),
            depositedBalance: increment(entryFee)
          });

          // Create refund transaction
          await addDoc(collection(db, 'transactions'), {
            userId: participant.odeuUserId,
            userName: participant.odeuName,
            userEmail: participant.odeuEmail,
            type: 'refund',
            amount: entryFee,
            description: `Match Cancelled Refund - ${selectedTournament.name}`,
            status: 'completed',
            tournamentId: selectedTournament.id,
            createdAt: serverTimestamp()
          });
        }
      }

      // Update tournament status to cancelled
      await updateDoc(doc(db, 'tournaments', selectedTournament.id), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await fetchData();
      setCancelDialogOpen(false);
      setSelectedTournament(null);
      alert(`Match cancelled! ${participants.length} participant(s) refunded ₹${entryFee} each.`);
    } catch (error) {
      console.error('Error cancelling tournament:', error);
      alert('Failed to cancel match');
    } finally {
      setSaving(false);
    }
  };

  const viewParticipants = (tournament) => {
    setSelectedTournament(tournament);
    setParticipantsModalOpen(true);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openResultModal = (tournament, isEdit = false) => {
    setSelectedTournament(tournament);
    setIsEditingResult(isEdit);

    // Initialize participant results with existing kills
    const results = (tournament.participantDetails || []).map(p => ({
      ...p,
      kills: p.kills || 0
    }));
    setParticipantResults(results);

    // Load existing winners if editing
    // For Duo/Squad, winners.first/second/third will be slot numbers
    // For Solo, they will be odeuId
    if (isEdit && tournament.results) {
      setWinners({
first: tournament.results.first?.slotNumber?.toString() || tournament.results.first?.odeuId || '',
second: tournament.results.second?.slotNumber?.toString() || tournament.results.second?.odeuId || '',
third: tournament.results.third?.slotNumber?.toString() || tournament.results.third?.odeuId || ''
      });
  
     setPrizeSplitMode(
    tournament.results?.prizeSplitMode || "fixed"
  );

  setExcludedPlayers(
    tournament.results?.excludedPlayers || []
  );

} else {

  setWinners({ first: "", second: "", third: "" });

  setPrizeSplitMode("fixed");

  setExcludedPlayers([]);

}

    setResultModalOpen(true);
  };

  const updateParticipantKills = (odeuId, kills) => {
    setParticipantResults(prev =>
      prev.map(p => p.odeuId === odeuId ? { ...p, kills: parseInt(kills) || 0 } : p)
    );
  };

  const toggleExcludePlayer = (odeuId) => {
  setExcludedPlayers(prev =>
    prev.includes(odeuId)
      ? prev.filter(id => id !== odeuId)
      : [...prev, odeuId]
  );
};

  const calculateKillEarnings = (kills) => {
    return kills * (selectedTournament?.perKillPrize || 0);
  };

  // Get teams grouped by slot
  const getTeams = () => {
    const teams = {};
    participantResults.forEach(p => {
      const slotNum = p.slotNumber || 0;
      if (!teams[slotNum]) teams[slotNum] = [];
      teams[slotNum].push(p);
    });
    return teams;
  };

  // Check if it's a team mode (Duo/Squad)
  const isTeamMode = () => {
    return selectedTournament?.matchType === 'duo' || selectedTournament?.matchType === 'squad';
  };

  // Get team size based on match type
  const getTeamSize = () => {
    const config = { solo: 1, duo: 2, squad: 4 };
    return config[selectedTournament?.matchType] || 1;
  };

  // Get prize per member for a team
  const getPrizePerMember = (totalPrize, slotNumber) => {

  if (!isTeamMode()) return totalPrize;

  const teams = getTeams();

  const teamMembers = teams[slotNumber] || [];

  // Dynamic Split Mode
  if (prizeSplitMode === "dynamic") {

    const activeMembers = teamMembers.filter(
      player => !excludedPlayers.includes(player.odeuId)
    );

    return activeMembers.length > 0
      ? totalPrize / activeMembers.length
      : 0;

  }

  // Fixed Split Mode (default)

  return teamMembers.length > 0
    ? totalPrize / teamMembers.length
    : 0;

};

  // Check if participant is in winning team/slot
  const isInWinningSlot = (participant, position) => {
    if (isTeamMode()) {
      return participant.slotNumber?.toString() === winners[position];
    } else {
      return participant.odeuId === winners[position];
    }
  };

const getTotalEarnings = (participant) => {

  // Step 1: kill reward हमेशा मिलेगा
  let total = calculateKillEarnings(participant.kills || 0);

  // Step 2: अगर player excluded है → placement prize मत दो
  if (excludedPlayers.includes(participant.odeuId)) {
    return total;
  }

  // Step 3: placement prize logic
  if (isTeamMode()) {

    if (isInWinningSlot(participant, 'first')) {
      total += getPrizePerMember(
        selectedTournament?.prize1 || 0,
        participant.slotNumber
      );
    }

    if (isInWinningSlot(participant, 'second')) {
      total += getPrizePerMember(
        selectedTournament?.prize2 || 0,
        participant.slotNumber
      );
    }

    if (isInWinningSlot(participant, 'third')) {
      total += getPrizePerMember(
        selectedTournament?.prize3 || 0,
        participant.slotNumber
      );
    }

  } else {

    if (winners.first === participant.odeuId)
      total += selectedTournament?.prize1 || 0;

    if (winners.second === participant.odeuId)
      total += selectedTournament?.prize2 || 0;

    if (winners.third === participant.odeuId)
      total += selectedTournament?.prize3 || 0;

  }

  return total;
};

  const handleAnnounceResult = async () => {
    setSaving(true);
    try {
      const teams = getTeams();

      // Calculate and apply earnings for each participant
      for (const participant of participantResults) {
        const newEarnings = Math.round(getTotalEarnings(participant));
        const previousEarnings = participant.previousEarnings || 0;
        const difference = Math.round(newEarnings - previousEarnings);

        if (difference !== 0 && participant.odeuUserId) {
          // Update user's wallet (positive = credit, negative = debit)
          await updateDoc(doc(db, 'users', participant.odeuUserId), {
            walletBalance: increment(Math.round(difference)),
            winningBalance: increment(Math.round(difference)),
            totalWinnings: increment(difference > 0 ? Math.round(difference) : 0) // Only add positive to total
          });

          // Create transaction record
          const transactionType = difference > 0 ? 'winning' : 'winning_adjustment';
          await addDoc(collection(db, 'transactions'), {
            userId: participant.odeuUserId,
            userName: participant.odeuName,
            userEmail: participant.odeuEmail,
            type: transactionType,
            amount: Math.abs(difference),
            description: difference > 0
    ? `Tournament Winning${isEditingResult ? ' (Correction +)' : ''} - ${selectedTournament.name}`
              : `Tournament Winning Correction (-) - ${selectedTournament.name}`,
            status: 'completed',
            tournamentId: selectedTournament.id,
            kills: participant.kills || 0,
            previousEarnings: previousEarnings,
            newEarnings: newEarnings,
            createdAt: serverTimestamp()
          });
        }

        // Update participant with new earnings for future reference
        participant.previousEarnings = newEarnings;
      }

      // Build results object based on mode
      let resultsData = {};

      if (isTeamMode()) {
        // Team mode: store slot info
        const firstTeam = teams[winners.first] || [];
        const secondTeam = teams[winners.second] || [];
        const thirdTeam = teams[winners.third] || [];

        resultsData = {
          first: winners.first ? {
            slotNumber: parseInt(winners.first),
            teamMembers: firstTeam.filter(p => !excludedPlayers.includes(p.odeuId)).map(p => ({name: p.odeuName,gameId: p.odeuGameId,kills: p.kills || 0})),
            prizePerMember: prizeSplitMode === "dynamic"? selectedTournament.prize1 /firstTeam.filter(p =>
            !excludedPlayers.includes(p.odeuId)).length: selectedTournament.prize1 /firstTeam.length
          } : null,
          second: winners.second ? {
            slotNumber: parseInt(winners.second),
            teamMembers: secondTeam.filter(p => !excludedPlayers.includes(p.odeuId)).map(p => ({name: p.odeuName,gameId: p.odeuGameId,kills: p.kills || 0})),
            prizePerMember: prizeSplitMode === "dynamic"? selectedTournament.prize2 /secondTeam.filter(p =>
            !excludedPlayers.includes(p.odeuId)).length: selectedTournament.prize2 /secondTeam.length
          } : null,
          third: winners.third ? {
            slotNumber: parseInt(winners.third),
            teamMembers: thirdTeam.filter(p => !excludedPlayers.includes(p.odeuId)).map(p => ({name: p.odeuName,gameId: p.odeuGameId,kills: p.kills || 0})),
            prizePerMember: prizeSplitMode === "dynamic"? selectedTournament.prize3 /thirdTeam.filter(p =>
            !excludedPlayers.includes(p.odeuId)).length: selectedTournament.prize3 /thirdTeam.length
          } : null,
            excludedPlayers: excludedPlayers,
            prizeSplitMode: prizeSplitMode
        };
      } else {
        // Solo mode: store individual player
        const firstWinner = participantResults.find(p => p.odeuId === winners.first);
        const secondWinner = participantResults.find(p => p.odeuId === winners.second);
        const thirdWinner = participantResults.find(p => p.odeuId === winners.third);

        resultsData = {
 first: winners.first ? {
  name: firstWinner?.odeuName,
  gameId: firstWinner?.odeuGameId,
  kills: firstWinner?.kills || 0
 } : null,

 second: winners.second ? {
  name: secondWinner?.odeuName,
  gameId: secondWinner?.odeuGameId,
  kills: secondWinner?.kills || 0
 } : null,

 third: winners.third ? {
  name: thirdWinner?.odeuName,
  gameId: thirdWinner?.odeuGameId,
  kills: thirdWinner?.kills || 0
 } : null,
        };
}

      // Update tournament with results
      await updateDoc(doc(db, 'tournaments', selectedTournament.id), {
        status: 'finished',
        participantDetails: participantResults,
        results: resultsData,
        resultAnnouncedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await fetchData();
      setResultModalOpen(false);
    } catch (error) {
      console.error('Error announcing result:', error);
      alert('Failed to announce result');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading tournaments..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournaments</h1>
          <p className="text-gray-400 mt-1">Manage gaming tournaments</p>
        </div>
        <Button icon={Plus} onClick={() => openModal()}>Add Tournament</Button>
      </div>

      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments found"
          description="Create your first tournament"
          action={<Button icon={Plus} onClick={() => openModal()}>Add Tournament</Button>}
        />
      ) : (
        <div className="space-y-4">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-dark-200 flex-shrink-0">
                {tournament.gameImage ? (
                  <img src={tournament.gameImage} alt={tournament.gameName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white truncate">{tournament.name}</h3>
                    <p className="text-sm text-gray-400">{tournament.gameName}</p>
                  </div>
                  <Badge status={tournament.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
                  <div>
                    <span className="text-gray-500">Entry:</span>
                    <span className="text-white ml-1">{formatCurrency(tournament.entryFee)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Prize:</span>
                    <span className="text-green-400 ml-1">{formatCurrency(tournament.prizePool)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Players:</span>
                    <span className="text-white ml-1">{tournament.participantCount || 0}/{tournament.maxPlayers || '∞'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Start:</span>
                    <span className="text-white ml-1">{formatDateTime(tournament.startDateTime)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {/* Match Type Badge */}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${tournament.matchType === 'squad'
                    ? 'bg-purple-500/20 text-purple-400'
                    : tournament.matchType === 'duo'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-green-500/20 text-green-400'
                    }`}>
                    {tournament.matchType?.charAt(0).toUpperCase() + tournament.matchType?.slice(1) || 'Solo'}
                  </span>

                  {/* Map Badge */}
                  {tournament.map && (
                    <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">
                      {tournament.map}
                    </span>
                  )}

                  {tournament.showRoomDetails ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Eye className="w-3 h-3" /> Room visible
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <EyeOff className="w-3 h-3" /> Room hidden
                    </span>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 justify-end">
                {tournament.status === 'finished' && !tournament.resultAnnouncedAt && (
                  <Button variant="success" size="sm" icon={Award} onClick={() => openResultModal(tournament)}>
                    Announce Result
                  </Button>
                )}
                {tournament.status === 'finished' && tournament.resultAnnouncedAt && (
                  <Button variant="warning" size="sm" icon={Edit2} onClick={() => openResultModal(tournament, true)}>
                    Edit Result
                  </Button>
                )}
                <Button variant="secondary" size="sm" icon={Users} onClick={() => viewParticipants(tournament)}>
                  Participants ({tournament.participantCount || 0})
                </Button>
                <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openModal(tournament)}>
                  Edit
                </Button>
                <Button variant="secondary" size="sm" icon={Copy} onClick={() => duplicateTournament(tournament)}>
                  Duplicate
                </Button>
                {tournament.status !== 'cancelled' && tournament.status !== 'finished' && (
                  <Button variant="warning" size="sm" icon={XCircle} onClick={() => { setSelectedTournament(tournament); setCancelDialogOpen(true); }}>
                    Cancel Match
                  </Button>
                )}
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => { setSelectedTournament(tournament); setDeleteDialogOpen(true); }}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={selectedTournament ? 'Edit Tournament' : 'Add Tournament'} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Game"
              value={formData.gameId}
              onChange={(e) => setFormData({ ...formData, gameId: e.target.value })}
              options={games.map(g => ({ value: g.id, label: g.name }))}
              required
            />
            <Input
              label="Tournament Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Start Date & Time"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
              required
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'live', label: 'Live' },
                { value: 'finished', label: 'Finished' }
              ]}
            />
            <Select
              label="Match Type"
              value={formData.matchType}
              onChange={(e) => setFormData({ ...formData, matchType: e.target.value })}
              options={[
                { value: 'solo', label: 'Solo (1 slot per user)' },
                { value: 'duo', label: 'Duo (2 slots per user)' },
                { value: 'squad', label: 'Squad (4 slots per user)' }
              ]}
            />
            <Input
              label="Entry Fee (₹)"
              type="number"
              value={formData.entryFee}
              onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
              required
            />
            <Input
              label="Prize Pool (₹)"
              type="number"
              value={formData.prizePool}
              onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
              required
            />
            <Input
              label="Per Kill Prize (₹)"
              type="number"
              value={formData.perKillPrize}
              onChange={(e) => setFormData({ ...formData, perKillPrize: e.target.value })}
            />
            <Input
              label="1st Prize (₹)"
              type="number"
              value={formData.prize1}
              onChange={(e) => setFormData({ ...formData, prize1: e.target.value })}
              placeholder="Winner prize"
            />
            <Input
              label="2nd Prize (₹)"
              type="number"
              value={formData.prize2}
              onChange={(e) => setFormData({ ...formData, prize2: e.target.value })}
              placeholder="Runner up prize"
            />
            <Input
              label="3rd Prize (₹)"
              type="number"
              value={formData.prize3}
              onChange={(e) => setFormData({ ...formData, prize3: e.target.value })}
              placeholder="Second runner up prize"
            />
            <Input
              label="Max Players (0 = unlimited)"
              type="number"
              value={formData.maxPlayers}
              onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
            />
            <Input
              label="Tags (comma separated)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="solo, squad, ranked"
            />
            <Input
              label="Map"
              value={formData.map}
              onChange={(e) => setFormData({ ...formData, map: e.target.value })}
              placeholder="e.g., Erangel, Miramar, Sanhok"
            />
            <Input
              label="Room ID"
              value={formData.roomId}
              onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
            />
            <Input
              label="Room Password"
              value={formData.roomPassword}
              onChange={(e) => setFormData({ ...formData, roomPassword: e.target.value })}
            />
            <div className="flex items-end">
              <Toggle
                label="Show Room ID/Password to users"
                checked={formData.showRoomDetails}
                onChange={(checked) => setFormData({ ...formData, showRoomDetails: checked })}
              />
            </div>
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <Textarea
            label="Rules"
            value={formData.rules}
            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
            rows={3}
          />

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">
              {selectedTournament ? 'Update' : 'Create'} Tournament
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Tournament"
        message={`Are you sure you want to delete "${selectedTournament?.name}"?`}
        loading={saving}
      />

      {/* Cancel Match Dialog */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelMatch}
        title="Cancel Match & Refund"
        message={`Are you sure you want to cancel "${selectedTournament?.name}"? All ${selectedTournament?.participantCount || 0} participant(s) will be refunded ₹${selectedTournament?.entryFee || 0} each.`}
        confirmText="Cancel & Refund"
        loading={saving}
      />

      {/* Participants Modal */}
      <Modal
        isOpen={participantsModalOpen}
        onClose={() => { setParticipantsModalOpen(false); setSelectedTournament(null); }}
        title={`Participants - ${selectedTournament?.name || ''}`}
        size="lg"
      >
        {selectedTournament && (
          <div>
            <div className="flex items-center gap-4 mb-4 p-4 bg-dark-400 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{selectedTournament.name}</h3>
                <p className="text-sm text-gray-400">
                  {selectedTournament.participantCount || 0} / {selectedTournament.maxPlayers || '∞'} Players Joined
                </p>
              </div>
            </div>

            {(!selectedTournament.participantDetails || selectedTournament.participantDetails.length === 0) ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No participants yet</p>
                <p className="text-sm text-gray-500">Users will appear here when they join this tournament</p>
              </div>
            ) : (() => {
              // Group participants by slot
              const matchTypeConfig = { solo: 1, duo: 2, squad: 4 };
              const teamSize = matchTypeConfig[selectedTournament.matchType] || 1;
              const teams = {};
              selectedTournament.participantDetails.forEach(p => {
                const slotNum = p.slotNumber || 0;
                if (!teams[slotNum]) teams[slotNum] = [];
                teams[slotNum].push(p);
              });
              const sortedTeams = Object.entries(teams).sort((a, b) => Number(a[0]) - Number(b[0]));

              return (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {/* Match Type Info */}
                  <div className="p-3 bg-dark-400 rounded-lg flex items-center justify-between">
                    <span className="text-gray-400">Match Type</span>
                    <span className={`px-3 py-1 rounded font-bold text-sm ${selectedTournament.matchType === 'squad' ? 'bg-purple-500/20 text-purple-400' :
                      selectedTournament.matchType === 'duo' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                      {selectedTournament.matchType?.toUpperCase() || 'SOLO'} ({teamSize} per slot)
                    </span>
                  </div>

                  {/* Teams List */}
                  {sortedTeams.map(([slotNum, members]) => (
                    <div key={slotNum} className="p-3 bg-dark-400 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-primary-400 font-semibold">
                          Slot #{slotNum}
                        </span>
                        <span className="text-xs text-gray-500">
                          {members.length}/{teamSize} players
                        </span>
                      </div>
                      <div className="space-y-2">
                        {members.sort((a, b) => (a.position || 'A').localeCompare(b.position || 'A')).map((participant) => (
                          <div key={participant.odeuId} className="flex items-center gap-3 p-2 bg-dark-300 rounded-lg">
                            {/* Position Badge */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${participant.position === 'A' ? 'bg-yellow-500/20 text-yellow-400' :
                              participant.position === 'B' ? 'bg-blue-500/20 text-blue-400' :
                                participant.position === 'C' ? 'bg-green-500/20 text-green-400' :
                                  participant.position === 'D' ? 'bg-purple-500/20 text-purple-400' :
                                    'bg-gray-500/20 text-gray-400'
                              }`}>
                              {participant.position || '-'}
                            </div>
                            {/* Player Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{participant.odeuName || 'Unknown'}</p>
                              <p className="text-xs text-gray-500 truncate">{participant.odeuEmail}</p>
                            </div>
                            {/* Game ID */}
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-primary-400 bg-primary-500/10 px-2 py-1 rounded text-sm">
                                {participant.odeuGameId}
                              </span>
                              <button
                                onClick={() => copyToClipboard(participant.odeuGameId, participant.odeuId)}
                                className="p-1.5 hover:bg-dark-200 rounded transition-colors"
                                title="Copy Game ID"
                              >
                                {copiedId === participant.odeuId ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="mt-4 pt-4 border-t border-dark-200">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => { setParticipantsModalOpen(false); setSelectedTournament(null); }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Announce/Edit Result Modal */}
      <Modal
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={isEditingResult ? 'Edit Tournament Result' : 'Announce Tournament Result'}
        size="xl"
      >
        {selectedTournament && (
          <div>
            {/* Info for editing */}
            {isEditingResult && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  ℹ️ Wallet balances will be automatically adjusted based on the difference.
                  If earnings decrease, amount will be deducted. If earnings increase, amount will be credited.
                </p>
              </div>
            )}
            {/* Tournament Info */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-dark-400 rounded-lg text-center">
                <p className="text-xs text-gray-500">1st Prize</p>
                <p className="text-sm font-bold text-yellow-400">{formatCurrency(selectedTournament.prize1 || 0)}</p>
              </div>
              <div className="p-3 bg-dark-400 rounded-lg text-center">
                <p className="text-xs text-gray-500">2nd Prize</p>
                <p className="text-sm font-bold text-gray-300">{formatCurrency(selectedTournament.prize2 || 0)}</p>
              </div>
              <div className="p-3 bg-dark-400 rounded-lg text-center">
                <p className="text-xs text-gray-500">3rd Prize</p>
                <p className="text-sm font-bold text-orange-400">{formatCurrency(selectedTournament.prize3 || 0)}</p>
              </div>
              <div className="p-3 bg-dark-400 rounded-lg text-center">
                <p className="text-xs text-gray-500">Per Kill</p>
                <p className="text-sm font-bold text-red-400">{formatCurrency(selectedTournament.perKillPrize || 0)}</p>
              </div>
            </div>

            {/* Winner Selection */}
            <div className="mb-4 p-4 bg-dark-400 rounded-lg">
              {/* Mode Info */}
              {isTeamMode() && (
                <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-purple-400 text-xs">
                    👥 Team Mode ({selectedTournament?.matchType?.toUpperCase()}): Select winning TEAM (Slot). Prize will be split equally among team members.
                  </p>
                </div>
              )}

            <div className="mb-4">

  <label className="block text-xs text-gray-400 mb-2">
    Prize Split Mode
  </label>

  <div className="flex gap-3">

    <button
      type="button"
      onClick={() => setPrizeSplitMode("fixed")}
      className={`px-4 py-2 rounded-lg text-xs font-semibold ${
        prizeSplitMode === "fixed"
          ? "bg-primary-500 text-white"
          : "bg-dark-300 text-gray-400"
      }`}
    >
      Fixed Split
    </button>

    <button
      type="button"
      onClick={() => setPrizeSplitMode("dynamic")}
      className={`px-4 py-2 rounded-lg text-xs font-semibold ${
        prizeSplitMode === "dynamic"
          ? "bg-primary-500 text-white"
          : "bg-dark-300 text-gray-400"
      }`}
    >
      Dynamic Split
    </button>

  </div>

</div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    🥇 1st Place {isTeamMode() && <span className="text-yellow-400">({formatCurrency(getPrizePerMember(selectedTournament?.prize1 || 0, parseInt(winners.first) || 0))} each)</span>}
                  </label>
                  <select
                    value={winners.first}
                    onChange={(e) => setWinners({ ...winners, first: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-300 border border-dark-200 rounded-lg text-white text-sm focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="">{isTeamMode() ? 'Select Winning Team' : 'Select Winner'}</option>
                    {isTeamMode() ? (
                      // Team mode: show slots
                      Object.entries(getTeams()).sort((a, b) => Number(a[0]) - Number(b[0])).map(([slotNum, members]) => (
                        <option
                          key={slotNum}
                          value={slotNum}
                          disabled={slotNum === winners.second || slotNum === winners.third}
                        >
                          Slot #{slotNum} ({members.map(m => m.odeuName).join(', ')})
                        </option>
                      ))
                    ) : (
                      // Solo mode: show individuals
                      participantResults.map(p => (
                        <option key={p.odeuId} value={p.odeuId} disabled={p.odeuId === winners.second || p.odeuId === winners.third}>
                          {p.odeuName} ({p.odeuGameId})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    🥈 2nd Place {isTeamMode() && <span className="text-gray-300">({formatCurrency(getPrizePerMember(selectedTournament?.prize2 || 0, parseInt(winners.second) || 0))} each)</span>}
                  </label>
                  <select
                    value={winners.second}
                    onChange={(e) => setWinners({ ...winners, second: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-300 border border-dark-200 rounded-lg text-white text-sm focus:border-gray-400 focus:outline-none"
                  >
                    <option value="">{isTeamMode() ? 'Select 2nd Team' : 'Select Runner-up'}</option>
                    {isTeamMode() ? (
                      Object.entries(getTeams()).sort((a, b) => Number(a[0]) - Number(b[0])).map(([slotNum, members]) => (
                        <option
                          key={slotNum}
                          value={slotNum}
                          disabled={slotNum === winners.first || slotNum === winners.third}
                        >
                          Slot #{slotNum} ({members.map(m => m.odeuName).join(', ')})
                        </option>
                      ))
                    ) : (
                      participantResults.map(p => (
                        <option key={p.odeuId} value={p.odeuId} disabled={p.odeuId === winners.first || p.odeuId === winners.third}>
                          {p.odeuName} ({p.odeuGameId})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    🥉 3rd Place {isTeamMode() && <span className="text-orange-400">({formatCurrency(getPrizePerMember(selectedTournament?.prize3 || 0, parseInt(winners.third) || 0))} each)</span>}
                  </label>
                  <select
                    value={winners.third}
                    onChange={(e) => setWinners({ ...winners, third: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-300 border border-dark-200 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">{isTeamMode() ? 'Select 3rd Team' : 'Select 2nd Runner-up'}</option>
                    {isTeamMode() ? (
                      Object.entries(getTeams()).sort((a, b) => Number(a[0]) - Number(b[0])).map(([slotNum, members]) => (
                        <option
                          key={slotNum}
                          value={slotNum}
                          disabled={slotNum === winners.first || slotNum === winners.second}
                        >
                          Slot #{slotNum} ({members.map(m => m.odeuName).join(', ')})
                        </option>
                      ))
                    ) : (
                      participantResults.map(p => (
                        <option key={p.odeuId} value={p.odeuId} disabled={p.odeuId === winners.first || p.odeuId === winners.second}>
                          {p.odeuName} ({p.odeuGameId})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Participants Table */}
            {participantResults.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No participants to show results for</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full table-fixed">
                  <thead className="sticky top-0 bg-dark-500">
                    <tr className="border-b border-dark-200">
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">#</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">Player</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">Game ID</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-400">Kills</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-400">Kill Earnings</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-400">Include</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-400">Position</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantResults.map((participant, index) => (
                      <tr key={participant.odeuId} className="border-b border-dark-200 hover:bg-dark-400/50">
                        <td className="py-2 px-2 text-gray-400 text-sm">{index + 1}</td>
                        <td className="py-2 px-2 min-w-[120px]">
                          <p className="font-medium text-white text-sm">{participant.odeuName}</p>
                        </td>
                        <td className="py-2 px-2 min-w-[100px]">
                          <span className="font-mono text-primary-400 text-xs bg-primary-500/10 px-2 py-1 rounded">
                            {participant.odeuGameId}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            value={participant.kills || 0}
                            onChange={(e) => updateParticipantKills(participant.odeuId, e.target.value)}
 className="w-16 mx-auto block px-2 py-1 bg-dark-300 border border-dark-200 rounded text-white text-center text-sm focus:border-primary-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="text-red-400 text-sm font-medium">
                            {formatCurrency(calculateKillEarnings(participant.kills || 0))}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
  {isTeamMode() &&
    (isInWinningSlot(participant,'first') ||
     isInWinningSlot(participant,'second') ||
     isInWinningSlot(participant,'third')) && (

  <td className="py-2 px-2 text-center">
  <input
    type="checkbox"
    checked={!excludedPlayers.includes(participant.odeuId)}
    onChange={() => toggleExcludePlayer(participant.odeuId)}
  />
</td>
  )}
</td>
                        <td className="py-2 px-2 text-center">
                          {isInWinningSlot(participant, 'first') && (
  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">🥇 1st</span>
)}
{isInWinningSlot(participant, 'second') && (
  <span className="text-xs bg-gray-500/20 text-gray-300 px-2 py-1 rounded">🥈 2nd</span>
)}
{isInWinningSlot(participant, 'third') && (
  <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">🥉 3rd</span>
)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className="text-green-400 font-bold text-sm">
                            {formatCurrency(getTotalEarnings(participant))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Summary */}
            <div className="mt-4 p-3 bg-dark-400 rounded-lg flex items-center justify-between">
              <span className="text-gray-400">Total Payout:</span>
              <span className="text-xl font-bold text-green-400">
                {formatCurrency(participantResults.reduce((sum, p) => sum + getTotalEarnings(p), 0))}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <Button
                variant="secondary"
                onClick={() => setResultModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={handleAnnounceResult}
                loading={saving}
                className="flex-1"
                icon={Award}
              >
                {isEditingResult ? 'Update Result' : 'Announce Result & Credit Winnings'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}