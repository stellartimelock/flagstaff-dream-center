(function(){
  var H={1:['Stop using Stripe & Square\u2014no more 2.4% fees.','Answer a few questions to get your quote.'],
    2:['Tell us how you want to process sales.',''],'2.5':['Tell us how you want to process sales.',''],
    3:['Instantly receive your custom pricing by text and email. Please use a number that can receive a text.',''],
    4:['Instantly receive your custom pricing by text and email. Please use a number that can receive a text.','']};
  var method='Terminal Processing - Free',h=document.getElementById('gp-h'),sub=document.getElementById('gp-sub'),prog=document.querySelectorAll('.gp-prog li');
  function pick(sel,m){document.querySelectorAll(sel).forEach(function(e){e.hidden=e.getAttribute('data-method')!==m})}
  function show(st){
    document.querySelectorAll('[data-step]').forEach(function(e){e.hidden=e.getAttribute('data-step')!==String(st)});
    h.textContent=H[st][0];sub.textContent=H[st][1];sub.hidden=!H[st][1];
    var n=st>=3?3:(st>=2?2:1);prog.forEach(function(li,i){li.classList.toggle('on',i<n)});
    pick('.gp-sel',method);pick('.gp-pack',method);
    document.querySelectorAll('.gp-tab').forEach(function(t){t.setAttribute('aria-pressed',t.getAttribute('data-method')===method)});
    var top=document.querySelector('.gp-head').getBoundingClientRect().top;if(top<0)window.scrollBy({top:top-90,behavior:'smooth'});
  }
  document.addEventListener('click',function(ev){
    var t=ev.target.closest('[data-go],[data-back],.gp-opt,.gp-tab');if(!t)return;
    if(t.classList.contains('gp-opt')){var m=t.getAttribute('data-method');if(m==='POS'){show('2.5');return}method=m;show(3);return}
    if(t.classList.contains('gp-tab')){method=t.getAttribute('data-method');show(4);return}
    show(t.getAttribute('data-go')||t.getAttribute('data-back'));
  });
  show(1);
})();
