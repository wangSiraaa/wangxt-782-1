class AcceptanceInfo {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.application = null;
    this.item = null;
  }

  setData(item, application) {
    this.item = item;
    this.application = application;
    this.render();
  }

  render() {
    if (!this.item) {
      this.container.innerHTML = '<div class="empty-state">请先选择事项类型</div>';
      return;
    }
    
    const status = this.application?.status || 'unacceptable';
    const statusLabel = AcceptanceService.getStatusLabel(status);
    const statusColor = AcceptanceService.getStatusColor(status);
    const priority = Priority.getByLevel(this.item.priority);
    
    let countdownHtml = '';
    if (priority.showCountdown && this.application?.deadline) {
      const remaining = getRemainingTime(this.application.deadline);
      countdownHtml = `
        <div class="info-countdown priority-red">
          <div class="countdown-title">剩余办理时间</div>
          <div class="countdown-value" id="main-countdown">
            ${formatCountdown(remaining)}
          </div>
          <div class="countdown-deadline">
            截止：${formatDate(this.application.deadline)}
          </div>
        </div>
      `;
    }
    
    let materialsSummary = '';
    if (this.application?.materials) {
      const total = this.application.materials.length;
      const uploaded = this.application.materials.filter(m => 
        m.status === 'uploaded' || m.status === 'supplemented'
      ).length;
      const tolerated = this.application.materials.filter(m => m.status === 'tolerated').length;
      
      materialsSummary = `
        <div class="info-materials-summary">
          <div class="summary-item">
            <span class="summary-label">材料总数</span>
            <span class="summary-value">${total}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">已上传</span>
            <span class="summary-value uploaded">${uploaded}</span>
          </div>
          ${tolerated > 0 ? `
            <div class="summary-item">
              <span class="summary-label">容缺</span>
              <span class="summary-value tolerated">${tolerated}</span>
            </div>
          ` : ''}
          <div class="summary-item">
            <span class="summary-label">缺失</span>
            <span class="summary-value missing">${total - uploaded - tolerated}</span>
          </div>
        </div>
      `;
    }
    
    this.container.innerHTML = `
      <div class="acceptance-info-header">
        <h3>受理信息</h3>
      </div>
      
      <div class="info-section">
        <div class="info-item">
          <span class="info-label">事项名称</span>
          <span class="info-value">${this.item.name}</span>
        </div>
        <div class="info-item">
          <span class="info-label">事项编码</span>
          <span class="info-value">${this.item.code}</span>
        </div>
        <div class="info-item">
          <span class="info-label">优先级</span>
          <span class="priority-tag" style="background-color: ${priority.color}">
            ${priority.label}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">办理时限</span>
          <span class="info-value">${this.item.timeLimit}小时</span>
        </div>
      </div>
      
      ${countdownHtml}
      
      <div class="info-section status-section">
        <div class="info-label">受理状态</div>
        <div class="status-display" style="background-color: ${statusColor}">
          <span class="status-icon">${this.getStatusIcon(status)}</span>
          <span class="status-text">${statusLabel}</span>
        </div>
      </div>
      
      ${materialsSummary}
      
      ${this.application?.remark ? `
        <div class="info-section">
          <div class="info-label">备注</div>
          <div class="info-remark">${this.application.remark}</div>
        </div>
      ` : ''}
    `;
    
    if (priority.showCountdown && this.application?.deadline) {
      this.startMainCountdown();
    }
  }

  getStatusIcon(status) {
    const icons = {
      'unacceptable': '✕',
      'acceptable': '✓',
      'green_channel': '⚡',
      'supplementing': '📋',
      'accepted': '📝',
      'completed': '✅'
    };
    return icons[status] || '?';
  }

  startMainCountdown() {
    const countdownEl = document.getElementById('main-countdown');
    if (countdownEl && this.application?.deadline) {
      countdownService.startCountdown(
        'main-deadline',
        this.application.deadline,
        (remaining) => {
          countdownEl.textContent = formatCountdown(remaining);
        },
        () => {
          countdownEl.textContent = '已过期';
          countdownEl.classList.add('expired');
        }
      );
    }
  }
}
