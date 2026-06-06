class ItemList {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSelect = options.onSelect || (() => {});
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
        ${priority.showCountdown ? '<div class="item-countdown-icon">⏱</div>' : ''}
      </div>
    `;
  }

  bindEvents() {
    const itemCards = this.container.querySelectorAll('.item-card');
    itemCards.forEach(card => {
      card.addEventListener('click', () => {
        const itemId = card.dataset.itemId;
        this.selectedId = itemId;
        this.render();
        this.onSelect(itemId);
      });
    });
  }

  selectItem(itemId) {
    this.selectedId = itemId;
    this.render();
  }
}
