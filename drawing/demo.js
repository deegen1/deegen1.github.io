/*------------------------------------------------------------------------------


demo.js - v1.15

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint demo.js -c ../../standards/eslint.js */


import {Env,Random,Transform,Input} from "./library.js";
import {Draw} from "./drawing.js";


//---------------------------------------------------------------------------------
// Stress Tests


export class DrawPerf {

	constructor() {
		let canvas=document.getElementById("perfcanvas");
		this.canvas=canvas;
		this.conout=document.getElementById("perftable");
		this.tests=11;
		this.clipdim=60;
		this.clippad=4;
		canvas.width=this.clipdim*4+this.clippad*3;
		canvas.height=this.clipdim*2+this.clippad*1;
		canvas.style.width="95%";
		canvas.style.imageRendering="pixelated";
		this.draw=new Draw(canvas.width,canvas.height);
		this.draw.screencanvas(canvas);
		this.restart();
	}


	restart() {
		this.draw.fill(0,0,0,0);
		this.draw.screenflip();
		this.baseline=0;
		let out=this.conout;
		out.innerHTML="<br>".repeat(this.tests);
		out.style.minHeight=(out.clientHeight*1.01)+"px";
		out.innerHTML="";
		this.log("starting tests");
		if (!this.test) {
			this.test=0;
			let state=this;
			function update() {
				if (state.update()) {
					requestAnimationFrame(update);
				}
			}
			update();
		} else {
			this.test=0;
		}
	}


	log(str) {
		// console.log(str);
		this.conout.innerHTML+=str+"<br>";
	}


	copylog() {
		let text=this.conout.innerText;
		text=text.replace("starting tests\n","");
		text=text.replace("done\n","");
		navigator.clipboard.writeText(text);
	}


	drawcircle1(x,y,rad) {
		// Manually draw a circle pixel by pixel.
		// This is ugly, but it's faster than canvas.arc and drawimage.
		let imgdata=this.draw.img.data32;
		let imgwidth=this.draw.img.width;
		let imgheight=this.draw.img.height;
		x=x|0;
		y=y|0;
		rad=rad|0;
		if (rad<=0 || x-rad>imgwidth || x+rad<0 || y-rad>imgheight || y+rad<0) {
			return;
		}
		if (this.drawcircle1.bndarr===undefined) {
			this.drawcircle1.bndarr=[];
		}
		let bnd=this.drawcircle1.bndarr[rad];
		// For a given radius, precalculate how many pixels we need to fill along each row.
		if (bnd===undefined) {
			bnd=new Array(rad*2);
			for (let ly=0;ly<rad*2;ly++) {
				let y0=ly-rad+0.5;
				let lx=Math.sqrt(rad*rad-y0*y0)|0;
				let mindist=Infinity;
				let mx=lx;
				for (let x0=-2;x0<=2;x0++) {
					let x1=lx+x0;
					let dist=Math.abs(rad-Math.sqrt(x1*x1+y0*y0));
					if (mindist>dist && lx+x0>0) {
						mindist=dist;
						mx=lx+x0;
					}
				}
				bnd[ly]=mx;
			}
			this.drawcircle1.bndarr[rad]=bnd;
		}
		// Plot the pixels.
		let miny=y-rad;
		let maxy=y+rad;
		miny=miny>0?miny:0;
		maxy=maxy<imgheight?maxy:imgheight;
		let bndy=miny-y+rad;
		miny*=imgwidth;
		maxy*=imgwidth;
		let rgba=this.draw.rgba32[0];
		while (miny<maxy) {
			let maxx=bnd[bndy++];
			let minx=x-maxx;
			maxx+=x;
			minx=(minx>0?minx:0)+miny;
			maxx=(maxx<imgwidth?maxx:imgwidth)+miny;
			while (minx<maxx) {
				imgdata[minx++]=rgba;
			}
			miny+=imgwidth;
		}
	}


