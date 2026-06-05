---------------------------------------------------------------------
-- File    : data:zutils.lua
-- Desc    : Collection of utility functions and objects.
-- Created :
-- Author  : Zitrone47
--

if _zutils == 1 then
	return
end
_zutils = 1


---------------------------------------------------------------------
-- generic functions

do
	fnoverride = function(name, func)
		local super = globals()[name]
		local override = function(...)
			---@diagnostic disable-next-line: unknown-symbol, miss-name, miss-exp, exp-in-action
			local func, super = %func, %super
			tinsert(arg, 1, super)
			call(func, arg)
		end
		rawset(globals(), name, override)
		return override, super
	end

	toplain = function(value)
		local typ = type(value)

		if typ == "table" then
			local str = "{"
			local i = 1
			for k, v in value do
				str = str .. (i > 1 and ", " or "") .. toplain(k) .. " = " .. toplain(v)
				i = i + 1
			end
			str = str .. "}"
			return str
		end

		if typ == "string" then
			return '"' .. strescape(value) .. '"'
		end

		return tostring(value)
	end

	_tobase_map = {
		"0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
		"A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
		"K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
		"U", "V", "W", "X", "Y", "Z",
	}
	tobase = function(value, base)
		value = tonumber(value)
		base = tonumber(base)
		if value == nil or value ~= floor(value) or base == nil then
			return nil
		end

		if base > 36 or base < 2 then
			error("base must be between 2 and 36, got: " .. tostring(base))
		end

		if base == 10 then
			return value
		end

		local out = ""
		repeat
			local remainder = mod(value, base)
			out = (remainder < 10 and remainder or _tobase_map[remainder]) .. out
			value = floor(value / base)
		until value == 0

		return out
	end

	tohex = function(value)
		return tobase(value, 16)
	end

	tobin = function(value)
		return tobase(value, 16)
	end

	inlist = function(list, value)
		for i = 0, getn(list) do
			if list[i] == value then
				return i
			end
		end
		return 0
	end

	list_sort_insert = function(list, value)
		local count = getn(list)
		local index = 1
		while index <= count and value >= list[index] do
			index = index + 1
		end
		tinsert(list, index, value)
	end

	-- list_insert = function(list, index, value)
	-- 	local count = getn(list)
	-- 	for i = 1, count - index + 1 do
	-- 		list[count - i + 2] = list[count - i + 1]
	-- 	end
	-- 	list[index] = value
	-- end

	-- list_remove = function(list, index)
	-- 	local count = getn(list)
	-- 	for i = index, count do
	-- 		list[i] = list[i + 1]
	-- 	end
	-- end

	list_filter = function(list, callback)
		local count = getn(list)
		local index = 1
		for i = 1, count do
			local v = list[i]
			if callback(v) then
				if i ~= index then
					list[index] = v
				end
				index = index + 1
			end
		end

		for i = index, count do
			list[i] = nil
		end
	end

	list_filtered = function(list, callback)
		local copy = {}
		for i = 1, getn(list) do
			local v = list[i]
			if callback(v) then
				copy[getn(copy) + 1] = v
			end
		end
		return copy
	end

	table_shallow_copy = function(table)
		local copy = {}
		for k, v in table do
			copy[k] = v
		end
		return copy
	end

	-- deep-clone a table
	-- from data:/gametypes/util.lua
	function table_deep_copy(t) -- return a copy of the table t
	  local new = {} -- create a new table
	  local i, v = next(t, nil) -- i is an index of t, v = t[i]
	  while i do
	    if type(v) == "table" then
	       v = table_deep_copy(v)
	    end
	    new[i] = v
	    i, v = next(t, i) -- get next index
	  end
	  return new
	end

	table_swapped_keys_values = function(table)
		local out = {}
		for k, v in table do
			if v ~= nil then
				out[v] = k
			end
		end
		return out
	end
end


---------------------------------------------------------------------
-- string functions

