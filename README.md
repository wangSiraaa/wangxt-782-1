# 政务绿色通道材料受理系统

## 项目简介

面向政务服务场景的材料受理前端系统，支持三类用户角色：
- **窗口人员**：材料受理、状态流转、容缺办理
- **事项管理员**：事项配置、材料管理、规则设置
- **办事群众**：预审申请、材料上传、进度查询

## 核心功能

### 1. 材料受理
- 事项类型选择与材料清单展示
- 材料上传状态管理（必填/可容缺）
- 受理状态实时计算与展示

### 2. 容缺受理
- 必填材料齐全时，容缺材料可后补
- 承诺期限设置与倒计时提醒
- 超期自动转为补件中状态

### 3. 优先级系统
- 四级优先级：红/橙/黄/绿
- 红色优先级强制显示倒计时
- 办理时限自动计算

### 4. 重复提交检测
- 基于身份证号+事项类型的查重
- 合并受理提示与处理

### 5. 本地数据存储
- 浏览器localStorage持久化
- 事项、材料、申请记录全量存储

## 快速开始

### 方式一：静态预览
直接使用浏览器打开 `index.html` 即可。

### 方式二：本地服务器
```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx serve -l 8080
```
访问 http://localhost:8080

### 方式三：Docker容器
```bash
# 构建镜像
docker build -t gov-green-channel .

# 运行容器
docker run -p 8080:80 --name gov-green-channel gov-green-channel
```
访问 http://localhost:8080

## 页面说明

| 页面 | 路径 | 说明 |
|------|------|------|
| 受理窗口 | /index.html | 窗口人员进行材料受理操作 |
| 管理后台 | /admin.html | 事项管理员配置事项与材料 |
| 预审页面 | /preview.html | 办事群众进行材料预审 |

## 自动化测试

### 安装依赖
```bash
npm install
```

### 运行测试
```bash
# 页面基础检查
npm run test:page-check

# 场景1：必填材料缺失验证
npm run test:required-missing

# 场景2：容缺材料超期验证
npm run test:tolerable-expired

# 运行所有测试
npm run test:all
```

## 业务规则

### 受理状态流转
```
不可受理 -> 可受理/绿色通道 -> 补件中 -> 已受理 -> 已办结
     ↓              ↓              ↓
  必填缺失     容缺未过期     容缺已过期
```

### 容缺判定规则
1. 必填材料必须全部上传，否则为不可受理
2. 必填材料齐全，容缺材料未上传且在承诺期内 -> 绿色通道
3. 必填材料齐全，任一容缺材料超期 -> 补件中
4. 所有材料齐全 -> 可受理

## 技术栈

- **前端**：原生HTML5 + CSS3 + JavaScript ES6+
- **数据存储**：浏览器localStorage
- **测试框架**：Puppeteer
- **部署**：Nginx + Docker

## 项目结构

```
.
├── index.html              # 受理窗口页面
├── admin.html              # 管理后台页面
├── preview.html            # 预审页面
├── css/                    # 样式文件
├── js/                     # JavaScript代码
│   ├── models/            # 数据模型
│   ├── services/          # 业务服务
│   ├── components/        # UI组件
│   ├── pages/             # 页面逻辑
│   └── utils/             # 工具函数
├── tests/                 # 自动化测试
├── Dockerfile             # Docker配置
├── nginx.conf             # Nginx配置
└── package.json           # 项目配置
```

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 许可证

MIT License
