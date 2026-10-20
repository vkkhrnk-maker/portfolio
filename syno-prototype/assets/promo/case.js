/* Portfolio fixtures for the existing Syno prototypes. Enable with ?case=promo. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('case') !== 'promo') return;
  document.documentElement.classList.add('promo-case');
  const d = window.SynoPromoData;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const image = key => d.images[key];
  const imageAttrs = src => {const s=d.imageSizes?.[src];return s?` width="${s[0]}" height="${s[1]}"`:'';};
  const imageRatio = src => {const s=d.imageSizes?.[src];return s?s[0]/s[1]:4/3;};
  const caseLink = href => {
    if (!href || !/^\.?\/?proto-[^/]+/.test(href)) return href;
    const u = new URL(href, location.href);
    u.searchParams.set('case', 'promo');
    if (u.pathname.endsWith('proto-registry.html') && u.hash === '#opencalls') u.hash = '#opencall:past';
    return u.pathname.split('/').pop() + u.search + u.hash;
  };
  const names = {
    'elena.andreou@example.com':'mira.soleni@example.com',
    'Elena_Andreou_CV.pdf':'Mira_Soleni_CV.pdf',
    'Elena Andreou':'Mira Soleni', 'Rea Charalambidou':'Nora Veli',
    'Marcos Aristidou':'Leon Arven', 'Sofia Tanner':'Theo Maveli',
    'Andreas Savva':'Theo Maveli', 'Yiannis Costa':'Theo Maveli',
    'Lara Hadjipavlou':'Iris Varen', 'Maria Loizidou':'Iris Varen',
    'Christos Neophytou':'Dani Orien', 'Yiannis Sakellis':'Dani Orien'
  };
  const legacyMedia = {
    'profile-cover.png':'shiota-journey-cover','portrait-elena.png':'portrait',
    'pwork-square.png':'shiota-journey-cover','pwork-tall-1.png':'shiota-body',
    'pwork-tall-2.png':'12','pwork-portrait.jpg':'6','pwork-waterfall.jpg':'shiota-body',
    'pwork-forest.jpg':'shiota-inside-outside','pwork-coast.jpg':'shiota-accumulation','pwork-dusk.jpg':'shiota-silence',
    'card-1.png':'shiota-journey-cover','card-2.png':'vima-installation',
    'p3.png':'shiota-journey-cover','p4.png':'4','p5.png':'8','p6.png':'shiota-body',
    'p7.png':'6','p8.png':'nomad-yellow-apartment','p9.png':'juno-honeymoon',
    'p10.png':'shiota-inside-outside','p11.png':'watermill-centre','p12.png':'12',
    'st-night-studio.jpg':'5','st-hollow-weights-nimac.jpg':'shiota-journey-cover',
    'st-gallery-white.jpg':'shiota-journey-cover','st-gallery-hall.jpg':'shiota-inside-outside',
    'st-museum-hall.jpg':'shiota-silence','st-artist-studio.jpg':'nomad-maison-jaune'
  };
  function asset(src) {
    if (!src || /assets\/promo\//.test(src) || /^(blob:|data:)/.test(src)) return src;
    const key = legacyMedia[src.split('/').pop().split('?')[0]];
    return key ? image(key) : src;
  }
  function replaceNames(value) {
    for (const [from, to] of Object.entries(names)) value = value.split(from).join(to);
    return value;
  }
  function decorate(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (root.parentElement?.closest('script,style,textarea,input')) return;
      const next = replaceNames(root.textContent);
      if (next !== root.textContent) root.textContent = next;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root !== document) return;
    const nodes = root === document ? $$('img,a,[data-href],[data-site-href],iframe') : [root, ...$$('img,a,[data-href],[data-site-href],iframe', root)];
    for (const n of nodes) {
      if (n.matches('img[src]')) {
        n.setAttribute('loading','eager');
        const before = n.getAttribute('src'), next = asset(before);
        if (before !== next) n.setAttribute('src', next);
        const size=d.imageSizes?.[next];
        if(size){n.setAttribute('width',size[0]);n.setAttribute('height',size[1]);}
      }
      for (const attr of ['href','data-href','data-site-href']) {
        const value = n.getAttribute(attr);
        if (value) { const next = caseLink(value); if (next !== value) n.setAttribute(attr,next); }
      }
      if (n.matches('iframe[src*="proto-v2"]')) {
        const before = n.getAttribute('src'), next = caseLink(before);
        if (before !== next) n.setAttribute('src', next);
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node; while ((node = walker.nextNode())) decorate(node);
  }
  const workHTML = (w,i=0) => `<div class="ap-work${i>=2?' promo-work-more':''}" style="--promo-order:${i}"><img src="${esc(w.img)}"${imageAttrs(w.img)} alt="${esc(w.title)}" loading="${i<2?'eager':'lazy'}"><div class="ap-work-t">${esc(w.title)}</div><div class="ap-work-m">${esc(w.year)} · ${esc(w.medium)}</div></div>`;
  const factsRow = (label, value) => `<div class="pf-row"><div class="pf-row-label">${esc(label)}</div><div class="pf-row-value">${value}</div></div>`;
  const connection = (src, title, meta, attrs = '') => `<li class="ap-conn-item" ${attrs}><img class="ap-conn-thumb" src="${esc(src)}" alt=""><div class="ap-conn-text"><span class="ap-conn-name">${esc(title)}</span><div class="ap-conn-meta">${esc(meta)}</div></div></li>`;
  let selectedArtist = new URLSearchParams(location.search).get('artist') || d.artists[0].id;
  function applyProfile() {
    const a = d.artists.find(a => a.id === selectedArtist) || d.artists[0];
    const profile = $('#screen-profile');
    const url=new URL(location.href);url.searchParams.set('artist',a.id);history.replaceState(history.state,'',url);
    if (!profile || a === d.artists[0]) return;
    $('.ap-name',profile).textContent = a.name;
    $('.ap-meta',profile).textContent = a.bio;
    $('.ap-cover > img',profile).src = a.works[0].img;
    $('.ap-badges',profile).innerHTML = '';
    $('.ap-works',profile).innerHTML = a.works.map((w,i)=>`<div class="promo-work-column">${workHTML(w,i)}</div>`).join('');
    const city = a.city[0].toUpperCase()+a.city.slice(1);
    $('.pf-details-rows',profile).innerHTML = factsRow('Based in',city+', Cyprus') + factsRow('Medium',esc(a.practice.split(' · ')[0]));
    $('.pf-portrait',profile).hidden = true;
    $('#pf-statement',profile).hidden = true;
    $('#pf-cv',profile).hidden = true;
    $('#pf-connections',profile).hidden = true;
    $('.ap-works-more-row',profile).style.display = 'none';
  }
  function applyWork(title,meta,src) {
    const a=d.artists.find(a=>a.id===selectedArtist)||d.artists[0],scr=$('#screen-work');
    const w=a.works.find(w=>w.title===title)||d.profileWorks.find(w=>w.title===title);
    $('.wd-subtitle',scr).textContent=a.name;
    $('#wd-about').hidden=true;
    $('#wd-facts').innerHTML=w?`<div class="wd-detail-row">${esc(w.year)}</div><span class="badge outline">${esc(w.medium)}</span>`:'';
    $('.wd-media',scr).innerHTML=`<div class="wd-media-item wd-media-main"><img src="${esc(src)}" alt="${esc(title)}"></div>`;
    $('#wd-exhibited').hidden=true;
    const others=a.works.filter(w=>w.title!==title);
    $('#wd-more').hidden=!others.length;
    $('#wd-more-title').textContent='More from '+a.name;
    $('#wd-more-grid').innerHTML=others.map(w=>`<div class="wd-morecard" data-t="${esc(w.title)}" data-m="${esc(w.year+' · '+w.medium)}" data-src="${esc(w.img)}"><div class="wd-morecard-img"><img src="${esc(w.img)}" alt="${esc(w.title)}"></div><div class="wd-morecard-t">${esc(w.title)}</div><div class="wd-morecard-m">${esc(w.year)} · ${esc(w.medium)}</div></div>`).join('');
  }
  document.addEventListener('click',e=>{
    const card=e.target.closest('[data-go="profile"]');
    if(!card || e.target.closest('button'))return;
    const a=d.artists.find(a=>a.id===card.dataset.promoArtist || a.name===replaceNames(card.dataset.name||''));
    if(a)selectedArtist=a.id;
  },true);
  function prepareRegistry() {
    const grid = $('#registry-grid');
    if (!grid) return;
    const sort = $('#registry-sort');
    sort.dataset.value = 'recent';
    $('.dropdown-value',sort).textContent = 'Sort: Newest';
    const recent = $('[data-value="recent"]',sort);
    if(recent) recent.textContent = 'Newest';
    grid.innerHTML = d.artists.map((a,i) => `<div class="artist-card" style="--promo-cover-ratio:${imageRatio(a.works[0].img)}" data-go="profile" data-name="${esc(a.name)}" data-promo-artist="${a.id}" data-medium="${a.medium}" data-city="${a.city}" data-selected="${i===0}" data-current="${i===0}" data-added="${6-i}" data-works="${esc(a.works.map(w=>w.img).join(','))}" data-work-titles="${esc(a.works.map(w=>w.title+', '+w.year).join(';'))}"><img class="artist-card-thumb" src="${esc(a.works[0].img)}" alt="${esc(a.works[0].title)}"><div class="artist-card-info"><div class="artist-card-name">${esc(a.name)}</div><div class="artist-card-meta">${esc(a.bio)}</div><div class="artist-card-practice">${esc(a.practice)}</div></div></div>`).join('');
    const profile = $('#screen-profile');
    $('.ap-name',profile).textContent = d.artists[0].name;
    $('.ap-meta',profile).textContent = d.artists[0].bio;
    $('.ap-cover > img',profile).src = image('shiota-journey-cover');
    $('.ap-badges',profile).innerHTML = '<span class="badge secondary">Artist spotlight</span>';
    $('.ap-works',profile).innerHTML = [0,2,4].map(i => `<div class="promo-work-column">${d.profileWorks.slice(i,i+2).map(w=>workHTML(w,d.artists[0].works.findIndex(x=>x.title===w.title))).join('')}</div>`).join('');
    const details = $('#pf-details .pf-details-rows');
    details.innerHTML = factsRow('Based in','Nicosia, Cyprus') + factsRow('Born in','Limassol, Cyprus') +
      factsRow('Medium','<span class="badge outline">Mixed media</span><span class="badge outline">Installation</span><span class="badge outline">Sculpture</span>') +
      factsRow('Website','<span class="link" data-mock="Artist website">mirasoleni.example</span>') + factsRow('Studio','Aster Studio, Nicosia');
    $('.pf-details-name',profile).textContent = d.artists[0].name;
    $('.pf-portrait',profile).src = image('portrait');
    $('.pf-portrait',profile).alt = 'Fictional artist Mira Soleni';
    $('#pf-statement .oc-sec-title').textContent = 'Practice';
    $('.pf-statement-text',profile).textContent = d.practice;
    const cv = [
      ['Education',[['2011','BA Fine Art — Athens'],['2014','MA Contemporary Art — London']]],
      ['Solo & duo exhibitions',[['2026','Echoes of Silence — Aster Project Space, Nicosia'],['2024','Rooms We Remember — Linea Studio, Limassol']]],
      ['Group exhibitions',[['2026','Common Ground — Harbour Room, Larnaca'],['2025','Island Notes — Aster Project Space, Nicosia']]],
      ['Residencies',[['2023','Field Notes — Studio Residency, Paphos']]],
      ['Selected projects',[['2025','Shared Rooms — Nicosia']]],
      ['Exhibition spaces',[['','Aster Project Space, Nicosia'],['','Linea Studio, Limassol']]],
      ['Press',[['2026','SYNO — Thread, memory and connection'],['2025','SYNO — A studio visit in Nicosia']]]
    ];
    $('#pf-cv .oc-sec-body').innerHTML = cv.map(([title,rows])=>`<div class="ap-cv-group"><h3>${esc(title)}</h3>${rows.map(([a,b])=>factsRow(a,esc(b))).join('')}</div>`).join('');
    $('#pf-connections .oc-sec-body').innerHTML = `<div class="ap-conn"><div class="ap-conn-group"><div class="ap-conn-label">Exhibited at</div><ul class="ap-conn-list">${connection(image('shiota-journey-cover'),'Aster Project Space','Nicosia')}${connection(image('shiota-silence'),'Linea Studio','Limassol')}</ul></div><div class="ap-conn-group"><div class="ap-conn-label">Featured in Stories</div><ul class="ap-conn-list">${[1,3].map(i=>connection(d.stories[i].cover,d.stories[i].title,d.stories[i].format,`data-site-href="proto-stories.html#/story/${d.stories[i].slug}"`)).join('')}</ul></div></div>`;
    $('#pf-stories').hidden = true;
    profile.querySelector('.pf-details-name').hidden = true;
    const applicationWorks = $('#works-grid');
    if (applicationWorks) applicationWorks.innerHTML = d.profileWorks.map((work, i) =>
      `<div class="work-card${[0,2,4].includes(i)?' selected':''}"><div class="work-check"><span class="material-icons">check</span></div><img class="work-thumb" src="${esc(work.img)}" alt="${esc(work.title)}"${imageAttrs(work.img)}><div class="work-info"><div class="work-title">${esc(work.title)}</div><div class="work-meta">${esc(work.year)} · ${esc(work.medium)}</div></div></div>`
    ).join('');
    const applicationStatement = $('#ai-app-statement');
    if (applicationStatement) applicationStatement.value = d.practice;
  }
  function artistCard(a) {
    return `<a class="card-cell" href="proto-registry.html?case=promo&artist=${a.id}#profile"><div class="card-media"><button class="card-follow" type="button" data-follow="${esc(a.name)}">Follow</button>${a.works.slice(0,3).map((w,i)=>`<img src="${esc(w.img)}" alt="${esc(w.title)}" class="${i?'':'is-on'}" loading="lazy">`).join('')}</div>${a.works.length>1?`<div class="work-dots">${a.works.slice(0,3).map((_,i)=>`<button class="work-dot ${i?'':'is-on'}" aria-label="Work ${i+1} of ${a.works.length} works"></button>`).join('')}</div>`:''}<div><div class="card-name">${esc(a.name)}</div><div class="card-mono">${esc(a.bio)}</div></div><div class="card-sub">${esc(a.practice)}</div></a>`;
  }
  function prepareHome() {
    const rail = $('#registry-rail');
    if (!rail) return;
    rail.innerHTML = [0,2,4,3,5].map(i=>{
      const a=d.artists[i];
      return artistCard([2,3].includes(i)?{...a,works:[...a.works].reverse()}:a);
    }).join('');
    const slides = $$('.hero-slide:not(.is-call)');
    const keys = ['vima-hall','shiota-journey-cover','vima-installation','shiota-silence'];
    slides.forEach((slide,i)=>{ const img=$('img',slide);if(img)img.src=image(keys[i]); });
    slides.forEach(slide=>{const img=$('img',slide);if(img)img.alt='';});
    if(slides[2]){slides[2].dataset.when='17–18 Oct';$('.hero-meta',slides[2]).textContent='Old Town, Limassol · 17–18 October';}
    if(slides[3]){slides[3].dataset.when='Until 6 Nov';$('.hero-meta',slides[3]).textContent='Thkio Ppalies, Nicosia · until 6 November';}
    const secondTitle = slides[1] && $('.hero-title',slides[1]);
    if (secondTitle) secondTitle.textContent = d.stories[1].title;
    const coming = $$('.coming-row');
    ['vima-hall','shiota-inside-outside','vima-installation','11','watermill-centre','shiota-silence'].forEach((key,i)=>{const img=coming[i]&&$('img',coming[i]);if(img)img.src=image(key);});
    ['Tonight · 20:00','20 Oct · 18:30','17–18 Oct','18 Oct · 19:00','18 Oct · 20:30','Until 27 Oct'].forEach((text,i)=>{
      if(!coming[i])return;
      $('.coming-meta',coming[i]).textContent=text;
      const b=$('[data-save]',coming[i]);if(b)b.dataset.img=$('img',coming[i]).getAttribute('src');
    });
    const stories = $$('.stories-row .story-card');
    [d.stories[0],d.stories[1],d.stories[4]].forEach((s,i)=>{
      if(!stories[i])return;
      const card=stories[i],img=$('img',card),title=$('.story-title',card),meta=$('.story-meta',card);
      card.href=caseLink('proto-stories.html#/story/'+s.slug);
      if(img)img.src=s.cover;
      if(title)title.textContent=s.title;
      if(meta)meta.textContent=s.format+' · '+new Date(s.date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
    });
    const places = $('#places-rail');
    if (places) {
      [...places.children].slice(5).forEach(card=>card.remove());
      ['vima-installation','shiota-inside-outside','watermill-centre','nomad-maison-jaune','nomad-yellow-apartment'].forEach((key,i)=>{const card=places.children[i],img=card&&$('img',card);if(img)img.src=image(key);});
    }
  }
  function applyStories(stories) {
    stories.splice(9);
    const leads=[
      'A selection of contemporary works exploring colour, pattern and the painted figure.',
      d.practice,
      'Exhibition spaces, installations and conversations around the art programme in Limassol.',
      d.eventDescription,
      'Staged interiors, reflected figures and carefully constructed colour in the photographic image.',
      'Architecture and shared spaces shape how we encounter contemporary art.',
      'A look at the meeting point of art, design and domestic space.',
      'Stone, texture and the relationship between a sculpture and the space around it.',
      'Interiors and the objects that give a room its rhythm and character.'
    ];
    stories.slice(0,9).forEach((story,i)=>{
      const s=d.stories[i];story.title=s.title;story.cover=s.cover;story.lead=leads[i];
      story.hero={img:s.cover,caption:s.title};
      // Preserve the interview's real layout and interactions in the case.
      if(i===1){
        const adapt=value=>{
          if(typeof value==='string')return replaceNames(value).replace(/\bAndreou\b/g,'Soleni').replace(/twelve works/g,'six works');
          if(Array.isArray(value))return value.map(adapt);
          if(value&&typeof value==='object'){
            const block=Object.fromEntries(Object.entries(value).map(([key,v])=>[key,adapt(v)]));
            if(block.t==='fig'){
              const work=d.profileWorks[/profile-work-2/.test(block.img)?1:0];
              Object.assign(block,{img:work.img,title:work.title,work:true});
            }
            if(block.t==='entity'&&block.kind==='event')Object.assign(block,{
              img:image('shiota-journey-cover'),title:'Echoes of Silence',
              meta:'Exhibition · Aster Project Space, Nicosia',start:'2026-10-10',end:'2026-11-22'
            });
            return block;
          }
          return value;
        };
        story.body=adapt(story.body);
        story.after=[{t:'registry',rows:'elena'},{t:'more',slugs:stories.filter(x=>x!==story).slice(0,4).map(x=>x.slug)}];
        return;
      }
      story.byline={prefix:null,person:'syno'};
      story.rail=[];delete story.heroEntity;
      const key=[4,0,2,0,3,1,1,2,1][i],a=d.artists[key];
      story.body=[{t:'intro',open:leads[i]},
        {t:'section',name:i===1?'Thread, memory and connection':'A closer look',blocks:[{t:'p',text:i===1?d.eventDescription:leads[i]}]},
        {t:'fig',img:a.works[0].img,title:a.works[0].title,work:true},
        {t:'p',text:i===1?'Discover all six installations in Mira Soleni’s Artist Registry profile, or visit Echoes of Silence at Aster Project Space in Nicosia.':'Explore more contemporary work, artists and spaces through the SYNO Artist Registry and Art Map.'}];
      story.after=[{t:'more',slugs:stories.filter(x=>x!==story).slice(0,4).map(x=>x.slug)}];
    });
  }
  function applyEditorial(entities,rows) {
    const ids=['elena-andreou','iris-papadopoulou','rea-charalambidou','andreas-savva','constantinos-charalambous'];
    ids.forEach((key,i)=>{const a=d.artists[[0,1,4,2,5][i]];Object.assign(entities[key],{name:a.name,l1:a.bio,l2:a.practice,img:a.works[0].img,promoId:a.id});});
    rows.elena=[{name:d.artists[0].name,entity:'elena-andreou',bio:d.artists[0].bio,practice:d.artists[0].practice,works:d.profileWorks.slice(0,3)}];
  }
  function applyEventData(events) {
    const event=events['Echoes of Silence'];
    if(event) Object.assign(event,{artists:['Mira Soleni'],venue:'Aster Project Space',tickets:'',desc:d.eventDescription,photos:[image('shiota-journey-cover')],cover:image('shiota-journey-cover')});
  }
  function eventArtistCard(name,following) {
    const a=d.artists.find(a=>a.name===name);
    if(!a)return '';
    const works=a.works.slice(0,3);
    return `<article class="evp-artist" data-go="profile" data-name="${esc(name)}" data-promo-artist="${a.id}" role="link" tabindex="0"><div class="evp-artist-media"><img src="${esc(works[0].img)}"${imageAttrs(works[0].img)} alt="${esc(works[0].title)}"><button class="btn btn-sm evp-artist-follow${following?' is-following':''}" type="button" data-evp-follow="${esc(name)}">${following?'Following':'Follow'}</button></div>${works.length>1?`<div class="work-dots">${works.map((w,i)=>`<button type="button" class="work-dot${i?'':' is-on'}" data-promo-event-work="${i}" aria-label="Work ${i+1} of ${a.works.length} works" aria-pressed="${!i}"></button>`).join('')}</div>`:''}<div class="evp-artist-name">${esc(name)}</div><div class="evp-artist-meta">${esc(a.bio)}</div><div class="evp-artist-practice">${esc(a.practice)}</div></article>`;
  }
  document.addEventListener('click',e=>{
    const dot=e.target.closest('[data-promo-event-work]');
    if(!dot)return;
    e.preventDefault();e.stopImmediatePropagation();
    const card=dot.closest('.evp-artist'),a=d.artists.find(a=>a.id===card.dataset.promoArtist),w=a.works[+dot.dataset.promoEventWork];
    const img=$('.evp-artist-media img',card);
    img.src=w.img;img.alt=w.title;
    const size=d.imageSizes[w.img];if(size){img.width=size[0];img.height=size[1];}
    $$('.work-dot',card).forEach(b=>{const active=b===dot;b.classList.toggle('is-on',active);b.setAttribute('aria-pressed',String(active));});
  },true);
  function applyPlaces(places,extra,pins) {
    if(places)places.push({name:'Aster Project Space',type:'Project space',city:'Nicosia',address:'Old Town, Nicosia, Cyprus',latitude:35.1722,longitude:33.3641,photo:image('shiota-inside-outside')});
    if(extra)extra['Aster Project Space']={hours:'Tue–Sat 10:00–17:00 · Sun 10:00–13:00 · Closed Mondays',address:'Old Town, Nicosia, Cyprus',accessible:true,pin:'7'};
    if(pins)pins['Echoes of Silence']='3';
  }
  function prepareFooters() {
    const grid = $('#registry-grid');
    if (grid && !$('#screen-registry .promo-footer')) $('#screen-registry .page').insertAdjacentHTML('beforeend',d.footer.replace('band band-footer','band band-footer promo-footer'));
    const profile=$('#screen-profile');
    if(profile&&!$('.promo-profile-footer',profile))profile.insertAdjacentHTML('beforeend',d.footer.replace('band band-footer','band band-footer promo-footer promo-profile-footer'));
    for(const footer of $$('#screen-opencall .site-footer,#screen-eventpage .site-footer,#screen-eventpage .org-public-footer')) {
      footer.outerHTML = d.footer.replace('band band-footer','band band-footer promo-footer');
    }
    const call=$('#screen-opencall .oc-land');
    if(call&&!$('.promo-footer',call))call.insertAdjacentHTML('beforeend',d.footer.replace('band band-footer','band band-footer promo-footer'));
  }
  function applyMapData(events) {
    // Additional case records use the existing event card and marker components.
    const additions=[
      {pin:23,title:'Shared Rooms',who:'Nora Veli',start:'2026-10-16',end:'2026-11-08',venue:'Linea Project Room',type:'exhibition',theme:'memory',medium:'painting,mixed',artists:'nora-veli',image:'5',popular:true,opening:{date:'2026-10-16',time:'19:00'},about:'Paintings and mixed-media works exploring the rooms we share and the objects we leave behind.'},
      {pin:24,title:'Material Dialogues',who:'Theo Maveli',start:'2026-10-17',end:'2026-10-31',venue:'Aster Project Space',type:'exhibition',theme:'architecture',medium:'sculpture',artists:'theo-maveli',image:'8',popular:false,about:'A small exhibition of sculptures in stone and found materials, arranged as a conversation between weight, surface and space.'},
      {pin:25,title:'Inside the Studio — artist conversation',who:'Mira Soleni and Nora Veli',start:'2026-10-18',end:'2026-10-18',time:'14:00–16:00',venue:'Aster Studio',type:'talk',theme:'memory',medium:'installation,mixed',artists:'mira-soleni,nora-veli',image:'nomad-yellow-apartment',popular:true,about:'Mira Soleni and Nora Veli discuss their current work in an open studio conversation, with time for questions.'},
      {pin:26,title:'Night Studies',who:'Dani Orien',start:'2026-10-21',end:'2026-11-15',venue:'Side Room Gallery',type:'exhibition',theme:'memory',medium:'photography',artists:'dani-orien',image:'12',popular:false,about:'A photographic study of familiar rooms after dark, tracing the quiet details that remain when everyday activity stops.'},
      {pin:27,title:'Light Between Rooms',who:'Mira Soleni',start:'2026-10-22',end:'2026-11-12',venue:'Linea Project Room',type:'exhibition',theme:'architecture',medium:'installation',artists:'mira-soleni',image:'shiota-memories',popular:true,about:'An installation of thread and found objects connecting separate rooms through light, shadow and memory.'},
      {pin:28,title:'The Shape of Memory',who:'Nora Veli',start:'2026-10-24',end:'2026-11-21',venue:'Aster Project Space',type:'exhibition',theme:'memory',medium:'painting,mixed',artists:'nora-veli',image:'9',popular:false,about:'Paintings and mixed-media works considering how places change in recollection.'}
    ];
    for(const ev of additions){
      events[ev.pin]={...ev,city:'Nicosia',address:'Old Town, Nicosia, Cyprus',entry:'Free',accessible:true,gallery:[image(ev.image)],photos:1};
      const card=$('.list-card[data-pin="3"]').cloneNode(true);
      Object.assign(card.dataset,{pin:String(ev.pin),artists:ev.artists,free:'true',popular:String(ev.popular),type:ev.type,theme:ev.theme,medium:ev.medium});
      $('.card-title',card).textContent=ev.title;
      $('.card-type',card).textContent=ev.type==='talk'?'Talk':'Exhibition';
      $('.card-thumb',card).style.backgroundImage=`url('${image(ev.image)}')`;
      $('.list-panel').appendChild(card);
      const pin=$('.pin[data-pin="3"]').cloneNode(true);
      Object.assign(pin.dataset,card.dataset);
      $('.pin[data-pin="3"]').parentElement.appendChild(pin);
    }
    if(events[3])Object.assign(events[3],{who:'Mira Soleni',start:'2026-10-10',end:'2026-11-22',venue:'Aster Project Space',address:'Old Town, Nicosia, Cyprus',about:d.eventDescription,entry:'Free'});
    const c=$('.list-card[data-pin="3"]');
    if(c){$('.card-title',c).textContent='Echoes of Silence';$('.card-meta',c).textContent='Aster Project Space, Nicosia · 10 Oct – 22 Nov';c.dataset.free='true';}
    const dates={2:['2026-10-17','2026-10-18'],4:['2026-10-18','2026-10-18'],5:['2026-10-20','2026-10-20'],6:['2026-10-17','2026-11-06'],13:['2026-10-18','2026-10-27'],14:['2026-10-18','2026-10-18'],16:['2026-10-16','2026-10-16']};
    for(const [pin,[start,end]]of Object.entries(dates)){
      Object.assign(events[pin],{start,end,who:pin==='6'?'Nora Veli and Theo Maveli':pin==='13'?'Dani Orien':pin==='4'?'Iris Varen':pin==='16'?'Iris Varen and Leon Arven':events[pin].who});
      if(events[pin].opening)events[pin].opening.date=start;
    }
    for(const pin of [1,15,22])for(const node of $$(`.list-card[data-pin="${pin}"],.pin[data-pin="${pin}"]`))node.remove();
    const thumbs={3:'shiota-journey-cover',16:'vima-hall',2:'vima-installation',6:'shiota-silence',4:'11',5:'shiota-inside-outside',14:'watermill-centre',13:'shiota-silence'};
    for(const [pin,key]of Object.entries(thumbs)){const t=$(`.list-card[data-pin="${pin}"] .card-thumb`);if(t)t.style.backgroundImage=`url('${image(key)}')`;}
    const galleries={3:['shiota-journey-cover','shiota-journey','shiota-body','shiota-inside-outside'],16:['vima-hall','vima-installation'],2:['vima-installation','vima-hall'],6:['shiota-silence'],4:['11'],5:['shiota-inside-outside'],14:['watermill-centre'],13:['shiota-silence']};
    for(const [pin,keys]of Object.entries(galleries))Object.assign(events[pin],{gallery:keys.map(image),photos:keys.length});
    $$('.list-card:not([data-segment="events"])').forEach((c,i)=>{$('.card-thumb',c).style.backgroundImage=`url('${image(['vima-installation','shiota-inside-outside','watermill-centre','nomad-maison-jaune','nomad-yellow-apartment'][i%5])}')`;});
    const header=$('.filter-bar > .list-header'),panel=$('.list-panel');
    if(header&&panel)panel.prepend(header);
  }
  function applyMapArtists(artists) {
    const original=artists.slice(),map=Object.fromEntries(original.map((a,i)=>[a.id,d.artists[i%d.artists.length].id]));
    artists.splice(0,artists.length,...d.artists.map(a=>({id:a.id,name:a.name,bio:a.bio,practice:a.practice,meta:a.practice.split(' · ')[0]+' · '+a.city[0].toUpperCase()+a.city.slice(1),work:a.works[0].img,works:a.works.length})));
    const eventArtists={3:'mira-soleni',4:'iris-varen',5:'',6:'nora-veli,theo-maveli',13:'dani-orien',14:'',16:'iris-varen,leon-arven',23:'nora-veli',24:'theo-maveli',25:'mira-soleni,nora-veli',26:'dani-orien',27:'mira-soleni',28:'nora-veli'};
    for(const n of $$('[data-artists]'))n.dataset.artists=n.dataset.segment==='events' && Object.hasOwn(eventArtists,n.dataset.pin)
      ? eventArtists[n.dataset.pin] : n.dataset.artists.split(',').map(id=>map[id]||id).join(',');
  }
  function subscribe(btn) {
    const wrap=btn.closest('.subscribe-field'),field=$('input',wrap),value=field.value.trim();
    $$('.nl-error',wrap.parentElement).forEach(n=>n.remove());
    field.removeAttribute('aria-invalid');wrap.classList.remove('is-error');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)){
      field.setAttribute('aria-invalid','true');wrap.classList.add('is-error');
      wrap.insertAdjacentHTML('afterend',`<div class="nl-error" role="alert">${value?'Enter a valid email, e.g. name@example.com':'Enter your email address'}</div>`);field.focus();return;
    }
    wrap.classList.add('is-done');field.readOnly=true;
    btn.outerHTML='<span class="subscribe-mark"><span class="material-icons">check</span></span>';
    $('.nl-consent',wrap.parentElement).hidden=true;
    wrap.insertAdjacentHTML('afterend','<div class="nl-done" role="status">Thanks — check your inbox to confirm</div>');
  }
  document.addEventListener('click',e=>{const b=e.target.closest('.promo-footer [data-subscribe]');if(b){e.preventDefault();subscribe(b);}});
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.promo-footer .subscribe-field input')){e.preventDefault();const b=$('[data-subscribe]',e.target.parentElement);if(b)subscribe(b);}});
  prepareRegistry();prepareHome();prepareFooters();decorate(document);
  const brush = $('.band-media img');
  if (brush) brush.src = 'assets/promo/images/about-brush.png';
  const callCover=$('.oc-brush img');
  if(callCover)callCover.src='assets/promo/images/open-call-cover.png';
  const phase=$('#oc-phase-badge'),intro=$('.oc-title-right');
  if(phase&&intro)intro.appendChild(phase);
  const callTitle=$('#screen-opencall .oc-title');
  if(callTitle)callTitle.innerHTML='Annual Open Call for\u00a0Cypriot and\u00a0Cypriot<span class="promo-desktop-break"><br></span> diaspora artists';
  // Existing map thumbnails are CSS backgrounds. Keep their data source in the case too.
  for(const style of $$('style')) style.textContent=style.textContent.replace(/(?:\.\/)?photos\/[^\s'"()]+/g,src=>asset(src));
  const observer=new MutationObserver(records=>{
    for(const r of records){
      if(r.type==='childList')r.addedNodes.forEach(decorate);
      else if(r.type==='characterData')decorate(r.target);
      else if(r.type==='attributes')decorate(r.target);
    }
  });
  try {
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','href','data-href','data-site-href']});
  } catch {
    // Some embedded previews expose a DOM proxy that cannot be observed.
    document.addEventListener('DOMContentLoaded',()=>decorate(document));
    window.addEventListener('hashchange',()=>decorate(document));
    document.addEventListener('click',()=>setTimeout(()=>decorate(document),0));
  }
  window.SynoPromo={data:d,asset,caseLink,applyStories,applyEditorial,applyEventData,eventArtistCard,applyMapData,applyMapArtists,applyPlaces,applyProfile,applyWork,
    mapCoordinates:{23:{lat:35.1693,lng:33.3608,name:'Linea Project Room, Nicosia'},24:{lat:35.1733,lng:33.3654,name:'Aster Project Space, Nicosia'},25:{lat:35.1708,lng:33.3674,name:'Aster Studio, Nicosia'},26:{lat:35.1712,lng:33.3604,name:'Side Room Gallery, Nicosia'},27:{lat:35.1693,lng:33.3608,name:'Linea Project Room, Nicosia'},28:{lat:35.1733,lng:33.3654,name:'Aster Project Space, Nicosia'}}};
})();
