import {$} from './lib/util.js';
import {route} from './router.js';
import './ui.js';
import {DEV_BANNER} from './config.js';
if(DEV_BANNER){
  document.body.insertAdjacentHTML('afterbegin',
    '<div role="note" style="background:#C8601A;color:#fff;text-align:center;font:600 13px/1.4 system-ui,sans-serif;padding:6px 12px">Preview build: sample content only, not real alumni or listings.</div>');
}
$('#yr').textContent=new Date().getFullYear();
route();
