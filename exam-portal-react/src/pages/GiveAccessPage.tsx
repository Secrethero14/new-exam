import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { db, collection, addDoc } from '../firebase';

export const GiveAccessPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    last3: '',
    gender: '',
    college: '',
    hscBatch: '',
    weakSub: '',
    strongSub: ''
  });
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, phone, last3, gender, college, hscBatch, weakSub, strongSub } = formData;

    if (!name || !email || !phone || !last3 || !gender || !college) {
      return Swal.fire('ভুল!', 'দয়া করে স্টার (*) মার্ক করা সব ঘর পূরণ করুন।', 'warning');
    }

    Swal.fire({ title: 'অপেক্ষা করুন...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const dataToSave = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        last3: last3.trim(),
        gender,
        college: college.trim(),
        hscBatch: hscBatch.trim() || "N/A",
        weakSub: weakSub.trim() || "N/A",
        strongSub: strongSub.trim() || "N/A",
        package: "TextileFull",
        status: "approved",
        method: "student_form",
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, "payment_requests"), dataToSave);
      Swal.close();
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      Swal.fire('সমস্যা!', 'ইন্টারনেট কানেকশন চেক করুন।', 'error');
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4 font-bangla">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg text-center">
          <i className="fas fa-check-circle text-6xl text-success mb-4"></i>
          <h2 className="text-2xl font-bold text-success mb-4">সাবমিট সফল হয়েছে!</h2>
          <p className="text-gray-700 mb-6">
            আপনার অ্যাকাউন্টে এক্সাম আনলক হয়ে গেছে।<br /><br />
            <b>প্রাইভেট গ্রুপে অ্যাড হতে আপনার নাম জানিয়ে নিচের যেকোনো লিংকে মেসেজ দিন:</b>
          </p>
          <div className="flex flex-col gap-3">
            <a href="https://wa.me/8801925251621" target="_blank" rel="noreferrer" className="bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
              <i className="fab fa-whatsapp text-xl"></i> WhatsApp -এ মেসেজ দিন
            </a>
            <a href="https://t.me/Admissionhelper007" target="_blank" rel="noreferrer" className="bg-[#0088cc] hover:bg-[#007bb5] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
              <i className="fab fa-telegram-plane text-xl"></i> Telegram -এ মেসেজ দিন
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4 font-bangla">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold text-primary text-center border-b-2 border-gray-100 pb-3 mb-2">📝 পেমেন্ট ও তথ্য সাবমিট</h2>
        <p className="text-center text-gray-500 text-sm mb-6">নিচের তথ্যগুলো দিয়ে আপনার কোর্স আনলক করুন</p>

        <form onSubmit={submitForm} className="space-y-4">
          <div>
            <label className="block font-bold text-gray-800 text-sm mb-1">আপনার নাম *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="সম্পূর্ণ নাম লিখুন" required className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary transition" />
          </div>

          <div>
            <label className="block font-bold text-gray-800 text-sm mb-1">লগইন করা ইমেইল *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ওয়েবসাইটে যে ইমেইল দিয়ে লগইন করেছেন" required className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary transition" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-800 text-sm mb-1">ফোন নম্বর *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="01XXXXXXXXX" required className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block font-bold text-gray-800 text-sm mb-1">টাকা পাঠানোর লাস্ট ৩ ডিজিট *</label>
              <input type="text" name="last3" value={formData.last3} onChange={handleChange} placeholder="যেমন: 583" maxLength={3} required className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary transition" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-800 text-sm mb-1">জেন্ডার *</label>
              <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary transition bg-white">
                <option value="">নির্বাচন করুন</option>
                <option value="Male">Male (ছাত্র)</option>
                <option value="Female">Female (ছাত্রী)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-800 text-sm mb-1">HSC ব্যাচ <span className="font-normal text-gray-400 text-xs">(ঐচ্ছিক)</span></label>
              <input type="text" name="hscBatch" value={formData.hscBatch} onChange={handleChange} placeholder="যেমন: 2024" className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary transition" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-800 text-sm mb-1">কলেজের নাম *</label>
            <input type="text" name="college" value={formData.college} onChange={handleChange} placeholder="আপনার কলেজের নাম লিখুন" required className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary transition" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-800 text-sm mb-1">দুর্বল বিষয় <span className="font-normal text-gray-400 text-xs">(ঐচ্ছিক)</span></label>
              <input type="text" name="weakSub" value={formData.weakSub} onChange={handleChange} placeholder="যেমন: Physics" className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block font-bold text-gray-800 text-sm mb-1">স্ট্রং বিষয় <span className="font-normal text-gray-400 text-xs">(ঐচ্ছিক)</span></label>
              <input type="text" name="strongSub" value={formData.strongSub} onChange={handleChange} placeholder="যেমন: Math" className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary transition" />
            </div>
          </div>

          <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl transition mt-2">
            সাবমিট করুন
          </button>
        </form>
      </div>
    </div>
  );
};
