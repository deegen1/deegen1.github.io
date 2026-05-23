/*------------------------------------------------------------------------------


rappel.js - v3.00

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
     Changed from atom-based physics to rigid body polygons.


--------------------------------------------------------------------------------
TODO


Physics
	fast path for 2D: mat.inv(), mat.rotate(), mat.toangle(), mat.imul
	createsphere() allow for single radius.
	Remove body.trans, replace with body.pos/body.mat.
	Don't use world.tmpvec multiple times. Use tmpvec=world.tmpvec.
	Minkowski wrapping.
	Better BVH partitioning.
	Add friction.

Go back to N+2 rope.

Leaf: some glowing. Used for lights?
Rune: set angle based on vel? use body.data.pos for towing.


*/
/* npx eslint rappel.js -c ../../standards/eslint.js */


import {Env,Random,Vector,Matrix,Transform,Input,Draw,Audio,UI,Phy} from "./library.js";


// Material IDs
const NORM=0,WALL=1,BODY=2,ROPE=3,HOOK=4,EDGE=5;
const PART=6,LEAF=7,RUNE=8,RAIN=9,CHAR=10;


export class Game {

	constructor(divid) {
		let inittime=performance.now();
		this.debug=false;
		this.canvas=document.getElementById(divid);
		this.input=new Input(this.canvas);
		this.input.disablenav();
		this.mouse=new Vector(2);
		this.rnd=new Random();
		this.scale=16;
		this.snddist=20;
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.framemax=1/60;
		this.frameprev=0;
		this.chargerate=1;
		this.initaudio();
		this.initgraphics();
		this.initphysics();
		this.initlevel();
		this.resize();
		let state=this;
		window.addEventListener("resize",()=>{state.resize();});
		function update(time) {
			if (state.update(time)) {
				requestAnimationFrame(update);
			}
		}
		requestAnimationFrame(update);
		console.log("time:",(performance.now()-inittime)*0.001);
	}


	reset() {
		this.charge=0;
		let world=this.world;
		for (let body of world.bodyiter()) {body.release();}
		world.gravity.set([0,6.66]);
		this.playerbody=null;
		this.camera=new Vector(2);
		this.camcen=new Vector(2);
		this.biomearr=[];
	}


	// ----------------------------------------
	// Audio


	initaudio() {
		let audio=new Audio(0,0,false);
		this.audio=audio;
		this.snddist=30;
		// Create a high-tempo, dark, ambient background song.
		function eztri(freq) {
			return (new Audio.SFX(`#tri: TRI F ${freq} H 0.8 #out: ENV A 0.01 R 0.99 I #tri`)).tosound();
		}
		let bgsnd=new Audio.Sound();
		let notelib=[
			[0x1111,Audio.SFX.defsnd("hihat",1)],
			[0x4444,Audio.SFX.defsnd("kick",0.8)],
			[0x0101,eztri(73.416)],
			[0x0010,eztri(77.782)],
			[0x1000,eztri(82.407)]
		];
		for (let n=16*30-1;n>=0;n--) {
			let t=n/8,b=1<<(n&15);
			for (let [mask,snd] of notelib) {
				if (mask&b) {bgsnd.add(snd,t);}
			}
		}
		bgsnd.resizetime(60);
		bgsnd.setloop(0);
		this.bgsnd=bgsnd;
		this.bgsndinst=this.bgsnd.play(0.3);
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
		this.spinsnd.setloop(1/this.chargerate+0.1);
		this.spininst=null;
		this.windsnd=(new Audio.SFX(`
			#noi: NOISE H 0.8
			#out: LPF F 800 I #noi
		`)).tosound(5);
		this.windsnd.setloop(0);
		this.windinst=null;
		this.windvol=0;
		this.rainsnd=(new Audio.SFX(`
			#noi: NOISE
			#bp1: BPF F 150 B 2 I #noi
			#lp1: LPF F 500 I #bp1
			#saw: SAW F #lp1 80 * 40 +
			#cs1: SIN F #saw 0.25 -
			#mer: #lp1 #lp1 * 10 * #cs1 *
			#bp2: BPF F 500 I #mer 0.2 < -0.2 >
			#out: ENV A 0 S 0 R 2 I #bp2 1 *
		`)).tosound();
		this.leafsnd=(new Audio.SFX(`
			#wind1: SIN 0.25 H 1 L 0.5
			#wind2: #wind1 -0.4 * 0.7 +
			#noi: NOISE
			#hpf: HPF F 200 I #wind2 #noi > #wind2 - #wind2 *
			#lpf: LPF F 4000 I #hpf
			#out: ENV A 0.001 S 1 R 2.5 I #lpf #wind1 * .25 *
		`)).tosound();
		this.hooksnd=(new Audio.SFX(`
			#sig: NOISE
			#clk: SAW F #sig 1131 *
			#fil: BPF F 3000 B 2 I #clk #del - -1.6 > 1.6 <
			#del: DEL T 0.001 I #fil
			#out: ENV A 0.01 S 0 R 0.19 I #fil 0.15 *
		`)).tosound();
		this.runesnd=Audio.SFX.defsnd("bell",0.05,313,5);
		this.normsnd=ezsnd(200,400,.2,0.2);
		this.bodysnd=ezsnd(100,200,2,0.2);
		this.charsnd=ezsnd(200,300,1,0.2);
	}


