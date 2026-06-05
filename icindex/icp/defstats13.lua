-- bramble fence

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")

-- extend gameattributes table
ext = gameattributes;

-- healthextinfo
ext.hitpoints = 250
ext.regen = 1

-- costextinfo
ext.cost = 5
ext.costrenew = 1
ext.constructionticks = 6

-- fenceextinfo
ext.growthTicks = 1
ext.damageBack = 2

ext.sight_radius1 = 10

