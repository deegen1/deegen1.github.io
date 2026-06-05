-- lightning rod 6

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")
dofilepath("data:attr_parameters.lua")

ext = gameattributes;

-- costextinfo
ext.cost = 150
ext.constructionticks = 240

-- resrenewextinfo
ext.degrade = 1
	
	-- how much elec does each rod give player
	ext.resgrowth0 = ((AttrParameters.six_rods==1) and 1.5 or 2)
	ext.resgrowth1 = ((AttrParameters.six_rods==1) and 3 or 4)
	ext.resgrowth2 = ((AttrParameters.six_rods==1) and 4.5 or 6)
	ext.resgrowth3 = ((AttrParameters.six_rods==1) and 6 or 8)
	
	-- !!! rod limit has been move to prerequisites.lua !!!

	-- after four rods how much does each give a player
	ext.resPerRodAfterCap = 1.5

-- healthextinfo
ext.hitpoints = 500

-- siteextinfo
ext.orientation = 1

ext.stayInPathfindingAfterDead = 0