	updateaudio() {
		for (let type of this.typearr) {
			let tdat=type.data;
			let vol=tdat.sndacc;
			let snd=tdat.snd;
			if (snd!==null && vol>0.001) {snd.play(vol);}
			tdat.sndacc=0;
		}
	}


	// ----------------------------------------
	// Graphics


	initgraphics() {
		// Setup the canvas
		this.canvas.style.imageRendering="pixelated";
		let draw=new Draw(this.canvas);
		this.draw=draw;
		// Particles sprites.
		this.leafpath=new Draw.Path(`
			M-.664-.034-.753-.545-.558-.475-.133-1-.069-.857.269-.966.201-.648.362-.579.094
			-.334.12-.288.712-.402.591-.197.974 0 .591.197.712.402.12.288.094.334.362.579
			.201.648.269.966-.069.857-.133 1-.558.475-.753.545-.664.034-.862.052-.862-.052Z
		`);
		let font=new Draw.Font();
		this.runearr=new Array(128);
		for (let i=0;i<128;i++) {
			let glyph=font.glyphs[i],path=null;
			if (glyph && i>32) {
				path=glyph.path;
				let scale=2/glyph.width,mx=glyph.width*0.5*scale,my=0.5*scale;
				path=new Draw.Path(path,{vec:[-mx,-my],scale:scale});
			}
			this.runearr[i]=path;
		}
		this.runearr.push(null);
		// Init UI.
		let state=this;
		let ui=new UI(draw,this.input);
		this.ui=ui;
		ui.addpath(UI.VOLUME_PATH,{vec:[21,20],scale:15});
		let slider=ui.addslider(45,5,140,30,this.audio.volume);
		slider.onchange=function(node) {state.audio.setvolume(node.value);};
		this.cursor=new Draw.Path("M0 0 4 2 2 2 2 4Z",{scale:[5,5]});
		this.cursortrace=this.cursor.trace(0.5);
	}


	resize() {
		// Properly resize the canvas. Use absolute position to properly fill the screen.
		// Manually pad the top and bottom.
		let canvas=this.canvas;
		let pad=[0,0],side=0;
		for (let elem of document.body.childNodes) {
			if (elem===canvas) {side=1;} else {pad[side]+=elem.clientHeight??0;}
		}
		let scale=this.scale,mindim=480;
		let maxw=Math.min(this.worlddif[0]*scale,0x3fffffff)|0;
		let maxh=Math.min(this.worlddif[1]*scale,0x3fffffff)|0;
		let winw=window.innerWidth,winh=window.innerHeight-pad[0]-pad[1];
		let winmax=mindim/(winw<winh?winw:winh);
		let draww=winw*winmax|0;
		let drawh=winh*winmax|0;
		draww=draww<maxw?draww:maxw;
		drawh=drawh<maxh?drawh:maxh;
		let ratio=winw/draww,ratioh=winh/drawh;
		ratio=ratio<ratioh?ratio:ratioh;
		maxw=draww*ratio;
		maxh=drawh*ratio;
		let style=canvas.style;
		style.left=(winw-maxw)*0.5+"px";
		style.top=pad[0]+"px";
		style.width=maxw+"px";
		style.height=maxh+"px";
		canvas.width=draww;
		canvas.height=drawh;
		this.resizebackground(draww,drawh);
	}


