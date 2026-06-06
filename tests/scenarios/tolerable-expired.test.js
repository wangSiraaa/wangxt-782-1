const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8767;
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
    console.log('\n📍 测试场景：容缺材料超期验证');
    console.log('-'.repeat(50));
    
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    console.log('✅ 1. 成功进入受理页面');
    
    await page.waitForSelector('.item-card', { timeout: 5000 });
    const itemCards = await page.$$('.item-card');
    
    await itemCards[0].click();
    await page.waitForTimeout(1000);
    console.log('✅ 2. 点击第一个事项（营业执照办理）');
    
    await page.waitForSelector('.material-item', { timeout: 3000 });
    console.log('✅ 3. 材料清单已渲染');
    
    const checkboxes = await page.$$('.material-checkbox');
    console.log('📍 步骤1：勾选所有必填材料，只留容缺材料不勾选');
    
    const sections = await page.$$('.material-section');
    if (sections.length >= 2) {
      const requiredCheckboxes = await sections[0].$$('.material-checkbox');
      for (const cb of requiredCheckboxes) {
        const isChecked = await cb.evaluate(el => el.checked);
        if (!isChecked) await cb.click();
      }
      console.log(`   已勾选 ${requiredCheckboxes.length} 项必填材料`);
      
      const tolerableCheckboxes = await sections[1].$$('.material-checkbox');
      console.log(`   找到 ${tolerableCheckboxes.length} 项可容缺材料`);
      
      if (tolerableCheckboxes.length > 0) {
        await page.waitForTimeout(500);
        
        let statusText = await page.$eval('.status-text', el => el.textContent);
        let acceptDisabled = await page.$eval('#btnAccept', el => el.disabled);
        
        results.push({
          step: '必填材料齐全，容缺材料未上传',
          expected: '状态为绿色通道/可受理，按钮可用',
          actual: `状态: ${statusText}, 按钮禁用: ${acceptDisabled}`,
          passed: (statusText.includes('绿色通道') || statusText.includes('可受理')) && !acceptDisabled
        });
        
        console.log(`   当前状态: ${statusText}`);
        console.log(`   受理按钮禁用: ${acceptDisabled}`);
        
        console.log('\n📍 步骤2：找到容缺材料的期限输入框');
        const deadlineInputs = await sections[1].$$('.deadline-input');
        console.log(`   找到 ${deadlineInputs.length} 个期限输入框`);
        
        if (deadlineInputs.length > 0) {
          const firstDeadlineInput = deadlineInputs[0];
          
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const expiredValue = yesterday.toISOString().slice(0, 16);
          
          console.log('📍 步骤3：将容缺材料期限设置为昨天（已过期）');
          await firstDeadlineInput.click({ clickCount: 3 });
          await firstDeadlineInput.type(expiredValue);
          await page.waitForTimeout(1000);
          
          statusText = await page.$eval('.status-text', el => el.textContent);
          acceptDisabled = await page.$eval('#btnAccept', el => el.disabled);
          
          results.push({
            step: '容缺材料超期后',
            expected: '状态变为补件中',
            actual: `状态: ${statusText}, 按钮禁用: ${acceptDisabled}`,
            passed: statusText.includes('补件中')
          });
          
          console.log(`   修改后状态: ${statusText}`);
          console.log(`   受理按钮禁用: ${acceptDisabled}`);
          
          console.log('\n📍 步骤4：检查倒计时是否显示已过期');
          const countdownEls = await sections[1].$$('.deadline-countdown');
          if (countdownEls.length > 0) {
            const countdownText = await countdownEls[0].evaluate(el => el.textContent);
            results.push({
              step: '倒计时显示',
              expected: '显示已过期',
              actual: countdownText,
              passed: countdownText.includes('已过期') || countdownText.includes('0天')
            });
            console.log(`   容缺材料倒计时: ${countdownText}`);
          }
          
          console.log('\n📍 步骤5：将期限恢复为未来时间，验证状态变回绿色通道');
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 3);
          const validValue = tomorrow.toISOString().slice(0, 16);
          
          await firstDeadlineInput.click({ clickCount: 3 });
          await firstDeadlineInput.type(validValue);
          await page.waitForTimeout(1000);
          
          statusText = await page.$eval('.status-text', el => el.textContent);
          
          results.push({
            step: '恢复容缺期限后',
            expected: '状态变回绿色通道/可受理',
            actual: `状态: ${statusText}`,
            passed: statusText.includes('绿色通道') || statusText.includes('可受理')
          });
          
          console.log(`   恢复后状态: ${statusText}`);
        }
      }
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
  console.log('📋 测试场景2结果汇总：容缺材料超期验证');
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