do
	-- Left-pad string with given fill char or spaces.
	strlpad = function(str, width, fillchar)
		return strrep(fillchar or " ", width - strlen(str)) .. str
	end

	-- Right-pad string with given fill char or spaces.
	strrpad = function(str, width, fillchar)
		return str .. strrep(fillchar or " ", width - strlen(str))
	end

	-- Concat non-nil numeric table values.
	strconcat = function(strlist, sep)
		local text = ""
		for i = 1, getn(strlist) do
			local value = strlist[i]
			if value then
				text = text .. (i > 1 and sep or "") .. tostring(value)
			end
		end
		return text
	end

	-- strconcatkeys = function(map, sep)
	-- 	local text = ""
	-- 	local i = 1
	-- 	for key, value in map do
	-- 		if key then
	-- 			text = text .. (i > 1 and sep or "") .. tostring(key)
	-- 		end
	-- 		i = i + 1
	-- 	end
	-- 	return text
	-- end

	-- strconcatvalues = function(map, sep)
	-- 	local text = ""
	-- 	local i = 1
	-- 	for key, value in map do
	-- 		if value then
	-- 			text = text .. (i > 1 and sep or "") .. tostring(value)
	-- 		end
	-- 		i = i + 1
	-- 	end
	-- 	return text
	-- end

	local escape_pattern_map = {
		["^"] = "^", ["$"] = "$", ["("] = "(", [")"] = ")", ["%"] = "%", ["."] = ".",
		["["] = "[", ["]"] = "]", ["*"] = "*", ["+"] = "+", ["-"] = "-", ["?"] = "?",
		["\0"] = "z",
	}

	local escape_pattern_callback = function(m)
		---@diagnostic disable-next-line: unknown-symbol, exp-in-action, redundant-return, action-after-return
		return %escape_pattern_map[m] and "%" .. %escape_pattern_map[m] or m
	end

	-- Escape gsub patterns.
	gsub_escape_pattern = function(pattern)
		---@diagnostic disable-next-line: unknown-symbol, miss-exp
		return gsub(pattern, "([%^%$%(%)%%%.%[%]%*%+%-%?%z])", %escape_pattern_callback)
	end

	-- Escape gsub replacement patterns.
	gsub_escape_replacement = function(replacement)
		return gsub(replacement, "%%", "%%%%")
	end

	---@diagnostic disable-next-line: unused-local
	local control_char_set = {
		["\0"] = 1, ["\a"] = 1, ["\b"] = 1, ["\f"] = 1,
		["\n"] = 1, ["\r"] = 1, ["\t"] = 1, ["\v"] = 1,
	}

	--
	-- Make string escape and unescape functions.
	--
	-- Arguments:
	--   escape_char: Single character used to escape itself and other characters.
	--   char_map: Table mapping unescaped to escaped single characters.
	--             Escaped values must not be prefixed with escape char.
	--
	-- Return:
	--   escape: Escape function.
	--   unescape: Unescape function.
	--   object: Table containing all important variables:
	--     escape_char
	--     escape_map
	--     unescape_map
	--     escape_pattern
	--     unescape_pattern
	--     escape
	--     unescape
	--
	gsub_make_escape_functions = function(escape_char, char_map)
		---@diagnostic disable-next-line: unknown-symbol, miss-exp, exp-in-action
		local control_char_set = %control_char_set

		local escape_map = {[escape_char] = escape_char}
		local unescape_map = {[escape_char] = escape_char}
		local escape_pattern = escape_char
		local unescape_pattern = escape_char

		local pat
		local escape_pattern_set = {[escape_char] = 1}
		local unescape_pattern_set = {[escape_char] = 1}
		for unescaped, escaped in char_map do
			escape_map[unescaped] = escaped
			unescape_map[escaped] = unescaped

			pat = control_char_set[unescaped] and "%c" or gsub_escape_pattern(unescaped)
			escape_pattern = escape_pattern .. (not escape_pattern_set[pat] and pat or "")
			escape_pattern_set[pat] = 1

			pat = control_char_set[escaped] and "%c" or gsub_escape_pattern(escaped)
			unescape_pattern = unescape_pattern .. (not unescape_pattern_set[pat] and pat or "")
			unescape_pattern_set[pat] = 1
		end

		escape_pattern = "([" .. escape_pattern .. "])"
		unescape_pattern = gsub_escape_pattern(escape_char) .. "([" .. unescape_pattern .. "])"

		local escape_callback = function(m)
			---@diagnostic disable-next-line: unknown-symbol, exp-in-action, redundant-return, action-after-return
			return %escape_map[m] and %escape_char .. %escape_map[m] or m
		end

		local unescape_callback = function(m)
			---@diagnostic disable-next-line: unknown-symbol, exp-in-action, redundant-return, action-after-return
			return %unescape_map[m] or m
		end

		local escape = function(s)
			---@diagnostic disable-next-line: unknown-symbol, miss-exp, exp-in-action, action-after-return
			return gsub(s, %escape_pattern, %escape_callback)
		end

		local unescape = function(s)
			---@diagnostic disable-next-line: unknown-symbol, miss-exp, exp-in-action, action-after-return
			return gsub(s, %unescape_pattern, %unescape_callback)
		end

		return escape, unescape, {
			escape_char = escape_char,
			escape_map = escape_map,
			unescape_map = unescape_map,
			escape_pattern = escape_pattern,
			unescape_pattern = unescape_pattern,
			escape = escape,
			unescape = unescape,
		}
	end

	strescape, strunescape = gsub_make_escape_functions("\\", {
	    ["\\"] = "\\",
	    ["\""] = "\"",
	    ["\'"] = "\'",
	    ["\0"] = "0",
	    ["\a"] = "a",
	    ["\b"] = "b",
	    ["\f"] = "f",
	    ["\n"] = "n",
	    ["\r"] = "r",
	    ["\t"] = "t",
	    ["\v"] = "v",
	})
