import React from 'react';
import Swal from 'sweetalert2';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const paymentNumber = "01873275283";

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(paymentNumber).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'নাম্বার কপি হয়েছে!',
        showConfirmButton: false,
        timer: 1500
      });
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl w-full max-w-md text-center shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-4">টেক্সটাইল ব্যাচে ভর্তি</h3>

        <div className="bg-[#f3f0ff] p-4 rounded-xl mb-4 text-left border-l-4 border-primary">
          <p className="font-semibold text-gray-700 text-sm">
            Textile and DU Tech Exam Batch - ভর্তি হতে ১০০ টাকা সেন্ড মানি করুন:
          </p>
          <div className="flex items-center gap-2 mt-2 bg-white px-3 py-2 rounded-lg border border-gray-200 w-max">
            <span className="text-lg font-bold text-primary tracking-wide">{paymentNumber}</span>
            <button
              onClick={handleCopyNumber}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded transition"
            >
              <i className="fas fa-copy"></i> Copy
            </button>
          </div>
          <small className="text-gray-500 block mt-1">(bKash / Nagad)</small>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl text-left">
          <p className="text-xs font-bold text-danger mb-3 leading-relaxed">
            *টাকা পাঠানোর পর নিচের যেকোনো মাধ্যমে আপনার নাম এবং যে নম্বর থেকে টাকা পাঠিয়েছেন তা মেসেজ করে দিন। আমরা আপনাকে কোর্সে যুক্ত করে নিবো।
          </p>

          <div className="flex flex-col gap-2.5">
            <a
              href="https://wa.me/8801925251621"
              target="_blank"
              rel="noreferrer"
              className="bg-[#25D366] hover:bg-[#128C7E] text-white py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <i className="fab fa-whatsapp text-lg"></i> WhatsApp -এ মেসেজ দিন
            </a>
            <a
              href="https://t.me/@Admissionhelper007"
              target="_blank"
              rel="noreferrer"
              className="bg-[#0088cc] hover:bg-[#005f8e] text-white py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <i className="fab fa-telegram-plane text-lg"></i> Telegram -এ মেসেজ দিন
            </a>
            <a
              href="https://www.facebook.com/habibs.care.edu/"
              target="_blank"
              rel="noreferrer"
              className="bg-[#1877F2] hover:bg-[#165eab] text-white py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <i className="fab fa-facebook-messenger text-lg"></i> Facebook Page -এ মেসেজ দিন
            </a>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-gray-500 hover:text-gray-800 text-sm font-medium transition"
        >
          বন্ধ করুন
        </button>
      </div>
    </div>
  );
};
