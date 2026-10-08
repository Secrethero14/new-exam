import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, signOut } from '../firebase';
import { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  isGuest: boolean;
  onOpenLoginModal?: () => void;
  onExitGuest?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, isGuest, onOpenLoginModal, onExitGuest }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-[65px] bg-white shadow-sm flex items-center justify-between px-4 z-50">
      <Link to="/" className="text-primary font-bold text-lg md:text-xl flex items-center gap-2 hover:opacity-90">
        <i className="fas fa-graduation-cap"></i>
        <span>Textile and DU Tech Exam</span>
      </Link>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Link
              to="/profile"
              className="bg-gradient-to-r from-primary to-primary-light text-white text-xs md:text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm hover:opacity-90 transition"
            >
              <i className="fas fa-user"></i>
              <span>প্রোফাইল</span>
            </Link>
            <button
              onClick={handleLogout}
              className="bg-rose-500 hover:bg-rose-600 text-white text-xs md:text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </>
        ) : isGuest ? (
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-gray-500">Guest</span>
            <button
              onClick={onExitGuest}
              className="bg-gray-400 hover:bg-gray-500 text-white text-xs md:text-sm font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Exit
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="bg-primary hover:bg-primary-hover text-white text-xs md:text-sm font-semibold px-3 py-2 rounded-lg transition"
          >
            লগইন করুন
          </button>
        )}
      </div>
    </nav>
  );
};
