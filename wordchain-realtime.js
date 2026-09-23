/* Event-driven wordchain transport. HTTP fallback always targets the same Durable Object room. */
(function(root){
  class WordchainRealtime {
    constructor({code,ticket,onState,onMode,onReplaced,WebSocketImpl=root.WebSocket}) {
      Object.assign(this,{code,ticket,onState,onMode,onReplaced,WebSocketImpl});
      this.stopped=true;this.ready=false;this.failures=0;this.generation=0;this.lastMessage=0;
    }
    start(){this.stopped=false;this.connect();}
    stop(){
      this.stopped=true;this.ready=false;this.generation++;
      clearTimeout(this.retry);clearTimeout(this.openTimer);clearInterval(this.pingTimer);
      if(this.socket){this.socket.onclose=null;try{this.socket.close();}catch{}}
      this.socket=null;
    }
    sync(){if(this.ready&&this.socket?.readyState===1)this.socket.send('sync');}
    async connect(){
      if(this.stopped)return;
      const generation=++this.generation;
      try{
        const result=await this.ticket();
        if(this.stopped||generation!==this.generation)return;
        const url=new URL('/api/multiplayer/wordchain/socket',root.location.href);
        url.protocol=url.protocol==='https:'?'wss:':'ws:';
        url.searchParams.set('code',this.code);
        url.searchParams.set('ticket',result.ticket);
        const socket=this.socket=new this.WebSocketImpl(url);
        this.openTimer=setTimeout(()=>{try{socket.close();}catch{}},10000);
        socket.onmessage=event=>{
          if(this.stopped||generation!==this.generation)return;
          this.lastMessage=Date.now();
          if(event.data==='pong')return;
          let data;try{data=JSON.parse(event.data);}catch{return;}
          if(data.type==='closed'){try{socket.close(1000,'room_closed');}catch{};return;}
          if(data.type!=='state'||data.state?.code!==this.code)return;
          clearTimeout(this.openTimer);this.failures=0;
          if(!this.ready){
            this.ready=true;
            this.onMode?.(true);
            this.pingTimer=setInterval(()=>{
              if(Date.now()-this.lastMessage>65000){try{socket.close();}catch{};return;}
              if(socket.readyState===1)socket.send('ping');
            },30000);
          }
          this.onState?.(data.state);
        };
        socket.onerror=()=>{try{socket.close();}catch{}};
        socket.onclose=event=>{
          if(this.stopped||generation!==this.generation)return;
          clearTimeout(this.openTimer);clearInterval(this.pingTimer);
          this.ready=false;this.onMode?.(false);
          if(event.code===4001){this.stop();this.onReplaced?.();return;}
          this.reconnect();
        };
      }catch{
        if(this.stopped||generation!==this.generation)return;
        this.ready=false;this.onMode?.(false);this.reconnect();
      }
    }
    reconnect(){
      if(this.stopped)return;
      clearTimeout(this.retry);
      const delay=Math.min(30000,1000*2**Math.min(this.failures++,5))+Math.random()*500;
      this.retry=setTimeout(()=>this.connect(),delay);
    }
  }
  root.WordchainRealtime=WordchainRealtime;
})(typeof window==='undefined'?globalThis:window);
