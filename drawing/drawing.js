/*------------------------------------------------------------------------------


drawing.js - v5.03

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


For editing use: https://yqnn.github.io/svg-path-editor
Use signed area for winding order.


--------------------------------------------------------------------------------
History


1.09
     Added DrawImage class.
1.10
     Added Draw.setimage and began using DrawImage instead of canvas.
     Added Draw.drawimage to perform basic blitting.
1.12
     BMP saving and loading.
     Compile constants in fillpath during runtime for speed.
1.13
     Added shortcuts to image blending (if alpha=1, etc) to be more efficient.
2.00
     fillpath only needs to track the beginning and end of lines, since the
     change in area between the ends will be constant (areadx1). This reduces
     the worst case complexity per row from width*n to 2*n.
     fillpath has also been simplified to use heaps instead of sorting by rows.
     This guarantees n*log(n) complexity for n lines.
2.01
     Switched from BMP to TGA for DrawImage.
2.02
     Changed DrawPath internal format. Added SVG (MZLC) path saving and loading.
     Curves are only split to lines if they're on screen.
2.03
     Added an embedded monospace font, font loading, and text rect calculation.
2.04
     Moved line object creation in fillpath to fillresize. Creating objects with
     all fields up front allows browsers to speed up fillpath by 30%.
3.00
     Added bounding boxes to DrawPath. This is turned into an OBB in fillpath to
     skip drawing paths in constant time if they're not on screen.
3.01
     fillpath now uses linear time heap construction.
3.02
     Added a webassembly version of fillpath. This is up to 2x the speed of
     javascript, but requires moving images to WASM sandboxed memory.
     Simplified curve segmentation by estimating length instead of quartering.
3.03
     Added relative paths to SVG parser (mzlc vs MZLC).
     Optimized WASM fillpath.
     Cleaned up AABB on screen detection in fillpath.
3.04
     Changed var to let.
3.05
     Added image PNG downloading.
3.06
     Curve segmentation now splits on distance from the segment rather than
     parameter spacing. This is more accurate with fewer segments.
     Simplified areadx1/areadx2 calculation. This is ~2% faster.
     Tested adding an areadx3 for thin lines, but it was slower.
3.07
     Removed WASM fillpath since it's not always faster anymore.
     DrawTransform creation can now handle {x,y,scale,...}.
     Draw.setcolor can now handle ints, arrays, and objects.
3.08
     Rescaled default font. Curve derivatives now match neighbors.
3.10
     Fixed TGA orientation when saving and loading.
3.11
     Corrected duplicate variable.
3.12
     Added getpixel(), setpixel(), and inttorgba().
     Fixed fromstring() parsing numbers as Z instead of L.
3.13
     Rendering to screen is now done with webgl, which is faster in firefox.
     Added screencanvas() and screenflip() to handle rendering.
     Removed ImageData and C8 types from images.
     Renamed savestate/loadstate to push/pop.
3.15
     Fixed error when parsing compressed SVG strings.
3.16
     Added H,h,V,v to fromstring().
3.18
     rgbatoint() and setcolor() now use the same formula.
3.19
     Simplified fromstring() and fixed float parsing for strings like: .1.2.3
3.20
     Replaced DrawTransform with vector library Transform.
3.21
     Switched to texSubImage2D.
3.22
     Removed addstrip() and added addpath().
     The DrawPath constructor can now handle other paths.
3.23
     drawimage() now supports non-integer coordinates with a 25% speed penalty.
3.25
     Switched to using modules.
3.26
     Reduced font size by 6kb and removed webgl renderer.
     Simplified oval and line paths.
3.27
     Subpaths are always closed in fillpath().
     Optimized curve segmentation to stop if offscreen.
     Winding order is dynamically determined by signed area calculation.
     Pixel area calculation is more robust and prevents rounding errors.
     AABB merged into DrawPath.
     Fixed close() not setting moveidx.
3.30
     Draw() now accepts canvas's as a constructor.
3.31
     rgbatoint() now assumes alpha=255.
     Fixed mixing up x and y in aabbupdate().
     Added transforms to path creation.
     fromstring() no longer relies on DrawPath to track vertex position.
     Simplified transforms in fillrect(), filloval(), etc.
3.32
     Renamed polygons to paths.
4.00
     drawimage() now applies transforms.
4.01
     Removed areadx1 calculation from drawimage(). 1kb smaller and 25% faster.
     Added DrawImage.loadfile().
4.02
     Improved drawimage() performance by 20% by simplifying area calculation.
     Added arcto() and replaced addoval().
     Added text alignment, tabs, and backspaces.
4.03
     Simplified miny/maxy clipping in drawimage().
5.00
     Added path tracing. Curves are converted to lines.
     Added pointinside() test.
5.01
     Reduced font size from 12,770 bytes to 9,292 bytes.
     Moved area calculation to addvert().
     Added traced rect and oval.
     fillpath() AABB overlap detection is smaller and computes [miny,maxy].
     Optimized curve segmentation memory access.
     Removed l.row field and improved y intercept calculations.
5.02
     Renamed arcto() to addarc(). Improved accuracy and reduced the number of
     curves needed.
5.03
     Reduced font size to 9,285 bytes. Realigned all neighboring curves to be
     continuous. Reduced maximum error from 1.8% to 0.4%.


--------------------------------------------------------------------------------
TODO


Keep drawing.js under 50kb, minus header.
Keep font under 10kb and 0.5% error.

Split object and world transforms.

Font
	textrect() iter and callback.

DrawPath
	Fix tracing for narrow edges.

fillpath
	Area accuracy
		Fix UnitAreaCalc() for large coordinates.
		Go back to clipping to unit rect, but branch by dy>1 and dx>1.
		Also split on (dxy>-1 && dxy<1) or on (abs(dx)>abs(dy)).
		Compare against python bigfloat or multiprecision.
		Pull out individual equations and test different forms for stability.
		All values should be |x|<=1 or |x|<=slope.
	AABB accuracy for small/large dx/dy.
	Since subpaths are always closed, remove subpaths if they're out of the
	image.
	Per-subpath color. "#" specifies colors for following segments.
	Simplify sa/da blending. Integer only? Rebalance for 255 vs 256.

DrawImage
	Make sure drawimagei() and drawimage() are 1-to-1.
	See if narrow dx/dy causes problems.
	Remove ceil() for srcmaxy. ceil(y)=h-~~(h-y)
	Create page describing algorithm. Transforming an image (the hard way).
	Faster pixel blending.


*/
/* npx eslint drawing.js -c ../../standards/eslint.js */


import {Transform} from "./library.js";


//---------------------------------------------------------------------------------
// Drawing - v5.03


class DrawPath {

	static MOVE =0;
	static CLOSE=1;
	static LINE =2;
	static CURVE=3;
	static _traceline =new Float64Array(2);
	static _tracecurve=new Float64Array(6);


	constructor(str,trans) {
		// Copy static variables.
		this.vertarr=new Array();
		this.begin();
		if (str) {
			if (str instanceof DrawPath) {this.addpath(str,trans);}
			else {this.fromstring(str,trans);}
		}
	}


	begin() {
		this.vertidx=0;
		this.area=0;
		this.area0=0;
		this.curve=3;
		this.move=null;
		this.minx= Infinity;
		this.maxx=-Infinity;
		this.miny= Infinity;
		this.maxy=-Infinity;
		return this;
	}