	drawcircle2(x,y,rad) {
		// Manually draw a circle pixel by pixel.
		// This is ugly, but it's faster than canvas.arc and drawimage.
		let imgdata=this.draw.img.data32;
		let imgwidth=this.draw.img.width;
		let imgheight=this.draw.img.height;
		if (rad<=0 || x-rad>imgwidth || x+rad<0 || y-rad>imgheight || y+rad<0) {
			return;
		}
		let colrgba=this.draw.rgba32[0];
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
		let dy=miny-y+0.5;
		let rad20=rad*rad;
		let rad21=(rad+1)*(rad+1);
		let imul=Math.imul,sqrt=Math.sqrt;
		// let rnorm=256.0/(rad21-rad20);
		for (let y0=miny;y0<maxy;y0++) {
			let dx=xs-x+0.5;
			let d2=dy*dy+dx*dx;
			let pixmax=pixrow+maxx;
			let pix=pixrow+xs;
			while (d2<rad20 && pix<pixmax) {
				imgdata[pix++]=colrgba;
				d2+=dx+dx+1;
				dx++;
			}
			while (d2<rad21 && pix<pixmax) {
				let d=((sqrt(d2)-rad)*256)|0;
				// d=(d2-rad20)*rnorm|0;
				let dst=imgdata[pix];
				imgdata[pix]=(((imul((dst&0x00ff00ff)-coll,d)>>>8)+coll)&0x00ff00ff)+
					        ((imul(((dst&0xff00ff00)>>>8)-colh2,d)+colh)&0xff00ff00);
				pix++;
				d2+=dx+dx+1;
				dx++;
			}
			dx=xs-x-0.5;
			d2=dy*dy+dx*dx;
			let pixmin=pixrow+minx;
			pix=pixrow+(xs-1);
			while (d2<rad20 && pix>=pixmin) {
				imgdata[pix--]=colrgba;
				d2-=dx+dx-1;
				dx--;
			}
			while (d2<rad21 && pix>=pixmin) {
				let d=((sqrt(d2)-rad)*256)|0;
				// d=(d2-rad20)*rnorm|0;
				let dst=imgdata[pix];
				imgdata[pix]=(((imul((dst&0x00ff00ff)-coll,d)>>>8)+coll)&0x00ff00ff)+
					        ((imul(((dst&0xff00ff00)>>>8)-colh2,d)+colh)&0xff00ff00);
				pix--;
				d2-=dx+dx-1;
				dx--;
			}
			pixrow+=imgwidth;
			dy++;
		}
	}


	drawline(x0,y0,x1,y1) {
		// Draw a line from [x0,y0]->(x1,y1).
		x0|=0;
		y0|=0;
		x1|=0;
		y1|=0;
		let imgdata=this.draw.img.data32;
		let width=this.draw.img.width-1;
		let height=this.draw.img.height-1;
		// If we're obviously outside the image, abort.
		if ((x0<0 && x1<0) || (x0>width && x1>width) || (y0<0 && y1<0) || (y0>height && y1>height) || (x0===x1 && y0===y1) || width<0 || height<0) {
			return;
		}
		let mulx=1;
		let muly=width+1;
		let dst=y0*muly+x0;
		// Flip the image along its axii so that x0<=x1 and y0<=y1.
		if (x1<x0) {
			x0=width-x0;
			x1=width-x1;
			mulx=-mulx;
		}
		if (y1<y0) {
			y0=height-y0;
			y1=height-y1;
			muly=-muly;
		}
		// Flip the image along its diagonal so that dify<difx.
		let difx=x1-x0;
		let dify=y1-y0;
		if (difx<dify) {
			let t=x0;
			x0=y0;
			y0=t;
			t=x1;
			x1=y1;
			y1=t;
			t=difx;
			difx=dify;
			dify=t;
			t=mulx;
			mulx=muly;
			muly=t;
			t=width;
			width=height;
			height=t;
		}
		// Calculate the clipped coordinates and length.
		let off=difx;
		let len=difx;
		dify+=dify;
		difx+=difx;
		if (x1>width || y1>height) {
			len=(height-y0)*difx+off+dify-1;
			let dif=width+1-x0;
			len=len<dif*dify?Math.floor(len/dify):dif;
		}
		if (x0<0 || y0<0) {
			let move=y0*difx+off-dify+1;
			move=move<x0*dify?Math.floor(move/dify):x0;
			off-=move*dify;
			let movey=Math.floor(off/difx);
			off=difx-(off%difx);
			if (x0<move || x0-move>width || y0+movey<0 || y0+movey>height) {
				return;
			}
			dst+=movey*muly-move*mulx;
			len+=move;
		}
		off--;
		let colrgba=this.draw.rgba32[0];
		let coll=(colrgba&0x00ff00ff)>>>0;
		let colh=(colrgba&0xff00ff00)>>>0;
		let colh2=colh>>>8;
		let alpha=Math.floor(this.draw.rgba[3]*(256/255));
		while (len-->0) {
			if (off<0) {
				dst+=muly;
				off+=difx;
			}
			off-=dify;
			if (alpha>=256) {
				imgdata[dst]=colrgba;
			} else {
				let tmp=imgdata[dst];
				imgdata[dst]=(((Math.imul((tmp&0x00ff00ff)-coll,alpha)>>>8)+coll)&0x00ff00ff)+
					        ((Math.imul(((tmp&0xff00ff00)>>>8)-colh2,alpha)+colh)&0xff00ff00);
			}
			dst+=mulx;
		}
	}


