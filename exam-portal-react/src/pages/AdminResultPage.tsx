import React, { useState } from 'react';
import { db, collection, query, where, getDocs } from '../firebase';

export const AdminResultPage: React.FC = () => {
  const [examId, setExamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [maxQuestions, setMaxQuestions] = useState(0);

  const loadResults = async () => {
    if (!examId.trim()) return alert("দয়া করে একটি Exam ID লিখুন (যেমন: hstuA_1)");

    setLoading(true);
    setResults([]);
    setMaxQuestions(0);

    try {
      const q = query(collection(db, "exam_results"), where("examId", "==", examId.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setLoading(false);
        return alert("এই ID তে কোনো এক্সামের ডাটা পাওয়া যায়নি!");
      }

      let loadedResults: any[] = [];
      let maxQ = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        loadedResults.push({ id: doc.id, ...data });

        if (data.userAnswers) {
          const keys = Object.keys(data.userAnswers).map(Number);
          if (keys.length > 0) {
            const maxKey = Math.max(...keys);
            if ((maxKey + 1) > maxQ) maxQ = maxKey + 1;
          }
        }
      });

      // Sort by score (desc), then time (asc)
      loadedResults.sort((a, b) => {
        const scoreA = parseFloat(a.score) || 0;
        const scoreB = parseFloat(b.score) || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;

        const timeA = parseFloat(a.timeTaken) || 0;
        const timeB = parseFloat(b.timeTaken) || 0;
        return timeA - timeB;
      });

      setResults(loadedResults);
      setMaxQuestions(maxQ);
    } catch (e) {
      console.error(e);
      alert("এরর: ডাটা লোড করা যাচ্ছে না!");
    } finally {
      setLoading(false);
    }
  };

  const exportTableToCSV = () => {
    let csv = [];
    const rows = document.querySelectorAll("#resultTable tr");
    for (let i = 0; i < rows.length; i++) {
      let row = [], cols = rows[i].querySelectorAll("td, th");
      for (let j = 0; j < cols.length; j++) {
        let data = (cols[j] as HTMLElement).innerText.replace(/(\r\n|\n|\r)/gm, "").replace(/"/g, '""');
        row.push('"' + data + '"');
      }
      csv.push(row.join(","));
    }
    const csvFile = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const downloadLink = document.createElement("a");
    downloadLink.download = `${examId}_report.csv`;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const liveCount = results.filter(r => !r.isPractice).length;

  return (
    <div className="min-h-screen bg-[#f4f6f7] p-6 text-gray-800">
      <div className="bg-[#2c3e50] text-white p-6 rounded-xl text-center mb-6 shadow">
        <h1 className="text-2xl font-bold"><i className="fas fa-user-shield"></i> Admin Dashboard | Results</h1>
        <p className="text-gray-300 text-sm mt-2">Search by Tab ID to view student answers and download reports.</p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm flex flex-wrap gap-4 items-center mb-6">
        <input
          type="text"
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          placeholder="Enter Exam Tab ID (e.g., hstuA_1)"
          className="flex-1 min-w-[250px] p-3 border-2 border-gray-300 rounded-lg outline-none focus:border-[#3498db] transition"
        />
        <button onClick={loadResults} disabled={loading} className="bg-[#3498db] hover:bg-[#2980b9] text-white px-6 py-3 rounded-lg font-bold transition flex items-center gap-2">
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>} Load Data
        </button>
        <button onClick={exportTableToCSV} disabled={results.length === 0} className="bg-[#27ae60] hover:bg-[#219150] disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold transition flex items-center gap-2">
          <i className="fas fa-file-excel"></i> Download CSV
        </button>
      </div>

      {results.length > 0 && (
        <div className="flex gap-6 mb-4 font-bold text-[#34495e]">
          <span><i className="fas fa-users"></i> Total Submissions: {results.length}</span>
          <span><i className="fas fa-file-signature"></i> Live Exam: {liveCount}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm overflow-x-auto">
          <table id="resultTable" className="w-full text-center whitespace-nowrap">
            <thead className="bg-[#34495e] text-white">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3 text-left">Student Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Score</th>
                <th className="p-3">Right</th>
                <th className="p-3">Wrong</th>
                <th className="p-3">Time</th>
                {Array.from({ length: maxQuestions }).map((_, i) => (
                  <th key={i} className="p-3">Q{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((data, index) => {
                const isPractice = data.isPractice;
                const timeStr = `${Math.floor((data.timeTaken || 0) / 60)}m ${(data.timeTaken || 0) % 60}s`;
                // Calculate rank based on live exams only. The results are already sorted.
                const currentRank = isPractice ? "-" : results.filter(r => !r.isPractice).findIndex(r => r.id === data.id) + 1;

                return (
                  <tr key={index} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-bold">{currentRank}</td>
                    <td className="p-3 text-left font-bold">{data.student || "Unknown"}</td>
                    <td className="p-3 text-left text-sm text-gray-500">{data.email || "No Email"}</td>
                    <td className="p-3">
                      {isPractice ? (
                        <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-xs font-bold">Practice</span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-bold">Live</span>
                      )}
                    </td>
                    <td className="p-3 text-emerald-600 font-bold text-base">{parseFloat(data.score || 0).toFixed(2)}</td>
                    <td className="p-3">{data.correct || 0}</td>
                    <td className="p-3">{data.wrong || 0}</td>
                    <td className="p-3 text-sm">{timeStr}</td>
                    {Array.from({ length: maxQuestions }).map((_, i) => {
                      const ans = data.userAnswers && data.userAnswers[i];
                      return (
                        <td key={i} className="p-3">
                          {ans ? (
                            <span className="inline-block w-7 h-7 leading-7 rounded bg-gray-100 font-bold text-xs">{ans}</span>
                          ) : (
                            <span className="inline-block w-7 h-7 leading-7 rounded bg-rose-50 text-rose-500 font-bold text-xs">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