	update() {
		// Recompute the bounding box.
		let varr=this.vertarr,vidx=this.vertidx;
		this.begin();
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			this.addvert(v.type,v.x,v.y);
		}
	}


	apply(trans) {
		if (!trans) {return;}
		trans=new Transform(trans);
		let varr=this.vertarr,vidx=this.vertidx;
		this.begin();
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			let w=trans.apply([v.x,v.y]);
			this.addvert(v.type,w);
		}
	}


	addvert(type,x,y) {
		let m=this.move;
		if (!m && type) {throw "first vert not move: "+type;}
		if (type===1) {x=m.x;y=m.y;this.move=null;}
		else if (y===undefined) {y=x[1];x=x[0];}
		// Add to array.
		let idx=this.vertidx++;
		let arr=this.vertarr;
		if (idx>=arr.length) {
			arr.push({type:0,x:0,y:0});
		}
		let v=arr[idx];
		v.type=type;
		v.x=x;
		v.y=y;
		// Update AABB.
		if (this.minx>x) {this.minx=x;}
		if (this.maxx<x) {this.maxx=x;}
		if (this.miny>y) {this.miny=y;}
		if (this.maxy<y) {this.maxy=y;}
		// Update area.
		let w=null;
		let area=this.area0;
		if (type<1) {
			area=this.area;
			this.move=v;
		} else if (type<3) {
			w=arr[idx-1];
		} else if (!--this.curve) {
			this.curve=3;
			w=arr[idx-1];let p2x=w.x-x,p2y=w.y-y;
			w=arr[idx-2];let p1x=w.x-x,p1y=w.y-y;
			w=arr[idx-3];let p0x=w.x-x,p0y=w.y-y;
			area+=(p0x*(2*p1y+p2y)+p1x*(p2y-2*p0y)-p2x*(p1y+p0y))*0.3;
		}
		if (w!==null) {
			area+=w.x*y-w.y*x;
			// Pretend to close the subpath.
			this.area=x*m.y-y*m.x+area;
		}
		this.area0=area;
		return v;
	}


	moveto(x,y) {
		// Move the pen to [x,y].
		this.addvert(DrawPath.MOVE,x,y);
		return this;
	}


	lineto(x,y) {
		// Draw a line from the last vertex to [x,y].
		// If no moveto() was ever called, behave as moveto().
		this.addvert(this.move?DrawPath.LINE:DrawPath.MOVE,x,y);
		return this;
	}


	curveto(x0,y0,x1,y1,x2,y2) {
		// Draw a cubic bezier curve.
		if (!this.move) {this.moveto(0,0);}
		this.addvert(DrawPath.CURVE,x0,y0);
		this.addvert(DrawPath.CURVE,x1,y1);
		this.addvert(DrawPath.CURVE,x2,y2);
		return this;
	}


	close() {
		// Draw a line from the current vertex to our last moveto() call.
		if (this.move) {this.addvert(DrawPath.CLOSE);}
		return this;
	}


	tostring(precision=6) {
		// Converts the path to an SVG string.
		let p=precision;
		function tostring(x) {
			let s=x.toFixed(p);
			if (p>0) {
				let i=s.length;
				while (i>0 && s.charCodeAt(i-1)===48) {i--;}
				if (s.charCodeAt(i-1)===46) {i--;}
				s=s.substring(0,i);
			}
			return s;
		}
		let name=["M ","Z","L ","C "];
		let ret="";
		let varr=this.vertarr;
		for (let i=0;i<this.vertidx;i++) {
			let v=varr[i],t=v.type;
			ret+=(i?" ":"")+name[t];
			if (t!==DrawPath.CLOSE) {
				ret+=tostring(v.x)+" "+tostring(v.y);
			}
			if (t===DrawPath.CURVE) {
				v=varr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
				v=varr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
			}
		}
		return ret;
	}


	fromstring(str,trans) {
		// Parses an SVG path. Supports Z M L H V C.
		this.begin();
		let type=2,rel=0,len=str.length,i=0,c=0,move=0;
		let params=[0,48,48,16,32,63],v=[0,0,0,0,0,0,0,0];
		function gc() {c=i<len?str.charCodeAt(i++):-1;}
		gc();
		while (c>=0) {
			// If it's a number, repeat last type. Otherwise, determine if Zz Mm Ll Hh Vv Cc.
			if (c<45 || c>57 || c===47) {
				let l=c&32,h=c-l;
				gc();
				if      (h===90) {type=0;}
				else if (h===77) {type=1;}
				else if (h===76) {type=2;}
				else if (h===72) {type=3;}
				else if (h===86) {type=4;}
				else if (h===67) {type=5;}
				else {continue;}
				rel=l;
			}
			let p=params[type];
			for (let j=0;j<6;j++) {
				// Only parse floats if they're needed for this type. Format: \s*-?\d*(\.\d*)?
				let sign=1,mul=1,base=v[4+(j&1)],num=0;
				if ((p>>>j)&1) {
					base=rel?base:0;
					while (c<33) {gc();}
					if (c===45) {gc();sign=-1;}
					while (c>47 && c<58) {num=c-48+num*10;gc();}
					if (c===46) {gc();}
					while (c>47 && c<58) {mul/=10;num+=(c-48)*mul;gc();}
				}
				v[j]=sign*num+base;
			}
			move=move?4:2;
			if      (type<1) {this.close();type=1;move=0;}
			else if (type<2) {this.moveto(v[4],v[5]);type=2;move=2;}
			else if (type<5) {this.lineto(v[4],v[5]);}
			else {this.curveto(v[0],v[1],v[2],v[3],v[4],v[5]);}
			v[4^move]=v[6^move];v[5^move]=v[7^move];
		}
		this.apply(trans);
	}


	addpath(path,trans) {
		trans=new Transform(trans?trans:{dim:2});
		let varr=path.vertarr,vidx=path.vertidx;
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			let w=trans.apply([v.x,v.y]);
			this.addvert(v.type,w);
		}
		return this;
	}


	addrect(x,y,w,h) {
		return this.moveto(x,y).lineto(x+w,y).lineto(x+w,y+h).lineto(x,y+h).close();
	}


	addarc(x,y,ang0,ang1,xrad,yrad,lineto=false) {
		// Circular arc approximation.
		yrad=yrad??xrad;
		let turn=ang1-ang0;
		turn=turn<0?-turn:turn;
		turn=turn<Math.PI*2?turn:Math.PI*2;
		// Control point length.
		let segs=~~(turn/(Math.PI/2));
		segs=segs<3?segs+1:4;
		turn=(ang1<ang0?-turn:turn)/segs;
		let ang2=turn*turn;
		let proj=turn*(0.333338514+ang2*(0.006927896+ang2*0.000152242));
		let px=proj*xrad,py=proj*yrad;
		let c1=Math.cos(ang0),x1=c1*xrad+x;c1*=py;
		let s1=Math.sin(ang0),y1=s1*yrad+y;s1*=px;
		if (lineto) {this.lineto(x1,y1);}
		for (let s=0;s<segs;s++) {
			ang0+=turn;
			let c0=c1;c1=Math.cos(ang0);
			let s0=s1;s1=Math.sin(ang0);
			let x0=x1;x1=c1*xrad+x;c1*=py;
			let y0=y1;y1=s1*yrad+y;s1*=px;
			this.curveto(x0-s0,y0+c0,x1+s1,y1-c1,x1,y1);
		}
		return this;
	}


	addoval(x,y,xrad,yrad) {
		return this.addarc(x,y,0,Math.PI*2,xrad,yrad,true).close();
	}


	tracerect(x,y,w,h,outrad,inrad) {
		let or=outrad??1;
		let ir=inrad??-outrad;
		this.addrect(x-or,y-or,w+or*2,h+or*2);
		return this.addrect(x+w+ir,y-ir,-w-ir*2,h+ir*2);
	}


	traceoval(x,y,xrad,yrad,outrad,inrad) {
		let or=outrad??1;
		let ir=inrad??-outrad;
		this.addoval(x,y,xrad+or,yrad+or);
		return this.addoval(x,y,-xrad-ir,yrad+ir);
	}


	addline(x0,y0,x1,y1,rad) {
		// Line with round ends.
		let dx=x1-x0,dy=y1-y0;
		let dist=dx*dx+dy*dy;
		if (dist<1e-10) {
			x1=x0;
			y1=y0;
			dx=rad;
			dy=0;
		} else {
			rad/=Math.sqrt(dist);
			dx*=rad;
			dy*=rad;
		}
		let c=1.315739738,cx=c*dx,cy=c*dy;
		this.moveto(x1+dy,y1-dx);
		this.curveto(x1+dy+cx,y1-dx+cy,x1-dy+cx,y1+dx+cy,x1-dy,y1+dx);
		this.lineto(x0-dy,y0+dx);
		this.curveto(x0-dy-cx,y0+dx-cy,x0+dy-cx,y0-dx-cy,x0+dy,y0-dx);
		return this.close();
	}


	trace(outrad,inrad) {
		// Path tracing.
		outrad=outrad??0.5;
		inrad=inrad??-outrad;
		let out=new Draw.Path();
		let scale=(this.maxx-this.minx+this.maxy-this.miny)/1000;
		if (!(scale>1e-10)) {return out;}
		let curvemaxdist2=0.03*scale*scale;
		let maxext=Math.abs(outrad-inrad)+1e-10;
		let lv=DrawPath._traceline,cv=DrawPath._tracecurve;
		let li=0;
		function AddSeg(x,y) {
			if (li>=lv.length) {
				let nv=new Float64Array(li*2);
				nv.set(lv);
				lv=nv;
				DrawPath._traceline=lv;
			}
			lv[li++]=x;
			lv[li++]=y;
		}
		let varr=this.vertarr;
		let vidx=this.vertidx;
		let area=this.area;
		inrad=-inrad;
		let p3x=0,p3y=0,closed=0;
		for (let i=0;i<=vidx;i++) {
			let v=varr[i<vidx?i:0];
			let type=v.type;
			if (type===DrawPath.CURVE) {v=varr[i+2];}
			let p0x=p3x;p3x=v.x;
			let p0y=p3y;p3y=v.y;
			if (type===DrawPath.MOVE) {
				// Remove overlapping points.
				if (li>2) {
					let x0=lv[0],y0=lv[1];
					let ni=2;
					for (let j=2;j<li;j+=2) {
						let x1=lv[j  ],dx=x1-x0;
						let y1=lv[j+1],dy=y1-y0;
						if (dx*dx+dy*dy>1e-10) {
							lv[ni++]=x1;x0=x1;
							lv[ni++]=y1;y0=y1;
						}
					}
					li=ni;
					if (closed) {
						x0=lv[0];y0=lv[1];
						while (li>2) {
							let dx=lv[li-2]-x0;
							let dy=lv[li-1]-y0;
							if (dx*dx+dy*dy>1e-10) {break;}
							li-=2;
						}
					}
				}
				if (li===2) {
					// Single point.
					out.addoval(lv[0],lv[1],outrad,area<0?-outrad:outrad);
				} else if (li>2) {
					// Trace around line segments.
					for (let side=0;side<2;side++) {
						let rad=(side>0)===(area<0)?inrad:outrad;
						let i0=2,i1=0;
						if (side!==closed) {i1=li-2;i0=i1-2;}
						let x0=lv[i0],y0=lv[i0+1];
						let x1=lv[i1],y1=lv[i1+1];
						let dx1=x1-x0,dy1=y1-y0;
						let mag=Math.sqrt(dx1*dx1+dy1*dy1);
						dx1/=mag;dy1/=mag;
						for (let j=closed?0:2;j<li;j+=2) {
							let k=side?li-2-j:j;
							let dx0=dx1,dy0=dy1;
							x0=x1;x1=lv[k  ];dx1=x1-x0;
							y0=y1;y1=lv[k+1];dy1=y1-y0;
							mag=Math.sqrt(dx1*dx1+dy1*dy1);
							dx1/=mag;dy1/=mag;
							// Calculate projection.
							let dot=dx0*dx1+dy0*dy1;
							let den=dx0*dy1-dy0*dx1;
							let u=dot>0?0:maxext;
							if (den<-1e-5 || den>1e-5) {u=(dot-1)*rad/den;}
							// Miter if we need to.
							if (u<=-maxext || u>=maxext) {
								u=u<0?-maxext:maxext;
								out.lineto(x0-dy0*rad+dx0*u,y0+dx0*rad+dy0*u);
							}
							out.lineto(x0-dy1*rad-dx1*u,y0+dx1*rad-dy1*u);
						}
						if (side || closed) {out.close();}
					}
				}
				closed=0;
				li=0;
			} else if (type===DrawPath.CURVE) {
				// Segment the curve.
				v=varr[i++];let p1x=v.x,p1y=v.y;
				v=varr[i++];let p2x=v.x,p2y=v.y;
				let ci=0;
				while (true) {
					// Test if both control points are close to the line p0->p3.
					// Clamp to ends and filter degenerates.
					let dx=p3x-p0x,dy=p3y-p0y,den=dx*dx+dy*dy;
					let lx=p1x-p0x,ly=p1y-p0y;
					let u=dx*lx+dy*ly;
					u=u>0?(u<den?u/den:1):0;
					lx-=dx*u;ly-=dy*u;
					let d1=lx*lx+ly*ly;
					lx=p2x-p0x;ly=p2y-p0y;
					u=dx*lx+dy*ly;
					u=u>0?(u<den?u/den:1):0;
					lx-=dx*u;ly-=dy*u;
					let d2=lx*lx+ly*ly;
					d1=(d1>d2 || !(d1===d1))?d1:d2;
					if (!(d1>curvemaxdist2 && d1<Infinity)) {
						// Commit the current segment.
						if (!ci) {break;}
						AddSeg(p3x,p3y);
						p0x=p3x;p1x=cv[--ci];p2x=cv[--ci];p3x=cv[--ci];
						p0y=p3y;p1y=cv[--ci];p2y=cv[--ci];p3y=cv[--ci];
						continue;
					}
					// Split the curve in half. [p0,p1,p2,p3] = [p0,l1,l2,ph] + [ph,r1,r2,p3]
					let t1x=(p1x+p2x)*0.5,t1y=(p1y+p2y)*0.5;
					let r2x=(p2x+p3x)*0.5,r2y=(p2y+p3y)*0.5;
					let r1x=(t1x+r2x)*0.5,r1y=(t1y+r2y)*0.5;
					if (ci>=cv.length) {
						let nv=new Float64Array(ci*2);
						nv.set(cv);
						cv=nv;
						DrawPath._tracecurve=cv;
					}
					cv[ci++]=p3y;cv[ci++]=r2y;cv[ci++]=r1y;
					cv[ci++]=p3x;cv[ci++]=r2x;cv[ci++]=r1x;
					p1x=(p0x+p1x)*0.5;p1y=(p0y+p1y)*0.5;
					p2x=(p1x+t1x)*0.5;p2y=(p1y+t1y)*0.5;
					p3x=(p2x+r1x)*0.5;p3y=(p2y+r1y)*0.5;
				}
			} else if (type===DrawPath.CLOSE) {
				closed=1;
			}
			AddSeg(p3x,p3y);
		}
		return out;
	}


	pointinside(point,trans) {
		// Test if a point is in a path.
		let vidx=this.vertidx;
		if (!vidx) {return false;}
		// Put the point in path-space.
		let [px,py]=point;
		if (trans) {
			if (!(trans instanceof Transform)) {trans=new Transform(trans);}
			let mat=trans.mat,vec=trans.vec;
			let det=mat[0]*mat[3]-mat[1]*mat[2];
			if (!(det<-1e-10 || det>1e-10)) {return false;}
			let tx=px-vec[0],ty=py-vec[1];
			px=(tx*mat[3]-ty*mat[1])/det;
			py=(ty*mat[0]-tx*mat[2])/det;
		}
		if (px<this.minx || px>this.maxx || py<this.miny || py>this.maxy) {return false;}
		let p3x=0,p3y=0,movex=0,movey=0;
		let parity=0;
		let varr=this.vertarr;
		let intr=[0,0,0];
		for (let i=0;i<=vidx;i++) {
			let v=varr[i<vidx?i:0];
			let p0x=p3x,p0y=p3y;
			p3x=v.x-px;
			p3y=v.y-py;
			let p1x=p3x,p1y=p3y;
			if (v.type!==DrawPath.CURVE) {
				if (v.type===DrawPath.MOVE) {
					// Close any unclosed subpaths.
					p1x=movex;movex=p3x;
					p1y=movey;movey=p3y;
				}
				// Line test.
				if ((p0y<0)!==(p1y<0)) {parity+=(p0y>p1y)-(p0x*p1y<p1x*p0y);}
				continue;
			}
			// Find all u where y(u)=py.
			v=varr[++i];let p2x=v.x-px,p2y=v.y-py;
			v=varr[++i];p3x=v.x-px;p3y=v.y-py;
			if (!(((p0y<0)+(p1y<0)+(p2y<0)+(p3y<0))&3)) {continue;}
			let q1x=3*(p1x-p0x),q2x=3*(p0x+p2x-2*p1x),q3x=p3x-p0x+3*(p1x-p2x);
			let q1y=3*(p1y-p0y),q2y=3*(p0y+p2y-2*p1y),q3y=p3y-p0y+3*(p1y-p2y);
			// 3 possible solutions between [0,1] and dy(u)=0.
			let r=1;
			let u0=1,y0=p3y,tmp=0;
			let disc=q2y*q2y-3*q3y*q1y;
			if (disc>=0) {
				disc=Math.sqrt(disc);
				let a=(-q2y-disc)/(3*q3y);
				let b=(-q2y+disc)/(3*q3y);
				if (a>b) {tmp=a;a=b;b=tmp;}
				if (a>0 && a<1) {intr[r++]=a;}
				if (b>0 && b<1) {intr[r++]=b;}
			}
			// Binary search for y(u)=py.
			while (r>0) {
				let h=u0,l=u0=intr[--r];
				let y1=y0;y0=p0y+u0*(q1y+u0*(q2y+u0*q3y));
				if ((y0<0)===(y1<0)) {continue;}
				if (y0>y1) {l=h;h=u0;}
				for (let j=0;j<32;j++) {
					let u=(l+h)*0.5,y=p0y+u*(q1y+u*(q2y+u*q3y));
					if (y<0) {l=u;} else {h=u;}
				}
				let x=p0x+l*(q1x+l*(q2x+l*q3x));
				if (x<0) {parity+=y0>y1?1:-1;}
			}
		}
		return parity && ((parity>0)===(this.area>0));
	}

}


