import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import { HomePage } from './pages/HomePage';
import { ExamPage } from './pages/ExamPage';
import { ResultPage } from './pages/ResultPage';
import { ProfilePage } from './pages/ProfilePage';
import { GiveAccessPage } from './pages/GiveAccessPage';
import { AdminResultPage } from './pages/AdminResultPage';
import { HistoryLogPage } from './pages/HistoryLogPage';

// Admin Protected Route Wrapper
const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const [user, setUser] = useState<any>("loading");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (user === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // আপনার অ্যাডমিন ইমেইলটি এখানে সেট করে দিন
  const ADMIN_EMAIL = "your_admin_email@gmail.com"; 

  if (!user || user.email !== ADMIN_EMAIL) {
    // অন্য কেউ হলে সোজা হোম পেজে পাঠিয়ে দেবে!
    return <Navigate to="/" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public / Student Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/exam/:id" element={<ExamPage />} />
        <Route path="/result/:id" element={<ResultPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/give-access" element={<GiveAccessPage />} />

        {/* Protected Admin Routes */}
        <Route 
          path="/admin/results" 
          element={
            <AdminRoute>
              <AdminResultPage />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/history" 
          element={
            <AdminRoute>
              <HistoryLogPage />
            </AdminRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
