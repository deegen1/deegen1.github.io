/*------------------------------------------------------------------------------


physics.js - v2.01

Copyright 2026 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Two bodies will only collide once per step.

en.wikipedia.org/wiki/Collision_response#Impulse-Based_Reaction_Model


--------------------------------------------------------------------------------
History


1.00
     Initial version. Spun off of atom engine.
1.02
     Bonds apply force before breaking.
1.03
     Added bonditer().
     Added Body.release().
     Fixed bodylist.release() in bond.release().
2.00
     Removed body.trans and added body.mat/body.pos. 26% faster.
     Remove body.inv matrix.
     Optimized bond contact calculation.
     New broadphase BVH traversal. Faster AABB calculation.
     2D Hull wrapping is more robust against degenerate polygons.
     Narrowphase now uses a linear time minkowski difference. 35% faster.
     Replaced static bonds with static friction. 23% faster.
     Added resting position if body doesn't move.
2.01
     Fixed inertia calculation.


--------------------------------------------------------------------------------
TODO


63.5ms - orig
48.0ms - removed body.trans
48.0ms - optimized bond contact calculation
45.4ms - New broadphase BVH traversal. Faster AABB calculation.
31.0ms - Narrowphase now uses a linear time minkowski difference.
22.1ms - Replaced static bonds with static friction. Added resting position.

Center of mass
	sim.volume = det(v1-v0,v2-v0,...)/n!
	cen_mass = (sim0.v0+sim0.v1+...)*sim0.volume
	         + (sim1.v0+sim1.v1+...)*sim1.volume
	         + ... / sum_volumes*(n+1)
	Account for rotation when nudging by CoM.

Hull Calc
	pick D closest points
	orient so no points are on one side
	add D-1 sides
	To build seed:
	1. Calc norm from [x,0,0,0] and find max.
	2. Calc norm from [x,y,0,0] and find max.
	3. Calc norm from [x,y,z,0] and find max.
	If point is on N-dim hull, then it'll be on N+1 dim hull.
	Once seed face is found, use edge to make other faces.
	Remove points too close.
	Remove points colinear.

Impulse
	N-D inertia tensor.
	N-D impulse calculation.
	Inertia shouldn't change if more verts are added on a face.
	o-----------o vs o---o---o---o

Collision
	Reduce steps from 4N to 3N.
	Always pick first segment of A, then find closest segment on B.
	Don't create new vectors, fill preexisting.


*/
/* npx eslint physics.js -c ../../../standards/eslint.js */


import {Random,Vector,Matrix,List} from "./library.js";


//---------------------------------------------------------------------------------
// Physics - v2.01


class PhyInteraction {

	constructor(a,b) {
		this.world=a.world;
		this.worldlink=this.world.intrlist.add(this);
		this.a=a;
		this.b=b;
		this.pmul=0;
		this.vmul=0;
		this.vpmul=0;
		this.friction=0;
		this.dt=NaN;
		this.push0=0;
		this.updateconstants();
	}


	updateconstants() {
		let a=this.a,b=this.b;
		this.pmul=(a.pmul+b.pmul)*0.5;
		this.vmul=a.vmul+b.vmul;
		this.vpmul=(a.vpmul+b.vpmul)*0.5;
		let friction=(a.friction+b.friction)*0.5;
		this.friction=friction>0?friction:0;
	}


	calcdt(dt) {
		if (this.dt===dt) {return;}
		this.dt=dt;
		let ipush=1-this.pmul;
		this.push0=ipush>0?1-Math.pow(ipush,dt):1;
	}


	static get(a,b) {
		if (a.type!==undefined) {a=a.type;}
		if (b.type!==undefined) {b=b.type;}
		return a.intarr[b.id];
	}

}


class PhyBodyType {

	constructor(world,id,damp,density,elasticity,friction,push) {
		this.world=world;
		this.worldlink=new List.Link(this);
		this.bodylist=new List();
		this.id=id;
		this.intarr=[];
		this.damp=damp;
		this.density=density;
		this.pmul=push;
		this.vmul=elasticity;
		this.vpmul=0.95;
		this.friction=friction;
		this.dt =NaN;
		this.dt0=0;
		this.dt1=0;
		this.dt2=0;
		this.gravity=null;
		this.data={};
	}


	release() {
		let id=this.id;
		let link=this.world.typelist.head;
		while (link!==null) {
			link.obj.intarr[id]=null;
			link=link.next;
		}
		this.bodylist.release(true);
		this.worldlink.remove();
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
		let damp=this.damp,idamp=1-damp;
		let dt0=0,dt1=0,dt2=0;
		if (damp<=1e-10) {
			// Special case damping=0: just integrate.
			dt0=1;
			dt1=dt;
			dt2=dt*dt*0.5;
		} else if (idamp<=1e-10) {
			// Special case damping=1: all velocity=0.
			// If dt=0 then time isn't passing, so maintain velocity.
			dt0=(dt>=-1e-20 && dt<=1e-20)?1:0;
			dt1=0;
			dt2=0;
		} else {
			// Normal case.
			let lnd=Math.log(idamp);
			dt0=Math.exp(dt*lnd);
			dt1=(dt0-1 )/lnd;
			dt2=(dt1-dt)/lnd;
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
		let inter=new PhyInteraction(a,b);
		while (a.intarr.length<=b.id) {a.intarr.push(null);}
		while (b.intarr.length<=a.id) {b.intarr.push(null);}
		a.intarr[b.id]=inter;
		b.intarr[a.id]=inter;
	}

}


class PhyBody {

