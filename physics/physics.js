/*------------------------------------------------------------------------------


physics.js - v2.00

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


With enough atoms and bonds, anything can be simulated.
Atoms can overlap if they're bonded.
Two atoms will only collide once a step.


--------------------------------------------------------------------------------
History


1.00
     Initial version. Copied from C engine.
1.21
     Tweaks for performance improvement in javascript.
1.22
     The simulation can now use a variable timestep.
2.00
     Rewrote broadphase to use recursive subdivision instead of cells.
     Broadphase will no longer collide 2 atoms multiple times a step.


--------------------------------------------------------------------------------
TODO


Testing
	narrowphase speed test
		generate an array of atoms
		time collision of every 2 atoms
	ballistic test
	rotation test
	multiple dimensions for all tests
	static time for each sim step
	rewrite everthing to use multiply add
	if (!(dist<rad*rad)) {return;}
	let den=1;
	if (dist>=1e-10) {
		dist=Math.sqrt(dist);
		den=1/dist;
	} else {
		// The atoms are too close, so guess a direction to separate them.
		// This should be a random unit vector, but all we care about is speed.
		let rand=Math.imul(world.seed++,0xf8b7629f);
		norm[rand%dim]=((rand>>>30)&2)-1;
	}
	for (i=0;i<dim;i++) {
		let x=(norm[i]*=den);
		veldif+=(avel[i]-bvel[i])*x;
	}

Broadphase WASM.

add back collision callback
	add a read-only callback and read-write callback

Why aren't boxes spinning properly?
	veldif=veldif>0?veldif:0;
Collisions and bonds should use the same equations.
Skip collision step and only update during bond step?

get rid of need to define material types
	add [density,damp,elasticity] option instead of type
divide pvmul by timestep, since it's acceleration
Bonds that break when stretched
How to layer atoms so a particle will always be pushed out?
	1 dimension? 2 dimensions?
How many bonds are needed for a cube to be stable?


*/
/* npx eslint physics.js -c ../../standards/eslint.js */
/* global Vector, Random */


function PhyAssert(condition,data) {
	// To toggle debug, replace "\tPhyAssert" with "\t// PhyAssert".
	if (!condition) {
		console.log("assert failed:",data);
		throw new Error("Assert Failed");
	}
}


//---------------------------------------------------------------------------------
// Physics - v1.23


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
		let link=this.head,next;
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
		let next;
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
		let prev;
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
		let prev=link.prev;
		let next=link.next;
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


class PhyAtomInteraction {

	constructor(a,b) {
		this.a=a;
		this.b=b;
		this.collide=false;
		this.pmul=0;
		this.vmul=0;
		this.vpmul=0;
		this.callback=null;
		this.updateconstants();
	}


	updateconstants() {
		let a=this.a,b=this.b;
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
		this.intarr=[];
		this.collide=true;
		this.damp=damp;
		this.density=density;
		this.pmul=1.0;
		this.vmul=elasticity;
		this.vpmul=1.0;
		this.bound=true;
		this.callback=null;
		this.dt =NaN;
		this.dt0=0;
		this.dt1=0;
		this.dt2=0;
		this.gravity=null;
	}


	release() {
		let id=this.id;
		let link=this.world.atomtypelist.head;
		while (link!==null) {
			link.obj.intarr[id]=null;
			link=link.next;
		}
		this.worldlink.remove();
		this.atomlist.clear();
	}


	updateconstants(dt) {
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
		this.dt=dt;
		let damp=this.damp,idamp=1.0-damp,dt0,dt1,dt2;
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
			let lnd=Math.log(idamp);
			dt0=Math.exp(dt*lnd);
			dt1=(dt0-1.0)/lnd;
			dt2=(dt1-dt )/lnd;
		}
		this.dt0=dt0;
		this.dt1=dt1;
		this.dt2=dt2;
	}


	updateinteractions() {
		let intarr=this.intarr;
		for (let i=intarr.length-1;i>=0;i--) {
			intarr[i].updateconstants();
		}
	}


	static initinteraction(a,b) {
		let inter=new PhyAtomInteraction(a,b);
		while (a.intarr.length<=b.id) {a.intarr.push(null);}
		while (b.intarr.length<=a.id) {b.intarr.push(null);}
		a.intarr[b.id]=inter;
		b.intarr[a.id]=inter;
	}

}


