import React, { useState, useRef } from 'react';

// --- Icons (Inline SVGs for stability) ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const AlertCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// --- Gemini API Logic ---
const apiKey = ""; // 執行環境會自動注入

const callGeminiAPI = async (text) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const systemPrompt = `你是一個專業的教學實務期末報告評分助手。請根據以下尺規評估學生報告內容，並回傳指定的 JSON 格式。
【重要規則】
1. 免除機制：若學生在「馬里蘭大學」實習，且帶領「2位(含)以上」學生，則「行政實習」向度自動免除。此時該向度強制給 Level 4 (專家級)，並註明免除。
2. 加分項目(藍字)：如「參訪心得」、「OKR專家心得」、「觀課紀錄表」等。每偵測到一項符合質量的外加項目，總分加 2 分。
3. 逐字稿分析標準：必須針對「教學語言、內容」進行具體覺察與調整。若僅陳述「很有收穫」等表層心得，該向度最高只能給 Level 2。
4. 分數計算：各向度 Level 4=22分(行政免除給22分), Level 3=18分, Level 2=14分, Level 1=10分。基礎分滿分88分，加上送的基礎底分12分=100分。加分項直接加在 bonusScore。總分 totalScore = baseScore + bonusScore。

尺規向度(ID 1-4)：
1. 教學實習與言談分析
2. 行政實習與場域觀察
3. OKR 專題企劃邏輯
4. 講座反饋與專業論述`;

  const schema = {
    type: "OBJECT",
    properties: {
      studentName: { type: "STRING", description: "學生姓名，未提供則填'未提供'" },
      studentId: { type: "STRING", description: "學號，未提供則填'未提供'" },
      internshipUnit: { type: "STRING", description: "實習單位" },
      studentCount: { type: "INTEGER", description: "帶領學生數，未提及預設為1" },
      baseScore: { type: "INTEGER" },
      bonusScore: { type: "INTEGER" },
      totalScore: { type: "INTEGER" },
      adminExempted: { type: "BOOLEAN", description: "是否免除行政實習(馬里蘭大學且學生數>=2)" },
      adminExemptReason: { type: "STRING", description: "免除原因說明，若無免除填空字串" },
      detectedBonuses: { type: "ARRAY", items: { type: "STRING" } },
      dimensions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "INTEGER", description: "向度 1 到 4" },
            title: { type: "STRING", description: "向度標題" },
            level: { type: "INTEGER", description: "等級 1 到 4" },
            levelName: { type: "STRING", description: "如：專家級、精熟級" },
            aiComment: { type: "STRING", description: "AI 評語，請引用報告內文佐證" },
            suggestion: { type: "STRING", description: "給予學生的具體改進建議" }
          }
        }
      }
    },
    required: ["studentName", "studentId", "internshipUnit", "studentCount", "baseScore", "bonusScore", "totalScore", "adminExempted", "adminExemptReason", "detectedBonuses", "dimensions"]
  };

  const payload = {
    contents: [{ parts: [{ text }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json", responseSchema: schema }
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  let lastError;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (error) {
      lastError = error;
      if (i < 4) await new Promise(res => setTimeout(res, delays[i]));
    }
  }
  throw lastError;
};

// --- Rubric Data ---
const rubricData = [
  {
    title: "一、逐字稿分析與教學反思",
    focus: "教學語言覺察、內容調整策略",
    levels: [
      { level: 4, name: "專家級 (Exemplary)", desc: "精準覺察教學語言與內容，提出具體調整策略。能深度解構師生互動與提問技巧。" },
      { level: 3, name: "精熟級 (Proficient)", desc: "邏輯清晰說明教學狀況與語言使用，具備基本反思與未來改進方向。" },
      { level: 2, name: "基礎級 (Developing)", desc: "流於「很有收穫/有趣」等表層感想，缺乏對教學語言與實質內容的覺察。" },
      { level: 1, name: "待加強 (Beginning)", desc: "無逐字稿分析，或內容完全與實際教學語言脫節。" }
    ]
  },
  {
    title: "二、行政實習與場域觀察",
    focus: "機構運作洞察、行政支援關聯",
    levels: [
      { level: 4, name: "專家級 (Exemplary)", desc: "深刻觀察華語機構運作邏輯，探討行政支援與教學成效的交互關係。" },
      { level: 3, name: "精熟級 (Proficient)", desc: "具體說明行政實習工作內容，並從中獲得實務經驗與心得。" },
      { level: 2, name: "基礎級 (Developing)", desc: "僅流水帳條列交辦的行政任務，缺乏個人體會與歸納。" },
      { level: 1, name: "待加強 (Beginning)", desc: "心得字數嚴重不足，或內容空泛敷衍。" }
    ]
  },
  {
    title: "三、OKR 專題企劃邏輯",
    focus: "目標對齊、指標量化、執行可行性",
    levels: [
      { level: 4, name: "專家級 (Exemplary)", desc: "目標(O)具挑戰性，關鍵結果(KR)完全可量化且緊密扣合，具備極高可行性。" },
      { level: 3, name: "精熟級 (Proficient)", desc: "OKR框架完整，目標明確，KR具合理評估標準，具備一定執行力。" },
      { level: 2, name: "基礎級 (Developing)", desc: "OKR設定模糊，KR難以客觀衡量(如:僅寫提升能力)。" },
      { level: 1, name: "待加強 (Beginning)", desc: "未掌握OKR核心精神，目標與結果混淆，結構散漫。" }
    ]
  },
  {
    title: "四、講座反饋與專業論述",
    focus: "跨域統整、學術用語、排版結構",
    levels: [
      { level: 4, name: "專家級 (Exemplary)", desc: "演講心得能互相參照或與經驗統整。排版極具視覺引導性，用語專業精確。" },
      { level: 3, name: "精熟級 (Proficient)", desc: "能準確摘要演講核心並提出反饋。格式標準整齊，段落分明。" },
      { level: 2, name: "基礎級 (Developing)", desc: "僅為上課筆記貼上，缺乏個人觀點。排版稍顯混亂。" },
      { level: 1, name: "待加強 (Beginning)", desc: "偏離講者主題，結構鬆散，缺乏基本文書處理能力。" }
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('assessment');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [inputText, setInputText] = useState("");
  const [evalResult, setEvalResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  // 新增：處理檔案上傳的 reference
  const fileInputRef = useRef(null);

  const handleEvaluate = async () => {
    if (!inputText.trim()) {
      setErrorMsg("請先輸入或貼上報告文字內容！");
      return;
    }
    setIsEvaluating(true);
    setErrorMsg("");
    setShowResult(false);
    
    try {
      const result = await callGeminiAPI(inputText);
      setEvalResult(result);
      setShowResult(true);
    } catch (err) {
      setErrorMsg("AI 分析失敗，請檢查網路連線或稍後再試。錯誤：" + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 新增：處理使用者選取檔案的邏輯
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 檢查檔案類型
    if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
      // 提示：因為是純前端原型，PDF 暫時提醒
      setErrorMsg("📌 提示：正式部署版將串接 PDF.js 自動擷取內文。目前的體驗版本，請直接複製 PDF 內的文字貼上至下方預覽框中進行評估。");
      // 清空 input，允許重複選取同一個檔案
      event.target.value = '';
      return;
    }

    if (file.type === "text/plain" || file.name.endsWith('.txt')) {
      // 若是純文字檔，直接讀取內容並貼上
      const reader = new FileReader();
      reader.onload = (e) => {
        setInputText(e.target.result);
        setErrorMsg(""); // 清除錯誤訊息
      };
      reader.readAsText(file);
    } else {
      setErrorMsg("請上傳 .txt 純文字檔，或將報告內容直接複製貼上。");
    }
    
    // 清空 input，允許重複選取同一個檔案
    event.target.value = '';
  };

  // 觸發隱藏的 input file
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const renderRubric = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <div className="mt-1"><InfoIcon /></div>
        <div>
          <h4 className="font-semibold text-blue-900">核心評分原則提醒</h4>
          <p className="text-sm text-blue-800 mt-1">
            本尺規特別強調<strong>「言談分析」</strong>的專業度。逐字稿分析必須針對教學語言、內容進行具體的調整與覺察；若僅陳述「很有收穫、學生很可愛」等表層心得，將直接判定為基礎級(Level 2)以下。
          </p>
        </div>
      </div>

      {rubricData.map((dim, idx) => (
        <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 text-lg">{dim.title}</h3>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full mt-1 inline-block">觀察重點：{dim.focus}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            {dim.levels.map((lvl, lIdx) => (
              <div key={lIdx} className={`p-4 ${lvl.level === 4 ? 'bg-green-50/30' : ''}`}>
                <div className={`text-sm font-bold mb-2 ${
                  lvl.level === 4 ? 'text-green-600' : 
                  lvl.level === 3 ? 'text-blue-600' : 
                  lvl.level === 2 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  Level {lvl.level} {lvl.name.split(' ')[0]}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{lvl.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderAssessment = () => (
    <div className="space-y-6">
      {/* Upload Area */}
      {!showResult && (
        <>
          {/* 隱藏的檔案上傳輸入框 */}
          <input 
            type="file" 
            accept=".txt,.pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <div 
            onClick={triggerFileUpload}
            className="border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 p-8 text-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition"
          >
            <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm mb-3">
              <UploadIcon />
            </div>
            <h3 className="font-bold text-blue-900 mb-1">點擊上傳期末報告 (支援 .txt 測試)</h3>
            <p className="text-sm text-blue-600 mb-4">系統將自動提取文字內容進行 AI 評估</p>
            <button 
              onClick={(e) => { e.stopPropagation(); triggerFileUpload(); }}
              className="bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 pointer-events-none"
            >
              選擇檔案
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">內容預覽 (檔案內容或手動貼上)</label>
            <textarea 
              className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="請貼上學生報告內容，或上傳文字檔後會自動顯示於此..."
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
            />
            {/* Quick test buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setInputText("我是張同學，學號114000123。這學期去馬里蘭大學實習，帶了2位美國學生。逐字稿分析中我發現自己在第5到第8行連續使用了三次封閉式提問，導致學生只能回答是或否，未來應調整為引導式。另外我有去參訪國語中心，也聽了陳志洪教授的OKR講座，心得如下...")
                  setErrorMsg("");
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-gray-600"
              >
                帶入測試範例 (符合免除條件)
              </button>
            </div>
            {errorMsg && (
              <div className={`text-sm bg-blue-50 p-3 rounded-lg border font-medium mt-2 ${errorMsg.includes('📌') ? 'text-blue-800 border-blue-200' : 'text-red-600 border-red-200 bg-red-50'}`}>
                {errorMsg}
              </div>
            )}
          </div>

          <button 
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition flex justify-center items-center gap-2 disabled:bg-blue-400"
          >
            {isEvaluating ? <><SpinnerIcon /> AI 深度分析中...</> : '開始智能評估'}
          </button>
        </>
      )}

      {/* Result Dashboard */}
      {showResult && evalResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Header Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{evalResult.studentName} ({evalResult.studentId})</h2>
                <p className="text-gray-500 mt-1">實習單位：{evalResult.internshipUnit} (授課對象：{evalResult.studentCount}位學生)</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-blue-600">{evalResult.totalScore}<span className="text-lg text-gray-400 font-normal">/100</span></div>
                <div className="text-sm text-green-600 font-medium mt-1">原始分 {evalResult.baseScore} + 藍字加分 {evalResult.bonusScore}</div>
              </div>
            </div>
          </div>

          {/* Dynamic Badges / Notices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Exemption Notice */}
            {evalResult.adminExempted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <div className="mt-0.5"><CheckCircleIcon /></div>
                <div>
                  <h4 className="font-bold text-green-800">行政實習免除</h4>
                  <p className="text-sm text-green-700 mt-1">
                    系統偵測：{evalResult.adminExemptReason || '符合免除行政實習報告規範，此向度自動採計滿分。'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Bonus Points */}
            {evalResult.detectedBonuses && evalResult.detectedBonuses.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <div className="mt-0.5"><StarIcon /></div>
                <div>
                  <h4 className="font-bold text-amber-800">專業自主學習加分</h4>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    {evalResult.detectedBonuses.map((bonus, idx) => (
                      <li key={idx}>✅ 已偵測：{bonus} (+2分)</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {!evalResult.adminExempted && (!evalResult.detectedBonuses || evalResult.detectedBonuses.length === 0) && (
              <div className="col-span-2 text-sm text-gray-400 italic">
                無特殊免除條件或額外加分項目。
              </div>
            )}
          </div>

          {/* AI Rubric Details */}
          <h3 className="font-bold text-xl text-gray-800 border-b pb-2 pt-4">各向度評估詳情</h3>
          <div className="space-y-4">
            
            {evalResult.dimensions.map((dim, idx) => (
              <div key={idx} className={`border rounded-lg bg-white overflow-hidden ${dim.id === 2 && evalResult.adminExempted ? 'border-green-200 opacity-80' : 'border-gray-200'}`}>
                <div className={`p-4 border-b flex justify-between items-center ${dim.id === 2 && evalResult.adminExempted ? 'bg-green-50 border-green-100' : 'bg-gray-50'}`}>
                  <h4 className="font-bold text-gray-800">{dim.id}. {dim.title || (dim.id === 1 ? '教學實習與言談分析' : dim.id === 2 ? '行政實習與場域觀察' : dim.id === 3 ? 'OKR 專題企劃邏輯' : '講座反饋與專業論述')}</h4>
                  <span className={`${dim.level === 4 ? 'bg-green-100 text-green-800' : dim.level === 3 ? 'bg-blue-100 text-blue-800' : dim.level === 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'} px-3 py-1 rounded text-sm font-bold`}>
                    {dim.id === 2 && evalResult.adminExempted ? '免除 (計滿分)' : `Level ${dim.level} ${dim.levelName}`}
                  </span>
                </div>
                {!(dim.id === 2 && evalResult.adminExempted) && (
                  <div className="p-4 text-sm text-gray-700 space-y-2">
                    <p><strong>💡 AI 評語：</strong>{dim.aiComment}</p>
                    {dim.suggestion && <p className="text-blue-700"><strong>🎯 給學生的改進建議：</strong>{dim.suggestion}</p>}
                  </div>
                )}
              </div>
            ))}

          </div>

          {/* External Tasks Reminders */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mt-8">
            <div className="mt-0.5"><AlertCircleIcon /></div>
            <div>
              <h4 className="font-bold text-red-800">⚠️ 外部任務人工確認提醒</h4>
              <p className="text-sm text-red-700 mt-1 mb-2">以下項目 AI 無法自動查核，請教師手動確認：</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-red-900 font-medium">
                  <input type="checkbox" className="rounded text-red-600 focus:ring-red-500" /> Padlet 報告已上傳
                </label>
                <label className="flex items-center gap-2 text-sm text-red-900 font-medium">
                  <input type="checkbox" className="rounded text-red-600 focus:ring-red-500" /> Padlet 評論 3 則
                </label>
                <label className="flex items-center gap-2 text-sm text-red-900 font-medium">
                  <input type="checkbox" className="rounded text-red-600 focus:ring-red-500" /> 期末 OKR 問卷填寫
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-4">
            <button 
              onClick={() => {setShowResult(false); setInputText("");}}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              重新評估下一份報告
            </button>
            <button className="px-6 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 font-medium transition">
              匯出成績評語 (CSV)
            </button>
          </div>

        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-black text-blue-900 tracking-tight">
            114春教學實務實習 - 智能評量助手
          </h1>
          <p className="text-gray-500 mt-2">結合負責 AI 文本分析與動態尺規評量</p>
        </header>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('assessment')}
              className={`flex-1 py-4 font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-colors ${activeTab === 'assessment' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <UploadIcon /> 報告評估與分析
            </button>
            <button 
              onClick={() => setActiveTab('rubric')}
              className={`flex-1 py-4 font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-colors ${activeTab === 'rubric' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <BookOpenIcon /> 檢視評量規準 (Rubric)
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 md:p-8">
            {activeTab === 'assessment' ? renderAssessment() : renderRubric()}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 text-sm text-gray-400">
          <p>Teaching Practice Internship Assessment Tool (Prototype V1)</p>
          <p className="mt-1">Powered by 智能評量邏輯</p>
        </footer>

      </div>
    </div>
  );
}