/* Chrome: toast, modal, lightbox, auth gate, mobile nav, scroll/reveal effects. */
import {$,$$,esc,ini} from './lib/util.js';
import {S} from './state.js';
export const hooks={route:()=>{}};
export const app=$('#app');
export const toastEl=$("#toast");let tt;
export function toast(m){$("#toastT").textContent=m;toastEl.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>toastEl.classList.remove("on"),2800)}
export const modal=$("#modal"),mc=$("#mcontent");
export function openModal(html){mc.innerHTML=html;modal.classList.add("on")}
export function closeModal(){modal.classList.remove("on")}
$("#mx").onclick=closeModal;
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});
export const lb=$("#lb"),lbi=$("#lbi");
$("#lbx").onclick=()=>lb.classList.remove("on");
lb.onclick=e=>{if(e.target===lb)lb.classList.remove("on")};
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();lb.classList.remove("on");links.classList.remove("open");burger.classList.remove("open")}});

export const LOCK_ICON='<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>';
export function gate(msg,fn){
  if(S.auth){fn();return}
  openModal(`<div style="text-align:center"><div class="ic dark" style="margin:0 auto 18px;width:68px;height:68px;border-radius:50%">${LOCK_ICON}</div><h2 style="font-size:1.55rem">Sign in to continue</h2><p style="margin:10px 0 24px">${esc(msg)}</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a href="#login" class="btn btn-em" onclick="document.getElementById('modal').classList.remove('on')">Sign in</a><a href="#login/join" class="btn btn-line" onclick="document.getElementById('modal').classList.remove('on')">Create account</a></div></div>`);
}
export function setAuth(on,name){
  S.auth=on;S.user=on?name:null;
  const j=$("#joinCta");
  j.textContent=on?"Sign out":"Join Alumni Network";
  j.setAttribute("href",on?"#home":"#login/join");
  const me=$("#me");
  me.innerHTML=on?`<span class="av">${esc(ini(name))}</span><span>${esc(name)}</span>`:"";
}
$("#joinCta").addEventListener("click",e=>{if(S.auth){e.preventDefault();setAuth(false);toast("Signed out");hooks.route()}});

/* mobile nav */
export const links=$("#links"),burger=$("#burger");
burger.onclick=e=>{e.stopPropagation();const o=links.classList.toggle("open");burger.classList.toggle("open",o);burger.setAttribute("aria-expanded",o)};
document.addEventListener("click",e=>{
  if(links.classList.contains("open")&&!links.contains(e.target)&&!burger.contains(e.target)){links.classList.remove("open");burger.classList.remove("open")}
});

export const hdr=$("#hdr");
addEventListener("scroll",()=>{hdr.classList.toggle("sc",scrollY>10);$("#totop").classList.toggle("on",scrollY>500)},{passive:true});
$("#totop").onclick=()=>scrollTo({top:0,behavior:"smooth"});

/* reveal & counters */
export const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add("in");io.unobserve(en.target)}}),{threshold:.1,rootMargin:"0px 0px -40px 0px"});
export const cio=new IntersectionObserver(es=>es.forEach(en=>{
  if(!en.isIntersecting)return;
  const el=en.target,end=+el.dataset.c,t0=performance.now();
  const st=n=>{const p=Math.min((n-t0)/1600,1),v=Math.round(end*(1-Math.pow(1-p,3)));el.textContent=v.toLocaleString("en-IN")+(p===1&&end>=10?"+":"");if(p<1)requestAnimationFrame(st)};
  requestAnimationFrame(st);cio.unobserve(el);
}),{threshold:.5});
export function motion(root=document){
  $$(".reveal:not(.in)",root).forEach(el=>io.observe(el));
  $$("[data-c]:not([data-done])",root).forEach(el=>{el.dataset.done=1;cio.observe(el)});
}
export function bars(root=document){requestAnimationFrame(()=>$$("[data-w]",root).forEach(i=>i.style.width=i.dataset.w+"%"))}
