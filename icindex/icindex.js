/*------------------------------------------------------------------------------


icindex.js - v1.02

Copyright 2026 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Limb IDs
	0: global
	1: body (size)
	2: front
	3: back
	4: head
	5: tail
	6: torso
	7: wings
	8: claws


melee_dmgtype flags
	0: regular
	1: poison
	2: horns
	4: barrier destroy


range_dmgtype flags
	 0: regular
	 1: poison
	 2: perforate (porcupine)
	 8: unknown (eel, cuttlefish)
	16: chemical (glue)


Basic Equations:
	out_size     = max(left_size,right_size)
	out_damage   = damage*((out_size/size)^exp_damage)
	out_armor    = armor*((out_size/size)^exp_armor)
	effective_hp = health/(1-armor)
	dps          = damage


SRF = short range flying = hovering

melee_rate and damage_rate only affect animation speed.

If only one stock has a limb (like claws), then the creature does not need to
have that limb.


--------------------------------------------------------------------------------
History


1.00
     Created to simplify IC Combiner (github.com/ddelamare/IC-Combiner).
     Can load stock lua files and not much else.
     Built off of work from Kjones94, ddelamare, iamwso.
1.01
     Added math for limb attribute calculations.
     Converted ICP attrcombiner.lua to javascript.
     Compared outputs to IC debug console outputs.
1.02
     Added display names, instead of file names.
     Added sortable attribute columns.
     Updated color scheme and layout.
     Fixed stock names to match combiner names.
     Rejected multiple impossible stock combinations.


--------------------------------------------------------------------------------
TODO


Test filter
	Filters                                  [remove all]
	[empty,level,power,etc] between [min,max]    remove
	if empty and not last slot, remove


*/
/* npx eslint icindex.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Globals


import * as MOD_ICP from "./icp/icindex_mod.js";
//import * as MOD_TEL from "./tellurian/icdex_mod.js";
//import * as MOD_INS from "./insect/icdex_mod.js";
//import * as MOD_IC from "./ic/icdex_mod.js";


//---------------------------------------------------------------------------------
// Main


class Limb {


	static META =0;
	static BODY =1;
	static FRONT=2;
	static BACK =3;
	static HEAD =4;
	static TAIL =5;
	static TORSO=6;
	static WINGS=7;
	static CLAWS=8;

	static Names=[
		"empty", // 0
		"body" , // 1
		"front", // 2
		"back" , // 3
		"head" , // 4
		"tail" , // 5
		"torso", // 6
		"wings", // 7
		"claws"  // 8
	];


	constructor(type,stock) {
		this.type=type;
		this.stock=stock;
		this.name=Limb.Names[type];
		this.size=0;
		this.stocktype=0;
		// Sight
		this.sight_radius=0;
		this.sight_exp=0;
		this.night_sight_radius=0;
		// Population
		this.overpopulation=0;
		this.poplow=0;
		// Health
		this.armour=0;
		this.hitpoints=0;
		this.dodge=0;
		this.exp_armour=0;
		this.exp_hitpoints=0;
		this.exp_dodge=0;
		this.hardened=0;
		this.shell=0;
		// Movement
		this.bipedal=0;
		this.speed_boost=0;
		this.speed_max=0;
		this.airspeed_max=0;
		this.waterspeed_max=0;
		this.exp_speed_max=0;
		this.exp_airspeed_max=0;
		this.exp_waterspeed_max=0;
		// Melee
		this.melee_dmgtype=0;
		this.melee_damage=0;
		this.melee_contact=0;
		this.exp_melee_damage=0;
		// Range
		this.range_dmgtype=0;
		this.ranged_piercing=0;
		this.range_special=0;
		this.range_contact=0;
		this.range_damage=0;
		this.range_max=0;
		this.exp_range_damage=0;
		this.exp_range_max=0;
		// Group
		this.pack_hunter=0;
		this.herding=0;
		this.loner=0;
		// Triggered Abilities
		this.trigger_number=0;
		this.trigger_type=0;
		this.trigger_rate=0;
		this.trigger_contact=0;
		// Autonomous Abilities
		this.AutoDefense=0;
		this.poison_bite=0;
		this.poison_touch=0;
		this.poison_sting=0;
		this.poison_pincers=0;
		this.leap_attack=0;
		this.charge_attack=0;
		this.is_stealthy=0;
		this.is_immune=0;
		this.regeneration=0;
		this.deflection_armour=0;
		this.keen_sense=0;
		// Activated Abilities
		this.stink_attack=0;
		this.electric_burst=0;
		this.frenzy_attack=0;
		this.plague_attack=0;
		this.quill_burst=0;
		this.web_throw=0;
		this.assassinate=0;
		this.flash=0;
		this.headflashdisplay=0;
		this.fly=0;
		this.infestation=0;
		this.can_dig=0;
		this.can_SRF=0;
		this.soiled_land=0;
		this.sonar_pulse=0;
		this.stink=0;
		// Other
		this.end_bonus=0;
		this.end_penalty=0;
		this.endurance_bonus=0;
	}

}


class Stock {

	static BIRD     =0;
	static QUADRUPED=1;
	static ARACHNID =2;
	static SNAKE    =3;
	static INSECT   =4;
	static FISH     =5;


	constructor(str,name) {
		// Parses a lua file.
		// this.lua=str;
		this.name=name;
		let limbarr=(new Array(9)).fill(null);
		this.limbarr=limbarr;
		// Strip comments and remove spaces.
		str=str.replace(/--.*\n/g,"\n");
		str=str.replace(/[ \r\t]/g,"");
		// Parse ["attr"] = {x,y}
		let lines=str.split("\n");
		for (let line of lines) {
			// Extract name, id, and value.
			let match=line.match(/\["(.*?)"\]=\{(.*?),(.*?)\}/);
			if (!match) {continue;}
			let attr=match[1];
			let id=parseInt(match[2]);
			let val=parseFloat(match[3]);
			// let ival=val|0;
			// Sanity check attribute values.
			let error="";
			if (isNaN(id) || id<0 || id>8) {error="Limb ID";}
			if (isNaN(val) || val<=-Infinity || val>=Infinity) {error="Invalid value";}
			if (attr.match(/front$/) && id!==2) {error="Front ID";}
			if (attr.match(/back$/)  && id!==3) {error="Back ID";}
			if (attr.match(/head$/)  && id!==4) {error="Head ID";}
			if (attr.match(/tail$/)  && id!==5) {error="Tail ID";}
			if (attr.match(/torso$/) && id!==6) {error="Torso ID";}
			if (attr.match(/wings$/) && id!==7) {error="Wings ID";}
			// if ((!attr.match(/\d/))!==(id===1)) {error="Global ID";}
			if (error) {
				console.log(error);
				console.log(attr,id,val);
				console.log(this);
				throw error;
			}
			// Account for every possible attribute.
			// Sanitize things like "armour[-head]" and "melee[N]_damage".
			// melee[N] takes priority over the limb it's assigned in {M,value}.
			let san=attr.replace(/[_-]?(front|back|head|tail|torso|wings)$/g,"");
			if ((match=san.match(/(melee|range)(\d+)/))) {
				id=parseInt(match[2]);
			}
			san=san.replace(/\d/g,"");
			let ignore=[
				"speed_mid","exp_speed_mid",
				"melee_shortdesc","melee_longdesc","melee_name",
				"melee_rate", // animation speed
				"melee_number", // animation type
				"range_shortdesc","range_longdesc","range_name","range_min","exp_range_min",
				"range_rate","exp_range_rate", // animation speed
				"range_number", // animation type
				"front_foot_type","rear_foot_type","vocal_type","Hide_type","actbeselect",
				"selection_sloppyness","boneblobshadow","simvis_occludee","singleselectonly",
				"isvisible","fadeAndDeleteWhenDead","stayInPathfindingAfterDead",
				"min_triangle_count","simterrain","simcollides","simfogged","combinervisible",
				"minimap_enable","minimap_teamcolour","ghost_enable","tag_desc","lefthalf_name",
				"righthalf_name","disable_cheap_skinning","tailflashdisplay","bobcost","tiny",
				"fml","imaginary_hovering","is_lioness"
			];
			let limb=limbarr[id];
			if (!limb) {
				limb=new Limb(id,this);
				limbarr[id]=limb;
			}
			if (ignore.includes(san)) {
				// do nothing
			} else if (limb[san]!==undefined) {
				limb[san]=val;
			} else {
				// Add the attribute to Limb.constructor() or the ignore list.
				error="Unrecognized limb attribute: "+san;
			}
			if (error) {
				console.log(error);
				console.log(this.name,line);
				console.log(attr,id,val);
				console.log(this);
				console.log(limb);
				throw error;
			}
		}
		// Clip wings if not flying.
		let type=limbarr[1].stocktype;
		if (type!==Stock.BIRD && type!==Stock.INSECT) {
			limbarr[7]=null;
		}
		// Fish and snakes don't have legs.
		if (type===Stock.FISH || type===Stock.SNAKE) {
			limbarr[2]=null;
			limbarr[3]=null;
		}
		// Bird's don't have front legs
		if (type===Stock.BIRD) {
			limbarr[2]=null;
		}
		/*
		if (limbarr[7] && limbarr[7].airspeed_max<=0) {
			limbarr[7]=null;
		}
		if (limbarr[2] && limbarr[2].speed_max<=0) {
			limbarr[2]=null;
		}
		if (limbarr[3] && limbarr[3].speed_max<=0) {
			limbarr[3]=null;
		}
		*/
	}

}


