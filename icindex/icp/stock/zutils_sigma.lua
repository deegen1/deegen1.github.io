---------------------------------------------------------------------
-- File    : data:sigma/zutils.lua
-- Desc    : Collection of utility functions and objects.
-- Created :
-- Author  : Zitrone47
--

if _zutils_sigma == 1 then
	return
end
_zutils_sigma = 1


---------------------------------------------------------------------
-- Imports

dofilepath("data:zutils.lua")


---------------------------------------------------------------------
-- Entities
-- Provide info about all entities in the game.

Entities = {}

-- Due to how maps work there may be empty spaces between lower IDs.
-- Where they are heavily depends on the map, so different scan stages are needed:
--   1. Scan for everything that is builtin on the map and in the save-game.
--   2. Scan for the first new entity. Repeated until first new entity is produces.
--      There may be empty space between builtin entities and player-produced ones.
--   n. Scan for further new entities.
Entities.FIRST_SCAN_MAX_EMPTY = 100000
Entities.SECOND_SCAN_MAX_EMPTY = 2000
Entities.SCAN_MAX_EMPTY = 75

Entities._players = {keys = {}, values = {}}
Entities._context = {}

Entities._callbacks = {}
Entities._callback_keys = {}
Entities._cb_list_alive = {}
Entities._cb_list_dead = {}

Entities._scans = 0
Entities._successful_scans = 0
Entities._scan_next_id = 0

--
-- Scan for entity ids and remove destoryed ones.
--
Entities.scan = function()
	-- local dbgtxt = "" --DEBUG

	-- Remove invalid entities.
	-- local died_sum = 0 --DEBUG
	local players = Entities._players
	local count = getn(players.keys)
	for i = 1, count do
		local player_id = players.keys[count - i + 1]
		local player = Entities._players.values[player_id]

		local died = Entities._clear_dead(player)
		player.entities_alive = player.entities_alive - died
		player.entities_dead = player.entities_dead + died

		-- died_sum = died_sum + died --DEBUG

		-- Remove player from list if dead in first scan stage.
		if player.entities_alive <= 0 and is_observer(player_id) == 1 then
			tremove(players.keys, count - i + 1)
			players.values[player_id] = nil
		end
	end
	-- dbgtxt = dbgtxt .. "scan died: " .. died_sum --DEBUG

	local start = Entities._scan_next_id
	local id = start
	local nil_since_id = start - 1
	local scan_max_empty = Entities._get_scan_max_empty()

	-- Add local player on first scan.
	-- if Entities._scan_next_id == 0 and LocalPlayer() ~= 0 then
	-- 	Entities._get_player(LocalPlayer())
	-- end

	-- dbgtxt = dbgtxt .. ", scan add:" --DEBUG
	-- local categories = {U=0, S=0, N=0, M=0, X=0} --DEBUG
	-- local last_category, last_category_id --DEBUG

	-- Scan for new entities.
	while id < 1000000 do
		local player_id = EntityOwner(id)
		player_id = player_id ~= 0 and player_id or -1
		local type = EntityType(id)
		local ebpid = EntityEBP(id)

		-- local category = ((type == 0 and "X") --DEBUG
			-- or (is_unit_ec(type) == 1 and "U") --DEBUG
			-- or (is_structure_ec(type) == 1 and "S") --DEBUG
			-- or (is_nature_ec(type) == 1 and "N") --DEBUG
			-- or "M") --DEBUG
		-- categories[category] = categories[category] + 1 --DEBUG

		-- if category ~= last_category then --DEBUG
			-- if last_category ~= nil then --DEBUG
				-- dbgtxt = dbgtxt .. " " .. last_category .. (id - last_category_id) --DEBUG
			-- end --DEBUG
			-- last_category = category --DEBUG
			-- last_category_id = id --DEBUG
		-- end --DEBUG

		if type ~= 0 and ebpid ~= 0 then
			local player = Entities._get_player(player_id, player_id ~= -1 and 1 or 0)
			local list = Entities._get_entity_list(player, type, ebpid)
			local entity = Entities._new_entity(id, type, ebpid, player_id)

			list[getn(list) + 1] = entity
			player.entities_alive = player.entities_alive + 1
			Entities._cb_list_alive[getn(Entities._cb_list_alive) + 1] = entity
			Entities._context[id] = {}

			nil_since_id = id
		end

		if id - nil_since_id >= scan_max_empty then
			break
		end
		id = id + 1
	end

	-- if last_category ~= nil then --DEBUG
		-- dbgtxt = dbgtxt .. " " .. last_category .. (id - last_category_id + 1) --DEBUG
	-- end --DEBUG
	-- dbgtxt = (dbgtxt .. " = U" .. categories["U"] --DEBUG
		-- .. " S" .. categories["S"] .. " N" .. categories["N"] --DEBUG
		-- .. " M" .. categories["M"] .. " X" .. categories["X"]) --DEBUG

	if start < nil_since_id + 1 then
		Entities._successful_scans = Entities._successful_scans + 1
	end

	Entities._scans = Entities._scans + 1
	Entities._scan_next_id = nil_since_id + 1

	-- dbgtxt = ("scan: " .. Entities._scans - 1 --DEBUG
		-- .. ", start: " .. start .. ", next: " .. Entities._scan_next_id --DEBUG
		-- .. ", max empty: " .. scan_max_empty .. "\n" .. dbgtxt) --DEBUG
	-- print(dbgtxt) --DEBUG

	-- Call callbacks
	local cb_list_alive = Entities._cb_list_alive
	local cb_list_dead = Entities._cb_list_dead
	if getn(cb_list_alive) + getn(cb_list_dead) > 0 then
		Entities._cb_list_alive = {}
		Entities._cb_list_dead = {}

		local callbacks = Entities._callbacks
		local keys = Entities._callback_keys
		for i = 1, getn(keys) do
			local item = callbacks[keys[i] or 0]
			if item ~= nil then
				Entities._call_callback(item.callback, cb_list_alive, cb_list_dead, item.args)
			end
		end
	end
end

--
-- Get the total number of scans done.
--
-- return: Number of scane.
Entities.scans = function()
	return Entities._scans
end

--
-- Get the current scanning stage.
--
-- return: Current scanning stage.
Entities.scan_stage = function()
	return ((Entities._successful_scans == 0 and 0)
		or (Entities._successful_scans == 1 and 1)
		or 2)
end

