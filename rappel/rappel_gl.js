/*------------------------------------------------------------------------------


rappel.js - v1.00

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Allow larger levels
	make sure takes up full screen
	follow player
	take full screen, 480 for smallest side
	move site link

Levels
	terrain: rad space mat0 L x0 y0 [mat1] C x1 y1 ...
	texture can be a name or 0x hex code

Charge up instead of wait timer.

Particles when movedir or player vel change

Sound effects
	mute button
	hook throw
	hook land
	object-wall hit
	music


player height = 2 units = 32 pixels

https://stackoverflow.com/questions/12250953/drawing-an-image-using-webgl
https://codepen.io/vskyberry/pen/wvKPGoY


*/
/* npx eslint rappel.js -c ../../standards/eslint.js */
/* global Random, Vector, Matrix, Draw, Audio, Input, PhyWorld */


function IsVisible(elem) {
	// If the window is minimized, or the tab isn't primary.
	if (document.visibilityState==="hidden") {return false;}
	// If the element rect isn't on screen.
	let rect=elem.getBoundingClientRect();
	let doc=document.documentElement;
	if (rect.bottom<=0 || rect.top >=(window.innerHeight || doc.clientHeight)) {return false;}
	if (rect.right <=0 || rect.left>=(window.innerWidth  || doc.clientWidth )) {return false;}
	return true;
}


class Game {

