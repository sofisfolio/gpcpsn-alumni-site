/* Hash router (kept from prototype; works on Cloudflare Pages with no rewrite rules). */
import {$,$$,U} from './lib/util.js';
import {app,links,burger,lb,lbi,hooks} from './ui.js';
import {V} from './views/templates.js';
import {wire} from './views/wire.js';
const ROUTES=["home","about","alumni","profile","jobs","job","post-job","events","event","news","blog","login","me","admin","contact","write"];
const TITLES={home:"GPCPSN Alumni Network",about:"About Alumni",alumni:"Alumni Network",jobs:"Job Portal","post-job":"Post a Job",events:"Events",news:"News & Blogs",login:"Login",me:"My profile",admin:"Admin panel",contact:"Contact",write:"Write an article"};
export function parse(){
  const h=(location.hash||"#home").slice(1);
  const [p,...rest]=h.split("/");
  const arg=rest.join("/");
  if(p==="join") return{p:"login",arg:"join"};
  return{p:ROUTES.includes(p)?p:"home",arg:arg||""};
}
app.addEventListener("click",e=>{const g=e.target.closest("[data-lb]");if(g){lbi.src=U(g.dataset.lb,1600);lb.classList.add("on")}});

export function route(){
  const {p,arg}=parse();
  if(location.hash==="#join"){location.hash="#login/join";return}
  const tpl=p==="profile"?V.profile:p==="job"?V.job:p==="event"?V.event:p==="blog"?V.blog:V[p];
  const html=tpl?tpl(arg):V.home();
  app.innerHTML=`<div class="view">${html}</div>`;
  document.title=(TITLES[p]||TITLES.home)+" | GPCPSN";
  const navKey=p==="profile"?"alumni":p==="job"||p==="post-job"?"jobs":p==="event"?"events":p==="blog"?"news":p;
  $$("[data-nav]").forEach(a=>a.classList.toggle("on",a.dataset.nav===navKey));
  links.classList.remove("open");burger.classList.remove("open");
  scrollTo({top:0,behavior:"instant"});
  wire(p,arg);
}
addEventListener("hashchange",route);
hooks.route=route;