Entities._get_scan_max_empty = function()
	local scan_stage = Entities.scan_stage()
	return ((scan_stage == 0 and Entities.FIRST_SCAN_MAX_EMPTY)
		or (scan_stage == 1 and Entities.SECOND_SCAN_MAX_EMPTY)
		or Entities.SCAN_MAX_EMPTY)
end

--
-- Get number of entity ids with given ebpid for given player.
--
-- return: entity id
Entities.count = function(player_id, ebpid)
	if player_id == nil then
		return getn(Entities._players.keys)
	end

	local player = Entities._players.values[player_id]
	if player == nil then
		return 0
	end
	if ebpid == nil then
		return getn(player.entities.keys)
	end

	local list = player.entities.values[ebpid]
	if list == nil then
		return 0
	end
	return getn(list)
end

--
-- Get entity id at given index for given ebpid and player.
--
-- return: entity id
Entities.get = function(index, player_id, ebpid)
	if player_id == nil then
		return Entities._players.keys[index] or 0
	end

	local player = Entities._players.values[player_id]
	if player == nil then
		return 0
	end
	if ebpid == nil then
		return player.entities.keys[index] or 0
	end

	local list = player.entities.values[ebpid]
	if list == nil then
		return 0
	end
	local entity = list[index]
	return entity ~= nil and entity.id or 0
end

--
-- Get number of ebpids of given type for given player.
--
-- return: Number of ebpids.
Entities.count_ebpids = function(player_id, type)
	local player = Entities._players.values[player_id or 0]
	if player == nil then
		return 0
	end

	local omap = player.types[type]
	return omap ~= nil and getn(omap.keys) or 0
end

--
-- Get ebpid at given index for given type and player.
--
-- return: ebpid
Entities.get_ebpid = function(index, player_id, type)
	local player = Entities._players.values[player_id or 0]
	if player == nil then
		return 0
	end

	local omap = player.types[type]
	return omap ~= nil and omap.keys[index] or 0
end

--
-- Get the lab id for the given player.
--
-- Lab id.
Entities.get_lab_id = function(player_id)
	local player = Entities._players.values[player_id or 0]
	if player == nil then
		return 0
	end

	local omap = player.types[Lab_EC]
	if omap == nil then
		return 0
	end

	local list = omap.values[omap.keys[1] or 0]
	if list == nil then
		return 0
	end

	local entity = list[1]
	return entity ~= nil and entity.id or 0
end

--
-- Get number of alive entities or players.
--
-- Number of alive entities.
Entities.entities_alive = function(player_id, ebpid)
	if player_id == nil then
		local count = 0
		for i = 1, getn(Entities._players.keys) do
			player_id = Entities._players.keys[i]
			local player = Entities._players.values[player_id]
			if player ~= nil and player.entities_alive ~= 0 then
				count = count + 1
			end
		end
		return count
	end

	local player = Entities._players.values[player_id]
	if player == nil then
		return 0
	end
	if ebpid == nil then
		return player.entities_alive
	end

	local list = player.entities.values[ebpid]
	if list == nil then
		return 0
	end
	return getn(list)
end

--
-- Get number of dead entities or players.
--
-- Number of dead entities.
Entities.entities_dead = function(player_id, ebpid)
	if player_id == nil then
		local count = 0
		for i = 1, getn(Entities._players.keys) do
			player_id = Entities._players.keys[i]
			local player = Entities._players.values[player_id]
			if player ~= nil and player.entities_alive == 0 then
				count = count + 1
			end
		end
		return count
	end

	local player = Entities._players.values[player_id]
	if player == nil then
		return 0
	end
	if ebpid == nil then
		return player.entities_dead
	end

	local list = player.entities.values[ebpid]
	if list == nil then
		return 0
	end
	return list.entities_dead
end

--
-- Return whether or not given player is dead (has no alive entities).
--
-- return: 0 = alive, 1 = dead
Entities.is_player_dead = function(player_id)
	local player = Entities._players.values[player_id]
	return (player == nil or player.entities_alive == 0) and 1 or 0
end

--
-- Get the context table of the given id.
-- Context is deleted when it's entity is destroyed.
-- Can be used to store custom data.
--
-- return: Context table.
Entities.context = function(id, default)
	return Entities._context[id] or default
end

--
-- Register or update callback.
--
-- args:
--   name: Unique name of the callback. MUST NOT START WITH "_".
--   callback: Callback function. Should expect lists of spawned and died entities.
--   args: List of additional arguments for the callback function or nil.
--   overwrite: Overwrite callbacks with same name if equals 1. Defaults to 1.
--
Entities.register = function(name, callback, args, overwrite)
	if Entities._callbacks[name] ~= nil then
		if (overwrite or 1) ~= 1 then
			return
		end
	else
		Entities._callback_keys[getn(Entities._callback_keys) + 1] = name
	end

	Entities._callbacks[name] = {
		callback = callback,
		args = args or {},
	}

	-- print("Entities.register: name: " .. name) --DEBUG
end

--
-- Register or update callback. Then call it.
--
Entities.call_register = function(name, callback, args, overwrite)
	Entities.register(name, callback, args, overwrite)
	Entities._call_callback(callback, {}, {}, args)
end

--
-- Unregister callback.
--
Entities.unregister = function(name)
	local callbacks = Entities._callbacks
	local keys = Entities._callback_keys
	for i = 1, getn(keys) do
		local key = keys[i]
		if key == name then
			callbacks[name] = nil
			for j = i, getn(keys) do
				keys[j] = keys[j + 1]
			end
			return 1
		end
	end
	return 0
end

--
-- Check whether or not callback name is registered.
--
Entities.is_registered = function(name)
	return Entities._callback_keys[name] ~= nil and 1 or 0
end

Entities._call_callback = function(callback, alive, dead, args)
	local arglist = {alive, dead}
	for i = 1, getn(args) do
		arglist[getn(arglist) + 1] = args[i]
	end
	call(callback, arglist, "x")
end

--
-- Cycle through all entities of the specified ebpids.
--
-- return: ID of the selected entity or 0.
Entities.cycle_ebpids = function(ebpids, cbcmp)
	local player = Entities._players.values[LocalPlayer()]
	if player == nil then
		return 0
	end

	local list
	local count = getn(ebpids)
	if count == 0 then
		list = {}

	elseif count == 1 then
		list = player.entities.values[ebpids[1] or 0] or {}

	else
		list = {}
		for i = 1, getn(ebpids) do
			local sublist = player.entities.values[ebpids[i] or 0]
			for j = 1, sublist ~= nil and getn(sublist) or 0 do
				local entity = sublist[j]
				if entity ~= nil then
					list[getn(list) + 1] = entity.id
				end
			end
		end
	end

	Cycle.init(list, cbcmp)
	return Cycle.next()
