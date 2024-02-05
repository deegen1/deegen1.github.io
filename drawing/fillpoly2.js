	fillpoly(poly,trans) {
		// Preprocess the lines and curves. Reject anything with a NaN, too narrow, or
		// outside the image.
		if (poly ===undefined) {poly =this.defpoly ;}
		if (trans===undefined) {trans=this.deftrans;}
		if (poly.lineidx<=0 && poly.curvidx<=0) {return;}
		var l,i,j,tmp;
		var imgdata=this.imgdata,imgwidth=this.imgwidth,imgheight=this.imgheight;
		// Convert all points to screenspace.
		var vmulx=this.viewmulx,voffx=this.viewoffx;
		var vmuly=this.viewmuly,voffy=this.viewoffy;
		var matxx=trans.data[0]*vmulx,matxy=trans.data[1]*vmulx,matx=(trans.data[2]-voffx)*vmulx;
		var matyx=trans.data[3]*vmuly,matyy=trans.data[4]*vmuly,maty=(trans.data[5]-voffy)*vmuly;
		var x0,y0,x1,y1;
		var tv=this.tmpvert;
		if (tv.length<poly.vertidx) {
			tv=new Float64Array(poly.vertidx*2);
			this.tmpvert=tv;
		}
		for (i=poly.vertidx-2;i>=0;i-=2) {
			x0=poly.vertarr[i  ];
			y0=poly.vertarr[i+1];
			tv[i  ]=x0*matxx+y0*matxy+matx;
			tv[i+1]=x0*matyx+y0*matyy+maty;
		}
		// Add regular lines.
		var lr=this.tmpline,lrcnt=lr.length,ycnt=0;
		if (ycnt+(poly.lineidx>>1)>=lrcnt) {
			var newlen=(ycnt+(poly.lineidx>>1))*2;
			while (lrcnt<newlen) {lr.push({});lrcnt++;}
			this.tmpline=lr;
		}
		for (i=poly.lineidx-2;i>=0;i-=2) {
			var p0=poly.linearr[i],p1=poly.linearr[i+1];
			l=lr[ycnt++];
			l.x0=tv[p0  ];
			l.y0=tv[p0+1];
			l.x1=tv[p1  ];
			l.y1=tv[p1+1];
		}
		// Linear decomposition of curves.
		// 1: split into 4 segments
		// 2: subdivide if the segments are too big
		var splitlen=3;
		var cv=poly.curvarr;
		for (i=poly.curvidx-4;i>=0;i-=4) {
			// Get the control points and check if the curve's on the screen.
			var p0=cv[i  ],p0x=tv[p0],p0y=tv[p0+1];
			var p1=cv[i+1],p1x=tv[p1],p1y=tv[p1+1];
			var p2=cv[i+2],p2x=tv[p2],p2y=tv[p2+1];
			var p3=cv[i+3],p3x=tv[p3],p3y=tv[p3+1];
			x0=Math.min(p0x,Math.min(p1x,Math.min(p2x,p3x)));
			x1=Math.max(p0x,Math.max(p1x,Math.max(p2x,p3x)));
			y0=Math.min(p0y,Math.min(p1y,Math.min(p2y,p3y)));
			y1=Math.max(p0y,Math.max(p1y,Math.max(p2y,p3y)));
			if (x0>=imgwidth || y0>=imgheight || y1<=0) {continue;}
			if (x1<=0) {
				if (ycnt>=lrcnt) {
					var newlen=(ycnt+1)*2;
					while (lrcnt<newlen) {lr.push({});lrcnt++;}
					this.tmpline=lr;
				}
				l=lr[ycnt++];
				l.x0=p0x;
				l.y0=p0y;
				l.x1=p3x;
				l.y1=p3y;
				continue;
			}
			// Interpolate points.
			p3x=p3x-3*p2x+3*p1x-p0x;
			p3y=p3y-3*p2y+3*p1y-p0y;
			p2x=3*(p2x-2*p1x+p0x);
			p2y=3*(p2y-2*p1y+p0y);
			p1x=3*(p1x-p0x);
			p1y=3*(p1y-p0y);
			var ppx=p0x,ppy=p0y,u0=0;
			for (j=0;j<4;j++) {
				var u1=(j+1)/4;
				var cpx=p0x+u1*(p1x+u1*(p2x+u1*p3x))-ppx;
				var cpy=p0y+u1*(p1y+u1*(p2y+u1*p3y))-ppy;
				var dist=Math.sqrt(cpx*cpx+cpy*cpy);
				var segs=Math.ceil(dist/splitlen);
				// Split up the current segment.
				if (ycnt+segs>=lrcnt) {
					var newlen=(ycnt+segs)*2;
					while (lrcnt<newlen) {lr.push({});lrcnt++;}
					this.tmpline=lr;
				}
				u1=(u1-u0)/segs;
				for (var s=0;s<segs;s++) {
					u0+=u1;
					cpx=p0x+u0*(p1x+u0*(p2x+u0*p3x));
					cpy=p0y+u0*(p1y+u0*(p2y+u0*p3y));
					l=lr[ycnt++];
					l.x0=ppx;
					l.y0=ppy;
					l.x1=cpx;
					l.y1=cpy;
					ppx=cpx;
					ppy=cpy;
				}
			}
		}
		// Prune lines.
		var swap=((matxx<0)!==(matyy<0))+0;
		var minx=imgwidth,maxx=0,miny=imgheight,maxy=0;
		for (i=ycnt-1;i>=0;i--) {
			l=lr[i];
			// If we mirror the image, we need to flip the line direction.
			if (swap) {
				x0=l.x1;y0=l.y1;
				x1=l.x0;y1=l.y0;
				l.x0=x0;l.x1=x1;
				l.y0=y0;l.y1=y1;
			} else {
				x0=l.x0;y0=l.y0;
				x1=l.x1;y1=l.y1;
			}
			// Add the line if it's in the screen or to the left.
			var dx=x1-x0;
			var dy=y1-y0;
			l.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
			l.miny=Math.max(Math.floor(Math.min(y0,y1)),0);
			l.maxy=Math.min(Math.ceil(Math.max(y0,y1)),imgheight);
			if (l.minx<imgwidth && l.miny<l.maxy && dx===dx && Math.abs(dy)>1e-10) {
				l.dxy=dx/dy;
				l.cxy=x0-y0*l.dxy;
				l.dyx=Math.abs(dx)>1e-10?dy/dx:0;
				l.cyx=y0-x0*l.dyx;
				l.maxx=Math.min(Math.ceil(Math.max(x0,x1)),imgwidth);
				minx=Math.min(minx,l.minx);
				maxx=Math.max(maxx,l.maxx);
				miny=Math.min(miny,l.miny);
				maxy=Math.max(maxy,l.maxy);
				continue;
			}
			// Remove the line.
			lr[i]=lr[--ycnt];
			lr[ycnt]=l;
		}
		// If all lines are outside the image, abort.
		if (minx>=maxx || miny>=maxy) {
			return;
		}
		// Sort by min y.
		/*for (i=1;i<ycnt;i++) {
			j=i;l=lr[i];tmp=l.miny;
			while (j>0 && tmp<lr[j-1].miny) {lr[j]=lr[j-1];j--;}
			lr[j]=l;
		}*/
		var half,i0,i1,j0,j1;
		var dst=this.tmpsort;
		if (dst.length<ycnt) {
			dst=new Array(ycnt*2);
			this.tmpsort=dst;
		}
		for (half=1;half<ycnt;half+=half) {
			for (i=0;i<ycnt;) {
				i0=i ;i1=i +half;i1=i1<ycnt?i1:ycnt;
				j0=i1;j1=i1+half;j1=j1<ycnt?j1:ycnt;
				while (i0<i1 && j0<j1) {
					if (lr[i0].miny<=lr[j0].miny) {dst[i++]=lr[i0++];}
					else {dst[i++]=lr[j0++];}
				}
				while (i0<i1) {dst[i++]=lr[i0++];}
				while (j0<j1) {dst[i++]=lr[j0++];}
			}
			tmp=lr;lr=dst;dst=tmp;
		}
		if (!Object.is(this.tmpline,lr)) {
			tmp=lr;lr=dst;dst=tmp;
			for (i=0;i<ycnt;i++) {lr[i]=dst[i];}
		}
		// Split RGB.
		var colrgba=this.rgba32[0];
		var coll=(colrgba&0x00ff00ff)>>>0;
		var colh=(colrgba&0xff00ff00)>>>0;
		var colh2=colh>>>8;
		// Process the lines row by row.
		var ylo=0,yhi=0,y=miny,ynext=y,ny;
		var pixrow=(imgheight-1-y)*imgwidth;
		while (y<maxy) {
			// Add any new lines on this row.
			ny=y+1;
			while (ynext<ny) {
				l=lr[yhi++];
				l.minr=0;
				l.maxr=0;
				ynext=yhi<ycnt?lr[yhi].miny:maxy;
			}
			// Sort by min row and remove rows we've passed.
			for (i=ylo;i<yhi;i++) {
				l=lr[i];j=i;
				if (l.maxy<=y) {
					while (j>ylo) {lr[j]=lr[j-1];j--;}
					ylo++;
				} else {
					l.minr=Math.min(Math.max(Math.floor((l.dxy>0?y:ny)*l.dxy+l.cxy),l.minx),maxx);
					l.maxr=Math.min(Math.ceil((l.dxy>0?ny:y)*l.dxy+l.cxy),l.maxx);
					tmp=l.minr;
					while (j>ylo && tmp<lr[j-1].minr) {lr[j]=lr[j-1];j--;}
				}
				lr[j]=l;
			}
			// Skip any gaps of empty rows.
			if (ylo===yhi) {
				if (ylo>=ycnt) {break;}
				y=ynext;
				pixrow=y*imgwidth;
				continue;
			}
			var xlo=ylo,xhi=ylo,x=lr[xhi].minr,xnext=x;
			var area=0.0,a;
			var pixcol,pixstop,dst;
			// Process the lines on this row, column by column.
			while (x<maxx) {
				while (xnext<=x) {
					l=lr[xhi++];
					l.area=0.0;
					xnext=xhi<yhi?lr[xhi].minr:maxx;
				}
				for (i=xlo;i<xhi;i++) {
					l=lr[i];
					if (l.maxr<=x) {
						j=i;
						while (j>xlo) {lr[j]=lr[j-1];j--;}
						lr[j]=l;
						xlo++;
					}
					// Clamp the line segment to the unit square and calculate the area to the right.
					y0=l.y0-y;
					y1=l.y1-y;
					x0=l.x0-x;
					x1=l.x1-x;
					var x0y=y0-x0*l.dyx;
					var x1y=x0y+l.dyx;
					var y0x=x0-y0*l.dxy;
					var y1x=y0x+l.dxy;
					tmp=0.0;
					if (y0<0.0) {
						x0=y0x;
						y0=0.0;
					} else if (y0>1.0) {
						x0=y1x;
						y0=1.0;
					}
					if (y1<0.0) {
						x1=y0x;
						y1=0.0;
					} else if (y1>1.0) {
						x1=y1x;
						y1=1.0;
					}
					if (x0<0.0) {
						tmp+=x0y-y0;
						x0=0.0;
						y0=x0y;
					} else if (x0>1.0) {
						x0=1.0;
						y0=x1y;
					}
					if (x1<0.0) {
						tmp+=y1-x0y;
						x1=0.0;
						y1=x0y;
					} else if (x1>1.0) {
						x1=1.0;
						y1=x1y;
					}
					tmp+=(y1-y0)*(2-x0-x1)*0.5;
					area+=tmp-l.area;
					l.area=tmp;
				}
				// Shade the pixels based on how much we're covering.
				pixcol=pixrow+x;
				x=xlo===xhi?xnext:(x+1);
				pixstop=pixrow+x;
				if (area>=0.9981) {
					while (pixcol<pixstop) {
						imgdata[pixcol++]=colrgba;
					}
				} else if (area>0.0019) {
					a=Math.floor((1.0-area)*256);
					while (pixcol<pixstop) {
						dst=imgdata[pixcol];
						imgdata[pixcol++]=
							(((Math.imul((dst&0x00ff00ff)-coll,a)>>>8)+coll)&0x00ff00ff)+
							((Math.imul(((dst&0xff00ff00)>>>8)-colh2,a)+colh)&0xff00ff00);
					}
				}
			}
			pixrow-=imgwidth;
			y++;
		}
	}
