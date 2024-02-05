/*------------------------------------------------------------------------------


demo.js - v1.02

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


*/
/* jshint esversion: 6   */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Input - v1.11


class Input {

	static KEY={
		A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74,
		K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84,
		U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
		0: 48, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54, 7: 55, 8: 56, 9: 57,
		SPACE: 32,
		LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40
	};


	static MOUSE={
		LEFT: 256, MID: 257, RIGHT: 258
	};


	constructor(focus) {
		this.focus=null;
		this.focustab=null;
		this.focustouch=null;
		if (focus!==undefined && focus!==null) {
			this.focus=focus;
			// An element needs to have a tabIndex to be focusable.
			this.focustab=focus.tabIndex;
			this.focustouch=focus.style.touchAction;
			if (focus.tabIndex<0) {
				focus.tabIndex=1;
			}
		}
		this.active=null;
		this.scrollupdate=false;
		this.scroll=[window.scrollX,window.scrollY];
		this.mousepos=[-Infinity,-Infinity];
		this.mouseraw=[-Infinity,-Infinity];
		this.mousez=0;
		this.touchfocus=0;
		this.clickpos=[0,0];
		this.repeatdelay=0.5;
		this.repeatrate=0.05;
		this.navkeys={32:1,37:1,38:1,39:1,40:1};
		this.stopnav=0;
		this.stopnavfocus=0;
		this.keystate={};
		this.listeners=[];
		this.initmouse();
		this.initkeyboard();
		this.reset();
		for (var i=0;i<this.listeners.length;i++) {
			var list=this.listeners[i];
			document.addEventListener(list[0],list[1],list[2]);
		}
	}


	release() {
		if (this.focus!==null) {
			this.focus.tabIndex=this.focustab;
		}
		this.enablenav();
		for (var i=0;i<this.listeners.length;i++) {
			var list=this.listeners[i];
			document.removeEventListener(list[0],list[1],list[2]);
		}
		this.listeners=[];
		this.reset();
	}


	reset() {
		this.mousez=0;
		var statearr=Object.values(this.keystate);
		var statelen=statearr.length;
		for (var i=0;i<statelen;i++) {
			var state=statearr[i];
			state.down=0;
			state.hit=0;
			state.repeat=0;
			state.time=null;
			state.active=null;
			state.isactive=0;
		}
		this.active=null;
	}


	update() {
		// Process keys that are active.
		var focus=this.focus===null?document.hasFocus():Object.is(document.activeElement,this.focus);
		if (this.touchfocus!==0) {focus=true;}
		this.stopnavfocus=focus?this.stopnav:0;
		var time=performance.now()/1000.0;
		var delay=time-this.repeatdelay;
		var rate=1.0/this.repeatrate;
		var state=this.active;
		var active=null;
		var down,next;
		while (state!==null) {
			next=state.active;
			down=focus?state.down:0;
			state.down=down;
			if (down>0) {
				var repeat=Math.floor((delay-state.time)*rate);
				state.repeat=(repeat>0 && (repeat&1)===0)?state.repeat+1:0;
			} else {
				state.repeat=0;
				state.hit=0;
			}
			state.isactive=down?1:0;
			if (state.isactive!==0) {
				state.active=active;
				active=state;
			}
			state=next;
		}
		this.active=active;
	}


	disablenav() {
		this.stopnav=1;
		if (this.focus!==null) {
			this.focus.style.touchAction="pinch-zoom";
		}
	}


	enablenav() {
		this.stopnav=0;
		if (this.focus!==null) {
			this.focus.style.touchAction=this.focustouch;
		}
	}


	makeactive(code) {
		var state=this.keystate[code];
		if (state===null || state===undefined) {
			state=null;
		} else if (state.isactive===0) {
			state.isactive=1;
			state.active=this.active;
			this.active=state;
		}
		return state;
	}


	// ----------------------------------------
	// Mouse


