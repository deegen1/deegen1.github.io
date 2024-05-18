/*------------------------------------------------------------------------------


physics.js - v1.27

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


split physics from demo
firefox on windows setTimeout() isn't running at 60fps.
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
/* jshint esversion: 11  */
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
// Vectors - v1.02


class PhyVec {
	static rnd=null;


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
		PhyVec.rnd=new Random();
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

