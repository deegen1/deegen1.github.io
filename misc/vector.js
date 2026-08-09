/*------------------------------------------------------------------------------


vector.js - v3.15

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Keep under 20kb, without header.
Array() is faster than Float64Array().
isNaN([1])=true
(A*u)*b = u*(A^t*b)


--------------------------------------------------------------------------------
History


1.00
     Initial vector class.
1.06
     Fixed an infinite loop for 0-length vectors in vector.randomize().
2.00
     Added matrix class and mat-vec multiplication.
     Remade vector.mul() to accept scalars and vectors.
     Simplified vector add(), sub(), etc.
3.00
     Added transform class for affine transformations.
     Added vector comparison ops: cmp, min, max, imin, imax.
     Added matrix.inv().
     Vectors now check most inputs.
     Vector normalization returns NaNs instead of a random unit vector.
3.01
     Corrected Matrix.fromangles() when given a single number.
     Added matrix determinants.
3.02
     Added Transform.set().
3.03
     Transform.set allows Transform() init arguments.
     Transform.shift allows applying the matrix to the shift.
     Added aliases to Transform arguments.
3.04
     Normalize will once again return a random vector if mag<eps.
3.05
     Added index section and export.
3.07
     Added matrix transpose.
3.08
     Simplified Transform constructor.
3.09
     Added sanity checks to Transform constructor.
3.10
     Added Matrix.imul().
     Matrix.set() can now resize dimensions.
     Matrix.one() only writes to each element once.
     Removed dictionary debug checking from Transform constructor.
     Optimized scalemat().
3.11
     Slightly optimized mat*mat operations.
     Transform.apply() is 25% faster by removing duplicate allocations.
3.12
     Slightly optimized Matrix.inv() and det().
     Added Matrix.invert().
3.13
     Vector.set() now resizes.
3.14
     Removed Vector.sanitize(). Length checks are performed in each function.
     Vectors can be created without initializing. This is 5% to 20% faster.
     Matrices can be created without initializing.
3.15
     Fixed a bug when calling Matrix.set() on an array.


--------------------------------------------------------------------------------
TODO


Matrix
	tostring()
	row(i,v), col(i,v), get(x,y)
	add, sub, neg.

Transform
	lookat: https://math.stackexchange.com/questions/180418

Test suite.
Article on random angle generation.

det()
	// Unroll small matrices. This is 10x faster.
	if (dim<4) {
		let e=this;
		if (dim===0) {
			return 1;
		} else if (dim===1) {
			return e[0];
		} else if (dim===2) {
			return e[0]*e[3]-e[1]*e[2];
		} else {
			return e[0]*(e[4]*e[8]-e[5]*e[7])+
				  e[1]*(e[5]*e[6]-e[3]*e[8])+
				  e[2]*(e[3]*e[7]-e[4]*e[6]);
		}
	}

inv()
	// Unroll small matrices. This is 20% to 50% faster.
	let dim=this.rows;
	if (dim<4 && dim===this.cols) {
		let m=new Matrix(dim,dim,false),u=this;
		let det=0;
		if (dim===0) {
			det=1;
		} else if (dim===1) {
			det=u[0];
			m[0]=1/det;
		} else if (dim===2) {
			let a=u[0],b=u[1],c=u[2],d=u[3];
			det=a*d-b*c;
			m[0]= d/det;m[1]=-b/det;
			m[2]=-c/det;m[3]= a/det;
		} else {
			let a=u[0],b=u[1],c=u[2];
			let d=u[3],e=u[4],f=u[5];
			let g=u[6],h=u[7],i=u[8];
			let m0=e*i-f*h,m1=c*h-b*i,m2=b*f-c*e;
			let m3=f*g-d*i,m4=a*i-c*g,m5=c*d-a*f;
			let m6=d*h-e*g,m7=b*g-a*h,m8=a*e-b*d;
			det=a*m0+b*m3+c*m6;
			m[0]=m0/det;m[1]=m1/det;m[2]=m2/det;
			m[3]=m3/det;m[4]=m4/det;m[5]=m5/det;
			m[6]=m6/det;m[7]=m7/det;m[8]=m8/det;
		}
		if (!(det<-1e-10 || det>1e-10)) {
			throw `Unable to find an invertible element.`;
		}
		return m;
	}

apply()
	// This is called a lot, so unroll mat*point+vec.
	let dim=point.length;
	if (dim!==undefined) {
		if (dim!==avec.length) {throw `mat*vec dimensions: ${dim}!=${avec.length}`;}
		let v=new Vector(dim,false);
		for (let r=0,i=0;r<dim;r++) {
			let sum=0;
			for (let c=0;c<dim;c++) {sum+=amat[i++]*point[c];}
			v[r]=sum+avec[r];
		}
		return v;
	}


*/
/* npx eslint vector.js -c ../../standards/eslint.js */


