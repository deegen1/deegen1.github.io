/*------------------------------------------------------------------------------


game.js - v1.00

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


https://www.youtube.com/watch?v=DBX4ReeH6R8&list=PLtzt35QOXmkJ9unmoeA5gXHcscQHJVQpW&index=1
https://www.youtube.com/watch?v=bp7REZBV4P4
https://www.youtube.com/watch?v=gsJHzBTPG0Y
Just make something simple with falling blocks

The shipping lanes from the earth to the moon have become blocked by by debris.
The Space Force needs YOU to clear a path and get supplies to our lunarnauts.

Intro cutscene shows ship plowing through obstacles.

Start very fast. Make first death quick.

Title art shows a ship crashing through rocks.


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

smaller debris light up when moving fast or hit

tentacle monsters

see how melon game handles audio
put home page link under settings

Throbbing from control point. Control points send out a signal. After x seconds,
those atoms send out the signal and enter a refactory period.

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


import * as THREE from "./three.core.min.js";


class Game {

	constructor(divid) {
		// Setup the canvas
		let canvas=document.getElementById(divid);
		canvas.style.width="100%";
		canvas.style.height="100%";
		let drawwidth=canvas.clientWidth;
		let drawheight=canvas.clientHeight;
		this.canvas=canvas;
		// this.ctx=this.canvas.getContext("2d");
		// this.draw=new Draw(drawwidth,drawheight);
		this.input=new Input(canvas);
		this.input.disablenav();
		this.rnd=new Random();
		this.mouse=new Vector(2);
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.frametime=1/60;
		this.frameprev=0;
		this.initcamera();
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
		let width  =window.innerWidth;
		let height =window.innerHeight;
		canvas.width =width +"px";
		canvas.height=height+"px";
	}


	initcamera() {
	}


	initaudio() {
	}


	initworld() {
	}


	update(time) {
		// Restrict our FPS to [fps/2,fps].
		let delta=(time-this.frameprev)/1000;
		if (delta>this.frametime || !(delta>0)) {delta=this.frametime;}
		else if (delta<0.5*this.frametime) {return true;}
		this.frameprev=time;
		let starttime=performance.now();
		// this.audio.update();
		/*let input=this.input;
		input.update();
		let rnd=this.rnd;
		// Draw the HUD.
		draw.setcolor(255,255,255,255);
		draw.filltext(5,20,"time : "+this.framestr,20);
		this.ctx.putImageData(draw.img.imgdata,0,0);
		// Calculate the frame time.
		this.framesum+=performance.now()-starttime;
		if (++this.frames>=60) {
			let avg=this.framesum/this.frames;
			this.framestr=avg.toFixed(1)+" ms";
			this.frames=0;
			this.framesum=0;
		}*/
		return true;
	}

}

window.addEventListener("load",()=>{new Game("gamecanv");});
