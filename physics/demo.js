/*------------------------------------------------------------------------------


demo.js - v1.06

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Demo for physics.js


--------------------------------------------------------------------------------
TODO


WASM drawing
	types: 0=done, 1=poly, 2=atom
	overload fillpoly to add to queue instead of rendering
	width
	height
	image data
	dist data
	draw queue
	temp data
	user int32 and float32 to avoid alignment issues


*/
/* npx eslint demo.js -c ../../standards/eslint.js */
/* global Vector, Random, Input, Draw, PhyWorld */


//---------------------------------------------------------------------------------


class PhyScene {

	constructor(divid) {
		// Setup the canvas
		this.drawratio=9/16;
		let drawheight=1000;
		let drawwidth=Math.floor(drawheight*this.drawratio);
		let canvas=document.getElementById(divid);
		canvas.width=drawwidth;
		canvas.height=drawheight;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.draw=new Draw(drawwidth,drawheight);
		this.input=new Input(canvas);
		this.input.disablenav();
		this.mouse=new Vector(2);
		this.distmap=new Float32Array(0);
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.frametime=1/60;
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
		let canvas =this.canvas;
		let elem   =canvas.parentNode;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem!==null) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		let pscale=1; // window.devicePixelRatio;
		let width =Math.floor(pscale*(window.innerWidth-offleft));
		let height=Math.floor(pscale*(window.innerHeight-offtop));
		let ratio =this.drawratio;
		if (width<height*ratio) {
			height=Math.floor(width/ratio);
		} else {
			width =Math.floor(height*ratio);
		}
		canvas.width =width;
		canvas.height=height;
		canvas.style.width =width +"px";
		canvas.style.height=height+"px";
		this.draw.img.resize(width,height);
		this.distmap=new Float32Array(width*height);
	}


	initworld() {
		this.world=new PhyWorld(2);
		let world=this.world;
		world.maxsteptime=1/180;
		world.gravity.set([0,0.1]);
		let viewh=1.0,vieww=this.drawratio;
		let normtype=world.createatomtype(0.01,1.0,0.98);
		let boxtype=world.createatomtype(0.0,0.8,1.0);
		let rnd=new Random(2);
		let pos=new Vector(world.dim);
		for (let p=0;p<3000;p++) {
			pos[0]=rnd.getf()*vieww;
			pos[1]=rnd.getf()*viewh;
			let atom=world.createatom(pos,0.004,normtype);
			atom.userdata={isparticle:true};
		}
		for (let k=0;k<3;k++) {
			// world.createbox(,6,0.007,0.007*.70,boxtype);
			let cen=new Vector([(0.3+k*0.2)*vieww,0.3]);
			let side=6,rad=0.007,dist=0.007*.70,pos=new Vector(cen);
			let atomcombos=1;
			let dim=world.dim;
			for (let i=0;i<dim;i++) {atomcombos*=side;}
			let atomarr=new Array(atomcombos);
			for (let atomcombo=0;atomcombo<atomcombos;atomcombo++) {
				// Find the coordinates of the atom.
				let atomtmp=atomcombo;
				let edge=false;
				for (let i=0;i<dim;i++) {
					let x=atomtmp%side;
					if (x===0 || x===side-1) {edge=true;}
					atomtmp=Math.floor(atomtmp/side);
					pos[i]=cen[i]+(x*2-side+1)*dist;
				}
				let atom=world.createatom(pos,rad,boxtype);
				atomarr[atomcombo]=atom;
				let r=32,g=128,b=0;
				if (edge) {r=64;g=200;b=0;}
				atom.userdata={isparticle:false,iscore:!edge,r:r,g:g,b:b};
			}
			world.autobond(atomarr,Infinity);
		}
		world.bndmin=new Vector([0,0]);
		world.bndmax=new Vector([vieww,1]);
		let playertype=world.createatomtype(0.0,Infinity,0.2);
		playertype.bound=false;
		playertype.gravity=new Vector([0,0]);
		pos.set([vieww*0.5,viewh*0.33]);
		this.playeratom=world.createatom(pos,0.035,playertype);
		this.playeratom.userdata={isparticle:false};
		this.mouse.set(pos);
		// populate userdata
		let link=world.atomlist.head;
		while (link!==null) {
			let atom=link.obj;
			link=link.next;
			atom.userdata.velcolor=0;
		}
	}


	update(time) {
		// Restrict our FPS to [fps/2,fps].
		let delta=(time-this.frameprev)/1000;
		if (delta>this.frametime || !(delta>0)) {delta=this.frametime;}
		else if (delta<0.5*this.frametime) {return true;}
		this.frameprev=time;
		let starttime=performance.now();
		let world=this.world;
		let draw=this.draw;
		let input=this.input;
		let viewscale=draw.img.height;
		//let vieww=draw.img.width/viewscale,viewh=draw.img.height/viewscale;
		input.update();
		world.update(delta);
		draw.fill(0,0,0,255);
		draw.setscale(viewscale,viewscale);
		this.distmap.fill(Infinity);
		// Move the player. Pulse the player atom until moved.
		let mpos=input.getmousepos();
		this.mouse[0]=mpos[0]/viewscale;
		this.mouse[1]=mpos[1]/viewscale;
		let player=this.playeratom;
		let pdata=player.userdata;
		let dir=this.mouse.sub(player.pos);
		let mag=dir.sqr();
		if (mag<Infinity) {
			pdata.isparticle=true;
			player.vel=dir.mul(mag>1e-6?0.2/delta:0);
		} else if (!pdata.isparticle) {
			let pframe=((performance.now()/1000)*0.5)%1;
			let u=Math.floor((Math.sin(pframe*Math.PI*2)+1.0)*0.5*255.0);
			pdata.r=u;pdata.g=u;pdata.b=255;
		}
		// Update atoms.
		let link=world.atomlist.head;
		while (link!==null) {
			let atom=link.obj;
			link=link.next;
			let data=atom.userdata;
			// Update the appearance.
			let vel=atom.vel.mag();
			data.velcolor=Math.max(data.velcolor*0.99,vel);
			if (data.isparticle) {
				let u=data.velcolor*(256*4);
				u=Math.floor(u<255?u:255);
				data.r=u;
				data.g=0;
				data.b=255-u;
			} else if (data.iscore) {
				let u=Math.min(data.velcolor*3,1);
				data.r=(32+128*u)|0;
				data.g=(128+64*u)|0;
				data.b=(0+64*u)|0;
			}
			this.drawatom(atom);
			if (atom.delete!==undefined) {
				atom.release();
			}
		}
		// Draw the HUD.
		draw.setcolor(255,255,255,255);
		draw.filltext(.005,.005,"time : "+this.framestr+"\ncount: "+world.atomlist.count,.019);
		this.ctx.putImageData(draw.img.imgdata,0,0);
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


	drawatom(atom) {
		// If two atoms overlap, prefer the one that's closer.
		// Overlap is judged by the center of the pixel (.5,.5).
		let draw=this.draw,img=draw.img;
		let imgdata32=img.data32;
		let distmap=this.distmap;
		// Check if it's on the screen.
		let dw=img.width,dh=img.height,scale=dh;
		let x=atom.pos[0]*scale,y=atom.pos[1]*scale;
		let dx=(x>1?(x<dw?x:dw):1)-0.5-x;
		let dy=(y>1?(y<dh?y:dh):1)-0.5-y;
		let rad=atom.rad*scale+0.5,rad2=rad*rad;
		if (dx*dx+dy*dy>=rad2) {return;}
		let rad21=rad>1?(rad-1)*(rad-1):0;
		// Fill in the circle at (x,y) with radius 'rad'.
		let data=atom.userdata;
		let miny=Math.floor(y-rad+0.5),maxy=Math.ceil(y+rad-0.5);
		miny=miny> 0?miny: 0;
		maxy=maxy<dh?maxy:dh;
		// PhyAssert(miny<maxy);
		draw.setcolor(data.r,data.g,data.b,255);
		let colrgba=draw.rgba32[0];
		let coll=(colrgba&0x00ff00ff)>>>0;
		let colh=(colrgba&0xff00ff00)>>>0;
		let colh2=colh>>>8;
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
			// Normal version. Time FF: 2.582620, time CR: 2.692565
			for (;minx<maxx;minx++) {
				// Check if we can overwrite another atom's pixel, or if we need to blend them.
				// PhyAssert(d2>=0 && d2<=rad2,[d2,rad2]);
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
			// PhyAssert(maxx>=dw*miny+dw || d2>=rad2,[d2,rad2]);
		}
	}

}

window.addEventListener("load",()=>{new PhyScene("democanv");});
