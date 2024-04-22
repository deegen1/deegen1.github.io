	addline(x0,y0,x1,y1,rad) {
		var dx=x1-x0,dy=y1-y0;
		var dist=dx*dx+dy*dy;
		if (dist<1e-20) {
			x1=x0;
			y1=y0;
			dx=rad;
			dy=0.0;
		} else {
			dist=rad/Math.sqrt(dist);
			dx*=dist;
			dy*=dist;
		}
		const a=1.00005519,b=0.55342686,c=0.99873585;
		var ax=a*dx,ay=a*dy;
		var bx=b*dx,cy=c*dy,c0=bx-cy,c3=bx+cy;
		var cx=c*dx,by=b*dy,c1=cx+by,c2=cx-by;
		this.moveto(x1-ay,y1+ax);
		this.curveto(x1+c0,y1+c1,x1+c2,y1+c3,x1+ax,y1+ay);
		this.curveto(x1+c1,y1-c0,x1+c3,y1-c2,x1+ay,y1-ax);
		this.lineto(x0+ay,y0-ax);
		this.curveto(x0-c0,y0-c1,x0-c2,y0-c3,x0-ax,y0-ay);
		this.curveto(x0-c1,y0+c0,x0-c3,y0+c2,x0-ay,y0+ax);
		this.close();
		return this;
	}