end


---------------------------------------------------------------------
-- comparison functions

eq = function(op1, op2)
	return op1 == op2
end

ne = function(op1, op2)
	return op1 ~= op2
end

lt = function(op1, op2)
	return op1 < op2
end

le = function(op1, op2)
	return op1 <= op2
end

gt = function(op1, op2)
	return op1 > op2
end

ge = function(op1, op2)
	return op1 >= op2
end


---------------------------------------------------------------------
-- base64
-- public domain Lua base64 encoder/decoder
-- no warranty implied; use at your own risk
--
-- Implementation of extract function inspired by Rici Lake's post:
--   http://ricilake.blogspot.co.uk/2007/10/iterating-bits-in-lua.html
--
-- original author: Ilya Kolbin (iskolbin@gmail.com)
-- original url: github.com/iskolbin/lbase64
--
-- COMPATIBILITY
--
-- Lua 4.0
--
-- LICENSE
--
-- ------------------------------------------------------------------------------
-- This software is available under 2 licenses -- choose whichever you prefer.
-- ------------------------------------------------------------------------------
-- ALTERNATIVE A - MIT License
-- Copyright (c) 2018 Ilya Kolbin
-- Permission is hereby granted, free of charge, to any person obtaining a copy of
-- this software and associated documentation files (the "Software"), to deal in
-- the Software without restriction, including without limitation the rights to
-- use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
-- of the Software, and to permit persons to whom the Software is furnished to do
-- so, subject to the following conditions:
-- The above copyright notice and this permission notice shall be included in all
-- copies or substantial portions of the Software.
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
-- ------------------------------------------------------------------------------
-- ALTERNATIVE B - Public Domain (www.unlicense.org)
-- This is free and unencumbered software released into the public domain.
-- Anyone is free to copy, modify, publish, use, compile, sell, or distribute this
-- software, either in source code form or as a compiled binary, for any purpose,
-- commercial or non-commercial, and by any means.
-- In jurisdictions that recognize copyright laws, the author or authors of this
-- software dedicate any and all copyright interest in the software to the public
-- domain. We make this dedication for the benefit of the public at large and to
-- the detriment of our heirs and successors. We intend this dedication to be an
-- overt act of relinquishment in perpetuity of all present and future rights to
-- this software under copyright law.
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
-- ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
-- WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
-- ------------------------------------------------------------------------------

