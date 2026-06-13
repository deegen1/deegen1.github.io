/*------------------------------------------------------------------------------


JS translation of lua files.

IC Paradise v1.1


--------------------------------------------------------------------------------
Notes


Attr(name) calls are translated to creature.name.

Regex sanitization strings to help convert lua files. Apply in order.


            Regex       |    Replace
     -------------------+---------------
      '--[ -]*'         |  '// '
      '(\n|\t) {4}'     |  '\1\t'
      '( \t|\t )'       |  '     '
      '([^=])==([^=])'  |  '\1===\2'
      ' *=== *'         |  '==='
      'Attr\(\s*"(.*?)"\s*\)' |  'c.\1'
      'setattribute\(\s*"(.*?)"\s*,\s*(.*)\s*\)'  |  'c.\1=\2'
      '([^\.])min\('    |  '\1Math.min('
      '([^\.])max\('    |  '\1Math.max('
      '\{'              |  '['
      '\}'              |  ']'
      '\) +then'        |  ') {'
      'elseif'          |  'else if'
      '_radius1'        |  '_radius'
      'airspeed_max'    |  'airspeed'
      'waterspeed_max'  |  'waterspeed'
      'speed_max'       |  'landspeed'
      'underpopulation' |  'poplow'
      '\.Power'         |  '.power'
      '[ \r\t]+c\.melee_discount_tag =.*?\n'  | ''
      '[ \r\t]+\n'      |  '\n'


To check for lua array padding: \[[^P]


--------------------------------------------------------------------------------
TODO


Add _ to attrcombiner-only variables. Ex: c.power -> c._power.


*/
/* npx eslint mod_icp.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Globals


export const Name="IC Paradise (1.1)";

export const Description="Fork of Tellurian, <a href='https://discord.gg/XZyTr3GkY'>ICP Discord</a>, <a href='https://www.youtube.com/@ImpossibleCreaturesParadise'>ICP Youtube</a>";

export const DataPath="./data_icp.tar.gz";

export const StockFiles=[
	// [File, Display Name]
	["albatross.lua","Albatross"],
	["alligator.lua","Alligator"],
	["anaconda.lua","Anaconda"],
	["anglerfish.lua","Anglerfish"],
	["ankylosaurus.lua","Ankylosaurus"],
	["anomalocaris.lua","Anomalocaris"],
	["ant.lua","Ant"],
	["arapaima.lua","Arapaima"],
	["archelon.lua","Archelon"],
	["archerfish.lua","Archerfish"],
	["armadillo.lua","Armadillo"],
	["baboon.lua","Baboon"],
	["barracuda.lua","Barracuda"],
	["behemoth.lua","Behemoth"],
	["beluga.lua","Beluga"],
	["black_marlin.lua","Black Marlin"],
	["black_widow.lua","Black Widow"],
	["blue_ringed_octopus.lua","Blue Ringed Octopus"],
	["blue_tongued_skink.lua","Blue Tongued Skink"],
	["blue_whale.lua","Blue Whale"],
	["boa.lua","Boa Constrictor"],
	["bolas_spider.lua","Bolas Spider"],
	["bombardier_beetle.lua","Bombardier Beetle"],
	["brachiosaurus.lua","Brachiosaurus"],
	["brontosaurus.lua","Brontosaurus"],
	["bull.lua","Bull"],
	["camel.lua","Camel"],
	["cameroceras.lua","Cameroceras"],
	["carnotaurus.lua","Carnotaurus"],
	["chameleon.lua","Chameleon"],
	["cheetah.lua","Cheetah"],
	["chimpanzee.lua","Chimpanzee"],
	["cockroach.lua","Cockroach"],
	["colossal_squid.lua","Colossal Squid"],
	["condor.lua","Condor"],
	["coyote.lua","Coyote"],
	["crocodile.lua","Crocodile"],
	["cuttlefish.lua","Cuttlefish"],
	["diamond_python.lua","Diamond Python"],
	["dimetrodon.lua","Dimetrodon"],
	["dodo.lua","Dodo"],
	["dolphin.lua","Dolphin"],
	["dragonfly.lua","Dragonfly"],
	["dunkleosteus.lua","Dunkleosteus"],
	["eagle.lua","Eagle"],
	["elasmosaurus.lua","Elasmosaurus"],
	["electric_eel.lua","Electric Eel"],
	["elephant.lua","Elephant"],
	["fire_fly.lua","Fire Fly"],
	["garden_spider.lua","Garden Spider"],
	["garfish.lua","Garfish"],
	["gazelle.lua","Gazelle"],
	["giant_anteater.lua","Giant Anteater"],
	["giant_pacific_octopus.lua","Giant Pacific Octopus"],
	["giant_squid.lua","Giant Squid"],
	["giraffe.lua","Giraffe"],
	["gorilla.lua","Gorilla"],
	["great_white_shark.lua","Great White Shark"],
	["grizzly_bear.lua","Grizzly Bear"],
	["hammerhead_shark.lua","Hammerhead Shark"],
	["hatchetfish.lua","Hatchetfish"],
	["hercules_beetle.lua","Hercules Beetle"],
	["hippopotamus.lua","Hippopotamus"],
	["hornbill.lua","Hornbill"],
	["hornet.lua","Hornet"],
	["horse.lua","Horse"],
	["humpback_whale.lua","Humpback Whale"],
	["hyena.lua","Hyena"],
	["ichthyosaurus.lua","Ichthyosaurus"],
	["iguanodon.lua","Iguanodon"],
	["kangaroo.lua","Kangaroo"],
	["kentrosaurus.lua","Kentrosaurus"],
	["killer_whale.lua","Killer Whale"],
	["komodo_dragon.lua","Komodo Dragon"],
	["lammergeier.lua","Lammergeier"],
	["lemming.lua","Lemming"],
	["lion.lua","Lion"],
	["lioness.lua","Lioness"],
	["liopleurodon.lua","Liopleurodon"],
	["lobster.lua","Lobster"],
	["lufengosaurus.lua","Lufengosaurus"],
	["mantis_shrimp.lua","Mantis Shrimp"],
	["mole_rat.lua","Naked Mole Rat"],
	["moose.lua","Moose"],
	["mountain_lion.lua","Mountain Lion"],
	["musk_ox.lua","Musk Ox"],
	["narwhal.lua","Narwhal"],
	["oogpister.lua","Oogpister"],
	["ostrich.lua","Ostrich"],
	["pachycephalosaurus.lua","Pachycephalosaurus"],
	["panoplosaurus.lua","Panoplosaurus"],
	["panther.lua","Panther"],
	["parasaurolophus.lua","Parasaurolophus"],
	["piranha.lua","Piranha"],
	["pistol_shrimp.lua","Pistol Shrimp"],
	["plesiosaurus.lua","Plesiosaurus"],
	["poison_frog.lua","Poison Frog"],
	["polar_bear.lua","Polar Bear"],
	["porcupine.lua","Porcupine"],
	["postosuchus.lua","Postosuchus"],
	["praying_mantis.lua","Praying Mantis"],
	["pteranodon.lua","Pteranodon"],
	["ram.lua","Ram"],
	["rat.lua","Rat"],
	["rattlesnake.lua","Rattlesnake"],
	["raven.lua","Raven"],
	["rhinoceros.lua","Rhinoceros"],
	["salamander.lua","Salamander"],
	["scorpion.lua","Scorpion"],
	["sea_snake.lua","Sea Snake"],
	["siphonophore.lua","Man O' War"],
	["skipper_caterpillar.lua","Skipper Caterpillar"],
	["skunk.lua","Skunk"],
	["snail.lua","Snail"],
	["snapping_turtle.lua","Snapping Turtle"],
	// snow_leopard.lua
	["snowy_owl.lua","Snowy Owl"],
	["sperm_whale.lua","Sperm Whale"],
	["spider_wasp.lua","Wasp"],
	["spitting_cobra.lua","Spitting Cobra"],
	["spitting_spider.lua","Spitting Spider"],
	["stegosaurus.lua","Stegosaurus"],
	["stick_bug.lua","Walking Stick"],
	["stink_bug.lua","Shield Bug"],
	["styracosaurus.lua","Styracosaurus"],
	["t-rex.lua","Tyrannosaurus Rex"],
	["tapir.lua","Tapir"],
	["tarantula.lua","Tarantula"],
	["termite.lua","Termite"],
	["thylacine.lua","Thylacine"],
	["tiger.lua","Tiger"],
	["triceratops.lua","Triceratops"],
	["tuna.lua","Tuna"],
	["vampire_bat.lua","Bat"],
	["velociraptor.lua","Velociraptor"],
	["velvet_worm.lua","Velvet Worm"],
	["vulture.lua","Vulture"],
	["walrus.lua","Walrus"],
	["warthog.lua","Warthog"],
	["whale_shark.lua","Whale Shark"],
	["wild_dog.lua","Wild Dog"],
	["wobbegong.lua","Wobbegong"],
	["wolf.lua","Wolf"],
	["wolverine.lua","Wolverine"],
	["wombat.lua","Wombat"],
	["woodpecker.lua","Woodpecker"],
	["woolly_mammoth.lua","Woolly Mammoth"],
	["zebra.lua","Zebra"]
];

// Limb selection can deviate from the stock type and isn't defined in the lua
// files.
// front: 4, back: 8, head: 16, tail: 32, torso: 64, wings: 128, claws: 256
export const SelectableOverride={
	// Name, Select Mask
	"Carnotaurus": 0x078,
	//"Dodo"       : 0x078,
	"Ostrich"    : 0x07c,
	"Man O' War" : 0x170,
	"Tyrannosaurus Rex": 0x078,
	"Walrus"     : 0x070
};


//---------------------------------------------------------------------------------
// attr_functions.lua


function Calculate_sum(h, b) {
	let sum = 0;
	let increment = 0.01;
	for (let i=1;i<=h-b;i++) {
		sum = sum + increment;
		increment = increment + 0.01;
		if (increment > 0.7) {
			increment = 0.7;
		}
	}
	return sum;
}

// Find where x falls in the array of ranges.
function Rank(x, rank_upper_bounds ) {
	let  i = 1;
	while (rank_upper_bounds[i]) {
		if (x <= rank_upper_bounds[i]) {
			return i;
		}
		i = i + 1;
	}
	return i;
}

// power equation
function Power(ehp_in, damage_in, rank_in) {
	rank_in = rank_in ?? 0;
	if (rank_in===0) {
		return Math.pow(ehp_in,0.610)*((0.20*damage_in) + 2.8);
	}
	return Math.pow(ehp_in,0.610)*((0.20*damage_in) + 2.8)+Math.pow(ehp_in,(0.6+((0.16- (0.03 * rank_in))*rank_in)))/rank_in + Calculate_sum(ehp_in, (rank_in) * 125 );
}


function ShapeValueCurve(c, x_domain, y_domain, x0y0, x1y0, x0y1, x1y1) {
	let x_name=x_domain[2],y_name=y_domain[2];
	if (x_name==="null" && y_name==="null") {
		return x0y0;
	}

	let x_max=x_domain[1],y_max=y_domain[1];
	let x_val=c[x_name]  ,y_val=c[y_name];
	if (x_val===undefined || y_val===undefined) {
		throw "unknown attr: "+x_name+", "+y_name;
	}
	// Shape factor is the amount by which the result is increased or decreased due to synergy between the x and y values.
	let shape_factor = (x_val * y_val * (x1y1 - x1y0 - x0y1)) / (x_max * y_max);

	return (
		shape_factor
		+ ((x1y0 - x0y0) / x_max) * x_val // This is the contribution to the final value from the x domain value.
		+ ((x0y1 - x0y0) / y_max) * y_val // This is the contribution to the final value from the y domain value.
		+ x0y0 + ((x_val * y_val * x0y0) / (x_max * y_max)) // This offsets the value based on x0y0.
	);
}


//---------------------------------------------------------------------------------
// attrcombiner.lua


export function AttrCombiner(creature) {

	const c=creature;
	c.is_land=c.landspeed>0?1:0;
	c.is_swimmer=c.waterspeed>0?1:0;
	if (c.airspeed>0) {
		c.is_flyer=1;
		c.is_land=0;
		c.is_swimmer=0;
	} else {
		c.is_flyer=0;
	}

	// Used to denote where we intentionally offset lua arrays.
	const PAD=null;

	// attr_functions.lua
	c["null"]=1;

	// ----------------------------------------
	// Constant Tables
	// ----------------------------------------

	// Ranking Constants
	// Table of maximum power thresholds, base coal costs and cost exponents for each
	// level.
	// Table is defined here, but only used in the costs section towards the bottom of
	// Attrcombiner.
	// [max power, base coal cost, cost_exponent]
	let max_pow = 1;
	let base_coal_cost = 2;
	let cost_exponent = 3;
	// NOTE: The lower the cost exponent, the more expensive spam becomes and the
	// cheaper power becomes.

	let RankTable = [PAD,
		[PAD,60,    60,     1   ],   // L1
		[PAD,120,   100,    1   ],   // L2
		[PAD,230,   170,    0.8 ],   // L3
		[PAD,400,   240,    0.8 ],   // L4
		[PAD,1000,  410,    0.75]    // L5
	];

	// Just some candy; this table is only ever used during the final elec cost scaling
	// to associate damagetypes with strings for display in combotest.
	let DTStringTable = [PAD,
		[PAD,1, "DT_Poison"],
		[PAD,2, "DT_Horns"],
		[PAD,4, "DT_Barrier_Destroy"],
		[PAD,8, "DT_Electric"],
		[PAD,16, "DT_Sonic"],
		[PAD,4096, "DT_Ranged_Poison"],
	];

	let dt_number = 1;
	let dt_string = 2;

	// ----------------------------------------
	// Tweakables
	// ----------------------------------------

	// This section contains some handy parameters for easy tweaking.

	// Multipliers on ranged attack costs.
	// original 1.1
	let ranged_coal_cost_mult       = 1.27;
	// edit flag orginal : 1.5
	let direct_range_elec_mult      = 2.0;
	let sonic_elec_mult             = 1.4;
	let flying_artillery_elec_mult  = 1.5;
	let range_pack_hunter_mult      = 1.42;
	let artillery_targets_hit       = 1;

	// The below multipliers apply a factor to various parameters if the unit is a
	// flyer; they're only used for cost calculations, not power.
	let damage_flyer_mult   = 1.15;
	let ehp_flyer_mult      = 1.15;
	let mobility_flyer_mult = 1.5;

	// Define Limits for some variables
	let max_armour           = 0.60; // redifined in following section
	let min_sight            = 25;
	let max_sight            = 50;
	let max_flyer_range_dist = 24;
	let min_landspeed        = 18;
	let min_waterspeed       = 18;
	let min_airspeed         = 16;
	let min_build_time       = 16;
	let flyer_min_build_time = 50;

	// Variables that inform the shape of the mobility cost curve (ONLY cost, not
	// mobility itself).
	let mobility_divisor = 25;
	let mobility_exp = 0.4;
	let flyer_mobility_exp = 0.35;

	// Sight cost.
	let sight_cost_multiplier = 0.5;

	// A rebate for defense; you only pay for this much of your defense.
	let defense_cost_multiplier = 0.9;

	// These variables are grabbed from tuning!
	let PackBonus_basedefensemodifier = 1.3;
	let herding_def_multiplier = PackBonus_basedefensemodifier; // I know this says pack but it's herding

	// ----------------------------------------
	// defense
	// ----------------------------------------

	// removing abilites that shouldn't go with shell
	if (c.shell===1) {
		c.herding = 0;
		c.regeneration = 0;
	}

	// counts the body parts with hardened
	let hardened_count = c.hardened;
	// let hardened_bonus = [PAD,0,0.01,0.03,0.09,0.27,0.81];
	let shell          = Math.max(0, c.shell);
	max_armour         = 0.60 + shell/10 + (hardened_count -1 )/100;
	c.armour = c.armour + (shell / 10) + (Math.pow(3,hardened_count)/3)/100;
	c.armour = Math.min(c.armour, max_armour);

	// ----------------------------------------
	// Attributes
	// ----------------------------------------

	// Mobility attributes:
	let has_flying = c.is_flyer;
	let has_swim   = c.is_swimmer;
	let has_land   = c.is_land;

	// Set Limits // flag
	// c.armour = Math.min(c.armour, max_armour); defined in prior section
	c.sight_radius = Math.min(Math.max(c.sight_radius, min_sight), max_sight);

	if (has_land===0 && has_swim===0 && has_flying===0) {
		has_land = 1;
	}

	if (has_land===1) {
		c.landspeed = Math.max(c.landspeed, min_landspeed);
	}

	if (has_swim===1) {
		c.waterspeed = Math.max(c.waterspeed, min_waterspeed);
	}

	if (has_flying===1) {
		c.airspeed = Math.max(c.airspeed, min_airspeed);
	}

	let ehp_flyer_factor = has_flying===1?ehp_flyer_mult:1;
	let damage_flyer_factor = has_flying===1?damage_flyer_mult:1;
	let mobility_flyer_factor = has_flying===1?mobility_flyer_mult:1;

	// Create derived attributes:
	c.ehp = c.hitpoints/(1-c.armour); // Effective HP, a measure of HP and defense. Doesn't account for flyer bonus.
	c.cost_ehp = c.ehp * ehp_flyer_factor; // EHP with flyer bonus accounted for.
	c.scaling_size = c.size;  // For creatures over size 9, this is their size as displayed in army builder.
	c.range_damage = 0;   // The maximum damage dealt by all of the creature's ranged attacks.
	c.range_distance = 0;  // The ranged attack distance of the unit.
	c.range_damage_distance = 0; // An equivalent melee damage based on a creature's ranged attack attributes.
	c.mixed_dps = 0;       // An equivalent melee damage based on all of a creature's attack attributes.
	c.mobility = 0;        // An equivalent land speed based on all of a creature's speed attributes.
	c.power_rank = 0;      // The rank of the creature based on power alone.
	c.effective_melee = c.melee_damage * damage_flyer_factor; // Melee damage, multiplied by a flyer-specific factor, used for cost calcs.

	// Let's calculate the extra EHP we receive from herding here, and store it as an
	// attribute. We'll build a domain from it later.
	c.herding_ehp_bonus = 0;

	if (c.herding===1) {
		let extraArmour = (c.armour*(herding_def_multiplier - 1));
		let armourOverCap = Math.max(0, (c.armour + extraArmour) - max_armour);
		let cappedExtraArmour = extraArmour - armourOverCap;
		c.herding_ehp_bonus = ( (c.hitpoints * ehp_flyer_factor )/(1-(c.armour + cappedExtraArmour))) - c.cost_ehp ;
	}

	let cost_coal = 0;
	let cost_elec = 0;

	// Ranged attributes:
	// These will be set to flag if the creature has any direct or any artillery range
	// attack.
	let has_range = null;
	let has_direct = null;
	let has_sonic = null;
	c.has_artillery = 0;
	c.artillery_damage = 0; // Added - Dee

	// let BodyPartsThatCanHaveRange = [PAD, 2, 3, 4, 5, 8 ];
	// determine type of ranged attack and set range damage to be equal to the highest
	// damage ranged attack, with range_distance being the minimum ranged distance.

	// pairsBelow
	has_range = 0;
	for (let part of c.rangearr) {
		// let part=c.limbarr[index];
		// endPairs
		let part_damage     = part.damage;
		let part_range      = part.max;
		let part_dtype      = part.dmgtype;

		if ( part_damage > 0 ) {
			has_range = 1;

			// Set flying range distance limit
			if (has_flying===1 && (part_range > max_flyer_range_dist)) {
				part_range = max_flyer_range_dist;
				part.max = max_flyer_range_dist;
			}

			// Find part with shortest range distance and set it as range_distance.
			// Creatures with multiple range limbs travel to shortest distance before
			// attacking, so use this for future calculations.
			if (( part_range < c.range_distance ) || c.range_distance===0) {
				c.range_distance = part_range;
			}

			// If creature has multiple range attacks, use maximum damage one
			if (( part_damage > c.range_damage ) || c.range_damage===0) {
				c.range_damage = part_damage;
				if ( part.special !== 0 ) {
					c.artillery_damage = c.range_damage * artillery_targets_hit;
				}
			}

			if ( part.special===0 ) {
				if ( part_dtype===16 ) { // sonic attack identified
					has_sonic = 1;
				} else { // directranged, non-sonic
					has_direct = 1;
				}
			} else { // artillery
				c.has_artillery = 1;
			}
		}
	}

	if (has_range===0) {
		if (c.bipedal===1) {
			has_land = 1;
			c.is_land = 1;
			c.landspeed = Math.max(c.landspeed, min_landspeed);
		}
	}

	if (c.underpopulation===1) {
		c.overpopulation = 0;
	}

	// Helpful variable here, used later.
	c.non_flyer_direct_range = 0;
	c.flyer_direct_range = 0;

	if (has_sonic===1 || has_direct===1) {
		if (has_flying===0) {
			c.non_flyer_direct_range = 1;
		} else {
			c.flyer_direct_range = 1;
		}
	}

	// Finally, unusable abilities are removed
	if (has_range===1) {
		c.charge_attack = 0;
		c.leap_attack = 0;

		// Give frog leap attack back when combined with itself (for creature selection)
		if (c.stock0.name==="poison_frog" && c.stock1.name==="poison_frog") {
			c.leap_attack = 1;
		}
	}

	// Gray
	// if (has_flying===1) {
	// c.can_dig = 0;
	// c.leap_attack = 0;
	// c.charge_attack = 0;
	// c.can_SRF = 0;
	// c.electric_burst = 0; // disable electric burst for flyers
	// end

	if (has_swim===1 && has_land===0) {
		c.can_dig = 0;
	}

	if (c.pack_hunter===1 && c.herding===1) {
		c.herding = 0;
	}

	// Not unusable, but removing so that loner units won't be charged for herding or
	// pack hunter
	if (c.loner===1) {
		c.herding = 0;
		c.pack_hunter = 0;
	}


	// ----------------------------------------
	// Domain Definitions
	// ----------------------------------------

	// Set points for shapevalue curves; these represent the (more or less) maximum
	// values of attributes, which are then used as the max points for the domains they
	// represent. They're paired with this creature's specific value for the given
	// attribute, used for actual scaling.
	let dom_max = 1;
	// let dom_val = 2;

	let power_domain            = [PAD, 1500,  "power"];
	let true_size_domain        = [PAD, 10,    "size"];
	let scaling_size_domain     = [PAD, 13,    "scaling_size"]; // For creatures over size 9, this their size as displayed in army builder.
	let ehp_domain              = [PAD, 3000,  "ehp"];
	let cost_ehp_domain         = [PAD, 3000,  "cost_ehp"];
	let melee_dps_domain        = [PAD, 100,   "melee_damage"]; // Pure melee damage (for power calcs)
	let eff_melee_dps_domain    = [PAD, 100,   "effective_melee"]; // Pure melee damage with flyer adjustment (for cost calcs)
	let range_dps_domain        = [PAD, 50,    "range_damage"]; // Pure range damage, no distance
	let artillery_dps_domain    = [PAD, 50,    "artillery_damage"]; // Artillery damage with adjustment for area of effect
	let distance_domain         = [PAD, 100,   "range_distance"];
	let dist_dam_domain         = [PAD, 100,   "range_damage_distance"]; // Ranged DPS factor incorporating distance
	let mixed_dps_domain        = [PAD, 100,   "mixed_dps"];  // Combined melee and damage_distance from ranged (for power calcs)
	let eff_mixed_dps_domain    = [PAD, 100,   "effective_mixed_dps"];  // Mixed DPS with melee flyer adjustment (for cost calcs)
	let defense_domain          = [PAD, 60,    "armour"];
	let rank_domain             = [PAD, 5,     "creature_rank"]; // NOTE: rank value changes based on ability requirements; values updated later.
	let landspeed_domain        = [PAD, 45,    "landspeed"];
	let waterspeed_domain       = [PAD, 47,    "waterspeed"];
	let airspeed_domain         = [PAD, 40,    "airspeed"];
	let mobility_domain         = [PAD, 60,    "mobility"];
	let sight_domain            = [PAD, 50,    "sight_radius"];
	let herd_boost_domain       = [PAD, 700,   "herding_ehp_bonus"]; // Extra EHP gained from herding (about 700 for musk ox blue whale!)
	let null_domain             = [PAD, 1,     "null"];

	// Use the null domain when you don't want to scale on either (or both) of the x
	// and y axes. To get a constant unscaled cost, set all xy numbers to 0 and then
	// set x0y0 to equal your desired cost.

	// A NOTE ON BALANCING WITH ABILITY REF POINTS:
	// Select your domains based on what two factors you want to influence the cost of
	// the ability. For example, if you want to balance an ability based on EHP and
	// damage, select those as your domains. This will have the effect of letting you
	// balance an ability to benefit either glassy or meaty units.
	// ADVANCED NOTE: SuiCo for "average" [Norbert] units is around 27, though it
	// changes with level.
	// SUPERADVANCED NOTE: It's possible to rewrite this system to use gradients and
	// shapevalue; this would allow us to completely remove the domains, but it's a
	// little less clear to understand.

	// ----------------------------------------
	// Effective Mobility
	// ----------------------------------------

	// Now we calculate effective mobility. Note: only having landspeed is the default
	// case (speed = landspeed).
	if (has_flying===1) {
		c.mobility = c.airspeed* mobility_flyer_factor;
	} else {
		c.mobility = ShapeValueCurve(c,landspeed_domain, waterspeed_domain, 0, 40, 28, 45);
	}

	// ----------------------------------------
	// Range Power
	// ----------------------------------------

	// Now we sort out power and costs on ranged attacks. The following code also
	// determines how to charge multiple ranged attacks.
	// NOTE: It is possible, using this method, that combining ranged attacks could
	// result in unintended cost discounts for very exotic art/range combos.
	if ( has_range===1 ) {
		// Ask if one of the range attacks is sonic.
		if ( has_sonic===1 ) {
			c.range_damage_distance = ShapeValueCurve(c,range_dps_domain, distance_domain, 0, 5, 35, 380);
		} else if ( has_direct===1 ) {  // Ask if one of the range attacks is not artillery.
			c.range_damage_distance = ShapeValueCurve(c,range_dps_domain, distance_domain, 0, 0, 30, 320);
		} else { // Then we've got only an artillery attack.
			// Note that artillery dist_dam is a function of distance and damage, and then cost
			// is a function of dist_dam and distance, essentially allowing us to charge
			// exponentially for distance.
			c.range_damage_distance = ShapeValueCurve(c,artillery_dps_domain, distance_domain, 0, 0, 8, 250);
		}
		c.summed_damage = c.range_damage_distance + c.melee_damage;
	}

	if (has_range===1) {
		if (has_flying===1) { // Flyer?
			if (c.has_artillery===1) {
				c.mixed_dps = ShapeValueCurve(c,melee_dps_domain, dist_dam_domain, 0, 30, 110, 120);
				c.effective_mixed_dps = ShapeValueCurve(c,eff_melee_dps_domain, dist_dam_domain, 0, 30, 110, 120);
			} else {
				// For flying direct range, ranged distance is basically useless (theoretically),
				// so just set RDD to damage multiplied by the flyer_damage_mult.
				c.range_damage_distance = c.range_damage * damage_flyer_factor;
				c.mixed_dps = ShapeValueCurve(c,melee_dps_domain, dist_dam_domain, 0, 20, 90, 80);
				c.effective_mixed_dps = ShapeValueCurve(c,eff_melee_dps_domain, dist_dam_domain, 0, 20, 90, 80);
			}
		} else { // Otherwise, not a flyer.
			// Primtive fix for high-melee art; mixed DPS is just set manually to never go
			// below melee DPS.
			let mixed_dps = ShapeValueCurve(c,melee_dps_domain, dist_dam_domain, 0, 50, 90, 100);
			c.mixed_dps = Math.max(c.melee_damage, mixed_dps);
			c.effective_mixed_dps = c.mixed_dps;
		}
	} else {
		c.mixed_dps = c.melee_damage;
		c.effective_mixed_dps = c.effective_melee;
	}


	// ----------------------------------------
	// ranking
	// ----------------------------------------

	c.power = Power(c.ehp, c.mixed_dps); // , c.creature_rank);

	let rank_cmp = [PAD,
		RankTable[1][max_pow],
		RankTable[2][max_pow],
		RankTable[3][max_pow],
		RankTable[4][max_pow],
		// Anything over level 4's max_pow will be level 5.
	];

	c.power_rank = Rank( c.power, rank_cmp );


	// ----------------------------------------
	// Size Hack
	// ----------------------------------------

	if (c.size===10) {
		c.size = 9;
	} else if (c.size > 10) {
		c.size = 10;
	}

	// remove duplicate web_throw
	if (c.web_throw_front===1) {
		c.web_throw = 0;
	}


	// ----------------------------------------
	// ability costs
	// ----------------------------------------

	// Ability type constants.
	let ABT_Ability = 1;
	let ABT_Melee = 2;
	let ABT_Range = 3;
	let DT_Electric=8;
	let DT_Sonic=16;
	let DT_Poison=1;
	let DT_HornNegateFull=4096;
	let DT_BarrierDestroy=4;
	let DT_HornNegateArmour=2;

	// Functions that are called with the ability id parameter and return a 1 if the
	// ability is present. These correspond to the ability type constants above.
	function attrvalue(name) {
		let id=-1;
		if (name==="web_throw_front") {name="web_throw";id=2;}
		else if (name==="poplowtorso") {name="poplow";id=6;}
		else if (name==="hardened_head") {name="hardened";id=4;}
		else if (name==="hardened_front") {name="hardened";id=2;}
		else if (name==="hardened_torso") {name="hardened";id=6;}
		else if (name==="hardened_back") {name="hardened";id=3;}
		else if (name==="hardened_tail") {name="hardened";id=5;}
		if (id>=0) {let l=c.limbarr[id]; return l?l[name]:0;}
		//if (id>=0) {return c.limbarr[id][name];}
		if (c[name]===undefined) {throw "attr: "+name;}
		return c[name];
	}
	function hasmeleedmgtype(flag) {return (c.melee_dmgtype&flag)?1:0;}
	function hasrangedmgtype(flag) {for (let l of c.rangearr) {if (l.dmgtype&flag) {return 1;}};return 0;}
	let ABT_CheckFunctions = [PAD,
		attrvalue,
		hasmeleedmgtype,
		hasrangedmgtype,
	];

	// The following abilities and damagetypes are missing from the table as they've
	// been made redundant:
	// [ ABT_Ability, "poison_bite"   , 3, null_domain, null_domain, 0, 0, 0, 0],
	// [ ABT_Ability, "poison_sting"  , 3, null_domain, null_domain, 0, 0, 0, 0],
	// [ ABT_Ability, "poison_pincers", 3, null_domain, null_domain, 0, 0, 0, 0],
	// DEFUNCT, now only poison is used.
	// [ ABT_Range  , DT_VenomSpray   , 3, null_domain, null_domain, 0, 0, 0, 0],

	// Also note that a special 10th column is added to the table if an ability is
	// found; this will carry the ability's calculated cost for later.
	let AbilityRefPoints = [PAD,
		//[  ability_type, ability_id  , minimum_level, x_domain         , y_domain,            x0y0,x1y0,y1x0,x1y1]
		[PAD, ABT_Ability, "flash",                  1, rank_domain      , null_domain         ,  15,  55,  15,  55],
		[PAD, ABT_Ability, "headflashdisplay",       1, rank_domain      , null_domain         ,  15,  55,  15,  55],
		[PAD, ABT_Ability, "stink_attack",           1, rank_domain      , null_domain         ,   0,  50,   0,  50],
		[PAD, ABT_Ability, "assassinate",            1, rank_domain      , null_domain         , -10,  90, -10,  90],
		[PAD, ABT_Ability, "can_SRF",                2, rank_domain      , null_domain         ,  20,  45,  20,  45],
		[PAD, ABT_Ability, "AutoDefense",            1, rank_domain      , null_domain         ,   0,  20,   0,  20],
		[PAD, ABT_Ability, "plague_attack",          1, rank_domain      , null_domain         ,   5,  80,   5,  80],
		[PAD, ABT_Ability, "sonar_pulse",            1, rank_domain      , null_domain         ,  10,  35,  10,  35],
		[PAD, ABT_Ability, "quill_burst",            2, rank_domain      , null_domain         ,  10,  35,  10,  35],
		[PAD, ABT_Ability, "electric_burst",         1, rank_domain      , null_domain         ,  10,  35,  10,  35],
		[PAD, ABT_Ability, "web_throw",              3, rank_domain      , null_domain         ,  20,  90,  20,  90],
		[PAD, ABT_Ability, "web_throw_front",        3, rank_domain      , null_domain         ,  20,  90,  20,  90],
		[PAD, ABT_Ability, "poison_touch",           3, rank_domain      , null_domain         , -20,  70, -20,  70],
		[PAD, ABT_Ability, "poplow",                 1, null_domain      , null_domain         ,   0,   0,   0,   0],  // special
		[PAD, ABT_Ability, "poplowtorso",            1, null_domain      , null_domain         ,   0,   0,   0,   0],  // special
		[PAD, ABT_Ability, "is_swimmer",             2, null_domain      , null_domain         ,   0,   0,   0,   0],  // special
		[PAD, ABT_Ability, "keen_sense",             1, null_domain      , null_domain         ,  10,   0,   0,   0],
		[PAD, ABT_Ability, "infestation",            2, mobility_domain  , cost_ehp_domain     ,  10,  25,  20, 27.5],
		[PAD, ABT_Ability, "end_bonus",              1, null_domain      , null_domain         ,   5,   0,   0,   0],
		[PAD, ABT_Ability, "loner",                  3, power_domain     , null_domain         , 100, 650, 100, 650],
		[PAD, ABT_Ability, "overpopulation",         1, power_domain     , null_domain         ,   0, 150,   0, 150],
		[PAD, ABT_Ability, "soiled_land",            3, mobility_domain  , rank_domain         ,  30,  90,  50, 110],
		[PAD, ABT_Ability, "is_immune",              1, power_domain     , defense_domain      ,   1,  85,  50, 100],
		[PAD, ABT_Ability, "deflection_armour",      2, cost_ehp_domain  , rank_domain         ,  10, 240,  20, 200],
		[PAD, ABT_Ability, "herding",                1, herd_boost_domain, eff_mixed_dps_domain,   0, 180,  50, 320],
		[PAD, ABT_Ability, "pack_hunter",            1, cost_ehp_domain  , eff_mixed_dps_domain,   0, 130,  95, 390],
		[PAD, ABT_Ability, "is_stealthy",            1, cost_ehp_domain  , eff_mixed_dps_domain,   0,  90, 180, 100],
		[PAD, ABT_Ability, "can_dig",                1, cost_ehp_domain  , eff_mixed_dps_domain,   0,  60, 150, 210],
		[PAD, ABT_Ability, "regeneration",           1, cost_ehp_domain  , eff_mixed_dps_domain,   5,  90,  90, 200],
		[PAD, ABT_Ability, "frenzy_attack",          1, cost_ehp_domain  , eff_mixed_dps_domain,   0,  60, 100, 200],
		[PAD, ABT_Ability, "is_flyer",               1, null_domain      , null_domain         ,   0,   0,   0,   0],
		[PAD, ABT_Ability, "ranged_piercing",        1, cost_ehp_domain  , range_dps_domain    ,   5, 180, 180, 250],
		[PAD, ABT_Ability, "leap_attack",            2, cost_ehp_domain  , eff_melee_dps_domain,  15,  30,  40,  50],
		[PAD, ABT_Ability, "charge_attack",          2, cost_ehp_domain  , eff_melee_dps_domain,  10,  45,  65,  80],
		[PAD, ABT_Ability, "flyer_direct_range",     1, cost_ehp_domain  , range_dps_domain    ,   0,  95,  80, 250],
		[PAD, ABT_Ability, "non_flyer_direct_range", 1, null_domain      , null_domain         ,   0,   0,   0,   0],  // special case, but it really shouldn't be... TODO: fix this
		[PAD, ABT_Ability, "has_artillery",          1, dist_dam_domain  , distance_domain     ,   0,  20,  75, 225],
		[PAD, ABT_Ability, "overpopulation",         1, rank_domain      , null_domain         ,  10,  50,   1,  50],
		[PAD, ABT_Ability, "hardened_head",          1, null_domain      , null_domain         ,  10,   0,   0,  10],
		[PAD, ABT_Ability, "hardened_front",         1, null_domain      , null_domain         ,  10,   0,   0,  10],
		[PAD, ABT_Ability, "hardened_torso",         1, null_domain      , null_domain         ,  10,   0,   0,  10],
		[PAD, ABT_Ability, "hardened_back",          1, null_domain      , null_domain         ,  10,   0,   0,  10],
		[PAD, ABT_Ability, "hardened_tail",          1, null_domain      , null_domain         ,  10,   0,   0,  10],
		[PAD, ABT_Ability, "shell",                  1, null_domain      , null_domain         ,  40,   0,   0,  40],

		[PAD, ABT_Range  , DT_Electric,              2, null_domain      , null_domain         ,   0,   0,   0,   0],  // special
		[PAD, ABT_Range  , DT_Sonic,                 2, null_domain      , null_domain         ,   0,   0,   0,   0],  // special
		[PAD, ABT_Range  , DT_Poison,                3, rank_domain      , null_domain         , -20,  40, -20,  40],  // Cost for chemical artillery (which has the melee poison damagetype).

		[PAD, ABT_Melee  , DT_Poison,                3, rank_domain      , null_domain         , -20,  80, -20,  80],
		[PAD, ABT_Melee  , DT_HornNegateFull,        2, rank_domain      , null_domain         ,  10,  50,  10,  50],
		[PAD, ABT_Melee  , DT_BarrierDestroy,        1, ehp_domain       , melee_dps_domain    ,   0,   5,  10,  15],
		[PAD, ABT_Melee  , DT_HornNegateArmour,      1, cost_ehp_domain  , eff_melee_dps_domain, -15, 200, 220, 250]
	];

	// The variables below describe what each column of the AbilityRefPoints table
	// represents. "rc" is "Reference Column".
	let rc_ability_type = 1;
	let rc_id = 2;
	let rc_min_rank = 3;
	let rc_x_dom = 4;
	let rc_y_dom = 5;
	let rc_x0y0_cost = 6;
	let rc_x1y0_cost = 7;
	let rc_x0y1_cost = 8;
	let rc_x1y1_cost = 9;
	let ability_calculated_cost = 10;



	// First find min rank for all abilities.
	let ability_rank = c.power_rank;

	// pairsStart
	for (let ab of AbilityRefPoints) {
		if (ab===PAD) {continue;}
		// pairsEnd
		// If we have this ability...
		if (ABT_CheckFunctions[ab[rc_ability_type]]( ab[rc_id] )===1) {
			// check for min rank.
			ability_rank = Math.max(ability_rank, ab[rc_min_rank]);
		}
	}

	c.creature_rank = Math.max( c.power_rank, ability_rank );

	// Now we add ability costs.
	let charged_for_poison = 0;
	// pairsStart
	for (let ab of AbilityRefPoints) {
		if (ab===PAD) {continue;}
		// pairsEnd

		ab[ability_calculated_cost] = 0;

		// If we have this ability...
		if (ABT_CheckFunctions[ab[rc_ability_type]]( ab[rc_id] )===1) {

			let ability_cost = ShapeValueCurve(c,ab[rc_x_dom], ab[rc_y_dom],
			                   ab[rc_x0y0_cost], ab[rc_x1y0_cost], ab[rc_x0y1_cost], ab[rc_x1y1_cost]);

			// Let's add a mobility cost to barrier destroy
			if (ab[rc_id]===DT_BarrierDestroy) {
				let mobility_fraction_on_domain = c.mobility / mobility_domain[dom_max];
				ability_cost = ability_cost * ((1.0 + mobility_fraction_on_domain) * 3.4);
			}

			// If we have either melee or ranged poison DT, don't charge for poison touch.
			if (ab[rc_id]==="poison_touch" || ab[rc_id]===DT_Poison) {
				if (charged_for_poison===0) {
					charged_for_poison = 1;
					ab[ability_calculated_cost] = ability_cost;
				}

			// Give pack hunter ranged units a tax (range units get more benefit from pack due
			// to their ability to stack)
			} else if (ab[rc_id]==="pack_hunter" && has_range===1) {
				ab[ability_calculated_cost] = ability_cost * range_pack_hunter_mult;

			// Zero out herding cost if it has no benefit; this should fall naturally out of
			// the equations (domains should have 0 at 0 herd-bonus) but those costs don't
			// quite shake out nicely.
			} else if (ab[rc_id]==="herding" && c.herding_ehp_bonus < 1.0) {
				ab[ability_calculated_cost] = 0;

			// Poplow isn't charged on a curve.
			} else if ((ab[rc_id]==="poplow" || ab[rc_id]==="poplowtorso") && ((c.scaling_size - c.creature_rank)/2) > 1.0) {
				let poplow_benefit = Math.floor(Math.min(c.creature_rank + 1, (c.scaling_size - c.creature_rank)) / 2);
				ab[ability_calculated_cost] = poplow_benefit * 10;

			} else if ((ab[rc_id]==="has_artillery") && (has_flying===1)) {
				ab[ability_calculated_cost] = ability_cost * flying_artillery_elec_mult;

			} else if (ab[rc_id]==="non_flyer_direct_range") { // This should definitely just be on a curve!
				if (has_sonic===1) {
					ab[ability_calculated_cost] = c.range_damage_distance * sonic_elec_mult;
				} else {
					ab[ability_calculated_cost] = c.range_damage_distance * direct_range_elec_mult;
				}

			// All other abilities:
			} else {
				ab[ability_calculated_cost] = ability_cost;
			}
		}
	}


	// ----------------------------------------
	// cost mods
	// ----------------------------------------

	// cost_power equation (power with a 10% rebate for defense, used for calculating
	// costs). Note that below we employ the ehp_flyer_factor directly onto hitpoints;
	// multiplying hp by a factor and then calculating ehp has the exact same result as
	// multiplying ehp by that same factor.
	let defense_rebate_ehp = ( c.hitpoints * ehp_flyer_factor ) / ( 1-(c.armour * defense_cost_multiplier) );
	// edit flag
	let cRank = c.creature_rank;
	// let cMelee = c.melee_damage;
	// let cRanged = c.range_damage;
	// let cHealth = defense_rebate_ehp;
	// let cDps = c.effective_mixed_dps;

	// Check if unit has ranged damage or artillery (Made by Gray)
	has_range = c.range_damage > 0;
	let has_artillery = c.has_artillery===1;

	// Apply EHP-based cost discount ONLY if unit is melee-only (no ranged or
	// artillery) (Gray)
	let ehp_dps_ratio = defense_rebate_ehp / Math.max(c.effective_mixed_dps, 1);  // Avoid division by zero

	let cost_power=0;
	if (!has_range && !has_artillery) {  // Only apply discount for melee units
		if (ehp_dps_ratio > 195) {
			cost_power = Power(defense_rebate_ehp * 0.745, c.effective_mixed_dps, c.creature_rank);  // 25.5% discount
		} else if (ehp_dps_ratio > 185) {
			cost_power = Power(defense_rebate_ehp * 0.760, c.effective_mixed_dps, c.creature_rank);  // 24.0% discount
		} else if (ehp_dps_ratio > 175) {
			cost_power = Power(defense_rebate_ehp * 0.775, c.effective_mixed_dps, c.creature_rank);  // 22.5% discount
		} else if (ehp_dps_ratio > 165) {
			cost_power = Power(defense_rebate_ehp * 0.790, c.effective_mixed_dps, c.creature_rank);  // 21.0% discount
		} else if (ehp_dps_ratio > 155) {
			cost_power = Power(defense_rebate_ehp * 0.805, c.effective_mixed_dps, c.creature_rank);  // 19.5% discount
		} else if (ehp_dps_ratio > 145) {
			cost_power = Power(defense_rebate_ehp * 0.820, c.effective_mixed_dps, c.creature_rank);  // 18.0% discount
		} else if (ehp_dps_ratio > 135) {
			cost_power = Power(defense_rebate_ehp * 0.835, c.effective_mixed_dps, c.creature_rank);  // 16.5% discount
		} else if (ehp_dps_ratio > 125) {
			cost_power = Power(defense_rebate_ehp * 0.850, c.effective_mixed_dps, c.creature_rank);  // 15.0% discount
		} else if (ehp_dps_ratio > 115) {
			cost_power = Power(defense_rebate_ehp * 0.865, c.effective_mixed_dps, c.creature_rank);  // 13.5% discount
		} else if (ehp_dps_ratio > 105) {
			cost_power = Power(defense_rebate_ehp * 0.880, c.effective_mixed_dps, c.creature_rank);  // 12.0% discount
		} else if (ehp_dps_ratio > 95) {
			cost_power = Power(defense_rebate_ehp * 0.895, c.effective_mixed_dps, c.creature_rank);  // 10.5% discount
		} else if (ehp_dps_ratio > 85) {
			cost_power = Power(defense_rebate_ehp * 0.910, c.effective_mixed_dps, c.creature_rank);  // 9.0% discount
		} else if (ehp_dps_ratio > 75) {
			cost_power = Power(defense_rebate_ehp * 0.925, c.effective_mixed_dps, c.creature_rank);  // 7.5% discount
		} else if (ehp_dps_ratio > 65) {
			cost_power = Power(defense_rebate_ehp * 0.940, c.effective_mixed_dps, c.creature_rank);  // 6.0% discount
		} else if (ehp_dps_ratio > 55) {
			cost_power = Power(defense_rebate_ehp * 0.955, c.effective_mixed_dps, c.creature_rank);  // 4.5% discount
		} else if (ehp_dps_ratio > 45) {
			cost_power = Power(defense_rebate_ehp * 0.970, c.effective_mixed_dps, c.creature_rank);  // 3.0% discount
		} else if (ehp_dps_ratio > 35) {
			cost_power = Power(defense_rebate_ehp * 0.980, c.effective_mixed_dps, c.creature_rank);  // 2.0% discount
		} else {
			cost_power = Power(defense_rebate_ehp, c.effective_mixed_dps, c.creature_rank);          // No discount
		}
	} else {
		cost_power = Power(defense_rebate_ehp, c.effective_mixed_dps, c.creature_rank);  // No discount for ranged/artillery units
	}
	// cost_power =
	//      Power((cHealth ^ 2 / extra_rank(cRank) * (0.61+cMelee/62) *
	//      ((0.10 + (0.04 - Math.max(0,(0.02 * Math.max(cRank-2,1))))) / ((cMelee) +
	//      range_comp(cMelee,cRanged,cRank) + meat_comp(cMelee,cRanged,cRank))/
	//      level_tune(cRank)) * glass_if((cMelee+cRanged), cRank))/
	//      (ehp_flyer_factor * 2 ), 1.5*cDps*mid_melee(cMelee,cRanged,cRank));
	//
	// removed lines from equations
	//
	// orginal glass if: (1+((c.melee_damage*(c.melee_damage))/c.creature_rank/4) *
	// (((((c.melee_damage + c.range_damage) * 10) > c.hitpoints) and (c.melee_damage
	// > c.range_damage)) and 1 or 0))))
	//
	// range comp: (c.melee_damage * 1 * (((c.range_damage - c.melee_damage) > 2) and
	// 1 or 0)
	//
	// meat comp: + c.melee_damage * 1.8 * (((c.effective_mixed_dps < 7) and
	// (c.creature_rank > 2)) and 1 or 0 )+ 1.8 * c.melee_damage *
	// (((c.effective_mixed_dps < 3)) and (c.creature_rank < 3) and 1 or 0)
	//
	// level comp: / (((c.creature_rank > 3) and 1 or 0) * (c.creature_rank/5 ) + 1)
	// mobility cost multiplier

	let mobility_cost = Math.pow((c.mobility/mobility_divisor),( (has_flying===1)?flyer_mobility_exp:mobility_exp));


	// sight cost

	let sightCost = (c.sight_radius-min_sight)*sight_cost_multiplier;

	// FINAL COST CALCULATION AND SCALING.

	// Intra-level modulator changes the costs of spam units relative to power units.
	let intra_level_modulator = Math.pow((cost_power*1.3/RankTable[c.creature_rank][max_pow]),(RankTable[c.creature_rank][cost_exponent]));
	c.final_cost_scaler = intra_level_modulator;

	// If the unit has direct range or sonic and DOES NOT fly, add a multiplier to coal
	// cost.
	cost_coal = (sightCost + RankTable[c.creature_rank][base_coal_cost] * mobility_cost * 1.1 * ((c.non_flyer_direct_range===1)?ranged_coal_cost_mult:1)) * c.final_cost_scaler;

	// ===Melee-only Power-Based Coal Discount (Gray)
	// ===Creature Rank-Based Melee Power Discount (Ground Melee Units Only)===
	if (!has_range && !has_artillery && c.is_flyer===0) {
		let power_val = c.power;
		let rank = c.creature_rank;

		// Rank 2: Power 60-115
		if (rank===2) {
			if (power_val < 65) {
				cost_coal = cost_coal * 0.96;  // 5% discount
			} else if (power_val < 70) {
				cost_coal = cost_coal * 0.96;  // 5% discount
			} else if (power_val < 75) {
				cost_coal = cost_coal * 0.96;  // 5% discount
			} else if (power_val < 80) {
				cost_coal = cost_coal * 0.96;  // 5% discount
			} else if (power_val < 85) {
				cost_coal = cost_coal * 0.96;  // 5% discount
			} else if (power_val < 90) {
				cost_coal = cost_coal * 0.96;  // 5% discount
			} else if (power_val < 95) {
				cost_coal = cost_coal * 0.95;  // 5% discount
			} else if (power_val < 100) {
				cost_coal = cost_coal * 0.955; // 4.5% discount
			} else if (power_val < 105) {
				cost_coal = cost_coal * 0.96;  // 4% discount
			} else if (power_val < 110) {
				cost_coal = cost_coal * 0.97;  // 3% discount
			} else if (power_val <= 114) {
				cost_coal = cost_coal * 0.98;  // 2% discount
			}

		// Rank 3: Power 120-225
		} else if (rank===3) {
			if (power_val < 130) {
				cost_coal = cost_coal * 0.92;  // 8% discount
			} else if (power_val < 140) {
				cost_coal = cost_coal * 0.925; // 7.5% discount
			} else if (power_val < 150) {
				cost_coal = cost_coal * 0.93;  // 7% discount
			} else if (power_val < 160) {
				cost_coal = cost_coal * 0.935; // 6.5% discount
			} else if (power_val < 170) {
				cost_coal = cost_coal * 0.94;  // 6% discount
			} else if (power_val < 180) {
				cost_coal = cost_coal * 0.945; // 5.5% discount
			} else if (power_val < 190) {
				cost_coal = cost_coal * 0.95;  // 5% discount
			} else if (power_val < 200) {
				cost_coal = cost_coal * 0.96;  // 4% discount
			} else if (power_val < 210) {
				cost_coal = cost_coal * 0.965; // 3% discount
			} else if (power_val < 220) {
				cost_coal = cost_coal * 0.97;  // 2% discount
			} else if (power_val <= 225) {
				cost_coal = cost_coal * 0.97;  // 1% discount
			}

		// Rank 4: Power 230-390, intervals of 10, starting at 8% discount, decreasing 0.5%
		// per interval
		} else if (rank===4) {
			if (power_val < 240) {
				cost_coal = cost_coal * 0.92;  // 8.0% discount
			} else if (power_val < 250) {
				cost_coal = cost_coal * 0.925; // 7.5% discount
			} else if (power_val < 260) {
				cost_coal = cost_coal * 0.93;  // 7.0% discount
			} else if (power_val < 270) {
				cost_coal = cost_coal * 0.935; // 6.5% discount
			} else if (power_val < 280) {
				cost_coal = cost_coal * 0.94;  // 6.0% discount
			} else if (power_val < 290) {
				cost_coal = cost_coal * 0.945; // 5.5% discount
			} else if (power_val < 300) {
				cost_coal = cost_coal * 0.95;  // 5.0% discount
			} else if (power_val < 310) {
				cost_coal = cost_coal * 0.955; // 4.5% discount
			} else if (power_val < 320) {
				cost_coal = cost_coal * 0.96;  // 4.0% discount
			} else if (power_val < 330) {
				cost_coal = cost_coal * 0.965; // 3.5% discount
			} else if (power_val < 340) {
				cost_coal = cost_coal * 0.97;  // 3.0% discount
			} else if (power_val < 350) {
				cost_coal = cost_coal * 0.975; // 2.5% discount
			} else if (power_val < 360) {
				cost_coal = cost_coal * 0.98;  // 2.0% discount
			} else if (power_val < 370) {
				cost_coal = cost_coal * 0.985; // 1.5% discount
			} else if (power_val < 380) {
				cost_coal = cost_coal * 0.99;  // 1.0% discount
			} else if (power_val < 390) {
				cost_coal = cost_coal * 0.995; // 0.5% discount
			}


		// Rank 5: Power 500-1550
		} else if (rank===5 && power_val >= 500) {
			if (power_val < 550) {
				cost_coal = cost_coal * 0.98;  // 2% discount
			} else if (power_val < 600) {
				cost_coal = cost_coal * 0.97;  // 3% discount
			} else if (power_val < 650) {
				cost_coal = cost_coal * 0.96;  // 4% discount
			} else if (power_val < 700) {
				cost_coal = cost_coal * 0.95;  // 5% discount
			} else if (power_val < 750) {
				cost_coal = cost_coal * 0.94;  // 6% discount
			} else if (power_val < 800) {
				cost_coal = cost_coal * 0.93;  // 7% discount
			} else if (power_val < 850) {
				cost_coal = cost_coal * 0.92;  // 8% discount
			} else if (power_val < 900) {
				cost_coal = cost_coal * 0.91;  // 9% discount
			} else if (power_val < 950) {
				cost_coal = cost_coal * 0.90;  // 10% discount
			} else if (power_val < 1000) {
				cost_coal = cost_coal * 0.89;  // 11% discount
			} else if (power_val < 1050) {
				cost_coal = cost_coal * 0.88;  // 12% discount
			} else if (power_val < 1100) {
				cost_coal = cost_coal * 0.87;  // 13% discount
			} else if (power_val < 1150) {
				cost_coal = cost_coal * 0.86;  // 14% discount
			} else if (power_val < 1200) {
				cost_coal = cost_coal * 0.85;  // 15% discount
			} else if (power_val < 1250) {
				cost_coal = cost_coal * 0.84;  // 16% discount
			} else if (power_val < 1300) {
				cost_coal = cost_coal * 0.83;  // 17% discount
			} else if (power_val < 1350) {
				cost_coal = cost_coal * 0.82;  // 18% discount
			} else if (power_val < 1400) {
				cost_coal = cost_coal * 0.81;  // 19% discount
			} else if (power_val < 1450) {
				cost_coal = cost_coal * 0.80;  // 20% discount
			} else if (power_val < 1500) {
				cost_coal = cost_coal * 0.79;  // 21% discount
			} else if (power_val < 1550) {
				cost_coal = cost_coal * 0.78;  // 22% discount
			} else if (power_val <= 1550) {
				cost_coal = cost_coal * 0.77;  // 23% discount
			}
		}
	}


	// ===Ranged-only Power-Based Coal Discount (Rank 5)===(Gray)
	if (has_range && !has_artillery && c.is_flyer===0) {
		let power_val = c.power;
		let rank = c.creature_rank;

		// Rank 5: Power 400-1500
		if (rank===5) {
			if (power_val < 450) {
				cost_coal = cost_coal * 0.97;  // 3.0%
			} else if (power_val < 500) {
				cost_coal = cost_coal * 0.955; // 4.5%
			} else if (power_val < 550) {
				cost_coal = cost_coal * 0.94;  // 6.0%
			} else if (power_val < 600) {
				cost_coal = cost_coal * 0.925; // 7.5%
			} else if (power_val < 650) {
				cost_coal = cost_coal * 0.91;  // 9.0%
			} else if (power_val < 700) {
				cost_coal = cost_coal * 0.895; // 10.5%
			} else if (power_val < 750) {
				cost_coal = cost_coal * 0.88;  // 12.0%
			} else if (power_val < 800) {
				cost_coal = cost_coal * 0.865; // 13.5%
			} else if (power_val < 850) {
				cost_coal = cost_coal * 0.85;  // 15.0%
			} else if (power_val < 900) {
				cost_coal = cost_coal * 0.835; // 16.5%
			} else if (power_val < 950) {
				cost_coal = cost_coal * 0.82;  // 18.0%
			} else if (power_val < 1000) {
				cost_coal = cost_coal * 0.805; // 19.5%
			} else if (power_val < 1050) {
				cost_coal = cost_coal * 0.79;  // 21.0%
			} else if (power_val < 1100) {
				cost_coal = cost_coal * 0.775; // 22.5%
			} else if (power_val < 1150) {
				cost_coal = cost_coal * 0.76;  // 24.0%
			} else if (power_val < 1200) {
				cost_coal = cost_coal * 0.745; // 25.5%
			} else if (power_val < 1250) {
				cost_coal = cost_coal * 0.73;  // 27.0%
			} else if (power_val < 1300) {
				cost_coal = cost_coal * 0.715; // 28.5%
			} else if (power_val < 1350) {
				cost_coal = cost_coal * 0.70;  // 30.0%
			} else if (power_val < 1400) {
				cost_coal = cost_coal * 0.685; // 31.5%
			} else if (power_val < 1450) {
				cost_coal = cost_coal * 0.67;  // 33.0%
			} else if (power_val <= 1500) {
				cost_coal = cost_coal * 0.655; // 34.5%
			}
		}
	}


	let total_abilities_cost = 0;

	// pairsStart
	// This is where we scale all our previously-calculated ability costs.
	for (let ab of AbilityRefPoints) {
		if (ab===PAD) {continue;}
		// pairsEnd
		if (ab[ability_calculated_cost] > 0.0) {

			let ability_name = ab[rc_id];

			// First, if we're dealing with a dt, we need to grab the string associated with
			// it. The first check makes sure ability_name is not a string.
			if (ab[rc_ability_type]===ABT_Melee || ab[rc_ability_type]===ABT_Range) {
				for (let string_pair in DTStringTable) {
					if (string_pair===PAD) {continue;}
					if (string_pair[dt_number]===ability_name) {
						ability_name = string_pair[dt_string];
					}
				}
			}

			// Let's not scale assassinate; logically I don't think it should be any cheaper on
			// spam than it is on power.
			if (ability_name==="assassinate") {
				total_abilities_cost = total_abilities_cost + ab[ability_calculated_cost];
			} else {
				let scaled_ability_cost = ab[ability_calculated_cost] * c.final_cost_scaler;
				total_abilities_cost = total_abilities_cost + scaled_ability_cost;
			}
		}
	}

	cost_elec = total_abilities_cost;


	// Apply artillery flyer cost penalty (Gray)
	if ((c.is_flyer===1) && (c.has_artillery===1)) {
		cost_coal = cost_coal * 1.10;
	}


	c.coal = cost_coal;


	// ----------------------------------------
	// outputs
	// ----------------------------------------

	// Popspace calc. NOTE: Pop space is capped at creature level + 1.
	let Pop=0;
	if ((c.poplow===1) || (c.poplowtorso===1)) {
		Pop = Math.min(Math.ceil(Math.max(1, c.scaling_size - c.creature_rank) / 2), c.creature_rank + 1);
	} else {
		Pop = Math.min(Math.max(1, c.scaling_size - c.creature_rank), c.creature_rank + 1);
	}

	// tuning.lua
	let UnderPop = [PAD,1,2,3,4,5];

	// Buildtime calc
	// Overpop buildtime multiplier
	let build_time_multiplier=0;
	if (c.underpopulation===1) {
		c.overpopulation = 0;

		build_time_multiplier = 2.5;
		c.melee_damage = c.melee_damage + UnderPop[cRank];
		c.armor = c.armor + UnderPop[cRank];
		c.sight_radius = c.sight_radius + UnderPop[cRank];
		if (c.landspeed > 0) {
			c.landspeed = c.landspeed + UnderPop[cRank];
		}
		if (c.waterspeed > 0) {
			c.waterspeed = c.waterspeed + UnderPop[cRank];
		}
		if (c.airspeed > 0) {
			c.airspeed = c.airspeed + UnderPop[cRank];
		}

	} else {

		if (c.overpopulation===1) {
			build_time_multiplier = 0.5;
		} else {
			build_time_multiplier = 1.0;
		}

	}
	// Overpop buildtime multiplier


	// Build time equation
	let build_time = (30 * c.creature_rank)*Math.pow((c.power*1.2/RankTable[c.creature_rank][max_pow]),1.2)*build_time_multiplier;

	let overpop_adjusted_min_build = ((has_flying===1)?flyer_min_build_time:min_build_time);
	c.creature_rank = ( ((has_flying===1) && (cRank===1)) ? 2 : cRank) ;
	// set minimum build time
	if (c.overpopulation===1) {
		overpop_adjusted_min_build = overpop_adjusted_min_build / 2;
	}

	build_time = Math.max(build_time, overpop_adjusted_min_build);
	c.constructionticks = build_time;

	// Final Output
	c.coal = cost_coal ;
	c.electricity = cost_elec ;
	c.popsize = Pop ;
}

