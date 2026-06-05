---------------------------------------------------------------------
-- File    : taskbar.lua
-- Desc    :
-- Created : Wednesday, June 06, 2001
-- Author  :
--
-- (c) 2001 Relic Entertainment Inc.
--

-- * in-game taskbar script

--
-- imports
dofilepath("data:cheats.lua")
dofilepath("data:sigma/zutils_sigma.lua")

Henchman = {}
dofilepath("data:sigma/tuning.lua")

-- icons

	ICN_Structure = "ui/ingame/build_structure.tga"
	ICN_Structure_Unit = "ui/ingame/structure_unit.tga"
	ICN_Henchmen_Shadow = "ui/ingame/henchmen_shadow.tga"
	ICN_Creature_Shadow = "ui/ingame/enemycreatureicon.tga"
	ICN_Player_Color = "ui/screens/textures/player_color.tga"
	ICN_Dead_Color = "ui/screens/textures/player_kick.tga"
	ICN_Population_Color = "ui/ingame/unitcap_color.tga"
	ICN_Population = "ui/ingame/resource_unitcap.tga"
	ICN_Population_Dead = "ui/ingame/resource_unitcap_dead.tga"
	ICN_Henchpop = "ui/ingame/recource_henchpop.tga"
	ICN_Henchpop_Dead = "ui/ingame/recource_henchpop_dead.tga"
	ICN_Clock_Color = "ui/ingame/clock_color.tga"
	ICN_Scrap_Color = "ui/ingame/resource_scrap_color.tga"
	ICN_Electricity_Color = "ui/ingame/resource_electricity_color.tga"
	ICN_Resource_Scrap = "ui/ingame/resource_scrap.tga"
	ICN_Resource_Electricity = "ui/ingame/resource_electricity.tga"
	ICN_Resources_Shadow = "ui/ingame/resources_shadow.tga"
	ICN_Creature_Scrap = "ui/ingame/creature_scrap.tga"
	ICN_Creature_Electricity = "ui/ingame/creature_electricity.tga"
	ICNS_Rank_Color =  {
		"ui/ingame/rank1_color.tga",
		"ui/ingame/rank2_color.tga",
		"ui/ingame/rank3_color.tga",
		"ui/ingame/rank4_color.tga",
		"ui/ingame/rank5_color.tga",
	}

-- text ids

	TXT_None = 0 -- Empty space