	constructor(world,verts,pos,angle,type) {
		type=type??world.deftype;
		this.world=world;
		this.worldlink=world.bodylist.add(this);
		this.deleted=false;
		this.sleeping=false;
		this.bondlist=new List();
		this.typelink=type.bodylist.add(this);
		this.type=type;
		this.data={};
		let vertarr=[];
		this.volume=0;
		if (verts instanceof PhyBody) {
			let body=verts;
			verts=body.vertarr;
			this.volume=body.volume;
			type=type??body.type;
		}
		let dim=world.dim,dim2=(dim*(dim-1))>>>1;
		for (let v of verts) {vertarr.push(new Vector(v));}
		this.vertarr=vertarr;
		//this.facearr=[];
		this.type=type;
		this.pos=new Vector(pos);
		this.vel=new Vector(dim);
		this.spin=(new Float64Array(dim2)).fill(0);
		this.angle=(new Float64Array(dim2)).fill(0);
		if (angle) {for (let i=0;i<dim2;i++) {this.angle[i]=angle[i];}}
		this.mat=(new Matrix(dim)).one().rotate(this.angle);
		this.updateconstants();
		this.restpos=new Vector(this.pos);
	}


	release() {
		if (this.deleted) {return;}
		this.deleted=true;
		let link=null;
		while ((link=this.bondlist.head)!==null) {
			link.obj.release();
		}
		this.typelink.remove();
		this.worldlink.remove();
	}


	relpos(v) {return this.mat.mul(v).iadd(this.pos);}


	invpos(v) {
		// Since mat is orthonormal, inv(mat)=trans(mat).
		let pos=this.pos,mat=this.mat;
		let dim=pos.length;
		let w=new Vector(dim);
		for (let i=0;i<dim;i++) {
			let m=i*dim;
			let x=v[i]-pos[i];
			for (let j=0;j<dim;j++) {
				w[j]+=mat[m+j]*x;
			}
		}
		return w;
	}


	relvel(p) {
		let vel=this.vel,spin=this.spin[0];
		let x=vel[0]-p[1]*spin;
		let y=vel[1]+p[0]*spin;
		return new Vector([x,y]);
	}


	bonditer() {return this.bondlist.iter();}


	updateconstants(center=false) {
		// Calculate mass and inertia.
		let dim=this.world.dim,dim2=(dim*(dim-1))>>>1;
		let vertarr=this.vertarr;
		let verts=vertarr.length;
		let volume=0;
		let imat=new Matrix(dim2,dim2);
		if (verts===0) {
			volume=Infinity;
		} else if (dim!==2) {
			volume=1;
			let dist=0;
			for (let v of vertarr) {dist+=v.sqr();}
			for (let i=0;i<dim2;i++) {imat[i*dim2+i]=dist;}
		} else {
			// Given a set points, find the convex hull and sort counter-clockwise.
			// Start with the bottom-most, left-most vertex.
			let minx=Infinity,miny=Infinity;
			let mini=0;
			for (let i=0;i<verts;i++) {
				let v=vertarr[i],x=v[0],y=v[1];
				if (miny>y || (miny===y && minx>x)) {
					mini=i;
					miny=y;
					minx=x;
				}
			}
			// Wrap around to find the hull. Use the dot product's sign to ensure
			// consistent direction.
			let vidx=0;
			let dx=1,dy=0;
			do {
				let u=vertarr[mini],x0=u[0],y0=u[1];
				vertarr[mini]=vertarr[vidx];
				vertarr[vidx++]=u;
				// Point back to the start.
				mini=0;
				let dx0=minx-x0,dy0=miny-y0;
				let minmag=dx0*dx0+dy0*dy0;
				let mindot=(dx*dx0+dy*dy0)>0?1:0;
				for (let i=vidx;i<verts;i++) {
					let v=vertarr[i];
					let dx1=v[0]-x0,dy1=v[1]-y0;
					let mag=dx1*dx1+dy1*dy1;
					let crs=dx0*dy1-dy0*dx1;
					let dot=(dx*dx1+dy*dy1)>0?1:0;
					if (!(mag>1e-12)) {
						vertarr[i--]=vertarr[--verts];
					} else if (mindot<dot || (mindot===dot && (crs<0 || (crs===0 && minmag<mag)))) {
						minmag=mag;
						mindot=dot;
						dx0=dx1;
						dy0=dy1;
						mini=i;
					}
				}
				dx=dx0;
				dy=dy0;
			} while (mini>0);
			vertarr=vertarr.slice(0,vidx);
			verts=vidx;
			this.vertarr=vertarr;
			// Faces.
			//let facearr=[];
			//for (let i=0;i<verts;i++) {
			//	facearr.push([i,(i+1)%verts]);
			//}
			//this.facearr=facearr;
			// Zero on center of mass.
			let cenx=0,ceny=0;
			if (center) {
				volume=0;
				let v=vertarr[verts-1],x1=v[0],y1=v[1];
				for (let i=0;i<verts;i++) {
					v=vertarr[i];
					let x0=x1;x1=v[0];
					let y0=y1;y1=v[1];
					let xy=x0*y1-x1*y0;
					volume+=xy;
					cenx+=xy*(x0+x1);
					ceny+=xy*(y0+y1);
				}
				this.volume=volume*0.5;
				let den=1/(volume*3);
				if (volume<1e-10 || verts<3) {
					cenx=0,ceny=0;
					for (v of vertarr) {cenx+=v[0];ceny+=v[1];}
					den=1/verts;
				}
				cenx*=den;
				ceny*=den;
				this.pos[0]+=cenx;
				this.pos[1]+=ceny;
			}
			// Inertia and volume.
			volume=0;
			let inertia=0;
			let v=vertarr[verts-1];
			let x1=v[0]-cenx,y1=v[1]-ceny;
			for (let i=0;i<verts;i++) {
				v=vertarr[i];
				let x0=x1;x1=v[0]-cenx;v[0]=x1;
				let y0=y1;y1=v[1]-ceny;v[1]=y1;
				let xy=x0*y1-x1*y0;
				let xx=x0+x1,yy=y0+y1;
				volume +=xy;
				inertia+=xy*(xx*xx-x0*x1+yy*yy-y0*y1);
			}
			imat[0]=inertia/(volume*6);
			this.volume=volume*0.5;
		}
		this.mass=this.type.density*volume;
		this.inertia=imat;
		try {this.inertiainv=imat.inv();}
		catch {this.inertiainv=new Matrix(dim2,dim2);}
	}


