/*------------------------------------------------------------------------------


library.js - v1.04

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Versions


Input   - v1.14
Random  - v1.09
Vector  - v1.05
Drawing - v3.08
Audio   - v1.06


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Input - v1.14


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
		this.mousepos=[NaN,NaN];
		this.mouseraw=[NaN,NaN];
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
// Random - v1.09


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
		// Box-Muller transform.
		let r=this.getf();
		r=Math.sqrt(-2*Math.log(r>1e-99?r:1e-99));
		return Math.cos(6.283185307*this.getf())*r;
	}

}


//---------------------------------------------------------------------------------
// Vector - v1.05


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
		let l=this.length,vl=val.length,i;
		if (vl!==undefined) {
			l=l<vl?l:vl;
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
		for (i=0;i<len;i++) {u[i]*=mag;}
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
			for (i=0;i<len;i++) {u[i]*=mag;}
		}
		return this;
	}


	norm() {
		return (new Vector(this)).normalize();
	}

}


//---------------------------------------------------------------------------------
// Drawing - v3.08


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


	constructor(params) {
		this.data=new Float64Array([1,0,0,0,1,0,1,1,0,1,0,0,0]);
		if (params!==undefined) {this.set(params);}
	}


	reset() {
		this.data.set([1,0,0,0,1,0,1,1,0,1,0,0,0]);
	}


	set(params) {
		// Accepts: transforms, arrays, {x,y,angle,scale,xscale,yscale}
		let data=this.data;
		if (params instanceof _DrawTransform) {
			data.set(params.data);
		} else if (params.length) {
			if (params.length!==data.length) {throw "param length";}
			data.set(params);
		} else {
			data[11]=params.x??0;
			data[12]=params.y??0;
			let ang=(params.angle??0)%6.283185307;
			data[ 8]=ang;
			data[ 9]=Math.cos(ang);
			data[10]=Math.sin(ang);
			let scale=params.scale??1;
			data[ 6]=params.xscale??scale;
			data[ 7]=params.yscale??scale;
			this.calcmatrix();
		}
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
		if (y===undefined) {
			if (!x.length) {y=x;}
			else {y=x[1];x=x[0];}
		}
		this.data[6]=x;
		this.data[7]=y;
		this.calcmatrix();
		return this;
	}


	mulscale(x,y) {
		if (y===undefined) {
			if (!x.length) {y=x;}
			else {y=x[1];x=x[0];}
		}
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
			let len=16;
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
			let off=[0,0];
			if ((type&1) && this.vertidx) {
				let l=this.vertarr[this.vertidx-1];
				off=[l.x,l.y];
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


	trace(rad) {
		throw "not implemented";
		// Curve offseting. Project out based on tangent.
		/*
		c2x=(c2x-c1x)*3;c1x=(c1x-p0x)*3;c3x-=p0x+c2x;c2x-=c1x;
		c2y=(c2y-c1y)*3;c1y=(c1y-p0y)*3;c3y-=p0y+c2y;c2y-=c1y;

		// Point
		ppx=p0x+u*(c1x+u*(c2x+u*c3x));
		ppy=p0y+u*(c1y+u*(c2y+u*c3y));

		// Tangent
		dx=c1x+u*(2*c2x+u*3*c3x);
		dy=c1y+u*(2*c2y+u*3*c3y);
		norm=rad/Math.sqrt(dx*dx+dy*dy);

		px=ppx-dy*rad;
		py=ppy+dx*rad;
		*/
		/*let px=0,py=0,pdx=1,pdy=0;
		for (let i=0;i<vertidx;) {
			let v=vertarr[i];
			let x=v.x,dx=x-px;
			let y=v.y,dy=y-py;
			let len=dx*dx+dy*dy;
			if (len<1e-9) {continue;}
			len=1/Math.sqrt(len);
			dx*=len;
			dy*=len;
			let type=v.type;
			let join=0;
			if (pdx*dy-pdy*dx<=0) {
				// facing inward
				join=0;
			}
			if (type===_DrawPoly.CURVE) {
				// Assume best tangents to offset points are at u=0,1/3,2/3,1.
				let pt=[p0x,p0y,c1x,c1y,c2x,c2y,p1x,p1y];
				for (let j=0;j<4;j++) {
					let u=j/3;
					let cdx=c1x+u*(2*c2x+u*3*c3x);
					let cdy=c1y+u*(2*c2y+u*3*c3y);
					let cn=1/Math.sqrt(cdx*cdx+cdy*cdy);
					cdx*=cn;
					cdy*=cn;
					pt[j*2+0]-=cdy*rad;
					pt[j*2+1]-=cdx*rad;
				}
			}
			px=x;
			py=y;
			pdx=dx;
			pdy=dy;
		}*/
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
		SPC 553
		█ 553 M 0 0 L 553 0 L 553 1000 L 0 1000 Z
		! 553 M 224 54 L 327 54 L 314 560 L 238 560 Z M 275 757 C 239 757 210 728 210 692 C 210 656 239 627 275 627 C 311 627 340 656 340 692 C 340 728 311 757 275 757
		" 553 M 127 54 L 235 54 L 221 284 L 141 284 Z M 318 54 L 426 54 L 412 284 L 332 284 Z
		# 553 M 173 106 L 244 106 L 228 268 L 354 268 L 371 106 L 443 106 L 426 268 L 532 268 L 532 332 L 420 332 L 403 504 L 506 504 L 506 568 L 396 568 L 378 748 L 306 748 L 324 568 L 198 568 L 180 748 L 108 748 L 126 568 L 21 568 L 21 504 L 132 504 L 150 332 L 46 332 L 46 268 L 156 268 Z M 222 332 L 205 504 L 331 504 L 348 332 Z
		$ 553 M 291 14 L 362 14 L 349 109 C 384 113 421 118 448 125 L 448 200 C 419 193 376 184 340 182 L 312 392 C 408 429 493 472 493 569 C 493 691 386 740 264 747 L 248 864 L 177 864 L 193 747 C 149 743 103 738 55 726 L 55 645 C 102 660 152 670 204 671 L 232 450 C 150 420 59 378 59 277 C 59 190 139 113 279 107 Z M 269 181 C 188 187 151 220 151 270 C 151 319 188 342 244 365 Z M 275 671 C 358 667 401 632 401 576 C 401 513 342 496 300 477 Z
		% 553 M 462 54 L 543 54 L 90 748 L 10 748 Z M 404 755 C 324 755 271 708 271 606 C 271 532 322 461 404 461 C 491 461 536 518 536 606 C 536 686 484 755 404 755 M 403 693 C 437 693 463 662 463 606 C 463 559 446 523 404 523 C 365 523 344 560 344 606 C 344 671 370 693 403 693 M 150 341 C 70 341 18 294 18 192 C 18 118 68 47 150 47 C 237 47 282 104 282 192 C 282 272 230 341 150 341 M 149 279 C 183 279 209 248 209 192 C 209 145 192 109 150 109 C 112 109 90 148 90 192 C 90 257 116 279 149 279
		& 553 M 396 553 C 407 521 419 472 417 413 L 503 413 C 503 481 495 548 454 624 L 553 748 L 440 748 L 397 694 C 354 729 302 755 226 755 C 101 755 28 683 28 574 C 28 480 81 424 149 384 C 114 338 84 296 84 231 C 84 117 165 68 256 68 C 347 68 416 120 416 211 C 416 297 358 346 270 395 Z M 227 341 C 267 316 329 287 329 218 C 329 169 300 140 253 140 C 199 140 172 177 172 223 C 172 277 204 312 227 341 M 193 439 C 159 462 117 498 117 565 C 117 637 166 682 236 682 C 281 682 316 666 349 634 Z
		' 553 M 221 54 L 333 54 L 319 284 L 234 284 Z
		( 553 M 426 68 C 313 176 235 317 235 484 C 235 648 310 788 425 901 L 373 954 C 254 841 147 692 147 484 C 147 277 266 117 376 17 Z
		) 553 M 180 17 C 294 124 406 276 406 481 C 406 675 312 830 177 953 L 128 903 C 236 794 318 667 318 481 C 318 319 235 172 128 70 Z
		* 553 M 241 54 L 312 54 L 299 222 L 439 128 L 473 188 L 321 263 L 472 336 L 439 394 L 300 302 L 312 471 L 241 471 L 253 302 L 112 394 L 81 337 L 232 262 L 81 186 L 114 129 L 254 222 Z
		+ 553 M 234 244 L 319 244 L 319 443 L 512 443 L 512 518 L 319 518 L 319 718 L 234 718 L 234 518 L 41 518 L 41 443 L 234 443 Z
		, 553 M 117 849 C 156 850 246 836 246 765 C 246 712 200 706 200 653 C 200 621 225 590 266 590 C 311 590 354 625 354 707 C 354 824 267 916 117 916 Z
		- 553 M 130 441 L 423 441 L 423 521 L 130 521 Z
		. 553 M 273 757 C 228 757 191 720 191 675 C 191 630 228 593 273 593 C 318 593 355 630 355 675 C 355 720 318 757 273 757
		/ 553 M 393 54 L 475 54 L 138 854 L 56 854 Z
		0 553 M 281 97 C 427 97 510 212 510 418 C 510 652 414 757 271 757 C 126 757 43 647 43 418 C 43 235 122 97 281 97 M 403 283 C 391 233 351 170 277 170 C 167 170 118 296 132 484 Z M 148 567 C 172 653 223 684 277 684 C 384 684 438 556 420 363 Z
		1 553 M 271 103 L 346 103 L 346 668 L 490 668 L 490 748 L 86 748 L 86 668 L 252 668 L 252 199 L 98 283 L 66 210 Z
		2 553 M 75 181 C 119 141 165 97 270 97 C 391 97 461 178 461 282 C 461 413 376 477 183 667 L 495 667 L 495 748 L 72 748 L 72 672 C 307 432 368 401 368 290 C 368 153 221 135 122 237 Z
		3 553 M 98 122 C 147 106 194 97 243 97 C 351 97 452 136 452 254 C 452 327 418 374 346 408 C 401 416 483 463 483 554 C 483 680 373 757 201 757 C 155 757 116 753 81 749 L 81 672 C 120 677 157 683 208 683 C 324 683 394 647 394 561 C 394 477 305 452 250 452 L 159 452 L 159 382 L 245 382 C 291 382 362 353 362 268 C 362 192 298 135 98 197 Z
		4 553 M 295 106 L 418 106 L 418 531 L 527 531 L 527 606 L 418 606 L 418 748 L 330 748 L 330 606 L 21 606 L 21 531 Z M 330 531 L 330 188 L 106 531 Z
		5 553 M 99 106 L 444 106 L 444 180 L 179 180 L 179 361 L 244 361 C 407 361 479 436 479 543 C 479 674 355 757 210 757 C 166 757 129 753 87 748 L 87 671 C 130 680 170 683 215 683 C 348 683 387 608 387 548 C 387 464 317 434 224 434 L 99 434 Z
		6 553 M 453 181 L 381 181 C 248 181 154 244 149 393 C 206 361 264 353 304 353 C 434 353 503 431 503 542 C 503 646 432 757 277 757 C 139 757 60 670 60 470 C 60 225 176 106 380 106 L 453 106 Z M 149 464 C 149 633 197 687 285 687 C 361 687 414 635 414 548 C 414 473 376 422 292 422 C 248 422 203 435 149 465
		7 553 M 57 106 L 491 106 L 491 186 L 222 748 L 125 748 L 404 185 L 57 185 Z
		8 553 M 281 97 C 418 97 481 159 481 251 C 481 338 419 380 361 412 C 450 458 495 506 495 587 C 495 695 401 757 273 757 C 157 757 58 708 58 597 C 58 504 120 458 193 419 C 90 365 72 306 72 257 C 72 171 144 97 281 97 M 284 375 C 354 341 393 308 393 254 C 393 196 351 168 278 168 C 209 168 160 192 160 251 C 160 317 224 345 284 375 M 270 456 C 193 493 151 530 151 589 C 151 647 197 684 277 684 C 359 684 402 647 402 592 C 402 528 345 489 270 456
		9 553 M 89 748 L 89 673 L 146 673 C 321 673 396 602 403 461 C 361 482 317 501 242 501 C 129 501 49 432 49 309 C 49 184 146 97 272 97 C 439 97 492 233 492 390 C 492 670 339 748 141 748 Z M 403 389 C 403 269 380 167 268 167 C 179 167 139 230 139 304 C 139 396 191 432 258 432 C 317 432 368 412 403 389
		: 553 M 277 757 C 235 757 202 724 202 682 C 202 640 235 607 277 607 C 319 607 352 640 352 682 C 352 724 319 757 277 757 M 277 396 C 235 396 202 363 202 321 C 202 279 235 246 277 246 C 319 246 352 279 352 321 C 352 363 319 396 277 396
		; 553 M 277 396 C 235 396 202 363 202 321 C 202 279 235 246 277 246 C 319 246 352 279 352 321 C 352 363 319 396 277 396 M 123 849 C 162 850 252 836 252 765 C 252 712 206 706 206 653 C 206 621 231 590 272 590 C 317 590 360 625 360 707 C 360 824 273 916 123 916 Z
		< 553 M 398 205 L 451 259 L 184 480 L 451 701 L 398 755 L 68 480 Z
		= 553 M 65 359 L 488 359 L 488 431 L 65 431 Z M 65 530 L 488 530 L 488 602 L 65 602 Z
		> 553 M 156 204 L 485 480 L 156 756 L 103 702 L 370 481 L 103 260 Z
		? 553 M 149 54 C 340 49 453 158 453 274 C 453 358 411 432 280 439 L 277 560 L 203 560 L 197 372 L 255 372 C 289 372 360 368 360 280 C 360 171 254 128 149 131 Z M 239 757 C 203 757 174 728 174 692 C 174 656 203 627 239 627 C 275 627 304 656 304 692 C 304 728 275 757 239 757
		@ 553 M 423 292 L 384 544 C 371 628 380 653 406 653 C 452 653 477 556 477 405 C 477 215 428 108 317 108 C 182 108 74 320 74 580 C 74 829 173 891 249 891 C 322 891 357 878 416 852 L 416 915 C 363 937 325 952 249 952 C 55 952 5 771 5 579 C 5 258 145 48 321 48 C 442 48 546 128 546 405 C 546 587 503 717 399 717 C 357 717 323 699 323 644 C 294 701 266 717 231 717 C 164 717 138 666 138 572 C 138 433 190 294 299 294 C 330 294 342 299 359 307 Z M 333 373 C 320 360 311 357 298 357 C 238 357 216 489 216 559 C 216 621 220 653 244 653 C 263 653 276 637 291 607 L 301 587 Z
		A 553 M 338 106 L 548 748 L 453 748 L 408 607 L 141 607 L 95 748 L 5 748 L 218 106 Z M 166 530 L 383 530 L 275 186 Z
		B 553 M 261 106 C 369 106 476 134 476 262 C 476 333 444 383 370 407 C 457 425 499 483 499 556 C 499 683 392 748 253 748 L 78 748 L 78 106 Z M 165 380 L 259 380 C 330 380 385 345 385 275 C 385 199 327 180 257 180 L 165 180 Z M 165 674 L 262 674 C 355 674 406 638 406 562 C 406 488 339 453 262 453 L 165 453 Z
		C 553 M 489 214 C 438 189 393 175 337 175 C 193 175 138 300 138 423 C 138 606 218 678 336 678 C 404 678 433 665 489 642 L 489 725 C 444 741 401 756 328 756 C 122 756 45 622 45 423 C 45 251 136 98 337 98 C 401 98 445 111 489 128 Z
		D 553 M 223 106 C 475 106 517 277 517 417 C 517 676 363 748 197 748 L 54 748 L 54 106 Z M 208 672 C 344 672 425 602 425 417 C 425 255 364 180 216 180 L 141 180 L 141 672 Z
		E 553 M 464 106 L 464 180 L 186 180 L 186 378 L 453 378 L 453 452 L 186 452 L 186 673 L 464 673 L 464 748 L 99 748 L 99 106 Z
		F 553 M 463 106 L 463 181 L 190 181 L 190 389 L 449 389 L 449 462 L 190 462 L 190 748 L 101 748 L 101 106 Z
		G 553 M 494 215 C 456 196 409 175 338 175 C 201 175 124 279 124 426 C 124 580 181 679 326 679 C 357 679 383 676 411 666 L 411 462 L 279 462 L 279 390 L 497 390 L 497 718 C 449 740 389 757 317 757 C 121 757 32 625 32 426 C 32 229 152 97 338 97 C 402 97 453 110 494 128 Z
		H 553 M 412 106 L 499 106 L 499 748 L 412 748 L 412 453 L 142 453 L 142 748 L 55 748 L 55 106 L 142 106 L 142 377 L 412 377 Z
		I 553 M 84 106 L 469 106 L 469 180 L 321 180 L 321 673 L 469 673 L 469 748 L 84 748 L 84 673 L 232 673 L 232 180 L 84 180 Z
		J 553 M 98 106 L 431 106 L 431 546 C 431 678 351 755 232 755 C 166 755 112 734 90 719 L 90 631 C 113 649 171 679 229 679 C 306 679 342 628 342 552 L 342 182 L 98 182 Z
		K 553 M 77 106 L 164 106 L 164 404 L 399 106 L 503 106 L 249 411 L 514 748 L 404 748 L 164 433 L 164 748 L 77 748 Z
		L 553 M 114 106 L 203 106 L 203 673 L 484 673 L 484 748 L 114 748 Z
		M 553 M 55 106 L 159 106 L 274 429 L 301 346 L 392 106 L 498 106 L 529 748 L 444 748 L 425 196 L 396 281 L 301 539 L 240 539 L 149 291 L 120 196 L 118 353 L 107 748 L 24 748 Z
		N 553 M 58 106 L 171 106 L 346 479 L 414 633 L 414 106 L 495 106 L 495 748 L 381 748 L 193 345 L 140 218 L 140 748 L 58 748 Z
		O 553 M 281 97 C 451 97 526 228 526 420 C 526 643 421 757 272 757 C 76 757 28 592 28 423 C 28 250 107 97 281 97 M 277 174 C 173 174 119 277 119 420 C 119 599 177 681 274 681 C 387 681 435 569 435 430 C 435 269 386 174 277 174
		P 553 M 259 106 C 403 106 499 174 499 299 C 499 423 405 518 249 518 L 165 518 L 165 748 L 78 748 L 78 106 Z M 244 443 C 352 443 408 398 408 305 C 408 214 338 179 257 179 L 165 179 L 165 443 Z
		Q 553 M 553 876 C 516 904 478 925 415 925 C 299 925 235 852 230 754 C 83 732 28 601 28 432 C 28 251 107 97 281 97 C 483 97 526 277 526 418 C 526 570 474 725 311 754 C 322 818 362 850 420 850 C 461 850 483 838 514 816 Z M 275 680 C 390 680 435 565 435 427 C 435 274 389 174 276 174 C 178 174 119 269 119 420 C 119 609 184 680 275 680
		R 553 M 257 106 C 410 106 468 179 468 274 C 468 369 404 424 330 442 C 369 454 396 498 420 548 L 516 748 L 418 748 L 322 544 C 298 493 276 462 212 462 L 171 462 L 171 748 L 83 748 L 83 106 Z M 243 392 C 327 392 376 351 376 282 C 376 219 337 180 256 180 L 171 180 L 171 392 Z
		S 553 M 448 194 C 406 183 358 173 295 173 C 241 173 154 186 154 263 C 154 308 186 339 246 364 L 342 404 C 450 449 490 503 490 575 C 490 694 389 757 232 757 C 173 757 115 749 54 735 L 54 650 C 100 667 164 680 236 680 C 357 680 398 643 398 578 C 398 536 364 506 307 482 L 212 442 C 136 410 62 369 62 273 C 62 158 174 97 299 97 C 365 97 400 107 448 115 Z
		T 553 M 42 106 L 511 106 L 511 181 L 321 181 L 321 748 L 232 748 L 232 181 L 42 181 Z
		U 553 M 141 106 L 141 532 C 141 640 186 684 277 684 C 373 684 413 621 413 532 L 413 106 L 500 106 L 500 532 C 500 665 417 757 275 757 C 146 757 54 705 54 532 L 54 106 Z
		V 553 M 101 106 L 278 666 L 458 106 L 551 106 L 333 748 L 215 748 L 2 106 Z
		W 553 M 105 106 L 137 662 L 172 547 L 245 323 L 306 323 L 425 662 L 428 564 L 453 106 L 531 106 L 488 748 L 374 748 L 295 521 L 273 447 L 249 526 L 176 748 L 66 748 L 22 106 Z
		X 553 M 130 106 L 277 348 L 424 106 L 524 106 L 328 416 L 541 748 L 431 748 L 275 488 L 118 748 L 9 748 L 223 420 L 26 106 Z
		Y 553 M 106 106 L 231 337 L 281 436 L 322 353 L 453 106 L 553 106 L 321 518 L 321 748 L 232 748 L 232 517 L 0 106 Z
		Z 553 M 64 106 L 492 106 L 492 175 L 164 667 L 498 667 L 498 748 L 55 748 L 55 682 L 385 185 L 64 185 Z
		[ 553 M 169 37 L 412 37 L 412 106 L 251 106 L 251 880 L 412 880 L 412 949 L 169 949 Z
		\\ 553 M 79 54 L 160 54 L 497 854 L 416 854 Z
		] 553 M 141 37 L 384 37 L 384 949 L 141 949 L 141 880 L 301 880 L 301 106 L 141 106 Z
		^ 553 M 239 106 L 309 106 L 498 420 L 412 420 L 271 174 L 137 420 L 60 420 Z
		_ 553 M 0 878 L 553 878 L 553 949 L 0 949 Z
		\` 553 M 86 54 L 209 54 L 328 173 L 242 173 Z
		a 553 M 107 277 C 156 260 212 246 279 246 C 409 246 472 307 472 406 L 472 748 L 395 748 L 394 682 C 363 710 312 757 224 757 C 119 757 65 701 65 616 C 65 517 146 459 271 459 L 386 459 L 386 412 C 386 367 358 319 274 319 C 228 319 176 326 107 355 Z M 274 524 C 209 524 156 548 156 613 C 156 659 186 686 236 686 C 283 686 342 653 386 611 L 386 524 Z
		b 553 M 79 54 L 164 54 L 164 246 L 160 337 C 202 278 257 246 330 246 C 440 246 500 342 500 488 C 500 679 389 754 256 754 C 184 754 126 738 79 719 Z M 164 664 C 195 674 225 685 265 685 C 380 685 413 590 413 495 C 413 414 391 321 314 321 C 254 321 218 359 164 423 Z
		c 553 M 462 353 C 425 334 385 320 330 320 C 246 320 167 381 167 506 C 167 629 236 682 331 682 C 393 682 431 665 462 651 L 462 730 C 420 746 374 755 319 755 C 192 755 78 695 78 508 C 78 350 177 248 328 248 C 390 248 424 257 462 271 Z
		d 553 M 386 54 L 472 54 L 472 748 L 395 748 L 393 654 C 357 704 308 757 223 757 C 105 757 53 646 53 508 C 53 395 108 249 295 249 C 338 249 360 255 386 261 Z M 386 340 C 358 329 334 320 293 320 C 202 320 141 368 141 508 C 141 622 176 684 240 684 C 295 684 343 628 386 569 Z
		e 553 M 147 529 C 147 622 195 686 312 686 C 368 686 419 677 469 665 L 469 735 C 415 748 371 757 295 757 C 131 757 57 659 57 504 C 57 321 179 246 281 246 C 495 246 504 444 493 529 Z M 406 463 C 409 402 384 314 278 314 C 206 314 154 370 147 463 Z
		f 553 M 516 133 C 480 126 448 119 399 119 C 333 119 285 152 285 236 L 285 327 L 501 327 L 501 398 L 285 398 L 285 748 L 198 748 L 198 398 L 39 398 L 39 327 L 198 327 L 198 243 C 198 113 271 48 400 48 C 450 48 478 53 516 60 Z
		g 553 M 513 255 L 513 325 L 434 325 C 446 341 463 369 463 413 C 463 522 377 586 271 586 C 228 586 200 579 169 563 C 159 579 147 593 147 616 C 147 645 181 660 210 661 L 355 666 C 442 669 511 715 511 789 C 511 890 419 954 268 954 C 149 954 46 921 46 826 C 46 768 81 736 114 712 C 96 705 65 678 65 631 C 65 591 84 561 116 524 C 89 492 76 463 76 418 C 76 318 153 246 269 246 C 300 246 317 250 334 255 Z M 269 522 C 335 522 376 474 376 416 C 376 365 343 310 269 310 C 227 310 163 338 163 416 C 163 500 233 522 269 522 M 191 735 C 168 751 137 773 137 817 C 137 876 213 886 276 886 C 381 886 419 845 419 799 C 419 754 373 742 321 740 Z
		h 553 M 79 54 L 164 54 L 164 254 L 161 333 C 197 291 241 246 321 246 C 423 246 475 314 475 420 L 475 748 L 390 748 L 390 432 C 390 370 369 320 306 320 C 237 320 195 392 164 420 L 164 748 L 79 748 Z
		i 553 M 276 183 C 239 183 209 153 209 116 C 209 79 239 49 276 49 C 313 49 343 79 343 116 C 343 153 313 183 276 183 M 101 255 L 333 255 L 333 677 L 480 677 L 480 748 L 85 748 L 85 677 L 247 677 L 247 326 L 101 326 Z
		j 553 M 361 183 C 324 183 294 153 294 116 C 294 79 324 49 361 49 C 398 49 428 79 428 116 C 428 153 398 183 361 183 M 85 255 L 413 255 L 413 737 C 413 891 316 954 199 954 C 151 954 106 946 65 929 L 65 848 C 120 874 171 882 205 882 C 288 882 326 821 326 749 L 326 326 L 85 326 Z
		k 553 M 89 54 L 175 54 L 175 480 L 397 255 L 509 255 L 278 482 L 522 748 L 405 748 L 175 484 L 175 748 L 89 748 Z
		l 553 M 101 54 L 333 54 L 333 677 L 480 677 L 480 748 L 85 748 L 85 677 L 247 677 L 247 124 L 101 124 Z
		m 553 M 110 255 L 113 349 C 138 295 164 246 223 246 C 281 246 303 286 304 353 C 343 263 375 246 417 246 C 471 246 509 287 509 382 L 509 748 L 430 748 L 430 391 C 430 361 432 317 399 317 C 371 317 351 360 315 432 L 315 748 L 237 748 L 237 393 C 237 343 231 317 206 317 C 186 317 166 337 123 431 L 123 748 L 44 748 L 44 255 Z
		n 553 M 155 255 L 158 335 C 205 282 244 246 320 246 C 428 246 475 317 475 416 L 475 748 L 390 748 L 390 429 C 390 364 365 320 304 320 C 267 320 236 332 164 421 L 164 748 L 79 748 L 79 255 Z
		o 553 M 281 246 C 464 246 508 388 508 497 C 508 659 410 757 272 757 C 112 757 45 645 45 503 C 45 359 128 246 281 246 M 277 319 C 211 319 133 360 133 501 C 133 639 202 685 277 685 C 373 685 420 607 420 501 C 420 407 384 319 277 319
		p 553 M 154 255 L 160 338 C 192 295 239 246 330 246 C 420 246 500 314 500 495 C 500 667 395 754 258 754 C 226 754 194 750 164 743 L 164 949 L 79 949 L 79 255 Z M 164 664 C 195 676 230 685 261 685 C 367 685 413 610 413 497 C 413 389 380 321 312 321 C 266 321 223 348 164 424 Z
		q 553 M 472 246 L 472 949 L 386 949 L 386 763 L 390 658 C 355 707 303 757 223 757 C 119 757 53 669 53 511 C 53 380 119 249 295 249 C 326 249 354 252 396 265 Z M 386 339 C 359 329 331 319 289 319 C 180 319 141 400 141 506 C 141 642 190 684 240 684 C 287 684 326 650 386 568 Z
		r 553 M 177 255 L 179 346 C 231 280 294 246 352 246 C 478 246 507 348 504 443 L 418 443 C 418 395 413 320 339 320 C 292 320 254 347 185 431 L 185 748 L 99 748 L 99 255 Z
		s 553 M 437 337 C 389 326 354 317 297 317 C 231 317 183 336 183 380 C 183 415 197 432 312 467 C 427 502 469 539 469 611 C 469 713 369 757 256 757 C 201 757 143 751 89 738 L 89 660 C 136 671 189 685 255 685 C 338 685 381 664 381 620 C 381 586 368 569 253 534 C 138 499 96 457 96 386 C 96 299 182 246 297 246 C 365 246 395 254 437 260 Z
		t 553 M 254 97 L 254 255 L 476 255 L 476 327 L 254 327 L 254 579 C 254 656 305 683 366 683 C 415 683 440 675 476 668 L 476 742 C 438 749 412 755 352 755 C 215 755 169 686 169 580 L 169 327 L 31 327 L 31 255 L 169 255 L 169 119 Z
		u 553 M 390 255 L 475 255 L 475 748 L 398 748 L 396 668 C 357 710 316 757 231 757 C 129 757 79 694 79 581 L 79 255 L 164 255 L 164 581 C 164 643 194 684 249 684 C 311 684 348 630 390 582 Z
		v 553 M 423 255 L 517 255 L 324 748 L 225 748 L 32 255 L 130 255 L 249 576 L 277 660 L 302 583 Z
		w 553 M 451 255 L 536 255 L 464 748 L 360 748 L 289 543 L 275 491 L 258 547 L 190 748 L 90 748 L 18 255 L 102 255 L 152 665 L 244 378 L 306 378 L 384 599 L 405 662 Z
		x 553 M 153 255 L 282 444 L 410 255 L 515 255 L 330 503 L 523 748 L 410 748 L 277 559 L 145 748 L 34 748 L 226 500 L 43 255 Z
		y 553 M 130 255 L 253 577 L 280 658 L 423 255 L 517 255 L 349 696 C 253 948 149 957 29 950 L 29 872 C 128 887 176 862 229 748 L 33 255 Z
		z 553 M 87 255 L 462 255 L 462 321 L 188 676 L 478 676 L 478 748 L 81 748 L 81 686 L 359 327 L 87 327 Z
		{ 553 M 441 106 L 404 106 C 355 106 298 130 298 211 L 298 339 C 298 390 275 454 194 465 C 273 471 299 533 299 595 L 299 772 C 299 845 342 880 406 880 L 441 880 L 441 949 L 397 949 C 256 949 217 863 217 772 L 217 594 C 217 534 183 499 108 499 L 80 499 L 80 431 L 108 431 C 183 431 217 405 217 336 L 217 211 C 217 69 310 37 404 37 L 441 37 Z
		| 553 M 236 0 L 317 0 L 317 949 L 236 949 Z
		} 553 M 112 37 L 149 37 C 243 37 336 70 336 211 L 336 337 C 336 393 370 431 445 431 L 474 431 L 474 499 L 445 499 C 370 499 336 525 336 594 L 336 772 C 336 863 297 949 156 949 L 112 949 L 112 880 L 147 880 C 208 880 255 849 255 772 L 255 594 C 255 541 274 476 359 465 C 274 457 255 390 255 339 L 255 212 C 255 134 200 106 149 106 L 112 106 Z
		~ 553 M 521 406 L 521 417 C 521 514 468 579 382 579 C 342 579 302 560 265 523 L 237 495 C 220 478 195 455 168 455 C 126 455 111 500 111 537 L 111 551 L 32 551 L 32 537 C 32 454 77 378 172 378 C 221 378 261 407 288 434 L 316 462 C 345 491 365 502 384 502 C 423 502 442 474 442 417 L 442 406 Z
	`;
	// `


	constructor(scale=17,lineheight=1.4) {
		this.defscale=scale;
		this.lineheight=lineheight;
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
		let special={"SPC":32};
		while (idx<len) {
			idx++;
			let chr=token(32);
			if (chr.length<=0) {continue;}
			chr=special[chr]??chr.charCodeAt(0);
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
				if (c===8) {
					// backspace
					throw "missing backspace";
				} else if (c===9) {
					// tab
					throw "missing tab";
				} else if (c===10) {
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


	setcolor(r,g,b,a) {
		// Accepts: int, [r,g,b,a], {r,g,b,a}
		if (g===undefined) {
			if (r instanceof Array) {
				a=r[3]??255;b=r[2]??255;g=r[1]??255;r=r[0]??255;
			} else if (r instanceof Object) {
				a=r.a??255;b=r.b??255;g=r.g??255;r=r.r??255;
			} else {
				a=(r>>>0)&255;b=(r>>>8)&255;g=(r>>>16)&255;r>>>=24;
			}
		}
		this.rgba[0]=r>0?(r<255?(r|0):255):0;
		this.rgba[1]=g>0?(g<255?(g|0):255):0;
		this.rgba[2]=b>0?(b<255?(b|0):255):0;
		this.rgba[3]=a>0?(a<255?(a|0):255):0;
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


	resetstate() {
		this.rgba32[0]=0xffffffff;
		this.deftrans.reset();
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
		mem.trans.set(this.deftrans);
		mem.poly=this.defpoly;
		mem.font=this.deffont;
	}


	loadstate() {
		if (this.stackidx<=0) {throw "loading null stack";}
		let mem=this.stack[--this.stackidx];
		this.img=mem.img;
		this.rgba32[0]=mem.rgba;
		this.deftrans.set(mem.trans);
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


	settransform(trans) {return this.deftrans.set(trans);}
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
		// Note << and imul() implicitly cast floor().
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
					dstdata[drow++]=src|((sa*amul0)<<ashift);
					continue;
				}
				if (sa<=0) {drow++;continue;}
				tmp=dstdata[drow];
				da=(tmp>>>ashift)&255;
				if (da===0) {
					dstdata[drow++]=src|((sa*amul0)<<ashift);
					continue;
				}
				// Approximate blending by expanding sa from [0,255] to [0,256].
				if (da===255) {
					sa*=amul1;
					da=amask;
				} else {
					sa*=amul;
					da=sa*255+da*(65025-sa);
					sa=(sa*65280+(da>>>1))/da;
					da=((da+32512)/65025)<<ashift;
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
		trans.set(this.deftrans).addoffset(x,y).mulscale(w,h);
		poly.begin();
		poly.addrect(0,0,1,1);
		this.fillpoly(poly,trans);
	}


	fillcircle(x,y,rad) {
		this.filloval(x,y,rad,rad);
	}


	filloval(x,y,xrad,yrad) {
		let poly=this.tmppoly,trans=this.tmptrans;
		trans.set(this.deftrans).addoffset(x,y).mulscale(xrad,yrad);
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
		trans.set(this.deftrans).addoffset(x,y).mulscale(scale,scale);
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				if (c===8) {
					// backspace
					throw "missing backspace";
				} else if (c===9) {
					// tab
					throw "missing tab";
				} else if (c===10) {
					// EOL
					trans.addoffset(-xpos,lh,true);
					xpos=0;
				} else if (c===13) {
					// linefeed
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
				amul:0,
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
		// Keep JS as simple as possible to be efficient. Keep micro optimization in WASM.
		// ~~x = fast floor(x)
		if (poly===undefined) {poly=this.defpoly;}
		trans=trans===undefined?this.deftrans:this.tmptrans.set(trans);
		const curvemaxdist2=0.01;
		let iw=this.img.width,ih=this.img.height;
		let alpha=this.rgba[3]/255.0;
		if (poly.vertidx<3 || iw<1 || ih<1 || alpha<1e-4) {return;}
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
		let lr=this.tmpline,lrcnt=lr.length,lcnt=0;
		let movex,movey;
		let p0x,p0y,p1x,p1y;
		let varr=poly.vertarr;
		let vidx=poly.vertidx;
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			if (v.type===poly.CURVE) {v=varr[i+2];}
			p0x=p1x; p1x=v.x*matxx+v.y*matxy+matx;
			p0y=p1y; p1y=v.x*matyx+v.y*matyy+maty;
			if (v.type===poly.MOVE) {movex=p1x;movey=p1y;continue;}
			// Add a basic line.
			if (lrcnt<=lcnt) {
				lr=this.fillresize(lcnt+1);
				lrcnt=lr.length;
			}
			let l=lr[lcnt++];
			l.x0=p0x;
			l.y0=p0y;
			l.x1=p1x;
			l.y1=p1y;
			if (v.type===poly.CURVE) {
				// Linear decomposition of curves.
				// Get the control points and check if the curve's on the screen.
				v=varr[i++]; let c1x=v.x*matxx+v.y*matxy+matx,c1y=v.x*matyx+v.y*matyy+maty;
				v=varr[i++]; let c2x=v.x*matxx+v.y*matxy+matx,c2y=v.x*matyx+v.y*matyy+maty;
				if ((p0x<=0 && p1x<=0 && c1x<=0 && c2x<=0) || (p0x>=iw && p1x>=iw && c1x>=iw && c2x>=iw) ||
				    (p0y<=0 && p1y<=0 && c1y<=0 && c2y<=0) || (p0y>=ih && p1y>=ih && c1y>=ih && c2y>=ih)) {
					continue;
				}
				l.amul=0;l.area=1;
				c2x=(c2x-c1x)*3;c1x=(c1x-p0x)*3;let c3x=p1x-p0x-c2x;c2x-=c1x;
				c2y=(c2y-c1y)*3;c1y=(c1y-p0y)*3;let c3y=p1y-p0y-c2y;c2y-=c1y;
				for (let j=lcnt-1;j<lcnt;j++) {
					// For each line segment between [u0,u1], sample the curve at 3 spots between
					// u0 and u1 and measure the distance to the line. If it's too great, split.
					//
					//    u        .25     .50       .75
					//                , - ~ ~ ~ - ,
					//            , '       |       ' ,
					//          ,   |       |        /
					//         ,    |       |       /
					//        ,     |       |      /
					//        ,     |       |     /
					// line   ------+-------+----+   clamped endpoint
					l=lr[j];
					let x0=l.x0,x1=l.x1,dx=x1-x0;
					let y0=l.y0,y1=l.y1,dy=y1-y0;
					let u0=l.amul,u1=l.area,du=(u1-u0)*0.25;
					let den=dx*dx+dy*dy;
					let maxdist=-Infinity,mu,mx,my;
					for (let s=0;s<3;s++) {
						// Project a point on the curve onto the line. Clamp to ends of line.
						u0+=du;
						let sx=p0x+u0*(c1x+u0*(c2x+u0*c3x)),lx=sx-x0;
						let sy=p0y+u0*(c1y+u0*(c2y+u0*c3y)),ly=sy-y0;
						let v=dx*lx+dy*ly;
						v=v>0?(v<den?v/den:1):0;
						lx-=dx*v;
						ly-=dy*v;
						let dist=lx*lx+ly*ly;
						if (maxdist<dist) {
							maxdist=dist;
							mu=u0;
							mx=sx;
							my=sy;
						}
					}
					if (maxdist>curvemaxdist2 && maxdist<Infinity) {
						// The line is too far from the curve, so split it.
						if (lrcnt<=lcnt) {
							lr=this.fillresize(lcnt+1);
							lrcnt=lr.length;
						}
						l.x1=mx;
						l.y1=my;
						l.area=mu;
						l=lr[lcnt++];
						l.x0=mx;
						l.y0=my;
						l.x1=x1;
						l.y1=y1;
						l.amul=mu;
						l.area=u1;
						j--;
					}
				}
			}
		}
		// Close the path.
		if (movex!==p1x || movey!==p1y) {
			if (lrcnt<=lcnt) {
				lr=this.fillresize(lcnt+1);
				lrcnt=lr.length;
			}
			let l=lr[lcnt++];
			l.x0=p1x;
			l.y0=p1y;
			l.x1=movex;
			l.y1=movey;
		}
		// Prune lines.
		minx=iw;maxx=0;miny=ih;maxy=0;
		let amul=(matxx<0)!==(matyy<0)?-alpha:alpha;
		let maxcnt=lcnt;
		lcnt=0;
		for (let i=0;i<maxcnt;i++) {
			let l=lr[i];
			// Always point the line up to simplify math.
			let x0=l.x0,x1=l.x1;
			let y0=l.y0,y1=l.y1;
			l.amul=amul;
			if (y0>y1) {
				l.x0=x1;l.x1=x0;x0=x1;x1=l.x1;
				l.y0=y1;l.y1=y0;y0=y1;y1=l.y1;
				l.amul=-amul;
			}
			let dx=x1-x0,dy=y1-y0;
			// Too thin or NaN.
			if (!(dx===dx) || !(dy>1e-9)) {continue;}
			// Clamp y to [0,imgheight), then clamp x so x<imgwidth.
			l.dxy=dx/dy;
			let dyx=Math.abs(dx)>1e-9?dy/dx:0;
			let y0x=x0-y0*l.dxy;
			let yhx=x0+(ih-y0)*l.dxy;
			let xwy=y0+(iw-x0)*dyx;
			if (y0<0 ) {y0=0 ;x0=y0x;}
			if (y1>ih) {y1=ih;x1=yhx;}
			if (y1-y0<1e-9) {continue;}
			if (x0>=iw && x1>=iw) {maxx=iw;continue;}
			if (x0>=iw) {x0=iw;y0=xwy;}
			if (x1>=iw) {x1=iw;y1=xwy;}
			// Calculate the bounding box.
			minx=Math.min(minx,Math.min(x0,x1));
			maxx=Math.max(maxx,Math.max(x0,x1));
			miny=miny<y0?miny:y0;
			maxy=maxy>y1?maxy:y1;
			let fy=~~y0;
			if (x1<x0) {x0=Math.max(l.x0+(fy+1-l.y0)*l.dxy,x1);}
			l.sort=fy*iw+(x0>0?~~x0:0);
			l.next=0;
			lr[i]=lr[lcnt];
			lr[lcnt++]=l;
		}
		// If all lines are outside the image, abort.
		if (minx>=iw || maxx<=0 || minx>=maxx || miny>=maxy || lcnt<=0) {
			return;
		}
		// Linear time heap construction.
		for (let p=(lcnt>>1)-1;p>=0;p--) {
			let i=p,j;
			let l=lr[p];
			while ((j=i+i+1)<lcnt) {
				if (j+1<lcnt && lr[j+1].sort<lr[j].sort) {j++;}
				if (lr[j].sort>=l.sort) {break;}
				lr[i]=lr[j];
				i=j;
			}
			lr[i]=l;
		}
		// Init blending.
		let ashift=this.rgbashift[3],amask=(255<<ashift)>>>0;
		let maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		let colrgb=(this.rgba32[0]|amask)>>>0;
		let coll=(colrgb&maskl)>>>0,colh=(colrgb&maskh)>>>0,colh8=colh>>>8;
		// Process the lines row by row.
		let x=lr[0].sort,y;
		let xnext=x,xrow=-1;
		let area,areadx1;
		let pixels=iw*ih;
		let imgdata=this.img.data32;
		while (true) {
			if (x>=xrow) {
				if (xnext>=pixels) {break;}
				x=xnext;
				y=~~(x/iw);
				xrow=(y+1)*iw;
				area=0;
				areadx1=0;
			}
			let areadx2=0;
			while (x>=xnext) {
				// fx0  fx0+1                          fx1  fx1+1
				//  +-----+-----+-----+-----+-----+-----+-----+
				//  |                              .....----  |
				//  |               .....-----'''''           |
				//  | ....-----'''''                          |
				//  +-----+-----+-----+-----+-----+-----+-----+
				//   first  dyx   dyx   dyx   dyx   dyx  last   tail
				let l=lr[0];
				if (x>=l.next) {
					let x0=l.x0,y0=l.y0-y;
					let x1=l.x1,y1=l.y1-y;
					let next=Infinity;
					let dxy=l.dxy,y0x=x0-y0*dxy;
					if (y0<0) {y0=0;x0=y0x;}
					if (y1>1) {y1=1;x1=y0x+dxy;next=x1;}
					if (x0>x1) {
						let tmp=x0;x0=x1;x1=tmp;dxy=-dxy;
						next-=dxy;next=next>l.x1?next:l.x1;
					}
					l.sort=next>=iw?pixels:(xrow+(next>0?~~next:0));
					let dyx=l.amul/dxy,dyh=dyx*0.5;
					let fx0=x-xrow+iw;
					let fx1=Math.floor(x1);
					x0-=fx0;
					x1-=fx0>fx1?fx0:fx1;
					let tmp=x1>0?-x1*x1*dyh:0;
					if (fx0>=fx1) {
						// Vertical line - avoid divisions.
						let dy=(y0-y1)*l.amul;
						tmp=x0>=0?(x0+x1)*dy*0.5:tmp;
						area+=dy-tmp;
					} else {
						if (fx1<iw) {
							l.area=dyh-x1*dyx-tmp;
							l.areadx1=dyx;
							l.areadx2=tmp;
							l.next=l.sort;
							l.sort=fx1+xrow-iw;
						}
						tmp=x0>0?x0*x0*dyh:0;
						area-=dyh-x0*dyx+tmp;
						areadx1-=dyx;
					}
					areadx2+=tmp;
				} else {
					area+=l.area;
					areadx1+=l.areadx1;
					areadx2+=l.areadx2;
					l.sort=l.next;
				}
				// Heap sort down.
				let i=0,j;
				while ((j=i+i+1)<lcnt) {
					if (j+1<lcnt && lr[j+1].sort<lr[j].sort) {j++;}
					if (lr[j].sort>=l.sort) {break;}
					lr[i]=lr[j];
					i=j;
				}
				lr[i]=l;
				xnext=lr[0].sort;
			}
			// Calculate how much we can draw or skip.
			const cutoff=0.00390625;
			let astop=area+areadx1+areadx2;
			let xstop=x+1,xdif=(xnext<xrow?xnext:xrow)-xstop;
			if (xdif>0 && (area>=cutoff)===(astop>=cutoff)) {
				let adif=(cutoff-astop)/areadx1+1;
				xdif=(adif>=1 && adif<xdif)?~~adif:xdif;
				astop+=xdif*areadx1;
				xstop+=xdif;
			}
			// Blend the pixel based on how much we're covering.
			if (area>=cutoff) {
				do {
					// a = sa + da*(1-sa)
					// c = (sc - dc)*sa/a + dc
					let sa=area<alpha?area:alpha;
					area+=areadx1+areadx2;
					areadx2=0;
					let dst=imgdata[x];
					let da=(dst>>>ashift)&255;
					if (da===255) {
						sa=256.49-sa*256;
					} else {
						let tmp=sa*255+(1-sa)*da;
						sa=256.49-sa*65280/tmp;
						da=tmp+0.49;
					}
					// imul() implicitly casts floor(sa).
					let col=(da<<ashift)
						|(((Math.imul((dst&0x00ff00ff)-coll,sa)>>>8)+coll)&maskl)
						|((Math.imul(((dst>>>8)&0x00ff00ff)-colh8,sa)+colh)&maskh);
					imgdata[x]=col;
				} while (++x<xstop);
			}
			x=xstop;
			area=astop;
		}
	}


	tracepoly(poly,rad,trans) {
		return this.fillpoly(poly.trace(rad),trans);
	}

}


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