end

--
-- Cycle through all entities of the specified ebpid.
--
-- return: ID of the selected entity or 0.
Entities.cycle_ebpid = function(ebpid, cbcmp)
	return Entities.cycle_ebpids({ebpid}, cbcmp)
end

--
-- Cycle through all entities of the specified types.
--
-- return: ID of the selected entity or 0.
Entities.cycle_types = function(types, cbcmp)
	local player = Entities._players.values[LocalPlayer()]
	if player == nil then
		return 0
	end

	local list
	local count = getn(types)
	if count == 0 then
		list = {}

	else
		list = {}
		for i = 1, getn(types) do
			local omap = player.types[types[i] or 0]
			for j = 1, omap ~= nil and getn(omap.keys) or 0 do
				local sublist = omap.values[omap.keys[j] or 0]
				for k = 1, sublist ~= nil and getn(sublist) or 0 do
					local entity = sublist[k]
					if entity ~= nil then
						list[getn(list) + 1] = entity.id
					end
				end
			end
		end
	end

	Cycle.init(list, cbcmp)
	return Cycle.next()
end

--
-- Cycle through all entities of the specified type.
--
-- return: ID of the selected entity or 0.
Entities.cycle_type = function(type, cbcmp)
	return Entities.cycle_types({type}, cbcmp)
end

Entities._get_player = function(player_id, add_key)
	local player = Entities._players.values[player_id]
	if player == nil  then
		player = Entities._new_player()
		Entities._players.values[player_id] = player
		if (add_key or 1) == 1 then
			list_sort_insert(Entities._players.keys, player_id)
		end
	end
	return player
end

Entities._get_entity_list = function(player, type, ebpid)
	local list = Entities._get_ordered_map_value(player.entities, ebpid, Entities._new_entity_list)
	local omap = Entities._get_map_value(player.types, type, Entities._new_ordered_map)
	return Entities._get_ordered_map_value(omap, ebpid, nil, list)
end

Entities._get_ordered_map_value = function(omap, key, factory, default, add_key)
	local value = omap.values[key]
	if value == nil then
		value = factory ~= nil and factory() or default
		omap.values[key] = value
		if (add_key or 1) == 1 then
			list_sort_insert(omap.keys, key)
		end
	end
	return value
end

Entities._get_map_value = function(map, key, factory, default)
	local value = map[key]
	if value == nil then
		value = factory ~= nil and factory() or default
		map[key] = value
	end
	return value
end

Entities._new_player = function()
	return {
		types = {},
		entities = Entities._new_ordered_map(),
		entities_alive = 0,
		entities_dead = 0,
	}
end

Entities._new_ordered_map = function()
	return {
		keys = {},
		values = {},
	}
end

Entities._new_entity_list = function()
	return {
		entities_dead = 0,
	}
end

Entities._new_entity = function(id, type, ebpid, owner)
	return {
		id = id,
		type = type or EntityType(id),
		ebpid = ebpid or EntityEBP(id),
		owner = owner or EntityOwner(id),
	}
end

--
-- Remove dead entities from list.
--
-- return: Number of died (removed) entities.
Entities._clear_dead = function(player)
	local died = 0

	for i = 1, getn(player.entities.keys) do
		local key = player.entities.keys[i]
		local list = player.entities.values[key]

		local source_index, dest_index = 1, 1
		for j = source_index, getn(list) do
			local entity = list[source_index]
			if EntityType(entity.id) == 0 then
				list.entities_dead = list.entities_dead + 1
				Entities._cb_list_dead[getn(Entities._cb_list_dead) + 1] = entity
				Entities._context[entity.id] = nil
				died = died + 1
			else
				if source_index ~= dest_index then
					list[dest_index] = entity
				end
				dest_index = dest_index + 1
			end
			source_index = source_index + 1
		end

		if source_index ~= dest_index then
			for j = dest_index, getn(list) do
				list[j] = nil
			end
		end
	end

	return died
end


---------------------------------------------------------------------
-- Stats

Stats = {}

Stats.interval = 5
Stats.history = 12

Stats._now = 0
Stats._players = {}

for i = 0, world_getplayercount() - 1 do
	Stats._players[world_getplayerat(i)] = {}
end

Stats.update = function()
	local now = world_gettime()
	if now - Stats._now > Stats.interval then
		for player_id, pstats in Stats._players do
			for name, value in {
				coal = Stats_ScrapGathered(player_id),
				electricity = Stats_ElectricityGathered(player_id),
			} do
				local vstats = pstats[name]
				if not vstats then
					vstats = {persec = 0, value = 0, index = 0, values = {}}
					pstats[name] = vstats
				end

				local count = getn(vstats.values)
				local index = vstats.index
				local first = vstats.values[count < Stats.history and 1 or index] or {0, 0}

				vstats.index = (count + 1 < Stats.history and index + 1) or (index < count and index + 1) or 1
				vstats.values[index] = {now, value}
				vstats.value = value
				vstats.persec = now > 0 and (value - first[2]) / (now - first[1]) or 0
			end
		end

		Stats._now = now
	end
end

Stats._get_stats = function(player_id, stat_name)
	local pstats = Stats._players[player_id]
	return pstats and pstats[stat_name]
end

Stats.get_value = function(player_id, stat_name)
	local stats = Stats._get_stats(player_id, stat_name)
	return stats and stats.value or 0
end

Stats.get_persec = function(player_id, stat_name)
	local stats = Stats._get_stats(player_id, stat_name)
	return stats and stats.persec or 0
end


---------------------------------------------------------------------
-- Selection Manager

Selection = {}

