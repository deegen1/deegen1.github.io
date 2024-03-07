	sortpoly(arr,start,stop,field) {
		var len=stop-start,i;
		if (len<33) {
			for (i=start+1;i<stop;i++) {
				var j=i,obj=arr[i],val=obj[field];
				while (j>start && val<arr[j-1][field]) {
					arr[j]=arr[j-1];
					j--;
				}
				arr[j]=obj;
			}
			return;
		}
		if (this.sortobj===undefined || this.sortobj.length<stop) {
			this.sortobj=new Array(stop*2);
		}
		var dst=this.sortobj,arr0=arr,tmp;
		for (var half=1;half<len;half+=half) {
			var hstop=stop-half;
			for (i=start;i<stop;) {
				var i0=i ,i1=i <hstop?i +half:stop;
				var j0=i1,j1=i1<hstop?i1+half:stop;
				if (i0<i1 && j0<j1) {
					var io=arr[i0],iv=io[field];
					var jo=arr[j0],jv=jo[field];
					while (1) {
						if (iv<=jv) {
							dst[i++]=io;
							if (++i0>=i1) {break;}
							io=arr[i0];iv=io[field];
						} else {
							dst[i++]=jo;
							if (++j0>=j1) {break;}
							jo=arr[j0];jv=jo[field];
						}
					}
				}
				while (i0<i1) {dst[i++]=arr[i0++];}
				while (j0<j1) {dst[i++]=arr[j0++];}
			}
			tmp=dst;dst=arr;arr=tmp;
		}
		if (!Object.is(arr0,arr)) {
			for (i=start;i<stop;i++) {arr0[i]=arr[i];}
		}
	}


	fillpoly(poly,trans) {
		// Preprocess the lines and curves. Reject anything with a NaN, too narrow, or
		// outside the image.
		if (poly ===undefined) {poly =this.defpoly ;}
		if (trans===undefined) {trans=this.deftrans;}
		if (poly.lineidx<=0 && poly.curvidx<=0) {return;}
		var l,i,j,tmp;
		var imgwidth=this.img.width,imgheight=this.img.height,imgdata=this.img.data32;
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
		var lr=this.tmpline,lrcnt=lr.length,ycnt=0,newlen;
		if (ycnt+(poly.lineidx>>1)>=lrcnt) {
			newlen=(ycnt+(poly.lineidx>>1))*2;
			while (lrcnt<newlen) {lr.push({});lrcnt++;}
			this.tmpline=lr;
		}
		for (i=poly.lineidx-2;i>=0;i-=2) {
			var a=poly.linearr[i],b=poly.linearr[i+1];
			l=lr[ycnt++];
			l.x0=tv[a  ];
			l.y0=tv[a+1];
			l.x1=tv[b  ];
			l.y1=tv[b+1];
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
					newlen=(ycnt+1)*2;
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
			p2x=(p2x-p1x)*3;p1x=(p1x-p0x)*3;p3x-=p0x+p2x;p2x-=p1x;
			p2y=(p2y-p1y)*3;p1y=(p1y-p0y)*3;p3y-=p0y+p2y;p2y-=p1y;
			var ppx=p0x,ppy=p0y,u0=0;
			for (j=0;j<4;j++) {
				var u1=(j+1)/4;
				var cpx=p0x+u1*(p1x+u1*(p2x+u1*p3x))-ppx;
				var cpy=p0y+u1*(p1y+u1*(p2y+u1*p3y))-ppy;
				var dist=Math.sqrt(cpx*cpx+cpy*cpy);
				var segs=Math.ceil(dist/splitlen);
				// Split up the current segment.
				if (ycnt+segs>=lrcnt) {
					newlen=(ycnt+segs)*2;
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
			if (/*l.minx<imgwidth && */l.miny<l.maxy && dx===dx && Math.abs(dy)>1e-10) {
				l.dxy=dx/dy;
				l.dyx=Math.abs(dx)>1e-10?dy/dx:0;
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
		var rl=this.rowlines,r,ridx;
		if (rl===undefined || rl.length<lr.length) {
			rl=new Array(lr.length*4+1);
			for (i=0;i<rl.length;i++) {rl[i]=[0,0,0];}
			this.rowlines=rl;
		}
		// Sort by min y.
		this.sortpoly(lr,0,ycnt,"miny");
		// Init blending.
		var ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,imask=1.0/amask;
		var maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		var sa,da;// ,sa0,sa1,sai;
		var amul=this.rgba[3]/255.0;
		var colrgb=(this.rgba32[0]&~amask)>>>0,colrgba=(colrgb|amask)>>>0;
		var coll=(colrgb&0x00ff00ff)>>>0,colh=(colrgb&0xff00ff00)>>>0,colh8=colh>>>8;
		var filllim=(255-0.5)/255;
		// Process the lines row by row.
		var ylo=0,yhi=0,y=miny,ynext=y,ny;
		var pixrow=(imgheight-1-y)*imgwidth;
		while (y<maxy) {
			// Add any new lines on this row.
			ny=y+1;
			while (ynext<ny) {
				l=lr[yhi++];
				ynext=yhi<ycnt?lr[yhi].miny:maxy;
			}
			// Sort by min row and remove rows we've passed.
			ridx=0;
			for (i=ylo;i<yhi;i++) {
				l=lr[i];
				if (l.maxy<=y) {
					lr[i]=lr[ylo];
					lr[ylo++]=l;
					continue;
				}
				//
				//     fx0  fx0+1                          fx1  fx1+1
				//      +-----+-----+-----+-----+-----+-----+-----+
				//      |                              .....----  |
				//      |               .....-----'''''           |
				//      | ....-----'''''                          |
				//      +-----+-----+-----+-----+-----+-----+-----+
				//       first  dyx   dyx   dyx   dyx   dyx  last   tail
				//
				x0=l.x0;y0=l.y0-y;
				x1=l.x1;y1=l.y1-y;
				var tmul=amul;
				if (x0>x1) {
					tmul=-tmul;
					tmp=x0;x0=x1;x1=tmp;
					tmp=y0;y0=y1;y1=tmp;
				}
				var y0x=x0-y0*l.dxy;
				var y1x=y0x+l.dxy;
				if (y0<0) {y0=0;x0=y0x;}
				if (y0>1) {y0=1;x0=y1x;}
				if (y1<0) {y1=0;x1=y0x;}
				if (y1>1) {y1=1;x1=y1x;}
				var fx0=Math.floor(x0);
				var fx1=Math.floor(x1);
				x0-=fx0;
				x1-=fx1;
				if (fx0===fx1) {
					// Vertical line - avoid divisions.
					var dy=(y0-y1)*tmul,c=(2-x0-x1)*dy*0.5;
					r=rl[ridx++]; r[0]=fx0  ; r[1]=0; r[2]=c;
					r=rl[ridx++]; r[0]=fx1+1; r[1]=0; r[2]=dy-c;
				} else {
					var dyx=l.dyx*tmul;
					var mul=dyx*0.5,n0=x0-1,n1=x1-1;
					r=rl[ridx++]; r[0]=fx0  ; r[1]=   0; r[2]=-n0*n0*mul;
					r=rl[ridx++]; r[0]=fx0+1; r[1]=-dyx; r[2]= x0*x0*mul;
					r=rl[ridx++]; r[0]=fx1  ; r[1]=   0; r[2]= n1*n1*mul;
					r=rl[ridx++]; r[0]=fx1+1; r[1]= dyx; r[2]=-x1*x1*mul;
				}
				l.minx=fx0;
				j=i;
				while (j>ylo && l.minx<lr[j-1].minx) {
					lr[j]=lr[j-1];
					j--;
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
			rl[ridx][0]=maxx;
			// this.sortpoly(lr,ylo,yhi,"minx");
			// this.sortpoly(rl,0,ridx,0);
			for (i=1;i<ridx;i++) {
				j=i;r=rl[j];tmp=r[0];
				while (j>0 && tmp<rl[j-1][0]) {
					rl[j]=rl[j-1];
					j--;
				}
				rl[j]=r;
			}
			ridx=0;
			// Process the lines on this row, column by column.
			var xnext=rl[0][0]+pixrow,x=Math.max(xnext,pixrow+minx);
			var xstop=pixrow+maxx;
			var area=0.0,arearate=0.0;
			while (x<xstop) {
				while (x>=xnext) {
					r=rl[ridx++];
					area-=r[1]*(x-xnext)+r[2];
					arearate-=r[1];
					xnext=pixrow+rl[ridx][0];
				}
				// Shade the pixels based on how much we're covering.
				var pixstop=x+1;
				if (Math.abs(arearate)<0.001953) {
					tmp=Math.floor(area*255+0.5);
					// (area+arearate+arearate*(nx-x))*255>tmp+0.5
					// (area+arearate+arearate*(nx-x))*255<tmp-0.5
					if (arearate<0) {
						if (tmp>255) {tmp=255;}
						else if (tmp<1) {tmp=-Infinity;}
						tmp-=0.5;
					} else {
						if (tmp<1) {tmp=1;}
						else if (tmp>=255) {tmp=Infinity;}
						tmp+=0.5;
					}
					tmp=(tmp/255-area)/arearate+x;
					pixstop=(tmp>x && tmp<xnext)?Math.ceil(tmp):xnext;
					//if (pixstop>xstop) {pixstop=xstop;}
				}
				var adif=(pixstop-x-1)*arearate;
				area+=arearate;
				if (area>=filllim) {
					tmp=colrgb|(Math.floor(area*255+0.5)<<ashift);
					while (x<pixstop) {imgdata[x++]=tmp;}
				} else if (area>0.001954) {
					// a = sa + da*(1-sa)
					// c = (sc*sa + dc*da*(1-sa)) / a
					var sa1=256-Math.floor(area*256+0.5);
					while (x<pixstop) {
						tmp=imgdata[x];
						da=(tmp&amask)>>>0;
						if (da===amask) {
							sa=sa1;
						} else {
							da=area+da*imask*(1-area);
							sa=256-Math.floor((area/da)*256+0.5);
							da=Math.floor(da*255+0.5)<<ashift;
						}
						imgdata[x++]=da|
							(((Math.imul((tmp&0x00ff00ff)-coll,sa)>>>8)+coll)&maskl)|
							((Math.imul(((tmp>>>8)&0x00ff00ff)-colh8,sa)+colh)&maskh);
					}
				} else {
					x=pixstop;
				}
				area+=adif;
			}
			pixrow-=imgwidth;
			y++;
		}
	}
