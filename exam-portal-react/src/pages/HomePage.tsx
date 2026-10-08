import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, onAuthStateChanged, collection, query, where, getDocs } from '../firebase';
import { User } from 'firebase/auth';
import { ExamIndexItem } from '../types/exam';
import { JSON_BASE } from '../utils/formatters';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PaymentModal } from '../components/PaymentModal';
import { SupportWidget } from '../components/SupportWidget';
import { AuthModal } from '../components/AuthModal';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [userEnrollment, setUserEnrollment] = useState<string | null>(null);
  const [allExams, setAllExams] = useState<ExamIndexItem[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        checkEnrollment(currentUser.email || '');
      } else {
        // If not logged in and not explicitly in guest mode
        setUserEnrollment(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Exam Index from JSON
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch(JSON_BASE + "exam-index.json");
        const data = await res.json();
        setAllExams(data);
      } catch (err) {
        console.error("Failed to load exams index:", err);
      }
    };
    fetchExams();
  }, []);

  // 3. Fix for Mobile Back Button & Refresh: URL Hash (#folderName) & History API (popstate)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const decoded = decodeURIComponent(hash);
        setCurrentCategory(decoded);
      } else {
        setCurrentCategory(null);
      }
    };

    // Check initial hash on page load / refresh
    handleHashChange();

    // Listen to back/forward buttons (popstate & hashchange)
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Navigate to folder and update history
  const openFolder = (categoryName: string) => {
    window.location.hash = encodeURIComponent(categoryName);
    setCurrentCategory(categoryName);
  };

  // Back button handler
  const handleBack = () => {
    if (window.location.hash) {
      window.history.back(); // Triggers popstate and returns to previous state or home
    } else {
      setCurrentCategory(null);
    }
  };

  const checkEnrollment = async (email: string) => {
    if (!email) return;
    try {
      const q = query(
        collection(db, "payment_requests"),
        where("email", "==", email),
        where("status", "==", "approved")
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setUserEnrollment('TextileFull');
      } else {
        setUserEnrollment(null);
      }
    } catch (err) {
      console.error("Enrollment check error:", err);
    }
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    setIsAuthModalOpen(false);
  };

  // Unique categories
  const categories = Array.from(
    new Set(allExams.map((e) => e.Category).filter((cat): cat is string => Boolean(cat) && cat !== "General"))
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fd] pt-[75px]">
      <Navbar
        user={user}
        isGuest={isGuest}
        onOpenLoginModal={() => setIsAuthModalOpen(true)}
        onExitGuest={() => setIsGuest(false)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4">
        {/* Success Banner if enrolled */}
        {userEnrollment && (
          <div className="bg-gradient-to-r from-success to-emerald-400 text-white p-4 rounded-2xl mb-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-full text-xl">
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold">কোর্সে যুক্ত হওয়ার জন্য ধন্যবাদ! 🎉</h2>
                <p className="text-xs text-white/90">এক্সক্লুসিভ ম্যাটেরিয়ালস পেতে টেলিগ্রামে জয়েন করুন।</p>
              </div>
            </div>
            <a
              href="https://t.me/careforcandidates"
              target="_blank"
              rel="noreferrer"
              className="bg-white text-success px-3.5 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-gray-50 transition"
            >
              <i className="fab fa-telegram-plane"></i> Join
            </a>
          </div>
        )}

        {/* Promo and Bonus Banners if NOT enrolled */}
        {!userEnrollment && (
          <>
            <div className="bg-gradient-to-r from-amber-200 to-orange-200 text-gray-800 p-3.5 rounded-2xl mb-3.5 flex items-center gap-3 shadow-sm text-xs md:text-sm">
              <i className="fas fa-gift text-xl text-amber-700"></i>
              <div>
                <h3 className="font-bold">ATTENTION! 🔥</h3>
                <p className="text-gray-700">Textile and DU Tech Exam Batch <b>"support upto DCU exam"</b> Enroll Now!</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary to-primary-light text-white p-4 rounded-2xl mb-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div>
                <h2 className="text-base font-bold">"Textile and DU Tech Exam Batch!"</h2>
                <p className="text-xs text-white/90">সম্পূর্ণ কোর্স ১০০ টাকা (Textile + DU Tech Exam Batch)।</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="bg-white text-primary px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition transform shadow"
              >
                Pay Now
              </button>
            </div>
          </>
        )}

        {/* Navigation Breadcrumb / Header */}
        <div className="flex items-center gap-3 mb-6">
          {currentCategory && (
            <button
              onClick={handleBack}
              className="bg-white hover:bg-gray-100 border border-gray-300 text-primary font-bold text-xs md:text-sm px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-sm transition"
            >
              <i className="fas fa-arrow-left"></i> ফিরে যান
            </button>
          )}
          <h3 className="text-base md:text-lg font-bold text-gray-800">
            {currentCategory || "Textile and DU Tech Exam Batch"}
          </h3>
        </div>

        {/* Grid Content */}
        {loading ? (
          <div className="text-center py-20 text-primary">
            <i className="fas fa-circle-notch fa-spin text-4xl mb-3"></i>
            <p className="text-gray-600 font-semibold text-sm">লোড হচ্ছে...</p>
          </div>
        ) : !currentCategory ? (
          /* Folder / Category View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {categories.map((cat) => {
              const count = allExams.filter((e) => e.Category === cat).length;
              return (
                <div
                  key={cat}
                  onClick={() => openFolder(cat)}
                  className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer text-center border-b-4 border-warning group"
                >
                  <div className="text-5xl text-warning mb-3 group-hover:scale-110 transition-transform">
                    <i className="fas fa-folder"></i>
                  </div>
                  <h3 className="font-bold text-gray-800 text-base">{cat}</h3>
                  <p className="text-xs text-gray-500 mt-1">{count} Exams</p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Exams View Inside Folder */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {allExams
              .filter((e) => e.Category === currentCategory)
              .map((exam) => {
                const isPaid = (exam.Type || '').toLowerCase() === 'paid';
                const unlocked = !isPaid || Boolean(userEnrollment);

                return (
                  <div
                    key={exam["Tab ID"]}
                    className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-center relative border-b-4 border-primary flex flex-col justify-between"
                  >
                    <span
                      className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isPaid
                          ? unlocked
                            ? 'bg-emerald-50 text-success'
                            : 'bg-red-50 text-rose-500'
                          : 'bg-emerald-50 text-success'
                      }`}
                    >
                      {isPaid ? (unlocked ? 'PURCHASED' : 'PAID') : 'FREE'}
                    </span>

                    <div>
                      <div className="text-4xl text-primary mb-3">
                        <i className="fas fa-file-alt"></i>
                      </div>
                      <h3 className="font-bold text-gray-800 text-base mb-1">{exam["Exam Name"]}</h3>
                      <small className="text-xs text-gray-500">
                        {exam["Total Time"]} Min | Marks: {exam["Total Marks"]}
                      </small>
                    </div>

                    <button
                      onClick={() => {
                        if (unlocked) {
                          navigate(`/exam/${exam["Tab ID"]}`);
                        } else {
                          setIsPaymentModalOpen(true);
                        }
                      }}
                      className={`w-full mt-4 py-2.5 rounded-xl font-bold text-sm transition ${
                        unlocked
                          ? 'bg-primary hover:bg-primary-hover text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {unlocked ? 'Start Exam' : <><i className="fas fa-lock mr-1"></i> Unlock Now</>}
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </main>

      {/* Modals and Support */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onGuestLogin={handleGuestLogin}
      />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
      <SupportWidget />
      <Footer />
    </div>
  );
};
