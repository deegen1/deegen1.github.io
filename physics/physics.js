/*------------------------------------------------------------------------------


physics.js - v1.00

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


fps counter
use an interaction matrix
enable clicking and dragging
fix mouse first entering canvas
game idea:
	Need to get all circles in a bucket
	Player can drag a ball
	Ball can only interact with some elements


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
// PRNG


class PhyRand {

	constructor(seed) {
		this.acc=0;
		this.inc=1;
		this.seed(seed);
	}


	seed(seed) {
		if (seed===undefined || seed===null) {
			seed=performance.timeOrigin+performance.now();
		}
		this.acc=0;
		this.inc=seed>>>0;
		this.acc=this.getu32();
		this.inc=this.getu32()|1;
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
		var x=this.getf64(),xmb=PhyRand.xmbarr,i=48;
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
	static rnd=new PhyRand();

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
		return this.elem[i];
	}


	set(i,val) {
		this.elem[i]=val;
	}


	//---------------------------------------------------------------------------------
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


	//---------------------------------------------------------------------------------
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
		// this.callback=null;
		this.UpdateConstants();
	}


	UpdateConstants() {
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
		// this.callback=null;
		this.dt0=0;
		this.dt1=0;
		this.dt2=0;
		this.gravity=null;
		this.intarr=[];
		this.collide=true;
		this.UpdateConstants();
	}


	release() {
		var id=this.id;
		var link=world.atomtypelist.head;
		while (link!==null) {
			link.obj.intarr[id]=null;
			link=link.next;
		}
		this.worldlink.remove();
		this.atomlist.clear();
	}


	UpdateConstants() {
		// We want to solve for dt0, dt1, dt2, and dt3 in our integration equations.
		//
		//      pos+=vel*dt2+accel*dt3
		//      vel =vel*dt0+accel*dt1
		//
		//---------------------------------------------------------------------------------
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
		//---------------------------------------------------------------------------------
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
		//---------------------------------------------------------------------------------
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


	UpdateInteractions() {
		var intarr=this.intarr;
		for (var i=intarr.length-1;i>=0;i--) {
			intarr[i].UpdateConstants();
		}
	}


	static InitInteraction(a,b) {
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
		// this.bondlist=new PhyList();
		this.typelink=new PhyLink();
		this.typelink.obj=this;
		this.type=type;
		type.atomlist.add(this.typelink);
		this.userdata=null;
		this.UpdateConstants();
	}


	release() {
		this.worldlink.remove();
		this.typelink.remove();
		var link;
		while ((link=this.bondlist.head)!==null) {
			link.release();
		}
	}


	UpdateConstants() {
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


	Update() {
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


	static CollideAtom(a,b) {
		// Collides two atoms. Vector operations are unrolled to use constant memory.
		if (Object.is(a,b)) {
			return;
		}
		var apos=a.pos.elem,bpos=b.pos.elem;
		var dim=apos.length;
		// Determine if atoms are overlapping.
		var dist=0.0,dif,i,tmpvec=a.world.tmpvec.elem;
		for (i=0;i<dim;i++) {
			dif=bpos[i]-apos[i];
			tmpvec[i]=dif;
			dist+=dif*dif;
		}
		var rad=a.rad+b.rad;
		if (dist<rad*rad) {
			// If we have a callback, allow it to handle the collision.
			var intr=a.type.intarr[b.type.id];
			if (intr.collide===false) {// || (intr->callback!==null && intr->callback(a,b)==0)) {
				return;
			}
			var avel=a.vel.elem,bvel=b.vel.elem;
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
			var veldif=0.0;
			for (i=0;i<dim;i++) {
				tmpvec[i]*=dif;
				veldif-=(bvel[i]-avel[i])*tmpvec[i];
			}
			veldif*=intr.elasticity;
			if (veldif<0.0) {veldif=0.0;}
			var avelmul=veldif*bmass,bvelmul=veldif*amass;
			// Push the atoms apart.
			var posdif=(rad-dist)*intr.push;
			var aposmul=posdif*bmass,bposmul=posdif*amass;
			for (i=0;i<dim;i++) {
				dif=tmpvec[i];
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
		this.worldlink=new PhyLink();
		this.world.bondlist.add(this.worldlink);
		this.worldlink.obj=this;
		this.a=a;
		this.b=b;
		this.dist=dist;
		this.tension=tension;
		this.dttension=0.0;
		this.alink=new PhyLink();
		this.blink=new PhyLink();
		this.a.bondlist.add(this.alink);
		this.b.bondlist.add(this.blink);
		this.alink.obj=this;
		this.blink.obj=this;
		this.userdata=null;
		this.UpdateConstants();
	}


	release () {
		this.worldlink.remove();
		this.alink.remove();
		this.blink.remove();
	}


	UpdateConstants() {
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


	Update() {
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
		var tmpvec=a.world.tmpvec.elem;
		var dist=0.0;
		for (i=0;i<dim;i++) {
			dif=bpos[i]-apos[i];
			tmpvec[i]=dif;
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
			dif=tmpvec[i];
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


	GetCell(point) {
		if (this.mapused===0) {return null;}
		var dim=this.world.dim,celldim=this.celldim;
		var hash=this.hash0,x;
		for (var d=0;d<dim;d++) {
			x=Math.floor(point[d]/celldim);
			hash=PhyRand.hashu32(hash+x);
		}
		return this.cellmap[hash&(this.mapused-1)];
	}


	TestCell(newcell,oldcell,point,d,off) {
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
			for (i=0;i<=d;i++) {hash=PhyRand.hashu32(hash+coord[i]);}
		} else {
			for (i=0;i<dim;i++) {coord[i]=Math.floor(point[i]/celldim);}
		}
		if (newcell.hash!==hash) {
			console.log("hash mismatch");
			throw "error";
		}
		var dist=0.0;
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
		if (Math.abs(newcell.dist-dist)>1e-5) {
			console.log("dist drift");
			throw "error";
		}
	}


	Build() {
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
		// var mapalloc=cellmap.length;
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
		celldim*=2.08*slack/atomcount;
		for (i=0;i<dim;i++) {celldim*=1.61;}
		this.celldim=celldim;
		var hash0=rnd.getu32();
		this.hash0=hash0;
		var invdim=1.0/celldim;
		var celldim2=2.0*celldim*celldim;
		var cellend=0;
		var cellarr=this.cellarr;
		var cellalloc=cellarr.length;
		var cellstart;
		var rad,rad2,cell,pos,radcells,d,c,end;
		var cen,cendif,decstart,decinc,posstart,posinc,hashcen;
		var hash,distinc,newcell,dist;
		var hashu32=PhyRand.hashu32;
		var floor=Math.floor;
		for (i=0;i<atomcount;i++) {
			// Make sure we have enough cells.
			cellstart=cellend;
			if (cellend>=cellalloc) {
				cellarr=cellarr.concat(new Array(cellalloc+1));
				for (j=0;j<=cellalloc;j++) {cellarr[cellalloc+j]=new PhyCell();}
				cellalloc=cellarr.length;
			}
			// Get the starting cell.
			atom=cellmap[i];
			rad=atom.rad*slack;
			rad2=rad*rad;
			cell=cellarr[cellend++];
			cell.atom=atom;
			cell.dist=0;
			cell.hash=hash0;
			pos=atom.pos.elem;
			// this.TestCell(cell,null,pos,0,0);
			radcells=floor(rad*2*invdim+3);
			for (d=0;d<dim;d++) {
				// Make sure we have enough cells.
				j=cellend+(cellend-cellstart)*radcells;
				while (j>=cellalloc) {
					cellarr=cellarr.concat(new Array(cellalloc+1));
					for (var k=0;k<=cellalloc;k++) {cellarr[cellalloc+k]=new PhyCell();}
					cellalloc=cellarr.length;
				}
				end=cellend;
				// Precalculate constants for the cell-atom distance calculation.
				// floor(x) is needed so negative numbers round to -infinity.
				cen     =floor(pos[d]*invdim);
				cendif  =cen*celldim-pos[d];
				decstart=cendif*cendif;
				decinc  =(celldim-2*cendif)*celldim;
				posstart=(celldim+cendif)*(celldim+cendif);
				posinc  =(3*celldim+2*cendif)*celldim;
				for (c=cellstart;c<end;c++) {
					// Using the starting cell's distance to pos, calculate the distance to the cells
					// above and below. The starting cell is at cen[d] = floor(pos[d]/celldim).
					cell=cellarr[c];
					hashcen=cell.hash+cen;
					cell.hash=hashu32(hashcen);
					// Check the cells below the center.
					hash=hashcen;
					dist=cell.dist+decstart;
					distinc=decinc;
					while (dist<rad2) {
						newcell=cellarr[cellend++];
						newcell.atom=atom;
						newcell.dist=dist;
						newcell.hash=hashu32(--hash);
						// this.TestCell(newcell,cell,pos,d,hash-hashcen);
						dist+=distinc;
						distinc+=celldim2;
					}
					// Check the cells above the center.
					hash=hashcen;
					dist=cell.dist+posstart;
					distinc=posinc;
					while (dist<rad2) {
						newcell=cellarr[cellend++];
						newcell.atom=atom;
						newcell.dist=dist;
						newcell.hash=hashu32(++hash);
						// this.TestCell(newcell,cell,pos,d,hash-hashcen);
						dist+=distinc;
						distinc+=celldim2;
					}
				}
			}
		}
		// Hash cell coordinates and add to the map.
		var cellmask=cellend;
		var mapused=cellmask+1;
		while (cellmask&mapused) {
			cellmask|=mapused;
			mapused=cellmask+1;
		}
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


	Collide() {
		// Look at each grid cell. Check for collisions among atoms within that cell.
		var mapused=this.mapused;
		var cellmap=this.cellmap;
		var a,b,next,atom,collide=PhyAtom.CollideAtom;
		for (var i=0;i<mapused;i++) {
			a=cellmap[i];
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
		this.update=true;
		this.dim=dim;
		this.steps=8;
		this.deltatime=1.0/60.0;
		this.rnd=new PhyRand();
		this.gravity=new PhyVec(dim);
		this.gravity.set(dim-1,0.24);
		this.atomtypelist=new PhyList();
		this.atomlist=new PhyList();
		this.bondlist=new PhyList();
		this.tmpmem=[];
		this.tmpvec=new PhyVec(dim);
		this.broad=new PhyBroadphase(this);
	}


	release() {
		this.atomlist.release();
		this.atomtypelist.release();
		this.bondlist.release();
		this.broad.release();
	}


	GetTmpMem(size) {
		// Use a common pool of temporary memory to avoid constant allocations.
		var tmp=this.tmpmem;
		while (tmp.length<size) {
			tmp=tmp.concat(Array(tmp.length+1));
			this.tmpmem=tmp;
		}
		return tmp;
	}


	UpdateConstants() {
		this.update=false;
	}


	CreateAtomType(damp,density,elasticity) {
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
			PhyAtomType.InitInteraction(link.obj,type);
			link=link.next;
		}
		return type;
	}


	CreateAtom(pos,rad,type) {
		return new PhyAtom(pos,rad,type);
	}


	FindBond(a,b) {
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


	CreateBond(a,b,dist,tension) {
		// Create a bond. If a bond between A and B already exists, replace it.
		// If dist<0, use the current distance between the atoms.
		if (dist<0.0) {
			dist=a.pos.dist(b.pos);
		}
		var bond=this.FindBond(a,b);
		if (bond!==null) {
			bond.dist=dist;
			bond.tension=tension;
			bond.UpdateConstants();
		} else {
			bond=new PhyBond(this,a,b,dist,tension);
		}
		return bond;
	}


	AutoBond(atomarr,start,count,tension) {
		// Balance distance, mass, # of bonds, direction.
		if (count==0) {
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
					this.CreateBond(atom,mainatom,-1.0,tension);
				}
			}
		}
	}


	Update() {
		var next,link,steps=this.steps;
		var bondcount,bondarr;
		var rnd=this.rnd;
		var i,j;
		for (var step=0;step<steps;step++) {
			if (this.update) {
				this.UpdateConstants();
			}
			// Integrate atoms.
			next=this.atomlist.head;
			while ((link=next)!==null) {
				next=next.next;
				link.obj.Update();
			}
			// Integrate bonds. Randomizing the order minimizes oscillations.
			bondcount=this.bondlist.count;
			bondarr=this.GetTmpMem(bondcount);
			link=this.bondlist.head;
			for (i=0;i<bondcount;i++) {
				j=rnd.getu32()%(i+1);
				bondarr[i]=bondarr[j];
				bondarr[j]=link;
				link=link.next;
			}
			for (i=0;i<bondcount;i++) {
				bondarr[i].Update();
			}
			// Collide atoms.
			this.broad.Build();
			this.broad.Collide();
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
		atomarr[atomcombo]=CreateAtom(pos,rad,type);
	}
	AutoBond(atomarr,atomcombos,INF);
	free(atomarr);
}


*/


