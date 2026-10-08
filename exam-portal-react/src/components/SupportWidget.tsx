import React, { useState } from 'react';

export const SupportWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-14 right-0 bg-white w-48 rounded-2xl shadow-xl p-4 flex flex-col gap-2.5 border border-gray-100 animate-slide-up">
          <div className="text-xs text-gray-500 text-center font-semibold mb-1">সাহায্য প্রয়োজন?</div>
          <a
            href="https://wa.me/8801925251621"
            target="_blank"
            rel="noreferrer"
            className="bg-[#e6fffa] hover:bg-success text-success hover:text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"
          >
            <i className="fab fa-whatsapp"></i> WhatsApp
          </a>
          <a
            href="https://t.me/admissionhelper007"
            target="_blank"
            rel="noreferrer"
            className="bg-[#f0f9ff] hover:bg-[#0088cc] text-[#0088cc] hover:text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"
          >
            <i className="fab fa-telegram-plane"></i> Telegram
          </a>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-primary to-primary-light text-white rounded-full px-5 py-3 font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition transform"
      >
        <i className="fas fa-headset text-lg"></i>
        <span>Help</span>
      </button>
    </div>
  );
};
