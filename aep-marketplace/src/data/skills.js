import { API_BASE } from '../api/client';

let skillsCache = null;

export async function getAllSkills() {
  if (skillsCache) return skillsCache;
  try {
    const res = await fetch(`${API_BASE}/api/skills_index.json`);
    if (res.ok) { skillsCache = await res.json(); return skillsCache; }
  } catch {}
  return [];
}

export async function getSkill(id) {
  const skills = await getAllSkills();
  return skills.find(s => s.id === id) || null;
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
