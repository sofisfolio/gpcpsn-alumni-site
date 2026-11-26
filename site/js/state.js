/* Client-side UI state. Phase 3 replaces S.auth/S.user with the Supabase session. */
export const S={auth:false,user:null,profile:null,isAdmin:false,perms:new Set(),roles:[],superadmin:false,ready:false,rsvp:{},apply:{},saved:{},rsvpN:0};
export const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const can=p=>S.perms.has(p);
