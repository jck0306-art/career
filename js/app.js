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

// DOM 준비 시 직접 이벤트 바인딩
window.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('btn-open-company-modal');
  if (addBtn) {
    addBtn.onclick = function(e) {
      e.preventDefault();
      openCompanyModal();
    };
  }
  initFirebase(render);
});