import {Random} from "./library.js";


//---------------------------------------------------------------------------------
// Vector - v3.15


export class Vector extends Array {

	static rnd=new Random();


	constructor(elem,init=true) {
		let len=elem.length;
		super(len??elem);
		if (init) {this.set(len?elem:0);}
	}


	tostring() {return "["+this.join(", ")+"]";}
	toString() {return this.tostring();}


	set(v=0) {
		let len=this.length,vlen=v.length;
		if (vlen!==undefined) {
			if (len!==vlen) {this.length=vlen;}
			for (let i=0;i<vlen;i++) {this[i]=v[i];}
		} else if (!isNaN(v)) {
			for (let i=0;i<len;i++) {this[i]=v;}
		} else {
			throw `Unrecognized vector type: ${typeof v}`;
		}
		return this;
	}


	copy() {return new Vector(this);}


	// ----------------------------------------
	// Comparison


	cmp(v) {
		// return -1, 0, 1
		let ulen=this.length,vlen=v.length;
		let u=this;
		if (vlen!==undefined) {
			if (ulen!==vlen) {throw `Incompatible lengths ${ulen}!=${vlen}`;}
			for (let i=0;i<ulen;i++) {
				let x=u[i],y=v[i];
				if (x!==y) {return x<y?-1:1;}
			}
		} else {
			for (let i=0;i<ulen;i++) {
				let x=u[i];
				if (x!==v) {return x<v?-1:1;}
			}
		}
		return 0;
	}


	lt(u,v) {return u.cmp(v)<0;}
	le(u,v) {return u.cmp(v)<=0;}


	imin(v) {
		let ulen=this.length,vlen=v.length;
		let u=this;
		if (vlen!==undefined) {
			if (ulen!==vlen) {throw `Incompatible lengths ${ulen}!=${vlen}`;}
			for (let i=0;i<ulen;i++) {let x=u[i],y=v[i];u[i]=x<y?x:y;}
		} else {
			for (let i=0;i<ulen;i++) {let x=u[i];u[i]=x<v?x:v;}
		}
		return this;
	}


	min(v) {
		let ulen=this.length,vlen=v.length;
		let u=this,r=new Vector(ulen,false);
		if (vlen!==undefined) {
			if (ulen!==vlen) {throw `Incompatible lengths ${ulen}!=${vlen}`;}
			for (let i=0;i<ulen;i++) {let x=u[i],y=v[i];r[i]=x<y?x:y;}
		} else {
			for (let i=0;i<ulen;i++) {let x=u[i];r[i]=x<v?x:v;}
		}
		return r;
	}


	imax(v) {
		let ulen=this.length,vlen=v.length;
		let u=this;
		if (vlen!==undefined) {
			if (ulen!==vlen) {throw `Incompatible lengths ${ulen}!=${vlen}`;}
			for (let i=0;i<ulen;i++) {let x=u[i],y=v[i];u[i]=x>y?x:y;}
		} else {
			for (let i=0;i<ulen;i++) {let x=u[i];u[i]=x>v?x:v;}
		}
		return this;
	}


	max(v) {
		let ulen=this.length,vlen=v.length;
		let u=this,r=new Vector(ulen,false);
		if (vlen!==undefined) {
			if (ulen!==vlen) {throw `Incompatible lengths ${ulen}!=${vlen}`;}
			for (let i=0;i<ulen;i++) {let x=u[i],y=v[i];r[i]=x>y?x:y;}
		} else {
			for (let i=0;i<ulen;i++) {let x=u[i];r[i]=x>v?x:v;}
		}
		return r;
	}


