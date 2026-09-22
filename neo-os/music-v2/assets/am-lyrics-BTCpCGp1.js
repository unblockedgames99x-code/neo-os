import{g as ji}from"./_commonjsHelpers-Cpj98o6Y.js";function Vi(z,rt){for(var at=0;at<rt.length;at++){const Z=rt[at];if(typeof Z!="string"&&!Array.isArray(Z)){for(const it in Z)if(it!=="default"&&!(it in z)){const dt=Object.getOwnPropertyDescriptor(Z,it);dt&&Object.defineProperty(z,it,dt.get?dt:{enumerable:!0,get:()=>Z[it]})}}}return Object.freeze(Object.defineProperty(z,Symbol.toStringTag,{value:"Module"}))}var Me={},We;function Yi(){if(We)return Me;We=1;function z(p,t,e,i){var s=arguments.length,n=s<3?t:i===null?i=Object.getOwnPropertyDescriptor(t,e):i,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(p,t,e,i);else for(var a=p.length-1;a>=0;a--)(r=p[a])&&(n=(s<3?r(n):s>3?r(t,e,n):r(t,e))||n);return s>3&&n&&Object.defineProperty(t,e,n),n}typeof SuppressedError=="function"&&SuppressedError;const rt=globalThis,at=rt.ShadowRoot&&(rt.ShadyCSS===void 0||rt.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Z=Symbol(),it=new WeakMap;let dt=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==Z)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(at&&t===void 0){const i=e!==void 0&&e.length===1;i&&(t=it.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&it.set(e,t))}return t}toString(){return this.cssText}};const Re=p=>new dt(typeof p=="string"?p:p+"",void 0,Z),Fe=(p,...t)=>{const e=p.length===1?p[0]:t.reduce((i,s,n)=>i+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+p[n+1],p[0]);return new dt(e,p,Z)},ze=(p,t)=>{if(at)p.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const e of t){const i=document.createElement("style"),s=rt.litNonce;s!==void 0&&i.setAttribute("nonce",s),i.textContent=e.cssText,p.appendChild(i)}},Yt=at?p=>p:p=>p instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return Re(e)})(p):p;const{is:De,defineProperty:Oe,getOwnPropertyDescriptor:Ue,getOwnPropertyNames:Ne,getOwnPropertySymbols:Be,getPrototypeOf:Ge}=Object,kt=globalThis,Kt=kt.trustedTypes,He=Kt?Kt.emptyScript:"",qe=kt.reactiveElementPolyfillSupport,mt=(p,t)=>p,Tt={toAttribute(p,t){switch(t){case Boolean:p=p?He:null;break;case Object:case Array:p=p==null?p:JSON.stringify(p)}return p},fromAttribute(p,t){let e=p;switch(t){case Boolean:e=p!==null;break;case Number:e=p===null?null:Number(p);break;case Object:case Array:try{e=JSON.parse(p)}catch{e=null}}return e}},Wt=(p,t)=>!De(p,t),Xt={attribute:!0,type:String,converter:Tt,reflect:!1,useDefault:!1,hasChanged:Wt};Symbol.metadata??=Symbol("metadata"),kt.litPropertyMetadata??=new WeakMap;let ht=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=Xt){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(t,i,e);s!==void 0&&Oe(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){const{get:s,set:n}=Ue(this.prototype,t)??{get(){return this[e]},set(r){this[e]=r}};return{get:s,set(r){const a=s?.call(this);n?.call(this,r),this.requestUpdate(t,a,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Xt}static _$Ei(){if(this.hasOwnProperty(mt("elementProperties")))return;const t=Ge(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(mt("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(mt("properties"))){const e=this.properties,i=[...Ne(e),...Be(e)];for(const s of i)this.createProperty(s,e[s])}const t=this[Symbol.metadata];if(t!==null){const e=litPropertyMetadata.get(t);if(e!==void 0)for(const[i,s]of e)this.elementProperties.set(i,s)}this._$Eh=new Map;for(const[e,i]of this.elementProperties){const s=this._$Eu(e,i);s!==void 0&&this._$Eh.set(s,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const s of i)e.unshift(Yt(s))}else t!==void 0&&e.push(Yt(t));return e}static _$Eu(t,e){const i=e.attribute;return i===!1?void 0:typeof i=="string"?i:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ze(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(s!==void 0&&i.reflect===!0){const n=(i.converter?.toAttribute!==void 0?i.converter:Tt).toAttribute(e,i.type);this._$Em=t,n==null?this.removeAttribute(s):this.setAttribute(s,n),this._$Em=null}}_$AK(t,e){const i=this.constructor,s=i._$Eh.get(t);if(s!==void 0&&this._$Em!==s){const n=i.getPropertyOptions(s),r=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:Tt;this._$Em=s;const a=r.fromAttribute(e,n.type);this[s]=a??this._$Ej?.get(s)??a,this._$Em=null}}requestUpdate(t,e,i,s=!1,n){if(t!==void 0){const r=this.constructor;if(s===!1&&(n=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??Wt)(n,e)||i.useDefault&&i.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,e,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:n},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),n!==!0||r!==void 0)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),s===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[s,n]of this._$Ep)this[s]=n;this._$Ep=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[s,n]of i){const{wrapped:r}=n,a=this[s];r!==!0||this._$AL.has(s)||a===void 0||this.C(s,void 0,n,a)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(e)):this._$EM()}catch(i){throw t=!1,this._$EM(),i}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};ht.elementStyles=[],ht.shadowRootOptions={mode:"open"},ht[mt("elementProperties")]=new Map,ht[mt("finalized")]=new Map,qe?.({ReactiveElement:ht}),(kt.reactiveElementVersions??=[]).push("2.1.2");const _t=globalThis,Qt=p=>p,Et=_t.trustedTypes,Zt=Et?Et.createPolicy("lit-html",{createHTML:p=>p}):void 0,Jt="$lit$",st=`lit$${Math.random().toFixed(9).slice(2)}$`,te="?"+st,je=`<${te}>`,ot=document,gt=()=>ot.createComment(""),yt=p=>p===null||typeof p!="object"&&typeof p!="function",Rt=Array.isArray,Ve=p=>Rt(p)||typeof p?.[Symbol.iterator]=="function",Ft=`[ 	
\f\r]`,ft=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ee=/-->/g,ie=/>/g,lt=RegExp(`>|${Ft}(?:([^\\s"'>=/]+)(${Ft}*=${Ft}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),se=/'/g,ne=/"/g,re=/^(?:script|style|textarea|title)$/i,ae=p=>(t,...e)=>({_$litType$:p,strings:t,values:e}),U=ae(1),oe=ae(2),ut=Symbol.for("lit-noChange"),B=Symbol.for("lit-nothing"),le=new WeakMap,ct=ot.createTreeWalker(ot,129);function ce(p,t){if(!Rt(p)||!p.hasOwnProperty("raw"))throw Error("invalid template strings array");return Zt!==void 0?Zt.createHTML(t):t}const Ye=(p,t)=>{const e=p.length-1,i=[];let s,n=t===2?"<svg>":t===3?"<math>":"",r=ft;for(let a=0;a<e;a++){const o=p[a];let l,c,h=-1,u=0;for(;u<o.length&&(r.lastIndex=u,c=r.exec(o),c!==null);)u=r.lastIndex,r===ft?c[1]==="!--"?r=ee:c[1]!==void 0?r=ie:c[2]!==void 0?(re.test(c[2])&&(s=RegExp("</"+c[2],"g")),r=lt):c[3]!==void 0&&(r=lt):r===lt?c[0]===">"?(r=s??ft,h=-1):c[1]===void 0?h=-2:(h=r.lastIndex-c[2].length,l=c[1],r=c[3]===void 0?lt:c[3]==='"'?ne:se):r===ne||r===se?r=lt:r===ee||r===ie?r=ft:(r=lt,s=void 0);const f=r===lt&&p[a+1].startsWith("/>")?" ":"";n+=r===ft?o+je:h>=0?(i.push(l),o.slice(0,h)+Jt+o.slice(h)+st+f):o+st+(h===-2?a:f)}return[ce(p,n+(p[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),i]};class bt{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let n=0,r=0;const a=t.length-1,o=this.parts,[l,c]=Ye(t,e);if(this.el=bt.createElement(l,i),ct.currentNode=this.el.content,e===2||e===3){const h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(s=ct.nextNode())!==null&&o.length<a;){if(s.nodeType===1){if(s.hasAttributes())for(const h of s.getAttributeNames())if(h.endsWith(Jt)){const u=c[r++],f=s.getAttribute(h).split(st),g=/([.?@])?(.*)/.exec(u);o.push({type:1,index:n,name:g[2],strings:f,ctor:g[1]==="."?Xe:g[1]==="?"?Qe:g[1]==="@"?Ze:At}),s.removeAttribute(h)}else h.startsWith(st)&&(o.push({type:6,index:n}),s.removeAttribute(h));if(re.test(s.tagName)){const h=s.textContent.split(st),u=h.length-1;if(u>0){s.textContent=Et?Et.emptyScript:"";for(let f=0;f<u;f++)s.append(h[f],gt()),ct.nextNode(),o.push({type:2,index:++n});s.append(h[u],gt())}}}else if(s.nodeType===8)if(s.data===te)o.push({type:2,index:n});else{let h=-1;for(;(h=s.data.indexOf(st,h+1))!==-1;)o.push({type:7,index:n}),h+=st.length-1}n++}}static createElement(t,e){const i=ot.createElement("template");return i.innerHTML=t,i}}function pt(p,t,e=p,i){if(t===ut)return t;let s=i!==void 0?e._$Co?.[i]:e._$Cl;const n=yt(t)?void 0:t._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),n===void 0?s=void 0:(s=new n(p),s._$AT(p,e,i)),i!==void 0?(e._$Co??=[])[i]=s:e._$Cl=s),s!==void 0&&(t=pt(p,s._$AS(p,t.values),s,i)),t}class Ke{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??ot).importNode(e,!0);ct.currentNode=s;let n=ct.nextNode(),r=0,a=0,o=i[0];for(;o!==void 0;){if(r===o.index){let l;o.type===2?l=new vt(n,n.nextSibling,this,t):o.type===1?l=new o.ctor(n,o.name,o.strings,this,t):o.type===6&&(l=new Je(n,this,t)),this._$AV.push(l),o=i[++a]}r!==o?.index&&(n=ct.nextNode(),r++)}return ct.currentNode=ot,s}p(t){let e=0;for(const i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class vt{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=B,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=pt(this,t,e),yt(t)?t===B||t==null||t===""?(this._$AH!==B&&this._$AR(),this._$AH=B):t!==this._$AH&&t!==ut&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Ve(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==B&&yt(this._$AH)?this._$AA.nextSibling.data=t:this.T(ot.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,s=typeof i=="number"?this._$AC(t):(i.el===void 0&&(i.el=bt.createElement(ce(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{const n=new Ke(s,this),r=n.u(this.options);n.p(e),this.T(r),this._$AH=n}}_$AC(t){let e=le.get(t.strings);return e===void 0&&le.set(t.strings,e=new bt(t)),e}k(t){Rt(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,s=0;for(const n of t)s===e.length?e.push(i=new vt(this.O(gt()),this.O(gt()),this,this.options)):i=e[s],i._$AI(n),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const i=Qt(t).nextSibling;Qt(t).remove(),t=i}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class At{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,n){this.type=1,this._$AH=B,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=n,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=B}_$AI(t,e=this,i,s){const n=this.strings;let r=!1;if(n===void 0)t=pt(this,t,e,0),r=!yt(t)||t!==this._$AH&&t!==ut,r&&(this._$AH=t);else{const a=t;let o,l;for(t=n[0],o=0;o<n.length-1;o++)l=pt(this,a[i+o],e,o),l===ut&&(l=this._$AH[o]),r||=!yt(l)||l!==this._$AH[o],l===B?t=B:t!==B&&(t+=(l??"")+n[o+1]),this._$AH[o]=l}r&&!s&&this.j(t)}j(t){t===B?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Xe extends At{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===B?void 0:t}}class Qe extends At{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==B)}}class Ze extends At{constructor(t,e,i,s,n){super(t,e,i,s,n),this.type=5}_$AI(t,e=this){if((t=pt(this,t,e,0)??B)===ut)return;const i=this._$AH,s=t===B&&i!==B||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,n=t!==B&&(i===B||s);s&&this.element.removeEventListener(this.name,this,i),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class Je{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){pt(this,t)}}const ti=_t.litHtmlPolyfillSupport;ti?.(bt,vt),(_t.litHtmlVersions??=[]).push("3.3.2");const ei=(p,t,e)=>{const i=e?.renderBefore??t;let s=i._$litPart$;if(s===void 0){const n=e?.renderBefore??null;i._$litPart$=s=new vt(t.insertBefore(gt(),n),n,void 0,e??{})}return s._$AI(p),s};const zt=globalThis;class xt extends ht{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=ei(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return ut}}xt._$litElement$=!0,xt.finalized=!0,zt.litElementHydrateSupport?.({LitElement:xt});const ii=zt.litElementPolyfillSupport;ii?.({LitElement:xt}),(zt.litElementVersions??=[]).push("4.2.2");const si={attribute:!0,type:String,converter:Tt,reflect:!1,hasChanged:Wt},ni=(p=si,t,e)=>{const{kind:i,metadata:s}=e;let n=globalThis.litPropertyMetadata.get(s);if(n===void 0&&globalThis.litPropertyMetadata.set(s,n=new Map),i==="setter"&&((p=Object.create(p)).wrapped=!0),n.set(e.name,p),i==="accessor"){const{name:r}=e;return{set(a){const o=t.get.call(this);t.set.call(this,a),this.requestUpdate(r,o,p,!0,a)},init(a){return a!==void 0&&this.C(r,void 0,p,a),a}}}if(i==="setter"){const{name:r}=e;return function(a){const o=this[r];t.call(this,a),this.requestUpdate(r,o,p,!0,a)}}throw Error("Unsupported decorator location: "+i)};function G(p){return(t,e)=>typeof e=="object"?ni(p,t,e):((i,s,n)=>{const r=s.hasOwnProperty(n);return s.constructor.createProperty(n,i),r?Object.getOwnPropertyDescriptor(s,n):void 0})(p,t,e)}function nt(p){return G({...p,state:!0,attribute:!1})}const ri=(p,t,e)=>(e.configurable=!0,e.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(p,t,e),e);function ai(p,t){return(e,i,s)=>{const n=r=>r.renderRoot?.querySelector(p)??null;return ri(e,i,{get(){return n(this)}})}}const J={GOOGLE:{MAX_RETRIES:3,RETRY_DELAY_MS:1e3,FETCH_TIMEOUT_MS:6e3}};class tt{static delay(t){return new Promise(e=>{setTimeout(e,t)})}static fetchWithTimeout(t,e=J.GOOGLE.FETCH_TIMEOUT_MS){const i=new AbortController,s=setTimeout(()=>i.abort(),e);return fetch(t,{signal:i.signal}).finally(()=>clearTimeout(s))}static isPurelyLatinScript(t){return/^[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F]*$/.test(t)}static async translate(t,e){if(!t||Array.isArray(t)&&t.length===0)return Array.isArray(t)?[]:"";const i=Array.isArray(t),s=i?t:[t],n=[],r=[];if(s.forEach((g,y)=>{g&&g.trim()&&(n.push(y),r.push(g))}),r.length===0)return i?s:s[0];const a=1500,o=new Array(r.length).fill("");let l=[],c=[],h=0;const u=async(g,y)=>{if(g.length===0)return;const T=g.join(`
`);let w=0,R=!1;for(;w<J.GOOGLE.MAX_RETRIES&&!R;)try{const E=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${e}&dt=t&q=${encodeURIComponent(T)}`,m=await tt.fetchWithTimeout(E);if(!m.ok)throw new Error(`Status ${m.status}`);const W=((await m.json())?.[0]?.map(C=>C?.[0]).join("")||"").split(`
`);y.forEach((C,P)=>{P<W.length?o[C]=W[P]:o[C]=g[P]}),R=!0}catch{w+=1,w<J.GOOGLE.MAX_RETRIES?await tt.delay(J.GOOGLE.RETRY_DELAY_MS*2**(w-1)):y.forEach((m,$)=>{o[m]=g[$]})}};for(let g=0;g<r.length;g+=1){const y=r[g];h+y.length>a&&(await u(l,c),l=[],c=[],h=0),l.push(y),c.push(g),h+=y.length}l.length>0&&await u(l,c);const f=[...s];return n.forEach((g,y)=>{f[g]=o[y]}),i?f:f[0]}static async romanize(t){const e=Array.isArray(t)?t:t.data||t.content||[];return!e||e.length===0?Array.isArray(t)?t:[]:e.some(s=>s.isWordSynced!==!1&&Array.isArray(s.text)&&s.text.length>1)?this.romanizeWordSynced(e):this.romanizeLineSynced(e)}static async romanizeWordSynced(t){return Promise.all(t.map(async e=>{if(!e.text||!Array.isArray(e.text)||e.text.length===0||e.romanizedText)return e;const i=e.text.map(r=>r.text).join(""),[s]=await this.romanizeTexts([i]),n=e.text.map(r=>({...r,romanizedText:r.romanizedText}));return{...e,text:n,romanizedText:s||""}}))}static async romanizeLineSynced(t){const e=t.map(s=>s.romanizedText?"":Array.isArray(s.text)&&s.text.length>0?s.text.map(n=>n.text).join(""):""),i=await this.romanizeTexts(e);return t.map((s,n)=>({...s,romanizedText:i[n]||""}))}static async romanizeTexts(t){const e=t.join(" ");if(tt.isPurelyLatinScript(e))return t;const i=[];for(const s of t)if(!s||tt.isPurelyLatinScript(s))i.push(s);else{let n=0,r=!1,a=null;for(;n<J.GOOGLE.MAX_RETRIES&&!r;)try{const o=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&q=${encodeURIComponent(s)}`,h=(await(await tt.fetchWithTimeout(o)).json())?.[0]?.[0]?.[3]||s;i.push(h),r=!0}catch(o){a=o,console.warn(`GoogleService: Error romanizing text "${s}" (attempt ${n+1}/${J.GOOGLE.MAX_RETRIES}):`,o),n+=1,n<J.GOOGLE.MAX_RETRIES&&await tt.delay(J.GOOGLE.RETRY_DELAY_MS*2**(n-1))}r||(console.error(`GoogleService: Failed to romanize text "${s}" after ${J.GOOGLE.MAX_RETRIES} attempts. Last error:`,a),i.push(s))}return i}}const de="1.6.1",wt=7e3,oi=8e3,li=500,$t=350,ci=450,di=5e3,Dt=4e3,hi=160,ui=400,pi=500,mi=$t,gi=250,Ot=.85,he=1.12,ue=1.2,Lt=.35,yi=180,fi=80,bi=240,pe=.75,vi=.45,xi=.35,wi=760,Si=1320,me=100;function et(p,t={},e=oi){const i=new AbortController,s=setTimeout(()=>i.abort(),e);return fetch(p,{...t,signal:i.signal}).finally(()=>clearTimeout(s))}const ge=["https://lyricsplus.binimum.org","https://lyricsplus-seven.vercel.app","https://lyricsplus.prjktla.workers.dev","https://lyrics-plus-backend.vercel.app"],ye="apple,lyricsplus,musixmatch,spotify,qq,deezer,musixmatch-word",ki="https://fetch-genius.samidy.workers.dev/";class d extends xt{constructor(){super(...arguments),this.downloadFormat="auto",this.highlightColor="#ffffff",this.autoScroll=!0,this.interpolate=!0,this.showRomanization=!1,this.showTranslation=!1,this._currentTime=0,this.isLoading=!1,this.activeLineIndices=[],this.activeMainWordIndices=new Map,this.activeBackgroundWordIndices=new Map,this.mainWordProgress=new Map,this.backgroundWordProgress=new Map,this.lyricsSource=null,this.availableSources=[],this.currentSourceIndex=0,this.isFetchingAlternatives=!1,this.hasFetchedAllProviders=!1,this.mainWordAnimations=new Map,this.backgroundWordAnimations=new Map,this.lastInstrumentalIndex=null,this.isUserScrolling=!1,this.isProgrammaticScroll=!1,this.isClickSeeking=!1,this.cachedLyricsLines=[],this.cachedLineArray=[],this.lineElementCache=new Map,this.gapElementCache=new Map,this.gapDotCache=new WeakMap,this.gapExitDurationCache=new WeakMap,this.gapCollapseDurationCache=new WeakMap,this.cachedAllGaps=[],this.cachedIsUnsynced=!1,this.cachedLineData=null,this.activeLineIds=new Set,this.currentPrimaryActiveLine=null,this.lastPrimaryActiveLine=null,this.backgroundExpandedLine=null,this.backgroundCollapseTimeouts=new Map,this.scrollAnimationState=null,this.currentScrollOffset=0,this.animatingLines=[],this.lastActiveIndex=0,this.visibleLineIds=new Set,this.preActiveLineElements=[],this.positionedLineElements=[],this.activeGapLineElements=[],this._boundHandleUserScroll=this.handleUserScroll.bind(this),this._boundAnimateProgress=this.animateProgress.bind(this)}async toggleRomanization(){this.showRomanization=!this.showRomanization,await this.applyRomanization()}async applyRomanization(){if(this.showRomanization&&this.lyrics&&this.lyrics.some(e=>!e.romanizedText&&(!e.text||!e.text.some(i=>i.romanizedText)))){this.isLoading=!0;try{const e=await tt.romanize(this.lyrics);this.lyrics=e}catch(e){console.error("Romanization failed",e)}finally{this.isLoading=!1}}}async toggleTranslation(){this.showTranslation=!this.showTranslation,await this.applyTranslation()}async applyTranslation(){if(this.showTranslation&&this.lyrics&&this.lyrics.some(e=>!e.translation)){this.isLoading=!0;try{const e=this.lyrics.map(r=>r.translation?"":r.text.map(a=>a.text).join(""));if(e.every(r=>!r)){this.isLoading=!1;return}const i=await tt.translate(e,"en"),s=Array.isArray(i)?i:[i],n=this.lyrics.map((r,a)=>r.translation?r:{...r,translation:s[a]||void 0});this.lyrics=n}catch(e){console.error("Translation failed",e)}finally{this.isLoading=!1}}}set currentTime(t){const e=this._currentTime;t<e&&e-t>1e3&&this.lyrics&&(this.activeLineIndices=[],this.activeMainWordIndices.clear(),this.activeBackgroundWordIndices.clear(),this.mainWordProgress.clear(),this.backgroundWordProgress.clear(),this.mainWordAnimations.clear(),this.backgroundWordAnimations.clear(),this.preActiveLineElements=[],this.positionedLineElements=[],this.activeGapLineElements=[],this.clearBackgroundExpandedLine(),this.lyricsContainer&&(this.lyricsContainer.querySelectorAll(".lyrics-line.active, .lyrics-line.pre-active, .lyrics-line.bg-expanded, .lyrics-line.scroll-exiting").forEach(n=>{n.classList.remove("active","pre-active","bg-expanded","scroll-exiting"),d.resetSyllables(n)}),this.lyricsContainer.querySelectorAll(".lyrics-gap.active, .lyrics-gap.gap-collapsing, .lyrics-gap.gap-exiting").forEach(n=>n.classList.remove("active","gap-collapsing","gap-exiting")),this.gapElementCache.clear())),this._currentTime=t,e!==t&&this.lyrics&&this._onTimeChanged(e,t)}get currentTime(){return this._currentTime}_updateFooter(){const t=this.shadowRoot?.querySelector(".lyrics-footer");if(!t)return;const e=t.querySelector(".source-switch-btn"),i=t.querySelector(".source-switch-svg"),s=t.querySelector(".source-switch-label");e&&(e.disabled=this.isFetchingAlternatives),i&&i.classList.toggle("is-loading",this.isFetchingAlternatives),s&&(s.textContent=this.isFetchingAlternatives?"Switching...":"Switch")}connectedCallback(){super.connectedCallback(),this.fetchLyrics()}disconnectedCallback(){super.disconnectedCallback(),this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=void 0),this.userScrollTimeoutId&&(clearTimeout(this.userScrollTimeoutId),this.userScrollTimeoutId=void 0),this.clickSeekTimeout&&(clearTimeout(this.clickSeekTimeout),this.clickSeekTimeout=void 0),this.scrollAnimationTimeout&&(clearTimeout(this.scrollAnimationTimeout),this.scrollAnimationTimeout=void 0),this.scrollUnlockTimeout&&(clearTimeout(this.scrollUnlockTimeout),this.scrollUnlockTimeout=void 0);for(const t of this.backgroundCollapseTimeouts.values())clearTimeout(t);this.backgroundCollapseTimeouts.clear(),this.backgroundExpandFrameId!==void 0&&(cancelAnimationFrame(this.backgroundExpandFrameId),this.backgroundExpandFrameId=void 0),this.fetchAbortController?.abort(),this.fetchAbortController=void 0,this.lyricsContainer&&(this.lyricsContainer.removeEventListener("wheel",this._boundHandleUserScroll),this.lyricsContainer.removeEventListener("touchmove",this._boundHandleUserScroll)),this.preActiveLineElements=[],this.positionedLineElements=[],this.activeGapLineElements=[],this.visibilityObserver?.disconnect(),this.visibilityObserver=void 0}async fetchLyrics(){this.fetchAbortController?.abort();const t=new AbortController;this.fetchAbortController=t,this.isLoading=!0,this.lyrics=void 0,this.lyricsSource=null,this.availableSources=[],this.currentSourceIndex=0,this.isFetchingAlternatives=!1,this.hasFetchedAllProviders=!1,this._updateFooter();try{if(this.ttml){const r=d.parseTTML(this.ttml);if(r&&r.lines.length>0){this.lyrics=r.lines,this.lyricsSource="Local",r.songwriters&&(this.songwriters=r.songwriters),this.availableSources=[{lines:this.lyrics,source:"Local",songwriters:this.songwriters}],this.currentSourceIndex=0,this.hasFetchedAllProviders=!0,this._updateFooter(),await this.onLyricsLoaded();return}}const e=await this.resolveSongMetadata();if(t.signal.aborted)return;const i=!!this.musicId&&!this.songTitle&&!this.songArtist&&!this.query&&!this.isrc,s=[];if(e?.metadata&&!i){const r=e.metadata.title?.trim()||"",a=e.metadata.artist?.trim()||"",o=await d.fetchLyricsFromBiniLyrics(r,a,e.catalogIsrc,e.metadata);o&&o.lines.length>0&&s.push(o);const l=c=>c.some(h=>h.lines.some(u=>u.isWordSynced||u.text&&u.text.length>1));if(s.length===0||!l(s)){const c=await d.fetchLyricsFromUnison(e.metadata);c&&c.lines.length>0&&s.push(c)}if(s.length===0||!l(s)){const c=await d.fetchLyricsFromYouLyPlus(r,a,e.catalogIsrc,e.metadata,!0);c&&c.length>0&&s.push(...c)}}const n=r=>r.some(a=>a.lines.some(o=>o.timestamp>0||o.endtime>0));if((s.length===0||!n(s))&&e?.metadata){const r=await d.fetchLyricsFromLrclib(e.metadata);r&&r.lines.length>0&&s.push({lines:r.lines,source:"LRCLIB"})}if(s.length===0&&e?.metadata){const r=await d.fetchLyricsFromGenius(e.metadata);r&&r.lines.length>0&&s.push({lines:r.lines,source:"Genius"})}if(this.hasFetchedAllProviders=s.length===0||s.some(r=>r.source==="LRCLIB"||r.source==="Genius"),this._updateFooter(),s.length>0){this.availableSources=d.mergeAndSortSources(s),this.currentSourceIndex=0;const r=this.availableSources[0];this.lyrics=r.lines,this.lyricsSource=r.source,r.songwriters&&(this.songwriters=r.songwriters),await this.onLyricsLoaded();return}this.lyrics=void 0,this.lyricsSource=null}finally{t.signal.aborted||(this.isLoading=!1)}}async onLyricsLoaded(){this.activeLineIndices=[],this.activeMainWordIndices.clear(),this.activeBackgroundWordIndices.clear(),this.mainWordProgress.clear(),this.backgroundWordProgress.clear(),this.mainWordAnimations.clear(),this.backgroundWordAnimations.clear(),this.preActiveLineElements=[],this.positionedLineElements=[],this.activeGapLineElements=[],this.clearBackgroundExpandedLine(),this.lyricsContainer&&(this.isProgrammaticScroll=!0,this.lyricsContainer.scrollTop=0,window.setTimeout(()=>{this.isProgrammaticScroll=!1},100)),await this.autoProcessLyrics()}async autoProcessLyrics(){this.showRomanization&&await this.applyRomanization(),this.showTranslation&&await this.applyTranslation()}static getRankForCollected(t,e){const i=t.toLowerCase(),s=e.some(a=>a.text&&Array.isArray(a.text)&&a.text.length>1),n=e.length>0&&e.every(a=>a.timestamp===0&&a.endtime===0),r=i.includes("qq")||i.includes("lyricsplus");return i.includes("apple")&&s?1:i.includes("bini")&&s?2:i.includes("unison")&&s?3:r&&s?4:i.includes("musixmatch")&&s?5:i.includes("lrclib")&&s?6:s?7:i.includes("apple")&&!s&&!n?8:i.includes("bini")&&!s&&!n?9:i.includes("unison")&&!s&&!n?10:r&&!s&&!n?11:i.includes("musixmatch")&&!s&&!n?12:i.includes("lrclib")&&!s&&!n?13:!s&&!n?14:i.includes("apple")&&n?15:i.includes("bini")&&n?16:i.includes("unison")&&n?17:r&&n?18:i.includes("musixmatch")&&n?19:i.includes("lrclib")&&n?20:i.includes("genius")?21:30}static getDisplaySourceLabel(t){return t.toLowerCase().includes("lyricsplus")?"QQ":t}static getSourceKey(t){const e=(t||"").trim().toLowerCase();return e?e.includes("lyricsplus")||e==="qq"?"qq":e.replace(/\s+/g," "):""}static mergeAndSortSources(t){const e=new Map;for(const i of t){const s=d.getDisplaySourceLabel(i.source);e.has(s)||e.set(s,{...i,source:s})}return Array.from(e.values()).sort((i,s)=>d.getRankForCollected(i.source,i.lines)-d.getRankForCollected(s.source,s.lines))}findCurrentSourceIndex(t=this.availableSources,e=this.lyricsSource,i=this.lyrics){const s=t.findIndex(r=>r.lines===i);if(s!==-1)return s;const n=d.getSourceKey(e);return n?t.findIndex(r=>d.getSourceKey(r.source)===n):-1}static getNextSourceIndex(t,e,i,s){if(t.length<=1)return-1;if(e!==-1)return(e+1)%t.length;const n=d.getSourceKey(i),r=t.findIndex(a=>a.lines!==s&&d.getSourceKey(a.source)!==n);return r===-1?0:r}async applySourceAtIndex(t){const e=this.availableSources[t];e&&(this.currentSourceIndex=t,this.lyrics=e.lines,this.lyricsSource=e.source,e.songwriters&&(this.songwriters=e.songwriters),await this.onLyricsLoaded())}async switchSource(){if(this.isFetchingAlternatives)return;const t=this.lyricsSource,e=this.lyrics;if(!this.hasFetchedAllProviders){this.isFetchingAlternatives=!0,this._updateFooter();try{const i=await this.resolveSongMetadata();if(i?.metadata){const s=[];if(!this.availableSources.some(n=>n.source.toLowerCase().includes("unison"))){const n=await d.fetchLyricsFromUnison(i.metadata);n&&n.lines.length>0&&s.push(n)}if(!this.availableSources.some(n=>n.source.toLowerCase().includes("apple")||n.source.toLowerCase().includes("qq"))){const n=i.metadata.title?.trim()||"",r=i.metadata.artist?.trim()||"",a=await d.fetchLyricsFromYouLyPlus(n,r,i.catalogIsrc,i.metadata,!0);a&&a.length>0&&s.push(...a)}if(!this.availableSources.some(n=>n.source.toLowerCase().includes("lrclib"))){const n=await d.fetchLyricsFromLrclib(i.metadata);n&&n.lines.length>0&&s.push({lines:n.lines,source:"LRCLIB"})}if(!this.availableSources.some(n=>n.source.toLowerCase().includes("genius"))){const n=await d.fetchLyricsFromGenius(i.metadata);n&&n.lines.length>0&&s.push({lines:n.lines,source:"Genius"})}s.length>0&&(this.availableSources=d.mergeAndSortSources([...this.availableSources,...s]),this.currentSourceIndex=this.findCurrentSourceIndex(this.availableSources,t,e))}}finally{this.hasFetchedAllProviders=!0,this.isFetchingAlternatives=!1,this._updateFooter()}}if(this.availableSources.length>1){const i=this.findCurrentSourceIndex(this.availableSources,t,e),s=d.getNextSourceIndex(this.availableSources,i,t,e);s!==-1&&await this.applySourceAtIndex(s)}}async resolveSongMetadata(){const t={title:this.songTitle?.trim()??"",artist:this.songArtist?.trim()??"",album:this.songAlbum?.trim()||void 0,songwriters:this.songwriters?.trim()||void 0,durationMs:void 0};typeof this.songDurationMs=="number"&&this.songDurationMs>0?t.durationMs=this.songDurationMs:typeof this.duration=="number"&&this.duration>0&&(t.durationMs=this.duration);const e=null;let i=this.musicId,s=this.isrc;if(this.query&&(!t.title||!t.artist||!t.album)){const h=d.parseQueryMetadata(this.query);h&&(!t.title&&h.title&&(t.title=h.title),!t.artist&&h.artist&&(t.artist=h.artist),!t.album&&h.album&&(t.album=h.album))}let n=null;this.query&&(!t.title||!t.artist)&&(n=await d.searchLyricsPlusCatalog(this.query),n&&(!t.title&&n.title&&(t.title=n.title),!t.artist&&n.artist&&(t.artist=n.artist),!t.album&&n.album&&(t.album=n.album),!t.songwriters&&n.songwriters&&(t.songwriters=n.songwriters),t.durationMs==null&&typeof n.durationMs=="number"&&n.durationMs>0&&(t.durationMs=n.durationMs),!i&&n.id?.appleMusic&&(i=n.id.appleMusic),!s&&n.isrc&&(s=n.isrc)));const r=t.title?.trim()??"",a=t.artist?.trim()??"",o=t.album?.trim(),l=typeof t.durationMs=="number"&&Number.isFinite(t.durationMs)&&t.durationMs>0?Math.round(t.durationMs):void 0;return{metadata:r&&a?{title:r,artist:a,album:o||void 0,durationMs:l}:void 0,appleId:i,appleSong:e,catalogIsrc:s}}static parseQueryMetadata(t){const e=t?.trim();if(!e)return null;const i={},s=e.split(/\s[-–—]\s/);if(s.length>=2){const[r,...a]=s,o=a.join(" - "),l=r.trim(),c=o.trim();if(l&&c)return i.title=l,i.artist=c,i}const n=e.split(/\s+[bB]y\s+/);if(n.length===2){const[r,a]=n.map(o=>o.trim());if(r&&a)return i.title=r,i.artist=a,i}return null}static async searchLyricsPlusCatalog(t){const e=t?.trim();if(!e)return null;for(const i of ge){const n=`${i.endsWith("/")?i.slice(0,-1):i}/v1/songlist/search?q=${encodeURIComponent(e)}`;try{const r=await et(n);if(r.ok){const a=await r.json();let o=[];const l=a;if(Array.isArray(l?.results)?o=l.results:Array.isArray(a)&&(o=a),o.length>0)return o.find(h=>h?.id&&h.id.appleMusic)??o[0]}}catch{}}return null}static async fetchLyricsFromBiniLyrics(t,e,i,s={}){if((!t||!e)&&!i)return null;try{let n=null;if(i)try{const r=`https://lyrics-api.binimum.org/?isrc=${encodeURIComponent(i)}`,a=await et(r);if(a.ok){const o=await a.json();o.results&&o.results.length>0&&(n=o)}}catch{}if(!n&&t&&e){const r=new URLSearchParams({track:t,artist:e});s.album&&r.append("album",s.album),s.durationMs&&s.durationMs>0&&r.append("duration",Math.round(s.durationMs/1e3).toString());const a=`https://lyrics-api.binimum.org/?${r.toString()}`,o=await et(a);o.ok&&(n=await o.json())}if(n&&n.results&&n.results.length>0){const r=n.results[0];if(r.lyricsUrl){const a=await et(r.lyricsUrl);if(a.ok){const o=await a.text(),l=d.parseTTML(o);if(l&&l.lines.length>0)return{lines:l.lines,source:"BiniLyrics",songwriters:l.songwriters}}}}}catch(n){console.error("Cache API failed",n)}return null}static async fetchLyricsFromYouLyPlus(t,e,i,s={},n=!1){if((!t||!e)&&!i)return[];const r=new URLSearchParams;t&&r.append("title",t),e&&r.append("artist",e),i&&r.append("isrc",i),s.album&&r.append("album",s.album),s.durationMs&&s.durationMs>0&&r.append("duration",Math.round(s.durationMs/1e3).toString()),ye.includes("apple")||r.append("source",ye);const a=(h,u)=>{const f=h.toLowerCase(),g=u.some(w=>w.text&&Array.isArray(w.text)&&w.text.length>1),y=u.length>0&&u.every(w=>w.timestamp===0&&w.endtime===0),T=f.includes("qq")||f.includes("lyricsplus");return f.includes("apple")&&g?1:f.includes("bini")&&g?2:f.includes("unison")&&g?3:T&&g?4:f.includes("musixmatch")&&g?5:g?6:f.includes("apple")&&!g&&!y?7:f.includes("bini")&&!g&&!y?8:f.includes("unison")&&!g&&!y?9:T&&!g&&!y?10:f.includes("musixmatch")&&!g&&!y?11:!g&&!y?12:f.includes("apple")&&y?13:f.includes("bini")&&y?14:f.includes("unison")&&y?15:T&&y?16:f.includes("musixmatch")&&y?17:30},o=[];if(!n){const h=await d.fetchLyricsFromBiniLyrics(t,e,i,s);if(h)return o.push(h),o}const l=[...ge].sort(()=>Math.random()-.5).slice(0,3);for(const h of l){const f=`${h.endsWith("/")?h.slice(0,-1):h}/v2/lyrics/get?${r.toString()}`;let g=null;try{const y=await et(f);y.ok&&(g=await y.json())}catch{g=null}if(g){const y=d.convertKPoeLyrics(g);if(y&&y.length>0){const T=g?.metadata?.source||g?.metadata?.provider||"LyricsPlus (KPoe)",w=a(T,y),R={lines:y,source:T};if(o.push(R),w===1)break}}}if(!o.some(h=>a(h.source,h.lines)<=2))try{const u=`https://lyricsplus.binimum.org/v2/lyrics/get?${new URLSearchParams(r).toString()}`,f=await et(u);if(f.ok){const g=await f.json();if(g){const y=d.convertKPoeLyrics(g),T=g?.metadata?.source||g?.metadata?.provider||"LyricsPlus (KPoe)",w=y?.some(R=>R.text&&Array.isArray(R.text)&&R.text.length>1);y&&y.length>0&&w&&o.push({lines:y,source:T})}}}catch{}return o}static parseLrcSubtitles(t){if(!t||typeof t!="string")return[];const e=[],i=t.split(`
`),s=[];for(const n of i){const r=n.match(/^\[(\d{1,3}):(\d{2})\.(\d{2,3})\]\s?(.*)$/);if(!r)continue;const a=parseInt(r[1],10),o=parseInt(r[2],10);let l=parseInt(r[3],10);r[3].length===3&&(l=Math.round(l/10));const c=(a*60+o)*1e3+l*10,h=r[4]||"";s.push({timestamp:c,text:h})}for(let n=0;n<s.length;n+=1){const{timestamp:r,text:a}=s[n],o=n+1<s.length?s[n+1].timestamp:r+5e3;if(!a.trim())continue;const l={text:a,part:!1,timestamp:r,endtime:o,lineSynced:!0};e.push({text:[l],background:!1,backgroundText:[],oppositeTurn:!1,timestamp:r,endtime:o,isWordSynced:!1})}return e}static async fetchLyricsFromLrclib(t){const e=t.title?.trim(),i=t.artist?.trim();if(!e||!i)return null;try{const s=`${i} ${e}`,n=new URLSearchParams({q:s}),r=await et(`https://lrclib.net/api/search?${n.toString()}`,{headers:{"User-Agent":`apple-music-web-components/${de}`}});if(!r.ok)return null;const a=await r.json();if(!Array.isArray(a)||a.length===0)return null;const l=a.find(c=>c.syncedLyrics&&typeof c.syncedLyrics=="string")||a[0];if(l.syncedLyrics){const c=d.parseLrcSubtitles(l.syncedLyrics);if(c.length>0)return{lines:c,source:"LRCLIB"}}if(l.plainLyrics&&typeof l.plainLyrics=="string"){const c=l.plainLyrics.split(`
`).filter(h=>h.trim());if(c.length>0)return{lines:c.map(u=>({text:[{text:u,part:!1,timestamp:0,endtime:0}],background:!1,backgroundText:[],oppositeTurn:!1,timestamp:0,endtime:0,isWordSynced:!1})),source:"LRCLIB (unsynced)"}}}catch{}return null}static async fetchLyricsFromGenius(t){const e=t.title?.trim(),i=t.artist?.trim();if(!e||!i)return null;try{const s=new URLSearchParams({title:e,artist:i}),n=await et(`${ki}?${s.toString()}`);if(!n.ok)return null;const r=await n.json();if(r.lyrics){const a=r.lyrics.split(`
`).map(o=>o.trim()).filter(o=>o&&!o.startsWith("["));if(a.length>0)return{lines:a.map(l=>({text:[{text:l,part:!1,timestamp:0,endtime:0}],background:!1,backgroundText:[],oppositeTurn:!1,timestamp:0,endtime:0,isWordSynced:!1})),source:"Genius"}}}catch{}return null}static async fetchLyricsFromUnison(t){const e=t.title?.trim(),i=t.artist?.trim();if(!e||!i)return null;const s=new URLSearchParams;s.append("song",e),s.append("artist",i),t.album&&s.append("album",t.album),t.durationMs&&t.durationMs>0&&s.append("duration",Math.round(t.durationMs/1e3).toString());try{const n=await et(`https://unison.boidu.dev/lyrics?${s.toString()}`);if(!n.ok)return null;const r=await n.json();if(!r.success||!r.data?.lyrics)return null;const a=r.data,o=a.format||"lrc",l=a.syncType||"linesync",c=a.lyrics;if(o==="ttml"){const h=d.parseTTML(c);if(h&&h.lines.length>0)return{lines:h.lines,source:"Unison",songwriters:h.songwriters}}if(o==="lrc")if(l==="plain"){const h=c.split(`
`).map(u=>u.trim()).filter(u=>u);if(h.length>0)return{lines:h.map(f=>({text:[{text:f,part:!1,timestamp:0,endtime:0}],background:!1,backgroundText:[],oppositeTurn:!1,timestamp:0,endtime:0,isWordSynced:!1})),source:"Unison (unsynced)"}}else{const h=d.parseLrcSubtitles(c);if(h.length>0)return{lines:h,source:"Unison"}}}catch{}return null}static calculateLineAlignments(t,e){const i=new Array(t.length).fill(void 0);let s=!0,n=null,r=0,a=0;if(t.forEach((o,l)=>{let c;if(o){let h=e[o];h||(o==="v1000"?h="group":o==="v2000"?h="other":h="person"),h==="group"?c="start":(n===null?h==="other"?s=!1:s=!0:o!==n&&(s=!s),c=s?"start":"end",n=o)}c&&(a+=1,c==="end"&&(r+=1)),i[l]=c}),a>0&&Math.round(r/a*100)>=85){const o=l=>l==="start"?"end":l==="end"?"start":l;for(let l=0;l<i.length;l+=1)i[l]=o(i[l])}return i}static parseTTMLTime(t,e=0){if(!t)return e;const i=t.trim().toLowerCase(),s=i.match(/^(-?\d+(?:\.\d+)?)(ms|h|m|s)$/);if(s){const a=Number(s[1]);return Math.max(0,Math.round(a*{ms:1,s:1e3,m:6e4,h:36e5}[s[2]]))}const n=i.split(":").map(Number);if(n.some(a=>!Number.isFinite(a)))return e;let r=0;if(n.length===3)r=n[0]*3600+n[1]*60+n[2];else if(n.length===2)r=n[0]*60+n[1];else if(n.length===1)[r]=n;else return e;return Math.max(0,Math.round(r*1e3))}static isRightToLeftLanguage(t){if(!t)return!1;const e=t.toLowerCase().split(/[-_]/)[0];return["ar","dv","fa","he","ku","ps","ur","yi"].includes(e)}static parseTTML(t){try{const i=new DOMParser().parseFromString(t,"text/xml"),s={},n={},r={},a=i.documentElement.getAttribute("xml:lang")||i.documentElement.getAttribute("lang"),o=i.getElementsByTagName("ttm:agent");for(let E=0;E<o.length;E+=1){const m=o[E],$=m.getAttribute("xml:id"),M=m.getAttribute("type");$&&M&&(r[$]=M)}let l;const c=i.getElementsByTagName("songwriter");if(c.length>0){const E=[];for(let m=0;m<c.length;m+=1)c[m].textContent&&E.push(c[m].textContent);E.length>0&&(l=E.join(", "))}const h=i.getElementsByTagName("translation");for(let E=0;E<h.length;E+=1){const m=h[E].getElementsByTagName("text");for(let $=0;$<m.length;$+=1){const M=m[$],W=M.getAttribute("for");W&&M.textContent&&(s[W]=M.textContent)}}const u=d.parseTTMLTime,f=i.getElementsByTagName("transliteration");for(let E=0;E<f.length;E+=1){const m=f[E].getElementsByTagName("text");for(let $=0;$<m.length;$+=1){const M=m[$],W=M.getAttribute("for");if(!W)continue;const C=Array.from(M.getElementsByTagName("span")).filter(P=>P.getAttribute("begin"));if(C.length>0){const P=[];let L="";for(let S=0;S<C.length;S+=1){const b=C[S],v=b.getAttribute("begin"),A=b.getAttribute("end");let I=b.textContent||"";const D=b.nextSibling;D&&D.nodeType===3&&/^\s/.test(D.textContent||"")&&!I.endsWith(" ")&&(I+=" "),I.trim()!==""&&(P.push({time:u(v),duration:u(A)-u(v),text:I}),L+=I)}n[W]={text:L.trim(),syllabus:P}}else M.textContent&&(n[W]={text:M.textContent.trim().replace(/\s+/g," ")})}}const g=[],y=i.getElementsByTagName("p");for(let E=0;E<y.length;E+=1){const m=y[E],$=m.getAttribute("itunes:key"),M=u(m.getAttribute("begin")),W=u(m.getAttribute("end"),M),C=m.getAttribute("ttm:agent")||void 0,P=m.getAttribute("xml:lang")||m.getAttribute("lang")||a;let L;m.parentNode&&m.parentNode.tagName==="div"&&(L=m.parentNode.getAttribute("itunes:songPart")||void 0);const S=[],b=[],v=m.getElementsByTagName("span"),A=Array.from(v).some(k=>!(k.getAttribute("ttm:role")==="x-bg"||k.parentNode?.getAttribute?.("ttm:role")==="x-bg")&&!!k.getAttribute("begin")&&!!k.getAttribute("end"));if(v.length>0)for(let k=0;k<v.length;k+=1){const x=v[k];if(x.getAttribute("ttm:role")==="x-bg"){const O=x.getElementsByTagName("span");for(let Y=0;Y<O.length;Y+=1){const H=O[Y];let K=H.textContent||"";const q=H.nextSibling;q&&q.nodeType===3&&/^\s/.test(q.textContent||"")&&!K.endsWith(" ")&&(K+=" ");const N=u(H.getAttribute("begin"),M);b.push({text:K,timestamp:N,endtime:Math.max(N,u(H.getAttribute("end"),W)),part:!/\s$/.test(K)})}continue}if(x.parentNode&&x.parentNode.getAttribute?.("ttm:role")==="x-bg")continue;let _=x.textContent||"";const V=x.nextSibling;V&&V.nodeType===3&&/^\s/.test(V.textContent||"")&&!_.endsWith(" ")&&(_+=" ");const F=u(x.getAttribute("begin"),M);S.push({text:_,timestamp:F,endtime:Math.max(F,u(x.getAttribute("end"),W)),part:!/\s$/.test(_)})}if(S.length===0){const k=Array.from(m.childNodes).filter(x=>!(x instanceof Element&&x.getAttribute("ttm:role")==="x-bg")).map(x=>x.textContent||"").join("").trim();S.push({text:k,timestamp:M,endtime:W,part:!1,lineSynced:!0})}const I=$?n[$]:void 0;if(I&&S.length>1&&v.length>0)if(I.syllabus&&I.syllabus.length===S.length)S.forEach((k,x)=>{k.romanizedText=I.syllabus[x].text});else{const x=I.text.split(/\s+/).filter(Boolean),_=[];for(let F=0;F<S.length;F+=1)S[F].part&&_.length>0?_[_.length-1].push(F):_.push([F]);const V=/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(S.map(F=>F.text).join(""));if(x.length===_.length)_.forEach((F,O)=>{S[F[0]].romanizedText=x[O]});else if(x.length===S.length)S.forEach((F,O)=>{F.romanizedText=x[O]});else if(V){let F=0;for(const O of _){const Y=S[O[0]],q=(O.map(N=>S[N].text).join("").match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7afA-Za-z0-9]/g)||[]).length;q>0&&F<x.length&&(Y.romanizedText=x.slice(F,F+q).join(" "),F+=q)}}}const D=m.getAttribute("begin")?M:Math.min(...S.map(k=>k.timestamp)),X=Math.max(W,D,...S.map(k=>k.endtime),...b.map(k=>k.endtime));g.push({text:S,background:b.length>0,backgroundText:b,timestamp:D,endtime:X,isWordSynced:A,songPart:L,translation:$?s[$]:void 0,romanizedText:I?.text,oppositeTurn:!1,agentId:C,direction:m.getAttribute("dir")==="rtl"||d.isRightToLeftLanguage(P)?"rtl":void 0})}const T=g.map((E,m)=>({line:E,sourceIndex:m})).sort((E,m)=>E.line.timestamp-m.line.timestamp||E.sourceIndex-m.sourceIndex).map(E=>E.line),w=d.calculateLineAlignments(T.map(E=>E.agentId),r);return{lines:T.map((E,m)=>({...E,alignment:w[m],oppositeTurn:w[m]==="end"})),songwriters:l}}catch(e){return console.error("Failed to parse TTML",e),null}}static convertKPoeLyrics(t){if(!t)return null;let e=null;if(Array.isArray(t?.lyrics)?e=t.lyrics:Array.isArray(t?.data?.lyrics)?e=t.data.lyrics:Array.isArray(t?.data)&&(e=t.data),!e||e.length===0)return null;const i=e.filter(l=>!!l),s=[],n=t.type==="Line"||t.type==="line",r={};t.metadata?.agents&&Object.entries(t.metadata.agents).forEach(([l,c])=>{const h=c.alias||l;r[h]=c.type});const a=i.map(l=>l.element?.singer),o=d.calculateLineAlignments(a,r);for(let l=0;l<i.length;l+=1){const c=i[l],h=o[l],u=typeof c.text=="string"?c.text:"",f=d.toMilliseconds(c.time),g=d.toMilliseconds(c.duration),T=d.toMilliseconds(c.endTime)||f+(g||0);let w=[];Array.isArray(c.syllabus)?w=c.syllabus.filter(P=>!!P):Array.isArray(c.words)&&(w=c.words.filter(P=>!!P));const R=[],E=[];if(!n&&w.length>0)for(const P of w){const L=d.toMilliseconds(P.time,f),S=d.toMilliseconds(P.duration),b=S===0&&w.length===1?T:L+S,v={text:typeof P.text=="string"?P.text:"",part:!!P.part,timestamp:L,endtime:b};P.isBackground?E.push(v):R.push(v)}R.length===0&&u&&R.push({text:u,part:!1,timestamp:f,endtime:T||f,lineSynced:n});const m=!n&&w.length>0&&(R.length>0||E.length>0),{transliteration:$}=c;let M;$&&(M=$.text,Array.isArray($.syllabus)&&$.syllabus.length===R.length&&$.syllabus.forEach((P,L)=>{R[L].romanizedText=P.text}));const W=c.translation?.text,C={text:R,background:E.length>0,backgroundText:E,oppositeTurn:h==="end"||(Array.isArray(c.element)?c.element.includes("opposite")||c.element.includes("right"):!1),timestamp:f,endtime:T,isWordSynced:n?!1:m,alignment:h,songPart:c.element?.songPart,romanizedText:M,translation:W};s.push(C)}return s}static toMilliseconds(t,e=0){const i=Number(t);return!Number.isFinite(i)||Number.isNaN(i)?e:Number.isInteger(i)?Math.max(0,Math.round(i)):Math.round(i*1e3)}firstUpdated(){this.lyricsContainer&&(this.lyricsContainer.addEventListener("wheel",this._boundHandleUserScroll,{passive:!0}),this.lyricsContainer.addEventListener("touchmove",this._boundHandleUserScroll,{passive:!0}))}_onTimeChanged(t,e){const s=Math.abs(e-t)>li,n=this.findActiveLineIndices(e),r=this.activeLineIndices,a=!d.arraysEqual(n,r);if(a||s){if(this.lyricsContainer){for(const o of r)if(!n.includes(o)){const l=this._getLineElement(o);if(l){s||this.isUserScrolling||d.isLineSyncedLine(this.lyrics?.[o])?d.unfinishSyllables(l):d.finishSyllablesUpToTime(l,e),l.classList.remove("active","scroll-exiting"),l.removeAttribute("aria-current"),l.classList.contains("pre-active")&&l.classList.remove("pre-active");const c=this.preActiveLineElements.indexOf(l);c!==-1&&this.preActiveLineElements.splice(c,1)}}for(const o of n)if(!r.includes(o)){const l=this._getLineElement(o);if(l){l.classList.add("active"),l.setAttribute("aria-current","true"),l.classList.remove("pre-active","scroll-exiting");const c=this.preActiveLineElements.indexOf(l);c!==-1&&this.preActiveLineElements.splice(c,1)}}for(const o of this.preActiveLineElements){const l=d.getLineIndexFromElement(o);(l===null||!n.includes(l)&&o!==this.currentPrimaryActiveLine)&&o.classList.remove("pre-active")}this.preActiveLineElements=this.preActiveLineElements.filter(o=>o.classList.contains("pre-active"))}this.startAnimationFromTime(e)}if(this._handleActiveLineScroll(r,s),(a||s)&&this.clearPastLineHighlights(),this.lyricsContainer){for(const u of this.activeLineIndices){const f=this._getLineElement(u);f&&d.updateSyllablesForLine(f,e)}const o=this.findInstrumentalGapAt(e),l=new Set(this.activeGapLineElements);if(o){const u=this._getGapElement(o.insertBeforeIndex);u&&l.add(u)}for(const u of l)this.updateInstrumentalGap(u,e);if(o){if(this.lastInstrumentalIndex=o.insertBeforeIndex,o.insertBeforeIndex>0){const u=this._getLineElement(o.insertBeforeIndex-1);u&&u.classList.contains("persist-highlight")&&!u.classList.contains("active")&&d.unfinishSyllables(u)}}else this.lastInstrumentalIndex!==null&&(this.lastInstrumentalIndex=null);const c=this.lyrics&&this.lyrics.length>0?this.lyrics[this.lyrics.length-1]:null,h=this.footerElement;if(h&&c&&c.endtime>0){const u=e>c.endtime+200;if(u&&!h.classList.contains("active")){h.classList.add("active");const f=this.lyrics?this._getLineElement(this.lyrics.length-1):null;if(f){f.classList.remove("pre-active");const g=this.preActiveLineElements.indexOf(f);g!==-1&&this.preActiveLineElements.splice(g,1)}this.autoScroll&&!this.isUserScrolling&&!this.isClickSeeking&&this.focusLine(h)}else!u&&h.classList.contains("active")&&h.classList.remove("active")}}}updated(t){if((t.has("lyrics")||t.has("isLoading")&&!this.isLoading&&!!this.lyrics)&&(this._invalidateCaches(),this._ensureLineDataCache(),this._updateCachedIsUnsynced(),this._updateCharTimingData(),this.lyricsContainer&&this.lyrics)){const i=this.findActiveLineIndices(this.currentTime);for(const r of i){const a=this._getLineElement(r);a&&(a.classList.add("active"),a.setAttribute("aria-current","true"))}const s=this.getPrimaryActiveLineIndex(i);if(this.setBackgroundExpandedLine(s!==null?this._getLineElement(s):null),this._onTimeChanged(0,this.currentTime),this.positionedLineElements.length===0){const r=this.lyricsContainer.querySelector(".lyrics-line");r&&this.updatePositionClasses(r)}this.visibilityObserver?.disconnect(),this.visibilityObserver=new IntersectionObserver(r=>{r.forEach(a=>{a.target.classList.toggle("far-line",!a.isIntersecting)})},{root:this.lyricsContainer,rootMargin:"200px",threshold:0}),this.lyricsContainer.querySelectorAll(".lyrics-line").forEach(r=>this.visibilityObserver.observe(r))}if(t.has("duration")&&this.duration===-1){this.currentTime=0,this.activeLineIndices=[],this.activeMainWordIndices.clear(),this.activeBackgroundWordIndices.clear(),this.mainWordProgress.clear(),this.backgroundWordProgress.clear(),this.mainWordAnimations.clear(),this.backgroundWordAnimations.clear(),this.preActiveLineElements=[],this.positionedLineElements=[],this.activeGapLineElements=[],this.clearBackgroundExpandedLine(),this.setUserScrolling(!1),this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=void 0),this.userScrollTimeoutId&&(clearTimeout(this.userScrollTimeoutId),this.userScrollTimeoutId=void 0),this.scrollUnlockTimeout&&(clearTimeout(this.scrollUnlockTimeout),this.scrollUnlockTimeout=void 0),this.scrollAnimationTimeout&&(clearTimeout(this.scrollAnimationTimeout),this.scrollAnimationTimeout=void 0),this.lyricsContainer&&(this.lyricsContainer.scrollTop=0);return}(t.has("query")||t.has("musicId")||t.has("isrc")||t.has("ttml")||t.has("songTitle")||t.has("songArtist")||t.has("songAlbum")||t.has("songDurationMs"))&&!t.has("currentTime")&&this.fetchLyrics(),t.has("currentTime")&&this.lyrics}_handleActiveLineScroll(t,e=!1){if(!this.lyricsContainer||!this.lyrics||this.lyrics.length===0)return;if(this.lyricsContainer.querySelector(".lyrics-footer")?.classList.contains("active")){this.setBackgroundExpandedLine(null);return}let s=350,n=-1;for(let c=0;c<this.lyrics.length;c+=1)if(this.lyrics[c].timestamp>this.currentTime){n=c-1;break}if(n===-1&&this.lyrics.length>0&&this.currentTime>=this.lyrics[this.lyrics.length-1].timestamp&&(n=this.lyrics.length-1),n!==-1&&n+1<this.lyrics.length){const c=this.lyrics[n],u=this.lyrics[n+1].timestamp-c.endtime;s=Math.min(500,Math.max(350,u))}const r=this.currentTime+s,a=this.findActiveLineIndices(r);let o=null;if(a.length>0){const c=this.getPrimaryScrollLineIndex(a,r);c!==null&&c!==-1&&(o=this._getLineElement(c))}if(!o){const c=this.getLineIndexAtTime(r,0);c!==null&&c!==-1&&(o=this._getLineElement(c))}if(!o)return;const l=s;(o!==this.currentPrimaryActiveLine||e)&&o.style.setProperty("--scroll-duration",`${l}ms`),o.classList.contains("active")||(o.classList.add("pre-active"),this.preActiveLineElements.includes(o)||this.preActiveLineElements.push(o)),this.focusLine(o,e,l),this.setBackgroundExpandedLine(o)}_getTextWidth(t,e){return this._textWidthCanvas||(this._textWidthCanvas=document.createElement("canvas"),this._textWidthCtx=this._textWidthCanvas.getContext("2d",{willReadFrequently:!0})),this._textWidthCtx?(this._textWidthCtx.font=e,this._textWidthCtx.measureText(t).width):0}_rebuildDomCache(){if(!this.lyricsContainer||(this.lineElementCache.clear(),this.gapElementCache.clear(),this.footerElement=this.lyricsContainer.querySelector(".lyrics-footer")??void 0,this.cachedLineArray=[],!this.lyrics))return;for(let e=0;e<this.lyrics.length;e+=1){const i=this.lyricsContainer.querySelector(`#lyrics-line-${e}`);i&&this.lineElementCache.set(e,i);const s=this.lyricsContainer.querySelector(`#gap-${e}`);s&&(s._cachedStartTime=parseFloat(s.getAttribute("data-start-time")||"0"),s._cachedEndTime=parseFloat(s.getAttribute("data-end-time")||"0"),this.gapElementCache.set(e,s))}const t=this.lyricsContainer.querySelectorAll(".lyrics-line");this.cachedLineArray=Array.from(t)}_getLineElement(t){const e=this.lineElementCache.get(t);if(e)return e;if(!this.lyricsContainer)return null;const i=this.lyricsContainer.querySelector(`#lyrics-line-${t}`);return i&&this.lineElementCache.set(t,i),i}_getGapElement(t){const e=this.gapElementCache.get(t);if(e)return e;if(!this.lyricsContainer)return null;const i=this.lyricsContainer.querySelector(`#gap-${t}`);return i&&this.gapElementCache.set(t,i),i}_invalidateCaches(){this.cachedAllGaps=[],this.cachedIsUnsynced=!1,this.cachedLineData=null,this.lineElementCache.clear(),this.gapElementCache.clear(),this.footerElement=void 0,this.cachedLineArray=[],this.preActiveLineElements=[],this.positionedLineElements=[],this.activeGapLineElements=[],this.clearBackgroundExpandedLine(),this.visibilityObserver?.disconnect(),this.visibilityObserver=void 0}_updateCachedIsUnsynced(){this.cachedIsUnsynced=this.lyrics&&this.lyrics.length>0?this.lyrics.every(t=>t.timestamp===0&&t.endtime===0):!1}_ensureLineDataCache(){this.cachedLineData||!this.lyrics||(this.cachedLineData=this.lyrics.map(t=>{const e=[];let i=[];t.text.forEach((y,T)=>{i.push(y);const w=t.text[T+1];(!w||y.part===!1||/\s$/.test(y.text)||w&&y.isBackground!==w.isBackground)&&(e.push(i),i=[])}),i.length>0&&e.push(i);const s=new Array(e.length).fill(!1),n=new Array(e.length).fill(!1),r=new Array(e.length).fill(!1),a=new Array(e.length).fill(!1),o=new Array(e.length).fill(""),l=new Array(e.length).fill(0),c=new Array(e.length).fill(0),h=new Array(e.length).fill(0),u=new Array(e.length).fill(0);let f=t.direction==="rtl",g=0;for(;g<e.length;){let y=g;for(;y<e.length-1;){const k=e[y],x=k[k.length-1].text;if(/\s$/.test(x))break;y+=1}const T=e.slice(g,y+1).flatMap(k=>k.map(x=>x.text)).join("").trim(),w=e[g][0].timestamp,R=e[y],E=R[R.length-1].endtime,m=E-w,$=/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(T),M=/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF]/.test(T);M&&(f=!0);const W=T.includes("-"),C=T.length,P=!$&&!M&&!W&&C>0,L=t.isWordSynced===!1||t.text.some(k=>k.lineSynced);let S=P&&C>0&&C<=7;S&&(C<=1?S=m>=1050&&m>=C*525:C<=3?S=m>=Si+(C-2)*140:S=m>=850&&m>=C*190);const b=m>=Math.max(1600,C*135),v=C>=2&&C<=3&&m>=Math.max(wi,C*150),A=P&&!L&&!S&&C>=12&&b,I=P&&!L&&!S&&v,D=S&&!L;let X=0;for(let k=g;k<=y;k+=1){s[k]=S,n[k]=D,r[k]=A,a[k]=I,o[k]=T,l[k]=m,c[k]=X,h[k]=w,u[k]=E;const x=e[k].map(_=>_.text).join("");X+=x.replace(/\s/g,"").length}g=y+1}return{wordGroups:e,groupGrowable:s,groupGlowing:n,groupCharRise:r,groupCharDrag:a,vwFullText:o,vwFullDuration:l,vwCharOffset:c,vwStartMs:h,vwEndMs:u,lineIsRTL:f}}))}_updateCharTimingData(){if(!this.shadowRoot)return;this._rebuildDomCache();const t=this.shadowRoot.querySelector(".lyrics-syllable");if(!t)return;const e=getComputedStyle(t),{font:i}=e,s=Number.parseFloat(e.fontSize)||16,n=Array.from(this.shadowRoot.querySelectorAll(".lyrics-word.growable, .lyrics-word.char-rise, .lyrics-word.char-drag"));if(n.length===0)return;const r=new Map;n.forEach((a,o)=>{const l=a.dataset.virtualWordId||`word-${o}`,c=r.get(l);c?c.push(a):r.set(l,[a])}),r.forEach(a=>{const o=[];a.forEach(m=>{m.querySelectorAll(".lyrics-syllable-wrap").forEach(M=>{const W=M.querySelector(".lyrics-syllable");W&&o.push(W)})});const l=o.flatMap(m=>{const $=Array.from(m.querySelectorAll(".char")),M=m;return M._cachedCharSpans=$,$});if(l.length===0)return;a.forEach(m=>{const $=m;$._cachedVirtualWordElements=a,$._cachedVirtualWordCharSpans=l});const c=o.map(m=>{const $=m._cachedCharSpans,M=$.map(C=>this._getTextWidth(C.textContent||"",i)),W=M.reduce((C,P)=>C+P,0);return{syl:m,spans:$,charWidths:M,totalWidth:W,start:parseFloat(m.getAttribute("data-start-time")||""),end:parseFloat(m.getAttribute("data-end-time")||"")}}),h=c.reduce((m,$)=>m+$.totalWidth,0);if(h<=0)return;const u=Math.min(...c.map(m=>m.start).filter(m=>Number.isFinite(m))),f=Math.max(...c.map(m=>m.end).filter(m=>Number.isFinite(m))),g=f-u,y=Number.isFinite(u)&&Number.isFinite(f)&&g>0,T=y?h/g:0,w=pe*Math.max(1,s)/2,R=T>0?w/T:100;let E=0;c.forEach(m=>{let $=0;const M=m.end-m.start,W=y&&Number.isFinite(m.start)&&Number.isFinite(m.end)&&M>0&&m.totalWidth>0;m.spans.forEach((C,P)=>{const L=m.charWidths[P];let S=E/h,b=L/h;if(W){const A=m.start-u+$/m.totalWidth*M,I=L/m.totalWidth*M;S=d.clamp(A/g,0,1),b=d.clamp(I/g,0,1)}const v=C;v.dataset.wipeStart=S.toFixed(4),v.dataset.wipeDuration=b.toFixed(4),v.dataset.preWipeDuration=R.toFixed(2),v.style.setProperty("--word-wipe-width",`${h}px`),v.style.setProperty("--char-wipe-position",`${-E}px`),E+=L,$+=L})})})}static arraysEqual(t,e){return t.length===e.length&&t.every((i,s)=>i===e[s])}static isLineSyncedLine(t){return t?t.isWordSynced===!1||t.text.some(e=>e.lineSynced):!1}getLineHighlightEndTime(t){if(!this.lyrics)return 0;const e=this.lyrics[t];if(!e)return 0;const i=e.backgroundText?.reduce((r,a)=>Math.max(r,a.endtime),e.timestamp),s=Math.max(e.endtime,i??e.timestamp,e.timestamp),n=this.lyrics[t+1];return!n||n.timestamp<=e.timestamp?s>e.timestamp?s+200:s:s>e.timestamp&&(n.timestamp<s||n.timestamp-s>=wt)?s:n.timestamp}static getLineIndexFromElement(t){if(!t)return null;const e=t.id.match(/^lyrics-line-(\d+)$/);return e?parseInt(e[1],10):null}static easeOutExpo(t){return t<=0?0:t>=1?1:1-2**(-10*t)}static getCssTimeMs(t,e,i){const s=getComputedStyle(t).getPropertyValue(e).trim(),n=Number.parseFloat(s);return Number.isFinite(n)?s.endsWith("ms")?n:n*1e3:i}updateInstrumentalGap(t,e){const i=t._cachedStartTime??parseFloat(t.getAttribute("data-start-time")||"0"),s=t._cachedEndTime??parseFloat(t.getAttribute("data-end-time")||"0");let n=this.gapExitDurationCache.get(t);n===void 0&&(n=d.getCssTimeMs(t,"--am-lyrics-instrumental-exit-duration",mi),this.gapExitDurationCache.set(t,n));let r=this.gapCollapseDurationCache.get(t);r===void 0&&(r=d.getCssTimeMs(t,"--am-lyrics-instrumental-collapse-duration",pi),this.gapCollapseDurationCache.set(t,r));let a=this.gapDotCache.get(t);a||(a=Array.from(t.querySelectorAll(".lyrics-syllable")),this.gapDotCache.set(t,a));const o=e>=i&&e<s,l=t.classList.contains("gap-exiting")&&e<s+gi;if(!o){if(l){t.style.setProperty("--gap-exit-scale","0"),t.style.setProperty("--gap-exit-opacity","0");return}if(t.classList.contains("active")||t.classList.contains("gap-collapsing")||t.classList.contains("gap-exiting")){t.classList.remove("active","gap-collapsing","gap-exiting"),t.style.setProperty("--gap-scale","0"),t.style.setProperty("--gap-opacity","0"),t.style.removeProperty("--gap-exit-scale"),t.style.removeProperty("--gap-exit-opacity"),a.forEach(v=>{v.style.removeProperty("--gap-dot-opacity")});const b=this.activeGapLineElements.indexOf(t);b!==-1&&this.activeGapLineElements.splice(b,1)}return}const c=Math.max(1,s-i),h=d.clamp(e-i,0,c),u=Math.max(0,s-e),f=r+n,g=u<=r,y=u<=f;t.classList.toggle("active",!g),t.classList.toggle("gap-collapsing",g),t.classList.toggle("gap-exiting",y),this.activeGapLineElements.includes(t)||this.activeGapLineElements.push(t);const T=Dt*2,R=((c-f)%T+T)%T,E=((Dt-R)%T+T)%T,m=(h+E)%T,$=(1-Math.cos(Math.PI*m/Dt))/2,M=he+(Ot-he)*$,W=d.easeOutExpo(d.clamp(h/ui,0,1)),C=M*W,P=d.clamp(h/hi,0,1);if(t.style.setProperty("--gap-scale",C.toFixed(4)),t.style.setProperty("--gap-opacity",P.toFixed(4)),y){const b=d.clamp((f-u)/Math.max(1,n),0,1);let v,A=1;if(b<=Lt){const I=d.clamp(b/Lt,0,1),D=I*I*(3-2*I);v=Ot+(ue-Ot)*D}else{const I=d.clamp((b-Lt)/(1-Lt),0,1),D=I*I*(3-2*I);v=ue*(1-D),A=1-D}t.style.setProperty("--gap-exit-scale",v.toFixed(4)),t.style.setProperty("--gap-exit-opacity",A.toFixed(4))}else t.style.removeProperty("--gap-exit-scale"),t.style.removeProperty("--gap-exit-opacity");const L=Math.max(1,c-f),S=d.clamp(h/L,0,1);a.forEach((b,v)=>{const A=d.clamp(S*3-v,0,1);b.style.setProperty("--gap-dot-opacity",(.25+A*.75).toFixed(3))}),d.updateSyllablesForLine(t,e)}clearPreActiveClasses(t=null){if(!this.lyricsContainer)return;const e=[];for(const i of this.preActiveLineElements)d.getLineIndexFromElement(i)===t?e.push(i):i.classList.remove("pre-active");this.preActiveLineElements=e}setBackgroundExpandedLine(t){const e=t&&!t.classList.contains("lyrics-gap")&&t.querySelector(".background-vocal-container")?t:null;if(this.backgroundExpandedLine===e){if(e&&!e.classList.contains("bg-expanded")){const s=this.backgroundCollapseTimeouts.get(e);s!==void 0&&clearTimeout(s),this.backgroundCollapseTimeouts.delete(e),e.classList.remove("bg-collapsing"),e.style.removeProperty("--background-vocal-exit-duration"),this.scheduleBackgroundExpansion(e)}return}this.backgroundExpandFrameId!==void 0&&(cancelAnimationFrame(this.backgroundExpandFrameId),this.backgroundExpandFrameId=void 0);const i=this.backgroundExpandedLine;if(i){i.classList.remove("bg-expanded");const s=this.backgroundCollapseTimeouts.get(i);s!==void 0&&clearTimeout(s);const n=d.getCssTimeMs(i,"--scroll-duration",d.getCssTimeMs(i,"--am-lyrics-background-vocal-exit-duration",ci));i.style.setProperty("--background-vocal-exit-duration",`${n}ms`),i.classList.add("bg-collapsing");const r=window.setTimeout(()=>{i.classList.remove("bg-collapsing"),i.style.removeProperty("--background-vocal-exit-duration"),this.backgroundCollapseTimeouts.delete(i)},n);this.backgroundCollapseTimeouts.set(i,r)}if(this.backgroundExpandedLine=e,e){const s=this.backgroundCollapseTimeouts.get(e);s!==void 0&&clearTimeout(s),this.backgroundCollapseTimeouts.delete(e),e.classList.remove("bg-collapsing"),e.style.removeProperty("--background-vocal-exit-duration"),this.scheduleBackgroundExpansion(e)}}scheduleBackgroundExpansion(t){if(this.backgroundExpandFrameId!==void 0)return;const e=t.querySelector(".background-vocal-container");e&&(t.style.setProperty("--am-lyrics-background-vocal-height",`${Math.ceil(e.scrollHeight+4)}px`),t.classList.remove("bg-expanded"),this.backgroundExpandFrameId=requestAnimationFrame(()=>{this.backgroundExpandFrameId=requestAnimationFrame(()=>{this.backgroundExpandFrameId=void 0,this.backgroundExpandedLine===t&&t.classList.add("bg-expanded")})}))}clearBackgroundExpandedLine(){this.backgroundExpandFrameId!==void 0&&(cancelAnimationFrame(this.backgroundExpandFrameId),this.backgroundExpandFrameId=void 0),this.backgroundExpandedLine?.classList.remove("bg-expanded","bg-collapsing"),this.backgroundExpandedLine?.style.removeProperty("--background-vocal-exit-duration");for(const[t,e]of this.backgroundCollapseTimeouts)clearTimeout(e),t.classList.remove("bg-collapsing"),t.style.removeProperty("--background-vocal-exit-duration");this.backgroundCollapseTimeouts.clear(),this.backgroundExpandedLine=null}getPrimaryActiveLineIndex(t){if(t.length===0)return null;const e=t[0],i=t[t.length-1];let s=Math.max(e,i-2);const n=d.getLineIndexFromElement(this.currentPrimaryActiveLine);return n!==null&&t.includes(n)&&(t.length<=3||s<n)&&(s=n),s}getPrimaryScrollLineIndex(t,e){if(!this.lyrics||this.lyrics.length===0)return null;const i=this.getLineIndexAtTime(e,this.lastActiveIndex);if(i===-1)return null;const s=d.getLineIndexFromElement(this.currentPrimaryActiveLine);return s!==null&&i>s&&this.lyrics[s]&&this.lyrics[i]&&this.lyrics[s].endtime===this.lyrics[i].endtime&&this.findActiveLineIndices(e).length<=3?s:i}getOverlapClusterForActiveIndices(t,e){if(!this.lyrics||t.length===0)return null;let i=t[0];for(;i>0&&this.lyrics[i-1].endtime>=this.lyrics[i].timestamp;)i-=1;let s=i,n=this.lyrics[i].endtime;for(;s+1<this.lyrics.length&&this.lyrics[s+1].timestamp<=n;)s+=1,n=Math.max(n,this.lyrics[s].endtime);let r=i,a=this.lyrics[i].endtime;for(let o=i;o<=s&&this.lyrics[o].timestamp<=e;o+=1)r=o,a=Math.max(a,this.lyrics[o].endtime);return{start:i,end:s,startedEnd:r,startedEndTime:a}}focusLine(t,e=!1,i=void 0,s=!1,n=!1){const r=t!==this.currentPrimaryActiveLine;if(r&&!n){this.lastPrimaryActiveLine=this.currentPrimaryActiveLine,this.lastPrimaryActiveLine&&(this.lastPrimaryActiveLine.style.setProperty("--scroll-duration",`${i??$t}ms`),this.lastPrimaryActiveLine.classList.add("scroll-exiting")),this.currentPrimaryActiveLine=t,this.currentPrimaryActiveLine.classList.remove("scroll-exiting");const a=d.getLineIndexFromElement(t);a!==null&&(this.lastActiveIndex=a)}(r||e)&&this.updatePositionClasses(t),!s&&(e||r||n)&&this.autoScroll&&!this.isUserScrolling&&!this.isClickSeeking&&this.scrollToActiveLineYouLy(t,e,i)}setUserScrolling(t){this.isUserScrolling=t,t?this.lyricsContainer?.classList.add("user-scrolling"):this.lyricsContainer?.classList.remove("user-scrolling")}handleUserScroll(){this.isProgrammaticScroll||this.isClickSeeking||(this.setUserScrolling(!0),this.clearPastLineHighlights(),this.userScrollTimeoutId&&clearTimeout(this.userScrollTimeoutId),this.userScrollTimeoutId=window.setTimeout(()=>{this.setUserScrolling(!1),this.userScrollTimeoutId=void 0,this.activeLineIndices.length>0&&this._handleActiveLineScroll([],!1)},di))}clearPastLineHighlights(){if(!this.lyricsContainer)return;const t=this.cachedLineArray.length?this.cachedLineArray:Array.from(this.lyricsContainer.querySelectorAll(".lyrics-line:not(.lyrics-gap)")),i=this.lyricsContainer.getBoundingClientRect().top+this.getScrollPaddingTop();for(let s=0;s<t.length;s+=1){const n=t[s],r=n.classList.contains("active"),o=n.getBoundingClientRect().bottom<i-2;!r&&o&&d.unfinishSyllables(n)}}getLineIndexAtTime(t,e=0){if(!this.lyrics||this.lyrics.length===0)return-1;const i=this.lyrics.length,s=Math.max(0,Math.min(e,i-1));for(let n=s;n<i;n+=1){const r=this.lyrics[n];if(r.timestamp>t)break;if(t>=r.timestamp&&t<r.endtime)return n}for(let n=s-1;n>=0;n-=1){const r=this.lyrics[n];if(t>=r.timestamp&&t<r.endtime)return n;if(r.endtime<t)break}for(let n=0;n<i;n+=1){const r=this.lyrics[n];if(r.timestamp>t)break;if(t>=r.timestamp&&t<r.endtime)return n}return-1}findActiveLineIndices(t){if(!this.lyrics||this.lyrics.length===0)return[];const e=[];for(let i=0;i<this.lyrics.length;i+=1){const s=this.lyrics[i],n=this.getLineHighlightEndTime(i);if(s.timestamp>t)break;t>=s.timestamp&&t<n&&e.push(i)}return e}findInstrumentalGapAt(t){if(!this.lyrics||this.lyrics.length===0)return null;const e=this.lyrics[0];if(t>=0&&t<e.timestamp){const s=e.timestamp;return s-0>=wt?{insertBeforeIndex:0,gapStart:0,gapEnd:s}:null}for(let i=0;i<this.lyrics.length-1;i+=1){const s=this.lyrics[i],n=this.lyrics[i+1],r=s.endtime,a=n.timestamp;if(t>r&&t<a)return a-r>=wt?{insertBeforeIndex:i+1,gapStart:r,gapEnd:a}:null}return null}findAllInstrumentalGaps(){if(this.cachedAllGaps.length>0)return this.cachedAllGaps;if(!this.lyrics||this.lyrics.length===0)return[];const t=[],e=this.lyrics[0];e.timestamp>=wt&&t.push({insertBeforeIndex:0,gapStart:0,gapEnd:e.timestamp});for(let i=0;i<this.lyrics.length-1;i+=1){const s=this.lyrics[i],n=this.lyrics[i+1],r=s.endtime,a=n.timestamp;a-r>=wt&&t.push({insertBeforeIndex:i+1,gapStart:r,gapEnd:a})}return this.cachedAllGaps=t,t}startAnimationFromTime(t){if(this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=void 0),!this.lyrics)return;const e=this.findActiveLineIndices(t);if(d.arraysEqual(e,this.activeLineIndices)||(this.activeLineIndices=e),this.activeMainWordIndices.clear(),this.activeBackgroundWordIndices.clear(),this.mainWordAnimations.clear(),this.backgroundWordAnimations.clear(),this.mainWordProgress.clear(),this.backgroundWordProgress.clear(),e.length!==0){for(const i of e){const s=this.lyrics[i];let n=-1;for(let a=0;a<s.text.length;a+=1)if(t>=s.text[a].timestamp&&t<=s.text[a].endtime){n=a;break}this.activeMainWordIndices.set(i,n);let r=-1;if(s.backgroundText){for(let a=0;a<s.backgroundText.length;a+=1)if(t>=s.backgroundText[a].timestamp&&t<=s.backgroundText[a].endtime){r=a;break}}this.activeBackgroundWordIndices.set(i,r)}this.setupAnimations(),this.interpolate&&this.animateProgress()}}updateActiveLineAndWords(){if(!this.lyrics)return;const t=this.findActiveLineIndices(this.currentTime);d.arraysEqual(t,this.activeLineIndices)||(this.activeLineIndices=t),this.activeMainWordIndices.clear(),this.activeBackgroundWordIndices.clear();for(const e of t){const i=this.lyrics[e];let s=-1;for(let r=0;r<i.text.length;r+=1)if(this.currentTime>=i.text[r].timestamp&&this.currentTime<=i.text[r].endtime){s=r;break}this.activeMainWordIndices.set(e,s);let n=-1;if(i.backgroundText){for(let r=0;r<i.backgroundText.length;r+=1)if(this.currentTime>=i.backgroundText[r].timestamp&&this.currentTime<=i.backgroundText[r].endtime){n=r;break}}this.activeBackgroundWordIndices.set(e,n)}}setupAnimations(){if(this.activeLineIndices.length===0||!this.lyrics){this.mainWordAnimations.clear(),this.backgroundWordAnimations.clear();return}for(const t of this.activeLineIndices){const e=this.lyrics[t],i=this.activeMainWordIndices.get(t)??-1,s=this.activeBackgroundWordIndices.get(t)??-1;if(i!==-1){const n=e.text[i],r=n.endtime-n.timestamp,a=this.currentTime-n.timestamp;this.mainWordAnimations.set(t,{startTime:performance.now()-a,duration:r})}else this.mainWordAnimations.set(t,{startTime:0,duration:0});if(s!==-1&&e.backgroundText){const n=e.backgroundText[s],r=n.endtime-n.timestamp,a=this.currentTime-n.timestamp;this.backgroundWordAnimations.set(t,{startTime:performance.now()-a,duration:r})}else this.backgroundWordAnimations.set(t,{startTime:0,duration:0})}}handleLineClick(t){if(this.cachedIsUnsynced)return;this.lyricsContainer&&(this.lyricsContainer.querySelectorAll(".lyrics-line").forEach(n=>{d.resetSyllables(n),n.classList.remove("scroll-animate","scroll-exiting"),n.style.removeProperty("--scroll-delta"),n.style.removeProperty("--lyrics-line-delay")}),this.lyricsContainer.classList.remove("wheel-scrolling")),this.scrollAnimationState&&(this.scrollAnimationState.isAnimating=!1,this.scrollAnimationState.pendingUpdate=null),this.scrollAnimationTimeout&&(clearTimeout(this.scrollAnimationTimeout),this.scrollAnimationTimeout=void 0),this.userScrollTimeoutId&&(clearTimeout(this.userScrollTimeoutId),this.userScrollTimeoutId=void 0),this.setUserScrolling(!1),this.currentPrimaryActiveLine=null,this.lastPrimaryActiveLine=null,this.activeLineIds.clear(),this.animatingLines=[],this.setBackgroundExpandedLine(null);const e=this.lyricsContainer?.querySelector(`.lyrics-line[data-start-time="${t.text[0]?.timestamp||0}"]`);e&&this.lyricsContainer&&(this.currentPrimaryActiveLine=e,this.currentScrollOffset=-this.lyricsContainer.scrollTop,this.isClickSeeking=!0,this.clickSeekTimeout&&clearTimeout(this.clickSeekTimeout),this.clickSeekTimeout=setTimeout(()=>{this.isClickSeeking=!1},800),this.scrollToActiveLineYouLy(e,!0),this.setBackgroundExpandedLine(e));const i=new CustomEvent("line-click",{detail:{timestamp:t.timestamp},bubbles:!0,composed:!0});this.dispatchEvent(i)}static getBackgroundTextPlacement(t){if(!t.backgroundText||t.backgroundText.length===0||t.text.length===0)return"after";const e=t.text[0].timestamp;return t.backgroundText[0].timestamp<e?"before":"after"}scrollToActiveLine(){if(!this.lyricsContainer||this.activeLineIndices.length===0)return;const t=Math.min(...this.activeLineIndices),e=this.lyricsContainer.querySelector(`.lyrics-line:nth-child(${t+1})`);if(e){const i=this.lyricsContainer.clientHeight,s=e.offsetTop,n=e.clientHeight,r=e.querySelector(".background-text.before");let a=0;r&&(a=r.clientHeight/2);const o=s-i/2+n/2-a;requestAnimationFrame(()=>{this.isProgrammaticScroll=!0,this.lyricsContainer?.scrollTo({top:o,behavior:"smooth"}),setTimeout(()=>{this.isProgrammaticScroll=!1},100)})}}scrollToInstrumental(t){if(!this.lyricsContainer)return;const e=this.lyricsContainer.querySelector(`#gap-${t}`);if(e){const s=this.getScrollPaddingTop()-e.offsetTop;this.isProgrammaticScroll=!0,this.clearPastLineHighlights(),this.animateScrollYouLy(s,!1),setTimeout(()=>{this.isProgrammaticScroll=!1},250)}}getScrollPaddingTop(){if(!this.lyricsContainer)return 0;const e=getComputedStyle(this.lyricsContainer).getPropertyValue("--lyrics-scroll-padding-top")||"12%";let i;return e.includes("%")?i=this.lyricsContainer.clientHeight*(parseFloat(e)/100):i=parseFloat(e)||0,i}animateScrollYouLy(t,e=!1,i=void 0){if(!this.lyricsContainer)return;const s=this.lyricsContainer,n=Math.max(0,s.scrollHeight-s.clientHeight),r=d.clamp(-t,0,n);this.scrollAnimationState||(this.scrollAnimationState={isAnimating:!1,pendingUpdate:null},this.animatingLines=[]);const a=this.scrollAnimationState;if(a.isAnimating&&!e){const b=a.pendingUpdate===null?null:Math.max(0,-a.pendingUpdate);if(Math.abs(s.scrollTop-r)<2||b!==null&&Math.abs(b-r)<2)return;a.pendingUpdate=t;return}this.scrollAnimationTimeout&&(clearTimeout(this.scrollAnimationTimeout),this.scrollAnimationTimeout=void 0),this.scrollUnlockTimeout&&(clearTimeout(this.scrollUnlockTimeout),this.scrollUnlockTimeout=void 0);const{animatingLines:o}=this,l=-r,c=d.clamp(s.scrollTop,0,n),u=-c-l;if(this.currentScrollOffset=l,Math.abs(c-r)<1&&Math.abs(u)<1){a.isAnimating=!1,a.pendingUpdate=null;return}if(e){for(const b of o)b.classList.remove("scroll-animate"),b.style.removeProperty("--scroll-delta"),b.style.removeProperty("--lyrics-line-delay"),b.style.removeProperty("--scroll-duration");o.length=0,s.scrollTo({top:r,behavior:"smooth"}),a.isAnimating=!1,a.pendingUpdate=null;return}for(const b of o)b.classList.remove("scroll-animate"),b.style.removeProperty("--scroll-delta"),b.style.removeProperty("--lyrics-line-delay"),b.style.removeProperty("--scroll-duration");if(o.length=0,this.cachedLineArray.length===0){const b=this.lyricsContainer.querySelectorAll(".lyrics-line");this.cachedLineArray=Array.from(b)}const f=this.cachedLineArray,g=this.currentPrimaryActiveLine||this.lastPrimaryActiveLine||f[0];if(!g)return;const y=f.indexOf(g);if(y===-1)return;const T=Math.min(450,i??$t),w=T*.1,R=4,E=20,m=f.length,$=Math.max(0,y-E),M=Math.min(m,y+E);let W=0;const C=[],P=new Map;if(u>=0){let b=0;for(let v=$;v<M;v+=1){const A=f[v],I=v>=y?Math.min(b,R)*w:0;v>=y&&!A.classList.contains("lyrics-gap")&&(b+=1),A.style.setProperty("--scroll-delta",`${u}px`),A.style.setProperty("--lyrics-line-delay",`${I}ms`),P.set(A,I),C.push(A);const D=T+100+I;D>W&&(W=D)}}else{let b=0;for(let v=M-1;v>=$;v-=1){const A=f[v],I=v<=y?Math.min(b,R)*w:0;v<=y&&!A.classList.contains("lyrics-gap")&&(b+=1),A.style.setProperty("--scroll-delta",`${u}px`),A.style.setProperty("--lyrics-line-delay",`${I}ms`),P.set(A,I),C.push(A);const D=T+100+I;D>W&&(W=D)}}for(const b of C){const v=P.get(b)??0;b.style.setProperty("--scroll-duration",`${Math.max(100,W-v)}ms`)}s.scrollTop=r,s.offsetHeight;for(const b of C)b.classList.add("scroll-animate"),o.push(b);a.isAnimating=!0;const S=400;this.scrollUnlockTimeout=setTimeout(()=>{if(a.isAnimating=!1,a.pendingUpdate!==null){const b=a.pendingUpdate;a.pendingUpdate=null,this.animateScrollYouLy(b,!1,i)}},S),this.scrollAnimationTimeout=setTimeout(()=>{for(let b=0;b<o.length;b+=1){const v=o[b];v.classList.remove("scroll-animate"),v.style.removeProperty("--scroll-delta"),v.style.removeProperty("--lyrics-line-delay"),v.style.removeProperty("--scroll-duration")}o.length=0,this.scrollAnimationTimeout=void 0},W+50)}updatePositionClasses(t){if(!this.lyricsContainer)return;const e=["lyrics-activest","post-active-line","next-active-line","prev-1","prev-2","prev-3","prev-4","next-1","next-2","next-3","next-4"];for(const n of this.positionedLineElements)n.classList.remove(...e);this.positionedLineElements=[],t.classList.add("lyrics-activest"),this.positionedLineElements.push(t),this.cachedLineArray.length===0&&(this.cachedLineArray=Array.from(this.lyricsContainer.querySelectorAll(".lyrics-line")));const i=this.cachedLineArray,s=i.indexOf(t);if(s!==-1)for(let n=Math.max(0,s-4);n<=Math.min(i.length-1,s+4);n+=1){const r=n-s;if(r!==0){const a=i[n];r===-1?a.classList.add("post-active-line"):r===1?a.classList.add("next-active-line"):r<0?a.classList.add(`prev-${Math.abs(r)}`):a.classList.add(`next-${r}`),this.positionedLineElements.push(a)}}}scrollToActiveLineYouLy(t,e=!1,i=void 0){if(!t||!this.lyricsContainer)return;const s=this.getScrollPaddingTop(),n=t.previousElementSibling,r=n instanceof HTMLElement&&n.classList.contains("lyrics-gap")&&(n.classList.contains("active")||n.classList.contains("gap-collapsing")||n.classList.contains("gap-exiting"))?n:null,a=t.offsetTop-(r?.offsetHeight??0),o=Math.max(0,a-s),l=-o;if(!e&&Math.abs(this.lyricsContainer.scrollTop-o)<1)return;if(!e&&!t.classList.contains("lyrics-footer")){const h=this.lyricsContainer;if(h.scrollTop+h.clientHeight>=h.scrollHeight-50&&o>h.scrollTop-50)return}this.lyricsContainer.classList.remove("not-focused","user-scrolling"),this.isProgrammaticScroll=!0,this.setUserScrolling(!1),this.userScrollTimeoutId&&(clearTimeout(this.userScrollTimeoutId),this.userScrollTimeoutId=void 0),this.clearPastLineHighlights(),setTimeout(()=>{this.isProgrammaticScroll=!1},(i??$t)+160),this.animateScrollYouLy(l,e,i)}static clamp(t,e,i){return Math.min(i,Math.max(e,t))}static getVisibleCharacterCount(t){const e=parseFloat(t.getAttribute("data-word-length")||"");return Number.isFinite(e)&&e>0?e:(t.textContent||"").replace(/\s/g,"").length}static getLongWordWipeScale(t){return t<=6?1:1+d.clamp((t-6)/10,0,1)*xi}static applyWipeShape(t,e){const i=d.clamp((e-6)/10,0,1)*vi,s=pe+i;t.style.setProperty("--wipe-gradient-width",`${s.toFixed(3)}em`),t.style.setProperty("--wipe-gradient-half",`${(s/2).toFixed(3)}em`)}static ensureWordWipeGeometry(t,e){if(t.length===0)return;const i=Math.max(1,e||t.length);t.forEach((s,n)=>{if(s.style.getPropertyValue("--word-wipe-width")||s.style.setProperty("--word-wipe-width",`${i}ch`),!s.style.getPropertyValue("--char-wipe-position")){const r=Number.parseFloat(s.dataset.wipeStart||`${n/Math.max(1,t.length)}`);s.style.setProperty("--char-wipe-position",`${-(d.clamp(r,0,1)*i)}ch`)}})}static clearPreHighlight(t){const e=t;e.classList.remove("pre-highlight"),e.style.removeProperty("--pre-wipe-duration"),e.style.removeProperty("--pre-wipe-delay"),e.style.animation="",e.querySelectorAll(".pre-wipe-lead").forEach(i=>d.clearPreWipeLead(i))}static clearPreWipeLead(t){t.classList.remove("pre-wipe-lead"),t.style.removeProperty("--pre-wipe-duration"),t.style.removeProperty("--pre-wipe-delay")}static hasTextBoundaryAfter(t){return/\s$/.test(t.textContent||"")}static getSyllableWordIndex(t){const e=d.getWordElementForSyllable(t),i=e?.dataset.virtualWordId;if(i)return`virtual:${i}`;const s=e?.dataset.virtualWordStart,n=e?.dataset.virtualWordEnd;return s||n?`virtual:${s||""}:${n||""}`:t.getAttribute("data-word-index")||t.getAttribute("data-syllable-index")||""}static getNextWordSyllable(t,e){const i=t[e],s=d.getSyllableWordIndex(i),n=i;for(let r=e+1;r<t.length;r+=1){const a=t[r];if(a.classList.contains("transliteration"))continue;return d.getSyllableWordIndex(a)===s||!d.hasTextBoundaryAfter(n)?null:a}return null}static getPreviousNonTransliterationSyllable(t,e){for(let i=e-1;i>=0;i-=1){const s=t[i];if(!s.classList.contains("transliteration"))return s}return null}static getRenderedWordSyllables(t){const e=d.getWordElementForSyllable(t);return d.getCachedVirtualWordElements(e).flatMap(n=>Array.from(n.querySelectorAll(".lyrics-syllable"))).filter(n=>!n.classList.contains("transliteration"))}static getWordElementForSyllable(t){return t.parentElement?.parentElement}static getWordPreWipeKey(t){return d.getWordElementForSyllable(t)?.dataset.virtualWordId||`${t.getAttribute("data-start-time")||""}:${d.getSyllableWordIndex(t)}`}static isPreWipeArmed(t){return d.getWordElementForSyllable(t)?._wordPreWipeKey===d.getWordPreWipeKey(t)}static applyWordPreWipe(t,e,i,s,n){if(d.isPreWipeArmed(t))return;const r=d.getWordElementForSyllable(t),a=d.getCachedVirtualWordElements(r),o=a.some(y=>y.classList.contains("char-rise")),l=d.getCachedVirtualWordCharSpans(r,[]),c=i-s,h=l.length||e.reduce((y,T)=>y+d.getVisibleCharacterCount(T),0)||d.getVisibleCharacterCount(t);d.ensureWordWipeGeometry(l,h);const u=l[0],g=u?.closest(".lyrics-syllable")||e[0]||t;d.applyWipeShape(g,h),g.style.setProperty("--pre-wipe-duration",`${n}ms`),g.style.setProperty("--pre-wipe-delay",`${-c}ms`),g.classList.add("pre-highlight"),u&&!o&&(d.applyWipeShape(u,h),u.style.setProperty("--pre-wipe-duration",`${n}ms`),u.style.setProperty("--pre-wipe-delay",`${-c}ms`),u.classList.add("pre-wipe-lead")),a.forEach(y=>{const T=y;T._wordPreWipeKey=d.getWordPreWipeKey(t)})}static maybePreWipeNextWord(t,e,i,s){const n=t[e];if(n.classList.contains("line-synced")||n.classList.contains("transliteration")||n.closest(".lyrics-gap")||!(n.classList.contains("finished")||i>=s-me))return;const a=d.getNextWordSyllable(t,e);if(!a||a.classList.contains("line-synced")||a.classList.contains("transliteration")||a.closest(".lyrics-gap")||a.classList.contains("highlight")||a.classList.contains("finished"))return;const o=a._cachedStartTime;if(!Number.isFinite(o))return;const l=o-s;if(l>yi||l<-50)return;const c=d.getRenderedWordSyllables(a),h=c.length>0?c:[a],u=d.getWordElementForSyllable(a),g=d.getCachedVirtualWordCharSpans(u,[]).length||h.reduce((w,R)=>w+d.getVisibleCharacterCount(R),0);if(g<=0)return;const y=d.clamp(64+g*9,fi,bi),T=Math.max(o-y,s-me);i<T||i>=o||d.applyWordPreWipe(a,h,i,T,y)}static getCachedCharSpans(t){const e=t;return e._cachedCharSpans||(e._cachedCharSpans=Array.from(t.querySelectorAll("span.char"))),e._cachedCharSpans}static getCachedVirtualWordElements(t){if(!t)return[];const e=t;if(e._cachedVirtualWordElements)return e._cachedVirtualWordElements;const{virtualWordId:i}=t.dataset;let s=[t];return i&&t.parentElement&&(s=Array.from(t.parentElement.querySelectorAll(".lyrics-word")).filter(n=>n.dataset.virtualWordId===i)),s.forEach(n=>{const r=n;r._cachedVirtualWordElements=s}),s}static getCachedVirtualWordCharSpans(t,e){if(!t)return e;const i=t;if(i._cachedVirtualWordCharSpans)return i._cachedVirtualWordCharSpans;const s=d.getCachedVirtualWordElements(t),n=s.flatMap(a=>Array.from(a.querySelectorAll("span.char"))),r=n.length>0?n:e;return s.forEach(a=>{const o=a;o._cachedVirtualWordCharSpans=r}),r}static updateSyllableAnimation(t,e=0){if(t.classList.contains("highlight"))return;const{classList:i}=t,s=i.contains("pre-highlight"),n=i.contains("rtl-text"),r=d.getCachedCharSpans(t),o=t.parentElement?.parentElement,l=d.getCachedVirtualWordElements(o),c=d.getCachedVirtualWordCharSpans(o,r),h=o?.classList.contains("growable"),u=o?.classList.contains("char-rise"),f=o?.classList.contains("char-drag"),g=t.getAttribute("data-syllable-index")==="0",y=parseFloat(t.getAttribute("data-start-time")||"0"),T=parseFloat(o?.dataset.virtualWordStart||""),w=g&&(!Number.isFinite(T)||Math.abs(y-T)<.5),R=g,E=t.closest(".lyrics-gap")!==null,m=parseFloat(t.getAttribute("data-duration")||"0")||300,$=parseFloat(t.getAttribute("data-word-duration")||t.getAttribute("data-duration")||"0")||m,M=Number.isFinite(T)?e+(y-T):e,W=Math.max($,m),C=new Map,P=[];if(h&&w&&c.length>0){const L=$,S=L*.09,b=L*1.5;c.forEach(v=>{const A=v.dataset.matrixScale||"1.1",I=v.dataset.charOffsetX||"0",D=v.dataset.shadowIntensity||"0.6",X=v.dataset.translateYPeak||"-2",k=parseFloat(v.dataset.syllableCharIndex||"0"),x=S*k;C.set(v,`grow-dynamic ${b}ms ease-in-out ${x}ms forwards`),P.push({element:v,property:"--matrix-scale",value:A}),P.push({element:v,property:"--char-offset-x",value:`${I}px`}),P.push({element:v,property:"--shadow-intensity",value:D}),P.push({element:v,property:"--translate-y-peak",value:`${X}px`})})}if(u&&w&&c.length>0){const L=Math.max($,m),S=L*.06,b=L*1.2;c.forEach(v=>{const A=parseFloat(v.dataset.syllableCharIndex||"0"),I=S*A;C.set(v,`rise-char ${b}ms ease-in-out ${I}ms forwards`)})}if(f&&w&&c.length>0){const L=Math.max($,m),S=d.clamp(L*.15,64,118),b=d.clamp(L*.82,560,900);c.forEach(v=>{const A=parseFloat(v.dataset.syllableCharIndex||"0"),I=S*A;C.set(v,`drag-char ${b}ms ease ${I}ms forwards`)})}if(r.length>0){const L=c.length||r.length||d.getVisibleCharacterCount(t),S=d.getLongWordWipeScale(L);d.applyWipeShape(t,L),d.ensureWordWipeGeometry(c,L),c.forEach(A=>d.applyWipeShape(A,L));const b=!w&&(!!o?._wordWipeStarted||c.some(A=>A.style.animation.includes("wipe")));let v=r;w?v=c:b&&(v=[]),v.length>0&&l.length>0&&l.forEach(A=>{const I=A;I._wordWipeStarted=!0,I._wordPreWipeKey=void 0}),v.forEach((A,I)=>{const D=parseFloat(A.dataset.wipeStart||"0"),X=parseFloat(A.dataset.wipeDuration||"0"),k=parseFloat(A.dataset.syllableCharIndex||`${I}`),x=A.classList.contains("pre-wipe-lead")||s&&k===0,_=W*D,V=Math.max(0,W-_),F=_-M,O=Math.min(W*X*S,V),Y=R&&k===0&&!x;let H="char-wipe";x?H="char-wipe":Y&&(H="char-start-wipe");const K=C.get(A)||A.style.animation||"",q=[];if(K&&(K.includes("grow-dynamic")||K.includes("rise-char")||K.includes("drag-char"))&&q.push(K.split(",")[0].trim()),k>0&&!x&&F>0&&O>0){const N=Number.parseFloat(A.dataset.preWipeDuration||"100"),j=Math.min(N,O*.9,W*.08,F);j>=16&&q.push(`char-pre-wipe ${j}ms linear ${F-j}ms none`)}if(O>0){const N=x?"both":"forwards";q.push(`${H} ${O}ms linear ${F}ms ${N}`)}q.length>0&&C.set(A,q.join(", "))})}else{const L=parseFloat(t.getAttribute("data-wipe-ratio")||"1"),S=d.getVisibleCharacterCount(t),b=d.getLongWordWipeScale(S),v=m*L*b;d.applyWipeShape(t,S);let A="wipe";if(s?A=n?"wipe-from-pre-rtl":"wipe-from-pre":R?A=n?"start-wipe-rtl":"start-wipe":A=n?"wipe-rtl":"wipe",t.classList.contains("line-synced"))return;const I=E?"fade-gap":A;t.style.animation=`${I} ${v}ms ${E?"ease-out":"linear"} ${-e}ms forwards`}l.length>0&&l.forEach(L=>{const S=L;S._wordPreWipeKey=void 0}),i.remove("pre-highlight"),i.add("highlight"),c.forEach(L=>d.clearPreWipeLead(L));for(const L of P)L.element.style.setProperty(L.property,L.value);for(const[L,S]of C.entries())L.style.willChange="transform",L.style.removeProperty("background-color"),L.style.animation=S}static resetSyllable(t){if(!t)return;t.style.animation="",t.style.removeProperty("--pre-wipe-duration"),t.style.removeProperty("--pre-wipe-delay"),t.style.transition="none",t.style.backgroundColor="var(--lyplus-text-secondary)";const e=t.querySelectorAll("span.char");for(let i=0;i<e.length;i+=1){const s=e[i];s.style.animation="",s.style.transition="none",s.style.backgroundColor="var(--lyplus-text-secondary)",d.clearPreWipeLead(s)}t.classList.remove("highlight","finished","pre-highlight","cleanup")}static resetWordAnimationState(t){t.querySelectorAll(".lyrics-word").forEach(i=>{const s=i;s._wordPreWipeKey=void 0,s._wordWipeStarted=!1})}static resetSyllables(t){if(!t)return;t.classList.remove("persist-highlight"),d.resetWordAnimationState(t),t._cachedSyllableElements=null;const e=t.getElementsByClassName("lyrics-syllable");for(let i=0;i<e.length;i+=1)d.resetSyllable(e[i]);requestAnimationFrame(()=>{for(let i=0;i<e.length;i+=1){const s=e[i];s.style.removeProperty("background-color"),s.style.removeProperty("transition");const n=s.querySelectorAll("span.char");for(let r=0;r<n.length;r+=1){const a=n[r];a.style.removeProperty("background-color"),a.style.removeProperty("transition"),a.style.removeProperty("will-change")}}})}static unfinishSyllables(t){if(!t)return;t.classList.remove("persist-highlight"),d.resetWordAnimationState(t);const e=t.getElementsByClassName("lyrics-syllable");for(let i=0;i<e.length;i+=1){const s=e[i];s.classList.remove("highlight","finished","pre-highlight","cleanup"),s.style.animation="",s.style.removeProperty("--pre-wipe-duration"),s.style.removeProperty("--pre-wipe-delay"),s.style.removeProperty("background-color"),s.style.removeProperty("transition");const n=s.querySelectorAll("span.char");for(let r=0;r<n.length;r+=1){const a=n[r];a.style.animation="",a.style.removeProperty("will-change"),a.style.removeProperty("background-color"),a.style.removeProperty("transition"),a.style.removeProperty("filter"),d.clearPreWipeLead(a)}}}static finishSyllablesUpToTime(t,e){if(!t)return;let i=!1,s=t._cachedSyllableElements;if(!s){s=Array.from(t.querySelectorAll(".lyrics-syllable"));for(let n=0;n<s.length;n+=1){const r=s[n];r._cachedStartTime=parseFloat(r.getAttribute("data-start-time")||"0"),r._cachedEndTime=parseFloat(r.getAttribute("data-end-time")||"0")}t._cachedSyllableElements=s}for(let n=0;n<s.length;n+=1){const r=s[n],a=r._cachedStartTime;if(Number.isFinite(a)&&e>=a){const{classList:o}=r;o.contains("finished")||(o.contains("highlight")||d.updateSyllableAnimation(r,Math.max(0,e-a)),o.add("finished")),i=!0,o.remove("highlight"),o.remove("pre-highlight"),o.add("cleanup"),r.style.animation="",r.style.removeProperty("--pre-wipe-duration"),r.style.removeProperty("--pre-wipe-delay"),r.style.removeProperty("background-color"),d.applyWipeShape(r,d.getVisibleCharacterCount(r));const l=r.querySelectorAll("span.char");for(let c=0;c<l.length;c+=1){const h=l[c],u=h.style.animation||"";if(u.includes("grow-dynamic")||u.includes("rise-char")||u.includes("drag-char")){const g=u.split(",").map(y=>y.trim()).find(y=>y.includes("grow-dynamic")||y.includes("rise-char")||y.includes("drag-char"));h.style.animation=g||""}else h.style.animation="";h.style.backgroundColor="var(--lyplus-text-primary)",d.clearPreWipeLead(h)}}}i?t.classList.add("persist-highlight"):t.classList.remove("persist-highlight")}static updateSyllablesForLine(t,e){let i=t._cachedSyllableElements;if(!i){i=Array.from(t.querySelectorAll(".lyrics-syllable"));for(let s=0;s<i.length;s+=1){const n=i[s];n._cachedStartTime=parseFloat(n.getAttribute("data-start-time")||"0"),n._cachedEndTime=parseFloat(n.getAttribute("data-end-time")||"0")}t._cachedSyllableElements=i}for(let s=0;s<i.length;s+=1){const n=i[s],r=n._cachedStartTime,a=n._cachedEndTime;if(Number.isFinite(r)&&Number.isFinite(a)){const{classList:o}=n,l=o.contains("highlight"),c=o.contains("finished"),h=o.contains("pre-highlight"),u=l||c||h;if(!(e<r-1e3&&!u)){let f=!1;if(h&&e<r){const g=d.getPreviousNonTransliterationSyllable(i,s);g?.classList.contains("highlight")||g?.classList.contains("finished")||(d.clearPreHighlight(n),f=!0)}f||(e>=r&&e<=a?(l||d.updateSyllableAnimation(n,e-r),c&&o.remove("finished")):e>a?c||(l||d.updateSyllableAnimation(n,e-r),o.add("finished")):(l||c)&&d.resetSyllable(n),d.maybePreWipeNextWord(i,s,e,a))}}}}animateProgress(){const t=performance.now();let e=!1;if(!this.lyrics||this.activeLineIndices.length===0){this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=void 0);return}for(const i of this.activeLineIndices){const s=this.lyrics[i],n=this.mainWordAnimations.get(i);if(n&&n.duration>0){const a=t-n.startTime;if(a>=0){const o=Math.min(1,a/n.duration);if(this.mainWordProgress.set(i,o),o<1)e=!0;else{const l=this.activeMainWordIndices.get(i)??-1,c=l+1;if(l!==-1&&c<s.text.length){const h=s.text[l],u=s.text[c];this.activeMainWordIndices.set(i,c);const f=u.timestamp-h.endtime,g=u.endtime-u.timestamp;this.mainWordAnimations.set(i,{startTime:performance.now()+f,duration:g}),e=!0}else this.mainWordAnimations.set(i,{startTime:0,duration:0})}}else this.mainWordProgress.set(i,0),e=!0}const r=this.backgroundWordAnimations.get(i);if(r&&r.duration>0){const a=t-r.startTime;if(a>=0){const o=Math.min(1,a/r.duration);if(this.backgroundWordProgress.set(i,o),o<1)e=!0;else{const l=this.activeBackgroundWordIndices.get(i)??-1;if(s.backgroundText&&l!==-1&&l<s.backgroundText.length-1){const c=l+1,h=s.backgroundText[l],u=s.backgroundText[c];this.activeBackgroundWordIndices.set(i,c);const f=u.timestamp-h.endtime,g=u.endtime-u.timestamp;this.backgroundWordAnimations.set(i,{startTime:performance.now()+f,duration:g}),e=!0}else this.backgroundWordAnimations.set(i,{startTime:0,duration:0})}}else this.backgroundWordProgress.set(i,0),e=!0}}e?this.animationFrameId=requestAnimationFrame(this._boundAnimateProgress):this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=void 0)}generateLRC(){if(!this.lyrics)return"";let t="";this.songTitle&&(t+=`[ti:${this.songTitle}]
`),this.songArtist&&(t+=`[ar:${this.songArtist}]
`),this.songAlbum&&(t+=`[al:${this.songAlbum}]
`),this.lyricsSource&&(t+=`[re:${this.lyricsSource}]
`);for(const e of this.lyrics)if(e.text&&e.text.length>0){const i=d.formatTimestampLRC(e.timestamp),s=e.text.map(n=>n.text).join("").trim();t+=`[${i}]${s}
`}return t}generateTTML(){if(!this.lyrics)return"";let t=`<?xml version="1.0" encoding="UTF-8"?>
`;t+=`<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyrics">
`,t+=`  <body>
`;let e;for(let i=0;i<this.lyrics.length;i+=1){const s=this.lyrics[i],n=s.songPart;(n!==e||i===0)&&(i>0&&(t+=`    </div>
`),e=n,e?t+=`    <div itunes:song-part="${e}">
`:t+=`    <div>
`);const r=d.formatTimestampTTML(s.timestamp),a=d.formatTimestampTTML(s.endtime);t+=`      <p begin="${r}" end="${a}">
`;for(const o of s.text){const l=d.formatTimestampTTML(o.timestamp),c=d.formatTimestampTTML(o.endtime),h=o.text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");t+=`        <span begin="${l}" end="${c}">${h}</span>
`}t+=`      </p>
`}return this.lyrics.length>0&&(t+=`    </div>
`),t+=`  </body>
`,t+="</tt>",t}static formatTimestampLRC(t){const e=t/1e3,i=Math.floor(e/60),s=Math.floor(e%60),n=Math.floor(t%1e3/10),r=a=>a.toString().padStart(2,"0");return`${r(i)}:${r(s)}.${r(n)}`}static formatTimestampTTML(t){const e=t/1e3,i=Math.floor(e/3600),s=Math.floor(e%3600/60),n=Math.floor(e%60),r=Math.floor(t%1e3),a=(o,l=2)=>o.toString().padStart(l,"0");return`${a(i)}:${a(s)}:${a(n)}.${a(r,3)}`}downloadLyrics(){if(!this.lyrics||this.lyrics.length===0)return;const t=this.lyrics.some(l=>l.isWordSynced!==!1);let e="",i=this.downloadFormat;i==="auto"&&(i=t?"ttml":"lrc");let s="";if(i==="ttml"?(e=this.generateTTML(),s="application/xml"):(e=this.generateLRC(),s="text/plain"),!e)return;const n=new Blob([e],{type:s}),r=URL.createObjectURL(n),a=document.createElement("a");a.href=r;const o=this.songTitle?`${this.songTitle}${this.songArtist?` - ${this.songArtist}`:""}.${i}`:`lyrics.${i}`;a.download=o,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(r)}render(){this.fontFamily&&(this.style.fontFamily=this.fontFamily),this.style.setProperty("--highlight-color",this.highlightColor);const t=this.lyricsSource??"Unavailable",e=this.cachedIsUnsynced,i=this.lyrics?.some(a=>a.alignment!=="end"),s=this.lyrics?.some(a=>a.alignment==="end"),n=i&&s,r=()=>{if(this.isLoading)return U`
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        `;if(!this.lyrics||this.lyrics.length===0)return U`<div class="no-lyrics">No lyrics found.</div>`;const a=this.findAllInstrumentalGaps(),o=new Map(a.map(l=>[l.insertBeforeIndex,l]));return this.lyrics.map((l,c)=>{const h=`lyrics-line-${c}`,u=l.text[0]?.timestamp||0,f=l.text[l.text.length-1]?.endtime||0,g=l.backgroundText&&l.backgroundText.length>0,y=g?d.getBackgroundTextPlacement(l):"after",T=g?U`<p
              class="background-vocal-container background-${y}"
            >
              <span class="background-vocal-wrap">
                ${l.backgroundText.map((x,_)=>{const V=x.timestamp,F=x.endtime,O=F-V,Y=this.showRomanization&&x.romanizedText&&x.romanizedText.trim()!==x.text.trim()?U`<span
                          class="lyrics-syllable transliteration no-chars ${x.lineSynced?"line-synced":""}"
                          data-start-time="${V}"
                          data-end-time="${F}"
                          data-duration="${O}"
                          data-syllable-index="0"
                          data-wipe-ratio="1"
                          >${x.romanizedText}</span
                        >`:"";return U`<span class="lyrics-word"
                    ><span
                      class="lyrics-syllable-wrap${Y?" has-transliteration":""}"
                      ><span
                        class="lyrics-syllable no-chars${x.lineSynced?" line-synced":""}"
                        data-start-time="${V}"
                        data-end-time="${F}"
                        data-duration="${O}"
                        data-syllable-index="${_}"
                        data-word-index="${_}"
                        data-word-length="${x.text.replace(/\s/g,"").length}"
                        data-wipe-ratio="1"
                        >${x.text}</span
                      >${Y}</span
                    ></span
                  >`})}
              </span>
            </p>`:"",w=this.cachedLineData?.[c],R=w?.wordGroups??[],E=w?.groupGrowable??[],m=w?.groupGlowing??[],$=w?.groupCharRise??[],M=w?.groupCharDrag??[],W=w?.vwFullText??[],C=w?.vwFullDuration??[],P=w?.vwCharOffset??[],L=w?.vwStartMs??[],S=w?.vwEndMs??[],b=w?.lineIsRTL??!1,v=U`<p
          class="main-vocal-container ${b?"rtl-text":""}"
        >
          ${R.map((x,_)=>{const V=E[_],F=m[_],O=$[_],Y=M[_],H=V||O||Y,K=x.some(Q=>Q.lineSynced),q=H?W[_]:"",N=H?C[_]:0,j=q.replace(/\s/g,"").length,Ti=H?P[_]:0,Ei=`${c}:${L[_]}:${S[_]}`,Ut=L[_],Ai=S[_];let fe=0;const Nt=x.map(Q=>Q.text).join(""),$i=Nt.replace(/\s/g,"").length,Li=Nt.trim().length>=16||/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(Nt),Ci=x[0].timestamp,Ii=x[x.length-1].endtime-Ci,Pi=Math.max(1.2,Math.min(2.5,1.2+Ii/1e3*.6));return U`<span
              class="lyrics-word${V?" growable":""}${O?" char-rise":""}${Y?" char-drag":""}${F?" glowing":""}${Li?" allow-break":""}"
              data-virtual-word-id="${Ei}"
              data-virtual-word-start="${Ut}"
              data-virtual-word-end="${Ai}"
              style="--rise-duration: ${Pi}s"
              >${x.map((Q,Mi)=>{const Ct=Q.timestamp,Bt=Q.endtime,It=Bt-Ct,Gt=Q.text||"",be=this.showRomanization&&Q.romanizedText&&Q.romanizedText.trim()!==Q.text.trim()?U`<span
                        class="lyrics-syllable transliteration no-chars ${K?"line-synced":""}"
                        data-start-time="${Ct}"
                        data-end-time="${Bt}"
                        data-duration="${It}"
                        data-syllable-index="0"
                        data-wipe-ratio="1"
                        >${Q.romanizedText}</span
                      >`:"";let ve=Gt;if(H){const xe=Gt.replace(/\s/g,"").length||1,we=N>0&&Number.isFinite(Ut),Wi=we?d.clamp((Ct-Ut)/N,0,1):0,Se=we?d.clamp(It/N,0,1):1;let ke=0;ve=U`${Gt.split("").map(Te=>{if(Te===" ")return" ";const St=Ti+fe,_i=ke,Ee=Math.max(1,j),Ri=d.clamp(Wi+_i/xe*Se,0,1),Fi=Se/xe||1/Ee;fe+=1,ke+=1;const Ae=400,zi=Math.min(1,Math.max(0,(N-Ae)/(3e3-Ae)))**3,$e=j>5,Ht=N<1200;let Le=0;if($e||Ht){let Mt=0;$e&&(Mt+=Math.min((j-5)/5,1)*.4),Ht&&j>3?Mt+=Math.max(0,1-(N-800)/400)*.3:Ht&&j<=3&&(Mt+=Math.max(0,1-(N-800)/400)*.1),Le=Math.min(Mt,.7)}const Di=1-(j>1?St/(j-1):0)*Le,Ce=zi*Di,Pt=1+(j<=3?.05:.04)+Ce*.08,Oi=Math.min(1.1,N/1500);let qt=1;j<=3?qt=.85:j>=6&&(qt=1.1);const Ui=Oi*qt,Ni=F?(.35+Ce*.45)*Ui:0,Bi=(Pt-1)/.1,Gi=(N+It*2)/3,Hi=Math.min(1,Math.max(.3,Gi/2e3)),qi=-Bi*(2*Hi),Ie=((St+.5)/j-.5)*2*((Pt-1)*25),Pe=Y;let jt=qi;O?jt=0:Pe&&(jt=-.78);let Vt=Ie;return(O||Pe)&&(Vt=0),U`<span
                      class="char"
                      data-char-index="${St}"
                      data-syllable-char-index="${St}"
                      data-wipe-start="${Ri.toFixed(4)}"
                      data-wipe-duration="${Fi.toFixed(4)}"
                      data-horizontal-offset="${Ie.toFixed(2)}"
                      data-max-scale="${Pt.toFixed(3)}"
                      data-matrix-scale="${(Pt*.98).toFixed(3)}"
                      data-char-offset-x="${(Vt*.98).toFixed(2)}"
                      data-shadow-intensity="${Ni.toFixed(3)}"
                      data-translate-y-peak="${jt.toFixed(3)}"
                      style="--word-wipe-width: ${Ee}ch; --char-wipe-position: -${St}ch"
                      >${Te}</span
                    >`})}`}return U`<span
                  class="lyrics-syllable-wrap${be?" has-transliteration":""}"
                  ><span
                    class="lyrics-syllable${K?" line-synced":""}${H?" has-chars":" no-chars"}"
                    data-start-time="${Ct}"
                    data-end-time="${Bt}"
                    data-duration="${It}"
                    data-word-duration="${N}"
                    data-syllable-index="${Mi}"
                    data-word-index="${_}"
                    data-word-length="${$i}"
                    data-wipe-ratio="1"
                    >${ve}</span
                  >${be}</span
                >`})}</span
            >`})}
        </p>`,A=l.text.map(x=>x.text).join("").trim(),I=this.showTranslation&&l.translation&&l.translation.trim()!==A?U`<div class="lyrics-translation-container">
                ${l.translation}
              </div>`:"",D=this.showRomanization&&l.romanizedText&&!l.text.some(x=>x.romanizedText)&&l.romanizedText.trim()!==A?U`<div
                class="lyrics-romanization-container ${b?"rtl-text":""}"
              >
                ${l.romanizedText}
              </div>`:"";let X=null;const k=o.get(c);if(k){const _=(k.gapEnd-k.gapStart)/3;X=U`<div
            id="gap-${c}"
            class="lyrics-line lyrics-gap"
            aria-hidden="true"
            data-start-time="${k.gapStart}"
            data-end-time="${k.gapEnd}"
          >
            <p class="main-vocal-container">
              <span class="lyrics-word"
                ><span class="lyrics-syllable-wrap"
                  ><span
                    class="lyrics-syllable"
                    data-start-time="${k.gapStart}"
                    data-end-time="${k.gapStart+_}"
                    data-duration="${_}"
                    data-wipe-ratio="1"
                    data-syllable-index="0"
                  ></span></span
                ><span class="lyrics-syllable-wrap"
                  ><span
                    class="lyrics-syllable"
                    data-start-time="${k.gapStart+_}"
                    data-end-time="${k.gapStart+_*2}"
                    data-duration="${_}"
                    data-wipe-ratio="1"
                    data-syllable-index="1"
                  ></span></span
                ><span class="lyrics-syllable-wrap"
                  ><span
                    class="lyrics-syllable"
                    data-start-time="${k.gapStart+_*2}"
                    data-end-time="${k.gapEnd}"
                    data-duration="${_}"
                    data-wipe-ratio="1"
                    data-syllable-index="2"
                  ></span></span
              ></span>
            </p>
          </div>`}return U`
          ${X}
          <div
            id="${h}"
            class="lyrics-line ${l.alignment==="end"?"singer-right":"singer-left"} ${b?"rtl-text":""} ${g?`bg-${y}`:""}"
            role="${e?"paragraph":"button"}"
            aria-label="${e?A:`Seek to lyric: ${A}`}"
            data-start-time="${u}"
            data-end-time="${f}"
            @click=${()=>this.handleLineClick(l)}
            tabindex="${e?-1:0}"
            @keydown=${x=>{(x.key==="Enter"||x.key===" ")&&this.handleLineClick(l)}}
          >
            <div class="lyrics-line-container ${b?"rtl-text":""}">
              ${y==="before"?T:""}
              ${v}
              ${y==="after"?T:""}
              ${D} ${I}
            </div>
          </div>
        `})};return U`
      <div
        class="lyrics-container ${e?"is-unsynced":"blur-inactive-enabled"} ${n?"has-duet-lines":""}"
        role="region"
        aria-label="Synced lyrics"
      >
        ${!this.isLoading&&this.lyrics&&this.lyrics.length>0?U`
              <div class="lyrics-header">
                <div class="header-controls">
                  <button
                    type="button"
                    class="download-button ${this.showRomanization?"active":""}"
                    @click=${this.toggleRomanization}
                    title="Toggle Romanization"
                    aria-label="Toggle romanization"
                    aria-pressed="${this.showRomanization}"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-speech-icon lucide-speech"
                    >
                      <path
                        d="M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20"
                      />
                      <path d="M19.8 17.8a7.5 7.5 0 0 0 .003-10.603" />
                      <path d="M17 15a3.5 3.5 0 0 0-.025-4.975" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="download-button ${this.showTranslation?"active":""}"
                    @click=${this.toggleTranslation}
                    title="Toggle Translation"
                    aria-label="Toggle translation"
                    aria-pressed="${this.showTranslation}"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-languages-icon lucide-languages"
                    >
                      <path d="m5 8 6 6" />
                      <path d="m4 14 6-6 2-3" />
                      <path d="M2 5h12" />
                      <path d="M7 2h1" />
                      <path d="m22 22-5-10-5 10" />
                      <path d="M14 18h6" />
                    </svg>
                  </button>
                </div>
                <div class="download-controls">
                  <select
                    class="format-select"
                    aria-label="Lyrics download format"
                    @change=${a=>{this.downloadFormat=a.target.value}}
                    .value=${this.downloadFormat}
                    @click=${a=>a.stopPropagation()}
                  >
                    <option value="auto">Auto</option>
                    <option value="lrc">LRC</option>
                    <option value="ttml">TTML</option>
                  </select>
                  <button
                    type="button"
                    class="download-button"
                    @click=${this.downloadLyrics}
                    title="Download Lyrics"
                    aria-label="Download lyrics"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-download-icon lucide-download"
                    >
                      <path d="M12 15V3" />
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                  </button>
                </div>
              </div>
            `:""}
        ${r()}
        ${this.isLoading?"":U`
              <footer class="lyrics-footer lyrics-line">
                <div class="footer-content">
                  <span
                    class="source-info"
                    style="display: flex; align-items: center; gap: 8px;"
                  >
                    <b style="font-weight: 750;">Source</b> ${t}
                    ${this.availableSources&&this.availableSources.length>1||!this.hasFetchedAllProviders?U`
                          <button
                            type="button"
                            class="download-button source-switch-btn"
                            title="Switch Lyrics Source"
                            aria-label="Switch lyrics source"
                            @click=${this.switchSource}
                            ?disabled=${this.isFetchingAlternatives}
                          >
                            <svg
                              class="source-switch-svg lucide lucide-arrow-down-up-icon lucide-arrow-down-up ${this.isFetchingAlternatives?"is-loading":""}"
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              ${this.isFetchingAlternatives?oe`<path
                                    d="M21 12a9 9 0 1 1-6.219-8.56"
                                  ></path>`:oe`<path d="m3 16 4 4 4-4"></path
                                    ><path d="M7 20V4"></path
                                    ><path d="m21 8-4-4-4 4"></path
                                    ><path d="M17 4v16"></path>`}
                            </svg>
                            <span class="source-switch-label"
                              >${this.isFetchingAlternatives?"Switching...":"Switch"}</span
                            >
                          </button>
                        `:""}
                  </span>
                  ${this.songwriters?U`<span
                        class="songwriters-info"
                        style="margin-top: 4px; font-weight: normal; font-size: 0.9em;"
                      >
                        <b style="font-weight: 750;">Songwriters</b> ${this.songwriters}
                      </span>`:""}
                  <span class="version-info" style="margin-top: 8px;">
                    <b style="font-weight: 750;">am-lyrics</b> v${de} •

                    <a
                      href="https://github.com/uimaxbai/apple-music-web-components"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="display: inline-flex; align-items: center; gap: 4px;"
                      >Star me on GitHub
                    </a>
                  </span>
                </div>
              </footer>
            `}
      </div>
    `}}return d.styles=Fe`
    :host {
      --lyplus-lyrics-palette: var(
        --am-lyrics-highlight-color,
        var(--highlight-color, #ffffff)
      );
      --lyplus-text-primary: var(--lyplus-lyrics-palette);
      /* Use color-mix with the text color rather than just opacity so it adapts */
      --lyplus-text-secondary: color-mix(
        in srgb,
        var(--lyplus-lyrics-palette),
        transparent 45%
      );

      --lyplus-padding-base: 1em;
      --lyplus-padding-line: 10px;
      --lyplus-padding-gap: 0.3em;
      --lyplus-border-radius-base: 0.6em;
      --lyplus-gap-dot-size: 0.4em;
      --lyplus-gap-dot-margin: 0.08em;

      --lyplus-font-size-base: 34px;
      --lyplus-font-size-base-grow: 24.5;
      --lyplus-font-size-subtext: 0.6em;
      --am-lyrics-line-height: 1.2;
      --am-lyrics-line-spacing: 25px;
      --am-lyrics-background-vocal-spacing: 15px;
      --am-lyrics-background-vocal-font-size: 0.65em;
      --am-lyrics-background-vocal-stack-shift: 7.5px;
      --am-lyrics-background-vocal-max-height: 8em;
      --am-lyrics-background-vocal-exit-duration: 450ms;
      --am-lyrics-instrumental-height: 40px;
      --am-lyrics-instrumental-spacing: 16px;
      --am-lyrics-instrumental-enter-duration: 400ms;
      --am-lyrics-instrumental-collapse-duration: 500ms;
      --am-lyrics-instrumental-exit-duration: 350ms;
      --am-lyrics-instrumental-exit-scale: 0;
      --am-lyrics-inactive-scale: 0.98;
      --am-lyrics-background-vocal-scale: 0.9;
      --am-lyrics-touch-scale: 0.96;
      --am-lyrics-highlight-radius: 16px;
      --am-lyrics-highlight-surface: rgba(255, 255, 255, 0.08);
      --am-lyrics-progression-feather: 30px;
      --am-lyrics-glow-radius: 5px;
      --am-lyrics-inline-padding: 20px;
      --char-rise-y: -2px;
      --am-lyrics-character-rise-peak: -1.25px;

      --lyplus-blur-amount: 0.07em;
      --lyplus-blur-amount-near: 0.035em;
      --lyplus-fade-gap-timing-function: ease-out;
      --wipe-gradient-width: var(--am-lyrics-progression-feather);
      --wipe-gradient-half: calc(var(--am-lyrics-progression-feather) / 2);

      --lyrics-scroll-padding-top: 12%;

      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
        Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background: transparent;
      height: 100%;
      overflow: hidden;
      font-weight: bold;
      color: var(--lyplus-text-primary);
      container-type: inline-size;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ==========================================================================
       CONTAINER & SCROLL BEHAVIOR
       ========================================================================== */
    .lyrics-container {
      position: relative;
      padding: 60px var(--am-lyrics-inline-padding)
        calc(
          var(--am-lyrics-instrumental-height) +
            var(--am-lyrics-instrumental-spacing)
        );
      background-color: transparent;
      width: 100%;
      height: 100%;
      max-height: 100vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      box-sizing: border-box;
      scrollbar-width: none;
      overflow-anchor: none;
      overscroll-behavior-y: contain;
      scroll-padding-block-start: var(--lyrics-scroll-padding-top);
    }

    .lyrics-container::-webkit-scrollbar {
      display: none;
    }

    /* Disable transitions during touch-scrolling for 1:1 feedback */
    .lyrics-container.touch-scrolling .lyrics-line,
    .lyrics-container.touch-scrolling .lyrics-plus-metadata {
      transition: none !important;
      filter: none !important;
    }

    /* Apply smooth gliding transition for mouse-wheel scrolling */
    .lyrics-container.wheel-scrolling .lyrics-line {
      transition: transform 0.3s ease-out !important;
      filter: none !important;
    }

    .lyrics-line.scroll-animate {
      /* Preserve the graceful fade duration; the keyframe handles the
         transform, so we only need to keep opacity/filter transitions
         alive without !important overriding the base rule. */
      transition:
        opacity 0.7s ease,
        filter 0.7s ease,
        transform 0.4s cubic-bezier(0.41, 0, 0.12, 0.99)
          var(--lyrics-line-delay, 0ms);
      animation-name: lyrics-scroll;
      animation-duration: var(--scroll-duration, 400ms);
      animation-timing-function: cubic-bezier(0.41, 0, 0.12, 0.99);
      animation-fill-mode: both;
      animation-delay: var(--lyrics-line-delay, 0ms);
    }

    .lyrics-container.user-scrolling .lyrics-line {
      --lyrics-line-delay: 0ms !important;
      transition-delay: 0ms !important;
    }

    /* ==========================================================================
       LYRICS LINE BASE STYLES
       ========================================================================== */
    .lyrics-line {
      position: relative;
      isolation: isolate;
      padding: 0 var(--lyplus-padding-line);
      margin-block-end: var(--am-lyrics-line-spacing);
      opacity: 0.8;
      color: var(--lyplus-text-secondary);
      font-size: var(--lyplus-font-size-base);
      line-height: var(--am-lyrics-line-height);
      cursor: pointer;
      transform-origin: left;
      /* Graceful 0.7 s fade so the line stays mostly bright while the
         0.4 s scroll animation runs, then settles into the inactive state. */
      transition:
        opacity 0.7s ease,
        transform 0.4s cubic-bezier(0.41, 0, 0.12, 0.99)
          var(--lyrics-line-delay, 0ms),
        filter 0.7s ease;
      /* Keep line geometry stable in WebKit; content-visibility:auto can
         change offsetTop as Safari reveals an offscreen lyric. */
      contain: layout style;
      text-rendering: optimizeLegibility;
    }

    .lyrics-line::before {
      content: '';
      position: absolute;
      z-index: -1;
      inset: -6px -8px;
      border-radius: var(--am-lyrics-highlight-radius);
      background: var(--am-lyrics-highlight-surface);
      box-shadow: 0 0 0 1px transparent;
      opacity: 0;
      transform: scale(0.98);
      transition:
        opacity 180ms cubic-bezier(0.2, 0, 0, 1),
        transform 180ms cubic-bezier(0.2, 0, 0, 1),
        box-shadow 180ms ease-out;
      pointer-events: none;
    }

    .lyrics-line:focus-visible {
      outline: none;
    }

    .lyrics-line:focus-visible::before {
      opacity: 1;
      transform: scale(1);
      box-shadow: 0 0 0 2px
        color-mix(in srgb, var(--lyplus-text-primary) 72%, transparent);
    }

    .lyrics-line:not(.scroll-animate) {
      animation: none;
    }

    /* --- Line Container & Vocal Containers --- */
    .lyrics-line-container {
      position: relative;
      overflow-wrap: break-word;
      transform-origin: left;
      transform: translateZ(0) scale(var(--am-lyrics-inactive-scale));
      transition:
        transform 0.7s ease,
        background-color 0.7s,
        color 0.7s;
    }

    .lyrics-line.active .lyrics-line-container,
    .lyrics-line.pre-active .lyrics-line-container {
      transform: translateZ(0) scale(1);
      transition:
        transform 0.5s ease,
        background-color 0.18s,
        color 0.18s;
    }

    .main-vocal-container {
      transform-origin: 5% 50%;
      margin: 0;
      transition: transform var(--scroll-duration, 400ms)
        cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .background-vocal-container {
      position: relative;
      height: 0;
      overflow: visible;
      font-size: var(--am-lyrics-background-vocal-font-size);
      line-height: 1.22;
      padding: 0;
      box-sizing: border-box;
      color: color-mix(in srgb, var(--lyplus-text-secondary) 80%, transparent);
      transition: height var(--scroll-duration, 400ms)
        cubic-bezier(0.41, 0, 0.12, 0.99);
      margin: 0;
      pointer-events: none;
    }

    .background-vocal-wrap {
      display: block;
      padding-top: 0.08em;
      padding-bottom: 0.14em;
      opacity: 0;
      transform: scale(var(--am-lyrics-background-vocal-scale));
      transform-origin: left center;
      transition:
        padding-top var(--scroll-duration, 400ms) cubic-bezier(0.2, 0.8, 0.2, 1),
        padding-bottom var(--scroll-duration, 400ms)
          cubic-bezier(0.2, 0.8, 0.2, 1),
        opacity 320ms cubic-bezier(0.2, 0, 0, 1),
        transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .lyrics-line.singer-right .background-vocal-container,
    .lyrics-line.rtl-text .background-vocal-container {
      margin-left: auto;
      margin-right: 0;
    }

    /* Background vocals expand only when .bg-expanded is present.
       This is separate from .active so bg vocals can collapse immediately
       while .active stays to keep text white until the scroll passes. */
    .lyrics-line.bg-expanded .background-vocal-container {
      height: calc(
        var(
            --am-lyrics-background-vocal-height,
            var(--am-lyrics-background-vocal-max-height)
          ) +
          var(--am-lyrics-background-vocal-spacing)
      );
    }

    .lyrics-line.bg-expanded .background-vocal-wrap {
      opacity: 1;
      transform: scale(1);
      will-change: opacity, transform;
    }

    /* During exit, collapse the layout shell with the lyric scroll while an
       absolutely positioned copy of its normal wrapper remains unclipped and
       scales away in place. This lets following lines reclaim the space in the
       same motion instead of after the background vocal has disappeared. */
    .lyrics-line.bg-collapsing .background-vocal-container {
      display: flex;
      align-items: center;
      height: 0;
    }

    .lyrics-line.bg-collapsing .background-vocal-wrap {
      position: relative;
      flex: 0 0 auto;
      width: 100%;
      opacity: 0;
      transform: scale(var(--am-lyrics-background-vocal-scale));
      animation: background-vocal-scale-out
        var(
          --background-vocal-exit-duration,
          var(--am-lyrics-background-vocal-exit-duration)
        )
        linear both;
      transition:
        padding-top var(--scroll-duration, 400ms) cubic-bezier(0.2, 0.8, 0.2, 1),
        padding-bottom var(--scroll-duration, 400ms)
          cubic-bezier(0.2, 0.8, 0.2, 1);
      will-change: opacity, transform;
    }

    .lyrics-line.bg-expanded.bg-after .main-vocal-container {
      transform: translateY(
        calc(0px - var(--am-lyrics-background-vocal-stack-shift))
      );
    }

    .lyrics-line.bg-expanded.bg-before .main-vocal-container {
      transform: translateY(var(--am-lyrics-background-vocal-stack-shift));
    }

    .lyrics-line:is(.bg-expanded, .bg-collapsing)
      .background-vocal-container.background-after
      .background-vocal-wrap {
      padding-top: calc(var(--am-lyrics-background-vocal-spacing) + 0.08em);
    }

    .lyrics-line:is(.bg-expanded, .bg-collapsing)
      .background-vocal-container.background-before
      .background-vocal-wrap {
      padding-bottom: calc(var(--am-lyrics-background-vocal-spacing) + 0.14em);
    }

    .lyrics-container.user-scrolling .background-vocal-container,
    .lyrics-container.user-scrolling .background-vocal-wrap,
    .lyrics-container.touch-scrolling .background-vocal-container,
    .lyrics-container.touch-scrolling .background-vocal-wrap {
      transition-duration: 1ms !important;
    }

    /* --- Line States & Modifiers --- */
    .lyrics-line.active {
      opacity: 1;
      color: var(--lyplus-text-primary);
    }

    .lyrics-line.pre-active {
      opacity: 1;
    }

    /* Predictive scrolling begins before the next timestamp. Start dimming
       the outgoing line at the same moment so it settles with the scroll. */
    .lyrics-line.scroll-exiting {
      opacity: 0.8;
      color: var(--lyplus-text-secondary);
      transition:
        opacity var(--scroll-duration, 400ms) cubic-bezier(0.41, 0, 0.12, 0.99),
        transform var(--scroll-duration, 400ms)
          cubic-bezier(0.41, 0, 0.12, 0.99) var(--lyrics-line-delay, 0ms),
        filter var(--scroll-duration, 400ms) ease;
    }

    .lyrics-line.persist-highlight {
      filter: none !important;
      opacity: 1;
    }

    .lyrics-line.persist-highlight .lyrics-syllable.finished,
    .lyrics-line.persist-highlight .lyrics-syllable.finished span.char {
      transition: none !important;
    }

    .lyrics-line.singer-right {
      text-align: end;
    }

    .lyrics-line.singer-right .lyrics-line-container,
    .lyrics-line.singer-right .main-vocal-container {
      transform-origin: right;
    }

    .lyrics-line.rtl-text {
      direction: rtl;
      text-align: right !important;
      transform-origin: right;
    }

    .lyrics-line.rtl-text .lyrics-line-container,
    .lyrics-line.rtl-text .main-vocal-container {
      transform-origin: right;
    }

    .lyrics-line.rtl-text .lyrics-romanization-container,
    .lyrics-line.rtl-text .lyrics-translation-container {
      text-align: right;
    }

    /* Preserve a clear duet lane without forcing every line into a narrow
       column. Logical padding keeps the spacing correct for RTL content. */
    .lyrics-container.has-duet-lines .lyrics-line.singer-left {
      padding-inline-end: max(var(--lyplus-padding-line), 15%);
    }

    .lyrics-container.has-duet-lines .lyrics-line.singer-right {
      padding-inline-start: max(var(--lyplus-padding-line), 15%);
    }

    /* --- Unsynced (Plain Text) Lyrics Overrides --- */
    .lyrics-container.is-unsynced .lyrics-line {
      opacity: 1 !important;
      color: var(--lyplus-text-primary) !important;
      filter: none !important;
      transform: none !important;
      cursor: default;
    }

    .lyrics-container.is-unsynced .lyrics-line-container {
      transform: none !important;
      background-color: transparent !important;
    }

    .lyrics-container.is-unsynced .lyrics-syllable {
      color: var(--lyplus-text-primary) !important;
      background-color: transparent !important;
      -webkit-background-clip: unset !important;
      background-clip: unset !important;
      -webkit-text-fill-color: unset !important;
      text-fill-color: unset !important;
      text-shadow: none !important;
      filter: none !important;
      opacity: 1 !important;
      transform: none !important;
    }

    @media (hover: hover) and (pointer: fine) {
      .lyrics-line:hover {
        filter: none !important;
      }

      .lyrics-container.is-unsynced .lyrics-line:hover {
        background: transparent !important;
      }
    }

    .lyrics-line:not(.lyrics-gap):active .lyrics-line-container {
      transform: translateZ(0) scale(var(--am-lyrics-touch-scale));
      transition-duration: 120ms;
    }

    /* --- Blur Effect for Inactive Lines --- */
    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line:not(.active):not(.pre-active):not(.lyrics-gap):not(
        .persist-highlight
      ) {
      filter: blur(var(--lyplus-blur-amount));
    }

    /* Viewport Virtualization: Strip expensive filters and animations from
       offscreen lines.  IntersectionObserver toggles this class. */
    .lyrics-line.far-line {
      filter: none !important;
      will-change: auto !important;
      animation: none !important;
    }

    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.post-active-line:not(.lyrics-gap):not(.active):not(
        .pre-active
      ):not(.persist-highlight),
    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.next-active-line:not(.lyrics-gap):not(.active):not(
        .pre-active
      ):not(.persist-highlight),
    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.lyrics-activest:not(.active):not(.lyrics-gap):not(
        .pre-active
      ):not(.persist-highlight) {
      filter: blur(var(--lyplus-blur-amount-near));
    }

    /* Distance falloff mirrors the native lyric stack: neighbouring lines
       remain legible while lines farther from the focus gently recede. */
    .lyrics-line.prev-2,
    .lyrics-line.next-2 {
      opacity: 0.7;
    }

    .lyrics-line.prev-3,
    .lyrics-line.next-3 {
      opacity: 0.58;
    }

    .lyrics-line.prev-4,
    .lyrics-line.next-4 {
      opacity: 0.46;
    }

    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.next-active-line:not(.active):not(.pre-active) {
      filter: blur(0.012em);
    }

    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.next-2:not(.active):not(.pre-active) {
      filter: blur(0.028em);
    }

    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.next-3:not(.active):not(.pre-active) {
      filter: blur(0.05em);
    }

    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.next-4:not(.active):not(.pre-active) {
      filter: blur(var(--lyplus-blur-amount));
    }

    /* Unblur all lines when user is scrolling */
    .lyrics-container.user-scrolling .lyrics-line {
      transition: none !important;
      filter: none !important;
      opacity: 0.8 !important;
    }

    /* Unblur early for pre-active lines */
    .lyrics-container.blur-inactive-enabled .lyrics-line.pre-active {
      filter: blur(0px) !important;
      opacity: 1;
    }

    /* ==========================================================================
       WORD & SYLLABLE STYLES
       ========================================================================== */
    .lyrics-word:not(.allow-break) {
      display: inline-block;
      vertical-align: baseline;
      white-space: nowrap;
    }

    .lyrics-word.allow-break {
      display: inline;
    }

    .lyrics-word.char-rise {
      display: inline-block;
      vertical-align: baseline;
      white-space: nowrap;
    }

    .lyrics-word.char-drag {
      display: inline-block;
      vertical-align: baseline;
      white-space: nowrap;
    }

    .lyrics-word.char-rise.allow-break {
      display: inline;
      white-space: normal;
    }

    .lyrics-word.char-drag.allow-break {
      display: inline;
      white-space: normal;
    }

    .lyrics-syllable-wrap {
      display: inline;
    }

    .lyrics-syllable-wrap.has-transliteration {
      display: inline-flex;
      flex-direction: column;
      align-items: start;
    }

    .lyrics-syllable {
      display: inline-block;
      vertical-align: baseline;
      color: transparent;
      background-color: var(--lyplus-text-secondary);
      white-space: pre-wrap;
      font-variant-ligatures: none;
      font-feature-settings: 'liga' 0;
      background-clip: text;
      -webkit-background-clip: text;
      transition:
        color 0.7s,
        background-color 0.7s,
        transform 0.7s ease;
    }

    /* --- Syllable States --- */
    .lyrics-syllable.finished {
      background-color: var(--lyplus-text-primary);
      /* Unified transition: transform keeps its 1s glow decay, while
         background-color and color fade at 0.7s so everything dims
         together when the line becomes inactive. */
      transition:
        transform 1s ease,
        background-color 0.7s ease,
        color 0.7s ease;
    }

    .lyrics-syllable.finished.has-chars {
      background-color: transparent;
    }

    .lyrics-line.active:not(.lyrics-gap) .lyrics-syllable {
      transition:
        transform 1s ease,
        background-color 0.5s,
        color 0.5s;
    }

    /* --- Wipe Highlight Effect --- */
    .lyrics-line.active:not(.lyrics-gap) .lyrics-syllable.highlight.no-chars,
    .lyrics-line.active:not(.lyrics-gap)
      .lyrics-syllable.pre-highlight.no-chars {
      background-repeat: no-repeat;
      background-image: linear-gradient(
        90deg,
        var(--lyplus-text-primary, #fff) 0%,
        var(--lyplus-text-primary, #fff)
          calc(100% - var(--wipe-gradient-width, 0.75em)),
        #0000 100%
      );
      background-size: 0% 100%;
      background-position: left;
    }

    .lyrics-line.active:not(.lyrics-gap) .lyrics-syllable.highlight.rtl-text,
    .lyrics-line.active:not(.lyrics-gap)
      .lyrics-syllable.pre-highlight.rtl-text {
      direction: rtl;
      background-image: linear-gradient(
        -90deg,
        var(--lyplus-text-primary) 0%,
        var(--lyplus-text-primary)
          calc(100% - var(--wipe-gradient-width, 0.75em)),
        transparent 100%
      );
      background-size: 0% 100%;
      background-position: right 0%;
    }

    /* Background vocals: muted gray wipe instead of white.
       Must match specificity of the main .active .highlight rule (0,3,1). */
    .lyrics-line.active
      .background-vocal-container
      .lyrics-syllable.highlight.no-chars,
    .lyrics-line.active
      .background-vocal-container
      .lyrics-syllable.pre-highlight.no-chars,
    .lyrics-line.pre-active
      .background-vocal-container
      .lyrics-syllable.highlight.no-chars,
    .lyrics-line.pre-active
      .background-vocal-container
      .lyrics-syllable.pre-highlight.no-chars {
      background-image: linear-gradient(
        90deg,
        color-mix(in srgb, var(--lyplus-text-primary, #fff) 50%, #888888) 0%,
        color-mix(in srgb, var(--lyplus-text-primary, #fff) 50%, #888888)
          calc(100% - var(--wipe-gradient-width, 0.75em)),
        #0000 100%
      );
    }

    .lyrics-line.active
      .background-vocal-container
      .lyrics-syllable.highlight.rtl-text,
    .lyrics-line.active
      .background-vocal-container
      .lyrics-syllable.pre-highlight.rtl-text,
    .lyrics-line.pre-active
      .background-vocal-container
      .lyrics-syllable.highlight.rtl-text,
    .lyrics-line.pre-active
      .background-vocal-container
      .lyrics-syllable.pre-highlight.rtl-text {
      background-image: linear-gradient(
        -90deg,
        color-mix(in srgb, var(--lyplus-text-primary) 50%, #888888) 0%,
        color-mix(in srgb, var(--lyplus-text-primary) 50%, #888888)
          calc(100% - var(--wipe-gradient-width, 0.75em)),
        transparent 100%
      );
    }

    /* Non-growable words float up with a gentle curve */
    .lyrics-line.active:not(.lyrics-gap)
      .lyrics-word:not(.growable):not(.char-drag)
      .lyrics-syllable.highlight {
      transform: translate3d(0, var(--char-rise-y, -1.12px), 0);
    }

    .lyrics-line.persist-highlight:not(.lyrics-gap)
      .lyrics-word:not(.growable):not(.char-drag)
      .lyrics-syllable.finished {
      transform: translate3d(0, var(--char-rise-y, -1.12px), 0);
    }

    .lyrics-word.growable .lyrics-syllable.cleanup .char {
      transform: translate3d(0, var(--char-rise-y, -1.12px), 0);
    }

    .lyrics-word.char-drag .lyrics-syllable.cleanup .char {
      transform: translate3d(0, var(--char-rise-y, -1.12px), 0);
    }

    .lyrics-line.persist-highlight
      .lyrics-word.growable
      .lyrics-syllable.finished
      .char,
    .lyrics-line.persist-highlight
      .lyrics-word.char-drag
      .lyrics-syllable.finished
      .char {
      transform: translate3d(0, var(--char-rise-y, -1.12px), 0);
    }

    /* Background vocal overrides — placed AFTER main rules so they win
       on equal specificity. */
    .background-vocal-container .lyrics-syllable {
      background-color: color-mix(
        in srgb,
        var(--lyplus-text-secondary) 50%,
        #888888
      );
    }

    .lyrics-line.active:not(.lyrics-gap)
      .background-vocal-container
      .lyrics-syllable.finished,
    .lyrics-line.pre-active
      .background-vocal-container
      .lyrics-syllable.finished {
      background-color: color-mix(
        in srgb,
        var(--lyplus-text-primary) 50%,
        #888888
      );
    }

    .background-vocal-container .lyrics-syllable.line-synced {
      color: color-mix(
        in srgb,
        var(--lyplus-text-secondary) 50%,
        #888888
      ) !important;
    }

    .lyrics-line.active:not(.lyrics-gap)
      .background-vocal-container
      .lyrics-syllable.line-synced,
    .lyrics-line.pre-active
      .background-vocal-container
      .lyrics-syllable.line-synced {
      color: color-mix(
        in srgb,
        var(--lyplus-text-primary) 50%,
        #888888
      ) !important;
    }

    .lyrics-line.active:not(.lyrics-gap)
      .background-vocal-container
      .lyrics-syllable.line-synced.finished,
    .lyrics-line.pre-active
      .background-vocal-container
      .lyrics-syllable.line-synced.finished {
      color: color-mix(
        in srgb,
        var(--lyplus-text-primary) 50%,
        #888888
      ) !important;
    }

    .lyrics-line.active:not(.lyrics-gap)
      .background-vocal-container
      .lyrics-word:not(.growable):not(.char-drag)
      .lyrics-syllable.highlight,
    .lyrics-line.persist-highlight:not(.lyrics-gap)
      .background-vocal-container
      .lyrics-word:not(.growable):not(.char-drag)
      .lyrics-syllable.finished {
      transform: translate3d(0, calc(var(--char-rise-y) * 1.5), 0);
    }

    .lyrics-syllable.pre-highlight {
      animation-name: pre-wipe-universal;
      animation-duration: var(--pre-wipe-duration);
      animation-delay: var(--pre-wipe-delay);
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }

    .lyrics-syllable.pre-highlight.rtl-text {
      animation-name: pre-wipe-universal-rtl;
    }

    .lyrics-syllable.transliteration {
      font-size: var(--lyplus-font-size-subtext);
      white-space: pre-wrap;
      pointer-events: none;
      user-select: none;
    }

    /* Syllable with chars: make syllable transparent, chars handle color */
    .lyrics-line .lyrics-syllable.has-chars:not(.finished) {
      background-color: transparent;
      color: transparent;
    }

    .lyrics-syllable span.char {
      display: inline-block;
      background-color: var(--lyplus-text-secondary);
      white-space: break-spaces;
      font-variant-ligatures: none;
      font-feature-settings: 'liga' 0;
      background-clip: text;
      -webkit-background-clip: text;
      backface-visibility: hidden;
      transform-origin: 50% 80%;
      transition:
        color 0.7s,
        background-color 0.7s,
        transform 0.7s ease;
    }

    .lyrics-syllable.finished span.char {
      background-color: var(--lyplus-text-primary);
      transition:
        color 0.7s,
        background-color 0.7s,
        transform 0.7s ease;
    }

    .lyrics-word.char-drag span.char {
      transition: color 0.18s;
    }

    /* Active char spans: structural only, wipe animation sets gradient */
    .lyrics-line.active .lyrics-syllable span.char {
      background-clip: text;
      -webkit-background-clip: text;
      background-repeat: no-repeat;
      background-image:
        linear-gradient(
          90deg,
          #ffffff00 0%,
          var(--lyplus-text-primary, #fff) 50%,
          #0000 100%
        ),
        linear-gradient(
          90deg,
          var(--lyplus-text-primary, #fff) 100%,
          #0000 100%
        );
      background-size:
        var(--wipe-gradient-width, 0.75em) 100%,
        0% 100%;
      background-position:
        calc(-1 * var(--wipe-gradient-width, 0.75em)) 0%,
        left;
      transition:
        transform 0.7s ease,
        color 0.18s;
    }

    .lyrics-line.active .lyrics-syllable span.char.highlight {
      background-image: linear-gradient(
        -90deg,
        var(--lyplus-text-primary, #fff) 0%,
        var(--lyplus-text-primary, #fff)
          calc(100% - var(--wipe-gradient-width, 0.75em)),
        #0000 100%
      );
      background-size: 0% 100%;
      background-position: right 0%;
    }

    .lyrics-line.active .lyrics-syllable span.char.pre-wipe-lead {
      animation-name: char-pre-wipe;
      animation-duration: var(--pre-wipe-duration);
      animation-delay: var(--pre-wipe-delay);
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }

    /* ==========================================================================
       INSTRUMENTAL GAP STYLES
       ========================================================================== */
    .lyrics-gap {
      --gap-scale: 0;
      --gap-opacity: 0;
      display: flex;
      align-items: center;
      height: 0;
      padding: 0 var(--lyplus-padding-line);
      margin-block-end: 0;
      overflow: visible;
      opacity: 1;
      box-sizing: border-box;
      background-clip: unset;
      transform-origin: top;
      content-visibility: visible !important;
      contain: none !important;
      transition:
        height var(--am-lyrics-instrumental-enter-duration)
          cubic-bezier(0.41, 0, 0.12, 0.99),
        transform var(--scroll-duration, 280ms) var(--lyrics-line-delay, 0ms);
    }

    .lyrics-gap.active {
      height: calc(
        var(--am-lyrics-instrumental-height) +
          var(--am-lyrics-instrumental-spacing)
      );
      transition:
        height var(--am-lyrics-instrumental-enter-duration)
          cubic-bezier(0.41, 0, 0.12, 0.99),
        transform var(--scroll-duration, 280ms);
    }

    /* Reclaim the row from the first predictive-scroll frame, after the dot
       pop has finished, so the reflow and scroll share one curve. */
    .lyrics-gap.gap-collapsing {
      height: 0;
      transition:
        height var(--am-lyrics-instrumental-collapse-duration)
          cubic-bezier(0.41, 0, 0.12, 0.99),
        transform var(--scroll-duration, 280ms);
    }

    .lyrics-gap .main-vocal-container {
      position: absolute;
      inset-block-start: calc(0px - var(--am-lyrics-line-spacing));
      inset-inline-start: var(--lyplus-padding-line);
      display: flex;
      align-items: center;
      /* The preceding lyric already owns the normal line spacing. Include it
         in the dot layer so the dots sit midway between the surrounding lyric
         boxes, including while the instrumental row expands or collapses. */
      height: calc(100% + var(--am-lyrics-line-spacing));
      margin: 0;
      line-height: 1;
      opacity: 0;
      transform: scale(0);
      transform-origin: center center;
      transition:
        opacity var(--scroll-duration, 400ms) cubic-bezier(0.4, 0, 0.6, 1),
        transform var(--scroll-duration, 400ms) cubic-bezier(0.2, 0, 0.2, 1);
      will-change: transform, opacity;
    }

    .lyrics-gap.active .main-vocal-container {
      opacity: var(--gap-opacity);
      transform: scale(var(--gap-scale));
      transition: none;
    }

    .lyrics-gap.gap-collapsing .main-vocal-container,
    .lyrics-gap.gap-exiting .main-vocal-container {
      height: calc(
        var(--am-lyrics-instrumental-height) +
          var(--am-lyrics-instrumental-spacing) + var(--am-lyrics-line-spacing)
      );
    }

    .lyrics-gap.gap-exiting .main-vocal-container {
      opacity: var(--gap-exit-opacity, 0);
      transform: scale(
        var(--gap-exit-scale, var(--am-lyrics-instrumental-exit-scale))
      );
      transition: none;
    }

    .lyrics-gap .lyrics-word,
    .lyrics-gap .lyrics-syllable-wrap {
      display: flex;
      align-items: center;
      height: 100%;
    }

    .lyrics-gap .lyrics-syllable {
      display: inline-block;
      width: var(--lyplus-gap-dot-size);
      height: var(--lyplus-gap-dot-size);
      background-color: var(--lyplus-text-primary);
      border-radius: 50%;
      margin: 0 var(--lyplus-gap-dot-margin);
    }

    /* Line-synced lyrics should fade in instantly/quickly instead of wiping */
    .lyrics-syllable.line-synced {
      background: transparent !important;
      color: var(--lyplus-lyrics-palette) !important;
      opacity: 55%;
    }

    .lyrics-line.active .lyrics-syllable.line-synced {
      animation: fade-in-line 0.2s ease-out forwards !important;
      color: var(--lyplus-text-primary) !important;
    }

    .lyrics-line.active .lyrics-syllable.line-synced span.char {
      background-image: none !important;
      background-color: var(--lyplus-text-primary) !important;
      transition: background-color 120ms ease-out !important;
    }

    @keyframes fade-in-line {
      from {
        opacity: 0.5;
        color: var(--lyplus-text-secondary);
      }
      to {
        opacity: 1;
        color: var(--lyplus-lyrics-palette);
      }
    }

    .lyrics-gap .lyrics-syllable {
      background-color: var(--lyplus-text-secondary);
      background-clip: unset;
      opacity: var(--gap-dot-opacity, 0.25);
    }

    .lyrics-gap.active .lyrics-syllable.finished,
    .lyrics-gap.gap-exiting .lyrics-syllable.finished,
    .lyrics-gap:not(.active):not(.gap-exiting).post-active-line
      .lyrics-syllable,
    .lyrics-gap:not(.active):not(.gap-exiting).lyrics-activest
      .lyrics-syllable {
      background-color: var(--lyplus-text-primary);
      animation: none !important;
    }

    /* ==========================================================================
       METADATA & FOOTER STYLES
       ========================================================================== */
    .lyrics-plus-metadata {
      display: block;
      position: relative;
      box-sizing: border-box;
      font-weight: normal;
      transform: translateY(var(--lyrics-scroll-offset, 0px));
      transition:
        opacity 0.3s ease,
        transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)
          var(--lyrics-line-delay, 0ms),
        filter 0.3s ease;
    }

    .lyrics-plus-empty {
      display: block;
      height: 100vh;
      transform: translateY(var(--lyrics-scroll-offset, 0px));
    }

    .lyrics-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      text-align: left;
      font-size: calc(var(--lyplus-font-size-base) * 0.5);
      color: var(--lyplus-text-secondary);
      padding: 20px 0 50vh 0;
      margin-top: 10px;
      font-weight: 400;
      opacity: 0.8;
      transition:
        opacity 0.3s ease,
        transform 0.5s cubic-bezier(0.41, 0, 0.12, 0.99),
        filter 0.3s ease;
      transform-origin: left;
    }

    .lyrics-footer.lyrics-line {
      font-size: calc(var(--lyplus-font-size-base) * 0.5);
      padding: 20px var(--lyplus-padding-line) 50vh var(--lyplus-padding-line);
      margin-top: 0;
      margin-block-end: 0;
    }

    .lyrics-footer.active {
      opacity: 1;
      color: rgba(255, 255, 255, 0.5); /* Grey instead of primary */
    }

    .lyrics-footer.scroll-animate {
      transition: none !important;
      animation-name: lyrics-scroll;
      animation-duration: var(--scroll-duration, 280ms);
      animation-timing-function: cubic-bezier(0.41, 0, 0.12, 0.99);
      animation-fill-mode: both;
      animation-delay: var(--lyrics-line-delay, 0ms);
    }

    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-footer:not(.active) {
      filter: blur(var(--lyplus-blur-amount));
      opacity: 0.5;
    }

    .lyrics-container.user-scrolling .lyrics-footer {
      transition: none !important;
      filter: none !important;
      opacity: 0.8 !important;
    }

    .lyrics-footer p {
      margin: 5px 0;
    }

    .lyrics-footer a {
      color: var(--lyplus-text-primary); /* Stand out using primary color */
      text-underline-offset: 2px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .lyrics-footer a:hover {
      opacity: 1;
    }

    .footer-content {
      display: flex;
      align-items: flex-start;
      flex-direction: column;
      gap: 8px;
    }

    .footer-controls {
      display: flex;
      align-items: center;
    }

    /* ==========================================================================
       HEADER & CONTROLS
       ========================================================================== */
    .lyrics-header {
      display: flex;
      position: absolute;
      z-index: 2;
      inset: 10px var(--am-lyrics-inline-padding) auto;
      height: 40px;
      padding: 0;
      margin: 0;
      gap: 10px;
      justify-content: space-between;
      align-items: center;
    }

    .lyrics-header .download-button {
      position: relative;
      width: 40px;
      height: 40px;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      color: color-mix(in srgb, var(--lyplus-text-primary) 62%, transparent);
      padding: 0;
      margin: 0;
      vertical-align: middle;
      display: inline-flex;
      align-items: center;
      font-family: inherit;
      box-shadow: none;
      transition:
        color 160ms ease-out,
        background-color 160ms ease-out,
        box-shadow 160ms ease-out,
        transform 120ms ease-out;
    }

    .lyrics-header .download-button:hover {
      color: var(--lyplus-text-primary);
      background: transparent;
      box-shadow: none;
    }

    .lyrics-header .download-button.active {
      color: var(--lyplus-text-primary);
      background: transparent;
    }

    .lyrics-header .download-button:active:not(:disabled) {
      transform: scale(0.96);
    }

    .lyrics-header .download-button:focus-visible,
    .source-switch-btn:focus-visible,
    .format-select:focus-visible {
      outline: 2px solid
        color-mix(in srgb, var(--lyplus-text-primary) 72%, transparent);
      outline-offset: 2px;
    }

    .header-controls {
      display: flex;
      gap: 8px;
    }

    .download-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .source-switch-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      padding: 0 12px;
      border: 0;
      min-height: 40px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      color: #aaa;
      cursor: pointer;
      font-family: inherit;
      font-size: 11px;
      transition:
        color 0.2s ease,
        border-color 0.2s ease,
        background-color 0.2s ease,
        transform 0.12s ease;
    }

    .source-switch-btn:active:not(:disabled) {
      transform: scale(0.96);
    }

    .source-switch-btn:disabled {
      cursor: default;
      opacity: 0.7;
    }

    .source-switch-svg {
      margin-right: 4px;
    }

    .source-switch-svg.is-loading {
      animation: source-switch-spin 1s linear infinite;
    }

    .control-button {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 0.8em;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition:
        color 0.2s,
        border-color 0.2s,
        background-color 0.2s;
      font-weight: normal;
    }

    .control-button:hover {
      color: rgba(255, 255, 255, 0.9);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .control-button.active {
      background-color: var(--lyplus-text-primary);
      border-color: var(--lyplus-text-primary);
      color: #000;
    }

    .format-select {
      min-height: 40px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8em;
      margin-left: 0;
      padding: 0 28px 0 12px;
      cursor: pointer;
      font-weight: normal;
      font-family: inherit;
    }

    .format-select:hover {
      color: rgba(255, 255, 255, 0.9);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .format-select option {
      background: #1a1a1a;
      color: #fff;
    }

    /* ==========================================================================
       TRANSLATION & ROMANIZATION
       ========================================================================== */
    .lyrics-translation-container,
    .lyrics-romanization-container {
      padding-top: 0.2em;
      opacity: 0.8;
      font-size: var(--lyplus-font-size-subtext);
      overflow-wrap: break-word;
      pointer-events: none;
      user-select: none;
      transition:
        opacity 0.3s ease,
        color 0.3s;
      font-weight: normal;
    }

    .lyrics-romanization-container {
      direction: ltr !important;
    }

    .lyrics-romanization-container.rtl-text {
      direction: rtl !important;
      text-align: right;
    }

    .lyrics-romanization-container .lyrics-syllable {
      white-space: pre-wrap;
    }

    .lyrics-translation-container {
      opacity: 0.5;
    }

    .main-line-wrapper.small {
      font-size: 0.5em;
      opacity: 0.8;
      display: block;
      margin-bottom: 0px;
    }

    .translation-line {
      font-size: 1em;
      font-weight: bold;
      display: block;
      margin-top: 0px;
      line-height: 1.1;
    }

    .romanized-line {
      font-size: 0.5em;
      color: rgba(255, 255, 255, 0.5);
      display: block;
      margin-top: 2px;
      font-weight: normal;
    }

    /* ==========================================================================
       SKELETON LOADING
       ========================================================================== */
    @keyframes skeleton-loading {
      0% {
        background-color: rgba(255, 255, 255, 0.1);
      }
      100% {
        background-color: rgba(255, 255, 255, 0.2);
      }
    }

    .skeleton-line {
      height: 2.5em;
      margin: 0 0 var(--am-lyrics-line-spacing);
      border-radius: 16px;
      animation: skeleton-loading 1s linear infinite alternate;
      opacity: 0.7;
      width: 60%;
    }

    .skeleton-line:nth-child(even) {
      width: 80%;
    }
    .skeleton-line:nth-child(3n) {
      width: 50%;
    }
    .skeleton-line:nth-child(5n) {
      width: 70%;
    }

    .no-lyrics {
      color: rgba(255, 255, 255, 0.5);
      font-size: 1.2em;
      text-align: center;
      padding: 2em;
      font-weight: normal;
    }

    /* ==========================================================================
       KEYFRAME ANIMATIONS
       ========================================================================== */

    @keyframes source-switch-spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Wipe animation for syllables */
    @keyframes wipe {
      from {
        background-size: 0% 100%;
        background-position: left;
      }
      to {
        background-size: calc(100% + var(--wipe-gradient-width, 0.75em)) 100%;
        background-position: left;
      }
    }

    @keyframes wipe-from-pre {
      from {
        background-size: var(--wipe-gradient-width, 0.75em) 100%;
        background-position: left;
      }
      to {
        background-size: calc(100% + var(--wipe-gradient-width, 0.75em)) 100%;
        background-position: left;
      }
    }

    @keyframes start-wipe {
      0% {
        background-size: 0% 100%;
        background-position: left;
      }
      100% {
        background-size: calc(100% + var(--wipe-gradient-width, 0.75em)) 100%;
        background-position: left;
      }
    }

    @keyframes wipe-rtl {
      from {
        background-size: 0% 100%;
        background-position: right 0%;
      }
      to {
        background-size: calc(100% + var(--wipe-gradient-width, 0.75em)) 100%;
        background-position: right 0%;
      }
    }

    @keyframes wipe-from-pre-rtl {
      from {
        background-size: var(--wipe-gradient-width, 0.75em) 100%;
        background-position: right 0%;
      }
      to {
        background-size: calc(100% + var(--wipe-gradient-width, 0.75em)) 100%;
        background-position: right 0%;
      }
    }

    @keyframes start-wipe-rtl {
      0% {
        background-size: 0% 100%;
        background-position: right 0%;
      }
      100% {
        background-size: calc(100% + var(--wipe-gradient-width, 0.75em)) 100%;
        background-position: right 0%;
      }
    }

    @keyframes pre-wipe-universal {
      from {
        background-size: 0% 100%;
        background-position: left;
      }
      to {
        background-size: var(--wipe-gradient-width, 0.75em) 100%;
        background-position: left;
      }
    }

    @keyframes pre-wipe-universal-rtl {
      from {
        background-size: 0% 100%;
        background-position: right 0%;
      }
      to {
        background-size: var(--wipe-gradient-width, 0.75em) 100%;
        background-position: right 0%;
      }
    }

    /* Character-rendered words use a separate moving gradient in front of
       their solid fill. This makes the individual glyph wipes read as one
       continuous word-level wipe. */
    @keyframes char-pre-wipe {
      from {
        background-size:
          var(--wipe-gradient-width, 0.75em) 100%,
          0% 100%;
        background-position:
          calc(-1 * var(--wipe-gradient-width, 0.75em)) 0%,
          left;
      }
      to {
        background-size:
          var(--wipe-gradient-width, 0.75em) 100%,
          0% 100%;
        background-position:
          calc(-1 * var(--wipe-gradient-half, 0.375em)) 0%,
          left;
      }
    }

    @keyframes char-start-wipe {
      from {
        background-size:
          var(--wipe-gradient-width, 0.75em) 100%,
          0% 100%;
        background-position:
          calc(-1 * var(--wipe-gradient-width, 0.75em)) 0%,
          left;
      }
      to {
        background-size:
          var(--wipe-gradient-width, 0.75em) 100%,
          100% 100%;
        background-position:
          calc(100% + var(--wipe-gradient-half, 0.375em)) 0%,
          left;
      }
    }

    @keyframes char-wipe {
      from {
        background-size:
          var(--wipe-gradient-width, 0.75em) 100%,
          0% 100%;
        background-position:
          calc(-1 * var(--wipe-gradient-half, 0.375em)) 0%,
          left;
      }
      to {
        background-size:
          var(--wipe-gradient-width, 0.75em) 100%,
          100% 100%;
        background-position:
          calc(100% + var(--wipe-gradient-half, 0.375em)) 0%,
          left;
      }
    }

    @keyframes fade-gap {
      from {
        background-color: var(--lyplus-text-secondary);
      }
      to {
        background-color: var(--lyplus-text-primary);
      }
    }

    @keyframes background-vocal-scale-out {
      0%,
      18% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(var(--am-lyrics-background-vocal-scale));
      }
    }

    /* Scroll animation — class is removed and re-added (with a forced
       reflow in between) to reliably restart the animation each time */
    @keyframes lyrics-scroll {
      from {
        transform: translate3d(0, var(--scroll-delta), 0);
      }
      to {
        transform: translate3d(0, 0, 0);
      }
    }

    /* Character grow animation — translate3d+scale3d for smooth transform,
       drop-shadow for glow */
    @keyframes grow-dynamic {
      0% {
        transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
        filter: drop-shadow(
          0 0 0
            color-mix(in srgb, var(--lyplus-lyrics-palette), transparent 100%)
        );
      }
      25%,
      30% {
        transform: translate3d(
            var(--char-offset-x, 0px),
            var(--translate-y-peak, -2px),
            0
          )
          scale3d(var(--matrix-scale, 1.1), var(--matrix-scale, 1.1), 1);
        filter: drop-shadow(
          0 0 var(--am-lyrics-glow-radius)
            color-mix(
              in srgb,
              var(--lyplus-lyrics-palette),
              transparent calc((1 - var(--shadow-intensity, 1)) * 100%)
            )
        );
      }
      75%,
      100% {
        transform: translate3d(0, var(--char-rise-y, -1.12px), 0)
          scale3d(1, 1, 1);
        filter: drop-shadow(
          0 0 0
            color-mix(in srgb, var(--lyplus-lyrics-palette), transparent 100%)
        );
      }
    }

    @keyframes rise-char {
      0%,
      100% {
        transform: translate3d(0, 0, 0);
      }
      55% {
        transform: translate3d(
          0,
          var(--am-lyrics-character-rise-peak, -1.25px),
          0
        );
      }
    }

    @keyframes drag-char {
      0% {
        transform: translate3d(0, 0, 0);
      }
      100% {
        transform: translate3d(0, var(--char-rise-y, -1.12px), 0);
      }
    }

    @keyframes grow-static {
      0%,
      100% {
        transform: scale3d(1.01, 1.01, 1.1) translateY(-0.05%);
        text-shadow: 0 0 0
          color-mix(in srgb, var(--lyplus-lyrics-palette), transparent 100%);
      }
      30%,
      40% {
        transform: scale3d(1.1, 1.1, 1.1) translateY(-0.05%);
        text-shadow: 0 0 0.3em
          color-mix(in srgb, var(--lyplus-lyrics-palette), transparent 50%);
      }
    }

    /* Fade in animation */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 0.7;
        transform: translateY(0);
      }
    }

    /* Legacy support */
    .opposite-turn {
      text-align: right;
    }

    .singer-right {
      text-align: right;
      justify-content: flex-end;
    }

    .singer-left {
      text-align: left;
      justify-content: flex-start;
    }

    /* Legacy progress-text for backward compatibility */
    .progress-text {
      position: relative;
      display: inline-block;
      background: linear-gradient(
        to right,
        var(--lyplus-text-primary) 0%,
        var(--lyplus-text-primary) var(--line-progress, 0%),
        var(--lyplus-text-secondary) var(--line-progress, 0%),
        var(--lyplus-text-secondary) 100%
      );
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: var(--lyplus-text-secondary);
      transform: translate3d(0, 0, 0);
    }

    .progress-text::before {
      display: none;
    }

    .active-line {
      font-weight: bold;
    }

    .background-text {
      display: block;
      color: var(--lyplus-text-secondary);
      font-size: 0.8em;
      font-style: normal;
      margin: 0;
      flex-shrink: 0;
      line-height: 1.1;
    }

    .background-text.before {
      order: -1;
    }

    .background-text.after {
      order: 1;
    }

    .instrumental-line {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      color: var(--lyplus-text-secondary);
      font-size: 0.9em;
      padding: 4px 10px;
      animation: fadeInUp 220ms ease;
      font-weight: normal;
    }

    .instrumental-duration {
      color: var(--lyplus-text-secondary);
      font-size: 0.8em;
    }

    @container (max-width: 519px) {
      .lyrics-container {
        --lyplus-font-size-base: var(--am-lyrics-compact-font-size, 28px);
        --am-lyrics-line-spacing: var(--am-lyrics-compact-line-spacing, 20px);
        --am-lyrics-background-vocal-font-size: var(
          --am-lyrics-compact-background-vocal-font-size,
          0.857em
        );
        --lyrics-scroll-padding-top: var(
          --am-lyrics-compact-selected-position,
          18%
        );
        --am-lyrics-inline-padding: 14px;
      }
    }

    @container (min-width: 900px) {
      .lyrics-container {
        --lyplus-font-size-base: var(--am-lyrics-wide-font-size, 48px);
        --am-lyrics-line-height: 1.17;
        --am-lyrics-line-spacing: var(--am-lyrics-wide-line-spacing, 32px);
        --am-lyrics-background-vocal-font-size: var(
          --am-lyrics-wide-background-vocal-font-size,
          0.667em
        );
        --lyrics-scroll-padding-top: var(
          --am-lyrics-wide-selected-position,
          20%
        );
        --am-lyrics-inline-padding: 32px;
      }
    }

    @media (prefers-contrast: more) {
      :host {
        --lyplus-text-secondary: color-mix(
          in srgb,
          var(--lyplus-lyrics-palette),
          transparent 24%
        );
      }

      .lyrics-line:focus-visible::before {
        box-shadow: 0 0 0 3px var(--lyplus-text-primary);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .lyrics-line,
      .lyrics-line::before,
      .lyrics-line-container,
      .background-vocal-container,
      .background-vocal-wrap,
      .lyrics-syllable,
      .lyrics-syllable span.char,
      .lyrics-gap .main-vocal-container,
      .lyrics-plus-metadata,
      .lyrics-footer,
      .download-button,
      .source-switch-btn {
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 1ms !important;
        transition-delay: 0ms !important;
      }
    }
  `,z([G({type:String})],d.prototype,"query",void 0),z([G({type:String})],d.prototype,"musicId",void 0),z([G({type:String})],d.prototype,"isrc",void 0),z([G({type:String})],d.prototype,"ttml",void 0),z([G({type:String,attribute:"song-title"})],d.prototype,"songTitle",void 0),z([nt()],d.prototype,"downloadFormat",void 0),z([G({type:String,attribute:"song-artist"})],d.prototype,"songArtist",void 0),z([G({type:String,attribute:"song-album"})],d.prototype,"songAlbum",void 0),z([G({type:String,attribute:"songwriters"})],d.prototype,"songwriters",void 0),z([G({type:Number,attribute:"song-duration"})],d.prototype,"songDurationMs",void 0),z([G({type:String,attribute:"highlight-color"})],d.prototype,"highlightColor",void 0),z([G({type:String,attribute:"font-family"})],d.prototype,"fontFamily",void 0),z([G({type:Boolean})],d.prototype,"autoScroll",void 0),z([G({type:Boolean})],d.prototype,"interpolate",void 0),z([nt()],d.prototype,"showRomanization",void 0),z([nt()],d.prototype,"showTranslation",void 0),z([G({type:Number})],d.prototype,"duration",void 0),z([G({type:Number,attribute:"currenttime",hasChanged:()=>!1})],d.prototype,"currentTime",null),z([nt()],d.prototype,"isLoading",void 0),z([nt()],d.prototype,"lyrics",void 0),z([nt()],d.prototype,"lyricsSource",void 0),z([nt()],d.prototype,"availableSources",void 0),z([nt()],d.prototype,"currentSourceIndex",void 0),z([ai(".lyrics-container")],d.prototype,"lyricsContainer",void 0),window.customElements.define("am-lyrics",d),Me}var _e=Yi();const Ki=ji(_e),as=Vi({__proto__:null,default:Ki},[_e]);export{as as a};
