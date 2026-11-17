async function fetchWeather(fetcher,lat,lon){
 try{
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  for(const [k,v] of Object.entries({latitude:lat,longitude:lon,current:'temperature_2m,weather_code',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',forecast_days:2,timezone:'auto'}))url.searchParams.set(k,v);
  const response=await fetcher(url,{signal:AbortSignal.timeout(4500)});
  if(!response.ok)throw Error('Weather provider unavailable');
  const data=await response.json();
  if(!Number.isFinite(data.current?.temperature_2m)||!Number.isFinite(data.current?.weather_code)||![data.daily?.temperature_2m_min,data.daily?.temperature_2m_max].every(a=>Array.isArray(a)&&a.length&&a.every(Number.isFinite)))throw Error('Invalid weather data');
  return {current:data.current,daily:data.daily,source:'open-meteo'};
 }catch{
  const url=new URL('https://api.met.no/weatherapi/locationforecast/2.0/compact');
  url.searchParams.set('lat',Number(lat).toFixed(4));url.searchParams.set('lon',Number(lon).toFixed(4));
  const response=await fetcher(url,{signal:AbortSignal.timeout(6500),headers:{'User-Agent':'HuayuxingWeather/1.0'}});
  if(!response.ok)throw Error('Weather provider unavailable');
  const data=await response.json();
  const rows=(data.properties?.timeseries||[]).filter(r=>Number.isFinite(r.data?.instant?.details?.air_temperature)&&Number.isFinite(Date.parse(r.time))&&Date.parse(r.time)>=Date.now()-3600000);
  if(!rows.length)throw Error('Invalid weather data');
  const start=Date.parse(rows[0].time),first=rows[0].data;
  const ranges=[0,1].map(day=>rows.filter(r=>Date.parse(r.time)>=start+day*86400000&&Date.parse(r.time)<start+(day+1)*86400000).map(r=>r.data.instant.details.air_temperature)).filter(r=>r.length);
  const symbol=first.next_1_hours?.summary?.symbol_code||first.next_6_hours?.summary?.symbol_code||'';
  const code=/thunder/.test(symbol)?95:/snow|sleet/.test(symbol)?73:/rain|showers/.test(symbol)?61:/fog/.test(symbol)?45:/cloud/.test(symbol)?3:0;
  return {current:{temperature_2m:first.instant.details.air_temperature,weather_code:code},daily:{temperature_2m_min:ranges.map(r=>Math.min(...r)),temperature_2m_max:ranges.map(r=>Math.max(...r)),precipitation_probability_max:[]},forecastOnly:true,source:'met.no'};
 }
}
module.exports={fetchWeather};