class DrawImage {
	// Pixel data is in R, G, B, A, R, G, B, A,... format.

	constructor(width,height) {
		let srcdata=null;
		if (height===undefined) {
			let img=width;
			if (width===undefined) {
				width=0;
				height=0;
			} else if ((typeof img)==="string") {
				this.loadfile(img);
				width=height=0;
			} else if (img instanceof DrawImage) {
				width=img.width;
				height=img.height;
				srcdata=img.data8;
			} else if (img instanceof HTMLCanvasElement) {
				width=img.width;
				height=img.height;
				srcdata=img.getContext("2d").createImageData(width,height).data;
			} else if (img instanceof ImageData) {
				width=img.width;
				height=img.height;
				srcdata=img.data;
			}
		}
		this.resize(width,height);
		if (srcdata!==null) {this.data8.set(srcdata);}
	}


	resize(width,height) {
		this.width=width;
		this.height=height;
		this.data8 =new Uint8Array(width*height*4);
		this.data32=new Uint32Array(this.data8.buffer);
	}


	loadfile(name) {
		let xml=new XMLHttpRequest();
		xml.open("GET",name,true);
		xml.responseType="arraybuffer";
		xml.onload=()=>{
			let buf=xml.response;
			if (buf) {this.fromtga(new Uint8Array(buf));}
			else {throw "can't open "+name;}
		};
		xml.send(null);
	}


	savefile(name) {
		// Save the image to a TGA file.
		let blob=new Blob([this.totga()]);
		let link=document.createElement("a");
		link.href=window.URL.createObjectURL(blob);
		link.download=name;
		link.click();
	}


