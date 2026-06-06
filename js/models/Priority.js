class Priority {
  constructor(options = {}) {
    this.level = options.level || 'yellow';
    this.label = options.label || '普通';
    this.color = options.color || '#f0ad4e';
    this.showCountdown = options.showCountdown || false;
    this.sortOrder = options.sortOrder || 0;
  }

  static getRules() {
    return [
      new Priority({ level: 'red', label: '紧急', color: '#d9534f', showCountdown: true, sortOrder: 1 }),
      new Priority({ level: 'orange', label: '较紧急', color: '#f0ad4e', showCountdown: false, sortOrder: 2 }),
      new Priority({ level: 'yellow', label: '普通', color: '#5bc0de', showCountdown: false, sortOrder: 3 }),
      new Priority({ level: 'green', label: '可延后', color: '#5cb85c', showCountdown: false, sortOrder: 4 })
    ];
  }

  static getByLevel(level) {
    return Priority.getRules().find(p => p.level === level) || new Priority();
  }
}