	update() {
		let rnd=new Random(10);
		let test=this.test++;
		let tests=-1;
		// Fill the background with static.
		let draw=this.draw;
		draw.pushstate();
		let imgw=1000,imgh=1000;
		let tmpimg=new Draw.Image(imgw,imgh);
		draw.setimage(tmpimg);
		let data32=draw.img.data32,datalen=data32.length;
		for (let i=0;i<datalen;i++) {data32[i]=rnd.getu32();}
		let t0=performance.now();
		let tstop=t0+1000;
		let pixels=0;
		if (test<4) {
			// Baseline.
			for (tests=0;(tests&0x1ff)!==0 || performance.now()<tstop;tests++) {
				draw.rgba32[0]=rnd.getu32();
				let rad=rnd.getf()*16;
				pixels+=rad*rad;
				let x=rnd.getf()*(imgw-rad*2)+rad;
				let y=rnd.getf()*(imgh-rad*2)+rad;
				switch (test) {
					case 0:
						// Baseline
						draw.defpath.vertidx=0;
						draw.fillpath();
						break;
					case 1:
						// Aliased
						this.drawcircle1(x,y,rad);
						break;
					case 2:
						// Smooth
						this.drawcircle2(x,y,rad);
						break;
					case 3:
						// Bezier
						draw.filloval(x,y,rad,rad);
						break;
					default:
						break;
				}
			}
			pixels*=Math.PI;
		} else if (test===4) {
			// Rectangles.
			for (tests=0;(tests&0x1ff)!==0 || performance.now()<tstop;tests++) {
				draw.rgba32[0]=rnd.getu32();
				let w=rnd.getf()*16;
				let h=rnd.getf()*16;
				let x=rnd.getf()*(imgw-w);
				let y=rnd.getf()*(imgh-h);
				pixels+=w*h;
				draw.fillrect(x,y,w,h);
			}
		} else if (test===5) {
			// Cached image circles.
			draw.setcolor(255,255,255,255);
			draw.pushstate();
			let rad=16;
			let cache=new Draw.Image(2*rad,2*rad);
			draw.setimage(cache);
			draw.filloval(rad,rad,rad,rad);
			draw.popstate();
			for (tests=0;(tests&0x1ff)!==0 || performance.now()<tstop;tests++) {
				draw.rgba32[0]=rnd.getu32();
				let x=rnd.getf()*(imgw-2*cache.width)+cache.width;
				let y=rnd.getf()*(imgh-2*cache.height)+cache.height;
				draw.drawimage(cache,x,y);
			}
			pixels+=tests*cache.width*cache.height;
		} else if (test<8) {
			// Lines.
			for (tests=0;(tests&0x1ff)!==0 || performance.now()<tstop;tests++) {
				draw.rgba32[0]=rnd.getu32();
				let x0=rnd.getf()*imgw;
				let y0=rnd.getf()*imgh;
				let x1=rnd.getf()*imgw;
				let y1=rnd.getf()*imgh;
				let dx=x1-x0,dy=y1-y0;
				pixels+=Math.sqrt(dx*dx+dy*dy);
				switch (test) {
					case 6:
						// Aliased lines.
						this.drawline(x0,y0,x1,y1);
						break;
					case 7:
						// Anti-aliased lines.
						draw.drawline(x0,y0,x1,y1);
						break;
					default:
						break;
				}
			}
		} else if (test===8) {
			// Text.
			let text=" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~█";
			let rect=draw.textrect("@",16);
			let textw=imgw-rect.w,texth=imgh-rect.h;
			let area=rect.w*rect.h;
			for (tests=0;(tests&0x1ff)!==0 || performance.now()<tstop;tests++) {
				draw.rgba32[0]=rnd.getu32();
				let x=rnd.getf()*textw;
				let y=rnd.getf()*texth;
				let c=tests%text.length;
				draw.filltext(x,y,text[c],16);
				pixels+=area;
			}
		} else {
			// Done.
			this.log("done");
			this.test=0;
			return false;
		}
		const ns=1000000000;
		t0=(performance.now()-t0)*ns/1000;
		if (test===0) {
			t0/=tests;
			this.baseline=t0;
		} else {
			t0=(t0-this.baseline*tests)/pixels;
		}
		let unit=test?"px":"call";
		let names=["Baseline","Oval alias","Oval smooth","Oval path","Rect path","Image cache","Line alias","Line path","Text path"];
		this.log(names[test].padEnd(11)+": "+t0.toFixed(3).padStart(6," ")+" ns/"+unit);
		draw.popstate();
		// Draw preview.
		if (!test) {return true;}
		let dim=this.clipdim,pad=this.clippad;
		let img=new Draw.Image(dim,dim);
		draw.setcolor(255,255,255,255);
		draw.pushstate();
		draw.setimage(img);
		draw.fill(0,0,0,255);
		let cen=Math.floor(dim/2);
		let rad=dim*0.40;
		if (test===1) {
			this.drawcircle1(cen,cen,rad);
		} else if (test===2) {
			this.drawcircle2(cen,cen,rad);
		} else if (test===3) {
			draw.filloval(cen,cen,rad,rad);
		} else if (test===4) {
			draw.fillrect(cen-rad,cen-rad,rad*2,rad*2);
		} else if (test===5) {
			draw.beginpath();
			let arc=Math.PI*2/10;
			for (let i=1.5;i<10;i+=2) {
				let a0=i*arc,a1=a0+arc;
				draw.lineto(Math.cos(a0)*rad+cen,Math.sin(a0)*rad+cen);
				draw.lineto(Math.cos(a1)*rad*0.5+cen,Math.sin(a1)*rad*0.5+cen);
			}
			draw.closepath();
			draw.fillpath();
		} else if (test===6) {
			this.drawline(dim*0.1,dim*0.1,dim*0.9,dim*0.9);
			this.drawline(dim*0.1,dim*0.9,dim*0.9,dim*0.1);
		} else if (test===7) {
			draw.drawline(dim*0.1,dim*0.1,dim*0.9,dim*0.9);
			draw.drawline(dim*0.1,dim*0.9,dim*0.9,dim*0.1);
		} else if (test===8) {
			let rect=draw.textrect("@",dim*0.8);
			draw.filltext((dim-rect.w)*0.5,dim*0.1,"@",dim*0.8);
		}
		// Sunset color palette.
		let col0=[1.00,0.83,0.10];
		let col1=[0.55,0.12,1.00];
		let ih=img.height,ipos=0,idata=img.data8;
		for (let y=0;y<ih;y++) {
			let u=y/(ih-1);
			let r=col0[0]*(1-u)+col1[0]*u;
			let g=col0[1]*(1-u)+col1[1]*u;
			let b=col0[2]*(1-u)+col1[2]*u;
			let istop=ipos+img.width*4;
			while (ipos<istop) {
				idata[ipos++]*=r;
				idata[ipos++]*=g;
				idata[ipos++]*=b;
				ipos++;
			}
		}
		draw.popstate();
		let winx=((test-1)%4)*(dim+pad),winy=Math.floor((test-1)/4)*(dim+pad);
		draw.drawimage(img,winx,winy);
		draw.screenflip();
		return true;
	}

}


