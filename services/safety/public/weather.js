/* Weather is public contextual information, never part of personal health records. */
(function () {
  const cities = {
    beijing: [39.9042, 116.4074, '北京'], shanghai: [31.2304, 121.4737, '上海'],
    guangzhou: [23.1291, 113.2644, '广州'], shenzhen: [22.5431, 114.0579, '深圳'],
    chengdu: [30.5728, 104.0668, '成都'], hangzhou: [30.2741, 120.1551, '杭州'],
    wuhan: [30.5928, 114.3055, '武汉'], xian: [34.3416, 108.9398, '西安']
  };
  const select = document.querySelector('#weatherCity');
  if (!select) return;
  const find = id => document.querySelector('#' + id);
  let selected = 'beijing', requestNumber = 0;
  try { if (cities[localStorage.getItem('weather-city')]) selected = localStorage.getItem('weather-city'); } catch {}
  select.value = selected;

  function weatherKind(code) {
    if (code === 0) return ['晴朗', 'sun'];
    if (code <= 3) return ['多云', 'cloud'];
    if (code <= 48) return ['有雾', 'fog'];
    if (code >= 95) return ['雷雨', 'storm'];
    if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return ['有雪', 'snow'];
    if (code <= 67 || code >= 80 && code <= 82) return ['有雨', 'rain'];
    return ['天气变化', 'cloud'];
  }
  const icons = {
    sun: '<circle cx="24" cy="24" r="9"/><path d="M24 3v7M24 38v7M3 24h7M38 24h7M9 9l5 5M34 34l5 5M39 9l-5 5M14 34l-5 5"/>',
    cloud: '<path d="M15 35H36a8 8 0 0 0 .4-16 13 13 0 0 0-24.5 3A7 7 0 0 0 15 35Z"/>',
    fog: '<path d="M12 18c2-7 11-11 18-7 3 2 5 4 6 8M8 27h32M4 34h32M12 41h26"/>',
    rain: '<path d="M15 30H36a8 8 0 0 0 .4-16 13 13 0 0 0-24.5 3A7 7 0 0 0 15 30ZM17 35l-3 7M27 35l-3 7M37 35l-3 7"/>',
    snow: '<path d="M15 28H36a8 8 0 0 0 .4-16 13 13 0 0 0-24.5 3A7 7 0 0 0 15 28ZM16 37h2m10 0h2m10 0h2"/>',
    storm: '<path d="M15 29H36a8 8 0 0 0 .4-16 13 13 0 0 0-24.5 3A7 7 0 0 0 15 29ZM25 31l-5 9h6l-3 6"/>'
  };
  function advice(temp, rain) {
    let clothing = temp < 5 ? '穿厚外套，注意保暖' : temp < 15 ? '建议穿外套或毛衣' : temp < 24 ? '薄外套或长袖更合适' : temp < 30 ? '适合轻薄透气衣物' : '穿轻薄衣物，注意防暑';
    if (rain >= 50) clothing += '，外出带伞';
    return clothing;
  }
  function unavailable(message) {
    find('weatherArt').textContent = '☁';
    find('weatherTemp').textContent = '--°';
    find('weatherCondition').textContent = '天气暂不可用';
    find('weatherForecast').textContent = '请稍后重试或切换城市';
    find('weatherTip').textContent = message;
    find('weatherCard').classList.remove('is-loading');
  }
  async function loadWeather(lat, lon, label) {
    const currentRequest = ++requestNumber;
    find('weatherCard').classList.add('is-loading');
    find('weatherCondition').textContent = '正在获取' + label + '天气…';
    const url = '/api/weather?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon);
    try {
      const response = await fetch(url, {cache: 'no-store'});
      if (!response.ok) throw Error('天气服务暂时不可用');
      const data = await response.json();
      if (currentRequest !== requestNumber) return;
      const now = data.current, daily = data.daily;
      if (!Number.isFinite(now?.temperature_2m) || !Number.isFinite(daily?.temperature_2m_max?.[0])) throw Error('天气数据不完整');
      const [description, kind] = weatherKind(now.weather_code);
      const rain = Number(daily.precipitation_probability_max?.[0] || 0);
      find('weatherArt').innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true">' + icons[kind] + '</svg>';
      find('weatherTemp').textContent = Math.round(now.temperature_2m) + '°';
      find('weatherCondition').textContent = label + ' · ' + description;
      find('weatherForecast').textContent = '今日 ' + Math.round(daily.temperature_2m_min[0]) + '–' + Math.round(daily.temperature_2m_max[0]) + '° · 明日最高 ' + Math.round(daily.temperature_2m_max[1] ?? daily.temperature_2m_max[0]) + '°';
      find('weatherTip').textContent = (data.stale ? '天气暂未更新，显示最近缓存 · ' : '') + advice(now.temperature_2m, rain);
      find('weatherCard').classList.remove('is-loading');
    } catch (error) { if (currentRequest === requestNumber) unavailable(error.message || '请稍后重试'); }
  }
  select.addEventListener('change', () => {
    selected = select.value;
    try { localStorage.setItem('weather-city', selected); } catch {}
    const [lat, lon, name] = cities[selected];
    loadWeather(lat, lon, name);
  });
  find('weatherLocate').addEventListener('click', async () => {
    const button = find('weatherLocate');
    const tip = message => { find('weatherTip').textContent = message; find('weatherTip').setAttribute('role', 'status'); };
    if (!window.isSecureContext) { tip('手机定位需要 HTTPS 安全网址，请使用 HTTPS 打开网站，或手动选择城市。'); return; }
    if (!navigator.geolocation) { tip('当前浏览器不支持定位，请使用系统浏览器打开，或手动选择城市。'); return; }
    if (button.disabled) return;
    button.disabled = true; select.disabled = true; button.textContent = '定位中…';
    const position = options => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
    try {
      let result;
      try { result = await position({enableHighAccuracy:false, timeout:15000, maximumAge:300000}); }
      catch (error) { if (error.code === 1) throw error; result = await position({enableHighAccuracy:true, timeout:15000, maximumAge:300000}); }
      select.selectedIndex = -1;
      await loadWeather(result.coords.latitude, result.coords.longitude, '当前位置');
    } catch (error) {
      tip(error.code === 1 ? '请在浏览器网站权限和手机系统设置中允许位置访问，再重试；也可以手动选择城市。' : error.code === 3 ? '定位等待超时，请开启手机定位、检查网络后重试，或手动选择城市。' : '暂时无法获取位置，请开启手机定位，或改用系统浏览器打开；也可以手动选择城市。');
    } finally { button.disabled = false; select.disabled = false; button.textContent = '定位'; }
  });
  const [lat, lon, name] = cities[selected];
  loadWeather(lat, lon, name);
})();