	initmouse() {
		var state=this;
		this.MOUSE=this.constructor.MOUSE;
		var keys=Object.keys(this.MOUSE);
		for (var i=0;i<keys.length;i++) {
			var code=this.MOUSE[keys[i]];
			this.keystate[code]={
				name: "MOUSE."+keys[i],
				code: code
			};
		}
		// Mouse controls.
		function mousemove(evt) {
			state.setmousepos(evt.pageX,evt.pageY);
		}
		function mousewheel(evt) {
			state.addmousez(evt.deltaY<0?-1:1);
		}
		function mousedown(evt) {
			if (evt.button===0) {
				state.setkeydown(state.MOUSE.LEFT);
				state.clickpos=state.mousepos.slice();
			}
		}
		function mouseup(evt) {
			if (evt.button===0) {
				state.setkeyup(state.MOUSE.LEFT);
			}
		}
		function onscroll(evt) {
			// Update relative position on scroll.
			if (state.scrollupdate) {
				var difx=window.scrollX-state.scroll[0];
				var dify=window.scrollY-state.scroll[1];
				state.setmousepos(state.mouseraw[0]+difx,state.mouseraw[1]+dify);
			}
		}
		// Touch controls.
		function touchmove(evt) {
			var touch=evt.touches;
			if (touch.length===1) {
				touch=touch.item(0);
				state.setkeydown(state.MOUSE.LEFT);
				state.setmousepos(touch.pageX,touch.pageY);
			} else {
				// This is probably a gesture.
				state.setkeyup(state.MOUSE.LEFT);
			}
		}
		function touchstart(evt) {
			// We need to manually determine if the user has touched our focused object.
			state.touchfocus=1;
			var focus=state.focus;
			if (focus!==null) {
				var touch=evt.touches.item(0);
				var rect=state.getrect(focus);
				var x=touch.pageX-rect.x;
				var y=touch.pageY-rect.y;
				if (x<0 || x>=rect.w || y<0 || y>=rect.h) {
					state.touchfocus=0;
				}
			}
			// touchstart doesn't generate a separate mousemove event.
			touchmove(evt);
			state.clickpos=state.mousepos.slice();
		}
		function touchend(evt) {
			state.touchfocus=0;
			state.setkeyup(state.MOUSE.LEFT);
		}
		function touchcancel(evt) {
			state.touchfocus=0;
			state.setkeyup(state.MOUSE.LEFT);
		}
		this.listeners=this.listeners.concat([
			["mousemove"  ,mousemove  ,false],
			["mousewheel" ,mousewheel ,false],
			["mousedown"  ,mousedown  ,false],
			["mouseup"    ,mouseup    ,false],
			["scroll"     ,onscroll   ,false],
			["touchstart" ,touchstart ,false],
			["touchmove"  ,touchmove  ,false],
			["touchend"   ,touchend   ,false],
			["touchcancel",touchcancel,false]
		]);
	}


	getrect(elem) {
		var width  =elem.clientWidth;
		var height =elem.clientHeight;
		var offleft=elem.clientLeft;
		var offtop =elem.clientTop;
		while (elem!==null) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		return {x:offleft,y:offtop,w:width,h:height};
	}


	setmousepos(x,y) {
		this.mouseraw[0]=x;
		this.mouseraw[1]=y;
		this.scroll[0]=window.scrollX;
		this.scroll[1]=window.scrollY;
		var focus=this.focus;
		if (focus!==null) {
			var rect=this.getrect(focus);
			x=(x-rect.x)/rect.w;
			y=(y-rect.y)/rect.h;
		}
		this.mousepos[0]=x;
		this.mousepos[1]=y;
	}


	getmousepos() {
		return this.mousepos.slice();
	}


	getclickpos() {
		return this.clickpos.slice();
	}


	addmousez(dif) {
		this.mousez+=dif;
	}


	getmousez() {
		var z=this.mousez;
		this.mousez=0;
		return z;
	}


	// ----------------------------------------
	// Keyboard


	initkeyboard() {
		var state=this;
		this.KEY=this.constructor.KEY;
		var keys=Object.keys(this.KEY);
		for (var i=0;i<keys.length;i++) {
			var code=this.KEY[keys[i]];
			this.keystate[code]={
				name: "KEY."+keys[i],
				code: code
			};
		}
		function keydown(evt) {
			state.setkeydown(evt.keyCode);
			if (state.stopnavfocus!==0 && state.navkeys[evt.keyCode]) {evt.preventDefault();}
		}
		function keyup(evt) {
			state.setkeyup(evt.keyCode);
		}
		this.listeners=this.listeners.concat([
			["keydown",keydown,false],
			["keyup"  ,keyup  ,false]
		]);
	}