do
	base64 = {}

	---@diagnostic disable-next-line: unused-local, unused-function
	local extract = function( v, from, width )
		local w = 0
		local flag = 2^from
		for i = 0, width-1 do
			local flag2 = flag + flag
			if mod(v, flag2) >= flag then
				w = w + 2^i
			end
			flag = flag2
		end
		return w
	end

	function base64.makecodec( s62, s63, spad )
		local encoder, decoder = {}, {}
		for b64code, char in {'A','B','C','D','E','F','G','H','I','J',
			'K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y',
			'Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n',
			'o','p','q','r','s','t','u','v','w','x','y','z','0','1','2',
			'3','4','5','6','7','8','9',s62 or '+',s63 or '/',spad or '='} do
			encoder[b64code - 1] = strbyte(char)
		end
		if getn(encoder) ~= 64 then
			error("s62, s63 and spad must differ from each other and A-Z, a-z, 0-9")
		end
		for b64code, charcode in encoder do
			decoder[charcode] = b64code
		end
		return {encoder = encoder, decoder = decoder}
	end

	local DEFAULT_CODEC = base64.makecodec()

	function base64.encode( str, codec, usecaching )
		---@diagnostic disable-next-line: unknown-symbol
		local encoder = codec and codec.encoder or %DEFAULT_CODEC.encoder
		---@diagnostic disable-next-line: unknown-symbol, miss-exp, exp-in-action
		local extract = %extract
		local t, k, n = {}, 1, strlen(str)
		local lastn = mod(n, 3)
		local cache = {}
		for i = 1, n-lastn, 3 do
			local a, b, c = strbyte(str, i), strbyte(str, i+1), strbyte(str, i+2)
			local v = a*65536 + b*256 + c
			local s
			if usecaching then
				s = cache[v]
				if not s then
					s = strchar(encoder[extract(v,18,6)], encoder[extract(v,12,6)], encoder[extract(v,6,6)], encoder[extract(v,0,6)])
					cache[v] = s
				end
			else
				s = strchar(encoder[extract(v,18,6)], encoder[extract(v,12,6)], encoder[extract(v,6,6)], encoder[extract(v,0,6)])
			end
			t[k] = s
			k = k + 1
		end
		if lastn == 2 then
			local a, b = strbyte(str, n-1), strbyte(str, n)
			local v = a*65536 + b*256
			t[k] = strchar(encoder[extract(v,18,6)], encoder[extract(v,12,6)], encoder[extract(v,6,6)], encoder[64])
		elseif lastn == 1 then
			local v = strbyte(str, n)*65536
			t[k] = strchar(encoder[extract(v,18,6)], encoder[extract(v,12,6)], encoder[64], encoder[64])
		end
		return strconcat( t )
	end

	function base64.decode( b64, codec, usecaching )
		---@diagnostic disable-next-line: unknown-symbol
		local encoder = codec and codec.encoder or %DEFAULT_CODEC.encoder
		---@diagnostic disable-next-line: unknown-symbol
		local decoder = codec and codec.decoder or %DEFAULT_CODEC.decoder
		---@diagnostic disable-next-line: unknown-symbol, miss-exp, exp-in-action
		local extract = %extract
		local spad = strchar(encoder[64])
		local pattern = format('[^%%w%%%s%%%s%%%s]', strchar(encoder[62]), strchar(encoder[63]), spad)
		b64 = gsub(b64, pattern, '')
		local cache = usecaching and {}
		local t, k = {}, 1
		local n = strlen(b64)
		local padding = 0 + (strsub(b64, -2, -2) == spad and 1 or 0) + (strsub(b64, -1, -1) == spad and 1 or 0)
		for i = 1, padding > 0 and n-4 or n, 4 do
			local a, b, c, d = strbyte(b64, i), strbyte(b64, i+1), strbyte(b64, i+2), strbyte(b64, i+3)
			local s
			if cache then
				local v0 = a*16777216 + b*65536 + c*256 + d
				s = cache[v0]
				if not s then
					local v = decoder[a]*262144 + decoder[b]*4096 + decoder[c]*64 + decoder[d]
					s = strchar( extract(v,16,8), extract(v,8,8), extract(v,0,8))
					cache[v0] = s
				end
			else
				local v = decoder[a]*262144 + decoder[b]*4096 + decoder[c]*64 + decoder[d]
				s = strchar( extract(v,16,8), extract(v,8,8), extract(v,0,8))
			end
			t[k] = s
			k = k + 1
		end
		if padding == 1 then
			local a, b, c = strbyte(b64, n-3), strbyte(b64, n-2), strbyte(b64, n-1)
			local v = decoder[a]*262144 + decoder[b]*4096 + decoder[c]*64
			t[k] = strchar( extract(v,16,8), extract(v,8,8))
		elseif padding == 2 then
			local a, b = strbyte(b64, n-3), strbyte(b64, n-2)
			local v = decoder[a]*262144 + decoder[b]*4096
			t[k] = strchar( extract(v,16,8))
		end
		return strconcat( t )
	end

	-- assert(base64.encode("") == "")
	-- assert(base64.encode("f") == "Zg==")
	-- assert(base64.encode("fo") == "Zm8=")
	-- assert(base64.encode("foo") == "Zm9v")
	-- assert(base64.encode("foob") == "Zm9vYg==")
	-- assert(base64.encode("fooba") == "Zm9vYmE=")
	-- assert(base64.encode("foobar") == "Zm9vYmFy")

	-- assert(base64.decode("") == "")
	-- assert(base64.decode("Zg==") == "f")
	-- assert(base64.decode("Zm8=") == "fo")
	-- assert(base64.decode("Zm9v") == "foo")
	-- assert(base64.decode("Zm9vYg==") == "foob")
	-- assert(base64.decode("Zm9vYmE=") == "fooba")
	-- assert(base64.decode("Zm9vYmFy") == "foobar")
