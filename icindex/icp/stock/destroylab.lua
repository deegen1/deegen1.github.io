--------------------------------------------------------------
-- destroy enemy labs
--------------------------------------------------------------

-- imports

dofilepath("Data:GameTypes/gameover.lua")
dofilepath("Data:GameTypes/objective.lua")
dofilepath("Data:GameTypes/util.lua")
dofilepath("Data:GameTypes/announce.lua")
dofilepath("Data:defcharacters.lua")

dofilepath("data:gametypes/zutils_gametypes.lua")
dofilepath("data:gametypes/extrules.lua")


--------------------------------------------------------------
-- announed gamemode data
gametype_announce = {}

-- game-start announcement data
gametype_announce.start = clone(announceTab)
	gametype_announce.start.mp = {
		-- intro messages for MP games
		{"Data:audio/Speech/AllMissions/MALGM04REX01.PAT", 40650, CI_REX, 0},
		{"Data:audio/Speech/AllMissions/MALGM04REX02.PAT", 40651, CI_REX, 0},
		{"Data:audio/Speech/AllMissions/MALGM04REX03.PAT", 40652, CI_REX, 0},
		{"Data:audio/Speech/AllMissions/MALGM04REX04.PAT", 40653, CI_REX, 0},
	}
	gametype_announce.start.pvcpu.taunt_1 = {
		-- taunt messages for player vs. CPU with un-allied enemies
		{"Data:audio/Speech/AllMissions/VSHCHTNT01A.PAT", 40655, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHCHTNT02A.PAT", 40656, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHCHTNT03A.PAT", 40657, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHCHTNT04A.PAT", 40658, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchTnt05a.pat", 40659, CI_HENCHMAN, 0},
	}
	gametype_announce.start.pvcpu.taunt_many = {
		-- taunt messages for player vs. CPU with 2 or more enemies allied together
		{"Data:audio/Speech/AllMissions/VSHchTnt06a.pat", 40660, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchTnt07a.pat", 40661, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchTnt08a.pat", 40662, CI_HENCHMAN, 0},
	}
	gametype_announce.start.pvcpu.support = {
		-- support messages for player vs. CPU with 1 or more AI allied with player
		{"Data:audio/Speech/AllMissions/MALGM04Rex05.pat", 40665, CI_REX, 0},
		{"Data:audio/Speech/AllMissions/MALGM04Rex06.pat", 40666, CI_REX, 0},
		{"Data:audio/Speech/AllMissions/MALGM04Rex07.pat", 40667, CI_REX, 0},
	}

-- game-end-win announcement data
gametype_announce.win = clone(announceTab)
	gametype_announce.win.mp = {
		-- intro messages for MP games
	}
	gametype_announce.win.pvcpu.taunt_1 = {
		-- taunt messages for player vs. CPU with un-allied enemies
		{"Data:audio/Speech/AllMissions/VSHchWin01a.pat", 40670, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchWin02a.pat", 40671, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchWin03a.pat", 40672, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchWin04a.pat", 40673, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchWin05a.pat", 40674, CI_HENCHMAN, 0},
	}
	gametype_announce.win.pvcpu.taunt_many = {
		-- taunt messages for player vs. CPU with 2 or more enemies allied together
		{"Data:audio/Speech/AllMissions/VSHchWin06a.pat", 40675, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchWin07a.pat", 40676, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchWin07a.pat", 40677, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchWin09a.pat", 40678, CI_HENCHMAN, 0},
	}
	gametype_announce.win.pvcpu.support = {
		-- support messages for player vs. CPU with 1 or more AI allied with player
		{"Data:audio/Speech/AllMissions/MALGM04Rex08.pat", 40680, CI_REX, 0},
		{"Data:audio/Speech/AllMissions/MALGM04Rex09.pat", 40681, CI_REX, 0},
		{"Data:audio/Speech/AllMissions/MALGM04Rex10.pat", 40682, CI_REX, 0},
	}

-- game-end-lose announcement data
gametype_announce.lose = clone(announceTab)
	gametype_announce.lose.mp = {
		-- intro messages for MP games
	}
	gametype_announce.lose.pvcpu.taunt_1 = {
		-- taunt messages for player vs. CPU with un-allied enemies
		{"Data:audio/Speech/AllMissions/VSHchLos01a.pat", 40685, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchLos02a.pat", 40686, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchLos03a.pat", 40687, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchLos04a.pat", 40688, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchLos05a.pat", 40689, CI_HENCHMAN, 0},
	}
	gametype_announce.lose.pvcpu.taunt_many = {
		-- taunt messages for player vs. CPU with 2 or more enemies allied together
		{"Data:audio/Speech/AllMissions/VSHchLos06a.pat", 40690, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchLos07a.pat", 40691, CI_HENCHMAN, 0},
		{"Data:audio/Speech/AllMissions/VSHchLos08a.pat", 40692, CI_HENCHMAN, 0},
	}
	gametype_announce.lose.pvcpu.support = {
		-- support messages for player vs. CPU with 1 or more AI allied with player
		{"Data:audio/Speech/AllMissions/MALGM04Rex11.pat", 40695, CI_REX, 0},
		{"Data:audio/Speech/AllMissions/MALGM04Rex12.pat", 40696, CI_REX, 0},
		{"Data:audio/Speech/AllMissions/MALGM04Rex13.pat", 40697, CI_REX, 0},
	}


--------------------------------------------------------------

-- retrieve the UI name of this game type
function gametype_getname()
	-- to be replaced with localized string reference
	return "Destroy Enemy Labs"
end

-- initialize world for new games
function gametype_initrules()
	-- set game objective
	objective_set(40600)

	ext_initrules()
end

-- game rules
function gametype_dorules()
	if _gametype_loadinit ~= 1 then
		_gametype_loadinit = 1

		set_far_clip_distance()

		ext_loadrules()
	end

	check_dead()

	ext_dorules()

	-- Timer.set(world_getticks())

	-- check for game over condition
	if isgameover() == 1 then
		world_setgameover()
	end
end

function check_dead()
	-- check for dead players, this is checking for when the player has no lab
	for i = 0, world_getplayercount() - 1 do
		-- get player from world
		local playerId = world_getplayerat(i)
		-- tell the script what player we are going to ask questions about
		player_set(playerId)
		-- get the lab entities
		labgroup = player_getgroup(Lab_EC)
		-- if player has no lab then they are dead, check to see if this group is empty
		if eg_size(labgroup) == 0 then
			-- if no lab then kill this player
			player_kill()
		end
	end
end

set_far_clip_distance = function()
	trigger_folder("__gametype")
	local t = trigger_new("set_far_clip_distance")
	-- conditions
	local c = texpression_new("Always")
	trigger_addexpression(t, c)
	-- actions
	local a = texpression_new("Far-clip distance, set")
	texpression_setarg(a, 1, 1150000000) -- Highest value found in *.trg files: 1140457472
	trigger_addexpression(t, a)
end


--------------------------------------------------------------

dofilepath("data:gametypes/destroylab_mod.lua")
