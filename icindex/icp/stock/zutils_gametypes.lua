---------------------------------------------------------------------
-- File    : data:gametypes/zutils.lua
-- Desc    : Collection of utility functions and objects.
-- Created :
-- Author  : Zitrone47
--

if _zutils_gametypes == 1 then
	return
end
_zutils_gametypes = 1


---------------------------------------------------------------------
-- Imports

dofilepath("data:zutils.lua")


---------------------------------------------------------------------
-- STATE Constants
-- Define known state values returned by ent_state() function.

STATE_Attack = 3
STATE_AttackGround = 4
STATE_AttackMove = 5
STATE_BuildStructure = 6
STATE_Dead = 7 -- dead but not (yet) despawned
STATE_Dig = 8
STATE_Gather = 9
STATE_Heal = 11
STATE_Idle = 12
STATE_Move = 13
STATE_Patrol = 14
STATE_Repair = 15
STATE_Guard = 16
STATE_Tag = 17
STATE_Garrison = 19
STATE_CreatureAbility = 20
STATE_CreatureIdle = 21
STATE_CreatureAttack = 23
STATE_Airlift = 27 -- also unload


---------------------------------------------------------------------
-- Communicator Gametypes
-- WARNING: Sending data bloats up savegames by creating triggers.

CommsGametypes = table_shallow_copy(CommsBase)

-- receiver

CommsGametypes._announce_parts = {}

CommsGametypes._receiver_tm_gettable = function(receiver, data)
	local slot36 = strsub(data, 2, 2)
	local slot = tonumber(slot36, 36)
	if not slot then
		logging.error("CommsGametypes: receiver: received data with invalid slot char: " .. slot36)
		return
	end

	local parttype = strsub(data, 1, 1)
	local msg = strsub(data, 3)
	if parttype == "S" then -- single
		-- pass
	elseif parttype == "F" then -- first
		CommsGametypes._announce_parts[slot] = msg
		return
	elseif parttype == "P" then -- part
		CommsGametypes._announce_parts[slot] = (CommsGametypes._announce_parts[slot] or "") .. msg
		return
	elseif parttype == "L" then -- last
		msg = (CommsGametypes._announce_parts[slot] or "") .. msg
	else
		logging.error("CommsGametypes: receiver: received data with invalid part type: " .. parttype)
		return
	end

	CommsGametypes._announce_parts[slot] = nil
	msg = CommsGametypes._announce_decode(msg)

	local callback = rawget(receiver, "callback")
	call(callback, {slot, msg}, "x")
end

CommsGametypes._receiver_tag = newtag()
settagmethod(CommsGametypes._receiver_tag, "gettable", CommsGametypes._receiver_tm_gettable)

CommsGametypes.print_receiver = {}
CommsGametypes.print_receiver.callback = function(slot, msg)
	print("CommsGametypes: print receiver: " .. strlen(msg) .. ", " .. toplain(msg))
end
settag(CommsGametypes.print_receiver, CommsGametypes._receiver_tag)

CommsGametypes.exec_receiver = {}
CommsGametypes.exec_receiver.callback = function(slot, msg)
	local result = dostring(strsub(msg, 2))
	if (strsub(msg, 1, 1)) ~= "1" then
		return
	end

	local offset = CommsGametypes._get_slot_offset(slot)
	local encoded = CommsGametypes._uienable_encode(tostring(result) or "")
	local trigger = CommsGametypes._uienable_write_init()
	CommsGametypes._uienable_write_int(trigger, offset, 1, 1)
	CommsGametypes._uienable_write_str(trigger, offset + 1, strsub(encoded, 1, CommsGametypes._uienable_slot_buffer_size - 1))
end
settag(CommsGametypes.exec_receiver, CommsGametypes._receiver_tag)

CommsGametypes.exec_clear_receiver = {}
CommsGametypes.exec_clear_receiver.callback = function(slot, msg)
	local target_slot = tonumber(msg)
	-- _ALERT("CommsGametypes: exec clear receiver: slot: " .. tostring(target_slot)) --DEBUG
	if not target_slot or  target_slot < 1 then
		return
	end

	local offset = CommsGametypes._get_slot_offset(target_slot)
	CommsGametypes._uienable_write_int(nil, offset, 0, 1)
