-- lab 5

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")

-- extend gameattributes table
ext = gameattributes;

-- spawnerextinfo
ext.spawnswimmer = 0
ext.spawnground = 0
ext.spawnflyer = 0
ext.spawngatherer = 1

-- storagerenewextinfo
ext.renewstorage = 500

-- healthextinfo
ext.hitpoints = 6000

-- costextinfo
ext.cost = 1000
ext.constructionticks = 550

-- resrenewextinfo
ext.resgrowth = 0.5

-- sightextinfo
ext.sight_radius1 = 40

-- siteextinfo
ext.showSiteDecal = 0

-- radarpulseextinfo
ext.radarPulse_durationTicks = 80
ext.radarPulse_rechargeTicks = 960
ext.radarPulse_costRenew = 1000
ext.radarPulse_costGather = 0

ext.stayInPathfindingAfterDead = 0

-- infestationextinfo
ext.dmg_infestation_multiplier = 1.3

-- structure defense ext info
--
-- cost of activation
ext.renewCost = 200.0

-- electricity drainingRate per tick
ext.drainRate = 2.50

-- amount of damage reduced to
ext.damageMin = 1.0

-- number of game ticks to fill the whole temperature bar
ext.barFillTicks = 2000

-- number of game ticks to drain the whole temperature bar
ext.barDrainTicks = 2800

-- percentage lower bound of warning status (orange colour)
ext.barWarning = 0.6

-- percentage lower bound of critical status (red colour)
ext.barCritical = 0.8

-- percentage upper bound to relief critical cool down back to normal operation
ext.barCoolDown = 0.4