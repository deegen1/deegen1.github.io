/*------------------------------------------------------------------------------


style.js - v2.06

Copyright 2018 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint style.js -c ../../standards/eslint.js */
/* global */


function GetCSSValue(name) {
	let style=getComputedStyle(document.body);
	let val=style.getPropertyValue(name);
	if (val===null || val===undefined || val==="") {
		throw "can't find "+name;
	}
	return val;
}


function GetCSSRGBA(name) {
	let val=GetCSSValue(name);
	let arr=val.match(/\d+/g).map(Number);
	if (arr===null || arr.length!==4) {
		throw name+' = "'+val+'" not an RGBA value';
	}
	return arr;
}


function SetCSSValue(name,value) {
	document.documentElement.style.setProperty(name,value);
}


function HighlightPython(text) {
	// Set up regular expressions to match an expression to a style.
	let styledefault   ="color:"+GetCSSValue("--code-text");
	let stylecomment   ="color:"+GetCSSValue("--code-comment");
	let stylequote     ="color:"+GetCSSValue("--code-string");
	let stylemultiquote="color:"+GetCSSValue("--code-string");
	let stylenumber    ="color:"+GetCSSValue("--code-number");
	let styleoperator  ="color:"+GetCSSValue("--code-text");
	let stylespecial   ="color:"+GetCSSValue("--code-number");
	let styleimport    ="color:"+GetCSSValue("--code-keyword");
	let stylebuiltin   ="color:"+GetCSSValue("--code-keyword");
	let stylekeyword   ="color:"+GetCSSValue("--code-keyword");
	let styleexception ="color:"+GetCSSValue("--code-keyword");
	let arrspecial=["False","None","True"];
	let arrimport=["as","from","import"];
	let arrbuiltin=[
		"__build_class__","__debug__","__doc__","__import__","__loader__","__name__","__package__","__spec__",
		"abs","all","any","ascii","bin","bool","bytearray","bytes","callable","chr","classmethod","compile",
		"complex","copyright","credits","delattr","dict","dir","divmod","enumerate","eval","exec","exit",
		"filter","float","format","frozenset","getattr","globals","hasattr","hash","help","hex","id","input",
		"int","isinstance","issubclass","iter","len","license","list","locals","map","max","memoryview","min",
		"next","object","oct","open","ord","pow","print","property","quit","range","repr","reversed","round",
		"set","setattr","slice","sorted","staticmethod","str","sum","super","tuple","type","vars","zip"
	];
	let arrkeyword=[
		"and","assert","break","class","continue","def","del","elif","else","except","exec","finally","for",
		"global","if","in","is","lambda","not","or","pass","print","raise","return","try","while","with","yield"
	];
	let arrexception=[
		"ArithmeticError","AssertionError","AttributeError","BaseException","BlockingIOError","BrokenPipeError",
		"BufferError","BytesWarning","ChildProcessError","ConnectionAbortedError","ConnectionError",
		"ConnectionRefusedError","ConnectionResetError","DeprecationWarning","EOFError","EnvironmentError",
		"Exception","FileExistsError","FileNotFoundError","FloatingPointError","FutureWarning","GeneratorExit",
		"IOError","ImportError","ImportWarning","IndentationError","IndexError","InterruptedError",
		"IsADirectoryError","KeyError","KeyboardInterrupt","LookupError","MemoryError","NameError",
		"NotADirectoryError","NotImplemented","NotImplementedError","OSError","OverflowError",
		"PendingDeprecationWarning","PermissionError","ProcessLookupError","RecursionError","ReferenceError",
		"ResourceWarning","RuntimeError","RuntimeWarning","StopAsyncIteration","StopIteration","SyntaxError",
		"SyntaxWarning","SystemError","SystemExit","TabError","TimeoutError","TypeError","UnboundLocalError",
		"UnicodeDecodeError","UnicodeEncodeError","UnicodeError","UnicodeTranslateError",
		"UnicodeWarning","UserWarning","ValueError","Warning","ZeroDivisionError"
	];
	let htmlreplace={"&":"&amp","<":"&lt;",">":"&gt;"};
	let regexmatch=[
		["[_a-zA-Z][_a-zA-Z0-9]*",styledefault],
		[arrspecial,stylespecial],
		[arrimport,styleimport],
		[arrbuiltin,stylebuiltin],
		[arrkeyword,stylekeyword],
		[arrexception,styleexception],
		["(?:0|[1-9]\\d*)(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?",stylenumber],
		["0[xX][0-9a-fA-F]*",stylenumber],
		["[\\~\\!\\@\\$\\%\\^\\&\\*\\(\\)\\-\\+\\=\\<\\>\\/\\|\\[\\]]+",styleoperator],
		['"(?:\\\\[\\s\\S]|[^"\\\\])*?"',stylequote],
		["'(?:\\\\[\\s\\S]|[^'\\\\])*?'",stylequote],
		['"""[\\s\\S]*?"""',stylemultiquote],
		["'''[\\s\\S]*?'''",stylemultiquote],
		["#.*",stylecomment]
	];
	for (let i=0;i<regexmatch.length;i++) {
		let reg=regexmatch[i][0];
		if (Array.isArray(reg)) {reg="("+reg.join("|")+")[^_0-9a-zA-Z]";}
		regexmatch[i][0]=new RegExp(reg);
	}
	// Begin parsing the text.
	let prev=styledefault;
	let ret="<span style=\""+styledefault+"\">";
	while (text.length>0) {
		let minpos=text.length;
		let mintext="";
		let minstyle=styledefault;
		// Find the regex closest to index 0. If two occur at the same index, take the
		// latter regex.
		for (let i=0;i<regexmatch.length;i++) {
			let match=text.match(regexmatch[i][0]);
			if (match!==null && minpos>=match.index) {
				minpos=match.index;
				mintext=match[match.length-1];
				minstyle=regexmatch[i][1];
			}
		}
		// If we skipped over text and it's not whitespace, give it the default style.
		let prefix=text.substring(0,minpos);
		if (prefix.trim().length>0 && prev!==styledefault) {
			ret+="</span><span style=\""+styledefault+"\">";
			prev=styledefault;
		}
		ret+=prefix;
		// Append and style the best matched regex.
		if (prev!==minstyle) {
			ret+="</span><span style=\""+minstyle+"\">";
			prev=minstyle;
		}
		for (let i=0;i<mintext.length;i++) {
			let c=mintext[i];
			let r=htmlreplace[c];
			if (r===undefined) {ret+=c;}
			else {ret+=r;}
		}
		text=text.substring(minpos+mintext.length);
	}
	return ret+"</span>";
}