//---------------------------------------------------------------------------------


function DrawFill(imgdata,imgwidth,imgheight,r,g,b) {
	var i=imgwidth*imgheight*4-1;
	while (i>0) {
		imgdata[i--]=255;
		imgdata[i--]=b;
		imgdata[i--]=g;
		imgdata[i--]=r;
	}
}


function DrawOval(imgdata,imgwidth,imgheight,x,y,width,height,r,g,b) {
	if (width<0) {
		x+=width;
		width=-width;
	}
	if (height<0) {
		y+=height;
		height=-height;
	}
	x=x|0;
	y=y|0;
	width=width|0;
	height=height|0;
	if (x>=imgwidth || x+width<=0 || y>=imgheight || y+height<=0 || width===0 || height===0 || imgwidth<=0 || imgheight<=0) {
		return;
	}
	var movex=4;
	var movey=imgwidth*movex;
	var twidth=movey;
	var theight=imgheight*movey;
	var xref=x+x+width;
	var yref=y+y+height-1;
	width=(width-1)>>>1;
	height=(height-1)>>>1;
	x=(x+width)*movex;
	xref*=movex;
	y*=movey;
	yref*=movey;
	var err=0;
	var dx=height*height;
	var xinc=dx+dx;
	var yinc=width*width;
	var dy=yinc-(height+height)*yinc;
	yinc+=yinc;
	var errx,errxy,erry;
	var sx,ty,tx,dst,stop;
	while (1) {
		errx=err+dx;
		errx=errx>0?errx:-errx;
		errxy=err+dx+dy;
		errxy=errxy>0?errxy:-errxy;
		erry=err+dy;
		erry=erry>0?erry:-erry;
		if (erry<=errx || errxy<=errx) {
			sx=xref-x;
			if (x<twidth && sx>0) {
				ty=y;
				tx=x<0?0:x;
				sx=twidth<sx?twidth:sx;
				do {
					if (ty>=0 && ty<theight) {
						dst=(ty+tx);
						stop=(ty+sx);
						while (dst<stop) {
							imgdata[dst++]=r;
							imgdata[dst++]=g;
							imgdata[dst++]=b;
							imgdata[dst++]=255;
						}
					}
					ty=yref-ty;
				} while (ty!==y);
			}
			err+=dy;
			dy+=yinc;
			y+=movey;
			if (y>yref-y) {
				break;
			}
		}
		if (errx<erry || errxy<=erry) {
			err+=dx;
			dx+=xinc;
			x-=movex;
		}
	}
}


