/* Event-driven history quiz transport. HTTP fallback always targets the SAME room. */
(function(root){
  class HistoryLiveRealtime {
    constructor({code,ticket,onState,onMode,onReplaced,WebSocketImpl=root.WebSocket}) {
      Object.assign(this,{code,ticket,onState,onMode,onReplaced,WebSocketImpl});
      this.stopped=true;this.ready=false;this.failures=0;this.generation=0;
    }
    start(){this.stopped=false;this.connect();}
    stop(){this.stopped=true;this.ready=false;this.generation++;clearTimeout(this.retry);clearTimeout(this.openTimer);clearInterval(this.pingTimer);if(this.socket){this.socket.onclose=null;this.socket.close();}this.socket=null;}
    sync(){if(this.ready)this.socket.send('sync');}
    async connect(){
      if(this.stopped)return;
      const generation=++this.generation;
      try{
        const {ticket}=await this.ticket();if(this.stopped||generation!==this.generation)return;
        const url=new URL('/api/history-live/socket',root.location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';
        url.searchParams.set('code',this.code);url.searchParams.set('ticket',ticket);
        const socket=this.socket=new this.WebSocketImpl(url);
        this.openTimer=setTimeout(()=>socket.close(),10000);
        socket.onmessage=event=>{
          if(this.stopped||generation!==this.generation)return;
          this.lastMessage=Date.now();if(event.data==='pong')return;
          let data;try{data=JSON.parse(event.data);}catch{return;}
          if(data.type!=='state'||data.state?.room?.code!==this.code)return;
          clearTimeout(this.openTimer);this.failures=0;
          if(!this.ready){
            this.ready=true;this.onMode(true);
            this.pingTimer=setInterval(()=>{
              if(Date.now()-this.lastMessage>65000){socket.close();return;}
              if(socket.readyState===1)socket.send('ping');
            },30000);
          }
          this.onState(data.state);
        };
        socket.onerror=()=>socket.close();
        socket.onclose=event=>{
          if(this.stopped||generation!==this.generation)return;
          clearTimeout(this.openTimer);clearInterval(this.pingTimer);this.ready=false;this.onMode(false);
          if(event.code===4001){this.stop();this.onReplaced?.();return;}
          this.reconnect();
        };
      }catch{
        if(this.stopped||generation!==this.generation)return;
        this.ready=false;this.onMode(false);this.reconnect();
      }
    }
    reconnect(){
      if(this.stopped)return;clearTimeout(this.retry);
      const delay=Math.min(30000,1000*2**Math.min(this.failures++,5))+Math.random()*500;
      this.retry=setTimeout(()=>this.connect(),delay);
    }
  }
  root.HistoryLiveRealtime=HistoryLiveRealtime;
})(typeof window==='undefined'?globalThis:window);
