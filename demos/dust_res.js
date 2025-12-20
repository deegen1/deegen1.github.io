/*------------------------------------------------------------------------------


dust.js - v1.00

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


http://localhost:8000/demos/dust.html?Adv8azIdxd5Mehw3nRor

remake on resize
see if resizing when not focused
test on phone


*/
/* npx eslint dust.js -c ../../standards/eslint.js */


import {Debug,Random,Input,Draw} from "./library.js";


class Game {

	constructor() {
		let canv=document.createElement("canvas");
		document.body.appendChild(canv);
		this.canvas=canv;
		this.draw=null;
		this.input=new Input(canv);
		this.framestr="0.0 ms";
		this.frameprev=0;
		this.frametime=0;
		this.frames=0;
		let state=this;
		function update() {
			requestAnimationFrame(update);
			state.update();
		}
		update();
	}


	static getargs() {
		// Decrypt index.html?abcdefg. Also handle hex codes.
		let enc64="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
		let dec64=[];
		for (let i=0;i<enc64.length;i++) {dec64[enc64.charCodeAt(i)]=i;}
		let enc16="0123456789ABCDEFabcdef";
		let dec16=[];
		for (let i=0;i<enc16.length;i++) {dec16[enc16.charCodeAt(i)]=i>15?i-6:i;}
		let buf=0,bits=0;
		let hash=0x64757374,chk=0,read=0;
		let text="";
		let arg=window.location.search;
		for (let i=0;i<arg.length;i++) {
			let c=arg.charCodeAt(i);
			if (c===37) {
				// %XX format
				let h=dec16[arg.charCodeAt(i+1)];
				let l=dec16[arg.charCodeAt(i+2)];
				if (h>=0 && l>=0) {c=h*16+l;i+=2;}
			}
			// Get 6 bits from out base 64 character.
			let d=dec64[c];
			if (d>=0) {
				buf=(buf<<6)+d;
				bits+=6;
			}
			if (bits<8) {continue;}
			// Decrypt a byte.
			bits-=8;
			c=buf>>>bits;
			buf&=(1<<bits)-1;
			if (read++<4) {chk=(chk<<8)|c;continue;}
			c=(c+hash)&255;
			hash+=c+0x66daacfd;
			hash=Math.imul(hash^(hash>>>16),0xf8b7629f);
			hash=Math.imul(hash^(hash>>> 8),0xcbc5c2b5);
			hash=Math.imul(hash^(hash>>>24),0xf5a5bda5);
			text+=String.fromCharCode(c);
		}
		return (hash^chk)?"":text;
	}


	initboard() {
		// Fix the canvas size.
		let imgw=this.winw,imgh=this.winh;
		let fix=480;
		if (imgw<imgh) {imgh=Math.round(imgh*fix/imgw);imgw=fix;}
		else           {imgw=Math.round(imgw*fix/imgh);imgh=fix;}
		let canv=this.canvas;
		canv.width=imgw;
		canv.height=imgh;
		let draw=new Draw(canv);
		this.draw=draw;
		this.mouserad=Math.min(imgw,imgh)/100;
		this.prevclick=null;
		let img=draw.img;
		let text=Game.getargs();
		if (!text) {text="test";}
		let lineh=1.5;
		let lines=text.split("\n");
		let scalew=imgw/draw.textrect(text,1).w;
		let scaleh=imgh/((lines.length-1)*lineh+1);
		let scale=(scalew<scaleh?scalew:scaleh)*0.8;
		lineh*=scale;
		let offy=(imgh-(lines.length-1)*lineh-scale)*0.5;
		draw.fill(0x000000ff);
		draw.setcolor(0xffffffff);
		for (let line of lines) {
			let rect=draw.textrect(line,scale);
			let x=(imgw-rect.w)*0.5;
			draw.filltext(x,offy,line,scale);
			offy+=lineh;
		}
		let pixels=imgw*imgh;
		let flowmap=new Int32Array(pixels);
		let data32=img.data32;
		for (let i=0;i<pixels;i++) {
			let p=data32[i];
			let a=p>>>24,b=p&255;
			p=a<b?a:b;
			flowmap[i]=p>128;
		}
		this.flowmap=flowmap;
		this.cellmap=new Int32Array(pixels);
		const minmass=0.1,maxmass=16;
		let particles=(imgw*imgh*0.25)|0;
		let particles5=particles*5;
		let pf=new Float32Array(particles5);
		let pi=new Int32Array(pf.buffer);
		let rnd=new Random();
		for (let p=0;p<particles5;p+=5) {
			pf[p  ]=rnd.getf()*imgw;
			pf[p+1]=rnd.getf()*imgh;
			pf[p+2]=0;
			pf[p+3]=0;
			pi[p+4]=-1;
		}
		this.partf32=pf;
		this.parti32=pi;
		this.minmass=minmass;
		this.maxmass=maxmass;
		this.lastpos=null;
		draw.screenflip();
	}


