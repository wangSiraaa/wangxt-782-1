class PrintList {
  constructor(options = {}) {
    this.onBeforePrint = options.onBeforePrint || (() => {});
    this.onAfterPrint = options.onAfterPrint || (() => {});
  }

  generatePrintContent(item, application) {
    if (!item || !application) {
      return '<p class="print-empty">请先选择事项类型并填写申请信息</p>';
    }

    const materials = StorageService.getMaterialsByItemId(item.id);
    const requiredMaterials = materials.filter(m => m.type === 'required');
    const tolerableMaterials = materials.filter(m => m.type === 'tolerable');
    const priority = Priority.getByLevel(item.priority);

    const getMaterialStatus = (materialId) => {
      const appMat = application.materials?.find(m => m.materialId === materialId);
      if (!appMat) return '未上传';
      const statusMap = {
        'not_uploaded': '未上传',
        'uploaded': '已上传',
        'supplemented': '已补件',
        'tolerated': '已容缺'
      };
      if (appMat.status === 'not_uploaded' && materials.find(m => m.id === materialId)?.type === 'tolerable') {
        return '已容缺';
      }
      return statusMap[appMat.status] || '未知';
    };

    const getMissingList = () => {
      const missing = [];
      materials.forEach(mat => {
        const appMat = application.materials?.find(m => m.materialId === mat.id);
        const isUploaded = appMat && (appMat.status === 'uploaded' || appMat.status === 'supplemented');
        if (!isUploaded) {
          missing.push({
            name: mat.name,
            type: mat.type === 'required' ? '必填' : '可容缺',
            tolerateDays: mat.tolerateDays,
            deadline: appMat?.tolerateDeadline
          });
        }
      });
      return missing;
    };

    const missingList = getMissingList();

    return `
      <div class="print-container">
        <div class="print-header">
          <h1>政务绿色通道材料清单</h1>
          <div class="print-meta">
            <span>打印时间：${new Date().toLocaleString('zh-CN')}</span>
          </div>
        </div>

        <div class="print-section">
          <h2>一、事项基本信息</h2>
          <table class="print-table">
            <tr>
              <th>事项名称</th>
              <td>${item.name}</td>
              <th>事项编码</th>
              <td>${item.code}</td>
            </tr>
            <tr>
              <th>优先级</th>
              <td style="color: ${priority.color}; font-weight: bold;">${priority.label}</td>
              <th>办理时限</th>
              <td>${item.timeLimit} 小时</td>
            </tr>
            <tr>
              <th>事项描述</th>
              <td colspan="3">${item.description || '-'}</td>
            </tr>
          </table>
        </div>

        <div class="print-section">
          <h2>二、申请人信息</h2>
          <table class="print-table">
            <tr>
              <th>申请人姓名</th>
              <td>${application.applicantName || '-'}</td>
              <th>身份证号</th>
              <td>${application.applicantId || '-'}</td>
            </tr>
            <tr>
              <th>联系电话</th>
              <td>${application.applicantPhone || '-'}</td>
              <th>申请单号</th>
              <td>${application.id}</td>
            </tr>
            <tr>
              <th>申请时间</th>
              <td>${new Date(application.createTime).toLocaleString('zh-CN')}</td>
              <th>受理状态</th>
              <td style="color: ${application.getStatusColor()}; font-weight: bold;">${application.getStatusLabel()}</td>
            </tr>
          </table>
        </div>

        <div class="print-section">
          <h2>三、材料清单</h2>
          
          <h3>3.1 必填材料（共 ${requiredMaterials.length} 项）</h3>
          <table class="print-table material-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>材料名称</th>
                <th>材料说明</th>
                <th>上传状态</th>
              </tr>
            </thead>
            <tbody>
              ${requiredMaterials.map((mat, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${mat.name}</td>
                  <td>${mat.description || '-'}</td>
                  <td>${getMaterialStatus(mat.id)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h3>3.2 可容缺材料（共 ${tolerableMaterials.length} 项）</h3>
          <table class="print-table material-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>材料名称</th>
                <th>材料说明</th>
                <th>容缺期限</th>
                <th>上传状态</th>
              </tr>
            </thead>
            <tbody>
              ${tolerableMaterials.map((mat, index) => {
                const appMat = application.materials?.find(m => m.materialId === mat.id);
                const deadline = appMat?.tolerateDeadline 
                  ? new Date(appMat.tolerateDeadline).toLocaleString('zh-CN')
                  : `${mat.tolerateDays} 个工作日`;
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${mat.name}</td>
                    <td>${mat.description || '-'}</td>
                    <td>${deadline}</td>
                    <td>${getMaterialStatus(mat.id)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${missingList.length > 0 ? `
          <div class="print-section">
            <h2>四、缺失材料清单</h2>
            <table class="print-table missing-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>材料名称</th>
                  <th>材料类型</th>
                  <th>补件期限</th>
                </tr>
              </thead>
              <tbody>
                ${missingList.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.type}</td>
                    <td>${item.deadline ? new Date(item.deadline).toLocaleString('zh-CN') : `${item.tolerateDays} 个工作日`}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <p class="print-tip">注：请在补件期限内补齐上述缺失材料，逾期将影响办理进度。</p>
          </div>
        ` : ''}

        <div class="print-section">
          <h2>五、办理时限与优先级说明</h2>
          <table class="print-table">
            <tr>
              <th>优先级等级</th>
              <td style="color: ${priority.color}; font-weight: bold;">${priority.label}</td>
              <th>是否强制倒计时</th>
              <td>${priority.showCountdown ? '是' : '否'}</td>
            </tr>
            <tr>
              <th>办理时限</th>
              <td>${item.timeLimit} 小时</td>
              <th>受理截止时间</th>
              <td>${application.deadline ? new Date(application.deadline).toLocaleString('zh-CN') : '-'}</td>
            </tr>
          </table>
        </div>

        ${item.modelingReason ? `
          <div class="print-section">
            <h2>六、事项建模说明</h2>
            <p class="modeling-reason">${item.modelingReason}</p>
          </div>
        ` : ''}

        <div class="print-footer">
          <div class="print-sign">
            <div>窗口受理人签字：_______________</div>
            <div>申请人签字：_______________</div>
          </div>
          <div class="print-date">日期：${new Date().toLocaleDateString('zh-CN')}</div>
        </div>
      </div>

      <style>
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }

        .print-container {
          font-family: "Microsoft YaHei", "SimHei", sans-serif;
          color: #333;
          line-height: 1.6;
        }

        .print-header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .print-header h1 {
          font-size: 24px;
          margin: 0 0 10px 0;
        }

        .print-meta {
          font-size: 12px;
          color: #666;
        }

        .print-section {
          margin-bottom: 20px;
        }

        .print-section h2 {
          font-size: 16px;
          border-left: 4px solid #428bca;
          padding-left: 10px;
          margin: 0 0 10px 0;
        }

        .print-section h3 {
          font-size: 14px;
          margin: 15px 0 8px 0;
          color: #555;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }

        .print-table th,
        .print-table td {
          border: 1px solid #ccc;
          padding: 8px 10px;
          text-align: left;
          font-size: 13px;
        }

        .print-table th {
          background-color: #f5f5f5;
          font-weight: bold;
          width: 15%;
        }

        .material-table th {
          width: auto;
        }

        .material-table th:nth-child(1) {
          width: 8%;
        }

        .material-table th:nth-child(4),
        .material-table th:nth-child(5) {
          width: 15%;
        }

        .missing-table {
          background-color: #fff8f0;
        }

        .print-tip {
          font-size: 12px;
          color: #d9534f;
          margin-top: 8px;
        }

        .modeling-reason {
          background-color: #f0f7ff;
          padding: 10px;
          border-left: 3px solid #428bca;
          font-size: 13px;
          margin: 0;
        }

        .print-footer {
          margin-top: 40px;
          border-top: 1px solid #ccc;
          padding-top: 20px;
        }

        .print-sign {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .print-date {
          text-align: right;
          font-size: 13px;
        }

        .print-empty {
          text-align: center;
          color: #999;
          padding: 40px;
        }
      </style>
    `;
  }

  print(item, application) {
    this.onBeforePrint(item, application);

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      Modal.alert('无法打开打印窗口，请检查浏览器弹窗设置', '提示');
      return;
    }

    const content = this.generatePrintContent(item, application);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>材料清单打印</title>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();

    this.onAfterPrint(item, application);
  }

  printPreview(item, application) {
    const content = this.generatePrintContent(item, application);
    const modal = new Modal({
      title: '打印预览',
      content: `
        <div class="print-preview-wrapper">
          ${content}
        </div>
        <div class="print-preview-actions">
          <button class="btn btn-primary" id="btnConfirmPrint">确认打印</button>
        </div>
      `,
      showCancel: true,
      confirmText: '关闭',
      onConfirm: () => {}
    });
    modal.show();

    setTimeout(() => {
      const printBtn = modal.element?.querySelector('#btnConfirmPrint');
      if (printBtn) {
        printBtn.addEventListener('click', () => {
          modal.close();
          this.print(item, application);
        });
      }
    }, 50);
  }
}
