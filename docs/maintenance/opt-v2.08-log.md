# opt-v2.08-b16 维护日志

## B16: 离线能力

**分支**: `opt/v2.08-b16`
**日期**: 2026-06-25
**版本**: 2.08

---

### 目标

在县城弱网/断网场景下，为小程序提供基础离线能力，避免页面白屏。

### 变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `miniprogram/helper/network_helper.js` | 新建 | NetworkHelper 类：初始化网络状态、监听变化、提供 isConnected/onStatusChange/onReconnect API |
| `miniprogram/helper/cloud_helper.js` | 修改 | 新增 `callCloudCached` 方法，stale-while-revalidate 模式缓存层 |
| `miniprogram/cmpts/offline_bar/offline_bar.js` | 新建 | 离线横条组件逻辑 |
| `miniprogram/cmpts/offline_bar/offline_bar.wxml` | 新建 | 离线横条组件模板 |
| `miniprogram/cmpts/offline_bar/offline_bar.wxss` | 新建 | 离线横条组件样式 |
| `miniprogram/cmpts/offline_bar/offline_bar.json` | 新建 | 离线横条组件配置 |
| `miniprogram/projects/B00/pages/work/calendar/work_calendar.js` | 修改 | 日历月数据使用 callCloudCached，TTL 60s |
| `miniprogram/projects/B00/pages/work/calendar/work_calendar.json` | 修改 | 注册 offline-bar 组件 |
| `miniprogram/projects/B00/pages/work/calendar/work_calendar.wxml` | 修改 | 顶部添加 `<offline-bar />` |
| `miniprogram/app.js` | 修改 | onLaunch 中调用 NetworkHelper.init() |
| `miniprogram/version.js` | 修改 | current 改为 2.08，添加历史记录 |

### 缓存策略

- **模式**: stale-while-revalidate（参考 Next.js SWR）
- **存储**: wx.setStorageSync / wx.getStorageSync
- **TTL**: 日历数据 60s，其他接口可自定义
- **缓存 key 格式**: `cache_{接口}_{参数组合}`（已含 scope 隔离，用户隔离由 token 路径自然隔离，同一设备同一 openid 共享缓存）

### 约束遵守

- 未修改 `cloudfunctions/` 后端
- 未修改 `cmpts/work_pet/` 或 `work_calendar.wxss`
- 离线能力为纯增量，不影响现有在线流程

### 已知局限

- 缓存 key 未硬编码 openid，依赖微信小程序存储的设备级隔离
- offline_bar 在所有页面全局注册需后续迭代（当前仅日历页）
- 写操作（提交/保存）未纳入缓存层，断网仍会失败并弹原有错误提示
