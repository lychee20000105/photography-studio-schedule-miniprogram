# opt-v2.07 维护日志

## B17: 暗黑模式支持（2026-06-25）

**分支**: `opt/v2.07-b17`
**范围**: 前端主题系统，不涉及云函数

### 变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `miniprogram/cmpts/theme/theme.wxss` | 新建 | 亮色/暗色两套 CSS 变量（15 个） |
| `miniprogram/theme.json` | 新建 | 微信 darkmode 导航栏+背景色双主题 |
| `miniprogram/app.json` | 修改 | 新增 `darkmode: true` + `themeLocation` |
| `miniprogram/app.wxss` | 修改 | 引入主题变量，背景色改用 `var(--color-bg)`，paper-card 改用变量 |
| `miniprogram/app.js` | 修改 | `applyDarkMode` 方法 + `onThemeChange` 监听 |
| `miniprogram/version.js` | 修改 | current 改为 2.07，新增历史条目 |
| `projects/.../work_calendar.wxss` | 修改 | 暖纸色全部改 CSS 变量，新增暗黑覆盖块 |
| `projects/.../work_my.wxss` | 修改 | 同步适配暗黑模式 |

### 设计决策

1. **CSS 变量而非 JS 切换类名**：利用微信小程序 `page` 级别 CSS 变量支持，暗黑模式切换完全由系统自动触发 `page.dark` 选择器，无需页面手动添加 class。
2. **仅更新 3 个核心文件**：app.wxss（全局）、日历页、我的页面。其他页面保留原有硬编码颜色，亮色模式下视觉不变。
3. **降级安全**：不支持 CSS 变量的基础库会忽略 `var()` 声明，页面回退到各自的硬编码值。
4. **纸纹背景**：暗黑模式下移除纸纹渐变装饰（`background-image: none`），避免浅色纹理在深色背景上不协调。

### 验证要点

- [ ] 亮色模式下所有页面颜色与 v2.06 完全一致
- [ ] 系统设置切换暗黑后，日历页卡片、日格、标签按钮正确变暗
- [ ] 系统设置切换暗黑后，我的页面个人信息、菜单、宠物面板正确变暗
- [ ] 导航栏背景和文字色跟随主题自动切换
- [ ] 不支持 darkmode 的旧基础库仍能正常使用（回退亮色）