	setkeydown(code) {
		var state=this.makeactive(code);
		if (state!==null) {
			if (state.down===0) {
				state.down=1;
				state.hit=1;
				state.repeat=0;
				state.time=performance.now()/1000.0;
			}
		}
	}


	setkeyup(code) {
		var state=this.makeactive(code);
		if (state!==null) {
			state.down=0;
			state.hit=0;
			state.repeat=0;
			state.time=null;
		}
	}


	getkeydown(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		var keystate=this.keystate;
		for (var i=0;i<code.length;i++) {
			var state=keystate[code[i]];
			if (state!==null && state!==undefined && state.down>0) {
				return 1;
			}
		}
		return 0;
	}


	getkeyhit(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		var keystate=this.keystate;
		for (var i=0;i<code.length;i++) {
			var state=keystate[code[i]];
			if (state!==null && state!==undefined && state.hit>0) {
				state.hit=0;
				return 1;
			}
		}
		return 0;
	}


	getkeyrepeat(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		var keystate=this.keystate;
		for (var i=0;i<code.length;i++) {
			var state=keystate[code[i]];
			if (state!==null && state!==undefined && state.repeat===1) {
				return 1;
			}
		}
		return 0;
	}

}


//---------------------------------------------------------------------------------
// PRNG - v1.04


class Random {

	constructor(seed) {
		this.acc=0;
		this.inc=1;
		this.xmbarr=this.constructor.xmbarr;
		this.seed(seed);
	}


	seed(seed) {
		if (seed===undefined || seed===null) {
			seed=performance.timeOrigin+performance.now();
		}
		this.acc=(seed/4294967296)>>>0;
		this.inc=seed>>>0;
		this.acc=this.getu32();
		this.inc=(this.getu32()|1)>>>0;
	}


	getstate() {
		return [this.acc,this.inc];
	}


	setstate(state) {
		this.acc=state[0]>>>0;
		this.inc=state[1]>>>0;
	}


	static hashu32(val) {
		val+=0x66daacfd;
		val=Math.imul(val^(val>>>16),0xf8b7629f);
		val=Math.imul(val^(val>>> 8),0xcbc5c2b5);
		val=Math.imul(val^(val>>>24),0xf5a5bda5);
		return val>>>0;
	}


	getu32() {
		var val=(this.acc+this.inc)>>>0;
		this.acc=val;
		val=Math.imul(val^(val>>>16),0xf8b7629f);
		val=Math.imul(val^(val>>> 8),0xcbc5c2b5);
		val=Math.imul(val^(val>>>24),0xf5a5bda5);
		return val>>>0;
	}


	modu32(mod) {
		// rand%mod is not converted to a signed int.
		var rand,rem,nmod=(-mod)>>>0;
		do {
			rand=this.getu32();
			rem=rand%mod;
		} while (rand-rem>nmod);
		return rem;
	}


	getf64() {
		return this.getu32()*(1.0/4294967296.0);
	}


