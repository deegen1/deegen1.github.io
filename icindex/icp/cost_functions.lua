--
-- desc: functions to aid in my attemps to clean up my new cost equations
-- auth: Banana
-- date: 4/15/24
-- file: data:attr_functions2.lua
--

dofilepath("data:attr_functions2.lua")

-- function glass_if(dmg,rank)
-- cost changes for melee per level...defining resonable boundries and scaling
-- desmos:\max\left(\left(\frac{\left(\min\left(1.2,\frac{4.4}{\min\left(x,4\right)}\right)^{x}\right)}{w^{\max\left(1,w-3\right)}\cdot1.2}\cdot\max\left(1,\frac{w}{4}\right)\right),1\right)
-- w = 1-5
function glass_if(dmg,rank)
    local glass_if_val = max(1,(((min(1.2,(4.4/(min(dmg,4))))^dmg)/((rank^(max(rank-3,1)))*1.2*max(1,rank-3.5))) * max((rank/4),1)));
    return glass_if_val;
end

-- function range_comp(melee,range,rank)
-- comps for having higher range than melee
-- desmos:y\cdot\min\left(x-y,1\right)
function range_comp(melee,range,rank)
    if (range-melee) > 2
    then
        return (1.2*melee);
    else
        return 0;
    end
end

--function meat_comp(melee,ehp,rank)
-- comps for having more health
-- desmos:\min\left(1.8,\max\left(1,.2\left(-0.00005\left(x-140\cdot\frac{1}{2}w^{2}\right)^{2}+4\cdot\frac{1}{2}w^{2}\right)\right)\right)
function meat_comp(melee,range,rank)
    x = ( 1.4 * melee);
    if (melee+range) < (1+(rank * 0.5 * rank))
    then 
        return x;
    else
        return 0;
    end
end

function level_tune(rank)
    if rank > 2
    then 
        return (1+rank/5);
    else 
        return 1;
    end
end

function mid_melee(melee,range,rank)
    if glass_if(melee+range,rank) == 1 or rank == 1
    then 
        return 1.4;
    else
        return 1;
    end
end

function extra_rank(rank)
    if rank == 4
    then 
        return 1.5;
    end
    if rank == 5
    then 
        return 1.7;
    end
    return 1;
end