	resizebackground(draww,drawh) {
		let draw=this.draw;
		draw.img.resize(draww,drawh);
		// Draw a dark forest.
		let bg=new Draw.Image(draww,drawh);
		this.background=bg;
		draw.pushstate();
		draw.setimage(bg);
		draw.fill(0,0,0,255);
		let rnd=new Random(9);
		let tower=new Draw.Path(`
			M-200 0V-617L-300-717V-867h76v75h55v-75h76v75h55v-75H-5v-133H5v14c19-5 98-19 60
			18 75 21 85 45 190 47-37 29-136 17-195 5-8-29-47-11-55-10v59H38v75H93v-75h76v75
			h55v-75h76v150L200-617V0Z
		`,{dim:2,scale:1/1000});
		let tree=new Draw.Path(`
			M-43 0l22-110-89 35 16-35-93 35 46-72-143 47 36-26-102 14 32-22-100 5 185-108-93
			20 30-25-91 5 181-111-98 8 31-18-69 2 172-99-91 12 18-14-64 4 131-89-51 11 9-17
			-50 1 141-88-62 11 19-13-58-11 127-73-49 11 14-15-54-7 112-66-44 9 19-13-42-7 96
			-58-32 9 17-14-35 5 104-84 104 82-31-4 13 17-35-14 101 60-42 6 21 12-53-8 121 73
			-55 6 24 18-66-22 133 85-66 0 21 22-68-19 145 89-55 0 31 18-67-11 129 94-67-14
			38 28-102-22 168 104-65-7 30 20-103-16 180 116-79-2 13 24-85-25 181 108-88-11 31
			35-107-22 40 38-148-55 55 79-95-37 17 30-91-35 20 111Z
		`,{dim:2,scale:1/951});
		let fov=90*Math.PI/180;
		let f=drawh/(2*Math.tan(fov/2));
		let inv=Matrix.fromangles([-1.4*fov,0,0]).inv();
		let cam=new Vector([0,0,2]);
		let c=f*2/draww,den=c*inv[0]-inv[6];
		let xproj=new Vector([0,inv[7]-c*inv[1],inv[8]-c*inv[2]]).imul(1.1/den);
		let trees=~~(draww*drawh*0.004183),toweri=~~(trees*0.9);
		for (let i=0;i<trees;i++) {
			let u=Math.pow(i/(trees-1),2);
			let p=(new Vector([0,(1-u)*11-1,0])).isub(cam);
			// Scale x to screen boundaries.
			p[0]=rnd.gets()*p.mul(xproj)-cam[0];
			let [x,y,z]=inv.mul(p),w=f/z;
			x=x*w+draww/2;
			y=y*w+drawh/2;
			if (i===toweri) {
				draw.setcolor(16,16,16,255);
				draw.fillpath(tower,{vec:[draww/2,y],scale:2.2*w});
			}
			let h=(rnd.getf()+0.5)*w;
			if (z<1e-7 || y-h>drawh) {continue;}
			// Shade based on proximity.
			let col=(rnd.getf()*6+27)/(1.5-u);
			draw.setcolor(col,1.33*col,col,255);
			draw.fillpath(tree,{vec:[x,y],scale:h});
		}
		draw.popstate();
	}


	// ----------------------------------------
	// Physics