-- hotkeys

	--GENERIC
	HK_System_Escape		= "keygroups.systemcommands.keys.escape"
	HK_System_Accept		= "keygroups.systemcommands.keys.accept"
	HK_System_CommandQueue	= "keygroups.systemcommands.keys.commandqueue"
	HK_System_Focus         = "keygroups.cameracontrol.keys.focus"

	HK_System_ZoomCameraIn  = "keygroups.cameracontrolfree.keys.keyzoomin"
	HK_System_ZoomCameraOut = "keygroups.cameracontrolfree.keys.keyzoomout"

	HK_Generic_Menu				= "keygroups.gamecommands.keys.showpausemenu"
	HK_Generic_Ally				= "keygroups.gamecommands.keys.showallymenu"
	HK_Generic_ArmyBuilder		= "keygroups.gamecommands.keys.showarmybuilder"
	HK_Generic_Players			= "keygroups.gamecommands.keys.showdiplomacymenu"
	HK_Generic_Objectives		= "keygroups.gamecommands.keys.showobjectivesmenu"
	HK_Generic_Event			= "keygroups.gamecommands.keys.gotolastevent"
	HK_Generic_TeamObjective	= "keygroups.gamecommands.keys.teamobjective"
	HK_Generic_RecallSpeech		= "keygroups.gamecommands.keys.recallspeech"

	-- ARMY BUTTONS
	HK_Build_Creature_1		= "keygroups.chambercommands.keys.buildcreature1"
	HK_Build_Creature_2		= "keygroups.chambercommands.keys.buildcreature2"
	HK_Build_Creature_3		= "keygroups.chambercommands.keys.buildcreature3"
	HK_Build_Creature_4		= "keygroups.chambercommands.keys.buildcreature4"
	HK_Build_Creature_5		= "keygroups.chambercommands.keys.buildcreature5"
	HK_Build_Creature_6		= "keygroups.chambercommands.keys.buildcreature6"
	HK_Build_Creature_7		= "keygroups.chambercommands.keys.buildcreature7"
	HK_Build_Creature_8		= "keygroups.chambercommands.keys.buildcreature8"
	HK_Build_Creature_9		= "keygroups.chambercommands.keys.buildcreature9"
	HK_Cancel_Build_All		= "keygroups.chambercommands.keys.cancelbuildall"
	HK_Cancel_Build_First	= "keygroups.chambercommands.keys.cancelbuildfirst"
	HK_Cancel_Build_Last	= "keygroups.chambercommands.keys.cancelbuildlast"

	-- CREATURE
	HK_Generic_Attack		= "keygroups.basicunitcommands.keys.attack"
	HK_Generic_Guard		= "keygroups.creaturecommands.keys.guard"
	HK_Generic_Patrol		= "keygroups.creaturecommands.keys.patrol"
	HK_Creature_NoStance		= "keygroups.creaturecommands.keys.stance_none"
	HK_Creature_Passive		= "keygroups.creaturecommands.keys.stance_passive"
	HK_Creature_Territorial		= "keygroups.creaturecommands.keys.stance_territorial"
	HK_Creature_Aggressive		= "keygroups.creaturecommands.keys.stance_aggressive"
	HK_Creature_RangeAttack		= "keygroups.creaturecommands.keys.rangeattack"
	HK_Creature_Special_Stink	= "keygroups.creaturecommands.keys.special_stink"
	HK_Creature_Special_Burst	= "keygroups.creaturecommands.keys.special_burst"
	HK_Creature_Special_Quill   	= "keygroups.creaturecommands.keys.special_quill"
	HK_Creature_Special_Frenzy	= "keygroups.creaturecommands.keys.special_frenzy"
	HK_Creature_Special_Digin	= "keygroups.creaturecommands.keys.special_digin"
	HK_Creature_Special_Digout	= "keygroups.creaturecommands.keys.special_digin"
	HK_Creature_Special_Jumping	= "keygroups.creaturecommands.keys.special_jumping"
	HK_Creature_Special_Dam		= "keygroups.creaturecommands.keys.special_dam"
	HK_Creature_Special_Sonar	= "keygroups.creaturecommands.keys.special_sonar"
	HK_Creature_Special_Plague	= "keygroups.creaturecommands.keys.special_plague"
	HK_Creature_Special_Web		= "keygroups.creaturecommands.keys.special_web"
	HK_Creature_Special_Assassinate	= "keygroups.creaturecommands.keys.special_assassinate"
	HK_Creature_Special_Flash	= "keygroups.creaturecommands.keys.special_flash"
	HK_Creature_Special_Infestation	= "keygroups.creaturecommands.keys.special_infestation"
	HK_Creature_Special_SoiledLand	= "keygroups.creaturecommands.keys.special_soiledland"

	-- HENCHMEN
	HK_Henchman_Build			= "keygroups.basicunitcommands.keys.buildmenu"
	HK_Henchman_BuildAdvanced		= "keygroups.basicunitcommands.keys.buildmenuadvanced"
	HK_Henchman_Repair			= "keygroups.basicunitcommands.keys.repair"
	HK_Henchman_Gyrocopter		= "keygroups.henchmancommands.keys.gyrocopter"
	HK_Henchman_Heal			= "keygroups.henchmancommands.keys.heal"
	HK_Henchman_Gather			= "keygroups.basicunitcommands.keys.gather"
	HK_Henchman_Tag			= "keygroups.henchmancommands.keys.tag"
	HK_Henchman_BuildToggle		= "keygroups.henchmanbuildcommands.keys.buildtoggle"
	HK_Henchman_Unload			= "keygroups.henchmancommands.keys.unload"
	HK_Henchman_Airlift			= "keygroups.henchmancommands.keys.airlift"
	HK_Henchman_Untag			= "keygroups.henchmancommands.keys.untag"

	-- HENCHMEN BUILD MENU
	HK_Henchman_Build_Lightning			= "keygroups.henchmanbuildcommands.keys.lightning"
	HK_Henchman_Build_Electrical		= "keygroups.henchmanbuildcommands.keys.electrical"
	HK_Henchman_Build_Bramble			= "keygroups.henchmanbuildcommands.keys.bramble"
	HK_Henchman_Build_Remote			= "keygroups.henchmanbuildcommands.keys.remote"
	HK_Henchman_Build_Water				= "keygroups.henchmanbuildcommands.keys.water"
	HK_Henchman_Build_Aviary			= "keygroups.henchmanbuildcommands.keys.aviary"
	HK_Henchman_Build_VetClinic			= "keygroups.henchmanbuildcommands.keys.vetclinic"
	HK_Henchman_Build_Foundry			= "keygroups.henchmanbuildcommands.keys.foundry"
	HK_Henchman_Build_AntiAirTower		= "keygroups.henchmanbuildcommands.keys.antiairtower"
	HK_Henchman_Build_SoundBeamTower	= "keygroups.henchmanbuildcommands.keys.soundbeamtower"
	HK_Henchman_Build_LandingPad		= "keygroups.henchmanbuildcommands.keys.landingpad"
	HK_Henchman_Build_GeneticAmplifier	= "keygroups.henchmanbuildcommands.keys.geneticamp"

	-- REX
	HK_Rex_Heal			= "keygroups.rexcommands.keys.heal"
	HK_Rex_GatherDNA	= "keygroups.rexcommands.keys.gatherdna"
	HK_Rex_Garrison		= "keygroups.rexcommands.keys.garrison"

	-- LUCY
	HK_Lucy_Repair			= "keygroups.basicunitcommands.keys.repair"
	HK_Lucy_Garrison		= "keygroups.lucycommands.keys.garrison"
	HK_Lucy_Build			= "keygroups.basicunitcommands.keys.buildmenu"
	HK_Lucy_BuildAdvanced	= "keygroups.basicunitcommands.keys.buildmenuadvanced"
	HK_Lucy_GatherTech		= "keygroups.lucycommands.keys.gathertech"
	HK_Lucy_Sabotage		= "keygroups.lucycommands.keys.sabotage"
	HK_Lucy_Gather			= "keygroups.basicunitcommands.keys.gather"

	-- LAB
	HK_Lab_CreateHenchman	= "keygroups.labcommands.keys.createhenchman"
	HK_Lab_ReleaseRex		= "keygroups.labcommands.keys.releaserex"
	HK_Lab_ReleaseLucy		= "keygroups.labcommands.keys.releaselucy"
	HK_Lab_RadarPulse		= "keygroups.labcommands.keys.radarpulse"
	HK_Lab_DefenseTurnOn	= "keygroups.labcommands.keys.defenseturnon"
	HK_Lab_DefenseTurnOff	= "keygroups.labcommands.keys.defenseturnoff"

	-- FOUNDRY
	HK_Foundry_ElecToCoal100 = "keygroups.foundrycommands.keys.electocoal100"
	HK_Foundry_ElecToCoal500 = "keygroups.foundrycommands.keys.electocoal500"
	HK_Foundry_CoaltoElec100 = "keygroups.foundrycommands.keys.coaltoelec100"
	HK_Foundry_CoaltoElec500 = "keygroups.foundrycommands.keys.coaltoelec500"

	-- LANDINGPAD
	HK_LandingPad_CreateGyrocopter = "keygroups.landingpadcommands.keys.creategyrocopter"


	-- basic unit
	HK_Generic_Stop	= "keygroups.basicunitcommands.keys.stop"
	HK_Generic_Move	= "keygroups.basicunitcommands.keys.move"
	HK_Generic_Kill = "keygroups.basicunitcommands.keys.kill"

	-- selection
	HK_Select_UnitsOnScreen				= "keygroups.select.keys.unitsonscreen"
	HK_Select_HenchmenOnScreen			= "keygroups.select.keys.henchmenonscreen"
	HK_Select_HenchmenInWorld			= "keygroups.select.keys.henchmeninworld"
	HK_Select_HenchmenNextIdle			= "keygroups.select.keys.henchmennextidle"
	HK_Select_HenchmenAllIdle			= "keygroups.select.keys.henchmenallidle"
	HK_Select_CombatUnitsOnScreen		= "keygroups.select.keys.combatonscreen"
	HK_Select_CombatUnitsInWorld		= "keygroups.select.keys.combatinworld"
	HK_Select_GroundCombatUnitsOnScreen	= "keygroups.select.keys.groundcombatonscreen"
	HK_Select_GroundCombatUnitsInWorld	= "keygroups.select.keys.groundcombatinworld"
	HK_Select_AirCombatUnitsOnScreen	= "keygroups.select.keys.aircombatonscreen"
	HK_Select_AirCombatUnitsInWorld		= "keygroups.select.keys.aircombatinworld"
	HK_Select_WaterCombatUnitsOnScreen	= "keygroups.select.keys.watercombatonscreen"
	HK_Select_WaterCombatUnitsInWorld	= "keygroups.select.keys.watercombatinworld"
	HK_Select_MeleeCombatUnitsOnScreen	= "keygroups.select.keys.meleecombatonscreen"
	HK_Select_MeleeCombatUnitsInWorld	= "keygroups.select.keys.meleecombatinworld"
	HK_Select_RangedCombatUnitsOnScreen	= "keygroups.select.keys.rangedcombatonscreen"
	HK_Select_RangedCombatUnitsInWorld	= "keygroups.select.keys.rangedcombatinworld"
	HK_Select_NextGroundCombiner		= "keygroups.select.keys.nextgroundcombiner"
	HK_Select_NextWaterCombiner			= "keygroups.select.keys.nextwatercombiner"
	HK_Select_NextAirCombiner			= "keygroups.select.keys.nextaircombiner"
	HK_Select_NextCombiner				= "keygroups.select.keys.nextcombiner"
	HK_Select_NextFoundry				= "keygroups.select.keys.nextfoundry"
	HK_Select_NextVetClinic				= "keygroups.select.keys.nextvetclinic"
	HK_Select_NextGeneticAmplifier		= "keygroups.select.keys.nextgeneticamplifier"
	HK_Select_NextElectricGenerator		= "keygroups.select.keys.nextelectricgenerator"
	HK_Select_Lab						= "keygroups.select.keys.lab"
	HK_Select_Rex						= "keygroups.select.keys.rex"
	HK_Select_Lucy						= "keygroups.select.keys.lucy"
	HK_Select_NextSubSelection			= "keygroups.select.keys.nextsubselect"

	-- assignment to hotkeygroups
	HK_Assign_ToGroup0					= "keygroups.hotkeygroups.keys.assigntogroup0"
	HK_Assign_ToGroup1					= "keygroups.hotkeygroups.keys.assigntogroup1"
	HK_Assign_ToGroup2					= "keygroups.hotkeygroups.keys.assigntogroup2"
	HK_Assign_ToGroup3					= "keygroups.hotkeygroups.keys.assigntogroup3"
	HK_Assign_ToGroup4					= "keygroups.hotkeygroups.keys.assigntogroup4"
	HK_Assign_ToGroup5					= "keygroups.hotkeygroups.keys.assigntogroup5"
	HK_Assign_ToGroup6					= "keygroups.hotkeygroups.keys.assigntogroup6"
	HK_Assign_ToGroup7					= "keygroups.hotkeygroups.keys.assigntogroup7"
	HK_Assign_ToGroup8					= "keygroups.hotkeygroups.keys.assigntogroup8"
	HK_Assign_ToGroup9					= "keygroups.hotkeygroups.keys.assigntogroup9"
	HK_Unassign_FromAllGroups				= "keygroups.select.keys.unassignallgroups"
	HK_Add_ToGroup0						= "keygroups.select.keys.addtogroup0"
	HK_Add_ToGroup1						= "keygroups.select.keys.addtogroup1"
	HK_Add_ToGroup2						= "keygroups.select.keys.addtogroup2"
	HK_Add_ToGroup3						= "keygroups.select.keys.addtogroup3"
	HK_Add_ToGroup4						= "keygroups.select.keys.addtogroup4"
	HK_Add_ToGroup5						= "keygroups.select.keys.addtogroup5"
	HK_Add_ToGroup6						= "keygroups.select.keys.addtogroup6"
	HK_Add_ToGroup7						= "keygroups.select.keys.addtogroup7"
	HK_Add_ToGroup8						= "keygroups.select.keys.addtogroup8"
	HK_Add_ToGroup9						= "keygroups.select.keys.addtogroup9"
	HK_Remove_FromGroup0				= "keygroups.select.keys.removefromgroup0"
	HK_Remove_FromGroup1				= "keygroups.select.keys.removefromgroup1"
	HK_Remove_FromGroup2				= "keygroups.select.keys.removefromgroup2"
	HK_Remove_FromGroup3				= "keygroups.select.keys.removefromgroup3"
	HK_Remove_FromGroup4				= "keygroups.select.keys.removefromgroup4"
	HK_Remove_FromGroup5				= "keygroups.select.keys.removefromgroup5"
	HK_Remove_FromGroup6				= "keygroups.select.keys.removefromgroup6"
	HK_Remove_FromGroup7				= "keygroups.select.keys.removefromgroup7"
	HK_Remove_FromGroup8				= "keygroups.select.keys.removefromgroup8"
	HK_Remove_FromGroup9				= "keygroups.select.keys.removefromgroup9"

	-- basic building units
	-- lab
	HK_Research_AdvancedStruct	= "keygroups.labcommands.keys.research_advancedstruct"
	HK_Research_Rank2		= "keygroups.labcommands.keys.research"
	HK_Research_Rank3		= "keygroups.labcommands.keys.research"
	HK_Research_Rank4		= "keygroups.labcommands.keys.research"
	HK_Research_Rank5		= "keygroups.labcommands.keys.research"

	-- research clinic
	HK_Research_HenchmanBinoculars	= "keygroups.researchcliniccommands.keys.research_henchmanbinoculars"
	HK_Research_HenchmanTag			= "keygroups.researchcliniccommands.keys.research_henchmantag"
	HK_Research_HenchmanYoke		= "keygroups.researchcliniccommands.keys.research_henchmanyoke"
	HK_Research_HenchmanHeal		= "keygroups.researchcliniccommands.keys.research_henchmanheal"
	HK_Research_HenchmanMotSpeech	= "keygroups.researchcliniccommands.keys.research_henchmanmotspeech"
	HK_Research_IncBuildIntegrity	= "keygroups.researchcliniccommands.keys.research_incbuildintegrity"
	HK_Research_TowerUpgrade		= "keygroups.researchcliniccommands.keys.research_towerupgrade"
	HK_Research_StrengthenFences	= "keygroups.researchcliniccommands.keys.research_strengthenfences"
	HK_Research_StrengthenElecGrid	= "keygroups.researchcliniccommands.keys.research_strengthenelecgrid"
	HK_Research_LabDefense			= "keygroups.researchcliniccommands.keys.research_labdefense"

	-- sound beam tower
	HK_SoundBeam_SonicBoom			= "keygroups.soundbeamcommands.keys.sonicboom"

	-- anti air tower
	HK_AntiAir_AirBurst				= "keygroups.antiaircommands.keys.airburst"

	-- electrical generator
	HK_AddOn_EGen1			= "keygroups.egencommands.keys.research"
	HK_AddOn_EGen2			= "keygroups.egencommands.keys.research"
	HK_AddOn_EGen3			= "keygroups.egencommands.keys.research"

	-- genetic amplifier
	HK_Upgrade_Defense			= "keygroups.geneticamplifiercommands.keys.upgrade_defense"
	HK_Upgrade_Speed			= "keygroups.geneticamplifiercommands.keys.upgrade_speed"
	HK_Upgrade_MeleeDamage		= "keygroups.geneticamplifiercommands.keys.upgrade_meleedamage"
	HK_Upgrade_HitPoints		= "keygroups.geneticamplifiercommands.keys.upgrade_hitpoints"
	HK_Upgrade_SightRadius		= "keygroups.geneticamplifiercommands.keys.upgrade_sightradius"
	HK_Upgrade_RangedDamage		= "keygroups.geneticamplifiercommands.keys.upgrade_rangeddamage"
	HK_Upgrade_SplashDamage		= "keygroups.geneticamplifiercommands.keys.upgrade_splashdamage"
	HK_Upgrade_AreaAttackRadius	= "keygroups.geneticamplifiercommands.keys.upgrade_areaattackradius"

	HK_Generic_Rally	= "keygroups.basicbuildingcommands.keys.rally"

	-- playback
	HK_Playback_SpeedNormal		= "keygroups.playbackcommands.keys.speednormal"
	HK_Playback_SpeedFast		= "keygroups.playbackcommands.keys.speedfast"

	-- hotkeygroup assignment
	hotkeygroups =
	{
		HK_Assign_ToGroup1,
		HK_Assign_ToGroup2,
		HK_Assign_ToGroup3,
		HK_Assign_ToGroup4,
		HK_Assign_ToGroup5,
		HK_Assign_ToGroup6,
		HK_Assign_ToGroup7,
		HK_Assign_ToGroup8,
		HK_Assign_ToGroup9,
		HK_Assign_ToGroup0,
	}

	-- hotkeyaddgroup assignment
	hotkeyaddgroups =
	{
		HK_Add_ToGroup1,
		HK_Add_ToGroup2,
		HK_Add_ToGroup3,
		HK_Add_ToGroup4,
		HK_Add_ToGroup5,
		HK_Add_ToGroup6,
		HK_Add_ToGroup7,
		HK_Add_ToGroup8,
		HK_Add_ToGroup9,
		HK_Add_ToGroup0,
	}

	-- hotkeyremovegroup assignment
	hotkeyremovegroups =
	{
		HK_Remove_FromGroup1,
		HK_Remove_FromGroup2,
		HK_Remove_FromGroup3,
		HK_Remove_FromGroup4,
		HK_Remove_FromGroup5,
		HK_Remove_FromGroup6,
		HK_Remove_FromGroup7,
		HK_Remove_FromGroup8,
		HK_Remove_FromGroup9,
		HK_Remove_FromGroup0,
	}

	-- resource labels for local player (order must conform to player_recource_labels)
	local_player_recource_labels = {
		"background1",
		"resource_electricity_icon", "resource_electricity_label", "",
		"resource_scrap_icon", "resource_scrap_label", "",
		"resource_unitcap_icon", "resource_unitcap_label", "resource_unitcap_red_label",
		"resource_henchpop_icon", "resource_henchpop_label", "resource_henchpop_red_label",
		"", "", "",
	}

	-- resource labels for all players
	player_recource_labels = {
		{
			"player01_background",
			"player01_electricity_icon", "player01_electricity_label", "",
			"player01_scrap_icon", "player01_scrap_label", "",
			"player01_unitcap_icon", "player01_unitcap_label", "player01_unitcap_red_label",
			"player01_henchpop_icon", "player01_henchpop_label", "player01_henchpop_red_label",
			"player01_color_label", "player01_name_label", "",
		},
		{
			"player02_background",
			"player02_electricity_icon", "player02_electricity_label", "",
			"player02_scrap_icon", "player02_scrap_label", "",
			"player02_unitcap_icon", "player02_unitcap_label", "player02_unitcap_red_label",
			"player02_henchpop_icon", "player02_henchpop_label", "player02_henchpop_red_label",
			"player02_color_label", "player02_name_label", "",
		},
		{
			"player03_background",
			"player03_electricity_icon", "player03_electricity_label", "",
			"player03_scrap_icon", "player03_scrap_label", "",
			"player03_unitcap_icon", "player03_unitcap_label", "player03_unitcap_red_label",
			"player03_henchpop_icon", "player03_henchpop_label", "player03_henchpop_red_label",
			"player03_color_label", "player03_name_label", "",
		},
		{
			"player04_background",
			"player04_electricity_icon", "player04_electricity_label", "",
			"player04_scrap_icon", "player04_scrap_label", "",
			"player04_unitcap_icon", "player04_unitcap_label", "player04_unitcap_red_label",
			"player04_henchpop_icon", "player04_henchpop_label", "player04_henchpop_red_label",
			"player04_color_label", "player04_name_label", "",
		},
		{
			"player05_background",
			"player05_electricity_icon", "player05_electricity_label", "",
			"player05_scrap_icon", "player05_scrap_label", "",
			"player05_unitcap_icon", "player05_unitcap_label", "player05_unitcap_red_label",
			"player05_henchpop_icon", "player05_henchpop_label", "player05_henchpop_red_label",
			"player05_color_label", "player05_name_label", "",
		},
		{
			"player06_background",
			"player06_electricity_icon", "player06_electricity_label", "",
			"player06_scrap_icon", "player06_scrap_label", "",
			"player06_unitcap_icon", "player06_unitcap_label", "player06_unitcap_red_label",
			"player06_henchpop_icon", "player06_henchpop_label", "player06_henchpop_red_label",
			"player06_color_label", "player06_name_label", "",
		},
	}

	-- alternative order mapping for player_recource_labels depending on team compositions
	-- NOTE: If a key does not exist, it is shortened: "3x2x1" -> "3x2" -> "3" -> no reordering
	team_recource_label_orders = {
		["1x1x1"] = {1, 3, 5, 2, 4, 6},
		["1x1x1x1"] = {1, 2, 3, 4, 5, 6},
		["2"] = {1, 3, 2, 4, 5, 6},
		["2x2"] = {1, 3, 2, 4, 5, 6},
		["2x2x2"] = {1, 2, 3, 4, 5, 6},
		["3x3"] = {1, 3, 5, 2, 4, 6},
		["3"] = {1, 3, 5, 2, 4, 6},
	}

	-- creatures buttons
	armybuttons =
	{
		"command_alt_1",
		"command_alt_2",
		"command_alt_3",
		"command_alt_4",
		"command_alt_5",
		"command_alt_6",
		"command_alt_7",
		"command_alt_8",
		"command_alt_9",

	}

	armyunit_hotkeys =
	{
		HK_Build_Creature_1,
		HK_Build_Creature_2,
		HK_Build_Creature_3,
		HK_Build_Creature_4,
		HK_Build_Creature_5,
		HK_Build_Creature_6,
		HK_Build_Creature_7,
		HK_Build_Creature_8,
		HK_Build_Creature_9,
	}

	--
	armyupgradebuttons =
	{
		{ "upgrade01_label", "upgrade_icon01", "upgrade01_complete" },
		{ "upgrade02_label", "upgrade_icon02", "upgrade02_complete" },
		{ "upgrade03_label", "upgrade_icon03", "upgrade03_complete" },
		{ "upgrade04_label", "upgrade_icon04", "upgrade04_complete" },
		{ "upgrade05_label", "upgrade_icon05", "upgrade05_complete" },
		{ "upgrade06_label", "upgrade_icon06", "upgrade06_complete" },
		{ "upgrade07_label", "upgrade_icon07", "upgrade07_complete" },
		{ "upgrade08_label", "upgrade_icon08", "upgrade08_complete" },
		{ "upgrade09_label", "upgrade_icon09", "upgrade09_complete" },
	}

	-- custom cventcue icons
	custom_eventcue_icons_top = {
		{"custom_eventcue_icon01", "custom_eventcue_type01", "custom_eventcue_count01"},
		{"custom_eventcue_icon02", "custom_eventcue_type02", "custom_eventcue_count02"},
		{"custom_eventcue_icon03", "custom_eventcue_type03", "custom_eventcue_count03"},
		{"custom_eventcue_icon04", "custom_eventcue_type04", "custom_eventcue_count04"},
		{"custom_eventcue_icon05", "custom_eventcue_type05", "custom_eventcue_count05"},
		{"custom_eventcue_icon06", "custom_eventcue_type06", "custom_eventcue_count06"},
	}
	custom_eventcue_icons_bot = {
		{"custom_eventcue_icon07", "custom_eventcue_type07", "custom_eventcue_count07"},
		{"custom_eventcue_icon08", "custom_eventcue_type08", "custom_eventcue_count08"},
		{"custom_eventcue_icon09", "custom_eventcue_type09", "custom_eventcue_count09"},
		{"custom_eventcue_icon10", "custom_eventcue_type10", "custom_eventcue_count10"},
		{"custom_eventcue_icon11", "custom_eventcue_type11", "custom_eventcue_count11"},
		{"custom_eventcue_icon12", "custom_eventcue_type12", "custom_eventcue_count12"},
	}

	-- info center multi list
	infocentermultibuttons =
	{
		{ "multiselect_icon01", "multiselect_statbar01", "multiselect_progressbar01", "multiselect_endurancebar01", "multiselect_count01" },
		{ "multiselect_icon02", "multiselect_statbar02", "multiselect_progressbar02", "multiselect_endurancebar02", "multiselect_count02" },
		{ "multiselect_icon03", "multiselect_statbar03", "multiselect_progressbar03", "multiselect_endurancebar03", "multiselect_count03" },
		{ "multiselect_icon04", "multiselect_statbar04", "multiselect_progressbar04", "multiselect_endurancebar04", "multiselect_count04" },
		{ "multiselect_icon05", "multiselect_statbar05", "multiselect_progressbar05", "multiselect_endurancebar05", "multiselect_count05" },
		{ "multiselect_icon06", "multiselect_statbar06", "multiselect_progressbar06", "multiselect_endurancebar06", "multiselect_count06" },
		{ "multiselect_icon07", "multiselect_statbar07", "multiselect_progressbar07", "multiselect_endurancebar07", "multiselect_count07" },
		{ "multiselect_icon08", "multiselect_statbar08", "multiselect_progressbar08", "multiselect_endurancebar08", "multiselect_count08" },
		{ "multiselect_icon09", "multiselect_statbar09", "multiselect_progressbar09", "multiselect_endurancebar09", "multiselect_count09" },

		{ "multiselect_icon10", "multiselect_statbar10", "multiselect_progressbar10", "multiselect_endurancebar10", "multiselect_count10" },
		{ "multiselect_icon11", "multiselect_statbar11", "multiselect_progressbar11", "multiselect_endurancebar11", "multiselect_count11" },
		{ "multiselect_icon12", "multiselect_statbar12", "multiselect_progressbar12", "multiselect_endurancebar12", "multiselect_count12" },
		{ "multiselect_icon13", "multiselect_statbar13", "multiselect_progressbar13", "multiselect_endurancebar13", "multiselect_count13" },
		{ "multiselect_icon14", "multiselect_statbar14", "multiselect_progressbar14", "multiselect_endurancebar14", "multiselect_count14" },
		{ "multiselect_icon15", "multiselect_statbar15", "multiselect_progressbar15", "multiselect_endurancebar15", "multiselect_count15" },
		{ "multiselect_icon16", "multiselect_statbar16", "multiselect_progressbar16", "multiselect_endurancebar16", "multiselect_count16" },
		{ "multiselect_icon17", "multiselect_statbar17", "multiselect_progressbar17", "multiselect_endurancebar17", "multiselect_count17" },
		{ "multiselect_icon18", "multiselect_statbar18", "multiselect_progressbar18", "multiselect_endurancebar18", "multiselect_count18" },

		{ "multiselect_icon19", "multiselect_statbar19", "multiselect_progressbar19", "multiselect_endurancebar19", "multiselect_count19" },
		{ "multiselect_icon20", "multiselect_statbar20", "multiselect_progressbar20", "multiselect_endurancebar20", "multiselect_count20" },
		{ "multiselect_icon21", "multiselect_statbar21", "multiselect_progressbar21", "multiselect_endurancebar21", "multiselect_count21" },
		{ "multiselect_icon22", "multiselect_statbar22", "multiselect_progressbar22", "multiselect_endurancebar22", "multiselect_count22" },
		{ "multiselect_icon23", "multiselect_statbar23", "multiselect_progressbar23", "multiselect_endurancebar23", "multiselect_count23" },
		{ "multiselect_icon24", "multiselect_statbar24", "multiselect_progressbar24", "multiselect_endurancebar24", "multiselect_count24" },
		{ "multiselect_icon25", "multiselect_statbar25", "multiselect_progressbar25", "multiselect_endurancebar25", "multiselect_count25" },
		{ "multiselect_icon26", "multiselect_statbar26", "multiselect_progressbar26", "multiselect_endurancebar26", "multiselect_count26" },
		{ "multiselect_icon27", "multiselect_statbar27", "multiselect_progressbar27", "multiselect_endurancebar27", "multiselect_count27" },

		{ "multiselect_icon28", "multiselect_statbar28", "multiselect_progressbar28", "multiselect_endurancebar28", "multiselect_count28" },
		{ "multiselect_icon29", "multiselect_statbar29", "multiselect_progressbar29", "multiselect_endurancebar29", "multiselect_count29" },
		{ "multiselect_icon30", "multiselect_statbar30", "multiselect_progressbar30", "multiselect_endurancebar30", "multiselect_count30" },
		{ "multiselect_icon31", "multiselect_statbar31", "multiselect_progressbar31", "multiselect_endurancebar31", "multiselect_count31" },
		{ "multiselect_icon32", "multiselect_statbar32", "multiselect_progressbar32", "multiselect_endurancebar32", "multiselect_count32" },
		{ "multiselect_icon33", "multiselect_statbar33", "multiselect_progressbar33", "multiselect_endurancebar33", "multiselect_count33" },
		{ "multiselect_icon34", "multiselect_statbar34", "multiselect_progressbar34", "multiselect_endurancebar34", "multiselect_count34" },
		{ "multiselect_icon35", "multiselect_statbar35", "multiselect_progressbar35", "multiselect_endurancebar35", "multiselect_count35" },
		{ "multiselect_icon36", "multiselect_statbar36", "multiselect_progressbar36", "multiselect_endurancebar36", "multiselect_count36" },
	}

	infocentermultibuttonsupper = {
		infocentermultibuttons[01],
		infocentermultibuttons[02],
		infocentermultibuttons[03],
		infocentermultibuttons[04],
		infocentermultibuttons[05],
		infocentermultibuttons[06],
		infocentermultibuttons[07],
		infocentermultibuttons[08],
		infocentermultibuttons[09],

		infocentermultibuttons[10],
		infocentermultibuttons[11],
		infocentermultibuttons[12],
		infocentermultibuttons[13],
		infocentermultibuttons[14],
		infocentermultibuttons[15],
		infocentermultibuttons[16],
		infocentermultibuttons[17],
		infocentermultibuttons[18],
	}

	infocentermultibuttonslower = {
		infocentermultibuttons[19],
		infocentermultibuttons[20],
		infocentermultibuttons[21],
		infocentermultibuttons[22],
		infocentermultibuttons[23],
		infocentermultibuttons[24],
		infocentermultibuttons[25],
		infocentermultibuttons[26],
		infocentermultibuttons[27],

		infocentermultibuttons[28],
		infocentermultibuttons[29],
		infocentermultibuttons[30],
		infocentermultibuttons[31],
		infocentermultibuttons[32],
		infocentermultibuttons[33],
		infocentermultibuttons[34],
		infocentermultibuttons[35],
		infocentermultibuttons[36],
	}

	infocentermultibuttonsrows = {
		{
			infocentermultibuttons[01],
			infocentermultibuttons[02],
			infocentermultibuttons[03],
			infocentermultibuttons[04],
			infocentermultibuttons[05],
			infocentermultibuttons[06],
			infocentermultibuttons[07],
			infocentermultibuttons[08],
			infocentermultibuttons[09],
		},
		{
			infocentermultibuttons[10],
			infocentermultibuttons[11],
			infocentermultibuttons[12],
			infocentermultibuttons[13],
			infocentermultibuttons[14],
			infocentermultibuttons[15],
			infocentermultibuttons[16],
			infocentermultibuttons[17],
			infocentermultibuttons[18],
		},
		{
			infocentermultibuttons[19],
			infocentermultibuttons[20],
			infocentermultibuttons[21],
			infocentermultibuttons[22],
			infocentermultibuttons[23],
			infocentermultibuttons[24],
			infocentermultibuttons[25],
			infocentermultibuttons[26],
			infocentermultibuttons[27],
		},
		{
			infocentermultibuttons[28],
			infocentermultibuttons[29],
			infocentermultibuttons[30],
			infocentermultibuttons[31],
			infocentermultibuttons[32],
			infocentermultibuttons[33],
			infocentermultibuttons[34],
			infocentermultibuttons[35],
			infocentermultibuttons[36],
		},
	}

	-- info center multi 72 row colors
	infocentermulti72rowcolors = {
		{"multiselect72_color_mid01", "multiselect72_color_top01", "multiselect72_color_bot01"},
		{"multiselect72_color_mid02", "multiselect72_color_top02", "multiselect72_color_bot02"},
		{"multiselect72_color_mid03", "multiselect72_color_top03", "multiselect72_color_bot03"},
		{"multiselect72_color_mid04", "multiselect72_color_top04", "multiselect72_color_bot04"},
		{"multiselect72_color_mid05", "multiselect72_color_top05", "multiselect72_color_bot05"},
		{"multiselect72_color_mid06", "multiselect72_color_top06", "multiselect72_color_bot06"},
	}

	-- info center multi 72 rows list
	infocentermulti72buttonsrows =
	{
		{
			{ "multiselect72_icon01", "multiselect72_statbar01", "multiselect72_progressbar01", "multiselect72_count_bot01", "multiselect72_count_top01" },
			{ "multiselect72_icon02", "multiselect72_statbar02", "multiselect72_progressbar02", "multiselect72_count_bot02", "multiselect72_count_top02" },
			{ "multiselect72_icon03", "multiselect72_statbar03", "multiselect72_progressbar03", "multiselect72_count_bot03", "multiselect72_count_top03" },
			{ "multiselect72_icon04", "multiselect72_statbar04", "multiselect72_progressbar04", "multiselect72_count_bot04", "multiselect72_count_top04" },
			{ "multiselect72_icon05", "multiselect72_statbar05", "multiselect72_progressbar05", "multiselect72_count_bot05", "multiselect72_count_top05" },
			{ "multiselect72_icon06", "multiselect72_statbar06", "multiselect72_progressbar06", "multiselect72_count_bot06", "multiselect72_count_top06" },
			{ "multiselect72_icon07", "multiselect72_statbar07", "multiselect72_progressbar07", "multiselect72_count_bot07", "multiselect72_count_top07" },
			{ "multiselect72_icon08", "multiselect72_statbar08", "multiselect72_progressbar08", "multiselect72_count_bot08", "multiselect72_count_top08" },
			{ "multiselect72_icon09", "multiselect72_statbar09", "multiselect72_progressbar09", "multiselect72_count_bot09", "multiselect72_count_top09" },
			{ "multiselect72_icon10", "multiselect72_statbar10", "multiselect72_progressbar10", "multiselect72_count_bot10", "multiselect72_count_top10" },
			{ "multiselect72_icon11", "multiselect72_statbar11", "multiselect72_progressbar11", "multiselect72_count_bot11", "multiselect72_count_top11" },
			{ "multiselect72_icon12", "multiselect72_statbar12", "multiselect72_progressbar12", "multiselect72_count_bot12", "multiselect72_count_top12" },
		},
		{
			{ "multiselect72_icon13", "multiselect72_statbar13", "multiselect72_progressbar13", "multiselect72_count_bot13", "multiselect72_count_top13" },
			{ "multiselect72_icon14", "multiselect72_statbar14", "multiselect72_progressbar14", "multiselect72_count_bot14", "multiselect72_count_top14" },
			{ "multiselect72_icon15", "multiselect72_statbar15", "multiselect72_progressbar15", "multiselect72_count_bot15", "multiselect72_count_top15" },
			{ "multiselect72_icon16", "multiselect72_statbar16", "multiselect72_progressbar16", "multiselect72_count_bot16", "multiselect72_count_top16" },
			{ "multiselect72_icon17", "multiselect72_statbar17", "multiselect72_progressbar17", "multiselect72_count_bot17", "multiselect72_count_top17" },
			{ "multiselect72_icon18", "multiselect72_statbar18", "multiselect72_progressbar18", "multiselect72_count_bot18", "multiselect72_count_top18" },
			{ "multiselect72_icon19", "multiselect72_statbar19", "multiselect72_progressbar19", "multiselect72_count_bot19", "multiselect72_count_top19" },
			{ "multiselect72_icon20", "multiselect72_statbar20", "multiselect72_progressbar20", "multiselect72_count_bot20", "multiselect72_count_top20" },
			{ "multiselect72_icon21", "multiselect72_statbar21", "multiselect72_progressbar21", "multiselect72_count_bot21", "multiselect72_count_top21" },
			{ "multiselect72_icon22", "multiselect72_statbar22", "multiselect72_progressbar22", "multiselect72_count_bot22", "multiselect72_count_top22" },
			{ "multiselect72_icon23", "multiselect72_statbar23", "multiselect72_progressbar23", "multiselect72_count_bot23", "multiselect72_count_top23" },
			{ "multiselect72_icon24", "multiselect72_statbar24", "multiselect72_progressbar24", "multiselect72_count_bot24", "multiselect72_count_top24" },
		},
		{
			{ "multiselect72_icon25", "multiselect72_statbar25", "multiselect72_progressbar25", "multiselect72_count_bot25", "multiselect72_count_top25" },
			{ "multiselect72_icon26", "multiselect72_statbar26", "multiselect72_progressbar26", "multiselect72_count_bot26", "multiselect72_count_top26" },
			{ "multiselect72_icon27", "multiselect72_statbar27", "multiselect72_progressbar27", "multiselect72_count_bot27", "multiselect72_count_top27" },
			{ "multiselect72_icon28", "multiselect72_statbar28", "multiselect72_progressbar28", "multiselect72_count_bot28", "multiselect72_count_top28" },
			{ "multiselect72_icon29", "multiselect72_statbar29", "multiselect72_progressbar29", "multiselect72_count_bot29", "multiselect72_count_top29" },
			{ "multiselect72_icon30", "multiselect72_statbar30", "multiselect72_progressbar30", "multiselect72_count_bot30", "multiselect72_count_top30" },
			{ "multiselect72_icon31", "multiselect72_statbar31", "multiselect72_progressbar31", "multiselect72_count_bot31", "multiselect72_count_top31" },
			{ "multiselect72_icon32", "multiselect72_statbar32", "multiselect72_progressbar32", "multiselect72_count_bot32", "multiselect72_count_top32" },
			{ "multiselect72_icon33", "multiselect72_statbar33", "multiselect72_progressbar33", "multiselect72_count_bot33", "multiselect72_count_top33" },
			{ "multiselect72_icon34", "multiselect72_statbar34", "multiselect72_progressbar34", "multiselect72_count_bot34", "multiselect72_count_top34" },
			{ "multiselect72_icon35", "multiselect72_statbar35", "multiselect72_progressbar35", "multiselect72_count_bot35", "multiselect72_count_top35" },
			{ "multiselect72_icon36", "multiselect72_statbar36", "multiselect72_progressbar36", "multiselect72_count_bot36", "multiselect72_count_top36" },
		},
		{
			{ "multiselect72_icon37", "multiselect72_statbar37", "multiselect72_progressbar37", "multiselect72_count_bot37", "multiselect72_count_top37" },
			{ "multiselect72_icon38", "multiselect72_statbar38", "multiselect72_progressbar38", "multiselect72_count_bot38", "multiselect72_count_top38" },
			{ "multiselect72_icon39", "multiselect72_statbar39", "multiselect72_progressbar39", "multiselect72_count_bot39", "multiselect72_count_top39" },
			{ "multiselect72_icon40", "multiselect72_statbar40", "multiselect72_progressbar40", "multiselect72_count_bot40", "multiselect72_count_top40" },
			{ "multiselect72_icon41", "multiselect72_statbar41", "multiselect72_progressbar41", "multiselect72_count_bot41", "multiselect72_count_top41" },
			{ "multiselect72_icon42", "multiselect72_statbar42", "multiselect72_progressbar42", "multiselect72_count_bot42", "multiselect72_count_top42" },
			{ "multiselect72_icon43", "multiselect72_statbar43", "multiselect72_progressbar43", "multiselect72_count_bot43", "multiselect72_count_top43" },
			{ "multiselect72_icon44", "multiselect72_statbar44", "multiselect72_progressbar44", "multiselect72_count_bot44", "multiselect72_count_top44" },
			{ "multiselect72_icon45", "multiselect72_statbar45", "multiselect72_progressbar45", "multiselect72_count_bot45", "multiselect72_count_top45" },
			{ "multiselect72_icon46", "multiselect72_statbar46", "multiselect72_progressbar46", "multiselect72_count_bot46", "multiselect72_count_top46" },
			{ "multiselect72_icon47", "multiselect72_statbar47", "multiselect72_progressbar47", "multiselect72_count_bot47", "multiselect72_count_top47" },
			{ "multiselect72_icon48", "multiselect72_statbar48", "multiselect72_progressbar48", "multiselect72_count_bot48", "multiselect72_count_top48" },
		},
		{
			{ "multiselect72_icon49", "multiselect72_statbar49", "multiselect72_progressbar49", "multiselect72_count_bot49", "multiselect72_count_top49" },
			{ "multiselect72_icon50", "multiselect72_statbar50", "multiselect72_progressbar50", "multiselect72_count_bot50", "multiselect72_count_top50" },
			{ "multiselect72_icon51", "multiselect72_statbar51", "multiselect72_progressbar51", "multiselect72_count_bot51", "multiselect72_count_top51" },
			{ "multiselect72_icon52", "multiselect72_statbar52", "multiselect72_progressbar52", "multiselect72_count_bot52", "multiselect72_count_top52" },
			{ "multiselect72_icon53", "multiselect72_statbar53", "multiselect72_progressbar53", "multiselect72_count_bot53", "multiselect72_count_top53" },
			{ "multiselect72_icon54", "multiselect72_statbar54", "multiselect72_progressbar54", "multiselect72_count_bot54", "multiselect72_count_top54" },
			{ "multiselect72_icon55", "multiselect72_statbar55", "multiselect72_progressbar55", "multiselect72_count_bot55", "multiselect72_count_top55" },
			{ "multiselect72_icon56", "multiselect72_statbar56", "multiselect72_progressbar56", "multiselect72_count_bot56", "multiselect72_count_top56" },
			{ "multiselect72_icon57", "multiselect72_statbar57", "multiselect72_progressbar57", "multiselect72_count_bot57", "multiselect72_count_top57" },
			{ "multiselect72_icon58", "multiselect72_statbar58", "multiselect72_progressbar58", "multiselect72_count_bot58", "multiselect72_count_top58" },
			{ "multiselect72_icon59", "multiselect72_statbar59", "multiselect72_progressbar59", "multiselect72_count_bot59", "multiselect72_count_top59" },
			{ "multiselect72_icon60", "multiselect72_statbar60", "multiselect72_progressbar60", "multiselect72_count_bot60", "multiselect72_count_top60" },
		},
		{
			{ "multiselect72_icon61", "multiselect72_statbar61", "multiselect72_progressbar61", "multiselect72_count_bot61", "multiselect72_count_top61" },
			{ "multiselect72_icon62", "multiselect72_statbar62", "multiselect72_progressbar62", "multiselect72_count_bot62", "multiselect72_count_top62" },
			{ "multiselect72_icon63", "multiselect72_statbar63", "multiselect72_progressbar63", "multiselect72_count_bot63", "multiselect72_count_top63" },
			{ "multiselect72_icon64", "multiselect72_statbar64", "multiselect72_progressbar64", "multiselect72_count_bot64", "multiselect72_count_top64" },
			{ "multiselect72_icon65", "multiselect72_statbar65", "multiselect72_progressbar65", "multiselect72_count_bot65", "multiselect72_count_top65" },
			{ "multiselect72_icon66", "multiselect72_statbar66", "multiselect72_progressbar66", "multiselect72_count_bot66", "multiselect72_count_top66" },
			{ "multiselect72_icon67", "multiselect72_statbar67", "multiselect72_progressbar67", "multiselect72_count_bot67", "multiselect72_count_top67" },
			{ "multiselect72_icon68", "multiselect72_statbar68", "multiselect72_progressbar68", "multiselect72_count_bot68", "multiselect72_count_top68" },
			{ "multiselect72_icon69", "multiselect72_statbar69", "multiselect72_progressbar69", "multiselect72_count_bot69", "multiselect72_count_top69" },
			{ "multiselect72_icon70", "multiselect72_statbar70", "multiselect72_progressbar70", "multiselect72_count_bot70", "multiselect72_count_top70" },
			{ "multiselect72_icon71", "multiselect72_statbar71", "multiselect72_progressbar71", "multiselect72_count_bot71", "multiselect72_count_top71" },
			{ "multiselect72_icon72", "multiselect72_statbar72", "multiselect72_progressbar72", "multiselect72_count_bot72", "multiselect72_count_top72" },
		},
	}

	-- infocenter observer utilities pages
	infocenterobserverutilities_pages = {
		{"infocenterobserverutilities_production", 62050, 62051},
		{"infocenterobserverutilities_unitcount", 62052, 62053},
		{"infocenterobserverutilities_structurecount", 62054, 62055},
		{"infocenterobserverutilities_deaths", 62056, 62057},
		{"infocenterobserverutilities_resources", 62058, 62059},
	}

	-- gyro passenger multi list
	gyromultibuttons =
	{
		{ "gyro_multi1",	"gyro_statbar1" },
		{ "gyro_multi2",	"gyro_statbar2" },
		{ "gyro_multi3",	"gyro_statbar3" },
		{ "gyro_multi4",	"gyro_statbar4" },
		{ "gyro_multi5",	"gyro_statbar5" },
		{ "gyro_multi6",	"gyro_statbar6" },

		{ "gyro_multi7",	"gyro_statbar7" },
		{ "gyro_multi8",	"gyro_statbar8" },
		{ "gyro_multi9",	"gyro_statbar9" },
		{ "gyro_multi10",	"gyro_statbar10" },
		{ "gyro_multi11",	"gyro_statbar11" },
		{ "gyro_multi12",	"gyro_statbar12" },
	}

	--
	menu_commands =
	{
		{ 40950, HK_Generic_Menu,		42380, },
		{ 40951, HK_Generic_ArmyBuilder,42381, },
		{ 40952, HK_Generic_Players,	42383, },
		{ 40953, HK_Generic_Ally,		42382, },
		{ 40954, HK_Generic_Objectives,	42384, },
		{ 40955, HK_Generic_TeamObjective, 40955, },
		{ 40956, HK_Generic_RecallSpeech, 42386, },
	}

	toolbar_commands =
	{
		{ 40955, HK_Generic_TeamObjective, 0 },
		{ 52023, HK_Select_Lab , 0},
		{ 52114, HK_Select_NextGroundCombiner, 0 },
		{ 52105, HK_Select_HenchmenAllIdle , 0},
		{ 52107, HK_Select_CombatUnitsInWorld, 0 },
	}

	-- scrap,electricity,population cap
	resource_indicator_tooltips =
	{
		{ 40750, "",	42400, },
		{ 40751, "",	42401, },
		{ 40752, "",	42402, },
		{ 40752, "",	42402, },
		{ 62033, "",	62034, },
		{ 62035, "",	62036, },
	}

	henchman_commands =
	{
		{ 40820,	HK_Generic_Move,			42320,	"ui/ingame/henchmen_move.tga" },
		{ 40821,	HK_Henchman_Gather,			42322,	"ui/ingame/gather.tga" },
		{ 40822,	HK_Generic_Guard,			42323,	"ui/ingame/henchmen_guard.tga" },
		{ 40823,	HK_Henchman_Repair,			42324,	"ui/ingame/repair.tga" },
		{ 40824,	HK_Generic_Stop,			42326,	"ui/ingame/henchmen_stop.tga" },

		{ 40825,	HK_Henchman_Build,			42327,	"ui/ingame/build_structure.tga" },
		{ 40834,	HK_Henchman_BuildAdvanced,	42345,	"ui/ingame/build_structure_advanced.tga" },

		{ 40826,	HK_Henchman_Heal,			42325,	"ui/ingame/heal.tga" },
		{ 40827,	HK_Henchman_Tag,			42332,	"ui/ingame/tag.tga" },
		{ 40829,	HK_Generic_Kill,			42329,	"ui/ingame/kill.tga" },
		{ 40835,	HK_Henchman_Unload,			42346,	"ui/ingame/unload.tga" },
		{ 40856,	HK_Generic_Attack,			42330,	"ui/ingame/henchmen_attack.tga" },
		{ 40836,	HK_Henchman_Airlift,		42348,	"ui/ingame/airlift.tga" },
		{ 40837,	HK_Henchman_Untag,		42349,  "ui/ingame/untag.tga" },
	}

	creature_commands =
	{
		{ 40850,	HK_Generic_Move,		42320,	"ui/ingame/waypoints.tga" },
		{ 40851,	HK_Generic_Guard,		42323,	"ui/ingame/guard.tga" },
		{ 40852,	HK_Generic_Patrol,		42331,	"ui/ingame/patrol.tga" },
		{ 40853,	HK_Generic_Stop,		42326,	"ui/ingame/stop.tga" },
		{ 40854,	HK_Creature_RangeAttack,42333,	"ui/ingame/range_attack.tga" },

		{ 40855,	HK_Generic_Kill,		42329,	"ui/ingame/kill.tga" },
		{ 40856,	HK_Generic_Attack,		42330,	"ui/ingame/special.tga" },
	}

	stance_commands =
	{
		{ 40870,	HK_Creature_Aggressive,	42340,	"ui/ingame/aggressive.tga",		STANCE_Aggressive	},
		{ 40871,	HK_Creature_Territorial,42341,	"ui/ingame/territorial.tga",	STANCE_Territorial	},
		{ 40872,	HK_Creature_Passive,	42342,	"ui/ingame/passive.tga",		STANCE_Passive		},
		{ 40873,	HK_Creature_NoStance,	42343,	"ui/ingame/stance_none.tga",	STANCE_None			},
	}

	specialmodal_mc_context = {
		[MC_SonarPulse]      = {once = 1},
		[MC_Plague]          = {x = 0, y = 0, z = 0},
		[MC_ElectricalBurst] = {interval = 10},
		[MC_QuillBurst]      = {interval = 10},
		[MC_StinkBurst]      = {once = 1},
		[MC_Sabotage]        = {},
		[MC_WebThrow]        = {once = 1},
		[MC_Assassinate]     = {x = 0, y = 0, z = 0},
		[MC_Flash]           = {once = 1},
		[MC_Infestation]     = {x = 0, y = 0, z = 0},
		[MC_Jumping]         = {},
	}

	-- uncomment to use original behaviour
	-- specialmodal_mc_context = {
	-- 	default              = {all = 1},
	-- 	[MC_Plague]          = {all = 1, x = 0, y = 0, z = 0},
	-- 	[MC_Assassinate]     = {all = 1, x = 0, y = 0, z = 0},
	-- 	[MC_Infestation]     = {all = 1, x = 0, y = 0, z = 0},
	-- }

	-- Note: the entries in ability_commands MUST follow the order of
	--       the SpecialAbilities enumerated type
	ability_commands =
	{
		{ 40893,	HK_Creature_Special_Frenzy,		42423, "ui/ingame/frenzy_attack.tga",	Ability_Frenzy,		0	},
		{ 40910,	HK_Creature_Special_Sonar,		42440, "ui/ingame/sonar_attack.tga",	Ability_SonarPulse,	1	},
		{ 40903,	HK_Creature_Special_SoiledLand,	42433, "ui/ingame/soiled_land.tga",		Ability_SoiledLand,	0	},
		{ 40912,	HK_Creature_Special_Jumping,	42442, "ui/ingame/jumping.tga",			Ability_Jumping,	1	},
		{ 40894,	HK_Creature_Special_Digin,		42424, "ui/ingame/digin.tga",			Ability_Digin,		0	},
		{ 40898,	HK_Creature_Special_Digout,		42428, "ui/ingame/digout.tga",			Ability_Digout,		0	},
	}

	modal_special_commands =
	{
		-- Modal Special commands
		{ 40911,	HK_Creature_Special_Plague,         42441, "ui/ingame/plague.tga",		    ATTACKTRG_Plague		},
		{ 40891,	HK_Creature_Special_Burst,          42421, "ui/ingame/burst_attack.tga",	ATTACKTRG_ElectricBurst },
		{ 40897,	HK_Creature_Special_Quill,          42427, "ui/ingame/quill_attack.tga",	ATTACKTRG_QuillBurst	},
		{ 40890,	HK_Creature_Special_Stink,          42420, "ui/ingame/stink_attack.tga",	ATTACKTRG_StinkBurst	},
		{ 40899,	HK_Creature_Special_Web,            42429, "ui/ingame/web_throw.tga",	    ATTACKTRG_WebThrow		},
		{ 40900,	HK_Creature_Special_Assassinate,    42430, "ui/ingame/assassinate.tga",	    ATTACKTRG_Assassinate	},
		{ 40901,	HK_Creature_Special_Flash,          42431, "ui/ingame/flash.tga",	        ATTACKTRG_Flash			},
		{ 40902,	HK_Creature_Special_Infestation,	42432, "ui/ingame/infestation.tga",		ATTACKTRG_Infestation	},
		{ 40833,	HK_Lucy_Sabotage,                   42344, "ui/ingame/sabotage.tga",	    ATTACKTRG_Sabotage		},
	}

	rex_commands =
	{
		{ 40820,	HK_Generic_Move,			42320, "ui/ingame/henchmen_move.tga" },
		{ 40822,	HK_Generic_Guard,			42323, "ui/ingame/henchmen_guard.tga" },
		{ 40824,	HK_Generic_Stop,			42326, "ui/ingame/henchmen_stop.tga" },
		{ 40826,	HK_Rex_Heal,				42325, "ui/ingame/heal.tga" },

		{ 40830,	HK_Rex_GatherDNA,			42334, "ui/ingame/gather_dna.tga" },
		{ 40831,	HK_Rex_Garrison,			42335, "ui/ingame/garrison.tga" },
	}

	lucy_commands =
	{
		{ 40820,	HK_Generic_Move,			42320, "ui/ingame/henchmen_move.tga" },
		{ 40822,	HK_Generic_Guard,			42323, "ui/ingame/henchmen_guard.tga" },
		{ 40824,	HK_Generic_Stop,			42326, "ui/ingame/henchmen_stop.tga" },
		{ 40823,	HK_Lucy_Repair,				42324, "ui/ingame/repair.tga" },
		{ 40832,	HK_Lucy_GatherTech,			42339, "ui/ingame/gather_tech.tga" },
		{ 40833,	HK_Lucy_Sabotage,			42344, "ui/ingame/sabotage.tga" },

		{ 40831,	HK_Lucy_Garrison,			42335, "ui/ingame/garrison.tga" },

		{ 40825,	HK_Lucy_Build,				42338, "ui/ingame/build_structure.tga" },
		{ 40834,	HK_Lucy_BuildAdvanced,		42347, "ui/ingame/build_structure_advanced.tga" },

		{ 40821,	HK_Lucy_Gather,				42322, "ui/ingame/gather.tga" },
	}

	commands =
	{
		{ 40930,	HK_Generic_Rally,				42370,	"ui/ingame/rallypoint.tga" },
		{ 40931,	HK_Lab_ReleaseRex,				42336,	"ui/ingame/release_rex.tga" },
		{ 40932,	HK_Lab_ReleaseLucy,				42337,	"ui/ingame/release_lucy.tga" },
		{ 40829,	HK_Generic_Kill,				42329,	"ui/ingame/structure_scuttle.tga" },
	}

	radarpulsecommand =
	{ 42444,	HK_Lab_RadarPulse,		42443,	"ui/ingame/radar_pulse.tga" }

	soundbeamcommand =
	{ 42464,	HK_SoundBeam_SonicBoom,	42463,	"ui/ingame/tower_boost.tga" }

	antiaircommand =
	{ 42466,	HK_AntiAir_AirBurst,	42465,	"ui/ingame/tower_boost.tga" }

	labcommands =
	{
		-- Name		Hokey					TT Text		Texture									Command
		{ 42462,	HK_Lab_DefenseTurnOff,	42461,		"ui/ingame/lab_defense_stop.tga",		0 },
		{ 42460,	HK_Lab_DefenseTurnOn,	42459,		"ui/ingame/lab_defense.tga",			1 },
	}

	foundry_commands =
	{
		-- Name		Hotkey							TT Text		Texture							TypeID
		{ 40940,	HK_Foundry_ElecToCoal100,		42467,		"ui/ingame/electocoal100.tga",	RESOURCECONV_ElecToCoal100 },
		{ 40941,	HK_Foundry_ElecToCoal500,		42468,		"ui/ingame/electocoal500.tga",	RESOURCECONV_ElecToCoal500 },
		{ 40942,	HK_Foundry_CoaltoElec100,		42469,		"ui/ingame/coaltoelec100.tga",	RESOURCECONV_CoalToElec100 },
		{ 40943,	HK_Foundry_CoaltoElec500,		42470,		"ui/ingame/coaltoelec500.tga",	RESOURCECONV_CoalToElec500 },
	}

	togglebuildmenucommands =
	{
		{40834,	HK_Henchman_BuildToggle,	42345 },
		{40825,	HK_Henchman_BuildToggle,	42327 },
	}

	backbuttoncommand =
	{
		{42350,	HK_System_Escape,	42351 },
	}

	playback_commands =
	{
		{ 40933, HK_Playback_SpeedNormal, 42445, "ui/ingame/speednormal.tga"},
		{ 40934, HK_Playback_SpeedFast,   42446, "ui/ingame/speedfast.tga"  },
	}

	unitattributes =
	{
		{4273, 4274},	-- Rank
		{4261, 4262},	-- Health
		{4263, 4264},	-- Armor
		{4265, 4266}, 	-- Speed
		{4267, 4268},	-- Sight Radius
		{4269, 4270},	-- Size
		{4277, 4278},	-- Melee Damage
		{0, 0},		-- Range attack 0
		{0, 0},		-- Range attack 1
	}

	henchattributes =
	{
		{56253, 56254},	-- Gather
		{56249, 56250},	-- Melee Damage
		{56247, 56248}, -- Sight Radius
		{56245, 56246},	-- Land Speed
		{56251, 56252},	-- Water Speed
	}

	gyroattributes =
	{
		{56253, 56254},	-- Gather
		{56247, 56248}, -- Sight Radius
		{52211, 56246},	-- Air Speed
	}

	rexattributes =
	{
		{52209, 52210},	-- Neurotoxin
		{52213, 52214}, -- Sight Radius
		{52211, 52212},	-- Land Speed
		{52215, 52216},	-- Water Speed
	}

	lucyattributes =
	{
		{56253, 52217},	-- Gather
		{52213, 52218}, -- Sight Radius
		{52211, 52219},	-- Land Speed
		{52215, 52220},	-- Water Speed
	}

	costdisplay =
	{
		{39541, 39543},	--coal
		{39542, 39544}, --elec
	}

	henchman_modalmodes =
	{
		{ MM_Cursor,	MC_Move },
		{ MM_Cursor,	MC_Gather },
		{ MM_Cursor,	MC_Guard },
		{ MM_Cursor,	MC_Repair },
		{ MM_None,		MC_None },				-- stop
		{ MM_Cursor,	MC_BuildStructure },	-- build basic
		{ MM_Cursor,	MC_BuildStructure },	-- build advanced
		{ MM_Cursor,	MC_Heal },
		{ MM_Cursor,	MC_Tag },
		{ MM_None,		MC_None },				-- kill
		{ MM_Cursor,	MC_Unload },			-- unload
		{ MM_Cursor,	MC_AttackMove },
		{ MM_Cursor,	MC_Airlift },
		{ MM_Cursor,	MC_UnTag },
	}

	creature_modalmodes =
	{
		{ MM_Cursor,	MC_Move },
		{ MM_Cursor,	MC_Guard },
		{ MM_Cursor,	MC_Patrol },
		{ MM_None,		MC_None },			-- stop
		{ MM_Cursor,	MC_AttackGround },
		{ MM_None,		MC_None },			-- kill
		{ MM_Cursor,	MC_AttackMove },
	}

	-- Note: the entries in creature_abilitymodalmodes MUST follow the order of
	--       the SpecialAbilities enumerated type
	creature_abilitymodalmodes =
	{
		{ MM_None,		MC_None },
		{ MM_Cursor,	MC_SonarPulse },
		{ MM_None,		MC_None },
		{ MM_Cursor,	MC_Jumping },
		{ MM_None,		MC_None },
		{ MM_None,		MC_None },
	}

	-- Note: the entries in creature_specialmodalmodes MUST follow the order of
	--       the modal_special_commands enumerated type
	creature_specialmodalmodes =
	{
		{ MM_Cursor,	MC_Plague },
		{ MM_Cursor,	MC_ElectricalBurst },
		{ MM_Cursor,	MC_QuillBurst },
		{ MM_Cursor,	MC_StinkBurst },
		{ MM_Cursor,	MC_WebThrow },
		{ MM_Cursor,	MC_Assassinate },
		{ MM_Cursor,	MC_Flash },
		{ MM_Cursor,	MC_Infestation },
		{ MM_Cursor,	MC_Sabotage },
	}

	-- Note: the entries in rex_modalmodes MUST follow the order of
	--       the rex_commands enumerated type
	rex_modalmodes =
	{
		{ MM_Cursor,	MC_Move },
		{ MM_Cursor,	MC_Guard },
		{ MM_None,		MC_None },			-- stop
		{ MM_Cursor,	MC_Heal },
		{ MM_Cursor,	MC_GatherAnimal },
		{},	-- placeholder
	}

	-- Note: the entries in lucy_modalmodes MUST follow the order of
	--       the lucy_commands enumerated type
	lucy_modalmodes =
	{
		{ MM_Cursor,	MC_Move },
		{ MM_Cursor,	MC_Guard },
		{ MM_None,		MC_None },			-- stop
		{ MM_Cursor,	MC_Repair },
		{ MM_Cursor,	MC_GatherTech },
		{ MM_Cursor,	MC_Sabotage },
		{},	-- placeholder
		{},	-- placeholder
		{},	-- placeholder
		{ MM_Cursor,	MC_Gather },
	}

	teamobj_modalmode = { MM_Cursor, MC_TeamObjective }

	structures =
	{
		{ ResourceRenew_EC,		HK_Henchman_Build_Lightning, 		42250 },
		{ RemoteChamber_EC,		HK_Henchman_Build_Remote, 			42253 },
		{ SoundBeamTower_EC,	HK_Henchman_Build_SoundBeamTower, 	42259 },
		{ BrambleFence_EC,		HK_Henchman_Build_Bramble, 			42252 },
		{ Foundry_EC,			HK_Henchman_Build_Foundry, 			42257 },
		{ ElectricGenerator_EC,	HK_Henchman_Build_Electrical,		42251 },
		{ Aviary_EC,			HK_Henchman_Build_Aviary, 			42255 },
		{ WaterChamber_EC,		HK_Henchman_Build_Water, 			42254 },
		--advanced structures
		{ AntiAirTower_EC,		HK_Henchman_Build_AntiAirTower, 	42258 },
		{ VetClinic_EC,			HK_Henchman_Build_VetClinic, 		42256 },
		{ GeneticAmplifier_EC,		HK_Henchman_Build_GeneticAmplifier,	42276 },
		{ LandingPad_EC,		HK_Henchman_Build_LandingPad,		42269 },
	}

	advancedstructures =
	{
	}

	--
	-- Research
	--

	labresearch =
	{
		{RESEARCH_AdvancedStructure,	HK_Research_AdvancedStruct, 42260 },
		{RESEARCH_Rank2,			HK_Research_Rank2, 42264 },
		{RESEARCH_Rank3,			HK_Research_Rank3, 42265 },
		{RESEARCH_Rank4,			HK_Research_Rank4, 42266 },
		{RESEARCH_Rank5,			HK_Research_Rank5, 42267 },
	}

	vetresearch =
	{
		{RESEARCH_HenchmanBinoculars,			HK_Research_HenchmanBinoculars, 42262 },
		{RESEARCH_HenchmanTag,				HK_Research_HenchmanTag, 42263 },
		{RESEARCH_HenchmanYoke,				HK_Research_HenchmanYoke, 42270 },
		{RESEARCH_HenchmanHeal,				HK_Research_HenchmanHeal, 42268 },
		{RESEARCH_HenchmanMotivationalSpeech,	HK_Research_HenchmanMotSpeech, 42271 },
		{RESEARCH_IncBuildingIntegrity,			HK_Research_IncBuildIntegrity, 42274 },
		{RESEARCH_TowerUpgrade,				HK_Research_TowerUpgrade, 42284 },
		{RESEARCH_StrengthenFences,			HK_Research_StrengthenFences, 42272 },
		{RESEARCH_StrengthenElectricalGrid,		HK_Research_StrengthenElecGrid, 42273 },
--		{RESEARCH_LabDefense,				HK_Research_LabDefense, 42458 },
	}

	foundaryresearch =
	{
	}

	--
	-- Add-Ons
	--

	generatoraddons =
	{
		{ADDON_EGen1,	HK_AddOn_EGen1, 42277 },
		{ADDON_EGen2,	HK_AddOn_EGen2, 42277 },
		{ADDON_EGen3,	HK_AddOn_EGen3, 42277 },
	}

	--
	-- Creature Upgrades
	--

	creatureupgrades =
	{
		{CREATUREUPGRADE_Defense,		HK_Upgrade_Defense, 42260 },
		{CREATUREUPGRADE_Speed,			HK_Upgrade_Speed, 42260 },
		{CREATUREUPGRADE_MeleeDamage,	HK_Upgrade_MeleeDamage, 42260 },
		{CREATUREUPGRADE_HitPoints,		HK_Upgrade_HitPoints, 42260 },
		{CREATUREUPGRADE_SightRadius,		HK_Upgrade_SightRadius, 42260 },
		{CREATUREUPGRADE_RangedDamage,	HK_Upgrade_RangedDamage, 42260 },
		{CREATUREUPGRADE_SplashDamage,	HK_Upgrade_SplashDamage, 42260 },
		{CREATUREUPGRADE_AreaAttackRadius,	HK_Upgrade_AreaAttackRadius, 42260 },
	}

	rex_abilities =
	{
		{ CHARABILITYTYPE_RexPoisonTouch, 	38400, 38401 },
		{ CHARABILITYTYPE_RexRegeneration, 	38402, 38403 },
		{ CHARABILITYTYPE_RexKeenSense, 	38404, 38405 },
		{ CHARABILITYTYPE_RexNeuroToxin, 	38406, 38407 },
		{ CHARABILITYTYPE_RexPack, 		38408, 38409 },
	}

	lucy_abilities =
	{
		{ CHARABILITYTYPE_LucySabotage, 52221, 52222 },
	}

	singleselectinfotable =
	{
		{38411, 38411},		-- healthbar/healthlabel
		{38412, 38413},		-- entity icon
		{38414, 38415},		-- entity damage
		{38416, 38417},		-- entity endurance
		{38418, 38419},		-- entity name
	}

	-- Record the taskbar menu context so that we can refresh the menu without losing
	-- the context.  The menu is made up of 3 parts: the Lua expression to call to
	-- recover the context, and the Lua function to call to ensure that at least one
	-- of the selected entities qualifies for this context, and the command to end
	-- any modal UI state.  The 1st part is the context refresher
	-- and the 2nd part is the context qualifier.
	--
	menucontext = { "", "", "" }

	-- for the building menu we store a global that will either point to the 'structures' or 'advancedstructures' table
	currentstructures = structures

	-- creature to upgrade (for the genetic amplifier)
	creature_to_upgrade = -1

	-- menu context for special modal commands
	special_modal_index = -1
	special_modal_type  = -1

	-- skip/disabled on_refresh and on_selection counter
	skip_refresh = 0
	disabled_refresh = 0

	-- Count of dead creatures and timeout before it is cleared.
	track_deaths_units = {}
	track_deaths_timeout = 800

	-- Stores the number of columns used for each row for infocenter utilities.
	-- Used to determine whether a refresh is required.
	infocenterutilities_rows = {}

	-- Stores data about the cells used by infocenter utilities.
	-- Used to determine whether a refresh is required.
	_infocenterutilities_cells = {}

	-- Stores some variables used by infocenterobserverutilities.
	infocenterobserverutilities_context = {}

	-- Stores currently shown tooltip hud names as keys
	tooltip_visible_huds = {}

