/*------------------------------------------------------------------------------


demo.js - v1.03

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Demo for physics.js


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------


function fastcircle(draw,x,y,rad) {
	// Manually draw a circle pixel by pixel.
	// This is ugly, but it's faster than canvas.arc and drawimage.
	let imgdata32=draw.img.data32;
	let imgwidth=draw.img.width;
	let imgheight=draw.img.height;
	rad-=0.5;
	if (rad<=0 || x-rad>imgwidth || x+rad<0 || y-rad>imgheight || y+rad<0) {
		return;
	}
	let colrgba=draw.rgba32[0];
	let coll=(colrgba&0x00ff00ff)>>>0;
	let colh=(colrgba&0xff00ff00)>>>0;
	let colh2=colh>>>8;
	let minx=Math.floor(x-rad-0.5);
	if (minx<0) {minx=0;}
	let maxx=Math.ceil(x+rad+0.5);
	if (maxx>imgwidth) {maxx=imgwidth;}
	let xs=Math.floor(x);
	if (xs< minx) {xs=minx;}
	if (xs>=maxx) {xs=maxx-1;}
	let miny=Math.floor(y-rad-0.5);
	if (miny<0) {miny=0;}
	let maxy=Math.ceil(y+rad+0.5);
	if (maxy>imgheight) {maxy=imgheight;}
	let pixrow=miny*imgwidth;
	let d,d2,dst;
	let pixmin,pixmax,pix;
	let dx,dy=miny-y+0.5;
	let rad20=rad*rad;
	let rad21=(rad+1)*(rad+1);
	let imul=Math.imul,sqrt=Math.sqrt;
	// let rnorm=256.0/(rad21-rad20);
	for (let y0=miny;y0<maxy;y0++) {
		dx=xs-x+0.5;
		d2=dy*dy+dx*dx;
		pixmax=pixrow+maxx;
		pix=pixrow+xs;
		while (d2<rad20 && pix<pixmax) {
			imgdata32[pix++]=colrgba;
			d2+=dx+dx+1;
			dx++;
		}
		while (d2<rad21 && pix<pixmax) {
			d=((sqrt(d2)-rad)*256)|0;
			// d=(d2-rad20)*rnorm|0;
			dst=imgdata32[pix];
			imgdata32[pix]=(((imul((dst&0x00ff00ff)-coll,d)>>>8)+coll)&0x00ff00ff)+
			               ((imul(((dst&0xff00ff00)>>>8)-colh2,d)+colh)&0xff00ff00);
			pix++;
			d2+=dx+dx+1;
			dx++;
		}
		dx=xs-x-0.5;
		d2=dy*dy+dx*dx;
		pixmin=pixrow+minx;
		pix=pixrow+(xs-1);
		while (d2<rad20 && pix>=pixmin) {
			imgdata32[pix--]=colrgba;
			d2-=dx+dx-1;
			dx--;
		}
		while (d2<rad21 && pix>=pixmin) {
			d=((sqrt(d2)-rad)*256)|0;
			// d=(d2-rad20)*rnorm|0;
			dst=imgdata32[pix];
			imgdata32[pix]=(((imul((dst&0x00ff00ff)-coll,d)>>>8)+coll)&0x00ff00ff)+
			               ((imul(((dst&0xff00ff00)>>>8)-colh2,d)+colh)&0xff00ff00);
			pix--;
			d2-=dx+dx-1;
			dx--;
		}
		pixrow+=imgwidth;
		dy++;
	}
}


class PhyScene {

	constructor(divid) {
		// Setup the canvas
		let drawwidth=600;
		let drawheight=1066;
		let canvas=document.getElementById(divid);
		canvas.width=drawwidth;
		canvas.height=drawheight;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.draw=new Draw(drawwidth,drawheight);
		this.input=new Input(canvas);
		this.input.disablenav();
		this.mouse=new Vector(2);
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
		let ratio  =canvas.height/canvas.width;
		let elem   =canvas;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem!==null) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		let pscale =1;// window.devicePixelRatio;
		let width  =Math.floor(pscale*(window.innerWidth));// -offleft));
		let height =Math.floor(pscale*(window.innerHeight-offtop));
		if (width*ratio<height) {
			height=Math.floor(width*ratio);
		} else {
			width =Math.floor(height/ratio);
		}
		canvas.style.width =width +"px";
		canvas.style.height=height+"px";
	}


	initworld() {
		this.world=new PhyWorld(2);
		let canvas=this.canvas;
		let world=this.world;
		world.maxsteptime=1/180;
		world.gravity.set([0,0.1]);
		let viewheight=1.0,viewwidth=canvas.width/canvas.height;
		// let walltype=world.createatomtype(1.0,Infinity,1.0);
		let normtype=world.createatomtype(0.01,1.0,0.98);
		let boxtype=world.createatomtype(0.0,2.0,1.0);
		boxtype.isbox=true;
		let rnd=new Random(2);
		let pos=new Vector(world.dim);
		for (let p=0;p<3000;p++) {
			pos[0]=rnd.getf()*viewwidth;
			pos[1]=rnd.getf()*viewheight;
			world.createatom(pos,0.004,normtype);
		}
		world.createbox([0.3*viewwidth,0.3],5,0.007,boxtype);
		world.createbox([0.5*viewwidth,0.5],5,0.007,boxtype);
		world.createbox([0.7*viewwidth,0.3],5,0.007,boxtype);
		world.bndmin=new Vector([0,0]);
		world.bndmax=new Vector([viewwidth,1]);
		let playertype=world.createatomtype(0.0,Infinity,0.1);
		playertype.bound=false;
		playertype.gravity=new Vector([0,0]);
		pos.set([viewwidth*0.5,viewheight*0.33]);
		this.playeratom=world.createatom(pos,0.035,playertype);
		this.mouse.set(pos);
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
			let type=atom.type;
			let data=atom.userdata;
			if (data===undefined || data===null) {
				data={velcolor:0};
				atom.userdata=data;
			}
			let vel=atom.vel.mag();
			data.velcolor*=0.99;
			if (data.velcolor<vel) {
				data.velcolor=vel;
			}
			let pos=atom.pos;
			let rad=atom.rad*scale+0.25;
			let r,g,b;
			if (type.isbox) {
				r=64;
				g=200;
				b=0;
			} else {
				let u=data.velcolor*(256*4);
				u=Math.floor(u<255?u:255);
				r=u;
				g=0;
				b=255-u;
			}
			draw.setcolor(r,g,b,255);
			fastcircle(draw,pos[0]*scale,pos[1]*scale,rad);
			// draw.filloval(pos[0]*scale,pos[1]*scale,rad,rad);
			let next=link.next;
			if (atom.delete!==undefined) {
				atom.release();
			}
			link=next;
		}
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
