-- waterchamber 8

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")

-- extend gameattributes table
ext = gameattributes;

-- dynamics
ext.simcollides = 1

-- spawnerextinfo
ext.spawnswimmer = 1
ext.spawnground = 0
ext.spawnflyer = 0
ext.spawngatherer = 0

-- healthextinfo
ext.hitpoints = 1500

-- costextinfo
ext.cost = 200
ext.costrenew = 0
ext.constructionticks = 240

-- siteextinfo
ext.is_land = 0
ext.is_water = 1
ext.is_shoreline = 0
ext.showSiteDecal = 0
ext.snapHeightMap = 0
ext.snapSurface = 1

-- siteextinfo
ext.orientation = 3

ext.stayInPathfindingAfterDead = 0