-- Worth of entity types. Used for ordering entities.
Selection.ENTITY_WORTH = {
	[Lab_EC] = 1.0,
	[RemoteChamber_EC] = 0.99,
	[WaterChamber_EC] = 0.98,
	[Aviary_EC] = 0.97,
	[VetClinic_EC] = 0.89,
	[GeneticAmplifier_EC] = 0.88,
	[ElectricGenerator_EC] = 0.85,
	[SoundBeamTower_EC] = 0.79,
	[AntiAirTower_EC] = 0.78,
	[Foundry_EC] = 0.75,
	[LandingPad_EC] = 0.65,
	[BrambleFence_EC] = 0.15,
	[ResourceRenew_EC] = 0.1,

	[Creature_EC] = 0.55,
	[Henchman_EC] = 0.54,
	[Gyrocopter_EC] = 0.535,
	[Rex_EC] = 0.52,
	[Lucy_EC] = 0.52,
}

Selection._instance_id = 0
Selection._list = {}
Selection._raw_list = {}
Selection._ids = {}
Selection._cbcmp = nil

--
-- Get id of the current selection.
--
-- return: ID of the current selection.
Selection.instance_id = function()
	return Selection.count() > 0 and  Selection._instance_id or 0
end

--
-- Initialize or update the selection.
--
-- return: 1 = updated, 0 = unchanged
Selection.update = function(list, cbcmp)
	-- Use native selection if no list provided
	if list == nil then
		list = {}
		for i = 1, SelectionCount() do
			list[i] = SelectionId(i - 1)
		end
	end

	-- Check whether or not it is still the same selection
	local ids = Selection._ids
	local same = cbcmp == Selection._cbcmp and getn(list) == getn(ids) and 1 or 0
	if same == 1 then
		for i = 1, getn(list) do
			if ids[list[i]] == nil then
				same = 0
				break
			end
		end
	end

	if same == 1 then
		return 0
	end

	if cbcmp == nil then
		cbcmp = Selection._cbcmp_default
	end

	local sorted_list = Cycle.sorted(list, cbcmp)

	local ids = {}
	for i = 1, getn(sorted_list) do
		ids[sorted_list[i]] = i
	end

	Selection._instance_id = Selection._instance_id + 1
	Selection._list = sorted_list
	Selection._raw_list = list
	Selection._ids = ids
	Selection._cbcmp = cbcmp
	return 1
end

--
-- Initialize or update the selection using the Cycle object.
--
-- return: 1 = updated, 0 = unchanged
Selection.update_from_cycle = function()
	local cycle_id = Cycle.instance_id()
	if cycle_id == 0 then
		Selection._cycle_id = nil
		return Selection.update()
	elseif cycle_id == Selection._cycle_id then
		return 0
	end

	local list = {}
	for i = 1, Cycle.count() do
		list[i] = Cycle.get(i)
	end

	Selection._cycle_id = cycle_id
	return Selection.update(list)
end

--
-- Clear selection
--
Selection.clear = function()
	Selection._raw_list = {}
	Selection._list = {}
	Selection._ids = {}
	Selection._cycle_id = nil
end


--
-- Get selection size.
--
-- return: Selection size.
Selection.count = function()
	return getn(Selection._raw_list)
end

--
-- Get id at the given index.
--
-- return: ID at the given index.
Selection.get = function(index)
	return Selection._list[index or 0] or 0
end

--
-- Get id at the given index from the raw (unsorted) list.
--
-- return: ID at the given index.
Selection.get_raw = function(index)
	return Selection._raw_list[index or 0] or 0
end

--
-- Get the preferred entity.
--
-- return: ID of the preferred entity.
Selection.preferred = function()
	if Selection._cycle_id == Cycle.instance_id() then
		local id = Cycle.current_id()
		return id ~= 0 and id or Selection._list[1] or 0
	end
	return Selection._list[1] or 0
end

Selection._cbcmp_default = function(id2, id1, context)
	local worth1 = context[1] == nil and Selection._get_worth(id1) or context[1] or 0
	local worth2 = Selection._get_worth(id2)
	if worth1 > worth2 then
		context[1] = worth1
		return Cycle.CMP_FIRST
	end
	context[1] = worth2
	return Cycle.CMP_SECOND
end

Selection._get_worth = function(id)
	local worth = Selection.ENTITY_WORTH[EntityType(id)] or 0
	if EntityInConstruction(id) == 1 then
		worth = worth * 0.001
	elseif EntityInSpawning(id) == 1 then
		worth = worth * (1 + BuildQueueLength(id) * 0.0001)
	elseif EntityInResearch(id) == 1 or EntityInCreatureUpgrade(id) == 1 or EntityInExtension(id) == 1 then
		worth = worth * 0.9998
	-- elseif SonicBoomIsAllowed(id) == 1 or AirBurstIsAllowed(id) == 1 then
	-- 	worth = worth * 1.0001
	end
	return worth
end


---------------------------------------------------------------------
-- Entity Subselect
-- Replacement for the game's SelectNextSubSelect() functionality
-- utilizing Selection object.

Subselect = {}
Subselect._instance_id = 0
Subselect._list = {}
Subselect._done_types = {}
Subselect._index = 1
Subselect._id = 0

--
-- Initialize or update.
--
Subselect.update = function()
	local list, index

	if SelectionCount() ~= 1 or Subselect._id ~= SelectionId(0) then
		-- Initialize
		list = {}
		index = 1

		for i = 1, Selection.count() do
			list[i] = Selection.get(i)
		end

		Subselect._instance_id = Subselect._instance_id + 1

	else
		-- Update
		list = Subselect._list
		index = Subselect._index
	end

	-- Create next sub-list
	local done_types = Subselect._done_types
	local sub_list = {}
	local sub_type = 0
	local sub_list_index = 1
	for i = index, getn(list) do
		local id = list[i]
		local type = EntityType(id)

		if (sub_type == 0 or sub_type == type) and done_types[type] ~= 1 then
			if index == i or sub_type == 0 then
				sub_type = type
				index = i + 1
			end

			sub_list[sub_list_index] = id
			sub_list_index = sub_list_index + 1
		end
	end

	-- Cancel if sub-list is the whole list
	if getn(sub_list) == getn(list) then
		Selection.clear()
		return
	end

	-- Restart. When sub_list is empty, it means we cycled through the whole list
	if getn(sub_list) == 0 then
		sub_list = list
		done_types = {}
		index = 1
	else
		done_types[sub_type] = 1
	end

	Selection.update(sub_list)
	local id = Selection.preferred()
	SelectEntity(id, 0)

	Subselect._list = list
	Subselect._done_types = done_types
	Subselect._index = index
	Subselect._id = id
end

--
-- Get id of the current subselect.
--
-- return: ID of the current subselect.
Subselect.instance_id = function()
	return Subselect.count() > 0 and Subselect._instance_id or 0