end


---------------------------------------------------------------------
-- EC Constants
-- Define all known Entity Controller constants as they are set inconsistently across IC lua files.

EC_Names = {
	[Creature_EC or 1] = "Creature_EC",
	[Animal_EC or 2] = "Animal_EC",
	[Henchman_EC or 3] = "Henchman_EC",
	[ResourceGather_EC or 4] = "ResourceGather_EC",
	[Lab_EC or 5] = "Lab_EC",
	[ResourceRenew_EC or 6] = "ResourceRenew_EC",
	[RemoteChamber_EC or 7] = "RemoteChamber_EC",
	[WaterChamber_EC or 8] = "WaterChamber_EC",
	[Aviary_EC or 9] = "Aviary_EC",
	[Projectile_EC or 12] = "Projectile_EC",
	[BrambleFence_EC or 13] = "BrambleFence_EC",
	[StinkCloud_EC or 15] = "StinkCloud_EC",
	[VetClinic_EC or 16] = "VetClinic_EC",
	[Foundry_EC or 17] = "Foundry_EC",
	[SoundBeamTower_EC or 19] = "SoundBeamTower_EC",
	[Rex_EC or 21] = "Rex_EC",
	[Lucy_EC or 22] = "Lucy_EC",
	[GenStruct_EC or 23] = "GenStruct_EC",
	[Villager_EC or 25] = "Villager_EC",
	[AntiAirTower_EC or 26] = "AntiAirTower_EC",
	[Gyrocopter_EC or 27] = "Gyrocopter_EC",
	[Fire_EC or 28] = "Fire_EC",
	[Geyser_EC or 29] = "Geyser_EC",
	[ElectricGenerator_EC or 30] = "ElectricGenerator_EC",
	[LandingPad_EC or 31] = "LandingPad_EC",
	[GeneticAmplifier_EC or 32] = "GeneticAmplifier_EC",
	[SoiledLand_EC or 33] = "SoiledLand_EC",
}

All_ECs = {}
for type, name in EC_Names do
	All_ECs[getn(All_ECs) + 1] = type
	globals()[name] = type
end

Unit_ECs = {Henchman_EC, Gyrocopter_EC, Lucy_EC, Rex_EC, Creature_EC}
Swapped_Unit_ECs = table_swapped_keys_values(Unit_ECs)

Gatherer_ECs = {Henchman_EC, Gyrocopter_EC, Lucy_EC}
Swapped_Gatherer_ECs = table_swapped_keys_values(Gatherer_ECs)

Structure_ECs = {Lab_EC, RemoteChamber_EC, WaterChamber_EC, Aviary_EC, ElectricGenerator_EC,
	ResourceRenew_EC, VetClinic_EC, Foundry_EC, AntiAirTower_EC, SoundBeamTower_EC,
	BrambleFence_EC, GeneticAmplifier_EC, LandingPad_EC}
