--Changelog for Tellurian 2.11 beta (relative to Tellurian 2.10.1):
    -- Range power equation modified (shape vals changed from [0, 10, 10, 363] to [0, 5, 30, 363])
    -- Effective mobility equation modified ([0, 45, 30, 60] to [0, 45, 35, 55]). This means amphib price is starting to tend towards marginal again, which is... not really good balance.
    -- Flyer mobility mult increased from 1.6 to 1.75.

dofilepath("data:junction.lua")
dofilepath("data:attr_functions.lua")
dofilepath("data:attr_parameters.lua")
dofilepath("data:attr_functions2.lua")
dofilepath("data:cost_functions.lua")
--deleteStart
function combine_creature()
    print("started combiner")
    --deleteEnd
    print(Attr("name"))
    ---------------------
    ---------------------
    -- Constant Tables --
    ---------------------
    ---------------------

        -- Ranking Constants --
        --Table of maximum power thresholds, base coal costs and cost exponents for each level.
        --Table is defined here, but only used in the costs section towards the bottom of Attrcombiner.
        --{max power, base coal cost, cost_exponent}
        max_pow = 1;
        base_coal_cost = 2;
        cost_exponent = 3;  -- NOTE: The lower the cost exponent, the more expensive spam becomes and the cheaper power becomes.
        
        RankTable =
        {
            {60,    60,     1   },     --L1
            {120,   100,    1   },     --L2
            {230,   170,    0.8 },    --L3
            {400,   240,    0.8 },   --L4
            {1000,  410,    0.75}    --L5
        };

        --Just some candy; this table is only ever used during the final elec cost scaling to associate damagetypes
        --with strings for display in combotest.
        DTStringTable =
        {
            {1, "DT_Poison"},
            {2, "DT_Horns"},
            {4, "DT_Barrier_Destroy"},
            {8, "DT_Electric"},
            {16, "DT_Sonic"},
            {4096, "DT_Ranged_Poison"},
        };

        dt_number = 1;
        dt_string = 2;

    -----------------
    -----------------
    -- Tweakables ---
    -----------------
    -----------------

        -- This section contains some handy parameters for easy tweaking.

        -- Multipliers on ranged attack costs.
        --original 1.1
	ranged_coal_cost_mult       = 1.27;
	--edit flag orginal : 1.5
        direct_range_elec_mult      = 2.0;
        sonic_elec_mult             = 1.4;
        flying_artillery_elec_mult  = 1.5;
        range_pack_hunter_mult      = 1.42;
        artillery_targets_hit       = 1;

        -- The below multipliers apply a factor to various parameters if the unit is a flyer; they're only used for cost calculations, not power.
        damage_flyer_mult    = 1.15;
        ehp_flyer_mult      = 1.15;
        mobility_flyer_mult = 1.5;

        -- Define Limits for some variables
        max_armour 			 = 0.60; --redifined in following section
        min_sight 			 = 25;
        max_sight 			 = 50;
        max_flyer_range_dist = 24;
        min_landspeed		 = 18;
        min_waterspeed		 = 18;
        min_airspeed		 = 16;
        min_build_time       = 16;
        flyer_min_build_time = 50;

        -- Variables that inform the shape of the mobility cost curve (ONLY cost, not mobility itself).
        mobility_divisor = 25;
        mobility_exp = 0.4;
        flyer_mobility_exp = 0.35;

        -- Sight cost.
        sight_cost_multiplier = 0.5;

        -- A rebate for defense; you only pay for this much of your defense.
        defense_cost_multiplier = 0.9;

        -- These variables are grabbed from tuning!
        herding_def_multiplier = PackBonus.basedefensemodifier; -- I know this says pack but it's herding

    -----------------
    -----------------
    ---- defense ----
    -----------------
    -----------------
        
        -- removing abilites that shouldn't go with shell
        if Attr("shell") == 1 then
            setattribute("herding", 0);
            setattribute("regeneration", 0);
        end

        -- counts the body parts with hardened
        hardened_count = max(0,Attr("hardened_head")) + max(0,Attr("hardened_front")) + max(0,Attr("hardened_torso")) + max(0,Attr("hardened_back")) + max(0,Attr("hardened_tail"));
        hardened_bonus = {0,0.01,0.03,0.09,0.27,0.81};
        shell = max(0, Attr("shell"));
        max_armour 	= 0.60 + shell/10 + (hardened_count -1 )/100;
        print(hardened_count)
        print(hardened_bonus[hardened_count])
        print(Attr("can_dig"))
        print("dig")
        setattribute("armour", Attr("armour") + (shell / 10) + ((3 ^ hardened_count)/3)/100);
        setattribute("armour", min(Attr("armour"), max_armour));
    -----------------
    -----------------
    -- Attributes ---
    -----------------
    -----------------

        --Mobility attributes:
        has_flying		= Attr( "is_flyer" );
        has_swim		= Attr( "is_swimmer" );
        has_land		= Attr( "is_land" );

        --Set Limits --flag
        --setattribute("armour", min(Attr("armour"), max_armour)); defined in prior section
        setattribute("sight_radius1", min(max(Attr("sight_radius1"), min_sight), max_sight));

        if (has_land == 0 and has_swim == 0 and has_flying == 0) then
            has_land = 1
        end

        if has_land == 1 then
            setattribute("speed_max", max(Attr("speed_max"), min_landspeed));
        end

        if has_swim == 1 then
            setattribute("waterspeed_max", max(Attr("waterspeed_max"), min_waterspeed));
        end

        if has_flying == 1 then
            setattribute("airspeed_max", max(Attr("airspeed_max"), min_airspeed));
        end

        ehp_flyer_factor = ((has_flying==1) and ehp_flyer_mult or 1);
        damage_flyer_factor = ((has_flying==1) and damage_flyer_mult or 1);
        mobility_flyer_factor = ((has_flying==1) and mobility_flyer_mult or 1);

        --Create derived attributes:
        setattribute("ehp", Attr( "hitpoints" )/(1-Attr( "armour" ))); --effective HP, a measure of HP and defense. Used for power, doesn't account for flyer bonus.
        setattribute("cost_ehp", Attr( "ehp" ) * ehp_flyer_factor); --EHP with flyer bonus accounted for.
        setattribute("scaling_size", Attr("size"));  --For creatures over size 9, this is their size as displayed in army builder; their "size" attribute will be set to 10 or 9 in the Size Hack section.
        setattribute("range_damage", 0);   --the maximum damage dealt by all of the creature's ranged attacks.
        setattribute("range_distance", 0);  --the ranged attack distance of the unit.
        setattribute("range_damage_distance", 0); --an equivalent melee damage based on a creature's ranged attack attributes. Uses damage and distance
        setattribute("mixed_dps", 0);       --an equivalent melee damage based on all of a creature's attack attributes.
        setattribute("mobility", 0);        --an equivalent land speed based on all of a creature's speed attributes.
        setattribute("power_rank", 0);      --the rank of the creature based on power alone.
        setattribute("effective_melee", Attr("melee_damage") * damage_flyer_factor); --Melee damage, multiplied by a flyer-specific factor, used for cost calcs.

        -- Let's calculate the extra EHP we receive from herding here, and store it as an attribute. We'll build a domain from it later.
        setattribute("herding_ehp_bonus", 0);

        if (Attr("herding") == 1) then
            extraArmour = (Attr( "armour" )*(herding_def_multiplier - 1));
            armourOverCap = max(0, (Attr( "armour" ) + extraArmour) - max_armour);
            cappedExtraArmour = extraArmour - armourOverCap;

            setattribute("herding_ehp_bonus", ( (Attr( "hitpoints" ) * ehp_flyer_factor )/(1-(Attr( "armour" ) + cappedExtraArmour))) - Attr( "cost_ehp" ) );
        end

        cost_coal       = 0;
        cost_elec       = 0;

        -- Ranged attributes:
        -- These will be set to flag if the creature has any direct or any artillery range attack.
        has_range = nil;
        has_direct = nil;
        has_sonic = nil;
        setattribute("has_artillery", 0);

        BodyPartsThatCanHaveRange = { 2, 3, 4, 5, 8 };
        -- determine type of ranged attack and set range damage to be equal to the
        -- highest damage ranged attack, with range_distance being the minimum ranged distance.

        --pairsBelow
        has_range = 0
        for index, part in BodyPartsThatCanHaveRange do
            --endPairs
            part_damage 	= get_range_var( part, "damage" );
            part_range 		= get_range_var( part, "max" ); --Attr( "range" .. part .. "_max" );
            part_dtype 		= get_range_var( part, "dmgtype" ); --Attr( "range" .. part .. "_dmgtype" );

            if ( part_damage > 0 ) then
                has_range = 1;

                --Set flying range distance limit
                if (has_flying == 1 and (part_range > max_flyer_range_dist)) then
                    part_range = max_flyer_range_dist;
                    setattribute("range"..part.."_max", max_flyer_range_dist);
                end

                --Find part with shortest range distance and set it as range_distance.
                --Creatures with multiple range limbs travel to shortest distance before attacking, so use this for future calculations.
                if ( part_range < Attr("range_distance") ) or Attr("range_distance") == 0 then
                    setattribute("range_distance", part_range);
                end

                --If creature has multiple range attacks, use maximum damage one
                if ( part_damage > Attr("range_damage") ) or Attr("range_damage") == 0 then
                    setattribute("range_damage", part_damage);
                    if ( range_artillerytype( part ) ~= 0 ) then
                        setattribute("artillery_damage", Attr("range_damage") * artillery_targets_hit);
                    end

                end

                if ( range_artillerytype( part ) == 0 ) then
                    if ( part_dtype == 16 ) then --sonic attack identified
                        has_sonic = 1;
                    else --directranged, non-sonic
                        has_direct = 1;
                    end

                else --artillery
                    setattribute("has_artillery", 1);

                end
            end
        end
        
        print( "has range: ")
        print( has_range )
        print( "bipedal: ")
        print( Attr( "bipedal" ) )
        if has_range == 0 then 
            if Attr( "bipedal" ) == 1 then
                has_land = 1;
                setattribute("is_land", 1);
                setattribute("speed_max", max(Attr("speed_max"), min_landspeed))
            end 
        end
        print( "land: ")
        print( has_land )
        print( "land ")
        print( Attr( "is_land" ) ) 

        if (Attr("underpopulation") == 1) then
            setattribute("overpopulation", 0);
        end
        
        -- Helpful variable here, used later.
        setattribute("non_flyer_direct_range", 0);
        setattribute("flyer_direct_range", 0);

        if (has_sonic == 1 or has_direct == 1) then
            if (has_flying == 0) then
                setattribute("non_flyer_direct_range", 1);
            else
                setattribute("flyer_direct_range", 1);
            end
        end

        -- Finally, unusable abilities are removed
        if (has_range == 1) then
            setattribute("charge_attack", 0);
            setattribute("leap_attack", 0);

            --Give frog leap attack back when combined with itself (for creature selection)
            if (Attr("lefthalf_name") == 24134 and Attr("righthalf_name") == 24135) then
                setattribute("leap_attack", 1);
            end
        end

