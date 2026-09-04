import { cloudCareers, syncCareers } from './firebase.js';
import { escapeHTML } from './security.js';

let selectedCompanyId = null;
let isSalaryVisible = false;

// 안전한 근속 기간 계산
export function calcDuration(start, end, isCurrent) {
  if (!start) return '';
  const s = new Date(start);
  const e = isCurrent || !end ? new Date() : new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';

  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  if (months < 1) months = 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y > 0 && m > 0) return `${y}년 ${m}개월`;
  if (y > 0) return `${y}년`;
  return `${m}개월`;
}

// 🌟 입사일 기준 내림차순(최신순) 정렬 헬퍼 함수
export function getSortedCareers() {
  return [...cloudCareers].sort((a, b) => {
    const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return timeB - timeA; // 최신 입사일이 상단으로
  });
}

// 상단 통계 갱신
export function updateCareerStats() {
  const totalEl = document.getElementById('stat-total-companies');
  const durationEl = document.getElementById('stat-total-duration');
  const currentRoleEl = document.getElementById('stat-current-role');
  const colCountEl = document.getElementById('stat-total-colleagues');

  if (totalEl) totalEl.innerText = cloudCareers.length;

  let totalMonths = 0;
  let totalColleagues = 0;
  let currentCompany = null;

  const sorted = getSortedCareers();

  sorted.forEach(c => {
    if (Array.isArray(c.colleagues)) {
      totalColleagues += c.colleagues.length;
    }
    if (c.isCurrent && !currentCompany) currentCompany = c;
    if (c.startDate) {
      const s = new Date(c.startDate);
      const e = c.isCurrent || !c.endDate ? new Date() : new Date(c.endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const diff = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
        if (diff > 0) totalMonths += diff;
      }
    }
  });

  const totY = Math.floor(totalMonths / 12);
  const totM = totalMonths % 12;
  if (durationEl) {
    durationEl.innerText = totY > 0 ? `${totY}년 ${totM}개월` : `${totM}개월`;
  }
  if (currentRoleEl) {
    currentRoleEl.innerText = currentCompany ? currentCompany.companyName : (sorted[0]?.companyName || '-');
  }
  if (colCountEl) colCountEl.innerText = totalColleagues;
}

