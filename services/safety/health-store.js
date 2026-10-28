const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {validatePlan} = require('./public/plan-engine');
const {validateChallenges,emptyChallenges} = require('./public/challenge-core');

function validateData(input) {
  const fail = () => { throw new Error('记录格式无效，请检查内容和数值范围'); };
  if (!input || !['exercise', 'diet', 'sleep'].every(k => Array.isArray(input[k]) && input[k].length <= 1000)) fail();
  if (input.vision !== undefined && (!Array.isArray(input.vision) || input.vision.length > 1000)) fail();
  const number = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const string = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  const date = x => x.date === undefined || (typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && !Number.isNaN(Date.parse(x.date)));
  const optionalText = (value, max) => value === undefined || (typeof value === 'string' && value.length <= max);
  const cleanText = value => typeof value === 'string' ? value.trim() : '';
  const validateProfile = value => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'object' || Array.isArray(value)) fail();
    const allowed = ['displayName','gender','birthDate','bloodType','heightCm','weightKg','activityLevel','healthGoal','allergies','medicalNotes','emergencyContact','emergencyPhone'];
    if (Object.keys(value).some(key => !allowed.includes(key))) fail();
    if (!optionalText(value.displayName, 50) || !optionalText(value.birthDate, 10) ||
        !optionalText(value.allergies, 500) || !optionalText(value.medicalNotes, 800) ||
        !optionalText(value.emergencyContact, 60) || !optionalText(value.emergencyPhone, 30)) fail();
    if (value.gender !== undefined && !['男','女','其他','不愿透露'].includes(value.gender)) fail();
    if (value.bloodType !== undefined && !['A型','B型','AB型','O型','不清楚'].includes(value.bloodType)) fail();
    if (value.activityLevel !== undefined && !['久坐为主','轻度活动','中等活动','高强度活动'].includes(value.activityLevel)) fail();
    if (value.healthGoal !== undefined && !['改善体能','控制体重','规律作息','均衡饮食','保持状态'].includes(value.healthGoal)) fail();
    if (value.heightCm !== undefined && !number(value.heightCm, 50, 250)) fail();
    if (value.weightKg !== undefined && !number(value.weightKg, 20, 500)) fail();
    const birthDate = cleanText(value.birthDate);
    if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate)) || birthDate < '1900-01-01' || birthDate > new Date().toISOString().slice(0,10))) fail();
    const emergencyPhone = cleanText(value.emergencyPhone);
    if (emergencyPhone && !/^[0-9+()\-\s]{5,30}$/.test(emergencyPhone)) fail();
    const result = {};
    for (const key of ['displayName','birthDate','allergies','medicalNotes','emergencyContact','emergencyPhone']) {
      const cleaned = cleanText(value[key]);
      if (cleaned) result[key] = cleaned;
    }
    for (const key of ['gender','bloodType','activityLevel','healthGoal']) if (value[key] !== undefined) result[key] = value[key];
    for (const key of ['heightCm','weightKg']) if (value[key] !== undefined) result[key] = value[key];
    return Object.keys(result).length ? result : null;
  };
  return {
    exercise: input.exercise.map(x => {
      if (!x || !string(x.name, 80) || !number(x.minutes, 1, 1440) || !number(x.calories, 0, 20000) || !date(x)) fail();
      return {name:x.name.trim(), minutes:x.minutes, calories:x.calories, ...(x.date ? {date:x.date} : {})};
    }),
    diet: input.diet.map(x => {
      if (!x || !['早餐','午餐','晚餐','加餐'].includes(x.meal) || !string(x.food, 200) || !number(x.calories, 0, 20000) || !number(x.protein, 0, 2000) || !date(x)) fail();
      return {meal:x.meal, food:x.food.trim(), calories:x.calories, protein:x.protein, ...(x.date ? {date:x.date} : {})};
    }),
    sleep: input.sleep.map(x => {
      if (typeof x === 'number') { if (!number(x, 0, 24)) fail(); return x; }
      if (!x || !number(x.hours, 0, 24) || !string(x.date, 10) || !date(x) ||
          (x.quality !== undefined && (!Number.isInteger(x.quality) || !number(x.quality, 1, 5)))) fail();
      return {hours:x.hours, date:x.date, ...(x.quality !== undefined ? {quality:x.quality} : {})};
    }),
    vision: (input.vision || []).map(x => {
      if (!x || !string(x.date, 10) || !date(x)) fail();
      if (x.kind === 'acuity') {
        const values = [0,0.1,0.2,0.3,0.4,0.5,0.6,0.8,1,1.2];
        if (!values.includes(x.left) || !values.includes(x.right) || !['裸眼','佩戴眼镜'].includes(x.correction) ||
            !number(x.distanceCm,100,300) || !number(x.calibrationPx,120,300)) fail();
        return {kind:x.kind, left:x.left, right:x.right, correction:x.correction, distanceCm:x.distanceCm, calibrationPx:x.calibrationPx, date:x.date};
      }
      if (x.kind === 'astigmatism') {
        if (![x.left,x.right].every(value => ['均匀','不均匀','不确定'].includes(value))) fail();
        return {kind:x.kind, left:x.left, right:x.right, date:x.date};
      }
      if (x.kind === 'color') {
        if (!Number.isInteger(x.correct) || !number(x.correct,0,6) || x.total !== 6) fail();
        return {kind:x.kind, correct:x.correct, total:6, date:x.date};
      }
      fail();
    }),
    profile: validateProfile(input.profile),
    exercisePlan: validatePlan(input.exercisePlan, 'exercise'),
    dietPlan: validatePlan(input.dietPlan, 'diet'),
    challenges: validateChallenges(input.challenges)
  };
}
function createStore(directory) {
  const fileFor = id => path.join(directory, crypto.createHash('sha256').update(String(id)).digest('hex') + '.json');
  function read(id) {
    try { const record=JSON.parse(fs.readFileSync(fileFor(id), 'utf8')); return {...record,data:validateData(record.data)}; }
    catch (e) { if (e.code === 'ENOENT') return {revision:0, data:{exercise:[],diet:[],sleep:[],vision:[],profile:null,exercisePlan:null,dietPlan:null,challenges:emptyChallenges()}}; throw e; }
  }
  function write(id, data, revision) {
    const current = read(id);
    if (revision !== current.revision) return null;
    const record = {revision:current.revision + 1, data:validateData(data)};
    fs.mkdirSync(directory, {recursive:true});
    const file = fileFor(id), temp = file + '.' + crypto.randomBytes(8).toString('hex') + '.tmp';
    try { fs.writeFileSync(temp, JSON.stringify(record), {mode:0o600}); fs.renameSync(temp, file); }
    finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    return record;
  }
  return {read, write};
}
module.exports = {createStore, validateData};