-- Gray
     --   if (has_flying == 1) then
      --      setattribute("can_dig", 0);
      --      setattribute("leap_attack", 0);
       --     setattribute("charge_attack", 0);
       --     setattribute("can_SRF", 0);
       --     setattribute("electric_burst", 0); -- disable electric burst for flyers



      --  end

        if (has_swim == 1 and has_land == 0) then
            setattribute("can_dig", 0);
        end

        if (Attr("pack_hunter") == 1 and Attr("herding") == 1) then
            setattribute("herding", 0);
        end

        --Not unusable, but removing so that loner units won't be charged for herding or pack hunter
        if (Attr("loner") == 1) then
            setattribute("herding", 0);
            setattribute("pack_hunter", 0);
        end


    ------------------------
    ------------------------
    -- Domain Definitions --
    ------------------------
    ------------------------

        --Set points for shapevalue curves; these represent the (more or less) maximum values of attributes,
        --which are then used as the max points for the domains they represent. They're paired with this creature's
        --specific value for the given attribute, used for actual scaling.
        dom_max = 1;
        dom_val = 2;

        power_domain            = {1500,  "Power"};
        true_size_domain        = {10,    "size"};
        scaling_size_domain     = {13,    "scaling_size"}; --For creatures over size 9, this their size as displayed in army builder.
        ehp_domain              = {3000,  "ehp"};
        cost_ehp_domain         = {3000,  "cost_ehp"};
        melee_dps_domain        = {100,   "melee_damage"}; --Pure melee damage (for power calcs)
        eff_melee_dps_domain    = {100,   "effective_melee"}; --Pure melee damage with flyer adjustment (for cost calcs)
        range_dps_domain        = {50,    "range_damage"}; --Pure range damage, no distance
        artillery_dps_domain    = {50,    "artillery_damage"}; --Artillery damage with adjustment for area of effect
        distance_domain         = {100,   "range_distance"};
        dist_dam_domain         = {100,   "range_damage_distance"}; --Ranged DPS factor incorporating distance
        mixed_dps_domain        = {100,   "mixed_dps"};  --Combined melee and damage_distance from ranged (for power calcs)
        eff_mixed_dps_domain    = {100,   "effective_mixed_dps"};  --Mixed DPS with melee flyer adjustment (for cost calcs)
        defense_domain          = {60,    "armour"};
        rank_domain             = {5,     "creature_rank"}; --NOTE: rank value changes based on ability requirements; rank_doman[2] is thus updated later.
        landspeed_domain        = {45,    "speed_max"};
        waterspeed_domain       = {47,    "waterspeed_max"};
        airspeed_domain         = {40,    "airspeed_max"};
        mobility_domain         = {60,    "mobility"};
        sight_domain            = {50,    "sight_radius1"};
        herd_boost_domain       = {700,  "herding_ehp_bonus"}; -- Extra EHP gained from herding (about 700 for musk ox blue whale!)
        null_domain             = {1,     "null"};

        --Use the null domain when you don't want to scale on either (or both) of the x and y axes.
        --To get a constant unscaled cost, set all xy numbers to 0 and then set x0y0 to equal your desired cost.

        --A NOTE ON BALANCING WITH ABILITY REF POINTS:
        --Select your domains based on what two factors you want to influence the cost of the ability.
        --For example, if you want to balance an ability based on EHP and damage, select those as your domains.
        --This will have the effect of letting you balance an ability to benefit either glassy or meaty units.
        --ADVANCED NOTE: SuiCo for "average" [Norbert] units is around 27, though it changes with level.
        --SUPERADVANCED NOTE: It's possible to rewrite this system to use gradients and shapevalue; this would allow us
        --to completely remove the domains, but it's a little less clear to understand.

    ------------------------
    ------------------------
    -- Effective Mobility --
    ------------------------
    ------------------------

        --Now we calculate effective mobility. Note: only having landspeed is the default case (speed = speed_max).
        if (has_flying == 1) then
            setattribute("mobility", Attr( "airspeed_max" )* mobility_flyer_factor);
        else
            setattribute("mobility",ShapeValueCurve(landspeed_domain, waterspeed_domain, 0, 40, 28, 45));
        end

    --------------------------
    --------------------------
    ------ Range Power -------
    --------------------------
    --------------------------

        -- Now we sort out power and costs on ranged attacks. The following code also
        -- determines how to charge multiple ranged attacks.
        -- NOTE: It is possible, using this method, that combining ranged attacks could
        -- result in unintended cost discounts for very exotic art/range combos.
        if ( has_range == 1 ) then
            -- Ask if one of the range attacks is sonic.
            if ( has_sonic == 1 ) then
                    setattribute("range_damage_distance", ShapeValueCurve(range_dps_domain, distance_domain, 0, 5, 35, 380));

            elseif ( has_direct == 1 ) then  -- Ask if one of the range attacks is not artillery.
                    --setattribute("range_damage_distance", ShapeValueCurve(range_dps_domain, distance_domain, 0, 10, 10, 320));
                    -- below is ok, but short range is still a bit too pricey:
                    --setattribute("range_damage_distance", ShapeValueCurve(range_dps_domain, distance_domain, 0, 5, 30, 320));
                    setattribute("range_damage_distance", ShapeValueCurve(range_dps_domain, distance_domain, 0, 0, 30, 320));

            else -- Then we've got only an artillery attack.
                --Note that artillery dist_dam is a function of distance and damage, and then cost is a function of
                --dist_dam and distance, essentially allowing us to charge exponentially for distance.
                setattribute( "range_damage_distance", ShapeValueCurve(artillery_dps_domain, distance_domain, 0, 0, 8, 250));
            end

            setattribute("summed_damage", Attr("range_damage_distance") + Attr("melee_damage"))
        end

        if (has_range == 1) then
            if has_flying == 1 then --Flyer?
                if Attr("has_artillery") == 1 then
                    setattribute("mixed_dps", ShapeValueCurve(melee_dps_domain, dist_dam_domain, 0, 30, 110, 120));
                    setattribute("effective_mixed_dps", ShapeValueCurve(eff_melee_dps_domain, dist_dam_domain, 0, 30, 110, 120));
                else
                    -- For flying direct range, ranged distance is basically useless (theoretically), so just set RDD to damage multiplied by the flyer_damage_mult.
                    setattribute( "range_damage_distance", Attr("range_damage") * damage_flyer_factor);
                    setattribute("mixed_dps", ShapeValueCurve(melee_dps_domain, dist_dam_domain, 0, 20, 90, 80));
                    setattribute("effective_mixed_dps", ShapeValueCurve(eff_melee_dps_domain, dist_dam_domain, 0, 20, 90, 80));
                end
            else --Otherwise, not a flyer.
                --Primtive fix for high-melee art; mixed DPS is just set manually to never go below melee DPS.                
                mixed_dps = ShapeValueCurve(melee_dps_domain, dist_dam_domain, 0, 50, 90, 100);
                setattribute("mixed_dps", max(Attr( "melee_damage" ), mixed_dps));
                setattribute("effective_mixed_dps", Attr("mixed_dps"));
            end
        else
            setattribute("mixed_dps", Attr( "melee_damage" ));
            setattribute("effective_mixed_dps", Attr("effective_melee"));
        end

    -----------------
    -----------------
    -----ranking-----
    -----------------
    -----------------

        setattribute( "Power", Power(Attr("ehp"), Attr("mixed_dps")) , Attr("creature_rank"));

        rank_cmp = {
            RankTable[1][max_pow],
            RankTable[2][max_pow],
            RankTable[3][max_pow],
            RankTable[4][max_pow],
            --Anything over level 4's max_pow will be level 5.
        };

        setattribute("power_rank", Rank( Attr("Power"), rank_cmp ));



    -----------------
    -----------------
    ----Size Hack----
    -----------------
    -----------------

        if Attr( "size" ) == 10 then
            setattribute("size", 9);
        elseif Attr( "size" ) > 10 then
            setattribute("size", 10);
        end



    -- remove duplicate web_throw

    if Attr("web_throw_front") == 1 then
        setattribute("web_throw", 0)
    end


    -----------------
    -----------------
    --ability costs--
    -----------------
    -----------------

        -- Ability type constants.
        ABT_Ability = 1;
        ABT_Melee = 2;
        ABT_Range = 3;

        -- Functions that are called with the ability id parameter and return a 1 if the ability is present.
        -- These correspond to the ability type constants above.
        ABT_CheckFunctions =
        {
            Attr,
            hasmeleedmgtype,
            hasrangedmgtype,
        };

        --The following abilities and damagetypes are missing from the table as they've been made redundant:
        --{ ABT_Ability, 	"poison_bite",          3, null_domain,     null_domain,            0,      0,      0,      0   },
        --{ ABT_Ability, 	"poison_sting",         3, null_domain,     null_domain,            0,      0,      0,      0   },
        --{ ABT_Ability, 	"poison_pincers",       3, null_domain,     null_domain,            0,      0,      0,      0   },

        --{ ABT_Range, 	DT_VenomSpray, 			3, null_domain,     null_domain,            0,   	0,	    0,      0   },	--DEFUNCT, now only poison is used.
        --Also note that a special 10th column is added to the table if an ability is found; this will carry the ability's calculated cost for later.
        AbilityRefPoints =
        {
        --{ ability_type,    ability_id, minimum_level, x_domain,            y_domain,      x0y0_cost, x1y0_cost, y1x0_cost, x1y1_cost}
            { ABT_Ability, 	"flash", 			      1, rank_domain, 	      null_domain,           15,     55, 	15,     55  },
            { ABT_Ability, 	"headflashdisplay", 	  1, rank_domain, 	      null_domain,           15,     55, 	15,     55  },
            { ABT_Ability, 	"stink_attack", 		  1, rank_domain, 	      null_domain,           0,      50, 	0,      50  },
            { ABT_Ability, 	"assassinate", 			  1, rank_domain, 	      null_domain,          -10,     90,    -10,     90  },
            { ABT_Ability, 	"can_SRF", 			      2, rank_domain, 	      null_domain,           20,     45, 	20,     45  },
            { ABT_Ability, 	"AutoDefense", 	          1, rank_domain,         null_domain, 	         0,      20,     0,     20  },
            { ABT_Ability, 	"plague_attack", 	      1, rank_domain,         null_domain, 	         5,      80,     5,      80  },
            { ABT_Ability,  "sonar_pulse",            1, rank_domain,         null_domain,           10,     35,     10,     35  },
            { ABT_Ability, 	"quill_burst",            2, rank_domain,         null_domain,           10,     35,     10,     35  },
            { ABT_Ability, 	"electric_burst",     	  1, rank_domain, 	      null_domain, 	         10,     35,    10,     35 },
            { ABT_Ability, 	"web_throw",     	      3, rank_domain, 	      null_domain, 	         20,     90,     20,     90  },
            { ABT_Ability, 	"web_throw_front",        3, rank_domain, 	      null_domain, 	         20,     90,     20,     90  },
            { ABT_Ability, 	"poison_touch",     	  3, rank_domain, 	      null_domain, 	        -20,     70,    -20,     70  },
            { ABT_Ability, 	"poplow",                 1, null_domain,         null_domain,           0,      0,      0,      0   },	--special
            { ABT_Ability, 	"poplowtorso",            1, null_domain,         null_domain,           0,      0,      0,      0   },	--special
            { ABT_Ability, 	"is_swimmer",             2, null_domain,         null_domain,           0,      0,      0,      0   },	--special
            { ABT_Ability,  "keen_sense",             1, null_domain,         null_domain,           10,     0,      0,      0   },
            { ABT_Ability,  "infestation",            2, mobility_domain,     cost_ehp_domain,       10,     25,     20,     27.5  },
            { ABT_Ability,  "end_bonus",              1, null_domain,         null_domain,           5,      0,      0,      0   },
            { ABT_Ability, 	"loner",     			  3, power_domain, 	      null_domain, 	         100,    650,    100,    650 },
            { ABT_Ability, 	"overpopulation",         1, power_domain,        null_domain,           0,      150,    0,      150 },
            { ABT_Ability,  "soiled_land",            3, mobility_domain,     rank_domain,           30,     90,     50,     110 },
            { ABT_Ability, 	"is_immune", 		      1, power_domain, 	      defense_domain, 	     1,     85,     50,     100  },
            { ABT_Ability, 	"deflection_armour",      2, cost_ehp_domain,     rank_domain,           10,     240,    20,     200 },
            { ABT_Ability, 	"herding", 			      1, herd_boost_domain,   eff_mixed_dps_domain,  0,      180,    50,     320 },
            { ABT_Ability, 	"pack_hunter", 		      1, cost_ehp_domain,     eff_mixed_dps_domain,  0,      130, 	95, 	 390 },	
            { ABT_Ability, 	"is_stealthy", 		      1, cost_ehp_domain,     eff_mixed_dps_domain,  0,      90,     180, 	 100 },
            { ABT_Ability, 	"can_dig", 			      1, cost_ehp_domain,     eff_mixed_dps_domain,  0,      60, 	150, 	 210 },
            { ABT_Ability, 	"regeneration", 	      1, cost_ehp_domain,     eff_mixed_dps_domain,  5,      90, 	90,     200 },
            { ABT_Ability, 	"frenzy_attack", 	      1, cost_ehp_domain,     eff_mixed_dps_domain,  0,      60, 	100, 	 200 },
            { ABT_Ability, 	"is_flyer",     		  1, null_domain, 	      null_domain, 	         0,      0,      0,      0   },
            { ABT_Ability, 	"ranged_piercing", 	      1, cost_ehp_domain,     range_dps_domain,      5,      180, 	 180, 	 250 },
            { ABT_Ability, 	"leap_attack", 	          2, cost_ehp_domain,     eff_melee_dps_domain,  15,      30,     40,     50  },
            { ABT_Ability, 	"charge_attack", 	      2, cost_ehp_domain,     eff_melee_dps_domain,  10,     45,     65,     80  },
            { ABT_Ability,  "flyer_direct_range",     1, cost_ehp_domain,     range_dps_domain,      0,      95,     80,     250 },
            { ABT_Ability,  "non_flyer_direct_range", 1, null_domain,         null_domain,           0,      0,      0,      0   },  --special case, but it really shouldn't be... TODO: fix this
            { ABT_Ability,  "has_artillery",          1, dist_dam_domain,     distance_domain,       0,      20,     75,     225 },
            { ABT_Ability,  "overpopulation",         1, rank_domain,         null_domain,           10,     50,    1,      50 },
            { ABT_Ability,  "hardened_head",          1, null_domain,         null_domain,           10,     0,      0,        10},
            { ABT_Ability,  "hardened_front",         1, null_domain,         null_domain,           10,     0,      0,        10},
            { ABT_Ability,  "hardened_torso",         1, null_domain,         null_domain,           10,     0,      0,        10},
            { ABT_Ability,  "hardened_back",          1, null_domain,         null_domain,           10,     0,      0,        10},
            { ABT_Ability,  "hardened_tail",          1, null_domain,         null_domain,           10,     0,      0,        10},
            { ABT_Ability,  "shell",                  1, null_domain,         null_domain,           40,     0,      0,        40},
        
            { ABT_Range, 	DT_Electric, 		      2, null_domain,         null_domain,           0,      0, 	 0,	     0   },	--special
            { ABT_Range, 	DT_Sonic, 			      2, null_domain,         null_domain,           0,   	 0,	     0,      0   },	--special
            { ABT_Range, 	DT_Poison,	              3, rank_domain,         null_domain,          -20,     40,    -20,     40  },	--Cost for chemical artillery (which has the melee poison damagetype).
 
            { ABT_Melee,    DT_Poison,                3, rank_domain,         null_domain,          -20,     80,    -20,     80  },
            { ABT_Melee, 	DT_HornNegateFull, 	      2, rank_domain,         null_domain,           10,     50,     10, 	 50  },
            { ABT_Melee, 	DT_BarrierDestroy,        1, ehp_domain,          melee_dps_domain,      0,      5,      10,     15 },
            { ABT_Melee, 	DT_HornNegateArmour,      1, cost_ehp_domain,     eff_melee_dps_domain, -15,     200, 	220, 	 250 }
        };

        --The variables below describe what each column of the AbilityRefPoints table represents.
        --"rc" is "Reference Column".
        rc_ability_type = 1;
        rc_id = 2;
        rc_min_rank = 3;
        rc_x_dom = 4;
        rc_y_dom = 5;
        rc_x0y0_cost = 6;
        rc_x1y0_cost = 7;
        rc_x0y1_cost = 8;
        rc_x1y1_cost = 9;
        ability_calculated_cost = 10;
        
        

        --First find min rank for all abilities.
        ability_rank = Attr("power_rank");

        --pairsStart
        for n, ab in AbilityRefPoints do
            --pairsEnd
            -- If we have this ability...
            if ABT_CheckFunctions[ab[rc_ability_type]]( ab[rc_id] ) == 1 then

                -- check for min rank.
                ability_rank = max(ability_rank, ab[rc_min_rank]);
            end
        end

        setattribute( "creature_rank",  max( Attr("power_rank"), ability_rank ) );

        --Now we add ability costs.
        charged_for_poison = 0;
        --pairsStart
        for n, ab in AbilityRefPoints do
            --pairsEnd

            ab[ability_calculated_cost] = 0;

            --If we have this ability...
            if ABT_CheckFunctions[ab[rc_ability_type]]( ab[rc_id] ) == 1 then

                ability_cost = ShapeValueCurve(ab[rc_x_dom], ab[rc_y_dom],
                        ab[rc_x0y0_cost], ab[rc_x1y0_cost], ab[rc_x0y1_cost], ab[rc_x1y1_cost]);

                -- Let's add a mobility cost to barrier destroy
                if (ab[rc_id] == DT_BarrierDestroy) then
                    mobility_fraction_on_domain = Attr("mobility") / mobility_domain[dom_max]
                    ability_cost = ability_cost * ((1.0 + mobility_fraction_on_domain) * 3.4)
                    end


                --If we have either melee or ranged poison DT, don't charge for poison touch.
                if (ab[rc_id] == "poison_touch" or ab[rc_id] == DT_Poison) then
                    if charged_for_poison == 0 then
                        charged_for_poison = 1;
                        ab[ability_calculated_cost] = ability_cost;
                    end

                -- Give pack hunter ranged units a tax (range units get more benefit from pack due to their ability to stack)
                elseif (ab[rc_id] == "pack_hunter" and has_range == 1) then
                    ab[ability_calculated_cost] = ability_cost * range_pack_hunter_mult;

				-- Zero out herding cost if it has no benefit; this should fall naturally out of the equations 
				-- (domains should have 0 at 0 herd-bonus) but those costs don't quite shake out nicely.
				elseif (ab[rc_id] == "herding" and Attr("herding_ehp_bonus") < 1.0) then
                    ab[ability_calculated_cost] = 0;

                --Poplow isn't charged on a curve.
                elseif (ab[rc_id] == "poplow" or ab[rc_id] == "poplowtorso") and ((Attr( "scaling_size" ) - Attr("creature_rank"))/2) > 1.0 then
                    poplow_benefit = floor(min(Attr("creature_rank") + 1, (Attr( "scaling_size" ) - Attr("creature_rank"))) / 2);
                    ab[ability_calculated_cost] = poplow_benefit * 10;

                elseif (ab[rc_id] == "has_artillery") and (has_flying == 1) then
                    ab[ability_calculated_cost] = ability_cost * flying_artillery_elec_mult;

                elseif (ab[rc_id] == "non_flyer_direct_range") then -- This should definitely just be on a curve!
                    if (has_sonic == 1) then
                        ab[ability_calculated_cost] = Attr("range_damage_distance") * sonic_elec_mult;
                    else
                        ab[ability_calculated_cost] = Attr("range_damage_distance") * direct_range_elec_mult;
                    end

                --All other abilities:
                else
                    ab[ability_calculated_cost] = ability_cost;
                end
            end
        end

    -----------------
    -----------------
    ----cost mods----
    -----------------
    -----------------
        
        --cost_power equation (power with a 10% rebate for defense, used for calculating costs).
        --Note that below we employ the ehp_flyer_factor directly onto hitpoints; multiplying hp by a factor and then calculating ehp
        --has the exact same result as multiplying ehp by that same factor.
        defense_rebate_ehp = ( Attr( "hitpoints" ) * ehp_flyer_factor ) / ( 1-(Attr( "armour" ) * defense_cost_multiplier) );
        --edit flag
	cRank = Attr("creature_rank");
    cMelee = Attr("melee_damage");
    cRanged = Attr("range_damage");
    cHealth = defense_rebate_ehp;
    cDps = Attr("effective_mixed_dps")

