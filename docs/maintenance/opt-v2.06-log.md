# opt/v2.06 B14 日志

## B14: Object 字段白名单 + 性能监控基础 (2026-06-25)

### 修复清单

| ID | 严重度 | 描述 | 文件 | 状态 |
|----|--------|------|------|------|
| H-02 | Critical | Staff save 字段白名单 | work_admin_staff_service.js | Done |
| H-02 | Critical | Order save 字段白名单 | work_service.js | Done |
| H-02 | Critical | Payment DTO 字段白名单 | work_payment_service.js | Done |
| H-02 | Critical | Admin payment DTO 字段白名单 | work_service.js | Done |
| P-01 | Low | perf_util 性能监控工具 | framework/utils/perf_util.js | Done |
| P-02 | Low | admin_home 页面加载计时 | work_admin_home.js | Done |

### 详细说明

#### H-02: Staff save 字段白名单
- `work_admin_staff_service.js` 的 `saveStaff` 方法入口新增字段白名单过滤
- 白名单字段: STAFF_NAME, STAFF_MOBILE, STAFF_BIND_CODE, STAFF_ROLES, STAFF_RULES, STAFF_STATUS, STAFF_IS_ADMIN, STAFF_TEAM_ID, STAFF_TEAM_NAME
- 保留 _id/id 用于编辑定位
- 阻断: STAFF_OPENID, STAFF_OPENID_BIND_STATUS, STAFF_LOGIN_TIME, STAFF_ADD_TIME, STAFF_EDIT_TIME, STAFF_ADD_IP, STAFF_EDIT_IP 等注入
- 注意: STAFF_IS_ADMIN 在白名单中，但后续有单独的管理员权限校验逻辑（已在 B13 修复）

#### H-02: Order save 字段白名单
- `work_service.js` 的 `saveOrder` 方法入口新增字段白名单过滤
- 白名单字段: ORDER_DATE, ORDER_TIME, ORDER_END_TIME, ORDER_TYPE_ID/NAME/COLOR, ORDER_CUSTOMER_NAME/MOBILE, ORDER_SOURCE/CONTENT/PLACE, ORDER_IS_OLD_CUSTOMER, ORDER_AMOUNT/DEPOSIT/FINAL/EXTRA, ORDER_PROGRESS, ORDER_*_CENT, ORDER_PARTICIPANTS, ORDER_ATTACHMENTS, ORDER_PAYMENTS
- 保留 _id/id 用于编辑定位
- 阻断: ORDER_STATUS, ORDER_SETTLE_STATUS, ORDER_CREATOR_OPENID, ORDER_CREATOR_STAFF_ID, ORDER_COMPLETE_TIME, ORDER_AUDIT_ADMIN_ID, ORDER_FINANCE_STATUS, ORDER_COMMISSION_STATUS 等注入

#### H-02: Payment DTO 字段白名单
- `work_payment_service.js` 新增静态方法 `sanitizePaymentDto(dto)`
- 白名单: 类型/方向/基数类型/金额/日期/月份/归属员工/备注/幂等key/clientKey/version/删除标记等
- 阻断: PAYMENT_STATUS, PAYMENT_IS_LOCKED, PAYMENT_LOCK_KEY, PAYMENT_SUMMARY, PAYMENT_OPERATOR_*, PAYMENT_ADD_TIME, PAYMENT_ADD_IP, PAYMENT_STAFF_OPENID 等注入
- 应用到: `saveOrderPayments` (循环每个DTO), `saveAdminPayment`, `saveAdminOrderPayment`(work_service.js)

#### P-01: perf_util 性能监控工具
- 新增 `cloudfunctions/mcloud/framework/utils/perf_util.js`
- 提供 `startTimer(label)`, `endTimer(timer)`, `trackQuery(label, queryFn)` 三个 API
- 超过 3 秒阈值自动输出 warn 日志
- LogUtil 实例懒加载，避免不必要的模块初始化开销

#### P-02: admin_home 页面加载计时
- onLoad 记录页面加载起点 `_pageLoadStart`
- _loadData 记录云函数请求耗时，超过 3s 输出 console.warn
- 首次数据就绪时计算 onLoad->data 总耗时，超过 5s 输出 console.warn

### 白名单设计原则
1. **只放行业务字段**: 白名单严格对应前端表单需要提交的字段
2. **服务端自行管理字段不入白名单**: STATUS, IS_ADMIN, OPENID, ADD_TIME, ADD_IP 等
3. **保留 _id/id**: 编辑模式需要定位记录，但不包含 _pid（由服务端注入）
4. **兼容多别名**: Payment DTO 同时支持 PAYMENT_TYPE 和 type 等简写形式
5. **不改变现有 API**: 白名单是纯过滤，不改变接口入参和返回值结构

### 验证要点
- 普通员工保存订单时无法注入 ORDER_STATUS=10 取消订单
- 普通员工保存收款时无法注入 PAYMENT_IS_LOCKED=1 锁定收款
- 前端传 STAFF_IS_ADMIN=1 时仍受 saveStaff 中的管理员权限校验拦截
- 所有现有 API 接口行为不变，白名单字段覆盖所有前端表单场景