	update() {
		// Move the body and apply damping to the velocity.
		// acc+=gravity
		// pos+=vel*dt1+acc*dt2
		// vel =vel*dt0+acc*dt1
		let world=this.world;
		let pos=this.pos,vel=this.vel;
		let dim=world.dim,type=this.type;
		let acc=type.gravity;
		acc=(acc===null?world.gravity:acc);
		let dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		const PI1=Math.PI,PI2=PI1*2;
		let spin=this.spin,ang=this.angle;
		let dim2=(dim*(dim-1))>>>1;
		// If we haven't moved much, fix the position. This needs to be done before
		// applying forces to allow the body to continue interacting with neighbors.
		let restpos=this.restpos;
		if (pos.dist2(restpos)<world.restdist) {
			pos.set(restpos);
		} else {
			restpos.set(pos);
		}
		// Position
		for (let i=0;i<dim;i++) {
			let v=vel[i],a=acc[i];
			pos[i]+=v*dt1+a*dt2;
			vel[i] =v*dt0+a*dt1;
		}
		// Spin.
		for (let i=0;i<dim2;i++) {
			let s=spin[i],a=ang[i]+s*dt1;
			a-=Math.floor(a/PI2)*PI2;
			spin[i]=s*dt0;
			ang[i]=a;
		}
		this.mat.one().rotate(ang);
	}


