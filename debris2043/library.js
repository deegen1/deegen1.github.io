/*------------------------------------------------------------------------------


library.js - v1.00

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Versions


Input   - v1.13
Random  - v1.08
Vector  - v1.04
Drawing - v1.33
Audio   - v1.06


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Input - v1.13


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
		for (let i=0;i<this.listeners.length;i++) {
			let list=this.listeners[i];
			document.addEventListener(list[0],list[1],list[2]);
		}
	}


	release() {
		if (this.focus!==null) {
			this.focus.tabIndex=this.focustab;
		}
		this.enablenav();
		for (let i=0;i<this.listeners.length;i++) {
			let list=this.listeners[i];
			document.removeEventListener(list[0],list[1],list[2]);
		}
		this.listeners=[];
		this.reset();
	}


	reset() {
		this.mousez=0;
		let statearr=Object.values(this.keystate);
		let statelen=statearr.length;
		for (let i=0;i<statelen;i++) {
			let state=statearr[i];
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
		let focus=this.focus===null?document.hasFocus():Object.is(document.activeElement,this.focus);
		if (this.touchfocus!==0) {focus=true;}
		this.stopnavfocus=focus?this.stopnav:0;
		let time=performance.now()/1000.0;
		let delay=time-this.repeatdelay;
		let rate=1.0/this.repeatrate;
		let state=this.active;
		let active=null;
		let down,next;
		while (state!==null) {
			next=state.active;
			down=focus?state.down:0;
			state.down=down;
			if (down>0) {
				let repeat=Math.floor((delay-state.time)*rate);
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
		let state=this.keystate[code];
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
		let state=this;
		this.MOUSE=this.constructor.MOUSE;
		let keys=Object.keys(this.MOUSE);
		for (let i=0;i<keys.length;i++) {
			let code=this.MOUSE[keys[i]];
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
				let difx=window.scrollX-state.scroll[0];
				let dify=window.scrollY-state.scroll[1];
				state.setmousepos(state.mouseraw[0]+difx,state.mouseraw[1]+dify);
			}
		}
		// Touch controls.
		function touchmove(evt) {
			let touch=evt.touches;
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
			let focus=state.focus;
			if (focus!==null) {
				let touch=evt.touches.item(0);
				let rect=state.getrect(focus);
				let x=touch.pageX-rect.x;
				let y=touch.pageY-rect.y;
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
		let width  =elem.scrollWidth;
		let height =elem.scrollHeight;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem) {
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
		let focus=this.focus;
		if (focus!==null) {
			let rect=this.getrect(focus);
			// If the focus is a canvas, scroll size can differ from pixel size.
			x=(x-rect.x)*((focus.width||focus.scrollWidth)/rect.w);
			y=(y-rect.y)*((focus.height||focus.scrollHeight)/rect.h);
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
		let z=this.mousez;
		this.mousez=0;
		return z;
	}


	// ----------------------------------------
	// Keyboard


	initkeyboard() {
		let state=this;
		this.KEY=this.constructor.KEY;
		let keys=Object.keys(this.KEY);
		for (let i=0;i<keys.length;i++) {
			let code=this.KEY[keys[i]];
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
		let state=this.makeactive(code);
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
		let state=this.makeactive(code);
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
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
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
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
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
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
			if (state!==null && state!==undefined && state.repeat===1) {
				return 1;
			}
		}
		return 0;
	}

}


//---------------------------------------------------------------------------------
// Random - v1.08


class Random {

	constructor(seed) {
		this.acc=0;
		this.inc=1;
		this.seed(seed);
	}


	seed(seed) {
		if (seed===undefined || seed===null) {
			seed=performance.timeOrigin+performance.now();
		}
		if (seed.length===2) {
			this.acc=seed[0];
			this.inc=seed[1];
		} else if (seed.acc!==undefined) {
			this.acc=seed.acc;
			this.inc=seed.inc;
		} else {
			this.acc=(seed/4294967296)>>>0;
			this.inc=seed>>>0;
			this.acc=this.getu32();
			this.inc=(this.getu32()|1)>>>0;
		}
	}


	getstate() {
		return [this.acc,this.inc];
	}


	static hashu32(val) {
		val+=0x66daacfd;
		val=Math.imul(val^(val>>>16),0xf8b7629f);
		val=Math.imul(val^(val>>> 8),0xcbc5c2b5);
		val=Math.imul(val^(val>>>24),0xf5a5bda5);
		return val>>>0;
	}


	getu32() {
		let val=(this.acc+this.inc)>>>0;
		this.acc=val;
		val+=0x66daacfd;
		val=Math.imul(val^(val>>>16),0xf8b7629f);
		val=Math.imul(val^(val>>> 8),0xcbc5c2b5);
		val=Math.imul(val^(val>>>24),0xf5a5bda5);
		return val>>>0;
	}


	modu32(mod) {
		// rand%mod is not converted to a signed int.
		let rand,rem,nmod=(-mod)>>>0;
		do {
			rand=this.getu32();
			rem=rand%mod;
		} while (rand-rem>nmod);
		return rem;
	}


	getf() {
		// Returns a float in [0,1).
		return this.getu32()*(1.0/4294967296.0);
	}


	getnorm() {
		// Transform a uniform distribution to a normal one via sqrt(2)*erfinv(2*u-1).
		// erfinv credit: njuffa, https://stackoverflow.com/a/49743348
		let u=(this.getu32()-2147483647.5)*(1/2147483648);
		let t=Math.log(1-u*u),p;
		if (t<-6.125) {
			p=    4.294932181e-10;
			p=p*t+4.147083705e-8;
			p=p*t+1.727466590e-6;
			p=p*t+4.017907374e-5;
			p=p*t+5.565679449e-4;
			p=p*t+4.280807652e-3;
			p=p*t+6.833279087e-3;
			p=p*t-3.742661647e-1;
			p=p*t+1.187962704e+0;
		} else {
			p=    7.691594063e-9;
			p=p*t+2.026362239e-7;
			p=p*t+1.736297774e-6;
			p=p*t+1.597546919e-7;
			p=p*t-7.941244165e-5;
			p=p*t-2.088759943e-4;
			p=p*t+3.273461437e-3;
			p=p*t+1.631897530e-2;
			p=p*t-3.281194328e-1;
			p=p*t+1.253314090e+0;
		}
		return p*u;
	}

}


//---------------------------------------------------------------------------------
// Vector - v1.04


class Vector extends Array {

	static rnd=new Random();


	constructor(elem) {
		let l=elem.length;
		if (l!==undefined) {
			super(l);
			for (let i=0;i<l;i++) {this[i]=elem[i];}
		} else {
			super(elem);
			this.fill(0);
		}
	}


	tostring() {
		return "["+this.join(", ")+"]";
	}


	set(val) {
		let l=this.length,i;
		if (val.length!==undefined) {
			for (i=0;i<l;i++) {this[i]=val[i];}
		} else {
			for (i=0;i<l;i++) {this[i]=val;}
		}
		return this;
	}


	// ----------------------------------------
	// Algebra


	neg() {
		let u=this,len=this.length,r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=-u[i];}
		return r;
	}


	iadd(v) {
		// u+=v
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]+=v[i];}
		return this;
	}


	add(v) {
		// u+v
		let u=this,len=this.length,r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=u[i]+v[i];}
		return r;
	}


	isub(v) {
		// u-=v
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]-=v[i];}
		return this;
	}


	sub(v) {
		// u-v
		let u=this,len=this.length,r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=u[i]-v[i];}
		return r;
	}


	imul(s) {
		// u*=s
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]*=s;}
		return this;
	}


	mul(s) {
		// u*s
		let u=this,len=this.length,r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=u[i]*s;}
		return r;
	}


	dot(v) {
		// u*v
		let u=this,len=this.length,sum=0;
		for (let i=0;i<len;i++) {sum+=u[i]*v[i];}
		return sum;
	}


	// ----------------------------------------
	// Geometry


	dist(v) {
		// |u-v|
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i]-v[i];sum+=x*x;}
		return Math.sqrt(sum);
	}


	sqr() {
		// u*u
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i];sum+=x*x;}
		return sum;
	}


	mag() {
		// sqrt(u*u)
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i];sum+=x*x;}
		return Math.sqrt(sum);
	}

	randomize() {
		let u=this,len=this.length;
		let mag,i,x,rnd=Vector.rnd;
		do {
			mag=0;
			for (i=0;i<len;i++) {
				x=rnd.getnorm();
				u[i]=x;
				mag+=x*x;
			}
		} while (mag<1e-10);
		mag=1.0/Math.sqrt(mag);
		for (i=0;i<len;i++) {
			u[i]*=mag;
		}
		return this;
	}


	static random(dim) {
		return (new Vector(dim)).randomize();
	}


	normalize() {
		let u=this,len=this.length,mag=0,i,x;
		for (i=0;i<len;i++) {
			x=u[i];
			mag+=x*x;
		}
		if (mag<1e-10) {
			this.randomize();
		} else {
			mag=1.0/Math.sqrt(mag);
			for (i=0;i<len;i++) {
				u[i]*=mag;
			}
		}
		return this;
	}


	norm() {
		return (new Vector(this)).normalize();
	}

}


//---------------------------------------------------------------------------------
// Anti-aliased Image Drawing - v1.33


class _DrawTransform {

	static MATXX=0;
	static MATXY=1;
	static MATX =2;
	static MATYX=3;
	static MATYY=4;
	static MATY =5;
	static MULX =6;
	static MULY =7;
	static ANG  =8;
	static ROTX =9;
	static ROTY =10;
	static OFFX =11;
	static OFFY =12;


	constructor(trans) {
		if (trans!==undefined) {
			this.data=trans.data.slice();
		} else {
			this.data=new Float64Array([1,0,0,0,1,0,1,1,0,1,0,0,0]);
		}
	}


	clear() {
		this.data.set([1,0,0,0,1,0,1,1,0,1,0,0,0]);
	}


	copy(t) {
		this.data.set(t.data);
		return this;
	}


	calcmatrix() {
		// Precalculates the transformation matrix.
		// point -> scale -> rotate -> offset
		let data=this.data;
		data[0]= data[ 9]*data[6];
		data[1]=-data[10]*data[7];
		data[2]= data[11];
		data[3]= data[10]*data[6];
		data[4]= data[ 9]*data[7];
		data[5]= data[12];
	}


	setangle(ang) {
		let data=this.data;
		ang%=6.283185307;
		data[ 8]=ang;
		data[ 9]=Math.cos(ang);
		data[10]=Math.sin(ang);
		this.calcmatrix();
		return this;
	}


	addangle(ang) {
		return this.setangle(this.data[8]+ang);
	}


	getangle() {
		return this.data[3];
	}


	setscale(x,y) {
		if (y===undefined) {y=x[1];x=x[0];}
		this.data[6]=x;
		this.data[7]=y;
		this.calcmatrix();
		return this;
	}


	mulscale(x,y) {
		if (y===undefined) {y=x[1];x=x[0];}
		this.data[6]*=x;
		this.data[7]*=y;
		this.calcmatrix();
		return this;
	}


	getscale() {
		return [this.data[6],this.data[7]];
	}


	setoffset(x,y) {
		if (y===undefined) {y=x[1];x=x[0];}
		let data=this.data;
		data[11]=x;
		data[12]=y;
		data[2]=data[11];
		data[5]=data[12];
		return this;
	}


	addoffset(x,y,apply) {
		if (y===undefined) {y=x[1];x=x[0];}
		let data=this.data;
		if (apply) {
			let w=x;
			x=w*data[0]+y*data[1];
			y=w*data[3]+y*data[4];
		}
		data[11]+=x;
		data[12]+=y;
		data[2]=data[11];
		data[5]=data[12];
		return this;
	}


	getoffset() {
		return [this.data[11],this.data[12]];
	}


	apply(x,y) {
		// Applies all transformations to a point.
		if (y===undefined) {y=x[1];x=x[0];}
		let data=this.data,w=x;
		x=w*data[0]+y*data[1]+data[2];
		y=w*data[3]+y*data[4]+data[5];
		return [x,y];
	}


	undo(x,y) {
		// Applies the inverse transform to [x,y].
		if (y===undefined) {y=x[1];x=x[0];}
		let data=this.data,w=x;
		let det=data[0]*data[4]-data[1]*data[3];
		w-=data[2];
		y-=data[5];
		x=(w*data[4]-y*data[1])/det;
		y=(y*data[0]-w*data[3])/det;
		return [x,y];
	}

}


class _DrawPoly {

	static MOVE =0;
	static CLOSE=1;
	static LINE =2;
	static CURVE=3;


	constructor(str) {
		// Copy static variables.
		Object.assign(this,this.constructor);
		this.vertarr=new Array();
		this.begin();
		if (str) {this.fromstring(str);}
	}


	begin() {
		this.vertidx=0;
		this.moveidx=-2;
		this.aabb={minx:Infinity,maxx:-Infinity,dx:0,
		           miny:Infinity,maxy:-Infinity,dy:0};
		return this;
	}


	aabbupdate() {
		// Recompute the bounding box.
		let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
		let varr=this.vertarr,vidx=this.vertidx;
		for (let i=0;i<vidx;i++) {
			let x=varr[i].x,y=varr[i].y;
			if (minx>x) {minx=x;}
			if (miny>y) {miny=y;}
			if (maxx<x) {maxx=x;}
			if (maxy<y) {maxy=y;}
		}
		this.aabb={minx:minx,maxx:maxx,dx:maxx-minx,
		           miny:miny,maxy:maxy,dy:maxy-miny};
	}


	addvert(type,x,y) {
		let idx=this.vertidx++;
		let arr=this.vertarr;
		if (idx>=arr.length) {
			let len=8;
			while (len<=idx) {len+=len;}
			while (arr.length<len) {arr.push({type:-1,i:-1,x:0,y:0});}
		}
		let v=arr[idx];
		v.type=type;
		v.i=this.moveidx;
		v.x=x;
		v.y=y;
		let aabb=this.aabb;
		if (aabb.minx>x) {aabb.minx=x;aabb.dx=aabb.maxx-x;}
		if (aabb.miny>y) {aabb.miny=y;aabb.dy=aabb.maxy-y;}
		if (aabb.maxx<x) {aabb.maxx=x;aabb.dx=x-aabb.minx;}
		if (aabb.maxy<y) {aabb.maxy=y;aabb.dy=y-aabb.miny;}
		return v;
	}


	moveto(x,y) {
		// Move the pen to [x,y].
		if (this.moveidx===this.vertidx-1) {this.vertidx--;}
		else {this.moveidx=this.vertidx;}
		this.addvert(this.MOVE,x,y);
		return this;
	}


	lineto(x,y) {
		// Draw a line from the last vertex to [x,y].
		// If no moveto() was ever called, behave as moveto().
		if (this.moveidx<0) {return this.moveto(x,y);}
		this.addvert(this.LINE,x,y);
		return this;
	}


	curveto(x0,y0,x1,y1,x2,y2) {
		// Draw a cubic bezier curve.
		if (this.moveidx<0) {this.moveto(0,0);}
		this.addvert(this.CURVE,x0,y0);
		this.addvert(this.CURVE,x1,y1);
		this.addvert(this.CURVE,x2,y2);
		return this;
	}


	close() {
		// Draw a line from the current vertex to our last moveto() call.
		let move=this.moveidx;
		if (move<0) {return this;}
		if (move===this.vertidx-1) {
			this.vertidx--;
			return this;
		}
		let m=this.vertarr[move];
		m.i=this.vertidx;
		this.addvert(this.CLOSE,m.x,m.y);
		this.moveidx=-2;
		return this;
	}


	tostring(precision=6) {
		// Converts the path to an SVG string.
		let p=precision;
		function tostring(x) {
			let s=x.toFixed(p);
			if (p>0) {
				let i=s.length;
				while (i>0 && s.charCodeAt(i-1)===48) {i--;}
				if (s.charCodeAt(i-1)===46) {i--;}
				s=s.substring(0,i);
			}
			return s;
		}
		let name=["M ","Z","L ","C "];
		let ret="";
		for (let i=0;i<this.vertidx;i++) {
			let v=this.vertarr[i],t=v.type;
			ret+=(i?" ":"")+name[t];
			if (t!==this.CLOSE) {
				ret+=tostring(v.x)+" "+tostring(v.y);
			}
			if (t===this.CURVE) {
				v=this.vertarr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
				v=this.vertarr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
			}
		}
		return ret;
	}


	fromstring(str) {
		// Parses an SVG path. Supports M, Z, L, C.
		this.begin();
		let type,j,len=str.length;
		let params=[2,0,2,6],v=[0,0,0,0,0,0];
		let off=[0,0];
		function isnum(c) {
			c=c.length!==undefined?c.charCodeAt(0):c;
			return c>42 && c<58 && c!==44 && c!==47;
		}
		for (let i=0;i<len;) {
			let c=str[i++];
			if      (c==="M")  {type=0;}
			else if (c==="m")  {type=1;}
			else if (c==="Z")  {type=2;}
			else if (c==="z")  {type=3;}
			else if (c==="L")  {type=4;}
			else if (c==="l")  {type=5;}
			else if (c==="C")  {type=6;}
			else if (c==="c")  {type=7;}
			else if (isnum(c)) {type=2;i--;}
			else {continue;}
			if ((type&1) && this.vertidx) {
				let l=this.vertarr[this.vertidx-1];
				off=[l.x,l.y];
			} else {
				off=[0,0];
			}
			let p=params[type>>1];
			for (let t=0;t<p;t++) {
				for (j=i;j<len && !isnum(str.charCodeAt(j));j++) {}
				for (i=j;i<len && isnum(str.charCodeAt(i));i++) {}
				v[t]=parseFloat(str.substring(j,i))+off[t&1];
			}
			if      (type<2) {this.moveto(v[0],v[1]);}
			else if (type<4) {this.close();}
			else if (type<6) {this.lineto(v[0],v[1]);}
			else {this.curveto(v[0],v[1],v[2],v[3],v[4],v[5]);}
		}
	}


	addstrip(points) {
		// Assumes a loop of [x0,y0,x1,y1,...] where every pair is a separate line.
		let len=points.length;
		if (len<=0 || (len%2)!==0) {return;}
		this.moveto(points[0],points[1]);
		for (let i=2;i<len;i+=2) {
			this.lineto(points[i],points[i+1]);
		}
		this.close();
		return this;
	}


	// addpoly(poly,transform) {
	// 	return this;
	// }


	addline(x0,y0,x1,y1,rad) {
		let dx=x1-x0,dy=y1-y0;
		let dist=dx*dx+dy*dy;
		if (dist<1e-20) {
			x1=x0;
			y1=y0;
			dx=rad;
			dy=0.0;
		} else {
			dist=rad/Math.sqrt(dist);
			dx*=dist;
			dy*=dist;
		}
		const a=1.00005519,b=0.55342686,c=0.99873585;
		let ax=a*dx,ay=a*dy;
		let bx=b*dx,cy=c*dy,c0=bx-cy,c3=bx+cy;
		let cx=c*dx,by=b*dy,c1=cx+by,c2=cx-by;
		this.moveto(x1+ay,y1-ax);
		this.curveto(x1+c3,y1-c2,x1+c1,y1-c0,x1+ax,y1+ay);
		this.curveto(x1+c2,y1+c3,x1+c0,y1+c1,x1-ay,y1+ax);
		this.lineto(x0-ay,y0+ax);
		this.curveto(x0-c3,y0+c2,x0-c1,y0+c0,x0-ax,y0-ay);
		this.curveto(x0-c2,y0-c3,x0-c0,y0-c1,x0+ay,y0-ax);
		this.close();
		return this;
	}


	addrect(x,y,w,h) {
		this.addstrip([x,y,x+w,y,x+w,y+h,x,y+h]);
		return this;
	}


	addoval(x,y,xrad,yrad) {
		// David Ellsworth and Spencer Mortensen constants.
		const a=1.00005519,b=0.55342686,c=0.99873585;
		let ax=-a*xrad,ay=a*yrad;
		let bx=-b*xrad,by=b*yrad;
		let cx=-c*xrad,cy=c*yrad;
		this.moveto(x,y+ay);
		this.curveto(x+bx,y+cy,x+cx,y+by,x+ax,y   );
		this.curveto(x+cx,y-by,x+bx,y-cy,x   ,y-ay);
		this.curveto(x-bx,y-cy,x-cx,y-by,x-ax,y   );
		this.curveto(x-cx,y+by,x-bx,y+cy,x   ,y+ay);
		return this;
	}

}


class _DrawImage {
	// Pixel data is in R, G, B, A, R, G, B, A,... format.

	constructor(width,height) {
		let srcdata=null;
		if (height===undefined) {
			let img=width;
			if (width===undefined) {
				width=0;
				height=0;
			} else if (img instanceof _DrawImage) {
				width=img.width;
				height=img.height;
				srcdata=img.data8;
			} else if (img instanceof HTMLCanvasElement) {
				width=img.width;
				height=img.height;
				srcdata=img.getContext("2d").createImageData(width,height).data;
			} else if (img instanceof ImageData) {
				width=img.width;
				height=img.height;
				srcdata=img.data;
			}
		}
		this.resize(width,height);
		if (srcdata!==null) {this.data8.set(srcdata);}
	}


	resize(width,height) {
		this.width=width;
		this.height=height;
		if (width<1 || height<1) {
			width=1;
			height=1;
		}
		this.data8  =new Uint8Array(width*height*4);
		this.datac8 =new Uint8ClampedArray(this.data8.buffer);
		this.data32 =new Uint32Array(this.data8.buffer);
		this.imgdata=new ImageData(this.datac8,width,height);
	}


	savefile(name) {
		// Save the image to a TGA file.
		let blob=new Blob([this.totga()]);
		let link=document.createElement("a");
		link.href=window.URL.createObjectURL(blob);
		link.download=name;
		link.click();
	}


	fromtga(src) {
		// Load a TGA image from an array.
		let len=src.length;
		if (len<18) {
			throw "TGA too short";
		}
		let w=src[12]+(src[13]<<8);
		let h=src[14]+(src[15]<<8);
		let bits=src[16],bytes=bits>>>3;
		if (w*h*bytes+18!==len || src[2]!==2 || (bits!==24 && bits!==32)) {
			throw "TGA corrupt";
		}
		// Load the image data.
		this.resize(w,h);
		let dst=this.data8,didx=0,sidx=18,a=255;
		for (let y=0;y<h;y++) {
			for (let x=0;x<w;x++) {
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				if (bytes===4) {a=src[sidx++];}
				dst[didx++]=a;
			}
		}
	}


	totga() {
		// Returns a Uint8Array with TGA image data.
		let w=this.width,h=this.height;
		if (w>0xffff || h>0xffff) {throw "Size too big: "+w+", "+h;}
		let didx=18,dst=new Uint8Array(w*h*4+didx);
		let sidx= 0,src=this.data8;
		dst.set([0,0,2,0,0,0,0,0,0,0,0,0,w&255,w>>>8,h&255,h>>>8,32,0],0,didx);
		for (let y=0;y<h;y++) {
			for (let x=0;x<w;x++) {
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
			}
		}
		return dst;
	}


	todataurl() {
		// Returns a data string for use in <img src="..."> objects.
		let canv=document.createElement("canvas");
		canv.width=this.width;
		canv.height=this.height;
		canv.getContext("2d").putImageData(this.imgdata);
		let strdata=canv.toDataURL("image/png");
		canv.remove();
		return strdata;
	}

}


class _DrawFont {

	static deffont=`monospace
		none
		1000
		SPC 580
		! 580 M 235 56 L 343 56 L 329 586 L 250 586 Z M 288 793 C 250 793 220 763 220 725 C 220 687 250 657 288 657 C 326 657 356 687 357 725 C 356 763 326 793 288 793
		" 580 M 133 56 L 246 56 L 232 298 L 148 298 Z M 334 56 L 447 56 L 433 298 L 348 298 Z
		# 580 M 181 111 L 256 111 L 239 281 L 372 281 L 389 111 L 465 111 L 447 281 L 558 281 L 558 348 L 440 348 L 422 528 L 530 528 L 530 595 L 415 595 L 397 784 L 321 784 L 339 595 L 208 595 L 189 784 L 113 784 L 132 595 L 22 595 L 22 528 L 139 528 L 157 348 L 49 348 L 49 281 L 164 281 Z M 233 348 L 215 528 L 347 528 L 365 348 Z
		$ 580 M 305 14 L 379 14 L 366 115 C 399 119 435 122 470 131 L 470 210 C 436 202 402 194 356 190 L 327 411 C 459 460 517 511 517 599 C 515 762 328 783 277 783 L 261 906 L 186 906 L 202 783 C 156 779 106 774 57 761 L 57 676 C 93 688 161 702 213 704 L 244 472 C 159 441 64 398 62 294 C 62 209 127 120 292 112 Z M 282 189 C 209 195 160 222 158 281 C 157 338 210 364 256 382 Z M 288 704 C 382 696 419 662 421 603 C 423 546 367 521 314 500 Z
		% 580 M 484 56 L 569 56 L 95 784 L 10 784 Z M 19 199 C 19 121 69 49 160 49 C 244 49 295 103 295 199 C 295 281 248 357 155 357 C 65 357 19 297 19 199 M 158 114 C 128 114 95 139 95 204 C 95 269 124 292 156 292 C 190 292 219 263 219 204 C 219 133 187 114 158 114 M 285 633 C 285 555 335 483 426 483 C 510 483 561 537 561 633 C 561 715 514 791 421 791 C 331 791 285 731 285 633 M 424 548 C 394 548 361 573 361 638 C 361 703 390 726 422 726 C 456 726 485 697 485 638 C 485 567 453 548 424 548
		& 580 M 416 579 C 428 544 439 495 437 433 L 527 433 C 527 506 519 575 476 654 L 580 784 L 461 784 L 416 728 C 371 763 318 791 237 791 C 108 791 29 716 29 602 C 29 503 85 445 156 402 C 120 355 88 310 88 242 C 88 122 173 71 268 71 C 364 71 436 126 436 221 C 436 312 375 363 283 414 Z M 238 357 C 279 333 345 301 345 229 C 345 177 315 147 265 147 C 209 147 180 186 180 234 C 180 289 214 327 238 357 M 202 460 C 167 485 122 523 122 593 C 122 668 176 714 247 714 C 295 714 330 698 366 665 Z
		' 580 M 232 56 L 349 56 L 334 298 L 246 298 Z
		( 580 M 446 70 C 326 185 246 336 246 508 C 247 677 324 828 446 945 L 392 1000 C 266 882 154 726 154 508 C 154 290 283 115 394 17 Z
		) 580 M 188 17 C 309 129 425 287 425 504 C 425 710 327 869 186 1000 L 134 947 C 247 832 333 700 333 504 C 333 333 243 176 134 72 Z
		* 580 M 254 56 L 327 56 L 314 233 L 460 134 L 496 197 L 337 276 L 495 352 L 460 413 L 315 317 L 327 493 L 254 493 L 265 317 L 117 413 L 85 353 L 243 275 L 85 195 L 120 135 L 266 233 Z
		+ 580 M 246 255 L 334 255 L 334 464 L 537 464 L 537 542 L 334 542 L 334 752 L 246 752 L 246 542 L 43 542 L 43 464 L 246 464 Z
		, 580 M 259 802 C 259 747 210 739 210 685 C 210 649 236 618 279 618 C 326 618 371 652 371 742 C 371 864 277 961 123 960 L 123 890 C 159 891 258 877 259 802
		- 580 M 136 461 L 444 461 L 444 545 L 136 545 Z
		. 580 M 286 793 C 238 793 200 754 200 708 C 200 661 239 621 286 621 C 333 621 372 662 372 708 C 372 753 334 793 286 793
		/ 580 M 413 56 L 498 56 L 145 895 L 59 895 Z
		0 580 M 295 101 C 447 101 534 219 534 438 C 535 668 444 793 284 793 C 126 793 45 668 45 438 C 45 219 142 101 295 101 M 423 296 C 410 244 368 178 291 178 C 175 178 124 310 138 508 Z M 155 594 C 184 688 233 716 291 716 C 405 716 458 579 440 381 Z
		1 580 M 284 108 L 363 108 L 363 701 L 513 701 L 513 784 L 91 784 L 91 701 L 264 701 L 264 209 L 103 297 L 70 221 Z
		2 580 M 79 190 C 125 148 173 101 283 101 C 414 101 483 187 483 296 C 483 435 394 500 192 699 L 519 699 L 519 784 L 76 784 L 76 704 C 286 486 386 426 386 304 C 386 162 232 140 128 249 Z
		3 580 M 103 128 C 153 110 203 101 255 101 C 366 101 474 143 474 266 C 474 343 439 390 363 428 C 421 436 506 485 506 581 C 506 721 383 793 211 793 C 164 793 124 789 85 784 L 85 704 C 125 710 164 715 219 715 C 340 715 413 679 413 588 C 413 500 323 476 262 474 L 167 474 L 167 400 L 257 400 C 349 393 380 338 380 281 C 380 201 313 142 103 205 Z
		4 580 M 309 111 L 438 111 L 438 556 L 553 556 L 553 635 L 438 635 L 438 784 L 346 784 L 346 635 L 22 635 L 22 556 Z M 346 556 L 346 198 L 112 556 Z
		5 580 M 104 111 L 466 111 L 466 189 L 188 189 L 188 378 L 261 378 C 422 378 502 457 502 569 C 502 706 371 793 220 793 C 174 793 135 788 92 784 L 92 702 C 136 713 178 714 225 715 C 365 715 406 638 406 575 C 406 489 340 457 242 455 L 104 455 Z
		6 580 M 475 189 L 386 189 C 269 189 161 256 156 411 C 214 377 277 369 319 369 C 457 369 527 448 527 567 C 527 677 455 793 291 793 C 145 793 64 702 64 493 C 64 240 180 111 393 111 L 475 111 Z M 156 487 C 156 661 204 719 299 719 C 380 719 434 666 434 575 C 434 496 398 443 306 441 C 259 441 216 453 156 487
		7 580 M 60 111 L 515 111 L 515 195 L 233 784 L 131 784 L 424 194 L 60 194 Z
		8 580 M 295 101 C 443 101 504 167 504 263 C 504 354 439 399 379 432 C 472 480 519 531 519 616 C 519 729 421 793 286 793 C 168 793 61 743 61 626 C 61 529 126 480 202 439 C 94 383 76 321 76 270 C 76 169 163 101 295 101 M 298 393 C 370 359 413 321 413 266 C 413 206 370 176 292 176 C 219 176 168 201 168 263 C 168 333 236 362 298 393 M 283 478 C 202 517 158 556 158 618 C 158 677 207 716 290 716 C 380 716 422 676 422 621 C 422 554 362 513 283 478
		9 580 M 285 101 C 461 101 515 243 515 409 C 515 704 356 784 148 784 L 93 784 L 93 706 L 153 706 C 337 706 414 631 423 483 C 379 506 333 525 254 525 C 135 525 51 453 51 324 C 51 193 153 101 285 101 M 423 407 C 423 282 399 175 281 175 C 188 175 146 241 146 319 C 146 414 198 452 271 452 C 334 452 386 432 423 407
		: 580 M 290 416 C 246 416 211 381 211 337 C 211 293 246 258 290 258 C 334 258 369 293 369 337 C 369 381 334 416 290 416 M 290 793 C 246 793 211 758 211 714 C 211 670 246 635 290 635 C 334 635 369 670 369 714 C 369 758 334 793 290 793
		; 580 M 290 416 C 246 416 211 381 211 337 C 211 293 246 258 290 258 C 334 258 369 293 369 337 C 369 381 334 416 290 416 M 129 890 C 161 892 265 877 265 802 C 265 747 216 739 216 685 C 216 647 244 618 285 618 C 329 618 378 651 378 742 C 378 863 283 961 129 960 Z
		< 580 M 417 214 L 473 271 L 192 503 L 473 735 L 417 792 L 71 503 Z
		= 580 M 69 375 L 511 375 L 511 451 L 69 451 Z M 69 555 L 511 555 L 511 631 L 69 631 Z
		> 580 M 163 214 L 509 503 L 163 792 L 108 735 L 389 503 L 108 271 Z
		? 580 M 156 56 C 358 50 475 166 475 287 C 475 375 431 453 294 459 L 290 586 L 213 586 L 207 389 L 267 389 C 298 389 378 386 378 294 C 378 179 264 132 156 136 Z M 251 794 C 213 794 183 764 183 726 C 183 688 212 657 251 657 C 289 657 319 688 319 726 C 319 764 289 794 251 794
		@ 580 M 443 306 L 402 571 C 389 659 398 684 426 684 C 472 683 500 596 500 425 C 500 226 449 112 333 112 C 226 112 152 236 122 328 C 67 499 68 651 96 771 C 143 964 285 961 437 893 L 437 959 C 380 981 341 998 261 998 C 57 998 5 809 5 607 C 5 447 33 344 78 246 C 132 128 227 50 335 50 C 439 50 509 109 544 207 C 569 278 580 391 568 521 C 558 627 524 751 418 751 C 375 751 339 733 339 675 C 308 735 278 751 242 751 C 173 751 145 697 145 600 C 145 454 198 308 314 308 C 346 308 359 314 376 322 Z M 349 390 C 337 374 299 362 273 396 C 245 432 227 513 227 579 C 227 652 230 684 256 684 C 271 684 286 673 299 648 L 316 615 Z
		A 580 M 354 111 L 575 784 L 475 784 L 428 637 L 148 637 L 100 784 L 5 784 L 229 111 Z M 174 555 L 402 555 L 288 195 Z
		B 580 M 274 111 C 387 111 499 141 499 275 C 499 349 466 402 388 427 C 479 446 523 507 523 583 C 523 716 411 783 265 784 L 82 784 L 82 111 Z M 173 399 L 272 399 C 346 399 404 361 404 288 C 404 213 342 188 270 188 L 173 188 Z M 173 707 L 275 707 C 372 707 426 669 426 589 C 426 523 370 475 275 475 L 173 475 Z
		C 580 M 512 224 C 461 197 413 183 353 183 C 201 183 145 315 145 444 C 145 636 228 710 352 710 C 423 710 462 694 512 673 L 512 759 C 463 776 422 792 344 792 C 124 792 47 647 47 444 C 47 251 154 102 353 102 C 421 102 467 115 512 134 Z
		D 580 M 234 111 C 498 111 542 291 542 437 C 542 709 381 784 207 784 L 56 784 L 56 111 Z M 228 705 C 336 705 446 652 446 437 C 446 267 380 189 228 188 L 148 188 L 148 705 Z
		E 580 M 486 111 L 486 188 L 195 188 L 195 397 L 475 397 L 475 474 L 195 474 L 195 706 L 486 706 L 486 784 L 104 784 L 104 111 Z
		F 580 M 485 111 L 485 189 L 199 189 L 199 407 L 470 407 L 470 484 L 199 484 L 199 784 L 106 784 L 106 111 Z
		G 580 M 518 225 C 478 206 429 183 354 183 C 211 183 130 293 130 447 C 130 608 187 707 342 712 C 374 712 402 708 431 698 L 431 484 L 293 484 L 293 408 L 521 408 L 521 752 C 469 775 408 793 332 793 C 127 793 34 654 34 447 C 34 240 159 101 355 101 C 422 101 475 115 518 134 Z
		H 580 M 432 111 L 523 111 L 523 784 L 432 784 L 432 475 L 149 475 L 149 784 L 57 784 L 57 111 L 149 111 L 149 396 L 432 396 Z
		I 580 M 89 111 L 491 111 L 491 188 L 336 188 L 336 706 L 491 706 L 491 784 L 89 784 L 89 706 L 244 706 L 244 188 L 89 188 Z
		J 580 M 103 111 L 452 111 L 452 573 C 452 711 368 791 243 791 C 173 791 117 770 94 754 L 94 662 C 119 681 177 711 240 711 C 320 711 359 659 359 579 L 359 190 L 103 190 Z
		K 580 M 80 111 L 172 111 L 172 424 L 419 111 L 527 111 L 261 431 L 539 784 L 424 784 L 172 454 L 172 784 L 80 784 Z
		L 580 M 120 111 L 213 111 L 213 706 L 507 706 L 507 784 L 120 784 Z
		M 580 M 58 111 L 167 111 L 287 450 L 411 111 L 522 111 L 555 784 L 465 784 L 446 203 L 315 565 L 252 565 L 125 203 L 112 784 L 25 784 Z
		N 580 M 61 111 L 179 111 L 434 663 L 434 111 L 519 111 L 519 784 L 400 784 L 147 229 L 147 784 L 61 784 Z
		O 580 M 295 101 C 472 101 551 237 551 441 C 551 674 444 793 285 793 C 79 793 30 621 30 444 C 30 262 112 101 295 101 M 291 181 C 182 181 125 289 125 441 C 125 628 185 713 287 713 C 406 713 456 597 456 451 C 456 282 405 181 291 181
		P 580 M 272 111 C 423 111 523 182 523 314 C 523 444 426 542 261 542 L 173 542 L 173 784 L 82 784 L 82 111 Z M 256 464 C 369 464 428 417 428 320 C 428 224 354 187 270 187 L 173 187 L 173 464 Z
		Q 580 M 580 917 C 541 948 500 969 435 969 C 314 969 246 894 241 790 C 87 768 29 630 29 453 C 29 263 112 101 295 101 C 509 101 551 292 551 438 C 551 592 505 756 326 790 C 338 858 380 890 441 890 C 483 889 507 879 539 854 Z M 288 712 C 411 712 455 594 456 448 C 456 286 408 183 289 183 C 187 183 124 280 125 440 C 125 638 192 711 288 712
		R 580 M 270 111 C 430 111 490 187 490 287 C 490 388 424 445 346 464 C 378 472 412 516 424 542 L 541 784 L 438 784 L 333 560 C 316 523 284 485 232 485 L 179 485 L 179 784 L 88 784 L 88 111 Z M 255 411 C 343 411 394 370 394 296 C 394 231 356 188 269 188 L 179 188 L 179 411 Z
		S 580 M 470 203 C 426 192 375 180 308 180 C 255 180 161 195 161 276 C 161 324 203 359 258 381 L 361 423 C 474 469 513 529 513 603 C 513 728 408 793 243 793 C 180 793 121 785 57 770 L 57 681 C 105 699 172 712 247 712 C 374 712 418 673 418 606 C 418 564 382 528 322 504 L 222 463 C 141 430 65 381 65 286 C 65 161 183 101 314 101 C 382 101 420 112 470 121 Z
		T 580 M 44 111 L 536 111 L 536 189 L 336 189 L 336 784 L 244 784 L 244 189 L 44 189 Z
		U 580 M 148 111 L 148 571 C 148 665 195 716 290 716 C 390 716 433 651 433 557 L 433 111 L 524 111 L 524 562 C 524 698 435 793 288 793 C 173 793 56 751 56 564 L 56 111 Z
		V 580 M 106 111 L 292 698 L 480 111 L 578 111 L 349 784 L 225 784 L 2 111 Z
		W 580 M 110 111 L 143 695 L 257 338 L 321 338 L 446 695 L 475 111 L 557 111 L 511 784 L 393 784 L 286 467 L 184 784 L 70 784 L 23 111 Z
		X 580 M 136 111 L 290 365 L 445 111 L 550 111 L 344 436 L 567 784 L 452 784 L 288 512 L 123 784 L 9 784 L 234 440 L 27 111 Z
		Y 580 M 110 111 L 294 456 L 475 111 L 580 111 L 336 543 L 336 784 L 244 784 L 244 541 L 0 111 Z
		Z 580 M 67 111 L 515 111 L 515 184 L 171 699 L 522 699 L 522 784 L 57 784 L 57 715 L 403 194 L 67 194 Z
		[ 580 M 178 38 L 432 38 L 432 110 L 263 110 L 263 923 L 432 923 L 432 995 L 178 995 Z
		\\ 580 M 83 56 L 168 56 L 521 895 L 436 895 Z
		] 580 M 149 38 L 402 38 L 402 995 L 149 995 L 149 923 L 316 923 L 316 110 L 149 110 Z
		^ 580 M 251 111 L 324 111 L 522 440 L 433 440 L 284 182 L 143 440 L 63 440 Z
		_ 580 M 0 921 L 580 921 L 580 995 L 0 995 Z
		\` 580 M 90 56 L 219 56 L 344 181 L 254 181 Z
		a 580 M 112 291 C 164 273 222 258 293 258 C 429 258 495 322 495 426 L 495 784 L 415 784 L 413 714 C 381 745 327 793 235 793 C 125 793 69 736 69 646 C 69 542 150 481 275 481 L 405 481 L 405 432 C 405 385 375 334 287 334 C 239 334 185 342 112 372 Z M 287 549 C 219 549 163 576 163 643 C 163 689 195 718 248 718 C 297 718 359 685 405 640 L 405 549 Z
		b 580 M 83 56 L 172 56 L 168 352 C 212 292 270 258 346 258 C 461 258 524 359 524 512 C 524 714 408 790 268 790 C 193 790 143 776 83 754 Z M 172 695 C 204 706 236 717 278 717 C 399 717 433 617 433 519 C 433 434 410 336 329 336 C 266 336 229 377 172 444 Z
		c 580 M 484 369 C 446 350 404 336 346 336 C 258 336 175 400 175 531 C 175 660 248 714 347 714 C 414 714 443 700 484 682 L 484 765 C 441 781 392 791 335 791 C 202 791 82 729 82 533 C 81 367 185 260 344 260 C 409 260 445 270 484 284 Z
		d 580 M 405 56 L 495 56 L 495 784 L 415 784 L 412 685 C 374 738 323 793 234 793 C 110 793 56 678 56 533 C 56 414 113 261 309 261 C 355 261 378 267 405 274 Z M 405 356 C 376 345 350 335 307 335 C 212 335 148 386 148 533 C 148 652 184 716 252 716 C 309 716 360 659 405 596 Z
		e 580 M 154 554 C 154 652 205 718 327 718 C 386 718 438 710 491 696 L 491 770 C 435 784 390 793 309 793 C 137 793 60 691 60 529 C 60 331 190 258 295 258 C 519 258 529 466 517 554 Z M 426 485 C 430 425 404 330 292 330 C 215 330 161 388 154 485 Z
		f 580 M 541 140 C 503 132 470 125 418 125 C 349 125 299 159 299 247 L 299 342 L 525 342 L 525 417 L 299 417 L 299 784 L 207 784 L 207 417 L 41 417 L 41 342 L 207 342 L 207 255 C 207 118 284 50 420 50 C 472 50 501 56 541 62 Z
		g 580 M 538 267 L 538 340 L 454 340 C 467 353 485 385 485 433 C 485 548 395 614 284 614 C 239 614 212 607 177 590 C 166 605 154 622 154 646 C 154 673 182 690 218 692 L 372 698 C 467 702 536 750 536 828 C 536 933 439 1000 281 1000 C 156 1000 48 966 48 866 C 48 806 85 771 120 745 C 103 739 68 711 68 662 C 68 620 90 585 122 548 C 93 516 80 486 80 438 C 80 333 160 258 282 258 C 315 258 332 262 350 267 Z M 282 547 C 350 547 395 497 395 436 C 395 385 363 325 282 325 C 238 325 171 353 171 436 C 171 524 245 547 282 547 M 200 770 C 176 788 143 810 144 857 C 143 911 216 930 289 929 C 400 928 441 879 440 838 C 439 794 397 776 339 775 Z
		h 580 M 82 56 L 172 56 L 169 349 C 207 305 253 258 337 258 C 444 258 498 329 498 441 L 498 784 L 408 784 L 408 453 C 408 387 387 335 321 335 C 249 335 203 412 172 441 L 172 784 L 82 784 Z
		i 580 M 290 191 C 251 191 220 159 220 120 C 220 81 251 50 290 50 C 329 50 360 81 360 120 C 360 159 329 191 290 191 M 106 267 L 349 267 L 349 709 L 503 709 L 503 784 L 89 784 L 89 709 L 259 709 L 259 341 L 106 341 Z
		j 580 M 379 191 C 340 191 308 158 308 120 C 308 81 340 50 379 50 C 418 50 449 81 449 120 C 449 159 418 191 379 191 M 89 267 L 433 267 L 433 773 C 433 934 331 1000 209 1000 C 158 1000 111 992 68 973 L 68 888 C 126 917 179 924 215 924 C 302 924 342 862 342 786 L 342 341 L 89 341 Z
		k 580 M 94 56 L 183 56 L 183 503 L 416 267 L 534 267 L 291 506 L 547 784 L 424 784 L 183 507 L 183 784 L 94 784 Z
		l 580 M 106 56 L 349 56 L 349 709 L 503 709 L 503 784 L 89 784 L 89 709 L 259 709 L 259 129 L 106 129 Z
		m 580 M 115 267 L 119 366 C 145 309 172 258 234 258 C 295 258 318 300 318 370 C 360 276 393 258 437 258 C 490 258 534 297 534 399 L 534 784 L 451 784 L 451 408 C 451 379 452 332 419 332 C 389 332 369 378 331 452 L 331 784 L 249 784 L 249 412 C 249 360 242 332 216 332 C 195 332 174 353 129 452 L 129 784 L 46 784 L 46 267 Z
		n 580 M 162 267 L 166 351 C 215 296 256 258 336 258 C 449 258 498 332 498 436 L 498 784 L 408 784 L 408 449 C 408 382 383 335 319 335 C 280 335 247 348 172 441 L 172 784 L 82 784 L 82 267 Z
		o 580 M 295 258 C 487 258 533 407 533 521 C 533 691 430 793 285 793 C 117 793 47 677 47 528 C 47 377 134 258 295 258 M 291 334 C 221 334 139 378 139 525 C 139 668 212 718 290 718 C 391 718 441 635 441 525 C 441 427 403 334 291 334
		p 580 M 162 267 L 168 354 C 201 309 251 258 346 258 C 441 258 524 329 524 519 C 524 700 414 790 271 790 C 237 790 203 786 172 779 L 172 995 L 82 995 L 82 267 Z M 172 695 C 205 709 241 717 274 717 C 385 717 433 640 433 521 C 433 408 399 336 327 336 C 279 336 234 365 172 445 Z
		q 580 M 495 258 L 495 995 L 405 995 L 409 689 C 372 742 318 793 234 793 C 126 793 56 702 56 536 C 56 399 125 261 309 261 C 342 261 371 264 415 278 Z M 405 356 C 377 345 347 334 303 334 C 187 334 148 420 148 531 C 148 673 198 716 252 716 C 301 716 342 682 405 596 Z
		r 580 M 185 267 L 188 363 C 242 294 308 258 369 258 C 501 258 529 359 529 464 L 438 464 C 438 414 434 336 356 335 C 306 336 266 364 194 451 L 194 784 L 103 784 L 103 267 Z
		s 580 M 458 353 C 408 342 371 333 311 333 C 242 333 192 352 192 399 C 192 453 257 467 327 490 C 466 533 492 576 492 641 C 492 746 386 793 269 793 C 211 793 150 787 94 774 L 94 691 C 143 704 195 717 267 717 C 355 717 399 696 399 650 C 399 611 378 593 265 559 C 145 522 101 479 101 405 C 101 312 191 258 312 258 C 383 258 414 266 458 273 Z
		t 580 M 267 102 L 267 267 L 499 267 L 499 342 L 267 342 L 267 609 C 267 689 320 715 384 715 C 436 715 462 708 499 699 L 499 776 C 459 786 432 791 369 791 C 225 791 177 719 177 608 L 177 342 L 33 342 L 33 267 L 177 267 L 177 125 Z
		u 580 M 408 267 L 498 267 L 498 784 L 418 784 L 415 700 C 374 745 330 793 242 793 C 137 793 82 726 82 609 L 82 267 L 172 267 L 172 609 C 172 674 203 716 261 716 C 326 716 363 662 408 610 Z
		v 580 M 444 267 L 542 267 L 339 784 L 236 784 L 34 267 L 136 267 L 290 692 Z
		w 580 M 473 267 L 561 267 L 486 784 L 378 784 L 288 515 L 199 784 L 94 784 L 19 267 L 107 267 L 159 697 L 257 396 L 321 396 L 425 694 Z
		x 580 M 160 267 L 296 466 L 430 267 L 540 267 L 346 527 L 549 784 L 430 784 L 290 586 L 152 784 L 36 784 L 237 524 L 45 267 Z
		y 580 M 136 267 L 293 690 L 444 267 L 542 267 L 365 733 C 271 981 165 1006 31 996 L 30 915 C 140 929 181 905 241 784 L 34 267 Z
		z 580 M 92 267 L 484 267 L 484 337 L 197 708 L 501 708 L 501 784 L 84 784 L 84 719 L 377 342 L 92 342 Z
		{ 580 M 462 110 L 424 110 C 372 110 311 138 312 221 L 312 356 C 312 409 288 476 203 488 C 283 494 313 551 313 623 L 313 810 C 313 885 359 922 426 923 L 462 923 L 462 995 L 416 995 C 269 995 228 905 228 810 L 228 623 C 228 560 192 523 113 523 L 84 523 L 84 452 L 113 452 C 192 452 228 424 228 353 L 228 221 C 228 72 325 38 424 38 L 462 38 Z
		| 580 M 248 0 L 332 0 L 332 995 L 248 995 Z
		} 580 M 118 38 L 156 38 C 255 38 352 72 352 221 L 352 353 C 352 424 388 452 467 452 L 496 452 L 496 523 L 467 523 C 388 523 352 560 352 623 L 352 810 C 352 905 311 995 164 995 L 118 995 L 118 923 L 154 923 C 221 922 267 885 267 810 L 267 623 C 267 551 297 494 377 488 C 292 476 268 409 268 356 L 268 221 C 269 138 208 110 156 110 L 118 110 Z
		~ 580 M 546 426 L 546 437 C 546 539 491 607 401 607 C 359 607 317 587 280 550 L 249 519 C 230 500 204 477 176 477 C 132 477 116 524 116 563 L 116 578 L 34 578 L 34 563 C 34 476 81 396 180 396 C 232 396 273 426 302 455 L 331 484 C 364 517 383 526 403 526 C 444 526 464 497 464 437 L 464 426 Z
		█ 580 M 0 0 L 580 0 L 580 1000 L 0 1000 Z
	`;
	// `


	constructor(defscale=16) {
		this.defscale=defscale;
		this.lineheight=1.1;
		this.loadfont(this.constructor.deffont);
	}


	loadfont(fontdef) {
		// Font format:
		//      name
		//      info
		//      scale
		//      char, width, path
		//
		// Assume height=scale.
		this.glyphs={};
		this.unknown=undefined;
		let idx=0,len=fontdef.length;
		function token(eol) {
			let c;
			while (idx<len && (c=fontdef.charCodeAt(idx))<=32 && c!==10) {idx++;}
			let i=idx;
			while (idx<len && fontdef.charCodeAt(idx)>eol) {idx++;}
			return fontdef.substring(i,idx);
		}
		token(10); idx++; // name
		token(10); idx++; // info
		let scale=parseFloat(token(10));
		while (idx<len) {
			idx++;
			let chr=token(32);
			if (chr.length<=0) {continue;}
			chr=chr==="SPC"?32:chr.charCodeAt(0);
			let g={};
			g.width=parseInt(token(32))/scale;
			g.poly=new Draw.Poly(token(10));
			let varr=g.poly.vertarr,vidx=g.poly.vertidx;
			for (let i=0;i<vidx;i++) {
				let v=varr[i];
				v.x/=scale;
				v.y/=scale;
			}
			g.poly.aabbupdate();
			this.glyphs[chr]=g;
			if (this.unknown===undefined || chr===63) {
				this.unknown=g;
			}
		}
	}


	textrect(str,scale) {
		// Returns the rectangle bounding the text.
		if (scale===undefined) {scale=this.defscale;}
		let len=str.length;
		let xpos=0,xmax=0;
		let ypos=0,lh=this.lineheight;
		let glyphs=this.glyphs;
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				if (c===10) {
					ypos+=lh;
					xmax=xmax>xpos?xmax:xpos;
					xpos=0;
				} else if (c===13) {
					xmax=xmax>xpos?xmax:xpos;
					xpos=0;
				} else {
					g=this.unknown;
				}
				if (g===undefined) {
					continue;
				}
			}
			xpos+=g.width;
		}
		if (len>0) {
			xmax=xmax>xpos?xmax:xpos;
			ypos+=lh;
		}
		return {x:0,y:0,w:xmax*scale,h:ypos*scale};
	}

}


class Draw {

	// Put these under the Draw namespace.
	static Transform=_DrawTransform;
	static Poly     =_DrawPoly;
	static Font     =_DrawFont;
	static Image    =_DrawImage;


	// The default context used for drawing functions.
	static def=null;


	constructor(width,height) {
		let con=this.constructor;
		Object.assign(this,con);
		if (con.def===null) {con.def=this;}
		// Image info
		this.img      =new con.Image(width,height);
		this.rgba     =new Uint8ClampedArray([0,1,2,3]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		this.rgbashift=[0,0,0,0];
		let col=this.rgba32[0];
		for (let i=0;i<32;i+=8) {this.rgbashift[(col>>>i)&255]=i;}
		this.rgba32[0]=0xffffffff;
		// Screen transforms
		this.viewoffx =0.0;
		this.viewoffy =0.0;
		this.viewmulx =1.0;
		this.viewmuly =1.0;
		// Object transforms
		this.deffont  =new con.Font();
		this.deftrans =new con.Transform();
		this.defpoly  =new con.Poly();
		this.stack    =[];
		this.stackidx =0;
		// Rendering variables
		this.linewidth=1.0;
		this.tmptrans =new con.Transform();
		this.tmppoly  =new con.Poly();
		this.tmpline  =[];
	}


	// ----------------------------------------
	// Image Information


	setimage(img) {
		if (!(img instanceof this.constructor.Image)) {
			img=new this.constructor.Image(img);
		}
		this.img=img;
	}


	setcolor(r,g,b,a=255) {
		if (g===undefined) {a=(r>>>0)&255;b=(r>>>8)&255;g=(r>>>16)&255;r>>>=24;}
		this.rgba[0]=r?Math.max(Math.min(Math.floor(r),255),0):0;
		this.rgba[1]=g?Math.max(Math.min(Math.floor(g),255),0):0;
		this.rgba[2]=b?Math.max(Math.min(Math.floor(b),255),0):0;
		this.rgba[3]=a?Math.max(Math.min(Math.floor(a),255),0):0;
	}


	rgbatoint(r,g,b,a) {
		// Convert an RGBA array to a int regardless of endianness.
		let tmp=this.rgba32[0];
		let rgba=this.rgba;
		rgba[0]=r;
		rgba[1]=g;
		rgba[2]=b;
		rgba[3]=a;
		rgba=this.rgba32[0];
		this.rgba32[0]=tmp;
		return rgba;
	}


	// ----------------------------------------
	// Transforms
	// point -> scale -> rotate -> offset -> view offset -> view scale


	clearstate() {
		this.rgba32[0]=0xffffffff;
		this.deftrans.clear();
	}


	savestate() {
		let mem=this.stack[this.stackidx++];
		if (mem===undefined) {
			mem={
				img  :null,
				rgba :null,
				trans:new this.constructor.Transform(),
				poly :null,
				font :null
			};
			this.stack[this.stackidx-1]=mem;
		}
		mem.img =this.img;
		mem.rgba=this.rgba32[0];
		mem.trans.copy(this.deftrans);
		mem.poly=this.defpoly;
		mem.font=this.deffont;
	}


	loadstate() {
		if (this.stackidx<=0) {throw "loading null stack";}
		let mem=this.stack[--this.stackidx];
		this.img=mem.img;
		this.rgba32[0]=mem.rgba;
		this.deftrans.copy(mem.trans);
		this.defpoly=mem.poly;
		this.deffont=mem.font;
	}


	transformpoint(x,y) {
		let [ox,oy]=this.deftrans.apply(x,y);
		ox=(ox-this.viewoffx)*this.viewmulx;
		oy=(oy-this.viewoffy)*this.viewmuly;
		return [ox,oy];
	}


	setviewscale(x,y) {
		this.viewmulx=x;
		this.viewmuly=y;
	}


	setviewoffset(x,y) {
		this.viewoffx=x;
		this.viewoffy=y;
	}


	settransform(trans) {return this.deftrans.copy(trans);}
	setangle(ang)  {return this.deftrans.setangle(ang);}
	addangle(ang)  {return this.deftrans.addangle(ang);}
	getangle()     {return this.deftrans.getangle();}
	setscale(x,y)  {return this.deftrans.setscale(x,y);}
	mulscale(x,y)  {return this.deftrans.mulscale(x,y);}
	getscale()     {return this.deftrans.getscale();}
	setoffset(x,y) {return this.deftrans.setoffset(x,y);}
	addoffset(x,y) {return this.deftrans.addoffset(x,y);}
	getoffset()    {return this.deftrans.getoffset();}


	// ----------------------------------------
	// Images


	fill(r=0,g=0,b=0,a=255) {
		// Fills the current image with a solid color.
		// imgdata.fill(rgba) was ~25% slower during testing.
		let rgba=this.rgbatoint(r,g,b,a);
		let imgdata=this.img.data32;
		let i=this.img.width*this.img.height;
		while (i>7) {
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
		}
		while (i>0) {
			imgdata[--i]=rgba;
		}
	}


	drawimage(src,dx,dy,dw,dh) {
		// Draw an image with alpha blending.
		let dst=this.img;
		dx=(dx===undefined)?0:(dx|0);
		dy=(dy===undefined)?0:(dy|0);
		dw=(dw===undefined || dw>src.width )?src.width :(dx|0);
		dh=(dh===undefined || dh>src.height)?src.height:(dh|0);
		let sx=0,sy=0;
		dw+=dx;
		if (dx<0) {sx=-dx;dx=0;}
		dw=(dw>dst.width?dst.width:dw)-dx;
		dh+=dy;
		if (dy<0) {sy=-dy;dy=0;}
		dh=(dh>dst.height?dst.height:dh)-dy;
		if (dw<=0 || dh<=0) {return;}
		let dstdata=dst.data32,drow=dy*dst.width+dx,dinc=dst.width-dw;
		let srcdata=src.data32,srow=sy*src.width+sx,sinc=src.width-dw;
		let ystop=drow+dst.width*dh,xstop=drow+dw;
		let amul=this.rgba[3],amul0=amul/255.0,amul1=amul*(256.0/65025.0);
		let filllim=amul0>0?255/amul0:Infinity;
		let ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,namask=(~amask)>>>0;
		let maskl=0x00ff00ff&namask,maskh=0xff00ff00&namask;
		let sa,da,l,h,tmp;
		dw=dst.width;
		while (drow<ystop) {
			while (drow<xstop) {
				// a = sa + da*(1-sa)
				// c = (sc*sa + dc*da*(1-sa)) / a
				src=srcdata[srow++];
				sa=(src>>>ashift)&255;
				src&=namask;
				if (sa>=filllim) {
					dstdata[drow++]=src|(Math.floor(sa*amul0)<<ashift);
					continue;
				}
				if (sa<=0) {drow++;continue;}
				tmp=dstdata[drow];
				da=(tmp>>>ashift)&255;
				if (da===0) {
					dstdata[drow++]=src|(Math.floor(sa*amul0)<<ashift);
					continue;
				}
				// Approximate blending by expanding sa from [0,255] to [0,256].
				if (da===255) {
					sa=Math.floor(sa*amul1);
					da=amask;
				} else {
					sa*=amul;
					da=sa*255+da*(65025-sa);
					sa=Math.floor((sa*0xff00+(da>>>1))/da);
					da=Math.floor((da+32512)/65025)<<ashift;
				}
				l=tmp&0x00ff00ff;
				h=tmp&0xff00ff00;
				dstdata[drow++]=da|
					(((Math.imul((src&0x00ff00ff)-l,sa)>>>8)+l)&maskl)|
					((Math.imul(((src>>>8)&0x00ff00ff)-(h>>>8),sa)+h)&maskh);
			}
			xstop+=dw;
			drow+=dinc;
			srow+=sinc;
		}
	}


	// ----------------------------------------
	// Paths


	beginpath() {return this.defpoly.begin();}
	closepath() {return this.defpoly.close();}
	moveto(x,y) {return this.defpoly.moveto(x,y);}
	lineto(x,y) {return this.defpoly.lineto(x,y);}
	curveto(x0,y0,x1,y1,x2,y2) {return this.defpoly.curveto(x0,y0,x1,y1,x2,y2);}


	// ----------------------------------------
	// Primitives


	drawline(x0,y0,x1,y1) {
		let poly=this.tmppoly,trans=this.deftrans;
		poly.begin();
		poly.addline(x0,y0,x1,y1,this.linewidth*0.5);
		this.fillpoly(poly,trans);
	}


	fillrect(x,y,w,h) {
		let poly=this.tmppoly,trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(w,h);
		poly.begin();
		poly.addrect(0,0,1,1);
		this.fillpoly(poly,trans);
	}


	fillcircle(x,y,rad) {
		this.filloval(x,y,rad,rad);
	}


	filloval(x,y,xrad,yrad) {
		let poly=this.tmppoly,trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(xrad,yrad);
		poly.begin();
		poly.addoval(0,0,1,1);
		this.fillpoly(poly,trans);
	}


	// ----------------------------------------
	// Text


	setfont(name) {
	}


	filltext(x,y,str,scale) {
		let font=this.deffont,glyphs=font.glyphs;
		if (scale===undefined) {scale=font.defscale;}
		let len=str.length;
		let xpos=0,lh=font.lineheight;
		let trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(scale,scale);
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				if (c===10) {
					trans.addoffset(-xpos,lh,true);
					xpos=0;
				} else if (c===13) {
					trans.addoffset(-xpos,0,true);
					xpos=0;
				} else {
					g=font.unknown;
				}
				if (g===undefined) {
					continue;
				}
			}
			this.fillpoly(g.poly,trans);
			trans.addoffset(g.width,0,true);
			xpos+=g.width;
		}
	}


	textrect(str,scale) {
		return this.deffont.textrect(str,scale);
	}


	// ----------------------------------------
	// Polygon Filling


	fillresize(size) {
		// Declaring line objects this way allows engines to optimize their structs.
		let len=this.tmpline.length;
		while (len<size) {len+=len+1;}
		while (this.tmpline.length<len) {
			this.tmpline.push({
				sort:0,
				next:0,
				x0:0,
				y0:0,
				x1:0,
				y1:0,
				dxy:0,
				dyx:0,
				maxy:0,
				minx:0,
				area:0,
				areadx1:0,
				areadx2:0
			});
		}
		return this.tmpline;
	}


	fillpoly(poly,trans) {
		// Fills the current path.
		//
		// Preprocess the lines and curves. Reject anything with a NaN, too narrow, or
		// outside the image. Use a binary heap to dynamically sort lines.
		if (poly ===undefined) {poly =this.defpoly ;}
		if (trans===undefined) {trans=this.deftrans;}
		let iw=this.img.width,ih=this.img.height,imgdata=this.img.data32;
		if (poly.vertidx<3 || iw<1 || ih<1) {return;}
		// Screenspace transformation.
		let vmulx=this.viewmulx,voffx=this.viewoffx;
		let vmuly=this.viewmuly,voffy=this.viewoffy;
		let matxx=trans.data[0]*vmulx,matxy=trans.data[1]*vmulx,matx=(trans.data[2]-voffx)*vmulx;
		let matyx=trans.data[3]*vmuly,matyy=trans.data[4]*vmuly,maty=(trans.data[5]-voffy)*vmuly;
		// Perform a quick AABB-OBB overlap test.
		// Define the transformed bounding box.
		let aabb=poly.aabb;
		let bndx=aabb.minx*matxx+aabb.miny*matxy+matx;
		let bndy=aabb.minx*matyx+aabb.miny*matyy+maty;
		let bnddx0=aabb.dx*matxx,bnddy0=aabb.dx*matyx;
		let bnddx1=aabb.dy*matxy,bnddy1=aabb.dy*matyy;
		// Test if the image AABB has a separating axis.
		let minx=bndx-iw,maxx=bndx;
		if (bnddx0<0) {minx+=bnddx0;} else {maxx+=bnddx0;}
		if (bnddx1<0) {minx+=bnddx1;} else {maxx+=bnddx1;}
		if (maxx<=0 || 0<=minx) {return;}
		let miny=bndy-ih,maxy=bndy;
		if (bnddy0<0) {miny+=bnddy0;} else {maxy+=bnddy0;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxy<=0 || 0<=miny) {return;}
		// Test if the poly OBB has a separating axis.
		let cross=bnddx0*bnddy1-bnddy0*bnddx1;
		minx=bndy*bnddx0-bndx*bnddy0;
		maxx=minx;bnddx0*=ih;bnddy0*=iw;
		if (cross <0) {minx+=cross ;} else {maxx+=cross ;}
		if (bnddx0<0) {maxx-=bnddx0;} else {minx-=bnddx0;}
		if (bnddy0<0) {minx+=bnddy0;} else {maxx+=bnddy0;}
		if (maxx<=0 || 0<=minx) {return;}
		miny=bndy*bnddx1-bndx*bnddy1;
		maxy=miny;bnddx1*=ih;bnddy1*=iw;
		if (cross <0) {maxy-=cross ;} else {miny-=cross ;}
		if (bnddx1<0) {maxy-=bnddx1;} else {miny-=bnddx1;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxy<=0 || 0<=miny) {return;}
		// Loop through the path nodes.
		let l,i,j,tmp;
		let lr=this.tmpline,lrcnt=lr.length,lcnt=0;
		let splitlen=3;
		let x0,y0,x1,y1;
		let p0x,p0y,p1x,p1y;
		let dx,dy;
		let varr=poly.vertarr;
		for (i=0;i<poly.vertidx;i++) {
			let v=varr[i];
			if (v.type===poly.CURVE) {v=varr[i+2];}
			p0x=p1x; p1x=v.x*matxx+v.y*matxy+matx;
			p0y=p1y; p1y=v.x*matyx+v.y*matyy+maty;
			if (v.type===poly.MOVE) {continue;}
			// Add a basic line.
			if (lrcnt<=lcnt) {
				lr=this.fillresize(lcnt+1);
				lrcnt=lr.length;
			}
			l=lr[lcnt++];
			l.x0=p0x;
			l.y0=p0y;
			l.x1=p1x;
			l.y1=p1y;
			if (v.type===poly.CURVE) {
				// Linear decomposition of curves.
				// Get the control points and check if the curve's on the screen.
				v=varr[i++]; let c1x=v.x*matxx+v.y*matxy+matx,c1y=v.x*matyx+v.y*matyy+maty;
				v=varr[i++]; let c2x=v.x*matxx+v.y*matxy+matx,c2y=v.x*matyx+v.y*matyy+maty;
				let c3x=p1x,c3y=p1y;
				x0=Math.min(p0x,Math.min(c1x,Math.min(c2x,c3x)));
				x1=Math.max(p0x,Math.max(c1x,Math.max(c2x,c3x)));
				y0=Math.min(p0y,Math.min(c1y,Math.min(c2y,c3y)));
				y1=Math.max(p0y,Math.max(c1y,Math.max(c2y,c3y)));
				if (x0>=iw || y0>=ih || y1<=0) {lcnt--;continue;}
				if (x1<=0) {continue;}
				// Estimate bezier length.
				let dist;
				dx=c1x-p0x;dy=c1y-p0y;dist =Math.sqrt(dx*dx+dy*dy);
				dx=c2x-c1x;dy=c2y-c1y;dist+=Math.sqrt(dx*dx+dy*dy);
				dx=c3x-c2x;dy=c3y-c2y;dist+=Math.sqrt(dx*dx+dy*dy);
				dx=p0x-c3x;dy=p0y-c3y;dist+=Math.sqrt(dx*dx+dy*dy);
				let segs=Math.ceil(dist*0.5/splitlen);
				if (segs<=1) {continue;}
				lcnt--;
				if (lrcnt<=lcnt+segs) {
					lr=this.fillresize(lcnt+segs+1);
					lrcnt=lr.length;
				}
				// Segment the curve.
				c2x=(c2x-c1x)*3;c1x=(c1x-p0x)*3;c3x-=p0x+c2x;c2x-=c1x;
				c2y=(c2y-c1y)*3;c1y=(c1y-p0y)*3;c3y-=p0y+c2y;c2y-=c1y;
				let ppx=p0x,ppy=p0y,unorm=1.0/segs,u=0;
				for (let s=0;s<segs;s++) {
					l=lr[lcnt++];
					l.x0=ppx;
					l.y0=ppy;
					u+=unorm;
					ppx=p0x+u*(c1x+u*(c2x+u*c3x));
					ppy=p0y+u*(c1y+u*(c2y+u*c3y));
					l.x1=ppx;
					l.y1=ppy;
				}
			}
		}
		// Prune lines.
		minx=iw;maxx=0;miny=ih;maxy=0;
		let amul=this.rgba[3]*(256.0/255.0);
		if ((matxx<0)!==(matyy<0)) {amul=-amul;}
		let y0x,y1x;
		let maxcnt=lcnt;
		lcnt=0;
		for (i=0;i<maxcnt;i++) {
			l=lr[i];
			// If we mirror the image, we need to flip the line direction.
			x0=l.x0;y0=l.y0;
			x1=l.x1;y1=l.y1;
			dx=x1-x0;
			dy=y1-y0;
			// Too thin or NaN.
			if (!(dx===dx) || !(Math.abs(dy)>1e-10)) {continue;}
			// Clamp y to [0,imgheight), then clamp x so x<imgwidth.
			l.dxy=dx/dy;
			l.dyx=Math.abs(dx)>1e-10?dy/dx:0;
			y0x=x0-y0*l.dxy;
			let yhx=x0+(ih-y0)*l.dxy;
			let xwy=y0+(iw-x0)*l.dyx;
			if (y0<0 ) {y0=0 ;x0=y0x;}
			if (y0>ih) {y0=ih;x0=yhx;}
			if (y1<0 ) {y1=0 ;x1=y0x;}
			if (y1>ih) {y1=ih;x1=yhx;}
			if (Math.abs(y1-y0)<1e-20) {continue;}
			if (x0>=iw && x1>=iw) {maxx=iw;continue;}
			let fx=y0<y1?x0:x1;
			if (x0>=iw) {x0=iw;y0=xwy;}
			if (x1>=iw) {x1=iw;y1=xwy;}
			// Calculate the bounding box.
			l.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
			let fy=Math.floor(Math.min(y0,y1));
			l.maxy=Math.ceil(Math.max(y0,y1));
			minx=Math.min(minx,l.minx);
			maxx=Math.max(maxx,Math.max(x0,x1));
			miny=Math.min(miny,fy);
			maxy=Math.max(maxy,l.maxy);
			l.maxy*=iw;
			l.area=NaN;
			fx=Math.min(fx,(fy+1-l.y0)*l.dxy+l.x0);
			l.sort=fy*iw+Math.max(Math.floor(fx),l.minx);
			lr[i]=lr[lcnt];
			lr[lcnt++]=l;
		}
		// If all lines are outside the image, abort.
		if (minx>=iw || maxx<=0 || minx>=maxx || miny>=maxy || lcnt<=0) {
			return;
		}
		// Linear time heap construction.
		for (let p=(lcnt>>1)-1;p>=0;p--) {
			i=p;
			l=lr[p];
			while ((j=i+i+1)<lcnt) {
				if (j+1<lcnt && lr[j+1].sort<lr[j].sort) {j++;}
				if (lr[j].sort>=l.sort) {break;}
				lr[i]=lr[j];
				i=j;
			}
			lr[i]=l;
		}
		// Init blending.
		let ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,imask=1.0/amask;
		let maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		let sa,da;
		let colrgb=(this.rgba32[0]&~amask)>>>0;
		let coll=(colrgb&0x00ff00ff)>>>0,colh=(colrgb&0xff00ff00)>>>0,colh8=colh>>>8;
		let filllim=255;
		// Process the lines row by row.
		let x=lr[0].sort,y;
		let xnext=x,xrow=-1;
		let area,areadx1,areadx2;
		let pixels=iw*ih;
		while (true) {
			areadx2=0;
			if (x>=xrow) {
				if (xnext<x || xnext>=pixels) {break;}
				x=xnext;
				y=Math.floor(x/iw);
				xrow=(y+1)*iw;
				area=0;
				areadx1=0;
			}
			while (x>=xnext) {
				// fx0  fx0+1                          fx1  fx1+1
				//  +-----+-----+-----+-----+-----+-----+-----+
				//  |                              .....----  |
				//  |               .....-----'''''           |
				//  | ....-----'''''                          |
				//  +-----+-----+-----+-----+-----+-----+-----+
				//   first  dyx   dyx   dyx   dyx   dyx  last   tail
				l=lr[0];
				if (isNaN(l.area)) {
					x0=l.x0;y0=l.y0-y;
					x1=l.x1;y1=l.y1-y;
					let dyx=l.dyx,dxy=l.dxy;
					y0x=x0-y0*dxy;
					y1x=y0x+dxy;
					if (y0<0) {y0=0;x0=y0x;}
					if (y0>1) {y0=1;x0=y1x;}
					if (y1<0) {y1=0;x1=y0x;}
					if (y1>1) {y1=1;x1=y1x;}
					let next=Math.floor((y0>y1?x0:x1)+(dxy<0?dxy:0));
					next=(next>l.minx?next:l.minx)+xrow;
					if (next>=l.maxy) {next=pixels;}
					if (x1<x0) {tmp=x0;x0=x1;x1=tmp;dyx=-dyx;}
					let fx0=Math.floor(x0);
					let fx1=Math.floor(x1);
					x0-=fx0;
					x1-=fx1;
					if (fx0===fx1 || fx1<0) {
						// Vertical line - avoid divisions.
						dy=(y0-y1)*amul;
						tmp=fx1>=0?(x0+x1)*dy*0.5:0;
						area+=dy-tmp;
						areadx2+=tmp;
						l.sort=next;
					} else {
						dyx*=amul;
						let mul=dyx*0.5,n0=x0-1,n1=x1-1;
						if (fx0<0) {
							area-=mul-(x0+fx0)*dyx;
						} else {
							area-=n0*n0*mul;
							areadx2+=x0*x0*mul;
						}
						areadx1-=dyx;
						l.area=n1*n1*mul;
						l.areadx1=dyx;
						l.areadx2=x1*x1*mul;
						l.next=next;
						l.sort=fx1<iw?fx1+xrow-iw:next;
					}
				} else {
					area   +=l.area;
					areadx1+=l.areadx1;
					areadx2-=l.areadx2;
					l.area  =NaN;
					l.sort  =l.next;
				}
				// Heap sort down.
				i=0;
				while ((j=i+i+1)<lcnt) {
					if (j+1<lcnt && lr[j+1].sort<lr[j].sort) {j++;}
					if (lr[j].sort>=l.sort) {break;}
					lr[i]=lr[j];
					i=j;
				}
				lr[i]=l;
				xnext=lr[0].sort;
			}
			// Shade the pixels based on how much we're covering.
			// If the area isn't changing much use the same area for multiple pixels.
			let xdraw=x+1;
			let sa1=Math.floor(area+0.5);
			if (areadx2===0) {
				tmp=Math.min(Math.max(sa1+(areadx1<0?-0.5:0.5),0.5),255.5);
				tmp=(tmp-area)/areadx1+x;
				xdraw=(tmp>x && tmp<xnext)?Math.ceil(tmp):xnext;
				if (xdraw>xrow) {xdraw=xrow;}
			}
			areadx2+=(xdraw-x)*areadx1;
			if (sa1>=filllim) {
				tmp=colrgb|(Math.min(sa1,255)<<ashift);
				do {imgdata[x++]=tmp;} while (x<xdraw);
			} else if (sa1>0) {
				// a = sa + da*(1-sa)
				// c = (sc*sa + dc*da*(1-sa)) / a
				sa1=256-sa1;
				let sab=area/256,sai=(1-sab)*imask;
				do {
					let dst=imgdata[x];
					da=(dst&amask)>>>0;
					if (da===amask) {
						sa=sa1;
					} else {
						tmp=sab+da*sai;
						sa=256-Math.floor(area/tmp+0.5);
						da=Math.floor(tmp*255+0.5)<<ashift;
					}
					imgdata[x++]=da|
						(((Math.imul((dst&0x00ff00ff)-coll,sa)>>>8)+coll)&maskl)|
						((Math.imul(((dst>>>8)&0x00ff00ff)-colh8,sa)+colh)&maskh);
				} while (x<xdraw);
			}
			x=xdraw;
			area+=areadx2;
		}
	}


	// trace(poly,trans) {
	// 	// Traces the current path
	// }

}


async function DrawWASMSetup() {
	// Attempt to load the WebAssembly program.
	// fill_wasm.c -> compile -> gzip -> base64
	if (Draw.wasmloading) {return;}
	Draw.wasmloading=1;
	let wasmstr=`
		H4sIAMTYcmYC/71YS29bxxWe++D7IVIJ3yJ5ZiQ7dIwYNmC4EorAuq7dKgmaBii66IqmKMrRFfWiaCcu
		jFBpjSLr7hwHKElLDZAgQHcyUBTpLv0HbdFF8xO8LoK635lLXV7ZbppuSom6Z2bOfHPmvHVFa3/LEEIY
		pfBNczAQN417+OIp8GsMbhofCHPRsjrbd5LvgXW3t7Hd37hyWYjTU+uYMngqzlO9zv7GLzrCtMIhy7JD
		Bn53DcMIWYYwwhciA8M5OLATA/GtD8F/jETkz0YqvNXZ2undNUW22WT8ZrvV7Tbb/Z3evrASa6u3fLHC
		/ogliiRudfrvdlq7q639jghF1ze63d2d7l1hJ5pNnm/ygmWUms2N7bWNXqfdb67f3m73N3a2m/3Wardj
		iGSzuba/03y3tb3W7VhmHMNWv9XsbK9ZVqrZvNXdWW11PRwbY09SbxzCXo3iDcPx39VDpkj8s5aMDcx7
		1sC+Z+Bp4GkP4vesD4wB7n7/QDgzrrO7p0TDjCqD8LCV2VWWY/adil6xSbgq5Fx2G6ZQYafYdb4SvEAh
		V0Yo5FzkBRml0HlLyBgmyGUqzlhCJsxlc5nCKahYJpNGAuuLrkwRUJ1oT3OmMdfQ1AyooqYyoDKaylKC
		IpvOX8W2nCXjWL5E5rF8GWi562LykfkpWeBzrGUqyCLlZYlSlIPIrrKdqKvKMkQ2cFVFzkEqm29Udawf
		pQSm/yRcOYcnxGMu71rVBM3om6kaZcYUpzmm8+PhUBYoSzWKjSlNepwHYvVGSuAxS8m3gJmA1G7mlwcH
		B0IrQ01vAoqSICFZiApLVpFClF+ycG0qLllQJpWWLAEWw9WiQsofAnHO02HOMV2ZoxIkKHuyaTEqTNch
		iyKs2J4hlPQWbU/HSvH6POUPDw/p5XVgFnHDyeX03hrG0htr3joVmPclj7dGGB8dHfka7+gbl4gIoKcW
		bvgCax8oUX4EYeQYKAWPGv6W8jQ/mS1Q3Z8lKo3UAi2McV7Rn50nGuFqNIYMtREErWF2OBxOjvz66nhC
		RZcfPVT1yeCJ06a6L9X6HotV/1zakAu+YifYERzzJwFh2X5ku8ozIlbZTt9my5p/7hhSycBIjiQkDkzU
		aSEwmh/Jk+GTq2Q/fiTPQA/Q8nAkz0I3JaqDemXq3jUqyToVJcHFQ1RnHwnBs4k8qujSGWxm1eDn7JjU
		cEwS3yJ8wmPJuOStvjKmBazM41uClb1VXFJ7/wARkxIJdjXDVTkKv8EjqCbpWH3fdye5I+RycNmU+DEH
		kqckzcuqjjrFO8fXM/rz5Cr08zFHjX+jNsWn9H5FnuXIxncOYa6yUk2vPo/oV3lfX5iRFvtVhHIc3jpb
		KPg5P0raO1Z1XOuEomLEGYAp+F7xwfU//PEvf/vHvb+/vnZDMxFrpfhIxVkNHCpshEf+UVQL7KioDHPl
		A7c40hrPr6lqRSHvUOH5lXJFzYweXJ+/9pvk6JOvvt9OMUJhRHFP/TB1ATT7dzqongpVK7KGa9Y5KALA
		WAFkjLLrirMODsmu8zMrJaeILCKIg7gwlGmd1K4deJ9vnorvWUJHZJZiQMfZWe0QQKpUFB0GZM88OIkt
		p83gmc9kmeOGgd6XZY6Nyy6Vr5geYBqpA4AZEEUC1pmjhyr9DET6M1mdQlQTOtWSSdUuUKh8LNMaKkNn
		Dv/r8ZqzfIwDs2PchTNXEXrJ+CE19DV8+AmljxAYPuIPNGLt97IBxBPlHBwMZAM1iubg5i41rtGvyf7i
		PhSGlAgLHB1JSQuUOZQLyEbV4yN4paL0IYJ8TqdqDhiOoRwiBDGURNSAIcu5UwZTJiYlTwKGH3Msy+TU
		a09PPp6hGPkOg0VoDllKB36EGc+hOp6jiExyEDhGXyFWewhD5uJpzcmlAgseu2oQB/dk8Co16NWfsss2
		6NzPUwbWkt61+b45lGgsJYPAOgn4bOeYLTKRzFuKsmne76G+R52nH34T2ZNhnvuXtacSTvSO5C4gGuw7
		5HkKacGu0UefqpysOgNpvLiwc7Cf/EA6YwW3rFJuJRXGw3pbP8wtFYUdyOwGUQoBQKrKiJfkc1RliNzJ
		OO+XEbhJoHbUnqkdtc/RiPAuk+vH7ASADDI3ZZmix7I4Pa7kCU2NTxXy0iLnglbKixWMSdUCGSYY2TUv
		jWU9Iso1MIbckB6qOGIrezpBBNNQ1nd9pKkaMTcAMvynqFH+08Z0cCOyij885CMDo5m1yvBFQZ2cBmYy
		wfWzYV5G4UAgrFQIoaFnLsqqvjwqAMdrmxPOC7ByU6wcY1VXWM/HMqs3c6BjX+yZfbFnE0uSLJqt4GBo
		bCT5yCpSxUjGNApchzuqnDN4MwXzlegstDUzGqOE4IDh+LmmQnjMUOsQfWUeqLURuj64gW+7J18O0fee
		ZW03VPpjbskqY98mgJoktyofKjRGjDJDZK/RCEgQI6abNU5Y+ozYFFhNlsCInEnJK+Y7eGSXEOU2y4Jm
		aLxkrehBHDkPg0UqozZCDybl3mRFFFgRBT7HPlUOFnEUbsX9BkRfGUkuRqCWucuF2d7RJv2Cs2FDp6eZ
		X92X57jT1unJfEO398gS0p603/+HxBNMHNW3OdGWfEutSlsr+n+Jaa8fRDdnsz9UGYEK07KPgn0C9qWP
		eroezz6etqKTPvjJzvIh+l4qPKLIsSpxZ1Y9bk+kqz3kTuSUExefD6Qq2WgCYODSWgXtKixjQEM2GXDF
		HJrQY3gVm7TATpPmSoDy45XGWeepAdXRecyafddJutLW/pLiWms7NsZ6AzI4EqmALydo9sYzO6YN6ok6
		d9HHFUcnTd3rYxmzlh2vJtOsrJz8a5V04CrvvTVJeEnNsfeY3Rjt6MRYX+8sj7+7kcqekSaVH/766Lvv
		rXh7KwkqO8W+17wcmFTZVBXIFr0DXe2R2OxSwtUVi8o94hVdxyi82QUPhV1v3HuxAqE+BDVnBZCJqPBK
		XSKL/xnYT0l8mjnQ3XEcM5kPNSk+Muzt1lbH2IqKU689jFNvPMzAyw7r+VcTtv++IRR8DxEOvrCIBN9X
		RGYNMdNs7vdb7c3m7g4mOz2xGNvt7azdbnd6+0YSZLuzv99Ze231rpH82ert7f5tandb27eyly5fuHjh
		4muXbuvJSxcu/RtAfRw72hEAAA==
	`;
	let gzipbytes=Uint8Array.from(atob(wasmstr),(c)=>c.codePointAt(0));
	let gzipstream=new Blob([gzipbytes]).stream();
	let decstream=gzipstream.pipeThrough(new DecompressionStream("gzip"));
	let decblob=await new Response(decstream).blob();
	let wasmbytes=new Uint8Array(await decblob.arrayBuffer());
	// Compile module.
	let module=new WebAssembly.Module(wasmbytes);
	if (!module) {
		console.log("could not load module");
		Draw.wasmloading=2;
		return;
	}
	// console.log("loading module");
	Draw.wasmmodule=module;
	// Set up class functions.
	Draw.prototype.wasmprinti64=function(h,l) {
		let s="Debug: "+((BigInt(h>>>0)<<32n)+BigInt(l>>>0))+"\n";
		console.log(s);
	};
	Draw.prototype.wasmprintf64=function(x) {
		let s="Debug: "+x;
		console.log(s);
	};
	Draw.prototype.wasmimage=function(img) {
		// console.log("setting image");
		let wasm=this.wasm,old=wasm.img;
		if (old!==null && !Object.is(old,img)) {
			// Generate a new copy for the old image.
			let width=old.width,height=old.height,copy=true;
			if (width<1 || height<1) {
				width=1;
				height=1;
				copy=false;
			}
			old.data8  =new Uint8Array(width*height*4);
			old.datac8 =new Uint8ClampedArray(old.data8.buffer);
			old.data32 =new Uint32Array(old.data8.buffer);
			old.imgdata=new ImageData(old.datac8,width,height);
			if (copy) {old.data32.set(wasm.imgdata);}
		}
		wasm.img=img||null;
		this.wasmresize(0);
	};
	Draw.prototype.wasmresize=function(bytes) {
		// console.log("resizing to: "+bytes);
		if (!bytes) {bytes=0;}
		let wasm=this.wasm;
		let img=wasm.img;
		if (img!==null) {
			wasm.width=img.width;
			wasm.height=img.height;
		} else {
			wasm.width=0;
			wasm.height=0;
		}
		let align=15;
		let imglen=(12+wasm.width*wasm.height*4+align)&~align;
		let pathlen=(6*8+4+4+24*wasm.vertmax+align)&~align;
		let heaplen=(wasm.heaplen+align)&~align;
		let sumlen=heaplen+imglen+pathlen;
		if (bytes && sumlen<bytes) {sumlen=bytes;}
		let newlen=1;
		while (newlen<sumlen) {newlen+=newlen;}
		let pagebytes=65536;
		let wasmmem=wasm.instance.exports.memory;
		let pages=Math.ceil((newlen-wasmmem.buffer.byteLength)/pagebytes);
		if (pages>0) {wasmmem.grow(pages);}
		let memu32=new Uint32Array(wasmmem.buffer,heaplen);
		wasm.memu32=memu32;
		memu32[0]=wasmmem.buffer.byteLength;
		memu32[1]=wasm.width;
		memu32[2]=wasm.height;
		wasm.imgdata=null;
		if (img!==null) {
			// Rebind the image pixel buffer.
			let width=img.width;
			let height=img.height;
			if (width<1 || height<1) {
				width=1;
				height=1;
			}
			let pixels=width*height;
			let buf=wasmmem.buffer,off=heaplen+12;
			wasm.imgdata=new Uint32Array(buf,off,pixels);
			if (img.data32.buffer.byteLength>0) {
				wasm.imgdata.set(img.data32);
			}
			img.data8  =new Uint8Array(buf,off,pixels*4);
			img.datac8 =new Uint8ClampedArray(buf,off,pixels*4);
			img.data32 =wasm.imgdata;
			img.imgdata=new ImageData(img.datac8,width,height);
		}
		wasm.tmpu32=new Uint32Array(wasmmem.buffer,heaplen+imglen);
		wasm.tmpf64=new Float64Array(wasmmem.buffer,heaplen+imglen);
		let dif=wasmmem.buffer.byteLength-wasm.tmpu32.byteOffset;
		wasm.vertmax=Math.floor((dif-(6*8+4+4))/24);
	};
	Draw.prototype.wasminit=function() {
		let con=this.constructor;
		let state=this;
		function wasmprinti64(h,l) {state.wasmprinti64(h,l);}
		function wasmprintf64(x)   {state.wasmprintf64(x);}
		function wasmresize(bytes) {state.wasmresize(bytes);}
		let imports={env:{wasmprinti64,wasmprintf64,wasmresize}};
		let inst=new WebAssembly.Instance(con.wasmmodule,imports);
		this.wasm={
			instance:inst,
			exports :inst.exports,
			heaplen :inst.exports.getheapbase(),
			memu32  :null,
			img     :null,
			imgdata :null,
			width   :0,
			height  :0,
			tmpu32  :null,
			tmpf64  :null,
			vertmax :0,
			fill    :inst.exports.fillpoly
		};
		this.wasmresize(0);
		return this.wasm;
	};
	Draw.prototype.fillpoly=function(poly,trans) {
		// Copy the path and image to webassembly memory for faster rendering.
		if (poly ===undefined) {poly =this.defpoly ;}
		if (trans===undefined) {trans=this.deftrans;}
		let iw=this.img.width,ih=this.img.height,imgdata=this.img.data32;
		if (poly.vertidx<3 || iw<1 || ih<1) {return;}
		// Screenspace transformation.
		let vmulx=this.viewmulx,voffx=this.viewoffx;
		let vmuly=this.viewmuly,voffy=this.viewoffy;
		let matxx=trans.data[0]*vmulx,matxy=trans.data[1]*vmulx,matx=(trans.data[2]-voffx)*vmulx;
		let matyx=trans.data[3]*vmuly,matyy=trans.data[4]*vmuly,maty=(trans.data[5]-voffy)*vmuly;
		// Perform a quick AABB-OBB overlap test.
		// Define the transformed bounding box.
		let aabb=poly.aabb;
		let bndx=aabb.minx*matxx+aabb.miny*matxy+matx;
		let bndy=aabb.minx*matyx+aabb.miny*matyy+maty;
		let bnddx0=aabb.dx*matxx,bnddy0=aabb.dx*matyx;
		let bnddx1=aabb.dy*matxy,bnddy1=aabb.dy*matyy;
		// Test if the image AABB has a separating axis.
		let minx=bndx-iw,maxx=bndx;
		if (bnddx0<0) {minx+=bnddx0;} else {maxx+=bnddx0;}
		if (bnddx1<0) {minx+=bnddx1;} else {maxx+=bnddx1;}
		if (maxx<=0 || 0<=minx) {return;}
		let miny=bndy-ih,maxy=bndy;
		if (bnddy0<0) {miny+=bnddy0;} else {maxy+=bnddy0;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxy<=0 || 0<=miny) {return;}
		// Test if the poly OBB has a separating axis.
		let cross=bnddx0*bnddy1-bnddy0*bnddx1;
		minx=bndy*bnddx0-bndx*bnddy0;
		maxx=minx;bnddx0*=ih;bnddy0*=iw;
		if (cross <0) {minx+=cross ;} else {maxx+=cross ;}
		if (bnddx0<0) {maxx-=bnddx0;} else {minx-=bnddx0;}
		if (bnddy0<0) {minx+=bnddy0;} else {maxx+=bnddy0;}
		if (maxx<=0 || 0<=minx) {return;}
		miny=bndy*bnddx1-bndx*bnddy1;
		maxy=miny;bnddx1*=ih;bnddy1*=iw;
		if (cross <0) {maxy-=cross ;} else {miny-=cross ;}
		if (bnddx1<0) {maxy-=bnddx1;} else {miny-=bnddx1;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxy<=0 || 0<=miny) {return;}
		// Copy to webassembly.
		let wasm=this.wasm;
		if (wasm===undefined) {
			wasm=this.wasminit();
		}
		if (!Object.is(imgdata,wasm.imgdata) || iw!==wasm.width || ih!==wasm.height) {
			this.wasmimage(this.img);
		}
		let vidx=poly.vertidx,varr=poly.vertarr;
		if (vidx>wasm.vertmax) {
			wasm.vertmax=vidx;
			this.wasmresize(0);
		}
		let tmpf64=wasm.tmpf64;
		let tmpu32=wasm.tmpu32;
		// transform [0-48]
		tmpf64[0]=matxx;
		tmpf64[1]=matxy;
		tmpf64[2]=matx;
		tmpf64[3]=matyx;
		tmpf64[4]=matyy;
		tmpf64[5]=maty;
		// color [48-52]
		tmpu32[12]=this.rgba32[0];
		// path [52-...]
		tmpu32[13]=vidx;
		let idx=7;
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			tmpu32[(idx++)<<1]=v.type;
			tmpf64[idx++]=v.x;
			tmpf64[idx++]=v.y;
		}
		wasm.fill();
	};
	Draw.wasmloading=3;
	// console.log("wasm done");
}
DrawWASMSetup();


//---------------------------------------------------------------------------------
// Audio - v1.06


class _AudioSound {

	constructor(freq=44100,len=0) {
		// accepts len/path and frequency
		Audio.initdef();
		this.audio=Audio.def;
		this.freq=freq;
		this.queue=null;
		let type=typeof len;
		if (type==="number") {
			this.resizelen(len);
		} else if (type==="string") {
			this.loadfile(len);
		} else {
			this.resizelen(0);
		}
	}


	slicelen(start=0,len=Infinity) {
		start=Math.floor(start);
		if (start<0) {
			len+=start;
			start=0;
		}
		if (start>this.len) {start=this.len;}
		if (len>this.len-start) {len=this.len-start;}
		len=Math.floor(len);
		let newsnd=new Audio.Sound(this.freq,len);
		let newdata=newsnd.data;
		let data=this.data;
		for (let i=0;i<len;i++) {newdata[i]=data[start+i];}
		return newsnd;
	}


	slicetime(start=0,len=Infinity) {
		return this.slicelen(start*this.freq,len*this.freq);
	}


	copy() {return this.slicelen();}


	trim(eps=1e-4) {
		return this.trimend(eps).trimstart(eps);
	}


	trimstart(eps=1e-4) {
		let data=this.data;
		let len=this.len,pos=0;
		while (pos<len && Math.abs(data[pos])<=eps) {pos++;}
		for (let i=pos;i<len;i++) {data[i-pos]=data[i];}
		return this.resizelen(len-pos);
	}


	trimend(eps=1e-4) {
		let data=this.data;
		let len=this.len;
		while (len>0 && Math.abs(data[len-1])<=eps) {len--;}
		return this.resizelen(len);
	}


	resizelen(len) {
		// Over-allocate in case we keep modifying the sound.
		this.loaded=true;
		let olddata=this.data;
		let oldlen=olddata?olddata.length:0;
		let newlen=(len>oldlen || 3*len<oldlen)?len*2:oldlen;
		let data=this.data;
		if (newlen!==oldlen) {
			if (newlen>0) {
				this.ctxbuf=this.audio.ctx.createBuffer(1,newlen,this.freq);
				data=this.ctxbuf.getChannelData(0);
			} else {
				this.ctxbuf=null;
				data=new Float32Array(0);
			}
			let copylen=oldlen<newlen?oldlen:newlen;
			for (let i=0;i<copylen;i++) {data[i]=olddata[i];}
		}
		let clearlen=this.len<newlen?this.len:newlen;
		this.data=data;
		for (let i=len;i<clearlen;i++) {data[i]=0;}
		this.len=len;
		this.time=len/this.freq;
		return this;
	}


	loadfile(path) {
		// Load and replace the sound with a WAV file.
		this.resizelen(0);
		this.loaded=false;
		let req=new XMLHttpRequest();
		req.open("GET",path,true);
		req.responseType="arraybuffer";
		req.onload=((evt)=>{
			if (req.response) {
				let data=new Uint8Array(req.response);
				this.fromwav(data);
			}
		});
		req.send(null);
	}


	savefile(name) {
		// Save the sound to a WAV file.
		let blob=new Blob([this.towav()]);
		let link=document.createElement("a");
		link.href=window.URL.createObjectURL(blob);
		link.download=name;
		link.click();
	}


	fromwav(data,dataidx=0) {
		// Load a sound from WAV data. Can handle PCM or floating point samples.
		// Converts multi-channel to mono-channel.
		this.loaded=true;
		// Helper functions.
		function read32(i) {
			i+=dataidx;
			return ((data[i+3]<<24)|(data[i+2]<<16)|(data[i+1]<<8)|data[i])>>>0;
		}
		function read16(i) {
			i+=dataidx;
			return ((data[i+1]<<8)|data[i])>>>0;
		}
		let convu8 =new Uint8Array([1,0,0,0,0,0,0,0]);
		let convf32=new Float32Array(convu8.buffer,0);
		let convf64=new Float64Array(convu8.buffer);
		let little =(new Uint32Array(convu8.buffer))[0]===1;
		function readf32(i) {
			for (let j=0;j<4;j++) {convu8[j]=data[dataidx+i+(little?j:(3-j))];}
			return convf32[0];
		}
		function readf64(i) {
			for (let j=0;j<8;j++) {convu8[j]=data[dataidx+i+(little?j:(7-j))];}
			return convf64[0];
		}
		// Check RIFF and WAVE signatures.
		if (data.length<44 || read32(0)!==0x46464952 || read32(8)!==0x45564157) {
			return this;
		}
		let filelen=read32(4)+8;
		if (filelen>data.length) {filelen=data.length;}
		// Find the format and data blocks.
		let fmtidx=-1,fmtlen=-1;
		let datidx=-1,datlen=-1;
		for (let i=12;i+8<=filelen;) {
			let blockid=read32(i);
			let blocklen=read32(i+4)+8;
			if (blocklen<=0) {
				console.log("corrupt block");
				return this;
			} else if (blockid===0x20746d66) {
				fmtidx=i;
				fmtlen=blocklen;
			} else if (blockid===0x61746164) {
				datidx=i;
				datlen=blocklen;
			}
			i+=blocklen;
		}
		if (fmtlen<24 || datlen<0) {
			console.log("could not find format or data blocks");
			return this;
		}
		// Read the format block.
		let fmt =read16(fmtidx+ 8);
		let chan=read16(fmtidx+10);
		let freq=read32(fmtidx+12);
		let bits=read16(fmtidx+22);
		// Allow loading of PCM and float data.
		if (!(fmt===1 && bits>=8 && (bits&7)===0) && !(fmt===3 && (bits===32 || bits===64))) {
			return this;
		}
		// Parse the data block.
		let bytes=bits>>>3;
		let samples=Math.floor((datlen-8)/(chan*bytes));
		let channorm=1/chan;
		this.freq=freq;
		this.resizelen(samples);
		let snddata=this.data;
		datidx+=8+dataidx;
		if (fmt===1) {
			let mid=1<<(bits-1),offn=mid*2;
			let normp=1.0/(mid-1),normn=1.0/mid;
			datidx+=bytes-1;
			for (let s=0;s<samples;s++) {
				let nsum=0.0;
				for (let c=0;c<chan;c++) {
					let csum=0;
					for (let b=0;b<bytes;b++) {csum=csum*256+data[datidx-b];}
					nsum+=csum<mid?csum*normp:(csum-offn)*normn;
					datidx+=bytes;
				}
				snddata[s]=nsum*channorm;
			}
		} else {
			for (let s=0;s<samples;s++) {
				let nsum=0.0;
				for (let c=0;c<chan;c++) {
					if (bits===32) {nsum+=readf32(datidx);}
					if (bits===64) {nsum+=readf64(datidx);}
					datidx+=bytes;
				}
				snddata[s]=nsum*channorm;
			}
		}
		return this;
	}


	towav() {
		// Convert the sound to a 32-bit floating point WAV file.
		// Helper functions.
		function write32(i,x) {
			for (let j=0;j<4;j++) {data[i+j]=(x>>>(j*8))&255;}
		}
		function write16(i,x) {
			for (let j=0;j<2;j++) {data[i+j]=(x>>>(j*8))&255;}
		}
		let convu8 =new Uint8Array([1,0,0,0]);
		let convf32=new Float32Array(convu8.buffer,0);
		let little =(new Uint32Array(convu8.buffer))[0]===1;
		function writef32(i,x) {
			convf32[0]=x;
			for (let j=0;j<4;j++) {data[i+(little?j:(3-j))]=convu8[j];}
		}
		// Write RIFF and WAVE signatures.
		let bytes=4,bits=bytes*8,chan=1,fmt=3,freq=Math.round(this.freq);
		let sndlen=this.len,snddata=this.data;
		let data=new Uint8Array(sndlen*bytes*chan+12+24+8);
		write32(0,0x46464952);
		write32(4,data.length-8);
		write32(8,0x45564157);
		// Write format block.
		write32(12,0x20746d66);
		write32(16,16);
		write16(20,fmt);
		write16(22,chan);
		write32(24,freq);
		write32(28,freq*bytes*chan);
		write16(32,bytes*chan);
		write16(34,bits);
		// Write data block.
		write32(36,0x61746164);
		write32(40,data.length-44);
		for (let s=0;s<sndlen;s++) {
			writef32(44+s*4,snddata[s]);
		}
		return data;
	}


	play(volume,pan,freq) {
		return this.audio.play(this,volume,pan,freq);
	}


	addindex(snd,dstoff=0,vol=1.0) {
		// Add sound samples to the current sound.
		let srcoff=0,srclen=snd.len;
		if (dstoff<0) {
			srcoff=-dstoff;
			srclen+=dstoff;
		}
		if (srclen<=0) {return this;}
		if (dstoff+srclen>this.len) {
			this.resizelen(dstoff+srclen);
		}
		let dstdata=this.data;
		let srcdata=snd.data;
		// If we're adding the sound to itself, we may need to go back-to-front.
		if (dstoff<srcoff) {
			for (let i=0;i<srclen;i++) {
				dstdata[dstoff++]+=srcdata[srcoff++]*vol;
			}
		} else {
			dstoff+=srclen;
			srcoff+=srclen;
			for (let i=0;i<srclen;i++) {
				dstdata[--dstoff]+=srcdata[--srcoff]*vol;
			}
		}
		return this;
	}


	add(snd,offset=0,vol=1.0) {
		return this.addindex(snd,Math.round(offset*this.freq),vol);
	}


	getvol() {
		let data=this.data,len=data.length;
		let v=0,x;
		for (let i=0;i<len;i++) {
			x=Math.abs(data[i]);
			v=v<x?x:v;
		}
		return v;
	}


	scalevol(mul,normalize=false) {
		let data=this.data,len=data.length;
		if (normalize) {
			let norm=this.getvol();
			mul=norm>1e-10?mul/norm:0;
		}
		for (let i=0;i<len;i++) {data[i]*=mul;}
		return this;
	}


	scalelen(newlen) {
		let data=this.data,len=this.len;
		if (len<newlen) {
			// Stretch by linearly interpolating.
			this.resizelen(newlen);
			data=this.data;
			let sinc=len-1,dinc=newlen-1;
			let spos=len-1,dpos=newlen;
			let x0=len>0?data[spos]:0,xd=0;
			let rem=0,iden=1/dinc;
			while (dpos>0) {
				data[--dpos]=x0+xd*rem;
				rem-=sinc;
				if (rem<0) {
					rem+=dinc;
					xd=x0;
					x0=data[--spos];
					xd=(xd-x0)*iden;
				}
			}
		} else if (len>newlen) {
			// Shrink by summing and averaging.
			let rem=0,rden=1/len,sum=0,sden=newlen/len,x;
			let dpos=0,spos=0;
			while (dpos<newlen) {
				x=data[spos++];
				sum+=x;
				rem+=newlen;
				if (rem>=len) {
					rem-=len;
					x=rem>0?x*(rem*rden):0;
					data[dpos++]=sum*sden-x;
					sum=x;
				}
			}
			this.resizelen(newlen);
		}
		return this;
	}


	scaletime(newtime) {
		return this.scalelen(Math.round((newtime/this.time)*this.freq));
	}

}


class _AudioInstance {

	constructor(snd,vol=1.0,pan=0.0,freq=null) {
		let audio=snd.audio;
		// Audio player link
		this.audprev=null;
		this.audnext=audio.queue;
		audio.queue =this;
		// Sound link
		this.snd    =snd;
		this.sndprev=null;
		this.sndnext=snd.queue;
		snd.queue   =this;
		// Misc
		this.rate   =1.0;
		this.playing=true;
		this.done   =false;
		// src -> gain -> pan -> ctx
		let ctx=audio.ctx;
		this.ctx=ctx;
		this.ctxpan=ctx.createStereoPanner();
		this.setpan(pan);
		this.ctxpan.connect(ctx.destination);
		this.ctxgain=ctx.createGain();
		this.setvolume(vol);
		this.ctxgain.connect(this.ctxpan);
		let ctxsrc=ctx.createBufferSource();
		this.ctxsrc=ctxsrc;
		ctxsrc.addEventListener("ended",()=>{this.remove();});
		ctxsrc.buffer=snd.ctxbuf;
		ctxsrc.connect(this.ctxgain);
		ctxsrc.start(0,0,snd.time);
	}


	remove() {
		if (this.done) {return;}
		this.done=true;
		this.playing=false;
		let audio=this.snd.audio;
		let audprev=this.audprev;
		let audnext=this.audnext;
		if (audprev===null) {
			audio.queue=audnext;
		} else {
			audprev.audnext=audnext;
			this.audprev=null;
		}
		if (audnext!==null) {
			audnext.audprev=audprev;
			this.audnext=null;
		}
		// this.audio=null;
		let sndprev=this.sndprev;
		let sndnext=this.sndnext;
		if (sndprev===null) {
			this.snd.queue=sndnext;
		} else {
			sndprev.sndnext=sndnext;
			this.sndprev=null;
		}
		if (sndnext!==null) {
			sndnext.sndprev=sndprev;
			this.sndnext=null;
		}
		// this.snd=null;
		this.ctxsrc.disconnect();
		this.ctxgain.disconnect();
		this.ctxpan.disconnect();
	}


	stop() {
		if (!this.done) {
			this.playing=false;
			this.ctxsrc.stop();
		}
	}


	start() {
		if (!this.done) {
			this.playing=true;
			this.ctxsrc.start();
		}
	}


	setpan(pan) {
		// -1: 100% left channel
		//  0: 100% both channels
		// +1: 100% right channel
		if (pan<-1) {pan=-1;}
		else if (pan>1) {pan=1;}
		else if (isNaN(pan) || pan===undefined || pan===null) {pan=0;}
		this.pan=pan;
		if (!this.done) {
			this.ctxpan.pan.setValueAtTime(this.pan,this.ctx.currentTime);
		}
	}


	setvolume(vol) {
		if (isNaN(vol) || vol===undefined || vol===null) {vol=1;}
		this.volume=vol;
		if (!this.done) {
			this.ctxgain.gain.setValueAtTime(this.volume,this.ctx.currentTime);
		}
	}

}


class _AudioDelay {
	// Delay filter with linear interpolation.

	constructor(rate,delay) {
		this.rate=rate;
		this.delay=delay;
		this.pos=0;
		this.len=Math.floor(rate*delay)+2;
		this.data=new Float32Array(this.len);
	}


	add(x) {
		if (++this.pos>=this.len) {this.pos=0;}
		this.data[this.pos]=x;
	}


	get(delay) {
		if (delay===undefined) {
			delay=this.delay;
		} else if (delay<0 || delay>this.delay) {
			throw `Delay too large ${delay} > ${this.delay}`;
		}
		delay*=this.rate;
		let i=Math.floor(delay);
		let f=delay-i;
		let len=this.len,data=this.data;
		i=this.pos-i;
		if (i<0) {i+=len;}
		let j=i-1;
		if (j<0) {j+=len;}
		return data[i]*(1-f)+data[j]*f;
	}


	process(x) {
		this.add(x);
		return this.get();
	}

}


class _AudioEnvelope {
	// Envelope/gain filter.

	static CON=0;
	static LIN=1;
	static EXP=2;


	constructor(arr=null,eps=0.001) {
		// [ type, time, target, type, time, target, ... ]
		// type = con, lin, exp
		this.last=null;
		this.stop=0;
		this.eps=eps;
		this.envarr=[];
		for (let i=0;arr && i<arr.length;i+=3) {
			this.add(arr[i],arr[i+1],arr[i+2]);
		}
	}


	add(type,time,target) {
		if (time<0 || isNaN(time)) {
			throw "envelope invalid time: "+time.toString();
		}
		let envarr=this.envarr;
		let prev=envarr.length>0?envarr[envarr.length-1]:null;
		let prevtar=prev?prev.target:0;
		let prevstop=prev?prev.stop:0;
		let env={};
		env.start=prevstop;
		env.stop=prevstop+time;
		env.type=type;
		if (type===_AudioEnvelope.CON || time<=0) {
			env.mul=0;
			env.con=target;
		} else if (type===_AudioEnvelope.LIN) {
			env.mul=(target-prevtar)/time;
			env.con=prevtar-env.mul*prevstop;
		} else if (type===_AudioEnvelope.EXP) {
			// Scale the exponential by 1/(1-eps) to reach our target values.
			let leps=Math.log(this.eps);
			let expmul=(target-prevtar)/(1-this.eps);
			if (expmul<0) {
				env.mul=leps/time;
				env.con=Math.log(-expmul)-env.mul*prevstop;
				env.expcon=prevtar+expmul;
			} else {
				env.mul=-leps/time;
				env.con=Math.log(expmul)+leps-env.mul*prevstop;
				env.expcon=target-expmul;
			}
		} else {
			throw "envelope type not recognized: "+type;
		}
		env.target=target;
		envarr.push(env);
		this.stop=env.stop;
		return this;
	}


	get(time) {
		let env=this.last;
		// If we're in a new time segment.
		if (env===null || time<env.start || time>=env.stop) {
			env=null;
			if (time>=0 && time<this.stop) {
				let envarr=this.envarr;
				let i=0,len=envarr.length;
				while (i<len && time>=envarr[i].stop) {i++;}
				env=i<len?envarr[i]:null;
			}
			this.last=env;
			if (env===null) {return 0;}
		}
		let u=time*env.mul+env.con;
		if (env.type!==_AudioEnvelope.EXP) {return u;}
		else {return Math.exp(u)+env.expcon;}
	}

}


class _AudioBiquad {
	// Biquad filter type 1
	// https://shepazu.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html

	static NONE     =0;
	static LOWPASS  =1;
	static HIGHPASS =2;
	static BANDPASS =3;
	static NOTCH    =4;
	static ALLPASS  =5;
	static PEAK     =6;
	static LOWSHELF =7;
	static HIGHSHELF=8;


	constructor(type,rate,bandwidth=1,peakgain=0) {
		// bandwidth in kHz
		// rate = freq / sample rate
		this.type=type;
		this.rate=rate;
		this.peakgain=peakgain;
		this.bandwidth=bandwidth;
		this.clear();
		this.calccoefs();
	}


	clear() {
		this.x1=0;
		this.x2=0;
		this.y1=0;
		this.y2=0;
	}


	process(x) {
		let y=this.b0*x+this.b1*this.x1+this.b2*this.x2
		               -this.a1*this.y1-this.a2*this.y2;
		if (!(y>-Infinity && y<Infinity)) {y=0;}
		this.x2=this.x1;
		this.x1=x;
		this.y2=this.y1;
		this.y1=y;
		return y;
	}


	prev() {return this.y1;}


	getq() {
		let ang=2*Math.PI*this.rate;
		let sn =Math.sin(ang);
		let q  =0.5/Math.sinh(Math.log(2)*0.5*this.bandwidth*ang/sn);
		return q;
	}


	updatecoefs(type,rate,bandwidth=1,peakgain=0) {
		if (this.type!==type || this.rate!==rate || this.bandwidth!==bandwidth || this.peakgain!==peakgain) {
			this.type=type;
			this.rate=rate;
			this.peakgain=peakgain;
			this.bandwidth=bandwidth;
			this.calccoefs(false);
		}
	}


	calccoefs(reset=true) {
		let b0=1,b1=0,b2=0;
		let a0=1,a1=0,a2=0;
		let v  =Math.exp(this.peakgain/(Math.log(10)*40));
		let ang=2*Math.PI*this.rate;
		let sn =Math.sin(ang);
		let cs =Math.cos(ang);
		let q  =0.5/Math.sinh(Math.log(2)*0.5*this.bandwidth*ang/sn);
		let a  =sn/(2*q);
		let vr =2*Math.sqrt(v)*a;
		let type=this.type;
		if (type===_AudioBiquad.NONE) {
		} else if (type===_AudioBiquad.LOWPASS) {
			b1=1-cs;
			b0=0.5*b1;
			b2=b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.HIGHPASS) {
			b1=-1-cs;
			b0=-0.5*b1;
			b2=b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.BANDPASS) {
			b0=a;
			b1=0;
			b2=-b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.NOTCH) {
			b0=1;
			b1=-2*cs;
			b2=b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.ALLPASS) {
			b0=1-a;
			b1=-2*cs;
			b2=1+a;
			a0=b2;
			a1=b1;
			a2=b0;
		} else if (type===_AudioBiquad.PEAK) {
			b0=1+a*v;
			b1=-2*cs;
			b2=1-a*v;
			a0=1+a/v;
			a1=-2*cs;
			a2=1-a/v;
		} else if (type===_AudioBiquad.LOWSHELF) {
			b0=v*((v+1)-(v-1)*cs+vr);
			b1=2*v*((v-1)-(v+1)*cs);
			b2=v*((v+1)-(v-1)*cs-vr);
			a0=(v+1)+(v-1)*cs+vr;
			a1=-2*((v-1)+(v+1)*cs);
			a2=(v+1)+(v-1)*cs-vr;
		} else if (type===_AudioBiquad.HIGHSHELF) {
			b0=v*((v+1)+(v-1)*cs+vr);
			b1=-2*v*((v-1)+(v+1)*cs);
			b2=v*((v+1)+(v-1)*cs-vr);
			a0=(v+1)-(v-1)*cs+vr;
			a1=2*((v-1)-(v+1)*cs);
			a2=(v+1)-(v-1)*cs-vr;
		} else {
			throw "Biquad type not recognized: "+type;
		}
		// Rescale running constants.
		if (reset) {
			this.a0=0;
			this.x1=0;
			this.x2=0;
		}
		let norm=this.a0/a0;
		this.y1*=norm;
		this.y2*=norm;
		this.a0=a0;
		this.a1=a1/a0;
		this.a2=a2/a0;
		this.b0=b0/a0;
		this.b1=b1/a0;
		this.b2=b2/a0;
	}

}


class Audio {

	static Sound   =_AudioSound;
	static Instance=_AudioInstance;
	static Delay   =_AudioDelay;
	static Envelope=_AudioEnvelope;
	static Biquad  =_AudioBiquad;

	// The default context used for audio functions.
	static def=null;


	constructor(freq=44100) {
		let con=this.constructor;
		Object.assign(this,con);
		if (con.def===null) {con.def=this;}
		this.freq=freq;
		this.queue=null;
		let ctx=new AudioContext({latencyHint:"interactive",sampleRate:freq});
		this.ctx=ctx;
		if (!Audio.def) {Audio.initdef(this);}
	}


	static initdef(def) {
		if (!def) {def=Audio.def;}
		if (!def) {def=new Audio();}
		Audio.def=def;
		return def;
	}


	play(snd,volume,pan,freq) {
		return new _AudioInstance(snd,volume,pan,freq);
	}


	// ----------------------------------------
	// Oscillators
	// All input domains are wrapped to [0,1).
	// NaN and infinite values return 0 or the minimum value.


	static sin1(x) {
		x%=1.0;
		if (isNaN(x)) {return 0;}
		return Math.sin(x*6.2831853071795864769252866)*0.5+0.5;
	}


	static sin(x) {
		x%=1.0;
		if (isNaN(x)) {return 0;}
		return Math.sin(x*6.2831853071795864769252866);
	}


	static saw1(x) {
		//   /|  /|  /|
		//  / | / | / |
		// /  |/  |/  |
		x%=1.0;
		if (x<0) {x+=1;}
		return x>=0?x:0;
	}


	static saw(x) {
		return Audio.saw1(x+0.5)*2-1;
	}


	static tri1(x) {
		//   /\    /\    /
		//  /  \  /  \  /
		// /    \/    \/
		x%=1.0;
		if (x<0) {x+=1;}
		x*=2;
		if (x>1) {return 2-x;}
		return x>0?x:0;
	}


	static tri(x) {
		return Audio.tri1(x+0.25)*2-1;
	}


	static sqr1(x) {
		//    __    __
		//   |  |  |  |
		//   |  |  |  |
		// __|  |__|  |__
		x%=1.0;
		if (x<0) {x+=1;}
		return x>0.5?1:0;
	}


	static sqr(x) {
		return Audio.sqr1(x)*2-1;
	}


	static noise1(x) {
		// PRNG noise with interpolation for different frequencies.
		let v=x%1;
		if (v<0) {v+=1;}
		else if (isNaN(v)) {v=0;x=0;}
		let u0=(Math.floor(x)>>>0)+0x66daacfd,u1=u0+1;
		u0=Math.imul(u0^(u0>>>16),0xf8b7629f);
		u0=Math.imul(u0^(u0>>> 8),0xcbc5c2b5);
		u0=Math.imul(u0^(u0>>>24),0xf5a5bda5)>>>0;
		u1=Math.imul(u1^(u1>>>16),0xf8b7629f);
		u1=Math.imul(u1^(u1>>> 8),0xcbc5c2b5);
		u1=Math.imul(u1^(u1>>>24),0xf5a5bda5)>>>0;
		return (u0+(u1-u0)*v)*(1.0/4294967295.0);
	}


	static noise(x) {
		return Audio.noise1(x)*2-1;
	}


	static clip(x,min,max) {
		// Same as clamping.
		if (min>max) {
			let tmp=min;
			min=max;
			max=tmp;
		}
		if (x>=max) {return max;}
		return x>=min?x:min;
	}


	static wrap(x,min,max) {
		if (min>max) {
			let tmp=min;
			min=max;
			max=tmp;
		}
		// Prevent floating point drift for successive calls.
		if (x>=min && x<=max) {return x;}
		max-=min;
		x=(x-min)%max;
		if (x<0) {x+=max;}
		return x>=0?x+min:min;
	}


	// ----------------------------------------
	// String Instruments


	static generatestring(volume=1.0,freq=200,pos=0.5,inharm=0.00006,decay=1.2,sndfreq=44100) {
		// Jason Pelc
		// http://large.stanford.edu/courses/2007/ph210/pelc2/
		// Stop when e^(-decay*time/sndfreq)<=cutoff
		const cutoff=1e-3;
		decay/=sndfreq;
		freq/=sndfreq;
		let harmonics=Math.ceil(0.5/freq);
		let sndlen=Math.ceil(-Math.log(cutoff)/decay);
		let snd=new Audio.Sound(sndfreq,sndlen);
		let data=snd.data;
		// Generate coefficients.
		if (pos<0.0001) {pos=0.0001;}
		if (pos>0.9999) {pos=0.9999;}
		let listen=pos; // 0.16;
		let c0=listen*Math.PI;
		let c1=(2*volume)/(Math.PI*Math.PI*pos*(1-pos));
		let c2=freq*Math.PI*2;
		// Process highest to lowest for floating point accuracy.
		for (let n=harmonics;n>0;n--) {
			// Calculate coefficients for the n'th harmonic.
			let n2=n*n;
			let harmvol=Math.sin(n*c0)*c1/n2;
			if (Math.abs(harmvol)<=cutoff) {continue;}
			// Correct n2 by -1 so the fundamental = freq.
			let ihscale=n*Math.sqrt(1+(n2-1)*inharm);
			let harmdecay=-decay*ihscale;
			let harmmul=Math.exp(harmdecay);
			let harmlen=Math.ceil(Math.log(cutoff/Math.abs(harmvol))/harmdecay);
			if (harmlen>sndlen) {harmlen=sndlen;}
			let harmfreq=c2*ihscale;
			let harmphase=0;
			// Generate the waveform.
			for (let i=0;i<harmlen;i++) {
				data[i]+=harmvol*Math.sin(harmphase);
				harmvol*=harmmul;
				harmphase+=harmfreq;
			}
		}
		// Taper the ends.
		let head=Math.ceil(0.010*sndfreq);
		for (let i=0;i<head && i<sndlen;i++) {data[i]*=i/head;}
		let tail=Math.ceil(0.005*sndfreq);
		for (let i=0;i<tail && i<sndlen;i++) {data[sndlen-1-i]*=i/tail;}
		return snd;
	}


	static createguitar(volume=1.0,freq=200,pluck=0.5,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pluck,0.000050,1.2,sndfreq);
	}


	static createxylophone(volume=1.0,freq=250,pos=0.5,sndfreq=44100) {
		// freq = constant / length^2
		return Audio.generatestring(volume,freq,pos,0.374520,3.2,sndfreq);
	}


	static createmarimba(volume=1.0,freq=250,pos=0.5,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pos,0.947200,3.2,sndfreq);
	}


	static createglockenspiel(volume=0.2,freq=1867,pos=0.5,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pos,0.090000,1.3,sndfreq);
	}


	static createmusicbox(volume=0.1,freq=877,sndfreq=44100) {
		return Audio.generatestring(volume,freq,0.40,0.050000,2.3,sndfreq);
	}


	// ----------------------------------------
	// Percussion Instruments


	static createdrumhihat(volume=1.0,freq=7000,time=0.1,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let gain=new Audio.Envelope([Audio.Envelope.LIN,0.01,volume,Audio.Envelope.EXP,time-0.01,0]);
		let hp=new Audio.Biquad(Audio.Biquad.HIGHPASS,freq/sndfreq);
		let bp=new Audio.Biquad(Audio.Biquad.BANDPASS,freq*1.4/sndfreq);
		let data=snd.data;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let x=Audio.noise(i);
			x=bp.process(x);
			x=hp.process(x);
			x=Audio.clip(x,-1,1);
			data[i]=x*gain.get(t);
		}
		return snd;
	}


	static createdrumkick(volume=1.0,freq=120,time=0.2,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let gain=new Audio.Envelope([Audio.Envelope.LIN,0.01,volume*0.5,Audio.Envelope.LIN,time-0.01,0]);
		let freq1=freq/sndfreq,freq2=freq1*0.41;
		let osc1=new Audio.Envelope([Audio.Envelope.CON,0,freq1,Audio.Envelope.LIN,0.01,freq1,Audio.Envelope.LIN,time-0.01,freq1*0.2]);
		let osc2=new Audio.Envelope([Audio.Envelope.CON,0,freq2,Audio.Envelope.LIN,0.01,freq2,Audio.Envelope.LIN,time-0.01,freq2*0.2]);
		let phase1=0,phase2=0;
		let data=snd.data;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let x=Audio.sin(phase1)+Audio.sin(phase2);
			phase1+=osc1.get(t);
			phase2+=osc2.get(t);
			data[i]=x*gain.get(t);
		}
		return snd;
	}


	static createdrumsnare(volume=1.0,freq=100,time=0.2,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let gain=new Audio.Envelope([Audio.Envelope.LIN,0.01,volume,Audio.Envelope.EXP,time-0.01,0]);
		let freq1=freq/sndfreq,freq2=freq1*0.41;
		let osc1=new Audio.Envelope([Audio.Envelope.CON,0,freq1,Audio.Envelope.LIN,0.01,freq1,Audio.Envelope.LIN,time-0.01,freq1*0.2]);
		let osc2=new Audio.Envelope([Audio.Envelope.CON,0,freq2,Audio.Envelope.LIN,0.01,freq2,Audio.Envelope.LIN,time-0.01,freq2*0.2]);
		let oscn=new Audio.Envelope([Audio.Envelope.LIN,time,1]);
		let phase1=0,phase2=0;
		let hp0=new Audio.Biquad(Audio.Biquad.HIGHPASS,freq/sndfreq);
		let hp1=new Audio.Biquad(Audio.Biquad.HIGHPASS,10*freq/sndfreq);
		let data=snd.data;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let n=Audio.noise(i);
			let n0=hp0.process(n);
			let n1=hp1.process(n);
			n=n0+oscn.get(t)*(n1-n0);
			let x=(Audio.sin(phase1)+Audio.sin(phase2))*0.5*0.2+n*0.8;
			phase1+=osc1.get(t);
			phase2+=osc2.get(t);
			data[i]=x*gain.get(t);
		}
		return snd;
	}


	// ----------------------------------------
	// Wind Instruments


	static createflute(volume=1.0,freq=200) {
		let sndfreq=44100,len=sndfreq*2;
		let snd=new Audio.Sound(sndfreq,len);
		// let voldecay=Math.log(1e-4)/4;
		let data=snd.data;
		let filter=new Audio.Biquad(Audio.Biquad.LOWPASS,freq/sndfreq,2);
		let delay=new Audio.Delay(sndfreq,1/freq),delaygain=-0.95;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			// let mul=Math.exp(voldecay*t);
			let x=t<0.5?(Math.random()*2-1):0;
			x=filter.process(x)+delay.get()*delaygain;
			delay.add(x);
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createtuba(volume=1.0,freq=300) {
		let sndfreq=44100,len=sndfreq*3;
		let snd=new Audio.Sound(sndfreq,len);
		let voldecay=Math.log(1e-4)/3;
		let data=snd.data;
		let filter=new Audio.Biquad(Audio.Biquad.LOWPASS,freq/sndfreq,1);
		let delay=new Audio.Delay(sndfreq,0.02),delaygain=0.95;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let mul=Math.exp(voldecay*t);
			let x=filter.process(Audio.noise(i))*mul;
			x+=delay.get()*delaygain;
			delay.add(x);
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	// ----------------------------------------
	// User Interface


	static generateui(volume=0.04,freq=200,time=0.2,noise=0.5,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		let attack=0.01,sustain=time*0.25;
		let scale=freq/5000;
		let bp1=new Audio.Biquad(Audio.Biquad.BANDPASS,freq/sndfreq,6*scale);
		// let bp2=new Audio.Biquad(Audio.Biquad.BANDPASS, 700/sndfreq,3*scale);
		// let del=new Audio.Delay(sndfreq,time*0.25);
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let x=0;
			if (t<attack) {x=t/attack;}
			else if (t-attack<sustain) {x=1-(t-attack)/sustain;}
			x*=x;
			x*=bp1.process(Audio.tri(t*freq)*(1-noise)+Audio.noise(i)*noise);
			// x+=del.get();
			// This bandpass adds low frequency vibrations from the hypothetical console.
			// del.add(bp2.process(x)*0.25);
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createuiincrease(volume=0.05) {
		return Audio.generateui(volume,2000,0.2,0.5);
	}


	static createuidecrease(volume=0.05) {
		return Audio.generateui(volume,1500,0.2,0.5);
	}


	static createuiconfirm(volume=0.05) {
		return Audio.generateui(volume,4000,2.0,0.25);
	}


	static createuierror(volume=0.05) {
		return Audio.generateui(volume,800,1.0,0.5);
	}


	static createuiclick(volume=0.05) {
		return Audio.generateui(volume,800,0.2,0.75);
	}


	// ----------------------------------------
	// Misc


	static generatethud(volume=1.0,freq=8000,time=0.02,sndfreq=44100) {
		// Pitch should increase slightly with force.
		let decay=Math.log(1e-4)/(time*sndfreq);
		let len=Math.ceil(Math.log(1e-4)/decay);
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		let vmul=Math.exp(decay),vtmp=1;
		freq/=sndfreq;
		let bp1=new Audio.Biquad(Audio.Biquad.BANDPASS,freq,2);
		let bp2=new Audio.Biquad(Audio.Biquad.BANDPASS,freq,2);
		let del=new Audio.Delay(sndfreq,0.003),delmul=0.9;
		for (let i=0;i<len;i++) {
			let x=Audio.noise(i)*vtmp;
			vtmp*=vmul;
			x=bp1.process(x);
			x=bp2.process(x);
			x+=del.process(x)*delmul;
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createmarble(volume=0.5) {
		return Audio.generatethud(volume,8000,0.02);
	}


	static createthud(volume=1.0) {
		return Audio.generatethud(volume,100,0.2);
	}


	static createelectricity(volume=0.15,freq=159.8,time=1.5) {
		let sndfreq=44100,len=Math.ceil(time*sndfreq);
		let ramp=0.01*sndfreq,rampden=1/ramp,tail=len-ramp;
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		let freq0=freq/sndfreq,freq1=freq0*1.002;
		let lp3=new Audio.Biquad(Audio.Biquad.LOWPASS,3000/sndfreq);
		for (let i=0;i<len;i++) {
			let x=Audio.saw1(i*freq0)+Audio.saw1(i*freq1);
			x=Audio.clip(x-1,-0.5,0.5);
			x=lp3.process(x);
			if (i<ramp || i>tail) {x*=(i<ramp?i:len-1-i)*rampden;}
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createlaser(volume=0.5,freq=10000,time=0.25) {
		let sndfreq=44100,len=Math.ceil(time*sndfreq);
		let ramp=0.01*sndfreq,rampden=1/ramp,tail=len-ramp;
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		freq*=Math.PI*2/sndfreq;
		let vmul=Math.exp(Math.log(1e-4)/len),vol=1;
		// Instead of a delay constant, use a delay multiplier. Scales sum < 1.
		// Array format: delay, scale, delay, scale, ...
		let deltable=[0.99,-0.35,0.90,-0.28,0.80,-0.21,0.40,-0.13];
		let delays=deltable.length;
		for (let i=0;i<len;i++) {
			let x=Math.sin(i*freq)*vol;
			if (i<ramp) {x*=i*rampden;}
			vol*=vmul;
			for (let j=0;j<delays;j+=2) {
				let u=i*deltable[j],k=Math.floor(u);
				if (k>=0 && k+1<i) {
					u-=k;
					x+=(data[k]*(1-u)+data[k+1]*u)*deltable[j+1];
				}
			}
			if (i>tail) {x*=(len-1-i)*rampden;}
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static generateexplosion(volume=0.75,freq=1000,time=0.25,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let ramp=0.01*sndfreq,rampden=1/ramp,tail=len-ramp;
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		let vmul=Math.exp(Math.log(1e-4)*3/len),vol=1;
		let f=freq/(freq+1000);
		let lpcoef=1-f,bpcoef=f,del=0.75+0.15*f,delmul=-0.9+0.5*f;
		let lp=new Audio.Biquad(Audio.Biquad.LOWPASS,freq/sndfreq,1);
		let bp=new Audio.Biquad(Audio.Biquad.BANDPASS,freq/sndfreq,2);
		for (let i=0;i<len;i++) {
			let x=Audio.noise(i)*vol;
			vol*=vmul;
			x=lp.process(x)*lpcoef+bp.process(x)*bpcoef;
			let u=i*del,k=Math.floor(u);
			if (k>=0 && k+1<i) {
				u-=k;
				x+=(data[k]*(1-u)+data[k+1]*u)*delmul;
			}
			if (i<ramp || i>tail) {x*=(i<ramp?i:len-1-i)*rampden;}
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createexplosion1(volume=0.5) {
		return Audio.generateexplosion(volume,100,5.0);
	}


	static createexplosion2(volume=1.0) {
		return Audio.generateexplosion(volume,300,5.0);
	}


	static creategunshot1(volume=0.25) {
		return Audio.generateexplosion(volume,500,0.25);
	}


	static creategunshot2(volume=0.5) {
		return Audio.generateexplosion(volume,1000,1.0);
	}


	static creategunhit(volume=0.25) {
		return Audio.generateexplosion(volume,200,0.10);
	}

}
