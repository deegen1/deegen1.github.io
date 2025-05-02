/*------------------------------------------------------------------------------


editor.js - v1.08

Copyright 2020 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint editor.js -c ../../standards/eslint.js */
/* global SICO, HighlightSico */


function SicoInitEditor() {
	let runbutton  =document.getElementById("sico_run");
	let resetbutton=document.getElementById("sico_reset");
	let savebutton =document.getElementById("sico_save");
	let loadbutton =document.getElementById("sico_load");
	let input=document.getElementById("sico_editor");
	let output=document.getElementById("sico_output");
	let graphics=document.getElementById("sico_canvas");
	let select=document.getElementById("sico_demo");
	let advanced=document.getElementById("sico_advanced");
	let menu=document.getElementById("sico_menu");
	let keygrab=document.getElementById("sico_keyboard");
	let sico=new SICO(output,graphics);
	let running=0;
	function update() {
		// Our main event loop. Run the main SICO loop for 15ms and queue the next
		// update for 12ms in the future. This will give the browser time to handle events
		// and spend most of our time executing SICO instructions.
		let runtext;
		if (sico.state!==sico.RUNNING && sico.state!==sico.SLEEPING) {
			running=0;
			runtext="&#9654;&nbsp;&nbsp;&nbsp;Run";
			if (sico.state!==sico.COMPLETE) {
				sico.print(sico.statestr);
			}
		} else if (running===1) {
			// There's no good unicode character for a pause button, so use 2 vertical bars
			// instead.
			runtext="<span style='font-size:60%;vertical-align:middle'>&#9616;&#9616;</span>&nbsp;&nbsp;&nbsp;Pause";
		} else {
			runtext="&#9654;&nbsp;&nbsp;&nbsp;Resume";
		}
		if (runbutton.innerHTML!==runtext) {
			runbutton.innerHTML=runtext;
		}
		if (running===1) {
			// Put the next update on the event queue before running our main loop.
			setTimeout(update,12);
			sico.run(Infinity,performance.now()+15);
		}
	}
	// Setup the run button.
	if (runbutton!==null) {
		runbutton.onclick=function() {
			if (sico.state===sico.RUNNING || sico.state===sico.SLEEPING) {
				running=1-running;
			} else {
				sico.parseassembly(input.value);
				running=1;
			}
			if (running===1) {
				setTimeout(update,0);
			}
		};
		runbutton.innerHTML="&#9654;&nbsp;&nbsp;&nbsp;Resume&nbsp;";
		runbutton.style.width=runbutton.clientWidth.toString()+"px";
		runbutton.innerHTML="&#9654;&nbsp;&nbsp;&nbsp;Run";
	}
	// Setup the reset button.
	if (resetbutton!==null) {
		resetbutton.onclick=function() {
			sico.clear();
			running=0;
			setTimeout(update,0);
		};
	}
	// Setup the save button.
	if (savebutton!==null) {
		savebutton.onclick=function() {
			let file=new Blob([input.value],{type:"text/plain"});
			let a=document.createElement("a");
			let url=window.URL.createObjectURL(file);
			a.href=url;
			a.download="sico_source.txt";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		};
	}
	// Setup the load button.
	if (loadbutton!==null) {
		loadbutton.onclick=function() {
			let prompt=document.createElement("input");
			prompt.type="file";
			prompt.onchange=function() {
				if (prompt.files.length>0) {
					let file=prompt.files[0];
					let reader=new FileReader();
					reader.onload=function(event) {
						sico.clear();
						running=0;
						input.value=event.target.result;
						updatetext();
						sico.print("Loaded "+file.name+"\n");
					};
					reader.readAsText(file);
				} else {
					sico.print("No file selected\n");
				}
			};
			prompt.click();
		};
	}
	// Setup the advanced menu.
	advanced.onclick=function() {
		if (menu.style.display==="none") {
			menu.style.display="block";
		} else {
			menu.style.display="none";
		}
	};
	let inputgrab=function(e) {
		let code=e.keyCode;
		if (code===9 || (code>=120 && code<=122)) {
			e.preventDefault();
			if (code===9) {
				// Tab
				document.execCommand("insertText",false,"\t");
			} else if (code===120) {
				// F9
				runbutton.onclick();
			} else if (code===121) {
				// F10
				resetbutton.onclick();
			} else if (code===122) {
				// F11
				keygrab.checked=false;
				keygrab.onchange();
			}
		}
	};
	keygrab.onchange=function() {
		if (keygrab.checked) {
			input.onkeydown=inputgrab;
		} else {
			input.onkeydown=null;
		}
	};
	keygrab.onchange();
	// Helper function to load files.
	function loadfile(path) {
		let xhr=new XMLHttpRequest();
		xhr.onreadystatechange=function(){
			if (xhr.readyState===4) {
				sico.clear();
				running=0;
				setTimeout(update,0);
				if (xhr.status===200) {
					let name=path.split("/");
					input.value=xhr.response;
					updatetext();
					sico.print("Loaded "+name[name.length-1]+"\n");
				} else {
					sico.print("Unable to open "+path+"\n");
				}
			}
		};
		xhr.open("GET",path,true);
		xhr.send();
	}
	// Setup the example select menu.
	if (select!==null) {
		select.onchange=function() {
			if (select.value==="") {
				sico.clear();
				input.value="";
				updatetext();
			} else {
				loadfile(select.value);
			}
		};
	}
	// Parse URL arguments.
	let regex=new RegExp(".*?\\?(file|demo|source)=(.*)","g");
	let match=regex.exec(decodeURI(window.location.href));
	if (match!==null) {
		let type=match[1];
		let arg=match[2];
		if (type==="file") {
			loadfile(arg);
		} else if (type==="demo") {
			for (let i=0;i<select.length;i++) {
				let option=select[i];
				if (option.innerText===arg) {
					select.value=option.value;
					loadfile(option.value);
				}
			}
		} else if (type==="source") {
			sico.clear();
			input.value=arg;
		}
	}
	// If we're using IE, avoid text highlighting.
	if (window.navigator.userAgent.match("(MSIE\\s|Trident/)")) {
		input.wrap="off";
		return;
	}
	// Setup editor highlighting. We do this by creating a textarea and then displaying
	// a colored div directly under it.
	let container=document.createElement("div");
	let highlight=document.createElement("div");
	input.parentNode.replaceChild(container,input);
	container.appendChild(highlight);
	container.appendChild(input);
	// Copy the textarea attributes to the container div. We need to do this before
	// changing the input attributes.
	let inputstyle=window.getComputedStyle(input);
	let allow=new RegExp("(background|border|margin)","i");
	for (let i=0;i<inputstyle.length;i++) {
		let key=inputstyle[i];
		if (key.match(allow)) {
			container.style[key]=inputstyle[key];
		}
	}
	container.style.position="relative";
	container.style.overflow="hidden";
	// Set the textarea to absolute positioning within the container and remove all
	// decorations.
	let caretcolor=inputstyle["caret-color"];
	input.style.position="absolute";
	input.style.left="0";
	input.style.top="0";
	input.style.margin="0";
	input.style.border="none";
	input.style.background="none";
	// Copy the textarea attributes to the highlight div.
	inputstyle=window.getComputedStyle(input);
	let block=new RegExp("color","i");
	for (let i=0;i<inputstyle.length;i++) {
		let key=inputstyle[i];
		if (key.match(allow) || !key.match(block)) {
			highlight.style[key]=inputstyle[key];
		}
	}
	highlight.style.resize="none";
	highlight.style.overflow="hidden";
	// Make the textarea text invisible, except for the caret.
	input.style.color="rgba(0,0,0,0)";
	input.style["caret-color"]=caretcolor;
	let updateposition=function() {
		container.style.width=input.style.width;
		container.style.height=input.style.height;
		highlight.style.left=(-input.scrollLeft)+"px";
		highlight.style.top=(-input.scrollTop)+"px";
		highlight.style.width=(input.clientWidth+input.scrollLeft)+"px";
		highlight.style.height=(input.clientHeight+input.scrollTop)+"px";
	};
	let updatetext=function() {
		updateposition();
		highlight.innerHTML=SicoHighlightScroll(input);
	};
	new ResizeObserver(updatetext).observe(input);
	input.oninput=updatetext;
	input.onscroll=updatetext;
	updatetext();
}

