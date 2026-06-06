(function(){
  const scrapeform = document.getElementById('scrapeForm');
  const usernameinput = document.getElementById('usernameInput');
  const scrapebtn = document.getElementById('scrapeBtn');
  const statusmessage = document.getElementById('statusMessage');
  const resultscontainer = document.getElementById('resultsContainer');
  const avatarimg = document.getElementById('avatarImg');
  const avatarcontainer = document.getElementById('avatarContainer');
  const verifiedbadge = document.getElementById('verifiedBadge');
  const displaynameel = document.getElementById('displayName');
  const usernamehandle = document.getElementById('usernameHandle');
  const biotext = document.getElementById('bioText');
  const biolink = document.getElementById('bioLink');
  const badgerow = document.getElementById('badgeRow');
  const statsgrid = document.getElementById('statsGrid');
  const detailgrid = document.getElementById('detailGrid');
  const btndownload = document.getElementById('btnDownload');
  const btnshare = document.getElementById('btnShare');
  const btnimport = document.getElementById('btnImport');
  const importfileinput = document.getElementById('importFileInput');
  const themeselect = document.getElementById('themeSelect');
  const scrolltogglebtn = document.getElementById('scrollToggleBtn');
  const nameanalysissec = document.getElementById('nameAnalysisSection');
  const gendercontent = document.getElementById('genderContent');
  const avatarmodaloverlay = document.getElementById('avatarModalOverlay');
  const avatarmodalclose = document.getElementById('avatarModalClose');
  const avatarmodalimg = document.getElementById('avatarModalImg');
  const avatarmodaldownload = document.getElementById('avatarModalDownload');

  let currentscrapeddata = null;
  let currentavatarurl = null;
  let currentusername = null;
  let countriesdata = [];
  let languagesdata = [];

  const corsproxies = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  async function loadjson(path) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`failed load ${path}`);
    return resp.json();
  }

  (async function initData() {
    try {
      [countriesdata, languagesdata] = await Promise.all([
        loadjson('countries.json'),
        loadjson('languages.json')
      ]);
    } catch(e) {}
  })();

  function getcountrybycode(code) {
    if (!code || !countriesdata.length) return null;
    const upper = code.toUpperCase();
    return countriesdata.find(c => c.code.toUpperCase() === upper) || null;
  }

  function getlanguagebycode(code) {
    if (!code || !languagesdata.length) return null;
    const lower = code.toLowerCase();
    return languagesdata.find(l => l.code.toLowerCase() === lower) || null;
  }

  function settheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tiktoktheme', theme);
    themeselect.value = theme;
  }

  themeselect.addEventListener('change', (e) => {
    settheme(e.target.value);
  });
  const savedtheme = localStorage.getItem('tiktoktheme') || 'light';
  settheme(savedtheme);

  function updatescrollvisibility() {
    const scrolly = window.scrollY;
    const nearbottom = window.innerHeight + scrolly >= document.body.scrollHeight - 100;
    const icon = scrolltogglebtn.querySelector('i');
    icon.className = nearbottom ? 'fa-solid fa-angles-up' : 'fa-solid fa-angles-down';
  }
  function togglescroll() {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 100;
    window.scrollTo({ top: nearBottom ? 0 : document.body.scrollHeight, behavior: 'smooth' });
  }
  window.addEventListener('scroll', updatescrollvisibility);
  scrolltogglebtn.addEventListener('click', togglescroll);

  function sanitizeusername(input) {
    let cleaned = input.trim();
    if (cleaned.startsWith('@')) cleaned = cleaned.substring(1);
    if (cleaned.includes('tiktok.com/')) {
      const match = cleaned.match(/tiktok\.com\/@?([^/?\s]+)/i);
      if (match) cleaned = match[1];
    }
    return cleaned.split('/')[0].split('?')[0].split('#')[0].trim();
  }

  function formatnumber(num) {
    if (num == null || isNaN(num)) return '0';
    const n = parseInt(num, 10);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return n.toLocaleString();
  }

  function formattimestamp(ts) {
    if (!ts) return 'unknown';
    return new Date(ts * 1000).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }

  function escapehtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function truncate(str, len) {
    if (!str) return 'n/a';
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
  }

  function showstatus(type, msg) {
    statusmessage.className = `status-message ${type}`;
    statusmessage.innerHTML = msg;
    statusmessage.style.display = 'flex';
  }
  function hidestatus() { statusmessage.style.display = 'none'; }
  function setloading(isLoading) {
    if (isLoading) { scrapebtn.classList.add('loading'); scrapebtn.disabled = true; usernameinput.disabled = true; }
    else { scrapebtn.classList.remove('loading'); scrapebtn.disabled = false; usernameinput.disabled = false; }
  }
  function showresults() { resultscontainer.classList.add('visible'); setTimeout(() => resultscontainer.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); }
  function hideresults() {
    resultscontainer.classList.remove('visible');
    currentscrapeddata = null;
    currentavatarurl = null;
    if (nameanalysissec) nameanalysissec.style.display = 'none';
  }

  async function fetchtiktokpage(username) {
    const url = `https://www.tiktok.com/@${username}?isUniqueId=true&isSecured=true`;
    let lasterr = null;
    for (let proxy of corsproxies) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 16000);
        const res = await fetch(proxy(url), { signal: controller.signal, headers: { 'Accept': 'text/html' } });
        clearTimeout(tid);
        if (!res.ok) throw new Error(`http ${res.status}`);
        const html = await res.text();
        if (html.length < 500 || (!html.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__') && !html.includes('webapp.user-detail'))) throw new Error('no data');
        return html;
      } catch(e) { lasterr = e; }
    }
    throw lasterr || new Error('all proxies failed');
  }

  function extractdata(html) {
    const regex = /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i;
    const match = html.match(regex);
    if (!match) throw new Error('missing script');
    let data = JSON.parse(match[1]);
    const scope = data.__DEFAULT_SCOPE__;
    if (!scope) throw new Error('invalid scope');
    const detail = scope['webapp.user-detail'];
    if (!detail?.userInfo) throw new Error('no userInfo');
    const user = detail.userInfo.user || {};
    const stats = detail.userInfo.stats || {};
    if (!user.uniqueId) throw new Error('no username found');
    return { user, stats };
  }

  function extractfirstname(nick) {
    if (!nick) return null;
    const clean = nick.replace(/[^a-zA-Z\s]/g, ' ').trim();
    const parts = clean.split(/\s+/);
    if (parts[0] && parts[0].length >= 2) return parts[0];
    return parts[1] && parts[1].length >= 2 ? parts[1] : null;
  }

  async function analyzegender(nickname) {
    const first = extractfirstname(nickname);
    if (!first) { if (nameanalysissec) nameanalysissec.style.display = 'none'; return; }
    if (nameanalysissec) nameanalysissec.style.display = '';
    gendercontent.innerHTML = '...';
    const enc = encodeURIComponent(first);
    const genderRes = await fetch(`https://api.genderize.io?name=${enc}`).then(r => r.json()).catch(() => null);
    if (genderRes && genderRes.gender) {
      const pct = Math.round(genderRes.probability * 100);
      const icon = genderRes.gender === 'male' ? '<i class="fa-solid fa-mars"></i>' : '<i class="fa-solid fa-venus"></i>';
      gendercontent.innerHTML = `<span class="analysis-value">${icon} ${genderRes.gender}</span> <span class="sub">${pct}%</span>`;
    } else gendercontent.innerHTML = 'unavailable';
  }

  function renderresults(user, stats) {
    const countryent = getcountrybycode(user.region);
    const languageent = getlanguagebycode(user.language);
    currentusername = user.uniqueId;
    
    const commerceInfo = user.commerceUserInfo || {};
    const isSeller = commerceInfo.isSeller || user.ttSeller || false;
    const creatorStatus = commerceInfo.creatorStatus || (isSeller ? 'seller' : null);
    
    currentscrapeddata = {
      scraped: new Date().toISOString(),
      user: {
        id: user.id,
        uniqueId: user.uniqueId,
        nickname: user.nickname,
        avatar: user.avatarLarger,
        signature: user.signature,
        created: user.createTime,
        verified: user.verified,
        region: user.region,
        language: user.language,
        private: user.privateAccount,
        secUid: user.secUid || null,
        instagramId: user.instagramId || null,
        twitterId: user.twitterId || null,
        youtubeChannelId: user.youtubeChannelId || null,
        youtubeChannelTitle: user.youtubeChannelTitle || null,
        nickNameModifyTime: user.nickNameModifyTime || null,
        modifyTime: user.modifyTime || null,
        commerceUserInfo: commerceInfo,
        ttSeller: isSeller
      },
      stats: {
        followers: stats.followerCount,
        following: stats.followingCount,
        hearts: stats.heartCount || stats.heart,
        videos: stats.videoCount,
        diggCount: stats.diggCount || 0
      }
    };
    
    const avatar = user.avatarLarger || user.avatarMedium || '';
    currentavatarurl = avatar;
    avatarimg.src = avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23444" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" font-size="40"%3E?%3C/text%3E%3C/svg%3E';
    verifiedbadge.style.display = user.verified ? 'flex' : 'none';
    displaynameel.textContent = user.nickname || user.uniqueId;
    usernamehandle.innerHTML = user.uniqueId ? `<a href="https://www.tiktok.com/@${user.uniqueId}" target="_blank">@${escapehtml(user.uniqueId)}</a>` : '@—';
    biotext.textContent = user.signature || ''; biotext.style.display = user.signature ? 'block' : 'none';
    if (user.bioLink?.link) { biolink.href = user.bioLink.link; biolink.textContent = user.bioLink.link; biolink.style.display = 'inline-block'; } else biolink.style.display = 'none';
    
    badgerow.innerHTML = '';
    const badges = [];
    if (countryent) badges.push({ icon:'fa-solid fa-globe', text:`${countryent.name} (${countryent.code}) ${countryent.emoji || ''}` });
    if (languageent) badges.push({ icon:'fa-solid fa-language', text:`${languageent.name} (${languageent.code})` });
    if (user.verified) badges.push({ icon:'fa-solid fa-circle-check', text:'verified' });
    if (isSeller) badges.push({ icon:'fa-solid fa-store', text:'tiktok seller' });
    if (user.privateAccount) badges.push({ icon:'fa-solid fa-lock', text:'private' });
    else badges.push({ icon:'fa-solid fa-earth-americas', text:'public' });
    badges.forEach(b => { const span = document.createElement('span'); span.className = 'badge-modern'; span.innerHTML = `<i class="${b.icon}"></i> ${b.text}`; badgerow.appendChild(span); });
    
    statsgrid.innerHTML = `
      <div class="stat-block"><div class="stat-number">${formatnumber(stats.followerCount)}</div><div class="stat-label">followers</div></div>
      <div class="stat-block"><div class="stat-number">${formatnumber(stats.followingCount)}</div><div class="stat-label">following</div></div>
      <div class="stat-block"><div class="stat-number">${formatnumber(stats.heartCount || stats.heart)}</div><div class="stat-label">hearts received</div></div>
      <div class="stat-block"><div class="stat-number">${formatnumber(stats.diggCount || 0)}</div><div class="stat-label">diggs given</div></div>
      <div class="stat-block"><div class="stat-number">${formatnumber(stats.videoCount)}</div><div class="stat-label">videos</div></div>
    `;
    
    const secuidDisplay = user.secUid ? truncate(user.secUid, 24) : 'n/a';
    const languageDisplay = languageent ? `${languageent.name} (${languageent.code})` : (user.language || 'unknown');
    const instaDisplay = user.instagramId ? `@${user.instagramId}` : 'not linked';
    const twitterDisplay = user.twitterId ? `@${user.twitterId}` : 'not linked';
    const youtubeDisplay = user.youtubeChannelTitle ? user.youtubeChannelTitle : (user.youtubeChannelId || 'not linked');
    const nicknameChanged = formattimestamp(user.nickNameModifyTime);
    const profileEdited = formattimestamp(user.modifyTime);
    const creatorInfoDisplay = creatorStatus ? `creator / seller` : (isSeller ? 'seller' : 'not a creator');
    
    detailgrid.innerHTML = `
      <div class="detail-entry"><i class="fa-solid fa-id-card"></i><div><strong>user id</strong><br>${user.id || 'n/a'}</div></div>
      <div class="detail-entry"><i class="fa-solid fa-fingerprint"></i><div><strong>secUid</strong><br><span class="mono" title="${escapehtml(user.secUid || '')}">${escapehtml(secuidDisplay)}</span></div></div>
      <div class="detail-entry"><i class="fa-solid fa-calendar-alt"></i><div><strong>joined</strong><br>${formattimestamp(user.createTime)}</div></div>
      <div class="detail-entry"><i class="fa-solid fa-pen"></i><div><strong>nickname last changed</strong><br>${nicknameChanged}</div></div>
      <div class="detail-entry"><i class="fa-solid fa-user-pen"></i><div><strong>profile last edited</strong><br>${profileEdited}</div></div>
      <div class="detail-entry"><i class="fa-brands fa-instagram"></i><div><strong>instagram</strong><br>${escapehtml(instaDisplay)}</div></div>
      <div class="detail-entry"><i class="fa-brands fa-twitter"></i><div><strong>twitter</strong><br>${escapehtml(twitterDisplay)}</div></div>
      <div class="detail-entry"><i class="fa-brands fa-youtube"></i><div><strong>youtube</strong><br>${escapehtml(youtubeDisplay)}</div></div>
      <div class="detail-entry"><i class="fa-solid fa-store"></i><div><strong>creator info</strong><br>${escapehtml(creatorInfoDisplay)}</div></div>
      <div class="detail-entry"><i class="fa-solid fa-location-dot"></i><div><strong>region</strong><br>${countryent ? `${countryent.name} (${countryent.code}) ${countryent.emoji || ''}` : (user.region || 'unknown')}</div></div>
      <div class="detail-entry"><i class="fa-solid fa-language"></i><div><strong>language</strong><br>${escapehtml(languageDisplay)}</div></div>
    `;
    showresults();
    analyzegender(user.nickname);
  }

  async function handlescrape(username) {
    hidestatus(); hideresults(); setloading(true);
    try {
      const html = await fetchtiktokpage(username);
      const { user, stats } = extractdata(html);
      renderresults(user, stats);
    } catch(err) {
      hideresults();
      showstatus('error', `<i class="fa-solid fa-circle-exclamation"></i> ${escapehtml(err.message || 'request failed')}`);
    } finally { setloading(false); }
  }

  scrapeform.addEventListener('submit', e => {
    e.preventDefault();
    const raw = sanitizeusername(usernameinput.value);
    if (!raw) { showstatus('warning', 'enter a valid username'); return; }
    usernameinput.value = raw;
    handlescrape(raw);
  });
  btndownload.addEventListener('click', () => { if(currentscrapeddata) { const blob = new Blob([JSON.stringify(currentscrapeddata, null, 2)], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tiktok_${currentusername}.json`; a.click(); URL.revokeObjectURL(a.href); } });
  btnshare.addEventListener('click', () => { if(currentusername) { const url = new URL(location); url.hash = currentusername; navigator.clipboard.writeText(url); btnshare.innerHTML = '<i class="fa-solid fa-check"></i> link copied'; setTimeout(() => btnshare.innerHTML = '<i class="fa-solid fa-share-nodes"></i> share link', 2000); } });
  btnimport.addEventListener('click', () => importfileinput.click());
  importfileinput.addEventListener('change', e => {
    const file = e.target.files[0];
    if(file){
      const reader = new FileReader();
      reader.onload = ev => { try { const data = JSON.parse(ev.target.result); const u = data.user || data; const s = data.stats || {}; if(!u.uniqueId) throw new Error(); renderresults(u, s); showstatus('info','import successful'); } catch(err){ showstatus('error','invalid json'); } };
      reader.readAsText(file);
    }
    importfileinput.value = '';
  });
  avatarcontainer.addEventListener('click', () => { if(currentavatarurl){ avatarmodalimg.src = currentavatarurl; avatarmodaldownload.href = currentavatarurl; avatarmodaloverlay.classList.add('visible'); } });
  avatarmodalclose.addEventListener('click', () => avatarmodaloverlay.classList.remove('visible'));
  avatarmodaloverlay.addEventListener('click', e => { if(e.target === avatarmodaloverlay) avatarmodaloverlay.classList.remove('visible'); });

  const hash = location.hash.slice(1);
  if (hash) {
    const user = sanitizeusername(hash);
    if (user) { usernameinput.value = user; handlescrape(user); }
  }
  usernameinput.focus();
})();