class PhyAtom {

	constructor(pos,rad,type) {
		this.worldlink=new PhyLink(this);
		this.world=type.world;
		this.world.atomlist.add(this.worldlink);
		pos=new Vector(pos);
		this.pos=pos;
		this.vel=new Vector(pos.length);
		this.acc=new Vector(pos.length);
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
		let link;
		while ((link=this.bondlist.head)!==null) {
			link.release();
		}
	}


	updateconstants() {
		// Calculate the mass of the atom, where mass=volume*density.
		let dim=this.pos.length;
		let mass=this.type.density;
		if (dim>0) {
			let vol0=mass,rad=this.rad;
			let volmul=rad*rad*6.283185307;
			mass*=2.0*rad;
			for (let i=2;i<=dim;i++) {
				let vol1=vol0*volmul/i;
				vol0=mass;
				mass=vol1;
			}
		}
		this.mass=mass;
	}


	update(dt) {
		// Move the particle and apply damping to the velocity.
		// acc+=gravity
		// pos+=vel*dt1+acc*dt2
		// vel =vel*dt0+acc*dt1
		/*let pe=this.pos,ve=this.vel;
		let dim=pe.length,type=this.type,v,a;
		let ae=this.acc,ge=type.gravity;
		ge=(ge===null?this.world.gravity:ge);
		let dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		for (let i=0;i<dim;i++) {
			v=ve[i];
			a=ae[i]+ge[i];
			pe[i]+=v*dt1+a*dt2;
			ve[i] =v*dt0+a*dt1;
			ae[i] =0;
		}*/
		let world=this.world;
		let bndmin=world.bndmin;
		let bndmax=world.bndmax;
		let pe=this.pos,ve=this.vel;
		let dim=pe.length,type=this.type;
		if (type.dt!==dt) {type.updateconstants(dt);}
		let bound=type.bound;
		let ae=this.acc,ge=type.gravity;
		ge=(ge===null?this.world.gravity:ge);
		let dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		let pos,rad=this.rad;
		for (let i=0;i<dim;i++) {
			let vel=ve[i],acc=ae[i]+ge[i];
			pos=vel*dt1+acc*dt2+pe[i];
			vel=vel*dt0+acc*dt1;
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


	static collide(a,b) {// ,callback) {
		// Collides two atoms. Vector operations are unrolled to use constant memory.
		if (Object.is(a,b)) {return;}
		let intr=a.type.intarr[b.type.id];
		if (!intr.collide) {return;}
		// Determine if the atoms are overlapping.
		let apos=a.pos,bpos=b.pos;
		let dim=apos.length,i;
		let dist=0.0,dif,norm=a.world.tmpvec;
		for (i=0;i<dim;i++) {
			dif=bpos[i]-apos[i];
			norm[i]=dif;
			dist+=dif*dif;
		}
		let rad=a.rad+b.rad;
		if (dist>=rad*rad) {return;}
		// Bonds can limit the distance between the atoms.
		let b0=a,b1=b;
		if (a.bondlist.count>b.bondlist.count) {b0=b;b1=a;}
		let link=b0.bondlist.head;
		while (link!==null) {
			let bond=link.obj;
			link=link.next;
			if (Object.is(bond.a,b1) || Object.is(bond.b,b1)) {
				if (rad>bond.dist) {rad=bond.dist;}
				break;
			}
		}
		if (dist>=rad*rad) {return;}
		// If we have a callback, allow it to handle the collision.
		// if (callback===undefined && intr.callback!==null) {
		// 	if (intr.callback(a,b)) {PhyAtom.collide(a,b,true);}
		// 	return;
		// }
		let amass=a.mass,bmass=b.mass;
		let mass=amass+bmass;
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
		let avel=a.vel,bvel=b.vel;
		let veldif=0.0;
		for (i=0;i<dim;i++) {
			norm[i]*=dif;
			veldif-=(bvel[i]-avel[i])*norm[i];
		}
		let posdif=rad-dist;
		// if (link===null) {veldif=veldif>0?veldif:0;}
		veldif=veldif>0?veldif:0;
		veldif=veldif*intr.vmul+posdif*intr.vpmul;
		// veldif=veldif>0?veldif:0;
		posdif*=intr.pmul;
		// Push the atoms apart.
		let avelmul=veldif*bmass,bvelmul=veldif*amass;
		let aposmul=posdif*bmass,bposmul=posdif*amass;
		for (i=0;i<dim;i++) {
			dif=norm[i];
			apos[i]-=dif*aposmul;
			avel[i]-=dif*avelmul;
			bpos[i]+=dif*bposmul;
			bvel[i]+=dif*bvelmul;
		}
	}

}


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
		this.alink=new PhyLink(this);
		this.blink=new PhyLink(this);
		this.a.bondlist.add(this.alink);
		this.b.bondlist.add(this.blink);
		this.userdata=null;
	}


