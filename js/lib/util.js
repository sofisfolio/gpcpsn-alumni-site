/* Shared helpers (extracted unchanged from prototype v17). */
export const CAMPUS="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2000&q=88";
export const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
// Curated Unsplash stock photography. The IDs below are used throughout the site's
// existing content data; image URLs are stable and served with responsive crop/quality.
export const U=(id,w=1400)=>{
  const photo=String(id||"");
  if(!/^photo-\d+-[\w-]+$/.test(photo)) return CAMPUS.replace("w=2000","w="+w);
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${w}&q=86`;
};
export const P=id=>U(id,600);
export const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const ini=n=>n.split(" ").map(x=>x[0]).slice(0,2).join("");
export const TODAY=new Date(new Date().toDateString());
export const dt=s=>{const d=new Date(s+"T00:00:00");return{day:d.getDate(),mon:d.toLocaleString("en-IN",{month:"short"}),full:d.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}),short:d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}),past:d<TODAY}};
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