export function PerformanceTest() {
	if (PerformanceTest.obj===undefined) {
		let out=document.getElementById("perfdisplay");
		out.style.display="";
		PerformanceTest.obj=new DrawPerf();
	} else {
		PerformanceTest.obj.restart();
	}
}


export function PerformanceCopy() {
	PerformanceTest.obj.copylog();
}


//---------------------------------------------------------------------------------
// Starfield


export class DrawDemo {


	constructor(canvasid) {
		// Swap the <div> with <canvas>
		let canv=document.getElementById(canvasid);
		let dw=1000,dh=400;
		canv.width=dw;
		canv.height=dh;
		this.canvas=canv;
		this.input=new Input(canv);
		this.draw=new Draw(canv);
		let rnd=new Random();
		this.rnd=rnd;
		this.stararr=Array.from({length:1000},_=>({
			x:rnd.getf()*1.5*dw,
			y:(rnd.getf()*1.1-0.05)*dh,
			t:rnd.mod(2)
		}));
		this.star=new Draw.Path(`
			M.476.155.951-.309.294-.405 0-1-.294-.405-.951
			-.309-.476.155-.588.809 0 .5.588.809Z
		`);
		this.particles=Array.from({length:300},_=>({
			x:-100,
			y:-100,
			dx:0,
			dy:0,
			age:rnd.getf()*1.5
		}));
		this.frameprev=0;
		this.framesum=0;
		this.framestr="FPS: 0";
		this.frames=0;
		let state=this;
		function update(time) {
			state.update(time);
			requestAnimationFrame(update);
		}
		requestAnimationFrame(update);
	}


