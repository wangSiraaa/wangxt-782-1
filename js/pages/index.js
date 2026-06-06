let itemList;
let materialList;
let acceptanceInfo;
let printList;
let currentApplication = null;
let currentItem = null;

async function init() {
  try {
    await StorageService.loadSeedData('seed-782.json');
  } catch (e) {
    console.warn('加载 seed 数据失败，使用默认数据');
    StorageService.initDefaultData();
  }
  
  itemList = new ItemList('itemListContainer', {
    onSelect: handleItemSelect,
    onSelectError: handleItemSelectError
  });
  
  materialList = new MaterialList('materialListContainer', {
    onMaterialChange: handleMaterialChange,
    onDeadlineChange: handleDeadlineChange
  });
  
  acceptanceInfo = new AcceptanceInfo('acceptanceInfoContainer');
  
  printList = new PrintList({
    onBeforePrint: handleBeforePrint,
    onAfterPrint: handleAfterPrint
  });
  
  itemList.render();
  bindEvents();
}

function handleItemSelect(itemId) {
  currentItem = StorageService.getItemById(itemId);
  if (!currentItem) return;
  
  const initData = AcceptanceService.initApplicationMaterials(itemId);
  const applicantName = document.getElementById('applicantName').value;
  const applicantId = document.getElementById('applicantId').value;
  const applicantPhone = document.getElementById('applicantPhone').value;
  
  currentApplication = new Application({
    itemId: itemId,
    applicantName: applicantName,
    applicantId: applicantId,
    applicantPhone: applicantPhone,
    materials: initData.materials,
    deadline: initData.deadline,
    priority: initData.priority
  });
  
  updateStatus();
  materialList.setData(itemId, currentApplication);
  acceptanceInfo.setData(currentItem, currentApplication);
  materialList.startCountdowns();
}

function handleMaterialChange(application) {
  currentApplication = application;
  updateStatus();
  acceptanceInfo.setData(currentItem, currentApplication);
}

function handleDeadlineChange(application) {
  currentApplication = application;
  updateStatus();
  acceptanceInfo.setData(currentItem, currentApplication);
}

function updateStatus() {
  if (!currentApplication || !currentItem) return;
  
  const materials = StorageService.getMaterialsByItemId(currentItem.id);
  const newStatus = AcceptanceService.calculateStatus(currentApplication, materials);
  currentApplication.status = newStatus;
  
  const acceptBtn = document.getElementById('btnAccept');
  const canAccept = AcceptanceService.canAccept(newStatus);
  acceptBtn.disabled = !canAccept;
}

function bindEvents() {
  document.getElementById('btnReset').addEventListener('click', handleReset);
  document.getElementById('btnSave').addEventListener('click', handleSave);
  document.getElementById('btnPrint').addEventListener('click', handlePrint);
  document.getElementById('btnAccept').addEventListener('click', handleAccept);
  
  document.getElementById('applicantName').addEventListener('change', updateApplicationInfo);
  document.getElementById('applicantId').addEventListener('change', updateApplicationInfo);
  document.getElementById('applicantPhone').addEventListener('change', updateApplicationInfo);
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', handleNavClick);
  });
}

function handleItemSelectError(error) {
  Modal.alert(
    `事项类型选择失败：${error.message}<br><br>已保留当前输入信息，请重新选择事项类型。`,
    '操作提示'
  );
}

function handleBeforePrint(item, application) {
  console.log('准备打印材料清单:', item?.name);
}

function handleAfterPrint(item, application) {
  console.log('材料清单打印完成:', item?.name);
}

function handlePrint() {
  if (!currentItem || !currentApplication) {
    Modal.alert('请先选择事项类型并填写申请信息', '提示');
    return;
  }
  printList.printPreview(currentItem, currentApplication);
}

function updateApplicationInfo() {
  if (!currentApplication) return;
  
  currentApplication.applicantName = document.getElementById('applicantName').value;
  currentApplication.applicantId = document.getElementById('applicantId').value;
  currentApplication.applicantPhone = document.getElementById('applicantPhone').value;
}

function handleNavClick(e) {
  const page = e.target.dataset.page;
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');
  
  if (page === 'admin') {
    window.location.href = 'admin.html';
  } else if (page === 'preview') {
    window.location.href = 'preview.html';
  }
}

function handleReset() {
  document.getElementById('applicantName').value = '';
  document.getElementById('applicantId').value = '';
  document.getElementById('applicantPhone').value = '';
  currentApplication = null;
  currentItem = null;
  itemList.selectedId = null;
  itemList.render();
  materialList.setData(null, null);
  acceptanceInfo.setData(null, null);
  document.getElementById('btnAccept').disabled = true;
  countdownService.stopAll();
}

async function handleSave() {
  if (!currentApplication) {
    Modal.alert('请先选择事项类型', '提示');
    return;
  }
  
  try {
    StorageService.addApplication({ ...currentApplication });
    await Modal.alert('暂存成功！申请单号：' + currentApplication.id, '成功');
  } catch (e) {
    await Modal.alert('暂存失败：' + e.message, '错误');
  }
}

async function handleAccept() {
  if (!currentApplication) {
    Modal.alert('请先选择事项类型', '提示');
    return;
  }
  
  const applicantId = currentApplication.applicantId;
  const itemId = currentApplication.itemId;
  
  if (applicantId) {
    const checkResult = DuplicateCheckService.checkDuplicate(applicantId, itemId);
    if (checkResult.hasDuplicate) {
      const confirmed = await Modal.confirm(
        checkResult.message + '<br><br>点击"确定"合并受理，点击"取消"返回修改。',
        '重复提交提示'
      );
      if (confirmed) {
        currentApplication.remark = (currentApplication.remark || '') + '\n[合并受理] 与已有申请单合并';
      } else {
        return;
      }
    }
  }
  
  try {
    currentApplication.status = 'accepted';
    StorageService.addApplication({ ...currentApplication });
    await Modal.alert(
      `受理成功！<br>申请单号：${currentApplication.id}<br>受理状态：${currentApplication.getStatusLabel()}`,
      '受理成功'
    );
    handleReset();
  } catch (e) {
    await Modal.alert('受理失败：' + e.message, '错误');
  }
}

document.addEventListener('DOMContentLoaded', init);
