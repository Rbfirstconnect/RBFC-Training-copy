import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import UserProfile from './components/UserProfile';
import Dashboard from './pages/Dashboard';
import ModuleManagement from './pages/ModuleManagement';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import ModuleList from './pages/ModuleList';
import ModuleView from './pages/ModuleView.tsx';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-100 flex flex-col relative">
          <header className="w-full bg-[#FF6900] py-2 px-4 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
            <h1 className="text-lg font-bold text-white">RB FIRST CONNECT</h1>
            <UserProfile />
          </header>
          <div className="pt-12">
            <Sidebar />
          </div>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={
                <div className="px-4 md:px-8 py-4 mb-16">
                  <Dashboard />
                </div>
              } />
              <Route path="/folders/:folderId" element={
                <div className="px-4 md:px-8 py-4 mb-16">
                  <ModuleList />
                </div>
              } />
              <Route path="/modules/:moduleId" element={
                <div className="px-4 md:px-8 py-4 mb-16">
                  <ModuleView />
                </div>
              } />
              <Route path="/module-management" element={
                <div className="px-4 md:px-8 py-4 mb-16">
                  <ModuleManagement />
                </div>
              } />
              <Route path="/user-management" element={
                <div className="px-4 md:px-8 py-4 mb-16">
                  <UserManagement />
                </div>
              } />
            </Route>
          </Routes>
          <footer className="fixed bottom-0 left-0 right-0 bg-white boost-border py-2 text-center">
            <p className="text-sm text-gray-600">© {new Date().getFullYear()} RB FIRST CONNECT. All rights reserved.</p>
            <p className="text-[10px] text-gray-500">Powered by PARTH</p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;