\* Problem: life_goe *\

Minimize
 obj: 0 x(1,3)

Subject To
 maincons(1,2): + 2 x(1,3) + 2 x(1,1) + 2 x(2,2) + 2 x(0,2) + 2 x(2,3)
 + 2 x(0,3) + 2 x(2,1) + 2 x(0,1) + x(1,2) - dpos(1,2) + dneg(1,2) = 6
 maincons(1,4): + 2 x(1,3) + 2 x(2,3) + 2 x(0,3) + 2 x(1,5) + 2 x(2,4)
 + 2 x(0,4) + 2 x(2,5) + 2 x(0,5) + x(1,4) - dpos(1,4) + dneg(1,4) = 6
 maincons(1,5): + x(1,5) + 2 x(2,4) + 2 x(0,4) + 2 x(2,5) + 2 x(0,5)
 + 2 x(1,4) + 2 x(1,6) + 2 x(2,6) + 2 x(0,6) - dpos(1,5) + dneg(1,5) = 6
 maincons(1,6): + 2 x(1,5) + 2 x(2,5) + 2 x(0,5) + x(1,6) + 2 x(2,6)
 + 2 x(0,6) + 2 x(1,7) + 2 x(2,7) + 2 x(0,7) - dpos(1,6) + dneg(1,6) = 6
 maincons(1,8): + 2 x(1,7) + 2 x(2,7) + 2 x(0,7) + 2 x(1,9) + 2 x(2,8)
 + 2 x(0,8) + 2 x(2,9) + 2 x(0,9) + x(1,8) - dpos(1,8) + dneg(1,8) = 6
 maincons(2,3): + 2 x(1,3) + 2 x(2,2) + x(2,3) + 2 x(1,2) + 2 x(2,4)
 + 2 x(1,4) + 2 x(3,3) + 2 x(3,4) + 2 x(3,2) - dpos(2,3) + dneg(2,3) = 6
 maincons(2,5): + 2 x(1,5) + 2 x(2,4) + x(2,5) + 2 x(1,4) + 2 x(1,6)
 + 2 x(2,6) + 2 x(3,4) + 2 x(3,5) + 2 x(3,6) - dpos(2,5) + dneg(2,5) = 6
 maincons(2,7): + 2 x(1,6) + 2 x(2,6) + 2 x(1,7) + x(2,7) + 2 x(2,8)
 + 2 x(1,8) + 2 x(3,6) + 2 x(3,7) + 2 x(3,8) - dpos(2,7) + dneg(2,7) = 6
 maincons(2,10): + 2 x(1,9) + 2 x(2,9) + 2 x(2,11) + 2 x(3,10)
 + 2 x(1,10) + 2 x(3,11) + 2 x(1,11) + 2 x(3,9) + x(2,10) - dpos(2,10)
 + dneg(2,10) = 6
 maincons(3,1): + 2 x(2,2) + 2 x(2,1) + 2 x(3,2) + 2 x(3,0) + 2 x(4,1)
 + 2 x(4,2) + 2 x(4,0) + 2 x(2,0) + x(3,1) - dpos(3,1) + dneg(3,1) = 6
 maincons(3,3): + 2 x(2,2) + 2 x(2,3) + 2 x(2,4) + x(3,3) + 2 x(3,4)
 + 2 x(3,2) + 2 x(4,2) + 2 x(4,3) + 2 x(4,4) - dpos(3,3) + dneg(3,3) = 6
 maincons(3,4): + 2 x(2,3) + 2 x(2,4) + 2 x(2,5) + 2 x(3,3) + x(3,4)
 + 2 x(3,5) + 2 x(4,3) + 2 x(4,4) + 2 x(4,5) - dpos(3,4) + dneg(3,4) = 6
 maincons(3,5): + 2 x(2,4) + 2 x(2,5) + 2 x(2,6) + 2 x(3,4) + x(3,5)
 + 2 x(3,6) + 2 x(4,4) + 2 x(4,5) + 2 x(4,6) - dpos(3,5) + dneg(3,5) = 6
 maincons(3,8): + 2 x(2,7) + 2 x(2,8) + 2 x(2,9) + 2 x(3,7) + x(3,8)
 + 2 x(3,9) + 2 x(4,8) + 2 x(4,9) + 2 x(4,7) - dpos(3,8) + dneg(3,8) = 6
 maincons(3,9): + 2 x(2,8) + 2 x(2,9) + 2 x(3,8) + 2 x(3,10) + x(3,9)
 + 2 x(2,10) + 2 x(4,8) + 2 x(4,9) + 2 x(4,10) - dpos(3,9) + dneg(3,9)
 = 6
 maincons(4,2): + 2 x(3,3) + 2 x(3,2) + 2 x(4,1) + x(4,2) + 2 x(3,1)
 + 2 x(4,3) + 2 x(5,2) + 2 x(5,3) + 2 x(5,1) - dpos(4,2) + dneg(4,2) = 6
 maincons(4,4): + 2 x(3,3) + 2 x(3,4) + 2 x(3,5) + 2 x(4,3) + x(4,4)
 + 2 x(4,5) + 2 x(5,3) + 2 x(5,4) + 2 x(5,5) - dpos(4,4) + dneg(4,4) = 6
 maincons(4,5): + 2 x(3,4) + 2 x(3,5) + 2 x(3,6) + 2 x(4,4) + x(4,5)
 + 2 x(4,6) + 2 x(5,4) + 2 x(5,5) + 2 x(5,6) - dpos(4,5) + dneg(4,5) = 6
 maincons(4,6): + 2 x(3,5) + 2 x(3,6) + 2 x(3,7) + 2 x(4,5) + x(4,6)
 + 2 x(4,7) + 2 x(5,5) + 2 x(5,6) + 2 x(5,7) - dpos(4,6) + dneg(4,6) = 6
 maincons(4,7): + 2 x(3,6) + 2 x(3,7) + 2 x(3,8) + 2 x(4,6) + 2 x(4,8)
 + x(4,7) + 2 x(5,6) + 2 x(5,7) + 2 x(5,8) - dpos(4,7) + dneg(4,7) = 6
 maincons(4,8): + 2 x(3,7) + 2 x(3,8) + 2 x(3,9) + x(4,8) + 2 x(4,9)
 + 2 x(4,7) + 2 x(5,7) + 2 x(5,8) + 2 x(5,9) - dpos(4,8) + dneg(4,8) = 6
 maincons(4,10): + 2 x(3,10) + 2 x(3,11) + 2 x(3,9) + 2 x(4,9) + x(4,10)
 + 2 x(5,9) + 2 x(4,11) + 2 x(5,10) + 2 x(5,11) - dpos(4,10)
 + dneg(4,10) = 6
 maincons(5,1): + 2 x(4,1) + 2 x(4,2) + 2 x(4,0) + 2 x(5,2) + x(5,1)
 + 2 x(5,0) + 2 x(6,1) + 2 x(6,2) + 2 x(6,0) - dpos(5,1) + dneg(5,1) = 6
 maincons(5,4): + 2 x(4,3) + 2 x(4,4) + 2 x(4,5) + 2 x(5,3) + x(5,4)
 + 2 x(5,5) + 2 x(6,4) + 2 x(6,5) + 2 x(6,3) - dpos(5,4) + dneg(5,4) = 6
 maincons(5,7): + 2 x(4,6) + 2 x(4,8) + 2 x(4,7) + 2 x(5,6) + x(5,7)
 + 2 x(5,8) + 2 x(6,7) + 2 x(6,8) + 2 x(6,6) - dpos(5,7) + dneg(5,7) = 6
 maincons(5,8): + 2 x(4,8) + 2 x(4,9) + 2 x(4,7) + 2 x(5,7) + x(5,8)
 + 2 x(5,9) + 2 x(6,7) + 2 x(6,8) + 2 x(6,9) - dpos(5,8) + dneg(5,8) = 6
 maincons(5,9): + 2 x(4,8) + 2 x(4,9) + 2 x(4,10) + 2 x(5,8) + x(5,9)
 + 2 x(5,10) + 2 x(6,8) + 2 x(6,9) + 2 x(6,10) - dpos(5,9) + dneg(5,9)
 = 6
 maincons(5,10): + 2 x(4,9) + 2 x(4,10) + 2 x(5,9) + 2 x(4,11) + x(5,10)
 + 2 x(5,11) + 2 x(6,9) + 2 x(6,10) + 2 x(6,11) - dpos(5,10)
 + dneg(5,10) = 6
 maincons(6,1): + 2 x(5,2) + 2 x(5,1) + 2 x(5,0) + x(6,1) + 2 x(6,2)
 + 2 x(6,0) + 2 x(7,1) + 2 x(7,2) + 2 x(7,0) - dpos(6,1) + dneg(6,1) = 6
 maincons(6,2): + 2 x(5,2) + 2 x(5,3) + 2 x(5,1) + 2 x(6,1) + x(6,2)
 + 2 x(6,3) + 2 x(7,1) + 2 x(7,2) + 2 x(7,3) - dpos(6,2) + dneg(6,2) = 6
 maincons(6,3): + 2 x(5,2) + 2 x(5,3) + 2 x(5,4) + 2 x(6,2) + 2 x(6,4)
 + x(6,3) + 2 x(7,2) + 2 x(7,3) + 2 x(7,4) - dpos(6,3) + dneg(6,3) = 6
 maincons(6,4): + 2 x(5,3) + 2 x(5,4) + 2 x(5,5) + x(6,4) + 2 x(6,5)
 + 2 x(6,3) + 2 x(7,3) + 2 x(7,4) + 2 x(7,5) - dpos(6,4) + dneg(6,4) = 6
 maincons(6,7): + 2 x(5,6) + 2 x(5,7) + 2 x(5,8) + x(6,7) + 2 x(6,8)
 + 2 x(6,6) + 2 x(7,7) + 2 x(7,8) + 2 x(7,6) - dpos(6,7) + dneg(6,7) = 6
 maincons(6,10): + 2 x(5,9) + 2 x(5,10) + 2 x(5,11) + 2 x(6,9) + x(6,10)
 + 2 x(6,11) + 2 x(7,10) + 2 x(7,11) + 2 x(7,9) - dpos(6,10)
 + dneg(6,10) = 6
 maincons(7,1): + 2 x(6,1) + 2 x(6,2) + 2 x(6,0) + x(7,1) + 2 x(7,2)
 + 2 x(7,0) + 2 x(8,1) + 2 x(8,2) + 2 x(8,0) - dpos(7,1) + dneg(7,1) = 6
 maincons(7,3): + 2 x(6,2) + 2 x(6,4) + 2 x(6,3) + 2 x(7,2) + x(7,3)
 + 2 x(7,4) + 2 x(8,2) + 2 x(8,3) + 2 x(8,4) - dpos(7,3) + dneg(7,3) = 6
 maincons(7,4): + 2 x(6,4) + 2 x(6,5) + 2 x(6,3) + 2 x(7,3) + x(7,4)
 + 2 x(7,5) + 2 x(8,3) + 2 x(8,4) + 2 x(8,5) - dpos(7,4) + dneg(7,4) = 6
 maincons(7,5): + 2 x(6,4) + 2 x(6,5) + 2 x(6,6) + 2 x(7,4) + x(7,5)
 + 2 x(7,6) + 2 x(8,4) + 2 x(8,5) + 2 x(8,6) - dpos(7,5) + dneg(7,5) = 6
 maincons(7,6): + 2 x(6,5) + 2 x(6,7) + 2 x(6,6) + 2 x(7,5) + 2 x(7,7)
 + x(7,6) + 2 x(8,5) + 2 x(8,6) + 2 x(8,7) - dpos(7,6) + dneg(7,6) = 6
 maincons(7,7): + 2 x(6,7) + 2 x(6,8) + 2 x(6,6) + x(7,7) + 2 x(7,8)
 + 2 x(7,6) + 2 x(8,6) + 2 x(8,7) + 2 x(8,8) - dpos(7,7) + dneg(7,7) = 6
 maincons(7,9): + 2 x(6,8) + 2 x(6,9) + 2 x(6,10) + 2 x(7,8) + 2 x(7,10)
 + x(7,9) + 2 x(8,8) + 2 x(8,9) + 2 x(8,10) - dpos(7,9) + dneg(7,9) = 6
 maincons(1,1): + x(1,1) + 2 x(2,2) + 2 x(0,2) + 2 x(2,1) + 2 x(0,1)
 + 2 x(1,2) + 2 x(2,0) + 2 x(1,0) + 2 x(0,0) - dpos(1,1) + dneg(1,1) = 6
 maincons(1,3): + x(1,3) + 2 x(2,2) + 2 x(0,2) + 2 x(2,3) + 2 x(0,3)
 + 2 x(1,2) + 2 x(2,4) + 2 x(0,4) + 2 x(1,4) - dpos(1,3) + dneg(1,3) = 6
 maincons(1,7): + 2 x(1,6) + 2 x(2,6) + 2 x(0,6) + x(1,7) + 2 x(2,7)
 + 2 x(0,7) + 2 x(2,8) + 2 x(0,8) + 2 x(1,8) - dpos(1,7) + dneg(1,7) = 6
 maincons(1,9): + x(1,9) + 2 x(2,8) + 2 x(0,8) + 2 x(2,9) + 2 x(0,9)
 + 2 x(1,8) + 2 x(1,10) + 2 x(2,10) + 2 x(0,10) - dpos(1,9) + dneg(1,9)
 = 6
 maincons(1,10): + 2 x(1,9) + 2 x(2,9) + 2 x(0,9) + 2 x(2,11) + x(1,10)
 + 2 x(1,11) + 2 x(2,10) + 2 x(0,10) + 2 x(0,11) - dpos(1,10)
 + dneg(1,10) = 6
 maincons(2,1): + 2 x(1,1) + 2 x(2,2) + x(2,1) + 2 x(1,2) + 2 x(3,2)
 + 2 x(3,0) + 2 x(2,0) + 2 x(3,1) + 2 x(1,0) - dpos(2,1) + dneg(2,1) = 6
 maincons(2,2): + 2 x(1,3) + 2 x(1,1) + x(2,2) + 2 x(2,3) + 2 x(2,1)
 + 2 x(1,2) + 2 x(3,3) + 2 x(3,2) + 2 x(3,1) - dpos(2,2) + dneg(2,2) = 6
 maincons(2,4): + 2 x(1,3) + 2 x(2,3) + 2 x(1,5) + x(2,4) + 2 x(2,5)
 + 2 x(1,4) + 2 x(3,3) + 2 x(3,4) + 2 x(3,5) - dpos(2,4) + dneg(2,4) = 6
 maincons(2,6): + 2 x(1,5) + 2 x(2,5) + 2 x(1,6) + x(2,6) + 2 x(1,7)
 + 2 x(2,7) + 2 x(3,5) + 2 x(3,6) + 2 x(3,7) - dpos(2,6) + dneg(2,6) = 6
 maincons(2,8): + 2 x(1,7) + 2 x(2,7) + 2 x(1,9) + x(2,8) + 2 x(2,9)
 + 2 x(1,8) + 2 x(3,7) + 2 x(3,8) + 2 x(3,9) - dpos(2,8) + dneg(2,8) = 6
 maincons(2,9): + 2 x(1,9) + 2 x(2,8) + x(2,9) + 2 x(1,8) + 2 x(3,8)
 + 2 x(3,10) + 2 x(1,10) + 2 x(3,9) + 2 x(2,10) - dpos(2,9) + dneg(2,9)
 = 6
 maincons(3,2): + 2 x(2,2) + 2 x(2,3) + 2 x(2,1) + 2 x(3,3) + x(3,2)
 + 2 x(4,1) + 2 x(4,2) + 2 x(3,1) + 2 x(4,3) - dpos(3,2) + dneg(3,2) = 6
 maincons(3,6): + 2 x(2,5) + 2 x(2,6) + 2 x(2,7) + 2 x(3,5) + x(3,6)
 + 2 x(3,7) + 2 x(4,5) + 2 x(4,6) + 2 x(4,7) - dpos(3,6) + dneg(3,6) = 6
 maincons(3,7): + 2 x(2,6) + 2 x(2,7) + 2 x(2,8) + 2 x(3,6) + x(3,7)
 + 2 x(3,8) + 2 x(4,6) + 2 x(4,8) + 2 x(4,7) - dpos(3,7) + dneg(3,7) = 6
 maincons(3,10): + 2 x(2,9) + 2 x(2,11) + x(3,10) + 2 x(3,11) + 2 x(3,9)
 + 2 x(2,10) + 2 x(4,9) + 2 x(4,10) + 2 x(4,11) - dpos(3,10)
 + dneg(3,10) = 6
 maincons(4,1): + 2 x(3,2) + 2 x(3,0) + x(4,1) + 2 x(4,2) + 2 x(4,0)
 + 2 x(3,1) + 2 x(5,2) + 2 x(5,1) + 2 x(5,0) - dpos(4,1) + dneg(4,1) = 6
 maincons(4,3): + 2 x(3,3) + 2 x(3,4) + 2 x(3,2) + 2 x(4,2) + x(4,3)
 + 2 x(4,4) + 2 x(5,2) + 2 x(5,3) + 2 x(5,4) - dpos(4,3) + dneg(4,3) = 6
 maincons(4,9): + 2 x(3,8) + 2 x(3,10) + 2 x(3,9) + 2 x(4,8) + x(4,9)
 + 2 x(4,10) + 2 x(5,8) + 2 x(5,9) + 2 x(5,10) - dpos(4,9) + dneg(4,9)
 = 6
 maincons(5,2): + 2 x(4,1) + 2 x(4,2) + 2 x(4,3) + x(5,2) + 2 x(5,3)
 + 2 x(5,1) + 2 x(6,1) + 2 x(6,2) + 2 x(6,3) - dpos(5,2) + dneg(5,2) = 6
 maincons(5,3): + 2 x(4,2) + 2 x(4,3) + 2 x(4,4) + 2 x(5,2) + x(5,3)
 + 2 x(5,4) + 2 x(6,2) + 2 x(6,4) + 2 x(6,3) - dpos(5,3) + dneg(5,3) = 6
 maincons(5,5): + 2 x(4,4) + 2 x(4,5) + 2 x(4,6) + 2 x(5,4) + x(5,5)
 + 2 x(5,6) + 2 x(6,4) + 2 x(6,5) + 2 x(6,6) - dpos(5,5) + dneg(5,5) = 6
 maincons(5,6): + 2 x(4,5) + 2 x(4,6) + 2 x(4,7) + 2 x(5,5) + x(5,6)
 + 2 x(5,7) + 2 x(6,5) + 2 x(6,7) + 2 x(6,6) - dpos(5,6) + dneg(5,6) = 6
 maincons(6,5): + 2 x(5,4) + 2 x(5,5) + 2 x(5,6) + 2 x(6,4) + x(6,5)
 + 2 x(6,6) + 2 x(7,4) + 2 x(7,5) + 2 x(7,6) - dpos(6,5) + dneg(6,5) = 6
 maincons(6,6): + 2 x(5,5) + 2 x(5,6) + 2 x(5,7) + 2 x(6,5) + 2 x(6,7)
 + x(6,6) + 2 x(7,5) + 2 x(7,7) + 2 x(7,6) - dpos(6,6) + dneg(6,6) = 6
 maincons(6,8): + 2 x(5,7) + 2 x(5,8) + 2 x(5,9) + 2 x(6,7) + x(6,8)
 + 2 x(6,9) + 2 x(7,7) + 2 x(7,8) + 2 x(7,9) - dpos(6,8) + dneg(6,8) = 6
 maincons(6,9): + 2 x(5,8) + 2 x(5,9) + 2 x(5,10) + 2 x(6,8) + x(6,9)
 + 2 x(6,10) + 2 x(7,8) + 2 x(7,10) + 2 x(7,9) - dpos(6,9) + dneg(6,9)
 = 6
 maincons(7,2): + 2 x(6,1) + 2 x(6,2) + 2 x(6,3) + 2 x(7,1) + x(7,2)
 + 2 x(7,3) + 2 x(8,1) + 2 x(8,2) + 2 x(8,3) - dpos(7,2) + dneg(7,2) = 6
 maincons(7,8): + 2 x(6,7) + 2 x(6,8) + 2 x(6,9) + 2 x(7,7) + x(7,8)
 + 2 x(7,9) + 2 x(8,7) + 2 x(8,8) + 2 x(8,9) - dpos(7,8) + dneg(7,8) = 6
 maincons(7,10): + 2 x(6,9) + 2 x(6,10) + 2 x(6,11) + x(7,10)
 + 2 x(7,11) + 2 x(7,9) + 2 x(8,9) + 2 x(8,10) + 2 x(8,11) - dpos(7,10)
 + dneg(7,10) = 6
 posbound(1,2): + dpos(1,2) - 11 dposup(1,2) <= -0
 posbound(1,4): + dpos(1,4) - 11 dposup(1,4) <= -0
 posbound(1,5): + dpos(1,5) - 11 dposup(1,5) <= -0
 posbound(1,6): + dpos(1,6) - 11 dposup(1,6) <= -0
 posbound(1,8): + dpos(1,8) - 11 dposup(1,8) <= -0
 posbound(2,3): + dpos(2,3) - 11 dposup(2,3) <= -0
 posbound(2,5): + dpos(2,5) - 11 dposup(2,5) <= -0
 posbound(2,7): + dpos(2,7) - 11 dposup(2,7) <= -0
 posbound(2,10): + dpos(2,10) - 11 dposup(2,10) <= -0
 posbound(3,1): + dpos(3,1) - 11 dposup(3,1) <= -0
 posbound(3,3): + dpos(3,3) - 11 dposup(3,3) <= -0
 posbound(3,4): + dpos(3,4) - 11 dposup(3,4) <= -0
 posbound(3,5): + dpos(3,5) - 11 dposup(3,5) <= -0
 posbound(3,8): + dpos(3,8) - 11 dposup(3,8) <= -0
 posbound(3,9): + dpos(3,9) - 11 dposup(3,9) <= -0
 posbound(4,2): + dpos(4,2) - 11 dposup(4,2) <= -0
 posbound(4,4): + dpos(4,4) - 11 dposup(4,4) <= -0
 posbound(4,5): + dpos(4,5) - 11 dposup(4,5) <= -0
 posbound(4,6): + dpos(4,6) - 11 dposup(4,6) <= -0
 posbound(4,7): + dpos(4,7) - 11 dposup(4,7) <= -0
 posbound(4,8): + dpos(4,8) - 11 dposup(4,8) <= -0
 posbound(4,10): + dpos(4,10) - 11 dposup(4,10) <= -0
 posbound(5,1): + dpos(5,1) - 11 dposup(5,1) <= -0
 posbound(5,4): + dpos(5,4) - 11 dposup(5,4) <= -0
 posbound(5,7): + dpos(5,7) - 11 dposup(5,7) <= -0
 posbound(5,8): + dpos(5,8) - 11 dposup(5,8) <= -0
 posbound(5,9): + dpos(5,9) - 11 dposup(5,9) <= -0
 posbound(5,10): + dpos(5,10) - 11 dposup(5,10) <= -0
 posbound(6,1): + dpos(6,1) - 11 dposup(6,1) <= -0
 posbound(6,2): + dpos(6,2) - 11 dposup(6,2) <= -0
 posbound(6,3): + dpos(6,3) - 11 dposup(6,3) <= -0
 posbound(6,4): + dpos(6,4) - 11 dposup(6,4) <= -0
 posbound(6,7): + dpos(6,7) - 11 dposup(6,7) <= -0
 posbound(6,10): + dpos(6,10) - 11 dposup(6,10) <= -0
 posbound(7,1): + dpos(7,1) - 11 dposup(7,1) <= -0
 posbound(7,3): + dpos(7,3) - 11 dposup(7,3) <= -0
 posbound(7,4): + dpos(7,4) - 11 dposup(7,4) <= -0
 posbound(7,5): + dpos(7,5) - 11 dposup(7,5) <= -0
 posbound(7,6): + dpos(7,6) - 11 dposup(7,6) <= -0
 posbound(7,7): + dpos(7,7) - 11 dposup(7,7) <= -0
 posbound(7,9): + dpos(7,9) - 11 dposup(7,9) <= -0
 posbound(1,1): + dpos(1,1) - 11 dposup(1,1) <= -0
 posbound(1,3): + dpos(1,3) - 11 dposup(1,3) <= -0
 posbound(1,7): + dpos(1,7) - 11 dposup(1,7) <= -0
 posbound(1,9): + dpos(1,9) - 11 dposup(1,9) <= -0
 posbound(1,10): + dpos(1,10) - 11 dposup(1,10) <= -0
 posbound(2,1): + dpos(2,1) - 11 dposup(2,1) <= -0
 posbound(2,2): + dpos(2,2) - 11 dposup(2,2) <= -0
 posbound(2,4): + dpos(2,4) - 11 dposup(2,4) <= -0
 posbound(2,6): + dpos(2,6) - 11 dposup(2,6) <= -0
 posbound(2,8): + dpos(2,8) - 11 dposup(2,8) <= -0
 posbound(2,9): + dpos(2,9) - 11 dposup(2,9) <= -0
 posbound(3,2): + dpos(3,2) - 11 dposup(3,2) <= -0
 posbound(3,6): + dpos(3,6) - 11 dposup(3,6) <= -0
 posbound(3,7): + dpos(3,7) - 11 dposup(3,7) <= -0
 posbound(3,10): + dpos(3,10) - 11 dposup(3,10) <= -0
 posbound(4,1): + dpos(4,1) - 11 dposup(4,1) <= -0
 posbound(4,3): + dpos(4,3) - 11 dposup(4,3) <= -0
 posbound(4,9): + dpos(4,9) - 11 dposup(4,9) <= -0
 posbound(5,2): + dpos(5,2) - 11 dposup(5,2) <= -0
 posbound(5,3): + dpos(5,3) - 11 dposup(5,3) <= -0
 posbound(5,5): + dpos(5,5) - 11 dposup(5,5) <= -0
 posbound(5,6): + dpos(5,6) - 11 dposup(5,6) <= -0
 posbound(6,5): + dpos(6,5) - 11 dposup(6,5) <= -0
 posbound(6,6): + dpos(6,6) - 11 dposup(6,6) <= -0
 posbound(6,8): + dpos(6,8) - 11 dposup(6,8) <= -0
 posbound(6,9): + dpos(6,9) - 11 dposup(6,9) <= -0
 posbound(7,2): + dpos(7,2) - 11 dposup(7,2) <= -0
 posbound(7,8): + dpos(7,8) - 11 dposup(7,8) <= -0
 posbound(7,10): + dpos(7,10) - 11 dposup(7,10) <= -0
 negbound(1,2): + dneg(1,2) - 6 dnegup(1,2) <= -0
 negbound(1,4): + dneg(1,4) - 6 dnegup(1,4) <= -0
 negbound(1,5): + dneg(1,5) - 6 dnegup(1,5) <= -0
 negbound(1,6): + dneg(1,6) - 6 dnegup(1,6) <= -0
 negbound(1,8): + dneg(1,8) - 6 dnegup(1,8) <= -0
 negbound(2,3): + dneg(2,3) - 6 dnegup(2,3) <= -0
 negbound(2,5): + dneg(2,5) - 6 dnegup(2,5) <= -0
 negbound(2,7): + dneg(2,7) - 6 dnegup(2,7) <= -0
 negbound(2,10): + dneg(2,10) - 6 dnegup(2,10) <= -0
 negbound(3,1): + dneg(3,1) - 6 dnegup(3,1) <= -0
 negbound(3,3): + dneg(3,3) - 6 dnegup(3,3) <= -0
 negbound(3,4): + dneg(3,4) - 6 dnegup(3,4) <= -0
 negbound(3,5): + dneg(3,5) - 6 dnegup(3,5) <= -0
 negbound(3,8): + dneg(3,8) - 6 dnegup(3,8) <= -0
 negbound(3,9): + dneg(3,9) - 6 dnegup(3,9) <= -0
 negbound(4,2): + dneg(4,2) - 6 dnegup(4,2) <= -0
 negbound(4,4): + dneg(4,4) - 6 dnegup(4,4) <= -0
 negbound(4,5): + dneg(4,5) - 6 dnegup(4,5) <= -0
 negbound(4,6): + dneg(4,6) - 6 dnegup(4,6) <= -0
 negbound(4,7): + dneg(4,7) - 6 dnegup(4,7) <= -0
 negbound(4,8): + dneg(4,8) - 6 dnegup(4,8) <= -0
 negbound(4,10): + dneg(4,10) - 6 dnegup(4,10) <= -0
 negbound(5,1): + dneg(5,1) - 6 dnegup(5,1) <= -0
 negbound(5,4): + dneg(5,4) - 6 dnegup(5,4) <= -0
 negbound(5,7): + dneg(5,7) - 6 dnegup(5,7) <= -0
 negbound(5,8): + dneg(5,8) - 6 dnegup(5,8) <= -0
 negbound(5,9): + dneg(5,9) - 6 dnegup(5,9) <= -0
 negbound(5,10): + dneg(5,10) - 6 dnegup(5,10) <= -0
 negbound(6,1): + dneg(6,1) - 6 dnegup(6,1) <= -0
 negbound(6,2): + dneg(6,2) - 6 dnegup(6,2) <= -0
 negbound(6,3): + dneg(6,3) - 6 dnegup(6,3) <= -0
 negbound(6,4): + dneg(6,4) - 6 dnegup(6,4) <= -0
 negbound(6,7): + dneg(6,7) - 6 dnegup(6,7) <= -0
 negbound(6,10): + dneg(6,10) - 6 dnegup(6,10) <= -0
 negbound(7,1): + dneg(7,1) - 6 dnegup(7,1) <= -0
 negbound(7,3): + dneg(7,3) - 6 dnegup(7,3) <= -0
 negbound(7,4): + dneg(7,4) - 6 dnegup(7,4) <= -0
 negbound(7,5): + dneg(7,5) - 6 dnegup(7,5) <= -0
 negbound(7,6): + dneg(7,6) - 6 dnegup(7,6) <= -0
 negbound(7,7): + dneg(7,7) - 6 dnegup(7,7) <= -0
 negbound(7,9): + dneg(7,9) - 6 dnegup(7,9) <= -0
 negbound(1,1): + dneg(1,1) - 6 dnegup(1,1) <= -0
 negbound(1,3): + dneg(1,3) - 6 dnegup(1,3) <= -0
 negbound(1,7): + dneg(1,7) - 6 dnegup(1,7) <= -0
 negbound(1,9): + dneg(1,9) - 6 dnegup(1,9) <= -0
 negbound(1,10): + dneg(1,10) - 6 dnegup(1,10) <= -0
 negbound(2,1): + dneg(2,1) - 6 dnegup(2,1) <= -0
 negbound(2,2): + dneg(2,2) - 6 dnegup(2,2) <= -0
 negbound(2,4): + dneg(2,4) - 6 dnegup(2,4) <= -0
 negbound(2,6): + dneg(2,6) - 6 dnegup(2,6) <= -0
 negbound(2,8): + dneg(2,8) - 6 dnegup(2,8) <= -0
 negbound(2,9): + dneg(2,9) - 6 dnegup(2,9) <= -0
 negbound(3,2): + dneg(3,2) - 6 dnegup(3,2) <= -0
 negbound(3,6): + dneg(3,6) - 6 dnegup(3,6) <= -0
 negbound(3,7): + dneg(3,7) - 6 dnegup(3,7) <= -0
 negbound(3,10): + dneg(3,10) - 6 dnegup(3,10) <= -0
 negbound(4,1): + dneg(4,1) - 6 dnegup(4,1) <= -0
 negbound(4,3): + dneg(4,3) - 6 dnegup(4,3) <= -0
 negbound(4,9): + dneg(4,9) - 6 dnegup(4,9) <= -0
 negbound(5,2): + dneg(5,2) - 6 dnegup(5,2) <= -0
 negbound(5,3): + dneg(5,3) - 6 dnegup(5,3) <= -0
 negbound(5,5): + dneg(5,5) - 6 dnegup(5,5) <= -0
 negbound(5,6): + dneg(5,6) - 6 dnegup(5,6) <= -0
 negbound(6,5): + dneg(6,5) - 6 dnegup(6,5) <= -0
 negbound(6,6): + dneg(6,6) - 6 dnegup(6,6) <= -0
 negbound(6,8): + dneg(6,8) - 6 dnegup(6,8) <= -0
 negbound(6,9): + dneg(6,9) - 6 dnegup(6,9) <= -0
 negbound(7,2): + dneg(7,2) - 6 dnegup(7,2) <= -0
 negbound(7,8): + dneg(7,8) - 6 dnegup(7,8) <= -0
 negbound(7,10): + dneg(7,10) - 6 dnegup(7,10) <= -0
 mutex(1,2): + dposup(1,2) + dnegup(1,2) = 1
 mutex(1,4): + dposup(1,4) + dnegup(1,4) = 1
 mutex(1,5): + dposup(1,5) + dnegup(1,5) = 1
 mutex(1,6): + dposup(1,6) + dnegup(1,6) = 1
 mutex(1,8): + dposup(1,8) + dnegup(1,8) = 1
 mutex(2,3): + dposup(2,3) + dnegup(2,3) = 1
 mutex(2,5): + dposup(2,5) + dnegup(2,5) = 1
 mutex(2,7): + dposup(2,7) + dnegup(2,7) = 1
 mutex(2,10): + dposup(2,10) + dnegup(2,10) = 1
 mutex(3,1): + dposup(3,1) + dnegup(3,1) = 1
 mutex(3,3): + dposup(3,3) + dnegup(3,3) = 1
 mutex(3,4): + dposup(3,4) + dnegup(3,4) = 1
 mutex(3,5): + dposup(3,5) + dnegup(3,5) = 1
 mutex(3,8): + dposup(3,8) + dnegup(3,8) = 1
 mutex(3,9): + dposup(3,9) + dnegup(3,9) = 1
 mutex(4,2): + dposup(4,2) + dnegup(4,2) = 1
 mutex(4,4): + dposup(4,4) + dnegup(4,4) = 1
 mutex(4,5): + dposup(4,5) + dnegup(4,5) = 1
 mutex(4,6): + dposup(4,6) + dnegup(4,6) = 1
 mutex(4,7): + dposup(4,7) + dnegup(4,7) = 1
 mutex(4,8): + dposup(4,8) + dnegup(4,8) = 1
 mutex(4,10): + dposup(4,10) + dnegup(4,10) = 1
 mutex(5,1): + dposup(5,1) + dnegup(5,1) = 1
 mutex(5,4): + dposup(5,4) + dnegup(5,4) = 1
 mutex(5,7): + dposup(5,7) + dnegup(5,7) = 1
 mutex(5,8): + dposup(5,8) + dnegup(5,8) = 1
 mutex(5,9): + dposup(5,9) + dnegup(5,9) = 1
 mutex(5,10): + dposup(5,10) + dnegup(5,10) = 1
 mutex(6,1): + dposup(6,1) + dnegup(6,1) = 1
 mutex(6,2): + dposup(6,2) + dnegup(6,2) = 1
 mutex(6,3): + dposup(6,3) + dnegup(6,3) = 1
 mutex(6,4): + dposup(6,4) + dnegup(6,4) = 1
 mutex(6,7): + dposup(6,7) + dnegup(6,7) = 1
 mutex(6,10): + dposup(6,10) + dnegup(6,10) = 1
 mutex(7,1): + dposup(7,1) + dnegup(7,1) = 1
 mutex(7,3): + dposup(7,3) + dnegup(7,3) = 1
 mutex(7,4): + dposup(7,4) + dnegup(7,4) = 1
 mutex(7,5): + dposup(7,5) + dnegup(7,5) = 1
 mutex(7,6): + dposup(7,6) + dnegup(7,6) = 1
 mutex(7,7): + dposup(7,7) + dnegup(7,7) = 1
 mutex(7,9): + dposup(7,9) + dnegup(7,9) = 1
 mutex(1,1): + dposup(1,1) + dnegup(1,1) = 1
 mutex(1,3): + dposup(1,3) + dnegup(1,3) = 1
 mutex(1,7): + dposup(1,7) + dnegup(1,7) = 1
 mutex(1,9): + dposup(1,9) + dnegup(1,9) = 1
 mutex(1,10): + dposup(1,10) + dnegup(1,10) = 1
 mutex(2,1): + dposup(2,1) + dnegup(2,1) = 1
 mutex(2,2): + dposup(2,2) + dnegup(2,2) = 1
 mutex(2,4): + dposup(2,4) + dnegup(2,4) = 1
 mutex(2,6): + dposup(2,6) + dnegup(2,6) = 1
 mutex(2,8): + dposup(2,8) + dnegup(2,8) = 1
 mutex(2,9): + dposup(2,9) + dnegup(2,9) = 1
 mutex(3,2): + dposup(3,2) + dnegup(3,2) = 1
 mutex(3,6): + dposup(3,6) + dnegup(3,6) = 1
 mutex(3,7): + dposup(3,7) + dnegup(3,7) = 1
 mutex(3,10): + dposup(3,10) + dnegup(3,10) = 1
 mutex(4,1): + dposup(4,1) + dnegup(4,1) = 1
 mutex(4,3): + dposup(4,3) + dnegup(4,3) = 1
 mutex(4,9): + dposup(4,9) + dnegup(4,9) = 1
 mutex(5,2): + dposup(5,2) + dnegup(5,2) = 1
 mutex(5,3): + dposup(5,3) + dnegup(5,3) = 1
 mutex(5,5): + dposup(5,5) + dnegup(5,5) = 1
 mutex(5,6): + dposup(5,6) + dnegup(5,6) = 1
 mutex(6,5): + dposup(6,5) + dnegup(6,5) = 1
 mutex(6,6): + dposup(6,6) + dnegup(6,6) = 1
 mutex(6,8): + dposup(6,8) + dnegup(6,8) = 1
 mutex(6,9): + dposup(6,9) + dnegup(6,9) = 1
 mutex(7,2): + dposup(7,2) + dnegup(7,2) = 1
 mutex(7,8): + dposup(7,8) + dnegup(7,8) = 1
 mutex(7,10): + dposup(7,10) + dnegup(7,10) = 1
 alive(1,2): + dpos(1,2) + dneg(1,2) <= 1
 alive(1,4): + dpos(1,4) + dneg(1,4) <= 1
 alive(1,5): + dpos(1,5) + dneg(1,5) <= 1
 alive(1,6): + dpos(1,6) + dneg(1,6) <= 1
 alive(1,8): + dpos(1,8) + dneg(1,8) <= 1
 alive(2,3): + dpos(2,3) + dneg(2,3) <= 1
 alive(2,5): + dpos(2,5) + dneg(2,5) <= 1
 alive(2,7): + dpos(2,7) + dneg(2,7) <= 1
 alive(2,10): + dpos(2,10) + dneg(2,10) <= 1
 alive(3,1): + dpos(3,1) + dneg(3,1) <= 1
 alive(3,3): + dpos(3,3) + dneg(3,3) <= 1
 alive(3,4): + dpos(3,4) + dneg(3,4) <= 1
 alive(3,5): + dpos(3,5) + dneg(3,5) <= 1
 alive(3,8): + dpos(3,8) + dneg(3,8) <= 1
 alive(3,9): + dpos(3,9) + dneg(3,9) <= 1
 alive(4,2): + dpos(4,2) + dneg(4,2) <= 1
 alive(4,4): + dpos(4,4) + dneg(4,4) <= 1
 alive(4,5): + dpos(4,5) + dneg(4,5) <= 1
 alive(4,6): + dpos(4,6) + dneg(4,6) <= 1
 alive(4,7): + dpos(4,7) + dneg(4,7) <= 1
 alive(4,8): + dpos(4,8) + dneg(4,8) <= 1
 alive(4,10): + dpos(4,10) + dneg(4,10) <= 1
 alive(5,1): + dpos(5,1) + dneg(5,1) <= 1
 alive(5,4): + dpos(5,4) + dneg(5,4) <= 1
 alive(5,7): + dpos(5,7) + dneg(5,7) <= 1
 alive(5,8): + dpos(5,8) + dneg(5,8) <= 1
 alive(5,9): + dpos(5,9) + dneg(5,9) <= 1
 alive(5,10): + dpos(5,10) + dneg(5,10) <= 1
 alive(6,1): + dpos(6,1) + dneg(6,1) <= 1
 alive(6,2): + dpos(6,2) + dneg(6,2) <= 1
 alive(6,3): + dpos(6,3) + dneg(6,3) <= 1
 alive(6,4): + dpos(6,4) + dneg(6,4) <= 1
 alive(6,7): + dpos(6,7) + dneg(6,7) <= 1
 alive(6,10): + dpos(6,10) + dneg(6,10) <= 1
 alive(7,1): + dpos(7,1) + dneg(7,1) <= 1
 alive(7,3): + dpos(7,3) + dneg(7,3) <= 1
 alive(7,4): + dpos(7,4) + dneg(7,4) <= 1
 alive(7,5): + dpos(7,5) + dneg(7,5) <= 1
 alive(7,6): + dpos(7,6) + dneg(7,6) <= 1
 alive(7,7): + dpos(7,7) + dneg(7,7) <= 1
 alive(7,9): + dpos(7,9) + dneg(7,9) <= 1
 dead(1,1): + dpos(1,1) + dneg(1,1) >= 2
 dead(1,3): + dpos(1,3) + dneg(1,3) >= 2
 dead(1,7): + dpos(1,7) + dneg(1,7) >= 2
 dead(1,9): + dpos(1,9) + dneg(1,9) >= 2
 dead(1,10): + dpos(1,10) + dneg(1,10) >= 2
 dead(2,1): + dpos(2,1) + dneg(2,1) >= 2
 dead(2,2): + dpos(2,2) + dneg(2,2) >= 2
 dead(2,4): + dpos(2,4) + dneg(2,4) >= 2
 dead(2,6): + dpos(2,6) + dneg(2,6) >= 2
 dead(2,8): + dpos(2,8) + dneg(2,8) >= 2
 dead(2,9): + dpos(2,9) + dneg(2,9) >= 2
 dead(3,2): + dpos(3,2) + dneg(3,2) >= 2
 dead(3,6): + dpos(3,6) + dneg(3,6) >= 2
 dead(3,7): + dpos(3,7) + dneg(3,7) >= 2
 dead(3,10): + dpos(3,10) + dneg(3,10) >= 2
 dead(4,1): + dpos(4,1) + dneg(4,1) >= 2
 dead(4,3): + dpos(4,3) + dneg(4,3) >= 2
 dead(4,9): + dpos(4,9) + dneg(4,9) >= 2
 dead(5,2): + dpos(5,2) + dneg(5,2) >= 2
 dead(5,3): + dpos(5,3) + dneg(5,3) >= 2
 dead(5,5): + dpos(5,5) + dneg(5,5) >= 2
 dead(5,6): + dpos(5,6) + dneg(5,6) >= 2
 dead(6,5): + dpos(6,5) + dneg(6,5) >= 2
 dead(6,6): + dpos(6,6) + dneg(6,6) >= 2
 dead(6,8): + dpos(6,8) + dneg(6,8) >= 2
 dead(6,9): + dpos(6,9) + dneg(6,9) >= 2
 dead(7,2): + dpos(7,2) + dneg(7,2) >= 2
 dead(7,8): + dpos(7,8) + dneg(7,8) >= 2
 dead(7,10): + dpos(7,10) + dneg(7,10) >= 2

