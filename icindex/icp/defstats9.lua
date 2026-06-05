-- aviary

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")

-- extend gameattributes table
ext = gameattributes;

-- spawnerextinfo
ext.spawnswimmer = 0
ext.spawnground = 0
ext.spawnflyer = 1
ext.spawngatherer = 0

-- healthextinfo
ext.hitpoints = 1500

-- costextinfo
ext.cost = 275
ext.costrenew = 50
ext.constructionticks = 320

-- siteextinfo
ext.orientation = 1


