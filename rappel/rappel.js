/*------------------------------------------------------------------------------


rappel.js - v1.00

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Particles when movedir or player vel change.
	point
	circle
	line
	star
	letters
	effects:
		glitter reflection
		no static
		can hit ropes
		flickering: flames, sparkling, neon
		smoke
		gravity direction
		damping

Sound effects
	volume scaler init to 0
	hook charge, throw, land
	object-wall hit
	music

player height = 2 units = 32 pixels


*/
/* npx eslint rappel.js -c ../../standards/eslint.js */
/* global Random, Vector, Matrix, Transform, Draw, Audio, Input, PhyWorld */


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


class Particle {

	constructor() {
		// ang
		// atom
		// poly
		// life
		// color
	}

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
		let fillmat=world.createatomtype(1.0,Infinity,0.95);
		let movemat=world.createatomtype(0.01,1.0,0.98);
		let bodymat=world.createatomtype(0.01,0.32,0.5);
		let ropemat=world.createatomtype(0.90,1.1,0.5);
		this.fillmat=fillmat;
		this.wallmat=wallmat;
		this.movemat=movemat;
		this.bodymat=bodymat;
		this.ropemat=ropemat;
		// Prevents collision between the player and hair.
		fillmat.data.rgb=[ 32, 32, 32,255];
		wallmat.data.rgb=[140,170,140,255];
		movemat.data.rgb=[255,255,255,255];
		bodymat.data.rgb=[128,128,255,255];
		bodymat.data.self=true;
		ropemat.data.self=true;
		// The rope needs to avoid collision most of the time.
		function ropecall(a,b) {return state.ropecall(a,b);}
		for (let intr of ropemat.intarr) {intr.callback=ropecall;}
		for (let intr of bodymat.intarr) {
			intr.vmul=1;
			intr.statictension=600;
		}
		for (let intr of fillmat.intarr) {intr.statictension=0;}
		// Setup the player.
		let bodyrad=0.5;
		let ropes=16,ropebonds=16;
		let roperad=0.17,ropelen=0.05;
		this.click=0;
		this.throwing=-1;
		this.charge=1;
		this.hookpoly=new Draw.Poly(`
			M0-45C70-45-18-147-70-180 23-182 158-45 60 0 158 45 23 182-70
			180-18 147 70 45 0 45L-32 45C-58 45-75 27-75 0-75-27-58-45-32-45Z
		`);
		// Create the hair.
		this.ropeatom=[];
		let prev=null;
		for (let i=0;i<ropes;i++) {
			let atom=world.createatom(playerpos,roperad,ropemat);
			this.ropeatom.push(atom);
			for (let b=0;prev && b<ropebonds;b++) {
				let bond=world.createbond(prev,atom,ropelen,600);
				if (!b) {bond.data.rgb=[255,255,255,255];}
			}
			prev=atom;
		}
		this.ropeatom[0].data.hook=true;
		// Create the body.
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
			let bond=world.createbond(prev,atom,-1,600);
			if (i) {world.createbond(atom,this.bodyatom[0],bodyrad*0.25,0);}
			else {bond.data.rgb=[255,255,255,255];}
		}
		// Set up the level.
		this.worldw=200;
		this.worldh=150;
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
		world.createshape(1,movemat,0.27,0.26,
			[[-d,-d],[d,-d],[d,d],[-d,d]],
			[[0,1],[1,2],[2,3],[3,0]],
			{vec:[22.0,16.7]},
			0.6,5000,0.75
		);
		//world.createbox([22.0,16.7],10,0.27,0.13,movemat,5000);
		world.createshape(0,wallmat,0.27,0.26,
			[[-0,-0],[200,-0],[200,150],[-0,150]],
			[[0,1],[1,2],[2,3],[3,0]]
		);
		world.createshape(0,fillmat,4.0,1.0,
			[[-3.8,-3.8],[203.8,-3.8],[203.8,153.8],[-3.8,153.8]],
			[[0,1],[1,2],[2,3],[3,0]]
		);
		world.createshape(2,wallmat,0.24,0.24,
			[[0,0],[16,0],[16,10],[0,10]],
			[[0,1],[1,2],[2,3],[3,0]],
			{vec:[14,28.5],ang:0.35}
		);
		//let rnd=new Random();
		for (let atom of world.atomiter()) {
			if (Object.is(atom.type,wallmat)) {
				let dist=atom.data._filldist;
				if (dist<0) {atom.type=fillmat;}
				//atom.data.rgb=[rnd.modu32(256),rnd.modu32(256),rnd.modu32(256),255];
			}
		}
		console.log("atoms:",world.atomlist.count);
		console.log("bonds:",world.bondlist.count);
		//this.debugmap();
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
				draw.fillpoly(tower,new Draw.Transform({x:draww*0.43,y:drawh*0.75,scale:0.2}));
				towery=Infinity;
			}
			// Shade based on proximity.
			let c=1/(3-2*u);
			draw.setcolor(60*c,80*c,60*c,255);
			draw.fillpoly(tree,new Draw.Transform({x:x,y:y,scale:scale}));
		}
		draw.popstate();
		this.distmap=new Float32Array(draww*drawh);
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
		let throwing=this.throwing;
		if (throwing<2 || (a.type.data.self && b.type.data.self)) {return false;}
		if (throwing<3 && (a.data.hook || b.data.hook)) {
			this.throwing=4;
			this.world.createbond(a,b,a.rad+b.rad,20000).breakdist=NaN;
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
		// Check for click.
		let throwing=this.throwing;
		let charge=this.charge;
		let click=input.getkeydown(input.MOUSE.LEFT)?1:0;
		if (this.click!==click) {this.click=click;} else {click=2;}
		// Throw if we can, or release.
		if (throwing<=0 || charge<=0) {
			throwing=this.click?1:0;
			charge=0;
		}
		charge+=[0,1,-0.75][throwing]*dt;
		charge=charge<1?charge:1;
		let hook=ropeatom[0];
		if (click===0) {
			throwing=[0,2,0,0,0][throwing];
		} else if (throwing>=3) {
			// Check if the anchor point has been deleted.
			throwing=0;
			for (let bond of hook.bondlist.iter()) {
				if (isNaN(bond.breakdist)) {throwing=3;}
			}
		}
		if (this.throwing!==throwing) {
			// body, rope, hook, damp
			let coefs=[0.70,0.25,0.05,0.90];
			if (throwing<3) {
				for (let atom of ropeatom) {
					if (throwing>0) {
						atom.pos.set(playerpos);
						atom.vel.set(playervel);
					}
					// Delete any temporary bonds on the rope.
					for (let bond of atom.bondlist.iter()) {
						if (!(bond.breakdist===Infinity)) {bond.release();}
					}
				}
				coefs=[0.990,0.00942,0.00058,0.90];
				// Throw the hook according to the player's velocity.
				if (throwing===2) {
					coefs=[0.990,0.0015,0.0085,0.01];
					let lookdir=mouse.sub(playerpos).normalize();
					hook.vel.iadd(lookdir.mul(45*charge));
				}
			}
			this.ropemat.damp=coefs[3];
			this.ropemat.dt=0;
			// Rebalance masses.
			let totalmass=this.playermass,mass;
			mass=totalmass*coefs[0]/bodyatom.length;
			for (let atom of bodyatom) {atom.mass=mass;}
			mass=totalmass*coefs[1]/ropeatom.length;
			for (let atom of ropeatom) {atom.mass=mass;}
			hook.mass=totalmass*coefs[2];
			this.throwing=throwing;
		}
		this.charge=charge;
		if (throwing===1) {
			// Charging.
			let rad=0.3+charge*0.8;
			let ang=performance.now()*0.001*25.0;
			let len=ropeatom.length;
			for (let i=0;i<len;i++) {
				let u=1-i/(len-1);
				let r=u*rad,a=ang-1.5*u*charge;
				let atom=ropeatom[i];
				let pos=new Vector([Math.cos(a)*r,Math.sin(a)*r]);
				pos.iadd(playerpos).isub(atom.pos);
				atom.vel.iadd(pos);
				atom.pos.iadd(pos);
			}
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
		let h0=this.ropeatom[0].pos.sub(camera).mul(scale);
		let h1=this.ropeatom[1].pos.sub(camera).mul(scale);
		let angle=Math.atan2(h0[1]-h1[1],h0[0]-h1[0]);
		let trans=new Draw.Transform({x:h0[0],y:h0[1],angle:angle,scale:0.04});
		draw.setcolor(100,100,100,255);
		draw.fillpoly(this.hookpoly,trans);
		// Draw the HUD.
		draw.setcolor(255,255,255,255);
		draw.filloval(mouse[0],mouse[1],6,6);
		draw.filltext(5,5,"Click to throw",20);
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
