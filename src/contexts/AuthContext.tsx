import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthError = async (error: any) => {
    if (error?.message?.includes('Invalid Refresh Token') || 
        error?.message?.includes('refresh_token_not_found')) {
      await signOut();
      if (location.pathname !== '/login') {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (session?.user && mounted) {
          await fetchUserData(session.user.id);
        } else {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        handleAuthError(error);
      } finally {
        if (mounted) {
          setAuthChecked(true);
          setLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    if (!user && location.pathname !== '/login') {
      navigate('/login');
    } else if (user && location.pathname === '/login') {
      navigate('/');
    }
  }, [user, authChecked, location.pathname]);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        navigate('/login');
        return;
      }

      if (event === 'SIGNED_IN') {
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } else if (!session) {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [authChecked]);

  async function fetchUserData(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user data:', error);
        setUser(null);
        setLoading(false);
        return;
      }

      // If no user data found, set user to null
      if (!data) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(data);
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      handleAuthError(error);
      throw error;
    }
    
    // Refresh the session to get updated claims
    await supabase.auth.refreshSession();
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      if (location.pathname !== '/login') {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Force clear the session even if there's an error
      setUser(null);
      if (location.pathname !== '/login') {
        navigate('/login');
      }
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}