-----------------
-----------------
----functions----
-----------------
-----------------

--makes things easier innit
function setattribute( attribute_string, value )
    setgameattribute(attribute_string,value);
    setuiattribute(attribute_string,value);
end

function Ln(z)
    local s = 0;
    local b = (z-1)/(z+1);
    local b2 = b * b;
    for i = 1, 100, 2 do
        s = s + (1 / i) * b;
        b = b * b2;
    end

    return 2 * s;
end

function Calculate_sum(h, b)
    local sum = 0;
    local increment = 0.01;
    
    for i = 1, (h - b) do
        sum = sum + increment
        increment = increment + 0.01
        if increment > 0.7 then
            increment = 0.7
        end
    end
    
    return sum;
end

function Attr(attribute_string)
    if attribute_string == "null" then
        return(1);
    else
        return getgameattribute(attribute_string);
    end
end

-- Find where x falls in the array of ranges.
function Rank( x, rank_upper_bounds )
    local i = 1;
    while rank_upper_bounds[i] do
        if x <= rank_upper_bounds[i] then
            return i;
        end
        i = i + 1;
    end
    return i;
end

--power equation
function Power(ehp_in, damage_in, rank_in)
    rank_in = rank_in or 0
    if rank_in == 0
    then
        return (ehp_in^0.610)*((0.20*damage_in) + 2.8);
    end
    return (ehp_in^0.610)*((0.20*damage_in) + 2.8)+(ehp_in^(0.6+((0.16- (0.03 * rank_in))*rank_in))/rank_in) + Calculate_sum(ehp_in, (rank_in) * 125 );
end

--Shape Value Equation
--x_domain is the linked value-maximum pair for the x axis unit.
--y_domain is the linked value-maximum pair for the y axis unit.
--x0y0 is the value where x = y = 0
--x1y0 is the value of the function at x1 and y0
--x0y1 is the value of the function at x0 and y1
--x1y1 is the value of the function at x1 and y1

dom_max = 1;
dom_val = 2;

function ShapeValueCurve(x_domain, y_domain, x0y0, x1y0, x0y1, x1y1)
    if x_domain == null_domain and y_domain == null_domain then
        return(x0y0);
    else
        --Shape factor is the amount by which the result is increased or decreased due to synergy between the x and y values.
        shape_factor = (Attr(x_domain[dom_val]) * Attr(y_domain[dom_val])) * (x1y1 - x1y0 - x0y1) /
                (x_domain[dom_max] * y_domain[dom_max]);

        return
        (
                shape_factor
                        + ((x1y0 - x0y0) / x_domain[dom_max]) * Attr(x_domain[dom_val]) --This is the contribution to the final value from the x domain value.
                        + ((x0y1 - x0y0) / y_domain[dom_max]) * Attr(y_domain[dom_val]) --This is the contribution to the final value from the y domain value.
                        + x0y0 + ((Attr(x_domain[dom_val]) * Attr(y_domain[dom_val]) * x0y0) / (x_domain[dom_max] * y_domain[dom_max])) --This offsets the value based on x0y0.
        );
    end
end

function get_range_var( limb, var )
    local str = "range"..limb.."_"..var

    if checkgameattribute(str) == 1 then
        return Attr( str )
    else
        return 0;
    end
end

function range_artillerytype( limb )
    -- if this creature has a special field it has artillery
    return get_range_var( limb, "special");
end

--function Scale(start, max, endx, size, offset)
 --   local z = (endx-start) / offset;
 --   
 --   local s = 0;
 --   local b = (z-1)/(z+1);
  --  local b2 = b * b;
  --  for i = 1, 100, 2 do
  --      s = s + (1 / i) * b;
  ---      b = b * b2;
  --  end
--
 --   local v = 2 * s / endx;
 --   local za = v*endx;
 --   local sum = 1;
 --   local term = 1;
--
 --   for i = 1, 100 do -- 100 terms should give a reasonable approximation
 --       term = term * za / i;
 --       sum = sum + term;
 --   end
 --   return sum*offset;
--end

