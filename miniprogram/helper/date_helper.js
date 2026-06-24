function today() {
	let d = new Date();
	let y = d.getFullYear();
	let m = String(d.getMonth() + 1).padStart(2, '0');
	let day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

module.exports = { today };