	release () {
		this.worldlink.remove();
		this.alink.remove();
		this.blink.remove();
	}


	update(dt) {
		// Pull two atoms toward eachother based on the distance and bond strength.
		// Vector operations are unrolled to use constant memory.
		let a=this.a,b=this.b;
		let amass=a.mass,bmass=b.mass;
		let mass=amass+bmass;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10) {
			return;
		}
		amass=amass>=Infinity?1.0:(amass/mass);
		bmass=bmass>=Infinity?1.0:(bmass/mass);
		// Get the distance and direction between the atoms.
		let apos=a.pos,bpos=b.pos;
		let dim=apos.length,i,dif;
		let norm=a.world.tmpvec;
		let dist=0.0;
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
		let tension=dt*this.tension;
		let force=(this.dist-dist)*(tension<1?tension:1)*dif;
		let amul=force*bmass,bmul=force*amass;
		let avel=a.vel,bvel=b.vel;
		for (i=0;i<dim;i++) {
			dif=norm[i];
			apos[i]-=dif*amul;
			avel[i]-=dif*amul;
			bpos[i]+=dif*bmul;
			bvel[i]+=dif*bmul;
		}
	}

}


class PhyBroadphase {

	constructor(world) {
		this.world=world;
		this.slack=1.05;
		this.atomarr=null;
		this.atomcnt=0;
		this.zonecnt=0;
		this.memarr=null;
	}


	release() {
		this.atomcnt=0;
		this.atomarr=null;
		this.zonecnt=0;
		this.memarr=null;
	}


	resize(newlen) {
		let memarr=this.memarr;
		let dim=this.world.dim;
		let arrs=5+(dim>0?dim:1);
		if (!memarr) {
			memarr=new Array(arrs);
			for (let i=0;i<arrs;i++) {memarr[i]=new Int32Array(0);}
			this.memarr=memarr;
		}
		let memlen=memarr[0].length;
		if (newlen<=memlen) {return memlen;}
		while (newlen&(newlen+1)) {newlen|=newlen>>>1;}
		newlen++;
		for (let i=0;i<arrs;i++) {
			let dstarr=new Int32Array(newlen);
			dstarr.set(memarr[i]);
			memarr[i]=dstarr;
		}
		return newlen;
	}


