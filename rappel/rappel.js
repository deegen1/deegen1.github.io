/*------------------------------------------------------------------------------


rappel.js - v5.00

Copyright 2025 Alec Dee
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
5.00
     Created tower demo with timer.
     Added biome regions.


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint rappel.js -c ../../standards/eslint.js */


import * as Lib from "./library.js";
import {Random,Vector,Transform,Input,Draw,Audio,UI,Phy} from "./library.js";


// Material IDs
const FILL=0,WALL=1,NORM=2,BODY=3,ROPE=4,HOOK=5,EDGE=6;
const PART=7,LEAF=8,RUNE=9,RAIN=10,CHAR=11;


export class Game {

	constructor(bannerid,divid) {
		this.banner=document.getElementById(bannerid);
		this.canvas=document.getElementById(divid);
		this.canvas.style.imageRendering="pixelated";
		this.input=new Input(this.canvas);
		this.input.disablenav();
		this.mouse=new Vector(2);
		this.rnd=new Random();
		this.scale=16;
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.framemax=1/60;
		this.frameprev=0;
		this.climb=0;
		this.initworld();
		this.initaudio();
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
		this.world=new Phy.World(2);
		let world=this.world;
		world.data.game=this;
		world.maxsteptime=1/180;
		world.gravity.set([0,6.66]);
		let toph=15,both=20,climb=200;
		let miny=-toph-climb,maxy=both;
		let minx=0,maxx=100;
		this.worldmin=new Vector([minx,miny]);
		this.worldmax=new Vector([maxx,maxy]);
		this.worlddif=this.worldmax.sub(this.worldmin);
		let playerpos=new Vector([maxx*0.5,10]);
		// Setup world materials.
		let fillmat=world.createatomtype(1.00,Infinity,0.95,1,NaN);
		let wallmat=world.createatomtype(1.00,Infinity,0.95);
		let normmat=world.createatomtype(0.01,1.0,0.98);
		let bodymat=world.createatomtype(0.01,5*.84/( 9*.7854),0.25);
		let ropemat=world.createatomtype(0.50,5*.08/(20*.0804),0.00);
		let hookmat=world.createatomtype(0.01,5*.08/(10*.0804),0.25);
		let edgemat=world.createatomtype(0.01,5*.08/(10*.0804),0.00,1,9950);
		let partmat=world.createatomtype(0.50,1e-9,0.50,1,NaN);
		let leafmat=world.createatomtype(0.75,1e-8,0.00,1,0);
		let runemat=world.createatomtype(0.95,1e-8,0.25,0.2,NaN);
		let rainmat=world.createatomtype(0.25,1e-8,0.00,1,NaN);
		let charmat=world.createatomtype(0.75,1e-8,0.25,0.2,NaN);
		this.typearr=[];
		for (let type of world.typelist.iter()) {
			this.typearr.push(type);
			type.data={
				rgb:null,
				partscale:1,
				partpoly:null,
				partinit:0,
				partfreq:0,
				partrad:0,
				partang:0,
				partlife:0,
				snd:null,
				sndacc:0,
				sndmin:Infinity,
				sndmax:0
			};
		}
		partmat.gravity=new Vector([0,0]);
		runemat.gravity=new Vector([0,0]);
		charmat.gravity=new Vector([0,0]);
		leafmat.intarr[edgemat.id].statictension=25;
		for (let intr of edgemat.intarr) {intr.staticdist=5.625;}
		world.collcallback=function() {return state.collcallback(...arguments);};
		world.stepcallback=function(dt) {return state.stepcallback(dt);};
		this.initparticles();
		// Setup the player.
		let ropespace=0.04,hookspace=0.135;
		this.throwing=-1;
		this.charge=0;
		this.chargerate=1;
		this.hookang=0;
		this.camera=new Vector(2);
		this.camcen=new Vector(playerpos);
		this.playerpos=playerpos;
		this.playervel=new Vector(2);
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
				let adat=Game.atominit(atom);
				adat.turn.set(pos);
				adat.time=supp;
				for (let nb of this.hookatom) {
					let bonds=[0,1,10][nb.data.time+supp];
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
		// Create the walls
		let rad=0.27,space=0.26,over=0;
		for (let x=minx;x<maxx;x+=space) {
			world.createatom([x,miny-over],rad,wallmat);
			world.createatom([x,maxy+over],rad,wallmat);
		}
		for (let y=miny;y<maxy;y+=space) {
			world.createatom([minx-over,y],rad,wallmat);
			world.createatom([maxx+over,y],rad,wallmat);
		}
		rad=4;space=1;over=3.9;
		for (let x=minx;x<maxx;x+=space) {
			world.createatom([x,miny-over],rad,fillmat);
			world.createatom([x,maxy+over],rad,fillmat);
		}
		for (let y=miny;y<maxy;y+=space) {
			world.createatom([minx-over,y],rad,fillmat);
			world.createatom([maxx+over,y],rad,fillmat);
		}
		// Create top and bottom barriers.
		let bart=3,barw=maxx/5;
		for (let i=0;i<3;i++) {
			let x=i*barw*2;
			world.createshape(2,wallmat,0.27,0.26,
				[[0,0],[barw,0],[barw,bart],[0,bart]],
				[[0,1],[1,2],[2,3],[3,0]],
				{vec:[x,-bart]}
			);
			world.createshape(2,wallmat,0.27,0.26,
				[[0,0],[barw,0],[barw,bart],[0,bart]],
				[[0,1],[1,2],[2,3],[3,0]],
				{vec:[x,miny+toph]}
			);
		}
		for (let i=1;i<3;i++) {
			world.createshape(2,wallmat,0.27,0.26,
				[[-3,-3],[3,-3],[3,3],[-3,3]],
				[[0,1],[1,2],[2,3],[3,0]],
				{vec:[maxx*i/3,both/2],ang:Math.PI/4}
			);
		}
		for (let atom of world.atomiter()) {
			let dist=atom.data._filldist;
			Game.atominit(atom);
			if (Object.is(atom.type,wallmat)) {
				if (dist<0) {atom.type=fillmat;}
			}
		}
		// Create holds
		let holdgap=20;
		let levels=Math.round(climb/holdgap)|1;
		holdgap=climb/levels;
		for (let l=0;l<levels;l++) {
			let y=maxy-both-l*holdgap;
			let span=2+(l&1);
			let gapx=(maxx-minx)/2;
			for (let s=0;s<span;s++) {
				let x=(s+(l&1?0:0.5))*gapx+minx;
				this.createhold([x,y]);
			}
		}
		this.createtext("CLICK TO THROW",[maxx*0.5-6.5*2,4],1);
		this.createbiome(LEAF,[minx,0],[maxx,both]);
		this.createbiome(RAIN,[minx,-climb+bart],[maxx,climb-bart*2]);
		// Game state
		this.climbtime=0;
		this.climbstop=-climb;
		this.climb=0;
	}


	static atominit(atom) {
		let data=atom.data;
		if (data.accel!==undefined) {return data;}
		data.rgb=null;
		data.accel=0;
		data.sndready=true;
		data.time=0;
		data.life=0;
		data.tow=new Vector(2);
		data.turn=new Vector(2);
		data.poly=null;
		delete data._filldist;
		return data;
	}


	collcallback(intr,a,b,norm,veldif,posdif,bond) {
		let aid=a.type.id,bid=b.type.id;
		if (aid<=WALL && bid<=WALL) {
			return false;
		} else if (aid>=PART || bid>=PART) {
			if ((aid>=CHAR && (bid<BODY || bid>EDGE))
			||  (bid>=CHAR && (aid<BODY || aid>EDGE))) {return false;}
		} else if ((aid>=ROPE && aid<=EDGE) || (bid>=ROPE && bid<=EDGE)) {
			if (aid>=BODY && aid<=EDGE && bid>=BODY && bid<=EDGE) {return false;}
			if (this.throwing<2) {return false;}
			// Allow the hook to form bonds by flipping the tension sign.
			if (aid===EDGE || bid===EDGE) {
				let tension=intr.statictension;
				intr.statictension=(tension>0)===(this.throwing===3)?tension:-tension;
			}
		}
		// Track each atom's acceleration.
		let vel=veldif*intr.vmul+posdif*intr.vpmul;
		let u=a.mass/(a.mass+b.mass);
		u=u<1?u:1;
		a.data.accel+=vel*(1-u);
		b.data.accel+=vel*u;
		// Create a particle between the 2 atoms.
		if (vel>2.0 && bond===null && aid<PART && bid<PART) {
			let over=posdif*0.5;
			let cen=a.pos.add(norm.mul(a.rad-over));
			let dir=Vector.random(2);
			cen.iadd(dir.mul(over*this.rnd.getf()));
			dir.imul(vel).iadd(a.vel.add(b.vel).imul(0.5));
			this.createparticle(PART,cen,dir);
		}
		return true;
	}


	createhold(pos) {
		// Create a climbing hold.
		let minrad=6,maxrad=10;
		let rnd=this.rnd;
		let points=3+rnd.mod(5);
		let arr=new Array(points);
		let swing=Math.PI*2/points;
		for (let i=0;i<points;i++) {
			let ang=swing*(i+rnd.getf());
			let rad=rnd.getf()*(maxrad-minrad)+minrad;
			let x=Math.cos(ang)*rad;
			let y=Math.sin(ang)*rad;
			arr[i]=new Vector([x,y]);
		}
		// Create and fill the atoms.
		let ta=this.typearr;
		let wallmat=ta[WALL],fillmat=ta[FILL];
		let facearr=new Array(points);
		for (let i=0;i<points;i++) {facearr[i]=[i,(i+1)%points];}
		let atomarr=this.world.createshape(2,wallmat,0.24,0.24,arr,facearr,{vec:pos});
		for (let atom of atomarr) {
			if (atom.data._filldist<0) {atom.type=fillmat;}
			Game.atominit(atom);
		}
	}


	// ----------------------------------------
	// Graphics


	resize() {
		// Properly resize the canvas.
		let scale=this.scale,mindim=480;
		let banner=this.banner.clientHeight;
		let maxw=Math.min(this.worlddif[0]*scale,0x3fffffff)|0;
		let maxh=Math.min(this.worlddif[1]*scale,0x3fffffff)|0;
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
		ta[FILL].data.rgb=[32,32,32,255];
		ta[WALL].data.rgb=[140,170,140,255];
		ta[NORM].data.rgb=[255,255,255,255];
		ta[BODY].data.rgb=[128,128,255,255];
		ta[EDGE].data.rgb=[100,100,100,255];
		// Init UI.
		let ui=new UI(draw,this.input);
		this.ui=ui;
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


	drawatom(x,y,rad,rgb) {
		// If two atoms overlap, prefer the one that's closer.
		// Overlap is judged by the center of the pixel (.5,.5).
		let draw=this.draw,img=draw.img;
		// Check if it's on the screen.
		let dw=img.width,dh=img.height;
		let dx=(x>1?(x<dw?x:dw):1)-0.5-x;
		let dy=(y>1?(y<dh?y:dh):1)-0.5-y;
		rad=rad+0.5;
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
		let leafpoly=new Draw.Poly(`
			M-.72-.034-.809-.545-.614-.475-.189-1-.125-.857.213-.966.145-.648.306-.579.038
			-.334.064-.288.656-.402.535-.197.918-0 .535.197.656.402.064.288.038.334.306.579
			.145.648.213.966-.125.857-.189 1-.614.475-.809.545-.72.034-.918.052-.918-.052Z
		`);
		let rainpoly=new Draw.Poly("M1 0 0 1-8 0 0-1Z");
		let font=new Draw.Font();
		this.runearr=new Array(128);
		for (let i=0;i<128;i++) {
			let glyph=font.glyphs[i],poly=null;
			if (glyph && i>32) {
				poly=glyph.poly;
				let b=poly.aabb,dx=b.dx/2,dy=b.dy/2,scale=1/(dx>dy?dx:dy);
				let mx=(b.minx+dx)*scale,my=(b.miny+dy)*scale;
				poly=new Draw.Poly(poly,{vec:[-mx,-my],scale:scale});
			}
			this.runearr[i]=poly;
		}
		this.runearr.push(null);
		let typearr=this.typearr;
		function addmeta(id,init,freq,rad,scale,ang,life,rgb,poly) {
			let t=typearr[id].data;
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
		addmeta(PART,NaN  ,NaN ,0.05,1.25,NaN,0.2,[255,255,255,255],null);
		addmeta(LEAF,0.050,1000,0.3 ,2   ,NaN,40 ,[255,255,255,255],leafpoly);
		addmeta(RUNE,0.070,450 ,0.5 ,0.45,NaN,40 ,[255,255,255,255],null);
		addmeta(RAIN,0.037,200 ,0.1 ,0.75,PI3,20 ,[128,128,255,255],rainpoly);
		addmeta(CHAR,NaN  ,NaN ,1   ,1   ,PI2,10 ,[255,255,255,255],null);
		this.biomearr=[];
	}


	createbiome(type,pos,dim) {
		let tdat=this.typearr[type].data;
		let [bx,by]=pos,[bw,bh]=dim;
		let freq=tdat.partfreq/(bw*bh);
		let biome={type:type,time:0,freq:freq,pos:new Vector(pos),dim:new Vector(dim)};
		this.biomearr.push(biome);
		// Seed the biome particles.
		let rnd=this.rnd;
		let points=tdat.partinit*bw*bh|0;
		for (let p=0;p<points;p++) {
			this.createparticle(type,[rnd.getf()*bw+bx,rnd.getf()*bh+by],{time:2});
		}
		return biome;
	}


	createtext(text,pos,scale) {
		pos=new Vector(pos);
		let off=new Vector(2);
		for (let i=0;i<text.length;i++) {
			let c=text.charCodeAt(i);
			if (c>32 && c<128) {this.createparticle(CHAR+c,pos.add(off),{rad:scale});}
			else if (c===10) {off[0]=0;off[1]+=scale*2.5;}
			off[0]+=scale*2;
		}
	}


	createparticle(id,pos,opt={}) {
		// opt: ang, time, rad, rgb, rand, vel
		let type=this.typearr[id<CHAR?id:CHAR],tdat=type.data;
		let atom=this.world.createatom(pos,opt.rad??tdat.partrad,type);
		Game.atominit(atom);
		let adat=atom.data;
		adat.poly=id<CHAR?tdat.partpoly:this.runearr[id-CHAR];
		atom.vel.set(opt.vel??0);
		if (opt.rand) {atom.vel.iadd(Vector.random(2).imul(opt.rand));}
		let ang=opt.ang??tdat.partang;
		ang=isNaN(ang)?this.rnd.getf()*Math.PI*2:ang;
		adat.tow.set([Math.cos(ang),Math.sin(ang)]).imul(atom.rad*2).iadd(pos);
		adat.turn.set([-1,0]);
		adat.life=tdat.partlife*(id<CHAR?this.rnd.getf()*0.5+1:1);
		adat.time=opt.time??0;
		let rgb=opt.rgb??tdat.rgb;
		adat.rgb=rgb.slice();
		if (id===LEAF) {
			let u=this.rnd.getf();
			adat.turn.randomize();
			adat.rgb=[128+84*u,70+105*u,27+28*u,255];
		} else if (id===RAIN) {
			atom.vel.iadd(this.world.gravity.mul(3));
		}
		return atom;
	}


	updateparticles(dt) {
		// Environmental particles.
		let rnd=this.rnd;
		for (let biome of this.biomearr) {
			let [bx,by]=biome.pos,[bw,bh]=biome.dim;
			let time=biome.time+dt,freq=biome.freq;
			while (time>=freq) {
				time-=freq;
				let x=rnd.getf()*bw+bx,y=rnd.getf()*bh+by;
				this.createparticle(biome.type,[x,y]);
			}
			biome.time=time;
		}
	}


	// ----------------------------------------
	// Audio


	initaudio() {
		let audio=new Audio(0,0,false);
		this.audio=audio;
		this.snddist=30;
		// Create a dark, ambient background song.
		let bgsnd=new Audio.Sound();
		let maxtime=180;
		let rnd=new Random(7);
		for (let side=0;side<2;side++) {
			let bpm=60/(side?480:240);
			let vol=[1,0.08][side]*0.3;
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
				if (rnd.mod(2)) {
					// Swap note.
					let a=rnd.mod(notes);
					let b=(rnd.mod(notes-1)+1+a)%notes;
					let tmp=notearr[a];
					notearr[a]=notearr[b];
					notearr[b]=tmp;
				} else {
					// Replace beat.
					let i=rnd.mod(beats);
					beatarr[i]=beatmeta[rnd.mod(beatmeta.length)];
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
		this.spinsnd=(new Audio.SFX(`
			#spin: ENV A ${1/this.chargerate} S 100
			#freq: #spin 3 * 1 +
			#osc : SIN F #freq P 0.5 H 1 L 0
			#comb: 1 2 #osc * 2 ^ 1 + /
			#noi : NOISE H 0.5
			#bpf : BPF F #spin 400 * 200 + B 0.4 I #noi #comb *
			#out : ENV A 0.001 S 9.799 R 0.1 I #bpf
		`)).tosound();
		this.spininst=null;
		let rainsnd=(new Audio.SFX(`
			#noi: NOISE
			#bp1: BPF F 150 B 2 I #noi
			#lp1: LPF F 500 I #bp1
			#saw: SAW F #lp1 80 * 40 +
			#cs1: SIN F #saw 0.25 -
			#mer: #lp1 #lp1 * 10 * #cs1 *
			#bp2: BPF F 500 I #mer 0.2 < -0.2 >
			#out: ENV A 0 S 0 R 2 I #bp2 1 *
		`)).tosound();
		let leafsnd=(new Audio.SFX(`
			#wind1: SIN 0.25 H 1 L 0.5
			#wind2: #wind1 -0.4 * 0.7 +
			#noi: NOISE
			#hpf: HPF F 200 I #wind2 #noi > #wind2 - #wind2 *
			#lpf: LPF F 4000 I #hpf
			#out: ENV A 0.001 S 1 R 2.5 I #lpf #wind1 * .25 *
		`)).tosound();
		let hooksnd=(new Audio.SFX(`
			#sig: NOISE
			#clk: SAW F #sig 1131 *
			#fil: BPF F 3000 B 2 I #clk #del - -1.6 > 1.6 <
			#del: DEL T 0.001 I #fil
			#out: ENV A 0.01 S 0 R 0.19 I #fil 0.15 *
		`)).tosound();
		let runesnd=Audio.createglockenspiel(0.05,313,0.25,5);
		let sndarr=[
			[NORM,ezsnd(200,400,.2,0.2),20,40],
			[BODY,ezsnd(100,200,3,0.2),30,40],
			[HOOK,hooksnd,2,6],
			[EDGE,hooksnd,2,6],
			[LEAF,leafsnd,10,20],
			[RUNE,runesnd,2,6],
			[RAIN,rainsnd,0.1,1],
			[CHAR,ezsnd(200,300,1,0.2),0.1,1]
		];
		for (let snd of sndarr) {
			let data=this.typearr[snd[0]].data;
			data.snd=snd[1];
			data.sndmin=snd[2];
			data.sndmax=snd[3];
		}
	}


	updateaudio() {
		this.audio.update();
		if (this.bgsndinst===null || this.bgsndinst.done) {
			this.bgsndinst=this.bgsnd.play();
		}
		for (let type of this.typearr) {
			let tdat=type.data;
			let vol=tdat.sndacc;
			let snd=tdat.snd;
			if (snd!==null && vol>0.001) {snd.play(vol);}
			tdat.sndacc=0;
		}
	}


	// ----------------------------------------
	// Player


	stepcallback(dt) {
		// Countdown the charge timer.
		if (this.throwing===2) {
			let rate=this.chargerate;
			this.charge-=dt*rate;
			if (this.charge<=0) {
				dt=-this.charge/rate;
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
				for (let bond of atom.bonditer()) {
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
		let climb=this.climb,stop=this.climbstop;
		for (let atom of bodyatom) {
			let pos=atom.pos,y=pos[1]-atom.rad;
			climb=climb<y?climb:y;
			playerpos.iadd(pos);
			playervel.iadd(atom.vel);
		}
		playerpos.imul(1/bodyatom.length);
		playervel.imul(1/bodyatom.length);
		if (climb<=stop) {climb=stop;}
		else if (climb<0) {this.climbtime+=dt;}
		this.climb=climb;
		// Center the camera on the player. Use a leash distance to prevent the camera
		// from jittering if the player is rocking.
		let camcen=this.camcen;
		let leash=0.5/camcen.dist(playerpos),scale=this.scale;
		leash=leash<1?leash:1;
		let camera=this.camera;
		let img=this.draw.img;
		let drawmax=[img.width,img.height];
		for (let i=0;i<2;i++) {
			let pos=camcen[i]*leash+playerpos[i]*(1-leash);
			camcen[i]=pos;
			let ds=drawmax[i]/scale;
			pos-=ds*0.5;
			let min=this.worldmin[i];
			let max=this.worldmax[i]-ds;
			pos=pos>min?pos:min;
			pos=pos<max?pos:max;
			camera[i]=pos;
		}
		// Check for click.
		let input=this.input;
		let mouse=this.mouse.mul(1/scale).iadd(camera);
		let throwing=this.throwing;
		let charge=this.charge;
		let key=input.MOUSE.LEFT;
		let click=input.getkeychange(key);
		input.keyclear(key);
		// Throw if we can, or release.
		if (throwing<=0) {throwing=click>0?1:0;}
		if (throwing===1) {charge+=dt*this.chargerate;}
		charge=charge<1?charge:1;
		if (click<0) {throwing=throwing===1?2:0;}
		let hookatom=this.hookatom;
		let sndinst=this.spininst;
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
				atom.pos.set(trans.apply(atom.data.turn));
				atom.vel.set(force);
				for (let bond of atom.bonditer()) {
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
				for (let bond of atom.bonditer()) {
					if (!(bond.breakdist===Infinity)) {bond.release();}
					else {bond.tension=tension;}
				}
			}
			charge=throwing>0?charge:0;
			if (sndinst!==null) {sndinst.stop();sndinst=null;}
			this.hooktime=0;
		}
		this.throwing=throwing;
		this.charge=charge;
		if (throwing===1) {
			if (sndinst===null || sndinst.done) {sndinst=this.spinsnd.play(1,0,dt);}
			let rem=0.1+sndinst.gettime()-this.spinsnd.time;
			if (rem>=0) {sndinst=this.spinsnd.play(1,0,1/this.chargerate+rem);}
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
				atom.pos.set(trans.apply(atom.data.turn));
				atom.vel.set(prev.vel);
			}
		}
		this.spininst=sndinst;
	}


	// ----------------------------------------
	// Main


	updateatoms(dt) {
		let draw=this.draw;
		let draww=draw.img.width;
		let drawh=draw.img.height;
		let scale=this.scale;
		let rnd=this.rnd;
		this.distmap.fill(Infinity);
		let acceldecay=Math.pow(0.01,dt);
		let [camx,camy]=this.camera;
		let trans=new Transform(2),vec=trans.vec,mat=trans.mat;
		for (let atom of this.world.atomiter()) {
			let adat=atom.data;
			let tdat=atom.type.data,id=atom.type.id;
			let pos=atom.pos,rad=atom.rad;
			// Allow the accumulated acceleration to gradually decay.
			let accel=adat.accel,sndmin=tdat.sndmin;
			adat.accel=accel*acceldecay;
			if (accel>=sndmin) {
				// Play a sound.
				if (adat.sndready) {
					adat.sndready=false;
					let vol=(accel-sndmin)/(tdat.sndmax-sndmin);
					let dist=(this.playerpos.dist(pos)-rad)/this.snddist;
					dist=dist>0?dist*dist:0;
					tdat.sndacc+=(vol<1?vol:1)*(1-dist);
				}
			} else if (accel<sndmin*0.1) {
				adat.sndready=true;
			}
			// Expire particles.
			let time=0,life=0,cs,sn;
			if (id>=PART) {
				time=adat.time+dt;
				life=adat.life;
				if (!(time>=0 && time<life)) {
					atom.release();
					continue;
				}
				// Destroy rain or snow if they're hit hard.
				if (id===RAIN && accel>0.1) {time=life;}
				adat.time=time;
				// Tow an imaginary particle behind the atom to determine orientation.
				let tow=adat.tow.isub(pos).normalize();
				cs=tow[0];sn=tow[1];
				tow.imul(rad*2).iadd(pos);
			}
			// Draw if we're on screen.
			let x=(pos[0]-camx)*scale;
			let y=(pos[1]-camy)*scale;
			rad=rad*scale*tdat.partscale;
			let pad=rad+2,rgb=adat.rgb;
			if (rgb===null) {rgb=tdat.rgb;}
			if (!(rgb!==null && x+pad>0 && x-pad<draww && y+pad>0 && y-pad<drawh)) {
				continue;
			}
			// Update particle state.
			let poly=adat.poly;
			if (id>=PART) {
				let vel=atom.vel;
				if (id===RUNE) {
					// Make rune glyph and color dependent on angle.
					let ang=Math.atan2(sn,cs)/(Math.PI*2)+0.5;
					for (let i=0;i<3;i++) {let c=ang-i/3;c=c<0?-c:c;rgb[i]=(c>0.5?1-c:c)*510;}
					rgb[3]+=rnd.getnorm()*dt*637;
					vel[0]+=rnd.getnorm()*dt*2;
					vel[1]+=rnd.getnorm()*dt*2;
					poly=this.runearr[65+(ang*26|0)];
				} else if (id===RAIN) {
					if (time>=life) {
						for (let j=0;j<8;j++) {
							this.createparticle(PART,pos,{vel:vel,rand:2,rgb:rgb,rad:atom.rad*0.5});
						}
					}
				} else if (id>=CHAR) {
					if (accel>0.01 && time<9) {time=9;}
					adat.time=time>=9?time:2;
				}
				let half=time>life-time?life-time:time;
				let fade=(life>2 || time>half)?Math.max(life*0.05,0.1):0;
				rgb[3]=255.99*(half<fade?half/fade:1);
				for (let i=0;i<4;i++) {rgb[i]=Math.min(Math.max(rgb[i]|0,0),255);}
			}
			// Draw
			if (poly===null) {
				this.drawatom(x,y,rad,rgb);
			} else {
				let tx=adat.turn[0],ty=adat.turn[1],ct=cs;
				cs=(tx*cs-ty*sn)*rad;
				sn=(tx*sn+ty*ct)*rad;
				vec[0]= x;vec[1]=  y;
				mat[0]=cs;mat[1]=-sn;
				mat[2]=sn;mat[3]= cs;
				draw.setcolor(rgb);
				draw.fillpoly(poly,trans);
			}
		}
	}


	update(frametime) {
		// Get the timestep. Prevent steps that are too large.
		let dt=(frametime-this.frameprev)*0.001;
		dt=dt<this.framemax?dt:this.framemax;
		dt=dt>0?dt:0;
		this.frameprev=frametime;
		if (!Lib.IsVisible(this.canvas)) {return true;}
		let starttime=performance.now();
		let input=this.input;
		input.update();
		let draw=this.draw;
		let scale=this.scale;
		let mouse=this.mouse;
		mouse.set(input.getmousepos());
		this.ui.update();
		draw.img.data32.set(this.background.data32);
		let world=this.world;
		world.update(dt);
		this.updateplayer(dt);
		this.updateparticles(dt);
		this.updateatoms(dt);
		// Draw the charge timer.
		let camera=this.camera;
		let charge=this.charge;
		if (charge>0) {
			let arcs=128;
			let rad0=1.25*scale,rad1=1.75*scale;
			let [x,y]=this.playerpos.sub(camera).mul(scale);
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
		// Draw the HUD.
		this.updateaudio();
		this.ui.render();
		draw.setcolor(255,255,255,255);
		draw.fillpoly(this.cursor,{vec:mouse.add(-1.5,-1.5),scale:5});
		draw.setcolor(128,128,255,255);
		draw.fillpoly(this.cursor,{vec:mouse,scale:4});
		draw.setcolor(255,255,255,255);
		draw.filltext(draw.img.width-5-7*11,5,this.framestr,20);
		let rem=this.climb-this.climbstop;
		draw.filltext(5,45,`finish: ${rem.toFixed()} m`,20);
		if (rem===0 || this.climb===0) {draw.setcolor(128,128,255,255);}
		draw.filltext(5,70,`time  : ${this.climbtime.toFixed(2)} s`,20);
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
