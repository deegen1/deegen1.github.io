/*------------------------------------------------------------------------------


game.js - v1.00

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


The shipping lanes from the earth to the moon have become blocked by by debris.
The Space Force needs YOU to clear a path and get supplies to our lunarnauts.

Intro cutscene shows ship plowing through obstacles.

+mass
+accel
+size
+sharper point

top down scroller with physics
Leave a particle trail
stars parallaxing down
	speed tied to movement speed
	level time affected
debris slowly drop down

tentacle monsters

register domain name
see how melon game handles audio
put home page link under settings

glow effect
glaives that rotate and hook eachother
                      \
              ----O----
              \
starfish
limbs stick to things
blob, expands bonds towards you
bomb that deletes things
enemy that spins and sheds its outer lining
boss room, filled with objects, boss spins around and hits them
laser that heats up atoms and makes them vibrate
bullet that transfers momentum sideways

particles are constantly falling down
you need to protect a ship below

dash attack
spin attack


     /\
    /  \
   /    \
  /      \
 /  /\/\  \
 \_/ ** \_/
    ****
   ******

*/
/* npx eslint game.js -c ../../standards/eslint.js */
/* global */


class Game {

	constructor(divid) {
		// Setup the canvas
		let drawwidth=600;
		let drawheight=1066;
		let canvas=document.getElementById(divid);
		canvas.width=drawwidth;
		canvas.height=drawheight;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.draw=new Draw(drawwidth,drawheight);
		this.input=new Input(canvas);
		this.input.disablenav();
		this.rnd=new Random();
		this.mouse=new Vector(2);
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.frametime=1/60;
		this.frameprev=0;
		this.initaudio();
		this.initworld();
		let state=this;
		function resize() {state.resize();}
		window.addEventListener("resize",resize);
		resize();
		function update(time) {
			if (state.update(time)) {
				requestAnimationFrame(update);
			}
		}
		update(0);
	}