class Creature {

	constructor(stock0,stock1,choice) {
		// A lot of this function is derived from Kev's IC Combiner.
		// Allow limb choices to be an int or array.
		if (choice.length!==undefined) {
			if (choice.length!==7) {throw "too many choices";}
			let flag=0;
			for (let i=0;i<7;i++) {flag|=(choice[i]?1:0)<<i;}
			choice=flag;
		}
		// Select limbs.
		let valid=true;
		let limb0=stock0.limbarr,limb1=stock1.limbarr;
		let limbarr=new Array(9);
		for (let i=0;i<9;i++) {
			let side=(choice>>>i)&1;
			let l0=limb0[i],l1=limb1[i];
			limbarr[i]=side?l1:l0;
			// Prevent duplicates if limbs are copies (usually null's).
			if (side && Object.is(l0,l1)) {valid=false;}
		}
		// Filter out impossible limb combinations.
		let torso=limbarr[6].stock.limbarr[1].stocktype;
		if (torso===Stock.BIRD) {
			// Flying torso must have wings.
			if (!limbarr[Limb.WINGS]) {valid=false;}
		} else if (torso===Stock.QUADRUPED) {
			// Quad torso must have front and back limbs.
			if (!limbarr[Limb.FRONT] || !limbarr[Limb.BACK]) {
				valid=false;
			}
		} else if (torso===Stock.ARACHNID) {
			// Clawed arachnids must have claws.
			if (!limbarr[Limb.CLAWS] && limbarr[6].stock.limbarr[Limb.CLAWS]) {
				valid=false;
			}
		} else if (torso===Stock.SNAKE) {
		} else if (torso===Stock.INSECT) {
			if (!limbarr[Limb.WINGS]) {valid=false;}
		} else if (torso===Stock.FISH) {
		}
		this.valid=valid;
		if (!valid) {return;}
		// First order stats
		this.limbarr=limbarr;
		this.sort=0;
		this.stock0=stock0;
		this.stock1=stock1;
		this.choice=choice;
		let size=Math.max(limb0[1].size,limb1[1].size);
		this.size=size;
		this.coal=0;
		this.electricity=0;
		// Sight
		this.sight_radius=0;
		this.night_sight_radius=0;
		// Population
		this.overpopulation=0;
		this.poplow=0;
		// Health
		this.armour=0;
		this.hitpoints=0;
		this.dodge=0;
		this.hardened=0;
		this.shell=0;
		// Movement
		this.bipedal=0;
		this.speed_boost=0;
		this.landspeed=0;
		this.airspeed=0;
		this.waterspeed=0;
		// Melee
		this.melee_dmgtype=0;
		this.melee_damage=0;
		// Range
		//this.range_dmgtype=0;
		this.ranged_piercing=0;
		//this.range_special=0;
		this.range_damage=0;
		//this.range_max=0;
		this.rangearr=[];
		// Group
		this.pack_hunter=0;
		this.herding=0;
		this.loner=0;
		// Triggered Abilities
		//this.trigger_number=0;
		//this.trigger_type=0;
		//this.trigger_rate=0;
		//this.trigger_contact=0;
		// Autonomous Abilities
		this.AutoDefense=0;
		this.poison_bite=0;
		this.poison_touch=0;
		this.poison_sting=0;
		this.poison_pincers=0;
		this.leap_attack=0;
		this.charge_attack=0;
		this.is_stealthy=0;
		this.is_immune=0;
		this.regeneration=0;
		this.deflection_armour=0;
		this.keen_sense=0;
		// Activated Abilities
		this.stink_attack=0;
		this.electric_burst=0;
		this.frenzy_attack=0;
		this.plague_attack=0;
		this.quill_burst=0;
		this.web_throw=0;
		this.assassinate=0;
		this.flash=0;
		this.headflashdisplay=0;
		this.fly=0;
		this.infestation=0;
		this.can_dig=0;
		this.can_SRF=0;
		this.soiled_land=0;
		this.sonar_pulse=0;
		this.stink=0;
		// Other
		this.end_bonus=0;
		this.end_penalty=0;
		this.endurance_bonus=0;
		// Scaling calculation
		let ratio=0;
		function calcexp(mul,exp) {
			if (isNaN(mul) || isNaN(exp)) {throw "invalid exp";}
			let x=mul*Math.pow(ratio,exp);
			return x>0?x:0;
		}
		function calcexpf(mul,exp) {return Math.floor(calcexp(mul,exp));}
		for (let l=0;l<9;l++) {
			let limb=limbarr[l];
			if (l===0) {limb=limb0[0];}
			if (l===1) {limb=limb1[0];}
			if (!limb) {continue;}
			//console.log(limb.name,limb.stock.name);
			let body=limb.stock.limbarr[1];
			ratio=size/body.size;
			// Sight
			this.sight_radius+=calcexp(limb.sight_radius,limb.sight_exp);
			this.night_sight_radius+=calcexp(limb.night_sight_radius,limb.sight_exp);
			// Population
			this.overpopulation|=limb.overpopulation;
			this.poplow|=limb.poplow;
			// Health
			this.armour+=calcexp(limb.armour,body.exp_armour);
			this.hitpoints+=calcexp(limb.hitpoints,body.exp_hitpoints);
			this.dodge+=calcexp(limb.dodge,body.exp_dodge);
			this.hardened+=limb.hardened;
			this.shell|=limb.shell;
			// Movement
			this.bipedal|=limb.bipedal;
			this.speed_boost+=limb.speed_boost;
			this.landspeed+=calcexp(limb.speed_max,body.exp_speed_max);
			this.airspeed+=calcexp(limb.airspeed_max,body.exp_airspeed_max+body.exp_speed_max);
			this.waterspeed+=calcexp(limb.waterspeed_max,body.exp_waterspeed_max+body.exp_speed_max);
			// Melee
			if (limb.melee_damage>0) {
				this.melee_damage+=calcexpf(limb.melee_damage,limb.exp_melee_damage);
				this.melee_dmgtype|=limb.melee_dmgtype;
			}
			// Range
			if (limb.range_damage>0) {
				let damage=calcexpf(limb.range_damage,limb.exp_range_damage);
				this.rangearr.push({
					damage:damage,
					dmgtype:limb.range_dmgtype,
					max:calcexp(limb.range_max,limb.exp_range_max),
					special:limb.range_special
				});
				this.range_damage+=damage;
				this.range_piercing|=limb.range_piercing;
			}
			// Group
			this.pack_hunter|=limb.pack_hunter;
			this.herding|=limb.herding;
			this.loner|=limb.loner;
			// Triggered Abilities
			//this.trigger_number=0;
			//this.trigger_type=0;
			//this.trigger_rate=0;
			//this.trigger_contact=0;
			// Autonomous Abilities
			this.AutoDefense|=limb.AutoDefense;
			this.poison_bite|=limb.poison_bite;
			this.poison_touch|=limb.poison_touch;
			this.poison_sting|=limb.poison_sting;
			this.poison_pincers|=limb.poison_pincers;
			this.leap_attack|=limb.lead_attack;
			this.charge_attack|=limb.charge_attack;
			this.is_stealthy|=limb.is_stealthy;
			this.is_immune|=limb.is_immune;
			this.regeneration|=limb.regeneration;
			this.deflection_armour|=limb.deflection_armour;
			this.keen_sense|=limb.keen_sense;
			// Activated Abilities
			this.stink_attack|=limb.stink_attack;
			this.electric_burst|=limb.electric_burst;
			this.frenzy_attack|=limb.frenzy_attack;
			this.plague_attack|=limb.plague_attack;
			this.quill_burst|=limb.quill_burst;
			this.web_throw|=limb.web_throw;
			this.assassinate|=limb.assassinate;
			this.flash|=limb.flash;
			this.headflashdisplay|=limb.headflashdisplay;
			this.fly|=limb.fly;
			this.infestation|=limb.infestation;
			this.can_dig|=limb.can_dig;
			this.can_SRF|=limb.can_SRF;
			this.soiled_land|=limb.soiled_land;
			this.sonar_pulse|=limb.sonar_pulse;
			this.stink|=limb.stink;
			// Other
			this.end_bonus|=limb.end_bonus;
			this.end_penalty|=limb.end_penalty;
			this.endurance_bonus|=limb.endurance_bonus;
		}
		// If we have wings, ignore land/water speed.
		if (limbarr[7]!==null) {
			this.landspeed=0;
			this.waterspeed=0;
		}
	}


