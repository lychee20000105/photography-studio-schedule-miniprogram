function isUndatedOrder(order) {
	return !order || order.ORDER_DATE === undefined || order.ORDER_DATE === null || order.ORDER_DATE === '';
}

function formatOrder(order) {
	order = Object.assign({}, order || {});
	let amount = Number(order.ORDER_AMOUNT || 0);
	let paid = Number(order.PAID_AMOUNT !== undefined && order.PAID_AMOUNT !== null ? order.PAID_AMOUNT : (order.ORDER_ACTUAL_AMOUNT || 0));
	let unpaid = Number(order.UNPAID_AMOUNT !== undefined && order.UNPAID_AMOUNT !== null ? order.UNPAID_AMOUNT : Math.max(0, amount - paid));
	order.PAID_AMOUNT = paid;
	order.UNPAID_AMOUNT = unpaid;
	order.ORDER_DATE_TEXT = isUndatedOrder(order) ? '未定档' : order.ORDER_DATE;
	order.ORDER_PROGRESS_TEXT = order.ORDER_PROGRESS_DESC || (order.ORDER_PROGRESS ? (order.ORDER_PROGRESS + '%') : '未开始');
	order.ORDER_SETTLE_TEXT = order.ORDER_SETTLE_STATUS_DESC || order.ORDER_SETTLEMENT_STATUS_DESC || order.ORDER_PAY_STATUS_DESC || '未结算';
	return order;
}

module.exports = { isUndatedOrder, formatOrder };
