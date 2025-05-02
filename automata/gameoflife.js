/*------------------------------------------------------------------------------


gameoflife.js - v2.07

Copyright 2020 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint gameoflife.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Game of Life Engine


class Life {
	// Conway's Game of Life
	// Rules:
	// A live cell with fewer than 2 live neighbors dies by underpopulation.
	// A live cell with greater than 3 live neighbors dies by overpopulation.
	// A dead cell with 3 live neighbors becomes alive by reproduction.
	// All other cells stay the same.
	//
	// Cells are added to the processing queue if their state has changed.
	//
	// Cell state queries are sped up by using coordinate hashing with a hash table of
	// linked lists.
	//
	// Cell states are stored in a single integer so we can advance their state with a
	// single table lookup. Their format is:
	//
	//      state=[3-6:count][2:in queue][1:prev][0:alive]


	constructor() {
		this.dim=2;
		this.count=0;
		this.queue=null;
		this.deleted=null;
		this.hashmask=0;
		this.hashtable=[null];
		// Neighbors that contribute to a cell's count.
		this.neighbors=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
		// mnrule is used to manage whether to queue or delete the cell and set prev=alive.
		// We want the queue bit to be 0 as often as possible to avoid requeuing cells.
		// carule is the cellular automata rule.
		this.mnrule=new Array(72);
		this.carule=new Array(72);
		for (let i=0;i<72;i++) {
			let alive=i&1;
			let queue=(i>>2)&1;
			let count=i>>3;
			let next=((count|alive)===3)|0;
			this.mnrule[i]=(i&~6)|(alive<<1)|((queue&(alive^next))<<2);
			this.carule[i]=(i&~3)|(alive<<1)|next;
		}
		// Important patterns.
		this.pattern={
			"glider":"x=3,y=3,rule=B3/S23\nbob$2bo$3o!",
			"ship"  :"x=5,y=4,rule=B3/S23\no2bob$4bo$o3bo$b4o!",
			"eater" :"x=4,y=4,rule=B3/S23\n2o2b$obob$2bob$2b2o!",
			"gosper":`x=36,y=9,rule=B3/S23\n
			         24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5b\n
			         o3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o!`
		};
	}


	hashcoords(coord) {
		let val=0x66daacfd;
		let dim=coord.length;
		for (let i=0;i<dim;i++) {
			val+=coord[i];
			val=Math.imul(val^(val>>>16),0xf8b7629f);
			val=Math.imul(val^(val>>> 8),0xcbc5c2b5);
			val=Math.imul(val^(val>>>24),0xf5a5bda5);
		}
		return val>>>0;
	}


	reset() {
		this.count=0;
		this.queue=null;
		this.deleted=null;
		this.hashmask=0;
		this.hashtable=[null];
	}


	checkresize() {
		// Checks if the hash table needs to be resized.
		// Grow   if cells > table
		// Shrink if cells < table/4
		let oldtable=this.hashtable;
		let oldlen=oldtable.length;
		let newlen=oldlen;
		let cells=this.count>64?this.count:64;
		while (cells>newlen) {
			newlen+=newlen?newlen:1;
		}
		cells<<=2;
		while (cells<newlen) {
			newlen=newlen>>>1;
		}
		if (oldlen===newlen) {
			return;
		}
		let newtable=(new Array(newlen)).fill(null);
		let newmask=newlen-1;
		let cell,oldnext,newnext,newhash;
		for (let i=0;i<oldlen;i++) {
			cell=oldtable[i];
			while (cell!==null) {
				oldnext=cell.next;
				newhash=cell.hash&newmask;
				newnext=newtable[newhash];
				newtable[newhash]=cell;
				if (newnext!==null) {
					newnext.prev=cell;
				}
				cell.prev=null;
				cell.next=newnext;
				cell=oldnext;
			}
		}
		this.hashtable=newtable;
		this.hashmask=newmask;
	}


	makecell(coord) {
		// Return the cell at the given coordinates, or make a new one.
		let hash=this.hashcoords(coord);
		let hashtable=this.hashtable;
		let mask=this.hashmask;
		let next=hashtable[hash&mask];
		let cell=next;
		let i,dim=this.dim;
		while (cell!==null) {
			if (cell.hash===hash) {
				for (i=0;i<dim && cell.coord[i]===coord[i];i++) {}
				if (i===dim) {break;}
			}
			cell=cell.next;
		}
		if (cell===null) {
			// Make a new cell. Use a previously deleted one if possible.
			cell=this.deleted;
			if (cell!==null) {
				this.deleted=cell.queue;
			} else {
				cell={coord:new Array(dim)};
			}
			for (i=0;i<dim;i++) {
				cell.coord[i]=coord[i];
			}
			cell.state=0;
			cell.queue=null;
			cell.hash=hash;
			cell.prev=null;
			cell.next=next;
			if (next!==null) {
				next.prev=cell;
			}
			hashtable[hash&mask]=cell;
			if (++this.count>hashtable.length) {
				this.checkresize();
			}
		}
		// If it's not queued, add it.
		if ((cell.state&4)===0) {
			cell.state|=4;
			cell.queue=this.queue;
			this.queue=cell;
		}
		return cell;
	}


	advance(generations) {
		// Advance the state by a given number of generations.
		if (generations===undefined) {generations=1;}
		let dim=this.dim;
		let neighbors=this.neighbors;
		let neighlen=neighbors.length;
		let ncoord=new Array(dim);
		let coord,i,j,ndif,rule,cell;
		let state,inc;
		let qnext,prev,next;
		while (generations>0) {
			// Management loop. If a cell has been updated, update its neighbors. Also check if
			// the cell should be requeued or deleted.
			generations--;
			this.checkresize();
			rule=this.mnrule;
			cell=this.queue;
			this.queue=null;
			while (cell!==null) {
				qnext=cell.queue;
				state=rule[cell.state];
				inc=((state|4)-cell.state)<<2;
				cell.state=state;
				// Update neighbors.
				if (inc!==0) {
					coord=cell.coord;
					for (i=0;i<neighlen;i++) {
						ndif=neighbors[i];
						for (j=0;j<dim;j++) {ncoord[j]=coord[j]+ndif[j];}
						this.makecell(ncoord).state+=inc;
					}
				}
				// Delete or requeue cell.
				if (state===0) {
					prev=cell.prev;
					next=cell.next;
					if (prev!==null) {
						prev.next=next;
					} else {
						i=cell.hash&this.hashmask;
						this.hashtable[i]=next;
					}
					if (next!==null) {
						next.prev=prev;
					}
					cell.queue=this.deleted;
					this.deleted=cell;
					this.count--;
				} else if (state&4) {
					cell.queue=this.queue;
					this.queue=cell;
				}
				cell=qnext;
			}
			// Cellular automata loop.
			rule=this.carule;
			cell=this.queue;
			while (cell!==null) {
				cell.state=rule[cell.state];
				cell=cell.queue;
			}
		}
	}


	setcell(coord,state) {
		// Set a cell to the given state.
		state=state?1:0;
		if (this.getcell(coord)!==state) {
			this.makecell(coord).state^=1;
		}
	}


	getcell(coord) {
		// Get the state of given cell.
		let i,dim=this.dim;
		// let hash=this.hashcoords(coord);
		let hash=0x66daacfd;
		for (i=0;i<dim;i++) {
			hash+=coord[i];
			hash=Math.imul(hash^(hash>>>16),0xf8b7629f);
			hash=Math.imul(hash^(hash>>> 8),0xcbc5c2b5);
			hash=Math.imul(hash^(hash>>>24),0xf5a5bda5);
		}
		hash=hash>>>0;
		let cell=this.hashtable[hash&this.hashmask],cpos;
		while (cell!==null) {
			if (cell.hash===hash) {
				cpos=cell.coord;
				for (i=0;i<dim && cpos[i]===coord[i];i++) {}
				if (i===dim) {return cell.state&1;}
			}
			cell=cell.next;
		}
		return 0;
	}


	setcells(pat,fmt,coord,trans) {
		// Draw a pattern on the grid.
		//
		// trans values : 0-3=rotate, 4=flip horizontally, 8=flip vertically.
		//
		// format values: points, plaintext, lif, rle, file, and None.
		// If fmt=None, the format will be guessed.
		let dim=this.dim;
		let i,j;
		if (!fmt) {
			// Guess what format we're using. Never guess "file".
			let formats=["rle","lif","plaintext","points"];
			for (i=0;i<formats.length;i++) {
				try {
					return this.setcells(pat,formats[i],coord,trans);
				} catch {
				}
			}
			throw "Unable to determine pattern type";
		}
		let points=[];
		let pt;
		if (fmt==="points") {
			// Transform the array of points and plot them.
			trans=trans?(trans>>>0)&15:0;
			let m01=0,m10=0,t;
			let m00=(trans&4)?-1:1;
			let m11=(trans&8)?-1:1;
			while (trans&3) {
				trans--;
				t=m00;m00=-m10;m10=t;
				t=m01;m01=-m11;m11=t;
			}
			let x=coord[0]+(m00<m01?m00:m01);
			let y=coord[1]+(m10<m11?m10:m11);
			let len=pat.length;
			points=[];
			for (i=0;i<len;i++) {
				pt=pat[i];
				if (pt.length<dim || (typeof pt[0])!=="number" || (typeof pt[1])!=="number") {
					throw "Not an array of points";
				}
				points.push([x+m00*pt[0]+m01*pt[1],y+m10*pt[0]+m11*pt[1]]);
			}
			for (i=0;i<len;i++) {
				this.setcell(points[i],1);
			}
			return points;
		}
		// We need to parse a pattern.
		if ((typeof pat)!=="string") {
			throw "Pattern must be a string";
		}
		let space=new RegExp("\\s","g");
		let linearr=pat.split("\n");
		let lines=linearr.length;
		let line;
		for (i=0;i<lines;i++) {
			linearr[i]=linearr[i].replace(space,"").toLowerCase();
		}
		let c,dx=0,dy=0;
		if (fmt==="plaintext") {
			// A plaintext grid of cells. !=comment, .=dead, O=alive
			for (i=0;i<lines;i++) {
				line=linearr[i];
				if (line==="" || line[0]==="!") {continue;}
				dx=0;
				let linelen=line.length;
				for (j=0;j<linelen;j++) {
					c=line[j];
					if (c==="o") {points.push([dx,dy]);}
					else if (c!==".") {throw "Invalid plaintext character";}
					dx+=1;
				}
				dy+=1;
			}
		} else if (fmt==="lif") {
			// Life 1.06 file format.
			if (lines===0 || linearr[0]!=="#life1.06") {
				throw "Invalid Life 1.06 header";
			}
			for (i=1;i<lines;i++) {
				line=linearr[i];
				if (line==="") {continue;}
				try {
					pt=line.split(" ");
					pt=[parseInt(pt[0]),parseInt(pt[1])];
					if (isNaN(pt[0]) || isNaN(pt[1])) {throw "";}
				} catch {
					throw "Unable to parse life 1.06 pattern";
				}
				points.push(pt);
			}
		} else if (fmt==="rle") {
			// Run length encoding.
			let head="",data="";
			for (i=0;i<lines;i++) {
				line=linearr[i];
				if      (line==="") {continue;}
				else if (line[0]==="x") {head=line.toLowerCase();}
				else if (line[0]!=="#") {data+=line;}
			}
			let w=null,h=null;
			try {
				let arr=head.split(",");
				w=parseInt(arr[0].substr(2));
				h=parseInt(arr[1].substr(2));
			} catch {
				w=" ";
			}
			if (head!=="x="+w+",y="+h+",rule=b3/s23") {
				throw "Unable to parse RLE header";
			}
			let num=0;
			let datalen=data.length;
			for (i=0;i<datalen;i++) {
				c=data[i];
				if (c==="o" || c==="b") {
					num+=(num===0)+dx;
					while (dx<num) {
						if (c==="o") {points.push([dx,dy]);}
						dx+=1;
					}
				} else if (c==="$" || c==="!") {
					dx=0;dy+=num+(num===0);
					if (c==="!") {break;}
				} else if (!isNaN(c)) {
					num=num*10+c.charCodeAt(0)-48;
					continue;
				} else {
					throw "Unrecognized character in RLE data";
				}
				num=0;
			}
		} else {
			throw "Format "+fmt+" unrecognized";
		}
		return this.setcells(points,"points",coord,trans);
	}


	getcells(xy,wh,fmt) {
		// Return the living cells in a given area. If xy or wh are None, return
		// all cells. Allowed formats are: points, plaintext, lif, and rle.
		let dim=this.dim;
		let min=new Array(dim);
		let max=new Array(dim);
		let i,j,cells,cell;
		let points=[],pt=new Array(dim);
		if (!xy) {wh=undefined;}
		let area=1;
		for (i=0;i<dim;i++) {
			min[i]=!xy?-Infinity:xy[i];
			let bnd=!wh?Infinity:wh[i];
			if (bnd<0) {
				min[i]+=bnd;
				bnd=-bnd;
			}
			max[i]=min[i]+bnd;
			min[i]=isNaN(min[i])?-Infinity:min[i];
			max[i]=isNaN(max[i])? Infinity:max[i];
			area=(area>=Infinity || bnd>=Infinity)?Infinity:area;
		}
		let table=this.hashtable;
		if (area>=this.count || dim<=0) {
			// Get all living cells in the universe.
			cells=table.length;
			for (i=0;i<cells;i++) {
				cell=table[i];
				while (cell!==null) {
					if (cell.state&1) {
						pt=cell.coord;
						for (j=0;j<dim && pt[j]>=min[j] && pt[j]<max[j];j++) {}
						if (j===dim) {points.push(pt.slice());}
					}
					cell=cell.next;
				}
			}
		} else {
			// Get all living cells in a boundary.
			i=0;
			let hash,dim1=dim-1;
			let coord=min.map(function(x){return x-1;});
			let coordhash=new Array(dim);
			coordhash[0]=0x66daacfd;
			while (i>=0) {
				hash=++coord[i];
				if (hash>=max[i]) {
					coord[i]=min[i]-1;
					i--;
					continue;
				}
				hash+=coordhash[i];
				hash=Math.imul(hash^(hash>>>16),0xf8b7629f);
				hash=Math.imul(hash^(hash>>> 8),0xcbc5c2b5);
				hash=Math.imul(hash^(hash>>>24),0xf5a5bda5)>>>0;
				if (i<dim1) {
					coordhash[++i]=hash;
					continue;
				}
				// Get the cell at coord[].
				cell=table[hash&this.hashmask];
				while (cell!==null) {
					if (cell.hash===hash) {
						for (j=0;j<dim && cell.coord[j]===coord[j];j++) {}
						if (j===dim) {
							if (cell.state&1) {points.push(coord.slice());}
							break;
						}
					}
					cell=cell.next;
				}
			}
		}
		// Redefine boundaries to active cells.
		let len=points.length;
		for (j=0;j<dim;j++) {
			let xmin=Infinity,xmax=-Infinity;
			for (i=0;i<len;i++) {
				let x=points[i][j];
				xmin=xmin>x?x:xmin;
				xmax=xmax<x?x:xmax;
			}
			for (i=0;i<len;i++) {
				points[i][j]-=xmin;
			}
			max[j]=xmin<=xmax?xmax-xmin+1:0;
		}
		let w,h,ret;
		if (fmt==="points") {
			// A list of points.
			return points;
		} else if (fmt==="plaintext" || !fmt) {
			// A plaintext grid of cells. !=comment, .=dead, O=alive
			w=max[0]+1;
			h=max[1];
			cells=h*w;
			ret=new Array(cells);
			for (i=0;i<cells;i++) {ret[i]=".";}
			for (i=w-1;i<cells;i+=w) {ret[i]="\n";}
			for (i=0;i<len;i++) {pt=points[i];ret[pt[1]*w+pt[0]]="O";}
			return ret.join("");
		} else if (fmt==="lif") {
			// Life 1.06 file format.
			ret="#Life 1.06\n";
			for (i=0;i<len;i++) {
				ret+=points[i].join(" ")+"\n";
			}
			return ret;
		} else if (fmt==="rle") {
			// Run length encoding.
			w=max[0];
			h=max[1];
			ret="x = "+w+", y = "+h+", rule = B3/S23\n";
			let eol=ret.length;
			let lx=0,ly=0,cnt=0,dx,dy;
			let addnum=function(num,t) {
				if (num>1) {ret+=num;}
				if (num>0) {ret+=t;}
				if (ret.length-eol>69) {
					ret+="\n";
					eol=ret.length;
				}
			};
			for (i=0;i<len;i++) {
				pt=points[i];
				dx=pt[0]-lx;
				dy=pt[1]-ly;
				if (dx || dy) {addnum(cnt,"o");cnt=0;}
				if (dy) {dx=w-lx;}
				addnum(dx,"b");
				addnum(dy,"$");
				if (dy) {addnum(pt[0],"b");}
				lx=pt[0]+1;
				ly=pt[1];
				cnt+=1;
			}
			addnum(cnt,"o");
			return ret+"!\n";
		}
		throw "Format "+fmt+" unrecognized";
	}

}


//---------------------------------------------------------------------------------
// Input - v1.15


class Input {

	static KEY={
		A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74,
		K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84,
		U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
		0: 48, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54, 7: 55, 8: 56, 9: 57,
		SPACE: 32,
		LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40
	};


	static MOUSE={
		LEFT: 256, MID: 257, RIGHT: 258
	};


	constructor(focus) {
		this.focus=null;
		this.focustab=null;
		this.focustouch=null;
		if (focus!==undefined && focus!==null) {
			this.focus=focus;
			// An element needs to have a tabIndex to be focusable.
			this.focustab=focus.tabIndex;
			this.focustouch=focus.style.touchAction;
			if (focus.tabIndex<0) {
				focus.tabIndex=1;
			}
		}
		this.active=null;
		this.scrollupdate=false;
		this.scroll=[window.scrollX,window.scrollY];
		this.mousepos=[NaN,NaN];
		this.mouseraw=[NaN,NaN];
		this.mousez=0;
		this.touchfocus=0;
		this.clickpos=[0,0];
		this.repeatdelay=0.5;
		this.repeatrate=0.05;
		this.navkeys={32:1,37:1,38:1,39:1,40:1};
		this.stopnav=0;
		this.stopnavfocus=0;
		this.keystate={};
		this.listeners=[];
		this.initmouse();
		this.initkeyboard();
		this.reset();
		for (let i=0;i<this.listeners.length;i++) {
			let list=this.listeners[i];
			document.addEventListener(list[0],list[1],list[2]);
		}
	}


	release() {
		if (this.focus!==null) {
			this.focus.tabIndex=this.focustab;
		}
		this.enablenav();
		for (let i=0;i<this.listeners.length;i++) {
			let list=this.listeners[i];
			document.removeEventListener(list[0],list[1],list[2]);
		}
		this.listeners=[];
		this.reset();
	}


	reset() {
		this.mousez=0;
		let statearr=Object.values(this.keystate);
		let statelen=statearr.length;
		for (let i=0;i<statelen;i++) {
			let state=statearr[i];
			state.down=0;
			state.hit=0;
			state.repeat=0;
			state.time=null;
			state.active=null;
			state.isactive=0;
		}
		this.active=null;
	}


	update() {
		// Process keys that are active.
		let focus=this.focus===null?document.hasFocus():Object.is(document.activeElement,this.focus);
		if (this.touchfocus!==0) {focus=true;}
		this.stopnavfocus=focus?this.stopnav:0;
		let time=performance.now()/1000.0;
		let delay=time-this.repeatdelay;
		let rate=1.0/this.repeatrate;
		let state=this.active;
		let active=null;
		let down,next;
		while (state!==null) {
			next=state.active;
			down=focus?state.down:0;
			state.down=down;
			if (down>0) {
				let repeat=Math.floor((delay-state.time)*rate);
				state.repeat=(repeat>0 && (repeat&1)===0)?state.repeat+1:0;
			} else {
				state.repeat=0;
				state.hit=0;
			}
			state.isactive=down?1:0;
			if (state.isactive!==0) {
				state.active=active;
				active=state;
			}
			state=next;
		}
		this.active=active;
	}


	disablenav() {
		this.stopnav=1;
		if (this.focus!==null) {
			this.focus.style.touchAction="pinch-zoom";
		}
	}


	enablenav() {
		this.stopnav=0;
		if (this.focus!==null) {
			this.focus.style.touchAction=this.focustouch;
		}
	}


	makeactive(code) {
		let state=this.keystate[code];
		if (state===null || state===undefined) {
			state=null;
		} else if (state.isactive===0) {
			state.isactive=1;
			state.active=this.active;
			this.active=state;
		}
		return state;
	}


	// ----------------------------------------
	// Mouse


	initmouse() {
		let state=this;
		this.MOUSE=this.constructor.MOUSE;
		let keys=Object.keys(this.MOUSE);
		for (let i=0;i<keys.length;i++) {
			let code=this.MOUSE[keys[i]];
			this.keystate[code]={
				name: "MOUSE."+keys[i],
				code: code
			};
		}
		// Mouse controls.
		function mousemove(evt) {
			state.setmousepos(evt.pageX,evt.pageY);
		}
		function mousewheel(evt) {
			state.addmousez(evt.deltaY<0?-1:1);
		}
		function mousedown(evt) {
			if (evt.button===0) {
				state.setkeydown(state.MOUSE.LEFT);
				state.clickpos=state.mousepos.slice();
			}
		}
		function mouseup(evt) {
			if (evt.button===0) {
				state.setkeyup(state.MOUSE.LEFT);
			}
		}
		function onscroll() {
			// Update relative position on scroll.
			if (state.scrollupdate) {
				let difx=window.scrollX-state.scroll[0];
				let dify=window.scrollY-state.scroll[1];
				state.setmousepos(state.mouseraw[0]+difx,state.mouseraw[1]+dify);
			}
		}
		// Touch controls.
		function touchmove(evt) {
			let touch=evt.touches;
			if (touch.length===1) {
				touch=touch.item(0);
				state.setkeydown(state.MOUSE.LEFT);
				state.setmousepos(touch.pageX,touch.pageY);
			} else {
				// This is probably a gesture.
				state.setkeyup(state.MOUSE.LEFT);
			}
		}
		function touchstart(evt) {
			// We need to manually determine if the user has touched our focused object.
			state.touchfocus=1;
			let focus=state.focus;
			if (focus!==null) {
				let touch=evt.touches.item(0);
				let rect=state.getrect(focus);
				let x=touch.pageX-rect.x;
				let y=touch.pageY-rect.y;
				if (x<0 || x>=rect.w || y<0 || y>=rect.h) {
					state.touchfocus=0;
				}
			}
			// touchstart doesn't generate a separate mousemove event.
			touchmove(evt);
			state.clickpos=state.mousepos.slice();
		}
		function touchend() {
			state.touchfocus=0;
			state.setkeyup(state.MOUSE.LEFT);
		}
		function touchcancel() {
			state.touchfocus=0;
			state.setkeyup(state.MOUSE.LEFT);
		}
		this.listeners=this.listeners.concat([
			["mousemove"  ,mousemove  ,false],
			["mousewheel" ,mousewheel ,false],
			["mousedown"  ,mousedown  ,false],
			["mouseup"    ,mouseup    ,false],
			["scroll"     ,onscroll   ,false],
			["touchstart" ,touchstart ,false],
			["touchmove"  ,touchmove  ,false],
			["touchend"   ,touchend   ,false],
			["touchcancel",touchcancel,false]
		]);
	}


	getrect(elem) {
		let width  =elem.scrollWidth;
		let height =elem.scrollHeight;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		return {x:offleft,y:offtop,w:width,h:height};
	}


	setmousepos(x,y) {
		this.mouseraw[0]=x;
		this.mouseraw[1]=y;
		this.scroll[0]=window.scrollX;
		this.scroll[1]=window.scrollY;
		let focus=this.focus;
		if (focus!==null) {
			let rect=this.getrect(focus);
			// If the focus is a canvas, scroll size can differ from pixel size.
			x=(x-rect.x)*((focus.width||focus.scrollWidth)/rect.w);
			y=(y-rect.y)*((focus.height||focus.scrollHeight)/rect.h);
		}
		this.mousepos[0]=x;
		this.mousepos[1]=y;
	}


	getmousepos() {
		return this.mousepos.slice();
	}


	getclickpos() {
		return this.clickpos.slice();
	}


	addmousez(dif) {
		this.mousez+=dif;
	}


	getmousez() {
		let z=this.mousez;
		this.mousez=0;
		return z;
	}


	// ----------------------------------------
	// Keyboard


	initkeyboard() {
		let state=this;
		this.KEY=this.constructor.KEY;
		let keys=Object.keys(this.KEY);
		for (let i=0;i<keys.length;i++) {
			let code=this.KEY[keys[i]];
			this.keystate[code]={
				name: "KEY."+keys[i],
				code: code
			};
		}
		function keydown(evt) {
			state.setkeydown(evt.keyCode);
			if (state.stopnavfocus!==0 && state.navkeys[evt.keyCode]) {evt.preventDefault();}
		}
		function keyup(evt) {
			state.setkeyup(evt.keyCode);
		}
		this.listeners=this.listeners.concat([
			["keydown",keydown,false],
			["keyup"  ,keyup  ,false]
		]);
	}


	setkeydown(code) {
		let state=this.makeactive(code);
		if (state!==null) {
			if (state.down===0) {
				state.down=1;
				state.hit=1;
				state.repeat=0;
				state.time=performance.now()/1000.0;
			}
		}
	}


	setkeyup(code) {
		let state=this.makeactive(code);
		if (state!==null) {
			state.down=0;
			state.hit=0;
			state.repeat=0;
			state.time=null;
		}
	}


	getkeydown(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
			if (state!==null && state!==undefined && state.down>0) {
				return 1;
			}
		}
		return 0;
	}


	getkeyhit(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
			if (state!==null && state!==undefined && state.hit>0) {
				state.hit=0;
				return 1;
			}
		}
		return 0;
	}


	getkeyrepeat(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
			if (state!==null && state!==undefined && state.repeat===1) {
				return 1;
			}
		}
		return 0;
	}

}


//---------------------------------------------------------------------------------
// Game of Life GUI


// ratio, scale, menu, reset, speed, pos, seed, run
// seed=[[x0,y0,pat0],[x1,y1,pat1],...]


// Convert an RGBA array to a int regardless of endianness.
let _rgba_arr8=new Uint8ClampedArray([0,1,2,3]);
let _rgba_arr32=new Uint32Array(_rgba_arr8.buffer);
function rgbatoint(r,g,b,a) {
	_rgba_arr8[0]=r;
	_rgba_arr8[1]=g;
	_rgba_arr8[2]=b;
	_rgba_arr8[3]=a;
	return _rgba_arr32[0];
}


class GOLGUI {

	constructor(divid,gridwidth,gridheight,args) {
		let elem=document.getElementById(divid);
		this.parentelem=elem.parentNode;
		let drawwidth=elem.clientWidth;
		let canvas=document.createElement("canvas");
		elem.replaceWith(canvas);
		canvas.style.border="1px solid #303080";
		this.running=("run" in args && args["run"])?1:0;
		this.initseed=("seed" in args)?args["seed"]:[];
		this.life=new Life();
		this.menu=("menu" in args && args["menu"])?1:0;
		// Time settings.
		this.timespeed=("speed" in args)?args["speed"]:1.0;
		this.timereset=("reset" in args)?args["reset"]:Infinity;
		this.time=0.0;
		this.timesim=0;
		// Setup the UI.
		let scale=drawwidth/gridwidth;
		this.scale=scale<1?-(Math.round(1/scale)-1):(Math.round(scale)-1);
		this.initscale=this.scale;
		this.input=new Input(canvas,true,false);
		if (this.menu!==0) {this.input.disablenav();}
		this.grabbing=0;
		this.grabpos=[0,0];
		this.grabcen=[0,0];
		this.gridwidth=gridwidth;
		this.gridheight=gridheight;
		this.gridcen=[0,0];
		this.drawwidth=drawwidth;
		this.canvas=canvas;
		this.canvasctx=canvas.getContext("2d");
		this.canvasdata=null;
		this.canvas32=null;
		this.buttonarr=[];
		this.resize();
		this.reset();
		let state=this;
		function update() {
			setTimeout(update,1000.0/60.0);
			state.update();
		}
		update();
	}


	reset() {
		this.time=0.0;
		this.timesim=0;
		this.grabbing=0;
		this.gridcen=[0,0];
		this.scale=this.initscale;
		this.life.reset();
		for (let i=0;i<this.initseed.length;i++) {
			let xyp=this.initseed[i];
			this.life.setcells(xyp[2],"",[xyp[0],xyp[1]]);
		}
	}


	resize() {
		let canvas=this.canvas;
		let drawwidth=this.drawwidth;
		if (canvas.width!==drawwidth || this.canvasdata===null) {
			let drawheight=Math.floor(drawwidth*(this.gridheight/this.gridwidth));
			canvas.width=drawwidth;
			canvas.height=drawheight;
			this.canvasdata=this.canvasctx.createImageData(canvas.width,canvas.height);
			this.canvas32=new Uint32Array(this.canvasdata.data.buffer);
			// Generate buttons.
			this.buttonarr=[];
			let draww=canvas.width;
			let drawh=canvas.height;
			let buttonsize=Math.floor((draww/4<drawh?draww/4:drawh)*0.3);
			let pad=Math.floor(buttonsize*0.25);
			let outline=Math.ceil(buttonsize*0.03);
			let cen=buttonsize*0.5;
			let rad=buttonsize*0.3;
			for (let b=0;b<5 && this.menu;b++) {
				let button={};
				if (b<4) {
					button.x=(buttonsize+pad)*b+pad;
					if (b===3) {button.x=draww-buttonsize-pad;}
					button.y=pad;
					button.w=buttonsize;
					button.h=buttonsize;
					button.clicked=0;
					button.frame=0;
					button.imagearr=[];
					this.buttonarr[b]=button;
				} else {
					button=this.buttonarr[0];
				}
				for (let i=0;i<3;i++) {
					let img=new OffscreenCanvas(button.w,button.h);
					let ctx=img.getContext("2d");
					ctx.fillStyle=["#a0a0ff","#c0c0ff","#606080"][i];
					ctx.fillRect(0,0,button.w,button.h);
					ctx.fillStyle=["#4040aa","#6060cc","#303066"][i];
					ctx.fillRect(outline,outline,button.w-outline*2,button.h-outline*2);
					ctx.strokeStyle=["#a0a0ff","#c0c0ff","#606080"][i];
					ctx.fillStyle=ctx.strokeStyle;
					ctx.lineWidth=outline*2;
					ctx.beginPath();
					if (b===0) {
						ctx.moveTo(cen*1.07-rad*0.7071,cen-rad*0.7071);
						ctx.lineTo(cen*1.07+rad*0.5000,cen);
						ctx.lineTo(cen*1.07-rad*0.7071,cen+rad*0.7071);
						ctx.closePath();
						ctx.fill();
					} else if (b===1) {
						ctx.moveTo(cen,cen-rad);
						ctx.lineTo(cen,cen+rad);
						ctx.moveTo(cen-rad,cen);
						ctx.lineTo(cen+rad,cen);
					} else if (b===2) {
						ctx.moveTo(cen-rad,cen);
						ctx.lineTo(cen+rad,cen);
					} else if (b===3) {
						ctx.moveTo(cen-rad*0.7071,cen-rad*0.7071);
						ctx.lineTo(cen+rad*0.7071,cen+rad*0.7071);
						ctx.moveTo(cen+rad*0.7071,cen-rad*0.7071);
						ctx.lineTo(cen-rad*0.7071,cen+rad*0.7071);
					} else if (b===4) {
						ctx.lineWidth=outline*4;
						ctx.moveTo(cen-rad*0.5,cen-rad);
						ctx.lineTo(cen-rad*0.5,cen+rad);
						ctx.moveTo(cen+rad*0.5,cen-rad);
						ctx.lineTo(cen+rad*0.5,cen+rad);
					}
					ctx.stroke();
					button.imagearr.push(img);
				}
			}
		}
	}


	update() {
		this.resize();
		let life=this.life;
		if (this.running) {
			this.time+=this.timespeed;
			if (this.time>=this.timereset) {
				this.reset();
			}
			let gen=Math.floor(this.time-this.timesim);
			if (gen>0) {
				life.advance(gen);
				this.timesim+=gen;
			}
		}
		let input=this.input;
		input.update();
		let canvas=this.canvas;
		let draww=canvas.width;
		let drawh=canvas.height;
		let magsize=this.scale<0?-this.scale+1:1;
		let blockscale=this.scale<0?1:(this.scale+1);
		let linesize=Math.ceil(blockscale*(this.menu?0.1:0.0));
		let fillsize=Math.ceil(blockscale*(this.menu?0.9:1.0));
		let cellsize=fillsize+linesize;
		let scale=magsize/cellsize;
		let buttonarr=this.buttonarr;
		let button;
		let leftclick=input.getkeyhit(input.MOUSE.LEFT);
		let leftdown=input.getkeydown(input.MOUSE.LEFT);
		let dx,dy;
		let i;
		let mpos=input.getmousepos();
		// Handle grid dragging.
		if (this.grabbing===2 && leftdown) {
			dx=mpos[0]-this.grabpos[0];
			dy=mpos[1]-this.grabpos[1];
			this.gridcen[0]=-dx*scale+this.grabcen[0];
			this.gridcen[1]=-dy*scale+this.grabcen[1];
		}
		// Translate our grid coordinates to screen coordinates.
		let gridminx0=this.gridcen[0]-draww*0.5*scale;
		let gridminy0=this.gridcen[1]-drawh*0.5*scale;
		let gridminx=Math.floor(gridminx0/magsize)*magsize;
		let gridminy=Math.floor(gridminy0/magsize)*magsize;
		let drawminx=-Math.floor((gridminx0-gridminx)/scale);
		let drawminy=-Math.floor((gridminy0-gridminy)/scale);
		// gridx=gridminx+i*magsize
		// drawx=drawminx+i*cellsize
		// Handle user inputs.
		let drawmouse=0;
		if (this.menu) {
			let onbutton=0;
			for (i=0;i<buttonarr.length;i++) {
				button=buttonarr[i];
				dx=mpos[0]-button.x;
				dy=mpos[1]-button.y;
				if (leftdown===0) {
					button.state=0;
				}
				if (dx>=0 && dx<button.w && dy>=0 && dy<button.h) {
					onbutton=1;
					if (leftclick) {
						button.state=1;
						if (i===0) {
							this.running^=1;
						} else if (i===1) {
							this.scale+=1;
						} else if (i===2) {
							this.scale-=1;
						} else {
							this.running=0;
							this.reset();
						}
					}
					button.frame=button.state?2:1;
				} else {
					button.frame=button.state?2:0;
				}
			}
			if (onbutton===0 && mpos[0]>=0 && mpos[0]<draww && mpos[1]>=0 && mpos[1]<drawh) {
				drawmouse=this.grabbing<2?1:0;
				// Grab if the mouse is held for 1.0s or it moves too far.
				if (this.grabbing===0 && leftclick!==0) {
					this.grabbing=1;
					this.grabpos=mpos.slice();
					this.grabcen=this.gridcen.slice();
				}
			}
			if (leftdown) {
				if (this.grabbing===1) {
					dx=mpos[0]-this.grabpos[0];
					dy=mpos[1]-this.grabpos[1];
					let time=performance.now()/1000.0-input.keystate[input.MOUSE.LEFT].time;
					let dx1=dx/draww,dy1=dy/drawh;
					let dist=dx1*dx1+dy1*dy1;
					if (time>=1.0 || dist>0.00009) {
						this.grabbing=2;
					}
				}
			} else {
				if (drawmouse && this.grabbing===1) {
					drawmouse=2;
				}
				this.grabbing=0;
			}
		}
		// Draw grid lines.
		let canvdata=this.canvas32;
		let r=32,g=32,b=64,a=255;
		let rgba=rgbatoint(r,g,b,a);
		let pix,stop;
		let state;
		let magnorm=256.0/(magsize*magsize);
		let pt=[0,0];
		let x0,y0,x1,y1,x2,y2;
		let minx,maxx,miny,maxy;
		if (linesize>0) {
			stop=draww*drawh;
			for (x0=drawminx+fillsize;x0<draww;x0+=cellsize) {
				minx=x0>0?x0:0;
				maxx=(x0+linesize)<draww?(x0+linesize):draww;
				for (;minx<maxx;minx++) {
					for (pix=minx;pix<stop;pix+=draww) {
						canvdata[pix]=rgba;
					}
				}
			}
			for (y0=drawminy+fillsize;y0<drawh;y0+=cellsize) {
				pix=y0>0?y0*draww:0;
				stop=((y0+linesize)<drawh?(y0+linesize):drawh)*draww;
				for (;pix<stop;pix++) {
					canvdata[pix]=rgba;
				}
			}
		}
		// Fill living cells.
		y1=gridminy;
		for (y0=drawminy;y0<drawh;y0+=cellsize) {
			x1=gridminx;
			for (x0=drawminx;x0<draww;x0+=cellsize) {
				// If we are zoomed out, average the color of the cells.
				r=0;
				g=0;
				b=0;
				for (y2=0;y2<magsize;y2++) {
					pt[1]=y1+y2;
					for (x2=0;x2<magsize;x2++) {
						pt[0]=x1+x2;
						state=life.getcell(pt);
						if (state!==0) {
							r+=1.0;
							g+=1.0;
							b+=1.0;
						}
					}
				}
				rgba=rgbatoint(r*magnorm,g*magnorm,b*magnorm,a);
				// Fill in the cell on the canvas.
				miny=y0>0?y0*draww:0;
				maxy=((y0+fillsize)<drawh?(y0+fillsize):drawh)*draww;
				minx=x0>0?x0:0;
				maxx=(x0+fillsize)<draww?(x0+fillsize):draww;
				for (;miny<maxy;miny+=draww) {
					stop=miny+maxx;
					for (pix=miny+minx;pix<stop;pix++) {
						canvdata[pix]=rgba;
					}
				}
				x1+=magsize;
			}
			y1+=magsize;
		}
		// Handle mouse interaction with life.
		if (drawmouse>0) {
			// Calculate the current cell the mouse is in.
			let cpos=this.grabbing?this.grabpos:mpos;
			let off=linesize*0.5/cellsize;
			let gridmx=Math.floor((cpos[0]-drawminx)/cellsize+off);
			let gridmy=Math.floor((cpos[1]-drawminy)/cellsize+off);
			if (drawmouse===2) {
				x0=gridminx+gridmx*magsize;
				y0=gridminy+gridmy*magsize;
				for (y1=0;y1<magsize;y1++) {
					pt[1]=y0+y1;
					for (x1=0;x1<magsize;x1++) {
						pt[0]=x0+x1;
						state=life.getcell(pt);
						life.setcell(pt,state^1);
					}
				}
			}
			// Highlight the nearest cell.
			x0=drawminx+gridmx*cellsize;
			y0=drawminy+gridmy*cellsize;
			miny=y0>0?y0*draww:0;
			maxy=((y0+fillsize)<drawh?(y0+fillsize):drawh)*draww;
			minx=x0>0?x0:0;
			maxx=(x0+fillsize)<draww?(x0+fillsize):draww;
			if (minx<maxx && miny<maxy) {
				pix=miny+minx;
				r=Math.floor(canvdata[pix  ]*0.5+64);
				g=Math.floor(canvdata[pix+1]*0.5+64);
				b=Math.floor(canvdata[pix+2]*0.5+64);
				rgba=rgbatoint(r,g,b,a);
				for (;miny<maxy;miny+=draww) {
					stop=miny+maxx;
					for (pix=miny+minx;pix<stop;pix++) {
						canvdata[pix]=rgba;
					}
				}
			}
		}
		let ctx=this.canvasctx;
		ctx.putImageData(this.canvasdata,0,0);
		for (i=0;i<buttonarr.length;i++) {
			button=buttonarr[i];
			let frameoff=(i===0 && this.running)?3:0;
			ctx.drawImage(button.imagearr[frameoff+button.frame],button.x,button.y);
		}
	}

}

