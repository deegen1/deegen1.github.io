/*------------------------------------------------------------------------------


rappel.js - v3.00

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Player size = 2 units = 32 pixels

The hook should be tuned to allow pulling horizontally and slip when player is
at terminal velocity.

Limit player to 50 atoms and 300 bonds.

Sounds played too often sound like nails on a chalkboard.


--------------------------------------------------------------------------------
History


1.00
     Beta versions with different control schemes (jumping, rolling, etc).
2.00
     Created a physically based grappeling hook.
3.00
     Added particle effects and autumn leaves.
4.00
     Created background music and added sound effects.


--------------------------------------------------------------------------------
TODO


sndacc+=(sndacc<0?-1:1)*vol
if sndacc>sndfire
	play sound
	sndacc=-sndacc
sndacc=sndacc*decay
if sndacc<0 && sndacc>-sndfire*0.1: sndacc=0
snddecay=Math.pow(0.25,dt)


Sound effects
	problems:
		rubbing sounding like nails on a chalkboard
		single vibrating atom drowning the channel
	per atom refactory
	remove type refactory?
	hook charge (for every 10%), play every time turn>PI2
	leaves
	snow

Free climb mode
	Split full version and FC mode
	get rid of background, debugmap, particles
	If falling more than 100 units: fade to black on restart
	On restart: load init area and fade in. Player spawns launching down.
	Leaves in starting area, runes for infinite area.


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


// Material IDs
const FILL=0,WALL=1,NORM=2,BODY=3,ROPE=4,HOOK=5,EDGE=6;
const PART=7,LEAF=8,RUNE=9,RAIN=10,SNOW=11,FIRE=12,CHAR=13;
// const MATS=14;


class Game {

	constructor(bannerid,divid) {
		this.banner=document.getElementById(bannerid);
		this.canvas=document.getElementById(divid);
		this.canvas.style.imageRendering="pixelated";
		this.rnd=new Random();
		this.scale=16;
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
		this.biome=0;
		let playerpos=new Vector([20,27]);
		// Setup world materials.
		let fillmat=world.createatomtype(1.00,Infinity,0.95,1,NaN);
		let wallmat=world.createatomtype(1.00,Infinity,0.95);
		let normmat=world.createatomtype(0.01,1.0,0.98);
		let bodymat=world.createatomtype(0.01,5*.84/( 9*.7854),0.25);
		let ropemat=world.createatomtype(0.50,5*.08/(20*.0804),0.00);
		let hookmat=world.createatomtype(0.01,5*.08/(10*.0804),0.25);
		let edgemat=world.createatomtype(0.01,5*.08/(10*.0804),0.00,1,2950);
		let partmat=world.createatomtype(0.50,1e-9,0.50,1,NaN);
		let leafmat=world.createatomtype(0.75,1e-8,0.00,1,0);
		let runemat=world.createatomtype(0.95,1e-8,0.25,0.2,NaN);
		let rainmat=world.createatomtype(0.25,1e-8,0.00,1,NaN);
		let snowmat=world.createatomtype(0.75,1e-8,0.00,1,50);
		let firemat=world.createatomtype(0.75,1e-8,0.00,0.75,NaN);
		let charmat=world.createatomtype(0.75,1e-8,0.25,0.2,NaN);
		this.typearr=[];
		for (let type of world.typelist.iter()) {
			this.typearr.push(type);
			type.data={
				rgb:null,
				part:false,
				partscale:0,
				partpoly:null,
				partinit:0,
				partfreq:0,
				partrad:0,
				partang:0,
				partlife:0,
				snd:null,
				sndacc:0,
				sndmul:0,
				sndrem:0,
				sndfire:Infinity
			};
		}
		partmat.gravity=new Vector([0,0]);
		runemat.gravity=new Vector([0,0]);
		charmat.gravity=new Vector([0,0]);
		firemat.gravity=new Vector([0,-2]);
		leafmat.intarr[edgemat.id].statictension=25;
		snowmat.intarr[edgemat.id].statictension=50;
		for (let intr of edgemat.intarr) {intr.staticdist=5.625;}
		// Setup the player.
		let ropespace=0.04,hookspace=0.135;
		this.throwing=-1;
		this.charge=0;
		// Create the hook.
		this.hooktime=0;
		this.hookatom=[];
		this.hookbond=[];
		let prev1=null;
		for (let s=0;s<3;s++) {
			let ang=[1.3,-1.3,0][s],len=4;
			let dx=Math.cos(ang)*hookspace,dy=Math.sin(ang)*hookspace;
			prev1=s?this.hookatom[0]:null;
			for (let i=s?1:0;i<len;i++) {
				let pos=new Vector([(len-1)*hookspace-dx*i,dy*i]);
				let supp=(!i || i===len-1)?1:0,disp=supp;
				let mat=i===len-1?edgemat:hookmat;
				let atom=world.createatom(pos.add(playerpos),0.16,mat);
				atom.data.pos=pos;
				atom.data.supp=supp;
				for (let nb of this.hookatom) {
					let bonds=[0,1,10][nb.data.supp+supp];
					for (let b=0;b<bonds;b++) {
						let bond=world.createbond(nb,atom,-1,6000);
						if (disp) {disp=0;bond.data.rgb=[100,100,100,255];}
						bond.data.rest=bond.dist;
						this.hookbond.push(bond);
					}
				}
				this.hookatom.push(atom);
				prev1=atom;
			}
		}
		// Create the hair.
		this.ropemin=50;
		this.ropemax=5000;
		this.ropeatom=[];
		let prev2=prev1;
		for (let i=0;i<20;i++) {
			let atom=world.createatom(playerpos,0.16,ropemat);
			this.ropeatom.push(atom);
			for (let b=0;b<4;b++) {
				let bond=world.createbond(prev1,atom,ropespace,240);
				if (!b) {bond.data.rgb=[255,255,255,255];}
				world.createbond(prev2,atom,ropespace*2,240);
			}
			prev2=prev1;
			prev1=atom;
		}
		// Create the body.
		this.bodyatom=[];
		this.hookang=0;
		this.camcen=new Vector(playerpos);
		this.playerpos=playerpos;
		this.playervel=new Vector(2);
		for (let i=0;i<9;i++) {
			let pos=new Vector([[0,1,-1][i%3]*0.5,[0,1,-1][(i/3)|0]*0.5]);
			let atom=world.createatom(pos.add(playerpos),0.5,bodymat);
			this.bodyatom.push(atom);
			for (let j=0;j<i;j++) {world.createbond(atom,this.bodyatom[j],-1,1000);}
			let bond=world.createbond(prev1,atom,-1,240);
			if (!i) {bond.data.rgb=[255,255,255,255];}
			world.createbond(prev2,this.bodyatom[0],ropespace*2,240);
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
		this.initparticles();
		this.createtext("GRAPUNZELS\n TOWER",[30,55],4);
		this.torcharr=[];
		for (let atom of world.atomiter()) {
			if (Object.is(atom.type,wallmat)) {
				let dist=atom.data._filldist;
				if (dist<0) {atom.type=fillmat;}
			}
		}
		world.collcallback=function() {return state.collcallback(...arguments);};
		world.stepcallback=function(dt) {return state.stepcallback(dt);};
	}


	static atominit(atom) {
		let data=atom.data;
		atom.data.rgb=atom.data.rgb??atom.type.data.rgb;
		atom.data.sndref=0;
	}


	// ----------------------------------------
	// Graphics


	resize() {
		// Properly resize the canvas.
		let scale=this.scale,mindim=480;
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
		let state=this;
		let canvas=this.canvas;
		canvas.width=draww;
		canvas.height=drawh;
		let draw=new Draw(draww,drawh);
		draw.screencanvas(canvas);
		this.draw=draw;
		this.distmap=new Float32Array(draww*drawh);
		// Color types.
		let ta=this.typearr;
		ta[FILL].data.rgb=[[32,32,32,255],[16,16,16,255],[16,16,16,255],[16,16,16,255]][this.biome];
		ta[WALL].data.rgb=[[140,170,140,255],[128,128,128,255],[128,128,128,255],[189,222,239,255]][this.biome];
		ta[NORM].data.rgb=[255,255,255,255];
		ta[BODY].data.rgb=[128,128,255,255];
		ta[EDGE].data.rgb=[100,100,100,255];
		// Init UI.
		let ui=new UI(draw,this.input);
		this.ui=ui;
		ui.addtext(5,45,"Click to throw",20);
		ui.addpoly(UI.VOLUME_POLY,{vec:[21,20],scale:15});
		let slider=ui.addslider(45,5,140,30,this.audio.volume);
		slider.onchange=function(node) {state.audio.setvolume(node.value);};
		this.cursor=new Draw.Poly("M0 0 4 2 2 2 2 4Z");
		// Draw a dark forest.
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
		let rnd=new Random(9);
		let trees=400;
		let xspan=1/23,towery=drawh*0.90;
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
		for (let atom of this.world.atomiter()) {
			Game.atominit(atom);
		}
	}


	drawatom(pos,rad,rgb) {
		// If two atoms overlap, prefer the one that's closer.
		// Overlap is judged by the center of the pixel (.5,.5).
		let draw=this.draw,img=draw.img;
		// Check if it's on the screen.
		let dw=img.width,dh=img.height,scale=this.scale;
		let x=(pos[0]-this.camera[0])*scale;
		let y=(pos[1]-this.camera[1])*scale;
		let dx=(x>1?(x<dw?x:dw):1)-0.5-x;
		let dy=(y>1?(y<dh?y:dh):1)-0.5-y;
		rad=rad*scale+0.5;
		let rad2=rad*rad;
		let alpha=(rgb[3]/255)*128;
		if (dx*dx+dy*dy>=rad2 || alpha<0.5) {return;}
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


	// ----------------------------------------
	// Particles


	initparticles() {
		this.partmax=2048;
		this.partcnt=0;
		this.partarr=new Array(this.partmax);
		for (let i=0;i<this.partmax;i++) {
			this.partarr[i]={
				type:0,
				time:0,
				life:0,
				tow :new Vector(2),
				turn:new Vector(2),
				vel :new Vector(2),
				rgb :[0,0,0,0],
				atom:null,
				poly:null
			};
		}
		let leafpoly=new Draw.Poly(`
			M-.72-.034-.809-.545-.614-.475-.189-1-.125-.857.213-.966.145-.648.306-.579.038
			-.334.064-.288.656-.402.535-.197.918-0 .535.197.656.402.064.288.038.334.306.579
			.145.648.213.966-.125.857-.189 1-.614.475-.809.545-.72.034-.918.052-.918-.052Z
		`);
		let rainpoly=new Draw.Poly("M1 0 0 1-8 0 0-1Z");
		let font=new Draw.Font();
		this.runearr=[];
		for (let i=0;i<26;i++) {
			let poly=font.glyphs[65+i].poly,b=poly.aabb;
			let dx=b.dx/2,dy=b.dy/2,scale=1/(dx>dy?dx:dy);
			let mx=(b.minx+dx)*scale,my=(b.miny+dy)*scale;
			poly=new Draw.Poly(poly,{vec:[-mx,-my],scale:scale});
			this.runearr.push(poly);
		}
		let typearr=this.typearr;
		function addmeta(id,init,freq,rad,scale,ang,life,rgb,poly) {
			let t=typearr[id].data;
			t.part=true;
			t.partinit=init;
			t.partfreq=freq;
			t.partrad=rad;
			t.partscale=scale;
			t.partang=ang;
			t.partlife=life;
			t.partpoly=poly;
			t.rgb=rgb;
		}
		let PI2=Math.PI,PI3=PI2*1.5;
		addmeta(PART,NaN  ,NaN ,0.05,1.25,NaN,0.2,[1,1,1,1]  ,null);
		addmeta(LEAF,0.014,2000,0.3 ,2   ,NaN,40 ,[1,1,1,1]  ,leafpoly);
		addmeta(RUNE,0.070,450 ,0.5 ,0.45,NaN,40 ,[1,1,1,1]  ,null);
		addmeta(RAIN,0.037,100 ,0.1 ,0.75,PI3,10 ,[.5,.5,1,1],rainpoly);
		addmeta(SNOW,0.035,700 ,0.25,1.5 ,NaN,40 ,[1,1,1,1]  ,null);
		addmeta(FIRE,NaN  ,NaN ,0.1 ,1   ,NaN,2  ,[1,1,1,1]  ,null);
		addmeta(CHAR,NaN  ,NaN ,1   ,0.5 ,PI2,10 ,[1,1,1,1]  ,null);
		// Seed the environment particles.
		this.parttime=0;
		let rnd=this.rnd;
		let biome=this.biome+LEAF;
		let ww=this.worldw,wh=this.worldh;
		let points=typearr[biome].data.partinit*ww*wh|0;
		for (let p=0;p<points;p++) {
			this.createparticle(biome,[rnd.getf()*ww,rnd.getf()*wh],{time:2});
		}
	}


	createtext(text,pos,scale) {
		pos=new Vector(pos);
		let off=new Vector(2);
		for (let i=0;i<text.length;i++) {
			let c=text.charCodeAt(i);
			if (c>64 && c<91) {this.createparticle(CHAR-65+c,pos.add(off),{rad:scale});}
			else if (c===10) {off[0]=0;off[1]+=scale*1.5;}
			off[0]+=scale;
		}
	}


	createparticle(type,pos,opt={}) {
		// opt: ang, time, rad, rgb, rand, vel
		if (this.partcnt>=this.partmax) {return null;}
		let part=this.partarr[this.partcnt++];
		if (type>=CHAR) {part.poly=this.runearr[type-CHAR];type=CHAR;}
		let mat=this.typearr[type],meta=mat.data;
		if (type<CHAR) {part.poly=meta.partpoly;}
		let atom=this.world.createatom(pos,opt.rad??meta.partrad,mat);
		Game.atominit(atom);
		atom.vel.set(opt.vel??0);
		if (opt.rand) {atom.vel.iadd(Vector.random(2).imul(opt.rand));}
		part.type=type;
		part.atom=atom;
		let ang=opt.ang??meta.partang;
		ang=isNaN(ang)?this.rnd.getf()*Math.PI*2:ang;
		part.tow.set([Math.cos(ang),Math.sin(ang)]).imul(atom.rad*2).iadd(pos);
		part.turn.set([-1,0]);
		part.vel.set(atom.vel);
		part.life=meta.partlife*(type<CHAR?this.rnd.getf()*0.5+1:1);
		part.time=opt.time??0;
		let rgb=opt.rgb??meta.rgb;
		part.rgb=rgb.slice();
		if (type===LEAF) {
			let u=this.rnd.getf();
			part.turn.randomize();
			part.rgb=[.502+.329*u,.275+.411*u,.106+.110*u,1];
		}
		return part;
	}


	updateparticles(dt) {
		let partcnt=this.partcnt;
		let partarr=this.partarr;
		let scale=this.scale,camera=this.camera;
		let trans=new Transform(2),vec=trans.vec,mat=trans.mat;
		let draw=this.draw;
		let tmp=[0,0,0,0];
		let rnd=this.rnd;
		let biome=this.biome+LEAF;
		let fireshade=biome<RAIN?[1.5,1.5,0.5,1]:[1,2,4,1];
		let runearr=this.runearr,runes=runearr.length-0.01;
		let typearr=this.typearr;
		function wheel(x) {x=x<0?-x:x;return (x>0.5?1-x:x)*2;}
		for (let i=partcnt-1;i>=0;i--) {
			let part=partarr[i];
			let atom=part.atom;
			let time=part.time+dt,life=part.life;
			if (!(time>=0 && time<life)) {
				partarr[i]=partarr[--partcnt];
				partarr[partcnt]=part;
				atom.release();
				continue;
			}
			part.time=time;
			let type=part.type;
			let meta=typearr[type].data;
			let rgb=part.rgb;
			let vel=atom.vel,pos=atom.pos,rad=atom.rad;
			let poly=part.poly;
			// Tow an imaginary particle behind the atom to determine orientation.
			let tow=part.tow.isub(pos).normalize(),turn=part.turn;
			let cs=tow[0],sn=tow[1],tx=turn[0],ty=turn[1];
			cs=tx*cs-ty*sn;
			sn=tx*sn+ty*tow[0];
			tow.imul(rad*2).iadd(pos);
			if (type===RUNE) {
				// Make rune glyph and color dependent on angle.
				let ang=Math.atan2(sn,cs)/(Math.PI*2)+0.5;
				rgb[0]=wheel(ang);
				rgb[1]=wheel(ang-1/3);
				rgb[2]=wheel(ang-2/3);
				rgb[3]+=rnd.getnorm()*dt*2.5;
				vel[0]+=rnd.getnorm()*dt*2;
				vel[1]+=rnd.getnorm()*dt*2;
				poly=runearr[ang*runes|0];
			} else if (type===RAIN || type===SNOW) {
				// Destroy rain or snow if they're hit hard.
				let thres=(type===RAIN?105:700)*dt;
				if (vel.dist2(part.vel)>thres*thres) {
					part.time=part.life;
					this.partcnt=partcnt;
					for (let j=0;j<8;j++) {
						this.createparticle(PART,pos,{vel:vel,rand:2,rgb:rgb,rad:rad*0.5});
					}
					partcnt=this.partcnt;
					continue;
				}
			} else if (type===FIRE) {
				let u=time/life;
				for (let j=0;j<4;j++) {rgb[j]=1-fireshade[j]*u;}
				atom.rad=rad=0.1*(1+2*u);
			} else if (type>=CHAR) {
				if (vel.dist2(part.vel)>dt*dt && time<9) {time=9;}
				part.time=time>=9?time:2;
			}
			part.vel.set(vel);
			// Fade in or out.
			for (let j=0;j<4;j++) {tmp[j]=Math.min(Math.max(rgb[j]*256|0,0),255);}
			let half=time>life-time?life-time:time;
			let fade=(life>2 || time>half)?Math.max(life*0.05,0.1):0;
			tmp[3]*=half<fade?half/fade:1;
			rad*=meta.partscale;
			if (poly===null) {
				this.drawatom(pos,rad,tmp);
			} else {
				rad*=scale;
				cs*=rad;sn*=rad;
				vec[0]=(pos[0]-camera[0])*scale;
				vec[1]=(pos[1]-camera[1])*scale;
				mat[0]=cs;mat[1]=-sn;
				mat[2]=sn;mat[3]=cs;
				draw.setcolor(tmp);
				draw.fillpoly(poly,trans);
			}
		}
		this.partcnt=partcnt;
		// Environmental particles.
		let ww=this.worldw,wh=this.worldh;
		let time=this.parttime+dt;
		let freq=typearr[biome].data.partfreq/(ww*wh);
		while (time>=freq) {
			time-=freq;
			let x=rnd.getf()*ww,y=biome!==RAIN?rnd.getf()*wh:0;
			this.createparticle(biome,[x,y]);
		}
		this.parttime=time;
	}


	// ----------------------------------------
	// Audio


	initaudio() {
		let audio=new Audio(0,0,false);
		this.audio=audio;
		this.snddist2=30*30;
		// Create a dark, ambient background song.
		let bgsnd=new Audio.Sound();
		let maxtime=180;
		let rnd=new Random(7);
		for (let side=0;side<2;side++) {
			let bpm=60/(side?480:240);
			let vol=[1,0.08][side]*0.1;
			let beatmeta=[[2,1,1],[1,2,1],[1,1,2]];
			if (side) {beatmeta.push([],[3,1],[1,3]);}
			let notearr=[110,98,87.31];
			let beatarr=[beatmeta[0],beatmeta[0],beatmeta[0],beatmeta[0]];
			let notes=notearr.length;
			let beats=beatarr.length;
			let sndmap=[];
			for (let i=0;i<notes;i++) {
				sndmap[i]=[];
				for (let l of [1,2,3]) {
					let snd,len=l*bpm,freq=notearr[i],pos=rnd.getf()*.02-.01;
					if (!side) {snd=Audio.createguitar(1,freq,0.2+pos,len*2);}
					else {snd=Audio.createglockenspiel(1,freq*4,0.25+pos,len*20);}
					sndmap[i][l]=snd;
				}
				notearr[i]=i;
			}
			let time=0;
			while (time<maxtime) {
				if (rnd.modu32(2)) {
					// Swap note.
					let a=rnd.modu32(notes);
					let b=(rnd.modu32(notes-1)+1+a)%notes;
					let tmp=notearr[a];
					notearr[a]=notearr[b];
					notearr[b]=tmp;
				} else {
					// Replace beat.
					let i=rnd.modu32(beats);
					beatarr[i]=beatmeta[rnd.modu32(beatmeta.length)];
				}
				for (let n of notearr) {
					for (let beat of beatarr) {
						let t=time;
						for (let b of beat) {
							let taper=(maxtime-t)/6;
							bgsnd.add(sndmap[n][b],t,vol*(taper<1?taper:1));
							t+=b*bpm;
						}
						time+=4*bpm;
					}
				}
			}
		}
		this.bgsnd=bgsnd.resizetime(maxtime);
		this.bgsndinst=null;
		// Create sound effects.
		function ezsnd(hpf,lpf,scale,time) {
			let sig="noi",sfx=`#noi: NOISE H ${scale}\n`;
			if (hpf>20) {sfx+=`#hpf: HPF F ${hpf.toFixed(3)} I #${sig}\n`;sig="hpf";}
			if (lpf>20) {sfx+=`#lpf: LPF F ${lpf.toFixed(3)} I #${sig}\n`;sig="lpf";}
			sfx+=`#out: ENV A 0.01 S 0 R ${(time-0.01).toFixed(3)} I #${sig}`;
			return (new Audio.SFX(sfx)).tosound();
		}
		let rainsnd=(new Audio.SFX(`
			#noi: NOISE
			#bp1: BPF F 150 B 2 I #noi
			#lp1: LPF F 500 I #bp1
			#saw: SAW F #lp1 80 * 40 +
			#cs1: SIN F #saw 0.25 -
			#mer: #lp1 #lp1 * 10 * #cs1 *
			#bp2: BPF F 500 I #mer 0.2 < -0.2 >
			#out: ENV A 0 S 0 R 2 I #bp2 10 *
		`)).tosound();
		let leafsnd=(new Audio.SFX(`
			#sig: NOISE
			#clk: SAW F #sig 8131 *
			#fil: HPF F 3000 I #clk
			#out: ENV A 0.01 S 0 R 0.19 I #fil -1 > 1 < 0.5 *
		`)).tosound();
		let hooksnd=(new Audio.SFX(`
			#sig: NOISE
			#clk: SAW F #sig 1131 *
			#fil: BPF F 3000 B 2 I #clk #del - -1.6 > 1.6 <
			#del: DEL T 0.001 I #fil
			#out: ENV A 0.01 S 0 R 0.19 I #fil 0.05 *
		`)).tosound();
		let runesnd=Audio.createglockenspiel(1,400,0.25,5);
		let sndarr=[
			[NORM,ezsnd(200,400,5,0.2),0.01,1],
			[BODY,ezsnd(100,200,5,0.2),0.01,1],
			[EDGE,hooksnd,0.125,2],
			[LEAF,leafsnd,0.01,1],
			[RUNE,runesnd,0.001,1],
			[RAIN,rainsnd,0.01,0.1]
		];
		for (let snd of sndarr) {
			let data=this.typearr[snd[0]].data;
			data.snd=snd[1];
			data.sndmul=snd[2];
			data.sndfire=snd[3];
		}
	}


	// ----------------------------------------
	// Player


	collcallback(intr,a,b,norm,veldif,posdif,bond) {
		let aid=a.type.id,bid=b.type.id;
		if (aid<=WALL && bid<=WALL) {
			return false;
		} else if (aid>=PART || bid>=PART) {
			if ((aid>=CHAR || bid>=CHAR) && aid!==BODY && bid!==BODY) {return false;}
		} else if ((aid>=ROPE && aid<=EDGE) || (bid>=ROPE && bid<=EDGE)) {
			if (aid>=BODY && aid<=EDGE && bid>=BODY && bid<=EDGE) {return false;}
			if (this.throwing<2) {return false;}
			// Allow the hook to form bonds by flipping the tension sign.
			if (aid===EDGE || bid===EDGE) {
				let tension=intr.statictension;
				intr.statictension=(tension>0)===(this.throwing===3)?tension:-tension;
			}
		}
		let vel=veldif*intr.vmul+posdif*intr.vpmul;
		if (vel>2.0) {
			let over=posdif*0.5;
			let cen=a.pos.add(norm.mul(a.rad-over));
			// Add to each material's sound effect buffer.
			let dist=1-cen.dist2(this.playerpos)/this.snddist2;
			if (dist>0) {
				let vol=vel*dist;
				let u=a.mass/(a.mass+b.mass);
				u=u<1?u:1;
				a.data.sndacc+=(a.data.sndacc>=0?1:-1)*vol*(1-u);
				b.data.sndacc+=(b.data.sndacc>=0?1:-1)*vol*u;
				//a.type.data.sndacc+=vol*(1-u);
				//b.type.data.sndacc+=vol*u;
			}
			// Create a particle between the 2 atoms.
			if (bond===null && aid<PART && bid<PART) {
				let dir=Vector.random(2);
				cen.iadd(dir.mul(over*this.rnd.getf()));
				dir.imul(vel).iadd(a.vel.add(b.vel).imul(0.5));
				this.createparticle(PART,cen,dir);
			}
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
			}
		}
		// If we've thrown for long enough, begin pulling.
		if (this.throwing===3 && this.hooktime<3) {
			let hooktime=this.hooktime+dt;
			this.hooktime=hooktime;
			let distmul=hooktime*4;
			distmul=(distmul<1?distmul:1)*4+1;
			for (let bond of this.hookbond) {
				bond.dist=bond.data.rest*distmul;
			}
			let u=hooktime/3;
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
		let input=this.input;
		let mouse=this.mouse.mul(1/this.scale).iadd(this.camera);
		let throwing=this.throwing;
		let charge=this.charge;
		let key=input.MOUSE.LEFT;
		let click=input.getkeychange(key);
		input.keyclear(key);
		// Throw if we can, or release.
		if (throwing<=0) {throwing=click>0?1:0;}
		if (throwing===1) {charge+=dt;}
		charge=charge<1?charge:1;
		if (click<0) {throwing=throwing===1?2:0;}
		let hookatom=this.hookatom;
		if (this.throwing!==throwing && throwing<3) {
			for (let bond of this.hookbond) {
				bond.dist=bond.data.rest;
			}
			// Throw the hook according to the player's velocity.
			// Delete any temporary bonds on the hook.
			let look=mouse.sub(playerpos).normalize();
			let trans=new Transform({vec:playerpos});
			trans.mat.set([look[0],-look[1],look[1],look[0]]);
			look.imul(throwing===2?35*charge:0);
			let force=look.add(playervel);
			for (let atom of hookatom) {
				atom.pos.set(trans.apply(atom.data.pos));
				atom.vel.set(force);
				for (let bond of atom.bondlist.iter()) {
					if (!(bond.breakdist===Infinity)) {bond.release();}
				}
			}
			// Reset rope position. Delete any temporary bonds on the rope.
			let tension=throwing<2?this.ropemax:this.ropemin;
			look.imul(-1/ropeatom.length);
			for (let atom of ropeatom) {
				atom.pos.set(playerpos);
				atom.vel.set(force);
				force.iadd(look);
				for (let bond of atom.bondlist.iter()) {
					if (!(bond.breakdist===Infinity)) {bond.release();}
					else {bond.tension=tension;}
				}
			}
			charge=throwing>0?charge:0;
			this.hooktime=0;
		}
		this.throwing=throwing;
		this.charge=charge;
		if (throwing===1) {
			// Show swinging animation while charging.
			let rad=0.3+charge*0.8;
			let ang=(this.hookang+dt*25.0)%(Math.PI*2);
			this.hookang=ang;
			let len=ropeatom.length;
			for (let i=0;i<len;i++) {
				let u=1-i/(len-1),r=u*rad,a=ang-1.5*u*charge;
				let dif=playerpos.add([Math.cos(a)*r,Math.sin(a)*r]);
				let atom=ropeatom[i];
				dif.isub(atom.pos);
				atom.vel.iadd(dif);
				atom.pos.iadd(dif);
			}
			let prev=ropeatom[0];
			let trans=new Transform({vec:prev.pos,ang:ang-Math.PI*0.75});
			for (let atom of hookatom) {
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
		if (this.bgsndinst===null || this.bgsndinst.done) {
			this.bgsndinst=this.bgsnd.play();
		}
		if (!IsVisible(this.canvas)) {return true;}
		let starttime=performance.now();
		let input=this.input;
		let rnd=this.rnd;
		input.update();
		let draw=this.draw;
		let draww=draw.img.width;
		let drawh=draw.img.height;
		let scale=this.scale;
		let mouse=new Vector(input.getmousepos());
		this.mouse=mouse;
		this.ui.update();
		let world=this.world;
		draw.img.data32.set(this.background.data32);
		world.update(dt);
		this.updateplayer(dt);
		// Update torches.
		let firetime=16*dt;
		for (let torch of this.torcharr) {
			if (rnd.getf()<firetime) {
				this.createparticle(FIRE,torch,{rand:0.25});
			}
		}
		// Center the camera on the player. Use a leash distance to prevent the camera
		// from jittering if the player is rocking.
		let camcen=this.camcen;
		let leash=0.5/camcen.dist(this.playerpos);
		leash=leash<1?leash:1;
		let camera=this.camera;
		let drawmax=[draww,drawh];
		let worldmax=[this.worldw,this.worldh];
		for (let i=0;i<2;i++) {
			let pos=camcen[i]*leash+this.playerpos[i]*(1-leash);
			camcen[i]=pos;
			let ds=drawmax[i]/scale;
			pos-=ds*0.5;
			let max=worldmax[i]-ds;
			pos=pos<max?pos:max;
			camera[i]=pos>0?pos:0;
		}
		// Draw the atoms.
		this.distmap.fill(Infinity);
		let decay=Math.pow(0.25,dt);
		for (let atom of world.atomiter()) {
			let data=atom.data;
			let type=atom.type.data;
			let sndacc=data.sndacc;
			if (sndacc>=type.sndfire) {
				type.sndacc+=sndacc;
console.log(sndacc);
				sndacc=-type.sndfire;
			}
			sndacc*=decay;
			data.sndacc=(sndacc>0 || sndacc<=-type.sndfire*0.1)?sndacc:0;
			// draw
			let rgb=data.rgb;
			if (rgb!==null && !type.part) {
				this.drawatom(atom.pos,atom.rad,rgb);
			}
		}
		this.updateparticles(dt);
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
		// Play audio.
		/*for (let type of this.typearr) {
			let data=type.data;
			let vol=data.sndacc*data.sndmul;
			vol=vol<1?vol:1;
			let rem=data.sndrem,tmp=rem-vol;
			vol=vol<rem?vol:rem;
			let snd=data.snd;
			if (snd!==null && vol>0.001) {this.audio.play(snd,vol);}
			data.sndacc=0;
			rem=tmp+dt*2;
			rem=rem>-1?rem:-1;
			rem=rem<10?rem:10;
			data.sndrem=rem;
		}*/
		for (let type of this.typearr) {
			let data=type.data;
			let vol=data.sndacc*data.sndmul;
			vol=vol<1?vol:1;
			let snd=data.snd;
			if (snd!==null && vol>0.001) {this.audio.play(snd,vol);}
			data.sndacc=0;
		}
		// Draw the HUD.
		this.ui.render();
		draw.setcolor(255,255,255,255);
		draw.fillpoly(this.cursor,{vec:mouse.add(-1.5,-1.5),scale:5});
		draw.setcolor(128,128,255,255);
		draw.fillpoly(this.cursor,{vec:mouse,scale:4});
		draw.setcolor(255,255,255,255);
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
