/*------------------------------------------------------------------------------


physics.js - v1.27

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


firefox on windows setTimeout() isn't running at 60fps.
Collision cells
	store in uint64 array
	top 32 bits = cell hash
	1 bit if infinite
	15 bits random
	16 bits atom id
add drawing.js
groups
	center
	set vel
	add vel
	add rotation
	rotate
	scale
	move
	copy

glow effect
starfish
limbs stick to things
blob, expands bonds towards you
bomb that deletes things
enemy that spins and sheds its outer lining
boss room, filled with objects, boss spins around and hits them
laser that heats up atoms and makes them vibrate


*/
/* jshint esversion: 6   */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


function PhyAssert(condition,data) {
	// To toggle debug, replace "\tPhyAssert" with "\t// PhyAssert".
	if (!condition) {
		console.log("assert failed:",data);
		throw new Error("Assert Failed");
	}
}


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
// Anti-aliased Image Drawing - v1.25


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
		var data=this.data;
		data[0]= data[ 9]*data[6];
		data[1]=-data[10]*data[7];
		data[2]= data[11];
		data[3]= data[10]*data[6];
		data[4]= data[ 9]*data[7];
		data[5]= data[12];
	}


	setangle(ang) {
		var data=this.data;
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
		var data=this.data;
		data[11]=x;
		data[12]=y;
		data[2]=data[11];
		data[5]=data[12];
		return this;
	}


	addoffset(x,y,apply) {
		if (y===undefined) {y=x[1];x=x[0];}
		var data=this.data;
		if (apply) {
			var w=x;
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
		var data=this.data,w=x;
		x=w*data[0]+y*data[1]+data[2];
		y=w*data[3]+y*data[4]+data[5];
		return [x,y];
	}


	undo(x,y) {
		// Applies the inverse transform to [x,y].
		if (y===undefined) {y=x[1];x=x[0];}
		var data=this.data,w=x;
		var det=data[0]*data[4]-data[1]*data[3];
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
		var minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
		var varr=this.vertarr,vidx=this.vertidx;
		for (var i=0;i<vidx;i++) {
			var x=varr[i].x,y=varr[i].y;
			if (minx>x) {minx=x;}
			if (miny>y) {miny=y;}
			if (maxx<x) {maxx=x;}
			if (maxy<y) {maxy=y;}
		}
		this.aabb={minx:minx,maxx:maxx,dx:maxx-minx,
		           miny:miny,maxy:maxy,dy:maxy-miny};
	}


	addvert(type,x,y) {
		var idx=this.vertidx++;
		var arr=this.vertarr;
		if (idx>=arr.length) {
			for (var len=8;len<=idx;len+=len) {}
			while (arr.length<len) {arr.push({type:-1,x:0,y:0,i:-1});}
		}
		var v=arr[idx];
		v.type=type;
		v.x=x;
		v.y=y;
		v.i=this.moveidx;
		var aabb=this.aabb;
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
		var move=this.moveidx;
		if (move<0) {return this;}
		if (move===this.vertidx-1) {
			this.vertidx--;
			return this;
		}
		var m=this.vertarr[move];
		m.i=this.vertidx;
		this.addvert(this.CLOSE,m.x,m.y);
		this.moveidx=-2;
		return this;
	}


	tostring(precision) {
		// Converts the path to an SVG string.
		var p=precision===undefined?10:precision;
		function tostring(x) {
			var s=x.toFixed(p);
			if (p>0) {
				var i=s.length;
				while (i>0 && s.charCodeAt(i-1)===48) {i--;}
				if (s.charCodeAt(i-1)===46) {i--;}
				s=s.substring(0,i);
			}
			return s;
		}
		var name=["M ","Z","L ","C "];
		var ret="";
		for (var i=0;i<this.vertidx;i++) {
			var v=this.vertarr[i],t=v.type;
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
		var type,j,len=str.length;
		var params=[2,0,2,6],v=[0,0,0,0,0,0];
		function isnum(c) {
			c=c.length!==undefined?c.charCodeAt(0):c;
			return c>42 && c<58 && c!==44 && c!==47;
		}
		for (var i=0;i<len;) {
			var c=str[i++];
			if (c==="M") {type=0;}
			else if (c==="Z") {type=1;}
			else if (c==="L") {type=2;}
			else if (c==="C") {type=3;}
			else if (isnum(c)) {type=2;i--;}
			else {continue;}
			for (var t=0;t<params[type];t++) {
				for (j=i;j<len && !isnum(str.charCodeAt(j));j++) {}
				for (i=j;i<len && isnum(str.charCodeAt(i));i++) {}
				v[t]=parseFloat(str.substring(j,i));
			}
			if (type===0) {this.moveto(v[0],v[1]);}
			else if (type===1) {this.close();}
			else if (type===2) {this.lineto(v[0],v[1]);}
			else {this.curveto(v[0],v[1],v[2],v[3],v[4],v[5]);}
		}
	}


	addstrip(points) {
		// Assumes a loop of [x0,y0,x1,y1,...] where every pair is a separate line.
		var len=points.length;
		if (len<=0 || (len%2)!==0) {return;}
		this.moveto(points[0],points[1]);
		for (var i=2;i<len;i+=2) {
			this.lineto(points[i],points[i+1]);
		}
		this.close();
		return this;
	}


	// addpoly(poly,transform) {
	// 	return this;
	// }


	addline(x0,y0,x1,y1,rad) {
		var dx=x1-x0,dy=y1-y0;
		var dist=dx*dx+dy*dy;
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
		var ax=a*dx,ay=a*dy;
		var bx=b*dx,cy=c*dy,c0=bx-cy,c3=bx+cy;
		var cx=c*dx,by=b*dy,c1=cx+by,c2=cx-by;
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
		var ax=-a*xrad,ay=a*yrad;
		var bx=-b*xrad,by=b*yrad;
		var cx=-c*xrad,cy=c*yrad;
		this.moveto(x,y+ay);
		this.curveto(x+bx,y+cy,x+cx,y+by,x+ax,y   );
		this.curveto(x+cx,y-by,x+bx,y-cy,x   ,y-ay);
		this.curveto(x-bx,y-cy,x-cx,y-by,x-ax,y   );
		this.curveto(x-cx,y+by,x-bx,y+cy,x   ,y+ay);
		return this;
	}

}


class _DrawImage {

	constructor(width,height) {
		var srcdata=null;
		if (height===undefined) {
			var img=width;
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


	fromtga(src) {
		// Load a TGA image from an array.
		var len=src.length;
		if (len<18) {
			throw "TGA too short";
		}
		var w=src[12]+(src[13]<<8);
		var h=src[14]+(src[15]<<8);
		var bits=src[16],bytes=bits>>>3;
		if (w*h*bytes+18!==len || src[2]!==2 || (bits!==24 && bits!==32)) {
			throw "TGA corrupt";
		}
		// Load the image data.
		this.resize(w,h);
		var dst=this.data8,didx=0,sidx=18;
		for (var y=0;y<h;y++) {
			for (var x=0;x<w;x++) {
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				if (bytes===3) {dst[didx++]=255;}
				else {dst[didx++]=src[sidx++];}
			}
		}
	}


	totga() {
		// Returns a Uint8Array with TGA image data.
		var w=this.width,h=this.height;
		if (w>0xffff || h>0xffff) {throw "Size too big: "+w+", "+h;}
		var didx=18,dst=new Uint8Array(w*h*4+didx);
		var sidx= 0,src=this.data8;
		dst.set([0,0,2,0,0,0,0,0,0,0,0,0,w&255,w>>>8,h&255,h>>>8,32,0],0,didx);
		for (var y=0;y<h;y++) {
			for (var x=0;x<w;x++) {
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
			}
		}
		return dst;
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


	constructor(defscale) {
		this.defscale=defscale===undefined?16:defscale;
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
		var idx=0,len=fontdef.length;
		function token(eol) {
			var c;
			while (idx<len && (c=fontdef.charCodeAt(idx))<=32 && c!==10) {idx++;}
			var i=idx;
			while (idx<len && fontdef.charCodeAt(idx)>eol) {idx++;}
			return fontdef.substring(i,idx);
		}
		token(10); idx++; // name
		token(10); idx++; // info
		var scale=parseFloat(token(10));
		while (idx<len) {
			idx++;
			var chr=token(32);
			if (chr.length<=0) {continue;}
			chr=chr==="SPC"?32:chr.charCodeAt(0);
			var g={};
			g.width=parseInt(token(32))/scale;
			g.poly=new Draw.Poly(token(10));
			var varr=g.poly.vertarr,vidx=g.poly.vertidx;
			for (var i=0;i<vidx;i++) {
				var v=varr[i];
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
		var len=str.length;
		var xpos=0,xmax=0;
		var ypos=0,lh=this.lineheight;
		var glyphs=this.glyphs;
		for (var i=0;i<len;i++) {
			var c=str.charCodeAt(i);
			var g=glyphs[c];
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


	constructor(width,height) {
		var con=this.constructor;
		Object.assign(this,con);
		// Image info
		this.img      =new con.Image(width,height);
		this.rgba     =new Uint8ClampedArray([0,1,2,3]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		this.rgbashift=[0,0,0,0];
		var col=this.rgba32[0];
		for (var i=0;i<32;i+=8) {this.rgbashift[(col>>>i)&255]=i;}
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
		if (g===undefined) {a=(r>>>0)&255;b=(r>>>8)&255;g=(r>>>16)&255;r>>>=24;}
		if (a===undefined) {a=255;}
		this.rgba[0]=r?Math.max(Math.min(Math.floor(r),255),0):0;
		this.rgba[1]=g?Math.max(Math.min(Math.floor(g),255),0):0;
		this.rgba[2]=b?Math.max(Math.min(Math.floor(b),255),0):0;
		this.rgba[3]=a?Math.max(Math.min(Math.floor(a),255),0):0;
	}


	rgbatoint(r,g,b,a) {
		// Convert an RGBA array to a int regardless of endianness.
		var tmp=this.rgba32[0];
		var rgba=this.rgba;
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
		var mem=this.stack[this.stackidx++];
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
		var mem=this.stack[--this.stackidx];
		this.img=mem.img;
		this.rgba32[0]=mem.rgba;
		this.deftrans.copy(mem.trans);
		this.defpoly=mem.poly;
		this.deffont=mem.font;
	}


	transformpoint(x,y) {
		var [ox,oy]=this.deftrans.apply(x,y);
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


	fill(r,g,b,a) {
		// Fills the current image with a solid color.
		// imgdata.fill(rgba) was ~25% slower during testing.
		if (r===undefined) {r=g=b=0;}
		if (a===undefined) {a=255;}
		var rgba=this.rgbatoint(r,g,b,a);
		var imgdata=this.img.data32;
		var i=this.img.width*this.img.height;
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
		var dst=this.img;
		dx=(dx===undefined)?0:(dx|0);
		dy=(dy===undefined)?0:(dy|0);
		dw=(dw===undefined || dw>src.width )?src.width :(dx|0);
		dh=(dh===undefined || dh>src.height)?src.height:(dh|0);
		var sx=0,sy=0;
		dw+=dx;
		if (dx<0) {sx=-dx;dx=0;}
		dw=(dw>dst.width?dst.width:dw)-dx;
		dh+=dy;
		if (dy<0) {sy=-dy;dy=0;}
		dh=(dh>dst.height?dst.height:dh)-dy;
		if (dw<=0 || dh<=0) {return;}
		var dstdata=dst.data32,drow=dy*dst.width+dx,dinc=dst.width-dw;
		var srcdata=src.data32,srow=sy*src.width+sx,sinc=src.width-dw;
		var ystop=drow+dst.width*dh,xstop=drow+dw;
		var amul=this.rgba[3],amul0=amul/255.0,amul1=amul*(256.0/65025.0);
		var filllim=amul0>0?255/amul0:Infinity;
		var ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,namask=(~amask)>>>0;
		var maskl=0x00ff00ff&namask,maskh=0xff00ff00&namask;
		var sa,da,l,h,tmp;
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
		var poly=this.tmppoly,trans=this.deftrans;
		poly.begin();
		poly.addline(x0,y0,x1,y1,this.linewidth*0.5);
		this.fillpoly(poly,trans);
	}


	fillrect(x,y,w,h) {
		var poly=this.tmppoly,trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(w,h);
		poly.begin();
		poly.addrect(0,0,1,1);
		this.fillpoly(poly,trans);
	}


	fillcircle(x,y,rad) {
		this.filloval(x,y,rad,rad);
	}


	filloval(x,y,xrad,yrad) {
		var poly=this.tmppoly,trans=this.tmptrans;
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
		var font=this.deffont,glyphs=font.glyphs;
		if (scale===undefined) {scale=font.defscale;}
		var len=str.length;
		var xpos=0,lh=font.lineheight;
		var trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(scale,scale);
		for (var i=0;i<len;i++) {
			var c=str.charCodeAt(i);
			var g=glyphs[c];
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
		var len=this.tmpline.length;
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
		var iw=this.img.width,ih=this.img.height,imgdata=this.img.data32;
		if (poly.vertidx<3 || iw<1 || ih<1) {return;}
		// Screenspace transformation.
		var vmulx=this.viewmulx,voffx=this.viewoffx;
		var vmuly=this.viewmuly,voffy=this.viewoffy;
		var matxx=trans.data[0]*vmulx,matxy=trans.data[1]*vmulx,matx=(trans.data[2]-voffx)*vmulx;
		var matyx=trans.data[3]*vmuly,matyy=trans.data[4]*vmuly,maty=(trans.data[5]-voffy)*vmuly;
		// Perform a quick AABB-OBB overlap test.
		// Define the transformed bounding box.
		var aabb=poly.aabb;
		var bndx=aabb.minx*matxx+aabb.miny*matxy+matx;
		var bndy=aabb.minx*matyx+aabb.miny*matyy+maty;
		var bnddx0=aabb.dx*matxx,bnddy0=aabb.dx*matyx;
		var bnddx1=aabb.dy*matxy,bnddy1=aabb.dy*matyy;
		// Test if the image AABB has a separating axis.
		var minx=bndx,maxx=bndx,miny=bndy,maxy=bndy;
		if (bnddx0<0) {minx+=bnddx0;} else {maxx+=bnddx0;}
		if (bnddy0<0) {miny+=bnddy0;} else {maxy+=bnddy0;}
		if (bnddx1<0) {minx+=bnddx1;} else {maxx+=bnddx1;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxx<=0 || iw<=minx || maxy<=0 || ih<=miny) {
			return;
		}
		// Test if the poly OBB has a separating axis.
		var cross=bnddx0*bnddy1-bnddy0*bnddx1;
		minx=cross<0?cross:0;maxx=cross-minx;maxy=-minx;miny=-maxx;
		if (bnddx0<0) {maxx-=ih*bnddx0;} else {minx-=ih*bnddx0;}
		if (bnddy0<0) {minx+=iw*bnddy0;} else {maxx+=iw*bnddy0;}
		if (bnddx1<0) {maxy-=ih*bnddx1;} else {miny-=ih*bnddx1;}
		if (bnddy1<0) {miny+=iw*bnddy1;} else {maxy+=iw*bnddy1;}
		var proj0=bndx*bnddy0-bndy*bnddx0;
		var proj1=bndx*bnddy1-bndy*bnddx1;
		if (maxx<=proj0 || proj0<=minx || maxy<=proj1 || proj1<=miny) {
			return;
		}
		// Loop through the path nodes.
		var l,i,j,tmp;
		var lr=this.tmpline,lrcnt=lr.length,lcnt=0;
		var splitlen=3;
		var x0,y0,x1,y1;
		var p0x,p0y,p1x,p1y;
		var dx,dy;
		var varr=poly.vertarr;
		for (i=0;i<poly.vertidx;i++) {
			var v=varr[i];
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
				v=varr[i++]; var c1x=v.x*matxx+v.y*matxy+matx,c1y=v.x*matyx+v.y*matyy+maty;
				v=varr[i++]; var c2x=v.x*matxx+v.y*matxy+matx,c2y=v.x*matyx+v.y*matyy+maty;
				var c3x=p1x,c3y=p1y;
				x0=Math.min(p0x,Math.min(c1x,Math.min(c2x,c3x)));
				x1=Math.max(p0x,Math.max(c1x,Math.max(c2x,c3x)));
				y0=Math.min(p0y,Math.min(c1y,Math.min(c2y,c3y)));
				y1=Math.max(p0y,Math.max(c1y,Math.max(c2y,c3y)));
				if (x0>=iw || y0>=ih || y1<=0) {lcnt--;continue;}
				if (x1<=0) {continue;}
				// Estimate bezier length.
				var dist;
				dx=c1x-p0x;dy=c1y-p0y;dist =Math.sqrt(dx*dx+dy*dy);
				dx=c2x-c1x;dy=c2y-c1y;dist+=Math.sqrt(dx*dx+dy*dy);
				dx=c3x-c2x;dy=c3y-c2y;dist+=Math.sqrt(dx*dx+dy*dy);
				dx=p0x-c3x;dy=p0y-c3y;dist+=Math.sqrt(dx*dx+dy*dy);
				var segs=Math.ceil(dist*0.5/splitlen);
				if (segs<=1) {continue;}
				lcnt--;
				if (lrcnt<=lcnt+segs) {
					lr=this.fillresize(lcnt+segs+1);
					lrcnt=lr.length;
				}
				// Segment the curve.
				c2x=(c2x-c1x)*3;c1x=(c1x-p0x)*3;c3x-=p0x+c2x;c2x-=c1x;
				c2y=(c2y-c1y)*3;c1y=(c1y-p0y)*3;c3y-=p0y+c2y;c2y-=c1y;
				var ppx=p0x,ppy=p0y,unorm=1.0/segs;
				for (var s=0;s<segs;s++) {
					var u=(s+1)*unorm;
					var cpx=p0x+u*(c1x+u*(c2x+u*c3x));
					var cpy=p0y+u*(c1y+u*(c2y+u*c3y));
					l=lr[lcnt++];
					l.x0=ppx;
					l.y0=ppy;
					l.x1=cpx;
					l.y1=cpy;
					ppx=cpx;
					ppy=cpy;
				}
			}
		}
		// Prune lines.
		minx=iw;maxx=0;miny=ih;maxy=0;
		var amul=this.rgba[3]*(256.0/255.0);
		if ((matxx<0)!==(matyy<0)) {amul=-amul;}
		var y0x,y1x;
		var maxcnt=lcnt;
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
			var yhx=x0+(ih-y0)*l.dxy;
			var xwy=y0+(iw-x0)*l.dyx;
			if (y0<0 ) {y0=0 ;x0=y0x;}
			if (y0>ih) {y0=ih;x0=yhx;}
			if (y1<0 ) {y1=0 ;x1=y0x;}
			if (y1>ih) {y1=ih;x1=yhx;}
			if (Math.abs(y1-y0)<1e-20) {continue;}
			if (x0>=iw && x1>=iw) {maxx=iw;continue;}
			var fx=y0<y1?x0:x1;
			if (x0>=iw) {x0=iw;y0=xwy;}
			if (x1>=iw) {x1=iw;y1=xwy;}
			// Calculate the bounding box.
			l.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
			var fy=Math.floor(Math.min(y0,y1));
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
		for (var p=(lcnt>>1)-1;p>=0;p--) {
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
		var ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,imask=1.0/amask;
		var maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		var sa,da;
		var colrgb=(this.rgba32[0]&~amask)>>>0;
		var coll=(colrgb&0x00ff00ff)>>>0,colh=(colrgb&0xff00ff00)>>>0,colh8=colh>>>8;
		var filllim=255;
		// Process the lines row by row.
		var x=lr[0].sort,y;
		var xnext=x,xrow=-1;
		var area,areadx1,areadx2;
		var pixels=iw*ih;
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
					var dyx=l.dyx,dxy=l.dxy;
					y0x=x0-y0*dxy;
					y1x=y0x+dxy;
					if (y0<0) {y0=0;x0=y0x;}
					if (y0>1) {y0=1;x0=y1x;}
					if (y1<0) {y1=0;x1=y0x;}
					if (y1>1) {y1=1;x1=y1x;}
					var next=Math.floor((y0>y1?x0:x1)+(dxy<0?dxy:0));
					next=(next>l.minx?next:l.minx)+xrow;
					if (next>=l.maxy) {next=pixels;}
					if (x1<x0) {tmp=x0;x0=x1;x1=tmp;dyx=-dyx;}
					var fx0=Math.floor(x0);
					var fx1=Math.floor(x1);
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
						var mul=dyx*0.5,n0=x0-1,n1=x1-1;
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
			var xdraw=x+1;
			var sa1=Math.floor(area+0.5);
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
				var sab=area/256,sai=(1-sab)*imask;
				do {
					var dst=imgdata[x];
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
	var wasmstr=`
		H4sIAKQ3QGYC/71YS29bxxWe++BLfIi0Er6uSJ4ZSbZkI4YNGK6EIrCua7dygqYBii66oimKsnVFvSja
		sQshVFqjyLo7x0FL0hIMJAjQnQwURbpL/0FbdNH8BKProO535lLkleym6abU4545M/PNmfPmFbXdDUMI
		YRTCt81OR9w29vCHp8Cv0bltfCjMectqbN5PfICl2621zfba1StCnGStgmUwa4xZrcbu2i8awrTCIcuy
		QwZ+tw3DCFmGMMIXIx3D3d+34x3xrQ/B/4x45M9GMrzR2NhqPTRFplpl/Gq91mxW6+2t1q6w4ivLd4Zi
		hYcjligSv9No323Utpdruw0Riq6uNZvbW82Hwo5Xq8yv8oRlFKrVtc2VtVaj3q6u3tust9e2Nqvt2nKz
		YYhEtbqyu1W9W9tcaTYscwzDWrtWbWyuWFayWr3T3FquNX0cG2NfUn8cwl6N4g/DY7+thEwR/2c5HuuY
		e1bH3jM74b1Qx9gzOtE960Pc/NG+cMc9d3tHiVkzqgzCw1ZmU1mu2XYdPWOT8FTIveLNmkKF3XzT/Urw
		BIU8GaGQe4knZJRCFywhY2CQx9QYYwkZNxfNRQonoWCZSBhxzM97MklAdaMtvTIF3qymxkHlNZUGldZU
		hiLgyTMUp8i6+1exKSfIOJJvkHkk3wSofUMMPjI7InN8nLVIOZmnrCwQDoTkfI+op4rS0fBqUpYgXIgv
		VnatHyUF2H8Sniz5UjrD25XjNE4OxFEVSvdpjEpMZ/vdrsxRhioU61OK9DgLxPLNpMBjghLvAjMOqb30
		L/f394XWiRrdBBQlQDYVecqh3IKVJ4eyC1Yaj/yCFcWjsGAJLDIgD0O71g+B6fjKtF3TkzYVIEPRl04L
		Msm0hDRKYWZgETXlTw6UraZ5foayBwcH9OYqMPO44+B6em8F4yl/rNdKyvHaN/y1FcL48PBwqPOGvnOB
		FAH0xMTNocDaGQqU7UGYqT5Qcj7V/R1laWbAzZEcchUVemoa5+O8/JA7Q6oH0Wf6kKHSg6AVcLvd7uDI
		r6/1B1R08ekTJQeDF26d5FCq1R0WS34uS5AL3lKCcFRyzZ8EhGULUsnTRsQc7OR9my0rw1P7kGkqMFI9
		OUUzAYak6cBouidn6AyRJ0PHsl6j0vOn8iyUAVV3e/IcFFQgCWoWwpapIKEQKeHiIXfbI8lOEnLvelTR
		FJ2FpxieKj9nUfjnXJ+mun1S+MvDlv76Bx75s7N9msHMNP4KsLw/i6vKEJWojMiIQxNlTybY54BrU/gW
		mKyjhGu1j93YG2STkMdxZlP8x1Cd7etLr2WdR938/aMbaf15cQ3yfcIBNDRMncZG9K7j35cNhIhXGTk9
		CvKpETmDnKCy8qzFDhaBpMr284dKkc2PgnaTZRbHTzEqBiqqKThh/vGNP/zxL3/7x97f3165qRcRqyb/
		VI2xLmzEDBvi6fBEqgR2OCrNq7KBWxxqtWdXlOMopCDKvTpTdNR47/GNqeu/SfQ+/er79SQj5Ho0pm0g
		Ye4c6B5iOBVUj0OOIyu4puToCABjBpAxyqwqh+9QAcXPjJziXJFBKHE057rIuDby2/V9//PNS/E9S+jQ
		zFAM6Dg7o70CSJOOUgcB2dOPj4PMrTN4+jNZ5ABioAeyyO5xxaPiVdMHTHHehHpA5AlY5w6fqNQpiNRn
		0hlBOAxxySOTnCZQqHgkUxoqTecO/uvxemXxCAdm+rgLp7A89JIehlV3qOGDTyl1CF8fIv5AI1Z+L+eA
		eKyc/f2OnEPVQvhbbY/mrtOvyf7iERSG3AgLHB4iss9S+gCxOkPO0SFccZpSB3IaO5CzS3EEIgdSGRHS
		8VSCQ2kamsVRU8HcCeYUMwHDjxLLMjj1+svjj28oRr7PYBEqIV1xDkCRxMI51MvzFJEJDgLXaKOqGS2E
		Ia9itl5ZRs3gcqeXqzlw7OPBBZqjCz9ll52j8z9PGphL+Nfm+5ZRtDGVCALrJDBcdp6XRQaS+VNRNs2D
		Fip+1H350TeRHRlm3r+sHRV3o/clIbKNYCfCnYQW7Dp9/EyVpeN2pHh9jedgP/6BdGKJUzeVl5JhPKz3
		9MPcUAbsQGYziJILACLbR/xsXyaHIcrH4+ywnsBNAkWkcqqIVD5HT8K7TC4kEwMAEmSuyyI3K/nRcQVf
		aJp7ppCX5jkX1JJ+rGBMqhLIMMHIrvhpLOMTUS6GMeSGVFeNIbYyJxNEMA1lhq6PNFUhXg2ANP/La5T/
		tDEV3IisMhwe8JGB0fiK031dUCdGgZng8mHPmldUGVpOLDnoKaXmXOKuBpdHBeB4rXPCeQ1WeYRVZixn
		ifV8JDN6Mwc69sVO7YudTiwJsmgCxZ011pN8pINU0ZMxjQLX4daq7HbeScJ8BZqFtsZ7fZQQHNDtv9Jd
		CH8x1NpFi5kFaqWHBhBuMLTdiy+76IRnWduzKvUJ92ZOf2gTQA2Sm8OHCo0Ro3QX2avXAxLEiOmujROW
		PiM2AlaDKSxEzqTEVfN9PDILiHKbZUFX1F+wlvRgDDkPg3kqojZCDyaV32FF5FgROd1KnigH8zgKt+Ke
		A6Iv9SQXI1CL3PDCbO9rk37B2XBOp6fxXz2S57np9ruoW7rhR5aQ9qAT/z8knmDicN7jRFsYWmpZ2lrR
		/0tM+40hGjsb/nC878shwMnSO/F81H4Oet8XW4sH6HUp95QiR4r7KvhbfSBI5Qk3HSf8NX86ZnLIIfB1
		slHzYc8CAtHmb05wuTL6ziN4D5sux86R4oyPMuOXwAn3pXGLey1wzbbnJvA1QftFkmuq7dr8tYE3IFMj
		YQr4bJwmbp7aMWpGj9W2jX4t3ztu3t7uy5i16Pq1lybkJGcx7ooTLlzig3cHiS2hV+w8Z3dF7zkwytdb
		i/3vboyib4xBhYdfPv3ueyf9vZNxKrr5tt+k7Js0ua4mIVv0PnS1Q7TepLinKxMVW8Qzul5ReL2JNRT2
		/HHr9QqE+hC8HP0g41Hhl7R4Bl8T2B9JPEvv6y54DJz0R5oUHxv2Zm2jYWxExYnXHcaJNx1m4CWH9eor
		CXv4niEUfP8QDr6oiATfU0TOGGK8Wt1t1+rr1e0tMBstMR/bbm2t3Ks3WrtGAmS9sbvbWHlr+aGR+Nny
		vc32Pao3a5t3MpevXLx08dJbl+9p5uWLl/8NHvVGAtIRAAA=
	`;
	var gzipbytes=Uint8Array.from(atob(wasmstr),(c)=>c.codePointAt(0));
	var gzipstream=new Blob([gzipbytes]).stream();
	var decstream=gzipstream.pipeThrough(new DecompressionStream("gzip"));
	var decblob=await new Response(decstream).blob();
	var wasmbytes=new Uint8Array(await decblob.arrayBuffer());
	// Compile module.
	var module=new WebAssembly.Module(wasmbytes);
	if (!module) {
		console.log("could not load module");
		Draw.wasmloading=2;
		return;
	}
	// console.log("loading module");
	Draw.wasmmodule=module;
	// Set up class functions.
	Draw.prototype.wasmprinti64=function(h,l) {
		var s="Debug: "+((BigInt(h>>>0)<<32n)+BigInt(l>>>0))+"\n";
		console.log(s);
	};
	Draw.prototype.wasmprintf64=function(x) {
		var s="Debug: "+x;
		console.log(s);
	};
	Draw.prototype.wasmimage=function(img) {
		// console.log("setting image");
		var wasm=this.wasm,old=wasm.img;
		if (old!==null && !Object.is(old,img)) {
			// Generate a new copy for the old image.
			var width=old.width,height=old.height,copy=true;
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
		var wasm=this.wasm;
		var img=wasm.img;
		if (img!==null) {
			wasm.width=img.width;
			wasm.height=img.height;
		} else {
			wasm.width=0;
			wasm.height=0;
		}
		var align=15;
		var imglen=(12+wasm.width*wasm.height*4+align)&~align;
		var pathlen=(6*8+4+4+24*wasm.vertmax+align)&~align;
		var heaplen=(wasm.heaplen+align)&~align;
		var sumlen=heaplen+imglen+pathlen;
		if (bytes && sumlen<bytes) {sumlen=bytes;}
		var newlen=1;
		while (newlen<sumlen) {newlen+=newlen;}
		var pagebytes=65536;
		var wasmmem=wasm.instance.exports.memory;
		var pages=Math.ceil((newlen-wasmmem.buffer.byteLength)/pagebytes);
		if (pages>0) {wasmmem.grow(pages);}
		var memu32=new Uint32Array(wasmmem.buffer,heaplen);
		wasm.memu32=memu32;
		memu32[0]=wasmmem.buffer.byteLength;
		memu32[1]=wasm.width;
		memu32[2]=wasm.height;
		wasm.imgdata=null;
		if (img!==null) {
			// Rebind the image pixel buffer.
			var width=img.width;
			var height=img.height;
			if (width<1 || height<1) {
				width=1;
				height=1;
			}
			var pixels=width*height;
			var buf=wasmmem.buffer,off=heaplen+12;
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
		var dif=wasmmem.buffer.byteLength-wasm.tmpu32.byteOffset;
		wasm.vertmax=Math.floor((dif-(6*8+4+4))/24);
	};
	Draw.prototype.wasminit=function() {
		var con=this.constructor;
		var state=this;
		function wasmprinti64(h,l) {state.wasmprinti64(h,l);}
		function wasmprintf64(x)   {state.wasmprintf64(x);}
		function wasmresize(bytes) {state.wasmresize(bytes);}
		var imports={env:{wasmprinti64,wasmprintf64,wasmresize}};
		var inst=new WebAssembly.Instance(con.wasmmodule,imports);
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
		// Fills the current path.
		//
		// Preprocess the lines and curves. Reject anything with a NaN, too narrow, or
		// outside the image. Use a binary heap to dynamically sort lines.
		if (poly ===undefined) {poly =this.defpoly ;}
		if (trans===undefined) {trans=this.deftrans;}
		var iw=this.img.width,ih=this.img.height,imgdata=this.img.data32;
		if (poly.vertidx<3 || iw<1 || ih<1) {return;}
		// Screenspace transformation.
		var vmulx=this.viewmulx,voffx=this.viewoffx;
		var vmuly=this.viewmuly,voffy=this.viewoffy;
		var matxx=trans.data[0]*vmulx,matxy=trans.data[1]*vmulx,matx=(trans.data[2]-voffx)*vmulx;
		var matyx=trans.data[3]*vmuly,matyy=trans.data[4]*vmuly,maty=(trans.data[5]-voffy)*vmuly;
		// Perform a quick AABB-OBB overlap test.
		// Define the transformed bounding box.
		var aabb=poly.aabb;
		var bndx=aabb.minx*matxx+aabb.miny*matxy+matx;
		var bndy=aabb.minx*matyx+aabb.miny*matyy+maty;
		var bnddx0=aabb.dx*matxx,bnddy0=aabb.dx*matyx;
		var bnddx1=aabb.dy*matxy,bnddy1=aabb.dy*matyy;
		// Test if the image AABB has a separating axis.
		var minx=bndx,maxx=bndx,miny=bndy,maxy=bndy;
		if (bnddx0<0) {minx+=bnddx0;} else {maxx+=bnddx0;}
		if (bnddy0<0) {miny+=bnddy0;} else {maxy+=bnddy0;}
		if (bnddx1<0) {minx+=bnddx1;} else {maxx+=bnddx1;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxx<=0 || iw<=minx || maxy<=0 || ih<=miny) {
			return;
		}
		// Test if the poly OBB has a separating axis.
		var cross=bnddx0*bnddy1-bnddy0*bnddx1;
		minx=cross<0?cross:0;maxx=cross-minx;maxy=-minx;miny=-maxx;
		if (bnddx0<0) {maxx-=ih*bnddx0;} else {minx-=ih*bnddx0;}
		if (bnddy0<0) {minx+=iw*bnddy0;} else {maxx+=iw*bnddy0;}
		if (bnddx1<0) {maxy-=ih*bnddx1;} else {miny-=ih*bnddx1;}
		if (bnddy1<0) {miny+=iw*bnddy1;} else {maxy+=iw*bnddy1;}
		var proj0=bndx*bnddy0-bndy*bnddx0;
		var proj1=bndx*bnddy1-bndy*bnddx1;
		if (maxx<=proj0 || proj0<=minx || maxy<=proj1 || proj1<=miny) {
			return;
		}
		var wasm=this.wasm;
		if (wasm===undefined) {
			wasm=this.wasminit();
		}
		if (!Object.is(imgdata,wasm.imgdata) || iw!==wasm.width || ih!==wasm.height) {
			this.wasmimage(this.img);
		}
		var vidx=poly.vertidx,varr=poly.vertarr;
		if (vidx>wasm.vertmax) {
			wasm.vertmax=vidx;
			this.wasmresize(0);
		}
		var tmpf64=wasm.tmpf64;
		var tmpu32=wasm.tmpu32;
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
		var idx=7;
		for (var i=0;i<vidx;i++) {
			var v=varr[i];
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
// Vectors - v1.02


class PhyVec {
	static rnd=new Random();


	constructor(elem,nocopy) {
		if (elem===undefined) {
			this.elem=[];
		} else if (elem instanceof PhyVec) {
			this.elem=nocopy?elem.elem:elem.elem.slice();
		} else if (elem.length!==undefined) {
			this.elem=nocopy?elem:elem.slice();
		} else if (typeof(elem)==="number") {
			this.elem=Array(elem).fill(0.0);
		} else {
			console.log("unrecognized vector: ",elem);
			throw "unrecognized vector";
		}
	}


	tostring() {
		return "("+this.elem.join(", ")+")";
	}


	length() {
		return this.elem.length;
	}


	get(i) {
		// PhyAssert(i>=0 && i<this.elem.length);
		return this.elem[i];
	}


	set(i,val) {
		// Copies values into the vector.
		// Expects an array, vector, or i/val pair.
		var ue=this.elem,elems=ue.length;
		if (val===undefined) {
			if (i.elem!==undefined) {i=i.elem;}
			if (i.length!==undefined) {
				// PhyAssert(i.length===elems);
				for (var j=0;j<elems;j++) {ue[j]=i[j];}
			} else {
				ue.fill(i);
			}
		} else {
			// PhyAssert(i>=0 && i<elems);
			ue[i]=val;
		}
		return this;
	}


	copy() {
		return new PhyVec(this);
	}


	// ----------------------------------------
	// Algebra


	neg() {
		return new PhyVec(this.elem.map((x)=>-x),true);
	}


	iadd(v) {
		// u+=v
		var ue=this.elem,ve=v.elem,elems=ue.length;
		for (var i=0;i<elems;i++) {ue[i]+=ve[i];}
		return this;
	}


	add(v) {
		// u+v
		var ue=this.elem,ve=v.elem,elems=ue.length,re=new Array(elems);
		for (var i=0;i<elems;i++) {re[i]=ue[i]+ve[i];}
		return new PhyVec(re,true);
	}


	isub(v) {
		// u-=v
		var ue=this.elem,ve=v.elem,elems=ue.length;
		for (var i=0;i<elems;i++) {ue[i]-=ve[i];}
		return this;
	}


	sub(v) {
		// u-v
		var ue=this.elem,ve=v.elem,elems=ue.length,re=new Array(elems);
		for (var i=0;i<elems;i++) {re[i]=ue[i]-ve[i];}
		return new PhyVec(re,true);
	}


	imul(s) {
		// u*=s
		var ue=this.elem,elems=ue.length;
		for (var i=0;i<elems;i++) {ue[i]*=s;}
		return this;
	}


	mul(s) {
		// u*s
		var ue=this.elem,elems=ue.length,re=new Array(elems);
		for (var i=0;i<elems;i++) {re[i]=ue[i]*s;}
		return new PhyVec(re,true);
	}


	dot(v) {
		// u*v
		var ue=this.elem,ve=v.elem,elems=ue.length,dot=0;
		for (var i=0;i<elems;i++) {dot+=ue[i]*ve[i];}
		return dot;
	}


	// ----------------------------------------
	// Geometry


	dist(v) {
		// |u-v|
		var ue=this.elem,ve=v.elem,elems=ue.length,dist=0,dif;
		for (var i=0;i<elems;i++) {dif=ue[i]-ve[i];dist+=dif*dif;}
		return Math.sqrt(dist);
	}


	sqr() {
		// u*u
		var ue=this.elem,elems=ue.length,dot=0;
		for (var i=0;i<elems;i++) {dot+=ue[i]*ue[i];}
		return dot;
	}


	mag() {
		// sqrt(u*u)
		var ue=this.elem,elems=ue.length,dot=0;
		for (var i=0;i<elems;i++) {dot+=ue[i]*ue[i];}
		return Math.sqrt(dot);
	}


	randomize() {
		var ue=this.elem,elems=ue.length;
		var mag,i,x,rnd=PhyVec.rnd;
		do {
			mag=0;
			for (i=0;i<elems;i++) {
				x=rnd.getnorm();
				ue[i]=x;
				mag+=x*x;
			}
		} while (mag<1e-10);
		mag=1.0/Math.sqrt(mag);
		for (i=0;i<elems;i++) {
			ue[i]*=mag;
		}
		return this;
	}


	static random(dim) {
		return (new PhyVec(dim)).randomize();
	}


	normalize() {
		var ue=this.elem,elems=ue.length,mag=0,i,x;
		for (i=0;i<elems;i++) {
			x=ue[i];
			mag+=x*x;
		}
		if (mag<1e-10) {
			this.randomize();
		} else {
			mag=1.0/Math.sqrt(mag);
			for (i=0;i<elems;i++) {
				ue[i]*=mag;
			}
		}
		return this;
	}


	norm() {
		return (new PhyVec(this)).normalize();
	}

}


//---------------------------------------------------------------------------------
// Linked Lists


class PhyLink {

	constructor(obj) {
		this.prev=null;
		this.next=null;
		this.list=null;
		this.obj=obj||null;
		this.idx=null;
	}


	release() {
		this.remove();
	}


	add(list) {
		if (this.list!==list) {list.add(this);}
	}


	remove(clear) {
		if (this.list!==null) {this.list.remove(this,clear);}
	}

}


class PhyList {

	constructor(ptr) {
		this.head=null;
		this.tail=null;
		this.ptr=ptr||null;
		this.count=0;
	}


	release(clear) {
		var link=this.head,next;
		while (link!==null) {
			next=link.next;
			link.prev=null;
			link.next=null;
			link.list=null;
			if (clear) {link.obj=null;}
			link=next;
		}
		this.count=0;
	}


	add(link) {
		this.addafter(link,null);
	}


	addafter(link,prev) {
		// Inserts the link after prev.
		link.remove();
		var next;
		if (prev!==null) {
			next=prev.next;
			prev.next=link;
		} else {
			next=this.head;
			this.head=link;
		}
		link.prev=prev;
		link.next=next;
		link.list=this;
		if (next!==null) {
			next.prev=link;
		} else {
			this.tail=link;
		}
		this.count++;
	}


	addbefore(link,next) {
		// Inserts the link before next.
		link.remove();
		var prev;
		if (next!==null) {
			prev=next.prev;
			next.prev=link;
		} else {
			prev=this.tail;
			this.tail=link;
		}
		link.prev=prev;
		link.next=next;
		link.list=this;
		if (prev!==null) {
			prev.next=link;
		} else {
			this.head=link;
		}
		this.count++;
	}


	remove(link,clear) {
		if (link===null) {
			return;
		}
		// PhyAssert(link.list===this);
		// PhyAssert(this.count>0);
		var prev=link.prev;
		var next=link.next;
		if (prev!==null) {
			prev.next=next;
		} else {
			// PhyAssert(this.head===link);
			this.head=next;
		}
		if (next!==null) {
			next.prev=prev;
		} else {
			// PhyAssert(this.tail===link);
			this.tail=prev;
		}
		this.count--;
		// PhyAssert((this.count===0)===(this.head===null));
		// PhyAssert((this.head===null)===(this.tail===null));
		link.prev=null;
		link.next=null;
		link.list=null;
		if (clear) {link.obj=null;}
	}

}


//---------------------------------------------------------------------------------
// AtomTypes


class PhyAtomInteraction {

	constructor(a,b) {
		this.a=a;
		this.b=b;
		this.collide=0;
		this.pmul=0;
		this.vmul=0;
		this.vpmul=0;
		this.callback=null;
		this.updateconstants();
	}


	updateconstants() {
		var a=this.a,b=this.b;
		this.collide=a.collide && b.collide;
		this.pmul=(a.pmul+b.pmul)*0.5;
		this.vmul=a.vmul+b.vmul;
		this.vpmul=(a.vpmul+b.vpmul)*0.5;
	}


	static get(a,b) {
		if (a.type!==undefined) {a=a.type;}
		if (b.type!==undefined) {b=b.type;}
		return a.intarr[b.id];
	}

}


class PhyAtomType {

	constructor(world,id,damp,density,elasticity) {
		this.world=world;
		this.worldlink=new PhyLink(this);
		this.atomlist=new PhyList();
		this.id=id;
		this.damp=damp;
		this.density=density;
		this.pmul=1.0;
		this.vmul=elasticity;
		this.vpmul=1.0;
		this.bound=true;
		this.callback=null;
		this.dt0=0;
		this.dt1=0;
		this.dt2=0;
		this.gravity=null;
		this.intarr=[];
		this.collide=true;
		this.updateconstants();
	}


	release() {
		var id=this.id;
		var link=this.world.atomtypelist.head;
		while (link!==null) {
			link.obj.intarr[id]=null;
			link=link.next;
		}
		this.worldlink.remove();
		this.atomlist.clear();
	}


	updateconstants() {
		// We want to solve for dt0, dt1, dt2, and dt3 in our integration equations.
		//
		//      pos+=vel*dt2+accel*dt3
		//      vel =vel*dt0+accel*dt1
		//
		// ----------------------------------------
		//
		// It's easiest to ignore acceleration and solve for dt0 first. If we continuously
		// apply damping over time t to vel, we get
		//
		//      vel(t)=vel(0)*(1-damp)^t
		//
		// Applying dt0 every step gets us
		//
		//      vel(s)=vel(0)*dt0^s
		//
		// We define dt=t/steps, hence we want to find dt0 when s=t/dt.
		//
		//      vel(s)=vel(0)*dt0^(t/dt)
		//
		// Solving
		//
		//      vel(0)*dt0^(t/dt)=vel(0)*(1-damp)^t
		//      dt0^(t/dt)=(1-damp)^t
		//      ln(dt0^(t/dt))=ln((1-damp)^t)
		//      (t/dt)*ln(dt0)=t*ln(1-damp)
		//      dt0=e^(dt*ln(1-damp))
		//
		// ----------------------------------------
		//
		// To calculate dt1, integrate the derivative for the velocity
		//
		//      v'(t)=ln(1-damp)*v(t)+accel0
		//      v(0)=vel0
		//
		// We will have
		//
		//      d=1-damp
		//      v(t)=vel0*d^t+accel0*(d^t-1)/ln(d)
		//      v(t)=vel0*dt0+accel0*(dt0-1)/ln(d)
		//      dt1=(dt0-1)/ln(1-damp)
		//
		// ----------------------------------------
		//
		// To calculate dt2 and dt3, integrate the derivate for the position
		//
		//      p'(t)=v(t)
		//      p(0)=pos0
		//
		// We will have
		//
		//      d=1-damp
		//      p'(t)=vel0*d^t+accel0*(d^t-1)/ln(d)
		//      p(t)=pos0+vel0*(d^t-1)/ln(d)+accel0*((d^t-1)/ln(d)-t)/ln(d)
		//      p(t)=pos0+vel0*dt1+accel0*(dt1-t)/ln(d)
		//      dt2=dt1
		//      dt3=(dt1-dt)/ln(1-damp)
		//
		var dt=this.world.deltatime/this.world.steps;
		var damp=this.damp,idamp=1.0-damp,dt0,dt1,dt2;
		if (damp<=1e-10) {
			// Special case damping=0: just integrate.
			dt0=1.0;
			dt1=dt;
			dt2=dt*dt*0.5;
		} else if (idamp<=1e-10) {
			// Special case damping=1: all velocity=0.
			// If dt=0 then time isn't passing, so maintain velocity.
			dt0=(dt>=-1e-20 && dt<=1e-20)?1.0:0.0;
			dt1=0.0;
			dt2=0.0;
		} else {
			// Normal case.
			var lnd=Math.log(idamp);
			dt0=Math.exp(dt*lnd);
			dt1=(dt0-1.0)/lnd;
			dt2=(dt1-dt )/lnd;
		}
		this.dt0=dt0;
		this.dt1=dt1;
		this.dt2=dt2;
	}


	updateinteractions() {
		var intarr=this.intarr;
		for (var i=intarr.length-1;i>=0;i--) {
			intarr[i].updateconstants();
		}
	}


	static initinteraction(a,b) {
		var inter=new PhyAtomInteraction(a,b);
		while (a.intarr.length<=b.id) {a.intarr.push(null);}
		while (b.intarr.length<=a.id) {b.intarr.push(null);}
		a.intarr[b.id]=inter;
		b.intarr[a.id]=inter;
	}

}


//---------------------------------------------------------------------------------
// Atoms


class PhyAtom {

	constructor(pos,rad,type) {
		this.worldlink=new PhyLink(this);
		this.world=type.world;
		this.world.atomlist.add(this.worldlink);
		pos=new PhyVec(pos);
		this.pos=pos;
		this.vel=new PhyVec(pos.length());
		this.acc=new PhyVec(pos.length());
		this.rad=rad;
		this.bondlist=new PhyList();
		this.typelink=new PhyLink(this);
		this.type=type;
		type.atomlist.add(this.typelink);
		this.userdata=null;
		this.updateconstants();
	}


	release() {
		this.worldlink.remove();
		this.typelink.remove();
		var link;
		while ((link=this.bondlist.head)!==null) {
			link.release();
		}
	}


	updateconstants() {
		// Calculate the mass of the atom, where mass=volume*density.
		var dim=this.pos.length();
		var mass=this.type.density;
		if (dim>0) {
			var vol0=mass,rad=this.rad;
			var volmul=rad*rad*6.283185307;
			mass*=2.0*rad;
			for (var i=2;i<=dim;i++) {
				var vol1=vol0*volmul/i;
				vol0=mass;
				mass=vol1;
			}
		}
		this.mass=mass;
	}


	update() {
		// Move the particle and apply damping to the velocity.
		// acc+=gravity
		// pos+=vel*dt1+acc*dt2
		// vel =vel*dt0+acc*dt1
		/*var pe=this.pos.elem,ve=this.vel.elem;
		var dim=pe.length,type=this.type,v,a;
		var ae=this.acc.elem,ge=type.gravity;
		ge=(ge===null?this.world.gravity:ge).elem;
		var dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		for (var i=0;i<dim;i++) {
			v=ve[i];
			a=ae[i]+ge[i];
			pe[i]+=v*dt1+a*dt2;
			ve[i] =v*dt0+a*dt1;
			ae[i] =0;
		}*/
		var world=this.world;
		var bndmin=world.bndmin.elem;
		var bndmax=world.bndmax.elem;
		var pe=this.pos.elem,ve=this.vel.elem;
		var dim=pe.length,type=this.type;
		var bound=type.bound;
		var ae=this.acc.elem,ge=type.gravity;
		ge=(ge===null?this.world.gravity:ge).elem;
		var dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		var pos,vel,acc,rad=this.rad;
		for (var i=0;i<dim;i++) {
			pos=pe[i];
			vel=ve[i];
			acc=ae[i]+ge[i];
			pos+=vel*dt1+acc*dt2;
			vel =vel*dt0+acc*dt1;
			if (bound && pos<bndmin[i]+rad) {
				pos=bndmin[i]+rad;
				vel=vel<0?-vel:vel;
			}
			if (bound && pos>bndmax[i]-rad) {
				pos=bndmax[i]-rad;
				vel=vel>0?-vel:vel;
			}
			pe[i]=pos;
			ve[i]=vel;
			ae[i]=0;
		}
	}


	static collideatom(a,b,callback) {
		// Collides two atoms. Vector operations are unrolled to use constant memory.
		if (Object.is(a,b)) {
			return;
		}
		var apos=a.pos.elem,bpos=b.pos.elem;
		var dim=apos.length;
		// Determine if atoms are overlapping.
		var dist=0.0,dif,i,norm=a.world.tmpvec.elem;
		for (i=0;i<dim;i++) {
			dif=bpos[i]-apos[i];
			norm[i]=dif;
			dist+=dif*dif;
		}
		var rad=a.rad+b.rad;
		if (dist<rad*rad) {
			// If we have a callback, allow it to handle the collision.
			var intr=a.type.intarr[b.type.id];
			if (intr.collide===false) {return;}
			if (callback===undefined && intr.callback!==null) {
				if (intr.callback(a,b)) {PhyAtom.collideatom(a,b,true);}
				return;
			}
			var amass=a.mass,bmass=b.mass;
			var mass=amass+bmass;
			if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10 || dim===0) {
				return;
			}
			amass=amass>=Infinity?1.0:(amass/mass);
			bmass=bmass>=Infinity?1.0:(bmass/mass);
			// If the atoms are too close together, randomize the direction.
			if (dist>1e-10) {
				dist=Math.sqrt(dist);
				dif=1.0/dist;
			} else {
				dist=0;
				dif=1.0;
				a.world.tmpvec.randomize();
			}
			// Check the relative velocity. We can have situations where two atoms increase
			// eachother's velocity because they've been pushed past eachother.
			var avel=a.vel.elem,bvel=b.vel.elem;
			var veldif=0.0;
			for (i=0;i<dim;i++) {
				norm[i]*=dif;
				veldif-=(bvel[i]-avel[i])*norm[i];
			}
			if (veldif<0.0) {veldif=0.0;}
			var posdif=rad-dist;
			veldif=veldif*intr.vmul+posdif*intr.vpmul;
			posdif*=intr.pmul;
			// Push the atoms apart.
			var avelmul=veldif*bmass,bvelmul=veldif*amass;
			var aposmul=posdif*bmass,bposmul=posdif*amass;
			for (i=0;i<dim;i++) {
				dif=norm[i];
				apos[i]-=dif*aposmul;
				avel[i]-=dif*avelmul;
				bpos[i]+=dif*bposmul;
				bvel[i]+=dif*bvelmul;
			}
		}
	}

}


//---------------------------------------------------------------------------------
// Bonds


class PhyBond {

	constructor(world,a,b,dist,tension) {
		// PhyAssert(!Object.is(a,b));
		this.world=world;
		this.worldlink=new PhyLink(this);
		this.world.bondlist.add(this.worldlink);
		this.a=a;
		this.b=b;
		this.dist=dist;
		this.tension=tension;
		this.dttension=0.0;
		this.alink=new PhyLink(this);
		this.blink=new PhyLink(this);
		this.a.bondlist.add(this.alink);
		this.b.bondlist.add(this.blink);
		this.userdata=null;
		this.updateconstants();
	}


	release () {
		this.worldlink.remove();
		this.alink.remove();
		this.blink.remove();
	}


	updateconstants() {
		var dt=this.world.deltatime/this.world.steps;
		this.dttension=dt*this.tension;
		if (this.dttension>1.0) {this.dttension=1.0;}
		// dttension = tension ^ 1/dt
		/*if (dt<1e-10) {
			dttension=0.0;
		} else {
			dttension=pow(tension,1.0/dt);
		}*/
	}


	update() {
		// Pull two atoms toward eachother based on the distance and bond strength.
		// Vector operations are unrolled to use constant memory.
		var a=this.a,b=this.b;
		var amass=a.mass,bmass=b.mass;
		var mass=amass+bmass;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10) {
			return;
		}
		amass=amass>=Infinity?1.0:(amass/mass);
		bmass=bmass>=Infinity?1.0:(bmass/mass);
		// Get the distance and direction between the atoms.
		var apos=a.pos.elem,bpos=b.pos.elem;
		var dim=apos.length,i,dif;
		var norm=a.world.tmpvec.elem;
		var dist=0.0;
		for (i=0;i<dim;i++) {
			dif=bpos[i]-apos[i];
			norm[i]=dif;
			dist+=dif*dif;
		}
		// If the atoms are too close together, randomize the direction.
		if (dist>1e-10) {
			dist=Math.sqrt(dist);
			dif=1.0/dist;
		} else {
			dist=0;
			dif=1.0;
			a.world.tmpvec.randomize();
		}
		// Apply equal and opposite forces.
		var force=(this.dist-dist)*this.dttension*dif;
		var amul=force*bmass,bmul=force*amass;
		var avel=a.vel.elem,bvel=b.vel.elem;
		for (i=0;i<dim;i++) {
			dif=norm[i];
			apos[i]-=dif*amul;
			avel[i]-=dif*amul;
			bpos[i]+=dif*bmul;
			bvel[i]+=dif*bmul;
		}
	}

}


//---------------------------------------------------------------------------------
// Hashmap


class PhyCell {

	constructor() {
		this.dist=0;
		this.atom=null;
		this.hash=0;
		this.next=null;
	}

}


class PhyBroadphase {

	constructor(world) {
		this.world=world;
		this.slack=1.05;
		this.cellarr=[];
		this.celldim=0.05;
		this.cellmap=[];
		this.mapused=0;
		this.hash0=0;
	}


	release() {
		this.cellarr=[];
		this.cellmap=[];
	}


	getcell(point) {
		if (this.mapused===0) {return null;}
		var dim=this.world.dim,celldim=this.celldim;
		var hash=this.hash0,x;
		for (var d=0;d<dim;d++) {
			x=Math.floor(point[d]/celldim);
			hash=Random.hashu32(hash+x);
		}
		return this.cellmap[hash&(this.mapused-1)];
	}


	testcell(newcell,oldcell,point,d,off) {
		// Tests if the fast distance computation matches the actual distance.
		var world=this.world;
		var dim=world.dim,i;
		var coord=newcell.coord;
		if (coord===undefined) {
			coord=new Array(dim);
			newcell.coord=coord;
		}
		var hash=this.hash0;
		var celldim=this.celldim;
		if (oldcell!==null) {
			for (i=0;i<dim;i++) {coord[i]=oldcell.coord[i];}
			coord[d]+=off;
			for (i=0;i<=d;i++) {hash=Random.hashu32(hash+coord[i]);}
		} else {
			for (i=0;i<dim;i++) {coord[i]=Math.floor(point[i]/celldim);}
		}
		if (newcell.hash!==hash) {
			console.log("hash mismatch");
			throw "error";
		}
		var rad=newcell.atom.rad*this.slack;
		var dist=-rad*rad;
		for (i=0;i<dim;i++) {
			var x0=coord[i]*celldim;
			var x1=x0+celldim;
			var x=point[i];
			if (x<x0) {
				x-=x0;
				dist+=x*x;
			} else if (x>x1) {
				x-=x1;
				dist+=x*x;
			}
		}
		if (Math.abs(newcell.dist-dist)>1e-10) {
			console.log("dist drift");
			throw "error";
		}
	}


	build() {
		// Find all cells that an atom overlaps and add that atom to a linked list in the
		// cell.
		//
		// To find the cells that overlap a atom, first create a cell at the center of the
		// atom. Then expand along the X axis until we reach the edge. For each of these
		// cells, expand along the Y axis until we reach the edge. Continue for each
		// dimension.
		//
		//                                                                  +--+
		//                                                                  |  |
		//                                                               +--+--+--+
		//                                                               |  |  |  |
		//      +--+        +--+--+--+        +--+--+--+--+--+        +--+--+--+--+--+
		//      |  |   ->   |  |  |  |   ->   |  |  |  |  |  |   ->   |  |  |  |  |  |
		//      +--+        +--+--+--+        +--+--+--+--+--+        +--+--+--+--+--+
		//                                                               |  |  |  |
		//                                                               +--+--+--+
		//                                                                  |  |
		//                                                                  +--+
		//
		//    Start at      Expand along      Continue until we        Expand along Y
		//    center.       X axis.           reach the edge.          axis.
		//
		var i,j;
		var world=this.world;
		var dim=world.dim;
		var atomcount=world.atomlist.count;
		this.mapused=0;
		if (atomcount===0) {
			return;
		}
		// Put atoms with infinite mass at the front of the array. This will sort them at
		// the end of the grid's linked list and allow us to skip them during collision
		// testing. Randomize the order of the other atoms.
		var cellmap=this.cellmap;
		while (atomcount>cellmap.length) {
			cellmap=cellmap.concat(new Array(cellmap.length+1));
		}
		var rnd=world.rnd;
		var atomlink=world.atomlist.head;
		var inactive=0;
		var celldim=0.0;
		var atom;
		for (i=0;i<atomcount;i++) {
			atom=atomlink.obj;
			atomlink=atomlink.next;
			celldim+=atom.rad;
			if (atom.mass<Infinity) {
				j=inactive+(rnd.getu32()%(i-inactive+1));
				cellmap[i]=cellmap[j];
				cellmap[j]=atom;
			} else {
				cellmap[i]=cellmap[inactive];
				j=rnd.getu32()%(inactive+1);
				cellmap[inactive]=cellmap[j];
				cellmap[j]=atom;
				inactive++;
			}
		}
		// Use a heuristic to calculate celldim.
		var slack=this.slack;
		celldim*=2.5*slack/atomcount;
		var hash0=rnd.getu32();
		this.celldim=celldim;
		this.hash0=hash0;
		var invdim=1.0/celldim;
		var celldim2=2.0*celldim*celldim;
		var cellend=0;
		var cellarr=this.cellarr;
		var cellalloc=cellarr.length;
		var cellstart;
		var rad,cell,pos,radcells,d,c;
		var cen,cendif,neginit,posinit,incinit;
		var hash,hashcen,dist,distinc,newcell;
		var hashu32=Random.hashu32;
		var floor=Math.floor;
		for (i=0;i<atomcount;i++) {
			atom=cellmap[i];
			rad=atom.rad*slack;
			// Make sure we have enough cells.
			radcells=floor(rad*2*invdim+2.1);
			c=radcells;
			for (d=1;d<dim;d++) {c*=radcells;}
			while (cellend+c>cellalloc) {
				cellarr=cellarr.concat(new Array(cellalloc+1));
				for (j=0;j<=cellalloc;j++) {cellarr[cellalloc+j]=new PhyCell();}
				cellalloc=cellarr.length;
			}
			// Get the starting cell.
			cellstart=cellend;
			cell=cellarr[cellend++];
			cell.atom=atom;
			cell.dist=-rad*rad;
			cell.hash=hash0;
			pos=atom.pos.elem;
			// this.testcell(cell,null,pos,0,0);
			for (d=0;d<dim;d++) {
				// Precalculate constants for the cell-atom distance calculation.
				// floor(x) is needed so negative numbers round to -infinity.
				cen    =floor(pos[d]*invdim);
				cendif =cen*celldim-pos[d];
				neginit=cendif*cendif;
				incinit=(celldim+2*cendif)*celldim;
				posinit=incinit+neginit;
				for (c=cellend-1;c>=cellstart;c--) {
					// Using the starting cell's distance to pos, calculate the distance to the cells
					// above and below. The starting cell is at cen[d] = floor(pos[d]/celldim).
					cell=cellarr[c];
					hashcen=cell.hash+cen;
					cell.hash=hashu32(hashcen);
					// Check the cells below the center.
					hash=hashcen;
					dist=cell.dist+neginit;
					distinc=-incinit;
					while (dist<0) {
						newcell=cellarr[cellend++];
						newcell.atom=atom;
						newcell.dist=dist;
						newcell.hash=hashu32(--hash);
						// this.testcell(newcell,cell,pos,d,hash-hashcen);
						distinc+=celldim2;
						dist+=distinc;
					}
					// Check the cells above the center.
					hash=hashcen;
					dist=cell.dist+posinit;
					distinc=incinit;
					while (dist<0) {
						newcell=cellarr[cellend++];
						newcell.atom=atom;
						newcell.dist=dist;
						newcell.hash=hashu32(++hash);
						// this.testcell(newcell,cell,pos,d,hash-hashcen);
						distinc+=celldim2;
						dist+=distinc;
					}
				}
			}
		}
		// Hash cell coordinates and add to the map.
		var cellmask=cellend;
		cellmask|=cellmask>>>16;
		cellmask|=cellmask>>>8;
		cellmask|=cellmask>>>4;
		cellmask|=cellmask>>>2;
		cellmask|=cellmask>>>1;
		var mapused=cellmask+1;
		if (mapused>cellmap.length) {
			cellmap=new Array(mapused);
		}
		for (i=0;i<mapused;i++) {
			cellmap[i]=null;
		}
		for (i=0;i<cellend;i++) {
			cell=cellarr[i];
			hash=cell.hash&cellmask;
			cell.next=cellmap[hash];
			cellmap[hash]=cell;
		}
		this.cellarr=cellarr;
		this.cellmap=cellmap;
		this.mapused=mapused;
	}


	collide() {
		// Look at each grid cell. Check for collisions among atoms within that cell.
		var mapused=this.mapused;
		var cellmap=this.cellmap;
		var al,bl,a,collide=PhyAtom.collideatom;
		for (var c=0;c<mapused;c++) {
			al=cellmap[c];
			while (al!==null) {
				// Once we encounter a atom with infinite mass, we know that the rest of the
				// atoms will also have infinite mass.
				a=al.atom;
				if (a.mass>=Infinity) {break;}
				al=al.next;
				bl=al;
				while (bl!==null) {
					collide(a,bl.atom);
					bl=bl.next;
				}
			}
		}
	}

}


//---------------------------------------------------------------------------------
// World


class PhyWorld {

	constructor(dim) {
		this.updateflag=true;
		this.dim=dim;
		this.steps=8;
		this.deltatime=1.0/60.0;
		this.rnd=new Random();
		this.gravity=new PhyVec(dim);
		this.gravity.set(dim-1,0.24);
		this.bndmin=new PhyVec(dim).set(-Infinity);
		this.bndmax=new PhyVec(dim).set( Infinity);
		this.atomtypelist=new PhyList();
		this.atomlist=new PhyList();
		this.bondlist=new PhyList();
		this.tmpmem=[];
		this.tmpvec=new PhyVec(dim);
		this.broad=new PhyBroadphase(this);
		this.dbgtime=[0,0,0,0,0];
	}


	release() {
		this.atomlist.release();
		this.atomtypelist.release();
		this.bondlist.release();
		this.broad.release();
	}


	gettmpmem(size) {
		// Use a common pool of temporary memory to avoid constant allocations.
		var tmp=this.tmpmem;
		while (tmp.length<size) {
			tmp=tmp.concat(Array(tmp.length+1));
			this.tmpmem=tmp;
		}
		return tmp;
	}


	updateconstants() {
		this.updateflag=false;
	}


	createatomtype(damp,density,elasticity) {
		// Assume types are sorted from smallest to largest.
		// Find if there's any missing ID or add to the end.
		var link=this.atomtypelist.head;
		var id=0;
		while (link!==null) {
			var nextid=link.obj.id;
			if (id<nextid) {break;}
			id=nextid+1;
			link=link.next;
		}
		var type=new PhyAtomType(this,id,damp,density,elasticity);
		this.atomtypelist.addbefore(type.worldlink,link);
		link=this.atomtypelist.head;
		while (link!==null) {
			PhyAtomType.initinteraction(link.obj,type);
			link=link.next;
		}
		return type;
	}


	createatom(pos,rad,type) {
		return new PhyAtom(pos,rad,type);
	}


	findbond(a,b) {
		// Return any bond that exists between A and B.
		if (a.bondlist.count>b.bondlist.count) {
			var tmp=a;
			a=b;
			b=tmp;
		}
		var link=a.bondlist.head;
		while (link!==null) {
			var bond=link.obj;
			if (Object.is(bond.a,a)) {
				if (Object.is(bond.b,b)) {
					return bond;
				}
			} else if (Object.is(bond.a,b)) {
				// PhyAssert(Object.is(bond.b,a));
				return bond;
			}
			link=link.next;
		}
		return null;
	}


	createbond(a,b,dist,tension) {
		// Create a bond. If a bond between A and B already exists, replace it.
		// If dist<0, use the current distance between the atoms.
		if (dist<0.0) {
			dist=a.pos.dist(b.pos);
		}
		var bond=this.findbond(a,b);
		if (bond!==null) {
			bond.dist=dist;
			bond.tension=tension;
			bond.updateconstants();
		} else {
			bond=new PhyBond(this,a,b,dist,tension);
		}
		return bond;
	}


	autobond(atomarr,tension) {
		// Balance distance, mass, # of bonds, direction.
		var count=atomarr.length;
		if (count===0) {return;}
		var i,j;
		var infoarr=new Array(count);
		for (i=0;i<count;i++) {
			var info={
				atom:atomarr[i]
			};
			infoarr[i]=info;
		}
		for (i=0;i<count;i++) {
			var mainatom=infoarr[i].atom;
			var rad=mainatom.rad*5.1;
			for (j=0;j<count;j++) {
				var atom=infoarr[j].atom;
				if (Object.is(atom,mainatom)) {continue;}
				var dist=atom.pos.dist(mainatom.pos);
				if (dist<rad) {
					this.createbond(atom,mainatom,-1.0,tension);
				}
			}
		}
	}


	createbox(cen,side,rad,type) {
		if (cen.elem!==undefined) {cen=cen.elem;}
		var pos=new PhyVec(cen);
		var atomcombos=1;
		var i,x,dim=this.dim;
		for (i=0;i<dim;i++) {atomcombos*=side;}
		var atomarr=new Array(atomcombos);
		for (var atomcombo=0;atomcombo<atomcombos;atomcombo++) {
			// Find the coordinates of the atom.
			var atomtmp=atomcombo;
			for (i=0;i<dim;i++) {
				x=atomtmp%side;
				atomtmp=Math.floor(atomtmp/side);
				pos.set(i,cen[i]+(x*2-side+1)*rad);
			}
			atomarr[atomcombo]=this.createatom(pos,rad,type);
		}
		this.autobond(atomarr,Infinity);
	}


	update() {
		var next,link,steps=this.steps;
		var bondcount,bondarr;
		var rnd=this.rnd;
		var i,j;
		var dbgtime=this.dbgtime;
		for (var step=0;step<steps;step++) {
			if (this.updateflag) {
				this.updateconstants();
			}
			// Integrate atoms.
			var t0=performance.now();
			next=this.atomlist.head;
			while ((link=next)!==null) {
				next=next.next;
				link.obj.update();
			}
			// Integrate bonds. Randomizing the order minimizes oscillations.
			var t1=performance.now();
			bondcount=this.bondlist.count;
			bondarr=this.gettmpmem(bondcount);
			link=this.bondlist.head;
			for (i=0;i<bondcount;i++) {
				j=rnd.getu32()%(i+1);
				bondarr[i]=bondarr[j];
				bondarr[j]=link;
				link=link.next;
			}
			for (i=0;i<bondcount;i++) {
				bondarr[i].obj.update();
			}
			// Collide atoms.
			var t2=performance.now();
			this.broad.build();
			var t3=performance.now();
			this.broad.collide();
			var t4=performance.now();
			dbgtime[0]+=t1-t0;
			dbgtime[1]+=t2-t1;
			dbgtime[2]+=t3-t2;
			dbgtime[3]+=t4-t3;
			dbgtime[4]++;
		}
	}

}


//---------------------------------------------------------------------------------


function fastcircle(draw,x,y,rad) {
	// Manually draw a circle pixel by pixel.
	// This is ugly, but it's faster than canvas.arc and drawimage.
	var imgdata32=draw.img.data32;
	var imgwidth=draw.img.width;
	var imgheight=draw.img.height;
	rad-=0.5;
	if (rad<=0 || x-rad>imgwidth || x+rad<0 || y-rad>imgheight || y+rad<0) {
		return;
	}
	var colrgba=draw.rgba32[0];
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


class PhyScene {

	constructor(divid) {
		// Setup the canvas
		var drawwidth=600;
		var drawheight=1066;
		var canvas=document.getElementById(divid);
		canvas.width=drawwidth;
		canvas.height=drawheight;
		this.input=new Input(canvas);
		this.input.disablenav();
		this.mouse=new PhyVec(2);
		this.frames=0;
		this.frametime=0;
		this.fps=0;
		this.fpsstr="0 ms";
		this.promptshow=1;
		this.promptframe=0;
		// Setup the UI.
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.draw=new Draw(drawwidth,drawheight);
		// Reassigning the buffer data is faster for some reason.
		this.initworld();
		var state=this;
		function update() {
			setTimeout(update,1000/60);
			state.update();
		}
		update();
		/*var state=this;
		var statetime=0;
		var stateden=-1;
		function update(time) {
			requestAnimationFrame(update);
			if (++stateden>0) {
				var dif=time-statetime;
				if (dif+dif/stateden>=16) {
					statetime=time;
					stateden=0;
					console.log(dif);
					state.update(dif);
				}
			} else {
				statetime=time;
				state.update(1/60);
			}
		}
		requestAnimationFrame(update);*/
	}


	initworld() {
		this.world=new PhyWorld(2);
		var canvas=this.canvas;
		var world=this.world;
		world.steps=3;
		world.gravity.set([0,0.1]);
		var viewheight=1.0,viewwidth=canvas.width/canvas.height;
		var walltype=world.createatomtype(1.0,Infinity,1.0);
		var normtype=world.createatomtype(0.01,1.0,0.98);
		var boxtype=world.createatomtype(0.0,2.0,1.0);
		var rnd=new Random(2);
		var pos=new PhyVec(world.dim);
		for (var p=0;p<3000;p++) {
			pos.set(0,rnd.getf64()*viewwidth);
			pos.set(1,rnd.getf64()*viewheight);
			world.createatom(pos,0.004,normtype);
		}
		world.createbox([0.3*viewwidth,0.3],5,0.007,boxtype);
		world.createbox([0.5*viewwidth,0.5],5,0.007,boxtype);
		world.createbox([0.7*viewwidth,0.3],5,0.007,boxtype);
		world.bndmin=new PhyVec([0,0]);
		world.bndmax=new PhyVec([viewwidth,1]);
		var playertype=world.createatomtype(0.0,Infinity,0.1);
		playertype.bound=false;
		playertype.gravity=new PhyVec([0,0]);
		pos.set([viewwidth*0.5,viewheight*0.33]);
		this.playeratom=world.createatom(pos,0.035,playertype);
		this.mouse.set(pos);
		this.frametime=performance.now();
	}


	update() {
		var frametime=performance.now();
		var input=this.input;
		input.update();
		var draw=this.draw;
		var scale=this.draw.img.height;
		var world=this.world;
		world.update();
		draw.fill(0,0,0,255);
		// Convert mouse to world space.
		var mpos=input.getmousepos();
		var maxx=draw.img.width/draw.img.height;
		this.mouse.set(0,mpos[0]*maxx);
		this.mouse.set(1,mpos[1]);
		// Move the player.
		var player=this.playeratom;
		var dir=this.mouse.sub(player.pos);
		var mag=dir.sqr();
		if (mag<Infinity) {
			this.promptshow=0;
			if (mag>1e-6) {
				player.vel=dir.mul(0.2/world.deltatime);
			} else {
				player.vel.set(0);
			}
		}
		var link=world.atomlist.head;
		while (link!==null) {
			var atom=link.obj;
			var type=atom.type;
			var data=atom.userdata;
			if (data===undefined || data===null) {
				data={velcolor:0};
				atom.userdata=data;
			}
			var vel=atom.vel.mag();
			data.velcolor*=0.99;
			if (data.velcolor<vel) {
				data.velcolor=vel;
			}
			var pos=atom.pos.elem;
			var rad=atom.rad*scale+0.25;
			var r,g,b;
			if (type.id===2) {
				r=64;
				g=200;
				b=0;
			} else {
				var u=data.velcolor*(256*4);
				u=Math.floor(u<255?u:255);
				r=u;
				g=0;
				b=255-u;
			}
			draw.setcolor(r,g,b,255);
			fastcircle(draw,pos[0]*scale,pos[1]*scale,rad);
			//draw.filloval(pos[0]*scale,pos[1]*scale,rad,rad);
			var next=link.next;
			if (atom.delete!==undefined) {
				atom.release();
			}
			link=next;
		}
		if (this.promptshow!==0) {
			var pframe=(this.promptframe+1)%120;
			this.promptframe=pframe;
			var px=player.pos.get(0)*scale;
			var py=player.pos.get(1)*scale;
			var rad=player.rad*scale+0.25;
			var u=Math.floor((Math.sin((pframe/119.0)*Math.PI*2)+1.0)*0.5*255.0);
			draw.setcolor(u,u,255,255);
			draw.filloval(px,py,rad,rad);
		}
		// Draw the HUD
		draw.setcolor(255,255,255,255);
		draw.filltext(5,20,"FPS: "+this.fpsstr,20);
		draw.filltext(5,44,"Cnt: "+world.atomlist.count,20);
		// Calculate the frame time.
		this.frametime+=performance.now()-frametime;
		this.frames++;
		if (this.frames>=60) {
			this.fps=this.frametime/this.frames;
			this.frames=0;
			this.frametime=0;
			this.fpsstr=this.fps.toFixed(1)+" ms";
			var den=world.dbgtime[4];
			den=den>0?1/den:0;
			for (var i=0;i<4;i++) {
				this.fpsstr+=", "+(world.dbgtime[i]*den).toFixed(3);
			}
			world.dbgtime=[0,0,0,0,0];
		}
		this.ctx.putImageData(draw.img.imgdata,0,0);
	}

}


class PhyScene0 {

	constructor(divid) {
		// Swap the <div> with <canvas>
		var drawwidth=603;
		var drawheight=1072;
		var canvas=document.getElementById(divid);
		canvas.width=drawwidth;
		canvas.height=drawheight;
		this.input=new Input(canvas);
		this.input.disablenav();
		this.mouse=new PhyVec(2);
		this.frames=0;
		this.frametime=0;
		this.fps=0;
		this.promptshow=1;
		this.promptframe=0;
		// Setup the UI.
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.backbuf=this.ctx.createImageData(canvas.width,canvas.height);
		this.backbuf32=new Uint32Array(this.backbuf.data.buffer);
		this.initworld();
		var state=this;
		function update() {
			setTimeout(update,1000/60);
			state.update();
		}
		update();
	}


	initworld() {
		this.world=new PhyWorld(2);
		var canvas=this.canvas;
		var world=this.world;
		world.steps=3;
		world.gravity.set(0);
		var viewheight=1.0,viewwidth=canvas.width/canvas.height;
		var walltype=world.createatomtype(1.0,Infinity,1.0);
		var normtype=world.createatomtype(0.01,1.0,0.98);
		var boxtype1=world.createatomtype(0.0,50.0,1.0);
		var boxtype2=world.createatomtype(0.0,Infinity,1.0);
		var portaltype=world.createatomtype(0.0,Infinity,0.0);
		portaltype.pmul=0;
		var rnd=new Random(2);
		var pos=new PhyVec(world.dim);
		for (var p=0;p<3000;p++) {
			pos.set(0,rnd.getf64()*viewwidth);
			pos.set(1,rnd.getf64()*viewheight);
			world.createatom(pos,0.004,normtype);
		}
		world.createatom([viewwidth*0.5,0.1],0.1,portaltype);
		world.createbox([0.3*viewwidth,0.3],5,0.007,boxtype2);
		world.createbox([0.5*viewwidth,0.5],5,0.007,boxtype1);
		world.createbox([0.7*viewwidth,0.3],5,0.007,boxtype2);
		function reset(a,b) {
			if (a.type.id===1) {var tmp=a;a=b;b=tmp;}
			// a is the box
			b.pos.set([world.bndmax.elem[0]*0.5,world.bndmax.elem[1]*0.9]);
			b.vel.set(0);
			return 1;
		}
		function eat(a,b) {
			if (a.type.id===1) {var tmp=a;a=b;b=tmp;}
			// a is the box
			b.delete=true;
		}
		var intr=PhyAtomInteraction.get(boxtype1,normtype);
		intr.callback=reset;
		intr=PhyAtomInteraction.get(boxtype2,normtype);
		intr.callback=reset;
		intr=PhyAtomInteraction.get(portaltype,normtype);
		intr.callback=eat;
		world.bndmin=new PhyVec([0,0]);
		world.bndmax=new PhyVec([viewwidth,1]);
		var playertype=world.createatomtype(0.0,Infinity,0.1);
		playertype.bound=false;
		playertype.gravity=new PhyVec([0,0]);
		pos.set([viewwidth*0.5,viewheight*0.33]);
		this.playeratom=world.createatom(pos,0.035,playertype);
		this.mouse.set(pos);
		this.frametime=performance.now();
		console.log(world.atomlist.count);
	}


	update() {
		var frametime=performance.now();
		var input=this.input;
		input.update();
		var ctx=this.ctx;
		var canvas=this.canvas;
		var scale=canvas.height;
		var world=this.world;
		world.update();
		drawfill(this,0,0,0);
		// Convert mouse to world space.
		var mpos=input.getmousepos();
		var maxx=canvas.width/canvas.height;
		this.mouse.set(0,mpos[0]*maxx);
		this.mouse.set(1,mpos[1]);
		// Move the player.
		var player=this.playeratom;
		var dir=this.mouse.sub(player.pos);
		var mag=dir.sqr();
		if (mag<Infinity) {
			this.promptshow=0;
			if (mag>1e-6) {
				player.vel=dir.mul(0.2/world.deltatime);
			} else {
				player.vel.set(0);
			}
		}
		var link=world.atomlist.head;
		var count=0;
		while (link!==null) {
			var atom=link.obj;
			var type=atom.type;
			var data=atom.userdata;
			if (data===undefined || data===null) {
				data={velcolor:0};
				atom.userdata=data;
			}
			var vel=atom.vel.mag();
			data.velcolor*=0.99;
			if (data.velcolor<vel) {
				data.velcolor=vel;
			}
			var pos=atom.pos.elem;
			var rad=atom.rad*scale;
			var r,g,b;
			if (type.id===1) {
				count+=1;
			}
			if (type.id===2 || type.id===3) {
				r=64;
				g=200;
				b=0;
			} else {
				var u=data.velcolor*(256*4);
				u=Math.floor(u<255?u:255);
				r=u;
				g=0;
				b=255-u;
			}
			drawcircle(this,pos[0]*scale,pos[1]*scale,rad,r,g,b);
			var next=link.next;
			if (atom.delete!==undefined) {
				atom.release();
			}
			link=next;
		}
		if (this.promptshow!==0) {
			var pframe=(this.promptframe+1)%120;
			this.promptframe=pframe;
			var px=player.pos.get(0)*scale;
			var py=player.pos.get(1)*scale;
			var rad=player.rad*scale;
			var u=Math.floor((Math.sin((pframe/119.0)*Math.PI*2)+1.0)*0.5*255.0);
			drawcircle(this,px,py,rad,u,u,255);
		}
		ctx.putImageData(this.backbuf,0,0);
		// Draw the HUD
		ctx.font="16px monospace";
		ctx.fillStyle="rgba(255,255,255,255)";
		ctx.fillText("FPS: "+this.fps.toFixed(1)+" ms",5,20);
		ctx.fillText("Cnt: "+count,5,44);
		ctx.fillText("Win: "+window.innerWidth+" , "+window.innerHeight+" , "+window.devicePixelRatio,5,68);
		ctx.fillText("Scr: "+screen.width+" , "+screen.height,5,92);
		// Calculate the frame time.
		this.frametime+=performance.now()-frametime;
		this.frametime+=frametime;
		this.frames++;
		if (this.frames>=60) {
			this.fps=this.frametime/this.frames;
			this.frames=0;
			this.frametime=0;
		}
	}

}
