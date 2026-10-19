(function(){
  var t=document.querySelector('.track');if(!t)return;
  var s=t.querySelectorAll('.slide'),c=document.querySelector('.count b'),p=document.querySelector('.arrow.prev'),n=document.querySelector('.arrow.next');
  function step(){return s.length>1?s[1].offsetLeft-s[0].offsetLeft:t.clientWidth}
  function idx(){return Math.round(t.scrollLeft/step())}
  function upd(){var i=Math.min(idx(),s.length-1),end=t.scrollLeft+t.clientWidth>=t.scrollWidth-4;if(end)i=s.length-1;c.textContent=i+1;p.disabled=t.scrollLeft<4;n.disabled=end}
  function go(d){t.scrollBy({left:d*step(),behavior:'smooth'})}
  p.addEventListener('click',function(){go(-1)});n.addEventListener('click',function(){go(1)});
  t.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();go(1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(-1)}});
  var r;t.addEventListener('scroll',function(){cancelAnimationFrame(r);r=requestAnimationFrame(upd)},{passive:true});
  window.addEventListener('resize',upd);upd();
})();
