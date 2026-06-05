-- soundbeam tower 19

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")

-- extend gameattributes table
ext = gameattributes;

-- costextinfo
ext.cost = 300
ext.costrenew = 25
ext.constructionticks = 280

-- soundbeam ext info
ext.delayTicks = 8	-- delay between shots 8ticks = 1sec
ext.attackDmg = 8		-- dmg to every one in beam
ext.flyerDmgMult = 0.5	-- dmg to flyers = attackDmg * flyerDmgMult

-- sightextinfo
ext.sight_radius1 = 35
ext.keen_sense = 1

-- towerburstextinfo
ext.burstRechargeTicks	= 400
ext.burstRadius			= 27.0
ext.burstDamage			= 250.0
ext.burstDmgAirMult		= 0.5
ext.burstDmgGroundMult	= 1.0
ext.burstCostRenew		= 1000
ext.burstCostGather		= 0

-- not used anymore
ext.attackRadius = 27	-- distance at which it can shoot at
ext.coneAngle = 75	-- angle of attack cone

ext.stayInPathfindingAfterDead = 0

-- allows off-screen towers to properly point their effects
ext.update_bones_when_invisible = 1

-- infestationextinfo
ext.dmg_infestation_multiplier = 0.2
-- end of file