end

--
-- Get size of the whole selection.
--
-- return: Size of selection.
Subselect.count = function()
	return getn(Subselect._list)
end

--
-- Clear subselect.
--
Subselect.clear = function()
	Subselect._list = {}
	Subselect._done_types = {}
	Subselect._index = 1
	Subselect._id = 0
end

--
-- Validate selection.
-- Should be called when selection is changed.
--
-- return: 1 = valid, 0 = invalid
Subselect.validate = function()
	if getn(Subselect._list) == 0 then
		return 0
	end

	if SelectionCount() ~= 1 or Subselect._id ~= SelectionId(0) then
		Subselect.clear()
		return 0
	end

	return 1
end


---------------------------------------------------------------------
-- Entity Cycler
-- Cycle through a list of entities.

Cycle = {}

Cycle.CMP_FIRST = 1 -- In compare callback function prefer first entity.
Cycle.CMP_SECOND = 2  -- In compare callback function prefer second entity.
Cycle.CMP_FIRST_STOP = 3 -- In compare callback function prefer first entity and stop.
Cycle.CMP_SECOND_STOP = 4 -- In compare callback function prefer second entity and stop.

Cycle._instance_id = 0
Cycle._list = {}
Cycle._ids = {}
Cycle._index = 0
Cycle._id = 0
Cycle._cbcmp = nil

--
-- Get id of the current cycle.
--
-- return: ID of the current cycle.
Cycle.instance_id = function()
	return getn(Cycle._list) > 0 and Cycle._instance_id or 0
end

--
-- Update or initialize the cycle.
--
-- NOTE: Cycle.next() must be called at least once before
--       calling this function again to continue the cycle.
--
-- args:
--   list: Entities to cycle through. Defaults to the games selection.
--   cbcmp: Callback function to compare and choose next entity in cycle.
--     function(id2, id1, context)
--     args:
--       id2: ID of the second entity to compare.
--       id1: ID of the first entity to compare.
--       context: Table for custom context or cache between the consecutive calls.
--     return: CMP_FIRST or CMP_SECOND or CMP_FIRST_STOP or CMP_SECOND_STOP
-- return: Whether or not the cycle is valid.
Cycle.init = function(list, cbcmp)
	if list == nil then
		-- use game selection as list
		list = {}
		for i = 1, SelectionCount() do
			list[i] = SelectionId(i - 1)
		end
	end

	local count = getn(list)

	-- Check cycle validity.
	local valid = (cbcmp == Cycle._cbcmp
		and (SelectionCount() == 1) and (SelectionId(0) == Cycle._id)
	) and 1 or 0
	if valid == 1 then
		if count ~= getn(Cycle._list) then
			-- Check if new list is the current selection of the old list.
			valid = (count == 1) and (list[1] == Cycle._id) and 1 or 1
		else
			-- Compare lists.
			for i = 1, count do
				if list[i] ~= Cycle._list[i] then
					valid = 0
					break
				end
			end
		end
	end

	if valid == 1 then
		-- continue cycle

	elseif count > 0 then
		-- new cycle
		list = table_shallow_copy(list)

		local ids = {}
		for i = 1, count do
			ids[list[i]] = i
		end

		Cycle._instance_id = Cycle._instance_id + 1
		Cycle._list = list
		Cycle._ids = ids
		Cycle._index = 0
		Cycle._id = 0
		Cycle._cbcmp = cbcmp

	else
		-- no cycle / broken cycle
		Cycle.clear()
	end

	return getn(Cycle._list) and 1 or 0
end

--
-- Update or initialize and start the cycle.
-- Same as: Cycle.init(list, cbcmp); Cycle.start()
--
-- return: ID of the selected entity or 0.
Cycle.update = function(list, cbcmp)
	Cycle.init(list, cbcmp)
	return Cycle.start()
end

--
-- Calculate and select first entity in cycle.
-- Requires a subsequent call to Cycle.next(). Otherwise the cycle is considered invalid.
--
-- return: ID of the selected entity or 0.
Cycle.start = function()
	if Cycle._id ~= 0 then
		return Cycle._id
	end

	Cycle._index = 0
	local id = Cycle.next()
	Cycle._id = 0
	return id
end

--
-- Calculate and select first entity in cycle.
--
-- return: ID of the selected entity or 0.
Cycle.restart = function()
	Cycle._index = 0
	return Cycle.next()
end

--
-- Calculate and select next entity in cycle.
--
-- return: ID of the selected entity or 0.
Cycle.next = function()
	local index = Cycle.compare(Cycle._list, Cycle._cbcmp, Cycle._index)
	Cycle._index = index
	Cycle._id = Cycle._list[index] or 0

	if Cycle._id == 0 then
		return 0
	end

	SelectEntity(Cycle._id, 0)
	return Cycle._id
end

--
-- Get the size of the cycle.
--
-- return: Cycle size.
Cycle.count = function()
	return getn(Cycle._list)
end

--
-- Get entity id at the specified index.
--
-- return: Entity id or 0.
Cycle.get = function(index)
	return Cycle._list[index or 0] or 0
end

--
-- Get the current index or 0 if it is not yet determined.
--
-- return: Current index.
Cycle.current_index = function()
	return Cycle._index
end

--
-- Get the current id or 0 if it is not yet determined.
--
-- return: Current id.
Cycle.current_id = function()
	return Cycle._id
end

--
-- Set the current index or 0 if it is invalid.
--
-- return: id at index or 0
Cycle.set_current_index = function(index)
	local id = Cycle._list[index] or 0
	Cycle._index = id ~= 0 and index or 0
	Cycle._id = id
	return id
end

--
-- Set the current id or 0 if it is invalid.
--
-- return: index of id or 0
Cycle.set_current_id = function(id)
	local index = Cycle._ids[id] or 0
	Cycle._id = index ~= 0 and id or 0
	Cycle._index = index
	return index
end

--
-- Clear Cycle.
--
Cycle.clear = function()
	Cycle._list = {}
	Cycle._ids = {}
	Cycle._index = 0
	Cycle._id = 0
end

