var highs = await require("highs")();

highs.solve(`Maximize
 obj: x + 2 y
Subject To
 c1: x + y <= 20
 c2: x - y >= -30
Bounds
 0 <= x
 0 <= y
End`)