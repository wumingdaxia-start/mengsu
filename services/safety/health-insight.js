'use strict';

const {config} = require('./consult-service');
const {retrieve} = require('./health-knowledge');

const round = value => Math.round(value * 10) / 10;
const dayBefore = (date, days) => new Date(Date.parse(date + 'T00:00:00Z') - days * 86400000).toISOString().slice(0, 10);

function summarize(records, endDate) {
  const startDate = dayBefore(endDate, 6);
  const inPeriod = item => item && typeof item === 'object' && typeof item.date === 'string' && item.date >= startDate && item.date <= endDate;
  const exercise = records.exercise.filter(inPeriod);
  const diet = records.diet.filter(inPeriod);
  const sleep = records.sleep.filter(inPeriod);
  const days = items => new Set(items.map(item => item.date)).size;
  const total = (items, field) => round(items.reduce((sum, item) => sum + item[field], 0));
  const qualities = sleep.filter(item => Number.isInteger(item.quality));
  const snapshot = {
    period: {startDate, endDate, days: 7},
    exercise: {days: days(exercise), sessions: exercise.length, minutes: total(exercise, 'minutes')},
    diet: {days: days(diet), meals: diet.length, recordedCalories: total(diet, 'calories'), recordedProteinGrams: total(diet, 'protein')},
    sleep: {days: days(sleep), entries: sleep.length, averageHours: sleep.length ? round(total(sleep, 'hours') / sleep.length) : null, ratedEntries: qualities.length, averageQuality: qualities.length ? round(total(qualities, 'quality') / qualities.length) : null}
  };
  return {snapshot, hasRecords: exercise.length + diet.length + sleep.length > 0};
}

function evidence(snapshot) {
  const {exercise, diet, sleep} = snapshot;
  return [
    `运动：${exercise.days}/7 天有记录，${exercise.sessions} 次，共 ${exercise.minutes} 分钟`,
    `饮食：${diet.days}/7 天有记录，${diet.meals} 餐；已记录餐次热量合计 ${diet.recordedCalories} kcal、蛋白质 ${diet.recordedProteinGrams} g`,
    `睡眠：${sleep.days}/7 天有记录${sleep.entries ? `，平均 ${sleep.averageHours} 小时` : ''}${sleep.ratedEntries ? `，主观质量均分 ${sleep.averageQuality}/5（${sleep.ratedEntries} 次评分）` : ''}`
  ];
}

const SYSTEM_PROMPT = '你是健康生活习惯分析助手，不是医生。只根据给定的七天汇总指标，给出简短、可执行、非诊断性的生活习惯建议。用户记录可能不完整；没有记录不等于没有运动、进食或睡眠。已记录餐次热量合计不等于总摄入，不能据此判断营养不足或过量。不要推断疾病、开药、编造未提供的指标、个人身份或外部文献。不能确定时明确指出数据不足。只能输出 JSON 对象，字段为 summary（不超过120字）、actions（2到3条，每条不超过100字）、caution（不超过120字）。';

async function generate(snapshot, {env=process.env, request=fetch}={}) {
  const settings = config(env);
  if (!settings) return {error:'尚未配置 AI 模型，暂时无法生成习惯洞察。', status:503};
  const references=[
    ...(snapshot.exercise.sessions?retrieve('运动',1):[]),
    ...(snapshot.diet.meals?retrieve('饮食',1):[]),
    ...(snapshot.sleep.entries?retrieve('睡眠',1):[])
  ];
  const referenceText=references.map((item,index)=>`[${index+1}] ${item.organization}《${item.title}》：${item.excerpt}`).join('\n');
  let response;
  try {
    response = await request(settings.endpoint, {
      method:'POST',
      headers:{Authorization:'Bearer ' + settings.key, 'Content-Type':'application/json'},
      body:JSON.stringify({model:settings.model, messages:[{role:'system', content:SYSTEM_PROMPT+' 对一般建议仅参考提供的官方健康资料片段；片段不够时说明不足，不要编造来源。'}, {role:'user', content:'请分析以下用户自填记录的汇总数据：' + JSON.stringify(snapshot)+'\n可参考的官方健康资料片段：\n'+referenceText}], temperature:0.2, max_tokens:650}),
      signal:AbortSignal.timeout(25000)
    });
  } catch { return {error:'AI 服务暂时无法连接，请稍后重试。', status:503}; }
  if (!response.ok) return {error:'AI 服务暂时无法回答，请稍后重试。', status:503};
  let content;
  try { content = (await response.json()).choices?.[0]?.message?.content; }
  catch { return {error:'AI 服务返回的数据无效。', status:502}; }
  if (typeof content !== 'string' || content.length > 6000) return {error:'AI 服务没有返回可用的分析。', status:502};
  let report;
  try { report = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { return {error:'AI 返回的分析格式无效，请重试。', status:502}; }
  const valid = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  if (!report || !valid(report.summary, 120) || !Array.isArray(report.actions) || report.actions.length < 2 || report.actions.length > 3 || !report.actions.every(action => valid(action, 100)) || !valid(report.caution, 120)) {
    return {error:'AI 返回的分析内容不完整，请重试。', status:502};
  }
  return {report:{summary:report.summary.trim(), actions:report.actions.map(action => action.trim()), caution:report.caution.trim()},references};
}

module.exports = {summarize, evidence, generate};