	calcefficiency() {
		let hp=this.hitpoints,armour=this.armour;
		let dps=this.melee_damage;
		for (let range of this.rangearr) {dps=Math.max(dps,range.damage);}
		if (this.pack_hunter) {dps*=1.3;}
		if (this.herding) {armour*=1.3;}
		if (this.frenzy_attack) {dps*=1.5;hp/=1.3;}
		if (this.regeneration) {hp*=1.2;}
		armour=Math.min(armour,0.6);
		return (hp/(1-armour))*dps/(this.coal+this.electricity);
	}

}


class ICDex {

	constructor(mod) {
		let state=this;
		this.mod=mod;
		let stocks=mod.StockFiles.length;
		this.stockarr=new Array(stocks);
		this.stockmap={};
		this.creaturecache=[];
		// Queue loading the stock lua files. This needs to be asynchronous due
		// to JS API standards. Loading is finished when this.loading=0.
		this.loading=stocks;
		for (let i=0;i<stocks;i++) {
			let desc=mod.StockFiles[i];
			let path=mod.StockPath+desc[0];
			fetch(path)
			.then(res=>{
				if (!res.ok) {throw "Could not open "+res.url;}
				return res.text();
			})
			.then(text=>{
				let name=desc[1];
				let stock=new Stock(text,name);
				state.stockarr[i]=stock;
				state.stockmap[name]=stock;
				//console.log(stock);
				state.loading--;
			});
		}
	}


