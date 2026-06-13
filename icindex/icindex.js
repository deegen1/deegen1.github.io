/*------------------------------------------------------------------------------


icindex.js - v1.04

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


dmgtype flags
	 0: regular
	 1: poison
	 2: horn (perforate)
	 4: barrier destroy
	 8: electric (eel, cuttlefish)
	16: sonic (glue)


Basic Equations:
	out_size     = max(left_size,right_size)
	out_damage   = damage*((out_size/size)^exp_damage)
	out_armor    = armor*((out_size/size)^exp_armor)
	effective_hp = health/(1-armor)
	dps          = damage


SRF = short range flying = hovering

melee_rate and damage_rate only affect animation speed.


--------------------------------------------------------------------------------
History


1.00
     Created to simplify IC Combiner (github.com/ddelamare/IC-Combiner).
     Can load stock lua files and not do much else.
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
1.03
     Added ability filtering.
     Fixed a bug with removing comments from lua files.
     Lua files are now bundled in a tar.gz file, and added a tar.gz parser.
     Ranged damage is no longer rounded down, unlike melee. Confirmed in IC.
     Limbs are flagged if they're selectable. This can be overridden.
1.04
     Merged melee and range damage types with abilities.


--------------------------------------------------------------------------------
TODO


efficiency
	To win we need to deal damage.
	The longer we live, the more damage we can deal.
	The more damage we deal per cost, the more efficient.
	If poison: dps+=level
	if regen:
		[5,15,20,25,45]
		lifetime=hp/(level*5+5)
		hp+=level*lifetime
	sonic: dps*=2
	if immune: hp*=1.05
	eff=lifetime*damage/(coal+elec+build*0.1)

Calculate weighted stats based on top 10% NER.
See what stocks rate as most efficient.


*/
/* npx eslint icindex.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Globals


import * as MOD_ICP from "./mod_icp.js";
// import * as MOD_TEL from "./mod_tel.js";
// import * as MOD_INS from "./mod_ins.js";
// import * as MOD_IC  from "./mod_ic.js";

// Damage types
//const DT_REGULAR =0
const DT_POISON  =1;
const DT_HORN    =2;
const DT_BARRIER =4;
const DT_ELECTRIC=8;
const DT_SONIC   =16;

const Abilities=[
	{name:"overpopulation",attr:"overpopulation",mask:1},
	{name:"shell",attr:"shell",mask:1},
	{name:"bipedal",attr:"bipedal",mask:1},
	// Melee
	{name:"poison (melee)",attr:"melee_dmgtype",mask:DT_POISON},
	{name:"horns",attr:"melee_dmgtype",mask:DT_HORN},
	{name:"barrier destroy",attr:"melee_dmgtype",mask:DT_BARRIER},
	// Range
	{name:"poison (range)",attr:"range_dmgtype",mask:DT_POISON},
	{name:"piercing",attr:"range_dmgtype",mask:DT_HORN},
	{name:"electric",attr:"range_dmgtype",mask:DT_ELECTRIC},
	{name:"sonic",attr:"range_dmgtype",mask:DT_SONIC},
	//{name:"piercing",attr:"ranged_piercing",mask:1},
	{name:"artillery",attr:"range_special",mask:0xffffffff},
	// Group
	{name:"pack hunter",attr:"pack_hunter",mask:1},
	{name:"herding",attr:"herding",mask:1},
	{name:"loner",attr:"loner",mask:1},
	// Autonomous Abilities
	{name:"barbs",attr:"AutoDefense",mask:1},
	{name:"leap attack",attr:"leap_attack",mask:1},
	{name:"charge attack",attr:"charge_attack",mask:1},
	{name:"camouflage",attr:"is_stealthy",mask:1},
	{name:"immunity",attr:"is_immune",mask:1},
	{name:"regeneration",attr:"regeneration",mask:1},
	{name:"deflection",attr:"deflection_armour",mask:1},
	{name:"keen sense",attr:"keen_sense",mask:1},
	// Activated Abilities
	{name:"stink attack",attr:"stink_attack",mask:1},
	//{name:"stink attack",attr:"stink",mask:1},
	{name:"electric burst",attr:"electric_burst",mask:1},
	{name:"frenzy",attr:"frenzy_attack",mask:1},
	{name:"plague",attr:"plague_attack",mask:1},
	{name:"quill burst",attr:"quill_burst",mask:1},
	{name:"web throw",attr:"web_throw",mask:1},
	{name:"assassinate",attr:"assassinate",mask:1},
	{name:"flash",attr:"flash",mask:1},
	{name:"flash (head)",attr:"headflashdisplay",mask:1},
	{name:"fly",attr:"fly",mask:1},
	{name:"infestation",attr:"infestation",mask:1},
	{name:"dig",attr:"can_dig",mask:1},
	{name:"hover",attr:"can_SRF",mask:1},
	{name:"defile land",attr:"soiled_land",mask:1},
	{name:"sonar pulse",attr:"sonar_pulse",mask:1}
];


//---------------------------------------------------------------------------------
// Helper Functions


function OpenTarGZ(path,callback) {
	// Opens and parses a .tar.gz file.
	// Async loading of the initial gzip data.
	fetch(path)
	.then(res=>{
		if (!res.ok) {throw "Could not open "+res.url;}
		return res.blob();
	})
	.then(blob=>{
		let dec=blob.stream().pipeThrough(new DecompressionStream("gzip"));
		return new Response(dec).blob();
	})
	.then(dec=>{
		return dec.arrayBuffer();
	})
	.then(buf=>{
		ParseTar(new Uint8Array(buf),callback);
	});
}


function ParseTar(data,callback) {
	// Read .tar data and return a list of files.
	// https://www.gnu.org/software/tar/manual/html_node/Standard.html
	function readstring(i,len) {
		let s="",c=0,stop=i+len;
		while (i<stop && (c=data[i])) {s+=String.fromCharCode(c);i++;}
		return s;
	}
	function readoctal(i,len) {
		let val=0,stop=i+len;
		while (i<stop) {let c=data[i++]-48;if (c>=0 && c<8) {val=(val*8)+c;}}
		return val;
	}
	const BLOCK=512;
	let files=[],filemap={};
	let idx=0,stop=data.byteLength-BLOCK;
	while (idx<=stop) {
		if (idx+BLOCK>stop) {throw `tar too small: ${idx}, ${stop}`;}
		// Read short names.
		let name=readstring(idx,100);
		if (!name.length) {break;}
		// If the name is too long, read first half.
		let pref=readstring(idx+345,100);
		if (pref.length) {name=pref+name;}
		name=name.replace(/\\/g,"/");
		let size=readoctal(idx+124,12);
		let type=readoctal(idx+156,1);
		if (type===0) {
			if (idx+size>stop) {throw `file too big: ${name}, ${size}`;}
			let filedata=new Uint8Array(data.buffer,idx+BLOCK,size);
			filemap[name]=filedata;
			files.push({name:name,data:filedata});
		} else {
			if (size) {throw `directory not empty: ${name}, ${size}`;}
		}
		idx+=BLOCK+BLOCK*(~~((size+BLOCK-1)/BLOCK));
	}
	if (callback) {callback(files,filemap);}
}


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
		this.selectable=1;
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


	constructor(str,name,mod) {
		// Parses a lua file.
		// this.lua=str;
		this.name=name;
		let limbarr=(new Array(9)).fill(null);
		this.limbarr=limbarr;
		// Strip comments and remove spaces.
		str=str.replace(/--[^\n]*/g,"");
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
			let san=attr.replace(/-/g,"_");
			let error="";
			if (isNaN(id) || id<0 || id>8) {error="Limb ID";}
			if (isNaN(val) || val<=-Infinity || val>=Infinity) {error="Invalid value";}
			if (san.match(/(_front|front_)/) && id!==2) {error="Front ID";}
			if (san.match(/(_back|back_)/)   && id!==3) {error="Back ID";}
			if (san.match(/(_rear|rear_)/)   && id!==3) {error="Rear ID";}
			if (san.match(/(_head|head_)/)   && id!==4) {error="Head ID";}
			if (san.match(/(_tail|tail_)/)   && id!==5) {error="Tail ID";}
			if (san.match(/(_torso|torso_)/) && id!==6) {error="Torso ID";}
			if (san.match(/(_wings|wings_)/) && id!==7) {error="Wings ID";}
			// if ((!san.match(/\d/))!==(id===1)) {error="Global ID";}
			if (error) {
				console.log(error);
				console.log(attr,id,val);
				console.log(this);
				throw error;
			}
			// Account for every possible attribute.
			// Sanitize things like "armour[-head]" and "melee[N]_damage".
			// melee[N] takes priority over the limb it's assigned in {M,value}.
			san=san.replace(/_?(front|back|rear|head|tail|torso|wings)$/g,"");
			san=san.replace(/(front|back|rear|head|tail|torso|wings)_/g,"");
			if ((match=san.match(/(melee|range)(\d+)/))) {
				id=parseInt(match[2]);
			}
			san=san.replace(/\d/g,"");
			let ignore=[
				"speed_mid","exp_speed_mid",
				"melee_shortdesc","melee_longdesc","melee_name",
				"melee_rate", // animation speed
				"melee_number", // animation type?
				"range_shortdesc","range_longdesc","range_name","range_min","exp_range_min",
				"range_rate","exp_range_rate", // animation speed
				"range_number", // animation type?
				"vocal_type","Hide_type","actbeselect",
				"selection_sloppyness","boneblobshadow","simvis_occludee","singleselectonly",
				"foot_type","isvisible","fadeAndDeleteWhenDead","stayInPathfindingAfterDead",
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
		// Flag which limbs are selectable, including mod overrides.
		let mask=[0x1f8,0x1fc,0x1fc,0x1f0,0x1fc,0x1f0][type];
		mask=mod.SelectableOverride[name]??mask;
		for (let i=2;i<9;i++) {
			let l=limbarr[i];
			if (l) {l.selectable=(mask>>>i)&1;}
		}
	}

}


