let currentTab = 'items';

function init() {
  StorageService.initDefaultData();
  renderTab(currentTab);
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentTab = e.target.dataset.tab;
      renderTab(currentTab);
    });
  });
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', handleNavClick);
  });
}

function handleNavClick(e) {
  const page = e.target.dataset.page;
  if (page === 'acceptance') {
    window.location.href = 'index.html';
  } else if (page === 'preview') {
    window.location.href = 'preview.html';
  }
}

function renderTab(tab) {
  const container = document.getElementById('tab-content');
  
  switch(tab) {
    case 'items':
      renderItemsTab(container);
      break;
    case 'materials':
      renderMaterialsTab(container);
      break;
    case 'applications':
      renderApplicationsTab(container);
      break;
    case 'data':
      renderDataTab(container);
      break;
  }
}

function renderItemsTab(container) {
  const items = StorageService.getItems();
  const priorities = Priority.getRules();
  
  container.innerHTML = `
    <div class="admin-toolbar">
      <h3>事项类型管理</h3>
      <button class="btn btn-primary" id="btnAddItem">+ 新增事项</button>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>事项编码</th>
          <th>事项名称</th>
          <th>优先级</th>
          <th>办理时限</th>
          <th>材料数</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => {
          const priority = Priority.getByLevel(item.priority);
          const matCount = StorageService.getMaterialsByItemId(item.id).length;
          return `
            <tr>
              <td>${item.code}</td>
              <td>${item.name}</td>
              <td><span class="priority-tag" style="background-color: ${priority.color}">${priority.label}</span></td>
              <td>${item.timeLimit}小时</td>
              <td>${matCount}</td>
              <td>
                <div class="action-btns">
                  <button class="action-btn edit" data-id="${item.id}">编辑</button>
                  <button class="action-btn delete" data-id="${item.id}">删除</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.querySelector('#btnAddItem').addEventListener('click', showAddItemModal);
  container.querySelectorAll('.action-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => showEditItemModal(btn.dataset.id));
  });
  container.querySelectorAll('.action-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.dataset.id));
  });
}

