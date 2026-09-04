export const firebaseConfig = {
  apiKey: "AIzaSyBQ0zSJleSHBjmecj1Qe-kmhLu-GDYXWE8",
  authDomain: "license-mgmt-157ed.firebaseapp.com",
  projectId: "license-mgmt-157ed", 
  storageBucket: "license-mgmt-157ed.firebasestorage.app",
  messagingSenderId: "20449962943",
  appId: "1:20449962943:web:35d36af2eb555d23760f0a"
};

export const DEFAULT_CAREERS = [
  {
    id: 'c_sample_1',
    companyName: '(주)테크솔루션',
    employmentType: '정규직',
    department: '정보보안팀',
    position: '대리 / 보안엔지니어',
    startDate: '2023-03-01',
    endDate: '',
    isCurrent: true,
    salary: '5,500만원',
    bonus: '연간 인센티브 기본급의 200%',
    welfare: '식대 지원(월 20만원), 통신비 지원, 복지포인트 연 120만원, 주 2회 재택근무',
    leavingReason: '',
    tasks: [
      {
        id: 'task_1',
        title: '사내 ISMS-P 정보보호 인증 갱신 심사 총괄',
        period: '2024.04 ~ 2024.09',
        content: '인증 범위 산정 및 취약점 진단 조치율 100% 달성, 결함 보고서 0건 통과.'
      }
    ],
    colleagues: [
      {
        id: 'col_1',
        name: '김팀장',
        deptRole: '정보보안팀 / 팀장',
        contact: '010-1234-5678',
        email: 'leader.kim@tech.com',
        memo: '사수이자 팀장님, 추후 레퍼런스 체크 협조 가능 약속하심'
      }
    ]
  }
];

let db = null;
let isFirebaseReady = false;

// 로컬 캐시 우선 로드
const cached = localStorage.getItem('career_cloud_data_v1');
export let cloudCareers = cached ? JSON.parse(cached) : DEFAULT_CAREERS;

function ensureFirebaseInit() {
  if (isFirebaseReady) return true;
  if (window.firebase && window.firebase.firestore) {
    try {
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(firebaseConfig);
      }
      db = window.firebase.firestore();
      isFirebaseReady = true;
      return true;
    } catch (e) {
      console.error("Firebase 초기화 에러:", e);
      return false;
    }
  }
  return false;
}

function normalizeCareer(item, idx) {
  return {
    ...item,
    id: item.id ? String(item.id) : `c_${Date.now()}_${idx}`,
    tasks: Array.isArray(item.tasks) ? item.tasks : [],
    colleagues: Array.isArray(item.colleagues) ? item.colleagues : []
  };
}

export function initFirebase(onDataUpdate) {
  cloudCareers = cloudCareers.map(normalizeCareer);
  
  // 1. 대기 없이 로컬 데이터로 즉시 화면 렌더링
  onDataUpdate();

  // 2. 비동기 SDK 체크
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    const ready = ensureFirebaseInit();

    if (ready) {
      clearInterval(checkInterval);
      startCloudSync(onDataUpdate);
    } else if (attempts >= 20) {
      clearInterval(checkInterval);
      updateStatusBadge('local');
    }
  }, 100);
}

function updateStatusBadge(state) {
  const statusEl = document.getElementById('cloud-status');
  if (!statusEl) return;

  if (state === 'online') {
    statusEl.innerHTML = '<i class="fa-solid fa-cloud text-emerald-400"></i> 실시간 클라우드 DB';
    statusEl.className = "text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono";
  } else if (state === 'error') {
    statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-400"></i> DB 권한 오류 (로컬 모드)';
    statusEl.className = "text-[10px] px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 font-mono";
  } else if (state === 'syncing') {
    statusEl.innerHTML = '<i class="fa-solid fa-arrows-rotate animate-spin text-amber-400"></i> 동기화 중...';
  } else {
    statusEl.innerHTML = '<i class="fa-solid fa-floppy-disk text-slate-400"></i> 로컬 저장 모드';
    statusEl.className = "text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 font-mono";
  }
}

function startCloudSync(onDataUpdate) {
  if (!db) return;

  try {
    db.collection("career_archive").doc("user_data").onSnapshot((docSnap) => {
      if (docSnap.exists) {
        const data = docSnap.data();
        if (Array.isArray(data.items) && data.items.length > 0) {
          cloudCareers = data.items.map(normalizeCareer);
          localStorage.setItem('career_cloud_data_v1', JSON.stringify(cloudCareers));
        }
      } else {
        db.collection("career_archive").doc("user_data").set({ items: cloudCareers }).catch(err => {
          console.warn("초기 생성 제한:", err);
        });
      }
      updateStatusBadge('online');
      onDataUpdate();
    }, (error) => {
      console.error("Firestore Error:", error);
      updateStatusBadge('error');
      onDataUpdate();
    });
  } catch (err) {
    console.error("리스너 연결 오류:", err);
    updateStatusBadge('error');
  }
}

export async function syncCareers(onRender) {
  cloudCareers = cloudCareers.map(normalizeCareer);
  localStorage.setItem('career_cloud_data_v1', JSON.stringify(cloudCareers));
  updateStatusBadge('syncing');

  if (ensureFirebaseInit()) {
    try {
      await db.collection("career_archive").doc("user_data").set({ items: cloudCareers });
      updateStatusBadge('online');
    } catch (e) {
      console.error("DB Save Error:", e);
      updateStatusBadge('error');
    }
  } else {
    updateStatusBadge('local');
  }

  if (onRender) onRender();
}