	static checkoverlap(a,b,acon,bcon) {
		let avert=a.vertarr,bvert=b.vertarr;
		let averts=avert.length,bverts=bvert.length;
		if (!averts || !bverts) {return false;}
		// Load transforms.
		let amat=a.mat,apos=a.pos;
		let amatxx=amat[0],amatxy=amat[1],amatx=apos[0];
		let amatyx=amat[2],amatyy=amat[3],amaty=apos[1];
		let adet=amatxx*amatyy-amatxy*amatyx;
		let bmat=b.mat,bpos=b.pos;
		let bmatxx=bmat[0],bmatxy=bmat[1],bmatx=bpos[0];
		let bmatyx=bmat[2],bmatyy=bmat[3],bmaty=bpos[1];
		let bdet=bmatxx*bmatyy-bmatxy*bmatyx;
		// Find start of A.
		let aidx=0,ainc=(adet>0?averts-1:1),acnt=averts;
		let ax0=0,ay0=Infinity;
		let ax1=0,ay1=0;
		let v=avert[0],x=v[0],y=v[1];
		let nx1=x*amatxx+y*amatxy;
		let ny1=x*amatyx+y*amatyy;
		for (let i=0,j=0;i<averts;i++) {
			j+=(j<ainc?averts:0)-ainc;
			v=avert[j];x=v[0];y=v[1];
			let nx0=nx1,ny0=ny1;
			nx1=x*amatxx+y*amatxy;
			ny1=x*amatyx+y*amatyy;
			if (ny0<ay0 || (ny0===ay0 && nx0<ax0)) {
				aidx=j;
				ax0=nx0;ax1=nx1;
				ay0=ny0;ay1=ny1;
			}
		}
		// Find start of B.
		let bidx=0,binc=(bdet>0?bverts-1:1),bcnt=bverts;
		let bx0=0,by0=-Infinity;
		let bx1=0,by1=0;
		v=bvert[0];x=v[0];y=v[1];
		nx1=x*bmatxx+y*bmatxy;
		ny1=x*bmatyx+y*bmatyy;
		for (let i=0,j=0;i<bverts;i++) {
			j+=(j<binc?bverts:0)-binc;
			v=bvert[j];x=v[0];y=v[1];
			let nx0=nx1,ny0=ny1;
			nx1=x*bmatxx+y*bmatxy;
			ny1=x*bmatyx+y*bmatyy;
			if (ny0>by0 || (ny0===by0 && nx0>bx0)) {
				bidx=j;
				bx0=nx0;bx1=nx1;
				by0=ny0;by1=ny1;
			}
		}
		// Build the Minkowski difference.
		let overlap=averts+bverts>3;
		let mindist=Infinity;
		let minax=0,minay=0;
		let minbx=0,minby=0;
		let offx=amatx-bmatx,offy=amaty-bmaty;
		let dx=1,dy=0;
		while (acnt>0 || bcnt>0) {
			// Between A and B, pick the left-most side next.
			let ax=ax0,ay=ay0,adx=ax1-ax0,ady=ay1-ay0;
			let bx=bx0,by=by0,bdx=bx0-bx1,bdy=by0-by1;
			let side=adx*bdy<ady*bdx?1:0;
			let asign=acnt?(dx*adx+dy*ady>0?1:0):-1;
			let bsign=bcnt?(dx*bdx+dy*bdy>0?1:0):-1;
			if (asign!==bsign) {side=bsign>asign?1:0;}
			if (!side) {
				acnt--;
				aidx+=(aidx<ainc?averts:0)-ainc;
				v=avert[aidx];x=v[0];y=v[1];
				ax0=ax1;ax1=x*amatxx+y*amatxy;
				ay0=ay1;ay1=x*amatyx+y*amatyy;
				dx=adx;dy=ady;
			} else {
				bcnt--;
				bidx+=(bidx<binc?bverts:0)-binc;
				v=bvert[bidx];x=v[0];y=v[1];
				bx0=bx1;bx1=x*bmatxx+y*bmatxy;
				by0=by1;by1=x*bmatyx+y*bmatyy;
				dx=bdx;dy=bdy;
			}
			let px=bx-ax-offx,py=by-ay-offy;
			if (px*dy>py*dx) {overlap=false;}
			// Find the closest point on the manifold segment to (0,0).
			let d=dx*dx+dy*dy;
			let u=px*dx+py*dy;
			u=u>0?(u<d?u/d:1):0;
			let ux=dx*u;px-=ux;
			let uy=dy*u;py-=uy;
			let dist=px*px+py*py;
			if (mindist>dist) {
				mindist=dist;
				if (side) {bx-=ux;by-=uy;}
				else      {ax+=ux;ay+=uy;}
				minax=ax;minay=ay;
				minbx=bx;minby=by;
			}
		}
		acon[0]=minax+amatx;acon[1]=minay+amaty;
		bcon[0]=minbx+bmatx;bcon[1]=minby+bmaty;
		return overlap;
	}


	/*closestpoint(point) {
		// Returns [overlapping, point] with a point on the border.
		let tmpvec=this.world.tmpvec;
		let acon=tmpvec[0],bcon=tmpvec[1];
		let a=this.anchor,b=this;
		a.vertarr[0].set(point);
		let col=PhyBody.checkoverlap(a,b,acon,bcon);
		return [col,new Vector(bcon)];
	}*/


