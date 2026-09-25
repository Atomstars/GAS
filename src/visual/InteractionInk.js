// A shared, short-lived material trail keeps touch feedback continuous as the
// visitor moves between frames. Points live in document coordinates.
export function createInteractionInk(reduced) {
  const canvas=document.createElement('canvas');canvas.className='interaction-ink';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
  const ctx=canvas.getContext('2d'),points=[];let frame=0,last=0;
  function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}
  function draw(now){
    frame=0;ctx.clearRect(0,0,canvas.width,canvas.height);
    if(document.hidden||reduced.matches){points.length=0;return;}
    while(points.length&&now-points[0].time>2600)points.shift();
    ctx.globalCompositeOperation='screen';
    points.forEach((p,i)=>{
      const age=(now-p.time)/2600,alpha=(1-age)*(p.pressed?.28:.12),x=p.x+Math.sin(age*4+p.seed)*age*24,y=p.y-scrollY-age*28;
      const r=18+age*(p.pressed?95:45),g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,`rgba(${p.seed%2?'172,129,242':'114,208,243'},${alpha})`);g.addColorStop(.45,`rgba(104,125,223,${alpha*.5})`);g.addColorStop(1,'rgba(88,111,210,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
      ctx.fillStyle=`rgba(213,245,255,${(1-age)*.8})`;ctx.beginPath();ctx.arc(x,y,(p.seed%3+1)*.7,0,Math.PI*2);ctx.fill();
      if(i&&p.pressed&&p.time-points[i-1].time<160){const prev=points[i-1];ctx.strokeStyle=`rgba(178,210,255,${(1-age)*.22})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(prev.x,prev.y-scrollY-age*28);ctx.lineTo(x,y);ctx.stroke();}
      if(p.pulse){ctx.strokeStyle=`rgba(174,225,255,${(1-age)*.35})`;ctx.beginPath();ctx.ellipse(x,y,8+age*70,8+age*70,0,0,Math.PI*2);ctx.stroke();}
    });
    if(points.length)frame=requestAnimationFrame(draw);
  }
  function emit(e,pulse=false){
    if(reduced.matches||!e.target.closest('.threshold,.work,.inside'))return;
    const now=performance.now();if(!pulse&&now-last<24)return;last=now;
    points.push({x:e.clientX,y:e.clientY+scrollY,time:now,seed:points.length+Math.floor(now),pressed:!!e.buttons||e.pointerType==='touch',pulse});
    if(points.length>100)points.shift();if(!frame)frame=requestAnimationFrame(draw);
  }
  document.addEventListener('pointermove',e=>emit(e),{passive:true});document.addEventListener('pointerdown',e=>emit(e,true),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;points.length=0;ctx.clearRect(0,0,canvas.width,canvas.height);}});
  reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(frame);frame=0;points.length=0;ctx.clearRect(0,0,canvas.width,canvas.height);}});
  resize();addEventListener('resize',resize);
}
