const token=import.meta.env.VITE_CF_WEB_ANALYTICS_TOKEN;
if(import.meta.env.PROD&&token){
 const script=document.createElement('script');
 script.defer=true;
 script.src='https://static.cloudflareinsights.com/beacon.min.js';
 script.setAttribute('data-cf-beacon',JSON.stringify({token}));
 document.head.appendChild(script);
}