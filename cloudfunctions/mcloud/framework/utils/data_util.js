/**
 * Notes: 字符相关操作函数
* Ver : CCMiniCloud Framework 2.33.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2025-09-05 04:00:00 
 */

const crypto = require('crypto');
const timeUtil = require('./time_util.js');

const RANDOM_STRING_CHARS = 'abcdefghijklmnopqrstuvwxyz' + Array.from({ length: 10 }, (_, idx) => String(idx)).join('');
const RANDOM_INT_CHARS = Array.from({ length: 10 }, (_, idx) => String(idx)).join('');
const RANDOM_ALPHA_CHARS = 'abcdefghijklmnopqrstuvwxyz';

const PASSWORD_HASH_PREFIX = 'pbkdf2_sha256';
const PASSWORD_HASH_ITERATIONS = 120000;
const PASSWORD_HASH_KEY_LEN = 32;
const PASSWORD_SALT_LEN = 16;

/**
 * 生成一个特定范围内的随机数
 */
const randomIndex = max => {
	if (!Number.isInteger(max) || max <= 0) return 0;

	const maxUInt32 = 0x100000000;
	const limit = maxUInt32 - (maxUInt32 % max);
	let value = 0;

	do {
		value = crypto.randomBytes(4).readUInt32BE(0);
	} while (value >= limit);

	return value % max;
}

const genRandomNum = (min, max) => {
	min = Math.ceil(Number(min));
	max = Math.floor(Number(max));

	if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
	if (min > max) [min, max] = [max, min];

	return min + randomIndex(max - min + 1);
}

const genRandomByChars = (len, chars) => {
	len = Number(len) || 0;
	if (len <= 0) return '';

	let rdmString = '';
	for (; rdmString.length < len; rdmString += chars.charAt(randomIndex(chars.length)));
	return rdmString;
}

// 生成一个随机的数字字母字符串
const genRandomString = len => genRandomByChars(len, RANDOM_STRING_CHARS);

// 生成一个随机的数字字符串
const genRandomIntString = len => genRandomByChars(len, RANDOM_INT_CHARS);

// 生成一个随机的字母字符串
const genRandomAlpha = len => genRandomByChars(len, RANDOM_ALPHA_CHARS);

function genStrongPassword(len = 24) {
	const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const lower = RANDOM_ALPHA_CHARS;
	const digit = RANDOM_INT_CHARS;
	const symbol = '!@#$%^&*_-+=';
	const groups = [upper, lower, digit, symbol];
	const chars = groups.join('');
	let pwd = groups.map(group => group.charAt(randomIndex(group.length)));

	for (; pwd.length < len; pwd.push(chars.charAt(randomIndex(chars.length)))) { }

	for (let i = pwd.length - 1; i > 0; i--) {
		let j = randomIndex(i + 1);
		[pwd[i], pwd[j]] = [pwd[j], pwd[i]];
	}

	return pwd.join('');
}

function parsePasswordHash(passwordHash) {
	if (!passwordHash) return null;

	let parts = String(passwordHash).split('$');
	if (parts.length != 4 || parts[0] != PASSWORD_HASH_PREFIX) return null;

	let iterations = Number(parts[1]);
	let salt = parts[2];
	let hash = parts[3];
	if (!Number.isInteger(iterations) || iterations < 10000) return null;
	if (!/^[0-9a-f]+$/i.test(salt) || !/^[0-9a-f]+$/i.test(hash)) return null;

	return {
		iterations,
		salt,
		hash
	};
}

