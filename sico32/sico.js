/*------------------------------------------------------------------------------


sico.js - v1.32

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


     loop: len  one  exit        # Decrement [len]. If [len]<=1, exit.
           0-2  txt  ?+1         # Print a letter.
           ?-2  neg  loop        # Increment letter pointer.

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
Performance


Performance tests, measured in millions of instructions per second:


               Environment            |   Rate
     ---------------------------------+----------
       i5-10210Y - CPU     - C        |  204.78
       R9-3900X  - CPU     - C        |
       Pixel 2   - Firefox - JS Fast  |
       i5-10210Y - Firefox - JS STD   |    2.64
       Pixel 2   - Chrome  - JS STD   |    3.60
       R9-3900X  - Firefox - JS STD   |    6.95
       R9-3900X  - Chrome  - JS STD   |   17.07
       Pixel 2   - Chrome  - JS Fast  |   19.12
       i5-10210Y - Firefox - JS Fast  |   36.79
       R9-3900X  - Chrome  - JS Fast  |   97.18
       R9-3900X  - Firefox - JS Fast  |   97.27



Tests should take 5 minutes or more. Tests run on a phone need to be run
several times to see the effect of thermal throttling.

Splitting into high/low arrays is about 8% faster than using interleaved memory.

Uint32Array is at least 5% faster than Float64Array across all hardware and
browsers.

When testing the math library, we jump 77% of the time. Delaying loading mem[C]
didn't provide a meaningful speedup.

Webassembly speedup isn't that great compared to SicoRun() and adds a lot of
complexity. Wait until better integration with javascript.

We busy wait if sleeping for less than 4ms. This is because the HTML5 standard
enforces a minimum setTimeout() time of 4ms.


--------------------------------------------------------------------------------
TODO


Use classes instead of factory methods.
Try 32 bits instead.
In article: explain as a series of subtractions, then add jumping.
Figure out why chrome is slower than firefox.
Merge editor. Add option to pause if not on page.
Mouse+Keyboard
Audio


               Environment          |   Rate
     -------------------------------+----------
       i5-10210Y - CPU     - C      |  204.78
       Pixel 7   - Firefox - JS 64  |
       Pixel 7   - Firefox - JS 32  |
       Pixel 7   - Chrome  - JS 64  |
       Pixel 7   - Chrome  - JS 32  |
       i5-10210Y - Firefox - JS 64  |   40.81
       i5-10210Y - Firefox - JS 32  |   75.50
       i5-10210Y - Chrome  - JS 64  |   20.05
       i5-10210Y - Chrome  - JS 32  |   40.47

4096: 172.752
8192: 176.472

*/
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// SICO architecture interpreter.


var SICO_COMPLETE    =0;
var SICO_RUNNING     =1;
var SICO_ERROR_PARSER=2;
var SICO_ERROR_MEMORY=3;
var SICO_MAX_PARSE   =1<<30;


function SicoCreate(textout,canvas) {
	var st={
		// State variables
		state:   0,
		statestr:"",
		ip:      0,
		mem:     null,
		alloc:   0,
		lblroot: SicoCreateLabel(),
		sleep:   null,
		// Input/Output
		output:  textout,
		outbuf:  "",
		outpos:  0,
		canvas:  canvas,
		canvctx: null,
		canvdata:null,
		// Functions
		Clear:   function(){return SicoClear(st);},
		Print:   function(str){return SicoPrint(st,str);},
		ParseAssembly:function(str){return SicoParseAssembly(st,str);},
		GetMem:  function(addr){return SicoGetMem(st,addr);},
		SetMem:  function(addr,val){return SicoSetMem(st,addr,val);},
		Run:     function(stoptime){return SicoRun(st,stoptime);}
	};
	SicoClear(st);
	return st;
}


function SicoClear(st) {
	// Clear the interpreter state.
	st.state=SICO_COMPLETE;
	st.statestr="";
	st.ip=0;
	st.mem=null;
	st.alloc=0;
	st.lblroot=SicoCreateLabel();
	st.sleep=null;
	if (st.output!==null) {
		//st.output.value="";/////////////////////////////////////////////////////
	}
	//st.outbuf="";
	//st.outpos=0;
	if (st.canvctx!==null) {
		st.canvctx.clearRect(0,0,st.canvas.width,st.canvas.height);
	}
	if (st.canvas!==null) {
		st.canvas.style.display="none";
	}
}


