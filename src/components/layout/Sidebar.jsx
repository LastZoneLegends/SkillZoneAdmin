import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Gamepad2,
  Image,
  Trophy,
  Users,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Gift,
  Bell,
  Settings,
  Database,
  UserCog,
  X
} from 'lucide-react';

// All menu items with their required permissions
const allMenuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard' },
  { path: '/games', icon: Gamepad2, label: 'Games', permission: 'games' },
  { path: '/promotions', icon: Image, label: 'Promotions', permission: 'promotions' },
  { path: '/tournaments', icon: Trophy, label: 'Tournaments', permission: 'tournaments' },
  { path: '/users', icon: Users, label: 'Users', permission: 'users' },
  { path: '/deposits', icon: ArrowDownCircle, label: 'Deposits', permission: 'deposits' },
  { path: '/transactions', icon: Receipt, label: 'Transactions', permission: 'transactions' },
  { path: '/withdrawals', icon: ArrowUpCircle, label: 'Withdrawals', permission: 'withdrawals' },
  { path: '/lottery', icon: Gift, label: 'Lottery', permission: 'lottery' },
  { path: '/notifications', icon: Bell, label: 'Notifications', permission: 'notifications' },
  { path: '/subadmins', icon: UserCog, label: 'Sub-Admins', permission: 'subadmins', adminOnly: true },
  { path: '/settings', icon: Settings, label: 'Settings', permission: 'settings' },
  { path: '/demo-data', icon: Database, label: 'Add Demo Data', permission: 'demo-data', adminOnly: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const { userRole, getAllowedPages, isAdmin } = useAuth();

  // Get allowed pages for current user
  const allowedPages = getAllowedPages();

  // Filter menu items based on permissions
  const menuItems = allMenuItems.filter(item => {
    // Admin-only items
    if (item.adminOnly && !isAdmin) return false;
    // Check if user has permission for this page
    return isAdmin || allowedPages.includes(item.permission);
  });

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-dark-400 z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-dark-200">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Last Zone Legends" className="w-10 h-10 rounded-lg object-cover" />
            <div>
              <h1 className="font-bold text-white text-sm">Last Zone</h1>
              <p className="text-xs text-gray-500">
                {isAdmin ? 'Admin Panel' : 'Sub-Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-dark-200 rounded"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Role Badge */}
        {!isAdmin && (
          <div className="mx-3 mt-3 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-400 font-medium">Limited Access Mode</p>
          </div>
        )}

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-80px)]">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                ${isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-dark-200 hover:text-white'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
