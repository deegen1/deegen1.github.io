/*------------------------------------------------------------------------------


demo.js - v1.18

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
History


1.16
     Redid performance tests to provide more useful times.
     Added canvas to display tests.
1.17
     Tweaked image transform scaling to [1/2,2].


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint demo.js -c ../../standards/eslint.js */


import {Env,Random,Transform,Input} from "./library.js";
import {Draw} from "./drawing.js";


//---------------------------------------------------------------------------------
// Stress Tests


export class DrawPerf {

	static state=null;


	static start(divid,conid,canvid) {
		let state=DrawPerf.state;
		if (!state) {
			state=new DrawPerf(conid,canvid);
			DrawPerf.state=state;
			let div=document.getElementById(divid);
			div.style.display="";
		}
		state.overhead=0;
		state.test=-state.tests;
		let out=state.conout;
		out.innerHTML="<br>".repeat(state.tests+2);
		out.style.minHeight=(out.clientHeight*1.01)+"px";
		let refw=640,refh=480,reffps=60;
		let reftime=1e+9/(refw*refh*reffps);
		out.innerHTML=`reference: ${reftime.toFixed(3).padStart(7)} ns/px to output ${refw}x${refh} at ${reffps}fps<br>`;
		state.update();
	}


	constructor(conid,canvid) {
		this.conout=document.getElementById(conid);
		this.tests=8;
		let canv=document.getElementById(canvid);
		canv.width=951;
		canv.height=1007;
		this.draw=new Draw(canv);
		// Init a source image for drawimage() calls.
		let srcdim=128,srcpix=srcdim*srcdim;
		let srcimg=new Draw.Image(srcdim,srcdim);
		let srcdata=srcimg.data32;
		let rnd=new Random(1);
		let mask=this.draw.rgbatoint(63,63,255,255);
		for (let i=0;i<srcpix;i++) {srcdata[i]=rnd.getu32()&mask;}
		this.srcdim=srcdim;
		this.srcimg=srcimg;
		// Needed for recompiling modules
		window.DrawPath=Draw.Path;
		window.Transform=Transform;
		// Add pixel counting to fillpath() and drawimage().
		// Rename to _fillpath() and _drawimage().
		for (let i=0;i<2;i++) {
			let name=["fillpath","drawimage"][i];
			let func=Draw.prototype[name].toString();
			func=func.replace(/\{/,"{\n\t\tlet _pixelcount=0;");
			func=func.replace(/}\s*$/,"\treturn;\n}");
			func=func.replace(/return;/g,"return _pixelcount;");
			if (!i) {func=func.replace(/if \(area>=cutoff\) \{\s*do \{/,"if (area>=cutoff) {\n\t\t\t\t_pixelcount+=pstop-p;\n\t\t\t\tdo {");}
			else    {func=func.replace(/let dstrow=dsty\*dstw;/,"let dstrow=dsty*dstw; _pixelcount+=dstmaxx-dstminx;");}
			let reg=/.*?\((.*?)\)[ \n\t]{([\s\S]*)}/gmi;
			let match=reg.exec(func);
			Draw.prototype["_"+name]=new Function(match[1].split(","),match[2]);
		}
	}


	log(str) {
		// console.log(str);
		this.conout.innerHTML+=str+"<br>";
	}


	drawimage(srcimg,dx,dy,dw,dh) {
		// Draw an image with alpha blending.
		let draw=this.draw;
		let dstimg=draw.img;
		let srcw=srcimg.width,srch=srcimg.height;
		let dstw=dstimg.width,dsth=dstimg.height;
		dx=Math.round(dx??0);
		dy=Math.round(dy??0);
		dw=Math.round(dw??srcw);
		dh=Math.round(dh??srch);
		// Intersection of src and dst.
		let sx=0,sy=0;
		dw=(dw<srcw?dw:srcw)+dx;
		if (dx<0) {sx=-dx;dx=0;}
		dw=(dw<dstw?dw:dstw)-dx;
		dh=(dh<srch?dh:srch)+dy;
		if (dy<0) {sy=-dy;dy=0;}
		dh=(dh<dsth?dh:dsth)-dy;
		let amul=draw.rgba[3];
		if (dw<=0 || dh<=0 || amul<=0) {return 0;}
		let dstdata=dstimg.data32,srcdata=srcimg.data32;
		let drow=dy*dstw+dx,dinc=dstw-dw;
		let srow=sy*srcw+sx,sinc=srcw-dw;
		let ystop=drow+dstw*dh,xstop=drow+dw;
		let ashift=draw.rgbashift[3],amask=(255<<ashift)>>>0;
		let maskl=0x00ff00ff&(~amask),maskh=0xff00ff00&(~amask);
		while (drow<ystop) {
			while (drow<xstop) {
				// a = sa + da*(1-sa)
				// c = (sc*sa + dc*da*(1-sa)) / a
				let src=srcdata[srow++];
				let sa=(src>>>ashift)&255;
				if (sa<=0) {drow++;continue;}
				let tmp=dstdata[drow];
				let da=(tmp>>>ashift)&255;
				// Approximate blending by expanding sa from [0,255] to [0,256].
				// imul() implicitly cast floor().
				sa*=amul;
				da=sa*255+da*(65025-sa);
				sa=(sa*65280+(da>>>1))/da;
				da=((da+32512)/65025)<<ashift;
				let l=tmp&0x00ff00ff;
				let h=tmp&0xff00ff00;
				dstdata[drow++]=da|
					(((Math.imul((src&0x00ff00ff)-l,sa)>>>8)+l)&maskl)|
					((Math.imul(((src>>>8)&0x00ff00ff)-(h>>>8),sa)+h)&maskh);
			}
			xstop+=dstw;
			drow+=dinc;
			srow+=sinc;
		}
		return dw*dh;
	}


	update() {
		// Fill the background with static and reset the state.
		let rnd=new Random(1);
		let draw=this.draw;
		draw.resetstate();
		let dstimg=draw.img;
		let dstw=dstimg.width,dsth=dstimg.height;
		let dstdata=dstimg.data32;
		for (let i=dstdata.length-1;i>=0;i--) {dstdata[i]=rnd.getu32();}
		// If test<0, this is a warmup round.
		let test=this.test;
		let timestop=1000;
		if (test<0) {
			test+=this.tests;
			timestop=100;
		}
		let samples=0;
		let pixels=0;
		let srcdim=this.srcdim;
		let srcimg=this.srcimg;
		// Most transforms will be scaling+rotation.
		let trans=draw.deftrans;
		let mat=trans.mat,vec=trans.vec;
		function randtrans(min,max) {
			let ang=rnd.getf()*(Math.PI*2);
			let scale=Math.pow(2,rnd.getf()*(max-min)+min);
			let xscale=((rnd.getu32()&2)-1)*scale;
			let yscale=((rnd.getu32()&2)-1)*scale;
			let cs=Math.cos(ang),sn=Math.sin(ang);
			mat[0]= cs*xscale;
			mat[1]=-sn*xscale;
			mat[2]= sn*yscale;
			mat[3]= cs*yscale;
			vec[0]=rnd.getf()*dstw;
			vec[1]=rnd.getf()*dsth;
		}
		function randcolor() {
			let a=rnd.getu32(),u=a>>>24;
			draw.setcolor(u*.375,u*.375,u,a&255);
		}
		let timestart=performance.now();
		timestop+=timestart;
		if (test===0) {
			// test call overhead
			draw.begin();
			for (;(samples&0xfff)!==0 || performance.now()<timestop;samples++) {
				randcolor();
				randtrans(-1,1);
				draw._fillpath();
			}
		} else if (test===1) {
			// fill+flip
			for (;(samples&0xf)!==0 || performance.now()<timestop;samples++) {
				draw.fill(rnd.getu32());
				draw.screenflip();
			}
			pixels+=samples*dstw*dsth;
		} else if (test===2) {
			// image fast
			for (;(samples&0xff)!==0 || performance.now()<timestop;samples++) {
				randcolor();
				let w=rnd.mod(srcdim+1);srcimg.width =w;
				let h=rnd.mod(srcdim+1);srcimg.height=h;
				let x=rnd.mod(dstw+w*2)-w;
				let y=rnd.mod(dsth+h*2)-h;
				pixels+=this.drawimage(srcimg,x,y);
				// pixels+=draw._drawimage(srcimg,x,y);
			}
		} else if (test===3) {
			// image draw
			for (;(samples&0x1f)!==0 || performance.now()<timestop;samples++) {
				randcolor();
				randtrans(-1,1);
				srcimg.width =rnd.mod(srcdim+1);
				srcimg.height=rnd.mod(srcdim+1);
				pixels+=draw._drawimage(srcimg,0,0);
			}
		} else if (test===4) {
			// lines
			let path=draw.defpath;
			for (;(samples&0xff)!==0 || performance.now()<timestop;samples++) {
				randcolor();
				let x0=(rnd.getf()*1.2-.1)*dstw,y0=(rnd.getf()*1.2-.1)*dsth;
				let x1=(rnd.getf()*1.2-.1)*dstw,y1=(rnd.getf()*1.2-.1)*dsth;
				path.begin().addline(x0,y0,x1,y1,0.5);
				pixels+=draw._fillpath(path);
			}
		} else {
			// oval, rect, and complex paths
			let path=draw.begin();
			if (test===5) {
				path.addoval(0,0,1,1);
			} else if (test===6) {
				path.addrect(-1,-1,2,2);
			} else {
				let r=.375,s=.275;
				path=new Draw.Path(`
					M.35.9V.35H.9V.9ZM1 .25H.25V1H1Zm-2-.5h.75V-1H-1Z
					m.95.2H-1v.1h.95V1h.1V.05H1v-.1H.05V-1h-.1Z
				`);
				path.addoval(r-1,1-r,-r,r).addoval(1-r,r-1,-r,r).addoval(1-r,r-1,s,s);
			}
			for (;(samples&0xff)!==0 || performance.now()<timestop;samples++) {
				randcolor();
				randtrans(0,5);
				pixels+=draw._fillpath(path);
			}
		}
		let time=performance.now()-timestart;
		//console.log(`test: ${this.test}, samples: ${samples}, pixels: ${pixels}, time: ${time.toFixed(0)}`);
		draw.screenflip();
		// Format our test results. Don't display if this is a warmup.
		if (test && (!pixels || isNaN(pixels))) {
			this.log("no data for test "+test);
			return;
		}
		let unitstr="ns/px";
		if (test) {
			time=(time-this.overhead*samples)/pixels;
		} else {
			unitstr="ns/call";
			time/=samples;
			this.overhead=time;
		}
		let teststr=[
			"overhead ","fill+flip","img fast ","img trans",
			"lines    ","ovals    ","rects    ","complex  "
		][test];
		let timestr=(1e+6*time).toFixed(3).padStart(7);
		if (this.test>=0) {
			this.log(`${teststr}: ${timestr} ${unitstr}`);
		}
		// If we still have tests left.
		if (++this.test<this.tests) {
			let state=this;
			setTimeout(()=>{state.update();},16);
		} else {
			this.log("done");
		}
	}

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
			// draw.filloval(part.x,part.y,5,5);
		}
		// Draw player.
		let ang=performance.now()/1500;
		draw.setcolor(0xff8000ff);
		draw.fillpath(this.star,{vec:[mx,my],scale:40,ang:ang});
		draw.setcolor(255,255,255);
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
		`,{scale:scale,vec:[-553*scale*.5,-200*scale]});
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
		let trans=new Transform({vec:[0.84*scale,0.16*scale],ang:angle});
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
		let trans=new Transform({scale:scale,vec:[97*scale,488*scale]});
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

