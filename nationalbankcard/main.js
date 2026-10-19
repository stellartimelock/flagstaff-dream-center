(function(){
  document.querySelectorAll('.carousel').forEach(function(root){
    var t=root.querySelector('.track');if(!t)return;
    var s=t.querySelectorAll('.slide'),c=root.querySelector('.count b'),p=root.querySelector('.arrow.prev'),n=root.querySelector('.arrow.next');
    function step(){return s.length>1?s[1].offsetLeft-s[0].offsetLeft:t.clientWidth}
    function upd(){var end=t.scrollLeft+t.clientWidth>=t.scrollWidth-4,i=end?s.length-1:Math.min(Math.round(t.scrollLeft/step()),s.length-1);if(c)c.textContent=i+1;if(p)p.disabled=t.scrollLeft<4;if(n)n.disabled=end}
    function go(d){t.scrollBy({left:d*step(),behavior:'smooth'})}
    if(p)p.addEventListener('click',function(){go(-1)});if(n)n.addEventListener('click',function(){go(1)});
    t.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();go(1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(-1)}});
    var r;t.addEventListener('scroll',function(){cancelAnimationFrame(r);r=requestAnimationFrame(upd)},{passive:true});
    window.addEventListener('resize',upd);upd();
  });
})();