Bounds
 0 <= x(1,3) <= 1
 0 <= x(1,1) <= 1
 0 <= x(2,2) <= 1
 0 <= x(0,2) <= 1
 0 <= x(2,3) <= 1
 0 <= x(0,3) <= 1
 0 <= x(2,1) <= 1
 0 <= x(0,1) <= 1
 0 <= x(1,2) <= 1
 0 <= x(1,5) <= 1
 0 <= x(2,4) <= 1
 0 <= x(0,4) <= 1
 0 <= x(2,5) <= 1
 0 <= x(0,5) <= 1
 0 <= x(1,4) <= 1
 0 <= x(1,6) <= 1
 0 <= x(2,6) <= 1
 0 <= x(0,6) <= 1
 0 <= x(1,7) <= 1
 0 <= x(2,7) <= 1
 0 <= x(0,7) <= 1
 0 <= x(1,9) <= 1
 0 <= x(2,8) <= 1
 0 <= x(0,8) <= 1
 0 <= x(2,9) <= 1
 0 <= x(0,9) <= 1
 0 <= x(1,8) <= 1
 0 <= x(3,3) <= 1
 0 <= x(3,4) <= 1
 0 <= x(3,2) <= 1
 0 <= x(3,5) <= 1
 0 <= x(3,6) <= 1
 0 <= x(3,7) <= 1
 0 <= x(3,8) <= 1
 0 <= x(2,11) <= 1
 0 <= x(3,10) <= 1
 0 <= x(1,10) <= 1
 0 <= x(3,11) <= 1
 0 <= x(1,11) <= 1
 0 <= x(3,9) <= 1
 0 <= x(2,10) <= 1
 0 <= x(3,0) <= 1
 0 <= x(4,1) <= 1
 0 <= x(4,2) <= 1
 0 <= x(4,0) <= 1
 0 <= x(2,0) <= 1
 0 <= x(3,1) <= 1
 0 <= x(4,3) <= 1
 0 <= x(4,4) <= 1
 0 <= x(4,5) <= 1
 0 <= x(4,6) <= 1
 0 <= x(4,8) <= 1
 0 <= x(4,9) <= 1
 0 <= x(4,7) <= 1
 0 <= x(4,10) <= 1
 0 <= x(5,2) <= 1
 0 <= x(5,3) <= 1
 0 <= x(5,1) <= 1
 0 <= x(5,4) <= 1
 0 <= x(5,5) <= 1
 0 <= x(5,6) <= 1
 0 <= x(5,7) <= 1
 0 <= x(5,8) <= 1
 0 <= x(5,9) <= 1
 0 <= x(4,11) <= 1
 0 <= x(5,10) <= 1
 0 <= x(5,11) <= 1
 0 <= x(5,0) <= 1
 0 <= x(6,1) <= 1
 0 <= x(6,2) <= 1
 0 <= x(6,0) <= 1
 0 <= x(6,4) <= 1
 0 <= x(6,5) <= 1
 0 <= x(6,3) <= 1
 0 <= x(6,7) <= 1
 0 <= x(6,8) <= 1
 0 <= x(6,6) <= 1
 0 <= x(6,9) <= 1
 0 <= x(6,10) <= 1
 0 <= x(6,11) <= 1
 0 <= x(7,1) <= 1
 0 <= x(7,2) <= 1
 0 <= x(7,0) <= 1
 0 <= x(7,3) <= 1
 0 <= x(7,4) <= 1
 0 <= x(7,5) <= 1
 0 <= x(7,7) <= 1
 0 <= x(7,8) <= 1
 0 <= x(7,6) <= 1
 0 <= x(7,10) <= 1
 0 <= x(7,11) <= 1
 0 <= x(7,9) <= 1
 0 <= x(8,1) <= 1
 0 <= x(8,2) <= 1
 0 <= x(8,0) <= 1
 0 <= x(8,3) <= 1
 0 <= x(8,4) <= 1
 0 <= x(8,5) <= 1
 0 <= x(8,6) <= 1
 0 <= x(8,7) <= 1
 0 <= x(8,8) <= 1
 0 <= x(8,9) <= 1
 0 <= x(8,10) <= 1
 0 <= x(1,0) <= 1
 0 <= x(0,0) <= 1
 0 <= x(0,10) <= 1
 0 <= x(0,11) <= 1
 0 <= x(8,11) <= 1
 0 <= dposup(1,2) <= 1
 0 <= dposup(1,4) <= 1
 0 <= dposup(1,5) <= 1
 0 <= dposup(1,6) <= 1
 0 <= dposup(1,8) <= 1
 0 <= dposup(2,3) <= 1
 0 <= dposup(2,5) <= 1
 0 <= dposup(2,7) <= 1
 0 <= dposup(2,10) <= 1
 0 <= dposup(3,1) <= 1
 0 <= dposup(3,3) <= 1
 0 <= dposup(3,4) <= 1
 0 <= dposup(3,5) <= 1
 0 <= dposup(3,8) <= 1
 0 <= dposup(3,9) <= 1
 0 <= dposup(4,2) <= 1
 0 <= dposup(4,4) <= 1
 0 <= dposup(4,5) <= 1
 0 <= dposup(4,6) <= 1
 0 <= dposup(4,7) <= 1
 0 <= dposup(4,8) <= 1
 0 <= dposup(4,10) <= 1
 0 <= dposup(5,1) <= 1
 0 <= dposup(5,4) <= 1
 0 <= dposup(5,7) <= 1
 0 <= dposup(5,8) <= 1
 0 <= dposup(5,9) <= 1
 0 <= dposup(5,10) <= 1
 0 <= dposup(6,1) <= 1
 0 <= dposup(6,2) <= 1
 0 <= dposup(6,3) <= 1
 0 <= dposup(6,4) <= 1
 0 <= dposup(6,7) <= 1
 0 <= dposup(6,10) <= 1
 0 <= dposup(7,1) <= 1
 0 <= dposup(7,3) <= 1
 0 <= dposup(7,4) <= 1
 0 <= dposup(7,5) <= 1
 0 <= dposup(7,6) <= 1
 0 <= dposup(7,7) <= 1
 0 <= dposup(7,9) <= 1
 0 <= dposup(1,1) <= 1
 0 <= dposup(1,3) <= 1
 0 <= dposup(1,7) <= 1
 0 <= dposup(1,9) <= 1
 0 <= dposup(1,10) <= 1
 0 <= dposup(2,1) <= 1
 0 <= dposup(2,2) <= 1
 0 <= dposup(2,4) <= 1
 0 <= dposup(2,6) <= 1
 0 <= dposup(2,8) <= 1
 0 <= dposup(2,9) <= 1
 0 <= dposup(3,2) <= 1
 0 <= dposup(3,6) <= 1
 0 <= dposup(3,7) <= 1
 0 <= dposup(3,10) <= 1
 0 <= dposup(4,1) <= 1
 0 <= dposup(4,3) <= 1
 0 <= dposup(4,9) <= 1
 0 <= dposup(5,2) <= 1
 0 <= dposup(5,3) <= 1
 0 <= dposup(5,5) <= 1
 0 <= dposup(5,6) <= 1
 0 <= dposup(6,5) <= 1
 0 <= dposup(6,6) <= 1
 0 <= dposup(6,8) <= 1
 0 <= dposup(6,9) <= 1
 0 <= dposup(7,2) <= 1
 0 <= dposup(7,8) <= 1
 0 <= dposup(7,10) <= 1
 0 <= dnegup(1,2) <= 1
 0 <= dnegup(1,4) <= 1
 0 <= dnegup(1,5) <= 1
 0 <= dnegup(1,6) <= 1
 0 <= dnegup(1,8) <= 1
 0 <= dnegup(2,3) <= 1
 0 <= dnegup(2,5) <= 1
 0 <= dnegup(2,7) <= 1
 0 <= dnegup(2,10) <= 1
 0 <= dnegup(3,1) <= 1
 0 <= dnegup(3,3) <= 1
 0 <= dnegup(3,4) <= 1
 0 <= dnegup(3,5) <= 1
 0 <= dnegup(3,8) <= 1
 0 <= dnegup(3,9) <= 1
 0 <= dnegup(4,2) <= 1
 0 <= dnegup(4,4) <= 1
 0 <= dnegup(4,5) <= 1
 0 <= dnegup(4,6) <= 1
 0 <= dnegup(4,7) <= 1
 0 <= dnegup(4,8) <= 1
 0 <= dnegup(4,10) <= 1
 0 <= dnegup(5,1) <= 1
 0 <= dnegup(5,4) <= 1
 0 <= dnegup(5,7) <= 1
 0 <= dnegup(5,8) <= 1
 0 <= dnegup(5,9) <= 1
 0 <= dnegup(5,10) <= 1
 0 <= dnegup(6,1) <= 1
 0 <= dnegup(6,2) <= 1
 0 <= dnegup(6,3) <= 1
 0 <= dnegup(6,4) <= 1
 0 <= dnegup(6,7) <= 1
 0 <= dnegup(6,10) <= 1
 0 <= dnegup(7,1) <= 1
 0 <= dnegup(7,3) <= 1
 0 <= dnegup(7,4) <= 1
 0 <= dnegup(7,5) <= 1
 0 <= dnegup(7,6) <= 1
 0 <= dnegup(7,7) <= 1
 0 <= dnegup(7,9) <= 1
 0 <= dnegup(1,1) <= 1
 0 <= dnegup(1,3) <= 1
 0 <= dnegup(1,7) <= 1
 0 <= dnegup(1,9) <= 1
 0 <= dnegup(1,10) <= 1
 0 <= dnegup(2,1) <= 1
 0 <= dnegup(2,2) <= 1
 0 <= dnegup(2,4) <= 1
 0 <= dnegup(2,6) <= 1
 0 <= dnegup(2,8) <= 1
 0 <= dnegup(2,9) <= 1
 0 <= dnegup(3,2) <= 1
 0 <= dnegup(3,6) <= 1
 0 <= dnegup(3,7) <= 1
 0 <= dnegup(3,10) <= 1
 0 <= dnegup(4,1) <= 1
 0 <= dnegup(4,3) <= 1
 0 <= dnegup(4,9) <= 1
 0 <= dnegup(5,2) <= 1
 0 <= dnegup(5,3) <= 1
 0 <= dnegup(5,5) <= 1
 0 <= dnegup(5,6) <= 1
 0 <= dnegup(6,5) <= 1
 0 <= dnegup(6,6) <= 1
 0 <= dnegup(6,8) <= 1
 0 <= dnegup(6,9) <= 1
 0 <= dnegup(7,2) <= 1
 0 <= dnegup(7,8) <= 1
 0 <= dnegup(7,10) <= 1

