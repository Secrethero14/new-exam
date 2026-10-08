import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  onAuthStateChanged 
} from '../firebase';
import { User } from 'firebase/auth';
import { ExamResultRecord, UserProfile } from '../types/exam';
import { parseDate } from '../utils/formatters';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [examHistory, setExamHistory] = useState<ExamResultRecord[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Profile edit form fields
  const [college, setCollege] = useState('');
  const [batch, setBatch] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        loadUserData(user.email || '');
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. Load User Profile & Exam History
  const loadUserData = async (email: string) => {
    if (!email) return;
    try {
      setIsLoading(true);

      // Fetch profile
      const userDocRef = doc(db, "users", email);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data() as UserProfile;
        setUserProfile(data);
        setCollege(data.college || '');
        setBatch(data.batch || '');
        setPhone(data.phone || '');
      }

      // Fetch exam history
      const historyQuery = query(
        collection(db, "exam_results"),
        where("email", "==", email)
      );
      const historySnap = await getDocs(historyQuery);

      const list: ExamResultRecord[] = [];
      historySnap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as ExamResultRecord) });
      });

      // Sort newest first
      list.sort((a, b) => {
        const dateA = parseDate(a) || new Date(0);
        const dateB = parseDate(b) || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setExamHistory(list);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading profile:", err);
      setIsLoading(false);
    }
  };

  // 3. Save Profile to Firestore
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    try {
      setIsSaving(true);
      const userRef = doc(db, "users", currentUser.email);
      await setDoc(
        userRef,
        {
          college: college.trim(),
          batch: batch.trim(),
          phone: phone.trim(),
          email: currentUser.email,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setUserProfile((prev) => ({
        ...prev,
        college: college.trim(),
        batch: batch.trim(),
        phone: phone.trim()
      }));

      setIsEditModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'সফল!',
        text: 'প্রোফাইল আপডেট হয়েছে।',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'সেভ করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate Overall Statistics
  let totalCorrect = 0;
  let totalWrong = 0;
  examHistory.forEach((item) => {
    if (!item.isPractice) {
      totalCorrect += Number(item.correct || 0);
      totalWrong += Number(item.wrong || 0);
    }
  });
  const totalAttempted = totalCorrect + totalWrong;
  const accuracyPercent = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-[#2d3436] pt-20 pb-16">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 w-full h-[60px] bg-white shadow-sm flex items-center px-6 z-40">
        <Link to="/" className="text-primary font-bold text-base flex items-center gap-2 hover:opacity-90">
          <i className="fas fa-arrow-left"></i>
          <span>ড্যাশবোর্ড</span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary to-primary-light text-white p-6 md:p-8 rounded-3xl shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentUser?.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
              alt="Avatar"
              className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white/50 object-cover bg-white shadow"
            />
            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                {currentUser?.displayName || "প্রিয় ছাত্র"}
              </h2>
              <p className="text-xs md:text-sm text-white/90 flex items-center gap-1.5 mt-0.5">
                <i className="fas fa-envelope"></i> {currentUser?.email}
              </p>
              {userProfile?.college && (
                <p className="text-xs text-white/80 flex items-center gap-1.5 mt-0.5">
                  <i className="fas fa-university"></i> {userProfile.college}
                </p>
              )}
              {userProfile?.batch && (
                <p className="text-xs text-white/80 flex items-center gap-1.5 mt-0.5">
                  <i className="fas fa-graduation-cap"></i> Batch: {userProfile.batch}
                </p>
              )}
              {userProfile?.phone && (
                <p className="text-xs text-white/80 flex items-center gap-1.5 mt-0.5">
                  <i className="fas fa-phone"></i> {userProfile.phone}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="bg-white/20 hover:bg-white text-white hover:text-primary font-bold text-xs md:text-sm px-4 py-2 rounded-xl border border-white/40 transition flex items-center gap-1.5"
          >
            <i className="fas fa-user-edit"></i> আপডেট প্রোফাইল
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm text-center border-b-4 border-primary">
            <div className="text-3xl font-extrabold text-gray-800 mb-1">{examHistory.length}</div>
            <div className="text-xs text-gray-500 font-semibold">মোট এক্সাম</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm text-center border-b-4 border-success">
            <div className="text-3xl font-extrabold text-success mb-1">{totalCorrect}</div>
            <div className="text-xs text-gray-500 font-semibold">মোট সঠিক উত্তর</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm text-center border-b-4 border-danger">
            <div className="text-3xl font-extrabold text-danger mb-1">{totalWrong}</div>
            <div className="text-xs text-gray-500 font-semibold">মোট ভুল উত্তর</div>
          </div>
        </div>

        {/* Accuracy Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 text-center">
          <h3 className="font-bold text-gray-700 text-sm md:text-base">তোমার একুরেসি (Accuracy)</h3>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden my-3">
            <div
              className="bg-success h-full transition-all duration-700 rounded-full"
              style={{ width: `${accuracyPercent}%` }}
            ></div>
          </div>
          <div className="text-2xl font-black text-primary">{accuracyPercent}%</div>
          <p className="text-xs text-gray-500 mt-1">
            তুমি যতগুলো উত্তর দাগিয়েছো, তার মধ্যে কতগুলো সঠিক হয়েছে তার হিসাব।
          </p>
        </div>

        {/* Exam History Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm">
          <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
            <i className="fas fa-history text-primary"></i> আমার এক্সাম হিস্ট্রি
          </h3>

          {isLoading ? (
            <div className="text-center py-10 text-primary">
              <i className="fas fa-circle-notch fa-spin text-3xl mb-2"></i>
              <p className="text-xs text-gray-500">ডাটা লোড হচ্ছে...</p>
            </div>
          ) : examHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p>আপনি এখনো কোনো এক্সাম দেননি।</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {examHistory.map((item) => {
                const dateObj = parseDate(item);
                const dateStr = dateObj
                  ? dateObj.toLocaleDateString("en-US", {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                  : 'Unknown Date';

                const score = parseFloat(String(item.score || 0));

                return (
                  <div key={item.id} className="py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50/50 px-2 rounded-xl transition">
                    <div>
                      <div className="font-bold text-gray-800 text-sm md:text-base flex items-center gap-2">
                        <span>{item.examName || "Untitled Exam"}</span>
                        {item.isPractice && (
                          <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-normal">
                            Practice
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span><i className="far fa-clock mr-1"></i> {dateStr}</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            score < 0
                              ? 'bg-red-50 text-danger border border-red-200'
                              : 'bg-emerald-50 text-success border border-emerald-200'
                          }`}
                        >
                          স্কোর: {score.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/result/${item.id}`}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                      >
                        <i className="fas fa-file-invoice"></i> রেজাল্ট
                      </Link>
                      <Link
                        to={`/exam/${item.examId}`}
                        className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                      >
                        <i className="fas fa-redo"></i> আবার দিন
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          onClick={() => setIsEditModalOpen(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-up"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <i className="fas fa-user-edit"></i> প্রোফাইল আপডেট
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-left text-xs md:text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  College Name (কলেজের নাম)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka College"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  HSC Batch (এইচএসসি ব্যাচ)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Phone Number (মোবাইল নম্বর)
                </label>
                <input
                  type="tel"
                  placeholder="01XXX-XXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:border-primary transition"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {isSaving ? <><i className="fas fa-spinner fa-spin"></i> সেভ হচ্ছে...</> : "সেভ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
