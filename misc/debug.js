/*------------------------------------------------------------------------------


debug.js - v1.01

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
History


1.00
     Initial version with IsVisible() and DisplayError().
1.01
     Removed DisplayErrors().


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint debug.js -c ../../standards/eslint.js */
/* global */


//---------------------------------------------------------------------------------
// Debug - v1.01


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


const Debug={
	IsVisible:IsVisible
};
export {Debug};
