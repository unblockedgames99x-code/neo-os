(function () {
  "use strict";
  var pages = [
    {name:"NEO Music",copy:"Search, stream, queue, and organize music in the full player.",url:"../music-v2/index.html",tags:"songs audio playlists albums artists streaming"},
    {name:"Grandmaster Chess",copy:"A complete chess game bundled in one local file.",url:"../../games/grandmaster-chess.html",tags:"game offline chess board"},
    {name:"Quantum Clicker",copy:"A local idle game with saved progress.",url:"../../games/quantum-clicker.html",tags:"game offline clicker"},
    {name:"Tetris",copy:"The falling-block game, ready without internet.",url:"../../games/tetris.html",tags:"game offline blocks puzzle"}
  ];
  var history=[null], cursor=0, objectUrl="", viewVersion=0;
  var query=document.getElementById("query"), status=document.getElementById("status"), cards=document.getElementById("cards"), viewer=document.getElementById("viewer"), home=document.getElementById("home-view"), content=document.getElementById("viewer-content");
  function pauseMedia(){content.querySelectorAll("audio,video").forEach(function(m){m.pause();});}
  function clean(){viewVersion++;content.querySelectorAll("audio,video").forEach(function(m){m.pause();m.removeAttribute("src");m.load();});content.replaceChildren();if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl="";}}
  function render(){
    var text=query.value.trim().toLowerCase();
    var matches=pages.filter(function(item){return (item.name+" "+item.tags).toLowerCase().includes(text);});
    cards.replaceChildren();
    matches.forEach(function(item){var card=document.createElement("button"),title=document.createElement("strong"),copy=document.createElement("small");card.className="card";title.textContent=item.name;copy.textContent=item.copy;card.append(title,copy);card.addEventListener("click",function(){navigate(item);});cards.appendChild(card);});
    status.textContent=/^(https?:|www\.)/i.test(text)?"External websites are unavailable in local preview. Search installed pages or open a file.":text?(matches.length?matches.length+" local results":"No local pages match. Try music, chess, tetris, or clicker."):"4 pages installed · no network services needed";
  }
  function show(page){
    clean();home.hidden=Boolean(page);viewer.hidden=!page;
    document.getElementById("back").disabled=cursor===0;document.getElementById("forward").disabled=cursor===history.length-1;
    if(!page){render();return;}
    document.getElementById("viewer-title").textContent=page.name;
    var url=new URL(page.url,location.href);
    if(url.origin!==location.origin){status.textContent="Only local pages are available.";return;}
    var frame=document.createElement("iframe");frame.title=page.name;frame.src=url.href;frame.allow="autoplay; fullscreen";content.appendChild(frame);
  }
  function navigate(page){history=history.slice(0,cursor+1);history.push(page);cursor=history.length-1;show(page);}
  document.getElementById("home").addEventListener("click",function(){navigate(null);});
  document.getElementById("close-view").addEventListener("click",function(){navigate(null);});
  document.getElementById("back").addEventListener("click",function(){if(cursor>0)show(history[--cursor]);});
  document.getElementById("forward").addEventListener("click",function(){if(cursor<history.length-1)show(history[++cursor]);});
  document.getElementById("search-form").addEventListener("submit",function(event){event.preventDefault();navigate(null);});
  query.addEventListener("input",function(){if(!home.hidden)render();});
  document.getElementById("open-file").addEventListener("click",function(){document.getElementById("file").click();});
  document.getElementById("file").addEventListener("change",async function(event){
    var file=event.target.files[0];event.target.value="";if(!file)return;
    clean();home.hidden=true;viewer.hidden=false;document.getElementById("viewer-title").textContent=file.name;
    var kind=file.type.split("/")[0], node, requestVersion=viewVersion;
    if(["image","audio","video"].includes(kind)){node=document.createElement(kind==="image"?"img":kind);if(kind==="image")node.alt=file.name;else node.controls=true;objectUrl=URL.createObjectURL(file);node.src=objectUrl;node.addEventListener("error",function(){if(requestVersion!==viewVersion||viewer.hidden)return;content.textContent="This file format could not be decoded by Chrome. Try PNG, JPEG, MP3, WAV, MP4, or WebM.";});}
    else if(file.size<=2*1024*1024 && (/^(text\/|application\/json)/.test(file.type)||/\.(txt|md|json|csv)$/i.test(file.name))){
      node=document.createElement("pre");
      try{node.textContent=await file.text();}
      catch(error){if(requestVersion!==viewVersion||viewer.hidden)return;node=document.createElement("p");node.setAttribute("role","alert");node.textContent="This file could not be read. Select it again or try another file.";}
    }
    else{node=document.createElement("p");node.textContent="Preview supports images, audio, videos, and text files up to 2 MB.";}
    if(requestVersion!==viewVersion||viewer.hidden)return;
    content.appendChild(node);
  });
  // BFCache retains the DOM and blob URLs; Back restores the current preview.
  window.addEventListener("pagehide",function(event){if(event.persisted)pauseMedia();else clean();});
  render();
})();