--
-- Validate the cycle.
-- Should be called when selection is changed.
--
-- return: 1 = valid cycle, 0 = invalid or no cycle
Cycle.validate = function()
	if getn(Cycle._list) == 0 then -- no cycle
		return 0
	end

	if Cycle._id ~= 0 then
		if SelectionCount() == 1 and Cycle._id == SelectionId(0) then
			return 1
		end

		Cycle.clear()
		return 0
	end

	if getn(Cycle._list) ~= SelectionCount() then
		Cycle.clear()
		return 0
	end

	for i = 1, SelectionCount() do
		if Cycle._ids[SelectionId(i - 1)] == nil then
			Cycle.clear()
			return 0
		end
	end

	return 1
end

--
-- Compare ids in given list using cbcmp and return the best one.
--
Cycle.compare = function(list, cbcmp, start)
	start = start or 0

	local count = getn(list)
	local index1 = (count > 1
		and (start + 1 > count and 1 or start + 1)
		or (count >= 1 and 1 or 0))

	-- local dbgtxt = "Cycle.compare: count: " .. count --DEBUG
	if count > 1 and index1 > 0 and cbcmp ~= nil then
		local context = {}
		local id1 = list[index1]
		local index2 = index1
		local id2, result
		-- dbgtxt = dbgtxt .. ", cbcmp:" --DEBUG
		for i = 1, count - 1 do
			index2 = index2 + 1 > count and 1 or index2 + 1
			id2 = list[index2]
			result = cbcmp(id2, id1, context)
			-- dbgtxt = dbgtxt .. " " .. id1 .. ":" .. id2 .. "=" --DEBUG
			if result == Cycle.CMP_FIRST then
				-- dbgtxt = dbgtxt .. "1" --DEBUG
				-- pass
			elseif result == Cycle.CMP_SECOND then
				-- dbgtxt = dbgtxt .. "2" --DEBUG
				index1 = index2
				id1 = id2
			elseif result == Cycle.CMP_SECOND_STOP then
				-- dbgtxt = dbgtxt .. "2STOP" --DEBUG
				index1 = index2
				id1 = id2
				break
			else -- result == Cycle.CMP_FIRST_STOP
				-- dbgtxt = dbgtxt .. "1STOP" --DEBUG
				break
			end
		end
	end

	-- dbgtxt = dbgtxt .. ", index: " .. start .. "=>" .. index1 --DEBUG
	-- print(dbgtxt) --DEBUG
	return index1
end

--
-- Compare selected entities to find preferred one using the given compare function.
--
Cycle.compare_selection = function(cbcmp)
	local list = {}
	for i = 1, SelectionCount() do
		list[i] = SelectionId(i - 1)
	end

	local index = Cycle.compare(list, cbcmp)
	return list[index] or 0
end

--
-- Compare selected entities and select preferred one using the given compare function.
-- Same as: SelectEntity(Cycle.compare_selection(cbcmp), 0)
--
Cycle.compare_select = function(cbcmp)
	SelectEntity(Cycle.compare_selection(cbcmp), 0)
end

--
-- Sort ids in given list using cbcmp.
--
Cycle.sort = function(list, cbcmp)
	local count = getn(list)
	if count <= 1 then
		return
	end

	local src_list = {}
	for i = 1, count do
		src_list[i] = list[i]
	end

	for i = 1, count - 1 do
		local src_index = Cycle.compare(src_list, cbcmp)
		list[i] = src_list[src_index]

		for j = src_index, count - i + 1 do
			src_list[j] = src_list[j + 1]
		end
	end
	list[count] = src_list[1]

end

--
-- Sort ids in given list using cbcmp.
--
Cycle.sorted = function(list, cbcmp)
	local dst_list = {}
	if list == nil then
		for i = 1, SelectionCount() do
			dst_list[i] = SelectionId(i - 1)
		end
	else
		for i = 1, getn(list) do
			dst_list[i] = list[i]
		end
	end

	Cycle.sort(dst_list, cbcmp)
	return dst_list
end


---------------------------------------------------------------------
-- Queues
-- Provide queues for structures that don't normally have any.
-- NOTE: Not completed since the game's selection can't be restored nicely.

-- Queues = {}

-- Queues.CB_FAIL = 0
-- Queues.CB_SUCCESS = 1
-- Queues.CB_REMOVE = 2

-- Queues.max_length = 8 -- Max length of the queues.

-- -- List of ids in Queues._queues object.
-- -- This list is required because IC Lua doesn't seem to
-- -- give the ability to loop through a table.
-- Queues._ids = {}
-- -- Entities with queues and their data.
-- -- {
-- --   ID1 = {
-- --     id_index = ID_INDEX, -- Index of this item's id in Queues._ids.
-- --     start_index = START_INDEX, -- Index of first item in queue. Loops after last index.
-- --     length = INT, -- Current queue length.
-- --     callback = CALLBACK[ARGUMENT] -> SUCCESS  -- Callback function that applies a queued item.
-- --     {
-- --       1 = {CALLBACK, CB_ARGUMENT},
-- --       2 = {CALLBACK, CB_ARGUMENT},
-- --       2 = {CALLBACK, CB_ARGUMENT},
-- --       ...
-- --     },
-- --     ...
-- --   },
-- --   ID...
-- -- }
-- Queues._queues = {}

-- Queues.queue = function(id, callback, cbarg)
-- 	local queue = Queues._queues[id]
-- 	if queue == nil then
-- 		local index = getn(Queues._ids) + 1
-- 		queue = {}
-- 		queue.id_index = index
-- 		Queues._queues[id] = queue
-- 		Queues._ids[index] = id

-- 	elseif queue.length >= Queues.max_length then
-- 		return 0
-- 	end

-- 	local start_index = queue.start_index or 1
-- 	local length = queue.length or 0
-- 	local index = (start_index + length > Queues.max_length
-- 		and start_index + length - Queues.max_length or start_index + length)
-- 	queue[index] = {callback, cbarg}
-- 	return 1
-- end

-- Queues.unqueue = function(id, index)
-- 	local queue = Queues._queues[id]
-- 	if queue == nil then
-- 		return 0
-- 	end

-- 	-- ...

-- 	return 1
-- end

-- Queues.remove = function(id)
-- 	local queue = Queues._queues[id]
-- 	if queue == nil then
-- 		return 0
-- 	end

-- 	Queues._ids[queue.id_index] = Queues._ids[getn(Queues._ids)]
-- 	Queues._queues[id] = nil
-- 	return 1
-- end

-- Queues.update_all = function()
-- 	for i = 1, getn(Queues._ids) do
-- 		Queues.update(Queues._ids[id])
-- 	end
-- end

