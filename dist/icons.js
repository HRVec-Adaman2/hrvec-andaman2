// Local SVG icons. No icon CDN or network request is required.
const shapes={
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="4" rx="1.5"/><rect x="14" y="11" width="7" height="10" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 10h18"/>',
 check:'<path d="m9 12 2 2 4-4"/><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M14 3h7v7M21 3l-9 9"/>',
 badge:'<path d="m12 3 2.4 1.2 2.7.4 1.3 2.5 1.9 2-1.1 2.6-.2 2.8-2.7 1.1-2.3 1.6-2.5-1.2-2.7-.4-1.3-2.5-1.9-2 1.1-2.6.2-2.8L9.5 4.6 12 3Z"/><path d="m9 16-2 6 5-2 5 2-1.8-6M10 9l2 2 3-3"/>',
 chart:'<path d="M3 3v18h18M7 16v-5m5 5V7m5 9v-7"/>',
 settings:'<path d="m10 3-.8 2.2-2 .9L5 5.5 3 9l1.7 1.6v2.8L3 15l2 3.5 2.2-.6 2 .9L10 21h4l.8-2.2 2-.9 2.2.6 2-3.5-1.7-1.6v-2.8L21 9l-2-3.5-2.2.6-2-.9L14 3h-4Z"/><circle cx="12" cy="12" r="3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.2.7-1.5 1.2-1.5 2M12 17h.01"/>',
 shield:'<path d="m12 3 8 3v6c0 4.4-4.1 7.7-8 9-3.9-1.3-8-4.6-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
 download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 edit:'<path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15l-1 6 1-1Z"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 print:'<path d="M7 8V3h10v5M7 17H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-3M7 14h10v7H7zM17 11h.01"/>',
 school:'<path d="m3 9 9-6 9 6M5 9h14v12H5V9Zm4 12v-6h6v6M9 11h.01M15 11h.01"/>',
 education:'<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v6c3 3 9 3 12 0v-6M22 9v7"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
 database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5M5.5 7a7.5 7.5 0 0 1 12.8-1.5L20 8M4 16l1.7 2.5A7.5 7.5 0 0 0 18.5 17"/>',
 layers:'<path d="m3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5"/>',
 login:'<path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5M3 12h12m-5-5 5 5-5 5"/>',
 logout:'<path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M9 12h12m-5-5 5 5-5 5"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8M8 17h6"/>',
 filter:'<path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z"/>',
 save:'<path d="M4 3h13l4 4v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 0v6h10V3M7 21v-8h10v8"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0v5l-2 4h16l-2-4V8ZM10 21h4"/>'
};
export function icon(name,extra=''){return `<svg class="icon${extra?' '+extra:''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[name]||shapes.file}</svg>`;}
export const pageIcons={dashboard:'dashboard',personnel:'users',documents:'folder',review:'check',certificates:'badge',reports:'chart',settings:'settings',archive:'trash',accounts:'shield',requests:'check',logs:'clock',guide:'help'};
export const actionIcons={accountform:'shield',changepassword:'shield',requestremoval:'trash',reviewremoval:'check',deleteperson:'trash',restoreperson:'refresh',personhistory:'clock',reloadperson:'refresh',requestaccess:'shield',demoaccess:'eye',close:'close',goto:'arrow',editperson:'edit',profile:'user',upload:'upload',editcert:'badge',certdetail:'eye',exportcsv:'download',exportxlsx:'download',print:'print',reviewdoc:'check',download:'download',import:'upload',confirmimport:'check',template:'download',backup:'database',sync:'refresh',cache:'refresh',lookup:'plus',editschool:'edit',edittype:'settings',exportpeople:'download',drilldown:'filter',refresh:'refresh',togglemenu:'menu',closemenu:'close'};
