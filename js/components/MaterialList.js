class MaterialList {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.itemId = null;
    this.application = null;
    this.onMaterialChange = options.onMaterialChange || (() => {});
    this.onDeadlineChange = options.onDeadlineChange || (() => {});
    this.onMaterialModelingReason = options.onMaterialModelingReason || (() => {});
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
          <div class="material-name">
            ${material.name}
            ${material.modelingReason ? `
              <button class="material-info-btn" data-material-id="${material.id}" title="查看建模说明">ℹ️</button>
            ` : ''}
          </div>
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

    const infoBtns = this.container.querySelectorAll('.material-info-btn');
    infoBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const materialId = e.target.dataset.materialId;
        this.showMaterialModelingReason(materialId);
      });
    });
  }

  updateMaterialStatus(materialId, status) {
    if (!this.application) return;
    
    const materials = StorageService.getMaterialsByItemId(this.itemId);
    const material = materials.find(m => m.id === materialId);
    
    const matIndex = this.application.materials.findIndex(m => m.materialId === materialId);
    if (matIndex !== -1) {
      const oldStatus = this.application.materials[matIndex].status;
      this.application.materials[matIndex].status = status;
      if (status === 'uploaded') {
        this.application.materials[matIndex].uploadTime = new Date().toISOString();
      }

      if (material && material.modelingReason && status !== oldStatus) {
        this.showMaterialChangeTip(material, status);
      }
    }
    
    this.onMaterialChange(this.application);
    this.render();
    this.startCountdowns();
  }

  showMaterialChangeTip(material, status) {
    const statusText = status === 'uploaded' ? '已上传' : '未上传';
    Modal.alert(
      `
        <div style="text-align: left;">
          <p><strong>材料名称：</strong>${material.name}</p>
          <p><strong>材料类型：</strong>${material.type === 'required' ? '必填' : '可容缺'}</p>
          <p><strong>当前状态：</strong>${statusText}</p>
          <hr style="margin: 10px 0;">
          <p><strong>材料建模原因：</strong></p>
          <p style="background: #f0f7ff; padding: 10px; border-left: 3px solid #428bca; margin: 0;">
            ${material.modelingReason}
          </p>
        </div>
      `,
      '材料状态变更提示'
    );
  }

  showMaterialModelingReason(materialId) {
    const materials = StorageService.getMaterialsByItemId(this.itemId);
    const material = materials.find(m => m.id === materialId);
    if (!material) return;

    const appMat = this.application?.materials?.find(m => m.materialId === materialId);
    const status = appMat?.status || 'not_uploaded';
    const statusText = {
      'not_uploaded': '未上传',
      'uploaded': '已上传',
      'supplemented': '已补件'
    }[status] || '未知';

    Modal.alert(
      `
        <div style="text-align: left;">
          <h4 style="margin-top: 0;">材料基本信息</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
              <td style="padding: 5px; border: 1px solid #ddd; width: 30%;"><strong>材料名称</strong></td>
              <td style="padding: 5px; border: 1px solid #ddd;">${material.name}</td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #ddd;"><strong>材料类型</strong></td>
              <td style="padding: 5px; border: 1px solid #ddd;">${material.type === 'required' ? '必填' : '可容缺'}</td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #ddd;"><strong>当前状态</strong></td>
              <td style="padding: 5px; border: 1px solid #ddd;">${statusText}</td>
            </tr>
            ${material.type === 'tolerable' ? `
              <tr>
                <td style="padding: 5px; border: 1px solid #ddd;"><strong>容缺期限</strong></td>
                <td style="padding: 5px; border: 1px solid #ddd;">${material.tolerateDays} 个工作日</td>
              </tr>
            ` : ''}
          </table>

          <h4>材料建模原因</h4>
          <p style="background: #f0f7ff; padding: 10px; border-left: 3px solid #428bca; margin: 0;">
            ${material.modelingReason || '暂无建模说明'}
          </p>
        </div>
      `,
      '材料建模说明'
    );
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