Generals
 x(1,3)
 x(1,1)
 x(2,2)
 x(0,2)
 x(2,3)
 x(0,3)
 x(2,1)
 x(0,1)
 x(1,2)
 x(1,5)
 x(2,4)
 x(0,4)
 x(2,5)
 x(0,5)
 x(1,4)
 x(1,6)
 x(2,6)
 x(0,6)
 x(1,7)
 x(2,7)
 x(0,7)
 x(1,9)
 x(2,8)
 x(0,8)
 x(2,9)
 x(0,9)
 x(1,8)
 x(3,3)
 x(3,4)
 x(3,2)
 x(3,5)
 x(3,6)
 x(3,7)
 x(3,8)
 x(2,11)
 x(3,10)
 x(1,10)
 x(3,11)
 x(1,11)
 x(3,9)
 x(2,10)
 x(3,0)
 x(4,1)
 x(4,2)
 x(4,0)
 x(2,0)
 x(3,1)
 x(4,3)
 x(4,4)
 x(4,5)
 x(4,6)
 x(4,8)
 x(4,9)
 x(4,7)
 x(4,10)
 x(5,2)
 x(5,3)
 x(5,1)
 x(5,4)
 x(5,5)
 x(5,6)
 x(5,7)
 x(5,8)
 x(5,9)
 x(4,11)
 x(5,10)
 x(5,11)
 x(5,0)
 x(6,1)
 x(6,2)
 x(6,0)
 x(6,4)
 x(6,5)
 x(6,3)
 x(6,7)
 x(6,8)
 x(6,6)
 x(6,9)
 x(6,10)
 x(6,11)
 x(7,1)
 x(7,2)
 x(7,0)
 x(7,3)
 x(7,4)
 x(7,5)
 x(7,7)
 x(7,8)
 x(7,6)
 x(7,10)
 x(7,11)
 x(7,9)
 x(8,1)
 x(8,2)
 x(8,0)
 x(8,3)
 x(8,4)
 x(8,5)
 x(8,6)
 x(8,7)
 x(8,8)
 x(8,9)
 x(8,10)
 x(1,0)
 x(0,0)
 x(0,10)
 x(0,11)
 x(8,11)
 dposup(1,2)
 dposup(1,4)
 dposup(1,5)
 dposup(1,6)
 dposup(1,8)
 dposup(2,3)
 dposup(2,5)
 dposup(2,7)
 dposup(2,10)
 dposup(3,1)
 dposup(3,3)
 dposup(3,4)
 dposup(3,5)
 dposup(3,8)
 dposup(3,9)
 dposup(4,2)
 dposup(4,4)
 dposup(4,5)
 dposup(4,6)
 dposup(4,7)
 dposup(4,8)
 dposup(4,10)
 dposup(5,1)
 dposup(5,4)
 dposup(5,7)
 dposup(5,8)
 dposup(5,9)
 dposup(5,10)
 dposup(6,1)
 dposup(6,2)
 dposup(6,3)
 dposup(6,4)
 dposup(6,7)
 dposup(6,10)
 dposup(7,1)
 dposup(7,3)
 dposup(7,4)
 dposup(7,5)
 dposup(7,6)
 dposup(7,7)
 dposup(7,9)
 dposup(1,1)
 dposup(1,3)
 dposup(1,7)
 dposup(1,9)
 dposup(1,10)
 dposup(2,1)
 dposup(2,2)
 dposup(2,4)
 dposup(2,6)
 dposup(2,8)
 dposup(2,9)
 dposup(3,2)
 dposup(3,6)
 dposup(3,7)
 dposup(3,10)
 dposup(4,1)
 dposup(4,3)
 dposup(4,9)
 dposup(5,2)
 dposup(5,3)
 dposup(5,5)
 dposup(5,6)
 dposup(6,5)
 dposup(6,6)
 dposup(6,8)
 dposup(6,9)
 dposup(7,2)
 dposup(7,8)
 dposup(7,10)
 dnegup(1,2)
 dnegup(1,4)
 dnegup(1,5)
 dnegup(1,6)
 dnegup(1,8)
 dnegup(2,3)
 dnegup(2,5)
 dnegup(2,7)
 dnegup(2,10)
 dnegup(3,1)
 dnegup(3,3)
 dnegup(3,4)
 dnegup(3,5)
 dnegup(3,8)
 dnegup(3,9)
 dnegup(4,2)
 dnegup(4,4)
 dnegup(4,5)
 dnegup(4,6)
 dnegup(4,7)
 dnegup(4,8)
 dnegup(4,10)
 dnegup(5,1)
 dnegup(5,4)
 dnegup(5,7)
 dnegup(5,8)
 dnegup(5,9)
 dnegup(5,10)
 dnegup(6,1)
 dnegup(6,2)
 dnegup(6,3)
 dnegup(6,4)
 dnegup(6,7)
 dnegup(6,10)
 dnegup(7,1)
 dnegup(7,3)
 dnegup(7,4)
 dnegup(7,5)
 dnegup(7,6)
 dnegup(7,7)
 dnegup(7,9)
 dnegup(1,1)
 dnegup(1,3)
 dnegup(1,7)
 dnegup(1,9)
 dnegup(1,10)
 dnegup(2,1)
 dnegup(2,2)
 dnegup(2,4)
 dnegup(2,6)
 dnegup(2,8)
 dnegup(2,9)
 dnegup(3,2)
 dnegup(3,6)
 dnegup(3,7)
 dnegup(3,10)
 dnegup(4,1)
 dnegup(4,3)
 dnegup(4,9)
 dnegup(5,2)
 dnegup(5,3)
 dnegup(5,5)
 dnegup(5,6)
 dnegup(6,5)
 dnegup(6,6)
 dnegup(6,8)
 dnegup(6,9)
 dnegup(7,2)
 dnegup(7,8)
 dnegup(7,10)

End
