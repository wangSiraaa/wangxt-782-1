const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8766;
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
        '.json': 'application/json'
      }[extname] || 'application/octet-stream';

      fs.readFile(filePath, (error, content) => {
        if (error) {
          res.writeHead(error.code === 'ENOENT' ? 404 : 500);
          res.end(error.code === 'ENOENT' ? 'File Not Found' : 'Server Error');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });
    server.listen(PORT, (err) => err ? reject(err) : resolve(server));
  });
}

async function runTest() {
  console.log('🚀 启动静态服务器...');
  const server = await startStaticServer();
  
  console.log('🌐 启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const results = [];

  try {
    console.log('\n📍 测试场景：必填材料缺失验证');
    console.log('-'.repeat(50));
    
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    console.log('✅ 1. 成功进入受理页面');
    
    await page.waitForSelector('.item-card', { timeout: 5000 });
    const itemCards = await page.$$('.item-card');
    if (itemCards.length === 0) {
      throw new Error('没有找到事项卡片');
    }
    
    console.log('✅ 2. 事项列表已渲染，共', itemCards.length, '个事项');
    
    await itemCards[0].click();
    await page.waitForTimeout(1000);
    console.log('✅ 3. 点击第一个事项（营业执照办理 - 红色优先级）');
    
    await page.waitForSelector('.material-item', { timeout: 3000 });
    const materialItems = await page.$$('.material-item');
    console.log('✅ 4. 材料清单已渲染，共', materialItems.length, '项材料');
    
    const checkboxes = await page.$$('.material-checkbox');
    console.log('✅ 5. 找到', checkboxes.length, '个材料复选框');
    
    let acceptDisabled = await page.$eval('#btnAccept', el => el.disabled);
    console.log(`   初始状态 - 受理按钮禁用: ${acceptDisabled}`);
    
    console.log('\n📍 步骤1：勾选所有材料，验证可受理');
    for (const cb of checkboxes) {
      const isChecked = await cb.evaluate(el => el.checked);
      if (!isChecked) {
        await cb.click();
      }
    }
    await page.waitForTimeout(500);
    
    acceptDisabled = await page.$eval('#btnAccept', el => el.disabled);
    results.push({
      step: '所有材料齐全',
      expected: '受理按钮可用',
      actual: acceptDisabled ? '按钮禁用' : '按钮可用',
      passed: !acceptDisabled
    });
    console.log(`   所有材料勾选后 - 受理按钮禁用: ${acceptDisabled}`);
    
    const statusText = await page.$eval('.status-text', el => el.textContent);
    console.log(`   受理状态: ${statusText}`);
    
    console.log('\n📍 步骤2：取消一项必填材料，验证按钮禁用');
    const requiredMaterials = await page.$$('.material-section:first-child .material-item');
    console.log(`   找到 ${requiredMaterials.length} 项必填材料`);
    
    if (requiredMaterials.length > 0) {
      const firstRequiredCheckbox = await requiredMaterials[0].$('.material-checkbox');
      const isChecked = await firstRequiredCheckbox.evaluate(el => el.checked);
      if (isChecked) {
        await firstRequiredCheckbox.click();
      }
      await page.waitForTimeout(500);
      
      acceptDisabled = await page.$eval('#btnAccept', el => el.disabled);
      const statusTextAfter = await page.$eval('.status-text', el => el.textContent);
      
      results.push({
        step: '取消一项必填材料',
        expected: '受理按钮禁用 + 状态为不可受理',
        actual: `按钮禁用: ${acceptDisabled}, 状态: ${statusTextAfter}`,
        passed: acceptDisabled && statusTextAfter.includes('不可受理')
      });
      
      console.log(`   取消必填材料后 - 受理按钮禁用: ${acceptDisabled}`);
      console.log(`   受理状态: ${statusTextAfter}`);
    }
    
    console.log('\n📍 步骤3：重新勾选必填材料，验证按钮恢复');
    if (requiredMaterials.length > 0) {
      const firstRequiredCheckbox = await requiredMaterials[0].$('.material-checkbox');
      const isChecked = await firstRequiredCheckbox.evaluate(el => el.checked);
      if (!isChecked) {
        await firstRequiredCheckbox.click();
      }
      await page.waitForTimeout(500);
      
      acceptDisabled = await page.$eval('#btnAccept', el => el.disabled);
      results.push({
        step: '重新勾选必填材料',
        expected: '受理按钮恢复可用',
        actual: acceptDisabled ? '按钮禁用' : '按钮可用',
        passed: !acceptDisabled
      });
      console.log(`   重新勾选后 - 受理按钮禁用: ${acceptDisabled}`);
    }
    
  } catch (e) {
    results.push({
      step: '异常',
      expected: '无异常',
      actual: e.message,
      passed: false
    });
    console.error('❌ 测试异常:', e.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 测试场景1结果汇总：必填材料缺失验证');
  console.log('='.repeat(60));
  
  results.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.step}`);
    console.log(`   期望: ${r.expected}`);
    console.log(`   实际: ${r.actual}`);
    console.log(`   结果: ${r.passed ? '✅ 通过' : '❌ 失败'}`);
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 总计: ${passed}/${total} 通过`);
  console.log('='.repeat(60));

  await browser.close();
  server.close();
  
  process.exit(passed === total ? 0 : 1);
}

runTest().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