-- Queues.update = function(id)
-- 	local queue = Queues._queues[id]
-- 	if queue == nil then
-- 		return 0
-- 	end

-- 	-- ...

-- 	return 1
-- end

-- Queues.count = function(id)
-- 	local queue = Queues._queues[id]
-- 	return queue ~= nil and queue.length or 0
-- end


---------------------------------------------------------------------
-- Communicator Sigma
-- WARNING: Using exec callbacks bloats up savegames by creating triggers.

CommsSigma = table_shallow_copy(CommsBase)

-- receiver

CommsSigma.read = function(offset, count, null)
	return CommsSigma._uienable_decode(CommsSigma._uienable_read_str(offset, count, null))
end

CommsSigma.read_int = function(offset, bytes)
	return CommsSigma._uienable_int_read(offset, bytes)
end

CommsSigma._uienable_read_str = function(offset, count, null)
	-- local dbgtxt = "" --DEBUG
	-- local bytecount = 0 --DEBUG
	local data = ""
	for i = 1, count do
		local byte = CommsSigma._uienable_read_byte(offset + i - 1)
		-- dbgtxt = dbgtxt .. " " .. strlpad(tobase(byte, 16), 2, "0") --DEBUG
		-- bytecount = i --DEBUG

		if byte == 0 and null ~= 1 then
			break
		end

		data = data .. strchar(byte)
	end

	-- dbgtxt = "CommsSigma: receive (" .. bytecount .. "):" .. dbgtxt --DEBUG
	-- print(dbgtxt) --DEBUG
	return data
end

CommsSigma._uienable_int_read = function(offset, bytes)
	local num = 0
	for byte_pos = 0, bytes - 1 do
		num = num * 256 + CommsSigma._uienable_read_byte(offset + byte_pos)
	end
	return num
end

CommsSigma._uienable_read_byte = function(offset)
	local bit_offset = CommsSigma._uienable_bit_offset + offset * 8
	local byte = 0
	for bit_pos = 0, 7 do
		if IsHudEnabled(bit_offset + bit_pos) == 0 then
			byte = byte + 2 ^ (8 - bit_pos - 1)
		end
	end
	return byte
end

-- sender

CommsSigma._exec_default_timeout = 1000

CommsSigma._announce_next_slot = 0

CommsSigma.print = function(msg)
	CommsSigma._send("print_receiver", msg)
end

CommsSigma.exec = function(msg, callback, timeout)
	local slot = CommsSigma._send("exec_receiver", (callback and 1 or 0) .. msg)
	if not callback then
		return
	end

	local name = "CommsSigma.exec: slot " .. slot
	local expire = Timer.now() + (timeout or CommsSigma._exec_default_timeout)
	Timer.register(name, CommsSigma._exec_callback, {name, slot, callback, expire}, 10)
end

CommsSigma._exec_clear = function(slot)
	CommsSigma._send("exec_clear_receiver", slot)
end

CommsSigma._exec_callback = function(name, slot, callback, expire)
	if expire - Timer.now() <= 0 then
		Timer.unregister(name)
		CommsSigma._exec_clear(slot)
		callback(nil)
	end

	local offset = CommsSigma._get_slot_offset(slot)
	if CommsSigma.read_int(offset, 1) == 0 then
		return
	end

	Timer.unregister(name)
	CommsSigma._exec_clear(slot)
	callback(CommsSigma.read(offset + 1, CommsSigma._uienable_slot_buffer_size - 1))
end

--
-- Send message to a receiver of CommsGametypes.
--
-- Arguments:
--   receiver: Receiver name
--   msg: String data to transmit
--
-- Return: Slot number
--
-- Note: The message is sent in parts, as the game crashes if the maximum
--       string length of 245 for Announce() is exceeded.
-- Note: The first character after each dot must not be a number.
--       Otherwise IC might corrupt the message.
-- NOTE: Data sent for each part consists of:
--         header: Receiver table parts separated by and ending with dots
--         part type: Single letter describing the type of this message part:
--           S = Single, F = First, P = Part, L = Last
--         slot: Base 36 number used as identifier for the message and return value
--         part: Encoded part of the message
--
CommsSigma._send = function(receiver, msg)
	local slot = CommsSigma._announce_next_slot
	CommsSigma._announce_next_slot = mod(slot + 1, CommsSigma._announce_slot_count)
	local slot36 = tobase(slot, 36)
	assert(slot36)
	local header = "CommsGametypes." .. receiver .. "."
	local partlen = 245 - strlen(header) - 2
	assert(partlen > 0)
	local encoded = CommsSigma._announce_encode(msg)
	local partcount = ceil(strlen(encoded) / partlen)
	-- _ALERT("CommsSigma: send: header (" .. strlen(header) .. "): " .. header) --DEBUG
	for i = 1, partcount do
		local part = strsub(encoded, (i - 1) * partlen + 1, i * partlen)
		local parttype = (i == 1 and (i == partcount and "S" or "F")) or (i == partcount and "L") or "P"
		-- _ALERT("CommsSigma: send: part " .. i .. "/" .. partcount .. " (".. strlen(part) .. "): " .. part) --DEBUG
		Announce(header .. parttype .. slot36 .. part, 0)
	end
	return slot
end


---------------------------------------------------------------------
-- IC specific functions

-- Get a player identifier -> player index mapping, containing observers.
-- NOTE: Players who died without gathering any coal are considered observers.
--       Cache is permanently activated as soon as it is clear who is player and who is observer.
get_observers = function(refresh)
	if refresh ~= 1 and _get_observers_cache and (
		_get_observers_cache[1] == -1 or _get_observers_cache[1] - Timer.now() > 0
	) then
		return _get_observers_cache[2], _get_observers_cache[1]
	end

	local cache = 1
	local observers = {}
	for i = 1, world_getplayercount() do
		local player_id =  world_getplayerat(i - 1)
		player_set(player_id)

		local total_scrap = player_totalscrap()
		if player_isdead() == 1 and total_scrap == 0 then -- if not observer
			observers[player_id] = i
		else
			cache = cache == 1 and total_scrap ~= 0 and 1 or 0
		end
	end

	local expire = cache == 1 and -1 or Timer.now() + 1
	_get_observers_cache = {expire, observers}
	return observers, expire
end

is_observer = function(player_id)
	return get_observers()[player_id] and 1 or 0
end

