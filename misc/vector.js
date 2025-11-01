/*------------------------------------------------------------------------------


vector.js - v3.04

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Keep under 20kb, without header.
Array() is faster than Float64Array().
isNaN([1])=true


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


--------------------------------------------------------------------------------
Index


Vector
	constructor: int, array, Vector
	tostring()
	toString()
	set(v=0)
	copy() -> Vector
	// Comparison
	static cmp(u,v) -> {-1,0,1}
	static lt(u,v)
	static le(u,v)
	imin(v)
	min(v)
	imax(v)
	max(v)
	// Algebra
	ineg()
	neg()
	iadd(v)
	add(v)
	isub(v)
	sub(v)
	imul(s)
	mul(v)
	// Geometry
	dist2(v)
	dist(v)
	sqr()
	mag()
	normalize()
	norm()
	randomize()
	static random(dim)


Matrix
	constructor: [rows,cols], Matrix
	one()
	set(val=0)
	mul(b)
	det()
	inv()
	static fromangles(angs)
	rotate(angs)


Transform
	constructor: transform, mat, vec, dim, {mat,vec,dim,scale,ang}
	set(b)
	apply(point)
	inv()
	reset()
	shift(vec,apply=false)
	scalevec(muls)
	scalemat(muls)
	scale(muls)
	rotatevec(angs)
	rotatemat(angs)
	rotate(angs)


--------------------------------------------------------------------------------
TODO


Vector
	randomangle()

Matrix
	sanitize()
	tostring()
	row(i,v), col(i,v), get(x,y)
	add, sub, neg, det.
	Simplify permutation in matrix inv.

Test suite.
Article on division-free determinant.
Article on random angle generation.


*/
/* npx eslint vector.js -c ../../standards/eslint.js */
/* global Random */


//---------------------------------------------------------------------------------
// Vector - v3.04


export class Vector extends Array {

	static rnd=new Random();


	constructor(elem) {
		let arr=elem.length!==undefined;
		super(arr?elem.length:elem);
		this.set(arr?elem:0);
	}


	tostring() {return "["+this.join(", ")+"]";}
	toString() {return this.tostring();}


	sanitize(v) {
		// Converts v to a vector or throws an error.
		let len=this.length,vlen=v.length;
		if (vlen!==undefined) {
			if (vlen!==len) {throw `Incompatible lengths: ${len}, ${vlen}`;}
			return v;
		} else if (!isNaN(v)) {
			return (new Vector(len)).set(v);
		}
		throw `Unrecognized vector type: ${typeof v}`;
	}


	set(v=0) {
		let len=this.length,vlen=v.length;
		if (vlen!==undefined) {
			len=len<vlen?len:vlen;
			for (let i=0;i<len;i++) {this[i]=v[i];}
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


	static cmp(u,v) {
		// return -1, 0, 1
		let ulen=u.length,vlen=v.length;
		let len=ulen<vlen?ulen:vlen;
		for (let i=0;i<len;i++) {
			let x=u[i],y=v[i];
			if (x!==y) {return x<y?-1:1;}
		}
		if (ulen===vlen) {return 0;}
		return ulen<vlen?-1:1;
	}


	static lt(u,v) {return u.cmp(v)<0;}
	static le(u,v) {return u.cmp(v)<=0;}


	imin(v) {
		v=this.sanitize(v);
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {let x=u[i],y=v[i];u[i]=x<y?x:y;}
		return this;
	}


	min(v) {return this.copy().imin(v);}


	imax(v) {
		v=this.sanitize(v);
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {let x=u[i],y=v[i];u[i]=x>y?x:y;}
		return this;
	}


	max(v) {return this.copy().imax(v);}


	// ----------------------------------------
	// Algebra


	ineg() {
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]=-u[i];}
		return this;
	}


	neg() {return this.copy().ineg();}


	iadd(v) {
		// u+=v
		v=this.sanitize(v);
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]+=v[i];}
		return this;
	}


	add(v) {return this.copy().iadd(v);}


	isub(v) {
		// u-=v
		v=this.sanitize(v);
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]-=v[i];}
		return this;
	}


	sub(v) {return this.copy().isub(v);}


	imul(s) {
		// u*=s
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]*=s;}
		return this;
	}


	mul(v) {
		// dot or scalar product
		let u=this,len=this.length,vlen=v.length;
		if (vlen!==undefined) {
			if (vlen!==len) {throw `Incompatible lengths: ${len}, ${vlen}`;}
			let sum=0;
			for (let i=0;i<len;i++) {sum+=u[i]*v[i];}
			return sum;
		}
		let r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=u[i]*v;}
		return r;
	}


	// ----------------------------------------
	// Geometry


	dist2(v) {
		// (u-v)^2
		v=this.sanitize(v);
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i]-v[i];sum+=x*x;}
		return sum;
	}


	dist(v) {return Math.sqrt(this.dist2(v));}


	sqr() {
		// u*u
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i];sum+=x*x;}
		return sum;
	}


	mag() {return Math.sqrt(this.sqr());}


	normalize() {
		let u=this,len=this.length,mag=0,i,x;
		for (i=0;i<len;i++) {
			x=u[i];
			mag+=x*x;
		}
		if (mag>1e-10) {
			mag=1/Math.sqrt(mag);
			for (i=0;i<len;i++) {u[i]*=mag;}
		} else {
			this.randomize();
		}
		return this;
	}


	norm() {return this.copy().normalize();}


	randomize() {
		let u=this,len=this.length;
		if (!len) {return this;}
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


	static random(dim) {return (new Vector(dim)).randomize();}

}