	update(frametime) {
		// Get the timestep. Prevent steps that are too large.
		let dt=frametime-this.frameprev;
		this.frameprev=frametime;
		if (!Env.IsVisible(this.canvas)) {return true;}
		dt=dt>0?dt*0.001:0;
		this.framesum+=dt;
		dt=dt<0.05?dt:0.05;
		let draw=this.draw;
		let dw=draw.img.width,dh=draw.img.height;
		let rnd=this.rnd;
		// Handle player input.
		let input=this.input;
		input.update();
		let [mx,my]=input.getmousepos();
		mx=mx>0 ?mx:0 ;
		mx=mx<dw?mx:dw;
		my=my>0 ?my:0 ;
		my=my<dh?my:dh;
		// Draw the parallaxing background.
		draw.fill(0,0,0,255);
		draw.setcolor(0x0000ffff);
		for (let star of this.stararr) {
			let x=star.x,y=star.y,t=star.t;
			x-=dw*(t?0.09:0.05)*dt;
			if (x<-2) {
				x=(rnd.getf()*0.5+1.01)*dw;
				y=(rnd.getf()*1.1-0.05)*dh;
				t=rnd.mod(2);
				star.y=y;
				star.t=t;
			}
			star.x=x;
			if (!t) {draw.fillrect(x-1.5,y-1.5,3,3);}
		}
		draw.setcolor(0xff0000ff);
		for (let star of this.stararr) {
			if (star.t) {draw.fillrect(star.x-1.5,star.y-1.5,3,3);}
		}
		// Draw particles.
		let path=new Draw.Path();
		for (let part of this.particles) {
			part.x+=part.dx*dt;
			part.y+=part.dy*dt;
			part.age+=dt;
			let u=part.age/1.5;
			if (u>1.0) {
				let ang=rnd.getf()*Math.PI*2;
				part.x=mx+Math.cos(ang)*10;
				part.y=my+Math.sin(ang)*10;
				ang=Math.PI-(rnd.getf()*2-1)*Math.PI*0.05;
				part.dx=Math.cos(ang)*0.2*dw;
				part.dy=Math.sin(ang)*0.2*dw;
				part.age=rnd.getf()*0.2;
			}
			draw.setcolor((1-u)*255,(1-u)*255,u*255,(1-u)*255);
			// Trailing explosions.
			path.begin();
			let r1=u*2+0.25,r2=u*r1;
			path.addoval(0,0,r1,r1);
			path.addoval(r1-r2,0,-r2,r2);
			let ang=Math.atan2(-part.dy,-part.dx);
			draw.fillpath(path,{scale:5,ang:ang,vec:[part.x,part.y]});
			//draw.filloval(part.x,part.y,5,5);
		}
		// Draw player.
		let ang=performance.now()/1500;
		draw.setcolor(0xff8000ff);
		draw.fillpath(this.star,{vec:[mx,my],scale:40,ang:ang});
		// Display FPS.
		draw.setcolor(0xffffffff);
		draw.filltext(5,5,this.framestr,16);
		this.draw.screenflip();
		// Calculate the frame time.
		if (++this.frames>=100) {
			let avg=(this.frames/this.framesum);
			this.framestr="FPS: "+avg.toFixed(2);
			this.frames=0;
			this.framesum=0;
		}
		return true;
	}

}