get_teams = function(refresh)
	if refresh ~= 1 and _get_teams_cache and (
		_get_teams_cache[1] == -1 or _get_teams_cache[1] - Timer.now() > 0
	) then
		return _get_teams_cache[2], _get_teams_cache[3], _get_teams_cache[1]
	end

	-- map player index -> id
	local pending = {}
	local observers, expire = get_observers()
	for i = 1, world_getplayercount() do
		local player_id =  world_getplayerat(i - 1)
		if not observers[player_id] then
			pending[i] = player_id
		end
	end

	-- teams list and player to team map
	local teams = {}
	local teams_map = {}
	for i, id1 in pending do
		player_set(id1)
		pending[i] = nil

		local team = {i}
		teams[getn(teams) + 1] = team
		for j, id2 in pending do
			if player_isally(id2) == 1 then
				pending[j] = nil
				team[getn(team) + 1] = j
				teams_map[id2] = getn(teams)
			end
		end
	end

	_get_teams_cache = {expire, teams, teams_map}
	return teams, teams_map, expire
end

--
-- Get the build queue length. To be used for local player.
-- Used instead of BuildQueueLength, as it has a slight delay before being updated.
--
build_queue_length = function(building)
	local bqlength = Entities.context(building, {})._bqlength
	return (bqlength == nil and BuildQueueLength(building)
		or min(bqlength, BuildQueueLength(building)))
end

build_queue_length_changed = function(building, bqlength)
	local context = Entities.context(building)
	if context ~= nil then
		context._bqlength = (bqlength < 0 and 0) or (bqlength > 8 and 8) or bqlength
	end
end

--
-- Check whether or not entity is in research. To be used for local player.
-- Used instead of EntityInResearch, as it has a slight delay before being updated.
--
entity_in_research = function(building)
	return _entity_in_research(EntityInResearch(building), building)
end

--
-- Check whether or not entity is in creature upgrade. To be used for local player.
-- Used instead of EntityInCreatureUpgrade, as it has a slight delay before being updated.
--
entity_in_creature_upgrade = function(building)
	return _entity_in_research(EntityInCreatureUpgrade(building), building)
end

--
-- Check whether or not entity is in extension. To be used for local player.
-- Used instead of EntityInExtension, as it has a slight delay before being updated.
--
entity_in_extension = function(building)
	return _entity_in_research(EntityInExtension(building), building)
end

_entity_in_research = function(game_function_result, building)
	return (game_function_result == 1
		and Entities.context(building, {})._research_stopped_id == nil
	) and 1 or 0
end

--
-- Check whether or not research is open. To be used for local player.
-- Used instead of ResearchIsOpen, as it has a slight delay before being updated.
--
research_is_open = function(researchid)
	return _research_is_open(ResearchIsOpen(researchid), researchid)
end

--
-- Check whether or not a creature upgrade is open. To be used for local player.
-- Used instead of CreatureUpgradeIsOpen, as it has a slight delay before being updated.
--
creature_upgrade_is_open = function(ebpid, upgradeid)
	return _research_is_open(CreatureUpgradeIsOpen(ebpid, upgradeid),
		(ebpid + 1) * 1e3 + upgradeid)
end

--
-- Check whether or not an addonid is open. To be used for local player.
-- Used instead of AddOnIsInstalled, as it has a slight delay before being updated.
--
addon_is_installed = function(building, addonid)
	return _research_is_open(AddOnIsInstalled(building, addonid) == 0 and 1 or 0,
		(building + 1) * 1e6 + addonid) == 0 and 1 or 0
end

_research_is_open = function(game_function_result, researchid)
	return (game_function_result == 1
		and not (_research_started_id == researchid)
		or (_research_stopped_id == researchid)
	) and 1 or 0
end

--
-- Indicate that research was started.
--
research_started = function(building, researchid)
	_research_started(building, researchid)
end

-- Indicate that a creature upgrade was started.
creature_upgrade_started = function(building, ebpid, upgradeid)
	_research_started(building, (ebpid + 1) * 1e3 + upgradeid)
end

--
-- Indicate that an addon was started.
--
addon_started = function(building, addonid)
	_research_started(building, (building + 1) * 1e6 + addonid)
end

_research_started = function(building, researchid)
	local context = Entities.context(building) or {}
	_research_started_id = researchid
	_research_stopped_id = nil
	context._research_started_id = _research_started_id
	context._research_stopped_id = _research_stopped_id
end

--
-- Indicate that research was stopped.
--
research_stopped = function(building)
	return _research_stopped(building)
end

--
-- Indicate that a creature upgrade was stopped.
--
creature_upgrade_stopped = function(building)
	return _research_stopped(building)
end

--
-- Indicate that an addon was stopped.
--
addon_stopped = function(building)
	return _research_stopped(building)
end

_research_stopped = function(building)
	local context = Entities.context(building) or {}
	_research_started_id = nil
	_research_stopped_id = context._research_started_id
	context._research_started_id = _research_started_id
	context._research_stopped_id = _research_stopped_id
	return _research_stopped_id
end

selection_filtered_by_type = function(type)
	local selection = {}
	local j = 1
	for i = 1, SelectionCount() do
		local id = SelectionId(i - 1)
		if type == EntityType(id) then
			selection[j] = id
			j = j + 1
		end
	end
	return selection
end

selection_filtered_by_types = function(types)
	local tps = {}
	for i, type in types do
		tps[type] = 1
	end

	local selection = {}
	local j = 1
	for i = 1, SelectionCount() do
		local id = SelectionId(i - 1)
		if tps[EntityType(id)] == 1 then
			selection[j] = id
			j = j + 1
		end
	end
	return selection
end

save_single_selection = function()
	return SelectionCount() == 1 and SelectionId(0) or 0
end

restore_single_selection = function(id)
	if id == 0 then
		DeSelectAll()
	else
		SelectEntity(id, 0)
	end
end

deselect_all_melee_units = function()
	__deselect_all_units_unless_attack_count_equals(1)
end

deselect_all_ranged_units = function()
	__deselect_all_units_unless_attack_count_equals(0)
end

__deselect_all_units_unless_attack_count_equals = function(attack_count)
	local i = SelectionCount()
	while i > 0 do
		i = i - 1
		local id = SelectionId(i)
		if GetRangeAttackCount(EntityEBP(id)) ~= attack_count then
			DeSelectEntity(id, 1)
			local count = SelectionCount()
			if count < i then
				i = count
			end
		end
	end
end