	static collide(a,b) {
		if (a===b || a.deleted || b.deleted) {return;}
		let world=a.world;
		let dim=world.dim;
		let amass=b.mass,bmass=a.mass;
		let mass=amass+bmass;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10 || dim===0) {
			return;
		}
		amass=amass>=Infinity?1.0:amass/mass;
		bmass=bmass>=Infinity?1.0:bmass/mass;
		// Get the collision normal and contact points.
		let tmpvec=world.tmpvec;
		let acon=tmpvec[5],bcon=tmpvec[6];
		if (!PhyBody.checkoverlap(a,b,acon,bcon)) {
			return;
		}
		let norm=tmpvec[0];
		let push=0;
		let apos=a.pos,bpos=b.pos;
		for (let i=0;i<dim;i++) {
			let ac=acon[i],bc=bcon[i],x=ac-bc;
			norm[i]=x;
			push+=x*x;
			acon[i]=ac-apos[i];
			bcon[i]=bc-bpos[i];
		}
		if (push<1e-10) {return;}
		push=Math.sqrt(push);
		// Calculate normal and perpendicular collision forces.
		let vel=tmpvec[1];
		let avel=a.vel,bvel=b.vel;
		let aspin=a.spin,bspin=b.spin;
		vel[0] =avel[0]-acon[1]*aspin[0];
		vel[1] =avel[1]+acon[0]*aspin[0];
		vel[0]-=bvel[0]-bcon[1]*bspin[0];
		vel[1]-=bvel[1]+bcon[0]*bspin[0];
		let ndot=0;
		for (let i=0;i<dim;i++) {
			let n=norm[i]/push;
			norm[i]=n;
			ndot+=vel[i]*n;
		}
		// Friction vector.
		// perp=vel-norm*(norm*vel)
		let perp=tmpvec[4];
		let pmag=0;
		for (let i=0;i<dim;i++) {
			let x=vel[i]-norm[i]*ndot;
			perp[i]=x;
			pmag+=x*x;
		}
		if (pmag>1e-10) {
			pmag=Math.sqrt(pmag);
			for (let i=0;i<dim;i++) {perp[i]/=pmag;}
		} else {
			pmag=0;
		}
		// Elastic coefficient. If they're moving away, don't apply any force.
		let intr=a.type.intarr[b.type.id];
		let nmag=ndot>0?ndot:0;
		nmag=nmag*intr.vmul+push*intr.vpmul;
		push*=intr.push0;
		// If we have a callback, allow it to handle the collision.
		let callback=world.collcallback;
		if (callback!==null && !callback(intr,a,acon,b,bcon,norm,nmag,push)) {return;}
		// Normal
		let ainertia=amass*a.inertiainv[0],binertia=bmass*b.inertiainv[0];
		let ancross=acon[0]*norm[1]-acon[1]*norm[0];
		let bncross=bcon[0]*norm[1]-bcon[1]*norm[0];
		let nden=amass+bmass+ainertia*ancross*ancross+binertia*bncross*bncross;
		nmag/=nden;
		// Friction
		let apcross=acon[0]*perp[1]-acon[1]*perp[0];
		let bpcross=bcon[0]*perp[1]-bcon[1]*perp[0];
		let pden=amass+bmass+ainertia*apcross*apcross+binertia*bpcross*bpcross;
		pmag/=pden;
		let fric=nmag*intr.friction;
		pmag=pmag>-fric?pmag:-fric;
		pmag=pmag< fric?pmag: fric;
		// Apply forces
		for (let i=0;i<dim;i++) {
			let n=norm[i],tpos=n*push;
			let tvel=n*nmag+perp[i]*pmag;
			apos[i]-=amass*tpos;
			avel[i]-=amass*tvel;
			bpos[i]+=bmass*tpos;
			bvel[i]+=bmass*tvel;
		}
		aspin[0]-=ainertia*(ancross*nmag+apcross*pmag);
		bspin[0]+=binertia*(bncross*nmag+bpcross*pmag);
	}

}


class PhyBond {

	constructor(world,a,apos,b,bpos,dist,tension) {
		this.world=world;
		this.worldlink=world.bondlist.add(this);
		this.deleted=false;
		this.a=a;
		this.b=b;
		this.apos=new Vector(apos);
		this.bpos=new Vector(bpos);
		this.alink=a.bondlist.add(this);
		this.blink=b.bondlist.add(this);
		if (!(dist>=0)) {dist=this.relapos().dist(this.relbpos());}
		this.dist=dist;
		this.breakdist=Infinity;
		this.tension=tension;
		this.data={};
	}


	release () {
		if (this.deleted) {return;}
		this.deleted=true;
		this.alink.remove();
		this.blink.remove();
		this.worldlink.remove();
	}


	relapos() {return this.a.relpos(this.apos);}
	relbpos() {return this.b.relpos(this.bpos);}


	update() {
		// Pull two bodies toward eachother based on the distance and bond strength.
		// Vector operations are unrolled to use constant memory.
		let a=this.a,b=this.b;
		if (this.deleted || (a.sleeping && b.sleeping)) {return;}
		let amass=b.mass,bmass=a.mass;
		let mass=amass+bmass;
		let world=a.world;
		let dim=world.dim;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10 || dim===0) {
			return;
		}
		amass=amass>=Infinity?1.0:amass/mass;
		bmass=bmass>=Infinity?1.0:bmass/mass;
		// Get the distance and direction between the bodies.
		let tmpvec=world.tmpvec;
		let aloc=this.apos,bloc=this.bpos;
		let apos=a.pos,bpos=b.pos;
		let amat=a.mat,bmat=b.mat;
		let acon=tmpvec[1],bcon=tmpvec[2];
		let norm=tmpvec[0];
		let dist=0;
		let midx=0;
		for (let i=0;i<dim;i++) {
			// relative contact points
			let ac=0,bc=0;
			for (let j=0;j<dim;j++) {
				ac+=amat[midx  ]*aloc[j];
				bc+=bmat[midx++]*bloc[j];
			}
			acon[i]=ac;
			bcon[i]=bc;
			// norm
			let d=bc-ac+bpos[i]-apos[i];
			norm[i]=d;
			dist+=d*d;
		}
		dist=Math.sqrt(dist);
		// If the points are too far, break the bond.
		if (!(dist<this.breakdist)) {
			this.release();
			return;
		}
		// If the points are too close together, randomize the direction.
		let tension=this.tension;
		if (dist>1e-10) {
			// tension/=dist;
			for (let i=0;i<dim;i++) {norm[i]/=dist;}
		} else {
			norm.randomize();
		}
		// let ainertia=0,binertia=0;
		let ainertia=amass*a.inertiainv[0],binertia=bmass*b.inertiainv[0];
		let ancross=acon[0]*norm[1]-acon[1]*norm[0];
		let bncross=bcon[0]*norm[1]-bcon[1]*norm[0];
		let nden=amass+bmass+ainertia*ancross*ancross+binertia*bncross*bncross;
		tension/=nden;
		// Apply equal and opposite acceleration. Updating pos and vel in this
		// function, instead of waiting for body.update(), increases stability.
		let at=a.type,bt=b.type;
		let acc=(this.dist-dist)*tension;
		let aacc=acc*amass,aposmul=aacc*at.dt2,avelmul=aacc*at.dt1;
		let bacc=acc*bmass,bposmul=bacc*bt.dt2,bvelmul=bacc*bt.dt1;
		let avel=a.vel,bvel=b.vel;
		for (let i=0;i<dim;i++) {
			let dif=norm[i];
			apos[i]-=dif*aposmul;
			avel[i]-=dif*avelmul;
			bpos[i]+=dif*bposmul;
			bvel[i]+=dif*bvelmul;
		}
		// Apply rotation.
		ainertia*=ancross*acc;
		a.angle[0]-=ainertia*at.dt2;
		a.spin[0] -=ainertia*at.dt1;
		a.mat.one().rotate(a.angle);
		binertia*=bncross*acc;
		b.angle[0]+=binertia*bt.dt2;
		b.spin[0] +=binertia*bt.dt1;
		b.mat.one().rotate(b.angle);
	}

}


