// Apply same pricing logic to src/data/all_skills.json
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'src', 'data', 'all_skills.json'),
];

function timeSavedToMinPerDay(ts) {
  const map = {
    '5–15 min per task': 10, '10–30 min/task': 20, '1–2 hrs/week': 13,
    '20–45 min/day': 32, '2–5 hrs/week': 30, '30–90 min/day': 60,
    '1 hr/day': 60, '3–8 hrs/week': 47, '4–10 hrs/week': 60,
    '6–12 hrs/week': 77, '1–3 hrs/day': 120, '2–4 hrs/day': 180,
  };
  return map[ts] || 30;
}

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) { console.log(`SKIP: ${filePath}`); return; }
  
  let skills = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`${path.basename(filePath)}: ${skills.length} skills`);
  
  skills.forEach((skill, idx) => {
    const minPerDay = timeSavedToMinPerDay(skill.timeSaved);
    const seed = idx * 7 + (skill.id.charCodeAt(4) || 0) * 31;
    const rng = ((seed * 9301 + 49297) % 233280) / 233280;
    const variation = 0.90 + rng * 0.20;
    
    let price;
    if (minPerDay <= 15) price = (0.99 + (minPerDay / 15) * 1.00) * variation;
    else if (minPerDay <= 35) price = (1.99 + ((minPerDay - 15) / 20) * 2.00) * variation;
    else if (minPerDay <= 65) price = (3.99 + ((minPerDay - 35) / 30) * 3.00) * variation;
    else if (minPerDay <= 130) price = (6.99 + ((minPerDay - 65) / 65) * 6.00) * variation;
    else price = (12.99 + ((minPerDay - 130) / 50) * 7.00) * variation;
    
    price = Math.round(price * 100) / 100;
    if (price < 0.99) price = 0.99;
    skill.price = price;
    
    if (minPerDay <= 15) skill.tier = 'MICRO';
    else if (minPerDay <= 35) skill.tier = 'STARTER';
    else if (minPerDay <= 65) skill.tier = 'STANDARD';
    else if (minPerDay <= 130) skill.tier = 'PRO';
    else skill.tier = 'ELITE';
    
    const monthlyValue = minPerDay * 22 * 0.50;
    skill.roi = `${Math.min(parseFloat((monthlyValue / price).toFixed(1)), 99)}x`;
  });
  
  const freeCount = skills.filter(s => s.price === 0).length;
  console.log(`  $0 count: ${freeCount}`);
  
  fs.writeFileSync(filePath, JSON.stringify(skills, null, 2));
  console.log(`  ✅ Updated`);
});
