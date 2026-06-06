class ItemList {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSelect = options.onSelect || (() => {});
    this.onSelectError = options.onSelectError || (() => {});
    this.selectedId = null;
  }

  render() {
    const items = StorageService.getItems();
    const priorityOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    this.container.innerHTML = `
      <div class="item-list-header">
        <h3>事项类型</h3>
        <span class="item-count">共 ${items.length} 项</span>
      </div>
      <div class="item-list-body">
        ${items.map(item => this.renderItem(item)).join('')}
      </div>
    `;
    
    this.bindEvents();
  }

  renderItem(item) {
    const priority = Priority.getByLevel(item.priority);
    const isSelected = item.id === this.selectedId;
    
    return `
      <div class="item-card ${isSelected ? 'selected' : ''}" data-item-id="${item.id}">
        <div class="item-priority" style="background-color: ${priority.color}">
          ${priority.label}
        </div>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-code">${item.code}</div>
          <div class="item-time">办理时限：${item.timeLimit}小时</div>
        </div>
        <div class="item-actions">
          <button class="item-info-btn" data-item-id="${item.id}" title="查看建模说明">ℹ️</button>
        </div>
        ${priority.showCountdown ? '<div class="item-countdown-icon">⏱</div>' : ''}
      </div>
    `;
  }

  bindEvents() {
    const itemCards = this.container.querySelectorAll('.item-card');
    itemCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('item-info-btn')) {
          e.stopPropagation();
          const itemId = e.target.dataset.itemId;
          this.showItemModelingReason(itemId);
          return;
        }
        
        const itemId = card.dataset.itemId;
        this.handleItemSelect(itemId, card);
      });
    });
  }

  handleItemSelect(itemId, cardElement) {
    try {
      const item = StorageService.getItemById(itemId);
      if (!item) {
        throw new Error('事项不存在或已被删除');
      }

      if (item.materials && item.materials.length === 0) {
        throw new Error('该事项暂无配置材料清单，请先配置材料');
      }

      this.selectedId = itemId;
      this.render();
      this.onSelect(itemId);

      if (item.modelingReason) {
        this.showModelingReasonTip(item);
      }
    } catch (error) {
      console.error('事项类型选择失败:', error);
      this.onSelectError(error);
    }
  }

  showModelingReasonTip(item) {
    const priority = Priority.getByLevel(item.priority);
    Modal.alert(
      `
        <div style="text-align: left;">
          <p><strong>事项名称：</strong>${item.name}</p>
          <p><strong>优先级：</strong><span style="color: ${priority.color};">${priority.label}</span></p>
          <p><strong>办理时限：</strong>${item.timeLimit} 小时</p>
          <hr style="margin: 10px 0;">
          <p><strong>核心数据建模原因：</strong></p>
          <p style="background: #f0f7ff; padding: 10px; border-left: 3px solid #428bca; margin: 0;">
            ${item.modelingReason}
          </p>
        </div>
      `,
      '事项建模说明'
    );
  }

  showItemModelingReason(itemId) {
    const item = StorageService.getItemById(itemId);
    if (!item) return;

    const priority = Priority.getByLevel(item.priority);
    const materials = StorageService.getMaterialsByItemId(itemId);
    const requiredCount = materials.filter(m => m.type === 'required').length;
    const tolerableCount = materials.filter(m => m.type === 'tolerable').length;

    let materialReasons = '';
    materials.forEach(mat => {
      if (mat.modelingReason) {
        materialReasons += `
          <tr>
            <td>${mat.name}</td>
            <td>${mat.type === 'required' ? '必填' : '可容缺'}</td>
            <td>${mat.modelingReason}</td>
          </tr>
        `;
      }
    });

    Modal.alert(
      `
        <div style="text-align: left;">
          <h4 style="margin-top: 0;">一、事项基本信息</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
              <td style="padding: 5px; border: 1px solid #ddd; width: 30%;"><strong>事项名称</strong></td>
              <td style="padding: 5px; border: 1px solid #ddd;">${item.name}</td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #ddd;"><strong>优先级</strong></td>
              <td style="padding: 5px; border: 1px solid #ddd; color: ${priority.color};">${priority.label}</td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #ddd;"><strong>办理时限</strong></td>
              <td style="padding: 5px; border: 1px solid #ddd;">${item.timeLimit} 小时</td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #ddd;"><strong>材料配置</strong></td>
              <td style="padding: 5px; border: 1px solid #ddd;">必填 ${requiredCount} 项，可容缺 ${tolerableCount} 项</td>
            </tr>
          </table>

          <h4>二、事项建模原因</h4>
          <p style="background: #f0f7ff; padding: 10px; border-left: 3px solid #428bca; margin: 0 0 15px 0;">
            ${item.modelingReason || '暂无建模说明'}
          </p>

          ${materialReasons ? `
            <h4>三、材料建模原因</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">材料名称</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: left; width: 80px;">类型</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">建模原因</th>
                </tr>
              </thead>
              <tbody>
                ${materialReasons}
              </tbody>
            </table>
          ` : ''}
        </div>
      `,
      '事项详细建模说明'
    );
  }

  selectItem(itemId) {
    const card = this.container.querySelector(`[data-item-id="${itemId}"]`);
    if (card) {
      this.handleItemSelect(itemId, card);
    } else {
      this.selectedId = itemId;
      this.render();
    }
  }
}