export class Matrix extends Array {

	constructor(rows,cols) {
		// Expected: (dim), (rows,cols), (Matrix), or (array,[rows,cols])
		let val=0;
		if (rows instanceof Matrix) {val=rows;rows=val.rows;cols=val.cols;}
		else if (rows.length!==undefined) {val=rows;rows=cols[0];cols=cols[1];}
		else if (cols===undefined) {cols=rows;}
		super(rows*cols);
		this.rows=rows;
		this.cols=cols;
		this.set(val);
	}


	one() {
		this.set(0);
		let elem=this;
		let cols=this.cols,rows=this.rows;
		rows=rows<cols?rows:cols;
		for (let i=0;i<rows;i++) {elem[i*cols+i]=1;}
		return this;
	}


	set(val=0) {
		let elem=this;
		let elems=elem.length,vlen=val.length;
		if (vlen===undefined) {
			for (let i=0;i<elems;i++) {elem[i]=val;}
		} else {
			if (vlen!==elems) {throw `set length: ${elems}!=${vlen}`;}
			for (let i=0;i<elems;i++) {elem[i]=val[i];}
		}
		return this;
	}


	mul(b) {
		let aelem=this;
		let arows=this.rows,acols=this.cols;
		let aelems=this.length,belems=b.length;
		if (b.length===undefined) {
			// scalar
			let m=new Matrix(this);
			for (let i=0;i<aelems;i++) {m[i]*=b;}
			return m;
		} else if (!(b instanceof Matrix)) {
			// vector
			if (belems!==acols) {throw `mat*vec dimensions: ${acols}!=${belems}`;}
			let v=new Vector(arows),i=0;
			for (let r=0;r<arows;r++) {
				let sum=0;
				for (let c=0;c<acols;c++) {sum+=aelem[i++]*b[c];}
				v[r]=sum;
			}
			return v;
		}
		// matrix
		let brows=b.rows,bcols=b.cols,melems=arows*bcols;belems--;
		if (acols!==brows) {throw `A*B needs cols(A)=rows(B): ${acols}, ${brows}`;}
		let m=new Matrix(arows,bcols);
		let belem=b,melem=m;
		let aval=0,bval=0;
		for (let i=0;i<melems;i++) {
			// Multiply row r of A with column c of B.
			let sum=melem[i];
			while (bval<=belems) {
				sum+=aelem[aval]*belem[bval];
				aval++;
				bval+=bcols;
			}
			melem[i]=sum;
			bval-=belems;
			if (bval===bcols) {bval=0;}
			else {aval-=brows;}
		}
		return m;
	}


	det() {
		let rows=this.rows,cols=this.cols;
		if (rows!==cols) {return 0;}
		if (rows===0) {return 1;}
		// Copy the matrix. Use the upper triangular form to compute the determinant.
		let elem=new Matrix(this);
		let sign=0;
		for (let i=0;i<cols-1;i++) {
			// Find a row with an invertible element in column i.
			let dval=i*cols,sval=dval,j;
			let inv=NaN;
			for (j=i;j<rows;j++) {
				inv=1/elem[sval+i];
				if (inv>-Infinity && inv<Infinity) {break;}
				sval+=cols;
			}
			if (j===rows) {return 0;}
			if (sval!==dval) {
				sign^=1;
				for (let c=i;c<cols;c++) {
					let tmp=elem[sval+c];
					elem[sval+c]=elem[dval+c];
					elem[dval+c]=tmp;
				}
			}
			for (let c=i+1;c<cols;c++) {
				elem[dval+c]*=inv;
			}
			for (let r=i+1;r<cols;r++) {
				sval=r*cols;
				let mul=elem[sval+i];
				for (let c=i+1;c<cols;c++) {
					elem[sval+c]-=elem[dval+c]*mul;
				}
			}
		}
		// We have the matrix in upper triangular form. Multiply the diagonals to get the
		// determinant.
		let det=elem[0];
		for (let i=1;i<cols;i++) {
			det=det*elem[i*cols+i];
		}
		return sign?-det:det;
	}


