let currentStep = 1;
let selectedItem = null;
let currentApplication = null;

function init() {
  StorageService.initDefaultData();
  renderItemList();
  bindEvents();
}

function renderItemList() {
  const items = StorageService.getItems();
  const priorityOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  const container = document.getElementById('preview-item-list');
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
      ${items.map(item => {
        const priority = Priority.getByLevel(item.priority);
        return `
          <div class="item-card" data-item-id="${item.id}" style="cursor: pointer; padding: 20px; border: 2px solid transparent; transition: all 0.3s;">
            <div class="item-priority" style="background-color: ${priority.color}; display: inline-block; padding: 4px 12px; border-radius: 12px; color: #fff; font-size: 12px; margin-bottom: 8px;">
              ${priority.label}
            </div>
            <h4 style="margin-bottom: 8px; font-size: 16px;">${item.name}</h4>
            <p style="color: #8c8c8c; font-size: 13px; margin-bottom: 8px;">${item.code}</p>
            <p style="color: #595959; font-size: 13px;">办理时限：${item.timeLimit}小时</p>
            ${priority.showCountdown ? '<p style="color: #ff4d4f; font-size: 12px; margin-top: 8px;">⏱ 紧急事项，优先处理</p>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  container.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', () => {
      const itemId = card.dataset.itemId;
      selectedItem = StorageService.getItemById(itemId);
      goToStep(2);
    });
  });
}

function renderMaterialList() {
  if (!selectedItem) return;
  
  const materials = StorageService.getMaterialsByItemId(selectedItem.id);
  const initData = AcceptanceService.initApplicationMaterials(selectedItem.id);
  
  currentApplication = new Application({
    itemId: selectedItem.id,
    materials: initData.materials,
    deadline: initData.deadline,
    priority: initData.priority
  });
  
  const container = document.getElementById('preview-material-list');
  container.innerHTML = `
    <div class="material-list-body">
      ${materials.map(m => {
        const appMat = currentApplication.materials.find(am => am.materialId === m.id);
        return `
          <div class="material-item not_uploaded" data-material-id="${m.id}" style="margin-bottom: 12px;">
            <div class="material-check">
              <label class="checkbox-wrapper">
                <input type="checkbox" class="material-checkbox" data-material-id="${m.id}">
                <span class="checkmark"></span>
              </label>
            </div>
            <div class="material-info">
              <div class="material-name">
                ${m.name}
                ${m.type === 'required' ? '<span style="color: #ff4d4f; margin-left: 4px;">*必填</span>' : '<span style="color: #faad14; margin-left: 4px;">(可容缺)</span>'}
              </div>
              <div class="material-desc">${m.description || ''}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  container.querySelectorAll('.material-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const materialId = e.target.dataset.materialId;
      const checked = e.target.checked;
      const matIndex = currentApplication.materials.findIndex(m => m.materialId === materialId);
      if (matIndex !== -1) {
        currentApplication.materials[matIndex].status = checked ? 'uploaded' : 'not_uploaded';
        if (checked) {
          currentApplication.materials[matIndex].uploadTime = new Date().toISOString();
        }
      }
    });
  });
}

function showPreviewResult() {
  if (!currentApplication || !selectedItem) return;
  
  currentApplication.applicantName = document.getElementById('previewApplicantName').value;
  currentApplication.applicantId = document.getElementById('previewApplicantId').value;
  currentApplication.applicantPhone = document.getElementById('previewApplicantPhone').value;
  
  const materials = StorageService.getMaterialsByItemId(selectedItem.id);
  const status = AcceptanceService.calculateStatus(currentApplication, materials);
  currentApplication.status = status;
  
  const requiredMaterials = materials.filter(m => m.type === 'required');
  const tolerableMaterials = materials.filter(m => m.type === 'tolerable');
  
  const uploadedRequired = requiredMaterials.filter(m => {
    const appMat = currentApplication.materials.find(am => am.materialId === m.id);
    return appMat && (appMat.status === 'uploaded' || appMat.status === 'supplemented');
  }).length;
  
  const uploadedTolerable = tolerableMaterials.filter(m => {
    const appMat = currentApplication.materials.find(am => am.materialId === m.id);
    return appMat && (appMat.status === 'uploaded' || appMat.status === 'supplemented');
  }).length;
  
  const missingRequired = requiredMaterials.length - uploadedRequired;
  const missingTolerable = tolerableMaterials.length - uploadedTolerable;
  
  let resultClass = 'rejected';
  let resultIcon = '❌';
  let resultTitle = '预审不通过';
  let resultMessage = '';
  
  if (status === 'acceptable') {
    resultClass = 'accepted';
    resultIcon = '✅';
    resultTitle = '预审通过';
    resultMessage = '您的材料齐全，可直接前往窗口办理';
  } else if (status === 'green_channel') {
    resultClass = 'green-channel';
    resultIcon = '⚡';
    resultTitle = '绿色通道';
    resultMessage = '您的必填材料齐全，可走绿色通道先行受理，容缺材料请在承诺期限内补交';
  } else if (status === 'supplementing') {
    resultClass = 'rejected';
    resultIcon = '📋';
    resultTitle = '需补件';
    resultMessage = '部分容缺材料已超期，请先补交材料后再办理';
  } else {
    resultClass = 'rejected';
    resultIcon = '❌';
    resultTitle = '预审不通过';
    resultMessage = '请补充以下必填材料后再申请';
  }
  
  const container = document.getElementById('preview-result');
  container.innerHTML = `
    <div class="preview-result ${resultClass}">
      <div class="result-icon">${resultIcon}</div>
      <h2 class="result-title">${resultTitle}</h2>
      <p class="result-message">${resultMessage}</p>
      
      <div class="result-details">
        <h4 style="margin-bottom: 16px;">预审详情</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
          <div>
            <p><strong>事项名称：</strong>${selectedItem.name}</p>
            <p><strong>申请人：</strong>${currentApplication.applicantName || '-'}</p>
            <p><strong>受理状态：</strong><span style="color: ${AcceptanceService.getStatusColor(status)}">${AcceptanceService.getStatusLabel(status)}</span></p>
          </div>
          <div>
            <p><strong>必填材料：</strong>${uploadedRequired}/${requiredMaterials.length}</p>
            <p><strong>容缺材料：</strong>${uploadedTolerable}/${tolerableMaterials.length}</p>
            <p><strong>缺失必填：</strong>${missingRequired}项</p>
          </div>
        </div>
        
        ${missingRequired > 0 ? `
          <div style="background: #fff1f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <h5 style="color: #ff4d4f; margin-bottom: 8px;">缺失的必填材料：</h5>
            <ul>
              ${requiredMaterials.filter(m => {
                const appMat = currentApplication.materials.find(am => am.materialId === m.id);
                return !appMat || (appMat.status !== 'uploaded' && appMat.status !== 'supplemented');
              }).map(m => `<li>${m.name}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${missingTolerable > 0 && status !== 'unacceptable' ? `
          <div style="background: #fffbe6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <h5 style="color: #faad14; margin-bottom: 8px;">可容缺材料（请按时补交）：</h5>
            <ul>
              ${tolerableMaterials.filter(m => {
                const appMat = currentApplication.materials.find(am => am.materialId === m.id);
                return !appMat || (appMat.status !== 'uploaded' && appMat.status !== 'supplemented');
              }).map(m => `<li>${m.name} - 请于${m.tolerateDays}天内补交</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin-top: 24px;">
        <button class="btn btn-secondary" id="btnBackStep3">返回修改</button>
        <button class="btn btn-primary" id="btnRestart">重新预审</button>
      </div>
    </div>
  `;
  
  goToStep(4);
  
  document.getElementById('btnBackStep3').addEventListener('click', () => goToStep(3));
  document.getElementById('btnRestart').addEventListener('click', () => {
    currentStep = 1;
    selectedItem = null;
    currentApplication = null;
    document.getElementById('previewApplicantName').value = '';
    document.getElementById('previewApplicantId').value = '';
    document.getElementById('previewApplicantPhone').value = '';
    goToStep(1);
  });
}

function goToStep(step) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(i < 4 ? `preview-step-${i}` : 'preview-result');
    if (el) {
      el.classList.toggle('hidden', i !== step);
    }
  }
  currentStep = step;
  
  if (step === 3) {
    renderMaterialList();
  }
}

function bindEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', handleNavClick);
  });
  
  document.getElementById('btnBackStep1')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btnNextStep2')?.addEventListener('click', () => {
    const name = document.getElementById('previewApplicantName').value;
    const id = document.getElementById('previewApplicantId').value;
    
    if (!name || !id) {
      Modal.alert('请填写申请人姓名和身份证号');
      return;
    }
    
    if (!validateIdCard(id)) {
      Modal.alert('身份证号格式不正确');
      return;
    }
    
    goToStep(3);
  });
  
  document.getElementById('btnBackStep2')?.addEventListener('click', () => goToStep(2));
  document.getElementById('btnPreviewResult')?.addEventListener('click', showPreviewResult);
}

function handleNavClick(e) {
  const page = e.target.dataset.page;
  if (page === 'acceptance') {
    window.location.href = 'index.html';
  } else if (page === 'admin') {
    window.location.href = 'admin.html';
  }
}

document.addEventListener('DOMContentLoaded', init);
