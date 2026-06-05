-- antiairtower

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")

-- extend gameattributes table
ext = gameattributes;

-- healthextinfo
ext.hitpoints = 850

-- costextinfo
ext.cost = 200
ext.costrenew = 75
ext.constructionticks = 224

-- sightextinfo
ext.sight_radius1 = 35
ext.keen_sense = 1

-- towerburstextinfo
ext.burstRechargeTicks	= 400
ext.burstRadius			= 25.0
ext.burstDamage			= 250.0
ext.burstDmgAirMult		= 1.0
ext.burstDmgGroundMult	= 0.0
ext.burstCostRenew		= 1000
ext.burstCostGather		= 0

-- antiairtowerextinfo
ext.delayTicks = 4
ext.attackDmgType = 8+4092 -- electric + full armour piercing
ext.attackDmgPerTick = 15
ext.attackDuration = 1
ext.attackRadius = 30.0
ext.activateTime = 0.4
ext.damageRadius = 6.0
ext.upgradeDmgPerTickMult = 1.5
ext.upgradeDmgDurationMult = 1.0
ext.upgradeDmgRadiusMult = 1.25

-- infestationextinfo
ext.dmg_infestation_multiplier = 1.0

-- end of file