	*itercreatures() {
		// Iterate over all combinations.
		// Cache results on first run.
		let cache=this.creaturecache;
		if (!cache.length) {
			let mod=this.mod;
			let stockarr=this.stockarr;
			let stocks=stockarr.length;
			let combos=(stocks*(stocks+1)>>>1)*128,fill=0;
			cache=new Array(combos);
			for (let s1=0;s1<stocks;s1++) {
				let stock1=stockarr[s1];
				for (let s0=0;s0<s1;s0++) {
					let stock0=stockarr[s0];
					for (let choice=0;choice<128;choice++) {
						let creature=new Creature(stock0,stock1,choice<<2);
						if (creature.valid) {
							mod.AttrCombiner(creature);
							if (creature.valid) {
								cache[fill++]=creature;
							}
						}
					}
				}
			}
			//console.log("combos:",fill);
			cache=cache.slice(0,fill);
			this.creaturecache=cache;
		}
		for (let creature of cache) {
			yield creature;
		}
	}

}


//---------------------------------------------------------------------------------
// UI Functions


class UI {

	constructor() {
		let state=this;
		this.moddesc=document.getElementById("uimoddesc");
		this.modselect=document.getElementById("uimodselect");
		this.modselect.onchange=function() {state.setmod(name);};
		this.uirun=document.getElementById("uirun");
		this.uirun.onclick=function() {state.run();};
		this.uicount=document.getElementById("uicount");
		this.uistock0=document.getElementById("uistock0");
		this.uistock1=document.getElementById("uistock1");
		let attrname=[null,null,"front","back","head","tail","torso","wings","claws"];
		this.uiside=(new Array(9)).fill(null);
		for (let i=2;i<9;i++) {
			let l=document.getElementById("ui"+attrname[i]+"0");
			let r=document.getElementById("ui"+attrname[i]+"1");
			this.uiside[i]=[l,r];
		}
		this.uioutput=document.getElementById("uioutput");
		this.sortcol=3;
		this.sortord=0;
		this.results=[];
		this.maxdisplay=100;
		this.icd=null;
		this.setmod("ICP");
	}


