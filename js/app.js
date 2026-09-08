import { initAuthGuard, logoutAdmin } from './security.js';

window.logoutAdmin = logoutAdmin;

import { initFirebase } from './firebase.js';
import { 
  updateCareerStats, 
  renderCompanyList, 
  selectCompany, 
  toggleSalaryVisibility,
  handleIsCurrentChange,
  openCompanyModal, 
  closeCompanyModal, 
  saveCompany, 
  deleteCompany,
  openTaskModal, 
  closeTaskModal, 
  saveTask, 
  deleteTask,
  openColleagueModal, 
  closeColleagueModal, 
  saveColleague, 
  deleteColleague 
} from './career.js';

// 전역 윈도우 바인딩 (인라인 onclick 대응)
window.selectCompany = selectCompany;
window.toggleSalaryVisibility = toggleSalaryVisibility;
window.handleIsCurrentChange = handleIsCurrentChange;
window.openCompanyModal = openCompanyModal;
window.closeCompanyModal = closeCompanyModal;
window.saveCompany = saveCompany;
window.deleteCompany = deleteCompany;

window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.saveTask = saveTask;
window.deleteTask = deleteTask;

window.openColleagueModal = openColleagueModal;
window.closeColleagueModal = closeColleagueModal;
window.saveColleague = saveColleague;
window.deleteColleague = deleteColleague;

// 패밀리 사이트 토글
window.toggleFamilySiteMenu = function() {
  const menu = document.getElementById('family-site-menu');
  const icon = document.getElementById('family-site-icon');
  if (!menu) return;

  if (menu.classList.contains('hidden')) {
    menu.classList.remove('hidden');
    if (icon) icon.className = "fa-solid fa-xmark text-slate-400 text-base";
  } else {
    menu.classList.add('hidden');
    if (icon) icon.className = "fa-solid fa-layer-group text-purple-400";
  }
};

document.addEventListener('click', function(e) {
  const container = document.getElementById('family-site-menu')?.parentElement;
  const menu = document.getElementById('family-site-menu');
  const icon = document.getElementById('family-site-icon');
  if (container && !container.contains(e.target) && menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
    if (icon) icon.className = "fa-solid fa-layer-group text-purple-400";
  }
});

function render() {
  updateCareerStats();
  renderCompanyList();
}

// 기존 맨 끝 DOMContentLoaded 부분을 이렇게 감싸서 교체
window.addEventListener('DOMContentLoaded', () => {
  // 인증이 통과(false)되어야만 내부 코드가 실행됩니다.
  initAuthGuard(false, (adminUser) => {
    // 🌟 이 자리에 원래 맨 밑에 들어있던 초기화 함수들을 넣어주시면 됩니다.
    // (예: injectDeliveryModal?.(); setupFileListeners?.(); initFirebase(render); 등)
    setupFileListeners?.();
    initFirebase(render);
  });
});