Swapped_Structure_ECs = table_swapped_keys_values(Structure_ECs)

Chamber_ECs = {Lab_EC, RemoteChamber_EC, WaterChamber_EC, Aviary_EC}
Swapped_Chamber_ECs = table_swapped_keys_values(Chamber_ECs)

Nature_ECs = {Animal_EC, Villager_EC, GenStruct_EC, ResourceGather_EC, Geyser_EC, Fire_EC}
Swapped_Nature_ECs = table_swapped_keys_values(Nature_ECs)


---------------------------------------------------------------------
-- EC functions

get_ec_name = function(type)
	return EC_Names[type]
end

is_unit_ec = function(type)
	return Swapped_Unit_ECs[type] ~= nil and 1 or 0
end

is_gatherer_ec = function(type)
	return Swapped_Gatherer_ECs[type] ~= nil and 1 or 0
end

is_structure_ec = function(type)
	return Swapped_Structure_ECs[type] ~= nil and 1 or 0
end

is_chamber_ec = function(type)
	return Swapped_Chamber_ECs[type] ~= nil and 1 or 0
end

is_nature_ec = function(type)
	return Swapped_Nature_ECs[type] ~= nil and 1 or 0
end


---------------------------------------------------------------------
-- entities

_load_entity_attributes_files = {
	[Creature_EC] = "data:art/ebps/defstats.lua",
	[Animal_EC] = "data:art/ebps/defstats2.lua",
	[Henchman_EC] = "data:art/ebps/gatherers/henchmen.lua", -- defstats3
	[ResourceGather_EC] = "data:art/ebps/defstats4.lua",
	[Lab_EC] = "data:art/ebps/defstats5.lua",
	[ResourceRenew_EC] = "data:art/ebps/defstats6.lua",
	[RemoteChamber_EC] = "data:art/ebps/defstats7.lua",
	[WaterChamber_EC] = "data:art/ebps/defstats8.lua",
	[Aviary_EC] = "data:art/ebps/defstats9.lua",
	[BrambleFence_EC] = "data:art/ebps/defstats13.lua",
	[VetClinic_EC] = "data:art/ebps/defstats16.lua",
	[Foundry_EC] = "data:art/ebps/defstats17.lua",
	[SoundBeamTower_EC] = "data:art/ebps/defstats19.lua",
	[Rex_EC] = "data:art/ebps/characters/rex.lua",
	[Lucy_EC] = "data:art/ebps/characters/lucy_willing.lua",
	[AntiAirTower_EC] = "data:art/ebps/defstats26.lua",
	[Gyrocopter_EC] = "data:art/ebps/defstats27.lua",
	[Fire_EC] = "data:art/ebps/defstats28.lua",
	[Geyser_EC] = "data:art/ebps/defstats29.lua",
	[ElectricGenerator_EC] = "data:art/ebps/defstats30.lua",
	[LandingPad_EC] = "data:art/ebps/defstats31.lua",
	[GeneticAmplifier_EC] = "data:art/ebps/defstats32.lua",
}
_load_entity_attributes_cache = {}
load_entity_attributes = function(ectype)
	local file = not tonumber(ectype) and ectype or _load_entity_attributes_files[ectype]
	if not file then
		return
	end

	local cached = _load_entity_attributes_cache[file]
	if cached then
		return cached
	end

	gameattributes = nil
	dofilepath(file)

	_load_entity_attributes_cache[file] = gameattributes
	return gameattributes
end


---------------------------------------------------------------------
-- Communicator Base
-- Base for Comms classes.

CommsBase = {}

-- announce

CommsBase._announce_slot_count = 36 -- max 36

CommsBase._announce_encode = function(msg)
	return base64.encode(msg)
end

CommsBase._announce_decode = function(encoded)
	return base64.decode(encoded)
end

-- uienable

CommsBase._uienable_bit_offset = 3 -- bits 0 - 2 are used by the game

CommsBase._uienable_slot_buffer_offset = 10000
CommsBase._uienable_slot_buffer_size = 1024

CommsBase._uienable_encode, CommsBase._uienable_decode = gsub_make_escape_functions("`", {
	["\0"] = "0"
})

