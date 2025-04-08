// 导入polyfills
require('./polyfills.umd.js');

// 导入jsPDF核心库
const jspdf_full = require('my_jspdf.umd.full');
const jsPDF = jspdf_full.default;

module.exports = jsPDF; 