	setmod(name) {
		console.log("setting mod:",name);
		let mod=null;
		if (name==="ICP") {mod=MOD_ICP;}
		if (mod) {
			this.icd=new ICDex(mod);
			this.moddesc.innerHTML="Mod Description: "+mod.Description;
			this.modselect.value=name;
			this.uicount.innerText=`Waiting for initial run`;
			this.results=[];
			this.displayresults();
		}
	}


	setrow(row,creature) {
		// Update creature attributes in the upper-right of the UI.
		let oldrow=document.getElementById("uiselrow");
		if (oldrow) {oldrow.id="";}
		row.id="uiselrow";
		this.uistock0.innerText=creature.stock0.name;
		this.uistock1.innerText=creature.stock1.name;
		for (let i=2;i<9;i++) {
			let pick=(creature.choice>>>i)&1;
			if (!creature.limbarr[i]) {pick=2;}
			let pair=this.uiside[i];
			pair[0].style.backgroundColor=pick===0?"#ffa500":"#303030";
			pair[1].style.backgroundColor=pick===1?"#ffa500":"#303030";
		}
	}


	togglesort(col) {
		// Toggles the sorting order if a column is clicked.
		this.sortord=this.sortcol===col?this.sortord^1:0;
		this.sortcol=col;
		this.displayresults();
	}


