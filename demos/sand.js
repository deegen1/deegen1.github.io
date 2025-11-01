/*------------------------------------------------------------------------------


sand.js - v1.00

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


*/
/* npx eslint sand.js -c ../../standards/eslint.js */


class Game {

	constructor(canvid,text) {
		let width=Math.round(window.innerWidth*window.devicePixelRatio);
		let height=Math.round(window.innerHeight*window.devicePixelRatio);
		let pixels=600000;
		let ratio=Math.sqrt(pixels/(width*height));
		width=Math.round(width*ratio);
		height=Math.round(height*ratio);
		this.mouserad=Math.min(width,height)/100;
		this.canvas=document.getElementById(canvid);
		this.canvas.width=width;
		this.canvas.height=height;
		this.draw=new Draw(width,height);
		this.draw.screencanvas(this.canvas);
		this.input=new Input(this.canvas);
		this.prevclick=null;
		this.setupboard(text);
		let state=this;
		function update() {
			requestAnimationFrame(update);
			state.update();
		}
		update();
	}


	setupboard(text) {
		// let time=performance.now();
		let hash=0;
		for (let i=0;i<text.length;i++) {
			hash=Random.hashu32(hash^text.charCodeAt(i));
		}
		let rnd=new Random(hash);
		let draw=this.draw;
		let img=draw.img;
		let width=img.width,height=img.height;
		let noiseverts=Math.floor(Math.sqrt(width*width+height*height)*4.5);
		let textrect=draw.textrect(text,16);
		let wratio=width/textrect.w;
		let hratio=height/textrect.h;
		let scale=(wratio<hratio?wratio:hratio)*16*0.8;
		draw.fill(0,0,0,0);
		let lines=text.split("\n");
		let offy=(height-draw.textrect(text,scale).h)*0.5;
		draw.setcolor(255,255,255,255);
		for (let line of lines) {
			textrect=draw.textrect(line,scale);
			let x=(width-textrect.w)*0.5;
			draw.filltext(x,offy,line,scale);
			offy+=textrect.h;
		}
		let pixels=width*height;
		// Bug in current version of drawing.js. Always get data32 after drawing.
		let imgdata=img.data32;
		// find negative space
		let areamap=new Int32Array(pixels);
		let distmap=new Float64Array(pixels);
		let stack=new Uint32Array(pixels);
		let stackpos=0;
		for (let i=0;i<pixels;i++) {
			if (imgdata[i]) {
				distmap[i]=Infinity;
			} else {
				stack[stackpos++]=i;
			}
			areamap[i]=i;
		}
		// negative fill
		let maxdist=0;
		let stackbase=0;
		while (stackpos<pixels) {
			maxdist++;
			let maxdist2=maxdist*maxdist;
			for (let pos=stackbase;pos<stackpos;pos++) {
				let i=stack[pos];
				let p=areamap[i];
				let ix=i%width,iy=Math.floor(i/width);
				let px=p%width,py=Math.floor(p/width);
				let cnt=0;
				for (let ox=-1;ox<2;ox++) {
					for (let oy=-1;oy<2;oy++) {
						let tx=ox+ix,ty=oy+iy;
						let dx=tx-px,dy=ty-py;
						let dist=dx*dx+dy*dy;
						if (dist<=maxdist2) {
							cnt++;
							if (tx>=0 && ty>=0 && tx<width && ty<height) {
								let t=ty*width+tx;
								if (distmap[t]>dist) {
									if (distmap[t]===Infinity) {
										stack[stackpos++]=t;
									}
									distmap[t]=dist;
									areamap[t]=p;
								}
							}
						}
					}
				}
				if (cnt===9) {
					stack[pos]=stack[stackbase++];
				}
			}
		}
		for (let i=0;i<pixels;i++) {distmap[i]=Math.sqrt(distmap[i]);}
		/*let max=255.99/distmap[stack[pixels-1]];
		for (let i=0;i<pixels;i++) {
			let c=Math.floor(distmap[i]*max);
			imgdata[i]=0xff000000|(c<<16)|(c<<8)|c;
		}*/
		// find local maximums
		stackpos=0;
		for (let i=0;i<pixels;i++) {
			let dist=distmap[i];
			if (dist<2) {continue;}
			let x=i%width,y=Math.floor(i/width),ismax=1;
			for (let ox=-1;ox<2;ox++) {
				for (let oy=-1;oy<2;oy++) {
					let tx=ox+x,ty=oy+y;
					if (tx>=0 && ty>=0 && tx<width && ty<height) {
						if (dist<distmap[ty*width+tx]) {ismax=0;}
					}
				}
			}
			if (ismax) {
				stack[stackpos++]=i;
			}
		}
		// console.log(stackpos);
		// randomly fill maximums
		for (let i=0;i<pixels;i++) {
			areamap[i]=-2;
		}
		for (let i=0;i<stackpos;i++) {
			let j=rnd.modu32(i+1);
			let v=stack[i];
			stack[i]=stack[j];
			stack[j]=v;
			areamap[v]=-1;
		}
		let textpos=0;
		for (let s=0;s<stackpos;s++) {
			let i=stack[s];
			if (areamap[i]>=0) {continue;}
			areamap[i]=textpos;
			maxdist=distmap[i]*2;
			stack[stackpos]=i;
			stack[textpos]=i;
			let px=i%width,py=Math.floor(i/width);
			let subpos=stackpos+1;
			for (let pos=stackpos;pos<subpos;pos++) {
				i=stack[pos];
				// imgdata[i]=color;
				let ix=i%width,iy=Math.floor(i/width);
				for (let ox=-1;ox<2;ox++) {
					for (let oy=-1;oy<2;oy++) {
						let tx=ox+ix,ty=oy+iy;
						let dx=tx-px,dy=ty-py;
						let dist=Math.sqrt(dx*dx+dy*dy);
						if (tx>=0 && ty>=0 && tx<width && ty<height && dist<maxdist) {
							let t=ty*width+tx;
							let ta=areamap[t];
							if ((distmap[t]>dist && ta!==textpos) || ta<-1) {
								distmap[t]=dist;
								areamap[t]=textpos;
								stack[subpos++]=t;
							}
						}
					}
				}
			}
			textpos++;
		}
		// console.log("areas:",textpos);
		// fill around the text
		let vertpos=textpos;
		for (let i=0;i<pixels;i++) {
			if (areamap[i]>=0) {continue;}
			// Find if we border a text region.
			maxdist=-1;
			let ix=i%width,iy=Math.floor(i/width);
			for (let ox=-1;ox<2;ox++) {
				for (let oy=-1;oy<2;oy++) {
					let tx=ox+ix,ty=oy+iy;
					if (tx>=0 && ty>=0 && tx<width && ty<height) {
						let t=ty*width+tx;
						if (areamap[t]<textpos && maxdist<distmap[t]) {
							maxdist=distmap[t];
						}
					}
				}
			}
			if (maxdist<=0) {continue;}
			// Fill
			areamap[i]=vertpos;
			stack[vertpos]=i;
			let subpos=vertpos+1;
			for (let pos=vertpos;pos<subpos;pos++) {
				let j=stack[pos];
				// imgdata[j]=0xffffffff;
				let jx=j%width,jy=Math.floor(j/width);
				for (let ox=-1;ox<2;ox++) {
					for (let oy=-1;oy<2;oy++) {
						let tx=ox+jx,ty=oy+jy;
						let dx=tx-ix,dy=ty-iy;
						let dist=Math.sqrt(dx*dx+dy*dy);
						if (tx>=0 && ty>=0 && tx<width && ty<height) {
							let t=ty*width+tx;
							if (distmap[t]>dist || (dist<=2 && areamap[t]<0)) {
								distmap[t]=dist;
								areamap[t]=vertpos;
								stack[subpos++]=t;
							}
						}
					}
				}
			}
			vertpos++;
		}
		// console.log("verts:",vertpos-textpos);
		// Randomly pick extra areas.
		let noisepos=0;
		for (let i=0;i<pixels;i++) {
			if (areamap[i]<0) {
				let j=rnd.modu32(noisepos+1);
				areamap[noisepos++]=areamap[j];
				areamap[j]=i;
			}
		}
		if (noisepos>noiseverts) {noisepos=noiseverts;}
		for (let i=0;i<noisepos;i++) {
			stack[vertpos++]=areamap[i];
		}
		// console.log("noise:",noisepos);
		// Create voronoi areas.
		for (let i=0;i<pixels;i++) {distmap[i]=Infinity;}
		let areainv=new Uint32Array(pixels);
		stackpos=vertpos;
		for (let i=0;i<stackpos;i++) {
			let a=stack[i];
			distmap[a]=0;
			areamap[a]=a;
			areainv[a]=i;
		}
		maxdist=0;
		stackbase=0;
		while (stackbase<pixels) {
			maxdist++;
			let maxdist2=maxdist*maxdist;
			for (let pos=stackbase;pos<stackpos;pos++) {
				let i=stack[pos];
				let p=areamap[i];
				let ix=i%width,iy=Math.floor(i/width);
				let px=p%width,py=Math.floor(p/width);
				let cnt=0;
				for (let ox=-1;ox<2;ox++) {
					for (let oy=-1;oy<2;oy++) {
						let tx=ox+ix,ty=oy+iy;
						let dx=tx-px,dy=ty-py;
						let dist=dx*dx+dy*dy;
						if (dist<=maxdist2) {
							cnt++;
							if (tx>=0 && ty>=0 && tx<width && ty<height) {
								let t=ty*width+tx;
								if (distmap[t]>dist) {
									if (distmap[t]===Infinity) {
										stack[stackpos++]=t;
									}
									distmap[t]=dist;
									areamap[t]=p;
								}
							}
						}
					}
				}
				if (cnt===9) {
					stack[pos]=stack[stackbase++];
				}
			}
		}
		// Generate statistics for each area.
		for (let i=0;i<vertpos;i++) {stack[i]=0;}
		for (let i=0;i<pixels;i++) {
			let a=areainv[areamap[i]];
			areamap[i]=a;
			stack[a]++;
		}
		let sum=0;
		for (let i=0;i<vertpos;i++) {
			let tmp=stack[i];
			stack[i]=sum;
			sum+=tmp;
		}
		for (let i=0;i<pixels;i++) {
			areainv[stack[areamap[i]]++]=i;
		}
		for (let i=vertpos;i>0;i--) {stack[i]=stack[i-1];}
		stack[0]=0;
		// fill
		function getcolor(r,g,b,n=16) {
			let ret=[r,g,b];
			for (let i=0;i<3;i++) {
				ret[i]=Math.floor(Math.min(Math.max(ret[i]+(rnd.getf()*2-1)*n,0),255));
			}
			return ret;
		}
		function getcol32(r,g,b) {
			draw.setcolor(r,g,b,255);
			return draw.rgba32[0];
		}
		for (let i=0;i<pixels;i++) {imgdata[i]=0;}
		let imgburn=new Uint32Array(distmap.buffer);
		for (let a=0;a<vertpos;a++) {
			let start=stack[a],stop=stack[a+1];
			let fcol=getcolor(128,128,128);
			fcol=getcol32(fcol[0],fcol[0],fcol[0]);
			let bcol;
			if (a<textpos) {
				bcol=getcolor(220,120,60);
				bcol=getcol32(bcol[0],bcol[1],bcol[2]);
			} else {
				bcol=getcolor(64,64,64);
				bcol=getcol32(bcol[0],bcol[0],bcol[0]);
			}
			let lcol=getcol32(0,0,0);
			for (let s=start;s<stop;s++) {
				let i=areainv[s];
				let ix=i%width,iy=Math.floor(i/width);
				let border=0;
				for (let ox=-1;ox<2;ox++) {
					for (let oy=-1;oy<2;oy++) {
						let tx=ox+ix,ty=oy+iy;
						if (tx>=0 && ty>=0 && tx<width && ty<height) {
							let t=ty*width+tx;
							if (areamap[t]!==a && imgdata[t]) {border=1;}
						}
					}
				}
				imgdata[i]=border?lcol:fcol;
				imgburn[i]=border?lcol:bcol;
			}
		}
		this.areainv=areainv;
		this.areamap=areamap;
		this.areastack=stack;
		this.imgburn=imgburn;
		// console.log("time:",performance.now()-time);
		this.ctx.putImageData(draw.img.imgdata,0,0);
	}


