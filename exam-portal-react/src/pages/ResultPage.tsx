import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  db, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getCountFromServer 
} from '../firebase';
import { 
  ExamResultRecord, 
  RawQuestion, 
  ExamIndexItem 
} from '../types/exam';
import { 
  JSON_BASE, 
  normalizeMCQAns 
} from '../utils/formatters';
import { KaTeXRenderer } from '../utils/KaTeXRenderer';

export const ResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [resultData, setResultData] = useState<ExamResultRecord | null>(null);
  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'wrong' | 'skip' | 'correct'>('all');
  const [rankInfo, setRankInfo] = useState<{ rank: number | null; total: number; isPractice: boolean } | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Result & Questions Data
  useEffect(() => {
    if (!id) {
      setErrorMessage("রেজাল্ট আইডি পাওয়া যায়নি!");
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, "exam_results", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setErrorMessage("ডাটাবেসে এই রেজাল্ট পাওয়া যায়নি।");
          setIsLoading(false);
          return;
        }

        const data = docSnap.data() as ExamResultRecord;
        setResultData({ ...data, id: docSnap.id });

        // Load index and question json
        const [qRes, indexRes] = await Promise.all([
          fetch(JSON_BASE + data.examId + ".json").then((r) => r.json()),
          fetch(JSON_BASE + "exam-index.json").then((r) => r.json())
        ]);

        const rawQuestions: RawQuestion[] = qRes;
        rawQuestions.forEach((q, idx) => {
          q.originalIndex = idx;
        });
        const validQuestions = rawQuestions.filter(
          (q) => q["প্রশ্ন (LaTeX সহ)"] && String(q["প্রশ্ন (LaTeX সহ)"]).trim() !== ""
        );
        setQuestions(validQuestions);

        // Feedback calculation
        const examInfo = (indexRes as ExamIndexItem[]).find((e) => e["Tab ID"] === data.examId);
        if (examInfo?.Feedback) {
          try {
            const rules = JSON.parse(examInfo.Feedback);
            const totalQ = Object.keys(data.userAnswers || {}).length || validQuestions.length;
            const scorePercent = ((data.score / (totalQ * (data.markPerQuestion || 1))) * 100);
            const sortedKeys = Object.keys(rules).map(Number).sort((a, b) => b - a);
            let foundMsg = "ধন্যবাদ!";
            for (const key of sortedKeys) {
              if (scorePercent >= key) {
                foundMsg = `“${rules[key]}”`;
                break;
              }
            }
            setFeedback(foundMsg);
          } catch {
            setFeedback("ধন্যবাদ!");
          }
        }

        // Trigger celebratory confetti if score > 0
        if (data.score > 0) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        setIsLoading(false);

        // Fetch optimized Rank data (3 count queries)
        fetchRank(data);
      } catch (err: any) {
        console.error(err);
        setErrorMessage("তথ্য লোড করতে সমস্যা হয়েছে: " + err.message);
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Optimized Server-side Merit Position (Count Queries)
  const fetchRank = async (res: ExamResultRecord) => {
    try {
      if (res.isPractice) {
        setRankInfo({ rank: null, total: 0, isPractice: true });
        return;
      }

      const resultsRef = collection(db, "exam_results");
      const currentExamId = res.examId;
      const myScore = res.score || 0;
      const myTime = res.timeTaken || 0;

      // 1. Higher score count
      const higherScoreQ = query(
        resultsRef,
        where("examId", "==", currentExamId),
        where("isPractice", "==", false),
        where("score", ">", myScore)
      );

      // 2. Same score, better time count
      const sameScoreBetterTimeQ = query(
        resultsRef,
        where("examId", "==", currentExamId),
        where("isPractice", "==", false),
        where("score", "==", myScore),
        where("timeTaken", "<", myTime)
      );

      // 3. Total participants
      const totalParticipantsQ = query(
        resultsRef,
        where("examId", "==", currentExamId),
        where("isPractice", "==", false)
      );

      const [higherSnap, sameTimeSnap, totalSnap] = await Promise.all([
        getCountFromServer(higherScoreQ),
        getCountFromServer(sameScoreBetterTimeQ),
        getCountFromServer(totalParticipantsQ)
      ]);

      const myRank = higherSnap.data().count + sameTimeSnap.data().count + 1;
      setRankInfo({
        rank: myRank,
        total: totalSnap.data().count,
        isPractice: false
      });
    } catch (err) {
      console.warn("Rank fetch notice:", err);
    }
  };

  const handlePrint = () => {
    setFilterType('all');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fd] text-primary">
        <i className="fas fa-circle-notch fa-spin text-5xl mb-4"></i>
        <p className="text-gray-600 font-semibold text-sm">তোমার রেজাল্ট তৈরি হচ্ছে...</p>
      </div>
    );
  }

  if (errorMessage || !resultData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f8f9fd]">
        <div className="bg-red-50 text-danger p-6 rounded-2xl max-w-md text-center border border-red-200">
          <i className="fas fa-exclamation-triangle text-3xl mb-2"></i>
          <h3 className="font-bold text-lg mb-2">সমস্যা হয়েছে!</h3>
          <p className="text-sm mb-4">{errorMessage}</p>
          <Link to="/" className="inline-block bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg">
            হোমে ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  const userAnsMap = resultData.userAnswers || {};
  const totalAttemptedQuestions = Object.keys(userAnsMap).length || questions.length;
  const markPerQuestion = resultData.markPerQuestion || 1;
  const negativeMark = resultData.negativeMark || 0.25;
  const minutes = Math.floor((resultData.timeTaken || 0) / 60);
  const seconds = (resultData.timeTaken || 0) % 60;
  const skipCount = Math.max(0, totalAttemptedQuestions - (resultData.correct + resultData.wrong));

  // Chapter table data
  const chapterData = resultData.analysis || {};
  const subjectAggregated: Record<string, { correct: number; total: number }> = {};
  Object.values(chapterData).forEach((data) => {
    const sub = data.subject || "General";
    if (!subjectAggregated[sub]) subjectAggregated[sub] = { correct: 0, total: 0 };
    subjectAggregated[sub].correct += data.correct;
    subjectAggregated[sub].total += data.total;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-[#2d3436] pt-20 pb-16">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full h-[60px] bg-white shadow-sm flex items-center px-6 z-40 no-print">
        <Link to="/" className="text-primary font-bold text-base flex items-center gap-2 hover:opacity-90">
          <i className="fas fa-home"></i>
          <span>ড্যাশবোর্ড</span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4">
        {/* Score Card */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{resultData.examName}</h2>

          <div
            className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold mb-4 ${
              resultData.isPractice ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-success'
            }`}
          >
            {resultData.isPractice ? 'Practice Mode' : 'Live Exam'}
          </div>

          <div className="flex flex-wrap justify-center gap-3 md:gap-5 mb-4 text-xs md:text-sm bg-gray-50 py-2 px-4 rounded-full max-w-max mx-auto text-gray-600 font-semibold">
            <span>মোট প্রশ্ন: <b className="text-gray-900">{totalAttemptedQuestions}</b></span>
            <span>মোট মার্কস: <b className="text-gray-900">{(totalAttemptedQuestions * markPerQuestion).toFixed(2)}</b></span>
            <span>নেগেটিভ: <b className="text-gray-900">{negativeMark}</b></span>
          </div>

          {feedback && (
            <p className="text-indigo-600 font-bold text-sm md:text-base italic mb-3">
              {feedback}
            </p>
          )}

          {/* Score Circle */}
          <div className="w-28 h-28 border-4 border-primary rounded-full flex flex-col justify-center items-center mx-auto my-4 shadow-inner">
            <h1 className="text-3xl font-extrabold text-primary">{resultData.score.toFixed(2)}</h1>
            <small className="text-[11px] text-gray-500 font-bold">স্কোর</small>
          </div>

          {/* Merit Section */}
          <div className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-2xl border border-gray-200 my-4 text-xs md:text-sm text-gray-700 no-print">
            <i className="fas fa-trophy text-amber-500 text-2xl mb-1.5 inline-block"></i>
            {rankInfo ? (
              rankInfo.isPractice ? (
                <div>
                  আপনি এই এক্সামটি আগেই দিয়েছিলেন।<br />
                  আপনার মেরিট পজিশন <span className="text-xl font-bold text-danger">--</span> তম।
                </div>
              ) : (
                <div>
                  আপনি এ পর্যন্ত <b>{rankInfo.total}</b> জনের মধ্যে <br />
                  <span className="text-2xl font-bold text-danger">{rankInfo.rank}</span> তম হয়েছেন।
                  <br />
                  <span className="text-[11px] text-gray-400 italic">(আরো এক্সাম দিলে এটি পরিবর্তন হতে পারে)</span>
                </div>
              )
            ) : (
              <div><i className="fas fa-spinner fa-spin mr-1"></i> র‍্যাঙ্ক চেক করা হচ্ছে...</div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center my-4">
            <div className="bg-gray-50 p-3 rounded-xl border-b-4 border-success font-bold text-success text-sm">
              সঠিক: {resultData.correct}
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border-b-4 border-danger font-bold text-danger text-sm">
              ভুল: {resultData.wrong}
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border-b-4 border-warning font-bold text-amber-600 text-sm">
              স্কিপ: {skipCount}
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border-b-4 border-gray-300 font-bold text-gray-700 text-sm">
              সময়: {minutes}m {seconds}s
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-5 no-print">
            <button
              onClick={handlePrint}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs md:text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow transition"
            >
              <i className="fas fa-file-pdf"></i> পিডিএফ সেভ করুন
            </button>
            <button
              onClick={() => setIsChapterModalOpen(true)}
              className="bg-primary hover:bg-primary-hover text-white font-bold text-xs md:text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow transition"
            >
              <i className="fas fa-chart-pie"></i> এনালাইসিস
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap justify-center gap-2 bg-white p-2 rounded-full shadow-sm mb-6 max-w-max mx-auto text-xs md:text-sm font-semibold no-print">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 rounded-full transition ${
              filterType === 'all' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            সব প্রশ্ন
          </button>
          <button
            onClick={() => setFilterType('wrong')}
            className={`px-4 py-1.5 rounded-full transition ${
              filterType === 'wrong' ? 'bg-danger text-white' : 'text-danger hover:bg-red-50'
            }`}
          >
            শুধু ভুল
          </button>
          <button
            onClick={() => setFilterType('skip')}
            className={`px-4 py-1.5 rounded-full transition ${
              filterType === 'skip' ? 'bg-amber-500 text-white' : 'text-amber-600 hover:bg-amber-50'
            }`}
          >
            শুধু স্কিপ
          </button>
          <button
            onClick={() => setFilterType('correct')}
            className={`px-4 py-1.5 rounded-full transition ${
              filterType === 'correct' ? 'bg-success text-white' : 'text-success hover:bg-emerald-50'
            }`}
          >
            সঠিকগুলো
          </button>
        </div>

        {/* Questions Detailed Breakdown */}
        <div className="space-y-4">
          {questions
            .filter((q) => {
              if (!(q.originalIndex in userAnsMap)) return false;
              const myAns = userAnsMap[q.originalIndex];
              const isMcq = Boolean(q["অপশন A"] || (q["উত্তর"] && String(q["উত্তর"]).trim().length === 1));
              const rightAns = isMcq
                ? normalizeMCQAns(q["উত্তর"])
                : (q["উত্তর"] ? String(q["উত্তর"]).trim().toUpperCase() : null);

              let status: 'correct' | 'wrong' | 'skip' = 'skip';
              if (myAns !== null && myAns !== undefined && String(myAns).trim() !== "" && String(myAns).toLowerCase() !== "null") {
                if (rightAns && String(myAns).trim().toUpperCase() === rightAns) {
                  status = 'correct';
                } else {
                  status = 'wrong';
                }
              }

              if (filterType === 'all') return true;
              return status === filterType;
            })
            .map((q, idx) => {
              const myAns = userAnsMap[q.originalIndex];
              const isMcq = Boolean(q["অপশন A"] || (q["উত্তর"] && String(q["উত্তর"]).trim().length === 1));
              const rightAns = isMcq
                ? normalizeMCQAns(q["উত্তর"])
                : (q["উত্তর"] ? String(q["উত্তর"]).trim().toUpperCase() : null);

              let status: 'correct' | 'wrong' | 'skip' = 'skip';
              if (myAns !== null && myAns !== undefined && String(myAns).trim() !== "" && String(myAns).toLowerCase() !== "null") {
                if (rightAns && String(myAns).trim().toUpperCase() === rightAns) {
                  status = 'correct';
                } else {
                  status = 'wrong';
                }
              }

              return (
                <div
                  key={q.originalIndex}
                  className={`bg-white p-5 rounded-2xl shadow-sm border-l-4 transition-all print-break-inside-avoid ${
                    status === 'correct'
                      ? 'border-l-success'
                      : status === 'wrong'
                      ? 'border-l-danger'
                      : 'border-l-warning'
                  }`}
                >
                  <div className="font-bold text-gray-800 text-sm md:text-base mb-2 flex items-start justify-between gap-2">
                    <div>
                      <span>{idx + 1}. </span>
                      <KaTeXRenderer content={q["প্রশ্ন (LaTeX সহ)"]} />
                      {q.Subject && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full ml-2 font-normal">
                          {q.Subject}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded shrink-0">
                      মান: {markPerQuestion.toFixed(2)}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-3">
                    {status === 'correct' ? (
                      <span className="bg-emerald-50 text-success text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                        <i className="fas fa-check-circle"></i> সঠিক উত্তর দিয়েছেন
                      </span>
                    ) : status === 'wrong' ? (
                      <span className="bg-red-50 text-danger text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                        <i className="fas fa-times-circle"></i> ভুল উত্তর! (আপনার উত্তর: {myAns})
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                        <i className="fas fa-exclamation-circle"></i> আপনি স্কিপ করেছেন
                      </span>
                    )}
                  </div>

                  {/* Options */}
                  {isMcq ? (
                    <div className="space-y-2 mb-3">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const optContent = q[`অপশন ${opt}` as keyof RawQuestion] as string;
                        if (!optContent) return null;

                        const isCorrect = opt === rightAns;
                        const isSelected = myAns && String(myAns).trim().toUpperCase() === opt;

                        return (
                          <div
                            key={opt}
                            className={`flex items-center p-2.5 border rounded-xl text-xs md:text-sm ${
                              isCorrect
                                ? 'bg-emerald-50 border-success text-emerald-900 font-bold'
                                : isSelected && status === 'wrong'
                                ? 'bg-red-50 border-danger text-red-900 font-bold'
                                : 'border-gray-200 text-gray-700'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full border border-gray-300 mr-2.5 flex items-center justify-center text-xs font-bold shrink-0">
                              {opt}
                            </span>
                            <span className="flex-1">
                              <KaTeXRenderer content={optContent} />
                            </span>
                            {isCorrect && (
                              <i className="fas fa-check-circle text-success ml-auto"></i>
                            )}
                            {isSelected && !isCorrect && (
                              <i className="fas fa-times-circle text-danger ml-auto"></i>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2 mb-3 text-xs md:text-sm">
                      <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
                        <b>আপনার উত্তর: </b>
                        <span className={status === 'correct' ? 'text-success font-bold' : 'text-danger font-bold'}>
                          {myAns || 'উত্তর দেননি'}
                        </span>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-success rounded-xl text-emerald-900 font-bold">
                        <b>সঠিক উত্তর: </b> {q["উত্তর"] || "নির্ধারিত নেই"}
                      </div>
                    </div>
                  )}

                  {/* Explanation with KaTeX */}
                  <div className="bg-[#f0f3f6] p-3 rounded-xl border-l-4 border-primary text-xs md:text-sm text-gray-700 mt-3">
                    <strong className="text-primary flex items-center gap-1.5 mb-1">
                      <i className="fas fa-lightbulb"></i> ব্যাখ্যা:
                    </strong>
                    <div className="leading-relaxed">
                      <KaTeXRenderer
                        content={q["বিস্তারিত ব্যাখ্যা (LaTeX সহ)"] || "কোনো ব্যাখ্যা দেওয়া নেই।"}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Bottom Navigation */}
        <div className="bg-white p-6 rounded-3xl shadow-sm text-center mt-8 no-print">
          <h3 className="font-bold text-gray-800 mb-4">পরবর্তী ধাপ</h3>
          <div className="flex justify-center gap-3">
            <Link
              to="/profile"
              className="bg-gradient-to-r from-primary to-primary-light text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-xl shadow hover:opacity-90 transition flex items-center gap-2"
            >
              <i className="fas fa-user"></i> প্রোফাইল
            </Link>
            <Link
              to="/"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs md:text-sm px-6 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              <i className="fas fa-home"></i> হোম
            </Link>
          </div>
        </div>
      </div>

      {/* Chapter Breakdown Modal */}
      {isChapterModalOpen && (
        <div
          onClick={() => setIsChapterModalOpen(false)}
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">বিষয়ভিত্তিক রিপোর্ট</h3>
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-bold">
                    <th className="py-2">বিষয়</th>
                    <th className="py-2">স্কোর</th>
                    <th className="py-2">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(subjectAggregated).map(([sub, data]) => {
                    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                    return (
                      <tr key={sub}>
                        <td className="py-2.5 font-semibold text-gray-800">{sub}</td>
                        <td className="py-2.5 text-gray-600">{data.correct} / {data.total}</td>
                        <td className="py-2.5 font-bold text-primary">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
