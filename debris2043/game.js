/*------------------------------------------------------------------------------


game.js - v1.00

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


The shipping lanes from the earth to the moon have become blocked by by debris.
The Space Force needs YOU to clear a path and get supplies to our lunarnauts.

Intro cutscene shows ship plowing through obstables.

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

maxframetime = 1/15
maxsteptime = 1/180
steps = ceil(dt/maxsteptime)
if steps<=0: return
dt /= steps
if dt<=1e-10: return
for s in steps:
	...


particles are constantly falling down
you need to protect a ship below
*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


class Game {

	constructor() {
		this.start=performance.now();
	}


	update() {
	}

}

function GameInit() {
	/*let phy=new PhyScene("gamecanv");
	function resize() {
		// Properly resize the canvas
		let canvas =phy.canvas;
		let ratio  =canvas.height/canvas.width;
		let elem   =canvas;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem!==null) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		let pscale =1;//window.devicePixelRatio;
		let width  =Math.floor(pscale*(window.innerWidth));//-offleft));
		let height =Math.floor(pscale*(window.innerHeight-offtop));
		if (width*ratio<height) {
			height=Math.floor(width*ratio);
		} else {
			width =Math.floor(height/ratio);
		}
		canvas.style.width =width +"px";
		canvas.style.height=height+"px";
	}
	window.addEventListener("resize",resize);
	resize();*/
}
window.addEventListener("load",GameInit);
