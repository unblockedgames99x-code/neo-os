(function () {
  'use strict';
  const C = window.NEO_DESKTOP_CONFIG, B = window.NEO_SYSTEM_BRIDGE;
  if (!C || !B) return;
  const workspaceKey = 'neo_desktop_workspace_v1';
  let workspace;
  try { workspace = JSON.parse(localStorage.getItem(workspaceKey)); } catch (_) {}
  if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) workspace = Object.assign({}, C.workspace);
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function spriteIcon(id, cls) { const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');svg.classList.add('icon');if(cls)cls.split(' ').forEach(name=>name&&svg.classList.add(name));svg.setAttribute('aria-hidden','true');svg.setAttribute('viewBox','0 0 24 24');use.setAttribute('href','#'+id);svg.append(use);return svg; }
  function notify(message) { if (window.NEO_SHELL) window.NEO_SHELL.notify(message); }
  function saveFiles() { try { localStorage.setItem(workspaceKey, JSON.stringify(workspace)); window.dispatchEvent(new Event('neo-workspace-change')); return true; } catch (_) { notify('Device storage is full. Export your changes before closing.'); return false; } }
  function button(text, action, parent) { const b = el('button', '', text); b.type = 'button'; b.onclick = action; if (parent) parent.append(b); return b; }
  function row(parent) { const n = el('div', 'desktop-row'); parent.append(n); return n; }
  function section(parent, title) { const n = el('section', 'desktop-section'); n.append(el('h2', '', title)); parent.append(n); return n; }
  function select(parent, label, values, value, change) { const l = el('label', '', label), n = el('select'); values.forEach(v => { const o = el('option', '', v); o.value = v; n.append(o); }); n.value = value; n.onchange = () => change(n.value); l.append(n); parent.append(l); return n; }
  function updateSliderFill(input) { const min = Number(input.min) || 0, max = Number(input.max) || 100, value = Number(input.value); const progress = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0; input.style.setProperty('--neo-range-progress', progress + '%'); }
  function slider(parent, label, min, max, value, change) { const l = el('label', '', label + ' '), o = el('output', '', value), n = el('input'); n.type = 'range'; n.min = min; n.max = max; n.value = value; n.setAttribute('aria-label', label); n.oninput = () => { o.value = n.value; updateSliderFill(n); change(+n.value); }; updateSliderFill(n); l.append(o,n); parent.append(l); return n; }
  function animationSpeedControl(parent) {
    const shell=window.NEO_SHELL,speeds=[50,75,100,150,200],labels=['Slow','Relaxed','Default','Fast','Very Fast'],setting=el('div','animation-speed-setting'),heading=el('div','animation-speed-heading'),copy=el('span','animation-speed-copy'),scale=el('div','animation-speed-scale'),track=el('span','animation-speed-track'),output=el('output','animation-speed-value'),input=el('input');
    copy.append(el('strong','', 'Animation Speed'),el('small','', 'How fast windows animate'));
    heading.append(copy);
    const current=Number(shell.getSetting('animationSpeed'))||100,currentIndex=speeds.reduce((best,value,index)=>Math.abs(value-current)<Math.abs(speeds[best]-current)?index:best,0);
    input.type='range';input.min='0';input.max=String(speeds.length-1);input.step='1';input.value=String(currentIndex);input.setAttribute('aria-label','Animation Speed');
    function sync(){const index=Number(input.value),label=labels[index]||'Default',progress=(index/(speeds.length-1))*100;output.textContent=label;output.style.setProperty('--neo-range-progress',progress+'%');input.setAttribute('aria-valuetext',label);updateSliderFill(input);}
    input.oninput=()=>{sync();shell.setSetting('animationSpeed',speeds[Number(input.value)]||100);};
    sync();track.append(output,input);scale.append(el('span','animation-speed-endpoint','Slow'),track,el('span','animation-speed-endpoint','Very Fast'));setting.append(heading,scale);parent.append(setting);return input;
  }
  function browserSettings(parent) {
    const shell=window.NEO_SHELL,panel=section(parent,'Browser');
    panel.classList.add('browser-settings-section');
    panel.append(el('p','desktop-note','Choose the search service used when text in the Browser address bar is not a web address. DuckDuckGo uses its current full search page.'));
    const field=el('label','browser-search-engine-field'),copy=el('span','browser-search-engine-copy'),engine=el('select');
    copy.append(el('strong','','Search engine'),el('small','','Used for Browser address-bar searches'));
    [
      ['google','Google'],
      ['bing','Bing'],
      ['duckduckgo','DuckDuckGo'],
      ['brave','Brave'],
      ['searxng','SearXNG']
    ].forEach(option=>{const item=el('option','',option[1]);item.value=option[0];engine.append(item);});
    engine.value=shell.getSetting('browserSearchEngine')||'duckduckgo';
    engine.setAttribute('aria-label','Browser search engine');
    engine.onchange=()=>{
      shell.setSetting('browserSearchEngine',engine.value);
      const detail={type:'neo:browser-settings-change',searchEngine:engine.value};
      window.dispatchEvent(new CustomEvent('neo-browser-settings-change',{detail}));
      document.querySelectorAll('iframe').forEach(frame=>{try{frame.contentWindow.postMessage(detail,'*');}catch(_){}});
    };
    field.append(copy,engine);panel.append(field);
  }
  function devtoolsSettings(parent) {
    const shell=window.NEO_SHELL,panel=section(parent,'DevTools');
    panel.classList.add('devtools-settings-section');
    panel.append(el('p','desktop-note','Inspect Browser pages, view console output, sources, network activity, and local storage.'));

    const toggle=el('label','toggle-row devtools-enable-row'),copy=el('span'),enabled=el('input'),switchControl=el('span','switch');
    copy.append(el('strong','','Enable DevTools'),el('small','','Show the inspector button in Browser and enable F12 / Ctrl + Shift + I'));
    enabled.type='checkbox';enabled.checked=shell.getSetting('devtoolsEnabled')!==false;enabled.dataset.devtoolsEnabled='';
    switchControl.setAttribute('aria-hidden','true');toggle.append(copy,enabled,switchControl);panel.append(toggle);

    const positionLabel=el('label','devtools-position-field'),positionCopy=el('span','devtools-position-copy'),position=el('select');
    positionCopy.append(el('strong','','Position'),el('small','','Choose where the panel docks'));
    [['right','Right'],['left','Left'],['bottom','Bottom'],['top','Top']].forEach(option=>{const item=el('option','',option[1]);item.value=option[0];position.append(item);});
    position.value=shell.getSetting('devtoolsPosition')||'right';position.setAttribute('aria-label','DevTools position');
    positionLabel.append(positionCopy,position);panel.append(positionLabel);

    function notifyBrowser(){
      const detail={type:'neo:devtools-settings-change',enabled:enabled.checked,position:position.value};
      window.dispatchEvent(new CustomEvent('neo-devtools-settings-change',{detail}));
      document.querySelectorAll('iframe').forEach(frame=>{try{frame.contentWindow.postMessage(detail,'*');}catch(_){}});
    }
    enabled.onchange=()=>{shell.setSetting('devtoolsEnabled',enabled.checked);position.disabled=!enabled.checked;notifyBrowser();};
    position.onchange=()=>{shell.setSetting('devtoolsPosition',position.value);notifyBrowser();};
    position.disabled=!enabled.checked;
  }
  function check(parent, label, value, change) { const l = el('label'), n = el('input'); n.type = 'checkbox'; n.checked = value; n.onchange = () => change(n.checked); l.append(n, document.createTextNode(' ' + label)); parent.append(l); return n; }
  function download(name, text) { const a = el('a'); const url = URL.createObjectURL(new Blob([text], {type:'text/plain'})); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function cleanName(name) { return String(name || '').trim().replace(/\\/g,'/').replace(/^\/+/, '').replace(/[^a-zA-Z0-9_ .\-/]/g,'').split('/').filter(s => s && s !== '.' && s !== '..').join('/').slice(0,160); }
  function modal(title) { const d = el('dialog','desktop-palette desktop-app'); d.append(el('h2','',title)); document.body.append(d); d.addEventListener('close',()=>d.remove()); d.showModal(); return d; }
  function ask(title, label, value, accept) { const d = modal(title), form = el('form'), input = el('input'); input.value = value || ''; input.required = true; input.setAttribute('aria-label',label); form.append(el('label','',label),input); button('Cancel',()=>d.close(),form); const submit = button('Create',null,form); submit.type = 'submit'; form.onsubmit = e => { e.preventDefault(); if (accept(input.value) !== false) d.close(); }; d.append(form); input.focus(); }
  window.NEO_EXTRA_APPS = Object.assign(window.NEO_EXTRA_APPS || {}, {
    vscode: {id:'vscode',title:'Code workspace',name:'Code workspace',subtitle:'Local editor · VS Code-inspired',icon:'code',core:true,launcher:true,category:'Productivity',width:1040,height:650},
    skins: {id:'skins',title:'Widgets',name:'Widgets',subtitle:'Add and customize desktop widgets',icon:'widgets',core:true,launcher:true,category:'System',width:850,height:620}
  });

  function tabAppearanceEditor(parent) {
    const shell=window.NEO_SHELL, panel=section(parent,'Tab appearance');
    panel.classList.add('tab-appearance-section');
    const help=el('p','desktop-note','Change the name and icon shown in the Chromebook browser tab. Presets and custom icons stay on this device.');
    const grid=el('div','tab-appearance-grid');
    const status=el('p','tab-appearance-status');
    panel.append(help,grid,status);
    const presets=shell.getTabAppearancePresets();
    const buttons=new Map();

    function previewIcon(preset) {
      if(preset.id==='custom') return shell.getSetting('customTabIcon')||preset.icon;
      return preset.icon;
    }

    function sync() {
      if(!panel.isConnected){window.removeEventListener('neo-tab-appearance-change',sync);return;}
      const selected=shell.getSetting('tabAppearance')||'neo';
      presets.forEach(preset=>{
        const choice=buttons.get(preset.id);if(!choice)return;
        const active=selected===preset.id;
        choice.classList.toggle('is-selected',active);
        choice.setAttribute('aria-pressed',String(active));
        const image=choice.querySelector('img');if(image)image.src=previewIcon(preset);
      });
      const active=presets.find(preset=>preset.id===selected)||presets[0];
      status.textContent='Current tab: '+(active.id==='custom'?(shell.getSetting('customTabTitle')||'My tab'):active.title);
    }

    function openCustomEditor() {
      const d=modal('Custom Tab'), form=el('form','tab-appearance-form');d.classList.add('tab-appearance-dialog');
      const customFields=el('div','tab-appearance-custom-fields');
      const nameLabel=el('label','tab-appearance-field');nameLabel.append(el('span','','Tab name'));
      const name=el('input');name.type='text';name.maxLength=80;name.required=true;name.placeholder='Tab Name';name.value=shell.getSetting('customTabTitle')||'My tab';name.setAttribute('aria-label','Custom tab name');nameLabel.append(name);
      const storedIcon=shell.getSetting('customTabIcon')||'';
      let iconData=/^data:image\//i.test(storedIcon)?storedIcon:'';
      const urlLabel=el('label','tab-appearance-field');urlLabel.append(el('span','','Icon URL'));
      const iconUrl=el('input');iconUrl.type='url';iconUrl.maxLength=2048;iconUrl.placeholder='Icon URL';iconUrl.value=/^https?:\/\//i.test(storedIcon)?storedIcon:'';iconUrl.autocomplete='off';iconUrl.spellcheck=false;iconUrl.setAttribute('aria-label','Custom tab icon URL');urlLabel.append(iconUrl);
      customFields.append(nameLabel,urlLabel);form.append(customFields);
      const iconField=el('div','tab-appearance-field');iconField.append(el('span','','Tab icon'));
      const iconRow=el('div','tab-appearance-icon-row'), preview=el('img','tab-appearance-custom-preview');preview.alt='';
      const setPreview=source=>{preview.onerror=()=>{preview.onerror=null;preview.src='./assets/tab-appearance/custom.svg';};preview.src=source||'./assets/tab-appearance/custom.svg';};setPreview(storedIcon);
      iconUrl.onchange=()=>setPreview(iconUrl.value.trim());
      const picker=el('input');picker.type='file';picker.accept='.png,.jpg,.jpeg,.webp,.gif,.ico,image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon';picker.setAttribute('aria-label','Choose a custom tab icon');
      picker.onchange=()=>{const file=picker.files&&picker.files[0];if(!file)return;if(file.size>500*1024){notify('Choose an icon under 500 KB.');picker.value='';return;}const reader=new FileReader();reader.onload=()=>{iconData=String(reader.result||'');iconUrl.value='';setPreview(iconData);};reader.onerror=()=>notify('That icon could not be read.');reader.readAsDataURL(file);};
      const clear=button('Use default icon',()=>{iconData='';iconUrl.value='';picker.value='';setPreview('');});clear.classList.add('tab-appearance-clear');
      iconRow.append(preview,picker,clear);iconField.append(iconRow);
      form.append(iconField);
      const actions=el('div','tab-appearance-actions');button('Cancel',()=>d.close(),actions);const save=button('Save custom tab',null,actions);save.type='submit';actions.append(save);form.append(actions);
      form.onsubmit=event=>{event.preventDefault();if(shell.setCustomTabAppearance(name.value,iconUrl.value.trim()||iconData))d.close();};
      d.append(form);d.addEventListener('close',sync,{once:true});name.focus();
    }

    presets.forEach(preset=>{
      const choice=button('',preset.id==='custom'?openCustomEditor:()=>shell.setSetting('tabAppearance',preset.id),grid);
      choice.classList.add('tab-appearance-choice');choice.dataset.tabAppearanceChoice=preset.id;choice.setAttribute('aria-label','Use '+preset.label+' tab appearance');
      const visual=el('span','tab-appearance-icon');
      const image=el('img');image.alt='';image.setAttribute('aria-hidden','true');image.src=previewIcon(preset);visual.append(image);
      choice.append(visual,el('span','tab-appearance-label',preset.label));buttons.set(preset.id,choice);
    });
    window.addEventListener('neo-tab-appearance-change',sync);sync();
  }

  function interfaceStyleEditor(parent) {
    const shell=window.NEO_SHELL, panel=section(parent,'Styles');
    panel.classList.add('interface-style-section');
    panel.append(el('p','desktop-note','Styles change the complete NEO OS interface. Themes remain separate and continue to control the colors inside either style.'));
    const grid=el('div','interface-style-grid');panel.append(grid);
    const choices=new Map();
    const styles=[
      {id:'modern',label:'Modern',description:'The current NEO OS look'},
      {id:'retro',label:'Retro',description:'Compact classic desktop controls'},
      {id:'windows11',label:'Windows 11',description:'Centered taskbar and Fluent acrylic'},
      {id:'kali',label:'Kali Linux',description:'Dark security workstation interface'}
    ];
    styles.forEach(style=>{
      const choice=button('',()=>shell.setSetting('interfaceStyle',style.id),grid);
      choice.classList.add('interface-style-choice');
      choice.dataset.interfaceStyleOption=style.id;
      choice.setAttribute('aria-label','Use '+style.label+' interface style');
      const preview=el('span','interface-style-preview is-'+style.id);
      preview.setAttribute('aria-hidden','true');
      preview.append(el('i','interface-preview-title'),el('i','interface-preview-pane'),el('i','interface-preview-sidebar'),el('i','interface-preview-taskbar'));
      const copy=el('span','interface-style-copy');
      copy.append(el('strong','',style.label),el('small','',style.description));
      choice.append(preview,copy);
      choices.set(style.id,choice);
    });
    function sync(){
      if(!panel.isConnected){window.removeEventListener('neo-interface-style-change',sync);return;}
      const selected=shell.getSetting('interfaceStyle')||'modern';
      choices.forEach((choice,id)=>{
        const active=id===selected;
        choice.classList.toggle('is-selected',active);
        choice.setAttribute('aria-pressed',String(active));
      });
    }
    window.addEventListener('neo-interface-style-change',sync);sync();
  }

  function rainmeterSettings(parent) {
    const panel=section(parent,'Rainmeter');
    panel.classList.add('rainmeter-settings-section');
    panel.append(el('p','desktop-note','Show or hide the desktop clock. Customize opens the skin, color, size, shadow and position controls.'));
    const controls=row(panel);controls.classList.add('rainmeter-settings-controls');
    const api=()=>window.NEO_RAINMETER;
    const getEnabled=()=>api()?.getState().enabled!==false;
    const enabled=check(controls,'Show desktop Rainmeter',getEnabled(),value=>api()?.setEnabled(value));
    enabled.setAttribute('aria-label','Show desktop Rainmeter');
    button('Customize Rainmeter',()=>api()?.open(),controls);
    function sync(event){
      if(!panel.isConnected){window.removeEventListener('neo-rainmeter-change',sync);return;}
      enabled.checked=event?.detail?.enabled!==undefined?event.detail.enabled:getEnabled();
    }
    window.addEventListener('neo-rainmeter-change',sync);sync();
  }

  function cursorThemeEditor(parent) {
    const shell=window.NEO_SHELL,panel=section(parent,'Cursor');
    panel.classList.add('cursor-theme-section');
    panel.append(el('p','desktop-note','Choose a pointer style for the NEO desktop and local apps. Text selection and window resizing keep their familiar cursor shapes.'));
    const grid=el('div','desktop-grid cursor-theme-grid');
    panel.append(grid);
    const themes=[
      {id:'system',label:'System',description:'Browser default'},
      {id:'neo',label:'NEO',description:'Cyan glass',asset:'neo-arrow.svg'},
      {id:'neon',label:'Neon',description:'Pink glow',asset:'neon-arrow.svg'},
      {id:'pixel',label:'Pixel',description:'Retro block',asset:'pixel-arrow.svg'},
      {id:'contrast',label:'Contrast',description:'Large and bright',asset:'contrast-arrow.svg'},
      {id:'custom',label:'Imported',description:'Choose a local cursor'}
    ];
    const choices=new Map();
    themes.forEach(theme=>{
      const choice=button('',()=>{
        if(theme.id==='custom'&&!shell.getSetting('customCursorData')){picker.click();return;}
        shell.setSetting('cursorTheme',theme.id);
      },grid);
      choice.classList.add('cursor-theme-choice');
      choice.dataset.cursorThemeChoice=theme.id;
      choice.setAttribute('aria-label','Use '+theme.label+' cursor');
      const preview=el('span','cursor-theme-preview is-'+theme.id);
      preview.setAttribute('aria-hidden','true');
      if(theme.asset){const image=el('img');image.alt='';image.src='./assets/cursors/'+theme.asset;preview.append(image);}
      else if(theme.id==='custom'){
        const image=el('img','cursor-custom-image');image.alt='';image.hidden=true;
        preview.append(image,el('span','cursor-custom-placeholder','+'));
      }
      else preview.append(el('span','cursor-system-glyph','↖'));
      const copy=el('span','cursor-theme-copy');
      copy.append(el('strong','',theme.label),el('small','',theme.description));
      choice.append(preview,copy);
      choices.set(theme.id,choice);
    });

    const actions=el('div','cursor-import-actions');
    const importButton=button('Import cursor',()=>picker.click(),actions);
    importButton.classList.add('button','primary');
    const removeButton=button('Remove imported',()=>shell.clearCustomCursor(),actions);
    removeButton.classList.add('button','cursor-import-remove');
    const status=el('p','cursor-import-status');
    const picker=el('input');
    picker.type='file';
    picker.accept='.png,.cur,.ico,image/png,image/x-icon,image/vnd.microsoft.icon';
    picker.hidden=true;
    picker.setAttribute('aria-label','Import a custom cursor');
    actions.append(status,picker);
    panel.append(actions);

    function cursorMetadata(file,bytes){
      const extension=(file.name.split('.').pop()||'').toLowerCase();
      if(extension==='png'){
        const signature=[137,80,78,71,13,10,26,10];
        if(bytes.length<24||!signature.every((value,index)=>bytes[index]===value))throw new Error('That PNG file is not valid.');
        const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
        return {width:view.getUint32(16),height:view.getUint32(20),mime:'image/png'};
      }
      if(extension==='cur'||extension==='ico'){
        if(bytes.length<22||bytes[0]!==0||bytes[1]!==0||bytes[3]!==0||(bytes[2]!==1&&bytes[2]!==2)||bytes[4]===0&&bytes[5]===0)throw new Error('That cursor file is not valid.');
        return {width:bytes[6]||256,height:bytes[7]||256,mime:'image/x-icon'};
      }
      throw new Error('Choose a PNG, CUR, or ICO file.');
    }

    function readAsDataUrl(file,mime){
      return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result||'').replace(/^data:[^;,]+/,'data:'+mime));
        reader.onerror=()=>reject(new Error('That cursor could not be read.'));
        reader.readAsDataURL(file);
      });
    }

    picker.onchange=async()=>{
      const file=picker.files&&picker.files[0];
      picker.value='';
      if(!file)return;
      if(file.size>2*1024*1024){shell.notify('Cursor not imported','Choose a file no larger than 2 MB.','info');return;}
      try{
        status.textContent='Checking '+file.name+'…';
        const bytes=new Uint8Array(await file.arrayBuffer());
        const meta=cursorMetadata(file,bytes);
        if(!meta.width||!meta.height||meta.width>128||meta.height>128)throw new Error('Cursor images must be 128 × 128 pixels or smaller.');
        const data=await readAsDataUrl(file,meta.mime);
        if(!shell.setCustomCursor(data,file.name))throw new Error('That cursor could not be saved.');
      }catch(error){
        shell.notify('Cursor not imported',error&&error.message?error.message:'Choose a valid cursor file.','info');
        sync();
      }
    };

    function sync(){
      if(!panel.isConnected){window.removeEventListener('neo-cursor-theme-change',sync);return;}
      const selected=shell.getSetting('cursorTheme')||'system';
      choices.forEach((choice,id)=>{
        const active=id===selected;
        choice.classList.toggle('is-selected',active);
        choice.setAttribute('aria-pressed',String(active));
      });
      const data=shell.getSetting('customCursorData')||'';
      const name=shell.getSetting('customCursorName')||'Imported cursor';
      const customChoice=choices.get('custom');
      const customImage=customChoice.querySelector('.cursor-custom-image');
      const placeholder=customChoice.querySelector('.cursor-custom-placeholder');
      const customDescription=customChoice.querySelector('.cursor-theme-copy small');
      customImage.hidden=!data;
      placeholder.hidden=Boolean(data);
      if(data&&customImage.src!==data)customImage.src=data;
      customDescription.textContent=data?name:'Choose a local cursor';
      customChoice.setAttribute('aria-label',data?'Use imported cursor '+name:'Import a custom cursor');
      importButton.textContent=data?'Replace cursor':'Import cursor';
      removeButton.hidden=!data;
      status.textContent=data?name+' · Hover the preview to test it':'PNG, CUR, or ICO · 256 KB max · 128 × 128 px max';
    }
    window.addEventListener('neo-cursor-theme-change',sync);sync();
  }

  function personalizationControls(app,options) {
    options=options||{};
    interfaceStyleEditor(app);
    rainmeterSettings(app);
    const p = B.get(), themes = section(app,'Theme'), grid = el('div','desktop-grid theme-grid'); themes.append(grid);
    Object.keys(C.themes).forEach(name => { const colors=C.themes[name],label=C.themeLabels?.[name]||name,b=button('',()=>B.set({theme:name}),grid),palette=el('span','theme-palette-preview'),accents=el('span','theme-accent-preview'); b.classList.add('theme-choice'); b.dataset.themeChoice=name; b.setAttribute('aria-label','Use '+label+' theme'); b.setAttribute('aria-pressed',String(name===p.theme)); b.style.setProperty('--theme-preview-bg',colors[0]); b.style.setProperty('--theme-preview-surface',colors[1]); b.style.setProperty('--theme-preview-text',colors[2]); b.style.setProperty('--theme-preview-line',colors[4]); b.style.setProperty('--theme-preview-accent',colors[5]); [colors[0],colors[1],colors[4]].forEach(color=>{const swatch=el('i');swatch.style.background=color;palette.append(swatch);}); [colors[5],colors[3],colors[2]].forEach(color=>{const swatch=el('i');swatch.style.background=color;accents.append(swatch);}); b.append(el('span','theme-choice-label',label),palette,accents); });
    cursorThemeEditor(app);
    tabAppearanceEditor(app);
    browserSettings(app);
    devtoolsSettings(app);
    const sound = section(app,'Sound and display');
    const volume = slider(sound,'Master volume',0,100,p.volume,value=>B.set({volume:value}));
    const mute = check(sound,'Mute all local apps',p.muted,value=>B.set({muted:value}));
    const bright = slider(sound,'Interface brightness',45,100,p.brightness,value=>B.set({brightness:value}));
    sound.append(el('p','desktop-note','Brightness dims this interface, not the Chromebook display. Master sound applies to local HTML audio and cooperative Web Audio apps.'));
    const motion = check(sound,'Reduce motion',p.reducedMotion,value=>{ B.set({reducedMotion:value}); window.NEO_SHELL.setSetting('reducedMotion',value); });
    const animation = section(app,'Motion');
    animationSpeedControl(animation);
    if(!options.integrated){
      const dock = section(app,'Taskbar and desktop');
      select(dock,'Taskbar placement', ['left','right','top','bottom'],window.NEO_SHELL.getSetting('taskbarPosition') || 'left',value=>window.NEO_SHELL.setSetting('taskbarPosition',value));
      button('Open all system settings',()=>window.NEO_SHELL.openApp('control'),dock);
    }
    function sync() { if (!app.isConnected) { window.removeEventListener('neo-system-state',sync); return; } const s=B.get(); volume.value=s.volume; volume.previousSibling.value=s.volume; bright.value=s.brightness; bright.previousSibling.value=s.brightness; updateSliderFill(volume); updateSliderFill(bright); mute.checked=s.muted; motion.checked=s.reducedMotion; app.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===s.theme))); }
    window.addEventListener('neo-system-state',sync);
  }

  function settingsSearch(control) {
    if(!control||control.querySelector('[data-settings-search]'))return;
    const search=el('div','control-settings-search');
    search.dataset.settingsSearch='';
    search.setAttribute('role','search');
    search.append(spriteIcon('i-search','control-settings-search-icon'));
    const input=el('input');
    input.type='search';input.autocomplete='off';input.spellcheck=false;input.placeholder='Search settings';
    input.setAttribute('aria-label','Search settings');
    const clear=button('',()=>{input.value='';apply();input.focus({preventScroll:true});});
    clear.classList.add('control-settings-search-clear');clear.setAttribute('aria-label','Clear settings search');clear.hidden=true;
    clear.append(spriteIcon('i-close'));
    const status=el('span','sr-only');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    search.append(input,clear,status);
    const empty=el('div','settings-search-empty');empty.hidden=true;
    empty.append(spriteIcon('i-search'),el('strong','','No settings found'),el('p','','Try a different word or phrase.'));
    const heading=control.querySelector(':scope > .native-app-heading');
    heading.insertAdjacentElement('afterend',search);search.insertAdjacentElement('afterend',empty);

    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
    const searchableText=item=>normalize([
      item.textContent,
      ...Array.from(item.querySelectorAll('[aria-label],[title]')).flatMap(node=>[node.getAttribute('aria-label'),node.getAttribute('title')])
    ].filter(Boolean).join(' '));
    function apply(){
      const sections=Array.from(control.querySelectorAll(':scope > .settings-section'));
      const items=sections.flatMap(panel=>Array.from(panel.children));
      const query=normalize(input.value),searching=Boolean(query);let matches=0;
      control.classList.toggle('is-settings-searching',searching);clear.hidden=!searching;
      items.forEach(item=>{
        const match=!searching||searchableText(item).includes(query);
        item.classList.toggle('is-settings-search-hidden',!match);
        item.classList.toggle('is-settings-search-match',searching&&match);
        if(searching&&match)matches+=1;
      });
      sections.forEach(panel=>panel.classList.toggle('is-settings-search-hidden',searching&&!Array.from(panel.children).some(item=>!item.classList.contains('is-settings-search-hidden'))));
      empty.hidden=!searching||matches>0;
      status.textContent=searching?(matches?matches+' matching '+(matches===1?'section':'sections'):'No matching settings'):'';
    }
    input.addEventListener('input',apply);input.addEventListener('search',apply);
    input.addEventListener('keydown',event=>{if(event.key==='Escape'&&input.value){event.preventDefault();input.value='';apply();}});
    control.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='f'){event.preventDefault();input.focus({preventScroll:true});input.select();}});
  }

  function skinGallery(body) {
    const shell=window.NEO_SHELL;
    const widgetInfo={
      clock:{label:'Clock',description:'Time and date at a glance',category:'Essentials',icon:'i-monitor',accent:'#72d8ff'},
      calendar:{label:'Calendar',description:'Today and the current month',category:'Essentials',icon:'i-list',accent:'#fb923c'},
      notes:{label:'Notes',description:'A quick desktop notepad',category:'Essentials',icon:'i-file',accent:'#facc15'},
      weather:{label:'Weather',description:'Saved local conditions',category:'Essentials',icon:'i-sparkles',accent:'#60a5fa'},
      system:{label:'System',description:'NEO workspace status',category:'System',icon:'i-info',accent:'#a78bfa'},
      cpu:{label:'CPU',description:'Processor details',category:'System',icon:'i-monitor',accent:'#22d3ee'},
      ram:{label:'Memory',description:'Browser memory snapshot',category:'System',icon:'i-grid',accent:'#38bdf8'},
      storage:{label:'Storage',description:'Local storage usage',category:'System',icon:'i-folder',accent:'#fbbf24'},
      network:{label:'Network',description:'Connection status',category:'System',icon:'i-wifi',accent:'#34d399'},
      battery:{label:'Battery',description:'Charge and power state',category:'System',icon:'i-battery',accent:'#4ade80'},
      music:{label:'Now Playing',description:'Local music controls',category:'Media',icon:'i-music',accent:'#fb7185'},
      equalizer:{label:'Equalizer',description:'Animated playback visual',category:'Media',icon:'i-volume',accent:'#ec4899'},
      quote:{label:'Quote',description:'A small daily thought',category:'Tools',icon:'i-chat',accent:'#c084fc'},
      launcher:{label:'Launcher',description:'Shortcuts to favorite apps',category:'Tools',icon:'i-apps',accent:'#818cf8'}
    };
    const catalog=C.skinTypes.map(type=>Object.assign({type},widgetInfo[type]||{label:type,description:'Desktop widget',category:'Tools',icon:'i-apps',accent:'#72d8ff'}));
    const app=el('div','desktop-app widget-manager');body.append(app);
    const heading=el('header','widget-manager-heading'),headingCopy=el('div','widget-manager-heading-copy'),headingIcon=el('span','widget-manager-heading-icon');
    headingIcon.append(spriteIcon('i-grid'));
    headingCopy.append(el('h1','','Widgets'),el('p','','Add what you need, then drag widgets from any empty area and resize them from the edges.'));
    const total=el('span','widget-manager-total');heading.append(headingIcon,headingCopy,total);app.append(heading);

    const builtinWidgets=[
      {setting:'desktopSystemWidget',label:'System status',description:'Workspace readiness at a glance',icon:'i-info',accent:'#a78bfa'},
      {setting:'desktopActiveAppWidget',label:'Active app',description:'The app currently in focus',icon:'i-monitor',accent:'#34d399'},
      {setting:'desktopNowPlayingWidget',label:'Now playing',description:'Song details and playback controls',icon:'i-music',accent:'#fb7185'}
    ];
    const builtin=el('section','widget-builtin-section'),builtinHead=el('div','widget-section-heading'),builtinCopy=el('div');
    builtinCopy.append(el('h2','','Desktop status cards'),el('p','','Optional cards for the desktop. All are off by default.'));
    builtinHead.append(builtinCopy);builtin.append(builtinHead);
    const builtinGrid=el('div','widget-builtin-grid');builtin.append(builtinGrid);app.append(builtin);
    builtinWidgets.forEach(item=>{
      const card=el('article','widget-installed-card widget-builtin-card');card.style.setProperty('--widget-accent',item.accent);
      const visual=el('span','widget-installed-icon');visual.append(spriteIcon(item.icon));
      const copy=el('div','widget-installed-copy');copy.append(el('strong','',item.label),el('small','',item.description));
      const actions=el('div','widget-installed-actions'),toggle=button('',()=>{
        const enabled=!Boolean(shell.getSetting(item.setting));
        if(enabled&&!shell.getSetting('widgets'))shell.setSetting('widgets',true);
        shell.setSetting(item.setting,enabled);
      },actions);
      toggle.classList.add('widget-action-button','is-primary');toggle.dataset.statusWidgetSetting=item.setting;toggle.setAttribute('role','switch');
      toggle.append(spriteIcon('i-eye'),el('span','','Off'));
      card.append(visual,copy,actions);builtinGrid.append(card);
    });

    function syncBuiltinWidgets(){
      builtinGrid.querySelectorAll('[data-status-widget-setting]').forEach(toggle=>{
        const enabled=Boolean(shell.getSetting(toggle.dataset.statusWidgetSetting));
        toggle.setAttribute('aria-checked',String(enabled));
        toggle.classList.toggle('is-enabled',enabled);
        const label=toggle.querySelector('span');if(label)label.textContent=enabled?'On':'Off';
      });
    }

    const library=el('section','widget-library-section'),libraryHead=el('div','widget-section-heading'),libraryCopy=el('div');
    libraryCopy.append(el('h2','','Widget library'),el('p','','Choose a widget to add to your desktop.'));
    const styleField=el('label','widget-style-field'),styleLabel=el('span','','New widget style'),styleSelect=el('select');
    C.skinStyles.forEach(value=>{const option=el('option','',value.replace(/(^|-)([a-z])/g,(_,dash,letter)=>(dash?' ':'')+letter.toUpperCase()));option.value=value;styleSelect.append(option);});
    let style='minimalist',category='All';styleSelect.value=style;styleSelect.onchange=()=>style=styleSelect.value;styleField.append(styleLabel,styleSelect);libraryHead.append(libraryCopy,styleField);library.append(libraryHead);
    const filters=el('div','widget-category-filter');filters.setAttribute('role','group');filters.setAttribute('aria-label','Filter widget library');library.append(filters);
    const grid=el('div','widget-library-grid');library.append(grid);app.append(library);

    const installed=el('section','widget-installed-section'),installedHead=el('div','widget-section-heading'),installedCopy=el('div'),installedCount=el('span','widget-installed-count');
    installedCopy.append(el('h2','','On your desktop'),el('p','','Show, hide, or customize the widgets you have added.'));
    installedHead.append(installedCopy,installedCount);installed.append(installedHead);
    const list=el('div','widget-installed-list');installed.append(list);app.append(installed);

    function addWidget(item){window.NEO_SKINS.add(item.type,style);refresh();notify(item.label+' widget added');}
    function renderFilters(){filters.replaceChildren();['All','Essentials','System','Media','Tools'].forEach(name=>{const choice=button(name,()=>{category=name;renderFilters();renderLibrary();},filters);choice.classList.add('widget-category-button');choice.setAttribute('aria-pressed',String(category===name));});}
    function renderLibrary(){grid.replaceChildren();catalog.filter(item=>category==='All'||item.category===category).forEach(item=>{const card=button('',()=>addWidget(item),grid);card.classList.add('widget-library-card');card.dataset.widgetType=item.type;card.style.setProperty('--widget-accent',item.accent);const visual=el('span','widget-library-icon');visual.append(spriteIcon(item.icon));const copy=el('span','widget-library-copy');copy.append(el('strong','',item.label),el('small','',item.description));const add=el('span','widget-library-add');add.append(spriteIcon('i-plus'));card.append(visual,copy,add);card.setAttribute('aria-label','Add '+item.label+' widget');});}
    function refresh(){
      const widgets=window.NEO_SKINS.list();total.textContent=widgets.length+' added';installedCount.textContent=widgets.length+' widget'+(widgets.length===1?'':'s');list.replaceChildren();
      if(!widgets.length){const empty=el('div','widget-empty-state'),visual=el('span','widget-empty-icon');visual.append(spriteIcon('i-grid'));empty.append(visual,el('h3','','Your desktop is ready'),el('p','','Add a widget from the library above. The built-in desktop clock stays available.'));const first=button('Add a clock',()=>addWidget(catalog.find(item=>item.type==='clock')),empty);first.classList.add('widget-empty-action');list.append(empty);return;}
      widgets.forEach(widget=>{const item=widgetInfo[widget.type]||{label:widget.type,icon:'i-apps',accent:'#72d8ff'},card=el('article','widget-installed-card');card.style.setProperty('--widget-accent',item.accent);const visual=el('span','widget-installed-icon');visual.append(spriteIcon(item.icon));const copy=el('div','widget-installed-copy');copy.append(el('strong','',item.label),el('small','',(widget.hidden?'Hidden':'On desktop')+' · '+widget.style.replace(/-/g,' ')));const actions=el('div','widget-installed-actions');const visibility=button('',()=>{window.NEO_SKINS.show(widget.id,widget.hidden);refresh();},actions);visibility.classList.add('widget-action-button');visibility.append(spriteIcon('i-eye'),el('span','',widget.hidden?'Show':'Hide'));visibility.setAttribute('aria-label',(widget.hidden?'Show ':'Hide ')+item.label+' widget');const customize=button('',()=>window.NEO_SKINS.edit(widget.id),actions);customize.classList.add('widget-action-button','is-primary');customize.append(spriteIcon('i-settings'),el('span','','Customize'));customize.setAttribute('aria-label','Customize '+item.label+' widget');card.append(visual,copy,actions);list.append(card);});
    }
    renderFilters();renderLibrary();
    refresh();syncBuiltinWidgets();window.addEventListener('neo-skins-changed',refresh);window.addEventListener('neo-status-widgets-change',syncBuiltinWidgets);body._neoDesktopCleanup=()=>{window.removeEventListener('neo-skins-changed',refresh);window.removeEventListener('neo-status-widgets-change',syncBuiltinWidgets);};
  }

  function editor(body) {
    const app=el('div','desktop-app desktop-editor'), toolbar=el('div','editor-toolbar desktop-row'), main=el('div','editor-main'), explorer=el('nav','editor-explorer'), divider=el('div','editor-divider'), right=el('div','editor-right'), tabs=el('div','editor-tabs'), pane=el('div','editor-code'), numbers=el('pre','editor-lines'), input=el('textarea'), status=el('div','editor-status');
    explorer.setAttribute('aria-label','Workspace files'); divider.setAttribute('role','separator'); divider.setAttribute('aria-label','Workspace and editor divider'); divider.setAttribute('aria-orientation','vertical'); input.setAttribute('aria-label','Code editor'); input.spellcheck=false; input.wrap='off';
    pane.append(numbers,input);right.append(tabs,pane);main.append(explorer,divider,right);app.append(toolbar,main,status);body.append(app);
    let active=Object.keys(workspace)[0] || '', opened=active?[active]:[], drafts=Object.assign({},workspace);const dirty=new Set();
    button('New file',()=>ask('New file','File name','untitled.txt',name=>{name=cleanName(name);if(!name||Object.hasOwn(workspace,name)){notify('Choose a new valid file name.');return false;}workspace[name]='';if(!saveFiles())return false;drafts[name]='';open(name);}),toolbar);
    const picker=el('input');picker.type='file';picker.multiple=true;picker.hidden=true;app.append(picker);
    button('Import',()=>picker.click(),toolbar);picker.onchange=async()=>{for(const file of picker.files){const name=cleanName(file.name);if(!name||file.size>2*1024*1024){notify('Use text files smaller than 2 MB.');continue;}if(Object.hasOwn(workspace,name)){notify(name+' already exists; rename it before importing.');continue;}workspace[name]=await file.text();drafts[name]=workspace[name];if(saveFiles())open(name);}picker.value='';};
    function save(){if(!active)return;workspace[active]=input.value;drafts[active]=input.value;if(saveFiles()){dirty.delete(active);renderTabs();updateStatus('Saved on this device');}}
    button('Save',save,toolbar);button('Export',()=>active&&download(active,input.value),toolbar);
    function openHtmlPreview(){
      if(!active)return;
      const d=modal('HTML preview'),header=el('header','editor-preview-header'),titleGroup=el('div','editor-preview-title-group'),actions=el('div','editor-preview-actions'),f=el('iframe','editor-preview');
      const heading=d.querySelector('h2'),network=el('span','editor-preview-network','Network enabled');
      d.classList.add('editor-preview-dialog');
      heading.textContent=active+' preview';
      network.title='Web requests are allowed. Standard browser security and CORS rules still apply.';
      titleGroup.append(heading,network);
      f.title=active+' live HTML preview';
      f.setAttribute('sandbox','allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads allow-pointer-lock allow-presentation');
      f.setAttribute('allow','autoplay; fullscreen; picture-in-picture; clipboard-read; clipboard-write; encrypted-media; gamepad');
      f.setAttribute('allowfullscreen','');
      const policy='<meta http-equiv="Content-Security-Policy" content="default-src https: http: data: blob:; script-src https: http: data: blob: \'unsafe-inline\' \'unsafe-eval\'; style-src https: http: data: blob: \'unsafe-inline\'; img-src https: http: data: blob:; media-src https: http: data: blob:; font-src https: http: data: blob:; connect-src https: http: wss: ws: data: blob:; worker-src https: http: data: blob:; frame-src https: http: data: blob:; form-action https: http:;">';
      const bridge='<meta name="neo-source-url" content="https://neo-preview.invalid/"><script src="'+new URL('./neo-link-proxy.js?v=20260911-all-links-v1',document.baseURI).href.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"><\/script>';
      const render=()=>{f.srcdoc=policy+bridge+input.value;};
      const reload=button('Reload',render,actions);
      reload.title='Reload the current editor contents';
      const maximize=button('Maximize',()=>{
        const active=d.classList.toggle('is-maximized');
        maximize.textContent=active?'Restore':'Maximize';
        maximize.setAttribute('aria-pressed',String(active));
      },actions);
      maximize.setAttribute('aria-pressed','false');
      let previewOwnsFullscreen=false;
      const fullscreen=button('Full screen',()=>{
        if(d.classList.contains('is-browser-fullscreen')){
          d.classList.remove('is-browser-fullscreen');
          if(previewOwnsFullscreen&&document.fullscreenElement)Promise.resolve(document.exitFullscreen()).catch(()=>notify('Full screen could not be closed.'));
          else syncFullscreen();
          return;
        }
        d.classList.add('is-browser-fullscreen');
        if(document.fullscreenElement){syncFullscreen();return;}
        if(!document.documentElement.requestFullscreen){d.classList.remove('is-browser-fullscreen');notify('Full screen is unavailable in this browser.');return;}
        Promise.resolve(document.documentElement.requestFullscreen({navigationUI:'hide'})).then(()=>{previewOwnsFullscreen=true;syncFullscreen();}).catch(()=>{d.classList.remove('is-browser-fullscreen');syncFullscreen();notify('Full screen could not be opened.');});
      },actions);
      const closePreview=()=>{
        const finish=()=>{if(d.open)d.close();};
        d.classList.remove('is-browser-fullscreen');
        if(previewOwnsFullscreen&&document.fullscreenElement)Promise.resolve(document.exitFullscreen()).then(finish,finish);
        else finish();
      };
      button('Close',closePreview,actions);
      const syncFullscreen=()=>{
        if(!document.fullscreenElement&&previewOwnsFullscreen){previewOwnsFullscreen=false;d.classList.remove('is-browser-fullscreen');}
        const active=d.classList.contains('is-browser-fullscreen');
        fullscreen.textContent=active?'Exit full screen':'Full screen';
        fullscreen.setAttribute('aria-pressed',String(active));
      };
      fullscreen.setAttribute('aria-pressed','false');
      document.addEventListener('fullscreenchange',syncFullscreen);
      d.addEventListener('close',()=>document.removeEventListener('fullscreenchange',syncFullscreen),{once:true});
      header.append(titleGroup,actions);
      d.replaceChildren(header,f);
      render();
    }
    button('Preview HTML',openHtmlPreview,toolbar);
    function palette(){ const d=modal('Command palette'), q=el('input');q.placeholder='Search commands';q.setAttribute('aria-label','Search commands');d.append(q);const list=el('div','desktop-grid');d.append(list);const commands=[['Save file',save],['Export file',()=>download(active,input.value)],['Open terminal',()=>window.NEO_SHELL.openApp('terminal')],['Open settings',()=>window.NEO_SHELL.openApp('control')],['About this editor',()=>{notify('Local editor simulation inspired by VS Code. No Microsoft extensions, services or system shell.');}]];function draw(){list.replaceChildren();commands.filter(c=>c[0].toLowerCase().includes(q.value.toLowerCase())).forEach(c=>button(c[0],()=>{d.close();c[1]();},list));}q.oninput=draw;draw();q.focus(); }
    button('Commands',palette,toolbar);
    button('Delete file',()=>{if(!active)return;const d=modal('Delete '+active+'?');d.append(el('p','','This removes the file from this device workspace. Export it first if you need a copy.'));button('Cancel',()=>d.close(),d);button('Delete',()=>{delete workspace[active];delete drafts[active];opened=opened.filter(x=>x!==active);saveFiles();d.close();open(opened[0]||Object.keys(workspace)[0]||'');},d);},toolbar);
    function updateStatus(message){ const before=input.value.slice(0,input.selectionStart);status.textContent=(message||('Ln '+before.split('\n').length+', Col '+(before.length-before.lastIndexOf('\n'))))+' · '+(active||'No file')+' · Local simulation · not VS Code';numbers.textContent=Array.from({length:Math.max(1,input.value.split('\n').length)},(_,i)=>i+1).join('\n'); }
    function renderTabs(){tabs.replaceChildren();opened.forEach(name=>{const group=el('span','desktop-row');const b=button(name+(drafts[name]!==workspace[name]?' •':''),()=>open(name),group);b.setAttribute('aria-pressed',String(name===active));const close=button('×',()=>{if(active)drafts[active]=input.value;opened=opened.filter(n=>n!==name);if(active===name)open(opened[0]||'');else renderTabs();},group);close.setAttribute('aria-label','Close '+name);tabs.append(group);});}
    function open(name){if(active)drafts[active]=input.value;active=name;if(active&&!opened.includes(active))opened.push(active);input.value=active?(drafts[active]??workspace[active]??''):'';input.disabled=!active;explorer.replaceChildren(el('strong','','WORKSPACE'));Object.keys(workspace).sort().forEach(n=>button(n,()=>open(n),explorer));renderTabs();updateStatus();}
    input.oninput=()=>{drafts[active]=input.value;dirty.add(active);renderTabs();updateStatus();};input.onclick=()=>updateStatus();input.onkeyup=()=>updateStatus();input.onscroll=()=>numbers.scrollTop=input.scrollTop;
    input.onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();input.setRangeText('  ',input.selectionStart,input.selectionEnd,'end');input.oninput();}};
    app.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();palette();}});
    // Persist drafts before the containing app closes, not only on browser unload.
    body._neoDesktopCleanup=()=>{if(active)drafts[active]=input.value;dirty.forEach(n=>{if(Object.hasOwn(workspace,n))workspace[n]=drafts[n];});if(dirty.size)saveFiles();};
    // Avoid copying an empty textarea over the first existing file on initial mount.
    active='';open(opened[0]||'');
  }

  function terminal(body) {
    const sessionKey='neo_terminal_sessions_v1',directoryKey='neo_terminal_directories_v1',rootPath='/neo/workspace';
    let directories=[];try{directories=JSON.parse(localStorage.getItem(directoryKey));}catch(_){}if(!Array.isArray(directories))directories=[];
    const virtualDirectories=new Set(['']);
    function resolvePath(raw,from){
      let value=String(raw??'').trim();
      if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
      value=value.replace(/\\/g,'/');
      let base=String(from||'');
      if(!value)return base;
      if(value==='~'||value==='~/workspace'||value===rootPath||value==='/')return '';
      if(value.startsWith(rootPath+'/')){value=value.slice(rootPath.length+1);base='';}
      else if(value.startsWith('~/workspace/')){value=value.slice(12);base='';}
      else if(value.startsWith('/'))return null;
      const parts=base?base.split('/'):[];
      for(const rawPart of value.split('/')){
        const part=rawPart.trim();
        if(!part||part==='.')continue;
        if(part==='..'){parts.pop();continue;}
        if(part.length>80||!(/^[a-zA-Z0-9_ .-]+$/).test(part))return null;
        parts.push(part);
      }
      const resolved=parts.join('/');return resolved.length<=160?resolved:null;
    }
    directories.forEach(path=>{const safe=resolvePath(path,'');if(safe!==null){virtualDirectories.add(safe);const parts=safe.split('/');while(parts.length>1){parts.pop();virtualDirectories.add(parts.join('/'));}}});
    Object.keys(workspace).forEach(path=>{const safe=resolvePath(path,'');if(safe===null)return;const parts=safe.split('/');while(parts.length>1){parts.pop();virtualDirectories.add(parts.join('/'));}});
    function makeSession(message){return{id:Date.now()+Math.floor(Math.random()*100000),lines:[message||'NEO local terminal — simulated commands; no system shell.','Type help to see available commands.'],history:[],cwd:''};}
    let sessions;try{sessions=JSON.parse(localStorage.getItem(sessionKey));}catch(_){}if(!Array.isArray(sessions)||!sessions.length)sessions=[makeSession()];
    sessions=sessions.slice(0,8).map((session,index)=>{const cwd=resolvePath(session&&session.cwd,'');return{id:session&&session.id||Date.now()+index,lines:Array.isArray(session&&session.lines)?session.lines.slice(-300).map(String):[],history:Array.isArray(session&&session.history)?session.history.slice(-100).map(String):[],cwd:cwd!==null&&directoryExists(cwd)?cwd:''};});
    const app=el('div','desktop-app desktop-terminal'),tabs=el('div','terminal-tabs'),log=el('pre','terminal-log'),form=el('form','terminal-composer'),prompt=el('span'),input=el('input');
    input.setAttribute('aria-label','Terminal command');input.autocomplete='off';input.autocapitalize='off';input.spellcheck=false;form.append(prompt,input);const runButton=button('Run',null,form);runButton.type='submit';app.append(tabs,log,form);body.append(app);log.setAttribute('role','log');log.setAttribute('aria-live','polite');let active=sessions[0],cursor=active.history.length,historyDraft='';
    function pathLabel(path){return rootPath+(path?'/'+path:'');}
    function promptLabel(session){return'neo:'+(session.cwd?'~/workspace/'+session.cwd:'~/workspace')+' $';}
    function fileExists(path){return Object.hasOwn(workspace,path);}
    function directoryExists(path){if(path==='')return true;if(virtualDirectories.has(path))return true;const prefix=path+'/';return Object.keys(workspace).some(name=>name.startsWith(prefix))||Array.from(virtualDirectories).some(name=>name.startsWith(prefix));}
    function directoryHasChildren(path){const prefix=path?path+'/':'';return Object.keys(workspace).some(name=>name.startsWith(prefix))||Array.from(virtualDirectories).some(name=>name!==path&&name.startsWith(prefix));}
    function parentPath(path){const index=path.lastIndexOf('/');return index<0?'':path.slice(0,index);}
    function listDirectory(path){
      const prefix=path?path+'/':'',items=new Map();
      virtualDirectories.forEach(directory=>{if(!directory||directory===path||!directory.startsWith(prefix))return;const rest=directory.slice(prefix.length),name=rest.split('/')[0];if(name)items.set(name,name+'/');});
      Object.keys(workspace).forEach(file=>{if(!file.startsWith(prefix))return;const rest=file.slice(prefix.length);if(!rest)return;const slash=rest.indexOf('/');const name=slash<0?rest:rest.slice(0,slash);items.set(name,slash<0&&!items.has(name)?name:name+'/');});
      return Array.from(items.values()).sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'})).join('\n')||'(empty)';
    }
    function parseWords(value){return(String(value||'').match(/"[^"]*"|'[^']*'|\S+/g)||[]).map(word=>((word.startsWith('"')&&word.endsWith('"'))||(word.startsWith("'")&&word.endsWith("'")))?word.slice(1,-1):word);}
    function parseEcho(value){
      let quote='',redirect=-1,append=false;
      for(let index=0;index<value.length;index+=1){const char=value[index];if((char==='"'||char==="'")&&(!quote||quote===char)){quote=quote?'':char;continue;}if(char==='>'&&!quote){redirect=index;append=value[index+1]==='>';break;}}
      if(redirect<0)return{text:((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))?value.slice(1,-1):value};
      let text=value.slice(0,redirect).trim(),target=value.slice(redirect+(append?2:1)).trim();
      if((text.startsWith('"')&&text.endsWith('"'))||(text.startsWith("'")&&text.endsWith("'")))text=text.slice(1,-1);
      if((target.startsWith('"')&&target.endsWith('"'))||(target.startsWith("'")&&target.endsWith("'")))target=target.slice(1,-1);
      return{text,target,append};
    }
    function saveDirectories(){try{localStorage.setItem(directoryKey,JSON.stringify(Array.from(virtualDirectories).filter(Boolean)));return true;}catch(_){notify('Terminal folders could not be saved.');return false;}}
    function persist(){try{localStorage.setItem(sessionKey,JSON.stringify(sessions));saveDirectories();}catch(_){notify('Terminal history could not be saved.');}}
    function focusInput(){requestAnimationFrame(()=>{if(input.isConnected){input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);}});}
    function createTab(){if(sessions.length>=8){notify('Up to 8 terminal sessions.');return;}active=makeSession('New local session.');sessions.push(active);cursor=0;historyDraft='';persist();draw();focusInput();}
    function closeTab(session){
      const index=sessions.indexOf(session);if(index<0)return;
      sessions.splice(index,1);if(!sessions.length)sessions.push(makeSession('New local session.'));
      if(active===session)active=sessions[Math.min(index,sessions.length-1)];cursor=active.history.length;historyDraft='';persist();draw();focusInput();
    }
    function draw(){
      tabs.replaceChildren();sessions.forEach((session,index)=>{const group=el('span','desktop-row'),label='Session '+(index+1);const selectTab=button(label,()=>{active=session;cursor=session.history.length;historyDraft='';input.value='';draw();focusInput();},group);selectTab.setAttribute('aria-pressed',String(session===active));selectTab.title=pathLabel(session.cwd);const close=button('×',()=>closeTab(session),group);close.setAttribute('aria-label','Close '+label);close.title='Close terminal tab (Ctrl+W)';tabs.append(group);});
      const add=button('+',createTab,tabs);add.title='New terminal tab (Ctrl+T)';prompt.textContent=promptLabel(active);prompt.title=pathLabel(active.cwd);log.textContent=active.lines.join('\n');log.scrollTop=log.scrollHeight;
    }
    function writeWorkspaceFile(path,text,append){
      const existed=fileExists(path),previous=workspace[path];workspace[path]=append&&existed?(String(previous)+(String(previous)?'\n':'')+text):text;
      if(saveFiles())return true;if(existed)workspace[path]=previous;else delete workspace[path];return false;
    }
    function removeWorkspaceFile(path){const previous=workspace[path];delete workspace[path];if(saveFiles())return true;workspace[path]=previous;return false;}
    function commandResult(text){if(text!==undefined&&text!==null&&String(text)!=='')active.lines.push(String(text));}
    function run(command){
      const words=parseWords(command),name=String(words.shift()||'').toLowerCase(),argument=words.join(' '),rawArgument=command.trim().slice((command.trim().match(/^\S+/)||[''])[0].length).trim();let result='';
      switch(name){
        case 'help':result='Commands:\n  ls/dir [PATH]       list virtual files\n  cd [PATH]           change virtual folder (.. is supported)\n  pwd                 show the virtual path\n  cat/type FILE       read a virtual file\n  mkdir PATH          create a virtual folder\n  touch FILE          create a virtual file\n  rm/del PATH         remove a virtual file or empty folder\n  echo TEXT [> FILE]  print or safely write a virtual file\n  open APP, apps      launch or list NEO apps\n  whoami, date, time, neofetch, ver, history, ping HOST\n  cls/clear, exit, settings, theme NAME, volume 0–100, fullscreen\nEverything stays inside NEO storage. No real shell, filesystem, or network commands run.';break;
        case 'clear':case 'cls':active.lines=[];break;
        case 'echo':{
          const parsed=parseEcho(rawArgument);if(parsed.target===undefined){result=parsed.text;break;}const target=resolvePath(parsed.target,active.cwd);
          if(target===null||!target){result='Usage: echo TEXT > FILE';break;}if(directoryExists(target)){result='Cannot write a folder: '+pathLabel(target);break;}if(!directoryExists(parentPath(target))){result='Folder not found: '+pathLabel(parentPath(target));break;}if(writeWorkspaceFile(target,parsed.text,parsed.append))result=(parsed.append?'Appended to ':'Wrote ')+pathLabel(target);break;
        }
        case 'date':result=new Date().toString();break;
        case 'time':result=new Date().toLocaleTimeString();break;
        case 'pwd':result=pathLabel(active.cwd);break;
        case 'ls':case 'dir':{
          const target=resolvePath(argument,active.cwd);if(target===null)result='That path is outside the NEO workspace.';else if(fileExists(target))result=target.split('/').pop();else if(!directoryExists(target))result='Folder not found: '+pathLabel(target);else result=listDirectory(target);break;
        }
        case 'cd':{
          const target=resolvePath(argument,argument?active.cwd:'');if(target===null)result='That path is outside the NEO workspace.';else if(fileExists(target))result='Not a folder: '+pathLabel(target);else if(!directoryExists(target))result='Folder not found: '+pathLabel(target);else active.cwd=target;break;
        }
        case 'cat':case 'type':{
          const target=resolvePath(argument,active.cwd);if(!argument||target===null||!target)result='Usage: '+name+' FILE';else if(directoryExists(target))result='Cannot read a folder: '+pathLabel(target);else result=fileExists(target)?String(workspace[target]):'File not found: '+pathLabel(target);break;
        }
        case 'mkdir':{
          const target=resolvePath(argument,active.cwd);if(!argument||target===null||!target)result='Usage: mkdir FOLDER';else if(fileExists(target)||directoryExists(target))result='Already exists: '+pathLabel(target);else if(!directoryExists(parentPath(target)))result='Parent folder not found: '+pathLabel(parentPath(target));else{virtualDirectories.add(target);saveDirectories();result='Created '+pathLabel(target);}break;
        }
        case 'touch':{
          const target=resolvePath(argument,active.cwd);if(!argument||target===null||!target)result='Usage: touch FILE';else if(directoryExists(target))result='A folder already uses that name: '+pathLabel(target);else if(!directoryExists(parentPath(target)))result='Parent folder not found: '+pathLabel(parentPath(target));else if(fileExists(target))result='File already exists: '+pathLabel(target);else if(writeWorkspaceFile(target,'',false))result='Created '+pathLabel(target);break;
        }
        case 'rm':case 'del':{
          if(!argument||argument.startsWith('-')){result='Usage: '+name+' PATH. Options are not supported. No system command was executed; no real files were touched.';break;}const target=resolvePath(argument,active.cwd);
          if(target===null||!target)result='The virtual workspace root cannot be removed.';else if(fileExists(target)){if(removeWorkspaceFile(target))result='Removed '+pathLabel(target);}else if(directoryExists(target)){if(directoryHasChildren(target))result='Folder is not empty: '+pathLabel(target);else{virtualDirectories.delete(target);saveDirectories();result='Removed '+pathLabel(target);}}else result='Not found: '+pathLabel(target);break;
        }
        case 'apps':result=window.NEO_SHELL.getApps().map(item=>item.id+' — '+(item.title||item.name||item.id)).join('\n');break;
        case 'open':{
          const wanted=argument.toLowerCase(),match=window.NEO_SHELL.getApps().find(item=>item.id.toLowerCase()===wanted||String(item.title||item.name||'').toLowerCase()===wanted);
          if(!argument)result='Usage: open APP';else if(match){window.NEO_SHELL.openApp(match.id);result='Opened '+(match.title||match.name||match.id)+'.';}else result='Unknown app. Use apps.';break;
        }
        case 'whoami':result='neo';break;
        case 'neofetch':result='NEO OS\nOS: NEO OS web edition\nHost: '+navigator.userAgent.replace(/\s+/g,' ').slice(0,72)+'\nShell: NEO Terminal (safe simulation)\nWorkspace: '+Object.keys(workspace).length+' virtual file'+(Object.keys(workspace).length===1?'':'s')+'\nNetwork: disabled for terminal commands';break;
        case 'ver':case 'version':result='NEO OS web edition · safe local terminal';break;
        case 'history':result=active.history.map((entry,index)=>String(index+1).padStart(3,' ')+'  '+entry).join('\n')||'No command history.';break;
        case 'ping':{
          const host=argument.toLowerCase();if(!(/^(?:localhost|[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?)$/).test(host))result='Usage: ping HOST';else result='PING '+host+' (simulated)\nReply from '+host+': time<1ms\nReply from '+host+': time<1ms\n2 simulated replies; 0 network packets sent.';break;
        }
        case 'settings':window.NEO_SHELL.openApp('control');result='Opened System Settings.';break;
        case 'theme':if(Object.hasOwn(C.themes,argument)){B.set({theme:argument});result='Theme: '+argument;}else result='Themes: '+Object.keys(C.themes).join(', ');break;
        case 'volume':if(argument!==''&&Number.isFinite(+argument)&&+argument>=0&&+argument<=100){B.set({volume:+argument});result='Master volume: '+argument;}else result='Usage: volume 0–100';break;
        case 'fullscreen':document.documentElement.requestFullscreen?.().catch(()=>notify('Fullscreen was declined by this browser.'));result='Requested fullscreen mode.';break;
        case 'exit':return'exit';
        case '':break;
        default:result='Unsupported local command: '+name+'. Type help. No system command was executed.';
      }
      commandResult(result);active.lines=active.lines.slice(-300);return'complete';
    }
    form.onsubmit=event=>{
      event.preventDefault();const command=input.value.trim();if(!command)return;const session=active;session.lines.push(promptLabel(session)+' '+command);session.history.push(command);session.history=session.history.slice(-100);input.value='';historyDraft='';
      if(run(command)==='exit'){closeTab(session);return;}cursor=active.history.length;persist();draw();focusInput();
    };
    input.onkeydown=event=>{if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;event.preventDefault();if(event.key==='ArrowUp'&&cursor===active.history.length)historyDraft=input.value;cursor=Math.max(0,Math.min(active.history.length,cursor+(event.key==='ArrowUp'?-1:1)));input.value=cursor===active.history.length?historyDraft:(active.history[cursor]||'');focusInput();};
    app.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey)||event.altKey)return;const key=event.key.toLowerCase();if(key==='t'){event.preventDefault();createTab();}else if(key==='w'){event.preventDefault();closeTab(active);}else if(key==='l'){event.preventDefault();active.lines=[];persist();draw();focusInput();}});
    app.addEventListener('pointerdown',event=>{if(!event.target.closest('button,input'))focusInput();});body._neoDesktopCleanup=persist;draw();focusInput();
  }
  function init(){
    window.NEO_SKINS.init();
    const shade=el('div');shade.id='neo-brightness-shade';shade.setAttribute('aria-hidden','true');document.body.append(shade);
    function sync(){const p=B.get();shade.style.opacity=String(1-p.brightness/100);document.querySelectorAll('iframe').forEach(f=>{try{f.contentWindow.postMessage({type:'neo-system-preferences',state:p},location.origin);}catch(_){}});}
    window.addEventListener('neo-system-state',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('neo-performance-mode-change',sync);sync();
    window.addEventListener('storage',e=>{if(e.key===workspaceKey){try{const next=JSON.parse(e.newValue);if(next&&typeof next==='object')workspace=next;}catch(_){}}});
    window.addEventListener('neo-storage-warning',()=>notify('Storage is full or unavailable. Export important files before closing.'));
    // Existing closeWindow removes the app node. Flush editor drafts before removal.
    const layer=document.querySelector('#window-layer, .window-layer');if(layer)new MutationObserver(records=>records.forEach(r=>r.removedNodes.forEach(n=>{n.querySelectorAll?.('.window-body').forEach(b=>b._neoDesktopCleanup?.());}))).observe(layer,{childList:true});
  }
  window.NEO_DESKTOP={mount(id,body){const handlers={skins:skinGallery,vscode:editor,terminal};if(!handlers[id])return false;handlers[id](body);return true;},enhance(id,body){if(id==='control'){body.querySelectorAll('.desktop-settings-shortcuts').forEach(shortcut=>shortcut.remove());const control=body.querySelector('.control-center'),taskbar=control&&control.querySelector('.taskbar-settings');if(control&&taskbar&&!control.querySelector('.integrated-personalization-settings')){const integrated=el('section','settings-section integrated-personalization-settings desktop-app');control.insertBefore(integrated,taskbar);personalizationControls(integrated,{integrated:true});}settingsSearch(control);}},init};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else queueMicrotask(init);
})();
