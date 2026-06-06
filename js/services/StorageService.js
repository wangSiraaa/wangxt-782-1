const STORAGE_KEYS = {
  ITEMS: 'gov_green_channel_items',
  MATERIALS: 'gov_green_channel_materials',
  APPLICATIONS: 'gov_green_channel_applications',
  PRIORITY_RULES: 'gov_green_channel_priority_rules'
};

class StorageService {
  static get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('Storage get error:', e);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  }

  static getItems() {
    return this.get(STORAGE_KEYS.ITEMS, []);
  }

  static saveItems(items) {
    return this.set(STORAGE_KEYS.ITEMS, items);
  }

  static getMaterials() {
    return this.get(STORAGE_KEYS.MATERIALS, []);
  }

  static saveMaterials(materials) {
    return this.set(STORAGE_KEYS.MATERIALS, materials);
  }

  static getApplications() {
    return this.get(STORAGE_KEYS.APPLICATIONS, []);
  }

  static saveApplications(applications) {
    return this.set(STORAGE_KEYS.APPLICATIONS, applications);
  }

  static getItemById(id) {
    const items = this.getItems();
    return items.find(item => item.id === id) || null;
  }

  static getMaterialsByItemId(itemId) {
    const materials = this.getMaterials();
    return materials.filter(m => m.itemId === itemId);
  }

  static addItem(item) {
    const items = this.getItems();
    items.push(item);
    return this.saveItems(items);
  }

  static updateItem(id, updates) {
    const items = this.getItems();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      return this.saveItems(items);
    }
    return false;
  }

  static deleteItem(id) {
    const items = this.getItems().filter(item => item.id !== id);
    return this.saveItems(items);
  }

  static addMaterial(material) {
    const materials = this.getMaterials();
    materials.push(material);
    return this.saveMaterials(materials);
  }

  static updateMaterial(id, updates) {
    const materials = this.getMaterials();
    const index = materials.findIndex(m => m.id === id);
    if (index !== -1) {
      materials[index] = { ...materials[index], ...updates };
      return this.saveMaterials(materials);
    }
    return false;
  }

  static deleteMaterial(id) {
    const materials = this.getMaterials().filter(m => m.id !== id);
    return this.saveMaterials(materials);
  }

  static addApplication(application) {
    const applications = this.getApplications();
    applications.push(application);
    return this.saveApplications(applications);
  }

  static updateApplication(id, updates) {
    const applications = this.getApplications();
    const index = applications.findIndex(a => a.id === id);
    if (index !== -1) {
      applications[index] = { ...applications[index], ...updates };
      return this.saveApplications(applications);
    }
    return false;
  }

  static getApplicationById(id) {
    const applications = this.getApplications();
    return applications.find(a => a.id === id) || null;
  }

  static exportData() {
    const data = {
      items: this.getItems(),
      materials: this.getMaterials(),
      applications: this.getApplications(),
      exportTime: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.items) this.saveItems(data.items);
      if (data.materials) this.saveMaterials(data.materials);
      if (data.applications) this.saveApplications(data.applications);
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  static async loadSeedData(seedUrl = 'seed-782.json') {
    try {
      const response = await fetch(seedUrl);
      if (!response.ok) {
        throw new Error(`加载 seed 数据失败: ${response.status}`);
      }
      const data = await response.json();
      return this.importSeedData(data);
    } catch (e) {
      console.warn('无法加载 seed 数据文件，使用默认数据:', e.message);
      return this.initDefaultData();
    }
  }

  static importSeedData(data) {
    if (data.items) {
      this.saveItems(data.items);
    }
    if (data.materials) {
      this.saveMaterials(data.materials);
    }
    if (data.applications) {
      this.saveApplications(data.applications);
    }
    if (data.priorityRules) {
      this.set(STORAGE_KEYS.PRIORITY_RULES, data.priorityRules);
    }
    return true;
  }

  static initDefaultData() {
    const existingItems = this.getItems();
    if (existingItems.length > 0) return false;

    const item1Id = generateUUID();
    const item2Id = generateUUID();
    const item3Id = generateUUID();

    const items = [
      {
        id: item1Id,
        name: '营业执照办理',
        code: 'YYZZ-001',
        priority: 'red',
        timeLimit: 4,
        description: '工商营业执照新办/变更/注销',
        modelingReason: '营业执照属于市场主体准入核心事项，办理时限短、优先级高，需围绕材料清单、缺失项、办理时限建模'
      },
      {
        id: item2Id,
        name: '社保登记',
        code: 'SBDJ-001',
        priority: 'orange',
        timeLimit: 8,
        description: '社会保险参保登记',
        modelingReason: '社保登记关系民生保障，材料容缺空间较大，需围绕材料清单、缺失项、容缺期限建模'
      },
      {
        id: item3Id,
        name: '不动产权证办理',
        code: 'BDCQZ-001',
        priority: 'yellow',
        timeLimit: 24,
        description: '不动产权利证书办理',
        modelingReason: '不动产权证办理材料复杂、办理时限长，需围绕材料清单、缺失项、优先级建模'
      }
    ];

    const materials = [
      { id: generateUUID(), name: '身份证原件', type: 'required', itemId: item1Id, description: '申请人身份证', tolerateDays: 0, modelingReason: '身份证是身份核验的核心材料，属于必填项，不允许容缺' },
      { id: generateUUID(), name: '申请表', type: 'required', itemId: item1Id, description: '工商登记申请表', tolerateDays: 0, modelingReason: '申请表是业务办理的基础依据，属于必填项，不允许容缺' },
      { id: generateUUID(), name: '经营场所证明', type: 'tolerable', itemId: item1Id, description: '房产证或租赁合同', tolerateDays: 3, modelingReason: '经营场所证明可后续补充，属于可容缺材料，容缺期限3天' },
      { id: generateUUID(), name: '章程', type: 'tolerable', itemId: item1Id, description: '公司章程', tolerateDays: 5, modelingReason: '公司章程可后续完善，属于可容缺材料，容缺期限5天' },
      
      { id: generateUUID(), name: '身份证', type: 'required', itemId: item2Id, description: '参保人身份证', tolerateDays: 0, modelingReason: '身份证是社保参保人身份核验核心材料，必填项' },
      { id: generateUUID(), name: '劳动合同', type: 'required', itemId: item2Id, description: '用人单位劳动合同', tolerateDays: 0, modelingReason: '劳动合同是劳动关系证明核心材料，必填项' },
      { id: generateUUID(), name: '营业执照复印件', type: 'tolerable', itemId: item2Id, description: '单位营业执照', tolerateDays: 2, modelingReason: '营业执照复印件可后续补充，容缺期限2天' },
      
      { id: generateUUID(), name: '申请人身份证明', type: 'required', itemId: item3Id, description: '身份证等有效证件', tolerateDays: 0, modelingReason: '申请人身份证明是不动产登记身份核验核心材料，必填项' },
      { id: generateUUID(), name: '不动产权属来源证明', type: 'required', itemId: item3Id, description: '购房合同、土地证明等', tolerateDays: 0, modelingReason: '权属来源证明是不动产权属认定核心依据，必填项' },
      { id: generateUUID(), name: '完税证明', type: 'tolerable', itemId: item3Id, description: '相关税费缴纳证明', tolerateDays: 7, modelingReason: '完税证明可在税费缴纳后补充，容缺期限7天' }
    ];

    this.saveItems(items);
    this.saveMaterials(materials);
    return true;
  }
}
