--------------------------------------------------------------
-- extended rules
--------------------------------------------------------------

-- imports

dofilepath("data:gametypes/zutils_gametypes.lua")
dofilepath("data:gametypes/hero_spawner.lua")


--------------------------------------------------------------

-- initialize game rules for new games
function ext_initrules()
end

-- initialize non-loadable game rules for new and loaded games
function ext_loadrules()
end

-- game rules
function ext_dorules()
end


--------------------------------------------------------------

dofilepath("data:gametypes/extrules_mod.lua")