	static xmbarr=[
		0.0000000000,2.1105791e+05,-5.4199832e+00,0.0000056568,6.9695708e+03,-4.2654963e+00,
		0.0000920071,7.7912181e+02,-3.6959312e+00,0.0007516877,1.6937928e+02,-3.2375953e+00,
		0.0032102442,6.1190088e+01,-2.8902816e+00,0.0088150936,2.8470915e+01,-2.6018590e+00,
		0.0176252084,1.8800444e+01,-2.4314149e+00,0.0283040851,1.2373531e+01,-2.2495070e+00,
		0.0466319112,8.6534303e+00,-2.0760316e+00,0.0672857680,6.8979540e+00,-1.9579131e+00,
		0.0910495504,5.3823501e+00,-1.8199180e+00,0.1221801449,4.5224728e+00,-1.7148581e+00,
		0.1540346442,3.9141567e+00,-1.6211563e+00,0.1900229058,3.4575317e+00,-1.5343871e+00,
		0.2564543024,2.8079448e+00,-1.3677978e+00,0.3543675790,2.6047685e+00,-1.2957987e+00,
		0.4178358886,2.5233767e+00,-1.2617903e+00,0.5881852711,2.6379475e+00,-1.3291791e+00,
		0.6397157999,2.7530438e+00,-1.4028080e+00,0.7303095074,3.3480131e+00,-1.8373198e+00,
		0.7977016349,3.7812818e+00,-2.1829389e+00,0.8484734402,4.7872429e+00,-3.0364702e+00,
		0.8939255135,6.2138677e+00,-4.3117665e+00,0.9239453541,7.8175201e+00,-5.7934537e+00,
		0.9452687641,1.0404724e+01,-8.2390571e+00,0.9628624602,1.4564418e+01,-1.2244270e+01,
		0.9772883839,2.3567788e+01,-2.1043159e+01,0.9881715750,4.4573121e+01,-4.1800032e+01,
		0.9948144543,1.0046744e+02,-9.7404506e+01,0.9980488575,2.5934959e+02,-2.5597666e+02,
		0.9994697975,1.0783868e+03,-1.0745796e+03,0.9999882905,1.3881171e+05,-1.3880629e+05
	];
	getnorm() {
		// Returns a normally distributed random variable. This function uses a linear
		// piecewise approximation of sqrt(2)*erfinv((x+1)*0.5) to quickly compute values.
		// Find the greatest y[i]<=x, then return x*m[i]+b[i].
		var x=this.getf64(),xmb=this.xmbarr,i=48;
		i+=x<xmb[i]?-24:24;
		i+=x<xmb[i]?-12:12;
		i+=x<xmb[i]?-6:6;
		i+=x<xmb[i]?-3:3;
		i+=x<xmb[i]?-3:0;
		return x*xmb[i+1]+xmb[i+2];
	}

}


//---------------------------------------------------------------------------------
// Demo 1 - Rotating Hexagons


class PolyDemo1 {

	constructor(divid) {
		// Swap the <div> with <canvas>
		var elem=document.getElementById(divid);
		this.parentelem=elem.parentNode;
		var canvas=document.createElement("canvas");
		elem.replaceWith(canvas);
		canvas.width=500;
		canvas.height=200;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.backbuf=this.ctx.createImageData(canvas.width,canvas.height);
		this.backbuf32=new Uint32Array(this.backbuf.data.buffer);
		// canvas.style.imageRendering="pixelated";
		canvas.style.width="90%";
		//canvas.style.maxHeight="20rem";
		canvas.style.maxWidth="50rem";
		//canvas.style.border="1px solid red";
		var state=this;
		function update() {
			state.update();
			requestAnimationFrame(update);
		}
		update();
	}


