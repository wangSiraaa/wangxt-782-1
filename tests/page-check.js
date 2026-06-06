const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const BASE_URL = `http://localhost:${PORT}`;

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(__dirname, '..', req.url === '/' ? 'index.html' : req.url);
      
      const extname = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg'
      }[extname] || 'application/octet-stream';

      fs.readFile(filePath, (error, content) => {
        if (error) {
          if(error.code === 'ENOENT') {
            res.writeHead(404);
            res.end('File Not Found');
          } else {
            res.writeHead(500);
            res.end('Server Error: ' + error.code);
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    server.listen(PORT, (err) => {
      if (err) reject(err);
      else resolve(server);
    });
  });
}

async function runPageCheck() {
  console.log('🚀 启动静态服务器...');
  const server = await startStaticServer();
  
  console.log('🌐 启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  const errors = [];
  const results = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    errors.push(`[Page Error] ${err.message}`);
  });

  try {
    console.log('📍 测试1: 页面加载');
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    results.push({ test: '页面加载', status: '✅ 通过', detail: 'index.html 成功加载' });
    
    console.log('📍 测试2: 关键元素存在性检查');
    
    const header = await page.$('.app-header');
    results.push({ 
      test: '页面头部', 
      status: header ? '✅ 通过' : '❌ 失败', 
      detail: header ? '找到 .app-header' : '未找到 .app-header' 
    });
    
    const sidebar = await page.$('.sidebar');
    results.push({ 
      test: '侧边栏', 
      status: sidebar ? '✅ 通过' : '❌ 失败', 
      detail: sidebar ? '找到 .sidebar' : '未找到 .sidebar' 
    });
    
    const mainContent = await page.$('.main-content');
    results.push({ 
      test: '主内容区', 
      status: mainContent ? '✅ 通过' : '❌ 失败', 
      detail: mainContent ? '找到 .main-content' : '未找到 .main-content' 
    });
    
    const acceptBtn = await page.$('#btnAccept');
    results.push({ 
      test: '受理按钮', 
      status: acceptBtn ? '✅ 通过' : '❌ 失败', 
      detail: acceptBtn ? '找到 #btnAccept' : '未找到 #btnAccept' 
    });
    
    console.log('📍 测试3: 事项列表渲染');
    await page.waitForSelector('.item-card', { timeout: 3000 });
    const itemCards = await page.$$('.item-card');
    results.push({ 
      test: '事项列表', 
      status: itemCards.length > 0 ? '✅ 通过' : '❌ 失败', 
      detail: `渲染了 ${itemCards.length} 个事项卡片` 
    });
    
    console.log('📍 测试4: 点击事项');
    if (itemCards.length > 0) {
      await itemCards[0].click();
      await page.waitForTimeout(500);
      
      const materialItems = await page.$$('.material-item');
      results.push({ 
        test: '材料清单渲染', 
        status: materialItems.length > 0 ? '✅ 通过' : '❌ 失败', 
        detail: `渲染了 ${materialItems.length} 个材料项` 
      });
    }
    
    console.log('📍 测试5: 其他页面加载');
    await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle2' });
    const adminTabs = await page.$('.admin-tabs');
    results.push({ 
      test: '管理员页面', 
      status: adminTabs ? '✅ 通过' : '❌ 失败', 
      detail: adminTabs ? 'admin.html 成功加载' : 'admin.html 加载失败' 
    });
    
    await page.goto(`${BASE_URL}/preview.html`, { waitUntil: 'networkidle2' });
    const previewPanel = await page.$('.preview-panel');
    results.push({ 
      test: '预审页面', 
      status: previewPanel ? '✅ 通过' : '❌ 失败', 
      detail: previewPanel ? 'preview.html 成功加载' : 'preview.html 加载失败' 
    });
    
  } catch (e) {
    results.push({ test: '异常捕获', status: '❌ 失败', detail: e.message });
    errors.push(e.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 页面检查结果汇总');
  console.log('='.repeat(60));
  
  results.forEach(r => {
    console.log(`${r.status} ${r.test}: ${r.detail}`);
  });
  
  if (errors.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  发现的错误:');
    console.log('='.repeat(60));
    errors.forEach(e => console.log(`  ${e}`));
  }
  
  const passed = results.filter(r => r.status.includes('通过')).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 总计: ${passed}/${total} 通过`);
  console.log('='.repeat(60));

  await browser.close();
  server.close();
  
  process.exit(errors.length > 0 ? 1 : 0);
}

runPageCheck().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
