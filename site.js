/* ============================================================
   AMLIA — interacciones del sitio
   (vanilla JS, sin dependencias)
   ============================================================ */
(function(){
  'use strict';

  /* ---------- 1. Red de partículas (fondo global) ---------- */
  function initParticles(){
    var canvas = document.getElementById('bg-canvas');
    if(!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H, DPR = Math.min(window.devicePixelRatio||1, 2);
    var pts = [], LINK = 150;
    var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    function resize(){
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W*DPR; canvas.height = H*DPR;
      ctx.setTransform(DPR,0,0,DPR,0,0);
      var target = Math.round(Math.min(72, (W*H)/24000));
      pts = [];
      for(var i=0;i<target;i++){
        pts.push({x:Math.random()*W, y:Math.random()*H,
          vx:(Math.random()-.5)*.32, vy:(Math.random()-.5)*.32,
          r:Math.random()*1.7+1});
      }
    }
    function frame(){
      ctx.clearRect(0,0,W,H);
      for(var i=0;i<pts.length;i++){
        var p=pts[i]; p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1;
      }
      for(var a=0;a<pts.length;a++){
        for(var b=a+1;b<pts.length;b++){
          var dx=pts[a].x-pts[b].x, dy=pts[a].y-pts[b].y;
          var d=Math.sqrt(dx*dx+dy*dy);
          if(d<LINK){
            ctx.strokeStyle='rgba(232,178,58,'+(0.16*(1-d/LINK))+')';
            ctx.lineWidth=1; ctx.beginPath();
            ctx.moveTo(pts[a].x,pts[a].y); ctx.lineTo(pts[b].x,pts[b].y); ctx.stroke();
          }
        }
      }
      for(var k=0;k<pts.length;k++){
        ctx.fillStyle='rgba(255,201,77,.7)';
        ctx.beginPath(); ctx.arc(pts[k].x,pts[k].y,pts[k].r,0,6.283); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    var raf;
    resize();
    window.addEventListener('resize', function(){ cancelAnimationFrame(raf); resize(); if(!reduce) frame(); });
    if(reduce){ frame(); cancelAnimationFrame(raf); } // draw once
    else frame();
  }

  /* ---------- 2. Reveal al scroll ---------- */
  function initReveal(){
    var els = document.querySelectorAll('[data-reveal]');
    if(!els.length) return;
    // Activate animation mode (CSS hides elements only under .anim)
    document.documentElement.classList.add('anim');
    if(!('IntersectionObserver' in window)){
      document.documentElement.classList.remove('anim'); return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('in-view'); io.unobserve(en.target); }
      });
    }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    els.forEach(function(e){ io.observe(e); });

    // Failsafe: if the observer hasn't revealed the first (always-visible)
    // element shortly after load, assume it isn't firing and reveal everything.
    setTimeout(function(){
      var first = els[0];
      if(first && !first.classList.contains('in-view')){
        els.forEach(function(e){ e.classList.add('in-view'); });
      }
    }, 1500);
  }

  /* ---------- 3. Contadores ---------- */
  function initCounters(){
    var nums = document.querySelectorAll('[data-count]');
    if(!nums.length) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        var el=en.target, target=parseFloat(el.dataset.count),
            pre=el.dataset.pre||'', suf=el.dataset.suf||'', dec=parseInt(el.dataset.dec||'0',10),
            t0=null, dur=1500;
        function step(ts){
          if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1);
          var e=1-Math.pow(1-p,3);
          el.textContent = pre + (target*e).toFixed(dec) + suf;
          if(p<1) requestAnimationFrame(step);
          else el.textContent = pre + target.toFixed(dec) + suf;
        }
        requestAnimationFrame(step); io.unobserve(el);
      });
    }, {threshold:.5});
    nums.forEach(function(n){ io.observe(n); });
  }

  /* ---------- 4. Navbar (scroll + móvil + activo) ---------- */
  function initNav(){
    var nav = document.querySelector('.nav');
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    function onScroll(){ if(nav) nav.classList.toggle('scrolled', window.scrollY>24); }
    onScroll(); window.addEventListener('scroll', onScroll, {passive:true});
    if(toggle && links){
      toggle.addEventListener('click', function(){
        var open = links.classList.toggle('open'); toggle.classList.toggle('open', open);
      });
      links.querySelectorAll('a').forEach(function(a){
        a.addEventListener('click', function(){ links.classList.remove('open'); toggle.classList.remove('open'); });
      });
    }
  }

  /* ---------- 5. FAQ acordeón ---------- */
  function initFaq(){
    document.querySelectorAll('.faq-q').forEach(function(q){
      q.addEventListener('click', function(){
        var item=q.closest('.faq'), ans=item.querySelector('.faq-a');
        var open=item.classList.contains('open');
        document.querySelectorAll('.faq.open').forEach(function(o){
          o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight=null;
        });
        if(!open){ item.classList.add('open'); ans.style.maxHeight=ans.scrollHeight+'px'; }
      });
    });
  }

  /* ---------- 6. Año dinámico ---------- */
  function initYear(){
    document.querySelectorAll('[data-year]').forEach(function(e){ e.textContent=new Date().getFullYear(); });
  }

  function init(){
    var safe=function(fn){ try{ fn(); }catch(e){ /* keep page usable */ } };
    safe(initReveal); safe(initNav); safe(initFaq); safe(initCounters); safe(initYear); safe(initParticles);
  }
  if(document.readyState!=='loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
