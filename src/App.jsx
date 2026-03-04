import React, { useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseConfig } from './firebaseConfig';

// ✅ Firebase 초기화
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ GitHub Pages/일반 환경에서 쓸 앱 ID(파이어스토어 경로용)
//   - 저장소가 여러 개여도 충돌을 줄이기 위해 repo명 기반으로 자동 생성
const appId = (() => {
  const repo = (import.meta.env.VITE_APP_ID || '').trim();
  if (repo) return repo.replace(/[^a-zA-Z0-9_-]/g, '-');
  // 기본값
  return 'iso45001-kpmc-system';
})();

const initialIsoData = [
  { id: '4', title: '4. 조직의 상황 (Context)', documents: [{ id: '4.3', title: '적용범위', requirements: '시스템 적용범위를 명시', content: '', status: 'not_started' }] },
  { id: '5', title: '5. 리더십 및 근로자 참여', documents: [{ id: '5.2', title: '안전보건 방침', requirements: '경영진의 의지 표명', content: '', status: 'not_started' }] },
];

function make6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function App() {
  const [user, setUser] = useState(null);

  const [mode, setMode] = useState('login'); // login | admin | system
  const [toast, setToast] = useState('');

  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);

  const [loginCode, setLoginCode] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');

  const [systemData, setSystemData] = useState(initialIsoData);
  const [activeClauseId, setActiveClauseId] = useState(initialIsoData[0].id);
  const [activeDocId, setActiveDocId] = useState(initialIsoData[0].documents[0].id);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // 1) 익명 로그인
  useEffect(() => {
    (async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error(e);
        showToast('Firebase 인증 실패: .env.local 설정을 확인하세요.');
      }
    })();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // 2) 회사 목록 구독
  useEffect(() => {
    if (!user) return;
    const compRef = collection(db, 'artifacts', appId, 'public', 'data', 'companies');
    return onSnapshot(compRef, (snap) => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // 3) 회사별 시스템 데이터 구독
  useEffect(() => {
    if (!user || !currentCompany) return;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', currentCompany.id);
    return onSnapshot(ref, (snap) => {
      if (snap.exists() && snap.data()?.systemData) setSystemData(snap.data().systemData);
      else setSystemData(initialIsoData);
    });
  }, [user, currentCompany]);

  const activeClause = useMemo(
    () => systemData.find(c => c.id === activeClauseId),
    [systemData, activeClauseId]
  );
  const activeDoc = useMemo(
    () => activeClause?.documents?.find(d => d.id === activeDocId),
    [activeClause, activeDocId]
  );

  const updateDoc = (clauseId, docId, patch) => {
    setSystemData(prev => prev.map(c => {
      if (c.id !== clauseId) return c;
      return {
        ...c,
        documents: c.documents.map(d => d.id === docId ? { ...d, ...patch } : d)
      };
    }));
  };

  const saveToServer = async () => {
    if (!user || !currentCompany) return showToast('회사 선택 후 저장할 수 있습니다.');
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', currentCompany.id);
      await setDoc(ref, { systemData, updatedAt: serverTimestamp() }, { merge: true });
      showToast('서버 저장 완료');
    } catch (e) {
      console.error(e);
      showToast('서버 저장 실패(규칙/설정 확인)');
    }
  };

  const addCompany = async () => {
    if (!newCompanyName.trim()) return showToast('고객사명을 입력하세요.');
    try {
      const code = make6DigitCode();
      const newRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'companies'));
      await setDoc(newRef, { name: newCompanyName.trim(), code, createdAt: new Date().toISOString().slice(0,10) });
      setNewCompanyName('');
      showToast('고객사 등록 완료');
    } catch (e) {
      console.error(e);
      showToast('등록 실패');
    }
  };

  const clientLogin = () => {
    const comp = companies.find(c => c.code === loginCode.trim());
    if (!comp) return showToast('코드가 올바르지 않습니다.');
    setCurrentCompany(comp);
    setMode('system');
  };

  const logout = () => {
    setCurrentCompany(null);
    setMode('login');
  };

  // ---------------- UI (초간단) ----------------
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">ISO 45001 시스템 스튜디오</div>
            <div className="text-xl font-extrabold">{currentCompany?.name || '로그인 화면'}</div>
          </div>
          <div className="flex gap-2">
            {mode === 'system' && (
              <>
                <button onClick={saveToServer} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700">
                  서버에 저장
                </button>
                <button onClick={logout} className="px-4 py-2 rounded-lg bg-slate-200 font-bold hover:bg-slate-300">
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>

        {mode === 'login' && (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="font-bold mb-2">고객사 접속</div>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="6자리 코드"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
              />
              <button onClick={clientLogin} className="mt-3 w-full px-4 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-black">
                시스템 입장
              </button>
              <div className="text-xs text-slate-500 mt-2">
                * 코드는 관리자(컨설팅 본부)가 발급합니다.
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="font-bold mb-2">관리자(간단 버전)</div>
              <div className="text-sm text-slate-600 mb-3">
                이 템플릿은 “배포가 쉬운 최소 동작 버전”입니다. 원하시면 지금 주신 큰 UI를 그대로 붙여넣는 버전도 만들어드릴 수 있어요.
              </div>

              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2"
                  placeholder="신규 고객사명"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                />
                <button onClick={addCompany} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                  등록
                </button>
              </div>

              <div className="mt-4">
                <div className="text-sm font-bold mb-2">등록된 고객사</div>
                <div className="space-y-2">
                  {companies.length === 0 && <div className="text-sm text-slate-400">아직 없음</div>}
                  {companies.map(c => (
                    <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold">{c.name}</div>
                        <div className="text-xs text-slate-500">접속코드: <span className="font-mono">{c.code}</span></div>
                      </div>
                      <button
                        onClick={() => { setCurrentCompany(c); setMode('system'); }}
                        className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                      >
                        접속
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {mode === 'system' && activeClause && activeDoc && (
          <div className="grid md:grid-cols-[260px_1fr] gap-4 mt-6">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-bold mb-3">조항/문서</div>
              <div className="space-y-3">
                {systemData.map(cl => (
                  <div key={cl.id}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg font-bold ${cl.id === activeClauseId ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
                      onClick={() => { setActiveClauseId(cl.id); setActiveDocId(cl.documents[0].id); }}
                    >
                      {cl.title}
                    </button>
                    {cl.id === activeClauseId && (
                      <div className="mt-2 space-y-1 pl-2">
                        {cl.documents.map(d => (
                          <button
                            key={d.id}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${d.id === activeDocId ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100'}`}
                            onClick={() => setActiveDocId(d.id)}
                          >
                            {d.id} {d.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">문서번호: {activeDoc.id}</div>
                  <div className="text-2xl font-extrabold">{activeDoc.title}</div>
                  <div className="mt-2 text-sm text-slate-700 bg-slate-50 border rounded-lg p-3">
                    <div className="font-bold mb-1">요구사항</div>
                    {activeDoc.requirements}
                  </div>
                </div>
                <select
                  className="border rounded-lg px-3 py-2 font-bold"
                  value={activeDoc.status}
                  onChange={(e) => updateDoc(activeClauseId, activeDocId, { status: e.target.value })}
                >
                  <option value="not_started">초안/대기</option>
                  <option value="review">검토 중</option>
                  <option value="approved">승인/배포</option>
                </select>
              </div>

              <div className="mt-4">
                <div className="font-bold mb-2">문서 내용(Markdown 가능)</div>
                <textarea
                  className="w-full min-h-[420px] border rounded-xl p-4 font-mono text-sm"
                  value={activeDoc.content}
                  onChange={(e) => updateDoc(activeClauseId, activeDocId, { content: e.target.value })}
                  placeholder="여기에 문서를 작성하세요..."
                />
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
