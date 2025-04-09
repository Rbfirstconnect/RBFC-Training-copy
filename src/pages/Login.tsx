import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password
        });
        
        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            setError('This email is already registered. Please sign in or use a different email.');
            return;
          }
          throw signUpError;
        }
        
        setError('');
        // Show success message
        setError('Registration successful! Please Refresh the page and Click on Dashboard to continue');
        return;
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(isSignUp 
        ? 'Failed to sign up. Please try again.' 
        : 'Failed to sign in. Please check your credentials.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full boost-border">
        <div className="flex items-center justify-center mb-8">
          {isSignUp ? (
            <UserPlus className="w-12 h-12 text-[#ff6900]" />
          ) : (
            <LogIn className="w-12 h-12 text-[#ff6900]" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-center mb-8">
          {isSignUp ? 'Create Account' : 'RB FIRST CONNECT'}
        </h2>
        {error && (
          <div className={`border px-4 py-3 rounded mb-4 ${
            error.includes('successful') 
              ? 'bg-green-100 border-green-400 text-green-700'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full boost-gradient text-white py-2 px-4 rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#ff6900]"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-[#ff6900] hover:opacity-90 text-sm font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} RB FIRST CONNECT</p>
          <p className="mt-1">Powered by PARTH</p>
        </div>
      </div>
    </div>
  );
}