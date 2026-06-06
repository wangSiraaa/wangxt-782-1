#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
读取 seed-782.json 并生成业务编号
业务编号规则：前缀 + 日期 + 4位序号
"""

import json
import os
from datetime import datetime
from collections import OrderedDict


def load_seed_data(seed_file='seed-782.json'):
    """加载 seed 数据文件"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    seed_path = os.path.join(script_dir, seed_file)
    
    if not os.path.exists(seed_path):
        raise FileNotFoundError(f"找不到 seed 文件: {seed_path}")
    
    with open(seed_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_business_number(prefix, date_str, seq):
    """生成单个业务编号"""
    return f"{prefix}{date_str}{seq:04d}"


def generate_numbers_for_type(business_type, prefix, count, date_str, start_seq=1):
    """为某类业务生成指定数量的编号"""
    numbers = []
    for i in range(count):
        seq = start_seq + i
        number = generate_business_number(prefix, date_str, seq)
        numbers.append({
            'seq': seq,
            'number': number,
            'type': business_type
        })
    return numbers


def main():
    print("=" * 60)
    print("  绿色通道材料屏 - 业务编号生成工具")
    print("=" * 60)
    
    try:
        data = load_seed_data()
    except Exception as e:
        print(f"❌ 加载 seed 数据失败: {e}")
        return 1
    
    seed_id = data.get('seedId', 'unknown')
    seed_name = data.get('seedName', '未知')
    print(f"\n📋 Seed ID: {seed_id}")
    print(f"📋 Seed 名称: {seed_name}")
    
    now = datetime.now()
    date_str = now.strftime("%Y%m%d")
    print(f"📅 生成日期: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔢 日期标识: {date_str}")
    
    business_numbers_config = data.get('businessNumbers', [])
    
    if not business_numbers_config:
        print("⚠️  seed 文件中未配置 businessNumbers")
        return 1
    
    all_numbers = OrderedDict()
    
    print("\n" + "=" * 60)
    print("  生成的业务编号列表")
    print("=" * 60)
    
    for config in business_numbers_config:
        business_type = config.get('businessType', 'unknown')
        prefix = config.get('prefix', 'XXX')
        count = config.get('count', 0)
        
        print(f"\n📌 {business_type.upper()} ({prefix}) - 共 {count} 个")
        print("-" * 60)
        
        numbers = generate_numbers_for_type(business_type, prefix, count, date_str)
        all_numbers[business_type] = numbers
        
        for num_info in numbers:
            print(f"  [{num_info['seq']:02d}] {num_info['number']}")
        
        if numbers:
            config['numbers'] = [n['number'] for n in numbers]
    
    print("\n" + "=" * 60)
    print("  业务编号统计")
    print("=" * 60)
    
    total_count = 0
    for config in business_numbers_config:
        count = len(config.get('numbers', []))
        total_count += count
        print(f"  {config['businessType']:20s}: {count:3d} 个")
    
    print(f"  {'总计':20s}: {total_count:3d} 个")
    
    output_file = 'seed-782-with-numbers.json'
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), output_file)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 已生成业务编号并保存到: {output_file}")
    
    print("\n" + "=" * 60)
    print("  事项与材料信息概览")
    print("=" * 60)
    
    items = data.get('items', [])
    materials = data.get('materials', [])
    
    print(f"\n📝 事项类型: {len(items)} 个")
    for item in items:
        item_materials = [m for m in materials if m.get('itemId') == item.get('id')]
        required = [m for m in item_materials if m.get('type') == 'required']
        tolerable = [m for m in item_materials if m.get('type') == 'tolerable']
        print(f"  - {item.get('code', ''):10s} {item.get('name', ''):20s} "
              f"[优先级: {item.get('priority', ''):6s}] "
              f"[材料: 共{len(item_materials)}个 (必填{len(required)} 容缺{len(tolerable)})]")
    
    print(f"\n📎 材料清单: {len(materials)} 个")
    
    missing_items = data.get('missingItems', [])
    if missing_items:
        print(f"\n❌ 缺失材料: {len(missing_items)} 项")
        for missing in missing_items:
            mat = next((m for m in materials if m.get('id') == missing.get('materialId')), None)
            mat_name = mat.get('name', '未知') if mat else '未知'
            print(f"  - {mat_name} ({missing.get('missingType', '')})")
    
    applications = data.get('applications', [])
    if applications:
        print(f"\n📋 申请记录: {len(applications)} 条")
        for app in applications:
            item = next((i for i in items if i.get('id') == app.get('itemId')), None)
            item_name = item.get('name', '未知') if item else '未知'
            print(f"  - {app.get('id', ''):15s} {app.get('applicantName', ''):8s} "
                  f"[{item_name}] [{app.get('status', '')}]")
    
    print("\n" + "=" * 60)
    print("  业务编号输出完成！")
    print("=" * 60)
    
    return 0


if __name__ == '__main__':
    exit(main())