	fromtga(src) {
		// Load a TGA image from an array.
		let len=src.length;
		if (len<18) {
			throw "TGA too short";
		}
		let w=src[12]+(src[13]<<8);
		let h=src[14]+(src[15]<<8);
		let bits=src[16],bytes=bits>>>3;
		if (w*h*bytes+18>len || src[2]!==2 || (bits!==24 && bits!==32)) {
			throw "TGA corrupt";
		}
		// Load the image data.
		this.resize(w,h);
		let dst=this.data8;
		let didx=0,dinc=0,sidx=18,a=255;
		if (!(src[17]&32)) {didx=(h-1)*w*4;dinc=-w*8;}
		for (let y=0;y<h;y++) {
			for (let x=0;x<w;x++) {
				dst[didx+2]=src[sidx++];
				dst[didx+1]=src[sidx++];
				dst[didx+0]=src[sidx++];
				if (bytes===4) {a=src[sidx++];}
				dst[didx+3]=a;
				didx+=4;
			}
			didx+=dinc;
		}
	}


	totga() {
		// Returns a Uint8Array with TGA image data.
		let w=this.width,h=this.height;
		if (w>0xffff || h>0xffff) {throw "Size too big: "+w+", "+h;}
		let didx=18,sidx=0;
		let dst=new Uint8Array(w*h*4+didx),src=this.data8;
		dst.set([0,0,2,0,0,0,0,0,0,0,0,0,w&255,w>>>8,h&255,h>>>8,32,40],0,didx);
		for (let y=0;y<h;y++) {
			for (let x=0;x<w;x++) {
				dst[didx++]=src[sidx+2];
				dst[didx++]=src[sidx+1];
				dst[didx++]=src[sidx+0];
				dst[didx++]=src[sidx+3];
				sidx+=4;
			}
		}
		return dst;
	}


	todataurl() {
		// Returns a data string for use in <img src="..."> objects.
		let canv=document.createElement("canvas");
		let width=this.width,height=this.height;
		canv.width=width;
		canv.height=height;
		let imgdata=new ImageData(new Uint8ClampedArray(this.data8.buffer),width,height);
		canv.getContext("2d").putImageData(imgdata);
		let strdata=canv.toDataURL("image/png");
		canv.remove();
		return strdata;
	}


	getpixel(x,y) {
		if (x<0 || x>=this.width || y<0 || y>=this.height) {
			throw `invalid pixel: ${x}, ${y}`;
		}
		return this.data32[y*this.height+x];
	}


	setpixel(x,y,rgba) {
		if (x<0 || x>=this.width || y<0 || y>=this.height) {
			throw `invalid pixel: ${x}, ${y}`;
		}
		this.data32[y*this.height+x]=rgba;
	}

}


class DrawFont {

