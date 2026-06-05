-- electrical generator

-- inherit from building data
dofilepath("data:art/ebps/defbuilding.lua")

-- extend gameattributes table
ext = gameattributes;

-- healthextinfo
ext.hitpoints = 750

-- costextinfo
ext.cost = 200
ext.costrenew = 50
ext.constructionticks = 320

-- resrenewextinfo
ext.degrade = 0
ext.resgrowth0 = 3

-- geyser ext info for its addons (this is the total produced after each addon)
ext.addon_resgrowth1 = 5
ext.addon_resgrowth2 = 7
ext.addon_resgrowth3 = 9

-- siteextinfo - attach to geyser controller type
ext.attachTo = 29
ext.snapHeightMap = 0
ext.snapSurface = 1

ext.stayInPathfindingAfterDead = 0