//---------------------------------------------------------------------------------
// Other Demos


export class OBBDemo {

	constructor(canvasid) {
		// Swap the <div> with <canvas>
		let canvas=document.getElementById(canvasid);
		this.canvas=canvas;
		canvas.width=canvas.clientWidth;
		canvas.height=Math.round(canvas.width*4/5);
		this.draw=new Draw(canvas);
		this.frametime=0;
		this.angle=0;
		this.backrgb=Env.GetCSSRGBA("--diag-high").slice(0,3);
		let scale=canvas.width/4390;
		this.path=new Draw.Path(`
			M513 255v70H434c69 91 16 261-160 261-46 0-74-7-105-23-58 79 12 97 41 98l145 5c87
			3 156 49 156 123 0 101-92 165-243 165-119 0-222-33-222-128 0-58 35-90 68-114-50
			-24-80-101 2-188-97-106-16-324 217-269ZM269 522c143 0 143-212 0-212-141 0-141
			212 0 212ZM191 735c-23 16-54 39-54 82 0 51 53 69 139 69 104 0 143-40 143-87 0-45
			-46-57-98-59Z
		`,{scale:scale,pos:[-553*scale*.5,-200*scale]});
		let state=this;
		function update(time) {
			state.update(time);
			requestAnimationFrame(update);
		}
		requestAnimationFrame(update);
	}


