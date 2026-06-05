-- remote chamber 7

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")

ext = gameattributes;

-- spawnerextinfo
ext.spawnswimmer = 0
ext.spawnground = 1
ext.spawnflyer = 0
ext.spawngatherer = 0

-- healthextinfo
ext.hitpoints = 1500

-- costextinfo
ext.cost = 250
ext.costrenew = 0
ext.constructionticks = 320

-- siteextinfo
ext.orientation = 2

ext.stayInPathfindingAfterDead = 0