function SicoHighlightScroll(input) {
	// Highlighting the whole source code can be slow, so highlight only the portion
	// that we can see.
	let str=input.value;
	// Determine what lines are visible.
	let len=str.length,lines=1;
	for (let i=0;i<len;i++) {
		lines+=str.charCodeAt(i)===10;
	}
	let vismin=(input.scrollTop/input.scrollHeight)*lines-1;
	let vismax=vismin+(input.clientHeight/input.scrollHeight)*lines+2;
	// console.log(vismin,vismax);
	let comment=0;
	// Find where the first visible line starts, and if it's a block comment.
	let i=0,line=0,c;
	while (i<len && line<vismin) {
		c=str.charCodeAt(i++);
		if (c===10) {
			line++;
		} else if (comment===1) {
			// End block quote.
			if (c===124 && str.charCodeAt(i)===35) {
				i++;
				comment=0;
			}
		} else if (c===35) {
			// Start block quote.
			if (str.charCodeAt(i)===124) {
				i++;
				comment=1;
			}
		} else if (c===39) {
			// ASCII literal.
			if (str.charCodeAt(i++)===10) {
				line++;
			}
		}
	}
	if (line<2) {
		line=0;
		i=0;
		comment=0;
	}
	let pre="<br>".repeat(line-comment*2);
	// Find where the visible lines end.
	let j=i;
	while (j<len && line<=vismax) {
		if (str.charCodeAt(j++)===10) {
			line++;
		}
	}
	// Get the visible substring. If we're in a block comment, manually add a #| for
	// the highlighter.
	let sub=str.substring(i,j);
	if (comment===1) {sub="#|\n\n"+sub;}
	return pre+HighlightSico(sub);
}

window.addEventListener("load",SicoInitEditor,true);