function SicoPrint(st,str) {
	// Print to output and autoscroll to bottom. Try to mimic the effects of a
	// terminal. If output is null, print to console.
	var output=st.output;
	st.outbuf+=str;
	if (output!==null) {
		var outval=output.value;
		var outpos=st.outpos;
		if (outpos<0 || outpos>outval.length) {
			outpos=outval.length;
		}
		str=st.outbuf;
		st.outbuf="";
		for (var i=0;i<str.length;i++) {
			var c=str[i];
			if (c==="\r") {
				while (outpos>0 && outval[outpos-1]!=="\n") {
					outpos--;
				}
			} else if (c==="\b") {
				if (outpos>0 && outval[outpos-1]!=="\n") {
					outpos--;
				}
			} else if (c==="\n" || outpos>=outval.length) {
				outval+=c;
				outpos=outval.length;
			} else {
				outval=outval.substring(0,outpos)+c+outval.substring(outpos+1);
				outpos++;
			}
			if (outval.length>8192) {
				outval=outval.substring(outval.length-1024);
				outpos=outpos>1024?outpos-1024:0;
			}
		}
		output.value=outval;
		output.scrollTop=output.scrollHeight;
		st.outpos=outpos;
	} else {
		str=st.outbuf.split("\n");
		for (var i=0;i<str.length-1;i++) {
			console.log(str[i]);
		}
		st.outbuf=str[str.length-1];
	}
}


function SicoParseAssembly(st,str) {
	// Convert SICO assembly language into a SICO program.
	SicoClear(st);
	st.state=SICO_RUNNING;
	var i=0,j=0,len=str.length;
	var c,op,err=null;
	function  CNUM(c) {return (c<=57?c+208:((c+191)&~32)+10)&255;}
	function ISLBL(c) {return CNUM(c)<36 || c===95 || c===46 || c>127;}
	function  ISOP(c) {return c===43 || c===45;}
	function   NEXT() {return (c=i++<len?str.charCodeAt(i-1)>>>0:0);}
	if (len>=SICO_MAX_PARSE) {err="Input string too long";}
	// Process the string in 2 passes. The first pass is needed to find label values.
	for (var pass=0;pass<2 && err===null;pass++) {
		var scope=st.lblroot;
		var addr=0,val=0,acc=0;
		var tmp0=0,tmp1=0;
		op=0;
		i=0;
		NEXT();
		j=i;
		while (c!==0 && err===null) {
			var n=0,token=0;
			if (c===13 || c===10 || c===9 || c===32) {
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
				if (addr===0) {err="Leading operator";}
				if (op!==0 ) {err="Double operator";}
				if (op===58) {err="Operating on declaration";}
				addr--;
				op=c;
				NEXT();
			} else if (CNUM(c)<10) {
				// Number. If it starts with "0x", use hexadecimal.
				token=10;
				val=0;
				if (c===48 && (NEXT()===120 || c===88)) {token=16;NEXT();}
				while ((tmp1=CNUM(c))<token) {
					val=(Math.imul(val,token)+tmp1)>>>0;
					NEXT();
				}
			} else if (c===39) {
				// ASCII literal. Ex: 'H 'e 'l 'l 'o
				token=1;
				val=NEXT();
				NEXT();
			} else if (c===63) {
				// Current address token.
				token=1;
				val=addr;
				NEXT();
			} else if (ISLBL(c)) {
				// Label.
				while (ISLBL(c)) {NEXT();}
				var lbl=SicoAddLabel(st,scope,str,j-1,i-j);
				if (lbl===null) {err="Unable to allocate label";break;}
				val=lbl.addr;
				var isset=val!==0xffffffff;
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
				if (op===43) {val=(acc+val)>>>0;}
				else if (op===45) {val=(acc-val)>>>0;}
				else if (pass!==0) {
					SicoSetMem(st,addr-1,acc);
				}
				addr++;
				acc=val;
				op=0;
				if (ISLBL(c) || c===63 || c===39) {err="Unseparated tokens";}
			}
		}
		if (err===null && ISOP(op)) {err="Trailing operator";}
		if (pass!==0) {
			SicoSetMem(st,addr-1,acc);
		}
	}
	if (err!==null) {
		// We've encountered a parsing error.
		st.state=SICO_ERROR_PARSER;
		st.statestr="Parser: "+err+"\n";
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
				under+=c && s0>=j && s0<i?"^":(c<=" "?c:" ");
			}
			st.statestr="Parser: "+err+"\nLine  : "+line+"\n\n\t"+window+"\n\t"+under+"\n\n";
		}
	}
}


function SicoCreateLabel() {
	var lbl={
		addr:(-1)>>>0,
		child:new Array(16).fill(null)
	};
	return lbl;
}


function SicoAddLabel(st,scope,data,idx,len) {
	// Add a label if it's new.
	// If the label starts with a '.', make it a child of the last non '.' label.
	var lbl=data[idx]==='.'?scope:st.lblroot;
	for (var i=0;i<len;i++) {
		var c=data.charCodeAt(idx+i);
		for (var j=4;j>=0;j-=4) {
			var val=(c>>>j)&15;
			var parent=lbl;
			lbl=parent.child[val];
			if (lbl===null) {
				lbl=SicoCreateLabel();
				parent.child[val]=lbl;
			}
		}
	}
	return lbl;
}