	displayresults() {
		// Create a new table and replace the old one.
		let colname=[
			"Left Stock",
			"Right Stock",
			"Level",
			"Power",
			"Coal",
			"Elec",
			"Eff",
			"Size",
			"HP",
			"E.HP",
			"Armour",
			"Build",
			"Sight",
			"Land Speed",
			"Water Speed",
			"Air Speed",
			"Melee Dmg",
			"Range 1 Dmg",
			"Range 1 Dist",
			"Range 2 Dmg",
			"Range 2 Dist",
			"Abilities"
		];
		let columns=colname.length;
		// Map the column to a creature attribute.
		function colattr(c,col) {
			let v=null,a=null;
			switch (col) {
				case 0:v=c.stock0.name;break;
				case 1:v=c.stock1.name;break;
				case 2:v=c.creature_rank;break;
				case 3:v=c.power;break;
				case 4:v=c.coal;break;
				case 5:v=c.electricity;break;
				case 6:v=c.calcefficiency();break;
				case 7:v=c.size;break;
				case 8:v=c.hitpoints;break;
				case 9:v=c.ehp;break;
				case 10:v=c.armour;break;
				case 11:v=c.constructionticks;break;
				case 12:v=c.sight_radius;break;
				case 13:v=c.landspeed;break;
				case 14:v=c.waterspeed;break;
				case 15:v=c.airspeed;break;
				case 16:v=c.melee_damage;break;
				case 17:a=c.rangearr[0];v=a?a.damage:0;break;
				case 18:a=c.rangearr[0];v=a?a.max   :0;break;
				case 19:a=c.rangearr[1];v=a?a.damage:0;break;
				case 20:a=c.rangearr[1];v=a?a.max   :0;break;
				case 21:
					a=[];
					if (c.pack_hunter) {a.push("pack");}
					if (c.herding) {a.push("herd");}
					if (c.loner) {a.push("loner");}
					if (c.AutoDefense) {a.push("quill spray");}
					if (c.poison_bite || c.poison_sting || c.poison_pincers || c.poison_sting) {a.push("poison melee");}
					if (c.poison_touch) {a.push("poison touch");}
					if (c.leap_attack) {a.push("leap");}
					if (c.charge_attack) {a.push("charge");}
					if (c.is_stealthy) {a.push("camo");}
					if (c.is_immune) {a.push("immunity");}
					if (c.regeneration) {a.push("regen");}
					if (c.deflection_armour) {a.push("deflect");}
					if (c.keen_sense) {a.push("keen sense");}
					if (c.stink_attack || c.stink) {a.push("stink");}
					if (c.electric_burst) {a.push("electric burst");}
					if (c.frenzy_attack) {a.push("frenzy");}
					if (c.plague_attack) {a.push("plague");}
					if (c.quill_burst) {a.push("quill burst");}
					if (c.web_throw) {a.push("web throw");}
					if (c.assassinate) {a.push("assassinate");}
					if (c.flash ||c.headflashdisplay) {a.push("flash");}
					if (c.infestation) {a.push("infest");}
					if (c.can_dig) {a.push("dig");}
					if (c.can_SRF) {a.push("hover");}
					if (c.soiled_land) {a.push("soil land");}
					if (c.sonar_pulse) {a.push("sonar");}
					v=a.sort().join(", ");
					break;
				default:
					v=NaN;
			}
			return v;
		}
		let tbl=document.createElement("table");
		let state=this;
		// Create header row and make them clickable.
		let sortcol=this.sortcol;
		let arrow="&nbsp;"+(this.sortord?"&#8593;":"&#8595;");
		let tr=tbl.insertRow();
		for (let i=0;i<columns;i++) {
			let td=tr.insertCell();
			let name=colname[i];
			if (i===sortcol) {name+=arrow;}
			td.innerHTML=name;
			td.onclick=function() {state.togglesort(i);};
			if (i<2) {td.style.minWidth="13em";}
		}
		// Find the sorting element.
		// Store the attribute in creature.sort for faster sorting.
		let results=this.results;
		for (let c of results) {c.sort=colattr(c,sortcol);}
		let sortasc=function (l,r) {return l.sort<r.sort?-1:1;};
		let sortdes=function (l,r) {return l.sort>r.sort?-1:1;};
		results.sort(this.sortord?sortasc:sortdes);
		// Add creatures to table.
		let count=Math.min(this.maxdisplay,results.length);
		for (let i=0;i<count;i++) {
			let c=results[i];
			tr=tbl.insertRow();
			tr.onclick=function() {state.setrow(this,c);};
			for (let j=0;j<columns;j++) {
				let v=colattr(c,j);
				if (v.length!==undefined) {v=v.replace(/ /g,"&nbsp;");}
				else {v=v.toFixed(2).replace(/\.00$/,'');}
				tr.insertCell().innerHTML=v;
			}
		}
		this.uioutput.replaceChildren(tbl);
	}


	run() {
		let icd=this.icd;
		if (icd.loading) {
			console.log("loading");
			return;
		}
		let time=performance.now();
		let results=[];
		for (let creature of icd.itercreatures()) {
			results.push(creature);
		}
		this.results=results;
		this.displayresults();
		time=(performance.now()-time)/1000;
		this.uicount.innerText=`Found ${results.length} combinations in ${time.toFixed(3)} seconds`;
	}

}

new UI();