	update() {
		let input=this.input;
		if (!input.getkeydown(input.MOUSE.LEFT)) {
			this.prevclick=null;
			return;
		}
		let img=this.draw.img;
		let width=img.width,height=img.height,imgdata=img.data32;
		let [mx,my]=input.getmousepos();
		mx=Math.max(Math.min(Math.floor(mx),width-1),0);
		my=Math.max(Math.min(Math.floor(my),height-1),0);
		if (this.prevclick===null) {this.prevclick=[mx,my];}
		let [px,py]=this.prevclick;
		this.prevclick=[mx,my];
		let dx=mx-px,dy=my-py;
		let dist=Math.sqrt(dx*dx+dy*dy);
		if (isNaN(dist) || dist<1e-5) {
			dx=0;
			dy=0;
			dist=0;
		} else {
			dx/=dist;
			dy/=dist;
		}
		let mrad=this.mouserad,mrad2=mrad*mrad;
		let changed=false;
		let areainv=this.areainv;
		let areamap=this.areamap;
		let stack=this.areastack;
		let imgburn=this.imgburn;
		for (let d=0;d<dist+1;d++) {
			let u=d<dist?d:dist;
			let x=px+dx*u,y=py+dy*u;
			for (let ox=-mrad;ox<=mrad;ox++) {
				for (let oy=-mrad;oy<=mrad;oy++) {
					if (ox*ox+oy*oy>=mrad2) {continue;}
					let px=Math.floor(ox+x);
					let py=Math.floor(oy+y);
					if (px>=0 && py>=0 && px<width && py<height) {
						let p=py*width+px;
						let a=areamap[p];
						// if we have an unfilled area.
						if (a>=0) {
							changed=true;
							let start=stack[a],stop=stack[a+1];
							for (let s=start;s<stop;s++) {
								let si=areainv[s];
								imgdata[si]=imgburn[si];
								areamap[si]=-1;
							}
						}
					}
				}
			}
		}
		if (changed) {this.screenflip();}
	}

}


