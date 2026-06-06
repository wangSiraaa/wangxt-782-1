class Item {
  constructor(options = {}) {
    this.id = options.id || generateUUID();
    this.name = options.name || '';
    this.code = options.code || '';
    this.priority = options.priority || 'yellow';
    this.timeLimit = options.timeLimit || 24;
    this.materials = options.materials || [];
    this.description = options.description || '';
  }

  getPriorityInfo() {
    return Priority.getByLevel(this.priority);
  }
}
