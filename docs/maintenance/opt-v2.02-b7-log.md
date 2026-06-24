# v2.02-b7 前端交互优化 - 维护日志

**分支**: opt/v2.02-b7  
**日期**: 2026-06-25  
**版本**: 2.02  

---

## 改动概览

### 1. 图片懒加载 (lazy-load)

为所有未添加 `lazy-load` 的 `<image>` 标签统一补充该属性，减少首屏图片并发加载，提升页面首次渲染速度。

**改动文件（25 处 image 标签）**:

| 文件 | 改动数 |
|------|--------|
| `cmpts/public/img/img_upload_cmpt.wxml` | 1 |
| `cmpts/public/modal/modal_cmpt.wxml` | 1 |
| `cmpts/public/poster/poster_cmpt.wxml` | 3 |
| `cmpts/work_pet/work_pet.wxml` | 3 |
| `projects/B00/pages/admin/meet/self/admin_meet_self.wxml` | 1 |
| `projects/B00/pages/admin/setup/qr/admin_setup_qr.wxml` | 1 |
| `projects/B00/pages/default/index/default_index.wxml` | 7 |
| `projects/B00/pages/meet/my_join_detail/meet_my_join_detail.wxml` | 1 |
| `projects/B00/pages/my/index/my_index.wxml` | 1 (已有lazy-load的未改) |
| `projects/B00/pages/tpls/menu_tpl.wxml` | 5 |
| `projects/B00/pages/work/order_edit/work_order_edit.wxml` | 1 |
| `tpls/public/list_load_tpl.wxml` | 1 |

---

### 2. setData 精确路径优化

**文件**: `cmpts/work_pet/work_pet.js`

将 typewriter 打字效果中每次更新整条 `chatMessages` 数组的 setData 调用，改为精确路径更新最后一条消息的 `content` 字段：

**改动前**:
```js
self.setData({ chatMessages: msgs });
```

**改动后**:
```js
let msgLen = messages.length + 1;
self.setData({ [`chatMessages[${msgLen - 1}].content`]: partial });
```

**涉及 3 处**:
1. 短文本快速路径（<30字）：新增精确路径 + chatLoading:false
2. 占位光标设置：新增精确路径同步设置
3. tick() 循环部分更新：改为精确路径只更新 content
4. tick() 终态更新：改为精确路径更新 content + chatLoading:false

---

### 3. 骨架屏组件 (Skeleton)

**新增文件**:
- `cmpts/skeleton/skeleton.wxml` — 3 行带 avatar 的骨架占位结构
- `cmpts/skeleton/skeleton.wxss` — 灰色矩形 + shimmer 渐变动画
- `cmpts/skeleton/skeleton.json` — 组件声明

**样式**: 灰色 #eee 背景矩形，配合 `shimmer` 关键帧动画（1.5s infinite，opacity 1→0.4→1）

**引用页面**:
| 页面 | JSON 注册 | WXML 引用 | 触发条件 |
|------|-----------|-----------|----------|
| `work/calendar/work_calendar` | ✅ | ✅ | `loading="{{!isLoad}}"` |
| `work/order_edit/work_order_edit` | ✅ | ✅ | `loading="{{!options}}"` |

---

### 4. 图片标签 WXSS 优化

经全面扫描，所有 `<image>` 相关的内联 style 和 WXSS 规则已统一使用 rpx 单位，未发现硬编码 px 的情况。无需额外修改。

---

## 未改动（安全确认）

- `cloudfunctions/` 目录未做任何改动
- 已有 `lazy-load` 的 image 标签未重复添加
- `swiper_cmpt.wxml` 已有 lazy-load，未改动

## 提交信息

```
v2.02-b7: frontend UX — lazy-load images, skeleton screens, setData optimization
```