function safeEqualHex(a, b) {
	a = String(a || '').toLowerCase();
	b = String(b || '').toLowerCase();
	if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
	if (a.length != b.length) return false;

	return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function hashPassword(password) {
	let salt = crypto.randomBytes(PASSWORD_SALT_LEN).toString('hex');
	let hash = crypto.pbkdf2Sync(String(password), Buffer.from(salt, 'hex'), PASSWORD_HASH_ITERATIONS, PASSWORD_HASH_KEY_LEN, 'sha256').toString('hex');
	return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

function isLegacyMd5PasswordHash(passwordHash) {
	return /^[0-9a-f]{32}$/i.test(String(passwordHash || ''));
}

function hashLegacyMd5Password(password) {
	return crypto.createHash('md5').update(String(password)).digest('hex');
}

function verifyPassword(password, passwordHash) {
	let parsedHash = parsePasswordHash(passwordHash);
	if (parsedHash) {
		let hash = crypto.pbkdf2Sync(String(password), Buffer.from(parsedHash.salt, 'hex'), parsedHash.iterations, PASSWORD_HASH_KEY_LEN, 'sha256').toString('hex');
		return safeEqualHex(hash, parsedHash.hash);
	}

	if (isLegacyMd5PasswordHash(passwordHash)) {
		return safeEqualHex(hashLegacyMd5Password(password), passwordHash);
	}

	return false;
}

function needsPasswordHashUpgrade(passwordHash) {
	return !parsePasswordHash(passwordHash);
}

function getPasswordStrengthError(password) {
	password = String(password || '');

	if (password.length < 12 || password.length > 30) return 'Password must be 12-30 characters.';

	let categoryCount = [
		/[a-z]/.test(password),
		/[A-Z]/.test(password),
		/\d/.test(password),
		/[^A-Za-z0-9]/.test(password)
	].filter(Boolean).length;
	if (categoryCount < 3) return 'Password must include at least 3 character classes.';

	let normalized = password.toLowerCase();
	if (normalized.includes('admin') || normalized.includes('password')) return 'Password cannot include common admin words.';
	if (/(.)\1{5,}/.test(password)) return 'Password cannot use long repeated characters.';

	return '';
}

function assertStrongPassword(password) {
	let err = getPasswordStrengthError(password);
	if (err) throw new Error(err);
}

// 根据数据库自定义表单提取导出表格标题
function getTitleByForm(arr) {
	let formTitle = [];
	for (let k in arr) {
		if (arr[k].type == 'image' || arr[k].type == 'content') continue;

		formTitle.push({
			column: arr[k].title,
			wch: 30
		});
	}
	return formTitle;
}


// 根据数据库自定义表单提取数据
function getValByForm(arr, mark, title) {
	for (let k in arr) {
		if (arr[k].type == 'image' || arr[k].type == 'content') continue;

		if (arr[k].mark == mark) return arr[k].val;
		if (arr[k].title == title) return arr[k].val;
	}

	return '';
}

// 数据库自定义表单forms值修正
function dbFormsFix(forms) {
	for (let k in forms) {
		if (forms[k].type == 'number' || forms[k].type == 'digit') {
			forms[k].val = Number(forms[k].val);
			if (isNaN(forms[k].val)) forms[k].val = null;
		}
	}
	return forms;
}

// 数据库自定义表单forms转为obj
function dbForms2Obj(forms, excludeContent = false) {
	forms = dbFormsFix(forms); //数据类型修正
	let obj = {};
	for (let k in forms) {
		if (excludeContent && forms[k].type == 'content') continue;
		obj[forms[k].mark] = forms[k].val;
	}
	return obj;
}

// 构造当前ID 
function makeID() {
	let id = timeUtil.time('YMDhms') + ''; //秒

	//毫秒3位
	let miss = timeUtil.time() % 1000 + '';
	if (miss.length == 0)
		miss = '000';
	else if (miss.length == 1)
		miss = '00' + miss;
	else if (miss.length == 2)
		miss = '0' + miss;

	return id + miss;
}

// 拆分一维数组为二维数组
function spArr(arr, size) {
	if (!arr || !Array.isArray(arr) || arr.length == 0) return arr;

	let newArray = [];
	let index = 0;
	while (index < arr.length) {
		newArray.push(arr.slice(index, index += size));
	}
	return newArray;
}

/**
 * 把字符串格式化为数组
 * @param {*} str 
 * @param {*} sp 
 */
function str2Arr(str, sp = ',') {
	if (str && Array.isArray(str)) return str;

	str = str.replace(/，/g, sp);
	let arr = str.split(sp);
	for (let i = 0; i < arr.length; i++) {
		arr[i] = arr[i].trim();

		if (isNumber(arr[i])) {
			arr[i] = Number(arr[i]);
		}

	}
	return arr;
}

/**
 *  校验只要是数字（包含正负整数，0以及正负浮点数）就返回true 
 * @param {*} val 
 * @returns bool
 */
function isNumber(val) {
	var reg = /^\d+(\.\d+)?$/;
	if (reg.test(val)) {
		return true;
	} else {
		return false;
	}
}

/**
 * 提取对象数组的某个属性数组,如[{'x':1},{'x':2}] 提取 x得到[1,2]
 * @param {*} arr 
 * @param {*} key 
 * @returns []
 */
function getArrByKey(arr, key) {
	if (!Array.isArray(arr)) return;
	return arr.map((item) => {
		return item[key]
	});
}

/**
 * 提取对象数组的多个属性数组, 
 * 如 [{'x':1,'y':11,'z':111},{'x':2,'y':22,'z':222}] 
 * 提取 ['x','y'] 得到[{'x':1,'y':11},{'x':2,'y':22}]
 * @param {*} arr 
 * @param {*} keys 
 * @returns []
 */
function getArrByKeyMulti(arr, keys = []) {
	if (!Array.isArray(arr)) return;
	if (!Array.isArray(keys)) return;

	let ret = [];
	for (let k in arr) {
		let node = {};
		for (let j in keys) {
			node[keys[j]] = arr[k][keys[j]];
		}
		ret.push(node);
	}

	return ret;
}

/**
 * 提取对象数组某个键值等于某值的对象数据
 * @param {*} arr 
 * @param {*} key  
 * @param {*} val 
 * @returns object {}
 */
function getDataByKey(arr, key, val) {
	if (!Array.isArray(arr)) return null;

	for (let k in arr) {
		if (arr[k][key] == val)
			return arr[k];
	}

	return null;
}

/**
 * 文本内容格式化处理
 * @param {*} content 
 * @param {*} len 截取长度 -1不截取
 */
function fmtText(content, len = -1) {
	if (!content) return content;
	let str = content.replace(/[\r\n]/g, ""); //去掉回车换行
	if (len > 0) {
		str = str.substr(0, len);
	}
	return str.trim();
}

// 下划线转换驼峰
function toHump(name) {
	name = name.replace(/\_(\w)/g, function (all, letter) {
		return letter.toUpperCase();
	});

	// 首字母大写 
	let firstChar = name.charAt(0).toUpperCase();
	return firstChar + name.slice(1);
}

// 驼峰转换下划线
function toLine(name) {
	name = name.replace(/([A-Z])/g, "_$1").toLowerCase();

	//如果首字符为下划线，干掉
	if (name.charAt(0) === '_')
		return name.slice(1);
	else
		return name;
}

// 金额格式化 dot为金额每隔三位用","或" "间隔
function fmtMoney(s, dot = ',', prefix = '¥') {
	if (s === '' || s === null || s === undefined) s = 0;

	s = parseFloat((s + "").replace(/[^\d\.-]/g, "")).toFixed(2) + "";
	var l = s.split(".")[0].split("").reverse(),
		r = s.split(".")[1];
	let t = "";
	for (let i = 0; i < l.length; i++) {
		t += l[i] + ((i + 1) % 3 == 0 && (i + 1) != l.length ? dot : "");
	}
	return prefix + t.split("").reverse().join("") + "." + r;
}
/**
 *简单数组转对象数组
 * @param {*} arr [1,2,3]
 * @param {*} key [x1,x2,x3]
 * @returns [{x1:1,x2:1,x3:1},{x1:2,x2:2,x3:2},{x1:3,x2:3,x3:3}]
 */
function arr2ObjectArr(arr, key1, key2, key3) {
	let ret = [];
	for (let k in arr) {
		let obj = {};
		if (key1) obj[key1] = arr[k];
		if (key2) obj[key2] = arr[k];
		if (key3) obj[key3] = arr[k];
		ret.push(obj);
	}
	return ret;
}

/**
 * property
 * @param {*} property 排序属性
 * @returns 排序好的数组 
 * 用法 arr.sort(compare('age'))
 */
function objArrSortAsc(property) {
	return function (a, b) {
		var value1 = a[property];
		var value2 = b[property];
		if (value1 < value2)
			return -1;
		else if (value1 > value2)
			return 1;
		else return 0;
	}
}

/**
 * property
 * @param {*} property 排序属性
 * @returns 排序好的数组 
 * 用法 arr.sort(compare('age'))
 */
function objArrSortDesc(property) {
	return function (a, b) {
		var value1 = a[property];
		var value2 = b[property];
		if (value1 < value2)
			return 1;
		else if (value1 > value2)
			return -1;
		else return 0;
	}
}

/**
 * 数组有则减少，无则增加
 * @param {*} arr 
 * @param {*} data 
 * @param {*} sort 排序方式 asc/desc
 */
function arrAddDel(arr, data, sort = 'asc') {
	if (!arr) return arr;
	if (!Array.isArray(arr)) return arr;

	let idx = arr.indexOf(data);
	if (idx > -1)
		arr.splice(idx, 1);
	else
		arr.push(data)

	if (sort == 'asc')
		return arr.sort();
	else
		return arr.reverse();
}

function objArrMerge(arr1, arr2) {
	for (let k in arr1) { }
}


//数据深度拷贝
function deepClone(data) {
	if (data === null || typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' || typeof data === 'undefined') {
		return data;
	}

	return JSON.parse(JSON.stringify(data));
}

function padLeft(str, len, charStr) {
	if (!str)
		str = '';
	else
		str = str + '';
	return new Array(len - str.length + 1).join(charStr || '') + str;
}

function padRight(str, len, charStr) {
	if (!str)
		str = '';
	else
		str = str + '';
	return str + new Array(len - str.length + 1).join(charStr || '');
}


// 选项表单处理
function getSelectOptions(str) {
	if (!str)
		return [];
	else if (str.includes('=')) {
		let arr = str.split(',');
		for (let k in arr) {
			let node = arr[k].split('=');
			arr[k] = {};
			arr[k].label = node[1];
			arr[k].val = node[0];
		}
		return arr;
	} else {
		return str.split(',');
	}
}

// 数组元素交换位置 index1和index2分别是两个数组的索引值
function arraySwap(arr, index1, index2) {
	arr[index1] = arr.splice(index2, 1, arr[index1])[0];
	return arr;
}

// 数组置顶
function arrayTop(arr, idx) {
	let node = arr.splice(idx, 1)[0];
	arr.unshift(node);
	return arr;
}

// 数组置底
function arrayBottom(arr, idx) {
	let node = arr.splice(idx, 1)[0];
	arr.push(node);
	return arr;
}

/**
 * 把某个值/对象按key插到某个对象数组
 * @param {*} arr  目标数组
 * @param {*} key  键
 * @param {*} val  判断值
 * @param {*} obj  插入对象{}
 */
function insertObjArrByKey(arr, key, val, obj) {
	if (!arr) return arr;

	for (let k in arr) {
		if (arr[k][key] == val) {
			// 发现存在
			arr[k].list.push(obj);
			return arr;
		}
	}

	// 不存在
	let newObj = {
		[key]: val,
		list: [obj]
	}
	arr.push(newObj);
	return arr;
}

/**
 * 从对象数组中， 根据某个键值 获取满足的对象
 * @param {*} arr 
 * @param {*} key 
 * @param {*} val 
 */
function getValFromArr(arr, key = 'val', val = '') {
	if (!Array.isArray(arr)) return null;
	for (let k in arr) {
		if (arr[k][key] == val)
			return arr[k];
	}

	return null;
}

// 把字符串按关键字转为数组
function splitTextByKey(txt, key) {
	if (txt === null || txt === undefined) return [];
	if (key === null || key === undefined || key.trim() == '') return [String(txt)];

	key = String(key).trim();
	txt = String(txt);
	let arr = txt.split(key);
	let ret = [];
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] !== '') ret.push(arr[i]);
		if (i != (arr.length - 1)) ret.push(key);
	}
	return ret;
}

module.exports = {
	arrayTop,
	arraySwap,
	arrayBottom,

	getTitleByForm,
	getValByForm,
	dbForms2Obj,
	dbFormsFix,

	getValFromArr,
	getArrByKey,
	getArrByKeyMulti, //提取对象数组的多个属性数组
	spArr, //拆分一维数组为二维
	getDataByKey,
	str2Arr,
	arr2ObjectArr,
	insertObjArrByKey,
	arrAddDel,
	objArrSortAsc,
	objArrSortDesc,
	splitTextByKey,

	arrAddDel,
	isNumber,

	padLeft,
	padRight,

	makeID,

	genRandomString, // 随机字符串
	genRandomIntString,
	genRandomAlpha,
	genRandomNum, // 随机数字 
	genStrongPassword,
	hashPassword,
	verifyPassword,
	needsPasswordHashUpgrade,
	getPasswordStrengthError,
	assertStrongPassword,
	fmtText, // 文本内容格式化处理
	fmtMoney, //金额格式化

	toHump,
	toLine,

	getSelectOptions, //选项表单处理

	deepClone

}