	// ----------------------------------------
	// Algebra


	ineg() {
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]=-u[i];}
		return this;
	}


	neg() {
		let len=this.length;
		let u=this,r=new Vector(len,false);
		for (let i=0;i<len;i++) {r[i]=-u[i];}
		return r;
	}


	iadd(v) {
		// u+=v
		let ulen=this.length,vlen=v.length;
		if (ulen!==vlen) {throw `Incompatible lengths: ${ulen}!=${vlen}`;}
		let u=this;
		for (let i=0;i<ulen;i++) {u[i]+=v[i];}
		return this;
	}


	add(v) {
		let ulen=this.length,vlen=v.length;
		if (ulen!==vlen) {throw `Incompatible lengths: ${ulen}!=${vlen}`;}
		let u=this,r=new Vector(ulen,false);
		for (let i=0;i<ulen;i++) {r[i]=u[i]+v[i];}
		return r;
	}


	isub(v) {
		// u-=v
		let ulen=this.length,vlen=v.length;
		if (ulen!==vlen) {throw `Incompatible lengths: ${ulen}!=${vlen}`;}
		let u=this;
		for (let i=0;i<ulen;i++) {u[i]-=v[i];}
		return this;
	}


	sub(v) {
		let ulen=this.length,vlen=v.length;
		if (ulen!==vlen) {throw `Incompatible lengths: ${ulen}!=${vlen}`;}
		let u=this,r=new Vector(ulen,false);
		for (let i=0;i<ulen;i++) {r[i]=u[i]-v[i];}
		return r;
	}


	imul(s) {
		// u*=s
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]*=s;}
		return this;
	}


	mul(v) {
		// dot or scalar product
		let u=this;
		let ulen=this.length,vlen=v.length;
		if (vlen!==undefined) {
			if (ulen!==vlen) {throw `Incompatible lengths: ${ulen}!=${vlen}`;}
			let sum=0;
			for (let i=0;i<ulen;i++) {sum+=u[i]*v[i];}
			return sum;
		}
		let r=new Vector(ulen,false);
		for (let i=0;i<ulen;i++) {r[i]=u[i]*v;}
		return r;
	}


	// ----------------------------------------
	// Geometry


	dist2(v) {
		// (u-v)^2
		let u=this;
		let ulen=this.length,vlen=v.length;
		if (ulen!==vlen) {throw `Incompatible lengths: ${ulen}!=${vlen}`;}
		let sum=0;
		for (let i=0;i<ulen;i++) {let x=u[i]-v[i];sum+=x*x;}
		return sum;
	}


	dist(v) {return Math.sqrt(this.dist2(v));}


	sqr() {
		// u*u
		let u=this,len=this.length,sum=0;
		for (let i=0;i<len;i++) {let x=u[i];sum+=x*x;}
		return sum;
	}


	mag() {return Math.sqrt(this.sqr());}


	normalize() {
		// Normalize the vector.
		let u=this,len=this.length,mag=0;
		for (let i=0;i<len;i++) {
			let x=u[i];
			mag+=x*x;
		}
		if (mag>1e-10) {
			mag=1/Math.sqrt(mag);
			for (let i=0;i<len;i++) {u[i]*=mag;}
		} else {
			this.randomize();
		}
		return this;
	}


	norm() {
		// Return a new normal vector.
		let len=this.length,mag=0;
		let u=this,r=new Vector(len,false);
		for (let i=0;i<len;i++) {
			let x=u[i];
			mag+=x*x;
		}
		if (mag>1e-10) {
			mag=1/Math.sqrt(mag);
			for (let i=0;i<len;i++) {r[i]=u[i]*mag;}
		} else {
			r.randomize();
		}
		return r;
	}


	randomize() {
		let u=this,len=this.length;
		if (!len) {return this;}
		let mag=0,rnd=Vector.rnd;
		do {
			mag=0;
			for (let i=0;i<len;i++) {
				let x=rnd.getnorm();
				u[i]=x;
				mag+=x*x;
			}
		} while (mag<1e-10);
		mag=1.0/Math.sqrt(mag);
		for (let i=0;i<len;i++) {u[i]*=mag;}
		return this;
	}


	static random(dim) {return (new Vector(dim,false)).randomize();}

}


