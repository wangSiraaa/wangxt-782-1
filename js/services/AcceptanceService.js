class AcceptanceService {
  static calculateStatus(application, materials) {
    const appMaterials = application.materials || [];
    
    const requiredMaterials = materials.filter(m => m.type === 'required');
    const tolerableMaterials = materials.filter(m => m.type === 'tolerable');
    
    const requiredUploaded = requiredMaterials.every(mat => {
      const appMat = appMaterials.find(am => am.materialId === mat.id);
      return appMat && (appMat.status === 'uploaded' || appMat.status === 'supplemented');
    });
    
    if (!requiredUploaded) {
      return 'unacceptable';
    }
    
    const allMaterialsUploaded = materials.every(mat => {
      const appMat = appMaterials.find(am => am.materialId === mat.id);
      return appMat && (appMat.status === 'uploaded' || appMat.status === 'supplemented');
    });
    
    if (allMaterialsUploaded) {
      return 'acceptable';
    }
    
    const now = new Date();
    let hasExpiredTolerable = false;
    let hasValidTolerable = false;
    
    tolerableMaterials.forEach(mat => {
      const appMat = appMaterials.find(am => am.materialId === mat.id);
      if (appMat && appMat.status === 'tolerated' && appMat.tolerateDeadline) {
        const deadline = new Date(appMat.tolerateDeadline);
        if (deadline < now) {
          hasExpiredTolerable = true;
        } else {
          hasValidTolerable = true;
        }
      }
    });
    
    if (hasExpiredTolerable) {
      return 'supplementing';
    }
    
    if (hasValidTolerable) {
      return 'green_channel';
    }
    
    return 'acceptable';
  }

  static getStatusLabel(status) {
    const statusMap = {
      'unacceptable': '不可受理',
      'acceptable': '可受理',
      'green_channel': '绿色通道',
      'supplementing': '补件中',
      'accepted': '已受理',
      'completed': '已办结'
    };
    return statusMap[status] || '未知';
  }

  static getStatusColor(status) {
    const colorMap = {
      'unacceptable': '#d9534f',
      'acceptable': '#5cb85c',
      'green_channel': '#5bc0de',
      'supplementing': '#f0ad4e',
      'accepted': '#428bca',
      'completed': '#777'
    };
    return colorMap[status] || '#999';
  }

  static canAccept(status) {
    return status === 'acceptable' || status === 'green_channel';
  }

  static initApplicationMaterials(itemId) {
    const materials = StorageService.getMaterialsByItemId(itemId);
    const item = StorageService.getItemById(itemId);
    
    const now = new Date();
    const deadline = item ? addHours(now, item.timeLimit) : addHours(now, 24);
    
    return {
      materials: materials.map(m => ({
        materialId: m.id,
        status: 'not_uploaded',
        tolerateDeadline: m.isTolerable ? addDays(now, m.tolerateDays || 3).toISOString() : null,
        uploadTime: null
      })),
      deadline: deadline.toISOString(),
      priority: item ? item.priority : 'yellow'
    };
  }
}
