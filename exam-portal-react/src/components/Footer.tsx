import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#1e272e] text-white pt-10 mt-16 font-bangla border-t-4 border-primary">
      <div className="max-w-5xl mx-auto px-5 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h4 className="text-[#a29bfe] font-semibold text-lg mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
            <i className="fab fa-telegram-plane"></i> টেলিগ্রাম কমিউনিটি
          </h4>
          <ul className="space-y-3 text-sm text-gray-300">
            <li>
              <a href="https://t.me/GST_Preparation" target="_blank" rel="noreferrer" className="hover:text-warning transition inline-block">
                ফ্রি প্রস্তুতি (Join Now)
              </a>
            </li>
            <li>
              <a href="https://t.me/careforcandidates" target="_blank" rel="noreferrer" className="hover:text-warning transition inline-block">
                টেক্সটাইল ইঞ্জিঃ তথ্য ও গাইডলাইন
              </a>
            </li>
            <li>
              <a href="https://t.me/Study_on_Telegram" target="_blank" rel="noreferrer" className="hover:text-warning transition inline-block">
                Admission & Academic News
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-[#a29bfe] font-semibold text-lg mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
            <i className="fab fa-youtube"></i> ফ্রি ভিডিও ক্লাস
          </h4>
          <ul className="space-y-3 text-sm text-gray-300">
            <li>
              <a href="https://www.youtube.com/@olosbd" target="_blank" rel="noreferrer" className="hover:text-warning transition inline-block">
                ফ্রি প্রস্তুতি ক্লাস
              </a>
            </li>
            <li>
              <a href="https://youtube.com/@habibscare?si=oNY9TZasgOQ-g_6l" target="_blank" rel="noreferrer" className="hover:text-warning transition inline-block">
                টেক্সটাইল ও ঢাবি প্রযুক্তি ইউনিট
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-[#a29bfe] font-semibold text-lg mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
            <i className="fas fa-globe"></i> কানেক্টেড থাকুন
          </h4>
          <ul className="space-y-3 text-sm text-gray-300">
            <li>
              <a href="https://www.facebook.com/habibs.care.edu" target="_blank" rel="noreferrer" className="hover:text-warning transition flex items-center gap-2">
                <i className="fab fa-facebook-square"></i> Facebook Page
              </a>
            </li>
            <li>
              <a href="https://facebook.com/groups/489136275227144/" target="_blank" rel="noreferrer" className="hover:text-warning transition flex items-center gap-2">
                <i className="fas fa-users"></i> Facebook Group
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-black text-center py-4 mt-8 text-xs text-gray-400">
        <p>&copy; 2026 Habib's Care. All Rights Reserved.</p>
      </div>
    </footer>
  );
};