	initphysics() {
		// Setup physics world.
		this.world=new Phy.World(2,100,0.005*640,0.1);
		let world=this.world;
		let state=this;
		world.data.game=this;
		world.maxsteptime=1/180;
		world.collcallback=function() {return state.collcallback(...arguments);};
		world.stepcallback=function(dt) {return state.stepcallback(dt);};
		world.deftype.release();
		let normmat=world.createbodytype(0.01,1.0,0.98);
		let wallmat=world.createbodytype(1.00,Infinity,0.95);
		let bodymat=world.createbodytype(0.01,1.0500,0.00);
		let ropemat=world.createbodytype(0.50,0.2763,0.00);
		let hookmat=world.createbodytype(0.25,0.5525,0.25);
		let edgemat=world.createbodytype(0.01,0.5525,0.50,1,9950);
		let partmat=world.createbodytype(0.50,1e-9,0.50,1,NaN);
		let leafmat=world.createbodytype(0.75,1e-8,0.00,1);
		let runemat=world.createbodytype(0.95,1e-8,0.25,0.2,NaN);
		let rainmat=world.createbodytype(0.25,1e-8,0.00,1,NaN);
		let charmat=world.createbodytype(0.75,1e-8,0.25,0.2,NaN);
		world.deftype=normmat;
		this.typearr=[];
		for (let type of world.typelist.iter()) {
			this.typearr.push(type);
		}
		partmat.gravity=new Vector([0,0]);
		runemat.gravity=new Vector([0,0]);
		charmat.gravity=new Vector([0,0]);
		for (let intr of edgemat.intarr) {intr.staticdist=5.625;}
		leafmat.intarr[edgemat.id].staticdist=0.1;
		// Materials.
		function addmeta(type,rgb,path,vert,snd=null,sndmin=0,sndmax=0,freq=0,rad=0,scale=0,ang=0,life=0) {
			let t=type.data;
			t.rgb=rgb;
			t.partpath=path;
			t.partvert=vert;
			t.snd=snd;
			t.sndacc=0;
			t.sndmin=sndmin;
			t.sndmax=sndmax;
			t.partfreq=freq;
			t.partrad=rad;
			t.partscale=scale;
			t.partang=ang;
			t.partlife=life;
		}
		let rw=1/.553;
		let leafvert=[[-0.753,-0.545],[-0.133,-1],[0.269,-0.966],[0.973,0],[0.269,0.966],[-0.133,1],[-0.753,0.545]];
		let leafpath=this.leafpath;
		let rainvert=[[1,0],[0,1],[-8,0],[0,-1]];
		let runevert=[[-1,-rw],[1,-rw],[1,rw],[-1,rw]];
		let partvert=[[-1,-1],[1,-1],[1,1],[-1,1]];
		let PI2=Math.PI/2;
		addmeta(normmat,[255,255,255,255],null,null,this.normsnd,20,40);
		addmeta(wallmat,[140,170,140,255],null,null);
		addmeta(bodymat,[128,128,255,255],null,null,this.bodysnd,10,30);
		addmeta(ropemat,null             ,null,null);
		addmeta(hookmat,null             ,null,null,this.hooksnd, 2, 6);
		addmeta(edgemat,[100,100,100,255],null,null,this.hooksnd, 2, 6);
		addmeta(partmat,[255,255,255,255],null    ,partvert,null        , 0, 0,NaN ,0.05,25  ,NaN,0.2);
		addmeta(leafmat,[255,255,255,255],leafpath,leafvert,this.leafsnd, 6,10,1000,0.3 ,2   ,NaN,40 );
		addmeta(runemat,[255,255,255,255],null    ,runevert,this.runesnd,10,20,450 ,0.5 ,0.45,NaN,40 );
		addmeta(rainmat,[128,128,255,255],null    ,rainvert,this.rainsnd,10,15,200 ,0.1 ,10  ,PI2,9  );
		addmeta(charmat,[255,255,255,255],null    ,runevert,this.charsnd,.1, 1,NaN ,1   ,1   ,0  ,10 );
	}


	static bodyinit(body) {
		let data=body.data;
		if (data.sndacc!==undefined) {return data;}
		data.rad=1;
		data.pos=null;
		data.accel=0;
		data.sndacc=0;
		data.sndready=true;
		data.time=0;
		data.life=0;
		data.paths=[];
		let path=new Draw.Path();
		for (let v of body.vertarr) {path.lineto(v);}
		path.close();
		data.objpath=path;
		let type=body.type,tdat=type.data;
		let rgb=tdat.rgb;
		if (rgb) {
			if (type.id===WALL) {
				data.paths=[[[32,32,32,255],path]];
				path=path.trace(0,-0.2);
			}
			data.paths.push([rgb,path]);
		}
		return data;
	}


