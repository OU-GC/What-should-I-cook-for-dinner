const fs = require('fs');
const code = fs.readFileSync('static/app.js', 'utf8');

const cookingMatch = code.match(/const COOKING_SKILLS = (\[[\s\S]*?\n    \]);/);
const storageMatch = code.match(/const STORAGE_DATA = (\[[\s\S]*?\n    \]);/);

const COOKING_SKILLS = eval('(' + cookingMatch[1] + ')');
const STORAGE_DATA = eval('(' + storageMatch[1] + ')');

console.log('COOKING_SKILLS:', COOKING_SKILLS.length, 'categories,', COOKING_SKILLS.reduce((a,c)=>a+c.items.length,0), 'items');
console.log('STORAGE_DATA:', STORAGE_DATA.length, 'categories,', STORAGE_DATA.reduce((a,c)=>a+c.items.length,0), 'items');

const html = COOKING_SKILLS.map((cat, idx) => `<section class="glass-panel"><h2><span class="step-badge">${String(idx+1).padStart(2,'0')}</span>${cat.category}</h2><div class="tutorial-grid">${cat.items.map(s=>`<div class="tutorial-card"><div class="tutorial-card-header"><div class="tutorial-icon">${s.icon}</div><div class="tutorial-name">${s.name}</div></div><p class="tutorial-desc">${s.desc}</p><div class="tutorial-tip">${s.tip}</div></div>`).join('')}</div></section>`).join('');
console.log('cooking HTML length:', html.length);
console.log('first 500 chars:', html.substring(0, 500));
