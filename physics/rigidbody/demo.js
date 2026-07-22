/*------------------------------------------------------------------------------


demo.js - v1.01

Copyright 2026 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Demo for physics.js


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint demo.js -c ../../../standards/eslint.js */


import {Env,Random,Transform,Input,Draw} from "./library.js";
import {Phy} from "./physics.js";


//---------------------------------------------------------------------------------
// Main Physics Demo


export class PhyScene {

	constructor(divid,bannerid) {
		this.banner=document.getElementById(bannerid);
		// Setup the canvas
		let canvas=document.getElementById(divid);
		canvas.style.imageRendering="pixelated";
		this.canvas=canvas;
		this.draw=new Draw(1,1);
		this.draw.screencanvas(canvas);
		this.input=new Input(canvas);
		this.input.disablenav();
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.framemax=1/30;
		this.frameprev=0;
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
		let banner=this.banner.clientHeight;
		let winw=window.innerWidth,winh=window.innerHeight-banner;
		let draww=winw>>>1;
		let drawh=winh>>>1;
		let canvas=this.canvas;
		canvas.width=draww;
		canvas.height=drawh;
		let style=this.canvas.style;
		style.width=winw+"px";
		style.height=winh+"px";
		this.draw.img.resize(draww,drawh);
		this.scale=drawh;
		// Move side walls to edge of screen.
		let w=(draww/drawh)*0.5+0.495;
		this.wallarr[2].pos[0]=-w;
		this.wallarr[3].pos[0]= w;
	}


	initworld() {
		this.world=new Phy.World(2);
		let world=this.world;
		this.grab=null;
		// Create walls and fill screen with random shapes.
		let walltype=world.createbodytype(1,Infinity,0.0);
		this.wallarr=[
			world.createbox([10,0.5],[0,-0.995],[0],walltype),
			world.createbox([10,0.5],[0, 0.895],[0.1],walltype),
			world.createbox([0.5,10],[-0.995,0],[0],walltype),
			world.createbox([0.5,10],[ 0.995,0],[0],walltype)
		];
		let rnd=new Random(1);
		for (let i=0;i<500;i++) {
			let sides=rnd.mod(14)+3;
			let smul=[rnd.getf()*0.02+0.01,rnd.getf()*0.02+0.01];
			let pos=[rnd.gets()*0.14,rnd.gets()*0.04];
			if (i&1) {world.createsphere(smul,sides,pos);}
			else     {world.createbox(smul,pos);}
		}
		// Precompute drawing paths for each body.
		for (let body of world.bodyiter()) {
			let path=new Draw.Path();
			for (let v of body.vertarr) {path.lineto(v);}
			path.close();
			let data=body.data;
			data.innerpath=path;
			data.outerpath=path.trace(0,-0.0015);
			data.rgb=null;
			if (body.type===walltype) {
				data.rgb=[100,200,100];
			}
			data.velcolor=0;
		}
	}


	update(time) {
		if (!Env.IsVisible(this.canvas)) {return true;}
		// Get the timestep. Prevent steps that are too large.
		let dt=(time-this.frameprev)*0.001;
		dt=dt<this.framemax?dt:this.framemax;
		dt=dt>0?dt:0;
		this.frameprev=time;
		let starttime=performance.now();
		let world=this.world;
		let draw=this.draw;
		let draww=draw.img.width,drawh=draw.img.height;
		let input=this.input;
		let scale=this.scale;
		input.update();
		world.update(dt);
		draw.fill(0,0,0,255);
		// Move the player.
		let trans=new Transform({scale:scale,vec:[draww*0.5,drawh*0.5]});
		let transinv=trans.inv();
		let mouse=input.getmousepos();
		let mouserel=transinv.apply(mouse);
		let mdown=input.getkeydown(input.MOUSE.LEFT);
		let hover=null;
		let grab=this.grab;
		if (grab!==null) {
			if (!mdown) {
				grab.release();
				grab=null;
			} else {
				hover=world.anchor;
				grab.apos.set(mouserel);
			}
		}
		// Draw bodies.
		let velscale=Math.pow(0.75,dt);
		for (let body of world.bodyiter()) {
			let bodytrans=trans.apply({vec:body.pos,mat:body.mat});
			let data=body.data;
			let rgb=data.rgb;
			if (rgb===null) {
				let vel=body.vel.mag();
				data.velcolor=Math.max(data.velcolor*velscale,vel);
				let u=data.velcolor*(256*3);
				u=~~(u<255?u:255);
				rgb=[u,0,255-u];
			}
			if (hover===null && data.innerpath.pointinside(mouse,bodytrans)) {
				hover=body;
				rgb=[200,200,200];
			}
			draw.setcolor(rgb);
			draw.fillpath(data.innerpath,bodytrans);
			draw.setcolor(rgb[0]*0.5,rgb[1]*0.5,rgb[2]*0.5);
			draw.fillpath(data.outerpath,bodytrans);
		}
		// Controls.
		if (mdown && hover!==null && grab===null) {
			let hpos=hover.invpos(mouserel);
			grab=world.createbond(world.anchor,mouserel,hover,hpos,0,200);
		}
		this.grab=grab;
		// Draw bonds.
		draw.setcolor(255,255,255,255);
		for (let bond of world.bonditer()) {
			let a=trans.apply(bond.relapos()),b=trans.apply(bond.relbpos());
			draw.drawline(a[0],a[1],b[0],b[1]);
		}
		// Draw the HUD.
		draw.setcolor(255,255,255,255);
		let diag="time : "+this.framestr;
		draw.filltext(5,5,diag,18);
		draw.filltext(5,25,"click and drag",18);
		draw.screenflip();
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

