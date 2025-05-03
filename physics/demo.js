/*------------------------------------------------------------------------------


demo.js - v1.05

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Demo for physics.js


--------------------------------------------------------------------------------
TODO


Move coloring to update loop.
Move all rendering to render().
split drawing dimensions and physics dimensions
	use (viewx,viewy,vieww,viewh,viewscale) and phyw,phyh
	x=(phy.x-viewx)*viewscale
scale text, (.005,.005)*scale, .018*scale
WASM filling


*/
/* npx eslint demo.js -c ../../standards/eslint.js */
/* global Vector, Random, Input, Draw, PhyWorld */


//---------------------------------------------------------------------------------


class PhyScene {

	constructor(divid) {
		// Setup the canvas
		this.drawratio=9/16;
		//let drawwidth=600;
		let drawheight=1066;
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
		this.promptshow=1;
		this.promptframe=0;
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
		let elem   =canvas;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem!==null) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		offleft=0;
		let ratio =this.drawratio;
		let pscale=1;//window.devicePixelRatio;
		let width =Math.floor(pscale*(window.innerWidth-offleft));
		let height=Math.floor(pscale*(window.innerHeight-offtop));
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
	}


	initworld() {
		this.world=new PhyWorld(2);
		let world=this.world;
		world.maxsteptime=1/180;
		world.gravity.set([0,0.1]);
		let viewheight=1.0,viewwidth=this.drawratio;
		// let walltype=world.createatomtype(1.0,Infinity,1.0);
		let normtype=world.createatomtype(0.01,1.0,0.98);
		let boxtype=world.createatomtype(0.0,0.8,1.0);
		let rnd=new Random(2);
		let pos=new Vector(world.dim);
		for (let p=0;p<3000;p++) {
			pos[0]=rnd.getf()*viewwidth;
			pos[1]=rnd.getf()*viewheight;
			let atom=world.createatom(pos,0.004,normtype);
			atom.userdata={isparticle:true};
		}
		for (let k=0;k<3;k++) {
			//world.createbox(,6,0.007,0.007*.70,boxtype);
			let cen=new Vector([(0.3+k*0.2)*viewwidth,0.3]);
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
		world.bndmax=new Vector([viewwidth,1]);
		let playertype=world.createatomtype(0.0,Infinity,0.1);
		playertype.bound=false;
		playertype.gravity=new Vector([0,0]);
		pos.set([viewwidth*0.5,viewheight*0.33]);
		this.playeratom=world.createatom(pos,0.035,playertype);
		this.playeratom.userdata={isparticle:true};
		this.mouse.set(pos);
		// populate userdata
		let link=world.atomlist.head;
		while (link!==null) {
			let atom=link.obj;
			link=link.next;
			atom.userdata.velcolor=0;
		}
	}


	distancefill() {
		// Draw atoms. If 2 atoms overlap, prefer the one that's closer.
		let draw=this.draw;
		let dw=draw.img.width,dh=draw.img.height,pixels=dw*dh;
		let scale=dh;
		let distmap=this.distmap;
		if (distmap===undefined || distmap.length!==pixels) {
			distmap=new Float64Array(pixels);
			this.distmap=distmap;
		}
		distmap.fill(Infinity);
		let imgdata32=draw.img.data32;
		let link=this.world.atomlist.head;
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
			// Check if it's on the screen.
			let x=atom.pos[0]*scale,y=atom.pos[1]*scale;
			let dx=(x>0?(x<dw?x:dw):0)-x,dy=(y>0?(y<dh?y:dh):0)-y;
			let rad=atom.rad*scale+0.5,rad2=rad*rad;
			if (dx*dx+dy*dy>=rad2) {continue;}
			let rad21=rad>1?(rad-1)*(rad-1):0;
			// Fill in the circle at (x,y) with radius 'rad'.
			let r=data.r,g=data.g,b=data.b;
			let miny=Math.floor(y-rad+0.5),maxy=Math.ceil(y+rad-0.5);
			miny=miny>0 ?miny:0 ;
			maxy=maxy<dh?maxy:dh;
			if (miny>=maxy) {continue;}
			draw.setcolor(r,g,b,255);
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
				minx=minx>0 ?minx: 0;
				maxx=maxx<dw?maxx:dw;
				dx=minx-x+0.5;
				d2+=dx*dx;
				minx+=dw*miny;
				maxx+=dw*miny;
				for (;minx<maxx;minx++) {
					// Check if we can overwrite another atom's pixel, or if we need to blend them.
					// PhyAssert(d2>=0 && d2<=rad2,[d2,rad2]);
					let m2=distmap[minx];
					let u=(m2-d2)*0.5,u1=u+0.5,u2=u-0.5;
					// sqrt(m2)-sqrt(d2)>-1
					if (u1>0 || m2>u1*u1) {
						distmap[minx]=d2;
						// rad-dist>1 and sqrt(m2)-sqrt(d2)>1
						if (d2<=rad21 && u2>0 && d2<u2*u2) {
							imgdata32[minx]=colrgba;
						} else {
							// Blend with the background or another atom.
							let dist=Math.sqrt(d2);
							let dst=imgdata32[minx];
							let back=rad-dist;
							let edge=Math.sqrt(m2)-dist;
							u=1-(edge<1?(edge+1)*0.5:1)*(back<1?back:1);
							let d=(u*256)|0;
							imgdata32[minx]=(((Math.imul((dst&0x00ff00ff)-coll,d)>>>8)+coll)&0x00ff00ff)+
							                ((Math.imul(((dst&0xff00ff00)>>>8)-colh2,d)+colh)&0xff00ff00);
						}
					}
					d2+=2*dx+1;
					dx++;
				}
				// PhyAssert(maxx>=dw*miny+dw || d2>=rad2,[d2,rad2]);
			}
		}
	}


	update(time) {
		// Restrict our FPS to [fps/2,fps].
		let delta=(time-this.frameprev)/1000;
		if (delta>this.frametime || !(delta>0)) {delta=this.frametime;}
		else if (delta<0.5*this.frametime) {return true;}
		this.frameprev=time;
		let starttime=performance.now();
		let input=this.input;
		input.update();
		let draw=this.draw;
		let scale=this.draw.img.height;
		let world=this.world;
		world.update(delta);
		draw.fill(0,0,0,255);
		// Convert mouse to world space.
		let mpos=input.getmousepos();
		let maxx=draw.img.width/draw.img.height;
		this.mouse[0]=(mpos[0]/draw.img.width)*maxx;
		this.mouse[1]=mpos[1]/draw.img.height;
		// Move the player.
		let player=this.playeratom;
		let dir=this.mouse.sub(player.pos);
		let mag=dir.sqr();
		if (mag<Infinity) {
			this.promptshow=0;
			player.vel=dir.mul(mag>1e-6?0.2/delta:0);
		}
		let link=world.atomlist.head;
		while (link!==null) {
			let atom=link.obj;
			link=link.next;
			if (atom.delete!==undefined) {
				atom.release();
			}
		}
		/*
		let link=world.atomlist.head;
		while (link!==null) {
			let atom=link.obj;
			let type=atom.type;
			let data=atom.userdata;
			let vel=atom.vel.mag();
			data.velcolor*=0.99;
			if (data.velcolor<vel) {
				data.velcolor=vel;
			}
			let pos=atom.pos;
			let rad=atom.rad*scale+0.25;
			let r,g,b;
			if (data.isparticle) {
				let u=data.velcolor*(256*4);
				u=Math.floor(u<255?u:255);
				r=u;
				g=0;
				b=255-u;
				data.r=r;
				data.g=g;
				data.b=b;
			} else {
				//r=data.r;
				//g=data.g;
				//b=data.b;
			}
			draw.setcolor(r,g,b,255);
			fastcircle(draw,pos[0]*scale,pos[1]*scale,rad);
			//draw.filloval(pos[0]*scale,pos[1]*scale,rad,rad);
			let next=link.next;
			if (atom.delete!==undefined) {
				atom.release();
			}
			link=next;
		}
		*/
		this.distancefill();
		if (this.promptshow!==0) {
			let pframe=(this.promptframe+1)%120;
			this.promptframe=pframe;
			let px=player.pos[0]*scale;
			let py=player.pos[1]*scale;
			let rad=player.rad*scale+0.25;
			let u=Math.floor((Math.sin((pframe/119.0)*Math.PI*2)+1.0)*0.5*255.0);
			draw.setcolor(u,u,255,255);
			draw.filloval(px,py,rad,rad);
		}
		// Draw the HUD.
		draw.setcolor(255,255,255,255);
		draw.filltext(5,5,"time : "+this.framestr+"\ncount: "+world.atomlist.count,20);
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

}

window.addEventListener("load",()=>{new PhyScene("democanv");});