export class Matrix extends Array {

	static _perm=[];


	constructor(rows,cols,init=true) {
		// Expected: (dim), (rows,cols), (Matrix), or (array,[rows,cols])
		let val=0;
		if (rows instanceof Matrix) {val=rows;rows=val.rows;cols=val.cols;}
		else if (rows.length!==undefined) {val=rows;rows=cols[0];cols=cols[1];}
		else {cols=cols??rows;}
		super(rows*cols);
		this.rows=rows;
		this.cols=cols;
		if (init) {this.set(val);}
	}


	one() {
		let elem=this;
		let elems=this.length,cols=this.cols+1,c=0;
		for (let i=0;i<elems;i++) {
			let x=0;if (i===c) {x=1;c+=cols;}
			elem[i]=x;
		}
		return this;
	}


	set(val=0) {
		let elem=this;
		let rows=this.rows,cols=this.cols;
		let elems=rows*cols,vlen=val.length;
		if (vlen===undefined) {
			for (let i=0;i<elems;i++) {elem[i]=val;}
		} else if (val instanceof Matrix) {
			if (vlen!==elems) {elem.length=vlen;}
			this.rows=val.rows;
			this.cols=val.cols;
			for (let i=0;i<vlen;i++) {elem[i]=val[i];}
		} else {
			if (vlen!==elems) {throw `invalid array dimensions: ${vlen}!=${elems}`;}
			for (let i=0;i<vlen;i++) {elem[i]=val[i];}
		}
		return this;
	}


	mul(b) {
		let aelem=this;
		let arows=this.rows,acols=this.cols;
		let aelems=this.length,belems=b.length;
		if (belems===undefined) {
			// scalar
			let m=new Matrix(arows,acols,false);
			for (let i=0;i<aelems;i++) {m[i]=aelem[i]*b;}
			return m;
		} else if (!(b instanceof Matrix)) {
			// vector
			if (acols!==belems) {throw `mat*vec dimensions: ${acols}!=${belems}`;}
			let v=new Vector(arows,false);
			for (let r=0,i=0;r<arows;r++) {
				let sum=0;
				for (let c=0;c<acols;c++) {sum+=aelem[i++]*b[c];}
				v[r]=sum;
			}
			return v;
		}
		// matrix
		let bcols=b.cols,melems=arows*bcols;belems--;
		if (acols!==b.rows) {throw `A*B needs cols(A)=rows(B): ${acols}, ${b.rows}`;}
		let m=new Matrix(arows,bcols,false);
		let belem=b,melem=m;
		let aidx=0,bidx=0;
		for (let i=0;i<melems;i++) {
			// Multiply row r of A with column c of B.
			let sum=0;
			while (bidx<=belems) {
				sum+=aelem[aidx++]*belem[bidx];
				bidx+=bcols;
			}
			melem[i]=sum;
			bidx-=belems;
			if (bidx===bcols) {bidx=0;}
			else {aidx-=acols;}
		}
		return m;
	}


	imul(b) {
		if (b.length===undefined) {
			let elem=this;
			let elems=this.length;
			for (let i=0;i<elems;i++) {elem[i]*=b;}
		} else {
			this.set(this.mul(b));
		}
		return this;
	}


	det() {
		let dim=this.rows,cols=this.cols,elems=dim*dim;
		if (dim!==cols) {return 0;}
		// Copy the matrix. Use the upper triangular form to compute the determinant.
		let elem=new Matrix(this);
		let det=1;
		for (let i=0;i<dim;i++) {
			// Find a column with an invertible element on row i.
			let j=i+1,row=i*dim,stop=row+dim,swap=-1;
			let max=0,inv=0;
			for (let c=i;c<dim;c++) {
				let x=elem[row+c],a=x<0?-x:x;
				if (max<a) {
					max=a;
					inv=x;
					swap=c;
				}
			}
			det*=swap===i?inv:-inv;
			// We couldn't find an element, so det=0.
			if (swap<0) {break;}
			// Normalize the row.
			elem[row+swap]=elem[row+i];
			for (let c=row+j;c<stop;c++) {elem[c]/=inv;}
			// Row reduce the lower triangle.
			for (let e=j*dim;e<elems;e+=dim) {
				let mul=elem[e+swap];
				elem[e+swap]=elem[e+i];
				let dst=e+j,src=row+j;
				while (src<stop) {
					elem[dst++]-=elem[src++]*mul;
				}
			}
		}
		return det;
	}


