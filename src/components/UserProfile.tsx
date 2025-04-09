import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_DISPLAY_NAMES } from '../types';

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 py-1 px-2 rounded-lg hover:bg-[#FF8533] transition-colors"
      >
        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-[#FF6900]" />
        </div>
        <div className="text-left">
          <p className="text-xs font-medium text-white">{user.email}</p>
          <p className="text-[10px] text-white/80">{ROLE_DISPLAY_NAMES[user.role]}</p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border boost-border">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#ff6900]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}