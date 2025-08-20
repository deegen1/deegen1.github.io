/*------------------------------------------------------------------------------


rappel.js - v2.00

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


player height = 2 units = 32 pixels


--------------------------------------------------------------------------------
TODO


Particles not being deleted.

Sound effects
	volume scaler init to 0, use a slider <|) --O-----
	hook charge, throw, land
	object-wall hit
	music


*/
/* npx eslint rappel.js -c ../../standards/eslint.js */
/* global Random, Vector, Matrix, Transform, Draw, UI, Audio, Input, PhyWorld */


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
		this.canvas.style.imageRendering="pixelated";
		this.rnd=new Random();
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.framemax=1/60;
		this.frameprev=0;
		this.initworld();
		this.initaudio();
		this.camera=new Vector(2);
		this.input=new Input(this.canvas);
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
		world.data.game=this;
		world.maxsteptime=1/180;
		world.gravity.set([0,6.66]);
		let playerpos=new Vector([20,27]);
		// Setup world materials.
		let fillmat=world.createatomtype(1.0,Infinity,0.95);
		let wallmat=world.createatomtype(1.0,Infinity,0.95);
		let normmat=world.createatomtype(0.01,1.00,0.98);
		let bodymat=world.createatomtype(0.01,0.32,0.25);
		let ropemat=world.createatomtype(0.50,1.10,0.00);
		let hookmat=world.createatomtype(0.01,1.32,0.25);
		let edgemat=world.createatomtype(0.01,1.32,0.00);
		let partmat=world.createatomtype(0.50,1e-9,0.50);
		this.fillmat=fillmat;
		this.wallmat=wallmat;
		this.normmat=normmat;
		this.bodymat=bodymat;
		this.ropemat=ropemat;
		this.hookmat=hookmat;
		this.edgemat=edgemat;
		this.partmat=partmat;
		// Prevents collision between the player and hair.
		fillmat.data.rgb=[ 32, 32, 32,255];
		wallmat.data.rgb=[140,170,140,255];
		normmat.data.rgb=[255,255,255,255];
		bodymat.data.rgb=[128,128,255,255];
		partmat.gravity=new Vector([0,0]);
		// The rope needs to avoid collision most of the time.
		for (let intr of edgemat.intarr) {intr.staticdist=5;}
		for (let intr of fillmat.intarr) {intr.statictension=0;}
		for (let intr of partmat.intarr) {intr.statictension=0;}
		// Setup the player.
		let bodyrad=0.5;
		let ropes=16;
		let roperad=0.17,ropelen=0.05;
		let hookrad=0.18,hookspace=0.18;
		let mass=3;
		let bodymass=mass*0.84/17,ropemass=mass*0.08/ropes,hookmass=mass*0.08/7;
		this.click=0;
		this.throwing=-1;
		this.charge=0;
		// Create the hook.
		let hookang=[1.3,-1.3,0.0];
		let hooklen=[3,3,3];
		this.hooktime=0;
		this.hookatom=[];
		this.hookbond=[];
		let prev=null;
		for (let s=0;s<3;s++) {
			let ang=hookang[s],len=hooklen[s];
			let dx=Math.cos(ang)*hookspace,dy=Math.sin(ang)*hookspace;
			prev=s?this.hookatom[0]:null;
			for (let i=s?1:0;i<len;i++) {
				let pos=new Vector([(len-1)*hookspace-dx*i,dy*i]);
				let mat=i===2?edgemat:hookmat;
				let atom=world.createatom(pos.add(playerpos),hookrad,mat);
				atom.mass=hookmass;
				atom.data.pos=pos;
				for (let nb of this.hookatom) {
					for (let b=0;b<10;b++) {
						let bond=world.createbond(nb,atom,-1,6000);
						if (!b && Object.is(nb,prev)) {bond.data.rgb=[100,100,100,255];}
						bond.data.rest=bond.dist;
						this.hookbond.push(bond);
					}
				}
				this.hookatom.push(atom);
				prev=atom;
			}
		}
		// Create the hair.
		this.ropemin=50;
		this.ropemax=4000;
		this.ropeatom=[];
		for (let i=0;i<ropes;i++) {
			let atom=world.createatom(playerpos,roperad,ropemat);
			atom.mass=ropemass;
			this.ropeatom.push(atom);
			for (let b=0;b<16;b++) {
				let bond=world.createbond(prev,atom,ropelen,240);
				if (!b) {bond.data.rgb=[255,255,255,255];}
			}
			prev=atom;
		}
		// Create the body.
		this.bodyatom=[];
		this.hookang=0;
		this.playerpos=playerpos;
		this.playervel=new Vector(2);
		for (let i=0;i<17;i++) {
			let ang=Math.PI*2*i/16,rad=i?bodyrad:0;
			let pos=new Vector([Math.cos(ang)*rad,Math.sin(ang)*rad]);
			let atom=world.createatom(pos.add(playerpos),bodyrad,bodymat);
			atom.mass=bodymass;
			this.bodyatom.push(atom);
			for (let j=0;j<i;j++) {world.createbond(atom,this.bodyatom[j],-1,j?500:1000);}
			let bond=world.createbond(prev,atom,-1,240);
			if (i) {world.createbond(atom,this.bodyatom[0],bodyrad*0.25,0);}
			else {bond.data.rgb=[255,255,255,255];}
		}
		// Set up the level.
		let ww=100,wh=75;
		this.worldw=ww;
		this.worldh=wh;
		let d=1.19;
		world.createshape(2,wallmat,0.27,0.26,
			[[-d,-d],[d,-d],[d,d],[-d,d]],
			[[0,1],[1,2],[2,3],[3,0]],
			[13.3,26.7]
		);
		world.createshape(2,wallmat,0.27,0.26,
			[[-d,-d],[d,-d],[d,d],[-d,d]],
			[[0,1],[1,2],[2,3],[3,0]],
			[22.0,20.0]
		);
		world.createshape(2,wallmat,0.27,0.26,
			[[-d,-d],[d,-d],[d,d],[-d,d]],
			[[0,1],[1,2],[2,3],[3,0]],
			[30.7,26.7]
		);
		world.createshape(1,normmat,0.27,0.26,
			[[-d,-d],[d,-d],[d,d],[-d,d]],
			[[0,1],[1,2],[2,3],[3,0]],
			{vec:[22.0,16.7]},
			0.6,5000,0.75
		);
		world.createshape(0,wallmat,0.27,0.26,
			[[0,0],[ww,0],[ww,wh],[0,wh]],
			[[0,1],[1,2],[2,3],[3,0]]
		);
		world.createshape(0,fillmat,4.0,1.0,
			[[-3.8,-3.8],[ww+3.8,-3.8],[ww+3.8,wh+3.8],[-3.8,wh+3.8]],
			[[0,1],[1,2],[2,3],[3,0]]
		);
		world.createshape(2,wallmat,0.24,0.24,
			[[0,0],[16,0],[16,10],[0,10]],
			[[0,1],[1,2],[2,3],[3,0]],
			{vec:[14,28.5],ang:0.35}
		);
		for (let atom of world.atomiter()) {
			if (Object.is(atom.type,wallmat)) {
				let dist=atom.data._filldist;
				if (dist<0) {atom.type=fillmat;}
			}
		}
		console.log("atoms:",world.atomlist.count);
		console.log("bonds:",world.bondlist.count);
		world.collcallback=function(a,b,norm,veldif,posdif,bond) {
			return state.collcallback(a,b,norm,veldif,posdif,bond);
		};
		world.stepcallback=function(dt) {
			return state.stepcallback(dt);
		};
	}


	// ----------------------------------------
	// Graphics


	resize() {
		// Properly resize the canvas.
		let scale=16,mindim=480;
		let banner=this.banner.clientHeight;
		let maxw=this.worldw*scale|0,maxh=this.worldh*scale|0;
		let winw=window.innerWidth,winh=window.innerHeight-banner;
		let winmax=mindim/(winw<winh?winw:winh);
		let draww=winw*winmax|0;
		let drawh=winh*winmax|0;
		draww=draww<maxw?draww:maxw;
		drawh=drawh<maxh?drawh:maxh;
		let ratio=winw/draww,ratioh=winh/drawh;
		ratio=ratio<ratioh?ratio:ratioh;
		maxw=draww*ratio;
		maxh=drawh*ratio;
		let style=this.canvas.style;
		style.left=(winw-maxw)*0.5+"px";
		style.top=banner+"px";
		style.width=maxw+"px";
		style.height=maxh+"px";
		this.initgraphics(draww,drawh);
	}


	initgraphics(draww,drawh) {
		// Setup the canvas
		let canvas=this.canvas;
		canvas.width=draww;
		canvas.height=drawh;
		let draw=new Draw(draww,drawh);
		draw.screencanvas(canvas);
		this.draw=draw;
		// Create a dark forest background.
		let bg=new Draw.Image(draww,drawh);
		this.background=bg;
		draw.pushstate();
		draw.setimage(bg);
		draw.fill(0,0,0,255);
		let tower=new Draw.Poly(`
			M-200 0V-617L-300-717V-867h76v75h55v-75h76v75h55v-75H-5v-133H5v14c19-5 98-19 60
			18 75 21 85 45 190 47-37 29-136 17-195 5-8-29-47-11-55-10v59H38v75H93v-75h76v75
			h55v-75h76v150L200-617V0Z
		`);
		let tree=new Draw.Poly(`
			M-43 0l22-110-89 35 16-35-93 35 46-72-143 47 36-26-102 14 32-22-100 5 185-108-93
			20 30-25-91 5 181-111-98 8 31-18-69 2 172-99-91 12 18-14-64 4 131-89-51 11 9-17
			-50 1 141-88-62 11 19-13-58-11 127-73-49 11 14-15-54-7 112-66-44 9 19-13-42-7 96
			-58-32 9 17-14-35 5 104-84 104 82-31-4 13 17-35-14 101 60-42 6 21 12-53-8 121 73
			-55 6 24 18-66-22 133 85-66 0 21 22-68-19 145 89-55 0 31 18-67-11 129 94-67-14
			38 28-102-22 168 104-65-7 30 20-103-16 180 116-79-2 13 24-85-25 181 108-88-11 31
			35-107-22 40 38-148-55 55 79-95-37 17 30-91-35 20 111Z
		`);
		let trees=400;
		let xspan=1/23,towery=drawh*0.90;
		let rnd=new Random(9);
		for (let tid=0;tid<trees;tid++) {
			let u=tid/(trees-1),z=2-1*u;
			// Have trees get closer, and place each row in a zig-zag pattern.
			let scale=0.08*(1+Math.abs(rnd.getnorm()))/z;
			let y=drawh*(0.3+0.9*u+rnd.getf()*0.04-0.02);
			let x=(u%xspan)/xspan;
			x=(((u/xspan)&1)?1-x:x)+(rnd.getf()*0.5-0.25)*xspan;
			x*=draww;
			if (y>towery) {
				draw.setcolor(16,16,16,255);
				draw.fillpoly(tower,{vec:[draww*0.43,drawh*0.75],scale:0.2});
				towery=Infinity;
			}
			// Shade based on proximity.
			let c=1/(3-2*u);
			draw.setcolor(60*c,80*c,60*c,255);
			draw.fillpoly(tree,{vec:[x,y],scale:scale});
		}
		draw.popstate();
		this.distmap=new Float32Array(draww*drawh);
		// Init particles.
		this.partsum=0;
		this.partcost=1000;
		this.partmax=2048;
		this.partcnt=0;
		this.partarr=new Array(this.partmax);
		for (let i=0;i<this.partmax;i++) {
			this.partarr[i]={type:-1,time:0,atom:null,cost:0};
		}
		// Init UI.
		let ui=new UI(draw,this.input);
		this.ui=ui;
		ui.addtext(5,45,"Click to throw",20);
		ui.addpoly(UI.VOLUME_POLY,{vec:[21,20],scale:15});
		ui.addslider(45,5,120,30);
	}


	drawatom(atom,rgb) {
		// If two atoms overlap, prefer the one that's closer.
		// Overlap is judged by the center of the pixel (.5,.5).
		let draw=this.draw,img=draw.img;
		// Check if it's on the screen.
		let dw=img.width,dh=img.height,scale=16;
		let x=(atom.pos[0]-this.camera[0])*scale;
		let y=(atom.pos[1]-this.camera[1])*scale;
		let dx=(x>1?(x<dw?x:dw):1)-0.5-x;
		let dy=(y>1?(y<dh?y:dh):1)-0.5-y;
		let rad=atom.rad*scale+0.5,rad2=rad*rad;
		if (dx*dx+dy*dy>=rad2) {return;}
		let alpha=(rgb[3]/255)*128;
		let rad21=rad>1 && alpha>127?(rad-1)*(rad-1):0;
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
					// Only write the distance if we're inside the border.
					if (d2<=rad21 && d2<m2) {distmap[minx]=d2;}
					// rad-dist>1 and sqrt(m2)-sqrt(d2)>1
					if (d2<=rad21 && u2>0 && d2<u2*u2) {
						imgdata32[minx]=colrgba;
					} else {
						// Blend if we're on the edge or bordering another atom.
						let dst=imgdata32[minx];
						let dist=Math.sqrt(d2);
						let bord=Math.sqrt(m2)-dist;
						let edge=rad-dist;
						let a=(256-alpha*(bord<1?bord+1:2)*(edge<1?edge:1))|0;
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


	createparticle(type,pos,vel) {
		if (this.partcnt>=this.partmax) {return;}
		let cost=1;
		let sum=this.partsum+cost;
		if (sum>this.partcost) {return;}
		this.partsum=sum;
		let part=this.partarr[this.partcnt++];
		let atom=this.world.createatom(pos,0.05,this.partmat);
		atom.vel.set(vel);
		atom.data.rgb=[255,255,255,255];
		part.type=type;
		part.atom=atom;
		part.time=0.25;
		part.cost=cost;
	}


	updateparticles(dt) {
		let partsum=0;
		let partcnt=this.partcnt;
		let partarr=this.partarr;
		for (let i=partcnt-1;i>=0;i--) {
			let part=partarr[i];
			let atom=part.atom;
			let time=part.time-dt;
			if (time>0 && time<120) {
				part.time=time;
				let alpha=time<0.1?time*255/0.1:255;
				atom.data.rgb[3]=alpha;
				partsum+=part.cost;
			} else {
				partarr[i]=partarr[--partcnt];
				partarr[partcnt]=part;
				atom.release();
			}
		}
		this.partsum=partsum;
		this.partcnt=partcnt;
	}


	// ----------------------------------------
	// Audio


	initaudio() {
		let audio=new Audio();
		audio.mute(0);
		this.audio=audio;
		this.bgsnd=Audio.sequencer(``);
		this.bgsndinst=null;
		this.basicsnd=Audio.SFX.defsnd("thud",1,100,0.4);
		this.basicsum=0;
	}


	// ----------------------------------------
	// Player


	collcallback(a,b,norm,veldif,posdif,bond) {
		const FILL=0,WALL=1,NORM=2,BODY=3,ROPE=4,HOOK=5,EDGE=6,PART=7;
		let aid=a.type.id,bid=b.type.id;
		if (aid<=WALL && bid<=WALL) {return false;}
		if (aid===PART || bid===PART) {return true;}
		//let adata=a.data,bdata=b.data;
		if ((aid>=ROPE && aid<=EDGE) || (bid>=ROPE && bid<=EDGE)) {
			if (aid>=BODY && aid<=EDGE && bid>=BODY && bid<=EDGE) {return false;}
			if (this.throwing<2) {return false;}
		}
		if (!bond && veldif>2.5) {
			// Create a particle along the plane between the 2 atoms.
			let dim=a.pos.length;
			let cen=a.pos.add(b.pos).imul(0.5);
			let vel=a.vel.add(b.vel).imul(0.5);
			let dist=a.pos.dist(b.pos)*0.5;
			let dir=Vector.random(dim);
			let proj=dir.mul(norm);
			// dir-norm*(dir*norm)
			dir.isub(norm.mul(proj)).imul(dist).iadd(cen);
			// let u=Math.abs(a.vel.mul(norm))+1e-10;
			// u/=u+Math.abs(b.vel.mul(norm))+1e-10;
			this.createparticle(0,dir,vel);
		}
		return true;
	}


	stepcallback(dt) {
		// Countdown the charge timer.
		if (this.throwing===2) {
			this.charge-=dt;
			if (this.charge<=0) {
				dt=-this.charge;
				this.charge=0;
				this.throwing=3;
				for (let intr of this.edgemat.intarr) {
					intr.statictension=1500;
				}
				this.hooktime=0;
			}
		}
		// If we've thrown for long enough, begin pulling.
		if (this.throwing===3) {
			let hooktime=this.hooktime+dt;
			this.hooktime=hooktime;
			let distmul=hooktime*4;
			distmul=(distmul<1?distmul:1)*4+1;
			for (let bond of this.hookbond) {
				bond.dist=bond.data.rest*distmul;
			}
			let u=hooktime/2;
			let tension=this.ropemin+(this.ropemax-this.ropemin)*(u<1?u*u:1);
			tension=tension<this.ropemax?tension:this.ropemax;
			for (let atom of this.ropeatom) {
				for (let bond of atom.bondlist.iter()) {
					if (bond.breakdist===Infinity) {
						bond.tension=tension;
					}
				}
			}
		}
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
		// Check for click.
		let throwing=this.throwing;
		let charge=this.charge;
		let click=input.getkeydown(input.MOUSE.LEFT)?1:0;
		if (this.click!==click) {this.click=click;} else {click=2;}
		// Throw if we can, or release.
		if (throwing<=0) {throwing=this.click?1:0;}
		if (throwing===1) {charge+=dt;}
		charge=charge<1?charge:1;
		if (click===0) {throwing=throwing===1?2:0;}
		if (this.throwing!==throwing) {
			let hookatom=this.hookatom;
			if (throwing<3) {
				charge=throwing>0?charge:0;
				for (let intr of this.edgemat.intarr) {
					intr.statictension=0;
				}
				for (let bond of this.hookbond) {
					bond.dist=bond.data.rest;
				}
				// Throw the hook according to the player's velocity.
				// Delete any temporary bonds on the hook.
				let lookdir=mouse.sub(playerpos).normalize();
				let fmul=throwing===2?40*charge:0;
				let force=lookdir.mul(fmul).iadd(playervel);
				let cs=lookdir[0],sn=lookdir[1];
				let trans=new Transform({vec:playerpos});
				trans.mat.set([cs,-sn,sn,cs]);
				for (let atom of hookatom) {
					//if (throwing>0) {
						atom.pos.set(trans.apply(atom.data.pos));
						atom.vel.set(force);
					//}
					for (let bond of atom.bondlist.iter()) {
						if (!(bond.breakdist===Infinity)) {bond.release();}
					}
				}
				// Reset rope position. Delete any temporary bonds on the rope.
				let tension=throwing<2?this.ropemax:this.ropemin;
				for (let atom of ropeatom) {
					//if (throwing>0) {
						atom.pos.set(playerpos);
						atom.vel.set(force);
					//}
					for (let bond of atom.bondlist.iter()) {
						if (!(bond.breakdist===Infinity)) {bond.release();}
						else {bond.tension=tension;}
					}
				}
			}
			this.throwing=throwing;
		}
		this.charge=charge;
		if (throwing===1) {
			// Show swinging animation while charging.
			let rad=0.3+charge*0.8;
			let ang=(this.hookang+dt*25.0)%(Math.PI*2);
			this.hookang=ang;
			let len=ropeatom.length;
			for (let i=0;i<len;i++) {
				let u=1-i/(len-1);
				let r=u*rad,a=ang-1.5*u*charge;
				let pos=playerpos.add([Math.cos(a)*r,Math.sin(a)*r]);
				let atom=ropeatom[i];
				pos.isub(atom.pos);
				atom.vel.iadd(pos);
				atom.pos.iadd(pos);
			}
			let prev=ropeatom[0];
			let trans=new Transform({vec:prev.pos,ang:ang-Math.PI*0.75});
			for (let atom of this.hookatom) {
				atom.pos.set(trans.apply(atom.data.pos));
				atom.vel.set(prev.vel);
			}
		}
	}


	// ----------------------------------------
	// Main


	update(time) {
		// Get the timestep. Prevent steps that are too large.
		let dt=(time-this.frameprev)*0.001;
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
		this.mouse=mouse;
		this.ui.update();
		// let rnd=this.rnd;
		let world=this.world;
		draw.img.data32.set(this.background.data32);
		world.update(dt);
		this.updateplayer(dt);
		/*if (this.basicsum>1e-5) {
			let vol=this.basicsum/1000;
			vol=vol>0?vol:0;
			vol=vol<1?vol:1;
			this.basicsnd.play(vol);
		}
		this.basicsum=0;*/
		// Center the camera on the player.
		let camera=this.camera;
		let drawmax=[draww,drawh];
		let worldmax=[this.worldw,this.worldh];
		for (let i=0;i<2;i++) {
			let ds=drawmax[i]/scale;
			let pos=this.playerpos[i]-ds*0.5;
			let max=worldmax[i]-ds;
			pos=pos<max?pos:max;
			camera[i]=pos>0?pos:0;
		}
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
		if (charge>0) {
			let arcs=128;
			let rad0=1.25*scale,rad1=1.75*scale;
			let [x,y]=this.playerpos.sub(this.camera).mul(scale);
			let ang=-Math.PI*0.5,amul=Math.PI*2*charge/(arcs-1);
			let poly=new Draw.Poly();
			for (let a=0;a<arcs;a++) {poly.lineto(Math.cos(ang)*rad1+x,Math.sin(ang)*rad1+y);ang+=amul;}
			for (let a=0;a<arcs;a++) {ang-=amul;poly.lineto(Math.cos(ang)*rad0+x,Math.sin(ang)*rad0+y);}
			draw.setcolor(100,100,200,255);
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
		this.updateparticles(dt);
		// Draw the hook.
		let h0=this.ropeatom[0].pos.sub(camera).mul(scale);
		let h1=this.ropeatom[1].pos.sub(camera).mul(scale);
		let angle=Math.atan2(h0[1]-h1[1],h0[0]-h1[0]);
		draw.setcolor(100,100,100,255);
		draw.fillpoly(this.hookpoly,{vec:[h0[0],h0[1]],ang:angle,scale:0.04});
		draw.setcolor(255,255,255,255);
		// Draw the HUD.
		this.ui.render();
		draw.setcolor(255,255,255,255);
		draw.filloval(mouse[0],mouse[1],6,6);
		draw.filltext(draww-5-this.framestr.length*11,5,this.framestr,20);
		draw.screenflip();
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
