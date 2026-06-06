class Application {
  constructor(options = {}) {
    this.id = options.id || generateUUID();
    this.itemId = options.itemId || '';
    this.applicantName = options.applicantName || '';
    this.applicantId = options.applicantId || '';
    this.applicantPhone = options.applicantPhone || '';
    this.materials = options.materials || [];
    this.status = options.status || 'draft';
    this.createTime = options.createTime ? new Date(options.createTime) : new Date();
    this.deadline = options.deadline ? new Date(options.deadline) : null;
    this.priority = options.priority || 'yellow';
    this.remark = options.remark || '';
  }

  getPriorityInfo() {
    return Priority.getByLevel(this.priority);
  }

  getStatusLabel() {
    const statusMap = {
      'draft': '草稿',
      'acceptable': '可受理',
      'green_channel': '绿色通道',
      'supplementing': '补件中',
      'unacceptable': '不可受理',
      'accepted': '已受理',
      'completed': '已办结'
    };
    return statusMap[this.status] || '未知';
  }

  getStatusColor() {
    const colorMap = {
      'draft': '#999',
      'acceptable': '#5cb85c',
      'green_channel': '#5bc0de',
      'supplementing': '#f0ad4e',
      'unacceptable': '#d9534f',
      'accepted': '#428bca',
      'completed': '#777'
    };
    return colorMap[this.status] || '#999';
  }
}