	polyfill(imgdata,imgwidth,imgheight,lines,mag) {
		// Preprocess the lines. Reject anything with a NaN, too narrow (y1-y0), or
		// above or below the image.
		var cache=this.cache||0;
		if (cache<lines.length) {
			cache=cache*2>lines.length?cache*2:lines.length;
			this.cache=cache;
			this.lr=new Array(cache);
		}
		var lr=this.lr;
		var minx=imgwidth,maxx=0,miny=imgheight,maxy=0,ycnt=0;
		var l,i,j,tmp,x0,y0,x1,y1;
		for (i=lines.length-1;i>=0;i--) {
			l=lr[ycnt];
			if (l===undefined) {lr[ycnt]=l={};}
			[x0,y0,x1,y1]=lines[i];
			var dx=x1-x0;
			var dy=y1-y0;
			l.miny=Math.max(Math.floor(Math.min(y0,y1)),0);
			l.maxy=Math.min(Math.ceil(Math.max(y0,y1)),imgheight);
			if (Math.abs(dy)>1e-10 && l.miny<l.maxy && !isNaN(dx)) {
				l.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
				l.maxx=Math.min(Math.ceil(Math.max(x0,x1)),imgwidth);
				if (l.minx<imgwidth) {
					l.x0=x0;
					l.y0=y0;
					l.x1=x1;
					l.y1=y1;
					l.dxy=dx/dy;
					l.cxy=x0-y0*l.dxy;
					l.dyx=dy/dx;
					l.cyx=y0-x0*l.dyx;
					l.minr=0;
					l.maxr=0;
					ycnt++;
					miny=Math.min(miny,l.miny);
					maxy=Math.max(maxy,l.maxy);
				}
				minx=Math.min(minx,l.minx);
				maxx=Math.max(maxx,l.maxx);
			}
		}
		// If all lines are outside the image, abort.
		if (minx>=maxx || miny>=maxy) {
			return;
		}
		// Sort by min y.
		for (i=1;i<ycnt;i++) {
			j=i;l=lr[i];tmp=l.miny;
			while (j>0 && tmp<lr[j-1].miny) {lr[j]=lr[j-1];j--;}
			lr[j]=l;
		}
		// Split RGB.
		var colrgba=0xffffffff;
		var coll=(colrgba&0x00ff00ff)>>>0;
		var colh=(colrgba&0xff00ff00)>>>0;
		var colh2=colh>>>8;
		// Process the lines row by row.
		var ylo=0,yhi=0,y=miny,ynext=y,ny;
		var pixrow=y*imgwidth;
		while (y<maxy) {
			// Add any new lines on this row.
			ny=y+1;
			while (ynext<ny) {
				l=lr[yhi++];
				ynext=yhi<ycnt?lr[yhi].miny:imgheight;
			}
			// Sort by min row and remove rows we've passed.
			for (i=ylo;i<yhi;i++) {
				l=lr[i];j=i;
				if (l.maxy<=y) {
					while (j>ylo) {lr[j]=lr[j-1];j--;}
					ylo++;
				} else {
					l.minr=Math.min(Math.max(Math.floor((l.dxy>0?y:ny)*l.dxy+l.cxy),l.minx),maxx);
					l.maxr=Math.min(Math.ceil((l.dxy>0?ny:y)*l.dxy+l.cxy),l.maxx);
					tmp=l.minr;
					while (j>ylo && tmp<lr[j-1].minr) {lr[j]=lr[j-1];j--;}
				}
				lr[j]=l;
			}
			// Skip any gaps of empty rows.
			if (ylo===yhi) {
				if (ylo>=ycnt) {break;}
				y=ynext;
				pixrow=y*imgwidth;
				continue;
			}
			var xlo=ylo,xhi=ylo,x=lr[xhi].minr,xnext=x;
			var area=0.0,a,dst;
			var pixcol,pixstop;
			// Process the lines on this row, column by column.
			while (x<maxx) {
				while (xnext<=x) {
					l=lr[xhi++];
					l.area=0.0;
					xnext=xhi<yhi?lr[xhi].minr:maxx;
				}
				for (i=xlo;i<xhi;i++) {
					l=lr[i];
					y0=l.y0-y;
					y1=l.y1-y;
					if (l.maxr<=x) {
						j=i;
						while (j>xlo) {lr[j]=lr[j-1];j--;}
						lr[j]=l;
						xlo++;
						tmp=Math.max(Math.min(y0,1),0)-Math.max(Math.min(y1,1),0);
					} else {
						// Clamp the line segment to the unit square.
						x0=l.x0-x;
						x1=l.x1-x;
						if (y0>y1) {
							tmp=y0;y0=y1;y1=tmp;
							tmp=x0;x0=x1;x1=tmp;
						}
						var difx=x1-x0;
						var dify=y1-y0;
						var dxy=difx/dify;
						var dyx=dify/difx;
						var x0y=-x0*dyx+y0;
						var x1y=x0y+dyx;
						tmp=0.0;
						if (y0<0.0) {
							x0-=y0*dxy;
							y0=0.0;
						}
						if (y1>1.0) {
							x1+=(1.0-y1)*dxy;
							y1=1.0;
						}
						if (x0<0.0) {
							tmp+=x0y-y0;
							x0=0;
							y0=x0y;
						} else if (x0>1.0) {
							x0=1.0;
							y0=x1y;
						}
						if (x1<0.0) {
							tmp+=y1-x0y;
							x1=0;
							y1=x0y;
						} else if (x1>1.0) {
							x1=1.0;
							y1=x1y;
						}
						tmp+=(y1-y0)*(1-(x0+x1)*0.5);
						if (l.y0<l.y1) {tmp=-tmp;}
					}
					area+=tmp-l.area;
					l.area=tmp;
				}
				// Shade the pixels based on how much we're covering.
				pixcol=pixrow+x;
				x=xlo===xhi?xnext:(x+1);
				pixstop=pixrow+x;
				if (mag===1) {
					if (area>=0.9981) {
						while (pixcol<pixstop) {
							imgdata[pixcol++]=colrgba;
						}
					} else if (area>0.0019) {
						a=Math.floor((1.0-area)*256);
						while (pixcol<pixstop) {
							dst=imgdata[pixcol];
							imgdata[pixcol++]=
								(((Math.imul((dst&0x00ff00ff)-coll,a)>>>8)+coll)&0x00ff00ff)+
								((Math.imul(((dst&0xff00ff00)>>>8)-colh2,a)+colh)&0xff00ff00);
						}
					}
				} else if (area>=0.5) {
					var ty=y*mag;
					var tx=(pixcol-pixrow)*mag;
					while (pixcol<pixstop) {
						for (var my=0;my<mag;my++) {
							for (var mx=0;mx<mag;mx++) {
								imgdata[(ty+my)*imgwidth+(tx+mx)]=colrgba;
							}
						}
						tx+=mag;
						pixcol++;
					}
				}
			}
			pixrow+=imgwidth;
			y++;
		}
	}


