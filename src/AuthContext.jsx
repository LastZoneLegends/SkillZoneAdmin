import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user has permission for a specific page
  const hasPermission = (permission) => {
    if (userRole === 'admin') return true; // Admin has all permissions
    return userPermissions.includes(permission);
  };

  // Get allowed menu items based on role and permissions
  const getAllowedPages = () => {
    if (userRole === 'admin') {
      return ['dashboard', 'games', 'promotions', 'tournaments', 'users', 'deposits', 'transactions', 'withdrawals', 'lottery', 'notifications', 'settings', 'subadmins', 'demo-data'];
    }
    // For subadmin, return only permitted pages
    return userPermissions;
  };

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);

    // First check if it's an admin
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (userDoc.exists() && userDoc.data().role === 'admin') {
      return result;
    }

    // Check if it's a subadmin
    const subadminDoc = await getDoc(doc(db, 'subadmins', result.user.uid));
    if (subadminDoc.exists() && subadminDoc.data().status === 'active') {
      return result;
    }

    // Neither admin nor active subadmin
    await signOut(auth);
    throw new Error('Access denied. Admin privileges required.');
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setCurrentUser(user);
          setUserRole('admin');
          setUserPermissions([]);
          setUserData({ ...userDoc.data(), uid: user.uid });
          setLoading(false);
          return;
        }

        // Check if subadmin
        const subadminDoc = await getDoc(doc(db, 'subadmins', user.uid));
        if (subadminDoc.exists() && subadminDoc.data().status === 'active') {
          setCurrentUser(user);
          setUserRole('subadmin');
          setUserPermissions(subadminDoc.data().permissions || []);
          setUserData({ ...subadminDoc.data(), uid: user.uid });
          setLoading(false);
          return;
        }

        // Not authorized
        await signOut(auth);
        setCurrentUser(null);
        setUserRole(null);
        setUserPermissions([]);
        setUserData(null);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserPermissions([]);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userPermissions,
    userData,
    login,
    logout,
    loading,
    hasPermission,
    getAllowedPages,
    isAdmin: userRole === 'admin',
    isSubAdmin: userRole === 'subadmin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

