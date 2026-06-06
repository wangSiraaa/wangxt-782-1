#!/bin/bash

echo "========================================"
echo "  政务绿色通道材料受理系统"
echo "========================================"
echo ""

case "$1" in
  start)
    echo "🚀 启动本地服务器 (端口 8080)..."
    echo "📖 访问地址: http://localhost:8080"
    echo "📋 受理页面: http://localhost:8080/index.html"
    echo "⚙️  管理页面: http://localhost:8080/admin.html"
    echo "👥 预审页面: http://localhost:8080/preview.html"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    python3 -m http.server 8080
    ;;
    
  docker-build)
    echo "🐳 构建Docker镜像..."
    docker build -t gov-green-channel .
    echo "✅ 镜像构建完成: gov-green-channel"
    ;;
    
  docker-run)
    echo "🐳 启动Docker容器 (端口 8080)..."
    docker run -d -p 8080:80 --name gov-green-channel gov-green-channel
    echo "✅ 容器启动成功"
    echo "📖 访问地址: http://localhost:8080"
    ;;
    
  docker-stop)
    echo "🐳 停止并删除容器..."
    docker stop gov-green-channel 2>/dev/null
    docker rm gov-green-channel 2>/dev/null
    echo "✅ 容器已停止"
    ;;
    
  test-install)
    echo "📦 安装测试依赖..."
    npm install
    echo "✅ 依赖安装完成"
    ;;
    
  test-page)
    echo "🧪 运行页面检查测试..."
    node tests/page-check.js
    ;;
    
  test-required)
    echo "🧪 运行必填材料缺失测试..."
    node tests/scenarios/required-missing.test.js
    ;;
    
  test-tolerable)
    echo "🧪 运行容缺材料超期测试..."
    node tests/scenarios/tolerable-expired.test.js
    ;;
    
  test-all)
    echo "🧪 运行所有测试..."
    npm run test:all
    ;;
    
  *)
    echo "使用方法:"
    echo "  $0 start              - 启动本地HTTP服务器"
    echo "  $0 docker-build       - 构建Docker镜像"
    echo "  $0 docker-run         - 启动Docker容器"
    echo "  $0 docker-stop        - 停止Docker容器"
    echo "  $0 test-install       - 安装测试依赖"
    echo "  $0 test-page          - 页面检查测试"
    echo "  $0 test-required      - 必填材料缺失测试"
    echo "  $0 test-tolerable     - 容缺材料超期测试"
    echo "  $0 test-all           - 运行所有测试"
    echo ""
    echo "快速开始:"
    echo "  1. $0 start    # 启动服务"
    echo "  2. 打开浏览器访问 http://localhost:8080"
    ;;
esac
