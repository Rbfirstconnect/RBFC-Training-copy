import React, { useEffect, useState } from 'react';
import { Users, Search, Filter, Calendar, User, Clock, Shield, UserPlus, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';
import { ROLE_DISPLAY_NAMES } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

const ROLES: UserRole[] = [
  'admin',
  'back_office',
  'rm',
  'asm',
  'market_lead',
  'frontline_sales'
];

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .rpc('get_all_users')
        .order('created_at', { ascending: false })
        .throwOnError();

      if (error) throw error;
      
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setSaving(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Refresh the users list
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setSaving(null);
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesDate = !dateFilter || new Date(user.created_at).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
    return matchesSearch && matchesRole && matchesDate;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRole('');
    setDateFilter('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <div className="h-1 w-20 bg-[#ff6900] rounded-full mt-2"></div>
          </div>
          <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg">
            <Shield className="w-5 h-5 text-[#ff6900]" />
            <span className="text-gray-700 font-medium">{filteredUsers.length} Users</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg space-y-4 border boost-border">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
              />
            </div>
          </div>
          
          <div className="w-48">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
            >
              <option value="">All Roles</option>
              {ROLES.map(role => (
                <option key={role} value={role}>
                  {ROLE_DISPLAY_NAMES[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="w-48">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
              />
            </div>
          </div>

          {(searchTerm || selectedRole || dateFilter) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-[#ff6900] border border-[#ff6900] rounded-lg hover:bg-orange-50 transition-all duration-200"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <Users className="w-5 h-5 mr-2 text-gray-600" />
          <span>Showing {filteredUsers.length} of {users.length} users</span>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden border boost-border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-orange-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-[#ff6900] uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-[#ff6900] uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-[#ff6900] uppercase tracking-wider">Created At</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 relative">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  {users.length === 0 ? 'No users found' : 'No users match the current filters'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-orange-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                        <User className="h-4 w-4 text-[#ff6900]" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-[#ff6900]">
                      {ROLE_DISPLAY_NAMES[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-medium">Delete User</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle delete
                  setShowDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}