	constructor(bannerid,divid) {
		this.banner=document.getElementById(bannerid);
		this.canvas=document.getElementById(divid);
		this.rnd=new Random();
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.framemax=1/60;
		this.frameprev=0;
		this.initworld();
		this.initaudio();
		this.camera=new Vector(2);
		this.init3d();
		//this.initgraphics();
		this.input=new Input();
		this.input.disablenav();
		this.mouse=new Vector(2);
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


	// ----------------------------------------
	// Physics


	initworld() {
		let state=this;
		this.world=new PhyWorld(2);
		let world=this.world;
		world.maxsteptime=1/180;
		world.gravity.set([0,6.66]);
		let playerpos=new Vector([20,27]);
		// Setup world materials.
		let wallmat=world.createatomtype(1.0,Infinity,0.95);
		let movemat=world.createatomtype(0.01,1.0,0.98);
		let bodymat=world.createatomtype(0.01,0.32,0.5);
		let ropemat=world.createatomtype(0.90,1.1,0.5);
		let hookmat=world.createatomtype(0.01,1.2,0.5);
		this.wallmat=wallmat;
		this.movemat=movemat;
		this.bodymat=bodymat;
		this.ropemat=ropemat;
		this.hookmat=hookmat;
		// Prevents collision between the player and hair.
		wallmat.data.rgb=[140,170,140,255];
		movemat.data.rgb=[255,255,255,255];
		bodymat.data.rgb=[128,128,255,255];
		bodymat.data.self=true;
		ropemat.data.self=true;
		hookmat.data.self=true;
		// The rope needs to avoid collision most of the time.
		function hookcall(a,b) {return state.hookcall(a,b);}
		function ropecall(a,b) {return state.ropecall(a,b);}
		for (let intr of hookmat.intarr) {intr.callback=hookcall;}
		for (let intr of ropemat.intarr) {intr.callback=ropecall;}
		for (let intr of bodymat.intarr) {
			intr.vmul=1;
			intr.statictension=600;
		}
		// Setup the player.
		let bodyrad=0.5,headdist=0.75;
		let ropes=16,ropebonds=16;
		let roperad=0.17,ropelen=0.1;
		this.updir=new Vector([0,-1]);
		this.click=0;
		this.throwing=0;
		this.charge=1;
		this.hookpoly=new Draw.Poly(`
			M -75 -20 L -40 -45 L 0 -45 C 70 -54 -18 -147 -70 -180 C 23 -182 158 -45 60 0
			C 158 45 23 182 -70 180 C -18 147 70 54 0 45 L -40 45 L -75 20 Z
		`);
		// Create the body.
		this.headdist=headdist;
		this.bodyatom=[];
		this.playermass=3;
		this.playerpos=playerpos;
		this.playervel=new Vector(2);
		for (let i=0;i<17;i++) {
			let ang=Math.PI*2*i/16,rad=i?bodyrad:0;
			let pos=new Vector([Math.cos(ang)*rad,Math.sin(ang)*rad]);
			let atom=world.createatom(pos.add(playerpos),bodyrad,bodymat);
			this.bodyatom.push(atom);
			for (let j=0;j<i;j++) {world.createbond(atom,this.bodyatom[j],-1,j?500:1000);}
			if (i) {world.createbond(atom,this.bodyatom[0],bodyrad*0.25,0);}
		}
		// Create the hair.
		this.ropeatom=[];
		let prev=null;
		let headpos=playerpos.add([0,-headdist]);
		for (let i=0;i<ropes;i++) {
			let mat=i?ropemat:hookmat;
			let atom=world.createatom(headpos,roperad,mat);
			this.ropeatom.push(atom);
			for (let b=0;prev && b<ropebonds;b++) {
				let bond=world.createbond(prev,atom,ropelen,600);
				if (!b) {bond.data.rgb=[255,255,255,255];}
			}
			prev=atom;
		}
		for (let b=0;b<ropebonds;b++) {
			world.createbond(prev,this.bodyatom[0],headdist,600);
		}
		// Set up the level.
		this.worldw=200;
		this.worldh=150;
		world.createbox([13.3,26.7],10,0.27,0.13,wallmat);
		world.createbox([22.0,20.0],10,0.27,0.13,wallmat);
		world.createbox([30.7,26.7],10,0.27,0.13,wallmat);
		world.createbox([22.0,16.7],10,0.27,0.13,movemat,5000);
		this.addlines([
			{x:0,y:0,mat:wallmat,rad:0.24,space:0.12,data:{rgb:[200,100,100]}},
			{y:150},{x:200},{y:0},{x:0}
		]);
		//this.debugmap();
	}


	addlines(arr) {
		// {x,y,mat,data,rad,space}
		// if not set, copy previous
		let ret=[];
		let mat=null;
		let data={};
		let rad=NaN,space=NaN;
		let lx=NaN,ly=NaN;
		let last=arr[arr.length-1];
		let skip=(arr[0].x===last.x && arr[0].y===last.y)?1:0;
		for (let vert of arr) {
			mat=vert.mat??mat;
			rad=vert.rad??rad;
			data=vert.data??data;
			space=vert.space??space;
			let nx=vert.x??lx,ny=vert.y??ly;
			let dx=nx-lx,dy=ny-ly;
			let dist=Math.sqrt(dx*dx+dy*dy);
			if (dist>0) {
				if (!mat) {throw "material not defined";}
				if (!rad) {throw "radius not defined";}
				let tmpspace=space>0?space:rad*0.5;
				let count=(dist/tmpspace+0.5)|0;
				count=count>2?count:2;
				for (let c=skip;c<count;c++) {
					let u=c/(count-1);
					let pos=new Vector([lx+dx*u,ly+dy*u]);
					let atom=this.world.createatom(pos,rad,mat);
					Object.assign(atom.data,data);
					ret.push(atom);
				}
				skip=1;
			}
			lx=nx;
			ly=ny;
		}
		return ret;
	}


	debugmap() {
		// For testing purposes. Draw an image of the full level.
		// Find the bounding box of all atoms.
		let scale=16,maxdim=10000/scale;
		let minx=0,maxx=this.worldw;
		let miny=0,maxy=this.worldh;
		let atomarr=[];
		for (let atom of this.world.atomiter()) {
			let x=atom.pos[0],y=atom.pos[1],rad=atom.rad;
			if (!(x-rad>-maxdim && x+rad<maxdim && y-rad>-maxdim && y+rad<maxdim)) {
				console.log("rejected atom:",x,y,rad);
				continue;
			}
			minx=minx>x-rad?x-rad:minx;
			maxx=maxx<x+rad?x+rad:maxx;
			miny=miny>y-rad?y-rad:miny;
			maxy=maxy<y+rad?y+rad:maxy;
			atomarr.push(atom);
		}
		// Create an image to fit everything.
		let difx=(maxx-minx)*0.05;
		let dify=(maxy-miny)*0.05;
		minx-=difx;
		maxx+=difx;
		miny-=dify;
		maxy+=dify;
		let draww=(maxx-minx+1)*scale|0;
		let drawh=(maxy-miny+1)*scale|0;
		console.log("dimensions:",draww,drawh);
		let draw=new Draw(draww,drawh);
		draw.fill(0,0,0,255);
		// Fill in all atoms based on size.
		atomarr.sort((l,r)=>r.rad-l.rad);
		let minr=atomarr[0].rad;
		let maxr=0.5/(atomarr[atomarr.length-1].rad-minr);
		for (let atom of atomarr) {
			let x=(atom.pos[0]-minx)*scale;
			let y=(atom.pos[1]-miny)*scale;
			let rad=atom.rad*scale;
			let rgb=atom.data.rgb;
			if (rgb===undefined) {rgb=atom.type.data.rgb;}
			if (rgb===undefined) {rgb=[255,255,255,255];}
			let col=0.5+maxr*(atom.rad-minr);
			draw.setcolor(rgb[0]*col,rgb[1]*col,rgb[2]*col,255);
			draw.filloval(x,y,rad,rad);
		}
		// Draw the world dimensions.
		draw.setcolor(0,0,255,128);
		let poly=new Draw.Poly();
		let worldx=(0-minx)*scale,worldy=(0-miny)*scale,pad=4;
		let worldw=this.worldw*scale,worldh=this.worldh*scale;
		poly.addrect(worldx-pad,worldy-pad,worldw+pad*2,worldh+pad*2);
		poly.addrect(worldx,worldy+worldh,worldw,-worldh);
		draw.fillpoly(poly);
		draw.img.savefile("rappel_map.tga");
	}


	// ----------------------------------------
	// Graphics


	resize() {
		// Properly resize the canvas
		//let maxw=this.worldw*16,maxh=this.worldh*16;
		let draww=480,drawh=480;
		let banner=this.banner.clientHeight;
		let winw=window.innerWidth,winh=window.innerHeight-banner;
		if (winw<winh) {
			drawh=(winh*draww/winw)|0;
		} else {
			draww=(winw*drawh/winh)|0;
		}
		let style =this.canvas.style;
		style.left="0px";
		style.top =banner+"px";
		style.width =winw+"px";
		style.height=winh+"px";
		this.initgraphics(draww,drawh);
	}


	init3d() {
		let ctx=this.canvas.getContext("webgl2");
		this.ctx=ctx;
		let vs=ctx.createShader(ctx.VERTEX_SHADER);
		ctx.shaderSource(vs,`#version 300 es
			in vec2 a_position;
			in vec2 a_texcoord;
			out vec2 v_texcoord;
			void main() {
				gl_Position = vec4(a_position,0,1);
				v_texcoord = a_texcoord;
			}
		`);
		ctx.compileShader(vs);
		let fs=ctx.createShader(ctx.FRAGMENT_SHADER);
		ctx.shaderSource(fs,`#version 300 es
			precision highp float;
			in vec2 v_texcoord;
			uniform sampler2D u_texture;
			out vec4 outColor;
			void main() {
				outColor = texture(u_texture, v_texcoord);
			}
		`);
		ctx.compileShader(fs);
		let prog=ctx.createProgram();
		ctx.attachShader(prog,vs);
		ctx.attachShader(prog,fs);
		ctx.linkProgram(prog);
		ctx.useProgram(prog);
		let tex=ctx.createTexture();
		ctx.bindTexture(ctx.TEXTURE_2D,tex);
		ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_MIN_FILTER,ctx.NEAREST);
		ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_MAG_FILTER,ctx.NEAREST);
		let attrs=[
			{var:"a_position",arr:[-1,-1,-1,1,1,1,1,-1]},
			{var:"a_texcoord",arr:[0,1,0,0,1,0,1,1]}
		];
		for (let attr of attrs) {
			let buf=ctx.createBuffer();
			let loc=ctx.getAttribLocation(prog,attr.var);
			ctx.enableVertexAttribArray(loc);
			ctx.bindBuffer(ctx.ARRAY_BUFFER,buf);
			ctx.bufferData(ctx.ARRAY_BUFFER,new Float32Array(attr.arr),ctx.STATIC_DRAW);
			ctx.vertexAttribPointer(loc,2,ctx.FLOAT,false,0,0);
		}
	}


	initgraphics(draww,drawh) {
		// Setup the canvas
		let canvas=this.canvas;
		canvas.width=draww;
		canvas.height=drawh;
		canvas.style.imageRendering="pixelated";
		let draw=new Draw(draww,drawh);
		this.draw=draw;
		// Create a dark forest background.
		let bg=new Draw.Image(draww,drawh);
		this.background=bg;
		draw.savestate();
		draw.setimage(bg);
		draw.fill(0,0,0,255);
		let tower=new Draw.Poly(`
			M 100 1000 L 100 383 L 0 283 L 0 133 L 76 133 L 76 208 L 131 208 L 131 133
			L 207 133 L 207 208 L 262 208 L 262 133 L 295 133 L 295 0 L 305 0 L 305 14
			C 324 9 403 -5 365 32 C 440 53 450 77 555 79 C 518 108 419 96 360 84
			C 352 55 313 73 305 74 L 305 133 L 338 133 L 338 208 L 393 208 L 393 133
			L 469 133 L 469 208 L 524 208 L 524 133 L 600 133 L 600 133 L 600 283 L 500 383
			L 500 1000 Z
		`);
		let tree=new Draw.Poly(`
			M 375 1000 397 890 308 925 324 890 231 925 277 853 134 900 170 874 68 888 100
			866 0 871 185 763 92 783 122 758 31 763 212 652 114 660 145 642 76 644 248 545
			157 557 175 543 111 547 242 458 191 469 200 452 150 453 291 365 229 376 248 363
			190 352 317 279 268 290 282 275 228 268 340 202 296 211 315 198 273 191 369 133
			337 142 354 128 319 133 423 49 527 131 496 127 509 144 474 130 575 190 533 196
			554 208 501 200 622 273 567 279 591 297 525 275 658 360 592 360 613 382 545 363
			690 452 635 452 666 470 599 459 728 553 661 539 699 567 597 545 765 649 700 642
			730 662 627 646 807 762 728 760 741 784 656 759 837 867 749 856 780 891 673 869
			713 907 565 852 620 931 525 894 542 924 451 889 471 1000 Z
		`);
		let trees=200;
		let xspan=1/17;
		let rnd=new Random(9);
		for (let tid=0;tid<trees;tid++) {
			let u=tid/(trees-1),z=2-1*u;
			if (tid===((trees*0.75)|0)) {
				draw.setcolor(16,16,16,255);
				draw.fillpoly(tower,new Draw.Transform({x:draww*0.33,y:drawh*0.33,scale:0.2}));
			}
			// Have trees get closer, and place each row in a zig-zag pattern.
			let scale=0.1*(1+Math.abs(rnd.getnorm()))/z;
			let y=drawh*1.3/z-250+(rnd.getf()*0.02-0.01)*drawh;
			let x=(u%xspan)/xspan;
			x=(((u/xspan)&1)?1-x:x)+(rnd.getf()-0.5)*xspan;
			x=draww*x-400*scale;
			// Shade based on proximity.
			let c=1/(3-2*u);
			draw.setcolor(60*c,80*c,60*c,255);
			draw.fillpoly(tree,new Draw.Transform({x:x,y:y,scale:scale}));
		}
		draw.loadstate();
		this.distmap=new Float32Array(draww*drawh);
	}


	drawatom(atom,rgb) {
		// If two atoms overlap, prefer the one that's closer.
		// Overlap is judged by the center of the pixel (.5,.5).
		let draw=this.draw,img=draw.img;
		// Check if it's on the screen.
		let dw=img.width,dh=img.height,scale=16;
		let x=(atom.pos[0]-this.camera[0])*scale,y=(atom.pos[1]-this.camera[1])*scale;
		let dx=(x>1?(x<dw?x:dw):1)-0.5-x;
		let dy=(y>1?(y<dh?y:dh):1)-0.5-y;
		let rad=atom.rad*scale+0.5,rad2=rad*rad;
		if (dx*dx+dy*dy>=rad2) {return;}
		let rad21=rad>1?(rad-1)*(rad-1):0;
		// Fill in the circle at (x,y) with radius 'rad'.
		let colrgba=draw.rgbatoint(rgb[0],rgb[1],rgb[2],255);
		let coll=(colrgba&0x00ff00ff)>>>0;
		let colh=(colrgba&0xff00ff00)>>>0;
		let colh2=colh>>>8;
		let miny=Math.floor(y-rad+0.5),maxy=Math.ceil(y+rad-0.5);
		miny=miny> 0?miny: 0;
		maxy=maxy<dh?maxy:dh;
		let imgdata32=img.data32;
		let distmap=this.distmap;
		for (;miny<maxy;miny++) {
			// Find the boundaries of the row we're on. Clip to center of pixel.
			dy=miny-y+0.5;
			let d2=dy*dy;
			dx=Math.sqrt(rad2-d2)-0.5;
			let minx=Math.floor(x-dx),maxx=Math.ceil(x+dx);
			minx=minx> 0?minx: 0;
			maxx=maxx<dw?maxx:dw;
			dx=minx-x+0.5;
			d2+=dx*dx;
			minx+=dw*miny;
			maxx+=dw*miny;
			for (;minx<maxx;minx++) {
				// Check if we can overwrite another atom's pixel, or if we need to blend them.
				let m2=distmap[minx];
				let u=(m2-d2)*0.5,u1=u+0.5,u2=u-0.5;
				// sqrt(m2)-sqrt(d2)>-1
				if (u1>0 || m2>u1*u1) {
					distmap[minx]=d2<m2?d2:m2;
					// rad-dist>1 and sqrt(m2)-sqrt(d2)>1
					if (d2<=rad21 && u2>0 && d2<u2*u2) {
						imgdata32[minx]=colrgba;
					} else {
						// Blend if we're on the edge or bordering another atom.
						let dst=imgdata32[minx];
						let dist=Math.sqrt(d2);
						let bord=Math.sqrt(m2)-dist;
						let edge=rad-dist;
						let a=(256-(bord<1?(bord+1)*128:256)*(edge<1?edge:1))|0;
						imgdata32[minx]=
							(((Math.imul((dst&0x00ff00ff)-coll,a)>>>8)+coll)&0x00ff00ff)+
							((Math.imul(((dst&0xff00ff00)>>>8)-colh2,a)+colh)&0xff00ff00);
					}
				}
				d2+=2*dx+1;
				dx++;
			}
		}
	}


	// ----------------------------------------
	// Audio


	initaudio() {
		let audio=new Audio();
		audio.mute(0);
		this.audio=audio;
		this.bgsnd=Audio.sequencer(``);
		this.bgsndinst=null;
	}


	// ----------------------------------------
	// Player


	ropecall(a,b) {
		return this.throwing>=3 && (!a.type.data.self || !b.type.data.self);
	}


	hookcall(a,b) {
		if (!this.ropecall(a,b)) {return false;}
		if (this.throwing<4) {
			this.throwing=5;
			this.world.createbond(a,b,a.rad+b.rad,20000).breakdist=1e+9;
		}
		return true;
	}


	updateplayer(dt) {
		// Control the player.
		let input=this.input;
		let mouse=this.mouse.mul(1/16).add(this.camera);
		// Get our average position, velocity, and orientation.
		let bodyatom=this.bodyatom;
		let ropeatom=this.ropeatom;
		let playerpos=this.playerpos.set(0);
		let playervel=this.playervel.set(0);
		for (let atom of bodyatom) {
			playerpos.iadd(atom.pos);
			playervel.iadd(atom.vel);
		}
		playerpos.imul(1/bodyatom.length);
		playervel.imul(1/bodyatom.length);
		let head=ropeatom[ropeatom.length-1];
		let updir=this.updir;
		updir.set(head.pos.sub(playerpos));
		// Check for click.
		let throwing=this.throwing;
		let charge=this.charge+0.5*dt;
		charge=charge<1?charge:1;
		let click=input.getkeydown(input.MOUSE.LEFT)?1:0;
		if (this.click!==click) {this.click=click;} else {click=2;}
		if (this.throwing>=4) {
			// The player is hooked.
			throwing=4;
			if (click===0) {
				charge=0;
				throwing=0;
			}
		} else {
			// Estimate where the ground is based on static bonds.
			let mass=0,maxmass=this.playermass;
			let dir=new Vector(2);
			for (let atom of bodyatom) {
				for (let bond of atom.bondlist.iter()) {
					if (bond.breakdist<Infinity) {
						let b=Object.is(atom,bond.a)?bond.b:bond.a;
						let bmass=b.mass<maxmass?b.mass:maxmass;
						let bdir=playerpos.sub(b.pos).normalize();
						dir.iadd(bdir.imul(bmass));
						mass+=bmass;
					}
				}
			}
			if (mass>=maxmass/10) {
				updir.set(dir).normalize();
				// Center the player hair.
				if (throwing<3) {
					let dif=updir.mul(this.headdist);
					dif.iadd(playerpos).isub(head.pos);
					head.vel.iadd(dif);
					head.pos.iadd(dif);
				}
			}
			// Throw if we can, or release.
			if (charge>=1 && (throwing<=0 || throwing===3)) {
				throwing=1;
			}
			if (this.click===1 && throwing===1) {
				throwing=2;
			}
			if (click===0) {
				if (throwing===2) {throwing=3;charge=0.4;}
				else if (throwing===3) {throwing=1;}
			}
		}
		updir.normalize();
		let hook=ropeatom[0];
		this.charge=charge;
		if (this.throwing!==throwing) {
			// body, rope, hook
			let coefs=[0.70,0.25,0.05];
			if (throwing<4) {
				for (let atom of ropeatom) {
					if (throwing>1) {
						atom.pos.set(head.pos);
						atom.vel.set(playervel);
					}
					// Delete any temporary bonds on the rope.
					for (let bond of atom.bondlist.iter()) {
						if (bond.breakdist<Infinity) {bond.release();}
					}
				}
				coefs=[0.990,0.009,0.001];
				// Throw the hook according to the player's velocity.
				if (throwing===3) {
					coefs=[0.990,0.0012,0.0088];
					let lookdir=mouse.sub(head.pos).normalize();
					hook.vel.iadd(lookdir.mul(45));
				}
			}
			// Rebalance masses.
			let totalmass=this.playermass,mass;
			mass=totalmass*coefs[0]/bodyatom.length;
			for (let atom of bodyatom) {atom.mass=mass;}
			mass=totalmass*coefs[1]/ropeatom.length;
			for (let atom of ropeatom) {atom.mass=mass;}
			hook.mass=totalmass*coefs[2];
			this.throwing=throwing;
		}
		if (throwing===2) {
			// Charging.
			let mid=ropeatom[4];
			mid.vel.iadd(playerpos.sub(mid.pos));
			mid.pos.set(playerpos);
			let spin=hook.pos.sub(playerpos).imul(160*dt);
			hook.vel.iadd([-spin[1],spin[0]]);
		}
	}


	// ----------------------------------------
	// Main


	update(time) {
		// Get the timestep. Prevent steps that are too large.
		let dt=(time-this.frameprev)/1000;
		dt=dt<this.framemax?dt:this.framemax;
		dt=dt>0?dt:0;
		this.frameprev=time;
		// Audio
		this.audio.update();
		if (!IsVisible(this.canvas)) {return true;}
		let starttime=performance.now();
		let input=this.input;
		input.update();
		let draw=this.draw;
		let draww=draw.img.width;
		let drawh=draw.img.height;
		let scale=16;
		let mouse=new Vector(input.getmousepos());
		let gamerect=input.getrect(this.canvas);
		mouse[0]=(mouse[0]-gamerect.x)*draww/gamerect.w;
		mouse[1]=(mouse[1]-gamerect.y)*drawh/gamerect.h;
		this.mouse=mouse;
		// let rnd=this.rnd;
		let world=this.world;
		draw.img.data32.set(this.background.data32);
		world.update(dt);
		this.updateplayer(dt);
		let camera=this.camera;
		camera.set(this.playerpos);
		camera[0]-=draww*0.5/16;
		camera[1]-=drawh*0.5/16;
		if (camera[0]<0) {camera[0]=0;}
		if (camera[1]<0) {camera[1]=0;}
		// Draw the atoms.
		this.distmap.fill(Infinity);
		for (let atom of world.atomiter()) {
			let rgb=atom.data.rgb;
			if (rgb===undefined) {rgb=atom.type.data.rgb;}
			if (rgb===undefined) {continue;}
			this.drawatom(atom,rgb);
		}
		// Draw the charge timer.
		let charge=this.charge;
		if (this.throwing===0 && charge<1) {
			let arcs=128;
			let u=charge>0.9?(1-charge)*10:1;
			let rad0=20.0,rad1=26.0;
			let [x,y]=this.playerpos.sub(camera).mul(scale);
			let ang=-Math.PI*0.5,amul=-Math.PI*2*charge/(arcs-1);
			let poly=new Draw.Poly();
			for (let a=0;a<arcs;a++) {poly.lineto(Math.cos(ang)*rad0+x,Math.sin(ang)*rad0+y);ang+=amul;}
			for (let a=0;a<arcs;a++) {ang-=amul;poly.lineto(Math.cos(ang)*rad1+x,Math.sin(ang)*rad1+y);}
			draw.setcolor(255-155*u,255-155*u,255-55*u,u*255);
			draw.fillpoly(poly);
		}
		// Draw the bonds.
		draw.linewidth=3;
		for (let bond of world.bonditer()) {
			let rgb=bond.data.rgb;
			if (rgb===undefined) {continue;}
			draw.setcolor(rgb);
			let apos=bond.a.pos.sub(camera),bpos=bond.b.pos.sub(camera);
			draw.drawline(apos[0]*scale,apos[1]*scale,bpos[0]*scale,bpos[1]*scale);
		}
		draw.linewidth=1;
		// Draw the hook.
		draw.setcolor(100,100,100,255);
		let h0=this.ropeatom[0].pos.sub(camera).mul(scale);
		let h1=this.ropeatom[1].pos.sub(camera).mul(scale);
		let angle=Math.atan2(h0[1]-h1[1],h0[0]-h1[0]);
		let trans=new Draw.Transform({x:h0[0],y:h0[1],angle:angle,scale:0.04});
		draw.fillpoly(this.hookpoly,trans);
		// Draw the HUD.
		draw.setcolor(255,255,255,255);
		draw.filloval(mouse[0],mouse[1],6,6);
		draw.filltext(5,5,"Click to throw",20);
		draw.filltext(draww-5-this.framestr.length*11,5,this.framestr,20);
		let ctx=this.ctx;
		ctx.viewport(0,0,draww,drawh);
		ctx.texImage2D(ctx.TEXTURE_2D,0,ctx.RGBA8,draww,drawh,0,ctx.RGBA,ctx.UNSIGNED_BYTE,draw.img.data8);
		ctx.drawArrays(ctx.TRIANGLE_FAN,0,4);
		// Calculate the frame time.
		this.framesum+=performance.now()-starttime;
		if (++this.frames>=100) {
			let avg=this.framesum/this.frames;
			this.framestr=avg.toFixed(1)+" ms";
			this.frames=0;
			this.framesum=0;
		}
		return true;
	}

}
