--
-- desc: functions to aid in my attemps to clean up my new cost equations
-- auth: Banana
-- date: 4/15/24
-- file: data:attr_functions2.lua
--



-- function: min(arg1,arg2)
-- returns the smaller value
-- arg1:int, arg2:int
function min(arg1,arg2) --[[ -> int --]]
    -- if missing an input: assumes value is 1
    arg1 = arg1 or 1;
    arg2 = arg2 or 1;
    if arg1 < arg2 
    then
        return arg1;
    else
        return arg2;
    end
end

-- function: max(arg1,arg2)
-- returns the larger value

function max(arg1,arg2) 
    -- if missing an input: assumes value is 1
    arg1 = arg1 or 1;
    arg2 = arg2 or 1;
    if arg1 > arg2 
    then
        return arg1;
    else
        return arg2;
    end
end

function abs(num)
    x = 0-num
    if num < 0
    then 
        return x;
    else
        return num;
    end
end