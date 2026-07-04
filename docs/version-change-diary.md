## v2.44 - 2026-07-04

### 改动级别

小改修复，v2.43 -> v2.44，+0.01。

### 本次目标

修复小猫 Agent 前端在流式 HTTP 地址失效、请求失败或超时后卡在发送/思考状态的问题，让用户仍可通过普通 `work/ai_chat` 云函数链路继续使用小猫。

### 主要修改

- `work_pet.js` 的流式请求 `fail` 分支改为先清理流式状态并返回 `false`，交给外层既有普通云函数链路兜底一次。
- 普通 `work/ai_chat` 兜底成功时继续走打字机渲染，兜底失败时由原有错误处理写入聊天记录并释放按钮状态。
- 90 秒安全超时从只释放 `chatLoading` 扩展为同步释放 `chatLoading`、`chatSending`、`chatStreaming`、`chatThinkPhase`。
- 同步版本源到 `2.44`，更新 README、CHANGELOG 和版本日记。

### 涉及文件

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- `node --check miniprogram/version.js` 通过。
- `node --check miniprogram/setting/setting.js` 通过。
- `node tools/verify_live_patch.js` 通过。
- `git diff --check` 通过。

### 部署状态

- 本地修复完成。
- Upload follow-up: fixed work_admin_ai.wxml malformed textarea closing tags and provider editor title ternary expression; WeChat DevTools CLI upload for development version 2.44 succeeded, package size about 1.6 MB.
- 未部署 mcloud 云函数，未提交审核，未发布上线。

## v2.43 - 2026-07-01

### 改动级别

小改优化，v2.42 -> v2.43，+0.01。

### 本次目标

editor_cmpt.js bindTextareaInput 改为路径式 setData 减少 diff 计算量；calendar_lib.js 合并 animation/touchDirection setData 减少无谓调用；tools.wxs 移除死代码。

### 主要修改

- `editor_cmpt.js` bindTextareaInput: 全量 setData({nodeList}) → 路径式 setData({[`nodeList[${idx}].val`]: val})，单字符输入时减少 diff 范围。
- `calendar_lib.js` listTouchEnd: 触屏方向清除合并到 animation setData，消除一次独立 setData 调用。
- `calendar_lib.js` bindToNowTap: animation: fade 合并到 month/year/fold setData，消除一次独立 setData。
- `tools.wxs`: 移除死代码 `module.exports.msg = "hello tools"`。

### 涉及文件

- `miniprogram/cmpts/public/editor/editor_cmpt.js`
- `miniprogram/cmpts/public/calendar/calendar_lib.js`
- `miniprogram/tpls/wxs/tools.wxs`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 覆盖 editor_cmpt.js、calendar_lib.js，语法通过。
- tools.wxs 人工审查，WXS 格式正确。
- git diff --check 无空白问题。

### 部署状态

- 本地修改完成，已推送到 GitHub opt/v2.43-b31 分支。
- 未上传微信开发者工具、未部署 mcloud 云函数。

## v2.42 - 2026-06-25

### 改动级别

小改修复，v2.41 -> v2.42，+0.01。

### 本次目标

清理 AI 配置页和版本文件的中文编码污染，确保本地源码、前端文件和 live patch 可验证一致。

### 主要修改

- 修复 `work_admin_ai.js`、`work_admin_ai.wxml`、`work_admin_ai.wxss` 的乱码和 BOM 问题。
- 同步 `miniprogram/version.js`，当前版本升级为 `2.42`。
- 保留 `tools/fix_admin_ai_encoding.js`、`tools/gen_live_patch.js`、`tools/verify_live_patch.js` 作为本地复核脚本。
- 重新验证 `work_route_live_patch.js`、`work_admin_controller_live_patch.js`、`work_ai_service_live_patch.js` 解压后与源码一致。

### 涉及文件

- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`
- `tools/fix_admin_ai_encoding.js`
- `tools/gen_live_patch.js`
- `tools/verify_live_patch.js`

### 验证结果

- `node tools/verify_live_patch.js` 通过。
- AI 配置页 JS/WXML/WXSS 均为 UTF-8 无 BOM，FFFD 数量为 0。
- 本次未提交审核、未发布上线。

## v2.41 - 2026-06-25

### 改动级别

小改修复，v2.40 -> v2.41，+0.01。

### 本次目标

修复 CC Switch 多供应商配置页落地过程中的中文乱码和版本源不一致问题。

### 主要修改

- 修复 AI 配置页中文文案显示异常。
- 同步 `miniprogram/version.js` 和版本历史。
- 文档只记录供应商入口和模型名称，不记录任何密钥明文。

### 部署状态

- 本地修复与验证完成。
- 未提交审核、未发布上线。

## v2.40 - 2026-06-25

### 改动级别

功能迭代，v2.30 -> v2.40，+0.10。

### 本次目标

将 AI 供应商配置改为 CC Switch 风格的多供应商管理：后端支持 `providers[]` 列表存储，前端提供卡片式供应商切换和独立编辑。

### 主要修改

- 后端存储从单配置改为 `PROVIDERS_STORE_KEY`，维护 `providers[] + activeProviderId`。
- 新增 `_getProvidersConfig`、`_getActiveProviderConfig`、`saveProvidersConfig`、`_getDefaultProviders`。
- 旧 `SETUP_KEY` 单供应商格式自动迁移。
- `chat()` 运行时改为获取活跃供应商配置。
- 前端页面重构：活跃供应商卡、供应商列表、内联编辑器、折叠高级设置。
- 预置 Agnes (`agnes-20-flash`) 和 MiMo (`mimo-v2.5`) 两条供应商入口。
- 路由新增 `work/admin_ai_providers_save`。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_admin_controller_live_patch.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `cloudfunctions/mcloud/work_route_live_patch.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 覆盖所有修改文件，语法通过。
- live patch 解压后与源文件 100% 匹配。

### 部署状态

- 三个 live patch 已增量部署到 `mcloud`。
- 小程序开发版已上传。
- 未提交审核、未发布上线。
## v2.40 - 2026-06-25

### ????

?????v2.30 -> v2.40?+0.10?

### ????

? AI ??????? CC Switch ?????????????? `providers[]` ???????????????????????

### ????

- ?????????? `PROVIDERS_STORE_KEY`??? `providers[] + activeProviderId`?
- ?? `_getProvidersConfig`?`_getActiveProviderConfig`?`saveProvidersConfig`?`_getDefaultProviders`?
- ? `SETUP_KEY` ???????????
- `chat()` ???????????????
- ?????????????????????????????????
- ?? Agnes (`agnes-20-flash`) ? MiMo (`mimo-v2.5`) ????????
- ???? `work/admin_ai_providers_save`?

### ????

- `cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_admin_controller_live_patch.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `cloudfunctions/mcloud/work_route_live_patch.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ????

- `node --check` ??????????????
- live patch ??????? 100% ???

### ????

- ?? live patch ?????? `mcloud`?
- ??????????
- ????????????

## v2.40 - 2026-06-25

### �Ķ�����

���ܵ�����v2.30 -> v2.40��+0.10��

### ����Ŀ��

�� AI ��Ӧ�����ø�Ϊ CC Switch ���Ķ๩Ӧ�̹��������֧�� providers[] �б��洢��ǰ���ṩ��Ƭʽ��Ӧ���л��Ͷ����༭��

### ��Ҫ�޸�

- ��˴洢�ӵ����ø�Ϊ PROVIDERS_STORE_KEY��ά�� providers[] + activeProviderId
- ���� _getProvidersConfig / _getActiveProviderConfig / saveProvidersConfig / _getDefaultProviders
- �� SETUP_KEY ����Ӧ�̸�ʽ�Զ�Ǩ��
- chat() ����ʱ��Ϊ��ȡ��Ծ��Ӧ������
- ǰ��ҳ���ع�����Ծ��Ӧ�̿�����Ӧ���б��������༭�����۵��߼�����
- Ԥ�� Agnes (agnes-20-flash) �� MiMo (mimo-v2.5) ������Ӧ��
- ·������ work/admin_ai_providers_save

### �漰�ļ�

(�г� 3 ����� + 3 ��ǰ�� + 3 �� live patch + �汾�ļ�)

### ��֤���

- node --check ���������޸��ļ����﷨ͨ��
- live patch ��ѹ����Դ�ļ� 100% ƥ��

### ����״̬

- ���� live patch ���������� mcloud
- С���򿪷������ϴ�
- δ�ύ��ˡ�δ��������
# �汾�޸��ռ�


## v2.03 - 2026-06-24

### �Ķ�����

�¹���+Bug�޸���v2.02 -> v2.03��

### ����Ŀ��

ǰ�˽��������Ż������Bugɨ���޸���

### ��Ҫ�޸�

- ������ҳ��Ƭ�볡������ǩ����ť������Ч����Դ���ֹ���Ч��
- ��Ϸҳ3-2-1��������ʱ��������ⷴ�����÷�������Ч
- ����ʱ����30���ɫ������ʾ������ҳ������ף����
- ��ʱ��й©�޸������ٵ���������洢�쳣�߽紦��
- ��Դ��ֵ����У�顢ҳ���л�״̬�ָ�


## v2.02 - 2026-06-24 12:00 CST

### �Ķ�����

�¹��ܣ�v2.01 -> v2.02��

### ����Ŀ��

��Сè���ֳ���ϵͳ�����ϣ���������С��Ϸ���ܡ��û���"�ҵ�"ҳ���������"Сè����"��ť����������Ϸ��ҳ���ںϳ������� + ��ЧС��Ϸ��3����һ�֣�����"С��Ϊ���칤����Ŭ������"Ϊ��������

### ��Ҫ�޸�

- ���� `helper/game_helper.js` ��Ϸ���ݹ���ģ�飺Storage Key ���塢Ĭ��״̬����д��������Դ����������������ÿ��ǩ��������������㡢��Ϸ��־������״̬˫��ͬ����
- ���� `work_cat_game` ������ҳ���Զ��嵼��������Դ��ʾ�����/�ز�/��У����������浯����è��״̬��壨�ȼ�/�׶�/����������ÿ��ǩ��������С��Ϸ��ڡ��̵�/װ��ռλ��
- ���� `work_cat_game_play` ��Ϸִ��ҳ����Ϸ���ܡ��淨˵����3���ӵ���ʱ������÷֡����㵯�������/�ز�/���/���齱��������Ϸ��־д�롣
- �ҵ�ҳ�������"����"��ť��Ϊ"Сè����"����ת�� `cat_game` ҳ�档
- `app.json` ע��������ҳ��·�ɡ�

### �漰�ļ�

- ������`miniprogram/helper/game_helper.js`
- ������`miniprogram/projects/B00/pages/work/cat_game/work_cat_game.js`
- ������`miniprogram/projects/B00/pages/work/cat_game/work_cat_game.wxml`
- ������`miniprogram/projects/B00/pages/work/cat_game/work_cat_game.wxss`
- ������`miniprogram/projects/B00/pages/work/cat_game/work_cat_game.json`
- ������`miniprogram/projects/B00/pages/work/cat_game_play/work_cat_game_play.js`
- ������`miniprogram/projects/B00/pages/work/cat_game_play/work_cat_game_play.wxml`
- ������`miniprogram/projects/B00/pages/work/cat_game_play/work_cat_game_play.wxss`
- ������`miniprogram/projects/B00/pages/work/cat_game_play/work_cat_game_play.json`
- �޸ģ�`miniprogram/app.json`
- �޸ģ�`miniprogram/projects/B00/pages/work/my/work_my.js`
- �޸ģ�`miniprogram/projects/B00/pages/work/my/work_my.wxml`
- �޸ģ�`miniprogram/setting/setting.js`
- �޸ģ�`miniprogram/version.js`
- �޸ģ�`CHANGELOG.md`
- �޸ģ�`docs/version-change-diary.md`

### ��֤���

- ΢�ſ����߹�����"�ҵ�"ҳ����������ʾ"Сè����"��ť��
- �������������ҳ����ʾè��״̬����Դ��ǩ����С��Ϸ��ڡ�
- ���С��Ϸ����ִ��ҳ������ʱ�͵���÷�������
- ���㵯����ʾ��ȷ������д�뱾�ش洢��
- ����������ҳ����Դ/�����Ѹ��¡�


## v2.00 - 2026-06-24 21:46 CST

### �Ķ�����

С���޸���v1.99 -> v2.00��

### ����Ŀ��

�����޸�Сè��̨���ԶԻ��� MiMo ���� `Param Incorrect` �����⡣��ͼ��ʾ�ƶ��԰Ѳ�������ԭ�����أ�˵�� MiMo ���������ֶθ����У����ΰ� MiMo ���ն�������ѹ������С�ֶΣ��ȱ�֤��ͨ���ԶԻ�����ͨ��

### ��Ҫ�޸�

- `work_ai_service.js` �� MiMo �ı����������Ƴ� `stream:false`��ֻ���� `model` �� `messages`��
- ��˴���������� `message`��`msg` ���ַ����� `error` ���ݣ����ٵ������ӿڴ�����̬������������С�
- �������� `work_ai_service_live_patch.js`��ֻ�滻���е� AI ���� payload�����ѵ�ǰ����������δ�ύ�Ķ����벹����
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v2.00��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json` �� `project.config.json` JSON ����ͨ����
- `work_ai_service_live_patch.js` ��ѹ���뵱ǰ `work_ai_service.js` һ�£�MiMo ���׿�ȷ�ϲ��ٰ��� `stream` �ֶΡ�
- �����漰�ļ� `git diff --check` ͨ�������м��� LF/CRLF ��ʾ��
- ������Ϣɨ��δ�����û� API Key Ƭ�Ρ�

### ����״̬

- `work_ai_service_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `47.2 KB`��
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `2.00`������ `1.5 MB` / `1,601,017 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- ��� MiMo �Է��ز���������Ҫ��һ��ץȡ����ʵ��Ӧ�ṹ�������ѱ����¼������κ� API Key��

## v1.99 - 2026-06-24 21:37 CST

### �Ķ�����

С���޸���v1.98 -> v1.99��

### ����Ŀ��

������ȫСè Agent �İ�ȫ�����㣺�߷��ն�������ȷ�϶��к󣬴�ȷ�ϡ��˹�ȷ��ִ�С����غ�ִ��ʧ�ܶ�Ҫ���� AI �����ˮ���������Ա��ʱ���߸��̡�

### ��Ҫ�޸�

- `WorkAgentConfirmService` ������ȷ�ϼ�¼��׷��д�� `agent_confirm_pending` ����������ơ�
- ����Աȷ��ִ�гɹ���׷��д�� `agent_confirm_approved` ����������ơ�
- ����Ա����ȷ�������׷��д�� `agent_confirm_rejected` ����������ơ�
- ȷ��ִ��ʧ��ʱ��׷��д�� `agent_confirm_failed` ����������ƣ���������������ժҪ��
- �����������ժҪͳһ����ȷ�ϼ�¼ ID��ԭ�������������󡢷����ˡ������ˡ����ձ�ǩ����������Ԥ����
- AI �����ˮ�б�ҳ������ҳ����ȷ����������ɸѡ����鸴���İ�����ʾ��¼��Դ��ȷ�϶����������ڡ�
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v1.99��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_agent_confirm_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` ����ȷ�Ϸ�����Ʒ�������б�ҳ���������ҳ���汾Դ�������ļ������� live patch����ͨ����
- `miniprogram/app.json`������б�/����ҳ JSON �� `project.config.json` JSON ����ͨ����
- `work_ai_service_live_patch.js` ��ѹ��ȷ�Ϸ���ȱ��������뵱ǰԴ�ļ�һ�£�`work_ai_service.js` ʹ�����ύ HEAD �汾�Ը����޹�δ�ύ�Ķ���`work_admin_controller_live_patch.js` ��ѹ���뵱ǰԴ�ļ�һ�¡�
- live patch ʵ�ʼ��ؼ��ͨ������������Ŀ���� `ws` ������ʾ����Ӱ�챾�� patch ע�롣
- �����漰�ļ� `git diff --check` ͨ�������м��� LF/CRLF ��ʾ��
- ������Ϣɨ��δ�������� API Key��Token �� Secret��

### ����״̬

- `work_ai_service_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `47.1 KB`��
- `work_admin_controller_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `12.2 KB`��
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.99`������ `1.5 MB` / `1,600,436 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- ����ֻ��ȷ�϶�������������ƣ����������桢��������ļ����ն˿���������ȷ�Ϻ��ҵ���������������ܿغ�˷���

## v1.98 - 2026-06-24 21:24 CST

### �Ķ�����

С���޸���v1.97 -> v1.98��

### ����Ŀ��

��Сè���ֺ�̨ AI ����ҳ�ĳɸ������ֻ��˲����Ĺ�Ӧ�����ý��棺�� CC Switch һ����ѡ��Ӧ�̿�Ƭ���ٽ���༭�����д Base URL��API Key���ı�ģ�ͺ��Ӿ�ģ�͡�

### ��Ҫ�޸�

