class Modal {
  constructor(options = {}) {
    this.title = options.title || '提示';
    this.content = options.content || '';
    this.onConfirm = options.onConfirm || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.showCancel = options.showCancel !== false;
    this.confirmText = options.confirmText || '确定';
    this.cancelText = options.cancelText || '取消';
    this.modalId = 'modal-' + generateUUID();
  }

  show() {
    const modalHtml = `
      <div class="modal-overlay" id="${this.modalId}">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">${this.title}</h3>
            <button class="modal-close" data-action="close">&times;</button>
          </div>
          <div class="modal-body">
            ${this.content}
          </div>
          <div class="modal-footer">
            ${this.showCancel ? `
              <button class="btn btn-secondary modal-cancel">${this.cancelText}</button>
            ` : ''}
            <button class="btn btn-primary modal-confirm">${this.confirmText}</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.element = document.getElementById(this.modalId);
    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = this.element.querySelector('.modal-close');
    const confirmBtn = this.element.querySelector('.modal-confirm');
    const cancelBtn = this.element.querySelector('.modal-cancel');
    const overlay = this.element.querySelector('.modal-overlay');
    
    closeBtn.addEventListener('click', () => this.close());
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.onCancel();
        this.close();
      });
    }
    
    confirmBtn.addEventListener('click', () => {
      this.onConfirm();
      this.close();
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
  }

  close() {
    if (this.element) {
      this.element.remove();
    }
  }

  static alert(message, title = '提示') {
    return new Promise((resolve) => {
      const modal = new Modal({
        title,
        content: `<p>${message}</p>`,
        showCancel: false,
        confirmText: '确定',
        onConfirm: () => resolve(true)
      });
      modal.show();
    });
  }

  static confirm(message, title = '确认') {
    return new Promise((resolve) => {
      const modal = new Modal({
        title,
        content: `<p>${message}</p>`,
        showCancel: true,
        confirmText: '确定',
        cancelText: '取消',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
      modal.show();
    });
  }
}