-- Check if unit has ranged damage or artillery (Made by Gray)
has_range = Attr("range_damage") > 0
has_artillery = Attr("has_artillery") == 1




-- Apply EHP-based cost discount ONLY if unit is melee-only (no ranged or artillery) (Gray)
ehp_dps_ratio = defense_rebate_ehp / max(Attr("effective_mixed_dps"), 1)  -- Avoid division by zero

if not has_range and not has_artillery then  -- Only apply discount for melee units
    if ehp_dps_ratio > 195 then
        cost_power = Power(defense_rebate_ehp * 0.745, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 25.5% discount
    elseif ehp_dps_ratio > 185 then
        cost_power = Power(defense_rebate_ehp * 0.760, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 24.0% discount
    elseif ehp_dps_ratio > 175 then
        cost_power = Power(defense_rebate_ehp * 0.775, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 22.5% discount
    elseif ehp_dps_ratio > 165 then
        cost_power = Power(defense_rebate_ehp * 0.790, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 21.0% discount
    elseif ehp_dps_ratio > 155 then
        cost_power = Power(defense_rebate_ehp * 0.805, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 19.5% discount
    elseif ehp_dps_ratio > 145 then
        cost_power = Power(defense_rebate_ehp * 0.820, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 18.0% discount
    elseif ehp_dps_ratio > 135 then
        cost_power = Power(defense_rebate_ehp * 0.835, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 16.5% discount
    elseif ehp_dps_ratio > 125 then
        cost_power = Power(defense_rebate_ehp * 0.850, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 15.0% discount
    elseif ehp_dps_ratio > 115 then
        cost_power = Power(defense_rebate_ehp * 0.865, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 13.5% discount
    elseif ehp_dps_ratio > 105 then
        cost_power = Power(defense_rebate_ehp * 0.880, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 12.0% discount
    elseif ehp_dps_ratio > 95 then
        cost_power = Power(defense_rebate_ehp * 0.895, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 10.5% discount
    elseif ehp_dps_ratio > 85 then
        cost_power = Power(defense_rebate_ehp * 0.910, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 9.0% discount
    elseif ehp_dps_ratio > 75 then
        cost_power = Power(defense_rebate_ehp * 0.925, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 7.5% discount
    elseif ehp_dps_ratio > 65 then
        cost_power = Power(defense_rebate_ehp * 0.940, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 6.0% discount
    elseif ehp_dps_ratio > 55 then
        cost_power = Power(defense_rebate_ehp * 0.955, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 4.5% discount
    elseif ehp_dps_ratio > 45 then
        cost_power = Power(defense_rebate_ehp * 0.970, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 3.0% discount
    elseif ehp_dps_ratio > 35 then
        cost_power = Power(defense_rebate_ehp * 0.980, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- 2.0% discount
    else
        cost_power = Power(defense_rebate_ehp, Attr("effective_mixed_dps"), Attr("creature_rank"))         -- No discount
    end
else
    cost_power = Power(defense_rebate_ehp, Attr("effective_mixed_dps"), Attr("creature_rank"))  -- No discount for ranged/artillery units
end


    --cost_power = Power((cHealth ^ 2 / extra_rank(cRank) * (0.61+cMelee/62) * ((0.10 + (0.04 - max(0,(0.02 * max(cRank-2,1))))) / ((cMelee) + range_comp(cMelee,cRanged,cRank) + meat_comp(cMelee,cRanged,cRank))/ level_tune(cRank)) * glass_if((cMelee+cRanged), cRank))/(ehp_flyer_factor * 2 ), 1.5*cDps*mid_melee(cMelee,cRanged,cRank)); 
        -- removed lines from equations
        -- orginal glass if: (1+((Attr("melee_damage")*(Attr("melee_damage")))/Attr("creature_rank")/4) * (((((Attr("melee_damage") + Attr("range_damage")) * 10) > Attr("hitpoints")) and (Attr("melee_damage") > Attr("range_damage"))) and 1 or 0))))
        --range comp: (Attr("melee_damage") * 1 * (((Attr("range_damage") - Attr("melee_damage")) > 2) and 1 or 0)
        --meat comp: + Attr("melee_damage") * 1.8 * (((Attr("effective_mixed_dps") < 7) and (Attr("creature_rank") > 2)) and 1 or 0 )+ 1.8 * Attr("melee_damage") * (((Attr("effective_mixed_dps") < 3)) and (Attr("creature_rank") < 3) and 1 or 0)
        --level comp: / (((Attr("creature_rank") > 3) and 1 or 0) * (Attr("creature_rank")/5 ) + 1)----------------------------
        --mobility cost multiplier--
        ----------------------------

        mobility_cost = ((Attr("mobility")/mobility_divisor)^( (has_flying==1) and flyer_mobility_exp or mobility_exp));


        --------------
        --sight cost--
        --------------

        sightCost = (Attr( "sight_radius1" )-min_sight)*sight_cost_multiplier;

        -- FINAL COST CALCULATION AND SCALING.
        --Intra-level modulator changes the costs of spam units relative to power units.
        intra_level_modulator = (cost_power*1.3/RankTable[Attr("creature_rank")][max_pow])^(RankTable[Attr("creature_rank")][cost_exponent]);
        setattribute("final_cost_scaler", intra_level_modulator);

        --If the unit has direct range or sonic and DOES NOT fly, add a multiplier to coal cost.
        cost_coal = (sightCost + RankTable[Attr("creature_rank")][base_coal_cost] * mobility_cost * 1.1 * ((Attr("non_flyer_direct_range") == 1) and ranged_coal_cost_mult or 1)) * Attr("final_cost_scaler");


-- === Melee-only Power-Based Coal Discount (Gray)
-- === Creature Rank-Based Melee Power Discount (Ground Melee Units Only) ===
if not has_range and not has_artillery and Attr("is_flyer") == 0 then
    local power_val = Attr("Power")
    local rank = Attr("creature_rank")

-- Rank 2: Power 60–115
if rank == 2 then
    if power_val < 65 then
        cost_coal = cost_coal * 0.96  -- 5% discount
        setattribute("melee_discount_tag", "rank2_power_60_64")
    elseif power_val < 70 then
        cost_coal = cost_coal * 0.96  -- 5% discount
        setattribute("melee_discount_tag", "rank2_power_65_69")
    elseif power_val < 75 then
        cost_coal = cost_coal * 0.96  -- 5% discount
        setattribute("melee_discount_tag", "rank2_power_70_74")
    elseif power_val < 80 then
        cost_coal = cost_coal * 0.96  -- 5% discount
        setattribute("melee_discount_tag", "rank2_power_75_79")
    elseif power_val < 85 then
        cost_coal = cost_coal * 0.96  -- 5% discount
        setattribute("melee_discount_tag", "rank2_power_80_84")
    elseif power_val < 90 then
        cost_coal = cost_coal * 0.96  -- 5% discount
        setattribute("melee_discount_tag", "rank2_power_85_89")
    elseif power_val < 95 then
        cost_coal = cost_coal * 0.95  -- 5% discount
        setattribute("melee_discount_tag", "rank2_power_90_94")
    elseif power_val < 100 then
        cost_coal = cost_coal * 0.955  -- 4.5% discount
        setattribute("melee_discount_tag", "rank2_power_95_99")
    elseif power_val < 105 then
        cost_coal = cost_coal * 0.96   -- 4% discount
        setattribute("melee_discount_tag", "rank2_power_100_104")
    elseif power_val < 110 then
        cost_coal = cost_coal * 0.97  -- 3% discount
        setattribute("melee_discount_tag", "rank2_power_105_109")
    elseif power_val <= 114 then
        cost_coal = cost_coal * 0.98   -- 2% discount
        setattribute("melee_discount_tag", "rank2_power_110_114")
    end

-- Rank 3: Power 120–225
elseif rank == 3 then
    if power_val < 130 then
        cost_coal = cost_coal * 0.92  -- 8% discount
        setattribute("melee_discount_tag", "rank3_power_120_129")
    elseif power_val < 140 then
        cost_coal = cost_coal * 0.925  -- 7.5% discount
        setattribute("melee_discount_tag", "rank3_power_130_139")
    elseif power_val < 150 then
        cost_coal = cost_coal * 0.93  -- 7% discount
        setattribute("melee_discount_tag", "rank3_power_140_149")
    elseif power_val < 160 then
        cost_coal = cost_coal * 0.935  -- 6.5% discount
        setattribute("melee_discount_tag", "rank3_power_150_159")
    elseif power_val < 170 then
        cost_coal = cost_coal * 0.94  -- 6% discount
        setattribute("melee_discount_tag", "rank3_power_160_169")
    elseif power_val < 180 then
        cost_coal = cost_coal * 0.945  -- 5.5% discount
        setattribute("melee_discount_tag", "rank3_power_170_179")
    elseif power_val < 190 then
        cost_coal = cost_coal * 0.95  -- 5% discount
        setattribute("melee_discount_tag", "rank3_power_180_189")
    elseif power_val < 200 then
        cost_coal = cost_coal * 0.96  -- 4% discount
        setattribute("melee_discount_tag", "rank3_power_190_199")
    elseif power_val < 210 then
        cost_coal = cost_coal * 0.965  -- 3% discount
        setattribute("melee_discount_tag", "rank3_power_200_209")
    elseif power_val < 220 then
        cost_coal = cost_coal * 0.97  -- 2% discount
        setattribute("melee_discount_tag", "rank3_power_210_219")
 elseif power_val <= 225 then
        cost_coal = cost_coal * 0.97  -- 1% discount
        setattribute("melee_discount_tag", "rank3_power_220_225")

    end

-- Rank 4: Power 230–390, intervals of 10, starting at 8% discount, decreasing 0.5% per interval
elseif rank == 4 then
    if power_val < 240 then
        cost_coal = cost_coal * 0.92   -- 8.0% discount
        setattribute("melee_discount_tag", "rank4_power_230_239")
    elseif power_val < 250 then
        cost_coal = cost_coal * 0.925  -- 7.5% discount
        setattribute("melee_discount_tag", "rank4_power_240_249")
    elseif power_val < 260 then
        cost_coal = cost_coal * 0.93   -- 7.0% discount
        setattribute("melee_discount_tag", "rank4_power_250_259")
    elseif power_val < 270 then
        cost_coal = cost_coal * 0.935  -- 6.5% discount
        setattribute("melee_discount_tag", "rank4_power_260_269")
    elseif power_val < 280 then
        cost_coal = cost_coal * 0.94   -- 6.0% discount
        setattribute("melee_discount_tag", "rank4_power_270_279")
    elseif power_val < 290 then
        cost_coal = cost_coal * 0.945  -- 5.5% discount
        setattribute("melee_discount_tag", "rank4_power_280_289")
    elseif power_val < 300 then
        cost_coal = cost_coal * 0.95   -- 5.0% discount
        setattribute("melee_discount_tag", "rank4_power_290_299")
    elseif power_val < 310 then
        cost_coal = cost_coal * 0.955  -- 4.5% discount
        setattribute("melee_discount_tag", "rank4_power_300_309")
    elseif power_val < 320 then
        cost_coal = cost_coal * 0.96   -- 4.0% discount
        setattribute("melee_discount_tag", "rank4_power_310_319")
    elseif power_val < 330 then
        cost_coal = cost_coal * 0.965  -- 3.5% discount
        setattribute("melee_discount_tag", "rank4_power_320_329")
    elseif power_val < 340 then
        cost_coal = cost_coal * 0.97   -- 3.0% discount
        setattribute("melee_discount_tag", "rank4_power_330_339")
    elseif power_val < 350 then
        cost_coal = cost_coal * 0.975  -- 2.5% discount
        setattribute("melee_discount_tag", "rank4_power_340_349")
    elseif power_val < 360 then
        cost_coal = cost_coal * 0.98   -- 2.0% discount
        setattribute("melee_discount_tag", "rank4_power_350_359")
    elseif power_val < 370 then
        cost_coal = cost_coal * 0.985  -- 1.5% discount
        setattribute("melee_discount_tag", "rank4_power_360_369")
    elseif power_val < 380 then
        cost_coal = cost_coal * 0.99   -- 1.0% discount
        setattribute("melee_discount_tag", "rank4_power_370_379")
    elseif power_val < 390 then
        cost_coal = cost_coal * 0.995   -- 0.5% discount
        setattribute("melee_discount_tag", "rank4_power_380_389")
    end


-- Rank 5: Power 500–1550
elseif rank == 5 and power_val >= 500 then
    if power_val < 550 then
        cost_coal = cost_coal * 0.98   -- 2% discount
        setattribute("melee_discount_tag", "rank5_power_500_549")
    elseif power_val < 600 then
        cost_coal = cost_coal * 0.97   -- 3% discount
        setattribute("melee_discount_tag", "rank5_power_550_599")
    elseif power_val < 650 then
        cost_coal = cost_coal * 0.96   -- 4% discount
        setattribute("melee_discount_tag", "rank5_power_600_649")
    elseif power_val < 700 then
        cost_coal = cost_coal * 0.95   -- 5% discount
        setattribute("melee_discount_tag", "rank5_power_650_699")
    elseif power_val < 750 then
        cost_coal = cost_coal * 0.94   -- 6% discount
        setattribute("melee_discount_tag", "rank5_power_700_749")
    elseif power_val < 800 then
        cost_coal = cost_coal * 0.93   -- 7% discount
        setattribute("melee_discount_tag", "rank5_power_750_799")
    elseif power_val < 850 then
        cost_coal = cost_coal * 0.92   -- 8% discount
        setattribute("melee_discount_tag", "rank5_power_800_849")
    elseif power_val < 900 then
        cost_coal = cost_coal * 0.91   -- 9% discount
        setattribute("melee_discount_tag", "rank5_power_850_899")
    elseif power_val < 950 then
        cost_coal = cost_coal * 0.90   -- 10% discount
        setattribute("melee_discount_tag", "rank5_power_900_949")
    elseif power_val < 1000 then
        cost_coal = cost_coal * 0.89   -- 11% discount
        setattribute("melee_discount_tag", "rank5_power_950_999")
    elseif power_val < 1050 then
        cost_coal = cost_coal * 0.88   -- 12% discount
        setattribute("melee_discount_tag", "rank5_power_1000_1049")
    elseif power_val < 1100 then
        cost_coal = cost_coal * 0.87   -- 13% discount
        setattribute("melee_discount_tag", "rank5_power_1050_1099")
    elseif power_val < 1150 then
        cost_coal = cost_coal * 0.86   -- 14% discount
        setattribute("melee_discount_tag", "rank5_power_1100_1149")
    elseif power_val < 1200 then
        cost_coal = cost_coal * 0.85   -- 15% discount
        setattribute("melee_discount_tag", "rank5_power_1150_1199")
    elseif power_val < 1250 then
        cost_coal = cost_coal * 0.84   -- 16% discount
        setattribute("melee_discount_tag", "rank5_power_1200_1249")
    elseif power_val < 1300 then
        cost_coal = cost_coal * 0.83   -- 17% discount
        setattribute("melee_discount_tag", "rank5_power_1250_1299")
    elseif power_val < 1350 then
        cost_coal = cost_coal * 0.82   -- 18% discount
        setattribute("melee_discount_tag", "rank5_power_1300_1349")
    elseif power_val < 1400 then
        cost_coal = cost_coal * 0.81   -- 19% discount
        setattribute("melee_discount_tag", "rank5_power_1350_1399")
    elseif power_val < 1450 then
        cost_coal = cost_coal * 0.80   -- 20% discount
        setattribute("melee_discount_tag", "rank5_power_1400_1449")
    elseif power_val < 1500 then
        cost_coal = cost_coal * 0.79   -- 21% discount
        setattribute("melee_discount_tag", "rank5_power_1450_1499")
    elseif power_val < 1550 then
        cost_coal = cost_coal * 0.78   -- 22% discount
        setattribute("melee_discount_tag", "rank5_power_1500_1549")
    elseif power_val <= 1550 then
        cost_coal = cost_coal * 0.77   -- 23% discount
        setattribute("melee_discount_tag", "rank5_power_1550")
    end





end
end



-- === Ranged-only Power-Based Coal Discount (Rank 5) === (Gray)
if has_range and not has_artillery and Attr("is_flyer") == 0 then
    local power_val = Attr("Power")
    local rank = Attr("creature_rank")

-- Rank 5: Power 400–1500
if rank == 5 then
    if power_val < 450 then
        cost_coal = cost_coal * 0.97   -- 3.0%
        setattribute("ranged_discount_tag", "rank5_power_400_449")
    elseif power_val < 500 then
        cost_coal = cost_coal * 0.955  -- 4.5%
        setattribute("ranged_discount_tag", "rank5_power_450_499")
    elseif power_val < 550 then
        cost_coal = cost_coal * 0.94   -- 6.0%
        setattribute("ranged_discount_tag", "rank5_power_500_549")
    elseif power_val < 600 then
        cost_coal = cost_coal * 0.925  -- 7.5%
        setattribute("ranged_discount_tag", "rank5_power_550_599")
    elseif power_val < 650 then
        cost_coal = cost_coal * 0.91   -- 9.0%
        setattribute("ranged_discount_tag", "rank5_power_600_649")
    elseif power_val < 700 then
        cost_coal = cost_coal * 0.895  -- 10.5%
        setattribute("ranged_discount_tag", "rank5_power_650_699")
    elseif power_val < 750 then
        cost_coal = cost_coal * 0.88   -- 12.0%
        setattribute("ranged_discount_tag", "rank5_power_700_749")
    elseif power_val < 800 then
        cost_coal = cost_coal * 0.865  -- 13.5%
        setattribute("ranged_discount_tag", "rank5_power_750_799")
    elseif power_val < 850 then
        cost_coal = cost_coal * 0.85   -- 15.0%
        setattribute("ranged_discount_tag", "rank5_power_800_849")
    elseif power_val < 900 then
        cost_coal = cost_coal * 0.835  -- 16.5%
        setattribute("ranged_discount_tag", "rank5_power_850_899")
    elseif power_val < 950 then
        cost_coal = cost_coal * 0.82   -- 18.0%
        setattribute("ranged_discount_tag", "rank5_power_900_949")
    elseif power_val < 1000 then
        cost_coal = cost_coal * 0.805  -- 19.5%
        setattribute("ranged_discount_tag", "rank5_power_950_999")
    elseif power_val < 1050 then
        cost_coal = cost_coal * 0.79   -- 21.0%
        setattribute("ranged_discount_tag", "rank5_power_1000_1049")
    elseif power_val < 1100 then
        cost_coal = cost_coal * 0.775  -- 22.5%
        setattribute("ranged_discount_tag", "rank5_power_1050_1099")
    elseif power_val < 1150 then
        cost_coal = cost_coal * 0.76   -- 24.0%
        setattribute("ranged_discount_tag", "rank5_power_1100_1149")
    elseif power_val < 1200 then
        cost_coal = cost_coal * 0.745  -- 25.5%
        setattribute("ranged_discount_tag", "rank5_power_1150_1199")
    elseif power_val < 1250 then
        cost_coal = cost_coal * 0.73   -- 27.0%
        setattribute("ranged_discount_tag", "rank5_power_1200_1249")
    elseif power_val < 1300 then
        cost_coal = cost_coal * 0.715  -- 28.5%
        setattribute("ranged_discount_tag", "rank5_power_1250_1299")
    elseif power_val < 1350 then
        cost_coal = cost_coal * 0.70   -- 30.0%
        setattribute("ranged_discount_tag", "rank5_power_1300_1349")
    elseif power_val < 1400 then
        cost_coal = cost_coal * 0.685  -- 31.5%
        setattribute("ranged_discount_tag", "rank5_power_1350_1399")
    elseif power_val < 1450 then
        cost_coal = cost_coal * 0.67   -- 33.0%
        setattribute("ranged_discount_tag", "rank5_power_1400_1449")
    elseif power_val <= 1500 then
        cost_coal = cost_coal * 0.655  -- 34.5%
        setattribute("ranged_discount_tag", "rank5_power_1450_1500")
    end
end
end

        total_abilities_cost = 0;

        --pairsStart
        -- This is where we scale all our previously-calculated ability costs.
        for n, ab in AbilityRefPoints do
        --pairsEnd
            if ab[ability_calculated_cost] > 0.0 then

                ability_name = ab[rc_id];

                --First, if we're dealing with a dt, we need to grab the string associated with it.
                --The first check makes sure ability_name is not a string.
                if ab[rc_ability_type] == ABT_Melee or ab[rc_ability_type] == ABT_Range then
                    for i, string_pair in DTStringTable do
                        if string_pair[dt_number] == ability_name then
                            ability_name = string_pair[dt_string];
                        end
                    end
                end

                --Let's not scale assassinate; logically I don't think it should be any cheaper on spam than it is on power.
                if ability_name == "assassinate" then
                    total_abilities_cost = total_abilities_cost + ab[ability_calculated_cost];
                else
                    scaled_ability_cost = ab[ability_calculated_cost] * Attr("final_cost_scaler");
                    setattribute("===--------------->>"..ability_name.."_cost", scaled_ability_cost);

                    total_abilities_cost = total_abilities_cost + scaled_ability_cost;
                end
            end
        end

        cost_elec = total_abilities_cost;
    

-- Apply artillery flyer cost penalty (Gray)
if (Attr("is_flyer") == 1) and (Attr("has_artillery") == 1) then
    cost_coal = cost_coal * 1.10
    print("Applied 10% coal cost increase for artillery flyer.")
end


setattribute("cost", cost_coal)


    -----------------
    -----------------
    -----outputs-----
    -----------------
    -----------------

        --Popspace calc. NOTE: Pop space is capped at creature level + 1.
        if (Attr("poplow") == 1) or (Attr("poplowtorso") == 1) then
            Pop = min(ceil(max(1, Attr( "scaling_size" ) - Attr("creature_rank")) / 2), Attr("creature_rank") + 1);
        else
            Pop = min(max(1, Attr( "scaling_size" ) - Attr("creature_rank")), Attr("creature_rank") + 1);
        end

        --Buildtime calc
        --Overpop buildtime multiplier
        if (Attr("underpopulation") == 1) then
            setattribute("overpopulation", 0);
        
            build_time_multiplier = 2.5;
            setattribute("melee_damage", Attr("melee_damage") + UnderPop[cRank]);
            setattribute("armor", Attr("armor") + UnderPop[cRank]);
            setattribute("sight_radius1", Attr("sight_radius1") + UnderPop[cRank])
            if (Attr("speed_max") > 0) then
                setattribute("speed_max", Attr("speed_max") + UnderPop[cRank]);
            end
            if (Attr("waterspeed_max") > 0) then
                setattribute("waterspeed_max", Attr("waterspeed_max") + UnderPop[cRank]);
            end
            if (Attr("airspeed_max") > 0) then
                setattribute("airspeed_max", Attr("airspeed_max") + UnderPop[cRank]);
            end
            
        else
            
            if (Attr("overpopulation") == 1) then
                build_time_multiplier = 0.5;
            else
                build_time_multiplier = 1.0;
            end
        
        end
        --Overpop buildtime multiplier
        

        -- Build time equation
        build_time = (30 * Attr("creature_rank"))*((Attr("Power")*1.2/RankTable[Attr("creature_rank")][max_pow])^1.2)*build_time_multiplier;

        overpop_adjusted_min_build = ((has_flying==1) and flyer_min_build_time or min_build_time);
        setattribute("creature_rank", ( ((has_flying == 1) and (cRank == 1)) and 2 or cRank) );
        --set minimum build time
        if Attr("overpopulation") == 1 then
            overpop_adjusted_min_build = overpop_adjusted_min_build / 2;
        end

        build_time = max(build_time, overpop_adjusted_min_build);
        setattribute("constructionticks", build_time);
        
        --Final Output
        setattribute( "cost", cost_coal );
        setattribute( "costRenew", cost_elec );
        setattribute( "popsize", Pop );

    --deleteStart



    -----------------
    -----------------
    -------ui--------
    -----------------
    -----------------

        --deleteStart

        -- Attribute data column ids.
        AT_Name = 1;
        AT_ZeroOK = 2;
        AT_Min = 3;
        AT_Max = 4;
        AT_RankList = 5;
        AT_UIName = 6;
        AT_UIScale = 7;

        -- Game attribute bound and rank data.
        AttributeData =
        {
            -- { attribute name, zero ok, min, max, rank list, ui attribute name, game->ui scale factor }

            { "hitpoints",  nil, 1, nil, {0.0, 224.0, 349.0, 574.0}, "health", 1 },
            { "armour", 1, 0, nil, {0.0, 0.15, 0.30, 0.45}, "armour", 100 },
            { "speed_max", 1, min_landspeed, nil, {15.0, 21.0, 26.0, 31.0}, "landspeed", 1 },
            { "waterspeed_max", 1, min_waterspeed, nil, {12.0, 20.0, 25.0, 30.0}, "waterspeed", 1 },
            { "airspeed_max", 1, min_airspeed, nil, {16.0, 20.0, 24.0, 28.0}, "airspeed", 1 },
            { "sight_radius1", nil, nil, nil, {20.0, 30.0, 35.0, 45.0}, "sightradius", 1 },
            { "scaling_size", nil, 1, nil, {0, 3, 6, 9}, "size", 1},

            { "melee_damage", 1, 0, nil, {1.0, 10.0, 17.0, 26.0}, "damage",  1 },
            { "range2_max", 1, 0, nil, {1.0, 8.0, 14.0, 21.0}, "range2_max", 1 },
            { "range4_max", 1, 0, nil, {1.0, 8.0, 14.0, 21.0}, "range4_max", 1 },
            { "range5_max", 1, 0, nil, {1.0, 8.0, 14.0, 21.0}, "range5_max", 1 },
            { "range8_max", 1, 0, nil, {1.0, 8.0, 14.0, 21.0}, "range8_max", 1 },
            { "range3_max", 1, 0, nil, {1.0, 8.0, 14.0, 21.0}, "range3_max", 1 },
        };

        -- Accesses the "show_power" or "show_build_time" variable from attr_parameters.
        if (AttrParameters.show_power == 1) then
            AttributeData[6] = { "Power", nil, nil, nil, {rank2pow, rank3pow, rank4pow, rank5pow}, "sightradius", 1 }
        elseif (AttrParameters.show_build_time == 1) then
            AttributeData[6] = { "constructionticks", nil, nil, nil, {1, 40, 80, 120}, "sightradius", 1 }
        end

        -- Accesses "show_ehp" from attr_parameters.
        if (AttrParameters.show_ehp == 1) then
            AttributeData[1] = { "ehp", nil, 1, nil, {1, 200, 400, 600}, "health", 1}
        end

        -- Accesses "show_pop_space" from attr_parameters.
        if (AttrParameters.show_pop_space == 1) then
            AttributeData[7] = { "popsize", nil, 1, nil, {0, 2, 4, 6}, "size", 1}
        end

        -- Apply UI boundaries and UI rank attributes.

        for k, at in AttributeData do
            local attribute = at[AT_Name];
            local val = 0;
            local rating = 1;

            if checkgameattribute( attribute ) == 1 then

                val = Attr( attribute );

                -- Ranking.
                if at[AT_RankList] then
                    rating = Rank( val, at[AT_RankList]);
                end
            end

            if at[AT_UIName] then
                -- Add the rating to the creature's variable list -- rating is in the range [0-4].
                
                setattribute( at[AT_UIName].. "_rating", rating - 1 );
                -- Add the display version to the creature's variable list.
                setattribute( at[AT_UIName] .. "_val", val * at[AT_UIScale] );
            end

        end

        --Sets UI for damage icon and values of ranged attacks.
        --pairsBelow
        for index, part in BodyPartsThatCanHaveRange do
            --endPairs
            if checkgameattribute( "range"..part.."_damage" ) == 1 then
                val = Attr( "range"..part.."_damage" ) + ((Attr("underpopulation") == 1) and UnderPop[cRank] or 0);
                rating = Rank( val, {-1.0,12.0,20.0,26.0} ,Attr("is_flyer"));

                --It seems like for UI purposes, a creature is only considered "ranged" if it has ranged attributes
                --on part 2 or part 4. So for our stocks with non-2-or-4 range parts, we have to first create fake
                --ranged attributes on part 2; then we can create our attributes for the part we actually want,
                --and it all seems to work fine.
                if (part ~= 4 and part ~= 2) then
                    setattribute( "range2_damage_rating", rating - 1 );
                    setattribute( "range2_damage_val", val );
                end

                setattribute( "range"..part.."_damage_rating", rating - 1 );
                setattribute( "range"..part.."_damage_val", val );
            end
        end

        --deleteEnd
end
    --deleteEnd