/* Kidscade World v2 - engine core. No Kidscade save data is mutated here. */
(function(root){
  'use strict';

  const NS = root.KidscadeWorldV2 = root.KidscadeWorldV2 || {};
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  const uid = (prefix='e')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  class EventBus {
    constructor(){ this.listeners=new Map(); }
    on(type,fn){ if(!this.listeners.has(type))this.listeners.set(type,new Set()); this.listeners.get(type).add(fn); return ()=>this.off(type,fn); }
    off(type,fn){ this.listeners.get(type)?.delete(fn); }
    emit(type,payload){ this.listeners.get(type)?.forEach(fn=>{try{fn(payload);}catch(err){console.error('[WorldV2 event]',type,err);}}); }
  }

  class Entity {
    constructor(options={}){
      this.id=options.id||uid(options.type||'entity');
      this.type=options.type||'entity';
      this.x=Number(options.x)||0;
      this.y=Number(options.y)||0;
      this.w=Math.max(1,Number(options.w)||32);
      this.h=Math.max(1,Number(options.h)||32);
      this.solid=!!options.solid;
      this.visible=options.visible!==false;
      this.active=options.active!==false;
      this.depthOffset=Number(options.depthOffset)||0;
      this.tags=new Set(options.tags||[]);
      this.data=options.data||{};
      this.render=typeof options.render==='function'?options.render:null;
      this.updateFn=typeof options.update==='function'?options.update:null;
      this.interaction=options.interaction||null;
      this.interactionRadius=Math.max(24,Number(options.interactionRadius)||86);
      this.vx=0; this.vy=0;
    }
    get centerX(){return this.x+this.w/2;}
    get centerY(){return this.y+this.h/2;}
    get depth(){return this.y+this.h+this.depthOffset;}
    update(dt,world){ if(this.active&&this.updateFn)this.updateFn(this,dt,world); }
    draw(ctx,world){
      if(!this.visible)return;
      if(this.render)return this.render(ctx,this,world);
      ctx.save();
      ctx.fillStyle=this.solid?'#8b7d6b':'#7da2c9';
      ctx.fillRect(this.x,this.y,this.w,this.h);
      ctx.restore();
    }
  }

  class EntityManager {
    constructor(world){this.world=world;this.map=new Map();this.pendingRemove=new Set();}
    add(entity){ if(!(entity instanceof Entity))entity=new Entity(entity); this.map.set(entity.id,entity); this.world.events.emit('entity:add',entity); return entity; }
    get(id){return this.map.get(id)||null;}
    all(){return [...this.map.values()];}
    remove(id){this.pendingRemove.add(typeof id==='string'?id:id.id);}
    flush(){for(const id of this.pendingRemove){const e=this.map.get(id);if(e){this.map.delete(id);this.world.events.emit('entity:remove',e);}}this.pendingRemove.clear();}
    update(dt){for(const e of this.map.values())e.update(dt,this.world);this.flush();}
    draw(ctx){
      [...this.map.values()].filter(e=>e.visible).sort((a,b)=>a.depth-b.depth).forEach(e=>e.draw(ctx,this.world));
    }
    solids(except){return [...this.map.values()].filter(e=>e.solid&&e.active&&e!==except);}
    interactives(){return [...this.map.values()].filter(e=>e.active&&e.interaction);}
    byTag(tag){return [...this.map.values()].filter(e=>e.tags.has(tag));}
  }

  function overlapsAt(entity,x,y,other){
    return x<other.x+other.w && x+entity.w>other.x && y<other.y+other.h && y+entity.h>other.y;
  }

  class CollisionSystem {
    constructor(world){this.world=world;}
    move(entity,dx,dy){
      let nx=clamp(entity.x+dx,0,Math.max(0,this.world.width-entity.w));
      const solids=this.world.entities.solids(entity);
      for(const other of solids){
        if(!overlapsAt(entity,nx,entity.y,other))continue;
        nx=dx>0?other.x-entity.w:dx<0?other.x+other.w:entity.x;
      }
      entity.x=clamp(nx,0,Math.max(0,this.world.width-entity.w));

      let ny=clamp(entity.y+dy,0,Math.max(0,this.world.height-entity.h));
      for(const other of solids){
        if(!overlapsAt(entity,entity.x,ny,other))continue;
        ny=dy>0?other.y-entity.h:dy<0?other.y+other.h:entity.y;
      }
      entity.y=clamp(ny,0,Math.max(0,this.world.height-entity.h));
      return entity;
    }
  }

  class Camera {
    constructor(world,options={}){
      this.world=world;
      this.x=0;this.y=0;
      this.zoom=Number(options.zoom)||1;
      this.lerp=clamp(Number(options.lerp)||0.14,0.01,1);
      this.target=null;
    }
    follow(entity){this.target=entity;this.snap();}
    viewport(){return {w:this.world.viewportWidth/this.zoom,h:this.world.viewportHeight/this.zoom};}
    clamp(){const v=this.viewport();this.x=clamp(this.x,0,Math.max(0,this.world.width-v.w));this.y=clamp(this.y,0,Math.max(0,this.world.height-v.h));}
    snap(){if(!this.target)return;const v=this.viewport();this.x=this.target.centerX-v.w/2;this.y=this.target.centerY-v.h/2;this.clamp();}
    update(){if(!this.target)return;const v=this.viewport();const tx=this.target.centerX-v.w/2,ty=this.target.centerY-v.h/2;this.x+=(tx-this.x)*this.lerp;this.y+=(ty-this.y)*this.lerp;this.clamp();}
  }

  class Input {
    constructor(world){
      this.world=world;this.keys=new Set();this.enabled=true;
      this.down=e=>{
        if(!this.enabled)return;
        const k=String(e.key||'').toLowerCase();
        if(['arrowup','arrowdown','arrowleft','arrowright',' ','e'].includes(k))e.preventDefault();
        this.keys.add(k);
      };
      this.up=e=>this.keys.delete(String(e.key||'').toLowerCase());
      this.blur=()=>this.reset();
      this.visibility=()=>{if(document.hidden)this.reset();};
      this.pagehide=()=>this.reset();
      document.addEventListener('keydown',this.down,{passive:false});
      document.addEventListener('keyup',this.up);
      root.addEventListener('blur',this.blur);
      root.addEventListener('pagehide',this.pagehide);
      document.addEventListener('visibilitychange',this.visibility);
    }
    reset(){
      this.keys.clear();
      if(this.__mobileVirtual){
        this.__mobileVirtual.x=0;this.__mobileVirtual.y=0;
        this.__mobileVirtual.buttons?.clear?.();
      }
      if(this.world?.player){this.world.player.vx=0;this.world.player.vy=0;}
    }
    axis(){
      if(!this.enabled)return{x:0,y:0};
      let x=0,y=0;
      if(this.keys.has('a')||this.keys.has('arrowleft'))x--;
      if(this.keys.has('d')||this.keys.has('arrowright'))x++;
      if(this.keys.has('w')||this.keys.has('arrowup'))y--;
      if(this.keys.has('s')||this.keys.has('arrowdown'))y++;
      if(x&&y){const q=Math.SQRT1_2;x*=q;y*=q;}
      return{x,y};
    }
    pressed(key){return this.enabled&&this.keys.has(String(key).toLowerCase());}
    destroy(){
      this.reset();
      document.removeEventListener('keydown',this.down);
      document.removeEventListener('keyup',this.up);
      root.removeEventListener('blur',this.blur);
      root.removeEventListener('pagehide',this.pagehide);
      document.removeEventListener('visibilitychange',this.visibility);
    }
  }

  class InteractionSystem {
    constructor(world){this.world=world;this.current=null;this.lock=false;}
    distance(a,b){return Math.hypot(a.centerX-b.centerX,a.centerY-b.centerY);}
    update(){
      const p=this.world.player;if(!p){this.current=null;return;}
      let best=null,bestD=Infinity;
      for(const e of this.world.entities.interactives()){
        const d=this.distance(p,e);if(d<=e.interactionRadius&&d<bestD){best=e;bestD=d;}
      }
      if(best!==this.current){this.current=best;this.world.events.emit('interaction:focus',best);}
      const wants=this.world.input.pressed('e')||this.world.input.pressed(' ');
      if(wants&&!this.lock&&this.current){
        this.lock=true;
        const i=this.current.interaction;
        try{ if(typeof i==='function')i(this.current,this.world); else if(i&&typeof i.action==='function')i.action(this.current,this.world); }
        catch(err){console.error('[WorldV2 interaction]',err);}
        this.world.events.emit('interaction:use',this.current);
      }
      if(!wants)this.lock=false;
    }
    label(){const i=this.current?.interaction;if(!i)return'';return typeof i==='object'?(i.label||'상호작용'):'상호작용';}
  }

  class World {
    constructor(options={}){
      if(!options.canvas)throw new Error('KidscadeWorldV2.World requires canvas');
      this.canvas=options.canvas;
      this.ctx=this.canvas.getContext('2d');
      this.width=Math.max(320,Number(options.width)||2400);
      this.height=Math.max(240,Number(options.height)||1600);
      this.clearColor=options.clearColor||'#dcefd2';
      this.playerSpeed=Math.max(40,Number(options.playerSpeed)||220);
      this.background=typeof options.background==='function'?options.background:null;
      this.overlay=typeof options.overlay==='function'?options.overlay:null;
      this.events=new EventBus();
      this.entities=new EntityManager(this);
      this.collision=new CollisionSystem(this);
      this.camera=new Camera(this,options.camera||{});
      this.input=new Input(this);
      this.interaction=new InteractionSystem(this);
      this.player=null;
      this.running=false;
      this.last=0;
      this.viewportWidth=800;this.viewportHeight=600;this.dpr=1;
      this._raf=0;
      this._resize=()=>this.resize();
      root.addEventListener('resize',this._resize);
      this.canvas.addEventListener('pointerdown',()=>this.canvas.focus?.());
      this.resize();
      NS.activeWorld=this;
      root.__kidscadeWorldV2=this;
      this.events.emit('world:active',this);
    }
    resize(){
      const r=this.canvas.getBoundingClientRect();this.viewportWidth=Math.max(1,r.width||this.canvas.clientWidth||800);this.viewportHeight=Math.max(1,r.height||this.canvas.clientHeight||600);this.dpr=Math.min(2,root.devicePixelRatio||1);
      const w=Math.round(this.viewportWidth*this.dpr),h=Math.round(this.viewportHeight*this.dpr);if(this.canvas.width!==w)this.canvas.width=w;if(this.canvas.height!==h)this.canvas.height=h;this.camera.clamp();
    }
    spawn(options){return this.entities.add(options instanceof Entity?options:new Entity(options));}
    setPlayer(entity){this.player=entity instanceof Entity?entity:this.spawn(entity);if(!this.entities.get(this.player.id))this.entities.add(this.player);this.player.tags.add('player');this.camera.follow(this.player);return this.player;}
    update(dt){
      if(this.player){const a=this.input.axis();this.player.vx=a.x*this.playerSpeed;this.player.vy=a.y*this.playerSpeed;if(a.x||a.y)this.collision.move(this.player,this.player.vx*dt,this.player.vy*dt);}
      this.entities.update(dt);this.interaction.update();this.camera.update();this.events.emit('update',{dt,world:this});
    }
    render(){
      const c=this.ctx,d=this.dpr;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,this.viewportWidth,this.viewportHeight);c.fillStyle=this.clearColor;c.fillRect(0,0,this.viewportWidth,this.viewportHeight);
      c.save();c.scale(this.camera.zoom,this.camera.zoom);c.translate(-this.camera.x,-this.camera.y);if(this.background)this.background(c,this);this.entities.draw(c);c.restore();if(this.overlay)this.overlay(c,this);this.events.emit('render',this);
    }
    frame=(t)=>{if(!this.running)return;const dt=Math.min(.05,Math.max(0,(t-this.last)/1000||0));this.last=t;this.update(dt);this.render();this._raf=requestAnimationFrame(this.frame);};
    start(){if(this.running)return;this.running=true;this.last=performance.now();this._raf=requestAnimationFrame(this.frame);this.events.emit('start',this);}
    stop(){this.running=false;if(this._raf)cancelAnimationFrame(this._raf);this.input.reset?.();this.events.emit('stop',this);}
    destroy(){this.stop();this.input.destroy();root.removeEventListener('resize',this._resize);this.entities.map.clear();if(NS.activeWorld===this)NS.activeWorld=null;if(root.__kidscadeWorldV2===this)root.__kidscadeWorldV2=null;}
  }

  NS.VERSION='0.1.2';
  NS.EventBus=EventBus;
  NS.Entity=Entity;
  NS.EntityManager=EntityManager;
  NS.CollisionSystem=CollisionSystem;
  NS.Camera=Camera;
  NS.Input=Input;
  NS.InteractionSystem=InteractionSystem;
  NS.World=World;
  NS.util={clamp,uid,overlapsAt};
})(window);
