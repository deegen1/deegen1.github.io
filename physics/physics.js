/*------------------------------------------------------------------------------


physics.js - v1.21

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


divide pvmul by timestep, since it's acceleration
groups
	center
	set vel
	add vel
	add rotation
	rotate
	scale
	move
	copy
variable timestep
	firefox on windows setTimeout() isn't running at 60fps.
	maxframetime = 1/15
	maxsteptime = 1/180
	steps = ceil(dt/maxsteptime)
	if steps<=0: return
	dt /= steps
	if dt<=1e-10: return
	for s in steps:
		...


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
// Physics - v1.21


// ----------------------------------------
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


// ----------------------------------------
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
		let id=this.id;
		let link=this.world.atomtypelist.head;
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
		let dt=this.world.deltatime/this.world.steps;
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


// ----------------------------------------
// Atoms


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


	update() {
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
		let bound=type.bound;
		let ae=this.acc,ge=type.gravity;
		ge=(ge===null?this.world.gravity:ge);
		let dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		let pos,vel,acc,rad=this.rad;
		for (let i=0;i<dim;i++) {
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
		let apos=a.pos,bpos=b.pos;
		let dim=apos.length;
		// Determine if atoms are overlapping.
		let dist=0.0,dif,i,norm=a.world.tmpvec;
		for (i=0;i<dim;i++) {
			dif=bpos[i]-apos[i];
			norm[i]=dif;
			dist+=dif*dif;
		}
		let rad=a.rad+b.rad;
		if (dist<rad*rad) {
			// If we have a callback, allow it to handle the collision.
			let intr=a.type.intarr[b.type.id];
			if (intr.collide===false) {return;}
			if (callback===undefined && intr.callback!==null) {
				if (intr.callback(a,b)) {PhyAtom.collideatom(a,b,true);}
				return;
			}
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
			if (veldif<0.0) {veldif=0.0;}
			let posdif=rad-dist;
			veldif=veldif*intr.vmul+posdif*intr.vpmul;
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

}


// ----------------------------------------
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
		let dt=this.world.deltatime/this.world.steps;
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
		let force=(this.dist-dist)*this.dttension*dif;
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


// ----------------------------------------
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
		let dim=this.world.dim,celldim=this.celldim;
		let hash=this.hash0,x;
		for (let d=0;d<dim;d++) {
			x=Math.floor(point[d]/celldim);
			hash=Random.hashu32(hash+x);
		}
		return this.cellmap[hash&(this.mapused-1)];
	}


	testcell(newcell,oldcell,point,d,off) {
		// Tests if the fast distance computation matches the actual distance.
		let world=this.world;
		let dim=world.dim,i;
		let coord=newcell.coord;
		if (coord===undefined) {
			coord=new Array(dim);
			newcell.coord=coord;
		}
		let hash=this.hash0;
		let celldim=this.celldim;
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
		let rad=newcell.atom.rad*this.slack;
		let dist=-rad*rad;
		for (i=0;i<dim;i++) {
			let x0=coord[i]*celldim;
			let x1=x0+celldim;
			let x=point[i];
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
		let i,j;
		let world=this.world;
		let dim=world.dim;
		let atomcount=world.atomlist.count;
		this.mapused=0;
		if (atomcount===0) {
			return;
		}
		// Put atoms with infinite mass at the front of the array. This will sort them at
		// the end of the grid's linked list and allow us to skip them during collision
		// testing. Randomize the order of the other atoms.
		let cellmap=this.cellmap;
		while (atomcount>cellmap.length) {
			cellmap=cellmap.concat(new Array(cellmap.length+1));
		}
		let rnd=world.rnd;
		let atomlink=world.atomlist.head;
		let inactive=0;
		let celldim=0.0;
		let atom;
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
		let slack=this.slack;
		celldim*=2.5*slack/atomcount;
		let hash0=rnd.getu32();
		this.celldim=celldim;
		this.hash0=hash0;
		let invdim=1.0/celldim;
		let celldim2=2.0*celldim*celldim;
		let cellend=0;
		let cellarr=this.cellarr;
		let cellalloc=cellarr.length;
		let cellstart;
		let rad,cell,pos,radcells,d,c;
		let cen,cendif,neginit,posinit,incinit;
		let hash,hashcen,dist,distinc,newcell;
		let hashu32=Random.hashu32;
		let floor=Math.floor;
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
			pos=atom.pos;
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
		let cellmask=cellend;
		cellmask|=cellmask>>>16;
		cellmask|=cellmask>>>8;
		cellmask|=cellmask>>>4;
		cellmask|=cellmask>>>2;
		cellmask|=cellmask>>>1;
		let mapused=cellmask+1;
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
		let mapused=this.mapused;
		let cellmap=this.cellmap;
		let al,bl,a,collide=PhyAtom.collideatom;
		for (let c=0;c<mapused;c++) {
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


// ----------------------------------------
// World


class PhyWorld {

	constructor(dim) {
		this.updateflag=true;
		this.dim=dim;
		this.steps=8;
		this.deltatime=1.0/60.0;
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


	updateconstants() {
		this.updateflag=false;
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
			bond.updateconstants();
		} else {
			bond=new PhyBond(this,a,b,dist,tension);
		}
		return bond;
	}


	autobond(atomarr,tension) {
		// Balance distance, mass, # of bonds, direction.
		let count=atomarr.length;
		if (count===0) {return;}
		let i,j;
		let infoarr=new Array(count);
		for (i=0;i<count;i++) {
			let info={
				atom:atomarr[i]
			};
			infoarr[i]=info;
		}
		for (i=0;i<count;i++) {
			let mainatom=infoarr[i].atom;
			let rad=mainatom.rad*5.1;
			for (j=0;j<count;j++) {
				let atom=infoarr[j].atom;
				if (Object.is(atom,mainatom)) {continue;}
				let dist=atom.pos.dist(mainatom.pos);
				if (dist<rad) {
					this.createbond(atom,mainatom,-1.0,tension);
				}
			}
		}
	}


	createbox(cen,side,rad,type) {
		let pos=new Vector(cen);
		let atomcombos=1;
		let i,x,dim=this.dim;
		for (i=0;i<dim;i++) {atomcombos*=side;}
		let atomarr=new Array(atomcombos);
		for (let atomcombo=0;atomcombo<atomcombos;atomcombo++) {
			// Find the coordinates of the atom.
			let atomtmp=atomcombo;
			for (i=0;i<dim;i++) {
				x=atomtmp%side;
				atomtmp=Math.floor(atomtmp/side);
				pos[i]=cen[i]+(x*2-side+1)*rad;
			}
			atomarr[atomcombo]=this.createatom(pos,rad,type);
		}
		this.autobond(atomarr,Infinity);
	}


	update() {
		let next,link,steps=this.steps;
		let bondcount,bondarr;
		let rnd=this.rnd;
		let i,j;
		for (let step=0;step<steps;step++) {
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
				bondarr[i].obj.update();
			}
			// Collide atoms.
			this.broad.build();
			this.broad.collide();
		}
	}

}

