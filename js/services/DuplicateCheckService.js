class DuplicateCheckService {
  static checkDuplicate(applicantId, itemId, excludeId = null) {
    const applications = StorageService.getApplications();
    
    const duplicates = applications.filter(app => {
      if (excludeId && app.id === excludeId) return false;
      if (app.status === 'completed') return false;
      return app.applicantId === applicantId && app.itemId === itemId;
    });
    
    return {
      hasDuplicate: duplicates.length > 0,
      duplicates: duplicates,
      message: duplicates.length > 0 
        ? `该申请人已有${duplicates.length}条同类事项在办，是否合并受理？`
        : ''
    };
  }

  static mergeApplications(sourceId, targetId) {
    const applications = StorageService.getApplications();
    const source = applications.find(a => a.id === sourceId);
    const target = applications.find(a => a.id === targetId);
    
    if (!source || !target) return false;
    
    const mergedMaterials = [...(target.materials || [])];
    (source.materials || []).forEach(srcMat => {
      const existing = mergedMaterials.find(m => m.materialId === srcMat.materialId);
      if (!existing) {
        mergedMaterials.push(srcMat);
      } else if (srcMat.status === 'uploaded' && existing.status !== 'uploaded') {
        Object.assign(existing, srcMat);
      }
    });
    
    target.materials = mergedMaterials;
    target.remark = (target.remark || '') + `\n[合并受理] 合并申请单: ${source.id}`;
    
    const updated = applications.map(a => {
      if (a.id === targetId) return target;
      if (a.id === sourceId) return { ...a, status: 'merged', mergedInto: targetId };
      return a;
    });
    
    return StorageService.saveApplications(updated);
  }

  static getActiveApplicationsByApplicant(applicantId) {
    const applications = StorageService.getApplications();
    return applications.filter(app => 
      app.applicantId === applicantId && 
      app.status !== 'completed' && 
      app.status !== 'merged'
    );
  }
}
