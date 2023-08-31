/*------------------------------------------------------------------------------


physics.js - v1.09

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


Look at per-frame performance. See if there are jumps>1/60.
fps counter
use an interaction matrix
add bonds


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
// Input - v1.08


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
		this.mousepos=[-Infinity,-Infinity];
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
		this.MOUSE=Input.MOUSE;
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
				var x=touch.pageX-focus.offsetLeft-focus.clientLeft;
				var y=touch.pageY-focus.offsetTop -focus.clientTop;
				if (x<0 || x>=focus.clientWidth || y<0 || y>=focus.clientHeight) {
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
			["touchstart" ,touchstart ,false],
			["touchmove"  ,touchmove  ,false],
			["touchend"   ,touchend   ,false],
			["touchcancel",touchcancel,false]
		]);
	}


	setmousepos(x,y) {
		var focus=this.focus;
		if (focus!==null) {
			x=(x-focus.offsetLeft-focus.clientLeft)/focus.clientWidth;
			y=(y-focus.offsetTop -focus.clientTop )/focus.clientHeight;
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
		this.KEY=Input.KEY;
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
// PRNG - v1.01


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
		var x=this.getf64(),xmb=Random.xmbarr,i=48;
		i+=x<xmb[i]?-24:24;
		i+=x<xmb[i]?-12:12;
		i+=x<xmb[i]?-6:6;
		i+=x<xmb[i]?-3:3;
		i+=x<xmb[i]?-3:0;
		return x*xmb[i+1]+xmb[i+2];
	}

}


//---------------------------------------------------------------------------------


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
		// PhyAssert(i>=0 && i<this.elem.length);
		this.elem[i]=val;
	}


	// ----------------------------------------
	// Algebra


	copy(v) {
		if (v!==undefined) {this.elem=v.elem.slice();}
		return this;
	}


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


	iscale(s) {
		// u*=s
		var ue=this.elem,elems=ue.length;
		for (var i=0;i<elems;i++) {ue[i]*=s;}
		return this;
	}


	scale(s) {
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

	constructor() {
		this.prev=null;
		this.next=null;
		this.list=null;
		this.obj=null;
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

	constructor() {
		this.head=null;
		this.tail=null;
		this.ptr=null;
		this.count=0;
	}


	release() {
		var link=this.head,next;
		while (link!==null) {
			next=link.next;
			link.prev=null;
			link.next=null;
			link.list=null;
			link.obj=null;
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
		link.prev=0;
		link.next=0;
		link.list=0;
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
		this.push=0;
		this.elasticity=0;
		// this.callBack=null;
		this.updateconstants();
	}


	updateconstants() {
		var a=this.a,b=this.b;
		this.collide=a.collide && b.collide;
		this.push=a.push*b.push;
		this.elasticity=a.elasticity+b.elasticity;
	}

}


class PhyAtomType {

	constructor(world,id,damp,density,elasticity) {
		this.world=world;
		this.worldlink=new PhyLink();
		this.worldlink.obj=this;
		this.atomlist=new PhyList();
		this.id=id;
		this.damp=damp;
		this.density=density;
		this.push=1.0;
		this.elasticity=elasticity;
		// this.callBack=null;
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


	updateInteractions() {
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
		this.worldlink=new PhyLink();
		this.worldlink.obj=this;
		this.world=type.world;
		this.world.atomlist.add(this.worldlink);
		this.pos=new PhyVec(pos);
		this.vel=new PhyVec(pos.length());
		this.acc=new PhyVec(pos.length());
		this.rad=rad;
		this.bondlist=new PhyList();
		this.typeLink=new PhyLink();
		this.typeLink.obj=this;
		this.type=type;
		type.atomlist.add(this.typeLink);
		this.userdata=null;
		this.updateconstants();
	}


	release() {
		this.worldlink.remove();
		this.typeLink.remove();
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
		var pe=this.pos.elem,ve=this.vel.elem;
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
		}
	}


	static collideAtom(a,b) {
		// Collides two atoms. Vector operations are unrolled to use constant memory.
		if (Object.is(a,b)) {
			return;
		}
		var aPos=a.pos.elem,bPos=b.pos.elem;
		var dim=aPos.length;
		// Determine if atoms are overlapping.
		var dist=0.0,dif,i,tmpVec=a.world.tmpVec.elem;
		for (i=0;i<dim;i++) {
			dif=bPos[i]-aPos[i];
			tmpVec[i]=dif;
			dist+=dif*dif;
		}
		var rad=a.rad+b.rad;
		if (dist<rad*rad) {
			// If we have a callBack, allow it to handle the collision.
			var intr=a.type.intarr[b.type.id];
			if (intr.collide===false) {// || (intr->callBack!==null && intr->callBack(a,b)==0)) {
				return;
			}
			var aMass=a.mass,bMass=b.mass;
			var mass=aMass+bMass;
			if ((aMass>=Infinity && bMass>=Infinity) || mass<=1e-10 || dim===0) {
				return;
			}
			aMass=aMass>=Infinity?1.0:(aMass/mass);
			bMass=bMass>=Infinity?1.0:(bMass/mass);
			// If the atoms are too close together, randomize the direction.
			if (dist>1e-10) {
				dist=Math.sqrt(dist);
				dif=1.0/dist;
			} else {
				dist=0;
				dif=1.0;
				a.world.tmpVec.randomize();
			}
			// Check the relative velocity. We can have situations where two atoms increase
			// eachother's velocity because they've been pushed past eachother.
			var aVel=a.vel.elem,bVel=b.vel.elem;
			var veldif=0.0;
			for (i=0;i<dim;i++) {
				tmpVec[i]*=dif;
				veldif-=(bVel[i]-aVel[i])*tmpVec[i];
			}
			veldif*=intr.elasticity;
			if (veldif<0.0) {veldif=0.0;}
			var aVelmul=veldif*bMass,bVelmul=veldif*aMass;
			// Push the atoms apart.
			var posdif=(rad-dist)*intr.push;
			var aPosmul=posdif*bMass,bPosmul=posdif*aMass;
			for (i=0;i<dim;i++) {
				dif=tmpVec[i];
				aPos[i]-=dif*aPosmul;
				aVel[i]-=dif*aVelmul;
				bPos[i]+=dif*bPosmul;
				bVel[i]+=dif*bVelmul;
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
		this.worldlink=new PhyLink();
		this.world.bondlist.add(this.worldlink);
		this.worldlink.obj=this;
		this.a=a;
		this.b=b;
		this.dist=dist;
		this.tension=tension;
		this.dtTension=0.0;
		this.aLink=new PhyLink();
		this.bLink=new PhyLink();
		this.a.bondlist.add(this.aLink);
		this.b.bondlist.add(this.bLink);
		this.aLink.obj=this;
		this.bLink.obj=this;
		this.userdata=null;
		this.updateconstants();
	}


	release () {
		this.worldlink.remove();
		this.aLink.remove();
		this.bLink.remove();
	}


	updateconstants() {
		var dt=this.world.deltatime/this.world.steps;
		this.dtTension=dt*this.tension;
		if (this.dtTension>1.0) {this.dtTension=1.0;}
		// dtTension = tension ^ 1/dt
		/*if (dt<1e-10) {
			dtTension=0.0;
		} else {
			dtTension=pow(tension,1.0/dt);
		}*/
	}


	update() {
		// Pull two atoms toward eachother based on the distance and bond strength.
		// Vector operations are unrolled to use constant memory.
		var a=this.a,b=this.b;
		var aMass=a.mass,bMass=b.mass;
		var mass=aMass+bMass;
		if ((aMass>=Infinity && bMass>=Infinity) || mass<=1e-10) {
			return;
		}
		aMass=aMass>=Infinity?1.0:(aMass/mass);
		bMass=bMass>=Infinity?1.0:(bMass/mass);
		// Get the distance and direction between the atoms.
		var aPos=a.pos.elem,bPos=b.pos.elem;
		var dim=aPos.length,i,dif;
		var tmpVec=a.world.tmpVec.elem;
		var dist=0.0;
		for (i=0;i<dim;i++) {
			dif=bPos[i]-aPos[i];
			tmpVec[i]=dif;
			dist+=dif*dif;
		}
		// If the atoms are too close together, randomize the direction.
		if (dist>1e-10) {
			dist=Math.sqrt(dist);
			dif=1.0/dist;
		} else {
			dist=0;
			dif=1.0;
			a.world.tmpVec.randomize();
		}
		// Apply equal and opposite forces.
		var force=(this.dist-dist)*this.dtTension*dif;
		var aMul=force*bMass,bMul=force*aMass;
		var aVel=a.vel.elem,bVel=b.vel.elem;
		for (i=0;i<dim;i++) {
			dif=tmpVec[i];
			aPos[i]-=dif*aMul;
			aVel[i]-=dif*aMul;
			bPos[i]+=dif*bMul;
			bVel[i]+=dif*bMul;
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
		this.cellArr=[];
		this.cellDim=0.05;
		this.cellMap=[];
		this.mapUsed=0;
		this.hash0=0;
	}


	release() {
		this.cellArr=[];
		this.cellMap=[];
	}


	getCell(point) {
		if (this.mapUsed===0) {return null;}
		var dim=this.world.dim,cellDim=this.cellDim;
		var hash=this.hash0,x;
		for (var d=0;d<dim;d++) {
			x=Math.floor(point[d]/cellDim);
			hash=Random.hashu32(hash+x);
		}
		return this.cellMap[hash&(this.mapUsed-1)];
	}


	testCell(newCell,oldcell,point,d,off) {
		// Tests if the fast distance computation matches the actual distance.
		var world=this.world;
		var dim=world.dim,i;
		var coord=newCell.coord;
		if (coord===undefined) {
			coord=new Array(dim);
			newCell.coord=coord;
		}
		var hash=this.hash0;
		var cellDim=this.cellDim;
		if (oldcell!==null) {
			for (i=0;i<dim;i++) {coord[i]=oldcell.coord[i];}
			coord[d]+=off;
			for (i=0;i<=d;i++) {hash=Random.hashu32(hash+coord[i]);}
		} else {
			for (i=0;i<dim;i++) {coord[i]=Math.floor(point[i]/cellDim);}
		}
		if (newCell.hash!==hash) {
			console.log("hash mismatch");
			throw "error";
		}
		var rad=newCell.atom.rad*this.slack;
		var dist=-rad*rad;
		for (i=0;i<dim;i++) {
			var x0=coord[i]*cellDim;
			var x1=x0+cellDim;
			var x=point[i];
			if (x<x0) {
				x-=x0;
				dist+=x*x;
			} else if (x>x1) {
				x-=x1;
				dist+=x*x;
			}
		}
		if (Math.abs(newCell.dist-dist)>1e-10) {
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
		var atomCount=world.atomlist.count;
		this.mapUsed=0;
		if (atomCount===0) {
			return;
		}
		// Put atoms with infinite mass at the front of the array. This will sort them at
		// the end of the grid's linked list and allow us to skip them during collision
		// testing. Randomize the order of the other atoms.
		var cellMap=this.cellMap;
		while (atomCount>cellMap.length) {
			cellMap=cellMap.concat(new Array(cellMap.length+1));
		}
		var rnd=world.rnd;
		var atomLink=world.atomlist.head;
		var inactive=0;
		var cellDim=0.0;
		var atom;
		for (i=0;i<atomCount;i++) {
			atom=atomLink.obj;
			atomLink=atomLink.next;
			cellDim+=atom.rad;
			if (atom.mass<Infinity) {
				j=inactive+(rnd.getu32()%(i-inactive+1));
				cellMap[i]=cellMap[j];
				cellMap[j]=atom;
			} else {
				cellMap[i]=cellMap[inactive];
				j=rnd.getu32()%(inactive+1);
				cellMap[inactive]=cellMap[j];
				cellMap[j]=atom;
				inactive++;
			}
		}
		// Use a heuristic to calculate cellDim.
		var slack=this.slack;
		cellDim*=2.5*slack/atomCount;
		var hash0=rnd.getu32();
		this.cellDim=cellDim;
		this.hash0=hash0;
		var invdim=1.0/cellDim;
		var cellDim2=2.0*cellDim*cellDim;
		var cellEnd=0;
		var cellArr=this.cellArr;
		var cellAlloc=cellArr.length;
		var cellStart;
		var rad,cell,pos,radcells,d,c;
		var cen,cendif,decinit,posinit,incinit;
		var hash,hashcen,dist,distinc,newCell;
		var hashu32=Random.hashu32;
		var floor=Math.floor;
		for (i=0;i<atomCount;i++) {
			atom=cellMap[i];
			rad=atom.rad*slack;
			// Make sure we have enough cells.
			radcells=floor(rad*2*invdim+2.1);
			c=radcells;
			for (d=1;d<dim;d++) {c*=radcells;}
			while (cellEnd+c>cellAlloc) {
				cellArr=cellArr.concat(new Array(cellAlloc+1));
				for (j=0;j<=cellAlloc;j++) {cellArr[cellAlloc+j]=new PhyCell();}
				cellAlloc=cellArr.length;
			}
			// Get the starting cell.
			cellStart=cellEnd;
			cell=cellArr[cellEnd++];
			cell.atom=atom;
			cell.dist=-rad*rad;
			cell.hash=hash0;
			pos=atom.pos.elem;
			// this.testCell(cell,null,pos,0,0);
			for (d=0;d<dim;d++) {
				// Precalculate constants for the cell-atom distance calculation.
				// floor(x) is needed so negative numbers round to -infinity.
				cen    =floor(pos[d]*invdim);
				cendif =cen*cellDim-pos[d];
				decinit=cendif*cendif;
				incinit=(cellDim+2*cendif)*cellDim;
				posinit=incinit+decinit;
				for (c=cellEnd-1;c>=cellStart;c--) {
					// Using the starting cell's distance to pos, calculate the distance to the cells
					// above and below. The starting cell is at cen[d] = floor(pos[d]/cellDim).
					cell=cellArr[c];
					hashcen=cell.hash+cen;
					cell.hash=hashu32(hashcen);
					// Check the cells below the center.
					hash=hashcen;
					dist=cell.dist+decinit;
					distinc=-incinit;
					while (dist<0) {
						newCell=cellArr[cellEnd++];
						newCell.atom=atom;
						newCell.dist=dist;
						newCell.hash=hashu32(--hash);
						// this.testCell(newCell,cell,pos,d,hash-hashcen);
						distinc+=cellDim2;
						dist+=distinc;
					}
					// Check the cells above the center.
					hash=hashcen;
					dist=cell.dist+posinit;
					distinc=incinit;
					while (dist<0) {
						newCell=cellArr[cellEnd++];
						newCell.atom=atom;
						newCell.dist=dist;
						newCell.hash=hashu32(++hash);
						// this.testCell(newCell,cell,pos,d,hash-hashcen);
						distinc+=cellDim2;
						dist+=distinc;
					}
				}
			}
		}
		// Hash cell coordinates and add to the map.
		var cellmask=cellEnd;
		var mapUsed=cellmask+1;
		while (cellmask&mapUsed) {
			cellmask|=mapUsed;
			mapUsed=cellmask+1;
		}
		if (mapUsed>cellMap.length) {
			cellMap=new Array(mapUsed);
		}
		for (i=0;i<mapUsed;i++) {
			cellMap[i]=null;
		}
		for (i=0;i<cellEnd;i++) {
			cell=cellArr[i];
			hash=cell.hash&cellmask;
			cell.next=cellMap[hash];
			cellMap[hash]=cell;
		}
		this.cellArr=cellArr;
		this.cellMap=cellMap;
		this.mapUsed=mapUsed;
	}


	collide() {
		// Look at each grid cell. Check for collisions among atoms within that cell.
		var mapUsed=this.mapUsed;
		var cellMap=this.cellMap;
		var a,b,next,atom,collide=PhyAtom.collideAtom;
		for (var i=0;i<mapUsed;i++) {
			a=cellMap[i];
			while (a!==null) {
				atom=a.atom;
				// Once we encounter a atom with infinite mass, we know that the rest of the
				// atoms will also have infinite mass.
				if (atom.mass>=Infinity) {
					break;
				}
				next=a.next;
				b=next;
				while (b!==null) {
					collide(atom,b.atom);
					b=b.next;
				}
				a=next;
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
		this.atomtypelist=new PhyList();
		this.atomlist=new PhyList();
		this.bondlist=new PhyList();
		this.tmpmem=[];
		this.tmpVec=new PhyVec(dim);
		this.broad=new PhyBroadphase(this);
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


	autobond(atomarr,start,count,tension) {
		// Balance distance, mass, # of bonds, direction.
		if (count===0) {
			return;
		}
		var infoarr=new Array(count);
		for (var i=0;i<count;i++) {
			var info={
				atom: atomarr[start+i]
			};
			infoarr[i]=info;
		}
		for (var i=0;i<count;i++) {
			var mainatom=infoarr[i].atom;
			var rad=mainatom.rad*5.1;
			for (var j=0;j<count;j++) {
				var atom=infoarr[j].atom;
				if (Object.is(atom,mainatom)) {continue;}
				var dist=atom.pos.dist(mainatom.pos);
				if (dist<rad) {
					this.createbond(atom,mainatom,-1.0,tension);
				}
			}
		}
	}


	update() {
		var next,link,steps=this.steps;
		var bondcount,bondarr;
		var rnd=this.rnd;
		var i,j;
		for (var step=0;step<steps;step++) {
			if (this.updateflag) {
				this.updateconstants();
			}
			// Integrate atoms.
			next=this.atomlist.head;
			while ((link=next)!==null) {
				next=next.next;
				link.obj.update();
			}
			// Integrate bonds. Randomizing the order minimizes oscillations.
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
				bondarr[i].update();
			}
			// Collide atoms.
			this.broad.build();
			this.broad.collide();
		}
	}

}

/*


void World::CreateBox(const Vector& cen,u32 atoms,f64 rad,AtomType* type) {
	Vector pos;
	u32 atomcombos=1;
	for (u32 i=0;i<dim;i++) {atomcombos*=atoms;}
	Atom** atomarr=(Atom**)malloc(atomcombos*sizeof(Atom*));
	for (u32 atomcombo=0;atomcombo<atomcombos;atomcombo++) {
		// Find the coordinates of the atom.
		u32 atomtmp=atomcombo;
		for (u32 i=0;i<dim;i++) {
			s32 x=(s32)(atomtmp%atoms);
			atomtmp/=atoms;
			pos[i]=cen[i]+(x*2-((s32)atoms)+1)*rad;
		}
		atomarr[atomcombo]=createatom(pos,rad,type);
	}
	autobond(atomarr,atomcombos,INF);
	free(atomarr);
}


*/


//---------------------------------------------------------------------------------


function drawfill(imgdata,imgwidth,imgheight,r,g,b) {
	var i=imgwidth*imgheight*4-1;
	while (i>0) {
		imgdata[i--]=255;
		imgdata[i--]=b;
		imgdata[i--]=g;
		imgdata[i--]=r;
	}
}


function drawcircle(imgdata,imgwidth,imgheight,x,y,rad,r,g,b) {
	// Manually draw a circle pixel by pixel.
	// This is ugly, but it's faster than canvas.arc and drawimage.
	x=x|0;
	y=y|0;
	rad=rad|0;
	if (rad<=0 || x-rad>imgwidth || x+rad<0 || y-rad>imgheight || y+rad<0) {
		return;
	}
	if (drawcircle.bndarr===undefined) {
		drawcircle.bndarr=[];
	}
	var bnd=drawcircle.bndarr[rad];
	// For a given radius, precalculate how many pixels we need to fill along each row.
	if (bnd===undefined) {
		bnd=new Array(rad*2);
		for (var ly=0;ly<rad*2;ly++) {
			var y0=ly-rad+0.5;
			var lx=Math.sqrt(rad*rad-y0*y0)|0;
			var mindist=Infinity;
			var minx=lx;
			for (var x0=-2;x0<=2;x0++) {
				var x1=lx+x0;
				var dist=Math.abs(rad-Math.sqrt(x1*x1+y0*y0));
				if (mindist>dist && lx+x0>0) {
					mindist=dist;
					minx=lx+x0;
				}
			}
			bnd[ly]=minx*4;
		}
		drawcircle.bndarr[rad]=bnd;
	}
	// Plot the pixels.
	x*=4;
	imgwidth*=4;
	var miny=y-rad,minx;
	var maxy=y+rad,maxx;
	miny=miny>0?miny:0;
	maxy=maxy<imgheight?maxy:imgheight;
	var bndy=miny-y+rad;
	miny*=imgwidth;
	maxy*=imgwidth;
	while (miny<maxy) {
		maxx=bnd[bndy++];
		minx=x-maxx;
		maxx+=x;
		minx=(minx>0?minx:0)+miny;
		maxx=(maxx<imgwidth?maxx:imgwidth)+miny;
		while (minx<maxx) {
			imgdata[minx++]=r;
			imgdata[minx++]=g;
			imgdata[minx++]=b;
			imgdata[minx++]=255;
		}
		miny+=imgwidth;
	}
}


class PhyScene1 {

	constructor(divid) {
		// Swap the <div> with <canvas>
		var elem=document.getElementById(divid);
		var canvas=document.createElement("canvas");
		elem.replaceWith(canvas);
		var drawwidth=Math.floor(canvas.parentNode.clientWidth*0.8);
		var drawheight=drawwidth;
		canvas.width=drawwidth;
		canvas.height=drawheight;
		this.input=new Input(canvas);
		this.input.disablenav();
		// Setup the UI.
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.backbuf=this.ctx.createImageData(canvas.clientWidth,canvas.clientHeight);
		this.world=new PhyWorld(2);
		this.mouse=new PhyVec(2);
		this.time=0;
		this.timeden=0;
		this.setup();
		var state=this;
		function update() {
			setTimeout(update,1000/60);
			state.update();
		}
		update();
	}


	setup() {
		var canvas=this.canvas;
		var world=this.world;
		world.steps=5;
		var viewheight=1.0,viewwidth=canvas.clientWidth/canvas.clientHeight;
		var walltype=world.createatomtype(1.0,Infinity,1.0);
		var normType=world.createatomtype(0.01,1.0,0.98);
		var rnd=new Random(2);
		var pos=new PhyVec(world.dim);
		for (var p=0;p<1000;p++) {
			pos.set(0,rnd.getf64()*viewwidth);
			pos.set(1,rnd.getf64()*viewheight);
			world.createatom(pos,0.007,normType);
		}
		// Walls
		var wallrad=0.07,wallstep=wallrad/5;
		for (var x=0;x<=viewwidth;x+=wallstep) {
			pos.set(0,x);
			pos.set(1,0.0-wallrad*0.99);
			world.createatom(pos,wallrad,walltype);
			pos.set(1,1.0+wallrad*0.99);
			world.createatom(pos,wallrad,walltype);
		}
		for (var y=0;y<=1.0;y+=wallstep) {
			pos.set(1,y);
			pos.set(0,viewwidth+wallrad*0.99);
			world.createatom(pos,wallrad,walltype);
			pos.set(0,0.0-wallrad*0.99);
			world.createatom(pos,wallrad,walltype);
		}
		// Dampen the elasticity so we don't add too much energy.
		var playertype=world.createatomtype(0.0,Infinity,0.1);
		playertype.gravity=new PhyVec([0,0]);
		pos=new PhyVec([viewwidth*0.5,viewheight*0.5]);
		this.playeratom=world.createatom(pos,0.035,playertype);
		this.mouse.copy(pos);
		console.log("atoms: ",world.atomlist.count);
		this.frametime=performance.now();
	}


	update() {
		var frametime=performance.now()-this.frametime;
		this.frametime=performance.now();
		var time=performance.now();
		var input=this.input;
		input.update();
		var canvas=this.canvas;
		var imgwidth=canvas.clientWidth;
		var imgheight=canvas.clientHeight;
		var imgdata=this.backbuf.data;
		var scale=imgheight;
		var ctx=this.ctx;
		var world=this.world;
		world.update();
		drawfill(imgdata,imgwidth,imgheight,0,0,0);
		// Convert mouse to world space.
		var mpos=input.getmousepos();
		var maxx=canvas.clientWidth/canvas.clientHeight;
		if (mpos[0]>=0 && mpos[0]<1 && mpos[1]>=0 && mpos[1]<1) {
			this.mouse.set(0,mpos[0]*maxx);
			this.mouse.set(1,mpos[1]);
		}
		// Move the player.
		var player=this.playeratom;
		var dir=this.mouse.sub(player.pos);
		var move=dir.sqr()>1e-6;
		player.vel=dir.scale(move?0.2/world.deltatime:0);
		var link=world.atomlist.head;
		while (link!==null) {
			var atom=link.obj;
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
			var u=data.velcolor*(256*4);
			u=Math.floor(u<255?u:255);
			var pos=atom.pos.elem;
			var rad=atom.rad*scale;
			drawcircle(imgdata,imgwidth,imgheight,pos[0]*scale,pos[1]*scale,rad,u,0,255-u);
			link=link.next;
		}
		ctx.putImageData(this.backbuf,0,0);
		time=performance.now()-time;
		this.time+=frametime;
		this.timeden++;
		if (this.timeden>=60) {
			console.log("time:",this.time/(this.timeden*1000));
			this.time=0;
			this.timeden=0;
		}
	}

}