function SicoFindLabel(st,label) {
	// Returns the given label's address. Returns null if no label was found.
	var lbl=st.lblroot,len=label.length;
	if (lbl===null) {return null;}
	for (var i=0;i<len;i++) {
		var c=label.charCodeAt(i);
		for (var j=4;j>=0;j-=4) {
			var val=(c>>>j)&15;
			lbl=lbl.child[val];
			if (lbl===null) {return null;}
		}
	}
	return lbl.addr;
}


function SicoGetMem(st,addr) {
	// Return the memory value at addr.
	return addr<st.alloc?st.mem[addr]:0;
}


function SicoSetMem(st,addr,val) {
	// Write val to the memory at addr.
	addr>>>=0;
	val>>>=0;
	if (addr>=st.alloc) {
		// If we're writing to an address outside of our memory, attempt to resize it or
		// error out.
		if (val===0) {return;}
		// Find the maximum we can allocate.
		var alloc=1,mem=null;
		while (alloc<=addr) {alloc+=alloc;}
		// Attempt to allocate.
		if (alloc>addr) {
			try {
				mem=new Uint32Array(alloc);
			} catch(error) {
				mem=null;
			}
		}
		if (mem!==null) {
			if (st.mem!==null) {
				mem.set(st.mem,0);
			}
			st.mem=mem;
			st.alloc=alloc;
		} else {
			st.state=SICO_ERROR_MEMORY;
			st.statestr="Failed to allocate memory.\nIndex: "+addr+"\n";
			return;
		}
	}
	st.mem[addr]=val;
}

/*
function SicoDrawImage(st,imghi,imglo) {
	var canvas=st.canvas;
	if (canvas===null || canvas===undefined) {
		return;
	}
	// Get the image data.
	var imgpos=imghi*4294967296+imglo;
	var memh=st.memh,meml=st.meml;
	var alloc=st.alloc;
	if (imgpos>alloc-3) {
		return;
	}
	var imgwidth =memh[imgpos]*4294967296+meml[imgpos++];
	var imgheight=memh[imgpos]*4294967296+meml[imgpos++];
	var imgdata  =memh[imgpos]*4294967296+meml[imgpos++];
	var imgpixels=imgwidth*imgheight;
	if (imgwidth>65536 || imgheight>65536 || imgdata+imgpixels>alloc) {
		return;
	}
	// Resize the canvas.
	if (canvas.width!==imgwidth || canvas.height!==imgheight || st.canvdata===null) {
		canvas.width=imgwidth;
		canvas.height=imgheight;
		st.canvctx=canvas.getContext("2d");
		st.canvdata=st.canvctx.createImageData(imgwidth,imgheight);
	}
	if (canvas.style.display==="none") {
		canvas.style.display="block";
	}
	// Copy the ARGB data to the RGBA canvas.
	var dstdata=st.canvdata.data;
	var hi,lo;
	imgpixels<<=2;
	for (var i=0;i<imgpixels;i+=4) {
		hi=memh[imgdata  ];
		lo=meml[imgdata++];
		dstdata[i  ]=(hi&0xffff)>>>8;
		dstdata[i+1]=lo>>>24;
		dstdata[i+2]=(lo&0xffff)>>>8;
		dstdata[i+3]=hi>>>24;
	}
	st.canvctx.putImageData(st.canvdata,0,0);
}
*/

