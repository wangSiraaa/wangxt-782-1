# 政务绿色通道材料受理系统 - 技术架构文档

## 1. 技术选型

### 1.1 核心技术栈
- **框架**: 原生 HTML5 + CSS3 + JavaScript (ES6+)
- **构建**: 无构建工具，纯静态页面
- **存储**: 浏览器 localStorage
- **容器**: Docker + Nginx
- **测试**: Puppeteer 自动化测试

### 1.2 选择理由
- 纯静态页面，无需后端服务，部署简单
- 原生JS性能优异，无框架依赖
- localStorage满足本地数据存储需求
- Docker容器化，确保环境一致性

---

## 2. 系统架构

### 2.1 整体架构图
```
┌─────────────────────────────────────────────────────┐
│                    浏览器环境                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   UI 层     │  │  业务逻辑层  │  │  数据存储层  │  │
│  │  (HTML/CSS) │  │   (JS)      │  │ (localStorage)│
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
│         │                │                │          │
│         └────────────────┼────────────────┘          │
│                          │                           │
│                 ┌────────▼────────┐                  │
│                 │   事件总线      │                  │
│                 └─────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

### 2.2 模块划分

#### 2.2.1 数据模型层 (models/)
- `Item.js` - 事项类型模型
- `Material.js` - 材料模型
- `Application.js` - 申请单模型
- `Priority.js` - 优先级规则模型

#### 2.2.2 业务逻辑层 (services/)
- `StorageService.js` - 本地存储服务
- `AcceptanceService.js` - 受理判定服务
- `CountdownService.js` - 倒计时服务
- `DuplicateCheckService.js` - 重复提交检测服务

#### 2.2.3 UI层 (components/)
- `ItemList.js` - 事项列表组件
- `MaterialList.js` - 材料清单组件
- `AcceptanceInfo.js` - 受理信息组件
- `Countdown.js` - 倒计时组件
- `Modal.js` - 弹窗组件

#### 2.2.4 页面层 (pages/)
- `index.html` - 受理主页
- `admin.html` - 事项配置页
- `preview.html` - 预审页

---

## 3. 数据模型设计

### 3.1 事项类型 (Item)
```javascript
{
  id: String,           // 唯一标识
  name: String,         // 事项名称
  code: String,         // 事项编码
  priority: String,     // 优先级: red/orange/yellow/green
  timeLimit: Number,    // 办理时限(小时)
  materials: Array      // 关联材料ID列表
}
```

### 3.2 材料 (Material)
```javascript
{
  id: String,           // 唯一标识
  name: String,         // 材料名称
  type: String,         // 类型: required(必填)/tolerable(容缺)
  itemId: String,       // 所属事项ID
  description: String   // 材料说明
}
```

### 3.3 申请单 (Application)
```javascript
{
  id: String,                 // 申请单号
  itemId: String,             // 事项ID
  applicantName: String,      // 申请人姓名
  applicantId: String,        // 申请人身份证号
  materials: [{               // 材料状态
    materialId: String,
    status: String,           // uploaded/not_uploaded/tolerated/supplemented
    tolerateDeadline: Date,   // 容缺承诺期限
    uploadTime: Date          // 上传时间
  }],
  status: String,             // 受理状态
  createTime: Date,           // 创建时间
  deadline: Date,             // 办理截止时间
  priority: String            // 优先级
}
```

### 3.4 优先级规则 (PriorityRule)
```javascript
{
  level: String,          // 优先级级别
  label: String,          // 显示名称
  color: String,          // 标识颜色
  showCountdown: Boolean, // 是否显示倒计时
  sortOrder: Number       // 排序权重
}
```

---

## 4. 核心业务流程

### 4.1 受理判定流程
```
开始
  ↓
检查必填材料是否齐全
  ├─ 否 → 状态 = 不可受理 → 结束
  └─ 是 → 检查是否有容缺材料
            ├─ 否 → 状态 = 可受理 → 结束
            └─ 是 → 检查容缺材料是否超期
                      ├─ 否 → 状态 = 绿色通道 → 结束
                      └─ 是 → 状态 = 补件中 → 结束
```

### 4.2 倒计时更新流程
```
定时器触发(每秒)
  ↓
遍历所有进行中的申请单
  ↓
计算剩余时间
  ↓
更新UI显示
  ↓
检查是否超期
  ├─ 是 → 更新状态 → 触发通知
  └─ 否 → 继续
```

### 4.3 重复提交检测流程
```
提交申请
  ↓
查询申请人+事项类型的未办结记录
  ├─ 存在 → 弹窗提示合并受理
  └─ 不存在 → 正常创建申请单
```

---

## 5. 目录结构

```
782/
├── index.html              # 受理主页
├── admin.html              # 管理员配置页
├── preview.html            # 办事群众预审页
├── css/
│   ├── main.css            # 主样式文件
│   ├── components.css      # 组件样式
│   └── theme.css           # 主题变量
├── js/
│   ├── models/             # 数据模型
│   │   ├── Item.js
│   │   ├── Material.js
│   │   ├── Application.js
│   │   └── Priority.js
│   ├── services/           # 业务服务
│   │   ├── StorageService.js
│   │   ├── AcceptanceService.js
│   │   ├── CountdownService.js
│   │   └── DuplicateCheckService.js
│   ├── components/         # UI组件
│   │   ├── ItemList.js
│   │   ├── MaterialList.js
│   │   ├── AcceptanceInfo.js
│   │   ├── Countdown.js
│   │   └── Modal.js
│   ├── pages/              # 页面逻辑
│   │   ├── index.js
│   │   ├── admin.js
│   │   └── preview.js
│   └── utils/              # 工具函数
│       ├── date.js
│       ├── uuid.js
│       └── validator.js
├── tests/                  # 测试脚本
│   ├── page-check.js       # 页面检查脚本
│   └── scenarios/
│       ├── required-missing.test.js
│       └── tolerable-expired.test.js
├── Dockerfile              # Docker配置
├── nginx.conf              # Nginx配置
└── package.json            # 依赖配置
```

---

## 6. 部署与运行

### 6.1 静态预览
```bash
# 方式1: 直接打开
open index.html

# 方式2: 使用Python起服务
python3 -m http.server 8080
```

### 6.2 Docker容器启动
```bash
# 构建镜像
docker build -t gov-green-channel .

# 启动容器
docker run -p 8080:80 gov-green-channel
```

### 6.3 页面检查脚本
```bash
# 安装依赖
npm install

# 运行页面检查
npm run test:page-check
```

---

## 7. 测试方案

### 7.1 测试场景1：必填材料缺失验证
1. 加载页面，选择一个事项
2. 找到一项必填材料，取消已勾选状态
3. 检查受理按钮属性：disabled = true
4. 检查受理状态文本：包含"不可受理"
5. 验证通过

### 7.2 测试场景2：容缺材料超期验证
1. 加载页面，选择一个事项
2. 将某容缺材料的承诺期限设置为过去时间
3. 检查受理状态从"绿色通道"变为"补件中"
4. 检查倒计时显示"已过期"
5. 验证通过
