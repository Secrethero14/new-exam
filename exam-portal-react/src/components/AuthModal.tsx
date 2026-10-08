import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail 
} from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestLogin: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onGuestLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'info' | 'success' } | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      setMessage({ text: "লগইন সমস্যা: " + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ text: "পাসওয়ার্ড রিসেট করতে ইমেইল বক্সে আপনার ইমেইলটি লিখুন।", type: 'error' });
      return;
    }
    try {
      setMessage({ text: "পাঠানো হচ্ছে...", type: 'info' });
      await sendPasswordResetEmail(auth, email);
      setMessage({ text: "ইমেইল চেক করুন, পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।", type: 'success' });
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/user-not-found') msg = "এই ইমেইলে কোনো অ্যাকাউন্ট নেই।";
      setMessage({ text: msg, type: 'error' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name && cred.user) {
          await updateProfile(cred.user, { displayName: name });
        }
        onClose();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-login-credentials') {
        setMessage({ text: 'অ্যাকাউন্ট নেই বা তথ্য ভুল! রেজিস্ট্রেশন মোডে নেওয়া হচ্ছে...', type: 'info' });
        setTimeout(() => {
          setIsRegistering(true);
        }, 1200);
      } else if (err.code === 'auth/email-already-in-use') {
        setMessage({ text: 'এই ইমেইল আগেই আছে। লগইন মোডে নেওয়া হচ্ছে...', type: 'info' });
        setTimeout(() => {
          setIsRegistering(false);
        }, 1200);
      } else {
        setMessage({ text: "সমস্যা: " + err.message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid = password.length >= 6;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white p-7 rounded-2xl w-full max-w-sm text-center shadow-2xl relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
        >
          &times;
        </button>

        <div className="mb-5">
          <i className="fas fa-graduation-cap text-4xl text-primary mb-2 inline-block"></i>
          <h2 className="text-xl font-bold text-gray-800">
            {isRegistering ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "স্বাগতম!"}
          </h2>
          <p className="text-gray-500 text-sm">
            {isRegistering ? "আপনার তথ্য পূরণ করুন" : "অ্যাকাউন্টে প্রবেশ করুন"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          {isRegistering && (
            <div className="relative">
              <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="আপনার নাম লিখুন"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isRegistering}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-primary outline-none transition"
              />
            </div>
          )}

          <div className="relative">
            <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="email"
              placeholder="ইমেইল এড্রেস"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-primary outline-none transition"
            />
          </div>

          <div className="relative">
            <i
              className={`fas ${password.length >= 6 ? 'fa-lock-open text-success' : password.length > 0 ? 'fa-lock text-danger' : 'fa-lock text-gray-400'} absolute left-3.5 top-1/2 -translate-y-1/2 transition`}
            ></i>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="পাসওয়ার্ড (কমপক্ষে ৬ সংখ্যা)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={`w-full pl-10 pr-10 py-2.5 border-2 rounded-xl text-sm outline-none transition ${
                password.length >= 6
                  ? 'border-success'
                  : password.length > 0
                  ? 'border-danger'
                  : 'border-gray-200 focus:border-primary'
              }`}
            />
            <i
              onClick={() => setShowPassword(!showPassword)}
              className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary cursor-pointer transition`}
            ></i>
          </div>

          {message && (
            <div
              className={`text-xs font-semibold p-2.5 rounded-lg text-center ${
                message.type === 'error'
                  ? 'bg-red-50 text-danger border border-red-200'
                  : message.type === 'info'
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-green-50 text-success border border-green-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (password.length > 0 && !isPasswordValid)}
            className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> যাচাই করা হচ্ছে...
              </>
            ) : isRegistering ? (
              "রেজিস্টার করুন"
            ) : (
              "লগইন করুন"
            )}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-orange-600 hover:underline"
          >
            পাসওয়ার্ড ভুলে গেছেন?
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setMessage(null);
            }}
            className="text-primary font-bold hover:underline"
          >
            {isRegistering ? "লগইন করুন" : "নতুন অ্যাকাউন্ট?"}
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-400">অথবা</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition"
          >
            <i className="fab fa-google text-red-500"></i> Google দিয়ে লগইন
          </button>
          <button
            onClick={onGuestLogin}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition"
          >
            <i className="fas fa-user-secret"></i> Guest Mode (গেস্ট মোড)
          </button>
        </div>
      </div>
    </div>
  );
};