--
cleartaskbar = function()

	local id = Selection.preferred()

	local type = EntityType( id )

	Clear()

	update_tooltip_timer()

	if Entities.is_player_dead(LocalPlayer()) == 1 or CHEATS_OBSERVER_UI == 1 then
		track_deaths_show()
	end

	showhud("updater_label01")

	-- background bitmaps
	showhud( "picturelabel" )

	BindHotkey( HK_System_Escape, "deselectall", 0 )
	BindHotkey( HK_System_Focus, "focusonselection", 0 )
	BindHotkey( HK_System_ZoomCameraIn, "zoomin", 0 )
	BindHotkey( HK_System_ZoomCameraOut, "zoomout", 0 )
	BindHotkey( HK_Unassign_FromAllGroups, "unhotkeygroup", 0 )

	bindlabeltogametime( "gametime_label" )

	if not( LocalPlayer() == 0 ) then

		bindhotkeytoevent( HK_Generic_Event )

	end

	BindHotkey( HK_Select_NextSubSelection, "nextsubselect", 0 )

	-- quick keyboard selection
	if not( LocalPlayer() == 0 ) then

		BindHotkey       ( HK_Select_UnitsOnScreen, "selectallunitsonscreen", 0 )
		BindHotkey       ( HK_Select_HenchmenOnScreen, "selectallhenchmenonscreen", 0 )
		BindHotkey       ( HK_Select_HenchmenInWorld, "selectallhenchmeninworld", 0 )
		BindHotkey       ( HK_Select_HenchmenNextIdle, "selectnextidlehenchman", 0 )
		BindHotkey       ( HK_Select_HenchmenAllIdle, "selectallidlehenchman", 0 )
		BindHotkey       ( HK_Select_CombatUnitsOnScreen, "selectallcombatunitsonscreen", 0 )
		BindHotkey       ( HK_Select_CombatUnitsInWorld, "selectallcombatunitsinworld", 0 )
		BindHotkey       ( HK_Select_GroundCombatUnitsOnScreen, "selectallgroundcombatunitsonscreen", 0 )
		BindHotkey       ( HK_Select_GroundCombatUnitsInWorld, "selectallgroundcombatunitsinworld", 0 )
		BindHotkey       ( HK_Select_AirCombatUnitsOnScreen, "selectallaircombatunitsonscreen", 0 )
		BindHotkey       ( HK_Select_AirCombatUnitsInWorld, "selectallaircombatunitsinworld", 0 )
		BindHotkey       ( HK_Select_WaterCombatUnitsOnScreen, "selectallwatercombatunitsonscreen", 0 )
		BindHotkey       ( HK_Select_WaterCombatUnitsInWorld, "selectallwatercombatunitsinworld", 0 )
		BindHotkey       ( HK_Select_MeleeCombatUnitsOnScreen, "selectallmeleecombatunitsonscreen", 0 )
		BindHotkey       ( HK_Select_MeleeCombatUnitsInWorld, "selectallmeleecombatunitsinworld", 0 )
		BindHotkey       ( HK_Select_RangedCombatUnitsOnScreen, "selectallrangedcombatunitsonscreen", 0 )
		BindHotkey       ( HK_Select_RangedCombatUnitsInWorld, "selectallrangedcombatunitsinworld", 0 )
		BindHotkey       ( HK_Select_NextGroundCombiner, "selectnextgroundcombiner", 0 )
		BindHotkey       ( HK_Select_NextWaterCombiner, "selectnextwatercombiner", 0 )
		BindHotkey       ( HK_Select_NextAirCombiner, "selectnextaircombiner", 0 )
		BindHotkey       ( HK_Select_NextCombiner, "selectnextcombiner", 0 )
		BindHotkey       ( HK_Select_NextFoundry, "selectnextfoundry", 0 )
		BindHotkey       ( HK_Select_NextVetClinic, "selectnextvetclinic", 0 )
		BindHotkey       ( HK_Select_NextGeneticAmplifier, "selectnextgeneticamplifier", 0 )
		BindHotkey       ( HK_Select_NextElectricGenerator, "selectnextelectricgenerator", 0 )
		BindHotkey       ( HK_Select_Lab, "selectlab", 0 )
		BindHotkey       ( HK_Select_Rex, "selectrex", 0 )
		BindHotkey       ( HK_Select_Lucy, "selectlucy", 0 )

	end

	-- player resources
	show_resources()

	-- button

	if 1 == 1 then
		bindbutton( "menu_button", menu_commands[1][2], "escapemenu",  "menutooltip", "", 1 )
	end

	if ArmyBuilderAllowed() == 1 then
		bindbuttontoarmybuilder( "buildarmy_button",  menu_commands[2][2], "armybuilder", "menutooltip", "", 2 )
	end

	if SpeechRecallAllowed() == 1 then
		bindbutton( "speechrecall_button", menu_commands[7][2], "speechrecall", "menutooltip", "", 7 )
	end

	if AllyAllowed() == 1 then
		bindbutton( "ally_button", menu_commands[4][2], "allymenu", "menutooltip", "", 4 )
	end

	if ObjectivesAllowed() == 1 then
		bindbuttontoobjectives( "objectives_button", menu_commands[5][2], "objvmenu", "menutooltip", "", 5 )
	end

	if TeamObjectiveAllowed() == 1 then
		BindHotkey( HK_Generic_TeamObjective, "doteamobjmodal", 0 )
	end

	local chat = ChatAllowed()

	if (chat == CHATALLOW_Ok) or (chat == CHATALLOW_Dead) or (chat == CHATALLOW_COPPA) then
		bindbuttontochat( "chat_button", menu_commands[3][2], "chat", "chattooltip" )
	end

	--toolbar utilities

	if TeamObjectiveAllowed() == 1 then
		bindbutton( "teamobj_button", toolbar_commands[1][2], "doteamobjmodal",  "teamobjtooltip", "", 1 )
	end

	bindbutton("selectlab_button", toolbar_commands[2][2], "selectlab", "selectlabtooltip", "", 2)

	bindbutton("nextchamber_button", toolbar_commands[3][2], "selectnextgroundcombiner", "nextcctooltip", "", 3)

	bindbutton("selectidle_button", toolbar_commands[4][2], "selectallidlehenchman", "allidletooltip", "", 4)

	bindbutton("selectall_button", toolbar_commands[5][2], "selectallcombatunitsinworld", "allunitstooltip", "", 5)

	--disable toolbar

	-- dummy button (2)
	bindbutton( "group_button", "", "dummy", "", "", 0 )
	bindbuttontogroup( "hotkey_1",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 0 )
	bindbuttontogroup( "hotkey_2",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 1 )
	bindbuttontogroup( "hotkey_3",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 2 )
	bindbuttontogroup( "hotkey_4",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 3 )
	bindbuttontogroup( "hotkey_5",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 4 )
	bindbuttontogroup( "hotkey_6",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 5 )
	bindbuttontogroup( "hotkey_7",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 6 )
	bindbuttontogroup( "hotkey_8",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 7 )
	bindbuttontogroup( "hotkey_9",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 8 )
	bindbuttontogroup( "hotkey_0",	"selecthotkeygroup_callback", "assignhotkeygroup_callback", "selecthotkeygroup_tooltipcb", 9 )

	for i = 1, getn(hotkeyaddgroups) do
		BindHotkey(hotkeyaddgroups[i], "assignhotkeyaddgroup", 0)
	end

	for i = 1, getn(hotkeyremovegroups) do
		BindHotkey(hotkeyremovegroups[i], "assignhotkeyremovegroup", 0)
	end

	-- minimap
	bindlabeltotooltip( "minimaptooltip", "minimap_tooltipcb" )

	-- infocenter
	infocenter()

	-- playback buttons
	if FastSpeedAllowed() == 1 or (CHEATS_FAST_SPEED_ALLOWED == 1 and SelectionCount() == 0) then

		if IsFastSpeed() == 1 then

			-- Show play button (normal speed)
			bindbutton( "command_modal_icon01", playback_commands[1][2], "dospeedfast", "playbacktooltip", playback_commands[1][4], 1 )

		else

			-- Show fast forward button (fast speed)
			bindbutton( "command_modal_icon01", playback_commands[2][2], "dospeednormal",   "playbacktooltip", playback_commands[2][4], 2 )

		end
	end

end

--
show_resources = function()
	local player_labels_map

	if Entities.is_player_dead(LocalPlayer()) == 0 and CHEATS_OBSERVER_UI ~= 1 then
		local player_labels = local_player_recource_labels
		_show_player_resources(LocalPlayer(), player_labels)

	else
		player_labels_map = _get_team_resource_labels()
		for i = 1, world_getplayercount() do
			local player_labels = player_labels_map[i]
			if player_labels ~= nil then
				_show_player_resources_advanced(world_getplayerat(i - 1), player_labels)
			end
		end
	end

	-- TODO: Replace with Entities.call_register()
	Timer.call_register("update_resources", update_resources, {player_labels_map}, 25)
end

_show_player_resources = function(player_id, player_labels)
	showhud(player_labels[1])

	-- coal
	bindhudtotooltip(player_labels[2], "resourceindicatorstooltip", 1, 2)
	bindlabeltoplayerrenew(player_labels[3], "resourceindicatorstooltip", 2, player_id)

	-- electricity
	bindhudtotooltip(player_labels[5], "resourceindicatorstooltip", 1, 1)
	bindlabeltoplayergather(player_labels[6], "resourceindicatorstooltip", 1, player_id)

	-- -- population (handled in update_resources)
	-- bindhudtotooltip(player_labels[8], "resourceindicatorstooltip", 1, 3)
	-- bindlabeltoplayerpop(player_labels[9], "resourceindicatorstooltip", 3, player_id)

	-- -- henchmen population (handled in update_resources)
	-- bindhudtotooltip(player_labels[11], "resourceindicatorstooltip", 1, 5)
	-- bindhudtotooltip(player_labels[12], "resourceindicatorstooltip", 1, 5)
end

_show_player_resources_advanced = function(player_id, player_labels)
	_show_player_resources(player_id, player_labels)

	-- player color (icon handled in update_resources)
	bindlabeltoplayercolour(player_labels[14], player_id)
	bindhudtotooltip(player_labels[14], "resourceindicatorstooltip", 1, 6)

	-- player name
	bindlabeltoplayername(player_labels[15], player_id)
	bindhudtotooltip(player_labels[15], "resourceindicatorstooltip", 1, 6)
end

update_resources = function(player_labels_map)
	if player_labels_map == nil then
		_update_player_resources(LocalPlayer(), local_player_recource_labels, 1)
	else
		for i = 1, world_getplayercount() do
			local player_labels = player_labels_map[i]
			if player_labels ~= nil then
				_update_player_resources(world_getplayerat(i - 1), player_labels)
			end
		end
	end
end

_update_player_resources = function(player_id, player_labels, blink)
	local blink_population, blink_henchpop = 0, 0

	-- get blinking state for total population and henchmen population
	if blink == 1 then
		local units = track_deaths_units[player_id]
		local dead_total = units ~= nil and units.dead or 0
		local now = Timer.now()
		local timeout = 200
		if dead_total > 0 and now - units.time < timeout then
			local blink_interval = 20
			if abs(_update_player_resources_blink or 0) - now <= 0 then
				_update_player_resources_blink = ((_update_player_resources_blink or 0) < 0 and 1 or -1) * (now + blink_interval)
			end

			Timer.register("update_resources_blink", on_refresh_main, nil, -blink_interval, 0)

			if _update_player_resources_blink + now <= 0 then
				local gatherer_ebp = GathererEBP()
				local unit = units.units[gatherer_ebp]
				local dead_henchmen = unit ~= nil and now - unit.time < timeout and unit.dead or 0

				local dead_creatures = 0
				for ebpid, unit in units.units do
					if ebpid ~= gatherer_ebp and now - unit.time < timeout then
						dead_creatures = dead_creatures + unit.dead
					end
				end

				blink_population = dead_creatures > 0 and 1 or 0
				blink_henchpop = dead_henchmen > 0 and 1 or 0
			end
		end
	end

	-- player color and rank
	local icon
	if Entities.is_player_dead(player_id) == 1 then
		-- change icon to skull
		icon = ICN_Dead_Color
	else
		icon = ICNS_Rank_Color[Stats_RankFinal(player_id)] or ICN_Player_Color
	end
	bindbuttondisabled(player_labels[14] or "", "", "", "", icon, 0)

	-- update population icons
	local icon_population = blink_population ~= 1 and ICN_Population or ICN_Population_Dead
	local icon_henchpop = blink_henchpop ~= 1 and ICN_Henchpop or ICN_Henchpop_Dead
	bindbuttondisabled(player_labels[8] or "", "", "", "resourceindicatorstooltip", icon_population, 3)
	bindbuttondisabled(player_labels[11] or "", "", "", "resourceindicatorstooltip", icon_henchpop, 5)

	-- update population texts
	local label_population = blink_population ~= 1 and player_labels[9] or player_labels[10]
	local label_henchpop = blink_henchpop ~= 1 and player_labels[12] or player_labels[13]
	bindlabeltoplayerpop(label_population, "resourceindicatorstooltip", 3, player_id)
	bindlabeltotext(label_henchpop, numtotxtid(Entities.count(player_id, GathererEBP())))
	bindhudtotooltip(label_henchpop, "resourceindicatorstooltip", 1, 5)
end

_get_team_resource_labels = function(refresh)
	if refresh ~= 1 and _team_resource_labels_cache and (
		_team_resource_labels_cache[1] == -1 or _team_resource_labels_cache[1] - Timer.now() > 0
	) then
		return _team_resource_labels_cache[2], _team_resource_labels_cache[1]
	end

	local teams, _, expire = get_teams(refresh)

	-- sort teams and make teams_key
	local sorted_teams = {}
	local teams_key = ""
	for i = 1, getn(teams) do
		local team = teams[i]

		local index = getn(sorted_teams) + 1
		while index > 1 and getn(sorted_teams[index - 1]) < getn(team) do
			index = index - 1
		end
		tinsert(sorted_teams, index, team)
		teams_key = strsub(teams_key, 1, (index - 1) * 2).. "x"
			.. getn(team) .. strsub(teams_key, (index - 1) * 2 + 1)
	end
	teams_key = strsub(teams_key, 2)

	-- get label order
	-- local teams_key_original = teams_key --DEBUG
	local player_order = team_recource_label_orders[teams_key]
	while player_order == nil and strlen(teams_key) > 1 do
		teams_key = strsub(teams_key, 1, -3)
		player_order = team_recource_label_orders[teams_key]
	end

	-- print("expire: " .. toplain(expire) .. "\n" --DEBUG
		-- .. "teams: " .. toplain(teams) .. "\n" --DEBUG
		-- .. "sorted_teams: " .. toplain(sorted_teams) .. "\n" --DEBUG
		-- .. "key: " .. toplain(teams_key_original) .. " => " .. toplain(teams_key) .. "\n" --DEBUG
		-- .. "order: " .. toplain(player_order)) --DEBUG
	if player_order == nil then
		player_order = {1, 2, 3, 4, 5, 6}
	end

	-- map player index -> labels
	local labels_map = {}
	local index = 1
	for i = 1, getn(sorted_teams) do
		local team = sorted_teams[i]
		for j = 1, getn(team) do
			local player_index = team[j]
			local labels_index = player_order[index]
			local player_labels = labels_index and player_recource_labels[labels_index]
			labels_map[player_index] = player_labels
			index = index + 1
		end
	end

	_team_resource_labels_cache = {expire, labels_map}
	return labels_map, expire
end

--
armybuilder = function( dummy )

	ArmyBuilderShow()

end

--
chat = function( dummy )

	ChatShow()

end

-- playback at normal speed
dospeednormal = function( dummy )

	SetFastSpeed( 1 )

	cleartaskbar()

end

-- playback at fast speed
dospeedfast = function( dummy )

	SetFastSpeed( 0 )

	cleartaskbar()

end

--

henchmanattributestooltip = function( index )

	if index >= 1 and index <= getn( henchattributes ) then

		local titleid	= henchattributes[ index ][1]
		local descid	= henchattributes[ index ][2]

		on_show_tooltip()
		HelpTextTitle( titleid )
		HelpTextTextWithoutRequirements( descid )

	end

end

gyrotooltip = function( index )

	if index >= 1 and index <= getn( gyroattributes ) then

		local titleid	= gyroattributes[ index ][1]
		local descid	= gyroattributes[ index ][2]

		on_show_tooltip()
		HelpTextTitle( titleid )
		HelpTextTextWithoutRequirements( descid )

	end

end

rexattributestooltip = function( index )

	if index >= 1 and index <= getn( rexattributes ) then

		local titleid	= rexattributes[ index ][1]
		local descid	= rexattributes[ index ][2]

		on_show_tooltip()
		HelpTextTitle( titleid )
		HelpTextTextWithoutRequirements( descid )

	end

end


lucyattributestooltip = function( index )

	if index >= 1 and index <= getn( lucyattributes ) then

	local titleid	= lucyattributes[ index ][1]
		local descid	= lucyattributes[ index ][2]

		on_show_tooltip()
		HelpTextTitle( titleid )
		HelpTextTextWithoutRequirements( descid )

	end

end

unitcosttooltip = function( index )

	if index >= 1 and index <= getn( costdisplay ) then

		local titleid	= costdisplay[ index ][1]
		local descid	= costdisplay[ index ][2]

		on_show_tooltip()
		HelpTextTitle( titleid )
		HelpTextTextWithoutRequirements( descid )

	end

end


chattooltip = function( enabled, index )

	on_show_tooltip()
	HelpTextTitle( 40952 )
	HelpTextChat ()

end

--
tooltip_command = function( enabled, index, table )

	if index >= 1 and index <= getn( table ) then

	on_show_tooltip()
	HelpTextTitle		( table[ index ][1] )
	HelpTextShortcut	( table[ index ][2] )
	HelpTextTextWithoutRequirements( table[index][3] )

	end

end

--
speechrecall = function( dummy )

	SpeechRecallShow()

end

--
resourceindicatorstooltip = function( enabled, index )

	if index >= 1 and index <= getn( resource_indicator_tooltips ) then

		on_show_tooltip()
		HelpTextTitle( resource_indicator_tooltips[ index ][1] )
		HelpTextTextWithoutRequirements( resource_indicator_tooltips[index][3] )

	end

end

--
menutooltip = function( enabled, index )

	tooltip_command( enabled, index, menu_commands )

end

--
playbacktooltip = function( enabled, index )

	tooltip_command( enabled, index, playback_commands )

end

teamobjtooltip = function( enabled, index )

	tooltip_command( enabled, index, toolbar_commands )

end

selectlabtooltip = function( enabled, index )

	tooltip_command( enabled, index, toolbar_commands )

end

nextcctooltip = function( enabled, index )

	tooltip_command( enabled, index, toolbar_commands )

end

allidletooltip = function( enabled, index )

	tooltip_command( enabled, index, toolbar_commands )

end

allunitstooltip = function( enabled, index )

	tooltip_command( enabled, index, toolbar_commands )

end

--
tooltip_previous_page = function()
	on_show_tooltip()
	HelpTextTitle(62060)
end

tooltip_next_page = function()
	on_show_tooltip()
	HelpTextTitle(62061)
end

tooltip_scroll_up = function()
	on_show_tooltip()
	HelpTextTitle(62062)
end

tooltip_scroll_down = function()
	on_show_tooltip()
	HelpTextTitle(62063)
end

--
infocentersinglebasicstats = function( id )

	local ebpid = EntityEBP( id )
	local owner = EntityOwner( id )

	-- basic stats
	bindlabeltoentityname  ( "singlselect_name_label",    id, "singleselectinfotooltip", 5 )

	if CreatureHasUpgrade( owner, ebpid, CREATUREUPGRADE_HitPoints ) == 0 then
		bindlabeltoentityhealth( "singlselect_statbar_label", id, "singleselectinfotooltip", 1 )
	else
		bindlabeltoentityhealth( "singlselect_statbar_upgrade", id, "singleselectinfotooltip", 1 )
	end

	bindimagetoentityicon  ( "singlselect_icon", id, "singleselectinfotooltip", 2 )

	bindbartoentityhealth  ( "singlselect_statbar", id, "singleselectinfotooltip", 1 )

	bindlabeltoentitydamage( "textlabel_status", id, "singleselectinfotooltip", 3 )

	if EntityHasEndurance( id ) == 1 then

		bindbartoentityendurance( "singlselect_statbar0", id, "singleselectinfotooltip", 4  )

	end

	-- owner
	if EntityBelongsToPlayer( id ) == 0 then

		-- owner
		bindlabeltoplayername  ( "textlabel_playerinfo1", EntityOwner( id ) )
		bindlabeltoplayercolour( "color_label",           EntityOwner( id ) )

		-- ally/enemy
		if not( LocalPlayer() == 0) then
			if SelectionIsEnemy() == 1 then
				bindlabeltotext( "textlabel_infoline02", 40971 )

			elseif SelectionIsAlly() == 1 then
				bindlabeltotext( "textlabel_infoline02", 40970 )

			end
		end

	end

end

--
infocenterresearch = function( id, enable )

	-- research stuff
	bindlabeltoresearchprogress ( "buildque_progress_label", id )
	bindlabeltoinresearch		( "buildque_name_label", id )
	bindbuttontoinresearch		( "buildque_icon00", "", "docancelresearch", "", id, enable )
	bindbartoresearch			( "buildque_progress_statbar", id )

	if IsLabDefenseEnabled( id ) == 1 then
		bindbartolabdefense( "singlselect_statbar0", id )

	end

end

--
infocentercreatureupgrade = function( id, enabled )

	-- creature upgrade stuff
	bindlabeltocreatureupgradeprogress ( "buildque_progress_label", id )
	bindlabeltoincreatureupgrade	( "buildque_name_label", id )
	bindbuttontoincreatureupgrade	( "buildque_icon00", "", "docancelcreatureupgrade", "", id, enabled )
	bindbartocreatureupgrade		( "buildque_progress_statbar", id )

end

--
infocenterconstruction = function( id, enabled )

	-- construction
	bindlabeltoconstructionprogress( "buildque_progress_label", id )
	bindbuttontoinconstruction     ( "buildque_icon00", "", "docancelconstruction", "", id, enabled )
	bindbartoconstruction          ( "buildque_progress_statbar", id )

end

--
infocenteraddon = function( id, enabled )

	-- add-on
	bindlabeltoinaddon ( "buildque_name_label", id )
	bindbuttontoinaddon( "buildque_icon00", "", "docanceladdon", "", id, enabled )
	bindbartoaddon     ( "buildque_progress_statbar", id )
	bindlabeltoaddon   ( "buildque_progress_label", id )

end

--
infocenterbuildqueue = function( id, enabled )

	--
	local bqbuttons =
	{
		"buildque_icon00",
		"buildque_icon01",
		"buildque_icon02",
		"buildque_icon03",
		"buildque_icon04",
		"buildque_icon05",
		"buildque_icon06",
		"buildque_icon07"
	}

	local n = getn( bqbuttons )
	local bqlength = BuildQueueLength( id )

	local count = 0

	if( n < bqlength ) then
		count = n
	else
		count = bqlength
	end

	for i = 0, count - 1
	do

		bindbuttontobuildqueue( bqbuttons[ i + 1 ], "", "docancelbuildunit", "", id, i, enabled )

	end

	bindlabeltobuildqueue   ( "buildque_name_label", id, 0 )
	bindlabeltobuildprogress( "buildque_progress_label", id )
	bindbartobuildqueue     ( "buildque_progress_statbar", id )

	if IsLabDefenseEnabled( id ) == 1 then
		bindbartolabdefense( "singlselect_statbar0", id )

	end

end

--
simpletooltip = function(titleid, descid)
	on_show_tooltip()

	if (titleid or 0) ~= 0 then
		HelpTextTitle(titleid)
	end

	if (descid or 0) ~= 0 then
		HelpTextTextWithoutRequirements(descid)
	end
end

--
unitattrtooltip = function( index )

	if index >= 1 and index <= getn( unitattributes ) then

		local titleid	= unitattributes[ index ][1]
		local descid	= unitattributes[ index ][2]

		on_show_tooltip()
		HelpTextTitle( titleid )
		HelpTextTextWithoutRequirements( descid )

	end

end

speedtooltip = function( )
	unitattrtooltip(UATTR_Speed+1)
end

--
unitabilitytooltip = function( ebpid, ability )
	on_show_tooltip()
	HelpTextCreatureAbility( ebpid, ability )
end

--
unitrangeattacktooltip = function( ebpid, rangeattack )
	on_show_tooltip()
	HelpTextCreatureRangeAttack( ebpid, rangeattack )
end

--
piercetooltip = function( ebpid, rangeattack )
	on_show_tooltip()
	HelpTextTitle(39539)
	HelpTextTextWithoutRequirements(39540)
end

--
rexabilitytooltip = function( ability, dummy )

	local abilities = rex_abilities

	on_show_tooltip()

	for i = 1, getn( abilities )
	do
		if abilities[ i ][ 1 ] == ability then

			HelpTextRexAbility( abilities[i][2], abilities[i][3] )

		end

	end

end
--

lucyabilitytooltip = function( index )

	on_show_tooltip()

	if index >= 1 and index <= getn( lucy_abilities ) then

		local titleid	= lucy_abilities[ index ][2]
		local descid	= lucy_abilities[ index ][3]

		HelpTextTitle( titleid )
		HelpTextTextWithoutRequirements( descid )

	end

end


--
infocentercreature = function( id )

	local ebpid = EntityEBP( id )
	local owner = EntityOwner( id )

	--
	showhud( "attribute_backlabel" )

	-- rank
	bindicontocreatureattribute( "rank_icon",				"unitattrtooltip", ebpid, UATTR_Rank    )

	-- attributes icons
	bindicontocreatureattribute( "armor_staticon",			"unitattrtooltip", ebpid, UATTR_Armor	 )
	bindicontocreatureattribute( "speed_staticon",			"unitattrtooltip", ebpid, UATTR_Speed	 )
	bindicontocreatureattribute( "sightradius_staticon",	"unitattrtooltip", ebpid, UATTR_Sight   )
	bindicontocreatureattribute( "meleedamage_staticon",	"unitattrtooltip", ebpid, UATTR_Melee   )

	-- attribute labels

		-- defense / armour
	if CreatureHasUpgrade( owner, ebpid, CREATUREUPGRADE_Defense ) == 0 then
		bindlabeltocreatureattribute( "armor_number", "unitattrtooltip", owner, ebpid, UATTR_Armor	 )
	else
		bindlabeltocreatureattribute( "armor_upgrade", "unitattrtooltip", owner, ebpid, UATTR_Armor	 )
	end

		-- sight radius
	if CreatureHasUpgrade( owner, ebpid, CREATUREUPGRADE_SightRadius ) == 0 then
		bindlabeltocreatureattribute( "sightradius_number", "unitattrtooltip", owner, ebpid, UATTR_Sight   )
	else
		bindlabeltocreatureattribute( "sightradius_upgrade", "unitattrtooltip", owner, ebpid, UATTR_Sight   )
	end

		-- melee damage
	if CreatureHasUpgrade( owner, ebpid, CREATUREUPGRADE_MeleeDamage ) == 0 then
		bindlabeltocreatureattribute( "meleedamage_number", "unitattrtooltip", owner, ebpid, UATTR_Melee   )
	else
		bindlabeltocreatureattribute( "meleedamage_upgrade", "unitattrtooltip", owner, ebpid, UATTR_Melee   )
	end

		-- speed labels
	if CreatureHasUpgrade( owner, ebpid, CREATUREUPGRADE_Speed ) == 0 then
		bindlabelstocreaturespeed	(
								"speedtooltip",
								"speedtooltip",
								"speedtooltip",
								"speedtooltip",
								"landspeed_number",
								"waterspeed_number",
								"airspeed_number",
								"purewaterspeed_number",
								owner,
								ebpid
								);
	else
		bindlabelstocreaturespeed	(
								"speedtooltip",
								"speedtooltip",
								"speedtooltip",
								"speedtooltip",
								"landspeed_upgrade",
								"waterspeed_upgrade",
								"airspeed_upgrade",
								"purewaterspeed_upgrade",
								owner,
								ebpid
								);
	end

	-- range attacks
	local rangeAttackCount = GetRangeAttackCount(ebpid)
	if rangeAttackCount == 1 then
		showhud("attribute_backlabel1")
		if CreatureHasUpgrade( owner, ebpid, CREATUREUPGRADE_RangedDamage ) == 0 then
			bindlabeltocreaturerangeattack( "range1damage_staticon", "range1damage_number", "range1damage_pierce", "unitrangeattacktooltip" , "piercetooltip", owner, ebpid, 0 )
		else
			bindlabeltocreaturerangeattack( "range1damage_staticon", "range1damage_upgrade", "range1damage_pierce", "unitrangeattacktooltip" , "piercetooltip", owner, ebpid, 0 )
		end
	elseif rangeAttackCount == 2 then
		showhud("attribute_backlabel1")
		showhud("attribute_backlabel2")

		if CreatureHasUpgrade( owner, ebpid, CREATUREUPGRADE_RangedDamage ) == 0 then
			bindlabeltocreaturerangeattack( "range2damage_staticon", "range2damage_number", "range2damage_pierce", "unitrangeattacktooltip" , "piercetooltip", owner, ebpid, 0 )
		else
			bindlabeltocreaturerangeattack( "range2damage_staticon", "range2damage_upgrade", "range2damage_pierce", "unitrangeattacktooltip" , "piercetooltip", owner, ebpid, 0 )
		end

		if CreatureHasUpgrade( owner, ebpid, CREATUREUPGRADE_RangedDamage ) == 0 then
			bindlabeltocreaturerangeattack( "range1damage_staticon", "range1damage_number", "range1damage_pierce", "unitrangeattacktooltip" , "piercetooltip", owner, ebpid, 1 )
		else
			bindlabeltocreaturerangeattack( "range1damage_staticon", "range1damage_upgrade", "range1damage_pierce", "unitrangeattacktooltip" , "piercetooltip",  owner, ebpid, 1 )
		end
	end

	-- abilities
	if IsAbilityUpgraded( owner, ebpid, 0 ) == 1 then
		bindlabeltocreatureability	( "textlabel_upgradeline03",	"unitabilitytooltip", ebpid, 0, 1 )
	else
		bindlabeltocreatureability	( "textlabel_infoline03",	"unitabilitytooltip", ebpid, 0, 0 )
	end

	if IsAbilityUpgraded( owner, ebpid, 1 ) == 1 then
		bindlabeltocreatureability	( "textlabel_upgradeline04",	"unitabilitytooltip", ebpid, 1, 1 )
	else
		bindlabeltocreatureability	( "textlabel_infoline04",	"unitabilitytooltip", ebpid, 1, 0 )
	end

	if IsAbilityUpgraded( owner, ebpid, 2 ) == 1 then
		bindlabeltocreatureability	( "textlabel_upgradeline05",	"unitabilitytooltip", ebpid, 2, 1 )
	else
		bindlabeltocreatureability	( "textlabel_infoline05",	"unitabilitytooltip", ebpid, 2, 0 )
	end

	if IsAbilityUpgraded( owner, ebpid, 3 ) == 1 then
		bindlabeltocreatureability	( "textlabel_upgradeline06",	"unitabilitytooltip", ebpid, 3, 1 )
	else
		bindlabeltocreatureability	( "textlabel_infoline06",	"unitabilitytooltip", ebpid, 3, 0 )
	end

	if IsAbilityUpgraded( owner, ebpid, 4 ) == 1 then
		bindlabeltocreatureability	( "textlabel_upgradeline07",	"unitabilitytooltip", ebpid, 4, 1 )
	else
		bindlabeltocreatureability	( "textlabel_infoline07",	"unitabilitytooltip", ebpid, 4, 0 )
	end

	if IsAbilityUpgraded( owner, ebpid, 5 ) == 1 then
		bindlabeltocreatureability	( "textlabel_upgradeline08",	"unitabilitytooltip", ebpid, 5, 1 )
	else
		bindlabeltocreatureability	( "textlabel_infoline08",	"unitabilitytooltip", ebpid, 5, 0 )
	end

	--display cost

	showhud("icon_gather")
	showhud("icon_renew")
	showhud("gather_backlabel")
	showhud("renew_backlabel")

	bindlabeltocreatureattribute( "costgather_tooltip", "unitcosttooltip", owner, ebpid, 0 )
	bindlabeltocreatureattribute( "costrenew_tooltip", "unitcosttooltip", owner, ebpid, 1 )
	bindlabeltoebpcostgather( "gather_label", ebpid)
	bindlabeltoebpcostrenew( "renew_label", ebpid)

end