	resize() {
		// Properly resize the canvas
		let canvas =this.canvas;
		let ratio  =canvas.height/canvas.width;
		let elem   =canvas;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem!==null) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		let pscale =1;
		let width  =Math.floor(pscale*(window.innerWidth));
		let height =Math.floor(pscale*(window.innerHeight-offtop));
		if (width*ratio<height) {
			height=Math.floor(width*ratio);
		} else {
			width =Math.floor(height/ratio);
		}
		canvas.style.width =width +"px";
		canvas.style.height=height+"px";
	}


	initaudio() {
		let audio=new Audio();
		this.audio=audio;
		let snd=new Audio.Sound();
		let bpm=60/180;
		let vol=0.1;
		let guitar=[
			{name:"e",freq:329.63,vol:0.40},
			{name:"B",freq:246.94,vol:0.50},
			{name:"G",freq:196.00,vol:0.60},
			{name:"D",freq:146.83,vol:0.70},
			{name:"A",freq:110.00,vol:0.80},
			{name:"E",freq: 82.41,vol:0.90}
		];
		/*for (let i=0;i<192;i++) {
			let time=bpm*i;
			let t=Math.floor(i/8)%3,n=i&1;
			let s=guitar[5-n*2-t];
			let g=Audio.createguitar(vol,s.freq*[0.8,0.7][n],0.25);
			snd.add(g,time);
			if (i%1===0) {
				g=Audio.createdrumsnare(vol*0.15);
				snd.add(g,time);
			}
			if (i%1===0) {
				g=Audio.createdrumkick(vol);
				snd.add(g,time);
			}
		}*/
		for (let i=0;i<192;i++) {
			let time=bpm*i;
			let t=Math.floor(i/8)%3,n=i&1;
			let s=guitar[5-n*2-t];
			let g=Audio.createguitar(vol,s.freq*[0.8,0.7][n],0.25);
			snd.add(g,time);
			g=Audio.createdrumsnare(vol*0.15);
			// snd.add(g,time);
			g=Audio.createdrumkick(vol);
			snd.add(g,time*0.25);
		}
		this.bgsnd=snd;
		this.audio.play(this.bgsnd);
		// snd.savefile("bg.wav");
	}


	initworld() {
		let dw=this.draw.img.width;
		let dh=this.draw.img.height;
		this.world=new PhyWorld(2);
		let canvas=this.canvas;
		let rnd=this.rnd;
		let world=this.world;
		world.maxsteptime=1/180;
		world.gravity.set([0,0]);
		this.stararr=Array.from({length:1000},_=>({
			x:(rnd.getf()*1.1-0.05)*dw,
			y:(rnd.getf()*1.5-0.50)*dh,
			t:rnd.modu32(2)
		}));
		this.debris=[];
		this.debristime=0;
		/*let viewheight=1.0,viewwidth=canvas.width/canvas.height;
		let walltype=world.createatomtype(1.0,Infinity,1.0);
		let normtype=world.createatomtype(0.01,1.0,0.98);
		let boxtype=world.createatomtype(0.0,2.0,1.0);
		let rnd=new Random(2);
		let pos=new Vector(world.dim);
		for (let p=0;p<3000;p++) {
			pos[0]=rnd.getf()*viewwidth;
			pos[1]=rnd.getf()*viewheight;
			world.createatom(pos,0.004,normtype);
		}
		world.createbox([0.3*viewwidth,0.3],5,0.007,boxtype);
		world.createbox([0.5*viewwidth,0.5],5,0.007,boxtype);
		world.createbox([0.7*viewwidth,0.3],5,0.007,boxtype);
		world.bndmin=new Vector([0,0]);
		world.bndmax=new Vector([viewwidth,1]);
		let playertype=world.createatomtype(0.0,Infinity,0.1);
		playertype.bound=false;
		playertype.gravity=new Vector([0,0]);
		pos.set([viewwidth*0.5,viewheight*0.33]);
		this.playeratom=world.createatom(pos,0.035,playertype);
		this.mouse.set(pos);*/
	}


	update(time) {
		// Restrict our FPS to [fps/2,fps].
		let delta=(time-this.frameprev)/1000;
		if (delta>this.frametime || !(delta>0)) {delta=this.frametime;}
		else if (delta<0.5*this.frametime) {return true;}
		this.frameprev=time;
		let starttime=performance.now();
		this.audio.update();
		let input=this.input;
		input.update();
		let rnd=this.rnd;
		let draw=this.draw;
		let dw=draw.img.width;
		let dh=draw.img.height;
		let world=this.world;
		draw.fill(0,0,0,255);
		// Draw the background.
		draw.setcolor(0x0000ffff);
		for (let star of this.stararr) {
			let x=star.x,y=star.y,t=star.t;
			y+=dh*(t?0.09:0.05)*delta;
			if (y>dh+2) {
				x=(rnd.getf()*1.1+0.05)*dw;
				y=(rnd.getf()*0.5-0.50)*dh;
				t=rnd.modu32(2);
				star.x=x;
				star.t=t;
			}
			star.y=y;
			if (!t) {draw.fillrect(x-1.5,y-1.5,3,3);}
		}
		draw.setcolor(0xff0000ff);
		for (let star of this.stararr) {
			if (star.t) {draw.fillrect(star.x-1.5,star.y-1.5,3,3);}
		}
		this.debristime+=delta;
		while (this.debristime>0.1) {
			this.debristime-=0.1;
		}
		world.update(delta);
		// Draw the HUD.
		draw.setcolor(255,255,255,255);
		draw.filltext(5,20,"time : "+this.framestr+"\ncount: "+world.atomlist.count,20);
		this.ctx.putImageData(draw.img.imgdata,0,0);
		// Calculate the frame time.
		this.framesum+=performance.now()-starttime;
		if (++this.frames>=60) {
			let avg=this.framesum/this.frames;
			this.framestr=avg.toFixed(1)+" ms";
			this.frames=0;
			this.framesum=0;
		}
		return true;
	}

}

window.addEventListener("load",()=>{new Game("gamecanv");});