function HighlightJavascript(text) {
	// Set up regular expressions to match an expression to a style.
	let styledefault   ="color:"+GetCSSValue("--code-text");
	let stylecomment   ="color:"+GetCSSValue("--code-comment");
	let stylequote     ="color:"+GetCSSValue("--code-string");
	let stylemultiquote="color:"+GetCSSValue("--code-string");
	let stylenumber    ="color:"+GetCSSValue("--code-number");
	let styleoperator  ="color:"+GetCSSValue("--code-text");
	let stylespecial   ="color:"+GetCSSValue("--code-number");
	let stylekeyword   ="color:"+GetCSSValue("--code-keyword");
	let arrspecial=[
		"Array","Date","eval","function","hasOwnProperty","Infinity","isFinite","isNaN",
		"isPrototypeOf","length","Math","NaN","name","Number","Object","prototype",
		"String","toString","undefined","valueOf","eval","null","true","false"
	];
	let arrkeyword=[
		"abstract","arguments","await","boolean","break","byte","case","catch","char",
		"class","const","continue","debugger","default","delete","do","double","else",
		"enum","export","extends","final","finally","float","for","function","goto",
		"if","implements","import","in","instanceof","int","interface","let","long",
		"native","new","package","private","protected","public","return","short",
		"static","super","switch","synchronized","this","throw","throws","transient",
		"try","typeof","var","void","volatile","while","with","yield"
	];
	let htmlreplace={"&":"&amp","<":"&lt;",">":"&gt;"};
	let regexmatch=[
		["[_a-zA-Z][_a-zA-Z0-9]*",styledefault],
		[arrspecial,stylespecial],
		[arrkeyword,stylekeyword],
		["(?:0|[1-9]\\d*)(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?",stylenumber],
		["0[xX][0-9a-fA-F]*",stylenumber],
		["[\\~\\!\\@\\$\\%\\^\\&\\*\\(\\)\\-\\+\\=\\<\\>\\/\\|\\[\\]]+",styleoperator],
		['"(?:\\\\[\\s\\S]|[^"\\\\])*?"',stylequote],
		["'(?:\\\\[\\s\\S]|[^'\\\\])*?'",stylequote],
		["`(?:\\\\[\\s\\S]|[^`\\\\])*?`",stylequote],
		["/\\*[\\s\\S]*?\\*/",stylemultiquote],
		["//.*",stylecomment]
	];
	for (let i=0;i<regexmatch.length;i++) {
		let reg=regexmatch[i][0];
		if (Array.isArray(reg)) {reg="("+reg.join("|")+")[^_0-9a-zA-Z]";}
		regexmatch[i][0]=new RegExp(reg);
	}
	// Begin parsing the text.
	let prev=styledefault;
	let ret="<span style=\""+styledefault+"\">";
	while (text.length>0) {
		let minpos=text.length;
		let mintext="";
		let minstyle=styledefault;
		// Find the regex closest to index 0. If two occur at the same index, take the
		// latter regex.
		for (let i=0;i<regexmatch.length;i++) {
			let match=text.match(regexmatch[i][0]);
			if (match!==null && minpos>=match.index) {
				minpos=match.index;
				mintext=match[match.length-1];
				minstyle=regexmatch[i][1];
			}
		}
		// If we skipped over text and it's not whitespace, give it the default style.
		let prefix=text.substring(0,minpos);
		if (prefix.trim().length>0 && prev!==styledefault) {
			ret+="</span><span style=\""+styledefault+"\">";
			prev=styledefault;
		}
		ret+=prefix;
		// Append and style the best matched regex.
		if (prev!==minstyle) {
			ret+="</span><span style=\""+minstyle+"\">";
			prev=minstyle;
		}
		for (let i=0;i<mintext.length;i++) {
			let c=mintext[i];
			let r=htmlreplace[c];
			if (r===undefined) {ret+=c;}
			else {ret+=r;}
		}
		text=text.substring(minpos+mintext.length);
	}
	return ret+"</span>";
}