CommsBase._get_slot_offset = function(slot)
	return slot * CommsBase._uienable_slot_buffer_offset
end


---------------------------------------------------------------------
-- Timer
-- Provide timer and interval utilities.

Timer = {}

Timer._now = 1
Timer._callbacks = {}
Timer._callback_keys = {}

--
-- Get current time.
--
-- return: Current time.
Timer.now = function()
	return Timer._now
end

--
-- Advance time by given count or 1 and call callback functions.
--
Timer.update = function(count)
	Timer.set(Timer._now + ((count or 0) > 0 and count or 1))
end

--
-- Set time and call callback functions.
--
Timer.set = function(now)
	if now <= Timer._now then
		return
	end

	local callbacks = Timer._callbacks
	local keys = Timer._callback_keys
	Timer._now = tonumber(now)

	local removed = 0
	-- local called = 0 --DEBUG
	-- local dbgtxt = "" --DEBUG
	for i = 1, getn(keys) do
		local name = keys[i]
		if removed > 0 then
			keys[i] = nil
			keys[i - removed] = name
		end

		local item = name ~= nil and callbacks[name] or nil
		if item == nil then
			-- dbgtxt = dbgtxt .. "NIL" --DEBUG
			removed = removed + 1

		elseif item.interval > 0 then
			if item.time + item.interval - now <= 0 then
				-- dbgtxt = dbgtxt .. " (" .. item.interval .. ") " .. name --DEBUG
				-- called = called + 1 --DEBUG
				item.time = now
				call(item.callback, item.args, "x")
			end

		else -- item.interval <= 0
			if item.time - item.interval - now <= 0 then
				-- dbgtxt = dbgtxt .. "(" .. item.interval .. ") " .. name --DEBUG
				-- called = called + 1 --DEBUG
				callbacks[name] = nil
				keys[i] = nil
				removed = removed + 1
				call(item.callback, item.args, "x")
			end
		end
	end

	-- if called > 0 then --DEBUG
		-- dbgtxt = ("Timer.set: time: " .. now .. ", count: " .. getn(keys) --DEBUG
			-- .. ", called (" .. called .. "):" .. dbgtxt) --DEBUG
		-- print(dbgtxt) --DEBUG
	-- end --DEBUG
end

--
-- Register or update callback.
--
-- args:
--   name: Unique name of the callback.
--   callback: Callback function.
--   args: List of arguments for the callback function or nil.
--   interval: Interval in which to call the callback function. Treated as deley if negative or 0.
--   overwrite: Overwrite callbacks with same name if equals 1. Defaults to 1.
--
Timer.register = function(name, callback, args, interval, overwrite)
	if Timer._callbacks[name] ~= nil then
		if (overwrite or 1) ~= 1 then
			return
		end
	else
		Timer._callback_keys[getn(Timer._callback_keys) + 1] = name
	end

	Timer._callbacks[name] = {
		callback = callback,
		args = args or {},
		interval = tonumber(interval) or 0,
		time = Timer._now,
	}

	-- print("Timer.register: name: " .. name .. ", interval: " .. interval .. ", time: " .. Timer._now) --DEBUG
end

-- Same as: Timer.register(...); call(callback, args or {}, "x")
Timer.call_register = function(name, callback, args, interval, overwrite)
	Timer.register(name, callback, args, interval, overwrite)
	call(callback, args or {}, "x")
end

--
-- Unregister callback name.
--
Timer.unregister = function(name)
	local callbacks = Timer._callbacks
	local keys = Timer._callback_keys
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
Timer.is_registered = function(name)
	return Timer._callback_keys[name] ~= nil and 1 or 0
end

--
-- Clear timer callbacks.
--
Timer.clear = function()
	Timer._callbacks = {}
	Timer._callback_keys = {}
end


---------------------------------------------------------------------
-- Logging

logging = {}

logging.log = function(msg)
	_ALERT(msg)
	-- print(msg)
end

logging.debug = function(msg) logging.log("DEBUG: " .. tostring(msg)) end
logging.info = function(msg) logging.log("INFO: " .. tostring(msg)) end
logging.warn = function(msg) logging.log("WARNING: " .. tostring(msg)) end
logging.error = function(msg) logging.log("ERROR: " .. tostring(msg)) end
