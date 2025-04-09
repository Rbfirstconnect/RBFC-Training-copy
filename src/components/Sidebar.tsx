import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isBackOffice = user?.role === 'back_office';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="bg-white shadow-lg boost-border">
      <nav className="flex items-center space-x-4 px-4">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-[#ff6900] rounded-lg ${
              isActive ? 'bg-orange-50 text-[#ff6900] font-medium' : ''
            }`
          }
        >
          <Home className="w-5 h-5 mr-3" />
          Dashboard
        </NavLink>
        
        {(isAdmin || isBackOffice) && (
          <NavLink
            to="/module-management"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-[#ff6900] rounded-lg ${
                isActive ? 'bg-orange-50 text-[#ff6900] font-medium' : ''
              }`
            }
          >
            <Settings className="w-5 h-5 mr-3" />
            Module Management
          </NavLink>
        )}

        {isAdmin && (
          <NavLink
            to="/user-management"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-[#ff6900] rounded-lg ${
                isActive ? 'bg-orange-50 text-[#ff6900] font-medium' : ''
              }`
            }
          >
            <Users className="w-5 h-5 mr-3" />
            User Management
          </NavLink>
        )}
      </nav>
    </div>
  );
}