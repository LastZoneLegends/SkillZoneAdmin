import React from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ onMenuClick }) {
  const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

      const handleLogout = async () => {
          try {
                await logout();
                      navigate('/login');
                          } catch (error) {
                                console.error('Logout error:', error);
                                    }
                                      };

                                        return (
                                            <header className="sticky top-0 z-30 gradient-header">
                                                  <div className="flex items-center justify-between px-4 py-3">
                                                          <div className="flex items-center gap-3">
                                                                    <button
                                                                                onClick={onMenuClick}
                                                                                            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                                                                      >
                                                                                                                  <Menu className="w-5 h-5 text-white" />
                                                                                                                            </button>
                                                                                                                                      <h1 className="text-lg font-bold text-white">Admin Panel</h1>
                                                                                                                                              </div>

                                                                                                                                                      <div className="flex items-center gap-3">
                                                                                                                                                                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                                                                                                                                                                            <User className="w-4 h-4 text-white/70" />
                                                                                                                                                                                        <span className="text-sm text-white/90">{currentUser?.email}</span>
                                                                                                                                                                                                  </div>
                                                                                                                                                                                                            <button
                                                                                                                                                                                                                        onClick={handleLogout}
                                                                                                                                                                                                                                    className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                                                                                                                                                                                                                              >
                                                                                                                                                                                                                                                          <LogOut className="w-4 h-4 text-white" />
                                                                                                                                                                                                                                                                      <span className="text-sm text-white hidden sm:inline">Logout</span>
                                                                                                                                                                                                                                                                                </button>
                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                  </header>
                                                                                                                                                                                                                                                                                                    );
                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                    