class Creature {

	constructor(stock0,stock1,choice) {
		// A lot of this function is derived from Kev's IC Combiner.
		// Allow limb choices to be an int or array.
		if (choice.length!==undefined) {
			if (choice.length!==7) {throw "too many choices";}
			let flag=0;
			for (let i=0;i<7;i++) {flag|=(choice[i]?4:0)<<i;}
			choice=flag;
		}
		// Select limbs. Filter out impossible combinations.
		let valid=true;
		if ((choice&3) || (choice && Object.is(stock0,stock1))) {valid=false;}
		let torso=(choice>>>6)&1;
		let limb0=stock0.limbarr,limb1=stock1.limbarr;
		let limbarr=new Array(9);
		for (let i=0;i<9 && valid;i++) {
			let side=(choice>>>i)&1;
			let l0=limb0[i],l1=limb1[i],l=side?l1:l0;
			limbarr[i]=l;
			if (side!==torso) {
				// If the opposite limb can't be selected, go with the torso's.
				if (!l || !l.selectable) {valid=false;}
			}
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
		this.range_dmgtype=0;
		this.ranged_piercing=0;
		this.range_special=0;
		this.range_damage=0;
		// this.range_max=0;
		this.rangearr=[];
		// Group
		this.pack_hunter=0;
		this.herding=0;
		this.loner=0;
		// Triggered Abilities
		// this.trigger_number=0;
		// this.trigger_type=0;
		// this.trigger_rate=0;
		// this.trigger_contact=0;
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
			// console.log(limb.name,limb.stock.name);
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
				let damage=calcexp(limb.range_damage,limb.exp_range_damage);
				this.rangearr.push({
					damage:damage,
					dmgtype:limb.range_dmgtype,
					max:calcexp(limb.range_max,limb.exp_range_max),
					special:limb.range_special
				});
				this.range_dmgtype|=limb.range_dmgtype;
				this.range_special|=limb.range_special;
				this.range_damage+=damage;
				this.range_piercing|=limb.range_piercing;
			}
			// Group
			this.pack_hunter|=limb.pack_hunter;
			this.herding|=limb.herding;
			this.loner|=limb.loner;
			// Triggered Abilities
			// this.trigger_number=0;
			// this.trigger_type=0;
			// this.trigger_rate=0;
			// this.trigger_contact=0;
			// Autonomous Abilities
			this.AutoDefense|=limb.AutoDefense;
			this.poison_bite|=limb.poison_bite;
			this.poison_touch|=limb.poison_touch;
			this.poison_sting|=limb.poison_sting;
			this.poison_pincers|=limb.poison_pincers;
			this.leap_attack|=limb.leap_attack;
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
		// If we're a water stock, check if we have enough limbs for land speed.
		if (limbarr[3].speed_max<=0 || (limbarr[2].speed_max<=0 && !limbarr[3].bipedal)) {
			this.landspeed=0;
		}
	}