	build() {
		// Recursively find an axis to best split a group of atoms. If we can't find a
		// good split, assign those atoms to a zone and stop. Then, check all atoms within
		// a zone for collisions.
		//
		// We sort atom bounds once for each axis, with min=atom_id*2+0 max=atom_id*2+1.
		// We can easily determine how many atoms will be on the left, right, or both
		// sides of a split by counting how many even or odd ID's we've read.
		//
		// memarr layout:
		//     arr[0  ]=zoneend
		//     arr[1  ]=zoneatoms
		//     arr[2  ]=atomend   / workend
		//     arr[3  ]=atomzones / coordarr / atomflag
		//     arr[4  ]=tmp       / collided
		//     arr[5+0]=x
		//     arr[5+1]=y
		//     arr[5+2]=z
		//     ...
		//
		// wasm: dim, atomcnt, zonecnt, memlen, atomarr [rad,x,y,...], memarr
		let world=this.world;
		let dim=world.dim;
		let atomcnt=world.atomlist.count;
		this.atomcnt=atomcnt;
		this.zonecnt=0;
		if (atomcnt===0) {return;}
		let atomcnt2=atomcnt*2;
		// Randomize the order of the atoms.
		let atomarr=this.atomarr;
		if (atomarr===null || atomarr.length<atomcnt) {
			atomarr=new Array(atomcnt2);
			this.atomarr=atomarr;
		}
		let rnd=world.rnd;
		let atomlink=world.atomlist.head;
		for (let i=0;i<atomcnt;i++) {
			let j=rnd.getu32()%(i+1);
			atomarr[i]=atomarr[j];
			atomarr[j]=atomlink.obj;
			atomlink=atomlink.next;
		}
		// Allocate working arrays.
		let dim0=dim>0?dim:1;
		let memlen=this.resize(atomcnt2*dim0);
		let memarr=this.memarr;
		// Store atom bounds. All X's first, then Y's, etc. [x-rad,x+rad]
		let slack=this.slack;
		let coordarr=new Float32Array(memarr[3].buffer);
		for (let i=0;i<atomcnt;i++) {
			let atom=atomarr[i],j=i<<1;
			let pos=atom.pos,rad=Math.abs(atom.rad*slack);
			for (let axis=0;axis<dim;axis++) {
				let x=pos[axis],x0=x-rad,x1=x+rad;
				if (isNaN(x0) || isNaN(x1)) {x0=x1=-Infinity;}
				coordarr[j  ]=x0;
				coordarr[j+1]=x1;
				j+=atomcnt2;
			}
		}
		// Sort bounds along each axis.
		let axistmp=memarr[4];
		for (let axis=0;axis<dim;axis++) {
			// Arrange bounds so all minimums are in the front. So if B.max=A.min, A.min
			// will be sorted first. This is needed to properly split edge cases later.
			let axisarr=memarr[5+axis];
			for (let i=0,j=0;i<atomcnt;i++) {
				axisarr[i]=j++;
				axisarr[i+atomcnt]=j++;
			}
			// Merge sort. This must be stable.
			coordarr=new Float32Array(coordarr.buffer,atomcnt2*axis*4);
			for (let half=1;half<atomcnt2;half+=half) {
				let hstop=atomcnt2-half;
				for (let i=0;i<atomcnt2;) {
					let i0=i ,i1=i <hstop?i +half:atomcnt2;
					let j0=i1,j1=i1<hstop?i1+half:atomcnt2;
					if (i0<i1 && j0<j1) {
						let io=axisarr[i0],jo=axisarr[j0];
						let iv=coordarr[io],jv=coordarr[jo];
						while (true) {
							if (iv<=jv) {
								axistmp[i++]=io;
								if (++i0>=i1) {break;}
								io=axisarr[i0];
								iv=coordarr[io];
							} else {
								axistmp[i++]=jo;
								if (++j0>=j1) {break;}
								jo=axisarr[j0];
								jv=coordarr[jo];
							}
						}
					}
					while (i0<i1) {axistmp[i++]=axisarr[i0++];}
					while (j0<j1) {axistmp[i++]=axisarr[j0++];}
				}
				let tmp=axisarr;
				axisarr=axistmp;
				axistmp=tmp;
			}
			memarr[5+axis]=axisarr;
		}
		memarr[4]=axistmp;
		// Special case for 0 dimensions.
		if (dim<=0) {
			let axisarr=memarr[5];
			for (let i=0,j=0;i<atomcnt;i++) {
				axisarr[i]=j++;
				axisarr[i+atomcnt]=j++;
			}
		}
		let workend=memarr[2];
		workend[0]=0;
		workend[1]=atomcnt2;
		let workidx=2;
		let zonecnt=0,zoneidx=0;
		while (workidx>0) {
			// Pop the top working range off the stack.
			let workhi=workend[--workidx];
			let worklo=workend[--workidx];
			let workcnt=workhi-worklo;
			// Over-allocate ahead of time.
			let alloc=(zoneidx>workhi?zoneidx:workhi)+workcnt*2;
			if (memlen<alloc) {
				memlen=this.resize(alloc);
				workend=memarr[2];
			}
			// Split the atoms in a way that minimizes max(lcnt,rcnt).
			let minlcnt=0,minrcnt=workcnt>28?(workcnt*.72)|0:(workcnt-8);
			let minidx=0,minaxis=-1;
			for (let axis=0;axis<dim;axis++) {
				let axisarr=memarr[5+axis];
				let lcnt=0,rcnt=workcnt;
				for (let i=worklo;lcnt<minrcnt;i++) {
					if (axisarr[i]&1) {
						rcnt-=2;
						// we already know lcnt<minrcnt
						if (minrcnt>rcnt) {
							minrcnt=rcnt;
							minlcnt=lcnt;
							minidx=i;
							minaxis=axis;
						}
					} else {
						lcnt+=2;
					}
				}
			}
			// If no split passed our threshold, add it to the list of settled zones.
			// Use the same axis each time, so A appears before B in all zones.
			if (minaxis<0) {
				let axisarr=memarr[5];
				let zoneend=memarr[0];
				let zoneatoms=memarr[1];
				let stop=zoneidx+(workcnt>>>1);
				zoneend[zonecnt++]=stop;
				for (let i=worklo;zoneidx<stop;i++) {
					let x=axisarr[i];
					if (!(x&1)) {zoneatoms[zoneidx++]=x>>>1;}
				}
				continue;
			}
			// Flag each atom for the left half (0), right half (2), or both (1).
			let atomflag=memarr[3];
			let axisarr=memarr[5+minaxis];
			for (let i=worklo;i<=minidx;i++) {
				let x=axisarr[i];
				atomflag[x>>>1]=1-(x&1);
			}
			for (let i=workhi-1;i>minidx;i--) {
				let x=axisarr[i];
				atomflag[x>>>1]=2-(x&1);
			}
			// For each axis, copy the left half to [lo,lo+lcnt) and the right half to
			// [hi,hi+rcnt) while maintaining sorted order.
			workend[workidx++]=worklo;
			workend[workidx++]=worklo+minlcnt;
			workend[workidx++]=workhi;
			workend[workidx++]=workhi+minrcnt;
			for (let axis=0;axis<dim;axis++) {
				axisarr=memarr[5+axis];
				let lidx=worklo,ridx=workhi;
				for (let i=worklo;i<workhi;i++) {
					let x=axisarr[i];
					let f=atomflag[x>>>1];
					if (f<=1) {axisarr[lidx++]=x;}
					if (f>=1) {axisarr[ridx++]=x;}
				}
				// PhyAssert(lidx===worklo+minlcnt && ridx===workhi+minrcnt);
			}
		}
		// Records all zones an atom is in.
		this.zonecnt=zonecnt;
		let zoneend  =memarr[0];
		let zoneatoms=memarr[1];
		let atomend  =memarr[2];
		let atomzones=memarr[3];
		let sum=zoneidx;
		for (let i=0;i<atomcnt;i++) {atomend[i]=0;}
		for (let i=0;i<sum;i++) {atomend[zoneatoms[i]]++;}
		for (let i=atomcnt-1;i>=0;i--) {
			sum-=atomend[i];
			atomend[i]=sum;
		}
		let idx=0;
		for (let z=0;z<zonecnt;z++) {
			let stop=zoneend[z];
			while (idx<stop) {
				let a=zoneatoms[idx++];
				atomzones[atomend[a]++]=z;
			}
		}
	}