	img_path_collide(img_aabb,path_aabb,trans) {
		// Transform the path AABB to an OBB.
		// new_x = x*matxx + y*matxy + matx
		// new_y = x*matyx + y*matyy + maty
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0];
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1];
		let imgx=img_aabb.minx,imgy=img_aabb.miny;
		let imgw=img_aabb.maxx-imgx,imgh=img_aabb.maxy-imgy;
		// Define the transformed bounding box.
		let bx=path_aabb.minx,by=path_aabb.miny;
		let bndx=bx*matxx+by*matxy+matx-imgx;
		let bndy=bx*matyx+by*matyy+maty-imgy;
		bx=path_aabb.maxx-bx;by=path_aabb.maxy-by;
		let bndxx=bx*matxx,bndxy=bx*matyx;
		let bndyx=by*matxy,bndyy=by*matyy;
		// Test if the image AABB has a separating axis.
		let minx=bndx-imgw,maxx=bndx;
		if (bndxx<0) {minx+=bndxx;} else {maxx+=bndxx;}
		if (bndyx<0) {minx+=bndyx;} else {maxx+=bndyx;}
		if (!(minx<0 && 0<maxx)) {return false;}
		let miny=bndy-imgh,maxy=bndy;
		if (bndxy<0) {miny+=bndxy;} else {maxy+=bndxy;}
		if (bndyy<0) {miny+=bndyy;} else {maxy+=bndyy;}
		if (!(miny<0 && 0<maxy)) {return false;}
		// Test if the path OBB has a separating axis.
		let cross=bndxx*bndyy-bndxy*bndyx;
		minx=bndy*bndxx-bndx*bndxy;maxx=minx;
		bndxx*=imgh;bndxy*=imgw;
		if (cross<0) {minx+=cross;} else {maxx+=cross;}
		if (bndxx<0) {maxx-=bndxx;} else {minx-=bndxx;}
		if (bndxy<0) {minx+=bndxy;} else {maxx+=bndxy;}
		if (!(minx<0 && 0<maxx)) {return false;}
		miny=bndy*bndyx-bndx*bndyy;maxy=miny;
		bndyx*=imgh;bndyy*=imgw;
		if (cross<0) {maxy-=cross;} else {miny-=cross;}
		if (bndyx<0) {maxy-=bndyx;} else {miny-=bndyx;}
		if (bndyy<0) {miny+=bndyy;} else {maxy+=bndyy;}
		if (!(miny<0 && 0<maxy)) {return false;}
		return true;
	}


	aabbdraw(aabb,trans) {
		let arr=[
			[aabb.minx,aabb.miny],
			[aabb.maxx,aabb.miny],
			[aabb.maxx,aabb.maxy],
			[aabb.minx,aabb.maxy]
		];
		if (trans) {
			for (let i=0;i<4;i++) {arr[i]=trans.apply(arr[i]);}
		}
		for (let i=0;i<4;i++) {
			let a=arr[i],b=arr[(i+1)%4];
			this.draw.drawline(a[0],a[1],b[0],b[1]);
		}
	}


	update(frametime) {
		// Get the timestep. Prevent steps that are too large.
		let dt=(frametime-this.frametime)*0.001;
		dt=dt>0?dt:0;
		dt=dt<1?dt:1;
		let angle=(this.angle+dt*Math.PI*0.6)%(2*Math.PI);
		this.angle=angle;
		this.frametime=frametime;
		if (!Env.IsVisible(this.canvas)) {return;}
		let draw=this.draw;
		let scale=draw.img.width;
		draw.fill(0,0,0,255);
		draw.linewidth=0.004*scale;
		let path=this.path;
		let trans=new Transform({pos:[0.84*scale,0.16*scale],ang:angle});
		let imgaabb={minx:0.2*scale,miny:0.2*scale,maxx:0.8*scale,maxy:0.6*scale};
		draw.setcolor(this.backrgb);
		draw.filltext(0.43*scale,0.38*scale,"image",0.048*scale);
		this.aabbdraw(imgaabb);
		this.aabbdraw(path,trans);
		if (this.img_path_collide(imgaabb,path,trans)) {
			draw.setcolor(255,255,255);
		}
		draw.fillpath(path,trans);
		draw.screenflip();
	}

}


export class CurveDemo {

	constructor(canvasid) {
		// Swap the <div> with <canvas>
		let canvas=document.getElementById(canvasid);
		this.canvas=canvas;
		canvas.width=canvas.clientWidth;
		canvas.height=Math.round(canvas.width*0.55);
		this.draw=new Draw(canvas);
		this.frameprev=0;
		this.frametime=0;
		this.frame=-1;
		this.frames=14;
		let state=this;
		function update(time) {
			state.update(time);
			requestAnimationFrame(update);
		}
		requestAnimationFrame(update);
	}