	static deffont=`monospace
		none
		1000
		SPC 553
		! 553 M339 692c0-86-128-86-128 1 0 84 128 86 128-1ZM238 560h76L327 54H224Z
		" 553 M332 284h81L426 54H318Zm-191 0h81L235 54H127Z
		# 553 M173 106h72L228 268H354l17-162h73L426 268H532v64H420L403 504H506v64H397L378 748H305l19-180H199L180 748H107l19-180H21V504H132l18-172H46V268H156Zm49 226-17 172H330l18-172Z
		$ 553 M291 14h71l-13 95c41 4 70 9 100 16l-1 76c-33-9-57-13-108-20L312 395c281 74 217 350-47 351L248 864H177l16-117c-44-3-98-11-139-21l1-82c46 17 92 23 148 28l30-225C-44 375 37 107 278 109ZM268 184c-130-6-173 133-24 180Zm7 486c153 1 177-155 24-190Z
		% 553 M461 55l83-2L91 747l-81 1ZM18 198C18-2 282-5 282 189c0 199-264 207-264 9Zm72-2c0 112 119 112 119-2C209 76 90 82 90 196ZM271 614c0-203 265-205 265-12 0 202-265 205-265 12Zm72-4c-1 116 122 109 121-4-1-113-120-112-121 4Z
		& 553 M396 553c11-24 23-83 20-140h87c0 59-8 138-49 211l99 124H440l-44-54C309 786 28 796 28 573c0-121 90-168 122-190C35 263 69 68 257 68c194 0 226 240 12 325ZM227 340c149-64 116-200 29-200-103 0-110 122-29 200Zm-34 99C23 548 162 784 349 634Z
		' 553 M234 284h85L333 54H221Z
		( 553 M376 17C71 293 70 682 374 953l52-52C167 652 174 308 426 68Z
		) 553 M127 903c253-239 257-586 1-833l50-53c305 272 304 661-1 937Z
		* 553 M242 54h70L299 222l140-94 33 61-150 74 150 73-33 58-138-91 11 168H242l10-168-141 91-30-58 151-74L81 187l33-58 139 92Z
		+ 553 M235 244h84V443H512v75H319V718H234l1-200H41V443H234Z
		, 553 M117 916c286 1 284-326 151-326-51 0-68 40-68 65 0 50 46 57 46 110 0 68-85 86-129 84Z
		- 553 M130 441H423v80H130Z
		. 553 M354 677c0 103-162 109-162-1 0-110 162-109 162 1Z
		/ 553 M393 54h82L138 854H57Z
		0 553 M420 364c37 412-245 365-271 202ZM132 484C101 73 379 132 402 284ZM281 97C72 97 6 334 62 586c52 234 380 230 430-16 50-246-6-473-211-473Z
		1 553 M66 210l32 73 154-84V668H86v80H490V668H346V103H271Z
		2 553 M122 238c90-99 246-89 246 50 0 111-59 144-296 384v76H495V667H186L352 501c83-83 158-210 72-333-86-123-290-66-349 14Z
		3 553 M98 198C444 80 406 382 248 382H159v70h96c201 0 224 302-175 217v78c473 83 486-312 263-339C525 345 506 4 98 121Z
		4 553 M106 531 330 189V531Zm-85 0v75H330V748h88V606H527V531H418V106H295Z
		5 553 M99 106H445v75H179V361h77c357 0 282 479-169 387V670c364 90 373-236 163-236H99Z
		6 553 M151 464c97-58 263-78 263 89 0 178-290 214-263-89ZM453 106H388C173 106 60 225 60 471c0 211 89 286 218 286 337 0 300-552-128-367 5-158 111-209 230-209h73Z
		7 553 M57 106H491v80L223 748H125L404 185H57Z
		8 553 M280 97c272 0 239 257 77 315 203 77 191 345-86 345C-6 757 5 489 198 419 9 349 30 97 280 97Zm5 276c145-55 151-205-9-205-153 0-163 147 9 205Zm-15 85c-161 60-161 226 8 226 161 0 176-160-8-226Z
		9 553 M89 673h64c146 0 245-57 249-209C-30 648-58 97 272 97c155 0 220 120 220 292 0 258-128 359-350 359H88ZM400 392c31-300-261-273-261-91 0 174 174 141 261 91Z
		: 553 M351 322c0 99-150 99-150-1 0-97 150-101 150 1Zm0 360c0 100-150 99-149-1 1-100 149-98 149 1Z
		; 553 M351 321c0-98-149-100-149 1 0 98 149 100 149-1ZM123 916c286 1 283-326 152-326-55 0-69 43-69 65 0 51 46 56 46 112 0 69-97 86-129 81Z
		< 553 M398 205l53 55L183 479 451 702l-54 54L67 480Z
		= 553 M65 359H488v72H65Zm0 171H488v72H65Z
		> 553 M103 260 370 481 103 702l53 54L486 480 155 205Z
		? 553 M303 692c0-87-128-84-128 0 0 85 128 87 128 0ZM149 131c265-8 246 241 133 241H197l6 188h73l5-122C544 438 513 41 149 55Z
		@ 553 M421 291 379 585c-15 105 98 129 98-173 0-194-45-304-161-304C175 108 74 334 74 577c0 289 124 376 343 275v66C117 1025 5 871 5 574 5 271 140 48 318 48c141 0 228 103 228 353 0 445-243 310-227 248-28 86-181 119-181-67 0-207 89-330 223-275Zm-88 82C197 250 171 845 300 592Z
		A 553 M275 186 383 530H166Zm-57-80L5 748H96l45-141H408l45 141h95L338 106Z
		B 553 M165 453h94c210 0 178 221 27 221H165Zm0-273H277c152 0 144 200-12 200H165ZM78 106V748H250c321 0 302-321 117-341 135-19 189-301-90-301Z
		C 553 M489 128C288 47 45 118 45 438c0 260 162 374 443 291l1-82C167 760 138 534 138 426c0-117 52-335 351-216Z
		D 553 M141 672V180h79c171 0 205 107 205 249 0 161-73 243-217 243ZM54 106V748H192c153 0 325-57 325-327 0-152-46-315-298-315Z
		E 553 M464 106v74H186V378H453v74H186V673H464v75H99V106Z
		F 553 M463 106v75H190V389H449v73H190V748H101V106Z
		G 553 M494 215C248 103 124 246 124 424c0 73 5 311 287 243V462H280V390H497V719C178 836 31 664 31 433 31 247 159 12 494 128Z
		H 553 M412 106h87V748H412V453H142V748H55V106h87V377H412Z
		I 553 M84 106H469v74H321V673H469v75H84V673H232V180H84Z
		J 553 M98 182H342V552c0 164-159 144-252 80v88c120 67 341 53 341-174V106H98Z
		K 553 M77 106h87V405L399 106H503L250 411 514 748H404L164 433V748H77Z
		L 553 M114 106h89V673H484v75H114Z
		M 553 M24 748h83l14-534L240 539h61L426 200l18 548h85L498 106H391L273 424 159 106H56Z
		N 553 M58 106H171L414 624V106h81V748H381L140 230V748H58Z
		O 553 M277 174c165 0 179 233 141 385-39 156-238 164-278 16-50-185-13-401 137-401Zm9-77C52 97-2 349 42 569c50 250 408 260 470-19C548 388 530 97 286 97Z
		P 553 M165 443V179H268c193 0 186 264-2 264ZM78 106V748h87V518h89c311 0 340-412 17-412Z
		Q 553 M553 876c-89 82-314 75-323-123C32 734-9 465 57 259c66-206 383-234 449 8 54 198 7 457-194 486 19 136 172 101 201 61ZM276 680c159 0 180-232 145-379-40-168-251-178-290 17-24 120-24 362 145 362Z
		R 553 M171 392V180h97c148 0 150 212-18 212ZM83 106V748h88V462h34c106 0 97 51 213 286h98C399 506 389 464 328 441c179-24 217-335-61-335Z
		S 553 M448 117C182 51 62 160 62 273c0 204 336 165 336 309 0 146-274 93-344 68v86c330 69 436-44 436-161 0-206-336-171-336-309 0-104 147-110 294-72Z
		T 553 M42 106H511v75H321V748H232V181H42Z
		U 553 M54 106V561c0 275 446 259 446-16V106H413V542c0 199-272 176-272 24V106Z
		V 553 M101 106 279 663 458 106h93L333 748H215L2 106Z
		W 553 M104 106l33 554L245 323h61L423 657l30-551h78L488 748H374L273 454 176 748H66L22 106Z
		X 553 M130 106 276 347 425 106H525L328 416 541 748H430L275 488 118 748H9L222 420 26 106Z
		Y 553 M0 106 232 516V748h89V519L553 106H453L281 431 106 106Z
		Z 553 M64 106H492v68L164 667H498v81H55V682L384 185H64Z
		[ 553 M169 37H412v69H251V880H412v69H169Z
		\\ 553 M79 54h81L497 854H415Z
		] 553 M141 106H301V880H141v69H384V37H141Z
		^ 553 M60 420h77L271 173 412 420h86L309 106H239Z
		_ 553 M0 878H553v71H0Z
		\` 553 M243 173h85L209 54H85Z
		a 553 M386 524v88C151 820 66 524 268 524ZM107 354c202-75 279-21 279 60v45H267C-78 459 51 930 394 691l1 57h77V408c0-190-216-182-365-131Z
		b 553 M164 425c286-382 382 410 0 236ZM78 720c252 91 422-3 422-229 0-320-264-276-338-156l3-281H78Z
		c 553 M462 353C78 166 53 835 462 651v79C-73 912-37 95 462 272Z
		d 553 M386 568C112 974 2 172 386 342Zm0-309C134 207 53 369 53 509c0 317 258 290 339 144l4 95h76V54H386Z
		e 553 M147 529c2 222 257 147 322 137v69C126 817 57 661 57 500c0-350 494-341 433 29Zm259-66c13-191-249-208-258 0Z
		f 553 M516 60C271 13 198 110 198 244v83H39v71H198V748h87V398H501V327H285V242c0-125 83-141 231-108Z
		g 553 M513 255v70H437c90 166-70 318-271 240C49 764 511 552 511 798c0 52-43 156-244 156-303 0-233-204-151-241-45-18-88-97 1-189-94-97-29-325 225-269ZM269 522c142 0 144-212 1-212-142 0-143 212-1 212ZM191 735c-42 20-134 151 87 151 175 0 187-141 50-146Z
		h 553 M79 748h85V424c109-157 226-123 226 3V748h85V417c0-217-232-208-311-85V54H79Z
		i 553 M344 116c0 89-135 89-135 1 0-91 135-91 135-1ZM101 255H333V677H480v71H85V677H247V326H101Z
		j 553 M85 326H326V745c0 119-81 178-261 104v81c137 50 348 39 348-196V255H85ZM428 116c0-90-134-90-134 0 0 89 134 89 134 0Z
		k 553 M89 54h86V480L397 255H510L278 482 522 748H405L175 484V748H89Z
		l 553 M101 54H333V677H480v71H85V677H247V124H101Z
		m 553 M109 255l5 97c50-157 202-130 189 6 50-160 206-147 206 16V748H430V371c0-56-41-113-115 64V748H237V375c0-62-42-116-114 58V748H44V255Z
		n 553 M79 255V748h85V424c105-159 226-120 226-1V748h85V415c0-214-230-209-317-78l-3-82Z
		o 553 M275 319c157 0 165 188 127 283-46 115-211 107-252 1-41-106-18-284 125-284Zm8-73C40 246 6 515 77 652c71 137 309 146 393-1 72-126 61-405-187-405Z
		p 553 M155 255l5 85c70-126 340-170 340 149 0 277-234 284-336 253V949H78V255Zm9 406c382 174 286-618 0-236Z
		q 553 M386 568C111 975 4 170 386 341Zm11-303C244 218 53 265 53 521c0 283 241 290 335 138l-3 290h87V246Z
		r 553 M99 255V748h86V433c127-178 246-126 231 10h87c17-238-218-250-324-94l-2-94Z
		s 553 M437 261C175 206 96 309 96 386c0 176 285 128 285 233 0 75-125 82-292 41v78c214 49 380 5 380-128 0-170-286-122-286-229 0-61 88-83 254-44Z
		t 553 M254 97V255H476v72H254V574c0 114 89 125 222 94v75c-218 39-307-16-307-160V327H31V255H169V119Z
		u 553 M390 255h85V748H399l-4-83C318 792 79 808 79 590V255h85V581c0 118 119 158 226-2Z
		v 553 M423 255h94L324 748H226L32 255h98L277 653Z
		w 553 M451 255h84L464 748H360L274 498 190 748H90L18 255h84l50 410 92-287h62l99 281Z
		x 553 M153 255 282 445 410 255H516L330 502 523 748H410L276 560 145 748H34L226 501 43 255Z
		y 553 M32 255 230 749C174 861 131 888 29 872v79c121 5 224-3 320-255L517 255H424L281 653 130 255Z
		z 553 M87 255H462v66L188 676H478v72H81V686L359 327H87Z
		{ 553 M441 37H411C58 37 339 430 131 430H79v70h42c233 0-74 449 285 449h35V880H407c-234 0 16-394-215-415 224-34-16-359 220-359h29Z
		| 553 M236 0h81V949H236Z
		} 553 M112 37h29c357 0 66 393 292 393h41v70H422c-216 0 81 449-273 449H112V880h33c239 0-15-381 214-415-221-29 16-359-218-359H112Z
		~ 553 M442 406c5 98-55 139-145 37C192 324 26 372 33 551h79c-6-106 63-131 144-38 108 124 274 66 264-107Z
		█ 553 M0 0H553V1000H0Z
	`;
	// `


	constructor(scale=17,lineheight=1.4) {
		this.defscale=scale;
		this.lineheight=lineheight;
		this.loadfont(DrawFont.deffont);
	}


	loadfont(fontdef) {
		// Font format:
		//      name
		//      info
		//      scale
		//      char, width, path
		//
		// Assume height=scale.
		this.glyphs={};
		this.unknown=undefined;
		let idx=0,len=fontdef.length;
		function token(eol) {
			let c=0;
			while (idx<len && (c=fontdef.charCodeAt(idx))<=32 && c!==10) {idx++;}
			let i=idx;
			while (idx<len && fontdef.charCodeAt(idx)>eol) {idx++;}
			return fontdef.substring(i,idx);
		}
		token(10); idx++; // name
		token(10); idx++; // info
		let scale=parseFloat(token(10));
		let special={"SPC":32};
		let trans=new Transform({dim:2,scale:1/scale});
		while (idx<len) {
			idx++;
			let chr=token(32);
			if (chr.length<=0) {continue;}
			chr=special[chr]??chr.charCodeAt(0);
			let g={
				width:parseFloat(token(32))/scale,
				path :new DrawPath(token(10),trans)
			};
			this.glyphs[chr]=g;
			if (this.unknown===undefined || chr===63) {
				this.unknown=g;
			}
		}
	}


	textrect(str,scale) {
		// Returns the rectangle bounding the text.
		if (scale===undefined) {scale=this.defscale;}
		let len=str.length;
		let xpos=0,xmax=0;
		let ypos=0,lh=this.lineheight;
		let glyphs=this.glyphs;
		let space=glyphs[32].width;
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				xmax=xmax>xpos?xmax:xpos;
				if (c===8) {
					// backspace
					xpos-=space;
					xpos=xpos>0?xpos:0;
				} else if (c===9) {
					// tab
					let tab=space*5;
					xpos=((~~(xpos/tab))+1)*tab;
				} else if (c===10) {
					ypos+=lh;
					xpos=0;
				} else if (c===13) {
					xpos=0;
				} else {
					g=this.unknown;
				}
				if (g===undefined) {
					continue;
				}
			}
			xpos+=g.width;
		}
		// Use 1 instead of lineheight.
		if (len>0) {
			xmax=xmax>xpos?xmax:xpos;
			ypos+=1;
		}
		return {x:0,y:0,w:xmax*scale,h:ypos*scale};
	}

}