	calcefficiency() {
		// Nandid efficiency rating
		let damage=0;
		for (let r of this.rangearr) {damage=Math.max(damage,r.damage);}
		if (damage<=0) {damage=this.melee_damage;}
		return this.ehp*damage/(this.coal+this.electricity);
	}


	calcefficiency2() {
		let dps=0;
		for (let range of this.rangearr) {dps=Math.max(dps,range.damage);}
		if (dps<=0) {dps=this.melee_damage;}
		let hp=this.hitpoints,armour=this.armour;
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
		OpenTarGZ(mod.DataPath,(files,filemap)=>{
			let id=0;
			for (let [path,name] of mod.StockFiles) {
				let data=filemap[path];
				if (!data) {throw `${path} not found`;}
				let text=(new TextDecoder()).decode(data);
				let stock=new Stock(text,name,mod);
				state.stockarr[id++]=stock;
				state.stockmap[name]=stock;
				// console.log(stock);
				state.loading--;
			}
		});
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
			// console.log("combos:",fill);
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
		this.maxdisplay=100;
		this.sortcol=3;
		this.sortord=0;
		this.uiclear=document.getElementById("uiclear");
		this.uiclear.onclick=function() {state.clearfilter();};
		let sortability=Abilities.toSorted((l,r)=>{return l.name<r.name?-1:1;});
		this.filters=[
			{name:"Abilities"   ,type:"list" ,arr:sortability},
			{name:"Air Speed"   ,type:"range",min:0,max:50 ,func:function(c){return c.airspeed;}},
			{name:"Armour"      ,type:"range",min:0,max:0.6 ,func:function(c){return c.armour;}},
			{name:"Build Time"  ,type:"range",min:0,max:600,func:function(c){return c.constructionticks;}},
			{name:"Efficiency"  ,type:"range",min:0,max:160 ,func:function(c){return c.calcefficiency();}},
			{name:"Effective HP",type:"range",min:0,max:3000,func:function(c){return c.ehp;}},
			{name:"Hitpoints"   ,type:"range",min:0,max:2000,func:function(c){return c.hitpoints;}},
			{name:"Land Speed"  ,type:"range",min:0,max:50 ,func:function(c){return c.landspeed;}},
			{name:"Level"       ,type:"range",min:1,max:5   ,func:function(c){return c.creature_rank;}},
			{name:"Melee Damage",type:"range",min:0,max:100 ,func:function(c){return c.melee_damage;}},
			{name:"Power"       ,type:"range",min:0,max:1500,func:function(c){return c.power;}},
			{name:"Range Damage",type:"range",min:0,max:100,func:function(c){let m=0;for (let l of c.rangearr) {m=Math.max(m,l.damage);};return m;}},
			{name:"Range Dist"  ,type:"range",min:0,max:80 ,func:function(c){let m=0;for (let l of c.rangearr) {m=Math.max(m,l.max);};return m;}},
			{name:"Stock"       ,type:"list" ,arr:[]},
			{name:"Water Speed" ,type:"range",min:0,max:50 ,func:function(c){return c.waterspeed;}}
		];
		this.uifiltable=document.getElementById("uifiltertable");
		this.uifillist=document.getElementById("uifilterlist");
		for (let i=0;i<this.filters.length;i++) {
			let f=this.filters[i];
			f.id=i;
			f.row=null;
			let opt=new Option(f.name,f.id);
			this.uifillist.add(opt);
		}
		this.uifillist.onchange=function() {state.addfilter();};
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
			this.selrow=null;
			this.results=[];
			this.clearfilter();
			// Stock filter is configured here, after loading the mod.
			let stockarr=[];
			for (let s of mod.StockFiles) {stockarr.push({name:s[1],attr:"name"});}
			for (let f of this.filters) {if (f.name==="Stock") {f.arr=stockarr.sort();}}
			this.displayresults();
		}
	}


	clearfilter(id=-1) {
		// Remove a filter from the table and add to the dropdown.
		let filters=this.filters;
		let idmin=id,idmax=id+1;
		if (id<0) {idmin=0;idmax=filters.length;}
		for (id=idmin;id<idmax;id++) {
			let f=this.filters[id];
			// Remove from table.
			if (f.row) {
				f.row.remove();
				f.row=null;
			}
			// Add to dropdown.
			if (f.opt) {
				f.opt.hidden=false;
				f.opt=null;
			}
		}
	}


	addfilter() {
		let list=this.uifillist;
		let opt=list.selectedOptions[0];
		let val=parseInt(opt.value);
		if (val===-1) {return;}
		let state=this;
		// Remove the option and reset the default.
		opt.hidden=true;
		list.value="-1";
		// Add to the table.
		let f=this.filters[val];
		let tr=this.uifiltable.insertRow(1);
		f.row=tr;
		f.opt=opt;
		// Remove button.
		let td=tr.insertCell();
		let rem=document.createElement("button");
		rem.innerText="Remove";
		rem.onclick=function() {state.clearfilter(f.id);};
		td.appendChild(rem);
		// Filter settings.
		td=tr.insertCell();
		td.innerText=f.name;
		if (f.type==="range") {
			// Filters with a range, ex: level betwen 1 and 2.
			for (let i=0;i<2;i++) {
				td.insertAdjacentText("beforeend",[" between "," and "][i]);
				let inp=document.createElement("input");
				inp.type="text";
				inp.value=[f.min,f.max][i];
				inp.classList.add("uiinput");
				td.appendChild(inp);
				if (i) {f.maxelem=inp;} else {f.minelem=inp;}
			}
		} else {
			// Filters with a list, ex: stocks.
			f.mode=0;
			f.sel={};
			td.insertAdjacentText("beforeend"," has ");
			let inp=document.createElement("a");
			inp.innerText="all";
			inp.href="#";
			inp.onclick=function() {f.mode^=1;this.innerText=f.mode?"any":"all";};
			td.appendChild(inp);
			td.insertAdjacentText("beforeend"," of ");
			list=document.createElement("select");
			let id=0;
			for (let v of f.arr) {
				opt=new Option(v.name,id++);
				list.add(opt);
			}
			list.value=null;
			list.onchange=function() {state.addlist(this,f);};
			td.appendChild(list);
		}
	}


	addlist(list,fil) {
		// When an item is selected from stocks, abilities, or damage types.
		let opt=list.selectedOptions[0];
		let id=parseInt(opt.value);
		let val=fil.arr[id];
		fil.sel[id]=val;
		opt.hidden=true;
		list.value=null;
		let but=document.createElement("a");
		but.innerText="[x] "+val.name+" ";
		but.href="#";
		but.onclick=function() {
			// Remove a selected item from a filter.
			delete fil.sel[id];
			opt.hidden=false;
			but.remove();
		};
		list.parentNode.appendChild(but);
	}


	setrow(row,creature) {
		// Update creature attributes in the upper-right of the UI.
		if (this.selrow) {this.selrow.id="";}
		this.selrow=row;
		row.id="uiselrow";
		//console.log("selected:",creature);
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
		// Map each column to a creature attribute.
		function abilitystr(c) {
			let r=new Set();
			for (let a of Abilities) {
				if (c[a.attr]&a.mask) {r.add(a.name);}
			}
			return Array.from(r.keys()).sort().join(", ");
		}
		let colattr=[
			{name:"Left Stock"  ,func:function(c){return c.stock0.name;}},
			{name:"Right Stock" ,func:function(c){return c.stock1.name;}},
			{name:"Level"       ,func:function(c){return c.creature_rank;}},
			{name:"Power"       ,func:function(c){return c.power;}},
			{name:"Coal"        ,func:function(c){return c.coal;}},
			{name:"Elec"        ,func:function(c){return c.electricity;}},
			{name:"Eff"         ,func:function(c){return c.calcefficiency();}},
			{name:"Size"        ,func:function(c){return c.size;}},
			{name:"HP"          ,func:function(c){return c.hitpoints;}},
			{name:"E.HP"        ,func:function(c){return c.ehp;}},
			{name:"Armour"      ,func:function(c){return c.armour;}},
			{name:"Build"       ,func:function(c){return c.constructionticks;}},
			{name:"Sight"       ,func:function(c){return c.sight_radius;}},
			{name:"Land Speed"  ,func:function(c){return c.landspeed;}},
			{name:"Water Speed" ,func:function(c){return c.waterspeed;}},
			{name:"Air Speed"   ,func:function(c){return c.airspeed;}},
			{name:"Melee Dmg"   ,func:function(c){return c.melee_damage;}},
			{name:"Range 1 Dmg" ,func:function(c){let a=c.rangearr[0];return a?a.damage:0;}},
			{name:"Range 1 Dist",func:function(c){let a=c.rangearr[0];return a?a.max:0;}},
			{name:"Range 2 Dmg" ,func:function(c){let a=c.rangearr[1];return a?a.damage:0;}},
			{name:"Range 2 Dist",func:function(c){let a=c.rangearr[1];return a?a.max:0;}},
			{name:"Abilities"   ,func:abilitystr}
		];
		let columns=colattr.length;
		// Create a new table and replace the old one.
		let tbl=document.createElement("table");
		let state=this;
		// Create header columns and make them clickable.
		let sortcol=this.sortcol;
		let arrow="&nbsp;"+(this.sortord?"&#9650;":"&#9660;");
		let tr=tbl.insertRow();
		for (let i=0;i<columns;i++) {
			let td=tr.insertCell();
			let name=colattr[i].name;
			if (i===sortcol) {name+=arrow;}
			td.innerHTML=name;
			td.onclick=function() {state.togglesort(i);};
		}
		// Find the sorting element.
		// Store the attribute in creature.sort for faster sorting.
		let results=this.results;
		let func=colattr[sortcol].func;
		for (let c of results) {c.sort=func(c);}
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
				let v=colattr[j].func(c);
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
		// Get the current active filters and estimate how many creatures they reject.
		let active=[];
		for (let f of this.filters) {
			if (!f.row) {continue;}
			let prob=1;
			if (f.type==="range") {
				// Extract user values and estimate how much we're filtering results.
				let min=parseFloat(f.minelem.value);
				min=isNaN(min)?-Infinity:min;
				f.minval=min;
				let max=parseFloat(f.maxelem.value);
				max=isNaN(max)?Infinity:max;
				f.maxval=max;
				prob=(Math.min(max,f.max)-Math.max(min,f.min))/(f.max-f.min);
			} else {
				let p=1/f.arr.length,n=Object.values(f.sel).length;
				if (f.mode) {prob=p*n;} else {prob=Math.pow(p,n);}
			}
			f.sort=prob>0?prob:0;
			active.push(f);
		}
		// Apply filters from most rejections to least.
		active.sort((l,r)=>{return l.sort-r.sort;});
		let rlen=results.length;
		for (let f of active) {
			let func=f.func;
			let nlen=0;
			if (func) {
				// Filter attributes with ranges.
				let min=f.minval,max=f.maxval;
				for (let i=0;i<rlen;i++) {
					let c=results[i];
					let v=func(c);
					if (min<=v && v<=max) {results[nlen++]=c;}
				}
			} else if (f.name==="Stock") {
				// Filter stock names.
				let stockmap={},arr=f.arr,sel=Object.values(f.sel);
				for (let a of arr) {stockmap[a.name]=0;}
				for (let a of sel) {stockmap[a.name]=1;}
				let min=f.mode?1:sel.length;
				for (let i=0;i<rlen;i++) {
					let c=results[i];
					let v=stockmap[c.stock0.name]+stockmap[c.stock1.name];
					if (v>=min) {results[nlen++]=c;}
				}
			} else {
				// Filter abilities with flags
				let sel=Object.values(f.sel);
				let min=f.mode?1:sel.length;
				for (let i=0;i<rlen;i++) {
					let c=results[i],v=0;
					for (let a of sel) {v+=(c[a.attr]&a.mask)?1:0;}
					if (v>=min) {results[nlen++]=c;}
				}
			}
			rlen=nlen;
		}
		if (rlen<results.length) {results=results.slice(0,rlen);}
		this.results=results;
		this.displayresults();
		time=(performance.now()-time)/1000;
		this.uicount.innerText=`Found ${results.length} combinations in ${time.toFixed(3)} seconds`;
	}

}

new UI();