	collide() {
		// Look at all zones an atom is in and check for collisions in each zone.
		// Avoid duplicate collisions.
		let atomcnt=this.atomcnt;
		if (atomcnt<=0) {return;}
		let memarr=this.memarr;
		let collided=memarr[4];
		for (let i=0;i<atomcnt;i++) {collided[i]=-1;}
		let collide=PhyAtom.collide;
		let atomarr=this.atomarr;
		let zoneend  =memarr[0];
		let zoneatoms=memarr[1];
		let atomend  =memarr[2];
		let atomzones=memarr[3];
		let idx=0;
		for (let aid=0;aid<atomcnt;aid++) {
			let aend=atomend[aid];
			let a=atomarr[aid];
			while (idx<aend) {
				let zone=atomzones[idx++];
				let zend=zoneend[zone],bid;
				while ((bid=zoneatoms[--zend])!==aid) {
					if (collided[bid]!==aid) {
						collided[bid]=aid;
						let b=atomarr[bid];
						collide(a,b);
					}
				}
			}
		}
	}

}


class PhyWorld {

	static Atom=PhyAtom;
	static Bond=PhyBond;


	constructor(dim) {
		this.dim=dim;
		this.maxsteptime=1/180;
		this.rnd=new Random();
		this.gravity=new Vector(dim);
		this.gravity[dim-1]=0.24;
		this.bndmin=(new Vector(dim)).set(-Infinity);
		this.bndmax=(new Vector(dim)).set( Infinity);
		this.atomtypelist=new PhyList();
		this.atomlist=new PhyList();
		this.bondlist=new PhyList();
		this.tmpmem=[];
		this.tmpvec=new Vector(dim);
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
		let tmp=this.tmpmem;
		while (tmp.length<size) {
			tmp=tmp.concat(Array(tmp.length+1));
			this.tmpmem=tmp;
		}
		return tmp;
	}