function HighlightSico(str) {
	// Convert SICO assembly language into a formatted HTML string.
	// Define styles.
	let stylearr=[
		"</span><span style='color:"+GetCSSValue("--code-text"   )+"'>", // default, number, operator, label ref
		"</span><span style='color:"+GetCSSValue("--code-comment")+"'>", // comment
		"</span><span style='color:"+GetCSSValue("--code-label"  )+"'>", // label declaration
		"</span><span style='color:"+GetCSSValue("--code-string" )+"'>"  // ASCII literal
	];
	let styledefault =0;
	let stylecomment =1;
	let styleascii   =3;
	let stylenumber  =0;
	let styleoperator=0;
	let stylelabelref=0;
	let stylelabeldec=2;
	let style=styledefault,prevstyle=styledefault;
	let htmlconvert=document.createElement("div");
	let htmlret="<span>";
	// Helper functions for processing the string.
	let i=0,i0=0,j=0,len=str.length,c;
	function  CNUM(c) {return (c<=57?c+208:((c+191)&~32)+10)&255;}
	function ISLBL(c) {return CNUM(c)<36 || c===95 || c===46 || c>127;}
	function  ISOP(c) {return c===43 || c===45;}
	function   NEXT() {return (c=i++<len?str.charCodeAt(i-1):0);}
	// Process the string.
	NEXT();
	while (c!==0) {
		i0=i-1;
		if (c===13 || c===10 || c===9 || c===32) {
			// Whitespace.
			NEXT();
		} else if (c===35) {
			// Comment. If next='|', use the multi-line format.
			let mask=0,eoc=10,n=0;
			if (NEXT()===124) {mask=255;eoc=31779;NEXT();}
			while (c!==0 && n!==eoc) {n=((n&mask)<<8)+c;NEXT();}
			style=stylecomment;
		} else if (ISOP(c)) {
			// Operator.
			NEXT();
			style=styleoperator;
		} else if (CNUM(c)<10) {
			// Number. If it starts with "0x", use hexadecimal.
			let token=10;
			if (c===48 && (NEXT()===120 || c===88)) {token=16;NEXT();}
			while (CNUM(c)<token) {NEXT();}
			style=stylenumber;
		} else if (c===39) {
			// ASCII literal. Ex: 'H 'e 'l 'l 'o
			NEXT();
			NEXT();
			style=styleascii;
		} else if (c===63) {
			// Current address token.
			NEXT();
			style=stylelabelref;
		} else if (ISLBL(c)) {
			// Label.
			while (ISLBL(c)) {NEXT();}
			if (c===58) {
				// Label declaration.
				NEXT();
				style=stylelabeldec;
			} else {
				style=stylelabelref;
			}
		} else if (c===58) {
			// Lone label declaration.
			NEXT();
			style=stylelabeldec;
		} else {
			// Unknown
			NEXT();
			style=styledefault;
		}
		if (prevstyle!==style) {
			// Extract the highlighted substring and convert it to HTML friendly text.
			let sub=str.substring(j,i0);
			htmlconvert.innerText=sub;
			sub=htmlconvert.innerHTML;
			htmlret+=stylearr[prevstyle]+sub;
			j=i0;
			prevstyle=style;
		}
	}
	// We need to manually handle the tail end of the string.
	let sub=str.substring(j,str.length);
	htmlconvert.innerText=sub;
	sub=htmlconvert.innerHTML;
	htmlret+=stylearr[prevstyle]+sub+"</span>";
	return htmlret;
}


function HighlightStyle(classname,func) {
	// Replace innerHTML with highlighted text.
	let elems=document.getElementsByClassName(classname);
	for (let i=0;i<elems.length;i++) {
		let elem=elems[i];
		elem.innerHTML=func(elem.innerText);
	}
}


function StyleFooter() {
	// De-obfuscate the email address in the footer to allow the email to work with
	// ctrl+f.
	let footer=document.getElementById("footer");
	if (footer!==null) {
		let text=footer.innerHTML;
		footer.innerHTML=text.replace(new RegExp("\\<b\\>.*?\\<\\/b\\>","g"),"");
	}
}


function StyleOnload() {
	StyleFooter();
	HighlightStyle("langpython",HighlightPython);
	HighlightStyle("langjs",HighlightJavascript);
	HighlightStyle("langsico",HighlightSico);
}


window.addEventListener("load",StyleOnload,true);
