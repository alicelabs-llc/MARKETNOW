const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'api', 'skills.json');
let skills = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

console.log(`Total skills: ${skills.length}`);

// ============================================================
// Convertir timeSaved a minutos/día para calcular precio
// ============================================================
function timeSavedToMinPerDay(ts) {
  const map = {
    '5–15 min per task':   10,
    '10–30 min/task':      20,
    '1–2 hrs/week':        13,
    '20–45 min/day':       32,
    '2–5 hrs/week':        30,
    '30–90 min/day':       60,
    '1 hr/day':            60,
    '3–8 hrs/week':        47,
    '4–10 hrs/week':       60,
    '6–12 hrs/week':       77,
    '1–3 hrs/day':        120,
    '2–4 hrs/day':        180,
  };
  return map[ts] || 30;
}

// ============================================================
// Precio por skill basado en cuánto tiempo ahorra
// NADA es gratis. Cada skill tiene un precio justo.
// ============================================================
skills.forEach((skill, idx) => {
  const minPerDay = timeSavedToMinPerDay(skill.timeSaved);
  
  // Variación por skill para que no sean todos iguales
  const seed = idx * 7 + (skill.id.charCodeAt(4) || 0) * 31;
  const rng = ((seed * 9301 + 49297) % 233280) / 233280;
  const variation = 0.90 + rng * 0.20; // ±10%

  // Precio escalonado por beneficio real
  let price;
  if (minPerDay <= 15) {
    // Poco ahorro (5-15 min/task, 1-2 hrs/week): $0.99 – $1.99
    price = (0.99 + (minPerDay / 15) * 1.00) * variation;
  } else if (minPerDay <= 35) {
    // Ahorro moderado (20-45 min/day, 10-30 min/task, 2-5 hrs/week): $1.99 – $3.99
    price = (1.99 + ((minPerDay - 15) / 20) * 2.00) * variation;
  } else if (minPerDay <= 65) {
    // Buen ahorro (30-90 min/day, 1hr/day, 3-8 hrs/week): $3.99 – $6.99
    price = (3.99 + ((minPerDay - 35) / 30) * 3.00) * variation;
  } else if (minPerDay <= 130) {
    // Gran ahorro (6-12 hrs/week, 1-3 hrs/day): $6.99 – $12.99
    price = (6.99 + ((minPerDay - 65) / 65) * 6.00) * variation;
  } else {
    // Máximo ahorro (2-4 hrs/day): $12.99 – $19.99
    price = (12.99 + ((minPerDay - 130) / 50) * 7.00) * variation;
  }

  // Redondear a centavos limpios
  price = Math.round(price * 100) / 100;
  if (price < 0.99) price = 0.99;

  skill.price = price;

  // Tier como indicador de nivel, NO como plan — todos pagan
  if (minPerDay <= 15) skill.tier = 'MICRO';
  else if (minPerDay <= 35) skill.tier = 'STARTER';
  else if (minPerDay <= 65) skill.tier = 'STANDARD';
  else if (minPerDay <= 130) skill.tier = 'PRO';
  else skill.tier = 'ELITE';

  // ROI realista
  const monthlyValue = minPerDay * 22 * 0.50;
  skill.roi = `${Math.min(parseFloat((monthlyValue / price).toFixed(1)), 99)}x`;
});

// ============================================================
// Verificar: CERO skills gratis
// ============================================================
const freeCount = skills.filter(s => s.price === 0).length;
console.log(`\nSkills con precio $0: ${freeCount} (debe ser 0)`);

const tierStats = {};
skills.forEach(s => {
  if (!tierStats[s.tier]) tierStats[s.tier] = { count: 0, prices: [], ts: new Set() };
  tierStats[s.tier].count++;
  tierStats[s.tier].prices.push(s.price);
  tierStats[s.tier].ts.add(s.timeSaved);
});

console.log('\n--- PRECIOS POR NIVEL DE AHORRO ---');
for (const [tier, data] of Object.entries(tierStats).sort((a,b) => Math.min(...a[1].prices) - Math.min(...b[1].prices))) {
  const min = Math.min(...data.prices).toFixed(2);
  const max = Math.max(...data.prices).toFixed(2);
  const avg = (data.prices.reduce((a, b) => a + b, 0) / data.prices.length).toFixed(2);
  console.log(`${tier} (${data.count} skills): $${min} – $${max} | Avg: $${avg}`);
  console.log(`  TimeSaved: ${[...data.ts].join(', ')}`);
}

fs.writeFileSync(filePath, JSON.stringify(skills, null, 2));
const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
console.log(`\n✅ ${skills.length} skills — todas con precio > $0 | ${sizeMB} MB`);