	createatomtype(damp,density,elasticity) {
		// Assume types are sorted from smallest to largest.
		// Find if there's any missing ID or add to the end.
		let link=this.atomtypelist.head;
		let id=0;
		while (link!==null) {
			let nextid=link.obj.id;
			if (id<nextid) {break;}
			id=nextid+1;
			link=link.next;
		}
		let type=new PhyAtomType(this,id,damp,density,elasticity);
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
			let tmp=a;
			a=b;
			b=tmp;
		}
		let link=a.bondlist.head;
		while (link!==null) {
			let bond=link.obj;
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
		let bond=this.findbond(a,b);
		if (bond!==null) {
			bond.dist=dist;
			bond.tension=tension;
		} else {
			bond=new PhyBond(this,a,b,dist,tension);
		}
		return bond;
	}


	autobond(atomarr,tension) {
		// Balance distance, mass, # of bonds, direction.
		let count=atomarr.length;
		if (count===0) {return;}
		let infoarr=new Array(count);
		for (let i=0;i<count;i++) {
			let info={
				atom:atomarr[i]
			};
			infoarr[i]=info;
		}
		for (let i=0;i<count;i++) {
			let mainatom=infoarr[i].atom;
			let rad=mainatom.rad*5.1;
			for (let j=0;j<count;j++) {
				let atom=infoarr[j].atom;
				if (Object.is(atom,mainatom)) {continue;}
				let dist=atom.pos.dist(mainatom.pos);
				if (dist<rad) {
					this.createbond(atom,mainatom,-1.0,tension);
				}
			}
		}
	}


	createbox(cen,side,rad,dist,type) {
		// O O O O
		//  O O O
		// O O O O
		let pos=new Vector(cen);
		let atomcombos=1;
		let dim=this.dim;
		for (let i=0;i<dim;i++) {atomcombos*=side;}
		let atomarr=new Array(atomcombos);
		for (let atomcombo=0;atomcombo<atomcombos;atomcombo++) {
			// Find the coordinates of the atom.
			let atomtmp=atomcombo;
			for (let i=0;i<dim;i++) {
				let x=atomtmp%side;
				atomtmp=Math.floor(atomtmp/side);
				pos[i]=cen[i]+(x*2-side+1)*dist;
			}
			atomarr[atomcombo]=this.createatom(pos,rad,type);
		}
		this.autobond(atomarr,Infinity);
	}


	update(time) {
		// Process the simulation in multiple steps if time is too large.
		if (time<1e-9 || isNaN(time)) {return;}
		let dt=this.maxsteptime;
		let steps=time<=dt?1:Math.ceil(time/dt);
		if (steps<Infinity) {dt=time/steps;}
		let rnd=this.rnd;
		for (let step=0;step<steps;step++) {
			// Integrate atoms.
			let next=this.atomlist.head,link;
			while ((link=next)!==null) {
				next=next.next;
				link.obj.update(dt);
			}
			// Integrate bonds. Randomizing the order minimizes oscillations.
			let bondcount=this.bondlist.count;
			let bondarr=this.gettmpmem(bondcount);
			link=this.bondlist.head;
			for (let i=0;i<bondcount;i++) {
				let j=rnd.getu32()%(i+1);
				bondarr[i]=bondarr[j];
				bondarr[j]=link;
				link=link.next;
			}
			for (let i=0;i<bondcount;i++) {
				bondarr[i].obj.update(dt);
			}
			// Collide atoms.
			this.broad.build();
			this.broad.collide();
		}
	}

}

