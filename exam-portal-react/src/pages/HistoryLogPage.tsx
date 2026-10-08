import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, addDoc } from '../firebase';

export const HistoryLogPage: React.FC = () => {
  const [adminEmail, setAdminEmail] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [granting, setGranting] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "payment_requests"), where("status", "==", "approved"));
      const snapshot = await getDocs(q);
      let fetchedLogs: any[] = [];
      snapshot.forEach(doc => fetchedLogs.push({ id: doc.id, ...doc.data() }));

      fetchedLogs.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      });

      setLogs(fetchedLogs);
    } catch (error) {
      console.error(error);
      alert('ডাটা লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const grantManualAccess = async () => {
    const email = adminEmail.trim().toLowerCase();
    if (!email) return alert('দয়া করে স্টুডেন্টের ইমেইল দিন!');

    setGranting(true);
    try {
      await addDoc(collection(db, "payment_requests"), {
        email: email,
        package: "TextileFull",
        status: "approved",
        method: "manual_admin",
        timestamp: new Date().toISOString()
      });
      setAdminEmail('');
      alert('সফলভাবে অ্যাক্সেস দেওয়া হয়েছে!');
      loadHistory();
    } catch (error) {
      console.error(error);
      alert('সমস্যা হয়েছে!');
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 font-bangla text-gray-800">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Manual Access Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold text-primary border-b-2 border-gray-100 pb-3 mb-4 flex items-center gap-2">
            <i className="fas fa-unlock-alt"></i> ম্যানুয়াল অ্যাক্সেস দিন
          </h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="স্টুডেন্টের ইমেইল অ্যাড্রেস লিখুন"
              className="flex-1 min-w-[250px] p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-success transition"
            />
            <button
              onClick={grantManualAccess}
              disabled={granting}
              className="bg-success hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl transition flex items-center gap-2 disabled:opacity-70"
            >
              {granting ? <><i className="fas fa-spinner fa-spin"></i> অপেক্ষা করুন...</> : "অ্যাক্সেস দিন"}
            </button>
          </div>
        </div>

        {/* Database Log Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold text-primary border-b-2 border-gray-100 pb-3 mb-4 flex items-center gap-2">
            <i className="fas fa-list-alt"></i> স্টুডেন্ট ডাটাবেস ও লগ
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-bold text-gray-700">তারিখ ও সময়</th>
                  <th className="p-4 font-bold text-gray-700">বেসিক তথ্য</th>
                  <th className="p-4 font-bold text-gray-700">পেমেন্ট ও স্ট্যাটাস</th>
                  <th className="p-4 font-bold text-gray-700">একাডেমিক তথ্য</th>
                  <th className="p-4 font-bold text-gray-700">মাধ্যম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      <i className="fas fa-circle-notch fa-spin text-2xl mb-2 block"></i> ডাটা লোড হচ্ছে...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-bold">কোনো ডাটা নেই</td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const dateObj = log.timestamp ? new Date(log.timestamp) : new Date();
                    const dateStr = dateObj.toLocaleDateString('bn-BD');
                    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                    const isManual = log.method === 'manual_admin';
                    const methodBadge = isManual
                      ? <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">ম্যানুয়াল (Admin)</span>
                      : <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">ফর্ম থেকে সাবমিট</span>;

                    const genderBadge = log.gender === 'Male'
                      ? <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs font-bold">Male</span>
                      : log.gender === 'Female'
                      ? <span className="bg-pink-50 text-pink-600 px-2 py-0.5 rounded text-xs font-bold">Female</span>
                      : null;

                    if (isManual) {
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 transition">
                          <td className="p-4">
                            {dateStr}<br /><span className="text-gray-400 text-xs">{timeStr}</span>
                          </td>
                          <td className="p-4">
                            <b>-</b><br />
                            <span className="text-primary font-semibold">{log.email}</span>
                          </td>
                          <td className="p-4 text-gray-400">-</td>
                          <td className="p-4 text-gray-400">-</td>
                          <td className="p-4">{methodBadge}</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition">
                        <td className="p-4">
                          {dateStr}<br /><span className="text-gray-400 text-xs">{timeStr}</span>
                        </td>
                        <td className="p-4">
                          <b>{log.name}</b><br />
                          <span className="text-primary font-semibold">{log.email}</span><br />
                          <span className="text-gray-500 text-xs"><i className="fas fa-phone-alt mr-1"></i>{log.phone}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-600 text-xs">লাস্ট ৩ ডিজিট:</span> <span className="text-danger font-bold text-base">{log.last3}</span><br />
                          {genderBadge}
                        </td>
                        <td className="p-4 text-sm">
                          <b>কলেজ:</b> {log.college}<br />
                          <span className="text-gray-500 text-xs">
                            <b>ব্যাচ:</b> {log.hscBatch} | <b>Strong:</b> {log.strongSub} | <b>Weak:</b> {log.weakSub}
                          </span>
                        </td>
                        <td className="p-4">{methodBadge}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
