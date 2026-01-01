/*------------------------------------------------------------------------------


env.js - v1.02

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
History


1.00
     Initial version with IsVisible() and DisplayError().
1.01
     Removed DisplayError().
1.02
     Added GetCSSRGBA().
     Renamed from Debug to Env.


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint env.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Env - v1.02


function IsVisible(elem) {
	// If the window is minimized, or the tab isn't primary.
	if (document.visibilityState==="hidden") {return false;}
	// If the element rect isn't on screen.
	let rect=elem.getBoundingClientRect();
	let doc=document.documentElement;
	if (rect.bottom<=0 || rect.top >=(window.innerHeight || doc.clientHeight)) {return false;}
	if (rect.right <=0 || rect.left>=(window.innerWidth  || doc.clientWidth )) {return false;}
	return true;
}


function GetCSSRGBA(name) {
	// Ex: GetCSSRGBA("--code-comment")
	let style=getComputedStyle(document.body);
	let val=style.getPropertyValue(name);
	let arr=val.match(/\d+/g).map(Number);
	if (arr===null || arr.length!==4) {
		throw name+' = "'+val+'" not an RGBA value';
	}
	return arr;
}


const Env={
	IsVisible:IsVisible,
	GetCSSRGBA:GetCSSRGBA
};
export {Env};