function SicoRun(st,stoptime) {
	// Run SICO while performance.now()<stoptime.
	//
	// This version of SicoRun() unrolls several operations to speed things up.
	// Depending on the platform, it's 4 to 10 times faster than using u64 functions.
	if (st.state!==SICO_RUNNING) {
		return;
	}
	if (st.sleep!==null) {
		// If sleeping for longer than the time we have, abort.
		if (st.sleep>=stoptime) {
			return;
		}
		// If we're sleeping for more than 4ms, defer until later.
		var sleep=st.sleep-performance.now();
		if (sleep>4) {
			setTimeout(SicoRun,sleep-2,st,stoptime);
			return;
		}
		// Busy wait.
		while (performance.now()<st.sleep) {}
		st.sleep=null;
	}
	// Performance testing.
	if (st.dbgtime===undefined) {
		st.dbgtime=performance.now();
		st.dbginst=0;
	}
	var dbginst=0;
	var ip=st.ip;
	var mem=st.mem;
	var alloc=st.alloc,alloc2=alloc-2;
	var a,b,c,ma,mb;
	var timeiters=0;
	while (true) {
		dbginst++;
		// Periodically check if we've run for too long.
		if (--timeiters<=0) {
			if (performance.now()>=stoptime) {
				break;
			}
			timeiters=8192;
		}
		// Load a, b, and c.
		if (ip<alloc2) {
			// Inbounds read.
			a=mem[ip++];
			b=mem[ip++];
			c=mem[ip++];
		} else {
			// Out of bounds read.
			a=ip<alloc?mem[ip]:0;ip=(ip+1)>>>0;
			b=ip<alloc?mem[ip]:0;ip=(ip+1)>>>0;
			c=ip<alloc?mem[ip]:0;ip=(ip+1)>>>0;
		}
		/*a=mem[ip++];
		b=mem[ip++];
		c=mem[ip++];
		if (c===undefined) {
			ip-=3;
			a=ip<alloc?mem[ip]:0;ip=(ip+1)>>>0;
			b=ip<alloc?mem[ip]:0;ip=(ip+1)>>>0;
			c=ip<alloc?mem[ip]:0;ip=(ip+1)>>>0;
		}*/
		// Input
		/*mb=mem[b];
		if (mb===undefined) {
			if (b<0x80000000) {
				mb=0;
			} else if (b===0xfffffffc) {
				// Timing frequency. 2^32 = 1 second.
				mb=65536;
			} else if (b===0xfffffffb) {
				// Read time. time = (seconds since 1 Jan 1970) * 2^16.
				var date=performance.timeOrigin+performance.now();
				mb=(date*65.536)>>>0;
			} else {
				// We couldn't find a special address to read.
				mb=0;
			}
		}*/
		if (b<alloc) {
			// Inbounds. Read mem[b] directly.
			mb=mem[b];
		} else if (b<0x80000000) {
			mb=0;
		} else if (b===0xfffffffc) {
			// Timing frequency. 2^32 = 1 second.
			mb=65536;
		} else if (b===0xfffffffb) {
			// Read time. time = (seconds since 1 Jan 1970) * 2^16.
			var date=performance.timeOrigin+performance.now();
			mb=(date*65.536)>>>0;
		} else {
			// We couldn't find a special address to read.
			mb=0;
		}
		// Output
		/*ma=mem[a]-mb;
		if (ma===ma) {
			ip=(ma<=0)?c:ip;
			mem[a]=ma;
			continue;
		}*/
		if (a<alloc) {
			// Execute a normal SICO instruction.
			// Inbounds. Read and write to mem[a] directly.
			//ma=mem[a];
			//if (ma<=mb) {ip=c;}
			//mem[a]=ma-mb;
			//mem[a]=(ma-mb)>>>0;
			//if (mem[a]<=mb) {ip=c;}
			//
			ip=(mem[a]<=mb)?c:ip;
			mem[a]-=mb;
			//
			//ma=mem[a]-mb;
			//ip=(ma<=0)?c:ip;
			//mem[a]=ma;
			//
			//ma=mem[a]-mb;
			//ip=(ma<=0)?c:ip;
			//mem[a]=ma>>>0;
			continue;
		}
		// Special addresses.
		ip=c;
		if (a<0x80000000) {
			// Execute a normal SICO instruction.
			SicoSetMem(st,a,-mb);
			if (st.state!==SICO_RUNNING) {
				break;
			}
			mem=st.mem;
			alloc=st.alloc;
			alloc2=st.alloc-2;
		} else if (a===0xffffffff) {
			// Exit.
			st.state=SICO_COMPLETE;
			break;
		} else if (a===0xfffffffe) {
			// Print to stdout.
			//SicoPrint(st,String.fromCharCode(mb&255));/////////////////////////////////////////////////////
			timeiters-=2;
		} else if (a===0xfffffffa) {
			// Sleep.
			var sleep=mb/65.536;
			var sleeptill=performance.now()+sleep;
			// If sleeping for longer than the time we have or more than 4ms, abort.
			if (sleep>4 || sleeptill>=stoptime) {
				st.sleep=sleeptill;
				if (sleeptill<stoptime) {
					setTimeout(SicoRun,sleep-2,st,stoptime);
				}
				break;
			}
			// Busy wait.
			while (performance.now()<sleeptill) {}
			timeiters=0;
		} else if (a===0xfffffff9) {
			// Draw an image.
			SicoDrawImage(st,mb);
			timeiters=0;
		}
	}
	st.ip=ip;
	// Performance testing.
	st.dbginst+=dbginst;
	if (st.state!==SICO_RUNNING) {
		var time=(performance.now()-st.dbgtime)/1000;
		st.dbgrate=st.dbginst/time;
		st.dbgtime=undefined;
		/*SicoPrint(st,"\n-----------------------\nDebug Stats:\n\n");
		SicoPrint(st,"inst: "+st.dbginst+"\n");
		SicoPrint(st,"sec : "+time+"\n");
		SicoPrint(st,"rate: "+st.dbgrate+"\n");*/
	}
}