--
--HERE
infocenterhenchman = function( id )

	local attributes = load_entity_attributes(Henchman_EC) or {}
	local ebpid = EntityEBP( id )
	local owner = EntityOwner( id )

	showhud("attribute_backlabel")
	showhud("attribute_backlabel1")

	-- bindlabeltohenchmanstate( "henchmenaction_icon", id )

	-- display dps

	bindicontocreatureattribute( "meleedamage_staticon_hench", "henchmanattributestooltip", ebpid, 1 )
	bindlabeltocreatureattribute( "meleedamage_number_hench", "henchmanattributestooltip", owner, ebpid, 1 )
	showhud("meleedamage_staticon_hench")
	-- bindlabeltotext( "meleedamage_number_hench", 40005 )
	bindlabeltotext("meleedamage_number_hench", numtotxtid(attributes.Melee0_damage or 0))

	-- tag reload

	if EntityHasTagReload( id ) == 1 then

		bindlabeltotext		    ( "textlabel_labtemp", 40780 )
		bindbartoentitytagreload( "progress_statbar03", id )

	end

	--display speed and sight (incl. upgrades)

	if (IsResearched( RESEARCH_HenchmanMotivationalSpeech ) == 1) then
		bindicontocreatureattribute( "hench_speed_upgrade", "henchmanattributestooltip", ebpid, 3 )
		bindlabeltocreatureattribute( "hench_land_upgrade", "henchmanattributestooltip", owner, ebpid, 3 )
		bindlabeltocreatureattribute( "hench_water_upgrade", "henchmanattributestooltip", owner, ebpid, 4 )
		showhud("hench_speed_upgrade")
		-- bindlabeltotext( "hench_land_upgrade", 40004 )
		-- bindlabeltotext( "hench_water_upgrade", 40012 )
		showhud("waterspeed_number_hench_divider")
		bindlabeltotext("hench_land_upgrade", numtotxtid((attributes.speed_max or 0) + (Henchman.motivatedLandSpeedBonus or 0)))
		bindlabeltotext("hench_water_upgrade", numtotxtid((attributes.waterspeed_max or 0) + (Henchman.motivatedWaterSpeedBonus or 0)))
		showhud("hench_land_upgrade_mark")
		showhud("hench_water_upgrade_mark")
	else
		bindicontocreatureattribute( "hench_speed_icon", "henchmanattributestooltip", ebpid, 3 )
		bindlabeltocreatureattribute( "landspeed_number_hench", "henchmanattributestooltip", owner, ebpid, 3 )
		bindlabeltocreatureattribute( "waterspeed_number_hench", "henchmanattributestooltip", owner, ebpid, 4 )
		showhud("hench_speed_icon")
		-- bindlabeltotext( "landspeed_number_hench", 40006)
		-- bindlabeltotext( "waterspeed_number_hench", 40011)
		showhud("waterspeed_number_hench_divider")
		bindlabeltotext("landspeed_number_hench", numtotxtid(attributes.speed_max or 0))
		bindlabeltotext("waterspeed_number_hench", numtotxtid(attributes.waterspeed_max or 0))

	end

	if (IsResearched( RESEARCH_HenchmanBinoculars ) == 1) then
		bindicontocreatureattribute( "hench_sight_upgrade", "henchmanattributestooltip", ebpid, 2 )
		bindlabeltocreatureattribute( "sight_upgrade_hench", "henchmanattributestooltip", owner, ebpid, 2 )
		showhud("hench_sight_upgrade")
		-- bindlabeltotext( "sight_upgrade_hench", 40010 )
		bindlabeltotext("sight_upgrade_hench", numtotxtid((attributes.sight_radius1 or 0) * (Henchman.binocularsSightModifier or 0)))
		showhud("sight_upgrade_hench_mark")
	else
		bindicontocreatureattribute( "sightradius_staticon_hench", "henchmanattributestooltip", ebpid, 2 )
		bindlabeltocreatureattribute( "sightradius_number_hench", "henchmanattributestooltip", owner, ebpid, 2 )
		showhud("sightradius_staticon_hench")
		-- bindlabeltotext( "sightradius_number_hench", 40007 )
		bindlabeltotext("sightradius_number_hench", numtotxtid(attributes.sight_radius1 or 0))

	end

	if (IsResearched( RESEARCH_HenchmanYoke ) == 1) then
		bindicontocreatureattribute( "gather_icon_upgrade", "henchmanattributestooltip", ebpid, 0 )
		bindlabeltocreatureattribute( "gather_upgrade", "henchmanattributestooltip", owner, ebpid, 0 )
		showhud("gather_icon_upgrade")
		-- bindlabeltotext( "gather_upgrade", 40249)
		bindlabeltotext("gather_upgrade", numtotxtid((attributes.carryamount or 0) * (Henchman.yokeBonus or 0)))
		showhud("gather_upgrade_mark")
	else
		bindicontocreatureattribute( "gather_staticon", "henchmanattributestooltip", ebpid, 0 )
		bindlabeltocreatureattribute( "gather_number", "henchmanattributestooltip", owner, ebpid, 0 )
		showhud("gather_staticon")
		-- bindlabeltotext( "gather_number", 40248)
		bindlabeltotext("gather_number", numtotxtid(attributes.carryamount or 0))

	end

end

--
infocentergyrocopter = function( id )

	local attributes = load_entity_attributes(Gyrocopter_EC) or {}
	local ebpid = EntityEBP( id )
	local owner = EntityOwner( id )

	-- bindlabeltohenchmanstate( "henchmenaction_icon", id )

	-- tag reload

	if EntityHasTagReload( id ) == 1 then

		bindlabeltotext		    ( "textlabel_labtemp", 40780 )
		bindbartoentitytagreload( "progress_statbar03", id )

	end

	--display stats (incl. upgrades)

	showhud("attribute_backlabel")
	showhud("attribute_backlabel1")

	if (IsResearched( RESEARCH_HenchmanBinoculars ) == 1) then
		bindicontocreatureattribute( "hench_sight_upgrade", "gyrotooltip", ebpid, 1 )
		bindlabeltocreatureattribute( "sight_upgrade_hench", "gyrotooltip", owner, ebpid, 1 )
		showhud("hench_sight_upgrade")
		-- bindlabeltotext( "sight_upgrade_hench", 40010 )
		bindlabeltotext("sight_upgrade_hench", numtotxtid((attributes.sight_radius1 or 0) * (Henchman.binocularsSightModifier or 0)))
		showhud("sight_upgrade_hench_mark")
	else
		bindicontocreatureattribute( "sightradius_staticon_hench", "gyrotooltip", ebpid, 1 )
		bindlabeltocreatureattribute( "sightradius_number_hench", "gyrotooltip", owner, ebpid, 1 )
		showhud("sightradius_staticon_hench")
		-- bindlabeltotext( "sightradius_number_hench", 40007 )
		bindlabeltotext("sightradius_number_hench", numtotxtid(attributes.sight_radius1 or 0))

	end

	if (IsResearched( RESEARCH_HenchmanYoke ) == 1) then
		bindicontocreatureattribute( "gather_icon_upgrade", "gyrotooltip", ebpid, 0 )
		bindlabeltocreatureattribute( "gather_upgrade", "gyrotooltip", owner, ebpid, 0 )
		showhud("gather_icon_upgrade")
		-- bindlabeltotext( "gather_upgrade", 40247)
		bindlabeltotext("gather_upgrade", numtotxtid((attributes.carryamount or 0) * (Henchman.yokeBonus or 0)))
		showhud("gather_upgrade_mark")
	else
		bindicontocreatureattribute( "gather_staticon", "gyrotooltip", ebpid, 0 )
		bindlabeltocreatureattribute( "gather_number", "gyrotooltip", owner, ebpid, 0 )
		showhud("gather_staticon")
		-- bindlabeltotext( "gather_number", 40246)
		bindlabeltotext("gather_number", numtotxtid(attributes.carryamount or 0))

	end

	bindicontocreatureattribute( "gyro_speed_staticon", "gyrotooltip", ebpid, 2 )
	bindlabeltocreatureattribute( "gyro_airspeed_number", "gyrotooltip", owner, ebpid, 2 )
	showhud("gyro_speed_staticon")
	-- bindlabeltotext( "gyro_airspeed_number", 40013)
	bindlabeltotext("gyro_airspeed_number", numtotxtid(attributes.airspeed_max or 0))

end


--
infocenterrex = function( id )

	local attributes = load_entity_attributes(Rex_EC) or {}
	local ebpid = EntityEBP( id )
	local owner = EntityOwner( id )

	showhud("attribute_backlabel")
	showhud("attribute_backlabel1")

	-- tag reload
	if EntityHasTagReload( id ) == 1 then

		bindlabeltotext		    ( "textlabel_labtemp", 40782 )
		bindbartoentitytagreload( "progress_statbar03", id )

	end

	local abilities = rex_abilities

	local labels =
	{
		"textlabel_infoline03",
		"textlabel_infoline04",
		"textlabel_infoline05",
		"textlabel_infoline06",
		"textlabel_infoline07",
		"textlabel_infoline08",
	}

	local count = getn( abilities )
	local labelIndex = 1

	for i = 1, count
	do
		if HasCharacterAbility( abilities[ i ][ 1 ] ) == 1 then

			bindlabeltorexability( labels[ labelIndex ], "rexabilitytooltip", abilities[ i ][ 1 ], abilities[ i ][ 2 ] )
			labelIndex = labelIndex + 1
		end
	end

	-- Neurotoxin

	bindicontocreatureattribute( "rex_neurotoxin", "rexattributestooltip", ebpid, 0 )
	bindlabeltocreatureattribute("neurotox_number", "rexattributestooltip", owner, ebpid, 0)
	showhud("rex_neurotoxin")
	-- bindlabeltotext("neurotox_number", 40244 )
	bindlabeltotext("neurotox_number", numtotxtid(attributes.dartDamage or 0))

	-- Sight radius

	bindicontocreatureattribute( "rex_sightradius", "rexattributestooltip", ebpid, 1 )
	bindlabeltocreatureattribute("sightradius_number_hench", "rexattributestooltip", owner, ebpid, 1)
	showhud("rex_sightradius")
	-- bindlabeltotext("sightradius_number_hench", 40245 )
	bindlabeltotext("sightradius_number_hench", numtotxtid(attributes.sight_radius1 or 0))

	-- Speed

	bindicontocreatureattribute( "hench_speed_icon", "rexattributestooltip", ebpid, 2 )
	bindlabeltocreatureattribute("landspeed_number_hench", "rexattributestooltip", owner, ebpid, 2)
	bindlabeltocreatureattribute("waterspeed_number_hench", "rexattributestooltip", owner, ebpid, 3)
	showhud("hench_speed_icon")
	-- bindlabeltotext("landspeed_number_hench", 40007 )
	-- bindlabeltotext("waterspeed_number_hench", 40243 )
	showhud("waterspeed_number_hench_divider")
	bindlabeltotext("landspeed_number_hench", numtotxtid(attributes.speed_max or 0))
	bindlabeltotext("waterspeed_number_hench", numtotxtid(attributes.waterspeed_max or 0))

end

--
infocentersoundbeamtower = function( id )

	infocentertower( id )

	-- sonic boom
	if SonicBoomIsOpen() == 1 then

		bindlabeltotext		    ( "textlabel_infoline_sidebar", 40784 )
		bindbartosonicboomrecharge( "progress_statbar01", id )

	end

end

--
infocenterantiairtower = function( id )

	infocentertower( id )

	-- air burst
	if AirBurstIsOpen() == 1 then

		bindlabeltotext		    ( "textlabel_infoline_sidebar", 40785 )
		bindbartoairburstrecharge( "progress_statbar01", id )

	end

end

--
infocentertower = function( id )

	bindlabeltotowerrange  ( "textlabel_infoline04", id )
	bindlabeltotowerdamage ( "textlabel_infoline05", id )

end

--
infocenterlab = function( id )

	--if EntityInResearch( id ) == 1 then
	--
	--	bindlabeltoinresearch		( "labresearch_infoline", id )
	--	bindbartoresearch			( "lab_statbar", id )
	--
	--end

	-- auto lab defense research
	if (IsResearched( RESEARCH_Rank3 ) == 1) and (ResearchIsOpen( RESEARCH_LabDefense ) == 1) then
		DoResearch(RESEARCH_LabDefense)
	end

	-- radar pulse
	if RadarPulseIsOpen() == 1 then

		bindlabeltotext		    ( "textlabel_infoline_sidebar", 40781 )
		bindbartoradarpulserecharge( "progress_statbar01", id )

	end

	-- lab defense
	if IsLabDefenseEnabled( id ) == 1 then

		bindlabeltotext	   ( "textlabel_labtemp", 40786 )
		bindbartolabdefense( "progress_statbar02", id )
		bindbartolabdefense( "singlselect_statbar0", id )

	end
end

--
infocenterlucy = function( id )

	local attributes = load_entity_attributes(Lucy_EC) or {}
	local ebpid = EntityEBP( id )
	local owner = EntityOwner( id )

	showhud("attribute_backlabel")
	showhud("attribute_backlabel1")

	-- tag reload
	if EntityHasTagReload( id ) then

		bindlabeltotext		( "textlabel_labtemp", 40783 )
		bindbartoentitytagreload( "progress_statbar03", id )

	end

	-- Gather

	if (IsResearched( RESEARCH_HenchmanYoke ) == 1) then
		bindicontocreatureattribute( "gather_icon_upgrade", "", ebpid, 0 )
		bindlabeltocreatureattribute( "gather_upgrade", "gathericontooltip", owner, ebpid, 0 )
		showhud("gather_icon_upgrade")
		-- bindlabeltotext( "gather_upgrade", 40240)
		showhud("gather_upgrade_mark")
		bindlabeltotext("gather_upgrade", numtotxtid((attributes.carryamount or 0) * (Henchman.yokeBonus or 0)))
	else
		bindicontocreatureattribute( "gather_staticon", "lucyattributestooltip", ebpid, 0 )
		bindlabeltocreatureattribute( "gather_number", "lucyattributestooltip", owner, ebpid, 0 )
		showhud("gather_staticon")
		-- bindlabeltotext( "gather_number", 40245)
		bindlabeltotext("gather_number", numtotxtid(attributes.carryamount or 0))
	end

	-- Sight radius

	bindicontocreatureattribute( "rex_sightradius", "lucyattributestooltip", ebpid, 1 )
	bindlabeltocreatureattribute("sightradius_number_hench", "lucyattributestooltip", owner, ebpid, 1)
	showhud("rex_sightradius")
	-- bindlabeltotext("sightradius_number_hench", 40245 )
	bindlabeltotext("sightradius_number_hench", numtotxtid(attributes.sight_radius1 or 0))

	-- Speed

	bindicontocreatureattribute( "hench_speed_icon", "lucyattributestooltip", ebpid, 2 )
	bindlabeltocreatureattribute("landspeed_number_hench", "lucyattributestooltip", owner, ebpid, 2)
	bindlabeltocreatureattribute("waterspeed_number_hench", "lucyattributestooltip", owner, ebpid, 3)
	showhud("lucy_speed_staticon")
	-- bindlabeltotext("landspeed_number_hench", 40242 )
	-- bindlabeltotext("waterspeed_number_hench", 40243 )
	showhud("waterspeed_number_hench_divider")
	bindlabeltotext("landspeed_number_hench", numtotxtid(attributes.speed_max or 0))
	bindlabeltotext("waterspeed_number_hench", numtotxtid(attributes.waterspeed_max or 0))

	-- Sabotage

	if HasCharacterAbility( lucy_abilities[1][1] ) == 1 then
		bindlabeltocreatureattribute("textlabel_infoline03", "lucyabilitytooltip", owner, ebpid, 0)
		bindlabeltotext("textlabel_infoline03", lucy_abilities[1][2])
	end

end


--
infocenterenemy = function()

	if Selection.count() == 1 then

		local id = Selection.preferred()

		local type = EntityType( id )

		if	type == Creature_EC or
			type == Animal_EC or
			type == Rex_EC or
			type == Lucy_EC or
			type == Gyrocopter_EC or
			type == Lab_EC or
			type == RemoteChamber_EC or
			type == WaterChamber_EC or
			type == Aviary_EC or
			type == ElectricGenerator_EC or
			type == ResourceRenew_EC or
			type == VetClinic_EC or
			type == Foundry_EC or
			type == AntiAirTower_EC or
			type == SoundBeamTower_EC or
			type == BrambleFence_EC or
			type == GenStruct_EC or
			type == GeneticAmplifier_EC or
			type == LandingPad_EC or
			type == Henchman_EC or
			type == Fire_EC
		then

			infocentersinglebasicstats( id )

			if type == Creature_EC then

				infocentercreature( id )

			end

		end

	end

end

--
infocenterfriendly = function()

	if Selection.count() == 1 then

		-- single
		infocentersingle( Selection.preferred() )

	else

		-- multi
		infocentermulti()

	end

end

--
infocenterworld = function()

	if Selection.count() == 1 then

		local id = Selection.preferred()

		local type = EntityType( id )

		--
		if type == ResourceGather_EC then

			-- basic stats
			bindlabeltoentityname( "singlselect_name_label", id, "singleselectinfotooltip", 5 )
			bindimagetoentityicon( "singlselect_icon",       id, "singleselectinfotooltip", 2 )

			bindlabeltotext		 ( "textlabel_infoline01", 40766 )
			bindlabeltoresource  ( "textlabel_infoline02", id )

		elseif type == Animal_EC then

			bindlabeltoentityname       ( "singlselect_name_label", id, "singleselectinfotooltip", 5 )
			bindimagetoentityicon       ( "singlselect_icon",       id, "singleselectinfotooltip", 2 )
			bindlabeltoanimalgatherstate( "textlabel_infoline02",   id )

		elseif type == 0 then

			bindlabeltoentityname( "singlselect_name_label", id, "singleselectinfotooltip", 5 )
			bindimagetoentityicon( "singlselect_icon",       id, "singleselectinfotooltip", 2 )

		elseif type == GenStruct_EC then

			bindlabeltoentityname       ( "singlselect_name_label", id, "singleselectinfotooltip", 5 )
			bindimagetoentityicon       ( "singlselect_icon",       id, "singleselectinfotooltip", 2 )

		elseif type == Geyser_EC then

            bindlabeltoentityname       ( "singlselect_name_label", id, "singleselectinfotooltip", 5 )
            bindimagetoentityicon       ( "singlselect_icon",       id, "singleselectinfotooltip", 2 )

            bindlabeltotext                ( "textlabel_infoline01", 40767 )

        elseif  type == Fire_EC or
            type == Villager_EC
        then

            --basic info only
            infocentersinglebasicstats( id )

        else

            if  type == Creature_EC or
                type == Henchman_EC or
                type == Gyrocopter_EC or
                type == Lab_EC or
                type == RemoteChamber_EC or
                type == WaterChamber_EC or
                type == Aviary_EC or
                type == ElectricGenerator_EC or
                type == ResourceRenew_EC or
                type == VetClinic_EC or
                type == Foundry_EC or
                type == AntiAirTower_EC or
                type == SoundBeamTower_EC or
                type == BrambleFence_EC or
                type == GeneticAmplifier_EC or
                type == Rex_EC or
                type == Lucy_EC or
                type == LandingPad_EC
            then

                -- display it as though it's friendly!
                infocenterfriendly()

            end

        end

    end -- count == 1

end

--
infocenter = function()
	local count = Selection.count()

	local infocenterutilities_function
	if Entities.is_player_dead(LocalPlayer()) == 0 and (CHEATS_OBSERVER_UI ~= 1 or count > 0) then
		if count == 0 or (count > 1 and is_structure_ec(EntityType(Selection.get(1))) == 1) then
			infocenterutilities_function = infocenterutilities
		end
	else
		if count == 0 then
			infocenterutilities_function = infocenterobserverutilities
		end
	end

	if infocenterutilities_function == nil then
		Timer.unregister("infocenterutilities")
	else
		Timer.call_register("infocenterutilities", infocenterutilities_function, nil, 25)
	end

	if count == 0 then

		-- display nothing

	else

		if LocalPlayer() == 0 then

			if count == 1 then

				-- single
				infocentersingleobserver( Selection.preferred() )

			end

		elseif SelectionBelongsToPlayer() == 1 then

			infocenterfriendly()

		elseif SelectionIsEnemy() == 1 then

			infocenterenemy()

		elseif SelectionIsAlly() == 1 then

			infocenterfriendly()

		else

			infocenterworld()

		end

	end

end

--
infocenterutilities = function(id)
	local row, col
	_infocenter_spawner = {}

	row = getn(infocentermultibuttonsrows)
	col = infocenterutilities_units(row, 1)
	-- col = infocenterutilities_structures(row, col)

	row = getn(infocentermultibuttonsrows) - (col > 1 and 1 or 0)
	col = infocenterutilities_research(row, 1)

	infocenterutilities_cells_done_table()
end

infocenterutilities_units = function(row, col)
	row = row or 1
	col = col or 1

	local buttons = infocentermultibuttonsrows[row]
	if buttons == nil then
		return col
	end

	local callbacks_cancelunit = {
		"_info_cancel_unit01",
		"_info_cancel_unit02",
		"_info_cancel_unit03",
		"_info_cancel_unit04",
		"_info_cancel_unit05",
		"_info_cancel_unit06",
		"_info_cancel_unit07",
		"_info_cancel_unit08",
		"_info_cancel_unit09",
		"_info_cancel_unit10",
		"_info_cancel_unit11",
		"_info_cancel_unit12",
	}

	local player_id = LocalPlayer()
	for _, type in {Lab_EC, RemoteChamber_EC, WaterChamber_EC, Aviary_EC} do
		for i = 1, Entities.count_ebpids(player_id, type) do
			local ebpid = Entities.get_ebpid(i, player_id, type)

			for j = 1, Entities.count(player_id, ebpid) do
				local button = buttons[col]
				if button == nil then
					return col
				end

				local id = Entities.get(j, player_id, ebpid)
				local context = Entities.context(id)
				if id ~= nil and context ~= nil then
					local bqlength = build_queue_length(id)

					if context.bqlength ~= nil and context.bqlength ~= bqlength then
						do_refresh_on_next_tick()
					end
					context.bqlength = bqlength

					if bqlength > 0 then
						local spawner_index = getn(_infocenter_spawner) + 1
						bindbuttontobuildqueue(button[1], "", callbacks_cancelunit[spawner_index] or "", "", id, 0, 1)
						bindbartobuildqueue(button[3], id)
						if bqlength > 1 then
							bindlabeltotext(button[5], numtotxtid(bqlength))
						end

						_infocenter_spawner[spawner_index] = id
						infocenterutilities_cells_done_col(row, col)
						col = col + 1
					end
				end
			end
		end
	end

	return col
end

infocenterutilities_research = function(row, col)
	row = row or 1
	col = col or 1

	local buttons = infocentermultibuttonsrows[row]
	if buttons == nil then
		return col
	end

	local player_id = LocalPlayer()
	for _, type in {Lab_EC, VetClinic_EC, GeneticAmplifier_EC, ElectricGenerator_EC} do
		for i = 1, Entities.count_ebpids(player_id, type) do
			local ebpid = Entities.get_ebpid(i, player_id, type)

			for j = 1, Entities.count(player_id, ebpid) do
				local button = buttons[col]
				if button == nil then
					return col
				end

				local id = Entities.get(j, player_id, ebpid)
				if entity_in_research(id) == 1 then
					bindbuttontoinresearch(buttons[col][1], "", "docancelresearch", "", id, 1)
					bindbartoresearch(buttons[col][3], id)
					infocenterutilities_cells_done_col(row, col)
					col = col + 1

				elseif entity_in_creature_upgrade(id) == 1 then
					bindbuttontoincreatureupgrade(buttons[col][1], "", "docancelcreatureupgrade", "", id, 1)
					bindbartocreatureupgrade(buttons[col][3], id)
					infocenterutilities_cells_done_col(row, col)
					col = col + 1

				elseif entity_in_extension(id) == 1 then
					bindbuttontoinaddon(buttons[col][1], "", "docanceladdon", "", id, 1)
					bindbartoaddon(buttons[col][3], id)
					infocenterutilities_cells_done_col(row, col)
					col = col + 1
				end
			end
		end
	end

	return col
end

infocenterutilities_structures = function(row, col)
	row = row or 1
	col = col or 1

	local buttons = infocentermultibuttonsrows[row]
	if buttons == nil then
		return 0
	end

	local types = {
		Lab_EC,
		RemoteChamber_EC,
		WaterChamber_EC,
		Aviary_EC,
		VetClinic_EC,
		GeneticAmplifier_EC,
		ElectricGenerator_EC,
		SoundBeamTower_EC,
		AntiAirTower_EC,
		Foundry_EC,
		LandingPad_EC,
		BrambleFence_EC,
		ResourceRenew_EC,
	}

	local player_id = LocalPlayer()
	for _, type in types do
		for i = 1, Entities.count_ebpids(player_id, type) do
			local ebpid = Entities.get_ebpid(i, player_id, type)

			for j = 1, Entities.count(player_id, ebpid) do
				local button = buttons[col]
				if button == nil then
					return col
				end

				local id = Entities.get(j, player_id, ebpid)
				if EntityInConstruction(id) == 1 then
					bindbuttontounloadpassenger(button[1], "", "focusonentity", "", id, 0)
					bindbartoconstruction(button[2], id)
					bindlabeltotext(button[4], TXT_None)
					bindlabeltotext(button[5], TXT_None)
					bindhudtotooltip(button[4], "observertooltip_structure", player_id, ebpid)
					bindhudtotooltip(button[5], "observertooltip_structure", player_id, ebpid)
					infocenterutilities_cells_done_col(row, col)
					col = col + 1
				end
			end
		end
	end

	return col
end

--
infocenterobserverutilities_set_temporary_function = function(func)
	infocenterobserverutilities_context.tmp_func = func
end

infocenterobserverutilities_turn_page = function(count, func_name)
	local pages = infocenterobserverutilities_pages
	local page = infocenterobserverutilities_context.page or 0

	if page ~= 0 then
		show_tooltip_timer(100, infocenterobserverutilities_tooltip)
	end

	if count == nil and func_name ~= nil then
		page = page ~= 0 and page or 1
		for i, item in pages do
			if item[1] == func_name then
				page = i
			end
		end

	elseif page == 0 or pages[page][1] == infocenterobserverutilities_context.func_name then
		page = page + (count or 1)
		page = (page < 1 and getn(pages)) or (page > getn(pages) and 1) or page
	end

	infocenterobserverutilities_context.tmp_func = nil
	infocenterobserverutilities_context.page = page
	infocenterobserverutilities_context.func_name = pages[page][1]
	infocenterobserverutilities_context.title = pages[page][2]
	infocenterobserverutilities_context.description = pages[page][3]

	do_refresh_on_next_tick()
end

_infocenterobserver_turn_page = function(count)
	infocenterobserverutilities_turn_page(count * (IsSelectSimilarPressed() == 1 and -1 or 1))
end

--
infocenterobserverutilities = function()
	if infocenterobserverutilities_context.tmp_func ~= nil then
		infocenterobserverutilities_context.tmp_func()
		return
	end

	if infocenterobserverutilities_context.func_name == nil then
		infocenterobserverutilities_turn_page()
	end
	dostring(infocenterobserverutilities_context.func_name .. "()")

	if getn(infocenterobserverutilities_pages) > 1 then
		bindbutton("infocenter_up", "", "_infocenterobserver_turn_page", "tooltip_previous_page", "", -1)
		bindbutton("infocenter_down", HK_Select_NextSubSelection, "_infocenterobserver_turn_page", "tooltip_next_page", "", 1)
	end
end

infocenterobserverutilities_production = function()
	_infocenter_spawner = {}

	for row = 1, Entities.count() do
		local player_id = Entities.get(row)

		bindbuttondisabled(infocentermulti72rowcolors[row][1], "", "", "infocenterobserverutilities_tooltip", ICN_Player_Color, 1)
		bindlabeltoplayercolour(infocentermulti72rowcolors[row][1], player_id)

		local col = 1
		col = _infocenterobserverutilities_production_units(player_id, row, col)
		col = _infocenterobserverutilities_production_research(player_id, row, col)
		col = _infocenterobserverutilities_production_structures(player_id, row, col)
	end

	infocenterutilities_cells_done_table()
end

_infocenterobserverutilities_production_units = function(player_id, row, col)
	row = row or 1
	col = col or 1

	local buttons = infocentermulti72buttonsrows[row]
	if buttons == nil then
		return col
	end

	local local_player = LocalPlayer()
	for _, type in {Lab_EC, RemoteChamber_EC, WaterChamber_EC, Aviary_EC} do
		for i = 1, Entities.count_ebpids(player_id, type) do
			local ebpid = Entities.get_ebpid(i, player_id, type)

			for j = 1, Entities.count(player_id, ebpid) do
				local button = buttons[col]
				if button == nil then
					return col
				end

				local id = Entities.get(j, player_id, ebpid)
				local context = Entities.context(id)
				if id ~= nil and context ~= nil then
					local bqlength = BuildQueueLength(id)

					if context.bqlength ~= nil and context.bqlength ~= bqlength then
						do_refresh_on_next_tick()
					end
					context.bqlength = bqlength

					if bqlength > 0 then
						local spawner_index = getn(_infocenter_spawner) + 1
						_infocenter_spawner[spawner_index] = id

						bindbutton(button[1], "", _fn_name_info_focus_spawner(spawner_index),
							"", type == Lab_EC and ICN_Henchmen_Shadow or ICN_Creature_Shadow, 0)
						bindbartobuildqueue(button[3], id)
						if bqlength > 1 then
							bindlabeltotext(button[4], numtotxtid(bqlength))
						end

						infocenterutilities_cells_done_col(row, col)
						col = col + 1
					end
				end
			end
		end
	end

	return col
end

_infocenterobserverutilities_production_research = function(player_id, row, col)
	row = row or 1
	col = col or 1

	local buttons = infocentermulti72buttonsrows[row]
	if buttons == nil then
		return 0
	end

	for _, type in {Lab_EC, VetClinic_EC, GeneticAmplifier_EC, ElectricGenerator_EC} do
		for i = 1, Entities.count_ebpids(player_id, type) do
			local ebpid = Entities.get_ebpid(i, player_id, type)

			local count = Entities.count(player_id, ebpid)
			for j = 1, count do
				local button = buttons[col]
				if button == nil then
					return col
				end

				local id = Entities.get(j, player_id, ebpid)
				if EntityInResearch(id) == 1 then
					bindbuttontoinresearch(button[1], "", "focusonentity", "", id, 1)
					bindbartoresearch(button[3], id)
					infocenterutilities_cells_done_col(row, col)
					col = col + 1

				elseif EntityInCreatureUpgrade(id) == 1 then
					bindbuttontoincreatureupgrade(button[1], "", "focusonentity", "", id, 1)
					bindbartocreatureupgrade(button[3], id)
					infocenterutilities_cells_done_col(row, col)
					col = col + 1

				elseif EntityInExtension(id) == 1 then
					bindbuttontoinaddon(button[1], "", "focusonentity", "", id, 1)
					bindbartoaddon(button[3], id)
					infocenterutilities_cells_done_col(row, col)
					col = col + 1
				end
			end
		end
	end

	return col
end

_infocenterobserverutilities_production_structures = function(player_id, row, col)
	row = row or 1
	col = col or 1

	local buttons = infocentermulti72buttonsrows[row]
	if buttons == nil then
		return 0
	end

	local types = {
		Lab_EC,
		RemoteChamber_EC,
		WaterChamber_EC,
		Aviary_EC,
		VetClinic_EC,
		GeneticAmplifier_EC,
		ElectricGenerator_EC,
		SoundBeamTower_EC,
		AntiAirTower_EC,
		Foundry_EC,
		LandingPad_EC,
		BrambleFence_EC,
		ResourceRenew_EC,
	}

	for _, type in types do
		for i = 1, Entities.count_ebpids(player_id, type) do
			local ebpid = Entities.get_ebpid(i, player_id, type)

			local count = Entities.count(player_id, ebpid)
			for j = 1, count do
				local button = buttons[col]
				if button == nil then
					return col
				end

				local id = Entities.get(j, player_id, ebpid)
				if EntityInConstruction(id) == 1 then
					bindbuttontounloadpassenger(button[1], "", "focusonentity", "", id, 0)
					bindbartoconstruction(button[2], id)
					bindlabeltotext(button[4], TXT_None)
					bindlabeltotext(button[5], TXT_None)
					bindhudtotooltip(button[4], "observertooltip_structure", player_id, ebpid)
					bindhudtotooltip(button[5], "observertooltip_structure", player_id, ebpid)
					infocenterutilities_cells_done_col(row, col)
					col = col + 1
				end
			end
		end
	end

	return col
end

infocenterobserverutilities_unitcount = function()
	for row = 1, Entities.count() do
		local buttons = infocentermulti72buttonsrows[row]
		if buttons == nil then
			break
		end

		local player_id = Entities.get(row)
		bindbuttondisabled(infocentermulti72rowcolors[row][2] or "", "", "", "infocenterobserverutilities_tooltip", ICN_Dead_Color, 0)
		bindlabeltoplayercolour(infocentermulti72rowcolors[row][2] or "", player_id)
		bindbuttondisabled(infocentermulti72rowcolors[row][3] or "", "", "", "infocenterobserverutilities_tooltip", ICN_Population_Color, 0)
		bindlabeltoplayercolour(infocentermulti72rowcolors[row][3] or "", player_id)


		local col = 1
		for _, type in {Henchman_EC, Creature_EC} do
			for j = 1, Entities.count_ebpids(player_id, type) do
				local button = buttons[col]
				if button == nil then
					break
				end

				local ebpid = Entities.get_ebpid(j, player_id, type)
				local id = Entities.get(1, player_id, ebpid)
				local icon = type == Henchman_EC and ICN_Henchmen_Shadow or ICN_Creature_Shadow
				if id == 0 then
					bindbuttondisabled(button[1], "", "", "", icon, 0)
				else
					BindButtonEnabled(button[1], "", "", "", icon, 0)
					-- bindimagetoentityicon(button[1], id, "", 0)
				end
				bindlabeltotext(button[4], numtotxtid(Entities.entities_alive(player_id, ebpid)))
				bindlabeltotext(button[5], numtotxtid(Entities.entities_dead(player_id, ebpid)))
				bindhudtotooltip(button[4], "observertooltip_creature", player_id, ebpid)
				bindhudtotooltip(button[5], "observertooltip_creature", player_id, ebpid)

				infocenterutilities_cells_done_col(row, col, id ~= 0 and 1 or 0)
				col = col + 1
			end
		end
	end

	infocenterutilities_cells_done_table()
end