	update(frametime) {
		// Get the timestep. Prevent steps that are too large.
		let dt=(frametime-this.frameprev)*0.001;
		this.frameprev=frametime;
		dt=dt>0?dt:0;
		dt=dt<1?dt:1;
		let time=this.frametime+dt;
		let frames=this.frames;
		let endtime=1,midtime=0.3,maxtime=endtime*3+(frames-2)*midtime;
		time=time>maxtime?0:time;
		this.frametime=time;
		if (!Env.IsVisible(this.canvas)) {return;}
		let frame=Math.ceil((time-endtime)/midtime);
		frame=frame>0?frame:0;
		frame=frame<frames?frame:(frames-1);
		if (this.frame===frame) {return;}
		this.frame=frame;
		let draw=this.draw;
		let scale=draw.img.width*0.000840;
		let trans=new Transform({scale:scale,pos:[97*scale,488*scale]});
		draw.fill(0,0,0,255);
		let outline=new Draw.Path('M -5 0 C 275 -343 768 -607 1005 0 L 995 0 C 758 -597 284 -333 5 0 Z');
		draw.settransform(trans);
		draw.setcolor(Env.GetCSSRGBA("--diag-high").slice(0,3));
		draw.fillpath(outline);
		let segs=1;
		let segarr=[{x0:0,y0:0,x2:280,y2:-338,x3:763,y3:-602,x1:1000,y1:0}];
		while (segs<=frame) {
			// Find the farthest segment.
			let maxdist=0,maxseg=0;
			for (let s=0;s<segs;s++) {
				let l=segarr[s];
				let c3x=l.x1,c2x=l.x3,c1x=l.x2,c0x=l.x0;
				let c3y=l.y1,c2y=l.y3,c1y=l.y2,c0y=l.y0;
				let dx=c3x-c0x,dy=c3y-c0y,den=dx*dx+dy*dy;
				// Test if both control points are close to the line c0->c3.
				// Clamp to ends and filter degenerates.
				let lx=c1x-c0x,ly=c1y-c0y;
				let u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d1=lx*lx+ly*ly;
				lx=c2x-c0x;ly=c2y-c0y;
				u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d2=lx*lx+ly*ly;
				d1=d1>d2?d1:d2;
				if (maxdist<d1) {
					maxdist=d1;
					maxseg=s;
				}
			}
			// Split
			let l=segarr[maxseg];
			let c3x=l.x1,c2x=l.x3,c1x=l.x2,c0x=l.x0;
			let c3y=l.y1,c2y=l.y3,c1y=l.y2,c0y=l.y0;
			let l1x=(c0x+c1x)*0.5,l1y=(c0y+c1y)*0.5;
			let t1x=(c1x+c2x)*0.5,t1y=(c1y+c2y)*0.5;
			let r2x=(c2x+c3x)*0.5,r2y=(c2y+c3y)*0.5;
			let l2x=(l1x+t1x)*0.5,l2y=(l1y+t1y)*0.5;
			let r1x=(t1x+r2x)*0.5,r1y=(t1y+r2y)*0.5;
			let phx=(l2x+r1x)*0.5,phy=(l2y+r1y)*0.5;
			l.x1=phx;l.x3=l2x;l.x2=l1x;
			l.y1=phy;l.y3=l2y;l.y2=l1y;
			l={x1:c3x,x3:r2x,x2:r1x,x0:phx,
			   y1:c3y,y3:r2y,y2:r1y,y0:phy};
			segarr.push(l);
			segs++;
		}
		// Draw controls.
		draw.linewidth=3;
		draw.setcolor(Env.GetCSSRGBA("--diag-dim").slice(0,3));
		for (let s=0;s<segs;s++) {
			let l=segarr[s];
			draw.drawline(l.x0,l.y0,l.x2,l.y2);
			// draw.drawline(l.x2,l.y2,l.x3,l.y3);
			draw.drawline(l.x3,l.y3,l.x1,l.y1);
			draw.filloval(l.x2,l.y2,4);
			draw.filloval(l.x3,l.y3,4);
		}
		// Draw main line.
		draw.linewidth=8;
		draw.setcolor(Env.GetCSSRGBA("--diag-fore").slice(0,3));
		for (let s=0;s<segs;s++) {
			let l=segarr[s];
			draw.drawline(l.x0,l.y0,l.x1,l.y1);
			draw.filloval(l.x0,l.y0,8);
		}
		draw.filloval(1000,0,8);
		draw.screenflip();
	}

}

