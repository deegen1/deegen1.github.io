/*------------------------------------------------------------------------------


vector.js - v1.06

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Keep under 20kb without header.
Array() is faster than Float64Array().

Matrix dimensions are given by (rows,cols). Coordinates are (r,c).
Let A=(Ar,Ac) and B=(Br,Bc), then AB=(Bc,Ac).
A*(B*(C*x))=(C*(B*A))*x
det(AB)=det(A)*det(B)
det(cA)=c^n*det(A)
det(A)!=0 iff rank(A)=n.
det()=1
Adding a multiple of one row to another will not change the determinant.
Swapping two rows will multiply the determinant by -1.
Multiplying a row by a constant c will multiply the determinant by c.
A matrix is orthogonal if A^-1=A^t.


--------------------------------------------------------------------------------
History


1.00
     Initial vector class.
1.06
     Fixed an infinite loop for 0-length vectors in vector.randomize().
2.00
     Added matrix class and mat-vec multiplication.
     Remade vector.mul() accept scalars and vectors.
     Simplified vector add(), sub(), etc.


--------------------------------------------------------------------------------
TODO


Add more matrix functions.
Add matrix.tostring().
Add vector.randomangle().
Dimesion checking?


*/
/* npx eslint vector.js -c ../../standards/eslint.js */
/* global Random */


//---------------------------------------------------------------------------------
// Vector - v2.00


class Vector extends Array {

	static rnd=new Random();


	constructor(elem) {
		let arr=elem.length!==undefined;
		super(arr?elem.length:elem);
		this.set(arr?elem:0);
	}


	tostring() {return "["+this.join(", ")+"]";}
	toString() {return this.tostring();}


	set(val=0) {
		let l=this.length,vl=val.length,i;
		if (vl!==undefined) {
			l=l<vl?l:vl;
			for (i=0;i<l;i++) {this[i]=val[i];}
		} else {
			for (i=0;i<l;i++) {this[i]=val;}
		}
		return this;
	}


	// ----------------------------------------
	// Algebra


	ineg() {
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]=-u[i];}
		return this;
	}


	neg() {return (new Vector(this)).ineg();}


	iadd(v) {
		// u+=v
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]+=v[i];}
		return this;
	}


	add(v) {return (new Vector(this)).iadd(v);}


	isub(v) {
		// u-=v
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]-=v[i];}
		return this;
	}


	sub(v) {return (new Vector(this)).isub(v);}


	imul(s) {
		// u*=s
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]*=s;}
		return this;
	}


	mul(v) {
		// dot or scalar product
		let u=this,len=this.length;
		if (v.length!==undefined) {
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
		if (mag<1e-10) {
			this.randomize();
		} else {
			mag=1.0/Math.sqrt(mag);
			for (i=0;i<len;i++) {u[i]*=mag;}
		}
		return this;
	}


	norm() {return (new Vector(this)).normalize();}


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


class Matrix extends Array {

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


	static fromangles(angs) {
		let dim=0,ang2=angs.length*2;
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