infocenterobserverutilities_structurecount = function()
	local types = {
		RemoteChamber_EC,
		WaterChamber_EC,
		Aviary_EC,
		ResourceRenew_EC,
		ElectricGenerator_EC,
		Foundry_EC,
		GeneticAmplifier_EC,
		VetClinic_EC,
		SoundBeamTower_EC,
		AntiAirTower_EC,
		LandingPad_EC,
		BrambleFence_EC,
	}

	for row = 1, Entities.count() do
		local buttons = infocentermulti72buttonsrows[row]
		if buttons == nil then
			break
		end

		local player_id = Entities.get(row)
		bindbuttondisabled(infocentermulti72rowcolors[row][2] or "", "", "", "infocenterobserverutilities_tooltip", ICN_Dead_Color, 0)
		bindlabeltoplayercolour(infocentermulti72rowcolors[row][2] or "", player_id)
		bindbuttondisabled(infocentermulti72rowcolors[row][3] or "", "", "", "infocenterobserverutilities_tooltip", ICN_Population_Color, 0)
		bindlabeltoplayercolour(infocentermulti72rowcolors[row][3] or "", player_id)

		local col = 1
		for _, type in types do
			local button = buttons[col]
			if button == nil then
				break
			end

			local ebpid = BuildingEBPFromType(type)
			local id = Entities.get(1, player_id, ebpid)
			if id == 0 then
				bindbuttondisabled(button[1], "", "", "", ICN_Structure, 0)
			else
				bindbuttontounloadpassenger(button[1], "", "", "", id, 0)
			end
			bindlabeltotext(button[4], numtotxtid(Entities.count(player_id, ebpid)))
			bindlabeltotext(button[5], numtotxtid(Entities.entities_dead(player_id, ebpid)))
			bindhudtotooltip(button[4], "observertooltip_structure", player_id, ebpid)
			bindhudtotooltip(button[5], "observertooltip_structure", player_id, ebpid)

			infocenterutilities_cells_done_col(row, col, id ~= 0 and 1 or 0)
			col = col + 1
		end
	end

	infocenterutilities_cells_done_table()
end

infocenterobserverutilities_deaths = function()
	local gatherer_ebp = GathererEBP()
	for row = 1, Entities.count() do
		local buttons = infocentermulti72buttonsrows[row]
		if buttons == nil then
			break
		end

		local player_id = Entities.get(row)
		bindbuttondisabled(infocentermulti72rowcolors[row][2] or "", "", "", "infocenterobserverutilities_tooltip", ICN_Clock_Color, 0)
		bindlabeltoplayercolour(infocentermulti72rowcolors[row][2] or "", player_id)
		bindbuttondisabled(infocentermulti72rowcolors[row][3] or "", "", "", "infocenterobserverutilities_tooltip", ICN_Dead_Color, 0)
		bindlabeltoplayercolour(infocentermulti72rowcolors[row][3] or "", player_id)

		local col = 1
		local units = track_deaths_units[player_id]
		if units ~= nil then
			for i, list in {{[gatherer_ebp] = units.units[gatherer_ebp]}, units.units} do
				for ebpid, unit in list do
					local button = buttons[col]
					if button == nil then
						break
					end

					if unit ~= nil and (ebpid ~= gatherer_ebp or i == 1) then
						local id = Entities.get(1, player_id, ebpid)
						local icon = ebpid == gatherer_ebp and ICN_Henchmen_Shadow or ICN_Creature_Shadow
						if id == 0 then
							bindbuttondisabled(button[1], "", "", "", icon, 0)
						else
							BindButtonEnabled(button[1], "", "", "", icon, 0)
							-- bindimagetoentityicon(button[1], id, "", 0)
						end
						bindlabeltotext(button[4], numtotxtid(unit.dead))
						bindlabeltotext(button[5], TXT_None)
						bindhudtotooltip(button[4], "observertooltip_creature", player_id, ebpid)
						bindhudtotooltip(button[5], "observertooltip_creature", player_id, ebpid)

						infocenterutilities_cells_done_col(row, col, id ~= 0 and 1 or 0)
						col = col + 1
					end
				end
			end
		end
	end

	infocenterutilities_cells_done_table()
end

infocenterobserverutilities_resources = function()
	for row = 1, Entities.count() do
		local buttons = infocentermulti72buttonsrows[row]
		if buttons == nil then
			break
		end

		local player_id = Entities.get(row)
		bindbuttondisabled(infocentermulti72rowcolors[row][2] or "", "", "", "infocenterobserverutilities_tooltip", ICN_Scrap_Color, 0)
		bindlabeltoplayercolour(infocentermulti72rowcolors[row][2] or "", player_id)
		bindbuttondisabled(infocentermulti72rowcolors[row][3] or "", "", "", "infocenterobserverutilities_tooltip", ICN_Electricity_Color, 0)
		bindlabeltoplayercolour(infocentermulti72rowcolors[row][3] or "", player_id)

		local total_creature_cost_scrap = 0
		local total_creature_cost_renew = 0
		local alive_creature_cost_scrap = 0
		local alive_creature_cost_renew = 0
		player_set(player_id)
		for i = 0, player_armycount() - 1 do
			local cinfo = player_armycbp(i) -- Army_GetUnit(player_id, i)
			local cost_renew = ci_getattribute(cinfo, "costrenew")
			local cost_scrap = ci_getattribute(cinfo, "cost")

			local ebpid = Stats_CreaturesTypeAt(player_id, i)
			local creature_total = Stats_CreatureTotal(player_id, ebpid)
			local creature_alive = Stats_CreatureActive(player_id, ebpid)

			total_creature_cost_scrap = total_creature_cost_scrap + cost_scrap * creature_total
			total_creature_cost_renew = total_creature_cost_renew + cost_renew * creature_total
			alive_creature_cost_scrap = alive_creature_cost_scrap + cost_scrap * creature_alive
			alive_creature_cost_renew = alive_creature_cost_renew + cost_renew * creature_alive
		end

		local button
		local col = 0

		col = col + 1
		button = buttons[col]
		bindbuttondisabled(button[1], "", "", "", ICN_Resources_Shadow, 0)
		bindlabeltotext(button[5], numtotxtid(Stats.get_persec(player_id, "coal") * 60))
		bindlabeltotext(button[4], numtotxtid(Stats.get_persec(player_id, "electricity") * 60))
		bindhudtotooltip(button[5], "simpletooltip", 62064, 62065)
		bindhudtotooltip(button[4], "simpletooltip", 62064, 62065)
		infocenterutilities_cells_done_col(row, col)

		col = col + 1
		button = buttons[col]
		bindbuttondisabled(button[1], "", "", "", ICN_Resources_Shadow, 0)
		bindlabeltotext(button[5], numtotxtid(Stats.get_value(player_id, "coal")))
		bindlabeltotext(button[4], numtotxtid(Stats.get_value(player_id, "electricity")))
		bindhudtotooltip(button[5], "simpletooltip", 62066, 62067)
		bindhudtotooltip(button[4], "simpletooltip", 62066, 62067)
		infocenterutilities_cells_done_col(row, col)

		col = col + 1
		button = buttons[col]
		bindbuttondisabled(button[1], "", "", "", ICN_Creature_Shadow, 0)
		bindlabeltotext(button[5], numtotxtid(alive_creature_cost_scrap))
		bindlabeltotext(button[4], numtotxtid(alive_creature_cost_renew))
		bindhudtotooltip(button[5], "simpletooltip", 62068, 62069)
		bindhudtotooltip(button[4], "simpletooltip", 62068, 62069)
		infocenterutilities_cells_done_col(row, col)

		col = col + 1
		button = buttons[col]
		bindbuttondisabled(button[1], "", "", "", ICN_Creature_Shadow, 0)
		bindlabeltotext(button[5], numtotxtid(total_creature_cost_scrap))
		bindlabeltotext(button[4], numtotxtid(total_creature_cost_renew))
		bindhudtotooltip(button[5], "simpletooltip", 62070, 62071)
		bindhudtotooltip(button[4], "simpletooltip", 62070, 62071)
		infocenterutilities_cells_done_col(row, col)
	end

	infocenterutilities_cells_done_table()
end

-- WARNING: This function is fragile and must be called exactly once per column per row.
infocenterutilities_cells_done_col = function(row, col, value, fncmp)
	value = value or -1
	fncmp = fncmp or eq

	local cells = _infocenterutilities_cells
	local cell_id = (row + 1) * 1000 + col

	if cells.current_row ~= nil and cells.current_row ~= row then
		_infocenterutilities_cells_done_row(cells.current_row)
	end

	local old_value = cells[cell_id]
	if old_value ~= nil and not fncmp(value, old_value) then
		-- print("UPDATE infocenterutilities done col: " .. row .. " " .. col .. ", value: " .. tostring(old_value) .. " => " .. tostring(value)) --DEBUG
		do_refresh_on_next_tick()
	end

	cells.current_row = row
	cells["col_count" .. row] = (cells["col_count" .. row] or 0) + 1
	cells[cell_id] = value
	return old_value
end

-- WARNING: This function is fragile and must be called exactly once per table update.
infocenterutilities_cells_done_table = function()
	local cells = _infocenterutilities_cells

	if cells.current_row ~= nil then
		_infocenterutilities_cells_done_row(cells.current_row)
	end

	if cells.old_row_count ~= nil and cells.old_row_count > cells.row_count then
		-- print("UPDATE infocenterutilities done table: row count: " .. cells.old_row_count .. " => " .. cells.row_count) --DEBUG
		do_refresh_on_next_tick()
	end

	cells.old_row_count = cells.row_count
	cells.row_count = 0
end

-- WARNING: This function is fragile and must not be call manually.
_infocenterutilities_cells_done_row = function(row)
	local cells = _infocenterutilities_cells

	local old_col_count = cells["old_col_count" .. row]
	if old_col_count ~= nil and old_col_count > cells["col_count" .. row] then
		-- print("UPDATE infocenterutilities done row: " .. row .. ", col count: " .. old_col_count .. " => " .. cells["col_count" .. row]) --DEBUG
		do_refresh_on_next_tick()
	end

	cells.current_row = nil
	cells.row_count = (cells.row_count or 0) + 1
	cells["old_col_count" .. row] = cells["col_count" .. row]
	cells["col_count" .. row] = 0
end

_info_cancel_unit01 = function(unit_index) _info_cancel_unit(1, unit_index) end
_info_cancel_unit02 = function(unit_index) _info_cancel_unit(2, unit_index) end
_info_cancel_unit03 = function(unit_index) _info_cancel_unit(3, unit_index) end
_info_cancel_unit04 = function(unit_index) _info_cancel_unit(4, unit_index) end
_info_cancel_unit05 = function(unit_index) _info_cancel_unit(5, unit_index) end
_info_cancel_unit06 = function(unit_index) _info_cancel_unit(6, unit_index) end
_info_cancel_unit07 = function(unit_index) _info_cancel_unit(7, unit_index) end
_info_cancel_unit08 = function(unit_index) _info_cancel_unit(8, unit_index) end
_info_cancel_unit09 = function(unit_index) _info_cancel_unit(9, unit_index) end
_info_cancel_unit10 = function(unit_index) _info_cancel_unit(10, unit_index) end
_info_cancel_unit11 = function(unit_index) _info_cancel_unit(11, unit_index) end
_info_cancel_unit12 = function(unit_index) _info_cancel_unit(12, unit_index) end
_info_cancel_unit = function(spawner_index, unit_index)
	local id = save_single_selection()
	SelectEntity(_infocenter_spawner[spawner_index] or 0, 0)
	docancelbuildunit(unit_index or 0)
	restore_single_selection(id)
end

_fn_name_info_focus_spawner = function(spawner_index)
	return "_info_focus_spawner" .. (spawner_index < 10 and "0" or "") .. spawner_index
end
_info_focus_spawner01 = function(dummy) _info_focus_spawner(1, dummy) end
_info_focus_spawner02 = function(dummy) _info_focus_spawner(2, dummy) end
_info_focus_spawner03 = function(dummy) _info_focus_spawner(3, dummy) end
_info_focus_spawner04 = function(dummy) _info_focus_spawner(4, dummy) end
_info_focus_spawner05 = function(dummy) _info_focus_spawner(5, dummy) end
_info_focus_spawner06 = function(dummy) _info_focus_spawner(6, dummy) end
_info_focus_spawner07 = function(dummy) _info_focus_spawner(7, dummy) end
_info_focus_spawner08 = function(dummy) _info_focus_spawner(8, dummy) end
_info_focus_spawner09 = function(dummy) _info_focus_spawner(9, dummy) end
_info_focus_spawner10 = function(dummy) _info_focus_spawner(10, dummy) end
_info_focus_spawner11 = function(dummy) _info_focus_spawner(11, dummy) end
_info_focus_spawner12 = function(dummy) _info_focus_spawner(12, dummy) end
_info_focus_spawner13 = function(dummy) _info_focus_spawner(13, dummy) end
_info_focus_spawner14 = function(dummy) _info_focus_spawner(14, dummy) end
_info_focus_spawner15 = function(dummy) _info_focus_spawner(15, dummy) end
_info_focus_spawner16 = function(dummy) _info_focus_spawner(16, dummy) end
_info_focus_spawner17 = function(dummy) _info_focus_spawner(17, dummy) end
_info_focus_spawner18 = function(dummy) _info_focus_spawner(18, dummy) end
_info_focus_spawner19 = function(dummy) _info_focus_spawner(19, dummy) end
_info_focus_spawner20 = function(dummy) _info_focus_spawner(20, dummy) end
_info_focus_spawner21 = function(dummy) _info_focus_spawner(21, dummy) end
_info_focus_spawner22 = function(dummy) _info_focus_spawner(22, dummy) end
_info_focus_spawner23 = function(dummy) _info_focus_spawner(23, dummy) end
_info_focus_spawner24 = function(dummy) _info_focus_spawner(24, dummy) end
_info_focus_spawner25 = function(dummy) _info_focus_spawner(25, dummy) end
_info_focus_spawner26 = function(dummy) _info_focus_spawner(26, dummy) end
_info_focus_spawner27 = function(dummy) _info_focus_spawner(27, dummy) end
_info_focus_spawner28 = function(dummy) _info_focus_spawner(28, dummy) end
_info_focus_spawner29 = function(dummy) _info_focus_spawner(29, dummy) end
_info_focus_spawner30 = function(dummy) _info_focus_spawner(30, dummy) end
_info_focus_spawner31 = function(dummy) _info_focus_spawner(31, dummy) end
_info_focus_spawner32 = function(dummy) _info_focus_spawner(32, dummy) end
_info_focus_spawner33 = function(dummy) _info_focus_spawner(33, dummy) end
_info_focus_spawner34 = function(dummy) _info_focus_spawner(34, dummy) end
_info_focus_spawner35 = function(dummy) _info_focus_spawner(35, dummy) end
_info_focus_spawner36 = function(dummy) _info_focus_spawner(36, dummy) end
_info_focus_spawner37 = function(dummy) _info_focus_spawner(37, dummy) end
_info_focus_spawner38 = function(dummy) _info_focus_spawner(38, dummy) end
_info_focus_spawner39 = function(dummy) _info_focus_spawner(39, dummy) end
_info_focus_spawner40 = function(dummy) _info_focus_spawner(40, dummy) end
_info_focus_spawner41 = function(dummy) _info_focus_spawner(41, dummy) end
_info_focus_spawner42 = function(dummy) _info_focus_spawner(42, dummy) end
_info_focus_spawner43 = function(dummy) _info_focus_spawner(43, dummy) end
_info_focus_spawner44 = function(dummy) _info_focus_spawner(44, dummy) end
_info_focus_spawner45 = function(dummy) _info_focus_spawner(45, dummy) end
_info_focus_spawner46 = function(dummy) _info_focus_spawner(46, dummy) end
_info_focus_spawner47 = function(dummy) _info_focus_spawner(47, dummy) end
_info_focus_spawner48 = function(dummy) _info_focus_spawner(48, dummy) end
_info_focus_spawner49 = function(dummy) _info_focus_spawner(49, dummy) end
_info_focus_spawner50 = function(dummy) _info_focus_spawner(50, dummy) end
_info_focus_spawner51 = function(dummy) _info_focus_spawner(51, dummy) end
_info_focus_spawner52 = function(dummy) _info_focus_spawner(52, dummy) end
_info_focus_spawner53 = function(dummy) _info_focus_spawner(53, dummy) end
_info_focus_spawner54 = function(dummy) _info_focus_spawner(54, dummy) end
_info_focus_spawner55 = function(dummy) _info_focus_spawner(55, dummy) end
_info_focus_spawner56 = function(dummy) _info_focus_spawner(56, dummy) end
_info_focus_spawner57 = function(dummy) _info_focus_spawner(57, dummy) end
_info_focus_spawner58 = function(dummy) _info_focus_spawner(58, dummy) end
_info_focus_spawner59 = function(dummy) _info_focus_spawner(59, dummy) end
_info_focus_spawner60 = function(dummy) _info_focus_spawner(60, dummy) end
_info_focus_spawner61 = function(dummy) _info_focus_spawner(61, dummy) end
_info_focus_spawner62 = function(dummy) _info_focus_spawner(62, dummy) end
_info_focus_spawner63 = function(dummy) _info_focus_spawner(63, dummy) end
_info_focus_spawner64 = function(dummy) _info_focus_spawner(64, dummy) end
_info_focus_spawner65 = function(dummy) _info_focus_spawner(65, dummy) end
_info_focus_spawner66 = function(dummy) _info_focus_spawner(66, dummy) end
_info_focus_spawner67 = function(dummy) _info_focus_spawner(67, dummy) end
_info_focus_spawner68 = function(dummy) _info_focus_spawner(68, dummy) end
_info_focus_spawner69 = function(dummy) _info_focus_spawner(69, dummy) end
_info_focus_spawner70 = function(dummy) _info_focus_spawner(70, dummy) end
_info_focus_spawner71 = function(dummy) _info_focus_spawner(71, dummy) end
_info_focus_spawner72 = function(dummy) _info_focus_spawner(72, dummy) end
_info_focus_spawner = function(spawner_index, dummy)
	FocusOnEntity(_infocenter_spawner[spawner_index] or 0, 0, 1)
end

--
infocentersingle = function( id )

	-- basic stats
	infocentersinglebasicstats( id )

	-- owner
    if EntityBelongsToPlayer( id ) == 0 then

        -- owner
        bindlabeltoplayername  ( "textlabel_playerinfo1", EntityOwner( id ) )
        bindlabeltoplayercolour( "color_label",           EntityOwner( id ) )

        -- ally/enemy
        if not( LocalPlayer() == 0) then
            if SelectionIsEnemy() == 1 then
                bindlabeltotext( "textlabel_infoline02", 40971 )

            elseif SelectionIsAlly() == 1 then
                bindlabeltotext( "textlabel_infoline02", 40970 )

            end
        end

    end

	-- special states
	if EntityType( id ) == Creature_EC then

		infocentercreature( id )

	elseif (EntityType( id ) == Henchman_EC) and (SelectionBelongsToPlayer() == 1) then

		infocenterhenchman( id )

	elseif (EntityType( id ) == Gyrocopter_EC) and (SelectionBelongsToPlayer() == 1) then

		infocentergyrocopter( id )

	elseif EntityType( id ) == Rex_EC then

		infocenterrex( id )

	elseif EntityType( id ) == Lucy_EC then

		infocenterlucy( id )

	elseif EntityInResearch( id ) == 1 then

		infocenterresearch( id, 1 )

	elseif EntityInConstruction( id ) == 1 then

		infocenterconstruction( id, 1 )

	elseif EntityInExtension( id ) == 1 then

		infocenteraddon( id, 1 )

	elseif EntityInSpawning( id ) == 1 then

		infocenterbuildqueue( id, 1 )

	elseif EntityType( id ) == Lab_EC then

		infocenterlab( id )

	elseif EntityType( id ) == SoundBeamTower_EC then

		infocentersoundbeamtower( id )

	elseif EntityType( id ) == AntiAirTower_EC then

		infocenterantiairtower( id )

	elseif EntityInCreatureUpgrade( id ) == 1 then

		infocentercreatureupgrade( id, 1 )

	end

end

--
infocentersingleobserver = function( id )

	-- basic stats
	infocentersinglebasicstats( id )

	-- special states
	if EntityType( id ) == Creature_EC then

		infocentercreature( id )

	elseif EntityType( id ) == Henchman_EC then

		infocenterhenchman( id )

	elseif EntityType( id ) == Gyrocopter_EC then

		infocentergyrocopter( id )

	elseif EntityType( id ) == Rex_EC then

		infocenterrex( id )

	elseif EntityType( id ) == Lucy_EC then

		infocenterlucy( id )

	elseif EntityInResearch( id ) == 1 then

		infocenterresearch( id, 0 )

	elseif EntityInConstruction( id ) == 1 then

		infocenterconstruction( id, 0 )

	elseif EntityInExtension( id ) == 1 then

		infocenteraddon( id, 0 )

	elseif EntityInSpawning( id ) == 1 then

		infocenterbuildqueue( id, 0 )

	elseif EntityType( id ) == Lab_EC then

		infocenterlab( id )

	elseif EntityInCreatureUpgrade( id ) == 1 then

		infocentercreatureupgrade( id, 0 )

	else

	end

end

--
infocentermulti = function()
	local count = Selection.count()

	local multibuttons = (is_structure_ec(EntityType(Selection.get(1))) == 0
		and infocentermultibuttons or infocentermultibuttonsupper)

	if  count > getn(multibuttons) then
		count = getn(multibuttons)
	end

	for i = 0, count - 1 do
		local id = Selection.get(i + 1)

		-- NOTE: using bindbuttontounloadpassenger because it works for structures as well as units
		bindbuttontounloadpassenger(multibuttons[ i + 1 ][ 1 ], "", "selectentity", "", id, 0)
		bindbartoentityhealth(multibuttons[ i + 1 ][ 2 ], id, "", 0)

		if EntityHasEndurance(id) == 1 then
			bindbartoentityendurance(multibuttons[ i + 1 ][ 4 ], id, "", 0)
		-- elseif EntityHasTagReload(id) == 1 then
		-- 	bindbartoentitytagreload(multibuttons[ i + 1 ][ 3 ], id)
		elseif EntityInSpawning(id) == 1 then
			bindbartobuildqueue(multibuttons[ i + 1 ][ 3 ], id)
			local bqlength = BuildQueueLength(id)
			if bqlength > 1 then
				bindlabeltotext(multibuttons[ i + 1 ][ 5 ], numtotxtid(bqlength))
			end
		elseif entity_in_research(id) == 1 then
			bindbartoresearch(multibuttons[ i + 1 ][ 3 ], id)
		elseif entity_in_creature_upgrade(id) == 1 then
			bindbartocreatureupgrade(multibuttons[ i + 1 ][ 3 ], id)
		elseif entity_in_extension(id) == 1 then
			bindbartoaddon(multibuttons[ i + 1 ][ 3 ], id)
		elseif SonicBoomIsAllowed(id) == 1 then
			bindbartosonicboomrecharge(multibuttons[ i + 1 ][ 3 ], id)
		elseif AirBurstIsAllowed(id) == 1 then
			bindbartoairburstrecharge(multibuttons[ i + 1 ][ 3 ], id)
		end
	end
end

--
dummy = function( tmp )
end

--
selecthotkeygroup_callback = function( groupNb )
	SelectHotkeyGroup( groupNb )
end

selecthotkeygroup_tooltipcb = function( enabled, groupNb )
	on_show_tooltip()
	HelpTextTitle(39535)
	HelpTextTextWithoutRequirements(39536)
	HelpTextShortcut( hotkeygroups[groupNb+1] )

end

minimap_tooltipcb = function( enabled, index )
	on_show_tooltip()
	HelpTextTitle(39537)
	HelpTextTextWithoutRequirements(39538)
end

--
assignhotkeygroup_callback = function( groupNb )
if IsSelectSimilarPressed() == 1 then
		assignhotkeyaddgroup(groupNb)
		return
	end

	AssignHotkeyGroup( groupNb )
end

assignhotkeyaddgroup = function(groupNb)
	local id = SelectionId(0)
	if EntityType(id) == Creature_EC then
		local ids = {}

		-- Get all currently selected ids.
		ids[id] = 1
		for i = 1, SelectionCount() - 1 do
			ids[SelectionId(i)] = 1
		end

		-- Get all ids in tagret group.
		SelectHotkeyGroup(groupNb)
		for i = 0, SelectionCount() - 1 do
			ids[SelectionId(i)] = 1
		end

		-- Select all creatures in world and deselect unwanted ones.
		SelectAllCombatUnitsInWorld()
		local count = SelectionCount()
		for i = 1, count do
			local id = SelectionId(count - i)
			if ids[id] ~= 1 then
				DeSelectEntity(id, 0)
			end
		end

	end

	AssignHotkeyGroup(groupNb)
end

assignhotkeyremovegroup = function(groupNb)
	-- Get all currently selected ids.
	local ids = {}
	for i = 0, SelectionCount() - 1 do
		ids[SelectionId(i)] = 1
	end

	-- Select target group and deselect unwanted ones.
	SelectHotkeyGroup(groupNb)
	local count = SelectionCount()
	for i = 1, count do
		local id = SelectionId(count - i)
		if ids[id] == 1 then
			DeSelectEntity(id, 0)
		end
	end

	AssignHotkeyGroup(groupNb)
end

--
commandstooltip = function( enabled, index )

	tooltip_command( enabled, index, commands )

end

--
foundrytooltip = function( enabled, index )

	tooltip_command( enabled, index, foundry_commands )

end

--
sonicboomtooltip = function( enabled, ebpid )

	if enabled == 0 then
		HelpTextSonicBoomPrerequisite()
	end

	on_show_tooltip()
	HelpTextTitle( soundbeamcommand[1] )
	HelpTextSonicBoomCost(ebpid)
	HelpTextTextWithRequirements( soundbeamcommand[3] )
	HelpTextShortcut( soundbeamcommand[2] )

end

--
airbursttooltip = function( enabled, ebpid )

	if enabled == 0 then
		HelpTextAirBurstPrerequisite()
	end

	on_show_tooltip()
	HelpTextTitle( antiaircommand[1] )
	HelpTextAirBurstCost(ebpid)
	HelpTextTextWithRequirements( antiaircommand[3] )
	HelpTextShortcut( antiaircommand[2] )

end

--
tooltip_radarpulse = function( enabled, ebpid )

	if enabled == 0 then
		HelpTextRadarPulsePrerequisite()
	end

	on_show_tooltip()
	HelpTextTitle( radarpulsecommand[1] )
	HelpTextRadarPulseCost(ebpid)
	HelpTextTextWithRequirements( radarpulsecommand[3] )
	HelpTextShortcut( radarpulsecommand[2] )

end

--
radarpulsetooltip = function( enabled, ebpid )

	tooltip_radarpulse( enabled, ebpid )

end

--
dolabdefense_turnoff_tooltip = function( enabled, index, ebpid )

	-- do appopriate tool tip info

	on_show_tooltip()
	HelpTextTitle( labcommands[1][1] )
	HelpTextTextWithRequirements( labcommands[1][3] )
	HelpTextShortcut( labcommands[1][2] )

end

dolabdefense_turnon_tooltip = function( enabled, index, ebpid )

	-- do appopriate tool tip info

	on_show_tooltip()
	HelpTextTitle( labcommands[2][1] )

	if enabled == 0 then
		HelpTextLabDefensePrerequisite()
	end

	HelpTextLabDefenseCost( ebpid )
	HelpTextTextWithRequirements( labcommands[2][3] )
	HelpTextShortcut( labcommands[2][2] )

end

--
soundbeamtowerselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- background
	ShowBitmapLabel( "command_bigicon_back" )

	-- sonicboom on sound beam tower
	if SonicBoomIsAllowed( id ) == 1 then
		bindbuttontosonicboom( "command_alt_1", soundbeamcommand[2], "dosonicboom", "sonicboomtooltip", soundbeamcommand[4], id )
	end

	-- kill building button
	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )

end

--
antiairtowerselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- background
	ShowBitmapLabel( "command_bigicon_back" )

	-- airburst on anti air tower
	if AirBurstIsAllowed( id ) == 1 then
		bindbuttontoairburst( "command_alt_1", antiaircommand[2], "doairburst", "airbursttooltip", antiaircommand[4], id )
	end

	-- kill building button
	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )

end

--
labselection = function()

	if Cycle.count() == 0 then
		Cycle.init(selection_filtered_by_type(Lab_EC), _doresearch_cmp)
	end

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- rally
	bindbutton( "command_modal_icon01", commands[1][2], "dospawnmodal", "commandstooltip", commands[1][4], 1 )

	-- command area
		-- background
	ShowBitmapLabel( "command_bigicon_back" )

	-- henchman
	if EntityInResearch( id ) == 0 then
		bindbuttontounitebp( "command_buildhenchman", HK_Lab_CreateHenchman, "dobuildunit", "tooltip_henchmanbutton", id, GathererEBP() )
	end

	-- ungarrison Rex
	if EntityTypeGarrisoned( id, Rex_EC ) == 1 then

		bindbutton( "command_alt_6", commands[2][2], "doungarrison", "commandstooltip", commands[2][4], 2 )

	end

	-- ungarrison Lucy
	if EntityTypeGarrisoned( id, Lucy_EC ) == 1 then

		bindbutton( "command_alt_7", commands[3][2], "doungarrison", "commandstooltip", commands[3][4], 3 )

	end

		-- research
	if EntityInSpawning( id ) == 0 then

		commandarearesearch( id, labresearch, "tooltip_labresearch" )

	end

	-- radar pulse
	if RadarPulseIsAllowed( id ) == 1 then

		bindbuttontoradarpulse( "command_alt_8", radarpulsecommand[2], "doradarpulse", "radarpulsetooltip", radarpulsecommand[4], id )

	end

	-- lab defense
	if IsLabDefenseOn( id ) == 1 then
		-- Show turn off button (current state = on)
		bindbuttontolabdefense( "command_alt_9", labcommands[1][2], "dolabdefense", "dolabdefense_turnoff_tooltip", labcommands[1][4], 0, id )
	else
		-- Show turn on button (current state = off)
		bindbuttontolabdefense( "command_alt_9", labcommands[2][2], "dolabdefense", "dolabdefense_turnon_tooltip", labcommands[2][4], 1, id )
	end

	-- kill self
	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

end


--
tooltip_gyrocopterunit = function( enabled, ebpid )

	tooltip_ebp(enabled,ebpid)
	HelpTextShortcut(HK_LandingPad_CreateGyrocopter)
	HelpTextTextWithRequirements(42391)

	if HasBuildLimit(ebpid) and (enabled == 1 or IsAtBuildLimit(ebpid) == 1) then

		HelpTextBuildLimit( ebpid )

	end

end


landingpadselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- background
	ShowBitmapLabel( "command_bigicon_back" )

	-- gyrocopter
	bindbuttontounitebp( "command_alt_1", HK_LandingPad_CreateGyrocopter, "dobuildunit", "tooltip_gyrocopterunit", id, BuildingEBPFromType( Gyrocopter_EC ) )

	-- kill self
	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

end

--
tooltipbuilding = function( enabled, ebpid )

	tooltip_ebp(enabled,ebpid)

	-- find short cut key
	local type = TypeFromEBP(ebpid)

	local countstructures = getn( currentstructures )

	for i = 1, countstructures
	do
		if currentstructures[i][1] == type then

			HelpTextShortcut( currentstructures[i][2] )
			HelpTextTextWithRequirements( currentstructures[i][3] )

			if HasBuildLimit(ebpid) and (enabled == 1 or IsAtBuildLimit(ebpid) == 1) then

				HelpTextBuildLimit( ebpid )

			end

		end
	end

end

tooltipbuildingtoggle = function( enabled, ndx )

	tooltip_command( enabled, ndx+1, togglebuildmenucommands )

end

backbuttontooltipcb = function( enabled, ndx )

	tooltip_command( enabled, 1, backbuttoncommand )

end

singleselectinfotooltip = function( index )

	if index >= 1 and index <= getn( singleselectinfotable ) then

	on_show_tooltip()
	HelpTextTitle		( singleselectinfotable[ index ][1] )
	HelpTextTextWithoutRequirements( singleselectinfotable[index][2] )

	end


end



-- check to see if the given entity can build buildings
mcqualifier_buildbuilding = function( id )

	local type = EntityType( id )

	-- only Henchman and Lucy can build
	if type == Henchman_EC then
		return 1
	elseif type == Lucy_EC then
		return 1
	elseif type == Gyrocopter_EC then
		return 1
	end

	return 0

end

--
--advancedbuildingtoggle = function()
--
--	if currentstructures == structures then
--
--		-- switch to advanced structures
--		buildadvancedbuildingsmenu()
--
--	else
--
--		-- switch to basic structures
--		buildbasicbuildingsmenu()
--
--	end
--
--end

--
buildbasicbuildingsmenu  = function()

	-- post event to indicate that the build button was pressed
	BuildButtonPressed()

	-- register function for refresh calls
	menucontext = { "buildbasicbuildingsmenu()", "mcqualifier_buildbuilding", "" }

	currentstructures = structures

	--
	cleartaskbar()

	-- toggle to advanced building
	if ( IsHudEnabled( ENABLE_HenchmanAdvancedBuild ) == 0) then
		bindbuttontohenchmanadvancedbuild( "command_buildhenchman", HK_Henchman_BuildToggle, "buildadvancedbuildingsmenu", "tooltipbuildingtoggle", henchman_commands[7][4], 0 )
	end

	buildingsmenu()

end

--
buildadvancedbuildingsmenu  = function()

	-- register function for refresh calls
	menucontext = { "buildadvancedbuildingsmenu()", "mcqualifier_buildbuilding", "" }

	currentstructures = advancedstructures

	--
	cleartaskbar()

	-- toggle to basic building
	if ( IsHudEnabled( ENABLE_HenchmanBuild ) == 1) then
		bindbuttontohenchmanbuild( "command_buildhenchman", HK_Henchman_BuildToggle, "buildbasicbuildingsmenu", "tooltipbuildingtoggle", henchman_commands[6][4], 1 )
	end

	buildingsmenu()

end

--
buildingsmenu  = function()

	showhud("textlabel_basicbuild")
	showhud("textlabel_advbuild")

	local id = Selection.preferred()

	-- command area

		-- back
	bindbutton( "command_formation_icon01", HK_System_Escape, "menucontext_back", "backbuttontooltipcb", "UI/InGame/Back.tga", 0 )

		-- background
	ShowBitmapLabel( "command_bigicon_split" )

		-- buildings
	local bigbuttons =
	{
		"command_big_icon01",
		"command_big_icon02",
		"command_big_icon03",
		"command_big_icon04",
		"command_big_icon05",
		"command_big_icon06",
		"command_big_icon07",
		"command_big_icon08",
		"command_big_icon09",
		"command_big_icon10",
		"command_big_icon11",
		"command_big_icon12",
	}

	local countbuttons    = getn( bigbuttons )
	local countstructures = getn( currentstructures )

	local count

	if countbuttons < countstructures then

		count = countbuttons

	else

		count = countstructures

	end

	for i = 1, count
	do

		bindbuttontobuildingebp( bigbuttons[i], currentstructures[i][2], "dobuildbuilding", "tooltipbuilding", BuildingEBPFromType( currentstructures[i][1] ) )

	end

end
--
tooltip_ebp = function( enabled, ebpid )

	on_show_tooltip()

	if enabled == 1 then

		HelpTextEBPName(ebpid)
		HelpTextEBPCost(ebpid)

	else

		HelpTextEBPName(ebpid)
		HelpTextEBPCost(ebpid)
		HelpTextEBPPrerequisite(ebpid)

	end

end

tooltip_cost = function( enabled, ebpid )

	on_show_tooltip()
	HelpTextTitle( 39542 )
	HelpTextEBPCost(ebpid)

end