	inv() {
		// Returns the multiplicative inverse of A.
		let rows=this.rows,cols=this.cols;
		if (rows!==cols) {throw `Can only invert square matrices: ${rows}, ${cols}`;}
		let ret=new Matrix(this);
		let elem=ret;
		let perm=new Array(cols);
		for (let i=0;i<cols;i++) {perm[i]=i;}
		for (let i=0;i<rows;i++) {
			// Find a row with an invertible element in column i.
			let dval=i*cols,sval=dval,j;
			let inv=NaN;
			for (j=i;j<rows;j++) {
				inv=1/elem[sval+i];
				if (inv>-Infinity && inv<Infinity) {break;}
				sval+=cols;
			}
			if (j===rows) {throw `Unable to find an invertible element.`;}
			// Swap the desired row with row i. Then put row i in reduced echelon form.
			if (sval!==dval) {
				for (let c=0;c<cols;c++) {
					let tmp=elem[sval+c];
					elem[sval+c]=elem[dval+c];
					elem[dval+c]=tmp;
				}
			}
			let tmp=perm[i];perm[i]=perm[j];perm[j]=tmp;
			// Put the row into reduced echelon form. Since entry (i,i)=1 and (i,i')=1*inv,
			// set (i,i)=inv.
			for (let c=0;c<cols;c++) {
				if (c!==i) {elem[dval+c]*=inv;}
			}
			elem[dval+i]=inv;
			// Perform row operations with row i to clear column i for all other rows in A.
			// Entry (j,i') will be 0 in the augmented matrix, and (i,i') will be inv, hence
			// (j,i')=(j,i')-(j,i)*(i,i')=-(j,i)*inv.
			for (let r=0;r<rows;r++) {
				if (r===i) {continue;}
				sval=r*cols;
				let mul=elem[sval+i];
				for (let c=0;c<cols;c++) {
					if (c!==i) {elem[sval+c]-=elem[dval+c]*mul;}
				}
				elem[sval+i]=-elem[dval+i]*mul;
			}
		}
		// Re-order columns due to swapped rows.
		let tmp=new Array(cols);
		for (let r=0;r<rows;r++) {
			let dval=r*cols;
			for (let i=0;i<cols;i++) {tmp[i]=elem[dval+i];}
			for (let i=0;i<cols;i++) {elem[dval+perm[i]]=tmp[i];}
		}
		return ret;
	}


	static fromangles(angs) {
		let dim=0,ang2=(angs.length??1)*2;
		while (dim*(dim-1)<ang2) {dim++;}
		return (new Matrix(dim,dim)).one().rotate(angs);
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
				let cs=Math.cos(angs[--a]);
				let sn=Math.sin(angs[  a]);
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


	constructor(params) {
		// Accepts: transform, mat, vec, dim, {mat,vec,dim,scale,ang}
		// Aliases: vec=pos, ang=angle
		// Parse what we're given.
		let mat=null,vec=null,dim=NaN;
		let scale=null,ang=null;
		if (params instanceof Transform) {
			mat=new Matrix(params.mat);
			vec=new Vector(params.vec);
		} else if (params instanceof Matrix) {
			mat=new Matrix(params);
		} else if ((params instanceof Vector) || params.length!==undefined) {
			vec=new Vector(params);
		} else if (!isNaN(params)) {
			dim=params;
		} else {
			mat=params.mat??null;
			vec=(params.vec??params.pos)??null;
			dim=params.dim??NaN;
			scale=params.scale??null;
			ang=(params.ang??params.angle)??null;
		}
		// Reconstruct what we're missing.
		if (isNaN(dim)) {
			if (vec!==null) {dim=vec.length;}
			else if (mat!==null) {dim=mat.rows;}
		}
		if (isNaN(dim)) {throw "no dimension";}
		if (vec===null) {vec=new Vector(dim);}
		if (mat===null) {mat=(new Matrix(dim)).one();}
		if (vec.length!==dim) {throw `vec dimension: ${vec.length}, ${dim}`;}
		if (mat.rows!==dim || mat.cols!==dim) {throw `mat dimensions: (${mat.rows},${mat.cols}), ${dim}`;}
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
		let mat=this.mat,vec=this.vec;
		if (!(point instanceof Transform)) {return mat.mul(point).iadd(vec);}
		return new Transform({mat:mat.mul(point.mat),vec:mat.mul(point.vec).iadd(vec)});
	}


	inv() {
		let inv=this.mat.inv();
		return new Transform({mat:inv,vec:inv.mul(this.vec).ineg()});
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


	scalemat(muls) {
		let mat=this.mat,dim=this.vec.length,dim2=dim*dim;
		if (muls.length===undefined) {muls=(new Array(dim)).fill(muls);}
		if (muls.length!==dim) {throw `Invalid dimensions: ${muls.length}, ${dim}`;}
		for (let i=0;i<dim2;i++) {mat[i]*=muls[(i/dim)|0];}
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


	lookat() {
		// https://math.stackexchange.com/questions/180418
		throw "not implemented";
	}

}
