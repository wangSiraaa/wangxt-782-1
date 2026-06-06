class MaterialList {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.itemId = null;
    this.application = null;
    this.onMaterialChange = options.onMaterialChange || (() => {});
    this.onDeadlineChange = options.onDeadlineChange || (() => {});
    this.editable = options.editable !== false;
  }

  setData(itemId, application) {
    this.itemId = itemId;
    this.application = application;
    this.render();
  }

  render() {
    if (!this.itemId) {
      this.container.innerHTML = '<div class="empty-state">请先选择事项类型</div>';
      return;
    }
    
    const materials = StorageService.getMaterialsByItemId(this.itemId);
    const required = materials.filter(m => m.type === 'required');
    const tolerable = materials.filter(m => m.type === 'tolerable');
    
    this.container.innerHTML = `
      <div class="material-list-header">
        <h3>材料清单</h3>
      </div>
      <div class="material-list-body">
        <div class="material-section">
          <div class="section-title required">
            <span class="section-badge">必填材料</span>
            <span class="section-count">${required.length}项</span>
          </div>
          ${required.map(m => this.renderMaterialItem(m)).join('')}
        </div>
        
        <div class="material-section">
          <div class="section-title tolerable">
            <span class="section-badge">可容缺材料</span>
            <span class="section-count">${tolerable.length}项</span>
          </div>
          ${tolerable.map(m => this.renderMaterialItem(m)).join('')}
        </div>
      </div>
    `;
    
    this.bindEvents();
  }

  renderMaterialItem(material) {
    const appMat = this.application?.materials?.find(m => m.materialId === material.id);
    const status = appMat?.status || 'not_uploaded';
    const isUploaded = status === 'uploaded' || status === 'supplemented';
    
    let deadlineHtml = '';
    if (material.type === 'tolerable' && appMat?.tolerateDeadline) {
      const remaining = getRemainingTime(appMat.tolerateDeadline);
      const deadlineClass = remaining.expired ? 'expired' : '';
      deadlineHtml = `
        <div class="material-deadline ${deadlineClass}" data-material-id="${material.id}">
          <span class="deadline-label">承诺期限：</span>
          ${this.editable ? `
            <input type="datetime-local" 
                   class="deadline-input" 
                   value="${formatDate(appMat.tolerateDeadline, 'YYYY-MM-DDTHH:mm')}"
                   data-material-id="${material.id}">
          ` : ''}
          <span class="deadline-countdown" data-countdown-id="mat-${material.id}">
            ${formatCountdown(remaining)}
          </span>
        </div>
      `;
    }
    
    let displayStatus = status;
    if (material.type === 'tolerable' && !isUploaded) {
      displayStatus = 'tolerated';
    }
    
    return `
      <div class="material-item ${displayStatus}" data-material-id="${material.id}">
        <div class="material-check">
          <label class="checkbox-wrapper">
            <input type="checkbox" 
                   class="material-checkbox"
                   data-material-id="${material.id}"
                   ${isUploaded ? 'checked' : ''}
                   ${!this.editable ? 'disabled' : ''}>
            <span class="checkmark"></span>
          </label>
        </div>
        <div class="material-info">
          <div class="material-name">${material.name}</div>
          <div class="material-desc">${material.description || ''}</div>
          ${material.type === 'tolerable' ? '<div class="material-tolerate-tag">容缺</div>' : ''}
          ${deadlineHtml}
        </div>
        <div class="material-status">
          ${this.getStatusBadge(material.type === 'tolerable' && !isUploaded ? 'tolerated' : status)}
        </div>
      </div>
    `;
  }

  getStatusBadge(status) {
    const statusMap = {
      'not_uploaded': { text: '未上传', class: 'status-not-uploaded' },
      'uploaded': { text: '已上传', class: 'status-uploaded' },
      'tolerated': { text: '已容缺', class: 'status-tolerated' },
      'supplemented': { text: '已补件', class: 'status-supplemented' }
    };
    const info = statusMap[status] || statusMap['not_uploaded'];
    return `<span class="status-badge ${info.class}">${info.text}</span>`;
  }

  bindEvents() {
    const checkboxes = this.container.querySelectorAll('.material-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const materialId = e.target.dataset.materialId;
        const checked = e.target.checked;
        this.updateMaterialStatus(materialId, checked ? 'uploaded' : 'not_uploaded');
      });
    });
    
    const deadlineInputs = this.container.querySelectorAll('.deadline-input');
    deadlineInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const materialId = e.target.dataset.materialId;
        const newDate = new Date(e.target.value).toISOString();
        this.updateMaterialDeadline(materialId, newDate);
      });
    });
  }

  updateMaterialStatus(materialId, status) {
    if (!this.application) return;
    
    const matIndex = this.application.materials.findIndex(m => m.materialId === materialId);
    if (matIndex !== -1) {
      this.application.materials[matIndex].status = status;
      if (status === 'uploaded') {
        this.application.materials[matIndex].uploadTime = new Date().toISOString();
      }
    }
    
    this.onMaterialChange(this.application);
    this.render();
    this.startCountdowns();
  }

  updateMaterialDeadline(materialId, deadline) {
    if (!this.application) return;
    
    const matIndex = this.application.materials.findIndex(m => m.materialId === materialId);
    if (matIndex !== -1) {
      this.application.materials[matIndex].tolerateDeadline = deadline;
    }
    
    this.onDeadlineChange(this.application);
    this.render();
    this.startCountdowns();
  }

  startCountdowns() {
    if (!this.application) return;
    
    countdownService.stopAll();
    
    this.application.materials.forEach(mat => {
      if (mat.tolerateDeadline) {
        const isNotUploaded = mat.status !== 'uploaded' && mat.status !== 'supplemented';
        if (isNotUploaded) {
          const countdownEl = this.container.querySelector(`[data-countdown-id="mat-${mat.materialId}"]`);
          if (countdownEl) {
            countdownService.startCountdown(
              `mat-${mat.materialId}`,
              mat.tolerateDeadline,
              (remaining) => {
                countdownEl.textContent = formatCountdown(remaining);
                countdownEl.className = `deadline-countdown ${remaining.expired ? 'expired' : ''}`;
              },
              () => {
                countdownEl.textContent = '已过期';
                countdownEl.classList.add('expired');
                this.onDeadlineChange(this.application);
              }
            );
          }
        }
      }
    });
  }
}
