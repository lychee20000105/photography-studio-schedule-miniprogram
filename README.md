> 最新版本：v2.59 小猫小游戏重做

# 摄影工作室档期小程序

基于微信云开发的摄影工作室内部经营小程序，覆盖档期、订单、收款、员工业绩提成、工资结算、后台管理和小猫 AI 助手。

当前本地代码版本：`v2.59`
当前稳定基线：`v2.59.0`
最近本地修改日期：`2026-07-08`

## v2.59.0 Release Notes

小猫小游戏模块已改为两类：小猫店长养成、小猫守店塔防。旧的快拍、翻牌、2048 小游戏入口和逻辑已移除。

关键变化：
- 养成类：饱腹、心情、体力、清洁四项状态，支持喂食、玩耍、休息、清洁。
- 塔防类：员工塔、敌人波次、金币、生命值、得分、胜负结算。
- 每日任务继续和小游戏联动，但不改订单、档期、账号权限和云函数。

验证：
- `node --check miniprogram/helper/game_helper.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/cat_game/work_cat_game.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/cat_game_play/work_cat_game_play.js` 通过。
- `miniprogram/app.json` 和小游戏页面 JSON 解析通过。
- `app.json` 注册页面文件完整性检查通过。
- 微信开发版 `2.59` 已上传成功，包体 `1.6 MB` / `1,649,423 Byte`。

## 版本档案

- 详细更新日志：`CHANGELOG.md`
- 版本修改日记：`docs/version-change-diary.md`

## 安全说明

- 仓库不提交 `node_modules`、`.env`、日志、导出文件和私钥文件。
- 企业微信 Webhook、后台初始化密码、AI 供应商 Key 等敏感配置应通过后台页面、云函数环境变量或受控配置写入，不要写入公开源码。

## License

[MIT](LICENSE)