	inv() {return (new Matrix(this)).invert();}


	invert() {
		// Returns the multiplicative inverse of A.
		let dim=this.rows,cols=this.cols;
		if (dim!==cols) {throw `Can only invert square matrices: ${dim}, ${cols}`;}
		let elem=this;
		let perm=Matrix._perm;
		if (perm.length<dim) {Matrix._perm=perm=new Array(dim);}
		// let perm=new Array(dim);
		for (let i=0;i<dim;i++) {
			// Find a column with an invertible element on row i.
			let row=i*dim,stop=row+dim,swap=-1;
			let max=1e-10,inv=0;
			for (let c=i;c<dim;c++) {
				let x=elem[row+c],a=x<0?-x:x;
				if (max<a) {
					max=a;
					inv=x;
					swap=c;
				}
			}
			if (swap<0) {throw `Unable to find an invertible element.`;}
			// Swap the desired column with i and put the row in reduced echelon form.
			// Since entry (i,i)=1 and (i,i')=1*inv, set (i,i)=inv.
			perm[i]=swap;
			elem[row+swap]=elem[row+i];
			elem[row+i]=1;
			for (let c=row;c<stop;c++) {elem[c]/=inv;}
			// Perform row operations with row i to clear column i for all other rows in A.
			// Entry (j,i') will be 0 in the augmented matrix, and (i,i') will be inv, hence
			// (j,i')=(j,i')-(j,i)*(i,i')=-(j,i)*inv.
			for (let r=0;r<dim;r++) {
				if (r===i) {continue;}
				let dst=r*dim,src=row;
				let mul=elem[dst+swap];
				elem[dst+swap]=elem[dst+i];
				elem[dst+i]=0;
				while (src<stop) {
					elem[dst++]-=elem[src++]*mul;
				}
			}
		}
		// Correct the row order to account for swapping columns.
		for (let r=dim-1;r>=0;r--) {
			let i=r*dim,j=perm[r]*dim,stop=i+dim;
			if (i===j) {continue;}
			while (i<stop) {
				let tmp=elem[i];
				elem[i++]=elem[j];
				elem[j++]=tmp;
			}
		}
		return this;
	}


	trans() {
		// Transpose.
		let rows=this.rows,cols=this.cols,elems=rows*cols;
		let ret=new Matrix(cols,rows,false);
		for (let i=0;i<elems;i++) {ret[i]=this[(i%rows)*cols+(~~(i/rows))];}
		return ret;
	}


	static fromangles(angs) {
		let dim=0,ang2=(angs.length??1)*2;
		while (dim*(dim-1)<ang2) {dim++;}
		return (new Matrix(dim,dim,false)).one().rotate(angs);
	}


	rotate(angs) {
		// Perform a counter-clockwise, right-hand rotation given n*(n-1)/2 angles. In 3D,
		// angles are expected in XYZ order.
		//
		// Rotation is about a plane, not along an axis. For a 2D space, we may only rotate
		// about the XY plane, thus there is 1 axis of rotation.
		if (angs.length===undefined) {angs=[angs];}
		let dim=this.rows,a=(dim*(dim-1))>>>1;
		if (dim!==this.cols || a!==angs.length) {
			throw `invalid dimensions: ${dim}, ${this.cols}, ${a}, ${angs.length}`;
		}
		let elem=this;
		for (let j=1;j<dim;j++) {
			for (let i=0;i<j;i++) {
				// We have
				// (i,i)=cos   (i,j)=-sin
				// (j,i)=sin   (j,j)=cos
				let ang=angs[--a];
				let cs=Math.cos(ang);
				let sn=Math.sin(ang);
				// For each row r:
				// (r,i)=(r,i)*cos+(r,j)*sin
				// (r,j)=(r,j)*cos-(r,i)*sin
				// (r,c)=(r,c) otherwise
				let i0=i,j0=j;
				for (let r=0;r<dim;r++) {
					let t0=elem[i0],t1=elem[j0];
					elem[i0]=t0*cs+t1*sn;
					elem[j0]=t1*cs-t0*sn;
					i0+=dim;
					j0+=dim;
				}
			}
		}
		return this;
	}

}