function DrawCircle(imgdata,imgwidth,imgheight,x,y,rad,r,g,b) {
	// Manually draw a circle pixel by pixel.
	// This is ugly, but it's faster than canvas.arc and drawimage.
	x=x|0;
	y=y|0;
	rad=rad|0;
	if (rad<=0 || x-rad>imgwidth || x+rad<0 || y-rad>imgheight || y+rad<0) {
		return;
	}
	if (DrawCircle.bndarr===undefined) {
		DrawCircle.bndarr=[];
	}
	var bnd=DrawCircle.bndarr[rad];
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
		DrawCircle.bndarr[rad]=bnd;
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


function PhyScene1(displayid) {
	var canvas=document.getElementById(displayid);
	var scene={};
	canvas.tabIndex=1; // needed for key presses
	scene.canvas=canvas;
	scene.ctx=canvas.getContext("2d");
	scene.backbuf=scene.ctx.createImageData(canvas.clientWidth,canvas.clientHeight);
	scene.world=new PhyWorld(2);
	scene.mouse=new PhyVec(2);
	scene.time=0;
	scene.timeden=0;
	scene.keydown=(new Array(256)).fill(0);
	scene.mouseonscreen=false;
	scene.follow=false;
	canvas.onmouseover=function(evt) {
		scene.mouseonscreen=true;
	};
	canvas.onmouseleave=function(evt) {
		scene.mouseonscreen=false;
	};
	canvas.onmousemove=function(evt) {
		scene.mouse.set(0,(evt.pageX-canvas.offsetLeft-canvas.clientLeft)/canvas.clientHeight);
		scene.mouse.set(1,(evt.pageY-canvas.offsetTop -canvas.clientTop )/canvas.clientHeight);
	};
	canvas.onmousedown=function(evt) {
		scene.keydown[250]=3;
	};
	canvas.onclick=function(evt) {
		scene.keydown[250]|=1;
	};
	canvas.ontouchstart=function(evt) {
		scene.keydown[250]|=1;
		canvas.ontouchmove(evt);
	};
	canvas.ontouchmove=function(evt) {
		scene.keydown[250]|=2;
		var touch=(evt.targetTouches.length>0?evt.targetTouches:evt.touches).item(0);
		scene.mouse.set(0,(touch.pageX-canvas.offsetLeft-canvas.clientLeft)/canvas.clientHeight);
		scene.mouse.set(1,(touch.pageY-canvas.offsetTop -canvas.clientTop )/canvas.clientHeight);
	};
	canvas.ontouchend=function(evt) {
		scene.keydown[250]=0;
	};
	canvas.ontouchcancel=canvas.ontouchend;
	canvas.onmouseup=function(evt) {
		scene.keydown[250]=0;
	};
	canvas.onkeypress=function(evt) {
		var code=evt.keyCode;
		if (code>=0 && code<250) {
			scene.keydown[code]=3;
		}
	};
	canvas.onkeyup=function(evt) {
		var code=evt.keyCode;
		if (code>=0 && code<250) {
			scene.keydown[code]=0;
		}
	};
	scene.keyhit=function(code) {
		var down=scene.keydown[code]&1;
		scene.keydown[code]^=down;
		return down;
	};
	function setup() {
		var canvas=scene.canvas;
		var world=scene.world;
		world.steps=6;
		var heightf=1.0,widthf=canvas.clientWidth/canvas.clientHeight;
		var walltype=world.CreateAtomType(1.0,Infinity,1.0);
		var normtype=world.CreateAtomType(0.01,1.0,0.98);
		var rnd=new PhyRand();
		var pos=new PhyVec(world.dim);
		for (var p=0;p<1000;p++) {
			pos.set(0,rnd.getf64()*widthf);
			pos.set(1,rnd.getf64()*heightf);
			world.CreateAtom(pos,0.007,normtype);
		}
		// Walls
		var wallrad=0.07,wallstep=wallrad/5;
		for (var x=0;x<=widthf;x+=wallstep) {
			pos.set(0,x);
			pos.set(1,0.0-wallrad*0.98);
			world.CreateAtom(pos,wallrad,walltype);
			pos.set(1,1.0+wallrad*0.98);
			world.CreateAtom(pos,wallrad,walltype);
		}
		for (var y=0;y<=1.0;y+=wallstep) {
			pos.set(1,y);
			pos.set(0,widthf+wallrad*0.98);
			world.CreateAtom(pos,wallrad,walltype);
			pos.set(0,0.0-wallrad*0.98);
			world.CreateAtom(pos,wallrad,walltype);
		}
		// Dampen the elasticity so we don't add too much energy.
		var playertype=world.CreateAtomType(0.0,Infinity,0.1);
		playertype.gravity=new PhyVec([0,0]);
		pos=new PhyVec([widthf*0.5,heightf*0.5]);
		scene.playeratom=world.CreateAtom(pos,0.035,playertype);
		console.log("atoms: ",world.atomlist.count);
	}
	function update() {
		var time=performance.now();
		var canvas=scene.canvas;
		var imgwidth=canvas.clientWidth;
		var imgheight=canvas.clientHeight;
		var imgdata=scene.backbuf.data;
		var scale=imgheight;
		var ctx=scene.ctx;
		var world=scene.world;
		world.Update();
		DrawFill(imgdata,imgwidth,imgheight,0,0,0);
		// Move the player.
		if (scene.mouseonscreen) {
			scene.follow=true;
		}
		var player=scene.playeratom;
		var dir=scene.mouse.sub(player.pos);
		var move=scene.follow && dir.sqr()>1e-6;
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
			DrawCircle(imgdata,imgwidth,imgheight,pos[0]*scale,pos[1]*scale,rad,u,0,255-u);
			//DrawOval(imgdata,imgwidth,imgheight,pos[0]*scale-rad,pos[1]*scale-rad,rad*2,rad*2,255,255,255);
			link=link.next;
		}
		ctx.putImageData(scene.backbuf,0,0);
		/*if (scene.mouseonscreen) {
			ctx.fillStyle="rgb(255,255,255)";
			ctx.beginPath();
			ctx.arc(scene.mouse.get(0)*scale,scene.mouse.get(1)*scale,0.005*scale,0,2*Math.PI);
			ctx.fill();
			ctx.closePath();
		}*/
		time=performance.now()-time;
		scene.time+=time;
		scene.timeden++;
		if (scene.timeden>=120) {
			console.log("time:",scene.time/scene.timeden);
			scene.time=0;
			scene.timeden=0;
		}
		// console.log(time);
		time=(time<16.666)?(16.666-time):0;
		setTimeout(update,time);
	}
	setup();
	setTimeout(update,0);
}


