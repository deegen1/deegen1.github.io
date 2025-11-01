/*------------------------------------------------------------------------------


debug.js - v1.00

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
History


1.00
     Initial version with IsVisible() and DisplayError().


--------------------------------------------------------------------------------
Index


Debug
	DisplayErrors()
	IsVisible(elem)


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint debug.js -c ../../standards/eslint.js */
/* global */


//---------------------------------------------------------------------------------
// Debug - v1.00


export function DisplayErrors() {
	// For use when the web console is not available.
	let used=0;
	window.addEventListener("error",function (evt) {
		if (used++) {return;}
		let namearr=["file","line","error","stack"];
		let valarr =[evt.filename,evt.lineno,evt.error,evt.error.stack];
		let replace=[["&","&amp;"],["<","&lt;"],[">","&gt;"],["\n","<br>"]];
		let table="<table style='position:absolute;top:0;left:0;background-color:#000000;"+
			     "color:#ffffff;font-family:monospace,monospace;'>\n";
		let tdstyle="<td style='padding:0.3rem;background-color:#202020;vertical-align:top";
		for (let i=0;i<4;i++) {
			let val=valarr[i].toString();
			for (let r of replace) {val=val.replace(new RegExp(r[0],"g"),r[1]);}
			table+=`<tr>${tdstyle};color:#ff8080'>${namearr[i]}:</td>${tdstyle}'>${val}</td></tr>\n`;
		}
		table+="</table>";
		document.body.innerHTML+=table;
	});
}
// DisplayErrors();


export function IsVisible(elem) {
	// If the window is minimized, or the tab isn't primary.
	if (document.visibilityState==="hidden") {return false;}
	// If the element rect isn't on screen.
	let rect=elem.getBoundingClientRect();
	let doc=document.documentElement;
	if (rect.bottom<=0 || rect.top >=(window.innerHeight || doc.clientHeight)) {return false;}
	if (rect.right <=0 || rect.left>=(window.innerWidth  || doc.clientWidth )) {return false;}
	return true;
}
