class Material {
  constructor(options = {}) {
    this.id = options.id || generateUUID();
    this.name = options.name || '';
    this.type = options.type || 'required';
    this.itemId = options.itemId || '';
    this.description = options.description || '';
    this.tolerateDays = options.tolerateDays || 3;
  }

  isRequired() {
    return this.type === 'required';
  }

  isTolerable() {
    return this.type === 'tolerable';
  }

  getTypeLabel() {
    return this.type === 'required' ? '必填' : '可容缺';
  }
}