export class Draw {

	static Path=DrawPath;
	static Image=DrawImage;
	static Font=DrawFont;
	// The default context used for drawing functions.
	static def=null;


	constructor(imgw,imgh) {
		if (Draw.def===null) {Draw.def=this;}
		this.canvas   =null;
		this.ctx      =null;
		if (imgw instanceof HTMLCanvasElement) {
			let canv=imgw;
			imgw=canv.width;
			imgh=canv.height;
			this.screencanvas(canv);
		}
		// Image info
		this.img      =new DrawImage(imgw,imgh);
		this.rgba     =new Uint8ClampedArray([0,1,2,3]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		this.rgbashift=[0,0,0,0];
		let col=this.rgba32[0];
		for (let i=0;i<32;i+=8) {this.rgbashift[(col>>>i)&255]=i;}
		this.rgba32[0]=0xffffffff;
		// State
		this.deffont  =new DrawFont();
		this.deftrans =new Transform(2);
		this.defpath  =new DrawPath();
		this.stack    =[];
		this.stackidx =0;
		// Rendering variables
		this.linewidth=1.0;
		this.tmptrans =new Transform(2);
		this.tmpline  =[];
	}


	screencanvas(canvas) {
		if (Object.is(this.canvas,canvas)) {return;}
		this.canvas=canvas;
		this.ctx=canvas.getContext("2d");
	}


	screenflip() {
		let img=this.img;
		let imgw=img.width,imgh=img.height;
		let cdata=new Uint8ClampedArray(img.data8.buffer);
		let idata=new ImageData(cdata,imgw,imgh);
		this.ctx.putImageData(idata,0,0);
	}


	// ----------------------------------------
	// Image Information


	setimage(img) {
		if (!(img instanceof DrawImage)) {
			img=new DrawImage(img);
		}
		this.img=img;
	}


	setcolor(r,g,b,a) {
		// Accepts: int, [r,g,b,a], {r,g,b,a}
		this.rgba32[0]=this.rgbatoint(r,g,b,a);
	}


	rgbatoint(r,g,b,a=255) {
		// Convert an RGBA array to a int regardless of endianness.
		if (g===undefined) {
			if (r instanceof Array) {
				a=r[3]??255;b=r[2]??255;g=r[1]??255;r=r[0]??255;
			} else if (r instanceof Object) {
				a=r.a??255;b=r.b??255;g=r.g??255;r=r.r??255;
			} else {
				a=(r>>>0)&255;b=(r>>>8)&255;g=(r>>>16)&255;r>>>=24;
			}
		}
		let tmp=this.rgba32[0];
		let rgba=this.rgba;
		rgba[0]=r>0?(r<255?(r|0):255):0;
		rgba[1]=g>0?(g<255?(g|0):255):0;
		rgba[2]=b>0?(b<255?(b|0):255):0;
		rgba[3]=a>0?(a<255?(a|0):255):0;
		rgba=this.rgba32[0];
		this.rgba32[0]=tmp;
		return rgba;
	}


	inttorgba(i) {
		let rgba32=this.rgba32;
		let tmp=rgba32[0];
		rgba32[0]=i;
		let rgba=this.rgba.slice();
		rgba32[0]=tmp;
		return rgba;
	}


	// ----------------------------------------
	// State


	resetstate() {
		this.rgba32[0]=0xffffffff;
		this.deftrans.reset();
	}


	pushstate() {
		let mem=this.stack[this.stackidx++];
		if (mem===undefined) {
			mem={
				img  :null,
				rgba :null,
				trans:new Transform(2),
				path :null,
				font :null
			};
			this.stack[this.stackidx-1]=mem;
		}
		mem.img =this.img;
		mem.rgba=this.rgba32[0];
		mem.trans.set(this.deftrans);
		mem.path=this.defpath;
		mem.font=this.deffont;
	}


	popstate() {
		if (this.stackidx<=0) {throw "loading null stack";}
		let mem=this.stack[--this.stackidx];
		this.img=mem.img;
		this.rgba32[0]=mem.rgba;
		this.deftrans.set(mem.trans);
		this.defpath=mem.path;
		this.deffont=mem.font;
	}


	settransform(trans) {return this.deftrans.set(trans);}
	gettransform() {return this.deftrans;}


	// ----------------------------------------
	// Images


	fill(r,g,b,a) {
		// Fills the current image with a solid color.
		// data32.fill(rgba) was ~25% slower during testing.
		let rgba=this.rgbatoint(r,g,b,a);
		let data32=this.img.data32;
		let i=this.img.width*this.img.height;
		while (i>7) {
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
		}
		while (i>0) {
			data32[--i]=rgba;
		}
	}


	drawimage(srcimg,offx,offy,trans) {
		// For a given destination pixel, use trans^-1 to project it onto the source and
		// use area calculations to average the color.
		// det(trans) = pixel area
		//
		//                 .
		//               .' '.
		//             .'     '.
		//  +--+      '.        '.
		//  |  |  ->    '.        '.
		//  +--+          '.       .'
		//                  '.   .'
		//                    '.'
		//
		if (trans===undefined) {trans=this.deftrans;}
		else if (!(trans instanceof Transform)) {trans=new Transform(trans);}
		let dstimg=this.img;
		let dstw=dstimg.width,dsth=dstimg.height;
		let srcw=srcimg.width,srch=srcimg.height;
		const rnd0=1e-6,rnd1=1-rnd0;
		// src->dst transformation.
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0]+offx;
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1]+offy;
		let det=matxx*matyy-matxy*matyx;
		let alpha=det*0.5*this.rgba[3]/(255*255);
		if (!(srcw*srch*(alpha>0?alpha:-alpha)>1e-8 && dstw && dsth)) {return;}
		// dst->src transformation.
		let invxx= matyy/det,invxy=-matxy/det,invx=-matx*invxx-maty*invxy;
		let invyx=-matyx/det,invyy= matxx/det,invy=-matx*invyx-maty*invyy;
		// Check if trans(src) and dst AABB overlap. Calculate y intercepts.
		matxx*=srcw;matxy*=srch;
		matyx*=srcw;matyy*=srch;
		let min=Infinity,max=-Infinity;
		let vx=matx,vy=maty;
		for (let i=1;i<16;i+=i) {
			let x0=vx,y0=vy;
			vx=((3&i)?matxx:0)+((6&i)?matxy:0)+matx;
			vy=((3&i)?matyx:0)+((6&i)?matyy:0)+maty;
			let x1=vx,y1=vy;
			if (x0>x1) {x1=x0;x0=vx;y1=y0;y0=vy;}
			if (!(x0<dstw && x1>=0)) {continue;}
			let dx=x1-x0,dy=y1-y0;
			y0+=x0<0?-(x0/dx)*dy:0;
			y1+=x1>dstw?((dstw-x1)/dx)*dy:0;
			if (y0>y1) {x0=y0;y0=y1;y1=x0;}
			min=min<y0?min:y0;
			max=max>y1?max:y1;
		}
		min+=rnd0;max+=rnd1;
		if (!(min<dsth && max>=1)) {return;}
		let dstminy=min>0?~~min:0;
		let dstmaxy=max<dsth?~~max:dsth;
		// Precompute pixel AABB offsets.
		let pixminx=(invxx<0?invxx:0)+(invxy<0?invxy:0);
		let pixminy=(invyx<0?invyx:0)+(invyy<0?invyy:0);
		let pixmaxy=(invyx>0?invyx:0)+(invyy>0?invyy:0);
		// Iterate over dst rows.
		let [rshift,gshift,bshift,ashift]=this.rgbashift;
		let dstdata=dstimg.data32;
		let srcdata=srcimg.data32;
		for (let dsty=dstminy;dsty<dstmaxy;dsty++) {
			// Calculate dst x bounds for the row.
			min=Infinity;max=-Infinity;
			vx=matx;vy=maty-dsty;
			for (let i=1;i<16;i+=i) {
				let x0=vx,y0=vy;
				vx=((3&i)?matxx:0)+((6&i)?matxy:0)+matx;
				vy=((3&i)?matyx:0)+((6&i)?matyy:0)+maty-dsty;
				let x1=vx,y1=vy;
				if (y0>y1) {x1=x0;x0=vx;y1=y0;y0=vy;}
				if (y0>=1 || y1<=0) {continue;}
				let dx=x1-x0,dy=y1-y0,dxy=dx/dy;
				let y0x=x0-y0*dxy,y1x=y0x+dxy;
				x0=y0>0?x0:y0x;
				x1=y1<1?x1:y1x;
				if (x0>x1) {y0=x0;x0=x1;x1=y0;}
				min=min<x0?min:x0;
				max=max>x1?max:x1;
			}
			min+=rnd0;max+=rnd1;
			let dstminx=min>0?~~min:0;
			let dstmaxx=max<dstw?~~max:dstw;
			let dstrow=dsty*dstw;
			for (let dstx=dstminx;dstx<dstmaxx;dstx++) {
				// Project the dst pixel to src and calculate AABB.
				let srcx0=dstx*invxx+dsty*invxy+invx;
				let srcy0=dstx*invyx+dsty*invyy+invy;
				min=srcx0+pixminx;let srcminx=min>0?~~min:0;
				min=srcy0+pixminy;let srcminy=min>0?~~min:0;
				max=srcy0+pixmaxy;let srcmaxy=max<srch?Math.ceil(max):srch;
				// Iterate over src rows.
				let sa=0,sr=0,sg=0,sb=0;
				let xr=invxx,xi=invxy;
				let yr=invyx,yi=invyy;
				for (let srcy=srcminy;srcy<srcmaxy;srcy++) {
					// Sum the src pixels.
					let srcrow=srcy*srcw;
					for (let srcx=srcminx;srcx<srcw;srcx++) {
						let sx=srcx0-srcx,sy=srcy0-srcy,area=0;
						min=srcw;max=-1;
						for (let i=0;i<4;i++) {
							// Calculate transformed pixel vertices.
							let sign=alpha;
							let dx=xr,dy=yr;
							let x0=sx,y0=sy;
							sx+=dx;xr=xi;xi=-dx;
							sy+=dy;yr=yi;yi=-dy;
							let x1=sx,y1=sy;
							if (y0>y1) {sign=-sign;x1=x0;x0=sx;y1=y0;y0=sy;}
							if (y0>=1 || y1<=0) {continue;}
							// Clip to unit row.
							let dxy=dx/dy;
							let y0x=x0-y0*dxy;
							if (y0<0) {y0=0;x0=y0x;}
							if (y1>1) {y1=1;x1=y0x+dxy;}
							if (x0>x1) {let tmp=x0;x0=x1;x1=tmp;dx=-dx;}
							min=min<x0?min:x0;
							max=max>x1?max:x1;
							// Calculate area to the right.
							if (x1<1) {
								// Vertical line or last pixel.
								let tmp=x1>0?-(x1*x1/dx)*dy*sign:0;
								let h=(y0-y1)*sign;
								tmp=x0>=0?(x0+x1)*h:tmp;
								area+=h+h-tmp;
							} else if (x0<1) {
								area-=((x0>0?(1-x0)*(1-x0):(1-2*x0))/dx)*dy*sign;
							}
						}
						// Skip pixels if we are too far left or right.
						if (max<=0) {break;}
						if (min>=1) {srcx+=(~~min)-1;continue;}
						// Scale pixel color by the area and premultiply alpha.
						let col=srcdata[srcrow+srcx];
						let smul=area*((col>>>ashift)&255);
						sr+=smul*((col>>>rshift)&255);
						sg+=smul*((col>>>gshift)&255);
						sb+=smul*((col>>>bshift)&255);
						sa+=smul;
						if (max<=1) {break;}
					}
				}
				// Blend with dst. Note alpha*det already averages the src colors.
				if (sa>1e-5) {
					// a = sa + da*(1-sa)
					// c = (sc*sa + dc*da*(1-sa)) / a
					sa=sa<1?sa:1;
					let pix=dstrow+dstx;
					let col=dstdata[pix];
					let dmul=(((col>>>ashift)&255)*0.003921569)*(1-sa);
					let a=sa+dmul,adiv=1.001/a;
					let da=a*255.255;
					let dr=(sr+dmul*((col>>>rshift)&255))*adiv;
					let dg=(sg+dmul*((col>>>gshift)&255))*adiv;
					let db=(sb+dmul*((col>>>bshift)&255))*adiv;
					dstdata[pix]=(da<<ashift)|(dr<<rshift)|(dg<<gshift)|(db<<bshift);
				}
			}
		}
	}


	// ----------------------------------------
	// Primitives


	begin() {return this.defpath.begin();}


	drawline(x0,y0,x1,y1,rad) {
		let w=rad??this.linewidth*0.5;
		this.begin().addline(x0,y0,x1,y1,w);
		this.fillpath();
	}


	fillrect(x,y,w,h) {
		this.begin().addrect(x,y,w,h);
		this.fillpath();
	}


	filloval(x,y,xrad,yrad) {
		yrad=yrad??xrad;
		this.begin().addoval(x,y,xrad,yrad);
		this.fillpath();
	}


	tracerect(x,y,w,h,outrad,inrad) {
		outrad=outrad??this.linewidth*0.5;
		this.begin().tracerect(x,y,w,h,outrad,inrad);
		this.fillpath();
	}


	traceoval(x,y,xrad,yrad,outrad,inrad) {
		outrad=outrad??this.linewidth*0.5;
		yrad=yrad??xrad;
		this.begin().traceoval(x,y,xrad,yrad,outrad,inrad);
		this.fillpath();
	}


	// ----------------------------------------
	// Text


	setfont(font) {this.deffont=font;}


	filltext(x,y,str,scale,halign=0,valign=0) {
		// Alignment: 0=left, 0.5=center, 1=right.
		let len=str.length;
		if (!len) {return;}
		let font=this.deffont,glyphs=font.glyphs;
		if (scale===undefined) {scale=font.defscale;}
		let xpos=0,ypos=0,lh=font.lineheight;
		let space=glyphs[32].width;
		let trans=this.tmptrans;
		trans.set(this.deftrans);
		if (halign!==0 || valign!==0) {
			let rect=font.textrect(str,1);
			halign=-rect.x-rect.w*halign;
			valign=-rect.y-rect.h*valign;
		}
		trans.scale(scale);
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				if (c===8) {
					// backspace
					xpos-=space;
					xpos=xpos>0?xpos:0;
				} else if (c===9) {
					// tab
					let tab=space*5;
					xpos=((~~(xpos/tab))+1)*tab;
				} else if (c===10) {
					// EOL
					ypos+=lh;
					xpos=0;
				} else if (c===13) {
					// linefeed
					xpos=0;
				} else {
					g=font.unknown;
				}
				if (g===undefined) {
					continue;
				}
			}
			trans.vec.set(trans.mat.mul([xpos+halign,ypos+valign])).iadd([x,y]);
			this.fillpath(g.path,trans);
			xpos+=g.width;
		}
	}


	textrect(str,scale) {
		return this.deffont.textrect(str,scale);
	}


	// ----------------------------------------
	// Path Filling


	fillextend() {
		// Declaring line objects this way allows engines to optimize their structs.
		this.tmpline.push({
			sort:0,
			x0:0,y0:0,
			x1:0,y1:0,
			x2:0,y2:0
		});
	}


	fillpath(path,trans) {
		// Fills the current path.
		//
		// Preprocess the lines and curves. Use a binary heap to dynamically sort lines.
		// Keep JS as simple as possible to be efficient. Keep micro optimization in WASM.
		// ~~x = fast floor(x)
		if (path===undefined) {path=this.defpath;}
		if (trans===undefined) {trans=this.deftrans;}
		else if (!(trans instanceof Transform)) {trans=new Transform(trans);}
		// Screenspace transformation.
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0];
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1];
		let det=(matxx*matyy-matxy*matyx)*path.area;
		const curvemaxdist2=0.02;
		let iw=this.img.width,ih=this.img.height;
		let alpha=this.rgba[3]/255.0;
		let amul=det<0?-alpha:alpha;
		if (path.vertidx<3 || iw<1 || ih<1 || det*amul<1e-6) {return;}
		// Check if trans(path) and image AABB overlap. Calculate y intercepts.
		let min=Infinity,max=-Infinity;
		let vx=0,vy=0;
		for (let i=0;i<5;i++) {
			let w=((i+1)&2)?path.maxx:path.minx;
			let h=((i  )&2)?path.maxy:path.miny;
			let x0=vx,y0=vy;
			vx=w*matxx+h*matxy+matx;
			vy=w*matyx+h*matyy+maty;
			let x1=vx,y1=vy;
			if (x0>x1) {x1=x0;x0=vx;y1=y0;y0=vy;}
			let dx=x1-x0,dy=y1-y0;
			if (!(dx>=0 && dy===dy)) {return;}
			if (!i || x0>=iw || x1<0) {continue;}
			y0+=x0<0?-(x0/dx)*dy:0;
			y1+=x1>iw?((iw-x1)/dx)*dy:0;
			if (y0>y1) {x0=y0;y0=y1;y1=x0;}
			min=min<y0?min:y0;
			max=max>y1?max:y1;
		}
		if (!(min<ih && max>0)) {return;}
		let pminy=min>0?~~min:0;
		let pmaxy=max<ih?Math.ceil(max):ih;
		// Loop through the path nodes.
		let lr=this.tmpline,lrcnt=lr.length,lcnt=0;
		let movex=0,movey=0;
		let p2x=0,p2y=0,p3x=0,p3y=0;
		let varr=path.vertarr;
		let vidx=path.vertidx;
		for (let i=0;i<=vidx;i++) {
			let v=varr[i<vidx?i:0];
			let type=v.type;
			let p0x=p3x,p0y=p3y;
			p3x=v.x*matxx+v.y*matxy+matx;
			p3y=v.x*matyx+v.y*matyy+maty;
			let p1x=p3x,p1y=p3y;
			// Add a basic line.
			if (lrcnt<=lcnt) {
				this.fillextend();
				lrcnt=lr.length;
			}
			let l=lr[lcnt++];
			if (type!==DrawPath.CURVE) {
				if (type===DrawPath.MOVE) {
					// Close any unclosed subpaths.
					p1x=movex;movex=p3x;
					p1y=movey;movey=p3y;
				}
				l.sort=0;
				l.x0=p0x;l.y0=p0y;
				l.x1=p1x;l.y1=p1y;
				if (p1y===p0y) {lcnt--;}
				continue;
			}
			// Linear decomposition of curves.
			v=varr[++i];p2x=v.x*matxx+v.y*matxy+matx;p2y=v.x*matyx+v.y*matyy+maty;
			v=varr[++i];p3x=v.x*matxx+v.y*matxy+matx;p3y=v.x*matyx+v.y*matyy+maty;
			let next=-1,next0=0;
			while (true) {
				// The curve will stay inside the bounding box of [p0,p1,p2,p3].
				// If the subcurve is outside the image, stop subdividing.
				if (next===next0) {
					l.sort=0;
					l.x0=p0x;l.y0=p0y;
					l.x1=p3x;l.y1=p3y;
					if (next<0) {break;}
					l=lr[next];
					next=l.sort;
					p0x=p3x;p1x=l.x0;p2x=l.x1;p3x=l.x2;
					p0y=p3y;p1y=l.y0;p2y=l.y1;p3y=l.y2;
				}
				next0=next;
				if ((p0x<=0 && p1x<=0 && p2x<=0 && p3x<=0) || (p0x>=iw && p1x>=iw && p2x>=iw && p3x>=iw) ||
				    (p0y<=0 && p1y<=0 && p2y<=0 && p3y<=0) || (p0y>=ih && p1y>=ih && p2y>=ih && p3y>=ih)) {
					continue;
				}
				// Test if both control points are close to the line p0->p3.
				// Clamp to ends and filter degenerates.
				let dx=p3x-p0x,dy=p3y-p0y,den=dx*dx+dy*dy;
				let lx=p1x-p0x,ly=p1y-p0y;
				let u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d1=lx*lx+ly*ly;
				lx=p2x-p0x;ly=p2y-p0y;
				u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d2=lx*lx+ly*ly;
				d1=(d1>d2 || !(d1===d1))?d1:d2;
				if (!(d1>curvemaxdist2 && d1<Infinity)) {continue;}
				// Split the curve in half. [p0,p1,p2,p3] = [p0,l1,l2,ph] + [ph,r1,r2,p3]
				if (lrcnt<=lcnt) {
					this.fillextend();
					lrcnt=lr.length;
				}
				let t1x=(p1x+p2x)*0.5,t1y=(p1y+p2y)*0.5;
				let r2x=(p2x+p3x)*0.5,r2y=(p2y+p3y)*0.5;
				let r1x=(t1x+r2x)*0.5,r1y=(t1y+r2y)*0.5;
				let n=lr[lcnt];
				n.sort=next;
				n.x0=r1x;n.x1=r2x;n.x2=p3x;
				n.y0=r1y;n.y1=r2y;n.y2=p3y;
				p1x=(p0x+p1x)*0.5;p1y=(p0y+p1y)*0.5;
				p2x=(p1x+t1x)*0.5;p2y=(p1y+t1y)*0.5;
				p3x=(p2x+r1x)*0.5;p3y=(p2y+r1y)*0.5;
				next=lcnt++;
			}
		}
		// Init blending.
		let ashift=this.rgbashift[3],amask=(255<<ashift)>>>0;
		let maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		let colrgb=(this.rgba32[0]|amask)>>>0;
		let coll=(colrgb&maskl)>>>0,colh=(colrgb&maskh)>>>0,colh8=colh>>>8;
		// Process the lines row by row.
		let p=0,pmax=pmaxy*iw,y=0;
		let pnext=pminy*iw,prow=0;
		let area=0,areadx1=0;
		let imgdata=this.img.data32;
		while (true) {
			if (p>=prow) {
				p=pnext;
				if (p>=pmax || lcnt<1) {break;}
				y=~~(p/iw);
				prow=y*iw+iw;
				area=0;
				areadx1=0;
			}
			let areadx2=0;
			while (p>=pnext) {
				// fx0  fx0+1                          fx1  fx1+1
				//  +-----+-----+-----+-----+-----+-----+-----+
				//  |                              .....----  |
				//  |               .....-----'''''           |
				//  | ....-----'''''                          |
				//  +-----+-----+-----+-----+-----+-----+-----+
				//   first  dyx   dyx   dyx   dyx   dyx  last   tail
				//
				// Orient upwards, then clip y to [0,1].
				let l=lr[0];
				let x0=l.x0,y0=l.y0;
				let x1=l.x1,y1=l.y1;
				let sign=amul,tmp=0;
				if (y0>y1) {
					sign=-sign;
					tmp=x0;x0=x1;x1=tmp;
					tmp=y0;y0=y1;y1=tmp;
				}
				// Calculate row and col.
				let sort=prow-iw,c0=p-sort,c1=c0+1;
				let r0=y0<ih?~~y0:ih;
				r0=y0>y?r0:y;
				let r1=r0+1,r2=r0+2;
				// Clamp y to row. Ensure consecutive rows use the same calculations.
				let dx=x1-x0,dy=y1-y0,nx=x1;
				if (dy>1) {
					// Large numbers.
					let dxy=dx/dy,y0x=x0-y0*dxy;
					if (y1>r2) {nx=y0x+r2*dxy;}
					if (y1>r1) {x1=y0x+r1*dxy;y1=r1;}
					if (y0<r0) {x0=y0x+r0*dxy;y0=r0;}
				} else {
					// Small numbers.
					if (y1>r2) {nx=x0-((y0-r2)/dy)*dx;}
					if (y1>r1) {x1=x0-((y0-r1)/dy)*dx;y1=r1;}
					if (y0<r0) {x0=x0-((y0-r0)/dy)*dx;y0=r0;}
				}
				nx=nx<x1?nx:x1;
				if (x0>x1) {dx=-dx;tmp=x0;x0=x1;x1=tmp;}
				dy*=sign;let dyx=dy/dx;dy*=0.5;
				if (!(y1>r0 && dyx!==0)) {
					// Above or degenerate.
					sort=pmax;
				} else if (x0>=c1 || r0>y) {
					// Below or to the left.
					nx=x0;
					sort=r0*iw;
				} else if (x1<=c1) {
					// Vertical line or last pixel.
					let t0=x1-c0,t1=x1-c1;
					tmp=x1>c0?-(t0*t0/dx)*dy:0;
					if (c0>1 && x0<c0-1) {
						areadx1+=dyx;
						area+=((x1>c0?t1*t1:-t0-t1)/dx)*dy;
					} else {
						dy=(y0-y1)*sign;
						tmp=x0>=c0?0.5*(x0-c0+t0)*dy:tmp;
						area+=dy-tmp;
					}
					areadx2+=tmp;
					sort+=y1<r1?pmax:iw;
				} else {
					// Spanning 2+ pixels.
					let t0=x0-c0,t1=x0-c1;
					tmp=((x0>c0?t1*t1:-t0-t1)/dx)*dy;
					area-=tmp;
					if (x1>=c0+2) {
						areadx1-=dyx;
						tmp=x0>c0?(t0*t0/dx)*dy:0;
					}
					areadx2+=tmp;
					nx=x1;
				}
				nx=nx<0?0:nx;
				sort+=nx<iw?~~nx:iw;
				sort=sort>p?sort:pmax;
				l.sort=sort;
				// Heap sort down.
				if (sort>=pmax) {
					let t=lr[--lcnt];
					lr[lcnt]=l;l=t;
					sort=l.sort;
				}
				let i=0,j=0;
				while ((j+=j+1)<lcnt) {
					let j1=j+1<lcnt?j+1:j;
					let l0=lr[j],l1=lr[j1];
					let s0=l0.sort,s1=l1.sort;
					if (s0>s1) {s0=s1;l0=l1;j=j1;}
					if (s0>=sort) {break;}
					lr[i]=l0;
					i=j;
				}
				lr[i]=l;
				pnext=lr[0].sort;
			}
			// Calculate how much we can draw or skip.
			const cutoff=0.00390625;
			let astop=area+areadx1+areadx2;
			let pstop=p+1,pdif=(pnext<prow?pnext:prow)-pstop;
			if (pdif>0 && (area>=cutoff)===(astop>=cutoff)) {
				let adif=(cutoff-astop)/areadx1+1;
				pdif=(adif>=1 && adif<pdif)?~~adif:pdif;
				astop+=pdif*areadx1;
				pstop+=pdif;
			}
			// Blend the pixel based on how much we're covering.
			if (area>=cutoff) {
				do {
					// a = da + ( 1-da)*sa
					// c = dc + (sc-dc)*sa/a
					let sa=area<alpha?area:alpha;
					area+=areadx1+areadx2;
					areadx2=0;
					let dst=imgdata[p];
					let da=(dst>>>ashift)&255;
					if (da===255) {
						sa=256.49-sa*256;
					} else {
						let tmp=sa*255+(1-sa)*da;
						sa=256.49-(sa/tmp)*65280;
						da=tmp+0.49;
					}
					// imul() implicitly casts floor(sa).
					imgdata[p]=(da<<ashift)
						|(((Math.imul((dst&0x00ff00ff)-coll,sa)>>>8)+coll)&maskl)
						|((Math.imul(((dst>>>8)&0x00ff00ff)-colh8,sa)+colh)&maskh);
				} while (++p<pstop);
			}
			p=pstop;
			area=astop;
		}
	}


	tracepath(path,trans,outrad,inrad) {
		outrad=outrad??this.linewidth*0.5;
		return this.fillpath(path.trace(outrad,inrad),trans);
	}

}