function GameInit() {
	let text="";
	let arg=window.location.search.trim().replace("?","");
	if (arg.length>0) {
		let table=[
			[112,121,103,51,36,65,38,39,40,41,42,43,6,69,111,127,96,104,50,51,52,31,54,121,56,57,58,59,60,61,20,93,73,83,86,75,64,68,95,45,8,76,10,11,12,13,14,15,58,17,94,19,20,21,22,23,24],
			[114,102,96,122,76,100,118,119,113,3,42,1,78,100,124,123,120,117,115,106,30,53,28,67,106,112,127,110],
			[103,110,110,101,76,100,118,119,113,3,72,98,126,121,102,107,113,104,24,81,123,119],
			[67,83,79,80,76,100,118,119,113,3,72,98,126,121,102,107,113,104,24,87,117,98,120],
			[82,64,88,89,76,100,118,119,113,3,72,98,126,121,102,107,113,104,24,71,113,103,100,110],
			[100,119,102,117,76,100,118,119,113,3,72,98,126,121,102,107,113,104,24,87,117,99,115],
			[116,96,111,115,76,100,118,119,113,3,72,98,126,121,102,107,113,104,24,103,125,120,102,121,113],
			[115,116,112,101,76,100,118,119,113,3,72,98,126,121,102,107,113,104,24,87,117,113],
			[65,56,53,86,76,100,118,119,113,3,72,98,126,121,102,107,113,104,24,88,117,97],
			[69,50,50,81,76,100,118,119,113,3,72,98,126,121,102,107,113,104,24,85,117,108,115,99,108,124,108,114,112,113,123,21,102,72,76],
			[68,78,77,78,76,100,118,119,113,3,72,98,126,121,102,107,113,104,24,81,102,124,119,121],
			[100,116,97,104,76,100,118,119,113,3,56,50,120,101,4,66,127,124],
			[78,68,85,80,76,100,118,119,113,3,72,121,101,121,102,107,113,104,24,84,97,123,98,127,125,107]
		];
		for (let row of table) {
			let i=0,al=arg.length,rl=row.length;
			while (i<rl && i<al && (arg.charCodeAt(i)^row[i])===i) {i++;}
			while (i<rl && i>=al) {text+=String.fromCharCode(row[i]^i);i++;}
		}
	}
	if (!text) {text="    test    ";}
	let state=new Game("gamecanv",text);
	function resize() {
		// Properly resize the canvas
		let canvas =state.canvas;
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
		let width  =Math.round(pscale*(window.innerWidth));// -offleft));
		let height =Math.round(pscale*(window.innerHeight-offtop));
		if (width*ratio<height) {
			height=Math.floor(width*ratio);
		} else {
			width =Math.floor(height/ratio);
		}
		canvas.style.width =width +"px";
		canvas.style.height=height+"px";
	}
	window.addEventListener("resize",resize);
	resize();
}
window.addEventListener("load",GameInit);