- ��Ӧ�������ԭ���ĳ�������Ϊ��Ƭʽ�б���չʾ Agnes��DeepSeek��OpenAI��Mimo �͵�ǰ�Զ������á�
- ������Ӧ�̱༭��壬������д��Ӧ�����ơ���ע��������API �����ַ��API Key���ı�ģ�� ID���Ӿ�ģ�� ID ���Ӿ��ӿڵ�ַ��
- �༭���֧�� API Key ֱ��ճ������ʾ/���ء�������룬����������յ�ǰ�ѱ����� Key�����ء�
- Ӧ�ù�Ӧ�̺�ͬ�����µ�ǰ������ģ��ѡ��״̬�������Ĺ��㣻����ɹ���ˢ�¹�Ӧ�̿�Ƭ״̬��
- ���� Mimo Ĭ�Ͻӿں� `mimo-v2.5` Ĭ��ģ�ͣ�ͬʱ���������ã�����Ա�Կ��л� DeepSeek���Զ�����ݽӿںͶ����Ӿ�ģ�͡�
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v1.98��

### �漰�ļ�

- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json` �� `project.config.json` JSON ����ͨ����
- AI ����ҳ WXML `view` �� `button` ��ǩ���� sanity check ͨ����
- �����漰�ļ� `git diff --check` ͨ�������м��� LF/CRLF ��ʾ��
- ������Ϣɨ��δ�����û� API Key Ƭ�Ρ�

### ����״̬

- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.98`������ `1.5 MB` / `1,599,214 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- ��ǰ�汾�����ú�˵��� AI ���ñ���ģ�ͣ������ɱ༭�����浱ǰĬ�Ϲ�Ӧ�̣�����δ�Ѷ����Ӧ�̸��Ե� Key �־û��ɶ������õ�����

## v1.97 - 2026-06-24 21:11 CST

### �Ķ�����

С���޸���v1.96 -> v1.97��

### ����Ŀ��

������ȫСè Agent �İ�ȫ�����㣺�߷���ҵ���������� AI �Ի�ֱ����⣬���������ɹ���Աȷ�����룬���ɹ���Ա�ڹ�������ȷ�ϻ򲵻ء�

### ��Ҫ�޸�

- ���� `bx_work_agent_confirm` ȷ�϶���ģ�ͣ���¼�����������������ˡ���������״̬�������˺�ִ�н����
- ���� `WorkAgentConfirmService`���ṩ������ȷ�ϡ��б�ɸѡ����ʼȷ�ϡ����ȷ�ϡ�ִ��ʧ�ܼ�¼�Ͳ���������
- `work_ai_service.js` ���� `cancel_order`��`save_payment`��`void_payment`��`pay_payroll`��`audit_order`����д��ȷ�϶��У���ֱ���޸Ķ��������񡢹��ʻ�������ݡ�
- `work_admin_controller.js` ����ȷ�϶����б���ȷ��ִ�С����ؽӿڣ�ȷ��ִ�и���ԭСèҵ��ִ�к�������ʹ�õ�ǰ����Ա���ݡ�
- ����������ҳ�� `admin_agent_confirm`��֧��״̬/����ɸѡ��ȷ��ִ�С����ء��鿴����������ִ�н����
- ����������ҳ������AIȷ�϶��С���ڡ�
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v1.97��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/model/work_agent_confirm_model.js`
- `cloudfunctions/mcloud/project/B00/service/work_agent_confirm_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `miniprogram/projects/B00/pages/work/admin_agent_confirm/*`
- `miniprogram/app.json`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` ��������ȷ��ģ�͡�ȷ�Ϸ���AI ���񡢹����˿�������·�ɡ�ȷ�϶���ҳ�� JS���汾Դ�������ļ������� live patch����ͨ����
- `miniprogram/app.json`��ȷ�϶���ҳ�� JSON �� `project.config.json` JSON ����ͨ����ȷ�϶���ҳ����ע�ᡣ
- ȷ�϶���ҳ�� WXML view ��ǩ���� sanity check ͨ����δ�����쳣 `/view>` �պϡ�
- `work_ai_service_live_patch.js`��`work_admin_controller_live_patch.js`��`work_route_live_patch.js` ��ѹ���뵱ǰԴ�ļ�һ�¡�
- live patch ʵ�ʼ��ؼ��ͨ������������Ŀ���� `ws` ������ʾ����Ӱ�챾�� patch ע�롣
- �����漰�ļ� `git diff --check` ͨ�������м��� LF/CRLF ��ʾ��
- ������Ϣɨ��δ�������� API Key��Token �� Secret���ֶ�У����� `apiKey: string|max` �����󱨣����ų���

### ����״̬

- `work_ai_service_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `46.2 KB`��
- `work_admin_controller_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `11.1 KB`��
- `work_route_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `2.8 KB`��
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.97`������ `1.5 MB` / `1,598,534 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- ����ֻ�� AI ����ĸ߷��ն�������ȷ�϶��У��˹�������ԭ���տ���ʡ��������԰�ԭ����ִ�С�
- ȷ�϶��еĲ��ر�ע��ǰΪ�̶��ı��������ɲ�һ�����뵯��������ҳ��

## v1.96 - 2026-06-24 20:52 CST

### �Ķ�����

С���޸���v1.95 -> v1.96��

### ����Ŀ��

�޸�С���ͼ�С����ԶԻ����Է��� `Param Incorrect` �����⡣�����ж�Ϊ�ƶ�ʵ�������Կ���Я����ģ�� ID���� MiMo ģ�ͣ��� MiMo ������ Agent �����ʾ������ṹ�����ݣ������ں�������ף������Ǽ����ù���Ա�����ֶ������á�

### ��Ҫ�޸�

- `work_ai_service.js` ���� MiMo API ʶ���ģ�� ID �淶����
- MiMo ��ַ���Զ��� `mimov2.5` �淶Ϊ `mimo-v2.5`�����Ѿ�������ķ� MiMo ģ�ͻ��䵽 `mimo-v2.5`��
- �� MiMo ������ Agent �������С���������Է��ز�������ʱ���ٷ����ִ��ı������������ȱ�֤���ԶԻ�����ͨ�ʴ���á�
- �Ӿ�ģ�������Ա������գ���ǿ��д��Ĭ���Ӿ�ģ�͡�
- �������ɲ�׼������ `work_ai_service_live_patch.js`��ȷ���ƶ� mcloud ʹ���°� AI �����߼���
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v1.96��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json` �� `project.config.json` JSON ����ͨ����
- `work_ai_service_live_patch.js` ��ѹ���� `work_ai_service.js`��`work_ai_agent_registry.js`��`work_ai_agent_memory.js`��`work_agent_audit_model.js` Դ��һ�¡�
- live patch ʵ�ʼ��ؼ��ͨ������������Ŀ���� `ws` ������ʾ����Ӱ�챾�� patch ע�롣
- �����漰�ļ� `git diff --check` ͨ�������м��� LF/CRLF ��ʾ��
- ������Ϣɨ��δ�������� API Key��Token �� Secret��

### ����״̬

- `work_ai_service_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `41.9 KB`��
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.96`������ `1.5 MB` / `1,569,589 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- MiMo ���ı����ױ�֤���ԶԻ�����ͨ�ʴ���ã����Ҫ�ø��� Agent д�붯��Ҳ��ȫ�ȶ����Խ�������ø�ǿ�ļ���ģ�ͻ򵥶����� MiMo �� JSON ��Ϊ��
- �����Բ����û��ṩ�� Key д��Դ�롢��־���ύ��

## v1.95 - 2026-06-24 20:34 CST

### �Ķ�����

С���޸���v1.94 -> v1.95��

### ����Ŀ��

�����ο� Hanako/HanaAgent ������ġ�������׷�١��ɸ��̡����������߼�����Сè Agent �������ˮ�Ӵ��ı���������Ϊ���ı� + �����ṹ��ժҪ������һ���������κ�д��Ȩ�ޣ����ú����Զ����̡��߷���ȷ�϶��к͹���ͳ���и��ȶ������ݻ�����

### ��Ҫ�޸�

- `work_agent_audit_model.js` ���� `AGENTAUDIT_ACTION_SUMMARY` �����ֶΡ�
- `work_ai_service.js` �� `_addAgentAuditLog` д��ʱ�Զ����ɽṹ��ժҪ���������������յȼ����Ƿ������Ա���顢�������󡢱��⡢��������Ԥ�����ؼ��źš����ձ�ǩ�Ͱ�ȫ���ߡ�
- �ṹ��ժҪ�������ֻ��š���������� Key/Token Ƭ�Σ�ֻ������������Ԥ����ҵ��������
- `work_agent_audit_service.js` ����ӿڷ��� `AGENTAUDIT_ACTION_SUMMARY`���ɼ�¼û��ժҪʱ����������б��⡢���ݡ����պ͹���������ʱ���ɼ���ժҪ��
- AI �������ҳ�������ṹ��ժҪ�����飬չʾժҪ�汾�����齨�顢��ȫ���ߡ�������������Ԥ�����źźͱ�ǩ��
- �������� `work_ai_service_live_patch.js` �� `work_admin_controller_live_patch.js`��ȷ���ƶ� mcloud ʹ������ AI д��Դͷ�����ģ�͡���Ʒ��������ӿڡ�
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v1.95��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/model/work_agent_audit_model.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `cloudfunctions/mcloud/work_admin_controller_live_patch.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.wxml`
- `miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.wxss`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/model/work_agent_audit_model.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check cloudfunctions/mcloud/work_admin_controller_live_patch.js` ͨ����
- `node --check miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.js` ͨ����
- `node --check miniprogram/version.js` �� `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json`��`work_admin_agent_audit_detail.json` �� `project.config.json` JSON ����ͨ�����汾Դȷ�ϵ�ǰΪ `1.95`��
- AI �������ҳ WXML view ��ǩ���� sanity check ͨ����δ�����쳣 `/view>` �պϡ�
- `work_ai_service_live_patch.js` ��ѹ���� `work_ai_service.js`��`work_ai_agent_registry.js`��`work_ai_agent_memory.js`��`work_agent_audit_model.js` Դ��һ�¡�
- `work_admin_controller_live_patch.js` ��ѹ���� `work_agent_audit_service.js`��`work_agent_audit_model.js`��`work_admin_controller.js` Դ��һ�¡�
- live patch ʵ�ʼ��ؼ��ͨ������������Ŀ���� `ws` ������ʾ����Ӱ�챾�� patch ע�롣
- �����漰�ļ� `git diff --check` ͨ�������м��� LF/CRLF ��ʾ��
- ������Ϣɨ��δ�������� API Key��Token �� Secret��

### ����״̬

- `work_ai_service_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `41.2 KB`��
- `work_admin_controller_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `7.1 KB`��
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.95`������ `1.5 MB` / `1,568,838 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- ����ֻ����ṹ��ժҪ�����ı�д��ִ�����̣��߷��ն���������ӡ����˹�ȷ�ϡ��Ļ����������������ƣ�����ֱ�ӸĶ����ʡ��տ��˵�����ҵ��ջ���
- ��ʷ��ˮ���������ʵ����������ֻ��������ӿڻ��ھ��ı����ɼ���ժҪ��

## v1.94 - 2026-06-24 20:17 CST

### �Ķ�����

С���޸���v1.93 -> v1.94��

### ����Ŀ��

��������Сè Agent �Ŀɹ����ԣ�AI �����ˮ��ֻͣ�����б���ͳ�ƣ�����Ա���Ե㿪������¼���鿴����������ݡ���������Ͱ�ȫ����ժҪ������ѡ�Сè����ʲô��˭�����ġ����������׷�����

### ��Ҫ�޸�

- `work_agent_audit_service.js` ���� `getAuditDetail`������Ƽ�¼ ID ���ص�����Ч��¼�����Է������������ȿ��ơ�
- `work_admin_controller.js` ���� `getAgentAuditDetail`������С�������ԱȨ��У�顣
- `route.js` ���� `work/admin_agent_audit_detail` ֻ��·�ɡ�
- `work_admin_agent_audit.js` �����б���Ƭ������ת��
- `work_admin_agent_audit.wxml` �б���Ƭ֧�ֵ���������飬������ͳ�������쳣�պϱ�ǩ��
- ���� `admin_agent_audit_detail` ҳ�棬չʾ������Ϣ������������ݺͰ�ȫ����ժҪ��֧������ˢ�¡�
- `miniprogram/app.json` ע�� AI �������ҳ��
- �������� `work_admin_controller_live_patch.js` �� `work_route_live_patch.js`��ȷ���ƶ� mcloud ʹ�����¿���������Ʒ����·�ɡ�
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v1.94��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js`
- `cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `cloudfunctions/mcloud/work_admin_controller_live_patch.js`
- `cloudfunctions/mcloud/work_route_live_patch.js`
- `miniprogram/app.json`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.wxml`
- `miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.wxml`
- `miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.wxss`
- `miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.json`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/public/route.js` ͨ����
- `node --check cloudfunctions/mcloud/work_admin_controller_live_patch.js` ͨ����
- `node --check cloudfunctions/mcloud/work_route_live_patch.js` ͨ����
- `node --check miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js` ͨ����
- `node --check miniprogram/projects/B00/pages/work/admin_agent_audit_detail/work_admin_agent_audit_detail.js` ͨ����
- `node --check miniprogram/version.js` �� `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json`��`work_admin_agent_audit.json`��`work_admin_agent_audit_detail.json` �� `project.config.json` JSON ����ͨ��������ҳ��ע�ᡣ
- AI ����б�ҳ������ҳ WXML view ��ǩ���� sanity check ͨ����δ�����쳣 `/view>` �պϡ�
- `work_admin_controller_live_patch.js` ��ѹ���� `work_agent_audit_service.js`��`work_agent_audit_model.js`��`work_admin_controller.js` Դ��һ�¡�
- `work_route_live_patch.js` ��ѹ���� `route.js` Դ��һ�¡�
- live patch ʵ�ʼ��ؼ��ͨ������������Ŀ���� `ws` ������ʾ����Ӱ�챾�� patch ע�롣
- �����漰�ļ� `git diff --check` ͨ�������м��� LF/CRLF ��ʾ��
- ������Ϣɨ��δ�������� API Key��Token �� Secret��

### ����״̬

- `work_admin_controller_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `6.5 KB`��
- `work_route_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `2.8 KB`��
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.94`������ `1.5 MB` / `1,566,038 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- ��ǰ����ҳչʾ�����Ѵ������ģ����ı��⡢���ݡ����������պ͹���������ʷ��ˮû�е�������ģ��ԭʼ JSON����ˡ�ԭʼ���߲��� / ģ�ͷ��ؽṹ���Ķ����ֶ���Ҫ�����汾�����д��Դͷ������ǿ��

## v1.93 - 2026-06-24 20:02 CST

### �Ķ�����

С���޸���v1.92 -> v1.93��

### ����Ŀ��

��������Сè Agent ����Ʊջ�������Ա��ֻҪ�ܿ���ÿ�� AI д����ˮ����Ҫ���ȿ�����ǰɸѡ�µķ��շֲ������Ƶ���������ƵԱ�������㸴��Сè�Ƿ��ڱ�����ʹ�á��Ƿ���ָ߷��ռ��в�����

### ��Ҫ�޸�

- `work_agent_audit_service.js` ������б����� `stats` ժҪ��ͳ�Ƶ�ǰɸѡ�����µ��������߷��ա�������غ���ͨ��¼��
- ���ͳ�ƻ������ `500` ��ƥ���¼���ɶ��� Top ��Ա�� Top������һ����ɨ�������ʷ���ݡ�
- `work_admin_agent_audit.js` ���� `stats` ��ʽ���߼������ö����ͷ����İ���
- `work_admin_agent_audit.wxml` ����ͳ����壬չʾɸѡ�������߷��ա�������ء���ͨ�������������ද�������Ա����
- `work_admin_agent_audit.wxss` ����ͳ�ƿ�Ƭ��ժҪ����ʽ�����ֹ�����ֽ̨�ʿ�Ƭ���
- �������� `work_admin_controller_live_patch.js`��ȷ���ƶ� mcloud ʹ��������Ʒ���
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v1.93��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js`
- `cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js`
- `cloudfunctions/mcloud/work_admin_controller_live_patch.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.wxml`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.wxss`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js` ͨ����
- `node --check cloudfunctions/mcloud/work_admin_controller_live_patch.js` ͨ����
- `node --check miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js` ͨ����
- `node --check miniprogram/version.js` �� `node --check miniprogram/setting/setting.js` ͨ����
- `work_admin_controller_live_patch.js` ��ѹ���� `work_agent_audit_service.js`��`work_agent_audit_model.js`��`work_admin_controller.js` Դ��һ�¡�
- `work_admin_agent_audit.json`��`miniprogram/app.json` �� `project.config.json` JSON ����ͨ����
- �����漰�ļ� `git diff --check` ͨ����ȫ�ּ�����ܼ����޹����ļ� trailing whitespace Ӱ�졣
- ������Ϣɨ��δ�������� API Key��Token �� Secret��

### ����״̬

- `work_admin_controller_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `5.6 KB`���״β������ʱ�޽�������Գɹ���
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.93`������ `1.5 MB` / `1,558,739 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- ͳ��ժҪ���ڵ�ǰɸѡ����� `500` ��ƥ����Ƽ�¼���ɶ�����Ա�� Top������ʷ��¼�����÷�Χʱ��Top �ǽ�����Ӫ�ӽǣ�������ȫ����ʷ������

## v1.92 - 2026-06-24 19:43 CST

### �Ķ�����

С���޸���v1.91 -> v1.92��

### ����Ŀ��

�� AI ����ҳ���еġ�Agent �����߽硱չʾ�ӵ�Сè��˼���ע������ù���Ա�����ļ��ܡ�������д�������͸߷�������������ʵע�����������������Ŀ¼ֻ��������������ʱ����Ĺ��ߣ������ƹ�Ȩ�޺���ơ�

### ��Ҫ�޸�

- `work_ai_agent_registry.js` ������������Ŀ¼�����������ܡ�������д�붯���͸߷��ն�������ֻ��ժҪ��
- `work_ai_service.js` �ڹ���Ա AI ���ýӿڷ��� `agentCatalog`�����������������ڲ���ʾ�ʡ�Key ��Ự���ݡ�
- `work_admin_ai.js` Ĭ�ϱ������� `agentCatalog` �սṹ������ɽӿڻ����������ҳ���ȡ����Ŀ¼ʱ������
- `work_ai_service_live_patch.js` �������ɣ�ȷ���ƶ� mcloud ʹ������ AI ����ͼ���ע�����
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v1.92��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` ͨ����
- `node --check miniprogram/version.js` �� `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json`��`work_admin_ai.json` �� `project.config.json` JSON ����ͨ����
- Agent ����Ŀ¼�������ͨ������ǰչʾ `10` �����ܡ�`17` ��������`12` ��д�붯���� `5` ���߷��ն�����
- `work_ai_service_live_patch.js` ��ѹ���� `work_ai_service.js`��`work_ai_agent_registry.js`��`work_ai_agent_memory.js`��`work_agent_audit_model.js` Դ��һ�¡�
- �����漰�ļ� `git diff --check` ͨ����ȫ�ּ�����ܼ����޹����ļ� trailing whitespace Ӱ�졣
- ������Ϣɨ��δ�������� API Key��Token �� Secret��

### ����״̬

- `work_ai_service_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `40.3 KB`���״β�������һ�� `ECONNRESET`�����Գɹ���
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.92`������ `1.5 MB` / `1,555,760 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- ����Ŀ¼Ŀǰ��ֻ�����ӻ������ṩ����ʱ���أ�������Ҫ������Ա���أ���Ҫͬ�����Ȩ��У�顢��ƺ͸߷���ȷ�ϣ�������ֻ��ǰ�����ذ�ť��

## v1.91 - 2026-06-24 19:32 CST

### �Ķ�����

С���޸���v1.90 -> v1.91��

### ����Ŀ��

���С���ͼ�� AI ����ҳ�ֻ��˲����������⣺����Сè�ڵ����������ֶα�ǩ��խ���¼�ѹ��Key ճ���ͱ��水ť����˳�֡������ο� Hanako/HanaAgent �ķֲ��߼�����Сè Agent ���м���ע������ӻ�������Ա�鿴���á�����ʲô����Щ������д��/�߷��ա���͸������������ v1.90 �� Mimo Ĭ��ֵ��Ĭ�ϲ���������������Ա�Կ������޸Ľӿڡ�ģ�ͺ� Key��

### ��Ҫ�޸�

- `work_admin_ai.wxml` �Ƴ�����ҳ����Сè����������ڵ����桢���ԡ�ģ��ѡ��� Key ��������
- `work_admin_ai.wxss` ǿ����ǩ��Key ������ť�����ÿ鲼�֣�����խ����ѹ���󴥡�
- `work_ai_agent_registry.js` ������������Ŀ¼�����������ܡ�������д�붯���͸߷��ն�������ֻ��ժҪ��
- `work_ai_service.js` �ڹ���Ա AI ���ýӿڷ��� `agentCatalog`�����������������ڲ���ʾ�ʡ�Key ��Ự���ݡ�
- `work_admin_ai.wxml` / `work_admin_ai.wxss` ������Agent �����߽硱���飬չʾСè���ü��ܡ������ͷ��ձ�ǩ��
- `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ�ͬ�������� v1.91��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` ͨ����
- `node --check miniprogram/version.js` �� `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json`��`work_admin_ai.json` �� `project.config.json` JSON ����ͨ����
- Agent ����Ŀ¼�������ͨ������ǰչʾ `10` �����ܡ�`17` ��������`12` ��д�붯���� `5` ���߷��ն�����
- `work_ai_service_live_patch.js` ��ѹ���� `work_ai_service.js`��`work_ai_agent_registry.js`��`work_ai_agent_memory.js`��`work_agent_audit_model.js` Դ��һ�¡�
- �����漰�ļ� `git diff --check` ͨ����ȫ�ֿ������ܼ����޹����ļ� trailing whitespace Ӱ�졣
- ������Ϣɨ��δ�������� API Key��Token �� Secret��

### ����״̬

- `work_ai_service_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `40.3 KB`���״β�������һ�� `ECONNRESET`�����Գɹ���
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.91`������ `1.5 MB` / `1,555,366 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- �����Բ����û��ṩ�� Key д��Դ�롢�汾��־���ύ�����������������Ա���� Key ���ģ�ͣ���Ҫ���°� AI ����ҳ����һ�����ú���Ч��

## v1.90 - 2026-06-24 18:57 CST

### �Ķ�����

С���޸���v1.89 -> v1.90��

### ����Ŀ��

��С��ָ������Сè����Ĭ�Ϸ����̸ĳ�С�� MiMo��Ĭ�Ͻӿ�ʹ��С�� MiMo OpenAI ���ݵ�ַ��Ĭ��ģ��ʹ�� `mimo-v2.5`��ͬʱ��������ҳ�������޸� Base URL��ģ�ͺ� Key ��������

### �� AI ���ۺ���������

- С���ṩ�� Key ����������Ϣ������д��Դ�롢�汾��־���ύ��Ϣ�򹫿��ĵ���
- ��Ĭ�ϡ�ֻ���������úͿ��Ԥ��ĳ�ʼֵ����Ӧ��������Ա�޸ġ�
- �û���ͷ˵�� `mimov2.5` ʵ�ʿ���ģ�� ID �� `mimo-v2.5`�������ַ�д���ᴥ�� `Param Incorrect`��
- �������ø� Key ��֤ `mimo-v2.5` �ı��ӿڿɷ��� 200 �����Ļظ���

### ��Ҫ�޸�

- `work_admin_ai.js` ��Ĭ�ϱ�����Ϊ `Mimo + https://api.xiaomimimo.com/v1 + mimo-v2.5`��
- `work_admin_ai.js` �� Mimo Ԥ��ӿհ��Զ����Ϊ������ Mimo ��ַ��ģ�ͣ�����������Ա�ֶ��޸�������
- `work_ai_service.js` ���ƺ���Ĭ�� AI ����ͬ���л�Ϊ Mimo �� `mimo-v2.5`��
- ���� `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ��� v1.90��

### �漰�ļ�

- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` ͨ����
- `node --check miniprogram/cmpts/work_pet/work_pet.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json` �� `project.config.json` JSON ����ͨ����
- `work_ai_service_live_patch.js` ��ѹ���� `work_ai_service.js`��`work_ai_agent_registry.js`��`work_ai_agent_memory.js`��`work_agent_audit_model.js` һ�¡�
- ������Ϣɨ��ͨ�����û��ṩ�� Key δд��ֿ��ļ���
- ����ֱ��С�� MiMo �ӿ���֤ `mimo-v2.5` ���� 200 �����Ļظ���
- live patch ���ؼ��ͨ������������Ŀ���� `ws` ������ʾ����Ӱ�챾�� patch ע�롣
- `git diff --check` ͨ�������� Windows ������ʾ��

### ����״̬

- `work_ai_service_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `40.1 KB`��
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.90`������ `1.5 MB` / `1,550,460 Byte`��
- ����δ�ύ��ˡ�δ�������ߡ�

### δ��ɷ���

- ��ǰ����û����Ѷ�� `secretId/secretKey`������ֱ���ñ��� Node SDK д�������ݿ� `WORK_AI_CHAT_CONFIG`������̬�Ƿ������������о����ã����Թ���ҳ�������ƶ�����Ϊ׼��

## v1.89 - 2026-06-24 18:58 CST

### �Ķ�����

С���޸���v1.88 -> v1.89��

### ����Ŀ��

�����ο� HanakoAgent �ġ�����㡱˼·����Сè��һ����ȫ�ɿصĳ��ڼ�����ڡ��Ȳ����Զ�ѧϰ�������������Զ������������һ���Կͻ���Ϣ���������д�����������ģ�����ֻ��������Ա�� AI ����ҳ�ֶ�ά���ȶ�����

### �� AI ���ۺ���������

- С������ĳ��ڼ����������� Agent �����أ������Զ�д�ͻ���˽���ֻ��š���Կ��һ�����������ݡ�
- ��������Ӧ���ǵ��ڳ�����Ч�Ĺ������籨�ۿھ����Ŷ�Ĭ��ϰ�ߡ��ͻ�����ԭ�򡢳��÷�����͡�
- ����ע�벻��������ݿ���ʵ���漰���������տ���ʡ���˵ȶ����Ա����ߺ�̨У�����ʵ���ݡ�
- �Ȱѹ���Ա�ɿصļ���Ƭ����ͨ���ٿ��Ǻ����ķֽ�ɫ֪ʶ�⡢�ɼ���Χ�ͼ������ҳ��

### ��Ҫ�޸�

- `work_ai_service.js` �������� `memoryEnabled` �� `memoryText`������ʱ�����Ȳü����湫�����÷���ǰ�ˡ�
- `work_ai_service.js` ����Сè��ʾ��ʱ��������ע�롰����Աά���ĳ��ڼ���/���ڹ��򡱣���׷�ӡ�ֻ���ο������������ݿ���ʵ���ı߽�˵����
- `work_admin_ai.js` Ĭ�ϱ����ͱ�������֧�ֳ��ڼ����ֶΡ�
- `work_admin_ai.wxml` �ڡ�Сè��Ϊ�������������ڼ��俪�ء��ı���Ͱ�ȫ˵����
- `work_pet.js` ��Сè Agent ��Ϣ����Ϊ `0.4.0 ����Ա���ڼ���`��
- ���� `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ��� v1.89��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- ���� v1.90 ����У��һ��ͨ������� AI ����AI ����ҳ��Сè������汾Դ�������ļ���JSON ���ú� live patch һ���Ծ�ͨ����

### ����״̬

- ���� v1.90 ������� `work_ai_service_live_patch.js` ��������һ���ϴ���δ�����ϴ� v1.89 �����档

### δ��ɷ���

- ����ֻ�ǹ���Ա�ֶ�ά����һ�γ��ڼ��䣬�����������Ķ�������⡢�ֽ�ɫ�ɼ���Χ������ʽ����д�����������̨��
- �����ı��������Ա�ֶ�д��ͻ���˽����ʱ��Ϣ���Կ��ܽ�����ʾ�ʣ�ҳ���İ������Ѳ�Ҫд��Կ���ֻ��š��ͻ���˽��һ�����������ݡ�

## v1.88 - 2026-06-24 18:36 CST

### �Ķ�����

С���޸���v1.87 -> v1.88��

### ����Ŀ��

����Сè Agent �����ˮ�ӡ���̨д�롱��������Ա�ɲ鿴���ıջ���v1.86 �Ѿ��� AI д�붯�������� Agent ��Ƽ�¼��������С��������������������ڡ�ɸѡ�б����ƶ˲�ѯ·�ɣ��������׷��Сè����ִ�й�ʲô��������˭���������յȼ���ʲô��

### �� AI ���ۺ���������

- HanaAgent ��������������ֱ�Ӱ��С���򣬵�������ơ���׷�ݡ��ɿع��߽߱硱���뱣����
- ��Ƽ�¼��ֻд�룬��Ҫ�ܱ�����Ա�����������������ֻ�ܲ����ݿ⣬���ʺ�С�Ŷ��ճ�������
- ����б�ֻչʾ��ҪժҪ������¶��Կ��Token ��������˽���ݣ���������ڷ���������Ȳü���
- ���� `mcloud` �����Կ����ܱ��� `EISDIR` ����Ӱ�죬��˼���������� live patch ע������·�������

### ��Ҫ�޸�

- ���� `work_agent_audit_service.js`����װ Agent �����ˮ��ҳ��ѯ��ɸѡ������ǰ���ֶ���ϴ��
- `work_admin_controller.js` �����������ġ�AI �����ˮ���˵���ں� `getAgentAuditList` �ӿڡ�
- `route.js` ���� `work/admin_agent_audit_list` ·�ɡ�
- `app.json` ע�� `projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit` ҳ�档
- ���� `admin_agent_audit` ҳ���ļ��ף�֧�ֹؼ��ʡ�����������ɸѡ������ˢ�ºʹ��׷�ҳ��
- `index.js` Ԥ���� `work_route_live_patch.js`������ live patch ��������·�ɡ���Ʒ���͹�����������
- ���� `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ��� v1.88��

### �漰�ļ�

- `cloudfunctions/mcloud/index.js`
- `cloudfunctions/mcloud/work_admin_controller_live_patch.js`
- `cloudfunctions/mcloud/work_route_live_patch.js`
- `cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js`
- `miniprogram/app.json`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.json`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.wxml`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.wxss`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/public/route.js` ͨ����
- `node --check cloudfunctions/mcloud/index.js` ͨ����
- `node --check cloudfunctions/mcloud/work_admin_controller_live_patch.js` ͨ����
- `node --check cloudfunctions/mcloud/work_route_live_patch.js` ͨ����
- `node --check miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json`��`admin_agent_audit.json` �� `project.config.json` JSON ����ͨ����
- live patch ���ؼ��ͨ������������Ŀ���� `ws` ������ʾ����Ӱ�챾�� patch ע�롣
- `git diff --check` ͨ�������� Windows ������ʾ��

### ����״̬

- `mcloud/index.js` ��ͨ�����������ϴ������� `370 B`��
- `mcloud/work_admin_controller_live_patch.js` ��ͨ�����������ϴ������� `5.1 KB`��
- `mcloud/work_route_live_patch.js` ��ͨ�����������ϴ������� `2.8 KB`��
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.88`������ `1.5 MB` / `1,547,955 Byte`��
- ����δ�ύ��ˡ�δ�������ߣ����� `mcloud` �������������� live patch �����ܿ���֪ `EISDIR` ���⡣

### δ��ɷ���

- ��������ݿ���δ���� `bx_work_agent_audit` ���ϣ���ʷ�б�����Ϊ�ջ����� CloudBase �Զ���������Ϊ��д����·����ʧ�ܶ��ף���������Сèԭҵ������
- ����ֻ�������˲鿴��ڣ���δ���������ҳ���������������̻����ͳ�ƿ��塣

## v1.87 - 2026-06-24 18:32 CST

### �Ķ�����

�����޸���v1.86 -> v1.87��

### ����Ŀ��

�޸�С������ʵ�ֻ������� AI API ʱ�������������⣺API Key ���ܷ���ճ��������ҳ��ʾ���������Լ����ԶԻ����� `Param Incorrect` ���޷������ж��������⡣

### �� AI ���ۺ���������

- �ֻ��˲���ֻ������������򳤰�ճ��������Ա��Ҫһ����ȷ�ġ�ճ������ťֱ�Ӷ�ȡ�����塣
- API Key ����������Ϣ��ҳ�������ʾ����������������ݣ����ѱ��� Key ��ֻչʾ����ֵ��
- ���������ݽӿڷ��� `Param Incorrect` ʱ����Ӧֻ��ԭʼӢ�ı��������û���Ӧ���Զ��������ԣ��ٸ��� Base URL��ģ�� ID���Ӿ�ģ�ͼ����Ե��Ų鷽��

### ��Ҫ�޸�

- `work_admin_ai.js` �����������ȡ��Key ��ʾ/���ء���������ճ��������ϴ�߼���
- `work_admin_ai.wxml` ���� Key ���Ӿ� Key �������ĳɡ������ + ճ��/��ʾ/��ա��ṹ��
- `work_admin_ai.wxss` �̶� Key ������ť���֣������ֻ����������ȶ��ԣ�������Сè���㵲ס����ҳ������
- `work_ai_service.js` �� AI �������� 400/422 ��������ݴ���ʱ���Զ�����С Chat Completions ����������һ�Ρ�
- `work_ai_service.js` ������������ʾ��Ϊ��ִ���Ų�˵�������� Base URL��ģ�� ID ���Ӿ�ģ�����á�
- ���� `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ��� v1.87��

### �漰�ļ�

- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json` �� `project.config.json` JSON ����ͨ����
- `work_ai_service_live_patch.js` ��ѹ���� `work_ai_service.js`��`work_ai_agent_registry.js`��`work_ai_agent_memory.js`��`work_agent_audit_model.js` һ�¡�
- `git diff --check` ͨ�������� Windows ������ʾ��

### ����״̬

- `work_ai_service_live_patch.js` ��ͨ��΢�ſ����߹��� CLI �������� `mcloud`������ `39.8 KB`��
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.87`������ `1.5 MB` / `1,547,783 Byte`��
- �ƺ�����������ǰ��������΢�� Cloud API `getCloudAPISignedHeader failed` / `41002 system error`�����һ�����Գɹ���

### δ��ɷ���

- δ��֤ÿһ�ҵ����� APIHub ����С�������Եļ��ݳ̶ȣ����ģ�� ID ���������ýӿڲ��� OpenAI Chat Completions ���ݽӿڣ�����Ҫ����Ա�������á�

## v1.86 - 2026-06-24 03:20 CST

### �Ķ�����

����������v1.76 -> v1.86��

### ����Ŀ��

�ο����淽��������СèAgent-HanaAgentǨ����������.md������Сè Agent �ӡ�һ������ʾ�� + һ��Ӳ���붯�����ƽ���������ά���ĵ���������ע�ᡢ���߰��������������䡢�����ˮ���Լ��������л� DeepSeek/Mimo/�Զ��� API ���������顣

### �� AI ���ۺ���������

- HanaAgent �������ļ����նˡ��������������ֱ�ӰᵽС����ӦǨ�Ƶ��� Agent �ֲ㡢����ע�ᡢ���䡢��ƺͰ�ȫ�߽硣
- С�����������ء��ܿ�ҵ�� Agent������������ִ�У��������ɺ�̨Ȩ�޺�����У�鶵�ס�
- ���ڼ����֪ʶ��Ҫ�ֽ׶������������������Ự���䣬���Զ�д���ڿ⣬�����������ݱ����������
- �ֻ��� AI ����ҳҪ�������� DeepSeek��Mimo ��������ݽӿڣ��Զ���Ԥ�費�ܼ������� Agnes �ľ� URL ��ģ�͡�

### ��Ҫ�޸�

- ���� `work_ai_agent_registry.js`�����������������ʡ���ʾ�ʺ��������������ǵ��ڲ�ѯ������¼�롢ͼƬ¼�������ھ��������񡢹�����ˡ�С�������Ϣ��١��ͻ�������֪ʶ�ʴ�
- `work_ai_service.js` ���뼼��ע��������ֶԻ���ѡ���ܣ������ɹ�����ʾ�ʺͶ�����������Խ�綯����ִ�У��ɹ��þ��ᱻ��д��δִ����ʾ��
- ���� `work_ai_agent_memory.js`���ѵ�ǰԱ����ҳ�������ġ����������ĺͱ��ֿͻ���������ѹ����ϵͳ��ʾ�ʡ�
- ���� `work_agent_audit_model.js`��AI д�붯�����Ŷ�С��֮����Ⳣ��д Agent �����ˮ��ʧ�ܲ�����ԭҵ��
- `work_admin_ai.js` �� `Mimo` �� `�Զ���` ��ɶ���Ԥ�裻ѡ���Զ�����Ԥ�����վɽӿں�ģ�ͣ�����ֱ�����µ� Base URL��
- `work_pet.js` ��Сè Agent ���ð汾����Ϊ `0.3.0 HanaAgent �ܹ�����`��
- ���� `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ��� v1.86��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_agent_memory.js`
- `cloudfunctions/mcloud/project/B00/model/work_agent_audit_model.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_memory.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/model/work_agent_audit_model.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check cloudfunctions/mcloud/index.js` ͨ����
- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` ͨ����
- `node --check miniprogram/cmpts/work_pet/work_pet.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json` �� `project.config.json` JSON ����ͨ����
- ���ܰ���������ͨ�������ڲ�ѯֻ���� `query_schedule`���տ��ѯֻ���� `query_payments`������ֻ���� `update_order/cancel_order/query_schedule`������д�뿪�Ź���/�����ض�����
- `git diff --check` ͨ�������� Windows ������ʾ��

### ����״̬

- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.86`������ `1.5 MB` / `1,533,406 Byte`��
- `mcloud` �ƺ������ `index.js` ��ͨ�����������ϴ���
- `work_admin_controller_live_patch.js` ��ͨ�����������ϴ���
- `work_ai_service_live_patch.js` �Ѹ�Ϊ���������汾����ͨ�����������ϴ����������ƶ�����ʱע�� `work_ai_agent_registry.js`��`work_ai_agent_memory.js`��`work_agent_audit_model.js` ���°� `work_ai_service.js`��
- ���� `mcloud` ����������΢�ſ����߹�����֪ `EISDIR` ���⣻����û�м���ǿ��ȫ�����𣬱���Ӱ�������ƺ�������

### δ��ɷ���

- ����ֻʵ�������Ự���䣬��δ���� `agent_memories` ���ڼ����ͺ�̨����ҳ��
- Agent ���ģ���Ѽ�����룬�������ݿ������δ�������ϣ�д���ʧ�ܲ������׺��ԣ�������Ҫ������������б��ͼ��ϳ�ʼ����

## v1.76 - 2026-06-24 02:31 CST

### �Ķ�����

С�ģ�v1.75 -> v1.76��

### ����Ŀ��

�޸��ֻ��� AI С��������ҳ���������ɡ��͡��������������⣺С����Ҫ��ֱ�ӻ� DeepSeek��Mimo ��������� API��Ҳ��Ҫ����ģ�ͺ�ͼƬʶ��ģ�ͷֿ����ã������ٱ����Ȼ�ȡģ���б����ĵ�һ���̿�ס��

### �� AI ���ۺ���������

- ����ҳ���������ֶ���д Base URL ��ģ�� ID����ȡģ���б�ֻ���Ǹ�������Ӧ�ó�Ϊ�޸�ģ�͵�ǰ��������
- DeepSeek��Mimo/�Զ�������ģ�Ͳ�Ӧ���̶��� Agnes APIHub ��Ĭ��ֵ�Ԥ��ֻ�������ڣ�����Ա�Կ����ɸ��ǡ�
- ͼƬʶ�����ͨ���ֶԻ�����ʹ�ò�ͬģ�ͣ���ͼƬʱ�������Ӿ�ģ�ͣ�ûͼƬʱ���ı�ģ�͡�
- �ֻ���ҳ��Ҫ���з��飬�����ǩ������򡢰�ť��˵�����ּ���ͬһ����ɡ����޸�û��Ӧ���Ĵ�����

### ��Ҫ�޸�

- `work_admin_ai.js` ����������Ԥ�衢�ı�ģ���б����Ӿ�ģ���б����Ӿ��ӿڵ�ַ���Ӿ� API Key ���ֶ�ģ�� ID ���̡�
- `work_admin_ai.wxml` ������ҳ��ɡ������� / �ı�ģ�� / ͼƬʶ��ģ�� / Сè��Ϊ���Ŀ飬�����ֶ�������Ϊ��·����
- `work_admin_ai.wxss` �����ֻ������ȵĵ��в��֡�Ԥ�谴ť���̶����Ȼ�ȡ��ť����������Լ����
- `work_admin_controller.js` ֧�� `clearVisionKey` �� `target=vision` ��ģ���б�����
- `work_ai_service.js` �����Ӿ����ã����������ͼƬʱ����ѡ���Ӿ��ӿڡ��Ӿ� Key ���Ӿ�ģ�͡�
- ���� `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ��� v1.76��

### �漰�ļ�

- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` ͨ����
- `node --check cloudfunctions/mcloud/index.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js` ͨ����
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check cloudfunctions/mcloud/work_admin_controller_live_patch.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `miniprogram/app.json` �� `project.config.json` JSON ����ͨ����
- `work_ai_service_live_patch.js` �� `work_admin_controller_live_patch.js` ��ѹ������ӦԴ��һ�¡�
- `git diff --check` ͨ�������� Windows ������ʾ��

### ����״̬

- `mcloud` ���������� `work_ai_service_live_patch.js`��`work_admin_controller_live_patch.js` �� `index.js`��
- ���� `mcloud` ����������΢�ſ����߹�����֪ `EISDIR` ���⣬����ͨ�� live patch ���ƶ˼������·�����������߼���
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.76`������ `1.5 MB` / `1,532,105 Byte`��

## v1.75 - 2026-06-24 02:10 CST

### �Ķ�����

С�ģ�v1.74 -> v1.75��

### ����Ŀ��

�޸�Сè�����ڽ�ͼ¼�����ĵ���ȷ�Ϻ� AI ��ʱ�����µ����У�ҳ�涥�����ڲ��ܱ���Ƭ��ע���ǣ��û����䡰��4��©�ˡ���1�����޲��䡱ʱ��Ӧ���Ƚ��뱾�ؿ�ȷ����ҵ�����̣������Ƿ������ó���ʱ AI��

### �� AI ���ۺ���������

- ÿ������ҳ���� `2026.09.11` �Ƕ����������ڣ���Ƭ��� `9.16��Ӱ` ֻ�ܵ���ע�����߳�ͻʱ��Ӧ�����û�׷��ȷ�ϣ�������ֱ�Ӹ��Ƕ������ڡ�
- �������ƽ�ͼ������Ϊ��ʽ����ͺϲ��жϣ�һ��ͼ���ܶ�Ӧһ��������Ҳ����©ʶ���û�ָ�����ڼ���©�ˡ�ʱҪֻ׷�����š�
- Сè�ظ����Ѹġ���������ʵ�����ִ��ȷ������Ϊǰ�᣻����ģ���ȳ�ŵ�ɹ��������ƺ����ų�ʱʧ�ܡ�
- �ԡ��޲��䡱��ֻ��һ������1���ȶ̻ظ������ܴ�������ȷ����ͼ��Ӧ�߱������̿����տڣ������ⲿģ�ͺ� 20 ���ƺ�����ʱӰ�졣

### ��Ҫ�޸�

- `work_ai_service.js` ��ǿ��ͼ���ڹ���ҳ�涥���������ȣ���ע���ڳ�ͻ��׷�ʣ���������ͼ��ͼƬ����������
- `work_ai_service.js` ����©ͼ׷��������ʶ�𡰵�4��©�ˡ���˵�����޷��õ���ʷͼƬʱ��ȷ��ʾ�����ϴ�ָ��ͼƬ��
- `work_pet.js` ǰ�˲���©ͼ׷��������ʷ��Ϣ��ȡָ��ͼƬ�� `fileID`��ֻ���͸�ͼ���ƺ�����
- `work_pet.js` ǰ�˸���ȷ�ϲ���ؼ��ʺ�����ѡ��֧�֡�������9.16�Ǹ���Ϊ9.11����ظ���1���������档
- `work_pet.js` �ԡ��޲��䡱��ȷ�ϻظ���������Ӧ�������ٴδ��� AI ���ó�ʱ��
- `index.js` Ԥ���� `work_ai_service_live_patch.js`�������������ƺ��������ܱ���Ŀ¼�������Ӱ��ʱ�������ƶ�ʹ������Сè�߼���
- ���� `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ��� v1.75��

### �漰�ļ�

- `cloudfunctions/mcloud/index.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` ͨ����
- `node --check miniprogram/cmpts/work_pet/work_pet.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `git diff --check` ͨ�������������з���ʾ��
- �������ƶ� `mcloud` �������˶� `work_ai_service_live_patch.js` ��ϣһ�¡�

### ����״̬

- `mcloud` �ƺ��� live patch ��ͨ��΢�ſ����߹��� CLI ��������
- С���򿪷�����ͨ��΢�ſ����߹��� CLI �ϴ����汾�� `1.75`������ `1.5 MB` / `1,521,594 Byte`��

## v1.74 - 2026-06-21 18:25 CST

### �Ķ�����

С�ģ�v1.73 -> v1.74��

### ����Ŀ��

�޸�Сè�����ڡ���20�ŵ��ڸĵ�21�� / ֻ��һ������������׷�ʻ����� AI ���񲻿��õ����⣬����СèȨ�޸�Ϊ���ڵ�ǰ��¼�˺ŵ���ʵҵ��Ȩ�ޡ�

### �� AI ���ۺ���������

- Сè��Ӧ����ʾ�ʲ����������ơ��߷��ղ�����������������Ӧ����ǰ��¼�˺�Ȩ�����ɶ������ɺ�˷���������Ȩ�޺�����У�顣
- �տ��ɡ����ʡ���˵����ж��������ɹ���Ա�˺Ŵ����������뱣����ȷ���󡢽��·ݡ�ԭ��������ˮ��
- �Խ�ͼ�������¼Ҫǿ����Լ���������ײ�/Ӧ����ʵ��/���ˣ������ת�˱���ȷ�Ϸ���͵���״̬��
- ��ֻ��һ����������һ�ָ���ȷ�ϣ�Ӧ�ܻؿ���ʷ��Ϣ���Զ����������ⲿ AI ���񲻿��ã�ǰ��ҲӦ�ܶ��״���Ψһ�������ڡ�

### ��Ҫ�޸�

- `work_ai_service.js` ��չСè���߶����������տ��ѯ/¼��/���ϡ���ɲ�ѯ�����ʲ�ѯ/���š�������ˣ�������ͨԱ��/����Ա�ֱ���Ȩ�ޱ߽硣
- `work_ai_service.js` ���ӽ�ͼ�������ת�ˡ������ײͽ�����Լ����������ײͼ����г�ʵ�ա�
- `work_pet.js` ����ǰ��Ψһ�������ڶ��ף��Ȳ�Ŀ�����ڵ��충����ֻ��һ������ȡ�������顢��д���ڲ����档
- `work_pet.js` ���ں��Զ�ˢ����������ͬ��д���Ŷ�С�������ˮ��
- ���� `miniprogram/version.js`��`miniprogram/setting/setting.js`��`CHANGELOG.md`��`README.md` �ͱ��ĵ��� v1.74��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` ͨ����
- `node --check miniprogram/cmpts/work_pet/work_pet.js` ͨ����
- `node --check miniprogram/version.js` ͨ����
- `node --check miniprogram/setting/setting.js` ͨ����
- `git diff --check` ͨ����

### ����״̬

- �����ش������޸ġ�
- ��Ҫ��΢�ſ����߹������±���ǰ�ˡ�
- ��Ҫ���²��� `cloudfunctions/mcloud` �ƺ������ƶ� AI Ȩ������ȷ���������������Ч��

## v1.72 - 2026-06-20 Сè����¼���������Ự��ȫ�޸�

### �޸�ԭ��

�޸� AI ¼�������ϴ���������ھ�ƫ���ÿͿͻ���ʶ��Ͷ�Ự�첽д��/�����������⡣

### �޸�����

- `_amount()` ֧�ִӰ������š���λ�����ַ��Ľ���ı�����ȡ���֣��������Ĭ����Ϊ 0��
- ��������������Ϊ�����֧������ͬһ���ڱ����μӼ���ݡ�
- �ÿ�ģʽ�ͻ���ʶ����չ CJK ��Χ�����������ؽ��/��Դ���󵱿ͻ�����
- Сè��Ự�첽�ظ������߳������������л��Ự��д�������¼��ǿ�ƹ�����ǰ�Ự��

### ��֤

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `node --check miniprogram/helper/guest_helper.js`
- `node --check miniprogram/cmpts/work_pet/work_pet.js`
- �����ϴ��ÿͿͻ����ع�����ͨ��

> ��¼������ӰС����ÿ�α��ش����޸ġ��汾�š����۽��ۡ��漰�ļ�����֤����Ͳ���״̬��
> ��ȫ������Կ�����롢token���ͻ���˽��������˽��д�뱾�ĵ�ԭ�ģ���Ҫʱֻ��¼����������

## �汾����

- ��ǰ�汾���ߣ�v1.42��
- С�ģ��汾�� `+0.01`������ v1.42 -> v1.43��
- ��ģ��汾�� `+0.10`������ v1.42 -> v1.52��
- ��ȫ��ϵ�������汾�� `+1.00`������ v1.42 -> v2.42��
- ÿ���޸ĺ�ͬ�����£�
  - `miniprogram/setting/setting.js`
  - `miniprogram/version.js`
- `CHANGELOG.md`
- ���ĵ�

## v1.71 - 2026-06-19 06:52 CST

### �Ķ�����

С�ģ�v1.70 -> v1.71��

### ����Ŀ��

�޸�"����һ"������ȷ���һ��׼��ʱ������ת������һ�����⡣

### �� AI ���ۺ���������

- `_extractWeekdayTextDate` ��"����/����"ǰ׺��������֧ `if (offset < 0) offset += 7` �ᵼ�µ�ǰ�����ѹ�ȥ�����ڱ��Ƶ�����һ��
- ���磺�û�������˵"����һ��������"���������ر���һ��2026-06-15���������뷵������һ��2026-06-22����
- ���򣺶���"����"ǰ׺���û���ȷ��ʾ"��ǰ��һ��"����Ӧ���� offset ����Ϊ��ֵ��
- �޸����ԣ��Ƴ�"����/����"ǰ׺��֧�е� `if (offset < 0) offset += 7`���� offset ����ԭֵ��ָ��ǰ ISO ���ڶ�Ӧ���ڡ�

### ��Ҫ�޸�

- `work_ai_service.js` �� `_extractWeekdayTextDate` ��"����/����/������/������/�����/�����"��֧�Ƴ� `if (offset < 0) offset += 7`��
- ͬ������ `miniprogram/setting/setting.js`��`miniprogram/version.js` �� `CHANGELOG.md` �İ汾��¼��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `work_ai_service.js`��`setting.js` �� `version.js`��ͨ����
- ���ڽ�����֤ 20/20 ͨ�����������������塢���ա�����������������졢����һ���������������ա�����һ������һ���޸����������������һ���������������������������塢��һ��׼����һ/������/�����ա����ջ�׼����һ/�����ա�
- ������ 74 ���� v1.69/v1.70 �ع鷢�֣�����Ϊ v1.71 �����޸�����

### ����״̬

- �����ش������޸ġ�
- δ�ϴ�С����
- δ�ϴ� `mcloud` �ƺ�����

## v1.70 - 2026-06-19 04:36:11 CST

### �Ķ�����

С�ģ�v1.69 -> v1.70��

### ����Ŀ��

�޸�Сè�����޷�ʶ��"����һ""������""��������"�ȹ�ȥһ���������ڵ����⡣

### �� AI ���ۺ���������

- `_extractWeekdayTextDate` �����������֧δ����"����"ǰ׺������"����һ"�������׼�㱻����"��һ"��������������һ��������һ��
- ����Ԥ�Ѵ��ڵĹ���ȱʧ������ v1.69 ����Ļع顣
- �޸����ԣ�������������������/����/������/�����ǰ׺����������֧�����Ӷ�Ӧ offset ƫ�ơ�

### ��Ҫ�޸�

- `work_ai_service.js` �� `_extractWeekdayTextDate` �������� `������|��������|�������|����|������|�����` ǰ׺ƥ�䡣
- ������֧���� `offset -= 14`�������ܣ��� `offset -= 7`�����ܣ�������
- ͬ������ `miniprogram/setting/setting.js`��`miniprogram/version.js` �� `CHANGELOG.md` �İ汾��¼��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- ����ɱ��ش����޸ġ�
- `node --check` �Ѽ�� `work_ai_service.js`��`setting.js` �� `version.js`��ͨ����
- ���ڽ�����֤ 10/10 ͨ�����������������塢���ա�����������������졢�����塢��һ������һ���������������ա�
- ����һ�������׼��ȷ����Ϊ 2026-06-08������һ����
- �������������׼��ȷ����Ϊ 2026-06-13������������
- ��δ��΢�ſ����߹������/ģ�������⡣

### ����״̬

- �����ش������޸ġ�
- δ�ϴ�С����
- δ�ϴ� `mcloud` �ƺ�����

## v1.69 - 2026-06-18 23:15:34 CST

### �Ķ�����

С�ģ�v1.68 -> v1.69��

### ����Ŀ��

�޸�������ȷ���⣺ֱ�����ӵ������Ӳ��ˣ�Сè�������ӵ����������������ڻ�������ʱ������ʾ��ʽ����

### �� AI ���ۺ���������

- `work/add` ���� tabBar ҳ�棬����ʹ�� `wx.switchTab` �򿪣�������ҳ��������ҳ����ʱӦʹ�� `wx.navigateTo`��
- ��������ҳ��Ҫ�ܴ� URL �����õ� `day`��ҲҪ���� `WORK_ADD_DAY` ��Ϊ���ס�
- Сè���ֳ��˽���/����/���죬ҲҪ�ܰѡ��������������塢���ա��ȳ����س��ŵ��������ת�ɱ�׼���ڡ�
- ���� `create_note` �ͼ��� `add_note`������ģ�����ͬ�嶯��ʱ��ϵͳ�гɲ���ִ�л��ʽ����

### ��Ҫ�޸�

- `work_calendar.js` ��ֱ������������ڴ� `wx.switchTab` ��Ϊ `wx.navigateTo`����Я�� `?day=YYYY-MM-DD`��
- `work_day_detail.js` ��ֱ������������ڴ� `wx.switchTab` ��Ϊ `wx.navigateTo`����Я�� `?day=YYYY-MM-DD`��
- `work_order_edit.js` �½�̬Ĭ������ `canEdit/canFull` Ϊ `true`���޸����水ť�ͱ༭��ڱ����ص����⡣
- `work_ai_service.js` �������������ڽ�����֧����/����/��ݱ������ `create_note` ��һ�� `add_note`��
- `work_pet.js` ˢ���߼����� `create_note`��ȷ��Сè����д������ܴ���ҳ��ˢ�¡�
- ͬ������ `miniprogram/setting/setting.js`��`miniprogram/version.js` �� `CHANGELOG.md` �İ汾��¼��

### �漰�ļ�

- `miniprogram/projects/B00/pages/work/calendar/work_calendar.js`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- ����ɱ��ش����޸ġ�
- `node --check` �Ѽ�� `work_calendar.js`��`work_day_detail.js`��`work_order_edit.js`��`work_pet.js`��`work_ai_service.js`��`setting.js` �� `version.js`��ͨ����
- �Ѽ��ؼ�ҳ����� `app.json` ע�ᣬ�� `.js/.json/.wxml/.wxss` �ļ���ȫ��
- �Ѽ�� `work/order_save`��`work/item_save`��`work/rest_save`��`work/ai_chat`��`work/admin_ai_config_get`��`work/admin_ai_config_save` ·�ɴ��ڡ�
- ������������������ͨ����`������`��`������`��`����`��`��������`��`�������` ���ɻ���Ϊ��׼���ڡ�
- ��δ��΢�ſ����߹������/ģ�������⡣

### ����״̬

- �����ش������޸ġ�
- δ�ϴ�С����
- δ�ϴ� `mcloud` �ƺ�����

## v1.68 - 2026-06-12 15:20:57 CST

### �Ķ�����

С�ģ�v1.67 -> v1.68��

### ����Ŀ��

�޸�Сè���ּ�¼����������һ�㣬������������Ƶ��ʱ���ѽ�����ʶ��� `2026-06-01`������ֻ����AI������¼����ʵ���ڲ���ʾ�����⡣

### �� AI ���ۺ���������

- 2026-06-12 ���죬�û�˵�����족ʱ���밴��������ǰ���ڽ���Ϊ `2026-06-12`��������ȫ����ģ�ͷ��ص������ֶΡ�
- AIд�붯������漰������/����/���족��������ڣ���˱������û�ԭ���ͷ��������������׾�ƫ��
- AI���������ֻд�ɴ����״̬��ظ������������ڡ������Ҫ�ظ��ɹ�����ʵ����������������������鿴����
- AI������¼Ӧ����ʵҵ���¼���У��ͨ������д�룬���⡰ֻ��AI��¼��û��ʵ�ʵ��ڡ��ļٳɹ���

### ��Ҫ�޸�

- `work_ai_service.js` �����û�ԭ�����ھ�ƫ��֧�ִ�ԭ��ʶ�𵥸���ȷ���ڣ���ѡ�����/����/����/�����/����/ǰ�족����������ǰ���ڻ��㡣
- `work_ai_service.js` ��������ϴ������ʵ����У�飬���ⲻ�������ڻ�汾�š�С������ʶ������ڡ�
- `work_ai_service.js` д���ද�������µ�������ϴ��ڣ����������������Ϣ��С�ǺͲ�ѯ���ڶ�������ʹ���û�ԭ���е�����������
- `work_ai_service.js` ��AI���������Ϊ�����ز� `WorkItemModel`��ȷ�ϼ�¼���ڡ����ڱ���ƥ����״̬��Ч�󣬲�дAI������¼�����سɹ���
- `work_service.js` �� `saveItem` �����ܿ� `forceActive` �������������AI���ÿ�������ֱ����Ч����ͨǰ�˱���������ԭ��˹���
- ͬ������ `miniprogram/setting/setting.js`��`miniprogram/version.js` �� `CHANGELOG.md` �İ汾��¼��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- ����ɱ��ش����޸ġ�
- `node --check` �Ѽ�� `work_ai_service.js`��`work_service.js`��`miniprogram/version.js` �� `miniprogram/setting/setting.js`��ͨ����
- �������ھ�ƫ������ȷ�ϣ�`��������һ��` ���ģ�ʹ������� `2026-06-01` ����Ϊ `2026-06-12`��`����` �����Ϊ `2026-06-13`��`6.15` �����Ϊ `2026-06-15`��
- �����Ƿ�����������ȷ�ϣ��汾���ı� `1.68` ���ᱻ�������ڣ�`2026-01-68` �ᱻ���ء�
- �����漰���Ѹ����ļ� `git diff --check` ͨ����ȫ�� `git diff --check` �����м����޹ؿո� `miniprogram/projects/B00/biz/project_biz.js:17`������δ�Ķ����ļ���
- ��δ��΢�ſ����߹������/ģ�������⡣

### ����״̬

- �����ش������޸ġ�
- δ�ϴ�С����
- δ�ϴ� `mcloud` �ƺ�����

## v1.66 - 2026-06-11 20:02:17 CST

### �Ķ�����

С�ģ�v1.65 -> v1.66��

### ����Ŀ��

�޸�΢�ſ����߹����ϴ� `mcloud` �ƺ���ʱ������`��ȷ�� config.json �а����Ϸ��� triggers �ֶ�`��

### �� AI ���ۺ���������

- �����߹��ߴ������ڡ��ϴ��ƺ��� mcloud �Ĵ��������׶Σ�����С����ǰ�˱������
- `cloudfunctions/mcloud/config.json` ԭ��ֻ�� `timeout` �� `permissions`��ȱ�� `triggers` �ֶΡ�
- `mcloud` ����ͨҵ���ƺ��������Ƕ�ʱ�����ƺ�������˲�Ӧ���� timer ��������
- ������Ƕ�ʱ�ƺ��������Ϸ������� `triggers: []` �����ÿ����߹���ͨ������������У�顣

### ��Ҫ�޸�

- `cloudfunctions/mcloud/config.json` ���� `"triggers": []`��
- �淶�� `permissions.openapi` ����ո�
- ͬ������ `miniprogram/setting/setting.js`��`miniprogram/version.js` �� `CHANGELOG.md` �İ汾��¼��

### �漰�ļ�

- `cloudfunctions/mcloud/config.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- JSON �����Ѽ�� `cloudfunctions/mcloud/config.json`��ͨ����
- `node --check` �Ѽ�� `miniprogram/setting/setting.js` �� `miniprogram/version.js`��ͨ����
- ��δ��΢�ſ����߹������µ���ϴ� `mcloud` �ƺ�����

### ����״̬

- �����ش������޸ġ�
- δ�ϴ�С����
- δ�ϴ� `mcloud` �ƺ�����

## v1.65 - 2026-06-11 19:57:52 CST

### �Ķ�����

С�ģ�v1.64 -> v1.65��

### ����Ŀ��

�����޸���һ��δ��ɵ��ظ����� bug������ֻ�� AI ¼������������ǰ���ء�����Ҫ�Ѻ����ظ��ж��³����������������ڣ�������ͨ���桢��������������������ƹ� AI ������ظ���⡣

### �� AI ���ۺ���������

- �ظ�������������һ������� `work_service.js` �� `saveOrder`�������ԭ��У��Ȩ�ޡ����Ͳ���״̬��ֱ�Ӳ��롣
- AI ������Ҫ���û��Ѻõġ�����������ʾ����������ֹ�ظ����Ӧ�ɶ���������񶵵ס�
- ���ز���ֻ��ͬһ���ͬʱ�䣬��������ͬһ��ͬ�ͻ�����ͬ�������͵Ķ�����
- ����Ӧ����Ҫ��ͬ���ڡ�ͬ�ͻ�������Ч�绰��ͬ�������ͣ�����ȷʱ��ʱͬʱ������أ�ȱʱ��ʱ�ٽ�ϵ绰��ص����Ϣ�������ء�
- ������Ƭ�β��ܵ�����Ч�ֻ���ƥ�䣬���� OCR ��ʶ��������С�

### ��Ҫ�޸�

- `work_service.js` ����ͳһ�����ظ��жϷ����������ͻ�������Ч�绰��ʱ�䡢�������ͺ͵ص��һ���Ƚϡ�
- `saveOrder` ��������༭ǰִ�� `_assertNoDuplicateOrder`���༭ʱ�ų���ǰ����������
- `work_ai_service.js` �� AI ������������������ȥ�ظ�Ϊ���� `WorkService` ��ͳһ�жϣ��������׹���Ư�ơ�
- ͬ������ `miniprogram/setting/setting.js`��`miniprogram/version.js` �� `CHANGELOG.md` �İ汾��¼��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `work_service.js` �� `work_ai_service.js`��ͨ����
- ��������������֤��ȷ�ϣ�ͬ��ͬ�ͻ�ͬ����ͬʱ������أ�ͬ��ͬ�ͻ���ͬ���Ͳ������أ�ͬ��ͬ�ͻ�ͬ���Ͳ�ͬʱ�䲻�����ء�
- ��δ����΢�ſ����߹��߻��ƺ���������֤��

### ����״̬

- �����ش������޸ġ�
- δ�ϴ�С����
- δ�ϴ� `mcloud` �ƺ�����

## v1.64 - 2026-06-11 17:47:00 CST

### �Ķ�����

С�ģ�v1.63 -> v1.64��

### ����Ŀ��

�޸� AI ��ͼ/����¼�����������������е��������⣺����д��ʶ����ϵ���¼��ʧ�ܻ����ڴ�λ���Լ��ظ������жϹ��ɺͱ����ȱ�ٻز鵼�¡�˵�ѵǼǵ�ʵ����û��⡱�ļٳɹ���

### �� AI ���ۺ���������

- AI ¼�����ڲ���ֻ�����ϸ� `YYYY-MM-DD`�������� `2026/6/13`��`2026��6��13��`��`6.13` ҲҪ�ܹ淶�ɱ�׼���ڡ�
- �ظ��жϲ���ֻ����ͬһ�� + ͬ�ͻ����������µ�������Ҫ���ͻ���ʱ�䡢���͵ȶ���ؼ��ֶ�һ��ƥ�䡣
- ������ɺ�Ҫ�ٲ�һ����ʵ��¼��ȷ�����д��ϵͳ���ٸ����ѵǼǡ���ظ���

### ��Ҫ�޸�

- `work_ai_service.js` �� `_cleanDate` ��ǿ�����ڸ�ʽ���ݣ�����ǰͳһ��׼���� `YYYY-MM-DD`��
- `work_ai_service.js` ���ظ��жϴӡ�ͬ�ͻ� + ��һ�ֶΡ��ս�Ϊ��ͬ�ͻ� + ����ֶ�ͬʱƥ�䡱��
- `work_ai_service.js` �� `saveOrder` ���������ز飬��д��ʧ�ܻ��ֶβ�һ��ֱ�ӱ��������ٷ��ؿճɹ���ʾ��
- ͬ������ `miniprogram/version.js`��`miniprogram/setting/setting.js` �� `CHANGELOG.md` �İ汾��¼��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- ��������ɱ����޸Ĳ�ͬ���汾��¼��
- ��δ����΢�ſ����߹��߻��ƺ���������֤��

### ����״̬

- �����ش������޸ġ�
- δ�ϴ�С����
- δ�ϴ� `mcloud` �ƺ�����

## v1.63 - 2026-06-11 16:17:18 CST

### �Ķ�����

С�ģ�v1.62 -> v1.63��

### ����Ŀ��

���ݿ����߹��߽�ͼ��������Сè���ֺ�ҵ��ҳ���飺��С�������������򣬷Ŵ����춥������ռ̫��ռ䣬��־�İ���Ҫ�淶�Ű棬������ɾ����ťȡ�����ȴ��İ�������Сè������ҵ��ҳĬ��չʾ������Ϣ�����Ѷ�����ҵ��������ͬһ����̨�

### �� AI ���ۺ���������

- Сè������С̬������Ϊ�����б��߶ȼ��������
- �Ŵ�̬����ֻ������Ҫ��Ϣ��˵��С�ֲ���չʾ���������Ͱ�ť��ѹ��
- ���/ɾ�����첻Ӧ���� `+` �Ա���Ϊ��Ƶ��ť�������󴥡�
- Agent��־��Ҫ�����Ű棬������һ����ϵͳ�������֡�
- ҵ��ҳĬ��չʾ����ҵ���ͱ������У�������/�Ŷ�����Ĭ������
- ҵ��ҳ�ϰ벿�ַ�ҵ�����°벿�ַŶ�����ÿ�鶼չʾһ����ժҪ��������Ϣ�ٵ��ȥ��

### ��Ҫ�޸�

- Сè��������Ϊ�̶�����߶Ⱥ� flex ���֣��������������������͸���Ԥ��ʼ�տɼ���
- Сèȫ��ͷ��ѹ���߶ȣ�����˵��С�֣����ⲻ�ٻ������š�
- Сèͷ���Ͳ�����ײ��Ƴ�������찴ť���������½������š��رպ����á�
- �ȴ��ظ��İ���Ϊ��Сè����˼��...����
- Agent��Ϣ�� `wx.showModal` ��Ϊ�Զ��嵯�㣬���汾��Ϣ��ģ����Ϣ�͸�����־�Ű档
- ҵ��ҳ�����������п�������Ա��/�Ŷ�����Ĭ������
- ҵ��ҳ������������������ȡ `work/order_list` չʾ���¶�����δ������δ���㡢δ�պϼƺ����������

### �漰�ļ�

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/projects/B00/pages/work/performance/work_performance.js`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `work_pet.js`��`work_performance.js`��`version.js` �� `setting.js`��ͨ����
- JSON �����Ѽ��ҵ��ҳ���á�`app.json` �� `project.config.json`��ͨ����
- `git diff --check` �Ѽ�鱾���漰�ļ���δ���ֿհ׻򲹶���ʽ���⡣

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���
- δ�ϴ� `mcloud` �ƺ�����

## v1.62 - 2026-06-11 15:25:36 CST

### �Ķ�����

С�ģ�v1.61 -> v1.62��

### ����Ŀ��

���д���������ڡ�����֪ʶ���汾ʶ��AI¼������Ϣ���顢����Ԥ����Сè���֡�Ա�����򡢷ÿ͸���� Hanako Agent �ο����������⡣����ؿɱջ��ı��ع����밲ȫ�޸����ٰ���ʽ�ظ�������������Skill ��������֪ʶȨ����ϵ��¼Ϊ����·�ߡ�

### �� AI ���ۺ���������

- �ÿͲ��ܿ����κ���ʵ���ڡ�������С�ǡ�ҵ�����Ŷӻ������ݣ��ÿ�ͨ��Сè����������ֻ����Ϊ������ʱ�ÿ����ݣ�����ͬ������¼�����ʵ�˺š�
- AI��ͼ¼���������ֶ���������β����պ�δ�գ����ܰѡ�β��δ�ա�����Ϊ��β�����ա���
- �ඩ����ͼ��Ҫ����ȥ�غ������������ѵǼǶ���Ӧ������δ�ǼǶ���Ӧ�����Ǽǡ�
- ��Ϣ����Ӧ��΢����Ϣһ���ܵ㿪��Ƭ�����飬������ת��������������
- ����������Ҫ�ɵ��Ԥ������������ӦתΪ���ļ�����Ӧֻͣ���ڱ��ػ��档
- ԭ�ײ�����������ڸ�Ϊ��֪ʶ������������̨Ǩ��ҵ��ҳ��֪ʶ���ݺ�����Ȩ���ϴ�����ȡ�ͼ�����
- Сè������Ҫ������� Agent�����½��Ի���ڡ��汾��Ϣ��ģ����Ϣ���ܿع��߶�����δ�� Skill ��������
- Ա�����ݺ���ɹ���Ӧ֧�ֹ���Ա��һ�λ�¼�룬��Сè�ȹ���Ϊ�ṹ������

### ��Ҫ�޸�

- �ÿ�ģʽ��Ϊֻ���ؿ���ʵ���ݺͱ�����ʱ�ÿͶ������ÿ�Сè��������ֻ���浽������ʱ���棬��������������
- AI¼����ʾ�ʺ�ִ�в㲹�������ֶΡ�֧����ϸ���졢�ظ������жϺ�����¼���嵥�ظ���
- ���������������Ա���ɼ��������ݲ��� `PAID_AMOUNT`��`UNPAID_AMOUNT` չʾ�߼���
- ��Ϣ����������Ϣ���鵯�㡢����������ڡ���ƬժҪ�͵�������Ѷ���
- �������֪ͨ���Ӷ���ժҪ�������û�֪������һ����������㡣
- ��������ͼƬ֧�ֵ�� `wx.previewImage` �Ŵ�鿴�������ϴ����������ļ�ת����
- �ײ� tabBar ������ӡ���������Ϊ��֪ʶ�������� `work_knowledge` ҳ�棻ҵ��ҳ������������̨��ڡ�
- �汾����ҳ������ʱ�汾�뻷����ǵ�ǰ�汾���з��汾�����������汾Ԥ�����ʷ�汾��
- Сè�������� Agent �汾��־�������½��Ի������õ����� `join_order` ��ȫ������
- �����������༭Ȩ���û��������ʱ����������Լ���������ˣ�Agent Ҳ��ͨ�� `join_order` һ�仰���롣�������������Ч�տ���ݵ�������ɣ��������˷��ͺ�ʵ���ѣ��ѽ��㶩���������������롣
- Ա������������Ȼ��������򣬿ɽ�����λ���ֻ��š��ٷֱ�/�̶���ɺͲ�����ɹ���
- ���� `docs/hanako-agent-adaptation.md`����¼�� Hanako �ο�������Сè�Ŀ�Ǩ�����������ʵʩ�߽硣

### �漰�ļ�

- `miniprogram/helper/guest_helper.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.js`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.wxml`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.js`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.wxml`
- `miniprogram/projects/B00/pages/work/messages/work_messages.js`
- `miniprogram/projects/B00/pages/work/messages/work_messages.wxml`
- `miniprogram/projects/B00/pages/work/messages/work_messages.wxss`
- `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.js`
- `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/projects/B00/pages/work/knowledge/work_knowledge.js`
- `miniprogram/projects/B00/pages/work/knowledge/work_knowledge.json`
- `miniprogram/projects/B00/pages/work/knowledge/work_knowledge.wxml`
- `miniprogram/projects/B00/pages/work/knowledge/work_knowledge.wxss`
- `miniprogram/projects/B00/pages/work/version/work_version.js`
- `miniprogram/projects/B00/pages/work/version/work_version.wxml`
- `miniprogram/projects/B00/pages/work/version/work_version.wxss`
- `miniprogram/projects/B00/pages/work/admin_staff/work_admin_staff.js`
- `miniprogram/projects/B00/pages/work/admin_staff/work_admin_staff.wxml`
- `miniprogram/projects/B00/pages/work/admin_staff/work_admin_staff.wxss`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `cloudfunctions/mcloud/project/B00/service/admin/admin_work_service.js`
- `cloudfunctions/mcloud/project/B00/controller/work_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `miniprogram/app.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `docs/hanako-agent-adaptation.md`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ��ÿ͸��롢Сè���֡��������������顢��Ϣ�������༭������֪ʶ��ҵ�����汾��Ա��������AI���񡢶�������֪ͨ���񡢿�������·�ɡ��汾���� JS��ȫ��ͨ����
- JSON �����Ѽ�� `app.json`������֪ʶҳ���汾ҳ����Ϣҳ���������������顢�����༭��ҵ����Ա�������� `project.config.json`��ͨ����ȷ�ϵײ� `֪ʶ` tab ��ע�ᡣ
- `git diff --check` �Ѽ�鱾���漰���Ѹ����ļ���δ���ֿհ׻򲹶���ʽ���⡣
- ����δ�����ļ��ѵ���ɨ��β��ո�δ�������⡣

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���
- δ�ϴ� `mcloud` �ƺ�����

## v1.61 - 2026-06-11 09:50:02 CST

### �Ķ�����

С�ģ�v1.60 -> v1.61��

### ����Ŀ��

�Ż�С�ǡ��汾����Ϣ���飺AI ������¼�����ְ����ʾ����ͨС���Զ����������������ġ�Сè��������ʽ���ҵ�ҳ�����汾������ڣ���Ϣ����ʵ��δ��������δ�����Ѻ�һ���Ѷ���

### �� AI ���ۺ���������

- AI ������ˮ��Ӧ���ڡ�ȫ��/�Ŷ�/���ˡ���ͨС���Ӧ�е�����AI��¼����顣
- ��ͨС��չʾʱӦ�Զ�����Ϊ����Ҫ�㣬������дԭʼС�����ģ������ƻ���ʷ���ݡ�
- �ҵ�ҳ��Ҫ�ܲ鿴��ǰ�汾�ź͸��汾�������ݡ�
- ��Ϣ������Ҫ����΢�ŵ�δ��������ʾ����֧��һ��ȫ���Ѷ���

### ��Ҫ�޸�

- С��ҳ������AI��¼��������
- С���б�ǰ���Զ�ʶ�� `AI������¼` ���⣬��ͨ�������� AI ��¼��AI ����ֻ��������ˮ��
- ��ͨС�ǿ�Ƭ������Сè������Ҫ��չʾ���Զ����ԭ����Ϊ������Ŀ��
- ��� `work/note_list` ͬ��֧�� AI ������¼���ˣ��ϴ��ƺ��������ݲ�Ҳ����롣
- �ҵ�ҳ����Ϣ���ġ��������δ�������Ǳꡣ
- �ҵ�ҳ�������汾���¡���ں͵�ǰ�汾���ҡ�
- ���� `work_version` ҳ�棬��ȡ `version.js` չʾ��ǰ�汾����ʷ�������ݡ�
- ��Ϣ��������δ��������δ����㡢��������Ѷ���һ���Ѷ���ť��
- ������� `work/message_summary` �� `work/message_read_all` ·�ɡ�
- ͬ���汾�ŵ� v1.61������ `version.js` д��汾��ʷ�б���

### �漰�ļ�

- `miniprogram/projects/B00/pages/work/note/work_note.js`
- `miniprogram/projects/B00/pages/work/note/work_note.wxml`
- `miniprogram/projects/B00/pages/work/note/work_note.wxss`
- `miniprogram/projects/B00/pages/work/messages/work_messages.js`
- `miniprogram/projects/B00/pages/work/messages/work_messages.wxml`
- `miniprogram/projects/B00/pages/work/messages/work_messages.wxss`
- `miniprogram/projects/B00/pages/work/my/work_my.js`
- `miniprogram/projects/B00/pages/work/my/work_my.wxml`
- `miniprogram/projects/B00/pages/work/my/work_my.wxss`
- `miniprogram/projects/B00/pages/work/version/work_version.js`
- `miniprogram/projects/B00/pages/work/version/work_version.json`
- `miniprogram/projects/B00/pages/work/version/work_version.wxml`
- `miniprogram/projects/B00/pages/work/version/work_version.wxss`
- `miniprogram/app.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `cloudfunctions/mcloud/project/B00/controller/work_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ��С�ǡ���Ϣ���ҵġ��汾ҳ JS���Լ� `version.js`��`setting.js`��`work_service.js`��`work_controller.js`��`route.js`��ͨ����
- JSON �����Ѽ�� `app.json`��`work_version.json`��`messages.json`��`note.json`��`project.config.json`��ͨ����ȷ�ϰ汾ҳ��ע�ᵽ `app.json`��
- `git diff --check` �Ѽ�鱾���漰�ļ���δ���ֿհ׻򲹶���ʽ���⡣
- ΢�ſ����߹����Ѵ��������أ��ƺ���δ�ϴ�ǰ���������·���貿�� `mcloud` �����ƶ���Ч��

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���
- δ�ϴ� `mcloud` �ƺ�����

## v1.60 - 2026-06-11 09:38:22 CST

### �Ķ�����

С�ģ�v1.59 -> v1.60��

### ����Ŀ��

�޸�Сèȫ������չ��������𽻻���������ҵ��ҳ����չʾ��ʽ��Ĭ���������У��û����չ�����ٲ鿴������Ա����Ŀ���ٳ��֡�������/��չʾ�������İ���

### �� AI ���ۺ���������

- Сèȫ������չ��ʱ���Ҳ�հ�Ӧ��Ϊ���������������ֻ������������ر������Ի���
- ҵ������Ĭ��Ӧ�۵�������һ��ҳ���¶���������С�
- Ա��/�Ŷ��л�ֻ��Ҫ��չ��״̬չʾ��
- �����޽��Ȩ�޵�����Ա�����������������μ��ɣ�����Ҫ����д������������

### ��Ҫ�޸�

- Сè������������ `chat-sidebar-scrim`��ȫ������չ��ʱ�����Ҳ�հ�����
- ���� `bindHideSidebar`������Ҳ�հ�ʱ���������
- ҵ��ҳ���� `rankExpanded` ״̬��Ĭ�� `false`��
- ҵ������ͷ��������չ��/���𡱰�ť��չ�������Ⱦ�����б���Ա��/�Ŷ��л���
- �л��·ݺ����лָ��۵�״̬��
- ɾ���Ǳ���������Ŀ�ġ���չʾ�������͡���������չʾ��
- ͬ���汾�ŵ� v1.60��

### �漰�ļ�

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/projects/B00/pages/work/performance/work_performance.js`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `work_pet.js` �� `work_performance.js`��ͨ����
- `node --check` �Ѽ�� `setting.js` �� `version.js`��ͨ����
- `app.json`��`project.config.json` JSON ����ͨ����
- �����漰�ļ� `git diff --check` ͨ����
- `miniprogram/projects/B00/pages/work/performance` �����ޡ�������/��չʾ������չʾ�İ���

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���
- δ�ϴ� `mcloud` �ƺ�����

## v1.59 - 2026-06-11 09:27:41 CST

### �Ķ�����

С�ģ�v1.58 -> v1.59��

### ����Ŀ��

�޸�Сè AI �Ŵ�����Ľ������⣬��������ͼ¼��������ʶ���������Ŵ�̬Ĭ�ϲ���ʾ��������������ݿ������¹������ϴ����Ž�ͼ��һ��ͼ���ж������ʱ����ֻ��¼һ����

### �� AI ���ۺ���������

- �Ŵ�����ʱ�����ӦĬ�����أ��û���Ҫʱ���ֶ�չ����
- �Ŵ���������������֧�����·�ҳ�����ܱ����ֲ�� flex �߶����ƿ�ס��
- ��ͼʶ���ܼ���һ��ͼֻ��һ������������ͼ�����Ŷ�����Ƭ��Ӧ������ȡ��
- ��˲���ֻ������ʾ�ʣ�Ӧ������������Э���ִ�в㶵�ס�

### ��Ҫ�޸�

- ����Ŵ�����ʱǿ��Ĭ�������������رջ����´�����ָ���̬ͨ��
- ���� `scroll-view` ���� flex ֧�֣��������� `height:0`��`flex:1`��`overflow:hidden`������ȫ��̬���ɹ�����
- ���ֲ㲻�ٽػ����� `touchmove`������Ӱ���ڲ������б�������
- ��ͼ¼�������ʾ��Ϊ����ʶ�𲢼�¼���п�ȷ�϶�����
- ��� AI ����Э������ `create_orders`��֧��һ�����������������ڡ�
- ��˼��� `create_order.data.orders`����ʹģ�ͷ��ضඩ�����鵫���������ǵ�����Ҳ�ᰴ����������
- �������������᷵���������嵥��ʶ�𵽵�ȱ�����ڻ�ͻ����Ƶ���Ŀ�ᵥ��˵����
- ͬ���汾�ŵ� v1.59��

### �漰�ļ�

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `work_ai_service.js` �� `work_pet.js`��ͨ����
- `node --check` �Ѽ�� `setting.js` �� `version.js`��ͨ����
- `app.json`��`project.config.json` JSON ����ͨ����
- �����漰���Ѹ����ļ� `git diff --check` ͨ��������δ�����ļ��ѵ����� JS �﷨��顣

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���
- δ�ϴ� `mcloud` �ƺ�����

## v1.58 - 2026-06-11 20:10:00 CST

### �Ķ�����

С�ģ�v1.57 -> v1.58��

### ����Ŀ��

�ο������ƶ��˲������ʽ���Ż�Сè AI ȫ������ĻỰ����������ѷŴ�/��С�����ֲ�����Ϊ��Լͼ�갴ť��

### �� AI ���ۺ���������

- �����Ӧ���������룬������խ�б���
- �������Ҫ������ռλ��������ڡ��Ự�б��͵ײ���������
- �Ự��Ӧ��������Ӧ���б���Բ�α�ʶ�����⡢��������Ϣ������ɾ����ڡ�
- ȫ�����춥���ġ��Ŵ�/��С/�رա��Ȳ�Ӧʹ�����ְ�ť��Ӧ�ĳɼ�Լͼ�ꡣ

### ��Ҫ�޸�

- ȫ������ͷ�������˵�ͼ�ꡣ
- �Ŵ�/��С����ա��رո�ΪԲ��ͼ�갴ť��
- ��������Ⱥ��Ӿ��㼶����Ϊ����ʽ��
- �������������ռλ������Сè��Ƭ�������ڡ��Ự�б��͵ײ���������
- �Ự��������ɫԲ���ѡ��̬��
- ͬ���汾�ŵ� v1.58��

### �漰�ļ�

- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ��Сè����Ͱ汾�ļ�����ͨ����
- `app.json` JSON ����ͨ����
- �����漰�ļ� `git diff --check` ͨ����

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���

## v1.57 - 2026-06-10 21:24:00 CST

### �Ķ�����

С�ģ�v1.56 -> v1.57��

### ����Ŀ��

�ð汾����ͨ���Ű���������Ķ����ݰ� `1. 2. 3.` ����չʾ������ϵͳ����һ���������Ѷ���

### �� AI ���ۺ���������

- ϵͳ `wx.showModal` �������Ű��������ޣ����ʺ�չʾ��������˵����
- ����ͨ��Ӧ��Ϊ�Զ��嵯����
- ����Ӧ��Ϊ���⡢�汾���ơ�����嵥������ʱ��Ͱ�ť����
- ���رա�ֻ�رձ��Σ����������ѡ��Լ�¼��ǰ�汾��
- ����С����û��ȫ�� `app.wxml`����ҳ���ڵ�Сè����йܸ���ͨ�浯����

### ��Ҫ�޸�

- `app.js` ����ֱ��ʹ�� `wx.showModal` չʾ����ͨ�档
- `app.js` ��������ҵ�ǰҳ�� `#workPet` ���������汾ͨ�����ݡ�
- Сè��������汾ͨ�浯��״̬���رպͲ��������¼���
- Сè��������嵥ʽ����ͨ�� WXML/WXSS��
- ͬ���汾�ŵ� v1.57��

### �漰�ļ�

- `miniprogram/app.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `app.js`��Сè����Ͱ汾�ļ�����ͨ����
- `app.json` JSON ����ͨ����
- �����漰�ļ� `git diff --check` ͨ����

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���

## v1.56 - 2026-06-10 21:16:00 CST

### �Ķ�����

С�ģ�v1.55 -> v1.56��

### ����Ŀ��

���Сè AI �������û�����ͼƬ��ֻ�ܿ������Ѹ���1��ͼƬ�����޷��ؿ�ͼƬ���ݵ����⡣

### �� AI ���ۺ���������

- ͼƬ��Ȼ�ϴ����ƴ洢���������� AI ��ģ̬ʶ��Ͷ���������
- ���촰��չʾ�������ٴ������ƶ�ͼƬ������ʹ��С���򱾵ػ���·����
- �û����ͺ����Ϣ����Ӧ��ʾͼƬ����ͼ��
- �������ͼӦ�ɴ�ͼƬԤ����
- �����͸�����ҲӦ��ʾ����ͼ�����㷢��ǰȷ�ϡ�

### ��Ҫ�޸�

- Сè�������ͼƬ���ػ���Ŀ¼������
- ͼƬ�ϴ�ʱͬʱ���Ƶ������ļ����档
- ������Ϣ���� `images` �ֶΣ����汾��Ԥ��·�����ļ����� fileID��
- ��������֧��ͼƬ����ͼչʾ�͵��Ԥ����
- �����͸�����֧��ͼƬС����ͼ��
- ͬ���汾�ŵ� v1.56��

### �漰�ļ�

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ��Сè����Ͱ汾�ļ�����ͨ����
- `app.json` JSON ����ͨ����
- �����漰�ļ� `git diff --check` ͨ����

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���
- δ�ϴ��ƺ�����

## v1.55 - 2026-06-10 21:06:00 CST

### �Ķ�����

С�ģ�v1.54 -> v1.55��

### ����Ŀ��

�ο� GitHub �� Hanako ���˸� agent �����˼·����ϱ���֪ʶ��͵�ǰС����ʵ�ʹ��ܣ�������Сè����������Ӱ������ҵ��� agent����������ͨ�����

### �� AI ���ۺ���������

- СèӦ�߱��������Ը񣬶�����ֻ�й̶�������
- СèӦ֪����С�������ʵ���ܱ߽磺���ڡ������������Ϣ��С�ǡ���Ϣ��������ҵ�������ʡ��������ġ��տ��ɡ���ˡ�AI ���á�
- СèӦ�������֪ʶ������������Ŀ��λ��������Ӱ�����ҵ��ڡ�������Ա��ҵ������빤�ʽ���С����������Ӱ�ǰ������ú���ʵҵ��������
- Сè���Լ���ֱ��д��ͷ���ҵ�����ݣ�������д�붼Ҫ�����Ŷ�С�������ˮ��
- �߷��ն����Բ������� AI ֱ��ִ�У�����ɾ�������ϡ��տ�˿�����ʡ�����ɡ����ͨ���������޸ġ�

### ��Ҫ�޸�

- AI ����ҳ������Сè�Ը�ѡ��
- ������� 4 ���Ը�ģ�壺ֵ��Сè������Сè�����Сè���ɽ�Сè��
- ��� agent ϵͳ��ʾ��ע���Ը񡢱���֪ʶ��ժҪ��С����ʵ�ʹ����嵥��
- AI ���߶������� `create_rest`��֧��������Ϣ/������롣
- AI ������Ϣ/���������Զ�д���Ŷ�С�������ˮ��
- СèĬ�Ͽ��������������Ϊ������ʵ�ʹ���̨��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� AI ����AI ����ҳ��Сè����Ͱ汾�ļ�����ͨ����
- `app.json` JSON ����ͨ����
- �����漰�ļ� `git diff --check` ͨ����

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���
- δ�ϴ��ƺ�����

## v1.54 - 2026-06-10 20:50:00 CST

### �Ķ�����

С�ģ�v1.53 -> v1.54��

### ����Ŀ��

�� AI Сè���촰�ڿ��ԷŴ�Ϊ�������칤��̨��֧���� Codex һ����������Ի�������ʾ��ǰ�Ի���������ռ�á�

### �� AI ���ۺ���������

- ��ͨ���촰�ڱ��������ӡ��Ŵ���ڡ�
- �Ŵ��Ӧ������ǰС������棬���ڳ��Ի���ʶͼ¼����
- ������ӻỰ����������½����л���ɾ���Ի���
- ɾ���Ի�ֻɾ�����������¼����Ӱ�충�������ں�С�ǡ�
- ������Ȧ��ʾ��ǰ�Ự���� token ռ�ã�ģ�������Ĵ������Ȱ�����˷��أ�ȱʡ��ģ�������㡣
- ������ֻ�����ش���ʵ�֣����ϴ���������

### ��Ҫ�޸�

- Сè�������ȫ��ģʽ���Ự������ͱ��ض�Ự���档
- �ɵ��Ự�����Զ�Ǩ��Ϊ��һ���Ự��
- ����ͷ������������ռ��Ȧ��
- `work_ai_service` ����ģ������usage ��Ԥ�������Ĵ��ڡ�
- AI ����ҳ��ʾ��ǰģ��Ԥ�������Ĵ��ڡ�
- ͬ���汾�ŵ� v1.54��

### �漰�ļ�

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ��Сè�����AI ����AI ����ҳ���汾�ļ�����ͨ����
- `app.json` JSON ����ͨ����
- �����漰�ļ� `git diff --check` ͨ����

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���
- δ�ϴ��ƺ�����

## v1.53 - 2026-06-10 20:36:00 CST

### �Ķ�����

С�ģ�v1.52 -> v1.53��

### ����Ŀ��

ÿ��С����汾���º��û���С����ʱӦ��������ͨ�浯��������ѡ��رջ������ѡ�

### �� AI ���ۺ���������

- ����ͨ��Ӧ��С��������ʱͳһ������
- ʹ�õ�ǰ�汾����Ϊ�����ж����ݡ�
- ���رա�ֻ�رձ��Σ����������ѡ���¼��ǰ�汾������ͬ�汾���ٵ���
- �´ΰ汾�ű仯���Զ����µ�����

### ��Ҫ�޸�

- `app.js` ���� `version.js`��
- ���� `showVersionNotice`����ȡ��ǰ�汾�����ơ�ժҪ�����ڡ�
- ʹ�ñ��ػ��� `YUNYU_VERSION_NOTICE_CLOSED` ��¼�ѹر����ѵİ汾�š�
- ͬ���汾�ŵ� v1.53��

### �漰�ļ�

- `miniprogram/app.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `app.js`��`setting.js`��`version.js`��ͨ����
- `app.json` JSON ����ͨ����
- �����漰�ļ� `git diff --check` ͨ����

### ����״̬

- �����ش������޸ġ�
- δִ��΢�ſ����߹����ϴ���

## v1.52 - 2026-06-10 20:22:00 CST

### �Ķ�����

С�ģ�v1.51 -> v1.52��

### ����Ŀ��

ʵ�� AI Сè������ͼƬ��ںͶ�ģ̬ʶ����·���û���ֱ���ϴ���ͼ���� AI ʶ���ͼ��ĵ���/������Ϣ����¼��ͬʱ����ͼ����Ϊ����������

### �� AI ���ۺ���������

- �û����� AI �Իش��޷�ʶ��ͼƬ�����������촰��û�������ļ���ͼƬ��ڡ�
- ��������Ӧ���� `+`��֧������ͼƬ���ļ���
- ��ǰ��һ��۽�ͼƬ������ͼƬ�ļ�����ͨ��ͼƬ�ļ��ݲ�����ʶ����·��
- ʹ�� Agnes APIHub �Ķ�ģ̬ģ��ʱ�����Ӧ�� OpenAI Chat Completions �� `image_url` ��ʽ��ͼ��
- �� AI ���ݽ�ͼ����������ԭ��ͼӦд�� `ORDER_ATTACHMENTS`��
- ������ֻ������ʵ�֣����ϴ���

### ��Ҫ�޸�

- Сè������� `chatAttachments` �� `uploadingAttachment` ״̬��
- ������������� `+` ��ť��
- ����ѡ��ͼƬ��ѡ������ͼƬ�ļ����ϴ��ƴ洢���Ƴ�������ǰ���߼���
- `work/ai_chat` ���������� `attachments` ������
- `WorkAiService.chat` ֧��ͼƬ������
- ���ʹ�� `cloudUtil.getTempFileURLOne` �� fileID ������ʱ URL��
- ��ģ̬�����н����һ���û���Ϣ��Ϊ `[{type:'text'}, {type:'image_url'}]`��
- AI ��������ʱ�������� fileID д�붩�� `ORDER_ATTACHMENTS`��
- ͬ���汾�ŵ� v1.52��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/controller/work_controller.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ����� JS �ļ���ͨ����
- `app.json` JSON ����ͨ����
- ҳ�������Լ��ͨ����
- �����漰�ļ� `git diff --check` ͨ����

### ����״̬

- �����ش������޸ġ�
- δ�ϴ� `mcloud` �ƺ�����
- δִ��΢�ſ����߹����ϴ���

## v1.51 - 2026-06-10 20:08:00 CST

### �Ķ�����

С�ģ�v1.50 -> v1.51��

### ����Ŀ��

�޸� AI ������ʵ��ʹ�ñջ��������Ӻ���Ҫɾ����ڡ�AI ������ǰҳ����Ҫ�Զ�ˢ�¡�ѯ�ʡ�����Ҫ��ʲô��ʱ��Ҫ�ۺϵ��ں�С��һ��������

### �� AI ���ۺ���������

- �û����� AI ���Ӵ�������ֶ�ɾ����Ӧ���ٴε���ʱ��ɾ����ڡ�
- �û����� AI �������ں�ҳ��û���Զ����£���Ҫ�ֶ�ˢ�²ų��֡�
- �û�Ҫ��������Ҫ��Щʲô���������ⲻֻ�鵵�ڣ�ҲҪ����С�ǵ���Ϣ���ۺϻش�
- ������ֻ������ʵ�֣����ϴ���

### ��Ҫ�޸�

- �����༭ҳ�ײ�������ȡ��/ɾ����������ť���������� `work/order_cancel` ������
- ������ҳ���Ƭ������ɾ������ť��
- ������� `WorkService.cancelItem`��`WorkController.cancelItem` �� `work/item_cancel` ·�ɡ�
- ������ҳ���� `onShow` �Զ�ˢ�¡�
- Сè����յ� AI д�붯�� `create_order/create_item/add_note` ���Զ����õ�ǰҳ��� `_loadDay`��`_loadCalendar` �� `_loadList`��
- AI `query_schedule` ��ѯ����ϲ���Ӧ���ڵ�С�ǣ��ش���һ����ֶ����������Ϣ��С�ǡ�
- ͬ���汾�ŵ� v1.51��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `cloudfunctions/mcloud/project/B00/controller/work_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.js`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.wxml`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.wxss`
- `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.wxml`
- `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ����� JS �ļ���ͨ����
- `app.json` JSON ����ͨ����
- `node` ��ɨ�� `app.json` ע��ҳ�������ԣ�ͨ����
- �����漰�ļ� `git diff --check` ͨ����

### ����״̬

- �����ش������޸ġ�
- δ�ϴ� `mcloud` �ƺ�����
- δִ��΢�ſ����߹����ϴ���

## v1.50 - 2026-06-10 19:55:00 CST

### �Ķ�����

С�ģ�v1.49 -> v1.50��

### ����Ŀ��

�޸������߹����� AI С����ѯ�ʡ����쵵�ڡ���δ��һ�ܵ��ڡ�ʱ�Իظ��޷��鿴ʵʱ���ݵ����⣬�� AI �����߱�����ǰ��¼�˺�Ȩ�޲�ѯ���ڵ�������

### �� AI ���ۺ���������

- �û���ͼ��ʾ AI ���ڻش��޷�ֱ�ӷ���ϵͳ��ʵʱ�������ݡ���˵��ֻ������д�붯����������
- �û���������������������Ӧͬʱ�ܲ���д��
- ���μ������ء����ϴ����ͱ���ʵ�֣����Լ��ϴ�����ֻ�ı��ش��벢��֤��

### ��Ҫ�޸�

- AI ���߶������� `query_schedule`��
- ���¹���ϵͳ��ʾ���û�ѯ�ʽ��졢���졢δ��һ�ܻ�ָ�����ڵ���ʱ��ģ�ͱ��뷵�� `query_schedule` ������
- `query_schedule` ���� `WorkService.getDayList` ��ѯ��ʵ�������ڡ�����ں���Ϣ��¼��
- ��ѯ��������ڻ��ܣ�����ʱ�䡢���͡��ͻ����ص㡢�������ϢժҪ��
- ���β�ѯ��� 14 �죬���������Χ��ȡ��
- ͬ���汾�ŵ� v1.50��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `work_ai_service.js`��`work_admin_ai.js`��`setting.js`��`version.js`��ͨ����
- `app.json` JSON ����ͨ����
- `node` ��ɨ�� `app.json` ע��� 86 ��ҳ�棬������ `js/json/wxml/wxss` �ļ���
- �����漰�ļ� `git diff --check` ͨ����
- δ�ϴ��ƺ�����δд�������ݿ⡢δ�ⷢ��ʵ AI ����

### ����״̬

- �����ش������޸ġ�
- δ�ϴ� `mcloud` �ƺ�����
- δִ��΢�ſ����߹����ϴ���
- δ�����ύ΢����ˡ�
- �û���Ҫ�����ϴ� `mcloud` �����ڿ����߹���/����в��ԡ������쵵�ڡ���δ��һ�ܵ��ڡ�������������

## v1.49 - 2026-06-10 19:38:00 CST

### �Ķ�����

С�ģ�v1.48 -> v1.49��

### ����Ŀ��

�� AI С���ֱ���ʵ��Ϊ�ܿ�ִ���������壺�û�����������ȷҪ���������ڡ�������С��ʱ��AI ����ֱ��д��ϵͳ�����Զ���ȫ��С�������¹�������¼��

### �� AI ���ۺ���������

- �û�ȷ�ϲ���Ҫ�ݸ�ȷ�����̣�ϣ�� AI ����ֱ�����ɵ��ڻ򶩵���
- �û�Ҫ��ÿ��ʹ��������������ȫ��С�����Զ����Ӽ򵥲�����ϸ�����������˿�������顣
- �û������ȷ�����ϴ����ͱ���ʵ�֣����Լ��ϴ�������˱���ֻ�����ش����޸ĺ���֤����ִ���ƺ����ϴ���С�����ϴ���
- ��ǰ�汾ֻ���������������ڡ���������ڡ�����С�ǣ�������ɾ�������񡢹��ʡ���ɡ���ˡ������޸ĵȸ߷���������

### ��Ҫ�޸�

- `WorkAiService.chat` ��Ϊ֧���ܿض���ʶ����ִ�С�
- ���� AI ����ϵͳ��ʾ��Ҫ��ģ����д����ͼ��ȷʱ���ؽṹ�� JSON ������
- ֧�ֶ�����`create_order`��`create_item`��`add_note`��`none`��
- ����Ա�����������������ģ�AI �ɸ���Ա�����������������������ɸ�����ҵ������ݡ�
- ������������ִ�и��� `WorkService.saveOrder`��
- ���������ִ�и��� `WorkService.saveItem`��
- ����С��ִ�и��� `WorkService.saveNote`��
- ÿ��д��ɹ����Զ����� `saveNote` ���� `team` ����С�ǣ�����Ϊ `AI������¼��...`�����ݰ��������ˡ�����ժҪ�ͼ�¼ ID��
- ͬ���汾�ŵ� v1.49��

### �漰�ļ�

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `work_ai_service.js`��`work_admin_ai.js`��`setting.js`��`version.js`��ͨ����
- `app.json` JSON ����ͨ����
- `node` ��ɨ�� `app.json` ע��� 86 ��ҳ�棬������ `js/json/wxml/wxss` �ļ���
- �����漰�ļ� `git diff --check` ͨ����
- δ�ϴ��ƺ�����δд�������ݿ⡢δ�ⷢ��ʵ AI ����

### ����״̬

- �����ش������޸ġ�
- δ�ϴ� `mcloud` �ƺ�����
- δִ��΢�ſ����߹����ϴ���
- δ�����ύ΢����ˡ�
- ������Ҫ�û������ϴ��ƺ���������򿪷��߹����ڲ��� AI ��������/����/С�ǡ�

## v1.48 - 2026-06-10 18:08:00 CST

### �Ķ�����

С�ģ�v1.47 -> v1.48��

### ����Ŀ��

�޸��������ġ�AI С���֡���ȡģ�ͺ�ǰ�˲���ʶ������̷��ص�ģ���б�������ģ�� picker ����Ϊ�ջ�ֻ���ֶ���д�����⡣

### �� AI ���ۺ���������

- �û�������֮ǰ����ʶ��ģ�͡�����ǰӦ������ͨ AI ������·���ģ���б�ʶ��
- ��ִ���ƶ˲��𡢲�д���ݿ⡢���ⷢ��ʵ API ���󣻱���ֻ�����ش�����ݺ;�̬��֤��
- ��Ҫͬʱ�����ֶ���дģ�� ID �Ķ��ף���������̲��ṩ `/models` ʱ������á�
- ��Ҫ�����ƺ��� helper ���ܷ��� `ret.data`��Ҳ�����Ѿ����Ϊҵ�����������

### ��Ҫ�޸�

- ǰ�� `admin_ai` ҳ������ `_parseModelsResult`��ͳһ���ݶ�㷵�ؽṹ��
- ǰ��ģ�ͽ���֧���ַ���ģ�����顢����ģ������Ͷ��ֳ����ֶ�����
- ǰ����ģ���б�Ϊ��ʱ��ʾ��ȷ��ʾ�������󱨡��ѻ�ȡģ�͡���
- ��� `work_ai_service` ģ�ͽ�������Ƕ�� `model.id/model.name`�������⽫����ת���� `[object Object]`��
- ͬ���汾�ŵ� v1.48��

### �漰�ļ�

- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `work_admin_ai.js`��`work_ai_service.js`��`setting.js`��`version.js`��ͨ����
- `app.json` JSON ����ͨ����
- `node` ��ɨ�� `app.json` ע��� 86 ��ҳ�棬������ `js/json/wxml/wxss` �ļ���
- �����漰�ļ� `git diff --check` ͨ����
- δ�ϴ��ƺ�����δд�������ݿ⡢δ�ⷢ��ʵ AI ����
- ������΢�ſ����߹��������±��룬���ڡ�AI С���֡�ҳ�������ʹ���ѱ��� API Key ��������ȡģ�͡�Ŀ��ȷ�ϡ�

### ����״̬

- ���ش������޸ġ�
- ��δ�ϴ� `mcloud` �ƺ�����
- ��δִ��΢�ſ����߹����ϴ���
- ��δ�����ύ΢����ˡ�

## v1.47 - 2026-06-10 17:43:02 CST

### �Ķ�����

С�ģ�v1.46 -> v1.47��

### ����Ŀ��

�޸�ůֽ��ҳ�����Ż���΢��ԭ�������������͵ײ� tabBar ��Ȼ��ʾ��ɫ�����⡣

### �� AI ���ۺ���������

- �û���΢�ſ����߹��߽�ͼ��ָ���������͵ײ����ǰ�ɫ�ġ���
- ���ȷ��ҳ�������Ѿ�Ӧ��ůֽɫ���� `app.json` ��ԭ�� `navigationBarBackgroundColor` ��Ϊ `#ffffff`��ԭ�� tabBar ������Ϊ `#fefefe`��
- ����Ӧ��������΢��ԭ����λ���ã������Ǽ�������ҳ�� WXSS��
- ���β���ҵ���߼��������ƺ������������ݽṹ��

### ��Ҫ�޸�

- ȫ�� `window.backgroundColor` ��Ϊůֽɫ `#f5efe4`��
- ȫ�� `navigationBarBackgroundColor` ��Ϊůֽɫ `#f5efe4`��
- ԭ�� tabBar ������Ϊůֽɫ `#f5efe4`��
- ԭ�� tabBar δѡ������ɫ��Ϊ�ͱ���īɫ��ѡ��ɫ��Ϊ������ɫ��
- ԭ�� tabBar ����ǳɫ�߿����ã������ײ���ɫ�ϲ㡣
- ��������������е� `text`��`input`��`button`��`[disabled]` ��ʽѡ������Ϊ��ʽ class��������� WXSS ѡ�������档
- ͬ���汾�ŵ� v1.47��

### �漰�ļ�

- `miniprogram/app.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`

### ��֤���

- `node --check` �Ѽ�� `miniprogram/version.js`��`miniprogram/setting/setting.js`��ͨ����
- `app.json` JSON ����ͨ����
- `node` ��ɨ�� `app.json` ע��� 86 ��ҳ�棬������ `js/json/wxml/wxss` �ļ���
- �����漰�ļ� `git diff --check` ͨ����
- `work_pet.wxss` �Ѽ�鲻�ٰ���������õ� tag/attribute ѡ������
- ȫ�� `git diff --check` ���ܼ���δ�����ļ� `miniprogram/projects/B00/biz/project_biz.js` β��ո�Ӱ�죬����δ�ĸ��ļ���
- ��ǰɳ���޷�ͨ��΢�ſ����߹��� CLI �������뻺�棬CLI �� `listen EPERM 127.0.0.1:3799`��
- ����΢�ſ����߹������ֶ���������롱��Ŀ��ȷ�϶������ײ������屳��������

### ����״̬

- ���ش������޸ġ�
- ��δִ��΢�ſ����߹����ϴ���
- ��δ�����ύ΢����ˡ�

## v1.46 - 2026-06-10 17:19:23 CST

### �Ķ�����

С�ģ�v1.45 -> v1.46��

### ����Ŀ��

�Ż�С����ǰ�˽��棬ʹ����̨�۸и��ӽ��û��ṩ��ͼ�е���ʵ��ҳ��ůֽ���ᴰ�ڷ��

### �� AI ���ۺ���������

- �û�ϣ���ο������� OpenHanako ���ƹ۸У���ʵ��ҳ��ůɫֽ�桢�������ڡ��ͶԱ���������
- �û�˵������Ŀ�ǿ�Դ�ģ�����ȥ GitHub ѧϰǰ��˼·��Ӧ�õ���ǰС����
- ����ֻ������ԭ�򣬲����ƴ��Դ�롣
- �ο���ĿΪ `https://github.com/liliMozi/openhanako`���ص�鿴 `warm-paper` �� `new-warm-paper` ���⡣
- ��Ǩ�Ƶ�΢��С������Ӿ�Ҫ�㣺ůֽ������ֽҳ��Ƭ��ϸ�߿򡢵ͱ���īɫ���֡�������ɫ������Ӱ�����ø߱��ͽ��䡣
- ��ǰ�Ķ��޶�Ϊǰ�� WXSS������ҵ�����ݡ��ƺ����ӿں�ҳ���߼���

### ��Ҫ�޸�

- ȫ�� `app.wxss` ����ůֽ������ֽҳ��Ƭ�����Ӿ���
- ����ҳ��Ϊůֽ������ֽҳ����������ѡ��̬�͵ͶԱ���������
- ҵ��ҳ��ΪֽҳӢ�ۿ�������ǿ���ߡ�ůָֽ�꿨�͵ͱ������п���
- ����ҳ��Ϊֽҳͷͼ��ůֽɸѡ��ֽҳ��������������ť��
- �ҵ�ҳ��Ϊֽҳ���Ͽ���ůֽ������塢����������ť��īɫ���ֲ㼶��
- С��ҳ��Ϊůֽ�ֶΡ�ֽҳ�ʼǿ�����������������ť��
- �������ĺ� AI С��������ҳͳһΪֽҳ��Ƭ��ϸ�߿����������ť��
- ������������Ϊůֽ���㡢ֽҳ AI ���ݺ������û����ݡ�
- ͬ���汾�ŵ� v1.46��

### �漰�ļ�

- `miniprogram/app.wxss`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.wxss`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/projects/B00/pages/work/add/work_add.wxss`
- `miniprogram/projects/B00/pages/work/my/work_my.wxss`
- `miniprogram/projects/B00/pages/work/note/work_note.wxss`
- `miniprogram/projects/B00/pages/work/admin_home/work_admin_home.wxss`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/cmpts/tech_footer/tech_footer.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�鱾�����С���� JS���汾�ļ���ͨ����
- `node` �Ѽ�� `project.config.json`��`app.json` �ɽ�������ɨ�� `app.json` ע��� 86 ��ҳ������� `js/json/wxml/wxss` �ļ���
- `git diff --check` �Ѽ�鱾�������ʽ�Ͱ汾�ĵ���ͨ����
- �Ѽ�鱾����ʽ�Ͱ汾�ĵ�δд�� API Key ���ġ�
- ��ͨ��΢�ſ����߹��� CLI ���� `compile` ���뻺�沢���´򿪵�ǰ��Ŀ��
- ������΢�ſ����߹����б��벢Ŀ�Ӽ����Ҫҳ��۸С�

### ����״̬

- ���ش������޸ġ�
- ��δִ��΢�ſ����߹����ϴ���
- ��δ�����ύ΢����ˡ�

## v1.45 - 2026-06-10 17:00:02 CST

### �Ķ�����

С�ģ�v1.44 -> v1.45��

### ����Ŀ��

�޸�΢�ſ����߹���������AI С���֡���ҳ��������ʾ `./projects/B00/pages/work/admin_ai/work_admin_ai.wxml not found` �����⡣

### �� AI ���ۺ���������

- �û�������AIС���ֵ��ȥ�����롱����ͼ��ʾʵ���쳣Ϊ `work_admin_ai.wxml not found`��
- ���ؼ��ȷ�� `work_admin_ai.js/json/wxml/wxss` �ĸ�ҳ���ļ����ڡ�
- ���ؼ��ȷ�� `app.json` ��ע�� `projects/B00/pages/work/admin_ai/work_admin_ai`��
- ���ؼ��ȷ�� `project.config.json` ��С�����Ŀ¼Ϊ `miniprogram/`��ҳ��·����Թ�ϵ��ȷ��
- �жϸ�����������ǿ����߹���û��ˢ�µ��½�ҳ���ļ�����ǰ���볡����ָ��ɻ��档
- �޸����ԣ�����Ŀ���������� AI С��������ҳ����ʽ���볡�������ڿ����߹���ֱ�����±����ҳ�档

### ��Ҫ�޸�

- `project.config.json` ������AIС�������á����볡����
- ͬ���汾�ŵ� v1.45��

### �漰�ļ�

- `project.config.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`��`miniprogram/app.js`��`miniprogram/helper/share_helper.js`��ͨ����
- `node` �Ѽ�� `app.json`��`work_admin_ai.json`��`project.config.json`��`version.js` �ɽ�����ͨ����
- `node` ��ɨ�� `app.json` ע��� 86 ��ҳ�棬������ `js/json/wxml/wxss` �ļ���
- ��ͨ��΢�ſ����߹��� CLI ���� `compile` ���뻺�沢���´򿪵�ǰ��Ŀ��
- ������΢�ſ����߹��߽�������AI С���֡�Ŀ��ȷ�� `work_admin_ai.wxml not found` ���ٳ��֡�

### ����״̬

- ���ش������޸ġ�
- ��δִ��΢�ſ����߹����ϴ���
- ��δ�����ύ΢����ˡ�

## v1.44 - 2026-06-10 16:44:32 CST

### �Ķ�����

С�ģ�v1.43 -> v1.44��

### ����Ŀ��

�޸�΢�ſ����߹����޷���������⡣����̨���� `module 'helper/share_helper.js' is not defined, require args is './helper/share_helper.js'`������ `app.js` ��ʼ��ʧ�ܣ���ҳ `projects/B00/pages/work/calendar/work_calendar` δע�ᡣ

### �� AI ���ۺ���������

- �û����������ڱ��벻�ˡ������ṩ΢�ſ����߹��߿���̨��ͼ��
- �������λΪ��`app.js` �����׶����� `./helper/share_helper.js`�������߹�������ʱû����ȷʶ���ģ�飬�������� App ��ʼ���жϡ�
- �޸����ԣ������� App �����������ⲿ helper���ѷ���Ĭ���߼������� `app.js`�������������������ա�
- �øĶ����ı�ҵ�����ݡ����漰�ƺ���������Ҫ�����κ�������Ϣ��

### ��Ҫ�޸�

- �Ƴ� `app.js` ���� `require('./helper/share_helper.js')`��
- �� `app.js` ������Ĭ�Ϸ������⡢·��������ͼ������Ȧ query �Ĺ淶��������
- ����ȫ�� `Page` ��������������ҳ���Կɼ̳�Ĭ�Ϸ������á�
- ͬ���汾�ŵ� v1.44��

### �漰�ļ�

- `miniprogram/app.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### ��֤���

- `node --check` �Ѽ�� `miniprogram/app.js`��`miniprogram/setting/setting.js`��`miniprogram/version.js`��ͨ����
- `git diff --check` �Ѽ�鱾����ظĶ���ͨ����
- ������΢�ſ����߹����ڵ��������/ˢ�¡�ȷ�Ͽ���̨���ٳ��� `share_helper.js is not defined`��

### ����״̬

- ���ش������޸ġ�
- ��δִ��΢�ſ����߹����ϴ���
- ��δ�����ύ΢����ˡ�

## v1.43 - 2026-06-10 16:32:15 CST

### �Ķ�����

С�ģ�v1.42 -> v1.43��

### ����Ŀ��

�޸�΢��С���� 1.3 ����ʧ���еġ���������/��¼���ޡ����⡣���Աû�а�Ա���˺�ʱ��Ҳ�ܽ���С����鿴���Ĺ��ܽṹ�������ܶ�ȡ���޸���ʵ��¼������ݡ�

### �� AI ���ۺ���������

- ΢�����ʧ��ԭ���ǣ�С���������漰�˺ŵ�¼�򻷾�����Ҫ�����Ա���޷��������鹦�ܡ�
- �û�ȷ�Ͽ����ڵ�¼/��ҳ���������ÿͽ��롱��
- �ÿͽ�������������Ҫ���ܣ������ܿ�����¼�����ʵ���ݡ�
- �ÿ�ģʽӦʹ�ñ�����ʾ���ݣ���������ʵԱ�������������ʡ��ͻ����ƶ����ݽӿڡ�
- �ÿ�ģʽ�µ��������༭����ʵ���顢��ʵ AI �Ի��ȶ���Ӧ�����أ�����ʾ��Ա����ʹ�á�
- ��������ʱ��Ҫ����˱�ע��˵���ÿ����·����

### ��Ҫ�޸�

- �����ÿ�ģʽ״̬��ͨ�����ػ��� `WORK_GUEST_MODE` ����Ƿ��ڷÿ����顣
- ����������ʾ���ݣ����ڡ�������ҵ�����С�С�Ǿ��ɱ��� helper ���ɡ�
- ���ҵġ�ҳ�������ÿͽ��룬�����鹦�ܡ���ť����֧���˳��ÿ�ģʽ��
- ����ҳ֧�ַÿ���ʾ���ڣ�������δ��Ա��ֱ�ӿ�ס��
- ҵ��ҳ֧��������ʾ���У���չʾ��ʵ������ʵҵ����
- ����ҳ֧����ʾ�����б��������ͱ༭����ڷÿ�ģʽ�±����ء�
- С��ҳ֧����ʾ�Ŷ�/����С�ǣ���ʵ���ݺͱ༭����ڷÿ�ģʽ�±����ء�
- è�� AI �ڷÿ�ģʽ��ֻ���ر���˵������������ʵ AI �ӿڡ�
- ��Ŀ�汾��Ϣͬ���� v1.43��
- �����汾��̬���ƣ��������ش����޸�Ĭ��ͬ���汾�š�`CHANGELOG.md` �ͱ��ĵ���
- ���� Codex ���������Ѽ���汾��̬Ҫ�󣬱����Ժ�ֻ�Ĵ��벻д�汾��¼��

### �漰�ļ�

- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`
- `miniprogram/helper/guest_helper.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.js`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.wxml`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.wxss`
- `miniprogram/projects/B00/pages/work/my/work_my.js`
- `miniprogram/projects/B00/pages/work/my/work_my.wxml`
- `miniprogram/projects/B00/pages/work/my/work_my.wxss`
- `miniprogram/projects/B00/pages/work/performance/work_performance.js`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/projects/B00/pages/work/add/work_add.js`
- `miniprogram/projects/B00/pages/work/add/work_add.wxml`
- `miniprogram/projects/B00/pages/work/add/work_add.wxss`
- `miniprogram/projects/B00/pages/work/note/work_note.js`
- `miniprogram/projects/B00/pages/work/note/work_note.wxml`
- `miniprogram/projects/B00/pages/work/note/work_note.wxss`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `/Users/Admin/Documents/Codex/AGENTS.md`
- `/Users/Admin/.codex/private-evolution/index.md`

### ��֤���

- `node --check` �Ѽ���������޸ĵ� JS �ļ���ͨ����
- `git diff --check` �Ѽ�鱾����ظĶ���ͨ����

### ����ע����

```text
�����Աδ��Ա���˺ţ��ɽ���ײ����ҵġ�ҳ�棬������ÿͽ��룬�����鹦�ܡ����ÿ�ģʽ��չʾ��ʾ���ݣ�����ȡ��ʵԱ�������������ʡ��ͻ����ϣ�Ҳ�����ύ������༭��
```

### ����״̬

- ���ش������޸ġ�
- ��δִ��΢�ſ����߹����ϴ���
- ��δ�����ύ΢����ˡ�

## v1.42 - 2026-06-10

### �汾����˵��

�û�ȷ�ϵ�ǰ��Ŀ�汾Ϊ v1.42�����ο�ʼִ�а汾��̬���򣬺���ÿ�δ����޸Ķ���Ҫͬ���汾�ź��޸��ռǡ�

### �����۵���д������ԭ�ĵ�����

- �û���Ҫ������ AI API Ĭ�Ͻӿڡ�������֧��Ĭ�� APIHub Base URL������Կ��д����롢�ĵ��򱾵ع���
- �û�Ҫ��С����֧�ַ�������������ǰ����������Ĭ�Ϸ���������
- �û�Ҫ�����è�����ײ��������Ż���ۺ���ק����������ǰ�����е�����������

## v2.30 - 2026-06-25 14:30 CST

### �Ķ�����

���ܵ�����v2.20 -> v2.30��+0.10����

### ����Ŀ��

�滻Ĭ��AI��Ӧ��ΪAgnes��Ԥ��Key��ģ�����ã����伴�á�

### ��Ҫ�޸�

- cloudfunctions/mcloud/project/B00/service/work_ai_service.js
  - DEFAULT_CONFIG.enabled: false -> true
  - providerName: Mimo -> Agnes
  - apiUrl: https://api.xiaomimimo.com/v1 -> https://api.agnes-ai.com/v1
  - model: mimo-v2.5 -> agnes-20-flash
  - visionApiUrl: '' -> https://api.agnes-ai.com/v1
  - visionModel: '' -> agnes-20-flash
  - apiKey: '' -> sk-***REDACTED***
  - �Ƴ�һ��Ӳ���� Mimo �������ã���Ϊ DEFAULT_CONFIG.providerName ��̬���á�

- cloudfunctions/mcloud/work_ai_service_live_patch.js
  - ͬ�����´����registry/memory/auditModel/confirmModel/confirmService + ���º�� service��

### ��֤���

- node --check work_ai_service.js: pass
- node --check work_ai_service_live_patch.js: pass
- node --check ��������ģ��: pass
- Live patch ��ѹ��֤ȫ��6��payload 100% ƥ��Դ�ļ�
- git diff --check: pass����CRLF���棬��ʵ�ʴ���

### �漰�ļ�

- cloudfunctions/mcloud/project/B00/service/work_ai_service.js
- cloudfunctions/mcloud/work_ai_service_live_patch.js
- miniprogram/version.js
- miniprogram/setting/setting.js
- CHANGELOG.md
- docs/version-change-diary.md

### δ��ɷ���

- ��Ҫ�� WeChat �����߹����ϴ������棨�汾��1.100��
- ����ˡ�������
