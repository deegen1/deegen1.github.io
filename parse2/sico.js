/*------------------------------------------------------------------------------


sico.js - v2.00

Copyright 2020 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
The Single Instruction COmputer


SICO is a Single Instruction COmputer that mimics the functionality of a normal
computer while using only one computing instruction. This is like going into a
forest with no tools and trying to build a house. Since we only have one
instruction, most modern conveniences are gone. Things like multiplying numbers
or memory allocation need to be built from scratch using SICO's instruction.

The instruction is fairly simple: Given A, B, and C, compute mem[A]-mem[B] and
store the result in mem[A]. Then, if mem[A] was less than or equal to mem[B],
jump to C. Otherwise, jump by 3. We use the instruction pointer (IP) to keep
track of our place in memory. The pseudocode below shows a SICO instruction:


     A = mem[IP+0]
     B = mem[IP+1]
     C = mem[IP+2]
     IP += 3
     if mem[A] <= mem[B]: IP = C
     mem[A] -= mem[B]


The instruction pointer and memory values are all 64 bit unsigned integers.
Overflow and underflow are handled by wrapping values around to be between
0 and 2^64-1 inclusive.

Interaction with the host environment is done by reading and writing from
special memory addresses. For example, writing anything to -1 will end
execution of the SICO program.


--------------------------------------------------------------------------------
SICO Assembly Language


We can write a SICO program by setting the raw memory values directly, but it
will be easier to both read and write a program by using an assembly language.
Because there's only one instruction, we can skip defining what's used for data,
execution, or structure like in other languages. We only need to define memory
values, and the flow of the program will decide what gets executed.


This example shows a "Hello, World!" program in assembly.


     loop: len  one  exit
           0-2  txt  ?+1
           ?-2  neg  loop

     exit: 0-1  0    0

     txt:  'H 'e 'l 'l 'o ', '
           'W 'o 'r 'l 'd '! 10
     len:  len-txt+1
     neg:  0-1
     one:  1


The rules of the assembly language are given below.


                  |
     Single Line  |  Denoted by #
     Comment      |
                  |  Ex:
                  |       # Hello,
                  |       # World!
                  |
     -------------+--------------------------------------------------------
                  |
     Multi Line   |  Denoted by #| and terminated with |#
     Comment      |
                  |  Ex:
                  |       #|
                  |            line 1
                  |            line 2
                  |       |#
                  |
     -------------+--------------------------------------------------------
                  |
     Label        |  Denoted by a name followed by a colon. Declarations
     Declaration  |  mark the current memory address for later recall.
                  |
                  |  Labels are case sensitive and support UTF-8. They can
                  |  consist of letters, underscores, periods, numbers, and
                  |  any characters with a high bit. However, the first
                  |  character can't be a number.
                  |
                  |  Ex:
                  |       loop:
                  |       Another_Label:
                  |       label3:
                  |
     -------------+--------------------------------------------------------
                  |
     Label        |  Denoted by a label name. Inserts the memory address
     Recall       |  declared by "label:".
                  |
                  |  Ex:
                  |       label:  # declaration
                  |       label   # recall
                  |
     -------------+--------------------------------------------------------
                  |
     Sublabel     |  Denoted by a period in front of a label. Shorthand for
                  |  placing a label under another label's scope.
                  |
                  |  Ex:
                  |        A:
                  |       .B:  # Shorthand for A.B:
                  |
     -------------+--------------------------------------------------------
                  |
     Current      |  Denoted by a question mark. Inserts the current memory
     Address      |  address.
                  |
                  |  Ex:
                  |       ?
                  |       ?+1  # Next address
                  |
     -------------+--------------------------------------------------------
                  |
     Number       |  Inserts the number's value. A number must be in
                  |  decimal or hexadecimal form.
                  |
                  |  Ex:
                  |       123
                  |       0xff
                  |
     -------------+--------------------------------------------------------
                  |
     ASCII        |  Denoted by an apostrophe. Inserts an ASCII value.
     Literal      |
                  |  Ex:
                  |       'H 'e 'l 'l 'o  # Evaluates to 72 101 108 108 111
                  |
     -------------+--------------------------------------------------------
                  |
     Operator     |  Denoted by a plus or minus. Adds or subtracts the
                  |  number or label from the previous value. Parentheses
                  |  are not supported. To express a negative number such
                  |  as -5, use the form "0-5".
                  |
                  |  Ex:
                  |       len-txt+1
                  |       ?+1
                  |
     -------------+--------------------------------------------------------
                  |
     Input /      |  Addresses above 2^63-1 are considered special and
     Output       |  reading or writing to them will interact with the
                  |  host. For an instruction A, B, C:
                  |
                  |  A = -1: End execution.
                  |  A = -2: Write mem[B] to stdout.
                  |  B = -3: mem[B] = stdin.
                  |  B = -4: mem[B] = environment timing frequency.
                  |  B = -5: mem[B] = system time.
                  |  A = -6: Sleep for mem[B]/freq seconds.
                  |
                  |  Ex:
                  |       0-2  txt  ?+1  # A = -2. Print a letter.
                  |


--------------------------------------------------------------------------------
TODO


17839
simplify parse assembly
shorten assembly description; 1 line per item. Look at brainfuck description.
In article: explain as a series of subtractions, then add jumping.
Merge editor. Add option to pause if not on page.
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
	static MAX_PARSE   =1<<24;


	constructor(textout,canvas) {
		// Default state values.
		for (var st in SICO) {this[st]=SICO[st];}
		this.state   =0;
		this.statestr="";
		this.ip      =0n;
		this.mem     =[];
		this.alloc   =0n;
		this.mod     =2n**64n;
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
			var pos=this.textpos;
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
		imgdata=new Uint8Array(this.mem.buffer,imgdata);
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


	parseassembly1(asmstr) {
		var time=performance.now();for (var trial=0;trial<10;trial++) {
		// Convert SICO assembly language into a SICO program.
		this.clear();
		var asmpos,asmlen=asmstr.length,end;
		var err="";
		if (asmlen>=this.MAX_PARSE) {err="Input string too long";}
		// Sticky regexes (/y) match at the current index.
		function regmatch(regex) {
			regex.lastIndex=asmpos;
			end=regex.test(asmstr)?regex.lastIndex:0;
			return end;
		}
		// Process the string in 2 passes. The first pass is needed to find label values.
		for (var pass=0;pass<2 && !err;pass++) {
			var scope=this.lblroot,lbl,isset;
			var val=0n,acc=0n,addr=0n,op=0,token=0;
			asmpos=0;
			while (asmpos<asmlen) {
				if (regmatch(/\s+/ysu)) {
					// whitespace
					token=0;
				} else if (regmatch(/#\|.*?(\|#|$)/ysu)) {
					// block comment
					token=0;
				} else if (regmatch(/#.*?(\n|$)/ysu)) {
					// comment
					token=0;
				} else if (regmatch(/[\+\-]/ysu)) {
					// operator
					if (!addr--) {err="Leading operator";}
					if (op<0) {err="Operating on declaration";}
					else if (op) {err="Double operator";}
					op=asmpos;
					token=0;
				} else if (regmatch(/0[xX][0-9a-fA-F]+|\d+/ysu)) {
					// hex or base 10 number
					val=this.toint(asmstr.substring(asmpos,end));
					token++;
				} else if (regmatch(/'./ysu)) {
					// ASCII literal
					val=this.toint(asmstr.charCodeAt(asmpos+1));
					token++;
				} else if (regmatch(/\?/ysu)) {
					// current address
					val=addr;
					token++;
				} else if (regmatch(/[\._\d\p{L}\x80-\xff]+/ysu)) {
					// label
					lbl=this.addlabel(scope,asmstr,asmpos,end-asmpos);
					val=lbl.addr;
					isset=val>=0n;
					if (asmstr[end]===":") {
						token+=token>0;
						lbl.addr=addr;
						if (asmstr[asmpos]!=='.') {scope=lbl;}
						if (!pass && isset) {err="Duplicate label declaration";}
						if (op>0) {err="Operating on declaration";}
						op=-(end++);
					} else {
						token++;
						if (pass && !isset) {err="Unable to find label";}
					}
				} else {
					err="Unexpected token";
				}
				if (token) {
					if (token>=2) {err="Unseparated tokens";}
					if (op<=0) {this.setmem(addr-1n,acc);acc=val;}
					else if (asmstr[op]==="+") {acc+=val;}
					else {acc-=val;}
					addr++;
					op=0;
				}
				if (err) {break;}
				asmpos=end;
			}
			if (!err && op>0) {err="Trailing operator";asmpos=end=op;}
			if (pass) {this.setmem(addr-1n,acc);}
		}
		this.state=this.RUNNING;
		if (err) {
			// Highlight any error we've encountered.
			this.state=this.ERROR_PARSER;
			var len=Math.min(Math.max(end-asmpos,1),60);
			var lines=asmstr.split("\n");
			for (var line=0;asmpos>lines[line].length;line++) {asmpos-=lines[line].length+1;}
			var start=Math.max(asmpos+len-60,0);
			asmpos-=start;
			var sub=lines[line].substring(start,start+60);
			var under=sub.substring(0,asmpos).trimStart().replace(/\S/g," ")+"^".repeat(len);
			this.statestr="Parser: "+err+"\nLine  : "+(line+1)+"\n\n\t"+sub.trim()+"\n\t"+under+"\n\n";
		}
		} time=performance.now()-time;
		this.print("parse time 1: "+time+"\n");
		console.log("parse time 1: "+time);
	}


	parseassembly(str) {
		var time=performance.now(); for (var trial=0;trial<10;trial++) {
		// Convert SICO assembly language into a SICO program.
		this.clear();
		var i=0,j=0,len=str.length;
		var c,op,err=null;
		function  CNUM(c) {return (c<=57?c+208:((c+191)&~32)+10)&255;}
		function ISLBL(c) {return CNUM(c)<36 || c===95 || c===46 || c>127;}
		function  ISOP(c) {return c===43 || c===45;}
		function   NEXT() {return (c=i++<len?str.charCodeAt(i-1):0);}
		if (len>=this.MAX_PARSE) {err="Input string too long";}
		// Process the string in 2 passes. The first pass is needed to find label values.
		for (var pass=0;pass<2 && err===null;pass++) {
			var scope=this.lblroot;
			var addr=0n,val=0n,acc=0n;
			var tmp0=0n,tmp1=0n;
			op=0;
			i=0;
			NEXT();
			j=i;
			while (c!==0 && err===null) {
				var n=0,token=0;
				if (c<=32 && (c===13 || c===10 || c===9 || c===32)) {
					// Whitespace.
					NEXT();
					continue;
				}
				if (c===35) {
					// Comment. If next='|', use the multi-line format.
					var mask=0,eoc=10,i0=i;
					if (NEXT()===124) {mask=255;eoc=31779;NEXT();}
					while (c!==0 && n!==eoc) {n=((n&mask)<<8)+c;NEXT();}
					if (mask!==0 && n!==eoc) {err="Unterminated block quote";j=i0;}
					continue;
				}
				j=i;
				if (ISOP(c)) {
					// Operator. Decrement addr since we're modifying the previous value.
					if (!addr--) {err="Leading operator";}
					if (op!==0 ) {err="Double operator";}
					if (op===58) {err="Operating on declaration";}
					op=c;
					NEXT();
				} else if (CNUM(c)<10) {
					// Number. If it starts with "0x", use hexadecimal.
					token=10;
					val=0n;
					if (c===48 && (NEXT()===120 || c===88)) {token=16;NEXT();}
					tmp0=BigInt(token);
					while ((tmp1=CNUM(c))<token) {
						val=this.toint(val*tmp0+BigInt(tmp1));
						NEXT();
					}
				} else if (c===39) {
					// ASCII literal. Ex: 'H 'e 'l 'l 'o
					token=1;
					val=BigInt(NEXT());
					NEXT();
				} else if (c===63) {
					// Current address token.
					token=1;
					val=addr;
					NEXT();
				} else if (ISLBL(c)) {
					// Label.
					while (ISLBL(c)) {NEXT();}
					var lbl=this.addlabel(scope,str,j-1,i-j);
					if (lbl===null) {err="Unable to allocate label";break;}
					val=lbl.addr;
					var isset=val>=0n;
					if (c===58) {
						// Label declaration.
						if (pass===0) {
							if (isset) {err="Duplicate label declaration";}
							lbl.addr=addr;
						}
						if (str[j-1]!=='.') {scope=lbl;}
						if (ISOP(op)) {err="Operating on declaration";}
						op=c;
						NEXT();
					} else {
						token=1;
						if (pass!==0 && !isset) {err="Unable to find label";}
					}
				} else {
					err="Unexpected token";
					i++;
				}
				if (token!==0) {
					// Add a new value to memory.
					if (pass!==0) {
						if (op===43) {acc+=val;}
						else if (op===45) {acc-=val;}
						else {this.setmem(addr-1n,acc);acc=val;}
					}
					addr++;
					op=0;
					if (ISLBL(c) || c===63 || c===39) {err="Unseparated tokens";}
				}
			}
			if (err===null && ISOP(op)) {err="Trailing operator";}
			if (pass!==0) {this.setmem(addr-1n,acc);}
		}
		this.state=this.RUNNING;
		if (err!==null) {
			// We've encountered a parsing error.
			this.state=this.ERROR_PARSER;
			this.statestr="Parser: "+err+"\n";
			if (i-- && j--) {
				var line=1;
				var window="",under="";
				// Find the boundaries of the line we're currently parsing.
				var s0=0,s1=j,k;
				for (k=0;k<j;k++) {
					if (str[k]==="\n") {
						line++;
						s0=k+1;
					}
				}
				while (s1<len && str[s1]!=="\n") {s1++;}
				// Trim whitespace.
				while (s0<s1 && str[s0  ]<=" ") {s0++;}
				while (s1>s0 && str[s1-1]<=" ") {s1--;}
				// Extract the line and underline the error.
				s0=j>s0+30?j-30:s0;
				for (k=0;k<61;k++,s0++) {
					c=s0<s1 && k<60?str[s0]:"";
					window+=c;
					under+=(c && s0>=j && s0<i)?"^":(c<=" "?c:" ");
				}
				this.statestr="Parser: "+err+"\nLine  : "+line+"\n\n\t"+window+"\n\t"+under+"\n\n";
			}
		}
		} time=performance.now()-time;
		this.print("parse time 2: "+time+"\n");
		console.log("parse time 2: "+time);
	}


	createlabel() {
		return {
			addr:-1n,
			child:[]
		};
	}


	addlabel(scope,data,idx,len) {
		// Add a label if it's new.
		// If the label starts with a '.', make it a child of the last non '.' label.
		var lbl=data[idx]==='.'?scope:this.lblroot;
		var parent,c;
		for (var i=0;i<len;i++) {
			c=data.charCodeAt(idx+i);
			parent=lbl;
			lbl=parent.child[c];
			if (lbl===undefined) {
				lbl=this.createlabel();
				parent.child[c]=lbl;
			}
		}
		return lbl;
	}


	findlabel(label) {
		// Returns the given label's address. Returns null if no label was found.
		var lbl=this.lblroot,len=label.length,c;
		if (lbl===null) {return null;}
		for (var i=0;i<len;i++) {
			c=label.charCodeAt(i);
			lbl=lbl.child[c];
			if (lbl===undefined) {return null;}
		}
		return lbl.addr;
	}


	// ----------------------------------------
	// Main


	toint(x) {
		// Convert x to [0,mod)
		var mod=this.mod;
		try {x%=mod;}
		catch {x=BigInt(x)%mod;}
		return x<0n?x+mod:x;
	}


	getmem(addr) {
		// Return the memory value at addr.
		addr=this.toint(addr);
		if (addr<this.alloc) {
			return this.mem[addr];
		} else if (addr>=0x8000000000000000n) {
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
				return this.toint(date*4294967.296);
			}
		}
		return 0n;
	}


	setmem(addr,val) {
		// Write val to the memory at addr.
		// Return 1 if we should abort the main loop.
		addr=this.toint(addr);
		val=this.toint(val);
		if (addr>=0x8000000000000000n) {
			// This is a special IO address.
			addr-=this.mod;
			val=val?this.mod-val:val;
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
		var mem=this.mem;
		if (addr>=this.alloc) {
			// If we're writing to an address outside of our memory, attempt to resize it or
			// error out.
			if (!val) {return;}
			var alloc=1n;
			while (alloc<=addr) {alloc+=alloc;}
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
		this.ip=this.toint(ip);
	}

}