	update() {
		this.backbuf32[0]=0;
		this.backbuf.data[3]=0;
		this.backbuf32.fill(this.backbuf32[0]);
		var width=this.canvas.width,height=this.canvas.height;
		var offx=155,offy=100,rad=75;
		var ang=((performance.now()%18000)/18000)*3.14159265*2;
		var sides=5;
		var lines=[];
		for (var s=0;s<sides;s++) {
			var m1=rad*1.00,m2=rad*0.75;
			var a0=ang+3.14159265*2*(s+0)/sides;
			var a1=ang+3.14159265*2*(s+1)/sides;
			lines[s*2+0]=[Math.cos(a0)*m1+offx,Math.sin(a0)*m1+offy,Math.cos(a1)*m1+offx,Math.sin(a1)*m1+offy];
			lines[s*2+1]=[Math.cos(a1)*m2+offx,Math.sin(a1)*m2+offy,Math.cos(a0)*m2+offx,Math.sin(a0)*m2+offy];
		}
		this.polyfill(this.backbuf32,width,height,lines,1);
		var mag=2;
		offx=345/mag;
		offy/=mag;
		for (var s=0;s<sides;s++) {
			var m1=rad*1.00/mag,m2=rad*0.75/mag;
			var a0=-ang+3.14159265*2*(s+0.5)/sides;
			var a1=-ang+3.14159265*2*(s+1.5)/sides;
			lines[s*2+0]=[Math.cos(a0)*m1+offx,Math.sin(a0)*m1+offy,Math.cos(a1)*m1+offx,Math.sin(a1)*m1+offy];
			lines[s*2+1]=[Math.cos(a1)*m2+offx,Math.sin(a1)*m2+offy,Math.cos(a0)*m2+offx,Math.sin(a0)*m2+offy];
		}
		this.polyfill(this.backbuf32,width,height,lines,mag);
		this.ctx.putImageData(this.backbuf,0,0);
	}

}


//---------------------------------------------------------------------------------
// Demo 2 - Ellipses


class PolyDemo2 {

	constructor(divid) {
		// Swap the <div> with <canvas>
		var elem=document.getElementById(divid);
		this.parentelem=elem.parentNode;
		var canvas=document.createElement("canvas");
		elem.replaceWith(canvas);
		canvas.width=800;
		canvas.height=400;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.backbuf=this.ctx.createImageData(canvas.width,canvas.height);
		this.backbuf32=new Uint32Array(this.backbuf.data.buffer);
		this.input=new Input(canvas);
		this.input.scrollupdate=true;
		canvas.style.width="90%";
		this.draw=new Draw();
		this.draw.setimage(this.canvas,this.backbuf32);
		var state=this;
		function update() {
			state.update();
			requestAnimationFrame(update);
		}
		update();
	}


	update() {
		var draw=this.draw;
		draw.fill(0,0,0);
		draw.setangle(performance.now()*0.0002);
		draw.setcolor(255,0,0);
		var [mx,my]=this.input.getmousepos();
		mx*=this.canvas.width;
		my=(1-my)*this.canvas.height;
		draw.filloval(this.canvas.width/2,this.canvas.height/2,300,100);
		this.ctx.putImageData(this.backbuf,0,0);
	}

}


//---------------------------------------------------------------------------------
// Demo 3 - Primitives


class PolyDemo3 {