class PhyBroadphase {

	// BVH tree structure, S = 3+2*dim:
	//
	//      (2N-1)S  tree
	//      N        sorting
	//      (2D+1)N  leaf bounds
	//      N        rand tree
	//
	// Node structure:
	//
	//      0 flags
	//      1 parent
	//      2 right
	//      3 x min
	//      4 x max
	//      5 y min
	//        ...
	//
	// If flags&1: body_id=right
	// If flags&2: sleeping
	//
	// Center splitting.
	// Flat construction.


	constructor(world) {
		this.world=world;
		this.slack=0.05;
		this.bodycnt=0;
		this.bodyarr=null;
		this.memi32=[];
		this.memf32=null;
	}


	release() {
		this.bodyarr=null;
		this.bodycnt=0;
		this.memi32=[];
		this.memf32=null;
	}


	build() {
		// Build a bounding volume hierarchy for the bodies.
		//
		// During each step, find the axis with the largest range (x_max-x_min).
		// Sort the bodies by whether they're above or below the center of this range.
		let world=this.world;
		let dim=world.dim;
		let bodycnt=world.bodylist.count;
		if (!bodycnt) {
			this.bodycnt=0;
			return;
		}
		// Allocate working arrays.
		let dim2=2*dim,nodesize=3+dim2;
		let sortstart=nodesize*(bodycnt*2-1);
		let leafstart=sortstart+bodycnt;
		let treesize=leafstart+bodycnt*nodesize;
		let memi=this.memi32;
		if (memi.length<treesize) {
			memi=new Int32Array(treesize*2);
			this.memi32=memi;
			this.memf32=new Float32Array(memi.buffer);
			this.bodyarr=new Array(bodycnt*2);
		}
		let memf=this.memf32;
		// Store bodies and their bounds. body_id*2+sleeping.
		let slack=(1+this.slack)*0.5;
		let bodyarr=this.bodyarr;
		let bodylink=world.bodylist.head;
		bodycnt=0;
		while (bodylink) {
			let body=bodylink.obj;
			bodylink=bodylink.next;
			// Reject empty bodies.
			let varr=body.vertarr;
			let vlen=varr.length;
			if (!vlen) {continue;}
			let leafidx=leafstart+(1+dim2)*bodycnt;
			memi[leafidx++]=(bodycnt<<1)|(body.sleeping?1:0);
			memi[sortstart+bodycnt]=leafidx;
			bodyarr[bodycnt++]=body;
			// Find the bounding box of the transformed body.
			let pos=body.pos,mat=body.mat;
			for (let d=0;d<dim;d++) {
				let min=Infinity,max=-Infinity;
				let midx=d*dim;
				for (let i=0;i<vlen;i++) {
					let v=varr[i],x=0;
					for (let j=0;j<dim;j++) {x+=mat[midx+j]*v[j];}
					min=min<x?min:x;
					max=max>x?max:x;
				}
				let dev=(max-min)*slack;
				let cen=(max+min)*0.5+pos[d];
				min=cen-dev;
				max=cen+dev;
				// Reject bodies with degenerate coordinates.
				if (!(min<Infinity && max>-Infinity)) {
					bodycnt--;
					break;
				}
				memf[leafidx++]=min;
				memf[leafidx++]=max;
			}
		}
		this.bodycnt=bodycnt;
		if (!bodycnt) {return;}
		memi[1]=-1;
		memi[2]=sortstart+bodycnt;
		let workstop=nodesize*(bodycnt*2-1);
		let worklo=sortstart;
		for (let work=0;work<workstop;work+=nodesize) {
			// Pop the top working range off the stack.
			let workhi=memi[work+2],workcnt=workhi-worklo;
			if (workcnt===1) {worklo++;continue;}
			// Find the axis with the greatest range.
			let sortaxis=-1;
			let sortmin=-Infinity,sortval=-Infinity;
			for (let axis=0;axis<dim2;axis+=2) {
				let min=Infinity,max=-Infinity;
				for (let i=worklo;i<workhi;i++) {
					let node=memi[i]+axis;
					let x=memf[node];
					min=min<x?min:x;
					max=max>x?max:x;
				}
				// Handle min=max=inf.
				let val=max>min?max-min:0;
				val=val>=0?val:Infinity;
				if (sortval<val) {
					sortval=val;
					sortmin=min;
					sortaxis=axis;
				}
			}
			// Divide the nodes depending on if they're above or below the center.
			sortmin+=sortval*0.5;
			sortval=sortmin<Infinity?sortmin:3.40282347e+38;
			let sortdiv=worklo;
			for (let i=dim2?worklo:workhi;i<workhi;i++) {
				let node=memi[i];
				if (memf[node+sortaxis]<=sortval) {
					memi[i]=memi[sortdiv];
					memi[sortdiv++]=node;
				}
			}
			if (sortdiv<=worklo || sortdiv>=workhi) {sortdiv=worklo+(workcnt>>>1);}
			// Queue the divided nodes for additional processing.
			// Left follows immediately, right needs to be padded.
			let l=work+nodesize;
			let r=work+(sortdiv-worklo)*nodesize*2;
			memi[l+2]=sortdiv;
			memi[r+2]=workhi;
			memi[work+2]=r;
		}
		// Set parents and bounding boxes.
		for (let n=workstop-nodesize;n>=0;n-=nodesize) {
			let l=n+nodesize,r=memi[n+2],ndim=n+nodesize;
			if (r>=sortstart) {
				// Leaf
				l=memi[r-1];r=l;
				let a=memi[l-1];
				memi[n+2]=a>>>1; // body_idx
				memi[n  ]=((a&1)<<1)|1; // sleeping|is_leaf
			} else {
				// Parent
				memi[n  ]=memi[l]&memi[r]&2; // sleeping|is_parent
				memi[l+1]=n;l+=3;
				memi[r+1]=n;r+=3;
			}
			for (let i=n+3;i<ndim;i+=2) {
				let x=memf[l++],y=memf[r++];
				memf[i  ]=x<y?x:y;
				x=memf[l++];y=memf[r++];
				memf[i+1]=x>y?x:y;
			}
		}
	}


