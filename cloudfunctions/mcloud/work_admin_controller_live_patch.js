const Module = require('module');
const path = require('path');
const zlib = require('zlib');

function inflate(payload) {
	return zlib.gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
}

function compilePatchedModule(target, source) {
	const patchedModule = new Module(target, module.parent);
	patchedModule.filename = target;
	patchedModule.paths = Module._nodeModulePaths(path.dirname(target));
	patchedModule._compile(source, target);
	require.cache[target] = patchedModule;
	return patchedModule;
}

const auditModelPayload = [
	'H4sIAAAAAAACCo2Tv07DMBDGZ/wUtwUq1Iq1VYbQOMgipFHq8meyQmNQII2L7YhKwMAMEuIRmEFVkWBh4WUo5TFQCggoITB/v/vu',
	'zve5VqkgqIAnNFd1eHq4HN8+jkcXk/NrsHZ5qmFydjO5PhsPr16GV8/3p8+jOwSVGkJdkSoNy6HivhR7vKvXRMQTMEHygyyWfN6o',
	'1rZDxVn/TWa9XK/uKWOhgVA3CZWCDSH3p12sLIrfDfhA8zRSP52PThAqKKg2XTDB2B6wQyH3WZirLMxlo1FcYC+zNg06TdoJMJhw',
	'hOZYP47qYCgt43T3WMuMG4tozlrBHrU6NqGM2KWy1aSk5ZUilFAXlxLNlkexRz+ZnTBRs1DLx97XYYqYNrUch/2P8qw1XM4F2GF0',
	'y/8H9VfHgLRXmYvXsfv9HY4jvhNmiTZTIXth8nNO2mnXwYhT/R1fmr2CbTNKpvt8sDMEfrtEGZKbEL98kalNEXTyS+Icgl2b+QF2',
	'yGYe1i9eeUh7IsoSXuWDvpBagVn0LxroFdnz3Z2qAwAA'
].join('');

const auditServicePayload = [
	'H4sIAAAAAAACCpVVzW7bRhA+k08xuZiiSlBy2wCBWKZgYykQKitGRDdtbYHYkCt5I/4ouyv/RNILBC2K3nvxuUDQXnvpy9RtH6PY',
	'5ZL6IR24N3L2+2Z2Zr6ZbTWbOjRhmHHMOvDXHz/f/f7n3W8//fPDr+BNccrh7sPtvx9u//7lx7v3tzo0W7oeZinj8BVi+IRmb3DI',
	'R5hekhCDCxS/XRCKG4bdeo0YDuY5IGA5wn7DDNNRDl5ldCZDeIuI8OMswvGOB7uVCFvrKqOzAAlggAQykGblSvk66va804EfnHjP',
	'u8Go/30XXPi0XUQ69r7dOXncdnR9skhDTrIUEPPxNW9cotiCBF2DC5+12yYsdY1MQJjBdV1YpBGekBRHsFpBYUwXcWwCxXxBUzAM',
	'R9dizIFxCi6MOCXpVPBNm+J5jELcaJ2d0/P0nI8/aU0tMMAwbU5J0jCdPBjj1I5xOuUX8FTcxVS+hJ3FJMSNtryjwKuojFNHX++k',
	'c4KmWMYVOcirwnCRvMZUJrNawWER71FutwnrkZRwxVIJfgGHZW6Hm4DHiF/YkzjLpDtzP/iIvPt48Eqr/vdlKh6cIlLlbjuXTkia',
	'd3lHD3kGYYwY25NkIWt8zXEasTrFL3VdQ+wmDSEmLGexxhxRlDBwYbmWVZCimKOpGBDVnRxiC6O4ZS4b8i5HyBIqhDCWiKsLTAVE',
	'+NS8592h750e9f1g5Hv+6agDh5auaWtHV3CU98QtFK5c5mYLPm+XjilhswG+lAO4Cy5PdvCMo8mkH1XQym7Bkz3sECW4Hi1OdvAz',
	'fHOV0apvZVdYXZOaUSkeHBTJPnLBQHFsmHmx7K0qec/8/ouh8CuhjnKxyf3gYKsQH3H0sj/6Ohh0v+kOxL4qGIU/VYMa3sj3er2g',
	'fyQHWoJ2OKIS97KG3rHYXGdGTGbYsDZVHZftzugrpQ+xlgrXqmy5ELUN5kz8akvYiuT3/UG3s4mhqGNYW1XwsxdDvzv0HwrfZPFQ',
	'Rt6uh6JfdkVl70ePRT3WRaneLjC9KSpR1ORLWAJKo07eAgsy2inP1qDM5cRgLpR0hUjtQ2ZPMR8QxhubSBYYTcOqzK53dBT4fVEW',
	'I8IsNOQIW3JdWHIliG85AIT5GUdCmS5MUMywVWxWBcjiKEesVtA28yGhmNtiNYELjfJ7tYKzsWknaN4gHCfgPgV+QZgdhDFGqcxC',
	'HphyKNUKpZg7uizhPmxr0ymsTDIgUQfEuR0Q+WoaMjmtpscSVR3VWo5S6T5FmusZpVTVQtmnqnMLHrfbplXdrb1cWvu0cpxrg24L',
	'vp4pR7qWK8Tsf3dSwyxO7ufV3TS338Mpl1kNb7PoBDfNaILiahNLBVfaqE6kINXbpK3Fc5tk0SLGNr6eZ5SLp7L25XX0/wAwCGN0',
	'ngoAAA=='
].join('');