	constructor(divid) {
		// Swap the <div> with <canvas>
		var elem=document.getElementById(divid);
		this.parentelem=elem.parentNode;
		var canvas=document.createElement("canvas");
		elem.replaceWith(canvas);
		canvas.width=800;
		canvas.height=400;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.backbuf=this.ctx.createImageData(canvas.width,canvas.height);
		this.backbuf32=new Uint32Array(this.backbuf.data.buffer);
		this.input=new Input(canvas);
		this.input.scrollupdate=true;
		canvas.style.width="90%";
		this.draw=new Draw();
		this.draw.setimage(this.canvas,this.backbuf32);
		var state=this;
		function update() {
			state.update();
			requestAnimationFrame(update);
		}
		update();
	}


	update() {
		var draw=this.draw;
		draw.fill(0,0,0);
		// draw.setangle(performance.now()*0.0002);
		draw.setcolor(255,0,0);
		var [mx,my]=this.input.getmousepos();
		mx*=this.canvas.width;
		my=(1-my)*this.canvas.height;
		// draw.fillrect(mx,my,300,100);
		// draw.filloval(mx,my,300,100);
		draw.linewidth=40.0;
		draw.line(this.canvas.width/2,this.canvas.height/2,mx,my);
		this.ctx.putImageData(this.backbuf,0,0);
	}

}


class PolyDemo4 {

	constructor() {
		var canvas=document.createElement("canvas");
		canvas.width=1000;
		canvas.height=1000;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.backbuf=this.ctx.createImageData(canvas.width,canvas.height);
		this.backbuf32=new Uint32Array(this.backbuf.data.buffer);
		this.input=new Input(canvas);
		this.input.scrollupdate=true;
		this.draw=new Draw();
		this.draw.setimage(this.canvas,this.backbuf32);
		this.test=0;
		var state=this;
		function update() {
			if (state.update()) {
				requestAnimationFrame(update);
			}
		}
		update();
	}


	drawcircle(x,y,rad) {
		// Manually draw a circle pixel by pixel.
		// This is ugly, but it's faster than canvas.arc and drawimage.
		var imgdata32=this.backbuf32;
		var imgwidth=this.canvas.width;
		var imgheight=this.canvas.height;
		if (rad<=0 || x-rad>imgwidth || x+rad<0 || y-rad>imgheight || y+rad<0) {
			return;
		}
		var colrgba=this.draw.rgba32[0];
		var coll=(colrgba&0x00ff00ff)>>>0;
		var colh=(colrgba&0xff00ff00)>>>0;
		var colh2=colh>>>8;
		var minx=Math.floor(x-rad-0.5);
		if (minx<0) {minx=0;}
		var maxx=Math.ceil(x+rad+0.5);
		if (maxx>imgwidth) {maxx=imgwidth;}
		var xs=Math.floor(x);
		if (xs< minx) {xs=minx;}
		if (xs>=maxx) {xs=maxx-1;}
		var miny=Math.floor(y-rad-0.5);
		if (miny<0) {miny=0;}
		var maxy=Math.ceil(y+rad+0.5);
		if (maxy>imgheight) {maxy=imgheight;}
		var pixrow=miny*imgwidth;
		var d,d2,dst;
		var pixmin,pixmax,pix;
		var dx,dy=miny-y+0.5;
		var rad20=rad*rad;
		var rad21=(rad+1)*(rad+1);
		var imul=Math.imul,sqrt=Math.sqrt;
		// var rnorm=256.0/(rad21-rad20);
		for (var y0=miny;y0<maxy;y0++) {
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


	update() {
		var test=this.test++;
		var imgwidth=this.canvas.width;
		var imgheight=this.canvas.height;
		var t0=performance.now();
		if (test===0) {
			for (var i=0;i<100000;i++) {
				var x=(Math.random()*3-1)*imgwidth;
				var y=(Math.random()*3-1)*imgheight;
				var rad=300;
				this.drawcircle(x,y,rad);
			}
			console.log(performance.now()-t0);
			return 1;
		} else if (test===1) {
			for (var i=0;i<100000;i++) {
				var x=(Math.random()*3-1)*imgwidth;
				var y=(Math.random()*3-1)*imgheight;
				var rad=300;
				this.draw.filloval(x,y,rad,rad);
			}
			console.log(performance.now()-t0);
			return 1;
		}
		return 0;
	}

}

