/*------------------------------------------------------------------------------


demo.js - v1.00

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


*/
/* npx eslint demo.js -c ../../standards/eslint.js */


import {Debug,Random,Vector,Matrix,Transform,
Input,UI,Draw,Audio,Phy} from "./library.js";
import {NTrace} from "./ntrace.js";


class Game {

	constructor(divid) {
		// Setup the canvas
		let canvas=document.getElementById(divid);
		canvas.style.width="100%";
		canvas.style.height="100%";
		// let drawwidth=canvas.clientWidth;
		// let drawheight=canvas.clientHeight;
		this.canvas=canvas;
		this.draw=new Draw(canvas);
		this.input=new Input(canvas);
		this.input.disablenav();
		this.rnd=new Random();
		this.mouse=new Vector(2);
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.framemax=1/60;
		this.frameprev=0;
		this.playerpos=new Vector([0,0,5]);
		this.playerang=[0,0,0];
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
		let canvas=this.canvas;
		let width =window.innerWidth;
		let height=window.innerHeight;
		canvas.style.width =width +"px";
		canvas.style.height=height+"px";
		canvas.width =width +"px";
		canvas.height=height+"px";
		this.camera.aspect=width/height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width,height);
	}


	initcamera() {
		let canvas=this.canvas;
		this.renderer=new THREE.WebGLRenderer({antialias:true,canvas:canvas});
		this.renderer.shadowMap.enabled=true;
		this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
		this.scene=new THREE.Scene();
		this.scene.background=new THREE.Color(0x777777);
		this.camera=new THREE.PerspectiveCamera(90,canvas.width/canvas.height,0.1,1000);
		this.camera.up=new THREE.Vector3(0,1,0);
		this.mousepos=[NaN,NaN];
	}


	initaudio() {
	}


	initworld() {
		let floor=new THREE.BoxGeometry(10,.1,10);
		let mat=new THREE.MeshStandardMaterial({color:0x208020});
		let mesh=new THREE.Mesh(floor,mat);
		mesh.castShadow=true;
		mesh.receiveShadow=true;
		mesh.position.y=-2;
		this.scene.add(mesh);
		let box=new THREE.BoxGeometry(1,1,1);
		mat=new THREE.MeshStandardMaterial({color:0x8080ff});
		mesh=new THREE.Mesh(box,mat);
		mesh.castShadow=true;
		mesh.receiveShadow=true;
		this.mesh=mesh;
		this.scene.add(mesh);
		let light=new THREE.DirectionalLight(0xffffff,1);
		light.position.set(0,3,0);
		light.castShadow=true;
		light.shadow.mapSize.width=512;
		light.shadow.mapSize.height=512;
		light.shadow.camera.near=0.5;
		light.shadow.camera.far=1000;
		this.scene.add(light);
	}


	update(time) {
		if (!Debug.IsVisible(this.canvas)) {return true;}
		// Get the timestep. Prevent steps that are too large.
		let delta=(time-this.frameprev)/1000;
		delta=delta<this.framemax?delta:this.framemax;
		delta=delta>0?delta:0;
		this.frameprev=time;
		let mesh=this.mesh;
		let u=performance.now()/1000;
		mesh.rotation.x=u*0.6;
		mesh.rotation.y=u*0.6;
		let camera=this.camera;
		let input=this.input;
		input.update();
		// Player camera.
		let lookspeed=3/this.canvas.height;
		let movespeed=3;
		let playerang=this.playerang;
		let prevpos=this.mousepos;
		let mousepos=input.getmousepos();
		let looking=input.getkeydown(input.MOUSE.LEFT);
		if (looking && this.looking) {
			let difx=(mousepos[0]-prevpos[0])*lookspeed;
			let dify=(mousepos[1]-prevpos[1])*lookspeed;
			if (difx>-Infinity && difx<Infinity) {playerang[1]+=difx;}
			if (dify>-Infinity && dify<Infinity) {playerang[0]-=dify;}
			playerang[0]=Math.max(Math.min(playerang[0],Math.PI*0.49),-Math.PI*0.49);
			playerang[1]%=Math.PI*2;
			playerang[2]%=Math.PI*2;
		}
		this.looking=looking;
		this.mousepos=mousepos;
		// Player position.
		let playerpos=this.playerpos;
		let playermat=Matrix.fromangles(playerang);
		let movedir=new Vector(3);
		if (input.getkeydown(input.KEY.A) || input.getkeydown(input.KEY.LEFT)) {
			movedir[0]-=1;
		}
		if (input.getkeydown(input.KEY.D) || input.getkeydown(input.KEY.RIGHT)) {
			movedir[0]+=1;
		}
		if (input.getkeydown(input.KEY.W) || input.getkeydown(input.KEY.UP)) {
			movedir[2]-=1;
		}
		if (input.getkeydown(input.KEY.S) || input.getkeydown(input.KEY.DOWN)) {
			movedir[2]+=1;
		}
		let mag=movedir.mag();
		if (mag>1e-10) {
			movedir.imul(movespeed*delta/(mag>1?mag:1));
			movedir=playermat.mul(movedir);
			playerpos.iadd(movedir);
		}
		// Update 3JS camera.
		camera.position.set(playerpos[0],playerpos[1],playerpos[2]);
		let fwd=playermat.mul(new Vector([0,0,-1])).iadd(playerpos);
		camera.lookAt(fwd[0],fwd[1],fwd[2]);
		this.renderer.render(this.scene,camera);
		// this.audio.update();
		/*let rnd=this.rnd;
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

