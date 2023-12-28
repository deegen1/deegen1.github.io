/*------------------------------------------------------------------------------


sico.js - v2.08

Copyright 2020 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
The Single Instruction COmputer


SICO is a Single Instruction COmputer that mimics the functionality of a normal
computer while using only one computing instruction. This is like going into a
forest with no tools and trying to build a house. Since we only have one
instruction, most modern conveniences are gone. Things like multiplying numbers
or memory allocation need to be built from scratch using SICO's instruction.

The instruction is simple: Given A, B, and C, compute mem[A]-=mem[B]. Then, if
mem[A] was less than or equal to mem[B], jump to C. Otherwise, jump by 3. We
use the instruction pointer to keep track of our place in memory. The pseudocode
below shows a SICO instruction:


     A = mem[IP+0]
     B = mem[IP+1]
     C = mem[IP+2]
     IP += 3
     if mem[A] <= mem[B]: IP = C
     mem[A] -= mem[B]


The instruction pointer and memory values are all 64 bit unsigned integers.
Interaction with the host environment is done by reading and writing from
special memory addresses. For example: writing anything to -1 will end the
program.


--------------------------------------------------------------------------------
SICO Assembly Language


Because there's only one instruction, we only need to define memory values. The
flow of the program will decide what gets executed.


A "Hello, World!" program in assembly:


     loop:  len  one  exit
            0-2  txt  ?+1
            ?-2  neg  loop

     exit:  0-1  0    0

     txt:   'H 'e 'l 'l 'o ', '
            'W 'o 'r 'l 'd '! 10
     len:   len-txt+1
     neg:   0-1
     one:   1


The syntax of the assembly language


     Line Comment       |  # comment
     Block Comment      |  #| comment |#
     Label Declaration  |  label:
     Label Recall       |  label
     Sublabel           |  label: .sub: is treated as 'label.sub:'
     Current Address    |  ?
     Number             |  123 or 0xabc
     ASCII Literal      |  'A 'B 'C evaluates to 65 66 67
     Operator           |  + or -. Ex: 1+2-3
     Input / Output     |  Read or write to addresses above 2^63


IO addresses (mod 2^64)


     -1  |  Writing ends execution
     -2  |  Write to stdout
     -3  |  Read from stdin
     -4  |  Read timing frequency
     -5  |  Read system time
     -6  |  Writing sleeps for mem[B]/freq seconds


To print the letter 'A' to stdout:


     0-2  chr  ?+1
     chr: 'A


--------------------------------------------------------------------------------
TODO


Mouse+Keyboard
Audio


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// SICO architecture interpreter.


class SICO {

	static COMPLETE    =0;
	static RUNNING     =1;
	static ERROR_PARSER=2;
	static ERROR_MEMORY=3;


	constructor(textout,canvas) {
		// Default state values.
		for (var st in SICO) {this[st]=SICO[st];}
		this.state   =0;
		this.statestr="";
		this.ip      =0n;
		this.mem     =[];
		this.alloc   =0n;
		this.mod     =2n**64n;
		this.io      =2n**63n;
		this.lblroot =null;
		this.sleep   =-Infinity;
		// Input/Output
		this.textout =textout||null;
		this.textpos =0;
		this.canvas  =canvas||null;
		this.canvctx =null;
		this.canvdata=null;
		this.clear();
	}


	clear() {
		// Clear the interpreter state.
		this.state=this.COMPLETE;
		this.statestr="";
		this.ip=0n;
		this.mem=[];
		this.alloc=0n;
		this.lblroot=this.createlabel();
		this.sleep=-Infinity;
		if (this.textout!==null) {
			this.textout.value="";
		}
		this.textpos=0;
		if (this.canvctx!==null) {
			this.canvctx.clearRect(0,0,this.canvas.width,this.canvas.height);
		}
	}


	// ----------------------------------------
	// Input / Output


	print(str) {
		// Print to console and autoscroll to bottom.
		var textout=this.textout;
		if (textout!==null) {
			var val=textout.value;
			if (val===undefined) {val=textout.innerText;}
			var pos=Math.max(this.textpos,0);
			for (var i=0;i<str.length;i++) {
				var c=str[i];
				if (c==="\r") {
					pos=val.lastIndexOf("\n",pos)+1;
				} else if (c==="\b") {
					if (pos>0 && val[pos-1]!=="\n") {pos--;}
				} else if (c==="\n" || pos>=val.length) {
					val+=c;
					pos=val.length;
				} else {
					val=val.substring(0,pos)+(c+val.substring(pos+1));
					pos++;
				}
				if (val.length>8192) {
					val=val.substring(val.length-7168);
					pos=Math.max(pos-7168,0);
				}
			}
			textout.value=val;
			textout.innerText=val;
			textout.scrollTop=textout.scrollHeight;
			this.textpos=pos;
		} else {
			try {
				process.stdout.write(str);
			} catch {
				str.split("\n").forEach((e,idx,arr)=>{console.log(e);});
			}
		}
	}


	drawimage(imgaddr) {
		// Draw an image to the canvas.
		// Image structure is [width, height, pixel ptr].
		var canvas=this.canvas;
		var imgwidth =Number(this.getmem(imgaddr++));
		var imgheight=Number(this.getmem(imgaddr++));
		var imgdata  =Number(this.getmem(imgaddr))*8;
		if (imgwidth>65536 || imgheight>65536 || !canvas) {
			return;
		}
		// Resize the canvas.
		if (canvas.width!==imgwidth || canvas.height!==imgheight || !this.canvdata) {
			canvas.width=imgwidth;
			canvas.height=imgheight;
			this.canvctx=canvas.getContext("2d");
			this.canvdata=this.canvctx.createImageData(imgwidth,imgheight);
			if (canvas.style.display==="none") {
				canvas.style.display="block";
			}
		}
		// Map the ARGB bytes to their memory positions.
		var e=new Uint8Array((new BigUint64Array([0x00ff01ff02ff03ffn])).buffer);
		var [a,r,g,b]=[e.indexOf(0),e.indexOf(1),e.indexOf(2),e.indexOf(3)];
		var imgpixels=imgwidth*imgheight*4;
		imgdata=new Uint8Array(this.mem.buffer,imgdata+this.mem.byteOffset);
		var dstdata=this.canvdata.data;
		for (var i=0,j=0;i<imgpixels;i+=4,j+=8) {
			dstdata[i  ]=imgdata[j+r];
			dstdata[i+1]=imgdata[j+g];
			dstdata[i+2]=imgdata[j+b];
			dstdata[i+3]=imgdata[j+a];
		}
		this.canvctx.putImageData(this.canvdata,0,0);
	}


	// ----------------------------------------
	// Assembly


	createlabel() {
		return {
			addr:-1n,
			child:[]
		};
	}


	addlabel(scope,data,start,end) {
		// Add a label if it's new.
		// If the label starts with a '.', make it a child of the last non '.' label.
		var lbl=data[start]==='.'?scope:this.lblroot;
		var prv,c;
		for (var i=start;i<end;i++) {
			c=data.charCodeAt(i);
			prv=lbl;
			lbl=lbl.child[c];
			if (lbl===undefined) {
				lbl=this.createlabel();
				prv.child[c]=lbl;
			}
		}
		return lbl;
	}


	findlabel(label) {
		// Returns the given label's address. Returns null if no label was found.
		var lbl=this.lblroot,len=label.length,c;
		if (lbl===null) {return -1n;}
		for (var i=0;i<len;i++) {
			c=label.charCodeAt(i);
			lbl=lbl.child[c];
			if (lbl===undefined) {return -1n;}
		}
		return lbl.addr;
	}


	parseassembly(asmstr) {
		// Convert SICO assembly language into a SICO program.
		// This can be sped up by using ASCII codes instead of strings.
		this.clear();
		var i=0,j=0,l=asmstr.length,c;
		var err="";
		function tonum(c) {
			var x=c.charCodeAt(0);
			if (x>=65) {return x>=97?x-87:x-55;}
			return (x>=48 && x<=57)?x-48:99;
		}
		function isspc(c) {return c===" " || c==="\r" || c==="\n" || c==="\t";}
		function islbl(c) {return tonum(c)<36 || c==="_" || c==="." || c>="\x7f";}
		function s(i) {return i<l?asmstr[i]:"\x00";}
		// Process the string in 2 passes. The first pass is needed to find label values.
		for (var pass=0;pass<2 && !err;pass++) {
			var scope=this.lblroot,lbl=null;
			var val=0n,acc=0n,addr=0n,op=0,token=0;
			var base,n,set;
			for (i=0;i<l && !err;) {
				j=i;
				c=s(i);
				if (isspc(c)) {
					// whitespace
					while (isspc(s(i))) {i++;}
					token=0;
				} else if (c==="#" && s(i+1)==="|") {
					// block comment
					while (i<l && (s(i+2)!=="|" || s(i+3)!=="#")) {i++;}
					i+=4;
					if (i>l) {err="Unterminated block quote";}
					token=0;
				} else if (c==="#") {
					// comment
					while (i<l && s(i)!=="\n") {i++;}
					token=0;
				} else if (c==="+" || c==="-") {
					// operator
					if (!(addr--)) {err="Leading operator";}
					if (op<0)    {err="Operating on declaration";}
					else if (op) {err="Double operator";}
					op=i++;
					token=0;
				} else if (c>="0" && c<="9") {
					// hex number
					base=10n;
					val=0n;
					n=s(i+1);
					if (c==="0" && (n==="x" || n==="X")) {base=16n;i+=2;}
					while ((n=BigInt(tonum(s(i))))<base) {
						val=this.uint(val*base+n);
						i++;
					}
					token++;
				} else if (c==="'") {
					// ASCII literal
					val=this.uint(s(i+1).charCodeAt(0));
					i+=2;
					token++;
				} else if (c==="?") {
					// current address
					i++;
					val=addr;
					token++;
				} else if (islbl(c)) {
					// label
					while (i<l && islbl(s(i))) {i++;}
					lbl=this.addlabel(scope,asmstr,j,i);
					val=lbl.addr;
					set=val>=0n;
					if (s(i)===":") {
						token+=token>0;
						lbl.addr=addr;
						if (s(j)!==".") {scope=lbl;}
						if (!pass && set) {err="Duplicate label declaration";}
						if (op>0) {err="Operating on declaration";}
						op=-(i++);
					} else {
						token++;
						if (pass && !set) {err="Unable to find label";}
					}
				} else {
					err="Unexpected token";
					i++;
				}
				if (token) {
					// Add a token to the previous value, or write to memory.
					if (token>=2) {err="Unseparated tokens";}
					if (op<=0) {
						this.setmem(addr-1n,acc);
						acc=val;
					} else if (s(op)==="+") {
						acc+=val;
					} else {
						acc-=val;
					}
					addr++;
					op=0;
				}
			}
			if (!err && op>0) {
				err="Trailing operator";
				j=op;
				i=op+1;
			}
			if (pass) {this.setmem(addr-1n,acc);}
		}
		this.state=this.RUNNING;
		if (err) {
			// Highlight any error we've encountered.
			this.state=this.ERROR_PARSER;
			var line=1,lo=0,hi=i,k;
			for (k=0;k<j;k++) {
				if (s(k)==="\n") {
					lo=k+1;
					line++;
				}
			}
			if (lo<j-30) {lo=j-30;}
			while (lo<j && isspc(s(lo))) {lo++;}
			for (k=lo;k<j+30 && k<l;k++) {
				if (s(k)==="\n") {break;}
				if (!isspc(s(k))) {hi=k+1;}
			}
			var win="",und="";
			for (k=lo;k<hi;k++) {
				c=s(k);
				win+=c>" "?c:" ";
				if (k<i) {und+=k>=j?"^":" ";}
			}
			this.statestr=`Parser: ${err}\nLine  : ${line}\n\n\t${win}\n\t${und}\n\n`;
		}
	}


	// ----------------------------------------
	// Main


	uint(x) {
		// Convert x to an integer in [0,mod).
		var mod=this.mod;
		try {x%=mod;}
		catch {x=BigInt(x)%mod;}
		return x<0n?x+mod:x;
	}


	getmem(addr) {
		// Return the memory value at addr.
		addr=this.uint(addr);
		if (addr<this.alloc) {
			return this.mem[addr];
		} else if (addr>=this.io) {
			// This is a special IO address.
			addr-=this.mod;
			if (addr===-3n) {
				// stdin
			} else if (addr===-4n) {
				// Timing frequency. 2^32 = 1 second.
				return 0x100000000n;
			} else if (addr===-5n) {
				// Read time. time = (seconds since 1 Jan 1970) * 2^32.
				var date=performance.timeOrigin+performance.now();
				return this.uint(date*4294967.296);
			}
		}
		return 0n;
	}


	setmem(addr,val) {
		// Write val to the memory at addr.
		addr=this.uint(addr);
		if (addr>=this.io) {
			// This is a special IO address.
			addr-=this.mod;
			val=this.uint(-val);
			if (addr===-1n) {
				// Exit.
				this.state=this.COMPLETE;
			} else if (addr===-2n) {
				// Print to stdout.
				this.print(String.fromCharCode(Number(val&255n)));
			} else if (addr===-6n) {
				// Sleep.
				var sleep=Number(val)/4294967.296;
				this.sleep=performance.now()+sleep;
			} else if (addr===-7n) {
				// Draw an image.
				this.drawimage(val);
			}
			return;
		}
		val=this.uint(val);
		var mem=this.mem;
		if (addr>=this.alloc) {
			// If we're writing to an address outside of our memory, attempt to resize it.
			if (!val) {return;}
			var alloc=this.io;
			while ((alloc>>1n)>addr) {alloc>>=1n;}
			// Attempt to allocate.
			try {
				mem=new BigUint64Array(Number(alloc));
			} catch(error) {
				this.state=this.ERROR_MEMORY;
				this.statestr="Failed to allocate memory.\nIndex: "+addr+"\n";
				return;
			}
			mem.set(this.mem,0);
			this.mem=mem;
			this.alloc=alloc;
		}
		mem[addr]=val;
	}


	run(insts,time) {
		// Run SICO while insts>0 and performance.now()<time.
		if ((typeof SICO_fast_run)!=="undefined") {return SICO_fast_run(this,insts,time);}
		if (insts===undefined) {insts=Infinity;}
		if (time ===undefined) {time =Infinity;}
		var ip=this.ip;
		var a,b,c,ma,mb,now;
		for (;insts>0 && this.state===this.RUNNING;insts--) {
			// Check if we need to sleep or stop.
			now=performance.now();
			if (now>=time || this.sleep>=time) {break;}
			if (now<this.sleep) {continue;}
			// Main instruction.
			a =this.getmem(ip++);
			b =this.getmem(ip++);
			c =this.getmem(ip++);
			ma=this.getmem(a);
			mb=this.getmem(b);
			if (ma<=mb) {ip=c;}
			this.setmem(a,ma-mb);
		}
		this.ip=this.uint(ip);
	}

}