	checkresize() {
		let winw=window.innerWidth;
		let winh=window.innerHeight;
		if (this.winw===winw && this.winh===winh) {return;}
		this.winw=winw;
		this.winh=winh;
		let canv=this.canvas;
		canv.style.width =winw+"px";
		canv.style.height=winh+"px";
console.log("resizing",winw,winh);
		this.initboard();
	}


	update(time) {
		// Get the timestep. Prevent steps that are too large.
		let dt=(time-this.frameprev)/1000;
		dt=dt<0.06?dt:0.06;
		dt=dt>0?dt:0;
		this.frameprev=time;
		let starttime=performance.now();
		if (!Debug.IsVisible(this.canvas)) {return;}
		this.checkresize();
		let draw=this.draw;
		let img=draw.img;
		draw.fill(0x000000ff);
		//let rnd=new Random();
		let imgw=img.width,imgh=img.height;
		let [rshift,gshift,bshift,ashift]=draw.rgbashift;
		let amask=255<<ashift;
		let data32=img.data32;
		let cellmap=this.cellmap;
		let flowmap=this.flowmap;
		// Integrate particles.
		let damp=0.01;
		let lnd=Math.log(1-damp);
		let vt0=Math.exp(dt*lnd);
		let vt1=(vt0-1)/lnd;
		//let vt2=(vt1-dt)/lnd;
		damp=0.5;
		lnd=Math.log(1-damp);
		let ft0=Math.exp(dt*lnd);
		let ft1=(ft0-1)/lnd;
		//let ft2=(ft1-dt)/lnd;
		let pf=this.partf32;
		let pi=this.parti32;
		let particles=pf.length;
		const rad=0.25,rad1=rad+0.999,rad2=rad*rad,rad4=4*rad2;
		const radw=imgw-rad,radh=imgh-rad;
		// Mouse input.
		let input=this.input;
		input.update();
		let lastpos=null;
		if (input.getkeydown(input.MOUSE.LEFT)) {
			let [mx,my]=input.getmousepos();
			lastpos=this.lastpos;
			if (lastpos===null) {lastpos=[mx,my];}
			let [lx,ly]=lastpos;
			lastpos=[mx,my];
			let mrad=Math.sqrt(imgw*imgh)/30;
			let mrad12=(mrad+1)*(mrad+1),mradr2=(mrad+rad)*(mrad+rad);
			let minx=Math.floor(Math.min(lx,mx)-mrad-0.5);
			let miny=Math.floor(Math.min(my,ly)-mrad-0.5);
			let maxx=Math.ceil(Math.max(lx,mx)+mrad+0.5);
			let maxy=Math.ceil(Math.max(my,ly)+mrad+0.5);
			minx=minx>0?minx:0;
			miny=miny>0?miny:0;
			maxx=maxx<imgw?maxx:imgw;
			maxy=maxy<imgh?maxy:imgh;
			let dx=mx-lx,dy=my-ly;
			let mag=dx*dx+dy*dy;
			mag=mag>1e-5?1/mag:0;
			const speed=10*dt;
			// Find the pixels we overlap.
			for (let py=miny;py<maxy;py++) {
				let inside=false;
				for (let px=minx;px<maxx;px++) {
					let cx=px+0.5-lx,cy=py+0.5-ly;
					let u=(cx*dx+cy*dy)*mag;
					u=u>0?u:0;
					u=u<1?u:1;
					let ox=lx+u*dx,oy=ly+u*dy;
					cx=px-ox;
					cy=py-oy;
					if (cx*cx+cy*cy>mrad12) {
						if (inside) {break;}
						else {continue;}
					}
					inside=true;
					let q=cellmap[py*imgw+px];
					while (q>=0) {
						let qx=pf[q],qy=pf[q+1];
						let nx=qx-ox,ny=qy-oy;
						let dist=nx*nx+ny*ny;
						if (dist<mradr2) {
							if (dist>1e-10) {
								dist=Math.sqrt(dist);
								nx/=dist;ny/=dist;
							} else {
								dist=0;
								nx=1;ny=0;
							}
							dist=(mrad+rad-dist)*speed;
							let pushx=nx*dist+dx*dt;
							let pushy=ny*dist+dy*dt;
							pf[q  ]+=pushx;pf[q+1]+=pushy;
							pf[q+2]+=pushx;pf[q+3]+=pushy;
						}
						q=pf[q+4];
					}
				}
			}
		}
		cellmap.fill(-1);
		this.lastpos=lastpos;
		for (let p=0;p<particles;p+=5) {
			// Integrate and push in-bounds
			let px=pf[p  ],py=pf[p+1];
			let vx=pf[p+2],vy=pf[p+3];
			let ix=px>0?~~px:0;
			ix=ix<imgw?ix:(imgw-1);
			let iy=py>0?~~py:0;
			iy=iy<imgh?iy:(imgh-1);
			let hash=iy*imgw+ix;
			// let ax=rnd.getnorm(),ay=rnd.getnorm();
			// let ax=0,ay=0;
			let dt0=vt0,dt1=vt1;// ,dt2=vt2;
			if (flowmap[hash]) {dt0=ft0;dt1=ft1;}// dt2=ft2;}
			px+=vx*dt1;// +ax*dt2;
			vx =vx*dt0;// +ax*dt1;
			py+=vy*dt1;// +ay*dt2;
			vy =vy*dt0;// +ay*dt1;
			if (px<rad ) {vx=vx<0?-vx:vx;px=rad ;}
			if (py<rad ) {vy=vy<0?-vy:vy;py=rad ;}
			if (px>radw) {vx=vx>0?-vx:vx;px=radw;}
			if (py>radh) {vy=vy>0?-vy:vy;py=radh;}
			hash=(~~py)*imgw+(~~px);
			// Draw
			let col=Math.imul(p,0xabc123ef);
			let pix=data32[hash];
			let r=(((pix>>>rshift)&255)+((col>>> 0)&63)+48)|0;
			let g=(((pix>>>gshift)&255)+((col>>> 8)&63)+48)|0;
			let b=(((pix>>>bshift)&255)+((col>>>16)&63)+48)|0;
			r=r<255?r:255;
			g=g<255?g:255;
			b=b<255?b:255;
			data32[hash]=(r<<rshift)|(g<<gshift)|(b<<bshift)|amask;
			// Find pixels we're overlapping
			let minx=~~(px-rad),maxx=~~(px+rad1);
			let miny=~~(py-rad),maxy=~~(py+rad1);
			minx=minx>0?minx:0;
			miny=miny>0?miny:0;
			maxx=maxx<imgw?maxx:imgw;
			maxy=maxy<imgh?maxy:imgh;
			for (iy=miny;iy<maxy;iy++) {
				let cy=py-iy;
				cy=cy>1?cy-1:(cy>0?0:cy);
				cy=rad2-cy*cy;
				for (ix=minx;ix<maxx;ix++) {
					let cx=px-ix;
					cx=cx>1?cx-1:(cx>0?0:cx);
					if (cx*cx>=cy) {continue;}
					let q=cellmap[iy*imgw+ix];
					while (q>=0) {
						// Collide p with q
						let qx=pf[q],qy=pf[q+1];
						let nx=qx-px,ny=qy-py;
						let dist=nx*nx+ny*ny;
						if (dist<rad4) {
							let wx=pf[q+2],wy=pf[q+3];
							// If the atoms are too close together, randomize the direction.
							dist=Math.sqrt(dist);
							if (dist>1e-5) {
								let mul=1.0/dist;
								nx*=mul;
								ny*=mul;
							} else {
								nx=1;
								ny=0;
							}
							let posdif=rad-dist*0.5;
							let veldif=(vx-wx)*nx+(vy-wy)*ny;
							veldif=(veldif>0?veldif*0.99:0)+posdif*0.5;
							// Push the atoms apart.
							let posx=nx*posdif,velx=nx*veldif;
							let posy=ny*posdif,vely=ny*veldif;
							px-=posx;vx-=velx;
							qx+=posx;wx+=velx;
							py-=posy;vy-=vely;
							qy+=posy;wy+=vely;
							pf[q  ]=qx;pf[q+1]=qy;
							pf[q+2]=wx;pf[q+3]=wy;
						}
						q=pi[q+4];
					}
				}
			}
			// Set cell vars
			pf[p  ]=px;pf[p+1]=py;
			pf[p+2]=vx;pf[p+3]=vy;
			let next=cellmap[hash];
			pi[p+4]=next;
			cellmap[hash]=p;
		}
		draw.setcolor(0xffffffff);
		draw.filltext(5,5,this.framestr);
		draw.screenflip();
		this.frametime+=performance.now()-starttime;
		this.frames++;
		if (this.frames>60) {
			time=this.frametime/this.frames;
			this.framestr=time.toFixed(1)+" ms";
			this.frametime=0;
			this.frames=0;
		}
	}

}

new Game();