getarmyunit_index = function( ebpid )

	local id = Selection.preferred()

	local countarmy   = ArmyCount()
	local countbutton = getn( armybuttons )

	local idxarmy   = 0
	local idxbutton = 1

	while idxarmy <= countarmy - 1 and idxbutton <= countbutton
	do

		local unit = ArmyAt( idxarmy )

		if unit == ebpid then
			return idxbutton
		end

		-- if UnitCanBeBuiltHere( id, unit ) == 1 then

			idxbutton = idxbutton + 1
		-- end

		idxarmy = idxarmy + 1

	end

	return 1;

end

getarmyupgrade_index = function( ebpid )

	local id = Selection.preferred()

	local countarmy   = ArmyCount()
	local countbutton = getn( armybuttons )

	local idxarmy   = 0
	local idxbutton = 1

	while idxarmy <= countarmy - 1 and idxbutton <= countbutton
	do

		local unit = ArmyAt( idxarmy )

		if unit == ebpid then
			return idxbutton
		end

		idxbutton = idxbutton + 1
		idxarmy = idxarmy + 1

	end

	return 1;

end

tooltip_armyunit = function( enabled, ebpid )

	-- convert network id to index
	local ndx = getarmyunit_index(ebpid)

	on_show_tooltip()
	HelpTextCreature( ebpid, enabled, armyunit_hotkeys[ndx] );

end

tooltip_upgradearmyunit = function( enabled, ebpid )

	-- convert network id to index
	local ndx = getarmyupgrade_index(ebpid)

	on_show_tooltip()
	HelpTextCreatureToUpgrade( ebpid, armyunit_hotkeys[ndx] );

end

tooltip_upgrades = function( enabled, upgrade )

	-- validity check
	if ( creature_to_upgrade == -1 ) then
		return
	end

	local id = Selection.preferred()

	on_show_tooltip()

	if enabled == 1 then

		HelpTextCreatureUpgrade(id, creature_to_upgrade, upgrade)
		HelpTextShortcut( creatureupgrades[ upgrade + 1 ][ 2 ] )

	else

		HelpTextCreatureUpgrade(id, creature_to_upgrade, upgrade)
		HelpTextCreatureUpgradePrerequisite(upgrade)

	end

end

--
tooltip_henchmanbutton = function( enabled, ebpid )

	tooltip_ebp(enabled,ebpid)
	HelpTextShortcut(HK_Lab_CreateHenchman)
	HelpTextTextWithRequirements(42390)

end

--
henchmantooltip = function( enabled, index )

	tooltip_command( enabled, index, henchman_commands )

end

--
unloadtooltip = function( enabled )

	tooltip_command( enabled, 11, henchman_commands )

end

observertooltip_henchman = function(player_id, ebpid)
	do_refresh_on_hide_tooltip()
	on_show_tooltip()

	-- basic stats

	bindbuttondisabled("ttc_icon", "", "", "", ICN_Henchmen_Shadow, 0)
	bindlabeltoebpname("ttc_name_label", ebpid)

	-- cost icons
	showhud("ttc_hench_gathericon")
	showhud("ttc_hench_renewicon")

	-- cost labels
	bindlabeltoebpcostgather("ttc_hench_gatherlabel", ebpid)
	bindlabeltoebpcostrenew("ttc_hench_renewlabel", ebpid)
end

-- NOTE: Using custom tooltip because HelpTextCreature makes the game crash in replays.
observertooltip_creature = function(player_id, ebpid)
	if ebpid == GathererEBP() then
		observertooltip_henchman(player_id, ebpid)
		return
	end

	do_refresh_on_hide_tooltip()
	on_show_tooltip()

	-- if LocalPlayer() ~= 0 then
	-- 	HelpTextCreature(ebpid, 1, "")
	-- 	return
	-- end

	-- basic stats

	bindbuttondisabled("ttc_icon", "", "", "", ICN_Creature_Shadow, 0)
	bindlabeltoebpname("ttc_name_label", ebpid)

	-- rank
	bindicontocreatureattribute("ttc_rank_icon", "", ebpid, UATTR_Rank)

	-- attributes icons
	bindicontocreatureattribute("ttc_health_staticon", "", ebpid, UATTR_Health)
	bindicontocreatureattribute("ttc_armor_staticon", "", ebpid, UATTR_Armor)
	bindicontocreatureattribute("ttc_speed_staticon", "", ebpid, UATTR_Speed)
	bindicontocreatureattribute("ttc_sightradius_staticon", "", ebpid, UATTR_Sight)
	bindicontocreatureattribute("ttc_meleedamage_staticon", "", ebpid, UATTR_Melee)

	-- attribute labels

	-- health
	local suffix = CreatureHasUpgrade(player_id, ebpid, CREATUREUPGRADE_HitPoints) == 0 and "number" or "upgrade"
	bindlabeltocreatureattribute("ttc_health_" .. suffix, "", player_id, ebpid, UATTR_Health)

	-- defense / armour
	local suffix = CreatureHasUpgrade(player_id, ebpid, CREATUREUPGRADE_Defense) == 0 and "number" or "upgrade"
	bindlabeltocreatureattribute("ttc_armor_" .. suffix, "", player_id, ebpid, UATTR_Armor)

	-- sight radius
	local suffix = CreatureHasUpgrade(player_id, ebpid, CREATUREUPGRADE_SightRadius) == 0 and "number" or "upgrade"
	bindlabeltocreatureattribute("ttc_sightradius_" .. suffix, "", player_id, ebpid, UATTR_Sight)

	-- melee damage
	local suffix = CreatureHasUpgrade(player_id, ebpid, CREATUREUPGRADE_MeleeDamage) == 0 and "number" or "upgrade"
	bindlabeltocreatureattribute("ttc_meleedamage_" .. suffix, "", player_id, ebpid, UATTR_Melee)

	-- speed labels
	local suffix = CreatureHasUpgrade(player_id, ebpid, CREATUREUPGRADE_Speed) == 0 and "number" or "upgrade"
	bindlabelstocreaturespeed("ttc_speedtooltip", "ttc_speedtooltip", "ttc_speedtooltip", "ttc_speedtooltip",
		"ttc_landspeed_" .. suffix, "ttc_waterspeed_" .. suffix, "ttc_airspeed_" .. suffix, "ttc_purewaterspeed_" .. suffix,
		player_id, ebpid)

	-- range attacks
	local suffix = CreatureHasUpgrade(player_id, ebpid, CREATUREUPGRADE_RangedDamage) == 0 and "number" or "upgrade"
	local rangeAttackCount = GetRangeAttackCount(ebpid)
	if rangeAttackCount == 1 then
		bindlabeltocreaturerangeattack("ttc_range1damage_staticon", "ttc_range1damage_" .. suffix, "ttc_range1damage_pierce", "" , "", player_id, ebpid, 0)
	elseif rangeAttackCount == 2 then
		bindlabeltocreaturerangeattack("ttc_range1damage_staticon", "ttc_range1damage_" .. suffix, "ttc_range1damage_pierce", "" , "", player_id, ebpid, 1)
		bindlabeltocreaturerangeattack("ttc_range2damage_staticon", "ttc_range2damage_" .. suffix, "ttc_range2damage_pierce", "" , "", player_id, ebpid, 0)
	end

	-- abilities
	for i = 0, 5 do
		local upgraded = IsAbilityUpgraded(player_id, ebpid, i)
		local suffix = upgraded == 1 and "upgrade" or "info"
		bindlabeltocreatureability("ttc_textlabel_" .. suffix .. "line0" .. i, "", ebpid, i, upgraded)
	end

	-- cost icons
	showhud("ttc_gathericon")
	showhud("ttc_renewicon")

	-- cost labels
	bindlabeltoebpcostgather("ttc_gatherlabel", ebpid)
	bindlabeltoebpcostrenew("ttc_renewlabel", ebpid)
end

observertooltip_structure = function(player_id, ebpid)
	tooltip_ebp(1, ebpid)
	local type = TypeFromEBP(ebpid)
	for i = 1, getn(currentstructures) do
		if currentstructures[i][1] == type then
			HelpTextShortcut(currentstructures[i][2])
			HelpTextTextWithRequirements(currentstructures[i][3])
		end
	end
	HelpTextShortcut("")
end

infocenterobserverutilities_tooltip = function()
	on_show_tooltip()
	HelpTextTitle(infocenterobserverutilities_context.title)
	HelpTextTextWithoutRequirements(infocenterobserverutilities_context.description)
end