	collide() {
		// Check for collisions among leaves. Randomly reorder the tree to randomize
		// collision order.
		let bodycnt=this.bodycnt;
		if (bodycnt<=1) {return;}
		this.bodycnt=0;
		let nodesize=3+this.world.dim*2;
		let memi=this.memi32;
		let memf=this.memf32;
		let bodyarr=this.bodyarr;
		let collide=PhyBody.collide;
		// Skip traversal by setting node.parent to node.next.
		let randstart=nodesize*(bodycnt*2-1);
		let randend=randstart;
		let rnd=this.world.rnd;
		memi[1]=randstart<<2;
		for (let n=nodesize;n<randstart;n+=nodesize) {
			let flag=memi[n];
			// if root: next=end
			// if node=parent.right: next=parent.next
			// if node=parent.left : next=parent.right
			let next=memi[n+1];
			if (n===next+nodesize) {
				next=memi[next+2];
			} else {
				next=memi[next+1]>>>2;
			}
			if (flag&1) {
				let cnt=(++randend)-randstart;
				let j=randstart+rnd.mod(cnt);
				memi[randend-1]=memi[j];
				memi[j]=(n<<2)|flag;
			}
			memi[n+1]=(next<<2)|flag;
		}
		// Process leaves left to right.
		for (let n=randstart;n<randend;n++) {
			let node=memi[n],sleep=node&2;
			node>>>=2;
			let body=bodyarr[memi[node+2]];
			let nbnd=node+3,ndim=node+nodesize;
			node=memi[node+1]>>>2;
			while (node<randstart) {
				let next=memi[node+1];
				if (!(sleep&next)) {
					// Down - check for overlap.
					let u=nbnd,v=node+3;
					while (u<ndim && memf[u]<=memf[v+1] && memf[v]<=memf[u+1]) {u+=2;v+=2;}
					if (u===ndim) {
						if (!(next&1)) {node+=nodesize;continue;}
						else {collide(body,bodyarr[memi[node+2]]);}
					}
				}
				node=next>>>2;
			}
		}
	}

}


class PhyWorld {

