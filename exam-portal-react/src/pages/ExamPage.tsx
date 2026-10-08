import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  auth, 
  db, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from '../firebase';
import { 
  ExamParsedConfig, 
  RawQuestion, 
  ExamIndexItem, 
  ChapterAnalysisItem 
} from '../types/exam';
import { 
  JSON_BASE, 
  engToBanglaNumber, 
  normalizeMCQAns, 
  cleanData 
} from '../utils/formatters';
import { KaTeXRenderer } from '../utils/KaTeXRenderer';

export const ExamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tabId = id || "Phy_1";

  // States
  const [examConfig, setExamConfig] = useState<ExamParsedConfig | null>(null);
  const [allFetchedQuestions, setAllFetchedQuestions] = useState<RawQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<RawQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  
  // Modals & Navigation
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectedSubjectOption, setSelectedSubjectOption] = useState<string>('math');
  const [selectionGroupChoices, setSelectionGroupChoices] = useState<Record<number, string>>({});
  
  // Timer & Loading
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Anti-cheat key & right-click prevention
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === 'U')
      ) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Prevent accidental back/refresh during active exam
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting && filteredQuestions.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting, filteredQuestions]);

  // Auth state check
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load Exam Config & Questions
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch exam index
        const indexRes = await fetch(JSON_BASE + "exam-index.json");
        const indexData: ExamIndexItem[] = await indexRes.json();
        const exam = indexData.find((e) => e["Tab ID"] === tabId);

        let parsedConf: ExamParsedConfig = {
          time: 30,
          neg: 0.25,
          totalMarks: null,
          name: "Exam",
          type: "exam",
          config: null,
          optional: false,
          fixed: [],
          features: ""
        };

        if (exam) {
          const parsedConfigObj = exam.Config ? JSON.parse(exam.Config) : null;
          parsedConf = {
            time: Number(exam["Total Time"]) || 30,
            neg: exam["Negative Mark"] !== undefined && exam["Negative Mark"] !== "" ? Number(exam["Negative Mark"]) : 0.25,
            totalMarks: exam["Total Marks"] ? Number(exam["Total Marks"]) : null,
            name: exam["Exam Name"] || "Exam",
            type: exam.Type ? String(exam.Type).toLowerCase().trim() : 'exam',
            config: parsedConfigObj,
            optional: Boolean(parsedConfigObj?.optional),
            fixed: parsedConfigObj?.fixed || [],
            features: exam.Features || ''
          };
          setExamConfig(parsedConf);
        }

        // 2. Fetch raw questions
        const qRes = await fetch(JSON_BASE + tabId + ".json");
        let rawQ: RawQuestion[] = await qRes.json();

        rawQ.forEach((q, idx) => {
          q.originalIndex = idx;
        });

        // Filter valid questions
        rawQ = rawQ.filter(
          (q) => q["প্রশ্ন (LaTeX সহ)"] && String(q["প্রশ্ন (LaTeX সহ)"]).trim() !== ""
        );

        setAllFetchedQuestions(rawQ);
        setIsLoading(false);
        setShowIntroModal(true);
      } catch (err: any) {
        setIsLoading(false);
        Swal.fire('Error', "প্রশ্ন লোড করতে সমস্যা হয়েছে: " + err.message, 'error');
      }
    };

    loadData();
  }, [tabId]);

  // Helper: Group questions by Subject
  const groupQuestions = (questions: RawQuestion[]) => {
    const grouped: Record<string, RawQuestion[]> = {};
    questions.forEach((q) => {
      const sub = q.Subject || "General";
      if (!grouped[sub]) grouped[sub] = [];
      grouped[sub].push(q);
    });
    let result: RawQuestion[] = [];
    for (const sub in grouped) {
      result = result.concat(grouped[sub]);
    }
    return result;
  };

  const isMCQ = (q: RawQuestion) => {
    if (q["অপশন A"]) return true;
    if (q["উত্তর"] && String(q["উত্তর"]).trim().length === 1) return true;
    return false;
  };

  // Start Timer
  const startTimer = (minutes: number) => {
    startTimeRef.current = new Date();
    setTimeLeft(minutes * 60);
  };

  // Timer Tick
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Handle proceed from Intro Modal
  const proceedFromIntro = () => {
    setShowIntroModal(false);
    if (!examConfig) return;

    if (examConfig.optional) {
      setShowSubjectModal(true);
    } else if (examConfig.config && examConfig.config.mode === 'selection') {
      setShowSelectionModal(true);
    } else {
      const grouped = groupQuestions(allFetchedQuestions);
      setFilteredQuestions(grouped);
      startTimer(examConfig.time);
    }
  };

  // Confirm Optional Subject (Math / Biology)
  const confirmOptionalSubjects = () => {
    if (!selectedSubjectOption) {
      Swal.fire('সতর্কতা', "দয়া করে গণিত অথবা জীববিজ্ঞান সিলেক্ট করুন!", 'warning');
      return;
    }

    setShowSubjectModal(false);

    const finalQuestions = allFetchedQuestions.filter((q) => {
      const sub = q.Subject ? String(q.Subject).toLowerCase().trim() : 'general';
      if (examConfig?.fixed && examConfig.fixed.map((s) => s.toLowerCase()).includes(sub)) return true;
      if (sub === 'general') return true;
      return sub === selectedSubjectOption;
    });

    const grouped = groupQuestions(finalQuestions);
    setFilteredQuestions(grouped);
    if (examConfig) startTimer(examConfig.time);
  };

  // Confirm Custom Selection
  const confirmCustomSelection = () => {
    const selectedGroupVals = Object.values(selectionGroupChoices).map((s) => s.trim().toUpperCase());
    const fixedVals = (examConfig?.config?.fixed || []).map((s) => s.trim().toUpperCase());
    const totalAllowed = [...fixedVals, ...selectedGroupVals];

    const finalQuestions = allFetchedQuestions.filter((q) => {
      const qSub = q.Subject ? String(q.Subject).trim().toUpperCase() : "";
      if (!qSub) return false;
      return totalAllowed.includes(qSub);
    });

    setFilteredQuestions(groupQuestions(finalQuestions));
    setShowSelectionModal(false);
    if (examConfig) startTimer(examConfig.time);
  };

  // Handle Option Lock (Once locked, cannot be changed)
  const handleLockAnswer = (qIdx: number, opt: string) => {
    if (selectedAnswers[qIdx] !== undefined) return; // Already locked!
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: opt
    }));
  };

  // Handle Text Answer
  const handleTextAnswerChange = (qIdx: number, val: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: val
    }));
  };

  // Progress calculation
  const totalCount = filteredQuestions.length;
  const answeredCount = filteredQuestions.filter((q) => {
    const ans = selectedAnswers[q.originalIndex];
    return ans !== undefined && ans !== null && String(ans).trim() !== "";
  }).length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Jump to specific question
  const scrollToQuestion = (idx: number) => {
    Swal.close();
    const el = document.getElementById(`q-card-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-red-400');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-red-400');
      }, 2000);
    }
  };

  // Attempt submit (checks unanswered questions)
  const attemptSubmit = () => {
    const skippedIndexes: number[] = [];

    filteredQuestions.forEach((q, idx) => {
      const ans = selectedAnswers[q.originalIndex];
      if (ans === undefined || ans === null || String(ans).trim() === "") {
        skippedIndexes.push(idx);
      }
    });

    if (skippedIndexes.length > 0) {
      const skippedButtonsHtml = skippedIndexes
        .map(
          (i) =>
            `<button onclick="window.jumpToQuestion(${i})" class="bg-amber-100 hover:bg-rose-500 hover:text-white text-rose-600 font-bold px-2 py-1 m-1 rounded text-xs transition">${engToBanglaNumber(i + 1)}</button>`
        )
        .join('');

      (window as any).jumpToQuestion = (i: number) => scrollToQuestion(i);

      Swal.fire({
        title: 'সতর্কতা!',
        html: `আপনি <b>${engToBanglaNumber(skippedIndexes.length)}টি</b> প্রশ্নের উত্তর দেননি।<br>
               <div style="margin:10px 0; font-size:13px; color:#666;">উত্তর দিতে চাইলে নিচের নম্বরে ক্লিক করুন:</div>
               <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:4px; margin-bottom:12px;">
                   ${skippedButtonsHtml}
               </div>
               আপনি কি এগুলো <b>ফাঁকা রেখেই</b> সাবমিট করতে চান?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d63031',
        cancelButtonColor: '#6c5ce7',
        confirmButtonText: 'হ্যাঁ, সাবমিট করুন',
        cancelButtonText: 'না, উত্তর দিব'
      }).then((result) => {
        if (result.isConfirmed) {
          handleSubmitExam();
        }
      });
    } else {
      Swal.fire({
        title: 'জমা দিতে চান?',
        text: 'সব উত্তর দেওয়া হয়েছে। সাবমিট করার পর আর পরিবর্তন করা যাবে না।',
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#00b894',
        cancelButtonColor: '#d63031',
        confirmButtonText: 'হ্যাঁ, জমা দিন',
        cancelButtonText: 'বাতিল'
      }).then((result) => {
        if (result.isConfirmed) {
          handleSubmitExam();
        }
      });
    }
  };

  // Submit Exam to Firestore
  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let secureScore = 0;
      let secureCorrect = 0;
      let secureWrong = 0;
      const chapterAnalysis: Record<string, ChapterAnalysisItem> = {};
      const userAnswersRecord: Record<number, string | null> = {};

      const timeTaken = startTimeRef.current
        ? Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)
        : 0;

      const totalQuestions = filteredQuestions.length;
      const totalMarks = examConfig?.totalMarks || totalQuestions;
      const markPerQuestion = totalQuestions > 0 ? totalMarks / totalQuestions : 1;
      const negativeMark = examConfig?.neg !== undefined ? examConfig.neg : 0.25;

      filteredQuestions.forEach((q) => {
        const qIdx = q.originalIndex;
        const mcq = isMCQ(q);
        const rightAns = mcq
          ? normalizeMCQAns(q["উত্তর"])
          : (q["উত্তর"] ? String(q["উত্তর"]).trim().toUpperCase() : null);

        const ch = q.Chapter || q["অধ্যায়"] || "General";
        const sub = q.Subject ? String(q.Subject).trim() : "General";

        if (!chapterAnalysis[ch]) {
          chapterAnalysis[ch] = { correct: 0, total: 0, subject: sub };
        }
        chapterAnalysis[ch].total++;

        const selectedVal = selectedAnswers[qIdx] || null;
        userAnswersRecord[qIdx] = selectedVal;

        if (selectedVal && rightAns) {
          if (String(selectedVal).trim().toUpperCase() === rightAns) {
            secureScore += markPerQuestion;
            secureCorrect++;
            chapterAnalysis[ch].correct++;
          } else {
            secureScore -= negativeMark;
            secureWrong++;
          }
        }
      });

      let isPracticeMode = false;
      let userEmail = "guest";
      let userName = "Guest";

      if (currentUser) {
        userEmail = currentUser.email || "guest";
        userName = currentUser.displayName || "Student";

        const checkQuery = query(
          collection(db, "exam_results"),
          where("email", "==", currentUser.email),
          where("examId", "==", tabId)
        );
        const checkSnapshot = await getDocs(checkQuery);
        if (!checkSnapshot.empty || examConfig?.type === 'practice') {
          isPracticeMode = true;
        }
      } else {
        isPracticeMode = true;
      }

      const rawData = {
        examName: examConfig?.name || "Exam",
        examId: tabId,
        score: secureScore,
        correct: secureCorrect,
        wrong: secureWrong,
        timeTaken,
        markPerQuestion,
        negativeMark,
        student: userName,
        email: userEmail,
        analysis: chapterAnalysis,
        userAnswers: userAnswersRecord,
        isPractice: isPracticeMode
      };

      const finalRecord = {
        ...cleanData(rawData),
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "exam_results"), finalRecord);
      navigate(`/result/${docRef.id}`);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setIsSubmitting(false);
      Swal.fire('Error', 'রেজাল্ট সেভ করা যায়নি: ' + err.message, 'error');
    }
  };

  // Formatter for Minutes : Seconds
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-[#2d3436] pb-28">
      {/* Sticky Top Navbar */}
      <div className="bg-white px-4 py-2.5 shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-2">
          <div>
            <h1 className="font-bold text-base md:text-lg text-gray-800">
              {examConfig?.name || "Exam Loading..."}
            </h1>
            <div className="text-xs text-gray-500">
              {currentUser ? (
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px] mr-1">
                  Logged in
                </span>
              ) : (
                <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full text-[11px] mr-1">
                  Guest Mode
                </span>
              )}
              {currentUser?.displayName || currentUser?.email || "Guest"}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto">
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1">
            <span>Progress: {progressPercent}%</span>
            <span>{engToBanglaNumber(answeredCount)} / {engToBanglaNumber(totalCount)} উত্তর দেওয়া হয়েছে</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 mt-6">
        {isLoading && (
          <div className="text-center py-20 text-primary">
            <i className="fas fa-circle-notch fa-spin text-4xl mb-3"></i>
            <p className="text-gray-600 font-semibold text-sm">
              তোমার ইন্টারনেট স্পিড নির্ভর করে, প্রশ্নপত্র লোড হচ্ছে...
            </p>
          </div>
        )}

        {!isLoading && filteredQuestions.length === 0 && !showIntroModal && (
          <div className="text-center py-20 text-gray-500">
            <p>প্রশ্ন পাওয়া যায়নি।</p>
          </div>
        )}

        {/* Question Cards */}
        <div className="space-y-5">
          {filteredQuestions.map((q, index) => {
            const qIdx = q.originalIndex;
            const mcq = isMCQ(q);
            const chosenAnswer = selectedAnswers[qIdx];
            const isLocked = chosenAnswer !== undefined;

            return (
              <div
                key={qIdx}
                id={`q-card-${index}`}
                className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-2 border-transparent transition-all"
              >
                {/* Question Title */}
                <div className="text-base md:text-lg font-semibold text-gray-800 mb-4 flex items-start gap-2">
                  <span className="text-primary font-bold">{index + 1}.</span>
                  <div className="flex-1">
                    <KaTeXRenderer content={q["প্রশ্ন (LaTeX সহ)"]} />
                    {q.Subject && (
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full ml-2 font-normal">
                        {q.Subject}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Options / Input */}
                {!mcq ? (
                  <input
                    type="text"
                    value={chosenAnswer || ''}
                    onChange={(e) => handleTextAnswerChange(qIdx, e.target.value)}
                    placeholder="উত্তর দিন..."
                    className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:border-primary outline-none transition"
                  />
                ) : (
                  <div className="space-y-2.5">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                      const optContent = q[`অপশন ${opt}` as keyof RawQuestion] as string;
                      if (!optContent) return null;

                      const isSelected = chosenAnswer === opt;
                      const isOtherDisabled = isLocked && !isSelected;

                      return (
                        <div
                          key={opt}
                          onClick={() => handleLockAnswer(qIdx, opt)}
                          className={`flex items-center p-3 border rounded-xl transition ${
                            isLocked
                              ? isSelected
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold cursor-default'
                                : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed text-gray-500'
                              : 'border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer text-gray-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 flex items-center justify-center transition ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                          </span>
                          <span className="flex-1 text-sm md:text-base">
                            <KaTeXRenderer content={optContent} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Bar (Timer & Submit) */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl flex justify-between items-center z-40 border border-gray-200">
        <div className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>⏱️</span>
          <span>{formatTimer(timeLeft)}</span>
        </div>
        <button
          onClick={attemptSubmit}
          className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-2 rounded-full text-sm shadow transition"
        >
          জমা দিন
        </button>
      </div>

      {/* Submitting Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center">
          <i className="fas fa-circle-notch fa-spin text-5xl text-primary mb-4"></i>
          <p className="text-lg font-bold text-primary animate-pulse">ফলাফল তৈরি হচ্ছে...</p>
        </div>
      )}

      {/* Intro Modal */}
      {showIntroModal && examConfig && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-md text-left shadow-2xl animate-scale-up">
            <h2 className="text-xl font-bold text-primary mb-3">{examConfig.name}</h2>
            <div className="bg-primary/10 p-4 rounded-xl mb-4 text-sm space-y-1.5 text-gray-700">
              <p><i className="fas fa-clock text-primary mr-1"></i> <b>সময়:</b> {examConfig.time} মিনিট</p>
              <p><i className="fas fa-star text-primary mr-1"></i> <b>পূর্ণমান:</b> {examConfig.totalMarks || allFetchedQuestions.length}</p>
              <p className="text-danger"><i className="fas fa-minus-circle mr-1"></i> <b>নেগেটিভ মার্ক:</b> {examConfig.neg}</p>
            </div>

            {examConfig.features && (
              <div className="mb-5 text-sm text-gray-600">
                <h4 className="font-bold text-gray-800 mb-1"><i className="fas fa-list-ul mr-1"></i> এক্সাম ফিচারস:</h4>
                <p className="whitespace-pre-line text-xs">{examConfig.features}</p>
              </div>
            )}

            <button
              onClick={proceedFromIntro}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <span>এক্সাম শুরু করি</span>
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Optional Subject Selection Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md text-left shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-primary mb-2">বিষয় নির্বাচন করুন</h3>
            <p className="text-xs text-gray-600 mb-1">এই পরীক্ষায় <strong>পদার্থ, রসায়ন, বাংলা ও ইংরেজি</strong> বাধ্যতামূলক।</p>
            <p className="text-xs text-gray-600 mb-4">বাকিদের মধ্যে যেকোনো <strong>১টি</strong> বেছে নিন:</p>

            <div className="space-y-2.5 mb-5">
              <label className="flex items-center p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="optSub"
                  value="math"
                  checked={selectedSubjectOption === 'math'}
                  onChange={() => setSelectedSubjectOption('math')}
                  className="mr-3"
                />
                <span className="font-semibold text-sm">গণিত (Math)</span>
              </label>
              <label className="flex items-center p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="optSub"
                  value="biology"
                  checked={selectedSubjectOption === 'biology'}
                  onChange={() => setSelectedSubjectOption('biology')}
                  className="mr-3"
                />
                <span className="font-semibold text-sm">জীববিজ্ঞান (Biology)</span>
              </label>
            </div>

            <button
              onClick={confirmOptionalSubjects}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition"
            >
              পরীক্ষা শুরু করুন
            </button>
          </div>
        </div>
      )}

      {/* Advanced Group Selection Modal */}
      {showSelectionModal && examConfig?.config?.groups && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md text-left shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-primary mb-3">বিষয় নির্বাচন</h3>

            {examConfig.config.fixed && (
              <div className="mb-3 text-xs text-gray-700">
                <span className="font-bold">বাধ্যতামূলক: </span>
                {examConfig.config.fixed.join(', ')}
              </div>
            )}

            <div className="space-y-3 mb-5 max-h-60 overflow-y-auto">
              {examConfig.config.groups.map((group, gIdx) => (
                <div key={gIdx} className="border border-gray-200 p-3 rounded-xl text-xs">
                  <p className="font-bold text-gray-700 mb-2">গ্রুপ {gIdx + 1} থেকে বাছাই করুন:</p>
                  <div className="space-y-1.5">
                    {group.map((sub) => (
                      <label key={sub} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`grp_${gIdx}`}
                          value={sub}
                          checked={selectionGroupChoices[gIdx] === sub}
                          onChange={() => setSelectionGroupChoices((prev) => ({ ...prev, [gIdx]: sub }))}
                        />
                        <span>{sub}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={confirmCustomSelection}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition"
            >
              শুরু করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