end
settag(CommsGametypes.exec_clear_receiver, CommsGametypes._receiver_tag)

-- sender

CommsGametypes.write = function(offset, data)
	CommsGametypes._uienable_write_str(nil, offset, CommsGametypes._uienable_encode(data))
end

CommsGametypes.write_int = function(offset, num, bytes)
	CommsGametypes._uienable_write_int(nil, offset, num, bytes)
end

CommsGametypes._uienable_write_str = function(trigger, offset, data)
	trigger = trigger or CommsGametypes._uienable_write_init()
	local count = strlen(data)
	-- local dbgtxt = "" --DEBUG
	-- local bytecount = 0 --DEBUG
	for i = 1, count + 1 do
		local byte = i <= count and strbyte(data, i) or 0
		CommsGametypes._uienable_write_byte(trigger, offset + i - 1, byte)
		-- dbgtxt = dbgtxt .. " " .. strlpad(tobase(byte, 16), 2, "0") --DEBUG
		-- bytecount = i --DEBUG
	end
	-- dbgtxt = "CommsGametypes: write (" .. bytecount .. "):" .. dbgtxt --DEBUG
	-- print(dbgtxt) --DEBUG
end

CommsGametypes._uienable_write_int = function(trigger, offset, num, bytes)
	trigger = trigger or CommsGametypes._uienable_write_init()
	num = tonumber(num) or 0
	for byte_pos = bytes - 1, 0, -1 do
		local byte = mod(num, 256)
		num = floor(num / 256)
		CommsGametypes._uienable_write_byte(trigger, offset + byte_pos, byte)
	end
end

CommsGametypes._uienable_write_byte = function(trigger, offset, byte)
	local bit_offset = CommsGametypes._uienable_bit_offset + offset * 8
	for bit_pos = 7, 0, -1 do
		local a = texpression_new("UI, enable button")
		texpression_setarg(a, 1, bit_offset + bit_pos)
		texpression_setarg(a, 2, mod(byte, 2) == 0 and 1 or 0)
		trigger_addexpression(trigger, a)
		byte = floor(byte / 2)
	end
end

CommsGametypes._uienable_write_init = function()
	trigger_folder("CommsGametypes")
	local trigger = trigger_new("write")
	local condition = texpression_new("Always")
	trigger_addexpression(trigger, condition)
	return trigger
end


---------------------------------------------------------------------
-- specific functions

-- convert a player id as returned by world_getplayerat() to one that can be used in a trigger.
get_trigger_player_id = function(player_id)
	if player_id == 1000 then
		return 0
	elseif player_id == 1001 then
		return 1
	elseif player_id == 1002 then
		return 2
	elseif player_id == 1003 then
		return 3
	elseif player_id == 1004 then
		return 10
	elseif player_id == 1005 then
		return 11
	end
	return nil
end

get_player_list = function()
	local list = {}
	for i = 1, world_getplayercount() do
		list[i] = world_getplayerat(i - 1)
	end
	return list
end

eg_addgroup = function(group1, group2)
	for j = 0, eg_size(group2) - 1 do
		eg_addentity(group1, eg_getentity(group2, j))
	end
end

eg_create_from_table = function(table)
	local group = eg_create()
	for _, entity in table do
		if entity ~= nil then
			eg_addentity(group, entity)
		end
	end
	return group
end

eg_create_from_types = function(ec_types, player_ids)
	return eg_create_from_table(get_entities(ec_types, player_ids))
end

get_entities = function(ec_types, player_ids)
	local entities = {}
	local count = player_ids ~= nil and getn(player_ids) or 0
	for i = 1, count > 1 and count or 1 do
		if player_ids ~= nil then
			local player_id = player_ids[i]
			if player_id ~= nil then
				player_set(player_id)
			end
		end

		for j = 1, getn(ec_types) do
			local ec_type = ec_types[j]
			if ec_type ~= nil then
				local group = player_getgroup(ec_type)
				for k = 0, eg_size(group) - 1 do
					entities[getn(entities) + 1] = eg_getentity(group, k)
				end
			end
		end
	end
	return entities
end