// 좌측 목록 렌더링 (입사일 최신순 정렬 적용)
export function renderCompanyList() {
  const container = document.getElementById('company-list-container');
  const countBadge = document.getElementById('list-count');
  if (!container) return;

  const sorted = getSortedCareers();

  if (countBadge) countBadge.innerText = sorted.length;

  if (sorted.length > 0) {
    const exists = sorted.some(c => String(c.id) === String(selectedCompanyId));
    if (!exists) selectedCompanyId = String(sorted[0].id);
  } else {
    selectedCompanyId = null;
  }

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
        <i class="fa-solid fa-briefcase text-2xl mb-2 block text-slate-600"></i>
        등록된 회사 이력이 없습니다.
      </div>
    `;
    renderCompanyDetail();
    return;
  }

  container.innerHTML = sorted.map(c => {
    const isSelected = String(c.id) === String(selectedCompanyId);
    const duration = calcDuration(c.startDate, c.endDate, c.isCurrent);

    return `
      <div onclick="window.selectCompany('${escapeHTML(c.id)}')" 
           class="p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between group ${
             isSelected 
               ? 'bg-purple-600/20 border-purple-500/50 text-white shadow-lg shadow-purple-950/30' 
               : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
           }">
        <div class="flex-1 min-w-0 pr-3">
          <div class="flex items-center gap-2 mb-1">
            <h4 class="text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-purple-300'}">
              ${escapeHTML(c.companyName)}
            </h4>
            ${c.isCurrent ? `
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold shrink-0">재직중</span>
            ` : ''}
          </div>
          <div class="text-[11px] text-slate-400 flex items-center gap-2 truncate">
            <span class="text-purple-300/90 font-medium">${escapeHTML(c.position || '직급 미지정')}</span>
            <span class="text-slate-600">|</span>
            <span class="font-mono text-[10px] text-slate-500">${duration}</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right text-xs ${isSelected ? 'text-purple-400' : 'text-slate-600 group-hover:text-slate-400'}"></i>
      </div>
    `;
  }).join('');

  renderCompanyDetail();
}

// 우측 상세 화면 렌더링
export function renderCompanyDetail() {
  const container = document.getElementById('company-detail-content');
  if (!container) return;

  if (!selectedCompanyId || cloudCareers.length === 0) {
    container.innerHTML = `
      <div class="py-24 text-center text-slate-500 text-sm flex flex-col items-center justify-center">
        <i class="fa-solid fa-building-user text-4xl mb-3 text-slate-700"></i>
        <span>왼쪽 목록에서 회사를 선택하거나 새 이력을 등록하세요.</span>
      </div>
    `;
    return;
  }

  const c = cloudCareers.find(item => String(item.id) === String(selectedCompanyId));
  if (!c) {
    container.innerHTML = `<div class="py-24 text-center text-slate-500 text-sm">회사 정보를 찾을 수 없습니다.</div>`;
    return;
  }

  const duration = calcDuration(c.startDate, c.endDate, c.isCurrent);
  const tasks = Array.isArray(c.tasks) ? c.tasks : [];
  const colleagues = Array.isArray(c.colleagues) ? c.colleagues : [];

  container.innerHTML = `
    <div class="space-y-6">
      <!-- 1. 헤더 -->
      <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div class="flex items-center gap-2.5 mb-1">
            <h2 class="text-xl md:text-2xl font-black text-white">${escapeHTML(c.companyName)}</h2>
            <span class="text-xs px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold">
              ${escapeHTML(c.employmentType || '정규직')}
            </span>
            ${c.isCurrent ? `
              <span class="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                재직 중
              </span>
            ` : ''}
          </div>
          <p class="text-xs text-slate-400 flex flex-wrap items-center gap-2">
            <span class="text-slate-200 font-semibold">${escapeHTML(c.department || '부서 미기재')}</span>
            <span class="text-slate-600">•</span>
            <span class="text-purple-300 font-semibold">${escapeHTML(c.position || '직급 미기재')}</span>
            <span class="text-slate-600">•</span>
            <span class="font-mono text-slate-400">${escapeHTML(c.startDate || '')} ~ ${c.isCurrent ? '현재' : escapeHTML(c.endDate || '')}</span>
            <span class="text-amber-400 font-bold font-mono">(${duration})</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.openCompanyModal('${escapeHTML(c.id)}')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
            <i class="fa-solid fa-pen text-[10px] text-amber-400"></i> 기본정보 수정
          </button>
          <button onclick="window.deleteCompany('${escapeHTML(c.id)}')" class="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition">
            <i class="fa-solid fa-trash text-[10px]"></i> 삭제
          </button>
        </div>
      </div>

      <!-- 2. 보상/처우 보안 토글 -->
      <div class="bg-slate-950/70 rounded-2xl border border-slate-800/80 p-4 transition-all">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-300">
            <i class="fa-solid fa-shield-halved text-amber-400"></i>
            <span>보상 및 처우 내역 (민감 정보)</span>
          </div>
          <button onclick="window.toggleSalaryVisibility()" class="w-7 h-7 rounded-lg bg-slate-900 hover:bg-purple-600 text-slate-300 hover:text-white border border-slate-800 flex items-center justify-center font-bold text-sm transition">
            ${isSalaryVisible ? '<i class="fa-solid fa-minus text-xs"></i>' : '<i class="fa-solid fa-plus text-xs"></i>'}
          </button>
        </div>

        ${isSalaryVisible ? `
          <div class="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span class="text-[10px] font-bold text-slate-500 uppercase block mb-1">계약 연봉</span>
              <p class="font-mono font-bold text-amber-300 text-sm">${escapeHTML(c.salary || '미기재')}</p>
            </div>
            <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span class="text-[10px] font-bold text-slate-500 uppercase block mb-1">성과급 / 인센티브</span>
              <p class="text-slate-200">${escapeHTML(c.bonus || '미기재')}</p>
            </div>
            <div class="md:col-span-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span class="text-[10px] font-bold text-slate-500 uppercase block mb-1">복지 혜택</span>
              <p class="text-slate-300 leading-relaxed">${escapeHTML(c.welfare || '기재된 복지 혜택이 없습니다.')}</p>
            </div>
          </div>
        ` : `
          <div class="mt-2 text-xs text-slate-500 font-mono flex items-center gap-2">
            <span>•••••••••••••••••••••</span>
            <span class="text-[11px] text-slate-600">우측 '+' 버튼을 눌러 연봉 및 복지 확인</span>
          </div>
        `}
      </div>

      <!-- 3. 업무 및 프로젝트 -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <i class="fa-solid fa-list-check"></i> 수행 업무 및 프로젝트 (${tasks.length})
          </h3>
          <button onclick="window.openTaskModal()" class="text-xs bg-purple-600/20 hover:bg-purple-600 hover:text-white text-purple-300 border border-purple-500/30 font-semibold px-2.5 py-1 rounded-xl transition flex items-center gap-1">
            <i class="fa-solid fa-plus text-[10px]"></i> 업무 추가
          </button>
        </div>

        ${tasks.length === 0 ? `
          <div class="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            등록된 수행 업무나 프로젝트가 없습니다.
          </div>
        ` : `
          <div class="space-y-2.5">
            ${tasks.map(t => `
              <div class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 hover:border-slate-700 transition group">
                <div class="flex justify-between items-start mb-1.5">
                  <div>
                    <span class="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 mr-1.5">
                      ${escapeHTML(t.period || '기간 미지정')}
                    </span>
                    <strong class="text-xs md:text-sm text-white font-bold">${escapeHTML(t.title)}</strong>
                  </div>
                  <div class="flex items-center gap-1">
                    <button onclick="window.openTaskModal('${escapeHTML(t.id)}')" class="p-1 text-slate-500 hover:text-amber-400 text-xs"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="window.deleteTask('${escapeHTML(t.id)}')" class="p-1 text-slate-500 hover:text-rose-400 text-xs"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap pl-1">${escapeHTML(t.content)}</p>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- 4. 동료 네트워크 -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <i class="fa-solid fa-users"></i> 함께한 동료 네트워크 (${colleagues.length})
          </h3>
          <button onclick="window.openColleagueModal()" class="text-xs bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 font-semibold px-2.5 py-1 rounded-xl transition flex items-center gap-1">
            <i class="fa-solid fa-user-plus text-[10px]"></i> 동료 추가
          </button>
        </div>

        ${colleagues.length === 0 ? `
          <div class="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            등록된 사내 동료 연락처가 없습니다.
          </div>
        ` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${colleagues.map(col => `
              <div class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 hover:border-amber-500/30 transition">
                <div class="flex justify-between items-start">
                  <div>
                    <h5 class="text-xs font-bold text-white">${escapeHTML(col.name)}</h5>
                    <span class="text-[11px] text-slate-400">${escapeHTML(col.deptRole || '부서/직책 미기재')}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button onclick="window.openColleagueModal('${escapeHTML(col.id)}')" class="p-1 text-slate-500 hover:text-amber-400 text-xs"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="window.deleteColleague('${escapeHTML(col.id)}')" class="p-1 text-slate-500 hover:text-rose-400 text-xs"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </div>
                <div class="space-y-1 text-[11px] font-mono text-slate-400">
                  ${col.contact ? `<div><i class="fa-solid fa-phone text-[9px] text-purple-400 mr-1"></i>${escapeHTML(col.contact)}</div>` : ''}
                  ${col.email ? `<div><i class="fa-solid fa-envelope text-[9px] text-indigo-400 mr-1"></i>${escapeHTML(col.email)}</div>` : ''}
                </div>
                ${col.memo ? `
                  <div class="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800 italic">
                    "${escapeHTML(col.memo)}"
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- 5. 퇴사 사유 -->
      ${c.leavingReason ? `
        <div class="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 space-y-1">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">퇴사 사유 및 회고</span>
          <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">${escapeHTML(c.leavingReason)}</p>
        </div>
      ` : ''}
    </div>
  `;
}

export function selectCompany(id) {
  selectedCompanyId = String(id);
  renderCompanyList();
}

export function toggleSalaryVisibility() {
  isSalaryVisible = !isSalaryVisible;
  renderCompanyDetail();
}

export function handleIsCurrentChange(checked) {
  const endInput = document.getElementById('form-end-date');
  if (endInput) {
    endInput.disabled = checked;
    if (checked) endInput.value = '';
  }
}

// 모달 열기 함수
export function openCompanyModal(id = null) {
  const modal = document.getElementById('company-modal');
  const title = document.getElementById('company-modal-title');
  const formId = document.getElementById('form-company-id');
  const endInput = document.getElementById('form-end-date');

  if (id) {
    const c = cloudCareers.find(item => String(item.id) === String(id));
    if (!c) return;
    if (title) title.innerText = '회사 이력 정보 수정';
    if (formId) formId.value = c.id;
    document.getElementById('form-company-name').value = c.companyName || '';
    document.getElementById('form-employment-type').value = c.employmentType || '정규직';
    document.getElementById('form-department').value = c.department || '';
    document.getElementById('form-position').value = c.position || '';
    document.getElementById('form-start-date').value = c.startDate || '';
    document.getElementById('form-end-date').value = c.endDate || '';
    
    const isCur = Boolean(c.isCurrent);
    document.getElementById('form-is-current').checked = isCur;
    if (endInput) endInput.disabled = isCur;

    document.getElementById('form-salary').value = c.salary || '';
    document.getElementById('form-bonus').value = c.bonus || '';
    document.getElementById('form-welfare').value = c.welfare || '';
    document.getElementById('form-leaving-reason').value = c.leavingReason || '';
  } else {
    if (title) title.innerText = '새 회사 이력 등록';
    if (formId) formId.value = '';
    document.getElementById('form-company-name').value = '';
    document.getElementById('form-employment-type').value = '정규직';
    document.getElementById('form-department').value = '';
    document.getElementById('form-position').value = '';
    document.getElementById('form-start-date').value = '';
    document.getElementById('form-end-date').value = '';
    
    document.getElementById('form-is-current').checked = false;
    if (endInput) endInput.disabled = false;

    document.getElementById('form-salary').value = '';
    document.getElementById('form-bonus').value = '';
    document.getElementById('form-welfare').value = '';
    document.getElementById('form-leaving-reason').value = '';
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.setProperty('display', 'flex', 'important');
  }
}

export function closeCompanyModal() {
  const modal = document.getElementById('company-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.setProperty('display', 'none', 'important');
  }
}

export function saveCompany() {
  const editId = document.getElementById('form-company-id').value;
  const companyName = document.getElementById('form-company-name').value.trim();
  if (!companyName) return alert('회사명은 필수 입력 항목입니다.');

  const employmentType = document.getElementById('form-employment-type').value;
  const department = document.getElementById('form-department').value.trim();
  const position = document.getElementById('form-position').value.trim();
  const startDate = document.getElementById('form-start-date').value;
  const endDate = document.getElementById('form-end-date').value;
  const isCurrent = document.getElementById('form-is-current').checked;
  const salary = document.getElementById('form-salary').value.trim();
  const bonus = document.getElementById('form-bonus').value.trim();
  const welfare = document.getElementById('form-welfare').value.trim();
  const leavingReason = document.getElementById('form-leaving-reason').value.trim();

  const payload = {
    companyName, employmentType, department, position,
    startDate, endDate: isCurrent ? '' : endDate, isCurrent,
    salary, bonus, welfare, leavingReason
  };

  if (editId) {
    const idx = cloudCareers.findIndex(c => String(c.id) === String(editId));
    if (idx !== -1) {
      cloudCareers[idx] = { 
        ...cloudCareers[idx], 
        ...payload,
        tasks: Array.isArray(cloudCareers[idx].tasks) ? cloudCareers[idx].tasks : [],
        colleagues: Array.isArray(cloudCareers[idx].colleagues) ? cloudCareers[idx].colleagues : []
      };
    }
    selectedCompanyId = String(editId);
  } else {
    const newId = 'c_' + Date.now();
    cloudCareers.unshift({ id: newId, tasks: [], colleagues: [], ...payload });
    selectedCompanyId = newId;
  }

  closeCompanyModal();
  syncCareers(() => {
    updateCareerStats();
    renderCompanyList();
  });
}

export function deleteCompany(id) {
  if (!confirm('해당 회사 이력과 하위 업무, 동료 목록을 모두 삭제하시겠습니까?')) return;
  const idx = cloudCareers.findIndex(c => String(c.id) === String(id));
  if (idx !== -1) {
    cloudCareers.splice(idx, 1);
  }
  const sorted = getSortedCareers();
  selectedCompanyId = sorted.length > 0 ? String(sorted[0].id) : null;

  syncCareers(() => {
    updateCareerStats();
    renderCompanyList();
  });
}

// 수행 업무 모달
export function openTaskModal(taskId = null) {
  if (!selectedCompanyId) return;
  const company = cloudCareers.find(c => String(c.id) === String(selectedCompanyId));
  if (!company) return;

  const modal = document.getElementById('task-modal');
  const title = document.getElementById('task-modal-title');
  const formId = document.getElementById('form-task-id');

  if (taskId) {
    const t = (company.tasks || []).find(item => String(item.id) === String(taskId));
    if (!t) return;
    title.innerText = '수행 업무 수정';
    formId.value = t.id;
    document.getElementById('form-task-title').value = t.title || '';
    document.getElementById('form-task-period').value = t.period || '';
    document.getElementById('form-task-content').value = t.content || '';
  } else {
    title.innerText = '수행 업무 및 프로젝트 등록';
    formId.value = '';
    document.getElementById('form-task-title').value = '';
    document.getElementById('form-task-period').value = '';
    document.getElementById('form-task-content').value = '';
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.setProperty('display', 'flex', 'important');
  }
}

export function closeTaskModal() {
  const modal = document.getElementById('task-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.setProperty('display', 'none', 'important');
  }
}

export function saveTask() {
  if (!selectedCompanyId) return;
  const company = cloudCareers.find(c => String(c.id) === String(selectedCompanyId));
  if (!company) return;

  const editId = document.getElementById('form-task-id').value;
  const title = document.getElementById('form-task-title').value.trim();
  const period = document.getElementById('form-task-period').value.trim();
  const content = document.getElementById('form-task-content').value.trim();

  if (!title) return alert('업무/프로젝트명은 필수 입력 항목입니다.');
  if (!Array.isArray(company.tasks)) company.tasks = [];

  if (editId) {
    const idx = company.tasks.findIndex(t => String(t.id) === String(editId));
    if (idx !== -1) {
      company.tasks[idx] = { ...company.tasks[idx], title, period, content };
    }
  } else {
    company.tasks.unshift({ id: 'task_' + Date.now(), title, period, content });
  }

  closeTaskModal();
  syncCareers(() => {
    renderCompanyDetail();
  });
}

export function deleteTask(taskId) {
  if (!selectedCompanyId) return;
  const company = cloudCareers.find(c => String(c.id) === String(selectedCompanyId));
  if (!company || !confirm('이 업무 항목을 삭제하시겠습니까?')) return;

  company.tasks = (company.tasks || []).filter(t => String(t.id) !== String(taskId));
  syncCareers(() => {
    renderCompanyDetail();
  });
}

// 동료 연락처 모달
export function openColleagueModal(colId = null) {
  if (!selectedCompanyId) return;
  const company = cloudCareers.find(c => String(c.id) === String(selectedCompanyId));
  if (!company) return;

  const modal = document.getElementById('colleague-modal');
  const title = document.getElementById('colleague-modal-title');
  const formId = document.getElementById('form-col-id');

  if (colId) {
    const col = (company.colleagues || []).find(item => String(item.id) === String(colId));
    if (!col) return;
    title.innerText = '동료 연락처 정보 수정';
    formId.value = col.id;
    document.getElementById('form-col-name').value = col.name || '';
    document.getElementById('form-col-dept-role').value = col.deptRole || '';
    document.getElementById('form-col-contact').value = col.contact || '';
    document.getElementById('form-col-email').value = col.email || '';
    document.getElementById('form-col-memo').value = col.memo || '';
  } else {
    title.innerText = '사내 동료 등록';
    formId.value = '';
    document.getElementById('form-col-name').value = '';
    document.getElementById('form-col-dept-role').value = '';
    document.getElementById('form-col-contact').value = '';
    document.getElementById('form-col-email').value = '';
    document.getElementById('form-col-memo').value = '';
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.setProperty('display', 'flex', 'important');
  }
}

export function closeColleagueModal() {
  const modal = document.getElementById('colleague-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.setProperty('display', 'none', 'important');
  }
}

export function saveColleague() {
  if (!selectedCompanyId) return;
  const company = cloudCareers.find(c => String(c.id) === String(selectedCompanyId));
  if (!company) return;

  const editId = document.getElementById('form-col-id').value;
  const name = document.getElementById('form-col-name').value.trim();
  const deptRole = document.getElementById('form-col-dept-role').value.trim();
  const contact = document.getElementById('form-col-contact').value.trim();
  const email = document.getElementById('form-col-email').value.trim();
  const memo = document.getElementById('form-col-memo').value.trim();

  if (!name) return alert('동료 이름은 필수 입력 항목입니다.');
  if (!Array.isArray(company.colleagues)) company.colleagues = [];

  if (editId) {
    const idx = company.colleagues.findIndex(c => String(c.id) === String(editId));
    if (idx !== -1) {
      company.colleagues[idx] = { ...company.colleagues[idx], name, deptRole, contact, email, memo };
    }
  } else {
    company.colleagues.push({ id: 'col_' + Date.now(), name, deptRole, contact, email, memo });
  }

  closeColleagueModal();
  syncCareers(() => {
    updateCareerStats();
    renderCompanyDetail();
  });
}

export function deleteColleague(colId) {
  if (!selectedCompanyId) return;
  const company = cloudCareers.find(c => String(c.id) === String(selectedCompanyId));
  if (!company || !confirm('이 동료 연락처 정보를 삭제하시겠습니까?')) return;

  company.colleagues = (company.colleagues || []).filter(c => String(c.id) !== String(colId));
  syncCareers(() => {
    updateCareerStats();
    renderCompanyDetail();
  });
}