export class Transform {

	// mat*point+vec


	constructor(params,init=true) {
		// Accepts: Vector, Matrix, Transform, dim, {ang,dim,mat,scale,vec}
		// Parse what we're given.
		let mat=null,vec=null,dim=NaN;
		let scale=null,ang=null;
		if (params instanceof Transform) {
			mat=params.mat;
			vec=params.vec;
		} else if (params instanceof Matrix) {
			mat=params;
		} else if ((params instanceof Vector) || params.length!==undefined) {
			vec=params;
		} else if (!isNaN(params)) {
			dim=params;
		} else {
			// Pull attributes from a dict.
			mat=params.mat??null;
			vec=params.vec??null;
			dim=params.dim??NaN;
			scale=params.scale??null;
			ang=params.ang??null;
		}
		// Reconstruct what we're missing.
		if (isNaN(dim)) {
			if (vec) {dim=vec.length;}
			else if (mat) {dim=mat.rows;}
			else if (scale) {dim=scale.length??NaN;}
			if (isNaN(dim)) {throw "no dimension";}
		}
		if (!vec)      {vec=new Vector(dim);}
		else if (init) {vec=new Vector(vec);}
		if (!mat)      {mat=(new Matrix(dim,dim,false)).one();}
		else if (init) {mat=new Matrix(mat);}
		if (vec.length!==dim) {throw `vec dimension: ${vec.length}!=${dim}`;}
		if (mat.rows!==dim || mat.cols!==dim) {throw `mat dimensions: (${mat.rows},${mat.cols})!=${dim}`;}
		this.mat=mat;
		this.vec=vec;
		if (scale!==null) {this.scalemat(scale);}
		if (ang!==null) {this.rotatemat(ang);}
	}


	set(b) {
		if (!(b instanceof Transform)) {b=new Transform(b);}
		this.mat.set(b.mat);
		this.vec.set(b.vec);
		return this;
	}


	apply(point) {
		// (A.apply(B)).apply(P) = A.apply(B.apply(P))
		let amat=this.mat,avec=this.vec;
		let bmat=point.mat,bvec=point.vec;
		if (!bmat || !bvec) {return amat.mul(point).iadd(avec);}
		return new Transform({mat:amat.mul(bmat),vec:amat.mul(bvec).iadd(avec)},false);
	}


	inv() {
		let inv=this.mat.inv();
		return new Transform({mat:inv,vec:inv.mul(this.vec).ineg()},false);
	}


	reset() {
		this.mat.one();
		this.vec.set(0);
		return this;
	}


	shift(vec,apply=false) {
		if (apply) {vec=this.mat.mul(vec);}
		this.vec.iadd(vec);
		return this;
	}


	scalevec(muls) {
		let vec=this.vec,dim=vec.length;
		if (muls.length===undefined) {muls=(new Array(dim)).fill(muls);}
		if (muls.length!==dim) {throw `Invalid dimensions: ${muls.length}, ${dim}`;}
		for (let i=0;i<dim;i++) {vec[i]*=muls[i];}
		return this;
	}


	scalemat(mul) {
		// Accepts a scalar or dim sized array.
		let mat=this.mat;
		let dim=mul.length,vlen=this.vec.length;
		if (dim===undefined) {
			mat.imul(mul);
		} else if (dim!==vlen) {
			throw `Invalid dimensions: ${dim}, ${vlen}`;
		} else {
			let i=0,s=dim;
			for (let r=0;r<dim;r++) {
				let m=mul[r];
				while (i<s) {mat[i++]*=m;}
				s+=dim;
			}
		}
		return this;
	}


	scale(muls) {
		return this.scalevec(muls).scalemat(muls);
	}


	rotatevec(angs) {
		let rot=Matrix.fromangles(angs);
		this.vec.set(rot.mul(this.vec));
		return this;
	}


	rotatemat(angs) {
		let rot=Matrix.fromangles(angs);
		this.mat.set(rot.mul(this.mat));
		return this;
	}


	rotate(angs) {
		return this.rotatevec(angs).rotatemat(angs);
	}

}