	collcallback(intr,a,acon,b,bcon,norm,veldif,posdif,bond) {
		let aid=a.type.id,bid=b.type.id;
		if (aid===WALL && bid===WALL) {
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
		let u=a.mass/(a.mass+b.mass);
		u=u<1?u:1;
		let adat=a.data,bdat=b.data;
		adat.accel+=veldif*(1-u);
		bdat.accel+=veldif*u;
		// Scale sound by distance.
		let apos=a.trans.vec,bpos=b.trans.vec;
		let cenx=(acon[0]+apos[0]+bcon[0]+bpos[0])*0.5;
		let ceny=(acon[1]+apos[1]+bcon[1]+bpos[1])*0.5;
		let cam=this.camcen;
		let dx=cam[0]-cenx,dy=cam[1]-ceny;
		let vol=1-(dx*dx+dy*dy)/(this.snddist*this.snddist);
		if (vol>0) {
			adat.sndacc+=veldif*vol*(1-u);
			bdat.sndacc+=veldif*vol*u;
		}
		// Create a particle between the 2 atoms.
		if (veldif>2.0 && bond===null && aid<PART && bid<PART) {
			let mag=posdif*0.5*this.rnd.getf();
			let dir=Vector.random(2);
			let cen=[cenx+dir[0]*mag,ceny+dir[1]*mag];
			let avel=a.relvel(acon),bvel=b.relvel(bcon);
			mag=veldif*this.rnd.getf();
			dir[0]=dir[0]*mag+avel[0]+bvel[0];
			dir[1]=dir[1]*mag+avel[1]+bvel[1];
			this.createparticle(PART,cen,dir);
		}
		return true;
	}


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
				bond.dist=bond.data.orig*distmul;
			}
			let u=hooktime/3;
			let tension=this.ropemin+(this.ropemax-this.ropemin)*(u<1?u*u:1);
			tension=tension<this.ropemax?tension:this.ropemax;
			for (let body of this.ropebody) {
				for (let bond of body.bonditer()) {
					if (bond.breakdist===Infinity) {
						bond.tension=tension;
					}
				}
			}
		}
	}


	// ----------------------------------------
	// Particles


	createbiome(id,pos,dim) {
		let type=this.typearr[id],tdat=type.data;
		let [bx,by]=pos,[bw,bh]=dim;
		let freq=tdat.partfreq/(bw*bh),life=tdat.partlife;
		let biome={type:id,time:0,freq:freq,pos:new Vector(pos),dim:new Vector(dim)};
		this.biomearr.push(biome);
		// Seed the biome particles.
		let rnd=this.rnd;
		let points=life/freq;
		if (id===RAIN) {life=0;}
		for (let p=0;p<points;p++) {
			this.createparticle(id,[rnd.getf()*bw+bx,rnd.getf()*bh+by],{time:rnd.getf()*life});
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
		let ang=opt.ang??tdat.partang;
		ang=isNaN(ang)?this.rnd.getf()*Math.PI*2:ang;
		let vert=[],scale=opt.rad??tdat.partrad;
		for (let v of tdat.partvert) {vert.push([v[0]*scale,v[1]*scale]);}
		let body=this.world.createbody(vert,pos,[ang],type);
		let data=Game.bodyinit(body);
		let path=id<CHAR?tdat.partpath:this.runearr[id-CHAR];
		if (!path) {path=data.paths[0][1];}
		body.vel.set(opt.vel??0);
		data.rad=scale;
		if (opt.rand) {body.vel.iadd(Vector.random(2).imul(opt.rand));}
		data.life=tdat.partlife*(id<CHAR?this.rnd.getf()*0.5+1:1);
		data.time=opt.time??0;
		let rgb=(opt.rgb??tdat.rgb).slice();
		if (id===LEAF) {
			let u=this.rnd.getf();
			rgb=[128+84*u,70+105*u,27+28*u,255];
		} else if (id===RAIN) {
			body.vel.iadd(this.world.gravity.mul(3));
		}
		data.paths=[[rgb,path]];
		return body;
	}


	updatebiomes(dt) {
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
	// Player


	initplayer(playerpos) {
		// Setup the player.
		let world=this.world;
		let ropespace=0.6/20,hookspace=0.135;
		this.throwing=-1;
		let typearr=this.typearr;
		this.hookang=0;
		this.camera.set(playerpos);
		this.camcen.set(playerpos);
		this.playerbody=world.createbody([[-1,-1],[1,-1],[1,1],[-1,1]],playerpos,null,typearr[BODY]);
		// Create the hook.
		this.hooktime=0;
		this.hookbody=[];
		this.hookbond=[];
		let prev1=null;
		for (let s=0;s<3;s++) {
			let ang=[1.3,-1.3,0][s],len=4;
			let dx=Math.cos(ang)*hookspace,dy=Math.sin(ang)*hookspace;
			prev1=s?this.hookbody[0]:null;
			for (let i=s?1:0;i<len;i++) {
				let pos=new Vector([(len-1)*hookspace-dx*i,dy*i]);
				let supp=(!i || i===len-1)?1:0,disp=supp;
				let mat=typearr[i===len-1?EDGE:HOOK];
				let body=world.createsphere([0.16,0.16],8,pos.add(playerpos),0,mat);
				let data=Game.bodyinit(body);
				data.pos=pos;
				data.time=supp;
				for (let nb of this.hookbody) {
					let bonds=[0,1,10][nb.data.time+supp];
					for (let b=0;b<bonds;b++) {
						let bond=world.createbond(nb,[0,0],body,[0,0],-1,6000);
						if (disp) {disp=0;bond.data.rgb=[100,100,100,255];}
						bond.data.orig=bond.dist;
						this.hookbond.push(bond);
					}
				}
				this.hookbody.push(body);
				prev1=body;
			}
		}
		// Create the hair.
		this.ropemin=55;
		this.ropemax=6000;
		this.ropebody=[];
		for (let i=0;i<21;i++) {
			let body=this.playerbody;
			if (i<20) {
				body=world.createsphere([0.16,0.16],8,playerpos,null,typearr[ROPE]);
				this.ropebody.push(body);
			}
			for (let b=0;b<16;b++) {
				let bond=world.createbond(prev1,[0,0],body,[0,0],ropespace,this.ropemax);
				if (!b) {bond.data.rgb=[255,255,255,255];}
			}
			prev1=body;
		}
	}


	updateplayer(dt) {
		// Get our average position, velocity, and orientation.
		let playerbody=this.playerbody;
		if (!playerbody) {return;}
		let ropebody=this.ropebody;
		let playerpos=playerbody.trans.vec;
		let playervel=playerbody.vel;
		let climb=this.climb,stop=this.climbstop;
		climb=climb<playerpos[1]?climb:playerpos[1];
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
		// Play wind rushing sound.
		let windnew=playervel.mag();
		let wind=this.windvol*Math.pow(0.2,dt);
		wind=wind>windnew?wind:windnew;
		this.windvol=wind;
		let windinst=this.windinst;
		wind=wind/40-0.1;
		if (wind>0) {
			wind=wind<1?wind:1;
			if (!windinst) {windinst=this.windsnd.play(wind);}
			windinst.setvolume(wind);
		} else if (windinst) {
			windinst.remove();
			windinst=null;
		}
		this.windinst=windinst;
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
		let hookbody=this.hookbody;
		let sndinst=this.spininst;
		if (this.throwing!==throwing && throwing<3) {
			for (let bond of this.hookbond) {
				bond.dist=bond.data.orig;
			}
			// Throw the hook according to the player's velocity.
			// Delete any temporary bonds on the hook.
			let look=mouse.sub(playerpos).normalize();
			let trans=new Transform({vec:playerpos});
			trans.mat.set([look[0],-look[1],look[1],look[0]]);
			look.imul(throwing===2?35*charge:0);
			let force=look.add(playervel);
			for (let hook of hookbody) {
				hook.trans.vec.set(trans.apply(hook.data.pos));
				hook.vel.set(force);
				for (let bond of hook.bonditer()) {
					if (!(bond.breakdist===Infinity)) {bond.release();}
				}
			}
			// Reset rope position. Delete any temporary bonds on the rope.
			let tension=throwing<2?this.ropemax:this.ropemin;
			look.imul(-1/ropebody.length);
			for (let rope of ropebody) {
				rope.trans.vec.set(playerpos);
				rope.vel.set(force);
				force.iadd(look);
				for (let bond of rope.bonditer()) {
					if (!(bond.breakdist===Infinity)) {bond.release();}
					else {bond.tension=tension;}
				}
			}
			charge=throwing>0?charge:0;
			if (sndinst!==null) {sndinst.remove();sndinst=null;}
			this.hooktime=0;
		}
		this.throwing=throwing;
		this.charge=charge;
		if (throwing===1) {
			if (sndinst===null) {sndinst=this.spinsnd.play(1,0,dt);}
			// Show swinging animation while charging.
			let rad=0.3+charge*0.8;
			let ang=(this.hookang+dt*25.0)%(Math.PI*2);
			this.hookang=ang;
			let len=ropebody.length;
			for (let i=0;i<len;i++) {
				let u=1-i/(len-1),r=u*rad,a=ang-1.5*u*charge;
				let dif=playerpos.add([Math.cos(a)*r,Math.sin(a)*r]);
				let atom=ropebody[i];
				dif.isub(atom.trans.vec);
				atom.vel.iadd(dif);
				atom.trans.vec.iadd(dif);
			}
			let prev=ropebody[0];
			let trans=new Transform({vec:prev.trans.vec,ang:ang-Math.PI*0.75});
			for (let atom of hookbody) {
				atom.trans.vec.set(trans.apply(atom.data.pos));
				atom.vel.set(prev.vel);
			}
		}
		this.spininst=sndinst;
	}


	// ----------------------------------------
	// Main


	initlevel() {
		this.reset();
		let world=this.world;
		let toph=15,both=20,climb=200;
		let miny=-toph-climb,maxy=both;
		let minx=0,maxx=200;
		this.worldmin=new Vector([minx,miny]);
		this.worldmax=new Vector([maxx,maxy]);
		this.worlddif=this.worldmax.sub(this.worldmin);
		this.initplayer([maxx*0.5-10,10]);
		// Set up the level.
		// Create the walls
		let wallmat=this.typearr[WALL];
		let wallt=4,over=3.6;
		let wallw=(maxx-minx+wallt)*0.5,wallx=(minx+maxx)*0.5;
		let wallh=(maxy-miny+wallt)*0.5,wally=(miny+maxy)*0.5;
		let topvert =[[-wallw,-wallt],[wallw,-wallt],[wallw,wallt],[-wallw,wallt]];
		let sidevert=[[-wallt,-wallh],[wallt,-wallh],[wallt,wallh],[-wallt,wallh]];
		world.createbody(topvert ,[wallx,miny-over],null,wallmat);
		world.createbody(topvert ,[wallx,maxy+over],null,wallmat);
		world.createbody(sidevert,[minx-over,wally],null,wallmat);
		world.createbody(sidevert,[maxx+over,wally],null,wallmat);
		// Create top and bottom barriers.
		let bart=1.5,barw=wallw/5;
		for (let i=0;i<3;i++) {
			let x=(i*4+1)*barw;
			let verts=[[-barw,-bart],[barw,-bart],[barw,bart],[-barw,bart]];
			world.createbody(verts,[x,-bart],null,wallmat);
			world.createbody(verts,[x,miny+toph],null,wallmat);
		}
		for (let i=1;i<3;i++) {
			world.createbody([[-3,-3],[3,-3],[3,3],[-3,3]],[maxx*i/3,both*0.25],[Math.PI/4],wallmat);
		}
		// Create holds
		let rnd=new Random();
		let holdgap=20;
		let levels=Math.round(climb/holdgap)|1;
		holdgap=climb/levels;
		let spanx=Math.floor((maxx-minx)/(2*holdgap));
		let gapx=(maxx-minx)/spanx;
		for (let l=0;l<levels;l++) {
			let minrad=6,maxrad=10;
			let holdy=maxy-both-l*holdgap;
			let spanl=spanx+(l&1);
			for (let s=0;s<spanl;s++) {
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
				let holdx=(s+(l&1?0:0.5))*gapx+minx;
				world.createbody(arr,[holdx,holdy],null,wallmat);
			}
		}
		this.createtext("CLICK TO THROW",[maxx*0.5-6.5*2,4],1);
		this.createbiome(LEAF,[minx,0],[maxx,both]);
		this.createbiome(RAIN,[minx,-climb+bart],[maxx,climb-bart*2]);
		// Game state
		this.climbtime=0;
		this.climbstop=-climb;
		this.climb=0;
		for (let body of this.world.bodyiter()) {
			Game.bodyinit(body);
		}
	}


	updatebodies(dt) {
		let draw=this.draw;
		let scale=this.scale;
		let rnd=this.rnd;
		let decay=Math.pow(0.01,dt);
		let camera=this.camera;
		let trans=new Transform({vec:camera.mul(-scale),scale:scale});
		for (let body of this.world.bodyiter()) {
			let bdat=body.data;
			let tdat=body.type.data,id=body.type.id;
			let pos=body.trans.vec;
			// Allow the accumulated acceleration to gradually decay.
			let accel=bdat.accel;
			bdat.accel=accel*decay;
			let sndmin=tdat.sndmin;
			if (accel<sndmin*0.25) {
				bdat.sndready=true;
			} else if (accel>=sndmin && bdat.sndready) {
				// Play a sound.
				bdat.sndready=false;
				let vol=bdat.sndacc/tdat.sndmax;
				tdat.sndacc+=vol<1?vol:1;
			}
			bdat.sndacc*=decay;
			let bodytrans=trans.apply(body.trans);
			// Update particle state.
			let paths=bdat.paths;
			if (id>=PART) {
				let time=bdat.time+dt;
				let life=bdat.life;
				let rgb=paths[0][0];
				let vel=body.vel;
				// Destroy rain or snow if they're hit hard.
				if (id===RAIN && accel>0.1) {
					if (time>0.05) {
						let droppos=pos.add(body.trans.mat.mul([0.17,0]));
						for (let j=0;j<8;j++) {
							this.createparticle(PART,droppos,{vel:vel,rand:2,rgb:rgb});
						}
					}
					time=life;
				}
				if (!(time>=0 && time<life)) {
					body.release();
					continue;
				}
				bdat.time=time;
				bodytrans.scalemat(bdat.rad*tdat.partscale);
				if (id===RUNE) {
					// Make rune glyph and color dependent on angle.
					let ang=body.angle[0]/(Math.PI*2);
					for (let i=0;i<3;i++) {let c=ang-i/3;c=c<0?-c:c;rgb[i]=(c>0.5?1-c:c)*510|0;}
					rgb[3]+=rnd.getnorm()*dt*637;
					vel[0]+=rnd.getnorm()*dt*2;
					vel[1]+=rnd.getnorm()*dt*2;
					paths[0][1]=this.runearr[65+(ang*26|0)];
				} else if (id>=CHAR) {
					let lim=life-1;
					if (accel>0.01 && time<lim) {time=lim;}
					bdat.time=time=time>=lim?time:2;
				}
				let half=time>life-time?life-time:time;
				let fade=(life>2 || time>half)?Math.max(life*0.05,0.1):0;
				rgb[3]=255.99*(half<fade?half/fade:1)|0;
			}
			// Draw
			for (let [rgb,path] of paths) {
				draw.setcolor(rgb);
				draw.fillpath(path,bodytrans);
			}
		}
	}


	checkdebug() {
		if (!this.debug) {return;}
		let scale=this.scale;
		let world=this.world;
		let draw=this.draw;
		let trans=new Transform({vec:this.camera.mul(-scale),scale:scale});
		for (let body of world.bodyiter()) {
			// Display physics collider.
			draw.setcolor(255,255,255,64);
			draw.fillpath(body.data.objpath,trans.apply(body.trans));
		}
		draw.setcolor(100,100,255,255);
		draw.filltext(5,100,`body: ${world.bodylist.count}`,20);
		draw.filltext(5,120,`bond: ${world.bondlist.count}`,20);
	}


	update(frametime) {
		// Get the timestep. Prevent steps that are too large.
		let dt=(frametime-this.frameprev)*0.001;
		dt=dt<this.framemax?dt:this.framemax;
		dt=dt>0?dt:0;
		this.frameprev=frametime;
		let hide=!Env.IsVisible(this.canvas);
		this.audio.mute(hide);
		this.audio.update();
		if (hide) {return true;}
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
		this.updatebiomes(dt);
		this.updatebodies(dt);
		// Draw the charge timer.
		let trans=new Transform({vec:this.camera.mul(-scale),scale:scale});
		draw.pushstate();
		draw.settransform(trans);
		let charge=this.charge;
		if (charge>0) {
			let [x,y]=this.playerbody.trans.vec;
			let ang0=-Math.PI*0.5,ang1=ang0+Math.PI*2*charge;
			let path=draw.begin();
			path.addarc(x,y,ang0,ang1,1.75,1.75,true);
			path.addarc(x,y,ang1,ang0,1.25,1.25,true);
			path.close();
			draw.setcolor(100,100,200,255);
			draw.fillpath();
		}
		// Draw the bonds.
		draw.linewidth=0.15;
		for (let bond of world.bonditer()) {
			let rgb=bond.data.rgb;
			if (rgb===undefined) {continue;}
			draw.setcolor(rgb);
			let apos=bond.relapos(),bpos=bond.relbpos();
			draw.drawline(apos[0],apos[1],bpos[0],bpos[1]);
		}
		draw.popstate();
		// Draw the HUD.
		this.updateaudio();
		this.ui.render();
		draw.setcolor(255,255,255,255);
		draw.filltext(draw.img.width-5-7*11,5,this.framestr,20);
		let rem=this.climb-this.climbstop;
		draw.filltext(5,45,`finish: ${rem.toFixed()} m`,20);
		if (rem===0 || this.climb===0) {draw.setcolor(128,128,255,255);}
		draw.filltext(5,70,`time  : ${this.climbtime.toFixed(2)} s`,20);
		draw.setcolor(128,128,255,255);
		draw.fillpath(this.cursor,{vec:mouse});
		draw.setcolor(255,255,255,255);
		draw.fillpath(this.cursortrace,{vec:mouse});
		this.checkdebug();
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
