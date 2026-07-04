import { API_BASE } from '../api/client';

let skillsCache = null;
let freeSkillsCache = null;

export async function getAllSkills() {
  if (skillsCache) return skillsCache;
  try {
    // FIX: Use skills-lite.json (4.5MB) instead of skills_index.json (20MB)
    // skills-lite has the free flag and price=0 for free skills
    const res = await fetch(`${API_BASE}/api/skills-lite.json`);
    if (res.ok) { skillsCache = await res.json(); return skillsCache; }
  } catch {}
  // Fallback to skills_index.json if skills-lite fails
  try {
    const res = await fetch(`${API_BASE}/api/skills_index.json`);
    if (res.ok) { skillsCache = await res.json(); return skillsCache; }
  } catch {}
  return [];
}

export async function getFreeSkills() {
  if (freeSkillsCache) return freeSkillsCache;
  try {
    const res = await fetch(`${API_BASE}/api/free-skills.json`);
    if (res.ok) {
      const data = await res.json();
      freeSkillsCache = data.skills || data;
      return freeSkillsCache;
    }
  } catch {}
  return [];
}

export async function getSkill(id) {
  const skills = await getAllSkills();
  let skill = skills.find(s => s.id === id) || null;

  // FIX: Check if this skill is in the free list
  // skills_index.json doesn't have the free flag, so we need to cross-reference
  if (skill) {
    const freeSkills = await getFreeSkills();
    const freeSkill = freeSkills.find(s => s.id === id);
    if (freeSkill) {
      // Override price and free flag
      skill = { ...skill, ...freeSkill, price: 0, free: true };
    }
  }

  return skill;
}

export async function getSkillsByCategory(category) {
  const skills = await getAllSkills();
  if (!category || category === 'All') return skills;
  return skills.filter(s => s.category === category);
}

export async function searchSkills(query, cat = '', lang = '', limit = 20, offset = 0) {
  const params = new URLSearchParams();
  if (query)  params.set('q', query);
  if (cat)    params.set('cat', cat);
  if (lang)   params.set('lang', lang);
  params.set('limit', '' + limit);
  params.set('offset', '' + offset);
  try {
    const res = await fetch(`${API_BASE}/api/search?` + params.toString());
    if (res.ok) return await res.json();
  } catch {}
  return { total: 0, results: [] };
}

export async function getCategories() {
  try {
    const res = await fetch(`${API_BASE}/api/categories.json`);
    if (res.ok) return await res.json();
  } catch {}
  return [];
}

export default skillsCache;
