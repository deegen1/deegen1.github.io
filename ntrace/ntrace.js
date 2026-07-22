/*

scene
	camera
mesh
	vert
	face
	(instance)
	transform
	material
material

Embed face data in BVH.


*/
/*
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

}
*/
