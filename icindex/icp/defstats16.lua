-- vet clinic

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")

-- extend gameattributes table
ext = gameattributes;

-- healthextinfo
ext.hitpoints = 2000

-- costextinfo
ext.cost = 200
ext.costrenew = 0
ext.constructionticks = 240