const controllerPayload = [
	'H4sIAAAAAAACCuVa608bxxb/jP+KzZfajixDq+rqyhFXcgJRfRsgKuRWVVVZi3eAKfauuzsmpYBE7gVCwsOQ0EAS8oCGQtpbh7YJ',
	'SaAkf0yZXftT/4Wreex7bdYJbaVbqUrNzG/OnHNmzmPO2dbTpyPCaaFbQUBLCUf7y/jH1/ryFD78Ee+WjZ05vF/GM9NGZcNYmjl6',
	'8QN+/R99cRvP7uHbOxHhdGskklNkDQlnRQ1cVJXPQQ6dU2SkKvk8UIV2QQVflKAKYtFka7+ogWyRYbI5C5T8XIvGz3AyJQTzrlXJ',
	'VvbfgCoWwGVFHW4lEI3+61opiUi8FHY1AWd9JD5W1OG0VIByuoSGeoE6AnPAQ05jo62EVlYk2KxYQkNZPu4jdxGoA4paEOUcCEGw',
	'aKPrUxRHC0BGYagxZF1K55RCAWoaVOQQxHIWuBFn5ETDcUaQdSnRQ+hF4sBA6FPQCDqQICVGqDamRcmwf7OUbj3mQrBUVy4YRh5Y',
	'f/0gkFG6JMEwxy8ScFYk6PqyEK11KRLwmk2BjHFhqGbpAF8fyeVFTbNPymHw4EsEZEmr4w7GIpEWURuVc0JW1DSgoi4oQ0oiFhfG',
	'Ii0teYAEzRJNBpcDbTIWPxNpaVEBKqmyIF4WobUo6SWLhqCWzJY0oGYksmoiEmnJ9pdgXqLzF+AwiFEB2f70p9AusP+PjwtjE46t',
	'CKIlC6UUm09moUQw0WiCTKQ7ujLd2UyHOdvblz5/PpvpIJD6+O50V6d7BRlxwOzBhjBGraOz91xKiFqem7ltvLzmBF38oKfbQ6yr',
	'52zmgp9c3ycXO1PCu46R3r5036VePjZhKjSXByKz154igorsVGl93TnEC9Zacxpgg32d6S4fOT4YDPYTtoZ9CzK9WaqHlNBdKvQD',
	'NeZimk+SVW1xxypTaQFr2JS9wlQps5JBgD5QCsBhHFAulpDQLtB7PSLmoSQi0CEiMUYVXFBkNJQSohpSoTw4LosF0K6vzx4dHFIp',
	'JqjhUCPjF51ZD7MSn0meqWuR/rBmo/sVUZUs0qZhDgJEqZ4lsy6zTDChkpR3pvG41+gouynOZ53bluBAlGIsJMlvOqiK8vAFqFkT',
	'5t90EgGx8JEH4ByjoAKQS1pK+JT8bhkTEER5kBKiRy/uGAePjfU5/d7raEKQgJYj1je9g/dX2dyvk1f0xRvVjXnyY2VP/+8r/dt/',
	'V7dnowmhpOZTQrSVJ0Ra69m2ttaiOAg06nZ5JHJkBM5o5xiOChMJD1t4eQ0/32K2b7Ol39rFm/fZ3K+TV4yDp/r1R/in1aPDhaMX',
	'i3p5SZ9dqm5P4dnbYZmjevcF4QCGuORri8aBjyE29+vkldrkJPtxdLiO9x/o69/VVq7gyh0GCK0wlvS4lMWG6iqKie7g68GWsT6H',
	'p2dxebkVzxwYBzdba1ev6yuvWvVr3+C798PyYudMTnbs0SCOXk2zreowRbk5Orxd27z32y/zRy8W9Gtz+PoOWxOWrwFV+Qq4eGIj',
	'Qfw836o+mzIObhqVVZuZ2uZUdXsWv9wzNirVyiNcXtZXXjFoE+dEkgLPOZGhAC6qlU288DWubOgPXzjsjP6NK/Pk4jLEy73q9re4',
	'vNycPmiO5E7pJRh0X2qrldrmGi4v1L6d9R2NeZeO9h8Zd6Y49MY8PtivViqhjwYAqV/MDbsOh48FMJTOCHi3jK8/1q/NOY5nesE4',
	'rBjz3+Mb3+EnL6tP7hl3pvTFLVz+hrihnQ18fw7fmNfLS8aj/eqThdB6gi4lwToMVTaqlQ392RV996lPSbtlY/57/dp2dWO++vqq',
	'cWcKz9zG01v4+s7R4TpxAt8s1m4/Nn64ZuxvE+VVNvQHW9XKLj78OjSXdt7rYtceNvn+LDDipuE5RR6AgzzqvmGEtFL9BsmqGRPN',
	'/VycaOII8LASIgHIUXxKiBZKGhpX+omeWBqQzrBrwdIZEkPVD8FoSoj2K0qeZwovpo3H+x+CUQfmX5B4qmBkdXumun3NxLPk4ndU',
	'F9WIQ18sbWASJ1ieYIt16hSf5iOBErlA1rgljOda0HeSFv4skKgOAmRnYwXxy9R7bVyB1AiNlZ3a5ArTtliEl+j1dqDfbzPh1Hjx',
	'+i6+N2nB2aEEwdMXM8Ifdix5qCGuGqoQn+YcySLL/k42nT3hFLahpYbOXt0KYAkIySZPTHaWEmckD4JFoaiV2foBdzdraw84YLQI',
	'vDvQZMv48QDfn2MgCaogR9JsL/LWS7y0zDCKKhFdeBAsJlvcIpJBR6HM/ZFxfU+fvMJmh8HoZUWV3Lf5b+9zjqd/rq1UaJgiWOLv',
	'nXRqG8+Mh5yOBr9yzeHZmdrGM/xoG++WOad5qU9BYt6J0le39ckD/evdE34juQp1xxgQB3MTSrC9PQEBiGpuqIeoOvwtsjVLA4Kp',
	'Xiin3v1rKdmhvYZKFkcApxleyY2uf6bD1CglGhSZzQfOm+uFExfahR5Kl5TB4KAcG5sw3ZOJoCUtax1nXGjnKPPv8XGTZNBQz0cd',
	'nR/xcoo5djH9SVdnd1/2+LnuHuYlCQ9wQIid4jvEmZDpYrFTVRU1FjV+2ce7y5YWG1yCJlIHegHMA+Y7J0xOA2/EiAKlpm8EJ5ix',
	'DA9KzrM2L4UKRI061mDjfM+M5+xFjBcf4LsPT9Z+jlcdkd+vOtetsqMgEyhQj4MA2Q2HPzoUDkPZO80e2M5I1zhGHR/jnIfuj6n/',
	'x5HO10g6JtjZ+EaueBCg87Qs8faXhZVN9Htb+v6Svj4b9tYcf+R/+eN0H1LDw6QVW8dZvumTxNsbbMydY1dfoKdz4W8WL0L7A7jj',
	'zrzda6sJ0Wz+medtoHNWJdeaErS+I2xCwstDQCXyjQnZIun80IY7eQ+x+k2GvAQnzDzAEgOVNOFUe7tQkiUwAGUgCe+8I/hm5VI+',
	'TyZ6qd25VseTSIWFWJziotE448PdcGk3mzGuhSbjxElZ9uPuk9KnYD4fozQTQpT0scyeVcLuSyVcjaeEp6+UcDeMEk7WoryU4W4d',
	'RUkZzd8Oi4p8dCIhvNvW1ua8LzEqxfi48Oln8WRBLMYgAgWh/R/1uihkOu6+QUUVjEBwmTf2m7QUf/LD7MRMfkxHTSGjQFTpwAk/',
	'8l2fJDQwJy4pP2cZDTnNyvPK9+hIHP1T9dMiKwh4i0w8b8SPruo/7zAY+LIIcghItnfPSMTGRVUVR3lEomV9lhiZXJjLaPA5x14w',
	'dgijC2pXl2ub93iQY3r8QNSGPGmtc4eHG7Xv5k/8Ieg7afo0Ygz5+pHNHjglZiojI2lCu+myAhUbZHemq6J2ltQUFdlsijlUEvOc',
	'LuctmXtTisSf/rO3pzvJdA8HRmMO1oljFDzT1v5x3zuM9XVY8w4//wmX1/D8rd9+ma8+eY5nn5Mm3tIinllgTaBo3O3PfdennmsP',
	'Bppe3uWsfVAqEIeYukMWHdpbryMVu7ohpQp2HOJoqDtkPcRtA+FfF7zRpxFByGO/kNCUkpojvqIAZcjaImbwGBOYG2FMkt9snRBQ',
	'CCctlLfL47yfZB1TebU39D0QeGvs7dPK8DVg155B3xfZmrI+12ruCSN66q2stm+2cVivjBcQoDZ8AYyAfDDY2U2r8+gh8L+3BcUf',
	'Cu0WC6ARGG/fxEsLDR5DFvzPeAy9aR7u/czumPcshQZ2P2i7scmSLfTlBd5KoqaZCLsjx5rh5JV7f91TXArMDCi8+uSpvrZoklUR',
	'zMGiKCNPWsASAvPrDeth3ClB1AcLrqNinOp3n+q3dvXVvdrq05OL8k04DYfa2RaBX/yZLhlKdpVU09ylLNNHm/O2jsgMCU8JZ+3U',
	'1AkLOq6rkCOdpvwJ34WwBURcvqXvzf4eBcTQBXiH/B9DNHQeymTg3BDIDce85xBQRpyIRAqKVMoDEv4VFZFEKeAD1DOR/wG6BEKA',
	'0C4AAA=='
].join('');

const auditModelTarget = path.join(__dirname, 'project', 'B00', 'model', 'work_agent_audit_model.js');
const auditServiceTarget = path.join(__dirname, 'project', 'B00', 'service', 'work_agent_audit_service.js');
const controllerTarget = path.join(__dirname, 'project', 'B00', 'controller', 'work_admin_controller.js');

compilePatchedModule(auditModelTarget, inflate(auditModelPayload));
compilePatchedModule(auditServiceTarget, inflate(auditServicePayload));
const patchedControllerModule = compilePatchedModule(controllerTarget, inflate(controllerPayload));

module.exports = patchedControllerModule.exports;