--
henchmanselection = function( id )

	-- command area
	bindbutton( "command_modal_icon01",		henchman_commands[ 1][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 1][4],  1 )		-- move
	bindbutton( "command_modal_icon02",		henchman_commands[ 2][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 2][4],  2 )		-- gather
	bindbutton( "command_modal_icon03",		henchman_commands[ 3][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 3][4],  3 )		-- guard
	bindbutton( "command_modal_icon04",		henchman_commands[ 4][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 4][4],  4 )		-- repair
	bindbutton( "command_modal_icon05",		henchman_commands[12][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[12][4], 12 )		-- attack
	bindbutton( "command_modal_icon07",		henchman_commands[ 5][2],  "dostop",			"henchmantooltip", henchman_commands[ 5][4],  5 )		-- stop

	if ( IsHudEnabled( ENABLE_HenchmanBuild ) == 1) then
		bindbuttontohenchmanbuild( "command_normal_icon01",	henchman_commands[ 6][2],  "buildbasicbuildingsmenu", "henchmantooltip", henchman_commands[ 6][4],  6 )		-- basic build
	end
	if ( IsHudEnabled( ENABLE_HenchmanAdvancedBuild ) == 0) then
		bindbuttontohenchmanadvancedbuild( "command_normal_icon02",	henchman_commands[ 7][2],  "buildadvancedbuildingsmenu", "henchmantooltip", henchman_commands[ 7][4],  7 )		-- advanced build
	end

	if (IsResearched( RESEARCH_HenchmanHeal ) == 1) then
		bindbutton( "command_formation_icon01",	henchman_commands[ 8][2],  "dohenchmanmodal", "henchmantooltip", henchman_commands[ 8][4],  8 )		-- heal
	end

	if (IsResearched( RESEARCH_HenchmanTag ) == 1) then
		bindbuttontotag( "command_formation_icon02",	henchman_commands[ 9][2],  "dohenchmanmodal", "henchmantooltip", henchman_commands[ 9][4],  id, 9 )		-- tag
		bindbuttontountag( "command_formation_icon03",	henchman_commands[14][2],  "dohenchmanmodal", "henchmantooltip", henchman_commands[14][4],  id, 14 )		-- untag
	end

	if ( IsHudEnabled( ENABLE_HenchmanKill ) == 1 ) then
		bindbutton( "command_formation_icon07", henchman_commands[10][2],  "dokillconfirm", "henchmantooltip", henchman_commands[10][4], 10 )		-- kill
	end

end

--
selectpassenger = function( id )

	-- Check to see if there's no active modal cursor
	if ( GetModalCommandMode() == 0 ) then

		DoPendingUnload( id, 1 );			-- clear pending list and add passenger in
		dohenchmanmodal( 11 )				-- do unload modal

		local gyro_id = GetVehicleId( id )

	else

		local result = DoPendingUnload( id, 0 );

		-- we have deselected last of the passengers, quit the modal UI
		if (result == 0) then
			-- stop ui
			dounloadmodalcancel()
		end

	end
end

--
selectallpassenger = function( gyro_id )

	local count = PassengerCount( gyro_id )

	-- Process in the first passenger
	local first_id = PassengerId( gyro_id, 0 )
	DoPendingUnload( first_id, 1 );			-- clear pending list and add passenger in

	-- Do the rest of the passengers
	for i = 1, count - 1
	do

		local id = PassengerId( gyro_id, i )
		DoPendingUnload( id, 0 );

	end

	dohenchmanmodal( 11 )		-- do unload modal mode
end

--
gyrocopterpassengermulti = function( gyro_id )

	local count = PassengerCount( gyro_id )

	if  count > getn( gyromultibuttons ) then

		count = getn( gyromultibuttons )

	end

	for i = 0, count - 1
	do

		local id = PassengerId( gyro_id, i )

		bindbuttontounloadpassenger( gyromultibuttons[ i + 1 ][ 1 ], "", "selectpassenger", "", id, gyro_id )
		bindbartoentityhealth( gyromultibuttons[ i + 1 ][ 2 ], id, "", 0 );

	end

end

--
gyrocopterselection = function( id )

	-- command area
	bindbutton( "command_modal_icon01",		henchman_commands[ 1][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 1][4],  1 )		-- move
	bindbutton( "command_modal_icon07",		henchman_commands[ 5][2],  "dostop",			"henchmantooltip", henchman_commands[ 5][4],  5 )		-- stop

	if ( CanBuild( id ) == 1 ) then
		bindbuttontohenchmanbuild( "command_normal_icon01",	henchman_commands[ 6][2],  "buildbasicbuildingsmenu",	"henchmantooltip", henchman_commands[ 6][4],  6 )		-- build
		--bindbutton( "command_normal_icon02",	henchman_commands[ 7][2],  "buildadvancedbuildingsmenu","henchmantooltip", henchman_commands[ 7][4],  7 )		-- build
	else
		bindbuttondisabled( "command_normal_icon01",	henchman_commands[ 6][2],  "buildbasicbuildingsmenu",	"henchmantooltip", henchman_commands[ 6][4],  6 )		-- build
		--bindbuttondisabled( "command_normal_icon02",	henchman_commands[ 7][2],  "buildadvancedbuildingsmenu","henchmantooltip", henchman_commands[ 7][4],  7 )		-- build
	end

	if (IsResearched( RESEARCH_HenchmanTag ) == 1) then
		bindbuttontotag( "command_formation_icon02",	henchman_commands[ 9][2],  "dohenchmanmodal", "henchmantooltip", henchman_commands[ 9][4],  id, 9 )		-- tag
		bindbuttontotag( "command_formation_icon03",	henchman_commands[14][2],  "dohenchmanmodal", "henchmantooltip", henchman_commands[14][4],  id, 14 )		-- untag
	end

	if ( CanUnload( id ) == 1 ) then
		bindbuttontounload( "command_formation_icon01",	henchman_commands[11][2],  "selectallpassenger", "unloadtooltip", henchman_commands[11][4], id, 11 )		-- unload

		if Selection.count() == 1 then
			gyrocopterpassengermulti( id )	-- passenger multiselection UI
		end

		-- Disable these buttons only if we currently do not carry any passengers
		bindbuttondisabled( "command_modal_icon02",		henchman_commands[ 2][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 2][4],  2 )		-- gather
		bindbuttondisabled( "command_modal_icon03",		henchman_commands[ 3][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 3][4],  3 )		-- guard
		bindbuttondisabled( "command_modal_icon04",		henchman_commands[ 4][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 4][4],  4 )		-- repair
	else
		if ( CanAirlift( id ) == 1 ) then
			bindbuttontoairlift( "command_formation_icon01",	henchman_commands[13][2],  "dohenchmanmodal", "henchmantooltip", henchman_commands[13][4], id, 13 )		-- airlift
		else
			bindbuttondisabled( "command_formation_icon01",	henchman_commands[13][2],  "dohenchmanmodal", "henchmantooltip", henchman_commands[13][4], 13 )			-- disable airlift
		end

		-- Enable these buttons only if we currently do not carry any passengers
		bindbutton( "command_modal_icon02",		henchman_commands[ 2][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 2][4],  2 )		-- gather
		bindbutton( "command_modal_icon03",		henchman_commands[ 3][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 3][4],  3 )		-- guard
		bindbutton( "command_modal_icon04",		henchman_commands[ 4][2],  "dohenchmanmodal",	"henchmantooltip", henchman_commands[ 4][4],  4 )		-- repair
	end

	if ( IsHudEnabled( ENABLE_HenchmanKill ) == 1 ) then
		bindbutton( "command_formation_icon07", henchman_commands[10][2],  "dokillconfirm", "henchmantooltip", henchman_commands[10][4], 10 )		-- kill
	end

end

--
rextooltip = function( enabled, index )

	tooltip_command( enabled, index, rex_commands )

end

--
rexselection = function( id )

	-- command area
	bindbutton( "command_modal_icon01",		rex_commands[ 1][2],  "dorexmodal",		"rextooltip", rex_commands[ 1][4],  1 )		-- move
	bindbutton( "command_modal_icon07",		rex_commands[ 3][2],  "dostop",			"rextooltip", rex_commands[ 3][4],  3 )		-- stop

	if ( CanBeLabGarrisoned( id ) == 1 ) then
		bindbutton( "command_normal_icon05", rex_commands[ 6][2],  "dogarrison",		"rextooltip", rex_commands[ 6][4],	6 )		-- garrison
	end

	if ( CanGatherDNA() == 1 ) then
		bindbuttontotag( "command_normal_icon06",	rex_commands[ 5][2],  "dorexmodal",		"rextooltip", rex_commands[ 5][4], id, 5 )		-- gather DNA
	end

end


--
lucytooltip = function( enabled, index )

	tooltip_command( enabled, index, lucy_commands )

end


--
lucyselection = function( id )

	-- command area
	bindbutton( "command_modal_icon01",		lucy_commands[ 1][2],  "dolucymodal",		"lucytooltip", lucy_commands[ 1][4],  1 )		-- move
	bindbutton( "command_modal_icon02",		lucy_commands[ 10][2], "dolucymodal",	 	"lucytooltip", lucy_commands[ 10][4],  10 )		-- gather
	bindbutton( "command_modal_icon03",		lucy_commands[ 2][2],  "dolucymodal",		"lucytooltip", lucy_commands[ 2][4],  2 )		-- guard
	bindbutton( "command_modal_icon04",		lucy_commands[ 4][2],  "dolucymodal",		"lucytooltip", lucy_commands[ 4][4],  4 )		-- repair
	bindbutton( "command_modal_icon07",		lucy_commands[ 3][2],  "dostop",			"lucytooltip", lucy_commands[ 3][4],  3 )		-- stop

	if ( CanBeLabGarrisoned( id ) == 1 ) then
		bindbutton( "command_normal_icon05", lucy_commands[ 7][2],  "dogarrison",		"lucytooltip", lucy_commands[ 7][4],  7 )		-- garrison
	end

	bindbutton( "command_formation_icon02",	lucy_commands[ 5][2],  "dolucymodal",		"lucytooltip", lucy_commands[ 5][4],  5 )		-- gather tech

	-- build
	bindbuttontohenchmanbuild( "command_normal_icon01",	lucy_commands[ 8][2],  "buildbasicbuildingsmenu",	"lucytooltip", lucy_commands[ 8][4],  8 )
	--bindbutton( "command_normal_icon02",	lucy_commands[ 9][2],  "buildadvancedbuildingsmenu", "lucytooltip", lucy_commands[ 9][4],  9 )		-- advanced build

	-- sabotage is a triggered ability and its corresponding button is handled elsewhere

end


--
commandqueuecancel = function()

	domodalcancel()

end

--
commandqueuecancelignore = function()

	-- Empty on purpose

end

--
mcqualifier_rex = function( id )

	local type = EntityType( id )
	if type == Rex_EC then
		return 1
	end

	return 0

end

--
dorexmodal = function( index )

	-- register function for refresh calls
	menucontext = { "dorexmodal(" .. index .. ")", "mcqualifier_rex", "ModalUIEnd()" }

	-- translate mode in game usable mode
	local mode		= rex_modalmodes[ index ][1];
	local command	= rex_modalmodes[ index ][2];

	-- let rex's modal commands be queued
	CommandQueueEnable( HK_System_CommandQueue, "commandqueuecancel" )

	--
	local result = ModalUIBegin( "domodalclick", "domodalcancel", mode, command )

	if result == 0 then

		--
		cleartaskbar()

		-- command area
			-- cancel button
		bindbutton( "command_formation_icon07", HK_System_Escape, "domodalcancel", "", "UI/InGame/Cancel.tga", 0 )

	else

		-- failed
		failedcommand( result )

	end

end

--
mcqualifier_lucy = function( id )

	local type = EntityType( id )
	if type == Lucy_EC then
		return 1
	end

	return 0

end

--
dolucymodal = function( index )

	-- register function for refresh calls
	menucontext = { "dolucymodal(" .. index .. ")", "mcqualifier_lucy", "ModalUIEnd()" }

	-- translate mode in game usable mode
	local mode		= lucy_modalmodes[ index ][1];
	local command	= lucy_modalmodes[ index ][2];

	-- let lucy's modal commands be queued
	CommandQueueEnable( HK_System_CommandQueue, "commandqueuecancel" )

	--
	local result = ModalUIBegin( "domodalclick", "domodalcancel", mode, command )

	if result == 0 then

		--
		cleartaskbar()

		-- command area
			-- cancel button
		bindbutton( "command_formation_icon07", HK_System_Escape, "domodalcancel", "", "UI/InGame/Cancel.tga", 0 )

	else

		-- failed
		failedcommand( result )

	end

end

--
mcqualifier_henchman = function( id )

	local type = EntityType( id )
	if 	(type == Henchman_EC) then
		return 1
	elseif (type == Gyrocopter_EC) then
		-- if (UpdatePendingUnloadGroup( id ) == 1) then
			return 1
		-- end
	end

	return 0

end

--
dohenchmanmodal = function( index )

	-- register function for refresh calls
	menucontext = { "dohenchmanmodal(" .. index .. ")", "mcqualifier_henchman", "ModalUIEnd()" }

	-- translate mode in game usable mode
	local mode		= henchman_modalmodes[ index ][1];
	local command	= henchman_modalmodes[ index ][2];

	-- let henchman modal commands be queued
	CommandQueueEnable( HK_System_CommandQueue, "commandqueuecancel" )

	-- inplace commands
	local result = 0

	if (command == MC_Unload) then

		result = ModalUIBegin( "domodalclick", "dounloadmodalcancel", mode, command )
	else

		result = ModalUIBegin( "domodalclick", "domodalcancel", mode, command )
	end

	if result == 0 then

		--
		cleartaskbar()

		-- command area

		-- inplace commands
		if (command == MC_Unload) then

			-- Need to refresh passenger icons on the left-hand-side hud
			-- Get selection id's (there should only be one entity selected)
			local count = Selection.count()
			local id = Selection.preferred()

			-- Make sure it is a gyrocopter and only one selection
			local type = EntityType( id )
			if (type == Gyrocopter_EC) and (count == 1) then
				gyrocopterpassengermulti( id );
			end

			local t = henchman_commands[ index ];
			bindbutton( "command_normal_icon03", t[2], "dohenchmanunloadnow", "henchmantooltip", t[4], index )

			-- cancel button
			bindbutton( "command_formation_icon07", HK_System_Escape, "dounloadmodalcancel", "", "UI/InGame/Cancel.tga", 0 )

		else
			-- cancel button
			bindbutton( "command_formation_icon07", HK_System_Escape, "domodalcancel", "", "UI/InGame/Cancel.tga", 0 )
		end

	else

		-- failed
		failedcommand( result )

	end

end

-- check to see if an entity can self-destruct
mcqualifier_killconfirm = function( id )

	local type = EntityType( id )

	-- Rex and Lucy cannot self destruct
	if type == Rex_EC then
		return 0
	elseif type == Lucy_EC then
		return 0
	end

	return 1

end

--
dokillconfirm = function( index )

	-- register function for refresh calls
	menucontext = { "dokillconfirm( " .. index .. " )", "mcqualifier_killconfirm", "" }

	--
	cleartaskbar()

	showhud( "textlabel_kill_unit" )

	-- command area
	bindbutton( "command_formation_icon06", HK_Generic_Kill,   "dodestroy",     "", "UI/InGame/accept.tga", 0 )
	bindbutton( "command_formation_icon07", HK_System_Escape, "domodalcancel", "", "UI/InGame/Cancel.tga", 0 )

end

--
dostop = function( dummy )

	DoCommandStop()

end

--
dostance = function( stanceindx )

	DoCommandStance( stance_commands[ stanceindx ][ 5 ] )

end

--
dodestroy = function( dummy )

	DoDestroy()

end

--
dogarrison = function( dummy )

	DoGarrison()

end

--
mcqualifier_special = function( id )

	-- validate the command context
	if ( special_modal_type == -1 ) then
		return 0
	end

	-- check to see if entity has the given ability
	if SelectionHasSpecialCommand( ability_commands[ special_modal_type ][ 5 ] ) == 1 then
		return 1
	end

	return 0

end

--
dospecial = function( type )

	-- clear the special selection index
	special_modal_index = -1
	special_modal_type  = -1

	if ability_commands[type][6] == 0 then

		CommandQueueEnable( HK_System_CommandQueue, "commandqueuecancel" )

		-- are we in command queue mode?
		local queue = ModalCommandQueueRequest()

		local result = DoCommandSpecial( ability_commands[ type ][ 5 ], queue )

		if result == 0 then

		else

			failedcommand( result )

		end

	else

		-- register function for refresh calls
		menucontext = { "dospecial(" .. type .. ")", "mcqualifier_special", "ModalUIEnd()" }

		-- remember the special command index
		special_modal_type = type

		-- translate mode in game usable mode
		local mode		= creature_abilitymodalmodes[ type ][1];
		local command	= creature_abilitymodalmodes[ type ][2];

		CommandQueueEnable( HK_System_CommandQueue, "commandqueuecancelignore" )

		--
		local result = ModalUIBegin( "dospecialmodalclick", "dospecialmodalcancel", mode, command )

		if result == 0 then

			--
			-- cleartaskbar()

			-- command area
				-- cancel button
			bindbutton( "command_formation_icon07", HK_System_Escape, "dospecialmodalcancel", "", "UI/InGame/Cancel.tga", 0 )

		else

			-- failed
			failedcommand( result )

		end

	end

end

--
mcqualifier_specialmodal = function( id )

	-- validate the command context
	if ( special_modal_index == -1 ) then
		return 0
	end

	local index	= special_modal_index
	local command = creature_specialmodalmodes[ index ][2]

	-- check to see if the entity has the triggered ability
	local t = modal_special_commands[ index ]
	if SelectionHasTriggeredAbility( t[ 5 ] ) == 1 then
		return 1
	end

	return 0

end

--
dospecialmodal = function( index )

	-- clear the special selection index
	special_modal_index = -1
	special_modal_type  = -1

	-- register function for refresh calls
	menucontext = { "dospecialmodal(" .. index .. ")", "mcqualifier_specialmodal", "ModalUIEnd()" }

	-- remember the special command index
	special_modal_index = index

	-- translate mode in game usable mode
	local mode	= creature_specialmodalmodes[ index ][1];
	local command	= creature_specialmodalmodes[ index ][2];

	CommandQueueEnable( HK_System_CommandQueue, "commandqueuecancelignore" )

	--
	local result = ModalUIBegin( "dospecialmodalclick", "dospecialmodalcancel", mode, command )

	if result == 0 then

		--
		cleartaskbar()

		local t = modal_special_commands[ index ]

		-- command area

			-- inplace attack

		-- no inplace attack for plague, assassinate & sabotage
		local inplace = 1

		if 	command ~= MC_Plague and command ~= MC_Sabotage and command ~= MC_Assassinate and command ~= MC_Infestation
		then
			bindbutton( "command_formation_icon01", t[2], "dospecialmodalnow", "modalspecialstooltip", t[4], index )
		end

		-- cancel button
		bindbutton( "command_formation_icon07", HK_System_Escape, "dospecialmodalcancel", "", "UI/InGame/Cancel.tga", 0 )

	else

		-- failed
		failedcommand( result )

	end

end

--
specialstooltip = function( enabled, index )

	tooltip_command( enabled, index, ability_commands )

end

--
modalspecialstooltip = function( enabled, index )

	tooltip_command( enabled, index, modal_special_commands )

end

--
specialselection = function( )

	-- clear the special selection index
	-- special_modal_index = -1
	-- special_modal_type  = -1

	local buttons =
	{
		"command_formation_icon01",
		"command_formation_icon02",
		"command_formation_icon03",
		"command_formation_icon04",
		"command_formation_icon05",
		"command_formation_icon06",
	}

	local countSpecial = getn( ability_commands )
	local countButton  = getn( buttons )

	local idxSpecial = 1
	local idxButton  = 1

	while idxSpecial <= countSpecial and idxButton <= countButton
	do

		if SelectionHasSpecialCommand( ability_commands[ idxSpecial ][ 5 ] ) == 1 then

			bindbuttontotriggeredability( buttons[ idxButton ], ability_commands[ idxSpecial ][2],  "dospecial",	"specialstooltip", ability_commands[ idxSpecial ][4], ability_commands[ idxSpecial ][ 5 ], idxSpecial )

			idxButton = idxButton  + 1

		end

		idxSpecial = idxSpecial + 1

	end


	-- Modal Special commands
	local countModalSpecial = getn( modal_special_commands )

	local idxModalSpecial = 1

	while idxModalSpecial <= countModalSpecial and idxButton <= countButton
	do

		local t = modal_special_commands[ idxModalSpecial ]

		if SelectionHasTriggeredAbility( t[ 5 ] ) == 1 then

			bindbuttontotriggeredatk( buttons[ idxButton ], t[2],  "dospecialmodal", "modalspecialstooltip", t[4], t[5], idxModalSpecial )

			idxButton = idxButton  + 1

		end

		idxModalSpecial = idxModalSpecial + 1

	end

end

--
creaturetooltip = function( enabled, index )

	tooltip_command( enabled, index, creature_commands )

end

--
stancetooltip = function ( enabled, index )

	tooltip_command( enabled, index, stance_commands )

end

--
creaturemodalselection = function( id )

	if (EntityIsDigging( id ) == 0) then

		-- command area
		bindbutton( "command_modal_icon01",		creature_commands[1][2],	"docreaturemodal",	"creaturetooltip", creature_commands[1][4], 1 )		-- move
		bindbutton( "command_modal_icon02",		creature_commands[3][2],	"docreaturemodal",	"creaturetooltip", creature_commands[3][4], 3 )		-- patrol
		bindbutton( "command_modal_icon03",		creature_commands[2][2],	"docreaturemodal",	"creaturetooltip", creature_commands[2][4], 2 )		-- guard
		bindbutton( "command_modal_icon05",		creature_commands[7][2],	"docreaturemodal",	"creaturetooltip", creature_commands[7][4], 7 )		-- attack

			-- attack ground
		if SelectionHasAttackGround( ) == 1 then

			bindbuttontoattackground( "command_modal_icon06",	creature_commands[5][2],	"docreaturemodal",	"creaturetooltip", creature_commands[5][4],  5 )		-- range attack

		end

	end

	-- code common to dug and undug goes here

	bindbutton( "command_modal_icon07",		creature_commands[4][2],	"dostop",			"creaturetooltip", creature_commands[4][4],  4 )		-- stop

	bindbutton( "command_formation_icon07",	creature_commands[6][2],	"dokillconfirm",	"creaturetooltip", creature_commands[6][4],  6 )

end

--
creaturestanceselection = function( id )

	if (EntityIsDigging( id ) == 0) then

		bindbuttontocreaturestance( "command_normal_icon01",	stance_commands[1][2],		"dostance",			"stancetooltip", stance_commands[1][4],  1, stance_commands[1][5] )
		bindbuttontocreaturestance( "command_normal_icon02",	stance_commands[2][2],		"dostance",			"stancetooltip", stance_commands[2][4],  2, stance_commands[2][5] )
		bindbuttontocreaturestance( "command_normal_icon03",	stance_commands[3][2],		"dostance",			"stancetooltip", stance_commands[3][4],  3, stance_commands[3][5] )
		bindbuttontocreaturestance( "command_normal_icon04",	stance_commands[4][2],		"dostance",			"stancetooltip", stance_commands[4][4],  4, stance_commands[4][5] )

	end

end

--
inresearchselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- should remain empty

	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill
end

--
inlabresearchselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- background
	ShowBitmapLabel( "command_bigicon_back" )

	-- ungarrison Rex
	if EntityTypeGarrisoned( id, Rex_EC ) == 1 then

		bindbutton( "command_alt_6", commands[2][2], "doungarrison", "commandstooltip", commands[2][4], 2 )

	end

	-- ungarrison Lucy
	if EntityTypeGarrisoned( id, Lucy_EC ) == 1 then

		bindbutton( "command_alt_7", commands[3][2], "doungarrison", "commandstooltip", commands[3][4], 3 )

	end

end

--
inconstructionselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- should remain empty

	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill
end

--
inextensionselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- should remain empty

	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

end

--
increatureupgradeselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- should remain empty

	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill
end

--
chamberselection = function()

	local id = Selection.preferred()

	--
	showhud("command_bigicon_back")
	buildunitsmenu()

	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

end

--
vetclinicselection = function()

	if Cycle.count() == 0 then
		Cycle.init(selection_filtered_by_type(VetClinic_EC), _doresearch_cmp)
	end

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- background
	ShowBitmapLabel( "command_bigicon_split" )

	commandarearesearch( id, vetresearch, "tooltip_vetresearch" )

	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

end

--
foundryselection = function()

	-- if Cycle.count() == 0 then
	-- 	Cycle.init(selection_filtered_by_type(Foundry_EC), _doresearch_cmp)
	-- end

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- background
	ShowBitmapLabel( "command_bigicon_back" )

	commandarearesearch( id, foundaryresearch, "tooltip_foundaryresearch" )

	bindbutton( "command_formation_icon01", commands[4][2], "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

	-- rally
	bindbutton( "command_modal_icon01", commands[1][2], "dospawnmodal", "commandstooltip", commands[1][4], 1 )

	-- resource conversion
	bindbuttontoresourceconversion( "command_alt_1", foundry_commands[1][2], "doresourceconversion", "foundrytooltip", foundry_commands[1][4], foundry_commands[1][5] )
	bindbuttontoresourceconversion( "command_alt_2", foundry_commands[2][2], "doresourceconversion", "foundrytooltip", foundry_commands[2][4], foundry_commands[2][5] )
	bindbuttontoresourceconversion( "command_alt_3", foundry_commands[3][2], "doresourceconversion", "foundrytooltip", foundry_commands[3][4], foundry_commands[3][5] )
	bindbuttontoresourceconversion( "command_alt_4", foundry_commands[4][2], "doresourceconversion", "foundrytooltip", foundry_commands[4][4], foundry_commands[4][5] )

	bindbuttontounitebp( "command_buildhenchman", HK_Lab_CreateHenchman, "dobuildunit", "tooltip_henchmanbutton", id, GathererEBP() )

end

--
generatorselection = function()

	if Cycle.count() == 0 then
		Cycle.init(selection_filtered_by_type(ElectricGenerator_EC), _doaddon_cmp)
	end

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- background
	ShowBitmapLabel( "command_bigicon_back" )

	-- uncomment this to give addons to the generator
	commandareaaddon( id, generatoraddons, "tooltip_generatoraddon" )

	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

end

--

resourcerenewselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- background
	ShowBitmapLabel( "command_bigicon_back" )

	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

end

--
geneticampselection = function()

	if Cycle.count() == 0 then
		Cycle.init(selection_filtered_by_type(GeneticAmplifier_EC), _docreatureupgrade_cmp)
	end

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- clear the creature to upgrade selection
	creature_to_upgrade = -1

	-- command area

		-- background
	ShowBitmapLabel( "command_bigicon_back" )


	local countarmy   = ArmyCount()
	local countbutton = getn( armybuttons )

	local idxarmy   = 0
	local idxbutton = 1

	while idxarmy <= countarmy - 1 and idxbutton <= countbutton
	do

		local unit = ArmyAt( idxarmy )

		bindbuttontoupgradeebp( armyupgradebuttons[ idxbutton ][1], armyupgradebuttons[ idxbutton ][2], armyupgradebuttons[ idxbutton ][3], armyunit_hotkeys[ idxbutton ], "upgradeunitsmenu", "tooltip_upgradearmyunit", id, unit )

		idxbutton = idxbutton + 1
		idxarmy = idxarmy + 1

	end

	--
	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

end

--
buildingselection = function( id, type )

	-- display building's rally point, if any
	RallyPointShow( id )

	if EntityInConstruction( id ) == 1 then

		-- in construction
		inconstructionselection()

		-- elseif EntityInResearch( id ) == 1 then

		-- 	-- researching
		-- 	if type == Lab_EC then

		-- 		inlabresearchselection()

		-- 	else

		-- 		inresearchselection()

		-- 	end

		-- elseif EntityInExtension( id ) == 1 then

		-- 	-- add-ons
		-- 	inextensionselection()

		-- elseif EntityInCreatureUpgrade( id ) == 1 then

		-- 	-- doing creature upgrade
		-- 	increatureupgradeselection()

	else

		if type == Lab_EC then

			labselection()

		elseif type == ElectricGenerator_EC then

			generatorselection()

		elseif type == ResourceRenew_EC then

			resourcerenewselection()

		elseif type == VetClinic_EC then

			vetclinicselection()

		elseif type == RemoteChamber_EC or type == WaterChamber_EC or type == Aviary_EC then

			chamberselection()

		elseif type == Foundry_EC then

			foundryselection()

		elseif type == LandingPad_EC then

			landingpadselection()

		elseif type == GeneticAmplifier_EC then

			geneticampselection()

		elseif type == SoundBeamTower_EC then

			soundbeamtowerselection()

		elseif type == AntiAirTower_EC then

			antiairtowerselection()

		else

			miscbuildingselection()

		end

	end

end

--
miscbuildingselection = function()

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- command area
		-- should remain empty

	bindbutton( "command_formation_icon01", commands[4][2],  "dokillconfirm", "commandstooltip", commands[4][4], 4 )		-- kill

end

--
selectentity = function( id )

	-- check to see if the select similar entity button is pressed
	-- currently this button is 'Shift'
	local actOnSimilar = IsSelectSimilarPressed()

	-- check to see if the select single entity button is being pressed
	-- currently this button is 'Ctrl'
	if (IsSelectSinglePressed() == 1) then
		DeSelectEntity( id, actOnSimilar )
	else
		SelectEntity( id, actOnSimilar )
	end


end

--
focusonentity = function(id)
	FocusOnEntity(id, 0, 1)
end

--
friendlyselection = function()

	--
	cleartaskbar()

	-- just need one id for each type
	creatureId		= -1
	rexId			= -1
	lucyId			= -1
	henchmanId		= -1
	gyrocopterId	= -1
	buildingId		= -1
	buildingType	= -1
	showStance		= 1

	-- check what's in our selection
	for i = 1, Selection.count()
	do

		local id = Selection.get( i )

		-- per type stuff
		local type = EntityType( id )

		if type == Henchman_EC then

			henchmanId = id

		elseif type == Gyrocopter_EC then

			gyrocopterId = id

		elseif type == Rex_EC then

			rexId = id

		elseif type == Lucy_EC then

			lucyId = id

		elseif type == Creature_EC or type == Animal_EC then

			if (EntityIsDigging( id ) == 0) then

				creatureId = id

			elseif creatureId == -1 then

				creatureId = id

			end

		else

			-- building
			buildingId = id
			buildingType = type

		end

	end


	if not (buildingId == -1) then

		buildingId = Selection.preferred()
		buildingType = EntityType(buildingId)
		buildingselection(buildingId, buildingType)

	else

		WayPointPathShow()

		if not (creatureId == -1) then

			creaturemodalselection( creatureId )

			if SelectionAllSameType() then

				PatrolPathShow()

			end

		end

		if not (henchmanId == -1) then

			henchmanselection( henchmanId )
			showStance = 0

		end
		if not (gyrocopterId == -1) then

			gyrocopterselection( gyrocopterId )
			showStance = 0

		end
		if not (rexId == -1) then

			rexselection( rexId )
			showStance = 0

		end
		if not (lucyId == -1) then

			lucyselection( lucyId )
			showStance = 0

		end

		if not (creatureId == -1) and showStance == 1 then

			creaturestanceselection( creatureId )

		end

		specialselection()

	end

end

--
enemyselection = function()

	--
	cleartaskbar()

	-- command area
		-- empty

end

--
worldselection = function()

	--
	cleartaskbar()

	-- command area
		-- empty

end

--
emptyselection = function()

	cleartaskbar()

end

--
failedcommand = function( reason )

	local errmsg = {}
		errmsg[ FC_NeedScrap       ] = { 40800,	"audio/ui/AlertShort.pat" }
		errmsg[ FC_NeedElectricity ] = { 40801,	"audio/ui/AlertShort.pat" }
		errmsg[ FC_BuildQueueFull  ] = { 40802,	"audio/ui/AlertShort.pat" }
		errmsg[ FC_TooManyUnit     ] = { 40803,	"audio/ui/AlertShort.pat" }
		errmsg[ FC_CantDig		   ] = { 40804,	"audio/ui/AlertShort.pat" }
		errmsg[ FC_CantUnload	   ] = { 40805,	"audio/ui/AlertShort.pat" }
		errmsg[ FC_Other		   ] = { 0, "" }
		errmsg[ -1				   ] = { 0, "audio/ui/AlertShort.pat" } -- CUSTOM

	bindlabeltotexttimer( "contextarea_line01", errmsg[ reason ][ 1 ], 5 )

	PlaySound( errmsg[ reason ][ 2 ] )

end

--
dobuildunit = function( ebpid )
	local selection = {}
	local index = 1
	for i = 1, Selection.count() do
		local id = Selection.get(i)
		if UnitCanBeBuiltHere(id, ebpid) == 1 then
			selection[index] = id
			index = index + 1
		end
	end

	local id = Cycle.update(selection, _dobuildunit_cmp)

	local result = 0
	local bqlengths = {}
	for i = 1, IsSelectSinglePressed() == 1 and 10 or 1 do
		local bqlength = bqlengths[id] or BuildQueueLength(id)
		result = DoBuildUnit(ebpid)
		id = Cycle.next()

		if result ~= 0 then
			break
		end

		bqlengths[id] = bqlength + 1
	end

	for id, bqlength in bqlengths do
		build_queue_length_changed(id, bqlength)
	end

	if result == 0 then
		-- success
	else
		-- failed
		failedcommand(result)
	end
end

_dobuildunit_cmp = function(id2, id1, context)
	local bq1 = BuildQueueLength(id1)
	return ((bq1 == 0 and Cycle.CMP_FIRST_STOP)
		or (BuildQueueLength(id2) < bq1 and Cycle.CMP_SECOND)
		or Cycle.CMP_FIRST)
end

--
docreatureupgrade = function( upgradeid )
	Cycle.start()

	local result = -1
	if EntityInCreatureUpgrade(SelectionId(0)) == 0 then
		result = DoCreatureUpgrade( creature_to_upgrade, upgradeid )
	end

	if result == 0 then

		-- success
		creature_upgrade_started(SelectionId(0), creature_to_upgrade, upgradeid)

	else

		-- failed
		failedcommand( result )

	end

	Cycle.next()
end

_docreatureupgrade_cmp = function(id2, id1, context)
	return EntityInCreatureUpgrade(id1) == 0 and Cycle.CMP_FIRST_STOP or Cycle.CMP_FIRST
end

--
docancelconstruction = function( dummy )
	DoCancelConstruction()
end

--
docancelbuildunit = function( unitindex )
	Cycle.compare_select(_docancelbuildunit_cmp)

	local id = SelectionId(0)
	local bqlength = BuildQueueLength(id)
	if IsSelectSinglePressed() == 1 then
		for i = unitindex, bqlength do
			DoCancelBuildUnit(unitindex)
		end
		build_queue_length_changed(id, unitindex - 1)

	else
		DoCancelBuildUnit(unitindex)
		build_queue_length_changed(id, bqlength - 1)
	end
end

_docancelbuildunit_cmp = function(id2, id1, context)
	return BuildQueueLength(id1) > 0 and Cycle.CMP_FIRST_STOP or Cycle.CMP_FIRST
end

--
docancelbuildall = function(dummy)
	Cycle.update(selection_filtered_by_types({RemoteChamber_EC, WaterChamber_EC, Aviary_EC}),_docancelbuildunit_cmp)

	for i = 0, BuildQueueLength(Selection.preferred()) do
		docancelbuildunit(0)
	end

	Cycle.next()
end

--
docancelbuildfirst = function(dummy)
	Cycle.compare_select(_docancelbuildunit_cmp)
	docancelbuildunit(0)
end

--
docancelbuildlast = function(dummy)
	Cycle.compare_select(_docancelbuildunit_cmp)
	docancelbuildunit(BuildQueueLength(Selection.preferred()) - 1)
end

--
docancelresearch = function(building)
	if building ~= SelectionId(0) then
		local id = save_single_selection()
		SelectEntity(building, 0)
		DoCancelResearch()
		restore_single_selection(id)
	else
		DoCancelResearch()
	end

	research_stopped(building)
	docheckbuildingcanceledresearch(EntityInResearch, building)
end


--
docanceladdon = function(building)
	if building ~= SelectionId(0) then
		local id = save_single_selection()
		SelectEntity(building, 0)
		DoCancelAddOn()
		restore_single_selection(id)
	else
		DoCancelAddOn()
	end

	addon_stopped(building)
	docheckbuildingcanceledresearch(EntityInExtension, building)
end

--
docancelcreatureupgrade = function(building)
	if building ~= SelectionId(0) then
		local id = save_single_selection()
		SelectEntity(building, 0)
		DoCancelCreatureUpgrade()
		restore_single_selection(id)
	else
		DoCancelCreatureUpgrade()
	end

	creature_upgrade_stopped(building)
	docheckbuildingcanceledresearch(EntityInCreatureUpgrade, building)
end

--
-- Periodically calls check_function(building) until it returns 0. Then calls on_refresh_main().
-- After canceling research, a creature upgrade or an addon,
-- IC takes some time before it reflects this change.
--
docheckbuildingcanceledresearch = function(check_function, building)
	Timer.register("_docheckbuildingcanceledresearch_callback",
		_docheckbuildingcanceledresearch_callback, {check_function, building}, 10)
end

_docheckbuildingcanceledresearch_callback = function (check_function, building)
	if check_function(building) == 0 then
		Timer.unregister("_docheckbuildingcanceledresearch_callback")
		on_refresh_main()
	end
end

--
doresearch = function( research )
	Cycle.start()

	local result = -1
	if EntityInResearch(SelectionId(0)) == 0 then
		result = DoResearch( research )
	end

	if result == 0 then

		-- success
		research_started(SelectionId(0), research)

	else

		-- failed
		failedcommand( result )

	end

	Cycle.next()
end

_doresearch_cmp = function(id2, id1, context)
	return EntityInResearch(id1) == 0 and Cycle.CMP_FIRST_STOP or Cycle.CMP_FIRST
end

--
doaddon = function( addon )
	Cycle.start()

	local result = -1
	if EntityInExtension(SelectionId(0)) == 0 then
		result = DoAddOn( addon )
	end

	if result == 0 then

		-- success
		addon_started(SelectionId(0), addon)

	else

		-- failed
		failedcommand( result )

	end

	Cycle.next()
end

_doaddon_cmp = function(id2, id1, context)
	return EntityInExtension(id1) == 0 and Cycle.CMP_FIRST_STOP or Cycle.CMP_FIRST
end

--
dobuildbuildingcancel = function( dummy )

	-- stop ui
	BuildUIEnd()

	--
	on_selection_main()

end

--
buildbuilding_updateui = function()

	--
	cleartaskbar()

	-- command area
		-- cancel button
	bindbutton( "command_formation_icon07", HK_System_Escape, "dobuildbuildingcancel", "", "UI/InGame/Cancel.tga", 0 )

end

--
dobuildbuilding = function( ebpid )

	-- post event to indicate that a build-building button is pressed
	BuildEBPButtonPressed( ebpid )

	local result

	-- let building modal commands be queued
	CommandQueueEnable( HK_System_CommandQueue, "commandqueuecancel" )

	-- detemine if this ebpid is a fence or not
	if TypeFromEBP( ebpid ) == BrambleFence_EC then

		-- start fence ui
		result = BuildUIBegin( "dobuildfenceclick", "dobuildbuildingabort", ebpid )

	else

		-- start plain building ui
		result = BuildUIBegin( "dobuildbuildingclick", "dobuildbuildingabort", ebpid )

	end

	if result == 0 then

		-- register function for refresh calls
		--   we want the verify the context but we don't want to recall this function;
		--   thus the dummy function
		menucontext = { "buildbuilding_updateui()", "mcqualifier_buildbuilding", "BuildUIEnd()" }

		buildbuilding_updateui( )


	else

		-- failed
		failedcommand( result )

	end


end

--
dobuildbuildingclick = function( ebpid, x, y, z, dummy )

	-- are we in command queue mode?
	local queue = ModalCommandQueueRequest()

	if queue == 0 then

		-- stop ui, we aren't queuing
		BuildUIEnd()

	end

	-- send command
	local result

	result = DoBuildBuilding( ebpid, x, y, z, queue )

	if not( result == 0 ) then

		failedcommand( result )

	end

end

--
dobuildfenceclick = function( ebpid, x, y, z, x2, y2, z2, dummy )

	-- are we in command queue mode?
	local queue = ModalCommandQueueRequest()

	if queue == 0 then

		-- stop ui, we aren't queuing
		BuildUIEnd()

	end

	-- send command
	DoBuildFence( ebpid, x, y, z, x2, y2, z2, queue )

end

-- --
-- dogyrocopterupgradeclick = function( ebpid, x, y, z, dummy )

-- 	-- are we in command queue mode?
-- 	local queue = ModalCommandQueueRequest()

-- 	if queue == 0 then

-- 		-- stop ui, we aren't queuing
-- 		BuildUIEnd()

-- 	end

-- 	-- send command
-- 	DoGyrocopterUpgrade( ebpid, x, y, z, queue )

-- end

--
dobuildbuildingabort = function( ebpid )

	-- stop ui
	BuildUIEnd()

	-- reset info center & command area
	on_selection_main()

end


--
doradarpulse = function( )

	Cycle.update(selection_filtered_by_type(Lab_EC))

	-- fire radar pulse
	local result = DoRadarPulse()

	if result == 0 then

		-- success

	else

		-- failed
		failedcommand( result )

	end

	Cycle.next()
end

--
dosonicboom = function( )

	Cycle.update(selection_filtered_by_type(SoundBeamTower_EC))

	-- fire sonic boom
	local result = DoSonicBoom()

	if result == 0 then

		-- success

	else

		-- failed
		failedcommand( result )

	end

	Cycle.next()
end

--
doairburst = function( )

	Cycle.update(selection_filtered_by_type(AntiAirTower_EC))

	-- fire air burst
	local result = DoAirBurst()

	if result == 0 then

		-- success

	else

		-- failed
		failedcommand( result )

	end

	Cycle.next()
end

--
dolabdefense = function( turnon )

	Cycle.update(selection_filtered_by_type(Lab_EC))

	-- toggle lab defense
	local result = DoLabDefense( turnon )

	if result == 0 then

		-- success

	else

		-- failed
		failedcommand( result )

	end

	Cycle.next()

end

-- check to see if the given entity can call the buildunitsmenu
mcqualifier_buildunits = function( id )

	local type = EntityType( id )

	-- only remote chamber can do
	if type == RemoteChamber_EC then
		return 1
	end

	return 0

end

--
buildunitsmenu = function()

	-- register function for refresh calls
	-- menucontext = { "buildunitsmenu()", "mcqualifier_buildunits", "" }

	local ids = {}
	local count = 0
	for i = 1, Selection.count() do
		local id = Selection.get(i)
		local type = EntityType(id)
		if (ids[type] == nil) and (EntityInConstruction(id) ~= 1) and (
			type == RemoteChamber_EC
			or type == WaterChamber_EC
			or type == Aviary_EC
		) then
			ids[type] = id
			count = count + 1
			if count >= 3 then
				break
			end
		end
	end

	--
	cleartaskbar()

	if count == 0 then
		return
	end

	-- command area
		-- rally
	bindbutton( "command_modal_icon01", commands[1][2], "dospawnmodal", "commandstooltip", commands[1][4], 1 )

		-- background
	ShowBitmapLabel( "command_bigicon_back" )


	local countarmy   = ArmyCount()
	local countbutton = getn( armybuttons )

	local idxarmy   = 0
	local idxbutton = 1

	while idxarmy <= countarmy - 1 and idxbutton <= countbutton
	do

		local unit = ArmyAt( idxarmy )

		for type, id in ids do
			if UnitCanBeBuiltHere(id, unit) == 1 then
				-- bindbuttontounitebp( armybuttons[ idxbutton ], armyunit_hotkeys[ idxbutton ], "dobuildunit", "tooltip_armyunit", id, unit )
				bindbuttontounitebp( armybuttons[ idxarmy + 1 ], armyunit_hotkeys[ idxarmy + 1 ], "dobuildunit", "tooltip_armyunit", id, unit )

				idxbutton = idxbutton + 1
				break
			end
		end

		idxarmy = idxarmy + 1

	end

	if ArmyBuilderAllowed() == 1 then

		bindbuttontoarmybuilder( "command_alt_10",  HK_Generic_ArmyBuilder, "armybuilder", "menutooltip", "ui/ingame/armybuilder.tga", 2 )

	end

	BindHotkey(HK_Cancel_Build_All, "docancelbuildall", 0)
	BindHotkey(HK_Cancel_Build_First, "docancelbuildfirst", 0)
	BindHotkey(HK_Cancel_Build_Last, "docancelbuildlast", 0)

end

-- check to see if the given entity can call the upgradeunitsmenu
mcqualifier_upgradeunits = function( id )

	local type = EntityType( id )

	-- only genetic amplifier can do
	if type == GeneticAmplifier_EC then
		return 1
	end

	return 0

end

--
upgradeunitsmenu = function( ebpnetid )

	-- validate argument
	if ebpnetid == -1 then
		return
	end

	-- register function for refresh calls
	menucontext = { "upgradeunitsmenu( " .. ebpnetid .. " )", "mcqualifier_upgradeunits" , "" }

	creature_to_upgrade = ebpnetid

	local id = Selection.preferred()

	--
	cleartaskbar()

	-- back
	bindbutton( "command_formation_icon01", HK_System_Escape, "menucontext_back", "backbuttontooltipcb", "UI/InGame/Back.tga", 0 )

	-- background
	ShowBitmapLabel( "command_bigicon_back" )

	-- command area
	commandareaupgrade( id, ebpnetid, creatureupgrades, "tooltip_upgrades" )

end

--
doungarrison = function( index )

	if index == 2 then
		DoUngarrison( Rex_EC )
	else
		DoUngarrison( Lucy_EC )
	end

end

--
dospawnmodal = function( index )

	-- register function for refresh calls
	menucontext = { "dospawnmodal(" .. index .. ")", "", "ModalUIEnd()" }

	-- translate mode in game usable mode (only one here)
	local mode		= MM_LockCursor
	local command	= MC_SetRallyPoint

	--
	local result = ModalUIBegin( "domodalclick", "domodalcancel", mode, command )

	if result == 0 then

		--
		cleartaskbar()

		-- command area
			-- cancel button
		bindbutton( "command_formation_icon07", HK_System_Escape, "domodalcancel", "", "UI/InGame/Cancel.tga", 0 )

	else

		-- failed
		failedcommand( result )

	end

end

--
mcqualifier_creaturemodal = function( id )

	-- check to see if the entity is dugged in
	if (EntityIsDigging( id ) == 0) then
		return 1
	end

	return 0

end

--
docreaturemodal = function( index )

	-- register function for refresh calls
	menucontext = { "docreaturemodal(" .. index .. ")", "mcqualifier_creaturemodal", "ModalUIEnd()" }

	-- translate mode in game usable mode
	local mode		= creature_modalmodes[ index ][1];
	local command	= creature_modalmodes[ index ][2];

	-- let creature modal commands be queued
	CommandQueueEnable( HK_System_CommandQueue, "commandqueuecancel" )

	--
	local result = ModalUIBegin( "domodalclick", "domodalcancel", mode, command )

	if result == 0 then

		--
		cleartaskbar()

		-- command area
			-- cancel button
		bindbutton( "command_formation_icon07", HK_System_Escape, "domodalcancel", "", "UI/InGame/Cancel.tga", 0 )

	else

		-- failed
		failedcommand( result )

	end

end

--
doteamobjmodal = function()

	-- register function for refresh calls
	menucontext = { "doteamobjmodal()", "", "ModalUIEnd()" }

	local mode 	= teamobj_modalmode[1];
	local command	= teamobj_modalmode[1];

	--
	local result = ModalUIBegin( "doteamobjmodalclick", "domodalcancel", mode, command )

	if result == 0 then

		--
		cleartaskbar()

		-- remove hotkey for team objective so we can't re-enter the team objective placement mode
		-- while we are in it
		BindHotkey( HK_Generic_TeamObjective, "", 0 )

		-- command area
			-- cancel button
		bindbutton( "command_formation_icon07", HK_System_Escape, "domodalcancel", "", "UI/InGame/Cancel.tga", 0 )

	else

		-- failed
		failedcommand( result )

	end

end

--
doteamobjmodalclick = function( mode, x, y, z, ebpid )

	-- are we in command queue mode?
	local queue = ModalCommandQueueRequest()

	if queue == 0 then

		-- stop ui (taskbar)
		ModalUIEnd()

	end

	-- send command based on modal mode	(proxy)
	SetTeamObjPosition( x, y, z  )

end

--
dospecialmodalclick = function(mode, x, y, z, entity_id)
	local context = {
		modal_command = mode,
		ability_command = special_modal_type > 0 and ability_commands[special_modal_type][5] or nil,
		special_command = special_modal_index > 0 and modal_special_commands[special_modal_index][5] or nil,
		x = x,
		y = y,
		z = z,
		target_id = entity_id,
	}

	for k, v in specialmodal_mc_context[context.modal_command] or specialmodal_mc_context["default"] or {} do
		context[k] = v
	end

	_dospecialmodal_inner(context)

	-- local queue = ModalCommandQueueRequest()
	-- DoModalCommand(context.modal_command, context.x, context.y, context.z, context.target_id, queue)
	-- ModalUIEnd()
	-- on_selection_main()
end

dospecialmodalnow = function(index)
	local context = {
		modal_command = creature_specialmodalmodes[index][2],
		ability_command = nil,
		special_command = modal_special_commands[index][5],
	}

	for k, v in specialmodal_mc_context[context.modal_command] or {} do
		context[k] = v
	end

	_dospecialmodal_inner(context)

	-- local queue = ModalCommandQueueRequest()
	-- DoCommandTriggered(context.special_command, queue)
	-- ModalUIEnd()
	-- on_selection_main()
end

_dospecialmodal_inner = function(context)
	if not (context.modal_command ~= nil
		and (context.ability_command ~= nil or context.special_command ~= nil)
		and (context.target_id ~= nil or context.special_command ~= nil)
	) then
		dospecialmodalcancel()
		return
	end

	context.once = context.once == 1 and 1 or 0
	context.interval = context.interval or 0

	local now = Timer.now()
	local shift_pressed = IsSelectSimilarPressed()
	local idctx_key = "time_ability" .. (context.ability_command or "-") .. (context.special_command or "-")

	-- if ability should be triggered for the whole selection
	if context.all == 1 or (context.interval <= 0 and context.once == 0 and shift_pressed == 0) then
		-- are we in command queue mode?
		local queue = ModalCommandQueueRequest()

		if context.target_id ~= nil then
			-- send command based on modal mode	(proxy)
			DoModalCommand(context.modal_command, context.x or 0, context.y or 0, context.z or 0, context.target_id or 0, queue)
		else
			DoCommandTriggered(context.special_command, queue)
		end

		-- update ability time
		for i = SelectionCount(), 1, -1 do
			local idctx = Entities.context(SelectionId(i - 1))
			if idctx ~= nil then
				idctx[idctx_key] = now
			end
		end

		dospecialmodalcancel()
		return
	end

	-- set context selection and ids
	if context.selection == nil or context.ids == nil or context.count == nil then
		context.selection = {}
		context.ids = {}
		for i = Selection.count(), 1, -1 do
			local id = Selection.get(i)
			context.selection[i] = id
			context.ids[id] = i
		end

		if context.interval > 0 and context.once == 0 and shift_pressed == 0 then
			Timer.register("dospecialmodal_inner_next", _dospecialmodal_inner, {context}, context.interval)
		end

		local old_context = _dospecialmodal_context
		if old_context ~= nil
			and old_context.cycle_id == Cycle.instance_id()
			and old_context.modal_command == context.modal_command
			and old_context.ability_command == context.ability_command
			and old_context.special_command == context.special_command
			and old_context.selection ~= nil
			and old_context.ids ~= nil
			and old_context.count ~= nil
		then
			old_context.x, old_context.y, old_context.z = context.x, context.y, context.z
			old_context.target_id = context.target_id
			context = old_context
		else
			_dospecialmodal_context = context
			Cycle.init(context.selection)
			context.cycle_id = Cycle.instance_id()
			context.count = getn(context.selection)
		end
	end

	-- trigger command for next unit
	local id = context.current_id or 0
	while getn(context.selection) > 0 or id ~= 0 do
		local idctx
		if id == 0 or EntityHasEndurance(id) == 0 then -- no id or dead or dying
			id, idctx = _dospecialmodal_inner_get_next_entity(context.selection, idctx_key)
		else
			idctx = Entities.context(id)
		end

		if id ~= 0 and idctx ~= nil then
			context.current_id = id
			Cycle.set_current_id(id)
			SelectEntity(id, 0)

			if (context.ability_command ~= nil
				and SelectionHasSpecialCommand(context.ability_command)
				or SelectionHasTriggeredAbility(context.special_command)
			) == 1 then
				-- are we in command queue mode?
				local queue = ModalCommandQueueRequest()

				if context.target_id ~= nil then
					-- send command based on modal mode	(proxy)
					DoModalCommand(context.modal_command, context.x or 0, context.y or 0, context.z or 0, context.target_id or 0, queue)
				else
					DoCommandTriggered(context.special_command, queue)
				end

				idctx[idctx_key] = now
				break
			end

		end

		id = 0
	end

	if getn(context.selection) > 0 and context.once == 0 or shift_pressed == 1 then
		local id = _dospecialmodal_inner_get_next_entity(context.selection, idctx_key)
		if id == 0 then
			context.current_id = 0
		else
			context.current_id = id
			Cycle.set_current_id(id)
			SelectEntity(id, 0)
		end

		if shift_pressed == 1 then
			Timer.register("dospecialmodal_inner_shift", _dospecialmodal_inner_shift_cancel, nil, 5)
		else
			-- stop ui
			ModalUIEnd()
		end

		return
	end

	dospecialmodalcancel()
end

_dospecialmodal_inner_get_next_entity = function(selection, idctx_key)
	local index, id, idctx, time
	for i = getn(selection), 1, -1 do
		local _id = selection[i] or 0
		local _idctx = Entities.context(_id)
		if _idctx == nil or EntityHasEndurance(_id) == 0 then -- if dead or dying
			tremove(selection, i)

		elseif time == nil or time > (_idctx[idctx_key] or 0) then
			index, id, idctx, time = i, _id, _idctx, _idctx[idctx_key] or 0

			if time == 0 then
				break
			end
		end
	end

	if index ~= nil then
		tremove(selection, index)
	end

	return id or 0, idctx
end

_dospecialmodal_inner_shift_cancel = function()
	if IsSelectSimilarPressed() == 0 then
		Timer.unregister("dospecialmodal_inner_shift")
		dospecialmodalcancel()
	end
end

dospecialmodalcancel = function(dummy)
	dospecialmodalcancel_without_on_selection()
	on_selection_main()
end

dospecialmodalcancel_without_on_selection = function()
	Timer.unregister("dospecialmodal_inner_shift")
	Timer.unregister("dospecialmodal_inner_next")

	-- stop ui
	ModalUIEnd()

	local context = _dospecialmodal_context
	if context == nil then
		return
	end
	_dospecialmodal_context = nil

	local cycle_id = Cycle.instance_id()
	if context.cycle_id == cycle_id or EntityHasEndurance(context.current_id or 0) == 0 then
		if context.cycle_id == cycle_id then
			Cycle.clear()
		end

		-- restore original selection (combat units only)
		if context.ids ~= nil and context.count > 0 and context.count ~= SelectionCount() and (
			context.count ~= 1 or SelectionCount() ~= 1 or next(context.ids) ~= SelectionId(0)
		) then
			SelectAllCombatUnitsInWorld()
			for i = SelectionCount(), 1, -1 do
				local id = SelectionId(i - 1)
				if context.ids[id] == nil then
					DeSelectEntity(id, 0)
				end
			end
		end
	end
end

dospecialmodalclickvalidate = function()
	local context = _dospecialmodal_context
	if context == nil then
		return 0
	end

	if context.cycle_id ~= Cycle.instance_id() and EntityHasEndurance(context.current_id or 0) == 1 then
		dospecialmodalcancel_without_on_selection()
		return 0
	end

	return 1
end

--
domodalclick = function( mode, x, y, z, ebpid )

	-- are we in command queue mode?
	local queue = ModalCommandQueueRequest()

	if queue == 0 then

		-- stop ui (taskbar)
		ModalUIEnd()

		-- clear menu context
		menucontext_clear()

	end

	-- send command based on modal mode	(proxy)
	DoModalCommand( mode, x, y, z, ebpid, queue )
end

--
domodalcancel = function( dummy )

	-- stop ui
	ModalUIEnd()

	--
	on_selection_main()

end

--
dounloadmodalcancel = function( dummy )

	-- clear out pending unload list
	DoCancelPendingUnload()

	-- stop ui
	ModalUIEnd()

	--
	on_selection_main()

end

--
dohenchmanunloadnow = function( index )

	-- unload
	local result = DoUnloadHere()

	if result == 0 then

		-- success

		-- stop ui
		ModalUIEnd()

		--
		on_selection_main()

	else

		-- failed
		failedcommand( result )

	end

end

--

doresourceconversion = function( type )

    DoResourceConversion( type )

end

--
tooltipresearch = function( enabled, research, infotable )

	on_show_tooltip()

	if enabled == 1 then

		HelpTextResearchName(research)
		HelpTextResearchCost(research)

	else

		HelpTextResearchName(research)
		HelpTextResearchCost(research)
		HelpTextResearchPrerequisite(research)

	end


	local count = getn( infotable )
	for i = 1, count
	do
		if infotable[i][1] == research then
			HelpTextShortcut( infotable[i][2] )
			HelpTextTextWithRequirements( infotable[i][3] )
		end
	end

end

tooltip_labresearch = function( enabled, research )

	tooltipresearch(enabled,research,labresearch)
end

tooltip_vetresearch = function( enabled, research )

	tooltipresearch(enabled,research,vetresearch)
end

tooltip_foundaryresearch = function( enabled, research )

	tooltipresearch(enabled,research,foundaryresearch)
end

--
commandareaaddon = function( id, addon, tooltipcb )

	--

	showhud("command_bigicon_back")

	local buttons =
	{
		"command_alt_1",
		"command_alt_2",
		"command_alt_3",
		"command_alt_4",
		"command_alt_5",
		"command_alt_6",
		"command_alt_7",
		"command_alt_8",
		"command_alt_9",
		"command_alt_10",

	}

	local countbuttons  = getn( buttons  )
	local countaddon = getn( addon )

	local count

	if countbuttons < countaddon then

		count = countbuttons

	else

		count = countaddon

	end

	local first = 1
	for i = 1, count
	do
		if AddOnIsAllowed( addon[ i ][1] ) == 1 then

			if AddOnIsInstalled( id, addon[ i ][1] ) == 0 then

				if EntityInExtension(id) == 0 or first == 0 then

					bindbuttontoaddon( buttons[i], addon[ i ][ 2 ], "doaddon", tooltipcb, id, addon[ i ][1] )

				end

				first = 0

			end

		end
	end

end

--
commandarearesearch = function( id, research, tooltipcb )

	--

	showhud("command_bigicon_back")

	local buttons =
	{
		"command_alt_1",
		"command_alt_2",
		"command_alt_3",
		"command_alt_4",
		"command_alt_5",
		"command_alt_6",
		"command_alt_7",
		"command_alt_8",
		"command_alt_9",
		"command_alt_10",
	}

	local countbuttons  = getn( buttons  )
	local countresearch = getn( research )

	local count

	if countbuttons < countresearch then

		count = countbuttons

	else

		count = countresearch

	end

	for i = 1, count
	do

		if research_is_open( research[ i ][1] ) == 1 then

			bindbuttontoresearch( buttons[ i ], research[ i ][2], "doresearch", tooltipcb, id, research[ i ][1] )

		end

	end

end

--
commandareaupgrade = function( id, ebpnetid, upgrade, tooltipcb )

	--

	ShowBitmapLabel( "command_bigicon_back" )

	local buttons =
	{
		"command_alt_1",
		"command_alt_2",
		"command_alt_3",
		"command_alt_4",
		"command_alt_5",
		"command_alt_6",
		"command_alt_7",
		"command_alt_8",
		"command_alt_9",
		"command_alt_10",
	}

	local countbuttons  = getn( buttons  )
	local countupgrade = getn( upgrade )

	local count

	if countbuttons < countupgrade then

		count = countbuttons

	else

		count = countupgrade

	end

	for i = 1, count
	do

		if creature_upgrade_is_open( ebpnetid, upgrade[ i ][1] ) == 1 then

			bindbuttontocreatureupgrade( buttons[ i ], upgrade[ i ][2], "docreatureupgrade", tooltipcb, id, ebpnetid, upgrade[ i ][1] )

		end

	end

end

--
tooltipaddon = function( enabled, addon, infotable )

	local id = Selection.preferred()

	on_show_tooltip()

	if enabled == 1 then

		HelpTextAddOnName(id,addon)
		HelpTextAddOnCost(id,addon)

	else

		HelpTextAddOnName(id,addon)
		HelpTextAddOnCost(id,addon)
		HelpTextAddOnPrerequisite(id,addon)


	end

	local count = getn( infotable )
	for i = 1, count
	do
		if infotable[i][1] == addon then
			HelpTextShortcut( infotable[i][2] )
			HelpTextTextWithRequirements( infotable[i][3] )
		end
	end

end



tooltip_generatoraddon = function( enabled, addon )

	tooltipaddon(enabled,addon,generatoraddons)

end

--
menucontext_valid = function()

	-- context is invalid if nothing is selected
	if ( SelectionCount() == 0 ) then
		return 0
	end

	-- check to see if there is a context to recover
	if ( menucontext[1] == "" ) then
		return 0
	end

	-- no qualifier means the context is always valid
	if menucontext[2] == "" then
		return 1
	end

	-- loop through all the selected entities and return true as soon as one of the
	-- entities is valid
	for i = 1, SelectionCount()
	do

		local id = SelectionId( i - 1 )
		dostring( "menucontext_valid_var = " .. menucontext[2] .. "( " .. id .. " )" )
		if ( menucontext_valid_var == 1 ) then ---@diagnostic disable-line: undefined-global
			return 1
		end

	end

	return 0

end

--
menucontext_refresh = function()

	dostring( menucontext[1] )

end

--
menucontext_clear = function()

	menucontext = {"", "", ""}

end

--
menucontext_cancelmodal = function()

	if menucontext[3] ~= "" then

		dostring( menucontext[3] )

	end

end

--
menucontext_back = function()

	-- menucontext_clear()

	on_selection_main()

end

--
focusonselection = function()

	FocusOnSelection()

end

--
zoomin = function()

	ZoomCameraMouse( -0.70 )

end

--
zoomout = function()

	ZoomCameraMouse( 1.45 )

end


--
deselectall = function()

	DeSelectAll()

end

--
escapemenu = function()

	PauseMenuShow()

end

--
allymenu = function()

	AllyShow()

end

--
objvmenu = function()
	ObjectivesShow()
end

--
unhotkeygroup = function()
	UnassignFromAllHotkeyGroups()
end

--
preloadall = function()

	PreloadTexture( "ui/ingame/resource_electricity.tga" )
	PreloadTexture( "ui/ingame/resource_scrap.tga" )
	PreloadTexture( "ui/ingame/back.tga" )

	for i = 1, getn(henchman_commands)
	do

		PreloadTexture( henchman_commands[ i ][ 4 ] )

	end

	for i = 1, getn(creature_commands)
	do

		PreloadTexture( creature_commands[ i ][ 4 ] )

	end

	for i = 1, getn(ability_commands)
	do

		PreloadTexture( ability_commands[ i ][ 4 ] )

	end

	for i = 1, getn(commands)
	do

		PreloadTexture( commands[ i ][ 4 ] )

	end

end

--
track_deaths = function(alive, dead)
	local refresh = 0
	local now = Timer.now()

	for _, entity in dead do
		if entity.type == Henchman_EC or entity.type == Creature_EC then
			local player_id = entity.owner
			local units = track_deaths_units[player_id]
			if units == nil then
				units = {units = {}, dead = 0, time = 0}
				track_deaths_units[player_id] = units

			-- elseif now - units.time >= track_deaths_timeout then
			-- 	units.units = {}
			-- 	units.dead = 0
			end

			local unit = units.units[entity.ebpid]
			if unit == nil then
				unit = {dead = 1}
				units.units[entity.ebpid] = unit

			else
				unit.dead = unit.dead + 1
			end

			if units.time ~= now then
				Timer.register("track_deaths_clear_player" .. player_id, track_deaths_clear_player,
					{player_id}, track_deaths_timeout)
			end

			units.dead = units.dead + 1
			units.time = now
			unit.time = now
			refresh = 1
		end
	end

	if refresh == 1 then
		do_refresh_on_next_tick()
	end

	-- print("alive: " .. getn(alive) .. ", dead: " .. getn(dead)) --DEBUG
end

track_deaths_clear = function()
	track_deaths_units = {}
	do_refresh_on_next_tick()
end

track_deaths_clear_player = function(player_id)
	local units = track_deaths_units[player_id]
	if units ~= nil then
		units.units = {}
		units.dead = 0
		do_refresh_on_next_tick()
	end
end

track_deaths_click = function()
	infocenterobserverutilities_turn_page(nil, "infocenterobserverutilities_deaths")
	DeSelectAll()
end

track_deaths_tooltip = function()
	infocenterobserverutilities_set_temporary_function(infocenterobserverutilities_deaths)
	Timer.register("infocenter_tmp_func", infocenterobserverutilities_set_temporary_function, nil, -5)
	on_show_tooltip_dummy()
end

track_deaths_show = function()
	local now = Timer.now()
	local gatherer_ebp = GathererEBP()
	local icon = 1
	for player_id, units in track_deaths_units do
		local units_henchmen = units.units[gatherer_ebp]
		local dead_henchmen = units_henchmen ~= nil and units_henchmen.dead or 0
		local dead_creatures = units.dead - dead_henchmen

		if dead_henchmen + dead_creatures > 0 then
			if icon > getn(custom_eventcue_icons_top) or icon > getn(custom_eventcue_icons_bot) then
				break
			end

			BindButtonEnabled(custom_eventcue_icons_bot[icon][1], "",
				"track_deaths_click", "track_deaths_tooltip", ICN_Henchmen_Shadow, 1)
			bindbuttondisabled(custom_eventcue_icons_bot[icon][2], "", "", "", ICN_Dead_Color, 0)
			bindlabeltoplayercolour(custom_eventcue_icons_bot[icon][2], player_id)
			bindlabeltotext(custom_eventcue_icons_bot[icon][3], numtotxtid(dead_henchmen))
			bindhudtotooltip(custom_eventcue_icons_bot[icon][3], "track_deaths_tooltip", 1, 0)

			BindButtonEnabled(custom_eventcue_icons_top[icon][1], "",
			"track_deaths_click", "track_deaths_tooltip", ICN_Creature_Shadow, 1)
			bindbuttondisabled(custom_eventcue_icons_top[icon][2], "", "", "", ICN_Dead_Color, 0)
			bindlabeltoplayercolour(custom_eventcue_icons_top[icon][2], player_id)
			bindlabeltotext(custom_eventcue_icons_top[icon][3], numtotxtid(dead_creatures))
			bindhudtotooltip(custom_eventcue_icons_top[icon][3], "track_deaths_tooltip", 1, 0)

			icon = icon + 1
		end
	end
end

--
do_refresh_on_next_tick = function()
	refresh_on_next_tick = 1
end

do_refresh_on_hide_tooltip = function()
	refresh_on_hide_tooltip = 1
end

--
do_timer_update = function()
	if update_tooltip_timer() == 1 then
		return
	end

	Timer.update()
	Stats.update()

	if refresh_on_next_tick == 1 or (hide_tooltip_back_on_next_tick == 1 and refresh_on_hide_tooltip == 1) then
		refresh_on_next_tick, refresh_on_hide_tooltip, hide_tooltip_back_on_next_tick = 0, 0, 0
		-- print("refresh; " .. Timer.now()) --DEBUG
		on_refresh_main()

	elseif hide_tooltip_back_on_next_tick == 1 then
		hide_tooltip_back_on_next_tick = 0
		hidehud("tooltip_back2")
	end
end

--
on_show_tooltip = function()
	if tooltip_timer_skip ~= 1 then
		tooltip_timer = nil
	end

	hide_tooltip_back_on_next_tick = 0
	do_timer_update()
	hide_tooltip_back_on_next_tick = 1

	showhud("tooltip_back2")
end

on_show_tooltip_dummy = function()
	do_timer_update()
end

--
show_tooltip_timer = function(timer, ttcallback, ttargument)
	tooltip_timer = {timer, ttcallback, ttargument}
	Timer.register("hide_tooltip_timer", hide_tooltip_timer, nil, timer <= 0 and timer or -timer)
	do_refresh_on_next_tick()
end

update_tooltip_timer = function()
	if tooltip_timer ~= nil and tooltip_timer_skip ~= 1 then
		tooltip_timer_skip = 1
		tooltip_timer[2](tooltip_timer[3], tooltip_timer[4])
		return 1
	end
	tooltip_timer_skip = 0
	return 0
end

hide_tooltip_timer = function()
	tooltip_timer = nil
	do_refresh_on_next_tick()
end

--
on_initial = function()

	-- preload texture
	preloadall()

	-- create minimap
	CreateMinimap( "minimap" )

	--
	SetPlayerArmyOrder( AO_Rank )

	-- focus on player's lab
	FocusOnEntity( LocalPlayerLabId(), 0, 1 )

	-- Initialize UI Prefs
	LoadUIOptions()

end

--
on_selection = function()
	-- validate Cycle
	local cycle_valid = Cycle.validate()

	-- validate special modal click
	if dospecialmodalclickvalidate() == 1 then
		return
	end

	-- ensure selection has only units or only non-units
	_deselect_mixed()

	-- validate Subselect and update Selection
	if Subselect.validate() == 0 then
		Selection.update_from_cycle()
	end

	-- refresh if cycle and menucontext are valid
	if cycle_valid == 1 and menucontext_valid() == 1 then
		-- refresh the context
		menucontext_refresh()
		return
	end

	-- Scan entities.
	Timer.call_register("Entities.scan", Entities.scan, nil,
		Entities.scan_stage() < 2 and 500 or 25)

	if Entities.is_registered("track_deaths") == 0 then
		Entities.register("track_deaths", track_deaths)
	end

	on_selection_main()
end

on_selection_main = function()
	-- selection has changed, clear visible rally point
	RallyPointHide()

	PatrolPathHide()

	WayPointPathHide()

	-- clear menu context
	menucontext_clear()

	--
	if SelectionCount() == 0 then
		emptyselection()
	elseif SelectionBelongsToPlayer() == 1 then
		friendlyselection()
	elseif SelectionIsEnemy() == 1 then
		enemyselection()
	else
		worldselection()
	end
end

_deselect_mixed = function()
	local count = SelectionCount()

	-- local dbgtxt = "selection: count: " .. count --DEBUG
	-- dbgtxt = dbgtxt .. ", types: " --DEBUG
	-- for i = 1, count do --DEBUG
	-- 	local type = EntityType(SelectionId(i - 1)) --DEBUG
	-- 	dbgtxt = dbgtxt .. ( --DEBUG
	-- 		(is_unit_ec(type) == 1 and "U") or --DEBUG
	-- 		(is_structure_ec(type) == 1 and "S") or --DEBUG
	-- 		(is_nature_ec(type) == 1 and "N") or --DEBUG
	-- 		"?") --DEBUG
	-- end --DEBUG

	-- if selection has mixed units and non-units, delesect all non-units or
	-- deselect all non-structures if select-single (usually ctrl) is pressed.
	if count > 1 then
		local is_category_ec = IsSelectSinglePressed() == 1 and is_structure_ec or is_unit_ec

		-- find indexes of first match and first mismatch
		local index_first_match = 0
		local index_first_mismatch = 0
		for i = 1, count do
			local type = EntityType(SelectionId(i - 1))
			if is_category_ec(type) == 1 then
				if index_first_match == 0 then
					index_first_match = i
					if index_first_mismatch > 0 then
						break
					end
				end
			else
				if index_first_mismatch == 0 then
					index_first_mismatch = i
					if index_first_match > 0 then
						break
					end
				end
			end
		end

		-- dbgtxt = dbgtxt .. ", first: " .. index_first_match .. " " .. index_first_mismatch --DEBUG

		-- deselect all mismatches
		if index_first_match > 0 and index_first_mismatch > 0 then
			-- dbgtxt = dbgtxt .. ", loop: " .. count .. "-" .. index_first_mismatch --DEBUG
			-- dbgtxt = dbgtxt .. ", deselect:" --DEBUG
			for i = 1, count - index_first_mismatch + 1 do
				local id = SelectionId(count - i)
				local type = EntityType(id)
				if is_category_ec(type) == 0 then
					-- dbgtxt = dbgtxt .. " " .. (count - i + 1) --DEBUG
					DeSelectEntity(id, 0)
				end
			end
		end
	end

	-- print(dbgtxt) --DEBUG
end

--
on_refresh = function()
	if _on_refresh_inner() == 0 then
		on_selection()
	end
end

on_refresh_main = function()
	if _on_refresh_inner() == 0 then
		on_selection_main()
	end
end

_on_refresh_inner = function()
	refresh_on_next_tick = 0

	if (menucontext_valid() == 1) then
		-- TODO: remove?
		-- validate Cycle and Subselect and update Selection
		-- Cycle.validate()
		-- if Subselect.validate() == 0 then
		-- 	Selection.update_from_cycle()
		-- end

		-- refresh the context
		menucontext_refresh()
		return 1
	end

	-- clear all modal UI context
	menucontext_cancelmodal()

	-- otherwise, just treat this as a fresh selection
	return 0
end

--
on_gamestart = function()

	-- announce game mode (only has effects in MP games)
	Announce( "gametype_announce.start", 1.5 )

	if CHEATS_KILL_LOCAL_PLAYER == 1 then
		-- kill player
		SelectEntity(LocalPlayerLabId(), 0)
		DoDestroy()
	end

	if CHEATS_AUTO_FAST_SPEED == 1 then
		SetFastSpeed(1)
	end

end

--
on_playerwin = function()

	-- announce game mode (only has effects in MP games)
	Announce( "gametype_announce.win", 0.5 )

end

--
on_playerlose = function()

	-- announce game mode (only has effects in MP games)
	Announce( "gametype_announce.lose", 0.5 )

end

_ttcbtimer = function(ttcallback)
	return ttcallback ~= nil and ttcallback ~= "" and ttcallback or "do_timer_update"
end

-- NUMTOTXTID_MIN = 0
-- NUMTOTXTID_MAX = 1000
-- NUMTOTXTID_START = 61000
-- numtotxtid = function(number, max, min)
-- 	max = (max == nil and NUMTOTXTID_MAX) or (max < NUMTOTXTID_MIN and NUMTOTXTID_MIN) or (max > NUMTOTXTID_MAX and NUMTOTXTID_MAX) or max
-- 	min = (min == nil and NUMTOTXTID_MIN) or (min < NUMTOTXTID_MIN and NUMTOTXTID_MIN) or (min > NUMTOTXTID_MAX and NUMTOTXTID_MAX) or min
-- 	return NUMTOTXTID_START - NUMTOTXTID_MIN + floor((number < min and min) or (number > max and max) or number)
-- end

_numtotxtid_data = {
	--- [start] = {start, stop, step, start_id}
	-- [-3] = {-1e4, -1e5+1, -1e3, 63090},
	-- [-2] = {-1e3, -1e4+1, -1e2, 63000},
	-- [-1] = {-000, -1e3+1, -1e0, 61000},
	[1] = {000, 1e3-1, 1e0, 61000},
	[2] = {1e3, 1e4-1, 1e2, 63000},
	[3] = {1e4, 1e5-1, 1e3, 63090},
}
numtotxtid = function(num, nmax, nmin)
	-- local dbgtxt = "numtotxtid: num: " .. toplain(num) .. ", max: " .. toplain(nmax) .. ", min: " .. toplain(nmin) --DEBUG
	num = min(max(nmin or num, num), nmax or num)

	local absnum = abs(num)
	local plusminus = num >= 0 and 1 or -1
	-- dbgtxt = dbgtxt .. " => abs: " .. absnum .. "\n" --DEBUG

	local item
	local index = plusminus
	local iitem = _numtotxtid_data[index]
	while iitem do
		item = iitem
		if abs(iitem[2]) >= absnum then
			-- dbgtxt = dbgtxt .. "break (" .. index .. "): " .. abs(iitem[2]) .. " >= " .. absnum .. "\n" --DEBUG
			break
		end

		index = index + plusminus
		iitem = _numtotxtid_data[index]
	end

	-- dbgtxt = dbgtxt .. "item (" .. index .. "): " .. toplain(item) .. "\n" --DEBUG

	if not item then
		-- dbgtxt = dbgtxt .. "ERROR: no item" .. "\n" --DEBUG
		-- print(dbgtxt) --DEBUG
		return TXT_None
	end

	local offset = floor((min(absnum, abs(item[2])) - abs(item[1])) / abs(item[3]))
	-- dbgtxt = dbgtxt .. "result: " .. floor(num) .. " => " .. (abs(item[1]) + abs(item[3]) * offset) * plusminus .. " (" .. item[4] + offset .. ")\n" --DEBUG
	-- print(dbgtxt) --DEBUG

	return item[4] + offset
end

-- override functions

-- modaluibegin = function(callback_click, callback_cancel, mode, command)
-- 	local result = ModalUIBegin(callback_click, callback_cancel, mode, command)
-- 	if result == 0 then
-- 		modalui_callback_click = callback_click
-- 		modalui_callback_cancel = callback_cancel
-- 		modalui_mode = mode
-- 		modalui_command = command
-- 	end
-- 	return result
-- end

-- modaluiend = function()
-- 	ModalUIEnd()
-- 	modalui_callback_click = nil
-- 	modalui_callback_cancel = nil
-- 	modalui_mode = nil
-- 	modalui_command = nil
-- end

-- custom hud functions

BindHudHoverToTimerTick = function(name)
	BindHudToTooltip(name, "do_timer_update", 1, 1)
end

hidehud = function(label)
	BindLabelToTextTimer(label, 0, 0.0000001)
end

BindButtonEnabled = function(button, hotkey, callback, ttcallback, texture, argument)
	BindButton(button, hotkey, callback, _ttcbtimer(ttcallback), texture, argument)
end

-- hud override function

showhud = function(name)
	-- ShowHud(name)
	BindHudHoverToTimerTick(name)
end

bindhotkey = function(hotkey, callback, argument)
	BindHotkey(hotkey, callback, argument)
end

bindhotkeytoevent = function(hotkey)
	BindHotkeyToEvent(hotkey)
end

bindlabeltogametime = function(label)
	BindHudHoverToTimerTick(label)
	BindLabelToGameTime(label)
end

bindlabeltoplayerrenew = function(label, ttcallback, ttargument, player)
	BindLabelToPlayerRenew(label, _ttcbtimer(ttcallback), ttargument, player)
end

bindlabeltoplayergather = function(label, ttcallback, ttargument, player)
	BindLabelToPlayerGather(label, _ttcbtimer(ttcallback), ttargument, player)
end

bindlabeltoplayerpop = function(label, ttcallback, ttargument, player)
	BindLabelToPlayerPop(label, _ttcbtimer(ttcallback), ttargument, player)
end

bindhudtotooltip = function(name, ttcallback, enabled, ttargument)
	BindHudToTooltip(name, _ttcbtimer(ttcallback), enabled, ttargument)
end

bindlabeltoplayername = function(label, player)
	BindHudHoverToTimerTick(label)
	BindLabelToPlayerName(label, player)
end

bindlabeltoplayercolour = function(label, player)
	BindHudHoverToTimerTick(label)
	BindLabelToPlayerColour(label, player)
end

bindlabeltotooltip = function(label, ttcallback)
	BindLabelToTooltip(label, _ttcbtimer(ttcallback))
end

bindlabeltoresearchprogress = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToResearchProgress(label, id)
end

bindlabeltoinresearch = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToInResearch(label, id)
end

bindbuttontoinresearch = function(button, hotkey, callback, ttcallback, id, enable)
	BindButtonToInResearch(button, hotkey, callback, _ttcbtimer(ttcallback), id, enable)
end

bindbartoresearch = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToResearch(statbar, id)
end

bindbartolabdefense = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToLabDefense(statbar, id)
end

bindbuttontolabdefense = function(button, hotkey, callback, ttcallback, texture, arg, id)
	BindButtonToLabDefense(button, hotkey, callback, _ttcbtimer(ttcallback), texture, arg, id)
end

bindbartoradarpulserecharge = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToRadarPulseRecharge(statbar, id)
end

bindbuttontoradarpulse = function(button, hotkey, callback, ttcallback, texture, id)
	BindButtonToRadarPulse(button, hotkey, callback, _ttcbtimer(ttcallback), texture, id)
end

bindlabeltocreatureupgradeprogress = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToCreatureUpgradeProgress(label, id)
end

bindlabeltoincreatureupgrade = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToInCreatureUpgrade(label, id)
end

bindbuttontoincreatureupgrade = function(button, hotkey, callback, ttcallback, id, enabled)
	BindButtonToInCreatureUpgrade(button, hotkey, callback, _ttcbtimer(ttcallback), id, enabled)
end

bindbartocreatureupgrade = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToCreatureUpgrade(statbar, id)
end

bindlabeltoconstructionprogress = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToConstructionProgress(label, id)
end

bindbuttontoinconstruction = function(button, hotkey, callback, ttcallback, id, enabled)
	BindButtonToInConstruction(button, hotkey, callback, _ttcbtimer(ttcallback), id, enabled)
end

bindbartoconstruction = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToConstruction(statbar, id)
end

bindlabeltoinaddon = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToInAddOn(label, id)
end

bindbuttontoinaddon = function(button, hotkey, callback, ttcallback, id, enabled)
	BindButtonToInAddOn(button, hotkey, callback, _ttcbtimer(ttcallback), id, enabled)
end

bindbartoaddon = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToAddOn(statbar, id)
end

bindlabeltoaddon = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToAddOn(label, id)
end

bindbuttontobuildqueue = function(button, hotkey, callback, ttcallback, id, arg, enabled)
	BindButtonToBuildQueue(button, hotkey, callback, _ttcbtimer(ttcallback), id, arg, enabled)
end

bindlabeltobuildqueue = function(label, id, unknown)
	BindHudHoverToTimerTick(label)
	BindLabelToBuildQueue(label, id, unknown)
end

bindlabeltobuildprogress = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToBuildProgress(label, id)
end

bindbartobuildqueue = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToBuildQueue(statbar, id)
end

bindicontocreatureattribute = function(icon, ttcallback, ebpid, uattr)
	BindIconToCreatureAttribute(icon, _ttcbtimer(ttcallback), ebpid, uattr)
end

bindlabeltocreatureattribute = function(label, ttcallback, owner, ebpid, uattr)
	BindLabelToCreatureAttribute(label, _ttcbtimer(ttcallback), owner, ebpid, uattr)
end

bindlabelstocreaturespeed = function(ttcallback, ttcallback2, ttcallback3, ttcallback4, landspeed_label, waterspeed_label, airspeed_label, purewaterspeed_label, owner, ebpid)
	BindLabelsToCreatureSpeed(_ttcbtimer(ttcallback), _ttcbtimer(ttcallback2), _ttcbtimer(ttcallback3), _ttcbtimer(ttcallback4),
		landspeed_label, waterspeed_label, airspeed_label, purewaterspeed_label, owner, ebpid)
end

bindlabeltocreaturerangeattack = function(staticon, label, label2, unitrangeattack_ttcallback , pierce_ttcallback, owner, ebpid, rangeattack)
	BindLabelToCreatureRangeAttack(staticon, label, label2, _ttcbtimer(unitrangeattack_ttcallback) , _ttcbtimer(pierce_ttcallback), owner, ebpid, rangeattack)
end

bindlabeltocreatureability = function(label, ttcallback, ebpid, ability, upgraded)
	BindLabelToCreatureAbility(label, _ttcbtimer(ttcallback), ebpid, ability, upgraded)
end

bindlabeltoebpcostgather = function(label, ebpid)
	BindHudHoverToTimerTick(label)
	BindLabelToEBPCostGather(label, ebpid)
end

bindlabeltoebpcostrenew = function(label, ebpid)
	BindHudHoverToTimerTick(label)
	BindLabelToEBPCostRenew(label, ebpid)
end

bindlabeltoebpname = function(label, ebpid)
	BindHudHoverToTimerTick(label)
	BindLabelToEBPName(label, ebpid)
end

bindlabeltotext = function(label, textid)
	BindHudHoverToTimerTick(label)
	BindLabelToText(label, textid)
end

bindbartoentitytagreload = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToEntityTagReload(statbar, id)
end

bindlabeltorexability = function(label, ttcallback, charabilitytype, textid)
	BindLabelToRexAbility(label, _ttcbtimer(ttcallback), charabilitytype, textid)
end

bindbartosonicboomrecharge = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToSonicBoomRecharge(statbar, id)
end

bindbartoairburstrecharge = function(statbar, id)
	BindHudHoverToTimerTick(statbar)
	BindBarToAirBurstRecharge(statbar, id)
end

bindlabeltotowerrange = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToTowerRange(label, id)
end

bindlabeltotowerdamage = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToTowerDamage(label, id)
end

bindlabeltoresource = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToResource(label, id)
end

bindlabeltoanimalgatherstate = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToAnimalGatherState(label, id)
end

bindbuttontounloadpassenger = function(button, hotkey, callback, ttcallback, id, gyro_id)
	BindButtonToUnloadPassenger(button, hotkey, callback, _ttcbtimer(ttcallback), id, gyro_id)
end

bindbuttontobuildingebp = function(button, hotkey, callback, ttcallback, ebpid)
	BindButtonToBuildingEBP(button, hotkey, callback, _ttcbtimer(ttcallback), ebpid)
end

bindbuttontosonicboom = function(button, hotkey, callback, ttcallback, texture, id)
	BindButtonToSonicBoom(button, hotkey, callback, _ttcbtimer(ttcallback), texture, id)
end

bindbuttontoairburst = function(button, hotkey, callback, ttcallback, texture, id)
	BindButtonToAirBurst(button, hotkey, callback, _ttcbtimer(ttcallback), texture, id)
end

bindbuttontounitebp = function(button, hotkey, callback, ttcallback, id, ebpid)
	BindButtonToUnitEBP(button, hotkey, callback, _ttcbtimer(ttcallback), id, ebpid)
end

bindlabeltohenchmanstate = function(label, id)
	BindHudHoverToTimerTick(label)
	BindLabelToHenchmanState(label, id)
end

bindbuttontohenchmanadvancedbuild = function(button, hotkey, callback, ttcallback, texture, argument)
	BindButtonToHenchmanAdvancedBuild(button, hotkey, callback, _ttcbtimer(ttcallback), texture, argument)
end

bindbuttontohenchmanbuild = function(button, hotkey, callback, ttcallback, texture, argument)
	BindButtonToHenchmanBuild(button, hotkey, callback, _ttcbtimer(ttcallback), texture, argument)
end

bindbuttontotag = function(button, hotkey, callback, ttcallback, texture, id, argument)
	BindButtonToTag(button, hotkey, callback, _ttcbtimer(ttcallback), texture, id, argument)
end

bindbuttontountag = function(button, hotkey, callback, ttcallback, texture, id, argument)
	BindButtonToUnTag(button, hotkey, callback, _ttcbtimer(ttcallback), texture, id, argument)
end

bindbuttontoairlift = function(button, hotkey, callback, ttcallback, texture, id, argument)
	BindButtonToAirlift(button, hotkey, callback, _ttcbtimer(ttcallback), texture, id, argument)
end

bindbuttontounload = function(button, hotkey, callback, ttcallback, texture, id, argument)
	BindButtonToUnload(button, hotkey, callback, _ttcbtimer(ttcallback), texture, id, argument)
end

bindbuttondisabled = function(button, hotkey, callback, ttcallback, texture, argument)
	BindButtonDisabled(button, hotkey, callback, _ttcbtimer(ttcallback), texture, argument)
end

bindbuttontotriggeredability = function(button, hotkey, callback, ttcallback, texture, argument, index_special)
	BindButtonToTriggeredAbility(button, hotkey, callback, _ttcbtimer(ttcallback), texture, argument, index_special)
end

bindbuttontotriggeredatk = function(button, hotkey, callback, ttcallback, texture, argument, index_modal_special)
	BindButtonToTriggeredAtk(button, hotkey, callback, _ttcbtimer(ttcallback), texture, argument, index_modal_special)
end

bindbuttontoattackground = function(button, hotkey, callback, ttcallback, texture, argument, index_modal_special)
	BindButtonToAttackGround(button, hotkey, callback, _ttcbtimer(ttcallback), texture, argument)
end

bindbuttontocreaturestance = function(button, hotkey, callback, ttcallback, texture, argument, stance)
	BindButtonToCreatureStance(button, hotkey, callback, _ttcbtimer(ttcallback), texture, argument, stance)
end

bindbuttontoresourceconversion = function(button, hotkey, callback, ttcallback, texture, argument)
	BindButtonToResourceConversion(button, hotkey, callback, _ttcbtimer(ttcallback), texture, argument)
end

bindbuttontoupgradeebp = function(label, icon, complete, hotkey, callback, ttcallback, id, unit)
	BindButtonToUpgradeEBP(label, icon, complete, hotkey, callback, _ttcbtimer(ttcallback), id, unit)
end

bindlabeltotexttimer = function(label, textid, time)
	BindHudHoverToTimerTick(label)
	BindLabelToTextTimer(label, textid, time)
end

bindbuttontoaddon = function(button, hotkey, callback, ttcallback, id, addonid)
	BindButtonToAddOn(button, hotkey, callback, _ttcbtimer(ttcallback), id, addonid)
end

bindbuttontoresearch = function(button, hotkey, callback, ttcallback, id, researchid)
	BindButtonToResearch(button, hotkey, callback, _ttcbtimer(ttcallback), id, researchid)
end

bindbuttontocreatureupgrade = function(button, hotkey, callback, ttcallback, id, ebpnetid, upgradeid)
	BindButtonToCreatureUpgrade(button, hotkey, callback, _ttcbtimer(ttcallback), id, ebpnetid, upgradeid)
end

bindlabeltoentityname = function(label, id, ttcallback, ttargument)
	BindLabelToEntityName(label, id, _ttcbtimer(ttcallback), ttargument)
end

bindlabeltoentityhealth = function(label, id, ttcallback, ttargument)
	BindLabelToEntityHealth(label, id, _ttcbtimer(ttcallback), ttargument)
end

bindimagetoentityicon = function(icon, id, ttcallback, ttargument)
	BindImageToEntityIcon(icon, id, _ttcbtimer(ttcallback), ttargument)
end

bindlabeltoentitydamage = function(label, id, ttcallback, ttargument)
	BindLabelToEntityDamage(label, id, _ttcbtimer(ttcallback), ttargument)
end

bindbartoentityhealth = function(statbar, id, ttcallback, ttargument)
	BindBarToEntityHealth(statbar, id, _ttcbtimer(ttcallback), ttargument)
end

bindbartoentityendurance = function(statbar, id, ttcallback, ttargument)
	BindBarToEntityEndurance(statbar, id, _ttcbtimer(ttcallback), ttargument)
end

bindbutton = function(button, hotkey, callback, ttcallback, texture, ttargument)
	BindButton(button, hotkey, callback, _ttcbtimer(ttcallback), texture, ttargument)
end

bindbuttontoarmybuilder = function(button, hotkey, callback, ttcallback, icon, ttargument)
	BindButtonToArmyBuilder(button, hotkey, callback, _ttcbtimer(ttcallback), icon, ttargument)
end

bindbuttontoobjectives = function(button, hotkey, callback, ttcallback, enabled, ttargument)
	BindButtonToObjectives(button, hotkey, callback, _ttcbtimer(ttcallback), enabled, ttargument)
end

bindbuttontochat = function(button, hotkey, callback, ttcallback)
	BindButtonToChat(button, hotkey, callback, _ttcbtimer(ttcallback))
end

bindbuttontogroup = function(button, hotkey, callback, ttcallback, group_number)
	BindButtonToGroup(button, hotkey, callback, _ttcbtimer(ttcallback), group_number)
end

-- stubs to dump the default parameter
selectallunitsonscreen = function()
	SelectAllUnitsOnScreen()

	-- the function falsely selects all entities on screen, so filter non-units
	local count = SelectionCount()
	for i = 1, count do
		local id = SelectionId(count - i)
		if is_unit_ec(EntityType(id)) == 0 then
			DeSelectEntity(id, 0)
		end
	end
end

selectallhenchmenonscreen = function()
	SelectAllHenchmenOnScreen()
end

selectallhenchmeninworld = function()
	SelectAllHenchmenInWorld()
end

selectnextidlehenchman = function()
	SelectNextIdleHenchman()
end

selectallidlehenchman = function()
	SelectAllIdleHenchman()
end

selectallcombatunitsonscreen = function()
	SelectAllCombatUnitsOnScreen()
end

selectallcombatunitsinworld = function()
	SelectAllCombatUnitsInWorld()
end

selectallgroundcombatunitsonscreen = function()
	SelectAllGroundCombatUnitsOnScreen()
end

selectallgroundcombatunitsinworld = function()
	SelectAllGroundCombatUnitsInWorld()
end

selectallaircombatunitsonscreen = function()
	SelectAllAirCombatUnitsOnScreen()
end

selectallaircombatunitsinworld = function()
	SelectAllAirCombatUnitsInWorld()
end

selectallwatercombatunitsonscreen = function()
	SelectAllWaterCombatUnitsOnScreen()
end

selectallwatercombatunitsinworld = function()
	SelectAllWaterCombatUnitsInWorld()
end

selectallmeleecombatunitsonscreen = function()
	SelectAllGroundCombatUnitsOnScreen()
	deselect_all_ranged_units()
end

selectallmeleecombatunitsinworld = function()
	SelectAllGroundCombatUnitsInWorld()
	deselect_all_ranged_units()
end

selectallrangedcombatunitsonscreen = function()
	SelectAllGroundCombatUnitsOnScreen()
	deselect_all_melee_units()
end

selectallrangedcombatunitsinworld = function()
	SelectAllGroundCombatUnitsInWorld()
	deselect_all_melee_units()
end

selectnextgroundcombiner = function()
	SelectNextGroundCombiner()
end

selectnextwatercombiner = function()
	SelectNextWaterCombiner()
end

selectnextaircombiner = function()
	SelectNextAirCombiner()
end

selectnextcombiner = function()
	if _selectnextcombiner_cycle_id ~= 0 and _selectnextcombiner_cycle_id == Cycle.instance_id() then
		Cycle.next()
		return
	end

	Entities.cycle_types({RemoteChamber_EC, WaterChamber_EC, Aviary_EC})

	local cycle_id = Cycle.instance_id()
	_selectnextcombiner_cycle_id = cycle_id ~= 0 and cycle_id or nil
end

selectnextfoundry = function()
	FocusOnEntity(Entities.cycle_type(Foundry_EC, _doresearch_cmp), 0, 1)
end

selectnextvetclinic = function()
	Entities.cycle_type(VetClinic_EC, _doresearch_cmp)
end

selectnextgeneticamplifier = function()
	Entities.cycle_type(GeneticAmplifier_EC, _docreatureupgrade_cmp)
end

selectnextelectricgenerator = function()
	Entities.cycle_type(ElectricGenerator_EC, _doaddon_cmp)
end

selectlab = function()
	SelectLab()
end

selectrex = function()
	SelectRex()
end

selectlucy = function()
	SelectLucy()
end

nextsubselect = function()
	if Entities.is_player_dead(LocalPlayer()) == 1 or (CHEATS_OBSERVER_UI == 1 and IsSelectSimilarPressed() == 1) then
		infocenterobserverutilities_turn_page(IsSelectSimilarPressed() == 1 and -1 or 1)
		return
	end

	-- Use native function for empty selection and non-structures.
	if Selection.count() == 0 or is_structure_ec(EntityType(SelectionId(0))) == 0 then
		SelectNextSubSelect()
		return
	end

	-- Continue Cycle if not using subselect.
	if Subselect.count() == 0 and Cycle.validate() == 1 then
		Cycle.next()
		return
	end

	Subselect.update()
end


--------------------------------------------------------------

dofilepath("data:sigma/taskbar_mod.lua")