function showAddItemModal() {
  const priorities = Priority.getRules();
  const content = `
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">事项编码</label>
      <input type="text" class="form-input" id="itemCode" placeholder="如：YYZZ-001">
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">事项名称</label>
      <input type="text" class="form-input" id="itemName" placeholder="请输入事项名称">
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">优先级</label>
      <select class="form-input" id="itemPriority">
        ${priorities.map(p => `<option value="${p.level}">${p.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">办理时限（小时）</label>
      <input type="number" class="form-input" id="itemTimeLimit" value="24" min="1">
    </div>
    <div class="form-group">
      <label class="form-label">事项描述</label>
      <textarea class="form-input" id="itemDesc" rows="3" placeholder="请输入事项描述"></textarea>
    </div>
  `;
  
  const modal = new Modal({
    title: '新增事项',
    content: content,
    confirmText: '保存',
    onConfirm: () => {
      const code = document.getElementById('itemCode').value;
      const name = document.getElementById('itemName').value;
      const priority = document.getElementById('itemPriority').value;
      const timeLimit = parseInt(document.getElementById('itemTimeLimit').value);
      const description = document.getElementById('itemDesc').value;
      
      if (!code || !name) {
        Modal.alert('请填写事项编码和名称');
        return false;
      }
      
      const item = new Item({ code, name, priority, timeLimit, description });
      StorageService.addItem(item);
      renderTab('items');
      Modal.alert('新增成功');
      return true;
    }
  });
  modal.show();
}

function showEditItemModal(id) {
  const item = StorageService.getItemById(id);
  if (!item) return;
  
  const priorities = Priority.getRules();
  const content = `
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">事项编码</label>
      <input type="text" class="form-input" id="itemCode" value="${item.code}">
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">事项名称</label>
      <input type="text" class="form-input" id="itemName" value="${item.name}">
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">优先级</label>
      <select class="form-input" id="itemPriority">
        ${priorities.map(p => `<option value="${p.level}" ${p.level === item.priority ? 'selected' : ''}>${p.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">办理时限（小时）</label>
      <input type="number" class="form-input" id="itemTimeLimit" value="${item.timeLimit}" min="1">
    </div>
    <div class="form-group">
      <label class="form-label">事项描述</label>
      <textarea class="form-input" id="itemDesc" rows="3">${item.description || ''}</textarea>
    </div>
  `;
  
  const modal = new Modal({
    title: '编辑事项',
    content: content,
    confirmText: '保存',
    onConfirm: () => {
      const updates = {
        code: document.getElementById('itemCode').value,
        name: document.getElementById('itemName').value,
        priority: document.getElementById('itemPriority').value,
        timeLimit: parseInt(document.getElementById('itemTimeLimit').value),
        description: document.getElementById('itemDesc').value
      };
      
      if (!updates.code || !updates.name) {
        Modal.alert('请填写事项编码和名称');
        return false;
      }
      
      StorageService.updateItem(id, updates);
      renderTab('items');
      Modal.alert('保存成功');
      return true;
    }
  });
  modal.show();
}

async function deleteItem(id) {
  const confirmed = await Modal.confirm('确定要删除该事项吗？相关材料配置也会被删除。', '确认删除');
  if (confirmed) {
    const materials = StorageService.getMaterialsByItemId(id);
    materials.forEach(m => StorageService.deleteMaterial(m.id));
    StorageService.deleteItem(id);
    renderTab('items');
  }
}

function renderMaterialsTab(container) {
  const items = StorageService.getItems();
  const allMaterials = StorageService.getMaterials();
  
  container.innerHTML = `
    <div class="admin-toolbar">
      <h3>材料配置管理</h3>
      <div>
        <select class="form-input" id="filterItem" style="margin-right: 8px; display: inline-block; width: auto;">
          <option value="">全部事项</option>
          ${items.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="btnAddMaterial">+ 新增材料</button>
      </div>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>所属事项</th>
          <th>材料名称</th>
          <th>类型</th>
          <th>容缺天数</th>
          <th>描述</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${allMaterials.map(mat => {
          const item = items.find(i => i.id === mat.itemId);
          return `
            <tr data-item-id="${mat.itemId}">
              <td>${item ? item.name : '-'}</td>
              <td>${mat.name}</td>
              <td>
                <span class="section-badge" style="background: ${mat.type === 'required' ? '#fff1f0' : '#fffbe6'}; color: ${mat.type === 'required' ? '#ff4d4f' : '#faad14'}">
                  ${mat.type === 'required' ? '必填' : '可容缺'}
                </span>
              </td>
              <td>${mat.type === 'tolerable' ? mat.tolerateDays + '天' : '-'}</td>
              <td>${mat.description || '-'}</td>
              <td>
                <div class="action-btns">
                  <button class="action-btn edit" data-id="${mat.id}">编辑</button>
                  <button class="action-btn delete" data-id="${mat.id}">删除</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.querySelector('#btnAddMaterial').addEventListener('click', showAddMaterialModal);
  container.querySelectorAll('.action-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => showEditMaterialModal(btn.dataset.id));
  });
  container.querySelectorAll('.action-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteMaterial(btn.dataset.id));
  });
  
  container.querySelector('#filterItem').addEventListener('change', (e) => {
    const filterId = e.target.value;
    container.querySelectorAll('tbody tr').forEach(tr => {
      tr.style.display = !filterId || tr.dataset.itemId === filterId ? '' : 'none';
    });
  });
}

function showAddMaterialModal() {
  const items = StorageService.getItems();
  const content = `
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">所属事项</label>
      <select class="form-input" id="matItemId">
        ${items.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">材料名称</label>
      <input type="text" class="form-input" id="matName" placeholder="请输入材料名称">
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">材料类型</label>
      <select class="form-input" id="matType">
        <option value="required">必填</option>
        <option value="tolerable">可容缺</option>
      </select>
    </div>
    <div class="form-group" style="margin-bottom: 16px;" id="tolerateDaysGroup">
      <label class="form-label">容缺天数</label>
      <input type="number" class="form-input" id="matTolerateDays" value="3" min="1">
    </div>
    <div class="form-group">
      <label class="form-label">材料描述</label>
      <textarea class="form-input" id="matDesc" rows="2" placeholder="请输入材料描述"></textarea>
    </div>
  `;
  
  const modal = new Modal({
    title: '新增材料',
    content: content,
    confirmText: '保存',
    onConfirm: () => {
      const itemId = document.getElementById('matItemId').value;
      const name = document.getElementById('matName').value;
      const type = document.getElementById('matType').value;
      const tolerateDays = parseInt(document.getElementById('matTolerateDays').value);
      const description = document.getElementById('matDesc').value;
      
      if (!name) {
        Modal.alert('请填写材料名称');
        return false;
      }
      
      const material = new Material({ itemId, name, type, tolerateDays, description });
      StorageService.addMaterial(material);
      renderTab('materials');
      Modal.alert('新增成功');
      return true;
    }
  });
  modal.show();
  
  setTimeout(() => {
    const typeSelect = document.getElementById('matType');
    const daysGroup = document.getElementById('tolerateDaysGroup');
    typeSelect.addEventListener('change', () => {
      daysGroup.style.display = typeSelect.value === 'tolerable' ? '' : 'none';
    });
  }, 100);
}

function showEditMaterialModal(id) {
  const materials = StorageService.getMaterials();
  const material = materials.find(m => m.id === id);
  if (!material) return;
  
  const items = StorageService.getItems();
  const content = `
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">所属事项</label>
      <select class="form-input" id="matItemId">
        ${items.map(item => `<option value="${item.id}" ${item.id === material.itemId ? 'selected' : ''}>${item.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">材料名称</label>
      <input type="text" class="form-input" id="matName" value="${material.name}">
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label">材料类型</label>
      <select class="form-input" id="matType">
        <option value="required" ${material.type === 'required' ? 'selected' : ''}>必填</option>
        <option value="tolerable" ${material.type === 'tolerable' ? 'selected' : ''}>可容缺</option>
      </select>
    </div>
    <div class="form-group" style="margin-bottom: 16px;" id="tolerateDaysGroup" style="display: ${material.type === 'tolerable' ? '' : 'none'}">
      <label class="form-label">容缺天数</label>
      <input type="number" class="form-input" id="matTolerateDays" value="${material.tolerateDays || 3}" min="1">
    </div>
    <div class="form-group">
      <label class="form-label">材料描述</label>
      <textarea class="form-input" id="matDesc" rows="2">${material.description || ''}</textarea>
    </div>
  `;
  
  const modal = new Modal({
    title: '编辑材料',
    content: content,
    confirmText: '保存',
    onConfirm: () => {
      const updates = {
        itemId: document.getElementById('matItemId').value,
        name: document.getElementById('matName').value,
        type: document.getElementById('matType').value,
        tolerateDays: parseInt(document.getElementById('matTolerateDays').value),
        description: document.getElementById('matDesc').value
      };
      
      if (!updates.name) {
        Modal.alert('请填写材料名称');
        return false;
      }
      
      StorageService.updateMaterial(id, updates);
      renderTab('materials');
      Modal.alert('保存成功');
      return true;
    }
  });
  modal.show();
  
  setTimeout(() => {
    const typeSelect = document.getElementById('matType');
    const daysGroup = document.getElementById('tolerateDaysGroup');
    typeSelect.addEventListener('change', () => {
      daysGroup.style.display = typeSelect.value === 'tolerable' ? '' : 'none';
    });
  }, 100);
}

async function deleteMaterial(id) {
  const confirmed = await Modal.confirm('确定要删除该材料吗？', '确认删除');
  if (confirmed) {
    StorageService.deleteMaterial(id);
    renderTab('materials');
  }
}

function renderApplicationsTab(container) {
  const applications = StorageService.getApplications();
  const items = StorageService.getItems();
  
  container.innerHTML = `
    <div class="admin-toolbar">
      <h3>申请记录管理</h3>
      <span>共 ${applications.length} 条记录</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>申请单号</th>
          <th>事项名称</th>
          <th>申请人</th>
          <th>身份证号</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${applications.map(app => {
          const item = items.find(i => i.id === app.itemId);
          return `
            <tr>
              <td>${app.id.substring(0, 8)}...</td>
              <td>${item ? item.name : '-'}</td>
              <td>${app.applicantName || '-'}</td>
              <td>${app.applicantId ? app.applicantId.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2') : '-'}</td>
              <td>
                <span class="status-badge" style="background: ${AcceptanceService.getStatusColor(app.status)}20; color: ${AcceptanceService.getStatusColor(app.status)}">
                  ${AcceptanceService.getStatusLabel(app.status)}
                </span>
              </td>
              <td>${formatDate(app.createTime)}</td>
              <td>
                <div class="action-btns">
                  <button class="action-btn delete" data-id="${app.id}">删除</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.querySelectorAll('.action-btn.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await Modal.confirm('确定要删除该申请记录吗？', '确认删除');
      if (confirmed) {
        const apps = StorageService.getApplications().filter(a => a.id !== btn.dataset.id);
        StorageService.saveApplications(apps);
        renderTab('applications');
      }
    });
  });
}

function renderDataTab(container) {
  container.innerHTML = `
    <div class="admin-toolbar">
      <h3>数据管理</h3>
    </div>
    <div style="display: flex; gap: 24px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 300px; background: #fafafa; padding: 24px; border-radius: 8px;">
        <h4 style="margin-bottom: 16px;">数据导出</h4>
        <p style="color: #666; margin-bottom: 16px;">将所有配置和申请记录导出为JSON文件备份</p>
        <button class="btn btn-primary" id="btnExport">导出数据</button>
      </div>
      <div style="flex: 1; min-width: 300px; background: #fafafa; padding: 24px; border-radius: 8px;">
        <h4 style="margin-bottom: 16px;">数据导入</h4>
        <p style="color: #666; margin-bottom: 16px;">从备份文件恢复数据（会覆盖现有数据）</p>
        <input type="file" id="importFile" accept=".json" style="margin-bottom: 16px;">
        <button class="btn btn-warning" id="btnImport">导入数据</button>
      </div>
      <div style="flex: 1; min-width: 300px; background: #fff1f0; padding: 24px; border-radius: 8px;">
        <h4 style="margin-bottom: 16px; color: #ff4d4f;">数据重置</h4>
        <p style="color: #666; margin-bottom: 16px;">清空所有数据，恢复初始状态</p>
        <button class="btn btn-danger" id="btnReset">重置所有数据</button>
      </div>
    </div>
  `;
  
  container.querySelector('#btnExport').addEventListener('click', exportData);
  container.querySelector('#btnImport').addEventListener('click', importData);
  container.querySelector('#btnReset').addEventListener('click', resetData);
}

function exportData() {
  const data = StorageService.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gov-green-channel-${formatDate(new Date(), 'YYYYMMDD-HHmmss')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Modal.alert('导出成功');
}

async function importData() {
  const fileInput = document.getElementById('importFile');
  const file = fileInput.files[0];
  
  if (!file) {
    Modal.alert('请先选择要导入的文件');
    return;
  }
  
  const confirmed = await Modal.confirm('导入会覆盖现有数据，确定继续吗？', '确认导入');
  if (!confirmed) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const success = StorageService.importData(e.target.result);
    if (success) {
      Modal.alert('导入成功');
      renderTab('items');
    } else {
      Modal.alert('导入失败，请检查文件格式');
    }
  };
  reader.readAsText(file);
}

async function resetData() {
  const confirmed = await Modal.confirm('确定要重置所有数据吗？此操作不可恢复！', '确认重置');
  if (!confirmed) return;
  
  localStorage.removeItem(STORAGE_KEYS.ITEMS);
  localStorage.removeItem(STORAGE_KEYS.MATERIALS);
  localStorage.removeItem(STORAGE_KEYS.APPLICATIONS);
  StorageService.initDefaultData();
  Modal.alert('数据重置成功');
  renderTab('items');
}

document.addEventListener('DOMContentLoaded', init);