	constructor(dim,gravity=0.2) {
		this.dim=dim;
		this.maxsteptime=1/180;
		this.rnd=new Random();
		this.tmpvec=[];
		for (let i=0;i<7;i++) {this.tmpvec.push(new Vector(dim));}
		this.gravity=new Vector(dim);
		this.gravity[dim-1]=gravity;
		this.typelist=new List();
		this.intrlist=new List();
		this.bodylist=new List();
		this.bondlist=new List();
		this.bondarr =[];
		this.broad=new PhyBroadphase(this);
		this.stepcallback=null;
		this.collcallback=null;
		this.data={};
		// Default type
		this.deftype=this.createbodytype();
		this.anchor=this.createbody([],new Vector(dim));
		this.anchor.worldlink.release();
	}


	release() {
		this.bodylist.release();
		this.typelist.release();
		this.intrlist.release();
		this.bodylist.release();
		this.broad.release();
	}


	bodyiter() {return this.bodylist.iter();}
	bonditer() {return this.bondlist.iter();}


	createbodytype(damp=0.02,density=1,elasticity=0.95,friction=0.25,push=1) {
		// Assume types are sorted from smallest to largest.
		// Find if there's any missing ID or add to the end.
		let link=this.typelist.head;
		let id=0;
		while (link!==null) {
			let nextid=link.obj.id;
			if (id<nextid) {break;}
			id=nextid+1;
			link=link.next;
		}
		let type=new PhyBodyType(this,id,damp,density,elasticity,friction,push);
		this.typelist.addbefore(type.worldlink,link);
		link=this.typelist.head;
		while (link!==null) {
			PhyBodyType.initinteraction(link.obj,type);
			link=link.next;
		}
		return type;
	}


	createbody(verts,pos,angle,type) {
		return new PhyBody(this,verts,pos,angle,type);
	}


	createbox(sides,pos,angle,type) {
		let vertarr=[];
		let dim=this.dim,verts=1<<dim;
		for (let i=0;i<verts;i++) {
			let v=new Vector(dim);
			for (let j=0;j<dim;j++) {v[j]=(((i>>>j)&1)*2-1)*sides[j];}
			vertarr.push(v);
		}
		return this.createbody(vertarr,pos,angle,type);
	}


	createsphere(rads,detail,pos,angle,type) {
		if (isNaN(detail) || detail<3) {throw "no detail";}
		if (!rads.length) {rads=[rads,rads];}
		let vertarr=[];
		for (let i=0;i<detail;i++) {
			let ang=Math.PI*2*i/detail;
			let v=new Vector([Math.cos(ang)*rads[0],Math.sin(ang)*rads[1]]);
			vertarr.push(v);
		}
		return this.createbody(vertarr,pos,angle,type);
	}


	findbonds(a,b) {
		// Return any bonds that exists between A and B.
		if (a.bondlist.count>b.bondlist.count) {
			let tmp=a;
			a=b;
			b=tmp;
		}
		let ret=[];
		let link=a.bondlist.head;
		while (link!==null) {
			let bond=link.obj;
			if (Object.is(bond.a,b) || Object.is(bond.b,b)) {
				ret+=[bond];
			}
			link=link.next;
		}
		return ret;
	}


	createbond(a,apos,b,bpos,dist,tension) {
		// Create a bond. If dist<0, use the current distance between the bodies.
		let bond=new PhyBond(this,a,apos,b,bpos,dist,tension);
		return bond;
	}


	update(time) {
		// Process the simulation in multiple steps if time is too large.
		if (time<1e-9 || isNaN(time)) {return;}
		let dt=this.maxsteptime;
		let restdist=this.gravity.mag()*dt*dt*3;
		this.restdist=restdist*restdist;
		let steps=time<=dt?1:Math.ceil(time/dt);
		if (steps<Infinity) {dt=time/steps;}
		let rnd=this.rnd;
		for (let step=0;step<steps;step++) {
			if (this.stepcallback!==null) {this.stepcallback(dt);}
			// Update types and interactions.
			let typelink=this.typelist.head;
			while (typelink!==null) {
				typelink.obj.updateconstants(dt);
				typelink=typelink.next;
			}
			let intrlink=this.intrlist.head;
			while (intrlink!==null) {
				intrlink.obj.calcdt(dt);
				intrlink=intrlink.next;
			}
			// Integrate bodies.
			let bodylink=this.bodylist.head;
			while (bodylink!==null) {
				bodylink.obj.update();
				bodylink=bodylink.next;
			}
			// Integrate bonds after bodies or vel will be counted twice.
			// Randomize the evaluation order to reduce oscillations.
			let bondcnt=this.bondlist.count;
			let bondarr=this.bondarr;
			if (bondarr.length<bondcnt) {
				bondarr=new Array(bondcnt*2);
				this.bondarr=bondarr;
			}
			let bondlink=this.bondlist.head;
			for (let i=0;i<bondcnt;i++) {
				let j=rnd.getu32()%(i+1);
				bondarr[i]=bondarr[j];
				bondarr[j]=bondlink.obj;
				bondlink=bondlink.next;
			}
			for (let i=0;i<bondcnt;i++) {
				bondarr[i].update();
			}
			// Collide bodies.
			this.broad.build();
			this.broad.collide();
		}
	}

}


const Phy={
	Intr:PhyInteraction,
	BodyType:PhyBodyType,
	Body:PhyBody,
	World:PhyWorld
};
export {Phy};

